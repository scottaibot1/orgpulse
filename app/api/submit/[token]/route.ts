import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { extractReportData, extractReportDataFromPdf, getPdfPageCount, updateCanonicalNarrative, type ExtractedReportData } from "@/lib/ai";
import { PDFDocument } from "pdf-lib";
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

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_PDF_PAGES = 50;

export const maxDuration = 60;

interface Params { params: Promise<{ token: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try { return await handlePost(request, params); }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Submit route unhandled error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handlePost(request: NextRequest, params: { token: string } | Promise<{ token: string }>) {
  const { token } = await params as { token: string };

  // Look up user by submission token
  const user = await prisma.user.findUnique({
    where: { submissionToken: token },
    select: {
      id: true, name: true, orgId: true, isReportingActive: true,
      organization: {
        select: {
          workspaceSettings: {
            select: { anthropicApiKey: true, reportDetailLevel: true }
          }
        }
      },
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
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const reportDetailLevel = user.organization?.workspaceSettings?.reportDetailLevel ?? 3;

  // PDF page count enforcement
  if (isPdf) {
    try {
      const pageCount = await getPdfPageCount(buffer);
      if (pageCount > MAX_PDF_PAGES) {
        return NextResponse.json({
          error: `PDF has ${pageCount} pages. Maximum allowed is ${MAX_PDF_PAGES} pages. Please split your document and resubmit.`
        }, { status: 422 });
      }
    } catch {
      // Continue if page counting fails — Claude will handle it
    }
  }

  // Upload to Supabase Storage
  const filename = `${user.orgId}/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return NextResponse.json({ error: `File upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from("reports").getPublicUrl(filename);

  const apiKey = user.organization?.workspaceSettings?.anthropicApiKey ?? null;

  // AI extraction — PDFs go directly to Claude, everything else gets text-extracted first
  let extracted: ExtractedReportData;
  let rawText = "";
  try {
    if (isPdf) {
      extracted = await extractReportDataFromPdf(buffer, apiKey);
    } else {
      rawText = await extractTextFromBuffer(buffer, file.type, file.name);
      if (!rawText || rawText.length < 10) {
        return NextResponse.json({ error: "File appears to be empty or unreadable" }, { status: 422 });
      }
      extracted = await extractReportData(rawText, apiKey);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Extraction error:", msg);
    return NextResponse.json({ error: `Processing failed: ${msg}` }, { status: 500 });
  }

  // At detail level 5: extract and store visually significant PDF pages
  let visualPageUrls: string[] = [];
  if (isPdf && reportDetailLevel >= 5 && extracted.pages && extracted.pages.length > 0) {
    const visualPages = extracted.pages.filter((p) => p.includeVisual);
    if (visualPages.length > 0) {
      try {
        const srcDoc = await PDFDocument.load(buffer);
        const visualDoc = await PDFDocument.create();
        const pageIndices = visualPages.map((p) => p.pageNumber - 1).filter((i) => i >= 0 && i < srcDoc.getPageCount());
        if (pageIndices.length > 0) {
          const pages = await visualDoc.copyPages(srcDoc, pageIndices);
          pages.forEach((p) => visualDoc.addPage(p));
          const visualBuffer = Buffer.from(await visualDoc.save());
          const visualFilename = `${user.orgId}/${user.id}/visual-${Date.now()}.pdf`;
          const { error: visualUploadError } = await supabase.storage
            .from("reports")
            .upload(visualFilename, visualBuffer, { contentType: "application/pdf", upsert: false });
          if (!visualUploadError) {
            const { data: { publicUrl: visualUrl } } = supabase.storage.from("reports").getPublicUrl(visualFilename);
            visualPageUrls = [visualUrl];
          }
        }
      } catch (e) {
        console.error("Visual page extraction error:", e);
        // Non-fatal — continue without visual pages
      }
    }
  }

  const uploadedAt = new Date();
  const today = new Date(uploadedAt);
  today.setHours(0, 0, 0, 0);

  // Timezone-aware default: uploads between UTC 00:00–08:00 are almost certainly
  // US evening submissions (ET=UTC-4, PT=UTC-8) — treat the prior calendar day
  // as the likely report date if extraction fails.
  const utcHour = uploadedAt.getUTCHours();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const likelyDefault = utcHour < 8 ? yesterday : today;

  // Resolve report date: prefer extracted date (most reliable), then timezone-aware default
  let resolvedReportDate: Date = likelyDefault;
  if (extracted.reportDate) {
    try {
      const candidate = new Date(extracted.reportDate);
      if (!isNaN(candidate.getTime())) {
        const diffDays = Math.abs((candidate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          candidate.setUTCHours(0, 0, 0, 0);
          resolvedReportDate = candidate;
        }
      }
    } catch { /* fall through to likelyDefault */ }
  }

  // Create Report record
  const report = await prisma.report.create({
    data: {
      userId: user.id,
      source: "pdf_upload",
      rawText: rawText.slice(0, 10000),
      rawPdfUrl: publicUrl,
      reportDate: resolvedReportDate,
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
      parsedWithVision: isPdf,
      visualPageUrls: visualPageUrls.length > 0 ? visualPageUrls : Prisma.JsonNull,
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

  // Update CanonicalNarrative — fire and forget, non-blocking
  (async () => { try {
    const existing = await prisma.canonicalNarrative.findUnique({
      where: { userId: user.id },
    });

    // Get last 30 days of parsed reports for context
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentParsed = await prisma.parsedReport.findMany({
      where: { userId: user.id, id: { not: parsedReport.id }, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
      take: 10,
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
    console.error("Narrative update error:", e);
  } })();

  return NextResponse.json({ reportId: report.id, summary: extracted.summary }, { status: 201 });
}
