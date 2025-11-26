import React, { useMemo, useRef, useEffect, useState } from "react";

/** =======================
 *  TOKENS (aligned with Wranker)
 *  ======================= */
const TOKENS = {
  brand: "#1090D0",        // Primary / Info
  good: "#28C76F",         // Success
  warning: "#FF9F43",      // Warning
  critical: "#EA5455",     // Critical
  neutral: "#6C757D",      // Neutral accents
  border: "#EFF0F6",
  chipBg: "#FFFFFF",       // Neutral chip background (no status fills)
  text: "#1F2937",
  muted: "#6B7280",
  surface: "#FFFFFF",
  hover: "#F5F7FA",
  tooltipBg: "#282829",
  tooltipText: "#F9FAFB",
  shadow: "0 8px 24px rgba(17,24,39,0.12)"
};

/** =======================
 *  ICONS — Wranker Branded (inline SVG, includes Roles & Dashboards)
 *  ======================= */
type IconName =
  | "download"
  | "book"
  | "check"
  | "x"
  | "lock"
  | "info"
  | "edit"
  | "eye"
  | "ban"
  | "shield"
  | "chevron-right"
  // New: branded role icons
  | "role-owner"
  | "role-admin"
  | "role-editor"
  | "role-viewer"
  // New: branded dashboard icons
  | "dash-seo"
  | "dash-content"
  | "dash-taskboard"
  | "dash-reporting";

const WrIcon: React.FC<{
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
  title?: string;
}> = ({ name, size = 16, style, title }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style
  };
  switch (name) {
    /* ---------- System / existing ---------- */
    case "download":
      return (
        <svg {...common} role="img" aria-label={title ?? "Download"}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );
    case "book":
      return (
        <svg {...common} role="img" aria-label={title ?? "Learn more"}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M4 4v15.5A2.5 2.5 0 0 1 6.5 22H20V6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 6.5z" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} role="img" aria-label={title ?? "Confirm"}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} role="img" aria-label={title ?? "Close"}>
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common} role="img" aria-label={title ?? "Locked"}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M7 11V8a5 5 0 1 1 10 0v3" />
        </svg>
      );
    case "info":
      return (
        <svg {...common} role="img" aria-label={title ?? "Info"}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8h.01" />
          <path d="M11 12h1v4h1" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common} role="img" aria-label={title ?? "Edit"}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common} role="img" aria-label={title ?? "View"}>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "ban":
      return (
        <svg {...common} role="img" aria-label={title ?? "No access"}>
          <circle cx="12" cy="12" r="10" />
          <path d="m4.9 4.9 14.2 14.2" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common} role="img" aria-label={title ?? "Roles & Permissions"}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common} role="img" aria-label={title ?? "Item"}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      );

    /* ---------- New: Roles (branded) ---------- */
    case "role-owner":
      return (
        <svg {...common} role="img" aria-label={title ?? "Owner"}>
          {/* Crown */}
          <path d="M4 16V8l4 3 4-5 4 5 4-3v8" />
          <path d="M4 16h16" />
        </svg>
      );
    case "role-admin":
      return (
        <svg {...common} role="img" aria-label={title ?? "Admin"}>
          {/* Shield + key */}
          <path d="M12 21s8-4 8-10V6l-8-3-8 3v5c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="2" />
          <path d="M12 13v3m0 0h2m-2 0h-2" />
        </svg>
      );
    case "role-editor":
      return (
        <svg {...common} role="img" aria-label={title ?? "Editor"}>
          {/* Pen nib */}
          <path d="M12 19l-3 1 1-3 7-7 2 2-7 7z" />
          <path d="M18 7l2-2 1 1-2 2-1-1z" />
        </svg>
      );
    case "role-viewer":
      return (
        <svg {...common} role="img" aria-label={title ?? "Viewer"}>
          {/* Eye */}
          <path d="M2 12s4.5-6 10-6 10 6 10 6-4.5 6-10 6-10-6-10-6z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      );

    /* ---------- New: Dashboards (branded) ---------- */
    case "dash-seo":
      return (
        <svg {...common} role="img" aria-label={title ?? "SEO"}>
          {/* Search + target */}
          <circle cx="11" cy="11" r="5" />
          <path d="M21 21l-4.2-4.2" />
          <path d="M11 6v2M11 14v2M6 11h2M14 11h2" />
        </svg>
      );
    case "dash-content":
      return (
        <svg {...common} role="img" aria-label={title ?? "Content"}>
          {/* Document */}
          <path d="M6 3h9l3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />
          <path d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      );
    case "dash-taskboard":
      return (
        <svg {...common} role="img" aria-label={title ?? "TaskBoard"}>
          {/* Kanban columns */}
          <rect x="4" y="5" width="4" height="14" rx="1" />
          <rect x="10" y="5" width="4" height="10" rx="1" />
          <rect x="16" y="5" width="4" height="6" rx="1" />
        </svg>
      );
    case "dash-reporting":
      return (
        <svg {...common} role="img" aria-label={title ?? "Reporting"}>
          {/* Bars + line */}
          <path d="M4 20V10M10 20V6M16 20v-8" />
          <path d="M3 20h18" />
          <path d="M4 12l6-4 6 3 5-4" />
        </svg>
      );
  }
};

/** =======================
 *  TYPES
 *  ======================= */
export type DashboardKey = "seo" | "content" | "taskboard" | "reporting";
export type CapabilityLevel = "full" | "edit" | "view" | "none";
export type RoleKey = "owner" | "admin" | "editor" | "viewer";

export type RoleMatrixCell = {
  dashboard: DashboardKey;
  capability: CapabilityLevel;
  policy_locked?: boolean;
  note?: string;
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
    taskboard_viewer_enabled?: boolean;
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
 *  DEFAULT DATA (unchanged logic)
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
    { role: "viewer", dashboard: "taskboard", note: "Viewer on TaskBoard disabled by org policy." }
  ]
};

/** =======================
 *  LABEL HELPERS
 *  ======================= */
const DASHBOARD_ORDER: DashboardKey[] = ["seo", "content", "taskboard", "reporting"];
const ROLE_ORDER: RoleKey[] = ["owner", "admin", "editor", "viewer"];

const dashboardLabel = (d: DashboardKey) =>
  d === "seo" ? "SEO" : d === "content" ? "Content" : d === "taskboard" ? "TaskBoard" : "Reporting";

const capabilityLabel = (c: CapabilityLevel) =>
  c === "full" ? "Full" : c === "edit" ? "Edit" : c === "view" ? "View" : "None";

/** === NEW: icon helpers for Roles/Dashboards (brand set) ================= */
const roleIconName = (r: RoleKey): IconName =>
  r === "owner" ? "role-owner" : r === "admin" ? "role-admin" : r === "editor" ? "role-editor" : "role-viewer";

const dashIconName = (d: DashboardKey): IconName =>
  d === "seo" ? "dash-seo" : d === "content" ? "dash-content" : d === "taskboard" ? "dash-taskboard" : "dash-reporting";

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
 *  PRIMITIVES (Modal, Button, Tooltip, Accordion, Chips)
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

const ModalShell: React.FC<{
  open: boolean;
  onClose: () => void;
  width?: number;
  "aria-label"?: string;
  children: React.ReactNode;
}> = ({ open, onClose, width = 920, children, ...rest }) => {
  if (!open) return null;
  return (
    <>
      <Backdrop onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        {...rest}
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          zIndex: 1000
        }}
      >
        <div
          style={{
            width,
            maxWidth: "95vw",
            maxHeight: "90vh",
            background: TOKENS.surface,
            borderRadius: 12,
            boxShadow: TOKENS.shadow,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md";

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
  }
> = ({ variant = "primary", size = "md", style, children, startIcon, endIcon, ...rest }) => {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    padding: size === "md" ? "10px 14px" : "8px 12px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    border: "1px solid transparent",
    lineHeight: 1
  };
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: TOKENS.brand, color: "#fff" },
    outline: { background: "#fff", color: TOKENS.text, borderColor: TOKENS.border },
    ghost: { background: "transparent", color: TOKENS.text }
  };
  return (
    <button {...rest} style={{ ...base, ...variants[variant], ...style }}>
      {startIcon ? <span aria-hidden="true">{startIcon}</span> : null}
      <span>{children}</span>
      {endIcon ? <span aria-hidden="true">{endIcon}</span> : null}
    </button>
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
  <details
    open={defaultOpen}
    style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 8, overflow: "hidden" }}
  >
    <summary
      style={{
        padding: "12px 14px",
        fontWeight: 700,
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
 *  STATUS DOT + CHIP (neutral background; colored dot conveys status)
 *  ======================= */
const StatusDot: React.FC<{ color: string; title?: string }> = ({ color, title }) => (
  <span
    title={title}
    aria-hidden="true"
    style={{
      width: 8,
      height: 8,
      minWidth: 8,
      minHeight: 8,
      background: color,
      borderRadius: 999
    }}
  />
);

const Chip: React.FC<{
  children: React.ReactNode;
  outlined?: boolean;
  muted?: boolean;
}> = ({ children, outlined, muted }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 600,
      borderRadius: 999,
      background: TOKENS.chipBg,
      color: muted ? TOKENS.muted : TOKENS.text,
      border: outlined ? `1px solid ${TOKENS.border}` : "1px solid transparent"
    }}
  >
    {children}
  </span>
);

/** =======================
 *  CAPABILITY → dot color + icon
 *  ======================= */
function capabilityColor(cap: CapabilityLevel): string {
  switch (cap) {
    case "full":
      return TOKENS.good;
    case "edit":
      return TOKENS.brand;
    case "view":
      return TOKENS.neutral;
    case "none":
    default:
      return "#9CA3AF";
  }
}

function capabilityIcon(cap: CapabilityLevel): IconName {
  switch (cap) {
    case "full":
      return "check";
    case "edit":
      return "edit";
    case "view":
      return "eye";
    case "none":
    default:
      return "ban";
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
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 700 }}>{details}</div>
      <div style={{ opacity: 0.9 }}>{base}</div>
      {note ? (
        <div style={{ display: "inline-flex", gap: 6, alignItems: "center", marginTop: 2, color: TOKENS.muted }}>
          <WrIcon name="lock" size={14} /> <span>{note}</span>
        </div>
      ) : null}
    </div>
  );
}

/** =======================
 *  POINTER LIST (for role descriptions)
 *  ======================= */
const PointerList: React.FC<{ items: string[]; mutedNote?: string }> = ({ items, mutedNote }) => (
  <ul style={{ margin: 0, padding: 0, display: "grid", gap: 8 }}>
    {items.map((it, i) => (
      <li key={i} style={{ listStyle: "none", display: "flex", alignItems: "flex-start", gap: 8 }}>
        <WrIcon name="chevron-right" size={16} />
        <span style={{ fontSize: 14, lineHeight: 1.5 }}>{it}</span>
      </li>
    ))}
    {mutedNote ? (
      <li style={{ listStyle: "none", display: "flex", alignItems: "flex-start", gap: 8 }}>
        <WrIcon name="chevron-right" size={16} />
        <span style={{ fontSize: 13, color: TOKENS.muted }}>{mutedNote}</span>
      </li>
    ) : null}
  </ul>
);

/** =======================
 *  MAIN COMPONENT
 *  ======================= */
export const RolesPermissionsConfigModal: React.FC<Props> = ({
  open,
  onClose,
  vm = defaultVM,
  onExportCSV,
  onLearnMore,
  title = "Roles & Permissions",
  subtext = "Manage what each role can access across different dashboards."
}) => {
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
    <ModalShell open={open} onClose={onClose} aria-label="Roles & Permissions">
      {/* Header */}
      <div
        style={{
          padding: "18px 20px",
          borderBottom: `1px solid ${TOKENS.border}`,
          fontFamily:
            "Intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800 }}>
              {/* Section title — branded icon */}
              <WrIcon name="shield" size={18} />
              {title}
            </div>
            <div style={{ color: TOKENS.muted, fontSize: 13 }}>{subtext}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={handleExport} aria-label="Export matrix as CSV" startIcon={<WrIcon name="download" />}>
              Export Matrix
            </Button>
            <Button variant="outline" onClick={onLearnMore} aria-label="Open documentation" startIcon={<WrIcon name="book" />}>
              Learn More
            </Button>
            <Button onClick={onClose} aria-label="Close modal" startIcon={<WrIcon name="check" />}>
              Done
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          padding: 20,
          overflow: "auto",
          fontFamily:
            "Intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        {/* Matrix */}
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Dashboard Access Matrix</div>
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
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  fontSize: 12,
                  color: TOKENS.muted,
                  borderBottom: `1px solid ${TOKENS.border}`
                }}
              >
                Role \ Dashboard
              </th>
              {DASHBOARD_ORDER.map((d) => (
                <th
                  key={d}
                  scope="col"
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    fontSize: 12,
                    color: TOKENS.muted,
                    borderBottom: `1px solid ${TOKENS.border}`
                  }}
                >
                  {/* Dashboard header with branded icon */}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <WrIcon name={dashIconName(d)} size={14} />
                    {dashboardLabel(d)}
                  </span>
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
                  <th scope="row" style={{ padding: "12px 14px", fontWeight: 700, background: "#fff" }}>
                    {/* Role name with branded icon */}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <WrIcon name={roleIconName(role)} size={14} />
                      {role[0].toUpperCase() + role.slice(1)}
                    </span>
                  </th>
                  {DASHBOARD_ORDER.map((d, cIdx) => {
                    const cell = byDash[d];
                    const cap = cell?.capability ?? "none";
                    const dotColor = capabilityColor(cap);
                    const iconName = capabilityIcon(cap);
                    return (
                      <td key={d} style={{ padding: "12px 14px", background: "#fff" }}>
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
                            aria-label={`${role}, ${dashboardLabel(d)}, ${capabilityLabel(cap)}${
                              cell?.policy_locked ? " (locked)" : ""
                            }`}
                          >
                            <Chip outlined>
                              <StatusDot color={dotColor} title={capabilityLabel(cap)} />
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <WrIcon name={iconName} size={14} />
                                {capabilityLabel(cap)}
                              </span>
                              {cell?.policy_locked && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <WrIcon name="lock" size={14} />
                                  <span style={{ fontSize: 12 }}>Locked</span>
                                </span>
                              )}
                            </Chip>
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

        {/* Legend (neutral chips with colored dots; no background color coding) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: TOKENS.muted }}>Legend:</span>
          <Chip outlined>
            <StatusDot color={TOKENS.good} /> Full
          </Chip>
          <Chip outlined>
            <StatusDot color={TOKENS.brand} /> Edit
          </Chip>
          <Chip outlined>
            <StatusDot color={TOKENS.neutral} /> View
          </Chip>
          <Chip outlined>
            <StatusDot color={"#9CA3AF"} /> None
          </Chip>
          <Chip outlined muted>
            <WrIcon name="lock" size={14} /> Policy Locked
          </Chip>
        </div>

        {/* Role Descriptions (pointer bullets) */}
        <div style={{ marginTop: 18 }}>
          <AccordionItem title="Role Descriptions" defaultOpen>
            <div style={{ display: "grid", gap: 14 }}>
              {vm.definitions.map((d) => (
                <div key={d.key} style={{ border: `1px solid ${TOKENS.border}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, marginBottom: 8 }}>
                    {/* Branded role icon before title */}
                    <WrIcon name={roleIconName(d.key)} />
                    {d.title}
                  </div>
                  <PointerList
                    items={d.description}
                    mutedNote={
                      d.key === "editor"
                        ? "Reporting: Editors can view & export. Only Admin/Owner can edit report templates and schedules."
                        : d.key === "viewer" && vm.feature_flags?.taskboard_viewer_enabled === false
                        ? "Viewer on TaskBoard is disabled by policy."
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          </AccordionItem>
        </div>

        {/* Custom Roles placeholder */}
        <div style={{ marginTop: 16 }}>
          <AccordionItem title="Custom Roles — Coming Soon" defaultOpen={false}>
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
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 4 }}>
                  <WrIcon name="shield" /> Custom roles
                </div>
                <div style={{ color: TOKENS.muted, fontSize: 13 }}>
                  Define feature‑level permissions per dashboard in a future release.
                </div>
              </div>
              <Button variant="outline" disabled aria-label="Create custom role (disabled)" startIcon={<WrIcon name="lock" />}>
                Create Custom Role
              </Button>
            </div>
          </AccordionItem>
        </div>
      </div>
    </ModalShell>
  );
};

/** =======================
 *  DEMO WRAPPER
 *  ======================= */
export const RolesPermissionsConfigDemo: React.FC = () => {
  const [open, setOpen] = useState(false);
  const vm = defaultVM;

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
      }}
    >
      {/* <h2 style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <WrIcon name="shield" /> Team & Roles — Roles & Permissions Config (Demo)
      </h2>
      <p style={{ color: TOKENS.muted, marginBottom: 16 }}>
        Read‑only matrix of predefined roles across dashboards. Includes tooltips, export, and role descriptions.
      </p> */}
      <Button onClick={() => setOpen(true)} startIcon={<WrIcon name="shield" />}>
        Roles & Permissions
      </Button>

      <RolesPermissionsConfigModal
        open={open}
        onClose={() => setOpen(false)}
        vm={vm}
        onLearnMore={() => window.alert("Open docs (replace with your help link).")}
        onExportCSV={(csv) => {
          // For demo: download immediately
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "wranker_roles_matrix.csv";
          a.click();
          URL.revokeObjectURL(url);
        }}
      />
    </div>
  );
};

export default RolesPermissionsConfigDemo;
