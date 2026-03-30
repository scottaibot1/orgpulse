import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Users, Building2, FileText, AlertTriangle, TrendingUp, CheckCircle, Clock } from "lucide-react";
import OrgChartFlow from "@/components/dashboard/OrgChartFlow";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [org, deptCount, people, todayReports, unreadAlerts] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.orgId } }),
    prisma.department.count({ where: { orgId: user.orgId, archivedAt: null } }),
    prisma.user.findMany({
      where: { orgId: user.orgId },
      include: {
        departmentMemberships: {
          include: { department: true },
          where: { isPrimary: true },
        },
      },
    }),
    prisma.parsedReport.findMany({
      where: {
        user: { orgId: user.orgId },
        date: { gte: today, lt: tomorrow },
      },
      include: { tasks: { orderBy: { priorityRank: "asc" }, take: 1 } },
    }),
    prisma.alert.count({ where: { orgId: user.orgId, isRead: false } }),
  ]);

  const submittedIds = new Set(todayReports.map((r) => r.userId));
  const submittedCount = submittedIds.size;
  const missingCount = people.length - submittedCount;
  const submissionRate = people.length > 0 ? Math.round((submittedCount / people.length) * 100) : 0;

  // Build org chart data
  const departments = await prisma.department.findMany({
    where: { orgId: user.orgId, archivedAt: null },
    include: {
      members: { include: { user: true } },
    },
  });

  const reportByUser = new Map(todayReports.map((r) => [r.userId, r]));

  const deptNodes = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    color: dept.color,
    parentId: dept.parentDepartmentId,
    people: dept.members.map((m) => {
      const hasReport = reportByUser.has(m.userId);
      return {
        id: m.userId,
        name: m.user.name,
        title: m.user.title,
        level: null,
        levelTitle: null,
        reportsToManagerIds: [],
        isReportingActive: true,
        status: hasReport ? "submitted" as const : "missing" as const,
      };
    }),
  }));

  // Recent submissions with top task
  const recentReports = await prisma.parsedReport.findMany({
    where: { user: { orgId: user.orgId } },
    include: {
      user: {
        include: {
          departmentMemberships: {
            include: { department: true },
            where: { isPrimary: true },
          },
        },
      },
      tasks: { orderBy: { priorityRank: "asc" }, take: 1 },
    },
    orderBy: { date: "desc" },
    take: 5,
  });

  const stats = [
    {
      label: "Submitted Today",
      value: submittedCount,
      sub: `of ${people.length} people`,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-600",
      lightBg: "bg-emerald-50",
      lightText: "text-emerald-700",
      href: "/dashboard/snapshot",
    },
    {
      label: "Missing Today",
      value: missingCount,
      sub: missingCount === 0 ? "Everyone submitted!" : "haven't submitted",
      icon: Clock,
      gradient: "from-rose-500 to-pink-600",
      lightBg: "bg-rose-50",
      lightText: "text-rose-700",
      href: "/dashboard/snapshot",
    },
    {
      label: "Departments",
      value: deptCount,
      sub: "active",
      icon: Building2,
      gradient: "from-violet-500 to-indigo-600",
      lightBg: "bg-violet-50",
      lightText: "text-violet-700",
      href: "/dashboard/org",
    },
    {
      label: "Open Alerts",
      value: unreadAlerts,
      sub: "unread",
      icon: AlertTriangle,
      gradient: "from-amber-500 to-orange-600",
      lightBg: "bg-amber-50",
      lightText: "text-amber-700",
      href: "/dashboard/alerts",
    },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
            {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-card">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-slate-700">{submissionRate}%</span>
          </div>
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

      {/* Org Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Org Chart</h2>
            <p className="text-xs text-slate-400 mt-0.5">Live — color shows today&apos;s submission status</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Submitted</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Missing</span>
            <Link href="/dashboard/snapshot" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium ml-2">
              Full snapshot <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {deptNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Building2 className="h-10 w-10 mb-3 text-slate-200" />
            <p className="font-medium">No departments yet</p>
            <p className="text-sm mt-1">
              <Link href="/dashboard/org" className="text-indigo-600 hover:underline">Create your first department</Link> to see the org chart
            </p>
          </div>
        ) : (
          <OrgChartFlow departments={deptNodes} orgName={org?.name ?? "Organization"} orgId={user.orgId} />
        )}
      </div>

      {/* Bottom row: recent submissions + quick setup */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent submissions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Recent Submissions</h2>
            <Link href="/dashboard/reports" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No reports yet</p>
              </div>
            ) : (
              recentReports.map((report) => {
                const dept = report.user.departmentMemberships[0]?.department;
                const topTask = report.tasks[0];
                const initials = report.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <Link key={report.id} href={`/dashboard/people/${report.userId}`}>
                    <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                        style={{ background: dept?.color ? `linear-gradient(135deg, ${dept.color}, ${dept.color}cc)` : "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800">{report.user.name}</p>
                          {dept && <span className="text-xs text-slate-400">{dept.name}</span>}
                        </div>
                        {topTask && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{topTask.description}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-slate-400">
                        {new Date(report.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: "Add a department", href: "/dashboard/org", icon: Building2, color: "bg-violet-100 text-violet-600", done: deptCount > 0 },
              { label: "Add team members", href: "/dashboard/people", icon: Users, color: "bg-sky-100 text-sky-600", done: people.length > 1 },
              { label: "Share submission links", href: "/dashboard/links", icon: FileText, color: "bg-emerald-100 text-emerald-600", done: false },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm font-medium flex-1 ${action.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {action.label}
                    </span>
                    {action.done
                      ? <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      : <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                    }
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Submission rate ring */}
          <div className="px-6 pb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 text-center border border-indigo-100">
              <div className="text-3xl font-bold text-indigo-600">{submissionRate}%</div>
              <div className="text-xs text-indigo-500 font-medium mt-0.5">Today&apos;s submission rate</div>
              <div className="w-full bg-indigo-100 rounded-full h-1.5 mt-3">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${submissionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
