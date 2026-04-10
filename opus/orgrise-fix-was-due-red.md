# OrgRise — Fix "Was Due" Red Highlighting

Execute ALL changes. Do not ask for approval.

---

## THE BUG

The "was due" overdue dates aren't rendering in red because the email version of `emailTask()` calls `dueDateStatus(dueDate)` WITHOUT passing the report's reference date. It defaults to TODAY's actual calendar date, which means when comparing a March 31 due date against an April 7 today, the dates may be miscategorized OR the styling may not be applied because of date math edge cases.

The PDF version (`pdfTask()`) correctly passes `refDate` from `ctx.summaryDate`. The email version needs to do the same.

---

## THE FIX

Open `lib/report-renderer.ts`. Find the `emailTask()` function (around line 879).

The current signature is:
```typescript
function emailTask(h: HighlightItem, e: ES): string {
```

It needs access to `ctx` to get the summary date. Change the signature to:

```typescript
function emailTask(h: HighlightItem, e: ES, ctx: RenderContext): string {
```

Inside the function, find:
```typescript
  const { clean, dueDate, pct } = extractDuePct(h.text);
  const icon = iconType(h);
```

Change to:
```typescript
  const { clean, dueDate, pct } = extractDuePct(h.text);
  const icon = iconType(h, ctx.summaryDate);
```

Then find:
```typescript
  if (dueDate) {
    const st = dueDateStatus(dueDate);
    const style = st === "overdue" ? e.dueOd : st === "urgent" ? e.dueUrgent : e.dueNormal;
    const prefix = st === "overdue" ? "was due " : "due ";
    dueHtml = ` <span style="${style}">· ${prefix}${fmtMD(dueDate)}</span>`;
  }
```

Change to:
```typescript
  if (dueDate) {
    const st = dueDateStatus(dueDate, ctx.summaryDate);
    const style = st === "overdue" ? e.dueOd : st === "urgent" ? e.dueUrgent : e.dueNormal;
    const prefix = st === "overdue" ? "was due " : "due ";
    dueHtml = ` <span style="${style}">· ${prefix}${fmtMD(dueDate, ctx.summaryDate)}</span>`;
  }
```

---

## UPDATE ALL CALLERS OF emailTask()

Now find every place that calls `emailTask(h, e)` and update them to pass `ctx`:

In `emailPersonCard()`, find:
```typescript
      ontackHtml += emailTask(h, e);
```

Change to:
```typescript
      ontackHtml += emailTask(h, e, ctx);
```

Also find:
```typescript
    blockersHtml = `<tr><td style="padding:10px 0 4px;"><div style="${e.catLabel}">Blocked</div></td></tr>` + blockers.map(h => emailTask(h, e)).join("");
```

Change to:
```typescript
    blockersHtml = `<tr><td style="padding:10px 0 4px;"><div style="${e.catLabel}">Blocked</div></td></tr>` + blockers.map(h => emailTask(h, e, ctx)).join("");
```

Search the entire file for any other calls to `emailTask(` and update them all to pass `ctx` as the third argument.

---

## ALSO — MAKE THE RED MORE VIVID

The current `textDueOd` color is `#ef4444` which is okay but could be more attention-grabbing. Update both palettes:

In `C_DARK` (around line 146), change:
```typescript
  textDueOd:         "#ef4444",
```

To:
```typescript
  textDueOd:         "#f87171",   // Brighter red for dark mode visibility
```

In `C_LIGHT` (around line 177 or wherever the new C_LIGHT is), keep it as `#b91c1c` or `#dc2626` for strong contrast on white.

---

## ALSO — MAKE "was due" BOLD AND ADD AN ICON

Find the `dueOd` style in `buildE()` (around line 506):
```typescript
    dueOd:        `font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:${c.textDueOd};margin-left:4px;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;`,
```

Change to:
```typescript
    dueOd:        `font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:${c.textDueOd};margin-left:6px;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-weight:600;`,
```

(Adding `font-weight:600` makes overdue dates bold so they pop visually.)

---

## VERIFY

1. Send a test report
2. Check that any task with `was due` shows in BOLD RED
3. Items due within 7 days should still show in amber
4. Items due in the future should show in normal text color
5. Both dark mode and light mode should have visible overdue red text

Do not mark complete until verified.
