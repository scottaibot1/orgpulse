import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { sendInvitationEmail } from "@/lib/email";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  title: z.string().optional(),
  role: z.enum(["admin", "manager", "member"]).optional(),
  level: z.number().min(1).max(15).nullable().optional(),
  departmentIds: z.array(z.string()).optional(),
  primaryDepartmentId: z.string().optional(),
  reportsToIds: z.array(z.string()).optional(),
  isReportingActive: z.boolean().optional(),
  reportCadence: z.enum(["daily", "weekly", "biweekly", "monthly", "custom"]).optional(),
  reportDueDays: z.array(z.number().int().min(0).max(31)).optional(),
  reportDueTime: z.string().optional(),
  reportBiweeklyWeek: z.enum(["A", "B"]).optional(),
  executiveTier: z.number().int().min(1).max(2).nullable().optional(),
  executiveDepartmentIds: z.array(z.string()).optional(),
});

interface Params { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { orgId },
    include: {
      departmentMemberships: { include: { department: true } },
      reportsToManagers: { select: { managerUserId: true, departmentId: true } },
      executiveDepartments: { select: { departmentId: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { departmentIds, primaryDepartmentId, reportsToIds, level, isReportingActive, reportCadence, reportDueDays, reportDueTime, reportBiweeklyWeek, executiveTier, executiveDepartmentIds, ...userData } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { email: userData.email, orgId } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const isLead = level != null && level <= 2;

  const newUser = await prisma.user.create({
    data: {
      ...userData,
      orgId,
      role: userData.role ?? "member",
      level: level ?? null,
      isLead,
      isReportingActive: isReportingActive ?? true,
      reportCadence: reportCadence ?? "daily",
      reportDueDays: reportDueDays ?? [5],
      reportDueTime: reportDueTime ?? "17:00",
      reportBiweeklyWeek: reportBiweeklyWeek ?? "A",
      executiveTier: executiveTier ?? null,
    },
  });

  if (departmentIds && departmentIds.length > 0) {
    await prisma.departmentMember.createMany({
      data: departmentIds.map((deptId) => ({
        departmentId: deptId,
        userId: newUser.id,
        isPrimary: deptId === (primaryDepartmentId ?? departmentIds[0]),
      })),
    });

    // Save reports-to relationships (one per dept the subordinate shares with manager)
    if (reportsToIds && reportsToIds.length > 0 && departmentIds.length > 0) {
      const reportsToData: { subordinateUserId: string; managerUserId: string; departmentId: string }[] = [];
      for (const managerId of reportsToIds) {
        // Use primary dept or first dept
        const deptId = primaryDepartmentId ?? departmentIds[0];
        reportsToData.push({ subordinateUserId: newUser.id, managerUserId: managerId, departmentId: deptId });
      }
      await prisma.reportsTo.createMany({ data: reportsToData, skipDuplicates: true });
    }
  }

  // Save executive department oversight
  if (executiveTier && executiveDepartmentIds && executiveDepartmentIds.length > 0) {
    await prisma.executiveDepartment.createMany({
      data: executiveDepartmentIds.map((deptId) => ({ userId: newUser.id, departmentId: deptId })),
      skipDuplicates: true,
    });
  } else if (executiveTier) {
    // Default: oversee all departments in the org
    const allDepts = await prisma.department.findMany({ where: { orgId, archivedAt: null }, select: { id: true } });
    if (allDepts.length > 0) {
      await prisma.executiveDepartment.createMany({
        data: allDepts.map((d) => ({ userId: newUser.id, departmentId: d.id })),
        skipDuplicates: true,
      });
    }
  }

  const result = await prisma.user.findUnique({
    where: { id: newUser.id },
    include: {
      departmentMemberships: { include: { department: true } },
      reportsToManagers: { select: { managerUserId: true, departmentId: true } },
      executiveDepartments: { select: { departmentId: true } },
    },
  });

  // Send invitation email — non-fatal
  if (process.env.RESEND_API_KEY) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orgrise.ai";
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    sendInvitationEmail({
      toEmail: newUser.email,
      toName: newUser.name,
      orgName: org?.name ?? "your organization",
      submissionUrl: `${appUrl}/submit/${newUser.submissionToken}`,
    }).catch((e) => console.error("Invitation email failed:", e));
  }

  return NextResponse.json(result, { status: 201 });
}
