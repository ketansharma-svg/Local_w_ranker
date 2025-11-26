"use client";

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
  SlidersHorizontal, Download, Search, Info, Eye, ClipboardList, Link as LinkIcon, FileSpreadsheet, Lock, BarChart2, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import PageHeader from "./page-drawer/PagaHeader";

/* ───────────────────────── Design Tokens (CSS vars with fallbacks) ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)", // branded icons
  pastelBlue: "var(--wr-pastelBrand, #D9EEF8)",
  ok: "var(--wr-success, #2ECC71)",
  warn: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #FF6B6B)",
  radius: "var(--wr-radius, 10px)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
};

/* ───────────────────────── Types ───────────────────────── */
type ChangeType = "gain" | "loss" | "neutral" | "new";
type Row = {
  id: string;
  pageUrl: string;
  fullUrl: string;
  estTraffic: number;
  prevTraffic: number | null;
  trafficSharePct: number;
  keywordCount: number;
  topKeywords: string[];
  backlinks: number;
  visibilityPct: number;      // 0..100
  lastUpdated: string;        // ISO
  trafficSeries: number[];    // last 14 points
};

/* ───────────────────────── Utilities ───────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const pf = (n: number, fd = 1) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(n)}%`;
const shortUrl = (u: string) => (u.length <= 36 ? u : u.slice(0, 18) + "…" + u.slice(-16));
const deltaInfo = (curr: number, prev: number | null): { type: ChangeType; raw: number; pct?: number } => {
  if (prev === null || prev === 0) return { type: "new", raw: curr, pct: undefined };
  const raw = curr - prev;
  if (raw === 0) return { type: "neutral", raw: 0, pct: 0 };
  const pct = (raw / prev) * 100;
  return { type: raw > 0 ? "gain" : "loss", raw, pct };
};
const visColor = (v: number) => (v >= 60 ? TK.ok : v >= 30 ? TK.warn : TK.critical);

/* ───────────────────────── Mock data ───────────────────────── */
function makeRows(count = 70): Row[] {
  const paths = [
    "/tools/seo-software-saas",
    "/seo-audit/blog-checklist",
    "/link-building-services",
    "/content/seo-content-strategy",
    "/tools/schema-generator",
    "/tools/backlink-analyzer",
    "/blog/semrush-vs-ahrefs-comparo",
    "/blog/technical-seo-guide",
    "/product/ai-content-optimizer",
    "/academy/seo-course",
  ];
  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    const base = paths[i % paths.length] + (i >= paths.length ? `-${i}` : "");
    const prev = Math.random() > 0.14 ? Math.floor(200 + Math.random() * 2000) : null;
    const curr =
      prev === null
        ? Math.floor(200 + Math.random() * 1800)
        : Math.max(0, Math.floor(prev + (Math.random() * 2 - 1) * (prev * 0.45)));
    const share = Math.max(0.6, Math.min(18, (curr / 9800) * 100));
    const kw = 6 + Math.floor(Math.random() * 40);
    const b = Math.floor(Math.random() * 120);
    const vis = Math.floor(Math.random() * 100);
    const keywords = [
      "seo audit checklist",
      "technical seo tool",
      "best seo tool for saas",
      "schema generator",
      "backlink analyzer",
      "content strategy",
      "seo writing guide",
      "semrush vs ahrefs",
    ];
    const trafficSeries = Array.from({ length: 14 }, () =>
      Math.max(0, Math.round(curr * (0.8 + Math.random() * 0.4)))
    );
    const dt = new Date();
    dt.setDate(dt.getDate() - (i % 6));
    rows.push({
      id: `row-${i + 1}`,
      pageUrl: base,
      fullUrl: `https://www.example.com${base}`,
      estTraffic: curr,
      prevTraffic: prev,
      trafficSharePct: share,
      keywordCount: kw,
      topKeywords: shuffle(keywords).slice(0, 3),
      backlinks: b,
      visibilityPct: vis,
      lastUpdated: dt.toISOString().slice(0, 10),
      trafficSeries,
    });
  }
  return rows;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ───────────────────────── Modular UI (chips / toggles) ───────────────────────── */
function Segmented<V extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: V;
  items: { value: V; label: React.ReactNode }[];
  onChange: (v: V) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border }}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={String(it.value)}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(it.value)}
            className={`h-8 rounded-full px-3 text-sm transition cursor-pointer ${
              active ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
            }`}
            title={typeof it.label === "string" ? it.label : undefined}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: TK.border, color: active ? TK.text : TK.muted }}
      title={title || label}
    >
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full border"
        style={{
          borderColor: active ? TK.brand : TK.border,
          background: active ? "rgba(0,140,205,0.15)" : TK.appBg,
        }}
        aria-hidden
      >
        <span
          className="absolute h-4 w-4 rounded-full transition-transform"
          style={{
            background: TK.brand,
            transform: active ? "translateX(20px)" : "translateX(2px)",
          }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>{label}</span>
    </button>
  );
}

/* ───────────────────────── Small UI: Badges / Bars ───────────────────────── */
const DeltaBadge: React.FC<{ curr: number; prev: number | null }> = ({ curr, prev }) => {
  const d = deltaInfo(curr, prev);
  if (d.type === "new") {
    return (
      <span
        className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
        style={{ background: TK.pastelBlue, color: TK.brand, border: `1px solid ${TK.borderLight}` }}
      >
        NEW
      </span>
    );
  }
  if (d.type === "neutral") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
        style={{ background: "#F3F4F6", color: TK.muted, border: `1px solid ${TK.borderLight}` }}
      >
        <Minus className="h-3.5 w-3.5" /> 0
      </span>
    );
  }
  const up = d.type === "gain";
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold"
      style={{
        background: up ? "rgba(46,204,113,0.12)" : "rgba(255,107,107,0.12)",
        color: up ? TK.ok : TK.critical,
      }}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{" "}
      {nf(Math.abs(d.raw))}
      {typeof d.pct === "number" ? ` (${pf(Math.abs(d.pct), 1)})` : ""}
    </span>
  );
};

/** Progressive bar for Visibility (top edge curved only) */
const VisibilityBar: React.FC<{ value: number }> = ({ value }) => {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-3 w-24 bg-gray-200"
        style={{
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          overflow: "hidden",
        }}
        aria-label={`Visibility ${v}%`}
      >
        <div
          className="h-3 transition-[width] duration-300"
          style={{
            width: `${v}%`,
            background: visColor(v),
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }}
        />
      </div>
      <span className="text-xs" style={{ color: TK.muted }}>
        {v}%
      </span>
    </div>
  );
};

/* ───────────────────────── Interactive Mini Chart w/ Smart Popover ───────────────────────── */
const MiniTrafficChart: React.FC<{ series: number[] }> = ({ series }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; idx: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // trigger draw animation on mount
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const days = series.length || 14;
  const W = 520;
  const H = 160;
  const padL = 42;
  const padR = 10;
  const padT = 10;
  const padB = 28;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const niceMax = niceNumber(max);
  const niceMin = 0;

  const xFor = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, days - 1);
  const yFor = (v: number) => {
    const t = (v - niceMin) / Math.max(1, niceMax - niceMin);
    return H - padB - t * (H - padT - padB);
  };

  const d = series.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`).join(" ");

  const dates = useMemo(() => {
    const arr: string[] = [];
    const end = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      arr.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    }
    return arr;
  }, [days]);

  const xTicks = [0, Math.floor((days - 1) / 2), days - 1];
  const yTicks = computeTicks(niceMin, niceMax, 4);

  const onMove = (e: React.MouseEvent) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const clampedX = Math.max(padL, Math.min(W - padR, relX));
    const t = (clampedX - padL) / (W - padL - padR);
    const idx = Math.round(t * (days - 1));
    setHover({ x: xFor(idx), y: yFor(series[idx]), idx });
  };

  const onLeave = () => setHover(null);

  // smart popover positioning
  const popStyle = (): React.CSSProperties | undefined => {
    if (!hover || !ref.current) return;
    const width = 180;
    const height = 64;
    let left = hover.x - width / 2;
    if (left < padL) left = hover.x + 10;
    if (left + width > W - padR) left = hover.x - width - 10;
    const top = Math.max(padT, hover.y - height - 10);
    return {
      position: "absolute",
      left,
      top,
      width,
      height,
      background: "#fff",
      border: `1px solid ${TK.border}`,
      borderRadius: 8,
      boxShadow: "0 6px 18px rgba(0,0,0,.08)",
      padding: "8px 10px",
      pointerEvents: "none",
      fontSize: 12,
      zIndex: 10,
    };
  };

  return (
    <div ref={ref} className="relative select-none" onMouseMove={onMove} onMouseLeave={onLeave} style={{ cursor: "crosshair" }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Traffic trend (last 14 checks)">
        {/* Axes */}
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={TK.borderLight} />
        <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke={TK.borderLight} />

        {/* Y ticks + grid */}
        {yTicks.map((yt, i) => (
          <g key={`yt-${i}`}>
            <line x1={padL - 4} x2={padL} y1={yFor(yt)} y2={yFor(yt)} stroke={TK.borderLight} />
            <text x={padL - 8} y={yFor(yt) + 3} textAnchor="end" fontSize="10" fill={TK.muted}>
              {nf(yt)}
            </text>
            <line
              x1={padL}
              x2={W - padR}
              y1={yFor(yt)}
              y2={yFor(yt)}
              stroke={TK.borderLight}
              opacity={0.35}
              strokeDasharray="3 4"
            />
          </g>
        ))}

        {/* X ticks */}
        {xTicks.map((xi, i) => (
          <g key={`xt-${i}`}>
            <line x1={xFor(xi)} x2={xFor(xi)} y1={H - padB} y2={H - padB + 4} stroke={TK.borderLight} />
            <text x={xFor(xi)} y={H - 8} fontSize="10" textAnchor="middle" fill={TK.muted}>
              {dates[xi]}
            </text>
          </g>
        ))}

        {/* Line (animated draw) */}
        <path
          d={d}
          fill="none"
          stroke={TK.brand}
          strokeWidth={2}
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: animate ? 0 : 1,
            transition: "stroke-dashoffset 700ms ease-out",
            filter: "drop-shadow(0 0 0 rgba(0,0,0,0))",
          }}
        />

        {/* Hover marker */}
        {hover && (
          <>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={padT}
              y2={H - padB}
              stroke={TK.brand}
              strokeDasharray="4 4"
              opacity={0.75}
            />
            <circle cx={hover.x} cy={hover.y} r={3.5} fill={TK.brand} />
          </>
        )}
      </svg>

      {/* Smart popover with colored dot annotation */}
      {hover && (
        <div style={popStyle()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: TK.text, fontWeight: 600, marginBottom: 4 }}>
            <BarChart2 className="h-4 w-4" style={{ color: TK.brand }} />
            {dates[hover.idx]}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: TK.muted }}>
            <span
              style={{
                width: 8,
                height: 8,
                background: TK.brand,
                borderRadius: 4,
                display: "inline-block",
              }}
            />
            Traffic: <span style={{ color: TK.text, fontWeight: 600, marginLeft: 4 }}>{nf(series[hover.idx])}</span>
          </div>
        </div>
      )}
    </div>
  );
};

function niceNumber(max: number) {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const f = max / Math.pow(10, exp);
  let nf;
  if (f < 1.5) nf = 1;
  else if (f < 3) nf = 2;
  else if (f < 7) nf = 5;
  else nf = 10;
  return nf * Math.pow(10, exp);
}
function computeTicks(min: number, max: number, steps: number) {
  const span = max - min;
  if (span <= 0) return [min];
  const step = span / steps;
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) out.push(Math.round(min + i * step));
  return out;
}

/* ───────────────────────── Column Model ───────────────────────── */
type ColKey =
  | "select" | "expander" | "pageUrl" | "estTraffic" | "trafficDelta" | "trafficSharePct"
  | "keywordCount" | "topKeywords" | "backlinks" | "visibilityPct" | "lastUpdated" | "actions";

type ColDef = { key: ColKey; label: string; width?: number; align?: "left" | "right" | "center"; sortable?: boolean; sticky?: boolean };
const COLS: ColDef[] = [
  { key: "select", label: "", width: 44, align: "center", sticky: true },
  { key: "expander", label: "", width: 44, align: "center", sticky: true },
  { key: "pageUrl", label: "Page URL", width: 320, sortable: true, sticky: true },
  { key: "estTraffic", label: "Est. Traffic", width: 140, sortable: true, align: "right" },
  { key: "trafficDelta", label: "Traffic Δ", width: 160, sortable: true },
  { key: "trafficSharePct", label: "% of Total", width: 120, sortable: true, align: "right" },
  { key: "keywordCount", label: "Keywords", width: 110, sortable: true, align: "right" },
  { key: "topKeywords", label: "Top Keywords", width: 260 },
  { key: "backlinks", label: "Backlinks", width: 120, sortable: true, align: "right" },
  { key: "visibilityPct", label: "Visibility", width: 140, sortable: true, align: "center" },
  { key: "lastUpdated", label: "Last Updated", width: 120, sortable: true, align: "center" },
  { key: "actions", label: "Actions", width: 180 },
];

const columnDescriptions: Record<ColKey, string> = {
  select: "Select rows for bulk actions.",
  expander: "Expand to view an interactive traffic trend and quick actions.",
  pageUrl: "Relative path. Click to open Page Insights Drawer.",
  estTraffic: "Estimated monthly organic visits.",
  trafficDelta: "Change since previous period. NEW indicates newly ranking page.",
  trafficSharePct: "Share of site’s estimated organic traffic.",
  keywordCount: "Count of ranked keywords (Top 100).",
  topKeywords: "Preview of 1–3 high‑value keywords.",
  backlinks: "Number of referring domains / backlinks.",
  visibilityPct: "% of this page’s keywords in Top 10 (progress bar).",
  lastUpdated: "Last ranking/crawl refresh timestamp.",
  actions: "Quick actions (View, Keywords, Backlinks).",
};

/* ───────────────────────── Component ───────────────────────── */
export default function OVI_Tab4_PagesAdvancedTable() {
  const fontStyle = {
    fontFamily:
      'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
  } as const;

  /* Data */
  const [rows, setRows] = useState<Row[]>(() => makeRows());

  /* Column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as Record<ColKey, boolean>)
  );

  /* Sorting */
  const [sortBy, setSortBy] = useState<ColKey>("estTraffic");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    const col = COLS.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  /* Expanders */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
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
  const [changeType, setChangeType] = useState<"all" | "gains" | "losses" | "neutral" | "new">("all");
  const [minKeywords, setMinKeywords] = useState(0);
  const [minBacklinks, setMinBacklinks] = useState(0);
  const [visRange, setVisRange] = useState<[number, number]>([0, 100]);

  /* Filtering */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query) {
        const q = query.toLowerCase();
        if (
          !r.pageUrl.toLowerCase().includes(q) &&
          !r.topKeywords.some((k) => k.toLowerCase().includes(q))
        )
          return false;
      }
      const d = deltaInfo(r.estTraffic, r.prevTraffic);
      if (changeType !== "all") {
        if (changeType === "gains" && d.type !== "gain") return false;
        if (changeType === "losses" && d.type !== "loss") return false;
        if (changeType === "neutral" && d.type !== "neutral") return false;
        if (changeType === "new" && d.type !== "new") return false;
      }
      if (r.keywordCount < minKeywords) return false;
      if (r.backlinks < minBacklinks) return false;
      if (!(r.visibilityPct >= visRange[0] && r.visibilityPct <= visRange[1])) return false;
      return true;
    });
  }, [rows, query, changeType, minKeywords, minBacklinks, visRange]);

  /* Sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: Row): any => {
      switch (sortBy) {
        case "pageUrl":
          return r.pageUrl;
        case "estTraffic":
          return r.estTraffic;
        case "trafficDelta": {
          const d = deltaInfo(r.estTraffic, r.prevTraffic);
          return d.type === "new" ? Number.POSITIVE_INFINITY : d.raw;
        }
        case "trafficSharePct":
          return r.trafficSharePct;
        case "keywordCount":
          return r.keywordCount;
        case "backlinks":
          return r.backlinks;
        case "visibilityPct":
          return r.visibilityPct;
        case "lastUpdated":
          return r.lastUpdated;
        default:
          return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a),
        bv = getter(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Window (infinite or pagination) */
  const windowedRows = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  /* Infinite observer */
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("pages-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting)
        setVisibleCount((v) => Math.min(sorted.length, v + 40));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  /* Column visibility helpers */
  const VISIBLE = useMemo(
    () => COLS.filter((c) => visibleCols[c.key] !== false),
    [visibleCols]
  );

  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? {
          position: "sticky" as const,
          left: c.key === "select" ? 0 : c.key === "expander" ? 44 : 88,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        }
      : undefined;

  /* Page-scope selection */
  const pageIds = windowedRows.map((r) => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setSelected((prev) => {
      const next = { ...prev };
      pageIds.forEach((id) => {
        next[id] = checked;
      });
      return next;
    });
  };

  /* Export */
  const exportCSV = (onlySelected = false) => {
    const cols = VISIBLE.filter((c) => !["select", "expander", "actions"].includes(c.key)).map((c) => c.key);
    const hdr = VISIBLE.filter((c) => !["select", "expander", "actions"].includes(c.key)).map((c) => c.label);
    const src = onlySelected ? sorted.filter((r) => selected[r.id]) : sorted;
    const map = (r: Row, key: ColKey): string | number => {
      switch (key) {
        case "pageUrl":
          return r.fullUrl;
        case "estTraffic":
          return r.estTraffic;
        case "trafficDelta": {
          const d = deltaInfo(r.estTraffic, r.prevTraffic);
          if (d.type === "new") return "NEW";
          const sign = d.raw > 0 ? "+" : "";
          return `${sign}${d.raw}${typeof d.pct === "number" ? ` (${d.pct.toFixed(1)}%)` : ""}`;
        }
        case "trafficSharePct":
          return r.trafficSharePct.toFixed(2) + "%";
        case "keywordCount":
          return r.keywordCount;
        case "topKeywords":
          return r.topKeywords.join("; ");
        case "backlinks":
          return r.backlinks;
        case "visibilityPct":
          return r.visibilityPct + "%";
        case "lastUpdated":
          return r.lastUpdated;
        default:
          return "";
      }
    };
    const lines = src.map((r) => cols.map((k) => JSON.stringify(map(r, k))).join(","));
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected ? "pages-selected.csv" : "pages.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Expanded panel (only metrics not in main table + interactive chart) */
  const renderExpanded = (r: Row) => {
    const avg = Math.round(r.trafficSeries.reduce((s, v) => s + v, 0) / r.trafficSeries.length);
    const best = Math.max(...r.trafficSeries);
    const worst = Math.min(...r.trafficSeries);
    const volatility = Math.round(
      (stdDev(r.trafficSeries) / Math.max(1, avg)) * 100
    ); // coefficient of variation %


    return (
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-md border"
        style={{ borderColor: TK.borderLight, background: TK.appBg }}
      >

        {/* Left: Interactive mini chart with axes + smart popover */}
        <div>
          <div className="text-sm font-medium mb-1">Traffic Trend (last 14 checks)</div>
          <MiniTrafficChart series={r.trafficSeries} />
        </div>

        {/* Right: Only important / not-in-table metrics (mini cards) */}
        <div className="grid grid-cols-2 gap-3">
          <MiniCard title="14‑day Avg" value={nf(avg)} />
          <MiniCard title="Best Day" value={nf(best)} />
          <MiniCard title="Worst Day" value={nf(worst)} />
          <MiniCard title="Volatility (CV)" value={`${volatility}%`} />
          <MiniCard title="Last Updated" value={r.lastUpdated} />
          <MiniCard title="Page" value={shortUrl(r.pageUrl)} />
          <div className="col-span-2 mt-1 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-105"
              style={{ background: TK.brand, color: "#fff" }}
              onClick={openDrawer}
            >
              <Eye className="h-4 w-4 mr-1" /> Open Page Insights
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-105"
              onClick={() => console.log("View Backlinks:", r.fullUrl)}
            >
              <LinkIcon className="h-4 w-4 mr-1" /> Backlinks
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-105"
              onClick={() => console.log("View Top Keywords:", r.fullUrl)}
            >
              <ClipboardList className="h-4 w-4 mr-1" /> Top Keywords
            </Button>
          </div>
        </div>
      </div>
    );
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
          <aside className="absolute right-0 top-0 h-full w-[76vw] overflow-auto bg-white p-4 shadow-xl">
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
    <section className="space-y-3" style={fontStyle}>
      <Card className="border mx-4" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
                         {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <PageHeader   />
                    </Drawer>
                  )}
        {/* ─ Header bar ─ */}
        <CardHeader
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" style={{ color: TK.brand }} />
            <CardTitle className="text-lg" style={{ color: TK.text }}>
              Pages — Organic Visibility
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help" style={{ color: TK.brand }} />
                </TooltipTrigger>
                <TooltipContent>
                  Discover which pages drive organic traffic and how they trend.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Modular toggles (latest design) */}
            <ToggleSwitch
              label="Infinite"
              active={infinite}
              onClick={() => {
                const next = !infinite;
                setInfinite(next);
                if (next) setVisibleCount(40);
              }}
              title="Toggle infinite scrolling"
            />
            <ToggleSwitch
              label="Expand multiple"
              active={multiExpand}
              onClick={() => setMultiExpand((v) => !v)}
              title="Toggle multiple expansion"
            />

            {/* Columns control */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                  style={{ borderColor: TK.border }}
                  title="Show/Hide Columns"
                >
                  <SlidersHorizontal className="h-4 w-4" style={{ color: TK.brand }} />
                  Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {COLS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        disabled={c.key === "select" || c.key === "expander" || c.key === "pageUrl"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) =>
                          setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))
                        }
                      />
                      <span>{c.label || c.key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      setVisibleCols(COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as any))
                    }
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    style={{ background: TK.brand, color: "#fff" }}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Button
              variant="outline"
              className="h-8 px-3 cursor-pointer"
              onClick={() => exportCSV(false)}
            >
              <Download className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Export CSV
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                  style={{ borderColor: TK.border }}
                  title="XLSX/PDF (Pro)"
                >
                  <FileSpreadsheet className="h-4 w-4" style={{ color: TK.brand }} />
                  XLSX/PDF
                  <Lock className="h-3.5 w-3.5" style={{ color: TK.muted }} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="font-medium mb-1">Upgrade to Pro</div>
                <p className="text-sm" style={{ color: TK.muted }}>
                  Export XLSX and PDF are available on Pro plans.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="cursor-pointer" style={{ background: TK.brand, color: "#fff" }}>
                    View Plans
                  </Button>
                  <Button size="sm" variant="outline" className="cursor-pointer">
                    Close
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Refresh demo data */}
            <Button
              variant="outline"
              className="h-8 px-3 cursor-pointer"
              onClick={() => setRows(makeRows())}
            >
              Refresh Demo
            </Button>
          </div>
        </CardHeader>

        {/* ─ Filter row ─ */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search
                className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2"
                style={{ color: TK.brand }}
              />
              <Input
                className="w-[280px] pl-7"
                placeholder="Search by page URL or keyword…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!infinite) setPage(1);
                }}
              />
            </div>

            {/* Change type segmented chips */}
            <Segmented
              ariaLabel="Change filter"
              value={changeType}
              onChange={(v) => {
                setChangeType(v as any);
                if (!infinite) setPage(1);
              }}
              items={[
                { value: "all", label: "All" },
                { value: "gains", label: "Gains" },
                { value: "losses", label: "Losses" },
                { value: "neutral", label: "Neutral" },
                { value: "new", label: "New" },
              ]}
            />

            {/* Min Keywords */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm" style={{ color: TK.muted }}>
                Min Keywords
              </span>
              <div className="w-[140px]">
                <Slider
                  value={[minKeywords]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setMinKeywords((v as number[])[0]);
                    if (!infinite) setPage(1);
                  }}
                />
              </div>
              <span className="text-sm w-10 text-right">{minKeywords}</span>
            </div>

            {/* Min Backlinks */}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: TK.muted }}>
                Min Backlinks
              </span>
              <div className="w-[140px]">
                <Slider
                  value={[minBacklinks]}
                  min={0}
                  max={200}
                  step={5}
                  onValueChange={(v) => {
                    setMinBacklinks((v as number[])[0]);
                    if (!infinite) setPage(1);
                  }}
                />
              </div>
              <span className="text-sm w-12 text-right">{minBacklinks}</span>
            </div>

            {/* Visibility range */}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: TK.muted }}>
                Visibility %
              </span>
              <div className="w-[160px]">
                <Slider
                  value={visRange}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setVisRange(v as [number, number]);
                    if (!infinite) setPage(1);
                  }}
                />
              </div>
              <span className="text-sm w-16 text-right">
                {visRange[0]}–{visRange[1]}
              </span>
            </div>

            {/* Pagination controls (right) when infinite OFF */}
            {!infinite && (
              <div className="ml-auto flex items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v: any) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 px-3 w-[120px] cursor-pointer">
                    <SelectValue placeholder="Rows / page" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="h-8 px-3 cursor-pointer"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  className="h-8 px-3 cursor-pointer"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <div className="text-sm w-16 text-center">{page}</div>
                <Button
                  variant="outline"
                  className="h-8 px-3 cursor-pointer"
                  disabled={page * pageSize >= sorted.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  className="h-8 px-3 cursor-pointer"
                  disabled={page * pageSize >= sorted.length}
                  onClick={() => setPage(Math.ceil(sorted.length / pageSize))}
                >
                  Last
                </Button>
              </div>
            )}

            {/* Bulk bar */}
            {selectedIds.length > 0 && (
              <div
                className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2"
                style={{ borderColor: TK.borderLight }}
              >
                <span className="text-sm">
                  <strong>{selectedIds.length}</strong> selected
                </span>
                <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => console.log("Create tasks:", selectedIds)}
                >
                  Create Tasks
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => exportCSV(true)}
                >
                  Export Selection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => console.log("Recalculate (demo)")}
                >
                  Recalculate
                </Button>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer"
                    onClick={() => setSelected({})}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* ─ Table ─ */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-30">
                <TableRow>
                  {VISIBLE.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }}
                      className={
                        c.align === "center"
                          ? "text-center"
                          : c.align === "right"
                          ? "text-right"
                          : undefined
                      }
                    >
                      {c.key === "select" ? (
                        <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                      ) : c.sortable ? (
                        <span className="relative group">
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                            onClick={() => toggleSort(c.key)}
                            title={`Sort by ${c.label}`}
                          >
                            <span>{c.label}</span>
                            {sortBy === c.key ? (
                              sortDir === "asc" ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-4 w-4" />
                            )}
                          </button>
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnDescriptions[c.key]}
                          </span>
                        </span>
                      ) : (
                        <span className="relative group">
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
                {windowedRows.map((r) => (
                  <React.Fragment key={r.id}>
                    <TableRow className="hover:bg-[#F8FAFC]">
                      {visibleCols.select !== false && (
                        <TableCell style={stickyStyle(COLS[0]) as any}>
                          <Checkbox
                            checked={!!selected[r.id]}
                            onCheckedChange={(v) =>
                              setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))
                            }
                          />
                        </TableCell>
                      )}

                      {visibleCols.expander !== false && (
                        <TableCell style={stickyStyle(COLS[1]) as any}>
                          <button
                            onClick={() => toggleExpand(r.id)}
                            aria-label={expanded[r.id] ? "Collapse" : "Expand"}
                            className="rounded border p-1 hover:bg-muted cursor-pointer"
                          >
                            {expanded[r.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                      )}

                      {visibleCols.pageUrl !== false && (
                        <TableCell style={stickyStyle(COLS[2]) as any}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  className="font-medium underline cursor-pointer"
                                  style={{ color: TK.brand }}
                                  onClick={openDrawer}
                                >
                                  {shortUrl(r.pageUrl)}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>{r.fullUrl}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      {visibleCols.estTraffic !== false && (
                        <TableCell className="text-right">{nf(r.estTraffic)}</TableCell>
                      )}

                      {visibleCols.trafficDelta !== false && (
                        <TableCell>
                          <DeltaBadge curr={r.estTraffic} prev={r.prevTraffic} />
                        </TableCell>
                      )}

                      {visibleCols.trafficSharePct !== false && (
                        <TableCell className="text-right">{pf(r.trafficSharePct, 2)}</TableCell>
                      )}

                      {visibleCols.keywordCount !== false && (
                        <TableCell className="text-right">{r.keywordCount}</TableCell>
                      )}

                      {visibleCols.topKeywords !== false && (
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate cursor-help">
                                  {r.topKeywords.slice(0, 2).join(", ")}
                                  {r.topKeywords.length > 2 ? ", …" : ""}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[320px]">
                                {r.topKeywords.join(", ")}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      {visibleCols.backlinks !== false && (
                        <TableCell className="text-right">
                          <button
                            className="underline cursor-pointer"
                            style={{ color: TK.brand }}
                            onClick={() => console.log("Open Backlinks for page:", r.fullUrl)}
                          >
                            {nf(r.backlinks)}
                          </button>
                        </TableCell>
                      )}

                      {visibleCols.visibilityPct !== false && (
                        <TableCell className="text-center">
                          <VisibilityBar value={r.visibilityPct} />
                        </TableCell>
                      )}

                      {visibleCols.lastUpdated !== false && (
                        <TableCell className="text-center">{r.lastUpdated}</TableCell>
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
                                    aria-label="Open Page"
                                    className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-110"
                                    style={{ color: TK.brand }}
                                    onClick={openDrawer}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open Page</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Top Keywords"
                                    className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-110"
                                    style={{ color: TK.brand }}
                                  >
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Top Keywords</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Backlinks"
                                    className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-110"
                                    style={{ color: TK.brand }}
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Backlinks</TooltipContent>
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
            {infinite && <div id="pages-sentinel" className="h-8" />}
          </div>
        </CardContent>

        {/* Footer (when infinite ON show simple count; when OFF we have controls above) */}
        {infinite && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
            <div className="text-sm" style={{ color: TK.muted }}>
              Loaded {windowedRows.length} of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 px-3 cursor-pointer"
                onClick={() => setVisibleCount((v) => Math.min(sorted.length, v + 60))}
              >
                Load more
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

/* ───────────────────────── Mini helpers ───────────────────────── */
function stdDev(arr: number[]) {
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  const v = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}
const MiniCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="rounded border p-3" style={{ borderColor: TK.borderLight, background: "#fff" }}>
    <div className="text-xs mb-1" style={{ color: TK.muted }}>
      {title}
    </div>
    <div className="text-sm font-semibold" style={{ color: TK.text }}>
      {value}
    </div>
  </div>
);
