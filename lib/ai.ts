import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { anyFileToPdf } from "./file-to-pdf";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function loadPrompt(filename: string): string {
  const promptPath = path.join(process.cwd(), "prompts", filename);
  return fs.readFileSync(promptPath, "utf-8");
}

// ─── Vision parsing instruction — built dynamically with today's date ─────────

function buildVisionInstruction(todayIso: string): string {
  return `Today's date is ${todayIso}. Use this exact date for all overdue calculations. Never use any other date as today.

You are an expert analyst reading a work report you have never seen before. Read every page completely before extracting anything. Your job is to extract every task and classify it into exactly one of six buckets. A task must appear in exactly one bucket — never two.

━━━ CLASSIFICATION RULES — apply before any output ━━━

Assign "classification" to every project/task using exactly one of these values:

"completed" — Status says done, finished, complete, terminado, completado, finalizado, concluido in any language. OR percentageComplete is 100. Completed always wins over any due date. A completed task is NEVER overdue.

"overdue" — Incomplete AND estimatedDelivery is before ${todayIso}. Calculate daysOverdue as exact calendar days between estimatedDelivery and today. Must be a positive integer.

"at_risk" — Incomplete AND estimatedDelivery is within 7 days of ${todayIso}. OR text explicitly flags as problem, at-risk, en riesgo, atrasado, challenging, behind, retrasado — even with no due date.

"in_progress" — Actively being worked. Due date more than 7 days away or no due date. Status is on track, en proceso, ongoing, active, in progress, no empezado (if not yet due).

"blocked" — Explicitly waiting on someone or something. Language: waiting for, en espera, bloqueado, pending approval, can't proceed until, need response from, on hold. Both internal and external waits.

"tomorrow" — Listed under tomorrow's objectives, plans for tomorrow, mañana, próximos pasos, next steps. These are plans, not current work.

DETECTION SIGNALS:
- "Waiting to hear back" → blocked
- "Almost done" / "nearly finished" → in_progress with high pctComplete
- "Not sure how to proceed" → blocked
- 0% complete AND due date before ${todayIso} → overdue
- ≤15% complete AND due within 14 days → at_risk
- Task mentioned repeatedly with no visible progress → note stall in observationsAndBlockers

━━━ SALES PIPELINE DETECTION ━━━

Before classifying tasks, check if this report contains a sales pipeline (leads, hot leads, qualified leads, proposals, conversion metrics, pipeline counts, CRM data, sales activity counts). If present, extract exactly these six numbers — use only numbers explicitly stated in the document, not estimates:
- new_leads_today: leads added or received today
- leads_contacted: leads reached out to today
- hot_responsive: leads actively responding or showing strong interest
- qualified: leads that have been qualified or moved to a qualified stage
- hot_but_cold: leads that were hot but have gone silent or unresponsive
- proposals_sent: proposals or quotes sent today

Set salesPipeline to null if no sales pipeline data exists in this document.

━━━ READING TABLES ━━━

Every row is one record. Never split rows. Never merge rows. Understand columns from context:
- Future dates → estimatedDelivery
- Percentages → percentageComplete
- Completion words (terminado, done, 100%) → completed
- Active words (proceso, ongoing) → in_progress
- Observations/notes/comments → observationsAndBlockers
- lastModified → use internally for staleness detection, do not display

━━━ READING ACTIVITY LOGS AND PROSE ━━━

Activity logs: each time block is one activity with start, end, duration, description. Sum durations for total hours.
Prose: read intent. "Challenging" → at_risk. "Waiting" → blocked. "Rescheduled" → deferred.

━━━ SUBCATEGORY GROUPING ━━━

For operations, facilities, property management, or any role with 8+ tasks: assign a subcategory group name. Examples: "Guest Experience", "Facilities & Maintenance", "Food & Beverage", "Staff & HR", "Administrative", "Vendor Relations". For other roles with fewer tasks, subcategory may be empty string.

━━━ PRESERVE EVERYTHING ━━━

Extract every data point without exception — all hours, counts, named projects, clients, accounts, specific dates, dollar amounts, observations, and blocker notes exactly as written.

OUTPUT FORMAT: Return ONLY valid JSON. First character { last character }.
{
  "personName": string or "",
  "reportDate": "YYYY-MM-DD of the work performed — search entire document. Empty string if truly none.",
  "department": string or "",
  "salesPipeline": { "new_leads_today": number or null, "leads_contacted": number or null, "hot_responsive": number or null, "qualified": number or null, "hot_but_cold": number or null, "proposals_sent": number or null } or null,
  "plannedObjectives": [{ "objective": string, "completionNote": string }],
  "activities": [{ "startTime": string, "endTime": string, "durationHours": number, "description": string }],
  "totalHoursWorked": number or 0,
  "timeAllocation": [{ "taskName": string, "hours": number, "percentage": number }],
  "projects": [
    {
      "projectName": string,
      "startDate": string,
      "estimatedDelivery": "YYYY-MM-DD or empty string",
      "lastModified": string,
      "status": "raw status text exactly as in document",
      "percentageComplete": number,
      "observationsAndBlockers": string,
      "classification": "completed" | "overdue" | "at_risk" | "in_progress" | "blocked" | "tomorrow",
      "daysOverdue": positive integer if overdue, null otherwise,
      "subcategory": string or ""
    }
  ],
  "risksAndEscalations": [string],
  "executiveSummary": string
}

CRITICAL RULES:
1. Every project has exactly one classification — never two.
2. daysOverdue is a positive integer for "overdue" items — never null when classification is "overdue".
3. Completed (100% or done language) is NEVER overdue — completed always wins.
4. Tomorrow plans are "tomorrow" — never "in_progress".
5. Sales pipeline numbers must come from the document — never estimate.`;
}

// ─── New Vision schema ────────────────────────────────────────────────────────

export type TaskClassification = "completed" | "overdue" | "at_risk" | "in_progress" | "blocked" | "tomorrow";

export interface SalesPipeline {
  new_leads_today: number | null;
  leads_contacted: number | null;
  hot_responsive: number | null;
  qualified: number | null;
  hot_but_cold: number | null;
  proposals_sent: number | null;
}

export interface VisionParsedReport {
  personName: string;
  reportDate: string;
  department: string;
  salesPipeline?: SalesPipeline | null;
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
    classification?: TaskClassification;
    daysOverdue?: number | null;
    subcategory?: string;
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
    classification?: TaskClassification;
    daysOverdue?: number | null;
    subcategory?: string | null;
    status: "on_track" | "at_risk" | "blocked" | "complete";
    pctComplete: number | null;
    hoursToday: number | null;
    dueDate: string | null;
  }[];
  salesPipeline?: SalesPipeline | null;
  notes: string | null;
  blockers: string | null;
  totalHours: number | null;
  riskSignals: string[];
  projectsMentioned: string[];
  reportDate?: string | null;
  pages?: { pageNumber: number; includeVisual: boolean }[];
}

// ─── Adapt VisionParsedReport → ExtractedReportData ──────────────────────────

function mapProjectStatus(s: string, pctComplete?: number | null): ExtractedReportData["tasks"][0]["status"] {
  // 100% complete always wins — regardless of any status label or language
  if (pctComplete === 100) return "complete";

  const l = s.toLowerCase().trim();

  // Spanish / multilingual completion terms
  if (l.includes("terminado") || l.includes("completado") || l.includes("finalizado") || l.includes("concluido")) return "complete";
  // Spanish in-progress terms
  if (l.includes("proceso") || l.includes("en progreso") || l.includes("en avance")) return "on_track";
  // Spanish blocked/waiting
  if (l.includes("bloqueado") || l.includes("en espera") || l.includes("detenido")) return "blocked";
  // Spanish at-risk
  if (l.includes("en riesgo") || l.includes("atrasado") || l.includes("retrasado")) return "at_risk";
  // Spanish not started — treat as on_track with 0%
  if (l.includes("no empezado") || l.includes("no iniciado") || l.includes("sin iniciar")) return "on_track";

  // English patterns
  if (l.includes("block") || l.includes("wait") || l.includes("authoriz") || l.includes("on hold")) return "blocked";
  if (l.includes("risk") || l.includes("delay") || l.includes("behind") || l.includes("overdue")) return "at_risk";
  if (l.includes("complete") || l.includes("done") || l.includes("finish") || l.includes("closed") || l === "100%" || l === "100") return "complete";
  if (l.includes("pending")) return "blocked";

  return "on_track";
}

export function visionToExtractedData(vision: VisionParsedReport): ExtractedReportData {
  console.log(`[visionToExtractedData] in: ${vision.projects.length} projects, ${vision.activities.length} activities`);

  // Use the report date as the reference for overdue detection.
  // Fall back to today if none was extracted.
  const reportDate = vision.reportDate ? new Date(vision.reportDate) : new Date();
  reportDate.setUTCHours(23, 59, 59, 999); // treat "due on report day" as still at-risk

  // Each project row → its own task (preserving row boundary)
  const projectTasks = vision.projects.map((p) => {
    let status = mapProjectStatus(p.status, p.percentageComplete);

    // Upgrade to at_risk if the due date has passed and the task is not complete/blocked.
    // mapProjectStatus has no date awareness — this is the only place that can do it.
    if (status === "on_track" && p.estimatedDelivery) {
      try {
        const due = new Date(p.estimatedDelivery);
        if (!isNaN(due.getTime()) && due <= reportDate) {
          status = "at_risk";
          console.log(`[visionToExtractedData] ${p.projectName}: upgraded on_track→at_risk (due ${p.estimatedDelivery} ≤ report ${vision.reportDate})`);
        }
      } catch { /* ignore bad dates */ }
    }

    // Prefer AI-provided classification; fall back to status-derived value
    const classification: TaskClassification | undefined = p.classification ?? (() => {
      if (status === "complete") return "completed";
      if (status === "blocked") return "blocked";
      if (status === "at_risk") return "at_risk";
      return "in_progress";
    })();

    return {
      description: p.observationsAndBlockers
        ? `[${p.projectName}] ${p.observationsAndBlockers}`
        : p.projectName,
      projectName: p.projectName,
      classification,
      daysOverdue: p.daysOverdue ?? null,
      subcategory: p.subcategory || null,
      status,
      // Use ?? not || so that 0% is preserved as 0, not collapsed to null
      pctComplete: p.percentageComplete ?? null,
      hoursToday: null as number | null,
      dueDate: p.estimatedDelivery || null,
    };
  });

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
    .filter((p) => mapProjectStatus(p.status, p.percentageComplete) === "blocked")
    .map((p) => `${p.projectName}: ${p.observationsAndBlockers}`);

  const objectivesNote = vision.plannedObjectives
    .map((o) => o.objective + (o.completionNote ? ` (${o.completionNote})` : ""))
    .join("; ");

  const tasks = [...projectTasks, ...activityTasks];
  console.log(`[visionToExtractedData] out: ${tasks.length} tasks (${projectTasks.length} projects + ${activityTasks.length} activities)`);
  return {
    summary: vision.executiveSummary || vision.activities.map((a) => a.description).join("; "),
    tasks,
    salesPipeline: vision.salesPipeline ?? null,
    notes: objectivesNote || null,
    blockers: blockerProjects.join("; ") || null,
    totalHours: vision.totalHoursWorked || null,
    riskSignals: vision.risksAndEscalations,
    projectsMentioned: vision.projects.map((p) => p.projectName).filter(Boolean),
    reportDate: vision.reportDate || null,
    pages: [],
  };
}

// ─── General Claude call ──────────────────────────────────────────────────────

export async function callClaude(
  prompt: string,
  userMessage: string,
  model: "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001" = "claude-sonnet-4-20250514",
  apiKey?: string | null,
  maxTokens: number = 4096
): Promise<string> {
  const client = apiKey ? new Anthropic({ apiKey }) : anthropic;
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
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

// ─── Native PDF extraction via Claude document API (works on Vercel, no canvas) ─

async function extractReportVisionNative(
  pdfBuffer: Buffer,
  apiKey?: string | null
): Promise<VisionParsedReport> {
  const client = apiKey ? new Anthropic({ apiKey }) : anthropic;

  console.log(`[vision-native] PDF ${pdfBuffer.length}b (${Math.round(pdfBuffer.length / 1024)}KB) → API call start`);
  const todayIso = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: any[] = [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBuffer.toString("base64"),
      },
    },
    { type: "text", text: buildVisionInstruction(todayIso) },
  ];

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from native PDF call");

  const rawText = content.text;
  const stopReason = message.stop_reason;
  console.log(`[vision-native] stop_reason=${stopReason} response_chars=${rawText.length} project_mentions=${(rawText.match(/"projectName"/g) ?? []).length}`);

  if (stopReason === "max_tokens") {
    console.error(`[vision-native] TRUNCATED: hit max_tokens — JSON is incomplete. Last 150 chars: ...${rawText.slice(-150)}`);
    throw new Error("vision-response-truncated: hit max_tokens limit");
  }

  try {
    const parsed = parseVisionJson(rawText);
    console.log(`[vision-native] parsed OK: ${parsed.projects.length} projects, ${parsed.activities.length} activities`);
    return parsed;
  } catch (e) {
    console.error(`[vision-native] JSON parse failed after ${rawText.length} chars. Last 150: ...${rawText.slice(-150)}`);
    throw e;
  }
}

// ─── pdfjs text extraction fallback (last resort, no canvas needed) ───────────

async function extractPdfTextFallback(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc();
  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = content.items.map((item: any) => item.str ?? "").join(" ");
    pages.push(text);
  }
  return pages.join("\n").trim();
}

// ─── Single-batch vision API call (canvas-based, local dev only) ──────────────

async function callClaudeVisionBatch(pageImages: Buffer[], client: Anthropic, todayIso: string): Promise<VisionParsedReport> {
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
        { type: "text", text: buildVisionInstruction(todayIso) },
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
  const todayIso = new Date().toISOString().split("T")[0];

  if (pageCount > PAGES_PER_BATCH) {
    // Process in batches of 10 pages, merge results
    const batches: Promise<VisionParsedReport>[] = [];
    for (let start = 1; start <= pageCount; start += PAGES_PER_BATCH) {
      const end = Math.min(start + PAGES_PER_BATCH - 1, pageCount);
      batches.push(
        pdfToPageImages(pdfBuffer, start, end).then((imgs) =>
          callClaudeVisionBatch(imgs, client, todayIso)
        )
      );
    }
    const parts = await Promise.all(batches);
    return mergeVisionReports(parts);
  } else {
    const pageImages = await pdfToPageImages(pdfBuffer, 1, pageCount || undefined);
    return callClaudeVisionBatch(pageImages, client, todayIso);
  }
}

// ─── Public: extract → ExtractedReportData (used by submit pipeline) ─────────

export async function extractReportDataFromPdf(
  pdfBuffer: Buffer,
  apiKey?: string | null
): Promise<ExtractedReportData> {
  // Primary: Claude native PDF document API — no canvas, works on Vercel
  try {
    const vision = await extractReportVisionNative(pdfBuffer, apiKey);
    return visionToExtractedData(vision);
  } catch (err) {
    console.error("[extractReportDataFromPdf] Native PDF extraction failed — FALLING BACK TO TEXT. Tables/structure will be lost. Error:", err);
  }

  // Fallback: pdfjs text extraction + text-based Claude call
  console.log("[extractReportDataFromPdf] Text fallback path: extracting plain text from PDF");
  try {
    const text = await extractPdfTextFallback(pdfBuffer);
    if (text && text.length >= 10) {
      return await extractReportData(text, apiKey);
    }
  } catch (err) {
    console.error("Text fallback extraction failed:", err);
  }

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

// ─── Legacy text-based extraction (non-PDF files) ─────────────────────────────

function parseExtractedJson(raw: string): ExtractedReportData {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as ExtractedReportData;
}

export async function extractReportData(rawText: string, apiKey?: string | null): Promise<ExtractedReportData> {
  const rawPrompt = loadPrompt("extract-report.txt");
  const todayIso = new Date().toISOString().split("T")[0];
  const prompt = rawPrompt.replace(/\{\{TODAY_DATE\}\}/g, todayIso);
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

// ─── Unified file extraction — all content sent as vision inputs, never as text ─

export async function extractReportDataFromFile(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  apiKey?: string | null
): Promise<{ data: ExtractedReportData; usedVision: boolean }> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const isPdf = mimeType === "application/pdf" || ext === "pdf";
  const isImage =
    ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mimeType) ||
    ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);

  const client = apiKey ? new Anthropic({ apiKey }) : anthropic;

  // ── PDF: Claude native document API ─────────────────────────────────────────
  if (isPdf) {
    console.log(`[vision-ingest] ${filename}: routing=PDF → content blocks=[document, text]`);
    const data = await extractReportDataFromPdf(buffer, apiKey);
    return { data, usedVision: true };
  }

  // ── Image: direct vision input ───────────────────────────────────────────────
  if (isImage) {
    const imgMime = (
      mimeType.startsWith("image/") ? mimeType : `image/${ext === "jpg" ? "jpeg" : ext}`
    ) as "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    const todayIso = new Date().toISOString().split("T")[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentBlocks: any[] = [
      { type: "image", source: { type: "base64", media_type: imgMime, data: buffer.toString("base64") } },
      { type: "text", text: buildVisionInstruction(todayIso) },
    ];
    console.log(`[vision-ingest] ${filename}: routing=image/${ext} → content blocks=[${contentBlocks.map((b) => b.type).join(", ")}]`);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type from image vision call");
    const rawText = content.text;
    const stopReason = message.stop_reason;
    console.log(`[vision-ingest] ${filename}: image stop_reason=${stopReason} chars=${rawText.length}`);
    const vision = parseVisionJson(rawText);
    return { data: visionToExtractedData(vision), usedVision: true };
  }

  // ── All other types: convert to PDF → Claude native document API ─────────────
  // Excel, DOCX, PPTX, CSV, plain text → rendered PDF → Claude reads visually
  // Never extracts raw text. pdf-lib is pure JS, works on Vercel with no native deps.
  const pdfBuffer = await anyFileToPdf(buffer, mimeType, filename);
  const todayIsoForFile = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: any[] = [
    {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBuffer.toString("base64") },
    },
    { type: "text", text: buildVisionInstruction(todayIsoForFile) },
  ];
  console.log(
    `[vision-ingest] ${filename}: routing=${ext}→PDF (${pdfBuffer.length}b ${Math.round(pdfBuffer.length / 1024)}KB) → content blocks=[${contentBlocks.map((b) => b.type).join(", ")}]`
  );

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from document vision call");

  const rawText = content.text;
  const stopReason = message.stop_reason;
  console.log(
    `[vision-ingest-response] ${filename}: stop_reason=${stopReason} chars=${rawText.length} project_mentions=${(rawText.match(/"projectName"/g) ?? []).length}`
  );

  if (stopReason === "max_tokens") {
    console.error(`[vision-ingest] TRUNCATED: ${filename} hit max_tokens. Last 150: ...${rawText.slice(-150)}`);
    throw new Error("vision-response-truncated: hit max_tokens limit");
  }

  try {
    const vision = parseVisionJson(rawText);
    console.log(`[vision-ingest] ${filename}: parsed OK — ${vision.projects.length} projects, ${vision.activities.length} activities`);
    return { data: visionToExtractedData(vision), usedVision: true };
  } catch (e) {
    console.error(`[vision-ingest] ${filename}: JSON parse failed after ${rawText.length} chars. Last 150: ...${rawText.slice(-150)}`);
    throw e;
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
  reportingWindowStart?: string | null; // ISO date — only reports >= this qualify for Notable Progress
  notExpectedDepartments?: { name: string; scheduleLabel: string }[]; // Departments with no expected members today
}): Promise<string> {
  const { apiKey, ...rest } = context;
  const rawPrompt = loadPrompt("executive-summary-v2.txt");
  const now = new Date();
  const todayFormatted = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const prompt = rawPrompt.replace("{{TODAY_DATE}}", `Today's date is ${todayFormatted}.`);
  return callClaude(prompt, JSON.stringify(rest), "claude-sonnet-4-20250514", apiKey, 8192);
}
