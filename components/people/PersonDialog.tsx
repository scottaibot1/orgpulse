"use client";

import { useEffect, useState } from "react";
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
import type { UserWithDepartments, Department } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  title: z.string().optional(),
  role: z.enum(["admin", "manager", "member"]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: UserWithDepartments | null;
}

export default function PersonDialog({ open, onClose, onSaved, editing }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [primaryDeptId, setPrimaryDeptId] = useState<string>("");
  const [editEmail, setEditEmail] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "member" },
  });

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then(setDepartments);
  }, []);

  useEffect(() => {
    if (open) {
      setError(null);
      if (editing) {
        setEditEmail(editing.email);
        reset({
          name: editing.name,
          email: editing.email,
          title: editing.title ?? "",
          role: editing.role,
        });
        const ids = editing.departmentMemberships.map((m) => m.departmentId);
        setSelectedDeptIds(ids);
        const primary = editing.departmentMemberships.find((m) => m.isPrimary);
        setPrimaryDeptId(primary?.departmentId ?? ids[0] ?? "");
      } else {
        setEditEmail("");
        reset({ name: "", email: "", title: "", role: "member" });
        setSelectedDeptIds([]);
        setPrimaryDeptId("");
      }
    }
  }, [open, editing, reset]);

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

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setError(null);

    const payload = {
      ...data,
      ...(editing ? { email: editEmail } : {}),
      departmentIds: selectedDeptIds,
      primaryDepartmentId: primaryDeptId,
    };

    const url = editing ? `/api/users/${editing.id}` : "/api/users";
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
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" placeholder="Jane Smith" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            {editing ? (
              <input
                id="email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
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
              onValueChange={(v) => setValue("role", v as "admin" | "manager" | "member")}
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

          <div className="space-y-2">
            <Label>Departments</Label>
            {departments.length === 0 ? (
              <p className="text-sm text-gray-500">
                No departments yet.{" "}
                <a href="/dashboard/org" className="text-blue-600 hover:underline">
                  Create one first.
                </a>
              </p>
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
                    <Select
                      onValueChange={(v) => setPrimaryDeptId(v ?? "")}
                      value={primaryDeptId}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDepts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
