// Shared renderer for executive summary JSON → premium PDF HTML and email HTML.

export interface HighlightItem {
  type: "critical" | "atrisk" | "ontack" | "completed" | "standout" | "blocker" | "tomorrowfocus";
  text: string;
  subcategory?: string; // Optional group label rendered as a divider above consecutive items sharing this label
  taskEmoji?: string;   // Per-task emoji override for ontack/atrisk items (used when person has 8+ in-progress tasks)
}

export interface TimeAllocationItem {
  label: string;
  hours: number;
  percent: number;
}

export interface PersonData {
  name: string;
  status: "fresh" | "standin" | "missing";
  isStandIn: boolean;
  daysSinceReport: number;
  hoursWorked: number | null;
  timeAllocation: TimeAllocationItem[];
  timeAllocationEstimated?: boolean;
  highlights: HighlightItem[];
  overflowNote?: string; // e.g. "12 additional tasks in pipeline — view full report"
}

export interface DepartmentData {
  name: string;
  emoji: string;
  reportedCount: number;
  totalCount: number;
  statusLabel: string;
  statusOk: boolean;
  people: PersonData[];
  notExpectedToday?: boolean; // True for departments not scheduled on the generation date
  scheduleLabel?: string;     // e.g. "reports weekly on Fridays"
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
}

export interface AiSummaryData {
  todaysPulse: string;
  organizationPulse?: string; // legacy
  attentionItems?: AttentionItem[]; // legacy — superseded by needsAttentionNow
  criticalAlerts?: { type: "blocker" | "atrisk"; department?: string; text: string }[]; // legacy
  needsAttentionNow?: NeedsAttentionItem[]; // new structured org-level attention section
  waitingOnExternal?: { text: string; who: string }[];
  // notableProgress can be the new grouped format (with overflowNote) or legacy flat string[]
  notableProgress: (NotableProgressGroup & { overflowNote?: string | null })[] | string[];
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

export function parseAiSummary(text: string): AiSummaryData | null {
  // Strip code fences
  let cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // If there's prefixed text before the JSON, find the first {
  if (!cleaned.startsWith("{")) {
    const idx = cleaned.indexOf("{");
    if (idx === -1) return null;
    cleaned = cleaned.slice(idx);
  }

  // Trim any trailing text after the closing }
  const lastBrace = cleaned.lastIndexOf("}");
  if (lastBrace !== -1) cleaned = cleaned.slice(0, lastBrace + 1);

  try {
    return JSON.parse(cleaned) as AiSummaryData;
  } catch {
    return null;
  }
}

// Normalize notableProgress to grouped format regardless of what the AI returned
function normalizeProgress(raw: (NotableProgressGroup & { overflowNote?: string | null })[] | string[]): (NotableProgressGroup & { overflowNote?: string | null })[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    return [{ department: "", items: raw as string[] }];
  }
  return raw as (NotableProgressGroup & { overflowNote?: string | null })[];
}

// Strip ✅ emoji from AI-generated text — the UI renders completion indicators
function stripCheckmark(text: string): string {
  return text.replace(/✅\s*/g, "").trim();
}

// Needs Attention Now status config
const ATTENTION_STATUS: Record<string, { label: string; emoji: string; bg: string; border: string; color: string; badgeBg: string; badgeColor: string }> = {
  overdue:       { label: "OVERDUE",         emoji: "🔥", bg: "#fff7ed", border: "#f97316", color: "#7c2d12", badgeBg: "#dc2626", badgeColor: "#fff" },
  imminentlyDue: { label: "DUE WITHIN 3d",  emoji: "⚠️", bg: "#fffbeb", border: "#f59e0b", color: "#78350f", badgeBg: "#f59e0b", badgeColor: "#fff" },
  dueSoon:       { label: "DUE WITHIN 7d",  emoji: "📅", bg: "#eff6ff", border: "#3b82f6", color: "#1e3a5f", badgeBg: "#3b82f6", badgeColor: "#fff" },
  blocked:       { label: "BLOCKED",         emoji: "🚫", bg: "#fef2f2", border: "#ef4444", color: "#7f1d1d", badgeBg: "#ef4444", badgeColor: "#fff" },
};

// ─── Shared helpers ──────────────────────────────────────────────────────────

const BAR_COLORS = ["#378ADD", "#1D9E75", "#EF9F27", "#7F77DD", "#888780"];

interface HighlightStyle {
  icon: string;
  color: string;
  bg: string;
  border: string;
  categoryLabel: string;
}

const HIGHLIGHT_MAP: Record<string, HighlightStyle> = {
  standout: { icon: "⭐", color: "#6d28d9", bg: "#f5f3ff", border: "#c4b5fd", categoryLabel: "Notable Wins" },
  completed: { icon: "✓", color: "#047857", bg: "#ecfdf5", border: "#6ee7b7", categoryLabel: "Completed" },
  ontack:    { icon: "●",  color: "#378ADD", bg: "#eff6ff", border: "#93c5fd", categoryLabel: "In Progress" },
  atrisk:    { icon: "▲", color: "#b45309", bg: "#fffbeb", border: "#fcd34d", categoryLabel: "At Risk" },
  blocker:   { icon: "■", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5", categoryLabel: "Blocked" },
  critical:  { icon: "■", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5", categoryLabel: "Critical" },
  tomorrowfocus: { icon: "📅", color: "#0f766e", bg: "#f0fdfa", border: "#5eead4", categoryLabel: "Tomorrow's Focus" },
};

function personInitial(name: string) {
  return (name ?? "?").trim().charAt(0).toUpperCase();
}

// ─── Category-grouped highlights ─────────────────────────────────────────────

// Render OVERDUE prefix in red bold inside the text; also strip stray ✅ emojis
function formatHighlightText(text: string): string {
  const clean = stripCheckmark(text);
  if (!clean.startsWith("OVERDUE")) return clean;
  return clean.replace(/^OVERDUE\s*[·\-]?\s*/,
    '<span style="color:#dc2626;font-weight:800;font-size:10px;letter-spacing:0.04em;">OVERDUE</span> · ');
}

// Group highlights by type, inject a category label row before each new group,
// and inject subcategory dividers when the subcategory field changes within a type.
function groupedHighlightsPdf(highlights: HighlightItem[]): string {
  if (!highlights || !highlights.length) return "";
  const safe = highlights.filter(Boolean);
  const distinctTypes = Array.from(new Set(safe.map((h) => h.type)));
  const showLabels = distinctTypes.length > 1;
  let out = "";
  let lastType = "";
  let lastSubcategory: string | undefined = undefined;
  for (const h of safe) {
    const s = HIGHLIGHT_MAP[h.type] ?? HIGHLIGHT_MAP.ontack;
    if (showLabels && h.type !== lastType) {
      out += `<div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin:8px 0 4px;">${s.categoryLabel.toUpperCase()}</div>`;
      lastType = h.type;
      lastSubcategory = undefined;
    }
    if (h.subcategory && h.subcategory !== lastSubcategory) {
      out += `<div style="font-size:9px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.07em;margin:6px 0 3px;padding-bottom:2px;border-bottom:1px solid #e2e8f0;">${h.subcategory}</div>`;
      lastSubcategory = h.subcategory;
    }
    // Plain bullet style for ontack without emoji (≤7 items — AI doesn't set taskEmoji in that case)
    if (h.type === "ontack" && !h.taskEmoji) {
      out += `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:4px;padding:1px 0;">
        <span style="color:#378ADD;font-size:8px;flex-shrink:0;margin-top:4px;line-height:1;">●</span>
        <span style="font-size:12px;color:#334155;line-height:1.55;">${formatHighlightText(h.text)}</span>
      </div>`;
      continue;
    }
    // Card style for ontack with emoji (8+ items), tomorrowfocus, and all other types
    const icon = h.taskEmoji ? h.taskEmoji : s.icon;
    out += `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;padding:5px 9px;background:${s.bg};border-left:3px solid ${s.border};border-radius:0 4px 4px 0;">
      <span style="font-size:12px;flex-shrink:0;line-height:1.4;">${icon}</span>
      <span style="font-size:12px;color:${s.color};line-height:1.5;">${formatHighlightText(h.text)}</span>
    </div>`;
  }
  return out;
}

function groupedHighlightsEmail(highlights: HighlightItem[]): string {
  if (!highlights || !highlights.length) return "";
  const safe = highlights.filter(Boolean);
  const distinctTypes = Array.from(new Set(safe.map((h) => h.type)));
  const showLabels = distinctTypes.length > 1;
  let out = "";
  let lastType = "";
  let lastSubcategory: string | undefined = undefined;
  for (const h of safe) {
    const s = HIGHLIGHT_MAP[h.type] ?? HIGHLIGHT_MAP.ontack;
    if (showLabels && h.type !== lastType) {
      out += `<tr><td style="padding:7px 0 3px;font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">${s.categoryLabel.toUpperCase()}</td></tr>`;
      lastType = h.type;
      lastSubcategory = undefined;
    }
    if (h.subcategory && h.subcategory !== lastSubcategory) {
      out += `<tr><td style="padding:5px 0 2px;font-size:9px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #e2e8f0;">${h.subcategory}</td></tr>`;
      lastSubcategory = h.subcategory;
    }
    // Plain bullet for ontack without emoji (≤7 items)
    if (h.type === "ontack" && !h.taskEmoji) {
      out += `<tr><td style="padding:2px 0;">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="14" valign="top" style="padding-top:4px;color:#378ADD;font-size:8px;line-height:1;">●</td>
          <td style="font-size:12px;color:#334155;line-height:1.55;padding:1px 0;">${formatHighlightText(h.text)}</td>
        </tr></table>
      </td></tr>`;
      continue;
    }
    const emailIcon = h.taskEmoji ? h.taskEmoji : s.icon;
    out += `<tr><td style="padding:3px 0;">
      <table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="24" valign="top" style="padding:5px 6px 5px 9px;background:${s.bg};border-left:3px solid ${s.border};font-size:12px;">${emailIcon}</td>
        <td style="padding:5px 9px 5px 6px;background:${s.bg};font-size:12px;color:${s.color};line-height:1.5;">${formatHighlightText(h.text)}</td>
      </tr></table>
    </td></tr>`;
  }
  return out;
}

// ─── Needs Attention Now — PDF ───────────────────────────────────────────────

function pdfNeedsAttentionNow(items: NeedsAttentionItem[], waiting: { text: string; who: string }[]): string {
  if (items.length === 0 && waiting.length === 0) {
    return `<div style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;padding:12px 40px;">
      <div style="font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">🟢 Needs Attention Now</div>
      <div style="font-size:13px;color:#166534;">No overdue, imminently due, or blocked items today.</div>
    </div>`;
  }
  const rows = items.map((item) => {
    const s = ATTENTION_STATUS[item.status] ?? ATTENTION_STATUS.blocked;
    const badge = `<span style="display:inline-block;background:${s.badgeBg};color:${s.badgeColor};border-radius:4px;padding:1px 7px;font-size:10px;font-weight:800;letter-spacing:0.04em;margin-right:6px;">${item.daysOverdue ? `${item.daysOverdue}d OVERDUE` : s.label}</span>`;
    const meta: string[] = [];
    if (item.dueDate) meta.push(`due ${item.dueDate}`);
    if (item.pctComplete != null) meta.push(`${item.pctComplete}%`);
    meta.push(item.who + (item.department ? ` · ${item.department}` : ""));
    return `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:7px;padding:10px 14px;background:${s.bg};border-radius:8px;border-left:4px solid ${s.border};">
      <span style="font-size:15px;flex-shrink:0;line-height:1.3;">${s.emoji}</span>
      <div style="flex:1;min-width:0;">
        ${badge}
        <span style="font-size:13px;font-weight:700;color:${s.color};">${item.text}</span>
        <div style="font-size:11px;color:#78716c;margin-top:3px;">${meta.join(" · ")}</div>
      </div>
    </div>`;
  }).join("");

  const waitingRows = waiting.length > 0 ? `
    <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">
      <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">⏳ Waiting on External</div>
      ${waiting.map(w => `<div style="font-size:12px;color:#64748b;margin-bottom:4px;">· ${w.text} <span style="color:#94a3b8;">(${w.who})</span></div>`).join("")}
    </div>` : "";

  return `<div style="background:#fff7ed;border-bottom:2px solid #fed7aa;padding:16px 40px;">
    <div style="font-size:12px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🔥 Needs Attention Now</div>
    ${rows}${waitingRows}
  </div>`;
}

// ─── Needs Attention Now — Email ──────────────────────────────────────────────

function emailNeedsAttentionNow(items: NeedsAttentionItem[], waiting: { text: string; who: string }[]): string {
  if (items.length === 0 && waiting.length === 0) {
    return `<tr><td style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;padding:10px 24px;">
      <span style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.08em;">🟢 Needs Attention Now — </span>
      <span style="font-size:12px;color:#166534;">No overdue, imminently due, or blocked items today.</span>
    </td></tr>`;
  }
  const rows = items.map((item) => {
    const s = ATTENTION_STATUS[item.status] ?? ATTENTION_STATUS.blocked;
    const badgeText = item.daysOverdue ? `${item.daysOverdue}d OVERDUE` : s.label;
    const meta: string[] = [];
    if (item.dueDate) meta.push(`due ${item.dueDate}`);
    if (item.pctComplete != null) meta.push(`${item.pctComplete}%`);
    meta.push(item.who + (item.department ? ` · ${item.department}` : ""));
    return `<tr><td style="padding:3px 0;">
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:5px;"><tr>
        <td width="24" valign="top" style="padding:8px 6px 8px 10px;background:${s.bg};border-left:4px solid ${s.border};font-size:14px;">${s.emoji}</td>
        <td style="padding:8px 10px;background:${s.bg};">
          <span style="display:inline-block;background:${s.badgeBg};color:${s.badgeColor};border-radius:3px;padding:1px 6px;font-size:9px;font-weight:800;margin-right:5px;">${badgeText}</span>
          <span style="font-size:12px;font-weight:700;color:${s.color};">${item.text}</span>
          <div style="font-size:11px;color:#78716c;margin-top:2px;">${meta.join(" · ")}</div>
        </td>
      </tr></table>
    </td></tr>`;
  }).join("");

  const waitingRows = waiting.length > 0 ? `
    <tr><td style="padding:8px 0 4px;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;border-top:1px dashed #e2e8f0;margin-top:6px;">⏳ Waiting on External</td></tr>
    ${waiting.map(w => `<tr><td style="font-size:12px;color:#64748b;padding:2px 0;">· ${w.text} <span style="color:#94a3b8;">(${w.who})</span></td></tr>`).join("")}
    ` : "";

  return `<tr><td style="background:#fff7ed;border-bottom:2px solid #fed7aa;padding:14px 24px;">
    <div style="font-size:11px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🔥 Needs Attention Now</div>
    <table cellpadding="0" cellspacing="0" width="100%">${rows}${waitingRows}</table>
  </td></tr>`;
}

// ─── PDF renderer ────────────────────────────────────────────────────────────

function pdfStatusBadge(p: PersonData): string {
  if (p.status === "fresh")
    return `<span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;letter-spacing:0.04em;">✓ TODAY</span>`;
  if (p.status === "standin")
    return `<span style="display:inline-block;background:#fef9c3;color:#713f12;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;">⏳ STAND-IN · ${p.daysSinceReport}d ago</span>`;
  return `<span style="display:inline-block;background:#fee2e2;color:#991b1b;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;">⚠ MISSING</span>`;
}

function pdfTimeBars(alloc: TimeAllocationItem[], estimated?: boolean): string {
  if (!alloc || !alloc.length) return "";
  const sectionLabel = estimated ? "(Estimated Time Spent)" : "Time Allocation";
  const rows = alloc.filter(Boolean)
    .map(
      (t, i) => `
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:10px;color:#64748b;">${t.label}</span>
          <span style="font-size:10px;color:#64748b;font-weight:600;">${t.hours}h · ${t.percent}%</span>
        </div>
        <div style="height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${t.percent}%;background:${BAR_COLORS[i % BAR_COLORS.length]};border-radius:3px;"></div>
        </div>
      </div>`
    )
    .join("");
  return `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">
    <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${sectionLabel}</div>
    ${rows}
  </div>`;
}

function emailTimeBars(alloc: TimeAllocationItem[], estimated?: boolean): string {
  if (!alloc || !alloc.length) return "";
  const safe = alloc.filter(Boolean);
  const totalHours = safe.reduce((s, t) => s + (t.hours ?? 0), 0);
  const totalHoursStr = Number.isInteger(totalHours) ? `${totalHours}h` : `${totalHours.toFixed(1)}h`;
  const sectionLabel = estimated ? "Estimated Time Spent" : "Time Allocation";
  const rows = safe.map((t, i) => {
    const color = BAR_COLORS[i % BAR_COLORS.length];
    const barPct = Math.min(100, Math.max(1, Math.round(t.percent)));
    const restPct = 100 - barPct;
    // Use width HTML attributes (not just CSS) so Outlook Word engine respects them.
    // Label column is 120px wide so most task names fit; hours column is fixed at 36px.
    return `<tr><td style="padding:2px 0;"><table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="120" valign="top" style="font-size:10px;color:#64748b;padding-right:6px;padding-top:1px;">${t.label}</td>
      <td valign="middle" style="padding:3px 4px 0;"><table cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="${barPct}%" height="6" bgcolor="${color}" style="background:${color};font-size:0;line-height:0;">&#8203;</td>
        ${restPct > 0 ? `<td width="${restPct}%" height="6" bgcolor="#f1f5f9" style="background:#f1f5f9;font-size:0;line-height:0;">&#8203;</td>` : ""}
      </tr></table></td>
      <td width="36" valign="top" style="font-size:10px;color:#64748b;padding-left:4px;text-align:right;padding-top:1px;">${t.hours}h</td>
    </tr></table></td></tr>`;
  }).join("");
  return `<tr><td style="padding:6px 12px 10px;border-top:1px dashed #e2e8f0;">
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:5px;"><tr>
      <td style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">${sectionLabel}</td>
      <td style="text-align:right;font-size:10px;font-weight:700;color:#64748b;">${totalHoursStr} total</td>
    </tr></table>
    <table cellpadding="0" cellspacing="0" width="100%">${rows}</table>
  </td></tr>`;
}

function pdfPersonCard(p: PersonData): string {
  return `
    <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;">
      <div style="background:#f8fafc;padding:9px 13px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:30px;height:30px;border-radius:50%;background:#4f46e5;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;flex-shrink:0;">${personInitial(p.name)}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:#1e293b;">${p.name}</div>
            ${p.hoursWorked != null ? `<div style="font-size:10px;color:#64748b;">${p.hoursWorked}h logged</div>` : ""}
          </div>
        </div>
        ${pdfStatusBadge(p)}
      </div>
      <div style="padding:10px 13px;">
        ${groupedHighlightsPdf(p.highlights ?? [])}
        ${p.overflowNote ? `<div style="margin-top:6px;padding:6px 10px;background:#f8fafc;border-radius:4px;border:1px dashed #cbd5e1;font-size:11px;color:#64748b;font-style:italic;">${p.overflowNote}</div>` : ""}
        ${pdfTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated)}
      </div>
    </div>`;
}

function pdfDeptSection(dept: DepartmentData): string {
  if (dept.notExpectedToday) {
    return `
    <div style="margin-bottom:14px;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;gap:10px;">
      <span style="font-size:16px;">${dept.emoji}</span>
      <span style="font-size:13px;font-weight:600;color:#475569;">${dept.name}</span>
      <span style="font-size:11px;color:#94a3b8;">— ${dept.scheduleLabel ?? "not reporting today"}</span>
    </div>`;
  }
  const statusColor = dept.statusOk ? "#047857" : "#b45309";
  const statusBg = dept.statusOk ? "#ecfdf5" : "#fffbeb";
  return `
    <div style="margin-bottom:22px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <div style="background:#0f172a;padding:11px 15px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:17px;">${dept.emoji}</span>
          <span style="font-size:15px;font-weight:700;color:#fff;">${dept.name}</span>
        </div>
        <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;background:${statusBg};color:${statusColor};text-transform:uppercase;letter-spacing:0.04em;">${dept.statusLabel}</span>
      </div>
      <div style="padding:12px 13px;">
        ${(dept.people ?? []).map(pdfPersonCard).join("")}
      </div>
    </div>`;
}

export function renderPdfHtml(data: AiSummaryData, ctx: RenderContext): string {
  const { orgName, summaryDate, createdAt } = ctx;
  const cs = data.completenessScore ?? { totalExpected: 0, freshToday: 0, percentage: 0, standIns: [], missing: [], notScheduledToday: [] };
  const progressGroups = normalizeProgress(data.notableProgress);
  const totalHoursAll = Math.round(
    (data.departments ?? []).flatMap(d => (d.people ?? [])).reduce((s, p) => s + (p.hoursWorked ?? 0), 0)
  );

  const formattedDate = summaryDate.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const formattedGenerated = createdAt.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  const pct = cs.percentage ?? 0;
  const missing = cs.missing ?? [];

  // Needs Attention Now — new structured format, with backward-compat fallback to legacy attentionItems
  const attentionSection = (() => {
    if (data.needsAttentionNow !== undefined) {
      // New format
      return pdfNeedsAttentionNow(data.needsAttentionNow ?? [], data.waitingOnExternal ?? []);
    }
    // Legacy fallback
    const legacyItems: AttentionItem[] = [
      ...(data.attentionItems ?? []),
      ...(data.criticalAlerts ?? []).map((a) => ({
        emoji: a.type === "blocker" ? "🚨" : "⚠️",
        department: a.department ?? "General",
        description: a.text,
        who: a.department ?? "",
        action: "Review and address",
      })),
    ];
    if (legacyItems.length === 0) {
      return `<div style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;padding:12px 40px;">
        <div style="font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">🟢 Needs Attention Now</div>
        <div style="font-size:13px;color:#166534;">No items requiring executive action today.</div>
      </div>`;
    }
    const rows = legacyItems.map((item) => `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;padding:10px 14px;background:#fff;border-radius:8px;border-left:4px solid #f97316;">
        <span style="font-size:16px;flex-shrink:0;line-height:1.3;">${item.emoji}</span>
        <div style="flex:1;min-width:0;">
          <span style="font-size:13px;font-weight:700;color:#7c2d12;">${item.description}</span>
          ${item.who ? `<span style="font-size:13px;color:#92400e;"> (${item.who})</span>` : ""}
          ${item.action && item.action !== "Review and address" ? `<span style="font-size:12px;color:#b45309;font-style:italic;"> — ${item.action}</span>` : ""}
        </div>
      </div>`).join("");
    return `<div style="background:#fff7ed;border-bottom:2px solid #fed7aa;padding:16px 40px;">
      <div style="font-size:12px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">🔥 Needs Attention Now</div>
      ${rows}
    </div>`;
  })();

  // Notable progress — grouped by department, with per-group overflowNote support
  const progressSection = progressGroups.length > 0 ? (() => {
    const deptBlocks = progressGroups.map((g) => `
      ${g.department ? `<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.06em;margin:8px 0 4px;padding-bottom:2px;border-bottom:1px solid #86efac;">${g.department}</div>` : ""}
      ${(g.items ?? []).map((item) => `<div style="font-size:13px;color:#064e3b;line-height:1.65;margin-bottom:4px;">✓ ${stripCheckmark(item)}</div>`).join("")}
      ${g.overflowNote ? `<div style="font-size:11px;color:#6b7280;font-style:italic;margin-top:4px;">${g.overflowNote}</div>` : ""}
    `).join("");
    return `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:15px 18px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🏆 Notable Progress</div>
      ${deptBlocks}
    </div>`;
  })() : "";

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${orgName} — Executive Summary — ${formattedDate}</title>
<style>
:root {
  --color-header-bg: #0f172a;
  --color-bullet: #378ADD;
  --color-dept-header: #0f172a;
  --color-dept-header-text: #ffffff;
  --color-card-bg: #ffffff;
  --color-card-border: #e2e8f0;
  --color-body-text: #334155;
  --color-heading-text: #1e293b;
  --color-muted: #64748b;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #f1f5f9; color: #1e293b; }
.page { max-width: 840px; margin: 0 auto; background: #fff; }
@media print {
  @page { margin: 10mm 8mm; size: A4; }
  body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-btn { display: none !important; }
}
</style>
</head>
<body data-theme="dark">
<button class="print-btn" onclick="window.print()" style="position:fixed;top:20px;right:20px;background:#4f46e5;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;z-index:100;">Save as PDF</button>
<div class="page">

  <div style="background:#0f172a;padding:30px 40px 26px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
      <div>
        <div style="font-size:21px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${orgName}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Executive Summary</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;color:rgba(255,255,255,0.65);">${formattedDate}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px;">Generated ${formattedGenerated}</div>
      </div>
    </div>
    <div style="background:#1a2744;border-left:4px solid #818cf8;border-radius:6px;padding:16px 20px;">
      <div style="font-size:10px;font-weight:800;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">⚡ Today's Pulse</div>
      <div style="font-size:18px;font-weight:700;color:#ffffff;line-height:1.55;letter-spacing:-0.2px;">${data.todaysPulse}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
        <span style="background:rgba(255,255,255,0.13);color:#ffffff;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;">✓ ${cs.freshToday} submitted</span>
        ${missing.length > 0 ? `<span style="background:#7f1d1d;color:#fca5a5;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;">⚠ ${missing.length} missing</span>` : `<span style="background:#064e3b;color:#6ee7b7;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;">✓ All reported</span>`}
        <span style="background:rgba(255,255,255,0.13);color:#ffffff;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;">📊 ${pct}% rate</span>
        ${totalHoursAll > 0 ? `<span style="background:rgba(255,255,255,0.13);color:#ffffff;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;">⏱ ${totalHoursAll}h logged</span>` : ""}
      </div>
    </div>
  </div>

  ${attentionSection}

  <div style="padding:26px 40px;">
    ${progressSection}

    ${(data.departments ?? []).map(pdfDeptSection).join("")}
  </div>

  <div style="padding:14px 40px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;">
    <span style="font-size:10px;color:#94a3b8;">${orgName} · Confidential</span>
    <span style="font-size:10px;color:#94a3b8;">Generated by OrgRise AI</span>
  </div>

</div>
<script>setTimeout(()=>window.print(),400);</script>
</body>
</html>`;
}

// ─── Email renderer ───────────────────────────────────────────────────────────

function emailStatusBadge(p: PersonData): string {
  if (p.status === "fresh")
    return `<span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;">✓ Today</span>`;
  if (p.status === "standin")
    return `<span style="display:inline-block;background:#fef9c3;color:#713f12;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;">Stand-in · ${p.daysSinceReport}d</span>`;
  return `<span style="display:inline-block;background:#fee2e2;color:#991b1b;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;">Missing</span>`;
}

function makeEmailPersonRow(ctx: RenderContext) {
  return function emailPersonRow(p: PersonData): string {
    const reportLink = ctx.reportLinks?.[p.name];
    const viewReportLink = reportLink
      ? (() => {
          // Prefer the raw uploaded file (PDF/Excel/PPT); fall back to the parsed report viewer
          const href = reportLink.fileUrl
            ? reportLink.fileUrl
            : ctx.appUrl
              ? `${ctx.appUrl}/report/${reportLink.parsedReportId}`
              : null;
          if (!href) return "";
          const label = reportLink.isStandIn ? `View Submitted Report (stand-in, ${reportLink.date})` : "View Submitted Report";
          return `<a href="${href}" style="display:inline-block;background:#ede9fe;color:#5b21b6;border-radius:5px;padding:3px 9px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;">${label} →</a>`;
        })()
      : "";
    return `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;">
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
          <table cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:28px;height:28px;border-radius:50%;background:#4f46e5;text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:12px;">${personInitial(p.name)}</td>
                <td style="padding-left:9px;vertical-align:middle;">
                  <div style="font-size:13px;font-weight:700;color:#1e293b;">${p.name}</div>
                  ${p.hoursWorked != null ? `<div style="font-size:10px;color:#64748b;">${p.hoursWorked}h logged</div>` : ""}
                </td>
              </tr></table>
            </td>
            <td style="text-align:right;vertical-align:middle;">
              <table cellpadding="0" cellspacing="0"><tr>
                ${viewReportLink ? `<td style="padding-right:10px;vertical-align:middle;">${viewReportLink}</td>` : ""}
                <td style="vertical-align:middle;">${emailStatusBadge(p)}</td>
              </tr></table>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="padding:8px 12px;">
        <table cellpadding="0" cellspacing="0" width="100%">
          ${groupedHighlightsEmail(p.highlights ?? [])}
          ${p.overflowNote ? (() => {
            const overflowHref = reportLink?.fileUrl
              ? reportLink.fileUrl
              : ctx.appUrl && reportLink?.parsedReportId
                ? `${ctx.appUrl}/report/${reportLink.parsedReportId}`
                : null;
            const overflowText = overflowHref
              ? `${p.overflowNote.replace(/view (full|submitted) report/i, "")} <a href="${overflowHref}" style="color:#6366f1;text-decoration:underline;">view submitted report</a>`
              : p.overflowNote;
            return `<tr><td style="padding:5px 0 2px;"><span style="font-size:11px;color:#64748b;font-style:italic;">${overflowText}</span></td></tr>`;
          })() : ""}
        </table>
      </td></tr>
      ${(p.timeAllocation ?? []).length > 0 ? emailTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated) : ""}
    </table>`;
  };
}

function makeEmailDeptSection(ctx: RenderContext) {
  const emailPersonRow = makeEmailPersonRow(ctx);
  return function emailDeptSection(dept: DepartmentData): string {
    if (dept.notExpectedToday) {
      return `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 14px;background:#f8fafc;">
        <span style="font-size:14px;">${dept.emoji}</span>
        <span style="font-size:12px;font-weight:600;color:#475569;"> ${dept.name}</span>
        <span style="font-size:11px;color:#94a3b8;"> — ${dept.scheduleLabel ?? "not reporting today"}</span>
      </td></tr>
    </table>`;
    }
    const statusColor = dept.statusOk ? "#047857" : "#b45309";
    const statusBg = dept.statusOk ? "#ecfdf5" : "#fffbeb";
    return `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <tr style="background:#0f172a;">
        <td style="padding:10px 14px;">
          <table cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="font-size:14px;color:#fff;">${dept.emoji}&nbsp;&nbsp;<strong style="font-size:14px;font-weight:700;">${dept.name}</strong></td>
            <td style="text-align:right;"><span style="display:inline-block;background:${statusBg};color:${statusColor};border-radius:12px;padding:2px 10px;font-size:10px;font-weight:700;">${dept.statusLabel}</span></td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="padding:10px 12px;">
        ${(dept.people ?? []).map(emailPersonRow).join("")}
      </td></tr>
    </table>`;
  };
}

export function renderEmailHtml(data: AiSummaryData, ctx: RenderContext): string {
  const { orgName, summaryDate, pdfUrl } = ctx;
  const cs = data.completenessScore ?? { totalExpected: 0, freshToday: 0, percentage: 0, standIns: [], missing: [], notScheduledToday: [] };
  const progressGroups = normalizeProgress(data.notableProgress);
  const totalHoursAll = Math.round(
    (data.departments ?? []).flatMap(d => (d.people ?? [])).reduce((s, p) => s + (p.hoursWorked ?? 0), 0)
  );

  const formattedDate = summaryDate.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const pct = cs.percentage ?? 0;
  const missingCount = (cs.missing ?? []).length;

  // Needs Attention Now — email (new format with backward-compat fallback)
  const emailAttentionSection = (() => {
    if (data.needsAttentionNow !== undefined) {
      return emailNeedsAttentionNow(data.needsAttentionNow ?? [], data.waitingOnExternal ?? []);
    }
    // Legacy fallback
    const legacyItems: AttentionItem[] = [
      ...(data.attentionItems ?? []),
      ...(data.criticalAlerts ?? []).map((a) => ({
        emoji: a.type === "blocker" ? "🚨" : "⚠️",
        department: a.department ?? "General",
        description: a.text,
        who: a.department ?? "",
        action: "Review and address",
      })),
    ];
    if (legacyItems.length === 0) {
      return `<tr><td style="background:#f0fdf4;border-bottom:2px solid #bbf7d0;padding:10px 24px;">
        <span style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.08em;">🟢 Needs Attention Now — </span>
        <span style="font-size:12px;color:#166534;">No items requiring executive action today.</span>
      </td></tr>`;
    }
    const rows = legacyItems.map((item) => `
      <tr><td style="padding:4px 0;">
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:4px;"><tr>
          <td style="width:26px;padding:8px 4px 8px 10px;background:#fff;border-left:4px solid #f97316;vertical-align:top;font-size:14px;">${item.emoji}</td>
          <td style="padding:8px 12px;background:#fff;vertical-align:top;">
            <span style="font-size:12px;font-weight:700;color:#7c2d12;">${item.description}</span>
            ${item.who ? `<span style="font-size:12px;color:#92400e;"> (${item.who})</span>` : ""}
            ${item.action && item.action !== "Review and address" ? `<span style="font-size:12px;color:#b45309;font-style:italic;"> — ${item.action}</span>` : ""}
          </td>
        </tr></table>
      </td></tr>`).join("");
    return `<tr><td style="background:#fff7ed;border-bottom:2px solid #fed7aa;padding:16px 24px;">
      <div style="font-size:11px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🔥 Needs Attention Now</div>
      <table cellpadding="0" cellspacing="0" width="100%">${rows}</table>
    </td></tr>`;
  })();

  // Notable progress — grouped by department (email), with overflowNote and ✅ stripping
  const progressSection = progressGroups.length > 0 ? (() => {
    const deptBlocks = progressGroups.map((g) => `
      ${g.department ? `<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.06em;margin:8px 0 4px;padding-bottom:2px;border-bottom:1px solid #86efac;">${g.department}</div>` : ""}
      ${(g.items ?? []).map((item) => `<div style="font-size:13px;color:#064e3b;line-height:1.65;margin-bottom:4px;">✓ ${stripCheckmark(item)}</div>`).join("")}
      ${g.overflowNote ? `<div style="font-size:11px;color:#6b7280;font-style:italic;margin-top:4px;">${g.overflowNote}</div>` : ""}
    `).join("");
    return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">🏆 Notable Progress</div>
        ${deptBlocks}
      </td></tr>
    </table>`;
  })() : "";

  const pdfCta = pdfUrl ? `
    <table cellpadding="0" cellspacing="0" width="100%"><tr><td style="text-align:center;padding:20px 0 8px;">
      <a href="${pdfUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 26px;border-radius:8px;">View &amp; Download Full PDF Report</a>
    </td></tr></table>` : "";

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

  <!-- HEADER -->
  <tr><td style="background:#0f172a;padding:26px 28px 22px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;"><tr>
      <td style="vertical-align:top;">
        <div style="font-size:18px;font-weight:800;color:#fff;">${orgName}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Executive Summary</div>
      </td>
      <td style="text-align:right;vertical-align:top;">
        <div style="font-size:12px;color:rgba(255,255,255,0.6);">${formattedDate}</div>
      </td>
    </tr></table>
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="background:#1a2744;border-left:4px solid #818cf8;border-radius:6px;padding:16px 20px;">
        <div style="font-size:10px;font-weight:800;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">⚡ Today's Pulse</div>
        <div style="font-size:16px;font-weight:700;color:#ffffff;line-height:1.6;letter-spacing:-0.2px;">${data.todaysPulse}</div>
        <table cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
          <td style="padding-right:6px;"><span style="display:inline-block;background:rgba(255,255,255,0.13);color:#ffffff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;">✓ ${cs.freshToday} submitted</span></td>
          ${missingCount > 0 ? `<td style="padding-right:6px;"><span style="display:inline-block;background:#7f1d1d;color:#fca5a5;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;">⚠ ${missingCount} missing</span></td>` : `<td style="padding-right:6px;"><span style="display:inline-block;background:#064e3b;color:#6ee7b7;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;">✓ All in</span></td>`}
          <td style="padding-right:6px;"><span style="display:inline-block;background:rgba(255,255,255,0.13);color:#ffffff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;">📊 ${pct}% rate</span></td>
          ${totalHoursAll > 0 ? `<td><span style="display:inline-block;background:rgba(255,255,255,0.13);color:#ffffff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;">⏱ ${totalHoursAll}h logged</span></td>` : ""}
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  ${emailAttentionSection}

  <!-- BODY -->
  <tr><td style="padding:22px 24px;">

    ${progressSection}

    ${(data.departments ?? []).map(makeEmailDeptSection(ctx)).join("")}

    ${pdfCta}

  </td></tr>

  <!-- FOOTER -->
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
