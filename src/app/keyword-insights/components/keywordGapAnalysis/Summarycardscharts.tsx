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
  Search,
  AlertTriangle,
  LineChart as LineChartIcon,
  Target as TargetIcon,
} from "lucide-react";

/* ============================================================================
   Keywords Gap Summary — Section A.1 (drop-in)
   - Inter / Inter Fallback fonts
   - Branded icons (#008CCD)
   - KPI cards: Missing, Weak, Presence Share, Projected Lift (Top N)
   - Charts: Gap Severity by Competitor (refined) + Close-the-gap Uplift (dropdown chips)
   ========================================================================== */

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

/* Stacks / name maps used in popovers */
const GAP_BUCKET_COLORS: Record<string, string> = {
  MISSING: TK.danger,
  WEAK_21_50: TK.warn,
  WEAK_11_20: "#7E72FF",
  WEAK_4_10: "#60A5FA",
};
const GAP_BUCKET_NAMES: Record<string, string> = {
  MISSING: "Missing",
  WEAK_21_50: "Weak 21–50",
  WEAK_11_20: "Weak 11–20",
  WEAK_4_10: "Weak 4–10",
};

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */
type KPIWindow = "7d" | "30d" | "90d";
type TargetTop = 1 | 3 | 5;

export interface GapOverviewData {
  missingCount: number;
  weakCount: number;
  presenceSharePct: number;      // 0..100
  projectedLiftSum: number;      // clicks/mo at target
  daily: Array<{
    date: string;                // ISO yyyy-mm-dd
    missing: number;
    weak: number;
    presencePct: number;         // 0..100
    projectedLift: number;       // for current target
  }>;
  heatmap: Array<{
    competitor: string;
    bucket: "MISSING" | "WEAK_21_50" | "WEAK_11_20" | "WEAK_4_10";
    count: number;
    lift?: number;
  }>;
  upliftCurve: Array<{ keywordId: string; lift: number }>;
}

export interface KeywordsGapSummaryProps {
  title?: string;                // default: "Keywords Gap Summary"
  tw?: KPIWindow;                // header subtitle only
  target?: TargetTop;            // initial target for label & export
  data?: GapOverviewData;        // ✅ optional; safe fallback provided if omitted
  onExport?: () => void;         // section-level export callback
}

/* -------------------------------------------------------------------------- */
/* UTILS / FORMATTERS                                                         */
/* -------------------------------------------------------------------------- */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const last = <T,>(arr: T[], fb: T): T => (arr.length ? arr[arr.length - 1] : fb);
const pctDelta = (curr: number, prev: number) => (!isFinite(prev) || prev === 0 ? 0 : ((curr - prev) / prev) * 100);
const isBrowser = typeof document !== "undefined";

/* -------------------------------------------------------------------------- */
/* SAFE FALLBACK DATA (prevents runtime errors if props.data is undefined)    */
/* -------------------------------------------------------------------------- */
const FALLBACK: GapOverviewData = {
  missingCount: 320,
  weakCount: 210,
  presenceSharePct: 42.5,
  projectedLiftSum: 8400,
  daily: Array.from({ length: 14 }).map((_, i) => ({
    date: `2025-09-${(i + 1).toString().padStart(2, "0")}`,
    missing: 300 + Math.round(20 * Math.sin(i / 2.5)),
    weak: 190 + Math.round(16 * Math.cos(i / 2.8)),
    presencePct: 40 + Math.round(6 * Math.sin(i / 3.2)),
    projectedLift: 8200 + Math.round(380 * Math.sin(i / 3.4)),
  })),
  heatmap: [
    { competitor: "semrush.com", bucket: "MISSING", count: 120 },
    { competitor: "semrush.com", bucket: "WEAK_21_50", count: 90 },
    { competitor: "semrush.com", bucket: "WEAK_11_20", count: 54 },
    { competitor: "semrush.com", bucket: "WEAK_4_10", count: 28 },

    { competitor: "ahrefs.com", bucket: "MISSING", count: 86 },
    { competitor: "ahrefs.com", bucket: "WEAK_21_50", count: 63 },
    { competitor: "ahrefs.com", bucket: "WEAK_11_20", count: 48 },
    { competitor: "ahrefs.com", bucket: "WEAK_4_10", count: 31 },

    { competitor: "moz.com", bucket: "MISSING", count: 56 },
    { competitor: "moz.com", bucket: "WEAK_21_50", count: 32 },
    { competitor: "moz.com", bucket: "WEAK_11_20", count: 21 },
    { competitor: "moz.com", bucket: "WEAK_4_10", count: 11 },
  ],
  upliftCurve: Array.from({ length: 60 }).map((_, i) => ({
    keywordId: `kw_${i}`,
    lift: 160 - i + Math.max(0, 20 * Math.sin(i / 8)),
  })),
};

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
        {String(label)}
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
/* COMMON UI: Segmented, Filter Chip, Delta Badge, KPI Shell                  */
/* -------------------------------------------------------------------------- */
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
            "h-8 rounded-full px-3 text-sm transition cursor-pointer",
            value === it.value ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

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

/* KPI Card shell (reference pattern) */
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
      {/* blank center */}
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

/* -------------------------------------------------------------------------- */
/* COMPETITOR SEVERITY (stacked bars with favicons + portal tooltip)          */
/* -------------------------------------------------------------------------- */
function Favicon({ domain, size = 16 }: { domain: string; size?: number }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
  return <img src={src} alt="" width={size} height={size} className="inline-block rounded-sm" />;
}

function CompetitorTooltip({
  active,
  payload,
  label,
  coordinate,
  containerRect,
}: any & { coordinate?: { x: number; y: number }; containerRect?: DOMRect | null }) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const competitor = String(label);
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  return (
    <PortalTooltipShell x={x} y={y} width={300}>
      <div className="mb-1 flex items-center gap-2">
        <Favicon domain={competitor} size={16} />
        <span className="text-sm font-medium">{competitor}</span>
      </div>
      <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: TK.muted }}>
        <span>Total</span>
        <span className="font-semibold text-[#111827]">{intFmt.format(total)}</span>
      </div>
      <div className="flex flex-col">
        {rows
          .filter((r) => r && typeof r.value === "number")
          .map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-6 rounded px-1 py-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className="text-[12px]" style={{ color: TK.muted }}>
                  {GAP_BUCKET_NAMES[p.name] ?? p.name}
                </span>
              </div>
              <div className="font-semibold">{intFmt.format(Number(p.value))}</div>
            </div>
          ))}
      </div>
    </PortalTooltipShell>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */
export default function GapSummarySectionApp({
  title = "Keywords Gap Summary",
  tw = "30d",
  target = 3,
  data,
  onExport,
}: KeywordsGapSummaryProps) {
  // ✅ Safe data (prevents crashes when parent doesn't pass data)
  const safe = data ?? FALLBACK;

  /* ---------- KPI values & deltas (vs previous day) ---------- */
  const d = Array.isArray(safe.daily) ? safe.daily : [];
  const curr = last(d, d[0] || { date: "", missing: 0, weak: 0, presencePct: 0, projectedLift: 0 });
  const prev = d.length >= 2 ? d[d.length - 2] : d[0] || curr;

  const currMissing = curr.missing ?? safe.missingCount ?? 0;
  const prevMissing = prev.missing ?? currMissing;
  const dMissing = pctDelta(currMissing, prevMissing);

  const currWeak = curr.weak ?? safe.weakCount ?? 0;
  const prevWeak = prev.weak ?? currWeak;
  const dWeak = pctDelta(currWeak, prevWeak);

  const currPresence = curr.presencePct ?? safe.presenceSharePct ?? 0;
  const prevPresence = prev.presencePct ?? currPresence;
  const dPresencePP = currPresence - prevPresence; // pp

  const currLift = curr.projectedLift ?? safe.projectedLiftSum ?? 0;
  const prevLift = prev.projectedLift ?? currLift;
  const dLift = pctDelta(currLift, prevLift);

  /* ---------- KPI breakdowns (donuts) ---------- */
  // Missing → group competitors by share: Top 1 / Next 2 / Others
  const missRows = (safe.heatmap || []).filter((h) => h.bucket === "MISSING");
  const byCompetitor = new Map<string, number>();
  missRows.forEach((r) => byCompetitor.set(r.competitor, (byCompetitor.get(r.competitor) || 0) + (r.count || 0)));
  const ordered = Array.from(byCompetitor.entries()).sort((a, b) => b[1] - a[1]);
  const top1 = ordered[0]?.[1] || 0;
  const next2 = (ordered[1]?.[1] || 0) + (ordered[2]?.[1] || 0);
  const others = Math.max(0, missRows.reduce((s, r) => s + r.count, 0) - top1 - next2);

  const MISS_DONUT = [
    { key: "top1", name: "Top Competitor", value: top1, color: "#3B82F6" },
    { key: "next", name: "Next 2 Competitors", value: next2, color: "#7C8CF5" },
    { key: "rest", name: "Others", value: others, color: "#C7D2FE" },
  ];
  const MISS_NAMES = MISS_DONUT.reduce((m, p) => ((m[p.key] = p.name), m), {} as Record<string, string>);

  // Weak → split by weak buckets from heatmap totals
  const weakTotals: Record<string, number> = { WEAK_4_10: 0, WEAK_11_20: 0, WEAK_21_50: 0 };
  (safe.heatmap || []).forEach((h) => {
    if (h.bucket in weakTotals) weakTotals[h.bucket] += h.count || 0;
  });
  const WEAK_DONUT = [
    { key: "WEAK_4_10", name: "WEAK_4_10", value: weakTotals.WEAK_4_10, color: GAP_BUCKET_COLORS.WEAK_4_10 },
    { key: "WEAK_11_20", name: "WEAK_11_20", value: weakTotals.WEAK_11_20, color: GAP_BUCKET_COLORS.WEAK_11_20 },
    { key: "WEAK_21_50", name: "WEAK_21_50", value: weakTotals.WEAK_21_50, color: GAP_BUCKET_COLORS.WEAK_21_50 },
  ];

  // Presence → you vs only competitors
  const PRES_DONUT = [
    { key: "you", name: "You (Top 100)", value: Math.max(0, currPresence), color: TK.success },
    { key: "comp", name: "Only Competitors", value: Math.max(0, 100 - currPresence), color: TK.gray },
  ];
  const PRES_NAMES = { you: "You (Top 100)", comp: "Only Competitors" };

  // Projected Lift (Top N) → attribute by current rank bucket weights (estimate)
  const aggWeakCounts = {
    p4_10: weakTotals.WEAK_4_10,
    p11_20: weakTotals.WEAK_11_20,
    p21_50: weakTotals.WEAK_21_50,
    p51_100: missRows.reduce((s, r) => s + r.count, 0), // treat missing as 51–100+
  };
  const LIFT_WEIGHTS = { p4_10: 1.2, p11_20: 1.4, p21_50: 1.7, p51_100: 2.0 };
  const wsum =
    aggWeakCounts.p4_10 * LIFT_WEIGHTS.p4_10 +
      aggWeakCounts.p11_20 * LIFT_WEIGHTS.p11_20 +
      aggWeakCounts.p21_50 * LIFT_WEIGHTS.p21_50 +
      aggWeakCounts.p51_100 * LIFT_WEIGHTS.p51_100 || 1;
  const LIFT_SHARE = {
    p4_10: (aggWeakCounts.p4_10 * LIFT_WEIGHTS.p4_10) / wsum,
    p11_20: (aggWeakCounts.p11_20 * LIFT_WEIGHTS.p11_20) / wsum,
    p21_50: (aggWeakCounts.p21_50 * LIFT_WEIGHTS.p21_50) / wsum,
    p51_100: (aggWeakCounts.p51_100 * LIFT_WEIGHTS.p51_100) / wsum,
  };
  const LIFT_DONUT = [
    { key: "p4_10", name: "Pos 4–10", value: currLift * LIFT_SHARE.p4_10, color: "#60A5FA" },
    { key: "p11_20", name: "Pos 11–20", value: currLift * LIFT_SHARE.p11_20, color: "#7E72FF" },
    { key: "p21_50", name: "Pos 21–50", value: currLift * LIFT_SHARE.p21_50, color: TK.warn },
    { key: "p51_100", name: "Pos 51–100 + Missing", value: currLift * LIFT_SHARE.p51_100, color: TK.danger },
  ];
  const LIFT_NAMES = { p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50", p51_100: "Pos 51–100 + Missing" };

  /* ---------- KPI trends (rows) ---------- */
  const MISS_TREND: Row[] = d.map((r) => ({ t: r.date, missing: r.missing }));
  const WEAK_TREND: Row[] = d.map((r) => ({ t: r.date, weak: r.weak }));
  const PRES_TREND: Row[] = d.map((r) => ({ t: r.date, you: r.presencePct, comp: Math.max(0, 100 - r.presencePct) }));
  const LIFT_TREND: Row[] = d.map((r) => ({
    t: r.date,
    p4_10: r.projectedLift * LIFT_SHARE.p4_10,
    p11_20: r.projectedLift * LIFT_SHARE.p11_20,
    p21_50: r.projectedLift * LIFT_SHARE.p21_50,
    p51_100: r.projectedLift * LIFT_SHARE.p51_100,
  }));

  /* ---------- Header Export ---------- */
  const exportCSV = () => {
    const rows = [
      ["metric", "value", "delta"],
      ["Missing Keywords", Math.round(currMissing), `${dMissing.toFixed(1)}%`],
      ["Weak Keywords", Math.round(currWeak), `${dWeak.toFixed(1)}%`],
      ["Presence Share", `${currPresence.toFixed(1)}%`, `${dPresencePP.toFixed(1)} pp`],
      [`Projected Lift (Top ${target})`, Math.round(currLift), `${dLift.toFixed(1)}%`],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `keywords_gap_summary_${tw}_top${target}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    onExport?.();
  };

  /* ---------- Chart 1: Gap Severity by Competitor ---------- */
  const compSet = Array.from(new Set((safe.heatmap || []).map((h) => h.competitor)));
  const compRows = compSet.map((c) => {
    const row: any = {
      competitor: c,
      MISSING: 0,
      WEAK_21_50: 0,
      WEAK_11_20: 0,
      WEAK_4_10: 0,
      _lift: { MISSING: 0, WEAK_21_50: 0, WEAK_11_20: 0, WEAK_4_10: 0 },
    };
    (safe.heatmap || [])
      .filter((h) => h.competitor === c)
      .forEach((h) => {
        row[h.bucket] += h.count || 0;
        const w = h.bucket === "MISSING" ? 2.0 : h.bucket === "WEAK_21_50" ? 1.7 : h.bucket === "WEAK_11_20" ? 1.4 : 1.2;
        row._lift[h.bucket] += h.lift ?? (h.count || 0) * w;
      });
    return row;
  });

  const [metric, setMetric] = React.useState<"count" | "lift">("count");
  const COMP_KEYS = ["MISSING", "WEAK_21_50", "WEAK_11_20", "WEAK_4_10"] as const;
  const compChartData = compRows.map((r) => {
    if (metric === "count") return r;
    const out: any = { competitor: r.competitor };
    COMP_KEYS.forEach((k) => (out[k] = r._lift[k]));
    return out;
  });

  /* ---------- Chart 2: Close-the-gap Uplift (dropdown chips) ---------- */
  const [anchorTopN, setAnchorTopN] = React.useState<10 | 25 | 50 | 100>(25);
  const [liftTarget, setLiftTarget] = React.useState<TargetTop>(target);

  const sorted = (safe.upliftCurve || []).slice().sort((a, b) => b.lift - a.lift);
  let cum = 0;
  const cumRows = sorted.map((p, i) => {
    cum += p.lift;
    return { i: i + 1, lift: p.lift, cum };
  });

  /* ---------- Render ---------- */
  return (
    <section
      className="rounded-[10px] border bg-white p-4 mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2">
          <Search size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            {title}
          </h2>
          <span className="text-xs" style={{ color: TK.muted }}>
            Time: {tw}
          </span>
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

      {/* KPI GRID (4 cards) */}
      <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Missing */}
        <KpiCard
          title="Missing Keywords"
          glyph={<AlertTriangle size={16} color={TK.brand} />}
          info="Keywords none of your pages rank for. Donut groups which competitors dominate these gaps."
          donut={<StackedDonut parts={MISS_DONUT} nameMap={MISS_NAMES} title="Dominance split" />}
          value={currMissing}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={dMissing}
          trend={<TrendStack rows={MISS_TREND} keys={["missing"]} colors={{ missing: TK.danger }} names={{ missing: "Missing" }} mode="area" share={false} />}
        />

        {/* Weak */}
        <KpiCard
          title="Weak Keywords"
          glyph={<LineChartIcon size={16} color={TK.brand} />}
          info="Keywords where you rank but are outranked by competitors."
          donut={<StackedDonut parts={WEAK_DONUT} nameMap={GAP_BUCKET_NAMES} title="Weakness split" />}
          value={currWeak}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={dWeak}
          trend={<TrendStack rows={WEAK_TREND} keys={["weak"]} colors={{ weak: "#60A5FA" }} names={{ weak: "Weak" }} mode="area" share={false} />}
        />

        {/* Presence Share */}
        <KpiCard
          title="Presence Share"
          glyph={<TargetIcon size={16} color={TK.brand} />}
          info="Share of gap keywords where you appear in Top‑100."
          donut={
            <StackedDonut
              parts={PRES_DONUT}
              nameMap={{ you: "You (Top 100)", comp: "Only Competitors" }}
              title="You vs Competitors"
              valueFmt={(v) => (typeof v === "number" ? (v as number).toFixed(1) : String(v))}
            />
          }
          value={currPresence}
          valueFmt={(v) => pctFmt(v, 1)}
          deltaPct={dPresencePP}
          deltaUnit="pp"
          trend={<TrendStack rows={PRES_TREND} keys={["you", "comp"]} colors={{ you: TK.success, comp: TK.gray }} names={{ you: "You (Top 100)", comp: "Only Competitors" }} mode="area" share={true} />}
        />

        {/* Projected Lift (Top N) */}
        <KpiCard
          title={`Projected Lift (Top ${liftTarget})`}
          glyph={<TargetIcon size={16} color={TK.brand} />}
          info={`Estimated extra clicks if each keyword reaches Top ${liftTarget}.`}
          donut={<StackedDonut parts={LIFT_DONUT} nameMap={LIFT_NAMES} title="Contribution by current rank" />}
          value={currLift}
          valueFmt={(v) => intFmt.format(Math.round(v))}
          deltaPct={dLift}
          trend={<TrendStack rows={LIFT_TREND} keys={["p4_10", "p11_20", "p21_50", "p51_100"]} colors={{ p4_10: "#60A5FA", p11_20: "#7E72FF", p21_50: TK.warn, p51_100: TK.danger }} names={LIFT_NAMES} mode="bars" share={false} />}
        />
      </div>

      {/* Charts Row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Gap Severity by Competitor (refined) */}
        <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold" style={{ color: TK.text }}>
                Gap Severity by Competitor
              </h3>
              <div className="text-xs" style={{ color: TK.muted }}>
                Stacked by gap bucket
              </div>
            </div>
            <Segmented
              value={metric}
              onChange={(v) => setMetric(v as "count" | "lift")}
              aria="Metric"
              items={[
                { label: "Count", value: "count" },
                { label: "Lift", value: "lift" },
              ]}
            />
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={compChartData} layout="vertical" margin={{ left: 80, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid stroke={TK.border} />
                <XAxis type="number" tickFormatter={(v) => intFmt.format(Math.round(v))} />
                <YAxis
                  dataKey="competitor"
                  type="category"
                  width={140}
                  tick={(props: any) => {
                    const { y, payload } = props;
                    const domain = payload?.value as string;
                    return (
                      <g transform={`translate(0,${y})`}>
                        <foreignObject x={0} y={-10} width={140} height={20}>
                          <div className="flex items-center gap-2 text-xs" style={{ color: TK.text }}>
                            <Favicon domain={domain} />
                            <span className="truncate">{domain}</span>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }}
                />
                <RTooltip
                  content={(tp: any) => (
                    <CompetitorTooltip
                      {...tp}
                      containerRect={(document.querySelector("body") as any)?.getBoundingClientRect() ?? null}
                    />
                  )}
                  wrapperStyle={{ visibility: "hidden" }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />
                {COMP_KEYS.map((k) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={GAP_BUCKET_COLORS[k]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Close-the-gap Uplift (dropdown chips) */}
        <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold" style={{ color: TK.text }}>
                Close‑the‑gap Uplift
              </h3>
              <div className="text-xs" style={{ color: TK.muted }}>
                Cumulative potential by keyword order
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FilterChip label="Anchor" value={anchorTopN} options={[10, 25, 50, 100]} onChange={(v) => setAnchorTopN(v as 10 | 25 | 50 | 100)} />
              <FilterChip label="Target" value={liftTarget} options={[1, 3, 5]} onChange={(v) => setLiftTarget(v as TargetTop)} />
            </div>
          </div>
          <div className="h-[260px] relative">
            <ResponsiveContainer>
              <AreaChart data={cumRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={TK.border} />
                <XAxis dataKey="i" />
                <YAxis tickFormatter={(v) => intFmt.format(Math.round(v))} />
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
                          <span className="font-semibold text-[#111827]">{intFmt.format(Math.round(p?.value ?? 0))}</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 rounded px-1 py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TK.brand }} />
                            <span className="text-[12px]" style={{ color: TK.muted }}>
                              This keyword
                            </span>
                          </div>
                          <div className="font-semibold">{intFmt.format(Math.round(per))}</div>
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
              Anchor marker at <span className="font-medium" style={{ color: TK.brand }}>Top {anchorTopN}</span> (visual guide only).
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
