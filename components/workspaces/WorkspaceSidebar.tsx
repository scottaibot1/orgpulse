"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  LogOut,
  Link2,
  LayoutGrid,
  ChevronRight,
  Zap,
  Bell,
  Settings,
  ArrowLeftRight,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

interface WorkspaceInfo {
  id: string;
  name: string;
  accentColor: string;
}

interface WorkspaceSidebarProps {
  user: SessionUser;
  workspace: WorkspaceInfo;
  allWorkspaces: WorkspaceInfo[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-500/20 text-violet-300",
  manager: "bg-sky-500/20 text-sky-300",
  member: "bg-slate-500/20 text-slate-300",
};

export default function WorkspaceSidebar({ user, workspace, allWorkspaces }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const base = `/w/${workspace.id}`;

  const navSections = [
    {
      label: "Overview",
      items: [
        { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: `${base}/snapshot`, label: "Org Snapshot", icon: LayoutGrid, exact: false },
        { href: `${base}/reports`, label: "Reports", icon: FileText, exact: false },
      ],
    },
    {
      label: "Configuration",
      items: [
        { href: `${base}/org`, label: "Departments", icon: Building2, exact: false },
        { href: `${base}/people`, label: "People", icon: Users, exact: false },
        { href: `${base}/links`, label: "Submission Links", icon: Link2, exact: false },
        { href: `${base}/settings`, label: "Settings", icon: Settings, exact: false },
      ],
    },
  ];

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const wsInitials = workspace.name.slice(0, 2).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-[#0f172a] border-r border-slate-800">
      {/* Workspace header */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-slate-500 text-xs font-medium">OrgPulse AI</span>
        </div>
        {/* Workspace switcher */}
        <button
          onClick={() => setSwitcherOpen(!switcherOpen)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${workspace.accentColor}, ${workspace.accentColor}aa)` }}
          >
            {wsInitials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm font-semibold truncate leading-none">{workspace.name}</p>
            <p className="text-slate-500 text-xs mt-0.5">workspace</p>
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-slate-500 flex-shrink-0 transition-transform", switcherOpen && "rotate-180")} />
        </button>

        {/* Dropdown */}
        {switcherOpen && (
          <div className="mt-1 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
            {allWorkspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setSwitcherOpen(false);
                  router.push(`/w/${ws.id}/dashboard`);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-800 transition-colors",
                  ws.id === workspace.id && "bg-slate-800/50"
                )}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ws.accentColor}, ${ws.accentColor}aa)` }}
                >
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-slate-300 text-sm truncate">{ws.name}</span>
                {ws.id === workspace.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />}
              </button>
            ))}
            <div className="border-t border-slate-700">
              <Link
                href="/workspaces"
                onClick={() => setSwitcherOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                All workspaces
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-2 mb-2">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                        active
                          ? "text-white border border-violet-500/20"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                      style={active ? {
                        background: `linear-gradient(135deg, ${workspace.accentColor}30, ${workspace.accentColor}10)`,
                        borderColor: `${workspace.accentColor}40`,
                      } : undefined}
                    >
                      <Icon
                        className="h-4 w-4 flex-shrink-0"
                        style={active ? { color: workspace.accentColor } : undefined}
                      />
                      <span className="flex-1">{item.label}</span>
                      {active && (
                        <ChevronRight
                          className="h-3 w-3 flex-shrink-0"
                          style={{ color: workspace.accentColor }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Alerts shortcut */}
      <div className="px-3 pb-3 border-t border-slate-800 pt-3">
        <Link
          href={`${base}/alerts`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all group"
        >
          <Bell className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
          <span>Alerts</span>
        </Link>
      </div>

      {/* User */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{user.name}</p>
            <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", ROLE_COLORS[user.role])}>
              {user.role}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
