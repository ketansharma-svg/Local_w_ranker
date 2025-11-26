"use client";

/* =============================================================================
 *  Page Detail View — KPI Cards (Snapshot + Trend)
 *  ---------------------------------------------------------------------------
 *  - Snapshot: stacked donut with smart popover (portaled above everything)
 *  - Trend: stacked bars or stacked area (same breakdown as snapshot)
 *  - Inter / Inter Fallback fonts, branded #008CCD icons
 *  - Pointer cursor for interactive controls, modular chips / toggle
 *  - Main metric blue: #0077FF (and pastels). Status colors for status charts.
 *  - Added KPI: Bounce Rate (snapshot: Engaged vs Bounced)
 * ============================================================================ */

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
  Users as UsersIcon,
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
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toDateLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
};

/* -----------------------------------------------------------------------------
 * TYPES (aligns with original PageKpiData, with series {date, value})
 * ---------------------------------------------------------------------------*/
type SeriesPoint = { date: string; value: number };
type Metric = {
  value: number;
  delta?: number;
  series?: SeriesPoint[];
  connected?: boolean;
};
export interface PageKpiData {
  // GA4
  sessions: Metric;
  users: Metric;
  avgSessionDurationSec: Metric; // seconds
  bounceRatePct: Metric; // 0..100
  // GSC
  clicks: Metric;
  impressions: Metric;
  ctrPct: Metric; // 0..100
  avgPosition: Metric; // lower is better
}

/* -----------------------------------------------------------------------------
 * DEMO DATA (safe defaults; ISO dates to keep tooltips consistent)
 * ---------------------------------------------------------------------------*/
export function createDemoPageKpiData(): PageKpiData {
  const days = 14;

  const addDays = (d: Date, n: number) => {
    const c = new Date(d);
    c.setDate(c.getDate() + n);
    return c;
  };
  const mk = (base: number, amp = 0.12, jitter = 0.07) =>
    Array.from({ length: days }, (_, i) => {
      const start = addDays(new Date(), -(days - 1));
      const d = addDays(start, i);
      const m = 1 + Math.sin(i * 0.55) * amp + (Math.random() - 0.5) * jitter;
      return { date: toISO(d), value: Math.max(0, Math.round(base * m)) };
    });

  const sessionsSeries = mk(2400, 0.19, 0.08);
  const usersSeries = sessionsSeries.map((p) => ({
    date: p.date,
    value: Math.round(p.value * (0.78 + (Math.random() - 0.5) * 0.04)),
  }));
  const clicksSeries = mk(820, 0.16, 0.08);
  const imprSeries = mk(21400, 0.12, 0.08);
  const durSeriesSec = mk(90, 0.18, 0.1).map((p) => ({ ...p, value: Math.max(30, p.value) }));
  const bounceSeries = mk(42, 0.05, 0.02).map((p) => ({
    ...p,
    value: Math.min(95, Math.max(5, Math.round(p.value))),
  }));

  const last = <T,>(arr: T[]) => arr[arr.length - 1];

  const ctrSeries = clicksSeries.map((c, i) => ({
    date: c.date,
    value: Math.round(((c.value / Math.max(1, imprSeries[i].value)) * 100) * 10) / 10,
  }));

  return {
    sessions: {
      value: last(sessionsSeries).value,
      delta: last(sessionsSeries).value - sessionsSeries[days - 2].value,
      series: sessionsSeries,
      connected: true,
    },
    users: {
      value: last(usersSeries).value,
      delta: last(usersSeries).value - usersSeries[days - 2].value,
      series: usersSeries,
      connected: true,
    },
    avgSessionDurationSec: {
      value: last(durSeriesSec).value,
      delta: last(durSeriesSec).value - durSeriesSec[days - 2].value,
      series: durSeriesSec,
      connected: true,
    },
    bounceRatePct: {
      value: last(bounceSeries).value,
      delta: Math.round((last(bounceSeries).value - bounceSeries[days - 2].value) * 10) / 10,
      series: bounceSeries,
      connected: true,
    },
    clicks: {
      value: last(clicksSeries).value,
      delta: last(clicksSeries).value - clicksSeries[days - 2].value,
      series: clicksSeries,
      connected: true,
    },
    impressions: {
      value: last(imprSeries).value,
      delta: last(imprSeries).value - imprSeries[days - 2].value,
      series: imprSeries,
      connected: true,
    },
    ctrPct: {
      value: last(ctrSeries).value,
      delta: last(ctrSeries).value - ctrSeries[days - 2].value,
      series: ctrSeries,
      connected: true,
    },
    avgPosition: {
      value: 9.4,
      delta: -1.2,
      series: mk(10.2, 0.08, 0.05).map((p) => ({ ...p, value: Math.round(p.value * 10) / 10 })),
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
        <Minus size={14} />
        —
      </span>
    );
  }
  const positiveIsGood = !invert;
  const good = positiveIsGood ? delta > 0 : delta < 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
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
      <Icon size={14} />
      {label}
    </span>
  );
}

/* -----------------------------------------------------------------------------
 * PORTALED TOOLTIP SHELL (overlays above all cards)
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
        style={{ backgroundColor: "#fff", border: `1px solid ${TOKENS.border}`, color: TOKENS.text }}
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
    <PortalTooltipShell x={x} y={y} width={280}>
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
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => (
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
const toShare = (rows: Row[], keys: string[]) =>
  rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t } as unknown as Row;
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });

function TrendStack({
  rows,
  keys,
  colors,
  names,
  icons,
  mode,
  share,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  icons?: Record<string, React.ReactNode>;
  mode: "area" | "bars";
  share: boolean;
}) {
  const data = share ? toShare(rows, keys) : rows;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (share ? pctFmt(v, 1) : intFmt.format(Math.round(v)));

  return (
    <div ref={ref} className="h-16 min-w-[160px]" role="img" aria-label="KPI trend">
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  iconMap={icons}
                  valueFmt={valueFmt}
                  asShare={share}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TOKENS.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stackId="a"
                stroke={colors[k]}
                fill={colors[k]}
                fillOpacity={0.25}
                strokeWidth={2}
                dot={false}
              />
            ))}
            <ReferenceLine y={0} stroke={TOKENS.muted} strokeOpacity={0.12} />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  iconMap={icons}
                  valueFmt={valueFmt}
                  asShare={share}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="a"
                fill={colors[k]}
                /* only the top of the stack has soft radius */
                radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * CARD SHELL — left: donut, center: value+delta, right: trend
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

        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TOKENS.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge delta={delta} unit={deltaUnit} invert={invert} />
            </div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* -----------------------------------------------------------------------------
 * SECTION — Page Detail KPI Cards (Snapshot + Trend)
 * ---------------------------------------------------------------------------*/
type BreakdownModeGA4 = "device" | "channel";

export function PageDetailKpiSection({
  data,
}: {
  data?: Partial<PageKpiData>;
}) {
  // merge incoming data with demo defaults (shallow for brevity)
  const base = React.useMemo(() => createDemoPageKpiData(), []);
  const d: PageKpiData = {
    sessions: { ...base.sessions, ...(data?.sessions || {}) },
    users: { ...base.users, ...(data?.users || {}) },
    avgSessionDurationSec: { ...base.avgSessionDurationSec, ...(data?.avgSessionDurationSec || {}) },
    bounceRatePct: { ...base.bounceRatePct, ...(data?.bounceRatePct || {}) },
    clicks: { ...base.clicks, ...(data?.clicks || {}) },
    impressions: { ...base.impressions, ...(data?.impressions || {}) },
    ctrPct: { ...base.ctrPct, ...(data?.ctrPct || {}) },
    avgPosition: { ...base.avgPosition, ...(data?.avgPosition || {}) },
  };

  // controls
  const [ga4Breakdown, setGa4Breakdown] = React.useState<BreakdownModeGA4>("device");
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  // colors & labels (device/channel/country)
  const DEVICE = [
    { key: "mobile", label: "Mobile", baseShare: 0.58 },
    { key: "desktop", label: "Desktop", baseShare: 0.34 },
    { key: "tablet", label: "Tablet", baseShare: 0.08 },
  ] as const;
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

  const CHANNEL = [
    { key: "organic", label: "Organic", baseShare: 0.56 },
    { key: "direct", label: "Direct", baseShare: 0.24 },
    { key: "referral", label: "Referral", baseShare: 0.12 },
    { key: "paid", label: "Paid", baseShare: 0.08 },
  ] as const;
  const CHANNEL_COLORS: Record<string, string> = {
    organic: TOKENS.valueBlue,
    direct: "#60A5FA",
    referral: "#22D3EE",
    paid: "#7C3AED",
  };
  const CHANNEL_NAMES = { organic: "Organic", direct: "Direct", referral: "Referral", paid: "Paid" };
  const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    organic: <Search size={14} color={TOKENS.brand} />,
    direct: <UsersIcon size={14} color={TOKENS.brand} />,
    referral: <MousePointer2 size={14} color={TOKENS.brand} />,
    paid: <Target size={14} color={TOKENS.brand} />,
  };

  const COUNTRY = [
    { key: "us", label: "USA", baseShare: 0.42 },
    { key: "in", label: "India", baseShare: 0.28 },
    { key: "gb", label: "UK", baseShare: 0.15 },
    { key: "other", label: "Other", baseShare: 0.15 },
  ] as const;
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

  // helpers
  type SplitSpec = { key: string; label: string; baseShare: number };
  function splitSeries(total: SeriesPoint[] | undefined, parts: SplitSpec[], jitter = 0.06) {
    const rows: Row[] = [];
    const src = total ?? [];
    for (let i = 0; i < src.length; i++) {
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
      const out: Row = { t: src[i].date } as unknown as Row;
      parts.forEach((sp) => (out[sp.key] = Math.round((src[i].value || 0) * shares[sp.key])));
      rows.push(out);
    }
    return rows;
  }

  function lastParts(rows: Row[], keys: string[], names: Record<string, string>, colors: Record<string, string>) {
    if (!rows.length) return [];
    const r = rows[rows.length - 1];
    return keys
      .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
      .sort((a, b) => b.value - a.value);
  }

  // Build rows for each KPI (snapshot + trend use same split)
  const ga4Spec = ga4Breakdown === "device" ? DEVICE : CHANNEL;
  const ga4Colors = ga4Breakdown === "device" ? DEVICE_COLORS : CHANNEL_COLORS;
  const ga4Names = ga4Breakdown === "device" ? DEVICE_NAMES : CHANNEL_NAMES;
  const ga4Icons = ga4Breakdown === "device" ? DEVICE_ICONS : CHANNEL_ICONS;

  const sessionsRows = React.useMemo(
  () => splitSeries(d.sessions.series, ga4Spec as unknown as SplitSpec[], 0.05) as unknown as Row[],
  [d.sessions.series, ga4Breakdown]
);

const usersRows = React.useMemo(
  () => splitSeries(d.users.series, ga4Spec as unknown as SplitSpec[], 0.05) as unknown as Row[],
  [d.users.series, ga4Breakdown]
);


  // Engaged vs Bounced (needs sessions + bounce rate)
const engagedVsBounceRows = React.useMemo(() => {
  const rows: Row[] = [];
  const sess = d.sessions.series ?? [];
  const br = d.bounceRatePct.series ?? [];
  for (let i = 0; i < Math.min(sess.length, br.length); i++) {
    const s = Math.max(0, sess[i].value || 0);
    const bouncePct = clamp01((br[i].value || 0) / 100);
    const bounced = Math.round(s * bouncePct);
    const engaged = Math.max(0, s - bounced);
    rows.push({ t: sess[i].date, engaged, bounced } as unknown as Row); 
  }
  return rows;
}, [d.sessions.series, d.bounceRatePct.series]);

  const ENG_COLORS = { engaged: TOKENS.success, bounced: TOKENS.danger };
  const ENG_NAMES = { engaged: "Engaged Sessions", bounced: "Bounced Sessions" };
  const ENG_ICONS = {
    engaged: <TrendingUp size={14} color={TOKENS.brand} />,
    bounced: <TrendingUp size={14} color={TOKENS.brand} />,
  };

  // Time buckets from avg session duration
  const timeBucketRows = React.useMemo(() => {
    const rows: Row[] = [];
    const sess = d.sessions.series ?? [];
    const t = d.avgSessionDurationSec.series ?? [];
    for (let i = 0; i < Math.min(sess.length, t.length); i++) {
      const total = Math.max(1, sess[i].value);
      const sec = t[i].value || 0;
      const lt30 = clamp01(0.25 + (60 - Math.min(60, sec)) / 300);
      const s30_120 = clamp01(0.5 - Math.abs(90 - Math.min(180, sec)) / 400);
      let gt120 = clamp01(1 - (lt30 + s30_120));
      const sum = lt30 + s30_120 + gt120 || 1;
      const A = (lt30 / sum) * total;
      const B = (s30_120 / sum) * total;
      const C = total - Math.round(A) - Math.round(B);
      rows.push({ t: sess[i].date, lt30s: Math.round(A), s30_120: Math.round(B), gt120s: Math.max(0, C) } as unknown as Row);

    }
    return rows;
  }, [d.sessions.series, d.avgSessionDurationSec.series]);
  const TIME_COLORS = { lt30s: "#9CA3AF", s30_120: TOKENS.valueBlue, gt120s: "#5CA8FF" };
  const TIME_NAMES = { lt30s: "<30s", s30_120: "30–120s", gt120s: "≥120s" };
  const TIME_ICONS = {
    lt30s: <Info size={14} color={TOKENS.brand} />,
    s30_120: <Info size={14} color={TOKENS.brand} />,
    gt120s: <Info size={14} color={TOKENS.brand} />,
  };

  // GSC splits
  const clicksRows = React.useMemo(() => splitSeries(d.clicks.series, DEVICE as any, 0.05), [d.clicks.series]);
  const imprRows = React.useMemo(() => splitSeries(d.impressions.series, COUNTRY as any, 0.06), [d.impressions.series]);

  // Position buckets from impressions (as proxy distribution)
  const positionRows = React.useMemo(() => {
    const base = d.impressions.series ?? [];
    const rows: Row[] = [];
    for (let i = 0; i < base.length; i++) {
      const total = base[i].value || 0;
      const best = clamp01(0.18 + Math.sin(i * 0.22) * 0.03);
      const mid = clamp01(0.36 + Math.cos(i * 0.18) * 0.05);
      let tail = clamp01(1 - (best + mid));
      const sum = best + mid + tail || 1;
      const a = (best / sum) * total;
      const b = (mid / sum) * total;
      const c = Math.max(0, total - Math.round(a) - Math.round(b));
      rows.push({ t: base[i].date, pos_1_3: Math.round(a), pos_4_10: Math.round(b), pos_11p: c } as unknown as Row);
    }
    return rows;
  }, [d.impressions.series]);
  const POS_COLORS = { pos_1_3: TOKENS.success, pos_4_10: "#60A5FA", pos_11p: "#9CA3AF" };
  const POS_NAMES = { pos_1_3: "Pos 1–3", pos_4_10: "Pos 4–10", pos_11p: "Pos 11+" };
  const POS_ICONS = {
    pos_1_3: <Target size={14} color={TOKENS.brand} />,
    pos_4_10: <Target size={14} color={TOKENS.brand} />,
    pos_11p: <Target size={14} color={TOKENS.brand} />,
  };

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
      {/* Section Header */}
      <div className="rounded-md bg-white p-4" style={{ border: `1px solid ${TOKENS.border}` }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2">
            <BrandIcon size={20} />
            <h2 className="text-[20px] font-semibold" style={{ color: TOKENS.text }}>
              Analytics Summary
            </h2>
            <button
              className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
              title="Each KPI shows a snapshot breakdown (donut) and a trend of that breakdown."
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

            {/* Share toggle */}
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

            {/* Export */}
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

        {/* KPI Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1) GA4 — Sessions (donut+area, breakdown by GA4 chip) */}
          <KpiCard
            title="Sessions"
            source="GA4"
            info={`Snapshot: ${ga4Breakdown === "device" ? "Device mix" : "Channel mix"}. Trend shows ${
              shareMode ? "share %" : "absolute"
            } by ${ga4Breakdown}.`}
            donut={
              <StackedDonut
                parts={lastParts(sessionsRows, ga4Spec.map((s) => s.key), ga4Names, ga4Colors).map((p) => ({ ...p, name: p.key }))}
                nameMap={ga4Names}
                iconMap={ga4Icons}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.sessions.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.sessions.delta}
            trend={
              <TrendStack
                rows={sessionsRows}
                keys={ga4Spec.map((s) => s.key)}
                colors={ga4Colors}
                names={ga4Names}
                icons={ga4Icons}
                mode="area"
                share={shareMode}
              />
            }
          />

          {/* 2) GA4 — Users (donut+bars, same GA4 breakdown) */}
          <KpiCard
            title="Users"
            source="GA4"
            info={`Snapshot: ${ga4Breakdown === "device" ? "Device mix" : "Channel mix"}.`}
            donut={
              <StackedDonut
                parts={lastParts(usersRows, ga4Spec.map((s) => s.key), ga4Names, ga4Colors).map((p) => ({ ...p, name: p.key }))}
                nameMap={ga4Names}
                iconMap={ga4Icons}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.users.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.users.delta}
            trend={
              <TrendStack
                rows={usersRows}
                keys={ga4Spec.map((s) => s.key)}
                colors={ga4Colors}
                names={ga4Names}
                icons={ga4Icons}
                mode="bars"
                share={shareMode}
              />
            }
          />

          {/* 3) GA4 — Avg. Session Duration (donut time buckets + area) */}
          <KpiCard
            title="Avg. Session Duration"
            source="GA4"
            info="Snapshot shows time buckets; trend shows mix over time."
            donut={
              <StackedDonut
                parts={lastParts(timeBucketRows, ["lt30s", "s30_120", "gt120s"], TIME_NAMES, TIME_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={TIME_NAMES}
                iconMap={TIME_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.avgSessionDurationSec.value}
            valueFmt={(v) => {
              const m = Math.floor(v / 60);
              const s = Math.max(0, Math.floor(v % 60));
              return `${m}m ${String(s).padStart(2, "0")}s`;
            }}
            delta={d.avgSessionDurationSec.delta}
            deltaUnit="s"
            trend={
              <TrendStack
                rows={timeBucketRows}
                keys={["lt30s", "s30_120", "gt120s"]}
                colors={TIME_COLORS}
                names={TIME_NAMES}
                icons={TIME_ICONS}
                mode="area"
                share={shareMode}
              />
            }
          />

          {/* 4) GA4 — Bounce Rate (NEW KPI) — donut engaged vs bounced + bars */}
          <KpiCard
            title="Bounce Rate"
            source="GA4"
            info="Sessions without engagement (lower is better). Snapshot shows engaged vs bounced."
            donut={
              <StackedDonut
                parts={lastParts(engagedVsBounceRows, ["bounced", "engaged"], ENG_NAMES, { bounced: ENG_COLORS.bounced, engaged: ENG_COLORS.engaged }).map(
                  (p) => ({ ...p, name: p.key })
                )}
                nameMap={ENG_NAMES}
                iconMap={ENG_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.bounceRatePct.value}
            valueFmt={(v) => pctFmt(v, 1)}
            delta={d.bounceRatePct.delta}
            deltaUnit="pp"
            invert
            trend={
              <TrendStack
                rows={engagedVsBounceRows}
                keys={["bounced", "engaged"]}
                colors={{ bounced: ENG_COLORS.bounced, engaged: ENG_COLORS.engaged }}
                names={ENG_NAMES}
                icons={ENG_ICONS}
                mode="bars"
                share={shareMode}
              />
            }
          />

          {/* 5) GSC — Organic Clicks (device mix) */}
          <KpiCard
            title="Organic Clicks"
            source="GSC"
            info="Snapshot shows device mix; trend shows device mix over time."
            donut={
              <StackedDonut
                parts={lastParts(clicksRows, ["mobile", "desktop", "tablet"], DEVICE_NAMES, DEVICE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={DEVICE_NAMES}
                iconMap={DEVICE_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.clicks.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.clicks.delta}
            trend={
              <TrendStack
                rows={clicksRows}
                keys={["mobile", "desktop", "tablet"]}
                colors={DEVICE_COLORS}
                names={DEVICE_NAMES}
                icons={DEVICE_ICONS}
                mode="bars"
                share={shareMode}
              />
            }
          />

          {/* 6) GSC — Organic Impressions (country mix) */}
          <KpiCard
            title="Organic Impressions"
            source="GSC"
            info="Snapshot shows top countries; trend shows country mix."
            donut={
              <StackedDonut
                parts={lastParts(imprRows, ["us", "in", "gb", "other"], COUNTRY_NAMES, COUNTRY_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={COUNTRY_NAMES}
                iconMap={COUNTRY_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.impressions.value}
            valueFmt={(v) => compactInt(v)}
            delta={d.impressions.delta}
            trend={
              <TrendStack
                rows={imprRows}
                keys={["us", "in", "gb", "other"]}
                colors={COUNTRY_COLORS}
                names={COUNTRY_NAMES}
                icons={COUNTRY_ICONS}
                mode="area"
                share={shareMode}
              />
            }
          />

          {/* 7) GSC — Organic CTR (device mix) */}
          <KpiCard
            title="Organic CTR"
            source="GSC"
            info="Clicks ÷ Impressions. Snapshot mirrors device share of clicks; trend shows device mix."
            donut={
              <StackedDonut
                parts={lastParts(clicksRows, ["mobile", "desktop", "tablet"], DEVICE_NAMES, DEVICE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={DEVICE_NAMES}
                iconMap={DEVICE_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.ctrPct.value}
            valueFmt={(v) => pctFmt(v, 1)}
            delta={d.ctrPct.delta}
            deltaUnit="%"
            trend={
              <TrendStack
                rows={clicksRows}
                keys={["mobile", "desktop", "tablet"]}
                colors={DEVICE_COLORS}
                names={DEVICE_NAMES}
                icons={DEVICE_ICONS}
                mode="bars"
                share={shareMode}
              />
            }
          />

          {/* 8) GSC — Avg. Position (position buckets) */}
          <KpiCard
            title="Avg. Position"
            source="GSC"
            info="Average ranking (lower is better). Snapshot uses rank buckets; trend shows bucket mix."
            donut={
              <StackedDonut
                parts={lastParts(positionRows, ["pos_1_3", "pos_4_10", "pos_11p"], POS_NAMES, POS_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={POS_NAMES}
                iconMap={POS_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.avgPosition.value}
            valueFmt={(v) => v.toFixed(1)}
            delta={d.avgPosition.delta}
            invert
            trend={
              <TrendStack
                rows={positionRows}
                keys={["pos_1_3", "pos_4_10", "pos_11p"]}
                colors={POS_COLORS}
                names={POS_NAMES}
                icons={POS_ICONS}
                mode="bars"
                share={shareMode}
              />
            }
          />
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * Demo wrapper (optional for local preview)
 * ---------------------------------------------------------------------------*/
export default function DemoPageDetailKpis() {
  return (
    <div>
    <PageDetailKpiSection />
</div>
  );
}
