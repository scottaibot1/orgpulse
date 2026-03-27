import { getAuthEmail } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateWorkspaceForm from "@/components/workspaces/CreateWorkspaceForm";

export default async function NewWorkspacePage() {
  const email = await getAuthEmail();
  if (!email) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 py-12">
      <CreateWorkspaceForm />
    </div>
  );
}
