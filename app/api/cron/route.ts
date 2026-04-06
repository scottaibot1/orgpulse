import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/lib/prisma";
import { generateExecutiveSummaryV2, normalizeDetailLevel, type CompletenessScore } from "@/lib/ai";
import { sendSummaryEmail } from "@/lib/email";
import { isPersonDueToday, buildScheduleLabel } from "@/lib/schedule";

export const maxDuration = 300;

// ─── Background work — runs after 200 is returned ───────────────────────────

async function runCronWork(): Promise<void> {
  console.log(`[Cron] Background work started at ${new Date().toISOString()}`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ── Cleanup — delete ParsedReports older than 30 days ──
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

  // ── Cleanup — delete stale missing_submission alerts for inactive users ──
  try {
    const cleared = await prisma.alert.deleteMany({
      where: {
        alertType: "missing_submission",
        isRead: false,
        user: { isReportingActive: false },
      },
    });
    if (cleared.count > 0) {
      console.log(`[Cron] Cleared ${cleared.count} stale missing_submission alert(s) for inactive users`);
    }
  } catch (e) {
    console.error("[Cron] Stale alert cleanup error:", e);
  }

  // Fetch all orgs
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, ownerEmail: true, workspaceSettings: true },
  });
  console.log(`[Cron] Found ${orgs.length} org(s) to process`);

  const results: { orgId: string; status: string; error?: string }[] = [];

  for (const org of orgs) {
    console.log(`[Cron] Processing org: ${org.name} (${org.id})`);
    try {
      const scope = org.workspaceSettings?.reportCollectionScope ?? "everyone";
      const apiKey = org.workspaceSettings?.anthropicApiKey ?? null;
      const autoReportDetailLevel = normalizeDetailLevel((org.workspaceSettings as { autoReportDetailLevel?: number } | null)?.autoReportDetailLevel ?? (org.workspaceSettings as { reportDetailLevel?: number } | null)?.reportDetailLevel);
      const departmentOrdering = (org.workspaceSettings as { departmentOrdering?: string } | null)?.departmentOrdering ?? "manual";
      const biweeklyStartDate = (org.workspaceSettings as { biweeklyStartDate?: Date | null } | null)?.biweeklyStartDate ?? null;
      const reportTheme = ((org.workspaceSettings as { reportTheme?: string } | null)?.reportTheme ?? "dark") as "dark" | "light";
      const lastGeneratedAt = (org.workspaceSettings as { lastReportGeneratedAt?: Date | null } | null)?.lastReportGeneratedAt ?? null;
      const reportingWindowStart = lastGeneratedAt ? lastGeneratedAt.toISOString().split("T")[0] : null;

      // Get active users per scope — include schedule fields
      const userWhere: Record<string, unknown> = { orgId: org.id, isReportingActive: true };
      if (scope === "leads_only") userWhere.isLead = true;

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
      console.log(`[Cron] ${org.name}: ${activeUsers.length} active user(s)`);

      if (activeUsers.length === 0) {
        results.push({ orgId: org.id, status: "skipped_no_users" });
        continue;
      }

      // Split users into due-today vs not-scheduled-today
      const dueTodayUsers = activeUsers.filter((u) =>
        isPersonDueToday(u.reportCadence, (u.reportDueDays as number[]) ?? [5], u.reportBiweeklyWeek, today, biweeklyStartDate)
      );
      const notScheduledTodayUsers = activeUsers.filter((u) =>
        !isPersonDueToday(u.reportCadence, (u.reportDueDays as number[]) ?? [5], u.reportBiweeklyWeek, today, biweeklyStartDate)
      );
      console.log(`[Cron] ${org.name}: ${dueTodayUsers.length} expected today, ${notScheduledTodayUsers.length} not scheduled`);

      const expectedUserIds = dueTodayUsers.map((u) => u.id);

      // Get today's parsed reports for expected users only
      console.log(`[Cron] ${org.name}: Fetching today's reports…`);
      const todayReports = await prisma.parsedReport.findMany({
        where: {
          userId: { in: expectedUserIds },
          date: { gte: today, lt: dayAfterTomorrow },
        },
        select: { userId: true, aiSummary: true, structuredData: true, notes: true, blockers: true, totalHours: true, date: true },
      });

      const todayReportByUser = new Map(todayReports.map((r) => [r.userId, r]));
      console.log(`[Cron] ${org.name}: ${todayReports.length} report(s) received today`);

      // Get canonical narratives for expected users only
      const narratives = await prisma.canonicalNarrative.findMany({ where: { userId: { in: expectedUserIds } } });
      const narrativeByUser = new Map(narratives.map((n) => [n.userId, n]));

      // Stand-ins only for expected users who didn't submit today
      const expectedWithoutTodayReport = expectedUserIds.filter((id) => !todayReportByUser.has(id));
      const standInReports = expectedWithoutTodayReport.length > 0
        ? await prisma.parsedReport.findMany({
            where: { userId: { in: expectedWithoutTodayReport }, date: { lt: today, gte: thirtyDaysAgo } },
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
            const daysSince = Math.floor((today.getTime() - new Date(standIn.date).getTime()) / (1000 * 60 * 60 * 24));
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
        percentage: dueTodayUsers.length > 0 ? Math.round((freshCount / dueTodayUsers.length) * 100) : 100,
        notScheduledToday: notScheduledTodayUsers.map((u) => ({ name: u.name })),
      };

      // Departments where ZERO expected members exist today → show as placeholder
      const expectedDeptNames = new Set(dueTodayUsers.map((u) => u.departmentMemberships[0]?.department?.name).filter(Boolean));
      const notExpectedDeptSchedules = new Map<string, Set<string>>();
      for (const u of notScheduledTodayUsers) {
        const deptName = u.departmentMemberships[0]?.department?.name;
        if (!deptName || expectedDeptNames.has(deptName)) continue;
        if (!notExpectedDeptSchedules.has(deptName)) notExpectedDeptSchedules.set(deptName, new Set());
        notExpectedDeptSchedules.get(deptName)!.add(buildScheduleLabel(u.reportCadence, (u.reportDueDays as number[]) ?? [5]));
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
        const reportDate = activeReport ? new Date(activeReport.date).toISOString().split("T")[0] : "never";
        const daysSinceReport = activeReport ? Math.floor((today.getTime() - new Date(activeReport.date).getTime()) / (1000 * 60 * 60 * 24)) : -1;

        let builtNarrative = narrative?.currentNarrative ?? activeReport?.aiSummary ?? "No report data available.";
        if (autoReportDetailLevel >= 2 && activeReport?.structuredData) {
          const sd = activeReport.structuredData as {
            summary?: string;
            tasks?: {
              description: string;
              classification?: string;
              daysOverdue?: number | null;
              subcategory?: string | null;
              status: string;
              hoursToday?: number | null;
              projectName?: string | null;
              pctComplete?: number | null;
              dueDate?: string | null;
            }[];
            salesPipeline?: {
              new_leads_today?: number | null;
              leads_contacted?: number | null;
              hot_responsive?: number | null;
              qualified?: number | null;
              hot_but_cold?: number | null;
              proposals_sent?: number | null;
            } | null;
            notes?: string | null;
            blockers?: string | null;
            totalHours?: number | null;
          };
          if (sd.tasks && sd.tasks.length > 0) {
            const taskLines = sd.tasks.map((t) => {
              const cls = t.classification ?? t.status;
              const overdue = t.daysOverdue ? ` ${t.daysOverdue}d OVERDUE` : "";
              const hrs = t.hoursToday != null ? ` [${t.hoursToday}h]` : "";
              const proj = t.projectName ? ` — ${t.projectName}` : "";
              const due = t.dueDate ? ` · due ${t.dueDate}` : "";
              const pct = t.pctComplete != null ? ` · ${t.pctComplete}%` : "";
              const sub = t.subcategory ? ` [${t.subcategory}]` : "";
              return `• [${cls.toUpperCase()}${overdue}]${sub} ${t.description}${proj}${hrs}${due}${pct}`;
            }).join("\n");

            const pipelineSection = sd.salesPipeline ? [
              "",
              "Sales Pipeline:",
              `  New Today: ${sd.salesPipeline.new_leads_today ?? "–"} · Contacted: ${sd.salesPipeline.leads_contacted ?? "–"} · Hot/Responsive: ${sd.salesPipeline.hot_responsive ?? "–"} · Qualified: ${sd.salesPipeline.qualified ?? "–"} · Hot but Cold: ${sd.salesPipeline.hot_but_cold ?? "–"} · Proposals: ${sd.salesPipeline.proposals_sent ?? "–"}`,
            ].join("\n") : "";

            builtNarrative = [
              sd.summary ?? activeReport.aiSummary ?? "",
              "",
              "Tasks:",
              taskLines,
              pipelineSection,
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
      console.log(`[Cron] ${org.name}: Calling AI to generate summary…`);
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
      console.log(`[Cron] ${org.name}: AI summary generated (${summaryText.length} chars)`);

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
      console.log(`[Cron] ${org.name}: Summary saved (id=${savedSummary.id})`);

      // Update lastReportGeneratedAt
      await prisma.workspaceSettings.updateMany({
        where: { orgId: org.id },
        data: { lastReportGeneratedAt: new Date() },
      });

      // Prune to keep only the 30 most recently generated summaries
      const oldestSummaries = await prisma.dailySummary.findMany({
        where: { orgId: org.id },
        orderBy: { createdAt: "desc" },
        skip: 30,
        select: { id: true },
      });
      if (oldestSummaries.length > 0) {
        await prisma.dailySummary.deleteMany({ where: { id: { in: oldestSummaries.map((s) => s.id) } } });
      }

      // Create missing submission alerts for users who never submitted
      const neverSubmitted = dueTodayUsers.filter((u) => !todayReportByUser.has(u.id) && !standInByUser.has(u.id));
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
        console.log(`[Cron] ${org.name}: Sending email to ${org.ownerEmail}…`);
        sendSummaryEmail({
          toEmail: org.ownerEmail!,
          orgName: org.name,
          summaryDate: today,
          summaryId: savedSummary.id,
          orgId: org.id,
          totalSubmissions: freshCount,
          missingSubmissions: dueTodayUsers.length - freshCount,
          markdown: summaryText,
          appUrl,
          theme: reportTheme,
        }).then(() => {
          console.log(`[Cron] ${org.name}: Email sent to ${org.ownerEmail}`);
        }).catch((e) => console.error(`[Cron] ${org.name}: Email failed for ${org.ownerEmail}:`, e));
      } else {
        if (!org.ownerEmail) console.warn(`[Cron] ${org.name}: No ownerEmail — skipping email`);
        if (!process.env.RESEND_API_KEY) console.warn(`[Cron] ${org.name}: RESEND_API_KEY not set — skipping email`);
      }

      results.push({ orgId: org.id, status: "ok" });
      console.log(`[Cron] ${org.name}: Done ✓`);
    } catch (err) {
      console.error(`[Cron] Error for org ${org.id} (${org.name}):`, err);
      results.push({ orgId: org.id, status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`[Cron] All orgs processed. Results:`, JSON.stringify(results));
}

// ─── Route handlers ───────────────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(request: NextRequest) {
  console.log(`[Cron] Handler reached at ${new Date().toISOString()}`);

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  waitUntil(runCronWork());

  return NextResponse.json({ ok: true, startedAt: new Date().toISOString() });
}

export async function GET(request: NextRequest) {
  // Vercel cron jobs invoke via GET
  console.log(`[Cron] Handler reached (GET) at ${new Date().toISOString()}`);

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  waitUntil(runCronWork());

  return NextResponse.json({ ok: true, startedAt: new Date().toISOString() });
}
