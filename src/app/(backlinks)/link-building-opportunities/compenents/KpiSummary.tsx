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
  BarChart3,
  FileDown,
  Info,
  Search,
  Link2,
  Star,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* =============================================================================
   THEME / TOKENS (brand-aligned)
============================================================================= */
const TOKENS = {
  brand: "#008CCD",     // branded icons for section/card titles
  valueBlue: "#0077FF", // primary numeric color
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
} as const;

const intFmt = new Intl.NumberFormat();
const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

/* =============================================================================
   INPUT TYPES — same contract as your current section
============================================================================= */
export type TimePoint = {
  date: string; // any parseable label; ISO preferred but not required
  count: number;
  sample?: { domain: string; wr: number; price: number; spark?: number[] }[];
};
export type CompetitorSlice = { name: string; count: number; color?: string };
export type ScoreBucket = { score: number; domains: { domain: string; price: number }[] };
type PriceBucket = { 
  price: number; 
  domains: { domain: string; wr: number; spark?: number[] }[] 
};


export type KpiSummaryProps = {
  onExport?: () => void;
  totalOpportunities?: number;
  opportunityTrend?: TimePoint[];
  onResetTableScrollTop?: () => void;
  competitorMatched?: number;
  competitorSlices?: CompetitorSlice[];
  onFilterCompetitorMatch?: () => void;
  avgWrScore?: number;
  wrTopBars?: ScoreBucket[];
  lowestPrice?: number;
  priceBuckets?: PriceBucket[];
  onJumpToDomainRow?: (domain: string) => void;
};


/* =============================================================================
   UTILITIES
============================================================================= */
const formatCurrency = (n: number | undefined, symbol = "$") =>
  n == null || Number.isNaN(n) ? "—" : `${symbol}${intFmt.format(Math.round(n))}`;

type SeriesPoint = { date: string; value: number };
const toSeriesFromTrend = (trend: TimePoint[]): SeriesPoint[] =>
  (trend ?? []).map((t) => ({ date: t.date, value: Math.max(0, Number(t.count || 0)) }));

const deltaFrom = (sp?: SeriesPoint[]) =>
  !sp || sp.length < 2 ? undefined : (sp[sp.length - 1].value - sp[sp.length - 2].value);

const toDateLabel = (raw: string) => {
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
  }
  return raw;
};

/* =============================================================================
   BUILD STACKED ROWS FOR DONUT + TREND
============================================================================= */
type Row = { t: string } & Record<string, any>;
type SplitSpec = { key: string; label: string; baseShare: number };

// Distribute total series into parts (stable baseShare + subtle wiggle/jitter)
function splitSeries(total: SeriesPoint[] | undefined, parts: SplitSpec[], jitter = 0.05): Row[] {
  const src = total ?? [];
  const rows: Row[] = [];
  for (let i = 0; i < src.length; i++) {
    const totalV = Math.max(0, src[i].value || 0);
    let rem = 1;
    const shares: Record<string, number> = {};
    parts.forEach((sp, idx) => {
      const wiggle = clamp01(sp.baseShare * (1 + Math.sin((i + 1) * (idx + 2) * 0.21) * jitter));
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

const lastParts = (rows: Row[], keys: string[], colors: Record<string, string>) => {
  if (!rows.length) return [] as { key: string; name: string; value: number; color: string }[];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
};

/* =============================================================================
   PORTALED SMART POPOVERS WITH HOVER-HIGHLIGHT
============================================================================= */
function PortalShell({ x, y, width = 280, children }: { x: number; y: number; width?: number; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none", isolation: "isolate" }}>
      <div
        className="rounded-md p-2 text-xs shadow ring-1"
        style={{ backgroundColor: "#fff", border: `1px solid ${TOKENS.border}`, color: TOKENS.text, borderRadius: 6, pointerEvents: "auto" }}
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
  const [hoverKey, setHoverKey] = React.useState<string | undefined>(undefined);
  React.useEffect(() => setHoverKey(undefined), [label]);

  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const fmt = valueFmt ?? ((v: number) => (asShare ? pct(v, 1) : intFmt.format(Math.round(v))));
  const labelText = typeof label === "string" ? toDateLabel(label) : String(label);

  return (
    <PortalShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>{labelText}</div>
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
    </PortalShell>
  );
}

function DonutPortalContent({
  active,
  payload,
  coordinate,
  containerRect,
  parts,
  nameMap,
  valueFmt,
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
    <PortalShell x={x} y={y} width={280}>
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
    </PortalShell>
  );
}

/* =============================================================================
   STACKED DONUT (snapshot)
============================================================================= */
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

/* =============================================================================
   TREND STACK (area or bars, supports % share)
============================================================================= */
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
  const data = share ? toShare(rows, keys) : rows;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (share ? pct(v, 1) : intFmt.format(Math.round(v)));

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
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={share}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={colors[k]} radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
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
function DeltaBadge({ delta, unit = "", invert = false }: { delta?: number; unit?: "" | "%" | "pp" | "s" | "pt"; invert?: boolean }) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TOKENS.muted }}>
        <Minus size={14} />
        —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TOKENS.muted : good ? TOKENS.success : TOKENS.danger;
  const label =
    unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
      : unit === "s"
      ? `${Math.round(Math.abs(delta))}s`
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

/* =============================================================================
   CARD SHELL (title with branded glyph + info; donut + value/delta + trend)
============================================================================= */
function BrandGlyph({ icon, size = 16 }: { icon?: React.ReactNode; size?: number }) {
  return icon ? <span>{icon}</span> : <BarChart3 size={size} color={TOKENS.brand} />;
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
  ariaLabel,
}: {
  title: string;
  info?: string;
  glyph?: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "s" | "pt";
  invert?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left cursor-pointer"
      aria-label={ariaLabel ?? `${title} card`}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Title row with info icon near title */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BrandGlyph icon={glyph} />
            <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </div>
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info} style={{ cursor: "pointer" }}>
              <Info size={14} />
            </span>
          </div>
        </div>

        {/* Content: donut | value/delta | trend */}
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TOKENS.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge delta={delta} unit={deltaUnit} invert={!!invert} />
            </div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* =============================================================================
   HELPERS TO DERIVE SPLITS FROM YOUR DATA
============================================================================= */
function palette(i: number) {
  const colors = ["#3B82F6", "#22C55E", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#A78BFA", "#10B981", "#60A5FA", "#9CA3AF"];
  return colors[i % colors.length];
}

function priceBandKey(p: number) {
  if (p < 50) return "p_lt50";
  if (p < 100) return "p_50_99";
  if (p < 200) return "p_100_199";
  return "p_gte200";
}
const PRICE_NAMES: Record<string, string> = {
  p_lt50: "< $50",
  p_50_99: "$50–$99",
  p_100_199: "$100–$199",
  p_gte200: "≥ $200",
};
const PRICE_COLORS: Record<string, string> = {
  p_lt50: "#22C55E",
  p_50_99: "#60A5FA",
  p_100_199: "#8B5CF6",
  p_gte200: TOKENS.gray,
};

function derivePriceSplit(priceBuckets: PriceBucket[] | undefined): { parts: SplitSpec[]; keys: string[] } {
  const counts: Record<string, number> = { p_lt50: 0, p_50_99: 0, p_100_199: 0, p_gte200: 0 };
  (priceBuckets ?? []).forEach((b) => {
    const k = priceBandKey(b.price);
    counts[k] += (b.domains?.length ?? 0);
  });
  const total = Object.values(counts).reduce((s, x) => s + x, 0) || 1;
  const keys = Object.keys(counts);
  const parts = keys.map((k) => ({ key: k, label: PRICE_NAMES[k], baseShare: counts[k] / total }));
  return { parts, keys };
}

function deriveWrBandSplit(wrTopBars: ScoreBucket[] | undefined): { parts: SplitSpec[]; keys: string[] } {
  const counts: Record<string, number> = { wr_high: 0, wr_mid: 0, wr_low: 0 };
  (wrTopBars ?? []).forEach((b) => {
    const band = b.score >= 80 ? "wr_high" : b.score >= 60 ? "wr_mid" : "wr_low";
    counts[band] += (b.domains?.length ?? 0);
  });
  const total = Object.values(counts).reduce((s, x) => s + x, 0) || 1;
  const keys = Object.keys(counts);
  const parts = keys.map((k) => ({
    key: k,
    label: k === "wr_high" ? "WR 80–100" : k === "wr_mid" ? "WR 60–79" : "WR < 60",
    baseShare: counts[k] / total,
  }));
  return { parts, keys };
}
const WR_NAMES: Record<string, string> = { wr_high: "WR 80–100", wr_mid: "WR 60–79", wr_low: "WR < 60" };
const WR_COLORS: Record<string, string> = { wr_high: TOKENS.success, wr_mid: "#60A5FA", wr_low: TOKENS.danger };

// approximate average WR score per day from split rows (using band centers)
function wrAvgFromRows(rows: Row[]): number[] {
  const centers: Record<string, number> = { wr_high: 90, wr_mid: 70, wr_low: 50 };
  return rows.map((r) => {
    const total = ["wr_high", "wr_mid", "wr_low"].reduce((s, k) => s + (r[k] || 0), 0) || 1;
    const value =
      ((r["wr_high"] || 0) * centers.wr_high +
        (r["wr_mid"] || 0) * centers.wr_mid +
        (r["wr_low"] || 0) * centers.wr_low) / total;
    return value;
  });
}

/* =============================================================================
   DEMO DATA (auto-fills when your inputs are empty)
============================================================================= */
function lastNDatesISO(days = 14) {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
function makeDemoData() {
  const dates = lastNDatesISO(14);
  const oppTrend: TimePoint[] = dates.map((d, i) => {
    const base = 160 + 40 * Math.sin(i * 0.6) + 8 * Math.cos(i * 0.15) + i * 4;
    return { date: d, count: Math.max(60, Math.round(base)) };
  });
  const lastOpp = oppTrend[oppTrend.length - 1]?.count ?? 240;

  // Competitor-matched should be less than totalOpp to keep trend ratio under 1
  const compMatched = Math.round(lastOpp * 0.62);
  const slicesRaw = [
    { name: "Acme SEO", share: 0.41, color: "#60A5FA" },
    { name: "Globex Media", share: 0.35, color: "#F59E0B" },
    { name: "Initech PR", share: 0.24, color: "#A78BFA" },
  ];
  const competitorSlices: CompetitorSlice[] = slicesRaw.map((s, i) => ({
    name: s.name,
    color: s.color,
    count: i === slicesRaw.length - 1
      ? compMatched - Math.round(compMatched * (slicesRaw[0].share + slicesRaw[1].share))
      : Math.round(compMatched * s.share),
  }));

  // WR bars – counts determine mix
  const wrTopBars: ScoreBucket[] = [
    { score: 92, domains: Array.from({ length: 12 }, (_, i) => ({ domain: `alpha-${i + 1}.com`, price: 120 + i })) },
    { score: 72, domains: Array.from({ length: 7 },  (_, i) => ({ domain: `mid-${i + 1}.io`,    price:  95 + i })) },
    { score: 54, domains: Array.from({ length: 3 },  (_, i) => ({ domain: `low-${i + 1}.net`,   price:  60 + i })) },
  ];
  const avgWrScore = 78; // headline value (trend will be derived from bands)

  // Price buckets
  const priceBuckets: PriceBucket[] = [
    {
      price: 29,
      domains: Array.from({ length: 7 }, (_, i) => ({ domain: `deal-${i + 1}.shop`, wr: 72 + (i % 5), spark: [12, 15, 14, 18, 19] })),
    },
    {
      price: 79,
      domains: Array.from({ length: 9 }, (_, i) => ({ domain: `value-${i + 1}.store`, wr: 68 + (i % 6), spark: [10, 12, 11, 13, 15] })),
    },
    {
      price: 149,
      domains: Array.from({ length: 6 }, (_, i) => ({ domain: `plus-${i + 1}.co`, wr: 75 + (i % 4), spark: [8, 9, 10, 9, 11] })),
    },
    {
      price: 249,
      domains: Array.from({ length: 4 }, (_, i) => ({ domain: `pro-${i + 1}.com`, wr: 80 + (i % 3), spark: [6, 7, 7, 8, 9] })),
    },
  ];
  const lowestPrice = Math.min(...priceBuckets.map((b) => b.price));
  const totalOpportunities = lastOpp;

  return {
    totalOpportunities,
    opportunityTrend: oppTrend,
    competitorMatched: compMatched,
    competitorSlices,
    avgWrScore,
    wrTopBars,
    lowestPrice,
    priceBuckets,
  };
}

/* =============================================================================
   MAIN — Opportunity Summary KPI Cards (with demo fallback)
============================================================================= */
export function OpportunitiesKpiSummary({
  onExport,
  totalOpportunities: _totalOpportunities,
  opportunityTrend: _opportunityTrend,
  onResetTableScrollTop,
  competitorMatched: _competitorMatched,
  competitorSlices: _competitorSlices,
  onFilterCompetitorMatch,
  avgWrScore: _avgWrScore,
  wrTopBars: _wrTopBars,
  lowestPrice: _lowestPrice,
  priceBuckets: _priceBuckets,
  onJumpToDomainRow,
}: KpiSummaryProps) {
  const fontFamily =
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

  // -------- Demo fallback: fill only missing/empty props ----------
  const demo = React.useMemo(() => makeDemoData(), []);
  const hasTrend = Array.isArray(_opportunityTrend) && _opportunityTrend.some((p) => (p?.count ?? 0) > 0);
  const opportunityTrend = hasTrend ? _opportunityTrend : demo.opportunityTrend;

  const priceBuckets = (_priceBuckets?.length ?? 0) > 0 ? _priceBuckets : demo.priceBuckets;
const safeCompetitorSlices = _competitorSlices ?? [];

const competitorSlices =
  safeCompetitorSlices.length > 0 && safeCompetitorSlices.some((s) => (s?.count ?? 0) > 0)
    ? safeCompetitorSlices
    : demo.competitorSlices;

  const wrTopBars = (_wrTopBars?.length ?? 0) > 0 ? _wrTopBars : demo.wrTopBars;

  const totalOpportunities =
    typeof _totalOpportunities === "number" && _totalOpportunities > 0
      ? _totalOpportunities
      : Math.max(1, opportunityTrend[opportunityTrend.length - 1]?.count ?? demo.totalOpportunities);

  const competitorMatched =
    typeof _competitorMatched === "number" && _competitorMatched > 0
      ? _competitorMatched
      : Math.max(1, competitorSlices.reduce((s, c) => s + (c?.count ?? 0), 0));
      
const lowestPrice =
  typeof _lowestPrice === "number" && _lowestPrice > 0
    ? _lowestPrice
    : Math.min(...(priceBuckets?.map((b) => b.price) ?? [0]));


const avgWrScore =
  typeof _avgWrScore === "number" && _avgWrScore > 0 ? _avgWrScore : demo.avgWrScore;

const usingDemo =
  (!hasTrend ? 1 : 0) +
  ((_priceBuckets?.length ?? 0) === 0 ? 1 : 0) +
  (((_competitorSlices?.length ?? 0) === 0 || !_competitorSlices?.some((s) => (s?.count ?? 0) > 0)) ? 1 : 0) +
  ((_wrTopBars?.length ?? 0) === 0 ? 1 : 0) +
  (!((_totalOpportunities ?? 0) > 0) ? 1 : 0) +
  (!((_competitorMatched ?? 0) > 0) ? 1 : 0) +
  (!((_avgWrScore ?? 0) > 0) ? 1 : 0) +
  (!((_lowestPrice ?? 0) > 0) ? 1 : 0) > 0;


  // -------- Derived series & splits ----------
  const oppSP = toSeriesFromTrend(opportunityTrend);
  const dOpp = deltaFrom(oppSP);

  // --- Card 1: Total Opportunities (split by price band)
  const priceSplit = derivePriceSplit(priceBuckets);
  const TOT_COLORS: Record<string, string> = PRICE_COLORS;
  const TOT_NAMES: Record<string, string> = PRICE_NAMES;
  const totRows = React.useMemo(() => splitSeries(oppSP, priceSplit.parts, 0.06), [oppSP, priceBuckets]);

  // --- Card 2: Competitor-Matched Domains
  const compTotal = Math.max(0, competitorMatched || 0);
  const oppTotal = Math.max(1, totalOpportunities || 1);
  const compRatio = Math.min(1, compTotal / oppTotal);
  const compSP: SeriesPoint[] = oppSP.map((p) => ({ date: p.date, value: Math.round(p.value * compRatio) }));
  const dComp = deltaFrom(compSP);

  const compKeys = (competitorSlices ?? []).map((_, i) => `c_${i}`);
  const compParts: SplitSpec[] = (competitorSlices ?? []).map((s, i) => ({
    key: compKeys[i],
    label: s.name || `Slice ${i + 1}`,
    baseShare: compTotal ? (s.count || 0) / compTotal : 1 / Math.max(1, (competitorSlices ?? []).length),
  }));
  const COMP_COLORS: Record<string, string> = Object.fromEntries(compKeys.map((k, i) => [k, competitorSlices?.[i]?.color ?? palette(i)]));
  const COMP_NAMES: Record<string, string> = Object.fromEntries(compKeys.map((k, i) => [k, competitorSlices?.[i]?.name ?? `Slice ${i + 1}`]));
  const compRows = React.useMemo(() => splitSeries(compSP, compParts, 0.06), [compSP, competitorSlices, competitorMatched]);

  // --- Card 3: Average WR Score (bands from wrTopBars)
  const wrSplit = deriveWrBandSplit(wrTopBars);
  const wrRows = React.useMemo(() => splitSeries(oppSP, wrSplit.parts, 0.05), [oppSP, wrTopBars]);
  const wrAvgSeries = wrAvgFromRows(wrRows);
  const dWrAvg = wrAvgSeries.length >= 2 ? wrAvgSeries[wrAvgSeries.length - 1] - wrAvgSeries[wrAvgSeries.length - 2] : undefined;

  // --- Card 4: Lowest Price Opportunity
  const priceRows = totRows; // reuse same split as Card 1
  const onClickLowest = React.useCallback(() => {
    const cheapest = (priceBuckets ?? []).slice().sort((a, b) => a.price - b.price)[0];
    const first = cheapest?.domains?.[0]?.domain;
    if (first && onJumpToDomainRow) onJumpToDomainRow(first);
  }, [priceBuckets, onJumpToDomainRow]);

  // Trend % share chip
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  return (
    <section className="w-full mt-4 px-5 py-2" style={{ fontFamily }} aria-label="Opportunity Summary KPI Cards">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 size={20} color={TOKENS.brand} />
          <h2 className="truncate text-[16px] md:text-[18px] font-semibold" style={{ color: TOKENS.text }}>
            Opportunity Summary KPI Cards
          </h2>
          <span
            className="inline-flex items-center pl-1 text-[#9CA3AF]"
            title="Each card uses a stacked donut snapshot and a stacked trend with a smart popover showing a detailed breakdown."
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </span>
          {usingDemo && (
            <span
              className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]"
              style={{ borderColor: TOKENS.border, color: TOKENS.muted, background: "#FFFFFF" }}
              title="Showing demo data for empty inputs"
            >
              Demo data
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* % share chip */}
          <label
            className="inline-flex items-center gap-2 text-xs rounded-full border px-3 py-1.5"
            style={{ color: TOKENS.muted, borderColor: TOKENS.border, cursor: "pointer", background: "#FFFFFF" }}
            title="Toggle trends between absolute counts and % share"
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
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            title="Export KPI Summary"
            style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
          >
            <FileDown size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {/* 1) Total Opportunities — split by price band */}
        <KpiCard
          title="Total Opportunities Found"
          info="Snapshot: opportunities by price band. Trend: the same band mix over time."
          glyph={<Search size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(totRows, priceSplit.keys, TOT_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={TOT_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={totalOpportunities}
          valueFmt={(v) => intFmt.format(v)}
          delta={dOpp}
          trend={
            <TrendStack
              rows={totRows}
              keys={priceSplit.keys}
              colors={TOT_COLORS}
              names={TOT_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={onResetTableScrollTop}
          ariaLabel="Total Opportunities Found card"
        />

        {/* 2) Competitor‑Matched Domains */}
        <KpiCard
          title="Competitor‑Matched Domains"
          info="Snapshot: which competitors these domains already link to. Trend: composition over time."
          glyph={<Link2 size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(compRows, compKeys, COMP_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={COMP_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={competitorMatched}
          valueFmt={(v) => intFmt.format(v)}
          delta={dComp}
          trend={
            <TrendStack
              rows={compRows}
              keys={compKeys}
              colors={COMP_COLORS}
              names={COMP_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={onFilterCompetitorMatch}
          ariaLabel="Competitor‑Matched Domains card"
        />

        {/* 3) Average WR Score */}
        <KpiCard
          title="Average WR Score"
          info="Snapshot: distribution across WR bands. Trend: band mix over time (delta shown in points)."
          glyph={<Star size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(wrRows, wrSplit.keys, WR_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={WR_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={avgWrScore}
          valueFmt={(v) => `${Math.round(v)}`}
          delta={typeof dWrAvg === "number" ? Math.round(dWrAvg * 10) / 10 : undefined}
          deltaUnit="pt"
          trend={
            <TrendStack
              rows={wrRows}
              keys={wrSplit.keys}
              colors={WR_COLORS}
              names={WR_NAMES}
              mode="area"
              share={shareMode}
            />
          }
          ariaLabel="Average WR Score card"
        />

        {/* 4) Lowest Price Opportunity */}
        <KpiCard
          title="Lowest Price Opportunity"
          info="Snapshot: opportunities by price band. Trend: price-band mix over time."
          glyph={<Tag size={16} color={TOKENS.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(priceRows, priceSplit.keys, PRICE_COLORS).map((p) => ({ ...p, name: p.key }))}
              nameMap={PRICE_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={lowestPrice}
          valueFmt={(v) => formatCurrency(v)}
          trend={
            <TrendStack
              rows={priceRows}
              keys={priceSplit.keys}
              colors={PRICE_COLORS}
              names={PRICE_NAMES}
              mode="area"
              share={shareMode}
            />
          }
          onClick={onClickLowest}
          ariaLabel="Lowest Price Opportunity card"
        />
      </div>
    </section>
  );
}

export default OpportunitiesKpiSummary;

