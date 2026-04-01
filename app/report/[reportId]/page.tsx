import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ reportId: string }>;
}

interface StructuredData {
  summary?: string;
  tasks?: {
    description: string;
    status: string;
    hoursToday?: number | null;
    projectName?: string | null;
  }[];
  notes?: string | null;
  blockers?: string | null;
  totalHours?: number | null;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  completed: { bg: "#ecfdf5", color: "#047857", icon: "✅" },
  standout:  { bg: "#f5f3ff", color: "#6d28d9", icon: "⭐" },
  ontack:    { bg: "#eff6ff", color: "#1d4ed8", icon: "▶" },
  atrisk:    { bg: "#fffbeb", color: "#b45309", icon: "⚠️" },
  blocker:   { bg: "#fef2f2", color: "#b91c1c", icon: "🚫" },
  critical:  { bg: "#fef2f2", color: "#b91c1c", icon: "🔴" },
};

function taskStatusStyle(status: string) {
  const key = status.toLowerCase().replace(/[\s-]+/g, "");
  return STATUS_STYLE[key] ?? { bg: "#f8fafc", color: "#475569", icon: "•" };
}

async function getReport(reportId: string) {
  return prisma.parsedReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      date: true,
      aiSummary: true,
      structuredData: true,
      notes: true,
      blockers: true,
      totalHours: true,
      user: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reportId } = await params;
  const parsed = await getReport(reportId);
  if (!parsed) return { title: "Report Not Found" };
  return { title: `${parsed.user.name} — Status Report` };
}

export default async function ReportPage({ params }: Props) {
  const { reportId } = await params;
  const parsed = await getReport(reportId);

  if (!parsed) notFound();

  const sd = parsed.structuredData as StructuredData | null;
  const tasks = sd?.tasks ?? [];
  const notes = sd?.notes ?? parsed.notes;
  const blockers = sd?.blockers ?? parsed.blockers;
  const totalHours = sd?.totalHours ?? (parsed.totalHours ? Number(parsed.totalHours) : null);

  const reportDate = parsed.date.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", color: "#1e293b" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", borderRadius: 12, padding: "24px 28px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: totalHours != null ? 14 : 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#818cf8,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
              {parsed.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{parsed.user.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>Status Report · {reportDate}</div>
            </div>
          </div>
          {totalHours != null && (
            <div style={{ display: "inline-block", background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              ⏱ {totalHours}h logged
            </div>
          )}
        </div>

        {/* Summary */}
        {parsed.aiSummary && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "18px 22px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Summary</div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "#334155" }}>{parsed.aiSummary}</div>
          </div>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "18px 22px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Tasks</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map((t, i) => {
                const s = taskStatusStyle(t.status);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: s.bg, borderRadius: 8, borderLeft: `3px solid ${s.color}` }}>
                    <span style={{ fontSize: 14, flexShrink: 0, lineHeight: "1.5" }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: s.color, fontWeight: 600, lineHeight: 1.5 }}>{t.description}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" as const }}>
                        {t.projectName && (
                          <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", borderRadius: 4, padding: "1px 7px" }}>{t.projectName}</span>
                        )}
                        {t.hoursToday != null && (
                          <span style={{ fontSize: 11, color: "#64748b" }}>{t.hoursToday}h</span>
                        )}
                        <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize" as const }}>{t.status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "18px 22px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Notes</div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "#334155", whiteSpace: "pre-wrap" }}>{notes}</div>
          </div>
        )}

        {/* Blockers */}
        {blockers && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "18px 22px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>🚫 Blockers</div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "#7f1d1d", whiteSpace: "pre-wrap" }}>{blockers}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 32 }}>
          Powered by OrgRise AI
        </div>

      </div>
    </div>
  );
}
