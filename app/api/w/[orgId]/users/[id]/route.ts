import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title: z.string().nullable().optional(),
  role: z.enum(["admin", "manager", "member"]).optional(),
  level: z.number().min(1).max(15).nullable().optional(),
  departmentIds: z.array(z.string()).optional(),
  primaryDepartmentId: z.string().optional(),
  reportsToIds: z.array(z.string()).optional(),
  isReportingActive: z.boolean().optional(),
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

  const { departmentIds, primaryDepartmentId, reportsToIds, level, isReportingActive, ...userData } = parsed.data;

  const updateData: Record<string, unknown> = { ...userData };
  if (level !== undefined) {
    updateData.level = level;
    updateData.isLead = level != null && level <= 2;
  }
  if (isReportingActive !== undefined) {
    updateData.isReportingActive = isReportingActive;
  }

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

  const result = await prisma.user.findUnique({
    where: { id },
    include: {
      departmentMemberships: { include: { department: true } },
      reportsToManagers: { select: { managerUserId: true, departmentId: true } },
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
