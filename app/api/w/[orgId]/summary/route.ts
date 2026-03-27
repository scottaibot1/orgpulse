import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { generateExecutiveSummaryV2, type CompletenessScore } from "@/lib/ai";
import { sendSummaryEmail } from "@/lib/email";

interface Params { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await prisma.dailySummary.findFirst({
    where: { orgId },
    orderBy: { summaryDate: "desc" },
  });

  return NextResponse.json(summary ?? null);
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, ownerEmail: true, workspaceSettings: { select: { reportCollectionScope: true, anthropicApiKey: true } } },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const apiKey = org.workspaceSettings?.anthropicApiKey ?? null;
  const scope = org.workspaceSettings?.reportCollectionScope ?? "everyone";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get active users
  const userWhere: Record<string, unknown> = { orgId, isReportingActive: true };
  if (scope === "leads_only") userWhere.isLead = true;

  const activeUsers = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      departmentMemberships: {
        where: { isPrimary: true },
        take: 1,
        select: { department: { select: { name: true } } },
      },
    },
  });

  if (activeUsers.length === 0) {
    return NextResponse.json({ error: "No active users to summarize" }, { status: 422 });
  }

  const userIds = activeUsers.map((u) => u.id);

  const [todayReports, narratives, recentAlerts] = await Promise.all([
    prisma.parsedReport.findMany({
      where: { userId: { in: userIds }, date: { gte: today, lt: tomorrow } },
      select: { userId: true, aiSummary: true, date: true },
    }),
    prisma.canonicalNarrative.findMany({ where: { userId: { in: userIds } } }),
    prisma.alert.findMany({
      where: { orgId, isRead: false },
      select: { message: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const todayByUser = new Map(todayReports.map((r) => [r.userId, r]));
  const narrativeByUser = new Map(narratives.map((n) => [n.userId, n]));
  const missingIds = userIds.filter((id) => !todayByUser.has(id));

  const standInReports = missingIds.length > 0
    ? await prisma.parsedReport.findMany({
        where: { userId: { in: missingIds }, date: { lt: today } },
        orderBy: { date: "desc" },
        distinct: ["userId"],
        select: { userId: true, aiSummary: true, date: true },
      })
    : [];

  const standInByUser = new Map(standInReports.map((r) => [r.userId, r]));

  let freshCount = 0;
  const standInSummaries: { name: string; daysSince: number }[] = [];

  for (const u of activeUsers) {
    if (todayByUser.has(u.id)) {
      freshCount++;
    } else {
      const standIn = standInByUser.get(u.id);
      const daysSince = standIn
        ? Math.floor((today.getTime() - new Date(standIn.date).getTime()) / (1000 * 60 * 60 * 24))
        : -1;
      standInSummaries.push({ name: u.name, daysSince });
    }
  }

  const completenessScore: CompletenessScore = {
    totalExpected: activeUsers.length,
    freshToday: freshCount,
    standIns: standInSummaries,
    percentage: Math.round((freshCount / activeUsers.length) * 100),
  };

  const people = activeUsers.map((u) => {
    const narrative = narrativeByUser.get(u.id);
    const todayReport = todayByUser.get(u.id);
    const standIn = standInByUser.get(u.id);
    const activeReport = todayReport ?? standIn;
    const isStandIn = !todayReport && !!standIn;
    const reportDate = activeReport
      ? new Date(activeReport.date).toISOString().split("T")[0]
      : "never";
    const daysSinceReport = activeReport
      ? Math.floor((today.getTime() - new Date(activeReport.date).getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    return {
      name: u.name,
      department: u.departmentMemberships[0]?.department?.name ?? "Unassigned",
      narrative: narrative?.currentNarrative ?? activeReport?.aiSummary ?? "No report data available.",
      riskSignals: (narrative?.riskSignals as string[]) ?? [],
      reportDate,
      isStandIn,
      daysSinceReport,
    };
  });

  const summaryText = await generateExecutiveSummaryV2({
    apiKey,
    orgName: org.name,
    summaryDate: today.toISOString().split("T")[0],
    completenessScore,
    people,
    alerts: recentAlerts.map((a) => a.message),
  });

  // Upsert today's summary
  const saved = await prisma.dailySummary.upsert({
    where: { orgId_summaryDate: { orgId, summaryDate: today } },
    create: {
      orgId,
      summaryDate: today,
      aiFullSummary: summaryText,
      totalSubmissions: freshCount,
      missingSubmissions: activeUsers.length - freshCount,
      alertCount: recentAlerts.length,
    },
    update: {
      aiFullSummary: summaryText,
      totalSubmissions: freshCount,
      missingSubmissions: activeUsers.length - freshCount,
      alertCount: recentAlerts.length,
    },
  });

  // Prune to keep only the 30 most recent summaries for this org
  const oldest = await prisma.dailySummary.findMany({
    where: { orgId },
    orderBy: { summaryDate: "desc" },
    skip: 30,
    select: { id: true },
  });
  if (oldest.length > 0) {
    await prisma.dailySummary.deleteMany({ where: { id: { in: oldest.map((s) => s.id) } } });
  }

  // Email the summary to the workspace owner — non-fatal if it fails
  if (org.ownerEmail && process.env.RESEND_API_KEY) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL ?? "localhost:3000"}`;
    sendSummaryEmail({
      toEmail: org.ownerEmail,
      orgName: org.name,
      summaryDate: today,
      summaryId: saved.id,
      orgId,
      totalSubmissions: saved.totalSubmissions,
      missingSubmissions: saved.missingSubmissions,
      markdown: saved.aiFullSummary!,
      appUrl,
    }).catch((e) => console.error("Summary email failed:", e));
  }

  return NextResponse.json({ id: saved.id, summary: saved.aiFullSummary, generatedAt: saved.createdAt });
}
