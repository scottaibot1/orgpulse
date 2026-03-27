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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DepartmentWithMembers } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  parentDepartmentId: z.string().nullable().optional(),
  color: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: DepartmentWithMembers | null;
  allDepartments: DepartmentWithMembers[];
}

const COLOR_OPTIONS = [
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#10B981" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Orange", value: "#F59E0B" },
  { label: "Red", value: "#EF4444" },
  { label: "Pink", value: "#EC4899" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Indigo", value: "#6366F1" },
];

export default function DepartmentDialog({ open, onClose, onSaved, editing, allDepartments }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const selectedColor = watch("color");

  useEffect(() => {
    if (open) {
      setError(null);
      if (editing) {
        reset({
          name: editing.name,
          description: editing.description ?? "",
          parentDepartmentId: editing.parentDepartmentId ?? "",
          color: editing.color ?? "",
        });
      } else {
        reset({ name: "", description: "", parentDepartmentId: "", color: "" });
      }
    }
  }, [open, editing, reset]);

  // Filter out self and children from parent options
  const parentOptions = allDepartments.filter(
    (d) => editing ? d.id !== editing.id : true
  );

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setError(null);

    const payload = {
      ...data,
      parentDepartmentId: data.parentDepartmentId || null,
      color: data.color || null,
    };

    const url = editing ? `/api/departments/${editing.id}` : "/api/departments";
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Department" : "New Department"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Department Name *</Label>
            <Input id="name" placeholder="e.g. Engineering" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this department do?"
              rows={2}
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Parent Department</Label>
            <Select
              onValueChange={(v) => setValue("parentDepartmentId", v === "__none__" ? "" : v)}
              defaultValue={editing?.parentDepartmentId ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (top-level)</SelectItem>
                {parentOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color Label</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setValue("color", selectedColor === c.value ? "" : c.value)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    selectedColor === c.value
                      ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
