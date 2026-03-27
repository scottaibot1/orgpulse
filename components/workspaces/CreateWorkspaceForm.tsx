"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Zap, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

const ACCENT_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#10b981", label: "Emerald" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Red" },
];

const CRON_PRESETS = [
  { label: "Daily at 6pm", value: "0 18 * * *" },
  { label: "Daily at 5pm", value: "0 17 * * *" },
  { label: "Daily at 8pm", value: "0 20 * * *" },
  { label: "Weekdays at 6pm", value: "0 18 * * 1-5" },
];

export default function CreateWorkspaceForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    accentColor: "#6366f1",
    cronSchedule: "0 18 * * *",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const text = await res.text();
      let message = "Failed to create workspace";
      try { message = JSON.parse(text).error ?? message; } catch {}
      setError(message);
      setSaving(false);
      return;
    }

    const { orgId } = await res.json();
    router.push(`/w/${orgId}/org`);
  }

  const preview = form.name || "Workspace";

  return (
    <div className="w-full max-w-lg space-y-8">
      {/* Header */}
      <div>
        <Link href="/workspaces" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to workspaces
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">OrgPulse AI</span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-4">Create a new workspace</h1>
        <p className="text-slate-400 text-sm mt-1">Each workspace is completely independent — its own team, reports, and AI settings.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Preview card */}
        <div
          className="rounded-2xl p-5 border-t-4 bg-slate-800/60 border border-slate-700"
          style={{ borderTopColor: form.accentColor }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${form.accentColor}, ${form.accentColor}aa)` }}
            >
              {preview.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold">{preview}</p>
              <p className="text-slate-500 text-xs">{form.description || "No description"}</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-sm font-medium">Workspace Name *</Label>
          <Input
            placeholder="e.g. Acme Corp, Sales Team, Q2 Project"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-violet-500 h-11"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-sm font-medium">Description <span className="text-slate-500 font-normal">(optional)</span></Label>
          <Input
            placeholder="What is this workspace for?"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-violet-500 h-11"
          />
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm font-medium">Accent Color</Label>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => set("accentColor", c.value)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 border-2"
                style={{
                  backgroundColor: c.value,
                  borderColor: form.accentColor === c.value ? "#fff" : "transparent",
                  transform: form.accentColor === c.value ? "scale(1.15)" : undefined,
                }}
              >
                {form.accentColor === c.value && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Cron schedule */}
        <div className="space-y-2">
          <Label className="text-slate-300 text-sm font-medium">Report Collection Schedule</Label>
          <div className="grid grid-cols-2 gap-2">
            {CRON_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set("cronSchedule", p.value)}
                className={`text-sm px-3 py-2.5 rounded-lg border text-left transition-all ${
                  form.cronSchedule === p.value
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="w-full h-12 text-base font-medium text-white"
          style={{
            background: saving || !form.name.trim()
              ? undefined
              : `linear-gradient(135deg, ${form.accentColor}, ${form.accentColor}cc)`,
          }}
        >
          {saving ? "Creating workspace..." : "Create Workspace →"}
        </Button>
      </form>
    </div>
  );
}
