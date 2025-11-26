/* Section B — Advanced Table (Activity Log)
   Drop‑in React + Tailwind TSX
   ─────────────────────────────────────────────────────────────────
   Matches the “Pending Invitations” design language:
   - Same fonts & tokens
   - Filter bar with dropdown chips + Column Control button
   - Left‑aligned columns
   - Profile image for user
   - Branded icons for event types & actions
   - Project favicon + domain on hover
   - Pagination & CSV/Excel export
   - No emojis used
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Search as SearchIcon,
  Download,
  SlidersHorizontal,
  RefreshCw,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Info,
  Eye,
  Search,
  Hash,
  MoreVertical,
  Copy,
  Braces,
  Clock,
  Folder,
  Shield,
  ListChecks,
  FileText,
  BarChart3,
  Settings,
  KeyRound,
  Globe,
  FileSpreadsheet,
  FileText as FileTextDoc,
} from "lucide-react";
import ActivityDetailsModalDemo from "./ActivityDetailsModalDemo";
/* ─────────────────────────────────────────────────────────────
   Tokens (aligned with previous sections)
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
    warning: "#F59E0B",
    danger: "#EA5455",
    success: "#10B981",
    neutral: "#6C757D",
  },
};

/* ─────────────────────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const relTime = (iso: string) => {
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};
const useDebounced = (v: string, ms = 280) => {
  const [x, set] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => set(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return x;
};
const faviconUrl = (domain: string, sz = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`;
const domainOfProject = (name: string) => (name.includes(".") ? name.trim() : `${name.trim().toLowerCase()}.com`);

/* ─────────────────────────────────────────────────────────────
   Mock data (actors, projects, events) — same semantics as given
   ───────────────────────────────────────────────────────────── */
type EventRow = {
  id: string;
  ts: string;
  actor: { id: string; name: string; email: string; avatar?: string | null };
  action: string;
  project: { id: string; name: string } | null;
  mod_ule: string;
  object: { type: string; id: string; name: string };
  severity: "info" | "advisory" | "warning" | "risk";
  source: "ui" | "api" | "automation" | "system";
  summary: string;
  metadata: Record<string, any>;
};

const ACTORS = [
  { id: "u1", name: "Sara Mehta", email: "sara@agency.com" },
  { id: "u2", name: "John Smith", email: "john@agency.com" },
  { id: "u3", name: "Ana Costa", email: "ana@client.com" },
  { id: "u4", name: "Michael Rao", email: "michael@agency.com" },
  { id: "u5", name: "Lauren Chen", email: "lauren@agency.com" },
  { id: "sys", name: "System", email: "system@wranker" },
];
const PROJECTS = [
  { id: "p1", name: "wranker.com" },
  { id: "p2", name: "app.w3era.com" },
  { id: "p3", name: "client-site.io" },
  { id: "p4", name: "beta.labs.dev" },
];
const MODULES = ["seo", "content", "campaign", "reporting", "settings", "global"] as const;
const SRCS = ["ui", "api", "automation", "system"] as const;
const SEV = ["info", "advisory", "warning", "risk"] as const;
const sevColor = (s: EventRow["severity"]) =>
  s === "risk" ? TK.status.danger : s === "warning" ? TK.status.warning : s === "advisory" ? TK.brand : "#9AA4B2";

/* Event groups (branded icons instead of emojis) */
type GroupKey =
  | "auth"
  | "team"
  | "tasks"
  | "content"
  | "reporting"
  | "settings"
  | "access"
  | "project";

const GroupIcon: Record<GroupKey, React.FC<React.SVGProps<SVGSVGElement>>> = {
  auth: KeyRound,
  team: Users,
  tasks: ListChecks,
  content: FileText,
  reporting: BarChart3,
  settings: Settings,
  access: Shield,
  project: Globe,
};
const GroupColor: Record<GroupKey, string> = {
  auth: TK.brand,
  team: "#10B981",
  tasks: "#EF4444",
  content: "#3B82F6",
  reporting: "#F59E0B",
  settings: "#6B7280",
  access: "#8B5CF6",
  project: "#0EA5E9",
};

const SCHEMA: { key: GroupKey; label: string; items: [string, string][] }[] = [
  { key: "auth", label: "Authentication", items: [["auth.login", "Login"], ["auth.logout", "Logout"], ["auth.session_timeout", "Session Timeout"]] },
  { key: "team", label: "Team Management", items: [["team.invite_sent", "Invite Sent"], ["team.role.changed", "Role Changed"], ["team.removed_user", "Removed User"]] },
  { key: "tasks", label: "Task Management", items: [["task.created", "Task Created"], ["task.status_changed", "Status Changed"], ["task.reassigned", "Reassigned"], ["task.deleted", "Deleted"]] },
  { key: "content", label: "Content Actions", items: [["content.edited", "Content Edited"], ["content.ai_writer", "AI Writer Used"], ["content.plagiarism_triggered", "Plagiarism Triggered"]] },
  { key: "reporting", label: "Reporting", items: [["report.export_pdf", "Export PDF"], ["report.export_xlsx", "Export XLSX"], ["report.shared_link", "Shared Link"]] },
  { key: "settings", label: "Settings", items: [["settings.branding_changed", "Branding Changed"], ["settings.gsc_integrated", "GSC Integrated"]] },
  { key: "access", label: "Access", items: [["access.dashboard_entered", "Dashboard Entered"], ["access.permission_update", "Permission Update"]] },
  { key: "project", label: "Project", items: [["project.created", "Project Created"], ["project.domain_added", "Domain Added"], ["project.domain_deleted", "Domain Deleted"]] },
];

const actionLabel = (key: string) => {
  for (const g of SCHEMA) {
    const f = g.items.find(([k]) => k === key);
    if (f) return f[1];
  }
  return key;
};
const groupOfAction = (action: string) => SCHEMA.find((g) => g.items.some(([k]) => k === action))?.key ?? "project";

const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: readonly T[]) => arr[rnd(arr.length)];
const lastDays = (n: number) => {
  const t = Date.now() - rnd(n) * 86400000 - rnd(86400000);
  return new Date(t).toISOString();
};
function makeEvent(id: number): EventRow {
  const actor = pick(ACTORS);
  const project = Math.random() > 0.15 ? pick(PROJECTS) : null;
  const g = pick(SCHEMA);
  const [action, alabel] = pick(g.items);
  const severity: EventRow["severity"] =
    action.includes("deleted") || action.includes("role.changed")
      ? pick(["warning", "risk"] as const)
      : action.includes("export") || action.includes("shared_link")
      ? "advisory"
      : "info";
  const mod_ule = pick(MODULES);
  const source = pick(SRCS);
  const ts = lastDays(30);
  let summary = `${alabel}`;
  const md: Record<string, any> = {};
  if (action === "team.role.changed") {
    md.from = "viewer";
    md.to = Math.random() > 0.5 ? "editor" : "admin";
    md.dashboard = "seo";
    summary = `Changed role: ${md.from} → ${md.to} (${md.dashboard.toUpperCase()})`;
  }
  if (action === "access.dashboard_entered") summary = `Entered ${pick(["SEO", "Content", "Reporting"] as const)} dashboard`;
  if (action === "task.reassigned") {
    md.count = 1 + rnd(6);
    summary = `Reassigned ${md.count} task(s)`;
  }
  if (action === "report.export_xlsx") md.rows = 200 + rnd(500);
  if (action === "content.edited") {
    md.path = `/blog/post-${1 + rnd(90)}.md`;
    summary = `Content Edited — ${md.path}`;
  }
  if (action === "project.domain_deleted") summary = `Deleted domain "${project?.name || "old.example"}"`;
  return {
    id: `evt_${id}_${Math.random().toString(36).slice(2, 7)}`,
    ts,
    actor: { ...actor, avatar: `https://i.pravatar.cc/80?u=${encodeURIComponent(actor.email)}` },
    action,
    project,
    mod_ule,
    object: { type: action.split(".")[0], id: "obj_" + rnd(9999), name: alabel },
    severity,
    source,
    summary,
    metadata: md,
  };
}
function makeRows(n = 160) {
  return Array.from({ length: n }, (_, i) => makeEvent(i)).sort((a, b) => (a.ts > b.ts ? -1 : 1));
}

/* ─────────────────────────────────────────────────────────────
   Column model (left‑aligned)
   ───────────────────────────────────────────────────────────── */
type ColKey =
  | "ts"
  | "actor"
  | "action"
  | "summary"
  | "project"
  | "mod_ule"
  | "severity"
  | "source"
  | "ipua"
  | "actions";

const COLUMNS: { key: ColKey; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; min?: number; sortable?: boolean; optional?: boolean }[] =
  [
    { key: "ts", label: "Timestamp", icon: Clock, min: 220, sortable: true },
    { key: "actor", label: "User", icon: Users, min: 260, sortable: true },
    { key: "action", label: "Event Type", icon: Hash, min: 200, sortable: true },
    { key: "summary", label: "Details", icon: FileText, min: 420, sortable: true },
    { key: "project", label: "Project", icon: Folder, min: 200, sortable: true },
    { key: "mod_ule", label: "Module", icon: Settings, min: 140, sortable: true, optional: true },
    { key: "severity", label: "Severity", icon: Shield, min: 140, sortable: true, optional: true },
    { key: "source", label: "Source", icon: BarChart3, min: 140, sortable: true, optional: true },
    { key: "ipua", label: "IP / UA", icon: Globe, min: 240, optional: true },
    { key: "actions", label: "Actions", icon: MoreVertical, min: 160 },
  ];

/* ─────────────────────────────────────────────────────────────
   Header tip
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
   Dropdown chip
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
        className={`h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC] ${active ? "font-semibold" : ""}`}
        style={{ borderColor: TK.borderLight }}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 rounded-md border bg-white p-3 shadow-lg"
          style={{ borderColor: TK.borderLight, minWidth: 260 }}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Column control
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
      >
        <SlidersHorizontal className="h-4 w-4" /> Columns
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-md border bg-white p-3 text-sm shadow-lg"
          style={{ borderColor: TK.borderLight, zIndex: 50 }}
        >
          <div className="mb-2 font-semibold">Show / Hide</div>
          <div className="max-h-64 overflow-auto pr-1 space-y-1">
            {COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center justify-between gap-2 py-1">
                <span>{c.label}</span>
                <input
                  type="checkbox"
                  checked={visible[c.key] !== false}
                  onChange={(e) => setVisible((v) => ({ ...v, [c.key]: e.target.checked }))}
                  disabled={c.key === "actions" || c.key === "ts" || c.key === "actor" || c.key === "summary"}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-between">
            <button
              className="rounded border px-2 py-1 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderLight }}
              onClick={() =>
                setVisible(COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>))
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
   Sort icon (lucide)
   ───────────────────────────────────────────────────────────── */
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />;
  return dir === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-gray-700" />
  ) : (
    <ChevronDownIcon className="h-3.5 w-3.5 text-gray-700" />
  );
}

/* ─────────────────────────────────────────────────────────────
   Actions cell (branded icons)
   ───────────────────────────────────────────────────────────── */
function ActionsCell({
  row,
  onView,
  onFilterActor,
  onFilterAction,
}: {
  row: EventRow;
  onView: (r: EventRow) => void;
  onFilterActor: (id: string) => void;
  onFilterAction: (act: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-flex items-center gap-1.5 relative">
      <button
        className="h-8 w-8 grid place-items-center rounded border hover:bg-[#F7FAFC]"
        style={{ borderColor: TK.borderLight }}
        title="View details"
        onClick={() => onView(row)}
      >
        <Eye className="h-4 w-4" style={{ color: "#4286F5" }} />
      </button>
      <button
        className="h-8 w-8 grid place-items-center rounded border hover:bg-[#F7FAFC]"
        style={{ borderColor: TK.borderLight }}
        title="Filter by user"
        onClick={() => onFilterActor(row.actor.id)}
      >
        <Search className="h-4 w-4" style={{ color: TK.brand }} />
      </button>
      <button
        className="h-8 w-8 grid place-items-center rounded border hover:bg-[#F7FAFC]"
        style={{ borderColor: TK.borderLight }}
        title="Filter by event"
        onClick={() => onFilterAction(row.action)}
      >
        <Hash className="h-4 w-4" style={{ color: "#10B981" }} />
      </button>

      <button
        className="h-8 w-8 grid place-items-center rounded border hover:bg-[#F7FAFC]"
        style={{ borderColor: TK.borderLight }}
        title="More"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-50 rounded-md border bg-white p-2 shadow-lg w-40"
          style={{ borderColor: TK.borderLight }}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-[#F7FAFC] inline-flex items-center gap-2"
            onClick={() => navigator.clipboard.writeText(row.id)}
          >
            <Copy className="h-4 w-4" /> Copy ID
          </button>
          <button
            className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-[#F7FAFC] inline-flex items-center gap-2"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(row, null, 2))}
          >
            <Braces className="h-4 w-4" /> Copy JSON
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────── */
export default function ActivityLogTable() {
  const [rows] = useState<EventRow[]>(() => makeRows(180));

  /* Column visibility */
  const [visible, setVisible] = useState<Record<ColKey, boolean>>(
    COLUMNS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as Record<ColKey, boolean>)
  );
  const colList = useMemo(() => COLUMNS.filter((c) => visible[c.key] !== false), [visible]);

  /* Sorting */
  const [sortKey, setSortKey] = useState<ColKey>("ts");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  /* Filters */
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [selUsers, setSelUsers] = useState<string[]>([]);
  const [selProjects, setSelProjects] = useState<string[]>([]);
  const [selActions, setSelActions] = useState<string[]>([]);
  const [range, setRange] = useState<"today" | "7d" | "30d">("30d");
  const [sev, setSev] = useState<EventRow["severity"][]>([]);
  const [src, setSrc] = useState<EventRow["source"][]>([]);

  const resetFilters = () => {
    setQ("");
    setSelUsers([]);
    setSelProjects([]);
    setSelActions([]);
    setRange("30d");
    setSev([]);
    setSrc([]);
  };

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    const start =
      range === "today"
        ? new Date(toISODate(new Date())).getTime()
        : Date.now() - (range === "7d" ? 7 : 30) * 86400000;
    return t >= start;
  };

  const filtered = useMemo(() => {
    const qq = dq.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inRange(r.ts)) return false;
      if (selUsers.length && !selUsers.includes(r.actor.id)) return false;
      if (selProjects.length && !(r.project && selProjects.includes(r.project.id))) return false;
      if (selActions.length && !selActions.includes(r.action)) return false;
      if (sev.length && !sev.includes(r.severity)) return false;
      if (src.length && !src.includes(r.source)) return false;
      if (qq) {
        const hay = `${r.actor.name} ${r.actor.email} ${r.summary} ${r.object?.name || ""}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [rows, dq, selUsers, selProjects, selActions, sev, src, range]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: EventRow): any =>
      sortKey === "ts"
        ? r.ts
        : sortKey === "actor"
        ? r.actor.name
        : sortKey === "action"
        ? actionLabel(r.action)
        : sortKey === "project"
        ? r.project?.name || ""
        : sortKey === "summary"
        ? r.summary
        : sortKey === "severity"
        ? r.severity
        : sortKey === "source"
        ? r.source
        : r.ts;
    arr.sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      if (av === bv) return sortDir === "asc" ? (a.ts > b.ts ? 1 : -1) : a.ts < b.ts ? 1 : -1;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [pages, page]);
  const start = (page - 1) * pageSize;
  const view = sorted.slice(start, start + pageSize);

  /* Export */
  const exportCSV = () => {
    const header = ["Timestamp", "User", "Email", "Event", "Details", "Project", "Module", "Severity", "Source", "ID"];
    const body = sorted.map((r) => [
      r.ts,
      r.actor.name,
      r.actor.email,
      actionLabel(r.action),
      r.summary,
      r.project?.name || "",
      r.mod_ule,
      r.severity,
      r.source,
      r.id,
    ]);
    const csv =
      [header, ...body]
        .map((row) => row.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "activity-log.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportXLSX = () => exportCSV(); // demo parity

  /* Modal */
  const [modal, setModal] = useState<EventRow | null>(null);
  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
       if (e) e.stopPropagation();
    setDrawerRow(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
  
  return (
    <section className="space-y-3 mt-4" style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
                              {drawerRow && (
          <div
            style={{
              display:"hidden",
              position: "absolute",
              zIndex: 1001,
              padding: "20px",
            }}
            onClick={e => e.stopPropagation()}
          >
                      <ActivityDetailsModalDemo   onClose={closeDrawer} />
                    </div> 
                  )}
      <div className="border mx-4 rounded-xl overflow-hidden" style={{ borderColor: TK.border }}>
        {/* Header */}
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: TK.brand }} />
            <h3 className="text-lg font-semibold text-foreground">Activity Log</h3>
            <HeaderTip tip="System and user events across projects and dashboards.">
              <span className="sr-only">Info</span>
            </HeaderTip>
            <span
              className="ml-2 px-2 py-0.5 rounded border text-xs text-muted-foreground"
              style={{ borderColor: TK.borderLight }}
            >
              {sorted.length} events
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ColumnControl visible={visible} setVisible={setVisible} />

            <div className="relative">
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderLight }}
                onClick={exportCSV}
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
            <div className="relative">
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderLight }}
                onClick={exportXLSX}
              >
                <FileSpreadsheet className="h-4 w-4" /> Export Excel
              </button>
            </div>

            <button
              className="h-8 px-2 text-muted-foreground rounded border hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderLight }}
              title="Refresh"
              onClick={() => void 0}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="px-4 py-3 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-[300px] pl-7 h-8 rounded border text-sm outline-none"
                style={{ borderColor: TK.borderLight }}
                placeholder="Search user, object, or details…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Users */}
            <ChipDropdown
              label={<span className={selUsers.length ? "font-semibold" : ""}>Users {selUsers.length ? `(${selUsers.length})` : ""}</span>}
              active={selUsers.length > 0}
            >
              <div className="text-sm font-medium mb-2">Filter by user</div>
              {ACTORS.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={selUsers.includes(u.id)}
                    onChange={(e) =>
                      setSelUsers((s) => (e.target.checked ? [...s, u.id] : s.filter((x) => x !== u.id)))
                    }
                  />
                  <span className="inline-flex items-center gap-2">
                    <img
                      src={`https://i.pravatar.cc/80?u=${encodeURIComponent(u.email)}`}
                      alt=""
                      className="h-4 w-4 rounded-full"
                    />
                    {u.name}
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </span>
                </label>
              ))}
            </ChipDropdown>

            {/* Projects */}
            <ChipDropdown
              label={<span className={selProjects.length ? "font-semibold" : ""}>Projects {selProjects.length ? `(${selProjects.length})` : ""}</span>}
              active={selProjects.length > 0}
            >
              <div className="text-sm font-medium mb-2">Filter by project</div>
              <div className="max-h-52 overflow-auto pr-1">
                {PROJECTS.map((p) => {
                  const dom = domainOfProject(p.name);
                  return (
                    <label key={p.id} className="flex items-center gap-2 text-sm py-1">
                      <input
                        type="checkbox"
                        checked={selProjects.includes(p.id)}
                        onChange={(e) =>
                          setSelProjects((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                        }
                      />
                      <span className="inline-flex items-center gap-2">
                        <img src={faviconUrl(dom, 32)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                        <span title={dom}>{p.name}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </ChipDropdown>

            {/* Event types (grouped) */}
            <ChipDropdown
              label={<span className={selActions.length ? "font-semibold" : ""}>Event Types {selActions.length ? `(${selActions.length})` : ""}</span>}
              active={selActions.length > 0}
            >
              <div className="text-sm font-medium mb-2">Filter by event type</div>
              <div className="space-y-2">
                {SCHEMA.map((g) => {
                  const GI = GroupIcon[g.key];
                  const allKeys = g.items.map(([k]) => k);
                  const allOn = allKeys.every((k) => selActions.includes(k));
                  return (
                    <div key={g.key} className="border rounded p-2" style={{ borderColor: TK.borderLight }}>
                      <div className="flex items-center gap-2 mb-2">
                        <GI className="h-3.5 w-3.5" style={{ color: GroupColor[g.key] }} />
                        <span className="font-medium">{g.label}</span>
                        <button
                          className="ml-auto text-xs px-2 py-0.5 rounded border hover:bg-[#F7FAFC]"
                          style={{ borderColor: TK.borderLight }}
                          onClick={() =>
                            setSelActions((s) =>
                              allOn ? s.filter((k) => !allKeys.includes(k)) : Array.from(new Set([...s, ...allKeys]))
                            )
                          }
                        >
                          {allOn ? "Unselect" : "Select all"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {g.items.map(([k, lbl]) => (
                          <label key={k} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selActions.includes(k)}
                              onChange={(e) =>
                                setSelActions((s) => (e.target.checked ? [...s, k] : s.filter((x) => x !== k)))
                              }
                            />
                            <span className="inline-flex items-center gap-1.5">
                              <GI className="h-3 w-3" style={{ color: GroupColor[g.key] }} />
                              {lbl}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChipDropdown>

            {/* Date range */}
            <ChipDropdown label={<span>Date Range</span>} active={range !== "30d"}>
              <div className="text-sm font-medium mb-2">Select range</div>
              {(["today", "7d", "30d"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm py-1">
                  <input type="radio" name="range" checked={range === k} onChange={() => setRange(k)} />
                  <span className="capitalize">{k === "7d" ? "Last 7 days" : k === "30d" ? "Last 30 days" : "Today"}</span>
                </label>
              ))}
            </ChipDropdown>

            {/* Severity */}
            <ChipDropdown label={<span>Severity</span>} active={sev.length > 0}>
              <div className="text-sm font-medium mb-2">Filter by severity</div>
              {SEV.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={sev.includes(k)}
                    onChange={(e) => setSev((s) => (e.target.checked ? [...s, k] : s.filter((x) => x !== k)))}
                  />
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: sevColor(k) }} />
                    {k[0].toUpperCase() + k.slice(1)}
                  </span>
                </label>
              ))}
            </ChipDropdown>

            {/* Source */}
            <ChipDropdown label={<span>Source</span>} active={src.length > 0}>
              <div className="text-sm font-medium mb-2">Filter by source</div>
              {SRCS.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={src.includes(k)}
                    onChange={(e) => setSrc((s) => (e.target.checked ? [...s, k] : s.filter((x) => x !== k)))}
                  />
                  <span className="uppercase">{k}</span>
                </label>
              ))}
            </ChipDropdown>

            {/* Reset */}
            <button
              className="ml-auto h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderLight }}
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-white sticky top-0 z-20" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
                <tr className="hover:bg-white">
                  {colList.map((c) => {
                    const Icon = c.icon;
                    return (
                      <th key={c.key} className="px-3 py-2 text-left text-[12px] font-semibold text-gray-700" style={{ minWidth: c.min }}>
                        <button
                          className="inline-flex items-center gap-1.5 hover:text-black"
                          onClick={() => {
                            if (!c.sortable) return;
                            if (sortKey !== c.key) {
                              setSortKey(c.key);
                              setSortDir("desc");
                            } else {
                              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                            }
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                          <HeaderTip
                            tip={
                              c.key === "action"
                                ? "Grouped event type"
                                : c.key === "project"
                                ? "Project context (hover for domain)"
                                : undefined
                            }
                          >
                            <span>{c.label}</span>
                          </HeaderTip>
                          {c.sortable && <SortIcon active={sortKey === c.key} dir={sortDir} />}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {view.length === 0 && (
                  <tr>
                    <td colSpan={colList.length} className="px-4 py-10 text-center text-sm text-gray-500">
                      No logs match your filters.
                    </td>
                  </tr>
                )}
                {view.map((r) => {
                  const GI = GroupIcon[groupOfAction(r.action)];
                  const gColor = GroupColor[groupOfAction(r.action)];
                  return (
                    <tr key={r.id} className="hover:bg-[rgba(16,144,208,0.03)] border-b" style={{ borderColor: TK.borderLight }}>
                      {/* Timestamp */}
                      {visible.ts !== false && (
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span>{new Date(r.ts).toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{relTime(r.ts)}</span>
                          </div>
                        </td>
                      )}
                      {/* User (avatar + name + email) */}
                      {visible.actor !== false && (
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={r.actor.avatar || `https://i.pravatar.cc/80?u=${encodeURIComponent(r.actor.email)}`}
                              alt={r.actor.name}
                              className="h-8 w-8 rounded-full object-cover border"
                              style={{ borderColor: TK.borderLight }}
                            />
                            <div>
                              <button
                                className="text-[14px] font-medium text-[#0B4C6C] underline underline-offset-2 hover:text-[#08384f] cusror-pointer"
                                title="Filter by this user"
                                onClick={openDrawer}
                              >
                                {r.actor.name}
                              </button>
                              <div className="text-xs text-gray-500">{r.actor.email}</div>
                            </div>
                          </div>
                        </td>
                      )}
                      {/* Event Type (branded icon) */}
                      {visible.action !== false && (
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs bg-white"
                            style={{ borderColor: TK.borderLight }}
                            title={actionLabel(r.action)}
                            onClick={() => {
                              if (!selActions.includes(r.action)) setSelActions((s) => [...s, r.action]);
                              setPage(1);
                            }}
                          >
                            <GI className="h-3.5 w-3.5" style={{ color: gColor }} />
                            {actionLabel(r.action)}
                          </span>
                        </td>
                      )}
                      {/* Details */}
                      {visible.summary !== false && (
                        <td className="px-3 py-2">
                          <div className="truncate" title={r.summary}>{r.summary}</div>
                        </td>
                      )}
                      {/* Project (favicon + name, hover domain) */}
                      {visible.project !== false && (
                        <td className="px-3 py-2">
                          {r.project ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs bg-white"
                              style={{ borderColor: TK.borderLight }}
                              title={domainOfProject(r.project.name)}
                              onClick={() => {
                                if (!selProjects.includes(r.project!.id)) setSelProjects((s) => [...s, r.project!.id]);
                                setPage(1);
                              }}
                            >
                              <img
                                src={faviconUrl(domainOfProject(r.project.name), 32)}
                                alt=""
                                className="h-3.5 w-3.5 rounded-sm"
                              />
                              {r.project.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                      {/* Module */}
                      {visible.mod_ule !== false && (
                        <td className="px-3 py-2">
                          <span className="uppercase">{r.mod_ule}</span>
                        </td>
                      )}
                      {/* Severity */}
                      {visible.severity !== false && (
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                            style={{
                              background:
                                r.severity === "risk"
                                  ? "rgba(239,68,68,0.12)"
                                  : r.severity === "warning"
                                  ? "rgba(245,158,11,0.12)"
                                  : r.severity === "advisory"
                                  ? "rgba(16,144,208,0.12)"
                                  : TK.subtle,
                              color:
                                r.severity === "risk"
                                  ? "#7A1D1F"
                                  : r.severity === "warning"
                                  ? "#7A4A00"
                                  : r.severity === "advisory"
                                  ? TK.brand
                                  : TK.muted,
                            }}
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ background: sevColor(r.severity) }}
                            />
                            {r.severity[0].toUpperCase() + r.severity.slice(1)}
                          </span>
                        </td>
                      )}
                      {/* Source */}
                      {visible.source !== false && (
                        <td className="px-3 py-2">
                          <span className="uppercase">{r.source}</span>
                        </td>
                      )}
                      {/* IP/UA */}
                      {visible.ipua !== false && (
                        <td className="px-3 py-2">
                          <span className="text-gray-600">106.75.*.* · Chrome · macOS</span>
                        </td>
                      )}
                      {/* Actions */}
                      {visible.actions !== false && (
                        <td className="px-3 py-2">
                          <ActionsCell
                            row={r}
                            onView={setModal}
                            onFilterActor={(id) => {
                              setSelUsers([id]);
                              setPage(1);
                            }}
                            onFilterAction={(act) => {
                              setSelActions([act]);
                              setPage(1);
                            }}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer / pagination */}
        <div className="flex items-center justify-between p-3 border-t text-sm text-gray-600" style={{ borderColor: TK.borderLight }}>
          <div>
            Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + view.length)} of {sorted.length}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-8 px-2 rounded border"
              style={{ borderColor: TK.borderLight }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              className="h-8 px-3 rounded border hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{ borderColor: TK.borderLight }}
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              First
            </button>
            <button
              className="h-8 px-3 rounded border hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{ borderColor: TK.borderLight }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <div className="text-sm w-16 text-center">
              {page} / {pages}
            </div>
            <button
              className="h-8 px-3 rounded border hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{ borderColor: TK.borderLight }}
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </button>
            <button
              className="h-8 px-3 rounded border hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{ borderColor: TK.borderLight }}
              disabled={page >= pages}
              onClick={() => setPage(pages)}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Modal (details) */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-[820px] max-h-[80vh] overflow-auto bg-white border rounded-xl shadow-xl"
            style={{ borderColor: TK.border }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TK.borderLight }}>
              <div className="flex items-center gap-2">
                {React.createElement(GroupIcon[groupOfAction(modal.action)], {
                  className: "h-4 w-4",
                  style: { color: GroupColor[groupOfAction(modal.action)] },
                })}
                <h4 className="font-semibold">
                  {actionLabel(modal.action)} · {new Date(modal.ts).toLocaleString()}
                </h4>
              </div>
              <button
                className="h-8 px-3 rounded border text-sm hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderLight }}
                onClick={() => setModal(null)}
              >
                Close
              </button>
            </div>
            <pre className="text-xs p-4 overflow-auto bg-[#0B1220] text-[#E8EEF9]">
{JSON.stringify(modal, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
