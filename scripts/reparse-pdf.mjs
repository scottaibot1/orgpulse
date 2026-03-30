#!/usr/bin/env node
// STEP 5: Re-parse Alan's PDF with the new vision pipeline and print raw JSON
// Usage: node scripts/reparse-pdf.mjs

import { readFileSync, existsSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Load env vars (load all files, later files override earlier) ──────────────
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return false;
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] = val; // always override so later files win
  }
  return true;
}

function loadEnv() {
  const root = path.join(__dirname, "..");
  // Load in order — .env.vercel last so its values win
  for (const f of [".env", ".env.local", ".env.vercel"]) {
    if (loadEnvFile(path.join(root, f))) console.log(`Loaded env from ${f}`);
  }
}
loadEnv();

// ── Canvas polyfills for pdfjs rendering in Node.js ──────────────────────────
const { createCanvas, DOMMatrix: NapiDOMMatrix, Path2D: NapiPath2D } = require("@napi-rs/canvas");
if (typeof global.DOMMatrix === "undefined") global.DOMMatrix = NapiDOMMatrix;
if (typeof global.Path2D === "undefined") global.Path2D = NapiPath2D;

// ── Constants ─────────────────────────────────────────────────────────────────
const ALAN_PDF_URL =
  "https://yayhxcgwvnlcgkczaaai.supabase.co/storage/v1/object/public/reports/cmn7ul565000pzjbhuefs54qc/cmn7w1mw1001swovfljkpo1ec/1774652196909-Daily_Executive_Report_-_March_26__2026.pdf";
const CACHED_PDF = path.join(__dirname, "..", ".cache-alan-report.pdf");

const VISION_INSTRUCTION = `You are looking at the actual pages of a work report document as images. Read every single page carefully exactly as a human would. Apply the following rules precisely.

RULE 1 - TABLE PARSING - ROW BOUNDARY EQUALS PROJECT BOUNDARY. For every table you see each row represents one complete independent project or task. That project row may contain multiple pieces of information including the project name, dates, a status, a completion percentage, and an observations column that may contain multiple sentences, updates, blockers, and dependencies. All of that information belongs together as one single consolidated project entry. Do not split a project row into multiple entries just because the observations column contains more than one sentence or update note. The observations column is a running log of all notes blockers dependencies and updates related to that one project. Keep them all together under that one project entry. For example if a row says the project is 4 star reviews and the observations say created a summary for Scott and Kellie, requested a meeting with Kellie, could not meet today, will meet tomorrow that is all one project entry with multiple consolidated observation notes. It is not four separate tasks. The test for whether something is its own separate entry is whether it has its own row in the table with its own project name. If it appears in the observations or notes column of an existing row it belongs to that row's project and must stay with it.

RULE 2 - NEVER MERGE SEPARATE ROWS. Never merge two separate rows into one entry just because they share a similar theme, blocker, or dependency. If the table has a row for "6 emails from John into Nutshell" and a separate row for "4 star reviews" those are two completely different independent projects even if both happen to mention delays or waiting on someone. They stay separate because they are separate rows with separate project names. The row boundary is absolute. Nothing from one row ever combines with another row under any circumstances.

RULE 3 - ACTIVITY LOG PARSING. For daily activity logs where the person lists what they did during specific time blocks treat each time block as one activity entry. Extract the start time, end time, calculate the duration in hours, and capture the full description of everything done during that block as one consolidated description. Do not split a single time block into multiple activities because multiple things were mentioned within it. Calculate total hours worked by summing all activity durations. Build a time allocation breakdown using the actual activity descriptions as labels showing hours and percentage of total for each.

RULE 4 - PLANNED OBJECTIVES PARSING. Extract each bullet point as a separate objective. If the person noted that an objective was not completed, was deferred, or was replaced by something else capture that note as part of that objective entry. Do not discard deferred or incomplete objectives.

RULE 5 - PRESERVE ALL SPECIFIC DATA. Extract and preserve every specific data point without exception including all time entries and hours, all counts of calls emails meetings or any other activities, all named projects clients accounts and tasks exactly as written, all specific dates and deadlines, all dollar amounts quantities and metrics, all status indicators, all specific outcomes and results, and all blocker and dependency notes exactly as written. Do not paraphrase, summarize, or discard any specific detail.

RULE 6 - OUTPUT FORMAT. Return ONLY valid JSON with no markdown fences. The first character must be { and the last must be }:
{
  "personName": string,
  "reportDate": string,
  "department": string,
  "plannedObjectives": [{"objective": string, "completionNote": string}],
  "activities": [{"startTime": string, "endTime": string, "durationHours": number, "description": string}],
  "totalHoursWorked": number,
  "timeAllocation": [{"taskName": string, "hours": number, "percentage": number}],
  "projects": [{"projectName": string, "startDate": string, "estimatedDelivery": string, "lastModified": string, "status": string, "percentageComplete": number, "observationsAndBlockers": string}],
  "risksAndEscalations": [string],
  "executiveSummary": string
}`;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Try env var first, then Prisma database
  let apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.length < 20) {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const settings = await prisma.workspaceSettings.findFirst({ select: { anthropicApiKey: true } });
      apiKey = settings?.anthropicApiKey ?? undefined;
      if (apiKey) console.log("Got Anthropic API key from database");
      await prisma.$disconnect();
    } catch {
      // ignore Prisma errors
    }
  }

  if (!apiKey || apiKey.length < 20) {
    console.error(
      "\nERROR: No valid Anthropic API key found.\n" +
      "Run with your key:\n" +
      "  ANTHROPIC_API_KEY=sk-ant-... node scripts/reparse-pdf.mjs\n" +
      "Or set it in your workspace Settings page and ensure DATABASE_URL is configured.\n"
    );
    process.exit(1);
  }

  // Download or use cached PDF
  let pdfBuffer;
  if (existsSync(CACHED_PDF)) {
    console.log("Using cached PDF:", CACHED_PDF);
    pdfBuffer = readFileSync(CACHED_PDF);
  } else {
    console.log("Downloading Alan PDF...");
    const res = await fetch(ALAN_PDF_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pdfBuffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(CACHED_PDF, pdfBuffer);
    console.log(`Downloaded ${pdfBuffer.length} bytes, cached`);
  }

  // Load pdfjs legacy build for Node.js compatibility
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerSrc = `file://${path.join(__dirname, "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")}`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const pdfDoc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  console.log(`Pages: ${pdfDoc.numPages}`);

  // Render pages → PNG buffers
  const scale = 150 / 72;
  const imageBlocks = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport }).promise;

    const pngBuffer = await canvas.encode("png");
    console.log(`  Page ${i}: ${Math.round(viewport.width)}x${Math.round(viewport.height)}px → ${pngBuffer.length} bytes PNG`);

    imageBlocks.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: pngBuffer.toString("base64") },
    });
  }

  // Send to Claude vision
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic.default({ apiKey });

  console.log(`\nSending ${imageBlocks.length} page images to Claude Haiku...`);
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: [{ type: "text", text: VISION_INSTRUCTION }, ...imageBlocks],
    }],
  });

  const rawText = message.content[0].text;
  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse failed:", e.message);
    console.log("\nRaw response:\n", rawText);
    process.exit(1);
  }

  console.log("\n=== VISION PARSED REPORT ===\n");
  console.log(JSON.stringify(parsed, null, 2));

  console.log(`\n=== PROJECTS ARRAY (${parsed.projects?.length ?? 0} rows) ===`);
  (parsed.projects || []).forEach((p, i) => {
    console.log(`\n  [${i + 1}] "${p.projectName}"`);
    console.log(`      status: ${p.status} | ${p.percentageComplete}% | delivery: ${p.estimatedDelivery}`);
    console.log(`      observations: ${p.observationsAndBlockers}`);
  });
}

main().catch((e) => { console.error("\nFATAL:", e.stack || e.message); process.exit(1); });
