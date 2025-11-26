"use client";
/* ===========================================================================
   Wranker – Section 4 (Drawer): Landing Pages Triggered by Query
   File: app/demo3/page.tsx  (or any route file)
   - Includes a default export (required by Next.js pages)
   - Component matches the reference table pattern + spec in your brief
   - Update: "Page Score" → "Page Health Score" with progressive bar + number
             Mini chart tooltip shows colored dot annotations for Clicks & Avg. Pos
   =========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown,
  SlidersHorizontal, Download, Search as SearchIcon, Info,
  ClipboardList, ExternalLink, AlertCircle, CheckCircle2,
  Copy as CopyIcon, Check as CheckIcon, X as XIcon
} from "lucide-react";

/* ───────────────────────── Tokens / Theme aliases ───────────────────────── */
const TK = {
  surface: "var(--wr-surface, #FFFFFF)",
  surfaceMuted: "var(--wr-surface-muted, #FAFBFF)",
  border: "var(--wr-border, #E5E7EB)",
  borderSubtle: "var(--wr-border, #EEF1F5)",
  text: "var(--wr-text-strong, #111827)",
  subtle: "var(--wr-text-subtle, #6B7280)",
  brand: "var(--wr-brand, #1090D0)",
  link600: "var(--wr-link-600, #0F78D1)", // Clicks (bars)
  ok600: "var(--wr-positive-600, #10B981)", // Avg. Position (line)
  warn600: "var(--wr-warning-600, #F59E0B)",
  danger600: "var(--wr-negative-600, #EF4444)",
  radius: "8px",
  pastelBrand: "color-mix(in srgb, var(--wr-brand-600, #1090D0) 12%, white 88%)",
};

/* ───────────────────────── Types ───────────────────────── */
type Point = { date: string; clicks: number; avgPosition: number | null };
type StatusFlag = "Low CTR" | "Rank Plateau" | "No Clicks" | "—";
type Row = {
  id: string;
  pagePath: string;          // URL path, e.g., "/blog/..." (full on hover)
  pageTitle: string;         // title shown; clickable → Page Detail
  clicks: number;            // GSC for (query + page)
  impressions: number;       // GSC for (query + page)
  ctr?: number | null;       // 0..1 (if null, compute)
  avgPosition: number;       // 1 decimal
  pageScore?: number | null; // optional (Page Analyzer / Site Audit)
  series: Point[];           // 30 daily points for expander chart
};

type DrawerContext = { dateRangeLabel?: string; device?: string; country?: string; searchType?: string };
type TelemetryEvent =
  | "pages_table_sort"
  | "pages_table_filter_change"
  | "pages_row_expand"
  | "pages_bulk_action"
  | "pages_export"
  | "pages_action_click";

/* ───────────────────────── Utils ───────────────────────── */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const midEllipsis = (s: string, max = 48) => (s.length <= max ? s : s.slice(0, Math.floor((max - 3) / 2)) + "..." + s.slice(-Math.floor((max - 3) / 2)));
const compact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "K";
  return String(n);
};
const pct = (v: number | null | undefined, d = 2) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);

/* Debounce hook for filter inputs (150–250 ms per spec) */
function useDebounced<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function detectStatus(clicks: number, impressions: number, ctr: number, avgPosition: number, s: Point[]): StatusFlag {
  if (avgPosition <= 10 && ctr < 0.025) return "Low CTR";
  if (impressions > 1000 && clicks === 0) return "No Clicks";
  if (s.length >= 20) {
    const last10 = s.slice(-10).map(p => p.avgPosition ?? 0).filter(x => x > 0);
    const prev10 = s.slice(-20, -10).map(p => p.avgPosition ?? 0).filter(x => x > 0);
    if (last10.length === 10 && prev10.length === 10) {
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      if (Math.abs(avg(last10) - avg(prev10)) < 0.2) return "Rank Plateau";
    }
  }
  return "—";
}

/* ───────────────────────── Mini chart (Clicks bars + Avg. Position line) ───────────────────────── */
const MiniPerfBars: React.FC<{ series: any }> = ({ series }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<{ i: number; x: number; yC: number; yP: number; mx: number; my: number; w: number; h: number } | null>(null);

  const W = 820, H = 180, pad = { l: 44, r: 48, t: 16, b: 32 };
  const n = series.length;
  const width = W - pad.l - pad.r;
  const height = H - pad.t - pad.b;
  const barW = width / Math.max(1, n);

  const clicksMax = Math.max(1, ...series.map(d => d.clicks));
  const posVals = series.map(d => d.avgPosition).filter((x): x is number => x != null);
  const posMin = Math.min(...posVals);
  const posMax = Math.max(...posVals);

  const xFor = (i: number) => pad.l + i * barW;
  const yForClicks = (v: number) => pad.t + (1 - v / clicksMax) * height;
  const yForPos = (p: number) => pad.t + ((p - posMin) / Math.max(1e-6, posMax - posMin)) * height;

  const lineD = series
    .map((d, i) => (d.avgPosition == null ? null : `${i === 0 ? "M" : "L"} ${xFor(i) + barW / 2} ${yForPos(d.avgPosition)}`))
    .filter(Boolean)
    .join(" ");

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const scaleX = W / rect.width;
    const mxVb = mx * scaleX;
    const idx = clamp(Math.floor((mxVb - pad.l) / barW), 0, n - 1);
    setHover({
      i: idx,
      x: xFor(idx) + barW / 2,
      yC: yForClicks(series[idx].clicks),
      yP: series[idx].avgPosition != null ? yForPos(series[idx].avgPosition) : pad.t + height,
      mx, my, w: rect.width, h: rect.height
    });
  };

  const tipSideRight = hover ? hover.mx < hover.w / 2 : true;
  const tipLeftPx = hover ? (tipSideRight ? hover.mx + 10 : hover.mx - 10) : 0;
  const tipTopPx = hover ? hover.my - 18 : 0;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="30 day Clicks (bars) + Avg. Position (line). Lower is better for Position."
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* axes and grid */}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke={TK.borderSubtle} />
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} stroke={TK.borderSubtle} />
        <line x1={W - pad.r} x2={W - pad.r} y1={pad.t} y2={H - pad.b} stroke={TK.borderSubtle} />
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={pad.t + t * height} y2={pad.t + t * height} stroke={TK.borderSubtle} opacity={0.5} />
        ))}

        {/* bars: Clicks */}
        {series.map((d, i) => {
          const x = xFor(i) + 3;
          const y = yForClicks(d.clicks);
          const w = Math.max(2, barW - 6);
          const h = Math.max(0, H - pad.b - y);
          return <rect key={i} x={x} y={y} width={w} height={h} rx="2" fill={TK.link600} />;
        })}

        {/* line: Avg. Position */}
        <path d={lineD} fill="none" stroke={TK.ok600} strokeWidth={2} />
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={pad.t} y2={H - pad.b} stroke={TK.borderSubtle} />
            <circle cx={hover.x} cy={hover.yP} r="3.5" fill={TK.ok600} />
          </>
        )}

        {/* axis labels */}
        <text x={pad.l - 6} y={H - pad.b + 12} textAnchor="end" fontSize="10" fill={TK.subtle}>0</text>
        <text x={pad.l - 6} y={pad.t + 3} textAnchor="end" fontSize="10" fill={TK.subtle}>{Math.max(...series.map(d => d.clicks)).toLocaleString()}</text>
        <text x={W - pad.r + 6} y={H - pad.b + 12} textAnchor="start" fontSize="10" fill={TK.subtle}>{Math.min(...posVals).toFixed(0)}</text>
        <text x={W - pad.r + 6} y={pad.t + 3} textAnchor="start" fontSize="10" fill={TK.subtle}>{Math.max(...posVals).toFixed(0)}</text>
        <text x={pad.l} y={H - pad.b + 22} textAnchor="start" fontSize="10" fill={TK.subtle}>{series[0]?.date}</text>
        <text x={W - pad.r} y={H - pad.b + 22} textAnchor="end" fontSize="10" fill={TK.subtle}>{series[n - 1]?.date}</text>

        <rect x={pad.l} y={pad.t} width={width} height={height} fill="transparent" />
      </svg>

      {/* hover tooltip (smart popover with color dots matching chart) */}
      {hover && (
        <div
          className="absolute rounded px-2 py-1 text-xs text-white"
          style={{
            left: `${clamp(tipLeftPx, 8, hover.w - 8)}px`,
            top: `${clamp(tipTopPx, 8, hover.h - 28)}px`,
            transform: tipSideRight ? "translateX(0)" : "translateX(-100%)",
            background: "rgba(17,24,39,0.96)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          <div><b>{series[hover.i].date}</b></div>
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: TK.link600, display: "inline-block" }} />
            <span>Clicks: {series[hover.i].clicks.toLocaleString()}</span>
          </div>
          {series[hover.i].avgPosition != null && (
            <div className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: TK.ok600, display: "inline-block" }} />
              <span>
                Avg. Pos: {series[hover.i] && series[hover.i].avgPosition != null
                  ? (series[hover.i].avgPosition !== null ? series[hover.i].avgPosition.toFixed(1) : "—")
                  : "—"}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-1">
        30 day <b>Clicks</b> (bars) + <b>Avg. Position</b> (line). Hover to inspect. <span className="opacity-80">(Lower is better for Position)</span>
      </div>
    </div>
  );
};

/* ───────────────────────── Column defs ───────────────────────── */
type ColKey = "select" | "expand" | "page" | "clicks" | "impr" | "ctr" | "pos" | "score" | "actions";
type ColDef = { key: ColKey; label: string; width?: number; sortable?: boolean; sticky?: boolean; tip?: string };

const COLS: ColDef[] = [
  { key: "select", label: "", width: 46, sticky: true },
  { key: "expand", label: "", width: 44, sticky: true },
  { key: "page", label: "Page", width: 420, sticky: true, sortable: true, tip: "Title (opens Page Detail) + URL path. Hover to copy full path." },
  { key: "clicks", label: "Clicks", width: 120, sortable: true, tip: "Organic clicks from Google Search (GSC) for this query on this page." },
  { key: "impr", label: "Impressions", width: 140, sortable: true, tip: "Times shown in Google search (GSC) for this query on this page." },
  { key: "ctr", label: "CTR (%)", width: 140, sortable: true, tip: "CTR = Clicks ÷ Impressions (GSC) for this query on this page." },
  { key: "pos", label: "Avg. Position", width: 140, sortable: true, tip: "Average ranking for this query on this page (lower is better)." },
  { key: "score", label: "Page Health Score", width: 160, sortable: true, tip: "Health score from Page Analyzer / Site Audit (0–100)." },
  { key: "actions", label: "Actions", width: 160, tip: "🔍 View Page · 📌 Assign Task" },
];

/* ───────────────────────── Small UI helpers ───────────────────────── */
const HeaderTip: React.FC<{ tip?: string; children: React.ReactNode }> = ({ tip, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          {tip ? <Info className="h-3.5 w-3.5 text-[#9E9E9E]" /> : null}
        </span>
      </TooltipTrigger>
      {tip && <TooltipContent side="top" className="max-w-[280px] text-xs">{tip}</TooltipContent>}
    </Tooltip>
  </TooltipProvider>
);

const StatusChip: React.FC<{ flag: StatusFlag }> = ({ flag }) => {
  if (flag === "—") return <span className="text-xs text-muted-foreground">—</span>;
  const palette = flag === "Low CTR" ? TK.danger600 : flag === "Rank Plateau" ? TK.warn600 : TK.brand;
  const Icon = flag === "Low CTR" ? AlertCircle : flag === "Rank Plateau" ? AlertCircle : CheckCircle2;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ color: palette, border: `1px solid ${TK.borderSubtle}` }}>
      <Icon className="h-3.5 w-3.5" /> {flag}
    </span>
  );
};

const CtrBadge: React.FC<{ ctr: number; pos: number; baselineCtr?: number | null }> = ({ ctr, pos, baselineCtr }) => {
  const ctrPct = ctr * 100;
  const isRed = ctrPct < 1.0;
  const isGreen = ctrPct > 8.0;
  const isAmberOpp = pos <= 10 && ctrPct < 2.5;
  const bg = isGreen ? "var(--wr-positive-600, #10B981)" : isRed ? "var(--wr-negative-600, #EF4444)" : "var(--wr-border, #E5E7EB)";
  const fg = isGreen || isRed ? "#fff" : TK.text;

  const delta = baselineCtr != null ? (ctrPct - baselineCtr * 100) : null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: bg, color: fg }}>
            {ctrPct.toFixed(2)}%
            {isAmberOpp && <span className="ml-1 inline-flex items-center rounded px-1 py-[1px] text-[10px]" style={{ background: TK.warn600, color: "#fff" }}>Opportunity</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <div><b>CTR</b> = Clicks ÷ Impressions (GSC) for this query on this page.</div>
          {delta != null && <div className="text-muted-foreground mt-1">Compared to project avg: {delta >= 0 ? "+" : ""}{delta.toFixed(2)}%</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const CopyablePath: React.FC<{ full: string; display: string }> = ({ full, display }) => {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* noop */ }
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm text-[var(--wr-link-600,#0F78D1)] underline decoration-transparent hover:decoration-inherit cursor-pointer">{display}</span>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <code className="text-xs">{full}</code>
          <button
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs"
            style={{ borderColor: TK.border }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); doCopy(); }}
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
          </button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/* Page Health Score bar */
const HealthBar: React.FC<{ value: number }> = ({ value }) => {
  const v = clamp(value, 0, 100);
  const color =
    v >= 80 ? TK.ok600 :
    v >= 50 ? TK.warn600 :
    TK.danger600;

  return (
    <div className="flex items-center gap-2" aria-label={`Page health score: ${v}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="w-28 h-2.5 rounded bg-[#EEF2F7] overflow-hidden border" style={{ borderColor: TK.borderSubtle }}>
        <div className="h-full" style={{ width: `${v}%`, background: color }} />
      </div>
      <span className="text-xs font-medium" style={{ color }}>{v}</span>
    </div>
  );
};

/* ───────────────────────── Demo data (if rows not provided) ───────────────────────── */
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function makeSeries(): Point[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getTime() - (29 - i) * 86400000);
    const clicks = Math.max(0, Math.round(10 + 60 * Math.random() + (i - 10) * 0.8));
    const avgPosition = Math.max(2, Math.min(40, 8 + (Math.random() - 0.5) * 6 + (15 - i) * 0.02));
    return { date: d.toISOString().slice(0, 10), clicks, avgPosition };
  });
}
function makeDemoRows(n = 80): Row[] {
  const titles = [
    "Ultimate SEO Checklist (2025)", "SEO Services & Pricing", "Technical SEO Audit Guide",
    "Google Algorithm Updates – History", "Keyword Research Tool", "On-Page SEO Best Practices",
    "Link Building Ideas", "Title Tag Length Checker", "Schema Markup Guide", "Core Web Vitals: How-To"
  ];
  return Array.from({ length: n }, (_, i) => {
    const series = makeSeries();
    const impr = Math.round(rand(1500, 90000));
    const ctr = rand(0.012, 0.085);
    const clicks = Math.round(impr * ctr);
    const pos = Number(rand(2.0, 25.0).toFixed(1));
    const score = Math.random() < 0.7 ? Math.round(rand(55, 96)) : null;
    const slugs = ["/blog/seo-checklist", "/services/seo", "/blog/tech-seo-audit", "/blog/google-algorithm-updates",
      "/tools/keyword-research", "/blog/onpage-seo", "/blog/link-building", "/tools/title-length-checker", "/blog/schema-guide", "/blog/core-web-vitals"];
    return {
      id: `row-${i + 1}`,
      pagePath: slugs[i % slugs.length] + (i % 4 === 0 ? "/" : ""),
      pageTitle: titles[i % titles.length],
      clicks,
      impressions: impr,
      ctr,
      avgPosition: pos,
      pageScore: score,
      series,
    };
  });
}

/* ───────────────────────── Main component ───────────────────────── */
type Props = {
  query: string;
  rows?: Row[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewPage?: (pageUrl: string) => void;
  onAssignTask?: (pageUrl: string, query: string) => void;
  onBulkAssignTask?: (pageUrls: string[], query: string) => void;
  onTelemetry?: (event: TelemetryEvent, payload: Record<string, any>) => void;
  drawerContext?: DrawerContext;
  pageSizeOptions?: number[];
  persistKey?: string;
};

export function LandingPagesByQuery({
  query,
  rows,
  loading,
  error,
  onRetry,
  onViewPage,
  onAssignTask,
  onBulkAssignTask,
  onTelemetry,
  drawerContext,
  pageSizeOptions = [10, 25, 50, 100],
  persistKey = "wr:lpq"
}: Props) {

  /* Data */
  const baseRows: Row[] = useMemo(() => rows && rows.length ? rows : makeDemoRows(100), [rows]);

  /* Column visibility (persisted) */
  const defaultVisible = useMemo(() => {
    const all = COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>);
    const hasScore = baseRows.some(r => r.pageScore != null);
    all.score = hasScore;
    return all;
  }, [baseRows]);
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`${persistKey}:visibleCols`);
      if (raw) return { ...defaultVisible, ...JSON.parse(raw) };
    } catch {}
    return defaultVisible;
  });
  useEffect(() => {
    try { localStorage.setItem(`${persistKey}:visibleCols`, JSON.stringify(visibleCols)); } catch {}
  }, [persistKey, visibleCols]);

  /* Sorting (default: Clicks DESC) */
  const [sortBy, setSortBy] = useState<ColKey>("clicks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    const c = COLS.find(x => x.key === key);
    if (!c?.sortable) return;
    if (sortBy !== key) {
      setSortBy(key); setSortDir("desc");
    } else {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    }
    onTelemetry?.("pages_table_sort", { surface: "drawer", column: key, dir: sortDir });
  };
  const headerSortIcon = (key: ColKey) =>
    sortBy === key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                   : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;

  /* Filters */
  const [urlFilter, setUrlFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [ctrRange, setCtrRange] = useState<[number, number]>([0, 10]);   // percent
  const [posRange, setPosRange] = useState<[number, number]>([1, 50]);   // position
  const [page2plus, setPage2plus] = useState(false);
  const debUrl = useDebounced(urlFilter);
  const debTitle = useDebounced(titleFilter);
  const debCtr = useDebounced(ctrRange);
  const debPos = useDebounced(posRange);
  useEffect(() => {
    if (page2plus) setPosRange(([_, max]) => [10.01, max]); // quick pill rule
  }, [page2plus]);

  /* Selection / Expansion */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string, pageUrl: string) => {
    setExpanded(s => ({ ...s, [id]: !s[id] }));
    onTelemetry?.("pages_row_expand", { surface: "drawer", pageUrl });
  };

  /* Sorting helpers */
  const getVal = (r: Row, key: ColKey): any => {
    switch (key) {
      case "page": return r.pageTitle.toLowerCase();
      case "clicks": return r.clicks;
      case "impr": return r.impressions;
      case "ctr": return (r.ctr ?? (r.impressions ? r.clicks / r.impressions : 0));
      case "pos": return r.avgPosition;
      case "score": return r.pageScore ?? -1;
      default: return 0;
    }
  };

  /* Filtered */
  const filtered = useMemo(() => {
    const [minCTR, maxCTR] = debCtr;
    const [minPos, maxPos] = debPos;
    return baseRows.filter(r => {
      const ctr = r.ctr ?? (r.impressions ? r.clicks / r.impressions : null);
      const ctrPct = ctr == null ? null : ctr * 100;
      if (debUrl && !r.pagePath.toLowerCase().includes(debUrl.toLowerCase())) return false;
      if (debTitle && !r.pageTitle.toLowerCase().includes(debTitle.toLowerCase())) return false;
      if (ctrPct != null && (ctrPct < minCTR - 1e-8 || ctrPct > maxCTR + 1e-8)) return false;
      if (r.avgPosition < minPos - 1e-8 || r.avgPosition > maxPos + 1e-8) return false;
      return true;
    });
  }, [baseRows, debUrl, debTitle, debCtr, debPos]);

  /* Sorted */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getVal(a, sortBy);
      const bv = getVal(b, sortBy);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const windowRows = useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);
  const pageIds = useMemo(() => windowRows.map(r => r.id), [windowRows]);
  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected[id]);

  /* Baselines for tooltips */
  const baselineCtr = useMemo(() => {
    const vals = filtered.map(r => (r.ctr ?? (r.impressions ? r.clicks / r.impressions : null))).filter((x): x is number => x != null);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return sum / vals.length;
  }, [filtered]);
  const projectMedianPos = useMemo(() => {
    const vals = filtered.map(r => r.avgPosition).sort((a, b) => a - b);
    if (!vals.length) return null;
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  }, [filtered]);

  /* Cannibalization hint (≥ 2 pages have ≥ 25% click share) */
  const cannibalization = useMemo(() => {
    const totalClicks = filtered.reduce((a, r) => a + r.clicks, 0);
    if (totalClicks === 0) return false;
    const bigShares = filtered.map(r => r.clicks / totalClicks).filter(s => s >= 0.25);
    return bigShares.length >= 2;
  }, [filtered]);

  /* Visible columns helper */
  const VISIBLE = useMemo(() => COLS.filter(c => visibleCols[c.key] !== false), [visibleCols]);

  /* Sticky offsets for first three columns */
  const stickyStyle = (c: ColDef) => {
    if (!c.sticky) return undefined;
    const left =
      c.key === "select" ? 0 :
      c.key === "expand" ? (COLS.find(x => x.key === "select")?.width ?? 46) :
      c.key === "page"   ? ( (COLS.find(x => x.key === "select")?.width ?? 46) + (COLS.find(x => x.key === "expand")?.width ?? 44) ) : 0;

    return {
      position: "sticky" as const,
      left,
      zIndex: 30,
      background: "#fff",
      boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)"
    };
  };

  /* CSV export (visible columns & current filters) */
  const exportCSV = useCallback(() => {
    const cols = VISIBLE.filter(c => !["select", "expand", "actions"].includes(c.key));
    const headers = cols.map(c => c.label);
    const mapVal = (r: Row, key: ColKey): any => {
      switch (key) {
        case "page": return `${r.pageTitle} — ${r.pagePath}`;
        case "clicks": return r.clicks;
        case "impr": return r.impressions;
        case "ctr": return ((r.ctr ?? (r.impressions ? r.clicks / r.impressions : 0)) * 100).toFixed(2) + "%";
        case "pos": return r.avgPosition.toFixed(1);
        case "score": return r.pageScore ?? "—";
        default: return "";
      }
    };
    const lines = sorted.map(r => cols.map(c => JSON.stringify(mapVal(r, c.key))).join(","));
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `landing-pages-by-query_${query.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);

    onTelemetry?.("pages_export", {
      surface: "drawer",
      format: "csv",
      visibleCols: cols.map(c => c.key),
      filters: { urlContains: urlFilter, titleContains: titleFilter, ctrRange, posRange, page2plus },
    });
  }, [VISIBLE, sorted, query, onTelemetry, urlFilter, titleFilter, ctrRange, posRange, page2plus]);

  /* Telemetry: filters */
  useEffect(() => {
    onTelemetry?.("pages_table_filter_change", {
      surface: "drawer",
      urlContains: debUrl,
      titleContains: debTitle,
      ctrRange: debCtr,
      posRange: debPos,
      page2plus,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debUrl, debTitle, debCtr, debPos, page2plus]);

  /* Accessibility aria label */
  const ariaLabel = `Landing pages for "${query}": sorted by ${COLS.find(c => c.key === sortBy)?.label ?? sortBy} (${sortDir}).${drawerContext?.dateRangeLabel ? " Date: " + drawerContext.dateRangeLabel + "." : ""}${drawerContext?.device ? " Device: " + drawerContext.device + "." : ""}${drawerContext?.country ? " Country: " + drawerContext.country + "." : ""}`;

  /* UI state helpers */
  const showEmpty = !loading && !error && sorted.length === 0;

  return (
    <section aria-label={ariaLabel} className="space-y-3">
      <Card className="border mx-4" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* Header & Controls */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: `1px solid ${TK.border}` }}>
          <CardTitle className="text-lg">Landing Pages Triggered by Query</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Column Manager */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {COLS.map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={c.key === "select" || c.key === "expand" || c.key === "page"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [c.key]: Boolean(v) }))}
                      />
                      <span>{c.label || c.key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCols(defaultVisible)}>Reset</Button>
                  <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Button variant="outline" className="h-8 px-3" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardHeader>

        {/* Filter bar */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.border }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* URL contains */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[260px] pl-7"
                placeholder="URL contains…"
                value={urlFilter}
                onChange={(e) => { setUrlFilter(e.target.value); setPage(1); }}
              />
            </div>

            {/* Title contains */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[260px] pl-7"
                placeholder="Title contains…"
                value={titleFilter}
                onChange={(e) => { setTitleFilter(e.target.value); setPage(1); }}
              />
            </div>

            {/* CTR range 0–10% */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">CTR</span>
              <div className="w-[160px]">
                <Slider value={ctrRange as unknown as number[]} min={0} max={10} step={0.1} onValueChange={(v: any) => { setCtrRange([v[0], v[1]]); setPage(1); }} />
              </div>
              <span className="text-sm w-[96px]">{ctrRange[0].toFixed(1)}% – {ctrRange[1].toFixed(1)}%</span>
            </div>

            {/* Position range 1–50 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Position</span>
              <div className="w-[180px]">
                <Slider value={posRange as unknown as number[]} min={1} max={50} step={0.5} onValueChange={(v: any) => { setPosRange([v[0], v[1]]); setPage(1); }} />
              </div>
              <span className="text-sm w-[100px]">{posRange[0].toFixed(1)} – {posRange[1].toFixed(1)}</span>
            </div>

            {/* Quick Pill: Page 2+ */}
            <button
              onClick={() => setPage2plus(v => !v)}
              className={`h-8 px-3 rounded-full border text-sm ${page2plus ? "font-semibold" : ""}`}
              style={{ borderColor: TK.border, background: page2plus ? TK.pastelBrand : "#fff" }}
            >
              Page 2+ (Pos &gt; 10)
            </button>

            {/* Rows per page + pager (right) */}
            <div className="ml-auto flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v: any) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage(1)}>First</Button>
              <Button variant="outline" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <div className="text-sm w-16 text-center">{page} / {totalPages}</div>
              <Button variant="outline" className="h-8 px-3" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              <Button variant="outline" className="h-8 px-3" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last</Button>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.length > 0 && (
            <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.border }}>
              <span className="text-sm"><strong>{selectedIds.length}</strong> selected</span>
              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
              <Button size="sm" variant="outline" >Assign Task</Button>
              <Button size="sm" variant="outline" onClick={() => {
                exportCSV();
                onTelemetry?.("pages_bulk_action", { surface: "drawer", action: "export", count: selectedIds.length });
              }}>Export Selected</Button>
              <div className="ml-auto">
                <Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear</Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 border-b" style={{ borderColor: TK.border }}>
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XIcon className="h-4 w-4" /> {error}
              {onRetry && <Button size="sm" variant="outline" className="ml-2" onClick={onRetry}>Retry</Button>}
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && sorted.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No data for these filters. Try a longer date range or a different segment.
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.border }}>
              <div className="animate-pulse p-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-9 rounded bg-gray-100" />
                ))}
              </div>
            </div>
          </CardContent>
        )}

        {/* Table */}
        {!loading && sorted.length > 0 && (
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.border }}>
              <Table className="text-sm">
                <TableHeader className="bg-white sticky top-0 z-20">
                  <TableRow className="hover:bg-white">
                    {VISIBLE.map(c => (
                      <TableHead
                        key={c.key}
                        style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }}
                        className="text-left"
                      >
                        {c.key === "select" ? (
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => {
                              const checked = !allSelected;
                              setSelected(prev => {
                                const next = { ...prev };
                                pageIds.forEach(id => { next[id] = checked; });
                                return next;
                              });
                            }}
                          />
                        ) : c.sortable ? (
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => toggleSort(c.key)}
                            aria-pressed={sortBy === c.key}
                          >
                            <HeaderTip tip={c.tip}><span>{c.label}</span></HeaderTip>
                            {headerSortIcon(c.key)}
                          </button>
                        ) : (
                          <HeaderTip tip={c.tip}><span>{c.label}</span></HeaderTip>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {windowRows.map(r => {
                    const ctr = r.ctr ?? (r.impressions ? r.clicks / r.impressions : 0);
                    const flag = detectStatus(r.clicks, r.impressions, ctr, r.avgPosition, r.series);
                    const ctrOpp = r.avgPosition <= 10 && (ctr * 100) < 2.5;

                    return (
                      <React.Fragment key={r.id}>
                        <TableRow className="hover:bg-[#F8FAFC]">
                          {/* Select */}
                          {visibleCols.select !== false && (
                            <TableCell style={stickyStyle(COLS[0]) as any} className="text-left">
                              <Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => setSelected(s => ({ ...s, [r.id]: Boolean(v) }))} />
                            </TableCell>
                          )}

                          {/* Expand */}
                          {visibleCols.expand !== false && (
                            <TableCell style={stickyStyle(COLS[1]) as any} className="text-left">
                              <button
                                onClick={() => toggleExpand(r.id, r.pagePath)}
                                aria-label={expanded[r.id] ? "Collapse" : "Expand"}
                                className="rounded border p-1 hover:bg-muted"
                              >
                                {expanded[r.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </TableCell>
                          )}

                          {/* Page: Title + URL path (with copy on hover) */}
                          {visibleCols.page !== false && (
                            <TableCell style={{ ...stickyStyle(COLS[2]), minWidth: COLS[2].width }} className="text-left">
                              <div className="flex flex-col">
                                <button
                                  className="text-[15px] font-medium text-left"
                                  style={{ color: TK.link600 }}
                                  onClick={() => onViewPage ? onViewPage(r.pagePath) : alert(`Page Detail → ${r.pagePath}`)}
                                  title="Open Page Detail"
                                >
                                  {r.pageTitle}
                                </button>
                                <CopyablePath full={r.pagePath} display={midEllipsis(r.pagePath, 56)} />
                              </div>
                            </TableCell>
                          )}

                          {/* Clicks */}
                          {visibleCols.clicks !== false && <TableCell className="text-left">{compact(r.clicks)}</TableCell>}

                          {/* Impressions */}
                          {visibleCols.impr !== false && <TableCell className="text-left">{compact(r.impressions)}</TableCell>}

                          {/* CTR with badge color */}
                          {visibleCols.ctr !== false && (
                            <TableCell className="text-left">
                              <CtrBadge ctr={ctr} pos={r.avgPosition} baselineCtr={baselineCtr} />
                            </TableCell>
                          )}

                          {/* Avg. Position with tooltip (project median) */}
                          {visibleCols.pos !== false && (
                            <TableCell className="text-left">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>{r.avgPosition.toFixed(1)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">
                                    <div>Average ranking for this query on this page (lower is better).</div>
                                    {projectMedianPos != null && <div className="text-muted-foreground mt-1">Project median: {projectMedianPos.toFixed(1)}</div>}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          )}

                          {/* Page Health Score (progress bar + number) */}
                          {visibleCols.score !== false && (
                            <TableCell className="text-left">
                              {r.pageScore != null ? <HealthBar value={r.pageScore} /> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          )}

                          {/* Actions */}
                          {visibleCols.actions !== false && (
                            <TableCell className="text-left">
                              <div className="inline-flex items-center gap-1.5">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-[#4286F5]"
                                        aria-label="View Page"
                                        onClick={() => {
                                          onTelemetry?.("pages_action_click", { surface: "drawer", action: "viewPage", pageUrl: r.pagePath });
                                          onViewPage ? onViewPage(r.pagePath) : window.open(r.pagePath, "_blank");
                                        }}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open in Page Analyzer</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-[#4286F5]"
                                        aria-label="Assign Task"
                                        onClick={() => {
                                          onTelemetry?.("pages_action_click", { surface: "drawer", action: "assignTask", pageUrl: r.pagePath });
                                          onAssignTask ? onAssignTask(r.pagePath, query) : alert(`Assign Task → ${r.pageTitle} (${query})`);
                                        }}
                                      >
                                        <ClipboardList className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Create Task</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>

                        {/* Expanded content */}
                        {expanded[r.id] && (
                          <TableRow>
                            <TableCell colSpan={VISIBLE.length} className="text-left">
                              <div className="p-4 rounded-md border" style={{ borderColor: TK.border, background: TK.surfaceMuted }}>
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-medium">Performance (last 30 days)</div>
                                  <div className="text-xs flex items-center gap-2">
                                    <StatusChip flag={flag} />
                                    {ctrOpp && <span className="text-[11px] px-2 py-[2px] rounded" style={{ background: TK.warn600, color: "#fff" }}>CTR opportunity</span>}
                                  </div>
                                </div>

                                {/* Optional nudge */}
                                {cannibalization && (
                                  <div className="text-xs text-[#6B7280] mt-1">
                                    Possible cannibalization: multiple pages sharing clicks for “{query}”.
                                  </div>
                                )}

                                {/* Title tag preview */}
                                <div className="mt-2 mb-2 text-xs">
                                  <span className="text-muted-foreground">Title tag:</span>{" "}
                                  <span className="font-medium">{r.pageTitle}</span>{" "}
                                  <span className="text-muted-foreground">({r.pageTitle.length} chars{r.pageTitle.length > 60 ? ", might truncate" : ""})</span>
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
        )}

        {/* Bottom pagination */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.border }}>
            <div className="text-sm text-muted-foreground">
              Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + windowRows.length)} of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage(1)}>First</Button>
              <Button variant="outline" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <div className="text-sm w-16 text-center">{page} / {totalPages}</div>
              <Button variant="outline" className="h-8 px-3" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              <Button variant="outline" className="h-8 px-3" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last</Button>
              <Select value={String(pageSize)} onValueChange={(v: any) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

/* ───────────────────────── Default export (Next.js page) ───────────────────────── */
export default function DemoLandingPagesByQueryPage() {
  return (
    <LandingPagesByQuery
      query="best seo tool" // replace with the selected query from your Drawer context
      drawerContext={{ dateRangeLabel: "Last 30 days", device: "all", country: "all" }}
      // onTelemetry={(ev, payload) => console.log(ev, payload)}
    />
  );
}

/* ───────────────────────── Lightweight tests (logic only) ───────────────────────── */
export function __tests__lpq() {
  const flat: Point[] = Array.from({ length: 30 }, (_, i) => ({ date: `2025-08-${String(i + 1).padStart(2, "0")}`, clicks: 50, avgPosition: 7.9 }));
  const plateau = detectStatus(100, 5000, 0.03, 7.9, flat);
  const lowCtr = detectStatus(100, 5000, 0.01, 5.2, flat);
  const noClicks = detectStatus(0, 5001, 0, 12.4, flat);
  return { plateau, lowCtr, noClicks };
}
