import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { extractReportData, updateCanonicalNarrative, type ExtractedReportData } from "@/lib/ai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
];

interface Params { params: Promise<{ token: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;

  // Look up user by submission token
  const user = await prisma.user.findUnique({
    where: { submissionToken: token },
    select: {
      id: true, name: true, orgId: true, isReportingActive: true,
      organization: { select: { workspaceSettings: { select: { anthropicApiKey: true } } } },
    },
  });

  if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  if (!user.isReportingActive) {
    return NextResponse.json({ error: "Reporting is currently inactive for this person" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx?|pptx?|xlsx?|txt|md)$/i)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload to Supabase Storage
  const filename = `${user.orgId}/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from("reports").getPublicUrl(filename);

  const apiKey = user.organization?.workspaceSettings?.anthropicApiKey ?? null;

  // Extract text
  let rawText: string;
  try {
    rawText = await extractTextFromBuffer(buffer, file.type, file.name);
  } catch (e) {
    console.error("Text extraction error:", e);
    return NextResponse.json({ error: "Could not read file contents" }, { status: 422 });
  }

  if (!rawText || rawText.length < 10) {
    return NextResponse.json({ error: "File appears to be empty or unreadable" }, { status: 422 });
  }

  // AI extraction
  let extracted: ExtractedReportData;
  try {
    extracted = await extractReportData(rawText, apiKey);
  } catch (e) {
    console.error("AI extraction error:", e);
    return NextResponse.json({ error: "AI processing failed" }, { status: 500 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create Report record
  const report = await prisma.report.create({
    data: {
      userId: user.id,
      source: "pdf_upload",
      rawText: rawText.slice(0, 10000),
      rawPdfUrl: publicUrl,
      parsed: true,
    },
  });

  // Create ParsedReport with structured data
  const parsedReport = await prisma.parsedReport.create({
    data: {
      reportId: report.id,
      userId: user.id,
      date: today,
      aiSummary: extracted.summary,
      structuredData: extracted as unknown as Prisma.InputJsonValue,
      notes: extracted.notes,
      blockers: extracted.blockers,
      totalHours: extracted.totalHours ?? null,
    },
  });

  // Create tasks
  if (extracted.tasks.length > 0) {
    await prisma.task.createMany({
      data: extracted.tasks.map((t, i) => ({
        parsedReportId: parsedReport.id,
        userId: user.id,
        description: t.description,
        projectName: t.projectName ?? null,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        hoursToday: t.hoursToday ?? null,
        pctComplete: t.pctComplete ?? null,
        status: t.status,
        priorityRank: i + 1,
      })),
    });
  }

  // Update CanonicalNarrative
  try {
    const existing = await prisma.canonicalNarrative.findUnique({
      where: { userId: user.id },
    });

    // Get last 3 recent parsed reports for context
    const recentParsed = await prisma.parsedReport.findMany({
      where: { userId: user.id, id: { not: parsedReport.id } },
      orderBy: { date: "desc" },
      take: 3,
      select: { structuredData: true },
    });

    const recentReports = recentParsed
      .map((r) => r.structuredData as ExtractedReportData | null)
      .filter(Boolean) as ExtractedReportData[];

    const update = await updateCanonicalNarrative(
      existing?.currentNarrative ?? "",
      recentReports,
      extracted,
      apiKey
    );

    await prisma.canonicalNarrative.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        orgId: user.orgId,
        currentNarrative: update.narrative,
        projectsMentioned: update.projectsMentioned,
        riskSignals: update.riskSignals,
        lastReportDate: today,
        consecutiveDaysNoChange: update.consecutiveDaysNoChange,
      },
      update: {
        currentNarrative: update.narrative,
        projectsMentioned: update.projectsMentioned,
        riskSignals: update.riskSignals,
        lastReportDate: today,
        consecutiveDaysNoChange: update.consecutiveDaysNoChange,
        lastUpdated: new Date(),
      },
    });
  } catch (e) {
    // Narrative update failure is non-fatal
    console.error("Narrative update error:", e);
  }

  return NextResponse.json({ reportId: report.id, summary: extracted.summary }, { status: 201 });
}
