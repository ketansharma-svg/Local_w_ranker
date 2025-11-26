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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Download, Filter,
  Info, RefreshCw, Search, SlidersHorizontal, ExternalLink, Link as LinkIcon,
  ClipboardList, Trash2, AlertTriangle, GitFork, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";


/* ------------------------------------------------------------------ */
/* Tokens (prefer global vars, fall back to safe values)              */
/* ------------------------------------------------------------------ */
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "var(--wr-action, #4286F5)",
  success: "var(--wr-good, #34A853)",
  warning: "var(--wr-warning, #F9BB04)",
  critical: "var(--wr-critical, #E94134)",
  info: "var(--wr-info, #3B82F6)",
  chipBg: "var(--wr-chip, #F5F7FA)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
  radius: "var(--wr-radius, 6px)",
};


/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
type AnchorType = "exact" | "partial" | "branded" | "generic";
type TargetStatus = "healthy" | "redirect" | "broken" | "orphan";


type OutlinkRow = {
  id: string;
  targetUrl: string;
  targetTitle?: string;
  anchor: string;
  anchorType: AnchorType;
  targetPils: number;               // 0–100
  targetStatus: TargetStatus;
  redirectChainDepth?: number;      // when status === redirect
  lastVerified: string;             // ISO
  instances: number;
};


type ColumnKey =
  | "select" |
  //  "expander" |
    "targetPage" | "anchor"
  | "anchorType" | "targetPils" | "targetStatus" | "lastVerified" | "actions";


type ColumnDef = {
  key: ColumnKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
};


/* ------------------------------------------------------------------ */
/* Mock data helpers (replace with API)                               */
/* ------------------------------------------------------------------ */
function rndInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const ATYPES: AnchorType[] = ["exact", "partial", "branded", "generic"];
const STATUSES: TargetStatus[] = ["healthy", "redirect", "broken", "orphan"];


function makeRows(n = 56): OutlinkRow[] {
  return Array.from({ length: n }).map((_, i) => {
    const status = STATUSES[rndInt(0, STATUSES.length - 1)];
    const depth = status === "redirect" ? rndInt(1, 3) : 0;
    const url = [
      "/compare/wranker-vs-competitor",
      "/seo-tools",
      "/blog/anchor-text-best-practices",
      "/guides/internal-linking",
      "/pricing",
      "/docs/api",
      "/about",
    ][i % 7];


    return {
      id: `o-${i + 1}`,
      targetUrl: url + `-${i + 1}`,
      targetTitle: url.replace("/", "").replaceAll("-", " "),
      anchor: ["learn more", "read more", "compare plans", "SEO tools", "internal linking"][i % 5],
      anchorType: ATYPES[i % ATYPES.length],
      targetPils: rndInt(58, 96),
      targetStatus: status,
      redirectChainDepth: status === "redirect" ? depth : 0,
      lastVerified: new Date(Date.now() - rndInt(0, 12) * 24 * 3600_000).toISOString(),
      instances: rndInt(1, 4),
    };
  });
}


type InstanceRow = {
  position: "main" | "sidebar" | "footer" | "breadcrumb";
  snippetHtml: string;
  instanceAqs: number;
  lastVerified: string;
};


async function mockLoadInstances(targetId: string, count = 5): Promise<InstanceRow[]> {
  // simulate latency
  await new Promise((r) => setTimeout(r, 300));
  return Array.from({ length: count }).map((_, i) => ({
    position: (["main", "sidebar", "footer", "breadcrumb"] as const)[i % 4],
    snippetHtml: `… add internal link to <strong>${targetId}</strong> for better topical flow …`,
    instanceAqs: rndInt(45, 92),
    lastVerified: new Date(Date.now() - rndInt(0, 14) * 86400_000).toISOString(),
  }));
}


/* ------------------------------------------------------------------ */
/* Small UI atoms                                                      */
/* ------------------------------------------------------------------ */
const AnchorTypeBadge: React.FC<{ t: AnchorType; onClick?: () => void }> = ({ t, onClick }) => {
  const palette: Record<AnchorType, string> = {
    exact: "#0B63D6", partial: "#0EA5A6", branded: "#6366F1", generic: "#9CA3AF",
  };
  const label = t[0].toUpperCase() + t.slice(1);
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded-full text-[12px] font-medium border"
      style={{ background: `${palette[t]}14`, borderColor: `${palette[t]}55`, color: palette[t] }}
      aria-label={`Filter by type: ${label}`}
    >
      {label}
    </button>
  );
};


const StatusPill: React.FC<{ s: TargetStatus; depth?: number }> = ({ s, depth }) => {
  const map: Record<TargetStatus, { c: string; label: string }> = {
    healthy: { c: TOKENS.info, label: "Healthy" },
    redirect: { c: TOKENS.warning, label: "Redirect" },
    broken: { c: TOKENS.critical, label: "Broken" },
    orphan: { c: TOKENS.warning, label: "Orphan" },
  };
  return (
    <span className="inline-flex items-center gap-2 text-[12px] px-2 py-1 rounded-full border"
      style={{ color: map[s].c, borderColor: `${map[s].c}55`, background: `${map[s].c}14` }}>
      {map[s].label}
      {s === "redirect" && depth ? <span className="ml-1 rounded bg-white/70 px-1 text-[11px]">{depth}-hop</span> : null}
    </span>
  );
};


const MiniPilsBar: React.FC<{ value: number }> = ({ value }) => {
  const tone = value >= 80 ? TOKENS.success : value >= 60 ? TOKENS.warning : TOKENS.critical;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 rounded bg-gray-200 overflow-hidden" style={{ width: 120 }}>
        <div className="h-2 rounded" style={{ width: `${value}%`, maxWidth: 120, backgroundColor: tone }} />
      </div>
      <span className="text-[13px] tabular-nums">{value}%</span>
    </div>
  );
};


/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export default function OutlinkTargetsTable__Section({
  rowsFromApi,
}: { rowsFromApi?: OutlinkRow[] }) {
  /* Data */
  const [rows, setRows] = useState<OutlinkRow[]>(
    () => rowsFromApi && rowsFromApi.length ? rowsFromApi : makeRows(56)
  );

  useEffect(() => {
    if (rowsFromApi) setRows(rowsFromApi);
  }, [rowsFromApi]);

  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  const launchTask = useCallback(
    (payload: { title: string; description?: string }) => {
      openTaskDrawer({
        type: "createNew",
        title: payload.title,
        description: payload.description,
        projectId: selectedProject?.id ?? null,
      });
    },
    [openTaskDrawer, selectedProject?.id],
  );

  /* Filters */
  const [search, setSearch] = useState("");
  const [typeSel, setTypeSel] = useState<Set<AnchorType>>(new Set());
  const [statusSel, setStatusSel] = useState<Set<TargetStatus>>(new Set());
  const [pilsRange, setPilsRange] = useState<[number, number]>([0, 100]);
  const pilsActive = pilsRange[0] > 0 || pilsRange[1] < 100;


  /* View toggles */
  const [infinite, setInfinite] = useState(true);
  const [multiExpand, setMultiExpand] = useState(false);


  /* Sort */
  type SortKey = Extract<ColumnKey, "targetPage" | "anchor" | "anchorType" | "targetPils" | "targetStatus" | "lastVerified">;
  const [sortBy, setSortBy] = useState<SortKey>("targetPils");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (k: ColumnKey) => {
    const allowed: SortKey[] = ["targetPage", "anchor", "anchorType", "targetPils", "targetStatus", "lastVerified"];
    if (!allowed.includes(k as any)) return;
    if (sortBy !== k) { setSortBy(k as SortKey); setSortDir("asc"); }
    else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };


  /* Column defs */
  const columns: ColumnDef[] = [
    { key: "select", label: "", width: 36, align: "center" },
    // { key: "expander", label: "", width: 36, align: "center" },
    { key: "targetPage", label: "Target Page", width: 360, sortable: true },
    { key: "anchor", label: "Anchor Text", width: 240, sortable: true },
    { key: "anchorType", label: "Anchor Type", width: 140, sortable: true },
    { key: "targetPils", label: "Target PILS", width: 160, sortable: true },
    { key: "targetStatus", label: "Target Status", width: 160, sortable: true },
    { key: "lastVerified", label: "Last Verified", width: 180, sortable: true },
    { key: "actions", label: "Actions", width: 210, align: "left" },
  ];
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
    select: true,
    //  expander: true,
      targetPage: true, anchor: true, anchorType: true,
    targetPils: true, targetStatus: true, lastVerified: true, actions: true,
  });
  const visibleColumns = useMemo(() => columns.filter((c) => visibleCols[c.key] !== false), [columns, visibleCols]);


  /* Frozen left columns style */
  const stickyStyle = (k: ColumnKey) =>
    k === "select" ? { position: "sticky" as const, left: 0, zIndex: 40, background: "#fff" }
      // : k === "expander" ? { position: "sticky" as const, left: 36, zIndex: 40, background: "#fff" }
        // : k === "targetPage" ? { position: "sticky" as const, left: 72, zIndex: 30, background: "#fff" }
          : {};


  /* Selection / expansion */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const anySelected = selectedIds.length > 0;

  const handleCreateTaskForRow = useCallback(
    (row: OutlinkRow) => {
      const description = [
        `Target URL: ${row.targetUrl}`,
        `Anchor: ${row.anchor} (${row.anchorType})`,
        `Status: ${row.targetStatus}${row.targetStatus === "redirect" ? ` (chain depth ${row.redirectChainDepth ?? 0})` : ""}`,
        `Instances found: ${row.instances}`,
        `Last verified: ${new Date(row.lastVerified).toLocaleString()}`,
      ].join("\n");

      launchTask({
        title: `Fix outlink – ${row.anchor}`,
        description,
      });
    },
    [launchTask],
  );

  const handleCreateTaskForSelection = useCallback(() => {
    if (!selectedIds.length) return;

    const selectedRows = selectedIds
      .map((id) => rows.find((r) => r.id === id))
      .filter((row): row is OutlinkRow => Boolean(row));

    if (!selectedRows.length) return;

    const summaryLines = selectedRows
      .slice(0, 5)
      .map((row) => `• ${row.anchor} → ${row.targetUrl} (${row.targetStatus})`);
    const remaining = selectedRows.length - summaryLines.length;

    const description = [
      `Selected outlinks: ${selectedRows.length}`,
      ...summaryLines,
      remaining > 0 ? `…and ${remaining} more.` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const title =
      selectedRows.length === 1
        ? `Fix outlink – ${selectedRows[0].anchor}`
        : `Fix ${selectedRows.length} outlinks`;

    launchTask({ title, description });
  }, [launchTask, rows, selectedIds]);


  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [instancesCache, setInstancesCache] = useState<Record<string, InstanceRow[] | undefined>>({});
  const toggleExpand = async (id: string) => {
    setExpanded((prev) => {
      if (multiExpand) return { ...prev, [id]: !prev[id] };
      const next: Record<string, boolean> = {};
      if (!prev[id]) next[id] = true;
      return next;
    });
    if (!instancesCache[id]) {
      const data = await mockLoadInstances(id, 6);
      setInstancesCache((m) => ({ ...m, [id]: data }));
    }
  };


  /* Infinite / pagination windowing */
  const [visibleCount, setVisibleCount] = useState(30);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);


  /* Filters pipeline */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !(`${r.targetUrl} ${r.anchor}`.toLowerCase().includes(search.toLowerCase()))) return false;
      if (typeSel.size && !typeSel.has(r.anchorType)) return false;
      if (statusSel.size && !statusSel.has(r.targetStatus)) return false;
      if (!(r.targetPils >= pilsRange[0] && r.targetPils <= pilsRange[1])) return false;
      return true;
    });
  }, [rows, search, typeSel, statusSel, pilsRange]);


  /* Sort pipeline */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const get = (k: SortKey, o: OutlinkRow): any => {
        switch (k) {
          case "targetPage": return o.targetUrl.toLowerCase();
          case "anchor": return o.anchor.toLowerCase();
          case "anchorType": return o.anchorType;
          case "targetPils": return o.targetPils;
          case "targetStatus": return o.targetStatus;
          case "lastVerified": return new Date(o.lastVerified).getTime();
        }
      };
      const av = get(sortBy, a); const bv = get(sortBy, b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);


  /* Windowed rows */
  const windowed = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);


  /* Infinite observer */
  useEffect(() => {
    if (!infinite) return;
    const sentinel = document.getElementById("outlink-scroll-sentinel");
    if (!sentinel) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((v) => Math.min(sorted.length, v + 30));
    });
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);


  /* Bulk helpers */
  const visibleIds = windowed.map((r) => r.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected[id]);
  const someVisibleSelected =
    visibleIds.some((id) => selected[id]) && !allVisibleSelected;


  /* Export (CSV) */
  const exportCSV = (onlySelected = false) => {
    const cols: (keyof OutlinkRow)[] = [
      "targetUrl", "anchor", "anchorType", "targetPils", "targetStatus", "redirectChainDepth", "lastVerified", "instances",
    ];
    const dataset = onlySelected ? sorted.filter((r) => !!selected[r.id]) : sorted;
    const header = cols.join(",");
    const lines = dataset
      .map((r) => cols.map((k) => JSON.stringify((r as any)[k] ?? "")).join(","))
      .join("\n");
    const blob = new Blob([header + "\n" + lines], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "outlinks-selected.csv" : "outlinks.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };


  const clearFilters = () => {
    setSearch(""); setTypeSel(new Set()); setStatusSel(new Set()); setPilsRange([0, 100]);
  };


  /* Column descriptions (header hover) */
  const colDesc: Record<ColumnKey, string> = {
    select: "Select rows for bulk actions.",
    // expander: "Expand to preview anchor instances and quick actions.",
    targetPage: "Internal page this link points to.",
    anchor: "Anchor text used on the current page.",
    anchorType: "Anchor category (Exact / Partial / Branded / Generic).",
    targetPils: "Target page’s Interlinking Score (0–100).",
    targetStatus: "Target health (Healthy / Redirect / Broken / Orphan).",
    lastVerified: "When this link was last verified in crawl.",
    actions: "Quick actions and CTAs.",
  };


  /* Column Manager state */
  const [showColumnsMgr, setShowColumnsMgr] = useState(false);


  return (
    <section className="space-y-3 mt-4">
      <Card className="border w-full" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        {/* Header */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg" style={{ color: TOKENS.text }}>Outlink Targets</CardTitle>
            <p className="text-sm" style={{ color: TOKENS.muted }}>
              These are internal links from this page to other URLs. Review anchor quality, target score, and open target pages in Page Analyzer for deep SEO audits.
            </p>
          </div>


          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Infinite</span>
              <Switch checked={infinite} onCheckedChange={(v) => { setInfinite(Boolean(v)); if (Boolean(v)) setVisibleCount(30); }} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Multi‑expand</span>
              <Switch checked={multiExpand} onCheckedChange={setMultiExpand} />
            </div>


            {/* Columns manager */}
            <Popover open={showColumnsMgr} onOpenChange={setShowColumnsMgr}>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white text-muted-foreground hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <ScrollArea className="max-h-[360px] pr-2">
                  <div className="space-y-2">
                    {columns.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          disabled={c.key === "select" 
                            // || c.key === "expander" 
                            || c.key === "targetPage"}
                          checked={visibleCols[c.key] !== false}
                          onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                        />
                        <span>{c.label || c.key}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm"
                    onClick={() => setVisibleCols({ select: true,
                    //  expander: true,
                      targetPage: true, anchor: true, anchorType: true, targetPils: true, targetStatus: true, lastVerified: true, actions: true })}>
                    Reset
                  </Button>
                  <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>


            {/* Export + Refresh */}
            <Button variant="outline" size="sm" onClick={() => exportCSV(anySelected)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setRows(makeRows(56))}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>


        {/* Bulk toolbar */}
        {anySelected && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t"
               style={{ borderColor: TOKENS.borderLight, background: TOKENS.appBg }}>
            <div className="text-sm"><strong>{selectedIds.length}</strong> selected</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                onClick={handleCreateTaskForSelection}
              >
                <ClipboardList className="h-4 w-4 mr-1" />
                Create Tasks
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportCSV(true)}><Download className="h-4 w-4 mr-1" />Export selection</Button>
              <Button size="sm" variant="destructive" disabled className="opacity-50 cursor-not-allowed">
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        )}


        {/* Filters */}
        <CardContent className="border-t pt-4" style={{ borderColor: TOKENS.borderLight }}>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" /> Filters
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Filter outlinks by anchor traits, target health and score.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>


            <Button variant="outline" size="sm" onClick={clearFilters}>Clear all</Button>


            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[280px] pl-7" placeholder="Search target URL or anchor…"
                     value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>


            {/* Anchor type chips */}
            {ATYPES.map((t) => {
              const on = typeSel.has(t);
              return (
                <button
                  key={t}
                  onClick={() => {
                    const next = new Set(typeSel);
                    if (next.has(t)) next.delete(t); else next.add(t);
                    setTypeSel(next);
                  }}
                  className={`px-2 py-1 rounded-full text-[12px] border ${on ? "font-semibold" : ""}`}
                  style={{
                    borderColor: TOKENS.border, background: TOKENS.chipBg,
                    color: on ? TOKENS.text : TOKENS.muted,
                  }}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              );
            })}


            {/* Status chips */}
            {(["healthy", "redirect", "broken", "orphan"] as TargetStatus[]).map((s) => {
              const on = statusSel.has(s);
              const label = s[0].toUpperCase() + s.slice(1);
              return (
                <button
                  key={s}
                  onClick={() => {
                    const next = new Set(statusSel);
                    if (next.has(s)) next.delete(s); else next.add(s);
                    setStatusSel(next);
                  }}
                  className={`px-2 py-1 rounded-full text-[12px] border ${on ? "font-semibold" : ""}`}
                  style={{
                    borderColor: TOKENS.border, background: TOKENS.chipBg,
                    color: on ? TOKENS.text : TOKENS.muted,
                  }}
                >
                  {label}
                </button>
              );
            })}


            {/* PILS range */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" />
                  PILS {pilsActive ? `${pilsRange[0]}–${pilsRange[1]}` : "(All)"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Score range</span>
                    <span className="text-muted-foreground">{pilsRange[0]} – {pilsRange[1]}</span>
                  </div>
                  <Slider value={[pilsRange[0], pilsRange[1]]} min={0} max={100} step={1}
                          onValueChange={(v) => {
                            const [a, b] = v as [number, number];
                            setPilsRange([a, b]);
                          }} />
                  <div className="flex items-center gap-2">
                    <Input type="number" className="w-20" min={0} max={100}
                           value={pilsRange[0]} onChange={(e) => setPilsRange([Math.max(0, Math.min(100, Number(e.target.value) || 0)), pilsRange[1]])} />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input type="number" className="w-20" min={0} max={100}
                           value={pilsRange[1]} onChange={(e) => setPilsRange([pilsRange[0], Math.max(0, Math.min(100, Number(e.target.value) || 0))])} />
                    <div className="ml-auto flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPilsRange([0, 100])}>Reset</Button>
                      <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>


        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                <TableRow>
                  {visibleColumns.map((c) => (
                    <TableHead key={c.key}
                      style={{ minWidth: c.width, ...stickyStyle(c.key) }}
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
                          />
                        </div>
                      ) : !c.sortable ? (
                        <span className="relative group cursor-help inline-block">
                          {c.label}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {colDesc[c.key]}
                          </span>
                        </span>
                      ) : (
                        <button className="inline-flex items-center gap-1 hover:text-foreground relative group cursor-help"
                                onClick={() => toggleSort(c.key)}>
                          <span>{c.label}</span>
                          {sortBy === (c.key as any) ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">{colDesc[c.key]}</span>
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>


              <TableBody>
                {windowed.map((r) => {
                  const riskStripe = r.targetStatus === "broken" ? TOKENS.critical
                    : r.targetStatus === "redirect" ? TOKENS.warning
                      : r.targetStatus === "orphan" ? TOKENS.warning : undefined;


                  return (
                    <React.Fragment key={r.id}>
                      <TableRow className="hover:bg-[#F5F7FA]">
                        {/* left risk stripe */}


                        {visibleCols.select !== false && (
                          <TableCell >
                            <Checkbox
                              checked={!!selected[r.id]}
                              onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))}
                              aria-label={`Select row ${r.targetUrl}`}
                            />
                          </TableCell>
                        )}
                        {/* {visibleCols.expander !== false && (
                          <TableCell style={stickyStyle("expander") as any}>
                            <button onClick={() => toggleExpand(r.id)} aria-label="Expand row"
                                    className="rounded-md border p-1 hover:bg-muted">
                              {expanded[r.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </TableCell>
                        )} */}
                        {visibleCols.targetPage !== false && (
                          <TableCell >
                            <div className="flex items-center gap-2">
                              <LinkIcon className="h-4 w-4 text-muted-foreground" />
                              <div className="min-w-0">
                                <div className="truncate max-w-[320px]">
                                  <a className="underline" style={{ color: TOKENS.valueBlue }} href={r.targetUrl} target="_blank" rel="noreferrer">
                                    {r.targetUrl}
                                  </a>
                                </div>
                                <div className="text-[12px] text-muted-foreground truncate max-w-[320px]">{r.targetTitle || r.targetUrl}</div>
                              </div>
                              {/* <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a className="inline-flex items-center" href={r.targetUrl} target="_blank" rel="noreferrer" aria-label="View in Page Analyzer">
                                      <ExternalLink className="h-4 w-4 text-[#0077FF]" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>Open in Page Analyzer</TooltipContent>
                                </Tooltip>
                              </TooltipProvider> */}
                            </div>
                          </TableCell>
                        )}
                        {visibleCols.anchor !== false && (<TableCell className="font-medium">{r.anchor}</TableCell>)}
                        {visibleCols.anchorType !== false && (<TableCell><AnchorTypeBadge t={r.anchorType} /></TableCell>)}
                        {visibleCols.targetPils !== false && (<TableCell><MiniPilsBar value={r.targetPils} /></TableCell>)}
                        {visibleCols.targetStatus !== false && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusPill s={r.targetStatus} depth={r.redirectChainDepth} />
                              {r.targetStatus === "redirect" && (
                                <button className="text-[12px] underline" style={{ color: TOKENS.valueBlue }} onClick={() => console.info("open_redirect_chain", r.id)}>
                                  View Chain
                                </button>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleCols.lastVerified !== false && (
                          <TableCell>{new Date(r.lastVerified).toLocaleString()}</TableCell>
                        )}
                        {visibleCols.actions !== false && (
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      aria-label="Open target"
                                      className="text-[#4286F5]"
                                      onClick={() => {
                                        if (typeof window !== "undefined") {
                                          window.open(r.targetUrl, "_blank", "noopener,noreferrer");
                                        }
                                      }}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Open target</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      aria-label="Create Task"
                                      className="text-[#4286F5]"
                                      onClick={() => handleCreateTaskForRow(r)}
                                    >
                                      <ClipboardList className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Create Task</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      aria-label="Remove link"
                                      className="text-red-600 opacity-50 cursor-not-allowed"
                                      disabled
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Remove from tracking</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>


                      {/* Expanded row */}
                      {expanded[r.id] && (
                        <TableRow className="bg-[#FAFAFC]">
                          <TableCell colSpan={visibleColumns.length} className="p-0">
                            <ExpandedInstances
                              row={r}
                              instances={instancesCache[r.id]}
                              onNeedLoad={async () => {
                                if (!instancesCache[r.id]) {
                                  const data = await mockLoadInstances(r.id, 6);
                                  setInstancesCache((m) => ({ ...m, [r.id]: data }));
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}


                {windowed.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length} className="px-4 py-10 text-center text-gray-500">
                      No outlinks match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {infinite && <div id="outlink-scroll-sentinel" className="h-8" />}
          </div>
        </CardContent>


        {/* Pagination controls (when Infinite OFF) */}
        {!infinite && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)}>First</Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <div className="text-sm w-16 text-center">{page}</div>
              <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage((p) => p + 1)}>Next</Button>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Page size" /></SelectTrigger>
                <SelectContent>{[10, 25, 50, 100].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}


/* ------------------------------------------------------------------ */
/* Expanded Instances Pane                                            */
/* ------------------------------------------------------------------ */
function ExpandedInstances({
  row, instances, onNeedLoad,
}: { row: OutlinkRow; instances?: InstanceRow[]; onNeedLoad: () => void }) {
  useEffect(() => { if (!instances) onNeedLoad(); }, [instances, onNeedLoad]);


  return (
    <div className="p-4">
      <div className="mb-2 text-[13px] font-medium" style={{ color: TOKENS.text }}>
        Instances for <span className="font-semibold" style={{ color: TOKENS.valueBlue }}>{row.targetUrl}</span>
      </div>
      {!instances ? (
        <div className="text-sm text-muted-foreground">Loading instances…</div>
      ) : (
        <div className="rounded-md border p-2" style={{ borderColor: TOKENS.borderLight, background: TOKENS.appBg }}>
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Position</TableHead>
                <TableHead>Snippet</TableHead>
                <TableHead className="w-[140px]">Instance AQS</TableHead>
                <TableHead className="w-[200px]">Last Verified</TableHead>
                <TableHead className="w-[180px]">Quick</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell className="capitalize">{it.position}</TableCell>
                  <TableCell dangerouslySetInnerHTML={{ __html: it.snippetHtml }} />
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="relative h-2 rounded bg-gray-200 overflow-hidden" style={{ width: 100 }}>
                        <div className="h-2 rounded" style={{
                          width: `${it.instanceAqs}%`,
                          backgroundColor: it.instanceAqs >= 75 ? TOKENS.success : it.instanceAqs >= 50 ? TOKENS.warning : TOKENS.critical,
                        }} />
                      </div>
                      <span className="text-[13px]">{it.instanceAqs}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(it.lastVerified).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline"><GitFork className="h-4 w-4 mr-1" />Replace</Button>
                      <Button size="sm" variant="outline"><ClipboardList className="h-4 w-4 mr-1" />Task</Button>
                      <Button size="sm" variant="outline"><CheckCircle2 className="h-4 w-4 mr-1" />Mark OK</Button>
                      <Button size="sm" variant="outline" className="text-red-600"><ShieldAlert className="h-4 w-4 mr-1" />Flag</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
