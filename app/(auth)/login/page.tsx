"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/workspaces");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[#0f172a] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">OrgRise AI</span>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-violet-300 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            AI-Powered Platform
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            One view for your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
              entire organization
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Collect daily reports, track tasks automatically, and get AI-generated insights — without the noise.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Reports analyzed", value: "Daily" },
            { label: "Setup time", value: "< 5 min" },
            { label: "AI-powered", value: "100%" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-lg">OrgRise AI</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-1 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="py-3">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium shadow-sm"
              disabled={loading}
            >
              {loading ? "Signing in..." : (
                <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
