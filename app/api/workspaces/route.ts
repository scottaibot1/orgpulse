import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthEmail } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  accentColor: z.string().default("#6366f1"),
  cronSchedule: z.string().default("0 18 * * *"),
});

export async function GET() {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaces = await prisma.organization.findMany({
    where: { ownerEmail: email },
    include: { workspaceSettings: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(workspaces);
}

export async function POST(request: NextRequest) {
  const email = await getAuthEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, description, accentColor, cronSchedule } = parsed.data;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    + "-" + Date.now().toString(36);

  try {
    const org = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          ownerEmail: email,
          settings: {},
        },
      });

      await tx.workspaceSettings.create({
        data: {
          orgId: org.id,
          accentColor,
          cronSchedule,
          description: description ?? null,
        },
      });

      await tx.user.create({
        data: {
          orgId: org.id,
          email,
          name: email.split("@")[0],
          role: "admin",
        },
      });

      return org;
    });

    return NextResponse.json({ orgId: org.id, slug: org.slug }, { status: 201 });
  } catch (err) {
    console.error("Create workspace error:", err);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
