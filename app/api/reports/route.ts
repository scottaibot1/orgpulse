import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const taskSchema = z.object({
  description: z.string().min(1),
  projectName: z.string().optional(),
  dueDate: z.string().optional(),
  hoursToday: z.string().optional(),
  pctComplete: z.string().optional(),
  status: z.enum(["on_track", "at_risk", "blocked", "complete"]),
});

const submitSchema = z.object({
  userId: z.string(),
  source: z.enum(["form", "pdf_upload", "email"]),
  rawText: z.string().optional(),
  rawPdfUrl: z.string().optional(),
  formData: z
    .object({
      tasks: z.array(taskSchema),
      notes: z.string().optional(),
      blockers: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, source, rawText, rawPdfUrl, formData } = parsed.data;

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Create raw report
  const report = await prisma.report.create({
    data: { userId, source, rawText, rawPdfUrl, parsed: false },
  });

  // If form submission, eagerly parse (no AI needed for structured data)
  if (source === "form" && formData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalHours = formData.tasks.reduce((sum, t) => {
      return sum + (t.hoursToday ? parseFloat(t.hoursToday) : 0);
    }, 0);

    const parsedReport = await prisma.parsedReport.create({
      data: {
        reportId: report.id,
        userId,
        date: today,
        notes: formData.notes || null,
        blockers: formData.blockers || null,
        totalHours: totalHours > 0 ? totalHours : null,
      },
    });

    // Create tasks
    const taskData = formData.tasks.map((t, i) => ({
      parsedReportId: parsedReport.id,
      userId,
      description: t.description,
      projectName: t.projectName || null,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      hoursToday: t.hoursToday ? parseFloat(t.hoursToday) : null,
      pctComplete: t.pctComplete ? parseInt(t.pctComplete, 10) : null,
      status: t.status as "on_track" | "at_risk" | "blocked" | "complete",
      priorityRank: i + 1,
    }));

    await prisma.task.createMany({ data: taskData });

    // Mark report as parsed
    await prisma.report.update({
      where: { id: report.id },
      data: { parsed: true },
    });
  }

  return NextResponse.json({ reportId: report.id }, { status: 201 });
}

export async function GET(request: NextRequest) {
  // Basic auth check — require session (called from dashboard)
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const where = userId ? { userId } : {};

  const reports = await prisma.report.findMany({
    where,
    include: {
      user: true,
      parsedReport: { include: { tasks: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: Math.min(limit, 100),
  });

  return NextResponse.json(reports);
}
