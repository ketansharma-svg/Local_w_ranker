"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  SlidersHorizontal,
  Download,
  Search,
  Info,
  Eye,
  ClipboardList,
  Link as LinkIcon,
  BarChart3, // brand icon for section title
} from "lucide-react";
import PageAnalyzer from "./page-drawer/PageAnalyzer";
/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)", // branded blue (icons, title)
  action: "var(--wr-action, #0077FF)", // bars
  pastelBlue: "var(--wr-pastelBlue, #D9EEF8)",
  ok: "#10B981", // line color
  warn: "#F59E0B",
  critical: "#E94134",
  radius: "6px",
  popoverBg: "#FFFFFF", // popover bg (same as other designs)
};

const FONT_STACK =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

/* ───────────────────────── Types & data ───────────────────────── */
type Device = "mobile" | "desktop";
type TaskStatus = "None" | "Assigned" | "In Progress" | "Completed";

type Point = { date: string; clicks: number; avgPosition: number };
type Row = {
  id: string;
  pageUrl: string;
  seoScore: number; // 0..100
  healthScore: number; // 0..100
  trackedKw: number;
  extKw: number;
  backlinks: number;
  wrScore: number; // 0..100
  clicks: number;
  impressions: number;
  ctr: number; // 0..1
  avgPosition: number; // lower is better
  taskStatus: TaskStatus;
  device: Device;
  series: Point[]; // last 30d perf for expander
};

function midEllipsis(url: string, max = 46) {
  if (url.length <= max) return url;
  const half = Math.floor((max - 3) / 2);
  return url.slice(0, half) + "..." + url.slice(-half);
}

function fmt(n: number) {
  return n >= 1000
    ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
    : String(n);
}

function scoreColor(n: number) {
  return n < 50 ? TK.critical : n < 75 ? TK.warn : TK.ok;
}

function makeSeries(): Point[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getTime() - (29 - i) * 86400000);
    const clicks = Math.max(
      0,
      Math.round(50 + 80 * Math.random() + (i - 15) * 1.2)
    );
    const avgPosition = Math.max(
      5,
      Math.min(45, 25 + (Math.random() - 0.5) * 12)
    );
    return { date: d.toISOString().slice(0, 10), clicks, avgPosition };
  });
}

function makeRows(n = 60): Row[] {
  const statuses: TaskStatus[] = [
    "None",
    "Assigned",
    "In Progress",
    "Completed",
  ];
  return Array.from({ length: n }, (_, i) => {
    const seo = Math.round(40 + Math.random() * 60);
    const health = Math.round(35 + Math.random() * 65);
    const wr = Math.round(30 + Math.random() * 70);
    const tracked = Math.round(Math.random() * 18);
    const ext = Math.round(Math.random() * 40);
    const imps = Math.round(1500 + Math.random() * 15000);
    const clicks = Math.round(imps * (0.02 + Math.random() * 0.08));
    const ctr = clicks / Math.max(1, imps);
    const avgPos = Math.round(8 + Math.random() * 28);
    const taskStatus = statuses[i % statuses.length];
    const device: Device = Math.random() > 0.5 ? "mobile" : "desktop";
    return {
      id: `p-${i + 1}`,
      pageUrl:
        i % 7 === 0
          ? `/product/wranker-${i}/`
          : i % 5 === 0
          ? `/services/seo-audit-${i}/`
          : `/blog/insight-${i}/`,
      seoScore: seo,
      healthScore: health,
      trackedKw: tracked,
      extKw: ext,
      backlinks: Math.round(Math.random() * 60),
      wrScore: wr,
      clicks,
      impressions: imps,
      ctr,
      avgPosition: avgPos,
      taskStatus,
      device,
      series: makeSeries(),
    };
  });
}

/* ───────────────────────── Small UI helpers ───────────────────────── */
const HeaderTip: React.FC<{
  tip: string;
  children: React.ReactNode;
}> = ({ tip, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          <Info className="h-3.5 w-3.5 text-[#9E9E9E]" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[280px] text-xs"
        style={{ fontFamily: FONT_STACK }}
      >
        {tip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const ScoreBar: React.FC<{ value: number; label?: string }> = ({
  value,
  label,
}) => {
  const col = scoreColor(value);
  return (
    <div
      className="flex items-center gap-2"
      title={`${label ?? "Score"}: ${value}/100`}
    >
      <div className="h-2.5 w-32 rounded" style={{ background: TK.borderLight }}>
        <div
          className="h-2.5 rounded transition-[width] duration-300"
          style={{ width: `${value}%`, background: col }}
        />
      </div>
      <span className="text-sm" style={{ color: TK.text }}>
        {value}
      </span>
    </div>
  );
};

const SmallDonut: React.FC<{ value: number }> = ({ value }) => {
  const size = 28,
    stroke = 4,
    r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    //   title={`WR Score: ${value}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={TK.borderLight}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={TK.brand}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

const TaskChip: React.FC<{ s: TaskStatus }> = ({ s }) => {
  const tone =
    s === "Completed"
      ? TK.ok
      : s === "In Progress"
      ? TK.warn
      : s === "Assigned"
      ? TK.brand
      : "#6B7280";
  return (
    <span
      className="px-2 py-0.5 rounded text-xs border"
      style={{ color: tone, borderColor: TK.borderLight }}
    >
      {s}
    </span>
  );
};

/* ───────────────────────── Modular Legend (chips) ───────────────────────── */
function LegendPill({
  color,
  label,
  active,
  onToggle,
}: {
  color: string;
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer hover:bg-gray-50"
      aria-pressed={active}
      title={active ? `Hide ${label}` : `Show ${label}`}
      style={{
        borderColor: TK.border,
        background: active ? "#F5F7FA" : "#FFFFFF",
        fontFamily: FONT_STACK,
      }}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-[3px]"
        style={{ background: color }}
      />
      <span>{label}</span>
    </button>
  );
}

/* ───────────────────────── Perf chart (expander) with smart popover ───────────────────────── */
const MiniPerfBars: React.FC<{
  series: Point[];
  showClicks?: boolean;
  showPosition?: boolean;
}> = ({ series, showClicks = true, showPosition = true }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<{
    i: number;
    x: number;
    yClicks: number;
    yPos: number;
    mxPx: number;
    myPx: number;
    contW: number;
    contH: number;
  } | null>(null);

  // Size
  const W = 800,
    H = 190,
    pad = { l: 48, r: 48, t: 16, b: 34 };
  const n = series.length;
  const width = W - pad.l - pad.r;
  const height = H - pad.t - pad.b;
  const barW = width / Math.max(1, n);

  // Scales
  const maxClicks = Math.max(1, ...series.map((d) => d.clicks));
  const minClicks = 0;
  const minPos = Math.min(...series.map((d) => d.avgPosition));
  const maxPos = Math.max(...series.map((d) => d.avgPosition));

  const xFor = (i: number) => pad.l + i * barW;
  const yForClicks = (v: number) => pad.t + (1 - v / maxClicks) * height;
  const yForPos = (p: number) => {
    const span = Math.max(1e-6, maxPos - minPos);
    return pad.t + ((p - minPos) / span) * height;
  };

  // Path for Avg. Position line
  const lineD = series
    .map(
      (d, i) => `${i === 0 ? "M" : "L"} ${xFor(i) + barW / 2} ${yForPos(d.avgPosition)}`
    )
    .join(" ");

  // Overlay pointer → hover index
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
      i: idx,
      x,
      yClicks: yForClicks(series[idx].clicks),
      yPos: yForPos(series[idx].avgPosition),
      mxPx,
      myPx,
      contW: rect.width,
      contH: rect.height,
    });
  };

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const tipOnRight = hover ? hover.mxPx < hover.contW / 2 : true;
  const tipLeftPx = hover ? (tipOnRight ? hover.mxPx + 10 : hover.mxPx - 10) : 0;
  const tipTopPx = hover ? hover.myPx - 18 : 0;
  const tipLeft = hover ? clamp(tipLeftPx, 8, hover.contW - 8) : 0;
  const tipTop = hover ? clamp(tipTopPx, 8, hover.contH - 28) : 0;
  const tipTransform = tipOnRight ? "translateX(0)" : "translateX(-100%)";

  // Simple horizontal grid (neat/clean)
  const gridYs = [0.25, 0.5, 0.75].map((p) => pad.t + p * height);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="30-day Clicks (bars) + Avg. Position (line)"
        style={{ fontFamily: FONT_STACK }}
      >
        {/* Grid */}
        {gridYs.map((y, i) => (
          <line
            key={i}
            x1={pad.l}
            x2={W - pad.r}
            y1={y}
            y2={y}
            stroke={TK.borderLight}
          />
        ))}

        {/* Axes */}
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={H - pad.b}
          y2={H - pad.b}
          stroke={TK.borderLight}
        />
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} stroke={TK.borderLight} />
        <line
          x1={W - pad.r}
          x2={W - pad.r}
          y1={pad.t}
          y2={H - pad.b}
          stroke={TK.borderLight}
        />

        {/* Bars (Clicks) w/ hover animation */}
        {showClicks &&
          series.map((d, i) => {
            const x = xFor(i) + 3;
            const y = yForClicks(d.clicks);
            const w = Math.max(2, barW - 6);
            const h = Math.max(0, H - pad.b - y);
            const isHot = hover?.i === i;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={w}
                height={h}
                rx="2"
                fill={TK.action}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "bottom",
                  transform: isHot ? "scaleY(1.06)" : "scaleY(1)",
                  fillOpacity: isHot ? 1 : 0.95,
                  transition:
                    "transform 160ms ease, fill-opacity 160ms ease, y 160ms ease, height 160ms ease",
                  cursor: "pointer",
                }}
              />
            );
          })}

        {/* Avg Position line */}
        {showPosition && (
          <>
            <path d={lineD} fill="none" stroke={TK.ok} strokeWidth={2} />
            {hover && (
              <circle cx={hover.x} cy={hover.yPos} r="3.5" fill={TK.ok} />
            )}
          </>
        )}

        {/* Axis labels */}
        {/* Left Y (Clicks) */}
        <text
          x={pad.l - 6}
          y={H - pad.b + 12}
          textAnchor="end"
          fontSize="10"
          fill={TK.muted}
        >
          {minClicks}
        </text>
        <text
          x={pad.l - 6}
          y={pad.t + 3}
          textAnchor="end"
          fontSize="10"
          fill={TK.muted}
        >
          {maxClicks.toLocaleString()}
        </text>
        {/* Right Y (Avg Pos) */}
        <text
          x={W - pad.r + 6}
          y={H - pad.b + 12}
          textAnchor="start"
          fontSize="10"
          fill={TK.muted}
        >
          {minPos.toFixed(0)}
        </text>
        <text
          x={W - pad.r + 6}
          y={pad.t + 3}
          textAnchor="start"
          fontSize="10"
          fill={TK.muted}
        >
          {maxPos.toFixed(0)}
        </text>
        {/* X-axis start/end dates */}
        <text
          x={pad.l}
          y={H - pad.b + 22}
          textAnchor="start"
          fontSize="10"
          fill={TK.muted}
        >
          {series[0]?.date}
        </text>
        <text
          x={W - pad.r}
          y={H - pad.b + 22}
          textAnchor="end"
          fontSize="10"
          fill={TK.muted}
        >
          {series[n - 1]?.date}
        </text>

        {/* Full overlay to capture pointer */}
        <rect
          x={pad.l}
          y={pad.t}
          width={width}
          height={height}
          fill="transparent"
        //   onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer" }}
        />
      </svg>

      {/* Smart popover (colored dots, white bg like other designs) */}
      {hover && (
        <div
          className="absolute rounded-md px-2 py-1.5 text-xs shadow"
          style={{
            left: `${tipLeft}px`,
            top: `${tipTop}px`,
            transform: tipTransform as any,
            background: TK.popoverBg,
            color: TK.text,
            border: `1px solid ${TK.border}`,
            pointerEvents: "none",
            fontFamily: FONT_STACK,
          }}
        >
          <div className="mb-0.5 font-medium" style={{ color: TK.muted }}>
            {series[hover.i].date}
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: TK.action }}
              />
              <span style={{ color: TK.muted }}>Clicks</span>
            </div>
            <div className="font-semibold">
              {series[hover.i].clicks.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center justify-between gap-6 mt-0.5">
            <div className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: TK.ok }}
              />
              <span style={{ color: TK.muted }}>Avg. Position</span>
            </div>
            <div className="font-semibold">
              {series[hover.i].avgPosition.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-1">
        30‑day <b>Clicks</b> (bars, blue) + <b>Avg. Position</b> (line, green).
        Hover to inspect.
      </div>
    </div>
  );
};

/* ───────────────────────── Columns ───────────────────────── */
type ColKey =
  | "select"
  | "expander"
  | "url"
  | "seoScore"
  | "healthScore"
  | "trackedKw"
  | "extKw"
  | "clicksImpr"
  | "backlinks"
  | "wrScore"
  | "task"
  | "actions";

type ColDef = {
  key: ColKey;
  label: string;
  width?: number;
  sortable?: boolean;
  sticky?: boolean;
  tip?: string;
};

const COLS: ColDef[] = [
  { key: "select", label: "", width: 46, sticky: true },
  { key: "expander", label: "", width: 44, sticky: true },
  {
    key: "url",
    label: "Page URL",
    width: 340,
    sortable: true,
    sticky: true,
    tip: "Canonical page path. Click to open Page Drawer.",
  },
  {
    key: "seoScore",
    label: "SEO Score",
    width: 160,
    sortable: true,
    tip: "Content & metadata optimization readiness (0–100).",
  },
  {
    key: "healthScore",
    label: "Page Health",
    width: 160,
    sortable: true,
    tip: "Technical & experience health from audit (0–100).",
  },
  {
    key: "trackedKw",
    label: "Tracked KW",
    width: 120,
    sortable: true,
    tip: "Number of keywords tracked for this page (Rank Tracker).",
  },
  {
    key: "extKw",
    label: "External KW",
    width: 120,
    sortable: true,
    tip: "Keywords discovered from external source (SE Ranking).",
  },
  {
    key: "clicksImpr",
    label: "Clicks / Impr.",
    width: 160,
    sortable: true,
    tip: "GSC clicks and impressions (latest window).",
  },
  {
    key: "backlinks",
    label: "Backlinks",
    width: 120,
    sortable: true,
    tip: "Count of backlinks pointing to this page.",
  },
  {
    key: "wrScore",
    label: "WR Score",
    width: 120,
    sortable: true,
    tip: "WR Page Score (0–100), small circular gauge.",
  },
  {
    key: "task",
    label: "Task Status",
    width: 140,
    sortable: true,
    tip: "Assigned task status for this page.",
  },
  {
    key: "actions",
    label: "Actions",
    width: 200,
    tip: "Quick actions: View SERP, Create Task, Open in Analyzer.",
  },
];

/* ───────────────────────── Row Expander (legend + chart) ───────────────────────── */
function RowExpander({ series }: { series: Point[] }) {
  const [showBars, setShowBars] = useState(true);
  const [showLine, setShowLine] = useState(true);

  return (
    <div
      className="p-4 rounded-md border"
      style={{ borderColor: TK.borderLight, background: "#FAFBFF", fontFamily: FONT_STACK }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium inline-flex items-center gap-2">
          <BarChart3 className="h-4 w-4" color={TK.brand} />
          Performance (last 30 days)
        </div>
        {/* Modular legend chips */}
        <div className="flex items-center gap-2">
          <LegendPill
            color={TK.action}
            label="Clicks"
            active={showBars}
            onToggle={() => setShowBars((s) => !s)}
          />
          <LegendPill
            color={TK.ok}
            label="Avg. Position"
            active={showLine}
            onToggle={() => setShowLine((s) => !s)}
          />
        </div>
      </div>
      <MiniPerfBars series={series} showClicks={showBars} showPosition={showLine} />
    </div>
  );
}

/* ───────────────────────── Component ───────────────────────── */
export default function PageInsightsPagesSection() {
  /* Data */
  const [rows] = useState<Row[]>(() => makeRows(80));

  /* Column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() =>
    COLS.reduce(
      (acc, c) => ({ ...acc, [c.key]: true }),
      {} as Record<ColKey, boolean>
    )
  );

  /* Sorting */
  const [sortBy, setSortBy] = useState<ColKey>("seoScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    if (!COLS.find((c) => c.key === key)?.sortable) return;
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  /* Expanded */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }));

  /* Filters inside the card, below header */
  const [q, setQ] = useState("");
  const [onlyHasKw, setOnlyHasKw] = useState(false);
  const [onlyLowSeo, setOnlyLowSeo] = useState(false);
  const [onlyNoBacklinks, setOnlyNoBacklinks] = useState(false);
  const [device, setDevice] = useState<Device | "all">("all");
  const [minSeo, setMinSeo] = useState(0);
  const [minHealth, setMinHealth] = useState(0);

  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* Filtered & sorted */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (device !== "all" && r.device !== device) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!r.pageUrl.toLowerCase().includes(s)) return false;
      }
      if (onlyHasKw && r.trackedKw <= 0) return false;
      if (onlyLowSeo && r.seoScore >= 50) return false;
      if (onlyNoBacklinks && r.backlinks > 0) return false;
      if (r.seoScore < minSeo) return false;
      if (r.healthScore < minHealth) return false;
      return true;
    });
  }, [
    rows,
    device,
    q,
    onlyHasKw,
    onlyLowSeo,
    onlyNoBacklinks,
    minSeo,
    minHealth,
  ]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: Row): any => {
      switch (sortBy) {
        case "url":
          return r.pageUrl;
        case "seoScore":
          return r.seoScore;
        case "healthScore":
          return r.healthScore;
        case "trackedKw":
          return r.trackedKw;
        case "extKw":
          return r.extKw;
        case "clicksImpr":
          return r.clicks; // primary
        case "backlinks":
          return r.backlinks;
        case "wrScore":
          return r.wrScore;
        case "task":
          return r.taskStatus;
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

  /* Compute window rows (page) */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const windowRows = useMemo(
    () => sorted.slice(pageStart, pageStart + pageSize),
    [sorted, pageStart, pageSize]
  );

  /* Page-scope ids & selection helpers */
  const pageIds = useMemo(() => windowRows.map((r) => r.id), [windowRows]);
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setSelected((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      pageIds.forEach((id) => {
        next[id] = checked;
      });
      return next;
    });
  };

  /* Visible columns list */
  const VISIBLE = useMemo(
    () => COLS.filter((c) => visibleCols[c.key] !== false),
    [visibleCols]
  );

  /* Export CSV (respects visible cols, excluding select/expander/actions) */
  const exportCSV = () => {
    const headers = VISIBLE.filter(
      (c) => !["select", "expander", "actions"].includes(c.key)
    ).map((c) => c.label);
    const mapVal = (r: Row, key: ColKey) => {
      switch (key) {
        case "url":
          return r.pageUrl;
        case "seoScore":
          return r.seoScore;
        case "healthScore":
          return r.healthScore;
        case "trackedKw":
          return r.trackedKw;
        case "extKw":
          return r.extKw;
        case "clicksImpr":
          return `${r.clicks}/${r.impressions}`;
        case "backlinks":
          return r.backlinks;
        case "wrScore":
          return r.wrScore;
        case "task":
          return r.taskStatus;
        default:
          return "";
      }
    };
    const rowsCsv = sorted.map((r) =>
      VISIBLE.filter(
        (c) => !["select", "expander", "actions"].includes(c.key)
      )
        .map((c) => JSON.stringify(mapVal(r, c.key)))
        .join(",")
    );
    const csv = [headers.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "all-pages.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Styles */
  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? {
          position: "sticky" as const,
          left:
            c.key === "select"
              ? 0
              : c.key === "expander"
              ? 46
              : c.key === "url"
              ? 90
              : 0,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        }
      : undefined;

  const headerSortIcon = (key: ColKey) =>
    sortBy === key ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    ) : (
      <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    );

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };


  return (
    <section className="space-y-3" style={{ fontFamily: FONT_STACK }}>
      <Card
        className="border mx-4"
        style={{ borderColor: TK.border, borderRadius: TK.radius }}
      >
     {drawerRow && (
          <PageAnalyzer open={drawerRow}
            onClose={closeDrawer}  />
      )}
        {/* ─ Header bar ─ */}
        <CardHeader
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <CardTitle className="text-lg inline-flex items-center gap-2">
            <BarChart3 className="h-5 w-5" color={TK.brand} />
            <span>All Pages</span>
          </CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Columns control (chip style) */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded-full border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC] cursor-pointer"
                  title="Show / Hide Columns"
                  style={{ borderColor: TK.borderLight }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {COLS.map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        disabled={
                          c.key === "select" ||
                          c.key === "expander" ||
                          c.key === "url"
                        }
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) =>
                          setVisibleCols((s) => ({
                            ...s,
                            [c.key]: Boolean(v),
                          }))
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
                    onClick={() =>
                      setVisibleCols(
                        COLS.reduce(
                          (acc, c) => ({ ...acc, [c.key]: true }),
                          {} as any
                        )
                      )
                    }
                    className="cursor-pointer"
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    style={{ background: TK.brand, color: "#fff" }}
                    className="cursor-pointer"
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export (section header) */}
            <Button
              variant="outline"
              className="h-8 px-3 cursor-pointer"
              onClick={exportCSV}
              title="Export visible rows/columns (CSV)"
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardHeader>

        {/* ─ Filter bar (inside the table section) ─ */}
        <CardContent
          className="border-b pt-3 pb-3"
          style={{ borderColor: TK.borderLight }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[300px] pl-7"
                placeholder="Search page path…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Modular chips (filters) */}
            <button
              onClick={() => {
                setOnlyHasKw((v) => !v);
                setPage(1);
              }}
              className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${
                onlyHasKw ? "font-semibold" : ""
              }`}
              style={{
                borderColor: TK.borderLight,
                background: onlyHasKw ? TK.pastelBlue : "#fff",
              }}
              title="Has Tracked Keywords"
            >
              Has Tracked KW
            </button>
            <button
              onClick={() => {
                setOnlyLowSeo((v) => !v);
                setPage(1);
              }}
              className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${
                onlyLowSeo ? "font-semibold" : ""
              }`}
              style={{
                borderColor: TK.borderLight,
                background: onlyLowSeo ? TK.pastelBlue : "#fff",
              }}
              title="SEO Score < 50"
            >
              Low SEO Score (&lt;50)
            </button>
            <button
              onClick={() => {
                setOnlyNoBacklinks((v) => !v);
                setPage(1);
              }}
              className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${
                onlyNoBacklinks ? "font-semibold" : ""
              }`}
              style={{
                borderColor: TK.borderLight,
                background: onlyNoBacklinks ? TK.pastelBlue : "#fff",
              }}
              title="No Backlinks"
            >
              No Backlinks
            </button>

            {/* Device */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground">Device</span>
              <Select
                value={device}
                onValueChange={(v: any) => {
                  setDevice(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 px-3 w-[140px] cursor-pointer">
                  <SelectValue placeholder="Device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Score sliders (toggle-style controls already consistent) */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Min SEO</span>
              <div className="w-[140px]">
                <Slider
                  value={[minSeo]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setMinSeo((v as number[])[0]);
                    setPage(1);
                  }}
                />
              </div>
              <span className="text-sm w-8">{minSeo}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Min Health</span>
              <div className="w-[140px]">
                <Slider
                  value={[minHealth]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setMinHealth((v as number[])[0]);
                    setPage(1);
                  }}
                />
              </div>
              <span className="text-sm w-8">{minHealth}</span>
            </div>

            {/* Pagination (right side) */}
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
              <div className="text-sm w-16 text-center">
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                className="h-8 px-3 cursor-pointer"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3 cursor-pointer"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                Last
              </Button>
            </div>
          </div>

          {/* Bulk Action Bar (appears when rows are selected) */}
          {selectedIds.length > 0 && (
            <div
              className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2"
              style={{ borderColor: TK.borderLight }}
            >
              <span className="text-sm">
                <strong>{selectedIds.length}</strong> selected
              </span>
              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
              <Button size="sm" variant="outline" className="cursor-pointer">
                Create Task
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportCSV}
                className="cursor-pointer"
              >
                Export Selected
              </Button>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected({})}
                  className="cursor-pointer"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* ─ Table ─ */}
        <CardContent className="p-0">
          <div
            className="max-h-[560px] overflow-auto border-t"
            style={{ borderColor: TK.borderLight }}
          >
            <Table className="text-sm">
              <TableHeader className="bg-white">
                <TableRow className="hover:bg-white">
                  {VISIBLE.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }}
                      className="text-left"
                    >
                      {c.key === "select" ? (
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                        />
                      ) : c.sortable ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                          onClick={() => toggleSort(c.key)}
                        >
                          <HeaderTip tip={c.tip ?? ""}>
                            <span>{c.label}</span>
                          </HeaderTip>
                          {headerSortIcon(c.key)}
                        </button>
                      ) : (
                        <HeaderTip tip={c.tip ?? ""}>
                          <span>{c.label}</span>
                        </HeaderTip>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowRows.map((r) => (
                  <React.Fragment key={r.id}>
                    <TableRow className="hover:bg-[#F8FAFC]">
                      {/* select */}
                      {visibleCols.select !== false && (
                        <TableCell
                          style={stickyStyle(COLS[0]) as any}
                          className="text-left"
                        >
                          <Checkbox
                            checked={!!selected[r.id]}
                            onCheckedChange={(v) =>
                              setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))
                            }
                          />
                        </TableCell>
                      )}
                      {/* expander */}
                      {visibleCols.expander !== false && (
                        <TableCell
                          style={stickyStyle(COLS[1]) as any}
                          className="text-left"
                        >
                          <button
                            onClick={() => toggleExpand(r.id)}
                            aria-label={expanded[r.id] ? "Collapse" : "Expand"}
                            className="rounded border p-1 hover:bg-muted cursor-pointer"
                            title={expanded[r.id] ? "Collapse row" : "Expand row"}
                            style={{ borderColor: TK.borderLight }}
                          >
                            {expanded[r.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                      )}
                      {/* URL */}
                      {visibleCols.url !== false && (
                        <TableCell
                          style={{ ...stickyStyle(COLS[2]), minWidth: 340 }}
                          className="text-left"
                        >
                          <button
                            className="underline cursor-pointer"
                            style={{ color: TK.action }}
                            title={r.pageUrl}
                            onClick={openDrawer}
                          >
                            {midEllipsis(r.pageUrl, 46)}
                          </button>
                        </TableCell>
                      )}
                      {/* SEO Score */}
                      {visibleCols.seoScore !== false && (
                        <TableCell className="text-left">
                          <ScoreBar value={r.seoScore} label="SEO Score" />
                        </TableCell>
                      )}
                      {/* Health Score */}
                      {visibleCols.healthScore !== false && (
                        <TableCell className="text-left">
                          <ScoreBar value={r.healthScore} label="Page Health" />
                        </TableCell>
                      )}
                      {/* Tracked KW */}
                      {visibleCols.trackedKw !== false && (
                        <TableCell className="text-left">{r.trackedKw}</TableCell>
                      )}
                      {/* External KW */}
                      {visibleCols.extKw !== false && (
                        <TableCell className="text-left">{r.extKw}</TableCell>
                      )}
                      {/* Clicks / Impressions */}
                      {visibleCols.clicksImpr !== false && (
                        <TableCell
                          className="text-left"
                          title={`CTR ${(r.ctr * 100).toFixed(2)}% • Avg Pos ${
                            r.avgPosition
                          }`}
                        >
                          {fmt(r.clicks)} / {fmt(r.impressions)}
                        </TableCell>
                      )}
                      {/* Backlinks */}
                      {visibleCols.backlinks !== false && (
                        <TableCell className="text-left">{r.backlinks}</TableCell>
                      )}
                      {/* WR Score (small donut) */}
                      {visibleCols.wrScore !== false && (
                        <TableCell className="text-left">
                          <div className="inline-flex items-center gap-2">
                            <SmallDonut value={r.wrScore} />
                            <span className="text-sm">{r.wrScore}</span>
                          </div>
                        </TableCell>
                      )}
                      {/* Task */}
                      {visibleCols.task !== false && (
                        <TableCell className="text-left">
                          <TaskChip s={r.taskStatus} />
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
                                    className="text-[#4286F5] cursor-pointer"
                                    aria-label="SERP"
                                    onClick={openDrawer}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open SERP</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-[#4286F5] cursor-pointer"
                                    aria-label="Create Task"
                                  >
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Create Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Open Analyzer"
                                    className="cursor-pointer"
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open Page Analyzer</TooltipContent>
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
                          <RowExpander series={r.series} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Bottom pagination */}
        <div
          className="flex items-center justify-between p-3 border-t"
          style={{ borderColor: TK.borderLight }}
        >
          <div className="text-sm text-muted-foreground">
            Showing {sorted.length === 0 ? 0 : pageStart + 1}–
            {Math.min(sorted.length, pageStart + windowRows.length)} of{" "}
            {sorted.length}
          </div>
          <div className="flex items-center gap-2">
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
            <div className="text-sm w-16 text-center">
              {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              className="h-8 px-3 cursor-pointer"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
            <Button
              variant="outline"
              className="h-8 px-3 cursor-pointer"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </Button>
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
          </div>
        </div>
      </Card>
    </section>
  );
}

/* ───────────────────────── Lightweight tests (logic only) ───────────────────────── */
export function __tests__() {
  const selected: Record<string, boolean> = { a: true, b: false };
  const pageIds = ["a", "b", "c"];
  const allSelectedInitial = pageIds.every((id) => selected[id]);

  const selAll: Record<string, boolean> = { ...selected };
  pageIds.forEach((id) => {
    selAll[id] = true;
  });
  const allSelectedAfter = pageIds.every((id) => selAll[id]);

  const cleared: Record<string, boolean> = { ...selAll };
  pageIds.forEach((id) => {
    delete cleared[id];
  });
  const anyLeft = pageIds.some((id) => cleared[id]);

  return { allSelectedInitial, allSelectedAfter, anyLeft };
}

