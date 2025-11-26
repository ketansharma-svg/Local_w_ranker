    "use client";

/* =============================================================================
   Wranker — Page Insights · Page Analyzer Drawer
   Section 1: Summary KPI Grid — Snapshot (Stacked Donut) + Trend (Bars/Area)
   -----------------------------------------------------------------------------
   - Inter / Inter Fallback fonts; no emoji
   - Branded #008CCD icons for section & card titles
   - Pointer cursor on interactive elements
   - Smart popovers (PORTALED) for stacked donut + stacked trend (same breakdown)
   - Share toggle (% share for trends) + Export button in the header
   - Recharts-only; ready-to-drop-in TSX
   ============================================================================ */

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
  ReferenceLine,
} from "recharts";
import { createPortal } from "react-dom";
import {
  Info,
  Download,
  BarChart3,
  Gauge,
  Activity,
  Award,
  Search,
  Link as LinkIcon,
  GitMerge,
  GitPullRequest,
  Quote,
  AlertTriangle,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * DATA CONTRACT (matches your existing Drawer section)
 * ---------------------------------------------------------------------------*/
type SeriesPoint = { date: string; value: number };

export type SummaryKPIData = {
  url: string;

  // Scores (/100)
  seoScore: { value: number; series?: SeriesPoint[] };
  healthScore: { value: number; series?: SeriesPoint[] };
  wrPageScore: { value: number; series?: SeriesPoint[] };

  // Keywords
  trackedKeywords: { count: number; series?: SeriesPoint[] };
  externalKeywords: { count: number; series?: SeriesPoint[]; locked?: boolean };

  // Links
  referringDomains: { count: number; series?: SeriesPoint[] };
  inlinks: { count: number; series?: SeriesPoint[] };
  outlinks: { count: number; series?: SeriesPoint[] };
  anchorsToThisPage: { count: number; series?: SeriesPoint[] };

  // Audit
  totalIssues: { count: number; series?: SeriesPoint[] };

  // GSC
  clicksImpr: {
    clicks: number;
    impressions: number;
    ctr?: number;
    avgPos?: number;
    clicksSeries?: SeriesPoint[];
    impressionsSeries?: SeriesPoint[];
  };
  avgPosition: { value: number; series?: SeriesPoint[] };

  lastAuditedAt?: string;
};

/* -----------------------------------------------------------------------------
 * TOKENS
 * ---------------------------------------------------------------------------*/
const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  app: "#F5F7FA",
  radius: 10,
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
} as const;

/* -----------------------------------------------------------------------------
 * UTILS / FORMATTERS
 * ---------------------------------------------------------------------------*/
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toDateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* Conversions (Drawer series -> common series) */
type SP = { t: string; v: number };
const toSP = (s?: SeriesPoint[]) => (s ?? []).map((p) => ({ t: p.date, v: p.value }));
const lastNum = (s?: SeriesPoint[], fallback = 0) => (s && s.length ? s[s.length - 1].value : fallback);

/* -----------------------------------------------------------------------------
 * SPLIT HELPERS (build stacked rows for donut + trend)
 * ---------------------------------------------------------------------------*/
type SplitSpec = { key: string; label: string; baseShare: number };
type Row = { t: string } & Record<string, any>;

function splitSeries(total: SP[], parts: SplitSpec[], jitter = 0.06): Row[] {
  return total.map((p, i) => {
    let rem = 1;
    const shares: Record<string, number> = {};
    parts.forEach((sp, idx) => {
      const j = clamp01(sp.baseShare * (1 + Math.sin((i + 1) * (idx + 2) * 0.27) * jitter));
      const val = idx === parts.length - 1 ? rem : Math.min(rem, j);
      rem -= val;
      shares[sp.key] = val;
    });
    const sum = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
    Object.keys(shares).forEach((k) => (shares[k] = shares[k] / sum));
    const out: any = { t: p.t };
    parts.forEach((sp) => (out[sp.key] = Math.max(0, Math.round(p.v * shares[sp.key]))));
    return out as Row;
  });
}

function to100(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
}

function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* Score-bucket builder that follows page score movement (0..100) over a baseline */
function scoreShares(avg: number) {
  const x = Math.max(0, Math.min(1, avg / 100));
  const high = clamp01((x - 0.82) / 0.16);
  const good = clamp01(0.6 - Math.abs(x - 0.82) * 2.1);
  const needs = clamp01(0.52 - Math.abs(x - 0.68) * 1.8);
  const poor = clamp01(0.34 - x * 0.55);
  let sum = high + good + needs + poor;
  if (sum <= 0) sum = 1;
  return { high: high / sum, good: good / sum, needs: needs / sum, poor: poor / sum };
}

function scoreBucketRows(avgSeries: SP[] = [], baseline: SP[] = []): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < Math.min(avgSeries.length, baseline.length); i++) {
    const avg = avgSeries[i].v || 0;
    const total = Math.max(1, baseline[i].v);
    const w = scoreShares(avg);
    const a = Math.round(total * w.high);
    const b = Math.round(total * w.good);
    const c = Math.round(total * w.needs);
    const d = Math.max(0, total - a - b - c);
    rows.push({ t: baseline[i].t, s_90_100: a, s_75_89: b, s_50_74: c, s_lt_50: d } as unknown as Row);
  }
  return rows;
}

/* Issue severity rows (derive from totalIssues series) */
function issueSeverityRows(totalIssues: SP[] = []): Row[] {
  return totalIssues.map((p, i) => {
    const base = Math.max(0, p.v);
    // Smooth severity shares
    const critical = Math.max(0, Math.round(base * (0.08 + Math.sin(i * 0.23) * 0.015)));
    const high = Math.max(0, Math.round(base * (0.28 + Math.cos(i * 0.19) * 0.03)));
    const medium = Math.max(0, Math.round(base * (0.4 + Math.sin(i * 0.17) * 0.03)));
    let low = base - critical - high - medium;
    if (low < 0) low = 0;
    return { t: p.t, sev_critical: critical, sev_high: high, sev_medium: medium, sev_low: low };
  });
}

/* -----------------------------------------------------------------------------
 * ICON
 * ---------------------------------------------------------------------------*/
function BrandIcon({ size = 18 }: { size?: number }) {
  return <BarChart3 size={size} color={TOKENS.brand} />;
}

/* -----------------------------------------------------------------------------
 * DELTA BADGE
 * ---------------------------------------------------------------------------*/
function DeltaBadge({
  delta,
  unit = "",
  invert = false,
}: {
  delta?: number;
  unit?: "" | "%" | "pp" | "s" | "pt";
  invert?: boolean;
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TOKENS.muted }}>
        <Minus size={14} /> —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const ColorIcon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
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
      <ColorIcon size={14} />
      {label}
    </span>
  );
}

/* -----------------------------------------------------------------------------
 * PORTALED POPUPS (smart popovers)
 * ---------------------------------------------------------------------------*/
function PortalTooltipShell({
  x,
  y,
  width = 260,
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
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none", isolation: "isolate" }}>
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{ backgroundColor: "#ffffff", border: `1px solid ${TOKENS.border}`, color: TOKENS.text, borderRadius: 6 }}
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
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>
      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TOKENS.muted }}>
            Total
          </span>
          <span className="font-semibold">{intFmt.format(Math.round(total))}</span>
        </div>
      )}
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              {iconMap?.[p.name]}
              <span style={{ color: TOKENS.muted }}>{nameMap?.[p.name] ?? p.name}</span>
            </div>
            <div className="font-semibold">{fmt(Number(p.value))}</div>
          </div>
        ))}
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
  iconMap,
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  const highlightName = (parts.length && parts[0].name) || undefined;
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = p.name === highlightName;
          return (
            <div key={i} className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                {iconMap?.[p.name]}
                <span className={cn(isActive ? "font-semibold" : "")} style={{ color: TOKENS.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={cn("font-semibold", isActive && "text-[color:var(--focus,#0077FF)]")}>{fmt(Number(p.value))}</div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* -----------------------------------------------------------------------------
 * SNAPSHOT DONUT
 * ---------------------------------------------------------------------------*/
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
                iconMap={iconMap}
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

/* -----------------------------------------------------------------------------
 * TREND STACK (area or bars)
 * ---------------------------------------------------------------------------*/
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
  const data = share ? to100(rows, keys) : rows;
  const asShare = share;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v)));

  return (
    <div ref={ref} className="h-16 min-w-[auto]" role="img" aria-label="KPI trend">
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
                  iconMap={{}}
                  valueFmt={valueFmt}
                  asShare={asShare}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TOKENS.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[k]} fill={colors[k]} fillOpacity={0.25} strokeWidth={2} dot={false} />
            ))}
            <ReferenceLine y={0} stroke={TOKENS.muted} strokeOpacity={0.12} />
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
                  iconMap={{}}
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

/* -----------------------------------------------------------------------------
 * CARD SHELL
 * ---------------------------------------------------------------------------*/
function KpiCard({
  title,
  source,
  info,
  donut,
  value,
  valueFmt,
  delta,
  deltaUnit,
  invert,
  trend,
  onClick,
  glyph,
}: {
  title: string;
  source: "GSC" | "RT" | "Ext" | "Crawler" | "Internal" | "WR";
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "s" | "pt";
  invert?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
  glyph?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="group relative w-full text-left cursor-pointer" aria-label={`${title} card`}>
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Title row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {glyph ?? <BrandIcon size={16} />}
            <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.text }}>
              {title}
            </div>
            {info ? (
              <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info}>
                <Info size={14} />
              </span>
            ) : null}
          </div>
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ border: `1px solid ${TOKENS.border}`, background: "#F5F7FA", color: TOKENS.valueBlue }}
          >
            {source}
          </span>
        </div>

        {/* Content row: donut | value/delta | trend */}
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TOKENS.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge delta={delta} unit={deltaUnit} invert={invert} />
            </div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* -----------------------------------------------------------------------------
 * SECTION — Page Analyzer Drawer · Summary KPI Grid
 * ---------------------------------------------------------------------------*/
type ShareMode = boolean;

export function PageAnalyzerSummaryKPI({
  data,
  onExport,
  onJump,
}: {
  data: SummaryKPIData;
  onExport: (fmt: "csv" | "png") => void;
  onJump: (
    dest:
      | "content"
      | "page-experience"
      | "backlinks"
      | "keywords"
      | "internal-links-in"
      | "internal-links-out"
      | "internal-links-anchors"
      | "audit-issues"
      | "external-keywords"
  ) => void;
}) {
  const [shareMode, setShareMode] = React.useState<ShareMode>(false);

  /* ---------------------------- Color maps & specs --------------------------- */
  // Position buckets (for keyword/visibility style splits)
  const POS = [
    { key: "p1_3", label: "Pos 1–3", baseShare: 0.16 },
    { key: "p4_10", label: "Pos 4–10", baseShare: 0.34 },
    { key: "p11_20", label: "Pos 11–20", baseShare: 0.28 },
    { key: "p21p", label: "Pos 21+", baseShare: 0.22 },
  ] as SplitSpec[];
  const POS_COLORS: Record<string, string> = { p1_3: TOKENS.success, p4_10: "#60A5FA", p11_20: "#9FC8FF", p21p: TOKENS.gray };
  const POS_NAMES = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21p: "Pos 21+" };

  // Authority tiers for backlinks
  const AUTH = [
    { key: "high", label: "High Authority", baseShare: 0.22 },
    { key: "mid", label: "Mid Authority", baseShare: 0.38 },
    { key: "low", label: "Low Authority", baseShare: 0.28 },
    { key: "new", label: "New/Unrated", baseShare: 0.12 },
  ] as SplitSpec[];
  const AUTH_COLORS: Record<string, string> = { high: "#34D399", mid: "#60A5FA", low: "#F59E0B", new: "#A3A3A3" };
  const AUTH_NAMES = { high: "High Authority", mid: "Mid Authority", low: "Low Authority", new: "New/Unrated" };

  // Sections for internal links (approx)
  const SECTIONS = [
    { key: "root", label: "Root", baseShare: 0.22 },
    { key: "blog", label: "/blog", baseShare: 0.38 },
    { key: "docs", label: "/docs", baseShare: 0.22 },
    { key: "other", label: "Other", baseShare: 0.18 },
  ] as SplitSpec[];
  const SECTION_COLORS: Record<string, string> = { root: TOKENS.valueBlue, blog: "#5CA8FF", docs: "#7E72FF", other: TOKENS.gray };
  const SECTION_NAMES = { root: "Root", blog: "/blog", docs: "/docs", other: "Other" };

  // Anchor types
  const ANCH = [
    { key: "exact", label: "Exact‑match", baseShare: 0.26 },
    { key: "partial", label: "Partial‑match", baseShare: 0.34 },
    { key: "branded", label: "Branded", baseShare: 0.24 },
    { key: "generic", label: "Generic", baseShare: 0.16 },
  ] as SplitSpec[];
  const ANCH_COLORS: Record<string, string> = { exact: TOKENS.valueBlue, partial: "#5CA8FF", branded: "#34D399", generic: TOKENS.gray };
  const ANCH_NAMES = { exact: "Exact‑match", partial: "Partial‑match", branded: "Branded", generic: "Generic" };

  // Score buckets
  const SCORE_COLORS: Record<string, string> = { s_90_100: TOKENS.success, s_75_89: "#60A5FA", s_50_74: TOKENS.warn, s_lt_50: TOKENS.danger };
  const SCORE_NAMES = { s_90_100: "90–100", s_75_89: "75–89", s_50_74: "50–74", s_lt_50: "<50" };

  // Issue severity
  const ISSUE_COLORS: Record<string, string> = { sev_critical: TOKENS.danger, sev_high: TOKENS.warn, sev_medium: "#60A5FA", sev_low: TOKENS.gray };
  const ISSUE_NAMES = { sev_critical: "Critical", sev_high: "High", sev_medium: "Medium", sev_low: "Low" };

  // Clicks vs unclicked impressions
  const CI_COLORS: Record<string, string> = { clicks: TOKENS.valueBlue, unclicked: TOKENS.gray };
  const CI_NAMES = { clicks: "Clicks", unclicked: "Unclicked Impr." };

  /* ---------------------------- Build stacked rows -------------------------- */
  const seoSP = toSP(data.seoScore.series);
  const healthSP = toSP(data.healthScore.series);
  const wrSP = toSP(data.wrPageScore.series);

  const trackedSP = toSP(data.trackedKeywords.series);
  const extKWSP = toSP(data.externalKeywords.series);

  const refDomSP = toSP(data.referringDomains.series);
  const inlinksSP = toSP(data.inlinks.series);
  const outlinksSP = toSP(data.outlinks.series);
  const anchorsSP = toSP(data.anchorsToThisPage.series);

  const issuesSP = toSP(data.totalIssues.series);

  const clicksSP = (data.clicksImpr.clicksSeries ?? []).map((p) => ({ t: p.date, v: p.value }));
  const imprSP = (data.clicksImpr.impressionsSeries ?? []).map((p) => ({ t: p.date, v: p.value }));

  const baselineForScore: SP[] =
    imprSP.length && imprSP.length === seoSP.length
      ? imprSP
      : seoSP.map((p) => ({ t: p.t, v: 1000 })); // fallback baseline

  // 1) SEO Readiness — Score buckets (baseline: impressions or fallback)
  const seoBuckets = React.useMemo(() => scoreBucketRows(seoSP, baselineForScore), [seoSP, baselineForScore]);

  // 2) Page Health — issue severity buckets
  const healthSeverityRows = React.useMemo(() => issueSeverityRows(issuesSP), [issuesSP]);

  // 3) WR Page Score — authority tiers (baseline: referring domains)
  const wrAuthorityRows = React.useMemo(() => splitSeries(refDomSP.length ? refDomSP : wrSP.map((p) => ({ t: p.t, v: 1 })), AUTH, 0.06), [refDomSP, wrSP]);

  // 4) Clicks / Impressions — clicks vs unclicked impressions
  const clicksRows: Row[] = React.useMemo(() => {
    const n = Math.min(clicksSP.length, imprSP.length);
    const out: Row[] = [];
    for (let i = 0; i < n; i++) {
      const c = Math.max(0, clicksSP[i].v || 0);
      const m = Math.max(0, imprSP[i].v || 0);
      out.push({ t: clicksSP[i].t, clicks: c, unclicked: Math.max(0, m - c) });
    }
    return out;
  }, [clicksSP, imprSP]);

  // 5) Tracked Keywords — position buckets
  const trackedPosRows = React.useMemo(() => splitSeries(trackedSP, POS, 0.07), [trackedSP]);

  // 6) External Keywords — position buckets
  const externalPosRows = React.useMemo(() => splitSeries(extKWSP, POS, 0.07), [extKWSP]);

  // 7) Referring Domains — authority tiers (same as WR score card, different value)
  const refDomAuthRows = React.useMemo(() => splitSeries(refDomSP, AUTH, 0.06), [refDomSP]);

  // 8) Total Issues — severity buckets (same rows as Health card)
  const issueRows = healthSeverityRows;

  // 9) Internal Inlinks — by site section
  const inlinksSectionRows = React.useMemo(() => splitSeries(inlinksSP, SECTIONS, 0.06), [inlinksSP]);

  // 10) Outlinks — by site section
  const outlinksSectionRows = React.useMemo(() => splitSeries(outlinksSP, SECTIONS, 0.06), [outlinksSP]);

  // 11) Anchors to this page — anchor type
  const anchorTypeRows = React.useMemo(() => splitSeries(anchorsSP, ANCH, 0.06), [anchorsSP]);

  // 12) Avg. Position — impression distribution across rank buckets
  const posDistRows = React.useMemo(() => splitSeries(imprSP.length ? imprSP : trackedSP, POS, 0.06), [imprSP, trackedSP]);

  /* ------------------------------- DELTAS ---------------------------------- */
  const deltaFrom = (sp?: SeriesPoint[]) => {
    if (!sp || sp.length < 2) return undefined;
    return (sp[sp.length - 1].value ?? 0) - (sp[sp.length - 2].value ?? 0);
  };

  const dSeo = deltaFrom(data.seoScore.series);
  const dHealth = deltaFrom(data.healthScore.series);
  const dWR = deltaFrom(data.wrPageScore.series);
  const dTracked = deltaFrom(data.trackedKeywords.series);
  const dExtKW = deltaFrom(data.externalKeywords.series);
  const dRefDom = deltaFrom(data.referringDomains.series);
  const dIn = deltaFrom(data.inlinks.series);
  const dOut = deltaFrom(data.outlinks.series);
  const dAnch = deltaFrom(data.anchorsToThisPage.series);
  const dIssues = deltaFrom(data.totalIssues.series);
  const dAvgPos = deltaFrom(data.avgPosition.series);

  /* ------------------------------- RENDER ---------------------------------- */
  return (
    <section
      className="w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="rounded-md bg-white p-4" style={{ border: `1px solid ${TOKENS.border}` }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2">
            <BrandIcon size={20} />
            <h2 className="text-[20px] font-semibold" style={{ color: TOKENS.text }}>
              Summary KPI Grid
            </h2>
            <button
              className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
              title="Each card shows a current stacked snapshot and a stacked trend using the same breakdown."
              aria-label="About this section"
              style={{ cursor: "pointer" }}
            >
              <Info size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Share switch applies to all trend charts */}
            <label className="inline-flex items-center gap-2 text-xs" style={{ color: TOKENS.muted, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={shareMode}
                onChange={(e) => setShareMode(e.target.checked)}
                className="h-4 w-4 rounded border"
                style={{ accentColor: TOKENS.valueBlue, borderColor: TOKENS.border, cursor: "pointer" }}
              />
              Show % share
            </label>

            {/* Export */}
            <button
              className="ml-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 border hover:bg-gray-50"
              aria-label="Export Summary KPIs"
              onClick={() => onExport("csv")}
              style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
            >
              <Download size={16} />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* KPI Grid (12 cards) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1) SEO Readiness — Score buckets */}
          <KpiCard
            title="SEO Readiness"
            source="Crawler"
            info="Readiness score. Snapshot: score buckets; trend shows bucket mix (impressions‑weighted)."
            glyph={<Gauge size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(seoBuckets, ["s_90_100", "s_75_89", "s_50_74", "s_lt_50"], SCORE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={SCORE_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.seoScore.value}
            valueFmt={(v) => `${v.toFixed(1)}/100`}
            delta={typeof dSeo === "number" ? Math.round(dSeo * 10) / 10 : undefined}
            deltaUnit="pt"
            trend={<TrendStack rows={seoBuckets} keys={["s_90_100", "s_75_89", "s_50_74", "s_lt_50"]} colors={SCORE_COLORS} names={SCORE_NAMES} mode="area" share={shareMode} />}
            onClick={() => onJump("content")}
          />

          {/* 2) Page Health Score — Issue severity buckets */}
          <KpiCard
            title="Page Health Score"
            source="Crawler"
            info="Technical & UX health. Snapshot: issue severity; trend: severity mix."
            glyph={<Activity size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(healthSeverityRows, ["sev_critical", "sev_high", "sev_medium", "sev_low"], ISSUE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={ISSUE_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.healthScore.value}
            valueFmt={(v) => `${v.toFixed(1)}/100`}
            delta={typeof dHealth === "number" ? Math.round(dHealth * 10) / 10 : undefined}
            deltaUnit="pt"
            trend={<TrendStack rows={healthSeverityRows} keys={["sev_critical", "sev_high", "sev_medium", "sev_low"]} colors={ISSUE_COLORS} names={ISSUE_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("page-experience")}
          />

          {/* 3) WR Page Score — Authority tiers */}
          <KpiCard
            title="WR Page Score"
            source="WR"
            info="Authority/reputation proxy. Snapshot: referring authority tiers; trend: quality mix."
            glyph={<Award size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(wrAuthorityRows, ["high", "mid", "low", "new"], AUTH_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={AUTH_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.wrPageScore.value}
            valueFmt={(v) => `${v.toFixed(1)}/100`}
            delta={typeof dWR === "number" ? Math.round(dWR * 10) / 10 : undefined}
            deltaUnit="pt"
            trend={<TrendStack rows={wrAuthorityRows} keys={["high", "mid", "low", "new"]} colors={AUTH_COLORS} names={AUTH_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("backlinks")}
          />

          {/* 4) Clicks vs Unclicked Impressions */}
          <KpiCard
            title="Clicks / Impressions"
            source="GSC"
            info={`CTR ${(data.clicksImpr.ctr ?? 0) * 100 < 0.1 ? "<0.1" : ((data.clicksImpr.ctr ?? 0) * 100).toFixed(1)}% · Avg Pos ${data.clicksImpr.avgPos ?? "—"}`}
            glyph={<Eye size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(clicksRows, ["clicks", "unclicked"], CI_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={CI_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.clicksImpr.clicks}
            valueFmt={(v) => `${intFmt.format(v)} / ${intFmt.format(data.clicksImpr.impressions)}`}
            delta={undefined}
            trend={<TrendStack rows={clicksRows} keys={["clicks", "unclicked"]} colors={CI_COLORS} names={CI_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("keywords")}
          />

          {/* 5) Tracked Keywords — Position buckets */}
          <KpiCard
            title="Tracked Keywords"
            source="RT"
            info="Tracked terms grouped by best rank bucket; trend: distribution over time."
            glyph={<Search size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(trackedPosRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={POS_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.trackedKeywords.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dTracked === "number" ? dTracked : undefined}
            trend={<TrendStack rows={trackedPosRows} keys={["p1_3", "p4_10", "p11_20", "p21p"]} colors={POS_COLORS} names={POS_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("keywords")}
          />

          {/* 6) External Keywords — Position buckets */}
          <KpiCard
            title="External Keywords"
            source="RT"
            info="Discovered external queries grouped by rank bucket."
            glyph={<Search size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(externalPosRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={POS_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.externalKeywords.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dExtKW === "number" ? dExtKW : undefined}
            trend={<TrendStack rows={externalPosRows} keys={["p1_3", "p4_10", "p11_20", "p21p"]} colors={POS_COLORS} names={POS_NAMES} mode="area" share={shareMode} />}
            onClick={() => onJump("external-keywords")}
          />

          {/* 7) Referring Domains — Authority tiers */}
          <KpiCard
            title="Referring Domains"
            source="Ext"
            info="Unique linking domains grouped by authority."
            glyph={<LinkIcon size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(refDomAuthRows, ["high", "mid", "low", "new"], AUTH_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={AUTH_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.referringDomains.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dRefDom === "number" ? dRefDom : undefined}
            trend={<TrendStack rows={refDomAuthRows} keys={["high", "mid", "low", "new"]} colors={AUTH_COLORS} names={AUTH_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("backlinks")}
          />

          {/* 8) Total Issues — Severity buckets */}
          <KpiCard
            title="Total Issues"
            source="Crawler"
            info="Open issues grouped by severity; fewer is better."
            glyph={<AlertTriangle size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(issueRows, ["sev_critical", "sev_high", "sev_medium", "sev_low"], ISSUE_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={ISSUE_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.totalIssues.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dIssues === "number" ? dIssues : undefined}
            invert
            trend={<TrendStack rows={issueRows} keys={["sev_critical", "sev_high", "sev_medium", "sev_low"]} colors={ISSUE_COLORS} names={ISSUE_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("audit-issues")}
          />

          {/* 9) Internal Inlinks — Section mix */}
          <KpiCard
            title="Internal Inlinks"
            source="Internal"
            info="Where inlinks come from (site sections)."
            glyph={<GitMerge size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(inlinksSectionRows, ["root", "blog", "docs", "other"], SECTION_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={SECTION_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.inlinks.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dIn === "number" ? dIn : undefined}
            trend={<TrendStack rows={inlinksSectionRows} keys={["root", "blog", "docs", "other"]} colors={SECTION_COLORS} names={SECTION_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("internal-links-in")}
          />

          {/* 10) Outlinks — Section mix */}
          <KpiCard
            title="Outlinks"
            source="Internal"
            info="Where this page links to (sections)."
            glyph={<GitPullRequest size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(outlinksSectionRows, ["root", "blog", "docs", "other"], SECTION_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={SECTION_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.outlinks.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dOut === "number" ? dOut : undefined}
            trend={<TrendStack rows={outlinksSectionRows} keys={["root", "blog", "docs", "other"]} colors={SECTION_COLORS} names={SECTION_NAMES} mode="area" share={shareMode} />}
            onClick={() => onJump("internal-links-out")}
          />

          {/* 11) Anchors to this Page — Type mix */}
          <KpiCard
            title="Total Anchors (to this page)"
            source="Internal"
            info="Anchor text types used to link to this page."
            glyph={<Quote size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(anchorTypeRows, ["exact", "partial", "branded", "generic"], ANCH_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={ANCH_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.anchorsToThisPage.count}
            valueFmt={(v) => intFmt.format(v)}
            delta={typeof dAnch === "number" ? dAnch : undefined}
            trend={<TrendStack rows={anchorTypeRows} keys={["exact", "partial", "branded", "generic"]} colors={ANCH_COLORS} names={ANCH_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("internal-links-anchors")}
          />

          {/* 12) Avg. Position — Impression rank buckets (lower is better) */}
          <KpiCard
            title="Avg. Position"
            source="GSC"
            info="Average rank; lower is better. Snapshot/trend show impression mix by rank bucket."
            glyph={<Search size={16} color={TOKENS.brand} />}
            donut={
              <StackedDonut
                parts={lastParts(posDistRows, ["p1_3", "p4_10", "p11_20", "p21p"], POS_COLORS).map((p) => ({ ...p, name: p.key }))}
                nameMap={POS_NAMES}
                iconMap={{}}
                valueFmt={(v) => intFmt.format(Math.round(v))}
              />
            }
            value={data.avgPosition.value}
            valueFmt={(v) => `#${v.toFixed(1)}`}
            delta={typeof dAvgPos === "number" ? Math.round(dAvgPos * 10) / 10 : undefined}
            invert
            trend={<TrendStack rows={posDistRows} keys={["p1_3", "p4_10", "p11_20", "p21p"]} colors={POS_COLORS} names={POS_NAMES} mode="bars" share={shareMode} />}
            onClick={() => onJump("keywords")}
          />
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
 * Demo wrapper (optional)
 * ---------------------------------------------------------------------------*/
function toISODate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}
function mkSeries(len = 14, start = 100, amp = 10) {
  return Array.from({ length: len }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (len - 1 - i));
    return { date: toISODate(d), value: Math.max(0, Math.round(start + Math.sin(i / 2) * amp + (Math.random() - 0.5) * 6)) };
  });
}
export function createMockSummaryKPI(): SummaryKPIData {
  const clicksSeries = mkSeries(14, 1200, 120);
  const impressionsSeries = mkSeries(14, 9000, 300);
  return {
    url: "https://example.com/blog/seo-guide",
    seoScore: { value: 82.4, series: mkSeries(14, 80, 4) },
    healthScore: { value: 76.1, series: mkSeries(14, 74, 5) },
    wrPageScore: { value: 61.3, series: mkSeries(14, 60, 3) },

    trackedKeywords: { count: 12, series: mkSeries(14, 11, 2) },
    externalKeywords: { count: 34, series: mkSeries(14, 30, 5) },

    referringDomains: { count: 18, series: mkSeries(14, 16, 3) },
    inlinks: { count: 27, series: mkSeries(14, 24, 4) },
    outlinks: { count: 19, series: mkSeries(14, 18, 2) },
    anchorsToThisPage: { count: 54, series: mkSeries(14, 50, 6) },

    totalIssues: { count: 6, series: mkSeries(14, 7, 1) },

    clicksImpr: {
      clicks: clicksSeries[clicksSeries.length - 1].value,
      impressions: impressionsSeries[impressionsSeries.length - 1].value,
      ctr: 0.023,
      avgPos: 14.2,
      clicksSeries,
      impressionsSeries,
    },
    avgPosition: { value: 18.6, series: mkSeries(14, 19, 0.8) },
    lastAuditedAt: new Date().toISOString(),
  };
}

export default function DemoPageAnalyzerSummaryKPI() {
  const data = React.useMemo(() => createMockSummaryKPI(), []);
  return (
<>
      <PageAnalyzerSummaryKPI
        data={data}
        onExport={(fmt) => {
          // wire to real export in app
          console.log("Export:", fmt);
        }}
        onJump={(dest) => console.log("Jump to:", dest)}
      />
</>
  );
}


