import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title: z.string().nullable().optional(),
  role: z.enum(["admin", "manager", "member"]).optional(),
  departmentIds: z.array(z.string()).optional(),
  primaryDepartmentId: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id, orgId: sessionUser.orgId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { departmentIds, primaryDepartmentId, ...userData } = parsed.data;

  await prisma.user.update({ where: { id }, data: userData });

  // Update department memberships if provided
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

  const result = await prisma.user.findUnique({
    where: { id },
    include: {
      departmentMemberships: { include: { department: true } },
    },
  });

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === sessionUser.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id, orgId: sessionUser.orgId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
