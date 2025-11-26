"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MoreHorizontal,
  Info as InfoIcon,
  ChevronDown,
  Sparkles,
  LayoutGrid,
  PlugZap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { createPortal } from "react-dom";

/* ----------------------------------------------------------------------------
 * TOKENS
 * --------------------------------------------------------------------------*/
const TOKENS = {
  surface: "var(--wr-surface, #FFFFFF)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #EFF0F6)",

  valueBlue: "var(--wr-value-blue, #0077FF)",
  pastelBlue: "var(--wr-pastel-blue, #D9EEF8)",

  success: "var(--wr-success, #10B981)",
  successPastel: "rgba(16,185,129,0.15)",

  warning: "var(--wr-warning, #F59E0B)",
  warningPastel: "rgba(245,158,11,0.15)",

  danger: "var(--wr-danger, #EF4444)",
  dangerPastel: "rgba(239,68,68,0.15)",

  info: "var(--wr-info, #3B82F6)",
  infoPastel: "rgba(59,130,246,0.15)",

  brand: "#008CCD",
} as const;

/* ----------------------------------------------------------------------------
 * HELPERS / FORMATTERS
 * --------------------------------------------------------------------------*/
const intFmt = new Intl.NumberFormat();
function fmtInt(n?: number | null, compact = true) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 10000) {
    const units = [
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "K" },
    ];
    for (const u of units) if (Math.abs(n) >= u.v) return `${(n / u.v).toFixed(1)}${u.s}`;
  }
  return intFmt.format(n);
}
function fmtPct01(p?: number | null, digits = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(digits)}%`;
}
function fmtPct100(p?: number | null, digits = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${(p ?? 0).toFixed(digits)}%`;
}
function caret(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v) || v === 0) return "—";
  return v > 0 ? "▲" : "▼";
}
function toneByGoodBad(valueDelta?: number, invert = false) {
  if (typeof valueDelta !== "number") return TOKENS.muted;
  const isGood = invert ? valueDelta < 0 : valueDelta > 0;
  return isGood ? TOKENS.success : TOKENS.danger;
}
function statusByBands(v: number, goodMin = 80, warnMin = 60) {
  if (v >= goodMin) return "good" as const;
  if (v >= warnMin) return "warning" as const;
  return "critical" as const;
}
function statusColor(tone: "good" | "warning" | "critical" | "info") {
  switch (tone) {
    case "good":
      return { solid: TOKENS.success, pastel: TOKENS.successPastel };
    case "warning":
      return { solid: TOKENS.warning, pastel: TOKENS.warningPastel };
    case "critical":
      return { solid: TOKENS.danger, pastel: TOKENS.dangerPastel };
    case "info":
    default:
      return { solid: TOKENS.info, pastel: TOKENS.infoPastel };
  }
}
function toDateLabel(d: string | number | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

/* ----------------------------------------------------------------------------
 * TYPES
 * --------------------------------------------------------------------------*/
export type SeriesPoint = { t: string; v: number };
export type TrendSeries = SeriesPoint[];

export type ProjectSummaryData = {
  // Row A
  seoScore: { value: number; delta: number; series?: TrendSeries; confidenceLow?: boolean };
  siteHealth: { value: number; delta: number; series?: TrendSeries };
  wrScore: { value: number; delta: number; series?: TrendSeries; micro?: { newRD?: number; lostRD?: number } };
  pageExperience: {
    pass: boolean;
    deltaText?: string;
    audits?: { t: string; pass: boolean }[];
    deviceLabel?: string;
  };

  // Row B
  clicks?: { value: number; delta: number; series?: TrendSeries }; // GSC
  sessions?: { value: number; delta: number; series?: TrendSeries }; // GA4
  conversions?: { value: number; delta: number; series?: TrendSeries }; // GA4
  positionCtr?: {
    position: { value: number; delta: number; series?: TrendSeries }; // lower is better
    ctr: { valuePct: number; delta: number; series?: TrendSeries };
  };

  // Row C
  internalLinking: {
    dils: { value: number; delta: number };
    orphanPct: number; // 0..1
    danglingPct: number; // 0..1
  };
  indexability?: {
    connected: boolean;
    indexablePct?: number; // 0..1
    nonIndexablePct?: number; // 0..1
    canonicalizedPct?: number; // 0..1
    deltaPP?: number;
  };
  keywordDistribution: {
    total: number;
    delta: number;
    top3: number;
    top10: number;
    top100: number;
    newCount: number;
    lostCount: number;
  };

  // Row D
  serpFeatures?: {
    total: number;
    delta: number;
    features: { key: string; label: string; count: number }[];
    series?: TrendSeries;
  };
  cannibalization?: { cases: number; delta: number; series?: TrendSeries };
  newLostRD?: {
    newTotal: number;
    lostTotal: number;
    seriesNew?: TrendSeries;
    seriesLost?: TrendSeries;
  };

  // Row E
  crawlErrors?: {
    fourXxPct: number; // 0..1
    fiveXxPct: number; // 0..1
    deltaPct: number; // improvement if negative
    series?: { t: string; fourXxPct: number; fiveXxPct: number }[];
  };

  // Optional (used as CVR demo in this file)
  trafficValue?: { value: number; delta: number; currency?: string; series?: TrendSeries };
};

export type SourceFilter = "all" | "ga4" | "gsc";

export interface ProjectSummarySectionProps {
  data: ProjectSummaryData;
  sourceFilter?: SourceFilter;
  connected?: { ga4: boolean; gsc: boolean };

  onOpenDrawer?: (kpi:
    | "seo_score"
    | "site_health"
    | "wr_score"
    | "page_experience"
    | "traffic"
    | "position_ctr"
    | "cvr"
    | "keyword_distribution"
    | "internal_linking"
    | "indexability"
    | "serp_features"
    | "cannibalization"
    | "new_lost_rd"
    | "crawl_errors") => void;
  onAddToReport?: () => void;
  onCreateTask?: (kpi: string) => void;
  onConnectGA4?: () => void;
  onConnectGSC?: () => void;
  onExport?: (fmt: "PNG" | "CSV" | "PDF") => void;
  canExportPdf?: boolean;

  className?: string;
  loading?: boolean;
}

/* ----------------------------------------------------------------------------
 * PERSISTENT TABS (TriMetric & Paired)
 * --------------------------------------------------------------------------*/
function useStickyTab<T extends string>(key: string, initial: T) {
  const [val, setVal] = useState<T>(initial);
  useEffect(() => {
    const v = window.localStorage.getItem(key);
    if (v) setVal(v as T);
  }, [key]);
  const change = (v: T) => {
    setVal(v);
    window.localStorage.setItem(key, String(v));
  };
  return [val, change] as const;
}

/* ----------------------------------------------------------------------------
 * SERIES HELPERS — ensure trend charts always render (mock data if missing)
 * --------------------------------------------------------------------------*/
function makeSeries(points = 12, base = 100, noise = 0.08): TrendSeries {
  const start = new Date();
  start.setDate(start.getDate() - (points - 1));
  const arr: TrendSeries = [];
  let val = base;
  for (let i = 0; i < points; i++) {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    val = Math.max(0, val + (Math.random() - 0.5) * base * noise);
    arr.push({ t: d.toISOString().slice(0, 10), v: Math.round(val) });
  }
  return arr;
}
function ensureSeries(series?: TrendSeries, base?: number, points = 12, noise = 0.08): TrendSeries {
  if (series && series.length) return series;
  const safeBase = typeof base === "number" && Number.isFinite(base) ? Math.max(1, base) : 10;
  return makeSeries(points, safeBase, noise);
}

/* ----------------------------------------------------------------------------
 * SMART POPOVER (rendered via portal so it sits above everything)
 * --------------------------------------------------------------------------*/
function PortalTooltipShell({
  x,
  y,
  width = 240,
  children,
}: {
  x: number;
  y: number;
  width?: number;
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div style={{ position: "fixed", left, top, zIndex: 2147483647, pointerEvents: "none" }}>
      <div
        className="rounded-md border bg-white p-2 text-xs shadow"
        style={{ borderColor: TOKENS.border, color: TOKENS.text, borderRadius: 6 }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Content bodies reused by portal tooltips */
function SmartTooltipBody({
  label,
  payload,
  valueFmt,
  labelFmt,
}: {
  label?: any;
  payload?: any[];
  valueFmt?: (v: number, name?: string) => string;
  labelFmt?: (l: any) => string;
}) {
  return (
    <>
      {label !== undefined && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {labelFmt ? labelFmt(label) : String(label)}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {(payload ?? []).map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TOKENS.muted }}>{p.name}</span>
            </div>
            <div className="font-semibold">
              {valueFmt ? valueFmt(p.value as number, p.name) : fmtInt(p.value as number, false)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function DonutTooltipBody({
  title,
  parts,
  valueFmt,
}: {
  title?: string;
  parts: { name: string; value: number; color: string }[];
  valueFmt?: (v: number) => string;
}) {
  return (
    <>
      {title && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {title}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TOKENS.muted }}>{p.name}</span>
            </div>
            <div className="font-semibold">{valueFmt ? valueFmt(p.value) : fmtInt(p.value)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Adapters for Recharts Tooltip that render via portal */
function PortalSmartTooltip({
  active,
  label,
  payload,
  coordinate,
  containerRect,
  valueFmt,
  labelFmt,
}: any & {
  containerRect?: DOMRect | null;
  valueFmt?: (v: number, name?: string) => string;
  labelFmt?: (l: any) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <SmartTooltipBody label={label} payload={payload} valueFmt={valueFmt} labelFmt={labelFmt} />
    </PortalTooltipShell>
  );
}
function PortalDonutTooltip({
  active,
  coordinate,
  containerRect,
  parts,
  title,
  valueFmt,
}: any & {
  containerRect?: DOMRect | null;
  parts: { name: string; value: number; color: string }[];
  title?: string;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <DonutTooltipBody title={title} parts={parts} valueFmt={valueFmt} />
    </PortalTooltipShell>
  );
}

/* ----------------------------------------------------------------------------
 * SHARED ATOMS — ValueDelta, MiniLegend, Tooltips, Sparks, Donuts, SegTabs
 * --------------------------------------------------------------------------*/
function ValueDelta({
  delta,
  invert = false,
  unit = "%",
  ariaId,
  explain,
}: {
  delta?: number;
  invert?: boolean; // lower better if true
  unit?: "%" | "pp" | "";
  ariaId?: string;
  explain?: string;
}) {
  if (typeof delta !== "number") {
    return (
      <div id={ariaId} className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
        —
      </div>
    );
  }
  const color = toneByGoodBad(delta, invert);
  return (
    <div id={ariaId} className="mt-1 text-xs" style={{ color }}>
      {caret(delta)} {Math.abs(delta).toFixed(1)}
      {unit && <span>&nbsp;{unit}</span>}
      {explain && (
        <span className="ml-1 text-[11px]" style={{ color: TOKENS.muted }}>
          ({explain})
        </span>
      )}
    </div>
  );
}

function MiniLegend({
  items,
}: {
  items: { swatch: string; label: string; value?: string | number }[];
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: TOKENS.muted }}>
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: it.swatch }} />
          <span>{it.label}</span>
          {it.value !== undefined && (
            <span className="ml-1 font-medium" style={{ color: TOKENS.text }}>
              {it.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* Spark charts (use portal tooltips) */
function SparkArea({
  series,
  aria,
  color = TOKENS.valueBlue,
  pastel = TOKENS.pastelBlue,
  showMean = false,
}: {
  series?: TrendSeries;
  aria: string;
  color?: string;
  pastel?: string;
  showMean?: boolean;
}) {
  const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
  const mean = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((s, d) => s + d.value, 0) / data.length;
  }, [data]);
  const gradId = useMemo(() => `grad-${aria.replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2)}`, [aria]);
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={ref} className="h-16 w-[9.5rem] sm:w-[10.5rem] md:w-[11rem]" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={pastel} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={(tp: any) => (
              <PortalSmartTooltip
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                valueFmt={(v) => fmtInt(v, false)}
                labelFmt={(l) => toDateLabel(l as string)}
              />
            )}
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          {showMean && <ReferenceLine y={mean} stroke={TOKENS.muted} strokeDasharray="3 3" />}
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SparkBars({
  series,
  aria,
  color = TOKENS.valueBlue,
}: {
  series?: TrendSeries;
  aria: string;
  color?: string;
}) {
  const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref} className="h-16 w-[9.5rem] sm:w-[10.5rem] md:w-[11rem]" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={(tp: any) => (
              <PortalSmartTooltip
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                valueFmt={(v) => fmtInt(v, false)}
                labelFmt={(l) => toDateLabel(l as string)}
              />
            )}
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          {/* Top edge curved with 6px radius */}
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut gauge (portal tooltip) */
function DonutGauge({
  value01,
  aria,
  filled = TOKENS.valueBlue,
  empty = TOKENS.pastelBlue,
  size = 44,
  tooltipTitle,
  filledLabel = "Value",
  emptyLabel = "Remaining",
  valueFmt = (v: number) => fmtPct01(v),
}: {
  value01: number; // 0..1
  aria: string;
  filled?: string;
  empty?: string;
  size?: number;
  tooltipTitle?: string;
  filledLabel?: string;
  emptyLabel?: string;
  valueFmt?: (v: number) => string;
}) {
  const v = Math.max(0, Math.min(1, value01));
  const parts = [
    { name: filledLabel, value: v, color: filled },
    { name: emptyLabel, value: 1 - v, color: empty },
  ];
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={ref} className="h-11 w-11 shrink-0" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={(tp: any) => (
              <PortalDonutTooltip
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                parts={parts}
                title={tooltipTitle}
                valueFmt={valueFmt}
              />
            )}
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
          />
          <Pie
            data={parts.map((d) => ({ ...d, v: d.value }))}
            dataKey="v"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
          >
            {parts.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Split donut (portal tooltip) */
function DonutSplit({
  parts,
  aria,
  size = 44,
  tooltipTitle,
  valueFmt = (v: number) => fmtPct01(v),
}: {
  parts: { name: string; value: number; color: string }[];
  aria: string;
  size?: number;
  tooltipTitle?: string;
  valueFmt?: (v: number) => string;
}) {
  const data = parts.map((p) => ({ ...p, v: Math.max(0, Math.min(1, p.value)) }));
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref} className="h-11 w-11 shrink-0" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={(tp: any) => (
              <PortalDonutTooltip
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                parts={data}
                title={tooltipTitle}
                valueFmt={valueFmt}
              />
            )}
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
          />
          <Pie data={data} dataKey="v" innerRadius={size / 2 - 12} outerRadius={size / 2} startAngle={90} endAngle={-270} isAnimationActive>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Segmented tabs */
function SegTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; disabled?: boolean; cta?: () => void }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs" style={{ borderColor: TOKENS.border }}>
      {items.map((it) => (
        <button
          key={it.value}
          disabled={!!it.disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (it.disabled && it.cta) it.cta();
            else onChange(it.value);
          }}
          className={`cursor-pointer rounded-full px-2.5 py-1 transition ${
            value === it.value ? "bg-[#F5F7FA] font-semibold" : "text-[color:var(--wr-muted,#6B7280)]"
          } ${it.disabled ? "opacity-60" : ""}`}
          aria-pressed={value === it.value}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * HEADER / SHELL
 * --------------------------------------------------------------------------*/
function KebabMenu({
  onAddToReport,
  onCreateTask,
}: {
  onAddToReport?: () => void;
  onCreateTask?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        className="cursor-pointer rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 rounded-md border bg-white py-1 text-sm shadow"
          style={{ borderColor: TOKENS.border }}
          onMouseLeave={() => setOpen(false)}
        >
          <button className="block w-full cursor-pointer px-3 py-2 text-left hover:bg-gray-50" onClick={() => onAddToReport?.()}>
            Add to Report
          </button>
          <button className="block w-full cursor-pointer px-3 py-2 text-left hover:bg-gray-50" onClick={() => onCreateTask?.()}>
            Create Task
          </button>
        </div>
      )}
    </div>
  );
}

/** Title w/ branded glyph + (i) tooltip */
function TitleWithHoverInfo({ title, info }: { title: string; info?: string }) {
  return (
    <div className="relative flex min-w-0 items-center gap-2 group/title">
      {/* Branded icon for card titles */}
      <LayoutGrid size={14} color={TOKENS.brand} />
      <div className="truncate text-[13px] font-semibold">{title}</div>
      {info ? <InfoIcon size={15} className="text-[#9CA3AF]" /> : null}
      {info ? (
        <div
          role="tooltip"
          className="invisible group-hover/title:visible absolute left-0 top-5 z-[2147483647] w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}

function CardShell({
  title,
  info,
  headerRight,
  onClick,
  children,
  state = "default",
}: {
  title: string;
  info?: string;
  headerRight?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  state?: "default" | "loading" | "empty" | "disconnected";
}) {
  const isLoading = state === "loading";
  const isEmpty = state === "empty";
  const isDisconnected = state === "disconnected";

  const content = (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-center justify-between">
        <TitleWithHoverInfo title={title} info={info} />
        <div className="flex items-center gap-2">
          {headerRight}
          <KebabMenu />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 h-24 animate-pulse rounded-md bg-[color:var(--wr-border,#EFF0F6)]" />
      ) : isDisconnected ? (
        <div className="mt-3 flex h-24 items-center justify-between rounded-md bg-[#F5F7FA] px-3">
          <div className="text-sm" style={{ color: TOKENS.muted }}>
            Source disconnected. Connect to view this KPI.
          </div>
          <div className="flex items-center gap-2">
            <PlugZap size={16} className="text-[#9CA3AF]" />
          </div>
        </div>
      ) : isEmpty ? (
        <div className="mt-3 flex h-24 items-center justify-center rounded-md bg-[#F5F7FA] text-sm" style={{ color: TOKENS.muted }}>
          No data for the selected filters.
        </div>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </div>
  );

  return (
    <button
      type="button"
      className="group flex h-full w-full flex-col rounded-[6px] border p-4 text-left shadow-sm transition-transform hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wr-value-blue,#0077FF)]/50"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

/* ----------------------------------------------------------------------------
 * MAIN SECTION
 * --------------------------------------------------------------------------*/
export function ProjectSummarySection({
  data,
  sourceFilter = "all",
  connected = { ga4: true, gsc: true },
  onOpenDrawer,
  onAddToReport,
  onCreateTask,
  onConnectGA4,
  onConnectGSC,
  onExport,
  canExportPdf = false,
  className,
  loading,
}: ProjectSummarySectionProps) {
  // TriMetric & Paired tabs (single, top-level hooks)
  const [triTab, setTriTab] = useStickyTab<"clicks" | "sessions" | "conversions">(
    "wr:ps:tri",
    connected.gsc ? "clicks" : connected.ga4 ? "sessions" : "clicks"
  );
  const [pairTab, setPairTab] = useStickyTab<"position" | "ctr">("wr:ps:pair", "position");

  const showGA4 = sourceFilter !== "gsc" && connected.ga4;
  const showGSC = sourceFilter !== "ga4" && connected.gsc;

  // Always provide series (fallback mock if missing) for the cards mentioned
  const S = useMemo(
    () => ({
      seo: ensureSeries(data.seoScore.series, data.seoScore.value, 12, 0.04),
      health: ensureSeries(data.siteHealth.series, data.siteHealth.value, 12, 0.05),
      wr: ensureSeries(data.wrScore.series, data.wrScore.value, 12, 0.04),
      clicks: ensureSeries(data.clicks?.series, data.clicks?.value, 24, 0.12),
      sessions: ensureSeries(data.sessions?.series, data.sessions?.value, 24, 0.11),
      conversions: ensureSeries(data.conversions?.series, data.conversions?.value, 24, 0.14),
      pos: ensureSeries(data.positionCtr?.position.series, data.positionCtr?.position.value, 24, 0.05),
      ctr: ensureSeries(
        data.positionCtr?.ctr.series?.map((p) => ({ t: p.t, v: p.v })),
        (data.positionCtr?.ctr.valuePct ?? 0.03) * 100,
        24,
        0.12
      ),
      serp: data.serpFeatures?.series && data.serpFeatures.series.length ? data.serpFeatures.series : undefined,
    }),
    [data]
  );

  // Refs for charts that are not using Spark* helpers (for portal tooltip anchoring)
  const cwvRef = useRef<HTMLDivElement | null>(null);
  const kwRef = useRef<HTMLDivElement | null>(null);
  const rdRef = useRef<HTMLDivElement | null>(null);
  const errRef = useRef<HTMLDivElement | null>(null);

  return (
    <section className={className} style={{ fontFamily: 'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Branded icon for section title */}
          <span className="grid h-8 w-8 place-items-center rounded-md border" style={{ borderColor: TOKENS.border, background: TOKENS.pastelBlue }}>
            <LayoutGrid size={16} color={TOKENS.brand} />
          </span>
          <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
            Project Summary
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <span className="text-xs" style={{ color: TOKENS.muted }}>
              Source:
            </span>
            <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: TOKENS.border }}>
              {sourceFilter === "all" ? "All" : sourceFilter.toUpperCase()}
            </span>
          </div>

          <button
            onClick={onAddToReport}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm text-white"
            style={{ background: TOKENS.valueBlue }}
            title="Add to Report"
          >
            <Sparkles size={16} color={TOKENS.brand} />
            Add to Report
          </button>
          <button
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"
            style={{ borderColor: TOKENS.border }}
            onClick={() => onExport?.("PNG")}
            title="Export"
          >
            Export
            <ChevronDown size={16} className="text-[#9CA3AF]" />
          </button>
        </div>
      </div>

      <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

      {/* GRID (ensure symmetry with stretch + h-full cards) */}
      <div className="mt-4 grid grid-cols-12 items-stretch gap-4">
        {/* ---------------- Row A ---------------- */}
        {/* 1) SEO Score */}
        <div className="col-span-12 h-full sm:col-span-6 xl:col-span-3">
          <CardShell
            title="SEO Score"
            info="Composite on-page & content readiness score (0–100)."
            onClick={() => onOpenDrawer?.("seo_score")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutGauge value01={(data.seoScore.value ?? 0) / 100} aria="SEO score donut" tooltipTitle="SEO Score" filledLabel="Score" />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="seo-delta">
                    {fmtInt(data.seoScore.value, false)}
                  </output>
                  <ValueDelta delta={data.seoScore.delta} ariaId="seo-delta" />
                  {data.seoScore.confidenceLow && (
                    <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                      Limited inputs; score confidence low.
                    </div>
                  )}
                </div>
              </div>
              <SparkArea series={S.seo} aria="SEO score trend" showMean />
            </div>
          </CardShell>
        </div>

        {/* 2) Site Health Score */}
        <div className="col-span-12 h-full sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Site Health Score"
            info="Technical + performance + UX + schema + interlinking composite (0–100)."
            onClick={() => onOpenDrawer?.("site_health")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutGauge value01={(data.siteHealth.value ?? 0) / 100} aria="Site health donut" tooltipTitle="Site Health" filledLabel="Score" />
                <div>
                  <div className="flex items-center gap-2">
                    <output className="text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="health-delta">
                      {fmtInt(data.siteHealth.value, false)}
                    </output>
                    {(() => {
                      const band = statusByBands(data.siteHealth.value ?? 0);
                      const { solid, pastel } = statusColor(band);
                      return (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: solid, background: pastel }}>
                          {band === "good" ? "Good" : band === "warning" ? "Warning" : "Critical"}
                        </span>
                      );
                    })()}
                  </div>
                  <ValueDelta delta={data.siteHealth.delta} ariaId="health-delta" />
                </div>
              </div>
              <SparkArea series={S.health} aria="Site health trend" showMean />
            </div>
          </CardShell>
        </div>

        {/* 3) WR Score */}
        <div className="col-span-12 h-full sm:col-span-6 xl:col-span-3">
          <CardShell title="WR Score" info="Backlink‑weighted authority score (0–100)." onClick={() => onOpenDrawer?.("wr_score")} state={loading ? "loading" : "default"}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutGauge value01={(data.wrScore.value ?? 0) / 100} aria="WR score donut" tooltipTitle="WR Score" filledLabel="Score" />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="wr-delta">
                    {fmtInt(data.wrScore.value, false)}
                  </output>
                  <ValueDelta delta={data.wrScore.delta} ariaId="wr-delta" />
                  {(data.wrScore.micro?.newRD || data.wrScore.micro?.lostRD) && (
                    <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                      +RD: {fmtInt(data.wrScore.micro?.newRD ?? 0, false)} • −RD: {fmtInt(data.wrScore.micro?.lostRD ?? 0, false)}
                    </div>
                  )}
                </div>
              </div>
              <SparkBars series={S.wr} aria="WR score trend" />
            </div>
          </CardShell>
        </div>

        {/* 4) Page Experience (Home page) */}
        <div className="col-span-12 h-full sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Page Experience (Home page)"
            info="Core Web Vitals pass status for the home page under current Device filter."
            onClick={() => onOpenDrawer?.("page_experience")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutGauge
                  value01={data.pageExperience.pass ? 1 : 0}
                  aria="CWV pass donut"
                  filled={data.pageExperience.pass ? TOKENS.valueBlue : TOKENS.danger}
                  empty={data.pageExperience.pass ? TOKENS.pastelBlue : TOKENS.dangerPastel}
                  tooltipTitle="Page Experience"
                  filledLabel={data.pageExperience.pass ? "Pass" : "Fail"}
                  valueFmt={(v) => fmtPct01(v)}
                />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="cwv-delta">
                    {data.pageExperience.pass ? "100%" : "0%"}
                  </output>
                  <div id="cwv-delta" className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    {data.pageExperience.deltaText || "Last vs prior audit"}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    Home • {data.pageExperience.deviceLabel || "Device filter applied"}
                  </div>
                </div>
              </div>

              <div ref={cwvRef} className="h-16 w-[9.5rem] sm:w-[10.5rem] md:w-[11rem]" role="img" aria-label="CWV pass/fail recent audits">
                <ResponsiveContainer>
                  <BarChart
                    data={ensureSeries(
                      (data.pageExperience.audits ?? []).map((a) => ({ t: a.t, v: a.pass ? 1 : 0 })),
                      1,
                      10,
                      0.01
                    ).map((p) => ({ date: p.t, Pass: p.v, Fail: p.v ? 0 : 1 }))}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                      content={(tp: any) => (
                        <PortalSmartTooltip
                          {...tp}
                          containerRect={cwvRef.current?.getBoundingClientRect() ?? null}
                          valueFmt={(v, name) => (name === "Pass" ? (v ? "Pass" : "—") : v ? "Fail" : "—")}
                          labelFmt={(l) => toDateLabel(l as string)}
                        />
                      )}
                      wrapperStyle={{ visibility: "hidden" }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      offset={8}
                    />
                    {/* Only top segment curved (Fail stacked above Pass) */}
                    <Bar dataKey="Pass" stackId="a" fill={TOKENS.valueBlue} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Fail" stackId="a" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardShell>
        </div>

        {/* ---------------- Row B ---------------- */}
        {/* 5) Clicks • Sessions • Conversions */}
        <div className="col-span-12 h-full sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Engagement (Tri‑metric)"
            info="Switch between Clicks (GSC), Sessions (GA4), or Conversions (GA4)."
            headerRight={
              <SegTabs
                value={triTab}
                onChange={setTriTab}
                items={[
                  { value: "clicks", label: "Clicks", disabled: !showGSC, cta: onConnectGSC },
                  { value: "sessions", label: "Sessions", disabled: !showGA4, cta: onConnectGA4 },
                  { value: "conversions", label: "Conversions", disabled: !showGA4, cta: onConnectGA4 },
                ]}
              />
            }
            onClick={() => onOpenDrawer?.("traffic")}
            state={
              loading
                ? "loading"
                : (!showGA4 && !showGSC) ||
                  (triTab === "clicks" && !showGSC) ||
                  ((triTab === "sessions" || triTab === "conversions") && !showGA4)
                ? "disconnected"
                : "default"
            }
          >
            {triTab === "clicks" && showGSC && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="tri-delta">
                    {fmtInt(data.clicks?.value)}
                  </output>
                  <ValueDelta delta={data.clicks?.delta} ariaId="tri-delta" />
                </div>
                <SparkArea series={S.clicks} aria="Clicks trend" />
              </div>
            )}
            {triTab === "sessions" && showGA4 && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="tri-delta">
                    {fmtInt(data.sessions?.value)}
                  </output>
                  <ValueDelta delta={data.sessions?.delta} ariaId="tri-delta" />
                </div>
                <SparkArea series={S.sessions} aria="Sessions trend" />
              </div>
            )}
            {triTab === "conversions" && showGA4 && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="tri-delta">
                    {fmtInt(data.conversions?.value)}
                  </output>
                  <ValueDelta delta={data.conversions?.delta} ariaId="tri-delta" />
                </div>
                <SparkArea series={S.conversions} aria="Conversions trend" />
              </div>
            )}
          </CardShell>
        </div>

        {/* 6) Organic CVR */}
        <div className="col-span-12 h-full sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Organic Conversion Rate"
            info="Conversions / Sessions (Organic)."
            onClick={() => onOpenDrawer?.("cvr")}
            state={loading ? "loading" : showGA4 ? "default" : "disconnected"}
          >
            {showGA4 && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="cvr-delta">
                    {fmtPct100(data.trafficValue?.value ?? 0)}
                  </output>
                  <ValueDelta delta={data.trafficValue?.delta} ariaId="cvr-delta" />
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    Conversions / Sessions (Organic)
                  </div>
                </div>
                <SparkArea series={ensureSeries(data.trafficValue?.series, data.trafficValue?.value, 24, 0.12)} aria="Organic CVR trend" />
              </div>
            )}
          </CardShell>
        </div>

        {/* 7) Avg Position & CTR */}
        <div className="col-span-12 h-full sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Avg Position & CTR"
            info="Weighted by impressions. Position: lower is better."
            headerRight={
              <SegTabs
                value={pairTab}
                onChange={setPairTab}
                items={[
                  { value: "position", label: "Position", disabled: !showGSC, cta: onConnectGSC },
                  { value: "ctr", label: "CTR", disabled: !showGSC, cta: onConnectGSC },
                ]}
              />
            }
            onClick={() => onOpenDrawer?.("position_ctr")}
            state={loading ? "loading" : showGSC ? "default" : "disconnected"}
          >
            {showGSC && pairTab === "position" && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="pos-delta">
                    {Number.isFinite(data.positionCtr?.position.value) ? (data.positionCtr?.position.value ?? 0).toFixed(1) : "—"}
                  </output>
                  <ValueDelta delta={data.positionCtr?.position.delta} invert ariaId="pos-delta" explain="Lower is better" />
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    Weighted by impressions
                  </div>
                </div>
                <SparkArea series={S.pos} aria="Average position trend" />
              </div>
            )}
            {showGSC && pairTab === "ctr" && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="ctr-delta">
                    {fmtPct100((data.positionCtr?.ctr.valuePct ?? 0) * 100)}
                  </output>
                  <ValueDelta delta={data.positionCtr?.ctr.delta} ariaId="ctr-delta" />
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    Weighted by impressions
                  </div>
                </div>
                <SparkArea series={S.ctr} aria="CTR trend" />
              </div>
            )}
          </CardShell>
        </div>

        {/* 8) Keyword Distribution + New/Lost (snapshot) */}
        <div className="col-span-12 h-full sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Keyword Distribution"
            info="Share of ranking keywords across Top 3 / Top 10 / Top 100."
            onClick={() => onOpenDrawer?.("keyword_distribution")}
            state={loading ? "loading" : "default"}
          >
            <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="kw-delta">
              {fmtInt(data.keywordDistribution.total, false)}
            </output>
            <ValueDelta delta={data.keywordDistribution.delta} ariaId="kw-delta" />
            <div ref={kwRef} className="h-16 w-full pr-1" role="img" aria-label="Keyword distribution stacked bar">
              <ResponsiveContainer>
                <BarChart
                  data={[
                    {
                      bucket: "All",
                      Top3: data.keywordDistribution.top3,
                      Top10: Math.max(0, data.keywordDistribution.top10 - data.keywordDistribution.top3),
                      Top100: Math.max(
                        0,
                        data.keywordDistribution.top100 - Math.max(data.keywordDistribution.top10, data.keywordDistribution.top3)
                      ),
                    },
                  ]}
                  margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
                >
                  <XAxis dataKey="bucket" hide />
                  <YAxis hide />
                  <RTooltip
                    content={(tp: any) => (
                      <PortalSmartTooltip
                        {...tp}
                        containerRect={kwRef.current?.getBoundingClientRect() ?? null}
                        valueFmt={(v) => fmtInt(v, false)}
                        labelFmt={() => "Ranking buckets"}
                      />
                    )}
                    wrapperStyle={{ visibility: "hidden" }}
                    allowEscapeViewBox={{ x: true, y: true }}
                    offset={8}
                  />
                  {/* Only the top segment curved with 6px radius */}
                  <Bar dataKey="Top3" stackId="a" fill="#005AD6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Top10" stackId="a" fill="#0077FF" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Top100" stackId="a" fill="#7FB6FF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="rounded-full bg-[color:var(--wr-pastel-blue,#D9EEF8)] px-2 py-0.5 font-medium text-[color:var(--wr-value-blue,#0077FF)]">
                +New {fmtInt(data.keywordDistribution.newCount, false)}
              </span>
              <span className="rounded-full px-2 py-0.5 font-medium" style={{ color: TOKENS.warning, background: TOKENS.warningPastel }}>
                −Lost {fmtInt(data.keywordDistribution.lostCount, false)}
              </span>
            </div>
          </CardShell>
        </div>

        {/* ---------------- Row C ---------------- */}
        {/* 9) Internal Linking Health */}
        <div className="col-span-12 h-full md:col-span-6 xl:col-span-4">
          <CardShell
            title="Internal Linking Health"
            info="DILS with orphan and dangling page ratios."
            onClick={() => onOpenDrawer?.("internal_linking")}
            state={loading ? "loading" : "default"}
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-3">
                <DonutGauge value01={(data.internalLinking.dils.value ?? 0) / 100} aria="DILS donut" tooltipTitle="DILS" filledLabel="Score" />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="dils-delta">
                    {fmtInt(data.internalLinking.dils.value, false)}
                  </output>
                  <ValueDelta delta={data.internalLinking.dils.delta} ariaId="dils-delta" />
                </div>
              </div>
              <div className="flex flex-col justify-center gap-2">
                {[
                  { label: "Orphan Pages", v: data.internalLinking.orphanPct },
                  { label: "Dangling Pages", v: data.internalLinking.danglingPct },
                ].map((it, i) => {
                  const pct = it.v ?? 0;
                  const tone = pct < 0.02 ? "good" : pct <= 0.05 ? "warning" : "critical";
                  const { solid, pastel } = statusColor(tone);
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="text-sm" style={{ color: TOKENS.muted }}>
                        {it.label}
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: solid, background: pastel }}>
                        {fmtPct01(pct)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardShell>
        </div>

        {/* 10) Indexability Coverage */}
        <div className="col-span-12 h-full md:col-span-6 xl:col-span-4">
          <CardShell
            title="Indexability Coverage"
            info="Indexable vs non-indexable vs canonicalized."
            onClick={() => onOpenDrawer?.("indexability")}
            state={loading ? "loading" : data.indexability?.connected ? "default" : "disconnected"}
          >
            {data.indexability?.connected ? (
              <>
                <div className="flex items-center gap-3">
                  <DonutSplit
                    aria="Indexability donut"
                    tooltipTitle="Indexability Coverage"
                    parts={[
                      { name: "Indexable", value: data.indexability.indexablePct ?? 0, color: TOKENS.valueBlue },
                      { name: "Non-indexable", value: data.indexability.nonIndexablePct ?? 0, color: TOKENS.warning },
                      ...(data.indexability.canonicalizedPct !== undefined
                        ? [{ name: "Canonicalized", value: data.indexability.canonicalizedPct, color: TOKENS.info }]
                        : []),
                    ]}
                  />
                  <div>
                    <div className="text-[22px] font-bold">
                      <span style={{ color: TOKENS.text }}>Indexable </span>
                      <output style={{ color: TOKENS.valueBlue }}>{fmtPct01(data.indexability.indexablePct)}</output>
                    </div>
                    <ValueDelta delta={data.indexability.deltaPP} unit="pp" ariaId="idx-delta" />
                  </div>
                </div>
                <MiniLegend
                  items={[
                    { swatch: TOKENS.valueBlue, label: "Indexable", value: fmtPct01(data.indexability.indexablePct) },
                    { swatch: TOKENS.warning, label: "Non-indexable", value: fmtPct01(data.indexability.nonIndexablePct) },
                    ...(data.indexability.canonicalizedPct !== undefined
                      ? [{ swatch: TOKENS.info, label: "Canonicalized", value: fmtPct01(data.indexability.canonicalizedPct) }]
                      : []),
                  ]}
                />
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm" style={{ color: TOKENS.muted }}>
                  Connect Google Search Console to see Indexability Coverage.
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectGSC?.();
                  }}
                  className="cursor-pointer rounded-full border px-3 py-1 text-xs"
                  style={{ borderColor: TOKENS.border }}
                >
                  Connect
                </button>
              </div>
            )}
          </CardShell>
        </div>

        {/* 11) SERP Features Coverage (trend optional on right) */}
        <div className="col-span-12 h-full md:col-span-6 xl:col-span-4">
          <CardShell
            title="SERP Features Coverage"
            info="Count of tracked keywords where your domain appears in any SERP feature."
            onClick={() => onOpenDrawer?.("serp_features")}
            state={loading ? "loading" : data.serpFeatures ? "default" : "empty"}
          >
            {data.serpFeatures && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="serp-delta">
                    {fmtInt(data.serpFeatures.total, false)}
                  </output>
                  <ValueDelta delta={data.serpFeatures.delta} ariaId="serp-delta" />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {data.serpFeatures.features.slice(0, 6).map((f) => (
                      <span
                        key={f.key}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                        style={{ border: `1px solid ${TOKENS.brand}`, background: TOKENS.pastelBlue, color: TOKENS.brand }}
                      >
                        <LayoutGrid size={12} color={TOKENS.brand} />
                        {f.label}
                        <span className="font-semibold" style={{ color: TOKENS.text }}>
                          {fmtInt(f.count, false)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                {S.serp && <SparkBars series={S.serp} aria="SERP features trend" />}
              </div>
            )}
          </CardShell>
        </div>

        {/* ---------------- Row D ---------------- */}
        {/* 12) Cannibalization Cases */}
        <div className="col-span-12 h-full md:col-span-6 xl:col-span-4">
          <CardShell
            title="Cannibalization Cases"
            info="Keywords with more than one competing URL."
            onClick={() => onOpenDrawer?.("cannibalization")}
            state={loading ? "loading" : data.cannibalization ? "default" : "empty"}
          >
            {data.cannibalization && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[22px] font-bold" aria-describedby="can-delta">
                    {fmtInt(data.cannibalization.cases, false)} keywords with &gt; 1 URL
                  </output>
                  <ValueDelta delta={data.cannibalization.delta} invert ariaId="can-delta" explain="Lower is better" />
                </div>
                <SparkBars
                  series={ensureSeries(data.cannibalization.series, data.cannibalization.cases, 12, 0.2)}
                  aria="Cannibalization trend"
                  color={TOKENS.warning}
                />
              </div>
            )}
          </CardShell>
        </div>

        {/* 13) New/Lost Referring Domains (grouped bars) */}
        <div className="col-span-12 h-full md:col-span-6 xl:col-span-4">
          <CardShell
            title="New / Lost Referring Domains"
            info="New vs lost RD per week."
            onClick={() => onOpenDrawer?.("new_lost_rd")}
            state={loading ? "loading" : data.newLostRD ? "default" : "empty"}
          >
            {data.newLostRD && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <output className="block text-[22px] font-bold" aria-describedby="rd-delta">
                    +{fmtInt(data.newLostRD.newTotal, false)} / −{fmtInt(data.newLostRD.lostTotal, false)} RD
                  </output>
                  <div id="rd-delta" className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    Net {fmtInt((data.newLostRD.newTotal ?? 0) - (data.newLostRD.lostTotal ?? 0), false)}
                  </div>
                </div>
                <div ref={rdRef} className="h-16 w-[9.5rem] sm:w-[10.5rem] md:w-[11rem]" role="img" aria-label="New vs Lost RD trend">
                  <ResponsiveContainer>
                    <BarChart
                      data={ensureSeries(data.newLostRD.seriesNew, 8, 10, 0.4).map((p, i) => ({
                        date: p.t,
                        New: p.v,
                        Lost: Math.abs(data.newLostRD?.seriesLost?.[i]?.v ?? Math.round(p.v * 0.5)),
                      }))}
                      margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <RTooltip
                        content={(tp: any) => (
                          <PortalSmartTooltip
                            {...tp}
                            containerRect={rdRef.current?.getBoundingClientRect() ?? null}
                            valueFmt={(v) => fmtInt(v, false)}
                            labelFmt={(l) => toDateLabel(l as string)}
                          />
                        )}
                        wrapperStyle={{ visibility: "hidden" }}
                        allowEscapeViewBox={{ x: true, y: true }}
                        offset={8}
                      />
                      {/* Curved 6px top edges */}
                      <Bar dataKey="New" fill={TOKENS.valueBlue} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Lost" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardShell>
        </div>

        {/* ---------------- Row E ---------------- */}
        {/* 14) Crawl Errors Snapshot — Stacked Donut + Trend */}
        <div className="col-span-12 h-full md:col-span-6 xl:col-span-4">
          <CardShell
            title="Crawl Errors Snapshot"
            info="4xx and 5xx share of crawled URLs."
            onClick={() => onOpenDrawer?.("crawl_errors")}
            state={loading ? "loading" : data.crawlErrors ? "default" : "empty"}
          >
            {data.crawlErrors && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <DonutSplit
                    aria="Crawl errors donut"
                    tooltipTitle="Crawl Errors"
                    parts={[
                      { name: "4xx", value: data.crawlErrors.fourXxPct ?? 0, color: TOKENS.warning },
                      { name: "5xx", value: data.crawlErrors.fiveXxPct ?? 0, color: TOKENS.danger },
                      {
                        name: "OK",
                        value: Math.max(0, 1 - (data.crawlErrors.fourXxPct ?? 0) - (data.crawlErrors.fiveXxPct ?? 0)),
                        color: TOKENS.success,
                      },
                    ]}
                  />
                  <div>
                    <output className="block text-[22px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="err-delta">
                      {fmtPct01((data.crawlErrors.fourXxPct ?? 0) + (data.crawlErrors.fiveXxPct ?? 0))}
                    </output>
                    <ValueDelta delta={data.crawlErrors.deltaPct} invert ariaId="err-delta" explain="Lower is better" />
                  </div>
                </div>

                <div ref={errRef} className="h-16 w-[9.5rem] sm:w-[10.5rem] md:w-[11rem]" role="img" aria-label="4xx/5xx trend">
                  <ResponsiveContainer>
                    <BarChart
                      data={ensureSeries(
                        (data.crawlErrors.series ?? []).map((p) => ({ t: p.t, v: (p.fourXxPct + p.fiveXxPct) * 100 })),
                        ((data.crawlErrors.fourXxPct ?? 0) + (data.crawlErrors.fiveXxPct ?? 0)) * 100,
                        10,
                        0.2
                      ).map((p, i) => {
                        const src = data.crawlErrors?.series?.[i];
                        return {
                          date: p.t,
                          "4xx": (src?.fourXxPct ?? 0) * 100,
                          "5xx": (src?.fiveXxPct ?? 0) * 100,
                        };
                      })}
                      margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <RTooltip
                        content={(tp: any) => (
                          <PortalSmartTooltip
                            {...tp}
                            containerRect={errRef.current?.getBoundingClientRect() ?? null}
                            valueFmt={(v) => fmtPct100(v, 1)}
                            labelFmt={(l) => toDateLabel(l as string)}
                          />
                        )}
                        wrapperStyle={{ visibility: "hidden" }}
                        allowEscapeViewBox={{ x: true, y: true }}
                        offset={8}
                      />
                      {/* Only top stacked segment rounded (5xx on top) */}
                      <Bar dataKey="4xx" stackId="a" fill={TOKENS.warning} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="5xx" stackId="a" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardShell>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
 * OPTIONAL DEMO WRAPPER (remove in production)
 * --------------------------------------------------------------------------*/
export default ProjectSummarySection;
