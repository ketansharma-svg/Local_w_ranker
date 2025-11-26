"use client";

import { BASE_URL_WR } from "@/src/util/api";
import Cookies from "js-cookie";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import TaskCreationDrawerDemo from "../project-task-overview/UniversalTaskCreationDrawer";
import TaskManagerDrawer, { fromApiActivity } from "./TaskViewDrawer";


/* ───────────────────────── Tokens (UI from TXT, colours align with platform) ───────────────────────── */
const TK = {
  brand: "#1090D0",
  text: "#000000",
  muted: "#282829",
  card: "#FFFFFF",
  surface: "#F5F7FA",
  borderSubtle: "#EFF0F6",
  borderStrong: "#E5E7EB",
  accentBlue: "#D2EFFF",
  status: {
    overdue: "#EA5455",
    dueToday: "#FF9F43",
    completed: "#28C76F",
    inProgress: "#1090D0",
    inReview: "#FF9F43",
    notStarted: "#CBD5E1",
    neutral: "#6C757D",
  },
  priority: {
    High: "#EA5455",
    Medium: "#FF9F43",
    Low: "#9AA4B2",
  },
} as const;

/* ───────────────────────── Types (from your current ListView) ───────────────────────── */
type UiStatus = "Not Started" | "In Progress" | "Under Review" | "Completed";
const UI_STATUSES: UiStatus[] = ["Not Started", "In Progress", "Under Review", "Completed"];

const UI_TO_API: Record<UiStatus, "not_started" | "working" | "under_review" | "completed"> = {
  "Not Started": "not_started",
  "In Progress": "working",
  "Under Review": "under_review",
  "Completed": "completed",
};

const API_TO_UI: Record<string, UiStatus> = {
  not_started: "Not Started",
  working: "In Progress",
  under_review: "Under Review",
  completed: "Completed",
};

type ProjectAccess = {
  dashboard_type?: string | null;
  access_level?: string | null;
};

type CampaignProject = {
  project_id: number;
  project_name: string | null;
  domain: string;
  url: string;
  summary: {
    "Not Started": number;
    "Working": number;       // API wording for In Progress
    "Completed": number;
    "Under Review": number;
  };
  overdue: number
  due_today: number
  completed_this_week: number,
  accesses?: ProjectAccess[],
};

type TaskApi = {
  id: number;
  assigned_to: any;
  created_at: string;
  updated_at: string;
  title: string;
  is_custom: boolean;
  status: string; // "Not Started" | "Working" | "Completed" | "Under Review"
  progress: string;
  priority: "Low" | "Medium" | "High";
  date: string | null;
  due_date: string | null;
  description: string;
  time_spent_hours: number | null;
  time_spent_minutes: number | null;
  notes: string;
  is_published: boolean;
  completed_at: string | null;
  project: number;
  dashboard: unknown;
  default_activity: unknown;
  category: number | null;
  category_name?: string | null;
  assigned_by: unknown;
  last_updated_by: unknown;
};

type RowTask = {
  id: string;
  title: string;
  projectId: number;
  groupId: "m" | "s";
  ctype: string;
  assigneeId?: number | string;
  assigneeName: string | null;
  priority: "Low" | "Medium" | "High";
  status: UiStatus;
  due: string | null;         // yyyy-mm-dd
  description: string;
};

type AccessFilter = { mine: boolean; shared: boolean };
type HeaderFilters = { overdue: boolean; dueToday: boolean; high: boolean; mine: boolean };

/* ───────────────────────── Project-row model for TXT table UI ───────────────────────── */
type ProjectRow = {
  id: number;
  project: string;
  group: "My Projects" | "Shared with me";
  groupId: "m" | "s";
  accesses?: ProjectAccess[];
  assigneesCount: number;     // derived from loaded tasks (unique count)
  lastUpdated: string;        // yyyy-mm-dd (fallback: today)
  open: number;               // NS + WK + UR
  in_progress: number;        // WK
  overdue: number;            // derived from loaded tasks
  due_today: number;          // derived from loaded tasks
  upcoming: number;           // derived from loaded tasks (due>today)
  in_review: number;          // UR
  not_started: number;        // NS
  completed: number;          // CD (API total; label shows “(in range)” in UI)
  loadScore: number;          // simple scale based on open

};

type ProjectMeta = {
  id: number;
  name: string;
  url: string;
  domain: string;
  summary: CampaignProject["summary"];
  overdue: number;
  due_today: number;
  completed_this_week: number;
  groupId: "m" | "s";
  accesses?: ProjectAccess[];
};

/* ───────────────────────── Helpers ───────────────────────── */
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | string) => (typeof n === "number" ? n.toLocaleString() : n);

const statusOrder: UiStatus[] = ["In Progress", "Under Review", "Not Started", "Completed"];

const statusPill = (s: string) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    due_today: { label: "Due Today", color: "#7A4A00", bg: "#FFF3E0" },
    overdue: { label: "Overdue", color: "#7A1D1F", bg: "#FDECEC" },
    upcoming: { label: "Upcoming", color: "#0B4C6C", bg: "#E6F4FB" },
    review: { label: "In Review", color: "#7A4A00", bg: "#FFF3E0" },
    progress: { label: "In Progress", color: "#0B4C6C", bg: "#E6F4FB" },
    not_started: { label: "Not Started", color: "#3F4B57", bg: "#EDF2F7" },
    completed: { label: "Completed", color: "#0C5E3B", bg: "#E6F8F0" },
  };
  return map[s];
};

const hexTint = (hex: string) => `${hex}1A`; // ~10% alpha

/* guarded fetch with auth header (same as your ListView) */
async function fetchJson<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/* ───────────────────────── Main component (drop-in replacement) ───────────────────────── */
export default function ListView({
  campaignData,
  filters,
  accessFilter = { mine: true, shared: true },
  selectedProjectIds = [],
  onUpdate,
}: {
  campaignData: any;
  filters: HeaderFilters;
  accessFilter?: AccessFilter;
  selectedProjectIds?: string[];
  onUpdate?: () => void;
}) {

  const router = useRouter();
  const token = Cookies.get("login_access_token_wrank");

  /* Build projects from API structure (as in your current ListView) */
  const allProjects = useMemo<ProjectMeta[]>(
    () => [
      ...(campaignData?.as_manager || []).map((p: CampaignProject) => ({
        id: p.project_id,
        name: p.project_name || p.domain,
        url: p.url,
        domain: p.domain,
        summary: p.summary,
        overdue: Number(p.overdue ?? 0),
        due_today: Number(p.due_today ?? 0),
        completed_this_week: Number(p.completed_this_week ?? 0),
        groupId: "m" as const,
        accesses: p.accesses || [],
      })),
      ...(campaignData?.as_member || []).map((p: CampaignProject) => ({
        id: p.project_id,
        name: p.project_name || p.domain,
        url: p.url,
        domain: p.domain,
        summary: p.summary,
        overdue: Number(p.overdue ?? 0),
        due_today: Number(p.due_today ?? 0),
        completed_this_week: Number(p.completed_this_week ?? 0),
        groupId: "s" as const,
        accesses: p.accesses || [],
      })),
    ],
    [campaignData]
  );

  /* Apply ownership filter (mine/shared) */
  const projectsAccessFiltered = useMemo<ProjectMeta[]>(() => {
    return allProjects.filter((p) => {
      if (!accessFilter?.mine && p.groupId === "m") return false;
      if (!accessFilter?.shared && p.groupId === "s") return false;
      return true;
    });
  }, [allProjects, accessFilter]);

  /* Apply external picker filter (if any) */
  const projects = useMemo<ProjectMeta[]>(() => {
    if (!selectedProjectIds?.length) return projectsAccessFiltered;
    const set = new Set(selectedProjectIds.map(String));
    return projectsAccessFiltered.filter((p) => set.has(String(p.id)));
  }, [projectsAccessFiltered, selectedProjectIds]);

  /* Index for convenient lookups */
  const PROJ = useMemo(() => {
    const m = new Map<number, ProjectMeta>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  /* Per-project loaded tasks + derived counts (overdue/dueToday/upcoming + assignees) */
  type ProjectLoad = {
    loading: boolean;
    error?: string;
    loadedOnce: boolean;
    pagesByStatus: Record<
      UiStatus,
      { items: RowTask[]; next: string | null; page: number; total: number }
    >;
    counts: { overdue: number; due_today: number; upcoming: number; assignees: Set<string | number> };
    lastUpdated: string; // when we last inflated counts, yyyy-mm-dd
  };

  const [projectState, setProjectState] = useState<Record<number, ProjectLoad>>({});

  /* Reset per-project state when projects change */
  useEffect(() => {
    const init: Record<number, ProjectLoad> = {};
    const today = todayISO();
    projects.forEach((p) => {
      init[p.id] = {
        loading: false,
        loadedOnce: false,
        pagesByStatus: {
          "Not Started": { items: [], next: null, page: 0, total: 0 },
          "In Progress": { items: [], next: null, page: 0, total: 0 },
          "Under Review": { items: [], next: null, page: 0, total: 0 },
          "Completed": { items: [], next: null, page: 0, total: 0 },
        },
        counts: { overdue: 0, due_today: 0, upcoming: 0, assignees: new Set() },
        lastUpdated: today,
      };
    });
    setProjectState(init);
  }, [projects]);

  /* Global rows list (for expansion table + drawer) */
  const [rows, setRows] = useState<RowTask[]>([]);

  /* ===== Fetch logic (adapted from your ListView) ===== */
  const apiToUiStatus = (s: string): UiStatus => {
    const k = String(s || "").toLowerCase();
    return API_TO_UI[k] ?? "Not Started";
  };
  const mapApiToRow = useCallback(
    (t: TaskApi): RowTask => {
      const proj = PROJ.get(t.project) || { groupId: "m" as const };
      return {
        id: String(t.id),
        title: t.title,
        projectId: t.project,
        groupId: proj.groupId || "m",
        ctype: t.category_name ?? "—",
        assigneeId:
          typeof t.assigned_to === "object" ? (t.assigned_to?.id ?? undefined) : t.assigned_to ?? undefined,
        assigneeName:
          typeof t.assigned_to === "object" ? (t.assigned_to?.name ?? "Unassigned") : t.assigned_to || "Unassigned",
        priority: (t.priority as "Low" | "Medium" | "High") || "Low",
        status: apiToUiStatus(t.status),
        due: t.due_date ? t.due_date.slice(0, 10) : null,
        description: t.description || "",
      };
    },
    [PROJ]
  );

  const uiToApi = (s: UiStatus) => UI_TO_API[s];

  const inflateDerivedCounts = (pl: ProjectLoad): ProjectLoad => {
    const today = todayISO();
    let overdue = 0,
      due_today = 0,
      upcoming = 0;
    const assignees = new Set<string | number>();

    UI_STATUSES.forEach((u) => {
      for (const t of pl.pagesByStatus[u].items) {
        if (t.assigneeId != null) assignees.add(t.assigneeId);
        if (!t.due || u === "Completed") continue;
        const d = t.due;
        if (d < today) overdue++;
        else if (d === today) due_today++;
        else upcoming++;
      }
    });

    return {
      ...pl,
      counts: { overdue, due_today, upcoming, assignees },
      lastUpdated: today,
    };
  };

  const fetchFirstPageForStatuses = useCallback(
    async (projectId: number, statuses: UiStatus[]) => {
      setProjectState((s) => ({ ...s, [projectId]: { ...(s[projectId] ?? {} as any), loading: true, error: undefined } }));

      try {
        const results = await Promise.all(
          statuses.map(async (ui) => {
            const url = `https://dashboard.wranker.com/api/campaigns/activities/${projectId}/?status=${encodeURIComponent(
              uiToApi(ui)
            )}&page=1&page_size=10`;
            const data = await fetchJson<{
              count: number;
              next: string | null;
              previous: string | null;
              results: TaskApi[];
            }>(url, token);
            return { ui, data };
          })
        );

        const mappedAppend: RowTask[] = [];
        setProjectState((state) => {
          const st0 = state[projectId];
          let next: ProjectLoad = {
            ...(st0 || {
              loading: false,
              loadedOnce: false,
              pagesByStatus: {
                "Not Started": { items: [], next: null, page: 0, total: 0 },
                "In Progress": { items: [], next: null, page: 0, total: 0 },
                "Under Review": { items: [], next: null, page: 0, total: 0 },
                "Completed": { items: [], next: null, page: 0, total: 0 },
              },
              counts: { overdue: 0, due_today: 0, upcoming: 0, assignees: new Set() },
              lastUpdated: todayISO(),
            }),
            loading: false,
            loadedOnce: true,
          };

          results.forEach(({ ui, data }) => {
            const mapped = data.results.map(mapApiToRow);
            mappedAppend.push(...mapped);
            next = {
              ...next,
              pagesByStatus: {
                ...next.pagesByStatus,
                [ui]: { items: mapped, next: data.next, page: 1, total: data.count },
              },
            };
          });

          next = inflateDerivedCounts(next);
          return { ...state, [projectId]: next };
        });

        // dedupe into global rows
        setRows((prev) => {
          const cur = new Map(prev.map((r) => [r.id, r]));
          mappedAppend.forEach((r) => cur.set(r.id, r));
          return Array.from(cur.values());
        });

        toast.success("Tasks loaded.");
      } catch (e: any) {
        setProjectState((s) => ({ ...s, [projectId]: { ...(s[projectId] ?? {} as any), loading: false, error: String(e?.message || e) } }));
        toast.error("Failed to load tasks. Please try again.");
      }
    },
    [mapApiToRow, token]
  );

  const loadMoreForProject = useCallback(
    async (projectId: number) => {
      const st = projectState[projectId];
      if (!st) return;
      const nextFor = UI_STATUSES.find((ui) => st.pagesByStatus[ui]?.next);
      if (!nextFor) {
        toast.info("No more tasks to load.");
        return;
      }

      setProjectState((s) => ({ ...s, [projectId]: { ...s[projectId], loading: true } }));
      try {
        const nextUrl = st.pagesByStatus[nextFor].next!;
        const data = await fetchJson<{
          count: number;
          next: string | null;
          previous: string | null;
          results: TaskApi[];
        }>(nextUrl, token);

        const mapped = data.results.map(mapApiToRow);

        setProjectState((state) => {
          const prev = state[projectId];
          let next = {
            ...prev,
            loading: false,
            pagesByStatus: {
              ...prev.pagesByStatus,
              [nextFor]: {
                items: [...prev.pagesByStatus[nextFor].items, ...mapped],
                next: data.next,
                page: prev.pagesByStatus[nextFor].page + 1,
                total: data.count,
              },
            },
          };
          next = inflateDerivedCounts(next);
          return { ...state, [projectId]: next };
        });

        setRows((prev) => {
          const cur = new Map(prev.map((r) => [r.id, r]));
          mapped.forEach((r) => cur.set(r.id, r));
          return Array.from(cur.values());
        });
      } catch (e) {
        setProjectState((s) => ({ ...s, [projectId]: { ...s[projectId], loading: false } }));
        toast.error("Failed to load more tasks.");
      }
    },
    [projectState, mapApiToRow, token]
  );

  /* Drawer */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | number | undefined>(undefined);
  const openTask = (id: string | number) => {
    setDrawerTaskId(id);
    setDrawerOpen(true);
  };
  const drawerLoader = async (id: string | number) => {
    const url = `${BASE_URL_WR}campaign-activities-new/${id}/`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return fromApiActivity(data);
  };
  const refreshOne = async (id: string | number) => {
    const url = `${BASE_URL_WR}campaign-activities-new/${id}/`;
    try {
      const data = await fetchJson<TaskApi>(url, token);
      const updated = mapApiToRow(data);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch { }
  };
  const applyComplete = async (id: string) => {
    try {
      const url = `${BASE_URL_WR}campaign-activities-new/complete/${id}/`;
      const res = await fetch(url, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status: "Completed" } : r)));
      toast.success("Task marked as completed.");
      onUpdate?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to mark as completed.");
    }
  };

  /* ===================== UI state (from TXT design) ===================== */
  type ColKey =
    | "sel"
    | "expand"
    | "project"
    | "group"
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
    { key: "sel", label: "", width: 36, sticky: true, align: "center" },
    { key: "expand", label: "", width: 40, sticky: true, align: "center" },
    { key: "project", label: "Project", width: 300, sticky: true, sortable: true, tip: "Project name (All Projects scope)" },
    { key: "group", label: "Group/Folder", width: 180, sticky: true, sortable: true },
    { key: "assignees", label: "Assignees", width: 110, sortable: true, align: "right" },
    { key: "open", label: "Total Open", width: 120, sortable: true, align: "right" },
    { key: "in_progress", label: "In-Progress", width: 120, sortable: true, align: "right" },
    { key: "overdue", label: "Overdue", width: 110, sortable: true, align: "right" },
    { key: "due_today", label: "Due Today", width: 120, sortable: true, align: "right" },
    { key: "upcoming", label: "Upcoming", width: 120, sortable: true, align: "right" },
    { key: "in_review", label: "In-Review", width: 120, sortable: true, align: "right" },
    { key: "not_started", label: "Not Started", width: 130, sortable: true, align: "right" },
    { key: "completed", label: "Completed (in range)", width: 170, sortable: true, align: "right" },
    { key: "load", label: "Load Score", width: 120, sortable: true, align: "right" },
    { key: "updated", label: "Last Updated", width: 140, sortable: true },
    { key: "actions", label: "Actions", width: 160, align: "center" },

  ];

  /* Compose project rows from server summary + derived counts */
  const projectRows: ProjectRow[] = useMemo(() => {
    const rows: ProjectRow[] = [];
    const today = todayISO();

    projects.forEach((p) => {
      const st = projectState[p.id];
      const ns = Number(p.summary["Not Started"] ?? 0);
      const wk = Number(p.summary["Working"] ?? 0);
      const ur = Number(p.summary["Under Review"] ?? 0);
      const cd = Number(p.summary["Completed"] ?? 0);

      const derived = st?.counts ?? { overdue: 0, due_today: 0, upcoming: 0, assignees: new Set() };
      const open = ns + wk + ur;
      const loadScore = Math.min(200, Math.round(100 * (open / Math.max(1, 12))));
      const overdue = st?.loadedOnce ? derived.overdue : Number((p as any).overdue ?? 0);
      const due_today = st?.loadedOnce ? derived.due_today : Number((p as any).due_today ?? 0);


      rows.push({
        id: p.id,
        project: p.name,
        group: p.groupId === "m" ? "My Projects" : "Shared with me",
        groupId: p.groupId,
        accesses: p.accesses || [],
        assigneesCount: derived.assignees.size,
        lastUpdated: st?.lastUpdated || today,
        open,
        in_progress: wk,
        overdue,
        due_today,
        upcoming: derived.upcoming,
        in_review: ur,
        not_started: ns,
        completed: cd,
        loadScore,

      });
    });

    return rows;
  }, [projects, projectState]);

  /* Filters (same controls as TXT) */
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<"All" | "My Projects" | "Shared with me">("All");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyDueToday, setOnlyDueToday] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  /* Column visibility (persist optional if you want) */
  const [visible, setVisible] = useState<Record<ColKey, boolean>>(() =>
    COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>)
  );

  /* Sorting */
  const [sortKey, setSortKey] = useState<ColKey>("project");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (c: ColDef) => {
    if (!c.sortable) return;
    if (sortKey !== c.key) {
      setSortKey(c.key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  /* Selection & expansion */
  const [sel, setSel] = useState<Record<number, boolean>>({});
  const [exp, setExp] = useState<Record<number, boolean>>({});

  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectForDrawer, setProjectForDrawer] = useState<ProjectMeta | null>(null);
  const [openCreate, setOpenCreate] = useState(false)


  /* Filtered */
  const filtered = useMemo(() => {
    let out = projectRows;
    if (q) {
      const s = q.toLowerCase();
      out = out.filter((r) => r.project.toLowerCase().includes(s));
    }
    if (groupFilter !== "All") out = out.filter((r) => r.group === groupFilter);
    if (onlyOverdue) out = out.filter((r) => r.overdue > 0);
    if (onlyDueToday) out = out.filter((r) => r.due_today > 0);
    return out;
  }, [projectRows, q, groupFilter, onlyOverdue, onlyDueToday]);

  /* Sorted */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: ProjectRow): any => {
      switch (sortKey) {
        case "project": return r.project;
        case "group": return r.group;
        case "assignees": return r.assigneesCount;
        case "open": return r.open;
        case "in_progress": return r.in_progress;
        case "overdue": return r.overdue;
        case "due_today": return r.due_today;
        case "upcoming": return r.upcoming;
        case "in_review": return r.in_review;
        case "not_started": return r.not_started;
        case "completed": return r.completed;
        case "load": return r.loadScore;
        case "updated": return r.lastUpdated;
        default: return r.project;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a), bv = getter(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  /* Paged window */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const start = (page - 1) * pageSize;
  const windowRows = useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);
  const visibleCols = useMemo(() => COLS.filter((c) => visible[c.key] !== false), [visible]);

  /* Helpers */
  const stickyStyle = (c: ColDef) => {
    if (!c.sticky) return undefined;
    let left = 0;
    for (const col of COLS) {
      if (col.key === c.key) break;
      if (visible[col.key] !== false && col.sticky) left += col.width ?? 120;
    }
    return { position: "sticky" as const, left, zIndex: 10, background: TK.card, boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" };
  };
  const densityRow = density === "compact" ? "h-9" : "h-12";
  const allOnPageSelected = windowRows.length > 0 && windowRows.every((r) => sel[r.id]);

  /* Expand: fetch first pages when opening a project (updates due/overdue/upcoming + assignees) */
  const onToggleExpand = async (projectId: number) => {
    setExp((x) => ({ ...x, [projectId]: !x[projectId] }));
    const willExpand = !exp[projectId];
    if (willExpand) {
      const st = projectState[projectId];
      if (st && !st.loadedOnce && !st.loading) {
        await fetchFirstPageForStatuses(projectId, UI_STATUSES);
      }
    }
  };

  /* CSV Export (visible columns on filtered+sorted set) */
  const exportCSV = () => {
    const vcols = COLS.filter((c) => visible[c.key] && !["sel", "expand", "actions"].includes(c.key));
    const header = vcols.map((c) => c.label).join(",");
    const lines = sorted.map((r) => {
      const cells = vcols.map((c) => {
        const val = colValue(r, c.key);
        return JSON.stringify(val ?? "");
      });
      return cells.join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "campaign-home-table.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  function colValue(r: ProjectRow, k: ColKey) {
    switch (k) {
      case "project": return r.project;
      case "group": return r.group;
      case "assignees": return r.assigneesCount;
      case "open": return r.open;
      case "in_progress": return r.in_progress;
      case "overdue": return r.overdue;
      case "due_today": return r.due_today;
      case "upcoming": return r.upcoming;
      case "in_review": return r.in_review;
      case "not_started": return r.not_started;
      case "completed": return r.completed;
      case "load": return r.loadScore;
      case "updated": return r.lastUpdated;

      default: return "";
    }
  }

  const handleTaskCreated = useCallback(async () => {
    try {
      if (projectId) {
        // Re-load first page for all 4 UI statuses → updates rows + derived counts
        await fetchFirstPageForStatuses(projectId, UI_STATUSES);
      }
      setOpenCreate(false);
      setProjectForDrawer(null);
      toast.success("Task created. Project task list refreshed.");
      // If the parent supplies onUpdate to re-fetch campaignData, call it too:
      onUpdate?.();
      // If you're using Next.js RSC for parent summaries, also do:
      router.refresh?.();
    } catch (e) {
      toast.error("Task created, but refresh failed. Try manual reload.");
    }
  }, [projectId, fetchFirstPageForStatuses, onUpdate, router]);


  /* Render */
  return (
    <section className="font-sans text-[14px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-[18px] font-semibold" style={{ color: TK.text }}>
          Table / List View – All Projects
        </h3>
        <div className="flex items-center gap-2">
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 bg-white" style={{ borderColor: TK.borderSubtle }} onClick={exportCSV}>
            Export CSV
          </button>

          <ColumnControl visible={visible} setVisible={setVisible} />
        </div>
      </div>

      {/* Filter bar */}
      <div className="mx-4 rounded-md border p-3" style={{ borderColor: TK.borderSubtle, background: TK.card }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
            <input
              className="w-[280px] rounded border pl-7 pr-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: TK.borderSubtle }}
              placeholder="Search by project…"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
          </div>

          <Chip active={onlyOverdue} onClick={() => { setOnlyOverdue((v) => !v); setPage(1); }} label="Overdue > 0" />
          <Chip active={onlyDueToday} onClick={() => { setOnlyDueToday((v) => !v); setPage(1); }} label="Due Today > 0" />


          {/* Right-side pager controls */}
          <div className="ml-auto flex items-center gap-2">
            <Select
              label="Rows"
              value={String(pageSize)}
              onChange={(v) => { setPageSize(Number(v)); setPage(1); }}
              items={["10", "25", "50", "100"]}
            />
            <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" style={{ borderColor: TK.borderSubtle }} disabled={page <= 1} onClick={() => setPage(1)}>
              « First
            </button>
            <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" style={{ borderColor: TK.borderSubtle }} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ‹ Prev
            </button>
            <span className="px-2 text-sm text-gray-600">{page} / {totalPages}</span>
            <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" style={{ borderColor: TK.borderSubtle }} disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next ›
            </button>
            <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" style={{ borderColor: TK.borderSubtle }} disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              Last »
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mx-4 mt-3 overflow-auto rounded-md border" style={{ borderColor: TK.borderSubtle }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b" style={{ borderColor: TK.borderSubtle }}>
              {visibleCols.map((c) => (
                <th key={c.key}
                  className={`px-3 py-2 text-left text-[12px] font-semibold text-gray-700 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}
                  style={{ minWidth: c.width, ...stickyStyle(c) }}
                  title={c.tip}>
                  {c.sortable ? (
                    <button className="inline-flex items-center gap-1 hover:text-black" onClick={() => toggleSort(c)}>
                      <span>{c.label}</span>
                      <SortIcon active={sortKey === c.key} dir={sortDir} />
                    </button>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {windowRows.map((r) => {
              const isSelected = !!sel[r.id];
              const st = projectState[r.id];
              const isSharedSeoViewer =
                r.groupId === "s" &&
                (r.accesses ?? []).some(
                  (a) =>
                    a?.dashboard_type === "SEO" &&
                    String(a?.access_level || "").toLowerCase() === "viewer",
                );
              return (
                <React.Fragment key={r.id}>
                  <tr className={`border-b ${densityRow} hover:bg-[#F5F7FA]`} style={{ borderColor: TK.borderSubtle, background: isSelected ? "#F0FAFF" : undefined }}>
                    {visible.sel !== false && (
                      <td className="px-3 text-center" style={stickyStyle(COLS[0])}>
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={!!sel[r.id]}
                          onChange={(e) => setSel((s) => ({ ...s, [r.id]: (e.target as HTMLInputElement).checked }))}
                        />
                      </td>
                    )}
                    {visible.expand !== false && (
                      <td className="px-3 text-center" style={stickyStyle(COLS[1])}>
                        <button className="rounded border px-1 text-xs hover:bg-gray-50" style={{ borderColor: TK.borderSubtle }}
                          onClick={() => onToggleExpand(r.id)} aria-label={exp[r.id] ? "Collapse" : "Expand"}>
                          {exp[r.id] ? "▾" : "▸"}
                        </button>
                      </td>
                    )}
                    {visible.project !== false && (
                      <td className="px-3" style={stickyStyle(COLS[2])}>
                        <div className="flex items-center gap-2">
                          <button className="text-[14px] font-medium text-brand-blue1 cursor-pointer underline underline-offset-2 hover:text-[#08384f]"
                            title="Open Project Task Overview"
                            onClick={() => router.push(`/project-task-overview?projectId=${r.id}`)}>
                            {r.project}
                          </button>

                          {st?.loading && <Loader2 size={14} className="animate-spin text-gray-500" />}
                        </div>
                      </td>
                    )}
                    {visible.group !== false && <td className="px-3" style={stickyStyle(COLS[3])}><span className="text-gray-800">{r.group}</span></td>}

                    {visible.assignees !== false && (<td className="px-3 text-right">{fmt(r.assigneesCount)}</td>)}
                    {visible.open !== false && (<td className="px-3 text-right">{fmt(r.open)}</td>)}
                    {visible.in_progress !== false && (<td className="px-3 text-right">{fmt(r.in_progress)}</td>)}
                    {visible.overdue !== false && (
                      <td className="px-3 text-right">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${r.overdue > 0 ? "text-white" : "text-gray-600"}`}
                          style={{ background: r.overdue > 0 ? TK.status.overdue : "#EDF2F7" }}>
                          {fmt(r.overdue)}
                        </span>
                      </td>
                    )}
                    {visible.due_today !== false && (
                      <td className="px-3 text-right">
                        <span className="inline-block rounded-full px-2 py-0.5 text-[12px] font-medium"
                          style={{ background: r.due_today > 0 ? "#FFF3E0" : "#EDF2F7", color: r.due_today > 0 ? "#7A4A00" : "#4B5563" }}>
                          {fmt(r.due_today)}
                        </span>
                      </td>
                    )}
                    {visible.upcoming !== false && (<td className="px-3 text-right">{fmt(r.upcoming)}</td>)}
                    {visible.in_review !== false && (<td className="px-3 text-right">{fmt(r.in_review)}</td>)}
                    {visible.not_started !== false && (<td className="px-3 text-right">{fmt(r.not_started)}</td>)}
                    {visible.completed !== false && (<td className="px-3 text-right">{fmt(r.completed)}</td>)}
                    {visible.load !== false && (
                      <td className="px-3 text-right" title="Load Score (0–200)">
                        <LoadBadge value={r.loadScore} />
                      </td>
                    )}
                    {visible.updated !== false && (<td className="px-3"><span className="text-gray-700">{r.lastUpdated}</span></td>)}
                    {visible.actions !== false && (
                      <td className="px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                            style={{ borderColor: TK.borderSubtle }}
                            title="Open Board"
                            onClick={() => router.push(`/project-task-overview?projectId=${r.id}`)}>
                            📋 Board
                          </button>
                          {!isSharedSeoViewer && (
                            <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                              style={{ borderColor: TK.borderSubtle }}
                              title="Create Task"
                              onClick={() => {
                                const projectMeta = PROJ.get(r.id);
                                if (!projectMeta) return;
                                setProjectId(projectMeta.id)
                                setProjectForDrawer(projectMeta)
                                setOpenCreate(true)
                              }}>
                              ➕ Task
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Expanded row: Top 5 tasks (prioritised) */}
                  {exp[r.id] && (
                    <tr className="border-b" style={{ borderColor: TK.borderSubtle }}>
                      <td className="px-3 py-3" colSpan={visibleCols.length} style={{ background: "#FAFBFF" }}>
                        <ExpandedTasksTable
                          projectId={r.id}
                          projectName={r.project}
                          state={projectState[r.id]}
                          onOpenTask={(id) => openTask(id)}
                          onComplete={(id) => applyComplete(String(id))}
                          onLoadMore={() => loadMoreForProject(r.id)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {windowRows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan={visibleCols.length}>
                  No projects match the current filters. Try clearing filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer pagination mirror */}
      <div className="mx-4 flex items-center justify-between border-b-0 border-t px-2 py-3 text-sm" style={{ borderColor: TK.borderSubtle }}>
        <div className="text-gray-600">
          Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + windowRows.length)} of {sorted.length}
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" style={{ borderColor: TK.borderSubtle }} disabled={page <= 1} onClick={() => setPage(1)}>« First</button>
          <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" style={{ borderColor: TK.borderSubtle }} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</button>
          <span className="px-2">{page} / {totalPages}</span>
          <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" style={{ borderColor: TK.borderSubtle }} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next ›</button>
          <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" style={{ borderColor: TK.borderSubtle }} disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last »</button>
        </div>
      </div>

      <TaskManagerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        taskId={drawerTaskId}
        api={{ baseUrl: BASE_URL_WR, auth: { type: "bearer", token } }}
        loader={drawerLoader}
        onUpdate={async () => {
          if (drawerTaskId) await refreshOne(drawerTaskId);
          onUpdate?.();
        }}
      />

      {projectId &&
        <TaskCreationDrawerDemo
          open={openCreate}
          setOpen={setOpenCreate}
          type={"createNew"}
          status={""}
          idPassed={projectId}
          projectPassed={projectForDrawer ?? undefined}
          onUpdate={async () => {
            await handleTaskCreated()
            setDrawerOpen(false)
          }}
        />
      }
    </section>
  );
}

/* ───────────────────────── Subcomponents (from TXT design, wired to dynamic data) ───────────────────────── */

function ColumnControl({
  visible,
  setVisible,
}: {
  visible: Record<string, boolean>;
  setVisible: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const [open, setOpen] = useState(false);
  const COLS_LOCAL = [
    "sel", "expand", "project", "group", "campaign", "assignees", "open", "in_progress", "overdue",
    "due_today", "upcoming", "in_review", "not_started", "completed", "load", "updated", "actions",
  ];
  const LABEL = {
    sel: "", expand: "", project: "Project", group: "Group/Folder", campaign: "Campaign",
    assignees: "Assignees", open: "Total Open", in_progress: "In-Progress", overdue: "Overdue",
    due_today: "Due Today", upcoming: "Upcoming", in_review: "In-Review", not_started: "Not Started",
    completed: "Completed (in range)", load: "Load Score", updated: "Last Updated", actions: "Actions"
  };
  return (
    <div className="relative">
      <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 bg-white" style={{ borderColor: TK.borderSubtle }} onClick={() => setOpen((o) => !o)}>
        Columns
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-md border bg-white p-3 text-sm shadow-lg" style={{ borderColor: TK.borderSubtle, zIndex: 50 }} onMouseLeave={() => setOpen(false)}>
          <div className="mb-2 font-semibold">Show / Hide</div>
          <div className="max-h-64 space-y-1 overflow-auto pr-1">
            {COLS_LOCAL.map((key) => (
              <label key={key} className="flex items-center justify-between gap-2">
                <span>{LABEL[key] || key}</span>
                <input
                  type="checkbox"
                  checked={visible[key] !== false}
                  onChange={(e) => setVisible((v) => ({ ...v, [key]: (e.target as HTMLInputElement).checked }))}
                  disabled={["sel", "expand", "project", "group"].includes(key)}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-between">
            <button className="rounded border px-2 py-1" style={{ borderColor: TK.borderSubtle }}
              onClick={() => setVisible({ sel: true, expand: true, project: true, group: true, campaign: true, assignees: true, open: true, in_progress: true, overdue: true, due_today: true, upcoming: true, in_review: true, not_started: true, completed: true, load: true, updated: true, actions: true })}>
              Reset
            </button>
            <button className="rounded border px-2 py-1" style={{ borderColor: TK.borderSubtle }} onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`rounded-full border px-3 py-1 text-sm ${active ? "font-semibold" : ""} hover:bg-gray-50`}
      style={{ borderColor: TK.borderSubtle, background: active ? TK.accentBlue : "#FFFFFF", color: active ? TK.brand : "#111827" }}
      onClick={onClick}
    >
      {label}
    </button>
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
      <select className="rounded border px-2 py-1.5 text-sm outline-none hover:bg-gray-50"
        style={{ borderColor: TK.borderSubtle }} value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        {items.map((it) => <option key={String(it)} value={String(it)}>{String(it)}</option>)}
      </select>
    </label>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return <span className={`text-xs ${active ? "text-gray-800" : "text-gray-400"}`}>{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>;
}

function LoadBadge({ value }: { value: number }) {
  const tone = value >= 150 ? { bg: "#FDECEC", color: "#7A1D1F" } : value <= 60 ? { bg: "#E7F5FE", color: "#0B4C6C" } : { bg: "#E6F8F0", color: "#0C5E3B" };
  return (
    <span className="inline-block rounded px-2 py-0.5 text-[12px] font-semibold" style={{ background: tone.bg, color: tone.color }} title="Load Score (0–200) vs team average">
      {value}
    </span>
  );
}

/* Expanded tasks table (wired to dynamic store) */
function ExpandedTasksTable({
  projectId,
  projectName,
  state,
  onOpenTask,
  onComplete,
  onLoadMore,
}: {
  projectId: number;
  projectName: string;
  state?: {
    pagesByStatus: Record<UiStatus, { items: RowTask[]; next: string | null }>;
    loading: boolean;
  };
  onOpenTask: (id: string | number) => void;
  onComplete: (id: string | number) => void;
  onLoadMore: () => void;
}) {
  const [openCreate, setOpenCreate] = useState(false)

  const items: RowTask[] = useMemo(() => {
    if (!state) return [];
    const all: RowTask[] = [];
    UI_STATUSES.forEach((u) => all.push(...state.pagesByStatus[u].items));
    // Prioritise: due today, overdue, upcoming, in review, in progress, not started, others (completed)
    const order = (t: RowTask) => {
      const today = todayISO();
      const d = t.due;
      const dueRank = d == null ? 5 : d < today ? 0 : d === today ? 1 : 2; // overdue=0, today=1, upcoming=2, none=5
      const statusRank = statusOrder.indexOf(t.status);
      return `${dueRank}-${statusRank}-${t.title}`;
    };
    return all.sort((a, b) => (order(a) > order(b) ? 1 : -1));
  }, [state]);

  const top5 = items.slice(0, 5);

  const hasMore = !!state && UI_STATUSES.some((u) => state.pagesByStatus[u].next);

  return (
    <div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle, background: "#FFFFFF" }}>
      <div className="mb-2 text-sm font-semibold">
        {projectName} — Recent / Priority Tasks
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-[12px] font-semibold text-gray-700" style={{ borderColor: TK.borderSubtle }}>
              <th className="px-2 py-2 text-left">Task</th>
              <th className="px-2 py-2 text-left">Campaign Type</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Assignee</th>
              <th className="px-2 py-2 text-left">Due</th>
              <th className="px-2 py-2 text-left">Priority</th>
              <th className="px-2 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((t) => {
              const overdue = t.due ? t.due < todayISO() && t.status !== "Completed" : false;
              const dueToday = t.due ? t.due === todayISO() && t.status !== "Completed" : false;
              const pill = t.status === "Completed"
                ? { bg: "#E6F8F0", color: "#0C5E3B", label: "Completed" }
                : t.status === "Under Review"
                  ? { bg: "#FFF3E0", color: "#7A4A00", label: "In Review" }
                  : t.status === "In Progress"
                    ? { bg: "#E6F4FB", color: "#0B4C6C", label: "In Progress" }
                    : { bg: "#EDF2F7", color: "#3F4B57", label: "Not Started" };

              return (
                <tr key={t.id} className="border-b hover:bg-[#F8FAFC]" style={{ borderColor: TK.borderSubtle }}>
                  <td className="px-2 py-2">
                    <button className="text-[14px] text-[#0B4C6C] underline hover:text-[#08384f]"
                      title="Open Task Drawer"
                      onClick={() => onOpenTask(t.id)}>
                      {t.title}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-block rounded px-2 py-0.5 text-[12px] font-medium" style={{ background: pill.bg, color: pill.color }}>
                      {t.ctype}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-block rounded px-2 py-0.5 text-[12px] font-medium" style={{ background: pill.bg, color: pill.color }}>
                      {pill.label}
                    </span>
                  </td>
                  <td className="px-2 py-2">{t.assigneeName || "Unassigned"}</td>
                  <td className="px-2 py-2">
                    {t.due ? (
                      <span
                        className={`rounded px-2 py-0.5 text-[12px] ${overdue ? "text-white" : dueToday ? "text-[#7A4A00]" : "text-gray-700"}`}
                        style={{ background: overdue ? TK.status.overdue : dueToday ? "#FFF3E0" : "#EDF2F7" }}
                      >
                        {t.due}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-block rounded px-2 py-0.5 text-[12px] font-medium"
                      style={{ background: hexTint(TK.priority[t.priority]), color: TK.priority[t.priority], border: `1px solid ${TK.borderSubtle}` }}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <button className="flex items-center gap-2 rounded border px-2 py-1 text-xs hover:bg-gray-50" style={{ borderColor: TK.borderSubtle }} title="Open Task" onClick={() => onOpenTask(t.id)}>
                        <Search className="size-4" /> Open
                      </button>
                      {/* <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50" style={{ borderColor: TK.borderSubtle }} title="Mark Complete" onClick={() => onComplete(t.id)}>
                        ✅ Complete
                      </button> */}
                    </div>
                  </td>
                </tr>
              );
            })}

            {top5.length === 0 && (
              <tr>
                <td className="px-2 py-6 text-center text-sm text-gray-500" colSpan={6}>
                  {state?.loading ? "Loading…" : "No tasks to display. Expand to load or add tasks."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex">
        <div className="ml-auto flex items-center gap-8">
          {hasMore && (
            <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              style={{ borderColor: TK.borderSubtle }}
              onClick={onLoadMore}>
              Load more
            </button>
          )}
          <button
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.borderSubtle }}
            title="Open full list of tasks for this project"
            onClick={() => window?.open(`/project-task-overview?projectId=${projectId}`, "_self")}
          >
            View all tasks →
          </button>
        </div>
      </div>


    </div>
  );
}
