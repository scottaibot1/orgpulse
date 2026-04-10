# OrgRise — Light Mode Redesign (Proper, Not Flat)

Execute ALL changes. Do not ask for approval.

---

## THE PROBLEM WITH THE CURRENT LIGHT MODE

The current light mode is a flat inverted dark mode. It has no visual identity, washed out text, invisible borders, and zero hierarchy. We are rebuilding it as a real design.

## DESIGN PRINCIPLES FOR LIGHT MODE

- **Strong contrast** — primary text must be near-black (#0f172a or #1e293b), not slate gray
- **Tinted section backgrounds** — different sections get subtly different background tints to create visual rhythm
- **Bolder borders** — use #cbd5e1 or #94a3b8 for cards, not the invisible #e2e8f0
- **Saturated accents** — indigo, emerald, amber, rose at full saturation — not pastels
- **Header accent that pops** — gradient or solid indigo like Linear/Notion use, not pale lavender
- **Generous spacing** — light mode needs MORE padding than dark mode to feel premium

---

## PART 1 — REPLACE C_LIGHT PALETTE

Open `lib/report-renderer.ts`. Find the `C_LIGHT` palette definition (around line 153). Replace it ENTIRELY with:

```typescript
const C_LIGHT: Palette = {
  // Backgrounds — layered grays with subtle warmth
  pageBodyBg:        "#f1f5f9",   // Cool gray page background — has presence, not pure white
  pageBg:            "#ffffff",   // Card containers
  navy:              "#1e293b",   // Header bar — DARK navy header on light body for premium contrast
  bgPrimary:         "#ffffff",   // Person card background
  bgSecondary:       "#f8fafc",   // Subtle alternate background for nested sections
  bgPct:             "#e0e7ff",   // Indigo-tinted percentage badge
  
  // Status backgrounds — saturated, not pastel
  bgSuccess:         "#d1fae5",   // Mint green
  bgWarning:         "#fef3c7",   // Warm amber
  bgDanger:          "#fee2e2",   // Soft rose
  bgProgress:        "#ecfdf5",   // Faint mint for notable progress
  
  // Borders — visible, not ghosts
  borderTertiary:    "#cbd5e1",   // Strong enough to actually see
  borderSuccess:     "#86efac",   // Saturated green border
  borderProgress:    "#86efac",
  
  // Text — near-black for primary, real grays for secondary
  textPrimary:       "#0f172a",   // Near black — strong contrast
  textSecondary:     "#334155",   // Mid slate — readable
  textTertiary:      "#64748b",   // Lighter slate for muted labels
  textInfo:          "#4338ca",   // DEEP indigo — saturated, premium
  textSuccess:       "#15803d",   // Forest green
  textWarning:       "#b45309",   // Burnt amber
  textDanger:        "#b91c1c",   // Rich red
  textProgress:      "#14532d",   // Dark forest
  textProgressLabel: "#15803d",
  textDue:           "#64748b",
  textDueOd:         "#b91c1c",
  textDueUrgent:     "#b45309",
  
  radiusLg:          "12px",
  radiusMd:          "8px",
  
  // Bullet and bar colors — deeper, more saturated than dark mode equivalents
  bullet:            "#4338ca",
  bar1:              "#4338ca",   // Indigo
  bar2:              "#059669",   // Emerald
  bar3:              "#d97706",   // Amber
  bar4:              "#7c3aed",   // Violet
  bar5:              "#475569",   // Slate
  
  // Header accents — gradient-feel using solid colors
  headerAccent:       "#1e293b",  // Dark slate header background — pops on white card
  headerAccentBorder: "#4338ca",  // Indigo accent border
  headerAccentText:   "#e2e8f0",  // Light text on dark header
  buttonBg:           "#4338ca",  // Deep indigo button
  buttonText:         "#ffffff",
};
```

The key insight: **light mode person card headers use a DARK background**. This is what Linear and Notion do — light cards with dark headers create premium contrast and visual hierarchy. The person's name pops in white on dark navy, while the rest of the card is clean white.

---

## PART 2 — UPDATE RENDERING TO USE PALETTE PROPERLY

Several functions in `report-renderer.ts` have hardcoded colors that ignore the palette. Fix them:

### 2A. emailPersonCard() — header section

Find the person card header td. The current code uses hardcoded `#172554`, `#3b82f6`, `#ffffff`, `#93c5fd`. Replace those with palette references so the header adapts to theme:

Find:
```html
<tr><td style="padding:16px 20px; background-color:#172554; border-bottom:1px solid #3b82f6; border-radius:12px 12px 0 0; -webkit-border-radius:12px 12px 0 0; font-family:Arial,Helvetica,sans-serif;">
```

Replace with:
```html
<tr><td style="padding:18px 22px; background-color:${c.headerAccent}; border-bottom:2px solid ${c.headerAccentBorder}; border-radius:12px 12px 0 0; -webkit-border-radius:12px 12px 0 0; font-family:Arial,Helvetica,sans-serif;">
```

Also find the MSO version of the same line:
```html
<tr><td style="padding:16px 20px; background-color:#172554; border-bottom:1px solid #3b82f6;">
```

Replace with:
```html
<tr><td style="padding:18px 22px; background-color:${c.headerAccent}; border-bottom:2px solid ${c.headerAccentBorder};">
```

In the same function, find the person name div:
```html
<div style="font-size:15px; line-height:20px; mso-line-height-rule:exactly; font-weight:600; color:#ffffff; font-family:Arial,Helvetica,sans-serif;">${p.name}</div>
```

Replace with:
```html
<div style="font-size:16px; line-height:22px; mso-line-height-rule:exactly; font-weight:600; color:${c.headerAccentText}; font-family:Arial,Helvetica,sans-serif;">${p.name}</div>
```

And the meta div:
```html
<div style="font-size:12px; line-height:16px; mso-line-height-rule:exactly; color:#93c5fd; font-family:Arial,Helvetica,sans-serif; margin-top:2px;">${hoursStr}${viewLinkHtml ? ` · ${viewLinkHtml}` : ""}</div>
```

Replace with:
```html
<div style="font-size:12px; line-height:16px; mso-line-height-rule:exactly; color:${c.textTertiary === "#64748b" ? "#cbd5e1" : c.textTertiary}; font-family:Arial,Helvetica,sans-serif; margin-top:3px;">${hoursStr}${viewLinkHtml ? ` · ${viewLinkHtml}` : ""}</div>
```

(That conditional handles the fact that the meta text needs to be light when on a dark header — `#cbd5e1` is the light slate that pops on dark in both themes.)

Also update the person card outer table border. Find:
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1e293b; border:1px solid rgba(255,255,255,0.08); border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:16px;">
```

Replace with:
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${c.bgPrimary}; border:1px solid ${c.borderTertiary}; border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:18px;">
```

And find:
```html
<tr><td style="padding:16px 20px; background-color:#1e293b; font-family:Arial,Helvetica,sans-serif;">
```

(This is the body td, after the header.) Replace with:
```html
<tr><td style="padding:18px 22px; background-color:${c.bgPrimary}; font-family:Arial,Helvetica,sans-serif;">
```

### 2B. emailDeptSection() — department header bar

Find the department bar block. Currently:
```html
<tr>
    <td width="4" bgcolor="#3b82f6" style="background-color:#3b82f6; font-size:0; line-height:0;">&nbsp;</td>
    ...
    <td bgcolor="#172554" style="background-color:#172554; padding:12px 16px; border:1px solid #3b82f6; ...
```

Replace the hardcoded colors with palette references:
```html
<tr>
    <td width="4" bgcolor="${c.headerAccentBorder}" style="background-color:${c.headerAccentBorder}; font-size:0; line-height:0;">&nbsp;</td>
    ...
    <td bgcolor="${c.headerAccent}" style="background-color:${c.headerAccent}; padding:14px 18px; border:1px solid ${c.headerAccentBorder}; ...
```

And the dept name text:
```html
<td style="font-size:14px; line-height:20px; mso-line-height-rule:exactly; font-weight:600; color:#93c5fd; ...">${dept.emoji} ${dept.name}</td>
```

Replace with:
```html
<td style="font-size:15px; line-height:22px; mso-line-height-rule:exactly; font-weight:600; color:${c.headerAccentText}; ...">${dept.emoji} ${dept.name}</td>
```

### 2C. emailNeedsAttention() — card background and borders

Find the Needs Attention card wrapper. Replace hardcoded `#1e293b` background and `rgba(255,255,255,0.08)` border with `${c.bgPrimary}` and `${c.borderTertiary}`.

Also update the row separator borders inside the card. Currently `border-bottom:1px solid #1e293b` — replace with `border-bottom:1px solid ${c.borderTertiary}`.

The text colors in attention rows: `color:#f1f5f9` and `color:#e2e8f0` should both become `${c.textPrimary}`.

### 2D. emailNotableProgress() — green section

Find the notable progress card wrapper. Currently:
```html
<table ... style="background-color:#0d2818; border:1px solid #166534; ...
```

Replace with:
```html
<table ... style="background-color:${c.bgProgress}; border:1px solid ${c.borderProgress}; ...
```

The label color `#4ade80` → `${c.textProgressLabel}`. The item text `#d1fae5` → `${c.textProgress}`.

### 2E. emailPulse() — pulse section

Find the pulse section background. Currently `background-color:#0f172a`. Replace with `${c.pageBg}` for light mode (so the pulse sits on a white card with the dark navy headline box inside it).

The headline box currently uses `#1e293b` background — replace with `${c.headerAccent}` so it becomes the dark accent box on light mode (white card with dark navy headline strip — very premium).

The headline text color `#f1f5f9` → `${c.headerAccentText}`.

The blue left accent border `#3b82f6` → `${c.headerAccentBorder}`.

### 2F. renderEmailHtml() — outer wrapper and body

Find the body tag and the outer wrapper table. Currently:
```html
<body style="margin:0; padding:0; background-color:#0f172a;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0f172a;">
```

Replace with:
```html
<body style="margin:0; padding:0; background-color:${c.pageBodyBg};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${c.pageBodyBg};">
```

Find the main content table:
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" style="max-width:700px; table-layout:fixed; word-wrap:break-word; overflow:hidden; background-color:#0f172a;">
```

Replace with:
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" style="max-width:700px; table-layout:fixed; word-wrap:break-word; overflow:hidden; background-color:${c.pageBg}; border:1px solid ${c.borderTertiary};">
```

(Adding a border around the entire email card so light mode has a defined edge.)

Find the header td:
```html
<tr><td style="background-color:#1e293b; padding:20px 28px 16px; ...
```

Replace with:
```html
<tr><td style="background-color:${c.navy}; padding:24px 32px 20px; ...
```

The `c.navy` value is `#1e293b` in BOTH themes — meaning even in light mode the very top header bar is dark navy. This creates the premium "dark header on white card" pattern.

The header text colors stay white because they're on a dark background regardless of theme. Verify these use white explicitly:
- Org name: `color:#ffffff`
- "Executive Summary" subtitle: `color:rgba(255,255,255,0.55)` (slightly more visible than current 0.45)
- Date: `color:rgba(255,255,255,0.75)` (slightly more visible than current 0.7)

### 2G. emailPipelineGrid() — tile backgrounds

Find the pipeline tile cells:
```html
<td width="33%" align="center" bgcolor="#0f172a" style="background-color:#0f172a; padding:12px 8px; border:1px solid rgba(255,255,255,0.06); ...
```

Replace with:
```html
<td width="33%" align="center" bgcolor="${c.bgSecondary}" style="background-color:${c.bgSecondary}; padding:14px 10px; border:1px solid ${c.borderTertiary}; ...
```

The tile number color and label color should also use palette references.

### 2H. emailTimeBars() — bar tracks

Find the empty track cell:
```html
<td width="${rest}%" height="8" bgcolor="#1e293b" style="background-color:#1e293b; ...">
```

Replace with:
```html
<td width="${rest}%" height="8" bgcolor="${c.bgSecondary}" style="background-color:${c.bgSecondary}; ...">
```

This makes the empty bar track light gray on light mode and dark slate on dark mode.

The label colors in time bars use hardcoded colors — replace `color:${c.textSecondary}` everywhere they appear and `color:#94a3b8` becomes `color:${c.textTertiary}`.

### 2I. emailTask() — task text and bullet colors

Find the task text td:
```html
taskFont: `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#e2e8f0;...
```

In `buildE()`, change to:
```typescript
taskFont: `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:${c.textPrimary};font-family:Arial,Helvetica,sans-serif;word-break:normal;word-wrap:break-word;mso-line-break-override:none;`,
taskSecond: `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:${c.textSecondary};font-family:Arial,Helvetica,sans-serif;word-break:normal;word-wrap:break-word;mso-line-break-override:none;`,
```

Find the bullet div in `emailTask()`:
```html
<div style="width:6px; height:6px; border-radius:50%; -webkit-border-radius:50%; background-color:#378ADD; ...
```

Replace with:
```html
<div style="width:6px; height:6px; border-radius:50%; -webkit-border-radius:50%; background-color:${c.bullet}; ...
```

---

## PART 3 — INCREASE LIGHT MODE SPACING

Light mode needs MORE breathing room than dark mode. In `renderEmailHtml()`, find the outer wrapper td:
```html
<tr><td align="center" style="padding:24px 16px;">
```

Make it conditional on theme:
```html
<tr><td align="center" style="padding:${c === C_LIGHT ? "32px 20px" : "24px 16px"};">
```

Or simpler — just increase to `32px 20px` for both themes. The extra padding helps both but is critical for light mode.

---

## PART 4 — ADD A SUBTLE SHADOW EFFECT FOR LIGHT MODE

Light mode cards feel premium when they have subtle shadows. Add a CSS class for non-MSO clients in the `<head>` of the email:

In `renderEmailHtml()`, find the `<style>` block in the head and add:

```css
@media screen {
  .light-card {
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
  }
}
```

Then add the `class="light-card"` attribute to the main content wrapper table when the theme is light. Outlook ignores the class so it has no effect there. Other clients render the subtle elevation.

---

## PART 5 — VERIFY

1. Send a test report in dark mode — should look the same as before, no regressions
2. Switch theme to light in settings
3. Send a test report in light mode — should show:
   - Cool gray page background (`#f1f5f9`)
   - White email card with visible border
   - DARK navy header bar with white text
   - DARK navy person card headers with light text and indigo border accent
   - White person card bodies with strong-contrast dark text
   - Saturated colored badges (deep indigo, forest green, burnt amber, rich red)
   - Mint-tinted notable progress section with dark green text
   - Visible borders everywhere
   - Generous spacing between sections
   - Subtle shadow on the main card (in webmail/iPhone, not Outlook)
4. Should NOT look like a flat washed-out wireframe

The result should feel like a premium product email — think Linear, Notion, Stripe, Vercel — not a default Bootstrap page.
