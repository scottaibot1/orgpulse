# OrgRise — Outlook Shows ONLY Header + PDF Button

Execute ALL changes. Do not ask for approval.

---

## THE GOAL

Outlook users should see ONLY:

1. Plaza Properties / Executive Summary / Date header
2. Today's Pulse headline (one sentence)
3. A big "View Full Report Online →" button
4. Footer

That's it. NOTHING else. No stats bar. No needs attention. No notable progress. No scorecard pills. No individual reports. Just the headline and the button.

Every other email client (iPhone, Gmail, Apple Mail, etc.) sees the FULL detailed report — unchanged from current.

---

## THE FIX

Open `lib/report-renderer.ts`, find the `renderEmailHtml()` function.

The ENTIRE body of the email between the header and the footer needs to be restructured as follows. Replace the full function with this structure:

```typescript
export function renderEmailHtml(data: AiSummaryData, ctx: RenderContext): string {
  const c = pal(ctx);
  const e = buildE(c);
  const { orgName, summaryDate, pdfUrl } = ctx;
  const formattedDate = summaryDate.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const notExpected = (data.departments ?? []).filter(d => d.notExpectedToday);
  const notExpectedRow = notExpected.length > 0
    ? `<tr><td style="padding:0 0 12px; font-family:Arial,Helvetica,sans-serif;"><div style="background-color:${c.bgSecondary}; padding:10px 16px; font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:${c.textSecondary}; font-family:Arial,Helvetica,sans-serif;">${notExpected.map(d => `${d.emoji} ${d.name} — ${d.scheduleLabel ?? "not reporting today"}`).join(" &nbsp;·&nbsp; ")}</div></td></tr>` : "";

  let personGlobalIdx = 0;
  const deptRows = (data.departments ?? [])
    .filter(d => !d.notExpectedToday)
    .map(d => {
      const html = `<tr><td style="font-family:Arial,Helvetica,sans-serif;">${emailDeptSection(d, ctx, c, e, personGlobalIdx)}</td></tr>`;
      personGlobalIdx += (d.people ?? []).length;
      return html;
    }).join("");

  const pdfCta = pdfUrl
    ? `<tr><td style="text-align:center; padding:16px 0 8px; font-family:Arial,Helvetica,sans-serif;"><a href="${pdfUrl}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; font-size:13px; line-height:20px; mso-line-height-rule:exactly; font-weight:600; padding:11px 26px; border-radius:8px; -webkit-border-radius:8px; font-family:Arial,Helvetica,sans-serif;">View &amp; Download Full PDF Report</a></td></tr>` : "";

  // ── Outlook-only: just the pulse text and a big PDF button ──
  const outlookPulseAndButton = `
  <tr><td style="background-color:#0f172a; padding:24px 28px 28px; font-family:Arial,Helvetica,sans-serif;">
    <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; font-weight:500; color:#f59e0b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px; font-family:Arial,Helvetica,sans-serif;">⚡ Today's Pulse</div>
    <div style="font-size:16px; line-height:26px; mso-line-height-rule:exactly; font-weight:500; color:#f1f5f9; font-family:Arial,Helvetica,sans-serif; margin-bottom:24px;">${data.todaysPulse ?? ""}</div>
    ${pdfUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%"><tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#4f46e5" style="background-color:#4f46e5;"><tr>
        <td style="padding:16px 40px; background-color:#4f46e5; font-family:Arial,Helvetica,sans-serif; text-align:center;">
          <a href="${pdfUrl}" style="color:#ffffff; text-decoration:none; font-size:15px; line-height:22px; mso-line-height-rule:exactly; font-weight:600; font-family:Arial,Helvetica,sans-serif;">View Full Report →</a>
        </td>
      </tr></table>
    </td></tr></table>` : ""}
    <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:#64748b; font-family:Arial,Helvetica,sans-serif; text-align:center; margin-top:12px;">Your full executive summary with detailed individual reports is available at the link above.</div>
  </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Executive Summary — ${orgName}</title>
<!--[if mso]>
<style type="text/css">
  body, table, td, p, a, li, div, span { font-family: Arial, Helvetica, sans-serif !important; }
  table { border-collapse: collapse !important; }
</style>
<![endif]-->
<style type="text/css">
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  td { padding:0; }
  img { border:0; display:block; }
</style>
</head>
<body style="margin:0; padding:0; background-color:#0f172a;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0f172a;">
<tr><td align="center" style="padding:24px 16px;">
<!--[if mso]>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" align="center" style="table-layout:fixed; width:700px;">
<tr><td style="width:700px; padding:0;">
<![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700" style="max-width:700px; table-layout:fixed; word-wrap:break-word; overflow:hidden; background-color:#0f172a;">

  <!-- ═══ HEADER — both clients see this ═══ -->
  <tr><td style="background-color:#1e293b; padding:20px 28px 16px; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td valign="top" style="font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:17px; line-height:24px; mso-line-height-rule:exactly; font-weight:700; color:#ffffff; font-family:Arial,Helvetica,sans-serif;">${orgName}</div>
        <div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:rgba(255,255,255,0.45); margin-top:3px; text-transform:uppercase; letter-spacing:.08em; font-family:Arial,Helvetica,sans-serif;">Executive Summary</div>
      </td>
      <td style="text-align:right; vertical-align:top; white-space:nowrap; padding-left:16px;">
        <div style="font-size:13px; line-height:18px; mso-line-height-rule:exactly; color:rgba(255,255,255,0.7); font-weight:500; font-family:Arial,Helvetica,sans-serif;">${formattedDate}</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- ═══ OUTLOOK ONLY — pulse headline + big PDF button, nothing else ═══ -->
  <!--[if mso]>
  ${outlookPulseAndButton}
  <![endif]-->

  <!-- ═══ NON-OUTLOOK — full detailed report ═══ -->
  <!--[if !mso]><!-->
  ${emailPulse(data, ctx, c, e)}
  <tr><td style="padding:20px 28px 8px; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${emailNeedsAttention(data, c, e)}
      ${emailNotableProgress(data, c)}
      <tr><td style="padding:20px 0 12px; font-family:Arial,Helvetica,sans-serif;"><div style="${e.secLabel}">👤 Individual reports</div></td></tr>
      ${deptRows}
      ${notExpectedRow}
      ${pdfCta}
    </table>
  </td></tr>
  <!--<![endif]-->

  <!-- ═══ FOOTER — both clients see this ═══ -->
  <tr><td style="padding:14px 28px; border-top:1px solid #1e293b; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:${c.textTertiary}; font-family:Arial,Helvetica,sans-serif;">${orgName} · Confidential</td>
      <td style="text-align:right; font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:${c.textTertiary}; font-family:Arial,Helvetica,sans-serif;">Sent by OrgRise AI</td>
    </tr></table>
  </td></tr>
</table>
<!--[if mso]>
</td></tr></table>
<![endif]-->
</td></tr>
</table>
</body>
</html>`;
}
```

This is the COMPLETE renderEmailHtml function. Replace the existing one entirely. Do not merge — replace.

Key points about this structure:
- The header `<tr>` is OUTSIDE any conditional — both clients see it
- The `outlookPulseAndButton` is inside `<!--[if mso]>` — ONLY Outlook sees it
- The emailPulse, emailNeedsAttention, emailNotableProgress, deptRows, and pdfCta are inside `<!--[if !mso]>` — ONLY non-Outlook sees them
- The footer `<tr>` is OUTSIDE any conditional — both clients see it

## ALSO — Make the PDF link work WITHOUT requiring login

The "View Full Report" link currently points to a route that requires authentication. Users clicking from email should NOT have to log in. Fix this with a signed token approach.

### Step A — Create a token utility

Create a new file `lib/pdf-token.ts`:

```typescript
import crypto from "crypto";

const SECRET = process.env.PDF_TOKEN_SECRET || process.env.RESEND_API_KEY || "orgrise-pdf-default-secret";

export function generatePdfToken(summaryId: string, orgId: string): string {
  const expires = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const data = `${summaryId}:${orgId}:${expires}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("hex").slice(0, 16);
  return Buffer.from(`${data}:${sig}`).toString("base64url");
}

export function verifyPdfToken(token: string, summaryId: string, orgId: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 4) return false;
    const [sid, oid, expiresStr, sig] = parts;
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || expires < Date.now()) return false;
    if (sid !== summaryId || oid !== orgId) return false;
    const expectedSig = crypto.createHmac("sha256", SECRET).update(`${sid}:${oid}:${expiresStr}`).digest("hex").slice(0, 16);
    return sig === expectedSig;
  } catch {
    return false;
  }
}
```

### Step B — Generate the signed URL in email.ts

Open `lib/email.ts`. At the top, add:

```typescript
import { generatePdfToken } from "@/lib/pdf-token";
```

In the `sendSummaryEmail` function, find where `pdfUrl` is created:

```typescript
const pdfUrl = `${appUrl}/w/${orgId}/summary/${summaryId}/print`;
```

Replace it with:

```typescript
const pdfToken = generatePdfToken(summaryId, orgId);
const pdfUrl = `${appUrl}/w/${orgId}/summary/${summaryId}/print?token=${pdfToken}`;
```

### Step C — Accept the token in the print route

Find the print route. It's likely at `app/w/[orgId]/summary/[summaryId]/print/page.tsx` or similar. At the very top of the route handler or page component, BEFORE any auth check, add token verification:

```typescript
import { verifyPdfToken } from "@/lib/pdf-token";

// At the top of the handler/component, before auth middleware
const token = searchParams?.token || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null);

// For Next.js App Router page:
// const searchParams = props.searchParams;
// const token = searchParams?.token;

if (token && typeof token === "string") {
  const isValid = verifyPdfToken(token, summaryId, orgId);
  if (isValid) {
    // Skip authentication — token is valid
    // Proceed directly to rendering the PDF/print view
    // Do NOT redirect to login
  }
}
```

The exact implementation depends on how auth is currently enforced on this route. Common patterns:

**If using middleware.ts for auth:** Add the print route with a token parameter to the public routes list, or check for the token in middleware before redirecting to login.

**If using a server component with auth check:** Add the token check before the auth check:

```typescript
export default async function PrintPage({ params, searchParams }: { params: { orgId: string; summaryId: string }; searchParams: { token?: string } }) {
  const { orgId, summaryId } = params;
  
  // Check for valid email token FIRST
  if (searchParams.token) {
    const isValid = verifyPdfToken(searchParams.token, summaryId, orgId);
    if (isValid) {
      // Render the report without requiring login
      // ... fetch summary data and render ...
      return <PrintView ... />;
    }
  }
  
  // No valid token — require normal auth
  const session = await getSession();
  if (!session) redirect("/login");
  // ... rest of existing auth logic ...
}
```

**If using getServerSession or similar:** Same pattern — check token first, skip session check if valid.

Find the auth pattern used in this route and add the token bypass BEFORE it. The key rule: if `verifyPdfToken` returns true, skip ALL authentication and render the report directly.

### Step D — Also apply the token to individual report links

In `report-renderer.ts`, find the `reportHref()` function (around line 340). It generates links to individual submitted reports. These links also require login currently.

The same token approach should work. Update the email version of these links to include a token as well. In the `sendSummaryEmail` function, generate tokens for each report link and pass them through the context.

However, this is a bigger change. For now, just fix the main "View Full Report" PDF link. Individual report links can be addressed in a follow-up.

---

## ALSO — Remove any PDF attachment code

If the previous prompt added pdfBuffer parameters, puppeteer imports, or attachment logic to email.ts or the summary route, remove all of it. We are not attaching PDFs for now. Keep the email simple — just HTML, no attachments.

## Verify

1. Trigger a test report
2. Open in Outlook desktop — should see ONLY: header bar, pulse headline, big purple "View Full Report →" button, a note about the full report, and the footer. NOTHING else.
3. Open on iPhone — should see the FULL detailed report with all sections unchanged
4. Open in Gmail browser — should see the FULL detailed report (same as iPhone)
