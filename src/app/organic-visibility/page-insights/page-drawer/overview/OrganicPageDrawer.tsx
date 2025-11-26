"use client";

/* =============================================================================
   Section 1 — Page KPI Summary (redesigned)
   Pattern: Snapshot (Stacked Donut) + Trend (Stacked Bars/Area) in one card
   - Inter / Inter Fallback fonts; no emoji
   - Branded #008CCD icons for section & card titles
   - Pointer cursor on interactive elements
   - Smart (portaled) popovers for donut & trend (with colored annotations)
   - Share toggle to show trend in % share
   - Recharts-only; ready-to-drop-in TSX
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
  Search,
  Target,
  Eye,
  ListFilter,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* -----------------------------------------------------------------------------
// DATA CONTRACT
// ---------------------------------------------------------------------------*/
type SeriesPoint = { date: string; value: number };

export type PageKpiSummaryData = {
  // Organic Traffic (estimated visits)
  organicTraffic: { value: number; series?: SeriesPoint[] };

  // Ranking Keywords (Top 100)
  rankingKeywords: { count: number; series?: SeriesPoint[] };

  // Visibility Score (% of this page's KW in Top 10)
  visibilityScore: { valuePct: number; series?: SeriesPoint[] };

  // Clicks / Impressions (GSC)
  clicksImpr: {
    clicks: number;
    impressions: number;
    ctr?: number;
    avgPos?: number;
    clicksSeries?: SeriesPoint[];
    impressionsSeries?: SeriesPoint[];
  };

  // Tracked Keywords
  trackedKeywords: { count: number; series?: SeriesPoint[] };

  // Avg. Position (GSC)
  avgPosition: { value: number; series?: SeriesPoint[] };
};

/* -----------------------------------------------------------------------------
// TOKENS
// ---------------------------------------------------------------------------*/
const TK = {
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
  gray: "#9CA3AF",
} as const;

/* -----------------------------------------------------------------------------
// UTILS
// ---------------------------------------------------------------------------*/
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toDateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const toSP = (s?: SeriesPoint[]) => (s ?? []).map((p) => ({ t: p.date, v: p.value }));

type SP = { t: string; v: number };
type SplitSpec = { key: string; label: string; baseShare: number };
type Row = { t: string } & Record<string, any>;

function splitSeries(total: SP[], parts: SplitSpec[], jitter = 0.06): Row[] {
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

function to100(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
}

function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* Position buckets used across multiple KPIs */
const POS = [
  { key: "p1_3", label: "Pos 1–3", baseShare: 0.16 },
  { key: "p4_10", label: "Pos 4–10", baseShare: 0.34 },
  { key: "p11_20", label: "Pos 11–20", baseShare: 0.28 },
  { key: "p21p", label: "Pos 21+", baseShare: 0.22 },
] as SplitSpec[];
const POS_COLORS: Record<string, string> = {
  p1_3: TK.success,
  p4_10: "#60A5FA",
  p11_20: "#9FC8FF",
  p21p: TK.gray,
};
const POS_NAMES = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21p: "Pos 21+" };

/* Clicks vs unclicked impressions */
const CI_COLORS: Record<string, string> = { clicks: TK.valueBlue, unclicked: TK.gray };
const CI_NAMES = { clicks: "Clicks", unclicked: "Unclicked Impr." };

/* -----------------------------------------------------------------------------
// DELTA BADGE
// ---------------------------------------------------------------------------*/
function DeltaBadge({
  delta,
  unit = "",
  invert = false,
}: {
  delta?: number;
  unit?: "" | "%" | "pp" | "pt";
  invert?: boolean; // lower is better (Avg. Pos)
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TK.muted }}>
        <Minus size={14} /> —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TK.muted : good ? TK.success : TK.danger;
  const label =
    unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
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
// PORTALED POPUPS (smart popovers)
// ---------------------------------------------------------------------------*/
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
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none", isolation: "isolate" }}>
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{ backgroundColor: "#ffffff", border: `1px solid ${TK.border}`, color: TK.text, borderRadius: 6 }}
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
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TK.muted }}>{nameMap?.[p.name] ?? p.name}</span>
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
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  const highlightName = (parts.length && parts[0].name) || undefined;
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = p.name === highlightName;
          return (
            <div key={i} className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={cn(isActive ? "font-semibold" : "")} style={{ color: TK.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={cn("font-semibold")}>{fmt(Number(p.value))}</div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* -----------------------------------------------------------------------------
// SNAPSHOT — Stacked Donut
// ---------------------------------------------------------------------------*/
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

/* -----------------------------------------------------------------------------
// TREND — Stacked Bars / Area
// ---------------------------------------------------------------------------*/
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
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[k]} fill={colors[k]} fillOpacity={0.25} strokeWidth={2} dot={false} />
            ))}
            <ReferenceLine y={0} stroke={TK.muted} strokeOpacity={0.12} />
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

/* -----------------------------------------------------------------------------
// CARD SHELL
// ---------------------------------------------------------------------------*/
function CardShell({
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
  source: "GSC" | "RT" | "Ext" | "Internal";
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "pt";
  invert?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
  glyph?: React.ReactNode;
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
        style={{ borderColor: TK.border }}
      >
        {/* Title row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
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
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ border: `1px solid ${TK.border}`, background: "#F5F7FA", color: TK.valueBlue }}
          >
            {source}
          </span>
        </div>

        {/* Content row: donut | value/delta | trend */}
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
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
// SECTION — Page KPI Summary (6 preferred cards)
// ---------------------------------------------------------------------------*/
type ShareMode = boolean;

export function PageKpiSummary({
  data,
  onExport,
  onJump,
}: {
  data: PageKpiSummaryData;
  onExport?: (fmt: "csv" | "png") => void;
  onJump?: (dest: "traffic" | "ranking" | "visibility" | "gsc" | "tracked" | "avgpos") => void;
}) {
  const [shareMode, setShareMode] = React.useState<ShareMode>(false);

  // Series prep
  const trafficSP = toSP(data.organicTraffic.series);
  const kwSP = toSP(data.rankingKeywords.series);
  const visSP = toSP(data.visibilityScore.series);
  const trackedSP = toSP(data.trackedKeywords.series);
  const clicksSP = (data.clicksImpr.clicksSeries ?? []).map((p) => ({ t: p.date, v: p.value }));
  const imprSP = (data.clicksImpr.impressionsSeries ?? []).map((p) => ({ t: p.date, v: p.value }));
  const avgPosSP = toSP(data.avgPosition.series);

  // Stacked rows (same breakdown used for snapshot donut + trend)
  const trafficBuckets = React.useMemo(() => splitSeries(trafficSP, POS, 0.07), [trafficSP]);
  const kwPosRows = React.useMemo(() => splitSeries(kwSP, POS, 0.07), [kwSP]);
  const visPosRows = React.useMemo(() => splitSeries(kwSP.length ? kwSP : trafficSP, POS, 0.06), [kwSP, trafficSP]); // proxy
  const trackedPosRows = React.useMemo(() => splitSeries(trackedSP, POS, 0.07), [trackedSP]);
  const posDistRows = React.useMemo(() => splitSeries(imprSP.length ? imprSP : trackedSP, POS, 0.06), [imprSP, trackedSP]);

  const clicksRows: Row[] = React.useMemo(() => {
    const n = Math.min(clicksSP.length, imprSP.length);
    const out: Row[] = [];
    for (let i = 0; i < n; i++) {
      const c = Math.max(0, clicksSP[i].v || 0);
      const m = Math.max(0, imprSP[i].v || 0);
      out.push({ t: clicksSP[i].t, clicks: c, unclicked: Math.max(0, m - c) });
    }
    return out;
  }, [clicksSP, imprSP]);

  // Deltas (last - prev)
  const deltaFrom = (sp?: SeriesPoint[]) => {
    if (!sp || sp.length < 2) return undefined;
    return (sp[sp.length - 1].value ?? 0) - (sp[sp.length - 2].value ?? 0);
    };
  const dTraffic = deltaFrom(data.organicTraffic.series);
  const dKW = deltaFrom(data.rankingKeywords.series);
  const dVis = deltaFrom(data.visibilityScore.series);
  const dTracked = deltaFrom(data.trackedKeywords.series);
  const dAvgPos = deltaFrom(data.avgPosition.series);
  const dClicks = deltaFrom(data.clicksImpr.clicksSeries);

  return (
    <section
      className="w-full mt-2"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="rounded-md bg-white p-4" style={{ border: `1px solid ${TK.border}` }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={20} color={TK.brand} />
            <h2 className="text-[20px] font-semibold" style={{ color: TK.text }}>
              Page KPI Summary
            </h2>
            <button
              className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50 cursor-pointer"
              title="Each KPI shows a stacked snapshot and a stacked trend using the same breakdown."
              aria-label="About this section"
            >
              <Info size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: TK.muted }}>
              <input
                type="checkbox"
                checked={shareMode}
                onChange={(e) => setShareMode(e.target.checked)}
                className="h-4 w-4 rounded border"
                style={{ accentColor: TK.valueBlue, borderColor: TK.border, cursor: "pointer" }}
              />
              Show % share
            </label>

            <button
              className="ml-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 border hover:bg-gray-50 cursor-pointer"
              aria-label="Export KPI Summary"
              onClick={() => onExport?.("csv")}
              style={{ borderColor: TK.border, background: TK.panel, color: TK.valueBlue }}
            >
              <Download size={16} />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* KPI Grid (6 preferred cards) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1) Organic Traffic — position buckets */}
          <CardShell
            title="Organic Traffic"
            source="RT"
            info="Estimated visits by rank buckets (snapshot) and distribution over time (trend)."
            glyph={<BarChart3 size={16} color={TK.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(trafficBuckets, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({
                  ...p,
                  name: p.key,
                }))}
                nameMap={POS_NAMES}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.organicTraffic.value}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dTraffic === "number" ? dTraffic : undefined}
            trend={
              <TrendStack
                rows={trafficBuckets}
                keys={["p1_3", "p4_10", "p11_20", "p21p"]}
                colors={POS_COLORS}
                names={POS_NAMES}
                mode="area"
                share={shareMode}
              />
            }
            onClick={() => onJump?.("traffic")}
          />

          {/* 2) Ranking Keywords (Top 100) — position buckets */}
          <CardShell
            title="Ranking Keywords (Top 100)"
            source="RT"
            info="Keyword counts grouped by best rank bucket."
            glyph={<Search size={16} color={TK.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(kwPosRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({
                  ...p,
                  name: p.key,
                }))}
                nameMap={POS_NAMES}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.rankingKeywords.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dKW === "number" ? dKW : undefined}
            trend={
              <TrendStack
                rows={kwPosRows}
                keys={["p1_3", "p4_10", "p11_20", "p21p"]}
                colors={POS_COLORS}
                names={POS_NAMES}
                mode="bars"
                share={shareMode}
              />
            }
            onClick={() => onJump?.("ranking")}
          />

          {/* 3) Visibility Score — impression/keyword rank buckets */}
          <CardShell
            title="Visibility Score"
            source="RT"
            info="Share of keywords in Top 10; snapshot & trend show rank bucket mix."
            glyph={<Target size={16} color={TK.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(visPosRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({
                  ...p,
                  name: p.key,
                }))}
                nameMap={POS_NAMES}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.visibilityScore.valuePct}
            valueFmt={(v) => `${v.toFixed(1)}%`}
            delta={typeof dVis === "number" ? dVis : undefined}
            deltaUnit="pp"
            trend={
              <TrendStack
                rows={visPosRows}
                keys={["p1_3", "p4_10", "p11_20", "p21p"]}
                colors={POS_COLORS}
                names={POS_NAMES}
                mode="area"
                share={shareMode}
              />
            }
            onClick={() => onJump?.("visibility")}
          />

          {/* 4) Clicks / Impressions — clicks vs unclicked impressions */}
          <CardShell
            title="Clicks / Impressions"
            source="GSC"
            info={`CTR ${(data.clicksImpr.ctr ?? 0) * 100 < 0.1 ? "<0.1" : ((data.clicksImpr.ctr ?? 0) * 100).toFixed(1)}% · Avg Pos ${
              data.clicksImpr.avgPos ?? "—"
            }`}
            glyph={<Eye size={16} color={TK.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(clicksRows, ["clicks", "unclicked"], CI_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={CI_NAMES}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.clicksImpr.clicks}
            valueFmt={(v) => `${intFmt.format(v)} / ${intFmt.format(data.clicksImpr.impressions)}`}
            delta={typeof dClicks === "number" ? dClicks : undefined}
            trend={<TrendStack rows={clicksRows} keys={["clicks", "unclicked"]} colors={CI_COLORS} names={CI_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump?.("gsc")}
          />

          {/* 5) Tracked Keywords — position buckets */}
          <CardShell
            title="Tracked Keywords"
            source="RT"
            info="Tracked terms grouped by best rank bucket."
            glyph={<ListFilter size={16} color={TK.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(trackedPosRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({
                  ...p,
                  name: p.key,
                }))}
                nameMap={POS_NAMES}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.trackedKeywords.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dTracked === "number" ? dTracked : undefined}
            trend={
              <TrendStack
                rows={trackedPosRows}
                keys={["p1_3", "p4_10", "p11_20", "p21p"]}
                colors={POS_COLORS}
                names={POS_NAMES}
                mode="bars"
                share={shareMode}
              />
            }
            onClick={() => onJump?.("tracked")}
          />

          {/* 6) Avg. Position — impression rank buckets (lower is better) */}
          <CardShell
            title="Avg. Position"
            source="GSC"
            info="Average rank (lower is better); snapshot & trend show impression mix by rank bucket."
            glyph={<Gauge size={16} color={TK.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(posDistRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({
                  ...p,
                  name: p.key,
                }))}
                nameMap={POS_NAMES}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.avgPosition.value}
            valueFmt={(v) => `#${v.toFixed(1)}`}
            delta={typeof dAvgPos === "number" ? Math.round(dAvgPos * 10) / 10 : undefined}
            deltaUnit="pt"
            invert
            trend={
              <TrendStack
                rows={posDistRows}
                keys={["p1_3", "p4_10", "p11_20", "p21p"]}
                colors={POS_COLORS}
                names={POS_NAMES}
                mode="bars"
                share={shareMode}
              />
            }
            onClick={() => onJump?.("avgpos")}
          />
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
// Demo helpers (optional) — remove in production
// ---------------------------------------------------------------------------*/
function toISODate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}
function mkSeries(len = 14, start = 100, amp = 10) {
  return Array.from({ length: len }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (len - 1 - i));
    return {
      date: toISODate(d),
      value: Math.max(0, Math.round(start + Math.sin(i / 2) * amp + (Math.random() - 0.5) * 6)),
    };
  });
}

export function createMockPageKpiSummary(): PageKpiSummaryData {
  const clicksSeries = mkSeries(14, 1200, 120);
  const impressionsSeries = mkSeries(14, 9000, 300);
  return {
    organicTraffic: { value: 11850, series: mkSeries(14, 10500, 950) },
    rankingKeywords: { count: 86, series: mkSeries(14, 80, 8) },
    visibilityScore: { valuePct: 54.2, series: mkSeries(14, 52, 3) },
    clicksImpr: {
      clicks: clicksSeries[clicksSeries.length - 1].value,
      impressions: impressionsSeries[impressionsSeries.length - 1].value,
      ctr: 0.023,
      avgPos: 14.2,
      clicksSeries,
      impressionsSeries,
    },
    trackedKeywords: { count: 24, series: mkSeries(14, 22, 3) },
    avgPosition: { value: 18.6, series: mkSeries(14, 19, 0.8) },
  };
}

/* Default demo export (optional) */
export default function DemoPageKpiSummary() {
  const data = React.useMemo(() => createMockPageKpiSummary(), []);
  return (
      <><PageKpiSummary
        data={data}
        onExport={(fmt) => console.log("Export:", fmt)}
        onJump={(dest) => console.log("Jump to:", dest)}
      /></>
  );
}
