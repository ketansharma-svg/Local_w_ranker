"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Info,
  CalendarDays,
  LayoutGrid,
  Palette,
  Download,
  Bookmark,
  Filter as FilterIcon,
  ChevronDown,
  Link as LinkIcon,
  GitBranch,
  Link2,
  Unlink,
  Gauge,
  MoreHorizontal,
  X,
  Map as MapIcon,
} from "lucide-react";
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
  ReferenceLine,
  Sector,
  Rectangle,
} from "recharts";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

/* ----------------------------------------------------------------------------
 * TOKENS / FONT
 * --------------------------------------------------------------------------*/
const TOKENS = {
  surface: "#FFFFFF",
  app: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",

  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",

  success: "#10B981",
  successPastel: "rgba(16,185,129,0.15)",

  warning: "#F59E0B",
  warningPastel: "rgba(245,158,11,0.15)",

  danger: "#EF4444",
  dangerPastel: "rgba(239,68,68,0.15)",

  info: "#3B82F6",
  infoPastel: "rgba(59,130,246,0.15)",

  brand: "#008CCD", // NEW: Wranker brand (icons & branded buttons)
} as const;

const WR_RADIUS = 6;

/** Tooltip wrapper — force above everything */
const TOOLTIP_WRAPPER_STYLE: React.CSSProperties = {
  zIndex: 2147483647, // sit above any card/nearby card
  pointerEvents: "none",
};
const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: `1px solid ${TOKENS.border}`,
  borderRadius: 6,
  boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
  opacity: 1,
};

/* ----------------------------------------------------------------------------
 * HELPERS
 * --------------------------------------------------------------------------*/
const intFmt = new Intl.NumberFormat();
function fmtInt(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return intFmt.format(n);
}
function fmtPct01(p?: number | null, digits = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(digits)}%`;
}
function caret(delta?: number) {
  if (typeof delta !== "number" || Number.isNaN(delta) || delta === 0) return "—";
  return delta > 0 ? "▲" : "▼";
}
function toneByGoodBad(delta?: number, invert = false) {
  if (typeof delta !== "number") return TOKENS.muted;
  const good = invert ? delta < 0 : delta > 0;
  return good ? TOKENS.success : TOKENS.danger;
}
function toDateLabel(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

/* ----------------------------------------------------------------------------
 * TOOLTIP ATOMS (Sparks & Donuts)
 * --------------------------------------------------------------------------*/
function SmartTooltip({
  active,
  label,
  payload,
  valueFmt,
}: any & { valueFmt?: (v: number, name?: string) => string }) {
  if (!active) return null;
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none" }}
    >
      {label !== undefined && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {toDateLabel(String(label))}
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
              {valueFmt ? valueFmt(p.value as number, p.name) : fmtInt(p.value as number)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

/* ----------------------------------------------------------------------------
 * SPARKS (Area/Bars)
 * --------------------------------------------------------------------------*/
type SeriesPoint = { t: string; v: number };

function SparkArea({
  series,
  aria,
  color = TOKENS.valueBlue,
  pastel = TOKENS.pastelBlue,
  showMean = false,
}: {
  series: SeriesPoint[];
  aria: string;
  color?: string;
  pastel?: string;
  showMean?: boolean;
}) {
  const data = series.map((p) => ({ date: p.t, value: p.v }));
  const mean =
    data.length > 0 ? data.reduce((s, d) => s + (d.value ?? 0), 0) / data.length : 0;
  const gradId = `grad-${aria.replace(/\s/g, "")}`;
  return (
    <div className="h-16 " role="img" aria-label={aria}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            wrapperStyle={TOOLTIP_WRAPPER_STYLE}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            content={<SmartTooltip valueFmt={(v) => fmtInt(v)} />}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
            cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          {showMean && <ReferenceLine y={mean} stroke={TOKENS.muted} strokeDasharray="3 3" />}
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={pastel} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SparkBars({
  series,
  aria,
  color = TOKENS.valueBlue,
  interactive = false, // animate on hover when true
}: {
  series: SeriesPoint[];
  aria: string;
  color?: string;
  interactive?: boolean;
}) {
  const data = series.map((p) => ({ date: p.t, value: p.v }));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const BarShape = (props: any) => {
    const { index } = props;
    const hovered = interactive && index === activeIndex;
    return (
      <Rectangle
        {...props}
        radius={[6, 6, 0, 0]}
        className="transition-transform duration-150 ease-out"
        style={{
          transform: hovered ? "translateY(-2px) scaleY(1.04)" : undefined,
          filter: hovered ? "drop-shadow(0 4px 10px rgba(0,0,0,0.12))" : undefined,
        }}
      />
    );
  };

  return (
    <div className="h-16 " role="img" aria-label={aria}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          onMouseMove={(state: any) => {
            if (typeof state?.activeTooltipIndex === "number") setActiveIndex(state.activeTooltipIndex);
          }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            wrapperStyle={TOOLTIP_WRAPPER_STYLE}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            content={<SmartTooltip valueFmt={(v) => fmtInt(v)} />}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
            cursor={{ fill: "rgba(0,0,0,0.06)" }}
          />
          <Bar dataKey="value" fill={color} shape={BarShape} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * DONUT — STACKED (parts .value in 0..1) with precise hover behavior
 * --------------------------------------------------------------------------*/
function DonutSplit({
  parts,
  aria,
  title,
  size = 55,
}: {
  parts: { name: string; value: number; color: string }[];
  aria: string;
  title?: string;
  size?: number;
}) {
  const data = parts.map((p) => ({ ...p, v: Math.max(0, Math.min(1, p.value)) }));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [ttVisible, setTtVisible] = useState(false);

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 1} /* pop outward */
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <div className="h-20 w-20 shrink-0" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <PieChart
          onMouseEnter={() => setTtVisible(true)}
          onMouseMove={(state: any) => {
            const ai = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : null;
            if (ai === null) {
              setActiveIndex(null);
              setTtVisible(false);
            }
          }}
          onMouseLeave={() => {
            setActiveIndex(null);      // immediately reset highlight
            setTtVisible(false);       // immediately hide tooltip
          }}
        >
          <RTooltip
            wrapperStyle={{ ...TOOLTIP_WRAPPER_STYLE, visibility: ttVisible ? "visible" : "hidden" }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            content={<DonutTooltip title={title} parts={data} valueFmt={(v) => fmtPct01(v)} />}
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
            activeIndex={activeIndex ?? undefined}
            activeShape={renderActiveShape}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.color}
                // No CSS transitions → no lingering animations when leaving the chart
                onMouseEnter={() => {
                  setActiveIndex(i);
                  setTtVisible(true);
                }}
                onMouseLeave={() => {
                  setActiveIndex(null);
                  setTtVisible(false);
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * VALUE + DELTA
 * --------------------------------------------------------------------------*/
function ValueDelta({
  value,
  valueSuffix,
  delta,
  invert = false,
  ariaId,
}: {
  value: string;
  valueSuffix?: string;
  delta?: number;
  invert?: boolean;
  ariaId?: string;
}) {
  return (
    <div>
      <output
        className="block text-[28px] font-bold leading-tight"
        style={{ color: TOKENS.valueBlue }}
        aria-describedby={ariaId}
      >
        {value}
        {valueSuffix ?? ""}
      </output>
      <div id={ariaId} className="mt-1 text-xs" style={{ color: toneByGoodBad(delta, invert) }}>
        {caret(delta)} {typeof delta === "number" ? Math.abs(delta).toFixed(1) : "—"}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * CARD SHELL
 * --------------------------------------------------------------------------*/
function Kebab({ onCreateTask }: { onCreateTask?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-40 rounded-md border bg-white py-1 text-sm shadow"
          style={{ borderColor: TOKENS.border }}
          onMouseLeave={() => setOpen(false)}
        >
          <button className="block w-full px-3 py-2 text-left opacity-50 cursor-not-allowed" disabled>
            Add to Report
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => { setOpen(false); onCreateTask?.(); }}
          >
            Create Task
          </button>
        </div>
      )}
    </div>
  );
}

function Title({ icon: Icon, text, info }: { icon: React.ComponentType<{ size?: number,className:any  }>; text: string; info?: string }) {
  return (
    <div className="relative flex min-w-0 items-center gap-2 group/title">
      {/* BRAND color for all icons */}
      <Icon size={16} className="text-[color:var(--wr-brand,#008CCD)]" />
      <div className="truncate text-[13px] font-semibold">{text}</div>
      {info ? <Info size={15} className="text-[#9CA3AF]" /> : null}
      {info ? (
        <div
          role="tooltip"
          className="invisible group-hover/title:visible absolute left-0 top-5 z-50 w-[260px] rounded-md border bg-white p-2 text-xs shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}

function Card({ icon, title, info, children, onClick, onCreateTask, }: { icon: any; title: string; info?: string; children: React.ReactNode; onClick?: () => void; onCreateTask?: () => void; }) {

  return (
    <button
      type="button"
      className="group relative z-0 flex w-full flex-col rounded-[6px] border p-4 text-left shadow-sm transition-transform hover:-translate-y-[2px] hover:z-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wr-value-blue,#0077FF)]/50"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <Title icon={icon} text={title} info={info} />
        <Kebab onCreateTask={onCreateTask} />
      </div>
      <div className="mt-2">{children}</div>
    </button>
  );
}

/* ----------------------------------------------------------------------------
 * MOCK DATA (snapshots + history)
 * --------------------------------------------------------------------------*/
type Summary = {
  lastCrawl: string;
  historyDates: string[];
  nodesTotal: number[];
  edgesTotal: number[];
  avgPils: number[];
  orphanPct: number[]; // 0..1 per crawl
  brokenPct: number[]; // edges broken %
  redirectPct: number[]; // edges redirected %
  // Snapshot breakdowns (last point)
  nodesBreakdown: { active: number; redirects: number; errors: number };
  edgesBreakdown: { ok: number; redirected: number; broken: number };
  orphanCount: number;
  danglingCount: number;
  pilsBuckets: { high: number; mid: number; low: number }; // fractions 0..1
};

/* ----------------------------------------------------------------------------
 * HEADER CONTROLS (snapshot/layout/color/filters/actions)
 * --------------------------------------------------------------------------*/
type LayoutMode = "force" | "hierarchical" | "radial";
type ColorMode = "PILS" | "AQS" | "Depth" | "Traffic";

type Filters = {
  orphansOnly: boolean;
  pilsMax?: number;
  depthMin?: number;
};

function SegGroup<T extends string>({
  value,
  onChange,
  items,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { key: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs"
      style={{ borderColor: TOKENS.border }}
    >
      {items.map((it) => (
        <button
          key={String(it.key)}
          onClick={() => onChange(it.key)}
          className={`rounded-full px-2.5 py-1 transition ${
            value === it.key ? "bg-[#F5F7FA] font-semibold" : "text-[color:var(--wr-muted,#6B7280)]"
          }`}
          aria-pressed={value === it.key}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Dropdown({
  label,
  valueLabel,
  items,
  onSelect,
  icon: Icon,
  width = 220,
}: {
  label: string;
  valueLabel: string;
  items: { key: string; label: string }[];
  onSelect: (k: string) => void;
  icon: React.ComponentType<{ size?: number , className:any;}>;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-2.5 text-sm"
        style={{ borderColor: TOKENS.border }}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
      >
        {/* BRAND color for leading icon */}
        <Icon className="h-4 w-4 text-[color:var(--wr-brand,#008CCD)]" />
        <span className="font-medium">{valueLabel}</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 max-h-80 overflow-auto rounded-md border bg-white py-1 text-sm shadow"
          style={{ borderColor: TOKENS.border, width }}
          onMouseLeave={() => setOpen(false)}
        >
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => {
                onSelect(it.key);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left hover:bg-gray-50"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * MAIN — Link Map KPI Section (no left rail)
 * --------------------------------------------------------------------------*/
export default function LinkMapKpiSection({
  kpis,
  trends,
  loading: loadingProp,
  error,
}) {
  const loading = typeof loadingProp === "boolean" && loadingProp
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  const data = useMemo(() => {
    if (kpis) {
      const lastNodes = kpis.nodes.total;
      const lastEdges = kpis.edges.total;
      return {
        lastCrawl: new Date().toISOString(),
        historyDates: trends?.historyDates ?? [new Date().toISOString()],
        nodesTotal: trends?.nodesTotal ?? [lastNodes],
        edgesTotal: trends?.edgesTotal ?? [lastEdges],
        avgPils: trends?.avgPils ?? [kpis.pils.avg],
        orphanPct: trends?.orphanPct ?? [kpis.orphans.orphan / Math.max(1, kpis.orphans.total)],
        brokenPct: trends?.brokenPct ?? [kpis.edges.broken / Math.max(1, lastEdges)],
        redirectPct: trends?.redirectPct ?? [kpis.edges.redirected / Math.max(1, lastEdges)],
        nodesBreakdown: {
          active: kpis.nodes.active,
          redirects: kpis.nodes.redirects,
          errors: kpis.nodes.errors,
        },
        edgesBreakdown: {
          ok: kpis.edges.ok,
          redirected: kpis.edges.redirected,
          broken: kpis.edges.broken,
        },
        orphanCount: kpis.orphans.orphan,
        danglingCount: kpis.orphans.dangling,
        pilsBuckets: {
          high: kpis.pils.buckets.high / 100,
          mid: kpis.pils.buckets.mid / 100,
          low: kpis.pils.buckets.low / 100,
        },
      };
    }
    return null;
  }, [kpis, trends]);
  // header state
  const [snapshot, setSnapshot] = useState("latest");
  const [layout, setLayout] = useState<LayoutMode>("force");
  const [color, setColor] = useState<ColorMode>("PILS");
  const [showFilterTray, setShowFilterTray] = useState(false);
  const [filters, setFilters] = useState<Filters>({ orphansOnly: false });
  const chips = useMemo(() => {
    const xs: string[] = [];
    if (filters.orphansOnly) xs.push("Orphans only");
    if (typeof filters.pilsMax === "number") xs.push(`PILS ≤ ${filters.pilsMax}`);
    if (typeof filters.depthMin === "number") xs.push(`Depth ≥ ${filters.depthMin}`);
    return xs;
  }, [filters]);

  // trends (build series from data)
  const S = useMemo(() => {
    if (!data) return null;
    const dates = data.historyDates;
    const nodesSeries: SeriesPoint[] = dates.map((t, i) => ({ t, v: data.nodesTotal[i] }));
    const edgesIssuePctSeries: SeriesPoint[] = dates.map((t, i) => ({
      t,
      v: Math.round((data.brokenPct[i] + data.redirectPct[i]) * 1000) / 10, // % with 1 decimal
    }));
    const orphanComboSeries: SeriesPoint[] = dates.map((t, i) => ({
      t,
      v: Math.round((data.orphanPct[i] + 0.07) * 1000) / 10, // demo add dangling 7%
    }));
    const pilsSeries: SeriesPoint[] = dates.map((t, i) => ({ t, v: data.avgPils[i] }));
    return { nodesSeries, edgesIssuePctSeries, orphanComboSeries, pilsSeries };
  }, [data]);

  // helpers
  const clearFilters = () => setFilters({ orphansOnly: false, pilsMax: undefined, depthMin: undefined });

  return (
    <div
      className="w-full"
      style={{
        background: TOKENS.app,
        color: TOKENS.text,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      {/* Sticky header (no left rail) */}
      <div className="top-0 border-b bg-white" style={{ borderColor: TOKENS.border }}>
        <div className="w-full px-4 pt-3 pb-2">
          {/* Title + actions */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-semibold text-[color:var(--wr-text,#111827)] flex items-center gap-2">
                  {/* BRAND icon for section title in header */}
                  <LinkIcon className="h-5 w-5 text-[color:var(--wr-brand,#008CCD)]" />
                  Link Map
                </h2>
                <div className="relative group">
                  <Info size={16} className="text-[color:var(--wr-muted,#6B7280)]" />
                  <div
                    className="invisible group-hover:visible absolute left-0 top-5 z-50 w-[260px] rounded-md border bg-white p-2 text-xs shadow"
                    style={{ borderColor: TOKENS.border }}
                  >
                    Internal linking structure — hubs, orphans, redirects & broken paths. Colors reflect current mode.
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-[color:var(--wr-muted,#6B7280)]">
                Snapshot composition (donut) + trend for key link metrics. No toggles.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Dropdown
                label="Snapshot"
                valueLabel={snapshot === "latest" ? "Latest crawl" : snapshot}
                icon={CalendarDays}
                items={[
                  { key: "latest", label: "Latest crawl" },
                  { key: "weekly-ago", label: "One week ago" },
                ]}
                onSelect={setSnapshot}
              />
              <SegGroup<LayoutMode>
                ariaLabel="Layout"
                value={layout}
                onChange={setLayout}
                items={[
                  { key: "force", label: "Force" },
                  { key: "hierarchical", label: "Hierarchical" },
                  { key: "radial", label: "Radial" },
                ]}
              />
              <SegGroup<ColorMode>
                ariaLabel="Color mode"
                value={color}
                onChange={setColor}
                items={[
                  { key: "PILS", label: "PILS" },
                  { key: "AQS", label: "AQS" },
                  { key: "Depth", label: "Depth" },
                  { key: "Traffic", label: "Traffic" },
                ]}
              />

              <button
                className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm"
                style={{ borderColor: TOKENS.border }}
                onClick={() => setShowFilterTray((v) => !v)}
                aria-expanded={showFilterTray}
                aria-controls="wr-filter-tray"
                title="Filters"
              >
                <FilterIcon className="mr-1 h-4 w-4 text-[color:var(--wr-brand,#008CCD)]" /> Filters
              </button>

              {/* BRAND export button: white icon/text on brand background */}
              <button
                className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm text-white"
                style={{ background: TOKENS.brand, border: "1px solid transparent" }}
                title="Export"
                disabled
              >
                <Download className="mr-1 h-4 w-4 text-white" />
                Export
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm"
                style={{ borderColor: TOKENS.border }}
                title="Saved Views"
              >
                <Bookmark className="mr-1 h-4 w-4 text-[color:var(--wr-brand,#008CCD)]" />
                Views
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2" role="list" aria-label="Active filters">
              {chips.map((c, i) => (
                <span
                  key={i}
                  role="listitem"
                  className="inline-flex items-center gap-1 rounded-[6px] border bg-[#F5F7FA] px-2 py-1 text-[13px]"
                  style={{ borderColor: TOKENS.border }}
                >
                  {c}
                  <button
                    onClick={() => {
                      const next: Filters = { ...filters };
                      if (c.startsWith("Orphans")) next.orphansOnly = false;
                      if (c.startsWith("PILS")) next.pilsMax = undefined;
                      if (c.startsWith("Depth")) next.depthMin = undefined;
                      setFilters(next);
                    }}
                    className="ml-1 text-[#9CA3AF] hover:text-[#4B5563]"
                    aria-label={`Remove ${c}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              <button className="text-[13px] underline text-[color:var(--wr-muted,#6B7280)]" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          )}

          {/* Filter tray */}
          {showFilterTray && (
            <div
              id="wr-filter-tray"
              role="region"
              aria-label="Filter editor"
              className="mt-2 rounded-[6px] border bg-white p-3"
              style={{ borderColor: TOKENS.border }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={filters.orphansOnly}
                    onChange={(e) => setFilters((f) => ({ ...f, orphansOnly: e.target.checked }))}
                  />
                  Orphans only
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-[14px] whitespace-nowrap">PILS ≤</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="e.g. 60"
                    value={typeof filters.pilsMax === "number" ? filters.pilsMax : ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Math.max(0, Math.min(100, Number(e.target.value)));
                      setFilters((f) => ({ ...f, pilsMax: v }));
                    }}
                    className="h-9 w-full rounded-[6px] border px-2"
                    style={{ borderColor: TOKENS.border }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[14px] whitespace-nowrap">Depth ≥</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 3"
                    value={typeof filters.depthMin === "number" ? filters.depthMin : ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Math.max(0, Number(e.target.value));
                      setFilters((f) => ({ ...f, depthMin: v }));
                    }}
                    className="h-9 w-full rounded-[6px] border px-2"
                    style={{ borderColor: TOKENS.border }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-[12px]" style={{ color: TOKENS.muted }}>
                  Filters persist in URL in the full app. In this demo they are local only.
                </div>
                <div className="flex gap-2">
                  <button
                    className="h-9 rounded-[6px] border px-3 text-sm"
                    style={{ borderColor: TOKENS.border }}
                    onClick={clearFilters}
                  >
                    Reset
                  </button>
                  <button
                    className="h-9 rounded-[6px] px-3 text-sm text-white"
                    style={{ background: TOKENS.valueBlue }}
                    onClick={() => setShowFilterTray(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION HEADER — Map Summary (with branded icon) */}
      {/* <div className="mx-auto max-w-6xl px-4 pt-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold flex items-center gap-2" style={{ color: TOKENS.text }}>
            <MapIcon className="h-4 w-4 text-[color:var(--wr-brand,#008CCD)]" />
            Map Summary
          </h3>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm text-white"
            style={{ background: TOKENS.brand, border: "1px solid transparent" }}
            title="Export Map Summary"
            onClick={() => {
              alert("Export Map Summary");
            }}
          >
            <Download className="mr-1 h-4 w-4 text-white" />
            Export
          </button>
        </div>
      </div> */}

      {/* KPI Grid */}
      <div className="mt-2 w-full px-4 pb-4">
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {/* 1) Node Coverage — Active / Redirect / Error */}
          <div className="col-span-1">
            <Card
              icon={GitBranch}
              title="Node Coverage"
              info="Share of crawled nodes by status."
              onCreateTask={() =>
                openTaskDrawer({
                  title: "Node Coverage — review redirects & errors",
                  description: "Investigate coverage composition from Link Map KPIs. Prioritise redirected/error nodes.",
                  projectId: selectedProject?.id,
                  type: "createNew",
                })
              }            >
              {loading || !data || !S ? (
                <div className="mt-1 h-24 animate-pulse rounded-md bg-[color:var(--wr-border,#EFF0F6)]" />
              ) : (
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
                    <DonutSplit
                      aria="Node coverage"
                      title="Node Coverage"
                      parts={[
                        { name: "Active", value: data.nodesBreakdown.active / data.nodesTotal.at(-1)!, color: TOKENS.valueBlue },
                        { name: "Redirect", value: data.nodesBreakdown.redirects / data.nodesTotal.at(-1)!, color: TOKENS.info },
                        { name: "Error/Non‑HTML", value: data.nodesBreakdown.errors / data.nodesTotal.at(-1)!, color: TOKENS.warning },
                      ]}
                    />
                    <div className="text-center sm:text-left">
                      <ValueDelta
                        value={fmtInt(data.nodesTotal.at(-1))}
                        delta={(data.nodesTotal.at(-1)! - data.nodesTotal.at(-2)!)}
                        valueSuffix=""
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-0 overflow-hidden rounded-md ">
                    <SparkArea series={S.nodesSeries} aria="Nodes trend" showMean />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* 2) Link Health — OK / Redirected / Broken */}
          <div className="col-span-1">
            <Card
              icon={Link2}
              title="Link Health"
              info="Distribution of internal links by state."
              onCreateTask={() =>
                openTaskDrawer({
                  title: "Link Health — reduce redirects",
                  description: "Create a plan to replace redirected internal links with direct targets.",
                  projectId: selectedProject?.id,
                  type: "createNew",
                })
              }
            >
                {loading || !data || !S ? (
                <div className="mt-1 h-24 animate-pulse rounded-md bg-[color:var(--wr-border,#EFF0F6)]" />
              ) : (
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
                    <DonutSplit
                      aria="Link health"
                      title="Link Health"
                      parts={[
                        { name: "OK", value: data.edgesBreakdown.ok / data.edgesTotal.at(-1)!, color: TOKENS.success },
                        { name: "Redirected", value: data.edgesBreakdown.redirected / data.edgesTotal.at(-1)!, color: TOKENS.info },
                        { name: "Broken", value: data.edgesBreakdown.broken / data.edgesTotal.at(-1)!, color: TOKENS.danger },
                      ]}
                    />
                    <div className="text-center sm:text-left">
                      <ValueDelta
                        value={fmtPct01(
                          (data.edgesBreakdown.broken + data.edgesBreakdown.redirected) / data.edgesTotal.at(-1)!
                        )}
                        delta={
                          (data.brokenPct.at(-1)! + data.redirectPct.at(-1)!) * 100 -
                          (data.brokenPct.at(-2)! + data.redirectPct.at(-2)!) * 100
                        }
                        valueSuffix=""
                        invert
                        ariaId="linkhealth-delta"
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-0 overflow-hidden rounded-md xl:flex-1">
                    <SparkBars
                      series={S.edgesIssuePctSeries}
                      aria="Issue share trend (redirect+broken %)"
                      color={TOKENS.warning}
                      interactive
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* 3) Orphan & Dangling — Orphan / Dangling / Connected */}
          <div className="col-span-1">
            <Card
              icon={Unlink}
              title="Orphan & Dangling"
              info="Share of nodes with no inlinks (orphan) or no outlinks (dangling)."
              onCreateTask={() =>
                openTaskDrawer({
                  title: "Orphans & Dangling — fix navigation gaps",
                  description: "Identify orphan/dangling pages and propose contextual inlinks/outlinks.",
                  projectId: selectedProject?.id,
                  type: "createNew",
                })
              }
            >              {loading || !data || !S ? (
                <div className="mt-1 h-24 animate-pulse rounded-md bg-[color:var(--wr-border,#EFF0F6)]" />
              ) : (
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
                    <DonutSplit
                      aria="Orphan & Dangling"
                      title="Orphan & Dangling"
                      parts={[
                        { name: "Orphan", value: data.orphanCount / data.nodesTotal.at(-1)!, color: TOKENS.danger },
                        { name: "Dangling", value: data.danglingCount / data.nodesTotal.at(-1)!, color: TOKENS.warning },
                        {
                          name: "Connected",
                          value: Math.max(
                            0,
                            1 - data.orphanCount / data.nodesTotal.at(-1)! - data.danglingCount / data.nodesTotal.at(-1)!
                          ),
                          color: TOKENS.success,
                        },
                      ]}
                    />
                    <div className="text-center sm:text-left">
                      <ValueDelta
                        value={fmtPct01(
                          (data.orphanCount + data.danglingCount) / data.nodesTotal.at(-1)!
                        )}
                        delta={
                          (data.orphanPct.at(-1)! + 0.07) * 100 - (data.orphanPct.at(-2)! + 0.07) * 100
                        }
                        invert
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-0 overflow-hidden rounded-md xl:flex-1">
                    <SparkArea
                      series={S.orphanComboSeries}
                      aria="Orphan+Dangling trend"
                      color={TOKENS.warning}
                      pastel={TOKENS.warningPastel}
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* 4) PILS Quality — High / Mid / Low + Avg PILS trend */}
          <div className="col-span-1">
            <Card
              icon={Gauge}
              title="PILS Quality"
              info="Distribution of page-level internal link strength."
              onCreateTask={() =>
                openTaskDrawer({
                  title: "PILS — lift low‑quality pages",
                  description: "Target low PILS pages with new internal links from relevant hubs.",
                  projectId: selectedProject?.id,
                  type: "createNew",
                })
              }
            >              {loading || !data || !S ? (
                <div className="mt-1 h-24 animate-pulse rounded-md bg-[color:var(--wr-border,#EFF0F6)]" />
              ) : (
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
                    <DonutSplit
                      aria="PILS distribution"
                      title="PILS Quality"
                      parts={[
                        { name: "High (80–100)", value: data.pilsBuckets.high, color: TOKENS.success },
                        { name: "Medium (50–79)", value: data.pilsBuckets.mid, color: TOKENS.info },
                        { name: "Low (0–49)", value: data.pilsBuckets.low, color: TOKENS.warning },
                      ]}
                    />
                    <div className="text-center sm:text-left">
                      <ValueDelta
                        value={`${data.avgPils.at(-1)!.toFixed(1)}%`}
                        delta={data.avgPils.at(-1)! - data.avgPils.at(-2)!}
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-0 overflow-hidden rounded-md xl:flex-1">
                    <SparkArea series={S.pilsSeries} aria="Avg PILS trend" />
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
