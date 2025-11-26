"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table as STable,
  TableBody as STableBody,
  TableCell as STableCell,
  TableHead as STableHead,
  TableHeader as STableHeader,
  TableRow as STableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  Filter,
  Settings2,
  Search,
  Info as InfoIcon,
  Edit2,
  Repeat,
  Calendar,
  Eye,
  ClipboardList,
  Trash2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";

import { Pagination } from "antd";

const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #1090D0)",
  valueBlue: "var(--wr-action, #0077FF)",
  subtle: "var(--wr-subtle, #F5F7FA)",
  good: "var(--wr-good, #28C76F)",
  warning: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  radius: "var(--wr-radius, 6px)",
};

export type TaskStatus = "todo" | "inprogress" | "review" | "blocked" | "done";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type SeriesPoint = { t: string; v: number };
type ServerStatusKey = "not_started" | "working" | "under_review" | "completed";

export type TaskRow = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: Priority;
  assignee?: { id: string; name: string; avatarUrl?: string } | null;
  startAt?: string | null;
  dueAt?: string | null;
  spentSeries?: SeriesPoint[]; // optional
};

const STATUS_SEGMENTS: Array<{ serverKey: ServerStatusKey; label: string; clientStatuses: TaskStatus[]; color: string }> = [
  { serverKey: "not_started", label: "Not Started", clientStatuses: ["todo"], color: "#9AA4B2" },
  { serverKey: "working", label: "In Progress", clientStatuses: ["inprogress", "blocked"], color: TOKENS.brand },
  { serverKey: "under_review", label: "Under Review", clientStatuses: ["review"], color: "#FF9F43" },
  { serverKey: "completed", label: "Completed", clientStatuses: ["done"], color: TOKENS.good },
];

const DEFAULT_SERVER_STATUS: ServerStatusKey = "not_started";

type ColKey =
  | "select"
  | "expander"
  | "title"
  | "assignee"
  | "priority"
  | "status"
  | "start"
  | "due"
  | "actions";

export interface TasksActivitiesTableProps {
  projectName?: string;
  rows: TaskRow[];
  loading?: boolean;
  error?: string | null;

  // Pass reducer meta per status, with 'count' included if available.
  pageInfo?: Partial<
    Record<
      ServerStatusKey,
      { next?: string | null; previous?: string | null; count?: number; loading?: boolean }
    >
  >;

  // Will be called by this component to fetch NEXT pages for a specific status as needed.
  onLoadMore?: (
    statusKey: ServerStatusKey,
    opts?: { page?: number; pageSize?: number }
  ) => Promise<void> | void;

  fetchPage?: (statusKey: ServerStatusKey, page: number, pageSize: number) => Promise<TaskRow[]>;

  // Task actions
  onOpenTask?: (id: string) => void;
  onCompleteTask?: (id: string) => void;
}

const avatarTintFromId = (id?: string) => {
  const hues = ["#7C8CF8", "#6AB0FF", "#7AD8B0", "#A16BD9", "#F59E0B", "#5B8DEF", "#96C56F", "#E49B5E"];
  let h = 0;
  const s = String(id || "x");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % hues.length;
  return hues[h];
};
const Avatar: React.FC<{ userId?: string; name?: string }> = ({ userId, name }) => {
  const color = avatarTintFromId(userId);
  const initials = (name || "U").slice(0, 2).toUpperCase();

  return (
    <span
      title={name}
      aria-label={name}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white"
      style={{ background: color }}
    >
      {initials}
    </span>
  );
};
const Pill: React.FC<{ label: string; color: string; soft?: boolean }> = ({ label, color, soft = true }) => (
  <span
    className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[12px] leading-none"
    style={{ color, background: soft ? `${color}1A` : "transparent", borderColor: `${color}33` }}
  >
    {label}
  </span>
);

const toDateLabel = (d: string | number | Date) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

const TrendPopover: React.FC<{ series?: SeriesPoint[] }> = ({ series }) => {
  const data = useMemo(
    () => (Array.isArray(series) ? series.map((p) => ({ date: p.t, value: p.v })) : []),
    [series]
  );

  if (!data.length) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground" style={{ borderColor: TOKENS.border }}>
        No activity data
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="group inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 hover:bg-[#F7FAFC]" style={{ borderColor: TOKENS.border }}>
          {/* Mini bars trigger */}
          <div className="h-6 w-[200px] overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <Bar dataKey="value" fill={TOKENS.brand} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <span className="text-xs text-muted-foreground">View trend</span>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[520px]">
        <div className="text-sm font-medium mb-2">Activity (last 14 days)</div>
        <div className="h-44 w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={TOKENS.border} vertical={false} />
              <XAxis dataKey="date" tickFormatter={(t) => toDateLabel(t)} />
              <YAxis />
              <RTooltip
                content={({ active, label, payload }) => {
                  if (!active) return null;
                  return (
                    <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border, color: TOKENS.text }}>
                      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>{toDateLabel(label as string)}</div>
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TOKENS.valueBlue }} />
                          <span style={{ color: TOKENS.muted }}>Events</span>
                        </div>
                        <div className="font-semibold">{payload?.[0]?.value ?? 0}</div>
                      </div>
                    </div>
                  );
                }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              <Bar dataKey="value" name="Events" fill={TOKENS.valueBlue} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function TasksActivitiesTable({
  projectName = "Current Project",
  rows,
  loading = false,
  error = null,
  pageInfo,
  onLoadMore,
  fetchPage,
  onOpenTask,
  onCompleteTask,
}: TasksActivitiesTableProps) {
  const safeRows = Array.isArray(rows) ? rows : [];

  /* Filters & scoped status */
  const [query, setQuery] = useState("");
  const [activeServerStatus, setActiveServerStatus] = useState<ServerStatusKey>(DEFAULT_SERVER_STATUS);
  const activeStatusSet = useMemo(() => {
    const segment = STATUS_SEGMENTS.find((s) => s.serverKey === activeServerStatus);
    return new Set<TaskStatus>(segment?.clientStatuses ?? ["todo"]);
  }, [activeServerStatus]);
  const activeSegment = useMemo(
    () => STATUS_SEGMENTS.find((s) => s.serverKey === activeServerStatus) ?? STATUS_SEGMENTS[0],
    [activeServerStatus]
  );
  const [pageFillState, setPageFillState] = useState<Record<ServerStatusKey, boolean>>({
    not_started: false,
    working: false,
    under_review: false,
    completed: false,
  });
  const isPageFilling = pageFillState[activeServerStatus] ?? false;
  // Keep a ref so pagination effect doesn't cancel its fetch when we toggle the fill loader state.
  const isPageFillingRef = useRef(isPageFilling);
  useEffect(() => {
    isPageFillingRef.current = isPageFilling;
  }, [isPageFilling, activeServerStatus]);
  const [prioSet, setPrioSet] = useState<Set<Priority>>(new Set(["P1", "P2", "P3", "P4"]));
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const activeRowsAll = useMemo(
    () => safeRows.filter((r) => activeStatusSet.has(r.status)),
    [safeRows, activeStatusSet]
  );

  const clearAllFilters = () => {
    setQuery("");
    setActiveServerStatus(DEFAULT_SERVER_STATUS);
    setPrioSet(new Set(["P1", "P2", "P3", "P4"]));
    setAssigneeFilter("all");
    setOnlyOverdue(false);
    setPage(1);
  };

  const ALL_COLS: { key: ColKey; label: string; width?: number; align?: "left" | "right" | "center"; sortable?: boolean; sticky?: boolean; stickyLeft?: number }[] = [
    { key: "select", label: "", width: 36, align: "center", sticky: true, stickyLeft: 0 },
    { key: "expander", label: "", width: 36, align: "center", sticky: true, stickyLeft: 36 },
    { key: "title", label: "Task Title", width: 360, sortable: true, sticky: true, stickyLeft: 72 },
    { key: "assignee", label: "Assignee", width: 180, sortable: true },
    { key: "priority", label: "Priority", width: 120, sortable: true, align: "center" },
    { key: "status", label: "Status", width: 140, sortable: true, align: "center" },
    { key: "start", label: "Start", width: 120, sortable: true, align: "right" },
    { key: "due", label: "Due", width: 120, sortable: true, align: "right" },
    { key: "actions", label: "Actions", width: 160 },
  ];
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>({
    select: true,
    expander: true,
    title: true,
    assignee: true,
    priority: true,
    status: true,
    start: true,
    due: true,
    actions: true,
  });
  const visibleColumns = useMemo(() => ALL_COLS.filter((c) => visibleCols[c.key] !== false), [ALL_COLS, visibleCols]);

  /* Sorting */
  type SortKey = Exclude<ColKey, "select" | "expander" | "actions">;
  const [sortBy, setSortBy] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (k: ColKey) => {
    if (k === "select" || k === "expander" || k === "actions") return;
    const key = k as SortKey;
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  /* Selection / Expansion */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      if (multiExpand) return { ...prev, [id]: !prev[id] };
      const next: Record<string, boolean> = {};
      if (!prev[id]) next[id] = true;
      return next;
    });
  };

  /* Pagination state (AntD) */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [explicitPages, setExplicitPages] = useState<Record<ServerStatusKey, { page: number; rows: TaskRow[] } | null>>({
    not_started: null,
    working: null,
    under_review: null,
    completed: null,
  });
  const activeExplicit = explicitPages[activeServerStatus];
  const usingExplicitPage = Boolean(activeExplicit && activeExplicit.page === page);
  const baseRows = usingExplicitPage ? activeExplicit?.rows ?? [] : activeRowsAll;

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    baseRows.forEach((r) => {
      const id = r.assignee?.id || "_unassigned";
      const name = r.assignee?.name || "Unassigned";
      if (!map.has(id)) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [baseRows]);
  const handleStatusSegmentClick = (next: ServerStatusKey) => {
    if (next === activeServerStatus) return;
    setActiveServerStatus(next);
    setPage(1);
    setSelected({});
    setExpanded({});
  };

  /* Filter → Sort */
  function daysFromToday(iso?: string | null) {
    if (!iso) return Number.NaN;
    const d = new Date(iso);
    const t = new Date();
    const dd = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    return Math.round((dd(d).getTime() - dd(t).getTime()) / 86400000);
  }
  const filtered = useMemo(() => {
    const tq = query.trim().toLowerCase();
    return baseRows.filter((r) => {
      if (tq && !r.title.toLowerCase().includes(tq)) return false;
      if (!activeStatusSet.has(r.status)) return false;
      if (r.priority && !prioSet.has(r.priority)) return false;
      if (assigneeFilter !== "all" && (r.assignee?.id || "_unassigned") !== assigneeFilter) return false;
      if (onlyOverdue) {
        if (r.status === "done") return false;
        if (!r.dueAt || daysFromToday(r.dueAt) >= 0) return false;
      }
      return true;
    });
  }, [baseRows, query, activeStatusSet, prioSet, assigneeFilter, onlyOverdue]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const keyer = (r: TaskRow) => {
      switch (sortBy) {
        case "title":
          return r.title.toLowerCase();
        case "assignee":
          return r.assignee?.name || "";
        case "priority":
          return r.priority || "P4";
        case "status":
          return r.status;
        case "start":
          return r.startAt || "";
        case "due":
        default:
          return r.dueAt || "";
      }
    };
    arr.sort((a, b) => {
      const av = keyer(a), bv = keyer(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Reset to first page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [query, activeServerStatus, prioSet, assigneeFilter, onlyOverdue, sortBy, sortDir]);

  /* ======= Server pagination coordination (single active status) ======= */
  const activeMeta = pageInfo?.[activeServerStatus];
  const canLoadMoreActive = Boolean(activeMeta?.next);
  const loadingActive = Boolean(activeMeta?.loading);

  const loadMoreForActive = useCallback(async () => {
    if (!onLoadMore || !canLoadMoreActive || loadingActive || isPageFilling || usingExplicitPage) return;
    await onLoadMore(activeServerStatus);
  }, [onLoadMore, canLoadMoreActive, loadingActive, activeServerStatus, isPageFilling, usingExplicitPage]);

  // Compute total from meta counts (fallback to loaded length)
  const metaCounts: Record<ServerStatusKey, number | undefined> = {
    not_started: pageInfo?.not_started?.count,
    working: pageInfo?.working?.count,
    under_review: pageInfo?.under_review?.count,
    completed: pageInfo?.completed?.count,
  };
  const activeServerCount = metaCounts[activeServerStatus];
  const totalAvailable =
    typeof activeServerCount === "number" ? activeServerCount : sorted.length;

  // Ensure we have enough rows loaded to render requested page
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  useEffect(() => {
    if (pageSize <= 0) return;
    const availableRows = activeRowsAll.length;
    const rawFinalPage = Math.max(1, Math.ceil(endIdx / pageSize));
    const maxPage =
      typeof activeServerCount === "number" ? Math.max(1, Math.ceil(activeServerCount / pageSize)) : rawFinalPage;
    const desiredPage = Math.min(rawFinalPage, maxPage);

    if (endIdx <= availableRows) {
      if (activeExplicit) {
        setExplicitPages((state) => ({ ...state, [activeServerStatus]: null }));
      }
      return;
    }

    if (typeof activeServerCount === "number" && availableRows >= activeServerCount) return;
    if (isPageFillingRef.current || usingExplicitPage) return;

    if (fetchPage) {
      let cancelled = false;
      setPageFillState((state) => ({ ...state, [activeServerStatus]: true }));
      fetchPage(activeServerStatus, desiredPage, pageSize)
        .then((rows) => {
          if (cancelled) return;
          setExplicitPages((state) => ({ ...state, [activeServerStatus]: { page: desiredPage, rows } }));
        })
        .catch(() => {
          if (cancelled) return;
          setExplicitPages((state) => ({ ...state, [activeServerStatus]: null }));
        })
        .finally(() => {
          if (cancelled) return;
          setPageFillState((state) => ({ ...state, [activeServerStatus]: false }));
        });
      return () => {
        cancelled = true;
      };
    }

    if (!onLoadMore || !canLoadMoreActive) return;
    const nextPage = Math.floor(availableRows / pageSize) + 1;
    let cancelled = false;
    setPageFillState((state) => ({ ...state, [activeServerStatus]: true }));
    Promise.resolve(onLoadMore(activeServerStatus, { page: nextPage, pageSize }))
      .catch(() => null)
      .finally(() => {
        if (cancelled) return;
        setPageFillState((state) => ({ ...state, [activeServerStatus]: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [
    fetchPage,
    onLoadMore,
    activeRowsAll.length,
    endIdx,
    pageSize,
    activeServerStatus,
    activeServerCount,
    usingExplicitPage,
    canLoadMoreActive,
    activeExplicit,
  ]);

  const windowedRows = useMemo(() => {
    if (usingExplicitPage) return sorted;
    const start = startIdx;
    return sorted.slice(start, Math.min(sorted.length, endIdx));
  }, [sorted, startIdx, endIdx, usingExplicitPage]);
  const showInitialSkeleton = loading && sorted.length === 0;
  const showPageFillSkeleton = isPageFilling && windowedRows.length === 0;
  const skeletonRowCount = Math.max(1, Math.min(pageSize, 10));

  /* Helpers */
  const colorForStatus = (s: TaskStatus) =>
    s === "done" ? TOKENS.good : s === "inprogress" ? TOKENS.brand : s === "review" ? "#FF9F43" : s === "blocked" ? TOKENS.critical : "#9AA4B2";
  const priorityLabel = (p?: Priority) => (p === "P1" ? "High" : p === "P2" ? "Medium" : p === "P3" ? "Low" : "None");
  const priorityColor = (p?: Priority) => (p === "P1" ? TOKENS.critical : p === "P2" ? TOKENS.warning : p === "P3" ? "#9AA4B2" : "#9AA4B2");
  const dueDecor = (r: TaskRow) => {
    if (r.status !== "done" && r.dueAt && daysFromToday(r.dueAt) < 0) return { color: TOKENS.critical, label: r.dueAt };
    if (r.status !== "done" && r.dueAt && daysFromToday(r.dueAt) === 0) return { color: TOKENS.warning, label: r.dueAt };
    return { color: TOKENS.muted, label: r.dueAt || "—" };
  };

  // Status counts for tooltip (fallback to locally loaded distribution)
  const localDist = useMemo(() => {
    const dist = { not_started: 0, working: 0, under_review: 0, completed: 0 };
    safeRows.forEach((r) => {
      if (r.status === "todo") dist.not_started += 1;
      else if (r.status === "inprogress" || r.status === "blocked") dist.working += 1; // blocked folded into working for summary
      else if (r.status === "review") dist.under_review += 1;
      else if (r.status === "done") dist.completed += 1;
    });
    return dist;
  }, [safeRows]);
  const countsForTooltip: Record<ServerStatusKey, number> = {
    not_started: metaCounts.not_started ?? localDist.not_started,
    working: metaCounts.working ?? localDist.working,
    under_review: metaCounts.under_review ?? localDist.under_review,
    completed: metaCounts.completed ?? localDist.completed,
  };
  const statusSummary = STATUS_SEGMENTS.map((segment) => ({
    ...segment,
    count: countsForTooltip[segment.serverKey],
  }));

  return (
    <Card className="border" style={{ borderColor: TOKENS.border }}>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">
            Tasks
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Expand multiple (unchanged) */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Expand multiple rows</span>
              <Switch checked={multiExpand} onCheckedChange={setMultiExpand} />
            </div>

            {/* Columns (unchanged) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm text-muted-foreground hover:bg-[#F7FAFC]">
                  <Settings2 className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                <div className="mb-2 text-sm font-medium">Show / Hide Columns</div>
                <ScrollArea className="max-h-[360px] pr-2">
                  <div className="space-y-2">
                    {ALL_COLS.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          disabled={c.key === "select" || c.key === "expander" || c.key === "title"}
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                        />
                        <span>{c.label || c.key}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-3 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setVisibleCols({
                        select: true,
                        expander: true,
                        title: true,
                        assignee: true,
                        priority: true,
                        status: true,
                        start: true,
                        due: true,
                        actions: true,
                      })
                    }
                  >
                    Reset
                  </Button>
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export (unchanged) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const cols: (keyof TaskRow | "assigneeName")[] = ["title", "assigneeName", "priority", "status", "startAt", "dueAt"];
                const dataset = selectedIds.length ? sorted.filter((r) => selected[r.id]) : sorted;
                const header = cols.join(",");
                const lines = dataset.map((r) => {
                  const row: Record<string, any> = { ...r, assigneeName: r.assignee?.name || "Unassigned" };
                  return cols.map((k) => JSON.stringify(row[k] ?? "")).join(",");
                });
                const csv = header + "\n" + lines.join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = selectedIds.length ? "tasks-selected.csv" : "tasks.csv";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Export
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusSummary.map((segment) => {
            const isActive = segment.serverKey === activeServerStatus;
            return (
              <button
                key={segment.serverKey}
                type="button"
                onClick={() => handleStatusSegmentClick(segment.serverKey)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${isActive ? "shadow-sm" : ""}`}
                style={{
                  borderColor: isActive ? segment.color : TOKENS.borderLight,
                  background: isActive ? `${segment.color}1A` : "transparent",
                  color: isActive ? segment.color : TOKENS.muted,
                }}
              >
                <span className="font-semibold">{segment.label}</span>
                <span className="text-sm text-muted-foreground">· {segment.count}</span>
                {isActive ? (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </CardHeader>

      {/* Bulk bar (unchanged) */}
      {anySelected && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2" style={{ background: TOKENS.subtle, borderColor: TOKENS.border }}>
          <div className="text-sm" style={{ color: TOKENS.text }}>
            <strong>{selectedIds.length}</strong> selected
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-2" onClick={() => selectedIds.forEach((id) => onCompleteTask?.(id))}>
              <ClipboardList className="h-4 w-4" /> Mark Complete
            </Button>
            <Button size="sm" variant="outline" onClick={() => alert("Reassign (bulk)")}>
              Reassign
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const cols: (keyof TaskRow | "assigneeName")[] = ["title", "assigneeName", "priority", "status", "startAt", "dueAt"];
                const dataset = sorted.filter((r) => selected[r.id]);
                const header = cols.join(",");
                const lines = dataset.map((r) => {
                  const row: Record<string, any> = { ...r, assigneeName: r.assignee?.name || "Unassigned" };
                  return cols.map((k) => JSON.stringify(row[k] ?? "")).join(",");
                });
                const csv = header + "\n" + lines.join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "tasks-selected.csv";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Export Selection
            </Button>
            <Button size="sm" variant="destructive" onClick={() => alert("Remove (bulk)")}>
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      )}

      {/* Filters Row — enriched tooltip to show counts (no new UI blocks) */}
      <CardContent className="border-t pt-4" style={{ borderColor: TOKENS.borderLight }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" /> Filters
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-3.5 w-3.5 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="space-y-2">
                    <div>Use filters to slice tasks below.</div>
                    <div className="text-[12px]">
                      <div className="font-medium mb-1">Counts (all statuses)</div>
                      <div>Not Started: <b>{countsForTooltip.not_started}</b></div>
                      <div>In Progress: <b>{countsForTooltip.working}</b></div>
                      <div>Under Review: <b>{countsForTooltip.under_review}</b></div>
                      <div>Completed: <b>{countsForTooltip.completed}</b></div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>

          {/* Search by title */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search task title…" className="w-[260px] pl-7" />
          </div>

          <div className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            Showing
            <span className="text-foreground">{activeSegment.label}</span>
          </div>

          {/* Priority */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC]">
                Priority
                <ChevronDown className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56">
              <div className="space-y-2 text-sm">
                {[
                  { key: "P1", label: "P1 — High" },
                  { key: "P2", label: "P2 — Medium" },
                  { key: "P3", label: "P3 — Low" },
                  { key: "P4", label: "P4 — None" },
                ].map((p) => (
                  <label key={p.key} className="flex items-center gap-2">
                    <Checkbox
                      checked={prioSet.has(p.key as Priority)}
                      onCheckedChange={(v) =>
                        setPrioSet((prev) => {
                          const next = new Set(prev);
                          if (v) next.add(p.key as Priority);
                          else next.delete(p.key as Priority);
                          return next;
                        })
                      }
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Assignee */}
          <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v)}>
            <SelectTrigger className="h-8 w-[200px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Overdue only */}
          <label className="ml-1 inline-flex cursor-pointer select-none items-center gap-2 text-sm">
            <Checkbox checked={onlyOverdue} onCheckedChange={(v) => setOnlyOverdue(Boolean(v))} />
            <span className="inline-flex items-center gap-1">
              Overdue only
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TOKENS.critical }} />
            </span>
          </label>
        </div>
      </CardContent>

      {/* Alert / Error / Empty */}
      {!!error && !loading && (
        <div className="flex items-center gap-2 border-t px-4 py-3 text-sm" style={{ borderColor: TOKENS.borderLight, color: TOKENS.critical }}>
          <AlertCircle className="h-4 w-4" />
          <div>{error}</div>
          {onLoadMore && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => loadMoreForActive()} disabled={isPageFilling}>
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <CardContent className="p-0">
        <div className="max-h-[60vh] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
          <STable className="text-sm">
            <STableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
              <STableRow>
                {visibleColumns.map((c) => (
                  <STableHead
                    key={c.key}
                    style={{
                      minWidth: c.width,
                      position: c.sticky ? "sticky" : undefined,
                      left: c.stickyLeft,
                      zIndex: c.sticky ? 40 : undefined,
                      background: c.sticky ? "#fff" : undefined,
                      boxShadow: c.sticky ? "inset -1px 0 0 rgba(0,0,0,0.06)" : undefined,
                    }}
                    className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                  >
                    {c.key === "select" ? (
                      <div className="flex items-center justify-center">
                        {/* Select all visible */}
                        <Checkbox
                          checked={
                            windowedRows.length > 0 &&
                            windowedRows.every((r) => selected[r.id]) ? true :
                            windowedRows.some((r) => selected[r.id]) ? "indeterminate" : false
                          }
                          onCheckedChange={(v) => {
                            const on = Boolean(v);
                            const patch: Record<string, boolean> = {};
                            windowedRows.forEach((r) => (patch[r.id] = on));
                            setSelected((s) => ({ ...s, ...patch }));
                          }}
                        />
                      </div>
                    ) : c.key === "expander" || !c.sortable ? (
                      c.label
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort(c.key)}
                        aria-label={`Sort by ${c.label}`}
                      >
                        <span>{c.label}</span>
                        {sortBy === (c.key as SortKey) ? (
                          sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </STableHead>
                ))}
              </STableRow>
            </STableHeader>

            <STableBody>
              {/* Loading skeleton (initial) */}
              {showInitialSkeleton && Array.from({ length: skeletonRowCount }).map((_, i) => (
                <STableRow key={`sk-${i}`}>
                  {visibleColumns.map((c) => (
                    <STableCell key={c.key}>
                      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                    </STableCell>
                  ))}
                </STableRow>
              ))}

              {showPageFillSkeleton &&
                Array.from({ length: skeletonRowCount }).map((_, i) => (
                  <STableRow key={`pf-${i}`}>
                    {visibleColumns.map((c) => (
                      <STableCell key={c.key}>
                        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                      </STableCell>
                    ))}
                  </STableRow>
                ))}
              {showPageFillSkeleton && (
                <STableRow>
                  <STableCell colSpan={visibleColumns.length}>
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading page {page}…
                    </div>
                  </STableCell>
                </STableRow>
              )}

              {/* Empty state */}
              {!loading && !error && sorted.length === 0 && (
                <STableRow>
                  <STableCell colSpan={visibleColumns.length}>
                    <div className="flex items-center justify-between rounded border p-4" style={{ borderColor: TOKENS.border }}>
                      <div className="text-sm text-muted-foreground">No tasks match the current filters.</div>
                      {onLoadMore && canLoadMoreActive && (
                        <Button size="sm" onClick={() => loadMoreForActive()} disabled={isPageFilling}>
                          Load more {activeSegment.label}
                        </Button>
                      )}
                    </div>
                  </STableCell>
                </STableRow>
              )}

              {/* Rows */}
              {windowedRows.map((r) => {
                const due = dueDecor(r);
                return (
                  <React.Fragment key={r.id}>
                    <STableRow className="hover:bg-[#F5F7FA]">
                      {visibleCols.select !== false && (
                        <STableCell
                          style={{ position: "sticky", left: 0, zIndex: 3, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }}
                          className="text-center"
                        >
                          <Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))} />
                        </STableCell>
                      )}
                      {visibleCols.expander !== false && (
                        <STableCell
                          style={{ position: "sticky", left: 36, zIndex: 3, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }}
                          className="text-center"
                        >
                          <button
                            className="rounded-md border p-1 hover:bg-muted"
                            onClick={() => toggleExpand(r.id)}
                            aria-label={expanded[r.id] ? "Collapse" : "Expand"}
                          >
                            {expanded[r.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </STableCell>
                      )}
                      {visibleCols.title !== false && (
                        <STableCell
                          style={{
                            position: "sticky",
                            left: 72,
                            zIndex: 3,
                            background: "#fff",
                            boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
                            minWidth: 360,
                          }}
                        >
                          <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); onOpenTask?.(r.id); }}
                            className="font-medium underline"
                            style={{ color: TOKENS.valueBlue }}
                            title="Open Task"
                          >
                            {r.title}
                          </a>
                          {r.description ? (
                            <div className="text-[12px] text-muted-foreground line-clamp-1">{r.description}</div>
                          ) : null}
                        </STableCell>
                      )}
                      {visibleCols.assignee !== false && (
                        <STableCell>
                          <div className="inline-flex items-center gap-2">
                            <Avatar userId={r.assignee?.id} name={r.assignee?.name} />
                            <span className="text-[13px] leading-none">{r.assignee?.name || "Unassigned"}</span>
                          </div>
                        </STableCell>
                      )}
                      {visibleCols.priority !== false && (
                        <STableCell className="text-center">
                          <Pill label={priorityLabel(r.priority)} color={priorityColor(r.priority)} />
                        </STableCell>
                      )}
                      {visibleCols.status !== false && (
                        <STableCell className="text-center">
                          <Pill
                            label={
                              r.status === "done"
                                ? "Completed"
                                : r.status === "inprogress"
                                ? "In Progress"
                                : r.status === "review"
                                ? "Under Review"
                                : r.status === "blocked"
                                ? "Blocked"
                                : "Not Started"
                            }
                            color={colorForStatus(r.status)}
                          />
                        </STableCell>
                      )}
                      {visibleCols.start !== false && (
                        <STableCell className="text-right text-[13px]" style={{ color: TOKENS.muted }}>
                          {r.startAt || "—"}
                        </STableCell>
                      )}
                      {visibleCols.due !== false && (
                        <STableCell className="text-right text-[13px]" style={{ color: due.color, fontWeight: 500 }}>
                          {due.label}
                        </STableCell>
                      )}
                      {visibleCols.actions !== false && (
                        <STableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Open" onClick={() => onOpenTask?.(r.id)} className="transition-transform hover:scale-110" style={{ color: TOKENS.valueBlue }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Open</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => onOpenTask?.(r.id)} className="transition-transform hover:scale-110" style={{ color: TOKENS.valueBlue }}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Edit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Reassign" onClick={() => onOpenTask?.(r.id)} className="transition-transform hover:scale-110" style={{ color: TOKENS.valueBlue }}>
                                    <Repeat className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Reassign</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Change Dates" onClick={() => onOpenTask?.(r.id)} className="transition-transform hover:scale-110" style={{ color: TOKENS.valueBlue }}>
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Change Dates</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </STableCell>
                      )}
                    </STableRow>

                    {/* Expanded row */}
                    {expanded[r.id] && (
                      <STableRow className="bg-[#F5F7FA]">
                        <STableCell colSpan={visibleColumns.length}>
                          <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2" style={{ borderColor: TOKENS.border }}>
                            <div>
                              <div className="mb-1 text-sm font-semibold">Timeline (last 14d)</div>
                              <TrendPopover series={r.spentSeries} />
                              <div className="mt-3 grid grid-cols-[70px_1fr] gap-2 text-sm">
                                <span className="text-muted-foreground">Status:</span>
                                <b>
                                  {r.status === "done"
                                    ? "Completed"
                                    : r.status === "inprogress"
                                    ? "In Progress"
                                    : r.status === "review"
                                    ? "Under Review"
                                    : r.status === "blocked"
                                    ? "Blocked"
                                    : "Not Started"}
                                </b>
                                <span className="text-muted-foreground">Priority:</span>
                                <b>{priorityLabel(r.priority)}</b>
                                <span className="text-muted-foreground">Start:</span>
                                <b>{r.startAt || "—"}</b>
                                <span className="text-muted-foreground">Due:</span>
                                <b>{r.dueAt || "—"}</b>
                              </div>
                            </div>

                            <div>
                              <div className="mb-1 text-sm font-semibold">Task Summary</div>
                              <div className="text-[13px] text-muted-foreground">{r.description || "—"}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button size="sm" onClick={() => onCompleteTask?.(r.id)}>
                                  ✅ Mark Complete
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onOpenTask?.(r.id)}>
                                  🔁 Reassign
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onOpenTask?.(r.id)}>
                                  📅 Change Due
                                </Button>
                              </div>
                            </div>
                          </div>
                        </STableCell>
                      </STableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </STableBody>
          </STable>
        </div>
      </CardContent>

      {/* Pagination footer (Ant Design) */}
      <div className="flex items-center justify-between border-t p-3" style={{ borderColor: TOKENS.borderLight }}>
        <div className="text-sm text-muted-foreground">
          Showing {sorted.length === 0 ? 0 : Math.min(totalAvailable, startIdx + 1)}–{Math.min(totalAvailable, startIdx + windowedRows.length)} of {totalAvailable}
          {loadingActive || isPageFilling ? <span className="ml-2">· Loading more…</span> : null}
        </div>
        <Pagination
          current={page}
          pageSize={pageSize}
          total={totalAvailable}
          showSizeChanger
          pageSizeOptions={[10, 25, 50, 100]}
          onChange={(p, ps) => {
            const newSize = Number(ps);
            setPageSize(newSize);
            setPage(p);
            setExplicitPages((state) => ({ ...state, [activeServerStatus]: null }));
          }}
        />
      </div>
    </Card>
  );
}
