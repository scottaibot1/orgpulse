import { prisma } from "@/lib/prisma";

export interface WorkspaceWithSettings {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  createdAt: Date;
  settings: Record<string, unknown>;
  workspaceSettings: {
    accentColor: string;
    description: string | null;
    cronSchedule: string;
    cronTimezone: string;
    reportCadence: string;
    aiParameters: Record<string, unknown>;
    submissionMethods: SubmissionMethod[];
    reportCollectionScope: string;
    anthropicApiKey: string | null;
  } | null;
}

export interface SubmissionMethod {
  type: "link" | "email" | "app";
  active: boolean;
}

export async function getWorkspace(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    include: { workspaceSettings: true },
  });
}

export async function getWorkspaceStats(orgId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [peopleCount, deptCount, submittedToday, unreadAlerts] = await Promise.all([
    prisma.user.count({ where: { orgId } }),
    prisma.department.count({ where: { orgId, archivedAt: null } }),
    prisma.parsedReport.count({
      where: { user: { orgId }, date: { gte: today, lt: tomorrow } },
    }),
    prisma.alert.count({ where: { orgId, isRead: false } }),
  ]);

  return { peopleCount, deptCount, submittedToday, unreadAlerts };
}

// Validate that orgId belongs to the given owner email
export async function validateWorkspaceOwner(orgId: string, email: string): Promise<boolean> {
  const org = await prisma.organization.findFirst({
    where: { id: orgId, ownerEmail: email },
  });
  return org !== null;
}
