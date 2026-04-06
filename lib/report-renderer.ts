// lib/report-renderer.ts
// Default: dark mode. Pass ctx.theme = 'light' for light mode.

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HighlightItem {
  type: "ontack" | "tomorrowfocus" | "atrisk" | "blocker" | "completed" | "standout" | "critical";
  text: string;
  subcategory?: string;
  taskEmoji?: string;
}

export interface SalesMetric { label: string; value: number | string }

export interface PipelineSnapshot {
  new_leads_today?: number | null;
  leads_contacted?: number | null;
  hot_responsive?: number | null;
  qualified?: number | null;
  hot_but_cold?: number | null;
  proposals_sent?: number | null;
}

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
  pipeline_snapshot?: PipelineSnapshot | null;
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
  theme?: "dark" | "light";
  reportLinks?: Record<string, { parsedReportId: string; date: string; isStandIn: boolean; fileUrl?: string | null }>;
}

// ── Palettes ───────────────────────────────────────────────────────────────────

interface Palette {
  pageBodyBg: string; pageBg: string; navy: string;
  bgPrimary: string; bgSecondary: string; bgPct: string;
  bgSuccess: string; bgWarning: string; bgDanger: string; bgProgress: string;
  borderTertiary: string; borderSuccess: string; borderProgress: string;
  textPrimary: string; textSecondary: string; textTertiary: string;
  textInfo: string; textSuccess: string; textWarning: string; textDanger: string;
  textProgress: string; textProgressLabel: string;
  textDue: string; textDueOd: string; textDueUrgent: string;
  radiusLg: string; radiusMd: string;
  bullet: string; bar1: string; bar2: string; bar3: string; bar4: string; bar5: string;
}

const C_DARK: Palette = {
  pageBodyBg:        "#0f172a",
  pageBg:            "#0f172a",
  navy:              "#1e293b",
  bgPrimary:         "#1e293b",
  bgSecondary:       "#0f172a",
  bgPct:             "#334155",
  bgSuccess:         "#14532d",
  bgWarning:         "#78350f",
  bgDanger:          "#7f1d1d",
  bgProgress:        "#0d2818",
  borderTertiary:    "rgba(255,255,255,0.08)",
  borderSuccess:     "#166534",
  borderProgress:    "#166534",
  textPrimary:       "#f1f5f9",
  textSecondary:     "#94a3b8",
  textTertiary:      "#64748b",
  textInfo:          "#818cf8",
  textSuccess:       "#86efac",
  textWarning:       "#fcd34d",
  textDanger:        "#fca5a5",
  textProgress:      "#d1fae5",
  textProgressLabel: "#4ade80",
  textDue:           "#64748b",
  textDueOd:         "#ef4444",
  textDueUrgent:     "#f59e0b",
  radiusLg:          "12px",
  radiusMd:          "8px",
  bullet: "#378ADD", bar1: "#378ADD", bar2: "#1D9E75", bar3: "#EF9F27", bar4: "#7F77DD", bar5: "#888780",
};

const C_LIGHT: Palette = {
  pageBodyBg:        "#f1f5f9",
  pageBg:            "#ffffff",
  navy:              "#0f172a",
  bgPrimary:         "#ffffff",
  bgSecondary:       "#f8fafc",
  bgPct:             "#f8fafc",
  bgSuccess:         "#dcfce7",
  bgWarning:         "#fef3c7",
  bgDanger:          "#fee2e2",
  bgProgress:        "#ffffff",
  borderTertiary:    "#e2e8f0",
  borderSuccess:     "#bbf7d0",
  borderProgress:    "#e2e8f0",
  textPrimary:       "#0f172a",
  textSecondary:     "#64748b",
  textTertiary:      "#94a3b8",
  textInfo:          "#6366f1",
  textSuccess:       "#15803d",
  textWarning:       "#92400e",
  textDanger:        "#991b1b",
  textProgress:      "#0f172a",
  textProgressLabel: "#15803d",
  textDue:           "#9ca3af",
  textDueOd:         "#ef4444",
  textDueUrgent:     "#f59e0b",
  radiusLg:          "12px",
  radiusMd:          "8px",
  bullet: "#378ADD", bar1: "#378ADD", bar2: "#1D9E75", bar3: "#EF9F27", bar4: "#7F77DD", bar5: "#888780",
};

function pal(ctx: RenderContext): Palette {
  return (ctx.theme ?? "dark") === "light" ? C_LIGHT : C_DARK;
}

const BAR_COLORS = ["#378ADD", "#1D9E75", "#EF9F27", "#7F77DD", "#888780", "#ec4899"];

// ── Helpers ────────────────────────────────────────────────────────────────────

export function parseAiSummary(text: string): AiSummaryData | null {
  let cleaned = text
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!cleaned.startsWith("{")) {
    const idx = cleaned.indexOf("{");
    if (idx === -1) return null;
    cleaned = cleaned.slice(idx);
  }
  const last = cleaned.lastIndexOf("}");
  if (last !== -1) cleaned = cleaned.slice(0, last + 1);
  try { return JSON.parse(cleaned) as AiSummaryData; } catch { return null; }
}

function stripCheckmark(t: string): string { return t.replace(/✅\s*/g, "").trim(); }

function mdToISO(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const p = raw.split("/");
  if (p.length < 2) return raw;
  const mo = parseInt(p[0], 10), dy = parseInt(p[1], 10);
  let yr = p[2] ? parseInt(p[2], 10) : new Date().getFullYear();
  if (yr < 100) yr += 2000;
  return `${yr}-${String(mo).padStart(2,"0")}-${String(dy).padStart(2,"0")}`;
}

const MONTH_NAMES: Record<string, number> = {
  jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
  jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
  january:1, february:2, march:3, april:4, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

function parseDateStr(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}\/\d{1,2}/.test(s)) return mdToISO(s);
  const m = s.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?$/i);
  if (m) {
    const mo = MONTH_NAMES[m[1].toLowerCase()];
    if (!mo) return null;
    const dy = parseInt(m[2], 10);
    const yr = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    return `${yr}-${String(mo).padStart(2,"0")}-${String(dy).padStart(2,"0")}`;
  }
  return null;
}

function fmtMD(iso: string, refDate?: Date): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [yr, m, d] = iso.split("-");
    const refYear = refDate ? refDate.getFullYear() : new Date().getFullYear();
    const isoYear = parseInt(yr, 10);
    if (isoYear !== refYear) {
      return `${parseInt(m)}/${parseInt(d)}/${String(isoYear).slice(-2)}`;
    }
    return `${parseInt(m)}/${parseInt(d)}`;
  }
  return iso;
}

function today(): string { return new Date().toISOString().split("T")[0]; }

function dueDateStatus(iso: string, refDate?: Date): "overdue" | "urgent" | "normal" {
  const t = refDate ? new Date(refDate) : new Date(today());
  t.setHours(0,0,0,0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.floor((d.getTime() - t.getTime()) / 86400000);
  if (diff <= 0) return "overdue";
  if (diff <= 7) return "urgent";
  return "normal";
}

function effectiveStatus(p: PersonData, ctx: RenderContext): "fresh" | "standin" | "missing" {
  if (p.status !== "standin") return p.status;
  const now = new Date(); now.setHours(0,0,0,0);
  const gen = new Date(ctx.summaryDate); gen.setHours(0,0,0,0);
  const daysSinceGen = Math.round((now.getTime() - gen.getTime()) / 86400000);
  if (p.daysSinceReport === 0 || p.daysSinceReport === daysSinceGen) return "fresh";
  return "standin";
}

function extractDuePct(raw: string): { clean: string; dueDate: string | null; pct: number | null } {
  let text = stripCheckmark(raw);
  let dueDate: string | null = null;
  let pct: number | null = null;

  // (N% complete, due DATE) — e.g. "(50% complete, due Apr 1)"
  const m1 = text.match(/\s*\(\s*(\d{1,3})%\s*(?:complete)?,?\s*due\s+([^)]+?)\s*\)/i);
  if (m1) {
    pct = parseInt(m1[1], 10);
    dueDate = parseDateStr(m1[2].trim());
    return { clean: text.replace(m1[0], "").replace(/\s+/g," ").trim(), dueDate, pct };
  }

  // (due DATE, N% complete) or (due DATE, N%)
  const m2 = text.match(/\s*\(\s*due\s+([^,)]+?),\s*(\d{1,3})%\s*(?:complete)?\s*\)/i);
  if (m2) {
    dueDate = parseDateStr(m2[1].trim());
    pct = parseInt(m2[2], 10);
    return { clean: text.replace(m2[0], "").replace(/\s+/g," ").trim(), dueDate, pct };
  }

  // (due DATE) — any date format in parens
  const m3 = text.match(/\s*\(\s*due\s+([^)]+?)\s*\)/i);
  if (m3) {
    const parsed = parseDateStr(m3[1].trim());
    if (parsed) { dueDate = parsed; text = text.replace(m3[0], ""); }
  }

  // (N% complete) or (N% done) without due date
  if (pct === null) {
    const m3b = text.match(/\s*\(\s*(\d{1,3})%\s*(?:complete|done|finished)?\s*\)/i);
    if (m3b) { pct = parseInt(m3b[1], 10); text = text.replace(m3b[0], ""); }
  }

  // · due YYYY-MM-DD or · due M/D
  if (!dueDate) {
    const m4 = text.match(/\s*[·•\-]\s*due\s+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
    if (m4) { dueDate = mdToISO(m4[1]); text = text.replace(m4[0], ""); }
  }

  // · N% or (N%)
  const m5 = text.match(/\s*[·•]\s*(\d{1,3})%(?!\d)/);
  if (m5) { pct = parseInt(m5[1], 10); text = text.replace(m5[0], ""); }
  else {
    const m6 = text.match(/\s*\((\d{1,3})%\)/);
    if (m6) { pct = parseInt(m6[1], 10); text = text.replace(m6[0], ""); }
  }

  return { clean: text.replace(/\s+/g," ").trim(), dueDate, pct };
}

function iconType(h: HighlightItem, refDate?: Date): "bullet" | "warn" | "block" {
  if (h.type === "blocker") return "block";
  if (h.type === "atrisk") return "warn";
  if (h.type === "ontack") {
    const { dueDate } = extractDuePct(h.text);
    if (dueDate && dueDateStatus(dueDate, refDate) === "overdue") return "warn";
  }
  return "bullet";
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

function totalHours(data: AiSummaryData): number {
  return Math.round(
    (data.departments ?? []).flatMap(d => d.people ?? []).reduce((s, p) => s + (p.hoursWorked ?? 0), 0)
  );
}

function groupAttention(items: NeedsAttentionItem[]): Map<string, NeedsAttentionItem[]> {
  const map = new Map<string, NeedsAttentionItem[]>();
  for (const item of items) {
    const dept = item.department ?? "General";
    if (!map.has(dept)) map.set(dept, []);
    map.get(dept)!.push(item);
  }
  return map;
}

// ── PDF CSS (theme-aware) ──────────────────────────────────────────────────────

function buildPdfCss(c: Palette): string {
  return `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --color-background-primary:${c.bgPrimary};
  --color-background-secondary:${c.bgSecondary};
  --color-background-success:${c.bgSuccess};
  --color-background-warning:${c.bgWarning};
  --color-background-danger:${c.bgDanger};
  --color-border-tertiary:${c.borderTertiary};
  --color-border-success:${c.borderSuccess};
  --color-text-primary:${c.textPrimary};
  --color-text-secondary:${c.textSecondary};
  --color-text-tertiary:${c.textTertiary};
  --color-text-info:${c.textInfo};
  --color-text-success:${c.textSuccess};
  --color-text-warning:${c.textWarning};
  --color-text-danger:${c.textDanger};
  --border-radius-lg:${c.radiusLg};
  --border-radius-md:${c.radiusMd};
  --font-sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
}
body{font-family:var(--font-sans);background:${c.pageBodyBg};color:${c.textPrimary};}
.page{max-width:880px;margin:0 auto;background:${c.pageBg};padding:2rem 2.5rem 3rem;}
.r{padding:1.5rem 0;max-width:880px;font-family:var(--font-sans)}
.pulse{background:${c.navy};border:.5px solid ${c.borderTertiary};border-radius:var(--border-radius-lg);padding:1.5rem;margin-bottom:1.5rem}
.pulse-label{font-size:11px;font-weight:500;color:#f59e0b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.625rem}
.pulse-inner{background:${c.bgSecondary};border-left:4px solid #3b82f6;border-radius:8px;padding:16px;margin-bottom:1rem}
.pulse-headline{font-size:16px;font-weight:500;color:#f1f5f9;line-height:1.6}
.pulse-pills{display:flex;flex-wrap:wrap;gap:8px}
.pill{font-size:12px;padding:4px 12px;border-radius:20px;font-weight:500}
.pill-ok{background:#14532d;color:#86efac}
.pill-warn{background:#78350f;color:#fcd34d}
.pill-neutral{background:${c.bgSecondary};color:${c.textSecondary};border:.5px solid ${c.borderTertiary}}
.sec-label{font-size:11px;font-weight:500;color:${c.textTertiary};text-transform:uppercase;letter-spacing:.08em;margin:1.5rem 0 .75rem}
.card{background:var(--color-background-primary);border:.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:1rem 1.25rem;margin-bottom:.75rem}
.attn-card{background:${c.navy};border:.5px solid ${c.borderTertiary};border-radius:${c.radiusLg};padding:4px 16px;margin-bottom:1.25rem}
.dept-label{font-size:10px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.08em;margin:.75rem 0 .35rem}
.dept-label:first-child{margin-top:0}
.attn-row{display:flex;gap:10px;align-items:flex-start;padding:12px 0;border-bottom:.5px solid rgba(255,255,255,0.06)}
.attn-row:last-child{border-bottom:none}
.attn-icon{font-size:15px;flex-shrink:0;margin-top:2px}
.attn-body{flex:1}
.attn-title{font-size:13px;font-weight:500;color:${c.textPrimary};line-height:1.5;margin-bottom:3px}
.attn-meta{font-size:11px;color:${c.textTertiary}}
.waiting-section{padding:8px 0 4px}
.waiting-label{font-size:10px;font-weight:500;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
.waiting-item{font-size:12px;color:${c.textTertiary};padding:2px 0}
.waiting-name{color:${c.textInfo}}
.notable-card{background:${c.bgProgress};border:.5px solid ${c.borderProgress};border-radius:${c.radiusLg};padding:1rem 1.25rem;margin-bottom:.75rem}
.notable-label{font-size:11px;font-weight:500;color:${c.textProgressLabel};text-transform:uppercase;letter-spacing:.08em;margin-bottom:.75rem}
.notable-dept{font-size:10px;font-weight:500;color:${c.textProgressLabel};text-transform:uppercase;letter-spacing:.06em;margin:.75rem 0 .3rem;border-bottom:.5px solid ${c.borderProgress};padding-bottom:4px}
.notable-dept:first-of-type{margin-top:0}
.notable-item{display:flex;gap:8px;font-size:13px;color:${c.textProgress};line-height:1.5;padding:2px 0}
.check{color:${c.textProgressLabel};flex-shrink:0}
.notable-more{font-size:12px;color:${c.textSecondary};font-style:italic;margin-top:8px}
.overdue-badge{display:inline-block;font-size:10px;font-weight:500;background:var(--color-background-danger);color:var(--color-text-danger);padding:2px 8px;border-radius:4px;margin-right:8px}
.urgent-badge{display:inline-block;font-size:10px;font-weight:500;background:var(--color-background-warning);color:var(--color-text-warning);padding:2px 8px;border-radius:4px;margin-right:8px}
.blocked-badge{display:inline-block;font-size:10px;font-weight:500;background:var(--color-background-danger);color:var(--color-text-danger);padding:2px 8px;border-radius:4px;margin-right:8px}
.person-card{background:${c.bgPrimary};border:.5px solid ${c.borderTertiary};border-radius:${c.radiusLg};margin-bottom:12px}
.person-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:.5px solid rgba(255,255,255,0.06);flex-wrap:wrap;gap:8px}
.person-left{display:flex;align-items:center;gap:12px}
.avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;flex-shrink:0}
.person-name{font-size:15px;font-weight:500;color:${c.textPrimary}}
.person-sub{font-size:12px;color:${c.textTertiary};margin-top:2px}
.view-link{color:${c.textInfo};font-size:12px;text-decoration:none;margin-left:8px}
.tag-fresh{background:${c.bgSuccess};color:${c.textSuccess};font-size:11px;font-weight:500;border-radius:20px;padding:3px 10px;white-space:nowrap}
.tag-standin{background:${c.bgWarning};color:${c.textWarning};font-size:11px;font-weight:500;border-radius:20px;padding:3px 10px;white-space:nowrap}
.tag-missing{background:${c.bgDanger};color:${c.textDanger};font-size:11px;font-weight:500;border-radius:20px;padding:3px 10px;white-space:nowrap}
.person-body{padding:16px 20px}
.cat-label{font-size:10px;font-weight:500;color:${c.textTertiary};text-transform:uppercase;letter-spacing:.06em;margin:14px 0 5px}
.cat-label:first-child{margin-top:0}
.task{display:flex;gap:8px;align-items:flex-start;padding:4px 0}
.task-text{font-size:13px;color:#e2e8f0;line-height:1.5;flex:1}
.warn-icon{width:16px;height:16px;border-radius:4px;background:${c.bgWarning};border:1px solid #f59e0b;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px}
.block-icon{width:16px;height:16px;border-radius:4px;background:${c.bgDanger};border:1px solid #ef4444;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px}
.bullet{width:6px;height:6px;border-radius:50%;background:${c.bullet};flex-shrink:0;margin-top:6px}
.timebars{margin-top:16px;padding-top:14px;border-top:.5px solid rgba(255,255,255,0.06)}
.timebars-header{display:flex;justify-content:space-between;margin-bottom:10px}
.timebars-title{font-size:10px;font-weight:500;color:${c.textTertiary};text-transform:uppercase;letter-spacing:.06em}
.timebars-total{font-size:12px;color:${c.textTertiary}}
.timebars-note{font-size:11px;color:#475569;font-style:italic;margin-bottom:8px}
.tbar{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.tbar-label{font-size:12px;color:${c.textTertiary};width:130px;flex-shrink:0;line-height:1.3}
.tbar-track{flex:1;height:4px;background:${c.bgSecondary};border-radius:2px;overflow:hidden}
.tbar-fill{height:4px;border-radius:2px}
.tbar-h{font-size:12px;color:${c.textTertiary};white-space:nowrap}
.subcat{font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin:8px 0 3px}
.pct{background:${c.bgPct};color:${c.textSecondary};font-size:11px;border-radius:10px;padding:2px 6px;margin-left:6px;display:inline-block;white-space:nowrap}
.due{font-size:11px;color:${c.textDue};margin-left:6px;white-space:nowrap}
.due.od{color:${c.textDueOd};font-weight:500}
.due.urgent{color:${c.textDueUrgent};font-weight:500}
.tmrow-item{display:flex;gap:8px;font-size:13px;color:${c.textSecondary};padding:3px 0;line-height:1.5}
.dept-header-bar{display:flex;align-items:center;justify-content:space-between;background:${c.navy};border:.5px solid ${c.borderTertiary};border-radius:var(--border-radius-md);padding:.6rem 1rem;margin:1rem 0 .5rem}
.dept-header-bar-name{font-size:13px;font-weight:500;color:${c.textPrimary}}
.dept-header-bar-status{font-size:11px;color:${c.textSuccess};background:${c.bgSuccess};padding:2px 10px;border-radius:20px}
.pipeline-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1rem}
.ptile{background:${c.bgSecondary};border-radius:${c.radiusMd};padding:.6rem;text-align:center;border:.5px solid ${c.borderTertiary}}
.ptile-num{font-size:20px;font-weight:500;color:${c.textPrimary}}
.ptile-label{font-size:11px;color:${c.textSecondary};margin-top:2px}
.not-expected-bar{background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:.6rem 1rem;margin:.5rem 0;font-size:13px;color:var(--color-text-secondary)}
.placeholder{font-size:13px;color:#475569;padding:6px 0}
@media print{@page{margin:10mm 8mm;size:A4;}body{background:${c.pageBodyBg};-webkit-print-color-adjust:exact;print-color-adjust:exact;}.print-btn{display:none!important;}}
`.trim();
}

// ── Email styles (theme-aware inline styles) ───────────────────────────────────

// ISSUE 1: dual-render badge helper (MSO table + non-MSO span)
function emailBadgeDual(text: string, bg: string, fg: string): string {
  return `<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr><td style="background-color:${bg}; color:${fg}; font-size:10px; line-height:14px; mso-line-height-rule:exactly; font-weight:500; padding:3px 10px; font-family:Arial,Helvetica,sans-serif; white-space:nowrap;">${text}</td></tr></table><![endif]--><!--[if !mso]><!--><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr><td style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; font-weight:500; padding:3px 10px; border-radius:20px; -webkit-border-radius:20px; white-space:nowrap; background-color:${bg}; color:${fg}; font-family:Arial,Helvetica,sans-serif;">${text}</td></tr></table><!--<![endif]-->`;
}

function emailStatusBadgeDual(text: string, bg: string, fg: string): string {
  return `<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr><td style="background-color:${bg}; color:${fg}; font-size:10px; line-height:14px; mso-line-height-rule:exactly; font-weight:500; padding:3px 10px; font-family:Arial,Helvetica,sans-serif; white-space:nowrap;">${text}</td></tr></table><![endif]--><!--[if !mso]><!--><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr><td style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; font-weight:500; padding:3px 10px; border-radius:10px; -webkit-border-radius:10px; white-space:nowrap; background-color:${bg}; color:${fg}; font-family:Arial,Helvetica,sans-serif;">${text}</td></tr></table><!--<![endif]-->`;
}

function buildE(c: Palette) {
  return {
    // ISSUE 1 & 2: scorecard pills — colors only, MSO conditionals handled in emailPulse
    pillOkBg:     `#14532d`,
    pillOkBgRgba: `rgba(20,83,45,0.8)`,
    pillOkColor:  `#86efac`,
    pillNeutralBg:     `#1e293b`,
    pillNeutralBgRgba: `rgba(30,41,59,0.7)`,
    pillNeutralColor:  `#94a3b8`,
    pillWarnBg:   `#78350f`,
    pillWarnColor:`#fcd34d`,
    card:         `background:#1e293b;border:1px solid rgba(255,255,255,0.08);padding:16px 20px;margin-bottom:12px;`,
    deptLabel:    `font-size:10px;font-weight:500;color:${c.textTertiary};text-transform:uppercase;letter-spacing:.08em;font-family:Arial,Helvetica,sans-serif;mso-line-height-rule:exactly;`,
    secLabel:     `font-size:11px;font-weight:500;color:${c.textTertiary};text-transform:uppercase;letter-spacing:.08em;font-family:Arial,Helvetica,sans-serif;mso-line-height-rule:exactly;display:block;margin-bottom:10px;`,
    personName:   `font-size:15px;line-height:20px;mso-line-height-rule:exactly;font-weight:500;color:${c.textPrimary};font-family:Arial,Helvetica,sans-serif;`,
    personMeta:   `font-size:12px;line-height:16px;mso-line-height-rule:exactly;color:${c.textTertiary};font-family:Arial,Helvetica,sans-serif;margin-top:2px;`,
    catLabel:     `font-size:10px;line-height:14px;mso-line-height-rule:exactly;font-weight:500;color:${c.textTertiary};text-transform:uppercase;letter-spacing:.06em;font-family:Arial,Helvetica,sans-serif;display:block;margin:14px 0 5px;`,
    subcat:       `font-size:10px;line-height:14px;mso-line-height-rule:exactly;font-weight:500;color:#475569;text-transform:uppercase;letter-spacing:.05em;font-family:Arial,Helvetica,sans-serif;display:block;margin:8px 0 3px;`,
    taskFont:     `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;word-break:normal;word-wrap:break-word;mso-line-break-override:none;`,
    taskSecond:   `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:${c.textSecondary};font-family:Arial,Helvetica,sans-serif;word-break:normal;word-wrap:break-word;mso-line-break-override:none;`,
    warnIcon:     `width:16px;height:16px;background:${c.bgWarning};border:1px solid ${c.textDueUrgent};text-align:center;font-size:10px;line-height:16px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;`,
    blockIcon:    `width:16px;height:16px;background:${c.bgDanger};border:1px solid ${c.textDueOd};text-align:center;font-size:10px;line-height:16px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;`,
    // ISSUE 1: pct badge — dual-render handled inline, style kept for reference
    pct:          `display:inline-block;font-size:10px;line-height:14px;mso-line-height-rule:exactly;font-weight:500;padding:3px 10px;border-radius:10px;-webkit-border-radius:10px;white-space:nowrap;background:#334155;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;`,
    dueNormal:    `font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:${c.textDue};margin-left:4px;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;`,
    dueOd:        `font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:${c.textDueOd};margin-left:4px;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;`,
    dueUrgent:    `font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:${c.textDueUrgent};margin-left:4px;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;`,
    // ISSUE 1: tags using dual-render pattern inline — style kept for reference
    tagFresh:     `display:inline-block;font-size:10px;line-height:14px;mso-line-height-rule:exactly;font-weight:500;padding:3px 10px;border-radius:20px;-webkit-border-radius:20px;white-space:nowrap;background:#14532d;color:#86efac;font-family:Arial,Helvetica,sans-serif;`,
    tagStandin:   `display:inline-block;font-size:10px;line-height:14px;mso-line-height-rule:exactly;font-weight:500;padding:3px 10px;border-radius:20px;-webkit-border-radius:20px;white-space:nowrap;background:#78350f;color:#fcd34d;font-family:Arial,Helvetica,sans-serif;`,
    tagMissing:   `display:inline-block;font-size:10px;line-height:14px;mso-line-height-rule:exactly;font-weight:500;padding:3px 10px;border-radius:20px;-webkit-border-radius:20px;white-space:nowrap;background:#7f1d1d;color:#fca5a5;font-family:Arial,Helvetica,sans-serif;`,
    viewLink:     `font-size:12px;line-height:16px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;color:#818cf8;text-decoration:none;`,
    // ISSUE 1: overdue/urgent badges — dual-render handled inline
    overdueBadge: `display:inline-block;font-size:10px;line-height:14px;mso-line-height-rule:exactly;font-weight:500;padding:3px 8px;border-radius:10px;-webkit-border-radius:10px;white-space:nowrap;background:#7f1d1d;color:#fca5a5;font-family:Arial,Helvetica,sans-serif;`,
    urgentBadge:  `display:inline-block;font-size:10px;line-height:14px;mso-line-height-rule:exactly;font-weight:500;padding:3px 8px;border-radius:10px;-webkit-border-radius:10px;white-space:nowrap;background:#78350f;color:#fcd34d;font-family:Arial,Helvetica,sans-serif;`,
    // ISSUE 2: dept header bar uses #0f172a bg
    deptHeaderBar:`background:#0f172a;border:1px solid #1e293b;padding:10px 16px;`,
    deptBarName:  `font-size:13px;line-height:20px;mso-line-height-rule:exactly;font-weight:500;color:${c.textPrimary};font-family:Arial,Helvetica,sans-serif;`,
    // Section spacing and card styles
    sectionGap: `padding-top:24px;`,
    cardBorder: `border:1px solid rgba(255,255,255,0.08);`,
    personHeaderBg: `background-color:#172554;`,
    personHeaderBorder: `border:1px solid #3b82f6;`,
    deptBarAccent: `background-color:#3b82f6;`,
  };
}
type ES = ReturnType<typeof buildE>;

// ── PDF render helpers ─────────────────────────────────────────────────────────

function pdfAttnBadge(item: NeedsAttentionItem): string {
  if (item.status === "overdue") {
    const days = item.daysOverdue ? `${item.daysOverdue}d OVERDUE` : "OVERDUE";
    return `<span class="overdue-badge">${days}</span>`;
  }
  if (item.status === "blocked") return `<span class="blocked-badge">BLOCKED</span>`;
  if (item.status === "imminentlyDue" || item.status === "dueSoon") return `<span class="urgent-badge">DUE SOON</span>`;
  return "";
}

function pdfAttnIcon(item: NeedsAttentionItem): string {
  if (item.status === "blocked") return "🚫";
  return "🔥";
}

function pdfDueStr(item: NeedsAttentionItem, refDate?: Date): string {
  if (!item.dueDate) return "";
  const iso = mdToISO(item.dueDate);
  const fmt = fmtMD(iso, refDate);
  if (item.status === "overdue") return ` · was due ${fmt}`;
  return ` · due ${fmt}`;
}

function pdfTask(h: HighlightItem, refDate?: Date): string {
  const { clean, dueDate, pct } = extractDuePct(h.text);
  const icon = iconType(h, refDate);
  let iconHtml: string;
  if (icon === "warn")  iconHtml = `<div class="warn-icon">⚠</div>`;
  else if (icon === "block") iconHtml = `<div class="block-icon">🚫</div>`;
  else                  iconHtml = `<div class="bullet"></div>`;

  let dueHtml = "";
  if (dueDate) {
    const st = dueDateStatus(dueDate, refDate);
    const cls = st === "overdue" ? " od" : st === "urgent" ? " urgent" : "";
    const prefix = st === "overdue" ? "was due " : "due ";
    dueHtml = `<span class="due${cls}">· ${prefix}${fmtMD(dueDate, refDate)}</span>`;
  }
  const pctHtml = pct != null ? `<span class="pct">${pct}%</span>` : "";

  return `<div class="task">${iconHtml}<div class="task-text">${clean}${dueHtml}${pctHtml}</div></div>`;
}

function pdfTomorrowItem(h: HighlightItem): string {
  const { clean } = extractDuePct(h.text);
  return `<div class="tmrow-item"><span>📅</span>${clean}</div>`;
}

function pdfTimeBars(alloc: TimeAllocationItem[], estimated: boolean | undefined, hoursWorked: number | null | undefined): string {
  if (!alloc || alloc.length === 0) return "";
  const totalH = alloc.reduce((s, t) => s + (t.hours ?? 0), 0);
  const totalStr = estimated ? `~${Number.isInteger(totalH) ? totalH : totalH.toFixed(0)}h est.` : `${hoursWorked != null ? hoursWorked : (Number.isInteger(totalH) ? totalH : totalH.toFixed(1))}h total`;
  const titleLabel = estimated ? `Time Allocation · Estimated` : `Time Allocation`;
  const rows = alloc.map((t, i) => {
    const barPct = Math.min(100, Math.max(1, Math.round(t.percent)));
    const color = BAR_COLORS[i % BAR_COLORS.length];
    const hrs = estimated ? `~${t.hours}h` : `${t.hours}h`;
    return `<div class="tbar"><div class="tbar-label">${t.label}</div><div class="tbar-track"><div class="tbar-fill" style="width:${barPct}%;background:${color}"></div></div><span class="tbar-h">${hrs}</span></div>`;
  }).join("");
  const note = estimated ? `<div class="timebars-note">Hours not logged — estimated from reported activities</div>` : "";
  return `<div class="timebars">
  <div class="timebars-header">
    <span class="timebars-title">${titleLabel}</span>
    <span class="timebars-total">${totalStr}</span>
  </div>
  ${note}${rows}
</div>`;
}

function pdfPipelineGrid(snap: PipelineSnapshot): string {
  const tiles = [
    { label: "New Today",       value: snap.new_leads_today, warn: false },
    { label: "Contacted",       value: snap.leads_contacted, warn: false },
    { label: "Hot",             value: snap.hot_responsive,  warn: false },
    { label: "Qualified",       value: snap.qualified,       warn: false },
    { label: "Hot but Cold",    value: snap.hot_but_cold,    warn: true  },
    { label: "Proposals",       value: snap.proposals_sent,  warn: false },
  ];
  const cells = tiles.map(t => {
    const numStyle = t.warn ? ` style="color:#f59e0b;"` : "";
    return `<div class="ptile"><div class="ptile-num"${numStyle}>${t.value ?? 0}</div><div class="ptile-label">${t.label}</div></div>`;
  }).join("");
  return `<div class="pipeline-grid">${cells}</div>`;
}

function avatarInitials(name: string): string {
  // Extract nickname from parentheses if present: "Isabella (Bella) Zacarias" → use Bella
  const nicknameMatch = name.match(/\(([^)]+)\)/);
  const nickname = nicknameMatch ? nicknameMatch[1] : null;
  // Filter out parenthesized parts
  const parts = name.split(/\s+/).filter(p => p.length > 0 && !p.startsWith("(") && !p.startsWith(")"));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  // If there's a nickname, use nickname[0] + last-part[0]
  if (nickname) {
    return (nickname[0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Use first letter of first two words
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#1e3a5f", color: "#93c5fd" },  // blue   — person 1 (e.g. Alan)
  { bg: "#2e1065", color: "#c4b5fd" },  // purple — person 2 (e.g. Antonio)
  { bg: "#4a1040", color: "#f9a8d4" },  // pink   — person 3 (e.g. Bella)
  { bg: "#064e3b", color: "#6ee7b7" },  // green  — person 4 (e.g. Arturo)
  { bg: "#1c1917", color: "#d6d3d1" },
];

function avatarStyle(name: string, idx: number): { bg: string; color: string } {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

function pdfPersonCard(p: PersonData, ctx: RenderContext, c: Palette, personIdx: number = 0): string {
  const href = reportHref(p.name, ctx);
  const viewLinkHtml = href ? `<a class="view-link" href="${href}">View Submitted Report →</a>` : "";
  const hoursStr = p.hoursWorked != null ? `${p.hoursWorked}h logged` : "Hours not logged";
  const effStatus = effectiveStatus(p, ctx);
  let tag: string;
  if (effStatus === "standin") tag = `<span class="tag-standin">Stand-in · ${p.daysSinceReport}d ago</span>`;
  else if (effStatus === "missing") tag = `<span class="tag-missing">Missing</span>`;
  else tag = `<span class="tag-fresh">✓ Today</span>`;

  const initials = avatarInitials(p.name);
  const av = avatarStyle(p.name, personIdx);
  const avatarHtml = `<div class="avatar" style="background:${av.bg};color:${av.color}">${initials}</div>`;

  console.log(`[Report] ${p.name}: pipeline_snapshot=${JSON.stringify(p.pipeline_snapshot ?? null).slice(0, 100)}`);

  let pipelineHtml = "";
  if (p.pipeline_snapshot) {
    pipelineHtml = pdfPipelineGrid(p.pipeline_snapshot);
  } else if (p.salesMetrics && p.salesMetrics.length > 0) {
    const cells = p.salesMetrics.map(m =>
      `<div class="ptile"><div class="ptile-num">${m.value}</div><div class="ptile-label">${m.label}</div></div>`
    ).join("");
    pipelineHtml = `<div class="pipeline-grid">${cells}</div>`;
  }

  const refDate = ctx.summaryDate;
  const ontack    = (p.highlights ?? []).filter(h => h.type === "ontack" || h.type === "atrisk");
  const blockers  = (p.highlights ?? []).filter(h => h.type === "blocker");
  const tomorrow  = (p.highlights ?? []).filter(h => h.type === "tomorrowfocus");

  // Determine cat-label prefix based on whether pipeline is shown
  const inProgressLabel = pipelineHtml ? "In Progress" : (ontack.some(h => h.subcategory) ? "In Progress — Active Projects" : "In Progress");

  let ontackHtml = "";
  if (ontack.length > 0) {
    ontackHtml += `<div class="cat-label">${inProgressLabel}</div>`;
    let lastSub: string | undefined;
    for (const h of ontack) {
      if (h.subcategory && h.subcategory !== lastSub) {
        ontackHtml += `<div class="subcat">${h.subcategory}</div>`;
        lastSub = h.subcategory;
      }
      ontackHtml += pdfTask(h, refDate);
    }
  }

  let blockersHtml = "";
  if (blockers.length > 0) {
    blockersHtml = `<div class="cat-label">Blocked</div>` + blockers.map(h => pdfTask(h, refDate)).join("");
  }

  let tomorrowHtml = "";
  if (tomorrow.length > 0) {
    tomorrowHtml = `<div class="cat-label">Tomorrow's Focus</div>` + tomorrow.map(h => pdfTomorrowItem(h)).join("");
  }

  const overflowHtml = p.overflowNote
    ? `<div style="font-size:12px;color:#475569;font-style:italic;margin-top:8px">${p.overflowNote}</div>` : "";

  const timeBarsHtml = pdfTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated, p.hoursWorked);

  const metaViewLink = viewLinkHtml ? ` · ${viewLinkHtml}` : "";

  return `<div class="person-card">
  <div class="person-header">
    <div class="person-left">
      ${avatarHtml}
      <div>
        <div class="person-name">${p.name}</div>
        <div class="person-sub">${hoursStr}${metaViewLink}</div>
      </div>
    </div>
    ${tag}
  </div>
  <div class="person-body">
    ${pipelineHtml}${ontackHtml}${blockersHtml}${tomorrowHtml}${overflowHtml}${timeBarsHtml}
    ${viewLinkHtml ? `<div style="margin-top:12px;text-align:right;">${viewLinkHtml}</div>` : ""}
  </div>
</div>`;
}

function pdfDeptSection(dept: DepartmentData, ctx: RenderContext, c: Palette, startIdx: number = 0): string {
  if (dept.notExpectedToday) return "";
  return `<div class="dept-header-bar">
  <span class="dept-header-bar-name">${dept.emoji} ${dept.name}</span>
  <span class="dept-header-bar-status">${dept.statusOk ? "All reported" : dept.statusLabel}</span>
</div>
${(dept.people ?? []).map((p, i) => pdfPersonCard(p, ctx, c, startIdx + i)).join("")}`;
}

function pdfNeedsAttention(data: AiSummaryData, c: Palette, ctx: RenderContext): string {
  const refDate = ctx.summaryDate;
  const items = (data.needsAttentionNow ?? []).slice().sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
  const waiting = data.waitingOnExternal ?? [];
  if (items.length === 0 && waiting.length === 0) {
    return `<div class="sec-label">🔥 Needs Attention Now</div>
<div class="attn-card"><div style="font-size:13px;color:${c.textSuccess};padding:12px 0">🟢 No overdue, blocked, or imminently due items today.</div></div>`;
  }

  let rows = "";
  for (const item of items) {
    const badge = pdfAttnBadge(item);
    const icon = pdfAttnIcon(item);
    const dueStr = pdfDueStr(item, refDate);
    const pctStr = item.pctComplete != null ? ` · ${item.pctComplete}%` : "";
    const metaParts = [dueStr ? dueStr.replace(/^ · /, "") : null, pctStr ? pctStr.replace(/^ · /, "") : null, item.who, item.department].filter(Boolean);
    const meta = metaParts.join(" · ");
    rows += `<div class="attn-row">
  <div class="attn-icon">${icon}</div>
  <div class="attn-body">
    <div class="attn-title">${badge}${item.text}</div>
    ${meta ? `<div class="attn-meta">${meta}</div>` : ""}
  </div>
</div>`;
  }

  if (waiting.length > 0) {
    let waitingItems = "";
    for (const w of waiting) {
      // Bold the name part if it appears in text
      const highlighted = w.text.replace(/\b(Scott and Kellie|Creative Team|Laura Kessler and Imani Allen|[A-Z][a-z]+ [A-Z][a-z]+)\b/g, '<span class="waiting-name">$1</span>');
      waitingItems += `<div class="waiting-item">· ${highlighted} (${w.who})</div>`;
    }
    rows += `<div class="waiting-section">
  <div class="waiting-label">⏳ Waiting on External</div>
  ${waitingItems}
</div>`;
  }

  return `<div class="sec-label">🔥 Needs Attention Now</div><div class="attn-card">${rows}</div>`;
}

function pdfNotableProgress(data: AiSummaryData): string {
  const groups = normalizeProgress(data.notableProgress);
  if (groups.length === 0) return "";
  let rows = "";
  let firstDept = true;
  for (const g of groups) {
    if (g.department) {
      rows += `<div class="notable-dept${firstDept ? "" : ""}">${g.department}</div>`;
      firstDept = false;
    }
    for (const item of (g.items ?? [])) {
      rows += `<div class="notable-item"><span class="check">✓</span>${stripCheckmark(item)}</div>`;
    }
    if (g.overflowNote) rows += `<div class="notable-more">${g.overflowNote}</div>`;
  }
  return `<div class="notable-card"><div class="notable-label">🏆 Notable Progress</div>${rows}</div>`;
}

function pdfPulse(data: AiSummaryData, ctx: RenderContext): string {
  const cs = data.completenessScore;
  const fresh = cs?.freshToday ?? 0;
  const pct = cs?.percentage ?? 0;
  const missing = (cs?.missing ?? []).length;
  const hrs = totalHours(data);
  const dateLabel = ctx.summaryDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const pills = [
    `<span class="pill pill-ok">✓ ${fresh} submitted</span>`,
    missing > 0
      ? `<span class="pill pill-warn">${missing} missing</span>`
      : `<span class="pill pill-ok">✓ All in</span>`,
    pct > 0 ? `<span class="pill pill-ok">📊 ${pct}% rate</span>` : "",
    hrs > 0 ? `<span class="pill pill-neutral">⏱ ~${hrs}h logged</span>` : "",
  ].filter(Boolean).join("");

  return `<div class="pulse">
  <div class="pulse-label">⚡ Today's Pulse · ${dateLabel}</div>
  <div class="pulse-inner">
    <div class="pulse-headline">${data.todaysPulse ?? ""}</div>
  </div>
  <div class="pulse-pills">${pills}</div>
</div>`;
}

export function renderPdfHtml(data: AiSummaryData, ctx: RenderContext): string {
  const c = pal(ctx);
  const { orgName, summaryDate, createdAt } = ctx;
  const formattedDate = summaryDate.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const generatedAt = createdAt.toLocaleString("en-US", { month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit" });

  const notExpected = (data.departments ?? []).filter(d => d.notExpectedToday);
  const notExpectedBar = notExpected.length > 0
    ? `<div style="margin-top:16px;">${notExpected.map(d => `<div class="placeholder">${d.emoji} ${d.name} — ${d.scheduleLabel ?? "not reporting today"}</div>`).join("")}</div>` : "";

  let personGlobalIdx = 0;
  const deptSections = (data.departments ?? [])
    .filter(d => !d.notExpectedToday)
    .map(d => {
      const html = pdfDeptSection(d, ctx, c, personGlobalIdx);
      personGlobalIdx += (d.people ?? []).length;
      return html;
    }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${orgName} — Executive Summary — ${formattedDate}</title>
<style>${buildPdfCss(c)}</style>
</head>
<body>
<button class="print-btn" onclick="window.print()" style="position:fixed;top:20px;right:20px;background:#4f46e5;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;z-index:100;">Save as PDF</button>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;padding-bottom:1.25rem;border-bottom:.5px solid ${c.borderTertiary}">
    <div>
      <div style="font-size:20px;font-weight:700;color:${c.textPrimary}">${orgName}</div>
      <div style="font-size:11px;color:${c.textTertiary};margin-top:3px;text-transform:uppercase;letter-spacing:.1em">Executive Summary</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:${c.textSecondary}">${formattedDate}</div>
      <div style="font-size:10px;color:${c.textTertiary};margin-top:3px">Generated ${generatedAt}</div>
    </div>
  </div>
  <div class="r">
    ${pdfPulse(data, ctx)}
    ${pdfNeedsAttention(data, c, ctx)}
    ${pdfNotableProgress(data)}
    ${deptSections}
    ${notExpectedBar}
    <div style="text-align:center;padding:24px 0 8px;border-top:0.5px solid rgba(255,255,255,0.06);margin-top:24px;">
      <span style="font-size:11px;color:#475569;">${orgName} · Confidential · Generated by OrgRise AI</span>
    </div>
  </div>
</div>
<script>setTimeout(()=>window.print(),400);</script>
</body>
</html>`;
}

// ── Email render helpers ───────────────────────────────────────────────────────

// ISSUE 1 & 11: MSO dual-render pill builder for scorecard — MSO table + non-MSO span
function emailPill(text: string, bgSolid: string, _bgRgba: string, color: string): string {
  return `<td style="padding-right:8px;padding-bottom:6px;white-space:nowrap;"><!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr><td style="background-color:${bgSolid}; color:${color}; font-size:11px; line-height:16px; mso-line-height-rule:exactly; font-weight:500; padding:4px 12px; font-family:Arial,Helvetica,sans-serif; white-space:nowrap;">${text}</td></tr></table><![endif]--><!--[if !mso]><!--><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr><td style="background-color:${bgSolid}; color:${color}; font-size:11px; line-height:16px; mso-line-height-rule:exactly; font-weight:500; padding:4px 12px; border-radius:20px; -webkit-border-radius:20px; font-family:Arial,Helvetica,sans-serif; white-space:nowrap;">${text}</td></tr></table><!--<![endif]--></td>`;
}

// ISSUE 1, 4E, 13: emailTask with bullet <div>, OVERDUE badge in separate <td>
function emailTask(h: HighlightItem, e: ES): string {
  const { clean, dueDate, pct } = extractDuePct(h.text);
  const icon = iconType(h);

  let dueHtml = "";
  if (dueDate) {
    const st = dueDateStatus(dueDate);
    const style = st === "overdue" ? e.dueOd : st === "urgent" ? e.dueUrgent : e.dueNormal;
    const prefix = st === "overdue" ? "was due " : "due ";
    dueHtml = ` <span style="${style}">· ${prefix}${fmtMD(dueDate)}</span>`;
  }
  // ISSUE 1: pct badge with MSO dual-render
  const pctHtml = pct != null ? ` ${emailStatusBadgeDual(`${pct}%`, "#334155", "#94a3b8")}` : "";

  if (icon === "warn" || icon === "block") {
    // ISSUE 1 & 4E: badge in separate <td>, using dual-render badge
    const badgeLabel = icon === "warn" ? "URGENT" : "BLOCKED";
    const badgeDual = icon === "warn"
      ? emailStatusBadgeDual(badgeLabel, "#78350f", "#fcd34d")
      : emailStatusBadgeDual(badgeLabel, "#7f1d1d", "#fca5a5");
    return `<tr><td style="padding:3px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
  <td style="padding-right:8px; vertical-align:top; white-space:nowrap;">
    ${badgeDual}
  </td>
  <td style="${e.taskFont} vertical-align:top;">${clean}${dueHtml}${pctHtml}</td>
</tr></table></td></tr>`;
  }

  // ISSUE 12: bullet as <div> with border-radius:50%
  return `<tr><td style="padding:3px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
  <td width="14" valign="top" style="padding-top:7px; padding-right:8px;">
    <div style="width:6px; height:6px; border-radius:50%; -webkit-border-radius:50%; background-color:#378ADD; font-size:1px; line-height:1px;">&nbsp;</div>
  </td>
  <td style="${e.taskFont} vertical-align:top;">${clean}${dueHtml}${pctHtml}</td>
</tr></table></td></tr>`;
}

function emailTomorrowItem(h: HighlightItem, e: ES): string {
  const { clean } = extractDuePct(h.text);
  return `<tr><td style="padding:3px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
  <td width="20" valign="top" style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; font-family:Arial,Helvetica,sans-serif;">📅</td>
  <td style="${e.taskSecond} vertical-align:top; padding-left:4px;">${clean}</td>
</tr></table></td></tr>`;
}

// ISSUE 4 & 8: emailTimeBars — hours col width=45, nowrap, rounded hours, empty track #1e293b
function emailTimeBars(alloc: TimeAllocationItem[], estimated: boolean | undefined, hoursWorked: number | null | undefined, c: Palette, e: ES): string {
  if (!alloc || alloc.length === 0) return "";
  const totalH = alloc.reduce((s, t) => s + (t.hours ?? 0), 0);
  const totalStr = Number.isInteger(totalH) ? `${totalH}h` : `${totalH.toFixed(1)}h`;
  const labelText = estimated
    ? `TIME ALLOCATION <em>(ESTIMATED)</em>`
    : `TIME ALLOCATION · ${hoursWorked != null ? hoursWorked + "h" : totalStr}`;
  const note = estimated
    ? `<tr><td style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:${c.textSecondary}; padding-bottom:6px; font-family:Arial,Helvetica,sans-serif; font-style:italic;"><em>Hours not logged — estimated from reported activities</em></td></tr>` : "";

  const rows = alloc.map((t, i) => {
    const color = BAR_COLORS[i % BAR_COLORS.length];
    const barPct = Math.min(100, Math.max(1, Math.round(t.percent)));
    const rest = 100 - barPct;
    // ISSUE 4: round hours to 1 decimal max
    const roundedHrs = Math.round(t.hours * 10) / 10;
    const hrs = estimated ? `~${roundedHrs}h` : `${roundedHrs}h`;
    // ISSUE 8: empty track uses #1e293b (not c.bgSecondary)
    return `<tr><td style="padding:2px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
  <td width="140" valign="top" style="font-size:12px; line-height:16px; mso-line-height-rule:exactly; color:${c.textSecondary}; padding-right:8px; padding-top:1px; white-space:nowrap; overflow:hidden; font-family:Arial,Helvetica,sans-serif;">${t.label}</td>
  <td valign="middle" style="padding:2px 4px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <!--[if mso]>
      <td width="${barPct}%" height="8" bgcolor="${color}" style="background-color:${color}; font-size:1px; line-height:1px;">&nbsp;</td>
      <![endif]-->
      <!--[if !mso]><!-->
      <td width="${barPct}%" height="8" bgcolor="${color}" style="background-color:${color}; font-size:1px; line-height:1px; border-radius:4px 0 0 4px; -webkit-border-radius:4px 0 0 4px;">&nbsp;</td>
      <!--<![endif]-->
      ${rest > 0 ? `<td width="${rest}%" height="8" bgcolor="#1e293b" style="background-color:#1e293b; font-size:1px; line-height:1px;">&nbsp;</td>` : ""}
    </tr></table>
  </td>
  <td width="50" valign="top" style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; font-family:Arial,Helvetica,sans-serif; color:#94a3b8; text-align:right; vertical-align:middle; padding-left:8px; white-space:nowrap;">${hrs}</td>
</tr></table></td></tr>`;
  }).join("");

  return `<tr><td style="padding-top:14px; border-top:1px solid #1e293b;">
  <div style="${e.catLabel} margin-bottom:6px;">${labelText}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${note}${rows}</table>
</td></tr>`;
}

function emailPipelineGrid(snap: PipelineSnapshot, c: Palette, e: ES): string {
  const tiles = [
    { label: "Hot Responsive",  value: snap.hot_responsive,  warn: false },
    { label: "Qualified",       value: snap.qualified,       warn: false },
    { label: "Hot but Cold",    value: snap.hot_but_cold,    warn: true  },
    { label: "New Today",       value: snap.new_leads_today, warn: false },
    { label: "Contacted",       value: snap.leads_contacted, warn: false },
    { label: "Proposals Sent",  value: snap.proposals_sent,  warn: false },
  ];
  let rows = "";
  for (let i = 0; i < tiles.length; i += 3) {
    const chunk = tiles.slice(i, i + 3);
    rows += `<tr>${chunk.map(t => {
      const numColor = t.warn ? c.textDueUrgent : c.textPrimary;
      return `<td width="33%" align="center" bgcolor="#0f172a" style="background-color:#0f172a; padding:12px 8px; border:1px solid rgba(255,255,255,0.06); font-family:Arial,Helvetica,sans-serif;">
  <div style="font-size:22px; line-height:28px; mso-line-height-rule:exactly; font-weight:600; color:${numColor}; font-family:Arial,Helvetica,sans-serif;">${t.value ?? 0}</div>
  <div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; font-family:Arial,Helvetica,sans-serif; margin-top:4px;">${t.label}</div>
</td>`;
    }).join("")}</tr>`;
  }
  return `<tr><td style="padding-bottom:16px;">
  <div style="${e.catLabel} margin-bottom:8px;">Pipeline snapshot</div>
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="4" border="0" width="100%">${rows}</table>
  <![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" cellpadding="0" cellspacing="4" border="0" width="100%" style="border-radius:8px; -webkit-border-radius:8px; overflow:hidden;">${rows}</table>
  <!--<![endif]-->
</td></tr>`;
}

function emailPersonCard(p: PersonData, ctx: RenderContext, c: Palette, e: ES, personIdx: number = 0): string {
  const href = reportHref(p.name, ctx);
  const hoursStr = p.hoursWorked != null ? `${p.hoursWorked}h logged` : "Hours not logged";

  const effStatus = effectiveStatus(p, ctx);
  let tag: string;
  if (effStatus === "standin") tag = emailBadgeDual(`Stand-in · ${p.daysSinceReport}d ago`, "#78350f", "#fcd34d");
  else if (effStatus === "missing") tag = emailBadgeDual("Missing", "#7f1d1d", "#fca5a5");
  else tag = emailBadgeDual("✓ Today", "#14532d", "#86efac");

  const initials = avatarInitials(p.name);
  const av = avatarStyle(p.name, personIdx);

  let pipelineHtml = "";
  if (p.pipeline_snapshot) {
    pipelineHtml = emailPipelineGrid(p.pipeline_snapshot, c, e);
  } else if (p.salesMetrics && p.salesMetrics.length > 0) {
    let smRows = "";
    for (let i = 0; i < p.salesMetrics.length; i += 3) {
      const chunk = p.salesMetrics.slice(i, i + 3);
      smRows += `<tr>${chunk.map(m => `<td width="33%" align="center" bgcolor="#0f172a" style="background-color:#0f172a; padding:10px 8px; border:1px solid rgba(255,255,255,0.06); font-family:Arial,Helvetica,sans-serif;">
  <div style="font-size:20px; line-height:28px; mso-line-height-rule:exactly; font-weight:600; color:${c.textPrimary}; font-family:Arial,Helvetica,sans-serif;">${m.value}</div>
  <div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; font-family:Arial,Helvetica,sans-serif;">${m.label}</div>
</td>`).join("")}</tr>`;
    }
    pipelineHtml = `<tr><td style="padding-bottom:12px;"><div style="${e.catLabel} margin-bottom:6px;">Pipeline snapshot</div><table role="presentation" cellpadding="0" cellspacing="4" border="0" width="100%">${smRows}</table></td></tr>`;
  }

  const ontack   = (p.highlights ?? []).filter(h => h.type === "ontack" || h.type === "atrisk");
  const blockers = (p.highlights ?? []).filter(h => h.type === "blocker");
  const tomorrow = (p.highlights ?? []).filter(h => h.type === "tomorrowfocus");

  let ontackHtml = "";
  if (ontack.length > 0) {
    ontackHtml = `<tr><td style="padding:10px 0 4px;"><div style="${e.catLabel}">In progress</div></td></tr>`;
    let lastSub: string | undefined;
    for (const h of ontack) {
      if (h.subcategory && h.subcategory !== lastSub) {
        ontackHtml += `<tr><td style="padding:6px 0 2px;"><div style="${e.subcat}">${h.subcategory}</div></td></tr>`;
        lastSub = h.subcategory;
      }
      ontackHtml += emailTask(h, e);
    }
  }

  let blockersHtml = "";
  if (blockers.length > 0) {
    blockersHtml = `<tr><td style="padding:10px 0 4px;"><div style="${e.catLabel}">Blocked</div></td></tr>` + blockers.map(h => emailTask(h, e)).join("");
  }

  let tomorrowHtml = "";
  if (tomorrow.length > 0) {
    tomorrowHtml = `<tr><td style="padding:10px 0 4px;"><div style="${e.catLabel}">Tomorrow's focus</div></td></tr>` + tomorrow.map(h => emailTomorrowItem(h, e)).join("");
  }

  const overflowHtml = p.overflowNote
    ? `<tr><td style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:${c.textSecondary}; padding-top:6px; font-family:Arial,Helvetica,sans-serif; font-style:italic;"><em>${p.overflowNote}</em></td></tr>` : "";

  const hasBody = pipelineHtml || ontackHtml || blockersHtml || tomorrowHtml || overflowHtml || (p.timeAllocation ?? []).length > 0;

  const viewLinkHtml = href ? `<a href="${href}" style="${e.viewLink}">View Submitted Report →</a>` : "";

  // Person card with consistent 16px margin-bottom, proper border treatment
  return `<!--[if mso]>
<table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#1e3a5f" width="100%" style="background-color:#1e293b; margin-bottom:16px; border-collapse:separate;">
<tr><td style="padding:0; background-color:#1e293b;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="padding:16px 20px; background-color:#172554; border-bottom:1px solid #3b82f6;">
<![endif]-->
<!--[if !mso]><!-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1e293b; border:1px solid rgba(255,255,255,0.08); border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:16px;">
<tr><td style="padding:16px 20px; background-color:#172554; border-bottom:1px solid #3b82f6; border-radius:12px 12px 0 0; -webkit-border-radius:12px 12px 0 0; font-family:Arial,Helvetica,sans-serif;">
<!--<![endif]-->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="44" valign="top" style="padding-right:12px; width:44px; vertical-align:top;">
          <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" height="40"><tr>
          <td align="center" valign="middle" width="40" height="40" bgcolor="${av.bg}" style="background-color:${av.bg}; color:${av.color}; font-size:14px; line-height:16px; mso-line-height-rule:exactly; font-weight:600; font-family:Arial,Helvetica,sans-serif; text-align:center; width:40px; height:40px;">${initials}</td>
          </tr></table><![endif]-->
          <!--[if !mso]><!-->
          <div style="width:40px; height:40px; border-radius:50%; -webkit-border-radius:50%; background-color:${av.bg}; color:${av.color}; font-size:14px; line-height:40px; mso-line-height-rule:exactly; font-weight:600; text-align:center; font-family:Arial,Helvetica,sans-serif;">${initials}</div>
          <!--<![endif]-->
        </td>
        <td style="vertical-align:middle; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">
          <div style="font-size:15px; line-height:20px; mso-line-height-rule:exactly; font-weight:600; color:#ffffff; font-family:Arial,Helvetica,sans-serif;">${p.name}</div>
          <div style="font-size:12px; line-height:16px; mso-line-height-rule:exactly; color:#93c5fd; font-family:Arial,Helvetica,sans-serif; margin-top:2px;">${hoursStr}${viewLinkHtml ? ` · ${viewLinkHtml}` : ""}</div>
        </td>
        <td style="text-align:right; vertical-align:top; white-space:nowrap; padding-left:12px;">${tag}</td>
      </tr></table>
    </td>
  </tr>
  ${hasBody ? `<tr><td style="padding:16px 20px; background-color:#1e293b; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${pipelineHtml}${ontackHtml}${blockersHtml}${tomorrowHtml}${overflowHtml}
      ${emailTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated, p.hoursWorked, c, e)}
    </table>
  </td></tr>` : ""}
<!--[if mso]>
  </table>
</td></tr>
</table>
<![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->`;
}

function emailDeptSection(dept: DepartmentData, ctx: RenderContext, c: Palette, e: ES, startIdx: number = 0): string {
  const statusPill = dept.statusOk
    ? emailStatusBadgeDual("all reported", "#14532d", "#86efac")
    : `<span style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:#f59e0b; font-family:Arial,Helvetica,sans-serif;">${dept.statusLabel}</span>`;

  // Department header bar with blue accent — increased margin for spacing
  const deptBar = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 12px;">
  <tr>
    <td width="4" bgcolor="#3b82f6" style="background-color:#3b82f6; font-size:0; line-height:0;">&nbsp;</td>
    <!--[if mso]>
    <td bgcolor="#172554" style="background-color:#172554; padding:12px 16px; border:1px solid #3b82f6; font-family:Arial,Helvetica,sans-serif;">
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="background-color:#172554; padding:12px 16px; border:1px solid #3b82f6; border-left:none; border-radius:0 8px 8px 0; -webkit-border-radius:0 8px 8px 0; font-family:Arial,Helvetica,sans-serif;">
    <!--<![endif]-->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:14px; line-height:20px; mso-line-height-rule:exactly; font-weight:600; color:#93c5fd; font-family:Arial,Helvetica,sans-serif; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${dept.emoji} ${dept.name}</td>
        <td style="text-align:right; white-space:nowrap; padding-left:12px;">${statusPill}</td>
      </tr></table>
    </td>
  </tr>
</table>`;

  // Person cards with 16px gap between each
  const personCards = (dept.people ?? []).map((p, i) => emailPersonCard(p, ctx, c, e, startIdx + i)).join("");

  return deptBar + personCards;
}

// ISSUE 1 & 2: emailNeedsAttention — dual-render badges, card bg #111827 border #1e293b
function emailNeedsAttention(data: AiSummaryData, c: Palette, e: ES): string {
  const items = (data.needsAttentionNow ?? []).slice().sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
  const waiting = data.waitingOnExternal ?? [];
  if (items.length === 0 && waiting.length === 0) {
    return `<tr><td style="padding:0 0 16px; font-family:Arial,Helvetica,sans-serif;">
  <div style="${e.secLabel}">🔥 Needs attention now</div>
  <div style="${e.card} font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:${c.textSuccess}; font-family:Arial,Helvetica,sans-serif;">🟢 No overdue, blocked, or imminently due items today.</div>
</td></tr>`;
  }
  const grouped = groupAttention(items);
  let rows = "";
  for (const [dept, deptItems] of Array.from(grouped.entries())) {
    rows += `<div style="${e.deptLabel} padding:8px 0 4px;">${dept}</div>`;
    for (const item of deptItems) {
      // ISSUE 1: dual-render badges for overdue/due soon
      const badgeDual = item.status === "overdue"
        ? emailStatusBadgeDual(`OVERDUE${item.daysOverdue ? ` ${item.daysOverdue}d` : ""}`, "#7f1d1d", "#fca5a5")
        : (item.status === "imminentlyDue" || item.status === "dueSoon")
        ? emailStatusBadgeDual("DUE SOON", "#78350f", "#fcd34d") : "";
      const icon = item.status === "blocked" ? "🚨" : "⚠️";
      const dueStr = item.dueDate ? (() => {
        const iso = mdToISO(item.dueDate!);
        const fmt = fmtMD(iso);
        return item.status === "overdue" ? ` · was due ${fmt}` : ` · due ${fmt}`;
      })() : "";
      rows += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px; border-bottom:1px solid #1e293b;"><tr>
  <td width="22" valign="top" style="font-size:14px; line-height:20px; mso-line-height-rule:exactly; font-family:Arial,Helvetica,sans-serif; padding:8px 6px 8px 0;">${icon}</td>
  ${badgeDual ? `<td style="padding:8px 8px 8px 0; vertical-align:top; white-space:nowrap;">${badgeDual}</td>` : ""}
  <td style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:${c.textPrimary}; font-family:Arial,Helvetica,sans-serif; padding:8px 0; vertical-align:top; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${item.text}${dueStr}</td>
</tr></table>`;
    }
  }
  if (waiting.length > 0) {
    rows += `<div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; font-weight:500; color:#475569; text-transform:uppercase; letter-spacing:.06em; font-family:Arial,Helvetica,sans-serif; padding:10px 0 6px; border-top:1px solid rgba(255,255,255,0.06); margin-top:6px;">⏳ Waiting on External</div>`;
    for (const w of waiting) {
      const highlighted = w.text.replace(/\b(Scott(?:\s+and\s+Kellie)?|Kellie|Creative Team|John|Nova|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, `<span style="color:#818cf8;">$1</span>`);
      rows += `<div style="font-size:12px; line-height:18px; mso-line-height-rule:exactly; color:#64748b; padding:2px 0; font-family:Arial,Helvetica,sans-serif;">· ${highlighted} <span style="color:#475569;">(${w.who})</span></div>`;
    }
  }
  return `<tr><td style="padding:0 0 20px; font-family:Arial,Helvetica,sans-serif;">
  <div style="${e.secLabel}">🔥 Needs attention now</div>
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#334155" width="100%" style="background-color:#1e293b; margin-bottom:12px;">
  <tr><td style="padding:12px 20px; background-color:#1e293b; font-family:Arial,Helvetica,sans-serif;">
  <![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1e293b; border:1px solid rgba(255,255,255,0.08); border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:12px;">
  <tr><td style="padding:12px 20px; font-family:Arial,Helvetica,sans-serif;">
  <!--<![endif]-->
  ${rows}
  </td></tr>
  </table>
</td></tr>`;
}

function emailNotableProgress(data: AiSummaryData, c: Palette): string {
  const groups = normalizeProgress(data.notableProgress);
  if (groups.length === 0) return "";
  let rows = "";
  let firstDept = true;
  for (const g of groups) {
    if (g.department) {
      const mt = firstDept ? "0" : "14px";
      rows += `<div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; font-weight:500; color:#4ade80; text-transform:uppercase; letter-spacing:.06em; font-family:Arial,Helvetica,sans-serif; margin:${mt} 0 6px; border-bottom:1px solid #166534; padding-bottom:4px;">${g.department}</div>`;
      firstDept = false;
    }
    for (const item of (g.items ?? [])) {
      rows += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:4px;"><tr>
  <td width="22" valign="top" style="font-size:14px; line-height:20px; mso-line-height-rule:exactly; font-family:Arial,Helvetica,sans-serif;">✅</td>
  <td style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:#d1fae5; font-family:Arial,Helvetica,sans-serif; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${stripCheckmark(item)}</td>
</tr></table>`;
    }
    if (g.overflowNote) rows += `<div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:${c.textSecondary}; font-family:Arial,Helvetica,sans-serif; font-style:italic; margin-top:4px;"><em>${g.overflowNote}</em></div>`;
  }
  // Notable Progress — label INSIDE the green box, green border around entire section
  return `<tr><td style="padding:0 0 20px; font-family:Arial,Helvetica,sans-serif;">
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#166534" width="100%" style="background-color:#0d2818; margin-bottom:12px;">
  <tr><td style="padding:16px 20px; background-color:#0d2818; font-family:Arial,Helvetica,sans-serif;">
  <![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0d2818; border:1px solid #166534; border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:12px;">
  <tr><td style="padding:16px 20px; font-family:Arial,Helvetica,sans-serif;">
  <!--<![endif]-->
    <div style="font-size:11px; font-weight:600; color:#4ade80; text-transform:uppercase; letter-spacing:.08em; font-family:Arial,Helvetica,sans-serif; mso-line-height-rule:exactly; margin-bottom:12px;">🏆 Notable progress today</div>
    ${rows}
  </td></tr>
  </table>
</td></tr>`;
}

// ISSUE 2: MSO conditional scorecard pills in emailPulse
function emailPulse(data: AiSummaryData, ctx: RenderContext, c: Palette, e: ES): string {
  const cs = data.completenessScore;
  const fresh = cs?.freshToday ?? 0;
  const pct = cs?.percentage ?? 0;
  const missing = (cs?.missing ?? []).length;
  const hrs = totalHours(data);
  const activeDepts = (data.departments ?? []).filter(d => !d.notExpectedToday && d.reportedCount > 0).length;
  const dateLabel = ctx.summaryDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });

  // ISSUE 2: MSO conditional pills using emailPill helper
  const pillSubmitted = emailPill(`${fresh} submitted`, e.pillOkBg, e.pillOkBgRgba, e.pillOkColor);
  const pillMissingOrRate = missing > 0
    ? emailPill(`${missing} missing`, e.pillWarnBg, e.pillWarnBg, e.pillWarnColor)
    : emailPill(`${pct}% rate`, e.pillOkBg, e.pillOkBgRgba, e.pillOkColor);
  const pillHours = hrs > 0 ? emailPill(`~${hrs}h logged`, e.pillNeutralBg, e.pillNeutralBgRgba, e.pillNeutralColor) : "";
  const pillDepts = activeDepts > 0 ? emailPill(`${activeDepts} dept${activeDepts !== 1 ? "s" : ""} active`, e.pillNeutralBg, e.pillNeutralBgRgba, e.pillNeutralColor) : "";

  const pills = [pillSubmitted, pillMissingOrRate, pillHours, pillDepts].filter(Boolean).join("");

  return `<tr><td style="background-color:#0f172a; padding:24px 28px 20px; font-family:Arial,Helvetica,sans-serif;">
  <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; font-weight:500; color:#f59e0b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px; font-family:Arial,Helvetica,sans-serif;">⚡ Today's Pulse · ${dateLabel}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">
  <tr>
    <td width="4" bgcolor="#3b82f6" style="background-color:#3b82f6; font-size:0; line-height:0;">&nbsp;</td>
    <td bgcolor="#1e293b" style="background-color:#1e293b; padding:16px; font-family:Arial,Helvetica,sans-serif; border-radius:0 8px 8px 0; -webkit-border-radius:0 8px 8px 0;">
      <div style="font-size:16px; line-height:24px; mso-line-height-rule:exactly; font-weight:500; color:#f1f5f9; font-family:Arial,Helvetica,sans-serif; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${data.todaysPulse ?? ""}</div>
    </td>
  </tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${pills}</tr></table>
</td></tr>`;
}

export function renderEmailHtml(data: AiSummaryData, ctx: RenderContext): string {
  const c = pal(ctx);
  const e = buildE(c);
  const { orgName, summaryDate, pdfUrl } = ctx;
  const formattedDate = summaryDate.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const notExpected = (data.departments ?? []).filter(d => d.notExpectedToday);
  const notExpectedRow = notExpected.length > 0
    ? `<tr><td style="padding:0 0 12px; font-family:Arial,Helvetica,sans-serif;"><div style="background-color:${c.bgSecondary}; padding:10px 16px; font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:${c.textSecondary}; font-family:Arial,Helvetica,sans-serif;">${notExpected.map(d => `${d.emoji} ${d.name} — ${d.scheduleLabel ?? "not reporting today"}`).join(" &nbsp;·&nbsp; ")}</div></td></tr>` : "";

  let personGlobalIdx = 0;
  const deptRows = (data.departments ?? [])
    .filter(d => !d.notExpectedToday)
    .map(d => {
      const html = `<tr><td style="font-family:Arial,Helvetica,sans-serif;">${emailDeptSection(d, ctx, c, e, personGlobalIdx)}</td></tr>`;
      personGlobalIdx += (d.people ?? []).length;
      return html;
    }).join("");

  const pdfCta = pdfUrl
    ? `<tr><td style="text-align:center; padding:16px 0 8px; font-family:Arial,Helvetica,sans-serif;"><a href="${pdfUrl}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; font-size:13px; line-height:20px; mso-line-height-rule:exactly; font-weight:600; padding:11px 26px; border-radius:8px; -webkit-border-radius:8px; font-family:Arial,Helvetica,sans-serif;">View &amp; Download Full PDF Report</a></td></tr>` : "";

  // ── Outlook-only executive brief ──
  const cs = data.completenessScore;
  const fresh = cs?.freshToday ?? 0;
  const pct = cs?.percentage ?? 0;
  const hrs = totalHours(data);
  const activeDepts = (data.departments ?? []).filter(d => !d.notExpectedToday && d.reportedCount > 0).length;

  const needsAttnCount = (data.needsAttentionNow ?? []).length;
  const overdueCount = (data.needsAttentionNow ?? []).filter(i => i.status === "overdue").length;

  let outlookAttnSummary = "";
  if (needsAttnCount > 0) {
    const topItems = (data.needsAttentionNow ?? []).slice(0, 5);
    let attnRows = "";
    for (const item of topItems) {
      const isOverdue = item.status === "overdue";
      const badgeColor = isOverdue ? "#fca5a5" : "#fcd34d";
      const badgeBg = isOverdue ? "#7f1d1d" : "#78350f";
      const badgeText = isOverdue ? `OVERDUE${item.daysOverdue ? " " + item.daysOverdue + "d" : ""}` : "DUE SOON";
      attnRows += `<tr>
  <td style="padding:8px 0; border-bottom:1px solid #1e293b; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td width="90" valign="top" style="padding-right:10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background-color:${badgeBg}; color:${badgeColor}; font-size:10px; line-height:14px; mso-line-height-rule:exactly; font-weight:500; padding:3px 8px; font-family:Arial,Helvetica,sans-serif; white-space:nowrap;">${badgeText}</td>
        </tr></table>
      </td>
      <td style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:#e2e8f0; font-family:Arial,Helvetica,sans-serif;">${item.text}</td>
    </tr></table>
  </td>
</tr>`;
    }
    if (needsAttnCount > 5) {
      attnRows += `<tr><td style="padding:8px 0; font-size:12px; line-height:16px; mso-line-height-rule:exactly; color:#64748b; font-family:Arial,Helvetica,sans-serif; font-style:italic;">${needsAttnCount - 5} more items — see full report</td></tr>`;
    }
    outlookAttnSummary = `
    <tr><td style="padding:20px 0 8px; font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; font-weight:500; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; font-family:Arial,Helvetica,sans-serif; margin-bottom:10px;">🔥 NEEDS ATTENTION — ${overdueCount} OVERDUE</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#334155" width="100%" style="background-color:#1e293b;">
      <tr><td style="padding:8px 16px; background-color:#1e293b; font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${attnRows}</table>
      </td></tr>
      </table>
    </td></tr>`;
  }

  const progressGroups = normalizeProgress(data.notableProgress);
  let outlookProgress = "";
  if (progressGroups.length > 0) {
    const totalItems = progressGroups.reduce((s, g) => s + (g.items?.length ?? 0), 0);
    const deptList = progressGroups.filter(g => g.department).map(g => g.department).join(", ");
    outlookProgress = `
    <tr><td style="padding:16px 0 8px; font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#166534" width="100%" style="background-color:#0d2818;">
      <tr><td style="padding:14px 16px; background-color:#0d2818; font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; font-weight:600; color:#4ade80; text-transform:uppercase; letter-spacing:0.08em; font-family:Arial,Helvetica,sans-serif; margin-bottom:6px;">🏆 NOTABLE PROGRESS</div>
        <div style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:#d1fae5; font-family:Arial,Helvetica,sans-serif;">${totalItems} tasks completed across ${deptList}</div>
      </td></tr>
      </table>
    </td></tr>`;
  }

  const outlookBrief = `
    <!-- OUTLOOK-ONLY: Executive Brief -->
    <tr><td style="padding:24px 28px 8px; font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <!-- Stats bar -->
        <tr><td style="padding:0 0 16px; font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="25%" align="center" style="padding:12px 4px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:24px; line-height:28px; mso-line-height-rule:exactly; font-weight:700; color:#86efac; font-family:Arial,Helvetica,sans-serif;">${fresh}</div>
              <div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:#64748b; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">Submitted</div>
            </td>
            <td width="25%" align="center" style="padding:12px 4px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:24px; line-height:28px; mso-line-height-rule:exactly; font-weight:700; color:#86efac; font-family:Arial,Helvetica,sans-serif;">${pct}%</div>
              <div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:#64748b; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">Rate</div>
            </td>
            <td width="25%" align="center" style="padding:12px 4px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:24px; line-height:28px; mso-line-height-rule:exactly; font-weight:700; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">~${hrs}h</div>
              <div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:#64748b; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">Logged</div>
            </td>
            <td width="25%" align="center" style="padding:12px 4px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:24px; line-height:28px; mso-line-height-rule:exactly; font-weight:700; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">${activeDepts}</div>
              <div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:#64748b; text-transform:uppercase; font-family:Arial,Helvetica,sans-serif;">Depts</div>
            </td>
          </tr>
          </table>
        </td></tr>
        <!-- Prominent CTA — first, right after stats -->
        <tr><td style="padding:8px 0 16px; text-align:center; font-family:Arial,Helvetica,sans-serif;">
          ${pdfUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#4f46e5" style="background-color:#4f46e5;"><tr>
              <td style="padding:16px 40px; background-color:#4f46e5; font-family:Arial,Helvetica,sans-serif;">
                <a href="${pdfUrl}" style="color:#ffffff; text-decoration:none; font-size:15px; line-height:22px; mso-line-height-rule:exactly; font-weight:700; font-family:Arial,Helvetica,sans-serif;">View Full Report Online &#8594;</a>
              </td>
            </tr></table>
          </td></tr></table>` : ""}
          <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:#475569; font-family:Arial,Helvetica,sans-serif; margin-top:10px;">PDF report also attached to this email</div>
        </td></tr>
        ${outlookAttnSummary}
        ${outlookProgress}
      </table>
    </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Executive Summary — ${orgName}</title>
<!--[if mso]>
<style type="text/css">
  body, table, td, p, a, li, div, span { font-family: Arial, Helvetica, sans-serif !important; }
  table { border-collapse: collapse !important; }
</style>
<![endif]-->
<style type="text/css">
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  td { padding:0; }
  img { border:0; display:block; }
</style>
</head>
<body style="margin:0; padding:0; background-color:#0f172a;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0f172a;">
<tr><td align="center" style="padding:24px 16px;">
<!--[if mso]>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" align="center" style="table-layout:fixed; width:700px;">
<tr><td style="width:700px; padding:0;">
<![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" style="max-width:700px; table-layout:fixed; word-wrap:break-word; overflow:hidden; background-color:#0f172a;">
  <!-- HEADER — same for both -->
  <tr><td style="background-color:#1e293b; padding:20px 28px 16px; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td valign="top" style="font-family:Arial,Helvetica,sans-serif; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">
        <div style="font-size:17px; line-height:24px; mso-line-height-rule:exactly; font-weight:700; color:#ffffff; font-family:Arial,Helvetica,sans-serif;">${orgName}</div>
        <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:rgba(255,255,255,0.45); margin-top:3px; text-transform:uppercase; letter-spacing:.08em; font-family:Arial,Helvetica,sans-serif;">Executive Summary</div>
      </td>
      <td style="text-align:right; vertical-align:top; white-space:nowrap; padding-left:16px;">
        <div style="font-size:13px; line-height:18px; mso-line-height-rule:exactly; color:rgba(255,255,255,0.7); font-weight:500; font-family:Arial,Helvetica,sans-serif;">${formattedDate}</div>
      </td>
    </tr></table>
  </td></tr>
  <!-- TODAY'S PULSE — same for both -->
  ${emailPulse(data, ctx, c, e)}
  <!-- ═══════════ OUTLOOK ONLY: Executive Brief ═══════════ -->
  <!--[if mso]>
  ${outlookBrief}
  <![endif]-->
  <!-- ═══════════ NON-OUTLOOK: Full Detailed Report ═══════════ -->
  <!--[if !mso]><!-->
  <tr><td style="padding:20px 28px 8px; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${emailNeedsAttention(data, c, e)}
      ${emailNotableProgress(data, c)}
      <tr><td style="padding:20px 0 12px; font-family:Arial,Helvetica,sans-serif;"><div style="${e.secLabel}">👤 Individual reports</div></td></tr>
      ${deptRows}
      ${notExpectedRow}
      ${pdfCta}
    </table>
  </td></tr>
  <!--<![endif]-->
  <!-- FOOTER — same for both -->
  <tr><td style="padding:14px 28px; border-top:1px solid #1e293b; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:${c.textTertiary}; font-family:Arial,Helvetica,sans-serif;">${orgName} · Confidential</td>
      <td style="text-align:right; font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:${c.textTertiary}; font-family:Arial,Helvetica,sans-serif;">Sent by OrgRise AI</td>
    </tr></table>
  </td></tr>
</table>
<!--[if mso]>
</td></tr></table>
<![endif]-->
</td></tr>
</table>
</body>
</html>`;
}
