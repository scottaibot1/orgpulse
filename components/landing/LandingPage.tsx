"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const BRAND = "#6366f1";
const BRAND_DARK = "#4f46e5";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">
      <style>{`
        html { scroll-behavior: smooth; }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes flowDash {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -26; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50%       { opacity: 0.7; transform: scale(1.2) rotate(15deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 6px #6366f140); }
          50%       { filter: drop-shadow(0 0 18px #6366f180); }
        }

        .hero-doc   { animation: fadeInDown 0.6s ease both; }
        .hero-doc:nth-child(1) { animation-delay: 0.05s; }
        .hero-doc:nth-child(2) { animation-delay: 0.15s; }
        .hero-doc:nth-child(3) { animation-delay: 0.25s; }
        .hero-doc:nth-child(4) { animation-delay: 0.35s; }
        .hero-doc:nth-child(5) { animation-delay: 0.45s; }

        .hero-flow  { stroke-dasharray: 8 5; animation: flowDash 1.8s linear infinite; }
        .hero-flow:nth-child(2) { animation-delay: 0.36s; }
        .hero-flow:nth-child(3) { animation-delay: 0.72s; }
        .hero-flow:nth-child(4) { animation-delay: 1.08s; }
        .hero-flow:nth-child(5) { animation-delay: 1.44s; }

        .hero-sparkle { animation: sparkle 2.5s ease-in-out infinite; transform-origin: 240px 180px; }
        .hero-org     { animation: fadeIn 0.8s ease 0.8s both; }
        .hero-summary { animation: fadeInUp 0.8s ease 1.0s both, pulseGlow 3s ease-in-out 2s infinite; }
        .hero-chat    { animation: fadeInUp 0.8s ease 1.2s both; }

        .hero-text-in { opacity: 0; animation: fadeInUp 0.7s ease forwards; }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur shadow-sm border-b border-slate-100" : "bg-transparent"
      }`}>
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: BRAND }}>O</div>
            <span className="font-bold text-lg text-slate-900">OrgRise</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {["How It Works", "Features", "Pricing"].map((label) => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Login</Link>
            <Link href="/login"
              className="text-sm font-semibold text-white px-4 py-2.5 rounded-lg transition-all hover:opacity-90 shadow-sm"
              style={{ background: BRAND }}>
              Get Started
            </Link>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <Link href="/login"
              className="text-xs font-semibold text-white px-3 py-2.5 rounded-lg min-h-[44px] flex items-center"
              style={{ background: BRAND }}>
              Get Started
            </Link>
            <button onClick={() => setMenuOpen((v) => !v)}
              className="p-2.5 text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Menu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-5 py-4 space-y-1">
            {["How It Works", "Features", "Pricing"].map((label) => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, "-")}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center text-sm font-medium text-slate-700 py-3 border-b border-slate-50 min-h-[44px]">
                {label}
              </a>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)}
              className="flex items-center text-sm font-medium text-slate-700 py-3 min-h-[44px]">
              Login
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="pt-20 md:pt-28 pb-16 md:pb-20 px-5 max-w-6xl mx-auto min-h-[600px] flex items-center">
        {/* Mobile: illustration first (flex-col), Desktop: text left / illustration right (flex-row) */}
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full">

          {/* Illustration — top on mobile, right on desktop */}
          <div className="w-full md:hidden" style={{ height: 340 }}>
            <HeroIllustration />
          </div>

          {/* Text — below illustration on mobile, left 55% on desktop */}
          <div className="w-full md:w-[55%] text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 hero-text-in"
              style={{ animationDelay: "0.05s", background: `${BRAND}12`, color: BRAND }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 1l2.39 4.84L18 6.73l-4 3.9.94 5.5L10 13.77 5.06 16.13l.94-5.5-4-3.9 5.61-.89z"/>
              </svg>
              AI-Powered Org Intelligence
            </div>

            <h1 className="font-black leading-[1.1] tracking-tight mb-5"
              style={{ fontSize: "clamp(28px, 5vw, 52px)" }}>
              <span className="hero-text-in block" style={{ animationDelay: "0.15s" }}>Every report.</span>
              <span className="hero-text-in block" style={{ animationDelay: "0.2s" }}>Every person.</span>
              <span className="hero-text-in block" style={{ color: BRAND, animationDelay: "0.28s" }}>One easy-to-read</span>
              <span className="hero-text-in block" style={{ color: BRAND, animationDelay: "0.28s" }}>AI-generated summary</span>
              <span className="hero-text-in block" style={{ animationDelay: "0.35s" }}>— automatically.</span>
            </h1>

            <p className="text-slate-500 leading-relaxed max-w-xl mx-auto md:mx-0 mb-8 hero-text-in"
              style={{ animationDelay: "0.45s", fontSize: "clamp(15px, 2vw, 18px)" }}>
              Your team uploads their reports in any format — PDF, Word, PowerPoint, or Excel — and OrgRise
              automatically reads every single one and delivers one clean AI-generated executive summary to
              your inbox.{" "}
              <span className="text-slate-700 font-semibold">
                No chasing. No compiling. No missed updates.
              </span>{" "}
              Then ask it anything.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start hero-text-in"
              style={{ animationDelay: "0.55s" }}>
              <Link href="/login"
                className="flex items-center justify-center px-7 py-3.5 text-base font-bold text-white rounded-xl shadow-lg hover:shadow-xl hover:opacity-95 transition-all min-h-[52px] w-full sm:w-auto"
                style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
                Get Started Free
              </Link>
              <a href="#how-it-works"
                className="flex items-center justify-center px-7 py-3.5 text-base font-semibold rounded-xl border-2 text-slate-700 hover:border-slate-400 transition-all min-h-[52px] w-full sm:w-auto"
                style={{ borderColor: "#e2e8f0" }}>
                See How It Works
              </a>
            </div>
          </div>

          {/* Illustration — hidden on mobile (shown above), right 45% on desktop */}
          <div className="hidden md:block w-[45%] flex-shrink-0">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section id="how-it-works" className="py-20 md:py-24 px-5" style={{ background: "#f8f9ff" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">How OrgRise Works</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Three simple steps. Zero chasing.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                step: "01",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                title: "Configure Your Organization",
                body: "Build your org chart in minutes. Add departments, people, and set each person's reporting schedule — daily, weekly, or whatever fits your team.",
              },
              {
                step: "02",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Your Team Submits Reports",
                body: "Team members upload their reports in any format — PDF, Word, PowerPoint, or Excel. No new tools, no new habits, no chasing people down.",
              },
              {
                step: "03",
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "AI Does the Rest",
                body: "At your scheduled time OrgRise reads every report, identifies priorities and risks, and delivers one clean executive summary to your inbox — even if someone forgot to submit.",
              },
            ].map((item, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="text-6xl font-black mb-4 leading-none" style={{ color: `${BRAND}18` }}>{item.step}</div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white" style={{ background: BRAND }}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.body}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-5 -translate-y-1/2 z-10">
                    <svg width="10" height="20" viewBox="0 0 10 20" fill="none">
                      <path d="M1 10h8M5 6l4 4-4 4" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section id="features" className="py-20 md:py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Everything You Need to Stay Informed</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">Purpose-built for leaders who need the full picture without the overhead.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Chatbot card FIRST */}
            {[
              {
                icon: "💬",
                title: "Ask Anything About Your Organization",
                body: "Not sure what Alan worked on this week? Wondering which projects are behind schedule? Just ask. OrgRise includes a built-in AI assistant that has read every report from your entire team. Ask in plain English or speak directly into your microphone and get an instant answer backed by your actual report data.",
              },
              {
                icon: "🚫",
                title: "Stop Chasing People",
                body: "OrgRise automatically tracks who has submitted and who hasn't. No more reply-all emails asking for updates.",
              },
              {
                icon: "📎",
                title: "Any File Format",
                body: "PDF, Word, PowerPoint, and Excel are all supported. Your team submits reports however they already work.",
              },
              {
                icon: "✨",
                title: "AI-Powered Summaries",
                body: "Claude AI reads every report and synthesizes them into one clear executive briefing tailored to your detail level preference — from high-level to fully granular.",
              },
              {
                icon: "🔄",
                title: "Smart Gap Filling",
                body: "If someone misses a submission, OrgRise uses their last report as a stand-in so your summary is never incomplete and your day is never blocked.",
              },
              {
                icon: "⚡",
                title: "Suggested Actions",
                body: "OrgRise identifies stalled projects and drafts follow-up emails for you to review and send in one click. No more wondering who to follow up with.",
              },
              {
                icon: "⚙️",
                title: "Fully Configurable",
                body: "Set reporting schedules per person, control detail levels, prioritize departments, and customize everything to match how your organization actually works.",
              },
            ].map((f, i) => (
              <div key={i} className="group flex gap-5 p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all">
                <div className="text-3xl flex-shrink-0 mt-0.5">{f.icon}</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1.5">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHATBOT DEMO BANNER ──────────────────────────── */}
      <section className="px-5 pb-0" style={{ background: "#0f172a" }}>
        <div className="max-w-6xl mx-auto py-16 md:py-20">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
            {/* Left: heading + description */}
            <div className="w-full md:w-[40%] flex-shrink-0">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
                style={{ background: `${BRAND}30`, color: "#a5b4fc" }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 1l2.39 4.84L18 6.73l-4 3.9.94 5.5L10 13.77 5.06 16.13l.94-5.5-4-3.9 5.61-.89z"/>
                </svg>
                AI Chat Assistant
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-5 leading-tight">
                Your reports. Your data. Instantly searchable.
              </h2>
              <p className="text-slate-400 leading-relaxed text-base md:text-lg">
                What did the sales team accomplish this week? Who flagged a blocker? Which project is falling
                behind? OrgRise knows — because it has read every report from every person in your
                organization. Just ask.
              </p>
            </div>

            {/* Right: mock chat */}
            <div className="w-full md:w-[60%]">
              <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-2xl" style={{ background: "#1e293b" }}>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700" style={{ background: "#0f172a" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: BRAND }}>O</div>
                  <div>
                    <p className="text-xs font-semibold text-white">OrgRise AI</p>
                    <p className="text-[10px] text-emerald-400">● Online — connected to your reports</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
                  {/* Exchange 1 */}
                  <UserBubble text="What did Alan work on yesterday?" />
                  <AiBubble text="Alan submitted his report at 4:47 PM. He spent 3 hours on the Henderson proposal (currently at 60% complete), 2 hours on client calls with Meridian, and flagged a potential delay on the Q2 deliverable pending legal approval." />

                  {/* Exchange 2 */}
                  <UserBubble text="Which projects are behind schedule?" />
                  <AiBubble text="Three projects have risk flags this week. Henderson Proposal has been at 60% for 4 consecutive days. Meridian onboarding is missing Sarah's report from yesterday. Q2 Campaign Launch was flagged at risk by two team members." />

                  {/* Exchange 3 */}
                  <UserBubble text="Who had the best week?" />
                  <AiBubble text="Bella had a standout week. She completed 47 travel adviser outreach calls, closed 3 new reservations totaling $12,400, and her report shows all projects on track with no flags." />
                </div>

                {/* Input bar */}
                <div className="px-4 py-3 border-t border-slate-700 flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-slate-500"
                    style={{ background: "#0f172a", border: "1px solid #334155" }}>
                    <span className="flex-1">Ask about your reports…</span>
                    <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <button className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: BRAND }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 text-center mt-3">Demo only — responses based on actual submitted report data</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ────────────────────────────────── */}
      <section className="py-20 md:py-24 px-5" style={{ background: "#f8f9ff" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Trusted by Operations Teams</h2>
            <p className="text-slate-500 text-lg">Early access customers are seeing results.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { initials: "JM", name: "J. Morrison", role: "VP of Operations" },
              { initials: "SR", name: "S. Reynolds", role: "Chief of Staff" },
              { initials: "TK", name: "T. Kim", role: "Director of Engineering" },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative">
                <div className="absolute top-4 right-4 text-xs font-semibold px-2 py-1 rounded-full text-slate-400 border border-slate-200">Coming Soon</div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: BRAND }}>{t.initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[60, 80, 70, 50].map((w, j) => (
                    <div key={j} className="h-2.5 bg-slate-100 rounded-full" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────── */}
      <section id="pricing" className="py-20 md:py-24 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-500 text-lg">No contracts. Cancel anytime.</p>
          </div>
          {/* On desktop: 3 columns with Growth slightly taller via padding/shadow */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-4 md:items-start">
            {[
              {
                name: "Starter",
                price: "$49",
                period: "/month",
                highlight: false,
                badge: null,
                features: ["Up to 10 people", "1 workspace", "Daily AI summaries", "All file formats", "Email delivery"],
              },
              {
                name: "Growth",
                price: "$99",
                period: "/month",
                highlight: true,
                badge: "Most Popular",
                features: ["Up to 30 people", "3 workspaces", "Everything in Starter", "Suggested actions", "Chat interface", "Department priority controls", "Detail level settings"],
              },
              {
                name: "Business",
                price: "$199",
                period: "/month",
                highlight: false,
                badge: null,
                features: ["Up to 100 people", "Unlimited workspaces", "Everything in Growth", "Priority support"],
              },
            ].map((plan) => (
              <div key={plan.name}
                className={`relative rounded-2xl flex flex-col ${
                  plan.highlight
                    ? "border-2 shadow-2xl md:-mt-4 md:pb-4"
                    : "border border-slate-100 shadow-sm"
                }`}
                style={plan.highlight
                  ? { borderColor: BRAND, background: "#fafbff", padding: "2.5rem 2rem" }
                  : { padding: "2rem" }}>
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-4 py-1.5 rounded-full shadow whitespace-nowrap"
                    style={{ background: BRAND }}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: BRAND }} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login"
                  className={`flex items-center justify-center text-center py-3.5 rounded-xl text-sm font-bold transition-all min-h-[48px] w-full ${
                    plan.highlight ? "text-white hover:opacity-90 shadow-sm" : "border-2 text-slate-700 hover:border-slate-400"
                  }`}
                  style={plan.highlight ? { background: BRAND } : { borderColor: "#e2e8f0" }}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────── */}
      <section className="py-16 md:py-20 px-5" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ready to stop chasing?</h2>
          <p className="text-indigo-200 text-lg mb-8">Join operations leaders who run on OrgRise — one summary, every day, automatically.</p>
          <Link href="/login"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-bold rounded-xl bg-white hover:bg-indigo-50 transition-colors shadow-lg min-h-[52px]"
            style={{ color: BRAND }}>
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: BRAND }}>O</div>
                <span className="font-bold text-white text-base">OrgRise</span>
              </div>
              <p className="text-sm text-slate-500 max-w-xs">AI-powered organization intelligence. One summary. Every day. Automatically.</p>
            </div>
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 text-xs text-slate-600">
            © {new Date().getFullYear()} OrgRise. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Chat bubble components ─────────────────────────── */
function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white leading-relaxed"
        style={{ background: BRAND, fontSize: "clamp(12px, 1.5vw, 14px)" }}>
        {text}
      </div>
    </div>
  );
}

function AiBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5" style={{ background: BRAND }}>O</div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-slate-200 leading-relaxed"
        style={{ background: "#334155", fontSize: "clamp(12px, 1.5vw, 14px)" }}>
        {text}
      </div>
    </div>
  );
}

/* ── Hero SVG Illustration ──────────────────────────── */
function HeroIllustration() {
  // 5 doc positions spread across 460px (within 480 viewBox)
  const docs = [
    { cx: 52,  initials: "JD", label: "PDF", bg: "#fee2e2", stroke: "#fca5a5", tabFill: "#fca5a5", textColor: "#dc2626" },
    { cx: 130, initials: "MR", label: "DOC", bg: "#dbeafe", stroke: "#93c5fd", tabFill: "#93c5fd", textColor: "#2563eb" },
    { cx: 210, initials: "AS", label: "PPT", bg: "#ffedd5", stroke: "#fdba74", tabFill: "#fdba74", textColor: "#ea580c" },
    { cx: 290, initials: "TK", label: "XLS", bg: "#d1fae5", stroke: "#6ee7b7", tabFill: "#6ee7b7", textColor: "#059669" },
    { cx: 368, initials: "LS", label: "DOC", bg: "#f1f5f9", stroke: "#cbd5e1", tabFill: "#cbd5e1", textColor: "#64748b" },
  ];

  const sparkleY = 185;
  // 4 depts, width=56 each, centers at 70, 166, 262, 358
  const depts = [
    { x: 42,  label: "Sales"    },
    { x: 138, label: "Mktg"     },
    { x: 234, label: "Ops"      },
    { x: 330, label: "Finance"  },
  ];

  return (
    <svg
      viewBox="0 0 480 480"
      className="w-full"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {/* Background card */}
      <rect x="8" y="4" width="464" height="472" rx="20" fill="#f8f9ff" />
      <rect x="8" y="4" width="464" height="472" rx="20" fill="none" stroke="#e0e7ff" strokeWidth="1.5" />

      {/* ── TOP DOCS ── */}
      {docs.map((d, i) => (
        <g key={i} className="hero-doc">
          {/* Avatar */}
          <circle cx={d.cx} cy={42} r={15} fill={d.bg} />
          <text x={d.cx} y={47} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={d.textColor}>{d.initials}</text>
          {/* Doc body */}
          <rect x={d.cx - 18} y={64} width={36} height={44} rx={5} fill={d.bg} stroke={d.stroke} strokeWidth="1" />
          {/* Tab corner */}
          <rect x={d.cx - 9} y={58} width={18} height={11} rx={3} fill={d.tabFill} />
          {/* Label */}
          <text x={d.cx} y={92} textAnchor="middle" fontSize="8" fontWeight="800" fill={d.textColor}>{d.label}</text>
        </g>
      ))}

      {/* ── FLOW LINES: docs → sparkle (continuous loop) ── */}
      {docs.map((d, i) => (
        <path
          key={i}
          className="hero-flow"
          d={`M${d.cx} 110 C${d.cx} 148 240 162 240 ${sparkleY - 8}`}
          fill="none"
          stroke="#a5b4fc"
          strokeWidth="1.5"
          opacity="0.65"
          style={{ animationDelay: `${i * 0.36}s` }}
        />
      ))}

      {/* ── AI SPARKLE ── */}
      <g className="hero-sparkle">
        <circle cx={240} cy={sparkleY} r={20} fill={BRAND} opacity="0.12" />
        <circle cx={240} cy={sparkleY} r={13} fill={BRAND} />
        <g transform={`translate(${240 - 6}, ${sparkleY - 6})`} fill="white">
          <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" />
        </g>
      </g>

      {/* ── ORG CHART ── */}
      <g className="hero-org">
        {/* Root node — wider for "Your Organization" */}
        <rect x={183} y={208} width={114} height={26} rx={7} fill={BRAND} />
        <text x={240} y={225} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="white">Your Organization</text>

        {/* Lines root → dept centers (center = x+28) */}
        {depts.map((d) => (
          <line key={d.label} x1={240} y1={234} x2={d.x + 28} y2={253} stroke="#c7d2fe" strokeWidth="1.5" />
        ))}

        {/* Dept nodes (width=56) */}
        {depts.map((d) => (
          <g key={d.label}>
            <rect x={d.x} y={253} width={56} height={22} rx={6} fill="#e0e7ff" stroke="#a5b4fc" strokeWidth="1" />
            <text x={d.x + 28} y={268} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={BRAND}>{d.label}</text>
          </g>
        ))}

        {/* Lines dept → person circles (offset ±16 from center) */}
        {depts.map((d) => (
          [d.x + 12, d.x + 44].map((px) => (
            <line key={`${d.x}-${px}`} x1={d.x + 28} y1={275} x2={px} y2={293} stroke="#e0e7ff" strokeWidth="1.2" />
          ))
        ))}

        {/* Person circles */}
        {[
          { cx: 54,  i: "JD" }, { cx: 86,  i: "MR" },
          { cx: 150, i: "AS" }, { cx: 182, i: "TK" },
          { cx: 246, i: "LS" }, { cx: 278, i: "BW" },
          { cx: 342, i: "KP" }, { cx: 374, i: "NW" },
        ].map((p) => (
          <g key={p.cx}>
            <circle cx={p.cx} cy={303} r={10} fill="#ede9fe" stroke="#a78bfa" strokeWidth="1" />
            <text x={p.cx} y={307} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#7c3aed">{p.i}</text>
          </g>
        ))}
      </g>

      {/* ── FLOW LINES: org → summary (continuous loop) ── */}
      {[
        `M54 313 C54 342 190 356 195 370`,
        `M86 313 C86 342 205 356 208 370`,
        `M150 313 C150 342 215 356 218 370`,
        `M182 313 C182 342 225 356 228 370`,
        `M246 313 C246 342 238 356 238 370`,
        `M278 313 C278 342 250 356 252 370`,
        `M342 313 C342 342 270 356 268 370`,
        `M374 313 C374 342 280 356 278 370`,
      ].map((d, i) => (
        <path
          key={i}
          className="hero-flow"
          d={d}
          fill="none"
          stroke="#a5b4fc"
          strokeWidth="1.3"
          opacity="0.5"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}

      {/* ── EXECUTIVE SUMMARY DOC (large, glowing) ── */}
      <g className="hero-summary">
        {/* Glow */}
        <ellipse cx={235} cy={430} rx={80} ry={9} fill={BRAND} opacity="0.1" />
        {/* Doc body */}
        <rect x={150} y={370} width={165} height={56} rx={12} fill="white" stroke={BRAND} strokeWidth="2" />
        {/* Header bar */}
        <rect x={150} y={370} width={165} height={22} rx={12} fill={BRAND} />
        <rect x={150} y={382} width={165} height={10} fill={BRAND} />
        <text x={231} y={385} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="white">EXECUTIVE SUMMARY</text>
        {/* Content lines */}
        <rect x={162} y={400} width={70} height={4} rx={2} fill="#e0e7ff" />
        <rect x={162} y={408} width={105} height={4} rx={2} fill="#f1f5f9" />
        <rect x={162} y={416} width={85} height={4} rx={2} fill="#f1f5f9" />
        {/* AI sparkle badge */}
        <circle cx={305} cy={379} r={11} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x={305} y={384} textAnchor="middle" fontSize="10">✨</text>
      </g>

      {/* ── CHAT BUBBLE "Ask anything" ── */}
      <g className="hero-chat">
        <rect x={322} y={390} width={110} height={42} rx={10} fill="#1e293b" />
        {/* Pointer left */}
        <path d="M322 406 L312 412 L322 418 Z" fill="#1e293b" />
        <text x={377} y={406} textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8">Ask anything</text>
        {/* Mic icon */}
        <g transform="translate(333, 408)" fill="none" stroke="#6366f1" strokeWidth="1.3">
          <rect x="2" y="0" width="8" height="10" rx="4" />
          <path d="M0 8 C0 13 12 13 12 8" strokeLinecap="round" />
          <line x1="6" y1="13" x2="6" y2="16" strokeLinecap="round" />
        </g>
        <text x={377} y={420} textAnchor="middle" fontSize="8" fill="#64748b">backed by your reports</text>
      </g>

      {/* Arrow org → summary */}
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={BRAND} />
        </marker>
      </defs>
    </svg>
  );
}
