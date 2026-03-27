import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  parentDepartmentId: z.string().nullable().optional(),
  headUserId: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

interface Params { params: Promise<{ orgId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    where: { orgId, archivedAt: null },
    include: {
      members: { include: { user: true } },
      headUser: true,
      subDepartments: { where: { archivedAt: null } },
      levelConfigs: { orderBy: { levelNumber: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(departments);
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

  const dept = await prisma.department.create({
    data: { ...parsed.data, orgId },
    include: {
      members: { include: { user: true } },
      headUser: true,
    },
  });

  return NextResponse.json(dept, { status: 201 });
}
