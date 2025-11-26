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
import { Download, Info, BarChart3, Target, CheckSquare, Layers, Sparkles } from "lucide-react";

/* =============================================================================
   Keyword Rank Summary — KPI Row (A1–A4)
   - Inter / Inter Fallback fonts
   - Branded icons (#008CCD)
   - Modern stacked donut + stacked trend with smart portal popovers
   - Pointer cursor on interactive elements
   - Export button in the header
   ============================================================================ */

/* ----------------------------------------------------------------------------- */
/* TOKENS */
/* ----------------------------------------------------------------------------- */
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

const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;

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
    document.body,
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
        {typeof label === "string" ? label : String(label)}
      </div>
      {!asShare && rows.length > 1 && (
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
            <div key={i} className={`flex items-center justify-between gap-6 rounded px-1 py-0.5 ${isActive ? "bg-gray-50" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: (p as any).color }} />
                <span className={`transition-colors ${isActive ? "font-medium text-slate-800" : ""}`} style={{ color: TK.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={`font-semibold ${isActive ? "text-slate-900" : ""}`}>{fmt(Number(p.value))}</div>
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
  if (!active || forceHide || !containerRect || !coordinate) return null;
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
            <div key={i} className={`flex items-center justify-between gap-6 rounded px-1 py-0.5 ${isActive ? "bg-gray-50" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={`transition-colors ${isActive ? "font-medium text-slate-800" : ""}`} style={{ color: TK.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={`font-semibold ${isActive ? "text-slate-900" : ""}`}>{fmt(Number(p.value))}</div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* ----------------------------------------------------------------------------- */
/* STACKED DONUT (blank center) */
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
      <div className="pointer-events-none absolute inset-0" />
    </div>
  );
}

/* ----------------------------------------------------------------------------- */
/* TREND STACK (area/bars) with portaled popover & hovered-series highlight */
/* ----------------------------------------------------------------------------- */
type Row = { t: string } & Record<string, string | number>;

function TrendStack({
  rows,
  keys,
  colors,
  names,
  mode,
  share,
  height = 64,
  valueFmt,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  mode: "area" | "bars";
  share: boolean;
  height?: number;
  valueFmt?: (n: number) => string;
}) {
  const to100 = (rs: Row[]) =>
    rs.map((r) => {
      const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
      const out: Row = { t: r.t } as Row;
      keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
      return out;
    });

  const data = share ? to100(rows) : rows;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const _fmt = valueFmt ?? ((v: number) => (share ? pctFmt(v, 1) : intFmt.format(Math.round(v))));
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  return (
    <div ref={ref} className="min-w-[160px]" style={{ height }} role="img" aria-label="KPI trend">
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
                  valueFmt={_fmt}
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
                  valueFmt={_fmt}
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
/* DELTA BADGE */
/* ----------------------------------------------------------------------------- */
function DeltaBadge({
  delta,
  goodWhenDown = false,
  unit = "%",
}: {
  delta: number;
  goodWhenDown?: boolean;
  unit?: "%" | "pp";
}) {
  const good = goodWhenDown ? delta < 0 : delta > 0;
  const color = Math.abs(delta) < 1e-4 ? TK.muted : good ? TK.success : TK.danger;
  return (
    <span className="text-xs" style={{ color }}>
      {delta === 0 ? "—" : unit === "pp" ? `${Math.abs(delta).toFixed(1)} pp` : `${Math.abs(delta).toFixed(1)}%`}
    </span>
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
  valueNode,
  subNode,
  trend,
}: {
  title: string;
  glyph: React.ReactNode;
  info?: string;
  donut: React.ReactNode;
  valueNode: React.ReactNode;
  subNode?: React.ReactNode;
  trend: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="group relative w-full cursor-pointer text-left"
      aria-label={`${title} card`}
      title={info || title}
    >
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
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]">
              <Info size={14} />
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
              {valueNode}
            </div>
            {subNode ? <div className="mt-0.5">{subNode}</div> : null}
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* ----------------------------------------------------------------------------- */
/* TYPES (matches your previous props) */
/* ----------------------------------------------------------------------------- */
export type RankSummaryProps = {
  checked: number;
  ranked: number;
  avgCurrent: number | null;
  avgHistory: (number | null)[];
  counts10: number[];
  coverage10: number[]; // 0..100
  newly7d: { dates: string[]; counts: number[] };
};

/* ----------------------------------------------------------------------------- */
/* MAIN COMPONENT */
/* ----------------------------------------------------------------------------- */
export default function KeywordRankSummary({
  checked,
  ranked,
  avgCurrent,
  avgHistory,
  counts10,
  coverage10,
  newly7d,
}: RankSummaryProps) {
  /* ---------- SECTION HEADER: export CSV ---------- */
  const exportCSV = React.useCallback(() => {
    const covNow = checked ? (ranked / checked) * 100 : 0;
    const avgPrev = (() => {
      const arr = avgHistory.filter((v) => v != null) as number[];
      return arr.length > 1 ? arr[arr.length - 2]! : null;
    })();
    const dAvg = avgPrev == null || avgCurrent == null ? 0 : avgCurrent - avgPrev;

    const newlyTotal = (newly7d?.counts ?? []).reduce((a, b) => a + (b || 0), 0);
    const rows = [
      ["metric", "value"],
      ["Checked Keywords", String(checked)],
      ["Ranked Coverage", `${covNow.toFixed(1)}% (${ranked}/${checked})`],
      ["Avg. Position", avgCurrent == null ? "—" : `#${avgCurrent.toFixed(1)} (Δ ${dAvg > 0 ? "+" : ""}${dAvg.toFixed(1)})`],
      ["Newly Ranked (7d total)", String(newlyTotal)],
    ]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `keyword_rank_summary.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [checked, ranked, avgCurrent, avgHistory, newly7d]);

  /* ---------- DERIVED SERIES ---------- */
  // Checked trend breakdown (absolute): Ranked vs Not ranking
  const RUNS = Math.max(counts10.length, coverage10.length);
  const checkedTrendRows: Row[] = Array.from({ length: RUNS }, (_, i) => {
    const total = Number(counts10[i] || 0);
    const cov = Number(coverage10[i] || 0) / 100;
    const r = Math.round(total * cov);
    const nr = Math.max(0, total - r);
    return { t: `Run ${i + 1}`, Ranked: r, "Not ranking": nr };
  });

  // Ranked coverage trend (% share): Ranked vs Not ranking
  const rankedShareRows: Row[] = Array.from({ length: RUNS }, (_, i) => {
    const cov = Math.max(0, Math.min(100, Number(coverage10[i] || 0)));
    return { t: `Run ${i + 1}`, Ranked: cov, "Not ranking": Math.max(0, 100 - cov) };
  });

  // Avg position trend (single series)
  const avgSeriesRows: Row[] = (avgHistory ?? []).map((v, i) => ({ t: `Run ${i + 1}`, avg: Number(v ?? NaN) }));

  // Avg position donut breakdown over history: improved / declined / flat / no data
  const hist = (avgHistory || []).filter((v) => typeof v === "number") as number[];
  let imp = 0,
    dec = 0,
    flat = 0;
  for (let i = 1; i < (avgHistory || []).length; i++) {
    const prev = avgHistory[i - 1],
      cur = avgHistory[i];
    if (prev == null || cur == null) continue;
    if (cur < prev - 1e-6) imp++;
    else if (cur > prev + 1e-6) dec++;
    else flat++;
  }
  const nodata = Math.max(0, (avgHistory?.length || 0) - 1 - (imp + dec + flat));

  // Newly ranked 7d
  const newlyRows: Row[] = (newly7d?.dates || []).map((d, i) => ({ t: d, Newly: Number(newly7d?.counts?.[i] || 0) }));
  const newlyTotal7 = newlyRows.reduce((s:any, r:any) => s + (r.Newly || 0), 0);

  // Coverage snapshot now
  const covNowPct = checked ? (ranked / checked) * 100 : 0;

  // Avg delta (vs previous point)
  const avgPrev = hist.length > 1 ? hist[hist.length - 2] : null;
  const avgDelta = avgCurrent != null && avgPrev != null ? avgCurrent - avgPrev : 0;

  // New vs tracked snapshot donut (use ranked as 'tracked & ranking now' proxy)
  const otherRankedNow = Math.max(0, ranked - newlyTotal7);

  /* ---------- COLORS + NAME MAPS ---------- */
  const COV_COL = { Ranked: TK.success, "Not ranking": TK.danger };
  const COV_NAME = { Ranked: "Ranked", "Not ranking": "Not ranking" };
  const AVG_COL = { avg: TK.valueBlue };
  const AVG_NAME = { avg: "Avg position" };
  const AVG_DONUT = [
    { key: "Improved", name: "Improved", value: imp, color: TK.success },
    { key: "Declined", name: "Declined", value: dec, color: TK.danger },
    { key: "Flat", name: "Flat", value: flat, color: "#60A5FA" },
    { key: "No data", name: "No data", value: nodata, color: TK.gray },
  ];
  const NEW_COL = { Newly: TK.valueBlue };
  const NEW_NAME = { Newly: "Newly ranked" };
if (!checked && checked !== 0) checked = 0;
if (!ranked && ranked !== 0) ranked = 0;
if (!avgCurrent && avgCurrent !== 0) avgCurrent = null;

if (!Array.isArray(avgHistory) || avgHistory.length === 0)
  avgHistory = Array.from({ length: 10 }, () => null);

if (!Array.isArray(counts10) || counts10.length === 0)
  counts10 = Array.from({ length: 10 }, () => 0);

if (!Array.isArray(coverage10) || coverage10.length === 0)
  coverage10 = Array.from({ length: 10 }, () => 0);

if (!newly7d || !newly7d.dates || !newly7d.counts)
  newly7d = { dates: [], counts: [] };

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
      <header className="mb-3 flex items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            Keyword Rank Summary
          </h2>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex h-8 items-center gap-2 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50"
          style={{ borderColor: TK.border, cursor: "pointer", color: TK.valueBlue }}
          title="Export snapshot CSV"
        >
          <Download size={16} />
          Export
        </button>
      </header>

      {/* KPI GRID (4 cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* A1 — Checked Keywords */}
        <KpiCard
          title="Checked Keywords"
          glyph={<Layers size={16} color={TK.brand} />}
          info="Last run snapshot and last checks trend. Donut shows Ranked vs Not ranking."
          donut={
            <StackedDonut
              parts={[
                { key: "Ranked", name: "Ranked", value: ranked, color: COV_COL.Ranked },
                { key: "Not ranking", name: "Not ranking", value: Math.max(0, checked - ranked), color: COV_COL["Not ranking"] },
              ]}
              nameMap={COV_NAME}
              valueFmt={(v) => intFmt.format(v)}
            />
          }
          valueNode={<>{intFmt.format(checked)}</>}
          subNode={<DeltaBadge delta={0} />} // no delta for absolute 'checked' count; keep neutral
          trend={<TrendStack rows={checkedTrendRows} keys={["Ranked", "Not ranking"]} colors={COV_COL} names={COV_NAME} mode="bars" share={false} />}
        />

        {/* A2 — Ranked (Coverage) */}
        <KpiCard
          title="Ranked"
          glyph={<CheckSquare size={16} color={TK.brand} />}
          info="Coverage of checked keywords that are ranking (≤100)."
          donut={
            <StackedDonut
              parts={[
                { key: "Ranked", name: "Ranked", value: ranked, color: COV_COL.Ranked },
                { key: "Not ranking", name: "Not ranking", value: Math.max(0, checked - ranked), color: COV_COL["Not ranking"] },
              ]}
              nameMap={COV_NAME}
              valueFmt={(v) => intFmt.format(v)}
            />
          }
          valueNode={<>{pctFmt(covNowPct, 1)}</>}
          subNode={<span className="text-xs" style={{ color: TK.muted }}>{`${intFmt.format(ranked)} of ${intFmt.format(checked)}`}</span>}
          trend={<TrendStack rows={rankedShareRows} keys={["Ranked", "Not ranking"]} colors={COV_COL} names={COV_NAME} mode="area" share={true} />}
        />

        {/* A3 — Avg. Position */}
        <KpiCard
          title="Avg. Position"
          glyph={<Target size={16} color={TK.brand} />}
          info="Weighted average rank across ranking results (lower is better). Donut shows Improved/Declined over recent checks."
          donut={<StackedDonut parts={AVG_DONUT} nameMap={{}} valueFmt={(v) => intFmt.format(v)} />}
          valueNode={<>{avgCurrent == null ? "—" : `#${avgCurrent.toFixed(1)}`}</>}
          subNode={<DeltaBadge delta={avgDelta} goodWhenDown unit="pp" />}
          trend={<TrendStack rows={avgSeriesRows} keys={["avg"]} colors={AVG_COL} names={AVG_NAME} mode="area" share={false} valueFmt={(v) => `#${v.toFixed(1)}`} />}
        />

        {/* A4 — Newly Ranked vs Tracked */}
        <KpiCard
          title="Newly Ranked vs Tracked"
          glyph={<Sparkles size={16} color={TK.brand} />}
          info="Keywords that started ranking recently. Donut compares last 7‑day newly ranked total vs other ranked now."
          donut={
            <StackedDonut
              parts={[
                { key: "Newly", name: "Newly", value: newlyTotal7, color: TK.valueBlue },
                { key: "Other ranked", name: "Other ranked", value: otherRankedNow, color: "#60A5FA" },
              ]}
              nameMap={{ Newly: "Newly (7d total)", "Other ranked": "Other ranked now" }}
              valueFmt={(v) => intFmt.format(v)}
            />
          }
          valueNode={<>{intFmt.format(Number(newlyRows.at(-1)?.Newly || 0))}</>}
          subNode={<span className="text-xs" style={{ color: TK.muted }}>Latest day</span>}
          trend={<TrendStack rows={newlyRows} keys={["Newly"]} colors={NEW_COL} names={NEW_NAME} mode="bars" share={false} />}
        />
      </div>
    </section>
  );
}


