import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateExecutiveSummaryV2, type CompletenessScore } from "@/lib/ai";
import { sendSummaryEmail } from "@/lib/email";
import { isPersonDueToday, buildScheduleLabel } from "@/lib/schedule";

export const maxDuration = 60;

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
  // Extend window by one extra day to catch evening US submissions stored as next UTC day
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
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
      const lastGeneratedAt = (org.workspaceSettings as { lastReportGeneratedAt?: Date | null } | null)?.lastReportGeneratedAt ?? null;
      const reportingWindowStart = lastGeneratedAt ? lastGeneratedAt.toISOString().split("T")[0] : null;

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

      // Only expected users are included in the report — non-expected users are excluded entirely
      const expectedUserIds = dueTodayUsers.map((u) => u.id);

      // Get today's parsed reports for expected users only
      const todayReports = await prisma.parsedReport.findMany({
        where: {
          userId: { in: expectedUserIds },
          date: { gte: today, lt: dayAfterTomorrow },
        },
        select: { userId: true, aiSummary: true, structuredData: true, notes: true, blockers: true, totalHours: true, date: true },
      });

      const todayReportByUser = new Map(todayReports.map((r) => [r.userId, r]));

      // Get canonical narratives for expected users only
      const narratives = await prisma.canonicalNarrative.findMany({
        where: { userId: { in: expectedUserIds } },
      });
      const narrativeByUser = new Map(narratives.map((n) => [n.userId, n]));

      // Stand-ins only for expected users who didn't submit today
      const expectedWithoutTodayReport = expectedUserIds.filter((id) => !todayReportByUser.has(id));
      const standInReports = expectedWithoutTodayReport.length > 0
        ? await prisma.parsedReport.findMany({
            where: {
              userId: { in: expectedWithoutTodayReport },
              date: { lt: today, gte: thirtyDaysAgo },
            },
            orderBy: { date: "desc" },
            distinct: ["userId"],
            select: { userId: true, aiSummary: true, structuredData: true, notes: true, blockers: true, totalHours: true, date: true },
          })
        : [];

      const standInByUser = new Map(standInReports.map((r) => [r.userId, r]));

      // Build completeness scorecard — only expected users count
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
            standInSummaries.push({ name: u.name, daysSince: -1 });
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

      // Departments where ZERO expected members exist today → show as placeholder
      const expectedDeptNames = new Set(
        dueTodayUsers.map((u) => u.departmentMemberships[0]?.department?.name).filter(Boolean)
      );
      const notExpectedDeptSchedules = new Map<string, Set<string>>();
      for (const u of notScheduledTodayUsers) {
        const deptName = u.departmentMemberships[0]?.department?.name;
        if (!deptName || expectedDeptNames.has(deptName)) continue;
        if (!notExpectedDeptSchedules.has(deptName)) notExpectedDeptSchedules.set(deptName, new Set());
        notExpectedDeptSchedules.get(deptName)!.add(
          buildScheduleLabel(u.reportCadence, (u.reportDueDays as number[]) ?? [5])
        );
      }
      const notExpectedDepartments = Array.from(notExpectedDeptSchedules.entries()).map(([name, labels]) => ({
        name,
        scheduleLabel: Array.from(labels).join("; "),
      }));

      // Build people array — expected users only
      const people = dueTodayUsers.map((u) => {
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
        reportingWindowStart,
        notExpectedDepartments,
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

      // Update lastReportGeneratedAt so the next run knows its window start
      await prisma.workspaceSettings.updateMany({
        where: { orgId: org.id },
        data: { lastReportGeneratedAt: new Date() },
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
