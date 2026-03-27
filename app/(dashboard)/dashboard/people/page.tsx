import { requireManagerOrAdmin } from "@/lib/auth";
import PeopleManager from "@/components/people/PeopleManager";

export default async function PeoplePage() {
  await requireManagerOrAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <p className="text-gray-500 mt-1">
          Manage team members and their department assignments.
        </p>
      </div>
      <PeopleManager />
    </div>
  );
}
