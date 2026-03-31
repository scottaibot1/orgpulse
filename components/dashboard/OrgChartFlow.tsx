"use client";

import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface PersonNode {
  id: string;
  name: string;
  title: string | null;
  level: number | null;
  levelTitle: string | null;
  status: "submitted" | "missing" | "flagged";
  reportsToManagerIds: string[];
  isReportingActive: boolean;
}

interface DeptNode {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  people: PersonNode[];
}

interface ExecutiveNode {
  id: string;
  name: string;
  title: string | null;
  tier: 1 | 2;
  departmentIds: string[];
  status: "submitted" | "missing" | "flagged";
}

interface Props {
  departments: DeptNode[];
  executives?: ExecutiveNode[];
  orgName: string;
  orgId: string;
  compact?: boolean;
}

const STATUS_COLORS = {
  submitted: { bg: "#d1fae5", border: "#34d399" },
  flagged:   { bg: "#fef3c7", border: "#fbbf24" },
  missing:   { bg: "#fee2e2", border: "#f87171" },
};

const DEPT_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#f97316", "#84cc16",
];

const EXEC_TIER_COLORS = {
  1: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
  2: { bg: "#fde8d8", border: "#fb923c", text: "#7c2d12", gradient: "linear-gradient(135deg,#fb923c,#ea580c)" },
};

/** Blend a hex color toward white. factor 0 = original, 1 = white */
function lightenHex(hex: string, factor: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

function ExecutiveCardNode({ data }: NodeProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const tc = EXEC_TIER_COLORS[data.tier as 1 | 2];
  const initials = data.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const sc = STATUS_COLORS[data.status as keyof typeof STATUS_COLORS];

  return (
    <div style={{ position: "relative" }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div
        onClick={() => router.push(data.href)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? tc.bg : "#fff",
          border: `2px solid ${hovered ? tc.border : tc.border + "80"}`,
          borderRadius: 12,
          padding: "8px 14px",
          minWidth: 160,
          boxShadow: hovered ? `0 6px 16px ${tc.border}30` : "0 2px 8px rgba(0,0,0,0.08)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          userSelect: "none",
          transition: "all 0.15s",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: tc.gradient, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800,
            boxShadow: `0 2px 6px ${tc.border}50`,
          }}>
            {initials}
          </div>
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 9, height: 9, borderRadius: "50%",
            background: sc.border,
            border: "1.5px solid #fff",
          }} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a" }}>{data.name}</div>
          {data.title && <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{data.title}</div>}
          <div style={{
            fontSize: 9, fontWeight: 700, color: tc.text,
            background: tc.bg, borderRadius: 4, padding: "1px 5px",
            display: "inline-block", marginTop: 2,
          }}>
            EXEC {data.tier === 1 ? "TIER 1" : "TIER 2"}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

function PersonCardNode({ data }: NodeProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const sc = STATUS_COLORS[data.status as keyof typeof STATUS_COLORS];
  const initials = data.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div
        onClick={() => router.push(data.href)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? sc.border : sc.bg,
          border: `1.5px solid ${sc.border}`,
          borderRadius: 10,
          padding: "6px 10px",
          minWidth: 140,
          boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          userSelect: "none",
          transition: "background 0.15s, box-shadow 0.15s",
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: data.deptColor, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700,
          }}>
            {initials}
          </div>
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 8, height: 8, borderRadius: "50%",
            background: data.isReportingActive ? "#22c55e" : "#94a3b8",
            border: "1.5px solid #fff",
          }} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>{data.name}</div>
          {data.title && <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>{data.title}</div>}
          {data.levelLabel && <div style={{ fontSize: 9, color: data.deptColor, marginTop: 1, fontWeight: 600 }}>{data.levelLabel}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

function DeptCardNode({ data }: NodeProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <div
        onClick={() => router.push(data.href)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? `${data.color}35` : `${data.color}18`,
          color: data.color,
          border: `2px solid ${hovered ? data.color : `${data.color}50`}`,
          borderRadius: 10,
          padding: "8px 16px",
          fontWeight: 600,
          fontSize: 12,
          minWidth: 140,
          textAlign: "center",
          cursor: "pointer",
          userSelect: "none",
          boxShadow: hovered ? `0 4px 12px ${data.color}30` : "none",
          transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
    </div>
  );
}

const nodeTypes = { personCard: PersonCardNode, deptCard: DeptCardNode, execCard: ExecutiveCardNode };

export default function OrgChartFlow({ departments, executives = [], orgName, orgId, compact = false }: Props) {
  const onInit = useCallback((instance: ReactFlowInstance) => {
    setTimeout(() => instance.fitView({ padding: 0.12 }), 50);
  }, []);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const execTier1 = executives.filter((e) => e.tier === 1);
    const execTier2 = executives.filter((e) => e.tier === 2);
    const hasExecs = executives.length > 0;

    // Y offsets — push depts down when exec tiers exist
    const execT1Y = 110;
    const execT2Y = execTier1.length > 0 ? 230 : 110;
    const deptTopY = hasExecs ? (execTier2.length > 0 ? 360 : (execTier1.length > 0 ? 240 : 130)) : 130;
    const deptSubY = deptTopY + 110;

    nodes.push({
      id: "org",
      type: "default",
      position: { x: 0, y: 0 },
      data: { label: orgName },
      style: {
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "#fff",
        border: "none",
        borderRadius: "12px",
        padding: "10px 20px",
        fontWeight: 700,
        fontSize: "14px",
        boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
        minWidth: 180,
        textAlign: "center",
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    const EXEC_COL_WIDTH = 220;
    const DEPT_COL_WIDTH = 320;

    // ── Executive Tier 1 ──
    const t1TotalW = Math.max(execTier1.length * EXEC_COL_WIDTH, EXEC_COL_WIDTH);
    execTier1.forEach((exec, i) => {
      const x = -(t1TotalW / 2) + EXEC_COL_WIDTH / 2 + i * EXEC_COL_WIDTH;
      nodes.push({
        id: `exec-${exec.id}`,
        type: "execCard",
        position: { x, y: execT1Y },
        data: { name: exec.name, title: exec.title, tier: 1, status: exec.status, href: `/w/${orgId}/people/${exec.id}` },
      });
      edges.push({
        id: `e-org-exec1-${exec.id}`,
        source: "org",
        target: `exec-${exec.id}`,
        style: { stroke: "#f59e0b", strokeWidth: 2, opacity: 0.7 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: "#f59e0b" },
      });
    });

    // ── Executive Tier 2 ──
    const t2TotalW = Math.max(execTier2.length * EXEC_COL_WIDTH, EXEC_COL_WIDTH);
    execTier2.forEach((exec, i) => {
      const x = -(t2TotalW / 2) + EXEC_COL_WIDTH / 2 + i * EXEC_COL_WIDTH;
      nodes.push({
        id: `exec-${exec.id}`,
        type: "execCard",
        position: { x, y: execT2Y },
        data: { name: exec.name, title: exec.title, tier: 2, status: exec.status, href: `/w/${orgId}/people/${exec.id}` },
      });
      // Connect T2 → T1 (evenly distributed), or → Org if no T1
      if (execTier1.length > 0) {
        execTier1.forEach((t1) => {
          edges.push({
            id: `e-exec1-exec2-${t1.id}-${exec.id}`,
            source: `exec-${t1.id}`,
            target: `exec-${exec.id}`,
            style: { stroke: "#fb923c", strokeWidth: 1.5, opacity: 0.6 },
          });
        });
      } else {
        edges.push({
          id: `e-org-exec2-${exec.id}`,
          source: "org",
          target: `exec-${exec.id}`,
          style: { stroke: "#fb923c", strokeWidth: 2, opacity: 0.7 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: "#fb923c" },
        });
      }
    });

    // ── Departments ──
    const topLevel = departments.filter((d) => !d.parentId);
    const subDepts = departments.filter((d) => !!d.parentId);
    const allDepts = [...topLevel, ...subDepts];

    // Build base colors
    const deptBaseColor = new Map<string, string>();
    topLevel.forEach((dept, di) => {
      deptBaseColor.set(dept.id, dept.color ?? DEPT_PALETTE[di % DEPT_PALETTE.length]);
    });
    subDepts.forEach((dept) => {
      const parentColor = deptBaseColor.get(dept.parentId!) ?? DEPT_PALETTE[0];
      deptBaseColor.set(dept.id, dept.color ? lightenHex(parentColor, 0.25) : lightenHex(parentColor, 0.3));
    });

    const totalDeptWidth = Math.max(allDepts.length * DEPT_COL_WIDTH, 640);
    const startX = -(totalDeptWidth / 2) + DEPT_COL_WIDTH / 2;

    allDepts.forEach((dept, di) => {
      const deptColor = deptBaseColor.get(dept.id) ?? DEPT_PALETTE[0];
      const personAvatarColor = lightenHex(deptColor, 0.15);
      const deptX = startX + di * DEPT_COL_WIDTH;
      const deptY = dept.parentId ? deptSubY : deptTopY;
      const deptNodeId = `dept-${dept.id}`;

      nodes.push({
        id: deptNodeId,
        type: "deptCard",
        position: { x: deptX, y: deptY },
        data: { label: dept.name, color: deptColor, href: `/w/${orgId}/org/${dept.id}` },
      });

      // Connect dept to its overseeing executives, or to org if none
      if (dept.parentId) {
        // Sub-depts always connect to parent dept
        edges.push({
          id: `e-parent-${dept.id}`,
          source: `dept-${dept.parentId}`,
          target: deptNodeId,
          style: { stroke: deptColor, strokeWidth: 1.5, opacity: 0.5, strokeDasharray: "5,3" },
        });
      } else {
        // Find executives that oversee this department
        const overseeingExecs = executives.filter((e) => e.departmentIds.includes(dept.id));
        if (overseeingExecs.length > 0) {
          // Connect to the highest tier exec that oversees this dept
          const t2Overseers = overseeingExecs.filter((e) => e.tier === 2);
          const t1Overseers = overseeingExecs.filter((e) => e.tier === 1);
          const connectors = t2Overseers.length > 0 ? t2Overseers : t1Overseers;
          connectors.forEach((exec) => {
            edges.push({
              id: `e-exec-${exec.id}-${deptNodeId}`,
              source: `exec-${exec.id}`,
              target: deptNodeId,
              style: { stroke: deptColor, strokeWidth: 1.5, opacity: 0.6 },
            });
          });
        } else {
          // No executive oversees this dept — connect to org
          edges.push({
            id: `e-org-${deptNodeId}`,
            source: "org",
            target: deptNodeId,
            style: { stroke: deptColor, strokeWidth: 2, opacity: 0.6 },
          });
        }
      }

      // People within department
      const sortedPeople = [...dept.people].sort((a, b) => {
        if (a.level == null && b.level == null) return 0;
        if (a.level == null) return 1;
        if (b.level == null) return -1;
        return a.level - b.level;
      });

      const levelGroups: PersonNode[][] = [];
      const levelSeen = new Map<number | null, number>();
      sortedPeople.forEach((p) => {
        const key = p.level;
        if (!levelSeen.has(key)) {
          levelSeen.set(key, levelGroups.length);
          levelGroups.push([]);
        }
        levelGroups[levelSeen.get(key)!].push(p);
      });

      let rowIndex = 0;
      const personPositions = new Map<string, { x: number; y: number }>();
      levelGroups.forEach((group) => {
        const colCount = Math.min(group.length, 3);
        group.forEach((person, pi) => {
          const col = pi % colCount;
          personPositions.set(person.id, {
            x: deptX + (col - (colCount - 1) / 2) * 155,
            y: deptY + 85 + rowIndex * 98,
          });
        });
        rowIndex += Math.ceil(group.length / 3);
      });

      sortedPeople.forEach((person) => {
        const pos = personPositions.get(person.id)!;
        const personNodeId = `person-${person.id}`;
        const levelLabel = person.levelTitle?.trim()
          ? person.levelTitle.trim()
          : person.level != null ? `Level ${person.level}` : null;

        nodes.push({
          id: personNodeId,
          type: "personCard",
          position: pos,
          data: {
            name: person.name, title: person.title, status: person.status,
            isReportingActive: person.isReportingActive, deptColor: personAvatarColor,
            levelLabel, href: `/w/${orgId}/people/${person.id}`,
          },
        });

        const hasManagerInDept = person.reportsToManagerIds.some((mId) =>
          dept.people.some((p) => p.id === mId)
        );
        if (!hasManagerInDept) {
          edges.push({
            id: `e-${deptNodeId}-${personNodeId}`,
            source: deptNodeId, target: personNodeId,
            style: { stroke: `${deptColor}80`, strokeWidth: 1.5 },
          });
        }
      });

      sortedPeople.forEach((person) => {
        person.reportsToManagerIds.forEach((managerId) => {
          if (dept.people.some((p) => p.id === managerId)) {
            edges.push({
              id: `e-reports-${managerId}-${person.id}-${dept.id}`,
              source: `person-${managerId}`, target: `person-${person.id}`,
              style: { stroke: deptColor, strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: deptColor },
            });
          }
        });
      });
    });

    return { nodes, edges };
  }, [departments, executives, orgName, orgId]);

  const height = compact ? 480 : 910;

  return (
    <div style={{ width: "100%", height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        onInit={onInit}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        panOnDrag
        preventScrolling={false}
        attributionPosition="bottom-right"
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
