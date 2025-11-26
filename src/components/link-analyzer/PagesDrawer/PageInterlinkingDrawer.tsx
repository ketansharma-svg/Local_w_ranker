"use client";

/* Spec alignment: Project Overview / Drawer & KPI iconography and interactions — brand icon color, donut popovers, hover effects. :contentReference[oaicite:0]{index=0} */

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
  Sector, // for active/hover slice animation (In/Out donut)
} from "recharts";
import {
  FileSpreadsheet,
  PieChart as PieChartIcon,
  LineChart,
  Gauge,
  Link2,
  Upload,
  Trash2,
  ExternalLink,
} from "lucide-react";
import RemoveFromTrackingDemo from "./RemoveFromTrackingDemo";

/* ============================================================================
   TOKENS — aligned with recent panels (Inter, border, brand, pastels)
============================================================================ */
const TOKENS = {
  // Typography & base
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  panel: "#FFFFFF",
  panelAlt: "#F5F7FA",

  // Brand + info palette
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",

  // Status
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const BRAND = "#008CCD"; // icon brand color

const FONT_STACK =
  "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial";

/* ============================================================================
   HELPERS
============================================================================ */
const intFmt = new Intl.NumberFormat();
const pct = (v?: number, digits = 0) =>
  typeof v === "number" && isFinite(v) ? `${v.toFixed(digits)}%` : "—";
const caret = (v?: number) => (typeof v !== "number" || v === 0 ? "—" : v > 0 ? "▲" : "▼");
const toneColor = (v?: number, invert = false) => {
  if (typeof v !== "number") return TOKENS.muted;
  const good = invert ? v < 0 : v > 0;
  return good ? TOKENS.success : TOKENS.danger;
};
const toDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

/** Narrow bar size for compact right rail trend (per spec) */
const BAR_SIZE = 7;

/** Severity coloring (optional for PILS/AQS donut ring) */
function severityColorByThreshold(value: number) {
  if (value >= 80) return TOKENS.success;
  if (value >= 60) return TOKENS.warning;
  return TOKENS.danger;
}

/** Simple synthetic series (replace with real series) */
function makeTrend(points = 10, base = 65) {
  const start = new Date();
  start.setDate(start.getDate() - (points - 1));
  const arr: { date: string; value: number }[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    v = Math.max(0, v + (Math.random() - 0.5) * 8);
    arr.push({ date: d.toISOString().slice(0, 10), value: Math.round(v) });
  }
  return arr;
}

/** Merge two aligned series into one table for a multi-area chart */
function merge2Series(
  a: { date: string; value: number }[],
  b: { date: string; value: number }[],
  aKey = "Inlinks",
  bKey = "Outlinks"
) {
  const n = Math.min(a.length, b.length);
  return Array.from({ length: n }, (_, i) => ({
    date: a[i].date,
    [aKey]: a[i].value,
    [bKey]: b[i].value,
  }));
}

/* ============================================================================
   SMART TOOLTIPS (Donut + Trend) — colored swatch + label/value (+date)
   (Donut popovers show colored dot + value, per request)
============================================================================ */
function SmartTrendTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        {toDateLabel(String(label))}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: p.color }}
              />
              <span style={{ color: TOKENS.muted }}>{p.name ?? "Value"}</span>
            </div>
            <div className="font-semibold">{pct(p.value, 0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartDonutTooltip({
  active,
  payload,
  title,
}: {
  active?: boolean;
  payload?: any[];
  title?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const color = p.color;
  const name = p.name || p.payload?.name || "Value";
  const value = p.value;
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      {title && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {title}
        </div>
      )}
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
          <span style={{ color: TOKENS.muted }}>{name}</span>
        </div>
        {/* Values visible in the popover as requested */}
        <div className="font-semibold">{pct(value * 100, 0)}</div>
      </div>
    </div>
  );
}

/* ============================================================================
   PRIMITIVES — CTAs, Title rows, Donuts
============================================================================ */
function PrimaryCTA({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white cursor-pointer"
      style={{ background: TOKENS.valueBlue }}
    >
      {children}
    </button>
  );
}

function GhostCTA({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border cursor-pointer"
      style={{ borderColor: TOKENS.border, color: TOKENS.text, background: "#fff" }}
    >
      {children}
    </button>
  );
}

function SectionHeader({
  icon,
  title,
  rightSlot,
}: {
  icon: React.ReactNode;
  title: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="bg-white">
      {/* line separator only for section header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: TOKENS.border }}
      >
        <div className="flex items-center gap-2">
          {/* Minimal icon — no background, brand color */}
          <span className="inline-flex items-center justify-center">{icon}</span>
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            {title}
          </h3>
        </div>
        {rightSlot}
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[8px] border bg-white overflow-hidden"
      style={{ borderColor: TOKENS.border }}
    >
      {/* No line separator between title and body; same white background */}
      <div className="px-3 py-2 flex items-center gap-2">
        {/* Minimal icon — no background, brand color */}
        <span className="inline-flex items-center justify-center">{icon}</span>
        <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
          {title}
        </div>
      </div>
      <div className="p-3 bg-white">{children}</div>
    </div>
  );
}

/** Compact donut (0..100) with two-slice ring + subtle hover animation */
function Donut({ valuePct, color, title }: { valuePct: number; color: string; title?: string }) {
  const v01 = Math.max(0, Math.min(100, valuePct)) / 100;
  const data = [
    { name: "Value", value: v01 },
    { name: "Remaining", value: 1 - v01 },
  ];
  return (
    <div className="h-20 w-20 cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.04]">
      <ResponsiveContainer>
        <PieChart>
          <RTooltip content={<SmartDonutTooltip title={title} />} />
          <Pie
            data={data}
            dataKey="value"
            innerRadius={28}
            outerRadius={36}
            startAngle={90}
            endAngle={-270}
            stroke="transparent"
            isAnimationActive
          >
            <Cell fill={color} />
            <Cell fill={TOKENS.pastelBlue} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================================
   KPI CARDS (1) PILS  (2) AQS — donut + value/delta (left) + bar trend (right)
============================================================================ */
type Series = { date: string; value: number }[];

function KpiDonutBarCard({
  kpi,
  valuePct,
  deltaPct,
  series,
  useSeverity = false,
}: {
  kpi: "PILS" | "AQS";
  valuePct: number; // 0..100
  deltaPct: number; // +/- %
  series: Series; // date,value (0..100)
  useSeverity?: boolean;
}) {
  const ringColor = useSeverity ? severityColorByThreshold(valuePct) : TOKENS.valueBlue;

  return (
    <Card icon={<Gauge size={16} className="text-[#008CCD]" />} title={kpi}>
      <div className="flex items-center justify-between gap-3">
        {/* Left: Donut + value/delta */}
        <div className="flex items-center gap-3">
          <Donut valuePct={valuePct} color={ringColor} title={`${kpi} Snapshot`} />
          <div className="flex flex-col cursor-pointer">
            <output className="text-[22px] font-bold leading-none" style={{ color: TOKENS.text }}>
              {pct(valuePct, 0)}
            </output>
            <div className="mt-1 text-xs" style={{ color: toneColor(deltaPct) }}>
              {caret(deltaPct)} {Math.abs(deltaPct).toFixed(1)}%
              <span className="ml-1" style={{ color: TOKENS.muted }}>
                vs prev
              </span>
            </div>
          </div>
        </div>

        {/* Right: narrow bar trend */}
        {/* <div
          className="h-[76px] w-[46%] cursor-pointer"
          role="img"
          aria-label={`${kpi} recent trend`}
        >
          <ResponsiveContainer>
            <BarChart data={series} margin={{ top: 6, left: 0, right: 0, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 100]} />
              <RTooltip content={<SmartTrendTooltip />} />
              <Bar
                dataKey="value"
                name={kpi}
                fill={TOKENS.valueBlue}
                radius={[5, 5, 0, 0]}
                barSize={BAR_SIZE}
              />
            </BarChart>
          </ResponsiveContainer>
        </div> */}
      </div>
    </Card>
  );
}

/* ============================================================================
   KPI CARD (3) Inlinks & Outlinks — stacked donut + dual-area trend
   (values and deltas shown to the right of the donut as "In / Out")

   Hover animation rule: only the slice under the cursor animates (pops) at a time.
============================================================================ */
function InOutCard({
  inlinksPct,
  outlinksPct,
  inDeltaPct,
  outDeltaPct,
  seriesIn,
  seriesOut,
}: {
  inlinksPct: number; // share (% of total, 0..100)
  outlinksPct: number; // share (% of total, 0..100)
  inDeltaPct: number; // +/- %
  outDeltaPct: number; // +/- %
  seriesIn: Series; // aligned series
  seriesOut: Series;
}) {
  const inColor = TOKENS.valueBlue;
  const outColor = TOKENS.success;

  // Donut parts (normalized)
  const total = Math.max(0.0001, inlinksPct + outlinksPct);
  const parts = [
    { name: "Inlinks", value: Math.max(0, inlinksPct / total), color: inColor },
    { name: "Outlinks", value: Math.max(0, outlinksPct / total), color: outColor },
  ];

  // Merge trend data
  const data = useMemo(
    () => merge2Series(seriesIn, seriesOut, "Inlinks", "Outlinks"),
    [seriesIn, seriesOut]
  );

  // Active slice for per-slice hover animation
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const renderActiveSlice = (props: any) => (
    <Sector
      {...props}
      innerRadius={28}
      outerRadius={40} // slightly larger when active
    />
  );

  return (
    <Card icon={<Link2 size={16} className="text-[#008CCD]" />} title="Inlinks / Outlinks">
      <div className="flex items-center justify-between gap-3">
        {/* Left: stacked donut (no whole-donut hover scale; per-slice only) */}
        <div className="flex items-center gap-3">
          <div className="h-20 w-20 cursor-pointer">
            <ResponsiveContainer>
              <PieChart>
                <RTooltip content={<SmartDonutTooltip title="Link Breakdown" />} />
                <Pie
                  data={parts}
                  dataKey="value"
                  innerRadius={28}
                  outerRadius={36}
                  startAngle={90}
                  endAngle={-270}
                  stroke="transparent"
                  isAnimationActive
                  activeIndex={activeIndex}
                  activeShape={renderActiveSlice}
                  onMouseEnter={(_, idx) => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {parts.map((p, i) => (
                    <Cell key={i} fill={p.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Center: values and deltas in the same pattern (In / Out) */}
          <div className="flex flex-col cursor-pointer">
            <output className="text-[18px] font-bold leading-none" style={{ color: TOKENS.text }}>
              {pct(inlinksPct, 0)} <span style={{ color: TOKENS.muted }}>/</span> {pct(outlinksPct, 0)}
            </output>
            <div className="mt-1 text-xs">
              <span style={{ color: toneColor(inDeltaPct) }}>
                {caret(inDeltaPct)} {Math.abs(inDeltaPct).toFixed(1)}%
              </span>
              <span className="mx-1" style={{ color: TOKENS.muted }}>
                /
              </span>
              <span style={{ color: toneColor(outDeltaPct) }}>
                {caret(outDeltaPct)} {Math.abs(outDeltaPct).toFixed(1)}%
              </span>
              <span className="ml-1" style={{ color: TOKENS.muted }}>
                vs prev
              </span>
            </div>
          </div>
        </div>

        {/* Right: dual-area trend; colors match donut slices */}
        {/* <div
          className="h-[76px] w-[56%] cursor-pointer"
          role="img"
          aria-label="Inlinks vs Outlinks trend"
        >
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={inColor} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={TOKENS.pastelBlue} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="grad-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={outColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={outColor} stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={TOKENS.border} />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <RTooltip content={<SmartTrendTooltip />} />
              <Area
                type="monotone"
                dataKey="Inlinks"
                stroke={inColor}
                fill="url(#grad-in)"
                strokeWidth={2}
                dot={false}
                name="Inlinks"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="Outlinks"
                stroke={outColor}
                fill="url(#grad-out)"
                strokeWidth={2}
                dot={false}
                name="Outlinks"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div> */}
      </div>
    </Card>
  );
}

/* ============================================================================
   HEADER (Drawer) — updated to use brand icon style (no bg) & pointer cursors
============================================================================ */
function DrawerHeader({ pageUrl, onClose }: { pageUrl?: string; onClose?: () => void }) {
   const [tracking, setTracking] = useState(false);

  const opentracking = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
       if (e) e.stopPropagation();
    setTracking(true);
  };
  // This function will handle closing the drawer
  const closetracking = () => {
    setTracking(false);
  };
  return (
    <div className="bg-white border-b" style={{ borderColor: TOKENS.border }}>
                                             {tracking && (
                       <div
                  style={{
                    display:"hidden",
                    position: "absolute",
                    zIndex: 1001,
                    padding: "20px",
                  }}
                  onClick={e => e.stopPropagation()}
                >
                            <RemoveFromTrackingDemo    onClose={closetracking} />
              </div>
                        )}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Branded icon — no background, brand color */}
          <span className="inline-flex items-center justify-center">
            <FileSpreadsheet size={20} className="text-[#008CCD]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate" style={{ color: TOKENS.text }}>
              Page Interlinking Drawer
            </h2>
            <div className="mt-0.5 text-xs flex items-center gap-2" style={{ color: TOKENS.muted }}>
              <span
                className="rounded px-1.5 py-0.5 border bg-white"
                style={{ borderColor: TOKENS.border }}
              >
                Folder: Guides
              </span>
              <a href="#" className="inline-flex items-center gap-1 hover:underline text-xs cursor-pointer">
                <ExternalLink size={14} className="text-[#008CCD]" /> Open page
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PrimaryCTA>
            <LineChart size={16} />
            Analyze Page Insights
          </PrimaryCTA>
          <GhostCTA onClick={opentracking}>
            <Trash2 size={16} />
            Remove from Tracking
          </GhostCTA>
          {/* Keep Export button in the same place */}
          <GhostCTA>
            <Upload size={16} />
            Export
          </GhostCTA>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   OVERVIEW (exactly THREE cards)
   - Single white container; section header has separator; cards stay white inside
   - Minimal brand-colored icons (no background)
============================================================================ */
function Overview({ pils, aqs, inlinks, outlinks }: { pils: number; aqs: number; inlinks: number; outlinks: number }) {
  const pilsSeries = useMemo(() => makeTrend(12, Math.max(0, Math.min(100, pils || 0))), [pils]);
  const aqsSeries = useMemo(() => makeTrend(12, Math.max(0, Math.min(100, aqs || 0))), [aqs]);
  const inSeries = useMemo(() => makeTrend(14, Math.max(0, Math.min(100, inlinks || 0))), [inlinks]);
  const outSeries = useMemo(() => makeTrend(14, Math.max(0, Math.min(100, outlinks || 0))), [outlinks]);


  return (
    <section
      className="mt-4 rounded-[8px] border bg-white overflow-hidden"
      style={{ borderColor: TOKENS.border }}
    >
      <SectionHeader
        icon={<PieChartIcon size={16} className="text-[#008CCD]" />}
        title="Overview"
        rightSlot={
          <div className="flex items-center gap-2 px-4">
            {/* Keep Export button at the same place */}
            <GhostCTA>
              <Upload size={16} />
              Export
            </GhostCTA>
          </div>
        }
      />

      {/* Same white background as container; no alt background */}
      <div className="p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiDonutBarCard kpi="PILS" valuePct={pils} deltaPct={+0} series={pilsSeries} useSeverity />
          <KpiDonutBarCard kpi="AQS" valuePct={aqs}  deltaPct={+0} series={aqsSeries} useSeverity />
          <InOutCard
            inlinksPct={inlinks}
            outlinksPct={outlinks}
            inDeltaPct={0}
            outDeltaPct={0}
            seriesIn={inSeries}
            seriesOut={outSeries}
          />
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   MAIN — drop-in component for Page Drawer (Header + Overview)
============================================================================ */
export default function PageInterlinkingDrawer({
  pageUrl,
  pils = 0,
  aqs = 0,
  inlinks = 0,
  outlinks = 0,
  loading = false,
  error,
  onClose,
}: {
  pageUrl?: string;
  pils?: number;
  aqs?: number;
  inlinks?: number;
  outlinks?: number;
  loading?: boolean;
  error?: string;
  onClose?: () => void;
}) {

  return (
    <div className="w-full bg-white" style={{ fontFamily: FONT_STACK }}>
<DrawerHeader pageUrl={pageUrl} onClose={onClose} />
      <Overview pils={pils} aqs={aqs} inlinks={inlinks} outlinks={outlinks} />
    </div>
  );
}


