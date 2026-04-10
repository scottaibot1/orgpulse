import { renderEmailHtml, parseAiSummary, renderPdfHtml } from "../lib/report-renderer";
import fs from "fs";

const testJson = JSON.stringify({
  todaysPulse: "Test pulse to verify rendering across both themes.",
  needsAttentionNow: [
    { status: "overdue", daysOverdue: 5, dueDate: "2026-04-05", pctComplete: 50, who: "Test User", department: "Test Dept", text: "Test overdue task" },
    { status: "imminentlyDue", daysOverdue: null, dueDate: "2026-04-12", pctComplete: 25, who: "Test User", department: "Test Dept", text: "Test due soon task" }
  ],
  waitingOnExternal: [{ text: "Test waiting", who: "Test User" }],
  notableProgress: [{ department: "Test Dept", items: ["Test completed item"], overflowNote: null }],
  completenessScore: { totalExpected: 1, freshToday: 1, percentage: 100, standIns: [], missing: [], notScheduledToday: [] },
  departments: [{
    name: "Test Dept", emoji: "🧪", reportedCount: 1, totalCount: 1,
    statusLabel: "all reported", statusOk: true,
    people: [{
      name: "Test User", status: "fresh", isStandIn: false, daysSinceReport: 0,
      hoursWorked: 8, timeAllocation: [{ label: "Test Work", hours: 8, percent: 100 }],
      highlights: [
        { type: "ontack", text: "Test in-progress task", subcategory: "Category One" },
        { type: "ontack", text: "Another task · due 4/15", subcategory: "Category Two" },
        { type: "tomorrowfocus", text: "Plan for tomorrow" }
      ]
    }]
  }]
});

const parsed = parseAiSummary(testJson);
if (!parsed) { console.error("PARSE FAIL"); process.exit(1); }

const ctx = (theme: "dark" | "light") => ({
  orgName: "Test Organization",
  summaryDate: new Date(),
  totalSubmissions: 1,
  missingSubmissions: 0,
  createdAt: new Date(),
  pdfUrl: "https://example.com/pdf",
  appUrl: "https://example.com",
  theme,
});

try {
  const emailDark = renderEmailHtml(parsed, ctx("dark"));
  const emailLight = renderEmailHtml(parsed, ctx("light"));

  // Verify Outlook conditional structure exists
  const checks = [
    { name: "MSO conditional open", pattern: "<!--[if mso]>" },
    { name: "MSO conditional close", pattern: "<![endif]-->" },
    { name: "Non-MSO open", pattern: "<!--[if !mso]><!-->" },
    { name: "Non-MSO close", pattern: "<!--<![endif]-->" },
    { name: "Outlook View Full Report button", pattern: "View Full Report" },
    { name: "Pulse section (non-Outlook)", pattern: "Today's Pulse" },
  ];

  console.log("\n── Outlook conditional integrity ──");
  let allPassed = true;
  for (const check of checks) {
    const found = emailDark.includes(check.pattern);
    console.log(`  ${found ? "✓" : "✗"} ${check.name}`);
    if (!found) allPassed = false;
  }
  if (!allPassed) {
    console.error("\n✗ OUTLOOK CONDITIONAL CHECK FAILED — restore the conditional structure before deploying");
    process.exit(1);
  }

  fs.writeFileSync("/tmp/email-dark.html", emailDark);
  console.log("✓ Email dark rendered → /tmp/email-dark.html");
  fs.writeFileSync("/tmp/email-light.html", emailLight);
  console.log("✓ Email light rendered → /tmp/email-light.html");
  fs.writeFileSync("/tmp/pdf-dark.html", renderPdfHtml(parsed, ctx("dark")));
  console.log("✓ PDF dark rendered → /tmp/pdf-dark.html");
  fs.writeFileSync("/tmp/pdf-light.html", renderPdfHtml(parsed, ctx("light")));
  console.log("✓ PDF light rendered → /tmp/pdf-light.html");
  console.log("\nALL RENDERS PASSED");
  console.log("\nOpen these files in a browser to inspect:");
  console.log("  open /tmp/email-dark.html");
  console.log("  open /tmp/email-light.html");
  console.log("  open /tmp/pdf-dark.html");
  console.log("  open /tmp/pdf-light.html");
} catch (err) {
  console.error("RENDER FAIL:", err);
  if (err instanceof Error) console.error(err.stack);
  process.exit(1);
}
