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
  BarChart3,
  Info,
  Download,
  Shield,
  Target,
  Network,
  Clock,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  Link as LinkIcon,
  GitBranchPlus,
  CircleSlash,
  Megaphone,
  MessageSquare,
  Sparkles,
  CircleHelp,
  Video,
  Image as ImageIcon,
  CircleDollarSign,
  Search,
} from "lucide-react";

/* =============================================================================
   Wranker – Section 1: Profile Summary (KPI Cards) — Snapshot + Trend pattern
   -----------------------------------------------------------------------------
   • Inter / Inter Fallback fonts
   • No emoji
   • Branded (#008CCD) icons for section + breakdown types
   • Left: stacked donut (snapshot) → Smart popover w/ icons & color dots
   • Middle: Metric value (blue #0077FF) + delta (2-row, single column)
   • Right: stacked area/bar trend → Smart popover (icons + dots)
   • Pointer cursor on interactive elements
   • Modular chips + toggle
   • Preferred chart/value color: #0077FF + pastels; status colors for statuses
   • Drop-in TSX (tailwindcss, lucide-react, recharts)
   ============================================================================ */

/* -------------------------------- TOKENS -------------------------------- */
const TK = {
  brand: "#008CCD", // icons & accents
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

/* ------------------------------- UTILITIES ------------------------------- */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

type Row = { t: string } & Record<string, number| any>;
type SeriesPoint = { date: string; value: number };

/* -------------------------- PORTALED TOOLTIP SHELL ----------------------- */
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
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none" }}>
      <div
        className="rounded-md p-2 text-xs shadow"
        style={{ background: "#fff", border: `1px solid ${TK.border}`, color: TK.text }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------ POPUP CONTENT — DONUT -------------------------- */
function DonutPortalContent({
  active,
  coordinate,
  containerRect,
  parts,
  nameMap,
  valueFmt,
  iconMap,
  activeIndex,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  iconMap?: Record<string, React.ReactNode>;
  activeIndex?: number | undefined;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  return (
    <PortalTooltipShell x={x} y={y} width={300}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col">
        {parts.map((p, i) => {
          const active = typeof activeIndex === "number" && i === activeIndex;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between gap-6 rounded px-1 py-0.5",
                active ? "bg-gray-50" : ""
              )}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className="inline-flex items-center gap-1" style={{ color: TK.muted }}>
                  <span className="inline-flex items-center" style={{ color: TK.brand }}>
                    {iconMap?.[p.name] ?? <BarChart3 size={14} />}
                  </span>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className="font-semibold">{fmt(Number(p.value))}</div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* ------------------------ POPUP CONTENT — TREND -------------------------- */
function TrendPortalContent({
  active,
  label,
  payload,
  coordinate,
  containerRect,
  nameMap,
  iconMap,
  valueFmt,
  asShare = false,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
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
    <PortalTooltipShell x={x} y={y} width={320}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {typeof label === "string" ? dateLabel(label) : String(label)}
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
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6 rounded px-1 py-0.5 hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span className="inline-flex items-center gap-1" style={{ color: TK.muted }}>
                <span className="inline-flex items-center" style={{ color: TK.brand }}>
                  {iconMap?.[p.name] ?? <BarChart3 size={14} />}
                </span>
                {nameMap?.[p.name] ?? p.name}
              </span>
            </div>
            <div className="font-semibold">{fmt(Number(p.value))}</div>
          </div>
        ))}
      </div>
    </PortalTooltipShell>
  );
}

/* ---------------------------- STACKED DONUT ------------------------------ */
function StackedDonut({
  parts,
  size = 92,
  nameMap,
  iconMap,
  valueFmt,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  valueFmt?: (n: number) => string;
}) {
  const data = parts.filter((p) => (p.value ?? 0) > 0).map((p) => ({ ...p, v: p.value }));
  const [activeIdx, setActiveIdx] = React.useState<number | undefined>();
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
                iconMap={iconMap}
                valueFmt={valueFmt}
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
    </div>
  );
}

/* ----------------------------- STACKED TREND ----------------------------- */
function toShare(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
}
function TrendStack({
  rows,
  keys,
  colors,
  names,
  icons,
  mode,
  share,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  icons: Record<string, React.ReactNode>;
  mode: "area" | "bars";
  share: boolean;
}) {
  const data = share ? toShare(rows, keys) : rows;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const asShare = share;
  const valueFmt = (v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v)));

  return (
    <div ref={ref} className="h-16 w-[auto]" role="img" aria-label="KPI trend">
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
                  iconMap={icons}
                  valueFmt={valueFmt}
                  asShare={asShare}
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
                stroke={colors[k]}
                fill={colors[k]}
                fillOpacity={0.25}
                strokeWidth={2}
                dot={false}
              />
            ))}
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
                  iconMap={icons}
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

/* ------------------------------- DELTA CHIP ------------------------------ */
function Delta({
  deltaPct,
  unit = "%",
  invert = false,
}: {
  deltaPct?: number;
  unit?: "%" | "pp";
  invert?: boolean; // e.g., lower toxicity is better
}) {
  if (typeof deltaPct !== "number" || Number.isNaN(deltaPct)) {
    return <div className="text-xs" style={{ color: TK.muted }}>—</div>;
  }
  const good = invert ? deltaPct < 0 : deltaPct > 0;
  const color = deltaPct === 0 ? TK.muted : good ? TK.success : TK.danger;
  return (
    <div className="text-xs" style={{ color }}>
      {Math.abs(deltaPct).toFixed(1)} {unit}
    </div>
  );
}

/* ------------------------------- CARD SHELL ------------------------------ */
function KpiCard({
  title,
  info,
  glyph,
  donut,
  value,
  valueFmt,
  deltaPct,
  deltaUnit = "%",
  invertDelta,
  trend,
  onClick,
}: {
  title: string;
  info?: string;
  glyph: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  deltaPct?: number;
  deltaUnit?: "%" | "pp";
  invertDelta?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left cursor-pointer"
      aria-label={`${title} KPI`}
    >
      <div
        className="rounded-[12px] border p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TK.border, background: TK.panel }}
      >
        {/* Title */}
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center">{glyph}</span>
          <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
            {title}
          </div>
          {info && (
            <span className="pl-1 text-[#9CA3AF]" title={info}>
              <Info size={14} />
            </span>
          )}
        </div>

        {/* Content: Left donut • Middle value/delta • Right trend */}
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
              {valueFmt(value)}
            </div>
            <Delta deltaPct={deltaPct} unit={deltaUnit} invert={!!invertDelta} />
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* =============================== DATA MODEL ============================== */
type KPIWindow = "7d" | "30d" | "90d";
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
function mkSeries(len = 30, start = 100, amp = 0.15): SeriesPoint[] {
  const base = addDays(todayISO(), -(len - 1));
  return Array.from({ length: len }, (_, i) => {
    const iso = addDays(base, i);
    const wobble = 1 + Math.sin(i * 0.35) * amp + (Math.random() - 0.5) * 0.08;
    return { date: iso, value: Math.max(0, Math.round(start * wobble)) };
  });
}
const deltaFrom = (s?: SeriesPoint[]) =>
  !s || s.length < 2 ? undefined : ((s[s.length - 1].value - s[s.length - 2].value) / Math.max(1, s[s.length - 2].value)) * 100;

/* Split helper: distribute total series into parts with gentle drift */
type SplitSpec = { key: string; label: string; base: number };
function splitSeries(total: SeriesPoint[] | undefined, parts: SplitSpec[], jitter = 0.06): Row[] {
  const src = total ?? [];
  const rows: Row[] = [];
  for (let i = 0; i < src.length; i++) {
    const totalV = Math.max(0, src[i].value || 0);
    const shares: Record<string, number> = {};
    let rem = 1;
    parts.forEach((p, idx) => {
      const wiggle = Math.max(0.02, p.base * (1 + Math.sin((i + 1) * (idx + 2) * 0.21) * jitter));
      const val = idx === parts.length - 1 ? rem : Math.min(rem, wiggle);
      rem -= val;
      shares[p.key] = val;
    });
    const sum = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
    Object.keys(shares).forEach((k) => (shares[k] = shares[k] / sum));
    const out: Row = { t: src[i].date };
    parts.forEach((p) => (out[p.key] = Math.round(totalV * shares[p.key])));
    rows.push(out);
  }
  return rows;
}
function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* ============================ SECTION COMPONENT ========================== */
export default function Demo_ProfilesSummarySection({
  className,
  onExport,
  onNavigate,
}: {
  className?: string;
  onExport?: () => void;
  onNavigate?: (route: { key: string; title: string }) => void;
}) {
  const [range, setRange] = React.useState<KPIWindow>("30d");
  const [shareMode, setShareMode] = React.useState(false);
  const kDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  /* ---- Demo / fallback series (replace with real data) ---- */
  const wrSeries = React.useMemo(() => mkSeries(kDays, 68, 0.05), [kDays]);
  const trafficSeries = React.useMemo(() => mkSeries(kDays, 4200, 0.12), [kDays]);
  const backlinksSeries = React.useMemo(() => mkSeries(kDays, 16000, 0.10), [kDays]);
  const keywordsSeries = React.useMemo(() => mkSeries(kDays, 2400, 0.14), [kDays]);
  const serpFeatSeries = React.useMemo(() => mkSeries(kDays, 900, 0.10), [kDays]);
  const valueSeries = React.useMemo(() => mkSeries(kDays, 3100, 0.11), [kDays]);

  /* ---- WR Score factors (Authority/Relevancy/Diversity/Freshness/Toxicity) ---- */
  const WR_COL: Record<string, string> = {
    authority: "#7E72FF",
    relevancy: "#5CA8FF",
    diversity: "#60A5FA",
    freshness: "#93C5FD",
    toxicity: TK.danger, // status color
  };
  const WR_NAME = {
    authority: "Authority",
    relevancy: "Relevancy",
    diversity: "Diversity",
    freshness: "Freshness",
    toxicity: "Toxicity",
  };
  const WR_ICON: Record<string, React.ReactNode> = {
    authority: <Shield size={14} />,
    relevancy: <Target size={14} />,
    diversity: <Network size={14} />,
    freshness: <Clock size={14} />,
    toxicity: <AlertTriangle size={14} />,
  };
  const wrFactorRows: Row[] = React.useMemo(() => {
    // Simulate component scores (0..100) scaled into parts
    const A = splitSeries(wrSeries, [
      { key: "authority", label: "Authority", base: 0.24 },
      { key: "relevancy", label: "Relevancy", base: 0.22 },
      { key: "diversity", label: "Diversity", base: 0.20 },
      { key: "freshness", label: "Freshness", base: 0.20 },
      { key: "toxicity", label: "Toxicity", base: 0.14 },
    ], 0.04);
    return A;
  }, [wrSeries]);
  const wrValue = React.useMemo(() => {
    const r = wrFactorRows.at(-1);
    if (!r) return 0;
    // Composite score (toxicity inverse)
    const score =
      (r["authority"] + r["relevancy"] + r["diversity"] + r["freshness"] + Math.max(0, 100 - r["toxicity"])) / 5;
    return Math.round(score);
  }, [wrFactorRows]);
  const wrDelta = React.useMemo(() => deltaFrom(wrSeries), [wrSeries]);

  /* ---- Traffic by device (Desktop/Mobile/Tablet) ---- */
  const DEV_COL: Record<string, string> = {
    desktop: TK.valueBlue,
    mobile: "#5CA8FF",
    tablet: "#93C5FD",
  };
  const DEV_NAME = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet" };
  const DEV_ICON: Record<string, React.ReactNode> = {
    desktop: <Monitor size={14} />,
    mobile: <Smartphone size={14} />,
    tablet: <Tablet size={14} />,
  };
  const devRows = React.useMemo(
    () =>
      splitSeries(trafficSeries, [
        { key: "desktop", label: "Desktop", base: 0.46 },
        { key: "mobile", label: "Mobile", base: 0.47 },
        { key: "tablet", label: "Tablet", base: 0.07 },
      ], 0.05),
    [trafficSeries]
  );

  /* ---- Backlinks by attribute ---- */
  const BL_COL: Record<string, string> = {
    follow: TK.valueBlue,
    nofollow: TK.gray,
    ugc: "#22D3EE",
    sponsored: "#7C3AED",
  };
  const BL_NAME = { follow: "Dofollow", nofollow: "Nofollow", ugc: "UGC", sponsored: "Sponsored" };
  const BL_ICON: Record<string, React.ReactNode> = {
    follow: <GitBranchPlus size={14} />,
    nofollow: <CircleSlash size={14} />,
    ugc: <MessageSquare size={14} />,
    sponsored: <Megaphone size={14} />,
  };
  const blRows = React.useMemo(
    () =>
      splitSeries(backlinksSeries, [
        { key: "follow", label: "Dofollow", base: 0.58 },
        { key: "nofollow", label: "Nofollow", base: 0.28 },
        { key: "ugc", label: "UGC", base: 0.08 },
        { key: "sponsored", label: "Sponsored", base: 0.06 },
      ], 0.05),
    [backlinksSeries]
  );

  /* ---- Keywords by rank buckets ---- */
  const POS_COL: Record<string, string> = {
    p1_3: TK.success,
    p4_10: "#60A5FA",
    p11_20: "#7E72FF",
    p21_50: TK.warn,
    p51_100: TK.danger,
  };
  const POS_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50", p51_100: "Pos 51–100" };
  const POS_ICON: Record<string, React.ReactNode> = {
    p1_3: <Sparkles size={14} />,
    p4_10: <BarChart3 size={14} />,
    p11_20: <BarChart3 size={14} />,
    p21_50: <BarChart3 size={14} />,
    p51_100: <BarChart3 size={14} />,
  };
  const posRows = React.useMemo(
    () =>
      splitSeries(keywordsSeries, [
        { key: "p1_3", label: "1-3", base: 0.12 },
        { key: "p4_10", label: "4-10", base: 0.28 },
        { key: "p11_20", label: "11-20", base: 0.22 },
        { key: "p21_50", label: "21-50", base: 0.24 },
        { key: "p51_100", label: "51-100", base: 0.14 },
      ], 0.04),
    [keywordsSeries]
  );

  /* ---- SERP Features ---- */
  const SERP_COL: Record<string, string> = {
    fs: TK.success,
    paa: "#60A5FA",
    video: "#7E72FF",
    images: TK.warn,
    other: TK.gray,
  };
  const SERP_NAME = { fs: "Featured Snippet", paa: "People Also Ask", video: "Video", images: "Images", other: "Other" };
  const SERP_ICON: Record<string, React.ReactNode> = {
    fs: <Sparkles size={14} />,
    paa: <CircleHelp size={14} />,
    video: <Video size={14} />,
    images: <ImageIcon size={14} />,
    other: <BarChart3 size={14} />,
  };
  const serpRows = React.useMemo(
    () =>
      splitSeries(serpFeatSeries, [
        { key: "fs", label: "FS", base: 0.28 },
        { key: "paa", label: "PAA", base: 0.33 },
        { key: "video", label: "Video", base: 0.14 },
        { key: "images", label: "Images", base: 0.12 },
        { key: "other", label: "Other", base: 0.13 },
      ], 0.05),
    [serpFeatSeries]
  );

  /* ---- Traffic Value by Intent ---- */
  const INTENT_COL: Record<string, string> = {
    info: "#7E72FF",
    comm: "#60A5FA",
    trans: TK.success,
    nav: TK.gray,
  };
  const INTENT_NAME = { info: "Informational", comm: "Commercial", trans: "Transactional", nav: "Navigational" };
  const INTENT_ICON: Record<string, React.ReactNode> = {
    info: <Search size={14} />,
    comm: <Megaphone size={14} />,
    trans: <CircleDollarSign size={14} />,
    nav: <LinkIcon size={14} />,
  };
  const intentRows = React.useMemo(
    () =>
      splitSeries(valueSeries, [
        { key: "info", label: "Informational", base: 0.35 },
        { key: "comm", label: "Commercial", base: 0.33 },
        { key: "trans", label: "Transactional", base: 0.22 },
        { key: "nav", label: "Navigational", base: 0.10 },
      ], 0.05),
    [valueSeries]
  );

  /* ---- KPI snapshot values / deltas ---- */
  const sumRow = (r?: Row, keys?: string[]) =>
    !r ? 0 : (keys ?? Object.keys(r).filter((k) => k !== "t")).reduce((s, k) => s + (Number(r[k]) || 0), 0);

  const trafficValue = React.useMemo(() => sumRow(devRows.at(-1)), [devRows]);
  const trafficDelta = React.useMemo(() => deltaFrom(trafficSeries), [trafficSeries]);

  const backlinksValue = React.useMemo(() => sumRow(blRows.at(-1)), [blRows]);
  const backlinksDelta = React.useMemo(() => deltaFrom(backlinksSeries), [backlinksSeries]);

  const keywordsValue = React.useMemo(() => sumRow(posRows.at(-1)), [posRows]);
  const keywordsDelta = React.useMemo(() => deltaFrom(keywordsSeries), [keywordsSeries]);

  const serpValue = React.useMemo(() => sumRow(serpRows.at(-1)), [serpRows]);
  const serpDelta = React.useMemo(() => deltaFrom(serpFeatSeries), [serpFeatSeries]);

  const valueValue = React.useMemo(() => sumRow(intentRows.at(-1)), [intentRows]);
  const valueDelta = React.useMemo(() => deltaFrom(valueSeries), [valueSeries]);

  /* ---- Header Export ---- */
  const handleExport = () => {
    if (onExport) return onExport();
    try {
      const payload = {
        range,
        snapshot: {
          wrScore: wrValue,
          traffic: trafficValue,
          backlinks: backlinksValue,
          keywords: keywordsValue,
          serpFeatures: serpValue,
          trafficValue: valueValue,
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `profile_summary_kpis_${range}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  /* ---- UI bits: Segmented & Toggle ---- */
  function Segmented({
    value,
    items,
    onChange,
  }: {
    value: string;
    items: { label: string; value: string }[];
    onChange: (v: string) => void;
  }) {
    return (
      <div
        role="tablist"
        aria-label="KPI Range"
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

  return (
    <section
      className={className}
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
            Profile Summary (KPI Cards)
          </h2>
          <button
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
            title="Each card shows a stacked donut snapshot and a stacked trend using the same breakdown."
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
            items={[
              { label: "7d", value: "7d" },
              { label: "30d", value: "30d" },
              { label: "90d", value: "90d" },
            ]}
          />
          <label
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.muted, background: TK.panel }}
            title="Toggle trends between absolute values and % share"
          >
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ accentColor: TK.valueBlue, borderColor: TK.border, cursor: "pointer" }}
            />
            Show % share in trends
          </label>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            title="Export snapshot"
            style={{ borderColor: TK.border, background: TK.panel, color: TK.valueBlue, cursor: "pointer" }}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* WR Score — factors */}
        <KpiCard
          title="WR Score"
          info="Backlink‑weighted authority; snapshot & trend show factor mix."
          glyph={<Shield size={16} color={TK.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(wrFactorRows, ["authority", "relevancy", "diversity", "freshness", "toxicity"], WR_COL).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={WR_NAME}
              iconMap={WR_ICON}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={wrValue}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={wrDelta}
          trend={
            <TrendStack
              rows={wrFactorRows}
              keys={["authority", "relevancy", "diversity", "freshness", "toxicity"]}
              colors={WR_COL}
              names={WR_NAME}
              icons={WR_ICON}
              mode="area"
              share={shareMode}
            />
          }
          onClick={() => onNavigate?.({ key: "wrScore", title: "WR Score" })}
        />

        {/* Organic Traffic — devices */}
        <KpiCard
          title="Organic Traffic"
          info="Estimated monthly organic traffic by device."
          glyph={<Monitor size={16} color={TK.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(devRows, ["desktop", "mobile", "tablet"], DEV_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={DEV_NAME}
              iconMap={DEV_ICON}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={trafficValue}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={trafficDelta}
          trend={<TrendStack rows={devRows} keys={["desktop", "mobile", "tablet"]} colors={DEV_COL} names={DEV_NAME} icons={DEV_ICON} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "traffic", title: "Organic Traffic" })}
        />

        {/* Backlinks — attributes */}
        <KpiCard
          title="Backlinks"
          info="Distribution of rel types among backlinks."
          glyph={<LinkIcon size={16} color={TK.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(blRows, ["follow", "nofollow", "ugc", "sponsored"], BL_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={BL_NAME}
              iconMap={BL_ICON}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={backlinksValue}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={backlinksDelta}
          trend={<TrendStack rows={blRows} keys={["follow", "nofollow", "ugc", "sponsored"]} colors={BL_COL} names={BL_NAME} icons={BL_ICON} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "backlinks", title: "Backlinks" })}
        />

        {/* Organic Keywords — rank buckets */}
        <KpiCard
          title="Organic Keywords"
          info="Ranking keywords split by position buckets."
          glyph={<Search size={16} color={TK.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(posRows, ["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"], POS_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={POS_NAME}
              iconMap={POS_ICON}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={keywordsValue}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={keywordsDelta}
          trend={<TrendStack rows={posRows} keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]} colors={POS_COL} names={POS_NAME} icons={POS_ICON} mode="bars" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "keywords", title: "Organic Keywords" })}
        />

        {/* SERP Features Coverage */}
        <KpiCard
          title="SERP Features"
          info="Keywords surfacing in SERP features."
          glyph={<Sparkles size={16} color={TK.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(serpRows, ["fs", "paa", "video", "images", "other"], SERP_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={SERP_NAME}
              iconMap={SERP_ICON}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={serpValue}
          valueFmt={(v) => intFmt.format(v)}
          deltaPct={serpDelta}
          trend={<TrendStack rows={serpRows} keys={["fs", "paa", "video", "images", "other"]} colors={SERP_COL} names={SERP_NAME} icons={SERP_ICON} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "serp", title: "SERP Features" })}
        />

        {/* Est. Traffic Value — intent */}
        <KpiCard
          title="Est. Traffic Value"
          info="Ad‑equivalent value split by intent."
          glyph={<CircleDollarSign size={16} color={TK.brand} />}
          donut={
            <StackedDonut
              parts={lastParts(intentRows, ["info", "comm", "trans", "nav"], INTENT_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={INTENT_NAME}
              iconMap={INTENT_ICON}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={valueValue}
          valueFmt={(v) => `$${intFmt.format(v)}`}
          deltaPct={valueDelta}
          trend={<TrendStack rows={intentRows} keys={["info", "comm", "trans", "nav"]} colors={INTENT_COL} names={INTENT_NAME} icons={INTENT_ICON} mode="bars" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "value", title: "Estimated Traffic Value" })}
        />
      </div>
    </section>
  );
}
