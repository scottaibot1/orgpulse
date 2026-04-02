import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { generateExecutiveSummaryV2, type CompletenessScore } from "@/lib/ai";
import { sendSummaryEmail } from "@/lib/email";

export const maxDuration = 300;
interface Params { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summary = await prisma.dailySummary.findFirst({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(summary ?? null);
}

export async function POST(req: NextRequest, { params }: Params) {
  try { return await handleSummaryPost(req, await params); }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Summary POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleSummaryPost(req: NextRequest, { orgId }: { orgId: string }) {
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, ownerEmail: true, workspaceSettings: { select: { reportCollectionScope: true, anthropicApiKey: true, reportDetailLevel: true, departmentOrdering: true, lastReportGeneratedAt: true } } },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Read targetDate from request body (optional — defaults to today)
  let targetDate: string = new Date().toISOString().split("T")[0];
  try {
    const body = await req.json();
    if (body?.targetDate && typeof body.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.targetDate)) {
      targetDate = body.targetDate;
    }
  } catch { /* use default */ }

  const apiKey = org.workspaceSettings?.anthropicApiKey ?? null;
  const scope = org.workspaceSettings?.reportCollectionScope ?? "everyone";
  const reportDetailLevel = org.workspaceSettings?.reportDetailLevel ?? 3;
  const departmentOrdering = org.workspaceSettings?.departmentOrdering ?? "manual";

  // reportingWindowStart = selected day (only reports from that day qualify for Notable Progress)
  const reportingWindowStart = targetDate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build date range for targetDate (UTC midnight to end of day)
  const targetDateStart = new Date(targetDate + "T00:00:00.000Z");
  const targetDateEnd = new Date(targetDate + "T23:59:59.999Z");

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

  // Fetch department ordering for the summary
  const deptOrder = departmentOrdering === "manual"
    ? await prisma.department.findMany({
        where: { orgId, archivedAt: null },
        orderBy: [{ reportOrder: "asc" }, { name: "asc" }],
        select: { name: true, reportOrder: true },
      })
    : [];

  // Find reports for the target day.
  // Primary: explicit reportDate set (new behavior + manually fixed reports).
  // Fallback: reportDate is null — use submittedAt (covers reports uploaded before feature was deployed).
  const matchingReportIds = await prisma.report.findMany({
    where: {
      userId: { in: userIds },
      OR: [
        { reportDate: { gte: targetDateStart, lte: targetDateEnd } },
        { reportDate: null, submittedAt: { gte: targetDateStart, lte: targetDateEnd } },
      ],
    },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

  const [todayReports, narratives, recentAlerts] = await Promise.all([
    matchingReportIds.length > 0
      ? prisma.parsedReport.findMany({
          where: { reportId: { in: matchingReportIds } },
          select: { id: true, userId: true, aiSummary: true, structuredData: true, notes: true, blockers: true, totalHours: true, date: true, report: { select: { rawPdfUrl: true } } },
        })
      : Promise.resolve([]),
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

  const thirtyDaysAgo = new Date(targetDateStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const standInReports = missingIds.length > 0
    ? await prisma.parsedReport.findMany({
        where: { userId: { in: missingIds }, date: { lt: targetDateStart, gte: thirtyDaysAgo } },
        orderBy: { date: "desc" },
        distinct: ["userId"],
        select: { id: true, userId: true, aiSummary: true, structuredData: true, notes: true, blockers: true, totalHours: true, date: true, report: { select: { rawPdfUrl: true } } },
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

    // For detail level 3+, build a rich narrative from structured task data if available
    let builtNarrative = narrative?.currentNarrative ?? activeReport?.aiSummary ?? "No report data available.";

    if (reportDetailLevel >= 3 && activeReport?.structuredData) {
      const sd = activeReport.structuredData as {
        summary?: string;
        tasks?: { description: string; status: string; hoursToday?: number | null; projectName?: string | null }[];
        notes?: string | null;
        blockers?: string | null;
        totalHours?: number | null;
      };

      if (sd.tasks && sd.tasks.length > 0) {
        const taskLines = sd.tasks.map((t) => {
          const hrs = t.hoursToday != null ? ` [${t.hoursToday}h]` : "";
          const proj = t.projectName ? ` — ${t.projectName}` : "";
          return `• ${t.description}${proj}${hrs} (${t.status})`;
        }).join("\n");

        builtNarrative = [
          sd.summary ?? activeReport.aiSummary ?? "",
          "",
          "Tasks:",
          taskLines,
          sd.notes ? `\nNotes: ${sd.notes}` : "",
          sd.blockers ? `\nBlockers: ${sd.blockers}` : "",
          sd.totalHours != null ? `\nTotal hours: ${sd.totalHours}` : "",
        ].filter((l) => l !== "").join("\n").trim();
      }
    }

    return {
      name: u.name,
      department: u.departmentMemberships[0]?.department?.name ?? "Unassigned",
      narrative: builtNarrative,
      riskSignals: (narrative?.riskSignals as string[]) ?? [],
      reportDate,
      isStandIn,
      daysSinceReport,
    };
  });

  // Build reportLinks map: personName → parsedReportId + date + isStandIn
  // Used by the email renderer to add "View Report" links next to each person's name.
  const reportLinks: Record<string, { parsedReportId: string; date: string; isStandIn: boolean; fileUrl?: string | null }> = {};
  for (const u of activeUsers) {
    const todayReport = todayByUser.get(u.id);
    const standIn = standInByUser.get(u.id);
    const activeReport = todayReport ?? standIn;
    const isStandIn = !todayReport && !!standIn;
    if (activeReport) {
      reportLinks[u.name] = {
        parsedReportId: activeReport.id,
        date: new Date(activeReport.date).toISOString().split("T")[0],
        isStandIn,
        fileUrl: (activeReport as { report?: { rawPdfUrl?: string | null } }).report?.rawPdfUrl ?? null,
      };
    }
  }

  const summaryText = await generateExecutiveSummaryV2({
    apiKey,
    orgName: org.name,
    summaryDate: targetDate,
    completenessScore,
    people,
    alerts: recentAlerts.map((a) => a.message),
    reportDetailLevel,
    departmentOrdering,
    departmentOrder: deptOrder.map((d) => d.name),
    reportingWindowStart,
  });

  // Always create a new record so regeneration produces a distinct timestamped entry
  const saved = await prisma.dailySummary.create({
    data: {
      orgId,
      summaryDate: targetDateStart,
      aiFullSummary: summaryText,
      totalSubmissions: freshCount,
      missingSubmissions: activeUsers.length - freshCount,
      alertCount: recentAlerts.length,
    },
  });

  // Update lastReportGeneratedAt so the next generation knows its window start
  await prisma.workspaceSettings.updateMany({
    where: { orgId },
    data: { lastReportGeneratedAt: new Date() },
  });

  // Prune to keep only the 30 most recently generated summaries for this org
  const oldest = await prisma.dailySummary.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    skip: 30,
    select: { id: true },
  });
  if (oldest.length > 0) {
    await prisma.dailySummary.deleteMany({ where: { id: { in: oldest.map((s) => s.id) } } });
  }

  // Email the summary to the workspace owner
  let emailSent = false;
  let emailTo: string | null = null;
  let emailError: string | null = null;

  if (org.ownerEmail && process.env.RESEND_API_KEY) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL ?? "localhost:3000"}`;
    emailTo = org.ownerEmail;
    try {
      await sendSummaryEmail({
        toEmail: org.ownerEmail,
        orgName: org.name,
        summaryDate: targetDateStart,
        summaryId: saved.id,
        reportLinks,
        orgId,
        totalSubmissions: saved.totalSubmissions,
        missingSubmissions: saved.missingSubmissions,
        markdown: saved.aiFullSummary!,
        appUrl,
      });
      emailSent = true;
      console.log(`[Summary] Email sent to ${org.ownerEmail} for org ${org.name} (${orgId})`);
    } catch (emailErr) {
      emailError = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error(`[Summary] Email failed for ${org.ownerEmail}:`, emailError);
    }
  } else {
    if (!org.ownerEmail) { emailError = "No owner email on org"; console.warn("[Summary] No ownerEmail on org — skipping email"); }
    if (!process.env.RESEND_API_KEY) { emailError = "RESEND_API_KEY not configured"; console.warn("[Summary] RESEND_API_KEY not set — skipping email"); }
  }

  return NextResponse.json({ id: saved.id, summary: saved.aiFullSummary, generatedAt: saved.createdAt, emailSent, emailTo, emailError });
}
