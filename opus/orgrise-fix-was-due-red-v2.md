# OrgRise — Fix "Was Due" Red in Needs Attention (Both Views)

The previous "was due red" fix only addressed the `emailTask()` function used inside individual person cards. But the "was due" dates that appear in the **Needs Attention Now** section use DIFFERENT functions (`emailNeedsAttention` for email, `pdfNeedsAttention` for PDF) which don't use any red styling at all — they just concatenate the date into a generic gray metadata line.

This fix adds proper red styling to the Needs Attention sections in both views.

Execute ALL changes. Do not ask for approval.

---

## FIX 1 — Email: emailNeedsAttention()

Open `lib/report-renderer.ts`. Find the `emailNeedsAttention()` function (around line 1115).

Find this block (around line 1135-1144):

```typescript
      const dueStr = item.dueDate ? (() => {
        const iso = mdToISO(item.dueDate!);
        const fmt = fmtMD(iso);
        return item.status === "overdue" ? ` · was due ${fmt}` : ` · due ${fmt}`;
      })() : "";
      rows += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px; border-bottom:1px solid #1e293b;"><tr>
  <td width="22" valign="top" style="font-size:14px; line-height:20px; mso-line-height-rule:exactly; font-family:Arial,Helvetica,sans-serif; padding:8px 6px 8px 0;">${icon}</td>
  ${badgeDual ? `<td style="padding:8px 8px 8px 0; vertical-align:top; white-space:nowrap;">${badgeDual}</td>` : ""}
  <td style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:${c.textPrimary}; font-family:Arial,Helvetica,sans-serif; padding:8px 0; vertical-align:top; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${item.text}${dueStr}</td>
</tr></table>`;
```

Replace it with:

```typescript
      const dueStr = item.dueDate ? (() => {
        const iso = mdToISO(item.dueDate!);
        const fmt = fmtMD(iso);
        const isOverdue = item.status === "overdue";
        const prefix = isOverdue ? "was due" : "due";
        const dateColor = isOverdue ? "#f87171" : (item.status === "imminentlyDue" || item.status === "dueSoon" ? "#fcd34d" : c.textTertiary);
        return ` · <span style="color:${dateColor}; font-weight:600;">${prefix} ${fmt}</span>`;
      })() : "";
      rows += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px; border-bottom:1px solid #1e293b;"><tr>
  <td width="22" valign="top" style="font-size:14px; line-height:20px; mso-line-height-rule:exactly; font-family:Arial,Helvetica,sans-serif; padding:8px 6px 8px 0;">${icon}</td>
  ${badgeDual ? `<td style="padding:8px 8px 8px 0; vertical-align:top; white-space:nowrap;">${badgeDual}</td>` : ""}
  <td style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:${c.textPrimary}; font-family:Arial,Helvetica,sans-serif; padding:8px 0; vertical-align:top; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${item.text}${dueStr}</td>
</tr></table>`;
```

The change: the `dueStr` now wraps the "was due 4/10/25" portion in a `<span>` with explicit red color (`#f87171`) and bold weight (`font-weight:600`). Imminently due items get amber. Normal due dates stay tertiary gray.

---

## FIX 2 — PDF: pdfNeedsAttention()

In the same file, find the `pdfNeedsAttention()` function (around line 729).

Find this block (around line 738-753):

```typescript
  let rows = "";
  for (const item of items) {
    const badge = pdfAttnBadge(item);
    const icon = pdfAttnIcon(item);
    const dueStr = pdfDueStr(item, refDate);
    const pctStr = item.pctComplete != null ? ` · ${item.pctComplete}%` : "";
    const metaParts = [dueStr ? dueStr.replace(/^ · /, "") : null, pctStr ? pctStr.replace(/^ · /, "") : null, item.who, item.department].filter(Boolean);
    const meta = metaParts.join(" · ");
    rows += `<div class="attn-row">
  <div class="attn-icon">${icon}</div>
  <div class="attn-body">
    <div class="attn-title">${badge}${item.text}</div>
    ${meta ? `<div class="attn-meta">${meta}</div>` : ""}
  </div>
</div>`;
  }
```

Replace it with:

```typescript
  let rows = "";
  for (const item of items) {
    const badge = pdfAttnBadge(item);
    const icon = pdfAttnIcon(item);
    const dueStr = pdfDueStr(item, refDate);
    const pctStr = item.pctComplete != null ? ` · ${item.pctComplete}%` : "";
    const isOverdue = item.status === "overdue";
    const isUrgent = item.status === "imminentlyDue" || item.status === "dueSoon";
    
    // Build the due-date span with color based on status
    let dueDateSpan = "";
    if (dueStr) {
      const cleanDue = dueStr.replace(/^ · /, "");
      const dueColor = isOverdue ? c.textDueOd : (isUrgent ? c.textDueUrgent : c.textTertiary);
      dueDateSpan = `<span style="color:${dueColor}; font-weight:600;">${cleanDue}</span>`;
    }
    
    // Build the rest of the meta (pct, who, dept) in tertiary color
    const restParts = [pctStr ? pctStr.replace(/^ · /, "") : null, item.who, item.department].filter(Boolean);
    const restMeta = restParts.join(" · ");
    
    // Combine
    const metaHtml = [dueDateSpan, restMeta].filter(Boolean).join(` <span style="color:${c.textTertiary};">·</span> `);
    
    rows += `<div class="attn-row">
  <div class="attn-icon">${icon}</div>
  <div class="attn-body">
    <div class="attn-title">${badge}${item.text}</div>
    ${metaHtml ? `<div class="attn-meta">${metaHtml}</div>` : ""}
  </div>
</div>`;
  }
```

The change: split the meta line into two parts. The "was due 4/10/25" portion gets its own colored span (red for overdue, amber for due soon). The rest (percentage, person, department) stays in the tertiary gray. They're joined by a tertiary-colored separator dot.

---

## VERIFY

1. Run `npx tsc --noEmit` to verify no TypeScript errors
2. Trigger a test report
3. Open the PDF version — overdue items should show "was due 4/10/25" in BOLD RED with the rest of the meta (70% · Arturo Montes · Private Paradise) in normal gray
4. Open the email version (iPhone or Gmail) — overdue items in Needs Attention should show "was due 4/10/25" in BOLD RED inline with the task text
5. Items that are due soon (not overdue) should show in BOLD AMBER
6. Items with no urgency should show in normal gray
7. Dark mode and light mode should both display correctly

If anything throws an error, run `git diff lib/report-renderer.ts` and report the output. Do NOT commit until verified working.
