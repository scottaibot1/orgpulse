import { requireWorkspaceAccess } from "@/lib/auth";
import WorkspacePeopleManager from "@/components/workspaces/WorkspacePeopleManager";

interface Props { params: { orgId: string } }

export default async function WorkspacePeoplePage({ params }: Props) {
  const { orgId } = params;
  const user = await requireWorkspaceAccess(orgId);

  if (user.role === "member") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <p className="text-gray-500">You don&apos;t have permission to manage people.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <p className="text-gray-500 mt-1">Manage team members and their department assignments.</p>
      </div>
      <WorkspacePeopleManager orgId={orgId} />
    </div>
  );
}
