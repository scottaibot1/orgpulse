"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SetupPage() {
  const [form, setForm] = useState({
    orgName: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Setup failed. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">OrgPulse AI</h1>
          <p className="text-gray-500 mt-2">Set up your organization to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Initial Setup</CardTitle>
            <CardDescription>
              This runs once. You will be the admin for your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  name="orgName"
                  placeholder="Acme Corp"
                  value={form.orgName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminName">Your Name</Label>
                <Input
                  id="adminName"
                  name="adminName"
                  placeholder="Jane Smith"
                  value={form.adminName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Your Email</Label>
                <Input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.adminEmail}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Create Password</Label>
                <Input
                  id="adminPassword"
                  name="adminPassword"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={form.adminPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Setting up..." : "Create Organization"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
