import Link from "next/link";
import { FileDown } from "lucide-react";

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

export default function ArchivedSummaries({ summaries, orgId, accentColor }: Props) {
  if (summaries.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Past Executive Summaries</h2>
        <p className="text-xs text-slate-400 mt-0.5">Up to 30 most recent — click any row to open as PDF</p>
      </div>
      <div className="divide-y divide-slate-100">
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

          return (
            <Link
              key={s.id}
              href={`/w/${orgId}/summary/${s.id}/print`}
              target="_blank"
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
            >
              {/* Left: date + timestamp */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accentColor}12` }}
                >
                  <FileDown className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                    {dayLabel}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Generated {timeLabel}</p>
                </div>
              </div>

              {/* Right: stats + download label */}
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                  <span>{s.totalSubmissions} submitted</span>
                  <span className="text-slate-200">·</span>
                  <span>{s.missingSubmissions} missing</span>
                  <span className="text-slate-200">·</span>
                  <span className={`font-semibold px-1.5 py-0.5 rounded ${rateColor} ${rateBg}`}>
                    {rate}%
                  </span>
                </div>
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity group-hover:opacity-90"
                  style={{ background: accentColor }}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Download PDF
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
