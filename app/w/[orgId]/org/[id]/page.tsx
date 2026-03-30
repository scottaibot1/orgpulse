import { requireWorkspaceAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Clock, Users } from "lucide-react";

interface Props { params: { orgId: string; id: string } }

export default async function DepartmentDetailPage({ params }: Props) {
  const { orgId, id } = params;
  await requireWorkspaceAccess(orgId);

  const dept = await prisma.department.findFirst({
    where: { id, orgId, archivedAt: null },
    include: {
      members: {
        include: {
          user: {
            include: {
              reports: {
                orderBy: { submittedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!dept) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const color = dept.color ?? "#6366f1";
  const submitted = dept.members.filter((m) =>
    m.user.reports.some((r) => r.submittedAt >= today && r.submittedAt < tomorrow)
  );
  const missing = dept.members.filter((m) =>
    !m.user.reports.some((r) => r.submittedAt >= today && r.submittedAt < tomorrow)
  );

  return (
    <div className="space-y-6">
      <Link href={`/w/${orgId}/org`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Org
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
          <Users className="h-6 w-6" style={{ color }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dept.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dept.members.length} member{dept.members.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{submitted.length}</p>
          <p className="text-xs text-gray-500 mt-1">Submitted today</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{missing.length}</p>
          <p className="text-xs text-gray-500 mt-1">Missing today</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold" style={{ color }}>{dept.members.length > 0 ? Math.round((submitted.length / dept.members.length) * 100) : 0}%</p>
          <p className="text-xs text-gray-500 mt-1">Submit rate</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 font-semibold text-sm text-gray-700">Members</div>
        {dept.members.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No members in this department</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {dept.members.map((m) => {
              const submittedToday = m.user.reports.some(
                (r) => r.submittedAt >= today && r.submittedAt < tomorrow
              );
              return (
                <li key={m.id}>
                  <Link
                    href={`/w/${orgId}/people/${m.user.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${color}20`, color }}>
                        {m.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                        {m.user.title && <p className="text-xs text-gray-400">{m.user.title}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.isPrimary && <Badge variant="outline" className="text-xs">Primary</Badge>}
                      {submittedToday ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />Submitted
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-600 text-xs">
                          <Clock className="h-3 w-3 mr-1" />Missing
                        </Badge>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
