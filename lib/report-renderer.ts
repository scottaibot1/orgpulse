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
  const m = s.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/i);
  if (m) {
    const mo = MONTH_NAMES[m[1].toLowerCase()];
    if (!mo) return null;
    const dy = parseInt(m[2], 10);
    const yr = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    return `${yr}-${String(mo).padStart(2,"0")}-${String(dy).padStart(2,"0")}`;
  }
  return null;
}

function fmtMD(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [, m, d] = iso.split("-");
    return `${parseInt(m)}/${parseInt(d)}`;
  }
  return iso;
}

function today(): string { return new Date().toISOString().split("T")[0]; }

function dueDateStatus(iso: string): "overdue" | "urgent" | "normal" {
  const t = new Date(today()); t.setHours(0,0,0,0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.floor((d.getTime() - t.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "urgent";
  return "normal";
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

function iconType(h: HighlightItem): "bullet" | "warn" | "block" {
  if (h.type === "blocker") return "block";
  if (h.type === "atrisk") return "warn";
  if (h.type === "ontack") {
    const { dueDate } = extractDuePct(h.text);
    if (dueDate && dueDateStatus(dueDate) === "overdue") return "warn";
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
.pulse-label{font-size:11px;font-weight:500;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}
.pulse-headline{font-size:16px;font-weight:500;color:#f1f5f9;line-height:1.6;margin-bottom:1rem}
.pills{display:flex;flex-wrap:wrap;gap:8px}
.pill{font-size:12px;padding:4px 12px;border-radius:20px;font-weight:500}
.pill-ok{background:#14532d;color:#86efac}
.pill-warn{background:#78350f;color:#fcd34d}
.pill-neutral{background:${c.bgSecondary};color:${c.textSecondary};border:.5px solid ${c.borderTertiary}}
.sec-label{font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.08em;margin:1.5rem 0 .75rem}
.card{background:var(--color-background-primary);border:.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);padding:1rem 1.25rem;margin-bottom:.75rem}
.dept-label{font-size:10px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.08em;margin:.75rem 0 .35rem}
.dept-label:first-child{margin-top:0}
.attn-row{display:flex;gap:10px;align-items:flex-start;padding:.6rem 0;border-bottom:.5px solid var(--color-border-tertiary)}
.attn-row:last-child{border-bottom:none}
.attn-icon{font-size:14px;flex-shrink:0;margin-top:2px}
.attn-body{font-size:13px;color:var(--color-text-primary);line-height:1.5}
.attn-action{font-size:12px;color:var(--color-text-info);margin-top:3px;font-style:italic}
.overdue-badge{display:inline-block;font-size:10px;font-weight:500;background:var(--color-background-danger);color:var(--color-text-danger);padding:2px 7px;border-radius:10px;margin-right:6px}
.urgent-badge{display:inline-block;font-size:10px;font-weight:500;background:var(--color-background-warning);color:var(--color-text-warning);padding:2px 7px;border-radius:10px;margin-right:6px}
.person-card{background:var(--color-background-primary);border:.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);margin-bottom:1rem;overflow:hidden}
.person-header{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.25rem;border-bottom:.5px solid var(--color-border-tertiary)}
.person-name{font-size:15px;font-weight:500;color:var(--color-text-primary)}
.person-meta{font-size:12px;color:var(--color-text-secondary);margin-top:2px}
.person-body{padding:1rem 1.25rem}
.cat-label{font-size:10px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.06em;margin:.85rem 0 .35rem}
.cat-label:first-child{margin-top:0}
.task{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--color-text-primary);line-height:1.5;padding:2px 0}
.task-meta{font-size:11px;color:var(--color-text-secondary);margin-left:4px}
.task-meta.overdue{color:var(--color-text-danger)}
.check{width:16px;height:16px;border-radius:3px;background:var(--color-background-success);border:.5px solid var(--color-border-success);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;font-size:10px}
.warn-icon{width:16px;height:16px;border-radius:3px;background:var(--color-background-warning);border:1px solid ${c.textDueUrgent};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;font-size:10px}
.block-icon{width:16px;height:16px;border-radius:3px;background:var(--color-background-danger);border:1px solid ${c.textDueOd};display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;font-size:10px}
.bullet{width:6px;height:6px;border-radius:50%;background:${c.bullet};flex-shrink:0;margin-top:5px}
.timebar-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:12px;color:var(--color-text-secondary)}
.timebar-label{width:140px;flex-shrink:0;line-height:1.3}
.timebar-track{flex:1;height:4px;background:${c.bgSecondary};border-radius:2px;overflow:hidden}
.timebar-fill{height:100%;border-radius:2px}
.view-link{font-size:11px;color:var(--color-text-info);text-decoration:none;white-space:nowrap}
.tag-fresh{font-size:10px;background:var(--color-background-success);color:var(--color-text-success);padding:2px 8px;border-radius:10px}
.tag-standin{font-size:10px;background:${c.bgWarning};color:${c.textWarning};padding:2px 8px;border-radius:10px}
.tag-missing{font-size:10px;background:${c.bgDanger};color:${c.textDanger};padding:2px 8px;border-radius:10px}
.subcat{font-size:10px;font-weight:500;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin:.5rem 0 .2rem}
.pct{font-size:11px;color:${c.textSecondary};background:${c.bgPct};padding:1px 6px;border-radius:8px;margin-left:4px;white-space:nowrap}
.due{font-size:11px;color:${c.textDue};margin-left:4px;white-space:nowrap}
.due.od{color:${c.textDueOd}}
.due.urgent{color:${c.textDueUrgent}}
.tmrow-item{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--color-text-secondary);padding:2px 0}
.dept-header-bar{display:flex;align-items:center;justify-content:space-between;background:${c.navy};border:.5px solid ${c.borderTertiary};border-radius:var(--border-radius-md);padding:.6rem 1rem;margin:1rem 0 .5rem}
.dept-header-bar-name{font-size:13px;font-weight:500;color:${c.textPrimary}}
.dept-header-bar-status{font-size:11px;color:#22c55e}
.not-expected-bar{background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:.6rem 1rem;margin:.5rem 0;font-size:13px;color:var(--color-text-secondary)}
@media print{@page{margin:10mm 8mm;size:A4;}body{background:${c.pageBodyBg};-webkit-print-color-adjust:exact;print-color-adjust:exact;}.print-btn{display:none!important;}}
`.trim();
}

// ── Email styles (theme-aware inline styles) ───────────────────────────────────

function buildE(c: Palette) {
  return {
    pill:         `font-size:12px;padding:4px 12px;font-weight:500;display:inline-block;`,
    pillOk:       `background:#14532d;color:#86efac;`,
    pillWarn:     `background:#78350f;color:#fcd34d;`,
    pillNeutral:  `background:${c.bgSecondary};color:${c.textSecondary};`,
    card:         `background:${c.bgPrimary};border:.5px solid ${c.borderTertiary};padding:16px 20px;margin-bottom:12px;`,
    deptLabel:    `font-size:10px;font-weight:500;color:${c.textSecondary};text-transform:uppercase;letter-spacing:.08em;margin:12px 0 4px;`,
    secLabel:     `font-size:11px;font-weight:500;color:${c.textSecondary};text-transform:uppercase;letter-spacing:.08em;margin:24px 0 12px;display:block;`,
    personName:   `font-size:15px;font-weight:500;color:${c.textPrimary};`,
    personMeta:   `font-size:12px;color:${c.textSecondary};margin-top:2px;`,
    catLabel:     `font-size:10px;font-weight:500;color:${c.textSecondary};text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;display:block;`,
    subcat:       `font-size:10px;font-weight:500;color:${c.textTertiary};text-transform:uppercase;letter-spacing:.05em;margin:8px 0 2px;display:block;`,
    taskFont:     `font-size:13px;color:${c.textPrimary};line-height:1.5;`,
    taskSecond:   `font-size:13px;color:${c.textSecondary};line-height:1.5;`,
    bullet:       `width:6px;height:6px;background:${c.bullet};display:inline-block;margin-top:5px;flex-shrink:0;`,
    warnIcon:     `width:16px;height:16px;background:${c.bgWarning};border:1px solid ${c.textDueUrgent};text-align:center;font-size:10px;line-height:16px;flex-shrink:0;`,
    blockIcon:    `width:16px;height:16px;background:${c.bgDanger};border:1px solid ${c.textDueOd};text-align:center;font-size:10px;line-height:16px;flex-shrink:0;`,
    pct:          `font-size:11px;color:${c.textSecondary};background:${c.bgPct};padding:1px 6px;margin-left:4px;white-space:nowrap;display:inline-block;`,
    dueNormal:    `font-size:11px;color:${c.textDue};margin-left:4px;white-space:nowrap;`,
    dueOd:        `font-size:11px;color:${c.textDueOd};margin-left:4px;white-space:nowrap;`,
    dueUrgent:    `font-size:11px;color:${c.textDueUrgent};margin-left:4px;white-space:nowrap;`,
    tagFresh:     `font-size:10px;background:${c.bgSuccess};color:${c.textSuccess};padding:2px 8px;display:inline-block;`,
    tagStandin:   `font-size:10px;background:${c.bgWarning};color:${c.textWarning};padding:2px 8px;display:inline-block;`,
    tagMissing:   `font-size:10px;background:${c.bgDanger};color:${c.textDanger};padding:2px 8px;display:inline-block;`,
    viewLink:     `font-size:11px;color:${c.textInfo};text-decoration:none;white-space:nowrap;`,
    overdueBadge: `display:inline-block;font-size:10px;font-weight:500;background:${c.bgDanger};color:${c.textDanger};padding:2px 7px;margin-right:6px;`,
    urgentBadge:  `display:inline-block;font-size:10px;font-weight:500;background:${c.bgWarning};color:${c.textWarning};padding:2px 7px;margin-right:6px;`,
    deptHeaderBar:`background:${c.navy};border:.5px solid ${c.borderTertiary};padding:10px 16px;margin:16px 0 8px;`,
    deptBarName:  `font-size:13px;font-weight:500;color:${c.textPrimary};`,
  };
}
type ES = ReturnType<typeof buildE>;

// ── PDF render helpers ─────────────────────────────────────────────────────────

function pdfAttnBadge(item: NeedsAttentionItem): string {
  if (item.status === "overdue") {
    const days = item.daysOverdue ? ` ${item.daysOverdue} day${item.daysOverdue === 1 ? "" : "s"}` : "";
    return `<span class="overdue-badge">OVERDUE${days}</span>`;
  }
  if (item.status === "imminentlyDue" || item.status === "dueSoon") return `<span class="urgent-badge">DUE SOON</span>`;
  return "";
}

function pdfAttnIcon(item: NeedsAttentionItem): string {
  if (item.status === "blocked") return "🚨";
  return "⚠️";
}

function pdfDueStr(item: NeedsAttentionItem): string {
  if (!item.dueDate) return "";
  const iso = mdToISO(item.dueDate);
  const fmt = fmtMD(iso);
  if (item.status === "overdue") return ` · was due ${fmt}`;
  return ` · due ${fmt}`;
}

function pdfTask(h: HighlightItem): string {
  const { clean, dueDate, pct } = extractDuePct(h.text);
  const icon = iconType(h);
  let iconHtml: string;
  if (icon === "warn")  iconHtml = `<div class="warn-icon">⚠</div>`;
  else if (icon === "block") iconHtml = `<div class="block-icon">🚫</div>`;
  else                  iconHtml = `<div class="bullet"></div>`;

  let dueHtml = "";
  if (dueDate) {
    const st = dueDateStatus(dueDate);
    const cls = st === "overdue" ? " od" : st === "urgent" ? " urgent" : "";
    const prefix = st === "overdue" ? "was due " : "due ";
    dueHtml = `<span class="due${cls}">· ${prefix}${fmtMD(dueDate)}</span>`;
  }
  const pctHtml = pct != null ? `<span class="pct">${pct}%</span>` : "";

  return `<div class="task">${iconHtml}${clean}${dueHtml}${pctHtml}</div>`;
}

function pdfTomorrowItem(h: HighlightItem): string {
  const { clean } = extractDuePct(h.text);
  return `<div class="tmrow-item"><span style="font-size:13px">📅</span>${clean}</div>`;
}

function pdfTimeBars(alloc: TimeAllocationItem[], estimated: boolean | undefined, hoursWorked: number | null | undefined, c: Palette): string {
  if (!alloc || alloc.length === 0) return "";
  const totalH = alloc.reduce((s, t) => s + (t.hours ?? 0), 0);
  const totalStr = Number.isInteger(totalH) ? `${totalH}h` : `${totalH.toFixed(1)}h`;
  const label = estimated ? `Time allocation · estimated` : `Time allocation · ${hoursWorked != null ? hoursWorked + "h" : totalStr}`;
  const rows = alloc.map((t, i) => {
    const barPct = Math.min(100, Math.max(1, Math.round(t.percent)));
    const color = BAR_COLORS[i % BAR_COLORS.length];
    const hrs = estimated ? `~${t.hours}h` : `${t.hours}h`;
    return `<div class="timebar-row"><div class="timebar-label">${t.label}</div><div class="timebar-track"><div class="timebar-fill" style="width:${barPct}%;background:${color}"></div></div><span>${hrs}</span></div>`;
  }).join("");
  const note = estimated ? `<div style="font-size:11px;color:${c.textSecondary};margin-bottom:.5rem;font-style:italic">Hours not logged — estimated from reported activities</div>` : "";
  return `<div class="cat-label" style="margin-top:1rem">${label}</div>${note}${rows}`;
}

function pdfPipelineGrid(snap: PipelineSnapshot, c: Palette): string {
  const tiles = [
    { label: "Hot responsive",  value: snap.hot_responsive,  warn: false },
    { label: "Qualified",       value: snap.qualified,       warn: false },
    { label: "Hot but cold",    value: snap.hot_but_cold,    warn: true  },
    { label: "New today",       value: snap.new_leads_today, warn: false },
    { label: "Contacted",       value: snap.leads_contacted, warn: false },
    { label: "Proposals sent",  value: snap.proposals_sent,  warn: false },
  ];
  const cells = tiles.map(t => {
    const color = t.warn ? `color:${c.textDueUrgent}` : `color:${c.textPrimary}`;
    return `<div style="background:${c.bgSecondary};border-radius:${c.radiusMd};padding:.6rem;text-align:center;border:.5px solid ${c.borderTertiary}"><div style="font-size:20px;font-weight:500;${color}">${t.value ?? 0}</div><div style="font-size:11px;color:${c.textSecondary}">${t.label}</div></div>`;
  }).join("");
  return `<div class="cat-label">Pipeline snapshot</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1rem">${cells}</div>`;
}

function pdfPersonCard(p: PersonData, ctx: RenderContext, c: Palette): string {
  const href = reportHref(p.name, ctx);
  const viewLink = href ? ` · <a class="view-link" href="${href}">View Submitted Report →</a>` : "";
  const hoursStr = p.hoursWorked != null ? `${p.hoursWorked}h logged` : "Hours not logged";
  let tag: string;
  if (p.status === "standin") tag = `<span class="tag-standin">Stand-in · ${p.daysSinceReport}d ago</span>`;
  else if (p.status === "missing") tag = `<span class="tag-missing">Missing</span>`;
  else tag = `<span class="tag-fresh">Today</span>`;

  let pipelineHtml = "";
  if (p.pipeline_snapshot) {
    pipelineHtml = pdfPipelineGrid(p.pipeline_snapshot, c);
  } else if (p.salesMetrics && p.salesMetrics.length > 0) {
    const cells = p.salesMetrics.map(m =>
      `<div style="background:${c.bgSecondary};border-radius:${c.radiusMd};padding:.6rem;text-align:center;border:.5px solid ${c.borderTertiary}"><div style="font-size:20px;font-weight:500;color:${c.textPrimary}">${m.value}</div><div style="font-size:11px;color:${c.textSecondary}">${m.label}</div></div>`
    ).join("");
    pipelineHtml = `<div class="cat-label">Pipeline snapshot</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:1rem">${cells}</div>`;
  }

  const ontack    = (p.highlights ?? []).filter(h => h.type === "ontack" || h.type === "atrisk");
  const blockers  = (p.highlights ?? []).filter(h => h.type === "blocker");
  const tomorrow  = (p.highlights ?? []).filter(h => h.type === "tomorrowfocus");

  let ontackHtml = "";
  if (ontack.length > 0) {
    ontackHtml += `<div class="cat-label">In progress</div>`;
    let lastSub: string | undefined;
    for (const h of ontack) {
      if (h.subcategory && h.subcategory !== lastSub) {
        ontackHtml += `<div class="subcat">${h.subcategory}</div>`;
        lastSub = h.subcategory;
      }
      ontackHtml += pdfTask(h);
    }
  }

  let blockersHtml = "";
  if (blockers.length > 0) {
    blockersHtml = `<div class="cat-label">Blocked</div>` + blockers.map(h => pdfTask(h)).join("");
  }

  let tomorrowHtml = "";
  if (tomorrow.length > 0) {
    tomorrowHtml = `<div class="cat-label">Tomorrow's focus</div>` + tomorrow.map(h => pdfTomorrowItem(h)).join("");
  }

  const overflowHtml = p.overflowNote
    ? `<div style="font-size:11px;color:${c.textSecondary};font-style:italic;margin-top:.5rem">${p.overflowNote}</div>` : "";

  const timeBarsHtml = pdfTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated, p.hoursWorked, c);

  return `<div class="person-card">
  <div class="person-header">
    <div>
      <div class="person-name">${p.name}</div>
      <div class="person-meta">${hoursStr} · ${tag}${viewLink}</div>
    </div>
  </div>
  <div class="person-body">
    ${pipelineHtml}${ontackHtml}${blockersHtml}${tomorrowHtml}${overflowHtml}${timeBarsHtml}
  </div>
</div>`;
}

function pdfDeptSection(dept: DepartmentData, ctx: RenderContext, c: Palette): string {
  if (dept.notExpectedToday) return "";
  const statusColor = dept.statusOk ? "#22c55e" : "#f59e0b";
  return `<div class="dept-header-bar" style="margin-top:1.5rem">
  <span class="dept-header-bar-name">${dept.emoji} ${dept.name}</span>
  <span class="dept-header-bar-status" style="color:${statusColor}">${dept.statusLabel}</span>
</div>
${(dept.people ?? []).map(p => pdfPersonCard(p, ctx, c)).join("")}`;
}

function pdfNeedsAttention(data: AiSummaryData, c: Palette): string {
  const items = (data.needsAttentionNow ?? []).slice().sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
  const waiting = data.waitingOnExternal ?? [];
  if (items.length === 0 && waiting.length === 0) {
    return `<div class="sec-label">🔥 Needs attention now</div>
<div class="card"><div style="font-size:13px;color:${c.textSuccess}">🟢 No overdue, blocked, or imminently due items today.</div></div>`;
  }

  const grouped = groupAttention(items);
  let rows = "";
  for (const [dept, deptItems] of Array.from(grouped.entries())) {
    rows += `<div class="dept-label">${dept}</div>`;
    for (const item of deptItems) {
      const badge = pdfAttnBadge(item);
      const icon = pdfAttnIcon(item);
      const dueStr = pdfDueStr(item);
      rows += `<div class="attn-row">
  <div class="attn-icon">${icon}</div>
  <div>
    <div class="attn-body">${badge}${item.text}${dueStr}</div>
  </div>
</div>`;
    }
  }

  if (waiting.length > 0) {
    rows += `<div class="dept-label" style="margin-top:.75rem">Waiting on external</div>`;
    for (const w of waiting) {
      rows += `<div class="attn-row">
  <div class="attn-icon">⏳</div>
  <div><div class="attn-body">${w.text} <span style="color:${c.textSecondary}">(${w.who})</span></div></div>
</div>`;
    }
  }

  return `<div class="sec-label">🔥 Needs attention now</div><div class="card">${rows}</div>`;
}

function pdfNotableProgress(data: AiSummaryData, c: Palette): string {
  const groups = normalizeProgress(data.notableProgress);
  if (groups.length === 0) return "";
  let rows = "";
  for (const g of groups) {
    if (g.department) rows += `<div class="dept-label" style="color:${c.textProgressLabel}">${g.department}</div>`;
    for (const item of (g.items ?? [])) {
      rows += `<div style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:${c.textProgress};line-height:1.5;padding:3px 0"><span style="font-size:14px">✅</span>${stripCheckmark(item)}</div>`;
    }
    if (g.overflowNote) rows += `<div style="font-size:11px;color:${c.textSecondary};font-style:italic;margin-top:.25rem">${g.overflowNote}</div>`;
  }
  const cardStyle = `background:${c.bgProgress};border:.5px solid ${c.borderProgress};border-radius:${c.radiusLg};padding:1rem 1.25rem;margin-bottom:.75rem;`;
  return `<div class="sec-label">🏆 Notable progress today</div><div style="${cardStyle}">${rows}</div>`;
}

function pdfPulse(data: AiSummaryData, ctx: RenderContext): string {
  const cs = data.completenessScore ?? {};
  const fresh = cs.freshToday ?? 0;
  const pct = cs.percentage ?? 0;
  const missing = (cs.missing ?? []).length;
  const hrs = totalHours(data);
  const activeDepts = (data.departments ?? []).filter(d => !d.notExpectedToday && d.reportedCount > 0).length;
  const dateLabel = ctx.summaryDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const pills = [
    `<span class="pill pill-ok">${fresh} submitted</span>`,
    missing > 0
      ? `<span class="pill pill-warn">${missing} missing</span>`
      : `<span class="pill pill-ok">${pct}% rate</span>`,
    hrs > 0 ? `<span class="pill pill-neutral">~${hrs}h logged</span>` : "",
    activeDepts > 0 ? `<span class="pill pill-neutral">${activeDepts} dept${activeDepts !== 1 ? "s" : ""} active</span>` : "",
  ].filter(Boolean).join("");

  return `<div class="pulse">
  <div class="pulse-label">⚡ Today's Pulse · ${dateLabel}</div>
  <div class="pulse-headline">${data.todaysPulse ?? ""}</div>
  <div class="pills">${pills}</div>
</div>`;
}

export function renderPdfHtml(data: AiSummaryData, ctx: RenderContext): string {
  const c = pal(ctx);
  const { orgName, summaryDate, createdAt } = ctx;
  const formattedDate = summaryDate.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const generatedAt = createdAt.toLocaleString("en-US", { month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit" });

  const notExpected = (data.departments ?? []).filter(d => d.notExpectedToday);
  const notExpectedBar = notExpected.length > 0
    ? `<div class="not-expected-bar">${notExpected.map(d => `${d.emoji} ${d.name} — ${d.scheduleLabel ?? "not reporting today"}`).join(" &nbsp;·&nbsp; ")}</div>` : "";

  const deptSections = (data.departments ?? [])
    .filter(d => !d.notExpectedToday)
    .map(d => pdfDeptSection(d, ctx, c)).join("");

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
    ${pdfNeedsAttention(data, c)}
    ${pdfNotableProgress(data, c)}
    <div class="sec-label">👤 Individual reports</div>
    ${deptSections}
    ${notExpectedBar}
    <div style="text-align:center;padding:1.5rem 0;border-top:.5px solid ${c.borderTertiary};margin-top:1rem">
      <span style="font-size:11px;color:${c.textSecondary}">${orgName} · Confidential · Generated by OrgRise AI</span>
    </div>
  </div>
</div>
<script>setTimeout(()=>window.print(),400);</script>
</body>
</html>`;
}

// ── Email render helpers ───────────────────────────────────────────────────────

function emailPill(text: string, style: string): string {
  return `<td style="padding-right:6px;padding-bottom:6px;"><span style="font-size:12px;padding:4px 12px;font-weight:500;display:inline-block;${style}">${text}</span></td>`;
}

function emailTask(h: HighlightItem, e: ES): string {
  const { clean, dueDate, pct } = extractDuePct(h.text);
  const icon = iconType(h);
  let iconTd: string;
  if (icon === "warn")       iconTd = `<td width="18" valign="top" style="padding-top:1px;"><span style="${e.warnIcon}">⚠</span></td>`;
  else if (icon === "block") iconTd = `<td width="18" valign="top" style="padding-top:1px;"><span style="${e.blockIcon}">🚫</span></td>`;
  else                       iconTd = `<td width="10" valign="top" style="padding-top:5px;"><span style="${e.bullet}"></span></td>`;

  let dueHtml = "";
  if (dueDate) {
    const st = dueDateStatus(dueDate);
    const style = st === "overdue" ? e.dueOd : st === "urgent" ? e.dueUrgent : e.dueNormal;
    const prefix = st === "overdue" ? "was due " : "due ";
    dueHtml = `<span style="${style}">· ${prefix}${fmtMD(dueDate)}</span>`;
  }
  const pctHtml = pct != null ? `<span style="${e.pct}">${pct}%</span>` : "";

  return `<tr><td style="padding:2px 0;"><table cellpadding="0" cellspacing="0" width="100%"><tr>
    ${iconTd}<td style="${e.taskFont};padding-left:6px;">${clean}${dueHtml}${pctHtml}</td>
  </tr></table></td></tr>`;
}

function emailTomorrowItem(h: HighlightItem, e: ES): string {
  const { clean } = extractDuePct(h.text);
  return `<tr><td style="padding:2px 0;"><table cellpadding="0" cellspacing="0" width="100%"><tr>
    <td width="20" valign="top" style="font-size:13px;line-height:1.5;">📅</td>
    <td style="${e.taskSecond};padding-left:4px;">${clean}</td>
  </tr></table></td></tr>`;
}

function emailTimeBars(alloc: TimeAllocationItem[], estimated: boolean | undefined, hoursWorked: number | null | undefined, c: Palette, e: ES): string {
  if (!alloc || alloc.length === 0) return "";
  const totalH = alloc.reduce((s, t) => s + (t.hours ?? 0), 0);
  const totalStr = Number.isInteger(totalH) ? `${totalH}h` : `${totalH.toFixed(1)}h`;
  const label = estimated ? `Time allocation · estimated` : `Time allocation · ${hoursWorked != null ? hoursWorked + "h" : totalStr}`;
  const note = estimated
    ? `<tr><td style="font-size:11px;color:${c.textSecondary};padding-bottom:6px;"><em>Hours not logged — estimated from reported activities</em></td></tr>` : "";

  const rows = alloc.map((t, i) => {
    const color = BAR_COLORS[i % BAR_COLORS.length];
    const barPct = Math.min(100, Math.max(1, Math.round(t.percent)));
    const rest = 100 - barPct;
    const hrs = estimated ? `~${t.hours}h` : `${t.hours}h`;
    return `<tr><td style="padding:2px 0;"><table cellpadding="0" cellspacing="0" width="300"><tr>
      <td width="140" valign="top" style="font-size:12px;color:${c.textSecondary};padding-right:6px;padding-top:1px;white-space:nowrap;overflow:hidden;">${t.label}</td>
      <td valign="middle" style="padding:3px 4px 0;"><table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="${barPct}%" height="4" bgcolor="${color}" style="background:${color};font-size:0;line-height:0;">&#8203;</td>
        ${rest > 0 ? `<td width="${rest}%" height="4" bgcolor="${c.bgSecondary}" style="background:${c.bgSecondary};font-size:0;line-height:0;">&#8203;</td>` : ""}
      </tr></table></td>
      <td width="28" valign="top" style="font-size:12px;color:${c.textSecondary};text-align:right;padding-top:1px;">${hrs}</td>
    </tr></table></td></tr>`;
  }).join("");
  return `<tr><td style="padding-top:14px;">
    <div style="${e.catLabel}">${label}</div>
    <table cellpadding="0" cellspacing="0" width="100%">${note}${rows}</table>
  </td></tr>`;
}

function emailPipelineGrid(snap: PipelineSnapshot, c: Palette, e: ES): string {
  const tiles = [
    { label: "Hot responsive",  value: snap.hot_responsive,  warn: false },
    { label: "Qualified",       value: snap.qualified,       warn: false },
    { label: "Hot but cold",    value: snap.hot_but_cold,    warn: true  },
    { label: "New today",       value: snap.new_leads_today, warn: false },
    { label: "Contacted",       value: snap.leads_contacted, warn: false },
    { label: "Proposals sent",  value: snap.proposals_sent,  warn: false },
  ];
  let rows = "";
  for (let i = 0; i < tiles.length; i += 3) {
    const chunk = tiles.slice(i, i + 3);
    rows += `<tr>${chunk.map(t => {
      const numColor = t.warn ? c.textDueUrgent : c.textPrimary;
      return `<td style="width:33%;padding:4px;"><div style="background:${c.bgSecondary};padding:10px;text-align:center;border:.5px solid ${c.borderTertiary};"><div style="font-size:20px;font-weight:500;color:${numColor};">${t.value ?? 0}</div><div style="font-size:11px;color:${c.textSecondary};margin-top:2px;">${t.label}</div></div></td>`;
    }).join("")}</tr>`;
  }
  return `<tr><td>
    <div style="${e.catLabel}">Pipeline snapshot</div>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">${rows}</table>
  </td></tr>`;
}

function emailPersonCard(p: PersonData, ctx: RenderContext, c: Palette, e: ES): string {
  const href = reportHref(p.name, ctx);
  const viewLink = href ? ` · <a style="${e.viewLink}" href="${href}">View Submitted Report →</a>` : "";
  const hoursStr = p.hoursWorked != null ? `${p.hoursWorked}h logged` : "Hours not logged";
  let tag: string;
  if (p.status === "standin") tag = `<span style="${e.tagStandin}">Stand-in · ${p.daysSinceReport}d ago</span>`;
  else if (p.status === "missing") tag = `<span style="${e.tagMissing}">Missing</span>`;
  else tag = `<span style="${e.tagFresh}">Today</span>`;

  let pipelineHtml = "";
  if (p.pipeline_snapshot) {
    pipelineHtml = emailPipelineGrid(p.pipeline_snapshot, c, e);
  } else if (p.salesMetrics && p.salesMetrics.length > 0) {
    let smRows = "";
    for (let i = 0; i < p.salesMetrics.length; i += 3) {
      const chunk = p.salesMetrics.slice(i, i + 3);
      smRows += `<tr>${chunk.map(m => `<td style="width:33%;padding:4px;"><div style="background:${c.bgSecondary};padding:10px;text-align:center;border:.5px solid ${c.borderTertiary};"><div style="font-size:20px;font-weight:500;color:${c.textPrimary};">${m.value}</div><div style="font-size:11px;color:${c.textSecondary};margin-top:2px;">${m.label}</div></div></td>`).join("")}</tr>`;
    }
    pipelineHtml = `<tr><td><div style="${e.catLabel}">Pipeline snapshot</div><table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">${smRows}</table></td></tr>`;
  }

  const ontack   = (p.highlights ?? []).filter(h => h.type === "ontack" || h.type === "atrisk");
  const blockers = (p.highlights ?? []).filter(h => h.type === "blocker");
  const tomorrow = (p.highlights ?? []).filter(h => h.type === "tomorrowfocus");

  let ontackHtml = "";
  if (ontack.length > 0) {
    ontackHtml = `<tr><td><div style="${e.catLabel}">In progress</div></td></tr>`;
    let lastSub: string | undefined;
    for (const h of ontack) {
      if (h.subcategory && h.subcategory !== lastSub) {
        ontackHtml += `<tr><td><div style="${e.subcat}">${h.subcategory}</div></td></tr>`;
        lastSub = h.subcategory;
      }
      ontackHtml += emailTask(h, e);
    }
  }

  let blockersHtml = "";
  if (blockers.length > 0) {
    blockersHtml = `<tr><td><div style="${e.catLabel}">Blocked</div></td></tr>` + blockers.map(h => emailTask(h, e)).join("");
  }

  let tomorrowHtml = "";
  if (tomorrow.length > 0) {
    tomorrowHtml = `<tr><td><div style="${e.catLabel}">Tomorrow's focus</div></td></tr>` + tomorrow.map(h => emailTomorrowItem(h, e)).join("");
  }

  const overflowHtml = p.overflowNote
    ? `<tr><td style="font-size:11px;color:${c.textSecondary};padding-top:6px;"><em>${p.overflowNote}</em></td></tr>` : "";

  const hasBody = pipelineHtml || ontackHtml || blockersHtml || tomorrowHtml || overflowHtml || (p.timeAllocation ?? []).length > 0;

  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;border:.5px solid ${c.borderTertiary};">
  <tr style="border-bottom:.5px solid ${c.borderTertiary};">
    <td style="padding:14px 20px;${hasBody ? `border-bottom:.5px solid ${c.borderTertiary};` : ""}">
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td><div style="${e.personName}">${p.name}</div><div style="${e.personMeta}">${hoursStr} · ${tag}${viewLink}</div></td>
      </tr></table>
    </td>
  </tr>
  ${hasBody ? `<tr><td style="padding:12px 20px;background:${c.bgPrimary};"><table cellpadding="0" cellspacing="0" width="100%">
    ${pipelineHtml}${ontackHtml}${blockersHtml}${tomorrowHtml}${overflowHtml}
    ${emailTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated, p.hoursWorked, c, e)}
  </table></td></tr>` : ""}
</table>`;
}

function emailDeptSection(dept: DepartmentData, ctx: RenderContext, c: Palette, e: ES): string {
  const statusColor = dept.statusOk ? "#22c55e" : "#f59e0b";
  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:4px;">
  <tr><td style="${e.deptHeaderBar}">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="${e.deptBarName}">${dept.emoji} ${dept.name}</td>
      <td style="text-align:right;font-size:11px;color:${statusColor};">${dept.statusLabel}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:8px 0 0;">
    ${(dept.people ?? []).map(p => emailPersonCard(p, ctx, c, e)).join("")}
  </td></tr>
</table>`;
}

function emailNeedsAttention(data: AiSummaryData, c: Palette, e: ES): string {
  const items = (data.needsAttentionNow ?? []).slice().sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
  const waiting = data.waitingOnExternal ?? [];
  if (items.length === 0 && waiting.length === 0) {
    return `<tr><td style="padding:0 0 16px;">
  <div style="${e.secLabel}">🔥 Needs attention now</div>
  <div style="${e.card}font-size:13px;color:${c.textSuccess};">🟢 No overdue, blocked, or imminently due items today.</div>
</td></tr>`;
  }
  const grouped = groupAttention(items);
  let rows = "";
  for (const [dept, deptItems] of Array.from(grouped.entries())) {
    rows += `<div style="${e.deptLabel}">${dept}</div>`;
    for (const item of deptItems) {
      const badge = item.status === "overdue"
        ? `<span style="${e.overdueBadge}">OVERDUE${item.daysOverdue ? ` ${item.daysOverdue} day${item.daysOverdue === 1 ? "" : "s"}` : ""}</span>`
        : (item.status === "imminentlyDue" || item.status === "dueSoon")
        ? `<span style="${e.urgentBadge}">DUE SOON</span>` : "";
      const icon = item.status === "blocked" ? "🚨" : "⚠️";
      const dueStr = item.dueDate ? (() => {
        const iso = mdToISO(item.dueDate!);
        const fmt = fmtMD(iso);
        return item.status === "overdue" ? ` · was due ${fmt}` : ` · due ${fmt}`;
      })() : "";
      rows += `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;border-bottom:.5px solid ${c.borderTertiary};"><tr>
        <td width="22" valign="top" style="font-size:14px;padding:8px 6px 8px 0;">${icon}</td>
        <td style="font-size:13px;color:${c.textPrimary};line-height:1.5;padding:8px 0;">${badge}${item.text}${dueStr}</td>
      </tr></table>`;
    }
  }
  if (waiting.length > 0) {
    rows += `<div style="${e.deptLabel}">Waiting on external</div>`;
    for (const w of waiting) {
      rows += `<div style="font-size:13px;color:${c.textSecondary};padding:4px 0;"><em>⏳ ${w.text} <span style="color:${c.textTertiary};">(${w.who})</span></em></div>`;
    }
  }
  return `<tr><td style="padding:0 0 16px;">
  <div style="${e.secLabel}">🔥 Needs attention now</div>
  <div style="${e.card}">${rows}</div>
</td></tr>`;
}

function emailNotableProgress(data: AiSummaryData, c: Palette, e: ES): string {
  const groups = normalizeProgress(data.notableProgress);
  if (groups.length === 0) return "";
  let rows = "";
  for (const g of groups) {
    if (g.department) rows += `<div style="${e.deptLabel}color:${c.textProgressLabel};">${g.department}</div>`;
    for (const item of (g.items ?? [])) {
      rows += `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:4px;"><tr>
        <td width="22" valign="top" style="font-size:14px;">✅</td>
        <td style="font-size:13px;color:${c.textProgress};line-height:1.5;">${stripCheckmark(item)}</td>
      </tr></table>`;
    }
    if (g.overflowNote) rows += `<div style="font-size:11px;color:${c.textSecondary};margin-top:4px;"><em>${g.overflowNote}</em></div>`;
  }
  const cardStyle = `background:${c.bgProgress};border:.5px solid ${c.borderProgress};padding:16px 20px;margin-bottom:12px;`;
  return `<tr><td style="padding:0 0 16px;">
  <div style="${e.secLabel}">🏆 Notable progress today</div>
  <div style="${cardStyle}">${rows}</div>
</td></tr>`;
}

function emailPulse(data: AiSummaryData, ctx: RenderContext, c: Palette, e: ES): string {
  const cs = data.completenessScore ?? {};
  const fresh = cs.freshToday ?? 0;
  const pct = cs.percentage ?? 0;
  const missing = (cs.missing ?? []).length;
  const hrs = totalHours(data);
  const activeDepts = (data.departments ?? []).filter(d => !d.notExpectedToday && d.reportedCount > 0).length;
  const dateLabel = ctx.summaryDate.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });

  const pills = [
    emailPill(`${fresh} submitted`, e.pillOk),
    missing > 0 ? emailPill(`${missing} missing`, e.pillWarn) : emailPill(`${pct}% rate`, e.pillOk),
    hrs > 0 ? emailPill(`~${hrs}h logged`, e.pillNeutral) : "",
    activeDepts > 0 ? emailPill(`${activeDepts} dept${activeDepts !== 1 ? "s" : ""} active`, e.pillNeutral) : "",
  ].filter(Boolean).join("");

  return `<tr><td style="background:${c.navy};padding:24px 28px 20px;">
  <div style="font-size:11px;font-weight:500;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">⚡ Today's Pulse · ${dateLabel}</div>
  <div style="font-size:16px;font-weight:500;color:#f1f5f9;line-height:1.6;margin-bottom:16px;">${data.todaysPulse ?? ""}</div>
  <table cellpadding="0" cellspacing="0"><tr>${pills}</tr></table>
</td></tr>`;
}

export function renderEmailHtml(data: AiSummaryData, ctx: RenderContext): string {
  const c = pal(ctx);
  const e = buildE(c);
  const { orgName, summaryDate, pdfUrl } = ctx;
  const formattedDate = summaryDate.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const notExpected = (data.departments ?? []).filter(d => d.notExpectedToday);
  const notExpectedRow = notExpected.length > 0
    ? `<tr><td style="padding:0 0 12px;"><div style="background:${c.bgSecondary};padding:10px 16px;font-size:13px;color:${c.textSecondary};">${notExpected.map(d => `${d.emoji} ${d.name} — ${d.scheduleLabel ?? "not reporting today"}`).join(" &nbsp;·&nbsp; ")}</div></td></tr>` : "";

  const deptRows = (data.departments ?? [])
    .filter(d => !d.notExpectedToday)
    .map(d => `<tr><td>${emailDeptSection(d, ctx, c, e)}</td></tr>`).join("");

  const pdfCta = pdfUrl
    ? `<tr><td style="text-align:center;padding:16px 0 8px;"><a href="${pdfUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 26px;">View &amp; Download Full PDF Report</a></td></tr>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Executive Summary — ${orgName}</title>
</head>
<body style="margin:0;padding:0;background:${c.pageBodyBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${c.textPrimary};">
<table cellpadding="0" cellspacing="0" width="100%" style="background:${c.pageBodyBg};">
<tr><td style="padding:24px 16px;">
<table cellpadding="0" cellspacing="0" width="620" align="center" style="background:${c.bgPrimary};border:.5px solid ${c.borderTertiary};max-width:100%;">
  <tr><td style="background:${c.navy};padding:20px 28px 16px;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td valign="top"><div style="font-size:18px;font-weight:700;color:#fff;">${orgName}</div><div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;text-transform:uppercase;letter-spacing:.08em;">Executive Summary</div></td>
      <td style="text-align:right;vertical-align:top;"><div style="font-size:12px;color:rgba(255,255,255,0.6);">${formattedDate}</div></td>
    </tr></table>
  </td></tr>
  ${emailPulse(data, ctx, c, e)}
  <tr><td style="padding:20px 28px 8px;">
    <table cellpadding="0" cellspacing="0" width="100%">
      ${emailNeedsAttention(data, c, e)}
      ${emailNotableProgress(data, c, e)}
      <tr><td style="padding:0 0 12px;"><div style="${e.secLabel}">👤 Individual reports</div></td></tr>
      ${deptRows}
      ${notExpectedRow}
      ${pdfCta}
    </table>
  </td></tr>
  <tr><td style="padding:14px 28px;border-top:.5px solid ${c.borderTertiary};">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="font-size:10px;color:${c.textTertiary};">${orgName} · Confidential</td>
      <td style="text-align:right;font-size:10px;color:${c.textTertiary};">Sent by OrgRise AI</td>
    </tr></table>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
