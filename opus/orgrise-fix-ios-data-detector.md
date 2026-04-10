# OrgRise — Disable iOS Date Auto-Detection in Email

The "due 4/15" appearing as an underlined slate-blue link in iOS Mail is caused by iOS Mail's data detector. It automatically finds dates, phone numbers, and addresses in email content and converts them to tappable links with iOS's default styling — completely overriding your inline CSS.

This is why:
- "due 4/4" shows in amber/orange (data detector partially overrides)
- "due 4/15" shows in slate blue underlined link (full data detector takeover)
- "was due 3/30" in Needs Attention works fine (different surrounding context)

Two fixes needed.

Execute ALL changes. Do not ask for approval.

---

## FIX 1 — Add x-apple-data-detectors meta tag

Open `lib/report-renderer.ts`. Find the `renderEmailHtml()` function. Find the `<head>` block (around line 1251):

```html
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Executive Summary — ${orgName}</title>
```

Add a new meta tag right after the viewport meta:

```html
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>Executive Summary — ${orgName}</title>
```

The `format-detection` tag tells most mail clients NOT to detect dates, phones, addresses, etc. The `x-apple-disable-message-reformatting` tag specifically tells Apple Mail to leave the email layout alone.

---

## FIX 2 — Wrap due dates in CSS that overrides Apple's data detector

Even with the meta tag, Apple Mail will still sometimes apply data detector styling to dates. The override is to use Apple's specific CSS class on the date span.

In the same file, add a `<style>` block inside the `<head>` (or update the existing one):

Find:
```html
<style type="text/css">
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  td { padding:0; }
  img { border:0; display:block; }
</style>
```

Replace with:
```html
<style type="text/css">
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  td { padding:0; }
  img { border:0; display:block; }
  /* Override iOS Mail data detector — stop auto-linking dates, phones, addresses */
  a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
    font-size: inherit !important;
    font-family: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important;
  }
  /* Force due date spans to override any auto-detection */
  .due-overdue {
    color: #f87171 !important;
    font-weight: 700 !important;
    text-decoration: none !important;
  }
  .due-urgent {
    color: #fcd34d !important;
    font-weight: 700 !important;
    text-decoration: none !important;
  }
  .due-normal {
    color: #94a3b8 !important;
    text-decoration: none !important;
  }
</style>
```

The `a[x-apple-data-detectors]` rule catches any auto-detected link in iOS Mail and forces it to inherit from its parent. The `.due-overdue` etc. classes provide explicit overrides we can apply with `class=""` attributes.

---

## FIX 3 — Apply CSS classes to due date spans in emailTask()

Find the `emailTask()` function. Find the dueHtml block:

```typescript
  if (dueDate) {
    const st = dueDateStatus(dueDate, ctx.summaryDate);
    const style = st === "overdue" ? e.dueOd : st === "urgent" ? e.dueUrgent : e.dueNormal;
    const prefix = st === "overdue" ? "was due " : "due ";
    dueHtml = ` <span style="${style}">· ${prefix}${fmtMD(dueDate, ctx.summaryDate)}</span>`;
  }
```

Replace with:
```typescript
  if (dueDate) {
    const st = dueDateStatus(dueDate, ctx.summaryDate);
    const style = st === "overdue" ? e.dueOd : st === "urgent" ? e.dueUrgent : e.dueNormal;
    const className = st === "overdue" ? "due-overdue" : st === "urgent" ? "due-urgent" : "due-normal";
    const prefix = st === "overdue" ? "was due " : "due ";
    dueHtml = ` <span class="${className}" style="${style}">· ${prefix}${fmtMD(dueDate, ctx.summaryDate)}</span>`;
  }
```

This adds the class attribute alongside the inline style. The CSS `!important` rules will override any data detector styling that iOS tries to apply.

---

## FIX 4 — Apply same fix in emailNeedsAttention()

In `emailNeedsAttention()`, find the dueStr block (around line 1135):

```typescript
      const dueStr = item.dueDate ? (() => {
        const iso = mdToISO(item.dueDate!);
        const fmt = fmtMD(iso);
        const isOverdue = item.status === "overdue";
        const prefix = isOverdue ? "was due" : "due";
        const dateColor = isOverdue ? "#f87171" : (item.status === "imminentlyDue" || item.status === "dueSoon" ? "#fcd34d" : c.textTertiary);
        return ` · <span style="color:${dateColor}; font-weight:700;">${prefix} ${fmt}</span>`;
      })() : "";
```

Replace with:
```typescript
      const dueStr = item.dueDate ? (() => {
        const iso = mdToISO(item.dueDate!);
        const fmt = fmtMD(iso);
        const isOverdue = item.status === "overdue";
        const isUrgent = item.status === "imminentlyDue" || item.status === "dueSoon";
        const prefix = isOverdue ? "was due" : "due";
        const dateColor = isOverdue ? "#f87171" : (isUrgent ? "#fcd34d" : c.textTertiary);
        const className = isOverdue ? "due-overdue" : isUrgent ? "due-urgent" : "due-normal";
        return ` · <span class="${className}" style="color:${dateColor}; font-weight:700;">${prefix} ${fmt}</span>`;
      })() : "";
```

---

## FIX 5 — Apply to PDF rendering as well

The `pdfNeedsAttention()` function should also get the override styling for consistency. But the PDF doesn't go through iOS Mail so this is just a styling cleanup.

In `pdfNeedsAttention()`, find:
```typescript
    let dueDateSpan = "";
    if (dueStr) {
      const cleanDue = dueStr.replace(/^ · /, "");
      const dueColor = isOverdue ? c.textDueOd : (isUrgent ? c.textDueUrgent : c.textTertiary);
      dueDateSpan = `<span style="color:${dueColor}; font-weight:600;">${cleanDue}</span>`;
    }
```

Change `font-weight:600` to `font-weight:700`:
```typescript
    let dueDateSpan = "";
    if (dueStr) {
      const cleanDue = dueStr.replace(/^ · /, "");
      const dueColor = isOverdue ? c.textDueOd : (isUrgent ? c.textDueUrgent : c.textTertiary);
      dueDateSpan = `<span style="color:${dueColor}; font-weight:700;">${cleanDue}</span>`;
    }
```

---

## VERIFY

1. Run `npx tsc --noEmit`
2. Trigger a test report
3. Check on iPhone Mail:
   - "due 4/4" should now be RED bold (not amber/orange link)
   - "due 4/15" should be normal gray text (not slate blue underlined link)
   - "was due 3/30" should still be RED bold in Needs Attention
4. Check that NO dates are auto-linked / underlined / styled blue

If any date still shows as a link, check Vercel logs for the `[emailTask]` diagnostic line and report what status it returned.
