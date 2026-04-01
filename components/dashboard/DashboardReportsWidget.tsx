"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FileText, FileDown, ChevronRight, ChevronDown, Trash2, Search } from "lucide-react";

export interface ReportRow {
  id: string;
  userId: string;
  submittedAt: string;
  reportDate: string; // YYYY-MM-DD
  source: "form" | "pdf_upload" | "email";
  rawPdfUrl: string | null;
  parsedReportId: string | null;
  userName: string;
  departmentName: string;
  departmentColor: string | null;
}

interface Props {
  reports: ReportRow[];
  orgId: string;
  accentColor: string;
}

// Get Monday of the week for a given date string (YYYY-MM-DD)
function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(mondayStr: string): string {
  const mon = new Date(mondayStr + "T12:00:00");
  const sun = new Date(mondayStr + "T12:00:00");
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
  return `Week of ${fmt(mon)} – ${fmt(sun)}`;
}

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "numeric", day: "numeric" });
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export default function DashboardReportsWidget({ reports: initialReports, orgId, accentColor }: Props) {
  const [rows, setRows] = useState<ReportRow[]>(initialReports);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const today = todayStr();
  const thisWeekMonday = getMondayOf(today);

  // Expanded state keyed by week monday or day string
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set([thisWeekMonday]));
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set([today]));

  function toggleWeek(mon: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(mon)) next.delete(mon); else next.add(mon);
      return next;
    });
  }
  function toggleDay(day: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  }

  async function handleDelete(reportId: string) {
    const removed = rows.find((r) => r.id === reportId);
    setDeleting(reportId);
    setRows((prev) => prev.filter((r) => r.id !== reportId));
    try {
      const res = await fetch(`/api/w/${orgId}/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok && removed) setRows((prev) => [removed, ...prev]);
    } catch {
      if (removed) setRows((prev) => [removed, ...prev]);
    } finally {
      setDeleting(null);
    }
  }

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      r.userName.toLowerCase().includes(q) ||
      r.reportDate.includes(q) ||
      new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Build week buckets from filtered rows + ensure current week has all 7 days
  const weekBuckets = useMemo(() => {
    // Group rows by reportDate
    const byDay = new Map<string, ReportRow[]>();
    for (const row of filtered) {
      const d = row.reportDate;
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(row);
    }

    // Group days by their week monday
    const byWeek = new Map<string, Set<string>>();
    for (const d of Array.from(byDay.keys())) {
      const mon = getMondayOf(d);
      if (!byWeek.has(mon)) byWeek.set(mon, new Set());
      byWeek.get(mon)!.add(d);
    }

    // Always include current week even if no reports
    if (!byWeek.has(thisWeekMonday)) byWeek.set(thisWeekMonday, new Set());

    // Ensure all 7 days of each week exist as keys (even if empty)
    for (const [mon, days] of Array.from(byWeek)) {
      for (let i = 0; i < 7; i++) {
        const day = addDays(mon, i);
        days.add(day);
        if (!byDay.has(day)) byDay.set(day, []);
      }
    }

    // Sort weeks newest first
    const sortedWeeks = Array.from(byWeek.keys()).sort((a, b) => b.localeCompare(a));
    return sortedWeeks.map((mon) => ({
      monday: mon,
      label: formatWeekLabel(mon),
      days: Array.from(byWeek.get(mon)!).sort((a, b) => b.localeCompare(a)).map((day) => ({
        date: day,
        label: formatDayLabel(day),
        reports: (byDay.get(day) ?? []).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
      })),
      totalCount: Array.from(byWeek.get(mon)!).reduce((sum, d) => sum + (byDay.get(d)?.length ?? 0), 0),
    }));
  }, [filtered, thisWeekMonday]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Reports</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{rows.length} total</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 w-36"
            style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto">
        {weekBuckets.length === 0 ? (
          <p className="py-8 text-center text-slate-400 text-xs">
            {search ? "No reports match your search." : "No reports yet."}
          </p>
        ) : (
          weekBuckets.map((week) => {
            const weekOpen = expandedWeeks.has(week.monday);
            return (
              <div key={week.monday} className="border-b border-slate-50 last:border-b-0">
                {/* Week row */}
                <button
                  onClick={() => toggleWeek(week.monday)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  {weekOpen
                    ? <ChevronDown className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    : <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />}
                  <span className="text-[11px] font-semibold text-slate-700 flex-1">{week.label}</span>
                  {week.totalCount > 0 && (
                    <span className="text-[10px] text-slate-400 font-medium">{week.totalCount}</span>
                  )}
                </button>

                {weekOpen && week.days.map((day) => {
                  const dayOpen = expandedDays.has(day.date);
                  const isToday = day.date === today;
                  return (
                    <div key={day.date}>
                      {/* Day row */}
                      <button
                        onClick={() => toggleDay(day.date)}
                        className="w-full flex items-center gap-2 px-5 py-1.5 hover:bg-slate-50 transition-colors text-left"
                      >
                        {dayOpen
                          ? <ChevronDown className="h-2.5 w-2.5 text-slate-300 flex-shrink-0" />
                          : <ChevronRight className="h-2.5 w-2.5 text-slate-300 flex-shrink-0" />}
                        <span className={`text-[11px] flex-1 ${isToday ? "font-semibold" : "text-slate-500"}`} style={isToday ? { color: accentColor } : {}}>
                          {day.label}{isToday ? " · Today" : ""}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {day.reports.length > 0 ? day.reports.length : ""}
                        </span>
                      </button>

                      {dayOpen && day.reports.length === 0 && (
                        <p className="px-10 py-2 text-[11px] text-slate-300 italic">No reports</p>
                      )}

                      {dayOpen && day.reports.map((row) => {
                        const initials = row.userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                        const isPdf = row.source === "pdf_upload";
                        const dt = new Date(row.submittedAt);
                        const submittedDateStr = dt.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
                        const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                        // Show upload date if it differs from the bucket day (timezone cross-day case)
                        const submittedDay = dt.toISOString().split("T")[0];
                        const dateLabel = submittedDay !== day.date ? `${submittedDateStr} ` : "";
                        const timestampStr = `${dateLabel}${timeStr}`;

                        return (
                          <div key={row.id} className="flex items-center gap-2 px-10 py-1.5 hover:bg-slate-50 transition-colors group">
                            {/* Avatar */}
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                              style={{ background: row.departmentColor ? `linear-gradient(135deg,${row.departmentColor},${row.departmentColor}cc)` : `linear-gradient(135deg,${accentColor},${accentColor}cc)` }}
                            >
                              {initials}
                            </div>
                            <span className="text-[11px] font-medium text-slate-700 flex-1 truncate">{row.userName}</span>
                            <span className="text-[10px] text-slate-400 hidden sm:block">{row.departmentName}</span>
                            <span className="text-[10px] text-slate-400 tabular-nums">{timestampStr}</span>
                            {/* View link */}
                            {isPdf && row.rawPdfUrl ? (
                              <a href={row.rawPdfUrl} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] font-medium hover:opacity-80 flex items-center gap-0.5"
                                style={{ color: accentColor }}>
                                <FileDown className="h-2.5 w-2.5" />PDF
                              </a>
                            ) : (
                              <Link href={`/w/${orgId}/people/${row.userId}`}
                                className="text-[10px] font-medium hover:opacity-80 flex items-center gap-0.5"
                                style={{ color: accentColor }}>
                                <FileText className="h-2.5 w-2.5" />View
                              </Link>
                            )}
                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(row.id)}
                              disabled={deleting === row.id}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                              title="Delete report"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
