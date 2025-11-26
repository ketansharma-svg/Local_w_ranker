"use client";

import * as React from "react";
import {
  ClipboardList,
  Search,
  Download,
  Columns3,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight as ChevronRightSingle,
  ChevronsRight,
  LayoutGrid,
  Plus,
  Eye,
  RefreshCw,
  UserPlus,
  Filter,
} from "lucide-react";

/* =============================================================================
 * TOKENS — align with latest section styles
 * ========================================================================== */
const TOKENS = {
  surface: "#FFFFFF",
  surfaceAlt: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",

  brand: "#008CCD", // branded icons + actionable accents
  mainBlue: "#0077FF", // numeric emphasis / metrics
  pastelBlue: "#D9EEF8",

  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
} as const;

const fontFamily =
  'Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans"';

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const fmt = (n: number | string) =>
  typeof n === "number" ? n.toLocaleString() : n;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, n: number) => {
  const x = new Date(base);
  x.setDate(x.getDate() + n);
  return x;
};

/* =============================================================================
 * TYPES
 * ========================================================================== */
type Campaign = "SEO" | "Content" | "Technical" | "Reporting" | "Ads" | "Internal";
type Priority = "High" | "Medium" | "Low";
type StatusKey =
  | "due_today"
  | "overdue"
  | "upcoming"
  | "in_review"
  | "in_progress"
  | "not_started"
  | "completed";

type Task = {
  id: string;
  title: string;
  status: StatusKey;
  assignee: string;
  due?: string; // ISO date
  priority: Priority;
};

type ProjectRow = {
  id: string;
  project: string;
  group: string;
  campaign: Campaign;
  assigneesCount: number;
  lastUpdated: string; // ISO date
  open: number; // sum of non-completed
  in_progress: number;
  overdue: number;
  due_today: number;
  upcoming: number;
  in_review: number;
  not_started: number;
  completed: number; // in range
  loadScore: number; // 0..200
  tasks: Task[]; // for expander
};

/* =============================================================================
 * STATUS / PRIORITY — pills using latest tokens
 * ========================================================================== */
const statusOrder: StatusKey[] = [
  "due_today",
  "overdue",
  "upcoming",
  "in_review",
  "in_progress",
  "not_started",
  "completed",
];

function statusPill(s: StatusKey) {
  const map: Record<StatusKey, { label: string; color: string; bg: string }> = {
    due_today: { label: "Due Today", color: "#7A4A00", bg: "#FFF3E0" },
    overdue: { label: "Overdue", color: "#7A1D1F", bg: "#FDECEC" },
    upcoming: { label: "Upcoming", color: "#0B4C6C", bg: "#E6F4FB" },
    in_review: { label: "In Review", color: "#7A4A00", bg: "#FFF3E0" },
    in_progress: { label: "In Progress", color: TOKENS.brand, bg: TOKENS.pastelBlue },
    not_started: { label: "Not Started", color: "#3F4B57", bg: "#EDF2F7" },
    completed: { label: "Completed", color: "#0C5E3B", bg: "#E6F8F0" },
  };
  return map[s];
}

function priorityPill(p: Priority) {
  const color =
    p === "High" ? TOKENS.danger : p === "Medium" ? TOKENS.warn : "#9AA4B2";
  return {
    color,
    bg: `${color}1A`, // soft tint
    border: TOKENS.border,
  };
}

/* =============================================================================
 * DEMO DATA (deterministic-ish) — safe to remove when wiring your API
 * ========================================================================== */
const CAMPAIGNS: Campaign[] = ["SEO", "Content", "Technical", "Reporting", "Ads", "Internal"];
const NAMES = ["Maya", "John", "Anya", "Omar", "Richa", "Ivy", "Vikash", "Liam", "Sarah", "Leo"];

function rnd(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function mkTask(idx: number, project: string): Task {
  const st: StatusKey[] = [
    "in_progress",
    "in_review",
    "not_started",
    "overdue",
    "due_today",
    "upcoming",
    "completed",
  ];
  const s = st[rnd(0, st.length - 1)];
  const due =
    s === "completed" || s === "not_started"
      ? undefined
      : iso(addDays(new Date(), rnd(-3, 10)));

  const prio: Priority[] = ["Low", "Medium", "High"];
  return {
    id: `T-${project.slice(0, 2).toUpperCase()}-${idx}`,
    title: `${project}: Task #${idx + 1}`,
    status: s,
    assignee: NAMES[rnd(0, NAMES.length - 1)],
    due,
    priority: prio[rnd(0, prio.length - 1)],
  };
}

function mkRow(i: number): ProjectRow {
  const project = `Project ${String.fromCharCode(65 + (i % 26))}-${i + 1}`;
  const group = i % 3 === 0 ? "Client A" : i % 3 === 1 ? "Client B" : "Internal Initiatives";
  const campaign = CAMPAIGNS[i % CAMPAIGNS.length];
  const tasks = Array.from({ length: rnd(8, 26) }, (_, k) => mkTask(k, project));

  const counts: Record<StatusKey, number> = {
    in_progress: 0,
    overdue: 0,
    due_today: 0,
    upcoming: 0,
    in_review: 0,
    not_started: 0,
    completed: 0,
  };
  tasks.forEach((t) => {
    counts[t.status] = (counts[t.status] || 0) + 1;
  });

  const open =
    counts.in_progress +
    counts.in_review +
    counts.not_started +
    counts.overdue +
    counts.due_today +
    counts.upcoming;

  return {
    id: `P-${i + 1}`,
    project,
    group,
    campaign,
    assigneesCount: rnd(1, 8),
    lastUpdated: iso(addDays(new Date(), -rnd(0, 7))),
    open,
    in_progress: counts.in_progress,
    overdue: counts.overdue,
    due_today: counts.due_today,
    upcoming: counts.upcoming,
    in_review: counts.in_review,
    not_started: counts.not_started,
    completed: counts.completed,
    loadScore: Math.min(200, Math.round(100 * (open / Math.max(1, 12)))),
    tasks,
  };
}

function makeRows(n = 28) {
  return Array.from({ length: n }, (_, i) => mkRow(i));
}

/* =============================================================================
 * COLUMN MODEL — mirrors the Campaign Taskboard overview
 * ========================================================================== */
type ColKey =
  | "sel"
  | "expand"
  | "project"
  | "group"
  | "campaign"
  | "assignees"
  | "open"
  | "in_progress"
  | "overdue"
  | "due_today"
  | "upcoming"
  | "in_review"
  | "not_started"
  | "completed"
  | "load"
  | "updated"
  | "actions";

type ColDef = {
  key: ColKey;
  label: string;
  width?: number;
  sortable?: boolean;
  sticky?: boolean;
  align?: "left" | "right" | "center";
  tip?: string;
};

const COLS: ColDef[] = [
  { key: "sel", label: "", width: 40, sticky: true, align: "center" },
  { key: "expand", label: "", width: 44, sticky: true, align: "center" },
  { key: "project", label: "Project", width: 260, sticky: true, sortable: true, tip: "Project name" },
  { key: "group", label: "Group/Folder", width: 220, sticky: true, sortable: true },
  { key: "campaign", label: "Campaign", width: 130, sortable: true },
  { key: "assignees", label: "Assignees", width: 110, sortable: true, align: "right" },
  { key: "open", label: "Total Open", width: 120, sortable: true, align: "right" },
  { key: "in_progress", label: "In‑Progress", width: 120, sortable: true, align: "right" },
  { key: "overdue", label: "Overdue", width: 110, sortable: true, align: "right" },
  { key: "due_today", label: "Due Today", width: 120, sortable: true, align: "right" },
  { key: "upcoming", label: "Upcoming", width: 120, sortable: true, align: "right" },
  { key: "in_review", label: "In‑Review", width: 120, sortable: true, align: "right" },
  { key: "not_started", label: "Not Started", width: 130, sortable: true, align: "right" },
  { key: "completed", label: "Completed (in range)", width: 170, sortable: true, align: "right" },
  { key: "load", label: "Load Score", width: 120, sortable: true, align: "right" },
  { key: "updated", label: "Last Updated", width: 140, sortable: true },
  { key: "actions", label: "Actions", width: 160, align: "center" },
];

/* =============================================================================
 * SECTION — Workload & Tasks
 * ========================================================================== */
export default function WorkloadTasksSection() {
  /* Data */
  const [rows] = React.useState<ProjectRow[]>(() => makeRows(32));

  /* Filters */
  const [q, setQ] = React.useState("");
  const [group, setGroup] = React.useState<"All" | "Client A" | "Client B" | "Internal Initiatives">("All");
  const [campaign, setCampaign] = React.useState<"All" | Campaign>("All");
  const [onlyOverdue, setOnlyOverdue] = React.useState(false);
  const [onlyDueToday, setOnlyDueToday] = React.useState(false);
  const [densityCompact, setDensityCompact] = React.useState(false);

  /* Column visibility */
  const [visible, setVisible] = React.useState<Record<ColKey, boolean>>(
    () => COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>)
  );

  /* Sorting */
  const [sortKey, setSortKey] = React.useState<ColKey>("project");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const toggleSort = (c: ColDef) => {
    if (!c.sortable) return;
    if (sortKey !== c.key) {
      setSortKey(c.key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  /* Selection */
  const [sel, setSel] = React.useState<Record<string, boolean>>({});
  const selectedIds = React.useMemo(() => Object.keys(sel).filter((k) => sel[k]), [sel]);

  /* Expansion */
  const [exp, setExp] = React.useState<Record<string, boolean>>({});

  /* Pagination */
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  /* Filtered → Sorted → Paged */
  const filtered = React.useMemo(() => {
    let out = rows;
    if (q) {
      const s = q.toLowerCase();
      out = out.filter((r) => r.project.toLowerCase().includes(s) || r.group.toLowerCase().includes(s));
    }
    if (group !== "All") out = out.filter((r) => r.group === group);
    if (campaign !== "All") out = out.filter((r) => r.campaign === campaign);
    if (onlyOverdue) out = out.filter((r) => r.overdue > 0);
    if (onlyDueToday) out = out.filter((r) => r.due_today > 0);
    return out;
  }, [rows, q, group, campaign, onlyOverdue, onlyDueToday]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const get = (r: ProjectRow): any => {
      switch (sortKey) {
        case "project":
          return r.project;
        case "group":
          return r.group;
        case "campaign":
          return r.campaign;
        case "assignees":
          return r.assigneesCount;
        case "open":
          return r.open;
        case "in_progress":
          return r.in_progress;
        case "overdue":
          return r.overdue;
        case "due_today":
          return r.due_today;
        case "upcoming":
          return r.upcoming;
        case "in_review":
          return r.in_review;
        case "not_started":
          return r.not_started;
        case "completed":
          return r.completed;
        case "load":
          return r.loadScore;
        case "updated":
          return r.lastUpdated;
        default:
          return r.project;
      }
    };
    arr.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const start = (page - 1) * pageSize;
  const windowRows = React.useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  const allOnPageSelected = windowRows.length > 0 && windowRows.every((r) => sel[r.id]);
  const densityRow = densityCompact ? "h-9" : "h-12";

  /* Helpers */
  const visibleCols = React.useMemo(() => COLS.filter((c) => visible[c.key] !== false), [visible]);

  const stickyStyle = (c: ColDef) => {
    if (!c.sticky) return undefined;
    // compute left offsets across visible sticky columns in order
    let left = 0;
    for (const col of COLS) {
      if (col.key === c.key) break;
      if (visible[col.key] !== false && col.sticky) left += col.width ?? 120;
    }
    return {
      position: "sticky" as const,
      left,
      zIndex: 10,
      background: TOKENS.surface,
      boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
    };
  };

  /* Export CSV (visible columns, current sort + filter) */
  const exportCSV = () => {
    const vcols = COLS.filter((c) => visible[c.key] && !["sel", "expand", "actions"].includes(c.key));
    const header = vcols.map((c) => c.label).join(",");
    const lines = sorted.map((r) => {
      const cells = vcols.map((c) => JSON.stringify(colValue(r, c.key) ?? ""));
      return cells.join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "workload_tasks.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="w-full rounded-md border px-2.5 py-1.5 bg-white mt-4" style={{ fontFamily }}>
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} style={{ color: TOKENS.brand }} />
          <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>
            Workload & Tasks
          </h3>
          <span
            className="ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: TOKENS.border, color: TOKENS.muted, background: TOKENS.surface }}
            title="Portfolio task workload overview"
          >
            <Filter size={12} /> Overview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.surface }}
            onClick={exportCSV}
            title="Export current view (CSV)"
          >
            <Download size={16} />
            Export
          </button>
          <ColumnControl visible={visible} setVisible={setVisible} />
        </div>
      </div>

      {/* Filters bar */}
      <div
        className="rounded-md border p-3"
        style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <label className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
              style={{ color: "#9CA3AF" }}
            />
            <input
              className="w-[280px] rounded border pl-8 pr-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: TOKENS.border, background: TOKENS.surface, color: TOKENS.text }}
              placeholder="Search by project or group…"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
          </label>

          {/* Chips (modular) */}
          <Chip active={onlyOverdue} onClick={() => { setOnlyOverdue((v) => !v); setPage(1); }} label="Overdue > 0" />
          <Chip active={onlyDueToday} onClick={() => { setOnlyDueToday((v) => !v); setPage(1); }} label="Due Today > 0" />

          {/* Selects */}
          <Select
            label="Group"
            value={group}
            onChange={(v) => { setGroup(v as any); setPage(1); }}
            items={["All", "Client A", "Client B", "Internal Initiatives"]}
          />
          <Select
            label="Campaign"
            value={campaign}
            onChange={(v) => { setCampaign(v as any); setPage(1); }}
            items={["All", ...CAMPAIGNS]}
          />

          {/* Density toggle (modular switch) */}
          <div className="ml-auto flex items-center gap-3">
            <Toggle
              label={densityCompact ? "Density: Compact" : "Density: Comfortable"}
              checked={densityCompact}
              onChange={setDensityCompact}
            />
            {/* Pagination (top) */}
            <div className="flex items-center gap-1">
              <Select
                label="Rows"
                value={String(pageSize)}
                onChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
                items={["10", "25", "50", "100"]}
              />
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
                style={{ borderColor: TOKENS.border }}
                disabled={page <= 1}
                onClick={() => setPage(1)}
                title="First"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
                style={{ borderColor: TOKENS.border }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Prev"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-sm" style={{ color: TOKENS.muted }}>
                {page} / {totalPages}
              </span>
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
                style={{ borderColor: TOKENS.border }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Next"
              >
                <ChevronRightSingle size={14} />
              </button>
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
                style={{ borderColor: TOKENS.border }}
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                title="Last"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk toolbar */}
        {selectedIds.length > 0 && (
          <div
            className="mt-3 flex items-center gap-2 rounded-md border p-2"
            style={{ borderColor: TOKENS.border, background: TOKENS.surfaceAlt }}
          >
            <span className="text-sm" style={{ color: TOKENS.text }}>
              <b>{selectedIds.length}</b> selected
            </span>
            <span className="inline-block h-5 w-px bg-gray-200" />
            <button className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-gray-50" style={{ borderColor: TOKENS.border }}>
              <RefreshCw size={14} style={{ color: TOKENS.brand }} /> Change Status
            </button>
            <button className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-gray-50" style={{ borderColor: TOKENS.border }}>
              <UserPlus size={14} style={{ color: TOKENS.brand }} /> Reassign
            </button>
            <button className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-gray-50" style={{ borderColor: TOKENS.border }}>
              <LayoutGrid size={14} style={{ color: TOKENS.brand }} /> Move to Board
            </button>
            <div className="ml-auto">
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-gray-50"
                style={{ borderColor: TOKENS.border }}
                onClick={() => setSel({})}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="mt-3 overflow-auto rounded-md border" style={{ borderColor: TOKENS.border }}>
        <table className="w-full border-collapse">
          {/* Header */}
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b" style={{ borderColor: TOKENS.border }}>
              {visibleCols.map((c) => (
                <th
                  key={c.key}
                  className={cx(
                    "px-3 py-2 text-left text-[12px] font-semibold",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  )}
                  style={{ minWidth: c.width, ...stickyStyle(c), color: "#374151" }}
                  title={c.tip}
                >
                  {c.sortable ? (
                    <button
                      className="inline-flex cursor-pointer items-center gap-1 hover:text-black"
                      onClick={() => toggleSort(c)}
                    >
                      <span>{c.label}</span>
                      <SortGlyph active={sortKey === c.key} dir={sortDir} />
                    </button>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {windowRows.map((r) => {
              const isSelected = !!sel[r.id];
              return (
                <React.Fragment key={r.id}>
                  <tr
                    className={cx("border-b hover:bg-[#F5F7FA]", densityRow)}
                    style={{
                      borderColor: TOKENS.border,
                      background: isSelected ? "#F0FAFF" : undefined,
                    }}
                  >
                    {visible.sel !== false && (
                      <td className="px-3 text-center" style={stickyStyle(COLS[0])}>
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          className="cursor-pointer"
                          checked={!!sel[r.id]}
                          onChange={(e) =>
                            setSel((s) => ({ ...s, [r.id]: e.target.checked }))
                          }
                        />
                      </td>
                    )}

                    {visible.expand !== false && (
                      <td className="px-3 text-center" style={stickyStyle(COLS[1])}>
                        <button
                          className="inline-flex cursor-pointer items-center rounded border px-1 py-0.5 text-xs hover:bg-gray-50"
                          style={{ borderColor: TOKENS.border }}
                          onClick={() => setExp((x) => ({ ...x, [r.id]: !x[r.id] }))}
                          aria-label={exp[r.id] ? "Collapse" : "Expand"}
                          title={exp[r.id] ? "Collapse" : "Expand"}
                        >
                          {exp[r.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                    )}

                    {visible.project !== false && (
                      <td className="px-3" style={stickyStyle(COLS[2])}>
                        <div className="flex items-center gap-2">
                          <button
                            className="cursor-pointer text-[14px] font-medium underline underline-offset-2"
                            style={{ color: "#0B4C6C" }}
                            title="Open Project Task Overview"
                          >
                            {r.project}
                          </button>
                          <span
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                            style={{ borderColor: TOKENS.border, color: TOKENS.muted, background: TOKENS.surface }}
                            title="View Project"
                          >
                            <Eye size={12} style={{ color: TOKENS.brand }} /> View
                          </span>
                        </div>
                      </td>
                    )}

                    {visible.group !== false && (
                      <td className="px-3" style={stickyStyle(COLS[3])}>
                        <span className="text-gray-800">{r.group}</span>
                      </td>
                    )}

                    {visible.campaign !== false && (
                      <td className="px-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium"
                          style={{ background: TOKENS.pastelBlue, color: TOKENS.brand, border: `1px solid ${TOKENS.border}` }}
                          title="Campaign Type"
                        >
                          {r.campaign}
                        </span>
                      </td>
                    )}

                    {visible.assignees !== false && <td className="px-3 text-right">{fmt(r.assigneesCount)}</td>}
                    {visible.open !== false && <td className="px-3 text-right">{fmt(r.open)}</td>}
                    {visible.in_progress !== false && <td className="px-3 text-right">{fmt(r.in_progress)}</td>}

                    {visible.overdue !== false && (
                      <td className="px-3 text-right">
                        <span
                          className={cx(
                            "inline-block rounded-full px-2 py-0.5 text-[12px] font-medium",
                            r.overdue > 0 ? "text-white" : "text-gray-600"
                          )}
                          style={{ background: r.overdue > 0 ? TOKENS.danger : "#EDF2F7" }}
                          title="Overdue tasks"
                        >
                          {fmt(r.overdue)}
                        </span>
                      </td>
                    )}

                    {visible.due_today !== false && (
                      <td className="px-3 text-right">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[12px] font-medium"
                          style={{ background: r.due_today > 0 ? "#FFF3E0" : "#EDF2F7", color: r.due_today > 0 ? "#7A4A00" : "#4B5563" }}
                          title="Due today"
                        >
                          {fmt(r.due_today)}
                        </span>
                      </td>
                    )}

                    {visible.upcoming !== false && <td className="px-3 text-right">{fmt(r.upcoming)}</td>}
                    {visible.in_review !== false && <td className="px-3 text-right">{fmt(r.in_review)}</td>}
                    {visible.not_started !== false && <td className="px-3 text-right">{fmt(r.not_started)}</td>}
                    {visible.completed !== false && <td className="px-3 text-right">{fmt(r.completed)}</td>}

                    {visible.load !== false && (
                      <td className="px-3 text-right" title="Load Score (0–200)">
                        <LoadBadge value={r.loadScore} />
                      </td>
                    )}

                    {visible.updated !== false && (
                      <td className="px-3">
                        <span className="text-gray-700">{r.lastUpdated}</span>
                      </td>
                    )}

                    {visible.actions !== false && (
                      <td className="px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
                            style={{ borderColor: TOKENS.border }}
                            title="Open Board"
                          >
                            <LayoutGrid size={14} style={{ color: TOKENS.brand }} /> Board
                          </button>
                          <button
                            className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
                            style={{ borderColor: TOKENS.border }}
                            title="Create Task"
                          >
                            <Plus size={14} style={{ color: TOKENS.brand }} /> Task
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Expanded row */}
                  {exp[r.id] && (
                    <tr className="border-b" style={{ borderColor: TOKENS.border }}>
                      <td className="px-3 py-3" colSpan={visibleCols.length} style={{ background: "#FAFBFF" }}>
                        <ExpandedTasksTable row={r} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {/* Empty state */}
            {windowRows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-sm" style={{ color: TOKENS.muted }} colSpan={visibleCols.length}>
                  No projects match the current filters. Try clearing filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer pagination (mirror) */}
      <div
        className="flex items-center justify-between border-b-0 border-t px-2 py-3 text-sm"
        style={{ borderColor: TOKENS.border }}
      >
        <div className="text-gray-600">
          Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + windowRows.length)} of {sorted.length}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            disabled={page <= 1}
            onClick={() => setPage(1)}
            title="First"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            title="Prev"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-2" style={{ color: TOKENS.muted }}>
            {page} / {totalPages}
          </span>
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            title="Next"
          >
            <ChevronRightSingle size={14} />
          </button>
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-sm disabled:opacity-50 hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            title="Last"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );

  /* ===== helpers (scoped) ===== */

  function colValue(r: ProjectRow, k: ColKey) {
    switch (k) {
      case "project":
        return r.project;
      case "group":
        return r.group;
      case "campaign":
        return r.campaign;
      case "assignees":
        return r.assigneesCount;
      case "open":
        return r.open;
      case "in_progress":
        return r.in_progress;
      case "overdue":
        return r.overdue;
      case "due_today":
        return r.due_today;
      case "upcoming":
        return r.upcoming;
      case "in_review":
        return r.in_review;
      case "not_started":
        return r.not_started;
      case "completed":
        return r.completed;
      case "load":
        return r.loadScore;
      case "updated":
        return r.lastUpdated;
      default:
        return "";
    }
  }
}

/* =============================================================================
 * Subcomponents — Chips, Toggle, ColumnControl, LoadBadge, Expanded Tasks
 * ========================================================================== */

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={cx(
        "rounded-full border px-3 py-1 text-sm hover:bg-gray-50 cursor-pointer",
        active && "font-semibold"
      )}
      style={{
        borderColor: TOKENS.border,
        background: active ? TOKENS.pastelBlue : TOKENS.surface,
        color: active ? TOKENS.brand : TOKENS.text,
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm" title={label}>
      <span className="text-gray-600">{label}</span>
      <span
        className={cx(
          "relative inline-flex h-5 w-9 items-center rounded-full border transition",
          checked ? "bg-[#D9EEF8] border-[#BBDFF0]" : "bg-gray-200 border-gray-300"
        )}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cx(
            "absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0"
          )}
        />
      </span>
    </label>
  );
}

function Select({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: (string | number)[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-600">{label}</span>
      <select
        className="cursor-pointer rounded border px-2 py-1.5 text-sm outline-none hover:bg-gray-50"
        style={{ borderColor: TOKENS.border, background: TOKENS.surface, color: TOKENS.text }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {items.map((it) => (
          <option key={String(it)} value={String(it)}>
            {String(it)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortGlyph({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className={cx("text-xs", active ? "text-gray-800" : "text-gray-400")}>
      {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );
}

function LoadBadge({ value }: { value: number }) {
  const tone =
    value >= 150
      ? { bg: "#FDECEC", color: "#7A1D1F" }
      : value <= 60
      ? { bg: "#E7F5FE", color: "#0B4C6C" }
      : { bg: "#E6F8F0", color: "#0C5E3B" };
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[12px] font-semibold"
      style={{ background: tone.bg, color: tone.color }}
      title="Load Score (0–200)"
    >
      {value}
    </span>
  );
}

function ColumnControl({
  visible,
  setVisible,
}: {
  visible: Record<ColKey, boolean>;
  setVisible: React.Dispatch<React.SetStateAction<Record<ColKey, boolean>>>;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.surface }}
        onClick={() => setOpen((o) => !o)}
        title="Columns"
      >
        <Columns3 size={16} style={{ color: TOKENS.brand }} />
        Columns
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-md border bg-white p-3 text-sm shadow-lg"
          style={{ borderColor: TOKENS.border, zIndex: 50 }}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="mb-2 font-semibold" style={{ color: TOKENS.text }}>
            Show / Hide
          </div>
          <div className="max-h-64 space-y-1 overflow-auto pr-1">
            {COLS.map((c) => (
              <label key={c.key} className="flex cursor-pointer items-center justify-between gap-2">
                <span>{c.label || c.key}</span>
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={visible[c.key] !== false}
                  onChange={(e) => setVisible((v) => ({ ...v, [c.key]: e.target.checked }))}
                  disabled={["sel", "expand", "project", "group"].includes(c.key)}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-between">
            <button
              className="inline-flex cursor-pointer items-center gap-2 rounded border px-2 py-1"
              style={{ borderColor: TOKENS.border }}
              onClick={() =>
                setVisible(COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>))
              }
            >
              Reset
            </button>
            <button
              className="inline-flex cursor-pointer items-center gap-2 rounded border px-2 py-1"
              style={{ borderColor: TOKENS.border }}
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

function ExpandedTasksTable({ row }: { row: ProjectRow }) {
  const ordered = [...row.tasks].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  const top5 = ordered.slice(0, 5);

  return (
    <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border, background: TOKENS.surface }}>
      <div className="mb-2 text-sm font-semibold" style={{ color: TOKENS.text }}>
        {row.project} — Recent / Priority Tasks
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-[12px] font-semibold" style={{ borderColor: TOKENS.border, color: "#374151" }}>
              <th className="px-2 py-2 text-left">Task</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Assignee</th>
              <th className="px-2 py-2 text-left">Due</th>
              <th className="px-2 py-2 text-left">Priority</th>
              <th className="px-2 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((t) => {
              const s = statusPill(t.status);
              const p = priorityPill(t.priority);
              const overdue = t.status === "overdue";
              const dueToday = t.status === "due_today";
              return (
                <tr key={t.id} className="border-b hover:bg-[#F8FAFC]" style={{ borderColor: TOKENS.border }}>
                  <td className="px-2 py-2">
                    <button
                      className="cursor-pointer text-[14px] underline hover:opacity-90"
                      style={{ color: "#0B4C6C" }}
                      title="Open Task Drawer"
                    >
                      {t.title}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-[12px] font-medium"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td className="px-2 py-2">{t.assignee}</td>
                  <td className="px-2 py-2">
                    {t.due ? (
                      <span
                        className={cx(
                          "rounded px-2 py-0.5 text-[12px]",
                          overdue ? "text-white" : dueToday ? "" : "text-gray-700"
                        )}
                        style={{
                          background: overdue ? TOKENS.danger : dueToday ? "#FFF3E0" : "#EDF2F7",
                          color: overdue ? "#FFFFFF" : dueToday ? "#7A4A00" : undefined,
                        }}
                      >
                        {t.due}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-[12px] font-medium"
                      style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        style={{ borderColor: TOKENS.border }}
                        title="Open Task"
                      >
                        <Eye size={14} style={{ color: TOKENS.brand }} /> Open
                      </button>
                      <button
                        className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        style={{ borderColor: TOKENS.border }}
                        title="Change Status"
                      >
                        <RefreshCw size={14} style={{ color: TOKENS.brand }} /> Status
                      </button>
                      <button
                        className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        style={{ borderColor: TOKENS.border }}
                        title="Assign"
                      >
                        <UserPlus size={14} style={{ color: TOKENS.brand }} /> Assign
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {top5.length === 0 && (
              <tr>
                <td className="px-2 py-6 text-center text-sm" style={{ color: TOKENS.muted }} colSpan={6}>
                  No tasks to display in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex">
        <div className="ml-auto">
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border }}
            title="Open full list of tasks for this project"
          >
            View all tasks
            <ChevronRightSingle size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
