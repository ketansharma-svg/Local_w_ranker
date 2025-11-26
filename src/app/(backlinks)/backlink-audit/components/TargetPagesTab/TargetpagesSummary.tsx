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
  ArrowRightLeft,
  FileDown,
  BarChart3,
  FileText,
  Skull,
  Gauge,
  Link as LinkIcon,
} from "lucide-react";

/* =============================================================================
   THEME / TOKENS
============================================================================= */
const TOKENS = {
  brand: "#008CCD",     // branded icons for section & card titles
  valueBlue: "#0E7AF5", // numeric color
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;

/* =============================================================================
   INPUT TYPES — kept compatible with your current section
============================================================================= */
type KpiKey =
  | "totalLinkedPages"
  | "pagesWithToxic"
  | "avgToxicityScore"
  | "pagesHighAnchorRisk";

type SeriesPoint = { date: string; value: number };

type SeriesInput =
  | number
  | { x?: number | string | Date; y?: number; label?: string }
  | { date?: string | number | Date; value?: number; t?: string | number | Date; ts?: number };

type KpiInput = {
  value: number;                       // main number
  series?: Array<SeriesInput>;         // optional trend series
  subtext?: string;                    // optional text
  severity?: "low" | "medium" | "high" // optional hint (unused in this redesign but safely accepted)
};

type KPIData = Partial<Record<KpiKey, KpiInput>>;

type Props = {
  data?: KPIData;
  onNavigate?: (target: { key: KpiKey; route: string; title: string }) => void;
  onCompare?: () => void;
  onExport?: () => void;
  hasCompetitor?: boolean;
  className?: string;
};

/* =============================================================================
   SERIES UTILS (robust parsing + safe fallbacks with ISO dates)
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
    const w =
      1 + Math.sin(i * 0.48) * amp + (Math.random() - 0.5) * (amp * 0.7);
    return { date: iso, value: Math.max(0, Math.round(start * w)) };
  });
}

/** Adapt number[] | {x|date|t|ts,y}[] to {date ISO, value}[] */
function toSeries(points?: KpiInput["series"], fallback?: SeriesPoint[]): SeriesPoint[] {
  if (points && points.length) {
    return points.map((p, i) => {
      if (typeof p === "number") {
        const base = addDays(todayISO(), -(points.length - 1));
        return { date: addDays(base, i), value: p };
      }
      const obj: any = p;
      const y = typeof obj.y === "number" ? obj.y : (typeof obj.value === "number" ? obj.value : 0);
      const raw = obj.date ?? obj.t ?? obj.ts ?? obj.x;
      let d: Date | null = null;
      if (raw instanceof Date) d = raw;
      else if (typeof raw === "number") d = new Date(raw > 1e12 ? raw : raw * 1000);
      else if (typeof raw === "string" && !Number.isNaN(Date.parse(raw))) d = new Date(raw);
      const iso = d ? new Date(d.setHours(0, 0, 0, 0)).toISOString().slice(0, 10) : addDays(todayISO(), i);
      return { date: iso, value: Number.isFinite(y) ? y : 0 };
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

/** Split a total series into per‑category counts using stable shares + tiny jitter */
function splitSeries(total: SeriesPoint[], parts: SplitSpec[], jitter = 0.06): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < total.length; i++) {
    const totalV = Math.max(0, total[i].value || 0);
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
    const out: Row = { t: total[i].date };
    parts.forEach((sp) => (out[sp.key] = Math.max(0, Math.round(totalV * shares[sp.key]))));
    rows.push(out);
  }
  return rows;
}

/** Convert stacked rows to % share (for the trend share toggle) */
const toShare = (rows: Row[], keys: string[]) =>
  rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });

/** Last point — absolute values for donut parts */
function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* =============================================================================
   SMART POPOVER (portaled) — hover highlight in the list
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
              className={cn(
                "flex items-center justify-between gap-6 rounded px-1 py-0.5",
                isActive && "bg-[rgba(0,0,0,0.03)]"
              )}
              style={{ cursor: "default" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: p.color }}
                />
                <span className={cn(isActive ? "font-semibold" : "")} style={{ color: TOKENS.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div
                className={cn("font-semibold", isActive && "text-[color:var(--focus,#0E7AF5)]")}
              >
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
              className={cn(
                "flex items-center justify-between gap-6 rounded px-1 py-0.5",
                isActive && "bg-[rgba(0,0,0,0.03)]"
              )}
              style={{ cursor: "default" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: p.color }}
                />
                <span className={cn(isActive ? "font-semibold" : "")} style={{ color: TOKENS.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div
                className={cn("font-semibold", isActive && "text-[color:var(--focus,#0E7AF5)]")}
              >
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
   SNAPSHOT DONUT (stacked)
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
   TREND STACK (area or bars, supports % share)
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
   DELTA BADGE (optional, small and helpful)
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
    return <span className="text-xs" style={{ color: TOKENS.muted }}>—</span>;
  }
  const good = invert ? delta < 0 : delta > 0;
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
      {label}
    </span>
  );
}

/* =============================================================================
   CARD SHELL (branded glyph + info near title)
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
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0E7AF5]/40"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Title row with info icon near title */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BrandGlyph icon={glyph} />
            <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </div>
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info} style={{ cursor: "help" }}>
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
   SECTION — Target pages Summary (KPI Cards) — Redesigned
============================================================================= */
export default function TargetPagesKpiCards({
  data,
  onNavigate,
  onCompare,
  onExport,
  hasCompetitor,
  className,
}: Props) {
  /* ---------------------------
     Normalize / fallback series
  ----------------------------*/
  const linkedSP = toSeries(data?.totalLinkedPages?.series, mkSeries(14, 1200, 0.10));
  const toxicSP  = toSeries(data?.pagesWithToxic?.series, mkSeries(14, 300, 0.14));
  const scoreSP  = toSeries(
    data?.avgToxicityScore?.series,
    mkSeries(14, data?.avgToxicityScore?.value ?? 38, 0.06) // average score baseline
  );
  const anchorSP = toSeries(data?.pagesHighAnchorRisk?.series, mkSeries(14, 55, 0.12));

  // Values (prefer provided)
  const totalLinkedPages   = data?.totalLinkedPages?.value ?? (linkedSP.at(-1)?.value ?? 0);
  const pagesWithToxic     = data?.pagesWithToxic?.value ?? (toxicSP.at(-1)?.value ?? 0);
  const avgToxicityScore   = data?.avgToxicityScore?.value ?? Math.round(scoreSP.at(-1)?.value ?? 0);
  const pagesHighAnchor    = data?.pagesHighAnchorRisk?.value ?? (anchorSP.at(-1)?.value ?? 0);

  // Deltas (last vs previous)
  const dLinked = deltaFrom(linkedSP);
  const dToxic  = deltaFrom(toxicSP);
  const dScore  = deltaFrom(scoreSP);
  const dAnchor = deltaFrom(anchorSP);

  /* ----------------------------------------------
     Breakdown specs + color maps for each KPI card
  -----------------------------------------------*/
  // 1) Total Linked Pages — by page type
  const PGT: SplitSpec[] = [
    { key: "content",  label: "Blog / Content",     baseShare: 0.36 },
    { key: "product",  label: "Product / Service",  baseShare: 0.26 },
    { key: "category", label: "Category / Hub",     baseShare: 0.22 },
    { key: "other",    label: "Other",              baseShare: 0.16 },
  ];
  const PGT_COLORS: Record<string, string> = {
    content:  "#0E7AF5",
    product:  "#22C55E",
    category: "#8B5CF6",
    other:    TOKENS.gray,
  };
  const PGT_NAMES = {
    content: "Blog / Content",
    product: "Product / Service",
    category: "Category / Hub",
    other: "Other",
  };

  // 2) Pages With Toxic Links — severity
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

  // 3) Avg. Toxicity Score — distribution buckets
  const BKT: SplitSpec[] = [
    { key: "b0_24", label: "0–24",     baseShare: 0.42 },
    { key: "b25_49",label: "25–49",    baseShare: 0.33 },
    { key: "b50_74",label: "50–74",    baseShare: 0.18 },
    { key: "b75_100",label: "75–100",  baseShare: 0.07 },
  ];
  const BKT_COLORS: Record<string, string> = {
    b0_24:   "#10B981", // green
    b25_49:  "#F59E0B", // amber
    b50_74:  "#F97316", // orange
    b75_100: "#EF4444", // red
  };
  const BKT_NAMES = { b0_24: "0–24", b25_49: "25–49", b50_74: "50–74", b75_100: "75–100" };

  // 4) Pages at High Anchor Risk — anchor types
  const ANK: SplitSpec[] = [
    { key: "money",    label: "Money Anchors",  baseShare: 0.36 },
    { key: "exact",    label: "Exact‑Match",    baseShare: 0.28 },
    { key: "partial",  label: "Partial‑Match",  baseShare: 0.22 },
    { key: "branded",  label: "Branded",        baseShare: 0.14 },
  ];
  const ANK_COLORS: Record<string, string> = {
    money:   "#F97316",
    exact:   "#EF4444",
    partial: "#8B5CF6",
    branded: "#60A5FA",
  };
  const ANK_NAMES = {
    money: "Money Anchors",
    exact: "Exact‑Match",
    partial: "Partial‑Match",
    branded: "Branded",
  };

  /* ------------------------------------------------
     Build stacked rows (snapshot + trend share toggle)
  -------------------------------------------------*/
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  const linkedRows = React.useMemo(() => splitSeries(linkedSP, PGT, 0.05), [linkedSP]);
  const toxicRows  = React.useMemo(() => splitSeries(toxicSP,  SEV, 0.06), [toxicSP]);
  // For score, we treat each day as a “population” split into score buckets for visualization.
  const scoreRows  = React.useMemo(() => splitSeries(mkSeries(scoreSP.length, 200, 0.04), BKT, 0.05), [scoreSP.length]);
  const anchorRows = React.useMemo(() => splitSeries(anchorSP, ANK, 0.05), [anchorSP]);

  /* --------------------------------
     Branded glyphs for each card
  ---------------------------------*/
  const iconSection = <BarChart3 size={20} color={TOKENS.brand} />;
  const iconLinked  = <FileText size={16} color={TOKENS.brand} />;
  const iconToxic   = <Skull size={16} color={TOKENS.brand} />;
  const iconScore   = <Gauge size={16} color={TOKENS.brand} />;
  const iconAnchor  = <LinkIcon size={16} color={TOKENS.brand} />;

  return (
    <section
      className={className}
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* SECTION HEADER */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {iconSection}
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Target pages Summary
          </h3>
          <button
            className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
            title="Each card shows a stacked snapshot and a stacked trend with a smart popover breakdown."
            aria-label="About this section"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Optional compare action (kept API-compatible) */}
          {typeof onCompare === "function" && (
            <button
              type="button"
              onClick={onCompare}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
              title={hasCompetitor ? "Compare with Competitor" : "Add a competitor to enable comparison"}
              style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.brand, cursor: "pointer" }}
            >
              <ArrowRightLeft size={16} />
              <span>Compare</span>
            </button>
          )}

          {/* Trend share chip */}
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

          {/* Export button (required) */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            title="Export KPI Summary"
            style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            onClick={onExport}
          >
            <FileDown size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* GRID: 4 on xl, 2 on lg/sm */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1) Total Linked Pages — page types */}
        <KpiCard
          title="Total Linked Pages"
          info="Snapshot: page types. Trend: type mix over time."
          glyph={iconLinked}
          donut={
            <StackedDonut
              parts={lastParts(linkedRows, ["content", "product", "category", "other"], PGT_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={PGT_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={totalLinkedPages}
          valueFmt={(v) => intFmt.format(v)}
          delta={dLinked}
          trend={
            <TrendStack
              rows={linkedRows}
              keys={["content", "product", "category", "other"]}
              colors={PGT_COLORS}
              names={PGT_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "totalLinkedPages", route: "pages/top", title: "Total Linked Pages" })}
        />

        {/* 2) Pages With Toxic Links — severity */}
        <KpiCard
          title="Pages With Toxic Links"
          info="Snapshot: toxicity severity. Trend: severity mix over time (lower is better)."
          glyph={iconToxic}
          donut={
            <StackedDonut
              parts={lastParts(toxicRows, ["sev_critical", "sev_high", "sev_medium", "sev_low"], SEV_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={SEV_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={pagesWithToxic}
          valueFmt={(v) => intFmt.format(v)}
          delta={dToxic}
          invert
          trend={
            <TrendStack
              rows={toxicRows}
              keys={["sev_critical", "sev_high", "sev_medium", "sev_low"]}
              colors={SEV_COLORS}
              names={SEV_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "pagesWithToxic", route: "pages/toxic", title: "Pages With Toxic Links" })}
        />

        {/* 3) Avg. Toxicity Score — bucketed distribution */}
        <KpiCard
          title="Avg. Toxicity Score"
          info="Snapshot: distribution of page scores. Trend: the same bucket mix over time."
          glyph={iconScore}
          donut={
            <StackedDonut
              parts={lastParts(scoreRows, ["b0_24", "b25_49", "b50_74", "b75_100"], BKT_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={BKT_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={avgToxicityScore}
          valueFmt={(v) => `${Math.max(0, Math.min(100, Math.round(v)))} / 100`}
          delta={dScore}
          deltaUnit="pt"
          trend={
            <TrendStack
              rows={scoreRows}
              keys={["b0_24", "b25_49", "b50_74", "b75_100"]}
              colors={BKT_COLORS}
              names={BKT_NAMES}
              mode="area"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "avgToxicityScore", route: "pages/toxicity", title: "Avg. Toxicity Score" })}
        />

        {/* 4) Pages at High Anchor Risk — anchor types */}
        <KpiCard
          title="Pages at High Anchor Risk"
          info="Snapshot: anchor‑text risk types. Trend: the same mix over time."
          glyph={iconAnchor}
          donut={
            <StackedDonut
              parts={lastParts(anchorRows, ["money", "exact", "partial", "branded"], ANK_COLORS).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={ANK_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={pagesHighAnchor}
          valueFmt={(v) => intFmt.format(v)}
          delta={dAnchor}
          invert
          trend={
            <TrendStack
              rows={anchorRows}
              keys={["money", "exact", "partial", "branded"]}
              colors={ANK_COLORS}
              names={ANK_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() =>
            onNavigate?.({ key: "pagesHighAnchorRisk", route: "pages/anchor-risk", title: "Pages at High Anchor Risk" })
          }
        />
      </div>
    </section>
  );
}

/* Named export for convenience (kept) */
export { TargetPagesKpiCards as TargetPagesSummary };
