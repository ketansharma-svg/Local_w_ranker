"use client";

import React, { useEffect, useMemo, useState, useContext, createContext } from "react";
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
  CartesianGrid,
} from "recharts";
import {
  Sparkles,
  ChevronDown,
  MoreHorizontal,
  Info as InfoIcon,
  FileText,
  ClipboardList,
  PenSquare,
  ExternalLink,
} from "lucide-react";

/* ========================================================================================
 * TOKENS (same palette/pattern as the rest of the panel)
 * ====================================================================================== */
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
} as const;

/* ========================================================================================
 * HELPERS / FORMATTERS
 * ====================================================================================== */
const nf = new Intl.NumberFormat();
function fmtInt(n?: number | null, compact = true) {
  if (n == null || Number.isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 10_000) {
    const u = [
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "K" },
    ];
    for (const it of u) if (Math.abs(n) >= it.v) return `${(n / it.v).toFixed(1)}${it.s}`;
  }
  return nf.format(n);
}
function fmtPct01(p?: number | null, digits = 1) {
  if (p == null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(digits)}%`;
}
function fmtPct100(p?: number | null, digits = 1) {
  if (p == null || Number.isNaN(p)) return "—";
  return `${(p ?? 0).toFixed(digits)}%`;
}
function toDateLabel(d: string | number | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function caret(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v) || v === 0) return "—";
  return v > 0 ? "▲" : "▼";
}
function toneByGoodBad(delta?: number, invert = false) {
  if (typeof delta !== "number") return TOKENS.muted;
  const isGood = invert ? delta < 0 : delta > 0;
  return isGood ? TOKENS.success : TOKENS.danger;
}

/* ========================================================================================
 * TYPES
 * ====================================================================================== */
export type SeriesPoint = { t: string; v: number };

type StageSnapshot = {
  total: number;
  deltaPct: number; // sign semantics per stage (see spec)
  seoScoreAvg: number; // 0..100
  seoDist?: { lt50: number; b50_69: number; gte70: number }; // optional for split donut
  readabilityAvg: number; // 0..100
  velocitySeries: SeriesPoint[];
};

type UnderperfRow = {
  id: string;
  title: string;
  url: string;
  impressions: number;
  ctrPct: number; // 0..100
  expectedCtrPct: number; // 0..100
  avgPos: number;
  seoScore: number; // 0..100
  readability: number; // 0..100
  lastUpdated: string; // ISO
  cluster?: string;
  author?: string;
};

type ContentPipelineData = {
  timeframe: "7d" | "30d" | "90d" | "12m";
  scope: "all" | "blog" | "docs" | "landing" | "other";
  stages: {
    ideas: StageSnapshot;
    draft: StageSnapshot;
    review: StageSnapshot;
    published: StageSnapshot & {
      publishedSeries: { t: string; published: number; refreshed: number; words?: number }[];
    };
  };
  funnel: {
    draft: { pass: number; fail: number };
    review: { pass: number; fail: number };
    published: { pass: number; fail: number };
  };
  backlogAging: Array<{ bucket: "0-2d" | "3-7d" | "8-14d" | "15+d"; count: number }>;
  underperforming: UnderperfRow[]; // provide 10 rows
  connected: { gsc: boolean };
};

/* ========================================================================================
 * PERSISTED SEG-TABS
 * ====================================================================================== */
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

/* ========================================================================================
 * SERIES HELPERS
 * ====================================================================================== */
function makeSeries(points = 12, base = 100, noise = 0.1, seed = "s"): SeriesPoint[] {
  const r = rng(seed);
  const start = new Date();
  start.setDate(start.getDate() - (points - 1));
  const out: SeriesPoint[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    v = Math.max(0, v + (r() - 0.5) * base * noise);
    out.push({ t: d.toISOString().slice(0, 10), v: Math.round(v) });
  }
  return out;
}
function ensureSeries(series?: SeriesPoint[], base = 10, points = 12, noise = 0.1) {
  if (series && series.length) return series;
  return makeSeries(points, base, noise);
}
function rng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/* ========================================================================================
 * SHARED ATOMS — Kebab, Titles, Shell, Tooltip, Sparks, Donuts, SegTabs
 * ====================================================================================== */
function KebabMenu({ onAddToReport }: { onAddToReport?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
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
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => onAddToReport?.()}>
            Add to Report
          </button>
        </div>
      )}
    </div>
  );
}

function TitleWithHoverInfo({ title, info }: { title: string; info?: string }) {
  return (
    <div className="relative flex min-w-0 items-center gap-2 group/title">
      <div className="truncate text-[13px] font-semibold">{title}</div>
      {info ? <InfoIcon size={15} className="text-[#9CA3AF]" /> : null}
      {info ? (
        <div
          role="tooltip"
          className="invisible group-hover/title:visible absolute left-0 top-5 z-50 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}

/* --- Card z-index elevator context (to place tooltips over other cards) --- */
type CardLayerCtxType = { setRaised: (v: boolean) => void };
const CardLayerCtx = createContext<CardLayerCtxType | null>(null);
function useCardLayer() {
  return useContext(CardLayerCtx);
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
  const [raised, setRaised] = useState(false);

  const isLoading = state === "loading";
  const isEmpty = state === "empty";
  const isDisconnected = state === "disconnected";

  const content = (
    <>
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
        <div className="mt-3 flex h-24 items-center justify-center rounded-md bg-[#F5F7FA] text-sm" style={{ color: TOKENS.muted }}>
          Source disconnected. Connect to view this KPI.
        </div>
      ) : isEmpty ? (
        <div className="mt-3 flex h-24 items-center justify-center rounded-md bg-[#F5F7FA] text-sm" style={{ color: TOKENS.muted }}>
          No data for the selected filters.
        </div>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </>
  );

  return (
    <button
      type="button"
      className="group relative flex w-full flex-col rounded-[6px] border p-4 text-left shadow-sm transition-transform hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wr-value-blue,#0077FF)]/50"
      style={{
        borderColor: TOKENS.border,
        background: TOKENS.surface,
        zIndex: raised ? 60 : undefined, // elevate when a chart inside asks for it
      }}
      onClick={onClick}
      onMouseLeave={() => setRaised(false)} // safety reset
    >
      <CardLayerCtx.Provider value={{ setRaised }}>{content}</CardLayerCtx.Provider>
    </button>
  );
}

function ValueDelta({ delta, invert = false, unit = "%", ariaId, explain }: { delta?: number; invert?: boolean; unit?: "%" | "pp" | ""; ariaId?: string; explain?: string }) {
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

/* ========================================================================================
 * Smart tooltips (RTooltip)
 * ====================================================================================== */
function SmartTooltip({
  active,
  label,
  payload,
  valueFmt,
  labelFmt,
}: any & { valueFmt?: (v: number, name?: string) => string; labelFmt?: (l: any) => string }) {
  if (!active) return null;
  return (
    <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}>
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
            <div className="font-semibold">{valueFmt ? valueFmt(p.value as number, p.name) : fmtInt(p.value as number, false)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutTooltip({
  active,
  title,
  parts,
  valueFmt,
}: any & { title?: string; parts: { name: string; value: number; color: string }[]; valueFmt?: (v: number) => string }) {
  if (!active) return null;
  return (
    <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}>
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
    </div>
  );
}

/* ========================================================================================
 * Sparks / Charts — raise card on hover + clamp tooltip horizontally inside chart
 * ====================================================================================== */
function SparkArea({ series, aria, color = TOKENS.valueBlue, pastel = TOKENS.pastelBlue }: { series?: SeriesPoint[]; aria: string; color?: string; pastel?: string }) {
  const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
  const gradId = `grad-${aria.replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2)}`;
  const layer = useCardLayer();

  return (
    <div
      className="h-16 w-[10.75rem]"
      role="img"
      aria-label={aria}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
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
            content={<SmartTooltip valueFmt={(v) => fmtInt(v, false)} labelFmt={(l) => toDateLabel(l as string)} />}
            // Keep inside chart width so it flips to the left when near the right edge
            allowEscapeViewBox={{ x: false, y: true }}
            offset={8}
            wrapperStyle={{ zIndex: 9999 }}
            cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SparkBars({ series, aria, color = TOKENS.valueBlue }: { series?: SeriesPoint[]; aria: string; color?: string }) {
  const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
  const layer = useCardLayer();

  return (
    <div
      className="h-16 w-[10.75rem]"
      role="img"
      aria-label={aria}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={<SmartTooltip valueFmt={(v) => fmtInt(v, false)} labelFmt={(l) => toDateLabel(l as string)} />}
            // Clamp horizontally so tooltip repositions within the card (prefer left of pointer)
            allowEscapeViewBox={{ x: false, y: true }}
            offset={8}
            wrapperStyle={{ zIndex: 9999 }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut gauge — elevates parent CardShell on hover so tooltip overlays other cards */
function DonutGauge({
  value01,
  aria,
  filled = TOKENS.valueBlue,
  empty = TOKENS.pastelBlue,
  size = 54,
  tooltipTitle,
  filledLabel = "Value",
  emptyLabel = "Remaining",
  valueFmt = (v: number) => fmtPct01(v),
}: {
  value01: number;
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
  const layer = useCardLayer();
  return (
    <div
      className="h-[54px] w-[54px] shrink-0"
      role="img"
      aria-label={aria}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={<DonutTooltip title={tooltipTitle} parts={parts} valueFmt={valueFmt} />}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
            wrapperStyle={{ zIndex: 9999 }}
          />
          <Pie data={parts.map((d) => ({ ...d, v: d.value }))} dataKey="v" innerRadius={size / 2 - 12} outerRadius={size / 2} startAngle={90} endAngle={-270} isAnimationActive>
            {parts.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut split — elevates parent CardShell on hover so tooltip overlays other cards */
function DonutSplit({
  parts,
  aria,
  size = 54,
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
  const layer = useCardLayer();
  return (
    <div
      className="h-[54px] w-[54px] shrink-0"
      role="img"
      aria-label={aria}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={<DonutTooltip title={tooltipTitle} parts={data} valueFmt={valueFmt} />}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
            wrapperStyle={{ zIndex: 9999 }}
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

function SegTabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs" style={{ borderColor: TOKENS.border }}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={(e) => {
            e.stopPropagation();
            onChange(it.value);
          }}
          className={`rounded-full px-2.5 py-1 transition ${value === it.value ? "bg-[#F5F7FA] font-semibold" : "text-[color:var(--wr-muted,#6B7280)]"}`}
          aria-pressed={value === it.value}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ========================================================================================
 * HOVER GROUP (unchanged) — single-popover control within lists
 * ====================================================================================== */
type HoverCtx = { activeId: string | null; setActiveId: (id: string | null) => void };
const HoverGroupCtx = createContext<HoverCtx | null>(null);
function HoverGroup({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const ctx = useMemo(() => ({ activeId, setActiveId }), [activeId]);
  return <HoverGroupCtx.Provider value={ctx}>{children}</HoverGroupCtx.Provider>;
}
function useHoverGroup() {
  return useContext(HoverGroupCtx);
}

/** Progressive bar with single-popover controller (group) — now elevates parent CardShell while active */
function ProgressBarSmart({
  id,
  value01,
  color = TOKENS.valueBlue,
  label,
  tooltipTitle,
  valueFmt = (v: number) => fmtPct01(v),
}: {
  id: string;
  value01: number;
  color?: string;
  label?: string;
  tooltipTitle?: string;
  valueFmt?: (v: number) => string;
}) {
  const g = useHoverGroup();
  const layer = useCardLayer();
  const v = Math.max(0, Math.min(1, value01));
  const visible = g?.activeId === id;
  return (
    <div
      className="relative"
      onMouseEnter={() => {
        g?.setActiveId(id);
        layer?.setRaised(true);
      }}
      onMouseLeave={() => {
        g?.setActiveId(null);
        layer?.setRaised(false);
      }}
      onFocus={() => {
        g?.setActiveId(id);
        layer?.setRaised(true);
      }}
      onBlur={() => {
        g?.setActiveId(null);
        layer?.setRaised(false);
      }}
      tabIndex={0}
      aria-label={tooltipTitle || label || "bar"}
    >
      <div className="h-2 w-full rounded bg-[color:var(--wr-border,#EFF0F6)]">
        <div className="h-2 rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      {label && (
        <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
          {label}
        </div>
      )}
      {visible && (
        <div
          className="pointer-events-none absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-md border bg-white p-2 text-xs shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {tooltipTitle && (
            <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
              {tooltipTitle}
            </div>
          )}
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
              <span style={{ color: TOKENS.muted }}>Value</span>
            </div>
            <div className="font-semibold">{valueFmt(v)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Stacked progressive bar (two parts) with single-popover controller */
function StackedProgressSmart({
  id,
  pass01,
  fail01,
  passColor = TOKENS.success,
  failColor = TOKENS.danger,
  tooltipTitle,
}: {
  id: string;
  pass01: number; // 0..1
  fail01: number; // 0..1
  passColor?: string;
  failColor?: string;
  tooltipTitle?: string;
}) {
  const g = useHoverGroup();
  const p = Math.max(0, Math.min(1, pass01));
  const f = Math.max(0, Math.min(1, fail01));
  const sum = p + f || 1;
  const P = (p / sum) * 100;
  const F = (f / sum) * 100;
  const visible = g?.activeId === id;
  return (
    <div
      className="relative"
      onMouseEnter={() => g?.setActiveId(id)}
      onMouseLeave={() => g?.setActiveId(null)}
      onFocus={() => g?.setActiveId(id)}
      onBlur={() => g?.setActiveId(null)}
      tabIndex={0}
      aria-label={tooltipTitle || "stacked-progress"}
    >
      <div className="h-2 w-full overflow-hidden rounded bg-[color:var(--wr-border,#EFF0F6)]">
        <div className="h-2" style={{ width: `${P}%`, background: passColor }} />
        <div className="h-2" style={{ width: `${F}%`, background: failColor }} />
      </div>
      {visible && (
        <div
          className="pointer-events-none absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-md border bg-white p-2 text-xs shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {tooltipTitle && (
            <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
              {tooltipTitle}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: passColor }} />
                <span style={{ color: TOKENS.muted }}>Meets SEO</span>
              </div>
              <div className="font-semibold">{fmtPct01(p)}</div>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: failColor }} />
                <span style={{ color: TOKENS.muted }}>Below</span>
              </div>
              <div className="font-semibold">{fmtPct01(f)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================================
 * MAIN SECTION
 * ====================================================================================== */
export interface ContentPerformancePipelineSectionProps {
  data?: ContentPipelineData; // if not provided, mock is used
  onNavigate?: (url: string) => void;
  onAddToReport?: () => void;
  onExport?: (fmt: "PNG" | "CSV" | "PDF") => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export default function ContentPerformancePipelineSection({
  data,
  onNavigate,
  onAddToReport,
  onExport,
  onRefresh,
  loading,
  className,
}: ContentPerformancePipelineSectionProps) {
  const D:any = useMemo(() => data ?? makeMockContentPipelineData(), [data]);

  const [timeTab, setTimeTab] = useStickyTab<"7d" | "30d" | "90d" | "12m">("wr:cp:tf", D.timeframe ?? "30d");
  const [scopeTab, setScopeTab] = useStickyTab<"all" | "blog" | "docs" | "landing" | "other">("wr:cp:scope", D.scope ?? "all");
  const [velTab, setVelTab] = useStickyTab<"count" | "words">("wr:cp:vel", "count");

  // Table filters
  const [q, setQ] = useState("");
  const [chipHighImpr, setChipHighImpr] = useState(false);
  const [chipCtrBelow, setChipCtrBelow] = useState(true);
  const [chipOutdated, setChipOutdated] = useState(false);
  const [minImpr, setMinImpr] = useState(1000);

  // Filtered rows (top 10 by default)
  const underRows = useMemo(() => {
    const now = new Date().getTime();
    const impCut = minImpr;
    return D.underperforming
      .filter((r) => {
        if (q && !r.title.toLowerCase().includes(q.toLowerCase()) && !r.url.toLowerCase().includes(q.toLowerCase())) return false;
        if (chipHighImpr && r.impressions < impCut) return false;
        if (chipCtrBelow && r.ctrPct >= r.expectedCtrPct) return false;
        if (chipOutdated) {
          const dt = new Date(r.lastUpdated).getTime();
          if (now - dt < 90 * 86400000) return false;
        }
        return true;
      })
      .sort((a, b) => (a.ctrPct - a.expectedCtrPct) - (b.ctrPct - b.expectedCtrPct))
      .slice(0, 10);
  }, [D.underperforming, q, chipHighImpr, chipCtrBelow, chipOutdated, minImpr]);

  return (
    <section className={className}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
          Content Performance & Pipeline
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddToReport}
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white"
            style={{ background: TOKENS.valueBlue }}
          >
            <Sparkles size={16} />
            Add to Report
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm" style={{ borderColor: TOKENS.border }} onClick={() => onExport?.("PNG")}>
            Export
            <ChevronDown size={16} className="text-[#9CA3AF]" />
          </button>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm" style={{ borderColor: TOKENS.border }} onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {/* Global filter bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SegTabs value={timeTab} onChange={setTimeTab} items={[{ value: "7d", label: "7D" }, { value: "30d", label: "30D" }, { value: "90d", label: "90D" }, { value: "12m", label: "12M" }]} />
        <SegTabs value={scopeTab} onChange={setScopeTab} items={[{ value: "all", label: "All" }, { value: "blog", label: "Blog" }, { value: "docs", label: "Docs" }, { value: "landing", label: "Landing" }, { value: "other", label: "Other" }]} />
      </div>

      <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

      {/* GRID */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* ================= Row A: Stage cards ================= */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StageCard
            title="Ideas"
            info="New ideas entering backlog and their quality snapshot."
            snap="dist"
            snapshotDist={D.stages.ideas.seoDist}
            total={D.stages.ideas.total}
            delta={D.stages.ideas.deltaPct}
            deltaInvert // fewer in backlog is good
            seoAvg={D.stages.ideas.seoScoreAvg}
            readAvg={D.stages.ideas.readabilityAvg}
            trend={D.stages.ideas.velocitySeries}
            onClick={() => onNavigate?.(`/content?stage=idea&tf=${timeTab}&scope=${scopeTab}`)}
          />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StageCard
            title="Draft"
            info="Drafts being worked on; decreasing backlog is good."
            snap="dist"
            snapshotDist={D.stages.draft.seoDist}
            total={D.stages.draft.total}
            delta={D.stages.draft.deltaPct}
            deltaInvert // less stuck drafts → good
            seoAvg={D.stages.draft.seoScoreAvg}
            readAvg={D.stages.draft.readabilityAvg}
            trend={D.stages.draft.velocitySeries}
            onClick={() => onNavigate?.(`/content?stage=draft&tf=${timeTab}&scope=${scopeTab}`)}
          />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StageCard
            title="Review"
            info="Pieces under editorial/SME review; lower queue is good."
            snap="dist"
            snapshotDist={D.stages.review.seoDist}
            total={D.stages.review.total}
            delta={D.stages.review.deltaPct}
            deltaInvert
            seoAvg={D.stages.review.seoScoreAvg}
            readAvg={D.stages.review.readabilityAvg}
            trend={D.stages.review.velocitySeries}
            onClick={() => onNavigate?.(`/content?stage=review&tf=${timeTab}&scope=${scopeTab}`)}
          />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StageCard
            title="Published"
            info="Published output and quality."
            snap="gauge"
            total={D.stages.published.total}
            delta={D.stages.published.deltaPct}
            seoAvg={D.stages.published.seoScoreAvg}
            readAvg={D.stages.published.readabilityAvg}
            trend={D.stages.published.velocitySeries}
            onClick={() => onNavigate?.(`/content?stage=published&tf=${timeTab}&scope=${scopeTab}`)}
          />
        </div>

        {/* ================= Row B: Big & small charts ================= */}
        {/* Publishing Velocity */}
        <div className="col-span-12 lg:col-span-7">
          <CardShell
            title="Publishing Velocity & Refreshes"
            info="Weekly output. Switch between Count and Words."
            headerRight={<SegTabs value={velTab} onChange={setVelTab} items={[{ value: "count", label: "Count" }, { value: "words", label: "Words" }]} />}
            onClick={() => onNavigate?.(`/content?view=timeline&tf=${timeTab}&scope=${scopeTab}`)}
            state={loading ? "loading" : "default"}
          >
            <div className="h-48 w-full" role="img" aria-label="Publishing velocity chart">
              <ResponsiveContainer>
                <BarChart
                  data={ensureSeries(D.stages.published.publishedSeries, 12, 12, 0.1).map((p:any) => ({
                    date: p.t,
                    Published: p.published ,
                    Updated: p.refreshed ,
                    Words: Math.max(0, p.words ?? Math.round((p.published + p.refreshed) * 800)),
                  }))}
                  margin={{ top: 10, right: 18, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke={TOKENS.border} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(t) => toDateLabel(t)} />
                  <YAxis />
                  <RTooltip
                    content={<SmartTooltip valueFmt={(v) => fmtInt(v as number, false)} labelFmt={(l) => toDateLabel(l as string)} />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    offset={10}
                    wrapperStyle={{ zIndex: 9999 }}
                  />
                  <Bar dataKey="Published" stackId="a" fill={TOKENS.valueBlue} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Updated" stackId="a" fill={TOKENS.info} radius={[6, 6, 0, 0]} />
                  {velTab === "words" && (
                    <>
                      <ReferenceLine y={0} stroke={TOKENS.muted} />
                      <Area type="monotone" dataKey="Words" stroke={TOKENS.success} fill={TOKENS.successPastel} strokeWidth={2} dot={false} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        </div>

        {/* Quality Funnel */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-5">
          <CardShell
            title="Quality Funnel (Stage → Pass Rate)"
            info="Share of items meeting SEO threshold (≥70) by stage."
            onClick={() => onNavigate?.(`/content?view=funnel&tf=${timeTab}&scope=${scopeTab}`)}
            state={loading ? "loading" : "default"}
          >
            <HoverGroup>
              <div className="space-y-3">
                {(["draft", "review", "published"] as const).map((k) => {
                  const data = k === "draft" ? D.funnel.draft : k === "review" ? D.funnel.review : D.funnel.published;
                  const pass = data.pass;
                  const fail = data.fail;
                  const sum = Math.max(1, pass + fail);
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <div className="w-24 capitalize" style={{ color: TOKENS.muted }}>
                        {k}
                      </div>
                      <div className="flex-1">
                        <StackedProgressSmart id={`funnel-${k}`} pass01={pass / sum} fail01={fail / sum} tooltipTitle={`${capitalize(k)} pass rate`} />
                      </div>
                      <div className="w-20 text-right text-sm">
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: TOKENS.success, background: TOKENS.successPastel }}>
                          {fmtPct01(pass / sum)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </HoverGroup>
          </CardShell>
        </div>

        {/* Backlog Aging */}
        <div className="col-span-12 lg:col-span-5">
          <CardShell
            title="Backlog Aging (Review)"
            info="How long items have been waiting in Review."
            onClick={() => onNavigate?.(`/content?stage=review&view=aging&tf=${timeTab}&scope=${scopeTab}`)}
            state={loading ? "loading" : "default"}
          >
            <div className="h-40 w-full" role="img" aria-label="Backlog aging chart">
              <ResponsiveContainer>
                <BarChart data={D.backlogAging} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={TOKENS.border} vertical={false} />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <RTooltip content={<SmartTooltip valueFmt={(v) => fmtInt(v as number, false)} labelFmt={(l) => String(l)} />} allowEscapeViewBox={{ x: true, y: true }} offset={10} wrapperStyle={{ zIndex: 9999 }} />
                  <Bar dataKey="count" fill={TOKENS.warning} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        </div>

        {/* ================= Row C: Underperforming Published Posts (Top 10) ================= */}
        <div className="col-span-12">
          <CardShell
            title="Underperforming Published Posts"
            info="High impressions with CTR below expected baseline. Top 10 shown."
            onClick={() => onNavigate?.(`/content?view=underperforming&tf=${timeTab}&scope=${scopeTab}`)}
            state={loading ? "loading" : D.connected.gsc ? "default" : "disconnected"}
            headerRight={
              <button
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: TOKENS.border }}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.(`/content?view=underperforming&tf=${timeTab}&scope=${scopeTab}`);
                }}
              >
                Open Content Dashboard
              </button>
            }
          >
            {D.connected.gsc && (
              <>
                {/* Filters */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      className="h-8 w-[280px] rounded border pl-3 pr-2 text-sm outline-none"
                      style={{ borderColor: TOKENS.border }}
                      placeholder="Search title or URL…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                  <Chip active={chipHighImpr} onClick={() => setChipHighImpr((v) => !v)}>
                    High Impressions
                  </Chip>
                  <Chip active={chipCtrBelow} onClick={() => setChipCtrBelow((v) => !v)}>
                    CTR &lt; baseline
                  </Chip>
                  <Chip active={chipOutdated} onClick={() => setChipOutdated((v) => !v)}>
                    Outdated &gt; 90d
                  </Chip>
                  <div className="ml-2 flex items-center gap-2">
                    <span className="text-xs" style={{ color: TOKENS.muted }}>
                      Min Impr.
                    </span>
                    <input type="range" min={0} max={50000} step={500} value={minImpr} onChange={(e) => setMinImpr(Number(e.target.value))} />
                    <span className="w-20 text-right text-xs">{fmtInt(minImpr, true)}</span>
                  </div>
                </div>

                {/* Table */}
                <div className="max-h-[520px] overflow-auto rounded border" style={{ borderColor: TOKENS.border }}>
                  <HoverGroup>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-white">
                        <tr>
                          {["Title / URL", "Impr.", "CTR", "Exp. CTR", "Δ vs exp (pp)", "Avg Pos.", "SEO Score", "Readability", "Last Updated", "Actions"].map((h, i) => (
                            <th key={i} className={`px-3 py-2 text-left ${i > 0 ? "whitespace-nowrap" : ""}`} style={{ borderBottom: `1px solid ${TOKENS.border}`, color: TOKENS.muted }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {underRows.map((r) => {
                          const gap = r.ctrPct - r.expectedCtrPct; // pp
                          const isNeg = gap < 0;
                          const scoreTone = r.seoScore >= 70 ? TOKENS.success : r.seoScore >= 50 ? TOKENS.warning : TOKENS.danger;
                          const readTone = r.readability >= 70 ? TOKENS.success : r.readability >= 50 ? TOKENS.warning : TOKENS.danger;
                          return (
                            <tr key={r.id} className="hover:bg-[#F8FAFC]">
                              <td className="px-3 py-2 align-top">
                                <div className="truncate font-medium">{r.title}</div>
                                <div className="truncate text-xs" style={{ color: TOKENS.muted }}>
                                  {r.url}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top text-right">{fmtInt(r.impressions)}</td>
                              {/* CTR with smart popover (single controller via HoverGroup) */}
                              <td className="px-3 py-2 align-top">
                                <CtrPopover id={`ctr-${r.id}`} actual={r.ctrPct} expected={r.expectedCtrPct} />
                              </td>
                              <td className="px-3 py-2 align-top text-right">{fmtPct100(r.expectedCtrPct, 1)}</td>
                              <td className="px-3 py-2 align-top text-right">
                                <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ color: isNeg ? TOKENS.danger : TOKENS.success, background: isNeg ? TOKENS.dangerPastel : TOKENS.successPastel }}>
                                  {gap > 0 ? "+" : ""}
                                  {gap.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-3 py-2 align-top text-right">{r.avgPos.toFixed(1)}</td>
                              <td className="px-3 py-2 align-top">
                                <ProgressBarSmart id={`seo-${r.id}`} value01={r.seoScore / 100} color={scoreTone} tooltipTitle="SEO Score (avg)" valueFmt={(v) => `${Math.round(v * 100)}/100`} />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <ProgressBarSmart id={`read-${r.id}`} value01={r.readability / 100} color={readTone} tooltipTitle="Readability (avg)" valueFmt={(v) => `${Math.round(v * 100)}/100`} />
                              </td>
                              <td className="px-3 py-2 align-top text-center">{r.lastUpdated}</td>
                              <td className="px-3 py-2 align-top">
                                <div className="flex items-center gap-1.5">
                                  <IconBtn
                                    label="Open in Content Canvas"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate?.(`/content/canvas?url=${encodeURIComponent(r.url)}`);
                                    }}
                                  >
                                    <PenSquare className="h-4 w-4" />
                                  </IconBtn>
                                  <IconBtn
                                    label="Generate Outline (AI)"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate?.(`/content/ai/outline?seed=${encodeURIComponent(r.title)}&cluster=${encodeURIComponent(r.cluster ?? "")}`);
                                    }}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </IconBtn>
                                  <IconBtn
                                    label="Create Task"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate?.(`/tasks/new?template=content_underperf&url=${encodeURIComponent(r.url)}`);
                                    }}
                                  >
                                    <ClipboardList className="h-4 w-4" />
                                  </IconBtn>
                                  <IconBtn
                                    label="Open Page"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(r.url, "_blank");
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </IconBtn>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </HoverGroup>
                </div>
              </>
            )}
          </CardShell>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================================
 * SMALLER PIECES (Stage card, CTR popover, chips, buttons)
 * ====================================================================================== */
function StageCard({
  title,
  info,
  snap,
  snapshotDist,
  total,
  delta,
  deltaInvert = false,
  seoAvg,
  readAvg,
  trend,
  onClick,
}: {
  title: string;
  info?: string;
  snap: "gauge" | "dist";
  snapshotDist?: StageSnapshot["seoDist"];
  total: number;
  delta: number;
  deltaInvert?: boolean;
  seoAvg: number;
  readAvg: number;
  trend: SeriesPoint[];
  onClick?: () => void;
}) {
  const seoTone = seoAvg >= 70 ? TOKENS.success : seoAvg >= 50 ? TOKENS.warning : TOKENS.danger;
  const readTone = readAvg >= 70 ? TOKENS.success : readAvg >= 50 ? TOKENS.warning : TOKENS.danger;

  const distParts =
    snap === "dist" && snapshotDist
      ? [
          { name: "≥70", value: (snapshotDist.gte70 ?? 0) / Math.max(1, snapshotDist.lt50 + snapshotDist.b50_69 + snapshotDist.gte70), color: TOKENS.success },
          { name: "50–69", value: (snapshotDist.b50_69 ?? 0) / Math.max(1, snapshotDist.lt50 + snapshotDist.b50_69 + snapshotDist.gte70), color: TOKENS.warning },
          { name: "<50", value: (snapshotDist.lt50 ?? 0) / Math.max(1, snapshotDist.lt50 + snapshotDist.b50_69 + snapshotDist.gte70), color: TOKENS.danger },
        ]
      : null;

  return (
    <CardShell title={title} info={info} onClick={onClick} state="default">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {snap === "gauge" ? (
            <DonutGauge value01={seoAvg / 100} aria="SEO score gauge" tooltipTitle="Average SEO score" filledLabel="Score" valueFmt={(v) => `${Math.round(v * 100)}/100`} />
          ) : (
            <DonutSplit aria="SEO score distribution" tooltipTitle="SEO Score buckets" parts={distParts || [{ name: "N/A", value: 1, color: TOKENS.pastelBlue }]} />
          )}
          <div>
            <output className="block text-[22px] font-bold" aria-describedby={`${title}-delta`}>
              {fmtInt(total, false)} items
            </output>
            <ValueDelta delta={delta} invert={deltaInvert} ariaId={`${title}-delta`} explain={deltaInvert ? "Lower is better" : undefined} />
            <div className="mt-2 grid grid-cols-2 gap-3">
              <HoverGroup>
                <div>
                  <div className="text-xs" style={{ color: TOKENS.muted }}>
                    SEO Score
                  </div>
                  <div className="w-36">
                    <ProgressBarSmart id={`${title}-seo`} value01={seoAvg / 100} color={seoTone} tooltipTitle="Average SEO score" valueFmt={(v) => `${Math.round(v * 100)}/100`} />
                  </div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: TOKENS.muted }}>
                    Readability
                  </div>
                  <div className="w-36">
                    <ProgressBarSmart id={`${title}-read`} value01={readAvg / 100} color={readTone} tooltipTitle="Average Readability" valueFmt={(v) => `${Math.round(v * 100)}/100`} />
                  </div>
                </div>
              </HoverGroup>
            </div>
          </div>
        </div>
        <SparkArea series={trend} aria={`${title} velocity`} />
      </div>
    </CardShell>
  );
}

function CtrPopover({ id, actual, expected }: { id: string; actual: number; expected: number }) {
  const g = useHoverGroup();
  const visible = g?.activeId === id;
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => g?.setActiveId(id)}
      onMouseLeave={() => g?.setActiveId(null)}
      onFocus={() => g?.setActiveId(id)}
      onBlur={() => g?.setActiveId(null)}
      tabIndex={0}
    >
      <div className="font-medium">{fmtPct100(actual, 1)}</div>
      {visible && (
        <div className="pointer-events-none absolute left-1/2 top-5 z-50 -translate-x-1/2 rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border }}>
          <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
            CTR vs Expected
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TOKENS.valueBlue }} />
              <span style={{ color: TOKENS.muted }}>Actual</span>
            </div>
            <div className="font-semibold">{fmtPct100(actual, 1)}</div>
          </div>
          <div className="mt-1 flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TOKENS.muted }} />
              <span style={{ color: TOKENS.muted }}>Expected</span>
            </div>
            <div className="font-semibold">{fmtPct100(expected, 1)}</div>
          </div>
          <div className="mt-1 text-[11px]" style={{ color: TOKENS.muted }}>
            Gap: <span className="font-semibold" style={{ color: actual - expected < 0 ? TOKENS.danger : TOKENS.success }}>{(actual - expected).toFixed(1)} pp</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`h-8 rounded-full border px-3 text-sm ${active ? "font-semibold" : ""}`} style={{ borderColor: TOKENS.border, background: active ? TOKENS.pastelBlue : "#fff" }}>
      {children}
    </button>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick?: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} className="rounded p-1 text-[#4286F5] hover:bg-[#EEF5FF]" onClick={onClick}>
      {children}
    </button>
  );
}

/* ========================================================================================
 * MOCK DATA (deterministic)
 * ====================================================================================== */
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function expectedCtrFromPos(pos: number) {
  if (pos <= 1) return 30;
  if (pos <= 2) return 20;
  if (pos <= 3) return 14;
  if (pos <= 5) return 9;
  if (pos <= 10) return 4;
  return 1.5;
}
function makeMockContentPipelineData(): ContentPipelineData {
  const seriesIdeas = makeSeries(18, 12, 0.35, "ideas");
  const seriesDraft = makeSeries(18, 10, 0.3, "draft");
  const seriesReview = makeSeries(18, 8, 0.28, "review");
  const seriesPubVel = Array.from({ length: 18 }).map((_, i) => {
    const t = new Date();
    t.setDate(t.getDate() - (17 - i) * 7);
    const published = Math.max(0, 6 + Math.round((Math.sin(i / 3) + 1) * 3) + (i % 4 === 0 ? 2 : 0));
    const refreshed = Math.max(0, 2 + Math.round((Math.cos(i / 2.5) + 1) * 2));
    const words = published * (800 + (i % 3) * 150) + refreshed * 300;
    return { t: t.toISOString().slice(0, 10), published, refreshed, words };
  });

  const under: UnderperfRow[] = Array.from({ length: 18 }).map((_, i) => {
    const pos = Math.max(1, Math.min(20, 2 + (i % 9) + Math.random() * 4));
    const exp = expectedCtrFromPos(pos);
    const actual = Math.max(0.1, exp - (Math.random() * (i % 3 === 0 ? 10 : 5) + 0.3));
    const impressions = 2000 + Math.round(Math.random() * 40_000);
    const dt = new Date();
    dt.setDate(dt.getDate() - (i % 120));
    return {
      id: `u-${i + 1}`,
      title: `How to optimize ${i % 2 ? "internal links" : "content briefs"} (${i + 1})`,
      url: `https://example.com/blog/optimize-${i + 1}`,
      impressions,
      ctrPct: +actual.toFixed(1),
      expectedCtrPct: +exp.toFixed(1),
      avgPos: +pos.toFixed(1),
      seoScore: Math.round(40 + Math.random() * 60),
      readability: Math.round(45 + Math.random() * 50),
      lastUpdated: dt.toISOString().slice(0, 10),
      cluster: i % 2 ? "Internal linking" : "Content briefs",
      author: i % 3 ? "Alex" : "Jordan",
    };
  });

  return {
    timeframe: "30d",
    scope: "all",
    stages: {
      ideas: {
        total: 48,
        deltaPct: -6.2,
        seoScoreAvg: 58,
        seoDist: { lt50: 12, b50_69: 28, gte70: 8 },
        readabilityAvg: 66,
        velocitySeries: seriesIdeas,
      },
      draft: {
        total: 22,
        deltaPct: -3.4,
        seoScoreAvg: 62,
        seoDist: { lt50: 6, b50_69: 11, gte70: 5 },
        readabilityAvg: 68,
        velocitySeries: seriesDraft,
      },
      review: {
        total: 11,
        deltaPct: -1.8,
        seoScoreAvg: 71,
        seoDist: { lt50: 2, b50_69: 3, gte70: 6 },
        readabilityAvg: 74,
        velocitySeries: seriesReview,
      },
      published: {
        total: 286,
        deltaPct: 5.6,
        seoScoreAvg: 77,
        readabilityAvg: 79,
        velocitySeries: makeSeries(18, 9, 0.22, "pub-trend"),
        publishedSeries: seriesPubVel,
      },
    },
    funnel: {
      draft: { pass: 12, fail: 10 },
      review: { pass: 7, fail: 4 },
      published: { pass: 230, fail: 56 },
    },
    backlogAging: [
      { bucket: "0-2d", count: 5 },
      { bucket: "3-7d", count: 3 },
      { bucket: "8-14d", count: 2 },
      { bucket: "15+d", count: 1 },
    ],
    underperforming: under,
    connected: { gsc: true },
  };
}


