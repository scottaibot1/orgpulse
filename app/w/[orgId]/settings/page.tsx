import { requireWorkspaceAccess } from "@/lib/auth";
import { getWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";
import WorkspaceSettingsForm from "@/components/workspaces/WorkspaceSettingsForm";

interface Props { params: { orgId: string } }

export default async function WorkspaceSettingsPage({ params }: Props) {
  const { orgId } = params;
  const user = await requireWorkspaceAccess(orgId);

  if (user.role !== "admin") redirect(`/w/${orgId}/dashboard`);

  const rawWorkspace = await getWorkspace(orgId);
  if (!rawWorkspace) redirect("/workspaces");

  // Cast JsonValue submissionMethods to typed array
  const workspace = {
    ...rawWorkspace,
    workspaceSettings: rawWorkspace.workspaceSettings ? {
      ...rawWorkspace.workspaceSettings,
      submissionMethods: (rawWorkspace.workspaceSettings.submissionMethods as { type: string; active: boolean }[] | null) ?? [],
      cronTimezone: rawWorkspace.workspaceSettings.cronTimezone ?? "America/New_York",
      reportCollectionScope: rawWorkspace.workspaceSettings.reportCollectionScope ?? "everyone",
      anthropicApiKey: rawWorkspace.workspaceSettings.anthropicApiKey ?? null,
      reportDetailLevel: rawWorkspace.workspaceSettings.reportDetailLevel ?? 3,
      departmentOrdering: rawWorkspace.workspaceSettings.departmentOrdering ?? "manual",
      biweeklyStartDate: rawWorkspace.workspaceSettings.biweeklyStartDate
        ? new Date(rawWorkspace.workspaceSettings.biweeklyStartDate).toISOString().split("T")[0]
        : null,
    } : null,
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
        <p className="text-gray-500 mt-1">Configure your workspace name, appearance, and report schedule.</p>
      </div>
      <WorkspaceSettingsForm workspace={workspace} orgId={orgId} />
    </div>
  );
}
