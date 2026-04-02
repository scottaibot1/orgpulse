"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookOpen, ChevronRight, Building2, Users, Link2, Settings,
  FileText, Bell, BarChart2, Shield, Key, Clock, CheckCircle, AlertTriangle,
  Zap, Brain, Download, Mail, Eye, Sliders, Calendar, ArrowRight,
} from "lucide-react";

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
}

const SECTIONS: Section[] = [
  { id: "getting-started", title: "Getting Started", icon: Zap },
  { id: "dashboard", title: "Dashboard Overview", icon: BarChart2 },
  { id: "departments", title: "Departments", icon: Building2 },
  { id: "people", title: "People & Schedules", icon: Users },
  { id: "submissions", title: "Submitting Reports", icon: FileText },
  { id: "reports", title: "Reports View", icon: Eye },
  { id: "ai-summaries", title: "AI Executive Summaries", icon: Brain },
  { id: "attention", title: "What Needs Attention", icon: AlertTriangle },
  { id: "detail-levels", title: "Detail Levels", icon: Sliders },
  { id: "pdf-email", title: "PDF & Email Reports", icon: Download },
  { id: "executive-tier", title: "Executive Tier", icon: Shield },
  { id: "alerts", title: "Alerts", icon: Bell },
  { id: "settings", title: "Settings", icon: Settings },
  { id: "tips", title: "Tips & Best Practices", icon: CheckCircle },
];

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">{number}</div>
      <div>
        <p className="font-semibold text-slate-800 mb-1">{title}</p>
        <div className="text-sm text-slate-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Callout({ type = "info", children }: { type?: "info" | "tip" | "warning"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    tip: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };
  const icons = { info: "💡", tip: "✅", warning: "⚠️" };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed my-4 ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>{children}
    </div>
  );
}

function SectionHeader({ id, icon: Icon, title, subtitle }: { id: string; icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div id={id} className="scroll-mt-6 mb-6 pb-4 border-b border-slate-200">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {subtitle && <p className="text-slate-500 text-sm ml-11">{subtitle}</p>}
    </div>
  );
}

function NavLink({ section, active }: { section: Section; active: boolean }) {
  const Icon = section.icon;
  return (
    <a
      href={`#${section.id}`}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
        active ? "bg-violet-50 text-violet-700 font-semibold" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
      }`}
    >
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${active ? "text-violet-600" : "text-slate-400"}`} />
      {section.title}
    </a>
  );
}

export default function HelpPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [activeSection, setActiveSection] = useState("getting-started");
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          setActiveSection(top.target.id);
        }
      },
      { rootMargin: "-10% 0px -80% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.current?.observe(el);
    });
    return () => observer.current?.disconnect();
  }, []);

  return (
    <div className="flex gap-8 max-w-[1100px]">
      {/* Sticky TOC */}
      <aside className="hidden lg:block w-52 flex-shrink-0">
        <div className="sticky top-6">
          <div className="flex items-center gap-2 mb-4 px-3">
            <BookOpen className="h-4 w-4 text-violet-600" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contents</span>
          </div>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => (
              <NavLink key={s.id} section={s} active={activeSection === s.id} />
            ))}
          </nav>
          <div className="mt-6 px-3">
            <Link
              href={`/w/${orgId}/dashboard`}
              className="flex items-center gap-1.5 text-xs text-violet-600 font-medium hover:opacity-80"
            >
              <ArrowRight className="h-3 w-3" /> Back to dashboard
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 space-y-12 pb-20">
        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-violet-300" />
            <span className="text-violet-300 text-sm font-semibold uppercase tracking-wide">OrgRise AI</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Help & User Guide</h1>
          <p className="text-violet-200 text-base leading-relaxed max-w-xl">
            Everything you need to know about setting up and running OrgRise AI — from adding your first team member to generating a full executive intelligence briefing.
          </p>
        </div>

        {/* ── GETTING STARTED ── */}
        <section>
          <SectionHeader id="getting-started" icon={Zap} title="Getting Started" subtitle="Set up your workspace in 5 steps — takes about 10 minutes." />
          <Step number={1} title="Create your first department">
            Go to <strong>Departments</strong> in the left sidebar. Click <strong>Add Department</strong> and give it a name (e.g. Sales, Marketing, Operations). You can add sub-departments later for nested teams. Departments determine how your org chart is structured and how reports are grouped in the AI summary.
          </Step>
          <Step number={2} title="Add team members">
            Go to <strong>People</strong> and click <strong>Add Person</strong>. Enter their name, email, title, and which department they belong to. You can set their reporting schedule here — daily, weekly, or biweekly — and which days of the week reports are expected.
          </Step>
          <Step number={3} title="Share submission links">
            Go to <strong>Submission Links</strong>. Each person has a unique personal link. Share it with them by email or Slack. They don&apos;t need to log in — they just click the link, upload or fill out their update, and submit. That&apos;s it.
          </Step>
          <Step number={4} title="Add your Anthropic API key">
            Go to <strong>Settings → AI Configuration</strong>. Paste your Anthropic API key (starts with <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">sk-ant-</code>). This is required for AI-powered report parsing and executive summary generation. The key is stored securely and never shared.
          </Step>
          <Step number={5} title="Generate your first executive summary">
            Once team members have submitted reports, return to your <strong>Dashboard</strong> and click <strong>Generate Executive Summary</strong>. OrgRise AI will produce a full intelligence briefing — department by department, person by person — with highlights, flags, and action items.
          </Step>
          <Callout type="tip">
            You can always come back here by clicking <strong>Help & Guide</strong> in the left sidebar.
          </Callout>
        </section>

        {/* ── DASHBOARD ── */}
        <section>
          <SectionHeader id="dashboard" icon={BarChart2} title="Dashboard Overview" subtitle="Your command center — everything at a glance." />
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            The dashboard is the first thing you see when you open OrgRise AI. It gives you a real-time snapshot of your organization&apos;s reporting activity for today.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[
              { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", title: "Submitted Today", desc: "How many people have submitted a report today. Click to see the full org snapshot." },
              { icon: Clock, color: "text-rose-600", bg: "bg-rose-50", title: "Missing Today", desc: "People who haven't submitted yet. Drill in to see who and follow up directly." },
              { icon: Building2, color: "text-violet-600", bg: "bg-violet-50", title: "Departments", desc: "Total active departments in this workspace." },
              { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", title: "Open Alerts", desc: "Unread system alerts — at-risk patterns, missing reports, consecutive absences." },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className={`flex gap-3 p-4 rounded-xl border border-slate-100 ${card.bg}`}>
                  <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${card.color}`} />
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{card.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">Completeness Scorecard</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The color-coded bar below the stat cards shows today&apos;s submission completeness as a percentage. <span className="text-emerald-700 font-medium">Green (100%)</span> means everyone submitted. <span className="text-amber-700 font-medium">Amber (70–99%)</span> means most submitted but some are missing. <span className="text-red-700 font-medium">Red (below 70%)</span> means significant gaps. Stand-in pills appear when OrgRise AI uses a previous report as a placeholder for a missing submission.
          </p>
          <h3 className="font-semibold text-slate-800 mb-2">Org Chart</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The live org chart on the right shows every department and team member with a real-time submission status dot — green for submitted, red for missing. Click <strong>Full</strong> to see the full-page org snapshot with more detail.
          </p>
          <h3 className="font-semibold text-slate-800 mb-2">Past Executive Summaries</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            All generated summaries are stored below the main widgets. You can select multiple and delete them, or click any row to view or re-download the PDF.
          </p>
        </section>

        {/* ── DEPARTMENTS ── */}
        <section>
          <SectionHeader id="departments" icon={Building2} title="Departments" subtitle="Organize your team into logical groups." />
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Departments are the backbone of how OrgRise AI organizes your team. The AI groups reports by department in the executive summary, and the org chart is structured around departments.
          </p>
          <div className="space-y-3 mb-4">
            {[
              { title: "Creating a department", desc: "Go to Departments → Add Department. Give it a name and choose a color. You can also set level titles (e.g., \"Level 1 = Director, Level 2 = Manager, Level 3 = Associate\") which appear on people's profile cards in the org chart." },
              { title: "Sub-departments (nested teams)", desc: "When creating or editing a department, choose a parent department to nest it underneath. Sub-departments appear as child nodes in the org chart." },
              { title: "Archiving departments", desc: "You can archive a department rather than delete it. Archived departments and their members no longer appear in reports or the org chart, but historical data is preserved." },
              { title: "Department report ordering", desc: "In Settings → Department Report Ordering, you can drag departments into a custom order to control which appears first in the executive summary. Or set it to AI Determined, and OrgRise AI will lead with the most urgent departments." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <ChevronRight className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PEOPLE ── */}
        <section>
          <SectionHeader id="people" icon={Users} title="People & Reporting Schedules" subtitle="Add your team and configure when they report." />
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Each person in OrgRise AI has their own profile, reporting schedule, and unique submission link. You control exactly who reports and how often.
          </p>
          <h3 className="font-semibold text-slate-800 mb-3">Adding a person</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Go to <strong>People → Add Person</strong>. Fill in their name, email address, job title, and department. After saving, a unique submission link is automatically generated for them.
          </p>
          <h3 className="font-semibold text-slate-800 mb-3">Reporting schedules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              { icon: Calendar, title: "Daily", desc: "Submit every selected day of the week. Best for most teams. Set which days using the schedule picker." },
              { icon: Calendar, title: "Weekly", desc: "Submit once a week on a chosen day. Good for senior staff who do a weekly roll-up." },
              { icon: Calendar, title: "Biweekly", desc: "Submit every other week on alternating A/B weeks. Set the Week A reference date in Settings → Biweekly Cycle." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-violet-500" />
                    <span className="font-semibold text-sm text-slate-800">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
          <h3 className="font-semibold text-slate-800 mb-3">Reporting active toggle</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Each person has a <strong>Include In Reporting</strong> toggle. When turned off, they are excluded from the completeness scorecard and the executive summary. Use this for people on leave, in a transition, or not yet onboarded.
          </p>
          <h3 className="font-semibold text-slate-800 mb-3">Roles</h3>
          <div className="space-y-2 mb-4">
            {[
              { role: "Admin", color: "bg-violet-100 text-violet-700", desc: "Full access — can manage all settings, people, departments, and generate summaries." },
              { role: "Manager", color: "bg-sky-100 text-sky-700", desc: "Can view reports and generate summaries. Cannot manage workspace settings." },
              { role: "Member", color: "bg-slate-100 text-slate-700", desc: "Submit-only access. Cannot view the dashboard or other members' reports." },
            ].map((r) => (
              <div key={r.role} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color} flex-shrink-0 mt-0.5`}>{r.role}</span>
                <p className="text-sm text-slate-600">{r.desc}</p>
              </div>
            ))}
          </div>
          <Callout type="info">
            Sending an invitation email to a team member automatically generates their submission link and sends it to their inbox. Go to <strong>Submission Links → Resend Invitation</strong> to re-send at any time.
          </Callout>
        </section>

        {/* ── SUBMISSIONS ── */}
        <section>
          <SectionHeader id="submissions" title="Submitting Reports" icon={FileText} subtitle="How your team members send their daily updates." />
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Team members never need to log in to OrgRise AI. They use their personal submission link — a unique URL that belongs to only them.
          </p>
          <h3 className="font-semibold text-slate-800 mb-3">Submission methods</h3>
          <div className="space-y-3 mb-4">
            {[
              { title: "PDF or document upload", desc: "Upload a PDF, Word doc (.docx), Excel spreadsheet, or plain text file. OrgRise AI uses Claude to extract the key information: tasks, hours, status, blockers, and risk signals. No special formatting required — it reads natural language." },
              { title: "Email submission", desc: "If email submission is enabled in Settings, team members can forward their status update email to a dedicated inbound email address. The email body is parsed the same way as a document upload." },
              { title: "In-app form", desc: "If the in-app form method is enabled, team members fill out a structured form directly in their browser after clicking their submission link. Good for teams who prefer typing over uploading." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <h3 className="font-semibold text-slate-800 mb-3">What happens after submission</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-2">
            When a report is submitted, OrgRise AI:
          </p>
          <ol className="space-y-2 mb-4 ml-4">
            {[
              "Extracts structured data — tasks, project names, hours worked, blockers, and notes using Claude AI.",
              "Updates the person's canonical narrative — a rolling summary of what they've been working on across recent reports.",
              "Marks them as \"submitted\" in the dashboard and org chart immediately.",
              "Makes their data available for the next executive summary generation.",
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="font-bold text-violet-500 flex-shrink-0">{i + 1}.</span> {item}
              </li>
            ))}
          </ol>
          <Callout type="tip">
            Reports can be submitted any time. OrgRise AI always uses the most recent report from that day when generating the summary.
          </Callout>
        </section>

        {/* ── REPORTS VIEW ── */}
        <section>
          <SectionHeader id="reports" icon={Eye} title="Reports View" subtitle="Browse, search, and review all submitted reports." />
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The <strong>Reports</strong> page shows a full log of every submission across your organization. You can filter by person, department, or date range. Click any report to view the AI-extracted summary and the original file.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Parsed summary", desc: "The AI-extracted version of the report — key tasks, hours, status, and flags in a clean structured format." },
              { title: "Original file", desc: "The raw uploaded file (PDF, Word doc, etc.) is always stored and accessible from the report detail view." },
              { title: "Risk signals", desc: "Flags automatically identified by the AI — things like blockers, overdue items, stalled progress, or dropped hours." },
              { title: "Canonical narrative", desc: "A rolling summary of the person's work across recent reports, used as context when generating executive summaries." },
            ].map((item) => (
              <div key={item.title} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold text-slate-800 text-sm mb-1">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI SUMMARIES ── */}
        <section>
          <SectionHeader id="ai-summaries" icon={Brain} title="AI Executive Summaries" subtitle="Your daily organizational intelligence briefing, generated by Claude." />
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The executive summary is the centerpiece of OrgRise AI. It transforms all the raw reports from your team into a single, sharp briefing that gives you the full picture of your organization in minutes — or seconds, depending on your detail level.
          </p>
          <h3 className="font-semibold text-slate-800 mb-3">Generating a summary</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            From your dashboard, click <strong>Generate Executive Summary</strong>. The AI processes every active team member&apos;s most recent report, identifies patterns and risks, and produces a structured briefing. Depending on your team size and API response time, this usually takes 15–45 seconds.
          </p>
          <h3 className="font-semibold text-slate-800 mb-3">What&apos;s in a summary</h3>
          <div className="space-y-3 mb-4">
            {[
              { icon: "🔥", title: "Today's Pulse", desc: "A single punchy sentence — the most important thing happening today. Leads with the biggest win or most urgent risk." },
              { icon: "🚨", title: "What Needs Attention Today", desc: "A high-priority panel that appears when the AI identifies items requiring immediate executive attention — stalled projects, missing reports, upcoming deadlines, or patterns of concern." },
              { icon: "📊", title: "Organization Pulse", desc: "2–3 sentences describing overall org performance today. Warm, specific, names actual people and numbers." },
              { icon: "🏆", title: "Notable Progress", desc: "Wins and milestones. The AI celebrates specific people by name with exact numbers." },
              { icon: "⚠️", title: "Critical Alerts", desc: "Blockers and at-risk items that need executive awareness. Ordered by urgency." },
              { icon: "🏢", title: "Department sections", desc: "One section per department with a status label (\"3 of 3 reported today\") and a card for each person showing their highlights, hours worked, and time allocation." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Callout type="info">
            OrgRise AI uses stand-ins for people who haven&apos;t submitted today — it falls back to their most recent historical report (up to 30 days old) and clearly labels it as a stand-in. This keeps your summary complete even when not everyone has reported yet.
          </Callout>
        </section>

        {/* ── WHAT NEEDS ATTENTION ── */}
        <section>
          <SectionHeader id="attention" icon={AlertTriangle} title="What Needs Attention Today" subtitle="The AI&apos;s urgent scan — before you read anything else." />
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The <strong>What Needs Attention Today</strong> section appears at the very top of every executive summary — right after the Today&apos;s Pulse headline, before the completeness scorecard. It&apos;s the most visually prominent section, with a warm orange background designed to grab your eye immediately.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The AI scans all reports before generating any other section and flags items that require the executive&apos;s immediate attention. It only appears if something genuinely qualifies — if nothing does, it&apos;s hidden entirely.
          </p>
          <h3 className="font-semibold text-slate-800 mb-3">What triggers an attention item</h3>
          <div className="space-y-2 mb-4">
            {[
              { icon: "🔥", trigger: "Stalled project", desc: "A task has shown no meaningful progress across 3 or more consecutive reports." },
              { icon: "👤", trigger: "Missing 2+ days", desc: "A person hasn't submitted a report for 2 or more consecutive days." },
              { icon: "🚫", trigger: "Blocked or critical", desc: "Any item explicitly flagged as blocked or critical in any report." },
              { icon: "📅", trigger: "Deadline approaching", desc: "A project has a due date within 3 days and is below 80% complete." },
              { icon: "⚠️", trigger: "Shared risk flag", desc: "An item is flagged as at-risk by 2 or more people independently." },
              { icon: "📉", trigger: "Unusual pattern", desc: "A significant drop in hours worked compared to the person's recent norm." },
            ].map((item) => (
              <div key={item.trigger} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <div>
                  <span className="font-semibold text-sm text-slate-800">{item.trigger} — </span>
                  <span className="text-sm text-slate-600">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">How each item reads</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">Example items</p>
            <div className="space-y-2">
              {[
                "🔥 Henderson Proposal stalled at 60% for 5 days — no progress reported (Antonio, Sales) — Consider scheduling a check-in today",
                "⚠️ Sarah Chen missing report — 2nd consecutive day (Marketing) — Follow up before EOD",
                "📅 Q2 Campaign Launch at 72% with deadline in 2 days (Marketing) — May need immediate escalation",
              ].map((ex, i) => (
                <p key={i} className="text-xs text-amber-900 bg-white rounded-lg px-3 py-2 border border-amber-100 leading-relaxed">{ex}</p>
              ))}
            </div>
          </div>
        </section>

        {/* ── DETAIL LEVELS ── */}
        <section>
          <SectionHeader id="detail-levels" icon={Sliders} title="Detail Levels" subtitle="Control how much information appears in each summary." />
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            In <strong>Settings → AI Configuration → Summary Detail Level</strong>, you choose how much detail the AI includes per person in the executive summary. The five named levels are:
          </p>
          <div className="space-y-3">
            {[
              { level: 1, icon: "⚡", name: "Snapshot", tagline: "The 60-second read", desc: "Top alerts only. One line per person. The \"What Needs Attention\" panel plus completeness. Nothing else. Best when you're glancing at your phone before a morning meeting." },
              { level: 2, icon: "🔖", name: "Brief", tagline: "The 3-minute read", desc: "Key priorities and flags per department. No time breakdowns or granular metrics. A quick status of each team without drilling into individual detail." },
              { level: 3, icon: "📊", name: "Standard", tagline: "The balanced read", desc: "Projects, progress, hours worked, and anything flagged. 2–4 highlights per person. The default level — what most teams use for their daily briefing.", recommended: true },
              { level: 4, icon: "🔍", name: "Detailed", tagline: "The deep read", desc: "Everything in Standard plus time allocation breakdowns, specific metrics, and direct highlights pulled straight from each person's report. 3–5 highlights per person." },
              { level: 5, icon: "🧠", name: "Full Intelligence", tagline: "The complete picture", desc: "Every data point, every hour, every specific number, client name, project name, and measurable outcome from every report. Nothing left out. Best for quarterly reviews or when something needs thorough scrutiny." },
            ].map((level) => (
              <div key={level.level} className={`flex gap-4 p-4 rounded-xl border ${level.recommended ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}>
                <div className="flex-shrink-0">
                  <span className="text-2xl">{level.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 font-medium">Level {level.level}</span>
                    <span className="font-bold text-slate-800">{level.name}</span>
                    <span className="text-xs text-slate-500">— {level.tagline}</span>
                    {level.recommended && <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">Recommended</span>}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{level.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PDF & EMAIL ── */}
        <section>
          <SectionHeader id="pdf-email" icon={Download} title="PDF & Email Reports" subtitle="Every summary is available as a beautiful PDF and sent by email." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-4 w-4 text-slate-600" />
                <h3 className="font-semibold text-slate-800">PDF Report</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Click <strong>Save as PDF</strong> on any summary to open the premium print view. It includes the dark navy header with Today&apos;s Pulse, the What Needs Attention section, completeness scorecard pills, department cards, per-person time allocation bars, and color-coded highlight badges. Your browser&apos;s print-to-PDF saves it as a file.
              </p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-slate-600" />
                <h3 className="font-semibold text-slate-800">Email Report</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                When you generate a summary, OrgRise AI automatically emails it to the workspace owner. The email uses the same structured data as the PDF — same sections, same highlights, same attention items — formatted as a table-based HTML email that renders cleanly in Gmail, Apple Mail, and Outlook.
              </p>
            </div>
          </div>
          <Callout type="tip">
            Both the PDF and email are rendered from the same structured data, so they always match. Old summaries generated before the premium redesign fall back to the original markdown format automatically.
          </Callout>
        </section>

        {/* ── EXECUTIVE TIER ── */}
        <section>
          <SectionHeader id="executive-tier" icon={Shield} title="Executive Tier" subtitle="The view from the top — executives who oversee, not report." />
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Executive Tier is designed for C-suite or senior leaders who need to <em>see</em> the organization but don&apos;t submit daily reports themselves. There are two tiers:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
              <p className="font-bold text-violet-800 mb-1">Tier 1 — Executive</p>
              <p className="text-sm text-violet-700 leading-relaxed">Oversees the full organization or selected departments. Does not submit a daily report. Appears at the top of the org chart above all departments.</p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="font-bold text-indigo-800 mb-1">Tier 2 — Senior Executive</p>
              <p className="text-sm text-indigo-700 leading-relaxed">A second executive level. Appears above Tier 1. Useful for CEOs, board members, or holding company executives who oversee multiple workspaces.</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            When you assign an Executive Tier to a person, their <strong>Include In Reporting</strong> toggle is automatically turned off and the reporting schedule is greyed out. They won&apos;t appear in the completeness scorecard as a missing submission. Their node in the org chart sits above the department columns with lines connecting to each department they oversee.
          </p>
          <Callout type="info">
            To assign an executive tier: go to People, open the person&apos;s profile, and select Tier 1 or Tier 2 from the Executive Tier section. Choose which departments they oversee using the department selector that appears.
          </Callout>
        </section>

        {/* ── ALERTS ── */}
        <section>
          <SectionHeader id="alerts" icon={Bell} title="Alerts" subtitle="Automated flags for patterns your team might miss." />
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            OrgRise AI automatically generates alerts when it detects patterns that require attention. Alerts appear in the Alerts section of the sidebar and as a banner on your dashboard.
          </p>
          <div className="space-y-3 mb-4">
            {[
              { type: "🔴 Critical", desc: "A person has been missing for multiple consecutive days, or a task has been stuck at the same status across several reports." },
              { type: "⚠️ At Risk", desc: "A project is behind its expected progress rate, or a team member's hours have dropped significantly." },
              { type: "ℹ️ Info", desc: "Informational flags — first submission from a new team member, a department with no activity, or a summary that was generated." },
            ].map((item) => (
              <div key={item.type} className="flex gap-3 p-3 rounded-lg border border-slate-100">
                <span className="text-sm flex-shrink-0 mt-0.5">{item.type.split(" ")[0]}</span>
                <div>
                  <span className="font-semibold text-sm text-slate-800">{item.type.split(" ").slice(1).join(" ")} — </span>
                  <span className="text-sm text-slate-600">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Open an alert to mark it as read. Alerts are also passed to the AI as context when generating the next executive summary, so the AI is aware of existing issues and can reference them in the summary.
          </p>
        </section>

        {/* ── SETTINGS ── */}
        <section>
          <SectionHeader id="settings" icon={Settings} title="Settings" subtitle="Configure every aspect of your workspace." />
          <div className="space-y-4">
            {[
              {
                title: "General",
                icon: Settings,
                items: [
                  "Workspace Name — the name shown in the sidebar and on all reports.",
                  "Description — an optional short description of what this workspace is for.",
                ],
              },
              {
                title: "Accent Color",
                icon: Settings,
                items: [
                  "Choose from 8 preset colors. The accent color appears throughout the dashboard, on stat cards, and in the getting started banner.",
                ],
              },
              {
                title: "Report Collection Schedule",
                icon: Clock,
                items: [
                  "Time — when the daily collection reminder runs (e.g., 6:00 PM). This is when cron-based notifications would fire.",
                  "Days — every day, weekdays only, weekends only, or pick specific days.",
                  "Timezone — all schedule logic is evaluated in this timezone.",
                ],
              },
              {
                title: "AI Configuration",
                icon: Key,
                items: [
                  "Anthropic API Key — required for AI processing. Your key is used for all Claude API calls in this workspace.",
                  "Summary Detail Level — choose Snapshot, Brief, Standard, Detailed, or Full Intelligence. See the Detail Levels section above.",
                ],
              },
              {
                title: "Department Report Ordering",
                icon: Building2,
                items: [
                  "Manual — drag departments to control the order they appear in the executive summary.",
                  "AI Determined — the AI leads with the most urgent departments (those with risks, missing reports, or blockers).",
                  "Biweekly Cycle Reference Date — set the Monday of Week A for people on biweekly schedules.",
                ],
              },
              {
                title: "Report Collection",
                icon: FileText,
                items: [
                  "Everyone — all active team members are included in the completeness scorecard and executive summary.",
                  "Leads only — only people marked as leads (Level 1 or 2) submit reports. Everyone else is excluded.",
                ],
              },
              {
                title: "Submission Methods",
                icon: Link2,
                items: [
                  "Unique link — personal URL for each person, no login required. Recommended.",
                  "Email — team members can forward their update to a dedicated inbound email address.",
                  "In-app form — fill out a form directly in the browser after clicking the submission link.",
                ],
              },
            ].map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-3.5 w-3.5 text-violet-500" />
                    <p className="font-semibold text-slate-800 text-sm">{group.title}</p>
                  </div>
                  <ul className="space-y-1">
                    {group.items.map((item, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                        <span className="text-violet-400 flex-shrink-0 mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── TIPS ── */}
        <section>
          <SectionHeader id="tips" icon={CheckCircle} title="Tips & Best Practices" subtitle="Get the most out of OrgRise AI." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "📅", title: "Generate at the same time every day", desc: "Set your generation schedule to right after your team's submission deadline — e.g., if everyone submits by 5 PM, generate at 5:30 PM so it's ready for your end-of-day review or morning read." },
              { icon: "⚡", title: "Use Snapshot for quick checks", desc: "Keep your default detail level at Standard, but switch to Snapshot when you just need a fast morning status check. You can always re-generate at a different level." },
              { icon: "🏥", title: "Turn off Include In Reporting for on-leave staff", desc: "When someone is on vacation or leave, toggle off Include In Reporting. They'll disappear from the completeness scorecard so you don't see them flagged as missing every day." },
              { icon: "📊", title: "Use AI Determined ordering when you have alerts", desc: "Switch to AI Determined department ordering on days when there are open alerts or known issues. The AI will surface the most urgent departments first." },
              { icon: "🔖", title: "Encourage natural language reports", desc: "Team members don't need special formatting. OrgRise AI reads natural language well. A report that says \"I spent the morning on the Henderson proposal, got to 60%, still waiting on legal\" produces excellent structured output." },
              { icon: "🧠", title: "Use Full Intelligence for quarterly reviews", desc: "Level 5 captures every data point from every report. It's ideal when you need a comprehensive record — for board prep, performance reviews, or audits." },
              { icon: "📬", title: "Check the email every morning", desc: "The summary email is sent automatically when a summary is generated. Set it up as your morning briefing — it's designed to give you everything you need before your first meeting." },
              { icon: "🚨", title: "Act on the Attention section fast", desc: "The What Needs Attention Today section was designed to be the first thing you read. If something's in that section, it genuinely needs your attention before your day gets away from you." },
            ].map((tip) => (
              <div key={tip.title} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xl flex-shrink-0">{tip.icon}</span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm mb-1">{tip.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl text-white text-center">
            <p className="font-bold text-lg mb-2">You&apos;re all set.</p>
            <p className="text-violet-200 text-sm mb-4">Go back to your dashboard and generate your first executive summary.</p>
            <Link
              href={`/w/${orgId}/dashboard`}
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-violet-50 transition-colors"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
