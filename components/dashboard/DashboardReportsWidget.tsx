"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FileText, FileDown, ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

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

type SortKey = "userName" | "departmentName" | "submittedAt" | "source";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

interface Props {
  reports: ReportRow[];
  orgId: string;
  accentColor: string;
}

const SOURCE_LABELS: Record<string, string> = {
  form: "Form",
  pdf_upload: "PDF",
  email: "Email",
};

export default function DashboardReportsWidget({ reports, orgId, accentColor }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

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
    if (!q) return reports;
    return reports.filter((r) => {
      return (
        r.userName.toLowerCase().includes(q) ||
        new Date(r.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase().includes(q)
      );
    });
  }, [reports, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "submittedAt") {
        cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      } else if (sortKey === "userName") {
        cmp = a.userName.localeCompare(b.userName);
      } else if (sortKey === "departmentName") {
        cmp = a.departmentName.localeCompare(b.departmentName);
      } else if (sortKey === "source") {
        cmp = a.source.localeCompare(b.source);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3" style={{ color: accentColor }} />
      : <ChevronDown className="h-3 w-3" style={{ color: accentColor }} />;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">{reports.length} total submissions</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or date…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 w-44"
            style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {(["userName", "departmentName", "submittedAt", "source"] as SortKey[]).map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    {col === "userName" ? "Name" : col === "departmentName" ? "Department" : col === "submittedAt" ? "Date" : "Source"}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                  {search ? "No reports match your search." : "No reports yet."}
                </td>
              </tr>
            ) : (
              paginated.map((row) => {
                const initials = row.userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                const isPdf = row.source === "pdf_upload";
                return (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: row.departmentColor ? `linear-gradient(135deg,${row.departmentColor},${row.departmentColor}cc)` : `linear-gradient(135deg,${accentColor},${accentColor}cc)` }}
                        >
                          {initials}
                        </div>
                        <span className="font-medium text-slate-800 truncate max-w-[120px]">{row.userName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-500 truncate max-w-[100px] block">{row.departmentName || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(row.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        isPdf ? "bg-orange-50 text-orange-600" : row.source === "email" ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"
                      }`}>
                        {isPdf && <FileDown className="h-3 w-3" />}
                        {SOURCE_LABELS[row.source]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isPdf && row.rawPdfUrl ? (
                        <a
                          href={row.rawPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80"
                          style={{ color: accentColor }}
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      ) : (
                        <Link
                          href={`/w/${orgId}/people/${row.userId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80"
                          style={{ color: accentColor }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
        <span>
          {sorted.length === 0 ? "0 results" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)} of ${sorted.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
