-- Add timezone support to workspace_settings
ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "cron_timezone" TEXT NOT NULL DEFAULT 'America/New_York';
