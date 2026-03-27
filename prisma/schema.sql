-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'member');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('form', 'pdf_upload', 'email');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('on_track', 'at_risk', 'blocked', 'complete');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('stall', 'overdue', 'missing_submission', 'pattern');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "parent_department_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "head_user_id" TEXT,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "submission_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_members" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "department_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ReportSource" NOT NULL,
    "raw_text" TEXT,
    "raw_pdf_url" TEXT,
    "parsed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parsed_reports" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ai_summary" TEXT,
    "total_hours" DECIMAL(5,2),
    "notes" TEXT,
    "blockers" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parsed_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "parsed_report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_name" TEXT,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "hours_today" DECIMAL(5,2),
    "pct_complete" INTEGER,
    "status" "TaskStatus" NOT NULL DEFAULT 'on_track',
    "priority_rank" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_histories" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "canonical_task_id" TEXT,
    "report_id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "pct_complete" INTEGER,
    "status" "TaskStatus" NOT NULL,
    "hours" DECIMAL(5,2),

    CONSTRAINT "task_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_name" TEXT,
    "description" TEXT NOT NULL,
    "first_seen_date" TIMESTAMP(3) NOT NULL,
    "last_seen_date" TIMESTAMP(3) NOT NULL,
    "is_stalled" BOOLEAN NOT NULL DEFAULT false,
    "stall_days" INTEGER NOT NULL DEFAULT 0,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canonical_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "canonical_task_id" TEXT,
    "alert_type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_drafts" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "related_task_id" TEXT,
    "related_canonical_task_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_summaries" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "summary_date" TIMESTAMP(3) NOT NULL,
    "ai_full_summary" TEXT,
    "tier1_json" JSONB,
    "tier2_json" JSONB,
    "tier3_json" JSONB,
    "total_submissions" INTEGER NOT NULL DEFAULT 0,
    "missing_submissions" INTEGER NOT NULL DEFAULT 0,
    "alert_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_submission_token_key" ON "users"("submission_token");

-- CreateIndex
CREATE UNIQUE INDEX "department_members_department_id_user_id_key" ON "department_members"("department_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parsed_reports_report_id_key" ON "parsed_reports"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_summaries_org_id_summary_date_key" ON "daily_summaries"("org_id", "summary_date");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_reports" ADD CONSTRAINT "parsed_reports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parsed_reports" ADD CONSTRAINT "parsed_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parsed_report_id_fkey" FOREIGN KEY ("parsed_report_id") REFERENCES "parsed_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_histories" ADD CONSTRAINT "task_histories_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_histories" ADD CONSTRAINT "task_histories_canonical_task_id_fkey" FOREIGN KEY ("canonical_task_id") REFERENCES "canonical_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_histories" ADD CONSTRAINT "task_histories_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "parsed_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canonical_tasks" ADD CONSTRAINT "canonical_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_canonical_task_id_fkey" FOREIGN KEY ("canonical_task_id") REFERENCES "canonical_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_related_task_id_fkey" FOREIGN KEY ("related_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_related_canonical_task_id_fkey" FOREIGN KEY ("related_canonical_task_id") REFERENCES "canonical_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

