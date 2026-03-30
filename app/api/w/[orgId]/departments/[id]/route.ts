import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  parentDepartmentId: z.string().nullable().optional(),
  headUserId: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  reportPriority: z.number().int().min(1).max(10).optional(),
  reportOrder: z.number().int().optional(),
});

interface Params { params: Promise<{ orgId: string; id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, id } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.department.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dept = await prisma.department.update({
    where: { id },
    data: parsed.data,
    include: { members: { include: { user: true } }, headUser: true },
  });

  return NextResponse.json(dept);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { orgId, id } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.department.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.department.update({ where: { id }, data: { archivedAt: new Date() } });

  return NextResponse.json({ success: true });
}
