#!/usr/bin/env node
// render-email.cjs — generates email HTML template
// Run: node_modules/.bin/jiti scripts/render-email.cjs

const path = require('path');
const fs = require('fs');

const jiti = require(path.join(__dirname, '../node_modules/jiti/dist/jiti.js'));
const jitiLoader = jiti(__filename, { interopDefault: true });
const { renderEmailHtml } = jitiLoader(path.join(__dirname, '../lib/report-renderer.ts'));

const data = {
  todaysPulse: "Reservations resolved a high-stakes VRBO capacity violation and cleared every guest queue while Sales pushed 2 hot deals toward close and generated 5 new inbound inquiries — but Arturo carries 6 overdue projects at Private Paradise and the travel agent partnership expansion is blocked waiting on executive approval.",
  completenessScore: {
    totalExpected: 4, freshToday: 4, percentage: 100,
    standIns: [], missing: [], notScheduledToday: [],
  },
  needsAttentionNow: [
    { status: "overdue", daysOverdue: 358, dueDate: "4/10/25", pctComplete: 70, who: "Arturo Montes", department: "Private Paradise", text: "In-house waterslide sealing — materials received, work stalled at 70%" },
    { status: "overdue", daysOverdue: 358, dueDate: "4/10/25", pctComplete: 50, who: "Arturo Montes", department: "Private Paradise", text: "A/C units preventive maintenance units 1–5 — waiting on vacancy, 50% complete" },
    { status: "overdue", daysOverdue: 4,   dueDate: "3/28",    pctComplete: 80, who: "Alan Arceo",    department: "Reservations",    text: "Book now on all listings analysis — Owner Rez confirmed capability, needs decision" },
    { status: "overdue", daysOverdue: 2,   dueDate: "3/30",    pctComplete: 50, who: "Alan Arceo",    department: "Reservations",    text: "AI templates for US homes — sent to Scott and Kellie March 19, no review received" },
    { status: "overdue", daysOverdue: 1,   dueDate: "3/31",    pctComplete: 0,  who: "Arturo Montes", department: "Private Paradise", text: "PP Security Proposal — 0% complete, never started" },
    { status: "overdue", daysOverdue: 1,   dueDate: "3/31",    pctComplete: 25, who: "Arturo Montes", department: "Private Paradise", text: "Pavers — sourcing 3rd vendor quote per John's request, 25% complete" },
    { status: "overdue", daysOverdue: 1,   dueDate: "3/30",    pctComplete: 80, who: "Arturo Montes", department: "Private Paradise", text: "Telmex WiFi intensity optimization — line working but suboptimal, 80% complete" },
    { status: "blocked", daysOverdue: null, dueDate: null, pctComplete: null, who: "Bella", department: "Sales", text: "Travel agent vetting form — completed, waiting for executive approval" },
  ],
  waitingOnExternal: [
    { text: "AI templates awaiting review from Scott and Kellie since March 19", who: "Alan Arceo" },
    { text: "Smoothies awaiting Creative Team next steps", who: "Arturo Montes" },
    { text: "Laura Kessler and Imani Allen — hot leads waiting on group decisions", who: "Bella" },
  ],
  notableProgress: [
    {
      department: "Reservations",
      items: [
        "Alan secured penalty-free VRBO cancellation for FFE tenant capacity violation after 3+ hours of platform calls",
        "Alan finalized wedding quote with Kellie including full payment structure",
        "Alan resolved undated PP customer check with tenant authorization",
        "Antonio completed all FFE rules calls and sent every quote",
        "Antonio prepared all PP F&B quotes and preference sheets for Isabella's guests",
        "Antonio organized and documented all new inquiries",
      ],
    },
    {
      department: "Sales",
      items: [
        "Bella completed travel agent vetting form — partner channel expansion ready pending approval",
        "Bella contacted 10 leads and received 5 new inbound inquiries in one day",
      ],
    },
    {
      department: "Private Paradise",
      items: [
        "Arturo secured apartment rental with deposit confirmed",
        "UV light installed and operational",
        "Ping pong table assembled, deck umbrella assembled, ceviche spoons delivered",
        "Gardener uniforms upgraded to PP logo rashguard shirts",
        "Ponchito's raise accepted and processed",
        "Waterslide maintenance materials received, guest safety guidelines communicated",
      ],
      overflowNote: "6 additional items completed — view full report",
    },
  ],
  departments: [
    {
      name: "Reservations", emoji: "📦", reportedCount: 2, totalCount: 2,
      statusLabel: "All reported", statusOk: true,
      people: [
        {
          name: "Alan Arceo Mejia", status: "fresh", isStandIn: false,
          daysSinceReport: 0, hoursWorked: 9.2, timeAllocationEstimated: false,
          timeAllocation: [
            { label: "Guest comms & quotes",   hours: 3,   percent: 33 },
            { label: "VRBO/Airbnb resolution", hours: 4,   percent: 43 },
            { label: "Direct booking & check", hours: 1.2, percent: 13 },
            { label: "Break",                  hours: 0.5, percent: 5  },
          ],
          highlights: [
            { type: "ontack", subcategory: "Marketing Initiatives", text: "AI templates for US homes — sent to Scott and Kellie 3/19, no review received (50% complete, due 3/30)" },
            { type: "atrisk", subcategory: "Marketing Initiatives", text: "Clean email list — blocked waiting on emails to be finalized (0% complete, due 3/31)" },
            { type: "atrisk", subcategory: "Marketing Initiatives", text: "4-star reviews strategy — meeting with Kellie rescheduled (15% complete, due 4/11)" },
            { type: "ontack", subcategory: "Marketing Initiatives", text: "US home calendar competitor analysis — several days remaining (25% complete, due 4/15)" },
            { type: "ontack", subcategory: "Platform & Operations",  text: "6 emails from John into Nutshell — sent to Nova, need to set deadline (40% complete, due 4/4)" },
            { type: "atrisk", subcategory: "Platform & Operations",  text: "Book now instant booking analysis — Owner Rez confirmed capability (80% complete, due 3/28)" },
            { type: "ontack", subcategory: "Platform & Operations",  text: "PP after-booking email restructure — delayed (0% complete, due 4/15)" },
            { type: "ontack", subcategory: "Platform & Operations",  text: "STS to Paradigm migration — waiting on new Paradigm website (0%)" },
            { type: "tomorrowfocus", text: "Complete and finalize Q1 report" },
            { type: "tomorrowfocus", text: "Follow up on FFE tenant cancellation and refund processing" },
          ],
        },
        {
          name: "Antonio Salazar Ancona", status: "fresh", isStandIn: false,
          daysSinceReport: 0, hoursWorked: 9.3, timeAllocationEstimated: false,
          timeAllocation: [
            { label: "Email & STS review",   hours: 4,    percent: 43 },
            { label: "PP quotes & sheets",   hours: 2,    percent: 22 },
            { label: "Inbox & comms",        hours: 1,    percent: 11 },
            { label: "FFE calls & quotes",   hours: 1.33, percent: 14 },
            { label: "Break",                hours: 1,    percent: 11 },
          ],
          highlights: [
            { type: "ontack", subcategory: "Guest Services", text: "STS pending requirements — all updated, follow-up planned tomorrow" },
            { type: "ontack", subcategory: "Guest Services", text: "PP Food & Beverage quotes and preference sheets — prepared per guest requests" },
            { type: "ontack", subcategory: "Communication",  text: "Reservations inbox — all inquiries addressed with timely responses" },
            { type: "ontack", subcategory: "Communication",  text: "Guest quote follow-up and active inquiry conversion — monitoring responses" },
            { type: "tomorrowfocus", text: "Continue follow-up on all pending STS requirements" },
            { type: "tomorrowfocus", text: "Monitor guest responses and follow up on sent quotes" },
          ],
        },
      ],
    },
    {
      name: "Sales", emoji: "💼", reportedCount: 1, totalCount: 1,
      statusLabel: "All reported", statusOk: true,
      people: [
        {
          name: "Isabella (Bella) Zacarias", status: "fresh", isStandIn: false,
          daysSinceReport: 0, hoursWorked: 5.5, timeAllocationEstimated: false,
          pipeline_snapshot: {
            new_leads_today: 5, leads_contacted: 10, hot_responsive: 2,
            qualified: 61, hot_but_cold: 63, proposals_sent: 0,
          },
          timeAllocation: [
            { label: "Revenue activities", hours: 4,   percent: 73 },
            { label: "Lead mgmt & CRM",    hours: 0.5, percent: 9  },
            { label: "Admin & reporting",  hours: 1,   percent: 18 },
          ],
          highlights: [
            { type: "ontack",  subcategory: "Hot Leads", text: "Laura Kessler — very hot, guiding toward commitment" },
            { type: "ontack",  subcategory: "Hot Leads", text: "Imani Allen — very hot, maintaining momentum toward booking decision" },
            { type: "atrisk",  subcategory: "Hot Leads", text: "2 warm groups at decision point — no confirmed timeline yet" },
            { type: "atrisk",  subcategory: "Hot Leads", text: "63 hot-but-cold leads — qualified for weeks, zero response" },
            { type: "blocker", text: "Retreat leader and personal concierge forms — blocked on travel agent vetting form approval" },
            { type: "tomorrowfocus", text: "Continue advancing Laura Kessler and Imani Allen toward deposit" },
            { type: "tomorrowfocus", text: "Get approval on the vetting form" },
          ],
        },
      ],
    },
    {
      name: "Private Paradise", emoji: "🏝", reportedCount: 1, totalCount: 1,
      statusLabel: "All reported", statusOk: true,
      people: [
        {
          name: "Arturo Montes de Oca", status: "fresh", isStandIn: false,
          daysSinceReport: 0, hoursWorked: null, timeAllocationEstimated: true,
          timeAllocation: [
            { label: "Guest & breakfast ops", hours: 2, percent: 25 },
            { label: "Meetings & alignment",  hours: 2, percent: 25 },
            { label: "Maintenance & ops",     hours: 3, percent: 37 },
            { label: "Admin & payroll",       hours: 1, percent: 12 },
          ],
          highlights: [
            { type: "ontack", subcategory: "Food & Beverage",       text: "Vegan & vegetarian menu — vegan complete, starting vegetarian draft (50% complete, due 4/1)" },
            { type: "atrisk", subcategory: "Food & Beverage",       text: "Smoothies project — waiting on creative team next steps (90% complete, due 3/31)" },
            { type: "ontack", subcategory: "Facilities & Maintenance", text: "Mirrors at Club 33 — 1 of 3 quotes received (10% complete, due 4/15)" },
            { type: "atrisk", subcategory: "Facilities & Maintenance", text: "Telmex WiFi intensity — working but not optimal (80% complete, due 3/30)" },
            { type: "atrisk", subcategory: "Facilities & Maintenance", text: "Waterslide sealing — materials received, work pending (70% complete, due 4/10/25)" },
            { type: "atrisk", subcategory: "Facilities & Maintenance", text: "A/C units maintenance units 1–5 — waiting on vacancy (50% complete, due 4/10/25)" },
            { type: "atrisk", subcategory: "Facilities & Maintenance", text: "Pavers — sourcing 3rd vendor quote (25% complete, due 3/31)" },
            { type: "ontack", subcategory: "Staff & HR",            text: "Staff vacation conciliation — contracts reviewed (70% complete, due 4/1)" },
            { type: "atrisk", subcategory: "Security",              text: "PP security cost-saving proposal — never started (0% complete, due 3/31)" },
            { type: "tomorrowfocus", text: "Supervise Resendiz collecting waterslide data" },
            { type: "tomorrowfocus", text: "Follow up with Scott on smoothies and elevator quotations" },
          ],
        },
      ],
    },
    {
      name: "Accounting", emoji: "💰", reportedCount: 0, totalCount: 1,
      statusLabel: "reports weekly on Fridays", statusOk: false,
      notExpectedToday: true, scheduleLabel: "reports weekly on Fridays", people: [],
    },
  ],
};

const ctx = {
  orgName: "Plaza Properties",
  summaryDate: new Date("2026-03-31T00:00:00"),
  totalSubmissions: 4,
  missingSubmissions: 0,
  createdAt: new Date("2026-03-31T18:00:00"),
  pdfUrl: "https://orgrise.ai/w/demo/summary/march-31/print",
  appUrl: "https://orgrise.ai",
  theme: "dark",
};

const html = renderEmailHtml(data, ctx);
const outPath = '/Users/scott/Desktop/email-template.html';
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Written to ${outPath} (${html.length.toLocaleString()} chars)`);
