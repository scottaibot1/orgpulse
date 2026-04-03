import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthEmail } from "@/lib/auth";
import { marked } from "marked";
import { parseAiSummary, renderPdfHtml } from "@/lib/report-renderer";

interface Params { params: Promise<{ orgId: string; id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId, id } = await params;

  const email = await getAuthEmail();
  if (!email) return new NextResponse("Unauthorized", { status: 401 });

  const member = await prisma.user.findUnique({ where: { orgId_email: { orgId, email } } });
  if (!member) return new NextResponse("Forbidden", { status: 403 });

  const [summary, org] = await Promise.all([
    prisma.dailySummary.findFirst({
      where: { id, orgId },
      select: { aiFullSummary: true, summaryDate: true, totalSubmissions: true, missingSubmissions: true, createdAt: true },
    }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, workspaceSettings: { select: { reportTheme: true } } } }),
  ]);

  if (!summary?.aiFullSummary) return new NextResponse("Not found", { status: 404 });

  const orgName = org?.name ?? "Organization";
  const reportTheme = (org?.workspaceSettings?.reportTheme ?? "dark") as "dark" | "light";
  const ctx = {
    orgName,
    summaryDate: new Date(summary.summaryDate),
    totalSubmissions: summary.totalSubmissions,
    missingSubmissions: summary.missingSubmissions,
    createdAt: new Date(summary.createdAt),
    theme: reportTheme,
  };

  // Try new structured JSON format; fall back to legacy markdown for old records
  const parsed = parseAiSummary(summary.aiFullSummary);
  let html: string;
  if (parsed) {
    html = renderPdfHtml(parsed, ctx);
  } else {
    // Legacy markdown fallback
    const total = summary.totalSubmissions + summary.missingSubmissions;
    const rate = total > 0 ? Math.round((summary.totalSubmissions / total) * 100) : 0;
    const rateColor = rate === 100 ? "#15803d" : rate >= 70 ? "#b45309" : "#b91c1c";
    const formattedDate = ctx.summaryDate.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const formattedGenerated = ctx.createdAt.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
    const bodyHtml = marked.parse(summary.aiFullSummary) as string;

    html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${orgName} — Executive Summary — ${formattedDate}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; }
.page { max-width: 800px; margin: 0 auto; padding: 48px 40px; background: #fff; }
.header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 28px; }
.org-name { font-size: 22px; font-weight: 700; color: #1e293b; }
.report-title { font-size: 12px; color: #6366f1; font-weight: 700; margin-top: 4px; letter-spacing: 0.08em; text-transform: uppercase; }
.meta { display: flex; gap: 24px; margin-top: 10px; }
.meta-item { font-size: 12px; color: #64748b; }
.meta-item strong { color: #334155; }
.stats-row { display: flex; gap: 12px; margin-bottom: 28px; }
.stat-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
.stat-value { font-size: 26px; font-weight: 700; }
.stat-label { font-size: 10px; color: #64748b; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em; }
.content h1 { font-size: 17px; font-weight: 700; color: #1e293b; margin-top: 24px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
.content h2 { font-size: 14px; font-weight: 700; color: #334155; margin-top: 20px; margin-bottom: 6px; }
.content h3 { font-size: 13px; font-weight: 600; color: #475569; margin-top: 14px; margin-bottom: 4px; }
.content p { font-size: 13px; line-height: 1.7; color: #475569; margin-bottom: 8px; }
.content ul { padding-left: 20px; margin-bottom: 10px; }
.content li { font-size: 13px; line-height: 1.7; color: #475569; margin-bottom: 3px; }
.content strong { color: #1e293b; font-weight: 600; }
.content hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
.footer span { font-size: 11px; color: #94a3b8; }
.print-btn { position: fixed; top: 20px; right: 20px; background: #6366f1; color: #fff; border: none; padding: 10px 22px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
@media print {
  @page { margin: 18mm 14mm; size: A4; }
  body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-btn { display: none; }
}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Save as PDF</button>
<div class="page">
  <div class="header">
    <div class="org-name">${orgName}</div>
    <div class="report-title">Executive Summary</div>
    <div class="meta">
      <div class="meta-item"><strong>Date:</strong> ${formattedDate}</div>
      <div class="meta-item"><strong>Generated:</strong> ${formattedGenerated}</div>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-box" style="border-color:#bbf7d0;background:#f0fdf4">
      <div class="stat-value" style="color:#15803d">${summary.totalSubmissions}</div>
      <div class="stat-label">Submitted today</div>
    </div>
    <div class="stat-box" style="border-color:#fecaca;background:#fef2f2">
      <div class="stat-value" style="color:#b91c1c">${summary.missingSubmissions}</div>
      <div class="stat-label">Missing today</div>
    </div>
    <div class="stat-box" style="border-color:#bfdbfe;background:#eff6ff">
      <div class="stat-value" style="color:${rateColor}">${rate}%</div>
      <div class="stat-label">Submission rate</div>
    </div>
  </div>
  <div class="content">${bodyHtml}</div>
  <div class="footer">
    <span>${orgName} &middot; Confidential</span>
    <span>Generated by OrgRise AI</span>
  </div>
</div>
<script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`;
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
