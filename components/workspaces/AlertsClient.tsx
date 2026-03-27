"use client";

import { useState } from "react";
import { Bell, AlertTriangle, Info, CheckCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Alert {
  id: string;
  message: string;
  severity: string;
  alertType: string;
  isRead: boolean;
  createdAt: string;
  user: { id: string; name: string; title: string | null } | null;
}

interface Props {
  initialAlerts: Alert[];
  orgId: string;
  accentColor: string;
}

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700", label: "Critical" },
  warning:  { icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", label: "Warning" },
  info:     { icon: Info, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700", label: "Info" },
};

const TYPE_LABELS: Record<string, string> = {
  stall: "Stalled work",
  overdue: "Overdue",
  missing_submission: "Missing submission",
  pattern: "Pattern detected",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AlertsClient({ initialAlerts, orgId, accentColor: _accentColor }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [marking, setMarking] = useState(false);

  const displayed = filter === "unread" ? alerts.filter((a) => !a.isRead) : alerts;
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  async function markRead(ids: string[]) {
    setAlerts((prev) => prev.map((a) => ids.includes(a.id) ? { ...a, isRead: true } : a));
    await fetch(`/api/w/${orgId}/alerts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    router.refresh();
  }

  async function markAllRead() {
    setMarking(true);
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    await fetch(`/api/w/${orgId}/alerts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setMarking(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["unread", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f === "unread" ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` : "All"}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={marking}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Alert list */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <Bell className="h-10 w-10 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 font-medium">
            {filter === "unread" ? "No unread alerts" : "No alerts yet"}
          </p>
          {filter === "unread" && alerts.length > 0 && (
            <button onClick={() => setFilter("all")} className="text-sm mt-1 underline text-slate-400">
              View all alerts
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 flex items-start gap-3 transition-opacity ${
                  alert.isRead ? "opacity-60 bg-white border-slate-100" : `${cfg.bg} ${cfg.border}`
                }`}
              >
                <div className={`flex-shrink-0 mt-0.5 ${alert.isRead ? "text-slate-400" : cfg.text}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${alert.isRead ? "text-slate-500" : "text-slate-800"}`}>
                      {alert.message}
                    </p>
                    <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{timeAgo(alert.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {alert.user && (
                      <span className="text-xs text-slate-400">{alert.user.name}</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-400">{TYPE_LABELS[alert.alertType] ?? alert.alertType}</span>
                  </div>
                </div>
                {!alert.isRead && (
                  <button
                    onClick={() => markRead([alert.id])}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
                    title="Mark as read"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
