"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

const taskSchema = z.object({
  description: z.string().min(1, "Task description required"),
  projectName: z.string().optional(),
  dueDate: z.string().optional(),
  hoursToday: z.string().optional(),
  pctComplete: z.string().optional(),
  status: z.enum(["on_track", "at_risk", "blocked", "complete"]),
});

const formSchema = z.object({
  tasks: z.array(taskSchema).min(1, "Add at least one task"),
  notes: z.string().optional(),
  blockers: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  userId: string;
  userName: string;
}

const STATUS_OPTIONS = [
  { value: "on_track", label: "On Track", color: "bg-green-100 text-green-700" },
  { value: "at_risk", label: "At Risk", color: "bg-yellow-100 text-yellow-700" },
  { value: "blocked", label: "Blocked", color: "bg-red-100 text-red-700" },
  { value: "complete", label: "Complete", color: "bg-blue-100 text-blue-700" },
];

export default function ReportForm({ userId, userName }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tasks: [
        {
          description: "",
          projectName: "",
          dueDate: "",
          hoursToday: "",
          pctComplete: "",
          status: "on_track",
        },
      ],
      notes: "",
      blockers: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "tasks" });
  const tasks = watch("tasks");

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setError(null);

    // Build plain text representation for raw_text
    const lines: string[] = [`Daily Report — ${userName}`, `Date: ${new Date().toLocaleDateString()}`, ""];
    data.tasks.forEach((t, i) => {
      lines.push(`Task ${i + 1}: ${t.description}`);
      if (t.projectName) lines.push(`  Project: ${t.projectName}`);
      if (t.dueDate) lines.push(`  Due: ${t.dueDate}`);
      if (t.hoursToday) lines.push(`  Hours today: ${t.hoursToday}`);
      if (t.pctComplete) lines.push(`  % Complete: ${t.pctComplete}%`);
      lines.push(`  Status: ${t.status}`);
      lines.push("");
    });
    if (data.blockers) lines.push(`Blockers: ${data.blockers}`);
    if (data.notes) lines.push(`Notes: ${data.notes}`);

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        source: "form",
        rawText: lines.join("\n"),
        formData: data,
      }),
    });

    if (!res.ok) {
      setError("Failed to submit report. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
          <p className="text-gray-500">
            Your daily report has been received. Thanks, {userName.split(" ")[0]}!
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setSubmitted(false)}
          >
            Submit Another Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Today&apos;s Tasks
          </h2>
          <span className="text-sm text-gray-500">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>

        {errors.tasks?.root && (
          <p className="text-sm text-red-600">{errors.tasks.root.message}</p>
        )}

        {fields.map((field, index) => {
          const status = tasks[index]?.status ?? "on_track";
          const statusOption = STATUS_OPTIONS.find((s) => s.value === status);

          return (
            <Card key={field.id} className="relative">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                      #{index + 1}
                    </span>
                    <Badge className={`text-xs ${statusOption?.color}`}>
                      {statusOption?.label}
                    </Badge>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Description */}
                <div>
                  <Label className="text-xs text-gray-500">
                    Task Description *
                  </Label>
                  <Textarea
                    placeholder="What are you working on?"
                    rows={2}
                    className="mt-1 resize-none"
                    {...register(`tasks.${index}.description`)}
                  />
                  {errors.tasks?.[index]?.description && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.tasks[index]?.description?.message}
                    </p>
                  )}
                </div>

                {/* Project + Status row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">Project Name</Label>
                    <Input
                      placeholder="e.g. Q2 Launch"
                      className="mt-1"
                      {...register(`tasks.${index}.projectName`)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Status</Label>
                    <Select
                      defaultValue="on_track"
                      onValueChange={(v) =>
                        setValue(
                          `tasks.${index}.status`,
                          v as "on_track" | "at_risk" | "blocked" | "complete"
                        )
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Due date + Hours + % row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">Due Date</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      {...register(`tasks.${index}.dueDate`)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Hours Today</Label>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      placeholder="2.5"
                      className="mt-1"
                      {...register(`tasks.${index}.hoursToday`)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">% Complete</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="50"
                      className="mt-1"
                      {...register(`tasks.${index}.pctComplete`)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() =>
            append({
              description: "",
              projectName: "",
              dueDate: "",
              hoursToday: "",
              pctComplete: "",
              status: "on_track",
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Task
        </Button>
      </div>

      {/* Blockers */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-4">
          <div>
            <Label htmlFor="blockers" className="flex items-center gap-2">
              Blockers or Escalations
              <span className="text-xs text-gray-400 font-normal">Optional</span>
            </Label>
            <Textarea
              id="blockers"
              placeholder="Anything blocking your progress or that needs attention from management?"
              rows={2}
              className="mt-1 resize-none"
              {...register("blockers")}
            />
          </div>

          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              Additional Notes
              <span className="text-xs text-gray-400 font-normal">Optional</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Anything else you want to share?"
              rows={2}
              className="mt-1 resize-none"
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full h-12 text-base"
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit Report"}
      </Button>

      <p className="text-center text-xs text-gray-400 pb-4">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </form>
  );
}
