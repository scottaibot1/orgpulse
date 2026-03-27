"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink, Search } from "lucide-react";
import type { User, Department, DepartmentMember } from "@/types";

type PersonWithDept = User & {
  departmentMemberships: (DepartmentMember & { department: Department })[];
};

interface Props {
  people: PersonWithDept[];
}

export default function SubmissionLinksClient({ people }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function getLink(token: string) {
    return `${baseUrl}/submit/${token}`;
  }

  function copyLink(token: string, id: string) {
    navigator.clipboard.writeText(getLink(token));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyAll() {
    const text = filtered
      .map((p) => `${p.name}: ${getLink(p.submissionToken)}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = people.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search people..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={copyAll}>
          {copied === "all" ? (
            <><Check className="h-4 w-4 mr-2 text-green-600" />Copied all!</>
          ) : (
            <><Copy className="h-4 w-4 mr-2" />Copy all links</>
          )}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((person) => {
          const link = getLink(person.submissionToken);
          const dept = person.departmentMemberships[0]?.department;
          const isCopied = copied === person.id;

          return (
            <Card key={person.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{person.name}</p>
                      <p className="text-xs text-gray-500">{person.email}</p>
                      {dept && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {dept.name}
                        </Badge>
                      )}
                    </div>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: dept?.color ? `${dept.color}20` : "#f3f4f6" }}
                    >
                      <span style={{ color: dept?.color ?? "#6b7280" }}>
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2.5 py-1.5">
                    <span className="text-xs text-gray-500 truncate flex-1 font-mono">
                      /submit/{person.submissionToken.slice(0, 16)}…
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => copyLink(person.submissionToken, person.id)}
                    >
                      {isCopied ? (
                        <><Check className="h-3.5 w-3.5 mr-1 text-green-600" />Copied!</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5 mr-1" />Copy Link</>
                      )}
                    </Button>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open link"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No people match &ldquo;{search}&rdquo;
        </div>
      )}
    </div>
  );
}
