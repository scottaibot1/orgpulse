import { requireWorkspaceAccess } from "@/lib/auth";
import WorkspaceDepartmentManager from "@/components/workspaces/WorkspaceDepartmentManager";

interface Props { params: { orgId: string } }

export default async function WorkspaceOrgPage({ params }: Props) {
  const { orgId } = params;
  const user = await requireWorkspaceAccess(orgId);

  if (user.role === "member") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
        <p className="text-gray-500">You don&apos;t have permission to manage departments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <p className="text-gray-500 mt-1">Manage your departments and org structure.</p>
      </div>
      <WorkspaceDepartmentManager orgId={orgId} />
    </div>
  );
}
