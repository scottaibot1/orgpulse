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
} from "lucide-react";

interface SidebarProps {
  user: SessionUser;
}

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/snapshot", label: "Org Snapshot", icon: LayoutGrid, exact: false },
      { href: "/dashboard/reports", label: "Reports", icon: FileText, exact: false },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/dashboard/org", label: "Departments", icon: Building2, exact: false },
      { href: "/dashboard/people", label: "People", icon: Users, exact: false },
      { href: "/dashboard/links", label: "Submission Links", icon: Link2, exact: false },
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-500/20 text-violet-300",
  manager: "bg-sky-500/20 text-sky-300",
  member: "bg-slate-500/20 text-slate-300",
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-[#0f172a] border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">OrgPulse</p>
          <p className="text-slate-500 text-xs mt-0.5">AI Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin space-y-6">
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
                          ? "bg-gradient-to-r from-violet-600/20 to-indigo-600/10 text-white border border-violet-500/20"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300")} />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="h-3 w-3 text-violet-400" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: alerts shortcut */}
      <div className="px-3 pb-3 border-t border-slate-800 pt-3 space-y-0.5">
        <Link
          href="/dashboard/alerts"
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
