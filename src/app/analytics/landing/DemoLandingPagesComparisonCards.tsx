"use client";

/* =============================================================================
   Wranker — Section 3.1
   Page Performance Comparison Cards — Snapshot (Stacked Donut) + Trend
   ---------------------------------------------------------------------------
   - Matches the reference KPI pattern: left donut, center value+delta (2 rows),
     right stacked trend (Area or Bars) using the same breakdown.
   - Smart popovers are PORTALED above all cards (no clipping / z-index issues)
   - Inter / Inter Fallback fonts; branded #008CCD icons in titles/popovers
   - Modular chips + toggle (GA4 + GSC breakdown selectors, Show % share)
   - Preferred primary hue: Blue #0077FF & pastels; status colors for states
   - Recharts only; drop-in TSX with light demo data
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
  Trophy,
  Timer,
  TrendingDown,
  ChevronDown,
  FileDown,
  Share2,
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
  fontStack:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
} as const;

/* -----------------------------------------------------------------------------
 * UTILS / FORMATTERS
 * ---------------------------------------------------------------------------*/
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toDateLabel = (isoOrAny: string) => {
  // If it's an ISO-like date, pretty print; otherwise echo
  const mayBeDate = new Date(isoOrAny);
  if (!Number.isNaN(mayBeDate.valueOf()) && /\d{4}-\d{2}-\d{2}/.test(isoOrAny)) {
    return mayBeDate.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  }
  return String(isoOrAny);
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* -----------------------------------------------------------------------------
 * TYPES
 * ---------------------------------------------------------------------------*/
type SeriesPoint = { t: string; v: number };
type MetricSeries = { current: { date: string; value: number }[]; previous?: { date: string; value: number }[] };

export type LandingPageRow = {
  url: string;
  title?: string;
  ga4: {
    sessions: number;
    sessionsSeries?: MetricSeries;
    avgEngagementTimeSec: number;
    engagementSeries?: MetricSeries; // seconds
    bounceRatePct: number;
    bounceSeries?: MetricSeries; // %
    conversions?: number;
    conversionsSeries?: MetricSeries; // #
  };
  gsc: {
    clicks: number;
    impressions: number;
    ctrPct: number;
    ctrSeries?: MetricSeries; // %
  };
};

/* -----------------------------------------------------------------------------
 * DEMO DATA (lightweight)
 * ---------------------------------------------------------------------------*/
function mkDemoSeries(days = 14, base = 100, jitter = 20): MetricSeries {
  const current = Array.from({ length: days }, (_, i) => ({
    date: `Day ${i + 1}`,
    value: base + Math.round((Math.sin(i * 0.6) + 1) * 0.5 * jitter + (Math.random() - 0.5) * jitter),
  }));
  const previous = Array.from({ length: days }, (_, i) => ({
    date: `Day ${i + 1}`,
    value: base - 10 + Math.round((Math.cos(i * 0.55) + 1) * 0.5 * jitter),
  }));
  return { current, previous };
}

function createDemoPages(): LandingPageRow[] {
  return [
    {
      url: "/seo-services/",
      title: "SEO Services",
      ga4: {
        sessions: 3200,
        sessionsSeries: mkDemoSeries(14, 3000, 160),
        avgEngagementTimeSec: 128,
        engagementSeries: mkDemoSeries(14, 120, 40), // seconds
        bounceRatePct: 41.2,
        bounceSeries: mkDemoSeries(14, 41, 6), // %
        conversions: 56,
        conversionsSeries: mkDemoSeries(14, 52, 12),
      },
      gsc: {
        clicks: 860,
        impressions: 12500,
        ctrPct: 7.1,
        ctrSeries: mkDemoSeries(14, 7.2, 1.4), // %
      },
    },
  ];
}

/* -----------------------------------------------------------------------------
 * HELPERS: Series transforms + deltas + splits
 * ---------------------------------------------------------------------------*/
const nf = (n: number) => intFmt.format(Math.round(n));
const pf = (n: number, d = 1) => `${new Intl.NumberFormat(undefined, { maximumFractionDigits: d }).format(n)}%`;
const tf = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, Math.floor(sec % 60));
  return `${String(m)}m ${String(s).padStart(2, "0")}s`;
};
const last = <T,>(arr: T[]) => (arr.length ? arr[arr.length - 1] : undefined);
function deltaFromSeries(series?: MetricSeries): number | undefined {
  if (!series?.current?.length) return undefined;
  const currLast = last(series.current)?.value;
  const prevLast = last(series.previous || [])?.value;
  if (typeof currLast !== "number") return undefined;
  if (series.previous && typeof prevLast === "number") return currLast - prevLast;
  return undefined;
}

// normalize MetricSeries -> SeriesPoint[] with ISO-like labels (or keep as-is)
function toSeriesPoints(series?: MetricSeries, asCounts = false, percentToCountBase = 1000): SeriesPoint[] {
  if (!series?.current?.length) return [];
  const len = series.current.length;
  const today = new Date();
  return series.current.map((pt, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (len - 1 - i));
    const raw = pt.value;
    const v = asCounts ? Math.max(0, Math.round((raw / 100) * percentToCountBase)) : raw;
    return { t: d.toISOString().slice(0, 10), v };
  });
}

// split a total series into noisy shares that (approximately) sum to the total
type SplitSpec = { key: string; label: string; baseShare: number };
type Row = { t: string } & Record<string, number>;
function splitSeries(total: SeriesPoint[], parts: SplitSpec[], jitter = 0.06): Row[] {
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
    parts.forEach((sp) => (out[sp.key] = Math.max(0, Math.round(p.v * shares[sp.key]))));
    return out as Row;
  });
}

// share transform to 0..100 for stacked 100% charts
function to100(rows: Row[], keys: string[]): Row[] {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
 const out: Row = { t: r.t } as unknown as Row;
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
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
  const highlightName = (parts.length && parts[0].name) || undefined;
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
 * TREND (stacked area/bars)
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
 * CARD SHELL (pattern-aligned)
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
  glyph,
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
  glyph?: React.ReactNode;
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
 * Chips / Export (panel-colored)
 * ---------------------------------------------------------------------------*/
function ChipButton({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("rounded-full border px-2.5 py-1 text-xs", active ? "font-semibold bg-[#F5F7FA]" : "")}
      style={{ borderColor: TOKENS.border, cursor: "pointer", color: active ? TOKENS.text : TOKENS.muted }}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function ExportButton({
  onSelect,
}: {
  onSelect?: (fmt: "PNG" | "CSV" | "PDF" | "Share link") => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 border hover:bg-gray-50"
        style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={16} />
        <span className="text-sm">Export</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[60] mt-1 w-44 rounded-md border bg-white py-1 text-sm shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {(["PNG", "CSV", "PDF", "Share link"] as const).map((opt) => (
            <button
              key={opt}
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                onSelect?.(opt);
                setOpen(false);
              }}
            >
              {opt === "Share link" ? <Share2 size={16} /> : <FileDown size={16} />}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * SECTION — Page Performance Comparison Cards
 * ---------------------------------------------------------------------------*/
type Ga4Breakdown = "device" | "channel";
type GscBreakdown = "device" | "country";

export function LandingPagesComparisonCards({data}) {
  const pages = React.useMemo(
    () => (data && [{
        url: data.url,
        title: data.title,
        ga4: {
          sessions: data.ga4.sessions,
          sessionsSeries: undefined,
          avgEngagementTimeSec: data.ga4.avgEngagementTimeSec,
          engagementSeries: undefined,
          bounceRatePct: data.ga4.bounceRatePct,
          bounceSeries: undefined,
          conversions: 0,
          conversionsSeries: undefined,
        },
        gsc: {
          clicks: data.gsc.clicks,
          impressions: data.gsc.impressions,
          ctrPct: data.gsc.ctrPct,
          ctrSeries: undefined,
        },
      }]),
    [data]
  );
  
  
  const page = pages[0];

  // Controls (chips and toggle)
  const [ga4Breakdown, setGa4Breakdown] = React.useState<Ga4Breakdown>("device");
  const [gscBreakdown, setGscBreakdown] = React.useState<GscBreakdown>("device");
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  // Lookup tables (names, colors, icons)
  const DEVICE: SplitSpec[] = [
    { key: "mobile", label: "Mobile", baseShare: 0.6 },
    { key: "desktop", label: "Desktop", baseShare: 0.32 },
    { key: "tablet", label: "Tablet", baseShare: 0.08 },
  ];
  const DEVICE_COLORS = { mobile: "#5CA8FF", desktop: TOKENS.valueBlue, tablet: "#9FC8FF" };
  const DEVICE_NAMES = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };
  const DEVICE_ICONS: Record<string, React.ReactNode> = {
    mobile: <Smartphone size={14} color={TOKENS.brand} />,
    desktop: <Laptop size={14} color={TOKENS.brand} />,
    tablet: <TabletIcon size={14} color={TOKENS.brand} />,
  };

  const CHANNEL: SplitSpec[] = [
    { key: "organic", label: "Organic", baseShare: 0.54 },
    { key: "direct", label: "Direct", baseShare: 0.26 },
    { key: "referral", label: "Referral", baseShare: 0.12 },
    { key: "paid", label: "Paid", baseShare: 0.08 },
  ];
  const CHANNEL_COLORS = { organic: TOKENS.valueBlue, direct: "#60A5FA", referral: "#22D3EE", paid: "#7C3AED" };
  const CHANNEL_NAMES = { organic: "Organic", direct: "Direct", referral: "Referral", paid: "Paid" };
  const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    organic: <Search size={14} color={TOKENS.brand} />,
    direct: <Users size={14} color={TOKENS.brand} />,
    referral: <MousePointer2 size={14} color={TOKENS.brand} />,
    paid: <Target size={14} color={TOKENS.brand} />,
  };

  const COUNTRY: SplitSpec[] = [
    { key: "us", label: "USA", baseShare: 0.44 },
    { key: "in", label: "India", baseShare: 0.26 },
    { key: "gb", label: "UK", baseShare: 0.14 },
    { key: "other", label: "Other", baseShare: 0.16 },
  ];
  const COUNTRY_COLORS = { us: TOKENS.valueBlue, in: "#00BFA6", gb: "#7E72FF", other: "#9CA3AF" };
  const COUNTRY_NAMES = { us: "United States", in: "India", gb: "United Kingdom", other: "Other" };
  const COUNTRY_ICONS: Record<string, React.ReactNode> = {
    us: <Globe size={14} color={TOKENS.brand} />,
    in: <Globe size={14} color={TOKENS.brand} />,
    gb: <Globe size={14} color={TOKENS.brand} />,
    other: <Globe size={14} color={TOKENS.brand} />,
  };

  const ENG_COLORS = { engaged: TOKENS.success, bounced: TOKENS.danger };
  const ENG_NAMES = { engaged: "Engaged Sessions", bounced: "Bounced Sessions" };
  const ENG_ICONS = {
    engaged: <TrendingUp size={14} color={TOKENS.brand} />,
    bounced: <TrendingUp size={14} color={TOKENS.brand} />,
  };

  const TIME_COLORS = { lt30s: "#9CA3AF", s30_120: TOKENS.valueBlue, gt120s: "#5CA8FF" };
  const TIME_NAMES = { lt30s: "<30s", s30_120: "30–120s", gt120s: "≥120s" };

  const ACTION_COLORS = { lead: "#5CA8FF", signup: TOKENS.valueBlue, purchase: "#7C3AED" };
  const ACTION_NAMES = { lead: "Leads", signup: "Signups", purchase: "Purchases" };
  const ACTION_ICONS = {
    lead: <MousePointer2 size={14} color={TOKENS.brand} />,
    signup: <Users size={14} color={TOKENS.brand} />,
    purchase: <Target size={14} color={TOKENS.brand} />,
  };

  // Build GA4 rows
  const sessionsPts = React.useMemo(() => toSeriesPoints(page.ga4.sessionsSeries), [page.ga4.sessionsSeries]);
  const engagementSecPts = React.useMemo(() => toSeriesPoints(page.ga4.engagementSeries), [page.ga4.engagementSeries]);
  const bouncePctPts = React.useMemo(() => toSeriesPoints(page.ga4.bounceSeries), [page.ga4.bounceSeries]);
  const conversionsPts = React.useMemo(() => toSeriesPoints(page.ga4.conversionsSeries), [page.ga4.conversionsSeries]);

  const ga4Spec = ga4Breakdown === "device" ? DEVICE : CHANNEL;
  const ga4Colors = ga4Breakdown === "device" ? DEVICE_COLORS : CHANNEL_COLORS;
  const ga4Names = ga4Breakdown === "device" ? DEVICE_NAMES : CHANNEL_NAMES;
  const ga4Icons = ga4Breakdown === "device" ? DEVICE_ICONS : CHANNEL_ICONS;

  const sessionsRows = React.useMemo(() => splitSeries(sessionsPts, ga4Spec, 0.06), [sessionsPts, ga4Breakdown]);

  // Bounce split: engaged vs bounced using bounce rate × sessions
  const engagedVsBouncedRows = React.useMemo(() => {
    const rows: Row[] = [];
    for (let i = 0; i < Math.min(sessionsPts.length, bouncePctPts.length); i++) {
      const total = Math.max(0, sessionsPts[i].v || 0);
      const br = clamp01((bouncePctPts[i].v || 0) / 100);
      const bounced = Math.round(total * br);
      const engaged = Math.max(0, total - bounced);
rows.push({ t: sessionsPts[i].t, engaged, bounced } as unknown as Row);

    }
    return rows;
  }, [sessionsPts, bouncePctPts]);

  // Engagement time buckets from seconds + sessions total as weights
  const timeBucketRows = React.useMemo(() => {
    const rows: Row[] = [];
    for (let i = 0; i < Math.min(sessionsPts.length, engagementSecPts.length); i++) {
      const total = Math.max(1, sessionsPts[i].v);
      const sec = engagementSecPts[i].v || 0;
      const lt30 = clamp01(0.25 + (60 - Math.min(60, sec)) / 300);
      const s30_120 = clamp01(0.5 - Math.abs(90 - Math.min(180, sec)) / 400);
      const gt120 = clamp01(1 - (lt30 + s30_120));
      const norm = lt30 + s30_120 + gt120 || 1;
      const A = (lt30 / norm) * total;
      const B = (s30_120 / norm) * total;
      const C = total - Math.round(A) - Math.round(B);
    rows.push({ t: sessionsPts[i].t, lt30s: Math.round(A), s30_120: Math.round(B), gt120s: Math.max(0, C) } as unknown as Row);
    }
    return rows;
  }, [sessionsPts, engagementSecPts]);

  // Conversions split across action types
  const ACTIONS: SplitSpec[] = [
    { key: "lead", label: "Leads", baseShare: 0.48 },
    { key: "signup", label: "Signups", baseShare: 0.34 },
    { key: "purchase", label: "Purchases", baseShare: 0.18 },
  ];
  const conversionsRows = React.useMemo(() => splitSeries(conversionsPts, ACTIONS, 0.07), [conversionsPts]);

  // GSC rows: derive a clicks proxy from CTR% (assuming steady impressions baseline)
  const ctrAsClicksBase = React.useMemo(() => toSeriesPoints(page.gsc.ctrSeries, true, 1200), [page.gsc.ctrSeries]); // ~clicks = CTR% × 1200
  const gscSpec = gscBreakdown === "device" ? DEVICE : COUNTRY;
  const gscColors = gscBreakdown === "device" ? DEVICE_COLORS : COUNTRY_COLORS;
  const gscNames = gscBreakdown === "device" ? DEVICE_NAMES : COUNTRY_NAMES;
  const gscIcons = gscBreakdown === "device" ? DEVICE_ICONS : COUNTRY_ICONS;
  const ctrRows = React.useMemo(() => splitSeries(ctrAsClicksBase, gscSpec, 0.06), [ctrAsClicksBase, gscBreakdown]);

  // Helper to build donut "parts" from last-day row
  function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
    if (!rows.length) return [];
    const r = rows[rows.length - 1];
    return keys
      .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
      .sort((a, b) => b.value - a.value);
  }

  // Values & deltas (center column)
  const sessionsDelta = deltaFromSeries(page.ga4.sessionsSeries);
  const bounceDelta = deltaFromSeries(page.ga4.bounceSeries);
  const engDeltaSec = deltaFromSeries(page.ga4.engagementSeries);
  const convDelta = deltaFromSeries(page.ga4.conversionsSeries);
  const ctrDelta = deltaFromSeries(page.gsc.ctrSeries);

  return (
    <section className="w-full" style={{ fontFamily: TOKENS.fontStack }}>
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: TOKENS.text }}>
          <BrandIcon size={18} />
          Page Performance Comparison
        </h2>

        <div className="flex items-center gap-3">
          {/* GA4 breakdown chip */}
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs" style={{ color: TOKENS.muted }}>
              GA4 Breakdown:
            </span>
            <ChipButton active={ga4Breakdown === "device"} onClick={() => setGa4Breakdown("device")}>
              By Device
            </ChipButton>
            <ChipButton active={ga4Breakdown === "channel"} onClick={() => setGa4Breakdown("channel")}>
              By Channel
            </ChipButton>
          </div>

          {/* GSC breakdown chip */}
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs" style={{ color: TOKENS.muted }}>
              GSC Breakdown:
            </span>
            <ChipButton active={gscBreakdown === "device"} onClick={() => setGscBreakdown("device")}>
              By Device
            </ChipButton>
            <ChipButton active={gscBreakdown === "country"} onClick={() => setGscBreakdown("country")}>
              By Country
            </ChipButton>
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
          <ExportButton
            onSelect={(fmt) => {
              // hook export here
              // eslint-disable-next-line no-console
              console.log("Export:", fmt);
            }}
          />
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1) Top Performer (Sessions) — AREA trend */}
        <KpiCard
          title="Top Performer (Sessions)"
          source="GA4"
          info={page.title}
          glyph={<Trophy size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(sessionsRows, ga4Spec.map((s) => s.key), ga4Colors).map((p) => ({ ...p, name: p.key }))}
              nameMap={ga4Names}
              iconMap={ga4Icons}
              valueFmt={(v) => nf(v)}
            />
          }
          value={page.ga4.sessions}
          valueFmt={(v) => nf(v)}
          delta={sessionsDelta}
          trend={<TrendStack rows={sessionsRows} keys={ga4Spec.map((s) => s.key)} colors={ga4Colors} names={ga4Names} mode="area" share={shareMode} />}
        />

        {/* 2) Top Organic CTR Page — BARS trend (GSC breakdown chip) */}
        <KpiCard
          title="Top Organic CTR Page"
          source="GSC"
          info={page.title}
          glyph={<MousePointer2 size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(ctrRows, gscSpec.map((s) => s.key), gscColors).map((p) => ({ ...p, name: p.key }))}
              nameMap={gscNames}
              iconMap={gscIcons}
              valueFmt={(v) => nf(v)}
            />
          }
          value={page.gsc.ctrPct}
          valueFmt={(v) => pf(v)}
          delta={ctrDelta}
          deltaUnit="%"
          trend={<TrendStack rows={ctrRows} keys={gscSpec.map((s) => s.key)} colors={gscColors} names={gscNames} mode="bars" share={shareMode} />}
        />

        {/* 3) Highest Bounce Rate Page — BARS trend (Engaged vs Bounced) */}
        <KpiCard
          title="Highest Bounce Rate Page"
          source="GA4"
          info={page.title}
          glyph={<TrendingUp size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(engagedVsBouncedRows, ["bounced", "engaged"], ENG_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={ENG_NAMES}
              iconMap={ENG_ICONS}
              valueFmt={(v) => nf(v)}
            />
          }
          value={page.ga4.bounceRatePct}
          valueFmt={(v) => pf(v)}
          delta={bounceDelta}
          deltaUnit="pp"
          invert
          trend={
            <TrendStack
              rows={engagedVsBouncedRows}
              keys={["bounced", "engaged"]}
              colors={{ bounced: ENG_COLORS.bounced, engaged: ENG_COLORS.engaged }}
              names={ENG_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
        />

        {/* 4) Best Engagement Time — AREA trend (time buckets) */}
        <KpiCard
          title="Best Engagement Time"
          source="GA4"
          info={page.title}
          glyph={<Timer size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(timeBucketRows, ["lt30s", "s30_120", "gt120s"], TIME_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={TIME_NAMES}
              iconMap={{
                lt30s: <Info size={14} color={TOKENS.brand} />,
                s30_120: <Info size={14} color={TOKENS.brand} />,
                gt120s: <Info size={14} color={TOKENS.brand} />,
              }}
              valueFmt={(v) => nf(v)}
            />
          }
          value={page.ga4.avgEngagementTimeSec}
          valueFmt={(v) => tf(v)}
          delta={engDeltaSec}
          deltaUnit="s"
          trend={<TrendStack rows={timeBucketRows} keys={["lt30s", "s30_120", "gt120s"]} colors={TIME_COLORS} names={TIME_NAMES} mode="area" share={shareMode} />}
        />

        {/* 5) Top Converting Page — BARS trend (conversion actions) */}
        <KpiCard
          title="Top Converting Page"
          source="GA4"
          info={page.title}
          glyph={<Target size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(conversionsRows, ["lead", "signup", "purchase"], ACTION_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={ACTION_NAMES}
              iconMap={ACTION_ICONS}
              valueFmt={(v) => nf(v)}
            />
          }
          value={page.ga4.conversions ?? 0}
          valueFmt={(v) => nf(v)}
          delta={convDelta}
          trend={<TrendStack rows={conversionsRows} keys={["lead", "signup", "purchase"]} colors={ACTION_COLORS} names={ACTION_NAMES} mode="bars" share={shareMode} />}
        />

        {/* 6) Lowest CTR Page (High Impressions) — BARS trend (alternate GSC mix) */}
        <KpiCard
          title="Lowest CTR Page (High Impressions)"
          source="GSC"
          info={page.title}
          glyph={<TrendingDown size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              // Use the alternate mix to diversify snapshot vs the other CTR card
              parts={
                gscBreakdown === "device"
                  ? lastParts(ctrRows, ["mobile", "desktop", "tablet"], DEVICE_COLORS).map((p) => ({ ...p, name: p.key }))
                  : lastParts(ctrRows, ["us", "in", "gb", "other"], COUNTRY_COLORS).map((p) => ({ ...p, name: p.key }))
              }
              nameMap={gscNames}
              iconMap={gscIcons}
              valueFmt={(v) => nf(v)}
            />
          }
          value={page.gsc.ctrPct}
          valueFmt={(v) => pf(v)}
          delta={ctrDelta}
          deltaUnit="%"
          trend={<TrendStack rows={ctrRows} keys={Object.keys(gscColors)} colors={gscColors} names={gscNames} mode="bars" share={shareMode} />}
        />
      </div>
    </section>
  );
}

