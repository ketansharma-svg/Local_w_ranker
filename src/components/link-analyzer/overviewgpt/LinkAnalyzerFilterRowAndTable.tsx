import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  RefreshCw,
  Search,
  Download,
  SlidersHorizontal,
  Eye,
  ClipboardList,
  X as XIcon,
} from "lucide-react";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

/*********** TOKENS (preserve your visuals) ***********/
const TOKENS = {
  border: "#EFF0F6",
  borderDark: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  brand: "#008CCD",
  action: "#0077FF",
  chipBg: "#F5F7FA",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  appBg: "#FFFFFF",
};

/*********** Types & constants ***********/
const DEPTH_PRESETS = ["0-1", "2-3", "4+"] as const;
type DepthPreset = typeof DEPTH_PRESETS[number];

const PILS_SEGMENTS = ["90-100", "80-89", "60-79", "<60"] as const;
type PilsSegment = typeof PILS_SEGMENTS[number];

const AQS_SEGMENTS = ["90-100", "80-89", "60-79", "<60"] as const;
type AqsSegment = typeof AQS_SEGMENTS[number];

type PageType = "All" | "Blog" | "Product" | "Category" | "Custom";
type AnchorKind = "Exact" | "Branded" | "Partial" | "Generic" | "Image/Empty";
type Status = "healthy" | "dangling" | "orphan";

type Row = {
  pageId: string;
  url: string;
  title?: string;
  pageType: Exclude<PageType, "All">;
  depth: number;
  inlinks: number;
  outlinks: number;
  pils: number;
  aqs: number;
  status: Status;
  anchorTypes: AnchorKind[];
  orphan: boolean;
  trendSparkline: number[];
};

type Filters = {
  search: string;
  pageType: PageType;
  depthPresets: DepthPreset[];
  depthCustom?: { min: number; max: number } | null;
  pilsRanges: PilsSegment[];
  aqsRanges: AqsSegment[];
  anchorTypes: AnchorKind[];
  includeOrphans: boolean;
};

const DEFAULT_FILTERS: Filters = {
  search: "",
  pageType: "All",
  depthPresets: [],
  depthCustom: null,
  pilsRanges: [],
  aqsRanges: [],
  anchorTypes: [],
  includeOrphans: true,
};

/*********** Utils ***********/
const cls = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");
function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function matchesRange(val: number, seg: "90-100" | "80-89" | "60-79" | "<60") {
  return seg === "90-100" ? val >= 90 : seg === "80-89" ? val >= 80 && val <= 89 : seg === "60-79" ? val >= 60 && val <= 79 : val < 60;
}

function applyFilters(rows: Row[], f: Filters): Row[] {
  let out = rows.slice();
  if (f.search.trim()) {
    const q = f.search.toLowerCase();
    out = out.filter((r) => r.url.toLowerCase().includes(q) || (r.title ?? "").toLowerCase().includes(q));
  }
  if (f.pageType !== "All") out = out.filter((r) => r.pageType === f.pageType);
  if (f.depthPresets.length) {
    out = out.filter((r) =>
      f.depthPresets.some((p) => (p === "0-1" ? r.depth <= 1 : p === "2-3" ? r.depth >= 2 && r.depth <= 3 : r.depth >= 4))
    );
  }
  if (f.depthCustom) out = out.filter((r) => r.depth >= f.depthCustom!.min && r.depth <= f.depthCustom!.max);
  if (f.pilsRanges.length) out = out.filter((r) => f.pilsRanges.some((rng) => matchesRange(r.pils, rng)));
  if (f.aqsRanges.length) out = out.filter((r) => f.aqsRanges.some((rng) => matchesRange(r.aqs, rng)));
  if (f.anchorTypes.length) out = out.filter((r) => f.anchorTypes.some((t) => r.anchorTypes.includes(t)));
  if (!f.includeOrphans) out = out.filter((r) => !r.orphan);
  return out;
}

function toCSV(rows: Row[]) {
  const header = ["url", "inlinks", "outlinks", "pils", "aqs", "status", "depth", "pageType"].join(",");
  const lines = rows
    .map((r) => [r.url, r.inlinks, r.outlinks, r.pils, r.aqs, r.status, r.depth, r.pageType].map((v) => JSON.stringify(v)).join(","))
    .join("\n");
  return header + "\n" + lines;
}
function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ChipButton({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={cls(
        "h-9 px-3 inline-flex items-center gap-2 rounded-md border text-sm bg-white",
        active ? "ring-1" : ""
      )}
      style={{ borderColor: active ? TOKENS.action : TOKENS.border }}
    >
      <span>{label}</span>
      <ChevronDown className="h-4 w-4" />
    </div>
  );
}

function Chip({ label, onRemove, ariaLabel }: { label: string; onRemove: () => void; ariaLabel?: string }) {
  return (
    <button
      onClick={onRemove}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRemove();
        }
      }}
      aria-label={ariaLabel ?? label}
      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs border"
      style={{ background: TOKENS.chipBg, borderColor: TOKENS.border }}
      title="Remove filter"
    >
      <span className="truncate">{label}</span>
      <XIcon className="h-3.5 w-3.5" />
    </button>
  );
}

/*********** Skeletons ***********/
function RowSkeleton() {
  return (
    <TableRow>
      {[...Array(11)].map((_, i) => (
        <TableCell key={i}>
          <div className="h-3 w-full animate-pulse rounded" style={{ background: "#EAEFF5" }} />
        </TableCell>
      ))}
    </TableRow>
  );
}

/*********** Mock fetch helper ***********/
export type Fetcher = (input: RequestInfo, init?: RequestInit) => Promise<Response>;
async function safeFetch(fetcher: Fetcher | undefined, input: RequestInfo, init?: RequestInit) {
  try {
    const f = fetcher ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!f) throw new Error("no-fetch");
    const res = await f(input, init);
    if (!res.ok) throw new Error("http-" + res.status);
    return await res.json();
  } catch {
    return null;
  }
}

/*********** Main ***********/
export default function LinkAnalyzerFilterRowAndTable({
  projectId = "demo-123",
  data,
  loading = false,
  lastSynced,
  onRefresh,
}: {
  projectId?: string;
  data: Row[];                 // ← required: real rows from parent
  loading?: boolean;           // ← optional: parent-controlled loading
  lastSynced?: Date | null;    // ← optional: parent supplies timestamp
  onRefresh?: () => void;      // ← optional: parent refresh handler
}) {
  /* filters (persisted) */
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const raw = localStorage.getItem("wr:la:filters");
      return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const debouncedSearch = useDebounced(searchDraft, 250);
  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilters((f) => ({ ...f, search: debouncedSearch }));
  }, [debouncedSearch]);
  useEffect(() => {
    localStorage.setItem("wr:la:filters", JSON.stringify(filters));
  }, [filters]);

  /* sort */
  const [sortBy, setSortBy] = useState<keyof Row>("pils");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: keyof Row) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  /* selection & expand */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();
  const derivedProjectId = selectedProject?.id ?? projectId ?? null;

  const openTaskForRow = useCallback(
    (row: Row) => {
      const details = [
        `URL: ${row.url}`,
        row.title ? `Title: ${row.title}` : null,
        `Page type: ${row.pageType}`,
        `Status: ${row.status}${row.orphan ? " (orphan)" : ""}`,
        `Depth: ${row.depth}`,
        `PILS: ${row.pils}%`,
        `AQS: ${row.aqs}%`,
        `Inlinks: ${row.inlinks}`,
        `Outlinks: ${row.outlinks}`,
        row.anchorTypes.length ? `Anchor types: ${row.anchorTypes.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      openTaskDrawer({
        title: `Improve linking - ${row.title ?? row.url}`,
        description: details,
        projectId: derivedProjectId,
        type: "createNew",
      });
    },
    [derivedProjectId, openTaskDrawer],
  );


  // depth-select integration (from Internal Link Distribution chart)
  useEffect(() => {
    const handler = (e: any) => {
      const depth: number = e?.detail?.depth;
      if (depth == null) return;
      // map depth → preset chip(s)
      const preset: DepthPreset = depth <= 1 ? "0-1" : depth <= 3 ? "2-3" : "4+";
      setFilters((f) => ({ ...f, depthPresets: Array.from(new Set([...(f.depthPresets || []), preset])) }));
      // scroll table into view for demo
      document.getElementById("wr-top-pages-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    document.addEventListener("wranker:depth-select", handler as any);
    return () => document.removeEventListener("wranker:depth-select", handler as any);
  }, []);

  // build query from Filters (for real API when available)
  const queryFromFilters = (f: Filters) => {
    const p = new URLSearchParams();
    if (f.search) p.set("q", f.search);
    if (f.pageType !== "All") p.set("pageType", f.pageType);
    if (f.depthCustom) p.set("depthRange", `${f.depthCustom.min}-${f.depthCustom.max}`);
    if (f.depthPresets.length) p.set("depthPresets", f.depthPresets.join("|"));
    if (f.pilsRanges.length) p.set("pils", f.pilsRanges.join("|"));
    if (f.aqsRanges.length) p.set("aqs", f.aqsRanges.join("|"));
    if (f.anchorTypes.length) p.set("anchorTypes", f.anchorTypes.join(","));
    if (!f.includeOrphans) p.set("includeOrphans", "false");
    p.set("sort", `${String(sortBy)}_${sortDir}`);
    return p.toString();
  };


  const filtered = useMemo(() => applyFilters(data , filters), [data , filters]);
  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a: any, b: any) =>
      a[sortBy] === b[sortBy] ? 0 : sortDir === "asc" ? (a[sortBy] > b[sortBy] ? 1 : -1) : a[sortBy] < b[sortBy] ? 1 : -1
    );
    return arr;
  }, [filtered, sortBy, sortDir]);
  const rowsToRender = sorted

  const openTaskForSelection = useCallback(() => {
    const selectedRows = rowsToRender.filter((r) => selected[r.pageId]);
    if (!selectedRows.length) return;

    const preview = selectedRows.slice(0, 10).map((r) => `- ${r.title ?? r.url} (PILS ${r.pils}%, depth ${r.depth})`);
    const descriptionParts = [
      `Pages selected: ${selectedRows.length}`,
      ...preview,
      selectedRows.length > preview.length ? "- ..." : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    openTaskDrawer({
      title: `Improve linking for ${selectedRows.length} page${selectedRows.length > 1 ? "s" : ""}`,
      description: descriptionParts,
      projectId: derivedProjectId,
      type: "createNew",
    });
  }, [derivedProjectId, openTaskDrawer, rowsToRender, selected]);

  /* columns & sticky */
  type ColumnKey = keyof Row | "select" | "expander" | "actions";
  const ALL_COLUMNS: { key: ColumnKey; label: string; width?: number; sortable?: boolean; align?: "left" | "right" | "center" }[] = [
    { key: "select", label: "", width: 36, align: "center" },
    { key: "expander", label: "", width: 36, align: "center" },
    { key: "url", label: "Page URL", width: 360, sortable: true },
    { key: "inlinks", label: "Inlinks", width: 110, sortable: true },
    { key: "outlinks", label: "Outlinks", width: 110, sortable: true },
    { key: "pils", label: "PILS", width: 160, sortable: true },
    { key: "aqs", label: "AQS", width: 160, sortable: true },
    { key: "status", label: "Status", width: 140, sortable: true },
    { key: "depth", label: "Depth", width: 100, sortable: true },
    { key: "pageType", label: "Page Type", width: 160, sortable: true },
    { key: "actions", label: "Actions", width: 120 },
  ];

 const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
  select: true,
  expander: true,
  url: true,
  inlinks: true,
  outlinks: true,
  pils: true,
  aqs: true,
  status: true,
  depth: true,
  pageType: true,
  actions: true,
} as Record<ColumnKey, boolean>);

  
  const visibleColumns = useMemo(() => ALL_COLUMNS.filter((c) => visibleCols[c.key] !== false), [ALL_COLUMNS, visibleCols]);

  const stickyHeadStyle = (key: ColumnKey) =>
    key === "select"
      ? { position: "sticky" as const, left: 0, zIndex: 40, background: TOKENS.appBg, boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : key === "expander"
      ? { position: "sticky" as const, left: 36, zIndex: 40, background: TOKENS.appBg, boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : key === "url"
      ? { position: "sticky" as const, left: 72, zIndex: 30, background: TOKENS.appBg, boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : {};
  const stickyCellStyle = stickyHeadStyle;

  /* selection */
  const visibleIds = rowsToRender.map((r) => r.pageId);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
  const someVisibleSelected = visibleIds.some((id) => selected[id]) && !allVisibleSelected;
  const anySelected = visibleIds.some((id) => selected[id]);

  const exportCSVAction = (onlySelected: boolean) => {
    const dataset = onlySelected ? rowsToRender.filter((r) => selected[r.pageId]) : rowsToRender;
    if (!dataset.length) return;
    downloadFile(onlySelected ? "pages-export-selected.csv" : "pages-export.csv", toCSV(dataset));
  };
  return (
    <section className="space-y-3">
      <Card className="border w-full" style={{ borderColor: TOKENS.border }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Top Linked Pages</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Column Manager */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[320px] overflow-auto pr-2">
                  {ALL_COLUMNS.map((c) => (
                    <label key={String(c.key)} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={c.key === "select" || c.key === "expander" || c.key === "url"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                      />
                      <span>{c.label || String(c.key)}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCols({ select: true, expander: true, url: true, inlinks: true, outlinks: true, pils: true, aqs: true, status: true, depth: true, pageType: true, actions: true }as Record<ColumnKey, boolean>)}>Reset</Button>
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" disabled={!rowsToRender.length} onClick={() => exportCSVAction(anySelected)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
<Button
  variant="outline"
  size="sm"
  onClick={onRefresh}
  disabled={!onRefresh}
  aria-live="polite"
>
  <RefreshCw className={cls("h-4 w-4", loading && "animate-spin")} /> Refresh
</Button>

          </div>
        </CardHeader>

        {/* ===== FILTER ROW (below header, above table headers) ===== */}
        <div
          className="px-4 py-2"
          id="wr-top-pages-filters"
          aria-label="Table filters"
          role="toolbar"
          style={{ background: TOKENS.chipBg, boxShadow: `inset 0 -1px 0 ${TOKENS.border}, inset 0 1px 0 ${TOKENS.border}` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* 1) Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search by page URL or anchor text"
                placeholder="Search page URL or anchor text…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="w-[280px] pl-7 h-9"
              />
              {searchDraft && (
                <button
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                  onClick={() => setSearchDraft("")}
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* 2) Page Type */}
            <Select value={filters.pageType} onValueChange={(v) => setFilters((f) => ({ ...f, pageType: v as PageType }))}>
              <SelectTrigger className="h-9 px-3 w-[160px]">
                <SelectValue placeholder="Page Type" />
              </SelectTrigger>
              <SelectContent>
                {["All", "Blog", "Product", "Category", "Custom"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 3) Depth presets + custom */}
            <Popover>
              <PopoverTrigger asChild>
                <button>
                  <ChipButton label={`Link Depth${filters.depthPresets.length || filters.depthCustom ? " • active" : ""}`} active={!!(filters.depthPresets.length || filters.depthCustom)} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[320px]">
                <div className="text-sm mb-2">Presets</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {DEPTH_PRESETS.map((p) => {
                    const active = filters.depthPresets.includes(p);
                    return (
                      <button
                        key={p}
                        className={cls("px-2.5 py-1.5 rounded-md text-xs border", active && "bg-white")}
                        style={{ borderColor: active ? TOKENS.action : TOKENS.border }}
                        onClick={() => setFilters((f) => ({ ...f, depthPresets: active ? f.depthPresets.filter((x) => x !== p) : [...f.depthPresets, p] }))}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <div className="text-sm mb-1">Custom range</div>
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={10} value={filters.depthCustom?.min ?? ""} onChange={(e) => setFilters((f) => ({ ...f, depthCustom: { min: Number(e.target.value || 0), max: f.depthCustom?.max ?? 10 } }))} className="w-20 h-8" placeholder="min" />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input type="number" min={0} max={10} value={filters.depthCustom?.max ?? ""} onChange={(e) => setFilters((f) => ({ ...f, depthCustom: { min: f.depthCustom?.min ?? 0, max: Number(e.target.value || 0) } }))} className="w-20 h-8" placeholder="max" />
                  <Button variant="outline" size="sm" onClick={() => setFilters((f) => ({ ...f, depthCustom: null }))}>Clear</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* 4) PILS */}
            <Popover>
              <PopoverTrigger asChild>
                <button>
                  <ChipButton label={`PILS${filters.pilsRanges.length ? " • active" : ""}`} active={!!filters.pilsRanges.length} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[280px]">
                <div className="flex flex-wrap gap-2">
                  {PILS_SEGMENTS.map((rng) => {
                    const active = filters.pilsRanges.includes(rng);
                    const dot = rng === "<60" ? TOKENS.danger : rng === "60-79" ? TOKENS.warn : TOKENS.good;
                    return (
                      <button
                        key={rng}
                        onClick={() => setFilters((f) => ({ ...f, pilsRanges: active ? f.pilsRanges.filter((x) => x !== rng) : [...f.pilsRanges, rng] }))}
                        className={cls("px-2.5 py-1.5 rounded-md text-xs border inline-flex items-center gap-1.5", active && "bg-white")}
                        style={{ borderColor: active ? TOKENS.action : TOKENS.border }}
                      >
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: dot }} /> {rng}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* 5) AQS */}
            <Popover>
              <PopoverTrigger asChild>
                <button>
                  <ChipButton label={`AQS${filters.aqsRanges.length ? " • active" : ""}`} active={!!filters.aqsRanges.length} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[280px]">
                <div className="flex flex-wrap gap-2">
                  {AQS_SEGMENTS.map((rng) => {
                    const active = filters.aqsRanges.includes(rng);
                    return (
                      <button
                        key={rng}
                        onClick={() => setFilters((f) => ({ ...f, aqsRanges: active ? f.aqsRanges.filter((x) => x !== rng) : [...f.aqsRanges, rng] }))}
                        className={cls("px-2.5 py-1.5 rounded-md text-xs border", active && "bg-white")}
                        style={{ borderColor: active ? TOKENS.action : TOKENS.border }}
                      >
                        {rng}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* 6) Anchor Type multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">Anchor Type {filters.anchorTypes.length ? `· ${filters.anchorTypes.length}` : ""}</Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56">
                <div className="space-y-1">
                  {(["Exact", "Branded", "Partial", "Generic", "Image/Empty"] as AnchorKind[]).map((opt) => {
                    const checked = filters.anchorTypes.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F7FAFC] cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={(v) => setFilters((f) => ({ ...f, anchorTypes: v ? [...f.anchorTypes, opt] : f.anchorTypes.filter((x) => x !== opt) }))} />
                        <span className="text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* 7) Include Orphans */}
            <label className="inline-flex items-center gap-2 text-sm ml-1 cursor-pointer select-none">
              <Checkbox checked={filters.includeOrphans} onCheckedChange={(v) => setFilters((f) => ({ ...f, includeOrphans: Boolean(v) }))} />
              <span>Include Orphans</span>
            </label>

            {/* Active chips (right-aligned) */}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {(filters.search || filters.pageType !== "All" || filters.depthPresets.length || filters.depthCustom || filters.pilsRanges.length || filters.aqsRanges.length || filters.anchorTypes.length || !filters.includeOrphans) && (
                <Button variant="outline" size="sm" onClick={() => { setFilters(DEFAULT_FILTERS); setSearchDraft(""); }}>Clear all</Button>
              )}
              {filters.search && <Chip label={`Search: ${filters.search}`} onRemove={() => setFilters((f) => ({ ...f, search: "" }))} />}
              {filters.pageType !== "All" && <Chip label={`Page Type: ${filters.pageType}`} onRemove={() => setFilters((f) => ({ ...f, pageType: "All" }))} />}
              {filters.depthPresets.map((d) => (<Chip key={d} label={`Depth: ${d}`} onRemove={() => setFilters((f) => ({ ...f, depthPresets: f.depthPresets.filter((x) => x !== d) }))} />))}
              {filters.depthCustom && (<Chip label={`Depth: ${filters.depthCustom.min}-${filters.depthCustom.max}`} onRemove={() => setFilters((f) => ({ ...f, depthCustom: null }))} />)}
              {filters.pilsRanges.map((p) => (<Chip key={p} label={`PILS: ${p}`} onRemove={() => setFilters((f) => ({ ...f, pilsRanges: f.pilsRanges.filter((x) => x !== p) }))} />))}
              {filters.aqsRanges.map((p) => (<Chip key={p} label={`AQS: ${p}`} onRemove={() => setFilters((f) => ({ ...f, aqsRanges: f.aqsRanges.filter((x) => x !== p) }))} />))}
              {filters.anchorTypes.map((a) => (<Chip key={a} label={`Anchor: ${a}`} onRemove={() => setFilters((f) => ({ ...f, anchorTypes: f.anchorTypes.filter((x) => x !== a) }))} />))}
              {!filters.includeOrphans && <Chip label={`Orphans: Excluded`} onRemove={() => setFilters((f) => ({ ...f, includeOrphans: true }))} />}
            </div>
          </div>
          {lastSynced && (
            <div className="px-4 py-1 text-xs" style={{ color: TOKENS.muted }}>last synced: {lastSynced.toLocaleString()}</div>
          )}
        </div>

        {/* Bulk actions toolbar */}
        {(() => {
          const visibleIds = rowsToRender.map((r) => r.pageId);
          const anySelected = visibleIds.some((id) => selected[id]);
          if (!anySelected) return null;
          return (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t" style={{ borderColor: TOKENS.border, background: TOKENS.chipBg }}>
              <div className="text-sm" style={{ color: TOKENS.text }}>
                <strong>{visibleIds.filter((id) => selected[id]).length}</strong> selected
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={openTaskForSelection}>Create Tasks</Button>
                <Button disabled size="sm" variant="outline" onClick={() => console.log("Recalculate:", rowsToRender.filter((r) => selected[r.pageId]).map((r) => r.pageId))}>Recalculate Scores</Button>
                <Button size="sm" variant="outline" onClick={() => exportCSVAction(true)}>Export Selected</Button>
                <Button disabled size="sm" variant="destructive" onClick={() => console.log("Remove from tracking:", rowsToRender.filter((r) => selected[r.pageId]).map((r) => r.pageId))}>Remove from Tracking</Button>
              </div>
            </div>
          );
        })()}

        {/* TABLE */}
        <CardContent className="p-0">
          <div className="max-h:[520px] max-h-[520px] overflow-auto border-t" style={{ borderColor: TOKENS.border }}>
            <div className="min-w-[1200px]" id="wr-top-pages-table">
              <Table className="text-sm">
                <TableHeader className="sticky top-0 z-40 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                  <TableRow>
                    {visibleColumns.map((c) => {
                      const visibleIds = rowsToRender.map((r) => r.pageId);
                      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
                      const someVisibleSelected = visibleIds.some((id) => selected[id]) && !allVisibleSelected;
                      return (
                        <TableHead
                          key={String(c.key)}
                          style={{ minWidth: c.width, ...(stickyHeadStyle(c.key) as any) }}
                          className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                        >
                          {c.key === "select" ? (
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                                onCheckedChange={(v) => {
                                  const on = Boolean(v);
                                  const patch: Record<string, boolean> = {};
                                  visibleIds.forEach((id) => (patch[id] = on));
                                  setSelected((s) => ({ ...s, ...patch }));
                                }}
                                aria-label="Select all visible rows"
                              />
                            </div>
                          ) : c.key === "expander" ? (
                            <span />
                          ) : c.sortable ? (
                            <button className="inline-flex items-center gap-1" onClick={() => toggleSort(c.key as keyof Row)}>
                              <span>{c.label}</span>
                              {sortBy === c.key ? (
                                sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          ) : (
                            <span>{c.label}</span>
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && (
                    <>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <RowSkeleton key={i} />
                      ))}
                    </>
                  )}

                  {!loading && rowsToRender.map((r) => (
                    <React.Fragment key={r.pageId}>
                      <TableRow className="hover:bg-[#F5F7FA]">
                        {visibleCols.select !== false && (
                          <TableCell style={stickyCellStyle("select") as any}>
                            <Checkbox checked={!!selected[r.pageId]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.pageId]: Boolean(v) }))} aria-label={`Select row for ${r.title ?? r.url}`} />
                          </TableCell>
                        )}
                        {visibleCols.expander !== false && (
                          <TableCell style={stickyCellStyle("expander") as any}>
                            <button onClick={() => setExpanded((e) => ({ ...e, [r.pageId]: !e[r.pageId] }))} aria-label={expanded[r.pageId] ? "Collapse" : "Expand"} className="rounded-md border p-1">
                              {expanded[r.pageId] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </TableCell>
                        )}
                        {visibleCols.url !== false && (
                          <TableCell style={stickyCellStyle("url") as any}>
                            <a href={r.url} target="_blank" className="underline" style={{ color: TOKENS.action }}>{r.title ?? r.url}</a>
                            <div className="text-xs text-muted-foreground truncate" title={r.url}>{r.url}</div>
                          </TableCell>
                        )}
                        {visibleCols.inlinks !== false && (<TableCell>{r.inlinks}</TableCell>)}
                        {visibleCols.outlinks !== false && (<TableCell>{r.outlinks}</TableCell>)}
                        {visibleCols.pils !== false && (
                          <TableCell>
                            <div className="relative h-2 rounded bg-gray-200" style={{ width: 100 }}>
                              <div className="h-2 rounded" style={{ width: `${r.pils}%`, maxWidth: 100, backgroundColor: r.pils >= 80 ? TOKENS.good : r.pils >= 60 ? TOKENS.warn : TOKENS.danger }} />
                            </div>
                            <span className="text-[13px] leading-none ml-2">{r.pils}%</span>
                          </TableCell>
                        )}
                        {visibleCols.aqs !== false && (
                          <TableCell>
                            <div className="relative h-2 rounded bg-gray-200" style={{ width: 100 }}>
                              <div className="h-2 rounded" style={{ width: `${r.aqs}%`, maxWidth: 100, backgroundColor: TOKENS.action }} />
                            </div>
                            <span className="text-[13px] leading-none ml-2">{r.aqs}%</span>
                          </TableCell>
                        )}
                        {visibleCols.status !== false && (
                          <TableCell>
                            <span className="inline-flex items-center gap-2 text-[13px]">
                              <span className="inline-block rounded-full" style={{ width: 10, height: 10, backgroundColor: r.status === "healthy" ? TOKENS.good : r.status === "dangling" ? TOKENS.warn : TOKENS.danger }} />
                              {r.status}
                            </span>
                          </TableCell>
                        )}
                        {visibleCols.depth !== false && (<TableCell>{r.depth}</TableCell>)}
                        {visibleCols.pageType !== false && (<TableCell>{r.pageType}</TableCell>)}
                        {visibleCols.actions !== false && (
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5">
                              <a href={r.url} target="_blank"  title="View" onClick={() => console.log("View:", r.pageId)}> 
                                <Eye className="h-4 w-4" />
                              </a>
                              <Button size="icon" variant="ghost" title="Create Task" onClick={() => openTaskForRow(r)}>
                                <ClipboardList className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expanded[r.pageId] && (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length}>
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-md border" style={{ borderColor: TOKENS.border, background: TOKENS.chipBg }}>
                              <div>
                                <div className="text-xs text-muted-foreground">URL</div>
                                <a href={r.url} className="text-sm font-medium underline" style={{ color: TOKENS.action }}>{r.url}</a>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Link Depth</div>
                                <div className="text-sm font-medium">{r.depth}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Anchor Types</div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {r.anchorTypes.map((a, i) => (
                                    <span key={i} className="px-2 py-1 rounded-md border text-xs" style={{ borderColor: TOKENS.border }}>{a}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Quick Actions</div>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>View</Button>
                                  <Button size="sm" variant="outline" onClick={() => openTaskForRow(r)}>Create Task</Button>
                                  <Button size="sm" variant="outline" onClick={() => downloadFile("page.csv", toCSV([r]))}>Export Page</Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}

                  {!loading && !rowsToRender.length && (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">No results. Adjust filters.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
