import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { z } from "zod";

const putSchema = z.array(z.object({
  levelNumber: z.number().min(1).max(15),
  levelTitle: z.string().nullable().optional(),
}));

interface Params { params: Promise<{ orgId: string; id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { orgId, id } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configs = await prisma.departmentLevelConfig.findMany({
    where: { departmentId: id },
    orderBy: { levelNumber: "asc" },
  });

  return NextResponse.json(configs);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { orgId, id } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dept = await prisma.department.findFirst({ where: { id, orgId } });
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await Promise.all(
    parsed.data.map((item) =>
      prisma.departmentLevelConfig.upsert({
        where: { departmentId_levelNumber: { departmentId: id, levelNumber: item.levelNumber } },
        update: { levelTitle: item.levelTitle ?? null },
        create: { departmentId: id, levelNumber: item.levelNumber, levelTitle: item.levelTitle ?? null },
      })
    )
  );

  const configs = await prisma.departmentLevelConfig.findMany({
    where: { departmentId: id },
    orderBy: { levelNumber: "asc" },
  });

  return NextResponse.json(configs);
}
