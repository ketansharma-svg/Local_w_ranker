"use client";

/* =============================================================================
   Wranker — Page Insights Panel
   Section 1: Page Insights Summary (KPI Cards) — Snapshot (Stacked Donut) + Trend
   -----------------------------------------------------------------------------
   - Inter / Inter Fallback fonts; no emoji
   - Branded #008CCD icons for section & card titles
   - Pointer cursor on interactive elements
   - Modular chips (Structure: Content Type / Section) + toggle (Show % share)
   - Smart popovers (PORTALED) with colored dot annotations
   - Each card uses a stacked donut snapshot + stacked trend (Bars or Area)
   - Export button in the section header (panel-styled)
   - Recharts-only; ready-to-drop-in TSX
   ============================================================================ */

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  Sector,
  ReferenceLine,
} from "recharts";
import { createPortal } from "react-dom";
import {
  Info,
  Download,
  BarChart3,
  FileText,
  Search,
  Link as LinkIcon,
  Gauge,
  Eye,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * TOKENS
 * ---------------------------------------------------------------------------*/
const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  app: "#F5F7FA",
  radius: 10,
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
} as const;

/* -----------------------------------------------------------------------------
 * UTILS / FORMATTERS
 * ---------------------------------------------------------------------------*/
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const compactInt = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Math.round(n));
const toDateLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* -----------------------------------------------------------------------------
 * TYPES
 * ---------------------------------------------------------------------------*/
type SeriesPoint = { t: string; v: number };
type Metric = { value: number; delta?: number; series?: SeriesPoint[]; connected?: boolean };

export interface PageInsightsKpiData {
  pagesIndexed: Metric;              // #
  pagesWithTrackedKeywords: Metric;  // #
  pagesWithBacklinks: Metric;        // #
  avgSeoScore: Metric;               // 0..100
  visibilityScore: Metric;           // 0..100
  avgHealthScore: Metric;            // 0..100
}

/* -----------------------------------------------------------------------------
 * DEMO DATA
 * ---------------------------------------------------------------------------*/
const DAYS = 14;

function mkSeries(base: number, amp = 0.08, noise = 0.18): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (DAYS - 1));
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const jitter = 1 + Math.sin(i * 0.55) * amp + (Math.random() - 0.5) * noise;
    out.push({ t: d.toISOString().slice(0, 10), v: Math.max(0, Math.round(base * jitter)) });
  }
  return out;
}

function mkScoreSeries(center = 78, span = 10): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (DAYS - 1));
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const wave = Math.sin(i * 0.4) * (span * 0.6) + Math.cos(i * 0.15) * (span * 0.25);
    const v = Math.max(40, Math.min(100, center + wave + (Math.random() - 0.5) * 2.4));
    out.push({ t: d.toISOString().slice(0, 10), v: Math.round(v * 10) / 10 });
  }
  return out;
}

export function createDemoPageInsightsKpiData(): PageInsightsKpiData {
  const indexed = mkSeries(1200, 0.06, 0.14);
  const tracked = mkSeries(720, 0.08, 0.16);
  const backlinks = mkSeries(480, 0.10, 0.18);

  const seoScore = mkScoreSeries(81, 9);
  const healthScore = mkScoreSeries(76, 11);
  const visibility = mkScoreSeries(64, 14);

  const last = <T,>(arr: T[]) => arr[arr.length - 1];

  return {
    pagesIndexed: {
      value: last(indexed).v,
      delta: last(indexed).v - indexed[DAYS - 2].v,
      series: indexed,
      connected: true,
    },
    pagesWithTrackedKeywords: {
      value: last(tracked).v,
      delta: last(tracked).v - tracked[DAYS - 2].v,
      series: tracked,
      connected: true,
    },
    pagesWithBacklinks: {
      value: last(backlinks).v,
      delta: last(backlinks).v - backlinks[DAYS - 2].v,
      series: backlinks,
      connected: true,
    },
    avgSeoScore: {
      value: last(seoScore).v,
      delta: Math.round((last(seoScore).v - seoScore[DAYS - 2].v) * 10) / 10,
      series: seoScore,
      connected: true,
    },
    visibilityScore: {
      value: last(visibility).v,
      delta: Math.round((last(visibility).v - visibility[DAYS - 2].v) * 10) / 10,
      series: visibility,
      connected: true,
    },
    avgHealthScore: {
      value: last(healthScore).v,
      delta: Math.round((last(healthScore).v - healthScore[DAYS - 2].v) * 10) / 10,
      series: healthScore,
      connected: true,
    },
  };
}

/* -----------------------------------------------------------------------------
 * SPLIT HELPERS
 * ---------------------------------------------------------------------------*/
type SplitSpec = { key: string; label: string; baseShare: number };

type Row = { t: string } & Record<string, any>;

function splitSeries(total: SeriesPoint[], parts: SplitSpec[], jitter = 0.06) {
  return total.map((p, i) => {
    let rem = 1;
    const shares: Record<string, number> = {};
    parts.forEach((sp, idx) => {
      const j = clamp01(sp.baseShare * (1 + Math.sin((i + 1) * (idx + 2) * 0.27) * jitter));
      const val = idx === parts.length - 1 ? rem : Math.min(rem, j);
      rem -= val;
      shares[sp.key] = val;
    });
    const sum = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
    Object.keys(shares).forEach((k) => (shares[k] = shares[k] / sum));
    const out: any = { t: p.t };
    parts.forEach((sp) => (out[sp.key] = Math.round(p.v * shares[sp.key])));
    return out as Row;
  });
}

function to100(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
}

function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* Score bucket shares that loosely follow the day's average (0..100) */
function scoreShares(avg: number) {
  const x = Math.max(0, Math.min(1, avg / 100)); // 0..1
  const high = clamp01((x - 0.78) / 0.18); // grows after ~78
  const good = clamp01(0.6 - Math.abs(x - 0.82) * 2.2); // peak near 0.82
  const needs = clamp01(0.5 - Math.abs(x - 0.65) * 1.8);
  const poor = clamp01(0.35 - x * 0.6);
  let sum = high + good + needs + poor;
  if (sum <= 0) sum = 1;
  return { high: high / sum, good: good / sum, needs: needs / sum, poor: poor / sum };
}

function scoreBucketRows(avgSeries: SeriesPoint[] = [], baseline: SeriesPoint[] = []): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < Math.min(avgSeries.length, baseline.length); i++) {
    const avg = avgSeries[i].v || 0;
    const total = Math.max(1, baseline[i].v);
    const w = scoreShares(avg);
    const a = Math.round(total * w.high);
    const b = Math.round(total * w.good);
    const c = Math.round(total * w.needs);
    const d = Math.max(0, total - a - b - c);
    rows.push({ t: baseline[i].t, s_90_100: a, s_75_89: b, s_50_74: c, s_lt_50: d }as unknown as Row);
  }
  return rows;
}

/* -----------------------------------------------------------------------------
 * BRAND ICON
 * ---------------------------------------------------------------------------*/
function BrandIcon({ size = 18 }: { size?: number }) {
  return <BarChart3 size={size} color={TOKENS.brand} />;
}

/* -----------------------------------------------------------------------------
 * DELTA BADGE
 * ---------------------------------------------------------------------------*/
function DeltaBadge({
  delta,
  unit = "",
  invert = false,
}: {
  delta?: number;
  unit?: "" | "%" | "pp" | "s" | "pt";
  invert?: boolean;
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TOKENS.muted }}>
        <Minus size={14} /> —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const ColorIcon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TOKENS.muted : good ? TOKENS.success : TOKENS.danger;
  const label =
    unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
      : unit === "s"
      ? `${Math.round(Math.abs(delta))}s`
      : unit === "pt"
      ? `${Math.abs(delta).toFixed(1)}`
      : intFmt.format(Math.round(Math.abs(delta)));

  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <ColorIcon size={14} />
      {label}
    </span>
  );
}

/* -----------------------------------------------------------------------------
 * PORTALED TOOLTIP SHELL (over everything; no clipping)
 * ---------------------------------------------------------------------------*/
function PortalTooltipShell({
  x,
  y,
  width = 260,
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
    <div
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 2147483647,
        pointerEvents: "none",
        isolation: "isolate",
      }}
    >
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{
          backgroundColor: "#ffffff",
          border: `1px solid ${TOKENS.border}`,
          color: TOKENS.text,
          borderRadius: 6,
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* Trend tooltip content (portaled) */
function TrendPortalContent({
  active,
  label,
  payload,
  coordinate,
  containerRect,
  nameMap,
  iconMap,
  valueFmt,
  asShare = false,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  valueFmt?: (v: number) => string;
  asShare?: boolean;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const fmt = valueFmt ?? ((v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v))));
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>
      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TOKENS.muted }}>
            Total
          </span>
          <span className="font-semibold">{intFmt.format(Math.round(total))}</span>
        </div>
      )}
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              {iconMap?.[p.name]}
              <span style={{ color: TOKENS.muted }}>{nameMap?.[p.name] ?? p.name}</span>
            </div>
            <div className="font-semibold">{fmt(Number(p.value))}</div>
          </div>
        ))}
      </div>
    </PortalTooltipShell>
  );
}

/* Donut tooltip content (portaled) */
function DonutPortalContent({
  active,
  coordinate,
  containerRect,
  parts,
  nameMap,
  iconMap,
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  const highlightName = (parts.length && parts[0].name) || undefined;
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = p.name === highlightName;
          return (
            <div key={i} className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                {iconMap?.[p.name]}
                <span className={cn(isActive ? "font-semibold" : "")} style={{ color: TOKENS.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={cn("font-semibold", isActive && "text-[color:var(--focus,#0077FF)]")}>{fmt(Number(p.value))}</div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* -----------------------------------------------------------------------------
 * SNAPSHOT DONUT
 * ---------------------------------------------------------------------------*/
function StackedDonut({
  parts,
  size = 92,
  nameMap,
  iconMap,
  valueFmt,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  valueFmt?: (n: number) => string;
}) {
  const data = parts.filter((p) => (p.value ?? 0) > 0).map((p) => ({ ...p, v: p.value }));
  const [active, setActive] = React.useState<number | undefined>(undefined);
  const ref = React.useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={(tp: any) => (
              <DonutPortalContent
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                parts={data}
                nameMap={nameMap}
                iconMap={iconMap}
                valueFmt={valueFmt}
              />
            )}
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={false}
          />
          <Pie
            data={data}
            dataKey="v"
            nameKey="name"
            innerRadius={Math.round(size / 2) - 22}
            outerRadius={Math.round(size / 2) - 10}
            startAngle={90}
            endAngle={-270}
            paddingAngle={1}
            activeIndex={active}
            activeShape={({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }: any) => (
              <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 4}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))" }}
              />
            )}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * TREND STACK (area or bars)
 * ---------------------------------------------------------------------------*/
function TrendStack({
  rows,
  keys,
  colors,
  names,
  mode,
  share,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  mode: "area" | "bars";
  share: boolean;
}) {
  const data = share ? to100(rows, keys) : rows;
  const asShare = share;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v)));

  return (
    <div ref={ref} className="h-16 min-w-[160px]" role="img" aria-label="KPI trend">
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={asShare ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  iconMap={{}}
                  valueFmt={valueFmt}
                  asShare={asShare}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TOKENS.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[k]} fill={colors[k]} fillOpacity={0.25} strokeWidth={2} dot={false} />
            ))}
            <ReferenceLine y={0} stroke={TOKENS.muted} strokeOpacity={0.12} />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={asShare ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  iconMap={{}}
                  valueFmt={valueFmt}
                  asShare={asShare}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={colors[k]} radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * CARD SHELL
 * ---------------------------------------------------------------------------*/
function KpiCard({
  title,
  source,
  info,
  donut,
  value,
  valueFmt,
  delta,
  deltaUnit,
  invert,
  trend,
  onClick,
  glyph,
}: {
  title: string;
  source: "GSC" | "RT" | "Ext" | "Crawler";
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "s" | "pt";
  invert?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
  glyph?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="group relative w-full text-left cursor-pointer" aria-label={`${title} card`}>
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Title row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {glyph ?? <BrandIcon size={16} />}
            <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </div>
            {info ? (
              <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info}>
                <Info size={14} />
              </span>
            ) : null}
          </div>
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ border: `1px solid ${TOKENS.border}`, background: "#F5F7FA", color: TOKENS.valueBlue }}
          >
            {source}
          </span>
        </div>

        {/* Content row: donut | value/delta | trend */}
        <div className="flex items-center justify-between gap-3">
          {/* Snapshot */}
          {donut}

          {/* Value + delta */}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TOKENS.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge delta={delta} unit={deltaUnit} invert={invert} />
            </div>
          </div>

          {/* Trend */}
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* -----------------------------------------------------------------------------
 * SECTION — Page Insights Summary (KPI Cards)
 * ---------------------------------------------------------------------------*/
type StructureMode = "content" | "section";

export function PageInsightsSummarySection({ data }: { data?: Partial<PageInsightsKpiData> }) {
  // merge with demo
  const base = React.useMemo(() => createDemoPageInsightsKpiData(), []);
  const d: PageInsightsKpiData = {
    pagesIndexed: { ...base.pagesIndexed, ...(data?.pagesIndexed || {}) },
    pagesWithTrackedKeywords: { ...base.pagesWithTrackedKeywords, ...(data?.pagesWithTrackedKeywords || {}) },
    pagesWithBacklinks: { ...base.pagesWithBacklinks, ...(data?.pagesWithBacklinks || {}) },
    avgSeoScore: { ...base.avgSeoScore, ...(data?.avgSeoScore || {}) },
    visibilityScore: { ...base.visibilityScore, ...(data?.visibilityScore || {}) },
    avgHealthScore: { ...base.avgHealthScore, ...(data?.avgHealthScore || {}) },
  };

  // Header controls
  const [structure, setStructure] = React.useState<StructureMode>("content");
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  /* ---- Breakdowns & icon/color maps ---- */
  // Structure — by content type (recommended) or by section (path)
  const CONTENT: SplitSpec[] = [
    { key: "blog", label: "Blog", baseShare: 0.34 },
    { key: "product", label: "Product", baseShare: 0.28 },
    { key: "docs", label: "Docs", baseShare: 0.22 },
    { key: "landing", label: "Landing", baseShare: 0.16 },
  ];
  const CONTENT_COLORS: Record<string, string> = { blog: "#5CA8FF", product: TOKENS.valueBlue, docs: "#7E72FF", landing: "#22D3EE" };
  const CONTENT_NAMES = { blog: "Blog", product: "Product", docs: "Docs", landing: "Landing" };

  const SECTIONS: SplitSpec[] = [
    { key: "root", label: "Root", baseShare: 0.18 },
    { key: "blog", label: "/blog", baseShare: 0.36 },
    { key: "docs", label: "/docs", baseShare: 0.24 },
    { key: "other", label: "Other", baseShare: 0.22 },
  ];
  const SECTION_COLORS: Record<string, string> = { root: TOKENS.valueBlue, blog: "#5CA8FF", docs: "#7E72FF", other: TOKENS.gray };
  const SECTION_NAMES = { root: "Root", blog: "/blog", docs: "/docs", other: "Other" };

  // Position buckets (for tracked keywords & visibility)
  const POS: SplitSpec[] = [
    { key: "p1_3", label: "Pos 1–3", baseShare: 0.16 },
    { key: "p4_10", label: "Pos 4–10", baseShare: 0.34 },
    { key: "p11_20", label: "Pos 11–20", baseShare: 0.28 },
    { key: "p21p", label: "Pos 21+", baseShare: 0.22 },
  ];
  const POS_COLORS: Record<string, string> = { p1_3: TOKENS.success, p4_10: "#60A5FA", p11_20: "#9FC8FF", p21p: TOKENS.gray };
  const POS_NAMES = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21p: "Pos 21+" };

  // Authority tiers for backlinks
  const AUTH: SplitSpec[] = [
    { key: "high", label: "High Authority", baseShare: 0.22 },
    { key: "mid", label: "Mid Authority", baseShare: 0.38 },
    { key: "low", label: "Low Authority", baseShare: 0.28 },
    { key: "new", label: "New/Unrated", baseShare: 0.12 },
  ];
  const AUTH_COLORS: Record<string, string> = { high: "#34D399", mid: "#60A5FA", low: "#F59E0B", new: "#A3A3A3" };
  const AUTH_NAMES = { high: "High Authority", mid: "Mid Authority", low: "Low Authority", new: "New/Unrated" };

  // Score buckets (SEO & Health)
  const SCORE_COLORS: Record<string, string> = { s_90_100: TOKENS.success, s_75_89: "#60A5FA", s_50_74: TOKENS.warn, s_lt_50: TOKENS.danger };
  const SCORE_NAMES = { s_90_100: "90–100", s_75_89: "75–89", s_50_74: "50–74", s_lt_50: "<50" };

  /* ---- Build rows for each card ---- */
  const indexedSeries = d.pagesIndexed.series ?? [];
  const trackedSeries = d.pagesWithTrackedKeywords.series ?? [];
  const backlinkSeries = d.pagesWithBacklinks.series ?? [];

  // "Indexed Pages" — structure-dependent breakdown
  const structureSpec = structure === "content" ? CONTENT : SECTIONS;
  const structureColors = structure === "content" ? (CONTENT_COLORS as Record<string, string>) : SECTION_COLORS;
  const structureNames = structure === "content" ? (CONTENT_NAMES as Record<string, string>) : SECTION_NAMES;
  const indexedRows = React.useMemo(() => splitSeries(indexedSeries, structureSpec, 0.06), [indexedSeries, structure]);

  // "Pages with Tracked Keywords" — by position bucket
  const trackedPosRows = React.useMemo(() => splitSeries(trackedSeries, POS, 0.07), [trackedSeries]);

  // "Pages with Backlinks" — by authority tier
  const backlinkRows = React.useMemo(() => splitSeries(backlinkSeries, AUTH, 0.06), [backlinkSeries]);

  // "Avg. SEO Score" — score buckets over tracked pages baseline
  const seoBucketRows = React.useMemo(() => scoreBucketRows(d.avgSeoScore.series, trackedSeries), [d.avgSeoScore.series, trackedSeries]);

  // "Visibility Score" — also visualize position buckets (Top‑20 focus)
  const visibilityRows = React.useMemo(() => splitSeries(trackedSeries, POS, 0.05), [trackedSeries]);

  // "Avg. Page Health Score" — score buckets over indexed pages baseline
  const healthBucketRows = React.useMemo(() => scoreBucketRows(d.avgHealthScore.series, indexedSeries), [d.avgHealthScore.series, indexedSeries]);

  const handleExport = () => {
    // Wire to your export; placeholder UX
    alert("Export — Page Insights Summary");
  };

  return (
    <section
      className="w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="rounded-md bg-white p-4" style={{ border: `1px solid ${TOKENS.border}` }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2">
            <BrandIcon size={20} />
            <h2 className="text-[20px] font-semibold" style={{ color: TOKENS.text }}>
              Page Insights Summary
            </h2>
            <button
              className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
              title="Each card shows a current breakdown (donut) and a trend of that breakdown."
              aria-label="About this section"
              style={{ cursor: "pointer" }}
            >
              <Info size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Structure chip (controls Indexed Pages donut/trend) */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              <span className="text-xs" style={{ color: TOKENS.muted }}>
                Structure:
              </span>
              {(["content", "section"] as StructureMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setStructure(v)}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", structure === v ? "font-semibold bg-[#F5F7FA]" : "")}
                  style={{ borderColor: TOKENS.border, cursor: "pointer", color: structure === v ? TOKENS.text : TOKENS.muted }}
                >
                  {v === "content" ? "Content Type" : "Section"}
                </button>
              ))}
            </div>

            {/* Share switch */}
            <label className="inline-flex items-center gap-2 text-xs" style={{ color: TOKENS.muted, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={shareMode}
                onChange={(e) => setShareMode(e.target.checked)}
                className="h-4 w-4 rounded border"
                style={{ accentColor: TOKENS.valueBlue, borderColor: TOKENS.border, cursor: "pointer" }}
              />
              Show % share
            </label>

            {/* Export (panel colored) */}
            <button
              className="ml-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 border hover:bg-gray-50"
              aria-label="Export Page Insights Summary"
              onClick={handleExport}
              style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            >
              <Download size={16} />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1) Indexed Pages — AREA (Structure: content/section) */}
          <KpiCard
            title="Indexed Pages"
            source="GSC"
            info={`Snapshot: ${structure === "content" ? "Content Type" : "Section"} mix. Trend shows ${shareMode ? "share %" : "absolute"} by structure.`}
            glyph={<FileText size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(indexedRows, structureSpec.map((s) => s.key), structureColors).map((p) => ({ ...p, name: p.key }))}
                nameMap={structureNames}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.pagesIndexed.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.pagesIndexed.delta}
            trend={<TrendStack rows={indexedRows} keys={structureSpec.map((s) => s.key)} colors={structureColors} names={structureNames} mode="area" share={shareMode} />}
          />

          {/* 2) Pages with Tracked Keywords — BARS (Position buckets) */}
          <KpiCard
            title="Pages with Tracked Keywords"
            source="RT"
            info="Tracked pages grouped by best position bucket; trend shows rank distribution over time."
            glyph={<Search size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(trackedPosRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={POS_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.pagesWithTrackedKeywords.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.pagesWithTrackedKeywords.delta}
            trend={<TrendStack rows={trackedPosRows} keys={["p1_3", "p4_10", "p11_20", "p21p"]} colors={POS_COLORS} names={POS_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 3) Pages with Backlinks — BARS (Authority tiers) */}
          <KpiCard
            title="Pages with Backlinks"
            source="Ext"
            info="Pages grouped by referring domain authority; trend shows quality mix."
            glyph={<LinkIcon size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(backlinkRows, ["high", "mid", "low", "new"], AUTH_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={AUTH_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.pagesWithBacklinks.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.pagesWithBacklinks.delta}
            trend={<TrendStack rows={backlinkRows} keys={["high", "mid", "low", "new"]} colors={AUTH_COLORS} names={AUTH_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 4) Avg. SEO Score — AREA (Score buckets) */}
          <KpiCard
            title="Avg. SEO Score"
            source="Crawler"
            info="Per-page SEO score distribution (buckets) across tracked pages."
            glyph={<Gauge size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(seoBucketRows, ["s_90_100", "s_75_89", "s_50_74", "s_lt_50"], SCORE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={SCORE_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.avgSeoScore.value}
            valueFmt={(v) => `${v.toFixed(1)}/100`}
            delta={d.avgSeoScore.delta}
            deltaUnit="pt"
            trend={<TrendStack rows={seoBucketRows} keys={["s_90_100", "s_75_89", "s_50_74", "s_lt_50"]} colors={SCORE_COLORS} names={SCORE_NAMES} mode="area" share={shareMode} />}
          />

          {/* 5) Visibility Score (Top‑20) — BARS (Position buckets) */}
          <KpiCard
            title="Visibility Score (Top‑20)"
            source="RT"
            info="Aggregate visibility score; snapshot/trend show rank distribution."
            glyph={<Eye size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(visibilityRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={POS_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.visibilityScore.value}
            valueFmt={(v) => pctFmt(v, 0)}
            delta={d.visibilityScore.delta}
            deltaUnit="pt"
            trend={<TrendStack rows={visibilityRows} keys={["p1_3", "p4_10", "p11_20", "p21p"]} colors={POS_COLORS} names={POS_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 6) Avg. Page Health Score — AREA (Score buckets) */}
          <KpiCard
            title="Avg. Page Health Score"
            source="Crawler"
            info="Overall page health distribution (buckets) across indexed pages."
            glyph={<Activity size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(healthBucketRows, ["s_90_100", "s_75_89", "s_50_74", "s_lt_50"], SCORE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={SCORE_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.avgHealthScore.value}
            valueFmt={(v) => `${v.toFixed(1)}/100`}
            delta={d.avgHealthScore.delta}
            deltaUnit="pt"
            trend={<TrendStack rows={healthBucketRows} keys={["s_90_100", "s_75_89", "s_50_74", "s_lt_50"]} colors={SCORE_COLORS} names={SCORE_NAMES} mode="area" share={shareMode} />}
          />
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * Demo wrapper (optional preview)
 * ---------------------------------------------------------------------------*/
export default function DemoPageInsightsSummary() {
  return (
    <div className="w-full p-4" style={{ background: TOKENS.app }}>
      <PageInsightsSummarySection />
    </div>
  );
}
