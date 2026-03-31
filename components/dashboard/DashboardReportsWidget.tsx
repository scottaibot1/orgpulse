"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FileText, FileDown, ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

export interface ReportRow {
  id: string;
  userId: string;
  submittedAt: string;
  source: "form" | "pdf_upload" | "email";
  rawPdfUrl: string | null;
  parsedReportId: string | null;
  userName: string;
  departmentName: string;
  departmentColor: string | null;
}

type SortKey = "userName" | "departmentName" | "submittedAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 4;

interface Props {
  reports: ReportRow[];
  orgId: string;
  accentColor: string;
}

export default function DashboardReportsWidget({ reports: initialReports, orgId, accentColor }: Props) {
  const [rows, setRows] = useState<ReportRow[]>(initialReports);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(reportId: string) {
    const removed = rows.find((r) => r.id === reportId);
    setDeleting(reportId);
    // Optimistic: remove immediately
    setRows((prev) => prev.filter((r) => r.id !== reportId));
    try {
      const res = await fetch(`/api/w/${orgId}/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok && removed) {
        // Restore row if API failed
        setRows((prev) => [removed, ...prev]);
      }
    } catch {
      if (removed) setRows((prev) => [removed, ...prev]);
    } finally {
      setDeleting(null);
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "submittedAt" ? "desc" : "asc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      r.userName.toLowerCase().includes(q) ||
      new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase().includes(q)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "submittedAt") {
        cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      } else if (sortKey === "userName") {
        cmp = a.userName.localeCompare(b.userName);
      } else if (sortKey === "departmentName") {
        cmp = a.departmentName.localeCompare(b.departmentName);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-2.5 w-2.5 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-2.5 w-2.5" style={{ color: accentColor }} />
      : <ChevronDown className="h-2.5 w-2.5" style={{ color: accentColor }} />;
  }

  const COL_LABELS: Record<SortKey, string> = {
    userName: "Name",
    departmentName: "Department",
    submittedAt: "Date & Time",
  };

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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 w-36"
            style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {(["userName", "departmentName", "submittedAt"] as SortKey[]).map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-0.5">
                    {COL_LABELS[col]}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">View</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                  {search ? "No reports match your search." : "No reports yet."}
                </td>
              </tr>
            ) : (
              paginated.map((row) => {
                const initials = row.userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                const isPdf = row.source === "pdf_upload";
                const dt = new Date(row.submittedAt);
                const dateStr = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{ background: row.departmentColor ? `linear-gradient(135deg,${row.departmentColor},${row.departmentColor}cc)` : `linear-gradient(135deg,${accentColor},${accentColor}cc)` }}
                        >
                          {initials}
                        </div>
                        <span className="font-medium text-slate-800 truncate max-w-[100px]">{row.userName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-slate-500 truncate max-w-[80px] block">{row.departmentName || "—"}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-slate-700">{dateStr}</span>
                      <span className="text-slate-400 ml-1">{timeStr}</span>
                    </td>
                    <td className="px-3 py-2">
                      {isPdf && row.rawPdfUrl ? (
                        <a
                          href={row.rawPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium hover:opacity-80"
                          style={{ color: accentColor }}
                        >
                          <FileDown className="h-3 w-3" />
                          PDF
                        </a>
                      ) : (
                        <Link
                          href={`/w/${orgId}/people/${row.userId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium hover:opacity-80"
                          style={{ color: accentColor }}
                        >
                          <FileText className="h-3 w-3" />
                          View
                        </Link>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={deleting === row.id}
                        className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete report"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-[11px] text-slate-500">
        <span>
          {sorted.length === 0 ? "0 results" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-1.5">{page}/{totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
