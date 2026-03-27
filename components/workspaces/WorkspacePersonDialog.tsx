"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserWithDepartments } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  title: z.string().optional(),
  role: z.enum(["admin", "manager", "member"]),
});

type FormValues = z.infer<typeof schema>;

interface LevelConfig { levelNumber: number; levelTitle: string | null }
interface DeptWithLevels {
  id: string;
  name: string;
  levelConfigs: LevelConfig[];
}
interface OrgUser {
  id: string;
  name: string;
  level: number | null;
  departmentMemberships: { departmentId: string }[];
  reportsToManagers?: { managerUserId: string }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: UserWithDepartments | null;
  orgId: string;
  canToggleReporting?: boolean;
}

function getLevelLabel(lvl: number, configs: LevelConfig[]): string {
  const config = configs.find((c) => c.levelNumber === lvl);
  return (config?.levelTitle?.trim()) ? config.levelTitle.trim() : `Level ${lvl}`;
}

export default function WorkspacePersonDialog({ open, onClose, onSaved, editing, orgId, canToggleReporting = true }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DeptWithLevels[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [primaryDeptId, setPrimaryDeptId] = useState<string>("");
  const [level, setLevel] = useState<number | null>(null);
  const [reportsToIds, setReportsToIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [isReportingActive, setIsReportingActive] = useState(true);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "member" },
  });

  // Fetch departments (with levelConfigs) and org users once
  useEffect(() => {
    fetch(`/api/w/${orgId}/departments`)
      .then((r) => r.json())
      .then((data: DeptWithLevels[]) => setDepartments(data));
    fetch(`/api/w/${orgId}/users`)
      .then((r) => r.json())
      .then((users: OrgUser[]) => setAllUsers(users));
  }, [orgId]);

  // When dialog opens, init form state
  useEffect(() => {
    if (open) {
      setError(null);
      if (editing) {
        reset({ name: editing.name, email: editing.email, title: editing.title ?? "", role: editing.role });
        const ids = editing.departmentMemberships.map((m) => m.departmentId);
        setSelectedDeptIds(ids);
        const primary = editing.departmentMemberships.find((m) => m.isPrimary);
        setPrimaryDeptId(primary?.departmentId ?? ids[0] ?? "");
        setLevel((editing as UserWithDepartments & { level?: number | null }).level ?? null);
        const existingManagers = ((editing as UserWithDepartments & { reportsToManagers?: { managerUserId: string }[] }).reportsToManagers ?? []).map((r) => r.managerUserId);
        setReportsToIds(existingManagers);
        setIsReportingActive((editing as UserWithDepartments & { isReportingActive?: boolean }).isReportingActive ?? true);
      } else {
        reset({ name: "", email: "", title: "", role: "member" });
        setSelectedDeptIds([]);
        setPrimaryDeptId("");
        setLevel(null);
        setReportsToIds([]);
        setIsReportingActive(true);
      }
    }
  }, [open, editing, reset]);

  // Level configs come directly from the selected department's data — no async fetch needed
  const levelConfigs = useMemo<LevelConfig[]>(() => {
    const deptId = primaryDeptId || selectedDeptIds[0];
    if (!deptId) return [];
    return departments.find((d) => d.id === deptId)?.levelConfigs ?? [];
  }, [departments, primaryDeptId, selectedDeptIds]);

  function toggleDept(id: string) {
    setSelectedDeptIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((d) => d !== id);
        if (primaryDeptId === id) setPrimaryDeptId(next[0] ?? "");
        return next;
      }
      if (!primaryDeptId) setPrimaryDeptId(id);
      return [...prev, id];
    });
  }

  function toggleReportsTo(userId: string) {
    setReportsToIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  // People in selected departments at higher authority (lower level number)
  const reportsToOptions = useMemo(() => allUsers.filter((u) => {
    if (u.id === editing?.id) return false;
    if (u.level == null || level == null) return false;
    if (u.level >= level) return false;
    const userDepts = new Set(u.departmentMemberships.map((m) => m.departmentId));
    return selectedDeptIds.some((d) => userDepts.has(d));
  }), [allUsers, editing, level, selectedDeptIds]);

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setError(null);

    const payload = {
      ...data,
      level,
      departmentIds: selectedDeptIds,
      primaryDepartmentId: primaryDeptId,
      reportsToIds,
      isReportingActive,
    };

    const url = editing ? `/api/w/${orgId}/users/${editing.id}` : `/api/w/${orgId}/users`;
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(typeof err.error === "string" ? err.error : "Something went wrong");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  const selectedDepts = departments.filter((d) => selectedDeptIds.includes(d.id));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Person" : "Add Person"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" placeholder="Jane Smith" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="jane@company.com" {...register("email")} disabled={!!editing} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            {editing && <p className="text-xs text-gray-400">Email cannot be changed after creation</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title / Role</Label>
            <Input id="title" placeholder="Senior Engineer" {...register("title")} />
          </div>

          <div className="space-y-2">
            <Label>Access Level</Label>
            <Select
              onValueChange={(v) => setValue("role", (v ?? "member") as "admin" | "manager" | "member")}
              defaultValue={editing?.role ?? "member"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member — can submit reports</SelectItem>
                <SelectItem value="manager">Manager — can view reports</SelectItem>
                <SelectItem value="admin">Admin — full access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reporting Active toggle */}
          {canToggleReporting && (
            <div className="flex items-start justify-between gap-4 py-1">
              <div>
                <Label className="text-sm font-medium text-gray-900">Reporting Active</Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  When off, this person is excluded from daily report collection and org chart submission tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportingActive((v) => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  isReportingActive ? "bg-emerald-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                    isReportingActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Departments */}
          <div className="space-y-2">
            <Label>Departments</Label>
            {departments.length === 0 ? (
              <p className="text-sm text-gray-500">No departments yet. Create one in Departments first.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border rounded-md">
                  {departments.map((d) => {
                    const selected = selectedDeptIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDept(d.id)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          selected
                            ? "bg-blue-100 border-blue-300 text-blue-800"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
                {selectedDepts.length > 1 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Primary Department</Label>
                    <Select onValueChange={(v) => setPrimaryDeptId(v ?? "")} value={primaryDeptId}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {selectedDepts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Org Level — shows custom names as soon as dept is selected */}
          <div className="space-y-2">
            <Label>Org Level</Label>
            <Select
              value={level?.toString() ?? "__none__"}
              onValueChange={(v) => {
                const val = v ?? "__none__";
                setLevel(val === "__none__" ? null : parseInt(val));
                setReportsToIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="No level assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No level assigned</SelectItem>
                {Array.from({ length: 15 }, (_, i) => i + 1).map((lvl) => (
                  <SelectItem key={lvl} value={lvl.toString()}>
                    {getLevelLabel(lvl, levelConfigs)}
                    {lvl <= 2 && <span className="ml-1 text-amber-600 text-xs">(Lead)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {level != null && level <= 2 && (
              <p className="text-xs text-amber-600">This person will be marked as a lead.</p>
            )}
            {selectedDeptIds.length === 0 && (
              <p className="text-xs text-slate-400">Select a department first to see custom level names.</p>
            )}
          </div>

          {/* Reports To */}
          {reportsToOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Reports To</Label>
              <p className="text-xs text-gray-400">Select all managers this person reports to.</p>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 border rounded-md">
                {reportsToOptions.map((u) => {
                  const selected = reportsToIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleReportsTo(u.id)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        selected
                          ? "bg-violet-100 border-violet-300 text-violet-800"
                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {u.name}
                      {u.level != null && (
                        <span className="text-xs ml-1 opacity-60">
                          ({getLevelLabel(u.level, levelConfigs)})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
