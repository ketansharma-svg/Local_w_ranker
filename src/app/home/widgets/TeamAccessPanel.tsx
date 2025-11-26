"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Folder,
  Search as SearchIcon,
  Download,
  SlidersHorizontal,
  RefreshCw,
  ChevronDown,
  Info,
  Shield,
  UserPlus,
  PencilLine,
  Trash2,
  ExternalLink,
  KeyRound,
  Clock,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Tokens (aligned with latest panels)
   ───────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD", // branded icon & accent
  brandHover: "rgba(0,140,205,0.10)",
  text: "#111827",
  muted: "#6B7280",
  card: "#FFFFFF",
  surface: "#F5F7FA",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  radius: "12px",
  role: {
    Owner: { bg: "rgba(0,140,205,0.10)", color: "#008CCD" },
    Admin: { bg: "rgba(0,140,205,0.10)", color: "#008CCD" },
    Editor: { bg: "rgba(16,185,129,0.12)", color: "#0C5E3B" },
    Viewer: { bg: "rgba(148,163,184,0.18)", color: "#334155" },
  },
  status: {
    pending: { bg: "rgba(255,159,67,0.12)", color: "#7A4A00" },
    active: { bg: "rgba(40,199,111,0.12)", color: "#0C5E3B" },
    inactive: { bg: "rgba(148,163,184,0.18)", color: "#334155" },
  },
} as const;

const FONT =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

const cls = (...xs: Array<string | false | undefined | any>) => xs.filter(Boolean).join(" ");

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */
type Role = "Owner" | "Admin" | "Editor" | "Viewer";
type Status = "active" | "inactive" | "pending";
type Group = "Client A" | "Client B" | "Internal Initiatives";

type Project = {
  id: string;
  name: string; // e.g. wranker.com or Project Alpha    
  group: Group;
  domain: string; // derived for favicon/title
};

type Member = {
  id: string;
  name: string;
  email: string;
  status: Status;
  avatar?: string | null;
};

type AccessOnProject = { memberId: string; projectId: string; role: Role; lastAccessAt?: string | null };

type ProjectRow = {
  project: Project;
  members: number;
  roles: Record<Role, number>;
  pendingInvites: number;
  lastActivityAt: string | null;
};

type MemberRow = {
  member: Member;
  rolesDistinct: Role[];
  projects: { project: Project; role: Role; lastAccessAt?: string | null }[];
  lastActiveAt: string | null;
};

/* ─────────────────────────────────────────────────────────────
   Demo data (safe defaults)
   ───────────────────────────────────────────────────────────── */
const projects: Project[] = [
  { id: "p1", name: "wranker.com", group: "Client A", domain: "wranker.com" },
  { id: "p2", name: "app.w3era.com", group: "Client A", domain: "app.w3era.com" },
  { id: "p3", name: "client-site.io", group: "Client B", domain: "client-site.io" },
  { id: "p4", name: "internal-tools", group: "Internal Initiatives", domain: "tools.internal" },
];

const members: Member[] = [
  { id: "u1", name: "Ana Costa", email: "ana.costa@agency.com", status: "inactive", avatar: null },
  { id: "u2", name: "Aditya Chauhan", email: "aditya.chauhan@agency.com", status: "pending", avatar: null },
  { id: "u3", name: "Arjun Rao", email: "arjun.rao@agency.com", status: "active", avatar: null },
  { id: "u4", name: "Ethan Brown", email: "ethan.brown@agency.com", status: "inactive", avatar: null },
  { id: "u5", name: "Karan Malhotra", email: "karan.malhotra@agency.com", status: "active", avatar: null },
];

const access: AccessOnProject[] = [
  { memberId: "u1", projectId: "p1", role: "Editor", lastAccessAt: "2025-08-27T10:22:00Z" },
  { memberId: "u1", projectId: "p2", role: "Editor", lastAccessAt: null },
  { memberId: "u2", projectId: "p1", role: "Viewer", lastAccessAt: null },
  { memberId: "u2", projectId: "p2", role: "Editor", lastAccessAt: null },
  { memberId: "u3", projectId: "p1", role: "Viewer", lastAccessAt: "2025-08-30T10:22:00Z" },
  { memberId: "u3", projectId: "p3", role: "Viewer", lastAccessAt: "2025-08-17T10:22:00Z" },
  { memberId: "u4", projectId: "p1", role: "Viewer", lastAccessAt: null },
  { memberId: "u5", projectId: "p1", role: "Viewer", lastAccessAt: "2025-08-31T07:40:00Z" },
  { memberId: "u5", projectId: "p3", role: "Editor", lastAccessAt: "2025-08-30T12:10:00Z" },
];

const pendingInvites: Record<string, number> = {
  p1: 1,
  p2: 0,
  p3: 0,
  p4: 2,
};

/* ─────────────────────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────────────────────── */
const faviconUrl = (domain: string, sz = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`;

const relDate = (iso: string | null | undefined) => {
  if (!iso) return "Never";
  const now = Date.now();
  const ts = new Date(iso).getTime();
  const d = Math.max(0, Math.floor((now - ts) / 86400000));
  return d === 0 ? "Today" : `${d}d ago`;
};

function downloadCSV(filename: string, lines: string[]) {
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ─────────────────────────────────────────────────────────────
   Column models (two pivots)
   ───────────────────────────────────────────────────────────── */
type Pivot = "projects" | "members";

/** Projects pivot columns */
type PColKey = "project" | "group" | "members" | "roles" | "pending" | "last" | "actions";
const P_COLS: { key: PColKey; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; min?: number; sticky?: boolean }[] =
  [
    { key: "project", label: "Project", icon: Folder, min: 300, sticky: true },
    { key: "group", label: "Group/Folder", icon: Folder, min: 200, sticky: true },
    { key: "members", label: "Members", icon: Users, min: 120 },
    { key: "roles", label: "Role Mix", icon: Shield, min: 260 },
    { key: "pending", label: "Invites", icon: UserPlus, min: 120 },
    { key: "last", label: "Last Activity", icon: Clock, min: 180 },
    { key: "actions", label: "Actions", icon: KeyRound, min: 180 },
  ];

/** Members pivot columns */
type MColKey = "member" | "email" | "roles" | "projects" | "last" | "status" | "actions";
const M_COLS: { key: MColKey; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; min?: number; sticky?: boolean }[] =
  [
    { key: "member", label: "Member", icon: Users, min: 280, sticky: true },
    { key: "email", label: "Email", icon: Users, min: 260, sticky: true },
    { key: "roles", label: "Roles", icon: Shield, min: 200 },
    { key: "projects", label: "Projects", icon: Folder, min: 260 },
    { key: "last", label: "Last Active", icon: Clock, min: 160 },
    { key: "status", label: "Status", icon: Info, min: 140 },
    { key: "actions", label: "Actions", icon: KeyRound, min: 180 },
  ];

/* ─────────────────────────────────────────────────────────────
   Shared UI atoms (modular chips, dropdown, column control)
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
          "h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC] cursor-pointer",
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
          style={{ borderColor: TK.borderLight, minWidth: 240 }}
          onMouseLeave={() => setOpen(false)}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function PastelToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border p-0.5"
      style={{ borderColor: TK.borderLight, background: "#FFFFFF" }}
      role="group"
      aria-label="Toggle view"
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          className={cls("px-3 py-1.5 text-sm rounded cursor-pointer", value === opt.key ? "font-semibold" : "text-gray-700")}
          style={{ background: value === opt.key ? TK.brandHover : "transparent", color: value === opt.key ? TK.brand : undefined }}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ColumnControl<K extends string>({
  all,
  visible,
  setVisible,
  stickyFirstKey,
}: {
  all: { key: K; label: string }[];
  stickyFirstKey: K;
  visible: Record<K, boolean>;
  setVisible: React.Dispatch<React.SetStateAction<Record<K, boolean>>>;
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
        className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC] cursor-pointer"
        style={{ borderColor: TK.borderLight }}
        onClick={() => setOpen((o) => !o)}
        title="Columns"
      >
        <SlidersHorizontal className="h-4 w-4" /> Columns
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-md border bg-white p-3 text-sm shadow-lg" style={{ borderColor: TK.borderLight }}>
          <div className="mb-2 font-semibold">Show / Hide</div>
          <div className="max-h-64 space-y-1 overflow-auto pr-1">
            {all.map((c) => (
              <label key={String(c.key)} className="flex items-center justify-between gap-2 py-1">
                <span>{c.label}</span>
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={visible[c.key] !== false}
                  onChange={(e) => setVisible((v) => ({ ...v, [c.key]: e.target.checked }))}
                  disabled={c.key === stickyFirstKey}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-between">
            <button
              className="rounded border px-2 py-1 hover:bg-[#F7FAFC] cursor-pointer"
              style={{ borderColor: TK.borderLight }}
              onClick={() => setVisible(all.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<K, boolean>))}
            >
              Reset
            </button>
            <button
              className="rounded border px-2 py-1 hover:bg-[#F7FAFC] cursor-pointer"
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
   Drawers (Share / Edit Access) — demo stubs
   ───────────────────────────────────────────────────────────── */
function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000]" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[420px] bg-white shadow-xl border-l" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="inline-flex items-center gap-2">
            <KeyRound className="h-5 w-5" style={{ color: TK.brand }} />
            <h4 className="text-[15px] font-semibold">{title}</h4>
          </div>
          <button className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] cursor-pointer" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────── */
export default function TeamAccessPanel() {
  /** Pivot */
  const [pivot, setPivot] = useState<Pivot>("projects");

  /** Search & filters */
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const [roleSel, setRoleSel] = useState<Record<Role, boolean>>({
    Owner: false,
    Admin: false,
    Editor: false,
    Viewer: false,
  });
  const roleValues = useMemo(() => (Object.keys(roleSel) as Role[]).filter((k) => roleSel[k]), [roleSel]);

  const [groupSel, setGroupSel] = useState<Record<Group, boolean>>({
    "Client A": false,
    "Client B": false,
    "Internal Initiatives": false,
  });
  const groupValues = useMemo(() => (Object.keys(groupSel) as Group[]).filter((k) => groupSel[k]), [groupSel]);

  const [statusSel, setStatusSel] = useState<Record<Status, boolean>>({
    active: false,
    inactive: false,
    pending: false,
  });
  const statusValues = useMemo(() => (Object.keys(statusSel) as Status[]).filter((k) => statusSel[k]), [statusSel]);

  const [onlyWithInvites, setOnlyWithInvites] = useState(false);

  /** Column visibility */
  const [visP, setVisP] = useState<Record<PColKey, boolean>>(
    P_COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<PColKey, boolean>)
  );
  const [visM, setVisM] = useState<Record<MColKey, boolean>>(
    M_COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<MColKey, boolean>)
  );

  /** Build derived rows */
  const projectRows: ProjectRow[] = useMemo(() => {
    return projects.map((p) => {
      const a = access.filter((x) => x.projectId === p.id);
      const roles: Record<Role, number> = { Owner: 0, Admin: 0, Editor: 0, Viewer: 0 };
      a.forEach((x) => (roles[x.role] = (roles[x.role] || 0) + 1));
      const membersCount = new Set(a.map((x) => x.memberId)).size;
      const last = a
        .map((x) => x.lastAccessAt)
        .filter(Boolean)
        .map((d) => new Date(d as string).getTime())
        .sort((a, b) => b - a)[0];
      return {
        project: p,
        members: membersCount,
        roles,
        pendingInvites: pendingInvites[p.id] || 0,
        lastActivityAt: last ? new Date(last).toISOString() : null,
      };
    });
  }, []);

  const memberRows: MemberRow[] = useMemo(() => {
    return members.map((m) => {
      const a = access.filter((x) => x.memberId === m.id);
      const proj = a.map((x) => ({
        project: projects.find((p) => p.id === x.projectId)!,
        role: x.role,
        lastAccessAt: x.lastAccessAt,
      }));
      const rolesDistinct = Array.from(new Set(a.map((x) => x.role)));
      const last = a
        .map((x) => x.lastAccessAt)
        .filter(Boolean)
        .map((d) => new Date(d as string).getTime())
        .sort((a, b) => b - a)[0];
      return {
        member: {
          ...m,
          avatar: m.avatar ?? `https://i.pravatar.cc/80?u=${encodeURIComponent(m.email)}`,
        },
        rolesDistinct,
        projects: proj,
        lastActiveAt: last ? new Date(last).toISOString() : null,
      };
    });
  }, []);

  /** Sort state */
  const [sortP, setSortP] = useState<{ key: PColKey; dir: "asc" | "desc" }>({ key: "project", dir: "asc" });
  const [sortM, setSortM] = useState<{ key: MColKey; dir: "asc" | "desc" }>({ key: "member", dir: "asc" });

  /** Expansion */
  const [exp, setExp] = useState<Record<string, boolean>>({}); // id: expanded?

  /** Drawers */
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<{ open: boolean; context?: { project?: Project; member?: Member } }>({ open: false });

  /** Filtered */
  const filteredProjects = useMemo(() => {
    let out = projectRows;
    if (debouncedQ) {
      const s = debouncedQ;
      out = out.filter((r) => r.project.name.toLowerCase().includes(s) || r.project.group.toLowerCase().includes(s));
    }
    if (roleValues.length) {
      out = out.filter((r) => roleValues.some((rv) => (r.roles[rv] || 0) > 0));
    }
    if (groupValues.length) out = out.filter((r) => groupValues.includes(r.project.group));
    if (onlyWithInvites) out = out.filter((r) => r.pendingInvites > 0);
    // sort
    const arr = [...out];
    const { key, dir } = sortP;
    arr.sort((a, b) => {
      const av =
        key === "project"
          ? a.project.name
          : key === "group"
          ? a.project.group
          : key === "members"
          ? a.members
          : key === "pending"
          ? a.pendingInvites
          : key === "last"
          ? a.lastActivityAt || ""
          : key === "roles"
          ? a.roles.Editor + a.roles.Viewer + a.roles.Admin + a.roles.Owner
          : a.project.name;
      const bv =
        key === "project"
          ? b.project.name
          : key === "group"
          ? b.project.group
          : key === "members"
          ? b.members
          : key === "pending"
          ? b.pendingInvites
          : key === "last"
          ? b.lastActivityAt || ""
          : key === "roles"
          ? b.roles.Editor + b.roles.Viewer + b.roles.Admin + b.roles.Owner
          : b.project.name;
      if (av === bv) return 0;
      return dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [projectRows, debouncedQ, roleValues, groupValues, onlyWithInvites, sortP]);

  const filteredMembers = useMemo(() => {
    let out = memberRows;
    if (debouncedQ) {
      const s = debouncedQ;
      out = out.filter((r) => r.member.name.toLowerCase().includes(s) || r.member.email.toLowerCase().includes(s));
    }
    if (roleValues.length) out = out.filter((r) => r.rolesDistinct.some((rv) => roleValues.includes(rv)));
    if (statusValues.length) out = out.filter((r) => statusValues.includes(r.member.status));
    // sort
    const arr = [...out];
    const { key, dir } = sortM;
    arr.sort((a, b) => {
      const av =
        key === "member"
          ? a.member.name
          : key === "email"
          ? a.member.email
          : key === "projects"
          ? a.projects.length
          : key === "last"
          ? a.lastActiveAt || ""
          : key === "status"
          ? a.member.status
          : key === "roles"
          ? a.rolesDistinct.length
          : a.member.name;
      const bv =
        key === "member"
          ? b.member.name
          : key === "email"
          ? b.member.email
          : key === "projects"
          ? b.projects.length
          : key === "last"
          ? b.lastActiveAt || ""
          : key === "status"
          ? b.member.status
          : key === "roles"
          ? b.rolesDistinct.length
          : b.member.name;
      if (av === bv) return 0;
      return dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [memberRows, debouncedQ, roleValues, statusValues, sortM]);

  /** sticky left widths */
  const stickyLeftP = (key: PColKey) => {
    let left = 0;
    for (const c of P_COLS) {
      if (c.key === key) break;
      if (c.sticky && visP[c.key] !== false) left += (c.min ?? 200);
    }
    return left;
  };
  const stickyLeftM = (key: MColKey) => {
    let left = 0;
    for (const c of M_COLS) {
      if (c.key === key) break;
      if (c.sticky && visM[c.key] !== false) left += (c.min ?? 200);
    }
    return left;
  };

  /** Export */
  const exportProjectsCSV = () => {
    const header = ["project", "group", "members", "owner", "admin", "editor", "viewer", "pending", "last_activity"];
    const lines = [header.join(",")];
    filteredProjects.forEach((r) =>
      lines.push(
        [
          r.project.name,
          r.project.group,
          r.members,
          r.roles.Owner || 0,
          r.roles.Admin || 0,
          r.roles.Editor || 0,
          r.roles.Viewer || 0,
          r.pendingInvites,
          r.lastActivityAt || "",
        ].join(",")
      )
    );
    downloadCSV("team-access-projects.csv", lines);
  };
  const exportMembersCSV = () => {
    const header = ["name", "email", "roles", "projects", "last_active", "status"];
    const lines = [header.join(",")];
    filteredMembers.forEach((r) =>
      lines.push([
        `"${r.member.name}"`,
        r.member.email,
        `"${r.rolesDistinct.join("|")}"`,
        r.projects.length,
        r.lastActiveAt || "",
        r.member.status,
      ].join(","))
    );
    downloadCSV("team-access-members.csv", lines);
  };

  /** Handlers (demo) */
  const onShareAccess = () => setShareOpen(true);
  const onEditAccess = (ctx?: { project?: Project; member?: Member }) => setEditOpen({ open: true, context: ctx });
  const onRemove = (label: string) => {
    if (confirm(`Remove access: ${label}?`)) alert("Removed (demo)");
  };

  /** Visible columns */
  const visibleP = P_COLS.filter((c) => visP[c.key] !== false);
  const visibleM = M_COLS.filter((c) => visM[c.key] !== false);

  const totalCount = pivot === "projects" ? filteredProjects.length : filteredMembers.length;

  return (
    <section className="space-y-3 mt-4" style={{ fontFamily: FONT }}>
      <div className="border w-full rounded-xl overflow-hidden bg-white" style={{ borderColor: TK.border }}>
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: TK.brand }} />
            <h3 className="text-lg font-semibold" style={{ color: TK.text }}>
              Team & Access
            </h3>
            <span className="inline-flex items-center gap-1 cursor-help">
              <Info className="h-4 w-4 text-[#9E9E9E]" />
            </span>
            <span className="ml-2 px-2 py-0.5 rounded border text-xs text-muted-foreground" style={{ borderColor: TK.borderLight }}>
              {totalCount} {pivot === "projects" ? "projects" : "members"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PastelToggle
              value={pivot}
              options={[
                { key: "projects" as Pivot, label: "By Projects" },
                { key: "members" as Pivot, label: "By Members" },
              ]}
              onChange={setPivot}
            />

            {pivot === "projects" ? (
              <ColumnControl
                all={P_COLS.map((c) => ({ key: c.key, label: c.label }))}
                stickyFirstKey={"project"}
                visible={visP}
                setVisible={setVisP}
              />
            ) : (
              <ColumnControl
                all={M_COLS.map((c) => ({ key: c.key, label: c.label }))}
                stickyFirstKey={"member"}
                visible={visM}
                setVisible={setVisM}
              />
            )}

            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC] cursor-pointer"
              style={{ borderColor: TK.borderLight }}
              onClick={pivot === "projects" ? exportProjectsCSV : exportMembersCSV}
              title="Export CSV"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              className="h-8 w-8 grid place-items-center text-muted-foreground rounded border hover:bg-[#F7FAFC] cursor-pointer"
              style={{ borderColor: TK.borderLight }}
              title="Refresh"
              onClick={() => void 0}
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC] cursor-pointer"
              style={{ borderColor: TK.borderLight }}
              title="Share access"
              onClick={onShareAccess}
            >
              <UserPlus className="h-4 w-4" style={{ color: TK.brand }} />
              Share Access
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-[280px] pl-7 h-8 rounded border text-sm outline-none"
                style={{ borderColor: TK.borderLight }}
                placeholder={pivot === "projects" ? "Search projects or groups…" : "Search members or email…"}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Role filter */}
            <ChipDropdown
              label={
                <span className={cls(roleValues.length && "text-foreground font-semibold")}>
                  Roles {roleValues.length ? `(${roleValues.length})` : ""}
                </span>
              }
              active={roleValues.length > 0}
            >
              <div className="text-sm font-medium mb-2">Filter by role</div>
              {(Object.keys(TK.role) as Role[]).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={!!roleSel[r]}
                    onChange={(e) => setRoleSel((s) => ({ ...s, [r]: e.target.checked }))}
                  />
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs"
                    style={{ borderColor: TK.borderLight, background: TK.role[r].bg, color: TK.role[r].color }}
                  >
                    <Shield className="h-3.5 w-3.5" style={{ color: TK.role[r].color }} />
                    {r}
                  </span>
                </label>
              ))}
            </ChipDropdown>

            {/* Group filter (projects pivot) */}
            {pivot === "projects" && (
              <ChipDropdown
                label={
                  <span className={cls(groupValues.length && "text-foreground font-semibold")}>
                    Groups {groupValues.length ? `(${groupValues.length})` : ""}
                  </span>
                }
                active={groupValues.length > 0}
              >
                <div className="text-sm font-medium mb-2">Filter by group</div>
                {(Object.keys(groupSel) as Group[]).map((g) => (
                  <label key={g} className="flex items-center gap-2 text-sm py-1">
                    <input type="checkbox" checked={!!groupSel[g]} onChange={(e) => setGroupSel((s) => ({ ...s, [g]: e.target.checked }))} />
                    <span>{g}</span>
                  </label>
                ))}
              </ChipDropdown>
            )}

            {/* Status filter (members pivot) */}
            {pivot === "members" && (
              <ChipDropdown
                label={
                  <span className={cls(statusValues.length && "text-foreground font-semibold")}>
                    Status {statusValues.length ? `(${statusValues.length})` : ""}
                  </span>
                }
                active={statusValues.length > 0}
              >
                <div className="text-sm font-medium mb-2">Filter by status</div>
                {(["active", "inactive", "pending"] as Status[]).map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      checked={!!statusSel[s]}
                      onChange={(e) => setStatusSel((x) => ({ ...x, [s]: e.target.checked }))}
                    />
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                      style={{ background: TK.status[s].bg, color: TK.status[s].color }}
                    >
                      {s === "pending" ? "Pending" : s[0].toUpperCase() + s.slice(1)}
                    </span>
                  </label>
                ))}
              </ChipDropdown>
            )}

            {/* Invites chip (projects pivot) */}
            {pivot === "projects" && (
              <button
                className={cls(
                  "h-8 px-3 rounded border text-sm hover:bg-[#F7FAFC] cursor-pointer",
                  onlyWithInvites && "font-semibold"
                )}
                style={{ borderColor: TK.borderLight, background: onlyWithInvites ? TK.brandHover : "#fff", color: onlyWithInvites ? TK.brand : undefined }}
                onClick={() => setOnlyWithInvites((v) => !v)}
                title="Only projects with pending invites"
              >
                Pending Invites
              </button>
            )}

            {/* Reset */}
            <button
              className="ml-auto h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC] cursor-pointer"
              style={{ borderColor: TK.borderLight }}
              onClick={() => {
                setQ("");
                setRoleSel({ Owner: false, Admin: false, Editor: false, Viewer: false });
                setGroupSel({ "Client A": false, "Client B": false, "Internal Initiatives": false });
                setStatusSel({ active: false, inactive: false, pending: false });
                setOnlyWithInvites(false);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            {pivot === "projects" ? (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-white sticky top-0 z-20" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
                  <tr>
                    {visibleP.map((c) => {
                      const Icon = c.icon;
                      const style = c.sticky
                        ? {
                            position: "sticky" as const,
                            left: stickyLeftP(c.key),
                            zIndex: 10,
                            background: "#fff",
                            boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                            minWidth: c.min,
                          }
                        : { minWidth: c.min };
                      const sortable: PColKey[] = ["project", "group", "members", "pending", "last", "roles"];
                      const active = sortP.key === c.key;
                      return (
                        <th key={c.key} className="px-3 py-2 text-left text-[12px] font-semibold text-gray-700" style={style}>
                          <button
                            className="inline-flex items-center gap-1.5 hover:text-black cursor-pointer"
                            onClick={() =>
                              sortable.includes(c.key) &&
                              setSortP((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "asc" ? "desc" : "asc" }))
                            }
                            title={c.label}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                            {c.label}
                            {sortable.includes(c.key) && (
                              <span className={cls("text-xs", active ? "text-gray-800" : "text-gray-400")}>
                                {active ? (sortP.dir === "asc" ? "▲" : "▼") : "↕"}
                              </span>
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((r) => {
                    const rowId = r.project.id;
                    return (
                      <React.Fragment key={rowId}>
                        <tr className="hover:bg-[rgba(0,140,205,0.03)] border-b" style={{ borderColor: TK.borderLight }}>
                          {/* Project (sticky) */}
                          {visP.project !== false && (
                            <td
                              className="px-3 py-2"
                              style={{
                                position: "sticky",
                                left: 0,
                                zIndex: 9,
                                background: "#fff",
                                boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                                minWidth: 300,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <img src={faviconUrl(r.project.domain, 32)} alt="" className="h-4 w-4 rounded-sm" />
                                <button
                                  className="text-[14px] font-medium text-[#0B4C6C] underline underline-offset-2 hover:text-[#08384f] cursor-pointer"
                                  title="Open Project"
                                  onClick={() => window.open(`#/${r.project.name}`, "_blank")}
                                >
                                  {r.project.name}
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Group (sticky) */}
                          {visP.group !== false && (
                            <td
                              className="px-3 py-2"
                              style={{
                                position: "sticky",
                                left: stickyLeftP("group"),
                                zIndex: 9,
                                background: "#fff",
                                boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                                minWidth: 200,
                              }}
                            >
                              <span className="text-gray-800">{r.project.group}</span>
                            </td>
                          )}

                          {visP.members !== false && <td className="px-3 py-2">{r.members}</td>}

                          {visP.roles !== false && (
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {(Object.keys(TK.role) as Role[]).map((role) => {
                                  const count = r.roles[role] || 0;
                                  if (!count) return null;
                                  return (
                                    <span
                                      key={role}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs"
                                      style={{ borderColor: TK.borderLight, background: TK.role[role].bg, color: TK.role[role].color }}
                                      title={`${role}: ${count}`}
                                    >
                                      <Shield className="h-3.5 w-3.5" style={{ color: TK.role[role].color }} />
                                      {role} <b>{count}</b>
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          )}

                          {visP.pending !== false && (
                            <td className="px-3 py-2">
                              <span
                                className={cls(
                                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs",
                                  r.pendingInvites > 0 ? "font-semibold" : ""
                                )}
                                style={{
                                  background: r.pendingInvites > 0 ? "rgba(255,159,67,0.12)" : TK.surface,
                                  color: r.pendingInvites > 0 ? "#7A4A00" : TK.muted,
                                }}
                                title="Pending invitations"
                              >
                                {r.pendingInvites}
                              </span>
                            </td>
                          )}

                          {visP.last !== false && (
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span>{r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleDateString() : "Never"}</span>
                                <span className="text-xs text-muted-foreground">{relDate(r.lastActivityAt)}</span>
                              </div>
                            </td>
                          )}

                          {visP.actions !== false && (
                            <td className="px-3 py-2">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  title="Share access"
                                  onClick={() => onShareAccess()}
                                >
                                  <UserPlus className="h-4 w-4" style={{ color: TK.brand }} />
                                </button>
                                <button
                                  className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  title="Edit roles"
                                  onClick={() => onEditAccess({ project: r.project })}
                                >
                                  <PencilLine className="h-4 w-4" style={{ color: TK.brand }} />
                                </button>
                                <button
                                  className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  title="Open project"
                                  onClick={() => window.open(`#/${r.project.name}`, "_blank")}
                                >
                                  <ExternalLink className="h-4 w-4" style={{ color: "#0B4C6C" }} />
                                </button>
                                <button
                                  className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  title="Remove all access"
                                  onClick={() => onRemove(r.project.name)}
                                >
                                  <Trash2 className="h-4 w-4" style={{ color: "#EF4444" }} />
                                </button>
                                <button
                                  className="ml-1 rounded border px-2 text-xs hover:bg-[#F7FAFC] cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  onClick={() => setExp((x) => ({ ...x, [rowId]: !x[rowId] }))}
                                  title={exp[rowId] ? "Collapse" : "Expand"}
                                >
                                  {exp[rowId] ? "Hide" : "Details"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Expanded row: top members for this project */}
                        {exp[rowId] && (
                          <tr className="border-b" style={{ borderColor: TK.borderLight }}>
                            <td className="px-3 py-3" colSpan={visibleP.length} style={{ background: "#FAFBFF" }}>
                              <div className="text-sm font-semibold mb-2">Members — {r.project.name}</div>
                              <div className="flex flex-wrap gap-2">
                                {access
                                  .filter((a) => a.projectId === r.project.id)
                                  .slice(0, 8)
                                  .map((a) => {
                                    const m = members.find((x) => x.id === a.memberId)!;
                                    const tone = TK.role[a.role];
                                    return (
                                      <span
                                        key={`${r.project.id}-${m.id}`}
                                        className="inline-flex items-center gap-2 px-2 py-1 rounded-md border bg-white"
                                        style={{ borderColor: TK.borderLight }}
                                        title={`${m.email} • ${a.role}`}
                                      >
                                        <div
                                          className="h-7 w-7 rounded-full grid place-items-center text-[11px] font-semibold text-white"
                                          style={{ background: TK.brand }}
                                        >
                                          {m.name
                                            .split(" ")
                                            .map((p) => p[0])
                                            .join("")
                                            .slice(0, 2)
                                            .toUpperCase()}
                                        </div>
                                        <span className="text-sm">{m.name}</span>
                                        <span
                                          className="text-[11px] px-2 py-0.5 rounded-full border"
                                          style={{ borderColor: TK.borderLight, background: tone.bg, color: tone.color }}
                                        >
                                          {a.role}
                                        </span>
                                      </span>
                                    );
                                  })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan={visibleP.length}>
                        No results. Adjust filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-white sticky top-0 z-20" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
                  <tr>
                    {visibleM.map((c) => {
                      const Icon = c.icon;
                      const style = c.sticky
                        ? {
                            position: "sticky" as const,
                            left: stickyLeftM(c.key),
                            zIndex: 10,
                            background: "#fff",
                            boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                            minWidth: c.min,
                          }
                        : { minWidth: c.min };
                      const sortable: MColKey[] = ["member", "email", "projects", "last", "status", "roles"];
                      const active = sortM.key === c.key;
                      return (
                        <th key={c.key} className="px-3 py-2 text-left text-[12px] font-semibold text-gray-700" style={style}>
                          <button
                            className="inline-flex items-center gap-1.5 hover:text-black cursor-pointer"
                            onClick={() =>
                              sortable.includes(c.key) &&
                              setSortM((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "asc" ? "desc" : "asc" }))
                            }
                            title={c.label}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                            {c.label}
                            {sortable.includes(c.key) && (
                              <span className={cls("text-xs", active ? "text-gray-800" : "text-gray-400")}>
                                {active ? (sortM.dir === "asc" ? "▲" : "▼") : "↕"}
                              </span>
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((r) => {
                    const rowId = r.member.id;
                    return (
                      <React.Fragment key={rowId}>
                        <tr className="hover:bg-[rgba(0,140,205,0.03)] border-b" style={{ borderColor: TK.borderLight }}>
                          {/* Member (sticky) */}
                          {visM.member !== false && (
                            <td
                              className="px-3 py-2"
                              style={{
                                position: "sticky",
                                left: 0,
                                zIndex: 9,
                                background: "#fff",
                                boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                                minWidth: 280,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {r.member.avatar ? (
                                  <img src={r.member.avatar} alt={r.member.name} className="h-8 w-8 rounded-full object-cover border" style={{ borderColor: TK.borderLight }} />
                                ) : (
                                  <div className="h-8 w-8 rounded-full grid place-items-center text-[12px] font-semibold text-white" style={{ background: TK.brand }}>
                                    {r.member.name
                                      .split(" ")
                                      .map((p) => p[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <button
                                  className="text-[14px] font-medium text-[#0B4C6C] underline underline-offset-2 hover:text-[#08384f] cursor-pointer"
                                  title="View member"
                                  onClick={() => alert(`Member → ${r.member.name}`)}
                                >
                                  {r.member.name}
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Email (sticky) */}
                          {visM.email !== false && (
                            <td
                              className="px-3 py-2"
                              style={{
                                position: "sticky",
                                left: stickyLeftM("email"),
                                zIndex: 9,
                                background: "#fff",
                                boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                                minWidth: 260,
                              }}
                            >
                              <span className="text-gray-800">{r.member.email}</span>
                            </td>
                          )}

                          {visM.roles !== false && (
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {r.rolesDistinct.map((role) => (
                                  <span
                                    key={role}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs"
                                    style={{ borderColor: TK.borderLight, background: TK.role[role].bg, color: TK.role[role].color }}
                                  >
                                    <Shield className="h-3.5 w-3.5" style={{ color: TK.role[role].color }} />
                                    {role}
                                  </span>
                                ))}
                                {!r.rolesDistinct.length && <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </td>
                          )}

                          {visM.projects !== false && (
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {r.projects.slice(0, 2).map((p) => (
                                  <span
                                    key={p.project.id}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white text-xs"
                                    style={{ borderColor: TK.borderLight }}
                                    title={`${p.project.name} • ${p.role}`}
                                  >
                                    <img src={faviconUrl(p.project.domain, 32)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                                    {p.project.name}
                                    <span
                                      className="ml-1 text-[10px] px-1 rounded"
                                      style={{ background: TK.role[p.role].bg, color: TK.role[p.role].color, border: `1px solid ${TK.borderLight}` }}
                                    >
                                      {p.role}
                                    </span>
                                  </span>
                                ))}
                                {r.projects.length > 2 && (
                                  <span
                                    className="px-2 py-0.5 rounded-full border text-xs bg-white"
                                    style={{ borderColor: TK.borderLight }}
                                    title={r.projects.map((p) => `${p.project.name} • ${p.role}`).join(", ")}
                                  >
                                    +{r.projects.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {visM.last !== false && (
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span>{r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleDateString() : "Never"}</span>
                                <span className="text-xs text-muted-foreground">{relDate(r.lastActiveAt)}</span>
                              </div>
                            </td>
                          )}

                          {visM.status !== false && (
                            <td className="px-3 py-2">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                                style={{ background: TK.status[r.member.status].bg, color: TK.status[r.member.status].color }}
                              >
                                {r.member.status === "pending" ? "Pending" : r.member.status[0].toUpperCase() + r.member.status.slice(1)}
                              </span>
                            </td>
                          )}

                          {visM.actions !== false && (
                            <td className="px-3 py-2">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  title="Share access"
                                  onClick={() => onShareAccess()}
                                >
                                  <UserPlus className="h-4 w-4" style={{ color: TK.brand }} />
                                </button>
                                <button
                                  className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  title="Edit access"
                                  onClick={() => onEditAccess({ member: r.member })}
                                >
                                  <PencilLine className="h-4 w-4" style={{ color: TK.brand }} />
                                </button>
                                <button
                                  className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  title="Open in context"
                                  onClick={() => alert(`Open dashboards → ${r.member.name}`)}
                                >
                                  <ExternalLink className="h-4 w-4" style={{ color: "#0B4C6C" }} />
                                </button>
                                <button
                                  className="h-8 w-8 grid place-items-center rounded hover:bg-[#F7FAFC] border cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  title="Remove all access"
                                  onClick={() => onRemove(r.member.name)}
                                >
                                  <Trash2 className="h-4 w-4" style={{ color: "#EF4444" }} />
                                </button>
                                <button
                                  className="ml-1 rounded border px-2 text-xs hover:bg-[#F7FAFC] cursor-pointer"
                                  style={{ borderColor: TK.borderLight }}
                                  onClick={() => setExp((x) => ({ ...x, [rowId]: !x[rowId] }))}
                                  title={exp[rowId] ? "Collapse" : "Expand"}
                                >
                                  {exp[rowId] ? "Hide" : "Details"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Expanded row: per-project access list */}
                        {exp[rowId] && (
                          <tr className="border-b" style={{ borderColor: TK.borderLight }}>
                            <td className="px-3 py-3" colSpan={visibleM.length} style={{ background: "#FAFBFF" }}>
                              <div className="text-sm font-semibold mb-2">Projects — {r.member.name}</div>
                              <div className="flex flex-wrap gap-2">
                                {r.projects.map((p) => (
                                  <span
                                    key={`${r.member.id}-${p.project.id}`}
                                    className="inline-flex items-center gap-2 px-2 py-1 rounded-md border bg-white"
                                    style={{ borderColor: TK.borderLight }}
                                    title={`${p.project.name} • ${p.role}`}
                                  >
                                    <img src={faviconUrl(p.project.domain, 32)} alt="" className="h-4 w-4 rounded-sm" />
                                    <span className="text-sm">{p.project.name}</span>
                                    <span
                                      className="text-[11px] px-2 py-0.5 rounded-full border"
                                      style={{ borderColor: TK.borderLight, background: TK.role[p.role].bg, color: TK.role[p.role].color }}
                                    >
                                      {p.role}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan={visibleM.length}>
                        No results. Adjust filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between p-3 border-t text-sm text-gray-600" style={{ borderColor: TK.borderLight }}>
          <div>Showing {totalCount}</div>
          <div className="inline-flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span className="text-xs">Actions reflect current filters</span>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <Drawer open={shareOpen} title="Share Access" onClose={() => setShareOpen(false)}>
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-gray-700">Invite by email</span>
            <input className="mt-1 w-full rounded border px-2 py-1.5" style={{ borderColor: TK.borderLight }} placeholder="name@company.com" />
          </label>
          <label className="block">
            <span className="text-gray-700">Project</span>
            <select className="mt-1 w-full rounded border px-2 py-1.5 cursor-pointer" style={{ borderColor: TK.borderLight }}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-gray-700">Access</span>
            <select className="mt-1 w-full rounded border px-2 py-1.5 cursor-pointer" style={{ borderColor: TK.borderLight }}>
              {(["Viewer", "Editor", "Admin", "Owner"] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div className="pt-2 flex items-center justify-end gap-2">
            <button className="rounded border px-3 py-1.5 hover:bg-[#F7FAFC] cursor-pointer" style={{ borderColor: TK.borderLight }} onClick={() => setShareOpen(false)}>
              Cancel
            </button>
            <button className="rounded px-3 py-1.5 text-white cursor-pointer" style={{ background: TK.brand }} onClick={() => alert("Invite sent (demo)")}>
              Share
            </button>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={editOpen.open}
        title="Edit Access"
        onClose={() => setEditOpen({ open: false })}
      >
        <div className="space-y-3 text-sm">
          <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
            <div className="text-xs text-muted-foreground">Context</div>
            <div className="mt-1">
              {editOpen.context?.project && (
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" style={{ color: TK.brand }} />
                  <span className="font-medium">{editOpen.context.project.name}</span>
                </div>
              )}
              {editOpen.context?.member && (
                <div className="mt-1 flex items-center gap-2">
                  <Users className="h-4 w-4" style={{ color: TK.brand }} />
                  <span className="font-medium">{editOpen.context.member.name}</span>
                </div>
              )}
            </div>
          </div>

          <label className="block">
            <span className="text-gray-700">Role</span>
            <select className="mt-1 w-full rounded border px-2 py-1.5 cursor-pointer" style={{ borderColor: TK.borderLight }}>
              {(["Viewer", "Editor", "Admin", "Owner"] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <div className="pt-2 flex items-center justify-between">
            <button
              className="inline-flex items-center gap-2 rounded border px-3 py-1.5 hover:bg-[#F7FAFC] cursor-pointer"
              style={{ borderColor: TK.borderLight }}
              onClick={() => alert("Removed (demo)")}
              title="Remove access"
            >
              <Trash2 className="h-4 w-4" style={{ color: "#EF4444" }} />
              Remove Access
            </button>
            <div className="flex items-center gap-2">
              <button className="rounded border px-3 py-1.5 hover:bg-[#F7FAFC] cursor-pointer" style={{ borderColor: TK.borderLight }} onClick={() => setEditOpen({ open: false })}>
                Cancel
              </button>
              <button className="rounded px-3 py-1.5 text-white cursor-pointer" style={{ background: TK.brand }} onClick={() => alert("Updated (demo)")}>
                Save
              </button>
            </div>
          </div>
        </div>
      </Drawer>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Demo usage (optional)
   ───────────────────────────────────────────────────────────── */
export function Example() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <TeamAccessPanel />
    </div>
  );
}
