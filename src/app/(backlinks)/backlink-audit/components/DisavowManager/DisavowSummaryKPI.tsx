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
  ShieldCheck,
  Link2Off,
  ClipboardList,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* =============================================================================
   TOKENS / THEME
============================================================================= */
const TOKENS = {
  brand: "#008CCD",     // branded icons for section/card titles
  valueBlue: "#0077FF", // primary numeric color
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  chipBg: "#F5F7FA",
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;

/* =============================================================================
   TYPES — same inputs as your original Section 1
============================================================================= */
type SeriesPoint = { date: string; value: number };
type Delta = { raw: number } | null;

export type DisavowSummaryData = {
  totalDomains: { count: number; series?: SeriesPoint[] };        // KPI #1
  totalUrls:    { count: number; series?: SeriesPoint[] };        // KPI #2
  pending:      { count: number; highToxic?: number; series?: SeriesPoint[] }; // KPI #3
  wrGain:       { pct: number; series?: SeriesPoint[]; explain?: string };     // KPI #4
};

export type DisavowSummaryProps = {
  data: DisavowSummaryData;
  onJump: (dest: "active-domains" | "active-urls" | "queue" | "wr-impact") => void;
  onExport?: () => void;
  className?: string;
};

/* =============================================================================
   SAFE FALLBACKS + UTILS
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
function mkSeries(len = DAYS, start = 100, amp = 0.12): SeriesPoint[] {
  const startISO = addDays(todayISO(), -(len - 1));
  return Array.from({ length: len }, (_, i) => {
    const iso = addDays(startISO, i);
    const w = 1 + Math.sin(i * 0.5) * amp + (Math.random() - 0.5) * 0.12;
    return { date: iso, value: Math.max(0, Math.round(start * w)) };
  });
}
const deltaFrom = (s?: SeriesPoint[]) =>
  !s || s.length < 2 ? null : ({ raw: (s[s.length - 1]!.value - s[s.length - 2]!.value) });
const toDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });

/* =============================================================================
   STACK HELPERS — create synthetic breakdowns from totals (donut + trend)
   (No API changes required: works with your existing total series.)
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

/* last point parts — absolute value ordering for donut */
function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1]!;
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* Special signed contribution rows for WR gain trend (pos/neg) */
function wrContributionRows(sp: SeriesPoint[] | undefined): Row[] {
  const src = sp ?? [];
  const rows: Row[] = [];
  for (const p of src) {
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

/* Small helper to nudge last "pending_high" to match provided highToxic */
function adjustPendingHigh(rows: Row[], keys: string[], high?: number) {
  if (!rows.length || typeof high !== "number" || high < 0) return rows;
  const last = { ...rows[rows.length - 1]! };
  const sum = keys.reduce((s, k) => s + (Number(last[k]) || 0), 0);
  if (sum <= 0) return rows;
  const target = Math.min(high, sum);
  const current = Number(last["pending_high"] || 0);
  if (current === target) return rows;
  const restKeys = keys.filter((k) => k !== "pending_high");
  const restCurr = restKeys.reduce((s, k) => s + (Number(last[k]) || 0), 0);
  const restTarget = Math.max(0, sum - target);
  let acc = 0;
  restKeys.forEach((k, i) => {
    const v = Number(last[k]) || 0;
    const scaled = restCurr > 0 ? Math.round((v / restCurr) * restTarget) : 0;
    if (i === restKeys.length - 1) {
      // fix any rounding residue
      last[k] = Math.max(0, restTarget - acc);
    } else {
      last[k] = Math.max(0, scaled);
      acc += last[k];
    }
  });
  last["pending_high"] = target;
  const out = rows.slice(0, -1);
  out.push(last);
  return out;
}

/* =============================================================================
   PORTALED SMART POPOVERS (hover-highlight rows)
============================================================================= */
function PortalTooltipShell({
  x, y, width = 280, children,
}: { x: number; y: number; width?: number; children: React.ReactNode }) {
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
          pointerEvents: "auto",
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function TrendPortalContent({
  active, label, payload, coordinate, containerRect, nameMap, valueFmt, asShare = false,
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
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: (p as any).color }} />
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
  active, payload, coordinate, containerRect, parts, nameMap, valueFmt,
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
  parts, size = 92, nameMap, valueFmt,
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
   TREND STACK (area or bars) — supports % share
============================================================================= */
function TrendStack({
  rows, keys, colors, names, mode, share,
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
              <Bar
                key={k}
                dataKey={k}
                stackId="a"
                fill={colors[k]}
                radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              />
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
  delta, unit = "", invert = false,
}: { delta: Delta; unit?: "" | "%" | "pp"; invert?: boolean }) {
  if (!delta) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TOKENS.muted }}>
        <Minus size={14} />
        —
      </span>
    );
  }
  const d = delta.raw;
  const good = invert ? d < 0 : d > 0;
  const Icon = d === 0 ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight;
  const color = d === 0 ? TOKENS.muted : good ? TOKENS.success : TOKENS.danger;
  const label =
    unit === "%"
      ? `${Math.abs(d).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(d).toFixed(1)} pp`
      : intFmt.format(Math.round(Math.abs(d)));
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
function KpiCard({
  title, info, glyph, donut, value, valueFmt, delta, deltaUnit, invert, trend, onClick, rightBadge,
}: {
  title: string;
  info?: string;
  glyph: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: Delta;
  deltaUnit?: "" | "%" | "pp";
  invert?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
  rightBadge?: React.ReactNode;
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
        {/* Title row (brand icon + title + info icon) */}
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
          {rightBadge}
        </div>

        {/* Content: donut | value/delta | trend */}
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TOKENS.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge delta={delta ?? null} unit={deltaUnit ?? ""} invert={invert} />
            </div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* =============================================================================
   MAIN — Redesigned Disavow Summary KPI Section
============================================================================= */
export function DisavowSummary_KPIs_Stacked({
  data, onJump, onExport, className,
}: DisavowSummaryProps) {
  /* normalize series (fallbacks ensure tooltips show ISO dates) */
  const domainsSP = data.totalDomains.series?.length ? data.totalDomains.series! : mkSeries(14, 24, 0.10);
  const urlsSP    = data.totalUrls.series?.length    ? data.totalUrls.series!    : mkSeries(14, 78, 0.16);
  const pendSP    = data.pending.series?.length      ? data.pending.series!      : mkSeries(14, 13, 0.12);
  const wrSP      = data.wrGain.series?.length       ? data.wrGain.series!       : mkSeries(14, 5, 0.08).map(p => ({ ...p, value: p.value - 3 }));

  /* deltas */
  const dDomains = deltaFrom(domainsSP);
  const dUrls    = deltaFrom(urlsSP);
  const dQueue   = deltaFrom(pendSP); // invert in badge (lower is better)
  const dWR      = deltaFrom(wrSP);

  /* breakdown specs + colors + labels (synthetic but stable) */
  // Domains — severity at time of disavow
  const DOM_SEV: SplitSpec[] = [
    { key: "dom_critical", label: "Critical", baseShare: 0.18 },
    { key: "dom_high",     label: "High",     baseShare: 0.34 },
    { key: "dom_medium",   label: "Medium",   baseShare: 0.32 },
    { key: "dom_low",      label: "Low",      baseShare: 0.16 },
  ];
  const DOM_COLORS: Record<string, string> = {
    dom_critical: TOKENS.danger,
    dom_high: TOKENS.warn,
    dom_medium: "#60A5FA",
    dom_low: TOKENS.gray,
  };
  const DOM_NAMES = { dom_critical: "Critical", dom_high: "High", dom_medium: "Medium", dom_low: "Low" };

  // URLs — reason at time of disavow
  const URL_REAS: SplitSpec[] = [
    { key: "url_lowwr",    label: "Low WR (Domain)", baseShare: 0.36 },
    { key: "url_anchor",   label: "Anchor Risk",     baseShare: 0.28 },
    { key: "url_tldip",    label: "TLD/IP Risk",     baseShare: 0.20 },
    { key: "url_other",    label: "Other Signals",   baseShare: 0.16 },
  ];
  const URL_COLORS: Record<string, string> = {
    url_lowwr: "#F59E0B",
    url_anchor: "#F97316",
    url_tldip: "#60A5FA",
    url_other: TOKENS.gray,
  };
  const URL_NAMES = {
    url_lowwr: "Low WR (Domain)",
    url_anchor: "Anchor Risk",
    url_tldip: "TLD/IP Risk",
    url_other: "Other Signals",
  };

  // Pending — severity (we'll align last point High with pending.highToxic if provided)
  const PEN_SEV: SplitSpec[] = [
    { key: "pending_high",   label: "High Toxic", baseShare: 0.40 },
    { key: "pending_medium", label: "Medium",     baseShare: 0.36 },
    { key: "pending_low",    label: "Low",        baseShare: 0.18 },
    { key: "pending_review", label: "Needs Data", baseShare: 0.06 },
  ];
  const PEN_COLORS: Record<string, string> = {
    pending_high: TOKENS.danger,
    pending_medium: TOKENS.warn,
    pending_low: "#60A5FA",
    pending_review: TOKENS.gray,
  };
  const PEN_NAMES = {
    pending_high: "High Toxic",
    pending_medium: "Medium",
    pending_low: "Low",
    pending_review: "Needs Data",
  };

  // WR gain — signed contributions
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

  /* build rows (trend breakdowns) */
  const domRows = React.useMemo(() => splitSeries(domainsSP, DOM_SEV, 0.05), [domainsSP]);
  const urlRows = React.useMemo(() => splitSeries(urlsSP, URL_REAS, 0.05), [urlsSP]);
  const rawPend = React.useMemo(() => splitSeries(pendSP, PEN_SEV, 0.06), [pendSP]);
  const penRows = React.useMemo(
    () => adjustPendingHigh(rawPend, ["pending_high", "pending_medium", "pending_low", "pending_review"], data.pending.highToxic),
    [rawPend, data.pending.highToxic]
  );
  const wrRows  = React.useMemo(() => wrContributionRows(wrSP), [wrSP]);

  /* share toggle chip (applies to count KPIs) */
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  /* branded glyphs */
  const iconDomains = <ShieldCheck size={16} color={TOKENS.brand} />;
  const iconUrls    = <Link2Off    size={16} color={TOKENS.brand} />;
  const iconQueue   = <ClipboardList size={16} color={TOKENS.brand} />;
  const iconWR      = <TrendingUp  size={16} color={TOKENS.brand} />;

  /* numbers */
  const totalDomains = data.totalDomains.count;
  const totalUrls    = data.totalUrls.count;
  const pendingCount = data.pending.count;
  const wrPct        = data.wrGain.pct;

  /* donut parts (last snapshot) */
  const domParts = lastParts(domRows, ["dom_critical", "dom_high", "dom_medium", "dom_low"], DOM_COLORS).map(p => ({ ...p, name: p.key }));
  const urlParts = lastParts(urlRows, ["url_lowwr", "url_anchor", "url_tldip", "url_other"], URL_COLORS).map(p => ({ ...p, name: p.key }));
  const penParts = lastParts(penRows, ["pending_high", "pending_medium", "pending_low", "pending_review"], PEN_COLORS).map(p => ({ ...p, name: p.key }));
  // WR donut uses absolute magnitudes
  const wrAbsParts = lastParts(
    wrRows.map(r => ({ t: r.t, tox_impact: Math.abs(r.tox_impact), susp_impact: Math.abs(r.susp_impact), disavow_recovery: Math.abs(r.disavow_recovery), other_impact: Math.abs(r.other_impact) })as unknown as Row),
    ["tox_impact", "susp_impact", "disavow_recovery", "other_impact"],
    WR_COLORS
  ).map(p => ({ ...p, name: p.key }));

  return (
    <section
      className={cn("rounded-xl border bg-white p-4 shadow-sm", className)}
      style={{
        borderColor: TOKENS.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Disavow Summary KPI Cards (Stacked)"
    >
      {/* Header: branded icon + title + info + actions */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TOKENS.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Disavow Summary KPI
          </h3>
          <button
            className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
            title="Each card shows a current stacked snapshot and a stacked trend with a smart popover."
            aria-label="About this section"
            style={{ cursor: "pointer" }}
            type="button"
          >
            <Info size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* % share chip toggle */}
          <label
            className="inline-flex items-center gap-2 text-xs rounded-full border px-3 py-1.5"
            style={{ color: TOKENS.muted, borderColor: TOKENS.border, cursor: "pointer", background: TOKENS.panel }}
            title="Toggle trends between absolute values and % share (not applied to WR Gain)"
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

          {/* Export button */}
          <button
            type="button"
            onClick={() => onExport?.()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            aria-label="Export Disavow Summary KPI"
            title="Export Disavow Summary KPI"
          >
            <FileDown size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {/* 1) Total Disavowed Domains */}
        <KpiCard
          title="Total Disavowed Domains"
          info="Snapshot: severity at time of disavow. Trend: same mix over time."
          glyph={iconDomains}
          donut={
            <StackedDonut
              parts={domParts}
              nameMap={DOM_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={totalDomains}
          valueFmt={(v) => intFmt.format(v)}
          delta={dDomains}
          trend={
            <TrendStack
              rows={domRows}
              keys={["dom_critical", "dom_high", "dom_medium", "dom_low"]}
              colors={DOM_COLORS}
              names={DOM_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onJump("active-domains")}
        />

        {/* 2) Total Disavowed URLs */}
        <KpiCard
          title="Total Disavowed URLs"
          info="Snapshot: disavow reasons. Trend: reason mix per day."
          glyph={iconUrls}
          donut={
            <StackedDonut
              parts={urlParts}
              nameMap={URL_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={totalUrls}
          valueFmt={(v) => intFmt.format(v)}
          delta={dUrls}
          trend={
            <TrendStack
              rows={urlRows}
              keys={["url_lowwr", "url_anchor", "url_tldip", "url_other"]}
              colors={URL_COLORS}
              names={URL_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onJump("active-urls")}
        />

        {/* 3) Pending In Queue */}
        <KpiCard
          title="Pending In Queue"
          info="Snapshot: pending severity. Trend: same mix over time (lower is better)."
          glyph={iconQueue}
          rightBadge={
            typeof data.pending.highToxic === "number" && data.pending.highToxic > 0 ? (
              <span
                className="rounded-full border px-2 py-[2px] text-[11px] font-medium"
                style={{ color: TOKENS.danger, borderColor: "rgba(239,68,68,.25)", background: "#FEF2F2" }}
              >
                {data.pending.highToxic} High Toxic
              </span>
            ) : null
          }
          donut={
            <StackedDonut
              parts={penParts}
              nameMap={PEN_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={pendingCount}
          valueFmt={(v) => intFmt.format(v)}
          delta={dQueue}
          deltaUnit=""
          invert
          trend={
            <TrendStack
              rows={penRows}
              keys={["pending_high", "pending_medium", "pending_low", "pending_review"]}
              colors={PEN_COLORS}
              names={PEN_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onJump("queue")}
        />

        {/* 4) Estimated WR Score Gain */}
        <KpiCard
          title="Estimated WR Score Gain"
          info={data.wrGain.explain || "Estimated impact after toxic link removal."}
          glyph={iconWR}
          donut={
            <StackedDonut
              parts={wrAbsParts}
              nameMap={WR_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={wrPct}
          valueFmt={(v) => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) + "%"}
          delta={dWR}
          deltaUnit="pp"
          trend={
            <TrendStack
              rows={wrRows}
              keys={["tox_impact", "susp_impact", "disavow_recovery", "other_impact"]}
              colors={WR_COLORS}
              names={WR_NAMES}
              mode="area"
              share={false} // signed values — % share not meaningful
            />
          }
          onClick={() => onJump("wr-impact")}
        />
      </div>
    </section>
  );
}

/* =============================================================================
   OPTIONAL: demo data helper (same shape as your original)
============================================================================= */
const toISO = (d: Date) => d.toISOString().slice(0,10);
function mkDemoSeries(days = 14, start = 20, amp = 6): SeriesPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    return { date: toISO(d), value: Math.max(0, Math.round(start + Math.sin(i/2) * amp + (i%3))) };
  });
}
export function demoDisavowSummaryData(): DisavowSummaryData {
  return {
    totalDomains: { count: 24, series: mkDemoSeries(14, 20, 3) },
    totalUrls:    { count: 78, series: mkDemoSeries(14, 65, 10) },
    pending:      { count: 13, highToxic: 6, series: mkDemoSeries(14, 14, 4) },
    wrGain:       { pct: 4.8, series: mkDemoSeries(14, 3.5, 1.4).map(p=>({ ...p, value: p.value - 2 })) }
  };
}

/* =============================================================================
   DEMO WRAPPER (remove in production)
============================================================================= */
export function DisavowSummary_KPIs() {
  const data = React.useMemo(() => demoDisavowSummaryData(), []);
  return (
    <div style={{ padding: 16, background: "#F5F7FA" }}>
      <DisavowSummary_KPIs_Stacked
        data={data}
        onJump={(dest)=>console.log("Jump →", dest)}
        onExport={()=>console.log("Export clicked")}
      />
    </div>
  );
}
