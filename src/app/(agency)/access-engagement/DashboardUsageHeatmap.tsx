/* Section 4 — Dashboard Usage Heatmap
   Drop‑in React + Tailwind TSX (no emojis)

   Refinements applied:
   • Heatmap swatches now match legend colors exactly (uses same bucket background)
   • Removed any legacy/native tooltips so the smart popover appears only once
   • Added branded icons to the section title and the first column header (“User”)
   • All other components preserved

   Pattern parity:
   • Latest tokens + Inter font stack
   • Modular Filter Chips bar
   • Modular legend chips (inside chart area, top-left)
   • Profile images for users
   • Branded icons for dashboard types (headers, dropdown, tooltip)
   • Smart popover tooltip with colored dot + per‑item icons
   • “User” column shows the same branded icons for “Used” & “Sessions”
   • Header includes Export action
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SlidersHorizontal,
  Download,
  FileText,
  Search,
  Megaphone,
  BarChart2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  KeyRound,
  Lock,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
} from "lucide-react";
import UserSummaryDrawerDemo from "./UserSummaryDrawerDemo";
/* ───────────────────────────────── Tokens (shared look & feel) ───────────────────────────────── */
const TK = {
  brand: "#1090D0",
  blue: "#0077ff",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderSubtle: "#EFF0F6",
  subtle: "#F5F7FA",
  card: "#FFFFFF",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};
const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif";

/* ───────────────────────────────── Types ───────────────────────────────── */
type DashKey = "seo" | "content" | "campaign" | "reporting";
type RoleKey = "owner" | "admin" | "editor" | "viewer";
type Cell = { sessions: number; has_access: boolean; last_access_at: string | null };
type Row = {
  user: {
    id: string;
    name: string;
    email: string;
    roles: RoleKey[];
    roles_by_dashboard: Partial<Record<DashKey, RoleKey | null>>;
  };
  cells: Record<DashKey, Cell>;
};
type HeatmapResponse = {
  dashboards: DashKey[];
  thresholds: { low_max: number; med_min: number; med_max: number; high_min: number };
  rows: Row[];
};

/* ───────────────────────────────── Dashboards (with branded icons) ───────────────────────────────── */
const DASHBOARDS: { key: DashKey; label: string; Icon: React.ComponentType<any> }[] = [
  { key: "seo", label: "SEO", Icon: Search },
  { key: "content", label: "Content", Icon: FileText },
  { key: "campaign", label: "Campaign", Icon: Megaphone },
  { key: "reporting", label: "Reporting", Icon: BarChart2 },
];

/* ───────────────────────────────── Mock API (deterministic) ───────────────────────────────── */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function fmtDay(iso?: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function avatarUrl(email: string) {
  return `https://i.pravatar.cc/64?u=${encodeURIComponent(email)}`;
}
function fetchHeatmapMock(params: {
  dashboards: DashKey[];
  roles: RoleKey[] | null;
  level: "all" | "active" | "idle";
}): Promise<HeatmapResponse> {
  const thresholds = { low_max: 2, med_min: 3, med_max: 9, high_min: 10 };
  const seeded = mulberry32(12345678);

  const first = [
    "Sara",
    "Ayaan",
    "Noah",
    "Maya",
    "Vikash",
    "Ana",
    "Michael",
    "Priya",
    "Liam",
    "Ava",
    "Ishaan",
    "Meera",
    "John",
    "Lauren",
    "Ravi",
    "Elena",
    "Arjun",
    "Nina",
    "Ethan",
    "Olivia",
  ];
  const last = ["Mehta", "Bharia", "Singh", "Patel", "Shah", "Khan", "Cruz", "Verma", "Liu", "Kim"];

  const rows: Row[] = [];
  for (let i = 0; i < 28; i++) {
    const name = `${first[i % first.length]} ${last[(i * 3) % last.length]}`;
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@agency.com`;
    const primaryRole: RoleKey = (i % 9 === 0 ? "admin" : i % 3 === 0 ? "viewer" : "editor") as RoleKey;
    const roles_by_dashboard: Record<DashKey, RoleKey | null> = {
      seo: (i % 5 === 0 ? "admin" : primaryRole) as RoleKey,
      content: (i % 7 === 0 ? "viewer" : primaryRole) as RoleKey,
      campaign: i % 4 === 0 ? null : primaryRole,
      reporting: "viewer",
    };
    const cells: Record<DashKey, Cell> = {
      seo: { sessions: 0, has_access: !!roles_by_dashboard.seo, last_access_at: null },
      content: { sessions: 0, has_access: !!roles_by_dashboard.content, last_access_at: null },
      campaign: { sessions: 0, has_access: !!roles_by_dashboard.campaign, last_access_at: null },
      reporting: { sessions: 0, has_access: !!roles_by_dashboard.reporting, last_access_at: null },
    };
    (Object.keys(cells) as DashKey[]).forEach((k) => {
      const c = cells[k];
      if (!c.has_access) return;
      const r = seeded();
      let n = 0;
      if (r < 0.25) n = 0;
      else if (r < 0.55) n = 1 + Math.floor(seeded() * thresholds.low_max);
      else if (r < 0.85) n = thresholds.med_min + Math.floor(seeded() * (thresholds.med_max - thresholds.med_min + 1));
      else n = thresholds.high_min + Math.floor(seeded() * 12);
      c.sessions = n;
      c.last_access_at = n > 0 ? new Date(Date.now() - seeded() * 1000 * 60 * 60 * 24 * 14).toISOString() : null;
    });
    rows.push({
      user: {
        id: `u_${i + 1}`,
        name,
        email,
        roles: [primaryRole],
        roles_by_dashboard,
      },
      cells,
    });
  }

  // filter by level
  const filtered = rows.filter((row) => {
    const sum = params.dashboards.reduce((acc, dk) => acc + (row.cells[dk]?.sessions || 0), 0);
    const anyAccess = params.dashboards.some((dk) => row.cells[dk]?.has_access);
    if (params.level === "active") return sum > 0;
    if (params.level === "idle") return anyAccess && sum === 0;
    return true;
  });

  return Promise.resolve({
    dashboards: DASHBOARDS.map((d) => d.key),
    thresholds,
    rows: filtered,
  });
}

/* ───────────────────────────────── Filter chips (modular) ───────────────────────────────── */
function ChipDropdown({
  label,
  children,
  active,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        className={`inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC] ${
          active ? "font-semibold" : ""
        }`}
        style={{ borderColor: TK.borderSubtle }}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <SlidersHorizontal className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 w-[320px] rounded-md border bg-white p-3 text-sm shadow-lg"
          style={{ borderColor: TK.borderSubtle }}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────── Heat buckets (use token colors) ───────────────────────────────── */
type Bucket = "high" | "med" | "low" | "mismatch" | "noaccess";
function bucketOf(cell: Cell, th: HeatmapResponse["thresholds"]): Bucket {
  if (!cell.has_access) return "noaccess";
  const n = cell.sessions;
  if (n === 0) return "mismatch";
  if (n <= th.low_max) return "low";
  if (n >= th.med_min && n <= th.med_max) return "med";
  return "high";
}
function bucketVisual(bucket: Bucket) {
  // Use same backgrounds for both heatmap & legend to ensure exact color match
  if (bucket === "high") return { bg: `${TK.blue}26`, border: TK.blue, dot: TK.blue };
  if (bucket === "med") return { bg: `${TK.warn}22`, border: TK.warn, dot: TK.warn };
  if (bucket === "low") return { bg: `${TK.good}22`, border: TK.good, dot: TK.good };
  if (bucket === "mismatch") return { bg: "#FFFFFF", border: TK.danger, dot: TK.danger };
  return { bg: `${TK.subtle}`, border: TK.border, dot: TK.muted };
}

/* ───────────────────────────────── Main component ───────────────────────────────── */
export default function DashboardUsageHeatmap() {
  /* Filters */
  const [selDash, setSelDash] = useState<DashKey[]>(DASHBOARDS.map((d) => d.key));
  const [selRoles, setSelRoles] = useState<RoleKey[]>(["admin", "editor", "viewer"]);
  const [level, setLevel] = useState<"all" | "active" | "idle">("all");
  const [showNumbers, setShowNumbers] = useState(true);
  const [highlightUnder, setHighlightUnder] = useState(true);

  /* Data */
  const [data, setData] = useState<HeatmapResponse | null>(null);
  useEffect(() => {
    fetchHeatmapMock({ dashboards: selDash, roles: selRoles, level }).then((res) => setData(res));
  }, [selDash, selRoles, level]);

  /* Rows (role filter) */
  const rows = useMemo(() => {
    if (!data) return [];
    if (!selRoles.length) return data.rows;
    return data.rows.filter((r) => (r.user.roles?.length ? selRoles.includes(r.user.roles[0]) : true));
  }, [data, selRoles]);

  /* Sort */
  const [sort, setSort] = useState<{ by: "user" | "col"; dir: "asc" | "desc"; key?: DashKey }>({
    by: "user",
    dir: "desc",
  });
  const sorted = useMemo(() => {
    const list = [...rows];
    if (!data) return list;
    const agg = (r: Row) => {
      let used = 0;
      let total = 0;
      selDash.forEach((dk) => {
        const c = r.cells[dk];
        if (!c) return;
        if (c.sessions > 0) used++;
        total += c.sessions;
      });
      return { used, total };
    };
    if (sort.by === "user") {
      list.sort((a, b) => {
        const A = agg(a),
          B = agg(b);
        const cmpUsed = B.used - A.used;
        if (cmpUsed !== 0) return sort.dir === "desc" ? cmpUsed : -cmpUsed;
        const cmpTotal = B.total - A.total;
        return sort.dir === "desc" ? cmpTotal : -cmpTotal;
      });
    } else if (sort.by === "col" && sort.key) {
      const key = sort.key;
      list.sort((a, b) => {
        const av = a.cells[key]?.sessions || 0;
        const bv = b.cells[key]?.sessions || 0;
        const d = bv - av;
        return sort.dir === "desc" ? d : -d;
      });
    }
    return list;
  }, [rows, sort, selDash, data]);

  /* Smart Popover (single instance) */
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    user: Row["user"];
    dash: { key: DashKey; label: string; Icon: React.ComponentType<any> };
    cell: Cell;
    bucket: Bucket;
  } | null>(null);
  function openTip(e: React.MouseEvent, r: Row, d: typeof DASHBOARDS[number]) {
    const cell = r.cells[d.key];
    if (!cell) return;
    const rect = (hostRef.current as HTMLDivElement).getBoundingClientRect();
    const cr = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = Math.min(cr.left - rect.left + cr.width + 12, rect.width - 280);
    const y = Math.max(cr.top - rect.top - 2, 8);
    setTip({ x, y, user: r.user, dash: d, cell, bucket: bucketOf(cell, data!.thresholds) });
  }
  function closeTip() {
    setTip(null);
  }

  /* Export */
  function doExport() {
    if (!data) return;
    const rowsOut: string[] = [];
    rowsOut.push(`# Dashboard Usage Heatmap — Export`);
    rowsOut.push(`# Dash=${selDash.join("|")} | Roles=${selRoles.join("|")} | Level=${level}`);
    rowsOut.push(
      `user_id,name,email,primary_role,used_count,total_sessions,${selDash
        .map((k) => `${k}_sessions,${k}_has_access,${k}_last_access_at`)
        .join(",")}`
    );
    sorted.forEach((r) => {
      let used = 0,
        total = 0;
      selDash.forEach((k) => {
        const c = r.cells[k];
        if (c?.sessions > 0) used++;
        total += c?.sessions || 0;
      });
      const cols: (string | number)[] = [
        r.user.id,
        `"${r.user.name.replace(/"/g, '""')}"`,
        r.user.email,
        r.user.roles?.[0] || "custom",
        used,
        total,
      ];
      selDash.forEach((k) => {
        const c = r.cells[k];
        cols.push(c?.sessions || 0, c?.has_access ? "yes" : "no", c?.last_access_at || "");
      });
      rowsOut.push(cols.join(","));
    });
    const blob = new Blob([rowsOut.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dashboard-usage-heatmap.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* Helpers */
  const gridCols = `minmax(320px, 420px) repeat(${selDash.length}, 120px)`;

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
    <section
      className="rounded-md border bg-white p-4"
      style={{ borderColor: TK.border, fontFamily: FONT, color: TK.text }}
      ref={hostRef}
    >
                              {drawerRow && (
                          <Drawer title="Drawer" onClose={closeDrawer}>
                            <UserSummaryDrawerDemo   />
                          </Drawer>
                        )}
      {/* Header with branded icon */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" style={{ color: TK.brand }} />
          <div>
            <h3 className="m-0 text-[16px] font-semibold text-gray-900">Dashboard Usage Heatmap</h3>
            <div className="text-xs text-gray-500">Sessions per user & dashboard (filtered range)</div>
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={doExport}
            className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.borderSubtle }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar (modular chips) */}
      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-md border p-2"
        style={{ borderColor: TK.border, background: TK.subtle }}
      >
        {/* Dashboards */}
        <ChipDropdown
          label={
            <span className={selDash.length !== DASHBOARDS.length ? "font-semibold" : ""}>
              Dashboards
            </span>
          }
          active={selDash.length !== DASHBOARDS.length}
        >
          <div className="mb-2 text-sm font-medium">Select dashboards</div>
          {DASHBOARDS.map((d) => {
            const on = selDash.includes(d.key);
            const Icon = d.Icon;
            return (
              <label key={d.key} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) =>
                    setSelDash((list) =>
                      e.target.checked ? Array.from(new Set([...list, d.key])) : list.filter((k) => k !== d.key)
                    )
                  }
                />
                <Icon className="h-4 w-4" style={{ color: TK.brand }} />
                <span>{d.label}</span>
              </label>
            );
          })}
        </ChipDropdown>

        {/* Roles */}
        <ChipDropdown
          label={<span className={selRoles.length !== 3 ? "font-semibold" : ""}>Roles</span>}
          active={selRoles.length !== 3}
        >
          <div className="mb-2 text-sm font-medium">Filter by role</div>
          {(["admin", "editor", "viewer"] as RoleKey[]).map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
              <input
                type="checkbox"
                checked={selRoles.includes(r)}
                onChange={(e) =>
                  setSelRoles((arr) =>
                    e.target.checked ? [...arr, r] : arr.filter((x) => x !== r)
                  )
                }
              />
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-gray-500" /> {r[0].toUpperCase() + r.slice(1)}
              </span>
            </label>
          ))}
        </ChipDropdown>

        {/* Activity level */}
        <ChipDropdown label={<span>Activity</span>} active={level !== "all"}>
          <div className="mb-2 text-sm font-medium">Usage level</div>
          {(["all", "active", "idle"] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
              <input type="radio" checked={level === k} onChange={() => setLevel(k)} />
              <span>
                {k === "all" ? "All" : k === "active" ? "Only Active (≥1 session)" : "Only Idle (0 sessions with access)"}
              </span>
            </label>
          ))}
        </ChipDropdown>

        {/* View options */}
        <ChipDropdown label={<span>View</span>}>
          <div className="mb-2 text-sm font-medium">Display</div>
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={(e) => setShowNumbers(e.target.checked)}
            />
            <span>Show numbers</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={highlightUnder}
              onChange={(e) => setHighlightUnder(e.target.checked)}
            />
            <span>Highlight underutilized (access but 0 sessions)</span>
          </label>
        </ChipDropdown>
      </div>

      {/* Legend (uses the same bucket backgrounds as the cells) */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Legend</span>
        <LegendChip color={bucketVisual("high").bg} label="10+" />
        <LegendChip color={bucketVisual("med").bg} label="3–9" />
        <LegendChip color={bucketVisual("low").bg} label="1–2" />
        <LegendChip color={bucketVisual("mismatch").bg} label="0 (has access)" dotted />
        <LegendChip color={bucketVisual("noaccess").bg} label="No Access" hatch />
      </div>

      {/* Grid */}
      <div
        className="max-h-[520px] overflow-auto rounded-md border"
        style={{ borderColor: TK.border }}
        onMouseLeave={closeTip}
      >
        {/* Header row */}
        <div
          className="grid min-h-[48px] items-center bg-white"
          style={{
            gridTemplateColumns: gridCols,
            borderBottom: `1px solid ${TK.border}`,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          {/* User header (sortable + branded icon) */}
          <div
            className="sticky left-0 z-20 flex items-center gap-2 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
            style={{ borderRight: `1px solid ${TK.border}` }}
            role="button"
            aria-label="Sort by dashboards used then total sessions"
            onClick={() =>
              setSort((s) =>
                s.by === "user" ? { ...s, dir: s.dir === "asc" ? "desc" : "asc" } : { by: "user", dir: "desc" }
              )
            }
          >
            <UserIcon className="h-4 w-4" style={{ color: TK.brand }} />
            User
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            {sort.by === "user" &&
              (sort.dir === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
          </div>

          {/* Dashboard columns */}
          {selDash.map((dk) => {
            const d = DASHBOARDS.find((x) => x.key === dk)!;
            const Icon = d.Icon;
            const isColSort = sort.by === "col" && sort.key === dk;
            return (
              <div
                key={dk}
                className="flex cursor-pointer items-center justify-center gap-1.5 px-2 py-2 text-center text-sm font-semibold text-gray-800"
                onClick={() =>
                  setSort((s) =>
                    s.by === "col" && s.key === dk
                      ? { by: "col", key: dk, dir: s.dir === "asc" ? "desc" : "asc" }
                      : { by: "col", key: dk, dir: "desc" }
                  )
                }
              >
                <Icon className="h-4 w-4" style={{ color: TK.brand }} />
                {d.label}
                <ArrowUpDown className="ml-1 h-4 w-4 text-gray-400" />
                {isColSort &&
                  (sort.dir === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div>
          {sorted.map((r) => {
            // row aggregates
            let used = 0;
            let total = 0;
            selDash.forEach((k) => {
              const c = r.cells[k];
              if (c?.sessions > 0) used++;
              total += c?.sessions || 0;
            });
            const isUnder =
              highlightUnder &&
              selDash.some((k) => r.cells[k]?.has_access) &&
              selDash.every((k) => (r.cells[k]?.sessions || 0) === 0);

            return (
              <div
                key={r.user.id}
                className="grid min-h-[60px] items-stretch bg-white"
                style={{
                  gridTemplateColumns: gridCols,
                  borderBottom: `1px solid ${TK.border}`,
                }}
              >
                {/* User cell (sticky) */}
                <div
                  className="sticky left-0 z-10 flex flex-col justify-center bg-white px-3 py-2"
                  style={{
                    borderRight: `1px solid ${TK.border}`,
                    boxShadow: isUnder ? `inset 0 0 0 2px ${TK.warn}40` : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarUrl(r.user.email)}
                      alt={r.user.name}
                      className="h-9 w-9 rounded-full border object-cover"
                      style={{ borderColor: TK.borderSubtle }}
                    />
                    <div className="leading-tight">
                      <div className="text-sm font-semibold text-gray-900 cursor-pointer"   onClick={openDrawer}>{r.user.name}</div>
                      <div className="text-xs text-gray-500">{r.user.email}</div>
                    </div>
                  </div>
                  {/* Branded mini‑stats using the same icons as tooltip */}
                  <div className="ml-[48px] mt-1 flex items-center gap-2 text-xs">
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                      style={{ borderColor: TK.border, background: TK.subtle }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: TK.good }} />
                      Used {used}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                      style={{ borderColor: TK.border, background: TK.subtle }}
                    >
                      <BarChart2 className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                      Sessions {total}
                    </span>
                  </div>
                </div>

                {/* Data cells */}
                {selDash.map((dk) => {
                  const d = DASHBOARDS.find((x) => x.key === dk)!;
                  const cell = r.cells[dk] || { sessions: 0, has_access: false, last_access_at: null };
                  const bucket = bucketOf(cell, data!.thresholds);
                  const vis = bucketVisual(bucket);
                  const hatch =
                    !cell.has_access
                      ? `repeating-linear-gradient(45deg, ${TK.borderSubtle}, ${TK.borderSubtle} 8px, transparent 8px, transparent 16px)`
                      : undefined;

                  return (
                    <div
                      key={dk}
                      className="relative flex items-center justify-center px-2 py-2 text-sm"
                      role="gridcell"
                      tabIndex={0}
                      style={{
                        background: hatch ? undefined : vis.bg, // exact match with legend
                        backgroundImage: hatch,
                        borderRight: `1px solid ${TK.border}`,
                        borderBottom: `1px solid ${TK.border}`,
                        outline: bucket === "mismatch" ? `2px dotted ${TK.danger}` : "none",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => openTip(e, r, d)}
                      onFocus={(e) => openTip(e as any, r, d)}
                      onMouseLeave={closeTip}
                      onBlur={closeTip}
                      // NOTE: intentionally removed any title=... attributes to avoid duplicate tooltips
                    >
                      {/* corner red dot for mismatch */}
                      {bucket === "mismatch" && (
                        <span
                          className="absolute right-1.5 top-1.5 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: TK.danger }}
                          aria-hidden
                        />
                      )}
                      {showNumbers ? (
                        <span
                          className="font-semibold text-gray-800"
                          style={{ textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}
                        >
                          {cell.has_access ? cell.sessions : "–"}
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full"
                          style={{ background: vis.dot }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            No dashboard usage detected for the selected filters.
          </div>
        )}
      </div>

      {/* Smart Popover Tooltip (single, latest design only) */}
      {tip && (
        <div
          className="pointer-events-none absolute z-50 w-[280px] rounded-md border bg-white p-3 text-xs shadow-lg"
          style={{
            left: tip.x,
            top: tip.y,
            borderColor: TK.border,
            fontFamily: FONT,
            color: TK.text,
          }}
          role="tooltip"
        >
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: bucketVisual(tip.bucket).dot,
                boxShadow: `0 0 0 3px ${bucketVisual(tip.bucket).bg}`,
              }}
            />
            <span>{tip.dash.label}</span>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <img
              src={avatarUrl(tip.user.email)}
              alt={tip.user.name}
              className="h-7 w-7 rounded-full border object-cover"
              style={{ borderColor: TK.borderSubtle }}
            />
            <div className="truncate">
              <div className="truncate font-medium">{tip.user.name}</div>
              <div className="truncate text-[11px] text-gray-500">{tip.user.email}</div>
            </div>
          </div>
          <ul className="space-y-1">
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                Sessions
              </span>
              <span className="font-semibold">{tip.cell.sessions}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                {tip.cell.sessions > 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: TK.good }} />
                ) : (
                  <XCircle className="h-3.5 w-3.5" style={{ color: TK.danger }} />
                )}
                Used
              </span>
              <span className="font-semibold">{tip.cell.sessions > 0 ? "Yes" : "No"}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-600" />
                Last access
              </span>
              <span className="font-semibold">{fmtDay(tip.cell.last_access_at)}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                {tip.cell.has_access ? (
                  <KeyRound className="h-3.5 w-3.5 text-gray-700" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-gray-700" />
                )}
                Access
              </span>
              <span className="font-semibold">{tip.cell.has_access ? "Yes" : "No"}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gray-700" />
                Role
              </span>
              <span className="font-semibold">
                {tip.user.roles_by_dashboard?.[tip.dash.key] ?? "—"}
              </span>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}

/* ───────────────────────────────── Legend chip ───────────────────────────────── */
function LegendChip({
  color,
  label,
  dotted,
  hatch,
}: {
  color: string; // pass the SAME background used by cells
  label: string;
  dotted?: boolean; // shows small red dot (for mismatch)
  hatch?: boolean; // shows hatch pattern (for no access)
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: TK.border, background: "#fff", fontFamily: FONT }}
    >
      <span
        aria-hidden
        className="inline-block h-3.5 w-3.5 rounded-sm"
        style={{
          background: hatch
            ? `repeating-linear-gradient(45deg, ${TK.borderSubtle}, ${TK.borderSubtle} 8px, transparent 8px, transparent 16px)`
            : color,
          border: `1px solid ${TK.border}`,
          position: "relative",
        }}
      >
        {dotted && (
          <span
            className="absolute right-0.5 top-0.5 inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: TK.danger }}
          />
        )}
      </span>
      <span>{label}</span>
    </span>
  );
}

/* Optional demo wrapper
export default function Demo() {
  return (
    <div className="p-4" style={{ background: "#FAFBFC", fontFamily: FONT }}>
      <DashboardUsageHeatmap />
    </div>
  );
}
*/
