import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  orders: z.array(z.object({ id: z.string(), reportOrder: z.number().int() })),
});

interface Params { params: Promise<{ orgId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { orgId } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.orders.map(({ id, reportOrder }) =>
      prisma.department.updateMany({
        where: { id, orgId },
        data: { reportOrder },
      })
    )
  );

  return NextResponse.json({ success: true });
}
