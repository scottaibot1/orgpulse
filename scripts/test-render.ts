import { renderEmailHtml, parseAiSummary } from "../lib/report-renderer";

const test = JSON.stringify({
  todaysPulse: "Test",
  needsAttentionNow: [],
  waitingOnExternal: [],
  notableProgress: [],
  completenessScore: { totalExpected: 1, freshToday: 1, percentage: 100, standIns: [], missing: [], notScheduledToday: [] },
  departments: []
});

const parsed = parseAiSummary(test);
if (!parsed) { console.error("PARSE FAIL"); process.exit(1); }

try {
  const html = renderEmailHtml(parsed, {
    orgName: "Test",
    summaryDate: new Date(),
    totalSubmissions: 1,
    missingSubmissions: 0,
    createdAt: new Date(),
    pdfUrl: "https://example.com",
    appUrl: "https://example.com",
    theme: "dark",
  });
  console.log("RENDER OK, length:", html.length);
} catch (err) {
  console.error("RENDER FAIL:", err);
  if (err instanceof Error) console.error("STACK:", err.stack);
}
