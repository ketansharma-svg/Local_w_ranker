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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown,
  SlidersHorizontal, Download, Search, Info, Eye, ClipboardList, Link as LinkIcon, FileSpreadsheet, Lock, BarChart3, Gauge, TrendingUp, TrendingDown, ChevronsRight
} from "lucide-react";
import PageSpeedOptimizationDrawer from "./drawers/PageSpeedOptimization";
import ContentAuditSummaryDrawerDemo from "./drawers/ContentAuditSummary";

/* ───────────────────────── Design Tokens (CSS vars with fallbacks) ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",        // Brand blue for donut
  valueBlue: "var(--wr-action, #4286F5)",
  pastelBlue: "var(--wr-pastelBrand, #D9EEF8)",
  ok: "var(--wr-success, #2ECC71)",
  warn: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #FF6B6B)",
  radius: "var(--wr-radius, 6px)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
};

/* ───────────────────────── Types ───────────────────────── */
type Row = {
  id: string;
  domain: string;              // root domain
  isYou: boolean;              // baseline row
  seoScore: number;            // 0..100 (progressive bar)
  wrScore: number;             // 0..100 (donut)
  top10Kw: number;             // e.g., 3400
  organicTraffic: number;      // monthly est.
  refDomains: number;          // referring domains
  backlinks: number;           // total backlinks
  pageSpeedSec: number;        // avg load time (s)
  // optional expansion
  notes?: string;
};

/* ───────────────────────── Utilities ───────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const cf = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
const one = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
const clamp = (v: number, a=0, b=100) => Math.max(a, Math.min(b, v));
const barTone = (v: number) => (v >= 80 ? TK.ok : v >= 60 ? TK.warn : TK.critical);
const donutTone = (v: number) => TK.brand;

/** Compare competitor metric vs baseline (your project). For speed, lower is better. */
function trend(v: number, base: number, betterWhenHigher = true) {
  if (base === undefined || base === null) return { dir: "neutral" as const, delta: 0 };
  const raw = v - base;
  if (raw === 0) return { dir: "neutral" as const, delta: 0 };
  if (betterWhenHigher) return raw > 0 ? { dir: "up" as const, delta: raw } : { dir: "down" as const, delta: raw };
  // lower is better
  return raw < 0 ? { dir: "up" as const, delta: -raw } : { dir: "down" as const, delta: raw };
}

const TrendChip: React.FC<{v: number, base: number, betterWhenHigher?: boolean, fmt?: (n:number)=>string}> =
({ v, base, betterWhenHigher = true, fmt = nf }) => {
  const t = trend(v, base, betterWhenHigher);
  const common = "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border";
  if (t.dir === "neutral") return <span className={`${common}`} style={{ color: TK.muted, borderColor: TK.borderLight }}>—</span>;
  const up = t.dir === "up";
  return (
    <span className={common}
      style={{
        color: up ? TK.ok : TK.critical,
        borderColor: up ? "rgba(46,204,113,0.3)" : "rgba(255,107,107,0.3)",
        background: up ? "rgba(46,204,113,0.08)" : "rgba(255,107,107,0.08)"
      }}>
      {up ? <TrendingUp className="h-3.5 w-3.5"/> : <TrendingDown className="h-3.5 w-3.5"/>}
      {fmt(Math.abs(t.delta))}
    </span>
  );
};

/** SEO Score progressive bar (0..100) with status color */
const SEOBar: React.FC<{ value: number; ariaLabel: string }> = ({ value, ariaLabel }) => {
  const v = clamp(value);
  const W = 120, H = 10;
  return (
    <div className="flex items-center gap-2" aria-label={ariaLabel}>
      <div className="relative" style={{ width: W, height: H, background: "#F3F4F6", borderRadius: 6, border: `1px solid ${TK.borderLight}` }}>
        <div style={{ width: `${v}%`, height: "100%", background: barTone(v), borderRadius: 6 }} />
      </div>
      <span className="text-xs tabular-nums" style={{ color: TK.muted }}>{v}</span>
    </div>
  );
};

/** Tiny WR Score donut (0..100) in brand blue */
const WRDonut: React.FC<{ value: number; size?: number; stroke?: number; ariaLabel: string }> =
({ value, size = 34, stroke = 5, ariaLabel }) => {
  const v = clamp(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  return (
    <svg width={size} height={size} role="img" aria-label={ariaLabel}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#E6EEF4" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r}
              stroke={donutTone(v)} strokeWidth={stroke} fill="none"
              strokeDasharray={`${dash} ${c-dash}`} strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fill={TK.text} className="font-semibold">{Math.round(v)}</text>
    </svg>
  );
};

/* ───────────────────────── Mock data (demo) ───────────────────────── */
function makeRows(): Row[] {
  const you: Row = {
    id: "you",
    domain: "wranker.com",
    isYou: true,
    seoScore: 78,
    wrScore: 81,
    top10Kw: 3400,
    organicTraffic: 12500,
    refDomains: 330,
    backlinks: 2100,
    pageSpeedSec: 1.9,
    notes: "Baseline (Your project)"
  };
  const comps: Row[] = [
    { id:"c1", domain:"comp1.com", isYou:false, seoScore: 83, wrScore: 87, top10Kw: 5200, organicTraffic: 28900, refDomains: 620, backlinks: 4800, pageSpeedSec: 1.2 },
    { id:"c2", domain:"comp2.com", isYou:false, seoScore: 65, wrScore: 74, top10Kw: 2800, organicTraffic: 9700,  refDomains: 180, backlinks: 1300, pageSpeedSec: 2.5 },
    { id:"c3", domain:"comp3.io",  isYou:false, seoScore: 72, wrScore: 69, top10Kw: 3100, organicTraffic: 14100, refDomains: 260, backlinks: 2100, pageSpeedSec: 2.1 },
  ];
  return [you, ...comps];
}

/* ───────────────────────── Column Model ───────────────────────── */
type ColKey =
  | "select" | "expander" | "domain" | "seoScore" | "wrScore"
  | "top10Kw" | "organicTraffic" | "refDomains" | "backlinks" | "pageSpeedSec" | "actions";
type ColDef = { key: ColKey; label: string; width?: number; align?: "left" | "right" | "center"; sortable?: boolean; sticky?: boolean };

const COLS: ColDef[] = [
  { key: "select", label: "", width: 44, align: "center", sticky: true },
  { key: "expander", label: "", width: 44, align: "center", sticky: true },
  { key: "domain", label: "Domain", width: 260, sortable: true, sticky: true },
  { key: "seoScore", label: "SEO", width: 180, sortable: true, align: "left" },
  { key: "wrScore", label: "WR", width: 120, sortable: true, align: "center" },
  { key: "top10Kw", label: "Top 10 Keywords", width: 150, sortable: true, align: "right" },
  { key: "organicTraffic", label: "Organic Traffic Est.", width: 170, sortable: true, align: "right" },
  { key: "refDomains", label: "Referring Domains", width: 160, sortable: true, align: "right" },
  { key: "backlinks", label: "Total Backlinks", width: 150, sortable: true, align: "right" },
  { key: "pageSpeedSec", label: "Avg. Page Speed (s)", width: 170, sortable: true, align: "right" },
  { key: "actions", label: "Actions", width: 180 },
];

const columnDescriptions: Record<ColKey,string> = {
  select: "Select rows for bulk actions.",
  expander: "Expand to quick view & actions.",
  domain: "Your project (baseline) and selected competitors.",
  seoScore: "On‑page & technical optimization score (0–100).",
  wrScore: "Wranker authority score (0–100).",
  top10Kw: "Keywords ranking in Top 10 positions.",
  organicTraffic: "Estimated monthly organic visits.",
  refDomains: "Unique referring domains.",
  backlinks: "Total backlinks (may include nofollow).",
  pageSpeedSec: "Average load speed (lower is better).",
  actions: "Deep links: Gaps, Profile, Analyze.",
};

/* ───────────────────────── Component ───────────────────────── */
export default function CI_Section2_ComparisonTable() {
  /* Data */
  const [rows, setRows] = useState<Row[]>(() => makeRows());

  /* Column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as Record<ColKey, boolean>)
  );

  /* Sorting */
  const [sortBy, setSortBy] = useState<ColKey>("seoScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    const col = COLS.find(c => c.key === key);
    if (!col?.sortable) return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);

  /* Expanders */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      if (multiExpand) return { ...prev, [id]: !prev[id] };
      const next: Record<string, boolean> = {};
      if (!prev[id]) next[id] = true;
      return next;
    });
  };

  /* Infinite vs pagination */
  const [infinite, setInfinite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(40);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* Filters */
  const [query, setQuery] = useState("");
  type PerfChip = "all" | "outperforming" | "lagging" | "parity";
  const [chip, setChip] = useState<PerfChip>("all");
  const [minWR, setMinWR] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(5);

  const you = useMemo(() => rows.find(r => r.isYou)!, [rows]);

  /* Filtering */
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (query && !r.domain.toLowerCase().includes(query.toLowerCase())) return false;
      if (r.wrScore < minWR) return false;
      if (r.pageSpeedSec > maxSpeed) return false;
      if (chip !== "all" && !r.isYou) {
        const better = (val:number, base:number, higherBetter=true) => trend(val, base, higherBetter).dir === "up";
        const parity = (val:number, base:number, higherBetter=true) => trend(val, base, higherBetter).dir === "neutral";
        const isOutperforming =
          better(r.seoScore, you.seoScore) ||
          better(r.wrScore, you.wrScore) ||
          better(r.top10Kw, you.top10Kw) ||
          better(r.organicTraffic, you.organicTraffic) ||
          better(r.refDomains, you.refDomains) ||
          better(you.pageSpeedSec, r.pageSpeedSec, true); // speed: lower better → invert compare
        const isParity =
          parity(r.seoScore, you.seoScore) &&
          parity(r.wrScore, you.wrScore) &&
          parity(r.top10Kw, you.top10Kw) &&
          parity(r.organicTraffic, you.organicTraffic) &&
          parity(r.refDomains, you.refDomains) &&
          parity(r.pageSpeedSec, you.pageSpeedSec, false);
        if (chip === "outperforming" && !isOutperforming) return false;
        if (chip === "lagging" && (isOutperforming || isParity)) return false;
        if (chip === "parity" && !isParity) return false;
      }
      return true;
    });
  }, [rows, query, chip, minWR, maxSpeed, you]);

  /* Sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: Row): any => {
      switch (sortBy) {
        case "domain": return (r.isYou ? "0" : "1") + r.domain; // keep "you" on top if same sort
        case "seoScore": return r.seoScore;
        case "wrScore": return r.wrScore;
        case "top10Kw": return r.top10Kw;
        case "organicTraffic": return r.organicTraffic;
        case "refDomains": return r.refDomains;
        case "backlinks": return r.backlinks;
        case "pageSpeedSec": return r.pageSpeedSec;
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

  /* Windowed */
  const windowedRows = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  /* Infinite observer */
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("compare-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount(v => Math.min(sorted.length, v + 40));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  /* Column helpers */
  const VISIBLE = useMemo(() => COLS.filter(c => visibleCols[c.key] !== false), [visibleCols]);
  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? { position: "sticky" as const, left: c.key === "select" ? 0 : c.key === "expander" ? 44 : 88, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : undefined;

  /* Page-scope selection */
  const pageIds = windowedRows.map(r => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected[id]);
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setSelected(prev => {
      const next = { ...prev };
      pageIds.forEach(id => { next[id] = checked; });
      return next;
    });
  };

  /* Export */
  const exportCSV = (onlySelected = false) => {
    const cols = VISIBLE.filter(c => !["select","expander","actions"].includes(c.key)).map(c => c.key);
    const hdr = VISIBLE.filter(c => !["select","expander","actions"].includes(c.key)).map(c => c.label);
    const src = onlySelected ? sorted.filter(r => selected[r.id]) : sorted;
    const map = (r: Row, key: ColKey): string | number => {
      switch (key) {
        case "domain": return r.domain + (r.isYou ? " (You)" : "");
        case "seoScore": return r.seoScore;
        case "wrScore": return r.wrScore;
        case "top10Kw": return r.top10Kw;
        case "organicTraffic": return r.organicTraffic;
        case "refDomains": return r.refDomains;
        case "backlinks": return r.backlinks;
        case "pageSpeedSec": return r.pageSpeedSec;
        default: return "";
      }
    };
    const lines = src.map(r => cols.map(k => JSON.stringify(map(r, k))).join(","));
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "comparison-selected.csv" : "comparison.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Locked export tooltip (freemium) */
  const [lockOpen, setLockOpen] = useState(false);
  const lockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!lockRef.current) return;
      if (!lockRef.current.contains(e.target as Node)) setLockOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  /* Expanded panel UI */
  const renderExpanded = (r: Row) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-md border"
         style={{ borderColor: TK.borderLight, background: TK.appBg }}>
      <div className="space-y-2">
        <div className="text-sm font-medium">SEO & Authority</div>
        <div className="flex items-center gap-3">
          <SEOBar value={r.seoScore} ariaLabel={`SEO score for ${r.domain}`} />
          <WRDonut value={r.wrScore} ariaLabel={`WR score for ${r.domain}`} />
        </div>
        <div className="text-xs text-muted-foreground">Baseline: <span className="font-medium">wranker.com</span></div>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Visibility & Links</div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
            <div className="text-xs" style={{ color: TK.muted }}>Top 10 KW</div>
            <div className="font-semibold">{nf(r.top10Kw)}</div>
          </div>
          <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
            <div className="text-xs" style={{ color: TK.muted }}>Traffic</div>
            <div className="font-semibold">{cf(r.organicTraffic)}</div>
          </div>
          <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
            <div className="text-xs" style={{ color: TK.muted }}>Ref. Domains</div>
            <div className="font-semibold">{nf(r.refDomains)}</div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Quick Actions</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={()=>console.log("View Gaps", r.domain)}><BarChart3 className="h-4 w-4 mr-1"/>View Gaps</Button>
          <Button size="sm" variant="outline" onClick={()=>console.log("Open Profile", r.domain)}><Eye className="h-4 w-4 mr-1"/>Open Profile</Button>
          <Button size="sm" variant="outline" onClick={()=>console.log("Backlink Gap", r.domain)}><LinkIcon className="h-4 w-4 mr-1"/>Backlink Gap</Button>
        </div>
        <div className="text-xs text-muted-foreground">{r.notes || "—"}</div>
      </div>
    </div>
  );

  /* Helpers to render number + trend vs You */
  const renderNum = (r: Row, val: number, base: number, fmt: (n:number)=>string = nf, higherBetter=true) => (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums">{fmt(val)}</span>
      {!r.isYou && <TrendChip v={val} base={base} betterWhenHigher={higherBetter} fmt={fmt}/>}
    </div>
  );

  const [drawerAnalyze, setDrawerAnalyze] = useState(false);
  const openAnalyze = () => {
    setDrawerAnalyze(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeAnalyze = () => {
    setDrawerAnalyze(false);
  };


  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
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
    <section className="space-y-3  py-2">
                                    {drawerRow && (
                          <Drawer title="Page Speed Optimization" onClose={closeDrawer}>
                            <PageSpeedOptimizationDrawer   />
                          </Drawer>
                        )}
                                                            {drawerAnalyze && (
                          <Drawer title="Content Audit Summary" onClose={closeAnalyze}>
                            <ContentAuditSummaryDrawerDemo   />
                          </Drawer>
                        )}
      <Card className="border mt-4" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* ─ Header bar ─ */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Competitor Insights — Comparison Table</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Side‑by‑side key SEO metrics for your project vs competitors.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Infinite toggle */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Infinite</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--wr-brand,#008CCD)]"
                checked={infinite}
                onChange={(e) => { setInfinite(e.target.checked); if (e.target.checked) setVisibleCount(40); }}
              />
            </div>

            {/* Expand-many toggle */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Expand multiple</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--wr-brand,#008CCD)]"
                checked={multiExpand}
                onChange={(e) => setMultiExpand(e.target.checked)}
              />
            </div>

            {/* Columns control */}
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
                        disabled={c.key === "select" || c.key === "expander" || c.key === "domain"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [c.key]: Boolean(v) }))}
                      />
                      <span>{c.label || c.key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm"
                          onClick={() => setVisibleCols(COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as any))}>
                    Reset
                  </Button>
                  <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <div className="relative" ref={lockRef}>
              <Button variant="outline" className="h-8 px-3" onClick={() => exportCSV(false)}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
                onClick={() => setLockOpen(o => !o)}
                aria-haspopup="dialog"
              >
                <FileSpreadsheet className="h-4 w-4" />
                XLSX/PDF
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {lockOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded border bg-white p-3 text-sm shadow"
                     style={{ borderColor: TK.border }}>
                  <div className="font-medium mb-1">Upgrade to Pro</div>
                  <p className="text-muted-foreground mb-2">Export XLSX and PDF are available on Pro plans.</p>
                  <div className="flex gap-2">
                    <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>View Plans</Button>
                    <Button size="sm" variant="outline" onClick={() => setLockOpen(false)}>Close</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Refresh demo data */}
            <Button variant="outline" className="h-8 px-3" onClick={() => setRows(makeRows())}>Refresh Demo</Button>
          </div>
        </CardHeader>

        {/* ─ Filter row ─ */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[260px] pl-7" placeholder="Search domain…"
                     value={query} onChange={(e) => { setQuery(e.target.value); if (!infinite) setPage(1); }} />
            </div>

            {/* Performance chips */}
            {([
              ["all","All"],
              ["outperforming","Outperforming"],
              ["lagging","Lagging"],
              ["parity","Parity"],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setChip(val as any); if (!infinite) setPage(1); }}
                className={`h-8 px-3 rounded-full border text-sm ${chip === val ? "font-semibold" : ""}`}
                style={{ borderColor: TK.borderLight, background: chip === val ? TK.pastelBlue : "#fff" }}
              >
                {label}
              </button>
            ))}

            {/* Min WR */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground">Min WR</span>
              <div className="w-[140px]">
                <Slider value={[minWR]} min={0} max={100} step={1}
                        onValueChange={(v) => { setMinWR((v as number[])[0]); if (!infinite) setPage(1); }} />
              </div>
              <span className="text-sm w-10 text-right">{minWR}</span>
            </div>

            {/* Max Speed */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Max Speed (s)</span>
              <div className="w-[140px]">
                <Slider value={[maxSpeed]} min={0.5} max={6} step={0.1}
                        onValueChange={(v) => { setMaxSpeed(Number((v as number[])[0])); if (!infinite) setPage(1); }} />
              </div>
              <span className="text-sm w-12 text-right">{one(maxSpeed)}</span>
            </div>

            {/* Pagination controls (right) when infinite OFF */}
            {!infinite && (
              <div className="ml-auto flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                  <SelectContent>{[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(1)}>First</Button>
                <Button variant="outline" className="h-8 px-3" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
                <div className="text-sm w-16 text-center">{page}</div>
                <Button variant="outline" className="h-8 px-3" disabled={(page*pageSize)>=sorted.length} onClick={()=>setPage(p=>p+1)}>Next</Button>
                <Button variant="outline" className="h-8 px-3" disabled={(page*pageSize)>=sorted.length} onClick={()=>setPage(Math.ceil(sorted.length / pageSize))}>Last</Button>
              </div>
            )}

            {/* Bulk bar */}
            {selectedIds.length > 0 && (
              <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
                <span className="text-sm"><strong>{selectedIds.length}</strong> selected</span>
                <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
                <Button size="sm" variant="outline" onClick={()=>console.log("Create tasks:", selectedIds)}>Create Tasks</Button>
                <Button size="sm" variant="outline" onClick={()=>exportCSV(true)}>Export Selection</Button>
                <Button size="sm" variant="outline" onClick={()=>console.log("Compare deeper (demo)")}>Compare Deeper</Button>
                <div className="ml-auto">
                  <Button size="sm" variant="ghost" onClick={()=>setSelected({})}>Clear</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* ─ Table ─ */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-40">
                <TableRow>
                  {VISIBLE.map(c => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }}
                      className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                    >
                      {c.key === "select" ? (
                        <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                      ) : c.sortable ? (
                        <span className="relative group cursor-help">
                          <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={()=>toggleSort(c.key)}>
                            <span>{c.label}</span>
                            {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnDescriptions[c.key]}
                          </span>
                        </span>
                      ) : (
                        <span className="relative group cursor-help">
                          {c.label}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnDescriptions[c.key]}
                          </span>
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowedRows.map(r => (
                  <React.Fragment key={r.id}>
                    <TableRow className="hover:bg-[#F8FAFC]">
                      {visibleCols.select !== false && (
                        <TableCell style={stickyStyle(COLS[0]) as any}>
                          <Checkbox checked={!!selected[r.id]} onCheckedChange={(v)=>setSelected(s=>({ ...s, [r.id]: Boolean(v) }))} />
                        </TableCell>
                      )}
                      {visibleCols.expander !== false && (
                        <TableCell style={stickyStyle(COLS[1]) as any}>
                          <button onClick={()=>toggleExpand(r.id)} aria-label={expanded[r.id] ? "Collapse" : "Expand"} className="rounded border p-1 hover:bg-muted">
                            {expanded[r.id] ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                          </button>
                        </TableCell>
                      )}
                      {visibleCols.domain !== false && (
                        <TableCell style={stickyStyle(COLS[2]) as any}>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${r.isYou ? "text-[#1090D0]" : ""}`}>{r.domain}{r.isYou ? " (You)" : ""}</span>
                            {r.isYou && <span className="px-1.5 py-0.5 text-[11px] rounded border" style={{ borderColor: TK.borderLight, background: TK.pastelBlue, color: TK.valueBlue }}>Baseline</span>}
                          </div>
                        </TableCell>
                      )}
                      {visibleCols.seoScore !== false && (
                        <TableCell>
                          <div className="flex items-center justify-between gap-2">
                            <SEOBar value={r.seoScore} ariaLabel={`SEO score for ${r.domain}`} />
                            {!r.isYou && <TrendChip v={r.seoScore} base={you.seoScore} />}
                          </div>
                        </TableCell>
                      )}
                      {visibleCols.wrScore !== false && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <WRDonut value={r.wrScore} ariaLabel={`WR score for ${r.domain}`} />
                            {!r.isYou && <TrendChip v={r.wrScore} base={you.wrScore} />}
                          </div>
                        </TableCell>
                      )}
                      {visibleCols.top10Kw !== false && (
                        <TableCell className="text-right">
                          {renderNum(r, r.top10Kw, you.top10Kw, nf, true)}
                        </TableCell>
                      )}
                      {visibleCols.organicTraffic !== false && (
                        <TableCell className="text-right">
                          {renderNum(r, r.organicTraffic, you.organicTraffic, cf, true)}
                        </TableCell>
                      )}
                      {visibleCols.refDomains !== false && (
                        <TableCell className="text-right">
                          {renderNum(r, r.refDomains, you.refDomains, nf, true)}
                        </TableCell>
                      )}
                      {visibleCols.backlinks !== false && (
                        <TableCell className="text-right">
                          {renderNum(r, r.backlinks, you.backlinks, nf, true)}
                        </TableCell>
                      )}
                      {visibleCols.pageSpeedSec !== false && (
                        <TableCell className="text-right">
                          {renderNum(r, r.pageSpeedSec, you.pageSpeedSec, one, /* speed better lower */ false)}
                        </TableCell>
                      )}
                      {visibleCols.actions !== false && (
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 opacity-60 hover:opacity-100 transition">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={()=>console.log("View Gaps", r.domain)}>
                                    <BarChart3 className="h-4 w-4 mr-1" /> Gaps
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open keyword / backlink gap</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={openDrawer}>
                                    <Eye className="h-4 w-4 mr-1" /> Profile
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open Competitor Profile</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={openAnalyze}>
                                    <ChevronsRight className="h-4 w-4 mr-1" /> Analyze
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Deep analysis</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>

                    {expanded[r.id] && (
                      <TableRow>
                        <TableCell colSpan={VISIBLE.length}>{renderExpanded(r)}</TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {infinite && <div id="compare-sentinel" className="h-8" />}
          </div>
        </CardContent>

        {/* Footer */}
        {infinite && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
            <div className="text-sm text-muted-foreground">Loaded {windowedRows.length} of {sorted.length}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-8 px-3" onClick={()=>setVisibleCount(v => Math.min(sorted.length, v + 60))}>Load more</Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
