"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/types";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  LayoutGrid,
  Link2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavProps {
  user: SessionUser;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "member"] },
  { href: "/dashboard/snapshot", label: "Org Snapshot", icon: LayoutGrid, roles: ["admin", "manager"] },
  { href: "/dashboard/org", label: "Departments", icon: Building2, roles: ["admin", "manager"] },
  { href: "/dashboard/people", label: "People", icon: Users, roles: ["admin", "manager"] },
  { href: "/dashboard/links", label: "Links", icon: Link2, roles: ["admin", "manager"] },
  { href: "/dashboard/reports", label: "Reports", icon: FileText, roles: ["admin", "manager", "member"] },
];

export default function DashboardNav({ user }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">OrgRise</span>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">AI</Badge>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user.name}</span>
              <Badge variant="outline" className="ml-2 text-xs capitalize">{user.role}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
                  active ? "bg-gray-100 text-gray-900" : "text-gray-600"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="ml-1">Sign out</span>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
