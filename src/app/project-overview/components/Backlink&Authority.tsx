"use client";

import React, { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  BarChart, Bar, PieChart, Pie, Cell, ReferenceLine, Line,
} from "recharts";
import {
  MoreHorizontal, Info as InfoIcon, ChevronDown, Sparkles, Download, RefreshCw,
  ArrowUpRight, ExternalLink, Filter, SlidersHorizontal, ChevronsUpDown, ChevronUp, ChevronDown as CDown,
} from "lucide-react";

/* ───────────────────────── TOKENS (same scheme used across the panel) ───────────────────────── */
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

  radius: 6,
} as const;

/* ───────────────────────── Helpers / formatters ───────────────────────── */
const intFmt = new Intl.NumberFormat();
function fmtInt(n?: number | null, compact = true) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 10_000) {
    const units = [{ v: 1e9, s: "B" }, { v: 1e6, s: "M" }, { v: 1e3, s: "K" }];
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

/* ───────────────────────── Types ───────────────────────── */
export type SeriesPoint = { t: string; v: number };
type RiskSplits = { cleanPct: number; suspiciousPct: number; toxicPct: number };
type LinkTypeSplits = { followPct: number; nofollowPct: number; ugcPct?: number; sponsoredPct?: number };
type AnchorMix = { brandPct: number; urlPct: number; genericPct: number; partialPct: number; exactPct: number };

type NewLost = {
  newTotal: number;
  lostTotal: number;
  netDeltaPct?: number;         // vs prior period
  seriesNew: SeriesPoint[];     // New RD per period
  seriesLost: SeriesPoint[];    // Lost RD per period
};

type RiskSignals = Array<{
  key: "sitewide" | "exact_match" | "low_rd" | "redirect_chain" | "lang_cc_mismatch" | string;
  sharePct: number; // 0..1
  count: number;
}>;

type AuthorityBuckets = Array<{ label: string; count: number }>;

type TopDomainRow = {
  domain: string;
  faviconUrl?: string;
  newRD: number;
  lostRD: number;
  netRD: number;
  activeLinks: number;
  followPct: number;
  sitewidePct: number; // 0..1
  risk: "clean" | "suspicious" | "toxic";
  firstSeen?: string; // ISO
  lastSeen?: string;  // ISO
};

type WatchlistRow = { domain: string; reasons: string[]; riskScore?: number; links: number; lastSeen: string };

type BacklinkRow = {
  sourceUrl: string;
  targetPath: string;
  anchor: string;
  type: "follow" | "nofollow" | "ugc" | "sponsored";
  status: "active" | "lost";
  firstSeen: string;
  risk?: "clean" | "suspicious" | "toxic";
};

export type BacklinkAuthorityData = {
  timeframe: "7d" | "30d" | "90d" | "12m";
  scope: "root" | "subdomain" | "subfolder" | "path";

  newLostRD: NewLost;
  linkTypes: { splits: LinkTypeSplits; series?: Record<keyof LinkTypeSplits, SeriesPoint[]> };
  risk: { splits: RiskSplits; series?: Array<{ t: string; suspiciousPct: number; toxicPct: number }>; signals: RiskSignals };
  anchors: { mix: AnchorMix; seriesExactPct?: SeriesPoint[]; seriesBrandPct?: SeriesPoint[] };
  authority: { buckets: AuthorityBuckets };

  tables: {
    topDomains: TopDomainRow[];
    watchlist: WatchlistRow[];
    recentBacklinks: BacklinkRow[];
  };
};

export interface BacklinkAuthoritySectionProps {
  data?: BacklinkAuthorityData;           // if not provided, mock is used
  onNavigate?: (url: string) => void;     // route to dedicated panels
  onAddToReport?: () => void;
  onExport?: (fmt: "PNG" | "CSV" | "PDF") => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

/* ───────────────────────── Shared atoms (CardShell, Tabs, Smart tooltips, Donuts, Sparks) ───────────────────────── */
function KebabMenu({ onAddToReport }: { onAddToReport?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-haspopup="menu"
        onClick={(e) => { e.stopPropagation(); setOpen(s => !s); }}
        className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-44 rounded-md border bg-white py-1 text-sm shadow"
             style={{ borderColor: TOKENS.border }}
             onMouseLeave={() => setOpen(false)}>
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
  title, info, headerRight, onClick, children, state = "default",
}: {
  title: string; info?: string; headerRight?: React.ReactNode; onClick?: () => void;
  children: React.ReactNode; state?: "default" | "loading" | "empty" | "disconnected";
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
    </button>
  );
}

/* Segmented tabs with localStorage persistence */
function useStickyTab<T extends string>(key: string, initial: T) {
  const [val, setVal] = useState<T>(initial);
  useEffect(() => {
    const v = window.localStorage.getItem(key);
    if (v) setVal(v as T);
  }, [key]);
  const change = (v: T) => { setVal(v); window.localStorage.setItem(key, String(v)); };
  return [val, change] as const;
}
function SegTabs<T extends string>({
  value, onChange, items,
}: { value: T; onChange: (v: T) => void; items: { value: T; label: string; disabled?: boolean; cta?: () => void }[] }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs" style={{ borderColor: TOKENS.border }}>
      {items.map((it) => (
        <button
          key={it.value}
          disabled={!!it.disabled}
          onClick={(e) => { e.stopPropagation(); if (it.disabled && it.cta) it.cta(); else onChange(it.value); }}
          className={`rounded-full px-2.5 py-1 transition ${value === it.value ? "bg-[#F5F7FA] font-semibold" : "text-[color:var(--wr-muted,#6B7280)]"} ${it.disabled ? "opacity-60" : ""}`}
          aria-pressed={value === it.value}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* Smart tooltips for charts */
function SmartTooltip({ active, label, payload, valueFmt, labelFmt }: any & {
  valueFmt?: (v: number, name?: string) => string; labelFmt?: (l: any) => string;
}) {
  if (!active) return null;
  return (
    <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}>
      {label !== undefined && <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>{labelFmt ? labelFmt(label) : String(label)}</div>}
      <div className="flex flex-col gap-1">
        {(payload ?? []).map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TOKENS.muted }}>{p.name}</span>
            </div>
            <div className="font-semibold">{valueFmt ? valueFmt(p.value as number, p.name) : fmtInt(p.value as number, false)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function DonutTooltip({ active, title, parts, valueFmt }: any & {
  title?: string; parts: { name: string; value: number; color: string }[]; valueFmt?: (v: number) => string;
}) {
  if (!active) return null;
  return (
    <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}>
      {title && <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>{title}</div>}
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

/* Mini chart atoms */
function SparkArea({ series, aria, color = TOKENS.valueBlue, pastel = TOKENS.pastelBlue }: {
  series?: SeriesPoint[]; aria: string; color?: string; pastel?: string;
}) {
  const data = (series ?? []).map(p => ({ date: p.t, value: p.v }));
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
          <XAxis dataKey="date" hide /><YAxis hide />
          <RTooltip content={<SmartTooltip valueFmt={(v) => fmtInt(v, false)} labelFmt={(l) => toDateLabel(l as string)} />} allowEscapeViewBox={{ x: true, y: true }} offset={8}
                    cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }} />
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
function SparkBars({ series, aria, color = TOKENS.valueBlue }: { series?: SeriesPoint[]; aria: string; color?: string; }) {
  const data = (series ?? []).map(p => ({ date: p.t, value: p.v }));
  return (
    <div className="h-16 w-[10.5rem]" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide /><YAxis hide />
          <RTooltip content={<SmartTooltip valueFmt={(v) => fmtInt(v, false)} labelFmt={(l) => toDateLabel(l as string)} />} allowEscapeViewBox={{ x: true, y: true }} offset={8}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function DonutSplit({ parts, aria, size = 54, tooltipTitle, valueFmt = (v: number) => fmtPct01(v) }: {
  parts: { name: string; value: number; color: string }[]; aria: string; size?: number; tooltipTitle?: string; valueFmt?: (v: number) => string;
}) {
  const data = parts.map(p => ({ ...p, v: Math.max(0, Math.min(1, p.value)) }));
  return (
    <div className="h-[54px] w-[54px] shrink-0" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip content={<DonutTooltip title={tooltipTitle} parts={data} valueFmt={valueFmt} />} allowEscapeViewBox={{ x: true, y: true }} offset={8} />
          <Pie data={data} dataKey="v" innerRadius={size / 2 - 12} outerRadius={size / 2} startAngle={90} endAngle={-270} isAnimationActive>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Delta text */
function ValueDelta({ delta, invert = false, unit = "%", ariaId, explain }: {
  delta?: number; invert?: boolean; unit?: "%" | "pp" | ""; ariaId?: string; explain?: string;
}) {
  if (typeof delta !== "number") return <div id={ariaId} className="mt-1 text-xs" style={{ color: TOKENS.muted }}>—</div>;
  const color = toneByGoodBad(delta, invert);
  return (
    <div id={ariaId} className="mt-1 text-xs" style={{ color }}>
      {caret(delta)} {Math.abs(delta).toFixed(1)}{unit && <span>&nbsp;{unit}</span>}
      {explain && <span className="ml-1 text-[11px]" style={{ color: TOKENS.muted }}>({explain})</span>}
    </div>
  );
}

/* ───────────────────────── Single‑Popover controller for progressive bars ───────────────────────── */
type HoverState = { id: string | null; set: (id: string | null) => void };
const HoverCtx = createContext<HoverState | null>(null);
function HoverGroup({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const v = useMemo<HoverState>(() => ({ id, set: setId }), [id]);
  return <HoverCtx.Provider value={v}>{children}</HoverCtx.Provider>;
}
function useHover() {
  const ctx = useContext(HoverCtx);
  return ctx;
}

/** Progressive bar with smart popover (only one visible per HoverGroup) */
function PB({ id, value01, color, label, tooltipTitle, valueFmt = (v: number) => fmtPct01(v) }: {
  id: string; value01: number; color: string; label?: string; tooltipTitle?: string; valueFmt?: (v: number) => string;
}) {
  const v = Math.max(0, Math.min(1, value01));
  const hover = useHover();
  const open = hover?.id === id;
  return (
    <div
      className="relative"
      onMouseEnter={() => hover?.set(id)}
      onMouseLeave={() => hover?.set(null)}
      onFocus={() => hover?.set(id)}
      onBlur={() => hover?.set(null)}
    >
      <div className="h-2 w-full rounded bg-[color:var(--wr-border,#EFF0F6)]">
        <div className="h-2 rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      {label && <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>{label}</div>}
      {open && (
        <div
          className="pointer-events-none absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-md border bg-white p-2 text-xs shadow"
          style={{ borderColor: TOKENS.border }}
          role="tooltip"
        >
          {tooltipTitle && <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>{tooltipTitle}</div>}
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
              <span style={{ color: TOKENS.muted }}>Value</span>
            </div>
            <div className="font-semibold">{valueFmt(v)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Main Section ───────────────────────── */
export default function BacklinkAuthoritySection({
  data, onNavigate, onAddToReport, onExport, onRefresh, loading, className,
}: BacklinkAuthoritySectionProps) {
  const D = useMemo(() => data ?? makeMockBAData(), [data]);

  // Global filters (visual only here; wire to your store as needed)
  const [tf, setTf] = useStickyTab<BacklinkAuthorityData["timeframe"]>("wr:ba:tf", D.timeframe);
  const [scope, setScope] = useStickyTab<BacklinkAuthorityData["scope"]>("wr:ba:scope", D.scope);

  // Anchor trend tab
  const [anchorTab, setAnchorTab] = useStickyTab<"exact" | "brand">("wr:ba:anchorTab", "exact");
  // LinkTypes chart mode
  const [typeMode, setTypeMode] = useStickyTab<"pct" | "count">("wr:ba:typeMode", "pct");
  // Big chart metric
  const [bigMetric, setBigMetric] = useStickyTab<"rd" | "links">("wr:ba:big", "rd");

  /* Derived series for Big Chart: RD New/Lost + Net */
  const bigSeries = useMemo(() => {
    const newArr = D.newLostRD.seriesNew;
    const lostArr = D.newLostRD.seriesLost;
    const len = Math.max(newArr.length, lostArr.length);
    const rows:any = [];
    for (let i = 0; i < len; i++) {
      const d = newArr[i]?.t ?? lostArr[i]?.t ?? "";
      const New = newArr[i]?.v ?? 0;
      const Lost = lostArr[i]?.v ?? 0;
      rows.push({ date: d, New, Lost, Net: New - Lost });
    }
    return rows;
  }, [D.newLostRD]);

  // Authority colors per bucket
  const bucketColors = useMemo(() => {
    const n = D.authority.buckets.length || 1;
    return D.authority.buckets.map((_, i) => {
      const t = i / Math.max(1, n - 1);
      // interpolate pastelBlue -> valueBlue
      return t < 0.5 ? "#8FC7FF" : TOKENS.valueBlue;
    });
  }, [D.authority.buckets]);

  /* Header */
  return (
    <section className={className}>
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>Backlink & Authority</h3>
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
            <Download size={16} />
            Export
            <ChevronDown size={16} className="ml-1 text-[#9CA3AF]" />
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
            style={{ borderColor: TOKENS.border }}
            onClick={onRefresh}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global filters (row under header) */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SegTabs value={tf} onChange={setTf} items={[
          { value: "7d", label: "7D" }, { value: "30d", label: "30D" }, { value: "90d", label: "90D" }, { value: "12m", label: "12M" },
        ]} />
        <SegTabs value={scope} onChange={setScope} items={[
          { value: "root", label: "Root" }, { value: "subdomain", label: "Subdomain" }, { value: "subfolder", label: "Subfolder" }, { value: "path", label: "Path" },
        ]} />
        <div className="ml-auto hidden items-center gap-1 sm:flex">
          <span className="text-xs" style={{ color: TOKENS.muted }}>Timeframe:</span>
          <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: TOKENS.border }}>{tf.toUpperCase()}</span>
          <span className="ml-2 text-xs" style={{ color: TOKENS.muted }}>Scope:</span>
          <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: TOKENS.border }}>{scope}</span>
        </div>
      </div>

      <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

      {/* GRID */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* Row A */}
        {/* New/Lost RD */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="New / Lost Referring Domains"
            info="New vs lost referring domains within timeframe. Net = New − Lost."
            onClick={() => onNavigate?.(`/backlinks/insights?view=domains&tf=${tf}&scope=${scope}`)}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[22px] font-bold">
                  +{fmtInt(D.newLostRD.newTotal, false)} / −{fmtInt(D.newLostRD.lostTotal, false)} RD
                </div>
                <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                  Net {fmtInt(D.newLostRD.newTotal - D.newLostRD.lostTotal, false)}
                </div>
                <ValueDelta delta={D.newLostRD.netDeltaPct} ariaId="rd-delta" />
              </div>
              <div className="h-20 w-[12rem]" role="img" aria-label="New vs Lost RD trend">
                <ResponsiveContainer>
                  <BarChart data={bigSeries} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                    <XAxis dataKey="date" hide /><YAxis hide />
                    <RTooltip content={<SmartTooltip valueFmt={(v, name) => `${name}: ${fmtInt(v as number, false)}`} labelFmt={(l) => toDateLabel(l as string)} />} allowEscapeViewBox={{ x: true, y: true }} offset={8}/>
                    <Bar dataKey="New" fill={TOKENS.valueBlue} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Lost" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardShell>
        </div>

        {/* Toxic & Suspicious */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Toxic & Suspicious Signals"
            info="Backlink risk classification using patterns (PBN/sitewide/EMD spikes…)."
            onClick={() => onNavigate?.(`/backlinks/insights?view=risk&tf=${tf}&scope=${scope}`)}
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutSplit
                  aria="Risk split"
                  tooltipTitle="Risk Split"
                  parts={[
                    { name: "Clean", value: D.risk.splits.cleanPct, color: TOKENS.success },
                    { name: "Suspicious", value: D.risk.splits.suspiciousPct, color: TOKENS.warning },
                    { name: "Toxic", value: D.risk.splits.toxicPct, color: TOKENS.danger },
                  ]}
                />
                <div>
                  <div className="text-[22px] font-bold">
                    {fmtPct01(D.risk.splits.suspiciousPct + D.risk.splits.toxicPct)} risky
                  </div>
                  <ValueDelta delta={-((D.risk.splits.suspiciousPct + D.risk.splits.toxicPct) * 100 - 0)} invert ariaId="risk-delta" explain="Lower is better" />
                </div>
              </div>
              <div className="h-20 w-[12rem]" role="img" aria-label="Risk trend">
                <ResponsiveContainer>
                  <BarChart
                    data={(D.risk.series ?? []).map(p => ({ date: p.t, Suspicious: p.suspiciousPct * 100, Toxic: p.toxicPct * 100 }))}
                    margin={{ top: 4, right: 2, left: 2, bottom: 0 }}
                  >
                    <XAxis dataKey="date" hide /><YAxis hide />
                    <RTooltip content={<SmartTooltip valueFmt={(v) => fmtPct100(v as number, 1)} labelFmt={(l) => toDateLabel(l as string)} />} allowEscapeViewBox={{ x: true, y: true }} offset={8}/>
                    <Bar dataKey="Suspicious" stackId="a" fill={TOKENS.warning} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Toxic" stackId="a" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk signals — progressive bars with single-popover controller */}
            <HoverGroup>
              <div className="mt-2 space-y-1.5">
                {D.risk.signals.slice(0, 5).map((s, i) => {
                  const color = s.key === "exact_match" || s.key === "redirect_chain" ? TOKENS.danger : TOKENS.warning;
                  return (
                    <div key={s.key} className="flex items-center gap-2 text-xs">
                      <div className="w-36 capitalize" style={{ color: TOKENS.muted }}>{prettyRiskLabel(s.key)}</div>
                      <div className="flex-1">
                        <PB id={`risk:${s.key}`} value01={s.sharePct} color={color} tooltipTitle={prettyRiskLabel(s.key)} valueFmt={(v) => `${fmtPct01(v)} • ${fmtInt(Math.round(v * 1000), false)} links`} />
                      </div>
                      <div className="w-14 text-right">{fmtPct01(s.sharePct)}</div>
                    </div>
                  );
                })}
              </div>
            </HoverGroup>
            <button className="mt-2 text-xs underline" onClick={(e) => { e.stopPropagation(); onNavigate?.(`/backlinks/insights?view=risk&tf=${tf}&scope=${scope}`); }}>
              View samples
            </button>
          </CardShell>
        </div>

        {/* Anchor Mix */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Anchor Mix"
            info="Distribution of brand, URL, generic, partial, exact-match anchors."
            onClick={() => onNavigate?.(`/backlinks/insights?view=anchors&tf=${tf}&scope=${scope}`)}
            state={loading ? "loading" : "default"}
            headerRight={<SegTabs value={anchorTab} onChange={setAnchorTab} items={[{ value: "exact", label: "Exact" }, { value: "brand", label: "Brand" }]} />}
          >
            {/* Chip row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {anchorChip("Brand", D.anchors.mix.brandPct, TOKENS.valueBlue)}
              {anchorChip("URL", D.anchors.mix.urlPct, TOKENS.info)}
              {anchorChip("Generic", D.anchors.mix.genericPct, "#93C5FD")}
              {anchorChip("Partial", D.anchors.mix.partialPct, TOKENS.success)}
              {anchorChip("Exact", D.anchors.mix.exactPct, TOKENS.danger)}
            </div>

            {/* Bars + Spark */}
            <div className="mt-2 flex items-start justify-between gap-3">
              <HoverGroup>
                <div className="w-full space-y-1.5">
                  {[
                    { k: "Brand", v: D.anchors.mix.brandPct, c: TOKENS.valueBlue },
                    { k: "URL", v: D.anchors.mix.urlPct, c: TOKENS.info },
                    { k: "Generic", v: D.anchors.mix.genericPct, c: "#93C5FD" },
                    { k: "Partial", v: D.anchors.mix.partialPct, c: TOKENS.success },
                    { k: "Exact", v: D.anchors.mix.exactPct, c: TOKENS.danger },
                  ].map((r) => (
                    <div key={r.k} className="flex items-center gap-2 text-xs">
                      <div className="w-20" style={{ color: TOKENS.muted }}>{r.k}</div>
                      <div className="flex-1">
                        <PB id={`anchor:${r.k}`} value01={r.v} color={r.c} tooltipTitle={`${r.k} anchors`} valueFmt={(v) => fmtPct01(v)} />
                      </div>
                      <div className="w-12 text-right">{fmtPct01(r.v)}</div>
                    </div>
                  ))}
                </div>
              </HoverGroup>
              <div className="shrink-0">
                {anchorTab === "exact"
                  ? <SparkArea series={D.anchors.seriesExactPct?.map(p => ({ t: p.t, v: p.v * 100 }))} aria="Exact‑match trend" color={TOKENS.danger} pastel={TOKENS.dangerPastel} />
                  : <SparkArea series={D.anchors.seriesBrandPct?.map(p => ({ t: p.t, v: p.v * 100 }))} aria="Brand trend" color={TOKENS.valueBlue} pastel={TOKENS.pastelBlue} />
                }
              </div>
            </div>
          </CardShell>
        </div>

        {/* Link Types */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <CardShell
            title="Link Types"
            info="Follow / Nofollow / UGC / Sponsored composition."
            onClick={() => onNavigate?.(`/backlinks/insights?view=filters&types=all&tf=${tf}&scope=${scope}`)}
            state={loading ? "loading" : "default"}
            headerRight={<SegTabs value={typeMode} onChange={setTypeMode} items={[{ value: "pct", label: "% Share" }, { value: "count", label: "Counts" }]} />}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DonutSplit
                  aria="Link type split"
                  tooltipTitle="Link Types"
                  parts={[
                    { name: "Follow", value: D.linkTypes.splits.followPct / 100, color: TOKENS.success },
                    { name: "Nofollow", value: D.linkTypes.splits.nofollowPct / 100, color: TOKENS.warning },
                    ...(typeof D.linkTypes.splits.ugcPct === "number" ? [{ name: "UGC", value: (D.linkTypes.splits.ugcPct ?? 0) / 100, color: TOKENS.info }] : []),
                    ...(typeof D.linkTypes.splits.sponsoredPct === "number" ? [{ name: "Sponsored", value: (D.linkTypes.splits.sponsoredPct ?? 0) / 100, color: TOKENS.danger }] : []),
                  ]}
                  valueFmt={(v) => fmtPct01(v)}
                />
                <div>
                  <div className="text-[22px] font-bold">
                    Follow <span style={{ color: TOKENS.valueBlue }}>{fmtPct100(D.linkTypes.splits.followPct, 1)}</span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>Share in active links</div>
                </div>
              </div>
              <div className="h-20 w-[12rem]" role="img" aria-label="Link types trend">
                <ResponsiveContainer>
                  <BarChart
                    data={buildTypeSeries(D.linkTypes.series, typeMode)}
                    margin={{ top: 4, right: 2, left: 2, bottom: 0 }}
                  >
                    <XAxis dataKey="date" hide /><YAxis hide />
                    <RTooltip content={<SmartTooltip valueFmt={(v) => typeMode === "pct" ? fmtPct100(v as number, 1) : fmtInt(v as number, false)} labelFmt={(l) => toDateLabel(l as string)} />} allowEscapeViewBox={{ x: true, y: true }} offset={8}/>
                    <Bar dataKey="Follow" stackId="t" fill={TOKENS.success} radius={[0,0,0,0]} />
                    <Bar dataKey="Nofollow" stackId="t" fill={TOKENS.warning} radius={[0,0,0,0]} />
                    {"UGC" in (buildTypeSeries(D.linkTypes.series, typeMode)[0] ?? {}) && <Bar dataKey="UGC" stackId="t" fill={TOKENS.info} radius={[0,0,0,0]} />}
                    {"Sponsored" in (buildTypeSeries(D.linkTypes.series, typeMode)[0] ?? {}) && <Bar dataKey="Sponsored" stackId="t" fill={TOKENS.danger} radius={[6,6,0,0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardShell>
        </div>

        {/* Row B */}
        {/* Big Chart: RD acquisition */}
        <div className="col-span-12 xl:col-span-8">
          <CardShell
            title="Referring Domains — Acquisition Over Time"
            info="New vs Lost RD by week with Net overlay."
            onClick={() => onNavigate?.(`/backlinks/insights?view=timeline&metric=${bigMetric}&tf=${tf}&scope=${scope}`)}
            headerRight={<SegTabs value={bigMetric} onChange={setBigMetric} items={[{ value: "rd", label: "RD" }, { value: "links", label: "Backlinks" }]} />}
            state={loading ? "loading" : "default"}
          >
            <div className="h-56 w-full" role="img" aria-label="RD acquisition timeline">
              <ResponsiveContainer>
                <BarChart data={bigSeries} margin={{ top: 6, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={(d) => toDateLabel(d)} />
                  <YAxis />
                  <ReferenceLine y={0} stroke={TOKENS.muted} strokeDasharray="3 3" />
                  <RTooltip
                    content={<SmartTooltip valueFmt={(v, name) => `${name}: ${fmtInt(v as number, false)}`} labelFmt={(l) => toDateLabel(l as string)} />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    offset={8}
                  />
                  <Bar dataKey="New" name="New" fill={TOKENS.valueBlue} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Lost" name="Lost" fill={TOKENS.danger} radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="Net" name="Net" stroke="#005AD6" strokeWidth={2} dot={{ r: 2 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span>Total New: <strong>{fmtInt(sum(bigSeries.map((d:any) => d.New)), false)}</strong></span>
              <span>• Total Lost: <strong>{fmtInt(sum(bigSeries.map((d:any) => d.Lost)), false)}</strong></span>
              <span>• Net: <strong>{fmtInt(sum(bigSeries.map((d:any) => d.New - d.Lost)), false)}</strong></span>
            </div>
          </CardShell>
        </div>

        {/* Authority Distribution */}
        <div className="col-span-12 xl:col-span-4">
          <CardShell
            title="Authority Distribution (RD Buckets)"
            info="Referring domains grouped by authority buckets."
            onClick={() => onNavigate?.(`/backlinks/insights?view=domains&tf=${tf}&scope=${scope}`)}
            state={loading ? "loading" : "default"}
          >
            <div className="h-56 w-full" role="img" aria-label="Authority buckets">
              <ResponsiveContainer>
                <BarChart data={D.authority.buckets} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <RTooltip content={<SmartTooltip valueFmt={(v) => fmtInt(v as number, false)} />} allowEscapeViewBox={{ x: true, y: true }} offset={8} />
                  <Bar dataKey="count">
                    {D.authority.buckets.map((_, i) => <Cell key={i} fill={bucketColors[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        </div>

        {/* Row C */}
        {/* Top Referring Domains (table) + Watchlist side card */}
        <div className="col-span-12 xl:col-span-8">
          <TopRefDomainsTable rows={D.tables.topDomains} onNavigate={onNavigate} tf={tf} scope={scope} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <WatchlistCard rows={D.tables.watchlist} onNavigate={onNavigate} tf={tf} scope={scope} />
        </div>

        {/* Recent Backlinks table full width */}
        <div className="col-span-12">
          <RecentBacklinksTable rows={D.tables.recentBacklinks} onNavigate={onNavigate} tf={tf} scope={scope} />
        </div>

        {/* Section CTAs */}
        <div className="col-span-12 mt-2 flex items-center justify-between">
          <button
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white"
            style={{ background: TOKENS.valueBlue }}
            onClick={() => onNavigate?.(`/backlinks/insights?tf=${tf}&scope=${scope}`)}
          >
            Open Backlinks Insights <ArrowUpRight size={16} />
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: TOKENS.border }}
            onClick={() => onNavigate?.(`/backlinks/opportunities?provider=vefogix&tf=${tf}&scope=${scope}`)}
          >
            Open Opportunities (Backlink Generator • Vefogix) <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Tables ───────────────────────── */

/** Top Referring Domains (same table pattern; single-popover for in-cell bars) */
function TopRefDomainsTable({
  rows, onNavigate, tf, scope,
}: { rows: TopDomainRow[]; onNavigate?: (url: string) => void; tf: string; scope: string }) {
  /* Column model */
  type ColKey = "domain" | "newRD" | "lostRD" | "netRD" | "activeLinks" | "followPct" | "sitewidePct" | "risk" | "firstSeen" | "lastSeen" | "actions";
  const COLS: { key: ColKey; label: string; width?: number; align?: "left" | "right" | "center"; sortable?: boolean; sticky?: boolean }[] = [
    { key: "domain", label: "Domain", width: 260, sticky: true, sortable: true },
    { key: "newRD", label: "New RD", width: 110, align: "right", sortable: true },
    { key: "lostRD", label: "Lost RD", width: 110, align: "right", sortable: true },
    { key: "netRD", label: "Net RD", width: 110, align: "right", sortable: true },
    { key: "activeLinks", label: "Active Links", width: 130, align: "right", sortable: true },
    { key: "followPct", label: "Follow %", width: 110, align: "right", sortable: true },
    { key: "sitewidePct", label: "Sitewide %", width: 160, align: "center", sortable: true },
    { key: "risk", label: "Risk", width: 110, align: "center", sortable: true },
    { key: "firstSeen", label: "First Seen", width: 130, align: "center", sortable: true },
    { key: "lastSeen", label: "Last Seen", width: 130, align: "center", sortable: true },
    { key: "actions", label: "Actions", width: 120 },
  ];

  /* State */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as any));
  const [sortBy, setSortBy] = useState<ColKey>("netRD");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");
  const [filterRiskOnly, setFilterRiskOnly] = useState<"all" | "suspicious" | "toxic">("all");
  const [followOnly, setFollowOnly] = useState(false);

  const toggleSort = (key: ColKey) => {
    const col = COLS.find(c => c.key === key);
    if (!col?.sortable) return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); } else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };

  /* Filter + sort */
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (query && !r.domain.toLowerCase().includes(query.toLowerCase())) return false;
      if (filterRiskOnly !== "all" && r.risk !== filterRiskOnly) return false;
      if (followOnly && r.followPct < 50) return false;
      return true;
    });
  }, [rows, query, filterRiskOnly, followOnly]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: TopDomainRow): any => {
      switch (sortBy) {
        case "domain": return r.domain;
        case "newRD": return r.newRD;
        case "lostRD": return r.lostRD;
        case "netRD": return r.netRD;
        case "activeLinks": return r.activeLinks;
        case "followPct": return r.followPct;
        case "sitewidePct": return r.sitewidePct;
        case "risk": return r.risk;
        case "firstSeen": return r.firstSeen ?? "";
        case "lastSeen": return r.lastSeen ?? "";
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a), bv = getter(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Export CSV */
  const exportCSV = () => {
    const hdr = COLS.filter(c => visibleCols[c.key] !== false && !["actions"].includes(c.key)).map(c => c.label);
    const map = (r: TopDomainRow, key: ColKey): string | number => {
      switch (key) {
        case "domain": return r.domain;
        case "newRD": return r.newRD;
        case "lostRD": return r.lostRD;
        case "netRD": return r.netRD;
        case "activeLinks": return r.activeLinks;
        case "followPct": return `${r.followPct}%`;
        case "sitewidePct": return `${(r.sitewidePct * 100).toFixed(1)}%`;
        case "risk": return r.risk;
        case "firstSeen": return r.firstSeen ?? "";
        case "lastSeen": return r.lastSeen ?? "";
        default: return "";
      }
    };
    const lines = sorted.map(r => COLS.filter(c => visibleCols[c.key] !== false && !["actions"].includes(c.key)).map(c => JSON.stringify(map(r, c.key))).join(","));
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-referring-domains.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Sticky style helper */
  const stickyStyle = (key: ColKey) => key === "domain"
    ? { position: "sticky" as const, left: 0, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
    : undefined;

  return (
    <CardShell
      title="Top Referring Domains"
      info="Sorted by net RD in the selected timeframe."
      onClick={() => onNavigate?.(`/backlinks/insights?view=domains&tf=${tf}&scope=${scope}`)}
      state="default"
      headerRight={(
        <div className="flex items-center gap-2">
          {/* Column control (simple popover) */}
          <div className="relative">
            <button className="h-8 px-3 rounded border text-xs inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]" style={{ borderColor: TOKENS.border }}>
              <SlidersHorizontal className="h-4 w-4" /> Columns
            </button>
            {/* Lightweight dropdown on focus/hover via details/summary or a quick custom – keeping code compact */}
          </div>
          {/* Export */}
          <button className="h-8 px-3 rounded border text-xs inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]" style={{ borderColor: TOKENS.border }} onClick={(e)=>{ e.stopPropagation(); exportCSV(); }}>
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      )}
    >
      {/* Filters bar */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            className="h-8 w-[280px] rounded border pl-3 pr-2 text-sm outline-none"
            style={{ borderColor: TOKENS.border }}
            placeholder="Search domain…"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            onClick={(e)=>e.stopPropagation()}
          />
        </div>
        <button
          className={`h-8 rounded-full border px-3 text-xs ${filterRiskOnly!=="all" ? "font-semibold" : ""}`}
          style={{ borderColor: TOKENS.border, background: filterRiskOnly!=="all" ? TOKENS.pastelBlue : "#fff" }}
          onClick={(e)=>{ e.stopPropagation(); setFilterRiskOnly(s=> s==="all"?"suspicious":"all"); }}
        >
          Suspicious only
        </button>
        <button
          className={`h-8 rounded-full border px-3 text-xs ${followOnly ? "font-semibold" : ""}`}
          style={{ borderColor: TOKENS.border, background: followOnly ? TOKENS.pastelBlue : "#fff" }}
          onClick={(e)=>{ e.stopPropagation(); setFollowOnly(v=>!v); }}
        >
          Follow ≥ 50%
        </button>
      </div>

      {/* Table */}
      <div className="max-h-[480px] overflow-auto rounded border" style={{ borderColor: TOKENS.border }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-40 bg-white">
            <tr>
              {COLS.filter(c => visibleCols[c.key] !== false).map(c => (
                <th key={c.key}
                    style={{ minWidth: c.width, width: c.width, ...stickyStyle(c.key) }}
                    className={`px-3 py-2 text-left ${c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : ""} border-b`}
                >
                  {c.sortable ? (
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={(e)=>{ e.stopPropagation(); toggleSort(c.key); }}>
                      <span>{c.label}</span>
                      {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <CDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* One popover at a time for ALL progressive bars inside this table */}
          <HoverGroup>
            <tbody>
              {sorted.map((r, idx) => (
                <tr key={r.domain} className="hover:bg-[#F8FAFC] cursor-pointer" onClick={()=>onNavigate?.(`/backlinks/insights?view=domain&host=${encodeURIComponent(r.domain)}&tf=${tf}&scope=${scope}`)}>
                  {visibleCols.domain !== false && (
                    <td className="px-3 py-2 font-medium" style={stickyStyle("domain") as any}>
                      <span className="underline" style={{ color: TOKENS.valueBlue }}>{r.domain}</span>
                    </td>
                  )}
                  {visibleCols.newRD !== false && <td className="px-3 py-2 text-right">{fmtInt(r.newRD)}</td>}
                  {visibleCols.lostRD !== false && <td className="px-3 py-2 text-right">{fmtInt(r.lostRD)}</td>}
                  {visibleCols.netRD !== false && <td className="px-3 py-2 text-right">{fmtInt(r.netRD)}</td>}
                  {visibleCols.activeLinks !== false && <td className="px-3 py-2 text-right">{fmtInt(r.activeLinks)}</td>}
                  {visibleCols.followPct !== false && <td className="px-3 py-2 text-right">{fmtPct100(r.followPct, 1)}</td>}
                  {visibleCols.sitewidePct !== false && (
                    <td className="px-3 py-2">
                      <PB id={`sitewide:${idx}`} value01={r.sitewidePct} color={TOKENS.warning} tooltipTitle="Sitewide ratio" valueFmt={(v)=>fmtPct01(v)} />
                    </td>
                  )}
                  {visibleCols.risk !== false && (
                    <td className="px-3 py-2 text-center">
                      <RiskChip risk={r.risk} />
                    </td>
                  )}
                  {visibleCols.firstSeen !== false && <td className="px-3 py-2 text-center">{r.firstSeen ?? "—"}</td>}
                  {visibleCols.lastSeen !== false && <td className="px-3 py-2 text-center">{r.lastSeen ?? "—"}</td>}
                  {visibleCols.actions !== false && (
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-2 text-xs">
                        <button className="underline" onClick={(e)=>{ e.stopPropagation(); onNavigate?.(`/backlinks/opportunities?provider=vefogix&seed=${encodeURIComponent(r.domain)}&tf=${tf}&scope=${scope}`); }}>
                          Opportunities
                        </button>
                        <button className="underline" onClick={(e)=>{ e.stopPropagation(); onNavigate?.(`/backlinks/insights?view=domain&host=${encodeURIComponent(r.domain)}&tf=${tf}&scope=${scope}`); }}>
                          Open
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </HoverGroup>
        </table>
      </div>
    </CardShell>
  );
}

/** Watchlist small card */
function WatchlistCard({ rows, onNavigate, tf, scope }: { rows: WatchlistRow[]; onNavigate?: (url: string) => void; tf: string; scope: string }) {
  return (
    <CardShell
      title="Suspicious Domains — Watchlist"
      info="Quick attention list; open risk view for details."
      onClick={() => onNavigate?.(`/backlinks/insights?view=risk&tf=${tf}&scope=${scope}`)}
      state="default"
    >
      <div className="space-y-2">
        {rows.slice(0, 6).map((r) => (
          <div key={r.domain} className="flex items-center justify-between rounded border p-2 text-sm" style={{ borderColor: TOKENS.border }}>
            <div>
              <div className="font-medium underline" style={{ color: TOKENS.valueBlue }}>{r.domain}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                {r.reasons.map((x, i) => (
                  <span key={i} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: TOKENS.border }}>{x}</span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div><RiskChip risk={r.riskScore && r.riskScore > 70 ? "toxic" : r.riskScore && r.riskScore > 40 ? "suspicious" : "clean"} /></div>
              <div className="text-xs" style={{ color: TOKENS.muted }}>{r.links} links • {r.lastSeen}</div>
            </div>
          </div>
        ))}
        <button className="text-xs underline" onClick={(e)=>{ e.stopPropagation(); onNavigate?.(`/backlinks/insights?view=risk&tf=${tf}&scope=${scope}`); }}>
          View all
        </button>
      </div>
    </CardShell>
  );
}

/** Recent Backlinks table */
function RecentBacklinksTable({
  rows, onNavigate, tf, scope,
}: { rows: BacklinkRow[]; onNavigate?: (url: string) => void; tf: string; scope: string }) {
  type ColKey = "source" | "target" | "anchor" | "type" | "status" | "firstSeen" | "risk" | "actions";
  const COLS: { key: ColKey; label: string; width?: number; align?: "left" | "right" | "center" }[] = [
    { key: "source", label: "Source URL", width: 340 },
    { key: "target", label: "Target Path", width: 220 },
    { key: "anchor", label: "Anchor", width: 260 },
    { key: "type", label: "Type", width: 110, align: "center" },
    { key: "status", label: "Status", width: 110, align: "center" },
    { key: "firstSeen", label: "First Seen", width: 120, align: "center" },
    { key: "risk", label: "Risk", width: 110, align: "center" },
    { key: "actions", label: "Actions", width: 150 },
  ];
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return rows;
    const qq = q.toLowerCase();
    return rows.filter(r => r.sourceUrl.toLowerCase().includes(qq) || r.targetPath.toLowerCase().includes(qq) || r.anchor.toLowerCase().includes(qq));
  }, [rows, q]);

  return (
    <CardShell
      title="Recent Backlinks"
      info="Newly discovered or updated backlinks in the selected timeframe."
      onClick={() => onNavigate?.(`/backlinks/insights?view=links&tf=${tf}&scope=${scope}`)}
      state="default"
      headerRight={(
        <div className="flex items-center gap-2">
          <div className="relative">
            <input className="h-8 w-[280px] rounded border pl-3 pr-2 text-xs outline-none" style={{ borderColor: TOKENS.border }}
                   placeholder="Search source / target / anchor…" value={q} onChange={(e)=>setQ(e.target.value)} onClick={(e)=>e.stopPropagation()} />
          </div>
        </div>
      )}
    >
      <div className="max-h-[440px] overflow-auto rounded border" style={{ borderColor: TOKENS.border }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-40 bg-white">
            <tr>
              {COLS.map(c => (
                <th key={c.key} className={`border-b px-3 py-2 text-left ${c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : ""}`}
                    style={{ minWidth: c.width, width: c.width }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="hover:bg-[#F8FAFC] cursor-pointer" onClick={()=>onNavigate?.(`/backlinks/insights?view=link&tf=${tf}&scope=${scope}`)}>
                <td className="px-3 py-2">
                  <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="underline" style={{ color: TOKENS.valueBlue }}>
                    {shorten(r.sourceUrl, 60)}
                  </a>
                </td>
                <td className="px-3 py-2">{r.targetPath}</td>
                <td className="px-3 py-2">
                  <span title={r.anchor} className="line-clamp-1">{r.anchor}</span>
                </td>
                <td className="px-3 py-2 text-center"><TypeChip t={r.type} /></td>
                <td className="px-3 py-2 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.status==="active"?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">{r.firstSeen}</td>
                <td className="px-3 py-2 text-center"><RiskChip risk={r.risk ?? "clean"} /></td>
                <td className="px-3 py-2">
                  <div className="inline-flex items-center gap-2 text-xs">
                    <button className="underline" onClick={(e)=>{ e.stopPropagation(); onNavigate?.(`/backlinks/insights?view=link&tf=${tf}&scope=${scope}`); }}>
                      Open in Insights
                    </button>
                    <button className="underline" onClick={(e)=>{ e.stopPropagation(); onNavigate?.(`/backlinks/opportunities?provider=vefogix&tf=${tf}&scope=${scope}`); }}>
                      Opportunities
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardShell>
  );
}

/* Chips */
function RiskChip({ risk }: { risk: "clean" | "suspicious" | "toxic" }) {
  const tone = risk === "clean" ? { fg: TOKENS.success, bg: TOKENS.successPastel, label: "Clean" }
    : risk === "suspicious" ? { fg: TOKENS.warning, bg: TOKENS.warningPastel, label: "Suspicious" }
    : { fg: TOKENS.danger, bg: TOKENS.dangerPastel, label: "Toxic" };
  return <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: tone.fg, background: tone.bg }}>{tone.label}</span>;
}
function TypeChip({ t }: { t: BacklinkRow["type"] }) {
  const mp = {
    follow: { fg: TOKENS.success, bg: TOKENS.successPastel, label: "Follow" },
    nofollow: { fg: TOKENS.warning, bg: TOKENS.warningPastel, label: "Nofollow" },
    ugc: { fg: TOKENS.info, bg: TOKENS.infoPastel, label: "UGC" },
    sponsored: { fg: TOKENS.danger, bg: TOKENS.dangerPastel, label: "Sponsored" },
  } as const;
  const tone = mp[t];
  return <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: tone.fg, background: tone.bg }}>{tone.label}</span>;
}

/* ───────────────────────── Misc helpers ───────────────────────── */
function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }
function shorten(s: string, n = 48) { return s.length <= n ? s : s.slice(0, n - 10) + "…" + s.slice(-9); }
function anchorChip(label: string, pct: number, color: string) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-2 py-1" style={{ border: `1px solid ${color}`, color, background: "#fff" }}>
      <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
      <span className="font-semibold" style={{ color: TOKENS.text }}>{fmtPct01(pct)}</span>
    </span>
  );
}
function prettyRiskLabel(k: string) {
  switch (k) {
    case "sitewide": return "Sitewide ratio";
    case "exact_match": return "Exact‑match rate";
    case "low_rd": return "Low RD score share";
    case "redirect_chain": return "Redirect/chain footprint";
    case "lang_cc_mismatch": return "Lang/ccTLD mismatch";
    default: return k;
  }
}
function buildTypeSeries(series: BacklinkAuthorityData["linkTypes"]["series"] | undefined, mode: "pct" | "count") {
  if (!series) return [];
  // Normalize to either % (0..100) or count (raw v)
  const keys = Object.keys(series) as (keyof LinkTypeSplits)[];
  const len = Math.max(...keys.map(k => series[k]?.length ?? 0));
  const rows: any[] = [];
  for (let i = 0; i < len; i++) {
    const date = series[keys[0]]?.[i]?.t ?? "";
    const row: any = { date };
    for (const k of keys) {
      const val = series[k]?.[i]?.v ?? 0;
      row[cap(k as string)] = mode === "pct" ? val : Math.round(val * 50); // demo scale for counts
    }
    rows.push(row);
  }
  return rows;
}
function cap(s: string) { return s.slice(0,1).toUpperCase() + s.slice(1); }

/* ───────────────────────── Mock data (deterministic) ───────────────────────── */
function rng(seed: string) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
function makeSeries(points = 14, base = 100, noise = 0.12, seed = "s"): SeriesPoint[] {
  const r = rng(seed);
  const start = new Date();
  start.setDate(start.getDate() - (points - 1));
  const out: SeriesPoint[] = [];
  let val = base;
  for (let i = 0; i < points; i++) {
    const d = new Date(start.getTime()); d.setDate(start.getDate() + i);
    val = Math.max(0, val + (r() - 0.5) * base * noise);
    out.push({ t: d.toISOString().slice(0, 10), v: Math.round(val) });
  }
  return out;
}

export function makeMockBAData(): BacklinkAuthorityData {
  const seriesNew = makeSeries(16, 40, 0.35, "new").map(p => ({ ...p, v: Math.max(8, Math.round(p.v)) }));
  const seriesLost = makeSeries(16, 22, 0.35, "lost").map(p => ({ ...p, v: Math.max(4, Math.round(p.v)) }));

  const linkTypeSeries = {
    followPct: makeSeries(12, 72, 0.05, "f"),
    nofollowPct: makeSeries(12, 22, 0.06, "nf"),
    ugcPct: makeSeries(12, 3, 0.09, "u"),
    sponsoredPct: makeSeries(12, 3, 0.10, "s"),
  };

  const topDomains: TopDomainRow[] = Array.from({ length: 40 }, (_, i) => {
    const host = `example${i+1}.com`;
    const newRD = Math.round(1 + (i % 5) * 2 + Math.random() * 6);
    const lostRD = Math.round((i % 4) + Math.random() * 4);
    const net = newRD - lostRD;
    const follow = Math.round(40 + Math.random() * 55);
    const sitewide = Math.min(0.9, Math.max(0.01, Math.random() * 0.35));
    const risk: TopDomainRow["risk"] = sitewide > 0.25 ? "suspicious" : (i % 11 === 0 ? "toxic" : "clean");
    return {
      domain: host,
      newRD, lostRD, netRD: net,
      activeLinks: Math.round(20 + Math.random() * 400),
      followPct: follow,
      sitewidePct: sitewide,
      risk,
      firstSeen: new Date(Date.now() - (50 + i) * 86400000).toISOString().slice(0,10),
      lastSeen: new Date(Date.now() - (i % 7) * 86400000).toISOString().slice(0,10),
    };
  });

  const watchlist: WatchlistRow[] = [
    { domain: "suspect-pbn.net", reasons: ["PBN footprint", "Sitewide"], riskScore: 81, links: 43, lastSeen: "2025-03-02" },
    { domain: "coupon-land.io", reasons: ["Coupons", "Low RD score"], riskScore: 65, links: 27, lastSeen: "2025-03-04" },
    { domain: "ai‑spinner.blog", reasons: ["Exact‑match anchors"], riskScore: 72, links: 18, lastSeen: "2025-03-05" },
    { domain: "redirect‑hub.xyz", reasons: ["Redirect chain"], riskScore: 58, links: 12, lastSeen: "2025-03-01" },
    { domain: "foreign‑farm.cc", reasons: ["ccTLD mismatch"], riskScore: 55, links: 9, lastSeen: "2025-03-06" },
  ];

  const recent: BacklinkRow[] = Array.from({ length: 60 }, (_, i) => {
    const types: BacklinkRow["type"][] = ["follow", "nofollow", "ugc", "sponsored"];
    const status: BacklinkRow["status"][] = ["active", "lost"];
    const t = types[i % types.length];
    const s = status[i % status.length];
    const risk: BacklinkRow["risk"] = i % 13 === 0 ? "toxic" : i % 7 === 0 ? "suspicious" : "clean";
    return {
      sourceUrl: `https://blog.example${(i%9)+1}.com/posts/${i+1000}`,
      targetPath: `/blog/post-${(i%20)+1}`,
      anchor: i%5===0 ? "best seo tool for saas" : i%3===0 ? "click here" : "brand name",
      type: t, status: s, firstSeen: new Date(Date.now() - i*86400000).toISOString().slice(0,10),
      risk,
    };
  });

  return {
    timeframe: "30d",
    scope: "root",
    newLostRD: {
      newTotal: sum(seriesNew.map(p => p.v)),
      lostTotal: sum(seriesLost.map(p => p.v)),
      netDeltaPct: 4.6,
      seriesNew,
      seriesLost,
    },
    linkTypes: {
      splits: { followPct: 72.5, nofollowPct: 22.1, ugcPct: 2.9, sponsoredPct: 2.5 },
      series: linkTypeSeries as any,
    },
    risk: {
      splits: { cleanPct: 0.72, suspiciousPct: 0.20, toxicPct: 0.08 },
      series: makeSeries(12, 28, 0.2, "risk").map((p,i) => ({
        t: p.t,
        suspiciousPct: Math.max(0.12, 0.18 + (Math.sin(i/3)*0.02)),
        toxicPct: Math.max(0.05, 0.07 + (Math.cos(i/4)*0.015)),
      })),
      signals: [
        { key: "sitewide", sharePct: 0.21, count: 320 },
        { key: "exact_match", sharePct: 0.14, count: 180 },
        { key: "low_rd", sharePct: 0.18, count: 260 },
        { key: "redirect_chain", sharePct: 0.09, count: 120 },
        { key: "lang_cc_mismatch", sharePct: 0.06, count: 80 },
      ],
    },
    anchors: {
      mix: { brandPct: 0.34, urlPct: 0.22, genericPct: 0.18, partialPct: 0.16, exactPct: 0.10 },
      seriesExactPct: makeSeries(16, 9, 0.2, "exact").map(p => ({ ...p, v: Math.max(5, p.v)/100 })),
      seriesBrandPct: makeSeries(16, 34, 0.1, "brand").map(p => ({ ...p, v: Math.max(20, p.v)/100 })),
    },
    authority: {
      buckets: [
        { label: "0–19", count: 142 },
        { label: "20–39", count: 238 },
        { label: "40–59", count: 186 },
        { label: "60–79", count: 92 },
        { label: "80–100", count: 24 },
      ],
    },
    tables: {
      topDomains: topDomains,
      watchlist: watchlist,
      recentBacklinks: recent,
    },
  };
}


