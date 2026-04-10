# OrgRise — Centralize Design System Refactor

This refactors `lib/report-renderer.ts` to use a single source of truth for all colors, spacing, and typography. After this, changing a color requires editing ONE value in ONE place instead of hunting through 1300 lines.

Execute ALL steps in order. Do NOT ask for approval at any step. Do NOT skip steps.

---

## STEP 0 — CREATE RESTORE POINT

Before touching any code, create a git tag and a backup branch so we can return to this exact state instantly.

```bash
cd /Users/scott/orgpulse/opus
git add -A
git commit -m "Pre-refactor checkpoint" || echo "Nothing to commit"
git tag pre-design-refactor-2026-04-10
git branch backup/pre-design-refactor
git push origin pre-design-refactor-2026-04-10
git push origin backup/pre-design-refactor
```

If anything goes wrong later, return to this state with:
```bash
git checkout backup/pre-design-refactor -- lib/report-renderer.ts lib/email.ts
```

---

## STEP 1 — CREATE THE DESIGN TOKENS FILE

Create a new file `lib/design-tokens.ts`:

```typescript
// lib/design-tokens.ts
// SINGLE SOURCE OF TRUTH for all colors, spacing, typography in OrgRise emails and PDFs.
// To change a color anywhere in the app, change it ONCE here.

export type Theme = "dark" | "light";

export interface DesignTokens {
  // ── Page-level backgrounds (outermost) ──
  pageBodyBg: string;       // The body background behind the email card
  pageBg: string;           // The email card background

  // ── Section backgrounds ──
  sectionBg: string;        // Section card background (Needs Attention, person cards)
  sectionBgAlt: string;     // Subtle alternate (time bars, pipeline tiles)
  sectionRailBg: string;    // Tinted rail wrapping sections to create depth

  // ── Header accents (the "premium" navy + indigo treatment) ──
  headerBg: string;         // Top header bar of email
  headerText: string;       // Text on header bar
  headerSubtext: string;    // Subtitle text on header bar
  
  accentPrimary: string;    // PRIMARY accent — used for dept bars, person card headers, CTAs
  accentPrimaryBg: string;  // Background tint for accent areas
  accentPrimaryBorder: string; // Border on accent areas
  accentPrimaryText: string;   // Text on accent backgrounds
  
  // ── Text colors ──
  textPrimary: string;      // Body text — must be high contrast
  textSecondary: string;    // Slightly muted body text
  textTertiary: string;     // Labels, metadata
  textMuted: string;        // Lowest priority text
  textInverse: string;      // Text on dark backgrounds (always near-white)
  
  // ── Status colors ──
  textOverdue: string;      // BOLD RED for "was due"
  textUrgent: string;       // BOLD AMBER for due-soon
  textSuccess: string;
  textWarning: string;
  textDanger: string;
  
  // ── Status backgrounds ──
  bgOverdue: string;        // Background tint for overdue items
  bgSuccess: string;        // Notable progress green section
  bgWarning: string;
  bgDanger: string;
  borderSuccess: string;
  
  // ── Borders ──
  border: string;           // Default border
  borderStrong: string;     // Stronger border for emphasis
  
  // ── Bar chart colors (time allocation) ──
  bar1: string;
  bar2: string;
  bar3: string;
  bar4: string;
  bar5: string;
  bar6: string;
  
  // ── CTA button ──
  buttonBg: string;
  buttonText: string;
  
  // ── Layout ──
  radiusLg: string;
  radiusMd: string;
  radiusSm: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DARK MODE TOKENS
// ═══════════════════════════════════════════════════════════════════════════
export const DARK: DesignTokens = {
  pageBodyBg:    "#0f172a",
  pageBg:        "#0f172a",
  
  sectionBg:     "#1e293b",
  sectionBgAlt:  "#0f172a",
  sectionRailBg: "#1e293b",
  
  headerBg:      "#1e293b",
  headerText:    "#ffffff",
  headerSubtext: "rgba(255,255,255,0.6)",
  
  accentPrimary:       "#6366f1",  // Indigo — same as the View Full Report button
  accentPrimaryBg:     "#1e1b4b",  // Deep indigo background
  accentPrimaryBorder: "#6366f1",  // Bright indigo border
  accentPrimaryText:   "#c7d2fe",  // Light indigo text
  
  textPrimary:   "#f1f5f9",
  textSecondary: "#cbd5e1",
  textTertiary:  "#94a3b8",
  textMuted:     "#64748b",
  textInverse:   "#ffffff",
  
  textOverdue:   "#fca5a5",  // Bright red — readable on dark
  textUrgent:    "#fcd34d",  // Bright amber
  textSuccess:   "#86efac",
  textWarning:   "#fcd34d",
  textDanger:    "#fca5a5",
  
  bgOverdue:     "#7f1d1d",
  bgSuccess:     "#0d2818",
  bgWarning:     "#78350f",
  bgDanger:      "#7f1d1d",
  borderSuccess: "#166534",
  
  border:        "rgba(255,255,255,0.10)",
  borderStrong:  "rgba(255,255,255,0.20)",
  
  bar1: "#6366f1",
  bar2: "#10b981",
  bar3: "#f59e0b",
  bar4: "#8b5cf6",
  bar5: "#94a3b8",
  bar6: "#ec4899",
  
  buttonBg:   "#6366f1",
  buttonText: "#ffffff",
  
  radiusLg: "12px",
  radiusMd: "8px",
  radiusSm: "4px",
};

// ═══════════════════════════════════════════════════════════════════════════
// LIGHT MODE TOKENS
// ═══════════════════════════════════════════════════════════════════════════
export const LIGHT: DesignTokens = {
  pageBodyBg:    "#eef2f7",  // Cool blue-gray page background
  pageBg:        "#ffffff",  // White email card
  
  sectionBg:     "#ffffff",
  sectionBgAlt:  "#f1f5f9",
  sectionRailBg: "#f1f5f9",
  
  headerBg:      "#1e293b",  // Dark navy header on light email — premium contrast
  headerText:    "#ffffff",
  headerSubtext: "rgba(255,255,255,0.75)",
  
  accentPrimary:       "#6366f1",  // SAME indigo as dark mode — brand consistency
  accentPrimaryBg:     "#eef2ff",  // Pale indigo background
  accentPrimaryBorder: "#6366f1",  // Bright indigo border
  accentPrimaryText:   "#4338ca",  // Deep indigo text
  
  textPrimary:   "#0f172a",  // Near-black, strong contrast
  textSecondary: "#334155",  // Mid slate
  textTertiary:  "#64748b",
  textMuted:     "#94a3b8",
  textInverse:   "#ffffff",
  
  textOverdue:   "#dc2626",  // Strong red for white background
  textUrgent:    "#d97706",  // Burnt amber
  textSuccess:   "#15803d",
  textWarning:   "#b45309",
  textDanger:    "#b91c1c",
  
  bgOverdue:     "#fee2e2",
  bgSuccess:     "#ecfdf5",
  bgWarning:     "#fef3c7",
  bgDanger:      "#fee2e2",
  borderSuccess: "#86efac",
  
  border:        "#cbd5e1",
  borderStrong:  "#94a3b8",
  
  bar1: "#4338ca",
  bar2: "#059669",
  bar3: "#d97706",
  bar4: "#7c3aed",
  bar5: "#475569",
  bar6: "#db2777",
  
  buttonBg:   "#4338ca",
  buttonText: "#ffffff",
  
  radiusLg: "12px",
  radiusMd: "8px",
  radiusSm: "4px",
};

export function getTokens(theme: Theme = "dark"): DesignTokens {
  return theme === "light" ? LIGHT : DARK;
}
```

---

## STEP 2 — REPLACE PALETTE IN report-renderer.ts

Open `lib/report-renderer.ts`. At the top (after the existing imports), add:

```typescript
import { getTokens, DesignTokens, DARK, LIGHT } from "./design-tokens";
```

Find the existing `Palette` interface and the `C_DARK` and `C_LIGHT` constants. DELETE them entirely. They are replaced by `DesignTokens` from the new file.

Find the `pal()` function:
```typescript
function pal(ctx: RenderContext): Palette {
  return (ctx.theme ?? "dark") === "light" ? C_LIGHT : C_DARK;
}
```

Replace with:
```typescript
function pal(ctx: RenderContext): DesignTokens {
  return getTokens(ctx.theme ?? "dark");
}
```

Now find every reference to the old palette field names and update them. Use this mapping table:

| OLD field | NEW field |
|-----------|-----------|
| `c.pageBodyBg` | `c.pageBodyBg` (same) |
| `c.pageBg` | `c.pageBg` (same) |
| `c.navy` | `c.headerBg` |
| `c.bgPrimary` | `c.sectionBg` |
| `c.bgSecondary` | `c.sectionBgAlt` |
| `c.bgPct` | `c.sectionBgAlt` |
| `c.bgSuccess` | `c.bgSuccess` (same) |
| `c.bgWarning` | `c.bgWarning` (same) |
| `c.bgDanger` | `c.bgDanger` (same) |
| `c.bgProgress` | `c.bgSuccess` |
| `c.borderTertiary` | `c.border` |
| `c.borderSuccess` | `c.borderSuccess` (same) |
| `c.borderProgress` | `c.borderSuccess` |
| `c.textPrimary` | `c.textPrimary` (same) |
| `c.textSecondary` | `c.textSecondary` (same) |
| `c.textTertiary` | `c.textTertiary` (same) |
| `c.textInfo` | `c.accentPrimary` |
| `c.textSuccess` | `c.textSuccess` (same) |
| `c.textWarning` | `c.textWarning` (same) |
| `c.textDanger` | `c.textDanger` (same) |
| `c.textProgress` | `c.textSuccess` |
| `c.textProgressLabel` | `c.textSuccess` |
| `c.textDue` | `c.textTertiary` |
| `c.textDueOd` | `c.textOverdue` |
| `c.textDueUrgent` | `c.textUrgent` |
| `c.radiusLg` | `c.radiusLg` (same) |
| `c.radiusMd` | `c.radiusMd` (same) |
| `c.bullet` | `c.accentPrimary` |
| `c.bar1` | `c.bar1` (same) |
| `c.bar2` | `c.bar2` (same) |
| `c.bar3` | `c.bar3` (same) |
| `c.bar4` | `c.bar4` (same) |
| `c.bar5` | `c.bar5` (same) |
| `c.headerAccent` | `c.accentPrimaryBg` |
| `c.headerAccentBorder` | `c.accentPrimaryBorder` |
| `c.headerAccentText` | `c.accentPrimaryText` |
| `c.buttonBg` | `c.buttonBg` (same) |
| `c.buttonText` | `c.buttonText` (same) |

Use sed to do the bulk renames:

```bash
cd /Users/scott/orgpulse/opus

# Run these one at a time to avoid order conflicts
sed -i '' 's/c\.navy/c.headerBg/g' lib/report-renderer.ts
sed -i '' 's/c\.bgPrimary/c.sectionBg/g' lib/report-renderer.ts
sed -i '' 's/c\.bgSecondary/c.sectionBgAlt/g' lib/report-renderer.ts
sed -i '' 's/c\.bgPct/c.sectionBgAlt/g' lib/report-renderer.ts
sed -i '' 's/c\.bgProgress/c.bgSuccess/g' lib/report-renderer.ts
sed -i '' 's/c\.borderTertiary/c.border/g' lib/report-renderer.ts
sed -i '' 's/c\.borderProgress/c.borderSuccess/g' lib/report-renderer.ts
sed -i '' 's/c\.textInfo/c.accentPrimary/g' lib/report-renderer.ts
sed -i '' 's/c\.textProgressLabel/c.textSuccess/g' lib/report-renderer.ts
sed -i '' 's/c\.textProgress/c.textSuccess/g' lib/report-renderer.ts
sed -i '' 's/c\.textDueOd/c.textOverdue/g' lib/report-renderer.ts
sed -i '' 's/c\.textDueUrgent/c.textUrgent/g' lib/report-renderer.ts
sed -i '' 's/c\.textDue\b/c.textTertiary/g' lib/report-renderer.ts
sed -i '' 's/c\.bullet/c.accentPrimary/g' lib/report-renderer.ts
sed -i '' 's/c\.headerAccentBorder/c.accentPrimaryBorder/g' lib/report-renderer.ts
sed -i '' 's/c\.headerAccentText/c.accentPrimaryText/g' lib/report-renderer.ts
sed -i '' 's/c\.headerAccent/c.accentPrimaryBg/g' lib/report-renderer.ts
```

Then delete the old `Palette` interface and the `C_DARK` and `C_LIGHT` definitions from the file (they live in design-tokens.ts now).

Update any function that takes `c: Palette` to take `c: DesignTokens` instead. Use:

```bash
sed -i '' 's/c: Palette/c: DesignTokens/g' lib/report-renderer.ts
sed -i '' 's/c: Palette,/c: DesignTokens,/g' lib/report-renderer.ts
```

---

## STEP 3 — SWEEP HARDCODED HEX VALUES

Find every hardcoded hex color in `lib/report-renderer.ts` and replace with token references. Run:

```bash
grep -n "#[0-9a-fA-F]\{6\}" lib/report-renderer.ts | grep -v "design-tokens"
```

For each result, decide which token it should map to. Common cases to fix:

- `#0f172a` (dark page bg) → `${c.pageBg}` if a background, `${c.textPrimary}` if light mode text
- `#1e293b` (dark slate) → `${c.headerBg}` for headers, `${c.sectionBg}` for cards
- `#172554` (deep navy) → `${c.accentPrimaryBg}`
- `#3b82f6` (blue) → `${c.accentPrimaryBorder}` or `${c.accentPrimary}`
- `#4f46e5` / `#6366f1` (indigo) → `${c.accentPrimary}` or `${c.buttonBg}`
- `#f1f5f9` / `#e2e8f0` (light text) → `${c.textPrimary}` for dark mode, `${c.textInverse}` for headers
- `#94a3b8` / `#64748b` (slate gray) → `${c.textTertiary}`
- `#475569` (darker gray) → `${c.textMuted}` or `${c.textSecondary}`
- `#fca5a5` / `#ef4444` / `#f87171` (red) → `${c.textOverdue}`
- `#fcd34d` / `#f59e0b` (amber) → `${c.textUrgent}`
- `#86efac` / `#4ade80` / `#15803d` (green) → `${c.textSuccess}`
- `rgba(255,255,255,0.06)` / `rgba(255,255,255,0.08)` (subtle white border) → `${c.border}`

Functions to focus the sweep on (these are where most hardcoded colors live):
- `buildE()` 
- `emailTask()`
- `emailNeedsAttention()`
- `emailNotableProgress()`
- `emailPersonCard()`
- `emailDeptSection()`
- `emailTimeBars()`
- `emailPipelineGrid()`
- `emailPulse()`
- `renderEmailHtml()`
- `renderPdfHtml()`
- `pdfPersonCard()`
- `pdfDeptSection()`
- `pdfNeedsAttention()`
- `pdfNotableProgress()`
- `pdfPulse()`
- `buildPdfCss()`

After the sweep, run again to confirm only allowed hex values remain:
```bash
grep -n "#[0-9a-fA-F]\{6\}" lib/report-renderer.ts
```

The only hex values that should remain are inside default fallbacks (like `bordercolor="#334155"` HTML attributes that need a literal value because they're inside template strings) and the orange pulse label color `#f59e0b` (since that's a brand-style accent that doesn't need to switch).

---

## STEP 3.5 — VERIFY OUTLOOK CONDITIONAL IS INTACT

The email currently has a critical Outlook-only behavior: Outlook clients see ONLY the header, a status line ("X of Y reported · date"), a big "View Full Report" button, and the footer. iPhone/Gmail/Apple Mail see the FULL detailed report.

This is implemented with `<!--[if mso]>` conditional comments inside `renderEmailHtml()`. The refactor must preserve this exactly.

Run this check:
```bash
grep -c "if mso" lib/report-renderer.ts
grep -c "if !mso" lib/report-renderer.ts
```

Both should return at least 4 (or more) — these are the Outlook conditional comment markers. If the count is zero or low, the conditionals were broken by an earlier change.

Then specifically verify the structure in `renderEmailHtml()` is:

1. HEADER row — visible to BOTH (no conditional wrapper)
2. `<!--[if mso]>` … Outlook brief block (status line + big PDF button) … `<![endif]-->`
3. `<!--[if !mso]><!-->` … emailPulse + emailNeedsAttention + emailNotableProgress + dept rows + pdfCta … `<!--<![endif]-->`
4. FOOTER row — visible to BOTH (no conditional wrapper)

If the `outlookPulseAndButton` variable exists in `renderEmailHtml()` and is wrapped in `<!--[if mso]>`, you're good.

If it's missing or the conditional structure has been lost, restore it before continuing. The Outlook brief should look like this (preserving any existing token references after the sed sweep):

```typescript
  const cs = data.completenessScore;
  const fresh = cs?.freshToday ?? 0;
  
  const outlookPulseAndButton = `
  <tr><td style="background-color:${c.pageBg}; padding:28px 28px 32px; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
    <tr>
      <td style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:${c.textTertiary}; font-family:Arial,Helvetica,sans-serif;">
        ${fresh} of ${cs?.totalExpected ?? fresh} reported &nbsp;·&nbsp; ${formattedDate}
      </td>
    </tr>
    </table>
    ${pdfUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%"><tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="${c.buttonBg}" style="background-color:${c.buttonBg};"><tr>
        <td style="padding:16px 40px; background-color:${c.buttonBg}; font-family:Arial,Helvetica,sans-serif; text-align:center;">
          <a href="${pdfUrl}" style="color:${c.buttonText}; text-decoration:none; font-size:15px; line-height:22px; mso-line-height-rule:exactly; font-weight:600; font-family:Arial,Helvetica,sans-serif;">View Full Report →</a>
        </td>
      </tr></table>
    </td></tr></table>` : ""}
    <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:${c.textTertiary}; font-family:Arial,Helvetica,sans-serif; text-align:center; margin-top:14px;">Your full executive summary with detailed reports for each team member is available at the link above.</div>
  </td></tr>`;
```

And the structure inside the main return MUST have:

```typescript
  <!-- HEADER (both clients) -->
  <tr><td>...header content...</td></tr>

  <!--[if mso]>
  ${outlookPulseAndButton}
  <![endif]-->

  <!--[if !mso]><!-->
  ${emailPulse(data, ctx, c, e)}
  <tr><td>
    ...emailNeedsAttention, emailNotableProgress, deptRows, pdfCta...
  </td></tr>
  <!--<![endif]-->

  <!-- FOOTER (both clients) -->
  <tr><td>...footer content...</td></tr>
```

If this structure is intact, proceed. If broken, restore it before Step 4.

---

## STEP 4 — VERIFY COMPILATION

```bash
npx tsc --noEmit
```

If errors, fix them. Common errors:
- "Property 'X' does not exist on type 'DesignTokens'" → look at the mapping table above and use the correct new field name
- "Cannot find name 'C_DARK'" → remove the reference; the constant is now named `DARK` and lives in design-tokens.ts

Continue fixing until tsc reports zero errors. Do NOT proceed to Step 5 with errors.

---

## STEP 5 — RUN RENDER TEST

Create or update `scripts/test-render.ts`:

```typescript
import { renderEmailHtml, parseAiSummary, renderPdfHtml } from "../lib/report-renderer";
import fs from "fs";

const testJson = JSON.stringify({
  todaysPulse: "Test pulse to verify rendering across both themes.",
  needsAttentionNow: [
    { status: "overdue", daysOverdue: 5, dueDate: "2026-04-05", pctComplete: 50, who: "Test User", department: "Test Dept", text: "Test overdue task" },
    { status: "imminentlyDue", daysOverdue: null, dueDate: "2026-04-12", pctComplete: 25, who: "Test User", department: "Test Dept", text: "Test due soon task" }
  ],
  waitingOnExternal: [{ text: "Test waiting", who: "Test User" }],
  notableProgress: [{ department: "Test Dept", items: ["Test completed item"], overflowNote: null }],
  completenessScore: { totalExpected: 1, freshToday: 1, percentage: 100, standIns: [], missing: [], notScheduledToday: [] },
  departments: [{
    name: "Test Dept", emoji: "🧪", reportedCount: 1, totalCount: 1,
    statusLabel: "all reported", statusOk: true,
    people: [{
      name: "Test User", status: "fresh", isStandIn: false, daysSinceReport: 0,
      hoursWorked: 8, timeAllocation: [{ label: "Test Work", hours: 8, percent: 100 }],
      highlights: [
        { type: "ontack", text: "Test in-progress task", subcategory: "Category One" },
        { type: "ontack", text: "Another task · due 4/15", subcategory: "Category Two" },
        { type: "tomorrowfocus", text: "Plan for tomorrow" }
      ]
    }]
  }]
});

const parsed = parseAiSummary(testJson);
if (!parsed) { console.error("PARSE FAIL"); process.exit(1); }

const ctx = (theme: "dark" | "light") => ({
  orgName: "Test Organization",
  summaryDate: new Date(),
  totalSubmissions: 1,
  missingSubmissions: 0,
  createdAt: new Date(),
  pdfUrl: "https://example.com/pdf",
  appUrl: "https://example.com",
  theme,
});

try {
  const emailDark = renderEmailHtml(parsed, ctx("dark"));
  const emailLight = renderEmailHtml(parsed, ctx("light"));
  
  // Verify Outlook conditional structure exists
  const checks = [
    { name: "MSO conditional open", pattern: "<!--[if mso]>" },
    { name: "MSO conditional close", pattern: "<![endif]-->" },
    { name: "Non-MSO open", pattern: "<!--[if !mso]><!-->" },
    { name: "Non-MSO close", pattern: "<!--<![endif]-->" },
    { name: "Outlook View Full Report button", pattern: "View Full Report" },
    { name: "Pulse section (non-Outlook)", pattern: "Today's Pulse" },
  ];
  
  console.log("\n── Outlook conditional integrity ──");
  let allPassed = true;
  for (const check of checks) {
    const found = emailDark.includes(check.pattern);
    console.log(`  ${found ? "✓" : "✗"} ${check.name}`);
    if (!found) allPassed = false;
  }
  if (!allPassed) {
    console.error("\n✗ OUTLOOK CONDITIONAL CHECK FAILED — restore the conditional structure before deploying");
    process.exit(1);
  }
  
  fs.writeFileSync("/tmp/email-dark.html", emailDark);
  console.log("✓ Email dark rendered → /tmp/email-dark.html");
  fs.writeFileSync("/tmp/email-light.html", emailLight);
  console.log("✓ Email light rendered → /tmp/email-light.html");
  fs.writeFileSync("/tmp/pdf-dark.html", renderPdfHtml(parsed, ctx("dark")));
  console.log("✓ PDF dark rendered → /tmp/pdf-dark.html");
  fs.writeFileSync("/tmp/pdf-light.html", renderPdfHtml(parsed, ctx("light")));
  console.log("✓ PDF light rendered → /tmp/pdf-light.html");
  console.log("\nALL RENDERS PASSED");
  console.log("\nOpen these files in a browser to inspect:");
  console.log("  open /tmp/email-dark.html");
  console.log("  open /tmp/email-light.html");
  console.log("  open /tmp/pdf-dark.html");
  console.log("  open /tmp/pdf-light.html");
} catch (err) {
  console.error("RENDER FAIL:", err);
  if (err instanceof Error) console.error(err.stack);
  process.exit(1);
}
```

Run it:
```bash
npx tsx scripts/test-render.ts
```

If it fails, fix the error and try again. If it succeeds, open the files in a browser:
```bash
open /tmp/email-dark.html /tmp/email-light.html /tmp/pdf-dark.html /tmp/pdf-light.html
```

---

## STEP 6 — COMMIT AND DEPLOY

If Step 5 passed and all four files render correctly:

```bash
git add lib/design-tokens.ts lib/report-renderer.ts scripts/test-render.ts
git commit -m "Refactor: centralize design tokens for email and PDF rendering"
git push
```

Wait for Vercel to deploy.

---

## STEP 7 — REPORT BACK

Report the following:
1. Whether Step 0 (restore point creation) succeeded with the tag and branch names
2. Output of `npx tsc --noEmit` from Step 4
3. Output of `npx tsx scripts/test-render.ts` from Step 5
4. Whether the deploy in Step 6 succeeded

If anything fails, report the exact error and STOP. Do not attempt further changes until I respond.

---

## ROLLBACK INSTRUCTIONS (KEEP FOR REFERENCE)

If at any point the user wants to return to the pre-refactor state:

```bash
cd /Users/scott/orgpulse/opus
git checkout backup/pre-design-refactor -- lib/report-renderer.ts lib/email.ts
rm -f lib/design-tokens.ts
git add -A
git commit -m "Rollback to pre-refactor checkpoint"
git push
```

Or to fully reset to the tagged state:
```bash
git reset --hard pre-design-refactor-2026-04-10
git push --force-with-lease
```
