import { redirect } from "next/navigation";
import { getAuthEmail, getMyWorkspaces } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Users, Bell, TrendingUp, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MasterOverviewPage() {
  const email = await getAuthEmail();
  if (!email) redirect("/login");

  const workspaces = await getMyWorkspaces();
  if (workspaces.length === 0) redirect("/workspaces");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const workspacesWithStats = await Promise.all(
    workspaces.map(async (ws) => {
      const [peopleCount, submittedToday, unreadAlerts] = await Promise.all([
        prisma.user.count({ where: { orgId: ws.id } }),
        prisma.parsedReport.count({
          where: { user: { orgId: ws.id }, date: { gte: today, lt: tomorrow } },
        }),
        prisma.alert.count({ where: { orgId: ws.id, isRead: false } }),
      ]);
      const submissionRate = peopleCount > 0 ? Math.round((submittedToday / peopleCount) * 100) : 0;
      return { ...ws, stats: { peopleCount, submittedToday, submissionRate, unreadAlerts } };
    })
  );

  const totalPeople = workspacesWithStats.reduce((s, w) => s + w.stats.peopleCount, 0);
  const totalSubmitted = workspacesWithStats.reduce((s, w) => s + w.stats.submittedToday, 0);
  const totalAlerts = workspacesWithStats.reduce((s, w) => s + w.stats.unreadAlerts, 0);
  const overallRate = totalPeople > 0 ? Math.round((totalSubmitted / totalPeople) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/workspaces" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" />
            All workspaces
          </Link>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">Master Overview</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      <div className="px-8 py-10 max-w-6xl mx-auto">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Workspaces", value: workspaces.length, sub: "active", color: "from-violet-500 to-indigo-600" },
            { label: "Total People", value: totalPeople, sub: "across all workspaces", color: "from-sky-500 to-blue-600" },
            { label: "Submitted Today", value: totalSubmitted, sub: `${overallRate}% overall rate`, color: "from-emerald-500 to-teal-600" },
            { label: "Open Alerts", value: totalAlerts, sub: "unread", color: "from-amber-500 to-orange-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
              <div className="h-1 rounded-full mt-3 bg-slate-700">
                <div className={`h-1 rounded-full bg-gradient-to-r ${stat.color}`} style={{ width: "100%" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Per-workspace table */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-base font-semibold text-white">Workspace Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {workspacesWithStats.map((ws) => {
              const accent = ws.workspaceSettings?.accentColor ?? "#6366f1";
              const initials = ws.name.slice(0, 2).toUpperCase();
              return (
                <Link key={ws.id} href={`/w/${ws.id}/dashboard`}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/30 transition-colors cursor-pointer group">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{ws.name}</p>
                      {ws.workspaceSettings?.description && (
                        <p className="text-slate-400 text-xs truncate">{ws.workspaceSettings.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-center min-w-[60px]">
                        <div className="flex items-center gap-1 justify-center text-slate-300">
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-sm font-semibold">{ws.stats.peopleCount}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">people</p>
                      </div>
                      <div className="text-center min-w-[70px]">
                        <div className="flex items-center gap-1 justify-center">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-sm font-semibold text-emerald-400">{ws.stats.submissionRate}%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">submitted</p>
                      </div>
                      {ws.stats.unreadAlerts > 0 && (
                        <div className="text-center min-w-[50px]">
                          <div className="flex items-center gap-1 justify-center text-amber-400">
                            <Bell className="h-3.5 w-3.5" />
                            <span className="text-sm font-semibold">{ws.stats.unreadAlerts}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">alerts</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
