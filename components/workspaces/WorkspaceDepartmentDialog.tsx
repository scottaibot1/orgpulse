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
import { ChevronDown, ChevronRight } from "lucide-react";

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
  orgId: string;
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

export default function WorkspaceDepartmentDialog({ open, onClose, onSaved, editing, allDepartments, orgId }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLevels, setShowLevels] = useState(false);
  const [levelTitles, setLevelTitles] = useState<Record<number, string>>({});

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const selectedColor = watch("color");

  useEffect(() => {
    if (open) {
      setError(null);
      setShowLevels(false);
      if (editing) {
        reset({
          name: editing.name,
          description: editing.description ?? "",
          parentDepartmentId: editing.parentDepartmentId ?? "",
          color: editing.color ?? "",
        });
        // Fetch existing level configs
        fetch(`/api/w/${orgId}/departments/${editing.id}/levels`)
          .then((r) => r.json())
          .then((configs: { levelNumber: number; levelTitle: string | null }[]) => {
            const map: Record<number, string> = {};
            configs.forEach((c) => { if (c.levelTitle) map[c.levelNumber] = c.levelTitle; });
            setLevelTitles(map);
            if (configs.some((c) => c.levelTitle)) setShowLevels(true);
          })
          .catch(() => {});
      } else {
        reset({ name: "", description: "", parentDepartmentId: "", color: "" });
        setLevelTitles({});
      }
    }
  }, [open, editing, reset, orgId]);

  const parentOptions = allDepartments.filter((d) => editing ? d.id !== editing.id : true);

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setError(null);

    const payload = {
      ...data,
      parentDepartmentId: data.parentDepartmentId || null,
      color: data.color || null,
    };

    const url = editing
      ? `/api/w/${orgId}/departments/${editing.id}`
      : `/api/w/${orgId}/departments`;
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

    const deptData = await res.json();
    const deptId = editing ? editing.id : deptData.id;

    // Save level configs if any are set
    const levelData = Array.from({ length: 15 }, (_, i) => ({
      levelNumber: i + 1,
      levelTitle: levelTitles[i + 1] || null,
    }));

    await fetch(`/api/w/${orgId}/departments/${deptId}/levels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(levelData),
    });

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Department" : "New Department"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="name">Department Name *</Label>
            <Input id="name" placeholder="e.g. Engineering" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="What does this department do?" rows={2} {...register("description")} />
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
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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
                  className={`w-7 h-7 rounded-full transition-all ${selectedColor === c.value ? "ring-2 ring-offset-2 ring-gray-900 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Level Configuration */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLevels((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div>
                <span className="text-sm font-medium text-slate-700">Level Configuration</span>
                <span className="text-xs text-slate-400 ml-2">optional</span>
              </div>
              {showLevels ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>

            {showLevels && (
              <div className="p-4 space-y-2 bg-white">
                <p className="text-xs text-slate-500 mb-3">
                  Level 1 is highest authority, Level 15 is lowest. Leave blank to use default names.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((lvl) => (
                    <div key={lvl} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-14 flex-shrink-0">Level {lvl}</span>
                      <Input
                        placeholder={`Level ${lvl}`}
                        value={levelTitles[lvl] ?? ""}
                        onChange={(e) => setLevelTitles((prev) => ({ ...prev, [lvl]: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
