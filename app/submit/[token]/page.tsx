import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SubmitUpload from "@/components/report/SubmitUpload";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SubmitPage({ params }: Props) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { submissionToken: token },
    include: {
      departmentMemberships: {
        include: { department: true },
        where: { isPrimary: true },
      },
      organization: {
        select: { name: true, workspaceSettings: { select: { accentColor: true } } },
      },
    },
  });

  if (!user) notFound();

  const accentColor = user.organization.workspaceSettings?.accentColor ?? "#6366f1";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{user.organization.name}</h1>
          <p className="text-gray-500 mt-1">Daily Report</p>
        </div>

        {/* Person card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{ background: accentColor }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">
              {user.title ?? "Team Member"}
              {user.departmentMemberships[0] && (
                <> · {user.departmentMemberships[0].department.name}</>
              )}
            </p>
          </div>
        </div>

        <SubmitUpload token={token} accentColor={accentColor} />
      </div>
    </div>
  );
}
