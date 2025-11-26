"use client";

/**
 * Content KPI Summary — redesigned to match the shared reference patterns.
 * - Single‑view KPI cards: Snapshot (stacked donut + smart popover) · Metric value & delta (single column) · Trend (bar/area)
 * - Inter / Inter Fallback fonts; primary metric & single‑series charts use #0077FF + pastel
 * - Status tiers use Success / Warning / Critical tokens; icons #008CCD
 * - Pointer cursor for interactive elements; modular chips/toggles style ready
 *
 * Drop‑in: keeps the original prop contracts (HomeKpiRowProps / HomeKpiData) so you can replace the section in place.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Workflow, // Velocity
  Gauge, // Score
  FileText, // Readability
  Sparkles, // AEO
  Merge, // Dup Risk
  CalendarCheck2, // On‑time
  CheckCircle2,
  Clock,
  FileBadge2,
  Layout,
  MessageSquare,
  AlignJustify,
  HelpCircle,
  Braces,
  Mic,
  Building2,
  FolderKanban,
  Users,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart as RAreaChart,
  Area,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";

/* ───────────────────────── Tokens (CSS vars with safe fallbacks) ───────────────────────── */
const TK = {
  brand: "var(--brand, #008CCD)",
  focus: "var(--focus, #4286F5)",
  text: "var(--text, #374151)",
  textStrong: "var(--text-strong, #111827)",
  textMuted: "var(--text-muted, #6B7280)",
  bgPanel: "var(--bg-panel, #FFFFFF)",
  bgApp: "var(--bg-app, #F5F7FA)",
  border: "var(--border, #E5E7EB)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  success: "var(--success, #34A853)",
  warning: "var(--warning, #F9BB04)",
  critical: "var(--critical, #E94134)",
  successBg: "var(--success-bg, #CBF8D7)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  radius: "var(--radius, 6px)",
  shadow1: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))",
  metricBlue: "#0077FF",
  metricBluePastel: "rgba(0,119,255,0.18)",
} as const;

/* ───────────────────────── Types (original contracts) ───────────────────────── */
type Stage = "drafts" | "review" | "approved" | "published";
type StatusTier = "green" | "yellow" | "red";
type RiskTier = "high" | "medium" | "low";

export type VelocityAggregate = { draft: number; review: number; approved: number; published: number };
export type VelocityTrendPoint = { date: string } & Partial<Record<Stage, number>>;

export type ScoreAggregate = { avg: number; buckets: Record<StatusTier, number>; n: number };
export type ScoreTrendPoint = { date: string; avg: number };

export type ReadAggregate = { median_fk: number; buckets: { ok: number; plus12: number; plus3: number } };
export type ReadTrendPoint = { date: string; median_fk: number };

export type AeoAggregate = { green_pct: number; buckets: Record<StatusTier, number> };
export type AeoTrendPoint = { date: string } & Record<StatusTier, number>;

export type DupAggregate = { pairs: Record<RiskTier, number> };
export type DupTrendPoint = { date: string; high: number; total?: number };

export type OnTimeAggregate = { pct: number; late: number; due_soon: number; on_time: number };
export type OnTimeTrendPoint = { date: string; pct: number };

export type HomeKpiData = {
  velocity?: { agg: VelocityAggregate; trend: VelocityTrendPoint[] };
  score?: { agg: ScoreAggregate; trend: ScoreTrendPoint[] };
  readability?: { agg: ReadAggregate; trend: ReadTrendPoint[] };
  aeo?: { agg: AeoAggregate; trend: AeoTrendPoint[] };
  dup?: { agg: DupAggregate; trend: DupTrendPoint[] };
  ontime?: { agg: OnTimeAggregate; trend: OnTimeTrendPoint[] };
};

export type HomeKpiRowProps = {
  data?: HomeKpiData;
  loading?: boolean;
  error?: string | null;

  onStartDrafts?: () => void;
  onOpenPipeline?: () => void;
  onOpenLowScore?: () => void;
  onOpenReadabilityFixes?: () => void;
  onGenerateAeo?: () => void;
  onOpenDuplicity?: () => void;
  onOpenApprovals?: () => void;
  onViewOverdue?: () => void;

  onSegmentFilter?: (metric: string, segment: string) => void;

  timeWindowLabel?: string;
  demoFallback?: boolean;
};

/* ───────────────────────── Formatters & helpers ───────────────────────── */
const nf = new Intl.NumberFormat();
const pf = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const pf100 = (n: number, d = 1) => `${n.toFixed(d)}%`;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function segColor(key: string): string {
  switch (key) {
    /* velocity + general */
    case "published":
      return TK.success;
    case "approved":
      return TK.brand;
    case "review":
    case "in_review":
      return TK.warning;
    case "drafts":
    case "draft":
      return TK.textMuted;

    /* status tiers */
    case "green":
    case "ok":
    case "on_time":
      return TK.success;
    case "yellow":
    case "plus12":
    case "due_soon":
      return TK.warning;
    case "red":
    case "plus3":
    case "late":
    case "high":
      return TK.critical;

    /* duplication risk */
    case "medium":
      return TK.warning;
    case "low":
      return TK.textMuted;

    default:
      return TK.brand;
  }
}

const SERIES_ICON: Record<string, React.ComponentType<{ size?: number;style?:any }>> = {
  published: CheckCircle2,
  approved: FileBadge2,
  review: HelpCircle,
  drafts: FolderKanban,
  green: CheckCircle2,
  yellow: HelpCircle,
  red: HelpCircle,
  high: Merge,
  on_time: CheckCircle2,
  late: Clock,
  due_soon: Clock,
};

/* ───────────────────────── Portalized tooltip (for charts) ───────────────────────── */
function PortalizedTooltip({
  active,
  coordinate,
  containerRef,
  children,
  offset = 8,
}: {
  active?: boolean;
  coordinate?: { x: number; y: number };
  containerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  offset?: number;
}) {
  if (!active || !coordinate || typeof window === "undefined" || !containerRef.current) return null;
  const rect = containerRef.current.getBoundingClientRect();
  const left = rect.left + window.scrollX + (coordinate.x ?? 0) + offset;
  const top = rect.top + window.scrollY + (coordinate.y ?? 0) + offset;

  return createPortal(
    <div style={{ position: "absolute", left, top, zIndex: 9999, pointerEvents: "none" }}>{children}</div>,
    document.body
  );
}

/* ───────────────────────── Smart Popover for donut (with branded icons) ───────────────────────── */
type BreakdownRow = { key: string; label: string; value: number; share?: number; icon?: React.ComponentType<{ size?: number }>; iconUrl?: string; sliceKey?: string };
type BreakdownTab = { key: string; label: string; icon: React.ComponentType<{ size?: number }>; rows: BreakdownRow[] };

function useHoverPopover() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const show = (x: number, y: number) => setPos({ x, y });
  const onEnter = () => setOpen(true);
  const onLeave = () => !pinned && setOpen(false);
  const togglePin = () => setPinned((s) => !s);
  const close = () => {
    setPinned(false);
    setOpen(false);
  };
  return { open, pinned, pos, show, onEnter, onLeave, togglePin, close };
}

function PortalPopover({ open, pos, children }: { open: boolean; pos: { x: number; y: number }; children: React.ReactNode }) {
  if (!open || typeof window === "undefined") return null;
  return createPortal(
    <div style={{ position: "fixed", left: pos.x + 10, top: pos.y + 10, zIndex: 9999 }}>
      <div className="w-[320px] rounded-md border bg-white shadow" style={{ borderColor: TK.border, boxShadow: TK.shadow1, fontFamily: 'Inter, "Inter Fallback", ui-sans-serif' }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

function SmartBreakdown({
  title,
  tabs,
  activeKey,
  onChangeTab,
  onClose,
}: {
  title: string;
  tabs?: BreakdownTab[];
  activeKey?: string;
  onChangeTab?: (k: string) => void;
  onClose?: () => void;
}) {
  const active = tabs?.find((t) => t.key === activeKey) ?? tabs?.[0];
  const TabIcon = active?.icon ?? FileText;

  return (
    <>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center" style={{ color: TK.brand }}>
            <TabIcon size={14} />
          </span>
          <div className="text-xs font-medium" style={{ color: TK.text }}>
            {title} — Breakdown
          </div>
        </div>
        {tabs && tabs.length > 1 ? (
          <div className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs" style={{ borderColor: TK.border }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`rounded-full px-2.5 py-1 ${active?.key === t.key ? "bg-[color:var(--bg-app,#F5F7FA)] font-semibold" : "text-[color:var(--text-muted,#6B7280)]"}`}
                style={{ cursor: "pointer" }}
                onClick={() => onChangeTab?.(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="max-h-[300px] overflow-auto py-1">
        {active?.rows.map((r) => {
          const Icon = r.icon ?? TabIcon;
          const color = r.sliceKey ? segColor(r.sliceKey) : TK.metricBlue;
          return (
            <div key={r.key} className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-gray-50" style={{ cursor: "pointer" }}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                {r.iconUrl ? <img src={r.iconUrl} alt="" className="h-3.5 w-3.5 rounded-sm" /> : null}
                <Icon size={14} style={{ color: TK.brand }} />
                <span className="text-xs" style={{ color: TK.text }}>
                  {r.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {typeof r.share === "number" ? <span style={{ color: TK.textMuted }}>{(r.share * 100).toFixed(1)}%</span> : null}
                <span className="font-semibold" style={{ color: TK.textStrong }}>
                  {nf.format(r.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t px-3 py-2 text-right" style={{ borderColor: TK.border }}>
        <button className="text-xs underline" onClick={onClose} style={{ cursor: "pointer" }}>
          Close
        </button>
      </div>
    </>
  );
}

/* ───────────────────────── Donut (stacked) with smart breakdown popover ───────────────────────── */
type DonutSeg = { key: string; label: string; value: number; color: string };

function DonutStackedSmart({
  title,
  segments,
  tabs,
  onSegmentClick,
}: {
  title: string;
  segments: DonutSeg[];
  tabs?: BreakdownTab[];
  onSegmentClick?: (key: string) => void;
}) {
  const { open, pinned, pos, show, onEnter, onLeave, togglePin, close } = useHoverPopover();
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined);
  const [tabKey, setTabKey] = useState<string | undefined>(tabs?.[0]?.key);

  const data = useMemo(
    () =>
      segments.map((s) => ({
        name: s.label,
        v: Math.max(0, s.value),
        color: s.color,
        key: s.key,
      })),
    [segments]
  );

  const renderActiveSlice = (props: any) => {
    const RAD = Math.PI / 180;
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, midAngle } = props;
    const offset = 4;
    const dx = Math.cos(-midAngle * RAD) * offset;
    const dy = Math.sin(-midAngle * RAD) * offset;
    return (
      <Sector
        cx={cx + dx}
        cy={cy + dy}
        innerRadius={innerRadius + 2}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="none"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}
      />
    );
  };

  return (
    <div
      className="h-[56px] w-[56px] shrink-0"
      role="img"
      aria-label={`${title} snapshot`}
      onMouseEnter={(e) => {
        onEnter();
        show(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => show(e.clientX, e.clientY)}
      onMouseLeave={onLeave}
      onClick={(e) => {
        e.stopPropagation();
        togglePin();
      }}
      style={{ cursor: "pointer" }}
    >
      <PieChart width={56} height={56}>
        <Pie
          data={data}
          dataKey="v"
          innerRadius={18}
          outerRadius={28}
          startAngle={90}
          endAngle={-270}
          isAnimationActive
          activeIndex={activeIdx}
          activeShape={renderActiveSlice}
          onMouseEnter={(_, idx) => setActiveIdx(idx)}
          onMouseLeave={() => setActiveIdx(undefined)}
          onClick={(_, idx) => {
            const k = segments[idx]?.key;
            if (k) onSegmentClick?.(k);
          }}
          stroke="none"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} stroke="none" />
          ))}
        </Pie>
      </PieChart>

      <PortalPopover open={open || pinned} pos={pos}>
        <SmartBreakdown title={title} tabs={tabs} activeKey={tabKey} onChangeTab={(k) => setTabKey(k)} onClose={close} />
      </PortalPopover>
    </div>
  );
}

/* ───────────────────────── Trend mini (area / stacked bars / stacked area) ───────────────────────── */
type TrendMode = "area" | "stacked-bar" | "stacked-area";

function TrendMini({
  mode,
  title,
  dataArea,
  dataStacked,
  keys = [],
  meanLine = false,
}: {
  mode: TrendMode;
  title: string;
  dataArea?: { date: string; v: number }[];
  dataStacked?: { date: string; series: Record<string, number> }[];
  keys?: string[];
  meanLine?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // AREA
  if (mode === "area") {
    const data = dataArea ?? [];
    const mean = data.length ? data.reduce((s, d) => s + (d.v ?? 0), 0) / data.length : 0;

    return (
      <div ref={containerRef} className="h-16 w-[9.5rem] sm:w-[10.5rem] md:w-[11rem]" role="img" aria-label={`${title} trend`} style={{ cursor: "pointer" }}>
        <ResponsiveContainer>
          <RAreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <RTooltip
              cursor={{ stroke: TK.metricBlue, strokeOpacity: 0.18, strokeWidth: 1 }}
              wrapperStyle={{ visibility: "hidden" }}
              content={(props: any) => (
                <PortalizedTooltip active={props.active} coordinate={props.coordinate} containerRef={containerRef}>
                  <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TK.border, color: TK.text }}>
                    <div className="mb-1 font-medium" style={{ color: TK.textMuted }}>
                      {new Date(props?.label ?? "").toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: TK.textMuted }}>Value</span>
                      <span className="font-semibold">{nf.format(Number(props?.payload?.[0]?.value) || 0)}</span>
                    </div>
                  </div>
                </PortalizedTooltip>
              )}
            />
            {meanLine && <ReferenceLine y={mean} stroke={TK.textMuted} strokeDasharray="3 3" />}
            <Area type="monotone" dataKey="v" stroke={TK.metricBlue} fill={TK.metricBluePastel} strokeWidth={2} dot={false} isAnimationActive />
          </RAreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // STACKED BARS / STACKED AREA share the same data shape
  const data = (dataStacked ?? []).map((d) => ({ date: d.date, ...(d.series || {}) }));

  return (
    <div ref={containerRef} className="h-16 w-[9.5rem] sm:w-[10.5rem] md:w-[11rem]" role="img" aria-label={`${title} trend`} style={{ cursor: "pointer" }}>
      <ResponsiveContainer>
        {mode === "stacked-bar" ? (
          <RBarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <RTooltip
              wrapperStyle={{ visibility: "hidden" }}
              content={(props: any) => {
                const items = props?.payload ?? [];
                const total = items.reduce((s: number, it: any) => s + (Number(it.value) || 0), 0);
                return (
                  <PortalizedTooltip active={props.active} coordinate={props.coordinate} containerRef={containerRef}>
                    <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TK.border, color: TK.text }}>
                      <div className="mb-1 font-medium" style={{ color: TK.textMuted }}>
                        {new Date(props?.label ?? "").toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: TK.textMuted }}>Total</span>
                        <span className="font-semibold">{nf.format(total)}</span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {items.map((p: any, i: number) => {
                          const NameIcon = SERIES_ICON[p?.name] ?? FileText;
                          return (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2">
                                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.fill as string }} />
                                <NameIcon size={12} style={{ color: TK.brand }} />
                                <span style={{ color: TK.textMuted }}>{p.name}</span>
                              </span>
                              <span className="font-semibold">{nf.format(Number(p.value) || 0)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </PortalizedTooltip>
                );
              }}
            />
            {keys.map((k) => (
              <Bar key={k} dataKey={k} stackId="a" name={k} fill={segColor(k)} />
            ))}
          </RBarChart>
        ) : (
          <RAreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <RTooltip
              wrapperStyle={{ visibility: "hidden" }}
              content={(props: any) => {
                const items = props?.payload ?? [];
                const total = items.reduce((s: number, it: any) => s + (Number(it.value) || 0), 0);
                return (
                  <PortalizedTooltip active={props.active} coordinate={props.coordinate} containerRef={containerRef}>
                    <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TK.border, color: TK.text }}>
                      <div className="mb-1 font-medium" style={{ color: TK.textMuted }}>
                        {new Date(props?.label ?? "").toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: TK.textMuted }}>Total</span>
                        <span className="font-semibold">{nf.format(total)}</span>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {items.map((p: any, i: number) => {
                          const NameIcon = SERIES_ICON[p?.name] ?? FileText;
                          return (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2">
                                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color as string }} />
                                <NameIcon size={12} style={{ color: TK.brand }} />
                                <span style={{ color: TK.textMuted }}>{p.name}</span>
                              </span>
                              <span className="font-semibold">{nf.format(Number(p.value) || 0)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </PortalizedTooltip>
                );
              }}
            />
            {keys.map((k) => (
              <Area key={k} type="monotone" dataKey={k} stackId="a" name={k} stroke={segColor(k)} fill={segColor(k)} fillOpacity={k === "green" ? 0.45 : 0.55} dot={false} />
            ))}
          </RAreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* ───────────────────────── Card atoms ───────────────────────── */
function ValueAndDelta({
  value,
  label,
  delta,
  unit = "%",
  invert = false,
}: {
  value: string;
  label?: string;
  delta?: number | null;
  unit?: "%" | "pp" | "";
  invert?: boolean;
}) {
  const good = typeof delta === "number" ? (invert ? delta < 0 : delta > 0) : undefined;
  const tone = typeof delta === "number" ? (good ? TK.success : TK.critical) : TK.textMuted;

  return (
    <div className="min-w-[92px]" style={{ cursor: "pointer", fontFamily: 'Inter, "Inter Fallback", ui-sans-serif' }}>
      <output className="block text-[28px] font-bold leading-7" style={{ color: TK.metricBlue }}>
        {value}
      </output>
      <div className="mt-0.5 text-xs tabular-nums" style={{ color: tone }}>
        {typeof delta === "number" ? (
          <>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta).toFixed(1)}
            {unit && <span>&nbsp;{unit}</span>}
          </>
        ) : (
          "—"
        )}
        {label ? (
          <span className="ml-1 text-[11px]" style={{ color: TK.textMuted }}>
            ({label})
          </span>
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  icon,
  donut,
  metric,
  trend,
}: {
  title: string;
  icon: React.ReactNode;
  donut: React.ReactNode;
  metric: React.ReactNode;
  trend: React.ReactNode;
}) {
  return (
    <div
      className="group flex w-full flex-col rounded-[6px] border p-4 text-left shadow-sm transition-transform hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2"
      style={{ borderColor: TK.border, background: TK.bgPanel, boxShadow: TK.shadow1, outlineColor: TK.focus, fontFamily: 'Inter, "Inter Fallback", ui-sans-serif' }}
      tabIndex={0}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color: TK.brand }}>
          {icon}
        </span>
        <div className="text-[13px] font-semibold" style={{ color: TK.textStrong }}>
          {title}
        </div>
      </div>

      {/* Left: donut · Center: value+delta · Right: trend */}
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">{donut}</div>
        {metric}
        {trend}
      </div>
    </div>
  );
}

/* ───────────────────────── Section component (drop‑in replacement) ───────────────────────── */
export default function HomeKpiRow({
  data,
  loading,
  error,
  onStartDrafts,
  onOpenPipeline,
  onOpenLowScore,
  onOpenReadabilityFixes,
  onGenerateAeo,
  onOpenDuplicity,
  onOpenApprovals,
  onViewOverdue,
  onSegmentFilter,
  timeWindowLabel = "This period",
  demoFallback = true,
}: HomeKpiRowProps) {
  /* ------- Demo fallback to keep the section self‑contained ------- */
  const today = new Date();
  const days = 20;
  const demoTrendDates = Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getTime() - (days - 1 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });

  const demoData: Required<HomeKpiData> = {
    velocity: {
      agg: { draft: 38, review: 21, approved: 14, published: 33 },
      trend: demoTrendDates.map((date, i) => ({
        date,
        drafts: 2 + ((i * 7) % 5),
        review: 1 + ((i * 5) % 4),
        approved: 1 + (i % 3),
        published: 2 + ((i * 3) % 6),
      })),
    },
    score: {
      agg: { avg: 74.3, buckets: { green: 22, yellow: 41, red: 9 }, n: 72 },
      trend: demoTrendDates.map((date, i) => ({ date, avg: 70 + (i % 8) })),
    },
    readability: {
      agg: { median_fk: 9.7, buckets: { ok: 36, plus12: 20, plus3: 16 } },
      trend: demoTrendDates.map((date, i) => ({ date, median_fk: 9 + ((i % 6) - 2) * 0.3 })),
    },
    aeo: {
      agg: { green_pct: 58, buckets: { green: 58, yellow: 24, red: 18 } },
      trend: demoTrendDates.map((date, i) => ({
        date,
        green: clamp(46 + (i % 14), 30, 80),
        yellow: clamp(30 - (i % 10), 10, 50),
        red: clamp(24 - (i % 6), 5, 40),
      })),
    },
    dup: {
      agg: { pairs: { high: 7, medium: 19, low: 62 } },
      trend: demoTrendDates.map((date, i) => ({ date, high: (i % 5) + (i % 3), total: (i % 10) + 10 })),
    },
    ontime: {
      agg: { pct: 82, late: 9, due_soon: 13, on_time: 78 },
      trend: demoTrendDates.map((date, i) => ({ date, pct: clamp(78 + (i % 7) - 3, 60, 95) })),
    },
  };

  const D = useMemo<Required<HomeKpiData>>(
    () =>
      (data &&
      data.velocity &&
      data.score &&
      data.readability &&
      data.aeo &&
      data.dup &&
      data.ontime
        ? (data as Required<HomeKpiData>)
        : demoFallback
        ? demoData
        : demoData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(data)]
  );

  /* ------- Smart breakdown tabs (logical defaults; replace with real rows from API if available) ------- */
  const mkShare = (rows: BreakdownRow[]) => {
    const total = rows.reduce((s, r) => s + r.value, 0) || 1;
    return rows.map((r) => ({ ...r, share: r.value / total }));
  };

  const velocityTabs: BreakdownTab[] = [
    {
      key: "stage",
      label: "By Stage",
      icon: FolderKanban,
      rows: mkShare([
        { key: "published", label: "Published", value: D.velocity.agg.published, icon: CheckCircle2, sliceKey: "published" },
        { key: "approved", label: "Approved", value: D.velocity.agg.approved, icon: FileBadge2, sliceKey: "approved" },
        { key: "review", label: "In Review", value: D.velocity.agg.review, icon: HelpCircle, sliceKey: "review" },
        { key: "drafts", label: "Drafts", value: D.velocity.agg.draft, icon: FolderKanban, sliceKey: "drafts" },
      ]),
    },
    {
      key: "type",
      label: "By Content Type",
      icon: FileText,
      rows: mkShare([
        { key: "blog", label: "Blog", value: Math.round((D.velocity.agg.published + D.velocity.agg.approved) * 0.45), icon: FileText },
        { key: "landing", label: "Landing", value: Math.round((D.velocity.agg.review + D.velocity.agg.draft) * 0.30), icon: Layout },
        { key: "docs", label: "Docs", value: Math.round((D.velocity.agg.review + D.velocity.agg.draft) * 0.25), icon: FileText },
      ]),
    },
    {
      key: "project",
      label: "By Project",
      icon: Building2,
      rows: mkShare([
        { key: "p1", label: "Wranker", value: Math.round((D.velocity.agg.published + 2) * 0.9) },
        { key: "p2", label: "W3era", value: Math.round((D.velocity.agg.approved + 1) * 0.8) },
        { key: "p3", label: "Vefogix", value: Math.round((D.velocity.agg.review + 1) * 0.7) },
      ]),
    },
  ];

  const scoreTabs: BreakdownTab[] = [
    {
      key: "type",
      label: "By Content Type",
      icon: FileText,
      rows: [
        { key: "blog", label: "Blog", value: Math.round(D.score.agg.avg * 0.98), icon: FileText },
        { key: "landing", label: "Landing", value: Math.round(D.score.agg.avg * 0.95), icon: Layout },
        { key: "faqs", label: "FAQs", value: Math.round(D.score.agg.avg * 0.92), icon: MessageSquare },
      ],
    },
    {
      key: "project",
      label: "By Project",
      icon: Building2,
      rows: [
        { key: "p1", label: "Wranker", value: Math.round(D.score.agg.avg + 3) },
        { key: "p2", label: "W3era", value: Math.round(D.score.agg.avg - 1) },
        { key: "p3", label: "Vefogix", value: Math.round(D.score.agg.avg - 2) },
      ],
    },
  ];

  const readTabs: BreakdownTab[] = [
    {
      key: "type",
      label: "By Content Type",
      icon: FileText,
      rows: [
        { key: "blog", label: "Blog", value: +(D.readability.agg.median_fk - 0.3).toFixed(1), icon: FileText },
        { key: "landing", label: "Landing", value: +(D.readability.agg.median_fk + 0.4).toFixed(1), icon: Layout },
        { key: "docs", label: "Docs", value: +(D.readability.agg.median_fk + 0.9).toFixed(1), icon: FileText },
      ] as any,
    },
  ];

  const aeoTabs: BreakdownTab[] = [
    {
      key: "component",
      label: "By Component",
      icon: AlignJustify,
      rows: mkShare([
        { key: "tldr", label: "TL;DR", value: Math.round(D.aeo.agg.buckets.green * 0.35), icon: AlignJustify },
        { key: "faqs", label: "FAQs", value: Math.round(D.aeo.agg.buckets.green * 0.33), icon: HelpCircle },
        { key: "schema", label: "Schema", value: Math.round(D.aeo.agg.buckets.green * 0.22), icon: Braces },
        { key: "speakable", label: "Speakable", value: Math.round(D.aeo.agg.buckets.green * 0.10), icon: Mic },
      ]),
    },
  ];

  const dupTabs: BreakdownTab[] = [
    {
      key: "severity",
      label: "By Severity",
      icon: Merge,
      rows: mkShare([
        { key: "high", label: "High", value: D.dup.agg.pairs.high, icon: Merge, sliceKey: "high" },
        { key: "medium", label: "Medium", value: D.dup.agg.pairs.medium, icon: Merge, sliceKey: "medium" },
        { key: "low", label: "Low", value: D.dup.agg.pairs.low, icon: Merge, sliceKey: "low" },
      ]),
    },
  ];

  const ontimeTabs: BreakdownTab[] = [
    {
      key: "stage",
      label: "By Stage",
      icon: CheckCircle2,
      rows: mkShare([
        { key: "on_time", label: "On‑time", value: D.ontime.agg.on_time, icon: CheckCircle2, sliceKey: "on_time" },
        { key: "late", label: "Late", value: D.ontime.agg.late, icon: Clock, sliceKey: "late" },
        { key: "due_soon", label: "Due soon", value: D.ontime.agg.due_soon, icon: Clock, sliceKey: "due_soon" },
      ]),
    },
    {
      key: "assignee",
      label: "By Assignee",
      icon: Users,
      rows: [
        { key: "u1", label: "A. Khan", value: Math.round(D.ontime.agg.on_time * 0.38), icon: Users },
        { key: "u2", label: "S. Patel", value: Math.round(D.ontime.agg.on_time * 0.34), icon: Users },
        { key: "u3", label: "J. Miller", value: Math.round(D.ontime.agg.on_time * 0.28), icon: Users },
      ],
    },
  ];

  /* ------- Snapshot builders ------- */
  const velocityTotal = D.velocity.agg.draft + D.velocity.agg.review + D.velocity.agg.approved + D.velocity.agg.published;
  const velocityDonut: DonutSeg[] = [
    { key: "published", label: "Published", value: D.velocity.agg.published, color: segColor("published") },
    { key: "approved", label: "Approved", value: D.velocity.agg.approved, color: segColor("approved") },
    { key: "review", label: "In Review", value: D.velocity.agg.review, color: segColor("review") },
    { key: "drafts", label: "Drafts", value: D.velocity.agg.draft, color: segColor("drafts") },
  ];

  const scoreDonut: DonutSeg[] = [
    { key: "green", label: "Green", value: D.score.agg.buckets.green, color: segColor("green") },
    { key: "yellow", label: "Yellow", value: D.score.agg.buckets.yellow, color: segColor("yellow") },
    { key: "red", label: "Red", value: D.score.agg.buckets.red, color: segColor("red") },
  ];

  const readabilityDonut: DonutSeg[] = [
    { key: "ok", label: "At/Below", value: D.readability.agg.buckets.ok, color: segColor("ok") },
    { key: "plus12", label: "+1–2", value: D.readability.agg.buckets.plus12, color: segColor("plus12") },
    { key: "plus3", label: "≥+3", value: D.readability.agg.buckets.plus3, color: segColor("plus3") },
  ];

  const aeoDonut: DonutSeg[] = [
    { key: "green", label: "Green", value: D.aeo.agg.buckets.green, color: segColor("green") },
    { key: "yellow", label: "Yellow", value: D.aeo.agg.buckets.yellow, color: segColor("yellow") },
    { key: "red", label: "Red", value: D.aeo.agg.buckets.red, color: segColor("red") },
  ];

  const dupDonut: DonutSeg[] = [
    { key: "high", label: "High", value: D.dup.agg.pairs.high, color: segColor("high") },
    { key: "medium", label: "Medium", value: D.dup.agg.pairs.medium, color: segColor("medium") },
    { key: "low", label: "Low", value: D.dup.agg.pairs.low, color: segColor("low") },
  ];

  const ontimeDonut: DonutSeg[] = [
    { key: "on_time", label: "On‑time", value: D.ontime.agg.on_time, color: segColor("on_time") },
    { key: "late", label: "Late", value: D.ontime.agg.late, color: segColor("late") },
    { key: "due_soon", label: "Due soon", value: D.ontime.agg.due_soon, color: segColor("due_soon") },
  ];

  /* ------- Trend builders ------- */
  const velocityStacked = D.velocity.trend.map((p) => ({
    date: p.date,
    series: {
      published: p.published ?? 0,
      approved: p.approved ?? 0,
      review: p.review ?? 0,
      drafts: p.drafts ?? 0,
    },
  }));

  const scoreArea = D.score.trend.map((p) => ({ date: p.date, v: p.avg }));
  const readabilityArea = D.readability.trend.map((p) => ({ date: p.date, v: p.median_fk }));
  const aeoStackedArea = D.aeo.trend.map((p) => ({ date: p.date, series: { green: p.green ?? 0, yellow: p.yellow ?? 0, red: p.red ?? 0 } }));
  const dupBars = D.dup.trend.map((p) => ({ date: p.date, series: { high: p.high } }));
  const ontimeArea = D.ontime.trend.map((p) => ({ date: p.date, v: p.pct }));

  /* ------- Error/Loading ------- */
  if (error) {
    return (
      <div className="rounded-md border p-3 text-sm" style={{ borderColor: TK.border, background: TK.criticalBg, color: TK.critical, fontFamily: 'Inter, "Inter Fallback", ui-sans-serif' }}>
        Failed to load KPI summary.
      </div>
    );
  }
  if (loading) {
    return (
      <section style={{ fontFamily: 'Inter, "Inter Fallback", ui-sans-serif' }}>
        <div className="mb-3 flex items-center gap-2">
          <Workflow size={18} style={{ color: TK.brand }} />
          <h3 className="text-[18px] font-semibold" style={{ color: TK.textStrong }}>
            Content KPI Summary
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-md border" style={{ borderColor: TK.border, background: TK.borderSubtle }} />
          ))}
        </div>
      </section>
    );
  }

  /* ------- Render ------- */
  return (
    <section style={{ fontFamily: 'Inter, "Inter Fallback", ui-sans-serif' }} className="w-full">
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <Workflow size={18} style={{ color: TK.brand }} />
        <h3 className="text-[18px] font-semibold" style={{ color: TK.textStrong }}>
          Content KPI Summary
        </h3>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 1 — Publishing Velocity */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <KpiCard
            title="Publishing Velocity"
            icon={<Workflow size={18} />}
            donut={
              <DonutStackedSmart
                title="Publishing Velocity"
                segments={velocityDonut}
                tabs={velocityTabs}
                onSegmentClick={(k) => onSegmentFilter?.("velocity", k)}
              />
            }
            metric={<ValueAndDelta value={nf.format(velocityTotal)} label={timeWindowLabel} delta={+6.2} />}
            trend={<TrendMini mode="stacked-bar" title="Publishing Velocity" dataStacked={velocityStacked} keys={["published", "approved", "review", "drafts"]} />}
          />
        </div>

        {/* 2 — Content Score */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <KpiCard
            title="Content Score"
            icon={<Gauge size={18} />}
            donut={<DonutStackedSmart title="Content Score" segments={scoreDonut} tabs={scoreTabs} onSegmentClick={(k) => onSegmentFilter?.("score", k)} />}
            metric={<ValueAndDelta value={D.score.agg.avg.toFixed(1)} label={`avg of ${D.score.agg.n} docs`} delta={+3.1} unit="" />}
            trend={<TrendMini mode="area" title="Content Score" dataArea={scoreArea} meanLine />}
          />
        </div>

        {/* 3 — Readability Grade (lower is better) */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <KpiCard
            title="Readability (FK Grade)"
            icon={<FileText size={18} />}
            donut={<DonutStackedSmart title="Readability" segments={readabilityDonut} tabs={readTabs} onSegmentClick={(k) => onSegmentFilter?.("readability", k)} />}
            metric={<ValueAndDelta value={D.readability.agg.median_fk.toFixed(1)} label="lower is better" delta={-1.2} unit="" invert />}
            trend={<TrendMini mode="area" title="Readability" dataArea={readabilityArea} meanLine />}
          />
        </div>

        {/* 4 — AEO Readiness */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <KpiCard
            title="AEO Readiness"
            icon={<Sparkles size={18} />}
            donut={<DonutStackedSmart title="AEO Readiness" segments={aeoDonut} tabs={aeoTabs} onSegmentClick={(k) => onSegmentFilter?.("aeo", k)} />}
            metric={<ValueAndDelta value={pf100(D.aeo.agg.green_pct)} delta={+2.7} unit="pp" />}
            trend={<TrendMini mode="stacked-area" title="AEO Readiness" dataStacked={aeoStackedArea.map(({ date, series }) => ({ date, series }))} keys={["green", "yellow", "red"]} />}
          />
        </div>

        {/* 5 — Duplication Risk */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <KpiCard
            title="Duplication Risk"
            icon={<Merge size={18} />}
            donut={<DonutStackedSmart title="Duplication Risk" segments={dupDonut} tabs={dupTabs} onSegmentClick={(k) => onSegmentFilter?.("dup", k)} />}
            metric={<ValueAndDelta value={nf.format(D.dup.agg.pairs.high + D.dup.agg.pairs.medium + D.dup.agg.pairs.low)} label="pairs flagged" delta={-4.0} unit="" invert />}
            trend={<TrendMini mode="stacked-bar" title="Duplication Risk" dataStacked={dupBars} keys={["high"]} />}
          />
        </div>

        {/* 6 — On‑time Rate */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <KpiCard
            title="On‑time Rate"
            icon={<CalendarCheck2 size={18} />}
            donut={<DonutStackedSmart title="On‑time Rate" segments={ontimeDonut} tabs={ontimeTabs} onSegmentClick={(k) => onSegmentFilter?.("ontime", k)} />}
            metric={<ValueAndDelta value={pf100(D.ontime.agg.pct)} label="on‑time" delta={+1.9} unit="pp" />}
            trend={<TrendMini mode="area" title="On‑time %" dataArea={ontimeArea} meanLine />}
          />
        </div>
      </div>
    </section>
  );
}