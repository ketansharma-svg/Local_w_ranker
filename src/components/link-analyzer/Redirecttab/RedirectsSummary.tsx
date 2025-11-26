"use client";

import React, { useMemo, useState } from "react";
import {
  Info,
  Download,
  Link as LinkIcon,
  GitBranch,
  RefreshCcw,
  ChevronsRight,
} from "lucide-react";
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
  Sector,
} from "recharts";

/* =============================================================================
   TOKENS (aligned with Anchor Insights summary)
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
    gray: "#7C8798",
  },
} as const;

const cn = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");
const fmtInt = (n?: number) =>
  typeof n === "number" && Number.isFinite(n)
    ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)
    : "—";
const toDateLabel = (i: number, len: number) => `Audit ${len - i}`;

/* =============================================================================
   Small atoms: Title icon, Delta, HopIcon, Tooltips
============================================================================= */
function TitleIcon({
  Icon,
  size = 18,
}: {
  Icon: React.ComponentType<{ size?: number; color: any }>;
  size?: number;
}) {
  return <Icon size={size} color={TOKENS.brand} />;
}

function lastDelta(values: number[]) {
  if (!values || values.length < 2) return 0;
  const prev = Number(values.at(-2));
  const curr = Number(values.at(-1));
  return Math.round((curr - prev) * 10) / 10;
}

function DeltaBadge({
  raw,
  goodUp = true,
  unit = "",
}: {
  raw: number | null | undefined;
  goodUp?: boolean;
  unit?: "" | "%" | "pp";
}) {
  const v = typeof raw === "number" ? raw : 0;
  const isZero = Math.round(v * 10) === 0;
  const good = goodUp ? v > 0 : v < 0;
  const color = isZero ? TOKENS.muted : good ? TOKENS.status.good : TOKENS.status.danger;
  const caret = isZero ? "±" : v > 0 ? "▲" : "▼";
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color }}>
      {caret} {Math.abs(v).toFixed(1)}
      {unit ? <span>&nbsp;{unit}</span> : null}
    </span>
  );
}

/** Branded numeric icon for hop count (1/2/3/4+) */
function HopIcon({
  label,
  tone,
}: {
  label: string;
  tone: "blue" | "amber" | "red" | "gray";
}) {
  const map = {
    blue: TOKENS.valueBlue,
    amber: TOKENS.status.warn,
    red: TOKENS.status.danger,
    gray: TOKENS.status.gray,
  } as const;
  return (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-[4px] text-[10px] font-bold leading-none"
      style={{ background: `${map[tone]}1A`, color: map[tone] }}
    >
      {label}
    </span>
  );
}

/** Smart tooltip for area/bar that can show a Total line + colored legend rows */
function TotalBreakdownTooltip({
  active,
  label,
  payload,
  title,
  nameMap,
  iconMap,
  valueFmt = (v: number) => fmtInt(v),
}: any & {
  title?: string;
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  valueFmt?: (v: number) => string;
}) {
  if (!active) return null;
  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{
        borderColor: TOKENS.borderSubtle,
        color: TOKENS.textStrong,
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      {(title || label !== undefined) && (
        <div
          className="mb-1 flex items-center gap-1.5 font-medium"
          style={{ color: TOKENS.muted }}
        >
          <TitleIcon Icon={Info} size={14} />
          <span>{title ?? String(label)}</span>
        </div>
      )}
      <div className="mb-1 flex items-center justify-between gap-6">
        <div className="font-medium" style={{ color: TOKENS.muted }}>
          Total
        </div>
        <div className="font-semibold">{valueFmt(total)}</div>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: p.color }}
              />
              {iconMap?.[p.name]}
              <span style={{ color: TOKENS.muted }}>
                {nameMap?.[p.name] ?? p.name}
              </span>
            </div>
            <div className="font-semibold">{valueFmt(Number(p.value))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Donut breakdown tooltip — highlights hovered slice row */
function DonutBreakdownTooltip({
  active,
  payload,
  parts,
  title = "Breakdown",
  valueFmt = (v: number) => fmtInt(v),
  nameMap,
  iconMap,
  visible = true,
}: any & {
  parts: { name: string; value: number; color: string }[];
  title?: string;
  valueFmt?: (v: number) => string;
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  visible?: boolean;
}) {
  if (!active || !visible) return null;
  const highlightName = payload?.[0]?.name;
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{
        borderColor: TOKENS.borderSubtle,
        color: TOKENS.textStrong,
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      <div
        className="mb-1 flex items-center gap-1.5 font-medium"
        style={{ color: TOKENS.muted }}
      >
        <TitleIcon Icon={Info} size={14} />
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = p.name === highlightName;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between gap-6 rounded-[4px] px-1 py-0.5",
                isActive && "bg-[#F5F7FA]"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: p.color }}
                />
                {iconMap?.[p.name]}
                <span style={{ color: TOKENS.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div
                className={cn(
                  "font-semibold",
                  isActive && "text-[color:var(--focus,#0077FF)]"
                )}
              >
                {valueFmt(p.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Active slice renderer for donut hover */
function renderActiveSlice(props: any) {
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

/* =============================================================================
   Compact Donut (stacked) used in Snapshot
============================================================================= */
type DonutPart = { name: string; value: number; color: string };

function StackedDonut({
  parts,
  size = 92,
  tooltipTitle,
  nameMap,
  iconMap,
  valueFmt,
  emptyLabel = "No data",
}: {
  parts: DonutPart[];
  size?: number;
  tooltipTitle?: string;
  nameMap?: Record<string, string>;
  iconMap?: Record<string, React.ReactNode>;
  valueFmt?: (v: number) => string;
  emptyLabel?: string;
}) {
  const filtered = parts
    .filter((p) => (p.value ?? 0) > 0)
    .map((p) => ({ ...p, v: p.value }));
  const hasData = filtered.length > 0;
  const emptyColor = "rgba(124,135,152,0.35)";
  const data = hasData
    ? filtered
    : [{ name: "__empty__", value: 1, color: emptyColor }];
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={
              <DonutBreakdownTooltip
                title={tooltipTitle}
                parts={hasData ? filtered : []}
                nameMap={nameMap}
                iconMap={iconMap}
                valueFmt={valueFmt}
                visible={hasData}
              />
            }
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 60, pointerEvents: "none", visibility: hasData ? "visible" : "hidden" }}
          />
          <Pie
            data={data}
            dataKey="v"
            nameKey="name"
            innerRadius={Math.round(size / 2) - 22}
            outerRadius={Math.round(size / 2) - 10}
            paddingAngle={hasData ? 1 : 0}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
            activeIndex={hasData ? activeIdx : undefined}
            activeShape={renderActiveSlice}
            onMouseEnter={hasData ? ((_: any, idx: number) => setActiveIdx(idx)) : undefined}
            onMouseLeave={hasData ? (() => setActiveIdx(undefined)) : undefined}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke={hasData ? undefined : emptyColor} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {!hasData && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-[11px]"
          style={{ color: TOKENS.muted }}
        >
          <span>{emptyLabel}</span>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   Small Card shell (refined, no external UI deps)
============================================================================= */
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
      className="rounded-[6px] border bg-white p-4"
      style={{ borderColor: TOKENS.borderSubtle }}
    >
      <div className="mb-2 flex items-center gap-2">
        {/* <TitleIcon Icon={icon} /> */}
        <div className="text-[13px] font-semibold" style={{ color: TOKENS.textStrong }}>
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

/* =============================================================================
   Mini Snapshot for Chains vs Loops (two vertical bars w/ icons & labels)
============================================================================= */
function MiniBarsPair({
  left,
  right,
}: {
  left: {
    label: string;
    value: number;
    color: string;
    Icon?: React.ComponentType<{ size?: number }>;
  };
  right: {
    label: string;
    value: number;
    color: string;
    Icon?: React.ComponentType<{ size?: number }>;
  };
}) {
  const max = Math.max(1, left.value, right.value);
  return (
    /* UPDATED: add `group` so both bars animate together on hover */
    <div className="group flex items-end gap-4">
      {[left, right].map((b, i) => {
        const hPct = (b.value / max) * 100;
        const IconCmp = b.Icon;
        return (
          <div key={i} className="flex flex-col items-center">
            <div
              className="flex h-20 w-7 items-end justify-center rounded-[4px] overflow-hidden"
              style={{ background: "#F5F7FA" }}
            >
              <div
                /* UPDATED: subtle on-hover animation (scale from bottom + brighten) */
                className="w-7 rounded-[4px_4px_0_0] origin-bottom transition-transform duration-300 ease-out group-hover:scale-y-105 hover:scale-y-110 hover:brightness-110"
                style={{ height: `${hPct}%`, background: b.color }}
                title={`${b.label}: ${fmtInt(b.value)}`}
              />
            </div>
            <div className="mt-1 text-xs font-semibold" style={{ color: TOKENS.textStrong }}>
              {fmtInt(b.value)}
            </div>
            <div
              className="mt-0.5 flex items-center gap-1 text-[11px]"
              style={{ color: TOKENS.muted }}
            >
              {IconCmp && <IconCmp size={12} />}
              <span>{b.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =============================================================================
   DEMO (fallback) — used when apiSummary not provided
============================================================================= */
const demoData = {
  updatedAt: new Date().toISOString(),
  totalRedirects: 342,
  trends: {
    // 8 recent audits (left → right = old → new)
    hop1: [288, 290, 292, 293, 294, 295, 294, 295],
    hop2: [26, 26, 26, 26, 27, 27, 27, 27],
    hop3: [12, 12, 11, 11, 11, 12, 12, 12],
    hop4p: [7, 8, 7, 8, 8, 8, 9, 8],
    internal: [195, 205, 202, 210, 214, 220, 218, 220],
    external: [115, 117, 116, 120, 121, 122, 120, 122],
    chains: [41, 42, 40, 44, 45, 47, 46, 47],
    loops: [9, 10, 9, 11, 11, 12, 12, 12],
    invalidTo4xx: [6, 6, 6, 7, 7, 7, 7, 7],
    invalidTo5xx: [4, 4, 5, 5, 5, 5, 5, 5],
    invalidNonHtml: [3, 3, 3, 3, 3, 3, 3, 3],
    invalidOther: [2, 2, 1, 2, 2, 3, 2, 3],
  },
  breakdowns: {
    hops: { hop1: 295, hop2: 27, hop3: 12, hop4p: 8 },
    types: { http301: 210, http302: 86, js: 24, meta: 22 },
    intExt: { internal: 220, external: 122 },
    chains: 47,
    loops: 12,
    invalid: { to4xx: 7, to5xx: 5, nonHtml: 3, other: 3 },
  },
};

const HOP_COLORS = {
  hop1: TOKENS.valueBlue,
  hop2: TOKENS.status.warn,
  hop3: TOKENS.status.danger,
  hop4p: TOKENS.status.gray,
};
const HOP_LABELS: Record<keyof typeof HOP_COLORS, string> = {
  hop1: "1-hop",
  hop2: "2-hop",
  hop3: "3-hop",
  hop4p: "4+ hops",
};
const HOP_ICONS: Record<string, React.ReactNode> = {
  hop1: <HopIcon label="1" tone="blue" />,
  hop2: <HopIcon label="2" tone="amber" />,
  hop3: <HopIcon label="3" tone="red" />,
  hop4p: <HopIcon label="4+" tone="gray" />,
};

/* =============================================================================
   API summary type + mapper → UI data shape (with synthesized trends)
============================================================================= */
type ApiSummary = {
  totalRedirects: number;
  hops: { hop1: number; hop2: number; hop3: number; hop4p: number };
  types: { http301: number; http302: number; js: number; meta: number };
  intExt: { internal: number; external: number };
  chains: number;
  loops: number;
  invalid: { to4xx: number; to5xx: number; nonHtml: number; other: number };
};

export type ApiTrends = {
  hop1: number[]
  hop2: number[]
  hop3: number[]
  hop4p: number[]
  internal: number[]
  external: number[]
  chains: number[]
  loops: number[]
  invalidTo4xx: number[]
  invalidTo5xx: number[]
  invalidNonHtml: number[]
  invalidOther: number[]
}

function mapApiSummaryToView(
  src?: ApiSummary | null,
  trendsOverride?: ApiTrends
) {
  if (!src) return null

  // If trends provided, use them. Otherwise, synthesize single-point arrays.
  const trends = trendsOverride ?? {
    hop1: [src.hops?.hop1 ?? 0],
    hop2: [src.hops?.hop2 ?? 0],
    hop3: [src.hops?.hop3 ?? 0],
    hop4p: [src.hops?.hop4p ?? 0],
    internal: [src.intExt?.internal ?? 0],
    external: [src.intExt?.external ?? 0],
    chains: [src.chains ?? 0],
    loops: [src.loops ?? 0],
    invalidTo4xx: [src.invalid?.to4xx ?? 0],
    invalidTo5xx: [src.invalid?.to5xx ?? 0],
    invalidNonHtml: [src.invalid?.nonHtml ?? 0],
    invalidOther: [src.invalid?.other ?? 0],
  }

  return {
    updatedAt: new Date().toISOString(),
    totalRedirects: src.totalRedirects ?? 0,
    trends,
    breakdowns: {
      hops: {
        hop1: src.hops?.hop1 ?? 0,
        hop2: src.hops?.hop2 ?? 0,
        hop3: src.hops?.hop3 ?? 0,
        hop4p: src.hops?.hop4p ?? 0,
      },
      types: {
        http301: src.types?.http301 ?? 0,
        http302: src.types?.http302 ?? 0,
        js: src.types?.js ?? 0,
        meta: src.types?.meta ?? 0,
      },
      intExt: {
        internal: src.intExt?.internal ?? 0,
        external: src.intExt?.external ?? 0,
      },
      chains: src.chains ?? 0,
      loops: src.loops ?? 0,
      invalid: {
        to4xx: src.invalid?.to4xx ?? 0,
        to5xx: src.invalid?.to5xx ?? 0,
        nonHtml: src.invalid?.nonHtml ?? 0,
        other: src.invalid?.other ?? 0,
      },
    },
  }
}


/* =============================================================================
   MAIN — Redirects Summary (Snapshot + Trend single view)
============================================================================= */
export default function RedirectsSummary({ apiSummary,apiTrends }: { apiSummary?: ApiSummary | null,  apiTrends?: ApiTrends
 }) {
  // Prefer API; if absent use demoData. The mapper guarantees trends arrays exist.
  const mapped = useMemo(() => mapApiSummaryToView(apiSummary, apiTrends), [apiSummary, apiTrends]);
  const d = mapped ?? demoData;

  const hopSeriesLen = d.trends?.hop1?.length ?? 0;
  const hopStack = useMemo(
    () =>
      Array.from({ length: hopSeriesLen }, (_, i) => ({
        date: toDateLabel(i, hopSeriesLen),
        hop1: d.trends.hop1[i],
        hop2: d.trends.hop2[i],
        hop3: d.trends.hop3[i],
        hop4p: d.trends.hop4p[i],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hopSeriesLen, d.trends?.hop1, d.trends?.hop2, d.trends?.hop3, d.trends?.hop4p]
  );

  const intExtLen = d.trends?.internal?.length ?? 0;
  const intExtSeries = useMemo(
    () =>
      Array.from({ length: intExtLen }, (_, i) => ({
        date: toDateLabel(i, intExtLen),
        internal: d.trends.internal[i],
        external: d.trends.external[i],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [intExtLen, d.trends?.internal, d.trends?.external]
  );

  const chainLen = d.trends?.chains?.length ?? 0;
  const chainLoopSeries = useMemo(
    () =>
      Array.from({ length: chainLen }, (_, i) => ({
        date: toDateLabel(i, chainLen),
        chains: d.trends.chains[i],
        loops: d.trends.loops[i],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chainLen, d.trends?.chains, d.trends?.loops]
  );

  const invLen = d.trends?.invalidTo4xx?.length ?? 0;
  const invalidSeries = useMemo(
    () =>
      Array.from({ length: invLen }, (_, i) => ({
        date: toDateLabel(i, invLen),
        to4xx: d.trends.invalidTo4xx[i],
        to5xx: d.trends.invalidTo5xx[i],
        nonHtml: d.trends.invalidNonHtml[i],
        other: d.trends.invalidOther[i],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invLen, d.trends?.invalidTo4xx, d.trends?.invalidTo5xx, d.trends?.invalidNonHtml, d.trends?.invalidOther]
  );

  // Deltas from the last two points (where applicable)
  const deltaTotal = lastDelta(
    hopStack.map((r) => r.hop1 + r.hop2 + r.hop3 + r.hop4p)
  );
  const deltaInternal = lastDelta(d.trends?.internal ?? []);
  const deltaExternal = lastDelta(d.trends?.external ?? []);
  const deltaChains = lastDelta(d.trends?.chains ?? []);
  const deltaLoops = lastDelta(d.trends?.loops ?? []);
  const deltaInvalid = lastDelta(
    invalidSeries.map((r) => r.to4xx + r.to5xx + r.nonHtml + r.other)
  );

  return (
    <section
      className="rounded-[6px] border bg-white p-4"
      style={{
        borderColor: TOKENS.borderSubtle,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2
          className="flex items-center gap-2 text-[18px] font-semibold"
          style={{ color: TOKENS.textStrong }}
        >
          <TitleIcon Icon={LinkIcon} />
          Redirects Summary
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => console.info("export_redirects_summary")}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
            style={{ borderColor: TOKENS.borderSubtle }}
          >
            <Download className="h-4 w-4" color={TOKENS.brand as string} /> Export
          </button>
        </div>
      </div>

      <div className="h-px w-full" style={{ background: TOKENS.borderSubtle }} />

      {/* KPI Row — single view cards */}
      <div className="mt-3 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {/* 1) Total Redirects (Hops) */}
        <SmallCard title="Total Redirects" icon={ChevronsRight}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {/* Snapshot: stacked donut + value/delta */}
            <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
              <StackedDonut
                parts={[
                  { name: "hop1", value: d.breakdowns.hops.hop1, color: HOP_COLORS.hop1 },
                  { name: "hop2", value: d.breakdowns.hops.hop2, color: HOP_COLORS.hop2 },
                  { name: "hop3", value: d.breakdowns.hops.hop3, color: HOP_COLORS.hop3 },
                  { name: "hop4p", value: d.breakdowns.hops.hop4p, color: HOP_COLORS.hop4p },
                ]}
                tooltipTitle="Hop depth"
                nameMap={HOP_LABELS}
                iconMap={HOP_ICONS}
                valueFmt={(v) => fmtInt(v)}
                size={92}
                emptyLabel="No redirects"
              />
              <div className="leading-tight text-center sm:text-left">
                <div className="text-[22px] font-bold text-[color:var(--focus,#0077FF)]">
                  {fmtInt(d.totalRedirects)}
                </div>
                <div className="mt-0.5">
                  <DeltaBadge raw={deltaTotal} goodUp />
                </div>
                <div className="text-[11px] text-[color:var(--text-muted,#6B7280)]">
                  By hop depth
                </div>
              </div>
            </div>
            {/* Trend: stacked area (hop1..hop4p) */}
            <div className="w-full min-w-0 xl:flex-1">
              <div className="mb-1 text-[12px]" style={{ color: TOKENS.muted }}>
                Last {hopSeriesLen} audits
              </div>
              <div className="h-16 w-full pr-1" role="img" aria-label="Hops trend">
                <ResponsiveContainer>
                  <AreaChart data={hopStack} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                      content={
                        <TotalBreakdownTooltip
                          title="Total Redirects"
                          valueFmt={(v) => fmtInt(v)}
                          nameMap={HOP_LABELS}
                          iconMap={HOP_ICONS}
                        />
                      }
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 60 }}
                      cursor={{
                        stroke: TOKENS.valueBlue,
                        strokeOpacity: 0.18,
                        strokeWidth: 1,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hop1"
                      stackId="a"
                      stroke={HOP_COLORS.hop1}
                      fill={HOP_COLORS.hop1}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="hop2"
                      stackId="a"
                      stroke={HOP_COLORS.hop2}
                      fill={HOP_COLORS.hop2}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="hop3"
                      stackId="a"
                      stroke={HOP_COLORS.hop3}
                      fill={HOP_COLORS.hop3}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="hop4p"
                      stackId="a"
                      stroke={HOP_COLORS.hop4p}
                      fill={HOP_COLORS.hop4p}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <ReferenceLine y={0} stroke={TOKENS.muted} strokeOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SmallCard>

        {/* 2) Redirect Types: donut (301/302/JS/Meta) + trend (Internal/External) */}
        <SmallCard title="Redirect Types" icon={LinkIcon}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {/* Snapshot: donut of status types */}
            <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
              <StackedDonut
                parts={[
                  { name: "http301", value: d.breakdowns.types.http301, color: TOKENS.valueBlue },
                  { name: "http302", value: d.breakdowns.types.http302, color: TOKENS.status.info },
                  { name: "js", value: d.breakdowns.types.js, color: TOKENS.status.warn },
                  { name: "meta", value: d.breakdowns.types.meta, color: TOKENS.status.gray },
                ]}
                tooltipTitle="Redirect types"
                nameMap={{
                  http301: "301 (Permanent)",
                  http302: "302/307 (Temp)",
                  js: "JS",
                  meta: "Meta",
                }}
                valueFmt={(v) => fmtInt(v)}
                size={92}
                emptyLabel="No redirects"
              />
              <div className="leading-tight text-center sm:text-left">
                <div className="text-[22px] font-bold text-[color:var(--focus,#0077FF)]">
                  {fmtInt(Object.values(d.breakdowns.types).reduce((a, b) => a + b, 0))}
                </div>
                <div className="mt-0.5">
                  {/* delta mirrors total redirects delta as types sum == total */}
                  <DeltaBadge raw={deltaTotal} goodUp />
                </div>
                <div className="text-[11px] text-[color:var(--text-muted,#6B7280)]">
                  Status / Client-side
                </div>
              </div>
            </div>
            {/* Trend: internal vs external */}
            <div className="w-full min-w-0 xl:flex-1">
              <div className="mb-1 text-[12px]" style={{ color: TOKENS.muted }}>
                Internal vs External
              </div>
              <div className="h-16 w-full pr-1" role="img" aria-label="Internal vs External trend">
                <ResponsiveContainer>
                  <AreaChart data={intExtSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                      content={
                        <TotalBreakdownTooltip
                          title="Types by scope"
                          valueFmt={(v) => fmtInt(v)}
                          nameMap={{ internal: "Internal", external: "External" }}
                        />
                      }
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 60 }}
                      cursor={{
                        stroke: TOKENS.valueBlue,
                        strokeOpacity: 0.18,
                        strokeWidth: 1,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="internal"
                      stackId="a"
                      stroke={TOKENS.valueBlue}
                      fill={TOKENS.valueBlue}
                      fillOpacity={0.26}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="external"
                      stackId="a"
                      stroke={TOKENS.status.gray}
                      fill={TOKENS.status.gray}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: TOKENS.muted }}>
                <span className="mr-3">
                  Internal{" "}
                  <strong style={{ color: TOKENS.textStrong }}>
                    {fmtInt(d.breakdowns.intExt.internal)}
                  </strong>
                </span>
                <span>
                  External{" "}
                  <strong style={{ color: TOKENS.textStrong }}>
                    {fmtInt(d.breakdowns.intExt.external)}
                  </strong>
                </span>
                <span className="ml-3">
                  <DeltaBadge raw={deltaInternal + deltaExternal} goodUp />
                </span>
              </div>
            </div>
          </div>
        </SmallCard>

        {/* 3) Redirect Chains (w/ Loops) — left mini bars + right trend */}
        <SmallCard title="Redirect Chains (w/ Loops)" icon={GitBranch}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {/* Snapshot: left vertical mini bars */}
            <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
              <MiniBarsPair
                left={{
                  label: "Chains",
                  value: d.breakdowns.chains,
                  color: TOKENS.status.warn,
                  Icon: GitBranch,
                }}
                right={{
                  label: "Loops",
                  value: d.breakdowns.loops,
                  color: TOKENS.status.danger,
                  Icon: RefreshCcw,
                }}
              />
            </div>

            {/* Trend */}
            <div className="w-full min-w-0 xl:flex-1">
              <div className="mb-1 text-[12px]" style={{ color: TOKENS.muted }}>
                Last {chainLen} audits
              </div>
              <div className="h-16 w-full pr-1" role="img" aria-label="Chains & Loops trend">
                <ResponsiveContainer>
                  <AreaChart data={chainLoopSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                      content={
                        <TotalBreakdownTooltip
                          title="Chains & Loops"
                          nameMap={{ chains: "Chains", loops: "Loops" }}
                          valueFmt={(v) => fmtInt(v)}
                        />
                      }
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 60 }}
                      cursor={{
                        stroke: TOKENS.valueBlue,
                        strokeOpacity: 0.18,
                        strokeWidth: 1,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="chains"
                      stroke={TOKENS.status.warn}
                      fill={TOKENS.status.warn}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="loops"
                      stroke={TOKENS.status.danger}
                      fill={TOKENS.status.danger}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SmallCard>

        {/* 4) Invalid Redirects — donut mix + stacked trend with same breakdown */}
        <SmallCard title="Invalid Redirects" icon={RefreshCcw}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            {/* Snapshot donut */}
            <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
              <StackedDonut
                parts={[
                  { name: "to4xx", value: d.breakdowns.invalid.to4xx, color: TOKENS.status.warn },
                  { name: "to5xx", value: d.breakdowns.invalid.to5xx, color: TOKENS.status.danger },
                  { name: "nonHtml", value: d.breakdowns.invalid.nonHtml, color: TOKENS.status.info },
                  { name: "other", value: d.breakdowns.invalid.other, color: TOKENS.status.gray },
                ]}
                tooltipTitle="Invalid mix"
                nameMap={{
                  to4xx: "To 4xx",
                  to5xx: "To 5xx",
                  nonHtml: "Non-HTML",
                  other: "Other",
                }}
                valueFmt={(v) => fmtInt(v)}
                size={92}
                emptyLabel="No invalid redirects"
              />
              <div className="leading-tight text-center sm:text-left">
                <div className="text-[22px] font-bold text-[color:var(--focus,#0077FF)]">
                  {fmtInt(
                    d.breakdowns.invalid.to4xx +
                      d.breakdowns.invalid.to5xx +
                      d.breakdowns.invalid.nonHtml +
                      d.breakdowns.invalid.other
                  )}
                </div>
                <div className="mt-0.5">
                  <DeltaBadge raw={deltaInvalid} goodUp={false} />
                </div>
                <div className="text-[11px] text-[color:var(--text-muted,#6B7280)]">
                  By invalid type
                </div>
              </div>
            </div>
            {/* Trend: same mix stacked */}
            <div className="w-full min-w-0 xl:flex-1">
              <div className="mb-1 text-[12px]" style={{ color: TOKENS.muted }}>
                Last {invLen} audits
              </div>
              <div className="h-16 w-full pr-1" role="img" aria-label="Invalid mix trend">
                <ResponsiveContainer>
                  <AreaChart data={invalidSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RTooltip
                      content={
                        <TotalBreakdownTooltip
                          title="Invalid Redirects"
                          valueFmt={(v) => fmtInt(v)}
                          nameMap={{
                            to4xx: "To 4xx",
                            to5xx: "To 5xx",
                            nonHtml: "Non-HTML",
                            other: "Other",
                          }}
                        />
                      }
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 60 }}
                      cursor={{
                        stroke: TOKENS.valueBlue,
                        strokeOpacity: 0.18,
                        strokeWidth: 1,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="to4xx"
                      stackId="b"
                      stroke={TOKENS.status.warn}
                      fill={TOKENS.status.warn}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="to5xx"
                      stackId="b"
                      stroke={TOKENS.status.danger}
                      fill={TOKENS.status.danger}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="nonHtml"
                      stackId="b"
                      stroke={TOKENS.status.info}
                      fill={TOKENS.status.info}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="other"
                      stackId="b"
                      stroke={TOKENS.status.gray}
                      fill={TOKENS.status.gray}
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SmallCard>
      </div>
    </section>
  );
}
