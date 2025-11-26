"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TriangleAlert,
  Download,
  Share2,
  FileText,
  Tag as TagIcon,
  GitBranch,
  Bug,
  Link as LinkIcon,
} from "lucide-react";

// Recharts
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* =============================================================================
   Tokens, utils & brand mark / icon badge
============================================================================= */

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
};

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const fmtNumber = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const fmtPct = (p: number, digits = 1) => `${(p * 100).toFixed(digits)}%`;
const fmtDateLabel = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(d);

/** weekly labels, oldest → newest */
function makeDateLabels(len: number, lastUpdated?: string): string[] {
  const end = lastUpdated ? new Date(lastUpdated) : new Date();
  const labels: string[] = [];
  for (let i = 0; i < len; i++) {
    const dt = new Date(end);
    dt.setDate(dt.getDate() - (len - 1 - i) * 7);
    labels.push(fmtDateLabel(dt));
  }
  return labels;
}

type SeriesPoint = { date: string; value: number };
const toSeries = (labels: string[], values: number[]): SeriesPoint[] =>
  labels.map((date, i) => ({ date, value: values[i] ?? values.at(-1)! }));

/* =============================================================================
   Title Icon Badge (branded, semantic icon per card)
============================================================================= */

function TitleIconBadge({
  Icon,
  tone = "brand",
  size = 18,
}: {
  Icon: React.ComponentType<{ size?: number; stroke?: string }>; // add stroke
  tone?: "brand" | "good" | "warn" | "danger" | "info";
  size?: number;
}) {
  const color =
    tone === "good"
      ? TOKENS.status.good
      : tone === "warn"
      ? TOKENS.status.warn
      : tone === "danger"
      ? TOKENS.status.danger
      : tone === "info"
      ? TOKENS.status.info
      : TOKENS.valueBlue;
      
  return (
    <span
      aria-hidden
      className="inline-grid place-items-center"
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background:
          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%), linear-gradient(180deg, #F8FBFF, #EEF6FE)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      <Icon size={size} stroke={color} /> {/* use stroke, not color */}
    </span>
  );
}


/* =============================================================================
   Types
============================================================================= */

interface SummaryDTO {
  dils: number;               // 0..100
  dilsDelta?: number;

  avgPageScore: number;       // PILS (0..100)
  aqsScore: number;           // Anchor Quality Score (0..100)
  anchorBonus: number;        // +ve
  orphanPenalty: number;      // -ve
  redirectPenalty?: number;   // -ve
  totalPages: number;
  orphanPages: number;
  orphanPct: number;

  uniqueAnchorTypes: number;
  brokenLinks: number;

  /* Optional enriched breakdowns (if API provides them) */
  depthBuckets?: { d1: number; d2_3: number; d4p: number };
  anchorTypes?: { exact: number; partial: number; brand: number };
  danglingPages?: number;
  brokenBreakdown?: { x4xx: number; x5xx: number; other?: number };

  lastUpdated: string;        // ISO
    trends?: {
    labels: string[];          // ISO timestamps
    pages: number[];
    anchorsUnique: number[];
    orphans: number[];
    broken: number[];
    dils: number[];
    pils: number[];
    aqs: number[];
    orphanPenalty: number[];
    redirectPenalty: number[];
  };
}

interface Props {
  projectId?: string;
  initialData?: SummaryDTO;
  onNavigate?: (target: string, payload?: Record<string, any>) => void;
  thresholds?: {
    orphanPctWarn?: number;          // default 0.05 (5%)
    orphanPctGood?: number;          // default 0.02 (2%)
    brokenPctWarn?: number;          // default 0.03 (3%)
  };
  className?: string;
}

/* =============================================================================
   Shared: Branded smart tooltip for charts
============================================================================= */

function BrandedTooltip({
  active,
  payload,
  label,
  title,
  valueFmt = (v: number) => (Number.isFinite(v) ? (v as number).toString() : "—"),
  labelFmt,
}: any & { title?: string; valueFmt?: (v: number) => string; labelFmt?: (l: any) => string }) {
  if (!active) return null;
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.borderSubtle, color: TOKENS.textStrong, pointerEvents: "none", zIndex: 60 }}
    >
      <div className="mb-1 flex items-center gap-1.5 font-medium" style={{ color: TOKENS.muted }}>
        <TitleIconBadge Icon={Info} tone="info" size={14} />
        <span>{title ?? (labelFmt ? labelFmt(label) : String(label))}</span>
      </div>
      {label !== undefined && title ? (
        <div className="mb-1 text-[11px]" style={{ color: TOKENS.muted }}>
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
            <div className="font-semibold">{valueFmt(Number(p.value))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =============================================================================
   Mini trend charts — with BrandedTooltip
============================================================================= */

function MiniArea({
  data,
  mean = false,
  title = "Trend",
  valueFmt = (v: number) => v.toString(),
}: {
  data: SeriesPoint[];
  mean?: boolean;
  title?: string;
  valueFmt?: (v: number) => string;
}) {
  return (
    <div className="h-16 w-full pr-1" role="img" aria-label="trend area">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="kpiArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOKENS.valueBlue} stopOpacity={0.45} />
              <stop offset="100%" stopColor={TOKENS.pastelBlue} stopOpacity={0.22} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={<BrandedTooltip title={title} valueFmt={valueFmt} labelFmt={(l) => String(l)} />}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 60 }}
            cursor={{ stroke: TOKENS.valueBlue, strokeOpacity: 0.18, strokeWidth: 1 }}
          />
          {mean && (
            <Area dataKey="value" stroke={TOKENS.muted} fill="transparent" strokeDasharray="3 3" isAnimationActive={false} />
          )}
          <Area type="monotone" dataKey="value" stroke={TOKENS.valueBlue} fill="url(#kpiArea)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBars({
  data,
  title = "Trend",
  valueFmt = (v: number) => v.toString(),
}: {
  data: SeriesPoint[];
  title?: string;
  valueFmt?: (v: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  return (
    <div className="h-16 w-full pr-1" role="img" aria-label="trend bars">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          onMouseMove={(state: any) => {
            const idx = typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : null;
            setHoverIdx(idx);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <CartesianGrid vertical={false} stroke={TOKENS.borderSubtle} />
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            content={<BrandedTooltip title={title} valueFmt={valueFmt} labelFmt={(l) => String(l)} />}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 60 }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="value" fill={TOKENS.valueBlue} radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell
                key={i}
                cursor="pointer"
                className="transition-all"
                style={{
                  transformOrigin: "bottom center",
                  transition: "transform 140ms ease, opacity 140ms ease, filter 140ms ease",
                  transform: hoverIdx === i ? "translateY(-2px) scaleY(1.06)" : "none",
                  filter: hoverIdx === i ? "drop-shadow(0 2px 0 rgba(0,0,0,0.1))" : "none",
                  opacity: hoverIdx === i ? 1 : 0.9,
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =============================================================================
   Delta badge — caret & number only
============================================================================= */

function DeltaBadge({
  raw,
  good,
  format = (n: number) => n.toString(),
}: {
  raw: number;
  good: boolean;
  format?: (n: number) => string;
}) {
  const isZero = Math.round(raw * 10) === 0;
  const color = isZero ? TOKENS.muted : good ? TOKENS.status.good : TOKENS.status.danger;
  const Icon = isZero ? Minus : raw > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-sm" style={{ color }}>
      <Icon size={14} />
      {format(Math.abs(raw))}
    </span>
  );
}

/* =============================================================================
   Stacked Donut (snapshot) + Branded full-breakdown popover
============================================================================= */

type DonutPart = { name: string; value: number; color: string; fmt?: (v: number) => string };

function StackedDonut({
  parts,
  center,
  aria,
  delta,
  deltaGood,
  tooltipTitle = "Breakdown",
}: {
  parts: DonutPart[];
  center: { label: string; sub?: string };
  aria: string;
  delta?: number | null;
  deltaGood?: boolean;
  tooltipTitle?: string;
}) {
  const safe = parts.filter((p) => p.value > 0);
  const sum = safe.reduce((s, p) => s + p.value, 0);
  const data = safe.map((p) => ({ ...p, pct: sum > 0 ? p.value / sum : 0 }));

  const FullBreakdown = ({ active }: any) =>
    !active ? null : (
      <div
        role="tooltip"
        className="rounded-md border bg-white p-2 text-xs shadow"
        style={{ borderColor: TOKENS.borderSubtle, color: TOKENS.textStrong, pointerEvents: "none", zIndex: 60 }}
      >
        <div className="mb-1 flex items-center gap-1.5 font-medium" style={{ color: TOKENS.muted }}>
          <TitleIconBadge Icon={Info} tone="info" size={14} />
          <span>{tooltipTitle}</span>
        </div>
        <div className="flex flex-col gap-1">
          {data.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span style={{ color: TOKENS.muted }}>{p.name}</span>
              </div>
              <div className="font-semibold">
                {p.fmt ? p.fmt(p.value) : (p.value as any)?.toFixed ? (p.value as number).toFixed(1) : p.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="relative h-[120px] w-[120px]" role="img" aria-label={aria} style={{ overflow: "visible" }}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip content={<FullBreakdown />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 60 }} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={42}
            outerRadius={58}
            paddingAngle={1}
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

      {/* Center label + delta + sub */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div className="leading-tight">
          <div className="text-[22px] font-bold text-[color:var(--focus,#0077FF)]">{center.label}</div>
          {typeof delta === "number" && (
            <div className="mt-0.5">
              <DeltaBadge raw={delta} good={!!deltaGood} />
            </div>
          )}
          {center.sub && <div className="text-[11px] text-[color:var(--text-muted,#6B7280)]">{center.sub}</div>}
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   DILS Trend (multi-series) — custom SVG + smart popover (outside chart) + dots at intersection
============================================================================= */

function useContainerWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState<number>(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => setW(es[0]?.contentRect?.width ?? 0));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width: w };
}

function CompositeAreaWithAxes({
  series,
  labels,
  height = 168,
  yTicks = 5,
  xTicks = 5,
  tooltipTitle = "DILS Trend",
}: {
  series: Array<{ key: string; label: string; values: number[]; color: string }>;
  labels?: string[];
  height?: number;
  yTicks?: number;
  xTicks?: number;
  tooltipTitle?: string;
}) {
  const { ref, width } = useContainerWidth();
  const pad = 28;
  const w = Math.max(320, width || 560);
  const h = height;

  const all = series.flatMap((s) => s.values);
  const min = Math.min(0, ...all);
  const max = Math.max(100, ...all);
  const range = Math.max(1, max - min);
  const N = Math.max(...series.map((s) => s.values.length));

  const X = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, N - 1);
  const Y = (v: number) => pad + ((max - v) / range) * (h - pad * 2);
  const Y0 = Y(0);

  const [hover, setHover] = useState<{ i: number; x: number } | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>(
    () => Object.fromEntries(series.map((s) => [s.key, true]))
  );
  const visible = series.filter((s) => active[s.key]);

  const yTickVals = Array.from({ length: yTicks }, (_, i) => min + (i * range) / (yTicks - 1));
  const xTickIdxs = Array.from({ length: xTicks }, (_, i) => Math.round((i * (N - 1)) / (xTicks - 1)));

  const toggleKey = (key: string) => setActive((a) => ({ ...a, [key]: !a[key] }));

  // compute safe left for popover so it doesn't escape container
  const clampLeft = (x: number, widthPx = 220) => Math.max(0, Math.min(x, w - widthPx));

  // Popover width (approx) for outside placement
  const POPOVER_W = 240;

  return (
    <div ref={ref} className="relative w-full" style={{ overflow: "visible" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const idx = Math.max(0, Math.min(N - 1, Math.round(((x - pad) / (w - pad * 2)) * (N - 1))));
          setHover({ i: idx, x: X(idx) });
        }}
      >
        {/* axes */}
        <line x1={pad} x2={pad} y1={pad} y2={h - pad} stroke={TOKENS.borderSubtle} />
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke={TOKENS.borderSubtle} />
        {/* y ticks */}
        {yTickVals.map((v, i) => (
          <g key={`y-${i}`}>
            <line x1={pad - 4} x2={pad} y1={Y(v)} y2={Y(v)} stroke={TOKENS.borderSubtle} />
            <text x={pad - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="#6B7280">
              {v.toFixed(0)}
            </text>
          </g>
        ))}
        {/* x ticks */}
        {xTickIdxs.map((i) => (
          <g key={`x-${i}`}>
            <line x1={X(i)} x2={X(i)} y1={h - pad} y2={h - pad + 4} stroke={TOKENS.borderSubtle} />
            <text x={X(i)} y={h - pad + 14} textAnchor="middle" fontSize="10" fill="#6B7280">
              {labels?.[i] ?? `#${i + 1}`}
            </text>
          </g>
        ))}
        {/* zero baseline */}
        <line x1={pad} x2={w - pad} y1={Y0} y2={Y0} stroke={TOKENS.borderSubtle} strokeDasharray="4 3" />

        {/* visible series as AREAS + LINES */}
        {visible.map((s) => {
          const linePts = s.values.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
          const areaPath =
            `M ${X(0)} ${Y(s.values[0])} ` +
            s.values.slice(1).map((v, i) => `L ${X(i + 1)} ${Y(v)}`).join(" ") +
            ` L ${X(s.values.length - 1)} ${Y0} L ${X(0)} ${Y0} Z`;
          const gradId = `fill-${s.key}`;
          return (
            <g key={s.key}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradId})`} />
              <polyline points={linePts} fill="none" stroke={s.color} strokeWidth={2} />
            </g>
          );
        })}

        {/* hover crosshair */}
        {hover && <line x1={hover.x} x2={hover.x} y1={pad} y2={h - pad} stroke={TOKENS.borderSubtle} />}

        {/* small dots at intersections for the hover index */}
        {hover &&
          visible.map((s) => {
            const idx = Math.min(s.values.length - 1, hover.i);
            const v = s.values[idx];
            return (
              <circle
                key={`dot-${s.key}-${idx}`}
                cx={X(idx)}
                cy={Y(v)}
                r={3}
                fill="#ffffff"
                stroke={s.color}
                strokeWidth={2}
              />
            );
          })}
      </svg>

      {/* legend (click to toggle) */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {series.map((s) => {
          const on = active[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleKey(s.key)}
              className="inline-flex select-none items-center gap-2 text-xs"
              style={{ color: on ? TOKENS.textStrong : TOKENS.muted, opacity: on ? 1 : 0.55 }}
              role="switch"
              aria-checked={on}
              title={on ? "Click to hide" : "Click to show"}
            >
              <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Smart popover (brand) — placed ABOVE chart and side-shifted left/right of pointer */}
      {hover && (
        <div
          className="pointer-events-none absolute rounded border bg-white px-3 py-2 text-[11px] text-gray-900 shadow"
          style={{
            top: 0, // anchor to top edge
            transform: "translateY(-100%)", // place above the chart area
            left:
              hover.x + 12 + POPOVER_W <= w
                ? clampLeft(hover.x + 12, POPOVER_W)
                : clampLeft(hover.x - POPOVER_W - 12, POPOVER_W),
            zIndex: 60,
            borderColor: TOKENS.borderSubtle,
            maxWidth: POPOVER_W,
          }}
        >
          <div className="mb-1 flex items-center gap-1.5 font-medium" style={{ color: TOKENS.muted }}>
            <TitleIconBadge Icon={Share2} tone="brand" size={14} />
            <span>{tooltipTitle}</span>
          </div>
          <div className="mb-1 font-medium">{labels?.[hover.i] ?? `#${hover.i + 1}`}</div>
          {visible.map((s) => {
            const v = s.values[Math.min(s.values.length - 1, hover.i)];
            return (
              <div key={s.key} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
                  <b className="font-medium" style={{ color: TOKENS.muted }}>
                    {s.label}
                  </b>
                </div>
                <div className="font-semibold">{v.toFixed(1)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   Helpers (delta & safe fallbacks)
============================================================================= */

function lastDelta(values: number[], reverseGood = false) {
  if (!values || values.length < 2) return null;
  const prev = Number(values.at(-2));
  const curr = Number(values.at(-1));
  const raw = curr - prev; // positive is up
  const good = reverseGood ? raw < 0 : raw > 0;
  return { raw, good, prev, curr };
}

/* =============================================================================
   Card shells (with semantic icons)
============================================================================= */

function CardShell({
  title,
  info,
  icon,
  iconTone = "brand",
  children,
}: {
  title: string;
  info?: string;
  icon?: React.ComponentType<{ size?: number }>;
  iconTone?: "brand" | "good" | "warn" | "danger" | "info";
  children: React.ReactNode;
}) {
  const IconComp = icon;
  return (
    <div
      className="rounded-[6px] border bg-[color:var(--bg-panel,#FFFFFF)] p-4 shadow-sm"
      style={{ borderColor: TOKENS.borderSubtle }}
    >
      <div className="mb-2 flex items-center gap-2">
        {IconComp ? <TitleIconBadge Icon={IconComp} tone={iconTone} /> : <TitleIconBadge Icon={Info} tone="info" />}
        <div className="text-[13px] font-semibold" style={{ color: TOKENS.textStrong }}>
          {title}
        </div>
        {info && (
          <div className="relative inline-flex items-center group ml-1" aria-label="info">
            <Info size={15} className="text-[color:var(--text-muted,#6B7280)]" />
            <div
              role="tooltip"
              className="invisible group-hover:visible absolute left-4 top-4 z-50 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
              style={{ borderColor: TOKENS.borderSubtle }}
            >
              {info}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/* =============================================================================
   Main Section — with Stacked Donut snapshots
============================================================================= */

export default function OverviewKpiSummary({
  thresholds,
  initialData,
  onNavigate,
  className,
}: Props) {
  const cfg = {
    orphanPctGood: thresholds?.orphanPctGood ?? 0.02,
    orphanPctWarn: thresholds?.orphanPctWarn ?? 0.05,
    brokenPctWarn: thresholds?.brokenPctWarn ?? 0.03,
  };

  const [summary, setSummary] = useState<SummaryDTO | null>(initialData ?? null);


  if (!summary) {
    return (
      <div className={cn("w-full", className)}>
        <div
          className="rounded-[6px] border bg-[color:var(--bg-panel,#FFFFFF)] shadow-sm"
          style={{ borderColor: TOKENS.borderSubtle }}
        >
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3 text-[color:var(--text-strong,#111827)]">
              <TriangleAlert className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-sm font-semibold">No data available</div>
                <div className="text-sm" style={{ color: TOKENS.muted }}>
                  Run an Internal Link Audit to compute DILS and KPIs.
                </div>
              </div>
            </div>
            <button className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: TOKENS.borderSubtle }}>
              Run Audit
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------- Trends ---------------------------- */
/* ---------------------------- Trends (from API) ---------------------------- */
const T = summary.trends;

const rawLabels = (T?.labels ?? []).map(s => new Date(s));
const labels = rawLabels.length
  ? rawLabels.map(fmtDateLabel)
  : makeDateLabels(5, summary.lastUpdated); // graceful fallback

const pagesTrend   = T?.pages ?? [];
const anchorsTrend = T?.anchorsUnique ?? [];
const orphansTrend = T?.orphans ?? [];
const brokenTrend  = T?.broken ?? [];

const pagesSeries   = toSeries(labels, pagesTrend);
const anchorsSeries = toSeries(labels, anchorsTrend);
const orphansSeries = toSeries(labels, orphansTrend);
const brokenSeries  = toSeries(labels, brokenTrend);

const dPages   = lastDelta(pagesTrend, false);
const dAnchors = lastDelta(anchorsTrend, false);
const dOrphans = lastDelta(orphansTrend, true);
const dBroken  = lastDelta(brokenTrend, true);


  /* ----------------------- Snapshot (stacked donut) data ---------------------- */

  // 1) DILS composition
  const dilsParts: DonutPart[] = (() => {
    const posPILS = Math.max(0, summary.avgPageScore);
    const posAQS = Math.max(0, summary.aqsScore);
    const posAnchor = Math.max(0, summary.anchorBonus);
    const penOrphan = Math.abs(summary.orphanPenalty ?? 0);
    const penRedirect = Math.abs(summary.redirectPenalty ?? 0);

    return [
      { name: "PILS", value: posPILS, color: TOKENS.valueBlue },
      { name: "AQS", value: posAQS, color: TOKENS.status.info },
      { name: "Anchor Bonus", value: posAnchor, color: TOKENS.status.good },
      { name: "Orphan Penalty", value: penOrphan, color: TOKENS.status.danger, fmt: (v) => `-${v.toFixed(1)}` },
      { name: "Redirect Penalty", value: penRedirect, color: TOKENS.status.warn, fmt: (v) => `-${v.toFixed(1)}` },
    ].filter((p) => p.value > 0);
  })();

  // 2) Total pages by depth (fallback if not provided)
  const pagesByDepth = (() => {
    const { d1, d2_3, d4p } =
      summary.depthBuckets ?? { d1: Math.round(summary.totalPages * 0.16), d2_3: Math.round(summary.totalPages * 0.56), d4p: 0 };
    const rest = Math.max(0, summary.totalPages - d1 - d2_3 - d4p);
    return [
      { name: "Depth 1", value: d1, color: "#005AD6" },
      { name: "Depth 2–3", value: d2_3, color: "#0077FF" },
      { name: "Depth 4+", value: d4p + rest, color: "#7FB6FF" },
    ];
  })();

  // 3) Anchor type mix (fallback if not provided)
  const anchorMix = (() => {
    const def =
      summary.anchorTypes ?? { exact: Math.round(summary.uniqueAnchorTypes * 0.29), partial: Math.round(summary.uniqueAnchorTypes * 0.48), brand: 0 };
    const residual = Math.max(0, summary.uniqueAnchorTypes - def.exact - def.partial - def.brand);
    return [
      { name: "Exact", value: def.exact, color: TOKENS.status.good },
      { name: "Partial/Semantic", value: def.partial, color: TOKENS.valueBlue },
      { name: "Brand/Navigational", value: def.brand + residual, color: TOKENS.status.info },
    ];
  })();

  // 4) Orphan / Dangling / Connected
  const orphanDangling = (() => {
    const orphan = Math.max(0, summary.orphanPages);
    const dangling = Math.max(0, Math.min(summary.totalPages - orphan, summary.danglingPages ?? Math.round(orphan * 0.6)));
    const connected = Math.max(0, summary.totalPages - orphan - dangling);
    return [
      { name: "Orphan", value: orphan, color: TOKENS.status.danger },
      { name: "Dangling", value: dangling, color: TOKENS.status.warn },
      { name: "Connected", value: connected, color: TOKENS.status.good },
    ];
  })();

  // 5) Broken links by type (fallback if not provided)
  const brokenMix = (() => {
    const bb =
      summary.brokenBreakdown ?? { x4xx: Math.round(summary.brokenLinks * 0.7), x5xx: summary.brokenLinks - Math.round(summary.brokenLinks * 0.7) };
    const other = Math.max(0, (bb as any).other ?? 0);
    return [
      { name: "4xx", value: bb.x4xx, color: TOKENS.status.warn },
      { name: "5xx", value: bb.x5xx, color: TOKENS.status.danger },
      ...(other ? [{ name: "Other", value: other, color: TOKENS.status.info }] : []),
    ];
  })();

  /* -------------------------------- Rendering -------------------------------- */

  return (
    <section className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[18px] font-semibold" style={{ color: TOKENS.textStrong }}>
          <TitleIconBadge Icon={Share2} tone="brand" />
          Internal Link Summary
        </h2>
        <button
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: TOKENS.borderSubtle }}
          onClick={() => console.info("export_snapshot")}
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <div className="mb-3 h-px w-full bg-[color:var(--border-subtle,#EFF0F6)]" />

      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
        {/* --------------------------- 1) DILS --------------------------- */}
        <CardShell
          title="Domain Interlinking Score (DILS)"
          info="Snapshot shows score composition; trend overlays DILS, PILS, AQS and penalties."
          icon={Share2}
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-stretch">
            {/* Snapshot (stacked donut) */}
            <div className="flex shrink-0 flex-col items-center gap-4 md:items-start">
              <StackedDonut
                aria="DILS composition"
                parts={dilsParts}
                center={{ label: `${summary.dils.toFixed(0)}`, sub: "DILS" }}
                delta={typeof summary.dilsDelta === "number" ? summary.dilsDelta : null}
                deltaGood={(summary.dilsDelta ?? 0) > 0}
                tooltipTitle="DILS Breakdown"
              />
              {/* Quick legend list */}
              <div className="space-y-1 text-xs">
                {dilsParts.map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                      <span style={{ color: TOKENS.muted }}>{p.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: TOKENS.textStrong }}>
                      {p.fmt ? p.fmt(p.value) : p.value.toFixed ? p.value.toFixed(1) : p.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend (composite with smart popover outside + dots) */}
            <div className="min-w-0 flex-1 md:min-h-[240px]">
              {(() => {
                const TT = summary.trends;
                const s = {
                  dils: TT?.dils ?? [],
                  pils: TT?.pils ?? [],
                  aqs: TT?.aqs ?? [],
                  orphan: TT?.orphanPenalty ?? [],
                  redirect: TT?.redirectPenalty ?? [],
                } as const;

                const ls = labels; // use the precomputed pretty labels above

                return (
                  <CompositeAreaWithAxes
                    series={[
                      { key: "dils", label: "DILS", color: TOKENS.valueBlue, values: s.dils },
                      { key: "pils", label: "PILS", color: TOKENS.status.good, values: s.pils },
                      { key: "aqs", label: "AQS", color: TOKENS.status.info, values: s.aqs },
                      { key: "orphan", label: "Orphan Penalty", color: TOKENS.status.danger, values: s.orphan },
                      { key: "redirect", label: "Redirect Penalty", color: TOKENS.status.warn, values: s.redirect },
                    ]}
                    labels={ls}
                    tooltipTitle="DILS Trend"
                    height={240}
                  />
                );
              })()}
            </div>

          </div>
        </CardShell>

        {/* -------------------------- Right: 2×2 KPI grid -------------------------- */}
        <div className="grid h-full grid-cols-2 auto-rows-[minmax(168px,1fr)] items-stretch gap-3">
          {/* 2) Total Pages — donut (Depth) + area trend */}
          <CardShell title="Total Pages Analyzed" info="Depth buckets are a quick proxy for crawl reach." icon={FileText}>
            <div className="flex items-end gap-3">
              {/* Snapshot (delta inside donut) */}
              <div className="shrink-0">
                <StackedDonut
                  aria="Pages by crawl depth"
                  parts={pagesByDepth}
                  center={{ label: fmtNumber(summary.totalPages), sub: "Pages" }}
                  delta={dPages?.raw ?? null}
                  deltaGood={dPages?.good ?? false}
                  tooltipTitle="Depth Breakdown"
                />
              </div>
              {/* Trend only */}
              <div className="min-w-0 flex-1">
                <MiniArea data={pagesSeries} title="Pages Trend" valueFmt={(v) => fmtNumber(v)} />
              </div>
            </div>
          </CardShell>

          {/* 3) Anchor Types — donut + area trend */}
          <CardShell title="Anchor Types (Unique)" info="Distribution of unique anchor variants." icon={TagIcon}>
            <div className="flex items-end gap-3">
              {/* Snapshot (delta inside donut) */}
              <div className="shrink-0">
                <StackedDonut
                  aria="Anchor types mix"
                  parts={anchorMix}
                  center={{ label: fmtNumber(summary.uniqueAnchorTypes), sub: "Types" }}
                  delta={dAnchors?.raw ?? null}
                  deltaGood={dAnchors?.good ?? false}
                  tooltipTitle="Anchor Types"
                />
              </div>
              {/* Trend */}
              <div className="min-w-0 flex-1">
                <MiniArea data={anchorsSeries} title="Unique Types Trend" valueFmt={(v) => fmtNumber(v)} />
              </div>
            </div>
          </CardShell>

          {/* 4) Orphan Pages — donut + bars trend */}
          <CardShell
            title="Orphan Pages"
            info="Pages with no inlinks (orphans) and nodes with no outlinks (dangling)."
            icon={GitBranch}
            iconTone="warn"
          >
            <div className="flex items-end gap-3">
              {/* Snapshot (delta inside donut) */}
              <div className="shrink-0">
                <StackedDonut
                  aria="Orphan vs Dangling vs Connected"
                  parts={orphanDangling}
                  center={{ label: fmtNumber(summary.orphanPages), sub: "Orphan" }}
                  delta={dOrphans?.raw ?? null}
                  deltaGood={dOrphans?.good ?? false}
                  tooltipTitle="Link State"
                />
              </div>
              {/* Trend + threshold chip */}
              <div className="min-w-0 flex-1">
                <MiniBars data={orphansSeries} title="Orphans Trend" valueFmt={(v) => fmtNumber(v)} />
                <div className="mt-2 text-xs">
                  {summary.orphanPct < cfg.orphanPctGood ? (
                    <span className="rounded-full px-2 py-0.5 font-medium" style={{ color: TOKENS.status.good, background: "rgba(16,185,129,0.15)" }}>
                      {fmtPct(summary.orphanPct)} • Good
                    </span>
                  ) : summary.orphanPct <= cfg.orphanPctWarn ? (
                    <span className="rounded-full px-2 py-0.5 font-medium" style={{ color: TOKENS.status.warn, background: "rgba(245,158,11,0.15)" }}>
                      {fmtPct(summary.orphanPct)} • Warning
                    </span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 font-medium" style={{ color: TOKENS.status.danger, background: "rgba(239,68,68,0.15)" }}>
                      {fmtPct(summary.orphanPct)} • Danger
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardShell>

          {/* 5) Broken Links — donut + bars trend */}
          <CardShell title="Broken Links" info="Share of broken links by error class." icon={Bug} iconTone="danger">
            <div className="flex items-end gap-3">
              {/* Snapshot (delta inside donut) */}
              <div className="shrink-0">
                <StackedDonut
                  aria="Broken links by type"
                  parts={brokenMix}
                  center={{ label: fmtNumber(summary.brokenLinks), sub: "Broken" }}
                  delta={dBroken?.raw ?? null}
                  deltaGood={dBroken?.good ?? false}
                  tooltipTitle="Broken Links"
                />
              </div>
              {/* Trend */}
              <div className="min-w-0 flex-1">
                <MiniBars data={brokenSeries} title="Broken Links Trend" valueFmt={(v) => fmtNumber(v)} />
              </div>
            </div>
          </CardShell>
        </div>
      </div>
    </section>
  );
}
