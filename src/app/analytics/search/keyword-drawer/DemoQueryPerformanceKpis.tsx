"use client";

/* =============================================================================
   Query Performance KPIs — Keyword Drilldown Drawer (Redesigned)
   Snapshot (stacked donut) + Trend (stacked bars/area) in a single card
   - Inter / Inter Fallback fonts
   - Branded #008CCD icons
   - Preferred main metric color: #0077FF (and pastels)
   - Modular chips + toggle switches (recent design pattern)
   - Smart popovers are PORTALED to <body> (no clipping; highest z-index)
   - Pointer cursor on interactive elements
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
  Globe,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* ----------------------------------------------------------------------------- */
/* TOKENS */
/* ----------------------------------------------------------------------------- */
const TK = {
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

/* ----------------------------------------------------------------------------- */
/* TYPES (aligned to original section props) */
/* ----------------------------------------------------------------------------- */
type SeriesPoint = { date: string; value: number };

type Metric = {
  value?: number | null;
  delta?: number | null;
  series?: SeriesPoint[];
  connected?: boolean;
  error?: string | null;
};

export interface QueryKpiData {
  clicks: Metric; // GSC
  impressions: Metric; // GSC
  ctrPct: Metric; // GSC, percent 0–100
  avgPosition: Metric; // GSC, lower is better
  searchVolume?: Metric; // KA (optional)
  keywordDifficulty?: Metric; // KA (optional, 0–100)
}

export interface Thresholds {
  ctrLow: number;
  ctrWarn: number;
  positionGoodMax: number;
  positionWarnMax: number;
  kdGoodMax: number;
  kdWarnMax: number;
  minImpressionsForCtrColor: number;
}

/* ----------------------------------------------------------------------------- */
/* UTILITIES & FORMATTERS */
/* ----------------------------------------------------------------------------- */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${(isFinite(v) ? v : 0).toFixed(d)}%`;
const compactInt = (n?: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Math.round(n));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* ----------------------------------------------------------------------------- */
/* DEMO DATA (safe fallback) — derived from the original section */
/* ----------------------------------------------------------------------------- */
export function createDemoQueryKpiData(): QueryKpiData {
  const days = 30;
  const mk = (base: number, amp = 10, rnd = 4) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const val = Math.max(0, Math.round(base + Math.sin(i / 2) * amp + (Math.random() - 0.5) * rnd));
      return {
        date: d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
        value: val,
      };
    });

  const clicks = mk(78, 22, 10);
  const impr = mk(1450, 260, 90);
  const ctrSeries = clicks.map((c, i) => ({
    date: c.date,
    value: Math.round((c.value / Math.max(1, impr[i].value)) * 10000) / 100, // %
  }));

  const posSeries = mk(8.7, 1.1, 0.6).map((p) => ({ ...p, value: Math.round(p.value * 10) / 10 }));

  const svSeries = mk(620, 95, 40);

  // KD demo baseline
  const kdNow = 37;
  const kdSeries: SeriesPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const v = Math.max(0, Math.min(100, kdNow + Math.sin(i / 3) * 3 + (Math.random() - 0.5) * 2));
    return {
      date: d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
      value: Math.round(v * 10) / 10,
    };
  });

  return {
    clicks: {
      value: clicks.reduce((a, b) => a + b.value, 0),
      delta: clicks.at(-1)!.value - clicks.at(-2)!.value,
      series: clicks,
      connected: true,
    },
    impressions: {
      value: impr.reduce((a, b) => a + b.value, 0),
      delta: impr.at(-1)!.value - impr.at(-2)!.value,
      series: impr,
      connected: true,
    },
    ctrPct: {
      value:
        Math.round(
          ((clicks.reduce((a, b) => a + b.value, 0) / Math.max(1, impr.reduce((a, b) => a + b.value, 0))) * 100) * 100
        ) / 100,
      delta: Math.round((ctrSeries.at(-1)!.value - ctrSeries.at(-2)!.value) * 10) / 10,
      series: ctrSeries,
      connected: true,
    },
    avgPosition: {
      value: posSeries.at(-1)!.value,
      delta: Math.round((posSeries.at(-1)!.value - posSeries.at(-2)!.value) * 10) / 10,
      series: posSeries,
      connected: true,
    },
    searchVolume: {
      value: 18100,
      delta: 300,
      series: svSeries,
      connected: true,
    },
    keywordDifficulty: {
      value: kdNow,
      delta: -2,
      series: kdSeries,
      connected: true,
    },
  };
}

/* ----------------------------------------------------------------------------- */
/* BRAND ICON */
/* ----------------------------------------------------------------------------- */
function BrandIcon({ size = 18 }: { size?: number }) {
  return <BarChart3 size={size} color={TK.brand} />;
}

/* ----------------------------------------------------------------------------- */
/* DELTA BADGE */
/* ----------------------------------------------------------------------------- */
function DeltaBadge({
  delta,
  unit = "",
  invert = false,
}: {
  delta?: number | null;
  unit?: "" | "%" | "pp" | "s";
  invert?: boolean;
}) {
  if (delta == null || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TK.muted }}>
        <Minus size={14} /> —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const ColorIcon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = delta === 0 ? TK.muted : good ? TK.success : TK.danger;
  const label =
    unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
      : unit === "s"
      ? `${Math.round(Math.abs(delta))}s`
      : intFmt.format(Math.round(Math.abs(delta)));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: tone }}>
      <ColorIcon size={14} />
      {label}
    </span>
  );
}

/* ----------------------------------------------------------------------------- */
/* PORTALED TOOLTIP SHELL (z-max, escape view box) */
/* ----------------------------------------------------------------------------- */
function PortalTooltipShell({
  x,
  y,
  width = 280,
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
          border: `1px solid ${TK.border}`,
          color: TK.text,
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
  const labelStr = typeof label === "string" ? label : String(label);
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {labelStr}
      </div>
      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TK.muted }}>
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
              <span style={{ color: TK.muted }}>{nameMap?.[p.name] ?? p.name}</span>
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
  // recharts passes hovered slice name in payload[0]; not required here
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              {iconMap?.[p.name]}
              <span style={{ color: TK.muted }}>{nameMap?.[p.name] ?? p.name}</span>
            </div>
            <div className="font-semibold">{fmt(Number(p.value))}</div>
          </div>
        ))}
      </div>
    </PortalTooltipShell>
  );
}

/* ----------------------------------------------------------------------------- */
/* SNAPSHOT DONUT (stacked) */
/* ----------------------------------------------------------------------------- */
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

/* ----------------------------------------------------------------------------- */
/* TREND STACK (area/bars) */
/* ----------------------------------------------------------------------------- */
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
  icons: Record<string, React.ReactNode>;
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
                  iconMap={icons}
                  valueFmt={valueFmt}
                  asShare={asShare}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
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
            <ReferenceLine y={0} stroke={TK.muted} strokeOpacity={0.12} />
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
                  iconMap={icons}
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

/* ----------------------------------------------------------------------------- */
/* CARD SHELL — Snapshot (donut) | Value & Delta | Trend */
/* ----------------------------------------------------------------------------- */
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
  source: "GSC" | "KA";
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number | null;
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
      style={{ fontFamily: 'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial' }}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TK.border }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BrandIcon size={16} />
            <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
              {title}
            </div>
            {info ? (
              <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info} aria-hidden>
                <Info size={14} />
              </span>
            ) : null}
          </div>
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              border: `1px solid ${TK.border}`,
              background: "#F5F7FA",
              color: source === "GSC" ? TK.brand : TK.valueBlue,
            }}
          >
            {source}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Snapshot */}
          {donut}

          {/* Value + delta */}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge delta={delta ?? undefined} unit={deltaUnit} invert={invert} />
            </div>
          </div>

          {/* Trend */}
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* ----------------------------------------------------------------------------- */
/* SPLIT HELPERS (build snapshot+trend breakdowns) */
/* ----------------------------------------------------------------------------- */
type SplitSpec = { key: string; label: string; baseShare: number };
type KeyedRows = Row[];

function splitSeries(series: SeriesPoint[] | undefined, parts: SplitSpec[], jitter = 0.06): KeyedRows {
  const inRows = series ?? [];
  return inRows.map((p, i) => {
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
    const out: Row = { t: p.date } as Row;
    parts.forEach((sp) => (out[sp.key] = Math.round((p.value || 0) * shares[sp.key])));
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

/* ----------------------------------------------------------------------------- */
/* SECTION — Redesigned Query Performance KPIs */
/* ----------------------------------------------------------------------------- */
type GscBreakdown = "device" | "country";

export type MetricClickTarget = "ctr" | "position";

export function QueryPerformanceKpisSection({
  data,
  kaConnected = true,
  loading = false,
  thresholds,
  onMetricClick,
  title = "Query Performance KPIs",
  onExport,
}: {
  data?: Partial<QueryKpiData>;
  kaConnected?: boolean;
  loading?: boolean;
  thresholds?: Partial<Thresholds>;
  onMetricClick?: (metric: MetricClickTarget) => void;
  title?: string;
  onExport?: (payload: { csv: string; filename: string }) => void;
}) {
  // Hydration guard for charts
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const base = React.useMemo(() => createDemoQueryKpiData(), []);
  const d: QueryKpiData = {
    clicks: { ...base.clicks, ...(data?.clicks || {}) },
    impressions: { ...base.impressions, ...(data?.impressions || {}) },
    ctrPct: { ...base.ctrPct, ...(data?.ctrPct || {}) },
    avgPosition: { ...base.avgPosition, ...(data?.avgPosition || {}) },
    searchVolume: kaConnected ? { ...base.searchVolume, ...(data?.searchVolume || {}) } : undefined,
    keywordDifficulty: kaConnected ? { ...base.keywordDifficulty, ...(data?.keywordDifficulty || {}) } : undefined,
  };

  const t: Thresholds = {
    ctrLow: 1.0,
    ctrWarn: 2.5,
    positionGoodMax: 10,
    positionWarnMax: 20,
    kdGoodMax: 34,
    kdWarnMax: 64,
    minImpressionsForCtrColor: 100,
    ...thresholds,
  };

  // Controls (modular chips & toggle)
  const [gscBreakdown, setGscBreakdown] = React.useState<GscBreakdown>("device"); // affects Clicks & CTR snapshot/trend
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  // Color + icon maps
  const DEVICE: SplitSpec[] = [
    { key: "mobile", label: "Mobile", baseShare: 0.58 },
    { key: "desktop", label: "Desktop", baseShare: 0.34 },
    { key: "tablet", label: "Tablet", baseShare: 0.08 },
  ];
  const DEVICE_COLORS: Record<string, string> = {
    desktop: TK.valueBlue,
    mobile: "#5CA8FF",
    tablet: "#9FC8FF",
  };
  const DEVICE_NAMES = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };
  const DEVICE_ICONS: Record<string, React.ReactNode> = {
    mobile: <Smartphone size={14} color={TK.brand} />,
    desktop: <Laptop size={14} color={TK.brand} />,
    tablet: <TabletIcon size={14} color={TK.brand} />,
  };

  const COUNTRY: SplitSpec[] = [
    { key: "us", label: "USA", baseShare: 0.42 },
    { key: "in", label: "India", baseShare: 0.28 },
    { key: "gb", label: "UK", baseShare: 0.15 },
    { key: "other", label: "Other", baseShare: 0.15 },
  ];
  const COUNTRY_COLORS: Record<string, string> = {
    us: TK.valueBlue,
    in: "#00BFA6",
    gb: "#7E72FF",
    other: "#9CA3AF",
  };
  const COUNTRY_NAMES = { us: "United States", in: "India", gb: "United Kingdom", other: "Other" };
  const COUNTRY_ICONS: Record<string, React.ReactNode> = {
    us: <Globe size={14} color={TK.brand} />,
    in: <Globe size={14} color={TK.brand} />,
    gb: <Globe size={14} color={TK.brand} />,
    other: <Globe size={14} color={TK.brand} />,
  };

  // Position buckets (for avg position & impressions mix)
  const POS_COLORS = { pos_1_3: TK.success, pos_4_10: "#60A5FA", pos_11p: "#9CA3AF" };
  const POS_NAMES = { pos_1_3: "Pos 1–3", pos_4_10: "Pos 4–10", pos_11p: "Pos 11+" };
  const POS_ICONS = {
    pos_1_3: <Target size={14} color={TK.brand} />,
    pos_4_10: <Target size={14} color={TK.brand} />,
    pos_11p: <Target size={14} color={TK.brand} />,
  };

  // KD buckets (status colors)
  const KD_COLORS = { easy: TK.success, medium: TK.warn, hard: TK.danger };
  const KD_NAMES = { easy: "Easy", medium: "Medium", hard: "Hard" };
  const KD_ICONS = {
    easy: <Target size={14} color={TK.brand} />,
    medium: <Target size={14} color={TK.brand} />,
    hard: <Target size={14} color={TK.brand} />,
  };

  // Build breakdown rows (snapshot + trend)
  const clicksDeviceRows = React.useMemo(() => splitSeries(d.clicks.series, DEVICE, 0.05), [d.clicks.series]);
  const clicksCountryRows = React.useMemo(() => splitSeries(d.clicks.series, COUNTRY, 0.05), [d.clicks.series]);

  const clicksRows = gscBreakdown === "device" ? clicksDeviceRows : clicksCountryRows;
  const clicksKeys = gscBreakdown === "device" ? DEVICE.map((s) => s.key) : COUNTRY.map((s) => s.key);
  const clicksColors = gscBreakdown === "device" ? DEVICE_COLORS : COUNTRY_COLORS;
  const clicksNames = gscBreakdown === "device" ? DEVICE_NAMES : COUNTRY_NAMES;
  const clicksIcons = gscBreakdown === "device" ? DEVICE_ICONS : COUNTRY_ICONS;

  const imprCountryRows = React.useMemo(() => splitSeries(d.impressions.series, COUNTRY, 0.06), [d.impressions.series]);

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

  const searchVolCountryRows = React.useMemo(
    () => splitSeries(d.searchVolume?.series, COUNTRY, 0.05),
    [d.searchVolume?.series]
  );

  const kdMixRows = React.useMemo(() => {
    const src = d.keywordDifficulty?.series ?? [];
    const rows: Row[] = [];
    for (let i = 0; i < src.length; i++) {
      const kd = src[i].value || (d.keywordDifficulty?.value ?? 0);
      // derive a pseudo mix based on KD value
      // higher KD → more "hard", moderate KD → more "medium"
      const hard = clamp01((kd / 100) * 0.7 + 0.1 + Math.sin(i * 0.15) * 0.05);
      const easy = clamp01((1 - kd / 100) * 0.6 + 0.15 + Math.cos(i * 0.12) * 0.05);
      let medium = clamp01(1 - hard - easy);
      const tot = src[i].value || 100; // scale to a pseudo total
      const a = Math.round(tot * easy);
      const b = Math.round(tot * medium);
      const c = Math.max(0, tot - a - b);
      rows.push({ t: src[i].date, easy: a, medium: b, hard: c }as unknown as Row);
    }
    return rows;
  }, [d.keywordDifficulty?.series, d.keywordDifficulty?.value]);

  function donutPartsFrom(rows: Row[], keys: string[], colors: Record<string, string>) {
    return lastParts(rows, keys, colors).map((p) => ({ ...p, name: p.key }));
  }

  // Export (values & deltas only — panel parity)
  function exportCsv() {
    const rows: string[][] = [];
    const push = (name: string, value: string, delta: string, src: string) =>
      rows.push([name, value, delta, src]);
    push("Clicks", intFmt.format(Math.round(d.clicks.value ?? 0)), signed(d.clicks.delta), "GSC");
    push("Impressions", compactInt(d.impressions.value), signed(d.impressions.delta), "GSC");
    push("CTR (%)", `${(d.ctrPct.value ?? 0).toFixed(2)}%`, signed(d.ctrPct.delta, "pp"), "GSC");
    push("Avg. Position", `${(d.avgPosition.value ?? 0).toFixed(1)}`, signed(d.avgPosition.delta, ""), "GSC");
    if (kaConnected && d.searchVolume)
      push("Search Volume", `${compactInt(d.searchVolume.value)}/mo`, signed(d.searchVolume.delta), "KA");
    if (kaConnected && d.keywordDifficulty)
      push("Keyword Difficulty", `${intFmt.format(Math.round(d.keywordDifficulty.value ?? 0))}/100`, signed(d.keywordDifficulty.delta), "KA");

    const header = ["Metric", "Value", "Delta", "Source"];
    const csv = [header, ...rows].map((r) => r.map((x) => `"${(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const filename = "query_kpis.csv";
    if (onExport) return onExport({ csv, filename });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function signed(n?: number | null, unit: "" | "pp" = "") {
    if (n == null) return "";
    const s = n >= 0 ? "+" : "";
    if (unit === "pp") return `${s}${Math.abs(n).toFixed(1)} pp`;
    return `${s}${intFmt.format(Math.round(Math.abs(n)))}`;
  }

  if (!mounted) {
    return (
      <section aria-label="Query Performance KPIs" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: kaConnected ? 6 : 4 }).map((_, i) => (
          <div key={i} className="h-[150px] rounded-lg bg-white animate-pulse" style={{ border: `1px solid ${TK.border}` }} />
        ))}
      </section>
    );
  }

  if (loading) {
    return (
      <section aria-label="Query Performance KPIs" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: kaConnected ? 6 : 4 }).map((_, i) => (
          <div key={i} className="h-[150px] rounded-lg bg-white animate-pulse" style={{ border: `1px solid ${TK.border}` }} />
        ))}
      </section>
    );
  }

  return (
    <section
      aria-label="Query Performance KPIs"
      className="w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="rounded-md bg-white p-4" style={{ border: `1px solid ${TK.border}` }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <BrandIcon size={20} />
            <h2 className="text-[20px] font-semibold" style={{ color: TK.text }}>
              {title}
            </h2>
            <button
              className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
              title="Each card shows a breakdown snapshot (left) and trend of the same breakdown (right)."
              aria-label="About this section"
              style={{ cursor: "pointer" }}
            >
              <Info size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Modular chips — GSC breakdown selector (Clicks, CTR) */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              <span className="text-xs" style={{ color: TK.muted }}>
                GSC Breakdown:
              </span>
              {(["device", "country"] as GscBreakdown[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setGscBreakdown(v)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    gscBreakdown === v ? "font-semibold bg-[#F5F7FA]" : ""
                  )}
                  style={{
                    borderColor: TK.border,
                    cursor: "pointer",
                    color: gscBreakdown === v ? TK.text : TK.muted,
                  }}
                >
                  {v === "device" ? "By Device" : "By Country"}
                </button>
              ))}
            </div>

            {/* Share switch */}
            <label
              className="inline-flex items-center gap-2 text-xs"
              style={{ color: TK.muted, cursor: "pointer" }}
              title="Toggle trend to % share"
            >
              <input
                type="checkbox"
                checked={shareMode}
                onChange={(e) => setShareMode(e.target.checked)}
                className="h-4 w-4 rounded border"
                style={{ accentColor: TK.valueBlue, borderColor: TK.border, cursor: "pointer" }}
              />
              Show % share
            </label>

            {/* Export */}
            <button
              className="ml-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 border hover:bg-gray-50"
              aria-label="Export KPIs"
              onClick={exportCsv}
              style={{ borderColor: TK.border, background: TK.panel, color: TK.valueBlue, cursor: "pointer" }}
            >
              <Download size={16} />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* KPI grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1) Clicks — snapshot/trend by gscBreakdown (Bars) */}
          <KpiCard
            title="Clicks"
            source="GSC"
            info={`Snapshot: ${gscBreakdown === "device" ? "Device mix" : "Country mix"}. Trend shows ${
              shareMode ? "share %" : "absolute"
            } by ${gscBreakdown}.`}
            donut={
              <StackedDonut
                parts={donutPartsFrom(clicksRows, clicksKeys, clicksColors)}
                nameMap={clicksNames}
                iconMap={clicksIcons}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.clicks.value ?? 0}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.clicks.delta}
            trend={
              <TrendStack
                rows={clicksRows}
                keys={clicksKeys}
                colors={clicksColors}
                names={clicksNames}
                icons={clicksIcons}
                mode="bars"
                share={shareMode}
              />
            }
          />

          {/* 2) Impressions — snapshot/trend by Country (Area) */}
          <KpiCard
            title="Impressions"
            source="GSC"
            info="Times your URLs appeared in Google Search. Snapshot shows top countries; trend shows country mix."
            donut={
              <StackedDonut
                parts={donutPartsFrom(
                  imprCountryRows,
                  ["us", "in", "gb", "other"],
                  COUNTRY_COLORS
                )}
                nameMap={COUNTRY_NAMES}
                iconMap={COUNTRY_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.impressions.value ?? 0}
            valueFmt={(v) => compactInt(v)}
            delta={d.impressions.delta}
            trend={
              <TrendStack
                rows={imprCountryRows}
                keys={["us", "in", "gb", "other"]}
                colors={COUNTRY_COLORS}
                names={COUNTRY_NAMES}
                icons={COUNTRY_ICONS}
                mode="area"
                share={shareMode}
              />
            }
          />

          {/* 3) CTR — value shown; snapshot/trend mirrors Clicks breakdown (Bars) */}
          <KpiCard
            title="CTR"
            source="GSC"
            info="Click‑through rate. Snapshot mirrors the same breakdown used for Clicks; trend shows the same mix."
            donut={
              <StackedDonut
                parts={donutPartsFrom(clicksRows, clicksKeys, clicksColors)}
                nameMap={clicksNames}
                iconMap={clicksIcons}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.ctrPct.value ?? 0}
            valueFmt={(v) => pctFmt(v, 2)}
            delta={d.ctrPct.delta}
            deltaUnit="pp"
            trend={
              <TrendStack
                rows={clicksRows}
                keys={clicksKeys}
                colors={clicksColors}
                names={clicksNames}
                icons={clicksIcons}
                mode="bars"
                share={shareMode}
              />
            }
            onClick={() => onMetricClick?.("ctr")}
          />

          {/* 4) Avg. Position — snapshot/trend by rank buckets (Bars) */}
          <KpiCard
            title="Avg. Position"
            source="GSC"
            info="Average ranking (lower is better). Snapshot shows impression share by rank buckets; trend shows mix."
            donut={
              <StackedDonut
                parts={donutPartsFrom(positionRows, ["pos_1_3", "pos_4_10", "pos_11p"], POS_COLORS)}
                nameMap={POS_NAMES}
                iconMap={POS_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.avgPosition.value ?? 0}
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
            onClick={() => onMetricClick?.("position")}
          />

          {/* 5) Search Volume (KA) — snapshot/trend by Country (Area) */}
          {kaConnected && d.searchVolume && (
            <KpiCard
              title="Search Volume"
              source="KA"
              info="Estimated monthly volume. Snapshot shows country mix; trend shows recent interest mix."
              donut={
                <StackedDonut
                  parts={donutPartsFrom(
                    searchVolCountryRows,
                    ["us", "in", "gb", "other"],
                    COUNTRY_COLORS
                  )}
                  nameMap={COUNTRY_NAMES}
                  iconMap={COUNTRY_ICONS}
                  valueFmt={(v) => intFmt.format(Math.round(v))}
                />
              }
              value={d.searchVolume.value ?? 0}
              valueFmt={(v) => `${compactInt(v)}/mo`}
              delta={d.searchVolume.delta}
              trend={
                <TrendStack
                  rows={searchVolCountryRows}
                  keys={["us", "in", "gb", "other"]}
                  colors={COUNTRY_COLORS}
                  names={COUNTRY_NAMES}
                  icons={COUNTRY_ICONS}
                  mode="area"
                  share={shareMode}
                />
              }
            />
          )}

          {/* 6) Keyword Difficulty (KA) — snapshot/trend by Easy/Medium/Hard (Area), status colors */}
          {kaConnected && d.keywordDifficulty && (
            <KpiCard
              title="Keyword Difficulty"
              source="KA"
              info="Difficulty profile. Snapshot shows share of Easy/Medium/Hard across competing pages; trend shows mix over time."
              donut={
                <StackedDonut
                  parts={donutPartsFrom(kdMixRows, ["easy", "medium", "hard"], KD_COLORS)}
                  nameMap={KD_NAMES}
                  iconMap={KD_ICONS}
                  valueFmt={(v) => intFmt.format(Math.round(v))}
                />
              }
              value={d.keywordDifficulty.value ?? 0}
              valueFmt={(v) => `${intFmt.format(Math.round(v))} / 100`}
              delta={d.keywordDifficulty.delta}
              trend={
                <TrendStack
                  rows={kdMixRows}
                  keys={["easy", "medium", "hard"]}
                  colors={KD_COLORS}
                  names={KD_NAMES}
                  icons={KD_ICONS}
                  mode="area"
                  share={shareMode}
                />
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------- */
/* Demo wrapper (drop-in preview) */
/* ----------------------------------------------------------------------------- */
export default function DemoQueryPerformanceKpis() {
  return (
    <>
      <QueryPerformanceKpisSection kaConnected />
    </>
  );
}
