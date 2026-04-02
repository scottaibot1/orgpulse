import { Resend } from "resend";
import { parseAiSummary, renderEmailHtml } from "@/lib/report-renderer";

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.FROM_EMAIL ?? "OrgRise AI <reports@orgrise.ai>";

export async function sendSummaryEmail({
  toEmail,
  orgName,
  summaryDate,
  summaryId,
  orgId,
  totalSubmissions,
  missingSubmissions,
  markdown,
  appUrl,
  reportLinks,
}: {
  toEmail: string;
  orgName: string;
  summaryDate: Date;
  summaryId: string;
  orgId: string;
  totalSubmissions: number;
  missingSubmissions: number;
  markdown: string;
  appUrl: string;
  reportLinks?: Record<string, { parsedReportId: string; date: string; isStandIn: boolean }>;
}) {
  const pdfUrl = `${appUrl}/w/${orgId}/summary/${summaryId}/print`;
  const ctx = { orgName, summaryDate, totalSubmissions, missingSubmissions, createdAt: new Date(), pdfUrl, appUrl, reportLinks };

  // Try new structured JSON format first; fall back to legacy markdown for old records
  const parsed = parseAiSummary(markdown);
  console.log(`[Email] parseAiSummary result: ${parsed ? "structured JSON ok" : "null — will use legacy markdown"}`);
  let html = "";
  let useLegacy = !parsed;
  if (parsed) {
    try {
      html = renderEmailHtml(parsed, ctx);
    } catch (renderErr) {
      console.error("[Email] renderEmailHtml threw — falling back to markdown:", renderErr);
      useLegacy = true;
    }
  }
  if (useLegacy) {
    // Fallback: send a clean notification email pointing to the PDF
    // (never fall back to marked.parse(markdown) since that renders raw JSON when AI returns structured data)
    const formattedDate = summaryDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Executive Summary — ${orgName}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1e293b;">
<table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;">
<tr><td style="padding:24px 16px;">
<table cellpadding="0" cellspacing="0" width="560" align="center" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:100%;">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:24px 28px;">
    <div style="font-size:18px;font-weight:800;color:#fff;">${orgName}</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;text-transform:uppercase;letter-spacing:0.08em;">Executive Summary · ${formattedDate}</div>
  </td></tr>
  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">Your executive summary for <strong>${orgName}</strong> has been generated. Click below to view the full formatted report.</p>
    <table cellpadding="0" cellspacing="0"><tr><td>
      <a href="${pdfUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;">View Full Report →</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:14px 28px;border-top:1px solid #e2e8f0;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="font-size:10px;color:#94a3b8;">${orgName} · Confidential</td>
      <td style="text-align:right;font-size:10px;color:#94a3b8;">Sent by OrgRise AI</td>
    </tr></table>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  const subject = `${orgName} Executive Summary — ${summaryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const { error } = await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject,
    html,
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
}

export async function sendInvitationEmail({
  toEmail,
  toName,
  orgName,
  submissionUrl,
}: {
  toEmail: string;
  toName: string;
  orgName: string;
  submissionUrl: string;
}) {
  const firstName = toName.split(" ")[0];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>You've been added to ${orgName} on OrgRise AI</title>
<style>
  body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1e293b; }
  .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .top-bar { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 28px 32px; text-align: center; }
  .top-bar .logo { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
  .top-bar .tagline { font-size: 13px; color: rgba(255,255,255,0.7); margin-top: 4px; }
  .body { padding: 32px 32px 24px; }
  .body h1 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 12px; }
  .body p { font-size: 14px; line-height: 1.7; color: #475569; margin: 0 0 14px; }
  .cta { margin: 28px 32px; text-align: center; }
  .cta a { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(99,102,241,0.35); }
  .url-box { margin: 0 32px 28px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
  .url-box p { font-size: 11px; color: #94a3b8; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  .url-box a { font-size: 12px; color: #6366f1; word-break: break-all; }
  .footer { padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center; }
  .footer p { font-size: 11px; color: #94a3b8; margin: 0; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="top-bar">
    <div class="logo">OrgRise AI</div>
    <div class="tagline">AI-powered organizational reporting</div>
  </div>

  <div class="body">
    <h1>Hi ${firstName}, you've been added to ${orgName}</h1>
    <p>
      Your manager has set you up on <strong>OrgRise AI</strong> — a platform that helps your team
      share daily updates and keep leadership informed automatically.
    </p>
    <p>
      Your job is simple: click the button below and upload your status report. You can upload
      a PDF, Word doc, spreadsheet, or even a plain text file. OrgRise AI takes care of the rest.
    </p>
    <p>This link is personal to you — bookmark it for future submissions.</p>
  </div>

  <div class="cta">
    <a href="${submissionUrl}">Submit My Report</a>
  </div>

  <div class="url-box">
    <p>Your personal submission link</p>
    <a href="${submissionUrl}">${submissionUrl}</a>
  </div>

  <div class="footer">
    <p>${orgName} &middot; Powered by OrgRise AI &middot; This link is unique to you, do not share it.</p>
  </div>
</div>
</body>
</html>`;

  const { error } = await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `You've been added to ${orgName} on OrgRise AI`,
    html,
  });

  if (error) throw new Error(`Invitation email failed: ${error.message}`);
}
