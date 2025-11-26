"use client";

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
  Info,
  Download,
  BarChart3,
  Search,
  Eye,
  LineChart as LineChartIcon,
  List,
  Star,
  Target,
  GitMerge,
  TrendingUp,
} from "lucide-react";

const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

/* ----------------------------------------------------------------------------- */
/* UTILS / FORMATTERS */
/* ----------------------------------------------------------------------------- */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const curFmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const toDateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
type Row = { t: string; [key: string]: number | string };
const last = <T,>(arr: T[], fb: T): T => (arr.length ? arr[arr.length - 1] : fb);
const pctDelta = (curr: number, prev: number) => (!isFinite(prev) || prev === 0 ? 0 : ((curr - prev) / prev) * 100);

/* ----------------------------------------------------------------------------- */
/* PORTALED SMART POPOVERS */
/* ----------------------------------------------------------------------------- */
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
  asShare = false,
  hoveredKey,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  asShare?: boolean;
  hoveredKey?: string | null;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const fmt = valueFmt ?? ((v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v))));
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>
      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TK.muted }}>
            Total
          </span>
          <span className="font-semibold">{intFmt.format(Math.round(total))}</span>
        </div>
      )}
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
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  activeIndex?: number | undefined;
  forceHide?: boolean;
}) {
  if (!active || forceHide || !containerRect || !coordinate) return null; // prevents "stuck" popover
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Breakdown
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

/* ----------------------------------------------------------------------------- */
/* SEGMENTED CHIP */
/* ----------------------------------------------------------------------------- */
function Segmented({
  value,
  items,
  onChange,
  aria,
}: {
  value: string;
  items: { label: string; value: string }[];
  onChange: (v: string) => void;
  aria?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={aria || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: "pointer" }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "h-8 rounded-full px-3 text-sm transition",
            value === it.value ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
          )}
          style={{ cursor: "pointer" }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------- */
/* DELTA BADGE */
/* ----------------------------------------------------------------------------- */
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
      {deltaPct === 0 ? "—" : unit === "pp" ? `${Math.abs(deltaPct).toFixed(1)} pp` : `${Math.abs(deltaPct).toFixed(1)}%`}
    </span>
  );
}

/* ----------------------------------------------------------------------------- */
/* STACKED DONUT — blank center + hide popover off-hover */
/* ----------------------------------------------------------------------------- */
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
            onMouseEnter={(_, i) => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(undefined)}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Blank center (intentionally no text) */}
      <div className="pointer-events-none absolute inset-0" />
    </div>
  );
}

/* ----------------------------------------------------------------------------- */
/* TREND STACK (bars / area) with hovered-series highlight + portaled popover */
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
  const to100 = (rs: Row[]) =>
    rs.map((r) => {
      const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
      const out: Row = { t: r.t };
      keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
      return out;
    });

  const data = share ? to100(rows) : rows;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (share ? pctFmt(v, 1) : intFmt.format(Math.round(v)));
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  return (
    <div ref={ref} className="h-16 min-w-[160px]" role="img" aria-label="KPI trend">
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={share}
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
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={share}
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
                fillOpacity={hoveredKey ? (hoveredKey === k ? 1 : 0.5) : 0.9}
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

/* ----------------------------------------------------------------------------- */
/* KPI CARD SHELL */
/* ----------------------------------------------------------------------------- */
function KpiCard({
  title,
  glyph,
  info,
  donut,
  value,
  valueFmt,
  deltaPct,
  deltaInvert,
  deltaUnit = "%",
  trend,
}: {
  title: string;
  glyph: React.ReactNode;
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  deltaPct: number;
  deltaInvert?: boolean;
  deltaUnit?: "%" | "pp";
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

/* ----------------------------------------------------------------------------- */
/* DATA (demo generators to mirror your pipeline) */
/* ----------------------------------------------------------------------------- */
type KPIWindow = "7d" | "30d" | "90d";
function lastNDates(n: number) {
  const a: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    a.push(toISO(d));
  }
  return a;
}


/* Weighted average position (approx) */
function avgPosFromBuckets(r: Row) {
  const w = { p1_3: 2, p4_10: 7, p11_20: 15.5, p21_50: 35, p51_100: 75 };
  const toNum = (v: any) => Number(v) || 0;
  const p1_3 = toNum(r.p1_3);
  const p4_10 = toNum(r.p4_10);
  const p11_20 = toNum(r.p11_20);
  const p21_50 = toNum(r.p21_50);
  const p51_100 = toNum(r.p51_100);
  const sum = p1_3 + p4_10 + p11_20 + p21_50 + p51_100;
  if (!sum) return 0;
  const num = p1_3 * w.p1_3 + p4_10 * w.p4_10 + p11_20 * w.p11_20 + p21_50 * w.p21_50 + p51_100 * w.p51_100;
  return num / sum;
}

const POS5_COL: Record<string, string> = {
  p1_3: TK.success,
  p4_10: "#60A5FA",
  p11_20: "#7E72FF",
  p21_50: TK.warn,
  p51_100: TK.danger,
};
const POS5_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50", p51_100: "Pos 51–100" };

// Top10 (3)
const T10_COL: Record<string, string> = { top1_3: TK.success, top4_6: "#60A5FA", top7_10: "#7E72FF" };
const T10_NAME = { top1_3: "Pos 1–3", top4_6: "Pos 4–6", top7_10: "Pos 7–10" };

// Tracked (4)
const TRK_COL: Record<string, string> = { top10: TK.success, p11_50: "#60A5FA", p51_100: TK.warn, notRanking: TK.gray };
const TRK_NAME = { top10: "Top‑10", p11_50: "Pos 11–50", p51_100: "Pos 51–100", notRanking: "Not Ranking" };

// Visibility (3)
const P3_COL: Record<string, string> = { p1_3: TK.success, p4_10: "#60A5FA", p11p: TK.gray };
const P3_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11p: "Pos 11+" };

// Cannibalization (3)
const CANN_COL: Record<string, string> = { low: TK.success, med: TK.warn, high: TK.danger };
const CANN_NAME = { low: "Low", med: "Medium", high: "High" };

/* ----------------------------------------------------------------------------- */
/* MAIN — Keywords Insights Summary (8 KPIs) */
/* ----------------------------------------------------------------------------- */
export default function KeywordsInsightsSummary({ dto }: { dto: any }) {
  const [kpiRange, setKpiRange] = React.useState<KPIWindow>("30d");
  const [shareMode, setShareMode] = React.useState(false);
  const [liftTarget, setLiftTarget] = React.useState<1 | 3 | 5>(1);
  const kDays = kpiRange === "7d" ? 7 : kpiRange === "30d" ? 30 : 90;

  const sliceCurr = (rs: Row[]) => rs.slice(kDays);
  const slicePrev = (rs: Row[]) => rs.slice(0, kDays);

// build rows directly from API
const api = dto?.data?.overview_kpis ?? {};

const dates = api.visibility_top_20?.sparkline_data?.map((d:any)=>d.date) ?? [];

// Construct rows matching the structure expected by the chart
const AK_CURR = dates.map((date, i) => ({
  t: date,
  p1_3: dto?.data?.ranking_distribution?.[0]?.count ?? 0,
  p4_10: dto?.data?.ranking_distribution?.[2]?.count ?? 0,
  p11_20: dto?.data?.ranking_distribution?.[3]?.count ?? 0,
  p21_50: dto?.data?.ranking_distribution?.[4]?.count ?? 0,
  p51_100: dto?.data?.ranking_distribution?.[5]?.count ?? 0,
}));

// Similar for Top 10 breakdown
const T10_CURR = dates.map((date, i) => ({
  t: date,
  top1_3: 0, // not provided in API
  top4_6: 0,
  top7_10: api.top_10_keywords?.sparkline_data?.[i]?.value ?? 0,
}));

// Traffic potential
const TRAF_CURR = dates.map((date, i) => ({
  t: date,
  p1_3: api.traffic_potential?.sparkline_data?.[i]?.value ?? 0,
  p4_10: 0,
  p11_20: 0,
  p21_50: 0,
  p51_100: 0,
}));

// Avg position
const currAvgPos = api.avg_position?.value ?? 0;

// Visibility
const VIS_CURR = dates.map((date, i) => ({
  t: date,
  p1_3: 0,
  p4_10: 0,
p11p: 100 - (api.visibility_top_20?.sparkline_data?.[i]?.value ?? 0),
}));

// Cannibalized
const CANN_CURR = dates.map((date, i) => ({
  t: date,
  low: 0,
  med: 0,
  high: api.cannibalized_keywords?.sparkline_data?.[i]?.value ?? 0,
}));

const targetData = api.projected_lift?.targets?.[liftTarget]?.sparkline_data ?? [];

const targetSeries =
  api.projected_lift?.targets?.[liftTarget]?.sparkline_data ?? [];

const LIFT_CURR = dates.map((d, i) => ({
  t: d,
  p1_3: Number(targetSeries[i]?.value ?? 0),
  p4_10: 0,
  p11_20: 0,
  p21_50: 0,
  p51_100: 0,
}));

const TRK_CURR = AK_CURR.map(r => ({
  t: r.t,
  top10: r.p1_3 + r.p4_10,
  p11_50: r.p11_20 + r.p21_50,
  p51_100: r.p51_100,
  notRanking: 0, // API doesn’t give this → fallback
}));

// Previous window (shift by kDays)
const AK_PREV = AK_CURR.slice(0, kDays);
const T10_PREV = T10_CURR.slice(0, kDays);
const TRAF_PREV = TRAF_CURR.slice(0, kDays);
const TRK_PREV = TRK_CURR.slice(0, kDays);
const VIS_PREV = VIS_CURR.slice(0, kDays);
const CANN_PREV = CANN_CURR.slice(0, kDays);
const LIFT_PREV = LIFT_CURR.slice(0, kDays);


  // --- KPI values + deltas (use the latest day of each window) ---
  const sumBuckets = (r: Row, keys: string[]) => keys.reduce((s, k) => s + (Number((r as any)[k]) || 0), 0);

  // 1) Total Keywords
  const currTotalKW = React.useMemo(() => sumBuckets(last(AK_CURR, AK_CURR[0] || { t: "" } as Row), ["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]), [AK_CURR]);
  const prevTotalKW = React.useMemo(() => sumBuckets(last(AK_PREV, AK_PREV[0] || { t: "" } as Row), ["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]), [AK_PREV]);
  const dTotalKW = pctDelta(currTotalKW, prevTotalKW);

  // 2) Traffic Potential
  const currTraffic = React.useMemo(() => sumBuckets(last(TRAF_CURR, TRAF_CURR[0] || { t: "" } as Row), ["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]), [TRAF_CURR]);
  const prevTraffic = React.useMemo(() => sumBuckets(last(TRAF_PREV, TRAF_PREV[0] || { t: "" } as Row), ["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]), [TRAF_PREV]);
  const dTraffic = pctDelta(currTraffic, prevTraffic);

  // 3) Top 10 Keywords
  const currTop10 = React.useMemo(() => sumBuckets(last(T10_CURR, T10_CURR[0] || { t: "" } as Row), ["top1_3", "top4_6", "top7_10"]), [T10_CURR]);
  const prevTop10 = React.useMemo(() => sumBuckets(last(T10_PREV, T10_PREV[0] || { t: "" } as Row), ["top1_3", "top4_6", "top7_10"]), [T10_PREV]);
  const dTop10 = pctDelta(currTop10, prevTop10);

  // 4) Total Tracked Keywords
  const currTracked = React.useMemo(() => sumBuckets(last(TRK_CURR, TRK_CURR[0] || { t: "" } as Row), ["top10", "p11_50", "p51_100", "notRanking"]), [TRK_CURR]);
  const prevTracked = React.useMemo(() => sumBuckets(last(TRK_PREV, TRK_PREV[0] || { t: "" } as Row), ["top10", "p11_50", "p51_100", "notRanking"]), [TRK_PREV]);
  const dTracked = pctDelta(currTracked, prevTracked);

  // 5) Avg. Position (value = weighted average; delta shown as % for consistency → we can show pp style by setting unit "pp"? keep % off, we show signed)
  const prevAvgPos = React.useMemo(() => avgPosFromBuckets(last(AK_PREV, AK_PREV[0] || { t: "" } as Row)), [AK_PREV]);
  const dAvgPos = currAvgPos - prevAvgPos; // lower is better (invert)

  // 6) Visibility (Top‑10%)
  const currVisTop10 = React.useMemo(() => {
    const r = last(VIS_CURR, VIS_CURR[0] || ({ t: "", p1_3: 0, p4_10: 0, p11p: 0 } as Row));
    const top10 = (r.p1_3 || 0) + (r.p4_10 || 0);
    const all = top10 + (r.p11p || 0);
    return all ? (top10 / all) * 100 : 0;
  }, [VIS_CURR]);
  const prevVisTop10 = React.useMemo(() => {
    const r = last(VIS_PREV, VIS_PREV[0] || ({ t: "", p1_3: 0, p4_10: 0, p11p: 0 } as Row));
    const top10 = (r.p1_3 || 0) + (r.p4_10 || 0);
    const all = top10 + (r.p11p || 0);
    return all ? (top10 / all) * 100 : 0;
  }, [VIS_PREV]);
  const dVis = currVisTop10 - prevVisTop10; // pp

  // 7) Cannibalized Keywords
  const currCann = React.useMemo(() => sumBuckets(last(CANN_CURR, CANN_CURR[0] || { t: "" } as Row), ["low", "med", "high"]), [CANN_CURR]);
  const prevCann = React.useMemo(() => sumBuckets(last(CANN_PREV, CANN_PREV[0] || { t: "" } as Row), ["low", "med", "high"]), [CANN_PREV]);
  const dCann = pctDelta(currCann, prevCann);

  // 8) Projected Lift (Top N)
  const currLift = React.useMemo(() => sumBuckets(last(LIFT_CURR, LIFT_CURR[0] || { t: "" } as Row), ["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]), [LIFT_CURR]);
  const prevLift = React.useMemo(() => sumBuckets(last(LIFT_PREV, LIFT_PREV[0] || { t: "" } as Row), ["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]), [LIFT_PREV]);
  const dLift = pctDelta(currLift, prevLift);

  // Header export CSV (KPI snapshot)
  const exportCSV = () => {
    const rows = [
      ["metric", "value", "delta"],
      ["Total Keywords", Math.round(currTotalKW), `${dTotalKW.toFixed(1)}%`],
      ["Traffic Potential", Math.round(currTraffic), `${dTraffic.toFixed(1)}%`],
      ["Top 10 Keywords", Math.round(currTop10), `${dTop10.toFixed(1)}%`],
      ["Total Tracked Keywords", Math.round(currTracked), `${dTracked.toFixed(1)}%`],
      ["Avg. Position", `#${currAvgPos.toFixed(1)}`, `${Math.abs(dAvgPos).toFixed(1)} (better if ↓)`],
      ["Visibility (Top 10%)", `${currVisTop10.toFixed(1)}%`, `${dVis.toFixed(1)} pp`],
      ["Cannibalized Keywords", Math.round(currCann), `${dCann.toFixed(1)}%`],
      [`Projected Lift (Top ${liftTarget})`, Math.round(currLift), `${dLift.toFixed(1)}%`],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `keywords_insights_summary_${kpiRange}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

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
          <BarChart3 size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            Keywords Insights Summary
          </h2>
          <button
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
            title="Each KPI uses a stacked donut snapshot and a stacked trend with the same breakdown."
            aria-label="About"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">

          <label className="ml-2 inline-flex items-center gap-2 text-xs" style={{ color: TK.muted, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ accentColor: TK.valueBlue, borderColor: TK.border }}
            />
            Show % share in trends
          </label>
          <button
            onClick={exportCSV}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.valueBlue }}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* KPI GRID (8 cards) */}
      <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {/* 1) Total Keywords */}
        <KpiCard
          title="Total Keywords"
          glyph={<Search size={16} color={TK.brand} />}
          info="All ranking keywords; snapshot & trend by rank buckets."
          donut={
            <StackedDonut
              parts={[
                { key: "p1_3", name: "p1_3", value: last(AK_CURR, AK_CURR[0])?.p1_3 || 0, color: POS5_COL.p1_3 },
                { key: "p4_10", name: "p4_10", value: last(AK_CURR, AK_CURR[0])?.p4_10 || 0, color: POS5_COL.p4_10 },
                { key: "p11_20", name: "p11_20", value: last(AK_CURR, AK_CURR[0])?.p11_20 || 0, color: POS5_COL.p11_20 },
                { key: "p21_50", name: "p21_50", value: last(AK_CURR, AK_CURR[0])?.p21_50 || 0, color: POS5_COL.p21_50 },
                { key: "p51_100", name: "p51_100", value: last(AK_CURR, AK_CURR[0])?.p51_100 || 0, color: POS5_COL.p51_100 },
              ]}
              nameMap={POS5_NAME}
            />
          }
          value={currTotalKW}
          valueFmt={(v) => intFmt.format(v)}
deltaPct={isFinite(dTotalKW) ? dTotalKW : 0}
          trend={<TrendStack rows={AK_CURR} keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]} colors={POS5_COL} names={POS5_NAME} mode="bars" share={shareMode} />}
        />

        {/* 2) Traffic Potential */}
        <KpiCard
          title="Traffic Potential"
          glyph={<LineChartIcon size={16} color={TK.brand} />}
          info="Estimated clicks/day apportioned by rank buckets (CTR‑tilted)."
          donut={
            <StackedDonut
              parts={[
                { key: "p1_3", name: "p1_3", value: last(TRAF_CURR, TRAF_CURR[0])?.p1_3 || 0, color: POS5_COL.p1_3 },
                { key: "p4_10", name: "p4_10", value: last(TRAF_CURR, TRAF_CURR[0])?.p4_10 || 0, color: POS5_COL.p4_10 },
                { key: "p11_20", name: "p11_20", value: last(TRAF_CURR, TRAF_CURR[0])?.p11_20 || 0, color: POS5_COL.p11_20 },
                { key: "p21_50", name: "p21_50", value: last(TRAF_CURR, TRAF_CURR[0])?.p21_50 || 0, color: POS5_COL.p21_50 },
                { key: "p51_100", name: "p51_100", value: last(TRAF_CURR, TRAF_CURR[0])?.p51_100 || 0, color: POS5_COL.p51_100 },
              ]}
              nameMap={POS5_NAME}
            />
          }
value={currTraffic ?? "Not Found"}
          valueFmt={(v) => intFmt.format(Math.round(v))}
          deltaPct={dTraffic}
          trend={<TrendStack rows={TRAF_CURR} keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]} colors={POS5_COL} names={POS5_NAME} mode="area" share={shareMode} />}
        />

        {/* 3) Top 10 Keywords */}
        <KpiCard
          title="Top 10 Keywords"
          glyph={<Star size={16} color={TK.brand} />}
          info="Keywords currently in positions 1–10; split as 1–3 / 4–6 / 7–10."
          donut={
            <StackedDonut
              parts={[
                { key: "top1_3", name: "top1_3", value: last(T10_CURR, T10_CURR[0])?.top1_3 || 0, color: T10_COL.top1_3 },
                { key: "top4_6", name: "top4_6", value: last(T10_CURR, T10_CURR[0])?.top4_6 || 0, color: T10_COL.top4_6 },
                { key: "top7_10", name: "top7_10", value: last(T10_CURR, T10_CURR[0])?.top7_10 || 0, color: T10_COL.top7_10 },
              ]}
              nameMap={T10_NAME}
            />
          }
          value={currTop10?? "Not Found"}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={dTop10}
          trend={<TrendStack rows={T10_CURR} keys={["top1_3", "top4_6", "top7_10"]} colors={T10_COL} names={T10_NAME} mode="bars" share={shareMode} />}
        />

        {/* 4) Total Tracked Keywords */}
        <KpiCard
          title="Total Tracked Keywords"
          glyph={<List size={16} color={TK.brand} />}
          info="All tracked keywords; snapshot shows rank buckets + Not Ranking."
          donut={
            <StackedDonut
              parts={[
                { key: "top10", name: "top10", value: last(TRK_CURR, TRK_CURR[0])?.top10 || 0, color: TRK_COL.top10 },
                { key: "p11_50", name: "p11_50", value: last(TRK_CURR, TRK_CURR[0])?.p11_50 || 0, color: TRK_COL.p11_50 },
                { key: "p51_100", name: "p51_100", value: last(TRK_CURR, TRK_CURR[0])?.p51_100 || 0, color: TRK_COL.p51_100 },
                { key: "notRanking", name: "notRanking", value: last(TRK_CURR, TRK_CURR[0])?.notRanking || 0, color: TRK_COL.notRanking },
              ]}
              nameMap={TRK_NAME}
            />
          }
          value={currTracked ?? "Not Found"}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={dTracked}
          trend={<TrendStack rows={TRK_CURR} keys={["top10", "p11_50", "p51_100", "notRanking"]} colors={TRK_COL} names={TRK_NAME} mode="bars" share={shareMode} />}
        />

        {/* 5) Avg. Position */}
        <KpiCard
          title="Avg. Position"
          glyph={<Target size={16} color={TK.brand} />}
          info="Weighted average rank across ranking keywords (lower is better)."
          donut={
            <StackedDonut
              parts={[
                { key: "p1_3", name: "p1_3", value: last(AK_CURR, AK_CURR[0])?.p1_3 || 0, color: POS5_COL.p1_3 },
                { key: "p4_10", name: "p4_10", value: last(AK_CURR, AK_CURR[0])?.p4_10 || 0, color: POS5_COL.p4_10 },
                { key: "p11_20", name: "p11_20", value: last(AK_CURR, AK_CURR[0])?.p11_20 || 0, color: POS5_COL.p11_20 },
                { key: "p21_50", name: "p21_50", value: last(AK_CURR, AK_CURR[0])?.p21_50 || 0, color: POS5_COL.p21_50 },
                { key: "p51_100", name: "p51_100", value: last(AK_CURR, AK_CURR[0])?.p51_100 || 0, color: POS5_COL.p51_100 },
              ]}
              nameMap={POS5_NAME}
            />
          }
          value={currAvgPos ?? "Not Found"}
          valueFmt={(v) => `#${v.toFixed(1)}`}
          deltaPct={dAvgPos} // will show absolute magnitude; invert=true to color down as good
          deltaInvert
          deltaUnit="%"
          trend={<TrendStack rows={AK_CURR} keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]} colors={POS5_COL} names={POS5_NAME} mode="area" share={shareMode} />}
        />

        {/* 6) Visibility (Top 10%) */}
        <KpiCard
          title="Visibility (Top 10%)"
          glyph={<Eye size={16} color={TK.brand} />}
          info="Share of ranking keywords in positions 1–10."
          donut={
            <StackedDonut
              parts={[
                { key: "p1_3", name: "p1_3", value: last(VIS_CURR, VIS_CURR[0])?.p1_3 || 0, color: P3_COL.p1_3 },
                { key: "p4_10", name: "p4_10", value: last(VIS_CURR, VIS_CURR[0])?.p4_10 || 0, color: P3_COL.p4_10 },
                { key: "p11p", name: "p11p", value: last(VIS_CURR, VIS_CURR[0])?.p11p || 0, color: P3_COL.p11p },
              ]}
              nameMap={P3_NAME}
            />
          }
          value={currVisTop10 ?? "Not Found"}
          valueFmt={(v) => pctFmt(v, 1)}
          deltaPct={dVis}
          deltaUnit="pp"
          trend={<TrendStack rows={VIS_CURR} keys={["p1_3", "p4_10", "p11p"]} colors={P3_COL} names={P3_NAME} mode="area" share={shareMode} />}
        />

        {/* 7) Cannibalized Keywords */}
        <KpiCard
          title="Cannibalized Keywords"
          glyph={<GitMerge size={16} color={TK.brand} />}
          info="Keywords mapped to multiple pages (same project)."
          donut={
            <StackedDonut
              parts={[
                { key: "low", name: "low", value: last(CANN_CURR, CANN_CURR[0])?.low || 0, color: CANN_COL.low },
                { key: "med", name: "med", value: last(CANN_CURR, CANN_CURR[0])?.med || 0, color: CANN_COL.med },
                { key: "high", name: "high", value: last(CANN_CURR, CANN_CURR[0])?.high || 0, color: CANN_COL.high },
              ]}
              nameMap={CANN_NAME}
            />
          }
          value={currCann ?? "Not Found"}
          valueFmt={(v) => intFmt.format(Math.round(v))}
          deltaPct={dCann}
          trend={<TrendStack rows={CANN_CURR} keys={["low", "med", "high"]} colors={CANN_COL} names={CANN_NAME} mode="bars" share={shareMode} />}
        />

        {/* 8) Projected Lift (Top {liftTarget}) */}
        <KpiCard
          title={`Projected Lift (Top ${liftTarget})`}
          glyph={<TrendingUp size={16} color={TK.brand} />}
          info={`Extra clicks/day if each keyword reaches Top ${liftTarget}.`}
          donut={
            <StackedDonut
              parts={[
                { key: "p1_3", name: "p1_3", value: last(LIFT_CURR, LIFT_CURR[0])?.p1_3 || 0, color: POS5_COL.p1_3 },
                { key: "p4_10", name: "p4_10", value: last(LIFT_CURR, LIFT_CURR[0])?.p4_10 || 0, color: POS5_COL.p4_10 },
                { key: "p11_20", name: "p11_20", value: last(LIFT_CURR, LIFT_CURR[0])?.p11_20 || 0, color: POS5_COL.p11_20 },
                { key: "p21_50", name: "p21_50", value: last(LIFT_CURR, LIFT_CURR[0])?.p21_50 || 0, color: POS5_COL.p21_50 },
                { key: "p51_100", name: "p51_100", value: last(LIFT_CURR, LIFT_CURR[0])?.p51_100 || 0, color: POS5_COL.p51_100 },
              ]}
              nameMap={POS5_NAME}
            />
          }
          value={currLift ?? "Not Found"}
          valueFmt={(v) => intFmt.format(Math.round(v))}
          deltaPct={dLift}
          trend={<TrendStack rows={LIFT_CURR} keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]} colors={POS5_COL} names={POS5_NAME} mode="area" share={shareMode} />}
        />
      </div>

      {/* Lift Target Chips (compact, modern) */}
      <div className="mt-3 flex items-center gap-2 justify-end">
        <span className="text-xs" style={{ color: TK.muted }}>
          Projected Lift target:
        </span>
        <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: TK.border }}>
          {[1, 3, 5].map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === liftTarget}
              onClick={() => setLiftTarget(t as 1 | 3 | 5)}
              className={cn(
                "px-2.5 py-1 text-sm rounded-full transition",
                t === liftTarget ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
              )}
              style={{ cursor: "pointer" }}
            >
              Top {t}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}


