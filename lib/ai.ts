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

// ─── Vision parsing instruction (sent as text block with page images) ────────

const VISION_PARSING_INSTRUCTION = `You are an expert analyst reading a work report you have never seen before from a company you know nothing about. You are looking at the actual pages of this document as images. Read every page completely before extracting anything.

Your job is to understand the structure of every table, list, and narrative section from context alone and extract everything that is meaningful about each person's work. You do not need column headers to be in English or to match any expected format. You do not need status fields to use specific words. You use reasoning to determine what every piece of information means based on its context, position, and content — exactly the way a smart human reader would.

READING TABLES: For every table you encounter, read it as a complete structured dataset. Every row is one record — one project or task. Every column belongs to that record. Understand what each column represents from its header and the data it contains without needing specific words. A column with future dates is likely a due date or delivery target. A column with percentages is likely completion progress. A column with words indicating completion in any language — done, finished, complete, terminado, cerrado, concluido, 100% — means that task is finished. A column with words indicating active work in any language — in progress, proceso, en curso, ongoing, active — means the task is underway. A column showing 0% or words like not started, no empezado, sin iniciar means the task has not begun. A column with observations, notes, or comments is a running log for that row — keep all of its content together with its row. Never split one row into multiple records. Never merge separate rows just because they share a theme.

READING ACTIVITY LOGS: When a person lists time blocks showing what they did throughout a day, each time block is one activity. Extract start time, end time, duration, and the full description of everything in that block as one consolidated entry. Sum all durations for total hours. Build a time allocation breakdown from the actual activity descriptions.

READING FREE-FORM NARRATIVE TEXT: Apply the same intelligent reasoning to unstructured prose as you do to tables. When someone writes casually about their day, read the intent and meaning behind their words — not just the literal surface. A person who writes "this task is challenging" is signaling difficulty and likely needs help — classify it as at-risk or a blocker depending on context. "Waiting to hear back" is a blocker. "Will try again tomorrow" means something did not happen today and progress stalled. "Not sure how to proceed" is a request for guidance. "Had trouble reaching" is a dependency risk. "Rescheduled" means a planned action was deferred. "Almost done" or "nearly finished" implies high completion. "Just started" or "kicked off" implies low completion. "Still working on it" across multiple updates with no change signals stalling.

Read the emotional register and intent of every sentence. If someone sounds stuck, treat them as stuck. If something sounds urgent, treat it as urgent. If something has been mentioned repeatedly with no progress, surface it. An analyst reading this report would notice all of these signals — you must too.

REASONING ABOUT PRIORITY AND STATUS: After understanding every record — whether from a structured table or free-form prose — apply intelligent prioritization. A task whose due date has already passed and is not complete is a problem; surface it prominently with its original due date. A task with a near future due date and low completion is a risk. A task explicitly marked complete or at 100% belongs in completed regardless of where it appears in the document. Anything the person says they plan to do tomorrow or next is their stated next actions. Any task where the language signals difficulty, blockage, or stalling belongs in a more urgent category than on-track. Never leave a task in a vague unclassified state when the document gives enough context to classify it more specifically.

PRESERVE EVERYTHING: Extract every specific data point without exception — all hours, all counts of calls emails meetings or activities, all named projects clients accounts tasks, all specific dates deadlines and dollar amounts, all observations and blocker notes exactly as written. Do not paraphrase, summarize, or discard any specific detail. If a number or name appears in the document it must appear in the output.

OUTPUT FORMAT: Return ONLY a valid JSON object. The first character must be { and the last must be }. Use these exact top-level fields:
{
  "personName": string or "" if not found,
  "reportDate": "YYYY-MM-DD for the date the work was performed — search the entire document for any date reference in the header, title, subject line, or body. This is the date the work happened, not today's date. Return empty string only if truly no date exists anywhere in the document.",
  "department": string or "" if not found,
  "plannedObjectives": [{ "objective": string, "completionNote": string }],
  "activities": [{ "startTime": string, "endTime": string, "durationHours": number, "description": string }],
  "totalHoursWorked": number or 0 if not found,
  "timeAllocation": [{ "taskName": string, "hours": number, "percentage": number }],
  "projects": [{ "projectName": string, "startDate": string, "estimatedDelivery": "YYYY-MM-DD if any column represents a target, due, or delivery date — reason from context, not column name", "lastModified": string, "status": "the raw status text exactly as it appears in the document — do not translate or normalize", "percentageComplete": number, "observationsAndBlockers": string }],
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
  reportDate?: string | null; // YYYY-MM-DD extracted from report content
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

    return {
      description: p.observationsAndBlockers
        ? `[${p.projectName}] ${p.observationsAndBlockers}`
        : p.projectName,
      projectName: p.projectName,
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
    { type: "text", text: VISION_PARSING_INSTRUCTION },
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentBlocks: any[] = [
      { type: "image", source: { type: "base64", media_type: imgMime, data: buffer.toString("base64") } },
      { type: "text", text: VISION_PARSING_INSTRUCTION },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: any[] = [
    {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBuffer.toString("base64") },
    },
    { type: "text", text: VISION_PARSING_INSTRUCTION },
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
