# OrgRise — Fix Outlook Conditional Split + PDF Button Placement

Execute ALL changes. Do not ask for approval.

---

## PROBLEM 1 — The Outlook conditional split is in the wrong place

The <!--[if mso]> / <!--[if !mso]> split needs to hide EVERYTHING after the Today's Pulse section from Outlook users. Currently Outlook is still seeing Needs Attention, Notable Progress, and Individual Reports.

Open `lib/report-renderer.ts`, find the `renderEmailHtml()` function.

The structure MUST be exactly this order:

```
HEADER (Plaza Properties / Executive Summary / Date) — BOTH see this
TODAY'S PULSE (headline + pills) — BOTH see this

<!--[if mso]>
  OUTLOOK ONLY CONTENT:
  - Stats bar (4 submitted, 100% rate, etc as big numbers)
  - Brief needs attention summary (top 5 items only)
  - Brief notable progress (one line summary)
  - BIG "View Full Report Online" button
  - "PDF report also attached" note
<![endif]-->

<!--[if !mso]><!-->
  NON-OUTLOOK CONTENT:
  - Full Needs Attention section
  - Full Notable Progress section  
  - Individual Reports label
  - All department sections with person cards
  - Not-expected departments
  - View & Download Full PDF Report button at bottom
<!--<![endif]-->

FOOTER (Plaza Properties · Confidential · Sent by OrgRise AI) — BOTH see this
```

The critical fix: find the `<tr><td>` that wraps the Needs Attention section call `${emailNeedsAttention(data, c, e)}` and everything after it up to but NOT including the footer. Wrap that entire block in `<!--[if !mso]><!--> ... <!--<![endif]-->`.

Then find the Outlook brief HTML block. It must be placed IMMEDIATELY AFTER the emailPulse() call and BEFORE the non-mso content. It must be wrapped in `<!--[if mso]> ... <![endif]-->`.

Make sure:
1. The `emailPulse()` output is NOT inside any conditional — both clients see it
2. The Outlook brief IS inside `<!--[if mso]>` — only Outlook sees it
3. The full report (needs attention, notable progress, individual reports) IS inside `<!--[if !mso]>` — only non-Outlook sees it
4. The footer IS NOT inside any conditional — both clients see it

If any of the Needs Attention, Notable Progress, or Individual Reports content is currently OUTSIDE the `<!--[if !mso]>` block, move it inside.

---

## PROBLEM 2 — "View Full Report Online" button needs to be at the TOP of the Outlook brief

Inside the Outlook-only section, the button should be the FIRST thing after the stats bar, not after Notable Progress. The Outlook brief layout should be:

1. Stats bar (big numbers: Submitted, Rate, Hours, Depts)
2. **"View Full Report Online →" button** — RIGHT HERE, big and prominent  
3. "📎 PDF report also attached to this email" note
4. Brief needs attention summary
5. Brief notable progress summary

The button is the primary call to action. It goes at the top, not buried at the bottom.

---

## PROBLEM 3 — PDF attachment not working

The PDF attachment via puppeteer likely failed because Vercel serverless functions don't support headless Chrome.

For now, remove the puppeteer-based PDF generation code if it was added. Instead, add a signed URL approach for the PDF link so users don't need to log in:

### Option A — Simple token-based approach

In the summary route that generates the email, create a simple time-limited token:

```typescript
import crypto from "crypto";

function generatePdfToken(summaryId: string, orgId: string): string {
  const secret = process.env.PDF_TOKEN_SECRET || process.env.RESEND_API_KEY || "orgrise-pdf-fallback";
  const expires = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const data = `${summaryId}:${orgId}:${expires}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex").slice(0, 16);
  return Buffer.from(`${data}:${sig}`).toString("base64url");
}
```

Then update the pdfUrl in `sendSummaryEmail` to include the token:

```typescript
const pdfToken = generatePdfToken(summaryId, orgId);
const pdfUrl = `${appUrl}/w/${orgId}/summary/${summaryId}/print?token=${pdfToken}`;
```

And in the print route, add token verification that bypasses auth:

```typescript
// At the top of the print route handler
const token = searchParams.get("token");
if (token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [sid, oid, expires, sig] = decoded.split(":");
    const secret = process.env.PDF_TOKEN_SECRET || process.env.RESEND_API_KEY || "orgrise-pdf-fallback";
    const expectedSig = crypto.createHmac("sha256", secret).update(`${sid}:${oid}:${expires}`).digest("hex").slice(0, 16);
    if (sig === expectedSig && parseInt(expires) > Date.now() && sid === summaryId && oid === orgId) {
      // Token valid — skip auth, render the PDF
    }
  } catch { /* invalid token, fall through to normal auth */ }
}
```

### Option B — If Option A is too complex for now

Just remove the login requirement from the print route entirely for now. The summary URLs contain unique IDs that are effectively unguessable. This is acceptable for an MVP — you can add proper auth later.

Pick whichever option is simpler to implement in the existing codebase.

---

## PROBLEM 4 — Remove the PDF attachment code if it was added

If the previous prompt added puppeteer-based PDF generation code that isn't working, remove it cleanly. The `pdfBuffer` parameter can stay in the type signature but don't try to generate it. Just pass `undefined`.

---

## Verify

1. Trigger a test report
2. Open in Outlook — should see ONLY: header, pulse, stats, button, brief attention summary, brief progress, footer
3. Open on iPhone — should see the FULL detailed report with all sections
4. The PDF link should open WITHOUT requiring login (if Option A or B was implemented)
5. No PDF attachment in the email (removed for now)
