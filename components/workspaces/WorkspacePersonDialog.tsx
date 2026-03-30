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
  isAdmin?: boolean;
}

function getLevelLabel(lvl: number, configs: LevelConfig[]): string {
  const config = configs.find((c) => c.levelNumber === lvl);
  return (config?.levelTitle?.trim()) ? config.levelTitle.trim() : `Level ${lvl}`;
}

export default function WorkspacePersonDialog({ open, onClose, onSaved, editing, orgId, canToggleReporting = true, isAdmin = false }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DeptWithLevels[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [primaryDeptId, setPrimaryDeptId] = useState<string>("");
  const [level, setLevel] = useState<number | null>(null);
  const [reportsToIds, setReportsToIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [isReportingActive, setIsReportingActive] = useState(true);
  const [executiveTier, setExecutiveTier] = useState<1 | 2 | null>(null);
  const [executiveDepartmentIds, setExecutiveDepartmentIds] = useState<string[]>([]);
  const [reportCadence, setReportCadence] = useState<"daily" | "weekly" | "biweekly" | "monthly" | "custom">("daily");
  const [reportDueDays, setReportDueDays] = useState<number[]>([5]);
  const [reportDueTime, setReportDueTime] = useState("17:00");
  const [reportBiweeklyWeek, setReportBiweeklyWeek] = useState<"A" | "B">("A");
  const [editEmail, setEditEmail] = useState("");

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
        setEditEmail(editing.email);
        reset({ name: editing.name, email: editing.email, title: editing.title ?? "", role: editing.role });
        const ids = editing.departmentMemberships.map((m) => m.departmentId);
        setSelectedDeptIds(ids);
        const primary = editing.departmentMemberships.find((m) => m.isPrimary);
        setPrimaryDeptId(primary?.departmentId ?? ids[0] ?? "");
        setLevel((editing as UserWithDepartments & { level?: number | null }).level ?? null);
        const existingManagers = ((editing as UserWithDepartments & { reportsToManagers?: { managerUserId: string }[] }).reportsToManagers ?? []).map((r) => r.managerUserId);
        setReportsToIds(existingManagers);
        setIsReportingActive((editing as UserWithDepartments & { isReportingActive?: boolean }).isReportingActive ?? true);
        const e2 = editing as UserWithDepartments & { reportCadence?: string; reportDueDays?: number[]; reportDueTime?: string; reportBiweeklyWeek?: string; executiveTier?: number | null; executiveDepartments?: { departmentId: string }[] };
        setExecutiveTier((e2.executiveTier as 1 | 2 | null) ?? null);
        setExecutiveDepartmentIds(e2.executiveDepartments?.map((d) => d.departmentId) ?? []);
        setReportCadence((e2.reportCadence as "daily" | "weekly" | "biweekly" | "monthly" | "custom") ?? "daily");
        setReportDueDays(e2.reportDueDays ?? [5]);
        setReportDueTime(e2.reportDueTime ?? "17:00");
        setReportBiweeklyWeek((e2.reportBiweeklyWeek as "A" | "B") ?? "A");
      } else {
        setEditEmail("");
        reset({ name: "", email: "", title: "", role: "member" });
        setSelectedDeptIds([]);
        setPrimaryDeptId("");
        setLevel(null);
        setReportsToIds([]);
        setIsReportingActive(true);
        setExecutiveTier(null);
        setExecutiveDepartmentIds([]);
        setReportCadence("daily");
        setReportDueDays([5]);
        setReportDueTime("17:00");
        setReportBiweeklyWeek("A");
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
      // In edit mode, use the controlled editEmail state (admin can change, non-admin keeps original)
      ...(editing ? { email: editEmail } : {}),
      level,
      departmentIds: selectedDeptIds,
      primaryDepartmentId: primaryDeptId,
      reportsToIds,
      isReportingActive,
      reportCadence,
      reportDueDays,
      reportDueTime,
      reportBiweeklyWeek,
      executiveTier,
      executiveDepartmentIds: executiveTier ? executiveDepartmentIds : [],
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
            {editing ? (
              <>
                <Input
                  id="email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                <p className="text-xs text-gray-400">Only admins can change email addresses.</p>
              </>
            ) : (
              <>
                <Input id="email" type="email" placeholder="jane@company.com" {...register("email")} />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </>
            )}
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

          {/* Executive Tier */}
          <div className="space-y-2">
            <Label>Executive Tier</Label>
            <div className="flex gap-2">
              {([null, 1, 2] as const).map((tier) => (
                <button
                  key={String(tier)}
                  type="button"
                  onClick={() => {
                    setExecutiveTier(tier);
                    if (tier !== null) {
                      setIsReportingActive(false);
                      if (executiveDepartmentIds.length === 0) {
                        setExecutiveDepartmentIds(departments.map((d) => d.id));
                      }
                    } else {
                      setIsReportingActive(true);
                    }
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    executiveTier === tier
                      ? "bg-amber-50 border-amber-300 text-amber-800 font-semibold"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {tier === null ? "None" : tier === 1 ? "Exec Tier 1" : "Exec Tier 2"}
                </button>
              ))}
            </div>
            {executiveTier !== null && (
              <div className="space-y-1.5 mt-2">
                <Label className="text-xs text-gray-500">Departments this executive oversees</Label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-md max-h-32 overflow-y-auto">
                  {departments.length === 0 ? (
                    <p className="text-xs text-gray-400">No departments yet</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setExecutiveDepartmentIds(departments.map((d) => d.id))}
                        className="text-xs text-blue-600 hover:underline mr-1"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setExecutiveDepartmentIds([])}
                        className="text-xs text-slate-400 hover:underline mr-2"
                      >
                        None
                      </button>
                      {departments.map((d) => {
                        const checked = executiveDepartmentIds.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() =>
                              setExecutiveDepartmentIds((prev) =>
                                prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                              )
                            }
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                              checked
                                ? "bg-amber-100 border-amber-300 text-amber-800"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-sm border ${checked ? "bg-amber-400 border-amber-400" : "border-gray-300"}`} />
                            {d.name}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400">{executiveDepartmentIds.length} of {departments.length} departments selected</p>
              </div>
            )}
          </div>

          {/* Reporting Active toggle */}
          {canToggleReporting && (
            <div className={`flex items-start justify-between gap-4 py-1 ${executiveTier !== null ? "opacity-40 pointer-events-none" : ""}`}>
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

          {/* Reporting Schedule */}
          {canToggleReporting && (
            <div className={`space-y-3 border-t pt-3 ${executiveTier !== null ? "opacity-40 pointer-events-none" : ""}`}>
              <Label className="text-sm font-medium text-gray-900">Reporting Schedule</Label>

              {/* Cadence selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Cadence</Label>
                <Select
                  value={reportCadence}
                  onValueChange={(v) => {
                    setReportCadence(v as typeof reportCadence);
                    if (v === "daily") setReportDueDays([]);
                    else if (v === "weekly" || v === "biweekly") setReportDueDays([5]);
                    else if (v === "monthly") setReportDueDays([1]);
                    else if (v === "custom") setReportDueDays([5]);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly (every other week)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Day picker for weekly / biweekly / custom */}
              {(reportCadence === "weekly" || reportCadence === "biweekly" || reportCadence === "custom") && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">
                    {reportCadence === "custom" ? "Days of week" : "Day of week"}
                  </Label>
                  <div className="flex gap-1 flex-wrap">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => {
                      const selected = reportDueDays.includes(idx);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (reportCadence === "custom") {
                              setReportDueDays((prev) =>
                                prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
                              );
                            } else {
                              setReportDueDays([idx]);
                            }
                          }}
                          className={`px-2 py-1 rounded text-xs border transition-colors ${
                            selected
                              ? "bg-blue-100 border-blue-300 text-blue-800"
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Day of month for monthly */}
              {reportCadence === "monthly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Day of month</Label>
                  <Select
                    value={String(reportDueDays[0] ?? 1)}
                    onValueChange={(v) => setReportDueDays([parseInt(v ?? "1")])}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Week A/B for biweekly */}
              {reportCadence === "biweekly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Which week</Label>
                  <div className="flex gap-2">
                    {(["A", "B"] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setReportBiweeklyWeek(w)}
                        className={`px-4 py-1 rounded text-sm border transition-colors ${
                          reportBiweeklyWeek === w
                            ? "bg-blue-100 border-blue-300 text-blue-800"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        Week {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Due time */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Due by</Label>
                <input
                  type="time"
                  value={reportDueTime}
                  onChange={(e) => setReportDueTime(e.target.value)}
                  className="block w-full h-9 px-3 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Human-readable summary */}
              <p className="text-xs text-gray-400">
                {reportCadence === "daily" && `Due every day by ${reportDueTime}`}
                {reportCadence === "weekly" && reportDueDays.length > 0 && `Due every ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][reportDueDays[0]]} by ${reportDueTime}`}
                {reportCadence === "biweekly" && reportDueDays.length > 0 && `Due every other ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][reportDueDays[0]]} (Week ${reportBiweeklyWeek}) by ${reportDueTime}`}
                {reportCadence === "monthly" && reportDueDays.length > 0 && `Due on the ${reportDueDays[0]}${["th","st","nd","rd"][Math.min(reportDueDays[0] % 10, 3)] ?? "th"} of each month by ${reportDueTime}`}
                {reportCadence === "custom" && reportDueDays.length > 0 && `Due on ${reportDueDays.sort((a,b)=>a-b).map((d)=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")} by ${reportDueTime}`}
                {reportCadence === "custom" && reportDueDays.length === 0 && "Select at least one day"}
              </p>
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
