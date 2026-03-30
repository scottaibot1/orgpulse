import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";

interface Params { params: Promise<{ orgId: string; id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, id } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const summary = await prisma.dailySummary.findFirst({ where: { id, orgId } });
  if (!summary) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.dailySummary.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
