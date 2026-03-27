"use client";

import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { useMemo } from "react";

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

interface Props {
  departments: DeptNode[];
  orgName: string;
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

export default function OrgChartFlow({ departments, orgName, compact = false }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Root org node
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

    // Render ALL departments — sort top-level first so sub-depts can reference parent positions
    const topLevel = departments.filter((d) => !d.parentId);
    const subDepts = departments.filter((d) => !!d.parentId);
    const allDepts = [...topLevel, ...subDepts];

    const DEPT_COL_WIDTH = 320;
    const totalWidth = Math.max(allDepts.length * DEPT_COL_WIDTH, 640);
    const startX = -(totalWidth / 2) + DEPT_COL_WIDTH / 2;

    // Track how tall each dept column is so we can position sub-depts below parents
    const deptBottomY = new Map<string, number>();

    allDepts.forEach((dept, di) => {
      const colorIndex = departments.indexOf(dept);
      const deptColor = dept.color ?? DEPT_PALETTE[colorIndex % DEPT_PALETTE.length];
      const deptX = startX + di * DEPT_COL_WIDTH;
      const deptY = dept.parentId ? 240 : 130;
      const deptNodeId = `dept-${dept.id}`;

      nodes.push({
        id: deptNodeId,
        type: "default",
        position: { x: deptX, y: deptY },
        data: { label: dept.name },
        style: {
          background: `${deptColor}18`,
          color: deptColor,
          border: `2px solid ${deptColor}50`,
          borderRadius: "10px",
          padding: "8px 16px",
          fontWeight: 600,
          fontSize: "12px",
          minWidth: 140,
          textAlign: "center",
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      // Edge: org→dept (top-level) or parent-dept→dept (sub-dept)
      if (!dept.parentId) {
        edges.push({
          id: `e-org-${deptNodeId}`,
          source: "org",
          target: deptNodeId,
          style: { stroke: deptColor, strokeWidth: 2, opacity: 0.5 },
        });
      } else {
        edges.push({
          id: `e-parent-${dept.id}`,
          source: `dept-${dept.parentId}`,
          target: deptNodeId,
          style: { stroke: deptColor, strokeWidth: 1.5, opacity: 0.5, strokeDasharray: "5,3" },
        });
      }

      // Sort people by level ascending (Level 1 = highest authority = top)
      const sortedPeople = [...dept.people].sort((a, b) => {
        if (a.level == null && b.level == null) return 0;
        if (a.level == null) return 1;
        if (b.level == null) return -1;
        return a.level - b.level;
      });

      // Group by level
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

      // Position each person
      let rowIndex = 0;
      const personPositions = new Map<string, { x: number; y: number }>();

      levelGroups.forEach((group) => {
        const colCount = Math.min(group.length, 3);
        group.forEach((person, pi) => {
          const col = pi % colCount;
          const personX = deptX + (col - (colCount - 1) / 2) * 155;
          const personY = deptY + 85 + rowIndex * 98;
          personPositions.set(person.id, { x: personX, y: personY });
        });
        rowIndex += Math.ceil(group.length / 3);
      });

      // Track the bottom of this dept column
      const maxY = deptY + 85 + Math.max(0, rowIndex - 1) * 98 + 70;
      deptBottomY.set(dept.id, maxY);

      // Render person nodes
      sortedPeople.forEach((person) => {
        const pos = personPositions.get(person.id)!;
        const personNodeId = `person-${person.id}`;
        const sc = STATUS_COLORS[person.status];
        const initials = person.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
        const levelLabel = person.levelTitle?.trim()
          ? person.levelTitle.trim()
          : person.level != null
          ? `Level ${person.level}`
          : null;

        nodes.push({
          id: personNodeId,
          type: "default",
          position: pos,
          data: {
            label: (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: deptColor, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {initials}
                  </div>
                  <div style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 8, height: 8, borderRadius: "50%",
                    background: person.isReportingActive ? "#22c55e" : "#94a3b8",
                    border: "1.5px solid #fff",
                  }} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 11, color: "#1e293b" }}>{person.name}</div>
                  {person.title && (
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>{person.title}</div>
                  )}
                  {levelLabel && (
                    <div style={{ fontSize: 9, color: deptColor, marginTop: 1, fontWeight: 600 }}>
                      {levelLabel}
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          style: {
            background: sc.bg,
            border: `1.5px solid ${sc.border}`,
            borderRadius: "10px",
            padding: "6px 10px",
            minWidth: 140,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        // Edge from dept to person only if person has no manager in this dept
        const hasManagerInDept = person.reportsToManagerIds.some((mId) =>
          dept.people.some((p) => p.id === mId)
        );
        if (!hasManagerInDept) {
          edges.push({
            id: `e-${deptNodeId}-${personNodeId}`,
            source: deptNodeId,
            target: personNodeId,
            style: { stroke: `${deptColor}60`, strokeWidth: 1.5 },
          });
        }
      });

      // Reporting relationship edges (manager → subordinate)
      sortedPeople.forEach((person) => {
        const personNodeId = `person-${person.id}`;
        person.reportsToManagerIds.forEach((managerId) => {
          if (dept.people.some((p) => p.id === managerId)) {
            edges.push({
              id: `e-reports-${managerId}-${person.id}-${dept.id}`,
              source: `person-${managerId}`,
              target: personNodeId,
              style: { stroke: deptColor, strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: deptColor },
            });
          }
        });
      });
    });

    return { nodes, edges };
  }, [departments, orgName]);

  const height = compact ? 610 : 700;

  return (
    <div style={{ width: "100%", height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll
        attributionPosition="bottom-right"
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
