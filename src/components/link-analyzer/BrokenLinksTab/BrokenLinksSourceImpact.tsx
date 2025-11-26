"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronUp, ChevronsUpDown, Filter, Settings2, RefreshCw, Search,
  Info, SlidersHorizontal, ExternalLink, ClipboardList, Trash2, Flag, Ban,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BrokenLinksSourceImpactItem, useBrokenLinksData } from "../broken-links-tab";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

/* ------------------------------ TOKENS ------------------------------ */
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  textStrong: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "#0077FF",
  valueBlueHover: "#005FCC",
  success: "var(--wr-good, #34A853)",
  warning: "var(--wr-warning, #F9BB04)",
  critical: "var(--wr-critical, #E94134)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
  radius: "var(--wr-radius, 6px)",
};

/* ------------------------------ Types ------------------------------- */
type Severity = "Low" | "Moderate" | "High";

type Row = {
  id: string;
  pagePath: string;  // short path
  pageUrl: string;   // full url
  brokenCount: number;
  internalCount: number;
  externalCount: number;
  statusBreakdown: { "404": number; "410": number; timeout: number };
  severity: Severity;
  lastCrawled: string; // ISO
  traffic: number;     // monthly visits approx
  prioritized?: boolean;
};

type ColumnKey =
  | "select"
  | "url"
  | "broken"
  | "internal"
  | "external"
  | "s404"
  | "s410"
  | "timeout"
  | "severity"
  | "lastCrawled"
  | "traffic"
  | "actions";

type ColumnDef = {
  key: ColumnKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};

/* ------------------------------ Helpers ----------------------------- */
const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};
const sevRank = (s: Severity) => (s === "Low" ? 0 : s === "Moderate" ? 1 : 2);

const normalizeSeverity = (severity?: string | null): Severity => {
  switch ((severity ?? "").toLowerCase()) {
    case "high":
      return "High";
    case "moderate":
      return "Moderate";
    default:
      return "Low";
  }
};

const extractPagePath = (url?: string): string => {
  if (!url) return "—";
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch (error) {
    return url.replace(/^https?:\/\//i, "");
  }
};

const mapSourceImpactItemToRow = (item: BrokenLinksSourceImpactItem, index: number): Row => {
  const pageUrl = item.source_page ?? "";
  return {
    id: pageUrl || `source-${index}`,
    pagePath: extractPagePath(pageUrl),
    pageUrl,
    brokenCount: Number(item.broken ?? 0),
    internalCount: Number(item.internal ?? 0),
    externalCount: Number(item.external ?? 0),
    statusBreakdown: {
      "404": Number(item.c404 ?? 0),
      "410": Number(item.c410 ?? 0),
      timeout: Number(item.timeout ?? 0),
    },
    severity: normalizeSeverity(item.severity),
    lastCrawled: item.last_crawled ?? "",
    traffic: Number(item.traffic_est ?? 0),
    prioritized: false,
  };
};

const MiniNum = ({ n }: { n: number }) => (
  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-[2px] text-[12px] font-medium text-gray-700">
    {n}
  </span>
);

const SevBadge = ({ s }: { s: Severity }) => {
  const bg =
    s === "High" ? `${TOKENS.critical}22` :
    s === "Moderate" ? `${TOKENS.warning}22` : "#E5F6EB";
  const color =
    s === "High" ? TOKENS.critical :
    s === "Moderate" ? TOKENS.warning : TOKENS.success;
  return (
    <span className="inline-flex items-center rounded-full px-2 py-[2px] text-[12px] font-semibold" style={{ backgroundColor: bg, color }}>
      {s}
    </span>
  );
};

/* ------------------------------ Component --------------------------- */
export default function BrokenLinksSourceImpact() {
  /* Data */
  const { data, loading, error, refetch } = useBrokenLinksData();
  const sourceImpactItems = data?.source_page_impact?.items ?? [];
  const mappedFromApi = useMemo(
    () => sourceImpactItems.map((item, index) => mapSourceImpactItemToRow(item, index)),
    [sourceImpactItems],
  );
  const [rows, setRows] = useState<Row[]>([]);

  /* View toggles */
  const [view, setView] = useState<"table" | "grid">("table");
  const [infinite, setInfinite] = useState(true);

  /* Filters */
  const [query, setQuery] = useState("");
  type CountRange = "1-5" | "6-10" | "11+";
  const [ranges, setRanges] = useState<Set<CountRange>>(new Set());
  const [sevFilters, setSevFilters] = useState<Set<Severity>>(new Set());

  /* Sorting */
  type SortKey = Exclude<ColumnKey, "select" | "actions">;
  const [sortBy, setSortBy] = useState<SortKey>("broken");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  /* Pagination / Infinite window */
  const [visibleCount, setVisibleCount] = useState(40);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRows((prevRows) => {
      if (mappedFromApi.length === 0) return [];
      const prioritizedById = prevRows.reduce<Record<string, boolean>>((acc, row) => {
        if (row.prioritized) acc[row.id] = true;
        return acc;
      }, {});
      return mappedFromApi.map((row) => ({
        ...row,
        prioritized: prioritizedById[row.id] ?? row.prioritized ?? false,
      }));
    });
  }, [mappedFromApi]);

  useEffect(() => {
    setSelected((prevSelected) => {
      if (!Object.keys(prevSelected).length) return prevSelected;
      const validIds = new Set(mappedFromApi.map((row) => row.id));
      if (validIds.size === 0) return {};
      const next: Record<string, boolean> = {};
      Object.entries(prevSelected).forEach(([id, value]) => {
        if (validIds.has(id) && value) next[id] = value;
      });
      return next;
    });
  }, [mappedFromApi]);

  /* Column manager */
  const columns: ColumnDef[] = [
    { key: "select", label: "", width: 44, align: "center" },
    { key: "url", label: "Source Page", width: 320, sortable: true },
    { key: "broken", label: "Broken", width: 110, sortable: true },
    { key: "internal", label: "Internal", width: 110, sortable: true },
    { key: "external", label: "External", width: 110, sortable: true },
    { key: "s404", label: "404", width: 90, sortable: true },
    { key: "s410", label: "410", width: 90, sortable: true },
    { key: "timeout", label: "Timeout", width: 110, sortable: true },
    { key: "severity", label: "Severity", width: 120, sortable: true },
    { key: "lastCrawled", label: "Last Crawled", width: 200, sortable: true },
    { key: "traffic", label: "Traffic (est.)", width: 140, sortable: true },
    { key: "actions", label: "Actions", width: 140, align: "left" },
  ];

  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
    select: true,
    url: true,
    broken: true,
    internal: true,
    external: true,
    s404: true,
    s410: true,
    timeout: true,
    severity: true,
    lastCrawled: true,
    traffic: true,
    actions: true,
  });

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleCols[c.key] !== false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCols]
  );

  const stickyStyle = (key: ColumnKey) =>
    key === "select"
      ? ({ position: "sticky" as const, left: 0, zIndex: 40, background: "#fff" })
      : key === "url"
      ? ({ position: "sticky" as const, left: 44, zIndex: 30, background: "#fff" })
      : ({});

  /* Derived ΓÇö filter */
  const countHit = (n: number) => {
    if (ranges.size === 0) return true;
    const ok =
      (ranges.has("1-5") && n >= 1 && n <= 5) ||
      (ranges.has("6-10") && n >= 6 && n <= 10) ||
      (ranges.has("11+") && n >= 11);
    return ok;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !`${r.pagePath} ${r.pageUrl}`.toLowerCase().includes(q)) return false;
      if (!countHit(r.brokenCount)) return false;
      if (sevFilters.size && !sevFilters.has(r.severity)) return false;
      return true;
    });
  }, [rows, query, ranges, sevFilters]);

  /* Sort */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      let av: any, bv: any;
      switch (sortBy) {
        case "url": av = a.pageUrl; bv = b.pageUrl; break;
        case "broken": av = a.brokenCount; bv = b.brokenCount; break;
        case "internal": av = a.internalCount; bv = b.internalCount; break;
        case "external": av = a.externalCount; bv = b.externalCount; break;
        case "s404": av = a.statusBreakdown["404"]; bv = b.statusBreakdown["404"]; break;
        case "s410": av = a.statusBreakdown["410"]; bv = b.statusBreakdown["410"]; break;
        case "timeout": av = a.statusBreakdown.timeout; bv = b.statusBreakdown.timeout; break;
        case "severity": av = sevRank(a.severity); bv = sevRank(b.severity); break;
        case "lastCrawled": av = new Date(a.lastCrawled).getTime(); bv = new Date(b.lastCrawled).getTime(); break;
        case "traffic": av = a.traffic; bv = b.traffic; break;
        default: av = 0; bv = 0;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Window */
  const windowed = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("bl-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) {
        setVisibleCount((v) => Math.min(sorted.length, v + 40));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  /* Bulk helpers */
  const visibleIds = windowed.map((r) => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
  const someVisibleSelected = visibleIds.some((id) => selected[id]) && !allVisibleSelected;
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const anySelected = selectedIds.length > 0;

  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  /* Actions (stubs to wire with your drawers/workflows) */
  const openInDrawer = (row: Row) => console.info("Open Page Drawer ->", row.pageUrl);
  const createTask = useCallback(
    (row: Row) => {
      const { statusBreakdown } = row;
      const details = [
        `Source page: ${row.pageUrl}`,
        `Broken links: ${row.brokenCount}`,
        `Status 404: ${statusBreakdown["404"]}`,
        `Status 410: ${statusBreakdown["410"]}`,
        `Timeouts: ${statusBreakdown.timeout}`,
      ].join("\n");

      openTaskDrawer({
        title: `Fix broken links: ${row.pagePath || row.pageUrl}`,
        description: details,
        projectId: selectedProject?.id ?? null,
        type: "createNew",
      });
    },
    [openTaskDrawer, selectedProject?.id],
  );
  const createTasksForSelection = useCallback(() => {
    const selectedRows = sorted.filter((r) => selected[r.id]);
    if (!selectedRows.length) return;

    const preview = selectedRows.slice(0, 5).map((r) => `- ${r.pagePath || r.pageUrl} (${r.brokenCount} broken)`);
    const summary = [
      `Pages selected: ${selectedRows.length}`,
      ...preview,
      selectedRows.length > preview.length ? "- ..." : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    openTaskDrawer({
      title: `Fix broken links (${selectedRows.length} pages)`,
      description: summary,
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
  }, [openTaskDrawer, selected, selectedProject?.id, sorted]);
  const removeTracking = (row: Row) => console.info("Remove from tracking ->", row.pageUrl);
  const prioritize = (row: Row) =>
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, prioritized: true } : r)));

  /* CSV export */
  const exportCSV = (onlySelected = false) => {
    const cols: Array<keyof Row | "s404" | "s410" | "timeout" | "broken" | "internal" | "external"> = [
      "pageUrl", "pagePath", "traffic",
      "broken", "internal", "external",
      "s404", "s410", "timeout",
      "severity", "lastCrawled",
    ];
    const dataset = onlySelected ? sorted.filter((r) => selected[r.id]) : sorted;
    const header = ["pageUrl","pagePath","traffic","broken","internal","external","s404","s410","timeout","severity","lastCrawled"].join(",");
    const lines = dataset.map((r) => [
      r.pageUrl, r.pagePath, r.traffic,
      r.brokenCount, r.internalCount, r.externalCount,
      r.statusBreakdown["404"], r.statusBreakdown["410"], r.statusBreakdown.timeout,
      r.severity, r.lastCrawled
    ].map((v) => JSON.stringify(v ?? "")).join(","));
    const csv = header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "broken-links-selected.csv" : "broken-links.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Controls ΓÇô chips */
  const toggleRange = (r: CountRange) =>
    setRanges((s) => { const n = new Set(s); n.has(r) ? n.delete(r) : n.add(r); return n; });
  const toggleSev = (s: Severity) =>
    setSevFilters((set) => { const n = new Set(set); n.has(s) ? n.delete(s) : n.add(s); return n; });

  /* ------------------------------ UI ------------------------------- */
  return (
    <section className="space-y-3">
      <Card className="border w-full" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Source Page Impact — Broken Links</CardTitle>

          <div className="flex flex-wrap gap-2 items-center">
            {/* View switch */}
            <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: TOKENS.border }}>
              <button
                className={clsx("px-3 py-1.5 text-sm", view === "table" ? "bg-gray-100" : "bg-white")}
                onClick={() => setView("table")}
                aria-pressed={view === "table"}
              >
                Table
              </button>
              <button
                className={clsx("px-3 py-1.5 text-sm", view === "grid" ? "bg-gray-100" : "bg-white")}
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
              >
                Grid
              </button>
            </div>

            {/* Infinite toggle */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Infinite</span>
              {/* <Switch
                checked={infinite}
                onCheckedChange={(v) => { setInfinite(Boolean(v)); if (Boolean(v)) setVisibleCount(40); }}
              /> */}
            </div>

            {/* Columns manager */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white text-muted-foreground hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <ScrollArea className="max-h-[320px] pr-2">
                  <div className="space-y-2">
                    {columns.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          disabled={c.key === "select" || c.key === "url"}
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) =>
                            setVisibleCols((m) => ({ ...m, [c.key]: Boolean(v) }))
                          }
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
                        select: true, url: true, broken: true, internal: true, external: true,
                        s404: true, s410: true, timeout: true, severity: true,
                        lastCrawled: true, traffic: true, actions: true,
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

            {/* Export + Refresh */}
            <Button variant="outline" size="sm" onClick={() => exportCSV(anySelected)}>
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => refetch({ silent: true })}
              disabled={loading}
            >
              <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Filters row */}
        <CardContent className="border-t pt-4" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" /> Filters
              <TooltipProvider>
                <Tooltip>
                  {/* <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger> */}
                  <TooltipContent side="bottom">
                    Use filters to focus by broken link volume and severity.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button variant="outline" size="sm" onClick={() => { setQuery(""); setRanges(new Set()); setSevFilters(new Set()); }}>
              Clear all
            </Button>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search by URL or pathΓÇª"
                className="w-[260px] pl-7"
              />
            </div>

            {/* Broken counts */}
            <div className="flex items-center gap-2 text-sm ml-1">
              <span className="text-muted-foreground">Broken:</span>
              {(["1-5", "6-10", "11+"] as CountRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { toggleRange(r); setPage(1); }}
                  className={clsx(
                    "px-2 py-1 rounded-full border text-[12px]",
                    ranges.has(r)
                      ? "text-white border-transparent"
                      : "text-gray-700 bg-white hover:bg-gray-50"
                  )}
                  style={{ backgroundColor: ranges.has(r) ? TOKENS.brand : undefined }}
                  aria-pressed={ranges.has(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Severity */}
            <div className="flex items-center gap-2 text-sm ml-1">
              <span className="text-muted-foreground">Severity:</span>
              {(["Low", "Moderate", "High"] as Severity[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { toggleSev(s); setPage(1); }}
                  className={clsx(
                    "px-2 py-1 rounded-full border text-[12px]",
                    sevFilters.has(s)
                      ? "text-white border-transparent"
                      : "text-gray-700 bg-white hover:bg-gray-50"
                  )}
                  style={{ backgroundColor: sevFilters.has(s) ? TOKENS.brand : undefined }}
                  aria-pressed={sevFilters.has(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardContent>

        {/* Bulk bar */}
        {anySelected && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t"
            style={{ borderColor: TOKENS.borderLight, background: "#EAF6FD" }}
          >
            <div className="text-sm" style={{ color: TOKENS.textStrong }}>
              <strong>{selectedIds.length}</strong> selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={createTasksForSelection}>
                Create Tasks
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportCSV(true)}>
                Export Selected
              </Button>
<Button size="sm" variant="destructive" disabled className="disabled:opacity-50 disabled:cursor-not-allowed">
  Remove from Tracking
</Button>

            </div>
          </div>
        )}

        {/* ======== TABLE VIEW ======== */}
        {view === "table" && (
          <CardContent className="p-0">
            <div className="max-h-[540px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
              <Table className="text-sm">
                <TableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                  <TableRow>
                    {visibleColumns.map((c) => (
                      <TableHead
                        key={c.key}
                        style={{ minWidth: c.width, ...stickyStyle(c.key) }}
                        className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                      >
                        {c.key === "select" ? (
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                              aria-label="Select all visible"
                              onCheckedChange={(v) => {
                                const on = Boolean(v);
                                const patch: Record<string, boolean> = {};
                                visibleIds.forEach((id) => (patch[id] = on));
                                setSelected((s) => ({ ...s, ...patch }));
                              }}
                            />
                          </div>
                        ) : c.sortable ? (
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => {
                              const k = c.key as SortKey;
                              if (sortBy !== k) { setSortBy(k); setSortDir("asc"); }
                              else { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
                            }}
                          >
                            <span>{c.label}</span>
                            {sortBy === (c.key as SortKey) ? (
                              sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span>{c.label}</span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {windowed.map((r) => (
                    <TableRow key={r.id} className="hover:bg-[#F5F7FA]">
                      {/* Select */}
                      {visibleCols.select !== false && (
                        <TableCell style={stickyStyle("select") as any} className="text-center">
                          <Checkbox
                            checked={!!selected[r.id]}
                            onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))}
                            aria-label={`Select ${r.pagePath}`}
                          />
                        </TableCell>
                      )}

                      {/* URL */}
                      {visibleCols.url !== false && (
                        <TableCell style={stickyStyle("url") as any}>
                          <a
                            href={r.pageUrl}
                            className="underline"
                            style={{ color: TOKENS.valueBlue }}
                            onMouseOver={(e) => ((e.currentTarget.style.color = TOKENS.valueBlueHover))}
                            onMouseOut={(e) => ((e.currentTarget.style.color = TOKENS.valueBlue))}
                          >
                            {r.pagePath}
                          </a>
                          <div className="text-[12px] text-gray-500 truncate">{r.pageUrl}</div>
                          {r.prioritized && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-[2px] text-[11px] text-blue-700">
                              Prioritized
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* Numbers */}
                      {visibleCols.broken !== false && (<TableCell><MiniNum n={r.brokenCount} /></TableCell>)}
                      {visibleCols.internal !== false && (<TableCell>{r.internalCount}</TableCell>)}
                      {visibleCols.external !== false && (<TableCell>{r.externalCount}</TableCell>)}
                      {visibleCols.s404 !== false && (<TableCell>{r.statusBreakdown["404"]}</TableCell>)}
                      {visibleCols.s410 !== false && (<TableCell>{r.statusBreakdown["410"]}</TableCell>)}
                      {visibleCols.timeout !== false && (<TableCell>{r.statusBreakdown.timeout}</TableCell>)}
                      {visibleCols.severity !== false && (<TableCell><SevBadge s={r.severity} /></TableCell>)}
                      {visibleCols.lastCrawled !== false && (<TableCell>{formatDateTime(r.lastCrawled)}</TableCell>)}
                      {visibleCols.traffic !== false && (<TableCell>{r.traffic.toLocaleString()}</TableCell>)}

                      {/* Actions */}
                      {visibleCols.actions !== false && (
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Open in Page Drawer" onClick={() => openInDrawer(r)}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open in Page Drawer</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Create Task" onClick={() => createTask(r)}>
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Create Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
<Button size="icon" variant="ghost" aria-label="Mark Priority" onClick={() => prioritize(r)} disabled>
  <Flag className="h-4 w-4" />
</Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark Priority</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button disabled size="icon" variant="ghost" aria-label="Remove from tracking" onClick={() => removeTracking(r)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove from tracking</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
<Button size="icon" variant="ghost" aria-label="Exclude Page" onClick={() => removeTracking(r)} disabled>
  <Ban className="h-4 w-4" />
</Button>
                                </TooltipTrigger>
                                <TooltipContent>Exclude Page</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {infinite && <div id="bl-sentinel" className="h-8" />}
            </div>

            {/* Pagination footer when Infinite OFF */}
            {!infinite && (
              <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TOKENS.borderLight }}>
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <div className="text-sm w-16 text-center">{page}</div>
                  <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Page size" /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        )}

        {/* ======== GRID VIEW ======== */}
        {view === "grid" && (
          <CardContent className="border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {windowed.map((r) => (
                <div key={r.id} className="rounded-md border bg-white p-3 hover:shadow-sm transition-shadow" style={{ borderColor: TOKENS.border }}>
                  {/* Title + link */}
                  <div className="mb-1">
                    <a
                      href={r.pageUrl}
                      className="text-[15px] font-semibold underline"
                      style={{ color: TOKENS.valueBlue }}
                      onMouseOver={(e) => ((e.currentTarget.style.color = TOKENS.valueBlueHover))}
                      onMouseOut={(e) => ((e.currentTarget.style.color = TOKENS.valueBlue))}
                      title={r.pageUrl}
                    >
                      {r.pagePath}
                    </a>
                    <div className="text-[12px] text-gray-500 truncate">{r.pageUrl}</div>
                  </div>

                  {/* Metrics grid (mirrors table columns) */}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">Broken</div>
                      <div className="font-semibold">{r.brokenCount}</div>
                    </div>
                    <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">Severity</div>
                      <div><SevBadge s={r.severity} /></div>
                    </div>
                    <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">Internal</div>
                      <div className="font-semibold">{r.internalCount}</div>
                    </div>
                    <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">External</div>
                      <div className="font-semibold">{r.externalCount}</div>
                    </div>
                    <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">404</div>
                      <div className="font-semibold">{r.statusBreakdown["404"]}</div>
                    </div>
                    <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">410</div>
                      <div className="font-semibold">{r.statusBreakdown["410"]}</div>
                    </div>
                    <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">Timeout</div>
                      <div className="font-semibold">{r.statusBreakdown.timeout}</div>
                    </div>
                    <div className="rounded border p-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">Traffic (est.)</div>
                      <div className="font-semibold">{r.traffic.toLocaleString()}</div>
                    </div>
                    <div className="rounded border p-2 col-span-2" style={{ borderColor: TOKENS.borderLight }}>
                      <div className="text-[12px] text-gray-500">Last Crawled</div>
                      <div className="font-semibold">{formatDateTime(r.lastCrawled)}</div>
                    </div>
                  </div>

                  {/* Actions (icons at right-bottom corner) */}
                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Open in Page Drawer" onClick={() => openInDrawer(r)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in Page Drawer</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Create Task" onClick={() => createTask(r)}>
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Create Task</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button  size="icon" variant="ghost" aria-label="Mark Priority" onClick={() => prioritize(r)} disabled>
                            <Flag className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark Priority</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
<Button size="icon" variant="ghost" aria-label="Remove from tracking" onClick={() => removeTracking(r)} disabled>
  <Trash2 className="h-4 w-4" />
</Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove from tracking</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button disabled size="icon" variant="ghost" aria-label="Exclude Page" onClick={() => removeTracking(r)}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Exclude Page</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>

            {infinite && <div id="bl-sentinel" className="h-8" />}
          </CardContent>
        )}
      </Card>
    </section>
  );
}
