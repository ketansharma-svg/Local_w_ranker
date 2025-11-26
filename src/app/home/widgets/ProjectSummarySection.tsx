"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Info as InfoIcon, ChevronDown, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";

/* =============================================================================
   TOKENS
============================================================================= */
const TOKENS = {
  surface: "var(--wr-surface, #FFFFFF)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #EFF0F6)",

  valueBlue: "var(--wr-value-blue, #0077FF)",
  pastelBlue: "var(--wr-pastel-blue, #D9EEF8)",

  success: "var(--wr-success, #10B981)",
  successPastel: "rgba(16,185,129,0.15)",

  warning: "var(--wr-warning, #F59E0B)",
  warningPastel: "rgba(245,158,11,0.15)",

  danger: "var(--wr-danger, #EF4444)",
  dangerPastel: "rgba(239,68,68,0.15)",

  info: "var(--wr-info, #3B82F6)",
  infoPastel: "rgba(59,130,246,0.15)",
} as const;

/* =============================================================================
   HELPERS / FORMATTERS
============================================================================= */
const intFmt = new Intl.NumberFormat();
function fmtInt(n?: number | null, compact = true) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 10000) {
    const units = [
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "K" },
    ];
    for (const u of units) if (Math.abs(n) >= u.v) return `${(n / u.v).toFixed(1)}${u.s}`;
  }
  return intFmt.format(n);
}
function fmtPct01(p?: number | null, digits = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(digits)}%`;
}
function fmtPct100(p?: number | null, digits = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${(p ?? 0).toFixed(digits)}%`;
}
function caret(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v) || v === 0) return "—";
  return v > 0 ? "▲" : "▼";
}
function toneByGoodBad(valueDelta?: number, invert = false) {
  if (typeof valueDelta !== "number") return TOKENS.muted;
  const isGood = invert ? valueDelta < 0 : valueDelta > 0;
  return isGood ? TOKENS.success : TOKENS.danger;
}
function toDateLabel(d: string | number | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function sum(values: Record<string, number> = {}) {
  return Object.values(values).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
}

/* =============================================================================
   COLOR PALETTE FOR PROJECTS
============================================================================= */
const PALETTE = [
  "#005AD6",
  "#0077FF",
  "#00A1FF",
  "#17BECF",
  "#2CA02C",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#10B981",
];

/* =============================================================================
   TYPES
============================================================================= */
export type SeriesPoint = { t: string; v: number };
export type TrendSeries = SeriesPoint[];

export type ProjectMeta = {
  id: string;
  name: string;
  /** favicon or brand mark */
  iconUrl?: string;
  /** optional custom color; falls back to palette by index */
  color?: string;
};

/** Score card (0–100 style) with per-project snapshot + per-project series */
type ScoreCard = {
  portfolio: { value: number; delta?: number; series?: TrendSeries };
  byProject: Record<
    string,
    {
      value: number;
      series?: TrendSeries;
    }
  >;
};

/** Generic metric (counts) with per-project snapshot + series */
type MetricCard = {
  portfolio: { value: number; delta?: number; series?: TrendSeries };
  byProject: Record<string, number>;
  seriesByProject?: Record<string, TrendSeries>;
};

type TriMetricData = {
  clicks: MetricCard;
  sessions: MetricCard;
  conversions: MetricCard;
};

type KeywordDistributionData = {
  top3: MetricCard;
  top10: MetricCard;
  top100: MetricCard;
};

type CriticalIssuesData = MetricCard;

export type PortfolioSummaryData = {
  projects: ProjectMeta[];

  // Row A
  seoScore: ScoreCard;
  siteHealth: ScoreCard;
  wrScore: ScoreCard;

  // Row B
  triMetric: TriMetricData;

  // Row C
  keywords: KeywordDistributionData;

  // Row D
  criticalIssues: CriticalIssuesData;
};

export interface ProjectSummarySectionProps {
  data: PortfolioSummaryData;

  onOpenDrawer?: (kpi: "seo_score" | "site_health" | "wr_score" | "traffic" | "keyword_distribution" | "critical_issues") => void;
  onAddToReport?: () => void;
  onCreateTask?: (kpi: string) => void;
  onExport?: (fmt: "PNG" | "CSV" | "PDF") => void;
  canExportPdf?: boolean;

  className?: string;
  loading?: boolean;
}

/* =============================================================================
   STATE HELPERS
============================================================================= */
function useStickyTab<T extends string>(key: string, initial: T) {
  const [val, setVal] = useState<T>(initial);
  useEffect(() => {
    const v = window.localStorage.getItem(key);
    if (v) setVal(v as T);
  }, [key]);
  const change = (v: T) => {
    setVal(v);
    window.localStorage.setItem(key, String(v));
  };
  return [val, change] as const;
}

/* =============================================================================
   COMMON UI — ValueDelta, Tabs, Menus, Card Shell
============================================================================= */
function ValueDelta({
  delta,
  invert = false,
  unit = "%",
  ariaId,
  explain,
}: {
  delta?: number;
  invert?: boolean;
  unit?: "%" | "pp" | "";
  ariaId?: string;
  explain?: string;
}) {
  if (typeof delta !== "number") {
    return (
      <div id={ariaId} className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
        —
      </div>
    );
  }
  const color = toneByGoodBad(delta, invert);
  return (
    <div id={ariaId} className="mt-1 text-xs" style={{ color }}>
      {caret(delta)} {Math.abs(delta).toFixed(1)}
      {unit && <span>&nbsp;{unit}</span>}
      {explain && (
        <span className="ml-1 text-[11px]" style={{ color: TOKENS.muted }}>
          ({explain})
        </span>
      )}
    </div>
  );
}

function SegTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs" style={{ borderColor: TOKENS.border }}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={(e) => {
            e.stopPropagation();
            onChange(it.value);
          }}
          className={`rounded-full px-2.5 py-1 transition ${
            value === it.value ? "bg-[#F5F7FA] font-semibold" : "text-[color:var(--wr-muted,#6B7280)]"
          }`}
          aria-pressed={value === it.value}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function KebabMenu({
  onAddToReport,
  onCreateTask,
}: {
  onAddToReport?: () => void;
  onCreateTask?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 rounded-md border bg-white py-1 text-sm shadow"
          style={{ borderColor: TOKENS.border }}
          onMouseLeave={() => setOpen(false)}
        >
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => onAddToReport?.()}>
            Add to Report
          </button>
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => onCreateTask?.()}>
            Create Task
          </button>
        </div>
      )}
    </div>
  );
}

function TitleWithHoverInfo({ title, info }: { title: string; info?: string }) {
  return (
    <div className="relative flex min-w-0 items-center gap-2 group/title">
      <div className="truncate text-[13px] font-semibold">{title}</div>
      {info ? <InfoIcon size={15} className="text-[#9CA3AF]" /> : null}
      {info ? (
        <div
          role="tooltip"
          className="invisible group-hover/title:visible absolute left-0 top-5 z-50 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}

function CardShell({
  title,
  info,
  headerRight,
  onClick,
  children,
  state = "default",
}: {
  title: string;
  info?: string;
  headerRight?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  state?: "default" | "loading" | "empty" | "disconnected";
}) {
  const isLoading = state === "loading";
  const isEmpty = state === "empty";
  const isDisconnected = state === "disconnected";

  return (
    <button
      type="button"
      className="group flex w-full flex-col rounded-[6px] border p-4 text-left shadow-sm transition-transform hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wr-value-blue,#0077FF)]/50"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <TitleWithHoverInfo title={title} info={info} />
        <div className="flex items-center gap-2">
          {headerRight}
          <KebabMenu />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 h-24 animate-pulse rounded-md bg-[color:var(--wr-border,#EFF0F6)]" />
      ) : isDisconnected ? (
        <div className="mt-3 flex h-24 items-center justify-between rounded-md bg-[#F5F7FA] px-3">
          <div className="text-sm" style={{ color: TOKENS.muted }}>
            Source disconnected. Connect to view this KPI.
          </div>
        </div>
      ) : isEmpty ? (
        <div className="mt-3 flex h-24 items-center justify-center rounded-md bg-[#F5F7FA] text-sm" style={{ color: TOKENS.muted }}>
          No data for the selected filters.
        </div>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </button>
  );
}

/* =============================================================================
   SMART POPOVERS (TOOLTIPS) — with colored dots & project favicons
   (PORTALED so they float above all cards)
============================================================================= */
type BreakdownItem = { name: string; value: number; color: string; iconUrl?: string; share?: number };

function TooltipShell({
  active,
  title,
  children,
}: {
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}
    >
      {title && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/** Donut breakdown tooltip (all projects listed) */
function DonutBreakdownTooltip({
  active,
  title,
  items,
  valueFmt,
  showShare = false,
}: {
  active?: boolean;
  title?: string;
  items: BreakdownItem[];
  valueFmt?: (v: number) => string;
  showShare?: boolean;
}) {
  return (
    <TooltipShell active={active} title={title}>
      <div className="flex max-h-64 flex-col gap-1 overflow-auto pr-1">
        {items.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              {p.iconUrl ? <img src={p.iconUrl} alt="" className="h-3.5 w-3.5 rounded-sm" /> : null}
              <span style={{ color: TOKENS.muted }}>{p.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {showShare && Number.isFinite(p.share) ? (
                <span className="tabular-nums" style={{ color: TOKENS.muted }}>
                  {fmtPct01(p.share ?? 0)}
                </span>
              ) : null}
              <span className="font-semibold">{valueFmt ? valueFmt(p.value) : fmtInt(p.value, false)}</span>
            </div>
          </div>
        ))}
      </div>
    </TooltipShell>
  );
}

/** Trend tooltip factory — reads per-project values from the datum */
function makeTrendTooltip({
  title,
  projects,
  valueFmt,
  showShare = false,
}: {
  title: string;
  projects: (ProjectMeta & { color: string })[];
  valueFmt?: (v: number) => string;
  showShare?: boolean;
}) {
  return function TrendTooltip({ active, label, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload ?? {};
    const items: BreakdownItem[] = projects.map((p) => ({
      name: p.name,
      iconUrl: p.iconUrl,
      color: p.color,
      value: Number(d[`p_${p.id}`] ?? 0),
    }));
    const total = items.reduce((s, i) => s + i.value, 0);
    const withShare = items
      .map((i) => ({ ...i, share: total ? i.value / total : 0 }))
      .sort((a, b) => b.value - a.value);

    return (
      <TooltipShell active title={`${title} • ${toDateLabel(label as string)}`}>
        <div className="mb-1 flex items-center justify-between">
          <span style={{ color: TOKENS.muted }}>Total</span>
          <span className="font-semibold">{valueFmt ? valueFmt(total) : fmtInt(total, false)}</span>
        </div>
        <div className="flex max-h-64 flex-col gap-1 overflow-auto pr-1">
          {withShare.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                {p.iconUrl ? <img src={p.iconUrl} alt="" className="h-3.5 w-3.5 rounded-sm" /> : null}
                <span style={{ color: TOKENS.muted }}>{p.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {showShare ? (
                  <span className="tabular-nums" style={{ color: TOKENS.muted }}>
                    {fmtPct01(p.share ?? 0)}
                  </span>
                ) : null}
                <span className="font-semibold">{valueFmt ? valueFmt(p.value) : fmtInt(p.value, false)}</span>
              </div>
            </div>
          ))}
        </div>
      </TooltipShell>
    );
  };
}

/* =============================================================================
   PORTALIZED RECHARTS TOOLTIP (always on top)
============================================================================= */
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
    <div
      style={{
        position: "absolute",
        left,
        top,
        zIndex: 9999, // higher than any card/menu/etc.
        pointerEvents: "none",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

/* =============================================================================
   CHART ATOMS — Stacked Donut & Mini Trend
============================================================================= */
function ensureProjectColors(projects: ProjectMeta[]): (ProjectMeta & { color: string })[] {
  return projects.map((p, i) => ({
    ...p,
    color: p.color ?? PALETTE[i % PALETTE.length],
  }));
}

function DonutStacked({
  aria,
  title,
  items,
  size = 52,
  valueFmt,
  showShare = false,
}: {
  aria: string;
  title: string;
  items: BreakdownItem[];
  size?: number;
  valueFmt?: (v: number) => string;
  showShare?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipInner = <DonutBreakdownTooltip active title={title} items={items} valueFmt={valueFmt} showShare={showShare} />;

  return (
    <div ref={containerRef} className="h-[52px] w-[52px] shrink-0" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <PieChart>
          {/* Hide default wrapper; we portal the real UI to body */}
          <RTooltip
            content={(props: any) => (
              <PortalizedTooltip active={props.active} coordinate={props.coordinate} containerRef={containerRef} offset={8}>
                {tooltipInner}
              </PortalizedTooltip>
            )}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ visibility: "hidden" }}
            offset={8}
          />
          <Pie
            data={items.map((p) => ({ name: p.name, v: Math.max(0, p.value), color: p.color }))}
            dataKey="v"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
          >
            {items.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

type TrendDatum = { date: string; portfolio: number; [key: `p_${string}`]: number };

function buildTrendData(
  portfolio?: TrendSeries,
  perProject?: Record<string, TrendSeries | undefined>,
  projectIds: string[] = []
): TrendDatum[] {
  if (!portfolio?.length) return [];
  const indexByDate: Record<string, TrendDatum> = {};
  portfolio.forEach((pt) => {
    indexByDate[pt.t] = { date: pt.t, portfolio: pt.v } as TrendDatum;
  });
  projectIds.forEach((pid) => {
    const s = perProject?.[pid] ?? [];
    s?.forEach((pt) => {
      if (!indexByDate[pt.t]) indexByDate[pt.t] = { date: pt.t, portfolio: 0 } as TrendDatum;
      (indexByDate[pt.t] as any)[`p_${pid}`] = pt.v;
    });
  });
  return Object.values(indexByDate).sort((a, b) => a.date.localeCompare(b.date));
}

function TrendMini({
  aria,
  title,
  data,
  projects,
  valueFmt,
  showMean = false,
  showShare = false,
}: {
  aria: string;
  title: string;
  data: TrendDatum[];
  projects: (ProjectMeta & { color: string })[];
  valueFmt?: (v: number) => string;
  showMean?: boolean;
  showShare?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mean = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((s, d) => s + (d.portfolio ?? 0), 0) / data.length;
  }, [data]);

  const TrendTooltipComp = useMemo(
    () => makeTrendTooltip({ title, projects, valueFmt, showShare }),
    [title, projects, valueFmt, showShare]
  );

  return (
    <div ref={containerRef} className="h-16 w-[9.5rem] sm:w-[10.5rem] md:w-[11rem]" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={(props: any) => (
              <PortalizedTooltip active={props.active} coordinate={props.coordinate} containerRef={containerRef} offset={8}>
                {/* Pass through the props so the inner tooltip can read label/payload */}
                <TrendTooltipComp {...props} />
              </PortalizedTooltip>
            )}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ visibility: "hidden" }}
            offset={8}
            cursor={{ stroke: TOKENS.valueBlue, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          {showMean && <ReferenceLine y={mean} stroke={TOKENS.muted} strokeDasharray="3 3" />}
          <Area type="monotone" dataKey="portfolio" stroke={TOKENS.valueBlue} fill={TOKENS.pastelBlue} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =============================================================================
   MAIN SECTION
============================================================================= */
export function ProjectSummarySection({
  data,
  onOpenDrawer,
  onAddToReport,
  onCreateTask,
  onExport,
  canExportPdf = false,
  className,
  loading,
}: ProjectSummarySectionProps) {
  const P = ensureProjectColors(data.projects);

  // Toggles
  const [triTab, setTriTab] = useStickyTab<"clicks" | "sessions" | "conversions">("wr:ps:tri2", "clicks");
  const [kwTab, setKwTab] = useStickyTab<"top3" | "top10" | "top100">("wr:ps:kwbkt", "top10");

  /* ---------- Card-specific computed pieces ---------- */
  // Scores (stacked donut parts)
  const seoParts = useMemo<BreakdownItem[]>(
    () =>
      P.map((p) => ({
        name: p.name,
        iconUrl: p.iconUrl,
        color: p.color,
        value: data.seoScore.byProject[p.id]?.value ?? 0,
      })).sort((a, b) => b.value - a.value),
    [P, data.seoScore.byProject]
  );
  const healthParts = useMemo<BreakdownItem[]>(
    () =>
      P.map((p) => ({
        name: p.name,
        iconUrl: p.iconUrl,
        color: p.color,
        value: data.siteHealth.byProject[p.id]?.value ?? 0,
      })).sort((a, b) => b.value - a.value),
    [P, data.siteHealth.byProject]
  );
  const wrParts = useMemo<BreakdownItem[]>(
    () =>
      P.map((p) => ({
        name: p.name,
        iconUrl: p.iconUrl,
        color: p.color,
        value: data.wrScore.byProject[p.id]?.value ?? 0,
      })).sort((a, b) => b.value - a.value),
    [P, data.wrScore.byProject]
  );

  const seoTrend = useMemo(
    () =>
      buildTrendData(
        data.seoScore.portfolio.series,
        Object.fromEntries(P.map((p) => [p.id, data.seoScore.byProject[p.id]?.series])),
        P.map((p) => p.id)
      ),
    [P, data.seoScore]
  );
  const healthTrend = useMemo(
    () =>
      buildTrendData(
        data.siteHealth.portfolio.series,
        Object.fromEntries(P.map((p) => [p.id, data.siteHealth.byProject[p.id]?.series])),
        P.map((p) => p.id)
      ),
    [P, data.siteHealth]
  );
  const wrTrend = useMemo(
    () =>
      buildTrendData(
        data.wrScore.portfolio.series,
        Object.fromEntries(P.map((p) => [p.id, data.wrScore.byProject[p.id]?.series])),
        P.map((p) => p.id)
      ),
    [P, data.wrScore]
  );

  // Tri-metric (selected metric)
  const triCard = data.triMetric[triTab];
  const triParts = useMemo<BreakdownItem[]>(() => {
    const total = sum(triCard.byProject);
    return P.map((p) => {
      const v = triCard.byProject[p.id] ?? 0;
      return { name: p.name, iconUrl: p.iconUrl, color: p.color, value: v, share: total ? v / total : 0 };
    }).sort((a, b) => b.value - a.value);
  }, [P, triCard]);
  const triTrend = useMemo(
    () =>
      buildTrendData(
        triCard.portfolio.series,
        triCard.seriesByProject ?? {},
        P.map((p) => p.id)
      ),
    [P, triCard]
  );

  // Keyword distribution – selected bucket
  const kwData = data.keywords[kwTab];
  const kwParts = useMemo<BreakdownItem[]>(() => {
    const total = sum(kwData.byProject);
    return P.map((p) => {
      const v = kwData.byProject[p.id] ?? 0;
      return { name: p.name, iconUrl: p.iconUrl, color: p.color, value: v, share: total ? v / total : 0 };
    }).sort((a, b) => b.value - a.value);
  }, [P, kwData]);
  const kwTrend = useMemo(
    () =>
      buildTrendData(
        kwData.portfolio.series,
        kwData.seriesByProject ?? {},
        P.map((p) => p.id)
      ),
    [P, kwData]
  );

  // Critical issues
  const critParts = useMemo<BreakdownItem[]>(() => {
    const total = sum(data.criticalIssues.byProject);
    return P.map((p) => {
      const v = data.criticalIssues.byProject[p.id] ?? 0;
      return { name: p.name, iconUrl: p.iconUrl, color: p.color, value: v, share: total ? v / total : 0 };
    }).sort((a, b) => b.value - a.value);
  }, [P, data.criticalIssues]);
  const critTrend = useMemo(
    () =>
      buildTrendData(
        data.criticalIssues.portfolio.series,
        data.criticalIssues.seriesByProject ?? {},
        P.map((p) => p.id)
      ),
    [P, data.criticalIssues]
  );

  return (
    <section className="rounded-md border bg-white mt-2 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
          Project Summary
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddToReport}
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white"
            style={{ background: TOKENS.valueBlue }}
          >
            <Sparkles size={16} />
            Add to Report
          </button>
          <div className="relative">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
              style={{ borderColor: TOKENS.border }}
              onClick={() => onExport?.("PNG")}
            >
              Export
              <ChevronDown size={16} className="text-[#9CA3AF]" />
            </button>
            {/* Hook your export menu logic here if needed */}
          </div>
        </div>
      </div>

      <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

      {/* GRID */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* ---------------- Row A ---------------- */}
        {/* 1) SEO Score — stacked donut + trend (portfolio); tooltip shows per-project scores with favicons */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="SEO Score"
            info="Portfolio score (0–100). Donut shows project scores."
            onClick={() => onOpenDrawer?.("seo_score")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutStacked
                  aria="SEO score breakdown"
                  title="SEO Score — by project"
                  items={seoParts}
                  valueFmt={(v) => `${Math.round(v)} / 100`}
                />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="seo-delta">
                    {fmtInt(data.seoScore.portfolio.value, false)}
                  </output>
                  <ValueDelta delta={data.seoScore.portfolio.delta} ariaId="seo-delta" />
                </div>
              </div>
              <TrendMini
                aria="SEO score trend"
                title="SEO Score"
                data={seoTrend}
                projects={P}
                valueFmt={(v) => `${Math.round(v)}`}
                showMean
              />
            </div>
          </CardShell>
        </div>

        {/* 2) Site Health Score — stacked donut + trend (portfolio) */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Site Health Score"
            info="Composite of technical, performance, UX, schema, interlinking (0–100)."
            onClick={() => onOpenDrawer?.("site_health")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutStacked
                  aria="Site Health breakdown"
                  title="Site Health — by project"
                  items={healthParts}
                  valueFmt={(v) => `${Math.round(v)} / 100`}
                />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="health-delta">
                    {fmtInt(data.siteHealth.portfolio.value, false)}
                  </output>
                  <ValueDelta delta={data.siteHealth.portfolio.delta} ariaId="health-delta" />
                </div>
              </div>
              <TrendMini
                aria="Site Health trend"
                title="Site Health"
                data={healthTrend}
                projects={P}
                valueFmt={(v) => `${Math.round(v)}`}
                showMean
              />
            </div>
          </CardShell>
        </div>

        {/* 3) WR Score — stacked donut + trend (portfolio) */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="WR Score"
            info="Backlink‑weighted authority score (0–100)."
            onClick={() => onOpenDrawer?.("wr_score")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutStacked aria="WR score breakdown" title="WR Score — by project" items={wrParts} valueFmt={(v) => `${Math.round(v)} / 100`} />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="wr-delta">
                    {fmtInt(data.wrScore.portfolio.value, false)}
                  </output>
                  <ValueDelta delta={data.wrScore.portfolio.delta} ariaId="wr-delta" />
                </div>
              </div>
              <TrendMini aria="WR score trend" title="WR Score" data={wrTrend} projects={P} valueFmt={(v) => `${Math.round(v)}`} />
            </div>
          </CardShell>
        </div>

        {/* ---------------- Row B ---------------- */}
        {/* 4) Clicks / Sessions / Conversions — stacked donut + trend; ONLY metric toggle */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Traffic & Conversions"
            info="Toggle the metric. Donut shows per‑project contribution; trend shows portfolio over time."
            headerRight={<SegTabs value={triTab} onChange={setTriTab} items={[{ value: "clicks", label: "Clicks" }, { value: "sessions", label: "Sessions" }, { value: "conversions", label: "Conversions" }]} />}
            onClick={() => onOpenDrawer?.("traffic")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutStacked
                  aria={`Tri-metric breakdown (${triTab})`}
                  title={`Breakdown — ${triTab[0].toUpperCase()}${triTab.slice(1)}`}
                  items={triParts}
                  valueFmt={(v) => fmtInt(v, false)}
                  showShare
                />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }} aria-describedby="tri-delta">
                    {fmtInt(data.triMetric[triTab].portfolio.value)}
                  </output>
                  <ValueDelta delta={data.triMetric[triTab].portfolio.delta} ariaId="tri-delta" />
                </div>
              </div>
              <TrendMini
                aria={`${triTab} trend`}
                title={`${triTab[0].toUpperCase()}${triTab.slice(1)}`}
                data={triTrend}
                projects={P}
                valueFmt={(v) => fmtInt(v, false)}
                showShare
              />
            </div>
          </CardShell>
        </div>

        {/* 5) Keyword Distribution — toggle Top 3 / 10 / 100; stacked donut + trend */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Keyword Distribution"
            info="Share of ranking keywords by project."
            headerRight={<SegTabs value={kwTab} onChange={setKwTab} items={[{ value: "top3", label: "Top 3" }, { value: "top10", label: "Top 10" }, { value: "top100", label: "Top 100" }]} />}
            onClick={() => onOpenDrawer?.("keyword_distribution")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutStacked
                  aria={`Keyword distribution breakdown (${kwTab})`}
                  title={`Keyword Distribution — ${kwTab.toUpperCase()}`}
                  items={kwParts}
                  valueFmt={(v) => fmtInt(v, false)}
                  showShare
                />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }}>
                    {fmtInt(data.keywords[kwTab].portfolio.value)}
                  </output>
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    {kwTab === "top3" ? "Top 3" : kwTab === "top10" ? "Top 10" : "Top 100"} keywords
                  </div>
                </div>
              </div>
              <TrendMini
                aria={`${kwTab} keywords trend`}
                title={`Keywords ${kwTab.toUpperCase()}`}
                data={kwTrend}
                projects={P}
                valueFmt={(v) => fmtInt(v, false)}
                showShare
              />
            </div>
          </CardShell>
        </div>

        {/* 6) Projects With Critical Issues — stacked donut + trend (no snapshot/trend toggle) */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Projects with Critical Issues"
            info="Count of critical issues by project and trend over time."
            onClick={() => onOpenDrawer?.("critical_issues")}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutStacked
                  aria="Critical issues breakdown"
                  title="Critical Issues — by project"
                  items={critParts}
                  valueFmt={(v) => fmtInt(v, false)}
                  showShare
                />
                <div>
                  <output className="block text-[28px] font-bold" style={{ color: TOKENS.valueBlue }}>
                    {fmtInt(data.criticalIssues.portfolio.value)}
                  </output>
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    Total critical issues
                  </div>
                </div>
              </div>
              <TrendMini
                aria="Critical issues trend"
                title="Critical Issues"
                data={critTrend}
                projects={P}
                valueFmt={(v) => fmtInt(v, false)}
                showShare
              />
            </div>
          </CardShell>
        </div>
      </div>
    </section>
  );
}

/* =============================================================================
   OPTIONAL DEMO WRAPPER (remove in production)
============================================================================= */
function makeSeries(points = 16, base = 100, drift = 0.06): TrendSeries {
  const start = new Date();
  start.setDate(start.getDate() - (points - 1));
  const arr: TrendSeries = [];
  let val = base;
  for (let i = 0; i < points; i++) {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    val = Math.max(0, val + (Math.random() - 0.5) * base * drift);
    arr.push({ t: d.toISOString().slice(0, 10), v: Math.round(val) });
  }
  return arr;
}

export default function Demo_ProjectSummarySection() {
  // Four example projects with favicons (replace with your own)
  const projects: ProjectMeta[] = [
    { id: "alpha", name: "Alpha", iconUrl: "https://favicon.splitbee.io/?url=alpha.example.com" },
    { id: "beta", name: "Beta", iconUrl: "https://favicon.splitbee.io/?url=beta.example.com" },
    { id: "gamma", name: "Gamma", iconUrl: "https://favicon.splitbee.io/?url=gamma.example.com" },
    { id: "delta", name: "Delta", iconUrl: "https://favicon.splitbee.io/?url=delta.example.com" },
  ];

  // Helper to make per-project series near some baseline
  const mkProjSeries = (base: number) =>
    Object.fromEntries(projects.map((p) => [p.id, makeSeries(20, Math.max(10, base + (Math.random() - 0.5) * 18), 0.12)]));

  // SEO/Health/WR — per project snapshot & series; portfolio values are means
  const seoByProject = Object.fromEntries(
    projects.map((p) => [p.id, { value: 60 + Math.round(Math.random() * 35), series: makeSeries(20, 70, 0.05) }])
  );
  const healthByProject = Object.fromEntries(
    projects.map((p) => [p.id, { value: 58 + Math.round(Math.random() * 38), series: makeSeries(20, 68, 0.06) }])
  );
  const wrByProject = Object.fromEntries(
    projects.map((p) => [p.id, { value: 50 + Math.round(Math.random() * 40), series: makeSeries(20, 64, 0.06) }])
  );
  const avg = (vals: number[]) => Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);

  const demo: PortfolioSummaryData = {
    projects,

    // Row A – scores
    seoScore: {
      portfolio: { value: avg(projects.map((p) => seoByProject[p.id].value)), delta: 2.8, series: makeSeries(20, 72, 0.05) },
      byProject: seoByProject,
    },
    siteHealth: {
      portfolio: { value: avg(projects.map((p) => healthByProject[p.id].value)), delta: 3.6, series: makeSeries(20, 70, 0.06) },
      byProject: healthByProject,
    },
    wrScore: {
      portfolio: { value: avg(projects.map((p) => wrByProject[p.id].value)), delta: 1.9, series: makeSeries(20, 63, 0.06) },
      byProject: wrByProject,
    },

    // Row B – tri metric
    triMetric: {
      clicks: {
        portfolio: { value: 148000, delta: 6.8, series: makeSeries(20, 7000, 0.18) },
        byProject: Object.fromEntries(projects.map((p) => [p.id, 20000 + Math.round(Math.random() * 30000)])),
        seriesByProject: mkProjSeries(7000),
      },
      sessions: {
        portfolio: { value: 265000, delta: 4.1, series: makeSeries(20, 12000, 0.18) },
        byProject: Object.fromEntries(projects.map((p) => [p.id, 40000 + Math.round(Math.random() * 50000)])),
        seriesByProject: mkProjSeries(12000),
      },
      conversions: {
        portfolio: { value: 4100, delta: 5.4, series: makeSeries(20, 220, 0.20) },
        byProject: Object.fromEntries(projects.map((p) => [p.id, 700 + Math.round(Math.random() * 600)])),
        seriesByProject: mkProjSeries(220),
      },
    },

    // Row C – keywords
    keywords: {
      top3: {
        portfolio: { value: 168, delta: 3.1, series: makeSeries(20, 160, 0.12) },
        byProject: Object.fromEntries(projects.map((p) => [p.id, 20 + Math.round(Math.random() * 60)])),
        seriesByProject: mkProjSeries(160),
      },
      top10: {
        portfolio: { value: 1180, delta: 4.8, series: makeSeries(20, 600, 0.16) },
        byProject: Object.fromEntries(projects.map((p) => [p.id, 200 + Math.round(Math.random() * 300)])),
        seriesByProject: mkProjSeries(600),
      },
      top100: {
        portfolio: { value: 4280, delta: 6.3, series: makeSeries(20, 1300, 0.18) },
        byProject: Object.fromEntries(projects.map((p) => [p.id, 700 + Math.round(Math.random() * 600)])),
        seriesByProject: mkProjSeries(1300),
      },
    },

    // Row D – critical issues
    criticalIssues: {
      portfolio: { value: 480, delta: -3.5, series: makeSeries(20, 28, 0.22) },
      byProject: Object.fromEntries(projects.map((p) => [p.id, 60 + Math.round(Math.random() * 120)])),
      seriesByProject: mkProjSeries(28),
    },
  };

  return (
    <div className="w-full bg-white" style={{ borderColor: TOKENS.border, background: "#FAFCFE" }}> 
      <div className="w-full">
        <ProjectSummarySection
          data={demo}
          onOpenDrawer={(kpi) => alert(`Open drawer: ${kpi}`)}
          onAddToReport={() => alert("Added to report")}
          onCreateTask={(k) => alert(`Create task for: ${k}`)}
          onExport={(fmt) => alert(`Export ${fmt}`)}
          canExportPdf={false}
        />
      </div>
    </div>
  );
}
