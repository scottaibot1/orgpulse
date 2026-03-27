import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";

interface Params { params: Promise<{ orgId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = 30;
  const skip = (page - 1) * perPage;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    prisma.alert.count({ where: { orgId } }),
  ]);

  return NextResponse.json({ alerts, total, page, perPage });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ids, markAll } = body as { ids?: string[]; markAll?: boolean };

  if (markAll) {
    await prisma.alert.updateMany({ where: { orgId }, data: { isRead: true } });
  } else if (ids && ids.length > 0) {
    await prisma.alert.updateMany({ where: { id: { in: ids }, orgId }, data: { isRead: true } });
  }

  const unreadCount = await prisma.alert.count({ where: { orgId, isRead: false } });
  return NextResponse.json({ unreadCount });
}
