import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function loadPrompt(filename: string): string {
  const promptPath = path.join(process.cwd(), "prompts", filename);
  return fs.readFileSync(promptPath, "utf-8");
}

// ─── Vision parsing instruction (sent as text block with page images) ────────

const VISION_PARSING_INSTRUCTION = `You are looking at the actual pages of a work report document as images. Read every single page carefully exactly as a human would. Apply the following rules precisely.

RULE 1 - TABLE PARSING - ROW BOUNDARY EQUALS PROJECT BOUNDARY. For every table you see each row represents one complete independent project or task. That project row may contain multiple pieces of information including the project name, dates, a status, a completion percentage, and an observations column that may contain multiple sentences, updates, blockers, and dependencies. All of that information belongs together as one single consolidated project entry. Do not split a project row into multiple entries just because the observations column contains more than one sentence or update note. The observations column is a running log of all notes blockers dependencies and updates related to that one project. Keep them all together under that one project entry. For example if a row says the project is 4 star reviews and the observations say created a summary for Scott and Kellie, requested a meeting with Kellie, could not meet today, will meet tomorrow that is all one project entry with multiple consolidated observation notes. It is not four separate tasks. The test for whether something is its own separate entry is whether it has its own row in the table with its own project name. If it appears in the observations or notes column of an existing row it belongs to that row's project and must stay with it.

RULE 2 - NEVER MERGE SEPARATE ROWS. Never merge two separate rows into one entry just because they share a similar theme, blocker, or dependency. If the table has a row for "6 emails from John into Nutshell" and a separate row for "4 star reviews" those are two completely different independent projects even if both happen to mention delays or waiting on someone. They stay separate because they are separate rows with separate project names. The row boundary is absolute. Nothing from one row ever combines with another row under any circumstances.

RULE 3 - ACTIVITY LOG PARSING. For daily activity logs where the person lists what they did during specific time blocks treat each time block as one activity entry. Extract the start time, end time, calculate the duration in hours, and capture the full description of everything done during that block as one consolidated description. Do not split a single time block into multiple activities because multiple things were mentioned within it. Calculate total hours worked by summing all activity durations. Build a time allocation breakdown using the actual activity descriptions as labels showing hours and percentage of total for each.

RULE 4 - PLANNED OBJECTIVES PARSING. Extract each bullet point as a separate objective. If the person noted that an objective was not completed, was deferred, or was replaced by something else capture that note as part of that objective entry. Do not discard deferred or incomplete objectives.

RULE 5 - PRESERVE ALL SPECIFIC DATA. Extract and preserve every specific data point without exception including all time entries and hours, all counts of calls emails meetings or any other activities, all named projects clients accounts and tasks exactly as written, all specific dates and deadlines, all dollar amounts quantities and metrics, all status indicators, all specific outcomes and results, and all blocker and dependency notes exactly as written. Do not paraphrase, summarize, or discard any specific detail.

RULE 6 - OUTPUT FORMAT. Return ONLY a valid JSON object. The first character must be { and the last must be }. Use these exact top-level fields:
{
  "personName": string or "" if not found,
  "reportDate": string (YYYY-MM-DD) or "" if not found,
  "department": string or "" if not found,
  "plannedObjectives": [{ "objective": string, "completionNote": string }],
  "activities": [{ "startTime": string, "endTime": string, "durationHours": number, "description": string }],
  "totalHoursWorked": number or 0 if not found,
  "timeAllocation": [{ "taskName": string, "hours": number, "percentage": number }],
  "projects": [{ "projectName": string, "startDate": string, "estimatedDelivery": string, "lastModified": string, "status": string, "percentageComplete": number, "observationsAndBlockers": string }],
  "risksAndEscalations": [string],
  "executiveSummary": string
}`;

// ─── New Vision schema ────────────────────────────────────────────────────────

export interface VisionParsedReport {
  personName: string;
  reportDate: string;
  department: string;
  plannedObjectives: Array<{ objective: string; completionNote: string }>;
  activities: Array<{ startTime: string; endTime: string; durationHours: number; description: string }>;
  totalHoursWorked: number;
  timeAllocation: Array<{ taskName: string; hours: number; percentage: number }>;
  projects: Array<{
    projectName: string;
    startDate: string;
    estimatedDelivery: string;
    lastModified: string;
    status: string;
    percentageComplete: number;
    observationsAndBlockers: string;
  }>;
  risksAndEscalations: string[];
  executiveSummary: string;
}

// ─── Legacy schema (kept for non-PDF text extraction and backward compat) ────

export interface ExtractedReportData {
  summary: string;
  tasks: {
    description: string;
    projectName: string | null;
    status: "on_track" | "at_risk" | "blocked" | "complete";
    pctComplete: number | null;
    hoursToday: number | null;
    dueDate: string | null;
  }[];
  notes: string | null;
  blockers: string | null;
  totalHours: number | null;
  riskSignals: string[];
  projectsMentioned: string[];
  pages?: { pageNumber: number; includeVisual: boolean }[];
}

// ─── Adapt VisionParsedReport → ExtractedReportData ──────────────────────────

function mapProjectStatus(s: string): ExtractedReportData["tasks"][0]["status"] {
  const l = s.toLowerCase();
  if (l.includes("block") || l.includes("wait") || l.includes("authoriz") || l.includes("pending") || l.includes("on hold")) return "blocked";
  if (l.includes("risk") || l.includes("delay") || l.includes("behind") || l.includes("overdue")) return "at_risk";
  if (l.includes("complete") || l.includes("done") || l.includes("finish") || l.includes("closed")) return "complete";
  return "on_track";
}

export function visionToExtractedData(vision: VisionParsedReport): ExtractedReportData {
  // Each project row → its own task (preserving row boundary)
  const projectTasks = vision.projects.map((p) => ({
    description: p.observationsAndBlockers
      ? `[${p.projectName}] ${p.observationsAndBlockers}`
      : p.projectName,
    projectName: p.projectName,
    status: mapProjectStatus(p.status),
    pctComplete: p.percentageComplete || null,
    hoursToday: null as number | null,
    dueDate: p.estimatedDelivery || null,
  }));

  // Each activity → its own task
  const activityTasks = vision.activities.map((a) => ({
    description: a.description,
    projectName: null as string | null,
    status: "on_track" as const,
    pctComplete: null as number | null,
    hoursToday: a.durationHours || null,
    dueDate: null as string | null,
  }));

  const blockerProjects = vision.projects
    .filter((p) => mapProjectStatus(p.status) === "blocked")
    .map((p) => `${p.projectName}: ${p.observationsAndBlockers}`);

  const objectivesNote = vision.plannedObjectives
    .map((o) => o.objective + (o.completionNote ? ` (${o.completionNote})` : ""))
    .join("; ");

  return {
    summary: vision.executiveSummary || vision.activities.map((a) => a.description).join("; "),
    tasks: [...projectTasks, ...activityTasks],
    notes: objectivesNote || null,
    blockers: blockerProjects.join("; ") || null,
    totalHours: vision.totalHoursWorked || null,
    riskSignals: vision.risksAndEscalations,
    projectsMentioned: vision.projects.map((p) => p.projectName).filter(Boolean),
    pages: [],
  };
}

// ─── General Claude call ──────────────────────────────────────────────────────

export async function callClaude(
  prompt: string,
  userMessage: string,
  model: "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001" = "claude-sonnet-4-20250514",
  apiKey?: string | null
): Promise<string> {
  const client = apiKey ? new Anthropic({ apiKey }) : anthropic;
  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system: prompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");
  return content.text;
}

export async function parseReport(rawText: string): Promise<string> {
  const prompt = loadPrompt("parse-report.txt");
  return callClaude(prompt, rawText);
}

export async function generateDailySummary(reportsContext: string): Promise<string> {
  const prompt = loadPrompt("daily-summary.txt");
  return callClaude(prompt, reportsContext);
}

export async function draftEmail(context: string): Promise<string> {
  const prompt = loadPrompt("draft-email.txt");
  return callClaude(prompt, context);
}

export async function chatQuery(question: string, reportContext: string): Promise<string> {
  const prompt = loadPrompt("chat-query.txt");
  return callClaude(prompt, `Question: ${question}\n\nReport Context:\n${reportContext}`);
}

// ─── PDF page count ───────────────────────────────────────────────────────────

function pdfWorkerSrc(): string {
  return `file://${path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")}`;
}

export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc();
  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
  return pdf.numPages;
}

// ─── PDF → page images ────────────────────────────────────────────────────────

async function pdfToPageImages(buffer: Buffer, fromPage = 1, toPage?: number): Promise<Buffer[]> {
  // Use the legacy build for Node.js compatibility (avoids Promise.try requirement)
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  // Resolve worker via process.cwd() — safe in both ESM and Next.js bundled CJS context
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createCanvas, DOMMatrix: NapiDOMMatrix, Path2D: NapiPath2D } = require("@napi-rs/canvas");
  // Polyfill browser APIs needed for PDF rendering in Node.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (global as any).DOMMatrix === "undefined") (global as any).DOMMatrix = NapiDOMMatrix;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (global as any).Path2D === "undefined") (global as any).Path2D = NapiPath2D;

  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const lastPage = toPage ? Math.min(toPage, pdf.numPages) : pdf.numPages;
  const scale = 150 / 72; // 150 DPI
  const images: Buffer[] = [];

  for (let i = fromPage; i <= lastPage; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = canvas.getContext("2d") as any;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const pngBuffer: Buffer = await canvas.encode("png");
    images.push(pngBuffer);
  }

  return images;
}

// ─── Vision JSON parsing ──────────────────────────────────────────────────────

function parseVisionJson(raw: string): VisionParsedReport {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as VisionParsedReport;
}

function mergeVisionReports(parts: VisionParsedReport[]): VisionParsedReport {
  if (parts.length === 1) return parts[0];
  const base = parts[0];
  const merged: VisionParsedReport = {
    personName: base.personName,
    reportDate: base.reportDate,
    department: base.department,
    plannedObjectives: parts.flatMap((p) => p.plannedObjectives),
    activities: parts.flatMap((p) => p.activities),
    totalHoursWorked: parts.reduce((sum, p) => sum + (p.totalHoursWorked || 0), 0),
    timeAllocation: parts.flatMap((p) => p.timeAllocation),
    projects: parts.flatMap((p) => p.projects),
    risksAndEscalations: Array.from(new Set(parts.flatMap((p) => p.risksAndEscalations))),
    executiveSummary: parts.map((p) => p.executiveSummary).filter(Boolean).join(" "),
  };
  return merged;
}

// ─── Single-batch vision API call ────────────────────────────────────────────

async function callClaudeVisionBatch(pageImages: Buffer[], client: Anthropic): Promise<VisionParsedReport> {
  const imageBlocks = pageImages.map((img) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: "image/png" as const,
      data: img.toString("base64"),
    },
  }));

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: [
        { type: "text", text: VISION_PARSING_INSTRUCTION },
        ...imageBlocks,
      ],
    }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from vision call");
  return parseVisionJson(content.text);
}

// ─── Public: extract raw vision data (for verification / debugging) ───────────

export async function extractReportVision(
  pdfBuffer: Buffer,
  apiKey?: string | null
): Promise<VisionParsedReport> {
  const client = apiKey ? new Anthropic({ apiKey }) : anthropic;

  let pageCount = 0;
  try {
    pageCount = await getPdfPageCount(pdfBuffer);
  } catch {
    pageCount = 0;
  }

  const PAGES_PER_BATCH = 10;

  if (pageCount > PAGES_PER_BATCH) {
    // Process in batches of 10 pages, merge results
    const batches: Promise<VisionParsedReport>[] = [];
    for (let start = 1; start <= pageCount; start += PAGES_PER_BATCH) {
      const end = Math.min(start + PAGES_PER_BATCH - 1, pageCount);
      batches.push(
        pdfToPageImages(pdfBuffer, start, end).then((imgs) =>
          callClaudeVisionBatch(imgs, client)
        )
      );
    }
    const parts = await Promise.all(batches);
    return mergeVisionReports(parts);
  } else {
    const pageImages = await pdfToPageImages(pdfBuffer, 1, pageCount || undefined);
    return callClaudeVisionBatch(pageImages, client);
  }
}

// ─── Public: extract → ExtractedReportData (used by submit pipeline) ─────────

export async function extractReportDataFromPdf(
  pdfBuffer: Buffer,
  apiKey?: string | null
): Promise<ExtractedReportData> {
  try {
    const vision = await extractReportVision(pdfBuffer, apiKey);
    return visionToExtractedData(vision);
  } catch (err) {
    console.error("Vision extraction failed:", err);
    return {
      summary: "Could not extract report data.",
      tasks: [],
      notes: null,
      blockers: null,
      totalHours: null,
      riskSignals: [],
      projectsMentioned: [],
      pages: [],
    };
  }
}

// ─── Legacy text-based extraction (non-PDF files) ─────────────────────────────

function parseExtractedJson(raw: string): ExtractedReportData {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as ExtractedReportData;
}

export async function extractReportData(rawText: string, apiKey?: string | null): Promise<ExtractedReportData> {
  const prompt = loadPrompt("extract-report.txt");
  const raw = await callClaude(prompt, rawText, "claude-haiku-4-5-20251001", apiKey);
  try {
    return parseExtractedJson(raw);
  } catch {
    return {
      summary: rawText.slice(0, 200),
      tasks: [{ description: rawText.slice(0, 500), projectName: null, status: "on_track", pctComplete: null, hoursToday: null, dueDate: null }],
      notes: null,
      blockers: null,
      totalHours: null,
      riskSignals: [],
      projectsMentioned: [],
      pages: [],
    };
  }
}

// ─── Canonical narrative ──────────────────────────────────────────────────────

export interface NarrativeUpdate {
  narrative: string;
  projectsMentioned: string[];
  riskSignals: string[];
  consecutiveDaysNoChange: number;
}

export async function updateCanonicalNarrative(
  currentNarrative: string,
  recentReports: ExtractedReportData[],
  todayReport: ExtractedReportData,
  apiKey?: string | null
): Promise<NarrativeUpdate> {
  const prompt = loadPrompt("narrative-update.txt");
  const userMessage = JSON.stringify({
    currentNarrative,
    recentReports,
    todayReport,
  });
  const raw = await callClaude(prompt, userMessage, "claude-sonnet-4-20250514", apiKey);
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as NarrativeUpdate;
  } catch {
    return {
      narrative: todayReport.summary,
      projectsMentioned: todayReport.projectsMentioned,
      riskSignals: todayReport.riskSignals,
      consecutiveDaysNoChange: 0,
    };
  }
}

// ─── Executive summary ────────────────────────────────────────────────────────

export interface CompletenessScore {
  totalExpected: number;
  freshToday: number;
  standIns: { name: string; daysSince: number }[];
  percentage: number;
  notScheduledToday?: { name: string }[];
}

export async function generateExecutiveSummaryV2(context: {
  apiKey?: string | null;
  orgName: string;
  summaryDate: string;
  completenessScore: CompletenessScore;
  people: {
    name: string;
    department: string;
    narrative: string;
    riskSignals: string[];
    reportDate: string;
    isStandIn: boolean;
    daysSinceReport: number;
  }[];
  alerts: string[];
  reportDetailLevel?: number;
  departmentOrdering?: string;
  departmentOrder?: string[];
}): Promise<string> {
  const { apiKey, ...rest } = context;
  const prompt = loadPrompt("executive-summary-v2.txt");
  return callClaude(prompt, JSON.stringify(rest), "claude-sonnet-4-20250514", apiKey);
}
