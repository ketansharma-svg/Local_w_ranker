"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  Download,
  Share2,
  Tag as TagIcon,
  Link as LinkIcon,
  GitBranch,
  TriangleAlert,
  ShieldAlert,
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
} from "recharts";
import TabLoadingState from "../TabLoadingState";

/* ============================================================================
   Tokens (aligned with prior)
============================================================================ */
const TOKENS = {
  brand: "var(--brand,#008CCD)",
  valueBlue: "var(--focus,#0077FF)",
  pastelBlue: "var(--pastel-blue,#D9EEF8)",
  borderSubtle: "var(--border-subtle,#EFF0F6)",
  panel: "var(--bg-panel,#FFFFFF)",
  app: "var(--bg-app,#F5F7FA)",
  textStrong: "var(--text-strong,#111827)",
  muted: "var(--text-muted,#6B7280)",
  status: {
    good: "var(--success,#10B981)",
    warn: "var(--warning,#F59E0B)",
    danger: "var(--critical,#EF4444)",
    info: "var(--info,#3B82F6)",
  },
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const fmtInt = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const fmtPct100 = (p: number, digits = 1) => `${(Math.max(0, Math.min(100, p))).toFixed(digits)}%`;

/* ============================================================================
   Types
============================================================================ */
interface SummaryAPI {
  aqs: number;                 // 0..100
  adi: number;                 // 0..100
  overusedCount: number;       // #
  spamRiskPct: number;         // 0..100

  breakdowns?: {
    aqs?: { label: string; value: number; color?: string }[];
    adi?: { label: string; value: number; color?: string }[];
    overused?: { label: string; value: number; color?: string }[];
    spam?: { label: string; value: number; color?: string }[];
  };

  history: {
    aqs: number[];
    adi: number[];
    overusedCount: number[];
    spamRiskPct: number[];
  };
  updatedAt: string;
}

/* ============================================================================
   Demo fetch (replace with real API)
============================================================================ */
async function fetchAnchorsSummary(projectId: string): Promise<SummaryAPI> {
  const now = new Date();
  const histLen = 10;

  return {
    aqs: 68,
    adi: 72,
    overusedCount: 14,
    spamRiskPct: 12.5,
    history: {
      aqs: Array.from({ length: histLen }, (_, i) => 60 + Math.round(10 * Math.sin(i / 2))),
      adi: Array.from({ length: histLen }, (_, i) => 65 + Math.round(8 * Math.cos(i / 2))),
      overusedCount: Array.from({ length: histLen }, (_, i) => 9 + ((i * 2) % 7)),
      spamRiskPct: Array.from({ length: histLen }, (_, i) => 8 + ((i * 2) % 6)),
    },
    updatedAt: now.toISOString(),
  };
}

/* ============================================================================
   Shared atoms — updated TitleIcon (no background), Delta, Smart tooltips
============================================================================ */
function TitleIcon({ Icon, size = 18 }: { Icon: React.ComponentType<{ size?: number,color?: string }>; size?: number; }) {
  // No background, brand color icon
  return <Icon size={size} color={TOKENS.brand} />;
}

function lastDelta(values: number[], reverseGood = false) {
  if (!values || values.length < 2) return { raw: 0, good: false };
  const prev = Number(values.at(-2));
  const curr = Number(values.at(-1));
  const raw = Math.round((curr - prev) * 10) / 10;
  return { raw, good: reverseGood ? raw < 0 : raw > 0 };
}

function DeltaBadge({
  raw,
  good,
  unit,
}: {
  raw: number | null | undefined;
  good: boolean;
  unit?: "%" | "" | "pp";
}) {
  const v = typeof raw === "number" ? raw : 0;
  const isZero = Math.round(v * 10) === 0;
  const color = isZero ? TOKENS.muted : good ? TOKENS.status.good : TOKENS.status.danger;
  const caret = isZero ? "±" : v > 0 ? "▲" : "▼";
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color }}>
      {caret} {Math.abs(v).toFixed(1)}
      {unit ? <span>&nbsp;{unit}</span> : null}
    </span>
  );
}


function BrandedTooltip({
  active,
  payload,
  label,
  title,
  valueFmt = (v: number) => (Number.isFinite(v) ? (v as number).toString() : '--'),
  labelFmt,
  visible = true,
}: any & { title?: string; valueFmt?: (v: number) => string; labelFmt?: (l: any) => string; visible?: boolean }) {
  if (!active || !visible) return null;
  const last = (payload ?? []).slice(-1);
  // Prefer the preformatted date we attach to each point; fallback to recharts' label
  const rawLabel = payload?.[0]?.payload?.label ?? label;
  const displayLabel = labelFmt ? labelFmt(rawLabel) : String(rawLabel);

  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.borderSubtle, color: TOKENS.textStrong, pointerEvents: "none", zIndex: 20 }}
    >
      <div className="mb-1 flex items-center gap-1.5 font-medium" style={{ color: TOKENS.muted }}>
        <TitleIcon Icon={Info} size={14} />
        <span>{title ?? displayLabel}</span>
      </div>
      {title ? (
        <div className="mb-1 text-[11px]" style={{ color: TOKENS.muted }}>
          {displayLabel}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        {last.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              <span style={{ color: TOKENS.muted }}>{p.name}</span>
            </div>
            <div className="font-semibold">{valueFmt(Number(p.value))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Smart tooltip (donut breakdown) — highlights the hovered slice row */

function DonutBreakdownTooltip({
  active,
  title,
  parts,
  payload,
  valueFmt = (v: number) => (Number.isFinite(v) ? (v as number).toFixed(1) : '--'),
  visible = true,
}: any & {
  title?: string;
  parts: { name: string; value: number; color: string }[];
  valueFmt?: (v: number) => string;
  visible?: boolean;
}) {
  if (!active || !visible) return null;
  const highlight = payload && payload[0] && payload[0].name;
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.borderSubtle, color: TOKENS.textStrong, pointerEvents: "none", zIndex: 20 }}
    >
      <div className="mb-1 flex items-center gap-1.5 font-medium" style={{ color: TOKENS.muted }}>
        <TitleIcon Icon={Info} size={14} />
        <span>{title ?? "Breakdown"}</span>
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = p.name === highlight;
          return (
            <div
              key={i}
              className={cn("flex items-center justify-between gap-6 rounded-[4px] px-1 py-0.5", isActive && "bg-[#F5F7FA]")}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span style={{ color: TOKENS.muted }}>{p.name}</span>
              </div>
              <div className={cn("font-semibold", isActive && "text-[color:var(--focus,#0077FF)]")}>
                {valueFmt(p.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   Mini charts (Area / Bars) — with subtle hover animation + single-value popover
============================================================================ */
function MiniArea({
  data,
  title,
  valueFmt,
  color = TOKENS.valueBlue,
  pastel = TOKENS.pastelBlue,
  tooltipVisible = true,
}: {
  data: Array<{ date: string; value: number }>;
  title: string;
  valueFmt: (v: number) => string;
  color?: string;
  pastel?: string;
  tooltipVisible?: boolean;
}) {
  const mean = data.length > 0 ? data.reduce((s, d) => s + d.value, 0) / data.length : 0;

  return (
    <div className="h-16 w-full pr-1" role="img" aria-label={`${title} trend`}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={pastel} stopOpacity={0.22} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          {/* Use ReferenceLine for baseline to avoid duplicate tooltip values */}
          <ReferenceLine y={mean} stroke={TOKENS.muted} strokeDasharray="3 3" />
          <RTooltip
            content={<BrandedTooltip title={title} valueFmt={valueFmt} labelFmt={(l) => String(l)} visible={tooltipVisible} />}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 20, pointerEvents: "none", visibility: tooltipVisible ? "visible" : "hidden" }}
            cursor={{ stroke: color, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#grad-${title})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBars({
  data,
  title,
  valueFmt,
  color = TOKENS.valueBlue,
  tooltipVisible = true,
}: {
  data: Array<{ date: string; value: number }>;
  title: string;
  valueFmt: (v: number) => string;
  color?: string;
  tooltipVisible?: boolean;
}) {
  const [hi, setHi] = useState<number | null>(null);
  return (
    <div className="h-16 w-full pr-1" role="img" aria-label={`${title} trend`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={<BrandedTooltip title={title} valueFmt={valueFmt} labelFmt={(l) => String(l)} visible={tooltipVisible} />}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 20, pointerEvents: "none", visibility: tooltipVisible ? "visible" : "hidden" }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar
            dataKey="value"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            onMouseLeave={() => setHi(null)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={color}
                opacity={hi === null || hi === i ? 1 : 0.6}
                onMouseEnter={() => setHi(i)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================================
   Stacked Donut (compact) — hover animation + popover highlight
============================================================================ */
type DonutPart = { name: string; value: number; color: string; fmt?: (v: number) => string };

function renderActiveSlice(props: any) {
  // Slightly larger outer radius + soft shadow on hover
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 1}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))" }}
      />
    </g>
  );
}

function StackedDonut({
  parts,
  size = 92, // reduced size
  tooltipTitle,
  valueFmt,
  tooltipVisible = true,
}: {
  parts: DonutPart[];
  size?: number;
  tooltipTitle?: string;
  valueFmt?: (v: number) => string;
  tooltipVisible?: boolean;
}) {
  const safe = parts.filter((p) => p.value > 0);
  const data = safe.map((p) => ({ ...p, v: p.value }));
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={
              <DonutBreakdownTooltip
                title={tooltipTitle}
                parts={data.map((d) => ({ name: d.name, value: d.value, color: d.color }))}
                valueFmt={valueFmt}
                visible={tooltipVisible}
              />
            }
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 20, pointerEvents: "none", visibility: tooltipVisible ? "visible" : "hidden" }}
          />
          <Pie
            data={data}
            dataKey="v"
            nameKey="name"
            innerRadius={Math.round(size / 2) - 22}
            outerRadius={Math.round(size / 2) - 10}
            paddingAngle={1}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
            activeIndex={activeIdx}
            activeShape={renderActiveSlice}
            onMouseEnter={(_: any, idx: number) => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(undefined)}
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

/* ============================================================================
   Small Card Shell
============================================================================ */
function SmallCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[6px] border bg-white p-4 "
      style={{ borderColor: TOKENS.borderSubtle }}
    >
      <div className="mb-2 flex items-center gap-2">
        <TitleIcon Icon={icon} />
        <div className="text-[13px] font-semibold" style={{ color: TOKENS.textStrong }}>
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function safeFormatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(); 
}

function toSeries(values: number[], labels?: string[]) {
  return values.map((v, i) => ({
    idx: i,
    value: v,
    label: safeFormatDate(labels?.[i]), 
  }));
}

/* ============================================================================
   MAIN — Anchor Text Insights (Summary) — refined layout/UX
============================================================================ */
// ⬅️ extend props
export default function AnchorTextInsightsSummary(props?: {
  summaryOverride?: { aqs: number; adi: number; overusedCount: number; spamRiskPct: number };
  historyOverride?: {
    labels?: string[];
    aqs: number[];
    adi: number[];
    overusedCount: number[];
    spamRiskPct: number[];
  };
  breakdownsOverride?: {
    aqs?: { label: string; value: number; color?: string }[];
    adi?: { label: string; value: number; color?: string }[];
    overused?: { label: string; value: number; color?: string }[];
    spam?: { label: string; value: number; color?: string }[];
  };
}) {

  const [data, setData] = useState<SummaryAPI | null>(null);
// ADD
const rootRef = useRef<HTMLDivElement | null>(null);
const [inView, setInView] = useState(true);
const [suspendTT, setSuspendTT] = useState(false);

// ADD
useEffect(() => {
  if (!rootRef.current) return;
  const io = new IntersectionObserver(
    ([entry]) => setInView(entry?.isIntersecting ?? true),
    { root: null, threshold: 0 }
  );
  io.observe(rootRef.current);
  return () => io.disconnect();
}, []);
// ADD
useEffect(() => {
  let t: number | null = null;
  const kick = () => {
    setSuspendTT(true);
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => setSuspendTT(false), 180);
  };
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("wheel", kick, { passive: true });
  window.addEventListener("touchmove", kick, { passive: true });
  return () => {
    window.removeEventListener("scroll", kick);
    window.removeEventListener("wheel", kick);
    window.removeEventListener("touchmove", kick);
    if (t) window.clearTimeout(t);
  };
}, []);

// ADD

  useEffect(() => {
    if (props?.summaryOverride) {
      const s = props.summaryOverride;
      const h = props.historyOverride;

      const history = h
        ? {
                  labels: Array.isArray(h.labels) ? h.labels : undefined,        // ⬅️ keep labels
            aqs: Array.isArray(h.aqs) ? h.aqs : Array(10).fill(s.aqs),
            adi: Array.isArray(h.adi) ? h.adi : Array(10).fill(s.adi),
            overusedCount: Array.isArray(h.overusedCount) ? h.overusedCount : Array(10).fill(s.overusedCount),
            spamRiskPct: Array.isArray(h.spamRiskPct) ? h.spamRiskPct : Array(10).fill(s.spamRiskPct),
          }
        : {
            aqs: Array(10).fill(s.aqs),
            adi: Array(10).fill(s.adi),
            overusedCount: Array(10).fill(s.overusedCount),
            spamRiskPct: Array(10).fill(s.spamRiskPct),
          };

      setData({
        aqs: s.aqs,
        adi: s.adi,
        overusedCount: s.overusedCount,
        spamRiskPct: s.spamRiskPct,
        history,
              breakdowns: props.breakdownsOverride
        ? {
            aqs: props.breakdownsOverride.aqs,
            adi: props.breakdownsOverride.adi,
            overused: props.breakdownsOverride.overused,
            spam: props.breakdownsOverride.spam,
          }
        : undefined,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    let alive = true;
    fetchAnchorsSummary("demo").then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [props?.summaryOverride, props?.historyOverride, props?.breakdownsOverride]);

  if (!data) return <TabLoadingState />;

  // Trends + deltas
const labels = (data.history as any)?.labels as string[] | undefined;

const aqsSeries:any  = toSeries(data.history.aqs, labels);
const adiSeries:any  = toSeries(data.history.adi, labels);
const overSeries:any = toSeries(data.history.overusedCount, labels);
const spamSeries:any = toSeries(data.history.spamRiskPct, labels);

  const dAqs = lastDelta(data.history.aqs, false);
  const dAdi = lastDelta(data.history.adi, false);
  const dOver = lastDelta(data.history.overusedCount, true); // lower is better
  const dSpam = lastDelta(data.history.spamRiskPct, true);   // lower is better

  // Donut parts
  const aqsParts: DonutPart[] =
    data.breakdowns?.aqs?.map((p) => ({ name: p.label, value: p.value, color: p.color ?? TOKENS.valueBlue })) ?? []

  const adiParts: DonutPart[] =
    data.breakdowns?.adi?.map((p) => ({ name: p.label, value: p.value, color: p.color ?? TOKENS.valueBlue })) ?? [];

  const overParts: DonutPart[] =
    data.breakdowns?.overused?.map((p) => ({ name: p.label, value: p.value, color: p.color ?? TOKENS.status.warn })) ??
[];

  const spamParts: DonutPart[] =
    data.breakdowns?.spam?.map((p) => ({ name: p.label, value: p.value, color: p.color ?? TOKENS.status.warn })) ??[];
const ttVisible = inView && !suspendTT;

  return (
    <section className="top-0 z-10 bg-white" ref={rootRef} >
      <div className="w-full">
        <div className="rounded-[6px] border bg-white p-4" style={{ borderColor: TOKENS.borderSubtle }}>
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold" style={{ color: TOKENS.textStrong }}>
              <TitleIcon Icon={TagIcon} />
              Anchor Text Insights (Summary)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => console.info("export_anchor_text_summary")}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                style={{ borderColor: TOKENS.borderSubtle }}
              >
                <Download className="h-4 w-4" color={TOKENS.brand as string} /> Export
              </button>
              <button
                onClick={() => console.info("share_anchor_text_summary")}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                style={{ borderColor: TOKENS.borderSubtle }}
              >
                <Share2 className="h-4 w-4" color={TOKENS.brand as string} /> Share
              </button>
            </div>
          </div>

          <div className="h-px w-full" style={{ background: TOKENS.borderSubtle }} />

          {/* KPI Row — 4 small cards in one row */}
          <div className="mt-3 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {/* 1) AQS — bar trend right */}
            <SmallCard title="Anchor Quality Score" icon={LinkIcon}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                {/* Left: donut + value/delta */}
                <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
                  <StackedDonut
                    parts={aqsParts}
                    tooltipTitle="AQS Breakdown"
                    valueFmt={(v) => fmtPct100(v)}
                    size={92}
                    tooltipVisible={ttVisible}
                  />
                  <div className="leading-tight text-center sm:text-left">
                    <div className="text-[22px] font-bold text-[color:var(--focus,#0077FF)]">{Math.round(data.aqs)}</div>
                    <div className="mt-0.5">
                      <DeltaBadge raw={dAqs.raw} good={dAqs.good} />
                    </div>
                    <div className="text-[11px] text-[color:var(--text-muted,#6B7280)]">AQS</div>
                  </div>
                </div>
                {/* Right: trend (BARS) */}
                <div className="w-full min-w-0 xl:flex-1">
                  <div className="mb-1 text-[12px]" style={{ color: TOKENS.muted }}>
                    Last {aqsSeries.length} audits
                  </div>
                  <MiniBars
                    data={aqsSeries}
                    title="AQS Trend"
                    valueFmt={(v) => v.toFixed(1)}
                    color={TOKENS.status.info}
                    tooltipVisible={ttVisible}
                  />
                </div>
              </div>
            </SmallCard>

            {/* 2) ADI — bar trend right */}
            <SmallCard title="Anchor Diversity Index" icon={GitBranch}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
                  <StackedDonut
                    parts={adiParts}
                    tooltipTitle="Diversity Breakdown"
                    valueFmt={(v) => fmtPct100(v)}
                    size={92}
                    tooltipVisible={ttVisible}
                  />
                  <div className="leading-tight text-center sm:text-left">
                    <div className="text-[22px] font-bold text-[color:var(--focus,#0077FF)]">{fmtPct100(data.adi)}</div>
                    <div className="mt-0.5">
                      <DeltaBadge raw={dAdi.raw} good={dAdi.good} />
                    </div>
                    <div className="text-[11px] text-[color:var(--text-muted,#6B7280)]">ADI</div>
                  </div>
                </div>
                <div className="w-full min-w-0 xl:flex-1">
                  <div className="mb-1 text-[12px]" style={{ color: TOKENS.muted }}>
                    Last {adiSeries.length} audits
                  </div>
                  <MiniBars
                    data={adiSeries}
                    title="ADI Trend"
                    valueFmt={(v) => v.toFixed(1)}
                    color={TOKENS.status.good}
                    tooltipVisible={ttVisible}
                  />
                </div>
              </div>
            </SmallCard>

            {/* 3) Overused Anchors — area trend right */}
            <SmallCard title="Overused Anchors" icon={TriangleAlert}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
                  <StackedDonut
                    parts={overParts}
                    tooltipTitle="Overused Breakdown"
                    valueFmt={(v) => fmtInt(v)}
                    size={92}
                    tooltipVisible={ttVisible}
                  />
                  <div className="leading-tight text-center sm:text-left">
                    <div className="text-[22px] font-bold text-[color:var(--focus,#0077FF)]">{fmtInt(data.overusedCount)}</div>
                    <div className="mt-0.5">
                      <DeltaBadge raw={dOver.raw} good={dOver.good} />
                    </div>
                    <div className="text-[11px] text-[color:var(--text-muted,#6B7280)]">Overused</div>
                  </div>
                </div>
                <div className="w-full min-w-0 xl:flex-1">
                  <div className="mb-1 text-[12px]" style={{ color: TOKENS.muted }}>
                    Last {overSeries.length} audits
                  </div>
                  <MiniArea
                    data={overSeries}
                    title="Overused Trend"
                    valueFmt={(v) => fmtInt(v)}
                    color={TOKENS.status.warn}
                    pastel="rgba(245,158,11,0.15)"
                    tooltipVisible={ttVisible}
                  />
                </div>
              </div>
            </SmallCard>

            {/* 4) Anchor Spam Risk — area trend right */}
            <SmallCard title="Anchor Spam Risk" icon={ShieldAlert}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
                  <StackedDonut
                    parts={spamParts}
                    tooltipTitle="Spam Risk Mix"
                    valueFmt={(v) => fmtPct100(v)}
                    size={92}
                    tooltipVisible={ttVisible}
                  />
                  <div className="leading-tight text-center sm:text-left">
                    <div className="text-[22px] font-bold text-[color:var(--focus,#0077FF)]">{fmtPct100(data.spamRiskPct, 1)}</div>
                    <div className="mt-0.5">
                      <DeltaBadge raw={dSpam.raw} good={dSpam.good} />
                    </div>
                    <div className="text-[11px] text-[color:var(--text-muted,#6B7280)]">Risk</div>
                  </div>
                </div>
                <div className="w-full min-w-0 xl:flex-1">
                  <div className="mb-1 text-[12px]" style={{ color: TOKENS.muted }}>
                    Last {spamSeries.length} audits
                  </div>
                  <MiniArea
                    data={spamSeries}
                    title="Spam Risk Trend"
                    valueFmt={(v) => v.toFixed(1)}
                    color={TOKENS.status.danger}
                    pastel="rgba(239,68,68,0.15)"
                    tooltipVisible={ttVisible}
                  />
                </div>
              </div>
            </SmallCard>
          </div>
        </div>
      </div>
    </section>
  );
}
