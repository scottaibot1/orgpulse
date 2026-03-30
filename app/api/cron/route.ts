import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateExecutiveSummaryV2, type CompletenessScore } from "@/lib/ai";
import { sendSummaryEmail } from "@/lib/email";

export const maxDuration = 60;

/**
 * Determines whether a person is due to submit a report today.
 * reportDueDays: for daily/custom/biweekly/weekly = day-of-week indices (0=Sun…6=Sat)
 *                for monthly = day-of-month numbers (1–31)
 */
function isPersonDueToday(
  cadence: string,
  reportDueDays: number[],
  biweeklyWeek: string,
  today: Date,
  biweeklyStartDate: Date | null
): boolean {
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const dayOfMonth = today.getDate();

  switch (cadence) {
    case "daily":
      return true;

    case "weekly":
      return reportDueDays.includes(dayOfWeek);

    case "biweekly": {
      if (!reportDueDays.includes(dayOfWeek)) return false;
      if (!biweeklyStartDate) return true; // no start date set, default to due
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksSinceStart = Math.floor((today.getTime() - biweeklyStartDate.getTime()) / msPerWeek);
      const isWeekA = weeksSinceStart % 2 === 0;
      return biweeklyWeek === "A" ? isWeekA : !isWeekA;
    }

    case "monthly":
      return reportDueDays.includes(dayOfMonth);

    case "custom":
      return reportDueDays.includes(dayOfWeek);

    default:
      return true;
  }
}

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
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ── Part 2: Cleanup — delete ParsedReports older than 30 days ──
  try {
    const deleted = await prisma.parsedReport.deleteMany({
      where: { date: { lt: thirtyDaysAgo } },
    });
    if (deleted.count > 0) {
      console.log(`[Cron] Cleaned up ${deleted.count} parsed reports older than 30 days`);
    }
  } catch (e) {
    console.error("[Cron] Cleanup error:", e);
  }

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
      const autoReportDetailLevel = (org.workspaceSettings as { autoReportDetailLevel?: number } | null)?.autoReportDetailLevel ?? (org.workspaceSettings as { reportDetailLevel?: number } | null)?.reportDetailLevel ?? 3;
      const departmentOrdering = (org.workspaceSettings as { departmentOrdering?: string } | null)?.departmentOrdering ?? "manual";
      const biweeklyStartDate = (org.workspaceSettings as { biweeklyStartDate?: Date | null } | null)?.biweeklyStartDate ?? null;

      // Get active users per scope — include schedule fields
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
          reportCadence: true,
          reportDueDays: true,
          reportDueTime: true,
          reportBiweeklyWeek: true,
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

      // Split users into due-today vs not-scheduled-today
      const dueTodayUsers = activeUsers.filter((u) =>
        isPersonDueToday(
          u.reportCadence,
          (u.reportDueDays as number[]) ?? [5],
          u.reportBiweeklyWeek,
          today,
          biweeklyStartDate
        )
      );
      const notScheduledTodayUsers = activeUsers.filter((u) =>
        !isPersonDueToday(
          u.reportCadence,
          (u.reportDueDays as number[]) ?? [5],
          u.reportBiweeklyWeek,
          today,
          biweeklyStartDate
        )
      );

      const allUserIds = activeUsers.map((u) => u.id);

      // Get today's parsed reports for all users
      const todayReports = await prisma.parsedReport.findMany({
        where: {
          userId: { in: allUserIds },
          date: { gte: today, lt: tomorrow },
        },
        select: { userId: true, aiSummary: true, structuredData: true, notes: true, blockers: true, totalHours: true, date: true },
      });

      const todayReportByUser = new Map(todayReports.map((r) => [r.userId, r]));

      // Get canonical narratives for all users
      const narratives = await prisma.canonicalNarrative.findMany({
        where: { userId: { in: allUserIds } },
      });
      const narrativeByUser = new Map(narratives.map((n) => [n.userId, n]));

      // For ALL users without a fresh today report, find their most recent report within 30 days.
      // This ensures not-scheduled-today users (weekly, etc.) still appear in the summary
      // using their last submitted report as a stand-in.
      const allUsersWithoutTodayReport = allUserIds.filter((id) => !todayReportByUser.has(id));
      const standInReports = allUsersWithoutTodayReport.length > 0
        ? await prisma.parsedReport.findMany({
            where: {
              userId: { in: allUsersWithoutTodayReport },
              date: { lt: today, gte: thirtyDaysAgo },
            },
            orderBy: { date: "desc" },
            distinct: ["userId"],
            select: { userId: true, aiSummary: true, structuredData: true, notes: true, blockers: true, totalHours: true, date: true },
          })
        : [];

      const standInByUser = new Map(standInReports.map((r) => [r.userId, r]));

      // Build completeness scorecard (schedule-aware)
      const standInSummaries: { name: string; daysSince: number }[] = [];
      let freshCount = 0;

      for (const u of dueTodayUsers) {
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
        totalExpected: dueTodayUsers.length,
        freshToday: freshCount,
        standIns: standInSummaries,
        percentage: dueTodayUsers.length > 0
          ? Math.round((freshCount / dueTodayUsers.length) * 100)
          : 100,
        notScheduledToday: notScheduledTodayUsers.map((u) => ({ name: u.name })),
      };

      // Build people array — ALL active users, using stand-in if not due/fresh today
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

        let builtNarrative = narrative?.currentNarrative ?? activeReport?.aiSummary ?? "No report data available.";

        if (autoReportDetailLevel >= 3 && activeReport?.structuredData) {
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

      // Fetch department ordering
      const deptOrder = departmentOrdering === "manual"
        ? await prisma.department.findMany({
            where: { orgId: org.id, archivedAt: null },
            orderBy: [{ reportOrder: "asc" }, { name: "asc" }],
            select: { name: true },
          })
        : [];

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
        reportDetailLevel: autoReportDetailLevel,
        departmentOrdering,
        departmentOrder: deptOrder.map((d) => d.name),
      });

      // Save daily summary
      const savedSummary = await prisma.dailySummary.create({
        data: {
          orgId: org.id,
          summaryDate: today,
          aiFullSummary: summaryText,
          totalSubmissions: freshCount,
          missingSubmissions: dueTodayUsers.length - freshCount,
          alertCount: recentAlerts.length,
        },
      });

      // Prune to keep only the 30 most recently generated summaries for this org
      const oldestSummaries = await prisma.dailySummary.findMany({
        where: { orgId: org.id },
        orderBy: { createdAt: "desc" },
        skip: 30,
        select: { id: true },
      });
      if (oldestSummaries.length > 0) {
        await prisma.dailySummary.deleteMany({ where: { id: { in: oldestSummaries.map((s) => s.id) } } });
      }

      // Create missing submission alerts — only for users who are due today and never submitted
      const neverSubmitted = dueTodayUsers.filter(
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
          missingSubmissions: dueTodayUsers.length - freshCount,
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
