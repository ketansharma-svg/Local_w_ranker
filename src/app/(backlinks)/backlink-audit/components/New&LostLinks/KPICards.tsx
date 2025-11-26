"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
import {
  Info,
  FileDown,
  BarChart3,
  Link2,
  PlusCircle,
  MinusCircle,
  ArrowUpDown,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* =============================================================================
   THEME / TOKENS (brand + UI)
============================================================================= */
const TOKENS = {
  brand: "#008CCD",       // branded icons for section & card titles
  valueBlue: "#0077FF",   // primary numeric color
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
  purple: "#8B5CF6",
  blueSoft: "#60A5FA",
  teal: "#14B8A6",
} as const;

const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

/* =============================================================================
   INPUT TYPES (compatible with your original Section 2)
============================================================================= */
type KpiKey =
  | "newLinks"
  | "lostLinks"
  | "netLinks"
  | "newDomains"
  | "lostDomains"
  | "netDomains";

type SeriesPointIn =
  | number
  | { x?: number | string | Date; y: number; label?: string; date?: string | number | Date; t?: string | number | Date; ts?: number };

type KpiInput = {
  value: number;
  prev?: number;
  trendPct?: number;
  series?: SeriesPointIn[];
  subtext?: string;
};

type KPIData = Partial<Record<KpiKey, KpiInput>>;

type NavTarget = {
  key: KpiKey;
  route: string;
  title: string;
  filters?: Record<string, any>;
};

type Props = {
  data?: KPIData;
  onNavigate?: (target: NavTarget) => void;
  className?: string;
};

/* =============================================================================
   SERIES NORMALIZATION (accepts number[] | {x,y}|{date|t|ts,y} -> ISO dates)
============================================================================= */
type SeriesPoint = { date: string; value: number };

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
function mkSeries(len = DAYS, start = 40, amp = 0.2): SeriesPoint[] {
  const baseISO = addDays(todayISO(), -(len - 1));
  return Array.from({ length: len }, (_, i) => {
    const iso = addDays(baseISO, i);
    const w = 1 + Math.sin(i * 0.45) * amp + (Math.random() - 0.5) * 0.12;
    return { date: iso, value: Math.max(0, Math.round(start * w)) };
  });
}
/* Adapt number[] | {x,y}[] | {date|t|ts,y}[] to SeriesPoint[] (ISO dates) */
function toSeries(points?: SeriesPointIn[], fallback?: SeriesPoint[]): SeriesPoint[] {
  if (points && points.length) {
    const n = points.length;
    const start = addDays(todayISO(), -(n - 1));
    return points.map((p, i) => {
      if (typeof p === "number") return { date: addDays(start, i), value: p };
      const obj: any = p;
      const y = typeof obj.y === "number" ? obj.y : 0;
      const raw = obj.date ?? obj.t ?? obj.ts ?? obj.x ?? addDays(start, i);
      let d: Date | null = null;
      if (raw instanceof Date) d = raw;
      else if (typeof raw === "number") d = new Date(raw > 1e12 ? raw : raw * 1000);
      else if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) d = new Date(raw);
      const iso = d ? new Date(d.setHours(0, 0, 0, 0)).toISOString().slice(0, 10) : addDays(start, i);
      return { date: iso, value: y };
    });
  }
  return fallback ?? mkSeries();
}
const deltaFrom = (s?: SeriesPoint[]) =>
  !s || s.length < 2 ? undefined : (s[s.length - 1].value - s[s.length - 2].value);

/* =============================================================================
   SPLIT HELPERS — Build stacked rows for donut + trend (same breakdown)
============================================================================= */
type Row = { t: string } & Record<string, any>;
type SplitSpec = { key: string; label: string; baseShare: number };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function splitSeries(total: SeriesPoint[] | undefined, parts: SplitSpec[], jitter = 0.06): Row[] {
  const src = total ?? [];
  const out: Row[] = [];
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
    const sum = Object.values(shares).reduce((s, v) => s + v, 0) || 1;
    Object.keys(shares).forEach((k) => (shares[k] = shares[k] / sum));
    const row: Row = { t: src[i].date };
    parts.forEach((sp) => (row[sp.key] = Math.max(0, Math.round(totalV * shares[sp.key]))));
    out.push(row);
  }
  return out;
}
const toShare = (rows: Row[], keys: string[]) =>
  rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const o: Row = { t: r.t };
    keys.forEach((k) => (o[k] = ((Number(r[k]) || 0) / sum) * 100));
    return o;
  });
/* parts @ last point (normal) */
function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}
/* parts @ last point (absolute for signed stacks) */
function lastPartsAbs(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Math.abs(Number(r[k] || 0)), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* =============================================================================
   SMART POPOVERS — portal tooltip with hover highlight
============================================================================= */
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
        className="rounded-md p-2 text-xs shadow ring-1"
        style={{
          backgroundColor: "#fff",
          border: `1px solid ${TOKENS.border}`,
          color: TOKENS.text,
          borderRadius: 6,
          pointerEvents: "auto", // allow hover highlight
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function toDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function TrendPortalContent({
  active,
  label,
  payload,
  coordinate,
  containerRect,
  nameMap,
  valueFmt,
  asShare = false,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  asShare?: boolean;
}) {
  const [hoverKey, setHoverKey] = React.useState<string | undefined>(undefined);
  React.useEffect(() => setHoverKey(undefined), [label]);
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
        {rows.map((p, i) => {
          const isActive = hoverKey ? p.name === hoverKey : i === 0;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverKey(p.name)}
              onMouseLeave={() => setHoverKey(undefined)}
              className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}
              style={{ cursor: "default" }}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
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

function DonutPortalContent({
  active,
  payload,
  coordinate,
  containerRect,
  parts,
  nameMap,
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  payload?: any[];
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
}) {
  const [hoverKey, setHoverKey] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    const hovered = payload?.[0]?.name as string | undefined;
    setHoverKey(hovered);
  }, [payload?.[0]?.name]);

  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));

  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = hoverKey ? p.name === hoverKey : i === 0;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverKey(p.name)}
              onMouseLeave={() => setHoverKey(undefined)}
              className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}
              style={{ cursor: "default" }}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
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

/* =============================================================================
   SNAPSHOT DONUT
============================================================================= */
function StackedDonut({
  parts,
  size = 92,
  nameMap,
  valueFmt,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  nameMap?: Record<string, string>;
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

/* =============================================================================
   TREND STACK (area or bars, supports % share and signed)
============================================================================= */
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
  const data = share ? toShare(rows, keys) : rows;
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
            <ReferenceLine y={0} stroke={TOKENS.muted} strokeOpacity={0.12} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* =============================================================================
   DELTA BADGE
============================================================================= */
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

/* =============================================================================
   CARD SHELL
============================================================================= */
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
      title={title}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Title row with branded glyph + info near title */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BrandGlyph icon={glyph} />
            <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </div>
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info} aria-label={`${title} info`}>
              <Info size={14} />
            </span>
          </div>
        </div>

        {/* Content: donut | value/delta | trend */}
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

/* =============================================================================
   SECTION 2 — KPI Cards: New / Lost / Net Change (Redesigned)
============================================================================= */
export default function Tab3KpiSummary({
  data,
  onNavigate,
  className,
}: Props) {
  /* Normalize / fallback series */
  const newL = toSeries(data?.newLinks?.series, mkSeries(14, 52, 0.18));
  const losL = toSeries(data?.lostLinks?.series, mkSeries(14, 33, 0.16));
  const netL = toSeries(
    data?.netLinks?.series,
    newL.map((p, i) => ({ date: p.date, value: Math.max(0, p.value - (losL[i]?.value ?? 0)) }))
  );

  const newD = toSeries(data?.newDomains?.series, mkSeries(14, 18, 0.16));
  const losD = toSeries(data?.lostDomains?.series, mkSeries(14, 12, 0.14));
  const netD = toSeries(
    data?.netDomains?.series,
    newD.map((p, i) => ({ date: p.date, value: Math.max(0, p.value - (losD[i]?.value ?? 0)) }))
  );

  /* Values (prefer prop, fallback to last point) */
  const newLinksVal  = data?.newLinks?.value  ?? (newL.at(-1)?.value ?? 0);
  const lostLinksVal = data?.lostLinks?.value ?? (losL.at(-1)?.value ?? 0);
  const netLinksVal  =
    data?.netLinks?.value ??
    (typeof data?.newLinks?.value === "number" && typeof data?.lostLinks?.value === "number"
      ? data!.newLinks!.value - data!.lostLinks!.value
      : (newL.at(-1)?.value ?? 0) - (losL.at(-1)?.value ?? 0));

  const newDomVal  = data?.newDomains?.value  ?? (newD.at(-1)?.value ?? 0);
  const lostDomVal = data?.lostDomains?.value ?? (losD.at(-1)?.value ?? 0);
  const netDomVal  =
    data?.netDomains?.value ??
    (typeof data?.newDomains?.value === "number" && typeof data?.lostDomains?.value === "number"
      ? data!.newDomains!.value - data!.lostDomains!.value
      : (newD.at(-1)?.value ?? 0) - (losD.at(-1)?.value ?? 0));

  /* Deltas (last vs previous day) */
  const dNewL = deltaFrom(newL);
  const dLosL = deltaFrom(losL);
  const dNetL = deltaFrom(netL);

  const dNewD = deltaFrom(newD);
  const dLosD = deltaFrom(losD);
  const dNetD = deltaFrom(netD);

  /* ---------------------------------------------
     Breakdown specs + color maps
  ----------------------------------------------*/
  // New Backlinks — Link attributes
  const NEW_ATTR: SplitSpec[] = [
    { key: "follow",    label: "Follow",    baseShare: 0.52 },
    { key: "nofollow",  label: "Nofollow",  baseShare: 0.34 },
    { key: "sponsored", label: "Sponsored", baseShare: 0.08 },
    { key: "ugc",       label: "UGC",       baseShare: 0.06 },
  ];
  const NEW_ATTR_COLORS: Record<string, string> = {
    follow: TOKENS.success,
    nofollow: TOKENS.gray,
    sponsored: TOKENS.warn,
    ugc: TOKENS.blueSoft,
  };
  const NEW_ATTR_NAMES = {
    follow: "Follow",
    nofollow: "Nofollow",
    sponsored: "Sponsored",
    ugc: "UGC",
  };

  // Lost Backlinks — Reasons
  const LOST_REASON: SplitSpec[] = [
    { key: "removed",      label: "Removed / Unlinked",          baseShare: 0.38 },
    { key: "http_404",     label: "404 / 410",                   baseShare: 0.28 },
    { key: "attr_changed", label: "Nofollow/Sponsored Added",    baseShare: 0.18 },
    { key: "other",        label: "Other / Blocked",             baseShare: 0.16 },
  ];
  const LOST_REASON_COLORS: Record<string, string> = {
    removed: TOKENS.danger,
    http_404: TOKENS.warn,
    attr_changed: TOKENS.purple,
    other: TOKENS.gray,
  };
  const LOST_REASON_NAMES = {
    removed: "Removed / Unlinked",
    http_404: "404 / 410",
    attr_changed: "Nofollow/Sponsored Added",
    other: "Other / Blocked",
  };

  // For Net Backlinks contributions we also need lost-by-attribute split
  const LOST_ATTR: SplitSpec[] = [
    { key: "lost_follow", label: "Lost (Follow)", baseShare: 0.58 },
    { key: "lost_nf",     label: "Lost (NF/UGC/Sponsored)", baseShare: 0.42 },
  ];
  const NET_LINK_COLORS: Record<string, string> = {
    new_follow: TOKENS.success,
    new_nf: TOKENS.blueSoft,
    lost_follow: TOKENS.danger,
    lost_nf: TOKENS.warn,
  };
  const NET_LINK_NAMES = {
    new_follow: "New (Follow)",
    new_nf: "New (NF/UGC/Sponsored)",
    lost_follow: "Lost (Follow)",
    lost_nf: "Lost (NF/UGC/Sponsored)",
  };

  // Domains — Authority tiers (bands)
  const WR_BANDS: SplitSpec[] = [
    { key: "wr_high",    label: "WR 70+",   baseShare: 0.18 },
    { key: "wr_mid",     label: "WR 30–69", baseShare: 0.42 },
    { key: "wr_low",     label: "WR 0–29",  baseShare: 0.28 },
    { key: "wr_unknown", label: "Unknown",  baseShare: 0.12 },
  ];
  const WR_COLORS: Record<string, string> = {
    wr_high: "#2563EB",
    wr_mid: "#22C55E",
    wr_low: TOKENS.warn,
    wr_unknown: TOKENS.gray,
  };
  const WR_NAMES = {
    wr_high: "WR 70+",
    wr_mid: "WR 30–69",
    wr_low: "WR 0–29",
    wr_unknown: "Unknown",
  };

  // Net Domains contributions (quality grouped)
  const NET_DOM_COLORS: Record<string, string> = {
    new_hi_mid: "#22C55E",
    new_lo_unk: TOKENS.blueSoft,
    lost_hi_mid: TOKENS.danger,
    lost_lo_unk: TOKENS.warn,
  };
  const NET_DOM_NAMES = {
    new_hi_mid: "New (High/Mid)",
    new_lo_unk: "New (Low/Unknown)",
    lost_hi_mid: "Lost (High/Mid)",
    lost_lo_unk: "Lost (Low/Unknown)",
  };

  /* ---------------------------------------------
     Build stacked rows for donuts & trends
  ----------------------------------------------*/
  // New backlinks (attribute mix)
  const newRows = React.useMemo(() => splitSeries(newL, NEW_ATTR, 0.06), [newL]);

  // Lost backlinks (reasons)
  const lostReasonRows = React.useMemo(() => splitSeries(losL, LOST_REASON, 0.06), [losL]);

  // Lost backlinks (attribute buckets for net contributions)
  const lostAttrRows = React.useMemo(() => splitSeries(losL, LOST_ATTR, 0.06), [losL]);

  // Net backlinks contributions (signed)
  const netLinkRows: Row[] = React.useMemo(() => {
    const rows: Row[] = [];
    for (let i = 0; i < newRows.length; i++) {
      const r: Row = { t: newRows[i].t };
      const new_follow = Number(newRows[i].follow || 0);
      const new_nf = Number(newRows[i].nofollow || 0) + Number(newRows[i].ugc || 0) + Number(newRows[i].sponsored || 0);
      const lost_follow = -Math.abs(Number(lostAttrRows[i]?.lost_follow || 0));
      const lost_nf = -Math.abs(Number(lostAttrRows[i]?.lost_nf || 0));
      r.new_follow = new_follow;
      r.new_nf = new_nf;
      r.lost_follow = lost_follow;
      r.lost_nf = lost_nf;
      rows.push(r);
    }
    return rows;
  }, [newRows, lostAttrRows]);

  // New & Lost domains by authority
  const newDomRows = React.useMemo(() => splitSeries(newD, WR_BANDS, 0.05), [newD]);
  const lostDomRows = React.useMemo(() => splitSeries(losD, WR_BANDS, 0.05), [losD]);

  // Net domains contributions (signed, grouped)
  const netDomRows: Row[] = React.useMemo(() => {
    const rows: Row[] = [];
    const n = Math.max(newDomRows.length, lostDomRows.length);
    for (let i = 0; i < n; i++) {
      const nr = newDomRows[i] ?? { t: newD[i]?.date ?? todayISO(), wr_high: 0, wr_mid: 0, wr_low: 0, wr_unknown: 0 };
      const lr = lostDomRows[i] ?? { t: losD[i]?.date ?? todayISO(), wr_high: 0, wr_mid: 0, wr_low: 0, wr_unknown: 0 };
      const hi_mid_new = Number(nr.wr_high || 0) + Number(nr.wr_mid || 0);
      const lo_unk_new = Number(nr.wr_low || 0) + Number(nr.wr_unknown || 0);
      const hi_mid_lost = -Math.abs(Number(lr.wr_high || 0) + Number(lr.wr_mid || 0));
      const lo_unk_lost = -Math.abs(Number(lr.wr_low || 0) + Number(lr.wr_unknown || 0));
      rows.push({ t: nr.t, new_hi_mid: hi_mid_new, new_lo_unk: lo_unk_new, lost_hi_mid: hi_mid_lost, lost_lo_unk: lo_unk_lost }as unknown as Row);
    }
    return rows;
  }, [newDomRows, lostDomRows, newD, losD]);

  // Toggle to show % share for trends (applies to counts; not for signed net)
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  // Branded glyphs per card
  const iconNewLinks  = <PlusCircle size={16} color={TOKENS.brand} />;
  const iconLostLinks = <MinusCircle size={16} color={TOKENS.brand} />;
  const iconNetLinks  = <ArrowUpDown size={16} color={TOKENS.brand} />;
  const iconNewDom    = <Globe size={16} color={TOKENS.brand} />;
  const iconLostDom   = <Globe size={16} color={TOKENS.brand} />;
  const iconNetDom    = <ArrowUpDown size={16} color={TOKENS.brand} />;

  return (
    <section
      className={className}
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Section Header — branded icon + Export + share chip */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TOKENS.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            KPI Cards – New / Lost / Net Change
          </h3>
          <button
            className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
            title="Each card shows a stacked snapshot and a stacked trend using the same breakdown."
            aria-label="About this section"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Modern chip: % share toggle (not applied to signed net cards) */}
          <label
            className="inline-flex items-center gap-2 text-xs rounded-full border px-3 py-1.5"
            style={{ color: TOKENS.muted, borderColor: TOKENS.border, cursor: "pointer", background: "#FFFFFF" }}
            title="Toggle trends between absolute values and % share (not applied to Net cards)"
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

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            title="Export KPI Cards – New/Lost/Net Change"
            style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            onClick={() => {}}
          >
            <FileDown size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Grid: 3×2 (xl), 2×3 (lg), 1×6 (sm) */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {/* 1) New Backlinks — link attributes */}
        <KpiCard
          title="New Backlinks"
          info="Snapshot: link attribute mix. Trend: attribute mix over time."
          glyph={iconNewLinks}
          donut={
            <StackedDonut
              parts={lastParts(newRows, ["follow", "nofollow", "sponsored", "ugc"], NEW_ATTR_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={NEW_ATTR_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={newLinksVal}
          valueFmt={(v) => intFmt.format(v)}
          delta={dNewL}
          trend={
            <TrendStack
              rows={newRows}
              keys={["follow", "nofollow", "sponsored", "ugc"]}
              colors={NEW_ATTR_COLORS}
              names={NEW_ATTR_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() =>
            onNavigate?.({
              key: "newLinks",
              route: "new-lost#sec7",
              title: "New Backlinks",
              filters: { status: "new" },
            })
          }
        />

        {/* 2) Lost Backlinks — reasons */}
        <KpiCard
          title="Lost Backlinks"
          info="Snapshot: why links were lost. Trend: loss reasons per day."
          glyph={iconLostLinks}
          donut={
            <StackedDonut
              parts={lastParts(lostReasonRows, ["removed", "http_404", "attr_changed", "other"], LOST_REASON_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={LOST_REASON_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={lostLinksVal}
          valueFmt={(v) => intFmt.format(v)}
          delta={dLosL}
          invert
          trend={
            <TrendStack
              rows={lostReasonRows}
              keys={["removed", "http_404", "attr_changed", "other"]}
              colors={LOST_REASON_COLORS}
              names={LOST_REASON_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() =>
            onNavigate?.({
              key: "lostLinks",
              route: "new-lost#sec6",
              title: "Lost Backlinks",
              filters: { status: "lost" },
            })
          }
        />

        {/* 3) Net Backlinks Change — signed contributions */}
        <KpiCard
          title="Net Backlinks Change"
          info="Snapshot: drivers of net change (new vs lost, by type). Trend: signed contributions over time."
          glyph={iconNetLinks}
          donut={
            <StackedDonut
              parts={lastPartsAbs(netLinkRows, ["new_follow", "new_nf", "lost_follow", "lost_nf"], NET_LINK_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={NET_LINK_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={netLinksVal}
          valueFmt={(v) => `${netLinksVal >= 0 ? "" : "−"}${intFmt.format(Math.abs(v))}`}
          delta={dNetL}
          trend={
            <TrendStack
              rows={netLinkRows}
              keys={["new_follow", "new_nf", "lost_follow", "lost_nf"]}
              colors={NET_LINK_COLORS}
              names={NET_LINK_NAMES}
              mode="area"
              share={false} // signed; % share not meaningful
            />
          }
          onClick={() =>
            onNavigate?.({
              key: "netLinks",
              route: "new-lost#sec3",
              title: "Net Backlinks Change",
              filters: { focus: "trend" },
            })
          }
        />

        {/* 4) New Referring Domains — authority tiers */}
        <KpiCard
          title="New Referring Domains"
          info="Snapshot: authority tiers of new domains. Trend: tier mix over time."
          glyph={iconNewDom}
          donut={
            <StackedDonut
              parts={lastParts(newDomRows, ["wr_high", "wr_mid", "wr_low", "wr_unknown"], WR_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={WR_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={newDomVal}
          valueFmt={(v) => intFmt.format(v)}
          delta={dNewD}
          trend={
            <TrendStack
              rows={newDomRows}
              keys={["wr_high", "wr_mid", "wr_low", "wr_unknown"]}
              colors={WR_COLORS}
              names={WR_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() =>
            onNavigate?.({
              key: "newDomains",
              route: "ref-domains#new",
              title: "New Referring Domains",
              filters: { domainStatus: "new" },
            })
          }
        />

        {/* 5) Lost Referring Domains — authority tiers */}
        <KpiCard
          title="Lost Referring Domains"
          info="Snapshot: authority tiers of lost domains. Trend: tier mix over time."
          glyph={iconLostDom}
          donut={
            <StackedDonut
              parts={lastParts(lostDomRows, ["wr_high", "wr_mid", "wr_low", "wr_unknown"], WR_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={WR_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={lostDomVal}
          valueFmt={(v) => intFmt.format(v)}
          delta={dLosD}
          invert
          trend={
            <TrendStack
              rows={lostDomRows}
              keys={["wr_high", "wr_mid", "wr_low", "wr_unknown"]}
              colors={WR_COLORS}
              names={WR_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() =>
            onNavigate?.({
              key: "lostDomains",
              route: "ref-domains#lost",
              title: "Lost Referring Domains",
              filters: { domainStatus: "lost" },
            })
          }
        />

        {/* 6) Net Domains Change — signed contributions (quality grouped) */}
        <KpiCard
          title="Net Domains Change"
          info="Snapshot: drivers of net domain change by quality. Trend: signed contributions over time."
          glyph={iconNetDom}
          donut={
            <StackedDonut
              parts={lastPartsAbs(netDomRows, ["new_hi_mid", "new_lo_unk", "lost_hi_mid", "lost_lo_unk"], NET_DOM_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={NET_DOM_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={netDomVal}
          valueFmt={(v) => `${netDomVal >= 0 ? "" : "−"}${intFmt.format(Math.abs(v))}`}
          delta={dNetD}
          trend={
            <TrendStack
              rows={netDomRows}
              keys={["new_hi_mid", "new_lo_unk", "lost_hi_mid", "lost_lo_unk"]}
              colors={NET_DOM_COLORS}
              names={NET_DOM_NAMES}
              mode="area"
              share={false} // signed
            />
          }
          onClick={() =>
            onNavigate?.({
              key: "netDomains",
              route: "ref-domains#net",
              title: "Net Domains Change",
              filters: { domainStatus: "net" },
            })
          }
        />
      </div>
    </section>
  );
}

/* Named export for convenience (keeps your original alias) */
export { Tab3KpiSummary as Tab3Section2KpiSummary };

