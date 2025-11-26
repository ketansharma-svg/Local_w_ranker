"use client";

/* =============================================================================
   Wranker — Section 1
   Conversion Summary KPIs — Snapshot (Stacked Donut) + Trend (Area/Bars)
   ---------------------------------------------------------------------------
   - Follows the reference KPI pattern used in Analytics Summary
   - Left: Stacked donut snapshot with branded-icon smart popover (PORTALED)
   - Middle: Metric value + delta (single column, 2 rows)
   - Right: Stacked trend (Area or Bars) using the SAME breakdown as the donut
   - Inter / Inter Fallback fonts; #008CCD icons; primary hue #0077FF
   - Modular chips: Breakdown (for conversions) + Trend mode; Show % share toggle
   - Pointer cursor on interactive elements
   - Export button uses panel color (no filled background inside the panel)
   - Recharts only; ready-to-drop-in TSX
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
  Users,
  MousePointer2,
  Target,
  Share2,
  Mail,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* ----------------------------------------------------------------------------- */
/* TOKENS */
/* ----------------------------------------------------------------------------- */
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

/* ----------------------------------------------------------------------------- */
/* UTILS / FORMATTERS */
/* ----------------------------------------------------------------------------- */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toDateLabel = (isoOrAny: string) => {
  const d = new Date(isoOrAny);
  if (!Number.isNaN(d.valueOf()) && /^\d{4}-\d{2}-\d{2}/.test(isoOrAny)) {
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  }
  return String(isoOrAny);
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* ----------------------------------------------------------------------------- */
/* TYPES */
/* ----------------------------------------------------------------------------- */
export type SeriesPoint = { date: string; value: number };

type Metric = {
  value: number;
  delta?: number; // absolute (same unit as value)
  series?: SeriesPoint[];
};

export type ConversionKpis = {
  // Core
  totalConversions: Metric; // #
  conversionRate: { value: number; deltaPctPt?: number; series?: SeriesPoint[] }; // % value; delta in pp
  avgTimeToConvert?: { valueSec?: number; deltaSec?: number; series?: SeriesPoint[]; supported: boolean }; // seconds
  // Optional (not rendered here, but allowed in data type)
  bounceRate?: { value: number; deltaPctPt?: number; series?: SeriesPoint[] };
  // Splits
  sources: Array<{ name: string; conversions: number }>;
  pages: Array<{ url: string; title?: string; conversions: number }>;
  // Total conversions trend (acts as baseline for splitSeries)
  trendSeries?: SeriesPoint[]; // optional; if omitted, derived from totalConversions.series
};

/* ----------------------------------------------------------------------------- */
/* DEMO DATA (deterministic enough for stable visuals) */
/* ----------------------------------------------------------------------------- */
function createDemoSeries(days = 14, base = 320, amp = 80, rnd = 18): SeriesPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toISOString().slice(0, 10),
      value: Math.max(0, Math.round(base + Math.sin(i / 2) * amp + (Math.random() - 0.5) * rnd)),
    };
  });
}

export function createDemoConversionKpis(days: 7 | 14 | 30 = 14): ConversionKpis {
  const conv = createDemoSeries(days, 360, 120, 40);
  const rate = createDemoSeries(days, 3.8, 0.6, 0.2).map((p) => ({ ...p, value: Math.max(0, +p.value.toFixed(2)) }));
  const ttc = createDemoSeries(days, 145, 28, 16); // seconds

  const sources = [
    { name: "google / organic", conversions: 384 },
    { name: "direct / (none)", conversions: 211 },
    { name: "facebook / referral", conversions: 96 },
    { name: "bing / organic", conversions: 44 },
    { name: "linkedin / referral", conversions: 32 },
    { name: "google / cpc", conversions: 28 },
    { name: "newsletter / email", conversions: 14 },
    { name: "twitter / referral", conversions: 18 },
    { name: "partner / referral", conversions: 10 },
    { name: "youtube / referral", conversions: 8 },
    { name: "instagram / referral", conversions: 6 },
    { name: "other / misc", conversions: 12 },
  ];
  const pages = [
    { url: "/pricing", title: "Pricing", conversions: 74 },
    { url: "/contact", title: "Contact", conversions: 58 },
    { url: "/signup", title: "Signup", conversions: 52 },
    { url: "/features/optimizer", title: "Features: Optimizer", conversions: 37 },
    { url: "/solutions/seo", title: "Solutions: SEO", conversions: 28 },
    { url: "/blog/seo-checklist-2025", title: "Blog: SEO Checklist 2025", conversions: 18 },
    { url: "/demo", title: "Book a Demo", conversions: 16 },
  ];

  const total = sources.reduce((s, x) => s + x.conversions, 0);
  return {
    totalConversions: {
      value: total,
      delta: Math.round((conv.at(-1)!.value - conv.at(-2)!.value) * 0.6),
      series: conv,
    },
    conversionRate: {
      value: +rate.at(-1)!.value.toFixed(2),
      deltaPctPt: +(rate.at(-1)!.value - rate.at(-2)!.value).toFixed(2),
      series: rate,
    },
    avgTimeToConvert: {
      supported: true,
      valueSec: ttc.at(-1)!.value,
      deltaSec: ttc.at(-1)!.value - ttc.at(-2)!.value,
      series: ttc,
    },
    sources,
    pages,
    trendSeries: conv,
  };
}

/* ----------------------------------------------------------------------------- */
/* SHARED HELPERS (splits, transforms) */
/* ----------------------------------------------------------------------------- */
type Row = { t: string } & Record<string, number>;
type SplitSpec = { key: string; label: string; baseShare: number };

function toPoints(series?: SeriesPoint[]) {
  return (series ?? []).map((p) => ({ t: p.date, v: p.value }));
}
function to100(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
   const out: Record<string, number | string> = { t: r.t };
keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));

    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
}

function splitSeries(total: { t: string; v: number }[], parts: SplitSpec[], jitter = 0.06): Row[] {
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

function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* ----------------------------------------------------------------------------- */
/* BRAND ICON */
/* ----------------------------------------------------------------------------- */
function BrandIcon({ size = 18 }: { size?: number }) {
  return <BarChart3 size={size} color={TOKENS.brand} />;
}

/* ----------------------------------------------------------------------------- */
/* DELTA BADGE */
/* ----------------------------------------------------------------------------- */
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
      : intFmt.format(Math.round(Math.abs(delta)));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <ColorIcon size={14} />
      {label}
    </span>
  );
}

/* ----------------------------------------------------------------------------- */
/* PORTALED TOOLTIP SHELL (over everything; no clipping) */
/* ----------------------------------------------------------------------------- */
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

/* ----------------------------------------------------------------------------- */
/* SNAPSHOT DONUT */
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
/* TREND STACK (area or bars) */
/* ----------------------------------------------------------------------------- */
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

/* ----------------------------------------------------------------------------- */
/* CARD SHELL */
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
  glyph,
}: {
  title: string;
  source: "GA4";
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "s";
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
            GA4
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

/* ----------------------------------------------------------------------------- */
/* SECTION — Conversion Summary KPIs (Snapshot + Trend) */
/* ----------------------------------------------------------------------------- */
type ConvBreakdown = "channel" | "device"; // header chip controlling Total Conversions card
type TrendMode = "area" | "bars";

export function ConversionSummaryKpisSection({ data }: { data?: Partial<ConversionKpis> }) {
  // Merge with demo so visuals always render
  const base = React.useMemo(() => createDemoConversionKpis(14), []);
  const d: ConversionKpis = {
    totalConversions: { ...base.totalConversions, ...(data?.totalConversions || {}) },
    conversionRate: { ...base.conversionRate, ...(data?.conversionRate || {}) },
   avgTimeToConvert: {
  ...base.avgTimeToConvert,
  ...(data?.avgTimeToConvert || {}),
  supported: data?.avgTimeToConvert?.supported ?? true, // or base.avgTimeToConvert.supported
},

    // bounceRate allowed in type but not used in UI
    bounceRate: data?.bounceRate ?? base.bounceRate,
    sources: data?.sources ?? base.sources,
    pages: data?.pages ?? base.pages,
    trendSeries: data?.trendSeries ?? base.trendSeries,
  };

  // Header controls
  const [convBreakdown, setConvBreakdown] = React.useState<ConvBreakdown>("channel");
  const [trendMode, setTrendMode] = React.useState<TrendMode>("area");
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  /* ---- Breakdowns & icons ---- */
  // Device
  const DEVICE: SplitSpec[] = [
    { key: "mobile", label: "Mobile", baseShare: 0.58 },
    { key: "desktop", label: "Desktop", baseShare: 0.34 },
    { key: "tablet", label: "Tablet", baseShare: 0.08 },
  ];
  const DEVICE_COLORS: Record<string, string> = { mobile: "#5CA8FF", desktop: TOKENS.valueBlue, tablet: "#9FC8FF" };
  const DEVICE_NAMES = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };
  const DEVICE_ICONS: Record<string, React.ReactNode> = {
    mobile: <Smartphone size={14} color={TOKENS.brand} />,
    desktop: <Laptop size={14} color={TOKENS.brand} />,
    tablet: <TabletIcon size={14} color={TOKENS.brand} />,
  };

  // Channel group (derived from sources)
  function channelGroupOf(name: string): keyof typeof CHANNEL_COLORS {
    const n = name.toLowerCase();
    if (n.includes("/ organic")) return "organic";
    if (n.includes("/ cpc") || n.includes("/ ppc") || n.includes("ads")) return "paid";
    if (n.includes("/ referral") && (n.includes("facebook") || n.includes("linkedin") || n.includes("twitter") || n.includes("instagram") || n.includes("youtube")))
      return "social";
    if (n.includes("email")) return "email";
    if (n.startsWith("direct")) return "direct";
    if (n.includes("/ referral")) return "referral";
    return "other";
  }
  const CHANNEL_COLORS = {
    organic: TOKENS.valueBlue,
    direct: "#60A5FA",
    referral: "#22D3EE",
    paid: "#7C3AED",
    email: "#F59E0B",
    social: "#EC4899",
    other: "#9CA3AF",
  } as const;
  const CHANNEL_NAMES: Record<string, string> = {
    organic: "Organic",
    direct: "Direct",
    referral: "Referral",
    paid: "Paid",
    email: "Email",
    social: "Social",
    other: "Other",
  };
  const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    organic: <Search size={14} color={TOKENS.brand} />,
    direct: <Users size={14} color={TOKENS.brand} />,
    referral: <MousePointer2 size={14} color={TOKENS.brand} />,
    paid: <Target size={14} color={TOKENS.brand} />,
    email: <Mail size={14} color={TOKENS.brand} />,
    social: <Share2 size={14} color={TOKENS.brand} />,
    other: <Info size={14} color={TOKENS.brand} />,
  };

  // Build channel SplitSpec from current source totals
  const channelTotals: Record<keyof typeof CHANNEL_COLORS, number> = {
    organic: 0,
    direct: 0,
    referral: 0,
    paid: 0,
    email: 0,
    social: 0,
    other: 0,
  };
  d.sources.forEach((s) => (channelTotals[channelGroupOf(s.name)] += s.conversions));
  const channelSum = Object.values(channelTotals).reduce((s, x) => s + x, 0) || 1;
  const CHANNEL_SPEC: SplitSpec[] = (Object.keys(CHANNEL_COLORS) as Array<keyof typeof CHANNEL_COLORS>).map((k) => ({
    key: k,
    label: CHANNEL_NAMES[k],
    baseShare: channelTotals[k] / channelSum,
  }));

  // Pages (top 5 + Other)
  const pagesSorted = [...d.pages].sort((a, b) => b.conversions - a.conversions);
  const TOP_N = 5;
  const pageKeys = pagesSorted.slice(0, TOP_N).map((p) => p.title?.trim() || p.url);
  const otherTotal = pagesSorted.slice(TOP_N).reduce((s, p) => s + p.conversions, 0);
  if (otherTotal > 0) pageKeys.push("Other");
  const PAGE_COLORS: Record<string, string> = Object.fromEntries(
    pageKeys.map((k, i) => [k, [TOKENS.valueBlue, "#5CA8FF", "#60A5FA", "#22D3EE", "#7C3AED", "#9CA3AF"][i % 6]])
  );
  const PAGE_NAMES: Record<string, string> = Object.fromEntries(pageKeys.map((k) => [k, k]));
  const PAGE_ICONS: Record<string, React.ReactNode> = Object.fromEntries(pageKeys.map((k) => [k, <BarChart3 key={k} size={14} color={TOKENS.brand} />]));

  // Build rows for each KPI --------------------------------------------
  const conversionsPts = toPoints(d.totalConversions.series ?? d.trendSeries);
  const ratePts = toPoints(d.conversionRate.series);
  const ttcPts = toPoints(d.avgTimeToConvert?.series);

  // Total Conversions: by channel or device (header chip drives this)
  const convSpec = convBreakdown === "channel" ? CHANNEL_SPEC : DEVICE;
  const convColors = convBreakdown === "channel" ? (CHANNEL_COLORS as Record<string, string>) : DEVICE_COLORS;
  const convNames = convBreakdown === "channel" ? CHANNEL_NAMES : DEVICE_NAMES;
  const convIcons = convBreakdown === "channel" ? CHANNEL_ICONS : DEVICE_ICONS;
  const conversionsRows = React.useMemo(() => splitSeries(conversionsPts, convSpec, 0.06), [conversionsPts, convBreakdown]);

  // Conversion Rate: show device mix (100% share works best)
  const rateDeviceRows = React.useMemo(() => splitSeries(ratePts, DEVICE, 0.05), [ratePts]);

  // Avg Time to Convert: buckets derived from sec + conversions baseline
  const ttcBucketRows = React.useMemo(() => {
    const rows: Row[] = [];
    for (let i = 0; i < Math.min(ttcPts.length, conversionsPts.length); i++) {
      const total = Math.max(1, conversionsPts[i].v);
      const sec = ttcPts[i].v || 0;
      const lt30 = clamp01(0.22 + (60 - Math.min(60, sec)) / 280);
      const s30_120 = clamp01(0.5 - Math.abs(90 - Math.min(180, sec)) / 380);
      const gt120 = clamp01(1 - (lt30 + s30_120));
      const norm = lt30 + s30_120 + gt120 || 1;
      const A = (lt30 / norm) * total;
      const B = (s30_120 / norm) * total;
      const C = total - Math.round(A) - Math.round(B);
      type Row = {
  t: string;
  [key: string]: number | string;
};

      // rows.push({ t: conversionsPts[i].t, lt30s: Math.round(A), s30_120: Math.round(B), gt120s: Math.max(0, C) });
    }
    return rows;
  }, [ttcPts, conversionsPts]);
  const TTC_COLORS = { lt30s: "#9CA3AF", s30_120: TOKENS.valueBlue, gt120s: "#5CA8FF" };
  const TTC_NAMES = { lt30s: "<30s", s30_120: "30–120s", gt120s: "≥120s" };

  // Pages: trend split (top N + Other) using conversions baseline
  const pageSpec: SplitSpec[] = pageKeys.map((k) => {
    const baseVal =
      k === "Other"
        ? pagesSorted.slice(TOP_N).reduce((s, p) => s + p.conversions, 0)
        : pagesSorted.find((p) => (p.title?.trim() || p.url) === k)?.conversions || 0;
    return { key: k, label: k, baseShare: baseVal / Math.max(1, d.totalConversions.value) };
  });
  const pagesRows = React.useMemo(() => splitSeries(conversionsPts, pageSpec, 0.06), [conversionsPts]);

  /* ---- UI Handlers ---- */
  const handleExport = () => {
    alert("Export Conversion Summary KPIs");
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
              Conversion Summary KPIs
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
            {/* Breakdown chip (for Total Conversions) */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              <span className="text-xs" style={{ color: TOKENS.muted }}>
                Conversions by:
              </span>
              {(["channel", "device"] as ConvBreakdown[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setConvBreakdown(v)}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", convBreakdown === v ? "font-semibold bg-[#F5F7FA]" : "")}
                  style={{ borderColor: TOKENS.border, cursor: "pointer", color: convBreakdown === v ? TOKENS.text : TOKENS.muted }}
                >
                  {v === "channel" ? "Channel" : "Device"}
                </button>
              ))}
            </div>

            {/* Trend mode chip */}
            <div className="hidden md:flex items-center gap-1 mr-2">
              <span className="text-xs" style={{ color: TOKENS.muted }}>
                Trend:
              </span>
              {(["area", "bars"] as TrendMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setTrendMode(m)}
                  className={cn("rounded-full border px-2.5 py-1 text-xs", trendMode === m ? "font-semibold bg-[#F5F7FA]" : "")}
                  style={{ borderColor: TOKENS.border, cursor: "pointer", color: trendMode === m ? TOKENS.text : TOKENS.muted }}
                >
                  {m === "area" ? "Area" : "Bars"}
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
              aria-label="Export Conversion Summary KPIs"
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
          {/* 1) Total Conversions (Trend: mode from header) */}
          <KpiCard
            title="Total Conversions"
            source="GA4"
            info={`Snapshot: ${convBreakdown === "channel" ? "Channel group" : "Device"} mix. Trend shows ${shareMode ? "share %" : "absolute"} by ${convBreakdown}.`}
            glyph={<BarChart3 size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(conversionsRows, convSpec.map((s) => s.key), convColors).map((p) => ({ ...p, name: p.key }))}
                nameMap={convNames}
                iconMap={convIcons}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.totalConversions.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.totalConversions.delta}
            trend={<TrendStack rows={conversionsRows} keys={convSpec.map((s) => s.key)} colors={convColors} names={convNames} mode={trendMode} share={shareMode} />}
          />

          {/* 2) Conversion Rate (Trend: BARS; Device mix) */}
          <KpiCard
            title="Conversion Rate"
            source="GA4"
            info="Conversion rate by device. Trend shows device mix; share mode recommended."
            glyph={<Target size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(rateDeviceRows, ["mobile", "desktop", "tablet"], DEVICE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={DEVICE_NAMES}
                iconMap={DEVICE_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.conversionRate.value}
            valueFmt={(v) => pctFmt(v, 1)}
            delta={d.conversionRate.deltaPctPt}
            deltaUnit="pp"
            trend={<TrendStack rows={rateDeviceRows} keys={["mobile", "desktop", "tablet"]} colors={DEVICE_COLORS} names={DEVICE_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 3) Avg. Time to Convert — AREA (Time buckets) */}
          <KpiCard
            title="Avg. Time to Convert"
            source="GA4"
            info="Time from session start to first conversion. Snapshot shows time buckets."
            glyph={<Timer size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(ttcBucketRows, ["lt30s", "s30_120", "gt120s"], TTC_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={TTC_NAMES}
                iconMap={{ lt30s: <Timer size={14} color={TOKENS.brand} />, s30_120: <Timer size={14} color={TOKENS.brand} />, gt120s: <Timer size={14} color={TOKENS.brand} /> }}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.avgTimeToConvert?.valueSec ?? 0}
            valueFmt={(v) => {
              const m = Math.floor(v / 60);
              const s = Math.max(0, Math.floor(v % 60));
              return `${String(m)}m ${String(s).padStart(2, "0")}s`;
            }}
            delta={d.avgTimeToConvert?.deltaSec}
            deltaUnit="s"
            trend={<TrendStack rows={ttcBucketRows} keys={["lt30s", "s30_120", "gt120s"]} colors={TTC_COLORS} names={TTC_NAMES} mode="area" share={shareMode} />}
          />

          {/* 4) Conversions by Top Pages — BARS (Top 5 + Other) */}
          <KpiCard
            title="Conversions by Top Pages"
            source="GA4"
            info="Top pages share of conversions (Top 5 + Other)."
            glyph={<BarChart3 size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(pagesRows, pageKeys, PAGE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={PAGE_NAMES}
                iconMap={PAGE_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.totalConversions.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.totalConversions.delta}
            trend={<TrendStack rows={pagesRows} keys={pageKeys} colors={PAGE_COLORS} names={PAGE_NAMES} mode="bars" share={shareMode} />}
          />

          {/* 5) Conversions by Channel Groups — BARS (deeper than device) */}
          <KpiCard
            title="Conversions by Channel Group"
            source="GA4"
            info="Channel groups share of conversions over time."
            glyph={<Search size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(conversionsRows, (Object.keys(CHANNEL_COLORS) as string[]), CHANNEL_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={CHANNEL_NAMES}
                iconMap={CHANNEL_ICONS}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={d.totalConversions.value}
            valueFmt={(v) => intFmt.format(Math.round(v))}
            delta={d.totalConversions.delta}
            trend={<TrendStack rows={conversionsRows} keys={Object.keys(CHANNEL_COLORS)} colors={CHANNEL_COLORS} names={CHANNEL_NAMES} mode="bars" share={shareMode} />}
          />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------- */
/* Demo wrapper (drop-in preview) */
/* ----------------------------------------------------------------------------- */
export default function DemoConversionSummaryKpis() {
  return (
    <div className="w-full p-4" style={{ background: TOKENS.app }}>
      <ConversionSummaryKpisSection />
    </div>
  );
}

