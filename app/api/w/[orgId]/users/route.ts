import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
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

  const { departmentIds, primaryDepartmentId, reportsToIds, level, isReportingActive, ...userData } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { email: userData.email, orgId } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const isLead = level != null && level <= 2;

  const newUser = await prisma.user.create({
    data: { ...userData, orgId, role: userData.role ?? "member", level: level ?? null, isLead, isReportingActive: isReportingActive ?? true },
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

  const result = await prisma.user.findUnique({
    where: { id: newUser.id },
    include: {
      departmentMemberships: { include: { department: true } },
      reportsToManagers: { select: { managerUserId: true, departmentId: true } },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
