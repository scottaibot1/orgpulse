"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, Eye, EyeOff } from "lucide-react";

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

const TIMEZONES = [
  { group: "United States", zones: [
    { label: "Eastern (ET)", value: "America/New_York" },
    { label: "Central (CT)", value: "America/Chicago" },
    { label: "Mountain (MT)", value: "America/Denver" },
    { label: "Mountain – no DST (AZ)", value: "America/Phoenix" },
    { label: "Pacific (PT)", value: "America/Los_Angeles" },
    { label: "Alaska (AKT)", value: "America/Anchorage" },
    { label: "Hawaii (HT)", value: "Pacific/Honolulu" },
  ]},
  { group: "Europe", zones: [
    { label: "London (GMT/BST)", value: "Europe/London" },
    { label: "Paris / Berlin (CET)", value: "Europe/Paris" },
    { label: "Helsinki / Kyiv (EET)", value: "Europe/Helsinki" },
    { label: "Moscow (MSK)", value: "Europe/Moscow" },
  ]},
  { group: "Asia & Pacific", zones: [
    { label: "Dubai (GST)", value: "Asia/Dubai" },
    { label: "Kolkata (IST)", value: "Asia/Kolkata" },
    { label: "Singapore / Hong Kong", value: "Asia/Singapore" },
    { label: "Tokyo (JST)", value: "Asia/Tokyo" },
    { label: "Seoul (KST)", value: "Asia/Seoul" },
    { label: "Sydney (AEDT)", value: "Australia/Sydney" },
    { label: "Auckland (NZST)", value: "Pacific/Auckland" },
  ]},
  { group: "Other", zones: [
    { label: "UTC", value: "UTC" },
  ]},
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseCron(cron: string) {
  const parts = cron.split(" ");
  if (parts.length !== 5) return { hour24: 18, minute: 0, dayMode: "every" as const, customDays: [] as number[] };
  const minute = parseInt(parts[0]) || 0;
  const hour24 = parseInt(parts[1]) || 18;
  const dayPart = parts[4];
  let dayMode: "every" | "weekdays" | "weekends" | "custom" = "every";
  let customDays: number[] = [];
  if (dayPart === "*") dayMode = "every";
  else if (dayPart === "1-5") dayMode = "weekdays";
  else if (dayPart === "0,6" || dayPart === "6,0") dayMode = "weekends";
  else { dayMode = "custom"; customDays = dayPart.split(",").map(Number).filter((n) => !isNaN(n)); }
  return { hour24, minute, dayMode, customDays };
}

function buildCron(hour24: number, minute: number, dayMode: string, customDays: number[]) {
  let dayPart = "*";
  if (dayMode === "weekdays") dayPart = "1-5";
  else if (dayMode === "weekends") dayPart = "0,6";
  else if (dayMode === "custom") dayPart = customDays.length ? [...customDays].sort((a, b) => a - b).join(",") : "*";
  return `${minute} ${hour24} * * ${dayPart}`;
}

function describeCron(cron: string, timezone: string) {
  const { hour24, minute, dayMode, customDays } = parseCron(cron);
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const h = hour24 % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  const timeStr = `${h}:${m} ${ampm}`;
  let dayStr = "every day";
  if (dayMode === "weekdays") dayStr = "weekdays";
  else if (dayMode === "weekends") dayStr = "weekends";
  else if (dayMode === "custom") dayStr = customDays.map((d) => DAY_NAMES[d]).join(", ") || "no days";
  const tz = TIMEZONES.flatMap((g) => g.zones).find((z) => z.value === timezone)?.label ?? timezone;
  return `${timeStr} ${tz}, ${dayStr}`;
}

interface WorkspaceData {
  id: string;
  name: string;
  workspaceSettings: {
    description: string | null;
    accentColor: string;
    cronSchedule: string;
    cronTimezone: string;
    submissionMethods: { type: string; active: boolean }[];
    reportCollectionScope?: string;
    anthropicApiKey?: string | null;
  } | null;
}

interface Props {
  workspace: WorkspaceData;
  orgId: string;
}

export default function WorkspaceSettingsForm({ workspace, orgId }: Props) {
  const router = useRouter();
  const settings = workspace.workspaceSettings;

  const initialCron = settings?.cronSchedule ?? "0 18 * * *";
  const initialTz = settings?.cronTimezone ?? "America/New_York";
  const parsed = parseCron(initialCron);

  const [form, setForm] = useState({
    name: workspace.name,
    description: settings?.description ?? "",
    accentColor: settings?.accentColor ?? "#6366f1",
  });
  const [cronTimezone, setCronTimezone] = useState(initialTz);
  const [hour24, setHour24] = useState(parsed.hour24);
  const [minute, setMinute] = useState(parsed.minute);
  const [dayMode, setDayMode] = useState<"every" | "weekdays" | "weekends" | "custom">(parsed.dayMode);
  const [customDays, setCustomDays] = useState<number[]>(parsed.customDays);

  const [reportCollectionScope, setReportCollectionScope] = useState(
    settings?.reportCollectionScope ?? "everyone"
  );
  const [anthropicApiKey, setAnthropicApiKey] = useState(settings?.anthropicApiKey ?? "");
  const [showApiKey, setShowApiKey] = useState(false);

  const [submissionMethods, setSubmissionMethods] = useState<{ type: string; active: boolean }[]>(
    settings?.submissionMethods ?? [
      { type: "link", active: true },
      { type: "email", active: false },
      { type: "app", active: false },
    ]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleMethod(type: string) {
    setSubmissionMethods((prev) =>
      prev.map((m) => (m.type === type ? { ...m, active: !m.active } : m))
    );
  }

  function toggleCustomDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  // Derived 12h values
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  function setHour12(h: number) {
    const h24 = ampm === "AM" ? h % 12 : (h % 12) + 12;
    setHour24(h24);
  }
  function setAmpm(ap: "AM" | "PM") {
    const h24 = ap === "AM" ? hour12 % 12 : (hour12 % 12) + 12;
    setHour24(h24);
  }

  const cronSchedule = buildCron(hour24, minute, dayMode, customDays);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/w/${orgId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cronSchedule, cronTimezone, submissionMethods, reportCollectionScope, anthropicApiKey: anthropicApiKey || null }),
    });

    if (!res.ok) {
      const text = await res.text();
      let message = "Failed to save settings";
      try { message = JSON.parse(text).error ?? message; } catch {}
      setError(message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  const methodLabels: Record<string, string> = {
    link: "Unique submission link (no login required)",
    email: "Email submission",
    app: "In-app form",
  };

  const selectClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">General</h2>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Workspace Name</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </Label>
          <Input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What is this workspace for?"
            className="h-11"
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Accent Color</h2>
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
                boxShadow: form.accentColor === c.value ? `0 0 0 2px ${c.value}` : undefined,
              }}
            >
              {form.accentColor === c.value && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Report Collection Schedule</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {describeCron(cronSchedule, cronTimezone)}
          </p>
        </div>

        {/* Time picker */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Time</Label>
          <div className="flex gap-2 items-center">
            {/* Hour */}
            <select
              className={selectClass}
              value={hour12}
              onChange={(e) => setHour12(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <span className="text-slate-400 font-medium">:</span>

            {/* Minute */}
            <select
              className={selectClass}
              value={minute}
              onChange={(e) => setMinute(parseInt(e.target.value))}
            >
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
              ))}
            </select>

            {/* AM/PM */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
              {(["AM", "PM"] as const).map((ap) => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => setAmpm(ap)}
                  className={`px-3 h-11 text-sm font-medium transition-colors ${
                    ampm === ap
                      ? "bg-violet-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-700">Days</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["every", "weekdays", "weekends", "custom"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDayMode(mode)}
                className={`text-sm px-3 py-2.5 rounded-lg border text-left transition-all capitalize ${
                  dayMode === mode
                    ? "bg-violet-50 border-violet-300 text-violet-700 font-medium"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {mode === "every" ? "Every day" : mode === "weekdays" ? "Weekdays (Mon–Fri)" : mode === "weekends" ? "Weekends (Sat–Sun)" : "Custom days"}
              </button>
            ))}
          </div>

          {dayMode === "custom" && (
            <div className="flex gap-2 flex-wrap pt-1">
              {DAY_NAMES.map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCustomDay(idx)}
                  className={`w-12 h-10 rounded-lg border text-sm font-medium transition-all ${
                    customDays.includes(idx)
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Timezone</Label>
          <select
            className={selectClass}
            value={cronTimezone}
            onChange={(e) => setCronTimezone(e.target.value)}
          >
            {TIMEZONES.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.zones.map((z) => (
                  <option key={z.value} value={z.value}>{z.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">AI Configuration</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Provide your Anthropic API key to enable AI-powered report processing and executive summaries.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">Anthropic API Key</Label>
          <div className="relative">
            <Input
              type={showApiKey ? "text" : "password"}
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="h-11 pr-10 font-mono text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Used for document processing and daily summary generation. Stored securely and never shared.
          </p>
        </div>
      </div>

      {/* Report Collection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Report Collection</h2>
          <p className="text-sm text-slate-500 mt-0.5">Who is expected to submit daily reports?</p>
        </div>
        <div className="space-y-3">
          {[
            {
              value: "everyone",
              label: "Everyone",
              description: "All active team members are expected to submit reports daily.",
            },
            {
              value: "leads_only",
              label: "Leads only",
              description: "Only people with Level 1 or 2 (leads) submit reports. Everyone else is excluded.",
            },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-all ${
                reportCollectionScope === option.value
                  ? "border-violet-300 bg-violet-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                className="mt-1 accent-violet-600"
                checked={reportCollectionScope === option.value}
                onChange={() => setReportCollectionScope(option.value)}
              />
              <div>
                <p className="text-sm font-medium text-slate-800">{option.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Submission methods */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Submission Methods</h2>
        <div className="space-y-3">
          {submissionMethods.map((method) => (
            <label key={method.type} className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${method.active ? "bg-violet-500" : "bg-slate-200"}`}
                onClick={() => toggleMethod(method.type)}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${method.active ? "left-5" : "left-1"}`} />
              </div>
              <span className="text-sm text-slate-700">
                <span className="capitalize font-medium">{method.type}</span>
                {" — "}{methodLabels[method.type]}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={saving}
        className="w-full h-11 text-base font-medium"
        style={{ background: saving ? undefined : `linear-gradient(135deg, ${form.accentColor}, ${form.accentColor}cc)` }}
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
      </Button>
    </form>
  );
}
