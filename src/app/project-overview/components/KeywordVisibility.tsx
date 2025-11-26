"use client";

import * as React from "react";
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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import {
  ChevronDown, ChevronUp, ChevronsUpDown,
  SlidersHorizontal, Download, RefreshCw, Search, Eye, ClipboardList, Link as LinkIcon, ExternalLink,
  Sparkles, List, Image as ImageIcon, Video, Newspaper, HelpCircle, MapPin, ShoppingBag, PanelsTopLeft,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "#4286F5",
  pastelBlue: "#D9EEF8",
  ok: "#22C55E",
  warn: "#F59E0B",
  critical: "#EF4444",
  radius: "var(--wr-radius, 6px)",
  chipBg: "#FFFFFF",
  chipHover: "#F5F7FA",
};

/* ───────────────────────── Types ───────────────────────── */
type MoverType = "winner" | "loser" | "new" | "lost";
type SerpFeature =
  | "featured_snippet" | "sitelinks" | "images" | "videos" | "top_stories"
  | "paa" | "local_pack" | "shopping" | "knowledge_panel";
type Intent = "info" | "commercial" | "navigational" | "transactional";

export type TrendPoint = { t: string; position?: number | null; clicks?: number; impressions?: number; ctr?: number };

export type TopMoverRow = {
  id: string;
  keyword: string;

  pos_now: number | null;  // 1..100 or null (>100/unranked)
  pos_prev: number | null; // 1..100 or null
  delta_pos: number;       // pos_prev – pos_now (positive = improvement)

  clicks_now: number;
  clicks_prev: number;
  impressions_now: number;
  impressions_prev: number;

  url_now: string;
  url_prev?: string | null;
  url_changed: boolean;

  mover_type: MoverType;

  features: SerpFeature[];
  intent?: Intent;

  trend: TrendPoint[];
  serp_sample: Array<{ position: number; title: string; url: string; domain: string; features?: SerpFeature[] }>;
};

/* ───────────────────────── Utilities ───────────────────────── */
function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}
function pct(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return "—";
  const d = ((a - b) / Math.abs(b)) * 100;
  const s = (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1) + "%";
  return s;
}
function isoNDaysAgo(n: number) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}

/* ───────────────────────── Feature icon map ───────────────────────── */
const FEATURE_META: Record<SerpFeature, { label: string; icon: React.ComponentType<any>; color: string }> = {
  featured_snippet: { label: "Featured Snippet", icon: Sparkles, color: "#2563EB" },
  sitelinks:       { label: "Sitelinks",         icon: List,     color: "#64748B" },
  images:          { label: "Image Pack",        icon: ImageIcon,color: "#0EA5E9" },
  videos:          { label: "Videos",            icon: Video,    color: "#8B5CF6" },
  top_stories:     { label: "Top Stories",       icon: Newspaper,color: "#F59E0B" },
  paa:             { label: "People Also Ask",   icon: HelpCircle,color:"#22C55E" },
  local_pack:      { label: "Local Pack",        icon: MapPin,   color: "#EF4444" },
  shopping:        { label: "Shopping",          icon: ShoppingBag,color:"#10B981" },
  knowledge_panel: { label: "Knowledge Panel",   icon: PanelsTopLeft, color: "#4F46E5" },
};

/* ───────────────────────── Mock data generator ───────────────────────── */
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sample<T>(xs: T[], n: number) {
  const c = xs.slice(); const out: T[] = [];
  while (out.length < n && c.length) out.push(c.splice(randInt(0, c.length - 1), 1)[0]);
  return out;
}
function makeTrend(days = 28, posNow: number | null, clicksNow: number, impressionsNow: number): TrendPoint[] {
  const arr: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = isoNDaysAgo(i);
    const pos = posNow ? clamp(posNow + Math.round((Math.random() - 0.5) * 6), 1, 100) : null;
    const impr = clamp(Math.round(impressionsNow * (0.6 + Math.random() * 0.8)), 0, impressionsNow * 2);
    const clk = clamp(Math.round(clicksNow * (0.6 + Math.random() * 0.8)), 0, clicksNow * 2);
    const ctr = impr > 0 ? (clk / impr) * 100 : 0;
    arr.push({ t, position: pos, impressions: impr, clicks: clk, ctr });
  }
  return arr;
}
function makeSerpSample(): TopMoverRow["serp_sample"] {
  return Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    title: `SERP result ${i + 1} — Lorem ipsum dolor sit amet`,
    url: "#",
    domain: ["example.com", "brand.io", "site.net", "docs.dev", "portal.app"][i % 5],
    features: sample(Object.keys(FEATURE_META) as SerpFeature[], randInt(0, 2)),
  }));
}

function classifyMover(posNow: number | null, posPrev: number | null): MoverType {
  const nowBad = posNow == null || posNow > 100;
  const prevBad = posPrev == null || posPrev > 100;
  if (!prevBad && nowBad) return "lost";
  if (prevBad && !nowBad) return "new";
  if (!nowBad && !prevBad) {
    const delta = (posPrev! - posNow!);
    if (delta > 0) return "winner";
    if (delta < 0) return "loser";
  }
  return "winner"; // neutral treated as minor improvement for surfacing
}

function makeTopMovers(n = 120): TopMoverRow[] {
  const intents: Intent[] = ["info", "commercial", "navigational", "transactional"];
  const rows: TopMoverRow[] = [];
  for (let i = 0; i < n; i++) {
    // Simulate NEW/LOST/W/L distribution
    const dice = Math.random();
    let pos_prev: number | null = randInt(2, 80);
    let pos_now: number | null = clamp(pos_prev + randInt(-15, 15), 1, 100);

    if (dice < 0.08) { // lost
      pos_now = null;
    } else if (dice < 0.16) { // new
      pos_prev = null;
      pos_now = randInt(2, 40);
    }

    const mover_type = classifyMover(pos_now, pos_prev);
    const delta_pos = (pos_prev ?? 120) - (pos_now ?? 120);

    const impressions_now = clamp(randInt(20, 18000), 0, 50000);
    const clicks_now = Math.round(impressions_now * (0.02 + Math.random() * 0.1));
    const impressions_prev = clamp(Math.round(impressions_now * (0.7 + Math.random() * 0.5)), 0, 50000);
    const clicks_prev = Math.round(impressions_prev * (0.02 + Math.random() * 0.1));

    const basePath = `/category/${1 + (i % 7)}/page-${i + 1}`;
    const changed = Math.random() > 0.82;
    const url_now = basePath + (changed ? "-alt" : "");
    const url_prev = changed ? basePath : basePath + (Math.random() > 0.5 ? "" : "-v2");

    const features = sample(Object.keys(FEATURE_META) as SerpFeature[], randInt(0, 3));
    const intent: Intent = intents[i % intents.length];

    rows.push({
      id: "kw-" + (i + 1),
      keyword: `seo audit tool ${i + 1}`,
      pos_now, pos_prev, delta_pos,
      clicks_now, clicks_prev,
      impressions_now, impressions_prev,
      url_now, url_prev, url_changed: url_now !== url_prev,
      mover_type,
      features,
      intent,
      trend: makeTrend(28, pos_now, clicks_now, impressions_now),
      serp_sample: makeSerpSample(),
    });
  }
  return rows;
}

/* ───────────────────────── Small primitives ───────────────────────── */
const ChipBtn: React.FC<React.PropsWithChildren<{ active?: boolean; onClick?: () => void; title?: string }>> = ({ active, onClick, children, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={cx("h-8 px-3 rounded-full border text-sm transition-colors", active ? "font-semibold" : undefined)}
    style={{ borderColor: TK.borderLight, background: active ? TK.pastelBlue : "#fff" }}
  >
    {children}
  </button>
);

const DeltaChip: React.FC<{ delta: number; className?: string }> = ({ delta, className }) => {
  if (!Number.isFinite(delta) || delta === 0) return <span className={cx("text-xs", className)} style={{ color: TK.muted }}>—</span>;
  const up = delta > 0;
  return (
    <span
      className={cx("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded", className)}
      style={{ color: up ? TK.ok : TK.critical, background: up ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)", border: `1px solid ${TK.borderLight}` }}
    >
      {up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {up ? "+" : "−"}{Math.abs(delta)}
    </span>
  );
};

const MoverBadge: React.FC<{ type: MoverType }> = ({ type }) => {
  if (type === "new") return <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: TK.ok, border: `1px solid ${TK.borderLight}` }}>New</span>;
  if (type === "lost") return <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: TK.critical, border: `1px solid ${TK.borderLight}` }}>Lost</span>;
  return null;
};

const FeatureDots: React.FC<{ features: SerpFeature[] }> = ({ features }) => (
  <div className="flex items-center gap-1.5">
    <TooltipProvider>
      {(Object.keys(FEATURE_META) as SerpFeature[]).map((f) => {
        const m = FEATURE_META[f];
        const active = features.includes(f);
        const Icon = m.icon;
        return (
          <Tooltip key={f}>
            <TooltipTrigger asChild>
              <span className={cx("inline-grid place-items-center h-6 w-6 rounded-full border", active ? "" : "opacity-40")}
                    style={{ borderColor: TK.borderLight }}>
                <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{m.label}{active ? " • Present" : " • Not present"}</TooltipContent>
          </Tooltip>
        );
      })}
    </TooltipProvider>
  </div>
);

/* ───────────────────────── Feature filter popover ───────────────────────── */
type FeatureMode = "any" | "all" | "without";
const FeatureFilter: React.FC<{
  selected: SerpFeature[];
  mode: FeatureMode;
  onChange: (next: { selected: SerpFeature[]; mode: FeatureMode }) => void;
}> = ({ selected, mode, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const toggle = (f: SerpFeature) => {
    const has = selected.includes(f);
    onChange({ selected: has ? selected.filter(x => x !== f) : [...selected, f], mode });
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
          <SlidersHorizontal className="h-4 w-4" /> Features
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px]">
        <div className="text-sm font-medium mb-2">Filter by SERP features</div>
        <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-auto pr-1">
          {(Object.keys(FEATURE_META) as SerpFeature[]).map((f) => {
            const meta = FEATURE_META[f];
            const checked = selected.includes(f);
            const Icon = meta.icon;
            return (
              <label key={f} className={cx("flex items-center gap-2 rounded border px-2 py-1.5 cursor-pointer",
                checked ? "ring-1 ring-offset-1" : undefined)}
                     style={{ borderColor: TK.borderLight }}>
                <Checkbox checked={checked} onCheckedChange={() => toggle(f)} />
                <Icon className="h-4 w-4" style={{ color: meta.color }} />
                <span className="text-sm">{meta.label}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-3">
          <div className="text-xs mb-1 text-muted-foreground">Match mode</div>
          <div className="flex items-center gap-2">
            {(["any","all","without"] as FeatureMode[]).map(m => (
              <button key={m}
                className={cx("h-8 px-2 rounded border text-sm", mode === m ? "font-semibold" : undefined)}
                style={{ borderColor: TK.borderLight, background: mode === m ? TK.pastelBlue : "#fff" }}
                onClick={() => onChange({ selected, mode: m })}
              >
                {m === "any" ? "Any selected" : m === "all" ? "All selected" : "Without selected"}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ───────────────────────── Drawer mini KPI & chart ───────────────────────── */
const MiniKpi: React.FC<{ label: string; value: string; delta?: string; good?: boolean | null }> = ({ label, value, delta, good }) => (
  <div className="rounded border p-3" style={{ borderColor: TK.borderLight, background: "#FFFFFF" }}>
    <div className="text-xs" style={{ color: TK.muted }}>{label}</div>
    <div className="mt-1 text-lg font-semibold" style={{ color: TK.text }}>{value}</div>
    {delta && (
      <div className="text-xs mt-0.5" style={{ color: good == null ? TK.muted : good ? TK.ok : TK.critical }}>
        {delta}
      </div>
    )}
  </div>
);

// very small simple inline chart
const MiniTrend: React.FC<{ rows: TrendPoint[]; metric: "position" | "clicks" | "impressions" | "ctr" }> = ({ rows, metric }) => {
  const W = 560, H = 160, pad = 22;
  const pts = rows.map(r => r[metric] ?? 0);
  const min = metric === "position" ? Math.min(...pts, 1) : Math.min(...pts, 0);
  const max = Math.max(...pts, 1);
  const xAt = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, rows.length - 1);
  const yAt = (v: number) => {
    // invert position (lower is better)
    const norm = metric === "position" ? (v - min) / Math.max(1e-6, max - min) : 1 - (v - min) / Math.max(1e-6, max - min);
    return pad + norm * (H - pad * 2);
  };
  const poly = pts.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect x={0} y={0} width={W} height={H} fill="#fff" />
      {[0, 0.5, 1].map((p, i) => {
        const y = pad + p * (H - pad * 2);
        return <line key={i} x1={pad} x2={W - pad} y1={y} y2={y} stroke={TK.borderLight} />;
      })}
      <polyline fill="none" stroke={TK.valueBlue} strokeWidth={2} points={poly} />
    </svg>
  );
};

/* ───────────────────────── Column model ───────────────────────── */
type ColKey = "keyword" | "position" | "clicks" | "url" | "intent" | "features" | "actions";
type ColDef = { key: ColKey; label: string; width?: number; align?: "left" | "right" | "center"; sortable?: boolean; sticky?: boolean };
const COLS: ColDef[] = [
  { key: "keyword",  label: "Keyword",          width: 320, sortable: true, sticky: true },
  { key: "position", label: "Pos → Δ",          width: 170, sortable: true, align: "center" },
  { key: "clicks",   label: "Clicks",           width: 120, sortable: true, align: "right" },
  { key: "url",      label: "URL",              width: 280, sortable: true, sticky: true },
  { key: "intent",   label: "Intent",           width: 140, sortable: true },
  { key: "features", label: "Features",         width: 160 },
  { key: "actions",  label: "Actions",          width: 180, align: "center" },
];

/* ───────────────────────── Main Component ───────────────────────── */
interface TopMoversTableProps {
  rows?: TopMoverRow[];
}

export default function TopMoversTable({ rows: providedRows }: TopMoversTableProps = {}) {
  /* Data */
  const rows = React.useMemo<TopMoverRow[]>(() => {
    if (providedRows !== undefined) {
      return providedRows;
    }
    return makeTopMovers(120);
  }, [providedRows]);

  /* Header scope (window + segments) */
  const [windowKey, setWindowKey] = React.useState<"last_7"|"last_14"|"last_28"|"last_90">("last_28");
  const [device, setDevice] = React.useState<"all"|"desktop"|"mobile">("all");
  const [country, setCountry] = React.useState<string>("ALL");

  /* Filters */
  const [query, setQuery] = React.useState("");
  const [mover, setMover] = React.useState<"all" | MoverType>("all");
  const [minDelta, setMinDelta] = React.useState<number>(3);
  const [minImpr, setMinImpr] = React.useState<number>(50);
  const [featuresSel, setFeaturesSel] = React.useState<SerpFeature[]>([]);
  const [featuresMode, setFeaturesMode] = React.useState<FeatureMode>("any");

  /* Column & sorting */
  const [kwWidth, setKwWidth] = React.useState<number>(320);
  const [sortBy, setSortBy] = React.useState<ColKey>("position");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const toggleSort = (key: ColKey) => {
    if (!COLS.find(c => c.key === key)?.sortable) return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };

  /* Pagination */
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  /* Drawer (Analyzer) */
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [active, setActive] = React.useState<TopMoverRow | null>(null);
  const openDrawer = (r: TopMoverRow) => { setActive(r); setDrawerOpen(true); };

  /* Resizer: keyword column */
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = kwWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(220, Math.min(560, start + (ev.clientX - startX)));
      setKwWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* Filtering */
  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      // search on keyword or url path
      if (query) {
        const q = query.toLowerCase();
        if (!r.keyword.toLowerCase().includes(q) && !r.url_now.toLowerCase().includes(q)) return false;
      }
      // mover chip
      if (mover !== "all" && r.mover_type !== mover) return false;

      // min delta (for new/lost, treat as pass if they are selected in 'all' too)
      const absDelta = Math.abs(r.delta_pos);
      const rankedChange = (r.pos_now != null && r.pos_prev != null);
      if (rankedChange && absDelta < minDelta) return false;

      // impressions threshold
      if (r.impressions_now < minImpr) return false;

      // feature filter
      if (featuresSel.length > 0) {
        const present = new Set(r.features);
        if (featuresMode === "any") {
          if (!featuresSel.some(f => present.has(f))) return false;
        } else if (featuresMode === "all") {
          if (!featuresSel.every(f => present.has(f))) return false;
        } else { // without
          if (featuresSel.some(f => present.has(f))) return false;
        }
      }

      // device/country are no-ops in demo (available for wiring)
      return true;
    });
  }, [rows, query, mover, minDelta, minImpr, featuresSel, featuresMode]);

  /* Sorting */
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const getter = (r: TopMoverRow): any => {
      switch (sortBy) {
        case "keyword":  return r.keyword;
        case "url":      return r.url_now;
        case "intent":   return r.intent ?? "";
        case "clicks":   return r.clicks_now;
        case "position": return { absDelta: Math.abs(r.delta_pos), delta: r.delta_pos, pos: r.pos_now ?? 999 };
        default:         return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a), bv = getter(b);
      if (sortBy === "position") {
        // primary: abs(delta) desc/asc
        if (av.absDelta !== bv.absDelta) return sortDir === "asc" ? (av.absDelta - bv.absDelta) : (bv.absDelta - av.absDelta);
        // secondary: raw delta (winners first on desc)
        if (av.delta !== bv.delta) return sortDir === "asc" ? (av.delta - bv.delta) : (bv.delta - av.delta);
        // tertiary: current pos asc
        return av.pos - bv.pos;
      }
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Pagination window */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const windowRows = React.useMemo(() => sorted.slice(pageStart, pageStart + pageSize), [sorted, pageStart, pageSize]);

  /* Sticky helpers */
  const stickyStyle = (key: ColKey) => {
    if (key === "keyword") return { position: "sticky" as const, left: 0, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" };
    if (key === "url")     return { position: "sticky" as const, left: kwWidth, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" };
    return undefined;
  };

  /* CSV export (all filtered + sorted rows, respecting current columns order) */
  const exportCSV = () => {
    const headers = ["Keyword", "Pos Now", "Pos Prev", "Delta", "Clicks", "URL", "Intent", "Features"];
    const rowsCsv = sorted.map(r => {
      const feat = r.features.map(f => FEATURE_META[f].label).join("|");
      return [
        r.keyword,
        r.pos_now == null ? ">100" : "#" + r.pos_now,
        r.pos_prev == null ? ">100" : "#" + r.pos_prev,
        (r.delta_pos > 0 ? "+" : "") + r.delta_pos,
        r.clicks_now,
        r.url_now,
        r.intent ?? "",
        feat,
      ].map(v => JSON.stringify(v)).join(",");
    });
    const csv = [headers.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-movers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="space-y-3 px-2 py-2 mt-4">
      <Card className=" " style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* ─ Header bar ─ */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <CardTitle className="text-lg">Keyword Visibility — Top Movers</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Window */}
            <Select value={windowKey} onValueChange={(v: any) => setWindowKey(v)}>
              <SelectTrigger className="h-8 px-3 w-[150px]"><SelectValue placeholder="Window" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7">Last 7 days</SelectItem>
                <SelectItem value="last_14">Last 14 days</SelectItem>
                <SelectItem value="last_28">Last 28 days</SelectItem>
                <SelectItem value="last_90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {/* Device */}
            <Select value={device} onValueChange={(v: any) => setDevice(v)}>
              <SelectTrigger className="h-8 px-3 w-[130px]"><SelectValue placeholder="Device" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>

            {/* Country (single for now) */}
            <Select value={country} onValueChange={(v: any) => setCountry(v)}>
              <SelectTrigger className="h-8 px-3 w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All countries</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
              </SelectContent>
            </Select>

            {/* (Optional) Column picker placeholder */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm text-muted-foreground">
                  Columns are pre-optimized in this demo. (Intent is Phase 2)
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Button variant="outline" className="h-8 px-3" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>

            {/* Refresh */}
            <Button variant="outline" className="h-8 px-3" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardHeader>

        {/* ─ Filter bar ─ */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[280px] pl-7" placeholder="Search keyword or URL…"
                     value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            </div>

            {/* Mover chips */}
            <ChipBtn active={mover === "all"}    onClick={() => { setMover("all"); setPage(1); }}>All</ChipBtn>
            <ChipBtn active={mover === "winner"} onClick={() => { setMover("winner"); setPage(1); }}>Winners ↑</ChipBtn>
            <ChipBtn active={mover === "loser"}  onClick={() => { setMover("loser"); setPage(1); }}>Losers ↓</ChipBtn>
            <ChipBtn active={mover === "new"}    onClick={() => { setMover("new"); setPage(1); }}>New</ChipBtn>
            <ChipBtn active={mover === "lost"}   onClick={() => { setMover("lost"); setPage(1); }}>Lost</ChipBtn>

            {/* Min Δ Pos */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground">Min Δ Pos</span>
              <div className="w-[140px]">
                <Slider value={[minDelta]} min={0} max={40} step={1}
                        onValueChange={(v) => { setMinDelta((v as number[])[0]); setPage(1); }} />
              </div>
              <span className="text-sm w-10 text-right">{minDelta}</span>
            </div>

            {/* Min Impressions */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Min Impressions</span>
              <div className="w-[160px]">
                <Slider value={[minImpr]} min={0} max={10000} step={100}
                        onValueChange={(v) => { setMinImpr((v as number[])[0]); setPage(1); }} />
              </div>
              <span className="text-sm w-14 text-right">{minImpr}</span>
            </div>

            {/* Features popover */}
            <FeatureFilter
              selected={featuresSel}
              mode={featuresMode}
              onChange={({ selected, mode }) => { setFeaturesSel(selected); setFeaturesMode(mode); setPage(1); }}
            />

            {/* Pagination (right) */}
            <div className="ml-auto flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v: any) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                <SelectContent>
                  {[25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage(1)}>First</Button>
              <Button variant="outline" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <div className="text-sm w-16 text-center">{page} / {totalPages}</div>
              <Button variant="outline" className="h-8 px-3" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              <Button variant="outline" className="h-8 px-3" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last</Button>
            </div>
          </div>
        </CardContent>

        {/* ─ Table ─ */}
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="border-t py-10 text-center text-sm" style={{ borderColor: TK.borderLight, color: TK.muted }}>
              No keywords match the current filters.
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
              <Table className="text-sm">
              <TableHeader className="bg-white">
                <TableRow>
                  {COLS.map(c => (
                    <TableHead key={c.key}
                      style={{
                        minWidth: c.key === "keyword" ? kwWidth : c.width,
                        width: c.key === "keyword" ? kwWidth : c.width,
                        ...stickyStyle(c.key),
                      }}
                      className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                    >
                      {c.key === "keyword" ? (
                        <div className="relative select-none">
                          <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("keyword")}>
                            <span>{c.label}</span>
                            {sortBy === "keyword" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <span onMouseDown={startResize} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" title="Drag to resize" />
                        </div>
                      ) : c.sortable ? (
                        <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(c.key)}>
                          <span>{c.label}</span>
                          {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      ) : (c.label)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowRows.map(r => (
                  <TableRow key={r.id} className="hover:bg-[#F8FAFC] cursor-pointer" onClick={() => openDrawer(r)}>
                    {/* Keyword (sticky) */}
                    <TableCell style={{ ...stickyStyle("keyword"), minWidth: kwWidth, width: kwWidth }}>
                      <div className="font-medium flex items-center gap-2">
                        <span className="truncate">{r.keyword}</span>
                        <MoverBadge type={r.mover_type} />
                      </div>
                    </TableCell>

                    {/* Position → Δ */}
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="text-sm">{r.pos_now == null ? ">100" : `#${r.pos_now}`}</span>
                        <DeltaChip delta={r.delta_pos} />
                      </div>
                    </TableCell>

                    {/* Clicks */}
                    <TableCell className="text-right">{fmt(r.clicks_now)}</TableCell>

                    {/* URL (sticky) */}
                    <TableCell style={{ ...stickyStyle("url") }}>
                      <div className="flex items-center gap-2">
                        <a href={r.url_now} className="underline truncate" style={{ color: TK.valueBlue }} onClick={(e) => e.stopPropagation()}>
                          {r.url_now}
                        </a>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.url_changed && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ border: `1px solid ${TK.borderLight}`, color: TK.valueBlue, background: "#F0F7FF" }}>
                                  Changed
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Prev: {r.url_prev}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>

                    {/* Intent (Phase 2 ready) */}
                    <TableCell>
                      {r.intent ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: r.intent === "commercial" ? TK.ok : r.intent === "transactional" ? TK.valueBlue : r.intent === "navigational" ? TK.warn : TK.muted }} />
                          <span className="text-[13px] leading-none">{r.intent}</span>
                        </span>
                      ) : "—"}
                    </TableCell>

                    {/* Features */}
                    <TableCell><FeatureDots features={r.features} /></TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => console.log("Add to tracking:", r.keyword)}>Add to Tracking</Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-[#4286F5]" aria-label="SERP">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View SERP Snapshot</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>

        {/* Bottom pagination */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm text-muted-foreground">
            Showing {sorted.length === 0 ? 0 : pageStart + 1}–{Math.min(sorted.length, pageStart + windowRows.length)} of {sorted.length}
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
                {[25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ─ Keyword Analyzer Drawer ─ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[680px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {active?.keyword}
              {active && <MoverBadge type={active.mover_type} />}
            </SheetTitle>
            <SheetDescription className="text-sm">
              Window: <strong>{windowKey.replace("_", " ").replace("last ", "Last ")}</strong> • Device: <strong>{device}</strong> • Country: <strong>{country}</strong>
            </SheetDescription>
          </SheetHeader>

          {active && (
            <div className="mt-4 space-y-4">
              {/* KPI strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniKpi
                  label="Position"
                  value={active.pos_now == null ? ">100" : `#${active.pos_now}`}
                  delta={(active.pos_prev == null ? "—" : `${active.pos_prev > 100 ? ">100" : "#" + active.pos_prev} → Δ ${active.delta_pos > 0 ? "+" : ""}${active.delta_pos}`)}
                  good={active.delta_pos > 0 ? true : active.delta_pos < 0 ? false : null}
                />
                <MiniKpi
                  label="Clicks"
                  value={fmt(active.clicks_now)}
                  delta={pct(active.clicks_now, active.clicks_prev)}
                  good={active.clicks_now >= active.clicks_prev}
                />
                <MiniKpi
                  label="Impressions"
                  value={fmt(active.impressions_now)}
                  delta={pct(active.impressions_now, active.impressions_prev)}
                  good={active.impressions_now >= active.impressions_prev}
                />
                <MiniKpi
                  label="CTR"
                  value={active.impressions_now > 0 ? ((active.clicks_now / active.impressions_now) * 100).toFixed(1) + "%" : "—"}
                  delta={
                    active.impressions_prev > 0
                      ? pct(active.clicks_now / active.impressions_now, active.clicks_prev / active.impressions_prev)
                      : "—"
                  }
                  good={
                    active.impressions_prev > 0
                      ? (active.clicks_now / Math.max(1, active.impressions_now)) >= (active.clicks_prev / Math.max(1, active.impressions_prev))
                      : null
                  }
                />
              </div>

              {/* Trend toggles + chart */}
              <div className="rounded border p-3" style={{ borderColor: TK.borderLight, background: "#FFFFFF" }}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">Trend (window)</div>
                  <div className="flex items-center gap-2">
                    {/* toggles are nonfunctional in demo; choose metric below */}
                  </div>
                </div>
                <div className="mt-2">
                  {/* Show position trend by default */}
                  <MiniTrend rows={active.trend} metric="position" />
                </div>
              </div>

              {/* Landing page & SERP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Landing page */}
                <div className="rounded border p-3" style={{ borderColor: TK.borderLight, background: "#FFFFFF" }}>
                  <div className="text-sm font-medium mb-2">Landing Page</div>
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: TK.borderLight }}>Current</span>
                      <a href={active.url_now} className="underline truncate" style={{ color: TK.valueBlue }}>{active.url_now}</a>
                    </div>
                    {active.url_changed && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: TK.borderLight }}>Previous</span>
                        <a href={active.url_prev ?? "#"} className="underline truncate" style={{ color: TK.valueBlue }}>{active.url_prev ?? "—"}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* SERP Snapshot */}
                <div className="rounded border p-3" style={{ borderColor: TK.borderLight, background: "#FFFFFF" }}>
                  <div className="text-sm font-medium mb-2">SERP Snapshot (Top 10)</div>
                  <div className="space-y-1 text-sm">
                    {active.serp_sample.map(s => (
                      <div key={s.position} className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: TK.borderLight }}>{s.position}</span>
                        <span className="truncate flex-1">{s.title}</span>
                        <a href={s.url} className="underline" style={{ color: TK.valueBlue }}>{s.domain}</a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="mt-4">
            <div className="flex items-center gap-2">
              <Button onClick={() => active && console.log("Add to tracking:", active.keyword)}>
                <ClipboardList className="h-4 w-4 mr-2" /> Add to Tracking
              </Button>
              <Button variant="outline" onClick={() => active && console.log("SERP snapshot:", active.keyword)}>
                <Eye className="h-4 w-4 mr-2" /> View SERP Snapshot
              </Button>
            </div>
            <SheetClose asChild>
              <Button variant="ghost">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}



