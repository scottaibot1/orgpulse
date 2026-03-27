import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  blocked: "bg-red-100 text-red-700",
  complete: "bg-blue-100 text-blue-700",
};

export default async function ReportsPage() {
  const user = await requireAuth();

  const reports = await prisma.report.findMany({
    where: {
      user: { orgId: user.orgId },
      ...(user.role === "member" ? { userId: user.id } : {}),
    },
    include: {
      user: true,
      parsedReport: {
        include: { tasks: { orderBy: { priorityRank: "asc" } } },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          {user.role === "member" ? "Your submission history" : "All team submissions"}
        </p>
      </div>

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No reports yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Reports submitted by team members will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                      {report.user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{report.user.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {new Date(report.submittedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {report.source.replace("_", " ")}
                    </Badge>
                    {report.parsedReport && (
                      <Badge className="text-xs bg-green-100 text-green-700">Parsed</Badge>
                    )}
                  </div>
                </div>

                {report.parsedReport && report.parsedReport.tasks.length > 0 && (
                  <div className="px-4 py-3 space-y-2">
                    {report.parsedReport.tasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-xs text-gray-400 mt-0.5 flex-shrink-0">
                            #{task.priorityRank}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 truncate">{task.description}</p>
                            {task.projectName && (
                              <p className="text-xs text-gray-400">{task.projectName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.pctComplete !== null && (
                            <span className="text-xs text-gray-500">{task.pctComplete}%</span>
                          )}
                          <Badge className={`text-xs ${STATUS_COLOR[task.status]}`}>
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {report.parsedReport.blockers && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                        <span className="font-medium">Blocker: </span>
                        {report.parsedReport.blockers}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
