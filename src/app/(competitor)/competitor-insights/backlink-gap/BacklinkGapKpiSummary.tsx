import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  Link2,
  Star,
  GitMerge,
  Magnet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

/* ----------------------------------------------------------------------------
   Design tokens (brand-aligned)
----------------------------------------------------------------------------- */
const TOKENS = {
  brand: "#1090D0",
  brandHover: "#0E81BB",
  chartBrand: "#0077ff",
  pastelBrand: "#D2EFFF",
  borderLight: "#E5E7EB",
  cardBorder: "#D2EFFF",
  chipBg: "#F5F7FA",
  chipHover: "#EDF1F5",
  text: "#111827",
  textMuted: "#6B7280",
  danger: "#EF4444",
  warn: "#F59E0B",
  ok: "#10B981",
  white: "#FFFFFF",
};
const RADIUS = 12;

/* ----------------------------------------------------------------------------
   Types (data contract – aligns with Backlink Gap specs)
----------------------------------------------------------------------------- */
export type BacklinkGapKpiPayload = {
  projectDomain: string;
  competitors: string[];
  wrThreshold?: number; // default 70
  totals: {
    missingDomains: number;
    highAuthorityCount: number;
    sharedAmongCompetitorsCount: number;
    opportunitiesCount?: number;
  };
  uniqueByCompetitor: Record<string, number>;
};

export type BacklinkGapKpiHandlers = {
  onViewAll?: () => void; // Scroll to table
  onFilterUnique?: (competitor: string) => void; // (not used in this 4-card set)
  onFilterHighAuthority?: (minWR: number) => void;
  onFilterShared?: (minCompetitors: number) => void;
  onViewOpportunities?: () => void;
};

/** Optional deltas (vs prior period), shown as chips under the primary metric */
export type BacklinkGapDeltas = {
  missingPct?: number; // Total Missing
  highAuthorityPct?: number; // High Authority
  sharedPct?: number; // Common (≥2)
  opportunitiesPct?: number; // Opportunities
};

/** Optional breakdowns to power stacked/two-slice donuts and averages */
export type BacklinkGapBreakdowns = {
  /** Competitor-wise share of ALL missing domains */
  totalMissingByCompetitor?: Record<string, number>;
  /** Competitor-wise share of HIGH-AUTHORITY gap domains */
  highAuthorityByCompetitor?: Record<string, number>;
  /** Common vs Other split for donut (Other = Missing - Shared) + optional avg WRs */
  sharedVsOther?: {
    sharedCount: number;
    otherCount: number;
    sharedAvgWr?: number;
    otherAvgWr?: number;
  };
};

/** Optional WR score per competitor for tooltip micro-gauges */
export type CompetitorWrMap = Record<string, number>;

/** Buckets for opportunities mini bars (wr score + count + sample domain list) */
export type OpportunityBucket = {
  wr: number; // WR score (x-axis)
  count: number; // number of matched opportunities
  top?: { domain: string; match: number; price: number }[]; // for tooltip details
};

export type BacklinkGapKpiSummaryProps = {
  payload?: BacklinkGapKpiPayload; // guarded access everywhere
  handlers?: BacklinkGapKpiHandlers;
  deltas?: BacklinkGapDeltas;
  breakdowns?: BacklinkGapBreakdowns;
  wrByCompetitor?: CompetitorWrMap;
  opportunityBuckets?: OpportunityBucket[]; // 7–10 bars recommended
  opportunitiesEnabled?: boolean;
  className?: string;
};

/* ----------------------------------------------------------------------------
   Utilities
----------------------------------------------------------------------------- */
function formatNumber(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "–";
  if (n >= 1000) return `${Math.round(n).toLocaleString()}`;
  return `${Math.round(n)}`;
}
function formatCurrency(n: number | undefined, symbol = "$") {
  if (n == null || Number.isNaN(n)) return "–";
  return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function clampPct(n: number) {
  return Math.max(-999, Math.min(999, n));
}

/** Count-up animation for primary numbers */
function useCountUp(value = 0, duration = 500) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const diff = value - from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(from.current + diff * p);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return Math.round(display);
}

/** Stable color palette for competitors (consistent order) */
const COMP_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4"];
function getColorForIndex(i: number) {
  return COMP_COLORS[i % COMP_COLORS.length];
}

/* ----------------------------------------------------------------------------
   Smart Popover (side-aware) + Info Tooltip
----------------------------------------------------------------------------- */
type SmartPopoverProps = {
  open: boolean;
  anchorX: number;
  anchorY: number;
  // containerRef: React.RefObject<HTMLElement>;
  containerRef: any;
  children: React.ReactNode;
};
function SmartPopover({ open, anchorX, anchorY, containerRef, children }: SmartPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });

  useEffect(() => {
    if (!open || !containerRef.current || !ref.current) return;
    const cont = containerRef.current.getBoundingClientRect();
    const tip = ref.current.getBoundingClientRect();
    const sideLeft = anchorX > cont.width / 2;
    const left = sideLeft
      ? Math.max(8, anchorX - tip.width - 12)
      : Math.min(cont.width - tip.width - 8, anchorX + 12);
    const top = Math.min(cont.height - tip.height - 8, Math.max(8, anchorY - tip.height / 2));
    setPos({ left, top });
  }, [open, anchorX, anchorY, containerRef]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-md shadow-lg border bg-white p-3 text-xs"
      style={{
        left: pos.left,
        top: pos.top,
        borderColor: TOKENS.borderLight,
        maxWidth: 320,
        color: TOKENS.text,
      }}
    >
      {children}
    </div>
  );
}

function InfoTooltip({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [p, setP] = useState({ x: 0, y: 0 });

  return (
    <span ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`Info: ${label}`}
        onMouseEnter={(e) => {
          const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
          setP({ x: (e.clientX - r.left), y: (e.clientY - r.top) });
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={(e) => {
          const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
          setP({ x: r.width - 16, y: 10 });
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        className="ml-2 text-gray-400 hover:text-gray-600"
      >
        <Info size={16} />
      </button>

      <SmartPopover open={open} anchorX={p.x} anchorY={p.y} containerRef={containerRef}>
        <div className="text-[12px] leading-5">{children}</div>
      </SmartPopover>
    </span>
  );
}

/* ----------------------------------------------------------------------------
   Micro-components: Gauge + Delta Chip + Card Shell + Charts
----------------------------------------------------------------------------- */
function Gauge({ value, size = 18, color = TOKENS.brand }: { value?: number; size?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#E5E7EB" strokeWidth={3} fill="none" />
      <circle
        cx={size/2}
        cy={size/2}
        r={r}
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeDasharray={`${(pct/100)*c} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
}

function DeltaChip({ pct }: { pct?: number }) {
  if (pct == null) return null;
  const v = clampPct(pct);
  const up = v >= 0;
  const color = up ? TOKENS.ok : TOKENS.danger;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ background: "#F9FAFB", color, border: `1px solid ${TOKENS.borderLight}` }}
      aria-label={`Delta ${up ? "up" : "down"} ${Math.abs(v)}% vs prior period`}
      title={`${up ? "Up" : "Down"} ${Math.abs(v)}% vs prior period`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(v)}%
    </span>
  );
}

function CardShell({
  title,
  icon,
  tooltip,
  children,
  footer,
}: React.PropsWithChildren<{
  title: string;
  icon: React.ReactNode;
  tooltip: React.ReactNode;
  footer?: React.ReactNode;
}>) {
  return (
    <section
      className="relative flex flex-col"
      style={{
        background: TOKENS.white,
        borderRadius: RADIUS,
        border: `1px solid ${TOKENS.cardBorder}`,
        boxShadow: "0 2px 6px rgba(17,24,39,0.06)",
        minWidth: 250,
      }}
    >
      <header className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <span
            className="grid size-6 place-items-center rounded"
            style={{ background: TOKENS.pastelBrand, border: `1px solid ${TOKENS.borderLight}` }}
          >
            {icon}
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: TOKENS.text }}>
            {title}
          </h3>
        </div>
        <InfoTooltip label={title}>{tooltip}</InfoTooltip>
      </header>
      {children}
      {footer && <div className="px-4 pb-3 mt-auto">{footer}</div>}
    </section>
  );
}

/* --- Stacked donut for competitor breakdown (Card 1 & 2) ------------------ */
function StackedDonut({
  data,
  colors,
  tooltipTitle,
  wrByCompetitor,
}: {
  data: { name: string; count: number }[];
  colors: string[];
  tooltipTitle: string;
  wrByCompetitor?: CompetitorWrMap;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ active: boolean; x: number; y: number; idx: number }>({
    active: false, x: 0, y: 0, idx: -1,
  });
  const total = data.reduce((a, b) => a + (b.count || 0), 0);

  return (
    <div ref={ref} className="relative mt-2 h-[140px]">
      <ResponsiveContainer width="100%" height={130}>
        <PieChart
          onMouseMove={(e: any) => {
            if (!e?.activeCoordinate) return;
            setHover({ active: true, x: e.activeCoordinate.x, y: e.activeCoordinate.y, idx: e.activeTooltipIndex ?? -1 });
          }}
          onMouseLeave={() => setHover({ active: false, x: 0, y: 0, idx: -1 })}
        >
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={1}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} stroke={TOKENS.white} strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <SmartPopover open={hover.active && hover.idx >= 0} anchorX={hover.x} anchorY={hover.y} containerRef={ref}>
        <div className="mb-1 font-medium">{tooltipTitle}</div>
        <div className="space-y-1">
          {data.map((s, i) => {
            const pct = total ? Math.round((s.count / total) * 100) : 0;
            const emph = i === hover.idx;
            const wr = wrByCompetitor?.[s.name];
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block size-2.5 rounded-full" style={{ background: colors[i] }} />
                  <span className={`truncate ${emph ? "font-medium" : ""}`}>{s.name}</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className={`text-right ${emph ? "font-medium" : "text-gray-600"}`}>
                    {formatNumber(s.count)} · {pct}%
                  </span>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Gauge value={wr} />
                    <span className="text-[11px]">WR {wr != null ? Math.round(wr) : "–"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SmartPopover>
    </div>
  );
}

/* --- Two-slice donut for Common vs Other (Card 3) -------------------------- */
function TwoSliceDonut({
  shared,
  other,
  sharedAvgWr,
  otherAvgWr,
}: {
  shared: number;
  other: number;
  sharedAvgWr?: number;
  otherAvgWr?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ active: boolean; x: number; y: number; idx: number }>({
    active: false, x: 0, y: 0, idx: -1,
  });
  const data = [
    { name: "Shared (2+)", count: Math.max(0, shared) },
    { name: "Other", count: Math.max(0, other) },
  ];
  const colors = ["#16A34A", "#CBD5E1"]; // shared vs other

  return (
    <div ref={ref} className="relative mt-2 h-[140px]">
      <ResponsiveContainer width="100%" height={130}>
        <PieChart
          onMouseMove={(e: any) => {
            if (!e?.activeCoordinate) return;
            setHover({ active: true, x: e.activeCoordinate.x, y: e.activeCoordinate.y, idx: e?.activeTooltipIndex ?? -1 });
          }}
          onMouseLeave={() => setHover({ active: false, x: 0, y: 0, idx: -1 })}
        >
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={1}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} stroke={TOKENS.white} strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <SmartPopover open={hover.active && hover.idx >= 0} anchorX={hover.x} anchorY={hover.y} containerRef={ref}>
        <div className="mb-1 font-medium">Overlap Breakdown</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: colors[0] }} />
              <span>Shared (2+)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium">{formatNumber(shared)}</span>
              <Gauge value={sharedAvgWr} />
              <span className="text-[11px] text-gray-600">Avg WR {sharedAvgWr != null ? Math.round(sharedAvgWr) : "–"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: colors[1] }} />
              <span>Other Gap</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium">{formatNumber(other)}</span>
              <Gauge value={otherAvgWr} />
              <span className="text-[11px] text-gray-600">Avg WR {otherAvgWr != null ? Math.round(otherAvgWr) : "–"}</span>
            </div>
          </div>
        </div>
      </SmartPopover>
    </div>
  );
}

/* --- Mini Bars (Card 4) ---------------------------------------------------- */
function MiniBars({
  data,
  renderTooltip,
}: {
  data: OpportunityBucket[];
  renderTooltip: (d: OpportunityBucket) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ active: boolean; x: number; y: number; idx: number }>({
    active: false, x: 0, y: 0, idx: -1,
  });
  const series = data.map((d) => ({ label: d.wr, count: d.count, raw: d }));

  return (
    <div ref={ref} className="relative mt-2 h-[150px] px-1">
      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          data={series}
          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          onMouseMove={(s: any) => {
            if (!s?.activePayload?.[0]) return;
            setHover({ active: true, x: s.chartX, y: s.chartY, idx: s.activeTooltipIndex ?? -1 });
          }}
          onMouseLeave={() => setHover({ active: false, x: 0, y: 0, idx: -1 })}
        >
          <CartesianGrid vertical={false} stroke="#F3F4F6" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis hide />
          <Bar dataKey="count" radius={[3,3,0,0]} fill={TOKENS.chartBrand} />
        </BarChart>
      </ResponsiveContainer>

      <SmartPopover
        open={hover.active && hover.idx >= 0 && !!series[hover.idx]}
        anchorX={hover.x}
        anchorY={hover.y}
        containerRef={ref}
      >
        {hover.idx >= 0 && (
          <>
            <div className="mb-1 font-medium">WR {series[hover.idx].label}</div>
            {renderTooltip(series[hover.idx].raw)}
          </>
        )}
      </SmartPopover>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Main Section Component
----------------------------------------------------------------------------- */
export function BacklinkGapKpiSummary({
  payload,
  handlers,
  deltas,
  breakdowns,
  wrByCompetitor,
  opportunityBuckets = [],
  opportunitiesEnabled = false,
  className,
}: BacklinkGapKpiSummaryProps) {
  // Early exit / empty state: if no competitors selected, hide the whole block

  const wrMin = payload?.wrThreshold ?? 70;
  const totalMissing = payload?.totals?.missingDomains ?? 0;
  const highAuthority = payload?.totals?.highAuthorityCount ?? 0;
  const shared = payload?.totals?.sharedAmongCompetitorsCount ?? 0;
  const otherGap = Math.max(0, totalMissing - shared);
  const opportunities = payload?.totals?.opportunitiesCount ?? 0;
  // Always run hooks
const missingDisplay = useCountUp(payload?.totals?.missingDomains ?? 0);
const haDisplay = useCountUp(payload?.totals?.highAuthorityCount ?? 0);
const sharedDisplay = useCountUp(payload?.totals?.sharedAmongCompetitorsCount ?? 0);
const oppDisplay = useCountUp(payload?.totals?.opportunitiesCount ?? 0);

const totalMissingSlices = useMemo(() => {
  const competitors = payload?.competitors || [];
  const provided = breakdowns?.totalMissingByCompetitor;
  if (provided && Object.keys(provided).length) {
    return competitors.map((name, i) => ({
      name,
      count: Math.max(0, provided[name] ?? 0),
      color: getColorForIndex(i),
    }));
  }
  const sumUnique = Object.values(payload?.uniqueByCompetitor || {}).reduce((a, b) => a + (b || 0), 0);
  return competitors.map((name, i) => {
    const share = sumUnique ? (payload?.uniqueByCompetitor?.[name] || 0) / sumUnique : 1 / competitors.length;
    return { name, count: Math.round((payload?.totals?.missingDomains ?? 0) * share), color: getColorForIndex(i) };
  });
}, [breakdowns?.totalMissingByCompetitor, payload]);

const highAuthoritySlices = useMemo(() => {
  const competitors = payload?.competitors || [];
  const base = totalMissingSlices.reduce((a, b) => a + b.count, 0) || 1;
  const provided = breakdowns?.highAuthorityByCompetitor;

  if (provided && Object.keys(provided).length) {
    return competitors.map((name, i) => ({
      name,
      count: Math.max(0, provided[name] ?? 0),
      color: getColorForIndex(i),
    }));
  }

  return totalMissingSlices.map((s) => ({
    name: s.name,
    count: Math.round((payload?.totals?.highAuthorityCount ?? 0) * (s.count / base)),
    color: s.color!,
  }));
}, [breakdowns?.highAuthorityByCompetitor, payload?.totals?.highAuthorityCount, totalMissingSlices]);

const sharedVsOther = useMemo(() => {
  const sharedCount = breakdowns?.sharedVsOther?.sharedCount ?? (payload?.totals?.sharedAmongCompetitorsCount ?? 0);
  const otherCount = breakdowns?.sharedVsOther?.otherCount ?? Math.max(0, (payload?.totals?.missingDomains ?? 0) - sharedCount);
  return {
    sharedCount,
    otherCount,
    sharedAvgWr: breakdowns?.sharedVsOther?.sharedAvgWr,
    otherAvgWr: breakdowns?.sharedVsOther?.otherAvgWr,
  };
}, [breakdowns?.sharedVsOther, payload?.totals]);





  // Gate Opportunities card: show when enabled OR count > 0
  const showOppCard = opportunitiesEnabled || (opportunities ?? 0) > 0;

  return (
    <section
      role="group"
      aria-label="Backlink Gap KPIs"
      className={className}
    >
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1 — Total Missing Domains */}
        <CardShell
          title="Total Missing Domains"
          icon={<Link2 size={14} color={TOKENS.brand} />}
          tooltip={<>Referring root domains that link to selected competitors but not to your project.</>}
          footer={
            <div className="flex items-center justify-between">
              <div />
              <button
                type="button"
                onClick={totalMissing > 0 ? handlers?.onViewAll : undefined}
                aria-disabled={totalMissing <= 0}
                className={`text-sm font-medium underline-offset-4 ${totalMissing > 0 ? "text-sky-600 hover:underline" : "text-gray-400 cursor-not-allowed"}`}
              >
                View in Table
              </button>
            </div>
          }
        >
          <div className="px-4 pb-1">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold leading-tight" style={{ color: TOKENS.text }}>
                {formatNumber(missingDisplay)}
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <DeltaChip pct={deltas?.missingPct} />
              <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                Consolidated across all selected competitors
              </span>
            </div>
          </div>

          <StackedDonut
            data={totalMissingSlices}
            colors={totalMissingSlices.map((s, i) => s.color ?? getColorForIndex(i))}
            tooltipTitle="Missing domains by competitor"
            wrByCompetitor={wrByCompetitor}
          />
        </CardShell>

        {/* Card 2 — High Authority Domains (WR ≥ threshold) */}
        <CardShell
          title={`High Authority Domains (WR ≥ ${wrMin})`}
          icon={<Star size={14} color={TOKENS.brand} />}
          tooltip={<>Domains in gap with WR ≥ {wrMin} (Wranker Rating).</>}
          footer={
            <div className="flex items-center justify-between">
              <div />
              <button
                type="button"
                onClick={highAuthority > 0 ? () => handlers?.onFilterHighAuthority?.(wrMin) : undefined}
                aria-disabled={highAuthority <= 0}
                className={`text-sm font-medium underline-offset-4 ${highAuthority > 0 ? "text-sky-600 hover:underline" : "text-gray-400 cursor-not-allowed"}`}
              >
                Show High Authority
              </button>
            </div>
          }
        >
          <div className="px-4 pb-1">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold leading-tight" style={{ color: TOKENS.text }}>
                {formatNumber(haDisplay)}
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <DeltaChip pct={deltas?.highAuthorityPct} />
              <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                High‑value gap domains by WR
              </span>
            </div>
          </div>

          <StackedDonut
            data={highAuthoritySlices}
            colors={highAuthoritySlices.map((s, i) => s.color ?? getColorForIndex(i))}
            tooltipTitle="High‑authority gap domains by competitor"
            wrByCompetitor={wrByCompetitor}
          />
        </CardShell>

        {/* Card 3 — Common Domains (2+ competitors) */}
        <CardShell
          title="Common Domains (2+ competitors)"
          icon={<GitMerge size={14} color={TOKENS.brand} />}
          tooltip={<>Referring domains that link to 2+ selected competitors (industry‑trusted sources).</>}
          footer={
            <div className="flex items-center justify-between">
              <div />
              <button
                type="button"
                onClick={shared > 0 ? () => handlers?.onFilterShared?.(2) : undefined}
                aria-disabled={shared <= 0}
                className={`text-sm font-medium underline-offset-4 ${shared > 0 ? "text-sky-600 hover:underline" : "text-gray-400 cursor-not-allowed"}`}
              >
                View Shared Sources
              </button>
            </div>
          }
        >
          <div className="px-4 pb-1">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold leading-tight" style={{ color: TOKENS.text }}>
                {formatNumber(sharedDisplay)}
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <DeltaChip pct={deltas?.sharedPct} />
              <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                Overlap across competitors
              </span>
            </div>
          </div>

          <TwoSliceDonut
            shared={sharedVsOther.sharedCount}
            other={sharedVsOther.otherCount}
            sharedAvgWr={sharedVsOther.sharedAvgWr}
            otherAvgWr={sharedVsOther.otherAvgWr}
          />
        </CardShell>

        {/* Card 4 — Opportunities via Vefogix (optional visibility rule) */}
        {showOppCard && (
          <CardShell
            title="Opportunities"
            icon={<Magnet size={14} color={TOKENS.brand} />}
            tooltip={
              <>Total opportunities available to create quality links.<br />Source: Via Vefogix marketplace.</>
            }
            footer={
              <div className="flex items-center justify-between">
                <div />
                <button
                  type="button"
                  onClick={opportunities > 0 ? handlers?.onViewOpportunities : undefined}
                  aria-disabled={opportunities <= 0}
                  className={`text-sm font-medium underline-offset-4 ${opportunities > 0 ? "text-sky-600 hover:underline" : "text-gray-400 cursor-not-allowed"}`}
                >
                  View in Opportunities
                </button>
              </div>
            }
          >
            <div className="px-4 pb-1">
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-semibold leading-tight" style={{ color: TOKENS.text }}>
                  {formatNumber(oppDisplay)}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <DeltaChip pct={deltas?.opportunitiesPct} />
                <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                  Domains in your gap matched via marketplace
                </span>
              </div>
            </div>

            <MiniBars
              data={opportunityBuckets}
              renderTooltip={(d) => (
                <div className="space-y-1 max-h-40 overflow-auto pr-1">
                  {(d.top ?? []).slice(0, 5).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <span className="truncate">{it.domain}</span>
                      <span className="whitespace-nowrap text-gray-600 text-[11px]">
                        Match {Math.round(it.match)} • {formatCurrency(it.price)}
                      </span>
                    </div>
                  ))}
                  {(!d.top || d.top.length === 0) && (
                    <div className="text-[11px] text-gray-500">No sample domains in this bucket.</div>
                  )}
                </div>
              )}
            />
          </CardShell>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Demo with mock data (optional – remove in production)
----------------------------------------------------------------------------- */
export default function DemoBacklinkGapKpiSummary() {
  const payload: BacklinkGapKpiPayload = {
    projectDomain: "yourdomain.com",
    competitors: ["compA.com", "compB.com", "compC.com"],
    wrThreshold: 70,
    totals: {
      missingDomains: 1862,
      highAuthorityCount: 193,
      sharedAmongCompetitorsCount: 516,
      opportunitiesCount: 213,
    },
    uniqueByCompetitor: {
      "compA.com": 420,
      "compB.com": 310,
      "compC.com": 270,
    },
  };

  const wrByCompetitor: CompetitorWrMap = {
    "compA.com": 81,
    "compB.com": 75,
    "compC.com": 68,
  };

  const breakdowns: BacklinkGapBreakdowns = {
    totalMissingByCompetitor: { "compA.com": 720, "compB.com": 620, "compC.com": 522 },
    highAuthorityByCompetitor: { "compA.com": 91, "compB.com": 61, "compC.com": 41 },
    sharedVsOther: { sharedCount: 516, otherCount: 1862 - 516, sharedAvgWr: 73, otherAvgWr: 66 },
  };

  const deltas: BacklinkGapDeltas = {
    missingPct: 7,
    highAuthorityPct: 4,
    sharedPct: -2,
    opportunitiesPct: 9,
  };

  const opportunityBuckets: OpportunityBucket[] = [95, 90, 85, 80, 75, 70, 65, 60]
    .slice(0, 8)
    .map((wr) => ({
      wr,
      count: Math.max(1, Math.round((100 - wr) / 6)),
      top: Array.from({ length: 5 }).map((_, i) => ({
        domain: `wr-${wr}-${i}.com`,
        match: 70 + ((wr + i) % 25),
        price: 40 + ((wr + i) % 50),
      })),
    }));

  return (
    <div className="w-full mx-auto mt-4">
      <BacklinkGapKpiSummary
        payload={payload}
        handlers={{
          onViewAll: () => alert("Deep-link → Referring Domains table"),
          onFilterHighAuthority: (min) => alert(`Apply chip: WR ≥ ${min}`),
          onFilterShared: (min) => alert(`Apply chip: Match Type = Common (≥${min})`),
          onViewOpportunities: () => alert("Route → Opportunities tab (source=gap)"),
        }}
        deltas={deltas}
        breakdowns={breakdowns}
        wrByCompetitor={wrByCompetitor}
        opportunityBuckets={opportunityBuckets}
        opportunitiesEnabled
      />
    </div>
  );
}
