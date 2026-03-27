import { getAuthEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkspaceSidebar from "@/components/workspaces/WorkspaceSidebar";

interface Props {
  children: React.ReactNode;
  params: { orgId: string };
}

export default async function WorkspaceLayout({ children, params }: Props) {
  const { orgId } = params;

  // One auth call, then all DB queries in parallel
  const email = await getAuthEmail();
  if (!email) redirect("/login");

  const [dbUser, workspace, allWorkspaces] = await Promise.all([
    prisma.user.findUnique({ where: { orgId_email: { orgId, email } } }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, workspaceSettings: { select: { accentColor: true } } },
    }),
    prisma.organization.findMany({
      where: { ownerEmail: email },
      select: { id: true, name: true, workspaceSettings: { select: { accentColor: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!dbUser) redirect("/workspaces");
  if (!workspace) redirect("/workspaces");

  const user = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    orgId: dbUser.orgId,
  };

  const workspaceInfo = {
    id: workspace.id,
    name: workspace.name,
    accentColor: workspace.workspaceSettings?.accentColor ?? "#6366f1",
  };

  const allWorkspacesInfo = allWorkspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    accentColor: ws.workspaceSettings?.accentColor ?? "#6366f1",
  }));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <WorkspaceSidebar
        user={user}
        workspace={workspaceInfo}
        allWorkspaces={allWorkspacesInfo}
      />
      <main className="ml-60 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
