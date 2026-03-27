import { prisma } from "@/lib/prisma";
import OrgSnapshot from "@/components/dashboard/OrgSnapshot";

export const dynamic = "force-dynamic";

interface Props { params: { orgId: string } }

export default async function WorkspaceSnapshotPage({ params }: Props) {
  const { orgId } = params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [people, todayReports, alerts] = await Promise.all([
    prisma.user.findMany({
      where: { orgId },
      include: {
        departmentMemberships: {
          include: { department: true },
          where: { isPrimary: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.parsedReport.findMany({
      where: { user: { orgId }, date: { gte: today, lt: tomorrow } },
      include: { tasks: { orderBy: { priorityRank: "asc" }, take: 1 } },
    }),
    prisma.alert.findMany({
      where: { orgId, isRead: false },
      select: { userId: true, severity: true },
    }),
  ]);

  const reportByUser = new Map(todayReports.map((r) => [r.userId, r]));
  const alertsByUser = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const existing = alertsByUser.get(alert.userId) ?? [];
    alertsByUser.set(alert.userId, [...existing, alert]);
  }

  const personData = people.map((person) => {
    const report = reportByUser.get(person.id);
    const personAlerts = alertsByUser.get(person.id) ?? [];
    const hasCritical = personAlerts.some((a) => a.severity === "critical");
    const hasWarning = personAlerts.some((a) => a.severity === "warning");

    let status: "submitted" | "missing" | "flagged" = "missing";
    if (report) status = hasCritical || hasWarning ? "flagged" : "submitted";

    return {
      id: person.id,
      name: person.name,
      email: person.email,
      title: person.title,
      role: person.role,
      submissionToken: person.submissionToken,
      department: person.departmentMemberships[0]?.department ?? null,
      status,
      topTask: report?.tasks[0] ?? null,
      alertCount: personAlerts.length,
      hasCritical,
    };
  });

  const deptMap = new Map<string, { name: string; color: string | null; people: typeof personData }>();
  const noDept: typeof personData = [];

  for (const person of personData) {
    if (person.department) {
      const key = person.department.id;
      if (!deptMap.has(key)) {
        deptMap.set(key, { name: person.department.name, color: person.department.color, people: [] });
      }
      deptMap.get(key)!.people.push(person);
    } else {
      noDept.push(person);
    }
  }

  const departments = Array.from(deptMap.values());
  if (noDept.length > 0) departments.push({ name: "Unassigned", color: null, people: noDept });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Org Snapshot</h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {" · "}{todayReports.length} of {people.length} submitted today
        </p>
      </div>
      <OrgSnapshot departments={departments} />
    </div>
  );
}
