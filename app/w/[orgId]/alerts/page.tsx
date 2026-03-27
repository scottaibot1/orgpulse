import { requireWorkspaceAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AlertsClient from "@/components/workspaces/AlertsClient";

interface Props { params: { orgId: string } }

export const dynamic = "force-dynamic";

export default async function AlertsPage({ params }: Props) {
  const { orgId } = params;
  await requireWorkspaceAccess(orgId);

  const [alerts, unreadCount, accentColor] = await Promise.all([
    prisma.alert.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.alert.count({ where: { orgId, isRead: false } }),
    prisma.workspaceSettings.findUnique({
      where: { orgId },
      select: { accentColor: true },
    }).then((s) => s?.accentColor ?? "#6366f1"),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
          <p className="text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
      </div>
      <AlertsClient
        initialAlerts={alerts.map((a) => ({
          id: a.id,
          message: a.message,
          severity: a.severity,
          alertType: a.alertType,
          isRead: a.isRead,
          createdAt: a.createdAt.toISOString(),
          user: a.user,
        }))}
        orgId={orgId}
        accentColor={accentColor}
      />
    </div>
  );
}
