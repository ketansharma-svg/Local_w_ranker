// Section 5 — User Engagement Table (drop‑in, demo‑ready)
// Design matched to the “Pending Invitations” section: same fonts, filter bar, chips (with dropdown chevron),
// branded icons (headers, roles, dashboards & actions), pastel toggle, favicon on projects with domain on‑hover.
// No emojis used.

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Search as SearchIcon,
  Download,
  SlidersHorizontal,
  RefreshCw,
  ChevronDown,
  Info,
  Shield,
  PencilLine,
  Eye,
  Folder,
  Clock,
  ListChecks,
  BarChart3,
  Hourglass,
  Lightbulb,
  MoreVertical,
  Trash2,
  Megaphone,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  KeyRound,
} from "lucide-react";
import UserSummaryDrawerDemo from "./UserSummaryDrawerDemo";

/* ─────────────────────────────────────────────────────────────
   Tokens (aligned with Pending Invitations section)
   ───────────────────────────────────────────────────────────── */
const TK = {
  brand: "#1090D0",
  brandHover: "rgba(16,144,208,0.08)",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  subtle: "#F5F7FA",
  radius: "12px",
  status: {
    info: "#1090D0",
    warning: "#FF9F43",
    danger: "#EA5455",
    success: "#28C76F",
    neutral: "#6C757D",
  },
};

/* ─────────────────────────────────────────────────────────────
   Types & mock data
   ───────────────────────────────────────────────────────────── */
type DashKey = "seo" | "content" | "campaign" | "reporting";
type RoleKey = "owner" | "admin" | "editor" | "viewer" | string; // allow custom:...

type Row = {
  user: { id: string; name: string; email: string; avatar?: string | null };
  roles: RoleKey[];
  projects: { id: string; name: string }[];
  last_login_at: string | null;
  sessions: number;
  tasks: { assigned: number; completed: number; overdue: number };
  dashboards_used: { key: DashKey; sessions: number; last_access_at: string | null; has_access: boolean }[];
  inactivity_days: number;
  status: "active" | "inactive" | "pending" | "never";
  suggestions: { type: "change_role" | "reassign" | "remind" | "upgrade"; rationale?: string }[];
};

const DEMO_ROWS: Row[] = [
  {
    user: { id: "u1", name: "Ana Costa", email: "ana.costa@agency.com", avatar: null },
    roles: ["editor"],
    projects: [
      { id: "p1", name: "wranker.com" },
      { id: "p2", name: "app.w3era.com" },
    ],
    last_login_at: null,
    sessions: 23,
    tasks: { assigned: 5, completed: 4, overdue: 1 },
    dashboards_used: [
      { key: "seo", sessions: 7, last_access_at: "2025-08-30T10:22:00Z", has_access: true },
      { key: "content", sessions: 8, last_access_at: "2025-08-31T10:22:00Z", has_access: true },
      { key: "campaign", sessions: 8, last_access_at: "2025-08-29T10:22:00Z", has_access: true },
      { key: "reporting", sessions: 0, last_access_at: null, has_access: true },
    ],
    inactivity_days: 999,
    status: "never",
    suggestions: [{ type: "remind", rationale: "No login in 30+ days" }],
  },
  {
    user: { id: "u2", name: "Aditya Chauhan", email: "aditya.chauhan@agency.com", avatar: null },
    roles: ["editor"],
    projects: [
      { id: "p1", name: "wranker.com" },
      { id: "p2", name: "app.w3era.com" },
    ],
    last_login_at: null,
    sessions: 12,
    tasks: { assigned: 7, completed: 4, overdue: 0 },
    dashboards_used: [
      { key: "seo", sessions: 1, last_access_at: "2025-08-28T10:22:00Z", has_access: true },
      { key: "content", sessions: 10, last_access_at: "2025-08-31T10:22:00Z", has_access: true },
      { key: "campaign", sessions: 1, last_access_at: "2025-08-20T10:22:00Z", has_access: true },
      { key: "reporting", sessions: 1, last_access_at: "2025-08-27T10:22:00Z", has_access: true },
    ],
    inactivity_days: 999,
    status: "never",
    suggestions: [{ type: "remind", rationale: "No login in 30+ days" }],
  },
  {
    user: { id: "u3", name: "Arjun Rao", email: "arjun.rao@agency.com", avatar: null },
    roles: ["viewer"],
    projects: [
      { id: "p1", name: "wranker.com" },
      { id: "p3", name: "client-site.io" },
    ],
    last_login_at: "2025-08-07T10:22:00Z",
    sessions: 4,
    tasks: { assigned: 3, completed: 1, overdue: 0 },
    dashboards_used: [
      { key: "seo", sessions: 0, last_access_at: null, has_access: true },
      { key: "content", sessions: 0, last_access_at: null, has_access: true },
      { key: "campaign", sessions: 0, last_access_at: null, has_access: true },
      { key: "reporting", sessions: 4, last_access_at: "2025-08-30T10:22:00Z", has_access: true },
    ],
    inactivity_days: 30,
    status: "inactive",
    suggestions: [{ type: "change_role", rationale: "Viewer with low usage" }],
  },
  {
    user: { id: "u4", name: "Ethan Brown", email: "ethan.brown@agency.com", avatar: null },
    roles: ["viewer", "custom:GA4Analyst"],
    projects: [{ id: "p1", name: "wranker.com" }],
    last_login_at: null,
    sessions: 11,
    tasks: { assigned: 14, completed: 13, overdue: 0 },
    dashboards_used: [
      { key: "seo", sessions: 6, last_access_at: "2025-08-31T10:22:00Z", has_access: true },
      { key: "content", sessions: 5, last_access_at: "2025-08-28T10:22:00Z", has_access: true },
      { key: "campaign", sessions: 0, last_access_at: null, has_access: true },
      { key: "reporting", sessions: 0, last_access_at: null, has_access: true },
    ],
    inactivity_days: 999,
    status: "never",
    suggestions: [],
  },
  {
    user: { id: "u5", name: "Karan Malhotra 56", email: "karan.malhotra@agency.com", avatar: null },
    roles: ["viewer"],
    projects: [{ id: "p1", name: "wranker.com" }],
    last_login_at: null,
    sessions: 19,
    tasks: { assigned: 11, completed: 7, overdue: 0 },
    dashboards_used: [
      { key: "seo", sessions: 13, last_access_at: "2025-08-31T10:22:00Z", has_access: true },
      { key: "content", sessions: 0, last_access_at: null, has_access: true },
      { key: "campaign", sessions: 0, last_access_at: null, has_access: false },
      { key: "reporting", sessions: 6, last_access_at: "2025-08-30T10:22:00Z", has_access: true },
    ],
    inactivity_days: 999,
    status: "never",
    suggestions: [{ type: "upgrade", rationale: "High activity across dashboards" }],
  },
];

/* ─────────────────────────────────────────────────────────────
   Icon maps (branded)
   ───────────────────────────────────────────────────────────── */
const DashIcon: Record<DashKey, React.FC<React.SVGProps<SVGSVGElement>>> = {
  seo: SearchIcon,
  content: FileText,
  campaign: Megaphone,
  reporting: BarChart3,
};
const DashColor: Record<DashKey, string> = {
  seo: TK.brand,
  content: "#10B981",
  campaign: "#8B5CF6",
  reporting: "#F59E0B",
};

const RoleIcon: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  owner: Shield,
  admin: Shield,
  editor: PencilLine,
  viewer: Eye,
};

/* ─────────────────────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────────────────────── */
const cls = (...xs: Array<string | false | undefined>) => xs.filter(Boolean).join(" ");
const dateRel = (iso: string | null) => {
  if (!iso) return "Never";
  const n = new Date().getTime();
  const t = new Date(iso).getTime();
  const d = Math.max(0, Math.floor((n - t) / 86400000));
  return d === 0 ? "Today" : `${d}d ago`;
};

const projectDomain = (name: string) => {
  // pick first token till comma/space; if already a domain, use it; else derive.
  const base = name.split(",")[0].trim().split(" ")[0].trim();
  if (base.includes(".")) return base;
  return `${base.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.com`;
};
const faviconUrl = (domain: string, sz = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`;

function downloadCSV(filename: string, rows: Row[]) {
  const header = [
    "user_id",
    "name",
    "email",
    "roles",
    "projects",
    "last_login",
    "sessions",
    "tasks_assigned",
    "tasks_completed",
    "status",
  ];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    lines.push(
      [
        r.user.id,
        `"${r.user.name}"`,
        r.user.email,
        `"${r.roles.join("|")}"`,
        `"${r.projects.map((p) => p.name).join("|")}"`,
        r.last_login_at ?? "",
        r.sessions,
        r.tasks.assigned,
        r.tasks.completed,
        r.status,
      ].join(",")
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ─────────────────────────────────────────────────────────────
   Column model (all left‑aligned)
   ───────────────────────────────────────────────────────────── */
type ColKey =
  | "user"
  | "role"
  | "proj"
  | "login"
  | "ses"
  | "task"
  | "dash"
  | "inact"
  | "sugg"
  | "actions";

const COLS: { key: ColKey; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; tip?: string; min?: number; sticky?: boolean }[] =
  [
    { key: "user", label: "User", icon: Users, tip: "Member profile & email", min: 260, sticky: true },
    { key: "role", label: "Role", icon: Shield, tip: "Assigned role(s) for the user", min: 160 },
    { key: "proj", label: "Projects", icon: Folder, tip: "Projects the user has access to", min: 220 },
    { key: "login", label: "Last Login", icon: Clock, tip: "Last login date • relative", min: 200 },
    { key: "ses", label: "Sessions", icon: RefreshCw, tip: "Total product sessions (period)", min: 120 },
    { key: "task", label: "Tasks A/C", icon: ListChecks, tip: "Assigned / Completed", min: 140 },
    { key: "dash", label: "Dashboards", icon: BarChart3, tip: "Usage or Access per dashboard", min: 260 },
    { key: "inact", label: "Inactivity", icon: Hourglass, tip: "Inactivity state", min: 180 },
    { key: "sugg", label: "Suggestions", icon: Lightbulb, tip: "Smart suggestions", min: 220 },
    { key: "actions", label: "Actions", icon: MoreVertical, tip: "Row actions", min: 160 },
  ];

/* ─────────────────────────────────────────────────────────────
   Header tip (brand)
   ───────────────────────────────────────────────────────────── */
const HeaderTip: React.FC<{ tip?: string; children: React.ReactNode }> = ({ tip, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="inline-flex items-center gap-1 cursor-help relative select-none"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <Info className="h-3.5 w-3.5 text-[#9E9E9E]" />
      {open && tip && (
        <div
          className="absolute z-50 -translate-x-1/2 left-1/2 top-[120%] rounded-md border bg-white px-2 py-1 text-xs shadow"
          style={{ borderColor: TK.borderLight, maxWidth: 280 }}
        >
          {tip}
        </div>
      )}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────
   Filter chip (dropdown)
   ───────────────────────────────────────────────────────────── */
function ChipDropdown({
  label,
  active,
  children,
}: {
  label: React.ReactNode;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        className={cls(
          "h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]",
          active && "font-semibold"
        )}
        style={{ borderColor: TK.borderLight }}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 rounded-md border bg-white p-3 shadow-lg"
          style={{ borderColor: TK.borderLight, minWidth: 220 }}
          onMouseLeave={() => setOpen(false)}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Column Control (design parity with Pending Invites)
   ───────────────────────────────────────────────────────────── */
function ColumnControl({
  visible,
  setVisible,
}: {
  visible: Record<ColKey, boolean>;
  setVisible: React.Dispatch<React.SetStateAction<Record<ColKey, boolean>>>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
        style={{ borderColor: TK.borderLight }}
        onClick={() => setOpen((o) => !o)}
        title="Columns"
      >
        <SlidersHorizontal className="h-4 w-4" /> Columns
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-md border bg-white p-3 text-sm shadow-lg"
          style={{ borderColor: TK.borderLight, zIndex: 50 }}
          role="menu"
        >
          <div className="mb-2 font-semibold">Show / Hide</div>
          <div className="max-h-64 space-y-1 overflow-auto pr-1">
            {COLS.map((c) => (
              <label key={c.key} className="flex items-center justify-between gap-2 py-1">
                <span>{c.label}</span>
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={visible[c.key] !== false}
                  onChange={(e) => setVisible((v) => ({ ...v, [c.key]: e.target.checked }))}
                  disabled={c.key === "user"}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-between">
            <button
              className="rounded border px-2 py-1 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderLight }}
              onClick={() =>
                setVisible(COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>))
              }
            >
              Reset
            </button>
            <button
              className="rounded border px-2 py-1 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderLight }}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Pastel segmented toggle (By Usage / By Access)
   ───────────────────────────────────────────────────────────── */
function PastelToggle({
  value,
  onChange,
}: {
  value: "usage" | "access";
  onChange: (v: "usage" | "access") => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border p-0.5"
      style={{ borderColor: TK.borderLight, background: "#FFFFFF" }}
    >
      {[
        { key: "usage", label: "By Usage" as const },
        { key: "access", label: "By Access" as const },
      ].map((opt) => (
        <button
          key={opt.key}
          className={cls(
            "px-3 py-1.5 text-sm rounded",
            value === opt.key ? "font-semibold" : "text-gray-700"
          )}
          style={{
            background: value === opt.key ? "rgba(16,144,208,0.12)" : "transparent",
            color: value === opt.key ? TK.brand : undefined,
          }}
          onClick={() => onChange(opt.key as "usage" | "access")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Tooltip host (for dashboard smart popover)
   ───────────────────────────────────────────────────────────── */
function TooltipHost({ tip }: { tip: { x: number; y: number; node: React.ReactNode } | null }) {
  if (!tip) return null;
  const m = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const w = 260;
  const left = Math.min(vw - w - m, Math.max(m, tip.x));
  const top = Math.max(m, tip.y);
  return (
    <div
      className="fixed z-[1000] rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.borderLight, width: w, left, top }}
      role="tooltip"
    >
      {tip.node}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Component (export default)
   ───────────────────────────────────────────────────────────── */
export default function UserEngagementTableDemo() {
  const [rows, setRows] = useState<Row[]>(
    DEMO_ROWS.map((r) => ({
      ...r,
      user: {
        ...r.user,
        avatar: r.user.avatar ?? `https://i.pravatar.cc/80?u=${encodeURIComponent(r.user.email)}`,
      },
    }))
  );

  // Filters (pattern parity with Pending Invites)
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const [roleSel, setRoleSel] = useState<Record<string, boolean>>({
    owner: false,
    admin: false,
    editor: false,
    viewer: false,
  });
  const roleValues = useMemo(() => Object.keys(roleSel).filter((k) => roleSel[k]), [roleSel]);

  const allProjects = useMemo(
    () =>
      Array.from(new Set(rows.flatMap((r) => r.projects.map((p) => p.name)))).map((name) => ({
        id: name,
        name,
      })),
    [rows]
  );
  const [projSel, setProjSel] = useState<Record<string, boolean>>({});
  const projValues = useMemo(() => Object.keys(projSel).filter((k) => projSel[k]), [projSel]);

  const [dashSel, setDashSel] = useState<Record<DashKey, boolean>>({
    seo: false,
    content: false,
    campaign: false,
    reporting: false,
  });
  const dashValues = useMemo(
    () => (Object.keys(dashSel) as DashKey[]).filter((k) => dashSel[k]),
    [dashSel]
  );

  const [inactSel, setInactSel] = useState<"all" | "active" | "inactive" | "pending" | "never">("all");
  const [taskLoad, setTaskLoad] = useState<"all" | "none" | "low" | "high">("all");
  const [mode, setMode] = useState<"usage" | "access">("usage");

  // Column visibility
  const [visible, setVisible] = useState<Record<ColKey, boolean>>(
    COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>)
  );

  // Tooltip for dashboard smart popover
  const [dashTip, setDashTip] = useState<{ x: number; y: number; node: React.ReactNode } | null>(null);

  // Filtering
  const filtered = useMemo(() => {
    let out = rows;
    // search by name/email
    if (debouncedQ) {
      out = out.filter(
        (r) =>
          r.user.name.toLowerCase().includes(debouncedQ) ||
          r.user.email.toLowerCase().includes(debouncedQ)
      );
    }
    // roles
    if (roleValues.length) {
      out = out.filter((r) =>
        r.roles.some((rk) => roleValues.includes(rk) || roleValues.includes(rk.split(":")[0]))
      );
    }
    // projects
    if (projValues.length) {
      out = out.filter((r) => r.projects.some((p) => projValues.includes(p.name)));
    }
    // dashboards: usage vs access
    if (dashValues.length) {
      out = out.filter((r) => {
        if (mode === "usage") {
          return r.dashboards_used.some((d) => dashValues.includes(d.key) && d.sessions > 0);
        }
        return r.dashboards_used.some((d) => dashValues.includes(d.key) && d.has_access);
      });
    }
    // inactivity
    if (inactSel !== "all") out = out.filter((r) => r.status === inactSel);
    // task load
    if (taskLoad !== "all") {
      out = out.filter((r) => {
        const a = r.tasks.assigned;
        if (taskLoad === "none") return a === 0;
        if (taskLoad === "low") return a >= 1 && a <= 10;
        return a >= 11;
      });
    }
    // sort: last_login desc (Never last)
    const sorted = [...out].sort((a, b) => {
      const av = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
      const bv = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
      return bv - av;
    });
    return sorted;
  }, [rows, debouncedQ, roleValues, projValues, dashValues, inactSel, taskLoad, mode]);

  const totalCount = filtered.length;

  // Export
  const onExportCSV = () => downloadCSV("user-engagement.csv", filtered);

  // Refresh (demo)
  const onRefresh = () => setRows((r) => [...r]);

  // Sticky left computations
  const stickyLeft = (key: ColKey) => {
    let left = 0;
    for (const c of COLS) {
      if (c.key === key) break;
      if (c.sticky && visible[c.key] !== false) left += c.min ?? 160;
    }
    return left;
  };

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }

  return (
    <section className="space-y-3" style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
                              {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <UserSummaryDrawerDemo   />
                    </Drawer>
                  )}
      <div
        className="border mx-4 rounded-xl overflow-hidden"
        style={{ borderColor: TK.border }}
      >
        {/* Header (matches pending invites) */}
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: TK.brand }} />
            <h3 className="text-lg font-semibold text-foreground">User Engagement</h3>
            <HeaderTip tip="Members with their usage & access footprint across dashboards.">
              <span className="sr-only">Info</span>
            </HeaderTip>
            <span
              className="ml-2 px-2 py-0.5 rounded border text-xs text-muted-foreground"
              style={{ borderColor: TK.borderLight }}
            >
              {totalCount} users
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Columns */}
            <ColumnControl visible={visible} setVisible={setVisible} />

            {/* Export */}
            <div className="relative">
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderLight }}
                onClick={onExportCSV}
                title="Export CSV"
              >
                <Download className="h-4 w-4" /> Export
              </button>
            </div>

            {/* Refresh */}
            <button
              className="h-8 px-2 text-muted-foreground rounded border hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderLight }}
              title="Refresh"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters bar (pattern parity) */}
        <div className="px-4 py-3 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-[280px] pl-7 h-8 rounded border text-sm outline-none"
                style={{ borderColor: TK.borderLight }}
                placeholder="Search name or email…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Roles (dropdown chip) */}
            <ChipDropdown
              label={
             <span className={cls(!!roleValues.length && "text-foreground font-semibold")}>
                  Roles {roleValues.length ? `(${roleValues.length})` : ""}
                </span>
              }
              active={roleValues.length > 0}
            >
              <div className="text-sm font-medium mb-2">Filter by role</div>
              {["owner", "admin", "editor", "viewer"].map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={!!roleSel[r]}
                    onChange={(e) => setRoleSel((s) => ({ ...s, [r]: e.target.checked }))}
                  />
                  <span className="capitalize inline-flex items-center gap-1.5">
                    {React.createElement(RoleIcon[r] || Shield, {
                      className: "h-3.5 w-3.5",
                      style: { color: r === "editor" ? "#10B981" : r === "viewer" ? TK.muted : TK.brand },
                    })}
                    {r}
                  </span>
                </label>
              ))}
            </ChipDropdown>

            {/* Projects (dropdown chip) */}
            <ChipDropdown
              label={
                <span className={cls(!!roleValues.length && "text-foreground font-semibold")}>
                  Projects {projValues.length ? `(${projValues.length})` : ""}
                </span>
              }
              active={projValues.length > 0}
            >
              <div className="text-sm font-medium mb-2">Filter by project</div>
              <div className="max-h-52 overflow-auto pr-1">
                {allProjects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      checked={!!projSel[p.id]}
                      onChange={(e) => setProjSel((s) => ({ ...s, [p.id]: e.target.checked }))}
                    />
                    <span className="inline-flex items-center gap-2">
                      <img
                        src={faviconUrl(projectDomain(p.name), 32)}
                        alt=""
                        className="h-3.5 w-3.5 rounded-sm"
                      />
                      {p.name}
                    </span>
                  </label>
                ))}
              </div>
            </ChipDropdown>

            {/* Dashboards (dropdown chip with branded icons) */}
            <ChipDropdown
              label={
               <span className={cls(!!roleValues.length && "text-foreground font-semibold")}>
                  Dashboards {dashValues.length ? `(${dashValues.length})` : ""}
                </span>
              }
              active={dashValues.length > 0}
            >
              <div className="text-sm font-medium mb-2">Filter by dashboard</div>
              {(Object.keys(dashSel) as DashKey[]).map((d) => {
                const Ico = DashIcon[d];
                return (
                  <label key={d} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      checked={!!dashSel[d]}
                      onChange={(e) => setDashSel((s) => ({ ...s, [d]: e.target.checked }))}
                    />
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <Ico className="h-3.5 w-3.5" style={{ color: DashColor[d] }} />
                      {d}
                    </span>
                  </label>
                );
              })}
            </ChipDropdown>

            {/* Inactivity (dropdown chip) */}
            <ChipDropdown label={<span>Inactivity</span>} active={inactSel !== "all"}>
              <div className="text-sm font-medium mb-2">Filter by inactivity</div>
              {(["all", "active", "inactive", "pending", "never"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="radio"
                    name="inact"
                    checked={inactSel === k}
                    onChange={() => setInactSel(k)}
                  />
                  <span className="capitalize">{k === "never" ? "Never Logged In" : k}</span>
                </label>
              ))}
            </ChipDropdown>

            {/* Task Load (dropdown chip) */}
            <ChipDropdown label={<span>Task Load</span>} active={taskLoad !== "all"}>
              <div className="text-sm font-medium mb-2">Filter by task load</div>
              {(["all", "none", "low", "high"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="radio"
                    name="tload"
                    checked={taskLoad === k}
                    onChange={() => setTaskLoad(k)}
                  />
                  <span className="capitalize">{k === "low" ? "Low (1–10)" : k === "high" ? "High (11+)" : k}</span>
                </label>
              ))}
            </ChipDropdown>

            {/* Toggle (By Usage / By Access) */}
            <div className="ml-1">
              <PastelToggle value={mode} onChange={setMode} />
            </div>

            {/* Reset */}
            <button
              className="ml-auto h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderLight }}
              onClick={() => {
                setQ("");
                setRoleSel({ owner: false, admin: false, editor: false, viewer: false });
                setProjSel({});
                setDashSel({ seo: false, content: false, campaign: false, reporting: false });
                setInactSel("all");
                setTaskLoad("all");
                setMode("usage");
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <table className="w-full border-collapse text-sm">
              <thead
                className="bg-white sticky top-0 z-20"
                style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}
              >
                <tr className="hover:bg-white">
                  {COLS.filter((c) => visible[c.key] !== false).map((c) => {
                    const Icon = c.icon;
                    const sticky = c.sticky;
                    const style = sticky
                      ? {
                          position: "sticky" as const,
                          left: stickyLeft(c.key),
                          zIndex: 10,
                          background: "#fff",
                          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                          minWidth: c.min,
                        }
                      : { minWidth: c.min };
                    return (
                      <th key={c.key} className="px-3 py-2 text-left text-[12px] font-semibold text-gray-700" style={style}>
                        <HeaderTip tip={c.tip}>
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                            {c.label}
                          </span>
                        </HeaderTip>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.user.id} className="hover:bg-[rgba(16,144,208,0.03)] border-b" style={{ borderColor: TK.borderLight }}>
                    {/* User (sticky) */}
                    {visible.user !== false && (
                      <td
                        className="px-3 py-2"
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 9,
                          background: "#fff",
                          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                          minWidth: 260,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {r.user.avatar ? (
                            <img
                              src={r.user.avatar}
                              alt={r.user.name}
                              className="h-8 w-8 rounded-full object-cover border"
                              style={{ borderColor: TK.borderLight }}
                            />
                          ) : (
                            <div
                              className="h-8 w-8 rounded-full grid place-items-center text-[12px] font-semibold text-white"
                              style={{ background: TK.brand }}
                            >
                              {r.user.name
                                .split(" ")
                                .map((p) => p[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <button
                              className="text-[14px] font-medium text-[#0B4C6C] underline underline-offset-2 hover:text-[#08384f] cursor-pointer"
                              title={r.user.email}
                              onClick={openDrawer}
                            >
                              {r.user.name}
                            </button>
                            <div className="text-xs text-gray-500 truncate max-w-[300px]">{r.user.email}</div>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Role (icons for role type) */}
                    {visible.role !== false && (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.roles.map((role, i) => {
                            const base = role.split(":")[0] as RoleKey;
                            const Icon = RoleIcon[base] || Shield;
                            const color =
                              base === "editor" ? "#10B981" : base === "viewer" ? TK.muted : TK.brand;
                            return (
                              <span
                                key={`${role}-${i}`}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white text-xs"
                                style={{ borderColor: TK.borderLight }}
                                title={role}
                              >
                                <Icon className="h-3.5 w-3.5" style={{ color }} />
                                <span className="capitalize">
                                  {base === "custom" ? role.replace("custom:", "") : base}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    )}

                    {/* Projects (favicon + hover domain) */}
                    {visible.proj !== false && (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.projects.slice(0, 2).map((p) => {
                            const dom = projectDomain(p.name);
                            return (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white text-xs"
                                style={{ borderColor: TK.borderLight }}
                                title={dom}
                              >
                                <img src={faviconUrl(dom, 32)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                                {p.name}
                              </span>
                            );
                          })}
                          {r.projects.length > 2 && (
                            <span
                              className="px-2 py-0.5 rounded-full border text-xs bg-white"
                              style={{ borderColor: TK.borderLight }}
                              title={r.projects.map((p) => p.name).join(", ")}
                            >
                              +{r.projects.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Last Login */}
                    {visible.login !== false && (
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span>{r.last_login_at ? new Date(r.last_login_at).toLocaleDateString() : "Never"}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.last_login_at ? dateRel(r.last_login_at) : "—"}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Sessions */}
                    {visible.ses !== false && <td className="px-3 py-2">{r.sessions}</td>}

                    {/* Tasks */}
                    {visible.task !== false && (
                      <td className="px-3 py-2">
                        {r.tasks.assigned} / {r.tasks.completed}
                      </td>
                    )}

                    {/* Dashboards (badges with branded icons; smart popover per badge hover) */}
                    {visible.dash !== false && (
                      <td className="px-3 py-2" onMouseLeave={() => setDashTip(null)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(Object.keys(DashIcon) as DashKey[]).map((dk) => {
                            const meta = r.dashboards_used.find((d) => d.key === dk);
                            const used = (meta?.sessions ?? 0) > 0;
                            const has = !!meta?.has_access;
                            const Ico = DashIcon[dk];
                            const color = DashColor[dk];
                            const label = dk[0].toUpperCase() + dk.slice(1);
                            const badgeState =
                              mode === "usage" ? (used ? "on" : "off") : has ? "on" : "off";

                            return (
                              <button
                                key={dk}
                                className={cls(
                                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs",
                                  "hover:bg-[#F7FAFC]"
                                )}
                                style={{
                                  borderColor: TK.borderLight,
                                  background:
                                    badgeState === "on" ? "rgba(16,185,129,0.08)" : "#FFFFFF",
                                }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setDashTip({
                                    x: rect.right + 8,
                                    y: rect.top,
                                    node: (
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <Ico className="h-3.5 w-3.5" style={{ color }} />
                                          <span className="font-medium text-gray-900">
                                            {label} — {mode === "usage" ? "Usage" : "Access"}
                                          </span>
                                        </div>
                                        <ul className="space-y-1">
                                          <li className="flex items-center gap-1.5">
                                            <BarChart3 className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                                            <span>Sessions:</span>
                                            <b className="ml-1">{meta?.sessions ?? 0}</b>
                                          </li>
                                          <li className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                                            <span>Last access:</span>
                                            <b className="ml-1">
                                              {meta?.last_access_at
                                                ? new Date(meta.last_access_at).toLocaleDateString()
                                                : "Never"}
                                            </b>
                                          </li>
                                          <li className="flex items-center gap-1.5">
                                            <KeyRound className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                                            <span>Has access:</span>
                                            <b className="ml-1">{has ? "Yes" : "No"}</b>
                                          </li>
                                        </ul>
                                      </div>
                                    ),
                                  });
                                }}
                              >
                                <Ico className="h-3.5 w-3.5" style={{ color }} />
                                <span className="capitalize">{dk}</span>
                                {mode === "usage" && meta && meta.sessions > 0 ? (
                                  <span className="font-semibold">{meta.sessions}</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}

                    {/* Inactivity */}
                    {visible.inact !== false && (
                      <td className="px-3 py-2">
                        {r.status === "active" && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                            style={{ background: "rgba(40,199,111,0.12)", color: "#0C5E3B" }}
                          >
                            Active
                          </span>
                        )}
                        {r.status === "inactive" && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                            style={{ background: "rgba(255,159,67,0.12)", color: "#7A4A00" }}
                          >
                            Inactive — {r.inactivity_days}d
                          </span>
                        )}
                        {r.status === "never" && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                            style={{ background: TK.subtle, color: TK.muted }}
                          >
                            Never Logged In
                          </span>
                        )}
                        {r.status === "pending" && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                            style={{ background: TK.subtle, color: TK.muted }}
                          >
                            Invite Pending
                          </span>
                        )}
                      </td>
                    )}

                    {/* Suggestions */}
                    {visible.sugg !== false && (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.suggestions?.map((s, i) => {
                            const tone =
                              s.type === "change_role"
                                ? { bg: "rgba(255,159,67,0.12)", color: "#7A4A00", label: "Change Role" }
                                : s.type === "reassign"
                                ? { bg: TK.subtle, color: TK.muted, label: "Reassign" }
                                : s.type === "remind"
                                ? { bg: TK.subtle, color: TK.muted, label: "Send Reminder" }
                                : { bg: "rgba(40,199,111,0.12)", color: "#0C5E3B", label: "Upgrade Role" };
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                                style={{ background: tone.bg, color: tone.color }}
                                title={s.rationale}
                              >
                                {tone.label}
                              </span>
                            );
                          })}
                          {!r.suggestions?.length && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Actions (branded icons) */}
                    {visible.actions !== false && (
                      <td className="px-3 py-2">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border"
                            style={{ borderColor: TK.borderLight }}
                            title="View summary"
                             onClick={openDrawer}
                          >
                            <Eye className="h-4 w-4" style={{ color: "#4286F5" }} />
                          </button>
                          <button
                            className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border"
                            style={{ borderColor: TK.borderLight }}
                            title="Edit access"
                            onClick={() => alert(`Edit access → ${r.user.name}`)}
                          >
                            <PencilLine className="h-4 w-4" style={{ color: TK.brand }} />
                          </button>
                          <button
                            className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border"
                            style={{ borderColor: TK.borderLight }}
                            title="Open in Taskboard"
                            onClick={() => alert(`Open in Taskboard → ${r.user.name}`)}
                          >
                            <LayoutDashboard className="h-4 w-4" style={{ color: "#10B981" }} />
                          </button>
                          <button
                            className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border"
                            style={{ borderColor: TK.borderLight }}
                            title="Remove"
                            onClick={() => confirm(`Remove ${r.user.name}?`) && alert("Removed (demo)")}
                          >
                            <Trash2 className="h-4 w-4" style={{ color: "#EF4444" }} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan={COLS.length}>
                      No results. Adjust filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {/* smart popover for dashboard badges */}
            <TooltipHost tip={dashTip} />
          </div>
        </div>

        {/* Footer summary (optional) */}
        <div className="flex items-center justify-between p-3 border-t text-sm text-gray-600" style={{ borderColor: TK.borderLight }}>
          <div>Showing {filtered.length} of {rows.length}</div>
          <div className="inline-flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-xs">Export reflects current filters</span>
          </div>
        </div>
      </div>
    </section>
  );
}
