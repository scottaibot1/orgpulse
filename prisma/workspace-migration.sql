-- Migration: Add multi-workspace support
-- Run this in Supabase SQL Editor

-- 1. Add owner_email to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "owner_email" TEXT NOT NULL DEFAULT '';

-- Backfill owner_email from existing admin users
UPDATE "organizations" o
SET "owner_email" = (
  SELECT u.email FROM "users" u
  WHERE u.org_id = o.id AND u.role = 'admin'
  LIMIT 1
)
WHERE "owner_email" = '';

-- 2. Create workspace_settings table
CREATE TABLE IF NOT EXISTS "workspace_settings" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "cron_schedule" TEXT NOT NULL DEFAULT '0 18 * * *',
  "report_cadence" TEXT NOT NULL DEFAULT 'daily',
  "ai_parameters" JSONB NOT NULL DEFAULT '{}',
  "submission_methods" JSONB NOT NULL DEFAULT '[{"type":"link","active":true},{"type":"email","active":false},{"type":"app","active":false}]',
  "accent_color" TEXT NOT NULL DEFAULT '#6366f1',
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_settings_org_id_key" ON "workspace_settings"("org_id");

ALTER TABLE "workspace_settings" DROP CONSTRAINT IF EXISTS "workspace_settings_org_id_fkey";
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Backfill workspace_settings for existing orgs
INSERT INTO "workspace_settings" ("id", "org_id", "accent_color")
SELECT
  'ws_' || o.id,
  o.id,
  '#6366f1'
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_settings" ws WHERE ws.org_id = o.id
);

-- 4. Change users unique constraint to (orgId, email) instead of just email
-- Drop old unique constraint on email
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";

-- Add new unique constraint on (org_id, email)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_org_id_email_key";
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_email_key" UNIQUE ("org_id", "email");
