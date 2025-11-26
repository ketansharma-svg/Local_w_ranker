"use client";

/**
 * SECTION 2 — Indexing Progress & KPIs
 * -----------------------------------------------------------------------------
 * Drop‑in React + Tailwind TSX that follows the same KPI card shell/micro‑charts
 * pattern as the provided Section 1 reference:
 *  - Card shell: rounded-[10px], border, shadow-sm, hover lift
 *  - Layout: 2‑up (tablet), 3‑up (desktop), gap-3
 *  - Donut (left) / Big value + delta (center) / Trend micro‑chart (right)
 *  - Branded header icons (#008CCD), value color #0077FF
 *  - Header controls: "Show % share" toggle + Export (FileDown)
 *  - Cards are <button> with focus ring ring-[#0077FF]/40
 *  - Smart portal tooltips for donut + trend; colored dot annotations, no CTAs
 *
 * Data model:
 *   type Kpi = { value: number; trend?: number; series?: Array<number | { x: string | number | Date; y: number }> };
 *   type IndexKpis = {
 *     submitted: Kpi & { breakdown?: Record<'paste'|'file'|'api', number> };
 *     indexable: Kpi & { breakdown?: Record<'indexable'|'non_indexable', number> };
 *     indexed: Kpi & { breakdown?: Record<'google'|'bing', number> };
 *     avgTimeToIndex: Kpi & { unit: 'h'|'d'; breakdown?: Record<'0-1d'|'1-3d'|'3-7d'|'7d+', number> };
 *     failures: Kpi & { breakdown?: Record<'rate_limited'|'fetch_fail'|'not_found'|'blocked', number> };
 *   };
 *
 * NEW:
 * - Built‑in MOCK_INDEXING_KPIS fallback. If you render the component without the `data` prop,
 *   it will use the mock dataset below so the section "just works" in a blank page.
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
} from "recharts";
import { createPortal } from "react-dom";
import {
  Upload,
  SearchCheck,
  Globe,
  Clock3,
  AlertTriangle,
  FileDown,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Info,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* THEME & UTILS                                                              */
/* -------------------------------------------------------------------------- */

const TOKENS = {
  brand: "#008CCD",     // branded icon color
  valueBlue: "#0077FF", // metric value color
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

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

/** Deterministic base for last 14 completed days (parity w/ Section 1) */
const BASE_NOW_ISO = "2025-06-01T00:00:00.000Z";
const DAYS = 14;

function lastNDates(n = DAYS, endISO = BASE_NOW_ISO): string[] {
  const end = new Date(endISO);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - (n - 1));
  const xs: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    xs.push(d.toISOString().slice(0, 10));
  }
  return xs;
}
function hashSeed(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type Kpi = {
  value: number;
  trend?: number;
  series?: Array<number | { x: string | number | Date; y: number }>;
};

export type IndexKpis = {
  submitted: Kpi & { breakdown?: Record<"paste" | "file" | "api", number> };
  indexable: Kpi & { breakdown?: Record<"indexable" | "non_indexable", number> };
  indexed: Kpi & { breakdown?: Record<"google" | "bing", number> };
  avgTimeToIndex: Kpi & { unit: "h" | "d"; breakdown?: Record<"0-1d" | "1-3d" | "3-7d" | "7d+", number> };
  failures: Kpi & { breakdown?: Record<"rate_limited" | "fetch_fail" | "not_found" | "blocked", number> };
};

type Row = { t: string } & Record<string, number|any>;

/* -------------------------------------------------------------------------- */
/* CATEGORY COLORS (per spec)                                                 */
/* -------------------------------------------------------------------------- */
const CAT = {
  // Submitted
  paste: "#5CA8FF",
  file: "#0077FF",
  api: "#10B981",
  // Indexable
  indexable: "#10B981",
  non_indexable: "#EF4444",
  // Indexed engines
  google: "#22C55E",
  bing: "#06B6D4",
  // Time to index bands
  "0-1d": "#10B981",
  "1-3d": "#5CA8FF",
  "3-7d": "#F59E0B",
  "7d+": "#EF4444",
  // Failures
  rate_limited: "#F59E0B",
  fetch_fail: "#EF4444",
  not_found: "#9CA3AF",
  blocked: "#6366F1",
} as const;

/* -------------------------------------------------------------------------- */
/* MOCK DATA (used when no `data` prop is supplied)                           */
/* -------------------------------------------------------------------------- */

const MOCK_INDEXING_KPIS: IndexKpis = {
  submitted: {
    value: 0, // not shown (we compute from series)
    breakdown: { paste: 155, file: 265, api: 110 }, // snapshot for donut (last day shares)
    series: Array.from({ length: 20 }, (_, i) => 420 + Math.round(Math.sin(i * 0.45) * 55) + (i % 3 === 0 ? 20 : 0)),
  },
  indexable: {
    value: 0,
    breakdown: { indexable: 820, non_indexable: 180 }, // 82% indexable
    series: Array.from({ length: 20 }, (_, i) => 900 + Math.round(Math.cos(i * 0.35) * 60)),
  },
  indexed: {
    value: 0,
    breakdown: { google: 95, bing: 35 }, // 130 newly indexed yesterday
    series: Array.from({ length: 20 }, (_, i) => 110 + Math.round(Math.sin(i * 0.3) * 18) + (i % 4 === 0 ? 12 : 0)),
  },
  avgTimeToIndex: {
    value: 1.7, // days
    unit: "d",
    breakdown: { "0-1d": 540, "1-3d": 310, "3-7d": 120, "7d+": 40 },
    series: Array.from({ length: 20 }, (_, i) => 1.6 + Math.sin(i * 0.25) * 0.18 + (i % 7 === 0 ? 0.05 : 0)),
  },
  failures: {
    value: 0,
    breakdown: { rate_limited: 14, fetch_fail: 17, not_found: 6, blocked: 4 }, // 41 yesterday
    series: Array.from({ length: 20 }, (_, i) => 33 + Math.round(Math.cos(i * 0.29) * 6)),
  },
};

/* -------------------------------------------------------------------------- */
/* SMART POPOVERS (portal tooltips)                                           */
/* -------------------------------------------------------------------------- */

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
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none" }}>
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
  valueFmt,
  asShare = false,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  asShare?: boolean;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  const rows = (payload ?? []).map((p: any) => {
    const k = (p.name ?? p.dataKey) as string;
       const v = Number(p.value ?? 0);
    const color = p.color ?? p.fill ?? p.stroke ?? TOKENS.gray;
    return { name: k, value: v, color };
  });
  const total = rows.reduce((s: number, r: any) => s + Number(r.value || 0), 0);
  const fmt = valueFmt ?? ((vv: number) => (asShare ? pctFmt(vv, 1) : intFmt.format(Math.round(vv))));

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
        {rows.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
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
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  const sorted = [...parts].sort((a, b) => (b.value || 0) - (a.value || 0));
  const highlightName = sorted[0]?.name;

  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {sorted.map((p, i) => {
          const isActive = p.name === highlightName;
          return (
            <div
              key={i}
              className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}
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

/* -------------------------------------------------------------------------- */
/* CHART PRIMITIVES                                                            */
/* -------------------------------------------------------------------------- */

function DeltaBadge({ delta, unit = "", invert = false }: { delta?: number; unit?: "" | "%" | "pp"; invert?: boolean }) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TOKENS.muted }}>
        <Minus size={14} /> —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TOKENS.muted : good ? TOKENS.success : TOKENS.danger;
  const label =
    unit === "%" || unit === "pp"
      ? `${Math.abs(delta).toFixed(1)}${unit === "pp" ? "pp" : "%"}`
      : intFmt.format(Math.round(Math.abs(delta)));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function StackedDonut({
  parts,
  size = 92,
  valueFmt,
}: {
  parts: { name: string; value: number; color: string }[];
  size?: number;
  valueFmt?: (n: number) => string;
}) {
  const allZero = parts.every((p) => (p.value ?? 0) === 0);
  const data = allZero ? [{ name: "No data", value: 1, color: TOKENS.gray }] : parts;
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
                valueFmt={valueFmt}
              />
            )}
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={false}
          />
          <Pie
            data={data}
            dataKey="value"
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

function TrendStack({
  rows,
  keys,
  colors,
  names,
  mode,
  asShare,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  mode: "area" | "bars";
  asShare: boolean;
}) {
  const data = React.useMemo(() => {
    if (!asShare) return rows;
    return rows.map((r) => {
      const total = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
      const out: Row = { t: r.t };
      keys.forEach((k) => (out[k] = (Number(r[k] || 0) / total) * 100));
      return out;
    });
  }, [rows, keys, asShare]);

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
              <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[k]} fill={colors[k]} fillOpacity={0.24} strokeWidth={2} dot={false} />
            ))}
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
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  title,
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
  glyph: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp";
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
        <div className="mb-2 flex items-center gap-2">
          {glyph}
          <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.text }}>
            {title}
          </div>
          <span className="inline-flex items-center pl-1 text-[#9CA3AF]">
            <Info size={14} />
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight" aria-live="polite">
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

/* -------------------------------------------------------------------------- */
/* SERIES BUILDERS (deterministic when missing)                               */
/* -------------------------------------------------------------------------- */

function normalizeTotals(series?: Kpi["series"]): number[] | null {
  if (!series || !Array.isArray(series) || series.length === 0) return null;
  const nums = series.map((p) => (typeof p === "number" ? p : Number((p as any).y))).filter((n) => Number.isFinite(n)) as number[];
  if (!nums.length) return null;
  // last 14 completed days
  const tail = nums.slice(-DAYS);
  return tail.length < DAYS ? Array(DAYS - tail.length).fill(tail[0] ?? 0).concat(tail) : tail;
}

/** Build stacked daily rows using provided totals (or inferred), with snapshot exact on last day. */
function buildStackedFromSnapshot(
  keys: string[],
  snapshot: Record<string, number> | undefined,
  totals: number[] | null,
  seed: string
): Row[] {
  const dates = lastNDates(DAYS);
  // If totals missing, make deterministic total series around snapshot total
  const totSnap = keys.reduce((s, k) => s + (snapshot?.[k] || 0), 0);
  const rng = mulberry32(hashSeed(seed));
  const seriesTotals =
    totals ??
    dates.map((_, i) => {
      if (i === DAYS - 1) return totSnap;
      const wiggle = 1 + Math.sin(i * 0.35) * 0.06 + (rng() - 0.5) * 0.04;
      return Math.max(0, Math.round(totSnap * wiggle));
    });

  // shares base from snapshot (exact for last day)
  const baseShares: Record<string, number> = {};
  keys.forEach((k) => (baseShares[k] = totSnap ? (snapshot?.[k] || 0) / totSnap : 0));

  const out: Row[] = [];
  for (let i = 0; i < DAYS; i++) {
    const t = dates[i];
    const total = seriesTotals[i] || 0;

    let shares: Record<string, number> = {};
    if (i === DAYS - 1) {
      shares = { ...baseShares };
    } else {
      // small jitter around base shares
      let rem = 1;
      keys.forEach((k, idx) => {
        const osc = 1 + Math.sin((i + 1) * (idx + 2) * 0.19) * 0.08 + (rng() - 0.5) * 0.05;
        const raw = clamp01((baseShares[k] || 0) * osc);
        const val = idx === keys.length - 1 ? rem : Math.min(rem, raw);
        rem -= val;
        shares[k] = val;
      });
      // normalize
      const s = keys.reduce((acc, k) => acc + (shares[k] || 0), 0) || 1;
      keys.forEach((k) => (shares[k] = shares[k] / s));
    }

    // allocate integers w/ largest remainder method
    const raws = keys.map((k) => ({ k, v: total * (shares[k] || 0) }));
    const rounded = raws.map((r) => ({ k: r.k, v: Math.floor(r.v), frac: r.v - Math.floor(r.v) }));
    let sum = rounded.reduce((ss, r) => ss + r.v, 0);
    let rem = total - sum;
    rounded.sort((a, b) => b.frac - a.frac).forEach((r) => {
      if (rem > 0) {
        r.v += 1;
        rem -= 1;
      }
    });

    const row: Row = { t };
    rounded.forEach((r) => (row[r.k] = r.v));
    out.push(row);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* PROPS                                                                      */
/* -------------------------------------------------------------------------- */

export type IndexingKpiProps = {
  data?: IndexKpis | null; // optional — uses MOCK_INDEXING_KPIS when omitted
  defaultShareMode?: boolean;
  onExport?: () => void;
  onNavigate?: (href: string) => void;
  className?: string;
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function SectionIndexingProgressKpis({
  data,
  defaultShareMode = true,
  onExport,
  onNavigate,
  className,
}: IndexingKpiProps) {
  // Normalize/guard incoming data so runtime never crashes if undefined/null/partial.
  const d: IndexKpis = React.useMemo<IndexKpis>(() => {
    const s: any = data ?? MOCK_INDEXING_KPIS; // <— use mock when no data provided
    const safeSeries = (v: any) => (Array.isArray(v) ? v : undefined);
    const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const unit = s?.avgTimeToIndex?.unit === "h" ? "h" : "d";
    return {
      submitted: {
        value: n(s?.submitted?.value),
        breakdown: {
          paste: n(s?.submitted?.breakdown?.paste),
          file: n(s?.submitted?.breakdown?.file),
          api: n(s?.submitted?.breakdown?.api),
        },
        series: safeSeries(s?.submitted?.series),
      },
      indexable: {
        value: n(s?.indexable?.value),
        breakdown: {
          indexable: n(s?.indexable?.breakdown?.indexable),
          non_indexable: n(s?.indexable?.breakdown?.non_indexable),
        },
        series: safeSeries(s?.indexable?.series),
      },
      indexed: {
        value: n(s?.indexed?.value),
        breakdown: {
          google: n(s?.indexed?.breakdown?.google),
          bing: n(s?.indexed?.breakdown?.bing),
        },
        series: safeSeries(s?.indexed?.series),
      },
      avgTimeToIndex: {
        value: n(s?.avgTimeToIndex?.value),
        unit,
        breakdown: {
          "0-1d": n(s?.avgTimeToIndex?.breakdown?.["0-1d"]),
          "1-3d": n(s?.avgTimeToIndex?.breakdown?.["1-3d"]),
          "3-7d": n(s?.avgTimeToIndex?.breakdown?.["3-7d"]),
          "7d+": n(s?.avgTimeToIndex?.breakdown?.["7d+"]),
        },
        series: safeSeries(s?.avgTimeToIndex?.series),
      },
      failures: {
        value: n(s?.failures?.value),
        breakdown: {
          rate_limited: n(s?.failures?.breakdown?.rate_limited),
          fetch_fail: n(s?.failures?.breakdown?.fetch_fail),
          not_found: n(s?.failures?.breakdown?.not_found),
          blocked: n(s?.failures?.breakdown?.blocked),
        },
        series: safeSeries(s?.failures?.series),
      },
    };
  }, [data]);

  // Analytics (lightweight)
  React.useEffect(() => {
    try {
      (window as any)?.console?.debug?.("kpi_section_viewed", { section: "indexing_kpis" });
    } catch {}
  }, []);

  const [shareMode, setShareMode] = React.useState<boolean>(defaultShareMode);
  const go = (href: string) => {
    (window as any)?.console?.debug?.("kpi_card_clicked", { id: href });
    if (onNavigate) onNavigate(href);
    else if (typeof window !== "undefined") window.location.assign(href);
  };

  /* ---------------------------- Build rows per KPI ---------------------------- */

  // A) Submitted
  const submittedKeys = ["paste", "file", "api"] as const;
  const submittedRows = React.useMemo(
    () =>
      buildStackedFromSnapshot(
        submittedKeys as unknown as string[],
        d.submitted.breakdown,
        normalizeTotals(d.submitted.series),
        "idx-submitted"
      ),
    [d]
  );

  // B) Indexable (share card)
  const indexableKeys = ["indexable", "non_indexable"] as const;
  const indexableRows = React.useMemo(
    () =>
      buildStackedFromSnapshot(
        indexableKeys as unknown as string[],
        d.indexable.breakdown,
        normalizeTotals(d.indexable.series),
        "idx-indexable"
      ),
    [d]
  );

  // C) Indexed (engines)
  const indexedKeys = ["google", "bing"] as const;
  const indexedRows = React.useMemo(
    () =>
      buildStackedFromSnapshot(
        indexedKeys as unknown as string[],
        d.indexed.breakdown,
        normalizeTotals(d.indexed.series),
        "idx-indexed"
      ),
    [d]
  );

  // D) Avg time to index (single series bars; donut uses bands)
  const timeRows = React.useMemo(() => {
    const totals = normalizeTotals(d.avgTimeToIndex.series);
    if (totals) {
      const dates = lastNDates(DAYS);
      // parenthesized nullish to avoid ?? with ||
      return dates.map((t, i) => {
        const fallback = totals[totals.length - 1];
        const val = (totals[i] ?? fallback) ?? 0;
        return { t, avg: val };
      }) as Row[];
    } else {
      const v = Number(d.avgTimeToIndex.value || 0);
      const rng = mulberry32(hashSeed("idx-avg-time"));
      const dates = lastNDates(DAYS);
      return dates.map((t, i) => {
        const wiggle = 1 + Math.sin(i * 0.37) * 0.06 + (rng() - 0.5) * 0.06;
        return { t, avg: Math.max(0, Number((v * wiggle).toFixed(2))) };
      }) as Row[];
    }
  }, [d]);

  // E) Failures
  const failureKeys = ["rate_limited", "fetch_fail", "not_found", "blocked"] as const;
  const failureRows = React.useMemo(
    () =>
      buildStackedFromSnapshot(
        failureKeys as unknown as string[],
        d.failures.breakdown,
        normalizeTotals(d.failures.series),
        "idx-failures"
      ),
    [d]
  );

  // helpers
  const last = <T extends Row>(rows: T[]) => rows.at(-1)!;
  const prev = <T extends Row>(rows: T[]) => rows.at(-2)!;

  /* ------------------------------ Values & Delta ----------------------------- */

  // Submitted — last day total & DoD delta
  const submittedToday = submittedRows.length
    ? submittedKeys.reduce((s, k) => s + (last(submittedRows)[k] || 0), 0)
    : d.submitted.value || 0;
  const submittedPrev = submittedRows.length
    ? submittedKeys.reduce((s, k) => s + (prev(submittedRows)[k] || 0), 0)
    : 0;
  const submittedDelta = submittedToday - submittedPrev;

  // Indexable — value: % indexable of latest snapshot; delta: pp change vs prev
  const idxL = last(indexableRows);
  const idxP = prev(indexableRows);
  const idxDenL = (idxL.indexable || 0) + (idxL.non_indexable || 0) || 1;
  const idxDenP = (idxP.indexable || 0) + (idxP.non_indexable || 0) || 1;
  const indexablePct = ((idxL.indexable || 0) / idxDenL) * 100;
  const indexablePctDelta = ((idxL.indexable || 0) / idxDenL) * 100 - ((idxP.indexable || 0) / idxDenP) * 100;

  // Indexed — daily new indexed (sum engines) & DoD delta
  const indL = last(indexedRows);
  const indP = prev(indexedRows);
  const newlyIndexedToday = indexedKeys.reduce((s, k) => s + (indL as any)[k], 0);
  const newlyIndexedPrev = indexedKeys.reduce((s, k) => s + (indP as any)[k], 0);
  const indexedDelta = newlyIndexedToday - newlyIndexedPrev;

  // Avg time to index — value uses provided unit, delta is DoD change (invert good)
  const timeToday = (last(timeRows) as any).avg || 0;
  const timePrev = (prev(timeRows) as any).avg || 0;
  const timeDelta = timeToday - timePrev;
  const timeUnit = d.avgTimeToIndex.unit;

  // Failures — failures yesterday & DoD delta (invert good)
  const failL = last(failureRows);
  const failP = prev(failureRows);
  const failuresToday = failureKeys.reduce((s, k) => s + (failL[k] || 0), 0);
  const failuresPrev = failureKeys.reduce((s, k) => s + (failP[k] || 0), 0);
  const failuresDelta = failuresToday - failuresPrev;

  // Names for tooltips
  const NAMES = {
    submitted: { paste: "Paste", file: "File", api: "API" },
    indexable: { indexable: "Indexable", non_indexable: "Non‑indexable" },
    indexed: { google: "Google", bing: "Bing" },
    failures: { rate_limited: "Rate limited", fetch_fail: "Fetch fail", not_found: "Not found", blocked: "Blocked" },
    tti: { avg: "Avg time to index" },
  } as const;

  const onShareToggle = (checked: boolean) => {
    setShareMode(checked);
    try {
      (window as any)?.console?.debug?.("kpi_share_toggled", { share: checked });
    } catch {}
  };

  /* --------------------------------- RENDER --------------------------------- */

  return (
    <section
      className="mt-4 px-2"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload size={20} color={TOKENS.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Indexing Progress & KPIs
          </h3>
          <button
            className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
            title="Snapshot donuts mirror the same stacked categories used in the trends."
          >
            <Info size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label
            className="inline-flex items-center gap-2 text-xs rounded-full border px-3 py-1.5"
            style={{ color: TOKENS.muted, borderColor: TOKENS.border, cursor: "pointer", background: "#FFFFFF" }}
            title="Toggle trends between absolute values and % share"
          >
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => onShareToggle(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ accentColor: TOKENS.valueBlue, borderColor: TOKENS.border, cursor: "pointer" }}
            />
            Show % share
          </label>

          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            title="Export Indexing KPIs"
          >
            <FileDown size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* A) Submitted */}
        {/* <KpiCard
          title="Submitted"
          glyph={<Upload size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "paste", value: d.submitted.breakdown?.paste ?? 0, color: CAT.paste },
                { name: "file", value: d.submitted.breakdown?.file ?? 0, color: CAT.file },
                { name: "api", value: d.submitted.breakdown?.api ?? 0, color: CAT.api },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={submittedToday}
          valueFmt={(v) => intFmt.format(v)}
          delta={submittedDelta}
          trend={
            <TrendStack
              rows={submittedRows}
              keys={["paste", "file", "api"]}
              colors={{ paste: CAT.paste, file: CAT.file, api: CAT.api }}
              names={NAMES.submitted as any}
              mode="bars"
              asShare={shareMode}
            />
          }
          onClick={() => go("/indexing/submissions?range=last_14d")}
        /> */}

        {/* B) Indexable (share default) */}
        <KpiCard
          title="Indexable"
          glyph={<SearchCheck size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "indexable", value: d.indexable.breakdown?.indexable ?? 0, color: CAT.indexable },
                { name: "non_indexable", value: d.indexable.breakdown?.non_indexable ?? 0, color: CAT.non_indexable },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={indexablePct}
          valueFmt={(v) => `${v.toFixed(1)}%`}
          delta={indexablePctDelta}
          deltaUnit="pp"
          trend={
            <TrendStack
              rows={indexableRows}
              keys={["indexable", "non_indexable"]}
              colors={{ indexable: CAT.indexable, non_indexable: CAT.non_indexable }}
              names={NAMES.indexable as any}
              mode="area"
              asShare={shareMode}
            />
          }
          onClick={() => go("/indexing/precheck?indexable=false&range=last_14d")}
        />

        {/* C) Indexed */}
        <KpiCard
          title="Indexed"
          glyph={<Globe size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "google", value: d.indexed.breakdown?.google ?? 0, color: CAT.google },
                { name: "bing", value: d.indexed.breakdown?.bing ?? 0, color: CAT.bing },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={newlyIndexedToday}
          valueFmt={(v) => intFmt.format(v)}
          delta={indexedDelta}
          trend={
            <TrendStack
              rows={indexedRows}
              keys={["google", "bing"]}
              colors={{ google: CAT.google, bing: CAT.bing }}
              names={{ google: "Google", bing: "Bing" }}
              mode="bars"
              asShare={shareMode}
            />
          }
          onClick={() => go("/indexing/results?status=indexed&range=last_14d")}
        />

        {/* D) Avg time to index */}
        <KpiCard
          title="Avg Time to Index"
          glyph={<Clock3 size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "0-1d", value: d.avgTimeToIndex.breakdown?.["0-1d"] ?? 0, color: CAT["0-1d"] },
                { name: "1-3d", value: d.avgTimeToIndex.breakdown?.["1-3d"] ?? 0, color: CAT["1-3d"] },
                { name: "3-7d", value: d.avgTimeToIndex.breakdown?.["3-7d"] ?? 0, color: CAT["3-7d"] },
                { name: "7d+", value: d.avgTimeToIndex.breakdown?.["7d+"] ?? 0, color: CAT["7d+"] },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={timeToday}
          valueFmt={(v) => (timeUnit === "h" ? `${Number(v).toFixed(1)}h` : `${Number(v).toFixed(1)}d`)}
          delta={timeDelta}
          invert
          trend={
            <div className="h-16 min-w-[160px]" role="img" aria-label="Avg time to index trend">
              <ResponsiveContainer>
                <BarChart data={timeRows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="t" hide />
                  <YAxis hide />
                  <RTooltip
                    content={(tp: any) => {
                      const { active, label, payload, coordinate } = tp || {};
                      const rect = (tp?.payload && document.querySelector(".recharts-wrapper")) as any;
                      const fmt = (n: number) => (timeUnit === "h" ? `${n.toFixed(1)}h` : `${n.toFixed(1)}d`);
                      return (
                        <PortalTooltipShell
                          x={(coordinate?.x ?? 0) + (rect?.getBoundingClientRect?.().left ?? 0) + 12}
                          y={(coordinate?.y ?? 0) + (rect?.getBoundingClientRect?.().top ?? 0) + 12}
                          width={220}
                        >
                          {active && (
                            <div>
                              <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
                                {typeof label === "string" ? toDateLabel(label) : String(label)}
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TOKENS.valueBlue }} />
                                  <span style={{ color: TOKENS.muted }}>Avg time to index</span>
                                </div>
                                <div className="font-semibold">{fmt(Number(payload?.[0]?.value || 0))}</div>
                              </div>
                            </div>
                          )}
                        </PortalTooltipShell>
                      );
                    }}
                    wrapperStyle={{ visibility: "hidden" }}
                    allowEscapeViewBox={{ x: true, y: true }}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />
                  <Bar dataKey="avg" fill={TOKENS.valueBlue} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
          onClick={() => go("/indexing/results?sort=time_to_index_desc&range=last_14d")}
        />

        {/* E) Failures */}
        <KpiCard
          title="Failures"
          glyph={<AlertTriangle size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "rate_limited", value: d.failures.breakdown?.rate_limited ?? 0, color: CAT.rate_limited },
                { name: "fetch_fail", value: d.failures.breakdown?.fetch_fail ?? 0, color: CAT.fetch_fail },
                { name: "not_found", value: d.failures.breakdown?.not_found ?? 0, color: CAT.not_found },
                { name: "blocked", value: d.failures.breakdown?.blocked ?? 0, color: CAT.blocked },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={failuresToday}
          valueFmt={(v) => intFmt.format(v)}
          delta={failuresDelta}
          invert
          trend={
            <TrendStack
              rows={failureRows}
              keys={["rate_limited", "fetch_fail", "not_found", "blocked"]}
              colors={{
                rate_limited: CAT.rate_limited,
                fetch_fail: CAT.fetch_fail,
                not_found: CAT.not_found,
                blocked: CAT.blocked,
              }}
              names={{ rate_limited: "Rate limited", fetch_fail: "Fetch fail", not_found: "Not found", blocked: "Blocked" }}
              mode="bars"
              asShare={shareMode}
            />
          }
          onClick={() => go("/indexing/results?status=failed,rate_limited&range=last_14d")}
        />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick demo export — drop into any page to preview                          */
/* -------------------------------------------------------------------------- */

export function DemoIndexingKpis() {
  return (
    <div className="p-4 bg-[#F5F7FA]">
      {/* With no props, the section uses the mock dataset */}
      <SectionIndexingProgressKpis
        defaultShareMode={true}
        onExport={() => alert("Export KPIs")}
      />
    </div>
  );
}


