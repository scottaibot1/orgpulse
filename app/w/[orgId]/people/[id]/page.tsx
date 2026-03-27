import { requireWorkspaceAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Mail, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import CopyLinkButton from "@/components/people/CopyLinkButton";

const STATUS_COLOR: Record<string, string> = {
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  blocked: "bg-red-100 text-red-700",
  complete: "bg-blue-100 text-blue-700",
};

interface Props { params: { orgId: string; id: string } }

export default async function WorkspacePersonDetailPage({ params }: Props) {
  const { orgId, id } = params;
  await requireWorkspaceAccess(orgId);

  const person = await prisma.user.findFirst({
    where: { id, orgId },
    include: {
      departmentMemberships: { include: { department: true } },
      reports: {
        include: {
          parsedReport: { include: { tasks: { orderBy: { priorityRank: "asc" } } } },
        },
        orderBy: { submittedAt: "desc" },
        take: 30,
      },
    },
  });

  if (!person) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const submittedToday = person.reports.some(
    (r) => r.submittedAt >= today && r.submittedAt < tomorrow
  );

  const totalReports = person.reports.length;
  const totalTasks = person.reports.reduce((sum, r) => sum + (r.parsedReport?.tasks.length ?? 0), 0);
  const blockedTasks = person.reports.flatMap((r) => r.parsedReport?.tasks ?? []).filter((t) => t.status === "blocked").length;


  return (
    <div className="space-y-6">
      <Link href={`/w/${orgId}/snapshot`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Org Snapshot
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{
            backgroundColor: person.departmentMemberships[0]?.department.color
              ? `${person.departmentMemberships[0].department.color}25`
              : "#f3f4f6",
            color: person.departmentMemberships[0]?.department.color ?? "#6b7280",
          }}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{person.name}</h1>
            {submittedToday ? (
              <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Submitted today</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700"><Clock className="h-3 w-3 mr-1" />Not submitted today</Badge>
            )}
          </div>
          {person.title && <p className="text-gray-500 mt-0.5">{person.title}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Mail className="h-3.5 w-3.5" />{person.email}
            </span>
            <Badge variant="outline" className="capitalize">{person.role}</Badge>
            {person.departmentMemberships.map((m) => (
              <Badge
                key={m.id}
                variant="outline"
                style={m.department.color ? { borderColor: m.department.color, color: m.department.color } : {}}
              >
                {m.department.name}{m.isPrimary ? " ★" : ""}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0">
          <CopyLinkButton link={`/submit/${person.submissionToken}`} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Reports (last 30)", value: totalReports, color: "text-blue-600" },
          { label: "Tasks logged", value: totalTasks, color: "text-purple-600" },
          { label: "Blocked tasks", value: blockedTasks, color: "text-red-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Report History</h2>
        {person.reports.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-gray-400">No reports submitted yet.</CardContent>
          </Card>
        ) : (
          person.reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(report.submittedAt).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{report.source.replace("_", " ")}</Badge>
                    {report.parsedReport ? (
                      <Badge className="text-xs bg-green-100 text-green-700">Parsed</Badge>
                    ) : (
                      <Badge className="text-xs bg-gray-100 text-gray-500">Pending</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {report.parsedReport && (
                <CardContent className="p-4 space-y-3">
                  {report.parsedReport.tasks.length > 0 && (
                    <div className="space-y-2">
                      {report.parsedReport.tasks.map((task) => (
                        <div key={task.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-xs text-gray-300 mt-0.5 flex-shrink-0 font-mono">#{task.priorityRank}</span>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-800">{task.description}</p>
                              {task.projectName && <p className="text-xs text-gray-400 mt-0.5">{task.projectName}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {task.pctComplete !== null && <span className="text-xs text-gray-500 font-medium">{task.pctComplete}%</span>}
                            <Badge className={`text-xs ${STATUS_COLOR[task.status]}`}>{task.status.replace("_", " ")}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.parsedReport.blockers && (
                    <div className="flex gap-2 p-2.5 bg-red-50 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-red-700">Blocker</p>
                        <p className="text-xs text-red-600 mt-0.5">{report.parsedReport.blockers}</p>
                      </div>
                    </div>
                  )}
                  {report.parsedReport.notes && (
                    <div className="p-2.5 bg-gray-50 rounded-md">
                      <p className="text-xs font-medium text-gray-500">Notes</p>
                      <p className="text-xs text-gray-600 mt-0.5">{report.parsedReport.notes}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
