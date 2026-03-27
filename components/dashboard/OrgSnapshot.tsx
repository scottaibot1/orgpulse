"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, ChevronRight } from "lucide-react";
import type { TaskStatus } from "@/types";

interface PersonData {
  id: string;
  name: string;
  email: string;
  title: string | null;
  role: string;
  submissionToken: string;
  department: { id: string; name: string; color: string | null } | null;
  status: "submitted" | "missing" | "flagged";
  topTask: { description: string; status: TaskStatus; pctComplete: number | null } | null;
  alertCount: number;
  hasCritical: boolean;
}

interface DeptGroup {
  name: string;
  color: string | null;
  people: PersonData[];
}

interface Props {
  departments: DeptGroup[];
}

const STATUS_CONFIG = {
  submitted: {
    dot: "bg-green-400",
    border: "border-green-200",
    bg: "bg-green-50",
    label: "Submitted",
    icon: CheckCircle,
    iconColor: "text-green-500",
  },
  flagged: {
    dot: "bg-yellow-400",
    border: "border-yellow-200",
    bg: "bg-yellow-50",
    label: "Has Flags",
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
  },
  missing: {
    dot: "bg-red-400",
    border: "border-red-200",
    bg: "bg-white",
    label: "Not Submitted",
    icon: Clock,
    iconColor: "text-red-400",
  },
};

const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  blocked: "bg-red-100 text-red-700",
  complete: "bg-blue-100 text-blue-700",
};

function PersonCard({ person }: { person: PersonData }) {
  const cfg = STATUS_CONFIG[person.status];
  const Icon = cfg.icon;
  const initials = person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Link href={`/dashboard/people/${person.id}`}>
      <div
        className={`rounded-lg border ${cfg.border} p-4 hover:shadow-md transition-all cursor-pointer h-full flex flex-col gap-3`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                backgroundColor: person.department?.color ? `${person.department.color}25` : "#f3f4f6",
                color: person.department?.color ?? "#6b7280",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm leading-tight truncate">{person.name}</p>
              {person.title && (
                <p className="text-xs text-gray-400 truncate">{person.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {person.alertCount > 0 && (
              <Badge
                className={`text-xs h-5 px-1.5 ${person.hasCritical ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
              >
                {person.alertCount}
              </Badge>
            )}
            <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
          </div>
        </div>

        {/* Top task */}
        <div className="flex-1">
          {person.topTask ? (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Top Priority</p>
              <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                {person.topTask.description}
              </p>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${TASK_STATUS_COLOR[person.topTask.status]}`}>
                  {person.topTask.status.replace("_", " ")}
                </Badge>
                {person.topTask.pctComplete !== null && (
                  <span className="text-xs text-gray-400">{person.topTask.pctComplete}%</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              {person.status === "missing" ? "No report today" : "No tasks logged"}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className={`text-xs font-medium ${cfg.iconColor}`}>{cfg.label}</span>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        </div>
      </div>
    </Link>
  );
}

export default function OrgSnapshot({ departments }: Props) {
  const [filter, setFilter] = useState<"all" | "missing" | "flagged">("all");

  const allPeople = departments.flatMap((d) => d.people);
  const missingCount = allPeople.filter((p) => p.status === "missing").length;
  const flaggedCount = allPeople.filter((p) => p.status === "flagged").length;

  const filtered = departments
    .map((dept) => ({
      ...dept,
      people: dept.people.filter(
        (p) => filter === "all" || p.status === filter
      ),
    }))
    .filter((dept) => dept.people.length > 0);

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className="h-8"
        >
          All ({allPeople.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "missing" ? "default" : "outline"}
          onClick={() => setFilter("missing")}
          className={`h-8 ${filter !== "missing" && missingCount > 0 ? "border-red-200 text-red-600" : ""}`}
        >
          Missing ({missingCount})
        </Button>
        <Button
          size="sm"
          variant={filter === "flagged" ? "default" : "outline"}
          onClick={() => setFilter("flagged")}
          className={`h-8 ${filter !== "flagged" && flaggedCount > 0 ? "border-yellow-200 text-yellow-600" : ""}`}
        >
          Flagged ({flaggedCount})
        </Button>

        <div className="ml-auto flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Submitted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Flagged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Missing
          </span>
        </div>
      </div>

      {/* Departments */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No people match this filter.
        </div>
      ) : (
        filtered.map((dept) => (
          <div key={dept.name} className="space-y-3">
            <div className="flex items-center gap-2">
              {dept.color && (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dept.color }}
                />
              )}
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                {dept.name}
              </h2>
              <span className="text-xs text-gray-400">
                ({dept.people.filter((p) => p.status !== "missing").length}/{dept.people.length} submitted)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {dept.people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
