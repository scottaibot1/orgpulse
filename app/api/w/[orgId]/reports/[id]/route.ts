import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth";

interface Params { params: Promise<{ orgId: string; id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { orgId, id } = await params;
  const user = await getWorkspaceUser(orgId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "member") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, userId: true, user: { select: { orgId: true } } },
  });

  if (!report || report.user.orgId !== orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Explicit deletion order to avoid FK constraint issues with EmailDrafts,
    // which have optional relatedTaskId that may lack a cascade rule in the DB.
    await prisma.$transaction(async (tx) => {
      // Find parsedReport and its tasks
      const parsed = await tx.parsedReport.findUnique({
        where: { reportId: id },
        select: { id: true, tasks: { select: { id: true } } },
      });

      if (parsed) {
        const taskIds = parsed.tasks.map((t) => t.id);

        // Null-out EmailDraft references to these tasks
        if (taskIds.length > 0) {
          await tx.emailDraft.updateMany({
            where: { relatedTaskId: { in: taskIds } },
            data: { relatedTaskId: null },
          });
          await tx.taskHistory.deleteMany({ where: { reportId: parsed.id } });
          await tx.task.deleteMany({ where: { parsedReportId: parsed.id } });
        }

        await tx.parsedReport.delete({ where: { id: parsed.id } });
      }

      await tx.report.delete({ where: { id } });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[DELETE report] Failed to delete report ${id}:`, msg);
    return NextResponse.json({ error: `Delete failed: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
