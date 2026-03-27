import { requireManagerOrAdmin } from "@/lib/auth";
import DepartmentManager from "@/components/org/DepartmentManager";

export default async function OrgPage() {
  await requireManagerOrAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
        <p className="text-gray-500 mt-1">
          Manage your departments and org structure.
        </p>
      </div>
      <DepartmentManager />
    </div>
  );
}
