"use client";

/**
 * Health Monitor — KPI Summary (Cards)
 * Updates:
 * - Added smart (portaled) popovers for Donut + Trend charts (parity with Section 2)
 * - Removed "Compare" button from header
 * - Export button now uses FileDown icon
 * - Maintains deterministic series (mulberry32 + fixed BASE_NOW_ISO)
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
  BarChart3,
  Info,
  Shield,
  Activity,
  Network,
  Clock3,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  SearchCheck,
  FileDown,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * THEME
 * ---------------------------------------------------------------------------*/
const TOKENS = {
  brand: "#008CCD",          // branded icon color (matches your ref)
  valueBlue: "#0077FF",      // primary metric color
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

/* -----------------------------------------------------------------------------
 * DATES & DETERMINISTIC RNG (hydration-safe)
 * ---------------------------------------------------------------------------*/
const BASE_NOW_ISO = "2025-06-01T00:00:00.000Z";
const BASE_NOW = new Date(BASE_NOW_ISO);
const DAYS = 14;

function addDaysISO(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
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

/* -----------------------------------------------------------------------------
 * TYPES (aligned to your table)
 * ---------------------------------------------------------------------------*/
type LinkStatus = "Active" | "Removed" | "Broken (404)" | "Redirected (3xx)" | "Not Found" | "Not Checked";
type HealthState = "Healthy" | "At Risk" | "Toxic";
type LinkType = "Dofollow" | "Nofollow" | "Sponsored" | "UGC";

export type TrackedBacklinkRow = {
  id: string;
  domain: string;
  sourceUrl: string;
  targetPath: string;
  anchorText: string;
  prevAnchorText?: string;
  anchorChangedAt?: string; // ISO
  linkStatus: LinkStatus;
  statusChangedAt?: string; // ISO
  health: HealthState;
  linkType: LinkType;
  prevLinkType?: LinkType;
  linkTypeChangedAt?: string; // ISO
  wrScore: number;
  prevWrScore?: number;
  wrChangedAt?: string; // ISO
  spamScore: number;
  prevSpamScore?: number;
  spamChangedAt?: string; // ISO
  ipRisk: boolean;
  ip?: string;
  asn?: string;
  ipReason?: string;
  firstSeen: string; // ISO
  lastChecked: string; // ISO
  source: "Audit" | "Manual" | "CSV Upload";
};

type Row = { t: string } & Record<string, any>;

/* -----------------------------------------------------------------------------
 * SMART POPOVER — Portal shell + content for Trend & Donut
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
    <div style={{ position: "fixed", top, left, zIndex: 0, pointerEvents: "none", isolation: "isolate" }}>
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
  colorsMap,
  iconMap,
  valueFmt,
  asShare = false,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  colorsMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  valueFmt?: (v: number) => string;
  asShare?: boolean;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  const rows = (payload ?? []).map((p: any) => {
    const k = (p.name ?? p.dataKey) as string;
    const v = Number(p.value ?? 0);
    const color = colorsMap?.[k] ?? p.color ?? p.fill ?? p.stroke ?? TOKENS.gray;
    return { name: k, value: v, color };
  });

  const total = rows.reduce((s: number, r: any) => s + Number(r.value || 0), 0);
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
        {rows.map((p: any, i: number) => (
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
  parts: { key?: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
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
 * CHART PRIMITIVES (Donut, Trend, Delta)
 * ---------------------------------------------------------------------------*/
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
  const label = unit === "%" || unit === "pp" ? `${Math.abs(delta).toFixed(1)}${unit === "pp" ? "pp" : "%"}`
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
  nameMap,
  iconMap,
  valueFmt,
}: {
  parts: { name: string; value: number; color: string }[];
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

function TrendStack({
  rows,
  keys,
  colors,
  names,
  mode,
  asShare,
  icons,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  mode: "area" | "bars";
  asShare: boolean;
  icons?: Record<string, React.ReactNode>;
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
                  colorsMap={colors}
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
                  colorsMap={colors}
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
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {glyph}
            <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </div>
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info}>
              <Info size={14} />
            </span>
          </div>
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
 * DATA ADAPTERS — derive KPIs from table rows (or fallbacks)
 * ---------------------------------------------------------------------------*/
const COLORS = {
  // health
  healthy: TOKENS.success,
  at_risk: TOKENS.warn,
  toxic: TOKENS.danger,
  // status
  active: TOKENS.success,
  redirected: "#FB923C",
  error: TOKENS.danger,
  not_checked: TOKENS.gray,
  // spam
  spam_low: TOKENS.success,
  spam_med: TOKENS.warn,
  spam_high: TOKENS.danger,
  // ip risk
  ip_flagged: TOKENS.danger,
  ip_clean: TOKENS.gray,
  // freshness
  fresh_7: TOKENS.valueBlue,
  fresh_30: "#5CA8FF",
  stale_30: TOKENS.warn,
  never: TOKENS.gray,
  // indexing
  indexed: TOKENS.success,
  non_indexed: TOKENS.danger,
  unknown: TOKENS.gray,
} as const;

function daysDiff(aISO: string, bISO: string) {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return Math.round((a - b) / 86400000);
}

/** Build a stacked series of length N whose last point equals the snapshot, deterministically jittered. */
function buildRowsFromSnapshot(
  keys: string[],
  snap: Record<string, number>,
  seed = "wr-health",
  n = DAYS
): Row[] {
  const rng = mulberry32(hashSeed(seed));
  const dates = lastNDates(n);
  const totToday = keys.reduce((s, k) => s + (snap[k] || 0), 0);
  // total series around today's total
  const totals = dates.map((_, i) => {
    if (i === n - 1) return totToday;
    const wiggle = 1 + Math.sin(i * 0.35) * 0.06 + (rng() - 0.5) * 0.04;
    return Math.max(0, Math.round(totToday * wiggle));
  });
  // shares per key with small, deterministic jitter; exact at last day
  const baseShares: Record<string, number> = {};
  keys.forEach((k) => (baseShares[k] = totToday ? (snap[k] || 0) / totToday : 0));
  const series: Row[] = [];
  dates.forEach((d, i) => {
    const targetTotal = totals[i];
    const shares: Record<string, number> = {};
    if (i === n - 1) {
      // exact snapshot
      keys.forEach((k) => (shares[k] = baseShares[k]));
    } else {
      let rem = 1;
      keys.forEach((k, idx) => {
        const osc = 1 + Math.sin((i + 1) * (idx + 2) * 0.23) * 0.08 + (rng() - 0.5) * 0.05;
        const raw = clamp01((baseShares[k] || 0) * osc);
        const val = idx === keys.length - 1 ? rem : Math.min(rem, raw);
        rem -= val;
        shares[k] = val;
      });
      // normalize
      const s = keys.reduce((acc, k) => acc + (shares[k] || 0), 0) || 1;
      keys.forEach((k) => (shares[k] = shares[k] / s));
    }
    // multiply by total & round; fix rounding drift with largest remainder
    const vals: Record<string, number> = {};
    const raws = keys.map((k) => ({ k, v: targetTotal * (shares[k] || 0) }));
    const rounded = raws.map((r) => ({ k: r.k, v: Math.floor(r.v), frac: r.v - Math.floor(r.v) }));
    let sum = rounded.reduce((s, r) => s + r.v, 0);
    let rem = targetTotal - sum;
    rounded
      .sort((a, b) => b.frac - a.frac)
      .forEach((r) => {
        if (rem > 0) {
          r.v += 1;
          rem -= 1;
        }
      });
    rounded.forEach((r) => (vals[r.k] = r.v));
    series.push({ t: d, ...vals });
  });
  return series;
}

/* -------------------- COUNTERS FROM ROWS -------------------- */
function countHealth(rows: TrackedBacklinkRow[]) {
  const out = { healthy: 0, at_risk: 0, toxic: 0 };
  rows.forEach((r) => {
    if (r.health === "Healthy") out.healthy++;
    else if (r.health === "At Risk") out.at_risk++;
    else out.toxic++;
  });
  return out;
}
function countStatus(rows: TrackedBacklinkRow[]) {
  const out = { active: 0, redirected: 0, error: 0, not_checked: 0 };
  rows.forEach((r) => {
    if (r.linkStatus === "Active") out.active++;
    else if (r.linkStatus === "Redirected (3xx)") out.redirected++;
    else if (r.linkStatus === "Not Checked") out.not_checked++;
    else out.error++; // Removed, 404, Not Found
  });
  return out;
}
function countSpam(rows: TrackedBacklinkRow[]) {
  const out = { spam_low: 0, spam_med: 0, spam_high: 0 };
  rows.forEach((r) => {
    if (r.spamScore <= 20) out.spam_low++;
    else if (r.spamScore <= 40) out.spam_med++;
    else out.spam_high++;
  });
  return out;
}
function countIpRisk(rows: TrackedBacklinkRow[]) {
  const out = { ip_flagged: 0, ip_clean: 0 };
  rows.forEach((r) => (r.ipRisk ? out.ip_flagged++ : out.ip_clean++));
  return out;
}
function countFreshness(rows: TrackedBacklinkRow[]) {
  const out = { fresh_7: 0, fresh_30: 0, stale_30: 0, never: 0 };
  rows.forEach((r) => {
    if (!r.lastChecked) {
      out.never++;
      return;
    }
    const diff = Math.max(0, daysDiff(BASE_NOW_ISO, r.lastChecked));
    if (diff <= 7) out.fresh_7++;
    else if (diff <= 30) out.fresh_30++;
    else out.stale_30++;
  });
  return out;
}

/* -----------------------------------------------------------------------------
 * PROPS
 * ---------------------------------------------------------------------------*/
type IndexedInput = {
  indexed: number;
  nonIndexed: number;
  unknown: number;
  series?: Array<{ date: string; indexed: number; nonIndexed: number; unknown: number }>;
};

export type HealthKpiProps = {
  rows?: TrackedBacklinkRow[];
  /** Optional precomputed “Google Indexed Links” input. If omitted, we show Unknown = total. */
  indexedData?: IndexedInput;
  defaultShareMode?: boolean;
  onNavigate?: (route: string) => void;
  onExport?: () => void;
  className?: string;
};

/* -----------------------------------------------------------------------------
 * COMPONENT
 * ---------------------------------------------------------------------------*/
export default function SectionHealthMonitorKpiCards({
  rows = [],
  indexedData,
  defaultShareMode = false,
  onNavigate,
  onExport,
  className,
}: HealthKpiProps) {
  const total = rows.length;

  // fallbacks (when no rows are passed)
  const fallbackTotal = 220;
  const healthSnap = total ? countHealth(rows) : { healthy: 146, at_risk: 48, toxic: 26 };
  const statusSnap = total ? countStatus(rows) : { active: 158, redirected: 24, error: 22, not_checked: 16 };
  const spamSnap = total ? countSpam(rows) : { spam_low: 132, spam_med: 58, spam_high: 30 };
  const ipSnap = total ? countIpRisk(rows) : { ip_flagged: 26, ip_clean: 194 };
  const freshSnap = total ? countFreshness(rows) : { fresh_7: 142, fresh_30: 42, stale_30: 18, never: 18 };
  const idxTotal = total || fallbackTotal;

  // build stacked rows (deterministic, last day equals snapshot)
  const healthRows = React.useMemo(
    () => buildRowsFromSnapshot(["healthy", "at_risk", "toxic"], healthSnap as any, "hm-health"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total]
  );
  const statusRows = React.useMemo(
    () => buildRowsFromSnapshot(["active", "redirected", "error", "not_checked"], statusSnap as any, "hm-status"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total]
  );
  const spamRows = React.useMemo(
    () => buildRowsFromSnapshot(["spam_low", "spam_med", "spam_high"], spamSnap as any, "hm-spam"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total]
  );
  const ipRows = React.useMemo(
    () => buildRowsFromSnapshot(["ip_clean", "ip_flagged"], ipSnap as any, "hm-ip"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total]
  );
  const freshRows = React.useMemo(
    () => buildRowsFromSnapshot(["fresh_7", "fresh_30", "stale_30", "never"], freshSnap as any, "hm-fresh"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total]
  );

  // Google Indexed Links
  const idxSnap = React.useMemo(() => {
    if (indexedData) {
      return {
        indexed: Math.max(0, indexedData.indexed),
        non_indexed: Math.max(0, indexedData.nonIndexed),
        unknown: Math.max(0, indexedData.unknown),
      };
    }
    // When not supplied, show Unknown = total
    return { indexed: 0, non_indexed: 0, unknown: idxTotal };
  }, [indexedData, idxTotal]);
  const indexRows = React.useMemo(
    () => buildRowsFromSnapshot(["indexed", "non_indexed", "unknown"], idxSnap as any, "hm-index"),
    [idxSnap.indexed, idxSnap.non_indexed, idxSnap.unknown]
  );

  // Values + deltas (last - prev)
  const last = <T extends Row>(rows: T[]) => rows.at(-1)!;
  const prev = <T extends Row>(rows: T[]) => rows.at(-2)!;

  // 1) Backlink Health — value: Healthy rate %
  const healthyRate = (() => {
    const snapTot = Object.values(healthSnap).reduce((s, v) => s + v, 0) || 1;
    return (healthSnap.healthy / snapTot) * 100;
  })();
  const healthyRatePrev = (() => {
    const a = last(healthRows), b = prev(healthRows);
    const ra = (a.healthy / (a.healthy + a.at_risk + a.toxic || 1)) * 100;
    const rb = (b.healthy / (b.healthy + b.at_risk + b.toxic || 1)) * 100;
    return ra - rb;
  })();

  // 2) Link Status Issues — value: Issues (redirected + error)
  const issuesToday = healthRows.length ? (last(statusRows).redirected + last(statusRows).error) : (statusSnap.redirected + statusSnap.error);
  const issuesDelta = (() => {
    const a = last(statusRows), b = prev(statusRows);
    return (a.redirected + a.error) - (b.redirected + b.error);
  })();

  // 3) Spam Risk — value: High‑risk count
  const spamHighToday = last(spamRows).spam_high;
  const spamHighDelta = last(spamRows).spam_high - prev(spamRows).spam_high;

  // 4) Network Risk — value: IP flagged count
  const ipFlagToday = last(ipRows).ip_flagged;
  const ipFlagDelta = last(ipRows).ip_flagged - prev(ipRows).ip_flagged;

  // 5) Crawl Freshness — value: ≤7d coverage %
  const fresh = last(freshRows);
  const covDen = fresh.fresh_7 + fresh.fresh_30 + fresh.stale_30 + fresh.never || 1;
  const coverage = (fresh.fresh_7 / covDen) * 100;
  const prevFresh = prev(freshRows);
  const covPrev = (prevFresh.fresh_7 / (prevFresh.fresh_7 + prevFresh.fresh_30 + prevFresh.stale_30 + prevFresh.never || 1)) * 100;
  const covDelta = coverage - covPrev;

  // 6) Google Indexed Links — value: Indexed %
  const idx = last(indexRows);
  const idxDen = idx.indexed + idx.non_indexed + idx.unknown || 1;
  const idxRate = (idx.indexed / idxDen) * 100;
  const idxPrev = prev(indexRows);
  const idxRateDelta = (idx.indexed / idxDen) * 100 - (idxPrev.indexed / (idxPrev.indexed + idxPrev.non_indexed + idxPrev.unknown || 1)) * 100;

  // UI state
  const [shareMode, setShareMode] = React.useState<boolean>(defaultShareMode);

  // Names for smart popovers
  const NAMES = {
    health: { healthy: "Healthy", at_risk: "At Risk", toxic: "Toxic" },
    status: { active: "Active", redirected: "Redirected", error: "Errors", not_checked: "Not Checked" },
    spam: { spam_low: "Low (0–20)", spam_med: "Medium (21–40)", spam_high: "High (41+)" },
    ip: { ip_clean: "Clean", ip_flagged: "Flagged" },
    fresh: { fresh_7: "≤7d", fresh_30: "8–30d", stale_30: ">30d", never: "Never" },
    index: { indexed: "Indexed", non_indexed: "Not Indexed", unknown: "Unknown" },
  } as const;

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
        <div className="flex items-center gap-2 px-5 py-2">
          <BarChart3 size={20} color={TOKENS.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Health Monitor — KPI Summary
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
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ accentColor: TOKENS.valueBlue, borderColor: TOKENS.border, cursor: "pointer" }}
            />
            Show % share
          </label>

          {/* Removed Compare button per requirement */}

          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            title="Export Health KPIs"
          >
            <FileDown size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Grid: 3 + 3 (xl), 3 + 3 (lg), 2 (md), 1 (sm) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 px-5 py-2">
        {/* 1) Backlink Health — Healthy / At Risk / Toxic */}
        <KpiCard
          title="Backlink Health"
          info="Share of backlinks by health label. Lower At‑Risk/Toxic is better."
          glyph={<Activity size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "Healthy", value: healthSnap.healthy, color: COLORS.healthy },
                { name: "At Risk", value: healthSnap.at_risk, color: COLORS.at_risk },
                { name: "Toxic", value: healthSnap.toxic, color: COLORS.toxic },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={healthyRate}
          valueFmt={(v) => `${v.toFixed(1)}%`}
          delta={healthyRatePrev}
          deltaUnit="pp"
          trend={
            <TrendStack
              rows={healthRows}
              keys={["healthy", "at_risk", "toxic"]}
              colors={{ healthy: COLORS.healthy, at_risk: COLORS.at_risk, toxic: COLORS.toxic }}
              names={NAMES.health}
              mode="area"
              asShare={shareMode}
            />
          }
          onClick={() => onNavigate?.("health/overview")}
        />

        {/* 2) Link Status — issues */}
        <KpiCard
          title="Link Status — Issues"
          info="Links currently redirected or in error states (404, removed, not found)."
          glyph={<AlertTriangle size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "Active", value: statusSnap.active, color: COLORS.active },
                { name: "Redirected", value: statusSnap.redirected, color: COLORS.redirected },
                { name: "Errors", value: statusSnap.error, color: COLORS.error },
                { name: "Not Checked", value: statusSnap.not_checked, color: COLORS.not_checked },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={issuesToday}
          valueFmt={(v) => intFmt.format(v)}
          delta={issuesDelta}
          invert
          trend={
            <TrendStack
              rows={statusRows}
              keys={["active", "redirected", "error", "not_checked"]}
              colors={{
                active: COLORS.active,
                redirected: COLORS.redirected,
                error: COLORS.error,
                not_checked: COLORS.not_checked,
              }}
              names={NAMES.status}
              mode="bars"
              asShare={shareMode}
            />
          }
          onClick={() => onNavigate?.("health/status")}
        />

        {/* 3) Spam Risk */}
        <KpiCard
          title="Spam Risk"
          info="Domain/page signals bucketed by spam score."
          glyph={<Shield size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "Low (0–20)", value: spamSnap.spam_low, color: COLORS.spam_low },
                { name: "Medium (21–40)", value: spamSnap.spam_med, color: COLORS.spam_med },
                { name: "High (41+)", value: spamSnap.spam_high, color: COLORS.spam_high },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={spamHighToday}
          valueFmt={(v) => intFmt.format(v)}
          delta={spamHighDelta}
          invert
          trend={
            <TrendStack
              rows={spamRows}
              keys={["spam_low", "spam_med", "spam_high"]}
              colors={{ spam_low: COLORS.spam_low, spam_med: COLORS.spam_med, spam_high: COLORS.spam_high }}
              names={NAMES.spam}
              mode="area"
              asShare={shareMode}
            />
          }
          onClick={() => onNavigate?.("health/spam")}
        />

        {/* 4) Network Risk (IP/ASN) */}
        <KpiCard
          title="Network Risk (IP/ASN)"
          info="Backlinks flagged for shared IP pools, suspicious ASNs, or PBN indicators."
          glyph={<Network size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "Flagged", value: ipSnap.ip_flagged, color: COLORS.ip_flagged },
                { name: "Clean", value: ipSnap.ip_clean, color: COLORS.ip_clean },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={ipFlagToday}
          valueFmt={(v) => intFmt.format(v)}
          delta={ipFlagDelta}
          invert
          trend={
            <TrendStack
              rows={ipRows}
              keys={["ip_clean", "ip_flagged"]}
              colors={{ ip_clean: COLORS.ip_clean, ip_flagged: COLORS.ip_flagged }}
              names={NAMES.ip}
              mode="bars"
              asShare={shareMode}
            />
          }
          onClick={() => onNavigate?.("health/network")}
        />

        {/* 5) Crawl Freshness */}
        <KpiCard
          title="Crawl Freshness"
          info="When backlinks were last checked. Aim for higher ≤7d coverage."
          glyph={<Clock3 size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "≤7d", value: freshSnap.fresh_7, color: COLORS.fresh_7 },
                { name: "8–30d", value: freshSnap.fresh_30, color: COLORS.fresh_30 },
                { name: ">30d", value: freshSnap.stale_30, color: COLORS.stale_30 },
                { name: "Never", value: freshSnap.never, color: COLORS.never },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={coverage}
          valueFmt={(v) => `${v.toFixed(1)}%`}
          delta={covDelta}
          deltaUnit="pp"
          trend={
            <TrendStack
              rows={freshRows}
              keys={["fresh_7", "fresh_30", "stale_30", "never"]}
              colors={{
                fresh_7: COLORS.fresh_7,
                fresh_30: COLORS.fresh_30,
                stale_30: COLORS.stale_30,
                never: COLORS.never,
              }}
              names={NAMES.fresh}
              mode="area"
              asShare={shareMode}
            />
          }
          onClick={() => onNavigate?.("health/freshness")}
        />

        {/* 6) Google Indexed Links (extra) */}
        <KpiCard
          title="Google Indexed Links"
          info="Share of tracked backlinks whose source pages are indexed in Google."
          glyph={<SearchCheck size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={[
                { name: "Indexed", value: idxSnap.indexed, color: COLORS.indexed },
                { name: "Not Indexed", value: idxSnap.non_indexed, color: COLORS.non_indexed },
                { name: "Unknown", value: idxSnap.unknown, color: COLORS.unknown },
              ]}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={idxRate}
          valueFmt={(v) => `${v.toFixed(1)}%`}
          delta={idxRateDelta}
          deltaUnit="pp"
          trend={
            <TrendStack
              rows={indexRows}
              keys={["indexed", "non_indexed", "unknown"]}
              colors={{ indexed: COLORS.indexed, non_indexed: COLORS.non_indexed, unknown: COLORS.unknown }}
              names={NAMES.index}
              mode="bars"
              asShare={shareMode}
            />
          }
          onClick={() => onNavigate?.("health/indexing")}
        />
      </div>
    </section>
  );
}
