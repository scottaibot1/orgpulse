"use client";

import { useState, useEffect, useRef } from "react";
import { GripVertical, Check } from "lucide-react";

interface Dept {
  id: string;
  name: string;
  reportOrder: number;
  reportPriority: number;
}

interface Props {
  orgId: string;
  accentColor?: string;
}

export default function DepartmentOrderingWidget({ orgId, accentColor = "#6366f1" }: Props) {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragIdx = useRef<number | null>(null);

  useEffect(() => {
    fetch(`/api/w/${orgId}/departments`)
      .then((r) => r.json())
      .then((data: Dept[]) => {
        const sorted = [...data].sort((a, b) => a.reportOrder - b.reportOrder || a.name.localeCompare(b.name));
        setDepts(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orgId]);

  function onDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const next = [...depts];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, moved);
    dragIdx.current = idx;
    setDepts(next);
  }

  function onDragEnd() {
    dragIdx.current = null;
  }

  async function saveOrder() {
    setSaving(true);
    const orders = depts.map((d, i) => ({ id: d.id, reportOrder: i + 1 }));
    const res = await fetch(`/api/w/${orgId}/departments/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400 py-2">Loading departments…</p>;
  }

  if (depts.length === 0) {
    return <p className="text-sm text-slate-400 py-2">No departments found.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Drag rows to set the order departments appear in executive summaries.</p>
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
        {depts.map((dept, idx) => (
          <div
            key={dept.id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={onDragEnd}
            className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 cursor-grab active:cursor-grabbing select-none"
          >
            <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-400 w-5 flex-shrink-0">{idx + 1}</span>
            <span className="text-sm font-medium text-slate-800 flex-1">{dept.name}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={saveOrder}
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: accentColor }}
      >
        {saved ? (
          <><Check className="h-4 w-4" /> Saved</>
        ) : saving ? "Saving…" : "Save Order"}
      </button>
    </div>
  );
}
