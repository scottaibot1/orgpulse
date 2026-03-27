import { redirect } from "next/navigation";
import { getAuthEmail } from "@/lib/auth";
import { getMyWorkspaces } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WorkspaceSelector from "@/components/workspaces/WorkspaceSelector";

export default async function WorkspacesPage() {
  const email = await getAuthEmail();
  if (!email) redirect("/login");

  const workspaces = await getMyWorkspaces();

  // Attach per-workspace stats
  const workspacesWithStats = await Promise.all(
    workspaces.map(async (ws) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [peopleCount, submittedToday, unreadAlerts] = await Promise.all([
        prisma.user.count({ where: { orgId: ws.id } }),
        prisma.parsedReport.count({
          where: { user: { orgId: ws.id }, date: { gte: today, lt: tomorrow } },
        }),
        prisma.alert.count({ where: { orgId: ws.id, isRead: false } }),
      ]);

      return {
        ...ws,
        workspaceSettings: ws.workspaceSettings,
        stats: { peopleCount, submittedToday, unreadAlerts },
      };
    })
  );

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <WorkspaceSelector workspaces={workspacesWithStats} />
    </div>
  );
}
