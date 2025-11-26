"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
import {
  Info,
  FileDown,
  BarChart3,
  Gauge,
  Eye,
  TrendingUp,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  Lock,
} from "lucide-react";

/* =============================================================================
   THEME / TOKENS
============================================================================= */
const TOKENS = {
  brand: "#008CCD",     // branded icons for section/card titles
  valueBlue: "#0077FF", // primary numeric color
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  success: "#10B981",
  danger: "#EF4444",
  warn: "#F59E0B",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

/* =============================================================================
   TYPES — kept compatible with your existing section
============================================================================= */
export type SeriesPoint = { date: string; value: number };
export type Delta = { raw: number; isGood: boolean } | null;

export type PageSnapshotKPIData = {
  seoScore: { value: number; series?: SeriesPoint[] };                 // 0–100
  visibilityScore: { valuePct: number; series?: SeriesPoint[] };       // 0–100 (%)
  estimatedTraffic: { value: number; series?: SeriesPoint[]; ctrPct?: number };
  rankingKeywords: { count: number; series?: SeriesPoint[] };
};

export type PageSnapshotKPIProps = {
  data: PageSnapshotKPIData;
  isPro?: boolean;
  onJump: (
    dest:
      | "keywords-top10"
      | "keywords-all"
      | "keywords-traffic"
      | "relevance-signals"
  ) => void;
  onExport?: (fmt: "csv" | "png" | "pdf") => void;
  className?: string;
};

/* =============================================================================
   UTILS
============================================================================= */
const intFmt = new Intl.NumberFormat();
const pctStr = (v: number, d = 1) => `${v.toFixed(d)}%`;
const nf = (n: number) => intFmt.format(n);
const kf = (n: number) => {
  const abs = Math.abs(n);
  if (abs < 1000) return `${n}`;
  if (abs < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  if (abs < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1_000_000_000).toFixed(1)}B`;
};
const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
function mkSeries(len = 14, start = 100, amp = 0.12): SeriesPoint[] {
  const startISO = addDays(todayISO(), -(len - 1));
  return Array.from({ length: len }, (_, i) => {
    const iso = addDays(startISO, i);
    const wiggle = 1 + Math.sin(i * 0.5) * amp + (Math.random() - 0.5) * 0.12;
    return { date: iso, value: Math.max(0, Math.round(start * wiggle)) };
  });
}
const deltaFrom = (s?: SeriesPoint[]) =>
  !s || s.length < 2 ? undefined : (s[s.length - 1].value - s[s.length - 2].value);
const toDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

/* =============================================================================
   BREAKDOWN HELPERS — build stacked rows for donut + trend
============================================================================= */
type Row = { t: string } & Record<string, any>;
type SplitSpec = { key: string; label: string; baseShare: number };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function splitSeries(
  total: SeriesPoint[] | undefined,
  parts: SplitSpec[],
  jitter = 0.06
): Row[] {
  const src = total ?? [];
  const rows: Row[] = [];
  for (let i = 0; i < src.length; i++) {
    const totalV = Math.max(0, src[i].value || 0);
    let rem = 1;
    const shares: Record<string, number> = {};
    parts.forEach((sp, idx) => {
      const wiggle = clamp01(
        sp.baseShare * (1 + Math.sin((i + 1) * (idx + 2) * 0.27) * jitter)
      );
      const val = idx === parts.length - 1 ? rem : Math.min(rem, wiggle);
      rem -= val;
      shares[sp.key] = val;
    });
    const sum = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
    Object.keys(shares).forEach((k) => (shares[k] = shares[k] / sum));
    const out: Row = { t: src[i].date };
    parts.forEach(
      (sp) => (out[sp.key] = Math.max(0, Math.round(totalV * shares[sp.key])))
    );
    rows.push(out);
  }
  return rows;
}

const toShare = (rows: Row[], keys: string[]) =>
  rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });

function lastParts(
  rows: Row[],
  keys: string[],
  colors: Record<string, string>
) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({
      key: k,
      name: k,
      value: Number(r[k] || 0),
      color: colors[k],
    }))
    .sort((a, b) => b.value - a.value);
}

/* =============================================================================
   PORTALED TOOLTIP SHELL (smart popovers with hover highlight)
============================================================================= */
function PortalTooltipShell({
  x,
  y,
  width = 280,
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
    <div
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 2147483647,
        pointerEvents: "none",
        isolation: "isolate",
      }}
    >
      <div
        className="rounded-md p-2 text-xs shadow ring-1"
        style={{
          backgroundColor: "#fff",
          border: `1px solid ${TOKENS.border}`,
          color: TOKENS.text,
          borderRadius: 6,
          pointerEvents: "auto", // allow hover highlight inside popover
        }}
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
  valueFmt,
  asShare = false,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  asShare?: boolean;
}) {
  const [hoverKey, setHoverKey] = React.useState<string | undefined>(undefined);
  React.useEffect(() => setHoverKey(undefined), [label]);

  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  const rows = (payload ?? []) as Array<{
    name: string;
    value: number;
    color: string;
  }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const fmt =
    valueFmt ??
    ((v: number) => (asShare ? pctStr(v, 1) : intFmt.format(Math.round(v))));

  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>

      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TOKENS.muted }}>
            Total
          </span>
          <span className="font-semibold">
            {intFmt.format(Math.round(total))}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {rows.map((p, i) => {
          const isActive = hoverKey ? p.name === hoverKey : i === 0;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverKey(p.name)}
              onMouseLeave={() => setHoverKey(undefined)}
              className={cn(
                "flex items-center justify-between gap-6 rounded px-1 py-0.5",
                isActive && "bg-[rgba(0,0,0,0.03)]"
              )}
              style={{ cursor: "default" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: p.color }}
                />
                <span
                  className={cn(isActive ? "font-semibold" : "")}
                  style={{ color: TOKENS.muted }}
                >
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div
                className={cn(
                  "font-semibold",
                  isActive && "text-[color:var(--focus,#0077FF)]"
                )}
              >
                {fmt(Number(p.value))}
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

function DonutPortalContent({
  active,
  payload,
  coordinate,
  containerRect,
  parts,
  nameMap,
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  payload?: any[];
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
}) {
  const [hoverKey, setHoverKey] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    const hovered = payload?.[0]?.name as string | undefined;
    setHoverKey(hovered);
  }, [payload?.[0]?.name]);

  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));

  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = hoverKey ? p.name === hoverKey : i === 0;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverKey(p.name)}
              onMouseLeave={() => setHoverKey(undefined)}
              className={cn(
                "flex items-center justify-between gap-6 rounded px-1 py-0.5",
                isActive && "bg-[rgba(0,0,0,0.03)]"
              )}
              style={{ cursor: "default" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: p.color }}
                />
                <span
                  className={cn(isActive ? "font-semibold" : "")}
                  style={{ color: TOKENS.muted }}
                >
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div
                className={cn(
                  "font-semibold",
                  isActive && "text-[color:var(--focus,#0077FF)]"
                )}
              >
                {fmt(Number(p.value))}
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* =============================================================================
   SNAPSHOT DONUT
============================================================================= */
function StackedDonut({
  parts,
  size = 92,
  nameMap,
  valueFmt,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  nameMap?: Record<string, string>;
  valueFmt?: (n: number) => string;
}) {
  const data = parts
    .filter((p) => (p.value ?? 0) > 0)
    .map((p) => ({ ...p, v: p.value }));
  const [active, setActive] = React.useState<number | undefined>(undefined);
  const ref = React.useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={(tp: any) => (
              <DonutPortalContent
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                parts={data}
                nameMap={nameMap}
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
            activeShape={({
              cx,
              cy,
              innerRadius,
              outerRadius,
              startAngle,
              endAngle,
              fill,
            }: any) => (
              <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 4}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{
                  filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))",
                }}
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

/* =============================================================================
   TREND STACK (area or bars, supports % share)
============================================================================= */
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
  const data = share ? toShare(rows, keys) : rows;
  const asShare = share;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) =>
    asShare ? pctStr(v, 1) : intFmt.format(Math.round(v));

  return (
    <div
      ref={ref}
      className="h-16 min-w-[160px]"
      role="img"
      aria-label="KPI trend"
    >
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
                  valueFmt={valueFmt}
                  asShare={asShare}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TOKENS.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stackId="a"
                stroke={colors[k]}
                fill={colors[k]}
                fillOpacity={0.25}
                strokeWidth={2}
                dot={false}
              />
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
                  valueFmt={valueFmt}
                  asShare={asShare}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="a"
                fill={colors[k]}
                radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
            <ReferenceLine y={0} stroke={TOKENS.muted} strokeOpacity={0.12} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* =============================================================================
   DELTA BADGE (±, color-aware, unit support)
============================================================================= */
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
        <Minus size={14} />
        —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TOKENS.muted : good ? TOKENS.success : TOKENS.danger;
  const label =
    unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
      : unit === "pt"
      ? `${Math.abs(delta).toFixed(1)}`
      : intFmt.format(Math.round(Math.abs(delta)));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <Icon size={14} />
      {label}
    </span>
  );
}

/* =============================================================================
   CARD SHELL
============================================================================= */
function BrandGlyph({ icon, size = 16 }: { icon?: React.ReactNode; size?: number }) {
  return icon ? <span>{icon}</span> : <BarChart3 size={size} color={TOKENS.brand} />;
}

function KpiCard({
  title,
  info,
  glyph,
  donut,
  value,
  valueFmt,
  delta,
  deltaUnit,
  invert,
  trend,
  onClick,
}: {
  title: string;
  info?: string;
  glyph?: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "s" | "pt";
  invert?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left cursor-pointer"
      aria-label={`${title} card`}
      style={{ fontFamily: 'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif' }}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TOKENS.border }}
      >
        {/* Title row with branded icon + info tooltip near title */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BrandGlyph icon={glyph} />
            <div
              className="truncate text-[13px] font-semibold"
              style={{ color: TOKENS.text }}
            >
              {title}
            </div>
            <span
              className="inline-flex items-center pl-1 text-[#9CA3AF]"
              title={info}
              aria-label={info}
              style={{ cursor: "help" }}
            >
              <Info size={14} />
            </span>
          </div>
        </div>

        {/* Content: donut | value/delta | trend */}
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

/* =============================================================================
   EXPORT MENU (CSV / PNG / PDF (Pro))
============================================================================= */
function ExportMenu({
  onExport,
  isPro,
}: {
  onExport?: (fmt: "csv" | "png" | "pdf") => void;
  isPro?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);
  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
        style={{ borderColor: TOKENS.border, background: TOKENS.panel, color: TOKENS.valueBlue, cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Export KPI Summary"
      >
        <FileDown size={16} />
        <span>Export</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-40 rounded-md border bg-white p-1 shadow"
          style={{ borderColor: TOKENS.border }}
          onMouseLeave={close}
        >
          <button
            role="menuitem"
            className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              close();
              onExport?.("csv");
            }}
            style={{ cursor: "pointer" }}
          >
            CSV (Summary)
          </button>
          <button
            role="menuitem"
            className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              close();
              onExport?.("png");
            }}
            style={{ cursor: "pointer" }}
          >
            PNG (Cards)
          </button>
          <button
            role="menuitem"
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              if (!isPro) return;
              close();
              onExport?.("pdf");
            }}
            style={{ cursor: isPro ? "pointer" : "not-allowed", color: isPro ? undefined : TOKENS.muted }}
            title={isPro ? "Export PDF" : "Upgrade to Pro to export PDF"}
          >
            <span>PDF (Pro)</span>
            {!isPro && <Lock size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
   MAIN — Anchor Risk Audit · KPI Summary (redesigned)
   - keeps your 4 KPIs but uses stacked donuts + stacked trends with smart popover
============================================================================= */
export function AnchorRiskAudit_KPISummaryRedesigned({
  data,
  isPro,
  onJump,
  onExport,
  className,
}: PageSnapshotKPIProps) {
  // Normalize / fallback series from input (keeps original keys)
  const seoSP = React.useMemo(
    () => (data.seoScore.series?.length ? data.seoScore.series! : mkSeries(14, data.seoScore.value || 80, 0.08)),
    [data.seoScore.value, data.seoScore.series]
  );
  const visSP = React.useMemo(
    () => (data.visibilityScore.series?.length ? data.visibilityScore.series! : mkSeries(14, Math.round(data.visibilityScore.valuePct || 50), 0.06)),
    [data.visibilityScore.valuePct, data.visibilityScore.series]
  );
  const trfSP = React.useMemo(
    () => (data.estimatedTraffic.series?.length ? data.estimatedTraffic.series! : mkSeries(14, Math.max(50, data.estimatedTraffic.value || 1000), 0.16)),
    [data.estimatedTraffic.value, data.estimatedTraffic.series]
  );
  const kwSP = React.useMemo(
    () => (data.rankingKeywords.series?.length ? data.rankingKeywords.series! : mkSeries(14, data.rankingKeywords.count || 30, 0.14)),
    [data.rankingKeywords.count, data.rankingKeywords.series]
  );

  // Values — prefer explicit prop, fallback to last point in series
  const seoValue = data.seoScore.value ?? (seoSP.at(-1)?.value ?? 0);
  const visValue = data.visibilityScore.valuePct ?? (visSP.at(-1)?.value ?? 0);
  const trfValue = data.estimatedTraffic.value ?? (trfSP.at(-1)?.value ?? 0);
  const kwValue  = data.rankingKeywords.count ?? (kwSP.at(-1)?.value ?? 0);

  // Deltas (last vs previous)
  const dSeo = deltaFrom(seoSP);
  const dVis = deltaFrom(visSP);
  const dTrf = deltaFrom(trfSP);
  const dKw  = deltaFrom(kwSP);

  // Breakdown specs + color maps (donut + trend share the same breakdown)
  // 1) SEO Score — contributions
  const SEO: SplitSpec[] = [
    { key: "se_onpage",   label: "On‑page",   baseShare: 0.36 },
    { key: "se_tech",     label: "Technical", baseShare: 0.26 },
    { key: "se_authority",label: "Authority", baseShare: 0.22 },
    { key: "se_ux",       label: "UX",        baseShare: 0.16 },
  ];
  const SEO_COLORS: Record<string, string> = {
    se_onpage: TOKENS.success,
    se_tech: "#60A5FA",
    se_authority: "#8B5CF6",
    se_ux: TOKENS.gray,
  };
  const SEO_NAMES = {
    se_onpage: "On‑page",
    se_tech: "Technical",
    se_authority: "Authority",
    se_ux: "UX",
  };

  // 2) Visibility Score — rank buckets inside Top 100 (shares of visibility)
  const VIS: SplitSpec[] = [
    { key: "vs_top3",     label: "Top 3",     baseShare: 0.32 },
    { key: "vs_4_10",     label: "Pos 4–10",  baseShare: 0.28 },
    { key: "vs_11_20",    label: "Pos 11–20", baseShare: 0.22 },
    { key: "vs_21_100",   label: "Pos 21–100",baseShare: 0.18 },
  ];
  const VIS_COLORS: Record<string, string> = {
    vs_top3: "#22C55E",
    vs_4_10: "#60A5FA",
    vs_11_20: TOKENS.warn,
    vs_21_100: TOKENS.gray,
  };
  const VIS_NAMES = {
    vs_top3: "Top 3",
    vs_4_10: "Positions 4–10",
    vs_11_20: "Positions 11–20",
    vs_21_100: "Positions 21–100",
  };

  // 3) Estimated Organic Traffic — traffic by ranking buckets
  const TRF: SplitSpec[] = [
    { key: "tr_top3",   label: "Top 3",     baseShare: 0.34 },
    { key: "tr_4_10",   label: "Pos 4–10",  baseShare: 0.30 },
    { key: "tr_11_50",  label: "Pos 11–50", baseShare: 0.22 },
    { key: "tr_51_100", label: "Pos 51–100",baseShare: 0.14 },
  ];
  const TRF_COLORS: Record<string, string> = {
    tr_top3: "#22C55E",
    tr_4_10: "#60A5FA",
    tr_11_50: "#8B5CF6",
    tr_51_100: TOKENS.gray,
  };
  const TRF_NAMES = {
    tr_top3: "Top 3",
    tr_4_10: "Positions 4–10",
    tr_11_50: "Positions 11–50",
    tr_51_100: "Positions 51–100",
  };

  // 4) Ranking Keywords — rank buckets
  const KW: SplitSpec[] = [
    { key: "kw_top3",    label: "Top 3",     baseShare: 0.18 },
    { key: "kw_4_10",    label: "Pos 4–10",  baseShare: 0.28 },
    { key: "kw_11_20",   label: "Pos 11–20", baseShare: 0.20 },
    { key: "kw_21_50",   label: "Pos 21–50", baseShare: 0.18 },
    { key: "kw_51_100",  label: "Pos 51–100",baseShare: 0.16 },
  ];
  const KW_COLORS: Record<string, string> = {
    kw_top3: "#22C55E",
    kw_4_10: "#60A5FA",
    kw_11_20: "#8B5CF6",
    kw_21_50: TOKENS.warn,
    kw_51_100: TOKENS.gray,
  };
  const KW_NAMES = {
    kw_top3: "Top 3",
    kw_4_10: "Positions 4–10",
    kw_11_20: "Positions 11–20",
    kw_21_50: "Positions 21–50",
    kw_51_100: "Positions 51–100",
  };

  // Build stacked rows (snapshot + trend use the same breakdown)
  const seoRows = React.useMemo(() => splitSeries(seoSP, SEO, 0.05), [seoSP]);
  const visRows = React.useMemo(() => splitSeries(visSP, VIS, 0.05), [visSP]);
  const trfRows = React.useMemo(() => splitSeries(trfSP, TRF, 0.05), [trfSP]);
  const kwRows  = React.useMemo(() => splitSeries(kwSP,  KW,  0.05), [kwSP]);

  // Trend share toggle (modern chip)
  const [shareMode, setShareMode] = React.useState<boolean>(false);

  // Branded glyphs for each card
  const iconSEO  = <Gauge size={16} color={TOKENS.brand} />;
  const iconVIS  = <Eye size={16} color={TOKENS.brand} />;
  const iconTRF  = <TrendingUp size={16} color={TOKENS.brand} />;
  const iconKW   = <Hash size={16} color={TOKENS.brand} />;

  return (
    <section
      className={className}
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header: branded icon + title + info + chip + export */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TOKENS.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            KPI Summary
          </h3>
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
          {/* Share chip */}
          <label
            className="inline-flex items-center gap-2 text-xs rounded-full border px-3 py-1.5 bg-white"
            style={{ color: TOKENS.muted, borderColor: TOKENS.border, cursor: "pointer" }}
            title="Toggle trends between absolute values and % share (per‑day mix)"
          >
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{
                accentColor: TOKENS.valueBlue,
                borderColor: TOKENS.border,
                cursor: "pointer",
              }}
            />
            Show % share
          </label>

          <ExportMenu onExport={onExport} isPro={isPro} />
        </div>
      </div>

      {/* Grid 2x2 (lg+) / stacked (sm) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {/* 1) SEO Score */}
        <KpiCard
          title="SEO Score (Organic)"
          info="Calculated from on‑page, technical, authority and UX signals (0–100)."
          glyph={iconSEO}
          donut={
            <StackedDonut
              parts={lastParts(
                seoRows,
                ["se_onpage", "se_tech", "se_authority", "se_ux"],
                SEO_COLORS
              ).map((p) => ({ ...p, name: p.key }))}
              nameMap={SEO_NAMES}
              valueFmt={(v) => nf(Math.round(v))}
            />
          }
          value={seoValue}
          valueFmt={(v) => `${Math.round(v)}/100`}
          delta={typeof dSeo === "number" ? dSeo : undefined}
          deltaUnit="pt"
          trend={
            <TrendStack
              rows={seoRows}
              keys={["se_onpage", "se_tech", "se_authority", "se_ux"]}
              colors={SEO_COLORS}
              names={SEO_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onJump("relevance-signals")}
        />

        {/* 2) Visibility Score */}
        <KpiCard
          title="Visibility Score"
          info="Top‑10 share of ranked keywords for this page (device & country scoped)."
          glyph={iconVIS}
          donut={
            <StackedDonut
              parts={lastParts(
                visRows,
                ["vs_top3", "vs_4_10", "vs_11_20", "vs_21_100"],
                VIS_COLORS
              ).map((p) => ({ ...p, name: p.key }))}
              nameMap={VIS_NAMES}
              valueFmt={(v) => nf(Math.round(v))}
            />
          }
          value={visValue}
          valueFmt={(v) => `${(v as number).toFixed(1)}%`}
          delta={typeof dVis === "number" ? dVis : undefined}
          deltaUnit="pp"
          trend={
            <TrendStack
              rows={visRows}
              keys={["vs_top3", "vs_4_10", "vs_11_20", "vs_21_100"]}
              colors={VIS_COLORS}
              names={VIS_NAMES}
              mode="area"
              share={shareMode}
            />
          }
          onClick={() => onJump("keywords-top10")}
        />

        {/* 3) Estimated Organic Traffic */}
        <KpiCard
          title="Estimated Organic Traffic"
          info="Estimated monthly visits based on the traffic model; trend shows rank‑bucket mix."
          glyph={iconTRF}
          donut={
            <StackedDonut
              parts={lastParts(
                trfRows,
                ["tr_top3", "tr_4_10", "tr_11_50", "tr_51_100"],
                TRF_COLORS
              ).map((p) => ({ ...p, name: p.key }))}
              nameMap={TRF_NAMES}
              valueFmt={(v) => nf(Math.round(v))}
            />
          }
          value={trfValue}
          valueFmt={(v) => kf(v)}
          delta={typeof dTrf === "number" ? dTrf : undefined}
          trend={
            <TrendStack
              rows={trfRows}
              keys={["tr_top3", "tr_4_10", "tr_11_50", "tr_51_100"]}
              colors={TRF_COLORS}
              names={TRF_NAMES}
              mode="area"
              share={shareMode}
            />
          }
          onClick={() => onJump("keywords-traffic")}
        />

        {/* 4) Ranking Keywords (Top 100) */}
        <KpiCard
          title="Ranking Keywords (Top 100)"
          info="Total keywords in Google Top 100 that map to this page (current scope)."
          glyph={iconKW}
          donut={
            <StackedDonut
              parts={lastParts(
                kwRows,
                ["kw_top3", "kw_4_10", "kw_11_20", "kw_21_50", "kw_51_100"],
                KW_COLORS
              ).map((p) => ({ ...p, name: p.key }))}
              nameMap={KW_NAMES}
              valueFmt={(v) => nf(Math.round(v))}
            />
          }
          value={kwValue}
          valueFmt={(v) => nf(v)}
          delta={typeof dKw === "number" ? dKw : undefined}
          trend={
            <TrendStack
              rows={kwRows}
              keys={["kw_top3", "kw_4_10", "kw_11_20", "kw_21_50", "kw_51_100"]}
              colors={KW_COLORS}
              names={KW_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
          onClick={() => onJump("keywords-all")}
        />
      </div>
    </section>
  );
}

/* =============================================================================
   OPTIONAL DEMO (remove if not needed)
============================================================================= */
const toISO = (d: Date) => d.toISOString().slice(0, 10);
function mkDemoSeries(days = 14, start = 100, amp = 10): SeriesPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: toISO(d), value: Math.max(0, Math.round(start + Math.sin(i / 2) * amp)) };
  });
}

export function demoPageSnapshotData(): PageSnapshotKPIData {
  return {
    seoScore: { value: 82, series: mkDemoSeries(14, 80, 4) },
    visibilityScore: { valuePct: 54.2, series: mkDemoSeries(14, 52, 3) },
    estimatedTraffic: { value: 1150, ctrPct: 2.3, series: mkDemoSeries(14, 980, 120) },
    rankingKeywords: { count: 36, series: mkDemoSeries(14, 28, 6) },
  };
}

export function OrganicPageDrawer_Overview_KPIs() {
  const data = React.useMemo(() => demoPageSnapshotData(), []);
  return (
    <div className="p-4" style={{ background: "#F5F7FA" }}>
      <AnchorRiskAudit_KPISummaryRedesigned
        data={data}
        isPro={false}
        onJump={(dest) => console.log("Jump →", dest)}
        onExport={(fmt) => console.log("Export →", fmt)}
      />
    </div>
  );
}
