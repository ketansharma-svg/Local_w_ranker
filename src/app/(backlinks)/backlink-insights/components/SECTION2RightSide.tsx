"use client";

/**
 * Backlinks Insights — SECTION 2 (Right Side) KPI Summary
 * Redesigned: stacked donut + stacked trend w/ smart portaled popovers.
 * - Inter / Inter Fallback fonts; no emoji
 * - Branded #008CCD icons for section + card titles
 * - Pointer cursor for interactive elements (cards, chips, buttons)
 * - Modern chips (share toggle) + Export button in header
 * - Meaningful breakdowns per KPI (see card build below)
 */

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
  FileDown,
  BarChart3,
  Link as LinkIcon,
  AlertTriangle,
  Shield,
  Quote,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import BacklinkHealthSummary from "./BacklinkHealthSummary";

/* -----------------------------------------------------------------------------
 * TOKENS / THEME
 * ---------------------------------------------------------------------------*/
const TOKENS = {
  brand: "#008CCD", // branded icons
  valueBlue: "#0077FF", // primary metric color
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  app: "#F5F7FA",
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* -----------------------------------------------------------------------------
 * INPUT TYPES (compatible with your existing Section2RightKpiCards props)
 * ---------------------------------------------------------------------------*/
type KpiKey =
  | "totalBacklinks"
  | "lost30d"
  | "toxicLinks"
  | "avgAqs"
  | "competitorGap";

type SeriesPoint = { date: string; value: number };

type KpiInput = {
  value: number;
  trend?: number;
  series?: Array<
    number | { x: number | string | Date; y: number; label?: string }
  >;
  subtext?: string;
};

type KPIData = Partial<Record<KpiKey, KpiInput>>;

type Props = {
  data?: KPIData;
  onNavigate?: (target: { key: KpiKey; route: string; title: string }) => void;
  onCompare?: () => void;
  hasCompetitor?: boolean;
  onExport?: () => void;
  className?: string;
};

/* -----------------------------------------------------------------------------
 * SAFE FALLBACK SERIES (ISO dates to keep tooltips consistent)
 * ---------------------------------------------------------------------------*/
const DAYS = 14;
const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
function mkSeries(len = DAYS, start = 100, amp = 0.12) {
  const startISO = addDays(todayISO(), -(len - 1));
  return Array.from({ length: len }, (_, i) => {
    const iso = addDays(startISO, i);
    const w = 1 + Math.sin(i * 0.5) * amp + (Math.random() - 0.5) * 0.12;
    return { date: iso, value: Math.max(0, Math.round(start * w)) };
  });
}

/* -----------------------------------------------------------------------------
 * INPUT ADAPTER — Accepts number[] | {x,y}[] and yields SeriesPoint[]
 * ---------------------------------------------------------------------------*/
function toSeries(points?: KpiInput["series"], fallback?: SeriesPoint[]): SeriesPoint[] {
  if (points && points.length) {
    return points.map((p, i) => {
      if (typeof p === "number") {
        const base = addDays(todayISO(), -(points.length - 1));
        return { date: addDays(base, i), value: p };
      }
      // p is {x, y}
      const x = (p as any).x;
      // try to parse as date
      if (typeof x === "string" && !Number.isNaN(Date.parse(x))) {
        return { date: new Date(x).toISOString().slice(0, 10), value: (p as any).y ?? 0 };
      }
      if (typeof x === "number") {
        // epoch seconds or ms?
        const t = x > 1e12 ? x : x > 1e9 ? x * 1000 : Date.now() + i * 86400000;
        return { date: new Date(t).toISOString().slice(0, 10), value: (p as any).y ?? 0 };
      }
      return { date: addDays(todayISO(), i), value: (p as any).y ?? 0 };
    });
  }
  return fallback ?? mkSeries();
}
const deltaFrom = (s?: SeriesPoint[]) =>
  !s || s.length < 2 ? undefined : (s[s.length - 1].value - s[s.length - 2].value);

/* -----------------------------------------------------------------------------
 * SPLIT HELPERS — build stacked rows for donut + trend
 * ---------------------------------------------------------------------------*/
type Row = { t: string } & Record<string, any>;
type SplitSpec = { key: string; label: string; baseShare: number };

function splitSeries(total: SeriesPoint[] | undefined, parts: SplitSpec[], jitter = 0.06): Row[] {
  const src = total ?? [];
  const rows: Row[] = [];
  for (let i = 0; i < src.length; i++) {
    const totalV = Math.max(0, src[i].value || 0);
    let rem = 1;
    const shares: Record<string, number> = {};
    parts.forEach((sp, idx) => {
      const wiggle = clamp01(sp.baseShare * (1 + Math.sin((i + 1) * (idx + 2) * 0.27) * jitter));
      const val = idx === parts.length - 1 ? rem : Math.min(rem, wiggle);
      rem -= val;
      shares[sp.key] = val;
    });
    const sum = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
    Object.keys(shares).forEach((k) => (shares[k] = shares[k] / sum));
    const out: Row = { t: src[i].date };
    parts.forEach((sp) => (out[sp.key] = Math.max(0, Math.round(totalV * shares[sp.key]))));
    rows.push(out);
  }
  return rows;
}

const toShare = (rows: Row[], keys: string[]) =>
  rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });

function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* Competitor overlap from your total + gap (gap = your - competitor) */
function competitorOverlapRows(your: SeriesPoint[] = [], gap: SeriesPoint[] = []): Row[] {
  const n = Math.min(your.length, gap.length);
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    const y = Math.max(0, your[i].value || 0);
    const g = gap[i].value || 0; // can be negative
    const comp = Math.max(0, y - g); // comp = your - gap
    const shared = Math.round(Math.min(y, comp) * 0.6); // assume 60% overlap
    const youOnly = Math.max(0, y - shared);
    const compOnly = Math.max(0, comp - shared);
    rows.push({ t: your[i].date, comp_only: compOnly, shared, you_only: youOnly } as unknown as Row);
  }
  return rows.length ? rows : [];
}

/* -----------------------------------------------------------------------------
 * PORTALED TOOLTIP SHELL (smart popovers)
 * ---------------------------------------------------------------------------*/
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
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none", isolation: "isolate" }}>
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{ backgroundColor: "#fff", border: `1px solid ${TOKENS.border}`, color: TOKENS.text, borderRadius: 6 }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

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
            <div
              key={i}
              className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                {iconMap?.[p.name]}
                <span className={cn(isActive ? "font-semibold" : "")} style={{ color: TOKENS.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={cn("font-semibold", isActive && "text-[color:var(--focus,#0077FF)]")}>
                {fmt(Number(p.value))}
              </div>
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
  icons,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  mode: "area" | "bars";
  share: boolean;
  icons?: Record<string, React.ReactNode>;
}) {
  const data = share ? toShare(rows, keys) : rows;
  const asShare = share;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v)));

  return (
    <div ref={ref} className="h-16" role="img" aria-label="KPI trend">
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

/* -----------------------------------------------------------------------------
 * DELTA BADGE (Up/Down/Flat)
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
        <Minus size={14} />
        —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
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
      <Icon size={14} />
      {label}
    </span>
  );
}

/* -----------------------------------------------------------------------------
 * CARD SHELL
 * ---------------------------------------------------------------------------*/
function BrandGlyph({ icon, size = 16 }: { icon?: React.ReactNode; size?: number }) {
  return icon ? <span>{icon}</span> : <BarChart3 size={size} color={TOKENS.brand} />;
}

function KpiCard({
  title,
  info,
  glyph,
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
  info?: string;
  glyph?: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "s" | "pt";
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
            <BrandGlyph icon={glyph} />
            <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </div>
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info}>
              <Info size={14} />
            </span>
          </div>
        </div>

        {/* Content row: donut | value/delta | trend */}
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
 * SECTION — Redesigned Right KPI Summary (Backlinks)
 * ---------------------------------------------------------------------------*/
export default function Section2RightKpiCards({
  data,
  onNavigate,
  onCompare,
  hasCompetitor,
  onExport,
  className,
}: Props) {
  // base/fallback series (so tooltips show real dates)
  const tbSP = toSeries(data?.totalBacklinks?.series, mkSeries(14, 2400, 0.18));
  const lostSP = toSeries(data?.lost30d?.series, mkSeries(14, 180, 0.22));
  const toxSP = toSeries(data?.toxicLinks?.series, mkSeries(14, 42, 0.18));
  const aqsSP = toSeries(data?.avgAqs?.series, mkSeries(14, 62, 0.04));
  const gapSP = toSeries(data?.competitorGap?.series, mkSeries(14, -120, 0.1));

  // values
  const totalBacklinks = data?.totalBacklinks?.value ?? (tbSP.at(-1)?.value ?? 0);
  const lost30d = data?.lost30d?.value ?? (lostSP.at(-1)?.value ?? 0);
  const toxicLinks = data?.toxicLinks?.value ?? (toxSP.at(-1)?.value ?? 0);
  const avgAqs = data?.avgAqs?.value ?? (aqsSP.at(-1)?.value ?? 0);
  const competitorGap = data?.competitorGap?.value ?? (gapSP.at(-1)?.value ?? 0);

  // deltas
  const dTB = deltaFrom(tbSP);
  const dLost = deltaFrom(lostSP);
  const dTox = deltaFrom(toxSP);
  const dAQS = deltaFrom(aqsSP);
  const dGap = deltaFrom(gapSP);

  // breakdown specs + color maps
  // 1) Link attributes (Total Backlinks)
  const ATTR: SplitSpec[] = [
    { key: "follow", label: "Dofollow", baseShare: 0.58 },
    { key: "nofollow", label: "Nofollow", baseShare: 0.28 },
    { key: "ugc", label: "UGC", baseShare: 0.08 },
    { key: "sponsored", label: "Sponsored", baseShare: 0.06 },
  ];
  const ATTR_COLORS: Record<string, string> = {
    follow: TOKENS.valueBlue,
    nofollow: TOKENS.gray,
    ugc: "#22D3EE",
    sponsored: "#7C3AED",
  };
  const ATTR_NAMES = { follow: "Dofollow", nofollow: "Nofollow", ugc: "UGC", sponsored: "Sponsored" };

  // 2) Loss reasons (Lost 30d)
  const LOSS: SplitSpec[] = [
    { key: "removed_404", label: "404 / Removed", baseShare: 0.42 },
    { key: "redirected", label: "Redirected", baseShare: 0.26 },
    { key: "noindex_blocked", label: "Noindex / Blocked", baseShare: 0.18 },
    { key: "other_loss", label: "Other", baseShare: 0.14 },
  ];
  const LOSS_COLORS: Record<string, string> = {
    removed_404: TOKENS.danger,
    redirected: TOKENS.warn,
    noindex_blocked: "#60A5FA",
    other_loss: TOKENS.gray,
  };
  const LOSS_NAMES = {
    removed_404: "404 / Removed",
    redirected: "Redirected",
    noindex_blocked: "Noindex / Blocked",
    other_loss: "Other",
  };

  // 3) Toxic severity
  const SEV: SplitSpec[] = [
    { key: "sev_critical", label: "Critical", baseShare: 0.18 },
    { key: "sev_high", label: "High", baseShare: 0.34 },
    { key: "sev_medium", label: "Medium", baseShare: 0.32 },
    { key: "sev_low", label: "Low", baseShare: 0.16 },
  ];
  const SEV_COLORS: Record<string, string> = {
    sev_critical: TOKENS.danger,
    sev_high: TOKENS.warn,
    sev_medium: "#60A5FA",
    sev_low: TOKENS.gray,
  };
  const SEV_NAMES = { sev_critical: "Critical", sev_high: "High", sev_medium: "Medium", sev_low: "Low" };

  // 4) Anchor types (AQS)
  const ANCH: SplitSpec[] = [
    { key: "exact", label: "Exact‑match", baseShare: 0.26 },
    { key: "partial", label: "Partial‑match", baseShare: 0.34 },
    { key: "branded", label: "Branded", baseShare: 0.24 },
    { key: "generic", label: "Generic", baseShare: 0.16 },
  ];
  const ANCH_COLORS: Record<string, string> = {
    exact: TOKENS.valueBlue,
    partial: "#5CA8FF",
    branded: TOKENS.success,
    generic: TOKENS.gray,
  };
  const ANCH_NAMES = { exact: "Exact‑match", partial: "Partial‑match", branded: "Branded", generic: "Generic" };

  // 5) Competitor overlap (Gap)
  const GAP_COLORS: Record<string, string> = { comp_only: "#8B5CF6", shared: TOKENS.gray, you_only: TOKENS.valueBlue };
  const GAP_NAMES = { comp_only: "Competitor‑only", shared: "Shared", you_only: "You‑only" };

  // build stacked rows (snapshot + trend use the same breakdown)
  const attrRows = React.useMemo(() => splitSeries(tbSP, ATTR, 0.05), [tbSP]);
  const lossRows = React.useMemo(() => splitSeries(lostSP, LOSS, 0.06), [lostSP]);
  const sevRows = React.useMemo(() => splitSeries(toxSP, SEV, 0.06), [toxSP]);
  const anchRows = React.useMemo(
    () => splitSeries(tbSP.length ? tbSP : aqsSP.map((p) => ({ date: p.date, value: 1 })), ANCH, 0.05),
    [tbSP, aqsSP]
  );
  const gapRows = React.useMemo(() => competitorOverlapRows(tbSP, gapSP), [tbSP, gapSP]);

  // trend share toggle
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  // icons per card (branded)
  const iconLink = <LinkIcon size={16} color={TOKENS.brand} />;
  const iconLost = <AlertTriangle size={16} color={TOKENS.brand} />;
  const iconToxic = <Shield size={16} color={TOKENS.brand} />;
  const iconAnchor = <Quote size={16} color={TOKENS.brand} />;
  const iconGap = <ArrowRightLeft size={16} color={TOKENS.brand} />;

  return (
    <section
      className={className}
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TOKENS.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Backlinks Insights Summary
          </h3>
          <button
            className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
            title="Each card shows a current stacked snapshot and a stacked trend using the same breakdown."
            aria-label="About this section"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Share toggle chip */}
          <label
            className="inline-flex items-center gap-2 text-xs rounded-full border px-3 py-1.5"
            style={{ color: TOKENS.muted, borderColor: TOKENS.border, cursor: "pointer", background: "#FFFFFF" }}
            title="Toggle trends between absolute values and % share"
          >
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ accentColor: TOKENS.valueBlue, borderColor: TOKENS.border, cursor: "pointer" }}
            />
            Show % share
          </label>

          {/* Compare chip (kept for parity with original) */}
          <button
            type="button"
            onClick={onCompare}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
            title={
              (hasCompetitor ?? false)
                ? "Analyze backlink gap and authority against a competitor"
                : "Add a competitor to enable gap analysis"
            }
            style={{
              borderColor: TOKENS.border,
              color: (hasCompetitor ?? false) ? TOKENS.brand : TOKENS.muted,
              cursor: "pointer",
              background: "#FFFFFF",
            }}
          >
            <ArrowRightLeft size={14} />
            <span>Compare with Competitor</span>
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            title="Export Backlinks Summary"
            style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
          >
            <FileDown size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Grid: 3 + 2 (xl), 2 (lg), 1 (sm) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {/* 1) Total Backlinks — attributes */}
        <KpiCard
          title="Total Backlinks"
          info="Snapshot: link attributes (follow/nofollow/UGC/sponsored). Trend: attribute mix over time."
          glyph={iconLink}
          donut={
            <StackedDonut
              parts={lastParts(attrRows, ["follow", "nofollow", "ugc", "sponsored"], ATTR_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={ATTR_NAMES}
              iconMap={{}}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={totalBacklinks}
          valueFmt={(v) => intFmt.format(v)}
          delta={dTB}
          trend={
            <TrendStack
              rows={attrRows}
              keys={["follow", "nofollow", "ugc", "sponsored"]}
              colors={ATTR_COLORS}
              names={ATTR_NAMES}
              mode="area"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "totalBacklinks", route: "audit/backlinks", title: "Total Backlinks" })}
        />

        {/* 2) Lost in Last 30 Days — reasons */}
        <KpiCard
          title="Lost in Last 30 Days"
          info="Snapshot: why links were lost. Trend: reason mix per day."
          glyph={iconLost}
          donut={
            <StackedDonut
              parts={lastParts(lossRows, ["removed_404", "redirected", "noindex_blocked", "other_loss"], LOSS_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={LOSS_NAMES}
              iconMap={{}}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={lost30d}
          valueFmt={(v) => intFmt.format(v)}
          delta={dLost}
          invert
          trend={
            <TrendStack
              rows={lossRows}
              keys={["removed_404", "redirected", "noindex_blocked", "other_loss"]}
              colors={LOSS_COLORS}
              names={LOSS_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "lost30d", route: "health/lost", title: "Lost in Last 30 Days" })}
        />

        {/* 3) Toxic Links — severity */}
        <KpiCard
          title="Toxic Links"
          info="Snapshot: toxicity severity. Trend: severity mix over time (lower is better)."
          glyph={iconToxic}
          donut={
            <StackedDonut
              parts={lastParts(sevRows, ["sev_critical", "sev_high", "sev_medium", "sev_low"], SEV_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={SEV_NAMES}
              iconMap={{}}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={toxicLinks}
          valueFmt={(v) => intFmt.format(v)}
          delta={dTox}
          invert
          trend={<TrendStack rows={sevRows} keys={["sev_critical", "sev_high", "sev_medium", "sev_low"]} colors={SEV_COLORS} names={SEV_NAMES} mode="bars" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "toxicLinks", route: "audit/toxicity", title: "Toxic Links" })}
        />

        {/* 4) Avg AQS Score — anchor types */}
        <KpiCard
          title="Avg AQS Score"
          info="Anchor Quality Score. Snapshot: anchor types; trend: type mix."
          glyph={iconAnchor}
          donut={
            <StackedDonut
              parts={lastParts(anchRows, ["exact", "partial", "branded", "generic"], ANCH_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={ANCH_NAMES}
              iconMap={{}}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={avgAqs}
          valueFmt={(v) => `${v.toFixed(1)}/100`}
          delta={typeof dAQS === "number" ? Math.round(dAQS * 10) / 10 : undefined}
          deltaUnit="pt"
          trend={<TrendStack rows={anchRows} keys={["exact", "partial", "branded", "generic"]} colors={ANCH_COLORS} names={ANCH_NAMES} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "avgAqs", route: "audit/anchors", title: "Avg AQS Score" })}
        />

        {/* 5) Competitor Link Gap — overlap */}
        <KpiCard
          title="Competitor Link Gap"
          info="Overlap of referring domains. Positive is good; negative means competitors have more unique domains."
          glyph={iconGap}
          donut={
            <StackedDonut
              parts={lastParts(gapRows, ["comp_only", "shared", "you_only"], GAP_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={GAP_NAMES}
              iconMap={{}}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={competitorGap}
          valueFmt={(v) => intFmt.format(v)}
          delta={dGap}
          trend={<TrendStack rows={gapRows} keys={["comp_only", "shared", "you_only"]} colors={GAP_COLORS} names={GAP_NAMES} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "competitorGap", route: "opportunities/gap", title: "Competitor Link Gap" })}
        />

      </div>
                          <BacklinkHealthSummary
                data={{
                    total: 2500,
                    clean: 1450,
                    lost: 500,
                    toxic: 300,
                    recovered: 250,
                }}
                showTotal
                onNavigate={(href) => alert(`Navigate to: ${href}`)}
            />
    </section>
  );
}

/* Named export for compatibility with your imports */
export { Section2RightKpiCards as RightKpiCards };
