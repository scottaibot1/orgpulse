"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronRight, Users } from "lucide-react";
import DepartmentDialog from "./DepartmentDialog";
import type { DepartmentWithMembers } from "@/types";

export default function DepartmentManager() {
  const [departments, setDepartments] = useState<DepartmentWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentWithMembers | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    setLoading(true);
    const res = await fetch("/api/departments");
    const data = await res.json();
    setDepartments(data);
    setLoading(false);
  }

  async function deleteDepartment(id: string) {
    if (!confirm("Archive this department? Members will not be removed.")) return;
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    fetchDepartments();
  }

  function openCreate() {
    setEditingDept(null);
    setDialogOpen(true);
  }

  function openEdit(dept: DepartmentWithMembers) {
    setEditingDept(dept);
    setDialogOpen(true);
  }

  // Build tree: top-level departments (no parent)
  const topLevel = departments.filter((d) => !d.parentDepartmentId);
  const getChildren = (parentId: string) =>
    departments.filter((d) => d.parentDepartmentId === parentId);

  function DeptCard({ dept, depth = 0 }: { dept: DepartmentWithMembers; depth?: number }) {
    const children = getChildren(dept.id);
    return (
      <div>
        <div
          className={`flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors ${depth > 0 ? "ml-6" : ""}`}
          style={dept.color ? { borderLeftColor: dept.color, borderLeftWidth: 4 } : {}}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {dept.color && (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: dept.color }}
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate">{dept.name}</span>
                {children.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {children.length} sub-dept{children.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              {dept.description && (
                <p className="text-sm text-gray-500 truncate mt-0.5">{dept.description}</p>
              )}
              {dept.headUser && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Head: {dept.headUser.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <div className="flex items-center gap-1 text-gray-500 text-sm">
              <Users className="h-4 w-4" />
              <span>{dept.members.length}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(dept)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteDepartment(dept.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {children.length > 0 && (
          <div className="mt-2 space-y-2">
            {children.map((child) => (
              <DeptCard key={child.id} dept={child as DepartmentWithMembers} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {departments.length} department{departments.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ChevronRight className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No departments yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first department to get started</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {topLevel.map((dept) => (
            <DeptCard key={dept.id} dept={dept as DepartmentWithMembers} />
          ))}
        </div>
      )}

      <DepartmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchDepartments}
        editing={editingDept}
        allDepartments={departments}
      />
    </div>
  );
}
