// Shared renderer for executive summary JSON → premium PDF HTML and email HTML.
// The AI prompt now outputs structured JSON. This module parses it and renders
// two formats (PDF/print and HTML email) from the same data.

export interface HighlightItem {
  type: "critical" | "atrisk" | "ontack" | "completed" | "standout" | "blocker";
  text: string;
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
  highlights: HighlightItem[];
}

export interface DepartmentData {
  name: string;
  emoji: string;
  reportedCount: number;
  totalCount: number;
  statusLabel: string;
  statusOk: boolean;
  people: PersonData[];
}

export interface AttentionItem {
  emoji: string;
  description: string;
  who: string;
  action: string;
}

export interface AiSummaryData {
  todaysPulse: string;
  organizationPulse: string;
  attentionItems?: AttentionItem[];
  criticalAlerts: { type: "blocker" | "atrisk"; text: string }[];
  notableProgress: string[];
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
}

export function parseAiSummary(text: string): AiSummaryData | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (!cleaned.startsWith("{")) return null;
  try {
    return JSON.parse(cleaned) as AiSummaryData;
  } catch {
    return null;
  }
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

const BAR_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6"];

interface HighlightStyle {
  icon: string;
  color: string;
  bg: string;
  border: string;
}

const HIGHLIGHT_MAP: Record<string, HighlightStyle> = {
  standout: { icon: "⭐", color: "#6d28d9", bg: "#f5f3ff", border: "#c4b5fd" },
  completed: { icon: "✅", color: "#047857", bg: "#ecfdf5", border: "#6ee7b7" },
  ontack:   { icon: "▶", color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd" },
  atrisk:   { icon: "⚠️", color: "#b45309", bg: "#fffbeb", border: "#fcd34d" },
  blocker:  { icon: "🚫", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5" },
  critical: { icon: "🔴", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5" },
};

function personInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

// ─── PDF renderer ────────────────────────────────────────────────────────────

function pdfStatusBadge(p: PersonData): string {
  if (p.status === "fresh")
    return `<span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;letter-spacing:0.04em;">✓ TODAY</span>`;
  if (p.status === "standin")
    return `<span style="display:inline-block;background:#fef9c3;color:#713f12;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;">⏳ STAND-IN · ${p.daysSinceReport}d ago</span>`;
  return `<span style="display:inline-block;background:#fee2e2;color:#991b1b;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;">⚠ MISSING</span>`;
}

function pdfTimeBars(alloc: TimeAllocationItem[]): string {
  if (!alloc.length) return "";
  const rows = alloc
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
  return `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">${rows}</div>`;
}

function pdfHighlights(highlights: HighlightItem[]): string {
  return highlights
    .map((h) => {
      const s = HIGHLIGHT_MAP[h.type] ?? HIGHLIGHT_MAP.ontack;
      return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;padding:5px 9px;background:${s.bg};border-left:3px solid ${s.border};border-radius:0 4px 4px 0;">
        <span style="font-size:12px;flex-shrink:0;line-height:1.4;">${s.icon}</span>
        <span style="font-size:12px;color:${s.color};line-height:1.5;">${h.text}</span>
      </div>`;
    })
    .join("");
}

function pdfPersonCard(p: PersonData): string {
  return `
    <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;">
      <div style="background:#f8fafc;padding:9px 13px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#818cf8,#a78bfa);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;flex-shrink:0;">${personInitial(p.name)}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:#1e293b;">${p.name}</div>
            ${p.hoursWorked != null ? `<div style="font-size:10px;color:#64748b;">${p.hoursWorked}h logged</div>` : ""}
          </div>
        </div>
        ${pdfStatusBadge(p)}
      </div>
      <div style="padding:10px 13px;">
        ${pdfHighlights(p.highlights)}
        ${pdfTimeBars(p.timeAllocation)}
      </div>
    </div>`;
}

function pdfDeptSection(dept: DepartmentData): string {
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
        ${dept.people.map(pdfPersonCard).join("")}
      </div>
    </div>`;
}

export function renderPdfHtml(data: AiSummaryData, ctx: RenderContext): string {
  const { orgName, summaryDate, createdAt } = ctx;
  const cs = data.completenessScore;

  const formattedDate = summaryDate.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const formattedGenerated = createdAt.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  const pct = cs.percentage;
  const pctColor = pct === 100 ? "#047857" : pct >= 70 ? "#b45309" : "#dc2626";
  const pctBg = pct === 100 ? "#ecfdf5" : pct >= 70 ? "#fffbeb" : "#fef2f2";

  const standInsDetail = cs.standIns.length > 0
    ? `<div style="font-size:11px;color:#92400e;margin-top:4px;">⏳ Stand-ins: ${cs.standIns.map((s) => `${s.name} (${s.daysSince}d ago)`).join(", ")}</div>`
    : "";
  const missingDetail = cs.missing.length > 0
    ? `<div style="font-size:11px;color:#991b1b;margin-top:4px;">⚠ No data: ${cs.missing.map((m) => m.name).join(", ")}</div>`
    : "";

  const attentionSection = data.attentionItems && data.attentionItems.length > 0 ? `
    <div style="background:#fff7ed;border-bottom:2px solid #fed7aa;padding:16px 40px;">
      <div style="font-size:12px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:12px;">🔥 What Needs Attention Today 🚨</div>
      ${data.attentionItems.map((item) => `
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;padding:10px 14px;background:#fff;border-radius:8px;border-left:4px solid #f97316;">
          <span style="font-size:16px;flex-shrink:0;line-height:1.3;">${item.emoji}</span>
          <div style="flex:1;min-width:0;">
            <span style="font-size:13px;font-weight:700;color:#7c2d12;">${item.description}</span>
            <span style="font-size:13px;color:#92400e;"> (${item.who})</span>
            <span style="font-size:12px;color:#b45309;font-style:italic;"> — ${item.action}</span>
          </div>
        </div>`).join("")}
    </div>` : "";

  const alertsSection = data.criticalAlerts.length > 0 ? `
    <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:10px;padding:15px 18px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🚨 Critical Alerts</div>
      ${data.criticalAlerts.map((a) => `
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;padding:7px 11px;background:#fff;border-radius:6px;border-left:3px solid ${a.type === "blocker" ? "#dc2626" : "#f59e0b"};">
          <span style="font-size:12px;">${a.type === "blocker" ? "🚫" : "⚠️"}</span>
          <span style="font-size:12px;color:#7f1d1d;line-height:1.5;">${a.text}</span>
        </div>`).join("")}
    </div>` : "";

  const progressSection = data.notableProgress.length > 0 ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:15px 18px;margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🏆 Notable Progress</div>
      ${data.notableProgress.map((item) => `<div style="font-size:13px;color:#064e3b;line-height:1.65;margin-bottom:4px;">${item}</div>`).join("")}
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${orgName} — Executive Summary — ${formattedDate}</title>
<style>
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
<body>
<button class="print-btn" onclick="window.print()" style="position:fixed;top:20px;right:20px;background:#6366f1;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(99,102,241,0.3);z-index:100;">Save as PDF</button>
<div class="page">

  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:30px 40px 26px;">
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
    <div style="border-left:3px solid #818cf8;padding-left:15px;">
      <div style="font-size:10px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Today's Pulse</div>
      <div style="font-size:16px;font-weight:600;color:#e2e8f0;line-height:1.55;">${data.todaysPulse}</div>
    </div>
  </div>

  ${attentionSection}

  <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 40px;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <span style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Completeness</span>
      <span style="background:${pctBg};color:${pctColor};border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;">${cs.freshToday} of ${cs.totalExpected} reported · ${pct}%</span>
      ${cs.standIns.length > 0 ? `<span style="background:#fefce8;color:#92400e;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;">⏳ ${cs.standIns.length} stand-in${cs.standIns.length > 1 ? "s" : ""}</span>` : ""}
      ${cs.missing.length > 0 ? `<span style="background:#fef2f2;color:#991b1b;border-radius:20px;padding:3px 11px;font-size:11px;font-weight:600;">⚠ ${cs.missing.length} missing</span>` : ""}
    </div>
    ${standInsDetail}${missingDetail}
  </div>

  <div style="padding:26px 40px;">

    <div style="font-size:13px;line-height:1.8;color:#334155;margin-bottom:22px;padding:15px 18px;background:#f8fafc;border-radius:8px;border-left:4px solid #6366f1;">
      ${data.organizationPulse}
    </div>

    ${alertsSection}
    ${progressSection}

    ${data.departments.map(pdfDeptSection).join("")}

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

function emailHighlights(highlights: HighlightItem[]): string {
  return highlights
    .map((h) => {
      const s = HIGHLIGHT_MAP[h.type] ?? HIGHLIGHT_MAP.ontack;
      return `<tr><td style="padding:4px 0;">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td style="width:24px;vertical-align:top;padding:5px 6px 5px 9px;background:${s.bg};border-left:3px solid ${s.border};border-radius:0 0 0 0;font-size:12px;">${s.icon}</td>
          <td style="padding:5px 9px 5px 6px;background:${s.bg};font-size:12px;color:${s.color};line-height:1.5;">${h.text}</td>
        </tr></table>
      </td></tr>`;
    })
    .join("");
}

function emailPersonRow(p: PersonData): string {
  return `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;">
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
          <table cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#818cf8,#a78bfa);text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:12px;">${personInitial(p.name)}</td>
                <td style="padding-left:9px;vertical-align:middle;">
                  <div style="font-size:13px;font-weight:700;color:#1e293b;">${p.name}</div>
                  ${p.hoursWorked != null ? `<div style="font-size:10px;color:#64748b;">${p.hoursWorked}h logged</div>` : ""}
                </td>
              </tr></table>
            </td>
            <td style="text-align:right;vertical-align:middle;">${emailStatusBadge(p)}</td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="padding:8px 12px;">
        <table cellpadding="0" cellspacing="0" width="100%">
          ${emailHighlights(p.highlights)}
        </table>
      </td></tr>
    </table>`;
}

function emailDeptSection(dept: DepartmentData): string {
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
        ${dept.people.map(emailPersonRow).join("")}
      </td></tr>
    </table>`;
}

export function renderEmailHtml(data: AiSummaryData, ctx: RenderContext): string {
  const { orgName, summaryDate, totalSubmissions, missingSubmissions, pdfUrl } = ctx;
  const cs = data.completenessScore;

  const total = totalSubmissions + missingSubmissions;
  const rate = total > 0 ? Math.round((totalSubmissions / total) * 100) : 0;
  const rateColor = rate === 100 ? "#047857" : rate >= 70 ? "#b45309" : "#dc2626";
  const rateBg = rate === 100 ? "#ecfdf5" : rate >= 70 ? "#fffbeb" : "#fef2f2";

  const formattedDate = summaryDate.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const pct = cs.percentage;
  const pctColor = pct === 100 ? "#047857" : pct >= 70 ? "#b45309" : "#dc2626";
  const pctBg = pct === 100 ? "#ecfdf5" : pct >= 70 ? "#fffbeb" : "#fef2f2";

  const emailAttentionSection = data.attentionItems && data.attentionItems.length > 0 ? `
    <tr><td style="background:#fff7ed;border-bottom:2px solid #fed7aa;padding:16px 24px;">
      <div style="font-size:11px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🔥 What Needs Attention Today 🚨</div>
      ${data.attentionItems.map((item) => `
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:6px;"><tr>
          <td style="width:26px;padding:8px 4px 8px 10px;background:#fff;border-left:4px solid #f97316;vertical-align:top;font-size:14px;">${item.emoji}</td>
          <td style="padding:8px 12px;background:#fff;vertical-align:top;">
            <span style="font-size:12px;font-weight:700;color:#7c2d12;">${item.description}</span>
            <span style="font-size:12px;color:#92400e;"> (${item.who})</span>
            <span style="font-size:12px;color:#b45309;font-style:italic;"> — ${item.action}</span>
          </td>
        </tr></table>`).join("")}
    </td></tr>` : "";

  const alertsSection = data.criticalAlerts.length > 0 ? `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;background:#fff5f5;border:1px solid #fca5a5;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">🚨 Critical Alerts</div>
        ${data.criticalAlerts.map((a) => `
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:4px;"><tr>
            <td style="width:20px;padding:6px 6px 6px 10px;background:#fff;border-left:3px solid ${a.type === "blocker" ? "#dc2626" : "#f59e0b"};font-size:12px;vertical-align:top;">${a.type === "blocker" ? "🚫" : "⚠️"}</td>
            <td style="padding:6px 10px;background:#fff;font-size:12px;color:#7f1d1d;line-height:1.5;">${a.text}</td>
          </tr></table>`).join("")}
      </td></tr>
    </table>` : "";

  const progressSection = data.notableProgress.length > 0 ? `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;overflow:hidden;">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">🏆 Notable Progress</div>
        ${data.notableProgress.map((item) => `<div style="font-size:13px;color:#064e3b;line-height:1.65;margin-bottom:4px;">${item}</div>`).join("")}
      </td></tr>
    </table>` : "";

  const pdfCta = pdfUrl ? `
    <table cellpadding="0" cellspacing="0" width="100%"><tr><td style="text-align:center;padding:20px 0 8px;">
      <a href="${pdfUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 26px;border-radius:8px;">View &amp; Download Full PDF Report</a>
    </td></tr></table>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Executive Summary — ${orgName}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1e293b;">
<table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;">
<tr><td style="padding:24px 16px;">
<table cellpadding="0" cellspacing="0" width="620" align="center" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:26px 28px 22px;">
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
      <td style="border-left:3px solid #818cf8;padding-left:13px;">
        <div style="font-size:10px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Today's Pulse</div>
        <div style="font-size:14px;font-weight:600;color:#e2e8f0;line-height:1.55;">${data.todaysPulse}</div>
      </td>
    </tr></table>
  </td></tr>

  ${emailAttentionSection}

  <!-- STATS ROW -->
  <tr><td style="border-bottom:1px solid #e2e8f0;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="flex:1;padding:14px 16px;text-align:center;border-right:1px solid #e2e8f0;">
        <div style="font-size:22px;font-weight:700;color:#047857;">${totalSubmissions}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.05em;">Submitted</div>
      </td>
      <td style="flex:1;padding:14px 16px;text-align:center;border-right:1px solid #e2e8f0;">
        <div style="font-size:22px;font-weight:700;color:#dc2626;">${missingSubmissions}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.05em;">Missing</div>
      </td>
      <td style="flex:1;padding:14px 16px;text-align:center;border-right:1px solid #e2e8f0;">
        <div style="font-size:22px;font-weight:700;display:inline-block;background:${rateBg};color:${rateColor};border-radius:6px;padding:1px 8px;">${rate}%</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.05em;">Rate</div>
      </td>
      <td style="flex:1;padding:14px 16px;text-align:center;">
        <div style="font-size:22px;font-weight:700;display:inline-block;background:${pctBg};color:${pctColor};border-radius:6px;padding:1px 8px;">${cs.freshToday}/${cs.totalExpected}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.05em;">Reported</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:22px 24px;">

    <!-- ORG PULSE -->
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:18px;"><tr>
      <td style="padding:13px 16px;background:#f8fafc;border-radius:8px;border-left:4px solid #6366f1;font-size:13px;color:#334155;line-height:1.75;">
        ${data.organizationPulse}
      </td>
    </tr></table>

    ${alertsSection}
    ${progressSection}

    ${data.departments.map(emailDeptSection).join("")}

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
