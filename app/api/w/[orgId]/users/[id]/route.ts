import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  title: z.string().nullable().optional(),
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

interface Params { params: Promise<{ orgId: string; id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, id } = await params;
  const sessionUser = await getWorkspaceUser(orgId);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { departmentIds, primaryDepartmentId, reportsToIds, level, isReportingActive, reportCadence, reportDueDays, reportDueTime, reportBiweeklyWeek, executiveTier, executiveDepartmentIds, email: newEmail, ...userData } = parsed.data;

  // Email changes are admin-only
  if (newEmail !== undefined && newEmail !== existing.email) {
    if (sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Only admins can change email addresses" }, { status: 403 });
    }
    const conflict = await prisma.user.findFirst({ where: { orgId, email: newEmail, id: { not: id } } });
    if (conflict) {
      return NextResponse.json({ error: "That email address is already in use by another team member" }, { status: 409 });
    }
    (userData as Record<string, unknown>).email = newEmail;
  }

  const updateData: Record<string, unknown> = { ...userData };
  if (level !== undefined) {
    updateData.level = level;
    updateData.isLead = level != null && level <= 2;
  }
  if (isReportingActive !== undefined) updateData.isReportingActive = isReportingActive;
  if (reportCadence !== undefined) updateData.reportCadence = reportCadence;
  if (reportDueDays !== undefined) updateData.reportDueDays = reportDueDays;
  if (reportDueTime !== undefined) updateData.reportDueTime = reportDueTime;
  if (reportBiweeklyWeek !== undefined) updateData.reportBiweeklyWeek = reportBiweeklyWeek;
  if (executiveTier !== undefined) updateData.executiveTier = executiveTier;

  await prisma.user.update({ where: { id }, data: updateData });

  if (departmentIds !== undefined) {
    await prisma.departmentMember.deleteMany({ where: { userId: id } });
    if (departmentIds.length > 0) {
      await prisma.departmentMember.createMany({
        data: departmentIds.map((deptId) => ({
          departmentId: deptId,
          userId: id,
          isPrimary: deptId === (primaryDepartmentId ?? departmentIds[0]),
        })),
      });
    }
  }

  if (reportsToIds !== undefined) {
    await prisma.reportsTo.deleteMany({ where: { subordinateUserId: id } });
    if (reportsToIds.length > 0) {
      const depts = departmentIds ?? existing.orgId
        ? await prisma.departmentMember.findMany({ where: { userId: id }, select: { departmentId: true } }).then(ms => ms.map(m => m.departmentId))
        : [];
      const primaryDept = primaryDepartmentId ?? (departmentIds?.[0]) ?? depts[0];
      if (primaryDept) {
        await prisma.reportsTo.createMany({
          data: reportsToIds.map((managerId) => ({
            subordinateUserId: id,
            managerUserId: managerId,
            departmentId: primaryDept,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  // Update executive department oversight
  if (executiveDepartmentIds !== undefined) {
    await prisma.executiveDepartment.deleteMany({ where: { userId: id } });
    if (executiveDepartmentIds.length > 0) {
      await prisma.executiveDepartment.createMany({
        data: executiveDepartmentIds.map((deptId) => ({ userId: id, departmentId: deptId })),
        skipDuplicates: true,
      });
    }
  }

  const result = await prisma.user.findUnique({
    where: { id },
    include: {
      departmentMemberships: { include: { department: true } },
      reportsToManagers: { select: { managerUserId: true, departmentId: true } },
      executiveDepartments: { select: { departmentId: true } },
    },
  });

  return NextResponse.json(result);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { orgId, id } = await params;
  const sessionUser = await getWorkspaceUser(orgId);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (id === sessionUser.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
