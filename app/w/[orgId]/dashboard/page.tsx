import { getAuthEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Users, Building2, FileText, AlertTriangle, TrendingUp, CheckCircle, Clock, Bell } from "lucide-react";
import OrgChartFlow from "@/components/dashboard/OrgChartFlow";
import DashboardReportsWidget, { type ReportRow } from "@/components/dashboard/DashboardReportsWidget";
import SummaryWidget from "@/components/dashboard/SummaryWidget";
import ArchivedSummaries from "@/components/dashboard/ArchivedSummaries";

export const dynamic = "force-dynamic";

interface Props {
  params: { orgId: string };
}

export default async function WorkspaceDashboardPage({ params }: Props) {
  const { orgId } = params;

  const email = await getAuthEmail();
  if (!email) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [org, dbUser, deptCount, people, departments, todayReports, unreadAlerts, recentAlerts, allReports, allSummaries] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, workspaceSettings: { select: { accentColor: true } } },
    }),
    prisma.user.findUnique({
      where: { orgId_email: { orgId, email } },
      select: { id: true, name: true, role: true },
    }),
    prisma.department.count({ where: { orgId, archivedAt: null } }),
    prisma.user.findMany({ where: { orgId }, select: { id: true, name: true } }),
    prisma.department.findMany({
      where: { orgId, archivedAt: null },
      select: {
        id: true,
        name: true,
        color: true,
        parentDepartmentId: true,
        levelConfigs: { select: { levelNumber: true, levelTitle: true } },
        members: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                title: true,
                level: true,
                isReportingActive: true,
                reportsToManagers: { select: { managerUserId: true } },
              },
            },
          },
        },
      },
    }),
    prisma.parsedReport.findMany({
      where: { user: { orgId }, date: { gte: today, lt: tomorrow } },
      select: { userId: true },
    }),
    prisma.alert.count({ where: { orgId, isRead: false } }),
    prisma.alert.findMany({
      where: { orgId, isRead: false },
      select: { id: true, message: true, severity: true, alertType: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.report.findMany({
      where: { user: { orgId } },
      select: {
        id: true,
        submittedAt: true,
        source: true,
        rawPdfUrl: true,
        parsedReport: { select: { id: true } },
        user: {
          select: {
            id: true,
            name: true,
            departmentMemberships: {
              where: { isPrimary: true },
              take: 1,
              select: { department: { select: { name: true, color: true } } },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 200,
    }),
    prisma.dailySummary.findMany({
      where: { orgId },
      orderBy: { summaryDate: "desc" },
      take: 30,
      select: { id: true, summaryDate: true, totalSubmissions: true, missingSubmissions: true, createdAt: true },
    }),
  ]);

  if (!dbUser) redirect("/workspaces");

  const submittedIds = new Set(todayReports.map((r) => r.userId));
  const submittedCount = submittedIds.size;
  const missingCount = people.length - submittedCount;
  const submissionRate = people.length > 0 ? Math.round((submittedCount / people.length) * 100) : 0;

  // Completeness scorecard: find stand-ins for missing people
  const missingIds = people.map((p) => p.id).filter((id) => !submittedIds.has(id));
  const standInReports = missingIds.length > 0
    ? await prisma.parsedReport.findMany({
        where: { userId: { in: missingIds }, date: { lt: today } },
        orderBy: { date: "desc" },
        distinct: ["userId"],
        select: { userId: true, date: true },
      })
    : [];
  const standInByUser = new Map(standInReports.map((r) => [r.userId, r]));

  const scorecard = {
    total: people.length,
    fresh: submittedCount,
    standIns: missingIds
      .filter((id) => standInByUser.has(id))
      .map((id) => {
        const report = standInByUser.get(id)!;
        const user = people.find((p) => p.id === id);
        const daysSince = Math.floor((today.getTime() - new Date(report.date).getTime()) / (1000 * 60 * 60 * 24));
        return { name: user?.name ?? "Unknown", daysSince };
      }),
    neverSubmitted: missingIds.filter((id) => !standInByUser.has(id)).length,
    percentage: people.length > 0 ? Math.round((submittedCount / people.length) * 100) : 0,
  };
  const accentColor = org?.workspaceSettings?.accentColor ?? "#6366f1";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const deptNodes = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    color: dept.color,
    parentId: dept.parentDepartmentId,
    people: dept.members.map((m) => {
      const levelConfig = m.user.level != null
        ? dept.levelConfigs.find((lc) => lc.levelNumber === m.user.level)
        : null;
      return {
        id: m.userId,
        name: m.user.name,
        title: m.user.title,
        level: m.user.level,
        levelTitle: levelConfig?.levelTitle ?? null,
        status: submittedIds.has(m.userId) ? "submitted" as const : "missing" as const,
        reportsToManagerIds: m.user.reportsToManagers.map((r) => r.managerUserId),
        isReportingActive: m.user.isReportingActive,
      };
    }),
  }));

  const reportRows: ReportRow[] = allReports.map((r) => ({
    id: r.id,
    userId: r.user.id,
    submittedAt: r.submittedAt.toISOString(),
    source: r.source as "form" | "pdf_upload" | "email",
    rawPdfUrl: r.rawPdfUrl,
    parsedReportId: r.parsedReport?.id ?? null,
    userName: r.user.name,
    departmentName: r.user.departmentMemberships[0]?.department?.name ?? "",
    departmentColor: r.user.departmentMemberships[0]?.department?.color ?? null,
  }));

  const stats = [
    { label: "Submitted Today", value: submittedCount, sub: `of ${people.length} people`, icon: CheckCircle, gradient: "from-emerald-500 to-teal-600", href: `/w/${orgId}/snapshot` },
    { label: "Missing Today", value: missingCount, sub: missingCount === 0 ? "Everyone submitted!" : "haven't submitted", icon: Clock, gradient: "from-rose-500 to-pink-600", href: `/w/${orgId}/snapshot` },
    { label: "Departments", value: deptCount, sub: "active", icon: Building2, gradient: "from-violet-500 to-indigo-600", href: `/w/${orgId}/org` },
    { label: "Open Alerts", value: unreadAlerts, sub: "unread", icon: AlertTriangle, gradient: "from-amber-500 to-orange-600", href: `/w/${orgId}/alerts` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good {greeting}, {dbUser.name.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-card">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold text-slate-700">{submissionRate}%</span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-500">submission rate</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card hover:shadow-card-hover transition-all group cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Completeness Scorecard */}
      {people.length > 0 && (
        <div className={`rounded-xl border px-5 py-4 ${
          scorecard.percentage === 100
            ? "bg-emerald-50 border-emerald-200"
            : scorecard.percentage >= 70
            ? "bg-amber-50 border-amber-200"
            : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${
                scorecard.percentage === 100 ? "text-emerald-700" : scorecard.percentage >= 70 ? "text-amber-700" : "text-red-700"
              }`}>
                {scorecard.percentage}%
              </div>
              <div>
                <p className={`text-sm font-semibold ${
                  scorecard.percentage === 100 ? "text-emerald-800" : scorecard.percentage >= 70 ? "text-amber-800" : "text-red-800"
                }`}>
                  Completeness Scorecard
                </p>
                <p className={`text-xs ${
                  scorecard.percentage === 100 ? "text-emerald-600" : scorecard.percentage >= 70 ? "text-amber-600" : "text-red-600"
                }`}>
                  {scorecard.fresh} fresh today · {scorecard.standIns.length} stand-in{scorecard.standIns.length !== 1 ? "s" : ""} · {scorecard.neverSubmitted} never submitted
                </p>
              </div>
            </div>
            {scorecard.standIns.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {scorecard.standIns.map((s) => (
                  <span key={s.name} className="text-xs bg-white border border-amber-200 text-amber-700 rounded-full px-2 py-0.5">
                    {s.name} <span className="opacity-60">({s.daysSince}d ago)</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 w-full bg-white/60 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                scorecard.percentage === 100 ? "bg-emerald-500" : scorecard.percentage >= 70 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${scorecard.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {(() => {
        const latest = allSummaries[0];
        return (
          <SummaryWidget
            orgId={orgId}
            accentColor={accentColor}
            lastSummary={latest ? { id: latest.id, date: latest.createdAt.toISOString() } : null}
          />
        );
      })()}

      {/* Alert bar */}
      {recentAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Bell className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            {recentAlerts.map((alert) => (
              <p key={alert.id} className="text-sm text-amber-800">{alert.message}</p>
            ))}
          </div>
          {unreadAlerts > 3 && (
            <Link href={`/w/${orgId}/alerts`} className="text-xs font-medium text-amber-700 hover:text-amber-900 flex-shrink-0">
              +{unreadAlerts - 3} more
            </Link>
          )}
        </div>
      )}

      {/* Main two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Reports (48%) */}
        <div className="w-full lg:w-[48%] min-h-[500px]">
          <DashboardReportsWidget reports={reportRows} orgId={orgId} accentColor={accentColor} />
        </div>

        {/* Right: Org Chart (52%) */}
        <div className="w-full lg:w-[52%]">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Organization</h2>
                <p className="text-xs text-slate-400 mt-0.5">Live submission status</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Submitted</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Missing</span>
                <Link href={`/w/${orgId}/snapshot`} className="flex items-center gap-0.5 font-medium hover:opacity-80" style={{ color: accentColor }}>
                  Full <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            {deptNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Building2 className="h-10 w-10 mb-3 text-slate-200" />
                <p className="font-medium text-sm">No departments yet</p>
                <Link href={`/w/${orgId}/org`} className="text-sm mt-1 hover:underline" style={{ color: accentColor }}>
                  Create your first department
                </Link>
              </div>
            ) : (
              <OrgChartFlow departments={deptNodes} orgName={org?.name ?? "Organization"} compact />
            )}
          </div>
        </div>
      </div>

      {/* Archived summaries */}
      <ArchivedSummaries
        summaries={allSummaries.map((s) => ({
          id: s.id,
          summaryDate: s.summaryDate.toISOString(),
          totalSubmissions: s.totalSubmissions,
          missingSubmissions: s.missingSubmissions,
          createdAt: s.createdAt.toISOString(),
        }))}
        orgId={orgId}
        accentColor={accentColor}
      />

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-slate-700">Quick Actions</span>
          {[
            { label: "Add department", href: `/w/${orgId}/org`, icon: Building2, done: deptCount > 0 },
            { label: "Add team members", href: `/w/${orgId}/people`, icon: Users, done: people.length > 1 },
            { label: "Share submission links", href: `/w/${orgId}/links`, icon: FileText, done: false },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  action.done ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className={action.done ? "line-through opacity-60" : ""}>{action.label}</span>
                  {action.done && <CheckCircle className="h-3.5 w-3.5" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
