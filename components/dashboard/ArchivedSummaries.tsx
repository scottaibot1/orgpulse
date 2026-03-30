"use client";

import { useState } from "react";
import { FileDown, Trash2 } from "lucide-react";

interface Summary {
  id: string;
  summaryDate: string;
  totalSubmissions: number;
  missingSubmissions: number;
  createdAt: string;
}

interface Props {
  summaries: Summary[];
  orgId: string;
  accentColor: string;
}

export default function ArchivedSummaries({ summaries: initial, orgId, accentColor }: Props) {
  const [summaries, setSummaries] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);

  if (summaries.length === 0) return null;

  const allSelected = summaries.length > 0 && selected.size === summaries.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(summaries.map((s) => s.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this summary? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/w/${orgId}/summary/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSummaries((prev) => prev.filter((s) => s.id !== id));
        setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected summar${selected.size === 1 ? "y" : "ies"}? This cannot be undone.`)) return;
    setDeletingBulk(true);
    const ids = Array.from(selected);
    const results = await Promise.all(
      ids.map((id) => fetch(`/api/w/${orgId}/summary/${id}`, { method: "DELETE" }).then((r) => ({ id, ok: r.ok })))
    );
    const deleted = new Set(results.filter((r) => r.ok).map((r) => r.id));
    setSummaries((prev) => prev.filter((s) => !deleted.has(s.id)));
    setSelected((prev) => { const next = new Set(prev); deleted.forEach((id) => next.delete(id)); return next; });
    setDeletingBulk(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Past Executive Summaries</h2>
          <p className="text-xs text-slate-400 mt-0.5">Up to 30 most recent — click any row to open as PDF</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={deletingBulk}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selected.size} selected
          </button>
        )}
      </div>
      <div className="divide-y divide-slate-100">
        {/* Select-all header row */}
        <div className="flex items-center px-5 py-2 bg-slate-50 border-b border-slate-100">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer mr-3 flex-shrink-0"
            style={{ accentColor }}
          />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            {selected.size === 0 ? "Select all" : `${selected.size} of ${summaries.length} selected`}
          </span>
        </div>

        {summaries.map((s) => {
          const total = s.totalSubmissions + s.missingSubmissions;
          const rate = total > 0 ? Math.round((s.totalSubmissions / total) * 100) : 0;
          const rateColor = rate === 100 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-red-600";
          const rateBg = rate === 100 ? "bg-emerald-50" : rate >= 70 ? "bg-amber-50" : "bg-red-50";

          const generatedAt = new Date(s.createdAt);
          const summaryDay = new Date(s.summaryDate);
          const isToday = new Date().toDateString() === summaryDay.toDateString();

          const dayLabel = isToday
            ? "Today"
            : summaryDay.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

          const timeLabel = generatedAt.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });

          const isDeleting = deletingId === s.id;
          const isSelected = selected.has(s.id);

          return (
            <div
              key={s.id}
              className={`flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group ${isSelected ? "bg-blue-50/40" : ""}`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleOne(s.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer mr-3 flex-shrink-0"
                style={{ accentColor }}
              />

              {/* Left: date + timestamp — clickable */}
              <a
                href={`/w/${orgId}/summary/${s.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accentColor}12` }}
                >
                  <FileDown className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">{dayLabel}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Generated {timeLabel}</p>
                </div>
              </a>

              {/* Right: stats + actions */}
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                  <span>{s.totalSubmissions} submitted</span>
                  <span className="text-slate-200">·</span>
                  <span>{s.missingSubmissions} missing</span>
                  <span className="text-slate-200">·</span>
                  <span className={`font-semibold px-1.5 py-0.5 rounded ${rateColor} ${rateBg}`}>{rate}%</span>
                </div>
                <a
                  href={`/w/${orgId}/summary/${s.id}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: accentColor }}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </a>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  disabled={isDeleting || deletingBulk}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Delete this summary"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
