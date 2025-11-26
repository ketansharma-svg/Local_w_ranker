"use client";

import * as React from "react";
import {
  Button,
} from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Info, Eye, ChartNoAxesColumn, Layers3, BookmarkPlus, ClipboardList, Target,
  Sparkles, SquareStack, Video, Image, MapPin, ShoppingCart, Newspaper, PanelsTopLeft,
  Download, ChevronsUpDown, ChevronUp, ChevronDown, ChevronRight,
} from "lucide-react";

/* ───────────────────────── Tokens (latest) ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "var(--wr-brand,#008CCD)",            // branded blue
  valueBlue: "var(--wr-value-blue,#0077FF)",
  ok: "var(--wr-success,#10B981)",
  warn: "var(--wr-warning,#F59E0B)",
  danger: "var(--wr-danger,#EF4444)",
};

/* ───────────────────────── Types ───────────────────────── */
type Plan = "free" | "pro";
type IntentFull = "informational" | "commercial" | "navigational" | "transactional";
type SerpFeature = "FS" | "PAA" | "Video" | "Images" | "Local" | "Shopping" | "News" | "Sitelinks";

type Row = {
  id: string;
  keyword: string;
  intent: IntentFull;
  rank: number | null;     // 1..100 or null
  delta?: number | "NEW";  // +/− vs last check or "NEW"
  volume?: number;
  kd: number;              // 0–100
  cpc?: number;            // USD
  serp: SerpFeature[];     // present features for this keyword
  page?: string | null;    // mapped URL
  updatedAt: string;       // ISO
  // Expanded-row data
  history?: number[];      // rank history (smaller is better)
  sfLinked?: number;       // how many features “linked”
  sfMissed?: number;       // missed (feature triggered but not linked to domain)
  notes?: Array<{ ts: string; text: string }>;
  selected?: boolean;
};

/* ───────────────────────── Mini atoms ───────────────────────── */
const INTENT: Record<IntentFull, { label: string; dot: string }> = {
  informational: { label: "Informational",  dot: TK.brand }, // branded for intent type
  commercial:    { label: "Commercial",     dot: TK.warn },
  navigational:  { label: "Navigational",   dot: "#14B8A6" },
  transactional: { label: "Transactional",  dot: TK.danger },
};

function kdBand(kd: number) {
  if (kd >= 75) return { label: "Very Difficult", color: TK.danger };
  if (kd >= 55) return { label: "Difficult", color: "#D97706" };
  if (kd >= 30) return { label: "Moderate", color: TK.warn };
  return { label: "Easy", color: TK.ok };
}

const KDDot: React.FC<{ kd: number }> = ({ kd }) => {
  const b = kdBand(kd);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs cursor-default">
            <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: b.color }} />
            <span>{kd}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Difficulty {kd} • {b.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const IntentBadge: React.FC<{ intent: IntentFull }> = ({ intent }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-xs cursor-default">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: INTENT[intent].dot }} />
          <span className="text-[11px] font-semibold">{INTENT[intent].label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{INTENT[intent].label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const SerpIcons: React.FC<{ features: SerpFeature[] }> = ({ features }) => (
  <div className="inline-flex items-center gap-2 text-muted-foreground">
    {/* Keep the same icons + colors as current design */}
    {features.includes("FS") && <TooltipProvider><Tooltip><TooltipTrigger asChild><Sparkles className="h-4 w-4 text-emerald-600" /></TooltipTrigger><TooltipContent>Featured Snippet</TooltipContent></Tooltip></TooltipProvider>}
    {features.includes("PAA") && <TooltipProvider><Tooltip><TooltipTrigger asChild><SquareStack className="h-4 w-4 text-blue-600" /></TooltipTrigger><TooltipContent>People Also Ask</TooltipContent></Tooltip></TooltipProvider>}
    {features.includes("Video") && <TooltipProvider><Tooltip><TooltipTrigger asChild><Video className="h-4 w-4 text-purple-600" /></TooltipTrigger><TooltipContent>Video</TooltipContent></Tooltip></TooltipProvider>}
    {features.includes("Images") && <TooltipProvider><Tooltip><TooltipTrigger asChild><Image className="h-4 w-4 text-amber-500" /></TooltipTrigger><TooltipContent>Image Pack</TooltipContent></Tooltip></TooltipProvider>}
    {features.includes("Local") && <TooltipProvider><Tooltip><TooltipTrigger asChild><MapPin className="h-4 w-4 text-rose-500" /></TooltipTrigger><TooltipContent>Local Pack</TooltipContent></Tooltip></TooltipProvider>}
    {features.includes("Shopping") && <TooltipProvider><Tooltip><TooltipTrigger asChild><ShoppingCart className="h-4 w-4 text-violet-600" /></TooltipTrigger><TooltipContent>Shopping</TooltipContent></Tooltip></TooltipProvider>}
    {features.includes("News") && <TooltipProvider><Tooltip><TooltipTrigger asChild><Newspaper className="h-4 w-4 text-red-500" /></TooltipTrigger><TooltipContent>Top Stories</TooltipContent></Tooltip></TooltipProvider>}
    {features.includes("Sitelinks") && <TooltipProvider><Tooltip><TooltipTrigger asChild><PanelsTopLeft className="h-4 w-4 text-cyan-600" /></TooltipTrigger><TooltipContent>Sitelinks</TooltipContent></Tooltip></TooltipProvider>}
  </div>
);

const KeywordLink: React.FC<{ children: React.ReactNode; onClick: () => void }> = ({ children, onClick }) => (
  <button
    className="font-medium cursor-pointer"
    style={{ color: TK.valueBlue, textDecoration: "none" }}
    onClick={onClick}
    onMouseEnter={(e)=>{ (e.currentTarget as HTMLElement).style.textDecoration = "underline"; }}
    onMouseLeave={(e)=>{ (e.currentTarget as HTMLElement).style.textDecoration = "none"; }}
  >
    {children}
  </button>
);

/* ───────────────────────── Utilities / demo ───────────────────────── */
const fmtNum = (n?: number) => n == null ? "—" : n.toLocaleString();
const idFor = (s: string) => "kw_" + s.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60);
function rand(min:number,max:number){return Math.floor(Math.random()*(max-min+1))+min;}
function sample<T>(arr:T[]){return arr[rand(0,arr.length-1)];}

const SERP_ALL: SerpFeature[] = ["FS","PAA","Video","Images","Local","Shopping","News","Sitelinks"];
const INTENTS: IntentFull[] = ["informational","commercial","navigational","transactional"];

function spark(n=24, base=30){
  return Array.from({length:n},(_,i)=> Math.max(1, Math.min(100, Math.round(
    base + Math.sin(i/6)*10 + (Math.random()*8 - 4)
  ))));
}

function makeRows(count=140): Row[] {
  const rows: Row[] = [];
  for (let i=0;i<count;i++){
    const kw = `best seo tool ${i+1}`;
    const kd = rand(10, 92);
    const rank = Math.random()>.15 ? rand(1, 100) : null;
    const delta = rank == null ? "NEW" as const : (Math.random()>.5 ? rand(1,6) : -rand(1,6));
    const serp = SERP_ALL.filter(()=> Math.random()>.6);
    rows.push({
      id: idFor(kw+i),
      keyword: kw,
      intent: sample(INTENTS),
      rank,
      delta,
      volume: Math.random()>.1 ? rand(80, 48000) : undefined,
      kd,
      cpc: Math.random()>.35 ? Number((Math.random()*7+0.2).toFixed(2)) : undefined,
      serp,
      page: Math.random()>.55 ? `/blog/seo-tool-${i+1}` : null,
      updatedAt: new Date(Date.now() - rand(0,20)*86400000).toISOString(),
      history: spark(24, rank ? 110 - rank : 35),
      sfLinked: rand(0, serp.length),
      sfMissed: Math.max(0, serp.length - rand(0, serp.length)),
      notes: Math.random()>.65 ? [
        { ts: new Date(Date.now() - rand(1,7)*86400000).toISOString(), text: "Assigned task: Improve snippet CTR" },
        { ts: new Date(Date.now() - rand(1,3)*86400000).toISOString(), text: "Added FAQ schema" },
      ] : [],
    });
  }
  return rows;
}

/* ───────────────────────── Smart popover sparkline ───────────────────────── */
const RankSpark: React.FC<{ data?: any }> = ({ data }) => {
  const W = 180, H = 56, pad = 6;
  const min = Math.min(...data), max = Math.max(...data);
  const xs = data.map((_, i) => i / (data.length - 1));
  const ys = data.map(v => max === min ? 0.5 : (v - min) / (max - min)); // 0→1
  const points = xs.map((x, i) => `${pad + x * (W - pad * 2)},${pad + ys[i] * (H - pad * 2)}`).join(" ");
  const area = `M ${pad},${H - pad} L ${points} L ${W - pad},${H - pad} Z`;
  const [hover, setHover] = React.useState<{x:number;y:number;idx:number}|null>(null);

  const ref = React.useRef<HTMLDivElement | null>(null);


  function onMove(e: React.MouseEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const nx = Math.max(pad, Math.min(W - pad, x));
    const ratio = (nx - pad) / (W - pad * 2);
    const idx = Math.round(ratio * (data.length - 1));
    setHover({ x, y, idx });
  }
  function onLeave() { setHover(null); }

  const cx = (i: number) => pad + xs[i] * (W - pad * 2);
  const cy = (i: number) => pad + ys[i] * (H - pad * 2);
  if (!data || data.length < 2) return <span className="text-xs text-muted-foreground">–</span>;
  return (
    <div ref={ref} className="relative inline-block">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="rounded bg-[rgba(0,119,255,.05)]"
           onMouseMove={onMove} onMouseLeave={onLeave}>
        <path d={area} fill="rgba(0,119,255,.18)" />
        <polyline points={points} fill="none" stroke={TK.valueBlue} strokeWidth={1.8} />
        {/* baseline */}
        <line x1={pad} x2={W-pad} y1={H-pad} y2={H-pad} stroke="#E5E7EB" strokeWidth={1} />
        {/* hover cursor & point */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={pad} y2={H-pad} stroke="rgba(17,24,39,.18)" strokeDasharray="3 3" />
            <circle cx={cx(hover.idx)} cy={cy(hover.idx)} r={3.5} fill={TK.valueBlue} />
          </>
        )}
      </svg>
      {/* Smart popover (colored dot + value) */}
      {hover && (
        <div
          className="absolute z-20 rounded-md border bg-white px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: Math.min(Math.max(0, hover.x + 10), W - 140),
            top: Math.max(0, hover.y + 10),
            borderColor: TK.border,
            fontFamily:
              'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
            pointerEvents: "none",
            width: 135
          }}
          role="tooltip"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px]" style={{ color: TK.muted }}>Check #{hover.idx + 1}</span>
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: TK.text }}>
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TK.valueBlue }} />
              Rank {data[hover.idx]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── Export helpers (CSV/PNG) ───────────────────────── */
function exportCsv(rows: Row[]) {
  const cols = ["keyword","intent","rank","delta","serp","volume","kd","cpc","page","updatedAt"];
  const header = cols.join(",");
  const lines = rows.map(r => [
    JSON.stringify(r.keyword),
    r.intent,
    r.rank ?? "",
    typeof r.delta === "number" ? (r.delta > 0 ? `+${r.delta}` : `${r.delta}`) : r.delta ?? "",
    r.serp.join("|"),
    r.volume ?? "",
    r.kd,
    r.cpc ?? "",
    r.page ?? "",
    r.updatedAt,
  ].join(","));
  const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "keywords.csv"; a.click(); URL.revokeObjectURL(a.href);
}

async function exportPNGFromTable(container: HTMLElement | null, filename = "keywords.png") {
  if (!container) return;
  const table = container.querySelector("table");
  if (!table) return;
  const wrapper = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${container.clientWidth}" height="${container.clientHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,system-ui;">
          ${container.outerHTML}
        </div>
      </foreignObject>
    </svg>`;
  const svg = new Blob([wrapper], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svg);
  const img = new window.Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = png; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ───────────────────────── Header Export Menu ───────────────────────── */
function ExportMenu({
  onCSV,
  onPNG,
  disabledCSV = false,
  disabledPNG = false,
}: {
  onCSV: () => void;
  onPNG: () => void;
  disabledCSV?: boolean;
  disabledPNG?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-8 px-3 cursor-pointer">
          <Download className="h-4 w-4 mr-1" color={TK.brand as string} />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px] z-[250]">
        <DropdownMenuLabel>Export Table</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={disabledPNG} onClick={onPNG}>PNG</DropdownMenuItem>
        <DropdownMenuItem disabled={disabledCSV} onClick={onCSV}>CSV</DropdownMenuItem>
        <DropdownMenuItem disabled className="text-gray-400">PDF (Pro Reports)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ───────────────────────── Main: Keywords Tab ───────────────────────── */
export default function KeywordsTab({
  plan = "pro",
  initialRows,
  onOpenAnalyzer,
}: {
  plan?: Plan;
  initialRows?: Row[];
  onOpenAnalyzer?: (kw: string) => void;
}) {
  const [rows, setRows] = React.useState<Row[]>(() => initialRows?.length ? initialRows : makeRows(160));
  const [search, setSearch] = React.useState("");
  const [kdBands, setKDBands] = React.useState<Array<"easy"|"moderate"|"difficult"|"very">>([]);
  const [intentFilters, setIntentFilters] = React.useState<IntentFull[]>([]);
  const [featureFilters, setFeatureFilters] = React.useState<SerpFeature[]>([]);
  const [sortBy, setSortBy] = React.useState<"keyword"|"rank"|"volume"|"kd"|"cpc"|"delta">("rank");
  const [sortDir, setSortDir] = React.useState<"asc"|"desc">("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const tableRef = React.useRef<HTMLDivElement>(null);

  // Filters
  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      if (search && !r.keyword.toLowerCase().includes(search.toLowerCase())) return false;
      if (kdBands.length) {
        const b = kdBand(r.kd);
        const map: Record<string,string> = { "Easy":"easy","Moderate":"moderate","Difficult":"difficult","Very Difficult":"very" };
        if (!kdBands.includes(map[b.label] as any)) return false;
      }
      if (intentFilters.length && !intentFilters.includes(r.intent)) return false;
      if (featureFilters.length && !featureFilters.every(f => r.serp.includes(f))) return false;
      return true;
    });
  }, [rows, search, kdBands, intentFilters, featureFilters]);

  // Sorting
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const val = (r: Row) => {
      switch (sortBy) {
        case "keyword": return r.keyword.toLowerCase();
        case "rank": return r.rank ?? 9999;
        case "volume": return r.volume ?? -1;
        case "kd": return r.kd;
        case "cpc": return r.cpc ?? -1;
        case "delta": return typeof r.delta === "number" ? r.delta : (r.delta === "NEW" ? -999 : 0);
      }
    };
    arr.sort((a,b) => {
      const av = val(a), bv = val(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Paging
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(()=> { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const windowRows = React.useMemo(()=> sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  const selectedCount = rows.filter(r => r.selected).length;
  const currentPageIds = windowRows.map(r => r.id);
  const pageAllSelected = currentPageIds.length > 0 && currentPageIds.every(id => rows.find(r=>r.id===id)?.selected);

  const toggleAll = () => {
    const checked = !pageAllSelected;
    setRows(prev => prev.map(r => currentPageIds.includes(r.id) ? ({ ...r, selected: checked }) : r));
  };

  function toggleSort(key: typeof sortBy) {
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else setSortDir(d => d === "asc" ? "desc" : "asc");
  }

  function openAnalyzer(kw: string) {
    if (onOpenAnalyzer) onOpenAnalyzer(kw);
    else alert(`Open Keyword Analyzer for: ${kw}`);
  }
  function openSERP(kw: string) { alert(`Open SERP snapshot for: ${kw}`); }
  function assignTask(kw: string) { alert(`Assign task for: ${kw}`); }
  function addToTracker(kw: string) { alert(`Add to Rank Tracker: ${kw}`); }

  // Modern chip
  const ChipBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> =
    ({ active, onClick, children }) => (
      <button
        className={`h-8 px-3 rounded-[8px] border text-sm cursor-pointer transition
                    ${active ? "ring-1 ring-[rgba(0,140,205,0.25)] bg-[rgba(0,140,205,0.08)] font-semibold" : "hover:bg-gray-50"}`}
        style={{ borderColor: TK.border, background: active ? "rgba(0,140,205,0.08)" : "#FFF", color: TK.text }}
        onClick={onClick}
        aria-pressed={active}
      >{children}</button>
    );

  return (
    <div
      className="space-y-3"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      <div className="rounded-md border bg-white" style={{ borderColor: TK.border }}>
        {/* Section header — branded icon + Export */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex items-center gap-2">
            <ChartNoAxesColumn className="h-5 w-5" color={TK.brand as string} />
            <h2 className="text-[16px] font-semibold" style={{ color: TK.text }}>Keywords</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="ml-1 h-4 w-4 text-[#9CA3AF]" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-xs">
                  Keywords mapped to this page. Use filters and chips to refine; expand any row for quick insights.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <ExportMenu
            onCSV={() => plan === "pro" ? exportCsv(sorted) : undefined}
            onPNG={() => plan === "pro" ? exportPNGFromTable(tableRef.current!, "keywords.png") : undefined}
            disabledCSV={plan === "free"}
            disabledPNG={plan === "free"}
          />
        </div>

        {/* Controls (modern chips/buttons) */}
        <div className="p-3 px-4 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Input className="w-[280px] pl-7" placeholder="Search keyword…" value={search} onChange={(e)=> setSearch(e.target.value)} />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
            </div>

            {/* KD bands */}
            {(["easy","moderate","difficult","very"] as const).map(b => {
              const active = kdBands.includes(b);
              const label = b === "easy" ? "KD Easy" : b === "moderate" ? "KD Moderate" : b === "difficult" ? "KD Difficult" : "KD Very";
              const color = b === "very" ? TK.danger : b === "difficult" ? "#D97706" : b === "moderate" ? TK.warn : TK.ok;
              return (
                <ChipBtn key={b} active={active} onClick={()=> setKDBands(active ? kdBands.filter(x=>x!==b) : [...kdBands, b])}>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
                    {label}
                  </span>
                </ChipBtn>
              );
            })}

            {/* Intent filters */}
            {(["informational","commercial","navigational","transactional"] as IntentFull[]).map(iv => {
              const active = intentFilters.includes(iv);
              return (
                <ChipBtn key={iv} active={active} onClick={()=> setIntentFilters(active ? intentFilters.filter(i=>i!==iv) : [...intentFilters, iv])}>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: INTENT[iv].dot }} />
                    {INTENT[iv].label}
                  </span>
                </ChipBtn>
              );
            })}

            {/* Feature chips (compact) */}
            {(["FS","PAA","Local","Video"] as SerpFeature[]).map(f => {
              const active = featureFilters.includes(f);
              return (
                <ChipBtn key={f} active={active} onClick={()=> setFeatureFilters(active ? featureFilters.filter(x=>x!==f) : [...featureFilters, f])}>
                  {f}
                </ChipBtn>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 px-3 w-[120px] cursor-pointer">
                  <SelectValue placeholder="Rows / page" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[240]">
                  {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk bar */}
          {selectedCount > 0 && (
            <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
              <span className="text-sm"><strong>{selectedCount}</strong> selected</span>
              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=> alert("Create Task (bulk)")}>
                <ClipboardList className="h-4 w-4 mr-1" color={TK.brand as string} /> Create Task
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=> alert("Add to Tracking (bulk)")}>
                <Target className="h-4 w-4 mr-1" color={TK.brand as string} /> Add to Tracking
              </Button>
              <div className="ml-auto">
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={()=> setRows(prev => prev.map(r => ({ ...r, selected:false })))}>Clear</Button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div ref={tableRef} className="max-h-[640px] overflow-auto">
          <Table className="text-sm">
            <TableHeader className="bg-white sticky top-0 z-40" style={{ boxShadow: "inset 0 -1px 0 var(--wr-borderLight,#EFF0F6)" }}>
              <TableRow>
                <TableHead style={{ width: 40 }} className="text-center">
                  <Checkbox checked={pageAllSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead style={{ width: 36 }} />
                <TableHead className="min-w-[320px]">
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("keyword")}>
                    <span>Keyword</span>
                    {sortBy === "keyword" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>
                <TableHead style={{ width: 150 }} className="text-center">Intent</TableHead>
                <TableHead style={{ width: 120 }} className="text-right">
                  <span className="inline-flex items-center gap-1">
                    Pos.
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" /></TooltipTrigger><TooltipContent className="text-xs">Current Google rank (device/country scoped)</TooltipContent></Tooltip></TooltipProvider>
                  </span>
                </TableHead>
                <TableHead style={{ width: 70 }} className="text-center">Δ</TableHead>
                <TableHead style={{ width: 160 }} className="text-center">
                  <span className="inline-flex items-center gap-1">
                    SF
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" /></TooltipTrigger><TooltipContent className="text-xs">SERP features present for this query</TooltipContent></Tooltip></TooltipProvider>
                  </span>
                </TableHead>
                <TableHead style={{ width: 110 }} className="text-right">Vol.</TableHead>
                <TableHead style={{ width: 110 }} className="text-center">KD</TableHead>
                <TableHead style={{ width: 110 }} className="text-right">CPC</TableHead>
                <TableHead style={{ minWidth: 240 }}>Page</TableHead>
                <TableHead style={{ width: 210 }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {windowRows.map(r => {
                const isOpen = !!expanded[r.id];
                return (
                  <React.Fragment key={r.id}>
                    <TableRow className="hover:bg-[#F8FAFC]">
                      <TableCell className="text-center">
                        <Checkbox
                          checked={!!r.selected}
                          onCheckedChange={(v)=> setRows(prev => prev.map(x => x.id === r.id ? ({ ...x, selected: Boolean(v) }) : x))}
                        />
                      </TableCell>

                      <TableCell>
                        <button
                          className="inline-flex items-center justify-center h-6 w-6 rounded border cursor-pointer"
                          style={{ borderColor: TK.border }}
                          onClick={()=> setExpanded(s => ({ ...s, [r.id]: !s[r.id] }))}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Collapse row" : "Expand row"}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </TableCell>

                      <TableCell>
                        <KeywordLink onClick={()=> openAnalyzer(r.keyword)}>{r.keyword}</KeywordLink>
                      </TableCell>

                      <TableCell className="text-center">
                        <IntentBadge intent={r.intent} />
                      </TableCell>

                      <TableCell className="text-right">
                        {r.rank ?? "—"}
                      </TableCell>

                      <TableCell className="text-center">
                        {r.delta === "NEW" ? (
                          <span className="text-[11px] px-1.5 py-0.5 rounded border text-[color:var(--wr-brand,#008CCD)]" style={{ borderColor: "#D9EEF8", background: "#F0FAFF" }}>NEW</span>
                        ) : typeof r.delta === "number" ? (
                          <span className={`inline-flex items-center gap-1 ${r.delta > 0 ? "text-green-600" : r.delta < 0 ? "text-red-600" : "text-gray-500"}`}>
                            {r.delta > 0 ? "▲" : r.delta < 0 ? "▼" : "—"}{Math.abs(r.delta)}
                          </span>
                        ) : "—"}
                      </TableCell>

                      <TableCell className="text-center">
                        <SerpIcons features={r.serp} />
                      </TableCell>

                      <TableCell className="text-right">{fmtNum(r.volume)}</TableCell>
                      <TableCell className="text-center"><KDDot kd={r.kd} /></TableCell>
                      <TableCell className="text-right">{r.cpc == null ? "—" : `$${r.cpc.toFixed(2)}`}</TableCell>

                      <TableCell>
                        {r.page ? (
                          <a href={r.page} className="underline cursor-pointer" style={{ color: TK.valueBlue }} title={r.page}>
                            {r.page.length > 48 ? r.page.replace(/\/([^\/]{16})[^\/]*\//, "/$1…/") : r.page}
                          </a>
                        ) : "—"}
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-1.5">
                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Open SERP" onClick={()=> openSERP(r.keyword)}>
                                <Eye className="h-4 w-4" color={TK.brand as string} />
                              </Button>
                            </TooltipTrigger><TooltipContent>Open SERP snapshot</TooltipContent></Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Open analyzer" onClick={()=> openAnalyzer(r.keyword)}>
                                <ChartNoAxesColumn className="h-4 w-4" color={TK.brand as string} />
                              </Button>
                            </TooltipTrigger><TooltipContent>Open analyzer</TooltipContent></Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Add to cluster" onClick={()=> alert(`Add to cluster: ${r.keyword}`)}>
                                <Layers3 className="h-4 w-4" color={TK.brand as string}/>
                              </Button>
                            </TooltipTrigger><TooltipContent>Add to cluster</TooltipContent></Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Save to list" onClick={()=> alert(`Save to list: ${r.keyword}`)}>
                                <BookmarkPlus className="h-4 w-4" color={TK.brand as string}/>
                              </Button>
                            </TooltipTrigger><TooltipContent>Save to list</TooltipContent></Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Create task" onClick={()=> assignTask(r.keyword)}>
                                <ClipboardList className="h-4 w-4" color={TK.brand as string}/>
                              </Button>
                            </TooltipTrigger><TooltipContent>Create task</TooltipContent></Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Add to tracking" onClick={()=> addToTracker(r.keyword)}>
                                <Target className="h-4 w-4" color={TK.brand as string}/>
                              </Button>
                            </TooltipTrigger><TooltipContent>Add to tracking</TooltipContent></Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded row — includes smart popover chart */}
                    {isOpen && (
                      <TableRow className="bg-[#FBFDFF]">
                        <TableCell colSpan={12}>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-3">
                            {/* Rank history with smart popover */}
                            <div className="rounded-md border p-3" style={{ borderColor: TK.borderLight }}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold">Rank History (last 24 checks)</div>
                                <span className="text-xs text-muted-foreground">Updated {new Date(r.updatedAt).toLocaleDateString()}</span>
                              </div>
                              <RankSpark data={r.history} />
                              <div className="mt-2 text-xs" style={{ color: TK.muted }}>
                                Hover to see exact values. Lower is better.
                              </div>
                            </div>

                            {/* SERP Features breakdown (keep current visuals) */}
                            <div className="rounded-md border p-3" style={{ borderColor: TK.borderLight }}>
                              <div className="text-sm font-semibold mb-2">SERP Features — Linked vs Missed</div>
                              <div className="flex items-center gap-4">
                                <div className="flex-1">
                                  <div className="text-xs text-muted-foreground mb-1">Linked</div>
                                  <div className="inline-flex items-center gap-2">
                                    <span className="inline-block h-2.5 w-28 rounded bg-emerald-100 relative overflow-hidden">
                                      <span className="absolute left-0 top-0 h-full bg-emerald-500" style={{ width: `${Math.min(100, (r.sfLinked ?? 0) * 20)}%` }} />
                                    </span>
                                    <span className="text-sm font-medium text-emerald-600">{r.sfLinked ?? 0}</span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs text-muted-foreground mb-1">Missed</div>
                                  <div className="inline-flex items-center gap-2">
                                    <span className="inline-block h-2.5 w-28 rounded bg-rose-100 relative overflow-hidden">
                                      <span className="absolute left-0 top-0 h-full bg-rose-500" style={{ width: `${Math.min(100, (r.sfMissed ?? 0) * 20)}%` }} />
                                    </span>
                                    <span className="text-sm font-medium text-rose-600">{r.sfMissed ?? 0}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 text-sm">
                                <SerpIcons features={r.serp} />
                              </div>
                              <div className="mt-2 text-xs" style={{ color: TK.muted }}>
                                Hover icons above in the main row for feature names.
                              </div>
                            </div>

                            {/* Activity log + quick actions */}
                            <div className="rounded-md border p-3" style={{ borderColor: TK.borderLight }}>
                              <div className="text-sm font-semibold mb-2">Notes & Activity</div>
                              {r.notes && r.notes.length ? (
                                <ul className="space-y-2">
                                  {r.notes.map((n, i) => (
                                    <li key={i} className="text-sm">
                                      <span className="text-xs text-muted-foreground mr-2">{new Date(n.ts).toLocaleDateString()}</span>
                                      {n.text}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-xs" style={{ color: TK.muted }}>No notes yet.</div>
                              )}
                              <div className="mt-3 flex items-center gap-2">
                                <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=> assignTask(r.keyword)}><ClipboardList className="h-4 w-4 mr-1" color={TK.brand as string} /> Create Task</Button>
                                <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=> addToTracker(r.keyword)}><Target className="h-4 w-4 mr-1" color={TK.brand as string} /> Track</Button>
                                <Button size="sm" className="cursor-pointer" onClick={()=> openAnalyzer(r.keyword)}><ChartNoAxesColumn className="h-4 w-4 mr-1" color={TK.brand as string} /> Open Analyzer</Button>
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
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm" style={{ color: TK.muted }}>
            Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + windowRows.length)} of {sorted.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page<=1} onClick={()=>setPage(1)}>First</Button>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
            <div className="text-sm w-16 text-center">{page} / {totalPages}</div>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page>=totalPages} onClick={()=>setPage(totalPages)}>Last</Button>
            <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 px-3 w-[120px] cursor-pointer"><SelectValue placeholder="Rows / page" /></SelectTrigger>
              <SelectContent position="popper" className="z-[240]">
                {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Optional demo wrapper */
export function Demo_KeywordsTab() {
  return (
    <div className="mx-auto max-w-6xl p-6" style={{ background: "#F5F7FA" }}>
      <div className="mb-3 text-[15px] font-semibold">Tab 2: Keywords — Full Portfolio</div>
      <KeywordsTab plan="pro" />
    </div>
  );
}

