# OrgRise — Fix Light Mode Flatness (Layered Backgrounds)

Execute ALL changes. Do not ask for approval.

---

## THE PROBLEM

Light mode currently has white cards on a white background. There is no visible layering, so everything feels flat. The fix is a 3-tier background system:

- **Page background** — soft tinted gray (visible behind everything)
- **Card backgrounds** — pure white (lifts off the page)
- **Section accent strips** — tinted backgrounds for headers and dividers

This creates depth WITHOUT borders doing all the work.

---

## PART 1 — UPDATE C_LIGHT PALETTE

Open `lib/report-renderer.ts`. Find `C_LIGHT` palette. Update these specific values:

```typescript
const C_LIGHT: Palette = {
  // PAGE BACKGROUND — visibly tinted, NOT white
  pageBodyBg:        "#eef2f7",   // Cool blue-gray — provides clear contrast against white cards
  pageBg:            "#ffffff",   // White email card container
  
  // SECTION BACKGROUNDS
  navy:              "#1e293b",   // Dark navy header bar (top of email)
  bgPrimary:         "#ffffff",   // Pure white person card body
  bgSecondary:       "#f1f5f9",   // Tinted gray for nested sections, time bar tracks, pipeline tiles
  bgPct:             "#e0e7ff",   // Indigo-tinted percentage badges
  
  // STATUS BACKGROUNDS — saturated for visual punch
  bgSuccess:         "#d1fae5",
  bgWarning:         "#fef3c7",
  bgDanger:          "#fee2e2",
  bgProgress:        "#ecfdf5",   // Faint mint for notable progress card
  
  // BORDERS — strong enough to be visible
  borderTertiary:    "#cbd5e1",   // Slate-300, clearly visible
  borderSuccess:     "#86efac",
  borderProgress:    "#86efac",
  
  // TEXT — high contrast
  textPrimary:       "#0f172a",   // Near black
  textSecondary:     "#334155",   // Strong slate
  textTertiary:      "#64748b",   // Lighter slate for labels
  textInfo:          "#4338ca",   // Deep indigo
  textSuccess:       "#15803d",
  textWarning:       "#b45309",
  textDanger:        "#b91c1c",
  textProgress:      "#14532d",
  textProgressLabel: "#15803d",
  textDue:           "#64748b",
  textDueOd:         "#b91c1c",
  textDueUrgent:     "#b45309",
  
  radiusLg:          "12px",
  radiusMd:          "8px",
  
  bullet:            "#4338ca",
  bar1:              "#4338ca",
  bar2:              "#059669",
  bar3:              "#d97706",
  bar4:              "#7c3aed",
  bar5:              "#475569",
  
  // HEADER ACCENTS — dark navy headers on white cards
  headerAccent:       "#1e293b",   // Dark slate header background
  headerAccentBorder: "#4338ca",   // Deep indigo accent border
  headerAccentText:   "#f1f5f9",   // Near-white text on dark header
  buttonBg:           "#4338ca",
  buttonText:         "#ffffff",
};
```

---

## PART 2 — ADD A SECOND TIER OF SECTION TINTING

The current rendering treats all section backgrounds as either page background or card background. We need a third tier — section header strips and divider areas — that uses `bgSecondary` (`#f1f5f9` for light, `#0f172a` for dark) to break up the white expanse.

### 2A. Wrap each major section in a tinted container

Open `lib/report-renderer.ts`. Find `renderEmailHtml()`. The current structure for non-Outlook is:

```html
<tr><td style="padding:20px 28px 8px;">
  <table>
    ${emailNeedsAttention(...)}
    ${emailNotableProgress(...)}
    ...individual reports...
  </table>
</td></tr>
```

We need to add subtle tinted "rails" between sections. Update each section's wrapper to include a tinted background strip.

In `emailNeedsAttention()`, find the outer card wrapper. Currently:
```html
<table ... style="background-color:${c.bgPrimary}; border:1px solid ${c.borderTertiary}; ...
```

Wrap it in an outer tinted td:

```html
<tr><td style="padding:8px 0 24px; font-family:Arial,Helvetica,sans-serif;">
  <div style="background-color:${c.bgSecondary}; padding:16px; border-radius:14px; -webkit-border-radius:14px;">
    <div style="${e.secLabel}">🔥 Needs attention now</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${c.bgPrimary}; border:1px solid ${c.borderTertiary}; border-radius:12px; -webkit-border-radius:12px; overflow:hidden;">
    <tr><td style="padding:14px 20px; font-family:Arial,Helvetica,sans-serif;">
    ${rows}
    </td></tr>
    </table>
  </div>
</td></tr>
```

This puts a tinted gray rail around the white attention card so it visibly sits on a colored surface.

Apply the same pattern to `emailNotableProgress()` and the Individual Reports section. Each gets a `bgSecondary` rail wrapper.

### 2B. Tint the page wrapper differently from the card

In `renderEmailHtml()`, the outer wrapper currently has:

```html
<body style="margin:0; padding:0; background-color:${c.pageBodyBg};">
<table ... style="background-color:${c.pageBodyBg};">
<tr><td align="center" style="padding:32px 20px;">
<table ... width="700" style="... background-color:${c.pageBg}; border:1px solid ${c.borderTertiary};">
```

This is correct — the body is `pageBodyBg` (`#eef2f7`) and the inner card is `pageBg` (`#ffffff`). With the new palette values, this will properly create the lifted-card effect.

Increase the outer padding to give the card more room to "float":

```html
<tr><td align="center" style="padding:40px 20px;">
```

And add a subtle shadow to the main card. Find:
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" style="max-width:700px; ...">
```

Add the shadow inline (it works in iPhone, Gmail web, Apple Mail — Outlook ignores it):
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" style="max-width:700px; table-layout:fixed; word-wrap:break-word; overflow:hidden; background-color:${c.pageBg}; border:1px solid ${c.borderTertiary}; box-shadow:0 4px 24px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06);">
```

### 2C. Tint the person card body so it's not flat white-on-white

The person card body is currently `bgPrimary` (white). Change it so the body is `bgSecondary` (tinted) and only the header strip is the dark accent. This means the white card has a tinted interior that breaks up the white expanse.

Wait — that's actually backwards for what we want. The person card should be white on a tinted rail. So:

In `emailPersonCard()`, the table wrapper:
```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${c.bgPrimary}; border:1px solid ${c.borderTertiary}; border-radius:12px; ...
```

Stays as `bgPrimary` (white) — that's correct.

But wrap the person card in a tinted container at the call site. In `emailDeptSection()`, the people are mapped like:
```typescript
const personCards = (dept.people ?? []).map((p, i) => emailPersonCard(p, ctx, c, e, startIdx + i)).join("");
return deptBar + personCards;
```

Wrap the personCards in a tinted div:
```typescript
return deptBar + `<div style="background-color:${c.bgSecondary}; padding:16px; border-radius:14px; -webkit-border-radius:14px; margin-bottom:24px;">${personCards}</div>`;
```

Now each department is a tinted "rail" that contains white person cards floating on top of the gray background. This is what creates the layered depth.

### 2D. Tint the time allocation track

In `emailTimeBars()`, the empty bar track is currently `#1e293b` (dark mode hardcoded). Make sure it uses `${c.bgSecondary}`:

Find:
```html
<td width="${rest}%" height="8" bgcolor="#1e293b" style="background-color:#1e293b; ...">
```

Replace with:
```html
<td width="${rest}%" height="8" bgcolor="${c.bgSecondary}" style="background-color:${c.bgSecondary}; ...">
```

Also the time bar SECTION wrapper. Wrap the time bars in a subtle tinted box so they feel like a distinct subsection:

Find the return statement of `emailTimeBars()`:
```typescript
  return `<tr><td style="padding-top:14px; border-top:1px solid #1e293b;">
  <div style="${e.catLabel} margin-bottom:6px;">${labelText}</div>
  <table ...>${note}${rows}</table>
</td></tr>`;
```

Change to:
```typescript
  return `<tr><td style="padding-top:16px;">
    <div style="background-color:${c.bgSecondary}; padding:14px 16px; border-radius:8px; -webkit-border-radius:8px; border:1px solid ${c.borderTertiary};">
      <div style="${e.catLabel} margin-bottom:8px;">${labelText}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${note}${rows}</table>
    </div>
  </td></tr>`;
```

The time allocation now sits in a tinted rounded box at the bottom of each person card.

### 2E. Pipeline grid tile backgrounds

In `emailPipelineGrid()`, the tile cells already use `bgcolor="#0f172a"` (hardcoded dark). Change to `${c.bgSecondary}`:

```html
<td width="33%" align="center" bgcolor="${c.bgSecondary}" style="background-color:${c.bgSecondary}; padding:14px 10px; border:1px solid ${c.borderTertiary}; ...
```

This makes the pipeline tiles tinted gray boxes on light mode and dark slate on dark mode.

---

## PART 3 — VERIFY THE LAYERING

After applying all changes, the visual hierarchy in light mode should be:

1. **Outermost layer:** `#eef2f7` page background (cool blue-gray) — visible around the edges of the email
2. **Email card:** `#ffffff` white with subtle shadow and visible border, sitting on the page background
3. **Section rails:** `#f1f5f9` tinted gray boxes wrapping each major section (Needs Attention, Notable Progress, each Department)
4. **Inner cards:** `#ffffff` white person cards sitting INSIDE the tinted rails
5. **Card sub-sections:** `#f1f5f9` tinted boxes for time allocation and pipeline grids INSIDE the white person cards

That's 5 distinct visual layers creating real depth, instead of the current flat-white wasteland.

---

## VERIFY

1. Send a test report in light mode
2. The email should NOT look flat
3. You should clearly see:
   - Tinted page background around the email
   - White email card with shadow lifting it off the page
   - Each section sitting on a tinted gray rail
   - White person cards inside the rails
   - Time allocation in a tinted sub-box inside each card
4. Dark mode should be unchanged
