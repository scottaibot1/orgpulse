# OrgRise — Restructure to 3 Detail Levels + Light Mode Toggle

Execute ALL changes. Do not ask for approval.

---

## OVERVIEW

Two major changes:

1. **Collapse 5 detail levels into 3** — Pulse, Standard, Full Intelligence
2. **Add light mode toggle** — users can choose between dark and light email themes

---

## PART 1 — RESTRUCTURE DETAIL LEVELS (5 → 3)

### 1A. Update the AI prompt — `prompts/executive-summary-v2.txt`

Find the "Detail level guide" section (around lines 27-32). Replace it ENTIRELY with:

```
Detail level guide (3 levels total):

- Level 1 = PULSE: Minimal free-form summary. Output todaysPulse only as a 2-3 sentence narrative paragraph. Do NOT output departments (use empty array). Do NOT output needsAttentionNow, notableProgress, or individual person sections. Output completenessScore with totalExpected and freshToday. This level is for users who want a lightweight daily heartbeat without structured analysis. The todaysPulse sentence should cover: who reported, what happened at a high level, and any obvious concern. Example: "Alan, Antonio, Bella, and Arturo all reported in today. Reservations cleared a VRBO capacity violation and Sales advanced two hot leads toward decisions. Arturo continues to carry multiple overdue Private Paradise maintenance items." That is the entire output at Level 1 — one narrative paragraph plus completenessScore.

- Level 2 = STANDARD (default): Full structured output. Include todaysPulse, needsAttentionNow, waitingOnExternal, notableProgress, completenessScore, and departments with individual person sections. Cap ontack highlights at 6 per person. Include tomorrowfocus items. Include time allocation if explicitly reported OR if the person did not log hours (estimate in that case, set timeAllocationEstimated: true). Apply subcategory grouping for operations/property management roles regardless of count. This is the default experience — balanced detail, actionable, not overwhelming.

- Level 3 = FULL INTELLIGENCE: Same structure as Level 2 but unrestricted detail. No cap on ontack highlights except the max 20 per person from RULE 3. Include every task and every data point from every report. All time allocation. All subcategories for all roles. Full pipeline breakdowns. Every waiting-on-external item. Every stall detected. Every blocker. This is the "executive briefing deep dive" tier for users who want nothing left out.
```

### 1B. Update any code that references level 3, 4, or 5 as detail levels

Search the codebase for references to `reportDetailLevel` or `detailLevel`. Likely files: `lib/ai.ts`, `app/api/w/[orgId]/summary/route.ts`, settings UI files.

For backward compatibility, map old values to new values:
- Old Level 1 or 2 → New Level 1 (Pulse)
- Old Level 3 → New Level 2 (Standard)
- Old Level 4 or 5 → New Level 3 (Full Intelligence)

Add a migration helper in `lib/ai.ts` or similar:

```typescript
export function normalizeDetailLevel(level: number | undefined | null): 1 | 2 | 3 {
  if (level == null) return 2;
  if (level <= 1) return 1;
  if (level <= 3) return 2;
  return 3;
}
```

Use this helper everywhere a detail level is read from the database or settings before passing it to the AI prompt.

### 1C. Update the settings UI to show 3 options instead of 5

Find the detail level selector in the settings UI. Likely a file under `app/w/[orgId]/settings/` or `components/settings/`. Replace the 5-option selector with 3 options:

```tsx
<div>
  <label>Report Detail Level</label>
  <div className="space-y-3">
    <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-indigo-500">
      <input type="radio" name="detailLevel" value="1" checked={detailLevel === 1} onChange={() => setDetailLevel(1)} />
      <div>
        <div className="font-medium">Pulse</div>
        <div className="text-sm text-gray-500">Lightweight daily heartbeat. 2-3 sentence narrative summary of who reported and what happened. No structured breakdowns.</div>
      </div>
    </label>
    <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-indigo-500">
      <input type="radio" name="detailLevel" value="2" checked={detailLevel === 2} onChange={() => setDetailLevel(2)} />
      <div>
        <div className="font-medium">Standard <span className="text-xs text-indigo-600">(recommended)</span></div>
        <div className="text-sm text-gray-500">Balanced executive briefing. Today's Pulse, Needs Attention, Notable Progress, and individual team member sections with key tasks and time allocation.</div>
      </div>
    </label>
    <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-indigo-500">
      <input type="radio" name="detailLevel" value="3" checked={detailLevel === 3} onChange={() => setDetailLevel(3)} />
      <div>
        <div className="font-medium">Full Intelligence</div>
        <div className="text-sm text-gray-500">Every task, every data point, every subcategory. Full pipeline breakdowns and deep analysis. For executives who want nothing left out.</div>
      </div>
    </label>
  </div>
</div>
```

Adapt the styling to match the existing settings UI.

### 1D. Update the Pulse-level rendering

When `reportDetailLevel === 1`, the email should be dramatically simpler for all clients. Update `renderEmailHtml()` in `lib/report-renderer.ts` to detect Pulse mode and render a minimal email.

At the top of `renderEmailHtml()`, after computing `formattedDate`, add:

```typescript
  // Detect Pulse mode — if there are no departments with people, render minimal version
  const hasDepartments = (data.departments ?? []).some(d => !d.notExpectedToday && (d.people ?? []).length > 0);
  const isPulseMode = !hasDepartments && !data.needsAttentionNow?.length && !data.notableProgress?.length;
  
  if (isPulseMode) {
    // Minimal pulse email — header, narrative paragraph, footer
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Daily Pulse — ${orgName}</title>
<style type="text/css">
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  td { padding:0; }
</style>
</head>
<body style="margin:0; padding:0; background-color:${c.pageBodyBg};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${c.pageBodyBg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; background-color:${c.bgPrimary}; border:1px solid ${c.borderTertiary};">
  <tr><td style="padding:32px 36px;">
    <div style="font-size:11px; line-height:16px; color:${c.textTertiary}; text-transform:uppercase; letter-spacing:.1em; font-weight:500; font-family:Arial,Helvetica,sans-serif; margin-bottom:8px;">⚡ Daily Pulse · ${formattedDate}</div>
    <div style="font-size:20px; line-height:28px; font-weight:700; color:${c.textPrimary}; font-family:Arial,Helvetica,sans-serif; margin-bottom:20px;">${orgName}</div>
    <div style="font-size:15px; line-height:24px; color:${c.textPrimary}; font-family:Arial,Helvetica,sans-serif;">${data.todaysPulse ?? ""}</div>
    ${pdfUrl ? `<div style="margin-top:28px;">
      <a href="${pdfUrl}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; font-size:13px; font-weight:600; padding:12px 28px; font-family:Arial,Helvetica,sans-serif;">View Online →</a>
    </div>` : ""}
  </td></tr>
  <tr><td style="padding:16px 36px; border-top:1px solid ${c.borderTertiary};">
    <div style="font-size:10px; color:${c.textTertiary}; font-family:Arial,Helvetica,sans-serif;">${orgName} · Sent by OrgRise AI</div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }
```

This bypasses the complex structured email for Pulse mode and returns a clean minimal version. The rest of the function continues as normal for Levels 2 and 3.

---

## PART 2 — LIGHT MODE SUPPORT

The infrastructure is already partially built — `C_LIGHT` palette exists in `report-renderer.ts` and `pal()` returns it when `ctx.theme === "light"`. But many email functions have hardcoded dark colors instead of using the palette. Fix that and add the toggle.

### 2A. Replace hardcoded colors in email functions with palette references

Open `lib/report-renderer.ts`. Search for hardcoded hex color values in these functions and replace with palette references:

- `emailPulse()`
- `emailNeedsAttention()`
- `emailNotableProgress()`
- `emailPersonCard()`
- `emailDeptSection()`
- `emailTimeBars()`
- `emailPipelineGrid()`
- `renderEmailHtml()` (body background, header background, wrapper table background)

Specifically replace:
- `background-color:#0f172a` → `background-color:${c.pageBg}` (page body)
- `background-color:#1e293b` → `background-color:${c.bgPrimary}` (cards)
- `background-color:#172554` → `background-color:${c.navy}` (dept headers, person headers — but note: this is the dark navy accent which needs a different light-mode equivalent)
- `color:#ffffff` → `color:${c.textPrimary}`
- `color:#f1f5f9` → `color:${c.textPrimary}`
- `color:#e2e8f0` → `color:${c.textPrimary}`
- `color:#94a3b8` → `color:${c.textSecondary}`
- `color:#64748b` → `color:${c.textTertiary}`
- `color:#3b82f6` (blue accent) → `color:${c.textInfo}`
- `border:1px solid rgba(255,255,255,0.08)` → `border:1px solid ${c.borderTertiary}`
- Dark green notable progress `#0d2818` → `${c.bgProgress}`

For the dark navy accent used in person card headers (`#172554`) and department headers, add a new palette field called `headerAccent` that differs between dark and light modes.

### 2B. Add new palette fields for header accents

In the `Palette` interface (around line 109), add:

```typescript
  headerAccent: string;      // Person card header background
  headerAccentBorder: string; // Person card header border
  headerAccentText: string;   // Text color on header accent
  buttonBg: string;           // CTA button background
  buttonText: string;         // CTA button text
```

In `C_DARK`, add values:

```typescript
  headerAccent:       "#172554",
  headerAccentBorder: "#3b82f6",
  headerAccentText:   "#93c5fd",
  buttonBg:           "#4f46e5",
  buttonText:         "#ffffff",
```

In `C_LIGHT`, add values:

```typescript
  headerAccent:       "#eef2ff",
  headerAccentBorder: "#6366f1",
  headerAccentText:   "#4338ca",
  buttonBg:           "#4f46e5",
  buttonText:         "#ffffff",
```

Update `C_LIGHT` to have proper light mode values for all palette fields. The existing light palette (around line 153) needs these values:

```typescript
const C_LIGHT: Palette = {
  pageBodyBg:        "#f8fafc",
  pageBg:            "#ffffff",
  navy:              "#f1f5f9",
  bgPrimary:         "#ffffff",
  bgSecondary:       "#f8fafc",
  bgPct:             "#f1f5f9",
  bgSuccess:         "#dcfce7",
  bgWarning:         "#fef3c7",
  bgDanger:          "#fee2e2",
  bgProgress:        "#f0fdf4",
  borderTertiary:    "#e2e8f0",
  borderSuccess:     "#bbf7d0",
  borderProgress:    "#bbf7d0",
  textPrimary:       "#0f172a",
  textSecondary:     "#475569",
  textTertiary:      "#64748b",
  textInfo:          "#4f46e5",
  textSuccess:       "#15803d",
  textWarning:       "#92400e",
  textDanger:        "#991b1b",
  textProgress:      "#14532d",
  textProgressLabel: "#15803d",
  textDue:           "#64748b",
  textDueOd:         "#dc2626",
  textDueUrgent:     "#d97706",
  radiusLg:          "12px",
  radiusMd:          "8px",
  bullet: "#4f46e5", bar1: "#4f46e5", bar2: "#059669", bar3: "#d97706", bar4: "#7c3aed", bar5: "#64748b",
  headerAccent:       "#eef2ff",
  headerAccentBorder: "#6366f1",
  headerAccentText:   "#4338ca",
  buttonBg:           "#4f46e5",
  buttonText:         "#ffffff",
};
```

### 2C. Use palette in emailPersonCard() header section

Find the person card header in `emailPersonCard()`. The background is currently hardcoded `#172554`. Replace with `${c.headerAccent}`. The border `#3b82f6` → `${c.headerAccentBorder}`. The text color for the name `#ffffff` → `${c.textPrimary}`. The meta text `#93c5fd` → `${c.headerAccentText}`.

Do the same for the department header bar in `emailDeptSection()`.

### 2D. Add theme selector to settings UI

Find the workspace settings page. Add a theme toggle alongside the detail level selector:

```tsx
<div className="mt-6">
  <label>Email Theme</label>
  <div className="grid grid-cols-2 gap-3 mt-2">
    <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:border-indigo-500">
      <input type="radio" name="theme" value="dark" checked={theme === "dark"} onChange={() => setTheme("dark")} />
      <div>
        <div className="font-medium">Dark</div>
        <div className="text-xs text-gray-500">Navy background, high contrast</div>
      </div>
    </label>
    <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:border-indigo-500">
      <input type="radio" name="theme" value="light" checked={theme === "light"} onChange={() => setTheme("light")} />
      <div>
        <div className="font-medium">Light</div>
        <div className="text-xs text-gray-500">White background, clean</div>
      </div>
    </label>
  </div>
</div>
```

### 2E. Persist theme preference and pass through to email

Add a `emailTheme` column to the workspace/org settings table (or user settings, depending on where theme should be scoped). Default value: `"dark"`.

In the migration or schema file, add:

```sql
ALTER TABLE workspaces ADD COLUMN email_theme TEXT DEFAULT 'dark';
```

Or in Prisma schema:

```prisma
emailTheme String @default("dark")
```

When calling `sendSummaryEmail`, read this value and pass it as the `theme` parameter:

```typescript
await sendSummaryEmail({
  // ...existing params
  theme: workspace.emailTheme as "dark" | "light",
});
```

The `renderEmailHtml` function already accepts theme via `ctx.theme` and passes it to `pal(ctx)` which returns the correct palette.

---

## PART 3 — VERIFY

1. Run `npx tsc --noEmit` to verify no TypeScript errors
2. Check that old reports still generate correctly (backward compat)
3. Test all 3 detail levels:
   - Level 1 (Pulse): Should produce a minimal email with just a narrative paragraph
   - Level 2 (Standard): Full structured report with 6 tasks per person max
   - Level 3 (Full Intelligence): Unrestricted detail
4. Test both themes:
   - Dark mode: existing design, unchanged
   - Light mode: white background, dark text, indigo accents
5. Verify the settings UI shows the new 3 options and 2 themes
6. Verify theme preference persists across report generations

Do NOT mark as complete without verifying deployment.
