"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MoreHorizontal,
  Info as InfoIcon,
  ChevronDown,
  Sparkles,
  BarChart3,
  Link2,
} from "lucide-react";

/* ───────────────────────────────── TOKENS (same scheme as reference) ───────────────────────────────── */
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

/* ───────────────────────────────── HELPERS / FORMATTERS ───────────────────────────────── */
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
function toDateLabel(d: string | number | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function caret(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v) || v === 0) return "—";
  return v > 0 ? "▲" : "▼";
}
function toneByGoodBad(delta?: number, invert = false) {
  if (typeof delta !== "number") return TOKENS.muted;
  const isGood = invert ? delta < 0 : delta > 0;
  return isGood ? TOKENS.success : TOKENS.danger;
}

/* ───────────────────────────────── TYPES ───────────────────────────────── */
export type SeriesPoint = { t: string; v: number };
export type TrendSeries = SeriesPoint[];

export type TechnicalHealthData = {
  // Row A tiles
  cwv: {
    failingPages: number;
    pass: number;
    ni: number;
    fail: number;
    passRate: number; // 0..100
    seriesFail: TrendSeries; // failing pages trend
    device: "mobile" | "desktop";
    source: "field" | "lab";
    deltaFailPct?: number; // positive means more failing (bad)
  };
  security: {
    httpsPct: number; // 0..100
    httpCount: number;
    mixedCount: number;
    sslIssues: number;
    chainRatePct: number; // %
    avgChainLen: number;
    seriesChainRate: TrendSeries; // % over time
    deltaHttpsPct?: number; // positive is good
  };
  indexability: {
    indexablePct: number; // 0..1
    nonIndexablePct: number; // 0..1
    canonicalizedPct: number; // 0..1
    byType: Record<"noindex" | "robots" | "xrobots" | "soft404" | "non200" | "canonicalized", number>;
    seriesNonIdx: TrendSeries; // count or pct series
    deltaIndexablePP?: number; // pp
  };
  canonicals: {
    totalConflicts: number;
    byType: Record<"mutual" | "chain" | "toNon200" | "serpMismatch" | "other", number>;
    seriesConflicts: TrendSeries;
    deltaConflicts?: number; // negative is good
  };

  // Crawl stats snapshot
  crawl: {
    pagesCrawled: number;
    seriesCrawled: TrendSeries;
    avgDepth: number; // 1..N (lower better for discoverability)
    errors4xxPct: number; // 0..1
    errors5xxPct: number; // 0..1
    seriesErrors: { t: string; fourXxPct: number; fiveXxPct: number }[];
    newPages: number;
    gonePages: number;
    deltaCrawledPct?: number;
  };

  // Internal linking snapshot
  linking: {
    dils: number; // 0..100
    deltaDils?: number;
    orphanPct: number; // 0..1
    danglingPct: number; // 0..1
    brokenPct: number; // 0..1
    seriesBroken: TrendSeries;
    redirectedPct: number; // 0..1
    seriesRedirected: TrendSeries;
    anchorTypes: Array<{ type: "navigational" | "keyword" | "brand" | "generic" | "other"; count: number }>;
  };

  sources?: { crawler?: boolean; cruxField?: boolean; lighthouseLab?: boolean };
};

export interface TechnicalHealthPXSectionProps {
  data?: TechnicalHealthData; // if not provided, mock is used
  onNavigate?: (url: string) => void;
  onAddToReport?: () => void;
  onExport?: (fmt: "PNG" | "CSV" | "PDF") => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

/* ───────────────────────────────── SHARED UI (same language as reference) ───────────────────────────────── */

function KebabMenu({ onAddToReport }: { onAddToReport?: () => void }) {
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
          className="invisible group-hover/title:visible absolute left-0 top-5 z-40 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
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

  const content = (
    <>
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
        <div className="mt-3 flex h-24 items-center justify-center rounded-md bg-[#F5F7FA] text-sm" style={{ color: TOKENS.muted }}>
          Source disconnected. Connect to view this KPI.
        </div>
      ) : isEmpty ? (
        <div className="mt-3 flex h-24 items-center justify-center rounded-md bg-[#F5F7FA] text-sm" style={{ color: TOKENS.muted }}>
          No data for the selected filters.
        </div>
      ) : (
        <div className="mt-2">{children}</div>
      )}
    </>
  );

  return (
    <button
      type="button"
      className="group flex w-full flex-col rounded-[6px] border p-4 text-left shadow-sm transition-transform hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wr-value-blue,#0077FF)]/50"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

function ValueDelta({
  delta,
  invert = false,
  unit = "%", // "%", "pp", or ""
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

/** Smart tooltip for Area/Bar — matches reference: dots reflect payload color */
function SmartTooltip({
  active,
  label,
  payload,
  valueFmt,
  labelFmt,
}: any & { valueFmt?: (v: number, name?: string) => string; labelFmt?: (l: any) => string }) {
  if (!active) return null;
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}
    >
      {label !== undefined && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {labelFmt ? labelFmt(label) : String(label)}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {(payload ?? []).map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TOKENS.muted }}>{p.name}</span>
            </div>
            <div className="font-semibold">
              {valueFmt ? valueFmt(p.value as number, p.name) : fmtInt(p.value as number, false)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Smart tooltip for Donuts — dot colors match slice */
function DonutTooltip({
  active,
  title,
  parts,
  valueFmt,
}: any & { title?: string; parts: { name: string; value: number; color: string }[]; valueFmt?: (v: number) => string }) {
  if (!active) return null;
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}
    >
      {title && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {title}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TOKENS.muted }}>{p.name}</span>
            </div>
            <div className="font-semibold">{valueFmt ? valueFmt(p.value) : fmtInt(p.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Area spark (trend) */
function SparkArea({
  series,
  aria,
  color = TOKENS.valueBlue,
  pastel = TOKENS.pastelBlue,
}: {
  series?: TrendSeries;
  aria: string;
  color?: string;
  pastel?: string;
}) {
  const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
  const gradId = `grad-${aria.replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="h-16 w-[10.5rem]" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={pastel} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={<SmartTooltip valueFmt={(v) => fmtInt(v, false)} labelFmt={(l) => toDateLabel(l as string)} />}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
            cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#${gradId})`}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Bars spark (trend) */
function SparkBars({ series, aria, color = TOKENS.valueBlue }: { series?: TrendSeries; aria: string; color?: string }) {
  const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
  return (
    <div className="h-16 w-[10.5rem]" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={<SmartTooltip valueFmt={(v) => fmtInt(v, false)} labelFmt={(l) => toDateLabel(l as string)} />}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut gauge (filled vs remaining) with smart popover */
function DonutGauge({
  value01,
  aria,
  filled = TOKENS.valueBlue,
  empty = TOKENS.pastelBlue,
  size = 54,
  tooltipTitle,
  filledLabel = "Value",
  emptyLabel = "Remaining",
  valueFmt = (v: number) => fmtPct01(v),
}: {
  value01: number;
  aria: string;
  filled?: string;
  empty?: string;
  size?: number;
  tooltipTitle?: string;
  filledLabel?: string;
  emptyLabel?: string;
  valueFmt?: (v: number) => string;
}) {
  const v = Math.max(0, Math.min(1, value01));
  const parts = [
    { name: filledLabel, value: v, color: filled },
    { name: emptyLabel, value: 1 - v, color: empty },
  ];
  return (
    <div className="h-[54px] w-[54px] shrink-0" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={<DonutTooltip title={tooltipTitle} parts={parts} valueFmt={valueFmt} />}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
          />
          <Pie
            data={parts.map((d) => ({ ...d, v: d.value }))}
            dataKey="v"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
          >
            {parts.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut split (stacked segments) with smart popover */
function DonutSplit({
  parts,
  aria,
  size = 54,
  tooltipTitle,
  valueFmt = (v: number) => fmtPct01(v),
}: {
  parts: { name: string; value: number; color: string }[];
  aria: string;
  size?: number;
  tooltipTitle?: string;
  valueFmt?: (v: number) => string;
}) {
  const data = parts.map((p) => ({ ...p, v: Math.max(0, Math.min(1, p.value)) }));
  return (
    <div className="h-[54px] w-[54px] shrink-0" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={<DonutTooltip title={tooltipTitle} parts={data} valueFmt={valueFmt} />}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
          />
          <Pie
            data={data}
            dataKey="v"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Progressive bar with **controlled** smart popover (fixes multi-popover overlap) */
function ProgressBarSmart({
  value01,
  color = TOKENS.valueBlue,
  label,
  tooltipTitle,
  valueFmt = (v: number) => fmtPct01(v),
  active, // when provided, tooltip visibility is controlled by parent
  anchor = "value", // "center" | "value"
}: {
  value01: number;
  color?: string;
  label?: string;
  tooltipTitle?: string;
  valueFmt?: (v: number) => string;
  active?: boolean;
  anchor?: "center" | "value";
}) {
  const [hover, setHover] = useState(false);
  const v = Math.max(0, Math.min(1, value01));
  const show = typeof active === "boolean" ? active : hover;

  // Position tooltip near the bar's current value (clamped to avoid clipping)
  const leftPct = anchor === "value" ? Math.max(8, Math.min(92, v * 100)) : 50;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="h-2 w-full rounded bg-[color:var(--wr-border,#EFF0F6)]">
        <div className="h-2 rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      {label && (
        <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
          {label}
        </div>
      )}
      <div
        className={`pointer-events-none absolute top-6 z-40 -translate-x-1/2 rounded-md border bg-white p-2 text-xs shadow transition-opacity ${
          show ? "opacity-100" : "opacity-0"
        }`}
        style={{ borderColor: TOKENS.border, left: `${leftPct}%` }}
        role="tooltip"
      >
        {tooltipTitle && (
          <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
            {tooltipTitle}
          </div>
        )}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ background: color }}
            />
            <span style={{ color: TOKENS.muted }}>Value</span>
          </div>
          <div className="font-semibold">{valueFmt(v)}</div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────── MAIN SECTION ───────────────────────────────── */
export default function TechnicalHealthPXSection({
  data,
  onNavigate,
  onAddToReport,
  onExport,
  onRefresh,
  loading,
  className,
}: TechnicalHealthPXSectionProps) {
  const D = useMemo(() => data ?? makeMockTechHealthData(), [data]);

  // Single-popover control states for lists (prevents multiple overlapping tooltips)
  const [idxActive, setIdxActive] = useState<string | null>(null);
  const [canActive, setCanActive] = useState<string | null>(null);
  const [anchActive, setAnchActive] = useState<string | null>(null);

  const idxTotal = Object.values(D.indexability.byType).reduce((a, b) => a + b, 0) || 1;

  return (
    <section className={className} >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
          Technical Health & Page Experience
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
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
            style={{ borderColor: TOKENS.border }}
            onClick={() => onExport?.("PNG")}
          >
            Export
            <ChevronDown size={16} className="text-[#9CA3AF]" />
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
            style={{ borderColor: TOKENS.border }}
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

      {/* GRID */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* ───────── Row A: Tiles ───────── */}
        {/* CWV */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Failing CWV Pages"
            info="Core Web Vitals (p75). Snapshot + trend. Lower failing is better."
            onClick={() =>
              onNavigate?.(
                `/site-audit?tab=page-experience&status=fail&device=${D.cwv.device}&source=${D.cwv.source}`
              )
            }
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutSplit
                  aria="CWV split"
                  tooltipTitle="CWV Split"
                  parts={[
                    {
                      name: "Pass",
                      value: D.cwv.pass / (D.cwv.pass + D.cwv.ni + D.cwv.fail),
                      color: TOKENS.success,
                    },
                    {
                      name: "Needs‑Improve",
                      value: D.cwv.ni / (D.cwv.pass + D.cwv.ni + D.cwv.fail),
                      color: TOKENS.warning,
                    },
                    {
                      name: "Fail",
                      value: D.cwv.fail / (D.cwv.pass + D.cwv.ni + D.cwv.fail),
                      color: TOKENS.danger,
                    },
                  ]}
                />
                <div>
                  <div className="text-[22px] font-bold">
                    {fmtInt(D.cwv.failingPages, false)} failing
                  </div>
                  <ValueDelta
                    delta={D.cwv.deltaFailPct}
                    invert
                    ariaId="cwv-delta"
                    explain="Failing pages"
                  />
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    Device: {D.cwv.device} • Source:{" "}
                    {D.cwv.source === "field" ? "CrUX" : "Lab"}
                  </div>
                </div>
              </div>
              <SparkArea
                series={D.cwv.seriesFail}
                aria="Failing CWV trend"
                color={TOKENS.danger}
                pastel={TOKENS.dangerPastel}
              />
            </div>
          </CardShell>
        </div>

        {/* HTTPS / Redirects */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="HTTPS/SSL & Redirect Chains"
            info="HTTPS coverage, mixed content/SSL errors and chain rate."
            onClick={() =>
              onNavigate?.(
                "/site-audit?tab=issues&category=security&sub=ssl,https,mixed-content,redirect-chains"
              )
            }
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutSplit
                  aria="HTTPS coverage"
                  tooltipTitle="HTTPS vs HTTP"
                  parts={[
                    {
                      name: "HTTPS",
                      value: D.security.httpsPct / 100,
                      color: TOKENS.success,
                    },
                    {
                      name: "HTTP",
                      value: Math.max(0, 1 - D.security.httpsPct / 100),
                      color: TOKENS.danger,
                    },
                  ]}
                  valueFmt={(v) => fmtPct01(v)}
                />
                <div>
                  <div className="text-[22px] font-bold">
                    HTTPS{" "}
                    <span style={{ color: TOKENS.valueBlue }}>
                      {fmtPct100(D.security.httpsPct, 1)}
                    </span>
                  </div>
                  <ValueDelta delta={D.security.deltaHttpsPct} ariaId="https-delta" />
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    Mixed: {fmtInt(D.security.mixedCount, false)} • SSL:{" "}
                    {fmtInt(D.security.sslIssues, false)}
                  </div>
                </div>
              </div>
              <SparkArea
                series={D.security.seriesChainRate}
                aria="Redirect chain rate trend"
                color={TOKENS.warning}
                pastel={TOKENS.warningPastel}
              />
            </div>
            <div className="mt-2 text-xs" style={{ color: TOKENS.muted }}>
              Chain rate:{" "}
              <span className="font-semibold" style={{ color: TOKENS.text }}>
                {fmtPct100(D.security.chainRatePct, 1)}
              </span>{" "}
              • Avg chain length:{" "}
              <span className="font-semibold" style={{ color: TOKENS.text }}>
                {D.security.avgChainLen.toFixed(1)}×
              </span>
            </div>
          </CardShell>
        </div>

        {/* Indexability */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Indexability"
            info="Indexable vs non-indexable vs canonicalized. pp = percentage points."
            onClick={() =>
              onNavigate?.(
                "/site-audit?tab=issues&category=indexability&sub=noindex,robots,x-robots,canonicals,soft-404,non-200"
              )
            }
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutSplit
                  aria="Indexability split"
                  tooltipTitle="Indexability Coverage"
                  parts={[
                    {
                      name: "Indexable",
                      value: D.indexability.indexablePct,
                      color: TOKENS.valueBlue,
                    },
                    {
                      name: "Non‑indexable",
                      value: D.indexability.nonIndexablePct,
                      color: TOKENS.warning,
                    },
                    {
                      name: "Canonicalized",
                      value: D.indexability.canonicalizedPct,
                      color: TOKENS.info,
                    },
                  ]}
                />
                <div>
                  <div className="text-[22px] font-bold">
                    Indexable{" "}
                    <span style={{ color: TOKENS.valueBlue }}>
                      {fmtPct01(D.indexability.indexablePct)}
                    </span>
                  </div>
                  <ValueDelta
                    delta={D.indexability.deltaIndexablePP}
                    unit="pp"
                    ariaId="idx-delta"
                  />
                </div>
              </div>
              <SparkArea
                series={D.indexability.seriesNonIdx}
                aria="Non‑indexable trend"
                color={TOKENS.danger}
                pastel={TOKENS.dangerPastel}
              />
            </div>

            {/* Progressive bars (single-popover behavior) */}
            <div className="mt-2 space-y-1.5" onMouseLeave={() => setIdxActive(null)}>
              {(
                ["noindex", "robots", "xrobots", "soft404", "non200", "canonicalized"] as const
              ).map((k) => {
                const count = D.indexability.byType[k];
                const pct = count / idxTotal;
                const col = k === "canonicalized" ? TOKENS.info : TOKENS.warning;
                return (
                  <div
                    key={k}
                    className="flex items-center gap-2 text-xs"
                    onMouseEnter={() => setIdxActive(k)}
                  >
                    <div className="w-28 capitalize" style={{ color: TOKENS.muted }}>
                      {prettyIdx(k)}
                    </div>
                    <div className="flex-1">
                      <ProgressBarSmart
                        value01={pct}
                        color={col}
                        tooltipTitle={prettyIdx(k)}
                        valueFmt={(v) =>
                          `${fmtPct01(v)} • ${fmtInt(Math.round(v * idxTotal), false)} pages`
                        }
                        active={idxActive === k}
                        anchor="value"
                      />
                    </div>
                    <div className="w-12 text-right">{fmtInt(count, false)}</div>
                  </div>
                );
              })}
            </div>
          </CardShell>
        </div>

        {/* Canonical Conflicts */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Canonical Conflicts"
            info="Mutuals, chains, to non‑200, SERP mismatch."
            onClick={() =>
              onNavigate?.(
                "/site-audit?tab=issues&category=canonicals&sub=conflict,mutual,redirected,serp-mismatch"
              )
            }
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[22px] font-bold">
                  {fmtInt(D.canonicals.totalConflicts, false)} conflicts
                </div>
                <ValueDelta
                  delta={D.canonicals.deltaConflicts}
                  invert
                  ariaId="can-delta"
                  explain="Lower is better"
                />
                <div className="mt-2 space-y-1.5" onMouseLeave={() => setCanActive(null)}>
                  {Object.entries(D.canonicals.byType).map(([k, v]) => {
                    const pct = D.canonicals.totalConflicts
                      ? v / D.canonicals.totalConflicts
                      : 0;
                    return (
                      <div
                        key={k}
                        className="flex items-center gap-2 text-xs"
                        onMouseEnter={() => setCanActive(k)}
                      >
                        <div className="w-28 capitalize" style={{ color: TOKENS.muted }}>
                          {prettyCanon(k)}
                        </div>
                        <div className="flex-1">
                          <ProgressBarSmart
                            value01={pct}
                            color={TOKENS.danger}
                            tooltipTitle={prettyCanon(k)}
                            valueFmt={(vv) =>
                              `${fmtPct01(vv)} • ${fmtInt(
                                Math.round(vv * D.canonicals.totalConflicts),
                                false
                              )} cases`
                            }
                            active={canActive === k}
                            anchor="value"
                          />
                        </div>
                        <div className="w-10 text-right">{fmtInt(v, false)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <SparkBars
                series={D.canonicals.seriesConflicts}
                aria="Conflicts trend"
                color={TOKENS.danger}
              />
            </div>
          </CardShell>
        </div>

        {/* ───────── Row B: Crawl Stats Snapshot ───────── */}
        <div className="col-span-12 xl:col-span-6">
          <CardShell
            title="Crawl Stats (Wranker Crawler)"
            info="Pages crawled, depth, errors and net discovery. Snapshot + trend."
            onClick={() => onNavigate?.("/site-audit?tab=issues&scope=internal")}
            state={loading ? "loading" : "default"}
            headerRight={<BarChart3 size={16} className="text-[#9CA3AF]" />}
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Pages Crawled */}
              <div className="rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  Pages Crawled
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <div className="text-[22px] font-bold">
                      {fmtInt(D.crawl.pagesCrawled, false)}
                    </div>
                    <ValueDelta delta={D.crawl.deltaCrawledPct} ariaId="crawl-delta" />
                  </div>
                  <SparkArea series={D.crawl.seriesCrawled} aria="Pages crawled trend" />
                </div>
              </div>

              {/* Avg Depth (single progressive bar; internal hover) */}
              <div className="rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  Avg. Depth
                </div>
                <div className="mt-1 text-[22px] font-bold">
                  {D.crawl.avgDepth.toFixed(1)}
                </div>
                <div className="mt-2">
                  <ProgressBarSmart
                    value01={Math.min(1, D.crawl.avgDepth / 8)}
                    color={TOKENS.warning}
                    tooltipTitle="Average depth"
                    valueFmt={(v) => `${(v * 8).toFixed(1)} levels`}
                    label="Higher = deeper pages"
                    anchor="value"
                  />
                </div>
              </div>

              {/* Errors share — stacked donut + stacked bar trend */}
              <div className="rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  Crawl Errors
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <DonutSplit
                      aria="Crawl error split"
                      tooltipTitle="4xx / 5xx / OK"
                      parts={[
                        { name: "4xx", value: D.crawl.errors4xxPct, color: TOKENS.warning },
                        { name: "5xx", value: D.crawl.errors5xxPct, color: TOKENS.danger },
                        {
                          name: "OK",
                          value: Math.max(
                            0,
                            1 - D.crawl.errors4xxPct - D.crawl.errors5xxPct
                          ),
                          color: TOKENS.success,
                        },
                      ]}
                    />
                    <div>
                      <div className="text-[22px] font-bold">
                        {fmtPct01(D.crawl.errors4xxPct + D.crawl.errors5xxPct)}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                        Error share
                      </div>
                    </div>
                  </div>
                  <div className="h-16 w-[10.5rem]" role="img" aria-label="4xx/5xx trend">
                    <ResponsiveContainer>
                      <BarChart
                        data={(D.crawl.seriesErrors ?? []).map((p) => ({
                          date: p.t,
                          "4xx": (p.fourXxPct ?? 0) * 100,
                          "5xx": (p.fiveXxPct ?? 0) * 100,
                        }))}
                        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                      >
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <RTooltip
                          content={
                            <SmartTooltip
                              valueFmt={(v) => fmtPct100(v, 1)}
                              labelFmt={(l) => toDateLabel(l as string)}
                            />
                          }
                          allowEscapeViewBox={{ x: true, y: true }}
                          offset={8}
                        />
                        {/* Top stacked rounded */}
                        <Bar dataKey="4xx" stackId="a" fill={TOKENS.warning} radius={[0, 0, 0, 0]} />
                        <Bar dataKey="5xx" stackId="a" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* New vs Gone pages (bars) */}
              <div className="rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  New vs Gone Pages
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-[22px] font-bold">
                    +{fmtInt(D.crawl.newPages, false)} / −
                    {fmtInt(D.crawl.gonePages, false)}
                  </div>
                  <div className="h-16 w-[10.5rem]" role="img" aria-label="New vs Gone">
                    <ResponsiveContainer>
                      <BarChart
                        data={[
                          {
                            k: "now",
                            New: D.crawl.newPages,
                            Gone: D.crawl.gonePages,
                          },
                        ]}
                        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                      >
                        <XAxis dataKey="k" hide />
                        <YAxis hide />
                        <RTooltip
                          content={
                            <SmartTooltip
                              valueFmt={(v, name) =>
                                `${name}: ${fmtInt(v as number, false)}`
                              }
                              labelFmt={() => "Net discovery"}
                            />
                          }
                          allowEscapeViewBox={{ x: true, y: true }}
                          offset={8}
                        />
                        <Bar dataKey="New" fill={TOKENS.valueBlue} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Gone" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </CardShell>
        </div>

        {/* ───────── Row B: Internal Linking Snapshot ───────── */}
        <div className="col-span-12 xl:col-span-6">
          <CardShell
            title="Internal Linking Snapshot (Link Analyzer)"
            info="DILS, orphan/dangling pages, broken/redirected links and anchor types."
            onClick={() => onNavigate?.("/site-audit?tab=link-analyzer&view=overview")}
            state={loading ? "loading" : "default"}
            headerRight={<Link2 size={16} className="text-[#9CA3AF]" />}
          >
            <div className="grid grid-cols-2 gap-3">
              {/* DILS */}
              <div className="rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  DILS (Health)
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DonutGauge
                      value01={(D.linking.dils ?? 0) / 100}
                      aria="DILS gauge"
                      tooltipTitle="DILS"
                      filledLabel="Score"
                    />
                    <div>
                      <div className="text-[22px] font-bold" style={{ color: TOKENS.valueBlue }}>
                        {fmtInt(D.linking.dils, false)}
                      </div>
                      <ValueDelta delta={D.linking.deltaDils} ariaId="dils-delta" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Orphan / Dangling */}
              <div className="rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  Orphan & Dangling
                </div>
                <div className="mt-2 space-y-2">
                  {[
                    { label: "Orphan pages", v: D.linking.orphanPct, color: TOKENS.danger },
                    { label: "Dangling pages", v: D.linking.danglingPct, color: TOKENS.warning },
                  ].map((x) => (
                    <div key={x.label} className="flex items-center justify-between gap-2">
                      <div className="text-xs" style={{ color: TOKENS.muted }}>
                        {x.label}
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          color: x.color,
                          background: `${x.color}26`,
                        }}
                      >
                        {fmtPct01(x.v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Broken Links % (trend) */}
              <div className="rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  Broken Links %
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-[22px] font-bold">
                    {fmtPct01(D.linking.brokenPct, 1)}
                  </div>
                  <SparkBars
                    series={D.linking.seriesBroken.map((p) => ({ t: p.t, v: p.v * 100 }))}
                    aria="Broken links trend"
                    color={TOKENS.danger}
                  />
                </div>
                <button
                  className="mt-1 text-xs underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.("/site-audit?tab=link-analyzer&filter=broken");
                  }}
                >
                  View broken links
                </button>
              </div>

              {/* Redirected Links % (trend) */}
              <div className="rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  Redirected Links %
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="text-[22px] font-bold">
                    {fmtPct01(D.linking.redirectedPct, 1)}
                  </div>
                  <SparkBars
                    series={D.linking.seriesRedirected.map((p) => ({
                      t: p.t,
                      v: p.v * 100,
                    }))}
                    aria="Redirected links trend"
                    color={TOKENS.warning}
                  />
                </div>
                <button
                  className="mt-1 text-xs underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.("/site-audit?tab=link-analyzer&filter=redirected");
                  }}
                >
                  View redirected
                </button>
              </div>

              {/* Anchor Types (progressive bars with **single tooltip at a time**) */}
              <div className="col-span-2 rounded border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-sm font-medium" style={{ color: TOKENS.text }}>
                  Anchor Types (unique)
                </div>
                <div className="mt-2 space-y-2" onMouseLeave={() => setAnchActive(null)}>
                  {topN(D.linking.anchorTypes, 4).map((a) => {
                    const max = Math.max(...D.linking.anchorTypes.map((x) => x.count), 1);
                    const pct = a.count / max;
                    return (
                      <div
                        key={a.type}
                        className="flex items-center gap-2 text-xs"
                        onMouseEnter={() => setAnchActive(a.type)}
                      >
                        <div className="w-28 capitalize" style={{ color: TOKENS.muted }}>
                          {a.type}
                        </div>
                        <div className="flex-1">
                          <ProgressBarSmart
                            value01={pct}
                            color={TOKENS.valueBlue}
                            tooltipTitle={`${a.type} anchors`}
                            valueFmt={(v) =>
                              `${fmtPct01(v)} • ${fmtInt(Math.round(v * max), false)} vs top`
                            }
                            active={anchActive === a.type}
                            anchor="value"
                          />
                        </div>
                        <div className="w-12 text-right">{fmtInt(a.count, false)}</div>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="mt-2 text-xs underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.("/site-audit?tab=link-analyzer&view=anchors");
                  }}
                >
                  View anchors
                </button>
              </div>
            </div>
          </CardShell>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────── PRETTY LABELS ───────────────────────────────── */
function prettyIdx(k: string) {
  switch (k) {
    case "xrobots":
      return "X‑Robots‑Tag";
    case "soft404":
      return "Soft‑404";
    case "non200":
      return "Non‑200";
    default:
      return k;
  }
}
function prettyCanon(k: string) {
  switch (k) {
    case "toNon200":
      return "To non‑200";
    case "serpMismatch":
      return "SERP mismatch";
    default:
      return k;
  }
}

/* ───────────────────────────────── MOCK DATA (deterministic) ───────────────────────────────── */
function makeSeries(points = 14, base = 100, noise = 0.12, seed = "s"): TrendSeries {
  const r = rng(seed);
  const start = new Date();
  start.setDate(start.getDate() - (points - 1));
  const out: TrendSeries = [];
  let val = base;
  for (let i = 0; i < points; i++) {
    const d = new Date(start.getTime());
    d.setDate(start.getDate() + i);
    val = Math.max(0, val + (r() - 0.5) * base * noise);
    out.push({ t: d.toISOString().slice(0, 10), v: Math.round(val) });
  }
  return out;
}
function rng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function topN<T>(arr: T[], n: number) {
  return arr.slice(0, Math.max(0, n));
}

export function makeMockTechHealthData(): TechnicalHealthData {
  const failSplit = { pass: 820, ni: 140, fail: 60 };
  return {
    cwv: {
      failingPages: failSplit.fail,
      pass: failSplit.pass,
      ni: failSplit.ni,
      fail: failSplit.fail,
      passRate: (failSplit.pass / (failSplit.pass + failSplit.ni + failSplit.fail)) * 100,
      seriesFail: makeSeries(20, 64, 0.3, "cwv").map((p, i) => ({
        ...p,
        v: Math.max(20, p.v + (i % 7 === 0 ? 10 : 0)),
      })),
      device: "mobile",
      source: "field",
      deltaFailPct: -8.4,
    },
    security: {
      httpsPct: 96.3,
      httpCount: 84,
      mixedCount: 21,
      sslIssues: 3,
      chainRatePct: 7.2,
      avgChainLen: 1.7,
      seriesChainRate: makeSeries(18, 8, 0.35, "chain-rate").map((p) => ({
        ...p,
        v: Math.max(2, Math.min(20, p.v)),
      })),
      deltaHttpsPct: 0.8,
    },
    indexability: {
      indexablePct: 0.872,
      nonIndexablePct: 0.098,
      canonicalizedPct: 0.03,
      byType: { noindex: 86, robots: 24, xrobots: 7, soft404: 18, non200: 31, canonicalized: 52 },
      seriesNonIdx: makeSeries(20, 180, 0.25, "nonidx"),
      deltaIndexablePP: 1.6,
    },
    canonicals: {
      totalConflicts: 34,
      byType: { mutual: 9, chain: 6, toNon200: 5, serpMismatch: 8, other: 6 },
      seriesConflicts: makeSeries(18, 30, 0.35, "canon"),
      deltaConflicts: -9.2,
    },
    crawl: {
      pagesCrawled: 4128,
      seriesCrawled: makeSeries(16, 1800, 0.2, "crawl"),
      avgDepth: 3.8,
      errors4xxPct: 0.022,
      errors5xxPct: 0.010,
      seriesErrors: Array.from({ length: 12 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (11 - i));
        return {
          t: d.toISOString().slice(0, 10),
          fourXxPct: Math.max(0, 0.02 + (Math.random() - 0.5) * 0.02),
          fiveXxPct: Math.max(0, 0.01 + (Math.random() - 0.5) * 0.01),
        };
      }),
      newPages: 214,
      gonePages: 97,
      deltaCrawledPct: 3.1,
    },
    linking: {
      dils: 72,
      deltaDils: 2.3,
      orphanPct: 0.024,
      danglingPct: 0.031,
      brokenPct: 0.007,
      seriesBroken: makeSeries(14, 0.9, 0.35, "broken"),
      redirectedPct: 0.072,
      seriesRedirected: makeSeries(14, 4.5, 0.3, "redir"),
      anchorTypes: [
        { type: "navigational", count: 1284 },
        { type: "keyword", count: 969 },
        { type: "generic", count: 542 },
        { type: "brand", count: 316 },
        { type: "other", count: 188 },
      ],
    },
    sources: { crawler: true, cruxField: true, lighthouseLab: true },
  };
}


