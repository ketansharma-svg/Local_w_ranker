"use client";

/* =============================================================================
   Wranker — Section 1 · Tab 1
   Analytics Summary (KPI Cards) — Snapshot + Trend (Refinements)
   ---------------------------------------------------------------------------
   - Smart popovers now PORTALED above all cards (no clipping / z-index issues)
   - At least half of the KPI cards use STACKED BARS for trend (same breakdown)
   - Export button uses panel color (no filled background inside the card/panel)
   - Inter / Inter Fallback fonts, branded #008CCD icons, modular chips/switch
   - No emoji; pointer cursor on interactive elements
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
  Smartphone,
  Laptop,
  Tablet as TabletIcon,
  Search,
  Globe,
  Users,
  MousePointer2,
  Target,
  TrendingUp,
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

type Metric = {
  value: number;
  delta?: number;
  series?: SeriesPoint[];
  connected?: boolean;
};

export interface AnalyticsKpiData {
  // GA4
  totalSessions: Metric;
  engagementRate: Metric; // % (0-100)
  bounceRate: Metric; // % (0-100)
  avgEngagementTime: Metric; // seconds
  // GSC
  organicClicks: Metric;
  organicImpressions: Metric;
  organicCtr: Metric; // % (0-100)
  avgPosition: Metric; // lower is better
}

/* -----------------------------------------------------------------------------
 * DEMO DATA
 * ---------------------------------------------------------------------------*/
const DAYS = 14;
function mkSeries(base: number, amp: number, noise = 0.18, pct = false): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (DAYS - 1));
  let val = base;
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const jitter = 1 + (Math.sin(i * 0.7) * amp) / Math.max(1, base) + (Math.random() - 0.5) * noise;
    val = Math.max(0, pct ? clamp01(val * jitter) : Math.round(base * jitter));
    out.push({ t: d.toISOString().slice(0, 10), v: pct ? Math.round(val * 1000) / 1000 : val });
  }
  return out;
}

type SplitSpec = { key: string; label: string; baseShare: number };
function splitSeries(total: SeriesPoint[], parts: SplitSpec[], jitter = 0.06) {
  return total.map((p, i) => {
    let rem = 1;
    const shares: Record<string, number> = {};
    parts.forEach((sp, idx) => {
      const j = clamp01(sp.baseShare * (1 + (Math.sin((i + 1) * (idx + 1) * 0.33) * jitter)));
      const val = idx === parts.length - 1 ? rem : Math.min(rem, j);
      rem -= val;
      shares[sp.key] = val;
    });
    const sum = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
    Object.keys(shares).forEach((k) => (shares[k] = shares[k] / sum));
    const out: any = { t: p.t };
    parts.forEach((sp) => (out[sp.key] = Math.round(p.v * shares[sp.key])));
    return out as { t: string } & Record<string, number>;
  });
}

export function createDemoAnalyticsKpiData(): AnalyticsKpiData {
  const sessions = mkSeries(5200, 0.06);
  const clicks = mkSeries(820, 0.1);
  const impr = mkSeries(12800, 0.08);
  const engRate01 = mkSeries(0.62, 0.04, 0.03, true);
  const avgEngSec = mkSeries(128, 0.12);
  const posSeries = mkSeries(12.8, 0.05);

  const last = <T,>(arr: T[]) => arr[arr.length - 1];

  const ctrSeries = clicks.map((c, i) => {
    const v = Math.max(0, Math.min(100, (c.v / Math.max(1, impr[i].v)) * 100));
    return { t: c.t, v: Math.round(v * 10) / 10 };
  });

  return {
    totalSessions: {
      value: last(sessions).v,
      delta: last(sessions).v - sessions[DAYS - 2].v,
      series: sessions,
      connected: true,
    },
    engagementRate: {
      value: Math.round(last(engRate01).v * 1000) / 10,
      delta: Math.round(((last(engRate01).v - engRate01[DAYS - 2].v) * 100) * 10) / 10,
      series: engRate01.map((p) => ({ t: p.t, v: Math.round(p.v * 1000) / 10 })),
      connected: true,
    },
    bounceRate: {
      value: Math.round((1 - last(engRate01).v) * 1000) / 10,
      delta: Math.round(((1 - last(engRate01).v) - (1 - engRate01[DAYS - 2].v)) * 100 * 10) / 10,
      series: engRate01.map((p) => ({ t: p.t, v: Math.round((1 - p.v) * 1000) / 10 })),
      connected: true,
    },
    avgEngagementTime: {
      value: last(avgEngSec).v,
      delta: last(avgEngSec).v - avgEngSec[DAYS - 2].v,
      series: avgEngSec,
      connected: true,
    },
    organicClicks: {
      value: last(clicks).v,
      delta: last(clicks).v - clicks[DAYS - 2].v,
      series: clicks,
      connected: true,
    },
    organicImpressions: {
      value: last(impr).v,
      delta: last(impr).v - impr[DAYS - 2].v,
      series: impr,
      connected: true,
    },
    organicCtr: {
      value: last(ctrSeries).v,
      delta: last(ctrSeries).v - ctrSeries[DAYS - 2].v,
      series: ctrSeries,
      connected: true,
    },
    avgPosition: {
      value: Math.round(last(posSeries).v * 10) / 10,
      delta: Math.round((last(posSeries).v - posSeries[DAYS - 2].v) * 10) / 10,
      series: posSeries.map((p) => ({ ...p, v: Math.round(p.v * 10) / 10 })),
      connected: true,
    },
  };
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
  unit?: "" | "%" | "pp" | "s";
  invert?: boolean;
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TOKENS.muted }}>
        <Minus size={14} /> —
      </span>
    );
  }
  const positiveIsGood = !invert;
  const good = positiveIsGood ? delta > 0 : delta < 0;
  const ColorIcon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TOKENS.muted : good ? TOKENS.success : TOKENS.danger;
  const label =
    unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
      : unit === "s"
      ? `${Math.round(Math.abs(delta))}s`
      : intFmt.format(Math.round(Math.abs(delta)));

  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <ColorIcon size={14} />
      {label}
    </span>
  );
}

/* -----------------------------------------------------------------------------
 * PORTALED TOOLTIP SHELL (overlays across cards)
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
  const highlightName = (parts.length && parts[0].name) || undefined; // recharts sends hovered name in payload[0]; not used here
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
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
 * SNAPSHOT DONUT (with portaled tooltip)
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
 * TREND (stacked area/bars) with portaled tooltip
 * ---------------------------------------------------------------------------*/
type Row = { t: string } & Record<string, number>;
function to100(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t } as Row;
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
}

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
    <div ref={ref} className="h-16 min-w-[120px]" role="img" aria-label="KPI trend">
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
}: {
  title: string;
  source: "GA4" | "GSC";
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "s";
  invert?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left cursor-pointer"
      aria-label={`${title} card`}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Title row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BrandIcon size={16} />
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
            style={{
              border: `1px solid ${TOKENS.border}`,
              background: "#F5F7FA",
              color: source === "GA4" ? TOKENS.valueBlue : TOKENS.brand,
            }}
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
 * SECTION — Analytics Summary (KPI Cards)
 * ---------------------------------------------------------------------------*/
type BreakdownModeGA4 = "device" | "channel";

export function AnalyticsOverviewKpiSection({
  data,
}: {
  data?: Partial<AnalyticsKpiData>;
}) {
  // merge with demo
  const base = React.useMemo(() => createDemoAnalyticsKpiData(), []);
  const d: AnalyticsKpiData = {
    totalSessions: { ...base.totalSessions, ...(data?.totalSessions || {}) },
    engagementRate: { ...base.engagementRate, ...(data?.engagementRate || {}) },
    bounceRate: { ...base.bounceRate, ...(data?.bounceRate || {}) },
    avgEngagementTime: { ...base.avgEngagementTime, ...(data?.avgEngagementTime || {}) },
    organicClicks: { ...base.organicClicks, ...(data?.organicClicks || {}) },
    organicImpressions: { ...base.organicImpressions, ...(data?.organicImpressions || {}) },
    organicCtr: { ...base.organicCtr, ...(data?.organicCtr || {}) },
    avgPosition: { ...base.avgPosition, ...(data?.avgPosition || {}) },
  };

  // Header controls
  const [ga4Breakdown, setGa4Breakdown] = React.useState<BreakdownModeGA4>("device");
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  // Color maps & icon maps
  const DEVICE: SplitSpec[] = [
    { key: "mobile", label: "Mobile", baseShare: 0.58 },
    { key: "desktop", label: "Desktop", baseShare: 0.34 },
    { key: "tablet", label: "Tablet", baseShare: 0.08 },
  ];
  const DEVICE_COLORS: Record<string, string> = {
    mobile: "#5CA8FF",
    desktop: TOKENS.valueBlue,
    tablet: "#9FC8FF",
  };
  const DEVICE_NAMES = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };
  const DEVICE_ICONS: Record<string, React.ReactNode> = {
    mobile: <Smartphone size={14} color={TOKENS.brand} />,
    desktop: <Laptop size={14} color={TOKENS.brand} />,
    tablet: <TabletIcon size={14} color={TOKENS.brand} />,
  };

  const CHANNEL: SplitSpec[] = [
    { key: "organic", label: "Organic", baseShare: 0.56 },
    { key: "direct", label: "Direct", baseShare: 0.24 },
    { key: "referral", label: "Referral", baseShare: 0.12 },
    { key: "paid", label: "Paid", baseShare: 0.08 },
  ];
  const CHANNEL_COLORS: Record<string, string> = {
    organic: TOKENS.valueBlue,
    direct: "#60A5FA",
    referral: "#22D3EE",
    paid: "#7C3AED",
  };
  const CHANNEL_NAMES = { organic: "Organic", direct: "Direct", referral: "Referral", paid: "Paid" };
  const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    organic: <Search size={14} color={TOKENS.brand} />,
    direct: <Users size={14} color={TOKENS.brand} />,
    referral: <MousePointer2 size={14} color={TOKENS.brand} />,
    paid: <Target size={14} color={TOKENS.brand} />,
  };

  const COUNTRY: SplitSpec[] = [
    { key: "us", label: "USA", baseShare: 0.42 },
    { key: "in", label: "India", baseShare: 0.28 },
    { key: "gb", label: "UK", baseShare: 0.15 },
    { key: "other", label: "Other", baseShare: 0.15 },
  ];
  const COUNTRY_COLORS: Record<string, string> = {
    us: TOKENS.valueBlue,
    in: "#00BFA6",
    gb: "#7E72FF",
    other: "#9CA3AF",
  };
  const COUNTRY_NAMES = { us: "United States", in: "India", gb: "United Kingdom", other: "Other" };
  const COUNTRY_ICONS: Record<string, React.ReactNode> = {
    us: <Globe size={14} color={TOKENS.brand} />,
    in: <Globe size={14} color={TOKENS.brand} />,
    gb: <Globe size={14} color={TOKENS.brand} />,
    other: <Globe size={14} color={TOKENS.brand} />,
  };

  // Build GA4 breakdown rows
  const ga4SplitSpec = ga4Breakdown === "device" ? DEVICE : CHANNEL;
  const ga4Colors = ga4Breakdown === "device" ? DEVICE_COLORS : CHANNEL_COLORS;
  const ga4Names = ga4Breakdown === "device" ? DEVICE_NAMES : CHANNEL_NAMES;
  const ga4Icons = ga4Breakdown === "device" ? DEVICE_ICONS : CHANNEL_ICONS;

  const sessRows = React.useMemo(() => splitSeries(d.totalSessions.series ?? [], ga4SplitSpec, 0.05), [d.totalSessions.series, ga4Breakdown]);
  const clicksRows = React.useMemo(() => splitSeries(d.organicClicks.series ?? [], DEVICE, 0.05), [d.organicClicks.series]);
  const imprRows = React.useMemo(() => splitSeries(d.organicImpressions.series ?? [], COUNTRY, 0.06), [d.organicImpressions.series]);

  const engagedVsBounceRows = React.useMemo(() => {
    const rows: Row[] = [];
    const sess = d.totalSessions.series ?? [];
    const er = d.engagementRate.series ?? [];
    for (let i = 0; i < Math.min(sess.length, er.length); i++) {
      const s = sess[i].v;
      const e01 = clamp01((er[i].v || 0) / 100);
      const engaged = Math.round(s * e01);
      const bounced = Math.max(0, s - engaged);
      rows.push({ t: sess[i].t, engaged, bounced } as unknown as Row);
    }
    return rows;
  }, [d.totalSessions.series, d.engagementRate.series]);

  const ENG_COLORS = { engaged: TOKENS.success, bounced: TOKENS.danger };
  const ENG_NAMES = { engaged: "Engaged Sessions", bounced: "Bounced Sessions" };
  const ENG_ICONS = {
    engaged: <TrendingUp size={14} color={TOKENS.brand} />,
    bounced: <TrendingUp size={14} color={TOKENS.brand} />,
  };

  const timeBucketRows = React.useMemo(() => {
    const rows: Row[] = [];
    const sess = d.totalSessions.series ?? [];
    const t = d.avgEngagementTime.series ?? [];
    for (let i = 0; i < Math.min(sess.length, t.length); i++) {
      const total = Math.max(1, sess[i].v);
      const sec = t[i].v || 0;
      const lt30 = clamp01(0.25 + (60 - Math.min(60, sec)) / 300);
      const s30_120 = clamp01(0.5 - Math.abs(90 - Math.min(180, sec)) / 400);
      let gt120 = clamp01(1 - (lt30 + s30_120));
      const norm = lt30 + s30_120 + gt120 || 1;
      const A = (lt30 / norm) * total;
      const B = (s30_120 / norm) * total;
      const C = total - Math.round(A) - Math.round(B);
      rows.push({ t: sess[i].t, lt30s: Math.round(A), s30_120: Math.round(B), gt120s: Math.max(0, C) }as unknown as Row);
    }
    return rows;
  }, [d.totalSessions.series, d.avgEngagementTime.series]);

  const TIME_COLORS = { lt30s: "#9CA3AF", s30_120: TOKENS.valueBlue, gt120s: "#5CA8FF" };
  const TIME_NAMES = { lt30s: "<30s", s30_120: "30–120s", gt120s: "≥120s" };
  const TIME_ICONS = {
    lt30s: <Info size={14} color={TOKENS.brand} />,
    s30_120: <Info size={14} color={TOKENS.brand} />,
    gt120s: <Info size={14} color={TOKENS.brand} />,
  };

  const positionRows = React.useMemo(() => {
    const base = d.organicImpressions.series ?? [];
    const rows: Row[] = [];
    for (let i = 0; i < base.length; i++) {
      const total = base[i].v || 0;
      const best = clamp01(0.18 + Math.sin(i * 0.22) * 0.03);
      const mid = clamp01(0.36 + Math.cos(i * 0.18) * 0.05);
      let tail = clamp01(1 - (best + mid));
      const sum = best + mid + tail || 1;
      const a = (best / sum) * total;
      const b = (mid / sum) * total;
      const c = Math.max(0, total - Math.round(a) - Math.round(b));
      rows.push({ t: base[i].t, pos_1_3: Math.round(a), pos_4_10: Math.round(b), pos_11p: c } as unknown as Row);
    }
    return rows;
  }, [d.organicImpressions.series]);

  const POS_COLORS = { pos_1_3: TOKENS.success, pos_4_10: "#60A5FA", pos_11p: "#9CA3AF" };
  const POS_NAMES = { pos_1_3: "Pos 1–3", pos_4_10: "Pos 4–10", pos_11p: "Pos 11+" };

  function lastParts(rows: Row[], keys: string[], names: Record<string, string>, colors: Record<string, string>) {
    if (!rows.length) return [];
    const r = rows[rows.length - 1];
    return keys
      .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
      .sort((a, b) => b.value - a.value);
  }

  const handleExport = () => {
    alert("Export Analytics Summary");
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
              Analytics Summary
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
            {/* Modular chips — GA4 breakdown selector */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              <span className="text-xs" style={{ color: TOKENS.muted }}>
                GA4 Breakdown:
              </span>
              {(["device", "channel"] as BreakdownModeGA4[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setGa4Breakdown(v)}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", ga4Breakdown === v ? "font-semibold bg-[#F5F7FA]" : "")}
                  style={{ borderColor: TOKENS.border, cursor: "pointer", color: ga4Breakdown === v ? TOKENS.text : TOKENS.muted }}
                >
                  {v === "device" ? "By Device" : "By Channel"}
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

            {/* Export (no filled background; matches panel) */}
            <button
              className="ml-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 border hover:bg-gray-50"
              aria-label="Export Analytics Summary"
              onClick={handleExport}
              style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            >
              <Download size={16} />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1) GA4 — Total Sessions (Trend: AREA) */}
          <KpiCard
            title="Total Sessions"
            source="GA4"
            info={`Snapshot: ${ga4Breakdown === "device" ? "Device mix" : "Channel mix"}. Trend shows ${shareMode ? "share %" : "absolute"} by ${ga4Breakdown}.`}
            donut={
              <StackedDonut
                parts={lastParts(sessRows, ga4SplitSpec.map((s) => s.key), ga4Names, ga4Colors).map((p) => ({
                  ...p,
                  name: p.key,
                }))}
                nameMap={ga4Names}
                iconMap={ga4Icons}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.totalSessions.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.totalSessions.delta}
            trend={<TrendStack rows={sessRows} keys={ga4SplitSpec.map((s) => s.key)} colors={ga4Colors} names={ga4Names} mode="area" share={shareMode} />}
          />

          {/* 2) GA4 — Engagement Rate (Trend: BARS) */}
          <KpiCard
            title="Engagement Rate"
            source="GA4"
            info="Engaged Sessions / Sessions. Snapshot shows engaged vs bounced; lower bounce is better."
            donut={
              <StackedDonut
                parts={lastParts(engagedVsBounceRows, ["engaged", "bounced"], ENG_NAMES, ENG_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={ENG_NAMES}
                iconMap={ENG_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.engagementRate.value}
            valueFmt={(v) => pctFmt(v, 1)}
            delta={d.engagementRate.delta}
            deltaUnit="%"
            trend={<TrendStack rows={engagedVsBounceRows} keys={["engaged", "bounced"]} colors={ENG_COLORS} names={ENG_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 3) GA4 — Bounce Rate (Trend: BARS) */}
          <KpiCard
            title="Bounce Rate"
            source="GA4"
            info="Sessions without engagement. Lower is better."
            donut={
              <StackedDonut
                parts={[
                  { key: "bounced", name: "bounced", value: lastParts(engagedVsBounceRows, ["bounced"], ENG_NAMES, ENG_COLORS)[0]?.value ?? 0, color: ENG_COLORS.bounced },
                  { key: "engaged", name: "engaged", value: lastParts(engagedVsBounceRows, ["engaged"], ENG_NAMES, ENG_COLORS)[0]?.value ?? 0, color: ENG_COLORS.engaged },
                ]}
                nameMap={ENG_NAMES}
                iconMap={ENG_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.bounceRate.value}
            valueFmt={(v) => pctFmt(v, 1)}
            delta={d.bounceRate.delta}
            deltaUnit="pp"
            invert
            trend={<TrendStack rows={engagedVsBounceRows} keys={["bounced", "engaged"]} colors={{ bounced: ENG_COLORS.bounced, engaged: ENG_COLORS.engaged }} names={ENG_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 4) GA4 — Avg. Engagement Time (Trend: AREA) */}
          <KpiCard
            title="Avg. Engagement Time"
            source="GA4"
            info="Average engaged time per session. Snapshot shows time buckets; trend shows mix over time."
            donut={
              <StackedDonut
                parts={lastParts(timeBucketRows, ["lt30s", "s30_120", "gt120s"], TIME_NAMES, TIME_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={TIME_NAMES}
                iconMap={TIME_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.avgEngagementTime.value}
            valueFmt={(v) => {
              const m = Math.floor(v / 60);
              const s = Math.max(0, Math.floor(v % 60));
              return `${String(m)}m ${String(s).padStart(2, "0")}s`;
            }}
            delta={d.avgEngagementTime.delta}
            deltaUnit="s"
            trend={<TrendStack rows={timeBucketRows} keys={["lt30s", "s30_120", "gt120s"]} colors={TIME_COLORS} names={TIME_NAMES} mode="area" share={shareMode} />}
          />

          {/* 5) GSC — Organic Clicks (Trend: BARS) */}
          <KpiCard
            title="Organic Clicks"
            source="GSC"
            info="Total Google Search clicks. Snapshot shows device mix; trend shows device mix over time."
            donut={
              <StackedDonut
                parts={lastParts(clicksRows, ["mobile", "desktop", "tablet"], DEVICE_NAMES, DEVICE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={DEVICE_NAMES}
                iconMap={DEVICE_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.organicClicks.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.organicClicks.delta}
            trend={<TrendStack rows={clicksRows} keys={["mobile", "desktop", "tablet"]} colors={DEVICE_COLORS} names={DEVICE_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 6) GSC — Organic Impressions (Trend: AREA) */}
          <KpiCard
            title="Organic Impressions"
            source="GSC"
            info="Times your pages appeared in Search. Snapshot shows top countries; trend shows country mix."
            donut={
              <StackedDonut
                parts={lastParts(imprRows, ["us", "in", "gb", "other"], COUNTRY_NAMES, COUNTRY_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={COUNTRY_NAMES}
                iconMap={COUNTRY_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.organicImpressions.value}
            valueFmt={(v) => compactInt(v)}
            delta={d.organicImpressions.delta}
            trend={<TrendStack rows={imprRows} keys={["us", "in", "gb", "other"]} colors={COUNTRY_COLORS} names={COUNTRY_NAMES} mode="area" share={shareMode} />}
          />

          {/* 7) GSC — Organic CTR (Trend: BARS) */}
          <KpiCard
            title="Organic CTR"
            source="GSC"
            info="Clicks ÷ Impressions. Snapshot mirrors device share of clicks; trend shows mix."
            donut={
              <StackedDonut
                parts={lastParts(clicksRows, ["mobile", "desktop", "tablet"], DEVICE_NAMES, DEVICE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={DEVICE_NAMES}
                iconMap={DEVICE_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.organicCtr.value}
            valueFmt={(v) => pctFmt(v, 1)}
            delta={d.organicCtr.delta}
            deltaUnit="%"
            trend={<TrendStack rows={clicksRows} keys={["mobile", "desktop", "tablet"]} colors={DEVICE_COLORS} names={DEVICE_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 8) GSC — Avg. Position (Trend: BARS) */}
          <KpiCard
            title="Avg. Position"
            source="GSC"
            info="Average ranking (lower is better). Snapshot: share of impressions by rank buckets; trend shows mix."
            donut={
              <StackedDonut
                parts={lastParts(positionRows, ["pos_1_3", "pos_4_10", "pos_11p"], POS_NAMES, POS_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={POS_NAMES}
                iconMap={{
                  pos_1_3: <Target size={14} color={TOKENS.brand} />,
                  pos_4_10: <Target size={14} color={TOKENS.brand} />,
                  pos_11p: <Target size={14} color={TOKENS.brand} />,
                }}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.avgPosition.value}
            valueFmt={(v) => v.toFixed(1)}
            delta={d.avgPosition.delta}
            invert
            trend={<TrendStack rows={positionRows} keys={["pos_1_3", "pos_4_10", "pos_11p"]} colors={POS_COLORS} names={POS_NAMES} mode="bars" share={shareMode} />}
          />
        </div>
      </div>
    </section>
  );
}