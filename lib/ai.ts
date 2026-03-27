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
}

export async function extractReportData(rawText: string, apiKey?: string | null): Promise<ExtractedReportData> {
  const prompt = loadPrompt("extract-report.txt");
  const raw = await callClaude(prompt, rawText, "claude-sonnet-4-20250514", apiKey);
  try {
    // Strip possible markdown code fences
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as ExtractedReportData;
  } catch {
    // Fallback: treat whole text as a single task
    return {
      summary: rawText.slice(0, 200),
      tasks: [{ description: rawText.slice(0, 500), projectName: null, status: "on_track", pctComplete: null, hoursToday: null, dueDate: null }],
      notes: null,
      blockers: null,
      totalHours: null,
      riskSignals: [],
      projectsMentioned: [],
    };
  }
}

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

export interface CompletenessScore {
  totalExpected: number;
  freshToday: number;
  standIns: { name: string; daysSince: number }[];
  percentage: number;
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
}): Promise<string> {
  const { apiKey, ...rest } = context;
  const prompt = loadPrompt("executive-summary-v2.txt");
  return callClaude(prompt, JSON.stringify(rest), "claude-sonnet-4-20250514", apiKey);
}
