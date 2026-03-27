"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Users, Bell, CheckCircle, ArrowRight, Zap, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Workspace {
  id: string;
  name: string;
  createdAt: Date;
  workspaceSettings: {
    accentColor: string;
    description: string | null;
  } | null;
  stats: {
    peopleCount: number;
    submittedToday: number;
    unreadAlerts: number;
  };
}

interface Props {
  workspaces: Workspace[];
}

export default function WorkspaceSelector({ workspaces }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-base">OrgPulse AI</span>
        </div>
        <div className="flex items-center gap-3">
          {workspaces.length > 1 && (
            <Link href="/workspaces/overview">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-2">
                <LayoutGrid className="h-4 w-4" />
                Master Overview
              </Button>
            </Link>
          )}
          <Link href="/workspaces/new">
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2">
              <Plus className="h-4 w-4" />
              New Workspace
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-12 max-w-5xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Your Workspaces</h1>
          <p className="text-slate-400 mt-2">
            {workspaces.length === 0
              ? "Create your first workspace to get started."
              : `${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""} — click to enter`}
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Zap className="h-10 w-10 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">No workspaces yet</p>
              <p className="text-slate-500 text-sm mt-1">Create a workspace to start collecting reports</p>
            </div>
            <Link href="/workspaces/new">
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 h-11 px-6">
                <Plus className="h-4 w-4" />
                Create your first workspace
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => {
              const accent = ws.workspaceSettings?.accentColor ?? "#6366f1";
              const initials = ws.name.slice(0, 2).toUpperCase();
              const submissionRate = ws.stats.peopleCount > 0
                ? Math.round((ws.stats.submittedToday / ws.stats.peopleCount) * 100)
                : 0;

              return (
                <div
                  key={ws.id}
                  onClick={() => router.push(`/w/${ws.id}/dashboard`)}
                  className="group bg-slate-800/60 border border-slate-700 rounded-2xl p-6 cursor-pointer hover:border-slate-500 hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-black/20"
                  style={{ borderTopColor: accent, borderTopWidth: 3 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
                    >
                      {initials}
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                  </div>

                  <h3 className="text-white font-semibold text-base mb-1">{ws.name}</h3>
                  {ws.workspaceSettings?.description && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                      {ws.workspaceSettings.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      {ws.stats.peopleCount}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      {submissionRate}% today
                    </div>
                    {ws.stats.unreadAlerts > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 ml-auto">
                        <Bell className="h-3.5 w-3.5" />
                        {ws.stats.unreadAlerts}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Create new card */}
            <Link href="/workspaces/new">
              <div className="group bg-slate-800/30 border border-slate-700 border-dashed rounded-2xl p-6 cursor-pointer hover:border-slate-500 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center gap-3 min-h-[180px]">
                <div className="w-10 h-10 rounded-xl border-2 border-dashed border-slate-600 group-hover:border-slate-400 flex items-center justify-center transition-colors">
                  <Plus className="h-5 w-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </div>
                <p className="text-slate-500 group-hover:text-slate-300 text-sm font-medium transition-colors">
                  New workspace
                </p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
