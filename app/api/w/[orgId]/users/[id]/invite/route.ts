import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";
import { sendInvitationEmail } from "@/lib/email";

interface Params { params: Promise<{ orgId: string; id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { orgId, id } = await params;

  const sessionUser = await getWorkspaceUser(orgId);
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionUser.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [target, org] = await Promise.all([
    prisma.user.findFirst({ where: { id, orgId } }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
  ]);

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://orgrise.ai";

  try {
    await sendInvitationEmail({
      toEmail: target.email,
      toName: target.name,
      orgName: org?.name ?? "your organization",
      submissionUrl: `${appUrl}/submit/${target.submissionToken}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Invite email error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: target.email });
}
