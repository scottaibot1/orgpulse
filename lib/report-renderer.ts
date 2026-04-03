// lib/report-renderer.ts — rebuilt from scratch per PROMPT 1 Template Rules

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HighlightItem {
  type: "ontack" | "tomorrowfocus" | "atrisk" | "blocker" | "completed" | "standout" | "critical";
  text: string;
  subcategory?: string;
  taskEmoji?: string;
}

export interface SalesMetric { label: string; value: number | string }

export interface TimeAllocationItem { label: string; hours: number; percent: number }

export interface PersonData {
  name: string;
  status: "fresh" | "standin" | "missing";
  isStandIn: boolean;
  daysSinceReport: number;
  hoursWorked: number | null;
  timeAllocation: TimeAllocationItem[];
  timeAllocationEstimated?: boolean;
  highlights: HighlightItem[];
  overflowNote?: string;
  salesMetrics?: SalesMetric[];
}

export interface DepartmentData {
  name: string;
  emoji: string;
  reportedCount: number;
  totalCount: number;
  statusLabel: string;
  statusOk: boolean;
  people: PersonData[];
  notExpectedToday?: boolean;
  scheduleLabel?: string;
}

export interface AttentionItem {
  emoji: string;
  department?: string;
  description: string;
  who: string;
  action: string;
}

export interface NeedsAttentionItem {
  status: "overdue" | "imminentlyDue" | "dueSoon" | "blocked";
  daysOverdue?: number | null;
  dueDate?: string | null;
  pctComplete?: number | null;
  who: string;
  department?: string;
  text: string;
}

export interface NotableProgressGroup {
  department: string;
  items: string[];
  overflowNote?: string | null;
}

export interface AiSummaryData {
  todaysPulse: string;
  organizationPulse?: string;
  attentionItems?: AttentionItem[];
  criticalAlerts?: { type: "blocker" | "atrisk"; department?: string; text: string }[];
  needsAttentionNow?: NeedsAttentionItem[];
  waitingOnExternal?: { text: string; who: string }[];
  notableProgress: NotableProgressGroup[] | string[];
  completenessScore: {
    totalExpected: number;
    freshToday: number;
    percentage: number;
    standIns: { name: string; daysSince: number }[];
    missing: { name: string }[];
    notScheduledToday: { name: string }[];
  };
  departments: DepartmentData[];
}

export interface RenderContext {
  orgName: string;
  summaryDate: Date;
  totalSubmissions: number;
  missingSubmissions: number;
  createdAt: Date;
  pdfUrl?: string;
  appUrl?: string;
  reportLinks?: Record<string, { parsedReportId: string; date: string; isStandIn: boolean; fileUrl?: string | null }>;
}

// ── Parse ──────────────────────────────────────────────────────────────────────

export function parseAiSummary(text: string): AiSummaryData | null {
  let cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (!cleaned.startsWith("{")) {
    const idx = cleaned.indexOf("{");
    if (idx === -1) return null;
    cleaned = cleaned.slice(idx);
  }
  const lastBrace = cleaned.lastIndexOf("}");
  if (lastBrace !== -1) cleaned = cleaned.slice(0, lastBrace + 1);
  try {
    return JSON.parse(cleaned) as AiSummaryData;
  } catch {
    return null;
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function stripCheckmark(text: string): string {
  return text.replace(/✅\s*/g, "").trim();
}

function personInitial(name: string): string {
  return (name ?? "?").trim().charAt(0).toUpperCase();
}

const AVATAR_PALETTE = ["#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7"];
function avatarBg(name: string): string {
  const code = (name ?? "?").charCodeAt(0);
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

const BAR_COLORS = ["#378ADD","#1D9E75","#EF9F27","#7F77DD","#888780"];

const DUE_RE = /\s*[·•\-]\s*due\s+(\d{4}-\d{2}-\d{2})/i;
const PCT_RE = /\s*[·•]\s*(\d{1,3})%(?!\d)/;

function extractDuePct(raw: string): { clean: string; dueDate: string | null; pct: number | null } {
  let text = stripCheckmark(raw);
  let dueDate: string | null = null;
  let pct: number | null = null;
  const dueM = text.match(DUE_RE);
  if (dueM) { dueDate = dueM[1]; text = text.replace(dueM[0], ""); }
  const pctM = text.match(PCT_RE);
  if (pctM) { pct = parseInt(pctM[1], 10); text = text.replace(pctM[0], ""); }
  return { clean: text.replace(/\s+/g, " ").trim(), dueDate, pct };
}

function dueDateColor(iso: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(iso + "T00:00:00");
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "#ef4444";
  if (diff <= 7) return "#f59e0b";
  return "#9ca3af";
}

function fmtMD(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function normalizeProgress(raw: NotableProgressGroup[] | string[]): NotableProgressGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "string") return [{ department: "", items: raw as string[] }];
  return raw as NotableProgressGroup[];
}

function reportHref(name: string, ctx: RenderContext): string | null {
  const link = ctx.reportLinks?.[name];
  if (!link) return null;
  return link.fileUrl ?? (ctx.appUrl && link.parsedReportId ? `${ctx.appUrl}/report/${link.parsedReportId}` : null);
}

// ── Attention config ───────────────────────────────────────────────────────────

const ATTN: Record<string, { emoji: string; badgeBg: string; badgeText: string; border: string; rowBg: string }> = {
  overdue:       { emoji: "🔥", badgeBg: "#7f1d1d", badgeText: "#fca5a5", border: "#ef4444", rowBg: "#fff7ed" },
  imminentlyDue: { emoji: "⚠️", badgeBg: "#78350f", badgeText: "#fde68a", border: "#f59e0b", rowBg: "#fffbeb" },
  dueSoon:       { emoji: "📅", badgeBg: "#1e3a5f", badgeText: "#93c5fd", border: "#3b82f6", rowBg: "#eff6ff" },
  blocked:       { emoji: "🚫", badgeBg: "#7f1d1d", badgeText: "#fca5a5", border: "#dc2626", rowBg: "#fef2f2" },
};

function attnLabel(item: NeedsAttentionItem): string {
  if (item.status === "overdue" && item.daysOverdue) return `${item.daysOverdue}d OVERDUE`;
  if (item.status === "overdue") return "OVERDUE";
  if (item.status === "imminentlyDue") return "DUE WITHIN 3d";
  if (item.status === "dueSoon") return "DUE WITHIN 7d";
  return "BLOCKED";
}

// ── PDF ────────────────────────────────────────────────────────────────────────

function pdfPulse(data: AiSummaryData): string {
  const cs = data.completenessScore ?? {};
  const pct = cs.percentage ?? 0;
  const fresh = cs.freshToday ?? 0;
  const missing = (cs.missing ?? []).length;
  const totalHours = Math.round(
    (data.departments ?? []).flatMap(d => d.people ?? []).reduce((s, p) => s + (p.hoursWorked ?? 0), 0)
  );
  const rateBg = pct === 100 ? "#14532d" : "#78350f";
  const rateColor = pct === 100 ? "#86efac" : "#fde68a";
  return `<div style="background:#0f172a;border-radius:12px;padding:24px 28px 20px;margin-bottom:20px;">
  <div style="font-size:11px;font-weight:700;color:#EF9F27;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">⚡ Today's Pulse</div>
  <div style="font-size:16px;font-weight:500;color:#f1f5f9;line-height:1.6;margin-bottom:16px;">${data.todaysPulse ?? ""}</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">
    <span style="background:#14532d;color:#86efac;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">✓ ${fresh} submitted</span>
    ${missing > 0
      ? `<span style="background:#7f1d1d;color:#fca5a5;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">⚠ ${missing} missing</span>`
      : `<span style="background:#14532d;color:#86efac;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">✓ All reported</span>`}
    <span style="background:${rateBg};color:${rateColor};border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">📊 ${pct}% rate</span>
    ${totalHours > 0 ? `<span style="background:#1e293b;color:#94a3b8;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">⏱ ${totalHours}h logged</span>` : ""}
  </div>
</div>`;
}

function pdfNeedsAttention(data: AiSummaryData): string {
  const items: NeedsAttentionItem[] = data.needsAttentionNow ?? [];
  const waiting = data.waitingOnExternal ?? [];
  const heading = `<div style="font-size:11px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">🔥 Needs Attention Now</div>`;
  if (items.length === 0 && waiting.length === 0) {
    return `<div style="margin-bottom:20px;">${heading}<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;font-size:13px;color:#166534;">🟢 No overdue, blocked, or imminently due items today.</div></div>`;
  }
  const rows = items.map(item => {
    const c = ATTN[item.status] ?? ATTN.blocked;
    const meta: string[] = [];
    if (item.dueDate) meta.push(`due ${item.dueDate}`);
    if (item.pctComplete != null) meta.push(`${item.pctComplete}%`);
    meta.push(item.who + (item.department ? ` · ${item.department}` : ""));
    return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:${c.rowBg};border-left:3px solid ${c.border};border-radius:0 6px 6px 0;margin-bottom:6px;">
    <span style="font-size:16px;flex-shrink:0;line-height:1.3;">${c.emoji}</span>
    <div>
      <span style="display:inline-block;background:${c.badgeBg};color:${c.badgeText};border-radius:4px;padding:1px 7px;font-size:10px;font-weight:800;letter-spacing:0.04em;margin-right:8px;">${attnLabel(item)}</span><span style="font-size:13px;font-weight:500;color:#1e293b;">${item.text}</span>
      <div style="font-size:11px;color:#78716c;margin-top:3px;">${meta.join(" · ")}</div>
    </div>
  </div>`;
  }).join("");
  const waitingBlock = waiting.length > 0 ? `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #e2e8f0;">
    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">⏳ Waiting on External</div>
    ${waiting.map(w => `<div style="font-size:12px;color:#64748b;margin-bottom:4px;font-style:italic;">· ${w.text} <span style="color:#94a3b8;">(${w.who})</span></div>`).join("")}
  </div>` : "";
  return `<div style="margin-bottom:20px;">${heading}<div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:10px;padding:16px 18px;">${rows}${waitingBlock}</div></div>`;
}

function pdfNotableProgress(data: AiSummaryData): string {
  const groups = normalizeProgress(data.notableProgress);
  if (groups.length === 0) return "";
  const blocks = groups.map(g => `
    ${g.department ? `<div style="font-size:10px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 5px;padding-bottom:3px;border-bottom:1px solid #bbf7d0;">${g.department}</div>` : ""}
    ${(g.items ?? []).map(item => `<div style="font-size:13px;color:#064e3b;line-height:1.65;margin-bottom:4px;"><span style="color:#16a34a;font-weight:600;margin-right:5px;">✓</span>${stripCheckmark(item)}</div>`).join("")}
    ${g.overflowNote ? `<div style="font-size:11px;color:#6b7280;font-style:italic;margin-top:4px;">${g.overflowNote}</div>` : ""}
  `).join("");
  return `<div style="margin-bottom:20px;">
  <div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">🏆 Notable Progress</div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px;">${blocks}</div>
</div>`;
}

function pdfTaskRow(h: HighlightItem): string {
  const { clean, dueDate, pct } = extractDuePct(h.text);
  let icon: string;
  if (h.type === "tomorrowfocus") {
    icon = `<span style="font-size:13px;flex-shrink:0;line-height:1.3;margin-top:1px;">📅</span>`;
  } else if (h.type === "blocker") {
    icon = `<span style="display:inline-block;width:14px;height:14px;border-radius:2px;background:#dc2626;flex-shrink:0;margin-top:3px;"></span>`;
  } else if (h.type === "atrisk") {
    icon = `<span style="display:inline-block;width:14px;height:14px;border-radius:2px;background:#f59e0b;flex-shrink:0;margin-top:3px;"></span>`;
  } else if (h.taskEmoji) {
    icon = `<span style="font-size:13px;flex-shrink:0;line-height:1.3;margin-top:1px;">${h.taskEmoji}</span>`;
  } else {
    icon = `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#378ADD;flex-shrink:0;margin-top:5px;"></span>`;
  }
  const duePart = dueDate ? `<span style="color:${dueDateColor(dueDate)};font-size:11px;margin-left:6px;">· due ${fmtMD(dueDate)}</span>` : "";
  const pctPart = pct != null ? `<span style="display:inline-block;background:#f1f5f9;color:#6b7280;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:5px;">${pct}%</span>` : "";
  const textColor = h.type === "tomorrowfocus" ? "#475569" : "#1e293b";
  return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;">${icon}<div style="flex:1;min-width:0;"><span style="font-size:13px;color:${textColor};line-height:1.5;">${clean}</span>${duePart}${pctPart}</div></div>`;
}

function pdfTimeBars(alloc: TimeAllocationItem[], estimated?: boolean): string {
  if (!alloc || alloc.length === 0) return "";
  const label = estimated ? "Time Allocation · Estimated" : "Time Allocation";
  const total = alloc.reduce((s, t) => s + (t.hours ?? 0), 0);
  const totalStr = Number.isInteger(total) ? `${total}h` : `${total.toFixed(1)}h`;
  const rows = alloc.filter(Boolean).map((t, i) => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
    <span style="width:130px;font-size:12px;color:#64748b;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.label}</span>
    <div style="flex:1;height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden;"><div style="height:4px;width:${Math.min(100, Math.max(1, t.percent))}%;background:${BAR_COLORS[i % BAR_COLORS.length]};border-radius:2px;"></div></div>
    <span style="font-size:12px;color:#64748b;flex-shrink:0;width:28px;text-align:right;">${t.hours}h</span>
  </div>`).join("");
  return `<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #f1f5f9;">
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
    <span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;${estimated ? "font-style:italic;" : ""}">${label}</span>
    <span style="font-size:12px;color:#64748b;font-weight:600;">${totalStr} total</span>
  </div>${rows}</div>`;
}

function pdfPersonCard(p: PersonData, ctx: RenderContext): string {
  const href = reportHref(p.name, ctx);
  const viewLink = href ? `<a href="${href}" style="color:#7c3aed;font-size:12px;font-weight:600;text-decoration:none;">View Submitted Report →</a>` : "";
  const statusBadge = p.status === "fresh"
    ? `<span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">Today</span>`
    : p.status === "standin"
    ? `<span style="background:#fef3c7;color:#92400e;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">Stand-in · ${p.daysSinceReport}d</span>`
    : `<span style="background:#fee2e2;color:#991b1b;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">Missing</span>`;

  // Sales metrics grid
  let salesGrid = "";
  if (p.salesMetrics && p.salesMetrics.length > 0) {
    const tiles = p.salesMetrics.map(m => `<div style="background:#f8fafc;border-radius:8px;padding:10px;text-align:center;flex:1;min-width:80px;"><div style="font-size:20px;font-weight:500;color:#0f172a;">${m.value}</div><div style="font-size:11px;color:#64748b;margin-top:2px;">${m.label}</div></div>`).join("");
    salesGrid = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">${tiles}</div>`;
  }

  const ontack = (p.highlights ?? []).filter(h => h.type === "ontack");
  const tomorrow = (p.highlights ?? []).filter(h => h.type === "tomorrowfocus");
  const blockers = (p.highlights ?? []).filter(h => h.type === "blocker");
  const others = (p.highlights ?? []).filter(h => !["ontack","tomorrowfocus","blocker"].includes(h.type));

  let ontackHtml = "";
  if (ontack.length > 0) {
    ontackHtml += `<div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">In Progress</div>`;
    let lastSub: string | undefined;
    for (const h of ontack) {
      if (h.subcategory && h.subcategory !== lastSub) {
        ontackHtml += `<div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:8px 0 4px;padding-bottom:2px;border-bottom:1px solid #f1f5f9;">${h.subcategory}</div>`;
        lastSub = h.subcategory;
      }
      ontackHtml += pdfTaskRow(h);
    }
  }

  let blockersHtml = "";
  if (blockers.length > 0) {
    blockersHtml = `<div style="font-size:10px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 5px;">🚫 Blocked</div>${blockers.map(h => pdfTaskRow(h)).join("")}`;
  }

  let tomorrowHtml = "";
  if (tomorrow.length > 0) {
    tomorrowHtml = `<div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 5px;">Tomorrow's Focus</div>${tomorrow.map(h => pdfTaskRow(h)).join("")}`;
  }

  let overflowHtml = "";
  if (p.overflowNote) {
    const txt = href
      ? p.overflowNote.replace(/view (full|submitted) report/i, `<a href="${href}" style="color:#6366f1;text-decoration:underline;">view full report</a>`)
      : p.overflowNote;
    overflowHtml = `<div style="margin-top:8px;font-size:11px;color:#64748b;font-style:italic;">${txt}</div>`;
  }

  const hasContent = ontack.length + tomorrow.length + blockers.length + others.length > 0 || salesGrid;
  return `<div style="background:#fff;border:0.5px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:12px;">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;${hasContent ? "margin-bottom:14px;" : ""}">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;border-radius:50%;background:${avatarBg(p.name)};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:16px;flex-shrink:0;">${personInitial(p.name)}</div>
      <div>
        <div style="font-size:15px;font-weight:500;color:#0f172a;">${p.name}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:3px;">
          ${p.hoursWorked != null ? `<span style="font-size:12px;color:#64748b;">${p.hoursWorked}h logged</span>` : ""}
          ${viewLink}
        </div>
      </div>
    </div>
    ${statusBadge}
  </div>
  ${salesGrid}${ontackHtml}${others.map(h => pdfTaskRow(h)).join("")}${blockersHtml}${tomorrowHtml}${overflowHtml}
  ${pdfTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated)}
  ${href && (p.highlights ?? []).length > 5 ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #f1f5f9;"><a href="${href}" style="color:#7c3aed;font-size:12px;text-decoration:none;">View Submitted Report →</a></div>` : ""}
</div>`;
}

function pdfDeptSection(dept: DepartmentData, ctx: RenderContext): string {
  if (dept.notExpectedToday) {
    return `<div style="font-size:13px;color:#94a3b8;margin-bottom:10px;padding:4px 0;">${dept.emoji} <span style="color:#475569;">${dept.name}</span> — ${dept.scheduleLabel ?? "not reporting today"}</div>`;
  }
  const statusColor = dept.statusOk ? "#22c55e" : "#f59e0b";
  return `<div style="margin-bottom:24px;">
  <div style="background:#0f172a;border-radius:8px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
    <span style="font-size:14px;font-weight:500;color:#e2e8f0;">${dept.emoji} ${dept.name}</span>
    <span style="font-size:11px;font-weight:600;color:${statusColor};">${dept.statusLabel}</span>
  </div>
  ${(dept.people ?? []).map(p => pdfPersonCard(p, ctx)).join("")}
</div>`;
}

export function renderPdfHtml(data: AiSummaryData, ctx: RenderContext): string {
  const { orgName, summaryDate, createdAt } = ctx;
  const formattedDate = summaryDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formattedGenerated = createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${orgName} — Executive Summary — ${formattedDate}</title>
<style>
:root{--header-bg:#0f172a;--bullet-blue:#378ADD;--bar-1:#378ADD;--bar-2:#1D9E75;--bar-3:#EF9F27;--bar-4:#7F77DD;--bar-5:#888780;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f1f5f9;color:#1e293b;}
.page{max-width:840px;margin:0 auto;background:#fff;padding:32px 40px 48px;}
@media print{@page{margin:10mm 8mm;size:A4;}body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.print-btn{display:none!important;}}
</style>
</head>
<body data-theme="dark">
<button class="print-btn" onclick="window.print()" style="position:fixed;top:20px;right:20px;background:#4f46e5;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;z-index:100;">Save as PDF</button>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
    <div>
      <div style="font-size:20px;font-weight:700;color:#0f172a;">${orgName}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.1em;">Executive Summary</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;color:#475569;">${formattedDate}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:3px;">Generated ${formattedGenerated}</div>
    </div>
  </div>
  ${pdfPulse(data)}
  ${pdfNeedsAttention(data)}
  ${pdfNotableProgress(data)}
  ${(data.departments ?? []).map(d => pdfDeptSection(d, ctx)).join("")}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;">
    <span style="font-size:10px;color:#94a3b8;">${orgName} · Confidential</span>
    <span style="font-size:10px;color:#94a3b8;">Generated by OrgRise AI</span>
  </div>
</div>
<script>setTimeout(()=>window.print(),400);</script>
</body>
</html>`;
}

// ── Email ──────────────────────────────────────────────────────────────────────

function emailPulse(data: AiSummaryData): string {
  const cs = data.completenessScore ?? {};
  const pct = cs.percentage ?? 0;
  const fresh = cs.freshToday ?? 0;
  const missing = (cs.missing ?? []).length;
  const totalHours = Math.round(
    (data.departments ?? []).flatMap(d => d.people ?? []).reduce((s, p) => s + (p.hoursWorked ?? 0), 0)
  );
  const rateBg = pct === 100 ? "#14532d" : "#78350f";
  const rateColor = pct === 100 ? "#86efac" : "#fde68a";
  return `<tr><td style="background:#0f172a;padding:24px 28px 20px;">
  <div style="font-size:11px;font-weight:700;color:#EF9F27;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">⚡ Today's Pulse</div>
  <div style="font-size:16px;font-weight:500;color:#f1f5f9;line-height:1.6;margin-bottom:16px;">${data.todaysPulse ?? ""}</div>
  <table cellpadding="0" cellspacing="0"><tr>
    <td style="padding-right:6px;"><span style="display:inline-block;background:#14532d;color:#86efac;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">✓ ${fresh} submitted</span></td>
    ${missing > 0
      ? `<td style="padding-right:6px;"><span style="display:inline-block;background:#7f1d1d;color:#fca5a5;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">⚠ ${missing} missing</span></td>`
      : `<td style="padding-right:6px;"><span style="display:inline-block;background:#14532d;color:#86efac;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">✓ All reported</span></td>`}
    <td style="padding-right:6px;"><span style="display:inline-block;background:${rateBg};color:${rateColor};border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">📊 ${pct}% rate</span></td>
    ${totalHours > 0 ? `<td><span style="display:inline-block;background:#1e293b;color:#94a3b8;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">⏱ ${totalHours}h logged</span></td>` : ""}
  </tr></table>
</td></tr>`;
}

function emailNeedsAttention(data: AiSummaryData): string {
  const items: NeedsAttentionItem[] = data.needsAttentionNow ?? [];
  const waiting = data.waitingOnExternal ?? [];
  if (items.length === 0 && waiting.length === 0) {
    return `<tr><td style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:12px 24px;">
    <span style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.08em;">🟢 Needs Attention Now — </span>
    <span style="font-size:12px;color:#166534;">No overdue, blocked, or imminently due items today.</span>
  </td></tr>`;
  }
  const rows = items.map(item => {
    const c = ATTN[item.status] ?? ATTN.blocked;
    const meta: string[] = [];
    if (item.dueDate) meta.push(`due ${item.dueDate}`);
    if (item.pctComplete != null) meta.push(`${item.pctComplete}%`);
    meta.push(item.who + (item.department ? ` · ${item.department}` : ""));
    return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:6px;"><tr>
    <td width="28" valign="top" style="padding:10px 6px 10px 10px;background:${c.rowBg};border-left:3px solid ${c.border};font-size:15px;">${c.emoji}</td>
    <td style="padding:10px 12px;background:${c.rowBg};">
      <span style="display:inline-block;background:${c.badgeBg};color:${c.badgeText};border-radius:3px;padding:1px 6px;font-size:9px;font-weight:800;margin-right:6px;">${attnLabel(item)}</span><span style="font-size:13px;font-weight:500;color:#1e293b;">${item.text}</span>
      <div style="font-size:11px;color:#78716c;margin-top:3px;">${meta.join(" · ")}</div>
    </td>
  </tr></table>`;
  }).join("");
  const waitingBlock = waiting.length > 0 ? `<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #e2e8f0;">
    <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">⏳ Waiting on External</div>
    ${waiting.map(w => `<div style="font-size:12px;color:#64748b;margin-bottom:3px;font-style:italic;">· ${w.text} <span style="color:#94a3b8;">(${w.who})</span></div>`).join("")}
  </div>` : "";
  return `<tr><td style="background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 24px;">
  <div style="font-size:11px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🔥 Needs Attention Now</div>
  ${rows}${waitingBlock}
</td></tr>`;
}

function emailNotableProgress(data: AiSummaryData): string {
  const groups = normalizeProgress(data.notableProgress);
  if (groups.length === 0) return "";
  const blocks = groups.map(g => `
    ${g.department ? `<div style="font-size:10px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.06em;margin:8px 0 4px;padding-bottom:2px;border-bottom:1px solid #bbf7d0;">${g.department}</div>` : ""}
    ${(g.items ?? []).map(item => `<div style="font-size:13px;color:#064e3b;line-height:1.65;margin-bottom:4px;"><span style="color:#16a34a;font-weight:600;margin-right:5px;">✓</span>${stripCheckmark(item)}</div>`).join("")}
    ${g.overflowNote ? `<div style="font-size:11px;color:#6b7280;font-style:italic;margin-top:4px;">${g.overflowNote}</div>` : ""}
  `).join("");
  return `<tr><td style="padding:16px 24px;border-bottom:1px solid #e2e8f0;">
  <div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">🏆 Notable Progress</div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;">${blocks}</div>
</td></tr>`;
}

function emailTaskRow(h: HighlightItem): string {
  const { clean, dueDate, pct } = extractDuePct(h.text);
  let iconCell: string;
  if (h.type === "tomorrowfocus") {
    iconCell = `<td width="20" valign="top" style="padding-top:1px;font-size:13px;line-height:1.5;">📅</td>`;
  } else if (h.type === "blocker") {
    iconCell = `<td width="20" valign="top" style="padding-top:3px;"><span style="display:inline-block;width:14px;height:14px;border-radius:2px;background:#dc2626;"></span></td>`;
  } else if (h.type === "atrisk") {
    iconCell = `<td width="20" valign="top" style="padding-top:3px;"><span style="display:inline-block;width:14px;height:14px;border-radius:2px;background:#f59e0b;"></span></td>`;
  } else if (h.taskEmoji) {
    iconCell = `<td width="20" valign="top" style="padding-top:1px;font-size:13px;line-height:1.5;">${h.taskEmoji}</td>`;
  } else {
    iconCell = `<td width="20" valign="top" style="padding-top:5px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#378ADD;"></span></td>`;
  }
  const duePart = dueDate ? ` <span style="color:${dueDateColor(dueDate)};font-size:11px;">· due ${fmtMD(dueDate)}</span>` : "";
  const pctPart = pct != null ? ` <span style="display:inline-block;background:#f1f5f9;color:#6b7280;border-radius:10px;padding:1px 7px;font-size:11px;">${pct}%</span>` : "";
  const textColor = h.type === "tomorrowfocus" ? "#475569" : "#1e293b";
  return `<tr><td style="padding:2px 0;"><table cellpadding="0" cellspacing="0" width="100%"><tr>
    ${iconCell}<td style="font-size:13px;color:${textColor};line-height:1.5;padding-left:4px;">${clean}${duePart}${pctPart}</td>
  </tr></table></td></tr>`;
}

function emailTimeBars(alloc: TimeAllocationItem[], estimated?: boolean): string {
  if (!alloc || alloc.length === 0) return "";
  const label = estimated ? "Time Allocation · Estimated" : "Time Allocation";
  const total = alloc.reduce((s, t) => s + (t.hours ?? 0), 0);
  const totalStr = Number.isInteger(total) ? `${total}h` : `${total.toFixed(1)}h`;
  const rows = alloc.filter(Boolean).map((t, i) => {
    const color = BAR_COLORS[i % BAR_COLORS.length];
    const barPct = Math.min(100, Math.max(1, Math.round(t.percent)));
    const restPct = 100 - barPct;
    return `<tr><td style="padding:2px 0;"><table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="130" valign="top" style="font-size:12px;color:#64748b;padding-right:6px;padding-top:1px;white-space:nowrap;overflow:hidden;">${t.label}</td>
      <td valign="middle" style="padding:3px 4px 0;"><table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="${barPct}%" height="4" bgcolor="${color}" style="background:${color};font-size:0;line-height:0;border-radius:2px;">&#8203;</td>
        ${restPct > 0 ? `<td width="${restPct}%" height="4" bgcolor="#f1f5f9" style="background:#f1f5f9;font-size:0;line-height:0;">&#8203;</td>` : ""}
      </tr></table></td>
      <td width="28" valign="top" style="font-size:12px;color:#64748b;padding-left:4px;text-align:right;padding-top:1px;">${t.hours}h</td>
    </tr></table></td></tr>`;
  }).join("");
  return `<tr><td style="padding:10px 16px;border-top:1px dashed #f1f5f9;">
  <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:5px;"><tr>
    <td style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;${estimated ? "font-style:italic;" : ""}">${label}</td>
    <td style="text-align:right;font-size:12px;font-weight:600;color:#64748b;">${totalStr} total</td>
  </tr></table>
  <table cellpadding="0" cellspacing="0" width="100%">${rows}</table>
</td></tr>`;
}

function emailPersonRow(p: PersonData, ctx: RenderContext): string {
  const href = reportHref(p.name, ctx);
  const viewLink = href ? `<a href="${href}" style="display:inline-block;background:#ede9fe;color:#5b21b6;border-radius:5px;padding:2px 8px;font-size:11px;font-weight:600;text-decoration:none;">View Submitted Report →</a>` : "";
  const statusBadge = p.status === "fresh"
    ? `<span style="display:inline-block;background:#dcfce7;color:#15803d;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">Today</span>`
    : p.status === "standin"
    ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">Stand-in · ${p.daysSinceReport}d</span>`
    : `<span style="display:inline-block;background:#fee2e2;color:#991b1b;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:600;">Missing</span>`;

  // Sales metrics — 3-per-row table grid
  let salesGrid = "";
  if (p.salesMetrics && p.salesMetrics.length > 0) {
    let rows = "";
    for (let i = 0; i < p.salesMetrics.length; i += 3) {
      const chunk = p.salesMetrics.slice(i, i + 3);
      rows += `<tr>${chunk.map(m => `<td style="width:33%;padding:4px;"><div style="background:#f8fafc;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:20px;font-weight:500;color:#0f172a;">${m.value}</div><div style="font-size:11px;color:#64748b;margin-top:2px;">${m.label}</div></div></td>`).join("")}</tr>`;
    }
    salesGrid = `<tr><td style="padding:0 0 12px;"><table cellpadding="0" cellspacing="0" width="100%">${rows}</table></td></tr>`;
  }

  const ontack = (p.highlights ?? []).filter(h => h.type === "ontack");
  const tomorrow = (p.highlights ?? []).filter(h => h.type === "tomorrowfocus");
  const blockers = (p.highlights ?? []).filter(h => h.type === "blocker");
  const others = (p.highlights ?? []).filter(h => !["ontack","tomorrowfocus","blocker"].includes(h.type));

  let ontackHtml = "";
  if (ontack.length > 0) {
    ontackHtml += `<tr><td style="padding:8px 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">In Progress</td></tr>`;
    let lastSub: string | undefined;
    for (const h of ontack) {
      if (h.subcategory && h.subcategory !== lastSub) {
        ontackHtml += `<tr><td style="padding:6px 0 3px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #f1f5f9;">${h.subcategory}</td></tr>`;
        lastSub = h.subcategory;
      }
      ontackHtml += emailTaskRow(h);
    }
  }

  let blockersHtml = "";
  if (blockers.length > 0) {
    blockersHtml = `<tr><td style="padding:8px 0 4px;font-size:10px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.06em;">🚫 Blocked</td></tr>${blockers.map(h => emailTaskRow(h)).join("")}`;
  }

  let tomorrowHtml = "";
  if (tomorrow.length > 0) {
    tomorrowHtml = `<tr><td style="padding:8px 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">Tomorrow's Focus</td></tr>${tomorrow.map(h => emailTaskRow(h)).join("")}`;
  }

  let overflowHtml = "";
  if (p.overflowNote) {
    const txt = href
      ? p.overflowNote.replace(/view (full|submitted) report/i, `<a href="${href}" style="color:#6366f1;text-decoration:underline;">view full report</a>`)
      : p.overflowNote;
    overflowHtml = `<tr><td style="padding:4px 0;font-size:11px;color:#64748b;font-style:italic;">${txt}</td></tr>`;
  }

  const hasContent = ontack.length + tomorrow.length + blockers.length + others.length > 0 || (p.salesMetrics ?? []).length > 0;

  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <tr style="background:#f8fafc;">
    <td style="padding:12px 16px;${hasContent ? "border-bottom:1px solid #f1f5f9;" : ""}">
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td valign="top">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:40px;height:40px;border-radius:50%;background:${avatarBg(p.name)};text-align:center;vertical-align:middle;color:#fff;font-weight:600;font-size:16px;">${personInitial(p.name)}</td>
            <td style="padding-left:12px;vertical-align:middle;">
              <div style="font-size:15px;font-weight:500;color:#0f172a;">${p.name}</div>
              <div style="margin-top:3px;">
                ${p.hoursWorked != null ? `<span style="font-size:12px;color:#64748b;margin-right:8px;">${p.hoursWorked}h logged</span>` : ""}
                ${viewLink}
              </div>
            </td>
          </tr></table>
        </td>
        <td style="text-align:right;vertical-align:top;">${statusBadge}</td>
      </tr></table>
    </td>
  </tr>
  ${hasContent ? `<tr><td style="padding:10px 16px;">
    <table cellpadding="0" cellspacing="0" width="100%">
      ${salesGrid}${ontackHtml}${others.map(h => emailTaskRow(h)).join("")}${blockersHtml}${tomorrowHtml}${overflowHtml}
    </table>
  </td></tr>` : ""}
  ${emailTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated)}
  ${href && (p.highlights ?? []).length > 5 ? `<tr><td style="padding:10px 16px;border-top:1px dashed #f1f5f9;"><a href="${href}" style="color:#7c3aed;font-size:12px;text-decoration:none;">View Submitted Report →</a></td></tr>` : ""}
</table>`;
}

function emailDeptSection(dept: DepartmentData, ctx: RenderContext): string {
  if (dept.notExpectedToday) {
    return `<div style="font-size:13px;color:#94a3b8;margin-bottom:10px;padding:4px 0;">${dept.emoji} <span style="color:#475569;">${dept.name}</span> — ${dept.scheduleLabel ?? "not reporting today"}</div>`;
  }
  const statusColor = dept.statusOk ? "#22c55e" : "#f59e0b";
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
  <tr><td style="background:#0f172a;border-radius:8px 8px 0 0;padding:10px 16px;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="font-size:14px;font-weight:500;color:#e2e8f0;">${dept.emoji} ${dept.name}</td>
      <td style="text-align:right;font-size:11px;font-weight:600;color:${statusColor};">${dept.statusLabel}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:10px 0;">
    ${(dept.people ?? []).map(p => emailPersonRow(p, ctx)).join("")}
  </td></tr>
</table>`;
}

export function renderEmailHtml(data: AiSummaryData, ctx: RenderContext): string {
  const { orgName, summaryDate, pdfUrl } = ctx;
  const formattedDate = summaryDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const pdfCta = pdfUrl ? `<tr><td style="text-align:center;padding:20px 0 8px;"><a href="${pdfUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 26px;border-radius:8px;">View &amp; Download Full PDF Report</a></td></tr>` : "";
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Executive Summary — ${orgName}</title>
</head>
<body data-theme="dark" style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1e293b;">
<table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;">
<tr><td style="padding:24px 16px;">
<table cellpadding="0" cellspacing="0" width="620" align="center" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:100%;">
  <tr><td style="background:#0f172a;padding:20px 28px 16px;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td valign="top"><div style="font-size:18px;font-weight:700;color:#fff;">${orgName}</div><div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;text-transform:uppercase;letter-spacing:0.08em;">Executive Summary</div></td>
      <td style="text-align:right;vertical-align:top;"><div style="font-size:12px;color:rgba(255,255,255,0.6);">${formattedDate}</div></td>
    </tr></table>
  </td></tr>
  ${emailPulse(data)}
  ${emailNeedsAttention(data)}
  ${emailNotableProgress(data)}
  <tr><td style="padding:20px 24px 16px;">
    ${(data.departments ?? []).map(d => emailDeptSection(d, ctx)).join("")}
    <table cellpadding="0" cellspacing="0" width="100%">${pdfCta}</table>
  </td></tr>
  <tr><td style="padding:14px 24px;border-top:1px solid #e2e8f0;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="font-size:10px;color:#94a3b8;">${orgName} · Confidential</td>
      <td style="text-align:right;font-size:10px;color:#94a3b8;">Sent by OrgRise AI</td>
    </tr></table>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
