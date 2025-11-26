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
  Info,
  Download,
  BarChart3,
  Search,
  Eye,
  LineChart as LineChartIcon,
  CircleDollarSign,
  Tag,
  List,
  Star,
} from "lucide-react";

/* =============================================================================
   Wranker – OVI • Section 1: Summary (KPI Cards)
   ----------------------------------------------------------------------------- 
   - Inter / Inter Fallback fonts; no emoji
   - Branded #008CCD icons for section + card titles
   - Smart popovers disappear when cursor leaves the donut
   - No text in the center of the donut (blank center)
   - Pointer cursor on interactive elements
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

/* ----------------------------------------------------------------------------- */
/* UTILS / FORMATTERS */
/* ----------------------------------------------------------------------------- */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const curFmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const toDateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
type Row = { t: string } & Record<string, any>;
const last = <T,>(arr: T[], fb: T): T => (arr.length ? arr[arr.length - 1] : fb);
const pctDelta = (curr: number, prev: number) => (!isFinite(prev) || prev === 0 ? 0 : ((curr - prev) / prev) * 100);

/* ----------------------------------------------------------------------------- */
/* PORTALED SMART POPOVERS (shared) — with active highlight */
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
  // Hide when not hovering the donut container to prevent "stuck" popover
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
  center, // kept for API compatibility; no center text is rendered
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  nameMap?: Record<string, string>;
  valueFmt?: (n: number) => string;
  center?: { label?: string; value: number; fmt?: (n: number) => string };
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
    <div ref={ref} className="h-16 min-w-[auto]" role="img" aria-label="KPI trend">
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
/* DATA (demo generators; replace with real data in app) */
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
/** Daily keyword panel by rank buckets (and details) */
function makeKeywordPanel(days = 60) {
  const dates = lastNDates(days);
  const rows = dates.map((t, i) => {
    const base = 950 + Math.round(6 * i + Math.sin(i / 3) * 18);
    const s1 = 0.12 + 0.02 * Math.sin(i / 12);
    const s2 = 0.26 + 0.02 * Math.cos(i / 9);
    const s3 = 0.22 + 0.015 * Math.sin(i / 7);
    const s4 = 0.24 + 0.012 * Math.cos(i / 11);
    let s5 = 1 - (s1 + s2 + s3 + s4);
    if (s5 < 0.05) s5 = 0.05;

    const p1_3 = Math.round(base * s1);
    const p4_10 = Math.round(base * s2);
    const p11_20 = Math.round(base * s3);
    const p21_50 = Math.round(base * s4);
    const p51_100 = Math.max(0, base - p1_3 - p4_10 - p11_20 - p21_50);

    const pos1 = Math.round(p1_3 * (0.46 + 0.06 * Math.sin(i / 5)));
    const pos2 = Math.round(p1_3 * (0.33 + 0.05 * Math.cos(i / 6)));
    const pos3 = Math.max(0, p1_3 - pos1 - pos2);

    const p4_6 = Math.round(p4_10 * (0.45 + 0.05 * Math.sin(i / 8)));
    const p7_10 = Math.max(0, p4_10 - p4_6);

    return { t, p1_3, p4_10, p11_20, p21_50, p51_100, pos1, pos2, pos3, p4_6, p7_10 };
  });
  return { dates, rows };
}

/* Rank-bucket rows for All Keywords */
const rowsAllKeywords = (rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] =>
  rows.map((r) => ({ t: r.t, p1_3: r.p1_3, p4_10: r.p4_10, p11_20: r.p11_20, p21_50: r.p21_50, p51_100: r.p51_100 }));

/* Visibility rows (1–3 / 4–10 / 11+) */
const rowsVisibility = (rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] =>
  rows.map((r) => ({ t: r.t, p1_3: r.p1_3, p4_10: r.p4_10, p11p: r.p11_20 + r.p21_50 + r.p51_100 }));

/* Estimated traffic rows: allocate total traffic by rank buckets (CTR‑tilted) */
function rowsTrafficByRank(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  const mult = { p1_3: 2.2, p4_10: 1.2, p11_20: 0.6, p21_50: 0.25, p51_100: 0.1 };
  return rows.map((r, i) => {
    const tot = r.p1_3 + r.p4_10 + r.p11_20 + r.p21_50 + r.p51_100;
    const w = {
      p1_3: (r.p1_3 / Math.max(1, tot)) * mult.p1_3,
      p4_10: (r.p4_10 / Math.max(1, tot)) * mult.p4_10,
      p11_20: (r.p11_20 / Math.max(1, tot)) * mult.p11_20,
      p21_50: (r.p21_50 / Math.max(1, tot)) * mult.p21_50,
      p51_100: (r.p51_100 / Math.max(1, tot)) * mult.p51_100,
    };
    const wsum = w.p1_3 + w.p4_10 + w.p11_20 + w.p21_50 + w.p51_100 || 1;
    // Base traffic scale tuned ~58k/day for demo
    const totalTraffic = tot * 58 * (0.95 + 0.05 * Math.sin(i / 9));
    return {
      t: r.t,
      p1_3: totalTraffic * (w.p1_3 / wsum),
      p4_10: totalTraffic * (w.p4_10 / wsum),
      p11_20: totalTraffic * (w.p11_20 / wsum),
      p21_50: totalTraffic * (w.p21_50 / wsum),
      p51_100: totalTraffic * (w.p51_100 / wsum),
    };
  });
}

/* Traffic value rows by INTENT (Informational / Commercial / Transactional / Navigational) */
function rowsTrafficValueByIntent(rowsTraffic: Row[]): Row[] {
  // Relative CPC multipliers
  const cpc = { info: 0.7, comm: 1.2, trans: 2.5, nav: 0.6 };
  return rowsTraffic.map((rt, i) => {
    const totalTraffic = (rt.p1_3 ?? 0) + (rt.p4_10 ?? 0) + (rt.p11_20 ?? 0) + (rt.p21_50 ?? 0) + (rt.p51_100 ?? 0);
    // Approximate total "value" ~ 0.30 * traffic
    const valueTotal = totalTraffic * (0.3 * (0.96 + 0.06 * Math.sin(i / 11)));
    // Daily intent shares with gentle drift
    const sh = {
      info: 0.35 + 0.02 * Math.sin(i / 10),
      comm: 0.33 + 0.02 * Math.cos(i / 8),
      trans: 0.22 + 0.02 * Math.sin(i / 7),
      nav: 0.10 + 0.01 * Math.cos(i / 6),
    };
    const w = {
      info: sh.info * cpc.info,
      comm: sh.comm * cpc.comm,
      trans: sh.trans * cpc.trans,
      nav: sh.nav * cpc.nav,
    };
    const wsum = w.info + w.comm + w.trans + w.nav || 1;
    return {
      t: rt.t,
      info: valueTotal * (w.info / wsum),
      comm: valueTotal * (w.comm / wsum),
      trans: valueTotal * (w.trans / wsum),
      nav: valueTotal * (w.nav / wsum),
    };
  });
}

/* Branded vs Non‑branded rows (each in 3 buckets: 1–3 / 4–10 / 11+) */
function rowsBrandVsNon(rowsAK: Row[]) {
  const brandedRows: Row[] = [];
  const nonRows: Row[] = [];
  rowsAK.forEach((r, i) => {
    const b1 = r.p1_3 || 0;
    const b2 = r.p4_10 || 0;
    const b3 = (r.p11_20 || 0) + (r.p21_50 || 0) + (r.p51_100 || 0);
    const total = b1 + b2 + b3 || 1;
    // Branded share drift ~12–22%
    const brandShare = Math.min(0.28, Math.max(0.08, 0.16 + 0.04 * Math.sin(i / 12)));
    const brandTotal = total * brandShare;
    // Bias branded towards better ranks
    const w1 = b1 * 1.35;
    const w2 = b2 * 1.1;
    const w3 = b3 * 0.7;
    const wsum = w1 + w2 + w3 || 1;
    let bb1 = Math.min(b1, (brandTotal * w1) / wsum);
    let bb2 = Math.min(b2, (brandTotal * w2) / wsum);
    let bb3 = Math.min(b3, (brandTotal * w3) / wsum);
    // Distribute leftover (capacity-based)
    let leftover = brandTotal - (bb1 + bb2 + bb3);
    if (leftover > 0) {
      const cap1 = b1 - bb1,
        cap2 = b2 - bb2,
        cap3 = b3 - bb3;
      const capSum = cap1 + cap2 + cap3 || 1;
      bb1 += (leftover * cap1) / capSum;
      bb2 += (leftover * cap2) / capSum;
      bb3 += (leftover * cap3) / capSum;
    }
    brandedRows.push({ t: r.t, b1_3: bb1, b4_10: bb2, b11p: bb3 });
    nonRows.push({ t: r.t, nb1_3: b1 - bb1, nb4_10: b2 - bb2, nb11p: b3 - bb3 });
  });
  return { brandedRows, nonRows };
}

/* SERP features rows (FS / PAA / Video / Images / Others) */
function rowsSerpFeatures(rowsAK: Row[]) {
  return rowsAK.map((r, i) => {
    const totalK = (r.p1_3 || 0) + (r.p4_10 || 0) + (r.p11_20 || 0) + (r.p21_50 || 0) + (r.p51_100 || 0);
    const share = Math.min(0.5, Math.max(0.18, 0.30 + 0.04 * Math.sin(i / 10)));
    const total = totalK * share;
    const sFS = 0.28 + 0.02 * Math.sin(i / 5);
    const sPAA = 0.33 + 0.01 * Math.cos(i / 7);
    const sVid = 0.14 + 0.01 * Math.sin(i / 9);
    const sImg = 0.12 + 0.01 * Math.cos(i / 6);
    let sOther = 1 - (sFS + sPAA + sVid + sImg);
    if (sOther < 0.06) sOther = 0.06;
    const sum = sFS + sPAA + sVid + sImg + sOther;
    return {
      t: r.t,
      fs: (total * sFS) / sum,
      paa: (total * sPAA) / sum,
      video: (total * sVid) / sum,
      images: (total * sImg) / sum,
      other: (total * sOther) / sum,
    };
  });
}

/* ----------------------------------------------------------------------------- */
/* BREAKDOWNS (colors / names) */
/* ----------------------------------------------------------------------------- */
const POS5_COL: Record<string, string> = {
  p1_3: TK.success,
  p4_10: "#60A5FA",
  p11_20: "#7E72FF",
  p21_50: TK.warn,
  p51_100: TK.danger,
};
const POS5_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50", p51_100: "Pos 51–100" };

const P3_COL: Record<string, string> = { p1_3: TK.success, p4_10: "#60A5FA", p11p: TK.gray };
const P3_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11p: "Pos 11+" };
const B3_COL: Record<string, string> = { b1_3: TK.success, b4_10: "#60A5FA", b11p: TK.gray };
const B3_NAME = { b1_3: "Pos 1–3", b4_10: "Pos 4–10", b11p: "Pos 11+" };
const NB3_COL: Record<string, string> = { nb1_3: TK.success, nb4_10: "#60A5FA", nb11p: TK.gray };
const NB3_NAME = { nb1_3: "Pos 1–3", nb4_10: "Pos 4–10", nb11p: "Pos 11+" };

const INTENT_COL: Record<string, string> = {
  info: "#7E72FF",
  comm: "#60A5FA",
  trans: TK.success,
  nav: TK.gray,
};
const INTENT_NAME = { info: "Informational", comm: "Commercial", trans: "Transactional", nav: "Navigational" };

const SERP_COL: Record<string, string> = {
  fs: TK.success,
  paa: "#60A5FA",
  video: "#7E72FF",
  images: "#F59E0B",
  other: TK.gray,
};
const SERP_NAME = { fs: "Featured Snippet", paa: "People Also Ask", video: "Video", images: "Images", other: "Other" };

/* ----------------------------------------------------------------------------- */
/* MAIN — Summary (KPI Cards) */
/* ----------------------------------------------------------------------------- */
export default function OviKpiSummarySection() {
  const [kpiRange, setKpiRange] = React.useState<KPIWindow>("30d");
  const [shareMode, setShareMode] = React.useState(false);
  const kDays = kpiRange === "7d" ? 7 : kpiRange === "30d" ? 30 : 90;

  const panel = React.useMemo(() => makeKeywordPanel(kDays * 2), [kDays]);
  const allRowsAll = React.useMemo(() => rowsAllKeywords(panel.rows), [panel]);
  const trafficRowsAll = React.useMemo(() => rowsTrafficByRank(panel.rows), [panel]);
  const valueRowsAll = React.useMemo(() => rowsTrafficValueByIntent(trafficRowsAll), [trafficRowsAll]);
  const visRowsAll = React.useMemo(() => rowsVisibility(panel.rows), [panel]);
  const brandSplit = React.useMemo(() => rowsBrandVsNon(allRowsAll), [allRowsAll]);
  const serpRowsAll = React.useMemo(() => rowsSerpFeatures(allRowsAll), [allRowsAll]);

  const sliceCurr = (rs: Row[]) => rs.slice(kDays);
  const slicePrev = (rs: Row[]) => rs.slice(0, kDays);

  const AK_CURR = React.useMemo(() => sliceCurr(allRowsAll), [allRowsAll, kDays]);
  const AK_PREV = React.useMemo(() => slicePrev(allRowsAll), [allRowsAll, kDays]);

  const TRAF_CURR = React.useMemo(() => sliceCurr(trafficRowsAll), [trafficRowsAll, kDays]);
  const TRAF_PREV = React.useMemo(() => slicePrev(trafficRowsAll), [trafficRowsAll, kDays]);

  const VAL_CURR = React.useMemo(() => sliceCurr(valueRowsAll), [valueRowsAll, kDays]);
  const VAL_PREV = React.useMemo(() => slicePrev(valueRowsAll), [valueRowsAll, kDays]);

  const VIS_CURR = React.useMemo(() => sliceCurr(visRowsAll), [visRowsAll, kDays]);
  const VIS_PREV = React.useMemo(() => slicePrev(visRowsAll), [visRowsAll, kDays]);

  const BRAND_CURR = React.useMemo(() => sliceCurr(brandSplit.brandedRows), [brandSplit, kDays]);
  const BRAND_PREV = React.useMemo(() => slicePrev(brandSplit.brandedRows), [brandSplit, kDays]);

  const NON_CURR = React.useMemo(() => sliceCurr(brandSplit.nonRows), [brandSplit, kDays]);
  const NON_PREV = React.useMemo(() => slicePrev(brandSplit.nonRows), [brandSplit, kDays]);

  const SERP_CURR = React.useMemo(() => sliceCurr(serpRowsAll), [serpRowsAll, kDays]);
  const SERP_PREV = React.useMemo(() => slicePrev(serpRowsAll), [serpRowsAll, kDays]);

  // --- KPI values + deltas ---
  const currAllKW = React.useMemo(() => {
    const r = last(AK_CURR, AK_CURR[0] || { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 });
    return (r.p1_3 || 0) + (r.p4_10 || 0) + (r.p11_20 || 0) + (r.p21_50 || 0) + (r.p51_100 || 0);
  }, [AK_CURR]);
  const prevAllKW = React.useMemo(() => {
    const r = last(AK_PREV, AK_PREV[0] || { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 });
    return (r.p1_3 || 0) + (r.p4_10 || 0) + (r.p11_20 || 0) + (r.p21_50 || 0) + (r.p51_100 || 0);
  }, [AK_PREV]);
  const dAllKW = pctDelta(currAllKW, prevAllKW);

  const currTraffic = React.useMemo(() => {
    const r = last(TRAF_CURR, TRAF_CURR[0] || { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 });
    return (r.p1_3 || 0) + (r.p4_10 || 0) + (r.p11_20 || 0) + (r.p21_50 || 0) + (r.p51_100 || 0);
  }, [TRAF_CURR]);
  const prevTraffic = React.useMemo(() => {
    const r = last(TRAF_PREV, TRAF_PREV[0] || { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 });
    return (r.p1_3 || 0) + (r.p4_10 || 0) + (r.p11_20 || 0) + (r.p21_50 || 0) + (r.p51_100 || 0);
  }, [TRAF_PREV]);
  const dTraffic = pctDelta(currTraffic, prevTraffic);

  const currValue = React.useMemo(() => {
    const r = last(VAL_CURR, VAL_CURR[0] || { t: "", info: 0, comm: 0, trans: 0, nav: 0 });
    return (r.info || 0) + (r.comm || 0) + (r.trans || 0) + (r.nav || 0);
  }, [VAL_CURR]);
  const prevValue = React.useMemo(() => {
    const r = last(VAL_PREV, VAL_PREV[0] || { t: "", info: 0, comm: 0, trans: 0, nav: 0 });
    return (r.info || 0) + (r.comm || 0) + (r.trans || 0) + (r.nav || 0);
  }, [VAL_PREV]);
  const dValue = pctDelta(currValue, prevValue);

  const currBranded = React.useMemo(() => {
    const r = last(BRAND_CURR, BRAND_CURR[0] || { t: "", b1_3: 0, b4_10: 0, b11p: 0 });
    return (r.b1_3 || 0) + (r.b4_10 || 0) + (r.b11p || 0);
  }, [BRAND_CURR]);
  const prevBranded = React.useMemo(() => {
    const r = last(BRAND_PREV, BRAND_PREV[0] || { t: "", b1_3: 0, b4_10: 0, b11p: 0 });
    return (r.b1_3 || 0) + (r.b4_10 || 0) + (r.b11p || 0);
  }, [BRAND_PREV]);
  const dBranded = pctDelta(currBranded, prevBranded);

  const currNon = React.useMemo(() => {
    const r = last(NON_CURR, NON_CURR[0] || { t: "", nb1_3: 0, nb4_10: 0, nb11p: 0 });
    return (r.nb1_3 || 0) + (r.nb4_10 || 0) + (r.nb11p || 0);
  }, [NON_CURR]);
  const prevNon = React.useMemo(() => {
    const r = last(NON_PREV, NON_PREV[0] || { t: "", nb1_3: 0, nb4_10: 0, nb11p: 0 });
    return (r.nb1_3 || 0) + (r.nb4_10 || 0) + (r.nb11p || 0);
  }, [NON_PREV]);
  const dNon = pctDelta(currNon, prevNon);

  const currSerp = React.useMemo(() => {
    const r = last(SERP_CURR, SERP_CURR[0] || { t: "", fs: 0, paa: 0, video: 0, images: 0, other: 0 });
    return (r.fs || 0) + (r.paa || 0) + (r.video || 0) + (r.images || 0) + (r.other || 0);
  }, [SERP_CURR]);
  const prevSerp = React.useMemo(() => {
    const r = last(SERP_PREV, SERP_PREV[0] || { t: "", fs: 0, paa: 0, video: 0, images: 0, other: 0 });
    return (r.fs || 0) + (r.paa || 0) + (r.video || 0) + (r.images || 0) + (r.other || 0);
  }, [SERP_PREV]);
  const dSerp = pctDelta(currSerp, prevSerp);

  const currVisTop10 = React.useMemo(() => {
    const r = last(VIS_CURR, VIS_CURR[0] || { t: "", p1_3: 0, p4_10: 0, p11p: 0 });
    const top10 = (r.p1_3 || 0) + (r.p4_10 || 0);
    const all = top10 + (r.p11p || 0);
    return all ? (top10 / all) * 100 : 0;
  }, [VIS_CURR]);
  const prevVisTop10 = React.useMemo(() => {
    const r = last(VIS_PREV, VIS_PREV[0] || { t: "", p1_3: 0, p4_10: 0, p11p: 0 });
    const top10 = (r.p1_3 || 0) + (r.p4_10 || 0);
    const all = top10 + (r.p11p || 0);
    return all ? (top10 / all) * 100 : 0;
  }, [VIS_PREV]);
  const dVis = currVisTop10 - prevVisTop10; // pp

  // Header export CSV (KPI snapshot)
  const exportCSV = () => {
    const rows = [
      ["metric", "value", "delta"],
      ["Organic Keywords", Math.round(currAllKW), `${dAllKW.toFixed(1)}%`],
      ["Estimated Organic Traffic", Math.round(currTraffic), `${dTraffic.toFixed(1)}%`],
      ["Traffic Value", curFmt.format(Math.round(currValue)), `${dValue.toFixed(1)}%`],
      ["Branded Keywords", Math.round(currBranded), `${dBranded.toFixed(1)}%`],
      ["Non‑branded Keywords", Math.round(currNon), `${dNon.toFixed(1)}%`],
      ["Keywords with SERP Features", Math.round(currSerp), `${dSerp.toFixed(1)}%`],
      ["Visibility Score (Top‑10%)", `${currVisTop10.toFixed(1)}%`, `${dVis.toFixed(1)} pp`],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ovi_summary_kpis_${kpiRange}.csv`;
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
            Summary (KPI Cards)
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
          <Segmented
            value={kpiRange}
            onChange={(v) => (setKpiRange(v as KPIWindow))}
            aria="KPI Date Range"
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
            onClick={exportCSV}
            className="inline-flex h-8 items-center gap-2 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.valueBlue }}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* KPI GRID (7 cards) */}
      <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* 1) Organic Keywords — rank buckets (5) */}
        <KpiCard
          title="Organic Keywords"
          glyph={<Search size={16} color={TK.brand} />}
          info="Total ranking keywords; snapshot & trend show distribution by rank buckets."
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
              center={{ label: "Total", value: 0 }}
            />
          }
          value={currAllKW}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={dAllKW}
          trend={<TrendStack rows={AK_CURR} keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]} colors={POS5_COL} names={POS5_NAME} mode="bars" share={shareMode} />}
        />

        {/* 2) Estimated Organic Traffic — traffic by rank buckets */}
        <KpiCard
          title="Estimated Organic Traffic"
          glyph={<LineChartIcon size={16} color={TK.brand} />}
          info="Traffic apportioned by rank buckets using a CTR‑tilted model."
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
              center={{ label: "Visits", value: 0 }}
            />
          }
          value={currTraffic}
          valueFmt={(v) => intFmt.format(Math.round(v))}
          deltaPct={dTraffic}
          trend={<TrendStack rows={TRAF_CURR} keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]} colors={POS5_COL} names={POS5_NAME} mode="area" share={shareMode} />}
        />

        {/* 3) Traffic Value — intent mix */}
        <KpiCard
          title="Traffic Value"
          glyph={<CircleDollarSign size={16} color={TK.brand} />}
          info="Ad‑equivalent value split by search intent (CTR × CPC‑tilted)."
          donut={
            <StackedDonut
              parts={[
                { key: "info", name: "info", value: last(VAL_CURR, VAL_CURR[0])?.info || 0, color: INTENT_COL.info },
                { key: "comm", name: "comm", value: last(VAL_CURR, VAL_CURR[0])?.comm || 0, color: INTENT_COL.comm },
                { key: "trans", name: "trans", value: last(VAL_CURR, VAL_CURR[0])?.trans || 0, color: INTENT_COL.trans },
                { key: "nav", name: "nav", value: last(VAL_CURR, VAL_CURR[0])?.nav || 0, color: INTENT_COL.nav },
              ]}
              nameMap={INTENT_NAME}
              center={{ label: "Total", value: 0 }}
            />
          }
          value={currValue}
          valueFmt={(v) => curFmt.format(Math.round(v))}
          deltaPct={dValue}
          trend={<TrendStack rows={VAL_CURR} keys={["info", "comm", "trans", "nav"]} colors={INTENT_COL} names={INTENT_NAME} mode="bars" share={shareMode} />}
        />

        {/* 4) Branded Keywords — rank buckets (3) */}
        <KpiCard
          title="Branded Keywords"
          glyph={<Tag size={16} color={TK.brand} />}
          info="Keywords including your brand/entity name; stacked by rank bucket."
          donut={
            <StackedDonut
              parts={[
                { key: "b1_3", name: "b1_3", value: last(BRAND_CURR, BRAND_CURR[0])?.b1_3 || 0, color: B3_COL.b1_3 },
                { key: "b4_10", name: "b4_10", value: last(BRAND_CURR, BRAND_CURR[0])?.b4_10 || 0, color: B3_COL.b4_10 },
                { key: "b11p", name: "b11p", value: last(BRAND_CURR, BRAND_CURR[0])?.b11p || 0, color: B3_COL.b11p },
              ]}
              nameMap={B3_NAME}
              center={{ label: "Total", value: 0 }}
            />
          }
          value={currBranded}
          valueFmt={(v) => intFmt.format(Math.round(v))}
          deltaPct={dBranded}
          trend={<TrendStack rows={BRAND_CURR} keys={["b1_3", "b4_10", "b11p"]} colors={B3_COL} names={B3_NAME} mode="bars" share={shareMode} />}
        />

        {/* 5) Non‑branded Keywords — rank buckets (3) */}
        <KpiCard
          title="Non‑branded Keywords"
          glyph={<List size={16} color={TK.brand} />}
          info="Keywords without the brand/entity; stacked by rank bucket."
          donut={
            <StackedDonut
              parts={[
                { key: "nb1_3", name: "nb1_3", value: last(NON_CURR, NON_CURR[0])?.nb1_3 || 0, color: NB3_COL.nb1_3 },
                { key: "nb4_10", name: "nb4_10", value: last(NON_CURR, NON_CURR[0])?.nb4_10 || 0, color: NB3_COL.nb4_10 },
                { key: "nb11p", name: "nb11p", value: last(NON_CURR, NON_CURR[0])?.nb11p || 0, color: NB3_COL.nb11p },
              ]}
              nameMap={NB3_NAME}
              center={{ label: "Total", value: 0 }}
            />
          }
          value={currNon}
          valueFmt={(v) => intFmt.format(Math.round(v))}
          deltaPct={dNon}
          trend={<TrendStack rows={NON_CURR} keys={["nb1_3", "nb4_10", "nb11p"]} colors={NB3_COL} names={NB3_NAME} mode="bars" share={shareMode} />}
        />

        {/* 6) Keywords with SERP Features — features mix */}
        <KpiCard
          title="Keywords with SERP Features"
          glyph={<Star size={16} color={TK.brand} />}
          info="Count of ranking keywords that surface in SERP features."
          donut={
            <StackedDonut
              parts={[
                { key: "fs", name: "fs", value: last(SERP_CURR, SERP_CURR[0])?.fs || 0, color: SERP_COL.fs },
                { key: "paa", name: "paa", value: last(SERP_CURR, SERP_CURR[0])?.paa || 0, color: SERP_COL.paa },
                { key: "video", name: "video", value: last(SERP_CURR, SERP_CURR[0])?.video || 0, color: SERP_COL.video },
                { key: "images", name: "images", value: last(SERP_CURR, SERP_CURR[0])?.images || 0, color: SERP_COL.images },
                { key: "other", name: "other", value: last(SERP_CURR, SERP_CURR[0])?.other || 0, color: SERP_COL.other },
              ]}
              nameMap={SERP_NAME}
              center={{ label: "Total", value: 0 }}
            />
          }
          value={currSerp}
          valueFmt={(v) => intFmt.format(Math.round(v))}
          deltaPct={dSerp}
          trend={<TrendStack rows={SERP_CURR} keys={["fs", "paa", "video", "images", "other"]} colors={SERP_COL} names={SERP_NAME} mode="area" share={shareMode} />}
        />

        {/* 7) Visibility Score (Top‑10%) — 1–3 / 4–10 / 11+ */}
        <KpiCard
          title="Visibility Score (Top‑10%)"
          glyph={<Eye size={16} color={TK.brand} />}
          info="Share of keywords in positions 1–10."
          donut={
            <StackedDonut
              parts={[
                { key: "p1_3", name: "p1_3", value: last(VIS_CURR, VIS_CURR[0])?.p1_3 || 0, color: P3_COL.p1_3 },
                { key: "p4_10", name: "p4_10", value: last(VIS_CURR, VIS_CURR[0])?.p4_10 || 0, color: P3_COL.p4_10 },
                { key: "p11p", name: "p11p", value: last(VIS_CURR, VIS_CURR[0])?.p11p || 0, color: P3_COL.p11p },
              ]}
              nameMap={P3_NAME}
              center={{ label: "Top‑10", value: 0 }}
            />
          }
          value={currVisTop10}
          valueFmt={(v) => pctFmt(v, 1)}
          deltaPct={dVis}
          deltaUnit="pp"
          trend={<TrendStack rows={VIS_CURR} keys={["p1_3", "p4_10", "p11p"]} colors={P3_COL} names={P3_NAME} mode="area" share={shareMode} />}
        />
      </div>
    </section>
  );
}
