# OrgRise — Fix Outlook Header + Remove Print Auto-Prompt

Execute ALL changes. Do not ask for approval.

---

## FIX 1 — Replace Today's Pulse with a clean status header on Outlook

Open `lib/report-renderer.ts`, find the `renderEmailHtml()` function.

Find the `outlookPulseAndButton` variable. Replace its entire value with this:

```typescript
  const outlookPulseAndButton = `
  <tr><td style="background-color:#0f172a; padding:28px 28px 32px; font-family:Arial,Helvetica,sans-serif;">
    <!-- Status line -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
    <tr>
      <td style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:#94a3b8; font-family:Arial,Helvetica,sans-serif;">
        ${fresh} of ${cs?.totalExpected ?? fresh} reported &nbsp;·&nbsp; ${formattedDate}
      </td>
    </tr>
    </table>
    <!-- Big CTA button -->
    ${pdfUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%"><tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#4f46e5" style="background-color:#4f46e5;"><tr>
        <td style="padding:16px 40px; background-color:#4f46e5; font-family:Arial,Helvetica,sans-serif; text-align:center;">
          <a href="${pdfUrl}" style="color:#ffffff; text-decoration:none; font-size:15px; line-height:22px; mso-line-height-rule:exactly; font-weight:600; font-family:Arial,Helvetica,sans-serif;">View Full Report →</a>
        </td>
      </tr></table>
    </td></tr></table>` : ""}
    <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:#64748b; font-family:Arial,Helvetica,sans-serif; text-align:center; margin-top:14px;">Your full executive summary with detailed reports for each team member is available at the link above.</div>
  </td></tr>`;
```

Note: the variables `fresh`, `cs`, `formattedDate`, and `pdfUrl` are already available in the function scope. If `fresh` and `cs` are not currently defined before `outlookPulseAndButton`, move their definitions up. They should be computed from `data.completenessScore` like this (add BEFORE the outlookPulseAndButton declaration if not already present):

```typescript
  const cs = data.completenessScore;
  const fresh = cs?.freshToday ?? 0;
```

---

## FIX 2 — Remove the auto-print when accessed via email token link

The print route renders `<script>setTimeout(()=>window.print(),400);</script>` at the bottom of the PDF HTML. This causes an immediate print dialog when someone clicks the link from the email.

Find the `renderPdfHtml()` function in `lib/report-renderer.ts`. Near the end of the function (around line 866), find this line:

```typescript
<script>setTimeout(()=>window.print(),400);</script>
```

Replace it with a version that only auto-prints when there is NO token in the URL:

```typescript
<script>
  if (!new URLSearchParams(window.location.search).has('token')) {
    setTimeout(()=>window.print(),400);
  }
</script>
```

This means:
- If someone navigates to the print page manually (no token) — it auto-prints as before
- If someone clicks the link from the email (has token) — it just shows the report, no print dialog

---

## FIX 3 — PDF attachment (optional, best-effort)

The cleanest way to attach a PDF on Vercel without puppeteer is to NOT generate a PDF server-side. Instead, skip the attachment for now. The no-login link is the primary solution.

However, if you want to attempt an attachment, here is an approach using the `html-pdf-node` package which is lightweight and may work on Vercel:

### Option A — Using html-pdf-node (try this first)

Install:
```bash
npm install html-pdf-node
```

In the file that calls `sendSummaryEmail()` (likely the summary generation route or cron job), add:

```typescript
import htmlPdfNode from "html-pdf-node";
import { renderPdfHtml, parseAiSummary } from "@/lib/report-renderer";

// Before calling sendSummaryEmail:
let pdfBuffer: Buffer | undefined;
try {
  const parsed = parseAiSummary(markdown);
  if (parsed) {
    const pdfHtmlContent = renderPdfHtml(parsed, {
      orgName,
      summaryDate,
      totalSubmissions,
      missingSubmissions,
      createdAt: new Date(),
      pdfUrl,
      appUrl,
      theme,
      reportLinks,
    });
    // Remove the auto-print script from the HTML before converting
    const cleanHtml = pdfHtmlContent.replace(/<script>.*?<\/script>/gs, "");
    const file = { content: cleanHtml };
    const options = { format: "A4", printBackground: true, margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" } };
    pdfBuffer = await htmlPdfNode.generatePdf(file, options);
  }
} catch (pdfErr) {
  console.warn("[Email] PDF attachment generation failed (non-fatal):", pdfErr);
  // This is fine — email still sends without attachment
}
```

Then update `sendSummaryEmail` to accept and use it:

In `lib/email.ts`, add `pdfBuffer?: Buffer;` to the function parameter type (if not already there from a previous attempt).

In the Resend send call, add attachments:

```typescript
  const shortDateStr = summaryDate.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }).replace(/[,\s]+/g, "-");
  const attachments = pdfBuffer ? [{
    filename: `${orgName.replace(/[^a-zA-Z0-9]/g, "-")}-Executive-Summary-${shortDateStr}.pdf`,
    content: pdfBuffer,
  }] : undefined;

  const { error } = await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject,
    html,
    ...(attachments ? { attachments } : {}),
  });
```

### Option B — If html-pdf-node doesn't work on Vercel

Skip the attachment entirely. The signed URL link is working and that's the primary solution. Users can save the PDF from the browser if they need an offline copy.

If you try Option A and it fails to build or deploy, revert the html-pdf-node changes and move on. This is a nice-to-have, not a blocker.

---

## Verify

1. Trigger a test report
2. Open in Outlook — should see ONLY: header, "4 of 4 reported · [date]", big purple button, explanatory text, footer
3. Open on iPhone/Gmail — full detailed report, unchanged
4. Click "View Full Report" link — should open the PDF view in browser WITHOUT a print dialog
5. If PDF attachment was implemented: check email for .pdf attachment
