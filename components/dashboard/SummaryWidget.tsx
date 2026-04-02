"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, FileDown, Mail, AlertCircle, Calendar } from "lucide-react";

interface Props {
  orgId: string;
  accentColor: string;
  lastSummary: { id: string; date: string } | null;
  availableDays?: string[]; // YYYY-MM-DD sorted newest first
}

function formatDayOption(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date().toISOString().split("T")[0];
  const isToday = dateStr === today;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + (isToday ? " (today)" : "");
}

export default function SummaryWidget({ orgId, accentColor, lastSummary, availableDays = [] }: Props) {
  const [generating, setGenerating] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(lastSummary?.id ?? null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(lastSummary?.date ?? null);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; to: string | null; error: string | null } | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDay, setSelectedDay] = useState<string>(availableDays[0] ?? todayStr);

  async function generate() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/w/${orgId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDate: selectedDay }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }

      setSummaryId(data.id);
      setGeneratedAt(data.generatedAt);
      setEmailStatus({ sent: data.emailSent ?? false, to: data.emailTo ?? null, error: data.emailError ?? null });
    } catch {
      setError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accentColor}18` }}
          >
            <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Executive Summary</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {formattedDate ? `Last generated ${formattedDate}` : "No summary generated yet"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Day selector */}
          {availableDays.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1"
                style={{ "--tw-ring-color": accentColor } as React.CSSProperties}
                disabled={generating}
              >
                {availableDays.map((d) => (
                  <option key={d} value={d}>{formatDayOption(d)}</option>
                ))}
              </select>
            </div>
          )}

          {generating && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mr-1">
              <div
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${accentColor}40`, borderTopColor: accentColor }}
              />
              Generating…
            </div>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ background: accentColor }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
            {summaryId ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-3 border-b border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Email status */}
      {emailStatus && (
        <div className={`px-5 py-2.5 border-b flex items-center gap-2 text-sm ${
          emailStatus.sent
            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
            : "bg-red-50 border-red-100 text-red-600"
        }`}>
          {emailStatus.sent
            ? <><Mail className="h-4 w-4 flex-shrink-0" /> Summary emailed to <strong>{emailStatus.to}</strong></>
            : <><AlertCircle className="h-4 w-4 flex-shrink-0" /> Email not sent: {emailStatus.error}</>
          }
        </div>
      )}

      {/* Download link — only shown when a summary exists */}
      {summaryId && !generating && (
        <button
          onClick={() => window.open(`/w/${orgId}/summary/${summaryId}/print`, "_blank")}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left group"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${accentColor}12` }}
          >
            <FileDown className="h-4 w-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-sm font-semibold group-hover:underline" style={{ color: accentColor }}>
              Download Report
            </p>
            {formattedDate && (
              <p className="text-xs text-slate-400 mt-0.5">Generated {formattedDate}</p>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
