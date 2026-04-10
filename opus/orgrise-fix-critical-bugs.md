# OrgRise — Fix Empty Pulse, Floating PDF Button, Low-Contrast Tasks

Three critical bugs. Execute ALL changes. Do not ask for approval.

---

## BUG 1 — Today's Pulse headline is empty

Screenshots show a large empty gray box where the Today's Pulse text should be. The pulse text is not rendering.

Open `lib/report-renderer.ts`. Find the `emailPulse()` function (around line 1193).

Find this section:
```html
    <td bgcolor="#1e293b" style="background-color:#1e293b; padding:16px; font-family:Arial,Helvetica,sans-serif; border-radius:0 8px 8px 0; -webkit-border-radius:0 8px 8px 0;">
      <div style="font-size:16px; line-height:24px; mso-line-height-rule:exactly; font-weight:500; color:#f1f5f9; font-family:Arial,Helvetica,sans-serif; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${data.todaysPulse ?? ""}</div>
    </td>
```

The issue is either:
1. The hardcoded `#1e293b` background is making the text invisible in light mode (light background with light text), OR
2. The `data.todaysPulse` is actually empty/null from the AI output

Replace the entire pulse inner box with palette-aware version:
```html
    <td bgcolor="${c.headerAccent}" style="background-color:${c.headerAccent}; padding:18px 20px; font-family:Arial,Helvetica,sans-serif; border-radius:0 8px 8px 0; -webkit-border-radius:0 8px 8px 0;">
      <div style="font-size:16px; line-height:24px; mso-line-height-rule:exactly; font-weight:500; color:${c.headerAccentText}; font-family:Arial,Helvetica,sans-serif; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${data.todaysPulse || "No pulse summary available for this report."}</div>
    </td>
```

Two fixes applied:
- `bgcolor` and `color` now use palette references so they adapt to theme
- Added fallback text so if `todaysPulse` is null/empty, at least something shows instead of a blank box

Also add a console log to diagnose if the data is missing. At the top of `emailPulse()`, add:
```typescript
console.log(`[Email Pulse] todaysPulse value:`, JSON.stringify(data.todaysPulse));
```

This will help identify whether the AI is returning an empty string vs the rendering is broken.

---

## BUG 2 — Save as PDF button floating randomly on top of email

The "Save as PDF" button from the print route is appearing INSIDE the email HTML. This is because somewhere, the PDF HTML is being embedded or the print button CSS is leaking.

Open `lib/report-renderer.ts`. Find `renderPdfHtml()` (around line 815). Find this line (around line 843):

```typescript
<button class="print-btn" onclick="window.print()" style="position:fixed;top:20px;right:20px;background:#4f46e5;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;z-index:100;">Save as PDF</button>
```

This button is `position:fixed` which causes it to float over anything. If this HTML ever gets embedded into another context, the button goes rogue.

But more importantly — check if `renderPdfHtml` output is somehow being included in the email. Search the codebase for any place where `renderPdfHtml` output might be getting concatenated with `renderEmailHtml` output.

**Most likely cause:** the print route page is being rendered INSIDE an iframe or being fetched and the HTML is appearing where it shouldn't.

**Fix:** Change the Save as PDF button to NOT use `position:fixed`. Make it inline at the top of the page instead:

Find:
```typescript
<body>
<button class="print-btn" onclick="window.print()" style="position:fixed;top:20px;right:20px;background:#4f46e5;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;z-index:100;">Save as PDF</button>
<div class="page">
```

Replace with:
```typescript
<body>
<div class="page">
<div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
<button class="print-btn" onclick="window.print()" style="background:#4f46e5;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Save as PDF</button>
</div>
```

This makes the button inline within the page, so even if the HTML leaks somewhere it doesn't float over content.

**Also check:** inspect the email HTML output (open the email source via "View Original" in Gmail or Save As in mail client). Search for the string `Save as PDF` — if it appears in the email HTML, something is leaking PDF content into the email. If found, locate where and remove it.

---

## BUG 3 — Task text is low-contrast/grayed out in light mode

Looking at Alan's "In Progress — Active Projects" in the light mode screenshots, the task text is rendering in a very light gray that's almost invisible on the white background. This is because the task font style in `buildE()` uses a hardcoded dark-mode color.

Open `lib/report-renderer.ts`. Find `buildE()` (around line 481). Find these lines (around lines 499-500):

```typescript
    taskFont:     `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;word-break:normal;word-wrap:break-word;mso-line-break-override:none;`,
    taskSecond:   `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:${c.textSecondary};font-family:Arial,Helvetica,sans-serif;word-break:normal;word-wrap:break-word;mso-line-break-override:none;`,
```

The `taskFont` has a hardcoded `color:#e2e8f0` which is near-white — perfect for dark mode, invisible on light mode. Change it to use the palette:

```typescript
    taskFont:     `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:${c.textPrimary};font-family:Arial,Helvetica,sans-serif;word-break:normal;word-wrap:break-word;mso-line-break-override:none;`,
    taskSecond:   `font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:${c.textSecondary};font-family:Arial,Helvetica,sans-serif;word-break:normal;word-wrap:break-word;mso-line-break-override:none;`,
```

Also check for OTHER hardcoded light colors in `buildE()` that should be palette references. Search for these patterns in `buildE()`:
- `#f1f5f9` → `${c.textPrimary}`
- `#e2e8f0` → `${c.textPrimary}`
- `#94a3b8` → `${c.textSecondary}` or `${c.textTertiary}`
- `#64748b` → `${c.textTertiary}`
- `#475569` → `${c.textSecondary}`

Update each to use palette references.

Also in `emailPulse()`, check the blue accent left border. Find:
```html
<td width="4" bgcolor="#3b82f6" style="background-color:#3b82f6; font-size:0; line-height:0;">&nbsp;</td>
```

Replace with:
```html
<td width="4" bgcolor="${c.headerAccentBorder}" style="background-color:${c.headerAccentBorder}; font-size:0; line-height:0;">&nbsp;</td>
```

---

## BUG 4 — The "Pulse" label color

In `emailPulse()`, find:
```html
<div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; font-weight:500; color:#f59e0b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px; font-family:Arial,Helvetica,sans-serif;">⚡ Today's Pulse · ${dateLabel}</div>
```

The `#f59e0b` amber color works on dark mode but could use more saturation on light mode. This is actually fine — amber reads well on both. Leave it as-is unless it looks bad.

---

## BUG 5 — "376d OVERDUE" items at top

The Needs Attention section is showing items from 2025 (like "was due 4/10/25") with "376d OVERDUE" badges. These are data entry errors from source reports — someone typed "25" for year when they meant "26".

This isn't a code bug. It's a data quality issue. Two options:

**Option A — Cap the daysOverdue display at 90 days:**

In `lib/report-renderer.ts`, find `emailNeedsAttention()`. Find the badge text generation:
```typescript
      const badgeDual = item.status === "overdue"
        ? emailStatusBadgeDual(`OVERDUE${item.daysOverdue ? ` ${item.daysOverdue}d` : ""}`, "#7f1d1d", "#fca5a5")
```

Change to cap the display:
```typescript
      const displayDays = item.daysOverdue && item.daysOverdue > 90 ? "90d+" : (item.daysOverdue ? `${item.daysOverdue}d` : "");
      const badgeDual = item.status === "overdue"
        ? emailStatusBadgeDual(`OVERDUE${displayDays ? ` ${displayDays}` : ""}`, "#7f1d1d", "#fca5a5")
```

This way any item more than 90 days overdue shows as "90d+" which is cleaner than "376d".

**Option B — Add a stale filter in the AI prompt:**

Add this to the `executive-summary-v2.txt` critical reinforcements:

```
REINFORCEMENT 7 — STALE DATE DETECTION:
If a task's due date is more than 90 days in the past, flag it as potentially a data entry error in the text field. Include it in needsAttentionNow but add a note in the text like "(stale — verify due date)". Do not blindly report items as "376 days overdue" without context.
```

Do Option A for now — it's a quick visual fix. Option B can be a follow-up if the data quality issue persists.

---

## VERIFY

1. Send a test report in light mode
2. Today's Pulse should show the actual pulse text, NOT an empty box
3. No "Save as PDF" button floating in the email
4. Task text should be dark and readable on light mode
5. No "376d OVERDUE" — should cap at "90d+"
6. Dark mode should be unchanged

Check server logs for the `[Email Pulse] todaysPulse value:` log to confirm the AI is returning a non-empty pulse string.
