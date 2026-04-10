# OrgRise Email Template — Complete Rewrite

Execute ALL changes below. Do not ask for approval. Do not skip any step.

---

## PART 1 — APPEND AI REINFORCEMENTS

Append the following text to the END of `prompts/executive-summary-v2.txt` (after the last line):

```


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL REINFORCEMENTS — COMMON VIOLATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The following rules have been repeatedly violated in production. They are restated here with maximum emphasis. Violation of ANY of these makes the output INVALID.

REINFORCEMENT 1 — waitingOnExternal MUST BE POPULATED:
Scan every person's narrative for external dependencies. Look for: "waiting on", "pending response from", "sent to [name] for review", "awaiting approval from", "depends on [external party]", "no response yet from". Common external dependencies include review requests sent to specific people (e.g., "sent to Scott and Kellie for review"), items awaiting creative teams, vendor responses, client decisions, and group booking decisions. An empty waitingOnExternal array when ANY person mentions waiting on an external party is a VIOLATION. Internal blockers (waiting on internal approval) go to needsAttentionNow as "blocked" — external dependencies go to waitingOnExternal.

REINFORCEMENT 2 — notableProgress MUST INCLUDE ALL DEPARTMENTS:
The notableProgress array must contain a separate group object for EVERY department that had completed tasks. If Reservations completed 3 items, Sales completed 2 items, and Private Paradise completed 4 items, the array must have 3 group objects — one per department. A single-department notableProgress when multiple departments had completions is a VIOLATION.

REINFORCEMENT 3 — tomorrowfocus EXTRACTION:
For each person, extract EVERY forward-looking plan or next step. If a person lists 4 things they plan to do tomorrow, output 4 separate tomorrowfocus items. Do NOT summarize multiple plans into one item. Do NOT truncate to 1 item when the source has more. Outputting 1 tomorrowfocus when the source report contains 4+ plans is a VIOLATION.

REINFORCEMENT 4 — SUBCATEGORY DEDUPLICATION:
BEFORE outputting each person's highlights array, verify that each subcategory label appears AT MOST ONCE. All items sharing the same subcategory must be grouped consecutively. Two or more occurrences of the same subcategory label for one person is a VIOLATION.

REINFORCEMENT 5 — timeAllocation IS NEVER EMPTY FOR FRESH REPORTS:
Every person with a fresh report MUST have a non-empty timeAllocation array. If hoursWorked is null, set timeAllocationEstimated: true and estimate 4-6 time buckets. A timeAllocation of [] for a fresh report is a VIOLATION.

REINFORCEMENT 6 — timeAllocation CONSOLIDATION (MAX 6):
Maximum 6 categories per person. More than 6 is a VIOLATION. Merge related activities.
```

---

## PART 2 — REWRITE EMAIL RENDERING FUNCTIONS IN report-renderer.ts

Open `lib/report-renderer.ts`. Make the following changes:

### 2A. Update buildE() — change viewLink color to purple

Find the `viewLink` property inside the `buildE()` function (around line 512). Change it from:

```typescript
viewLink: `font-size:11px;line-height:16px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;color:#378ADD;text-decoration:underline;`,
```

To:

```typescript
viewLink: `font-size:12px;line-height:16px;mso-line-height-rule:exactly;font-family:Arial,Helvetica,sans-serif;color:#818cf8;text-decoration:none;`,
```

### 2B. Update buildE() — add new style properties

Add these new properties to the object returned by `buildE()`, after the existing `deptBarName` property:

```typescript
// Section spacing and card styles
sectionGap: `padding-top:24px;`,
cardBorder: `border:1px solid rgba(255,255,255,0.08);`,
personHeaderBg: `background-color:#172554;`,
personHeaderBorder: `border:1px solid #3b82f6;`,
deptBarAccent: `background-color:#3b82f6;`,
```

### 2C. Rewrite emailDeptSection() — add more visual pop with spacing

Find the `emailDeptSection()` function (around line 1096). Replace it entirely with:

```typescript
function emailDeptSection(dept: DepartmentData, ctx: RenderContext, c: Palette, e: ES, startIdx: number = 0): string {
  const statusPill = dept.statusOk
    ? emailStatusBadgeDual("all reported", "#14532d", "#86efac")
    : `<span style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:#f59e0b; font-family:Arial,Helvetica,sans-serif;">${dept.statusLabel}</span>`;
  
  // Department header bar with blue accent — increased margin for spacing
  const deptBar = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0 12px;">
  <tr>
    <td width="4" bgcolor="#3b82f6" style="background-color:#3b82f6; font-size:0; line-height:0;">&nbsp;</td>
    <!--[if mso]>
    <td bgcolor="#172554" style="background-color:#172554; padding:12px 16px; border:1px solid #3b82f6; font-family:Arial,Helvetica,sans-serif;">
    <![endif]-->
    <!--[if !mso]><!-->
    <td style="background-color:#172554; padding:12px 16px; border:1px solid #3b82f6; border-left:none; border-radius:0 8px 8px 0; -webkit-border-radius:0 8px 8px 0; font-family:Arial,Helvetica,sans-serif;">
    <!--<![endif]-->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="font-size:14px; line-height:20px; mso-line-height-rule:exactly; font-weight:600; color:#93c5fd; font-family:Arial,Helvetica,sans-serif; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${dept.emoji} ${dept.name}</td>
        <td style="text-align:right; white-space:nowrap; padding-left:12px;">${statusPill}</td>
      </tr></table>
    </td>
  </tr>
</table>`;

  // Person cards with 16px gap between each
  const personCards = (dept.people ?? []).map((p, i) => emailPersonCard(p, ctx, c, e, startIdx + i)).join("");
  
  return deptBar + personCards;
}
```

### 2D. Rewrite emailPersonCard() — better spacing, header treatment, alignment

Find the `emailPersonCard()` function (around line 994). Replace it entirely with:

```typescript
function emailPersonCard(p: PersonData, ctx: RenderContext, c: Palette, e: ES, personIdx: number = 0): string {
  const href = reportHref(p.name, ctx);
  const hoursStr = p.hoursWorked != null ? `${p.hoursWorked}h logged` : "Hours not logged";

  const effStatus = effectiveStatus(p, ctx);
  let tag: string;
  if (effStatus === "standin") tag = emailBadgeDual(`Stand-in · ${p.daysSinceReport}d ago`, "#78350f", "#fcd34d");
  else if (effStatus === "missing") tag = emailBadgeDual("Missing", "#7f1d1d", "#fca5a5");
  else tag = emailBadgeDual("✓ Today", "#14532d", "#86efac");

  const initials = avatarInitials(p.name);
  const av = avatarStyle(p.name, personIdx);

  let pipelineHtml = "";
  if (p.pipeline_snapshot) {
    pipelineHtml = emailPipelineGrid(p.pipeline_snapshot, c, e);
  } else if (p.salesMetrics && p.salesMetrics.length > 0) {
    let smRows = "";
    for (let i = 0; i < p.salesMetrics.length; i += 3) {
      const chunk = p.salesMetrics.slice(i, i + 3);
      smRows += `<tr>${chunk.map(m => `<td width="33%" align="center" bgcolor="#0f172a" style="background-color:#0f172a; padding:10px 8px; border:1px solid rgba(255,255,255,0.06); font-family:Arial,Helvetica,sans-serif;">
  <div style="font-size:20px; line-height:28px; mso-line-height-rule:exactly; font-weight:600; color:${c.textPrimary}; font-family:Arial,Helvetica,sans-serif;">${m.value}</div>
  <div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; font-family:Arial,Helvetica,sans-serif;">${m.label}</div>
</td>`).join("")}</tr>`;
    }
    pipelineHtml = `<tr><td style="padding-bottom:12px;"><div style="${e.catLabel} margin-bottom:6px;">Pipeline snapshot</div><table role="presentation" cellpadding="0" cellspacing="4" border="0" width="100%">${smRows}</table></td></tr>`;
  }

  const ontack   = (p.highlights ?? []).filter(h => h.type === "ontack" || h.type === "atrisk");
  const blockers = (p.highlights ?? []).filter(h => h.type === "blocker");
  const tomorrow = (p.highlights ?? []).filter(h => h.type === "tomorrowfocus");

  let ontackHtml = "";
  if (ontack.length > 0) {
    ontackHtml = `<tr><td style="padding:10px 0 4px;"><div style="${e.catLabel}">In progress</div></td></tr>`;
    let lastSub: string | undefined;
    for (const h of ontack) {
      if (h.subcategory && h.subcategory !== lastSub) {
        ontackHtml += `<tr><td style="padding:6px 0 2px;"><div style="${e.subcat}">${h.subcategory}</div></td></tr>`;
        lastSub = h.subcategory;
      }
      ontackHtml += emailTask(h, e);
    }
  }

  let blockersHtml = "";
  if (blockers.length > 0) {
    blockersHtml = `<tr><td style="padding:10px 0 4px;"><div style="${e.catLabel}">Blocked</div></td></tr>` + blockers.map(h => emailTask(h, e)).join("");
  }

  let tomorrowHtml = "";
  if (tomorrow.length > 0) {
    tomorrowHtml = `<tr><td style="padding:10px 0 4px;"><div style="${e.catLabel}">Tomorrow's focus</div></td></tr>` + tomorrow.map(h => emailTomorrowItem(h, e)).join("");
  }

  const overflowHtml = p.overflowNote
    ? `<tr><td style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:${c.textSecondary}; padding-top:6px; font-family:Arial,Helvetica,sans-serif; font-style:italic;"><em>${p.overflowNote}</em></td></tr>` : "";

  const hasBody = pipelineHtml || ontackHtml || blockersHtml || tomorrowHtml || overflowHtml || (p.timeAllocation ?? []).length > 0;

  const viewLinkHtml = href ? `<a href="${href}" style="${e.viewLink}">View Submitted Report →</a>` : "";

  // Person card with consistent 16px margin-bottom, proper border treatment
  return `<!--[if mso]>
<table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#1e3a5f" width="100%" style="background-color:#1e293b; margin-bottom:16px; border-collapse:separate;">
<tr><td style="padding:0; background-color:#1e293b;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="padding:16px 20px; background-color:#172554; border-bottom:1px solid #3b82f6;">
<![endif]-->
<!--[if !mso]><!-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1e293b; border:1px solid rgba(255,255,255,0.08); border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:16px;">
<tr><td style="padding:16px 20px; background-color:#172554; border-bottom:1px solid #3b82f6; border-radius:12px 12px 0 0; -webkit-border-radius:12px 12px 0 0; font-family:Arial,Helvetica,sans-serif;">
<!--<![endif]-->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="44" valign="top" style="padding-right:12px; width:44px; vertical-align:top;">
          <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" height="40"><tr>
          <td align="center" valign="middle" width="40" height="40" bgcolor="${av.bg}" style="background-color:${av.bg}; color:${av.color}; font-size:14px; line-height:16px; mso-line-height-rule:exactly; font-weight:600; font-family:Arial,Helvetica,sans-serif; text-align:center; width:40px; height:40px;">${initials}</td>
          </tr></table><![endif]-->
          <!--[if !mso]><!-->
          <div style="width:40px; height:40px; border-radius:50%; -webkit-border-radius:50%; background-color:${av.bg}; color:${av.color}; font-size:14px; line-height:40px; mso-line-height-rule:exactly; font-weight:600; text-align:center; font-family:Arial,Helvetica,sans-serif;">${initials}</div>
          <!--<![endif]-->
        </td>
        <td style="vertical-align:middle; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">
          <div style="font-size:15px; line-height:20px; mso-line-height-rule:exactly; font-weight:600; color:#ffffff; font-family:Arial,Helvetica,sans-serif;">${p.name}</div>
          <div style="font-size:12px; line-height:16px; mso-line-height-rule:exactly; color:#93c5fd; font-family:Arial,Helvetica,sans-serif; margin-top:2px;">${hoursStr}${viewLinkHtml ? ` · ${viewLinkHtml}` : ""}</div>
        </td>
        <td style="text-align:right; vertical-align:top; white-space:nowrap; padding-left:12px;">${tag}</td>
      </tr></table>
    </td>
  </tr>
  ${hasBody ? `<tr><td style="padding:16px 20px; background-color:#1e293b; font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${pipelineHtml}${ontackHtml}${blockersHtml}${tomorrowHtml}${overflowHtml}
      ${emailTimeBars(p.timeAllocation ?? [], p.timeAllocationEstimated, p.hoursWorked, c, e)}
    </table>
  </td></tr>` : ""}
<!--[if mso]>
  </table>
</td></tr>
</table>
<![endif]-->
<!--[if !mso]><!-->
</table>
<!--<![endif]-->`;
}
```

### 2E. Rewrite emailPipelineGrid() — add borders around tiles

Find the `emailPipelineGrid()` function (around line 968). Replace it with:

```typescript
function emailPipelineGrid(snap: PipelineSnapshot, c: Palette, e: ES): string {
  const tiles = [
    { label: "Hot Responsive",  value: snap.hot_responsive,  warn: false },
    { label: "Qualified",       value: snap.qualified,       warn: false },
    { label: "Hot but Cold",    value: snap.hot_but_cold,    warn: true  },
    { label: "New Today",       value: snap.new_leads_today, warn: false },
    { label: "Contacted",       value: snap.leads_contacted, warn: false },
    { label: "Proposals Sent",  value: snap.proposals_sent,  warn: false },
  ];
  let rows = "";
  for (let i = 0; i < tiles.length; i += 3) {
    const chunk = tiles.slice(i, i + 3);
    rows += `<tr>${chunk.map(t => {
      const numColor = t.warn ? c.textDueUrgent : c.textPrimary;
      return `<td width="33%" align="center" bgcolor="#0f172a" style="background-color:#0f172a; padding:12px 8px; border:1px solid rgba(255,255,255,0.06); font-family:Arial,Helvetica,sans-serif;">
  <div style="font-size:22px; line-height:28px; mso-line-height-rule:exactly; font-weight:600; color:${numColor}; font-family:Arial,Helvetica,sans-serif;">${t.value ?? 0}</div>
  <div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; font-family:Arial,Helvetica,sans-serif; margin-top:4px;">${t.label}</div>
</td>`;
    }).join("")}</tr>`;
  }
  return `<tr><td style="padding-bottom:16px;">
  <div style="${e.catLabel} margin-bottom:8px;">Pipeline snapshot</div>
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="4" border="0" width="100%">${rows}</table>
  <![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" cellpadding="0" cellspacing="4" border="0" width="100%" style="border-radius:8px; -webkit-border-radius:8px; overflow:hidden;">${rows}</table>
  <!--<![endif]-->
</td></tr>`;
}
```

### 2F. Rewrite emailNotableProgress() — label INSIDE the green box

Find the `emailNotableProgress()` function (around line 1162). Replace it with:

```typescript
function emailNotableProgress(data: AiSummaryData, c: Palette): string {
  const groups = normalizeProgress(data.notableProgress);
  if (groups.length === 0) return "";
  let rows = "";
  let firstDept = true;
  for (const g of groups) {
    if (g.department) {
      const mt = firstDept ? "0" : "14px";
      rows += `<div style="font-size:10px; line-height:14px; mso-line-height-rule:exactly; font-weight:500; color:#4ade80; text-transform:uppercase; letter-spacing:.06em; font-family:Arial,Helvetica,sans-serif; margin:${mt} 0 6px; border-bottom:1px solid #166534; padding-bottom:4px;">${g.department}</div>`;
      firstDept = false;
    }
    for (const item of (g.items ?? [])) {
      rows += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:4px;"><tr>
  <td width="22" valign="top" style="font-size:14px; line-height:20px; mso-line-height-rule:exactly; font-family:Arial,Helvetica,sans-serif;">✅</td>
  <td style="font-size:13px; line-height:20px; mso-line-height-rule:exactly; color:#d1fae5; font-family:Arial,Helvetica,sans-serif; word-break:normal; word-wrap:break-word; mso-line-break-override:none;">${stripCheckmark(item)}</td>
</tr></table>`;
    }
    if (g.overflowNote) rows += `<div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:${c.textSecondary}; font-family:Arial,Helvetica,sans-serif; font-style:italic; margin-top:4px;"><em>${g.overflowNote}</em></div>`;
  }
  // Notable Progress — label INSIDE the green box, green border around entire section
  return `<tr><td style="padding:0 0 20px; font-family:Arial,Helvetica,sans-serif;">
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#166534" width="100%" style="background-color:#0d2818; margin-bottom:12px;">
  <tr><td style="padding:16px 20px; background-color:#0d2818; font-family:Arial,Helvetica,sans-serif;">
  <![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0d2818; border:1px solid #166534; border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:12px;">
  <tr><td style="padding:16px 20px; font-family:Arial,Helvetica,sans-serif;">
  <!--<![endif]-->
    <div style="font-size:11px; font-weight:600; color:#4ade80; text-transform:uppercase; letter-spacing:.08em; font-family:Arial,Helvetica,sans-serif; mso-line-height-rule:exactly; margin-bottom:12px;">🏆 Notable progress today</div>
    ${rows}
  </td></tr>
  </table>
</td></tr>`;
}
```

### 2G. Rewrite emailNeedsAttention() — better spacing between items

Find the `emailNeedsAttention()` function (around line 1115). In the existing function, find the line that generates each attention row and increase the margin-bottom from 8px to 12px. Also change the Needs Attention card wrapper to match the department blue treatment.

Specifically, change the card wrapper at the bottom of the function from:

```typescript
  return `<tr><td style="padding:0 0 16px; font-family:Arial,Helvetica,sans-serif;">
  <div style="${e.secLabel}">🔥 Needs attention now</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#334155" width="100%" style="background-color:#1e293b; border:1px solid rgba(255,255,255,0.08); border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:12px;">
  <tr><td style="padding:4px 16px; background-color:#1e293b; font-family:Arial,Helvetica,sans-serif;">${rows}</td></tr>
  </table>
</td></tr>`;
```

To:

```typescript
  return `<tr><td style="padding:0 0 20px; font-family:Arial,Helvetica,sans-serif;">
  <div style="${e.secLabel}">🔥 Needs attention now</div>
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="0" border="1" bordercolor="#334155" width="100%" style="background-color:#1e293b; margin-bottom:12px;">
  <tr><td style="padding:12px 20px; background-color:#1e293b; font-family:Arial,Helvetica,sans-serif;">
  <![endif]-->
  <!--[if !mso]><!-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#1e293b; border:1px solid rgba(255,255,255,0.08); border-radius:12px; -webkit-border-radius:12px; overflow:hidden; margin-bottom:12px;">
  <tr><td style="padding:12px 20px; font-family:Arial,Helvetica,sans-serif;">
  <!--<![endif]-->
  ${rows}
  </td></tr>
  </table>
</td></tr>`;
```

### 2H. Update emailTimeBars() — fix alignment

Find the `emailTimeBars()` function. Change the label column width from `width="130"` to `width="140"` and increase the hours column from `width="45"` to `width="50"`. This gives more room for longer labels and hours like "1.3h".

In the time bar row template, find:
```
<td width="130" valign="top"
```
Replace with:
```
<td width="140" valign="top"
```

And find:
```
<td width="45" valign="top"
```
Replace with:
```
<td width="50" valign="top"
```

### 2I. Update emailPulse() — add date formatting

Find the `emailPulse()` function. In the header area where the org name "Plaza Properties" and "Executive Summary" are rendered (inside `renderEmailHtml`, around line 1277-1287), change the date font size from 11px to 13px to make it more prominent:

Find:
```
<div style="font-size:11px; line-height:16px; mso-line-height-rule:exactly; color:rgba(255,255,255,0.6);
```

In the header td, replace with:
```
<div style="font-size:13px; line-height:18px; mso-line-height-rule:exactly; color:rgba(255,255,255,0.7); font-weight:500;
```

### 2J. Update renderEmailHtml() — add spacing to Individual Reports label

Find the "Individual reports" section label inside `renderEmailHtml()` (around line 1293). Add more top padding:

Change:
```
<tr><td style="padding:0 0 12px; font-family:Arial,Helvetica,sans-serif;"><div style="${e.secLabel}">👤 Individual reports</div></td></tr>
```

To:
```
<tr><td style="padding:20px 0 12px; font-family:Arial,Helvetica,sans-serif;"><div style="${e.secLabel}">👤 Individual reports</div></td></tr>
```

---

## PART 3 — VERIFY AND DEPLOY

After making all changes:
1. Run `npx tsc --noEmit` to verify no TypeScript errors
2. Trigger a report generation for the Plaza Properties workspace
3. Verify the email is sent successfully
4. Confirm deployment was successful

Do NOT mark as complete without verifying deployment.
