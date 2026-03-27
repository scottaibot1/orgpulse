import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const setupSchema = z.object({
  orgName: z.string().min(1),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  // Only allow setup if no organizations exist
  const orgCount = await prisma.organization.count();
  if (orgCount > 0) {
    return NextResponse.json(
      { error: "Organization already configured" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { orgName, adminName, adminEmail, adminPassword } = parsed.data;

  // Create Supabase auth user
  const supabase = await createAdminClient();
  const { error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create org slug
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Create organization + admin user in DB
  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug,
      ownerEmail: adminEmail,
      settings: {
        cronTime: "18:00",
        reportCadence: "daily",
        aiFlagsEnabled: true,
      },
    },
  });

  await prisma.user.create({
    data: {
      orgId: org.id,
      email: adminEmail,
      name: adminName,
      role: "admin",
    },
  });

  return NextResponse.json({ success: true, orgId: org.id }, { status: 201 });
}
