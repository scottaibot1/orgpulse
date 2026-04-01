import { Resend } from "resend";
import { marked } from "marked";
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
    // Legacy markdown fallback
    const total = totalSubmissions + missingSubmissions;
    const rate = total > 0 ? Math.round((totalSubmissions / total) * 100) : 0;
    const formattedDate = summaryDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const bodyHtml = marked.parse(markdown) as string;
    const rateColor = rate === 100 ? "#15803d" : rate >= 70 ? "#b45309" : "#b91c1c";
    const rateBg   = rate === 100 ? "#f0fdf4" : rate >= 70 ? "#fffbeb" : "#fef2f2";

    html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Executive Summary — ${orgName}</title>
<style>
  body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1e293b; }
  .wrapper { max-width: 620px; margin: 32px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .top-bar { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px 32px; }
  .top-bar h1 { margin: 0; color: #fff; font-size: 18px; font-weight: 700; }
  .top-bar p { margin: 4px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }
  .stats { display: flex; gap: 0; border-bottom: 1px solid #e2e8f0; }
  .stat { flex: 1; padding: 16px 20px; text-align: center; border-right: 1px solid #e2e8f0; }
  .stat:last-child { border-right: none; }
  .stat .val { font-size: 22px; font-weight: 700; }
  .stat .lbl { font-size: 11px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
  .body { padding: 28px 32px; }
  .body h1 { font-size: 16px; font-weight: 700; color: #1e293b; margin: 20px 0 6px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .body h2 { font-size: 13px; font-weight: 700; color: #475569; margin: 16px 0 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .body p { font-size: 14px; line-height: 1.65; color: #475569; margin: 0 0 10px; }
  .body ul { padding-left: 20px; margin: 0 0 10px; }
  .body li { font-size: 14px; line-height: 1.65; color: #475569; margin-bottom: 3px; }
  .body strong { color: #1e293b; }
  .cta { margin: 24px 32px 32px; text-align: center; }
  .cta a { display: inline-block; background: #6366f1; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; }
  .footer { padding: 16px 32px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
  .footer span { font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="top-bar">
    <h1>${orgName} — Executive Summary</h1>
    <p>${formattedDate}</p>
  </div>
  <div class="stats">
    <div class="stat">
      <div class="val" style="color:#15803d">${totalSubmissions}</div>
      <div class="lbl">Submitted</div>
    </div>
    <div class="stat">
      <div class="val" style="color:#b91c1c">${missingSubmissions}</div>
      <div class="lbl">Missing</div>
    </div>
    <div class="stat">
      <div class="val" style="color:${rateColor};background:${rateBg};border-radius:6px;display:inline-block;padding:2px 8px">${rate}%</div>
      <div class="lbl">Rate</div>
    </div>
  </div>
  <div class="body">${bodyHtml}</div>
  <div class="cta"><a href="${pdfUrl}">View &amp; Download PDF</a></div>
  <div class="footer">
    <span>${orgName} · Confidential</span>
    <span>Sent by OrgRise AI</span>
  </div>
</div>
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
