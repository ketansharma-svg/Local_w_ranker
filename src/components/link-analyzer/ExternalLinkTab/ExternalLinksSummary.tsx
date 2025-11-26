"use client";

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { MoreHorizontal, Info as InfoIcon, Download } from "lucide-react";
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
} from "recharts";
import { createPortal } from "react-dom";

/* -------------------------------------------------------------------------- */
/* TOKENS                                                                     */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Formatters / helpers                                                       */
/* -------------------------------------------------------------------------- */
const intFmt = new Intl.NumberFormat();
function fmtInt(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return intFmt.format(n);
}
function fmtPct01(p?: number | null, digits = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${(Math.max(0, Math.min(1, p)) * 100).toFixed(digits)}%`;
}
function fmtPct100(p?: number | null, digits = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${Math.max(0, p).toFixed(digits)}%`;
}
function caret(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v) || v === 0) return "—";
  return v > 0 ? "▲" : "▼";
}
function toDateLabel(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function safePctDelta(currPct01: number, prevPct01: number) {
  return (currPct01 - prevPct01) * 100;
}

/* -------------------------------------------------------------------------- */
/* Branded icon (section + card titles)                                       */
/* -------------------------------------------------------------------------- */
function BrandIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <img
      src="/mnt/data/Logo Icon 01.svg"
      alt=""
      className={className}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Shared UI atoms                                                            */
/* -------------------------------------------------------------------------- */

function KebabMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-label="More"
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
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50">
            Add to Report
          </button>
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50">
            Create Task
          </button>
        </div>
      )}
    </div>
  );
}

/* --------- OPAQUE portal popover used for title info hover ----------------- */
function HoverPortal({
  anchorEl,
  open,
  width = 260,
  children,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  width?: number;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const gap = 8;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const top = Math.min(rect.bottom + gap, window.innerHeight - 8);
    setPos({ top, left });
  }, [open, anchorEl, width]);

  useEffect(() => {
    if (!open) return;
    const onRecalc = () => setPos((p) => ({ ...p }));
    window.addEventListener("scroll", onRecalc, { passive: true, capture: true });
    window.addEventListener("resize", onRecalc, { passive: true });
    return () => {
      window.removeEventListener("scroll", onRecalc, true as any);
      window.removeEventListener("resize", onRecalc);
    };
  }, [open]);

  if (!open || !anchorEl || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 2147483647,
        pointerEvents: "none",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          border: `1px solid ${TOKENS.border}`,
          borderRadius: 8,
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
          mixBlendMode: "normal",
        }}
        className="ring-1 ring-black/10 overflow-hidden"
      >
        <div className="p-2 text-xs leading-snug" style={{ color: TOKENS.text }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function TitleWithHoverInfo({
  title,
  info,
  icon,
}: {
  title: string;
  info?: string;
  icon?: React.ReactNode;
}) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex min-w-0 items-center gap-2">
      {icon ?? <BrandIcon className="h-3.5 w-3.5" />}
      <div className="truncate text-[13px] font-semibold">{title}</div>
      {info ? (
        <>
          <button
            ref={anchorRef}
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
            aria-label="Info"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <InfoIcon size={15} />
          </button>
          <HoverPortal anchorEl={anchorRef.current} open={open}>
            {info}
          </HoverPortal>
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CARD SHELL                                                                 */
/* -------------------------------------------------------------------------- */
function CardShell({
  title,
  info,
  icon,
  onClick,
  children,
}: {
  title: string;
  info?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative z-0 w-full text-left"
    >
      <div
        className="rounded-[6px] border p-4 shadow-sm transition-transform hover:-translate-y-[2px] hover:z-20 focus-visible:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wr-value-blue,#0077FF)]/50"
        style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
      >
        <div className="flex items-center justify-between">
          <TitleWithHoverInfo title={title} info={info} icon={icon ?? <BrandIcon />} />
          <KebabMenu />
        </div>

        <div className="mt-2">{children}</div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* 100% OPAQUE, PORTALED TOOLTIP SHELL (ALWAYS ABOVE EVERYTHING)              */
/* -------------------------------------------------------------------------- */
type Coord = { x: number; y: number } | undefined;

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
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{
          backgroundColor: "#ffffff",
          border: `1px solid ${TOKENS.border}`,
          color: TOKENS.text,
          borderRadius: 6,
          mixBlendMode: "normal",
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ---------- Portaled content components consumed by Recharts --------------- */
function SmartPortalContent({
  active,
  label,
  payload,
  coordinate,
  viewBox,
  containerRect,
  formatValue,
  formatLabel,
  visible = true,
}: any & {
  coordinate?: Coord;
  viewBox?: any;
  containerRect?: DOMRect | null;
  formatValue?: (v: number, name?: string, p?: any) => string;
  formatLabel?: (l: any) => string;
  visible?: boolean;
}) {
  if (!active || !containerRect || !coordinate || !visible) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      {label !== undefined && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {formatLabel ? formatLabel(label) : String(label)}
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
              {formatValue ? formatValue(p.value as number, p.name, p) : fmtInt(p.value as number)}
            </div>
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
  title,
  parts,
  valueFmt,
  highlightIndex,
  visible = true,
}: any & {
  coordinate?: Coord;
  containerRect?: DOMRect | null;
  title?: string;
  parts: { name: string; value: number; color: string }[];
  valueFmt?: (v: number) => string;
  highlightIndex?: number | null;
  visible?: boolean;
}) {
  if (!active || !containerRect || !coordinate || !visible) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      {title && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {title}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = highlightIndex === i;
          return (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={isActive ? "font-semibold" : ""} style={{ color: isActive ? TOKENS.text : TOKENS.muted }}>
                  {p.name}
                </span>
              </div>
              <div className={isActive ? "font-bold" : "font-semibold"}>
                {valueFmt ? valueFmt(p.value) : fmtInt(p.value)}
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* -------------------------------------------------------------------------- */
/* VALUE DELTA                                                                */
/* -------------------------------------------------------------------------- */
function ValueDelta({
  delta,
  invert = false,
  unit = "pp",
  ariaId,
  explain,
}: {
  delta?: number;
  invert?: boolean;
  unit?: "pp" | "%" | "";
  ariaId?: string;
  explain?: string;
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <div id={ariaId} className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
        —
      </div>
    );
  }
  const isGood = invert ? delta < 0 : delta > 0;
  const color = isGood ? TOKENS.success : TOKENS.danger;
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

/* ---------- Single‑row legend --------------------------------------------- */

type LegendItem = { swatch: string; label: string; value?: string | number };

function useLegendMode(items: LegendItem[]) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"full" | "abbr" | "abbr-tight">("full");

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || 0;
      const estimated = items.reduce((s, it) => s + 12 + 8 + it.label.length * 7 + 6 + 40 + 16, 0);
      if (estimated > w * 1.25) setMode("abbr-tight");
      else if (estimated > w) setMode("abbr");
      else setMode("full");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [items]);

  return { ref, mode };
}

function LegendRow({ items }: { items: LegendItem[] }) {
  const { ref, mode } = useLegendMode(items);
  return (
    <div
      ref={ref}
      className="mt-3 flex w-full flex-nowrap items-center gap-4 border-t pt-2"
      style={{ borderColor: TOKENS.border }}
    >
      {items.map((it, i) => (
        <div key={i} className="relative flex items-center gap-2 text-[11px] leading-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: it.swatch }} />
          {mode === "full" ? (
            <>
              <span className="truncate" style={{ color: TOKENS.muted, maxWidth: 96 }}>
                {it.label}
              </span>
              {it.value !== undefined && (
                <span className="font-medium" style={{ color: TOKENS.text }}>
                  {it.value}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="font-semibold uppercase" style={{ color: TOKENS.muted }} title={it.label}>
                {it.label.slice(0, 1)}
              </span>
              {it.value !== undefined && (
                <span className="font-medium" style={{ color: TOKENS.text }}>
                  {it.value}
                </span>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* --------- Helpers to build 100% stacked trend from absolute counts -------- */
type Row = Record<string, number | string>;
function to100Stack(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0);
    const out: Row = { ...r };
    keys.forEach((k) => {
      const v = Number(r[k]) || 0;
      out[k] = sum > 0 ? (v / sum) * 100 : 0;
    });
    return out;
  });
}

/* -------------------------------------------------------------------------- */
/* CHARTS w/ PORTALED TOOLTIP (ESCAPES CARD BOUNDARIES & Z-INDEX)             */
/* -------------------------------------------------------------------------- */

/** 100% stacked area */
function StackedArea100({
  rows,
  keys,
  colors,
  aria,
  className,
  tooltipVisible = true,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  aria: string;
  className?: string;
  tooltipVisible?: boolean;
}) {
  const data = useMemo(() => to100Stack(rows, keys).map((r) => ({ ...r })), [rows, keys]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={containerRef} className={className ?? "h-16 w-full"} role="img" aria-label={aria}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={[0, 100]} />
          <RTooltip
            content={(tp: any) =>
              tooltipVisible ? (
                <SmartPortalContent
                  {...tp}
                  visible={tooltipVisible}
                  containerRect={containerRef.current?.getBoundingClientRect() ?? null}
                  formatLabel={(l) => toDateLabel(l as string)}
                  formatValue={(v: number) => fmtPct100(v, 1)}
                />
              ) : null
            }
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={false}
          />
          {keys.map((k) => (
            <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={colors[k]} fill={colors[k]} fillOpacity={0.9} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** 100% stacked bars */
function StackedBars100({
  rows,
  keys,
  colors,
  aria,
  className,
  tooltipVisible = true,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  aria: string;
  className?: string;
  tooltipVisible?: boolean;
}) {
  const data = useMemo(() => to100Stack(rows, keys).map((r) => ({ ...r })), [rows, keys]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={containerRef} className={className ?? "h-16 w-full"} role="img" aria-label={aria}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={[0, 100]} />
          <RTooltip
            content={(tp: any) =>
              tooltipVisible ? (
                <SmartPortalContent
                  {...tp}
                  visible={tooltipVisible}
                  containerRect={containerRef.current?.getBoundingClientRect() ?? null}
                  formatLabel={(l) => toDateLabel(l as string)}
                  formatValue={(v: number) => fmtPct100(v, 1)}
                />
              ) : null
            }
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={false}
          />
          {keys.map((k, idx) => (
            <Bar key={k} dataKey={k} stackId="a" fill={colors[k]} radius={idx === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Stacked donut (snapshot breakdown) */
function DonutSplit({
  parts,
  aria,
  size = 55,
  tooltipTitle,
  valueFmt = (v: number) => fmtPct01(v),
  tooltipVisible = true,
}: {
  parts: { name: string; value: number; color: string }[];
  aria: string;
  size?: number;
  tooltipTitle?: string;
  valueFmt?: (v: number) => string;
  tooltipVisible?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const data = parts.map((p) => ({ ...p, v: Math.max(0, Math.min(1, p.value)) }));
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={containerRef} className="h-20 w-20 shrink-0" role="img" aria-label={aria}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={(tp: any) =>
              tooltipVisible ? (
                <DonutPortalContent
                  {...tp}
                  visible={tooltipVisible}
                  containerRect={containerRef.current?.getBoundingClientRect() ?? null}
                  title={tooltipTitle}
                  parts={data}
                  valueFmt={valueFmt}
                  highlightIndex={activeIndex}
                />
              ) : null
            }
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={false}
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
            activeShape={({ ...props }) => {
              const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as any;
              return (
                <Sector
                  cx={cx}
                  cy={cy}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius + 1}
                  startAngle={startAngle}
                  endAngle={endAngle}
                  fill={fill}
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.18))" }}
                />
              );
            }}
            onMouseEnter={(_, i) => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={1} opacity={activeIndex === null || activeIndex === i ? 1 : 0.55} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Data contracts                                                             */
/* -------------------------------------------------------------------------- */
export type ExtBreakdownRow = { t: string } & Record<string, number>;

export interface ExternalLinksSummaryProps {
  total?: number;

  linkTypesSnapshot: { dofollow: number; nofollow: number; sponsored: number; ugc: number };
  linkTypesTrend: ExtBreakdownRow[];

  anchorKeys: string[];
  anchorSnapshot: Record<string, number>;
  anchorTrend: ExtBreakdownRow[];


  statusSnapshot: { s2xx: number; s3xx: number; s4xx: number; s5xx: number; other: number };
  statusTrend: ExtBreakdownRow[];

  riskSnapshot: { clean: number; suspicious: number; toxic: number };
  riskTrend: ExtBreakdownRow[];

  onOpenDrawer?: (kpi: "link_types" | "anchor_mix" | "status_codes" | "risk_mix") => void;
}



/* -------------------------------------------------------------------------- */
/* Palettes                                                                   */
/* -------------------------------------------------------------------------- */
const LT_COLORS: Record<string, string> = {
  dofollow: TOKENS.valueBlue,
  nofollow: TOKENS.info,
  sponsored: TOKENS.warning,
  ugc: TOKENS.success,
};

const ANCHOR_COLORS: Record<string, string> = {
  brand: "#005AD6",
  exact: TOKENS.danger,
  partial: TOKENS.valueBlue,
  generic: TOKENS.warning,
  url: "#7FB6FF",
  image: "#9CA3AF",
};

const SC_COLORS: Record<string, string> = {
  s2xx: TOKENS.success,
  s3xx: TOKENS.info,
  s4xx: TOKENS.warning,
  s5xx: TOKENS.danger,
  other: "#D1D5DB",
};

const RISK_COLORS: Record<string, string> = {
  clean: TOKENS.success,
  suspicious: TOKENS.warning,
  toxic: TOKENS.danger,
};

/* -------------------------------------------------------------------------- */
/* KPI cards                                                                  */
/* -------------------------------------------------------------------------- */
function LinkTypesCard({
  total,
  snapshot,
  trend,
  onClick,
  tooltipVisible = true,
}: {
  total?: number;
  snapshot: ExternalLinksSummaryProps["linkTypesSnapshot"];
  trend: ExternalLinksSummaryProps["linkTypesTrend"];
  onClick?: () => void;
  tooltipVisible?: boolean;
}) {
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2] ?? last;

  const currDofPct = (() => {
    const s = last.dofollow + last.nofollow + last.sponsored + last.ugc;
    return s > 0 ? last.dofollow / s : 0;
  })();
  const prevDofPct = (() => {
    const s = prev.dofollow + prev.nofollow + prev.sponsored + prev.ugc;
    return s > 0 ? prev.dofollow / s : 0;
  })();
  const deltaPP = safePctDelta(currDofPct, prevDofPct);

  const denom = last.dofollow + last.nofollow + last.sponsored + last.ugc || 1;
  const parts = [
    { name: "DoFollow", value: currDofPct, color: LT_COLORS.dofollow },
    { name: "NoFollow", value: last.nofollow / denom, color: LT_COLORS.nofollow },
    { name: "Sponsored", value: last.sponsored / denom, color: LT_COLORS.sponsored },
    { name: "UGC", value: last.ugc / denom, color: LT_COLORS.ugc },
  ];

  return (
    <CardShell
      title="Link Types Mix"
      info="Distribution of external link rel types. Snapshot shows current share; trend shows how the mix changed across recent crawls."
      icon={<BrandIcon />}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
          <DonutSplit parts={parts} aria="Link types donut" tooltipTitle="Link Types" tooltipVisible={tooltipVisible} />
          <div className="text-center sm:text-left">
            <output className="block text-[22px] font-bold" aria-describedby="lt-delta" style={{ color: TOKENS.valueBlue }}>
              DoFollow {fmtPct01(currDofPct)}
            </output>
            <ValueDelta delta={deltaPP} ariaId="lt-delta" unit="pp" />
            <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
              {fmtInt(total)} total external links
            </div>
          </div>
        </div>

        <div className="h-16 w-full min-w-0 xl:flex-1">
          <StackedArea100
            rows={trend}
            keys={["dofollow", "nofollow", "sponsored", "ugc"]}
            colors={LT_COLORS}
            aria="Link types share trend"
            className="h-16 w-full"
            tooltipVisible={tooltipVisible}
          />
        </div>
      </div>

      <LegendRow
        items={[
          { swatch: LT_COLORS.dofollow, label: "DoFollow", value: fmtInt(snapshot.dofollow) },
          { swatch: LT_COLORS.nofollow, label: "NoFollow", value: fmtInt(snapshot.nofollow) },
          { swatch: LT_COLORS.sponsored, label: "Sponsored", value: fmtInt(snapshot.sponsored) },
          { swatch: LT_COLORS.ugc, label: "UGC", value: fmtInt(snapshot.ugc) },
        ]}
      />
    </CardShell>
  );
}
const PALETTE = [
  "#0077FF", "#EF4444", "#10B981", "#F59E0B", "#3B82F6",
  "#7C3AED", "#06B6D4", "#0EA5E9", "#A855F7", "#84CC16",
  "#F97316", "#E11D48", "#475569", "#14B8A6", "#2563EB",
];

function colorForKey(key: string, keys: string[]) {
  const idx = Math.max(0, keys.indexOf(key));
  return PALETTE[idx % PALETTE.length];
}

function AnchorMixCard({
  snapshot,
  trend,
  anchorKeys,
  onClick,
  tooltipVisible = true,
}: {
  snapshot: Record<string, number>;
  trend: ExtBreakdownRow[];
  anchorKeys: string[];
  onClick?: () => void;
  tooltipVisible?: boolean;
}) {
  // last point carries current counts
  const last = trend[trend.length - 1] ?? { t: "" };
  const total = anchorKeys.reduce((s, k) => s + (Number((last as any)[k]) || 0), 0);
  const safeTotal = total > 0 ? total : 1;

  // donut parts: % per key, colour per key
  const parts = anchorKeys.map((k) => ({
    name: k, // show API key verbatim
    value: (Number((last as any)[k]) || 0) / safeTotal,
    color: colorForKey(k, anchorKeys),
  }));

  // optional delta: pick a stable key (first) just to show a pp change
  const prev = trend[trend.length - 2] ?? last;
  const headKeyRaw = anchorKeys[0] ?? "";
  const headLabel =
    headKeyRaw.length > 0
      ? headKeyRaw.charAt(0).toUpperCase() + headKeyRaw.slice(1).toLowerCase()
      : headKeyRaw;
  const currShare = headKeyRaw ? (Number((last as any)[headKeyRaw]) || 0) / safeTotal : 0;
  const prevTotal = anchorKeys.reduce((s, k) => s + (Number((prev as any)[k]) || 0), 0);
  const prevShare = headKeyRaw
    ? (Number((prev as any)[headKeyRaw]) || 0) / (prevTotal > 0 ? prevTotal : 1)
    : 0;
  const deltaPP = (currShare - prevShare) * 100;

  return (
    <CardShell
      title="Anchor Text Mix"
      info="Distribution of anchor text categories (as received from the API)."
      icon={<BrandIcon />}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
          <DonutSplit
            parts={parts}
            aria="Anchor mix donut"
            tooltipTitle="Anchor Mix"
            valueFmt={(v) => `${(v * 100).toFixed(1)}%`}
            tooltipVisible={tooltipVisible}
          />
          <div className="text-center sm:text-left">
            <output className="block text-[22px] font-bold" style={{ color: TOKENS.valueBlue }}>
              {(headLabel || "–")} {(currShare * 100).toFixed(1)}%
            </output>
            <ValueDelta delta={deltaPP} unit="pp" ariaId="am-delta" />
          </div>
        </div>

        <div className="h-16 w-full min-w-0 xl:flex-1">
          <StackedArea100
            rows={trend}
            keys={anchorKeys}
            colors={Object.fromEntries(anchorKeys.map(k => [k, colorForKey(k, anchorKeys)]))}
            aria="Anchor mix share trend"
            className="h-16 w-full"
            tooltipVisible={tooltipVisible}
          />
        </div>
      </div>

      <LegendRow
        items={anchorKeys.map((k) => ({
          swatch: colorForKey(k, anchorKeys),
          label: k,                      // show API key verbatim
          value: fmtInt(snapshot[k] ?? 0),
        }))}
      />
    </CardShell>
  );
}


function StatusCodesCard({
  snapshot,
  trend,
  onClick,
  tooltipVisible = true,
}: {
  snapshot: ExternalLinksSummaryProps["statusSnapshot"];
  trend: ExternalLinksSummaryProps["statusTrend"];
  onClick?: () => void;
  tooltipVisible?: boolean;
}) {
  const last = trend[trend.length - 1];
  const total = last.s2xx + last.s3xx + last.s4xx + last.s5xx + last.other || 1;
  const errorShare = (last.s4xx + last.s5xx) / total;
  const prev = trend[trend.length - 2] ?? last;
  const prevErrorShare = (prev.s4xx + prev.s5xx) / (prev.s2xx + prev.s3xx + prev.s4xx + prev.s5xx + prev.other || 1);
  const deltaPP = safePctDelta(errorShare, prevErrorShare);

  const parts = [
    { name: "2xx", value: last.s2xx / total, color: SC_COLORS.s2xx },
    { name: "3xx", value: last.s3xx / total, color: SC_COLORS.s3xx },
    { name: "4xx", value: last.s4xx / total, color: SC_COLORS.s4xx },
    { name: "5xx", value: last.s5xx / total, color: SC_COLORS.s5xx },
    { name: "Other", value: last.other / total, color: SC_COLORS.other },
  ];

  return (
    <CardShell
      title="Destination Status Codes"
      info="Share of outgoing link targets by HTTP status. Lower error share (4xx/5xx) is better."
      icon={<BrandIcon />}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
          <DonutSplit parts={parts} aria="Status codes donut" tooltipTitle="HTTP Status" tooltipVisible={tooltipVisible} />
          <div className="text-center sm:text-left">
            <output className="block text-[22px] font-bold" aria-describedby="sc-delta" style={{ color: TOKENS.valueBlue }}>
              Errors {fmtPct01(errorShare)}
            </output>
            <ValueDelta delta={deltaPP} invert ariaId="sc-delta" unit="pp" explain="Lower is better" />
          </div>
        </div>

        <div className="h-16 w-full min-w-0 xl:flex-1">
          <StackedBars100
            rows={trend}
            keys={["s2xx", "s3xx", "s4xx", "s5xx", "other"]}
            colors={SC_COLORS}
            aria="HTTP status mix trend"
            className="h-16 w-full"
            tooltipVisible={tooltipVisible}
          />
        </div>
      </div>

      <LegendRow
        items={[
          { swatch: SC_COLORS.s2xx, label: "2xx", value: fmtInt(snapshot.s2xx) },
          { swatch: SC_COLORS.s3xx, label: "3xx", value: fmtInt(snapshot.s3xx) },
          { swatch: SC_COLORS.s4xx, label: "4xx", value: fmtInt(snapshot.s4xx) },
          { swatch: SC_COLORS.s5xx, label: "5xx", value: fmtInt(snapshot.s5xx) },
          { swatch: SC_COLORS.other, label: "Other", value: fmtInt(snapshot.other) },
        ]}
      />
    </CardShell>
  );
}

function RiskMixCard({
  snapshot,
  trend,
  onClick,
  tooltipVisible = true,
}: {
  snapshot: ExternalLinksSummaryProps["riskSnapshot"];
  trend: ExternalLinksSummaryProps["riskTrend"];
  onClick?: () => void;
  tooltipVisible?: boolean;
}) {
  const last = trend[trend.length - 1];
  const total = last.clean + last.suspicious + last.toxic || 1;
  const highRiskShare = (last.suspicious + last.toxic) / total;

  const prev = trend[trend.length - 2] ?? last;
  const prevShare = (prev.suspicious + prev.toxic) / (prev.clean + prev.suspicious + prev.toxic || 1);
  const deltaPP = safePctDelta(highRiskShare, prevShare);

  const parts = [
    { name: "Clean", value: last.clean / total, color: RISK_COLORS.clean },
    { name: "Suspicious", value: last.suspicious / total, color: RISK_COLORS.suspicious },
    { name: "Toxic", value: last.toxic / total, color: RISK_COLORS.toxic },
  ];

  return (
    <CardShell
      title="Link Risk Mix"
      info="Risk classification of external link targets (heuristics & toxicity)."
      icon={<BrandIcon />}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row sm:items-center xl:flex-nowrap">
          <DonutSplit parts={parts} aria="Risk mix donut" tooltipTitle="Risk Mix" tooltipVisible={tooltipVisible} />
          <div className="text-center sm:text-left">
            <output className="block text-[22px] font-bold" aria-describedby="rm-delta" style={{ color: TOKENS.valueBlue }}>
              High-risk {fmtPct01(highRiskShare)}
            </output>
            <ValueDelta delta={deltaPP} invert ariaId="rm-delta" unit="pp" explain="Lower is better" />
          </div>
        </div>

        <div className="h-16 w-full min-w-0 xl:flex-1">
          <StackedArea100
            rows={trend}
            keys={["clean", "suspicious", "toxic"]}
            colors={RISK_COLORS}
            aria="Risk mix share trend"
            className="h-16 w-full"
            tooltipVisible={tooltipVisible}
          />
        </div>
      </div>

      <LegendRow
        items={[
          { swatch: RISK_COLORS.clean, label: "Clean", value: fmtInt(snapshot.clean) },
          { swatch: RISK_COLORS.suspicious, label: "Suspicious", value: fmtInt(snapshot.suspicious) },
          { swatch: RISK_COLORS.toxic, label: "Toxic", value: fmtInt(snapshot.toxic) },
        ]}
      />
    </CardShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Section wrapper                                                            */
/* -------------------------------------------------------------------------- */

export function ExternalLinksSummary(props?: Partial<ExternalLinksSummaryProps>|any) {
  const data = { ...props } as ExternalLinksSummaryProps;
  const rootRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(true);
  const [suspendTT, setSuspendTT] = useState(false);

  useEffect(() => {
    if (!rootRef.current) return;
    const target = rootRef.current;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { threshold: 0 }
    );
    io.observe(target);
    return () => {
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | number | null = null;
    const kick = () => {
      setSuspendTT(true);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setSuspendTT(false), 180);
    };
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("wheel", kick, { passive: true });
    window.addEventListener("touchmove", kick, { passive: true });
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("wheel", kick);
      window.removeEventListener("touchmove", kick);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const tooltipVisible = inView && !suspendTT;

  return (
    <section
      ref={rootRef}
      className="w-full"
      aria-label="External Links Summary"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      <div className="rounded-md p-4 bg-white" style={{ border: `1px solid ${TOKENS.border}` }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2">
            <BrandIcon className="h-5 w-5" />
            <h2 className="text-[20px] font-semibold" style={{ color: TOKENS.text }}>
              External Links Summary
            </h2>
            <button
              className="p-1 rounded hover:bg-gray-100"
              title="Each card shows a current breakdown (donut) and the trend of that breakdown."
              aria-label="About this section"
            >
              <InfoIcon size={16} />
            </button>
          </div>

          {/* Export button (section header) */}
          <button
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 bg-[color:var(--wr-value-blue,#0077FF)] text-white hover:opacity-90"
            aria-label="Export External Links Summary"
          >
            <Download size={16} />
            <span className="text-sm">Export</span>
          </button>
        </div>

        {/* KPI grid */}
        <div className="mt-4 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <LinkTypesCard
            total={props?.total}
            snapshot={data.linkTypesSnapshot}
            trend={data.linkTypesTrend}
            onClick={() => props?.onOpenDrawer?.("link_types")}
            tooltipVisible={tooltipVisible}
          />
<AnchorMixCard
  snapshot={data.anchorSnapshot}
  trend={data.anchorTrend}
  anchorKeys={data.anchorKeys}
  onClick={() => props?.onOpenDrawer?.("anchor_mix")}
  tooltipVisible={tooltipVisible}
/>

          <StatusCodesCard
            snapshot={data.statusSnapshot}
            trend={data.statusTrend}
            onClick={() => props?.onOpenDrawer?.("status_codes")}
            tooltipVisible={tooltipVisible}
          />
          <RiskMixCard
            snapshot={data.riskSnapshot}
            trend={data.riskTrend}
            onClick={() => props?.onOpenDrawer?.("risk_mix")}
            tooltipVisible={tooltipVisible}
          />
        </div>
      </div>
    </section>
  );
}

export default ExternalLinksSummary;
