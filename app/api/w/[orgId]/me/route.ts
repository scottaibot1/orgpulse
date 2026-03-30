import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth";

interface Params { params: Promise<{ orgId: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ id: user.id, role: user.role });
}
