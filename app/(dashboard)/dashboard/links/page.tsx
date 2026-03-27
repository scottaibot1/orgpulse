import { requireManagerOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SubmissionLinksClient from "@/components/people/SubmissionLinksClient";

export default async function SubmissionLinksPage() {
  const sessionUser = await requireManagerOrAdmin();

  const people = await prisma.user.findMany({
    where: { orgId: sessionUser.orgId },
    include: {
      departmentMemberships: {
        include: { department: true },
        where: { isPrimary: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submission Links</h1>
        <p className="text-gray-500 mt-1">
          Each person has a unique link they can bookmark to submit reports — no login required.
        </p>
      </div>
      <SubmissionLinksClient people={people} />
    </div>
  );
}
