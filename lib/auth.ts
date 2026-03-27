import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";

export async function getAuthEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? null;
}

// Get session user scoped to a specific workspace (orgId)
export async function getSessionUser(orgId?: string): Promise<SessionUser | null> {
  const email = await getAuthEmail();
  if (!email) return null;

  // If no orgId given, find any user record for this email
  const dbUser = orgId
    ? await prisma.user.findUnique({ where: { orgId_email: { orgId, email } } })
    : await prisma.user.findFirst({ where: { email } });

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    orgId: dbUser.orgId,
  };
}

// Get workspace user without redirecting — for use in API routes
export async function getWorkspaceUser(orgId: string): Promise<SessionUser | null> {
  const email = await getAuthEmail();
  if (!email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { orgId_email: { orgId, email } },
  });

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    orgId: dbUser.orgId,
  };
}

// Require auth for a specific workspace. Redirects to /workspaces if no access.
export async function requireWorkspaceAccess(orgId: string): Promise<SessionUser> {
  const email = await getAuthEmail();
  if (!email) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { orgId_email: { orgId, email } },
  });

  if (!dbUser) redirect("/workspaces");

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    orgId: dbUser.orgId,
  };
}

export async function requireWorkspaceAdmin(orgId: string): Promise<SessionUser> {
  const user = await requireWorkspaceAccess(orgId);
  if (user.role === "member") redirect(`/w/${orgId}/dashboard`);
  return user;
}

// Get all workspaces owned by the current auth user
export async function getMyWorkspaces() {
  const email = await getAuthEmail();
  if (!email) return [];

  return prisma.organization.findMany({
    where: { ownerEmail: email },
    include: { workspaceSettings: true },
    orderBy: { createdAt: "asc" },
  });
}

// Legacy — used by old /dashboard routes and setup
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "admin") redirect("/workspaces");
  return user;
}

export async function requireManagerOrAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role === "member") redirect("/workspaces");
  return user;
}
