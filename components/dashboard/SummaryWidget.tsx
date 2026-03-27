"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, FileDown } from "lucide-react";

interface Props {
  orgId: string;
  accentColor: string;
  lastSummary: { id: string; date: string } | null;
}

export default function SummaryWidget({ orgId, accentColor, lastSummary }: Props) {
  const [generating, setGenerating] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(lastSummary?.id ?? null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(lastSummary?.date ?? null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/w/${orgId}/summary`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }

      setSummaryId(data.id);
      setGeneratedAt(data.generatedAt);
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
