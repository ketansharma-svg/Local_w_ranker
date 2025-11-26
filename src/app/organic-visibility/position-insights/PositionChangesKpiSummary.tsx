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
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import { createPortal } from "react-dom";
import {
  BarChart3 as SectionIcon,
  Download,
  Info,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  XCircle,
} from "lucide-react";

/* =============================================================================
   Wranker – OVI • Section 1: KPI Summary (Position Changes)
   ----------------------------------------------------------------------------- 
   - Inter / Inter Fallback fonts; no emoji
   - Branded (#008CCD) icons for section & card titles
   - KPI card pattern:
       • Snapshot: STACKED DONUT (breakdown by rank buckets)
       • Trend: STACKED BARS / AREA (same breakdown)
       • Smart popovers (portaled) — UPDATED to show COMPLETE breakdown lists
         and highlight the hovered item
   - Pointer cursors for interactive controls
   - Uses Wranker token colors
   - IMPORTANT: Do NOT place the metric value inside the donut center
   ============================================================================ */

/* ----------------------------------------------------------------------------- */
/* TOKENS • mapped from Wranker token docs (brand/core/status + accents)        */
/* ----------------------------------------------------------------------------- */
const TK = {
  // Brand + core
  brand: "#008CCD",
  coreBlue: "#4286F5",

  // Status
  success: "#34A853",
  warning: "#F9BB04",
  critical: "#E94134",

  // Accents
  indigo: "#6366F1",
  orange: "#F97316",

  // UI
  textStrong: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  borderSubtle: "#EFF0F6",

  // Other
  panel: "#FFFFFF",
  overlay: "rgba(17,24,39,0.96)",
} as const;

/* ----------------------------------------------------------------------------- */
/* TYPES                                                                        */
/* ----------------------------------------------------------------------------- */
export type ChangeKey = "new" | "lost" | "improved" | "declined";
export type ChangePoint = {
  date: string;
  new: number;
  lost: number;
  improved: number;
  declined: number;
};

export type KpiInput = {
  current: ChangePoint[];      // current window (e.g., last N days)
  previous?: ChangePoint[];    // previous window (same N days)
};

/* ----------------------------------------------------------------------------- */
/* UTILS / FORMATTERS                                                           */
/* ----------------------------------------------------------------------------- */
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

function pctDelta(curr: number, prev?: number) {
  if (typeof prev !== "number" || prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

/* ----------------------------------------------------------------------------- */
/* DEMO GENERATORS & MOCK DATA                                                  */
/* ----------------------------------------------------------------------------- */
export function createMockPositionChangeSeries(days = 14): KpiInput {
  const mk = (seed: number, amp: number) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const wobble = (n: number) => Math.max(0, Math.round(n + Math.sin(i / 1.7) * amp));
      return {
        date: toISO(d),
        new: wobble(seed * 0.5),
        improved: wobble(seed * 0.9),
        declined: wobble(seed * 0.7),
        lost: wobble(seed * 0.4),
      };
    });

  const current = mk(6, 3);
  const previous = mk(5, 2);
  return { current, previous };
}

/** Deterministic MOCK DATA (180 days) so the demo works for 7d / 30d / 90d ranges. */
export const MOCK_KPI_DATA: KpiInput = (() => {
  const days = 180;
  const mk = (seed: number, amp: number) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const wobble = (n: number) =>
        Math.max(0, Math.round(n + Math.sin((i + 3) / 2) * amp + Math.cos((i + 5) / 7) * amp * 0.5));
      return {
        date: toISO(d),
        new: wobble(seed * 0.55),
        improved: wobble(seed * 1.05),
        declined: wobble(seed * 0.8),
        lost: wobble(seed * 0.45),
      };
    });

  return { current: mk(8, 4), previous: mk(7, 3) };
})();

/* ----------------------------------------------------------------------------- */
/* RANK BUCKET BREAKDOWN (derived)                                              */
/* We allocate each daily total across Pos 1–3 / 4–10 / 11–20 / 21–50 / 51–100  */
/* using a profile per KPI + a small drift so charts feel realistic.            */
/* ----------------------------------------------------------------------------- */
type BucketKey = "p1_3" | "p4_10" | "p11_20" | "p21_50" | "p51_100";
type BucketRow = { t: string } & Record<BucketKey, number>;

const BUCKET_NAMES: Record<BucketKey, string> = {
  p1_3: "Pos 1–3",
  p4_10: "Pos 4–10",
  p11_20: "Pos 11–20",
  p21_50: "Pos 21–50",
  p51_100: "Pos 51–100",
};

// Color mapping aligned to Wranker tokens
const BUCKET_COLORS: Record<BucketKey, string> = {
  p1_3: TK.success,     // green
  p4_10: TK.coreBlue,   // blue
  p11_20: TK.indigo,    // indigo
  p21_50: TK.warning,   // yellow
  p51_100: TK.critical, // red
};

// Base profiles (sum ~1). Tweak bias per KPI.
const PROFILES: Record<ChangeKey, [number, number, number, number, number]> = {
  // More mid/bottom for "new"
  new: [0.08, 0.18, 0.24, 0.28, 0.22],
  // Improved skews towards better/mid ranks
  improved: [0.12, 0.26, 0.28, 0.22, 0.12],
  // Declined: heavier mid/lower
  declined: [0.06, 0.16, 0.26, 0.30, 0.22],
  // Lost: mostly lower buckets
  lost: [0.02, 0.06, 0.16, 0.30, 0.46],
};

function allocWithProfile(total: number, profile: number[], i: number): number[] {
  const wob = (idx: number) => 1 + 0.06 * Math.sin((i + idx) / 6);
  const w = profile.map((p, idx) => p * wob(idx));
  const wsum = sum(w) || 1;
  const raw = w.map((v) => (total * v) / wsum);

  // Round and keep sum consistent
  const rounded = raw.map((v) => Math.max(0, Math.floor(v)));
  let diff = Math.max(0, Math.round(total - sum(rounded)));
  const residuals = raw.map((v, idx) => ({ idx, r: v - rounded[idx] })).sort((a, b) => b.r - a.r);
  for (let k = 0; k < residuals.length && diff > 0; k++) {
    rounded[residuals[k].idx] += 1;
    diff -= 1;
  }
  return rounded;
}

function deriveBucketRows(series: ChangePoint[], key: ChangeKey): BucketRow[] {
  const prof = PROFILES[key];
  return series.map((row, i) => {
    const total = Number((row as any)[key]) || 0;
    const [b1, b2, b3, b4, b5] = allocWithProfile(total, prof, i);
    return { t: row.date, p1_3: b1, p4_10: b2, p11_20: b3, p21_50: b4, p51_100: b5 };
  });
}

/* ----------------------------------------------------------------------------- */
/* PORTALED SMART POPOVERS (UPDATED to show COMPLETE breakdowns)                */
/* - Donut: full list of segments (value + %) with hovered row highlighted      */
/* - Trend (area/bars): full list of stack segments with colored dots           */
/* ----------------------------------------------------------------------------- */
function PortalShell({ x, y, w = 260, children }: { x: number; y: number; w?: number; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - w - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div style={{ position: "fixed", top, left, zIndex: 2147483647 }}>
      <div
        className="rounded-md border p-2 text-xs"
        style={{ background: "#fff", borderColor: TK.border, color: TK.textStrong, width: w }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Donut popover — COMPLETE BREAKDOWN with hovered row highlight */
function DonutFullTooltip({
  active,
  coordinate,
  containerRect,
  parts,
  nameMap,
  activeIndex,
}: any & {
  containerRect?: DOMRect | null;
  parts: Array<{ key: string; name: string; value: number; color: string }>;
  nameMap?: Record<string, string>;
  activeIndex?: number | undefined;
}) {
  if (!active || !containerRect) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const total = Math.max(1, parts.reduce((s, p) => s + (Number(p.value) || 0), 0));

  return (
    <PortalShell x={x} y={y} w={260}>
      <div className="mb-1 font-medium" style={{ color: TK.textMuted }}>
        Breakdown
      </div>
      <div className="flex flex-col">
        {parts.map((p, i) => {
          const share = (Number(p.value) / total) * 100;
          const isActive = typeof activeIndex === "number" && activeIndex === i;
          return (
            <div
              key={p.key + i}
              className={`flex items-center justify-between gap-4 rounded px-1 py-0.5 ${isActive ? "bg-gray-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={`transition-colors ${isActive ? "font-medium" : ""}`} style={{ color: TK.textStrong }}>
                  {nameMap?.[p.name as any] ?? p.name}
                </span>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${isActive ? "" : ""}`}>{intFmt.format(Math.round(Number(p.value)))}</div>
                <div className="text-[11px]" style={{ color: TK.textMuted }}>
                  {pctFmt(share, 1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PortalShell>
  );
}

/** Trend popover — COMPLETE BREAKDOWN list with colored dots; hovered highlighted */
function TrendFullTooltip({
  active,
  payload,
  label,
  coordinate,
  containerRect,
  hoveredKey,
  nameMap,
  asShare,
}: any & {
  containerRect?: DOMRect | null;
  hoveredKey?: string | null;
  nameMap?: Record<string, string>;
  asShare?: boolean;
}) {
  if (!active || !payload || !payload.length || !containerRect) return null;

  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const labelText =
    typeof label === "string"
      ? new Date(label).toLocaleDateString(undefined, { month: "short", day: "2-digit" })
      : String(label);

  // Build full list from payload (keep series order as rendered)
  const rows: Array<{ key: string; name: string; value: number; color: string }> = payload
    .filter((p: any) => p && p.value != null && !Number.isNaN(p.value))
    .map((p: any) => ({ key: p.dataKey, name: p.dataKey, value: p.value, color: p.color }));

  return (
    <PortalShell x={x} y={y} w={260}>
      <div className="mb-1 text-[11px]" style={{ color: TK.textMuted }}>
        {labelText}
      </div>
      <div className="flex flex-col">
        {rows.map((r) => {
          const isActive = hoveredKey ? r.name === hoveredKey : false;
          return (
            <div
              key={r.key}
              className={`flex items-center justify-between gap-4 rounded px-1 py-0.5 ${isActive ? "bg-gray-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: r.color }} />
                <span className={`transition-colors ${isActive ? "font-medium" : ""}`} style={{ color: TK.textStrong }}>
                  {nameMap?.[r.name as any] ?? r.name}
                </span>
              </div>
              <div className="font-semibold">
                {asShare ? pctFmt(Number(r.value) as any, 1) : intFmt.format(Math.round(Number(r.value)))}
              </div>
            </div>
          );
        })}
      </div>
    </PortalShell>
  );
}

/* ----------------------------------------------------------------------------- */
/* SEGMENTED CHIP                                                               */
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
          className={`h-8 rounded-full px-3 text-sm transition ${
            value === it.value ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
          }`}
          style={{ cursor: "pointer" }}
          type="button"
          title={it.label}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------- */
/* STACKED DONUT (snapshot) — NO center metric value shown                      */
/* ----------------------------------------------------------------------------- */
function StackedDonut({
  parts,
  size = 92,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
}) {
  const data = parts
    .filter((p) => (p.value ?? 0) > 0)
    .map((p) => ({ ...p, v: p.value }));

  const ref = React.useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = React.useState<number | undefined>(undefined);

  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          {/* UPDATED: full-breakdown donut tooltip */}
          <RTooltip
            content={(tp: any) => (
              <DonutFullTooltip
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                parts={data}
                nameMap={BUCKET_NAMES}
                activeIndex={activeIdx}
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
      {/* Intentionally no center value per requirement */}
    </div>
  );
}

/* ----------------------------------------------------------------------------- */
/* TREND STACK (area/bars) with hovered-series highlight + portaled FULL list   */
/* ----------------------------------------------------------------------------- */
function TrendStack({
  rows,
  keys,
  colors,
  names,
  mode,
  share,
}: {
  rows: BucketRow[];
  keys: BucketKey[];
  colors: Record<BucketKey, string>;
  names: Record<BucketKey, string>;
  mode: "area" | "bars";
  share: boolean;
}) {
  const toShare = (rs: BucketRow[]) =>
    rs.map((r) => {
      const total = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
      const out: BucketRow = { t: r.t, p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 };
      keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / total) * 100));
      (out as any).t = r.t;
      return out;
    });

  const data = share ? toShare(rows) : rows;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [hoveredKey, setHoveredKey] = React.useState<BucketKey | null>(null);

  return (
    <div ref={ref} className="h-16 min-w-[auto]" role="img" aria-label="KPI trend">
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            {/* UPDATED: full-breakdown trend tooltip */}
            <RTooltip
              content={(tp: any) => (
                <TrendFullTooltip
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  hoveredKey={hoveredKey}
                  nameMap={names}
                  asShare={share}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TK.coreBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                name={k}
                stackId="a"
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
            {/* UPDATED: full-breakdown trend tooltip */}
            <RTooltip
              content={(tp: any) => (
                <TrendFullTooltip
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  hoveredKey={hoveredKey}
                  nameMap={names}
                  asShare={share}
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

/* ----------------------------------------------------------------------------- */
/* KPI CARD                                                                     */
/* ----------------------------------------------------------------------------- */
function KpiCard({
  title,
  icon,
  donut,
  value,
  deltaPct,
  invertDelta = false,
  trend,
}: {
  title: string;
  icon: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  deltaPct: number;
  invertDelta?: boolean;
  trend: React.ReactNode;
}) {
  const good = invertDelta ? deltaPct < 0 : deltaPct > 0;
  const tone =
    Math.abs(deltaPct) < 0.0001 ? TK.textMuted : good ? TK.success : TK.critical;

  return (
    <button
      type="button"
      className="group relative w-full cursor-pointer text-left"
      aria-label={`${title} card`}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px]"
        style={{ borderColor: TK.border }}
      >
        <div className="mb-2 flex items-center gap-2">
          {icon}
          <div className="truncate text-[13px] font-semibold" style={{ color: TK.textStrong }}>
            {title}
          </div>
          <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={title}>
            <Info size={14} />
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.coreBlue }}>
              {intFmt.format(Math.round(value))}
            </div>
            <div className="mt-0.5 text-xs font-medium" style={{ color: tone }}>
              {deltaPct === 0 ? "—" : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
            </div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* ----------------------------------------------------------------------------- */
/* MAIN • Section 1: KPI Summary (Position Changes)                             */
/* ----------------------------------------------------------------------------- */
export default function PositionChangesKpiSummary({
  data,
  title = "KPI Summary — Position Changes",
}: {
  data?: KpiInput;
  title?: string;
}) {
  // Data (safe fallback for canvas) – uses MOCK_KPI_DATA so all ranges render fully
  const safe = data ?? MOCK_KPI_DATA;

  // UI controls
  const [range, setRange] = React.useState<"7d" | "30d" | "90d">("30d");
  const [shareMode, setShareMode] = React.useState(false);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  // Slice current / previous windows
  const curr = React.useMemo(() => safe.current.slice(-days), [safe.current, days]);
  const prev = React.useMemo(() => (safe.previous ?? []).slice(-days), [safe.previous, days]);

  // Last point values (for headline)
  const lastVal = (k: ChangeKey) => (curr.length ? (curr[curr.length - 1] as any)[k] : 0);
  const prevLastVal = (k: ChangeKey) => (prev.length ? (prev[prev.length - 1] as any)[k] : 0);

  const vNew = lastVal("new");
  const vImproved = lastVal("improved");
  const vDeclined = lastVal("declined");
  const vLost = lastVal("lost");

  const dNew = pctDelta(vNew, prevLastVal("new"));
  const dImproved = pctDelta(vImproved, prevLastVal("improved"));
  const dDeclined = pctDelta(vDeclined, prevLastVal("declined"));
  const dLost = pctDelta(vLost, prevLastVal("lost"));

  // Derived bucket rows per KPI (snapshot + trend share the same breakdown)
  const NEW_ROWS = React.useMemo(() => deriveBucketRows(curr, "new"), [curr]);
  const IMP_ROWS = React.useMemo(() => deriveBucketRows(curr, "improved"), [curr]);
  const DEC_ROWS = React.useMemo(() => deriveBucketRows(curr, "declined"), [curr]);
  const LOST_ROWS = React.useMemo(() => deriveBucketRows(curr, "lost"), [curr]);

  const lastRow = (rows: BucketRow[]) =>
    rows.length
      ? rows[rows.length - 1]
      : { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 };

  const donutParts = (r: BucketRow) =>
    (["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"] as BucketKey[]).map((k) => ({
      key: k,
      name: k,
      value: r[k] || 0,
      color: BUCKET_COLORS[k],
    }));

  // Export CSV (snapshot)
  function exportCSV() {
    const rows = [
      ["metric", "value", "delta%"],
      ["New", vNew, dNew.toFixed(1)],
      ["Improved", vImproved, dImproved.toFixed(1)],
      ["Declined", vDeclined, dDeclined.toFixed(1)],
      ["Lost", vLost, dLost.toFixed(1)],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kpi_position_changes_${range}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

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
          <SectionIcon size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.textStrong }}>
            {title}
          </h2>
          <button
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
            aria-label="About"
            title="Snapshot (stacked donut) + stacked trend (same breakdown)."
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={range}
            onChange={(v) => setRange(v as any)}
            aria="KPI date range"
            items={[
              { label: "7d", value: "7d" },
              { label: "30d", value: "30d" },
              { label: "90d", value: "90d" },
            ]}
          />
          <label className="ml-2 inline-flex items-center gap-2 text-xs" style={{ color: TK.textMuted, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ borderColor: TK.border, accentColor: TK.coreBlue }}
            />
            Show % share in trends
          </label>
          <button
            onClick={exportCSV}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.coreBlue }}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* New (positive → AREA) */}
        <KpiCard
          title="New"
          icon={<PlusCircle size={16} color={TK.brand} />}
          donut={<StackedDonut parts={donutParts(lastRow(NEW_ROWS))} />}
          value={vNew}
          deltaPct={dNew}
          trend={
            <TrendStack
              rows={NEW_ROWS}
              keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]}
              colors={BUCKET_COLORS}
              names={BUCKET_NAMES}
              mode="area"
              share={shareMode}
            />
          }
        />

        {/* Improved (positive → AREA) */}
        <KpiCard
          title="Improved"
          icon={<TrendingUp size={16} color={TK.brand} />}
          donut={<StackedDonut parts={donutParts(lastRow(IMP_ROWS))} />}
          value={vImproved}
          deltaPct={dImproved}
          trend={
            <TrendStack
              rows={IMP_ROWS}
              keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]}
              colors={BUCKET_COLORS}
              names={BUCKET_NAMES}
              mode="area"
              share={shareMode}
            />
          }
        />

        {/* Declined (negative → BARS) */}
        <KpiCard
          title="Declined"
          icon={<TrendingDown size={16} color={TK.brand} />}
          donut={<StackedDonut parts={donutParts(lastRow(DEC_ROWS))} />}
          value={vDeclined}
          deltaPct={dDeclined}
          invertDelta
          trend={
            <TrendStack
              rows={DEC_ROWS}
              keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]}
              colors={BUCKET_COLORS}
              names={BUCKET_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
        />

        {/* Lost (negative → BARS) */}
        <KpiCard
          title="Lost"
          icon={<XCircle size={16} color={TK.brand} />}
          donut={<StackedDonut parts={donutParts(lastRow(LOST_ROWS))} />}
          value={vLost}
          deltaPct={dLost}
          invertDelta
          trend={
            <TrendStack
              rows={LOST_ROWS}
              keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]}
              colors={BUCKET_COLORS}
              names={BUCKET_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
        />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------- */
/* Optional demo wrapper so you can preview immediately in a canvas/sandbox     */
/* ----------------------------------------------------------------------------- */
export function Demo_KPI_Summary() {
  return (
    <div className="p-4" style={{ background: "#F5F7FA" }}>
      <PositionChangesKpiSummary data={MOCK_KPI_DATA} />
    </div>
  );
}
