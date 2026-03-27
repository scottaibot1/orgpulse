"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Link, Search, UserCircle } from "lucide-react";
import WorkspacePersonDialog from "./WorkspacePersonDialog";
import type { UserWithDepartments } from "@/types";

interface Props {
  orgId: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  member: "bg-gray-100 text-gray-700",
};

export default function WorkspacePeopleManager({ orgId }: Props) {
  const [people, setPeople] = useState<UserWithDepartments[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<UserWithDepartments | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { fetchPeople(); }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPeople() {
    setLoading(true);
    const res = await fetch(`/api/w/${orgId}/users`);
    const data = await res.json();
    setPeople(data);
    setLoading(false);
  }

  async function deletePerson(id: string, name: string) {
    if (!confirm(`Remove ${name} from the organization? This cannot be undone.`)) return;
    await fetch(`/api/w/${orgId}/users/${id}`, { method: "DELETE" });
    fetchPeople();
  }

  function copySubmissionLink(token: string, id: string) {
    const url = `${window.location.origin}/submit/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = people.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search people..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => { setEditingPerson(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Person
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <UserCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          {people.length === 0 ? (
            <>
              <p className="font-medium">No team members yet</p>
              <p className="text-sm mt-1">Add your first person to get started</p>
              <Button className="mt-4" onClick={() => { setEditingPerson(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </>
          ) : (
            <p>No results for &ldquo;{search}&rdquo;</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Departments</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((person) => (
                <TableRow key={person.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{person.name}</p>
                      {person.title && <p className="text-xs text-gray-500">{person.title}</p>}
                      <p className="text-xs text-gray-400 sm:hidden">{person.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-gray-600">{person.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {person.departmentMemberships.slice(0, 2).map((m) => (
                        <Badge key={m.id} variant="outline" className="text-xs">
                          {m.department.name}{m.isPrimary && " ★"}
                        </Badge>
                      ))}
                      {person.departmentMemberships.length > 2 && (
                        <Badge variant="outline" className="text-xs">+{person.departmentMemberships.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs capitalize ${ROLE_COLORS[person.role]}`}>{person.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0" title="Copy submission link"
                        onClick={() => copySubmissionLink(person.submissionToken, person.id)}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      {copiedId === person.id && <span className="text-xs text-green-600 absolute">Copied!</span>}
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => { setEditingPerson(person); setDialogOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deletePerson(person.id, person.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <WorkspacePersonDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchPeople}
        editing={editingPerson}
        orgId={orgId}
      />
    </div>
  );
}
