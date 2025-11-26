"use client";

/* =============================================================================
   Search KPIs Overview — Snapshot + Trend (Stacked Donut · Stacked Bars/Area)
   ---------------------------------------------------------------------------
   - Left: Stacked donut (snapshot breakdown) with SMART popover (PORTALED)
   - Center: Metric value + delta (single column, two rows)
   - Right: Trend chart (stacked bars/area) using SAME breakdown
   - Inter / Inter Fallback fonts; branded #008CCD icons; pointer cursors
   - Preferred color for values & charts: Blue #0077FF & pastel fills
   - Chips & toggle: "Show % share" for trends (modular switch)
   - No emoji. Smart popover is portaled above all cards (no clipping)
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
  BarChart3,
  Smartphone,
  Laptop,
  Tablet as TabletIcon,
  Globe,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* ---------------------------------
   Theme tokens (matches reference)
---------------------------------- */
const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
};

type SeriesPoint = { date: string; value: number };
type Metric = {
  value: number;
  delta?: number;           // change vs previous period (same unit)
  series?: SeriesPoint[];   // sparkline series
  connected?: boolean;      // false → show connect overlay
};

export interface SearchKpiData {
  totalClicks: Metric;        // GSC
  totalImpressions: Metric;   // GSC
  avgCtrPct: Metric;          // GSC, percent 0–100
  avgPosition: Metric;        // GSC, smaller is better
}

/* ---------------------------------
   Demo data (safe, non-zero)
---------------------------------- */
export function createDemoSearchKpiData(): SearchKpiData {
  const days = 30;
  const mk = (base: number, amp = 10, rnd = 4) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return {
        date: d.toISOString().slice(0, 10),
        value: Math.max(0, Math.round(base + Math.sin(i / 2) * amp + (Math.random() - 0.5) * rnd)),
      };
    });

  const clicks = mk(820, 160, 40);
  const impr = mk(13800, 1300, 240);
  const ctrSeries = clicks.map((c, i) => ({
    date: c.date,
    value: Math.round((c.value / Math.max(1, impr[i].value)) * 10000) / 100, // %
  }));
  const ctrNow = ctrSeries.at(-1)!.value;
  const ctrPrev = ctrSeries.at(-2)!.value;

  return {
    totalClicks: {
      value: clicks.at(-1)!.value,
      delta: clicks.at(-1)!.value - clicks.at(-2)!.value,
      series: clicks,
      connected: true,
    },
    totalImpressions: {
      value: impr.at(-1)!.value,
      delta: impr.at(-1)!.value - impr.at(-2)!.value,
      series: impr,
      connected: true,
    },
    avgCtrPct: {
      value: ctrNow,
      delta: Math.round((ctrNow - ctrPrev) * 10) / 10, // percentage points
      series: ctrSeries,
      connected: true,
    },
    avgPosition: {
      value: 14.6,
      delta: -0.7, // lower is good
      series: mk(15.2, 1.0, 0.6).map(p => ({ ...p, value: Math.round(p.value * 10) / 10 })),
      connected: true,
    },
  };
}

/* ---------------------------------
   Formatters & helpers
---------------------------------- */
const intFmt = new Intl.NumberFormat();
const nf = (n: number) => intFmt.format(Math.round(n));
const kf = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
const pctFmt = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Delta badge (uses status colors, supports inverse metrics like Position) */
function DeltaBadge({
  delta,
  unit = "",
  invert = false,
}: {
  delta?: number;
  unit?: "" | "%" | "pp";
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
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TOKENS.muted : good ? TOKENS.success : TOKENS.danger;
  const label =
    unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
      : nf(Math.abs(delta));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <Icon size={14} />
      {label}
    </span>
  );
}

/* ---------------------------------
   Portaled tooltip shell (always on top)
---------------------------------- */
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

/* Trend tooltip (portaled) */
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
  const fmt = valueFmt ?? ((v: number) => (asShare ? pctFmt(v, 1) : nf(v)));
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        {typeof label === "string"
          ? new Date(label).toLocaleDateString(undefined, { month: "short", day: "2-digit" })
          : String(label)}
      </div>
      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TOKENS.muted }}>
            Total
          </span>
          <span className="font-semibold">{nf(total)}</span>
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

/* Donut tooltip (portaled) */
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
  const fmt = valueFmt ?? ((v: number) => nf(v));
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

/* ---------------------------------
   Snapshot: Stacked donut (with portal)
---------------------------------- */
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

/* ---------------------------------
   Trend: stacked area / bars (with portal)
---------------------------------- */
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
  const data = share ? to100(rows, keys) : rows;
  const asShare = share;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (asShare ? pctFmt(v, 1) : nf(v));

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
                  iconMap={icons ?? {}}
                  valueFmt={valueFmt}
                  asShare={asShare}
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
            <YAxis hide domain={asShare ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  iconMap={icons ?? {}}
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

/* ---------------------------------
   Split helpers (build breakdowns)
---------------------------------- */
type SplitSpec = { key: string; label: string; baseShare: number };

function splitSeries(total: SeriesPoint[] | undefined, parts: SplitSpec[], jitter = 0.06) {
  const src = total ?? [];
  return src.map((p, i) => {
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
    const out: any = { t: p.date };
    parts.forEach((sp) => (out[sp.key] = Math.round(p.value * shares[sp.key])));
    return out as Row;
  });
}

function lastParts(rows: Row[], keys: string[], names: Record<string, string>, colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* ---------------------------------
   Card frame (reference pattern)
---------------------------------- */
function BrandIcon({ size = 18 }: { size?: number }) {
  return <BarChart3 size={size} color={TOKENS.brand} />;
}

function Card({
  title,
  tooltip,
  donut,
  valueNode,
  deltaNode,
  trend,
  connected = true,
  onClick,
}: {
  title: string;
  tooltip: string;
  donut: React.ReactNode;
  valueNode: React.ReactNode;
  deltaNode: React.ReactNode;
  trend: React.ReactNode;
  connected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left cursor-pointer"
      aria-label={`${title} card`}
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
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
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={tooltip}>
              <Info size={14} />
            </span>
          </div>
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              border: `1px solid ${TOKENS.border}`,
              background: "#F5F7FA",
              color: TOKENS.brand,
            }}
          >
            GSC
          </span>
        </div>

        {/* Content row: donut | value/delta | trend */}
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TOKENS.valueBlue }}>
              {valueNode}
            </div>
            <div className="mt-0.5">{deltaNode}</div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>

      {!connected && (
        <div className="pointer-events-none absolute inset-0 rounded-[10px] bg-white/80 backdrop-blur-[1px]" />
      )}
    </button>
  );
}

/* ---------------------------------
   Section: Search KPIs Overview (Redesigned)
---------------------------------- */
type DeviceKey = "mobile" | "desktop" | "tablet";
type CountryKey = "us" | "in" | "gb" | "other";
type PosKey = "pos_1_3" | "pos_4_10" | "pos_11p";

const DEVICE: SplitSpec[] = [
  { key: "mobile", label: "Mobile", baseShare: 0.58 },
  { key: "desktop", label: "Desktop", baseShare: 0.34 },
  { key: "tablet", label: "Tablet", baseShare: 0.08 },
];
const DEVICE_COLORS: Record<DeviceKey, string> = {
  mobile: "#5CA8FF",
  desktop: TOKENS.valueBlue,
  tablet: "#9FC8FF",
};
const DEVICE_NAMES: Record<DeviceKey, string> = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };
const DEVICE_ICONS: Record<DeviceKey, React.ReactNode> = {
  mobile: <Smartphone size={14} color={TOKENS.brand} />,
  desktop: <Laptop size={14} color={TOKENS.brand} />,
  tablet: <TabletIcon size={14} color={TOKENS.brand} />,
};

const COUNTRY: SplitSpec[] = [
  { key: "us", label: "USA", baseShare: 0.42 },
  { key: "in", label: "India", baseShare: 0.28 },
  { key: "gb", label: "UK", baseShare: 0.15 },
  { key: "other", label: "Other", baseShare: 0.15 },
];
const COUNTRY_COLORS: Record<CountryKey, string> = {
  us: TOKENS.valueBlue,
  in: "#00BFA6",
  gb: "#7E72FF",
  other: "#9CA3AF",
};
const COUNTRY_NAMES: Record<CountryKey, string> = { us: "United States", in: "India", gb: "United Kingdom", other: "Other" };
const COUNTRY_ICONS: Record<CountryKey, React.ReactNode> = {
  us: <Globe size={14} color={TOKENS.brand} />,
  in: <Globe size={14} color={TOKENS.brand} />,
  gb: <Globe size={14} color={TOKENS.brand} />,
  other: <Globe size={14} color={TOKENS.brand} />,
};

const POS_COLORS: Record<PosKey, string> = { pos_1_3: TOKENS.success, pos_4_10: "#60A5FA", pos_11p: "#9CA3AF" };
const POS_NAMES: Record<PosKey, string> = { pos_1_3: "Pos 1–3", pos_4_10: "Pos 4–10", pos_11p: "Pos 11+" };
const POS_ICONS: Record<PosKey, React.ReactNode> = {
  pos_1_3: <Target size={14} color={TOKENS.brand} />,
  pos_4_10: <Target size={14} color={TOKENS.brand} />,
  pos_11p: <Target size={14} color={TOKENS.brand} />,
};

export function SearchKpisOverviewSection({
  data,
  onMetricClick,
}: {
  /** Pass live GSC data; demo data will fill gaps. */
  data?: Partial<SearchKpiData>;
  /** Optional click handlers (e.g., to jump to insights) */
  onMetricClick?: (metric: "ctr" | "position") => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const base = React.useMemo(() => createDemoSearchKpiData(), []);
  const d: SearchKpiData = {
    totalClicks: { ...base.totalClicks, ...(data?.totalClicks || {}) },
    totalImpressions: { ...base.totalImpressions, ...(data?.totalImpressions || {}) },
    avgCtrPct: { ...base.avgCtrPct, ...(data?.avgCtrPct || {}) },
    avgPosition: { ...base.avgPosition, ...(data?.avgPosition || {}) },
  };

  // Build breakdown rows
  const clicksRows = React.useMemo(() => splitSeries(d.totalClicks.series, DEVICE, 0.05), [d.totalClicks.series]);
  const imprRows = React.useMemo(() => splitSeries(d.totalImpressions.series, COUNTRY, 0.06), [d.totalImpressions.series]);

  const positionRows = React.useMemo(() => {
    const baseSeries = d.totalImpressions.series ?? [];
    const rows: Row[] = [];
    for (let i = 0; i < baseSeries.length; i++) {
      const total = baseSeries[i].value || 0;
      const best = clamp01(0.18 + Math.sin(i * 0.22) * 0.03);
      const mid = clamp01(0.36 + Math.cos(i * 0.18) * 0.05);
      let tail = clamp01(1 - (best + mid));
      const sum = best + mid + tail || 1;
      const a = (best / sum) * total;
      const b = (mid / sum) * total;
      const c = Math.max(0, total - Math.round(a) - Math.round(b));
      rows.push({ t: baseSeries[i].date, pos_1_3: Math.round(a), pos_4_10: Math.round(b), pos_11p: c } as unknown as Row);
    }
    return rows;
  }, [d.totalImpressions.series]);

  // Trend toggle: show share %
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  if (!mounted) {
    return (
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[140px] rounded-lg bg-white" style={{ border: `1px solid ${TOKENS.border}` }} />
        ))}
      </section>
    );
  }

  return (
    <section
      className="w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrandIcon />
          <h2 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            Search KPIs Overview
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
      </div>

      {/* KPI grid (4) */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1) Total Clicks — Device mix (bars) */}
        <Card
          title="Total Clicks"
          tooltip="Total Google Search clicks. Snapshot shows device mix; trend shows device mix over time."
          donut={
            <StackedDonut
              parts={lastParts(clicksRows, ["mobile", "desktop", "tablet"], DEVICE_NAMES, DEVICE_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={DEVICE_NAMES}
              iconMap={DEVICE_ICONS}
              valueFmt={(v) => nf(v)}
            />
          }
          valueNode={nf(d.totalClicks.value)}
          deltaNode={<DeltaBadge delta={d.totalClicks.delta} />}
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
          connected={d.totalClicks.connected !== false}
        />

        {/* 2) Total Impressions — Country mix (area) */}
        <Card
          title="Total Impressions"
          tooltip="Times your pages appeared in Search. Snapshot shows top countries; trend shows country mix."
          donut={
            <StackedDonut
              parts={lastParts(imprRows, ["us", "in", "gb", "other"], COUNTRY_NAMES, COUNTRY_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={COUNTRY_NAMES}
              iconMap={COUNTRY_ICONS}
              valueFmt={(v) => nf(v)}
            />
          }
          valueNode={kf(d.totalImpressions.value)}
          deltaNode={<DeltaBadge delta={d.totalImpressions.delta} />}
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
          connected={d.totalImpressions.connected !== false}
        />

        {/* 3) Avg. CTR (%) — Device mix (bars) */}
        <Card
          title="Avg. CTR (%)"
          tooltip="Clicks ÷ Impressions (weighted). Snapshot mirrors device share of clicks; trend shows device mix."
          donut={
            <StackedDonut
              parts={lastParts(clicksRows, ["mobile", "desktop", "tablet"], DEVICE_NAMES, DEVICE_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={DEVICE_NAMES}
              iconMap={DEVICE_ICONS}
              valueFmt={(v) => nf(v)}
            />
          }
          valueNode={pctFmt(d.avgCtrPct.value, 2)}
          deltaNode={<DeltaBadge delta={d.avgCtrPct.delta} unit="pp" />}
          trend={
            <div onClick={() => onMetricClick?.("ctr")} title="Open CTR insights" style={{ cursor: onMetricClick ? "pointer" : "default" }}>
              <TrendStack
                rows={clicksRows}
                keys={["mobile", "desktop", "tablet"]}
                colors={DEVICE_COLORS}
                names={DEVICE_NAMES}
                icons={DEVICE_ICONS}
                mode="bars"
                share={shareMode}
              />
            </div>
          }
          connected={d.avgCtrPct.connected !== false}
        />

        {/* 4) Avg. Position — Rank buckets (bars; lower is better) */}
        <Card
          title="Avg. Position"
          tooltip="Average ranking (lower is better). Snapshot shows share of impressions by rank buckets; trend shows mix."
          donut={
            <StackedDonut
              parts={lastParts(positionRows, ["pos_1_3", "pos_4_10", "pos_11p"], POS_NAMES, POS_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={POS_NAMES}
              iconMap={POS_ICONS}
              valueFmt={(v) => nf(v)}
            />
          }
          valueNode={d.avgPosition.value.toFixed(1)}
          deltaNode={<DeltaBadge delta={d.avgPosition.delta} invert />}
          trend={
            <div onClick={() => onMetricClick?.("position")} title="Open Position insights" style={{ cursor: onMetricClick ? "pointer" : "default" }}>
              <TrendStack
                rows={positionRows}
                keys={["pos_1_3", "pos_4_10", "pos_11p"]}
                colors={POS_COLORS}
                names={POS_NAMES}
                icons={POS_ICONS}
                mode="bars"
                share={shareMode}
              />
            </div>
          }
          connected={d.avgPosition.connected !== false}
        />
      </div>
    </section>
  );
}

/* ---------------------------------
   Optional Demo wrapper (kept)
---------------------------------- */
export default function DemoSearchKpisOverview() {
  return (
    <>
     {/* <div className="w-full p-4" style={{ background: "#F5F7FA" }}>
       <SearchKpisOverviewSection />
     </div> */}
      <SearchKpisOverviewSection />
</>
  );
}
