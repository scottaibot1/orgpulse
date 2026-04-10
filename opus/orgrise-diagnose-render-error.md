# OrgRise — DIAGNOSE Email Rendering Error

The email is no longer sending after the recent changes. Something is throwing an error during `renderEmailHtml`. Execute these diagnostic steps in order.

---

## STEP 1 — Get the error from server logs

The email render is wrapped in a try/catch in `lib/email.ts` that logs errors with the prefix `[Email] renderEmailHtml threw:`. Find the most recent error.

Run this command to check Vercel logs:

```bash
vercel logs --since 30m | grep -A 20 "renderEmailHtml threw"
```

Or if not using Vercel CLI, open the Vercel dashboard, go to the project, click on the most recent deployment, and look at the runtime logs for the cron or summary route. Filter for "renderEmailHtml threw".

The log will show the exact error message AND stack trace. Report back what it says.

---

## STEP 2 — Common error candidates from recent changes

While waiting for logs, check these specific issues that could cause the render to throw:

### 2A. Check if `C_LIGHT` is being referenced inside functions where it's not in scope

Search for `=== C_LIGHT` or `c === C_LIGHT` in `lib/report-renderer.ts`. If found, this is a problem because `C_LIGHT` is a const inside the file but the comparison happens inside helper functions. Check that the file has `C_LIGHT` accessible at the call site.

If you find any `c === C_LIGHT` comparisons, replace them with a safer check based on a palette field. For example, instead of `c === C_LIGHT ? "32px 20px" : "24px 16px"`, use:
```typescript
const isLight = c.pageBg === "#ffffff";
const padding = isLight ? "32px 20px" : "24px 16px";
```

Or just use `"32px 20px"` for both themes.

### 2B. Check that all new palette fields exist in BOTH C_DARK and C_LIGHT

Open `lib/report-renderer.ts`. Find the `Palette` interface. Make sure these fields exist:
- `headerAccent`
- `headerAccentBorder`
- `headerAccentText`
- `buttonBg`
- `buttonText`

If they're in the interface but missing from `C_DARK`, the dark mode render will fail with undefined values being inserted into HTML, which can throw if any code tries to do string operations on undefined.

Verify `C_DARK` has these values:
```typescript
  headerAccent:       "#172554",
  headerAccentBorder: "#3b82f6",
  headerAccentText:   "#f1f5f9",
  buttonBg:           "#4f46e5",
  buttonText:         "#ffffff",
```

If missing, ADD them to `C_DARK`.

### 2C. Check the `emailTask` signature update

If a previous prompt changed `emailTask(h, e)` to `emailTask(h, e, ctx)`, search for ALL calls to `emailTask(` in the file:

```bash
grep -n "emailTask(" lib/report-renderer.ts
```

Every call must pass `ctx` as the third argument. If any call still uses just `emailTask(h, e)`, it will pass `undefined` for `ctx`, and then `ctx.summaryDate` inside the function will throw `TypeError: Cannot read properties of undefined (reading 'summaryDate')`.

Fix any missed callers.

### 2D. Check `emailPersonCard` for syntax errors

The recent prompt added wrapped tinted divs around person cards. Verify `emailPersonCard()` is still syntactically valid TypeScript. Look for:
- Unclosed template literals (backticks)
- Mismatched HTML tags
- Missing semicolons
- Stray characters from copy-paste

Run `npx tsc --noEmit` to catch any TypeScript errors:

```bash
npx tsc --noEmit
```

If this reports errors, fix them and try again.

### 2E. Check `emailDeptSection` for the wrapper change

The recent prompt asked to wrap people in a tinted div inside `emailDeptSection`. The change was:

```typescript
return deptBar + `<div style="background-color:${c.bgSecondary}; padding:16px; border-radius:14px; -webkit-border-radius:14px; margin-bottom:24px;">${personCards}</div>`;
```

Verify this line is syntactically correct and `personCards` is defined before it.

### 2F. Check for undefined `cs` or `fresh` references

In `renderEmailHtml`, the recent prompts added references to `cs`, `fresh`, `pct`, `hrs` outside of the `emailPulse` function. Verify these variables are defined in the scope where they're used. If they're declared inside `emailPulse` but referenced in the outer function, they're undefined.

Look for any `${cs?` or `${fresh}` references in the body of `renderEmailHtml`. If found, make sure they're computed earlier in the function:

```typescript
  const cs = data.completenessScore;
  const fresh = cs?.freshToday ?? 0;
  const pct = cs?.percentage ?? 0;
  const hrs = totalHours(data);
```

These should be near the top of `renderEmailHtml`, before any HTML strings that reference them.

---

## STEP 3 — If logs are unavailable, do a forced render test

Add a test script. Create `scripts/test-render.ts`:

```typescript
import { renderEmailHtml, parseAiSummary } from "../lib/report-renderer";
import fs from "fs";

const testJson = `{
  "todaysPulse": "Test pulse for diagnostic purposes.",
  "needsAttentionNow": [],
  "waitingOnExternal": [],
  "notableProgress": [],
  "completenessScore": { "totalExpected": 1, "freshToday": 1, "percentage": 100, "standIns": [], "missing": [], "notScheduledToday": [] },
  "departments": [{
    "name": "Test Dept", "emoji": "🧪", "reportedCount": 1, "totalCount": 1,
    "statusLabel": "all reported", "statusOk": true,
    "people": [{
      "name": "Test Person", "status": "fresh", "isStandIn": false, "daysSinceReport": 0,
      "hoursWorked": 8, "timeAllocation": [{"label":"Work","hours":8,"percent":100}],
      "highlights": [{"type":"ontack","text":"Test task"}]
    }]
  }]
}`;

const parsed = parseAiSummary(testJson);
if (!parsed) {
  console.error("Failed to parse");
  process.exit(1);
}

try {
  const html = renderEmailHtml(parsed, {
    orgName: "Test Org",
    summaryDate: new Date(),
    totalSubmissions: 1,
    missingSubmissions: 0,
    createdAt: new Date(),
    pdfUrl: "https://example.com/pdf",
    appUrl: "https://example.com",
    theme: "dark",
  });
  fs.writeFileSync("/tmp/test-email-dark.html", html);
  console.log("Dark mode render: OK");
  
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
  fs.writeFileSync("/tmp/test-email-light.html", htmlLight);
  console.log("Light mode render: OK");
} catch (err) {
  console.error("Render failed:", err);
  if (err instanceof Error) {
    console.error("Stack:", err.stack);
  }
}
```

Run it:
```bash
npx tsx scripts/test-render.ts
```

If it throws, the error and stack trace will show exactly what's wrong. Report back what it says.

---

## STEP 4 — Emergency rollback if needed

If you cannot find the error quickly, revert the most recent changes to `lib/report-renderer.ts`:

```bash
git log --oneline lib/report-renderer.ts | head -5
git checkout HEAD~1 lib/report-renderer.ts
```

This reverts to the previous working version. Then we can re-apply the changes one at a time to identify which one broke things.

---

## REPORT BACK

After running these diagnostics, report:
1. The exact error message from the logs (or test script)
2. Whether `npx tsc --noEmit` reports any TypeScript errors
3. Whether any of the common candidates in Step 2 matched
