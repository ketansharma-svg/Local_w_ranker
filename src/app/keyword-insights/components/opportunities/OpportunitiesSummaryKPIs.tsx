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
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  Info,
  Download,
  Sparkles,
  LineChart as LineChartIcon,
  BarChart3,
  Target as TargetIcon,
} from "lucide-react";

/* ========================================================================== *
   Keyword Opportunities Summary — Drop-in Component (React + Tailwind + TSX)
   - Inter / Inter Fallback fonts
   - Branded icons (#008CCD) for section & card titles
   - KPI Cards (reference style):
       1) Quick Wins (4–10)
       2) Low‑Hanging Keywords (11–20)
       3) Traffic Potential (Current)
       4) Projected Lift (Top N)
   - Donut & Trend smart popovers with colored dots
   - Charts:
       A) Close‑the‑gap Uplift (uses dropdown filter chips, not toggles)
       B) Opportunities by Intent (hover animation + colored-dot tooltip)
   - Export button in section header
   - Pointer cursor on all clickable UI
   - No emoji
 * ========================================================================== */

/* -------------------------------------------------------------------------- */
/* TOKENS                                                                     */
/* -------------------------------------------------------------------------- */
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

const INTENT_COLORS: Record<string, string> = {
  Informational: "#60A5FA",
  Commercial: "#7E72FF",
  Transactional: TK.warn,
};

const INTENT_NAMES: Record<string, string> = {
  Informational: "Informational",
  Commercial: "Commercial",
  Transactional: "Transactional",
};

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */
export type TargetTop = 1 | 3 | 5;

export interface OpportunitiesOverviewData {
  quickWinsCount: number; // 4–10
  lowHangingCount: number; // 11–20
  trafficPotentialSum: number; // monthly
  projectedLiftSum: number; // monthly at target (Top N)
  daily: Array<{
    date: string; // ISO yyyy-mm-dd
    quickWins: number; // 4–10 count
    lowHanging: number; // 11–20 count
    trafficPotential: number; // /mo
    projectedLift: number; // /mo
  }>;
  upliftCurve: Array<{ keywordId: string; lift: number }>;
  byIntent?: Array<{ intent: "Informational" | "Commercial" | "Transactional"; count: number; lift: number }>;
}

export interface KeywordOpportunitiesSummaryProps {
  title?: string; // default: "Keyword Opportunities Summary"
  target?: TargetTop; // default: 3
  data?: OpportunitiesOverviewData; // optional (safe fallback below)
  onExport?: () => void;
}

/* -------------------------------------------------------------------------- */
/* SAFE FALLBACK (prevents runtime errors)                                    */
/* -------------------------------------------------------------------------- */
const FALLBACK: OpportunitiesOverviewData = {
  quickWinsCount: 288,
  lowHangingCount: 412,
  trafficPotentialSum: 21450,
  projectedLiftSum: 10320,
  daily: Array.from({ length: 14 }).map((_, i) => ({
    date: `2025-09-${String(i + 1).padStart(2, "0")}`,
    quickWins: 18 + Math.round(Math.cos(i / 2) * 5),
    lowHanging: 26 + Math.round(Math.sin(i / 2) * 6),
    trafficPotential: 12000 + i * 150 + (i % 3) * 300,
    projectedLift: 6200 + i * 180 + (i % 4) * 220,
  })),
  upliftCurve: Array.from({ length: 60 }).map((_, i) => ({
    keywordId: `kw_${i}`,
    lift: Math.max(40, 300 - i * 3),
  })),
  byIntent: [
    { intent: "Informational", count: 220, lift: 3800 },
    { intent: "Commercial", count: 180, lift: 4800 },
    { intent: "Transactional", count: 60, lift: 1720 },
  ],
};

/* -------------------------------------------------------------------------- */
/* UTILS / FORMATTERS                                                         */
/* -------------------------------------------------------------------------- */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const compactFmt = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const last = <T,>(arr: T[], fb: T): T => (arr.length ? arr[arr.length - 1] : fb);
const pctDelta = (curr: number, prev: number) => (!isFinite(prev) || prev === 0 ? 0 : ((curr - prev) / prev) * 100);
const isBrowser = typeof document !== "undefined";

/* -------------------------------------------------------------------------- */
/* PORTALED SMART POPOVERS                                                    */
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
  if (!isBrowser) return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div style={{ position: "fixed", top, left, zIndex: 2147483647 }}>
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{ backgroundColor: "#fff", border: `1px solid ${TK.border}`, color: TK.text }}
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
  hoveredKey,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  hoveredKey?: string | null;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {String(label)}
      </div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px]" style={{ color: TK.muted }}>
          Total
        </span>
        <span className="font-semibold">{fmt(total)}</span>
      </div>
      <div className="flex flex-col">
        {rows.map((p, i) => {
          const isActive = hoveredKey && (p as any).name === hoveredKey;
          return (
            <div key={i} className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-gray-50")}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={cn("transition-colors", isActive ? "font-medium text-slate-800" : "")} style={{ color: TK.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={cn("font-semibold", isActive ? "text-slate-900" : "")}>{fmt(Number(p.value))}</div>
            </div>
          );
        })}
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
  activeIndex,
  forceHide,
  title = "Breakdown",
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  activeIndex?: number | undefined;
  forceHide?: boolean;
  title?: string;
}) {
  if (!active || forceHide || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {title}
      </div>
      <div className="flex flex-col">
        {parts.map((p, i) => {
          const isActive = typeof activeIndex === "number" && i === activeIndex;
          return (
            <div key={i} className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-gray-50")}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={cn("transition-colors", isActive ? "font-medium text-slate-800" : "")} style={{ color: TK.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={cn("font-semibold", isActive ? "text-slate-900" : "")}>{fmt(Number(p.value))}</div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* -------------------------------------------------------------------------- */
/* COMMON UI: Filter Chip, Delta Badge, KPI Shell                             */
/* -------------------------------------------------------------------------- */
function FilterChip<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
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
        className="inline-flex items-center gap-2 rounded-full border px-3 h-8 text-sm hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: TK.border }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-gray-700">{label}:</span>
        <span className="font-medium text-[#0C69B2]">{String(value)}</span>
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 min-w-[140px] rounded-md border bg-white shadow"
          style={{ borderColor: TK.border }}
          role="listbox"
        >
          {options.map((opt) => (
            <button
              key={String(opt)}
              role="option"
              aria-selected={opt === value}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 cursor-pointer",
                opt === value ? "text-[#0C69B2] font-medium" : "text-gray-700"
              )}
            >
              {String(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({
  deltaPct,
  invert = false,
  unit = "%",
}: {
  deltaPct: number;
  invert?: boolean;
  unit?: "%" | "pp";
}) {
  const good = invert ? deltaPct < 0 : deltaPct > 0;
  const color = Math.abs(deltaPct) < 0.0001 ? TK.muted : good ? TK.success : TK.danger;
  return (
    <span className="text-xs" style={{ color }}>
      {deltaPct === 0 ? "—" : unit === "pp" ? `${deltaPct.toFixed(1)} pp` : `${deltaPct.toFixed(1)}%`}
    </span>
  );
}

/* KPI Card (reference pattern) */
function KpiCard({
  title,
  glyph,
  info,
  donut,
  value,
  valueFmt,
  deltaPct,
  deltaUnit = "%",
  deltaInvert,
  trend,
}: {
  title: string;
  glyph: React.ReactNode;
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  deltaPct: number;
  deltaUnit?: "%" | "pp";
  deltaInvert?: boolean;
  trend: React.ReactNode;
}) {
  return (
    <button type="button" className="group relative w-full cursor-pointer text-left" aria-label={`${title} card`}>
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TK.border }}
      >
        <div className="mb-2 flex items-center gap-2">
          {glyph}
          <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
            {title}
          </div>
          {info ? (
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info}>
              <Info size={14} />
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge deltaPct={deltaPct} invert={!!deltaInvert} unit={deltaUnit} />
            </div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* CHART PRIMITIVES (Donut + Trend)                                           */
/* -------------------------------------------------------------------------- */
function StackedDonut({
  parts,
  size = 92,
  nameMap,
  valueFmt,
  title,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  nameMap?: Record<string, string>;
  valueFmt?: (n: number) => string;
  title?: string;
}) {
  const data = parts.filter((p) => (p.value ?? 0) > 0).map((p) => ({ ...p, v: p.value }));
  const [activeIdx, setActiveIdx] = React.useState<number | undefined>(undefined);
  const [hovering, setHovering] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={ref}
      className="relative shrink-0"
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setActiveIdx(undefined);
      }}
    >
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
                activeIndex={activeIdx}
                forceHide={!hovering}
                title={title || "Breakdown"}
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
            activeIndex={activeIdx}
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
            onMouseEnter={(_: any, i: number) => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(undefined)}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0" />
    </div>
  );
}

type Row = { t: string } & Record<string, any>;
function TrendStack({
  rows,
  keys,
  colors,
  names,
  mode,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  mode: "area" | "bars";
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const valueFmt = (v: number) => intFmt.format(Math.round(v));

  return (
    <div ref={ref} className="h-16 min-w-[160px]" role="img" aria-label="KPI trend">
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  hoveredKey={hoveredKey}
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
                name={k}
                stroke={colors[k]}
                fill={colors[k]}
                fillOpacity={hoveredKey ? (hoveredKey === k ? 0.35 : 0.18) : 0.25}
                strokeOpacity={hoveredKey ? (hoveredKey === k ? 1 : 0.5) : 1}
                strokeWidth={2}
                dot={false}
                onMouseOver={() => setHoveredKey(k)}
                onMouseOut={() => setHoveredKey(null)}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  hoveredKey={hoveredKey}
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
                name={k}
                stackId="a"
                fill={colors[k]}
                radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                fillOpacity={hoveredKey ? (hoveredKey === k ? 1 : 0.55) : 0.9}
                onMouseOver={() => setHoveredKey(k)}
                onMouseOut={() => setHoveredKey(null)}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */
export default function OpportunitiesSummaryApp({
  title = "Keyword Opportunities Summary",
  target = 3,
  data,
  onExport,
}: KeywordOpportunitiesSummaryProps) {
  const safe = data ?? FALLBACK;

  /* ---------- Snapshot & deltas (vs previous day) ---------- */
  const d = Array.isArray(safe.daily) ? safe.daily : [];
  const curr = last(d, d[0] || { date: "", quickWins: 0, lowHanging: 0, trafficPotential: 0, projectedLift: 0 });
  const prev = d.length >= 2 ? d[d.length - 2] : d[0] || curr;

  const currQuick = curr.quickWins ?? safe.quickWinsCount ?? 0;
  const prevQuick = prev.quickWins ?? currQuick;
  const dQuick = pctDelta(currQuick, prevQuick);

  const currLow = curr.lowHanging ?? safe.lowHangingCount ?? 0;
  const prevLow = prev.lowHanging ?? currLow;
  const dLow = pctDelta(currLow, prevLow);

  const currTP = curr.trafficPotential ?? safe.trafficPotentialSum ?? 0;
  const prevTP = prev.trafficPotential ?? currTP;
  const dTP = pctDelta(currTP, prevTP);

  const currLift = curr.projectedLift ?? safe.projectedLiftSum ?? 0;
  const prevLift = prev.projectedLift ?? currLift;
  const dLift = pctDelta(currLift, prevLift);

  /* ---------- Donut breakdowns ---------- */
  // Intent split (used for Quick Wins, Low-Hanging, Traffic Potential)
  const intents = safe.byIntent && safe.byIntent.length > 0
    ? safe.byIntent
    : ([
        { intent: "Informational", count: 1, lift: 1 },
        { intent: "Commercial", count: 1, lift: 1 },
        { intent: "Transactional", count: 1, lift: 1 },
      ] as const);

  const intentPartsCount = intents.map((x) => ({ key: x.intent, name: x.intent, value: x.count, color: INTENT_COLORS[x.intent] }));
  const intentNames = intents.reduce((m, x) => ((m[x.intent] = INTENT_NAMES[x.intent]), m), {} as Record<string, string>);

  // Projected lift slices by contribution across the ranked list (Top 10 / Next 15 / Rest)
  const sorted = (safe.upliftCurve || []).slice().sort((a, b) => b.lift - a.lift);
  const sumLift = sorted.reduce((s, r) => s + (r.lift || 0), 0) || 1;
  const top10 = sorted.slice(0, 10).reduce((s, r) => s + r.lift, 0);
  const next15 = sorted.slice(10, 25).reduce((s, r) => s + r.lift, 0);
  const rest = Math.max(0, sumLift - top10 - next15);

  const LIFT_SLICE_PARTS = [
    { key: "top10", name: "Top 10 KW", value: (currLift * top10) / sumLift, color: TK.brand },
    { key: "next15", name: "KW 11–25", value: (currLift * next15) / sumLift, color: "#60A5FA" },
    { key: "rest", name: "Rest", value: (currLift * rest) / sumLift, color: TK.gray },
  ];
  const LIFT_SLICE_NAMES = LIFT_SLICE_PARTS.reduce((m, p) => ((m[p.key] = p.name), m), {} as Record<string, string>);

  // Trend splits for Projected Lift using the same shares
  const sTop10 = top10 / sumLift;
  const sNext15 = next15 / sumLift;
  const sRest = rest / sumLift;

  /* ---------- KPI Trend rows ---------- */
  const QUICK_TREND: Row[] = d.map((r) => ({ t: r.date, quick: r.quickWins }));
  const LOW_TREND: Row[] = d.map((r) => ({ t: r.date, low: r.lowHanging }));
  const TP_TREND: Row[] = d.map((r) => ({ t: r.date, tp: r.trafficPotential }));
  const LIFT_TREND: Row[] = d.map((r) => ({
    t: r.date,
    top10: r.projectedLift * sTop10,
    next15: r.projectedLift * sNext15,
    rest: r.projectedLift * sRest,
  }));

  /* ---------- Header Export ---------- */
  const [liftTarget, setLiftTarget] = React.useState<TargetTop>(target);
  const exportCSV = () => {
    const rows = [
      ["metric", "value", "delta"],
      ["Quick Wins (4–10)", Math.round(currQuick), `${dQuick.toFixed(1)}%`],
      ["Low‑Hanging (11–20)", Math.round(currLow), `${dLow.toFixed(1)}%`],
      ["Traffic Potential (current)", Math.round(currTP), `${dTP.toFixed(1)}%`],
      [`Projected Lift (Top ${liftTarget})`, Math.round(currLift), `${dLift.toFixed(1)}%`],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `keyword_opportunities_summary_top${liftTarget}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    onExport?.();
  };

  /* ---------- Chart A: Close‑the‑gap Uplift (dropdown chips) ---------- */
  const [anchorTopN, setAnchorTopN] = React.useState<10 | 25 | 50 | 100>(25);
  let cum = 0;
  const cumRows = sorted.map((p, i) => {
    cum += p.lift;
    return { i: i + 1, lift: p.lift, cum };
  });

  /* ---------- Chart B: Opportunities by Intent (hover animation) ------- */
  const [intentMetric, setIntentMetric] = React.useState<"count" | "lift">("count");
  const intentData = intents.map((x) => ({
    name: x.intent,
    value: intentMetric === "count" ? x.count : x.lift,
    color: INTENT_COLORS[x.intent],
  }));
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  /* ---------- Render ---------- */
  return (
    <section
      className="rounded-[10px] border bg-white p-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2">
          <Sparkles size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <FilterChip label="Target" value={liftTarget} options={[1, 3, 5]} onChange={(v) => setLiftTarget(v as TargetTop)} />
          <button
            onClick={exportCSV}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: TK.border, color: TK.valueBlue }}
            aria-label="Export"
            title="Export KPI snapshot"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Quick Wins */}
        <KpiCard
          title="Quick Wins (4–10)"
          glyph={<TargetIcon size={16} color={TK.brand} />}
          info="Keywords ranked 4–10; fastest path to incremental clicks."
          donut={<StackedDonut parts={intentPartsCount} nameMap={intentNames} title="By intent" />}
          value={currQuick}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={dQuick}
          trend={<TrendStack rows={QUICK_TREND} keys={["quick"]} colors={{ quick: TK.brand }} names={{ quick: "Quick Wins" }} mode="area" />}
        />

        {/* Low‑Hanging */}
        <KpiCard
          title="Low‑Hanging (11–20)"
          glyph={<LineChartIcon size={16} color={TK.brand} />}
          info="Keywords ranked 11–20; optimize to enter page one."
          donut={<StackedDonut parts={intentPartsCount} nameMap={intentNames} title="By intent" />}
          value={currLow}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={dLow}
          trend={<TrendStack rows={LOW_TREND} keys={["low"]} colors={{ low: "#60A5FA" }} names={{ low: "Low‑Hanging" }} mode="area" />}
        />

        {/* Traffic Potential (current) */}
        <KpiCard
          title="Traffic Potential (current)"
          glyph={<BarChart3 size={16} color={TK.brand} />}
          info="Estimated monthly clicks at current ranks."
          donut={
            <StackedDonut
              parts={intentPartsCount.map((p) => ({ ...p, value: (p.value || 0) }))}
              nameMap={intentNames}
              title="By intent"
              valueFmt={(v) => `${compactFmt(v)}`}
            />
          }
          value={currTP}
          valueFmt={(v) => `${compactFmt(v)}/mo`}
          deltaPct={dTP}
          trend={<TrendStack rows={TP_TREND} keys={["tp"]} colors={{ tp: TK.valueBlue }} names={{ tp: "Traffic Potential" }} mode="area" />}
        />

        {/* Projected Lift (Top N) */}
        <KpiCard
          title={`Projected Lift (Top ${liftTarget})`}
          glyph={<TargetIcon size={16} color={TK.brand} />}
          info={`Extra monthly clicks if each keyword reaches Top ${liftTarget}.`}
          donut={<StackedDonut parts={LIFT_SLICE_PARTS} nameMap={LIFT_SLICE_NAMES} title="Contribution by KW set" valueFmt={(v) => `${compactFmt(v)}/mo`} />}
          value={currLift}
          valueFmt={(v) => `${compactFmt(v)}/mo`}
          deltaPct={dLift}
          trend={
            <TrendStack
              rows={LIFT_TREND}
              keys={["top10", "next15", "rest"]}
              colors={{ top10: TK.brand, next15: "#60A5FA", rest: TK.gray }}
              names={{ top10: "Top 10", next15: "11–25", rest: "Rest" }}
              mode="bars"
            />
          }
        />
      </div>

      {/* Charts Row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* A) Close‑the‑gap Uplift */}
        <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChartIcon size={16} color={TK.brand} />
              <h3 className="text-[15px] font-semibold" style={{ color: TK.text }}>
                Close‑the‑gap Uplift
              </h3>
              <span className="text-xs" style={{ color: TK.muted }}>
                Cumulative potential by keyword order
              </span>
              <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title="Sorted by individual keyword uplift; cumulative shows aggregate potential as you address more keywords.">
                <Info size={14} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FilterChip label="Top N" value={anchorTopN} options={[10, 25, 50, 100]} onChange={(v) => setAnchorTopN(v as 10 | 25 | 50 | 100)} />
              <FilterChip label="Target" value={liftTarget} options={[1, 3, 5]} onChange={(v) => setLiftTarget(v as TargetTop)} />
            </div>
          </div>
          <div className="h-[260px] relative">
            <ResponsiveContainer>
              <AreaChart data={cumRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={TK.border} />
                <XAxis dataKey="i" />
                <YAxis tickFormatter={(v) => compactFmt(Number(v))} />
                <Area type="monotone" dataKey="cum" stroke={TK.valueBlue} fill={TK.pastelBlue} strokeWidth={2} dot={false} />
                <ReferenceLine x={anchorTopN} stroke={TK.brand} strokeDasharray="4 4" />
                <RTooltip
                  content={({ active, payload, label, coordinate, viewBox }: any) => {
                    if (!active || !payload?.length || !isBrowser) return null;
                    const x = (viewBox?.x || 0) + (coordinate?.x || 0) + 12;
                    const y = (viewBox?.y || 0) + (coordinate?.y || 0) + 12;
                    const per = sorted[(label as number) - 1]?.lift ?? 0;
                    const p = payload[0];
                    return (
                      <PortalTooltipShell x={x} y={y} width={280}>
                        <div className="mb-1 font-medium" style={{ color: TK.muted }}>
                          Top {String(label)}
                        </div>
                        <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: TK.muted }}>
                          <span>Cumulative</span>
                          <span className="font-semibold text-[#111827]">{compactFmt(Math.round(p?.value ?? 0))}/mo</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 rounded px-1 py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TK.brand }} />
                            <span className="text-[12px]" style={{ color: TK.muted }}>
                              This keyword
                            </span>
                          </div>
                          <div className="font-semibold">{compactFmt(Math.round(per))}/mo</div>
                        </div>
                      </PortalTooltipShell>
                    );
                  }}
                  wrapperStyle={{ visibility: "hidden" }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs" style={{ color: TK.muted }}>
              Anchor marker at <span className="font-medium" style={{ color: TK.brand }}>
                Top {anchorTopN}
              </span>{" "}
              (visual guide).
            </div>
          </div>
        </div>

        {/* B) Opportunities by Intent */}
        <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} color={TK.brand} />
              <h3 className="text-[15px] font-semibold" style={{ color: TK.text }}>
                Opportunities by Intent
              </h3>
              <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title="Intent distribution of opportunity keywords.">
                <Info size={14} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FilterChip label="Metric" value={intentMetric} options={["count", "lift"]} onChange={(v) => setIntentMetric(v as "count" | "lift")} />
            </div>
          </div>
          <div className="h-[260px] relative">
            <ResponsiveContainer>
              <BarChart data={intentData} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke={TK.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => (intentMetric === "count" ? intFmt.format(Number(v)) : compactFmt(Number(v)))} width={48} />
                <RTooltip
                  content={({ active, payload, coordinate, viewBox }: any) => {
                    if (!active || !payload?.length || !isBrowser) return null;
                    const x = (viewBox?.x || 0) + (coordinate?.x || 0) + 12;
                    const y = (viewBox?.y || 0) + (coordinate?.y || 0) + 12;
                    const row = payload[0]?.payload;
                    const val = Number(row?.value || 0);
                    return (
                      <PortalTooltipShell x={x} y={y} width={260}>
                        <div className="mb-1 font-medium" style={{ color: TK.muted }}>
                          {INTENT_NAMES[row?.name] ?? row?.name}
                        </div>
                        <div className="flex items-center justify-between gap-6 rounded px-1 py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: row?.color }} />
                            <span className="text-[12px]" style={{ color: TK.muted }}>
                              {intentMetric === "count" ? "Keywords" : "Lift"}
                            </span>
                          </div>
                          <div className="font-semibold">
                            {intentMetric === "count" ? intFmt.format(val) : `${compactFmt(val)}/mo`}
                          </div>
                        </div>
                      </PortalTooltipShell>
                    );
                  }}
                  wrapperStyle={{ visibility: "hidden" }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                >
                  {intentData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      onMouseEnter={() => setHoverIdx(idx)}
                      onMouseLeave={() => setHoverIdx(null)}
                      style={{
                        cursor: "pointer",
                        transition: "transform .2s ease, filter .2s ease, opacity .2s ease",
                        transform: hoverIdx === idx ? "scaleY(1.04)" : "scaleY(1)",
                        filter: hoverIdx === idx ? "drop-shadow(0 4px 10px rgba(0,0,0,0.12))" : "none",
                        opacity: hoverIdx === null ? 1 : hoverIdx === idx ? 1 : 0.7,
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}


