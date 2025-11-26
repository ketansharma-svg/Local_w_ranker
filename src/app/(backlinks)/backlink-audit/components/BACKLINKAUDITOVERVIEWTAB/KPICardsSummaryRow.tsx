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
  Shield,
  AlertTriangle,
  ShieldCheck,
  FileWarning,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* =============================================================================
   THEME / TOKENS
============================================================================= */
const TOKENS = {
  brand: "#008CCD",     // branded icons for section/card titles
  valueBlue: "#0077FF", // primary numeric color
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;

/* =============================================================================
   INPUT TYPES (compatible with original Section 1)
============================================================================= */
type KpiKey =
  | "toxicLinks"
  | "suspiciousLinks"
  | "disavowedActive"
  | "pagesAffected"
  | "wrImpact";

type SeriesPoint = { date: string; value: number };

type KpiInput = {
  value: number;
  trend?: number;
  series?: Array<number | { x: number | string | Date; y: number; label?: string; date?: string | number | Date; t?: string | number | Date; ts?: number }>;
  subtext?: string;
};

type KPIData = Partial<Record<KpiKey, KpiInput>>;

type Props = {
  data?: KPIData;
  onNavigate?: (target: { key: KpiKey; route: string; title: string }) => void;
  className?: string;
};

/* =============================================================================
   SAFE FALLBACK SERIES (ISO dates so tooltips show exact dates)
============================================================================= */
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

/* Adapt number[] | {x,y}[] | {date|t|ts,y}[] to SeriesPoint[] (ISO dates) */
function toSeries(points?: KpiInput["series"], fallback?: SeriesPoint[]): SeriesPoint[] {
  if (points && points.length) {
    return points.map((p, i) => {
      if (typeof p === "number") {
        const base = addDays(todayISO(), -(points.length - 1));
        return { date: addDays(base, i), value: p };
      }
      const obj: any = p;
      const y = typeof obj.y === "number" ? obj.y : 0;
      // pick date from date|t|ts|x if parsable; otherwise derive by index
      const raw =
        obj.date ?? obj.t ?? obj.ts ?? obj.x ??
        addDays(todayISO(), -(points.length - 1));
      let d: Date | null = null;
      if (raw instanceof Date) d = raw;
      else if (typeof raw === "number") d = new Date(raw > 1e12 ? raw : raw * 1000);
      else if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) d = new Date(raw);
      const iso = d ? new Date(d.setHours(0, 0, 0, 0)).toISOString().slice(0, 10) : addDays(todayISO(), i);
      return { date: iso, value: y };
    });
  }
  return fallback ?? mkSeries();
}
const deltaFrom = (s?: SeriesPoint[]) =>
  !s || s.length < 2 ? undefined : (s[s.length - 1].value - s[s.length - 2].value);
const toDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });

/* =============================================================================
   SPLIT HELPERS — build stacked rows for donut + trend
============================================================================= */
type Row = { t: string } & Record<string, any>;
type SplitSpec = { key: string; label: string; baseShare: number };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

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

/* last point parts — value (normal) */
function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}
/* last point parts — absolute value (for signed series like WR impact) */
function lastPartsAbs(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Math.abs(Number(r[k] || 0)), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* Build signed contribution rows for WR impact */
function wrContributionRows(sp: SeriesPoint[]): Row[] {
  const rows: Row[] = [];
  for (const p of sp) {
    const v = Number(p.value || 0);
    if (v < 0) {
      const neg = -v;
      const tox = Math.round(neg * 0.6);
      const susp = Math.round(neg * 0.4);
      rows.push({ t: p.date, tox_impact: -tox, susp_impact: -susp, disavow_recovery: 0, other_impact: 0 }as unknown as Row);
    } else if (v > 0) {
      const rec = Math.round(v * 0.7);
      const oth = v - rec;
      rows.push({ t: p.date, tox_impact: 0, susp_impact: 0, disavow_recovery: rec, other_impact: oth } as unknown as Row);
    } else {
      rows.push({ t: p.date, tox_impact: 0, susp_impact: 0, disavow_recovery: 0, other_impact: 0 } as unknown as Row);
    }
  }
  return rows;
}

/* =============================================================================
   PORTALED TOOLTIP SHELL (smart popovers with hover highlight)
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
          pointerEvents: "auto", // allow hover highlight inside popover
        }}
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
          <span className="text-[11px]" style={{ color: TOKENS.muted }}>Total</span>
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
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>Breakdown</div>
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
              {/* FIX APPLIED HERE: removed the stray '}' */}
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
   TREND STACK (area or bars, supports share and signed values)
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
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Title row with info icon near title */}
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
   SECTION — Redesigned KPI Cards Summary Row (Section 1)
============================================================================= */
export default function AuditOverviewKpiCards({ data, onNavigate, className }: Props) {
  // Normalize / fallback series
  const toxSP = toSeries(data?.toxicLinks?.series, mkSeries(14, 46, 0.18));
  const susSP = toSeries(data?.suspiciousLinks?.series, mkSeries(14, 114, 0.16));
  const disSP = toSeries(data?.disavowedActive?.series, mkSeries(14, 31, 0.14));
  const pagSP = toSeries(data?.pagesAffected?.series, mkSeries(14, 17, 0.10));
  const wrSP  = toSeries(data?.wrImpact?.series, mkSeries(14, -6, 0.06)); // signed trend supported below

  // Values (use prop value if provided)
  const toxicLinks      = data?.toxicLinks?.value ?? (toxSP.at(-1)?.value ?? 0);
  const suspiciousLinks = data?.suspiciousLinks?.value ?? (susSP.at(-1)?.value ?? 0);
  const disavowedActive = data?.disavowedActive?.value ?? (disSP.at(-1)?.value ?? 0);
  const pagesAffected   = data?.pagesAffected?.value ?? (pagSP.at(-1)?.value ?? 0);
  const wrImpact        = data?.wrImpact?.value ?? (wrSP.at(-1)?.value ?? 0);

  // Deltas (last vs previous day)
  const dTox = deltaFrom(toxSP);
  const dSus = deltaFrom(susSP);
  const dDis = deltaFrom(disSP);
  const dPag = deltaFrom(pagSP);
  const dWR  = deltaFrom(wrSP);

  // Breakdown specs + color maps
  // 1) Toxic severity
  const SEV: SplitSpec[] = [
    { key: "sev_critical", label: "Critical", baseShare: 0.18 },
    { key: "sev_high",     label: "High",     baseShare: 0.34 },
    { key: "sev_medium",   label: "Medium",   baseShare: 0.32 },
    { key: "sev_low",      label: "Low",      baseShare: 0.16 },
  ];
  const SEV_COLORS: Record<string, string> = {
    sev_critical: TOKENS.danger,
    sev_high: TOKENS.warn,
    sev_medium: "#60A5FA",
    sev_low: TOKENS.gray,
  };
  const SEV_NAMES = { sev_critical: "Critical", sev_high: "High", sev_medium: "Medium", sev_low: "Low" };

  // 2) Suspicious reasons
  const SUS: SplitSpec[] = [
    { key: "low_wr",       label: "Low WR (Domain)", baseShare: 0.36 },
    { key: "anchor_risk",  label: "Anchor Risk",     baseShare: 0.28 },
    { key: "tld_ip",       label: "TLD/IP Risk",     baseShare: 0.20 },
    { key: "other_flags",  label: "Other Signals",   baseShare: 0.16 },
  ];
  const SUS_COLORS: Record<string, string> = {
    low_wr: "#F59E0B",
    anchor_risk: "#F97316",
    tld_ip: "#60A5FA",
    other_flags: TOKENS.gray,
  };
  const SUS_NAMES = {
    low_wr: "Low WR (Domain)",
    anchor_risk: "Anchor Risk",
    tld_ip: "TLD/IP Risk",
    other_flags: "Other Signals",
  };

  // 3) Disavowed (active): scope + recency
  const DIS: SplitSpec[] = [
    { key: "dom_old", label: "Domain (older)", baseShare: 0.46 },
    { key: "dom_new", label: "Domain (≤30d)",  baseShare: 0.14 },
    { key: "url_old", label: "URL (older)",    baseShare: 0.30 },
    { key: "url_new", label: "URL (≤30d)",     baseShare: 0.10 },
  ];
  const DIS_COLORS: Record<string, string> = {
    dom_old: "#10B981",
    dom_new: "#34D399",
    url_old: "#14B8A6",
    url_new: "#99F6E4",
  };
  const DIS_NAMES = {
    dom_old: "Domain (older)",
    dom_new: "Domain (≤30d)",
    url_old: "URL (older)",
    url_new: "URL (≤30d)",
  };

  // 4) Pages affected — page type
  const PGT: SplitSpec[] = [
    { key: "content",  label: "Blog / Content",  baseShare: 0.36 },
    { key: "product",  label: "Product / Service", baseShare: 0.24 },
    { key: "category", label: "Category / Hub",  baseShare: 0.22 },
    { key: "other",    label: "Other",           baseShare: 0.18 },
  ];
  const PGT_COLORS: Record<string, string> = {
    content: "#0077FF",
    product: "#22C55E",
    category: "#8B5CF6",
    other: TOKENS.gray,
  };
  const PGT_NAMES = {
    content: "Blog / Content",
    product: "Product / Service",
    category: "Category / Hub",
    other: "Other",
  };

  // 5) WR impact contributions (signed)
  const WR_COLORS: Record<string, string> = {
    tox_impact: TOKENS.danger,
    susp_impact: TOKENS.warn,
    disavow_recovery: TOKENS.success,
    other_impact: "#60A5FA",
  };
  const WR_NAMES = {
    tox_impact: "Toxic impact (−)",
    susp_impact: "Suspicious impact (−)",
    disavow_recovery: "Disavow / Removals (+)",
    other_impact: "Other (+)",
  };

  // Build stacked rows (snapshot + trend use the same breakdown)
  const sevRows = React.useMemo(() => splitSeries(toxSP, SEV, 0.06), [toxSP]);
  const susRows = React.useMemo(() => splitSeries(susSP, SUS, 0.06), [susSP]);
  const disRows = React.useMemo(() => splitSeries(disSP, DIS, 0.05), [disSP]);
  const pgtRows = React.useMemo(() => splitSeries(pagSP, PGT, 0.05), [pagSP]);
  const wrRows  = React.useMemo(() => wrContributionRows(wrSP), [wrSP]);

  // Trend share toggle for counts
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  // Branded glyphs for each card
  const iconToxic   = <Shield size={16} color={TOKENS.brand} />;
  const iconSusp    = <AlertTriangle size={16} color={TOKENS.brand} />;
  const iconDisav   = <ShieldCheck size={16} color={TOKENS.brand} />;
  const iconPages   = <FileWarning size={16} color={TOKENS.brand} />;
  const iconWR      = <TrendingDown size={16} color={TOKENS.brand} />;

  return (
    <section
      className={className}
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Section Header with Export + chip */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TOKENS.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            KPI Cards Summary
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
          {/* Show % share chip for trends (WR Impact stays absolute) */}
          <label
            className="inline-flex items-center gap-2 text-xs rounded-full border px-3 py-1.5"
            style={{ color: TOKENS.muted, borderColor: TOKENS.border, cursor: "pointer", background: "#FFFFFF" }}
            title="Toggle trends between absolute values and % share (not applied to WR Impact)"
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
            title="Export KPI Summary"
            style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            onClick={() => {}}
          >
            <FileDown size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Grid: 3 + 2 (xl), 2 (lg), 1 (sm) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {/* 1) Toxic Links — severity */}
        <KpiCard
          title="Toxic Links Detected"
          info="Snapshot: toxicity severity. Trend: severity mix over time (lower is better)."
          glyph={iconToxic}
          donut={
            <StackedDonut
              parts={lastParts(sevRows, ["sev_critical", "sev_high", "sev_medium", "sev_low"], SEV_COLORS).map((p) => ({ ...p, name: p.key }))} 
              nameMap={SEV_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={toxicLinks}
          valueFmt={(v) => intFmt.format(v)}
          delta={dTox}
          invert
          trend={
            <TrendStack
              rows={sevRows}
              keys={["sev_critical", "sev_high", "sev_medium", "sev_low"]}
              colors={SEV_COLORS}
              names={SEV_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "toxicLinks", route: "audit/toxicity", title: "Toxic Links Detected" })}
        />

        {/* 2) Suspicious Links — reasons */}
        <KpiCard
          title="Suspicious Links Identified"
          info="Snapshot: why links were flagged (low WR, anchor, TLD/IP, other). Trend: reason mix per day."
          glyph={iconSusp}
          donut={
            <StackedDonut
              parts={lastParts(susRows, ["low_wr", "anchor_risk", "tld_ip", "other_flags"], SUS_COLORS).map((p) => ({ ...p, name: p.key })) }
              nameMap={SUS_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={suspiciousLinks}
          valueFmt={(v) => intFmt.format(v)}
          delta={dSus}
          invert
          trend={
            <TrendStack
              rows={susRows}
              keys={["low_wr", "anchor_risk", "tld_ip", "other_flags"]}
              colors={SUS_COLORS}
              names={SUS_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "suspiciousLinks", route: "audit/suspicious", title: "Suspicious Links Identified" })}
        />

        {/* 3) Disavowed Links (Active) — scope + recency */}
        <KpiCard
          title="Disavowed Links (Active)"
          info="Snapshot: domain vs URL rules and recent additions. Trend: the same mix over time."
          glyph={iconDisav}
          donut={
            <StackedDonut
              parts={lastParts(disRows, ["dom_old", "dom_new", "url_old", "url_new"], DIS_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={DIS_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={disavowedActive}
          valueFmt={(v) => intFmt.format(v)}
          delta={dDis}
          trend={
            <TrendStack
              rows={disRows}
              keys={["dom_old", "dom_new", "url_old", "url_new"]}
              colors={DIS_COLORS}
              names={DIS_NAMES}
              mode="area"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "disavowedActive", route: "audit/disavow", title: "Disavowed Links (Active)" })}
        />

        {/* 4) Pages Affected — page type */}
        <KpiCard
          title="Pages Affected by Risky Links"
          info="Snapshot: affected page types. Trend: page-type mix over time."
          glyph={iconPages}
          donut={
            <StackedDonut
              parts={lastParts(pgtRows, ["content", "product", "category", "other"], PGT_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={PGT_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={pagesAffected}
          valueFmt={(v) => intFmt.format(v)}
          delta={dPag}
          invert
          trend={
            <TrendStack
              rows={pgtRows}
              keys={["content", "product", "category", "other"]}
              colors={PGT_COLORS}
              names={PGT_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "pagesAffected", route: "audit/target-pages", title: "Pages Affected by Risky Links" })}
        />

        {/* 5) WR Score Impact — drivers (signed contributions) */}
        <KpiCard
          title="WR Score Impact (Last 30 Days)"
          info="Net WR Score change attributed to risky backlinks. Snapshot: contribution magnitudes; Trend: signed contributions over time."
          glyph={iconWR}
          donut={
            <StackedDonut
              parts={lastPartsAbs(wrRows, ["tox_impact", "susp_impact", "disavow_recovery", "other_impact"], WR_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={WR_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={wrImpact}
          valueFmt={(v) => `${v >= 0 ? "+" : ""}${Math.round(v)} pt`}
          delta={typeof dWR === "number" ? Math.round(dWR * 10) / 10 : undefined}
          deltaUnit="pt"
          trend={
            <TrendStack
              rows={wrRows}
              keys={["tox_impact", "susp_impact", "disavow_recovery", "other_impact"]}
              colors={WR_COLORS}
              names={WR_NAMES}
              mode="area"
              share={false} // WR Impact is signed; % share is not meaningful here
            />
          }
          onClick={() => onNavigate?.({ key: "wrImpact", route: "audit/wr-impact", title: "WR Score Impact" })}
        />
      </div>
    </section>
  );
}

export { AuditOverviewKpiCards as AuditKpiCards };
