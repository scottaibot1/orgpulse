"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Circle, X, ArrowRight, BookOpen, Building2, Users, Link2, Key, Sparkles } from "lucide-react";

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  done: boolean;
}

interface Props {
  orgId: string;
  hasDepartments: boolean;
  hasPeople: boolean;
  hasApiKey: boolean;
  hasSummary: boolean;
  accentColor: string;
}

export default function GettingStartedBanner({ orgId, hasDepartments, hasPeople, hasApiKey, hasSummary, accentColor }: Props) {
  const [dismissed, setDismissed] = useState(true); // prevent flash

  useEffect(() => {
    const key = `orgrise_gs_dismissed_${orgId}`;
    setDismissed(localStorage.getItem(key) === "true");
  }, [orgId]);

  function dismiss() {
    localStorage.setItem(`orgrise_gs_dismissed_${orgId}`, "true");
    setDismissed(true);
  }

  const steps: Step[] = [
    {
      id: "departments",
      label: "Create your first department",
      description: "Organize your team into departments like Sales, Marketing, and Ops.",
      icon: Building2,
      href: `/w/${orgId}/org`,
      done: hasDepartments,
    },
    {
      id: "people",
      label: "Add team members",
      description: "Add the people who will be submitting daily reports.",
      icon: Users,
      href: `/w/${orgId}/people`,
      done: hasPeople,
    },
    {
      id: "links",
      label: "Share submission links",
      description: "Each person gets a unique link. Share it so they can submit their first report.",
      icon: Link2,
      href: `/w/${orgId}/links`,
      done: false, // can't auto-detect if shared
    },
    {
      id: "apikey",
      label: "Add your Anthropic API key",
      description: "Required for AI-powered report parsing and executive summary generation.",
      icon: Key,
      href: `/w/${orgId}/settings`,
      done: hasApiKey,
    },
    {
      id: "summary",
      label: "Generate your first executive summary",
      description: "Once reports are in, generate a full AI briefing from your dashboard.",
      icon: Sparkles,
      href: `/w/${orgId}/dashboard`,
      done: hasSummary,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4" style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`, borderBottom: `1px solid ${accentColor}25` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` }}>
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Getting Started</h2>
            <p className="text-xs text-slate-500">{completedCount} of {steps.length} steps complete</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/w/${orgId}/help`}
            className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: accentColor }}
          >
            View full guide <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            onClick={dismiss}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-1 transition-all duration-500"
          style={{ width: `${progressPct}%`, background: accentColor }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <Link key={step.id} href={step.href} className="group flex sm:flex-col items-start gap-3 sm:gap-2 p-4 hover:bg-slate-50 transition-colors">
              <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                {step.done ? (
                  <CheckCircle className="h-5 w-5" style={{ color: accentColor }} />
                ) : (
                  <div className="relative">
                    <Circle className="h-5 w-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-400 group-hover:text-slate-500">{i + 1}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 sm:flex-none">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className={`h-3 w-3 flex-shrink-0 ${step.done ? "text-slate-400" : "text-slate-500"}`} />
                  <p className={`text-xs font-semibold leading-tight ${step.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{step.label}</p>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight hidden sm:block">{step.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
