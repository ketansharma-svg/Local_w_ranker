"use client";

import * as React from "react";
import {
  Button
} from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Popover, PopoverTrigger, PopoverContent
} from "@/components/ui/popover";
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Info, Eye, ChartNoAxesColumn, Layers3, BookmarkPlus, ClipboardList, Target,
  Sparkles, SquareStack, Video, Image, MapPin, Newspaper, Brain, Tag, BookOpen, MessageSquareText,
  SlidersHorizontal, Download, ChevronsUpDown, ChevronUp, ChevronDown, Lock, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section 4: Top Keywords & SERP Features — Top 5 keywords only
 *
 * • Inter / Inter Fallback fonts; no emoji
 * • Section header now includes a branded (#008CCD) title icon and the Export button
 * • Hyperlinks keep the existing color (#4286F5)
 * • SERP Features use the same icons & colors as other sections
 * • Pointer cursor on all interactive controls
 * • Table shows ONLY the top 5 rows (sorted per current sort); pagination removed
 *
 * Design tokens & typographic scale align with Wranker’s token set. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}
 */

/* ───────────────────────── Tokens (aligned with OVI/Analytics) ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "var(--wr-brand,#008CCD)",
  action: "var(--wr-action,#0077FF)",       // secondary accent when needed
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  valueBlue: "#4286F5",                      // hyperlink color – unchanged
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
};

/* ───────────────────────── Types ───────────────────────── */
type FeatureKey =
  | "FS" | "PAA" | "IMG" | "VID" | "KP" | "LOCAL" | "STORIES" | "DISCUSS" | "TTK" | "BRANDS";

type FeatureBadge = { type: FeatureKey; linked: boolean };

type Row = {
  id: string;
  keyword: string;
  position: number | "NEW";
  delta?: number;
  volume?: number;
  kd?: number;
  cpc?: number;
  traffic?: number;
  trafficShare?: number;
  page?: string;
  lastCheckedAt: string;
  serp: FeatureBadge[];
  selected?: boolean;
};

/* ───────────────────────── Feature Meta (icons + colors) ───────────────────────── */
const FM: Record<FeatureKey, { label: string; color: string; Icon: React.ComponentType<any> }> = {
  FS:       { label: "Featured Snippet",     color: "#16A34A", Icon: Sparkles },
  PAA:      { label: "People Also Ask",      color: "#3B82F6", Icon: SquareStack },
  IMG:      { label: "Image Pack",           color: "#F59E0B", Icon: Image },
  VID:      { label: "Video",                color: "#8B5CF6", Icon: Video },
  KP:       { label: "Knowledge Panel",      color: "#14B8A6", Icon: Brain },
  LOCAL:    { label: "Local Pack",           color: "#FB7185", Icon: MapPin },
  STORIES:  { label: "Top Stories",          color: "#EF4444", Icon: Newspaper },
  DISCUSS:  { label: "Discussions & Forums", color: "#0EA5E9", Icon: MessageSquareText },
  TTK:      { label: "Things to Know",       color: "#6366F1", Icon: BookOpen },
  BRANDS:   { label: "Explore Brands",       color: "#A855F7", Icon: Tag },
};

/* ───────────────────────── Helpers ───────────────────────── */
const fmtNum = (n?: number) => (n == null ? "—" : n.toLocaleString());
const idFor  = (s: string) => "k_" + s.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60);
const clamp  = (v:number, lo:number, hi:number) => Math.max(lo, Math.min(hi, v));
const kdBand = (kd=0) => kd >= 75 ? {label:"Very", color: TK.critical}
  : kd >= 55 ? {label:"Difficult", color:"#D97706"}
  : kd >= 30 ? {label:"Moderate", color: TK.warn}
  : {label:"Easy", color: TK.ok};

/* ───────────────────────── Mini Atoms ───────────────────────── */
const KDDot: React.FC<{ kd?: number }> = ({ kd }) => {
  const k = kdBand(kd ?? 0);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs cursor-default">
            <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: k.color }} />
            <span>{kd ?? "—"}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Difficulty {kd ?? "—"} • {k.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const TrafficShareBar: React.FC<{ value?: number; gated?: boolean }> = ({ value, gated }) => {
  if (gated) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Pro
      </span>
    );
  }
  const pct = value == null ? 0 : clamp(Math.round((value ?? 0) * 100), 0, 100);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-2.5 w-20 rounded bg-gray-200 relative overflow-hidden">
        <span className="absolute left-0 top-0 h-full" style={{ width: `${pct}%`, background: TK.valueBlue }} />
      </span>
      <span className="text-sm">{value == null ? "—" : `${pct}%`}</span>
    </span>
  );
};

const PositionCell: React.FC<{ pos: number | "NEW"; delta?: number }> = ({ pos, delta }) => {
  const isNew = pos === "NEW";
  const up = (delta ?? 0) > 0;
  const down = (delta ?? 0) < 0;
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-flex h-6 min-w-[38px] items-center justify-center rounded-full px-2 text-xs font-semibold",
          isNew ? "border" : "bg-[#4286F5] text-white"
        )}
        style={{ borderColor: TK.pastel }}
        title={isNew ? "Newly ranked" : "Current position"}
      >
        {isNew ? "NEW" : `#${pos}`}
      </span>
      <span className="inline-flex items-center text-xs">
        {up && <ChevronUp className="h-3.5 w-3.5 text-[#10B981]" />}
        {down && <ChevronDown className="h-3.5 w-3.5 text-[#EF4444]" />}
        {!up && !down && <span className="text-muted-foreground">—</span>}
        {delta != null && delta !== 0 && <span className={cn("ml-0.5", up ? "text-[#10B981]" : "text-[#EF4444]")}>{Math.abs(delta)}</span>}
      </span>
    </div>
  );
};

const SerpBadgesCell: React.FC<{ items: FeatureBadge[] }> = ({ items }) => {
  if (!items?.length) return <span className="text-muted-foreground">—</span>;
  const MAX = 6;
  const shown = items.slice(0, MAX);
  const extra = items.length - shown.length;
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {shown.map(({ type, linked }, i) => {
        const M = FM[type]; if (!M) return null;
        const Icon = M.Icon;
        return (
          <TooltipProvider key={`${type}-${i}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="relative inline-flex items-center justify-center rounded-[6px] border px-1.5 py-1"
                  style={{ borderColor: TK.borderLight, background: "#fff", cursor: "pointer" }}
                  aria-label={`${M.label} — ${linked ? "Linked" : "Not linked"}`}
                >
                  <Icon className="h-4 w-4" style={{ color: M.color }} />
                  {linked && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-2"
                      style={{ background: TK.brand, color: "#fff" }}
                      aria-hidden
                    />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {M.label} — <strong>{linked ? "Linked" : "Not linked"}</strong>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      {extra > 0 && (
        <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 border rounded" style={{ borderColor: TK.borderLight }}>
          +{extra}
        </span>
      )}
    </div>
  );
};

/* ───────────────────────── Column model ───────────────────────── */
type ColKey =
  | "select" | "keyword" | "position" | "serp" | "traffic" | "share" | "volume" | "kd" | "cpc" | "page" | "updated" | "actions";
type ColDef = { key: ColKey; label: string; width?: number; align?: "left"|"right"|"center"; sortable?: boolean; sticky?: boolean; tooltip?: string };

const COLS: ColDef[] = [
  { key:"select",   label:"",            width: 46, align:"center", sticky:true },
  { key:"keyword",  label:"Keyword",     width: 360, sortable:true, sticky:true },
  { key:"position", label:"Position",    width: 130, align:"center", sortable:true, tooltip:"Current rank & delta since last check." },
  { key:"serp",     label:"SERP Features", width: 220, align:"center", tooltip:"Feature surfaces triggered for this keyword (linked vs not linked)." },
  { key:"traffic",  label:"Traffic",     width: 120, align:"right", sortable:true, tooltip:"Estimated monthly organic visits from this keyword to the page." },
  { key:"share",    label:"Traffic %",   width: 140, align:"right", tooltip:"Share of this page’s total estimated organic traffic." },
  { key:"volume",   label:"Volume",      width: 110, align:"right", sortable:true, tooltip:"Avg monthly searches (SE Ranking)." },
  { key:"kd",       label:"KD",          width: 100, align:"center", sortable:true, tooltip:"Keyword Difficulty (0–100)." },
  { key:"cpc",      label:"CPC",         width: 100, align:"right", sortable:true },
  { key:"page",     label:"Page",        width: 260, tooltip:"Target URL (opens Page Insights Drawer)." },
  { key:"updated",  label:"Updated",     width: 130, sortable:true },
  { key:"actions",  label:"Actions",     width: 200 },
];

/* ───────────────────────── Controls ───────────────────────── */
const ChipBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; title?: string }> =
  ({ active, onClick, children, title }) => (
    <button
      className="h-8 px-3 rounded-[6px] border text-sm cursor-pointer"
      style={{ borderColor: TK.border, background: active ? TK.pastel : "#FFF" }}
      onClick={onClick}
      aria-pressed={active}
      title={title}
    >{children}</button>
);

type RangeState = { volMin?: number; volMax?: number; kdMin?: number; kdMax?: number; cpcMin?: number; cpcMax?: number };
const RangesPopover: React.FC<{
  value: RangeState; onApply: (v:RangeState)=>void; onReset: ()=>void
}> = ({ value, onApply, onReset }) => {
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState<RangeState>(value);
  React.useEffect(()=> { if (open) setLocal(value); }, [open, value]);
  const Num: React.FC<{ label: string; v?: number; on:(n?:number)=>void }> = ({ label, v, on }) => (
    <label className="text-xs w-[140px]">
      <div className="mb-1 text-muted-foreground">{label}</div>
      <Input type="number" value={v ?? ""} onChange={(e)=> on(e.target.value==="" ? undefined : Number(e.target.value))} />
    </label>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 px-3 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 mr-1" /> Ranges
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] z-[240]" sideOffset={8} align="start">
        <div className="text-sm font-medium mb-2">Range filters</div>
        <div className="grid grid-cols-3 gap-3">
          <Num label="Vol min" v={local.volMin} on={(n)=> setLocal(s=>({ ...s, volMin:n }))} />
          <Num label="Vol max" v={local.volMax} on={(n)=> setLocal(s=>({ ...s, volMax:n }))} />
          <Num label="KD min"  v={local.kdMin}  on={(n)=> setLocal(s=>({ ...s, kdMin:n }))} />
          <Num label="KD max"  v={local.kdMax}  on={(n)=> setLocal(s=>({ ...s, kdMax:n }))} />
          <Num label="CPC min" v={local.cpcMin} on={(n)=> setLocal(s=>({ ...s, cpcMin:n }))} />
          <Num label="CPC max" v={local.cpcMax} on={(n)=> setLocal(s=>({ ...s, cpcMax:n }))} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={()=>{ onReset(); setOpen(false); }}>Reset</Button>
          <Button size="sm" onClick={()=>{ onApply(local); setOpen(false); }}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ───────────────────────── Mock Data (demo‑ready) ───────────────────────── */
function rand(min:number, max:number) { return Math.floor(Math.random()*(max-min+1))+min; }
function pick<T>(a:T[]) { return a[rand(0, a.length-1)]; }
const ALL_FEATURES: FeatureKey[] = ["FS","PAA","IMG","VID","KP","LOCAL","STORIES","DISCUSS","TTK","BRANDS"];

function makeRows(count=60): Row[] {
  const rows: Row[] = [];
  for (let i=0;i<count;i++){
    const kw = `best seo tool ${i+1}`;
    const position = Math.random()>.15 ? rand(1, 70) : "NEW";
    const delta = position === "NEW" ? undefined : (Math.random()>.5 ? -rand(1,7) : rand(0,6));
    const volume = Math.random()>.1 ? rand(80, 44000) : undefined;
    const kd = rand(8, 88);
    const cpc = Math.random()>.4 ? Number((Math.random()*7 + .2).toFixed(2)) : undefined;
    const features = ALL_FEATURES.filter(()=> Math.random()>.65)
      .slice(0, rand(1, 5))
      .map(type => ({ type, linked: Math.random()>.45 }));
    const traffic = Math.random()>.2 ? rand(10, 1200) : undefined;
    const share = traffic ? clamp((traffic / (traffic + rand(50, 3500))), 0, 1) : undefined;
    rows.push({
      id: idFor(kw + i),
      keyword: kw,
      position, delta,
      volume, kd, cpc,
      traffic, trafficShare: share,
      page: Math.random()>.5 ? `/blog/seo-tool-${i+1}` : `/tools/seo/${i+1}`,
      lastCheckedAt: new Date(Date.now() - rand(0,12)*86400000).toISOString(),
      serp: features.length ? features : [{ type:"PAA", linked:false }],
    });
  }
  return rows;
}

/* ───────────────────────── Export helpers ───────────────────────── */
function exportCsv(rows: Row[], visibleCols: Record<ColKey, boolean>) {
  const colsOut: ColKey[] = (COLS.filter(c => visibleCols[c.key]) as ColDef[]).map(c=>c.key)
    .filter(k => !["select","actions"].includes(k));
  const lines = [
    colsOut.join(","),
    ...rows.map(r => colsOut.map(k => {
      switch (k) {
        case "keyword":  return JSON.stringify(r.keyword);
        case "position": return typeof r.position === "number" ? r.position : "NEW";
        case "serp":     return r.serp.map(s=> `${s.type}${s.linked ? ":linked" : ""}`).join("|");
        case "traffic":  return r.traffic ?? "";
        case "share":    return r.trafficShare == null ? "" : Math.round(r.trafficShare*100);
        case "volume":   return r.volume ?? "";
        case "kd":       return r.kd ?? "";
        case "cpc":      return r.cpc ?? "";
        case "page":     return r.page ?? "";
        case "updated":  return r.lastCheckedAt;
        default: return "";
      }
    }).join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type:"text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "top_keywords_serp.csv"; a.click(); URL.revokeObjectURL(a.href);
}

/* ───────────────────────── Main Component ───────────────────────── */
export default function TopKeywordsSerpTable({
  initialRows,
  isPro = true,                   // Freemium: if false → mask CPC & Traffic%
  onOpenAnalyzer,
  onOpenPageDrawer,
  onOpenSerpTab,
}: {
  initialRows?: Row[];
  isPro?: boolean;
  onOpenAnalyzer?: (keyword: string)=>void;
  onOpenPageDrawer?: (page: string)=>void;
  onOpenSerpTab?: (feature: FeatureKey)=>void;
}) {
  /* Data */
  const [rows, setRows] = React.useState<Row[]>(() => initialRows?.length ? initialRows : makeRows(60));

  /* Visible Columns */
  const defaultCols: Record<ColKey, boolean> = React.useMemo(() => {
    const base: Record<ColKey, boolean> = COLS.reduce((a,c)=> ({ ...a, [c.key]: true }), {} as any);
    base.select = true; base.keyword = true; base.position = true; base.serp = true; base.traffic = true; base.share = true;
    base.volume = true; base.kd = true; base.cpc = true; base.page = true; base.updated = false; base.actions = true;
    return base;
  }, []);
  const [visibleCols, setVisibleCols] = React.useState<Record<ColKey, boolean>>(defaultCols);

  /* Filters */
  const [search, setSearch] = React.useState("");
  const [featureFilter, setFeatureFilter] = React.useState<FeatureKey[]>([]);
  const [linkedOnly, setLinkedOnly] = React.useState<"all"|"linked"|"missed">("all");
  const [ranges, setRanges] = React.useState<RangeState>({});

  /* Sorting */
  const [sortBy, setSortBy]   = React.useState<ColKey>("traffic");
  const [sortDir, setSortDir] = React.useState<"asc"|"desc">("desc");
  function toggleSort(k: ColKey) {
    const col = COLS.find(c => c.key===k);
    if (!col?.sortable) return;
    if (sortBy !== k) { setSortBy(k); setSortDir("asc"); }
    else setSortDir(d => d==="asc" ? "desc" : "asc");
  }

  /* Filtering pipeline */
  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      if (search && !r.keyword.toLowerCase().includes(search.toLowerCase())) return false;

      if (featureFilter.length) {
        const types = r.serp.map(s=>s.type);
        if (!featureFilter.every(f => types.includes(f))) return false;
      }
      if (linkedOnly !== "all") {
        const anyLinked = r.serp.some(s => s.linked);
        if (linkedOnly === "linked" && !anyLinked) return false;
        if (linkedOnly === "missed" && anyLinked) return false;
      }
      if (ranges.volMin != null && (r.volume ?? 0) < ranges.volMin) return false;
      if (ranges.volMax != null && (r.volume ?? 0) > ranges.volMax) return false;
      if (ranges.kdMin  != null && (r.kd ?? 0)    < ranges.kdMin)  return false;
      if (ranges.kdMax  != null && (r.kd ?? 0)    > ranges.kdMax)  return false;
      if (ranges.cpcMin != null && (r.cpc ?? 0)   < ranges.cpcMin) return false;
      if (ranges.cpcMax != null && (r.cpc ?? 0)   > ranges.cpcMax) return false;

      return true;
    });
  }, [rows, search, featureFilter, linkedOnly, ranges]);

  /* Sorting */
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const val = (r: Row) => {
      switch (sortBy) {
        case "keyword":  return r.keyword.toLowerCase();
        case "position": return typeof r.position === "number" ? r.position : 9999;
        case "traffic":  return r.traffic ?? -1;
        case "share":    return r.trafficShare ?? -1;
        case "volume":   return r.volume ?? -1;
        case "kd":       return r.kd ?? -1;
        case "cpc":      return r.cpc ?? -1;
        case "updated":  return new Date(r.lastCheckedAt).getTime();
        default:         return 0;
      }
    };
    arr.sort((a,b) => {
      const av = val(a), bv = val(b);
      if (av===bv) return 0;
      return sortDir==="asc" ? (av>bv?1:-1) : (av<bv?1:-1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Top 5 only (no pagination) */
  const topRows = React.useMemo(()=> sorted.slice(0, 5), [sorted]);

  /* Selection across the visible window (top 5) */
  const pageIds = React.useMemo(()=> topRows.map(r => r.id), [topRows]);
  const allSelected = pageIds.length > 0 && pageIds.every(id => rows.find(r=>r.id===id)?.selected);
  const selectedCount = rows.filter(r => r.selected).length;
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setRows(prev => prev.map(r => pageIds.includes(r.id) ? ({ ...r, selected: checked }) : r));
  };

  /* Actions (stubs) */
  const openAnalyzer = (kw: string) => onOpenAnalyzer ? onOpenAnalyzer(kw) : alert(`Open Analyzer: ${kw}`);
  const openSERP      = (kw: string) => onOpenSerpTab ? onOpenSerpTab("FS") : alert(`Open SERP snapshot for: ${kw}`);
  const openPage      = (url: string) => onOpenPageDrawer ? onOpenPageDrawer(url) : alert(`Open Page Insights: ${url}`);
  const createTask    = (kws: string[]) => alert(`Create Task for ${kws.length} keyword(s)`);
  const addToTracking = (kws: string[]) => alert(`Add to Rank Tracker: ${kws.length} keyword(s)`);
  const addToCluster  = (kw: string) => alert(`Add to cluster: ${kw}`);

  /* Sticky helper */
  const stickyStyle = (c: ColDef) =>
    c.sticky ? { position:"sticky" as const, left: c.key==="select" ? 0 : 46, zIndex: 30, background:"#fff", boxShadow:"inset -1px 0 0 rgba(0,0,0,0.06)"} : undefined;

  /* Column manager list */
  const VISIBLE = COLS.filter(c => visibleCols[c.key] !== false);

  return (
    <section
      className="rounded-md border bg-white mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Top Keywords & SERP Features"
    >
      {/* Section Header — title + Export */}
      <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.borderLight }}>
        <div className="flex items-center gap-2 min-w-0">
          <Search size={18} color={TK.brand as string} className="shrink-0" />
          <h3 className="text-[18px] font-semibold truncate" style={{ color: TK.text }}>
            Top Keywords &amp; SERP Features
          </h3>
          <span className="text-xs text-muted-foreground">(Top 5)</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8 px-3 cursor-pointer">
              <Download className="h-4 w-4 mr-1" color={TK.brand as string} /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px] z-[280]">
            <DropdownMenuItem onClick={()=> exportCsv(topRows, visibleCols)}>CSV (Top 5 • visible cols)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled title="PNG/PDF via Report Builder in main panel">PNG (via Reports)</DropdownMenuItem>
            <DropdownMenuItem disabled>PDF (Pro)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Controls */}
      <div className="p-3 px-4 border-b" style={{ borderColor: TK.borderLight }}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Input className="w-[280px] pl-7" placeholder="Search keyword…" value={search} onChange={(e)=> setSearch(e.target.value)} />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Feature toggles (multi-select) */}
          {(["FS","PAA","IMG","VID","LOCAL","STORIES","DISCUSS","KP"] as FeatureKey[]).map(f => {
            const active = featureFilter.includes(f);
            return (
              <ChipBtn key={f} active={active} onClick={()=> setFeatureFilter(active ? featureFilter.filter(x=>x!==f) : [...featureFilter, f])}>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FM[f].color }} />
                  {f}
                </span>
              </ChipBtn>
            );
          })}

          {/* Linked / Missed */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 px-3 cursor-pointer">
                Link status: {linkedOnly === "all" ? "All" : linkedOnly === "linked" ? "Linked only" : "Missed only"}
                <ChevronsUpDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px] z-[240]">
              <DropdownMenuItem onClick={()=> setLinkedOnly("all")}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={()=> setLinkedOnly("linked")}>Linked only</DropdownMenuItem>
              <DropdownMenuItem onClick={()=> setLinkedOnly("missed")}>Missed only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <RangesPopover value={ranges} onApply={(v)=> setRanges(v)} onReset={()=> setRanges({})} />

          {/* Column manager */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 px-3 cursor-pointer"><Eye className="h-4 w-4 mr-1" /> Columns</Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] z-[250]" sideOffset={8}>
              <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
              <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                {COLS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      disabled={c.key === "select" || c.key === "keyword"}
                      checked={visibleCols[c.key] !== false}
                      onCheckedChange={(v)=> setVisibleCols(s => ({ ...s, [c.key]: Boolean(v) }))}
                    />
                    <span>{c.label || c.key}</span>
                    {c.tooltip && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">{c.tooltip}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex justify-between">
                <Button variant="outline" size="sm" onClick={()=> setVisibleCols(defaultCols)}>Reset</Button>
                <Button size="sm">Apply</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Bulk bar */}
          {selectedCount > 0 && (
            <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
              <span className="text-sm"><strong>{selectedCount}</strong> selected</span>
              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
              <Button size="sm" variant="outline" onClick={()=> createTask(rows.filter(r=>r.selected).map(r=>r.keyword))}><ClipboardList className="h-4 w-4 mr-1" /> Create Task</Button>
              <Button size="sm" variant="outline" onClick={()=> addToTracking(rows.filter(r=>r.selected).map(r=>r.keyword))}><Target className="h-4 w-4 mr-1" /> Add to Tracking</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline"><BookmarkPlus className="h-4 w-4 mr-1" /> Save to List</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] z-[280]">
                  <DropdownMenuItem onClick={()=> alert("Create list (stub)")}>Create new list…</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline" onClick={()=> exportCsv(rows.filter(r=>r.selected), visibleCols)}><Download className="h-4 w-4 mr-1" /> Export Selected</Button>
              <div className="ml-auto">
                <Button size="sm" variant="ghost" onClick={()=> setRows(prev => prev.map(r => ({ ...r, selected:false })))}>Clear</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table — Top 5 only */}
      <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
        <Table className="text-sm">
          <TableHeader className="bg-white sticky top-0 z-40" style={{ boxShadow: "inset 0 -1px 0 var(--wr-borderLight,#EFF0F6)" }}>
            <TableRow>
              {VISIBLE.map(c => (
                <TableHead key={c.key}
                  style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }}
                  className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                  aria-sort={sortBy === c.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  {c.key === "select" ? (
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all visible (Top 5)" />
                  ) : c.sortable ? (
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={()=> toggleSort(c.key)} style={{ cursor: "pointer" }}>
                      <span>{c.label}</span>
                      {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  ) : c.tooltip ? (
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" /></TooltipTrigger><TooltipContent className="text-xs">{c.tooltip}</TooltipContent></Tooltip>
                      </TooltipProvider>
                    </span>
                  ) : c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {topRows.map(r => (
              <TableRow key={r.id} className="hover:bg-[#F8FAFC]"
                onKeyDown={(e)=> {
                  if (e.key === "Enter" && !e.shiftKey) openAnalyzer(r.keyword);
                  if (e.key === "Enter" && e.shiftKey) openSERP(r.keyword);
                }}
              >
                {visibleCols.select !== false && (
                  <TableCell style={stickyStyle(COLS[0]) as any} className="text-center">
                    <Checkbox checked={!!r.selected} aria-label={`Select ${r.keyword}`}
                      onCheckedChange={(v)=> setRows(prev => prev.map(x => x.id === r.id ? ({ ...x, selected: Boolean(v) }) : x))}
                    />
                  </TableCell>
                )}
                {visibleCols.keyword !== false && (
                  <TableCell style={stickyStyle(COLS[1]) as any}>
                    <button className="font-medium text-left hover:underline" style={{ color: TK.valueBlue, cursor: "pointer" }} onClick={()=> openAnalyzer(r.keyword)}>
                      {r.keyword}
                    </button>
                  </TableCell>
                )}
                {visibleCols.position !== false && (
                  <TableCell className="text-center">
                    <PositionCell pos={r.position} delta={r.delta} />
                  </TableCell>
                )}
                {visibleCols.serp !== false && (
                  <TableCell className="text-center">
                    <SerpBadgesCell items={r.serp} />
                  </TableCell>
                )}
                {visibleCols.traffic !== false && (
                  <TableCell className="text-right">{fmtNum(r.traffic)}</TableCell>
                )}
                {visibleCols.share !== false && (
                  <TableCell className="text-right">
                    <TrafficShareBar value={r.trafficShare} gated={!isPro} />
                  </TableCell>
                )}
                {visibleCols.volume !== false && (
                  <TableCell className="text-right">{fmtNum(r.volume)}</TableCell>
                )}
                {visibleCols.kd !== false && (
                  <TableCell className="text-center"><KDDot kd={r.kd} /></TableCell>
                )}
                {visibleCols.cpc !== false && (
                  <TableCell className="text-right">
                    {isPro ? (r.cpc == null ? "—" : `$${r.cpc.toFixed(2)}`) : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Pro</span>}
                  </TableCell>
                )}
                {visibleCols.page !== false && (
                  <TableCell>
                    {r.page ? (
                      <button className="underline" style={{ color: TK.valueBlue, cursor: "pointer" }} onClick={()=> openPage(r.page!)}>
                        {r.page.length > 40 ? `${r.page.slice(0,18)}…${r.page.slice(-18)}` : r.page}
                      </button>
                    ) : "—"}
                  </TableCell>
                )}
                {visibleCols.updated !== false && (
                  <TableCell>{new Date(r.lastCheckedAt).toLocaleDateString()}</TableCell>
                )}
                {visibleCols.actions !== false && (
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-[color:var(--wr-brand,#008CCD)] cursor-pointer" aria-label="Open SERP" onClick={()=> openSERP(r.keyword)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Open SERP snapshot</TooltipContent></Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-[color:var(--wr-brand,#008CCD)] cursor-pointer" aria-label="Open analyzer" onClick={()=> openAnalyzer(r.keyword)}>
                            <ChartNoAxesColumn className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Open analyzer</TooltipContent></Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Add to cluster" onClick={()=> addToCluster(r.keyword)}>
                            <Layers3 className="h-4 w-4"/>
                          </Button>
                        </TooltipTrigger><TooltipContent>Add to cluster</TooltipContent></Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Create task" onClick={()=> createTask([r.keyword])}>
                            <ClipboardList className="h-4 w-4"/>
                          </Button>
                        </TooltipTrigger><TooltipContent>Create task</TooltipContent></Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Add to tracking" onClick={()=> addToTracking([r.keyword])}>
                            <Target className="h-4 w-4"/>
                          </Button>
                        </TooltipTrigger><TooltipContent>Add to tracking</TooltipContent></Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Pagination removed by spec; table shows Top 5 only */}
    </section>
  );
}

/* ───────────────────────── Optional Demo Wrapper ───────────────────────── */
export function Demo_TopKeywordsSerpTable() {
  return (
    <>
      <TopKeywordsSerpTable isPro={false} />
    </>
  );
}
