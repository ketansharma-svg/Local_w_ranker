"use client"
import { Button, Modal } from "antd";
import React, { useMemo, useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CheckCircle, ChevronDown, Download } from "lucide-react";


/** =======================
 *  TOKENS (inline, tweak as needed)
 *  ======================= */
const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  good: "#10B981",
  info: "#3B82F6",
  warning: "#F59E0B",
  critical: "#EF4444",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  surface: "#FFFFFF",
  hover: "#F5F7FA",
  tooltipBg: "#282829",
  tooltipText: "#F9FAFB",
  shadow: "0 8px 24px rgba(17,24,39,0.12)"
};

/** =======================
 *  TYPES (align with your spec)
 *  ======================= */
export type DashboardKey = "seo" | "content" | "taskboard" | "reporting";
export type CapabilityLevel = "full" | "edit" | "view" | "none";
export type RoleKey = "owner" | "admin" | "editor" | "viewer";

export type RoleMatrixCell = {
  dashboard: DashboardKey;
  capability: CapabilityLevel;
  policy_locked?: boolean;
  note?: string; // lock reason (e.g., "Disabled by org policy")
};

export type RoleMatrix = Record<RoleKey, RoleMatrixCell[]>;

export type RoleDefinition = {
  key: RoleKey;
  title: string;
  description: string[];
};

export type RolesConfigModalVM = {
  matrix: RoleMatrix;
  definitions: RoleDefinition[];
  feature_flags?: {
    taskboard_viewer_enabled?: boolean; // affects descriptions only; matrix is baseline
  };
  org_overrides?: Array<{ role: RoleKey; dashboard: DashboardKey; note: string }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  vm?: RolesConfigModalVM;
  onExportCSV?: (csv: string) => void;
  onLearnMore?: () => void;
  title?: string;
  subtext?: string;
};

/** =======================
 *  DEFAULT DATA (Phase‑1 baseline)
 *  ======================= */
const defaultMatrix: RoleMatrix = {
  owner: [
    { dashboard: "seo", capability: "full" },
    { dashboard: "content", capability: "full" },
    { dashboard: "taskboard", capability: "full" },
    { dashboard: "reporting", capability: "full" }
  ],
  admin: [
    { dashboard: "seo", capability: "full" },
    { dashboard: "content", capability: "full" },
    { dashboard: "taskboard", capability: "full" },
    { dashboard: "reporting", capability: "full" }
  ],
  editor: [
    { dashboard: "seo", capability: "edit" },
    { dashboard: "content", capability: "edit" },
    { dashboard: "taskboard", capability: "edit" },
    { dashboard: "reporting", capability: "view" }
  ],
  viewer: [
    { dashboard: "seo", capability: "view" },
    { dashboard: "content", capability: "view" },
    { dashboard: "taskboard", capability: "none" },
    { dashboard: "reporting", capability: "view" }
  ]
};

const defaultDefinitions: RoleDefinition[] = [
  {
    key: "owner",
    title: "Owner",
    description: [
      "Platform creator; cannot be deleted or demoted.",
      "Full access to all dashboards and Settings (branding, users, billing)."
    ]
  },
  {
    key: "admin",
    title: "Admin",
    description: [
      "Full access across assigned dashboards.",
      "Can manage team members, roles, projects within their scope (not the Owner)."
    ]
  },
  {
    key: "editor",
    title: "Editor",
    description: [
      "Can create/edit content, tasks, and campaign assets.",
      "Cannot manage users/roles or platform settings."
    ]
  },
  {
    key: "viewer",
    title: "Viewer",
    description: [
      "Read‑only access (includes downloads/exports where applicable).",
      "Cannot trigger actions or edit anything."
    ]
  }
];

const defaultVM: RolesConfigModalVM = {
  matrix: defaultMatrix,
  definitions: defaultDefinitions,
  feature_flags: {
    taskboard_viewer_enabled: false
  },
  org_overrides: [
    // Example lock (visual only): Viewer×TaskBoard "None" is enforced by policy
    { role: "viewer", dashboard: "taskboard", note: "Viewer on TaskBoard disabled by org policy." }
  ]
};

/** =======================
 *  UTIL: pretty labels / order
 *  ======================= */
const DASHBOARD_ORDER: DashboardKey[] = ["seo", "content", "taskboard", "reporting"];
const ROLE_ORDER: RoleKey[] = ["owner", "admin", "editor", "viewer"];

const dashboardLabel = (d: DashboardKey) =>
  d === "seo"
    ? "SEO"
    : d === "content"
      ? "Content"
      : d === "taskboard"
        ? "TaskBoard"
        : "Reporting";

const capabilityLabel = (c: CapabilityLevel) =>
  c === "full" ? "Full" : c === "edit" ? "Edit" : c === "view" ? "View" : "None";

/** =======================
 *  CSV Export
 *  ======================= */
function matrixToCSV(vm: RolesConfigModalVM): string {
  const { matrix } = vm;
  const header = ["Role", ...DASHBOARD_ORDER.map(dashboardLabel)];
  const rows = ROLE_ORDER.map((role) => {
    const row = [role[0].toUpperCase() + role.slice(1)];
    const cells = matrix[role];
    const cellMap: Record<DashboardKey, RoleMatrixCell | undefined> = {} as any;
    cells.forEach((c) => (cellMap[c.dashboard] = c));
    DASHBOARD_ORDER.forEach((d) => {
      const cell = cellMap[d];
      if (!cell) {
        row.push("");
        return;
      }
      const base = capabilityLabel(cell.capability);
      row.push(cell.policy_locked ? `${base} (locked)` : base);
    });
    return row;
  });
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replaceAll(`"`, `""`)}"`).join(","))
    .join("\n");
  return csv;
}

/** =======================
 *  SIMPLE UI PRIMITIVES (Modal, Button, Tag, Tooltip, Accordion)
 *  — Kept minimal & self‑contained for demo/canvas
 *  ======================= */
const Backdrop: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div
    onClick={onClick}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      zIndex: 999
    }}
    aria-hidden="true"
  />
);

const Tag: React.FC<{
  tone?: "brand" | "good" | "info" | "neutral" | "outline" | "locked";
  title?: string;
  children: React.ReactNode;
}> = ({ tone = "neutral", title, children }) => {
  const styles: Record<string, React.CSSProperties> = {
    brand: { background: TOKENS.valueBlue, color: "#fff" },
    good: { background: TOKENS.good, color: "#fff" },
    info: { background: TOKENS.info, color: "#fff" },
    locked: { background: "#fff", color: TOKENS.muted, border: `1px dashed ${TOKENS.border}` },
    neutral: { background: TOKENS.chipBg, color: TOKENS.text },
    outline: { background: "#fff", color: TOKENS.text, border: `1px solid ${TOKENS.border}` }
  };
  return (
    <span
      title={title}
      style={{
        ...styles[tone],
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 999
      }}
    >
      {children}
    </span>
  );
};

const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactNode }> = ({
  content,
  children
}) => {
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span className="__tip-trigger">{children}</span>
      <span
        className="__tip"
        style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: TOKENS.tooltipBg,
          color: TOKENS.tooltipText,
          padding: "8px 10px",
          fontSize: 12,
          borderRadius: 6,
          whiteSpace: "nowrap",
          boxShadow: TOKENS.shadow,
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity .12s ease",
          zIndex: 2
        }}
      >
        {content}
      </span>
      <style>{`
        .__tip-trigger:hover + .__tip,
        .__tip-trigger:focus + .__tip {
          opacity: 1;
        }
      `}</style>
    </span>
  );
};

const AccordionItem: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen }) => (
  <details style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 8, overflow: "hidden" }} open={defaultOpen}>
    <summary
      style={{
        padding: "12px 14px",
        fontWeight: 500,
        cursor: "pointer",
        background: "#fff",
        listStyle: "none"
      }}
    >
      {title}
    </summary>
    <div style={{ padding: 14, background: "#fff" }}>{children}</div>
  </details>
);

/** =======================
 *  GRID CELL COMPONENT
 *  ======================= */
function capabilityTone(cap: CapabilityLevel): "brand" | "good" | "info" | "neutral" | "outline" {
  switch (cap) {
    case "full":
      return "good"; // or "brand"
    case "edit":
      return "info";
    case "view":
      return "neutral";
    case "none":
    default:
      return "outline";
  }
}

function capabilityEmoji(cap: CapabilityLevel) {
  switch (cap) {
    case "full":
      return "✅";
    case "edit":
      return "✏️";
    case "view":
      return "👁️";
    case "none":
    default:
      return "—";
  }
}

function cellTooltip(role: RoleKey, d: DashboardKey, cap: CapabilityLevel, note?: string) {
  const base =
    cap === "full"
      ? "Create, edit, delete, manage within dashboard scope."
      : cap === "edit"
        ? "Create & edit (limited delete where safe). No team/role changes."
        : cap === "view"
          ? "Read/download/export (where applicable). No edits."
          : "No access. Dashboard hidden.";
  const details = `${role[0].toUpperCase() + role.slice(1)} • ${dashboardLabel(d)} • ${capabilityLabel(cap)}`;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontWeight: 500 }}>{details}</div>
      <div style={{ opacity: 0.9 }}>{base}</div>
      {note ? <div style={{ color: TOKENS.warning, marginTop: 2 }}>🔒 {note}</div> : null}
    </div>
  );
}

/** =======================
 *  MAIN COMPONENT
 *  ======================= */
export const RolesPermissionsConfigModal: React.FC<Props> = ({
  open,
  onClose,
  vm = defaultVM,
  onExportCSV,
  onLearnMore,
  title = "🔐 Roles & Permissions",
  subtext = "Manage what each role can access across different dashboards."
}) => {

    const [accordionOpen, setAccordionOpen] = useState(true);

  // Apply org_overrides (policy locks) visually
  const appliedMatrix: RoleMatrix = useMemo(() => {
    if (!vm.org_overrides?.length) return vm.matrix;
    const clone: RoleMatrix = JSON.parse(JSON.stringify(vm.matrix));
    vm.org_overrides.forEach((ov) => {
      const cells = clone[ov.role];
      const idx = cells.findIndex((c) => c.dashboard === ov.dashboard);
      if (idx >= 0) {
        cells[idx].policy_locked = true;
        cells[idx].note = ov.note;
      }
    });
    return clone;
  }, [vm]);

  // Keyboard navigation between cells
  const gridRef = useRef<HTMLTableElement | null>(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.dataset?.cell) return;
      const [r, c] = (target.dataset.cell || "").split(":").map(Number);
      let nr = r,
        nc = c;
      if (e.key === "ArrowRight") nc = Math.min(c + 1, DASHBOARD_ORDER.length - 1);
      if (e.key === "ArrowLeft") nc = Math.max(c - 1, 0);
      if (e.key === "ArrowDown") nr = Math.min(r + 1, ROLE_ORDER.length - 1);
      if (e.key === "ArrowUp") nr = Math.max(r - 1, 0);
      if (nr !== r || nc !== c) {
        e.preventDefault();
        const next = el.querySelector<HTMLElement>(`[data-cell="${nr}:${nc}"]`);
        next?.focus();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, []);

  const handleExport = () => {
    const csv = matrixToCSV({ ...vm, matrix: appliedMatrix });
    if (onExportCSV) return onExportCSV(csv);
    // fallback download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wranker_roles_matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={800}
      aria-label="Roles & Permissions">

      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${TOKENS.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 500 }}>{title}</div>
            <div style={{ color: TOKENS.muted, fontSize: 13 }}>{subtext}</div>
          </div>
<div style={{ display: "flex", gap: 8 }}>
  <Button
    onClick={handleExport}
    aria-label="Export matrix as CSV"
    icon={<Download className="w-4 h-4" />}
  >
    Export Matrix
  </Button>

  <Button
    onClick={onLearnMore}
    aria-label="Open documentation"
    icon={<BookOpen className="w-4 h-4" />}
  >
    Learn More
  </Button>

  <Button
    onClick={onClose}
    aria-label="Close modal"
    type="primary"
    icon={<CheckCircle className="w-4 h-4" />}
  >
    Done
  </Button>
</div>
        </div>
      </div>

      <div style={{ padding: 20, overflow: "auto" }}>
        {/* Matrix */}
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Dashboard Access Matrix</div>
        <table
          ref={gridRef}
          role="grid"
          aria-label="Roles by dashboard capability matrix"
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 12,
            overflow: "hidden"
          }}
        >
          <thead>
            <tr style={{ background: "#FAFAFB" }}>
              <th
                scope="col"
                style={{ textAlign: "left", padding: "12px 14px", fontSize: 12, color: TOKENS.muted, borderBottom: `1px solid ${TOKENS.border}` }}
              >
                Role \ Dashboard
              </th>
              {DASHBOARD_ORDER.map((d) => (
                <th
                  key={d}
                  scope="col"
                  style={{ textAlign: "left", padding: "12px 14px", fontSize: 12, color: TOKENS.muted, borderBottom: `1px solid ${TOKENS.border}` }}
                >
                  {dashboardLabel(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLE_ORDER.map((role, rIdx) => {
              const cells = appliedMatrix[role];
              const byDash: Record<DashboardKey, RoleMatrixCell> = {} as any;
              cells.forEach((c) => (byDash[c.dashboard] = c));
              return (
                <tr key={role} style={{ borderTop: `1px solid ${TOKENS.border}` }}>
                  <th scope="row" style={{ padding: "12px 14px", fontWeight: 500, background: "#fff" }}>
                    {role[0].toUpperCase() + role.slice(1)}
                  </th>
                  {DASHBOARD_ORDER.map((d, cIdx) => {
                    const cell = byDash[d];
                    const cap = cell?.capability ?? "none";
                    const tone = cell?.policy_locked ? "locked" : capabilityTone(cap);
                    const content = (
                      <Tag tone={tone as any} title={`${dashboardLabel(d)}: ${capabilityLabel(cap)}`}>
                        <span aria-hidden="true">{capabilityEmoji(cap)}</span>
                        <span>{capabilityLabel(cap)}</span>
                        {cell?.policy_locked && <span style={{ fontWeight: 500 }}>🔒</span>}
                      </Tag>
                    );
                    return (
                      <td
                        key={d}
                        style={{ padding: "12px 14px", background: "#fff" }}
                      >
                        <Tooltip content={cellTooltip(role, d, cap, cell?.note)}>
                          <button
                            data-cell={`${rIdx}:${cIdx}`}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 0,
                              cursor: "default"
                            }}
                            tabIndex={0}
                            aria-label={`${role}, ${dashboardLabel(d)}, ${capabilityLabel(cap)}${cell?.policy_locked ? " (locked)" : ""}`}
                          >
                            {content}
                          </button>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Legend */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: TOKENS.muted }}>Legend:</span>
          <Tag tone="good">✅ Full</Tag>
          <Tag tone="info">✏️ Edit</Tag>
          <Tag tone="neutral">👁️ View</Tag>
          <Tag tone="outline">— None</Tag>
          <Tag tone="locked">🔒 Policy Locked</Tag>
        </div>

        {/* Role Descriptions */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ staggerChildren: 0.1 }}
              variants={{
                hidden: {},
                visible: {},
              }}
              style={{ marginTop: 18 }}
            >
              <div
                className="flex items-center gap-2 cursor-pointer mb-3"
                onClick={() => setAccordionOpen(!accordionOpen)}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    accordionOpen ? "rotate-180" : ""
                  }`}
                />
                <span className="font-medium">Role Descriptions</span>
              </div>

              <AnimatePresence>
                {accordionOpen && (
                  <motion.div
                    key="roles"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ display: "grid", gap: 14 }}>
                      {vm.definitions.map((d) => (
                        <motion.div
                          key={d.key}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.25 }}
                          style={{
                            border: `1px solid ${TOKENS.border}`,
                            borderRadius: 8,
                            padding: 12,
                          }}
                        >
                          <div style={{ fontWeight: 500, marginBottom: 6 }}>
                            {d.title}
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {d.description.map((line, i) => (
                              <li
                                key={i}
                                style={{
                                  color: TOKENS.text,
                                  fontSize: 14,
                                  lineHeight: 1.5,
                                }}
                              >
                                {line}
                              </li>
                            ))}
                            {d.key === "editor" && (
                              <li style={{ color: TOKENS.muted, fontSize: 13 }}>
                                Reporting: Editors can view & export. Only
                                Admin/Owner can edit report templates and
                                schedules.
                              </li>
                            )}
                            {d.key === "viewer" &&
                              vm.feature_flags?.taskboard_viewer_enabled ===
                                false && (
                                <li
                                  style={{ color: TOKENS.muted, fontSize: 13 }}
                                >
                                  Viewer on TaskBoard is disabled by policy.
                                </li>
                              )}
                          </ul>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

        {/* Custom Roles placeholder */}
        <motion.div 
                      initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
              style={{ marginTop: 16 }}>
          <AccordionItem title="[+] Custom Roles — Coming Soon 🔒">
            <div
              style={{
                border: `1px dashed ${TOKENS.border}`,
                borderRadius: 8,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fff"
              }}
            >
              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Custom roles coming soon</div>
                <div style={{ color: TOKENS.muted, fontSize: 13 }}>
                  Define feature‑level permissions per dashboard in a future release.
                </div>
              </div>
              <Button  disabled aria-label="Create custom role (disabled)">
                🔒 Create Custom Role
              </Button>
            </div>
          </AccordionItem>
        </motion.div>
      </div>
    </Modal>
  );
};



