import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  accentColor: z.string().optional(),
  cronSchedule: z.string().optional(),
  cronTimezone: z.string().optional(),
  reportCadence: z.string().optional(),
  aiParameters: z.record(z.string(), z.unknown()).optional(),
  submissionMethods: z.array(z.object({
    type: z.enum(["link", "email", "app"]),
    active: z.boolean(),
  })).optional(),
  reportCollectionScope: z.enum(["everyone", "leads_only"]).optional(),
  anthropicApiKey: z.string().nullable().optional(),
  reportDetailLevel: z.number().int().min(1).max(5).optional(),
  autoReportDetailLevel: z.number().int().min(1).max(5).optional(),
  departmentOrdering: z.enum(["manual", "ai_determined"]).optional(),
  biweeklyStartDate: z.string().nullable().optional(),
  reportTheme: z.enum(["dark", "light"]).optional(),
});

interface Params { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { workspaceSettings: true },
  });

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(org);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, accentColor, cronSchedule, cronTimezone, reportCadence, aiParameters, submissionMethods, reportCollectionScope, anthropicApiKey, reportDetailLevel, autoReportDetailLevel, departmentOrdering, biweeklyStartDate, reportTheme } = parsed.data;

  if (name) {
    await prisma.organization.update({ where: { id: orgId }, data: { name } });
  }

  const settingsData: Record<string, unknown> = {};
  if (description !== undefined) settingsData.description = description;
  if (accentColor) settingsData.accentColor = accentColor;
  if (cronSchedule) settingsData.cronSchedule = cronSchedule;
  if (cronTimezone) settingsData.cronTimezone = cronTimezone;
  if (reportCadence) settingsData.reportCadence = reportCadence;
  if (aiParameters) settingsData.aiParameters = aiParameters;
  if (submissionMethods) settingsData.submissionMethods = submissionMethods;
  if (reportCollectionScope) settingsData.reportCollectionScope = reportCollectionScope;
  if (anthropicApiKey !== undefined) settingsData.anthropicApiKey = anthropicApiKey;
  if (reportDetailLevel !== undefined) settingsData.reportDetailLevel = reportDetailLevel;
  if (autoReportDetailLevel !== undefined) settingsData.autoReportDetailLevel = autoReportDetailLevel;
  if (departmentOrdering !== undefined) settingsData.departmentOrdering = departmentOrdering;
  if (biweeklyStartDate !== undefined) settingsData.biweeklyStartDate = biweeklyStartDate ? new Date(biweeklyStartDate) : null;
  if (reportTheme !== undefined) settingsData.reportTheme = reportTheme;

  if (Object.keys(settingsData).length > 0) {
    await prisma.workspaceSettings.upsert({
      where: { orgId },
      update: settingsData,
      create: { orgId, ...settingsData },
    });
  }

  const updated = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { workspaceSettings: true },
  });

  return NextResponse.json(updated);
}
