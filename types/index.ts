import type {
  Organization,
  Department,
  User,
  DepartmentMember,
  Report,
  ParsedReport,
  Task,
  TaskHistory,
  CanonicalTask,
  Alert,
  EmailDraft,
  DailySummary,
  DepartmentLevelConfig,
  ReportsTo,
  UserRole,
  ReportSource,
  TaskStatus,
  AlertType,
  AlertSeverity,
} from "@prisma/client";

export type {
  Organization,
  Department,
  User,
  DepartmentMember,
  Report,
  ParsedReport,
  Task,
  TaskHistory,
  CanonicalTask,
  Alert,
  EmailDraft,
  DailySummary,
  DepartmentLevelConfig,
  ReportsTo,
  UserRole,
  ReportSource,
  TaskStatus,
  AlertType,
  AlertSeverity,
};

// Extended types with relations
export type DepartmentWithMembers = Department & {
  members: (DepartmentMember & { user: User })[];
  subDepartments: Department[];
  headUser: User | null;
};

export type UserWithDepartments = User & {
  departmentMemberships: (DepartmentMember & { department: Department })[];
};

export type ReportWithParsed = Report & {
  parsedReport: (ParsedReport & { tasks: Task[] }) | null;
  user: User;
};

export type TaskWithHistory = Task & {
  taskHistories: TaskHistory[];
};

export type CanonicalTaskWithHistory = CanonicalTask & {
  taskHistories: TaskHistory[];
  user: User;
};

// Auth session user
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string;
}
