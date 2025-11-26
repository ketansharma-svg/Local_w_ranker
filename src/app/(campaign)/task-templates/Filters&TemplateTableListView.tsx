"use client"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";


 import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft, ChevronRight,
  ChevronRight as ChevronRightIcon,
  ChevronsUpDown,
  Clock,
  Copy, Download,
  Edit,
  ExternalLink,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  User2,
  X,
} from "lucide-react";
import * as React from "react";
import ActivityDrawer from "./ActivityDrawer";


/* ───────────────────────── Design Tokens (Inter only) ───────────────────────── */
const TK = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#0077FF",
  text: "#111827",
  title: "#000000",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  subtle: "#F5F7FA",
  focus: "#D2EFFF",
  radius: 8,
  cardRadius: 12,
  shadow: "0 2px 6px rgba(0,0,0,.05)",
};

const WR_FONT_STYLE: React.CSSProperties = { fontFamily: "Inter, Inter var" };

/* ───────────────────────── Types ───────────────────────── */
type CampaignType = string;
type AssignedKind = "unassigned" | "projects" | "groups";

type TemplateRow = {
  id: string;
  title: string;
  campaignType: CampaignType;
  taskCount: number;
  createdBy: { id: string; name: string; avatar?: string };
  assignedTo: { kind: AssignedKind; count: number };
  updatedAt: string;
    categoryIsGlobal?: boolean;
  campaignIsGlobal?: boolean;
  activities?: Array<{
    id: string | number;
    title: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    is_published?: boolean;
  }>;
};

type FiltersModel = {
  q: string;
  campaignTypes: CampaignType[];
  assignedTo: "all" | "unassigned" | string;
  createdBy: "all" | string;
};

type SortKey = "title" | "taskCount" | "updatedAt";

/** NEW: tasks in a campaign/template */
type TaskStatus = "todo" | "in_progress" | "blocked" | "review" | "done";
type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: { id: string; name: string };
  due?: string; // ISO
};
type ActivityPreview = {
  id: string;
  title: string;
  description?: string;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
    is_global?: boolean;
  created_by?: number | string;
};

function toActivityPreviewList(row: TemplateRow, tasksById: Record<string, Task[]>): ActivityPreview[] {
  // Prefer real activities when present
  if (Array.isArray(row.activities) && row.activities.length) {
    return row.activities.map(a => ({
      id: String(a.id),
      title: a.title,
      description: a.description,
      is_published: a.is_published,
      created_at: a.created_at,
      updated_at: a.updated_at,
      is_global: (a as any).is_global,
  created_by: (a as any).created_by,
    }));
  }
  // Fallback to compact tasks fetched for the row
  const tasks = tasksById[row.id] ?? [];
  return tasks.map(t => ({
    id: String(t.id),
    title: t.title,
    description: undefined,
    is_published: t.status === "done",
    created_at: undefined,
    updated_at: t.due,
  }));
}

/* ───────────────────────── Mock Data & Fetch (replace with API) ───────────────────────── */
const USERS = [
  { id: "u1", name: "Vikash B." },
  { id: "u2", name: "Richa S." },
  { id: "u3", name: "John D." },
  { id: "u4", name: "Maya P." },
];
const CT: CampaignType[] = ["SEO", "Content", "Technical", "Reporting", "Internal", "Ads"];

function randomFrom<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n: number) { const d = new Date(Date.now() - n * 86400000); return d.toISOString(); }

function makeTemplates(n = 58): TemplateRow[] {
  return Array.from({ length: n }, (_, i) => {
    const u = randomFrom(USERS);
    const ct = randomFrom(CT);
    const assignedRoll = Math.random();
    const assignedTo: TemplateRow["assignedTo"] =
      assignedRoll < 0.35 ? { kind: "unassigned", count: 0 }
        : assignedRoll < 0.7 ? { kind: "projects", count: 1 + Math.floor(Math.random() * 4) }
          : { kind: "groups", count: 1 + Math.floor(Math.random() * 2) };

    return {
      id: `tpl-${i + 1}`,
      title: [
        "Local SEO Setup", "Content Calendar", "Site Audit Flow", "Technical Quick Fixes",
        "Reporting SOP", "On-Page Optimization", "Backlink Outreach", "Blog Production",
        "Launch Checklist", "Core Web Vitals", "Category Revamp", "International SEO",
      ][i % 12] + (Math.random() > 0.82 ? ` ${i + 1}` : ""),
      campaignType: ct,
      taskCount: 4 + Math.floor(Math.random() * 18),
      createdBy: u,
      assignedTo,
      updatedAt: daysAgo(Math.floor(Math.random() * 60)),
    };
  });
}
const ALL = makeTemplates();

/** Simulate server-side list w/ filter+sort+paging */
async function fetchTemplates(
  filters: FiltersModel,
  sortKey: SortKey,
  sortDir: "asc" | "desc",
  page: number,
  pageSize: number,
): Promise<{ rows: TemplateRow[]; total: number }> {
  await new Promise(r => setTimeout(r, 420));
  let data = ALL.slice();

  // Filters
  if (filters.q) {
    const q = filters.q.toLowerCase();
    data = data.filter(d => d.title.toLowerCase().includes(q));
  }
  if (filters.campaignTypes.length > 0) {
    const set = new Set(filters.campaignTypes);
    data = data.filter(d => set.has(d.campaignType));
  }
  if (filters.assignedTo !== "all") {
    if (filters.assignedTo === "unassigned") {
      data = data.filter(d => d.assignedTo.kind === "unassigned");
    } else {
      data = data.filter(d => d.assignedTo.kind !== "unassigned");
    }
  }
  if (filters.createdBy !== "all") {
    data = data.filter(d => d.createdBy.id === filters.createdBy);
  }

  // Sort
  const cmp = (a: any, b: any) => (a === b ? 0 : a > b ? 1 : -1);
  data.sort((a, b) => {
    let av: any, bv: any;
    switch (sortKey) {
      case "title": av = a.title.toLowerCase(); bv = b.title.toLowerCase(); break;
      case "taskCount": av = a.taskCount; bv = b.taskCount; break;
      default: av = new Date(a.updatedAt).getTime(); bv = new Date(b.updatedAt).getTime();
    }
    const res = cmp(av, bv);
    return sortDir === "asc" ? res : -res;
  });

  // Paging
  const total = data.length;
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);
  return { rows, total };
}

/** NEW: mock fetch tasks for a campaign/template */
async function fetchCampaignTasks(templateId: string, take = 12): Promise<Task[]> {
  await new Promise(r => setTimeout(r, 350));
  const statuses: TaskStatus[] = ["todo", "in_progress", "blocked", "review", "done"];
  return Array.from({ length: take }, (_, i) => ({
    id: `${templateId}-t${i + 1}`,
    title: [
      "Keyword research", "Fix broken links", "Write blog draft", "Design hero banner",
      "Audit indexation", "Implement schema", "Improve CLS", "Optimize images",
      "Review internal links", "Brief writer", "QA page template", "Submit sitemap",
    ][i % 12],
    status: randomFrom(statuses),
    assignee: Math.random() > 0.35 ? randomFrom(USERS) : undefined,
    due: Math.random() > 0.5 ? daysAgo(-Math.floor(Math.random() * 20)) : undefined,
  }));
}

/* ───────────────────────── Storage helpers ───────────────────────── */
const LSK = {
  filters: "wr:tpl:filters.v1",
  sort: "wr:tpl:sort.v1",
  pageSize: "wr:tpl:pageSize.v1",
};
function loadFilters(): FiltersModel {
  const s = sessionStorage.getItem(LSK.filters);
  if (s) try { return JSON.parse(s); } catch { }
  return { q: "", campaignTypes: [], assignedTo: "all", createdBy: "all" };
}
function saveFilters(f: FiltersModel) { sessionStorage.setItem(LSK.filters, JSON.stringify(f)); }

/* ───────────────────────── Utilities ───────────────────────── */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}
function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.round(ms / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  return `${d}d ago`;
}
function classNames(...s: Array<string | false | undefined>) { return s.filter(Boolean).join(" "); }
function markMatch(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent underline decoration-2">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/* ───────────────────────── Role Gate (demo) ───────────────────────── */
const USER_ROLE: "admin" | "editor" | "viewer" = "editor";

/* ───────────────────────── Main Component (DROP-IN) ───────────────────────── */
export default function TemplatesPanel_FiltersAndTable({
  setApplyOpen,
  data,
  onApply,
}: {
  setApplyOpen: (v: boolean) => void;
  data?: TemplateRow[];
  onApply?: (id: string) => void;
}) {
  
  const [filters, setFilters] = React.useState<FiltersModel>(() => loadFilters());
  const [qDraft, setQDraft] = React.useState(filters.q);
  const [sortKey, setSortKey] = React.useState<SortKey>(() => {
    const s = sessionStorage.getItem(LSK.sort);
    if (s === "title" || s === "taskCount" || s === "updatedAt") return s;
    return "updatedAt";
  });
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<number>(() => Number(sessionStorage.getItem(LSK.pageSize) || 10));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<TemplateRow[]>([]);
  
  const [total, setTotal] = React.useState(0);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  // NEW: expansion state and cache per row
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [tasksById, setTasksById] = React.useState<Record<string, Task[]>>({});
  const [tasksLoading, setTasksLoading] = React.useState<Record<string, boolean>>({});
  const [tasksError, setTasksError] = React.useState<Record<string, string | null>>({});
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewRow, setPreviewRow] = React.useState<TemplateRow | null>(null);
const [startInEditMode, setStartInEditMode] = React.useState(false);


React.useEffect(() => {
  if (!previewRow) return;
  const latest = rows.find(r => r.id === previewRow.id);
  if (latest) setPreviewRow(latest);
}, [rows, previewRow?.id]);


  const dynamicCT: any = React.useMemo(() => {
    const base = CT.slice();
    if (data && Array.isArray(data)) {
      const s = new Set<string>(base);
      (data as any[]).forEach(d => { if (d.campaignType) s.add(String(d.campaignType)); });
      return Array.from(s);
    }
    return base;
  }, [data]);


  // search debounce
  React.useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, q: qDraft })), 300);
    return () => clearTimeout(t);
  }, [qDraft]);

  // persist filters
  React.useEffect(() => {
    saveFilters(filters);
    setPage(1);
  }, [filters.campaignTypes.length, filters.assignedTo, filters.createdBy, filters.q]);

  // Add inside the component — maps your activities to the compact Task shape
  React.useEffect(() => {
    if (!data) return;
    const next: Record<string, Task[]> = {};
    (data as any[]).forEach((row: any) => {
      if (Array.isArray(row.activities) && row.activities.length) {
        next[row.id] = row.activities.map((a: any) => ({
          id: String(a.id),
          title: a.title,
          description: a.description,
          status: a.is_published ? "done" : "todo",           // map publish -> done
          assignee: undefined,                                 // none in payload
          due: a.updated_at || a.created_at,                   // best available
        }));
      }
    });
    if (Object.keys(next).length) {
      setTasksById(m => ({ ...next, ...m }));                 // hydrate cache
    }
  }, [data]);


  // Client-side filter/sort/paging for external data
  const applyLocal = React.useCallback(() => {
    if (!data) return { rows: [], total: 0 };
    let filtered = data.slice();
    if (filters.q) {
      const q = filters.q.toLowerCase();
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q));
    }
    if (filters.campaignTypes.length > 0) {
      const set = new Set(filters.campaignTypes);
      filtered = filtered.filter(d => set.has(d.campaignType));
    }
    if (filters.assignedTo !== "all") {
      filtered = filters.assignedTo === "unassigned"
        ? filtered.filter(d => d.assignedTo.kind === "unassigned")
        : filtered.filter(d => d.assignedTo.kind !== "unassigned");
    }
    if (filters.createdBy !== "all") {
      filtered = filtered.filter(d => d.createdBy.id === filters.createdBy);
    }
    const cmp = (a: any, b: any) => (a === b ? 0 : a > b ? 1 : -1);
    filtered.sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "title": av = a.title.toLowerCase(); bv = b.title.toLowerCase(); break;
        case "taskCount": av = a.taskCount; bv = b.taskCount; break;
        default: av = new Date(a.updatedAt).getTime(); bv = new Date(b.updatedAt).getTime();
      }
      const res = cmp(av, bv);
      return sortDir === "asc" ? res : -res;
    });
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);
    return { rows, total };
  }, [data, filters, sortKey, sortDir, page, pageSize]);

  // fetch
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (data) {
        const res = applyLocal();
        setRows(res.rows); setTotal(res.total);
      } else {
        const res = await fetchTemplates(filters, sortKey, sortDir, page, pageSize);
        setRows(res.rows); setTotal(res.total);
      }
    } catch {
      setError("Couldn’t load templates.");
    } finally { setLoading(false); }
  }, [data, applyLocal, filters, sortKey, sortDir, page, pageSize]);

  React.useEffect(() => { load(); }, [load]);

  // persist ancillary
  React.useEffect(() => { sessionStorage.setItem(LSK.pageSize, String(pageSize)); }, [pageSize]);
  React.useEffect(() => { sessionStorage.setItem(LSK.sort, sortKey); }, [sortKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  // selection helpers
  const pageIds = rows.map(r => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected[id]);
  const selectedIds = Object.keys(selected).filter(k => selected[k]);
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setSelected(prev => {
      const next = { ...prev } as Record<string, boolean>;
      pageIds.forEach(id => { next[id] = checked; });
      return next;
    });
  };

  // actions (stubs)
const doPreview = (row: TemplateRow) => {
  setStartInEditMode(false);
  setPreviewRow(row);
  setPreviewOpen(true);

  const hasActs = Array.isArray(row.activities) && row.activities.length > 0;
  const hasTasks = Array.isArray(tasksById[row.id]) && tasksById[row.id].length > 0;

  if (!hasActs && !hasTasks && !tasksLoading[row.id]) {
    (async () => {
      setTasksLoading(s => ({ ...s, [row.id]: true }));
      setTasksError(s => ({ ...s, [row.id]: null }));
      try {
        const tasks = await fetchCampaignTasks(row.id, Math.min(24, row.taskCount));
        setTasksById(m => ({ ...m, [row.id]: tasks }));
      } catch {
        setTasksError(s => ({ ...s, [row.id]: "Couldn’t load tasks for preview." }));
      } finally {
        setTasksLoading(s => ({ ...s, [row.id]: false }));
      }
    })();
  }
};

const doEdit = (id: string) => {
  const row = rows.find(x => x.id === id);
  if (!row) return;
  setStartInEditMode(true);
  setPreviewRow(row);
  setPreviewOpen(true);
};


  const doApply = (id: string) => {
    const row = rows.find(x => x.id === id);
    if (!row || row.taskCount === 0) return;
    onApply ? onApply(id) : (setApplyOpen(true), console.log("apply", id));
  };
  const doDownload = (ids: string[]) => {
    const header = "template,title,campaignType,taskCount,createdBy,assignedTo,lastModified\n";
    const lines = (ids.length ? ALL.filter(x => ids.includes(x.id)) : rows).map(r =>
      [
        r.id,
        `"${r.title.replace(/"/g, '""')}"`,
        r.campaignType,
        r.taskCount,
        `"${r.createdBy.name}"`,
        r.assignedTo.kind === "unassigned" ? "Unassigned" : `${r.assignedTo.count} ${r.assignedTo.kind}`,
        formatDate(r.updatedAt),
      ].join(",")
    );
    const blob = new Blob([header + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = ids.length ? "templates-selected.csv" : "templates-page.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doDuplicate = (ids: string[]) => console.log("duplicate", ids);
  const doDelete = (ids: string[]) => console.log("delete", ids);

  const clearAll = () => {
    setFilters({ q: "", campaignTypes: [], assignedTo: "all", createdBy: "all" });
    setQDraft("");
  };

  /** NEW: toggle expansion + lazy load tasks */
  // Update toggleExpand to prefer preloaded tasks
  const toggleExpand = async (row: TemplateRow) => {
    setExpanded(e => ({ ...e, [row.id]: !e[row.id] }));
    const nowOpen = !expanded[row.id];

    // If tasks already exist from activities, skip fetching
    const hasLocal = Array.isArray(tasksById[row.id]) && tasksById[row.id].length > 0;
    const hasActivities = Array.isArray((row as any).activities) && (row as any).activities.length > 0;

    if (nowOpen && !hasLocal && !hasActivities && !tasksLoading[row.id]) {
      setTasksLoading(s => ({ ...s, [row.id]: true }));
      setTasksError(s => ({ ...s, [row.id]: null }));
      try {
        const tasks = await fetchCampaignTasks(row.id, Math.min(12, row.taskCount));
        setTasksById(m => ({ ...m, [row.id]: tasks }));
      } catch {
        setTasksError(s => ({ ...s, [row.id]: "Couldn’t load tasks." }));
      } finally {
        setTasksLoading(s => ({ ...s, [row.id]: false }));
      }
    }
  };


  return (
    <section style={WR_FONT_STYLE} className="mx-auto w-full space-y-3">
      {/* ─ Top (Filters Bar) ─ */}
      <Card className="sticky top-0 z-0 bg-white" style={{ borderColor: TK.border, borderRadius: TK.cardRadius, boxShadow: TK.shadow }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px]" style={{ color: TK.title }}>Filters</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search templates"
                placeholder="Search by name…"
                className="pl-7 w-[280px] md:w-[360px] h-9"
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setQDraft(""); }}
              />
              {qDraft && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setQDraft("")} aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Campaign Type (multi) */}
            <CampaignTypeMulti
              value={filters.campaignTypes}
              onChange={(v) => setFilters(f => ({ ...f, campaignTypes: v }))}
              options={dynamicCT}
            />


            {/* Clear All */}
            <Button
              variant="ghost"
              className="h-9"
              onClick={clearAll}
              disabled={!filters.q && filters.campaignTypes.length === 0 && filters.assignedTo === "all" && filters.createdBy === "all"}
            >
              <Filter className="h-4 w-4 mr-2" /> Clear All
            </Button>
          </div>

          {/* Active chips row */}
          <ActiveChipsRow filters={filters} onRemove={(key, val) => {
            if (key === "q") { setQDraft(""); setFilters(f => ({ ...f, q: "" })); }
            if (key === "campaignTypes") setFilters(f => ({ ...f, campaignTypes: f.campaignTypes.filter(ct => ct !== val) }));
            if (key === "assignedTo") setFilters(f => ({ ...f, assignedTo: "all" }));
            if (key === "createdBy") setFilters(f => ({ ...f, createdBy: "all" }));
          }} />
        </CardContent>
      </Card>

      {/* ─ Templates Table ─ */}
      <Card style={{ borderColor: TK.border, borderRadius: TK.cardRadius, boxShadow: TK.shadow }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px]" style={{ color: TK.title }}>Templates</CardTitle>

          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Bulk toolbar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-[#FAFBFF]" style={{ borderColor: TK.border }}>
              <div className="text-sm"><strong>{selectedIds.length}</strong> selected</div>
              <div className="h-5 w-px bg-[#E5E7EB]" />
              <Button size="sm" variant="outline" onClick={() => doDuplicate(selectedIds)}><Copy className="h-4 w-4 mr-2" /> Duplicate</Button>
              <Button size="sm" variant="outline" onClick={() => doDownload(selectedIds)}><Download className="h-4 w-4 mr-2" /> Download</Button>
              <Button size="sm" variant="outline" disabled={USER_ROLE === "viewer"} onClick={() => doDelete(selectedIds)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
              <div className="ml-auto">
                <Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear</Button>
              </div>
            </div>
          )}

          <div className="overflow-auto">
            <Table className="text-[14px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[46px] text-center"></TableHead>
                  <TableHead className="w-[50px] text-center">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all on page" />
                  </TableHead>
                  <SortableTH label="Template Name" activeKey={sortKey} thisKey="title" dir={sortDir}
                    onSort={(k, nextDir) => { setSortKey(k as SortKey); setSortDir(nextDir); }} />
                  <SortableTH label="Task Count" className="text-right w-[110px]" align="right"
                    activeKey={sortKey} thisKey="taskCount" dir={sortDir}
                    onSort={(k, nextDir) => { setSortKey(k as SortKey); setSortDir(nextDir); }} />
                  <TableHead className="min-w-[180px]">Created By</TableHead>
                  <SortableTH label="Last Modified" thisKey="updatedAt" activeKey={sortKey} dir={sortDir}
                    onSort={(k, nextDir) => { setSortKey(k as SortKey); setSortDir(nextDir); }} />
                  <TableHead className="w-[64px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Loading */}
                {loading && (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[60%]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[130px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                )}

                {/* Error */}
                {!loading && error && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="p-4 border rounded-md" style={{ borderColor: TK.borderStrong, background: TK.subtle }}>
                        <div className="text-sm" style={{ color: TK.text }}>{error} <Button variant="link" className="px-1" onClick={load}>Retry</Button></div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Empty */}
                {!loading && !error && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="py-10 text-center space-y-2">
                        <div className="text-[15px]" style={{ color: TK.text }}>No templates match your filters.</div>
                        <div>
                          <Button variant="outline" onClick={clearAll}><Filter className="h-4 w-4 mr-2" /> Clear Filters</Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Data rows + expandable panel */}
                {!loading && !error && rows.map(r => {
                  const isOpen = !!expanded[r.id];
                  
                  return (
                    <React.Fragment key={r.id}>
                      <TableRow className={classNames("hover:bg-[#F8FAFC]", isOpen && "bg-[#F9FBFF]")}>
                        <TableCell className="text-center">
                          <button
                            onClick={() => toggleExpand(r)}
                            className="inline-flex items-center justify-center h-7 w-7 rounded border"
                            style={{ borderColor: TK.borderStrong }}
                            aria-label={isOpen ? "Collapse" : "Expand"}
                            title={isOpen ? "Collapse" : "Expand"}
                          >
                            <ChevronRightIcon className={classNames("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => setSelected(s => ({ ...s, [r.id]: Boolean(v) }))} aria-label={`Select ${r.title}`} />
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: TK.borderStrong }}>
                              {r.campaignType}
                            </span>
                            <button
                              className="font-medium underline-offset-2 hover:underline text-left"
                              onClick={() => doPreview(r)}
                              aria-label={`View template ${r.title}`}
                            >
                              {markMatch(r.title, filters.q)}
                            </button>

                          </div>
                        </TableCell>

                        <TableCell className="text-center">{r.taskCount}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{r.categoryIsGlobal?"Wranker" :"Me"}</span>
                          </div>
                        </TableCell>


                        <TableCell>
                          <span title={formatDate(r.updatedAt)}>{formatDate(r.updatedAt)}</span>
                          <span className="text-xs ml-2" style={{ color: TK.muted }}>· {timeAgo(r.updatedAt)}</span>
                        </TableCell>

                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" aria-label="Row actions"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => doPreview(r)} className="cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" /> View / Preview
                              </DropdownMenuItem>

                              {USER_ROLE !== "viewer" && (
                                <DropdownMenuItem onClick={() => doEdit(r.id)} className="cursor-pointer"><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => doApply(r.id)}
                                className="cursor-pointer"
                                disabled={r.taskCount === 0}
                                title={r.taskCount === 0 ? "This template has 0 tasks" : "Apply this template"}
                              >
                                <Plus className="h-4 w-4 mr-2" /> Apply
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => doDownload([r.id])} className="cursor-pointer"><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>

                              {(USER_ROLE === "admin") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => doDelete([r.id])} className="cursor-pointer text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* EXPANDABLE ROW */}
                      {isOpen && (
                        <TableRow className="bg-[#FBFDFF]">
                          <TableCell colSpan={8} className="pt-0">
                            <div
                              className="mx-2 my-2 border rounded-lg max-h-72 overflow-y-auto"
                              style={{ borderColor: TK.borderStrong, background: "#FFFFFF" }}
                            >
                              <div className="px-3 py-2 border-b flex items-center gap-3"
                                style={{ borderColor: TK.border }}>
                                <div className="text-sm" style={{ color: TK.muted }}>
                                  Campaign snapshot — latest tasks & metadata
                                </div>
                                <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: TK.muted }}>
                                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Updated {timeAgo(r.updatedAt)}</span>
                                </div>
                              </div>

                              <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* LEFT: task list (scrollable, compact) */}
                                <div className="md:col-span-2">
                                  <div className="text-[13px] font-medium mb-2" style={{ color: TK.title }}>
                                    Tasks in this campaign
                                  </div>

                                  <div className="max-h-56 overflow-y-auto rounded-md border"
                                    style={{ borderColor: TK.borderStrong }}>
                                    {/* loading / error / list */}
                                    {tasksLoading[r.id] && (
                                      <div className="p-3 space-y-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                          <div key={i} className="flex items-start gap-2">
                                            <Skeleton className="h-4 w-4 mt-1" />
                                            <div className="flex-1 space-y-2">
                                              <Skeleton className="h-4 w-[70%]" />
                                              <div className="flex gap-2">
                                                <Skeleton className="h-3 w-24" />
                                                <Skeleton className="h-3 w-16" />
                                                <Skeleton className="h-3 w-28" />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {tasksError[r.id] && (
                                      <div className="p-3 text-sm text-red-600">{tasksError[r.id]}</div>
                                    )}

                                    {!tasksLoading[r.id] && !tasksError[r.id] && (tasksById[r.id]?.length ? (
                                      <ul className="divide-y" style={{ borderColor: TK.border }}>
                                        {tasksById[r.id]!.map((t: any) => (
                                          <li key={t.id} className="p-2.5 hover:bg-[#F9FBFF]">
                                            <div className="flex items-start gap-2">
                                              <StatusPill status={t.status} />
                                              <div className="flex-1">
                                                <div className="text-[13px] font-medium leading-5">Title: {t.title}</div>
                                                <div className="text-[12px] leading-5">Description: {t.description}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: TK.muted }}>
                                                  {t.assignee && (
                                                    <span className="inline-flex items-center gap-1">
                                                      <User2 className="h-3.5 w-3.5" /> {t.assignee.name}
                                                    </span>
                                                  )}
                                                  {t.due && (
                                                    <span className="inline-flex items-center gap-1">
                                                      <Clock className="h-3.5 w-3.5" />
                                                      Due {formatDate(t.due)}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="ml-2 flex items-center gap-1">
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-[12px]">Open</Button>
                                              </div>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div className="p-3 text-sm" style={{ color: TK.muted }}>No tasks found.</div>
                                    ))}
                                  </div>

                                  <div className="mt-2 flex items-center justify-between">
                                    <div className="text-xs" style={{ color: TK.muted }}>
                                      Showing up to {r.taskCount} tasks
                                    </div>
                                  </div>
                                </div>

                                {/* RIGHT: meta cards (small) */}
                                {/* RIGHT: meta cards (small) */}
                                <div className="space-y-3">
                                  <div className="p-3 border rounded-md" style={{ borderColor: TK.borderStrong }}>
                                    <div className="text-[12px] uppercase tracking-wide mb-1" style={{ color: TK.muted }}>
                                      Campaign Info
                                    </div>
                                    <div className="space-y-1 text-sm">
                                      <div><strong>Type:</strong> {r.campaignType}</div>
                                      <div>
                                        <strong>Assigned:</strong>{" "}
                                        {r.assignedTo.kind === "unassigned" ? "Unassigned" : `${r.assignedTo.count} ${r.assignedTo.kind}`}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-3 border rounded-md" style={{ borderColor: TK.borderStrong }}>
                                    <div className="text-[12px] uppercase tracking-wide mb-1" style={{ color: TK.muted }}>
                                      Quick Stats
                                    </div>
                                    {(() => {
                                      const list = tasksById[r.id] ?? [];
                                      const published = list.filter(t => t.status === "done").length;
                                      const drafts = list.length - published;
                                      return (
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                          <MiniStat label="Drafts" value={drafts} />
                                          <MiniStat label="Published" value={published} />
                                          <MiniStat label="Total" value={r.taskCount} />
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div className="p-3 border rounded-md" style={{ borderColor: TK.borderStrong }}>
                                    <div className="text-[12px] uppercase tracking-wide mb-1" style={{ color: TK.muted }}>
                                      Last Activity
                                    </div>
                                    <div className="text-sm">Updated {timeAgo(r.updatedAt)}</div>
                                  </div>
                                </div>

                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer pagination */}
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.border }}>
            <div className="text-sm" style={{ color: TK.muted }}>
              Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(total, (page - 1) * pageSize + rows.length)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-8 px-2" onClick={() => setPage(1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4 mr-1" /> First</Button>
              <Button variant="outline" className="h-8 px-2" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <div className="text-sm w-16 text-center">{page} / {totalPages}</div>
              <Button variant="outline" className="h-8 px-2" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              <Button variant="outline" className="h-8 px-2" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last <ChevronRight className="h-4 w-4 ml-1" /></Button>

              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 px-3 w-[120px] ml-2">
                  <SelectValue placeholder="Rows / page" />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
<ActivityDrawer
  open={previewOpen}
  onClose={() => { setPreviewOpen(false); setPreviewRow(null); }}
  row={previewRow as any}
  activities={previewRow ? toActivityPreviewList(previewRow, tasksById) : []}
  loading={!!(previewRow && tasksLoading[previewRow.id])}
  startInEditMode={startInEditMode}
  campaignId={(previewRow as any)?.campaignId}
/>

    </section>
  );
}

/* ───────────────────────── Subcomponents ───────────────────────── */

function SortableTH({
  label, className, align, activeKey, thisKey, dir, onSort
}: {
  label: string;
  className?: string;
  align?: "left" | "right" | "center";
  activeKey: string;
  thisKey: string;
  dir: "asc" | "desc";
  onSort: (k: string, nextDir: "asc" | "desc") => void;
}) {
  const isActive = activeKey === thisKey;
  const nextDir: "asc" | "desc" = isActive ? (dir === "asc" ? "desc" : "asc") : "asc";
  return (
    <TableHead className={classNames(
      className || "",
      align === "center" ? "text-center" : align === "right" ? "text-right" : ""
    )}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onSort(thisKey, nextDir)}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        {isActive ? (
          <ChevronDown className={classNames("h-4 w-4 transition-transform", dir === "asc" ? "rotate-180" : "")} />
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </TableHead>
  );
}

function CampaignTypeMulti({
  value, onChange, options
}: {
  value: CampaignType[];
  onChange: (v: CampaignType[]) => void;
  options?: string[];

}) {
  const opts = options ?? CT;

  const [open, setOpen] = React.useState(false);
  const toggle = (ct: CampaignType) => {
    const has = value.includes(ct);
    onChange(has ? value.filter(v => v !== ct) : [...value, ct]);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9">
          Campaign Type
          {value.length > 0 && <span className="ml-2 rounded-full px-1.5 text-xs" style={{ background: TK.subtle, border: `1px solid ${TK.borderStrong}` }}>{value.length}</span>}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="text-sm mb-2 font-medium">Campaign Type</div>
        <div className="space-y-2">
          {opts.map(ct => (
            <label key={ct} className="flex items-center gap-2">
              <Checkbox checked={value.includes(ct as CampaignType)} onCheckedChange={() => toggle(ct as CampaignType)} />
              <span>{ct}</span>
            </label>
          ))}
        </div>
        {value.length > 0 && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>Clear</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ActiveChipsRow({
  filters, onRemove
}: {
  filters: FiltersModel;
  onRemove: (key: keyof FiltersModel | "campaignTypes", val?: any) => void;
}) {
  const hasActive = Boolean(filters.q || filters.campaignTypes.length || filters.assignedTo !== "all" || filters.createdBy !== "all");
  if (!hasActive) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {filters.q && (
        <Badge variant="secondary" className="flex items-center gap-2 bg-[#F5F7FA] border" style={{ borderColor: TK.borderStrong }}>
          Search: “{filters.q}”
          <button aria-label="Remove search filter" onClick={() => onRemove("q")}><X className="h-3.5 w-3.5" /></button>
        </Badge>
      )}
      {filters.campaignTypes.map(ct => (
        <Badge key={ct} variant="secondary" className="flex items-center gap-1 bg-[#F5F7FA] border" style={{ borderColor: TK.borderStrong }}>
          Campaign: {ct}
          <button aria-label={`Remove ${ct}`} onClick={() => onRemove("campaignTypes", ct)}><X className="h-3.5 w-3.5" /></button>
        </Badge>
      ))}
      {filters.assignedTo !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1 bg-[#F5F7FA] border" style={{ borderColor: TK.borderStrong }}>
          Assigned: {filters.assignedTo === "unassigned" ? "Unassigned" : "Projects/Groups"}
          <button aria-label="Remove assigned filter" onClick={() => onRemove("assignedTo")}><X className="h-3.5 w-3.5" /></button>
        </Badge>
      )}
      {filters.createdBy !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1 bg-[#F5F7FA] border" style={{ borderColor: TK.borderStrong }}>
          Created By: {USERS.find(u => u.id === filters.createdBy)?.name ?? ""}
          <button aria-label="Remove created-by filter" onClick={() => onRemove("createdBy")}><X className="h-3.5 w-3.5" /></button>
        </Badge>
      )}
    </div>
  );
}
/* NEW: tiny components used in expanded row */
function StatusPill({ status }: { status: TaskStatus }) {
  const cfg: Record<TaskStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    todo: { bg: "#F3F4F6", text: "#374151", label: "To-do", icon: <Clock className="h-3.5 w-3.5" /> },
    in_progress: { bg: "#E0F2FE", text: "#075985", label: "In Progress", icon: <SpinnerDots /> },
    blocked: { bg: "#FEF3C7", text: "#92400E", label: "Blocked", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    review: { bg: "#EDE9FE", text: "#5B21B6", label: "Review", icon: <Eye className="h-3.5 w-3.5" /> },
    done: { bg: "#DCFCE7", text: "#065F46", label: "Done", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  };
  const s = cfg[status];
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]" style={{ background: s.bg, color: s.text }}>
      {s.icon}{s.label}
    </span>
  );
}
function SpinnerDots() {
  return (
    <span className="inline-flex items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full animate-pulse mr-0.5" style={{ background: TK.valueBlue }} />
      <span className="h-1.5 w-1.5 rounded-full animate-pulse delay-150 mr-0.5" style={{ background: TK.valueBlue }} />
      <span className="h-1.5 w-1.5 rounded-full animate-pulse delay-300" style={{ background: TK.valueBlue }} />
    </span>
  );
}
function MiniStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="p-2 rounded border" style={{ borderColor: TK.borderStrong }}>
      <div className="text-xs" style={{ color: TK.muted }}>{label}</div>
      <div className="text-sm font-semibold">{value ?? 0}</div>
    </div>
  );
}
