"use client";

import React, { useEffect, useMemo, useState, useContext, createContext } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  MoreHorizontal,
  Info as InfoIcon,
  ChevronDown,
  Sparkles,
  Plus,
  RefreshCw,
  ExternalLink,
  LineChart as AnalyzeIcon,
  Star,
  StarOff,
  Share2,
  Search,
} from "lucide-react";

/* ========================================================================================
 * TOKENS (same palette as other sections)
 * ====================================================================================== */
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

/* ========================================================================================
 * HELPERS / FORMATTERS
 * ====================================================================================== */
const nf = new Intl.NumberFormat();
function fmtInt(n?: number | null, compact = true) {
  if (n == null || Number.isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 10_000) {
    const u = [
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "K" },
    ];
    for (const it of u) if (Math.abs(n) >= it.v) return `${(n / it.v).toFixed(1)}${it.s}`;
  }
  return nf.format(n);
}
function fmtPct01(p?: number | null, digits = 1) {
  if (p == null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(digits)}%`;
}
function fmtPct100(p?: number | null, digits = 1) {
  if (p == null || Number.isNaN(p)) return "—";
  return `${(p ?? 0).toFixed(digits)}%`;
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
function toDateLabel(d: string | number | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

/* ========================================================================================
 * TYPES
 * ====================================================================================== */
export type SeriesPoint = { t: string; v: number };

export type CompetitorRow = {
  id: string;
  name: string;
  domain: string;
  faviconUrl?: string;
  pinned: boolean;

  overlapCount: number;
  overlapDelta: number;
  uniqueCompCount: number;
  uniqueUsCount: number;
  newKw: number;
  lostKw: number;

  avgOverlapPos: number; // lower is better
  sovPct: number; // 0..100

  trendSeries: SeriesPoint[]; // SOV% trend
  topMovers: Array<{ url: string; title?: string; delta: number; icon?: "up" | "down" }>;
};

type CompetitorSnapshotData = {
  timeframe: "7d" | "30d" | "90d" | "12m";
  device: "desktop" | "mobile";
  market: string; // e.g., "us"
  rankThreshold: number; // e.g., 20
  competitors: CompetitorRow[]; // max 10 when trackedOnly=true
};

export interface CompetitorSnapshotSectionProps {
  data?: CompetitorSnapshotData; // if undefined, mock is used
  trackedOnly?: boolean;

  onExport?: (fmt: "PNG" | "CSV" | "PDF") => void;
  onRefresh?: () => void;
  onAddCompetitor?: () => void;

  onCompare?: (competitorId: string) => void;
  onTogglePin?: (competitorId: string, nextPinned: boolean) => void;
  onOpenGap?: (competitorId: string) => void;
  onOpenSerp?: (competitorId: string, context?: { url?: string }) => void;

  loading?: boolean;
  className?: string;
}

/* ========================================================================================
 * PERSISTED SegTabs
 * ====================================================================================== */
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

/* ========================================================================================
 * SIMPLE RNG + MOCK SERIES
 * ====================================================================================== */
function rng(seed: string) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function makeSeries(points = 14, base = 25, noise = 0.2, seed = "s"): SeriesPoint[] {
  const r = rng(seed);
  const start = new Date();
  start.setDate(start.getDate() - (points - 1));
  const out: SeriesPoint[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    v = Math.max(1, v + (r() - 0.5) * base * noise);
    out.push({ t: d.toISOString().slice(0, 10), v: Math.round(v * 10) / 10 });
  }
  return out;
}

/* ========================================================================================
 * SHARED ATOMS — Kebab, TitleWithHoverInfo, Card z-index layer
 * ====================================================================================== */
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
          className="invisible group-hover/title:visible absolute left-0 top-5 z-50 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}

/** Card-layer z-index elevator to ensure tooltips/popovers appear above adjacent cards */
type CardLayerCtxType = { setRaised: (v: boolean) => void };
const CardLayerCtx = createContext<CardLayerCtxType | null>(null);
function useCardLayer() {
  return useContext(CardLayerCtx);
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
  const [raised, setRaised] = useState(false);

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
      className="group relative flex w-full flex-col rounded-[6px] border p-4 text-left shadow-sm transition-transform hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wr-value-blue,#0077FF)]/50"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface, zIndex: raised ? 60 : undefined }}
      onClick={onClick}
      onMouseLeave={() => setRaised(false)}
    >
      <CardLayerCtx.Provider value={{ setRaised }}>{content}</CardLayerCtx.Provider>
    </button>
  );
}

/* ========================================================================================
 * ValueDelta + SegTabs
 * ====================================================================================== */
function ValueDelta({ delta, invert = false, unit = "", ariaId, explain }: { delta?: number; invert?: boolean; unit?: "%" | "pp" | ""; ariaId?: string; explain?: string }) {
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

function SegTabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs" style={{ borderColor: TOKENS.border }}>
      {items.map((it) => (
        <button
          key={it.value}
          onClick={(e) => {
            e.stopPropagation();
            onChange(it.value);
          }}
          className={`rounded-full px-2.5 py-1 transition ${value === it.value ? "bg-[#F5F7FA] font-semibold" : "text-[color:var(--wr-muted,#6B7280)]"}`}
          aria-pressed={value === it.value}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ========================================================================================
 * Smart tooltips (chart & list) — high z-index; left-flip option for tight spaces
 * ====================================================================================== */
function SmartTooltip({
  active,
  label,
  payload,
  valueFmt,
  labelFmt,
  title,
}: any & { valueFmt?: (v: number, name?: string) => string; labelFmt?: (l: any) => string; title?: string }) {
  if (!active) return null;
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none", maxWidth: 260 }}
    >
      {title ? (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {title}
        </div>
      ) : null}
      {label !== undefined ? (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {labelFmt ? labelFmt(label) : String(label)}
        </div>
      ) : null}
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

/* ========================================================================================
 * Sparks / Charts
 *  - Card raises on hover so tooltip appears above other cards
 *  - For right-edge sparks, preferLeft places popover left of pointer via CSS transform
 * ====================================================================================== */
function SparkArea({
  series,
  aria,
  color = TOKENS.valueBlue,
  pastel = TOKENS.pastelBlue,
  preferLeft = false,
}: {
  series?: SeriesPoint[];
  aria: string;
  color?: string;
  pastel?: string;
  preferLeft?: boolean;
}) {
  const layer = useCardLayer();
  const data = (series ?? []).map((p) => ({ date: p.t, value: p.v }));
  const gradId = `grad-${aria.replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2)}`;
  return (
    <div
      className="h-16 w-[10.75rem]"
      role="img"
      aria-label={aria}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
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
            wrapperStyle={{
              zIndex: 9999,
              transform: preferLeft ? "translateX(-100%)" : undefined, // shift left of pointer when needed
            }}
            cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Bubble chart (Overlap vs Avg Pos; bubble size = uniqueComp; color = SOV%) */
function OverlapBubble({
  rows,
}: {
  rows: CompetitorRow[];
}) {
  const layer = useCardLayer();
  const maxOverlap = Math.max(1, ...rows.map((r) => r.overlapCount));
  const maxUniqueC = Math.max(1, ...rows.map((r) => r.uniqueCompCount));
  const data = rows.map((r) => ({
    x: r.overlapCount,
    y: r.avgOverlapPos,
    z: Math.max(6, (r.uniqueCompCount / maxUniqueC) * 120 + 20), // bubble radius range for ZAxis
    name: r.name,
    sov: r.sovPct,
  }));
  return (
    <div
      className="h-64 w-full"
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid stroke={TOKENS.border} />
          <XAxis type="number" dataKey="x" name="Overlap" tickFormatter={(v) => fmtInt(v)} />
          <YAxis type="number" dataKey="y" name="Avg Pos" domain={[1, "dataMax + 1"]} reversed />
          <ZAxis type="number" dataKey="z" range={[40, 180]} />
          <RTooltip
            content={
              <SmartTooltip
                title="Competitor"
                valueFmt={(v, n) => {
                  switch (n) {
                    case "Overlap":
                      return fmtInt(v as number, false);
                    case "Avg Pos":
                      return (v as number).toFixed(1);
                    case "SOV":
                      return fmtPct100(v as number, 1);
                    default:
                      return fmtInt(v as number, false);
                  }
                }}
              />
            }
            labelFormatter={() => ""}
            formatter={(_: any, __: any, p: any) => [
              // We will not use default formatter; SmartTooltip consumes payload differently
              "",
            ]}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{
              zIndex: 9999,
              transform: "translateX(-100%)", // shift to left of pointer to keep inside card
            }}
          />
          <Scatter
            name="Competitors"
            data={data}
            fill={TOKENS.valueBlue}
            fillOpacity={0.35}
            stroke={TOKENS.border}
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ========================================================================================
 * Hover group to ensure single popover among stacked items
 * ====================================================================================== */
type HoverCtx = { activeId: string | null; setActiveId: (id: string | null) => void };
const HoverGroupCtx = createContext<HoverCtx | null>(null);
function HoverGroup({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const ctx = useMemo(() => ({ activeId, setActiveId }), [activeId]);
  return <HoverGroupCtx.Provider value={ctx}>{children}</HoverGroupCtx.Provider>;
}
function useHoverGroup() {
  return useContext(HoverGroupCtx);
}

/* ========================================================================================
 * Progress bars with smart popovers (single visible per group)
 * ====================================================================================== */
function ProgressBarSmart({
  id,
  value01,
  color = TOKENS.valueBlue,
  label,
  tooltipTitle,
  valueFmt = (v: number) => fmtPct01(v),
}: {
  id: string;
  value01: number;
  color?: string;
  label?: string;
  tooltipTitle?: string;
  valueFmt?: (v: number) => string;
}) {
  const g = useHoverGroup();
  const layer = useCardLayer();
  const v = Math.max(0, Math.min(1, value01));
  const visible = g?.activeId === id;
  return (
    <div
      className="relative"
      onMouseEnter={() => {
        g?.setActiveId(id);
        layer?.setRaised(true);
      }}
      onMouseLeave={() => {
        g?.setActiveId(null);
        layer?.setRaised(false);
      }}
      onFocus={() => {
        g?.setActiveId(id);
        layer?.setRaised(true);
      }}
      onBlur={() => {
        g?.setActiveId(null);
        layer?.setRaised(false);
      }}
      tabIndex={0}
      aria-label={tooltipTitle || label || "bar"}
    >
      <div className="h-2 w-full rounded bg-[color:var(--wr-border,#EFF0F6)]">
        <div className="h-2 rounded" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      {label && (
        <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
          {label}
        </div>
      )}
      {visible && (
        <div
          className="pointer-events-none absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-md border bg-white p-2 text-xs shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {tooltipTitle && (
            <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
              {tooltipTitle}
            </div>
          )}
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

/* Simple two-part stacked progress (Overlap vs Unique) */
function StackedProgress2({
  id,
  left01,
  right01,
  leftColor = TOKENS.valueBlue,
  rightColor = TOKENS.info,
  leftLabel = "Overlap",
  rightLabel = "Unique",
  title,
}: {
  id: string;
  left01: number;
  right01: number;
  leftColor?: string;
  rightColor?: string;
  leftLabel?: string;
  rightLabel?: string;
  title?: string;
}) {
  const g = useHoverGroup();
  const layer = useCardLayer();
  const visible = g?.activeId === id;
  return (
    <div
      className="relative"
      onMouseEnter={() => {
        g?.setActiveId(id);
        layer?.setRaised(true);
      }}
      onMouseLeave={() => {
        g?.setActiveId(null);
        layer?.setRaised(false);
      }}
      onFocus={() => {
        g?.setActiveId(id);
        layer?.setRaised(true);
      }}
      onBlur={() => {
        g?.setActiveId(null);
        layer?.setRaised(false);
      }}
      tabIndex={0}
    >
      <div className="h-2 w-full overflow-hidden rounded bg-[color:var(--wr-border,#EFF0F6)]">
        <div className="h-2" style={{ width: `${left01 * 100}%`, background: leftColor }} />
        <div className="h-2" style={{ width: `${right01 * 100}%`, background: rightColor }} />
      </div>
      {visible && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.border }}>
          {title && (
            <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
              {title}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: leftColor }} />
                <span style={{ color: TOKENS.muted }}>{leftLabel}</span>
              </div>
              <div className="font-semibold">{fmtPct01(left01)}</div>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: rightColor }} />
                <span style={{ color: TOKENS.muted }}>{rightLabel}</span>
              </div>
              <div className="font-semibold">{fmtPct01(right01)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================================
 * Small UI helpers
 * ====================================================================================== */
function Chip({ tone = "muted", children }: { tone?: "success" | "danger" | "muted"; children: React.ReactNode }) {
  const map =
    tone === "success"
      ? { color: TOKENS.success, bg: TOKENS.successPastel }
      : tone === "danger"
      ? { color: TOKENS.danger, bg: TOKENS.dangerPastel }
      : { color: TOKENS.muted, bg: "#F5F7FA" };
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: map.color, background: map.bg }}>
      {children}
    </span>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick?: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} className="rounded p-1 text-[#4286F5] hover:bg-[#EEF5FF]" onClick={onClick}>
      {children}
    </button>
  );
}

/* ========================================================================================
 * MAIN SECTION — Competitor Snapshot
 * ====================================================================================== */
export default function CompetitorSnapshotSection({
  data,
  trackedOnly = true,
  onExport,
  onRefresh,
  onAddCompetitor,
  onCompare,
  onTogglePin,
  onOpenGap,
  onOpenSerp,
  loading,
  className,
}: CompetitorSnapshotSectionProps) {
  const D = useMemo(() => data ?? makeMockCompetitorSnapshotData(), [data]);

  const [tfTab, setTfTab] = useStickyTab<"7d" | "30d" | "90d" | "12m">("wr:cs:tf", D.timeframe);
  const [devTab, setDevTab] = useStickyTab<"desktop" | "mobile">("wr:cs:dev", D.device);
  const [market, setMarket] = useState(D.market);
  const [onlyTracked, setOnlyTracked] = useState(trackedOnly);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"overlap" | "net" | "avgpos" | "sov">("overlap");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // filter/sort rows
  const rows = useMemo(() => {
    let r = [...D.competitors];
    if (onlyTracked) r = r.filter((x) => x.pinned);
    if (q) {
      const s = q.toLowerCase();
      r = r.filter((x) => x.name.toLowerCase().includes(s) || x.domain.toLowerCase().includes(s));
    }
    r.sort((a, b) => {
      let av = 0;
      let bv = 0;
      switch (sortBy) {
        case "overlap":
          av = a.overlapCount;
          bv = b.overlapCount;
          break;
        case "net":
          av = a.newKw - a.lostKw;
          bv = b.newKw - b.lostKw;
          break;
        case "avgpos":
          av = a.avgOverlapPos;
          bv = b.avgOverlapPos;
          break;
        case "sov":
          av = a.sovPct;
          bv = b.sovPct;
          break;
      }
      const d = av - bv;
      return sortDir === "asc" ? d : -d;
    });
    return r.slice(0, 10);
  }, [D.competitors, onlyTracked, q, sortBy, sortDir]);

  // overview aggregates
  const totals = useMemo(() => {
    const overlap = rows.reduce((a, r) => a + r.overlapCount, 0);
    const unique = rows.reduce((a, r) => a + r.uniqueCompCount + r.uniqueUsCount, 0);
    const sum = Math.max(1, overlap + unique);
    return {
      tracked: rows.length,
      overlap,
      unique,
      overlap01: overlap / sum,
      unique01: unique / sum,
      lastSync: "2h ago",
    };
  }, [rows]);

  return (
    <section className={className}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
          Competitor Snapshot
        </h3>
        <div className="flex items-center gap-2">
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
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white"
            style={{ background: TOKENS.valueBlue }}
            onClick={onAddCompetitor}
          >
            <Plus size={16} />
            Add Competitor
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SegTabs value={tfTab} onChange={setTfTab} items={[{ value: "7d", label: "7D" }, { value: "30d", label: "30D" }, { value: "90d", label: "90D" }, { value: "12m", label: "12M" }]} />
        <SegTabs value={devTab} onChange={setDevTab} items={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }]} />
        <div className="ml-1 flex items-center gap-2">
          <label className="text-xs" style={{ color: TOKENS.muted }}>
            Market
          </label>
          <select
            className="h-8 rounded border px-2 text-sm outline-none"
            style={{ borderColor: TOKENS.border }}
            value={market}
            onChange={(e) => setMarket(e.target.value)}
          >
            <option value="us">US</option>
            <option value="gb">UK</option>
            <option value="de">DE</option>
            <option value="in">IN</option>
            <option value="au">AU</option>
          </select>
        </div>
        <label className="ml-2 inline-flex cursor-pointer items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
          <input type="checkbox" checked={onlyTracked} onChange={(e) => setOnlyTracked(e.target.checked)} />
          Tracked only
        </label>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-[#9CA3AF]" />
          <input
            className="h-8 w-[260px] rounded border pl-8 pr-2 text-sm outline-none"
            style={{ borderColor: TOKENS.border }}
            placeholder="Search domain or brand…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

      {/* GRID */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* Overview (Tracked + Overlap vs Unique) */}
        <div className="col-span-12 lg:col-span-4">
          <CardShell
            title="Tracked Competitors"
            info="Counts reflect current filters (timeframe, device, market). Overlap vs Unique shows distribution across all tracked competitors."
            state={loading ? "loading" : "default"}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[22px] font-bold">
                  {fmtInt(totals.tracked, false)} / 10
                </div>
                <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                  Last sync: {totals.lastSync}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs" style={{ color: TOKENS.muted }}>
                      Overlap
                    </div>
                    <div className="text-sm font-semibold">{fmtInt(totals.overlap, false)}</div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: TOKENS.muted }}>
                      Unique (us+them)
                    </div>
                    <div className="text-sm font-semibold">{fmtInt(totals.unique, false)}</div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <HoverGroup>
                  <StackedProgress2
                    id="ovr-ol-vs-uniq"
                    left01={totals.overlap01}
                    right01={totals.unique01}
                    leftColor={TOKENS.valueBlue}
                    rightColor={TOKENS.info}
                    leftLabel="Overlap"
                    rightLabel="Unique"
                    title="Overlap vs Unique"
                  />
                </HoverGroup>
              </div>
            </div>
          </CardShell>
        </div>

        {/* Overlap vs Opportunity bubble */}
        <div className="col-span-12 lg:col-span-8">
          <CardShell
            title="Overlap vs Opportunity"
            info="X: Overlapping keywords • Y: Average position on overlap (lower is better) • Bubble: Unique-to-competitor size • Color intensity: SOV%"
            state={loading ? "loading" : "default"}
          >
            <OverlapBubble rows={rows} />
          </CardShell>
        </div>

        {/* Table */}
        <div className="col-span-12">
          <CardShell
            title="Tracked Competitors (Top 10)"
            info="Overlap and movement across your tracked terms. Sort to explore changes quickly."
            state={loading ? "loading" : "default"}
            headerRight={
              <div className="flex items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
                Sort:
                <SegTabs
                  value={sortBy}
                  onChange={(v) => setSortBy(v)}
                  items={[
                    { value: "overlap", label: "Overlap" },
                    { value: "net", label: "New−Lost" },
                    { value: "avgpos", label: "Avg Pos" },
                    { value: "sov", label: "SOV%" },
                  ] as any}
                />
                <SegTabs value={sortDir} onChange={setSortDir} items={[{ value: "desc", label: "Desc" }, { value: "asc", label: "Asc" }]} />
              </div>
            }
          >
            <div className="max-h-[560px] overflow-auto rounded border" style={{ borderColor: TOKENS.border }}>
              <HoverGroup>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      {["Competitor", "Overlap", "New vs Lost", "Avg Pos (Overlap)", "SOV%", "Trend", "Top page movers", "Actions"].map((h, i) => (
                        <th
                          key={i}
                          className={`px-3 py-2 text-left ${i > 0 ? "whitespace-nowrap" : ""}`}
                          style={{ borderBottom: `1px solid ${TOKENS.border}`, color: TOKENS.muted }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const net = r.newKw - r.lostKw;
                      const posDelta = -Math.round(((Math.random() - 0.5) * 10) * 10) / 10; // mock delta for demo
                      const sov01 = Math.max(0, Math.min(1, r.sovPct / 100));
                      const posTone = toneByGoodBad(posDelta, true); // lower is better
                      return (
                        <tr key={r.id} className="hover:bg-[#F8FAFC]">
                          {/* Competitor */}
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 shrink-0 overflow-hidden rounded">
                                <img
                                  src={r.faviconUrl ?? `https://www.google.com/s2/favicons?domain=${r.domain}`}
                                  alt=""
                                  className="h-full w-full"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium">{r.name}</div>
                                <div className="truncate text-xs" style={{ color: TOKENS.muted }}>
                                  {r.domain} {r.pinned ? <span className="ml-1"><Chip>Tracked</Chip></span> : null}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Overlap */}
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold">{fmtInt(r.overlapCount, false)}</div>
                              <span
                                className="rounded px-1.5 py-0.5 text-xs font-semibold"
                                style={{
                                  color: toneByGoodBad(r.overlapDelta),
                                  background: r.overlapDelta >= 0 ? TOKENS.successPastel : TOKENS.dangerPastel,
                                }}
                                title="Δ vs prior"
                              >
                                {caret(r.overlapDelta)} {Math.abs(r.overlapDelta)}
                              </span>
                            </div>
                          </td>

                          {/* New vs Lost */}
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-2">
                              <Chip tone="success">+{fmtInt(r.newKw, false)}</Chip>
                              <Chip tone="danger">−{fmtInt(r.lostKw, false)}</Chip>
                              <span className="text-xs" style={{ color: TOKENS.muted }}>
                                net {net >= 0 ? "+" : ""}
                                {net}
                              </span>
                            </div>
                          </td>

                          {/* Avg Pos (Overlap) */}
                          <td className="px-3 py-2 align-top text-right">
                            <div className="font-medium">{r.avgOverlapPos.toFixed(1)}</div>
                            <div className="text-[11px]" style={{ color: posTone }}>
                              {caret(-posDelta)} {Math.abs(posDelta).toFixed(1)} (lower better)
                            </div>
                          </td>

                          {/* SOV% (progress + popover) */}
                          <td className="px-3 py-2 align-top">
                            <div className="w-28">
                              <ProgressBarSmart
                                id={`sov-${r.id}`}
                                value01={sov01}
                                color={TOKENS.valueBlue}
                                tooltipTitle="Share of Voice"
                                valueFmt={(v) => fmtPct100(v * 100, 1)}
                              />
                            </div>
                          </td>

                          {/* Trend spark (SOV%) */}
                          <td className="px-3 py-2 align-top">
                            <SparkArea series={r.trendSeries} aria={`${r.name} SOV trend`} color={TOKENS.valueBlue} pastel={TOKENS.pastelBlue} preferLeft />
                          </td>

                          {/* Top page movers chips with small popover title via title attr (lightweight) */}
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {r.topMovers.slice(0, 3).map((m, i) => {
                                const tone = m.delta >= 0 ? TOKENS.success : TOKENS.danger;
                                const bg = m.delta >= 0 ? TOKENS.successPastel : TOKENS.dangerPastel;
                                const slug = (m.title || m.url).replace(/^https?:\/\/[^/]+/i, "");
                                return (
                                  <span
                                    key={i}
                                    className="max-w-[180px] truncate rounded-full px-2 py-0.5 text-[11px] font-medium"
                                    style={{ color: tone, background: bg }}
                                    title={`${m.delta >= 0 ? "▲" : "▼"} ${Math.abs(m.delta)} pp — ${m.url}`}
                                  >
                                    {m.delta >= 0 ? "▲" : "▼"} {Math.abs(m.delta)} pp · {slug}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-1.5">
                              <button
                                className="rounded-full border px-2.5 py-1 text-xs"
                                style={{ borderColor: TOKENS.border }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCompare?.(r.id);
                                }}
                              >
                                <AnalyzeIcon className="mr-1 inline-block h-3.5 w-3.5" />
                                Compare / Analyze
                              </button>
                              <IconBtn
                                label={r.pinned ? "Remove from Competitor Tracker" : "Add to Competitor Tracker"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePin?.(r.id, !r.pinned);
                                }}
                              >
                                {r.pinned ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                              </IconBtn>
                              <IconBtn
                                label="View Shared Keywords (Gap Analyzer)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenGap?.(r.id);
                                }}
                              >
                                <Share2 className="h-4 w-4" />
                              </IconBtn>
                              <IconBtn
                                label="View SERP Snapshot"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenSerp?.(r.id);
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </IconBtn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </HoverGroup>
            </div>
          </CardShell>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================================
 * MOCK DATA (deterministic)
 * ====================================================================================== */
function makeMockCompetitorSnapshotData(): CompetitorSnapshotData {
  const comps: CompetitorRow[] = [
    {
      id: "c1",
      name: "Ahrefs",
      domain: "ahrefs.com",
      pinned: true,
      overlapCount: 1342,
      overlapDelta: 87,
      uniqueCompCount: 2019,
      uniqueUsCount: 1450,
      newKw: 238,
      lostKw: 151,
      avgOverlapPos: 6.4,
      sovPct: 18.7,
      trendSeries: makeSeries(16, 18, 0.2, "ahrefs"),
      topMovers: [
        { url: "/blog/keyword-research", delta: 12, icon: "up" },
        { url: "/academy/seo-basics", delta: -8, icon: "down" },
        { url: "/blog/backlinks", delta: 5, icon: "up" },
      ],
    },
    {
      id: "c2",
      name: "Semrush",
      domain: "semrush.com",
      pinned: true,
      overlapCount: 1280,
      overlapDelta: -42,
      uniqueCompCount: 1890,
      uniqueUsCount: 1602,
      newKw: 110,
      lostKw: 152,
      avgOverlapPos: 7.1,
      sovPct: 17.4,
      trendSeries: makeSeries(16, 17, 0.25, "semrush"),
      topMovers: [
        { url: "/blog/seo-basics", delta: -6, icon: "down" },
        { url: "/blog/rank-tracker", delta: 9, icon: "up" },
      ],
    },
    {
      id: "c3",
      name: "Moz",
      domain: "moz.com",
      pinned: true,
      overlapCount: 980,
      overlapDelta: 21,
      uniqueCompCount: 990,
      uniqueUsCount: 1130,
      newKw: 120,
      lostKw: 99,
      avgOverlapPos: 8.3,
      sovPct: 12.6,
      trendSeries: makeSeries(16, 12, 0.22, "moz"),
      topMovers: [
        { url: "/learn/seo/what-is-seo", delta: 7, icon: "up" },
        { url: "/blog/technical-seo", delta: -4, icon: "down" },
      ],
    },
    {
      id: "c4",
      name: "Backlinko",
      domain: "backlinko.com",
      pinned: false,
      overlapCount: 620,
      overlapDelta: 18,
      uniqueCompCount: 720,
      uniqueUsCount: 860,
      newKw: 90,
      lostKw: 72,
      avgOverlapPos: 9.2,
      sovPct: 9.8,
      trendSeries: makeSeries(16, 9, 0.2, "backlinko"),
      topMovers: [{ url: "/seo-copywriting", delta: 4, icon: "up" }],
    },
    {
      id: "c5",
      name: "HubSpot",
      domain: "blog.hubspot.com",
      pinned: true,
      overlapCount: 1510,
      overlapDelta: 64,
      uniqueCompCount: 2400,
      uniqueUsCount: 1900,
      newKw: 210,
      lostKw: 133,
      avgOverlapPos: 6.8,
      sovPct: 19.2,
      trendSeries: makeSeries(16, 19, 0.22, "hubspot"),
      topMovers: [
        { url: "/marketing/seo-guide", delta: 10, icon: "up" },
        { url: "/sales/lead-gen", delta: -5, icon: "down" },
      ],
    },
    {
      id: "c6",
      name: "Yoast",
      domain: "yoast.com",
      pinned: false,
      overlapCount: 540,
      overlapDelta: -12,
      uniqueCompCount: 840,
      uniqueUsCount: 740,
      newKw: 64,
      lostKw: 76,
      avgOverlapPos: 10.5,
      sovPct: 6.1,
      trendSeries: makeSeries(16, 6, 0.18, "yoast"),
      topMovers: [{ url: "/seo-analysis", delta: -3, icon: "down" }],
    },
  ];

  return {
    timeframe: "30d",
    device: "desktop",
    market: "us",
    rankThreshold: 20,
    competitors: comps,
  };
}


