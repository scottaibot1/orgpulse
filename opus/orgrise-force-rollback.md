# OrgRise — FORCE ROLLBACK and Restore Email

The email is broken. Previous revert attempts did not actually fix it. Execute these steps EXACTLY in order. Do not skip steps. Do not ask for approval.

---

## STEP 1 — Verify the actual git state

Run these commands and report ALL output:

```bash
cd /Users/scott/orgpulse/opus
git status
git log --oneline -20 lib/report-renderer.ts
git log --oneline -10
```

This shows:
- What files are currently modified
- The commit history of report-renderer.ts specifically  
- Recent commits overall

---

## STEP 2 — Find the last KNOWN WORKING commit

The email was working BEFORE this morning's changes. Find the commit from yesterday or earlier today before the light mode changes started.

Run:
```bash
git log --oneline --all -30 lib/report-renderer.ts
```

Look for commits with messages mentioning "email", "render", "outlook", "light mode", "dark mode". The LAST WORKING commit is the one BEFORE any light mode work started. It is probably one of these patterns:
- A commit about Outlook brief / signed URL
- A commit about removing print prompt
- A commit about no-login PDF link

The commit AFTER that — anything mentioning "light mode", "C_LIGHT", "palette", "tinted", or "depth fix" — is broken.

---

## STEP 3 — Hard reset report-renderer.ts to the last working commit

Once you identify the last working commit hash (call it WORKING_HASH), run:

```bash
git checkout WORKING_HASH -- lib/report-renderer.ts
```

This forcibly restores ONLY the report-renderer.ts file to that commit's version. It does not affect other files.

Then verify:
```bash
git diff HEAD lib/report-renderer.ts
```

This shows what changed. If empty, the file is already at HEAD which means HEAD is the broken version. In that case, go back further:
```bash
git checkout WORKING_HASH~1 -- lib/report-renderer.ts
```

---

## STEP 4 — Verify the file compiles

```bash
npx tsc --noEmit
```

If there are errors, report them. Do NOT proceed until tsc reports zero errors.

---

## STEP 5 — Test the render with a minimal script

Create `scripts/test-render.ts` (overwrite if it exists):

```typescript
import { renderEmailHtml, parseAiSummary } from "../lib/report-renderer";
import fs from "fs";

const testJson = JSON.stringify({
  todaysPulse: "Test pulse to verify email rendering works.",
  needsAttentionNow: [
    { status: "overdue", daysOverdue: 3, dueDate: "2026-04-04", pctComplete: 50, who: "Test User", department: "Test", text: "Test overdue task" }
  ],
  waitingOnExternal: [],
  notableProgress: [
    { department: "Test Dept", items: ["Test completed item"], overflowNote: null }
  ],
  completenessScore: { totalExpected: 1, freshToday: 1, percentage: 100, standIns: [], missing: [], notScheduledToday: [] },
  departments: [{
    name: "Test Dept",
    emoji: "🧪",
    reportedCount: 1,
    totalCount: 1,
    statusLabel: "all reported",
    statusOk: true,
    people: [{
      name: "Test User",
      status: "fresh",
      isStandIn: false,
      daysSinceReport: 0,
      hoursWorked: 8,
      timeAllocation: [{ label: "Test Work", hours: 8, percent: 100 }],
      highlights: [
        { type: "ontack", text: "Test in-progress task" },
        { type: "tomorrowfocus", text: "Test tomorrow plan" }
      ]
    }]
  }]
});

const parsed = parseAiSummary(testJson);
if (!parsed) {
  console.error("FAIL: parseAiSummary returned null");
  process.exit(1);
}
console.log("OK: parseAiSummary succeeded");

try {
  const htmlDark = renderEmailHtml(parsed, {
    orgName: "Test Org",
    summaryDate: new Date(),
    totalSubmissions: 1,
    missingSubmissions: 0,
    createdAt: new Date(),
    pdfUrl: "https://example.com/pdf",
    appUrl: "https://example.com",
    theme: "dark",
  });
  fs.writeFileSync("/tmp/test-dark.html", htmlDark);
  console.log("OK: dark mode render succeeded, " + htmlDark.length + " chars");
} catch (err) {
  console.error("FAIL: dark mode render threw");
  console.error(err);
  if (err instanceof Error) console.error(err.stack);
  process.exit(1);
}

try {
  const htmlLight = renderEmailHtml(parsed, {
    orgName: "Test Org",
    summaryDate: new Date(),
    totalSubmissions: 1,
    missingSubmissions: 0,
    createdAt: new Date(),
    pdfUrl: "https://example.com/pdf",
    appUrl: "https://example.com",
    theme: "light",
  });
  fs.writeFileSync("/tmp/test-light.html", htmlLight);
  console.log("OK: light mode render succeeded, " + htmlLight.length + " chars");
} catch (err) {
  console.error("FAIL: light mode render threw");
  console.error(err);
  if (err instanceof Error) console.error(err.stack);
  process.exit(1);
}

console.log("ALL TESTS PASSED");
```

Run it:
```bash
npx tsx scripts/test-render.ts
```

Report the FULL output. If it says "ALL TESTS PASSED", the file is working. If anything fails, report the exact error and stack trace.

---

## STEP 6 — If render works, deploy

If Step 5 passes:

```bash
git add lib/report-renderer.ts
git commit -m "Rollback report-renderer.ts to last working version"
git push
```

Wait for Vercel to deploy, then trigger a test report from the OrgRise UI.

---

## STEP 7 — If render still fails after rollback

If Step 5 still fails AFTER checking out an earlier commit, the problem is not in `report-renderer.ts` alone. Check these other files for recent changes:

```bash
git log --oneline -10 lib/email.ts
git log --oneline -10 lib/ai.ts
git log --oneline -10 prompts/executive-summary-v2.txt
```

If any of these have recent changes that look related to the email work, revert them too:

```bash
git checkout WORKING_HASH -- lib/email.ts
git checkout WORKING_HASH -- lib/ai.ts
```

Re-run the test script after each revert until it passes.

---

## REPORT BACK WITH

1. The output of `git status` and `git log --oneline -20 lib/report-renderer.ts` from Step 1
2. The commit hash you identified as the last working version in Step 2
3. The output of `npx tsc --noEmit` from Step 4
4. The full output of `npx tsx scripts/test-render.ts` from Step 5
5. Whether the deploy in Step 6 fixed the email
