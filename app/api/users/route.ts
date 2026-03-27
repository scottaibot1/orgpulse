import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  title: z.string().optional(),
  role: z.enum(["admin", "manager", "member"]).optional(),
  departmentIds: z.array(z.string()).optional(),
  primaryDepartmentId: z.string().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { orgId: user.orgId },
    include: {
      departmentMemberships: {
        include: { department: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { departmentIds, primaryDepartmentId, ...userData } = parsed.data;

  // Check for duplicate email within org
  const existing = await prisma.user.findFirst({
    where: { email: userData.email, orgId: user.orgId },
  });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const newUser = await prisma.user.create({
    data: {
      ...userData,
      orgId: user.orgId,
      role: userData.role ?? "member",
    },
  });

  // Add department memberships
  if (departmentIds && departmentIds.length > 0) {
    await prisma.departmentMember.createMany({
      data: departmentIds.map((deptId) => ({
        departmentId: deptId,
        userId: newUser.id,
        isPrimary: deptId === (primaryDepartmentId ?? departmentIds[0]),
      })),
    });
  }

  const result = await prisma.user.findUnique({
    where: { id: newUser.id },
    include: {
      departmentMemberships: { include: { department: true } },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
