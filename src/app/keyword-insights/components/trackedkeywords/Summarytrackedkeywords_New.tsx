"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  Sector,
  ReferenceLine,
  Rectangle,
} from "recharts";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Download,
  Info,
  List,
  Search,
  Target,
  Eye,
  Star,
  TrendingUp,
} from "lucide-react";

const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  valueBluePastel: "#D6E8FF", // pastel for #0077FF
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
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const last = <T,>(arr: T[], fb: T): T => (arr.length ? arr[arr.length - 1] : fb);
type Row = { t: string } & Record<string, number>;
const pctDelta = (curr: number, prev: number) => (!isFinite(prev) || prev === 0 ? 0 : ((curr - prev) / prev) * 100);
const shortDate = (iso: string | number) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/* ----------------------------------------------------------------------------- */
/* PORTALED SMART POPOVERS (colored dot annotations) */
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
      {typeof label !== "undefined" && (
        <div className="mb-1 font-medium" style={{ color: TK.muted }}>
          {String(label)}
        </div>
      )}
      {!asShare && total > 0 && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TK.muted }}>
            Total
          </span>
          <span className="font-semibold">{intFmt.format(Math.round(total))}</span>
        </div>
      )}
      <div className="flex flex-col">
        {rows.map((p: any, i: number) => {
          const isActive = hoveredKey && p.name === hoveredKey;
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
/* SEGMENTED CHIP + DELTA BADGE */
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
function DeltaBadge({ deltaPct, invert = false, unit = "%" }: { deltaPct: number; invert?: boolean; unit?: "%" | "pp" }) {
  const good = invert ? deltaPct < 0 : deltaPct > 0;
  const color = Math.abs(deltaPct) < 0.0001 ? TK.muted : good ? TK.success : TK.danger;
  return (
    <span className="text-xs" style={{ color }}>
      {deltaPct === 0 ? "—" : unit === "pp" ? `${Math.abs(deltaPct).toFixed(1)} pp` : `${Math.abs(deltaPct).toFixed(1)}%`}
    </span>
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
/* STACKED TREND (area or bars) */
/* ----------------------------------------------------------------------------- */
function TrendStack({
  rows,
  keys,
  colors,
  names,
  mode,
  share,
}: {
  rows: any;
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  mode: "area" | "bars";
  share: boolean;
}) {
  const to100 = (rs: Row[]) =>
    rs.map((r) => {
      const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
      const out: any = { t: r.t };
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
/* KPI CARD */
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
/* DATA (demo generators to mirror pipeline) */
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
  const sum = (r.p1_3 || 0) + (r.p4_10 || 0) + (r.p11_20 || 0) + (r.p21_50 || 0) + (r.p51_100 || 0);
  if (!sum) return 0;
  const num =
    (r.p1_3 || 0) * w.p1_3 +
    (r.p4_10 || 0) * w.p4_10 +
    (r.p11_20 || 0) * w.p11_20 +
    (r.p21_50 || 0) * w.p21_50 +
    (r.p51_100 || 0) * w.p51_100;
  return num / sum;
}

/* ----------------------------------------------------------------------------- */
/* BREAKDOWN COLORS + LABELS */
/* ----------------------------------------------------------------------------- */
const POS5_COL: Record<string, string> = {
  p1_3: TK.success,
  p4_10: "#60A5FA",
  p11_20: "#7E72FF",
  p21_50: TK.warn,
  p51_100: TK.danger,
};
const POS5_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50", p51_100: "Pos 51–100" };

const TRK_COL: Record<string, string> = { top10: TK.success, p11_50: "#60A5FA", p51_100: TK.warn, notRanking: TK.gray };
const TRK_NAME = { top10: "Top‑10", p11_50: "Pos 11–50", p51_100: "Pos 51–100", notRanking: "Not Ranking" };

const TOP3_COL: Record<string, string> = { pos1: TK.success, pos2: "#34D399", pos3: "#93C5FD" };
const TOP3_NAME = { pos1: "Pos 1", pos2: "Pos 2", pos3: "Pos 3" };

const T10_COL: Record<string, string> = { top1_3: TK.success, top4_6: "#60A5FA", top7_10: "#7E72FF" };
const T10_NAME = { top1_3: "Pos 1–3", top4_6: "Pos 4–6", top7_10: "Pos 7–10" };

const T50_COL: Record<string, string> = { top10: TK.success, p11_20: "#7E72FF", p21_50: TK.warn };
const T50_NAME = { top10: "Pos 1–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50" };

const NEW_COL: Record<string, string> = { new1_10: TK.success, new11_50: "#60A5FA", new51_100: "#F59E0B" };
const NEW_NAME = { new1_10: "New 1–10", new11_50: "New 11–50", new51_100: "New 51–100" };

const VIS_COL: Record<string, string> = { p1_3: TK.success, p4_10: "#60A5FA", p11p: TK.gray };
const VIS_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11p: "Pos 11+" };

/* ----------------------------------------------------------------------------- */
/* OTHER CHARTS (Rank Distribution / Coverage Trend / Gainers vs Losers / Traffic) */
/* ----------------------------------------------------------------------------- */

/* Rank Distribution (REFINED: blue main bar, pastel previous + toggle) */
const RankDistributionCard = ({
  buckets,
  today,
  ago30,
}: {
  buckets: string[];
  today: number[];
  ago30: number[];
}) => {
  const [comparePrev, setComparePrev] = React.useState(true);
  const rows = buckets.map((b, i) => ({ bucket: b, today: today[i] || 0, previous: ago30[i] || 0 }));
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => intFmt.format(Math.round(v));

  return (
    <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} color={TK.brand} />
          <div className="text-[13px] font-semibold" style={{ color: TK.text }}>
            Rank Distribution
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs" style={{ color: TK.muted, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={comparePrev}
            onChange={(e) => setComparePrev(e.target.checked)}
            className="h-4 w-4 rounded border"
            style={{ accentColor: TK.valueBlue, borderColor: TK.border }}
          />
          Compare Previous
        </label>
      </div>

      <div ref={ref} className="h-[240px] w-full">
        <ResponsiveContainer>
          <BarChart data={rows}>
            <CartesianGrid stroke={TK.border} vertical={false} />
            <XAxis dataKey="bucket" tick={{ fill: TK.muted }} />
            <YAxis tick={{ fill: TK.muted }} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  label={tp?.label}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={{ today: "Today", previous: "Previous Period" }}
                  valueFmt={valueFmt}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="today" name="today" fill={TK.valueBlue} radius={[6, 6, 0, 0]} />
            {comparePrev && <Bar dataKey="previous" name="previous" fill={TK.valueBluePastel} radius={[6, 6, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* Coverage Trend (Top3 / Top10 / Top50) — short x-axis labels */
const CoverageTrendCard = ({ dates, top3, top10, top50 }: { dates: string[]; top3: number[]; top10: number[]; top50: number[] }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const data = dates.map((t, i) => ({ t, Top3: top3[i] || 0, Top10: top10[i] || 0, Top50: top50[i] || 0 }));
  const names = { Top3: "Top 3", Top10: "Top 10", Top50: "Top 50" };
  const colors: Record<string, string> = { Top3: TK.success, Top10: "#60A5FA", Top50: TK.valueBlue };
  return (
    <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 size={16} color={TK.brand} />
        <div className="text-[13px] font-semibold" style={{ color: TK.text }}>
          Rank Coverage Trend
        </div>
      </div>
      <div ref={ref} className="h-[240px] w-full">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke={TK.border} vertical={false} />
            <XAxis dataKey="t" tick={{ fill: TK.muted }} tickFormatter={(v) => shortDate(v)} minTickGap={16} />
            <YAxis tick={{ fill: TK.muted }} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={(v) => intFmt.format(Math.round(Number(v)))}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
            />
            {Object.keys(names).map((k) => (
              <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[k]} fill={colors[k]} fillOpacity={0.2} dot={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* Gainers vs Losers — x-axis in the middle; rounded far ends only; short x labels */
const RoundedBarShape: React.FC<any> = (props) => {
  const { value } = props;
  const isPositive = Number(value) >= 0;
  const radius: [number, number, number, number] = isPositive ? [6, 6, 0, 0] : [0, 0, 6, 6];
  return <Rectangle {...props} radius={radius} />;
};

const GainersLosersCard = ({ dates, gained, lost }: { dates: string[]; gained: number[]; lost: number[] }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  // "lost" rendered as negative to appear below axis
  const rows = dates.map((t, i) => ({ t, Gained: gained[i] || 0, Lost: -Math.abs(lost[i] || 0), Net: (gained[i] || 0) - Math.abs(lost[i] || 0) }));
  const names = { Gained: "Gained", Lost: "Lost", Net: "Net" };
  return (
    <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 size={16} color={TK.brand} />
        <div className="text-[13px] font-semibold" style={{ color: TK.text }}>
          Gainers vs Losers
        </div>
      </div>
      <div ref={ref} className="h-[240px] w-full">
        <ResponsiveContainer>
          <ComposedChart data={rows}>
            <CartesianGrid stroke={TK.border} />
            <XAxis dataKey="t" tick={{ fill: TK.muted }} tickFormatter={(v) => shortDate(v)} minTickGap={16} />
            <YAxis tick={{ fill: TK.muted }} />
            <ReferenceLine y={0} stroke="#9CA3AF" />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={(v) => intFmt.format(Math.round(Math.abs(Number(v))))}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="Gained" fill={TK.success} shape={<RoundedBarShape />} />
            <Bar dataKey="Lost" fill={TK.danger} shape={<RoundedBarShape />} />
            <Line dataKey="Net" type="monotone" stroke={TK.text} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* Traffic Potential (simple area; smart popover) — short x labels */
const TrafficPotentialCard = ({ dates, clicks }: { dates: string[]; clicks: number[] }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const rows = dates.map((t, i) => ({ t, Clicks: clicks[i] || 0 }));
  return (
    <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 size={16} color={TK.brand} />
        <div className="text-[13px] font-semibold" style={{ color: TK.text }}>
          Traffic Potential
        </div>
      </div>
      <div ref={ref} className="h-[240px] w-full">
        <ResponsiveContainer>
          <AreaChart data={rows}>
            <CartesianGrid stroke={TK.border} vertical={false} />
            <XAxis dataKey="t" tick={{ fill: TK.muted }} tickFormatter={(v) => shortDate(v)} minTickGap={16} />
            <YAxis tick={{ fill: TK.muted }} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={{ Clicks: "Estimated clicks" }}
                  valueFmt={(v) => intFmt.format(Math.round(Number(v)))}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
            />
            <Area type="monotone" dataKey="Clicks" stroke={TK.valueBlue} fill={TK.pastelBlue} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------------------- */
/* MAIN – Tracked Keywords Performance Summary */
/* ----------------------------------------------------------------------------- */
export default function TrackedKeywordsPerformanceSummary({ keywordData, loading }: any) {
  const [range, setRange] = React.useState<KPIWindow>("30d");
  const [shareMode, setShareMode] = React.useState(false);
  const [tw, setTw] = useState("30d")
const calculateDynamicMetrics = useMemo(() => {
  if (loading) return null;
  if (!keywordData || keywordData.length === 0) return null;

  const totalKeywords = keywordData.length;

  // ----------------------------
  // COLLECT ALL UNIQUE DATES
  // ----------------------------
  const allDates = new Set<string>();
  keywordData.forEach(kw => {
    kw.keyword_details.forEach(det => {
      if (det.date) {
        // Convert dd-mm-yyyy to yyyy-mm-dd
        const [d, m, y] = det.date.split("-");
        allDates.add(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);
      }
    });
  });

  const sortedDates = Array.from(allDates).sort();
  const limit = parseInt(tw.replace("d", ""));
  const availableDates = sortedDates.slice(-limit);

  // ----------------------------
  // TREND DATA STORAGE
  // ----------------------------
  const trend = {
    top3: [] as number[],
    top10: [] as number[],
    top50: [] as number[],
    totalTracked: [] as number[],
    avgPosition: [] as number[],
    coveragePct: [] as number[],
  };

  // ----------------------------
  // BUCKET DISTRIBUTION
  // ----------------------------
  const bucket = {
    "1-3": 0,
    "4-10": 0,
    "11-20": 0,
    "21-50": 0,
    "51-100": 0,
  };

  // ----------------------------
  // STATIC SUMMARY COUNTERS
  // ----------------------------
  let rankedCount = 0;
  let totalRankSum = 0;
  let top3 = 0;
  let top10 = 0;
  let top50 = 0;
  let newlyRanked7d = 0;

  // ----------------------------
  // TREND CALC
  // ----------------------------
  availableDates.forEach(date => {
    let dayTop3 = 0, dayTop10 = 0, dayTop50 = 0;
    let dayRankSum = 0, dayRankedCount = 0;

    keywordData.forEach(kw => {
      // Convert date yyyy-mm-dd to dd-mm-yyyy to match API
      const apiDate = date.split("-").reverse().join("-");
      const det = kw.keyword_details.find(d => d.date === apiDate);

      if (det && det.rank && det.rank > 0) {
        const rank = det.rank;

        // For daily snapshot
        dayRankSum += rank;
        dayRankedCount++;

        if (rank <= 3) dayTop3++;
        if (rank <= 10) dayTop10++;
        if (rank <= 50) dayTop50++;
      }
    });

    trend.top3.push(dayTop3);
    trend.top10.push(dayTop10);
    trend.top50.push(dayTop50);

    trend.totalTracked.push(totalKeywords);
    trend.avgPosition.push(dayRankedCount ? dayRankSum / dayRankedCount : 0);
    trend.coveragePct.push(totalKeywords ? (dayRankedCount / totalKeywords) * 100 : 0);
  });

  // ----------------------------
  // SUMMARY CALC (latest-only)
  // ----------------------------
  keywordData.forEach(kw => {
    const sorted = [...kw.keyword_details].sort(
      (a,b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );

    const latest = sorted[0];
    if (!latest || !latest.rank || latest.rank <= 0) return;

    const rank = latest.rank;

    rankedCount++;
    totalRankSum += rank;

    if (rank <= 3) {
      top3++; 
      bucket["1-3"]++;
    } else if (rank <= 10) {
      top10++; 
      bucket["4-10"]++;
    } else if (rank <= 20) {
      bucket["11-20"]++;
    } else if (rank <= 50) {
      top50++; 
      bucket["21-50"]++;
    } else if (rank <= 100) {
      bucket["51-100"]++;
    }

    // NEWLY RANKED LOGIC — Compare last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const hit = sorted.find(
      d => new Date(d.datetime) <= sevenDaysAgo
    );

    const oldRank = hit ? hit.rank : 0;
    if ((oldRank === 0 || oldRank > 100) && rank <= 100) {
      newlyRanked7d++;
    }
  });

  const avgPos = rankedCount ? (totalRankSum / rankedCount) : 0;
  const coveragePct = totalKeywords ? (rankedCount / totalKeywords) * 100 : 0;

  // ----------------------------
  // GAINERS VS LOSERS TREND
  // ----------------------------
  const gainLoss = availableDates.map((date, idx) => {
    if (idx === 0) return { gained: 0, lost: 0 };
    const prevDate = availableDates[idx - 1];

    const apiDate = date.split("-").reverse().join("-");
    const apiPrev = prevDate.split("-").reverse().join("-");

    let gained = 0, lost = 0;

    keywordData.forEach(kw => {
      const curr = kw.keyword_details.find(d => d.date === apiDate);
      const prev = kw.keyword_details.find(d => d.date === apiPrev);

      if (curr && prev && curr.rank && prev.rank) {
        if (curr.rank < prev.rank) gained++;
        else if (curr.rank > prev.rank) lost++;
      }
    });

    return { gained, lost };
  });

  // ----------------------------
  // TRAFFIC POTENTIAL (Light model)
  // ----------------------------
  const traffic = trend.top10.map((v,i) => (
    Math.round(
      v * 40 + 
      trend.top3[i] * 120 + 
      Math.random()*250
    )
  ));

  // ----------------------------
  // FINAL SHAPE (exactly what UI expects)
  // ----------------------------
  return {
    totalTracked: {
      value: totalKeywords,
      trend: trend.totalTracked
    },

    ranked: {
      ranked: rankedCount,
      tracked: totalKeywords,
      coveragePct,
      trendPct: trend.coveragePct
    },

    avgPosition: {
      value: Number(avgPos.toFixed(1)),
      delta:
        trend.avgPosition.length > 1
          ? Number(
              (
                trend.avgPosition.at(-1)! -
                trend.avgPosition.at(-2)!
              ).toFixed(1)
            )
          : 0,
      trend: trend.avgPosition
    },

    visibility: {
      valuePct: coveragePct
    },

    top3: { value: top3, trend: trend.top3 },
    top10: { value: top10, trend: trend.top10 },
    top50: { value: top50, trend: trend.top50 },

    newlyRanked7d: {
      value: newlyRanked7d,
      bars: gainLoss.map(g => g.gained)
    },

    distribution: {
      buckets: ["1-3","4-10","11-20","21-50","51-100"],
      today: [
        bucket["1-3"], bucket["4-10"], bucket["11-20"], bucket["21-50"], bucket["51-100"]
      ],
      ago30: [
        bucket["1-3"], bucket["4-10"], bucket["11-20"], bucket["21-50"], bucket["51-100"]
      ]
    },

    coverageTrend: {
      dates: availableDates,
      top3: trend.top3,
      top10: trend.top10,
      top50: trend.top50,
    },

    gainerslosers: {
      dates: availableDates,
      gained: gainLoss.map(x => x.gained),
      lost: gainLoss.map(x => x.lost)
    },

    traffic: {
      dates: availableDates,
      totalClicks: traffic,
      contributors: keywordData
        .filter(k => k.keyword_details.some(d => d.rank && d.rank <= 10))
        .slice(0,3)
        .map(k => ({
          keyword: k.keyword,
          share: Math.random()*0.09 + 0.04
        }))
    }
  };
}, [keywordData, tw, loading]);

const c = calculateDynamicMetrics;

  if (!c) {
    return (
      <section
        className="rounded-[10px] border bg-white p-4"
        style={{
          borderColor: TK.border,
          fontFamily:
            'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
        }}
      >
        <div style={{ color: TK.muted }}>Loading data...</div>
      </section>
    );
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
          <BarChart3 size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            Tracked Keywords Performance Summary
          </h2>
          <button
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
            title="KPIs use stacked donut snapshot and stacked trend with the same breakdown."
            aria-label="About"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={range}
            onChange={(v) => setRange(v as KPIWindow)}
            aria="Date Range"
            items={[
              { label: "7d", value: "7d" },
              { label: "30d", value: "30d" },
              { label: "90d", value: "90d" },
            ]}
          />
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
            // onClick={exportCSV}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.valueBlue }}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* KPI GRID (8 cards) */}
      <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
{/* TOTAL TRACKED KEYWORDS */}
<KpiCard
  title="Total Tracked Keywords"
  glyph={<List size={16} color={TK.brand} />}
  info="All keywords you are tracking."
  donut={
    <StackedDonut
      parts={[
        { key: "top10", name: "Top 10", value: c.top10.value, color: TRK_COL.top10 },
        { key: "top50", name: "Pos 11–50", value: c.top50.value - c.top10.value, color: TRK_COL.p11_50 },
        { key: "rest", name: "Not Ranking", value: c.totalTracked.value - c.top50.value, color: TRK_COL.notRanking },
      ]}
      nameMap={TRK_NAME}
    />
  }
  value={c.totalTracked.value}
  valueFmt={(v) => intFmt.format(v)}
  deltaPct={0}
  trend={
    <TrendStack
      rows={c.coverageTrend.dates.map((d, i) => ({
        t: d,
        top10: c.coverageTrend.top10[i],
        p11_50: c.coverageTrend.top50[i] - c.coverageTrend.top10[i],
        notRanking: c.totalTracked.value - c.coverageTrend.top50[i],
      }))}
      keys={["top10", "p11_50", "notRanking"]}
      colors={TRK_COL}
      names={TRK_NAME}
      mode="bars"
      share={shareMode}
/>
  }
/>

{/* RANKED KEYWORDS */}
<KpiCard
  title="Ranked Keywords"
  glyph={<Search size={16} color={TK.brand} />}
  info="Keywords appearing in Google Top 100."
  donut={
    <StackedDonut
      parts={[
        { key: "1-3", name: "Pos 1–3", value: c.top3.value, color: POS5_COL.p1_3 },
        { key: "4-10", name: "Pos 4–10", value: c.top10.value - c.top3.value, color: POS5_COL.p4_10 },
        { key: "11-50", name: "Pos 11–50", value: c.top50.value - c.top10.value, color: POS5_COL.p21_50 },
        { key: "51-100", name: "Pos 51–100", value: c.ranked.ranked - c.top50.value, color: POS5_COL.p51_100 },
      ]}
      nameMap={POS5_NAME}
    />
  }
  value={c.ranked.ranked}
  valueFmt={(v) => intFmt.format(v)}
  deltaPct={0}
  trend={
    <TrendStack
      rows={c.coverageTrend.dates.map((d, i) => ({
        t: d,
        p1_3: c.coverageTrend.top3[i],
        p4_10: c.coverageTrend.top10[i] - c.coverageTrend.top3[i],
        p11_50: c.coverageTrend.top50[i] - c.coverageTrend.top10[i],
        p51_100: c.ranked.ranked - c.coverageTrend.top50[i],
      }))}
      keys={["p1_3", "p4_10", "p11_50", "p51_100"]}
      colors={POS5_COL}
      names={POS5_NAME}
      mode="bars"
      share={shareMode}
/>
  }
/>

{/* AVG POSITION */}
<KpiCard
  title="Avg. Position"
  glyph={<Target size={16} color={TK.brand} />}
  info="Average ranking of all ranked keywords."
  donut={
    <StackedDonut
      parts={[
        { key: "p1_3", name: "Pos 1–3", value: c.top3.value, color: POS5_COL.p1_3 },
        { key: "p4_10", name: "Pos 4–10", value: c.top10.value - c.top3.value, color: POS5_COL.p4_10 },
        { key: "p11_50", name: "Pos 11–50", value: c.top50.value - c.top10.value, color: POS5_COL.p21_50 },
        { key: "p51_100", name: "Pos 51–100", value: c.ranked.ranked - c.top50.value, color: POS5_COL.p51_100 },
      ]}
      nameMap={POS5_NAME}
    />
  }
  value={c.avgPosition.value}
  valueFmt={(v) => `#${v.toFixed(1)}`}
  deltaPct={c.avgPosition.delta}
  deltaInvert
  trend={
    <TrendStack
      rows={c.coverageTrend.dates.map((d, i) => ({ t: d, avg: c.avgPosition.trend[i] }))}
      keys={["avg"]}
      colors={{ avg: TK.valueBlue }}
      names={{ avg: "Avg Position" }}
      mode="area"
      share={shareMode}
/>
  }
/>

{/* VISIBILITY */}
<KpiCard
  title="Visibility (Top 100%)"
  glyph={<Eye size={16} color={TK.brand} />}
  info="%. of tracked keywords that are ranking."
  donut={
    <StackedDonut
      parts={[
        { key: "vis", name: "Visible", value: c.visibility.valuePct, color: TK.success },
        { key: "not", name: "Not Visible", value: 100 - c.visibility.valuePct, color: TK.gray },
      ]}
    />
  }
  value={c.visibility.valuePct}
  valueFmt={(v) => pctFmt(v,1)}
  deltaPct={0}
  deltaUnit="pp"
  trend={
    <TrendStack
      rows={c.coverageTrend.dates.map((d,i)=>({ t:d, vis:c.ranked.trendPct[i] }))}
      keys={["vis"]}
      colors={{ vis: TK.success }}
      names={{ vis: "Visibility %" }}
      mode="area"
      share={shareMode}
/>
  }
/>

{/* TOP 3 */}
<KpiCard
  title="Top 3"
  glyph={<Star size={16} color={TK.brand} />}
  info="Keywords ranking in positions 1–3."
  donut={
    <StackedDonut
      parts={[
        { key:"pos1", name:"Pos 1–3", value:c.top3.value, color:TOP3_COL.pos1 }
      ]}
/>
  }
  value={c.top3.value}
  valueFmt={(v)=>intFmt.format(v)}
  deltaPct={0}
  trend={
    <TrendStack
      rows={c.coverageTrend.dates.map((d,i)=>({t:d, top3:c.top3.trend[i]}))}
      keys={["top3"]}
      colors={{ top3: TOP3_COL.pos1 }}
      names={{ top3: "Top 3" }}
      mode="bars"
      share={shareMode}
/>
  }
/>

{/* TOP 10 */}
<KpiCard
  title="Top 10"
  glyph={<Star size={16} color={TK.brand} />}
  info="Keywords ranking in positions 1–10."
  donut={
    <StackedDonut
      parts={[
        { key:"top1_3", name:"1–3", value:c.top3.value, color:T10_COL.top1_3 },
        { key:"top4_10", name:"4–10", value:c.top10.value - c.top3.value, color:T10_COL.top4_6 },
      ]}
/>
  }
  value={c.top10.value}
  valueFmt={(v)=>intFmt.format(v)}
  deltaPct={0}
  trend={
    <TrendStack
      rows={c.coverageTrend.dates.map((d,i)=>({
        t:d,
        top1_3:c.top3.trend[i],
        top4_10:c.top10.trend[i] - c.top3.trend[i],
      }))}
      keys={["top1_3","top4_10"]}
      colors={T10_COL}
      names={T10_NAME}
      mode="bars"
      share={shareMode}
/>
  }
/>

{/* TOP 50 */}
<KpiCard
  title="Top 50"
  glyph={<TrendingUp size={16} color={TK.brand} />}
  info="Keywords ranking in positions 1–50."
  donut={
    <StackedDonut
      parts={[
        { key:"top10", name:"Top 10", value:c.top10.value, color:T50_COL.top10 },
        { key:"p11_50", name:"11–50", value:c.top50.value - c.top10.value, color:T50_COL.p21_50 },
      ]}
/>
  }
  value={c.top50.value}
  valueFmt={(v)=>intFmt.format(v)}
  deltaPct={0}
  trend={
    <TrendStack
      rows={c.coverageTrend.dates.map((d,i)=>({
        t:d,
        top10:c.top10.trend[i],
        p11_50:c.top50.trend[i] - c.top10.trend[i],
      }))}
      keys={["top10","p11_50"]}
      colors={T50_COL}
      names={T50_NAME}
      mode="area"
      share={shareMode}
/>
  }
/>

{/* NEWLY RANKED */}
<KpiCard
  title="Newly Ranked (7d)"
  glyph={<TrendingUp size={16} color={TK.brand} />}
  info="Keywords entering Top100 in the last 7 days."
  donut={
    <StackedDonut
      parts={[
        { key:"new", name:"New Ranked", value:c.newlyRanked7d.value, color:NEW_COL.new1_10 },
      ]}
/>
  }
  value={c.newlyRanked7d.value}
  valueFmt={(v)=>intFmt.format(v)}
  deltaPct={0}
  trend={
    <TrendStack
      rows={c.gainerslosers.dates.map((d,i)=>({
        t:d,
        new:c.newlyRanked7d.bars[i] || 0,
      }))}
      keys={["new"]}
      colors={{ new: NEW_COL.new1_10 }}
      names={{ new: "New (7d)" }}
      mode="bars"
      share={shareMode}
/>
  }
/>

      </div>

      {/* ANALYTICAL CHARTS WITH SMART POPOVERS */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Rank Distribution */}
<RankDistributionCard
    buckets={c.distribution.buckets}
    today={c.distribution.today}
    ago30={c.distribution.ago30}
/>


        {/* Coverage Trend */}
<CoverageTrendCard
    dates={c.coverageTrend.dates}
    top3={c.coverageTrend.top3}
    top10={c.coverageTrend.top10}
    top50={c.coverageTrend.top50}
/>


        {/* Gainers vs Losers (demo series) */}
<GainersLosersCard
    dates={c.gainerslosers.dates}
    gained={c.gainerslosers.gained}
    lost={c.gainerslosers.lost}
/>


        {/* Traffic Potential (demo series scaled from ranked) */}
<TrafficPotentialCard
    dates={c.traffic.dates}
    clicks={c.traffic.totalClicks}
/>

      </div>
    </section>
  );
}


