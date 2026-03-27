import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateExecutiveSummaryV2, type CompletenessScore } from "@/lib/ai";
import { sendSummaryEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all orgs with settings
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      ownerEmail: true,
      workspaceSettings: true,
    },
  });

  const results: { orgId: string; status: string; error?: string }[] = [];

  for (const org of orgs) {
    try {
      const scope = org.workspaceSettings?.reportCollectionScope ?? "everyone";
    const apiKey = org.workspaceSettings?.anthropicApiKey ?? null;

      // Get active users per scope
      const userWhere: Record<string, unknown> = {
        orgId: org.id,
        isReportingActive: true,
      };
      if (scope === "leads_only") {
        userWhere.isLead = true;
      }

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
        results.push({ orgId: org.id, status: "skipped_no_users" });
        continue;
      }

      const userIds = activeUsers.map((u) => u.id);

      // Get today's parsed reports
      const todayReports = await prisma.parsedReport.findMany({
        where: {
          userId: { in: userIds },
          date: { gte: today, lt: tomorrow },
        },
        select: { userId: true, aiSummary: true, structuredData: true, date: true },
      });

      const todayReportByUser = new Map(todayReports.map((r) => [r.userId, r]));

      // Get canonical narratives for all users
      const narratives = await prisma.canonicalNarrative.findMany({
        where: { userId: { in: userIds } },
      });
      const narrativeByUser = new Map(narratives.map((n) => [n.userId, n]));

      // For users without today's report, find their most recent historical report (stand-in)
      const missingUserIds = userIds.filter((id) => !todayReportByUser.has(id));
      const standInReports = missingUserIds.length > 0
        ? await prisma.parsedReport.findMany({
            where: {
              userId: { in: missingUserIds },
              date: { lt: today },
            },
            orderBy: { date: "desc" },
            distinct: ["userId"],
            select: { userId: true, aiSummary: true, structuredData: true, date: true },
          })
        : [];

      const standInByUser = new Map(standInReports.map((r) => [r.userId, r]));

      // Build completeness scorecard
      const standInSummaries: { name: string; daysSince: number }[] = [];
      let freshCount = 0;

      for (const u of activeUsers) {
        if (todayReportByUser.has(u.id)) {
          freshCount++;
        } else {
          const standIn = standInByUser.get(u.id);
          if (standIn) {
            const daysSince = Math.floor(
              (today.getTime() - new Date(standIn.date).getTime()) / (1000 * 60 * 60 * 24)
            );
            standInSummaries.push({ name: u.name, daysSince });
          } else {
            standInSummaries.push({ name: u.name, daysSince: -1 }); // never submitted
          }
        }
      }

      const completenessScore: CompletenessScore = {
        totalExpected: activeUsers.length,
        freshToday: freshCount,
        standIns: standInSummaries,
        percentage: activeUsers.length > 0
          ? Math.round((freshCount / activeUsers.length) * 100)
          : 0,
      };

      // Build people array for summary
      const people = activeUsers.map((u) => {
        const narrative = narrativeByUser.get(u.id);
        const todayReport = todayReportByUser.get(u.id);
        const standIn = standInByUser.get(u.id);
        const activeReport = todayReport ?? standIn;

        const isStandIn = !todayReport && !!standIn;
        const reportDate = activeReport
          ? new Date(activeReport.date).toISOString().split("T")[0]
          : "never";
        const daysSinceReport = activeReport
          ? Math.floor((today.getTime() - new Date(activeReport.date).getTime()) / (1000 * 60 * 60 * 24))
          : -1;

        const currentNarrative = narrative?.currentNarrative
          ?? activeReport?.aiSummary
          ?? "No report data available.";

        return {
          name: u.name,
          department: u.departmentMemberships[0]?.department?.name ?? "Unassigned",
          narrative: currentNarrative,
          riskSignals: (narrative?.riskSignals as string[]) ?? [],
          reportDate,
          isStandIn,
          daysSinceReport,
        };
      });

      // Get recent alerts
      const recentAlerts = await prisma.alert.findMany({
        where: { orgId: org.id, isRead: false },
        select: { message: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Generate executive summary
      const summaryText = await generateExecutiveSummaryV2({
        apiKey,
        orgName: org.name,
        summaryDate: today.toISOString().split("T")[0],
        completenessScore,
        people,
        alerts: recentAlerts.map((a) => a.message),
      });

      // Save daily summary
      const savedSummary = await prisma.dailySummary.upsert({
        where: { orgId_summaryDate: { orgId: org.id, summaryDate: today } },
        create: {
          orgId: org.id,
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
      const oldestSummaries = await prisma.dailySummary.findMany({
        where: { orgId: org.id },
        orderBy: { summaryDate: "desc" },
        skip: 30,
        select: { id: true },
      });
      if (oldestSummaries.length > 0) {
        await prisma.dailySummary.deleteMany({ where: { id: { in: oldestSummaries.map((s) => s.id) } } });
      }

      // Create missing submission alerts for users with no report ever
      const neverSubmitted = activeUsers.filter(
        (u) => !todayReportByUser.has(u.id) && !standInByUser.has(u.id)
      );
      if (neverSubmitted.length > 0) {
        await prisma.alert.createMany({
          data: neverSubmitted.map((u) => ({
            orgId: org.id,
            userId: u.id,
            alertType: "missing_submission" as const,
            message: `${u.name} has never submitted a report`,
            severity: "warning" as const,
          })),
          skipDuplicates: true,
        });
      }

      // Email the summary to the workspace owner
      if (org.ownerEmail && process.env.RESEND_API_KEY) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL ?? "localhost:3000"}`;
        sendSummaryEmail({
          toEmail: org.ownerEmail,
          orgName: org.name,
          summaryDate: today,
          summaryId: savedSummary.id,
          orgId: org.id,
          totalSubmissions: freshCount,
          missingSubmissions: activeUsers.length - freshCount,
          markdown: summaryText,
          appUrl,
        }).catch((e) => console.error(`Email failed for org ${org.id}:`, e));
      }

      results.push({ orgId: org.id, status: "ok" });
    } catch (err) {
      console.error(`Cron error for org ${org.id}:`, err);
      results.push({
        orgId: org.id,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ results });
}

export async function GET(request: NextRequest) {
  // Allow GET for Vercel cron jobs which use GET
  return POST(request);
}
