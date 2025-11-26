"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown,
  SlidersHorizontal, Download, Search as SearchIcon, Info,
  ClipboardList, ExternalLink, AlertCircle, CheckCircle2
} from "lucide-react";
import DemoDrawerHeaderPage from "../landing/drawer/DemoDrawerHeaderPage";


/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",         // brand color
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#E94134",
  pastelBlue: "var(--wr-pastelBlue, #D9EEF8)",
  radius: "6px",
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';


/* ───────────────────────── Types & helpers ───────────────────────── */
type Point = { date: string; clicks: number; avgPosition: number };
type StatusFlag = "Low CTR" | "Rank Plateau" | "No Clicks" | "—";


type Row = {
  id: string;
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number;           // 0..1
  avgPosition: number;   // 1..100
  topQuery: string;
  series: Point[];
  status: StatusFlag;
};


function midEllipsis(url: string, max = 46) {
  if (url.length <= max) return url;
  const half = Math.floor((max - 3) / 2);
  return url.slice(0, half) + "..." + url.slice(-half);
}
function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}
const pct = (v: number, digits = 2) => `${(v * 100).toFixed(digits)}%`;


/* ───────────────────────── Demo data generator ───────────────────────── */
function makeSeries(): Point[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getTime() - (29 - i) * 86400000);
    const clicks = Math.max(0, Math.round(25 + 60 * Math.random() + (i - 15) * 1.1));
    const avgPosition = Math.max(2, Math.min(40, 12 + (Math.random() - 0.5) * 8 + (15 - i) * 0.02));
    return { date: d.toISOString().slice(0, 10), clicks, avgPosition };
  });
}


function detectStatus(clicks: number, impressions: number, ctr: number, avgPosition: number, s: Point[]): StatusFlag {
  if (avgPosition < 10 && ctr < 0.025) return "Low CTR";
  if (impressions > 1000 && clicks === 0) return "No Clicks";
  const n = s.length;
  if (n >= 20) {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const last10 = avg(s.slice(n - 10).map(p => p.avgPosition));
    const prev10 = avg(s.slice(n - 20, n - 10).map(p => p.avgPosition));
    if (Math.abs(prev10 - last10) < 0.2) return "Rank Plateau";
  }
  return "—";
}


function makeRows(n = 80): Row[] {
  const sampleQueries = [
    "best seo company", "w3era company", "keyword checker tool", "technical seo checklist",
    "seo services", "google algorithm news", "on-page seo guide", "link building ideas",
    "meta title tips", "schema markup how-to"
  ];
  return Array.from({ length: n }, (_, i) => {
    const baseImpr = Math.round(1500 + Math.random() * 55000);
    const ctr = 0.012 + Math.random() * 0.065;
    const clicks = Math.round(baseImpr * ctr);
    const pos = Number((3 + Math.random() * 18).toFixed(1));
    const s = makeSeries();
    const url =
      i % 7 === 0 ? `/seo-services/` :
      i % 5 === 0 ? `/about-us` :
      i % 3 === 0 ? `/tools/keyword-checker` :
      i % 4 === 0 ? `/blog/google-alg-updates` :
      `/blog/insight-${i}/`;
    const tq = sampleQueries[i % sampleQueries.length];
    return {
      id: `pg-${i + 1}`,
      pageUrl: url,
      clicks,
      impressions: baseImpr,
      ctr,
      avgPosition: pos,
      topQuery: tq,
      series: s,
      status: detectStatus(clicks, baseImpr, ctr, pos, s),
    };
  });
}


/* ───────────────────────── Small UI helpers ───────────────────────── */
const HeaderTip: React.FC<{ tip: string; children: React.ReactNode }> = ({ tip, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1">
          {children}
          <Info className="h-3.5 w-3.5 text-[#9E9E9E]" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs">{tip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);


const StatusChip: React.FC<{ flag: StatusFlag }> = ({ flag }) => {
  if (flag === "—") return <span className="text-xs text-muted-foreground">—</span>;
  const palette = flag === "Low CTR" ? TK.critical : flag === "Rank Plateau" ? TK.warn : TK.ok;
  const Icon = flag === "Low CTR" ? AlertCircle : flag === "Rank Plateau" ? AlertCircle : CheckCircle2;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
      style={{ color: palette, border: `1px solid ${TK.borderLight}` }}
    >
      <Icon className="h-3.5 w-3.5" /> {flag}
    </span>
  );
};


/* ───────────────────────── Mini chart (Clicks bars + Avg Pos line) ───────────────────────── */
const MiniPerfBars: React.FC<{ series: Point[] }> = ({ series }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<{
    i: number; x: number; yClicks: number; yPos: number; mxPx: number; myPx: number; contW: number; contH: number
  } | null>(null);


  const W = 800, H = 180, pad = { l: 44, r: 44, t: 16, b: 32 };
  const n = series.length;
  const width = W - pad.l - pad.r;
  const height = H - pad.t - pad.b;
  const barW = width / Math.max(1, n);


  const maxClicks = Math.max(1, ...series.map(d => d.clicks));
  const minPos = Math.min(...series.map(d => d.avgPosition));
  const maxPos = Math.max(...series.map(d => d.avgPosition));


  const xFor = (i: number) => pad.l + i * barW;
  const yForClicks = (v: number) => pad.t + (1 - v / maxClicks) * height;
  const yForPos = (p: number) => {
    const span = Math.max(1e-6, maxPos - minPos);
    return pad.t + ((p - minPos) / span) * height;
  };


  const lineD = series.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i) + barW / 2} ${yForPos(d.avgPosition)}`).join(" ");


  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mxPx = e.clientX - rect.left;
    const myPx = e.clientY - rect.top;
    const scaleX = W / rect.width;
    const mxVb = mxPx * scaleX;
    const rx = mxVb - pad.l;
    const idx = Math.max(0, Math.min(n - 1, Math.floor(rx / barW)));
    const x = xFor(idx) + barW / 2;
    setHover({
      i: idx, x,
      yClicks: yForClicks(series[idx].clicks),
      yPos: yForPos(series[idx].avgPosition),
      mxPx, myPx, contW: rect.width, contH: rect.height
    });
  };


  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const tipOnRight = hover ? hover.mxPx < (hover.contW / 2) : true;
  const tipOffset = 10;
  const tipLeftPx = hover ? (tipOnRight ? hover.mxPx + tipOffset : hover.mxPx - tipOffset) : 0;
  const tipTopPx = hover ? hover.myPx - 18 : 0;
  const tipLeft = hover ? clamp(tipLeftPx, 8, hover.contW - 8) : 0;
  const tipTop = hover ? clamp(tipTopPx, 8, hover.contH - 28) : 0;
  const tipTransform = tipOnRight ? "translateX(0)" : "translateX(-100%)";


  return (
    <div className="relative" style={{ fontFamily: FONT_STACK }}>
      <svg
        ref={svgRef}
        width="100%" height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="30 days Clicks (bars) + Avg Position (line)"
      >
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke={TK.borderLight} />
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} stroke={TK.borderLight} />
        <line x1={W - pad.r} x2={W - pad.r} y1={pad.t} y2={H - pad.b} stroke={TK.borderLight} />


        {/* Bars: brand color */}
        {series.map((d, i) => {
          const x = xFor(i) + 3;
          const y = yForClicks(d.clicks);
          const w = Math.max(2, barW - 6);
          const h = Math.max(0, H - pad.b - y);
          return <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill={TK.brand} />;
        })}


        {/* Line: Avg Position */}
        <path d={lineD} fill="none" stroke={TK.ok} strokeWidth={2} />
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={pad.t} y2={H - pad.b} stroke={TK.border} />
            <circle cx={hover.x} cy={hover.yPos} r="3.5" fill={TK.ok} />
          </>
        )}


        {/* Axis labels (light) */}
        <text x={pad.l - 6} y={H - pad.b + 12} textAnchor="end" fontSize="10" fill={TK.muted}>0</text>
        <text x={pad.l - 6} y={pad.t + 3} textAnchor="end" fontSize="10" fill={TK.muted}>{Math.max(...series.map(d => d.clicks)).toLocaleString()}</text>
        <text x={W - pad.r + 6} y={H - pad.b + 12} textAnchor="start" fontSize="10" fill={TK.muted}>{Math.min(...series.map(d => d.avgPosition)).toFixed(0)}</text>
        <text x={W - pad.r + 6} y={pad.t + 3} textAnchor="start" fontSize="10" fill={TK.muted}>{Math.max(...series.map(d => d.avgPosition)).toFixed(0)}</text>
        <text x={pad.l} y={H - pad.b + 22} textAnchor="start" fontSize="10" fill={TK.muted}>{series[0]?.date}</text>
        <text x={W - pad.r} y={H - pad.b + 22} textAnchor="end" fontSize="10" fill={TK.muted}>{series[n - 1]?.date}</text>


        {/* hover area */}
        <rect
          x={pad.l} y={pad.t} width={width} height={height} fill="transparent"
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "crosshair" }}
        />
      </svg>


      {/* Smart popover with colored dots for metric types */}
      {hover && (
        <div
          className="absolute rounded px-2 py-1 text-xs"
          style={{
            left: `${tipLeft}px`,
            top: `${tipTop}px`,
            transform: tipTransform,
            background: "#fff",
            color: TK.text,
            border: `1px solid ${TK.border}`,
            boxShadow: "0 6px 20px rgba(0,0,0,.12)",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <div className="font-medium mb-0.5">{series[hover.i].date}</div>
          <div className="grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 items-center">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: TK.brand }} />
              Clicks
            </span>
            <span className="tabular-nums">{series[hover.i].clicks.toLocaleString()}</span>


            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: TK.ok }} />
              Avg. Position
            </span>
            <span className="tabular-nums">{series[hover.i].avgPosition.toFixed(1)}</span>
          </div>
        </div>
      )}


      <div className="text-xs text-muted-foreground mt-1">
        30‑day <b>Clicks</b> (bars) + <b>Avg. Position</b> (line). Hover to inspect.
      </div>
    </div>
  );
};


/* ───────────────────────── Columns ───────────────────────── */
type ColKey =
  | "select" | "expander" | "url"
  | "clicks" | "impr" | "ctr" | "pos" | "topQuery" | "status" | "actions";


type ColDef = { key: ColKey; label: string; width?: number; sortable?: boolean; sticky?: boolean; tip?: string };


const COLS: ColDef[] = [
  { key: "select", label: "", width: 46, sticky: true },
  { key: "expander", label: "", width: 44, sticky: true },
  { key: "url", label: "Page URL", width: 340, sortable: true, sticky: true, tip: "Search landing page (slug). Click to open Page Detail." },
  { key: "clicks", label: "Clicks", width: 120, sortable: true, tip: "Organic clicks from Google Search (GSC)." },
  { key: "impr", label: "Impressions", width: 140, sortable: true, tip: "Times shown in Google search (GSC)." },
  { key: "ctr", label: "CTR (%)", width: 120, sortable: true, tip: "Clicks ÷ Impressions × 100 (GSC)." },
  { key: "pos", label: "Avg. Position", width: 140, sortable: true, tip: "Average ranking across queries for this page (GSC)." },
  { key: "topQuery", label: "Top Query", width: 240, sortable: true, tip: "Keyword with the most impressions for this page." },
  { key: "status", label: "Status", width: 160, sortable: true, tip: "Smart flags: Low CTR, Rank Plateau, No Clicks." },
  { key: "actions", label: "Actions", width: 160, tip: "Page Analyzer, Task Drawer." },
];


/* ───────────────────────── Component ───────────────────────── */
export default function PageLevelSearchInsightsSection() {
  /* Data */
  const [rows] = useState<Row[]>(() => makeRows(100));


  /* Visible columns */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>)
  );


  /* Sorting */
  const [sortBy, setSortBy] = useState<ColKey>("impr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    if (!COLS.find(c => c.key === key)?.sortable) return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };
  const headerSortIcon = (key: ColKey) =>
    sortBy === key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
    : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;


  /* Selection & expansion */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded(s => ({ ...s, [id]: !s[id] }));


  /* Filters (keep design as-is) */
  const [urlContains, setUrlContains] = useState("");
  const [queryContains, setQueryContains] = useState("");
  const [ctrRange, setCtrRange] = useState<[number, number]>([0, 10]); // %
  const [posRange, setPosRange] = useState<[number, number]>([1, 50]);
  const [page2plus, setPage2plus] = useState(false);
  useEffect(() => { if (page2plus) setPosRange(([min, max]) => [Math.max(10.01, min), max]); }, [page2plus]);


  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);


  /* Filtered */
  const filtered = useMemo(() => {
    const [minCtr, maxCtr] = ctrRange;
    const [minPos, maxPos] = posRange;
    return rows.filter(r => {
      if (urlContains && !r.pageUrl.toLowerCase().includes(urlContains.toLowerCase())) return false;
      if (queryContains && !r.topQuery.toLowerCase().includes(queryContains.toLowerCase())) return false;
      const ctrPct = r.ctr * 100;
      if (ctrPct < minCtr - 1e-8 || ctrPct > maxCtr + 1e-8) return false;
      if (r.avgPosition < minPos - 1e-8 || r.avgPosition > maxPos + 1e-8) return false;
      return true;
    });
  }, [rows, urlContains, queryContains, ctrRange, posRange]);


  /* Sorted */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: Row): any => {
      switch (sortBy) {
        case "url": return r.pageUrl;
        case "clicks": return r.clicks;
        case "impr": return r.impressions;
        case "ctr": return r.ctr;
        case "pos": return r.avgPosition;
        case "topQuery": return r.topQuery;
        case "status": return r.status;
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a), bv = getter(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);


  /* Page window */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const windowRows = useMemo(() => sorted.slice(pageStart, pageStart + pageSize), [sorted, pageStart, pageSize]);


  /* Page ids & selection helpers */
  const pageIds = useMemo(() => windowRows.map(r => r.id), [windowRows]);
  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);
  const pageSelectedIds = useMemo(() => pageIds.filter(id => selected[id]), [pageIds, selected]);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected[id]);
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setSelected(prev => {
      const next = { ...prev } as Record<string, boolean>;
      pageIds.forEach(id => { next[id] = checked; });
      return next;
    });
  };


  /* Visible columns */
  const VISIBLE = useMemo(() => COLS.filter(c => visibleCols[c.key] !== false), [visibleCols]);


  /* Export CSV (respects visible cols; excludes select/expander/actions) */
  const exportCSV = (onlySelected = false) => {
    const headers = VISIBLE
      .filter(c => !["select","expander","actions"].includes(c.key))
      .map(c => c.label);
    const mapVal = (r: Row, key: ColKey) => {
      switch (key) {
        case "url": return r.pageUrl;
        case "clicks": return r.clicks;
        case "impr": return r.impressions;
        case "ctr": return (r.ctr * 100).toFixed(2) + "%";
        case "pos": return r.avgPosition;
        case "topQuery": return r.topQuery;
        case "status": return r.status;
        default: return "";
      }
    };
    const src = onlySelected ? sorted.filter(r => selected[r.id]) : sorted;
    const rowsCsv = src.map(r =>
      VISIBLE
        .filter(c => !["select","expander","actions"].includes(c.key))
        .map(c => JSON.stringify(mapVal(r, c.key)))
        .join(",")
    );
    const csv = [headers.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "page-level-search-insights-selected.csv" : "page-level-search-insights.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };


  /* Styles */
  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? {
          position: "sticky" as const,
          left:
            c.key === "select" ? 0 :
            c.key === "expander" ? 46 :
            c.key === "url" ? 90 : 0,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)"
        }
      : undefined;


  /* Bulk bar anchor: index of the first selected row in the current page */
  const bulkAnchorIdx = useMemo(
    () => windowRows.findIndex(r => !!selected[r.id]),
    [windowRows, selected]
  );

  const [drawerRoww, setDrawerRoww] = useState(false);
  const openDrawer = () => {
    setDrawerRoww(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRoww(false);
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
    <section className="space-y-3 mt-4" style={{ fontFamily: FONT_STACK }}>
                              {drawerRoww && (
                              <Drawer title="Drawer" onClose={closeDrawer}>
                                 <DemoDrawerHeaderPage   />
                              </Drawer>
                               )}
      <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* ─ Header bar ─ */}
        <CardHeader
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <CardTitle className="text-lg flex items-center gap-2" style={{ color: TK.text }}>
            <SearchIcon className="h-5 w-5" style={{ color: TK.brand }} />
            Page‑Level Search Insights
          </CardTitle>


          <div className="flex items-center gap-2 flex-wrap">
            {/* Columns control (unchanged) */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
                  style={{ borderColor: TK.borderLight, cursor: "pointer" }}
                >
                  <SlidersHorizontal className="h-4 w-4" style={{ color: TK.brand }} />
                  Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {COLS.map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={c.key === "select" || c.key === "expander" || c.key === "url"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [c.key]: Boolean(v) }))}
                      />
                      <span>{c.label || c.key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" style={{ cursor: "pointer" }}>
                    Reset
                  </Button>
                  <Button size="sm" style={{ background: TK.brand, color: "#fff", cursor: "pointer" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>


            {/* Export button (kept simple per guidance) */}
            <Button
              variant="outline"
              className="h-8 px-3"
              onClick={() => exportCSV(false)}
              style={{ cursor: "pointer" }}
            >
              <Download className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Export CSV
            </Button>
          </div>
        </CardHeader>


        {/* ─ Filter bar (design unchanged) ─ */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* URL contains */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[280px] pl-7" placeholder="URL contains…" value={urlContains}
                onChange={(e)=>{ setUrlContains(e.target.value); setPage(1); }} />
            </div>


            {/* Top Query contains */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[260px] pl-7" placeholder="Top Query contains…" value={queryContains}
                onChange={(e)=>{ setQueryContains(e.target.value); setPage(1); }} />
            </div>


            {/* CTR range (0–10%) */}
            <div className="flex items-center gap-2 ml-1">
              <span className="text-sm text-muted-foreground">CTR</span>
              <div className="w-[160px]">
                <Slider value={ctrRange as unknown as number[]} min={0} max={10} step={0.1}
                  onValueChange={(v:any)=>{ setCtrRange([v[0], v[1]]); setPage(1); }} />
              </div>
              <span className="text-sm w-[82px]">{ctrRange[0].toFixed(1)}% – {ctrRange[1].toFixed(1)}%</span>
            </div>


            {/* Position range (1–50) */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Position</span>
              <div className="w-[180px]">
                <Slider value={posRange as unknown as number[]} min={1} max={50} step={0.5}
                  onValueChange={(v:any)=>{ setPosRange([v[0], v[1]]); setPage(1); }} />
              </div>
              <span className="text-sm w-[82px]">{posRange[0].toFixed(1)} – {posRange[1].toFixed(1)}</span>
            </div>


            {/* Quick pill: Page 2+ */}
            <button
              onClick={() => { setPage2plus(v => !v); if (!page2plus) setPosRange(([_, max]) => [10.01, max]); }}
              className={`h-8 px-3 rounded-full border text-sm ${page2plus ? "font-semibold" : ""}`}
              style={{ borderColor: TK.borderLight, background: page2plus ? TK.pastelBlue : "#fff", cursor: "pointer" }}
            >
              Page 2+ (Pos &gt; 10)
            </button>


            {/* Rows per page (right) */}
            <div className="ml-auto flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                <SelectContent>
                  {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(1)} style={{ cursor: "pointer" }}>First</Button>
              <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} style={{ cursor: "pointer" }}>Prev</Button>
              <div className="text-sm w-16 text-center">{page} / {totalPages}</div>
              <Button variant="outline" className="h-8 px-3" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} style={{ cursor: "pointer" }}>Next</Button>
              <Button variant="outline" className="h-8 px-3" disabled={page>=totalPages} onClick={()=>setPage(totalPages)} style={{ cursor: "pointer" }}>Last</Button>
            </div>
          </div>
        </CardContent>


        {/* ─ Table ─ */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white">
                <TableRow className="hover:bg-white">
                  {VISIBLE.map(c => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }}
                      className="text-left"
                    >
                      {c.key === "select" ? (
                        <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                      ) : c.sortable ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={()=>toggleSort(c.key)}
                          style={{ cursor: "pointer" }}
                        >
                          <HeaderTip tip={c.tip ?? ""}><span>{c.label}</span></HeaderTip>
                          {headerSortIcon(c.key)}
                        </button>
                      ) : (
                        <HeaderTip tip={c.tip ?? ""}><span>{c.label}</span></HeaderTip>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>


              <TableBody>
                {/* Bulk bar inserted just above the first selected row (in current page) */}
                {windowRows.map((r, idx) => {
                  const ctrPct = r.ctr * 100;
                  const lowCtr = r.avgPosition < 10 && ctrPct < 2.5;
                  const topQueryImprEst = Math.round(r.impressions * (0.25 + Math.random() * 0.5));
                  const isAnchor = pageSelectedIds.length > 0 && idx === bulkAnchorIdx;


                  return (
                    <React.Fragment key={r.id}>
                      {isAnchor && (
                        <TableRow>
                          <TableCell colSpan={VISIBLE.length} className="p-0">
                            <div
                              className="w-full p-2 flex items-center gap-2"
                              style={{
                                borderTop: `1px solid ${TK.borderLight}`,
                                borderBottom: `1px solid ${TK.borderLight}`,
                                background: "#F5F7FA",
                              }}
                            >
                              <span className="text-sm">
                                <strong>{pageSelectedIds.length}</strong> selected on this page
                              </span>
                              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
                              <button
                                className="text-sm inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-white"
                                onClick={() => alert("Create Task for selected")}
                                style={{ color: TK.text, cursor: "pointer" }}
                              >
                                <ClipboardList className="h-4 w-4" style={{ color: TK.brand }} />
                                Create Task
                              </button>
                              <button
                                className="text-sm inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-white"
                                onClick={() => exportCSV(true)}
                                style={{ color: TK.text, cursor: "pointer" }}
                              >
                                <Download className="h-4 w-4" style={{ color: TK.brand }} />
                                Export Selected
                              </button>
                              <div className="ml-auto">
                                <button
                                  className="text-sm px-2 py-1 rounded hover:bg-white"
                                  onClick={() => setSelected(prev => {
                                    const next = { ...prev };
                                    pageSelectedIds.forEach(id => delete next[id]);
                                    return next;
                                  })}
                                  style={{ color: TK.muted, cursor: "pointer" }}
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}


                      <TableRow className="hover:bg-[#F8FAFC]">
                        {/* select */}
                        {visibleCols.select !== false && (
                          <TableCell style={stickyStyle(COLS[0]) as any} className="text-left">
                            <Checkbox checked={!!selected[r.id]} onCheckedChange={(v)=>setSelected(s=>({ ...s, [r.id]: Boolean(v) }))} />
                          </TableCell>
                        )}
                        {/* expander */}
                        {visibleCols.expander !== false && (
                          <TableCell style={stickyStyle(COLS[1]) as any} className="text-left">
                            <button
                              onClick={()=>toggleExpand(r.id)}
                              aria-label={expanded[r.id] ? "Collapse" : "Expand"}
                              className="rounded border p-1 hover:bg-muted"
                              style={{ cursor: "pointer", borderColor: TK.borderLight }}
                            >
                              {expanded[r.id] ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                            </button>
                          </TableCell>
                        )}
                        {/* URL */}
                        {visibleCols.url !== false && (
                          <TableCell style={{ ...stickyStyle(COLS[2]), minWidth: 340 }} className="text-left">
                            <button
                              className="underline"
                              style={{ color: TK.brand, cursor: "pointer" }}
                              title={r.pageUrl}
                              onClick={openDrawer}
                            >
                              {midEllipsis(r.pageUrl, 46)}
                            </button>
                          </TableCell>
                        )}
                        {/* Clicks */}
                        {visibleCols.clicks !== false && (
                          <TableCell className="text-left">{fmt(r.clicks)}</TableCell>
                        )}
                        {/* Impressions */}
                        {visibleCols.impr !== false && (
                          <TableCell className="text-left">{fmt(r.impressions)}</TableCell>
                        )}
                        {/* CTR */}
                        {visibleCols.ctr !== false && (
                          <TableCell className="text-left">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="inline-flex items-center gap-1"
                                    style={{ color: lowCtr ? TK.critical : TK.text }}
                                  >
                                    {ctrPct.toFixed(2)}%
                                    {lowCtr && (
                                      <span
                                        aria-label="Low CTR"
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ background: TK.critical }}
                                      />
                                    )}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>CTR = Clicks ÷ Impressions (GSC)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )}
                        {/* Avg Position */}
                        {visibleCols.pos !== false && (
                          <TableCell className="text-left">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>{r.avgPosition.toFixed(1)}</span>
                                </TooltipTrigger>
                                <TooltipContent>Calculated by GSC over all related queries</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )}
                        {/* Top Query */}
                        {visibleCols.topQuery !== false && (
                          <TableCell className="text-left">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate max-w-[220px] inline-block align-bottom">{r.topQuery}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[260px]">
                                  <div className="text-xs">
                                    <div><b>Top Query</b> — highest‑impression keyword for this page.</div>
                                    <div className="text-muted-foreground mt-1">Est. impressions: {topQueryImprEst.toLocaleString()}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )}
                        {/* Status */}
                        {visibleCols.status !== false && (
                          <TableCell className="text-left">
                            <StatusChip flag={r.status} />
                          </TableCell>
                        )}
                        {/* Actions (brand icons, no borders) */}
                        {visibleCols.actions !== false && (
                          <TableCell className="text-left">
                            <div className="inline-flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1 rounded hover:bg-[#F2F8FC]"
                                      onClick={() => alert(`Open Analyzer: ${r.pageUrl}`)}
                                      aria-label="Open Page Analyzer"
                                      style={{ color: TK.brand, cursor: "pointer" }}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Open in Page Analyzer</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>


                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1 rounded hover:bg-[#F2F8FC]"
                                      onClick={() => alert(`Create Task: ${r.pageUrl}`)}
                                      aria-label="Create Optimization Task"
                                      style={{ color: TK.brand, cursor: "pointer" }}
                                    >
                                      <ClipboardList className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Create Task</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>


                      {/* Expanded row */}
                      {expanded[r.id] && (
                        <TableRow>
                          <TableCell colSpan={VISIBLE.length} className="text-left">
                            <div className="p-4 rounded-md border" style={{ borderColor: TK.borderLight, background: "#FAFBFF" }}>
                              <div className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: TK.text }}>
                                <Info className="h-4 w-4" style={{ color: TK.brand }} />
                                Performance (last 30 days)
                              </div>
                              <MiniPerfBars series={r.series} />
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
        </CardContent>


        {/* Bottom pagination */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm text-muted-foreground">
            Showing {sorted.length === 0 ? 0 : pageStart + 1}–{Math.min(sorted.length, pageStart + windowRows.length)} of {sorted.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(1)} style={{ cursor: "pointer" }}>First</Button>
            <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} style={{ cursor: "pointer" }}>Prev</Button>
            <div className="text-sm w-16 text-center">{page} / {totalPages}</div>
            <Button variant="outline" className="h-8 px-3" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} style={{ cursor: "pointer" }}>Next</Button>
            <Button variant="outline" className="h-8 px-3" disabled={page>=totalPages} onClick={()=>setPage(totalPages)} style={{ cursor: "pointer" }}>Last</Button>
            <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
              <SelectContent>
                {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </section>
  );
}


/* ───────────────────────── Lightweight tests (logic only) ───────────────────────── */
export function __tests__() {
  const flatSeries: Point[] = Array.from({ length: 30 }, (_, i) => ({ date: `2025-01-${String(i+1).padStart(2,"0")}`, clicks: 50, avgPosition: 8 }));
  const plateau = detectStatus(100, 5000, 0.03, 8, flatSeries);
  const lowCtr = detectStatus(100, 5000, 0.01, 5, flatSeries);
  const noClicks = detectStatus(0, 5001, 0, 12, flatSeries);
  return { plateau, lowCtr, noClicks };
}


