"use client";

/* =============================================================================
   Wranker — Page Insights · Page Analyzer Drawer
   Tab 1 · Overview — Section 5: Internal Link Overview (Redesigned)
   -----------------------------------------------------------------------------
   - Inter / Inter Fallback fonts; no emoji
   - Branded #008CCD icons for section & card titles
   - Pointer cursor on interactive elements; modern chips & buttons
   - KPI Cards: each card uses the SAME pattern:
       • Snapshot: stacked donut (meaningful breakdown per KPI)
       • Trend: stacked bars/area with the SAME breakdown as the donut
       • Smart popovers (PORTALED) for donut + trend; donut popover
         highlights the hovered item with colored dot annotations
   - Section header has Export button
   - "Top Linking Pages": table with horizontal lines (header & rows)
   - Drop‑in TSX; Recharts only; demo data included
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
} from "recharts";
import { createPortal } from "react-dom";
import {
  Info,
  Download,
  BarChart3,
  GitMerge,
  GitPullRequest,
  Quote,
  Route,
  AlertTriangle,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {useState} from "react";
import KeywordDrawer from "../keyword-drawer/Keyword";
/* =============================================================================
 * TOKENS / HELPERS
 * ========================================================================== */
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  panel: "#FFFFFF",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const toDateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const downloadText = (name: string, text: string, type = "text/csv;charset=utf-8") => {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* =============================================================================
 * UI PRIMITIVES — Tip, Segmented, DeltaBadge
 * ========================================================================== */
function Tip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <span className="relative inline-flex items-center">
      <span
        role="button"
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-1 rounded hover:bg-gray-50 focus:outline-none"
        aria-label="Info"
        style={{ cursor: "pointer" }}
      >
        <Info size={16} color={TK.muted} />
      </span>

      {open && (
        <div
          className="absolute z-10 top-6 left-0 max-w-xs rounded border bg-white p-2 text-xs shadow"
          style={{ borderColor: TK.border, color: TK.text }}
          role="tooltip"
        >
          {text}
        </div>
      )}
    </span>
  );
}


function Segmented({
  value,
  items,
  onChange,
}: {
  value: string;
  items: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: "pointer" }}
      role="tablist"
      aria-label="Date range"
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "h-8 px-3 text-sm rounded-full transition",
            value === it.value ? "bg-[#D9EEF8] font-medium" : "hover:bg-gray-100"
          )}
          style={{ cursor: "pointer" }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function DeltaBadge({
  delta,
  unit = "",
  invert = false,
}: {
  delta?: number;
  unit?: "" | "%" | "pp";
  invert?: boolean;
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TK.muted }}>
        <Minus size={14} /> —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TK.muted : good ? TK.success : TK.danger;
  const label = unit === "pp" ? `${Math.abs(delta).toFixed(1)} pp` : unit === "%" ? `${Math.abs(delta).toFixed(1)}%` : intFmt.format(Math.round(Math.abs(delta)));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <Icon size={14} />
      {label}
    </span>
  );
}

/* =============================================================================
 * PORTALED SMART POPOVERS (shared by donut + trend)
 * ========================================================================== */
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
        style={{ background: "#fff", border: `1px solid ${TK.border}`, color: TK.text, borderRadius: 6 }}
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
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const fmt = valueFmt ?? ((v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v))));
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>
      {!asShare ? (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TK.muted }}>Total</span>
          <span className="font-semibold">{intFmt.format(Math.round(total))}</span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TK.muted }}>{nameMap?.[p.name] ?? p.name}</span>
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
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  const highlightName = (parts.length && parts[0].name) || undefined;
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>Breakdown</div>
      <div className="flex flex-col gap-1">
        {parts.map((p:any, i:any) => {
          const isActive = p.name === highlightName;
          return (
            <div key={i} className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={cn(isActive ? "font-semibold" : "")} style={{ color: TK.muted }}>
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

/* =============================================================================
 * SNAPSHOT DONUT + TREND (shared)
 * ========================================================================== */
type Row = { t: string } & Record<string, any>;
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
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (share ? pctFmt(v, 1) : intFmt.format(Math.round(v)));

  return (
    <div ref={ref} className="h-16 min-w-[auto]" role="img" aria-label="KPI trend">
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={share}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[k]} fill={colors[k]} fillOpacity={0.25} strokeWidth={2} dot={false} />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={share}
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

/* =============================================================================
 * CARD SHELL (title + info near title; donut | value+delta | trend)
 * ========================================================================== */
function KpiCard({
  title,
  glyph,
  info,
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
  glyph: React.ReactNode;
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp";
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
      style={{ cursor: "pointer" }}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TK.border }}
      >
        <div className="mb-2 flex items-center gap-2 min-w-0">
          {glyph}
          <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
            {title}
          </div>
          {info ? <Tip text={info} /> : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
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
 * DEMO DATA (Internal Links)
 * ========================================================================== */
type ILRow = {
  date: string;
  inlinks: number;
  inlinksFollow: number;
  outlinks: number;
  outlinksFollow: number;
  brokenOutlinks: number;
  anchorsTop: number;
  anchorsTotal: number;
  linkDepth: number; // average
};

function lastNDates(n: number) {
  const a: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    a.push(d.toISOString().slice(0, 10));
  }
  return a;
}

function makeMockIL(days = 90): ILRow[] {
  const dates = lastNDates(days);
  return dates.map((d, i) => {
    const season = 1 + 0.06 * Math.sin(i / 5) + 0.04 * Math.cos(i / 7);
    const inlinks = Math.max(12, Math.round(45 * season + Math.random() * 20));
    const outlinks = Math.max(9, Math.round(36 * season + Math.random() * 18));
    const inlinksFollow = Math.round(inlinks * (0.84 + (Math.random() - 0.5) * 0.08));
    const outlinksFollow = Math.round(outlinks * (0.86 + (Math.random() - 0.5) * 0.06));
    const anchorsTotal = Math.round(inlinks * (0.65 + Math.random() * 0.6));
    const anchorsTop = Math.max(1, Math.round(anchorsTotal * (0.28 + (Math.random() - 0.5) * 0.12)));
    const brokenOutlinks = Math.max(0, Math.round(Math.random() * 3 - 1 + (i % 13 === 0 ? 2 : 0)));
    const linkDepth = 2 + ((i % 9) === 0 ? 2 : (Math.random() < 0.7 ? 1 : 0)); // ~2–4
    return {
      date: d,
      inlinks,
      inlinksFollow,
      outlinks,
      outlinksFollow,
      brokenOutlinks,
      anchorsTop,
      anchorsTotal,
      linkDepth,
    };
  });
}

function aggRange(rows: ILRow[], days: number) {
  const slice = rows.slice(-days);
  const sum = (fn: (r: ILRow) => number) => slice.reduce((a, r) => a + fn(r), 0);
  const inlinks = sum((r) => r.inlinks);
  const inlinksFollow = sum((r) => r.inlinksFollow);
  const outlinks = sum((r) => r.outlinks);
  const outlinksFollow = sum((r) => r.outlinksFollow);
  const anchorsTotal = sum((r) => r.anchorsTotal);
  const anchorsTop = sum((r) => r.anchorsTop);
  const brokenOutlinks = sum((r) => r.brokenOutlinks);
  const avgDepth = slice.length ? slice.reduce((a, r) => a + r.linkDepth, 0) / slice.length : 0;
  return { slice, inlinks, inlinksFollow, outlinks, outlinksFollow, anchorsTotal, anchorsTop, brokenOutlinks, avgDepth };
}
function deltaPct(curr: number, prev: number) {
  const diff = curr - prev;
  return prev > 0 ? (diff / prev) * 100 : 0;
}

/* =============================================================================
 * SPLIT BUILDERS (rows for donuts + trends)
 * ========================================================================== */
type SP = { t: string; v: number };
type SplitSpec = { key: string; label: string; baseShare: number };

function toSP(values: Array<{ date: string; v: number }> | SP[]) {
  return (values as any[]).map((p: any) => ({ t: p.date ?? p.t, v: p.v }));
}
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
    const out: any = { t: p.t };
    parts.forEach((sp) => (out[sp.key] = Math.max(0, Math.round(p.v * (shares[sp.key] / sum)))));
    return out as Row;
  });
}

/* Meaningful breakdowns for this section */
const SECTIONS: SplitSpec[] = [
  { key: "root", label: "Root", baseShare: 0.22 },
  { key: "blog", label: "/blog", baseShare: 0.38 },
  { key: "docs", label: "/docs", baseShare: 0.22 },
  { key: "other", label: "Other", baseShare: 0.18 },
];
const SECTION_COLORS: Record<string, string> = { root: TK.valueBlue, blog: "#5CA8FF", docs: "#7E72FF", other: TK.gray };
const SECTION_NAMES = { root: "Root", blog: "/blog", docs: "/docs", other: "Other" };

const ANCH: SplitSpec[] = [
  { key: "exact", label: "Exact‑match", baseShare: 0.26 },
  { key: "partial", label: "Partial‑match", baseShare: 0.34 },
  { key: "branded", label: "Branded", baseShare: 0.24 },
  { key: "generic", label: "Generic", baseShare: 0.16 },
];
const ANCH_COLORS: Record<string, string> = { exact: TK.valueBlue, partial: "#5CA8FF", branded: TK.success, generic: TK.gray };
const ANCH_NAMES = { exact: "Exact‑match", partial: "Partial‑match", branded: "Branded", generic: "Generic" };

const DEPTH_COLORS: Record<string, string> = { d_1_2: TK.success, d_3: "#60A5FA", d_4p: TK.warn };
const DEPTH_NAMES = { d_1_2: "Depth 1–2", d_3: "Depth 3", d_4p: "Depth 4+" };

const NF_COLORS: Record<string, string> = { follow: TK.success, nofollow: TK.warn };
const NF_NAMES = { follow: "Follow", nofollow: "Nofollow" };

const ERR_COLORS: Record<string, string> = { err_4xx: TK.warn, err_5xx: TK.danger, err_other: TK.gray };
const ERR_NAMES = { err_4xx: "4xx", err_5xx: "5xx", err_other: "Timeout/Other" };

function depthShares(depth: number) {
  // Heuristic: shallower depths → more in 1–2; deeper → more in 4+
  const d12 = clamp01(1.4 - depth * 0.5); // 2→0.4, 3→-0.1→0
  const d3 = clamp01(1 - Math.abs(depth - 3) * 0.85); // peak at depth=3
  let d4p = 1 - d12 - d3;
  if (d4p < 0) d4p = 0;
  const sum = d12 + d3 + d4p || 1;
  return { d_1_2: d12 / sum, d_3: d3 / sum, d_4p: d4p / sum };
}
function depthBucketRows(avgDepthSP: SP[], baselineSP: SP[]): Row[] {
  const n = Math.min(avgDepthSP.length, baselineSP.length);
  const out: Row[] = [];
  for (let i = 0; i < n; i++) {
    const avg = avgDepthSP[i].v || 0;
    const base = Math.max(1, baselineSP[i].v || 100);
    const w = depthShares(avg);
    const a = Math.round(base * w.d_1_2);
    const b = Math.round(base * w.d_3);
    const c = Math.max(0, base - a - b);
    out.push({ t: baselineSP[i].t, d_1_2: a, d_3: b, d_4p: c });
  }
  return out;
}
function nofollowRows(inSP: SP[], inFollowSP: SP[]): Row[] {
  const n = Math.min(inSP.length, inFollowSP.length);
  const out: Row[] = [];
  for (let i = 0; i < n; i++) {
    const total = Math.max(0, inSP[i].v || 0);
    const follow = Math.min(total, Math.max(0, inFollowSP[i].v || 0));
    out.push({ t: inSP[i].t, follow, nofollow: Math.max(0, total - follow) });
  }
  return out;
}
function errorRows(brokenSP: SP[]): Row[] {
  return brokenSP.map((p, i) => {
    const base = Math.max(0, p.v || 0);
    const s4 = Math.max(0, Math.round(base * (0.62 + Math.sin(i * 0.21) * 0.06)));
    const s5 = Math.max(0, Math.round(base * (0.22 + Math.cos(i * 0.17) * 0.04)));
    let other = base - s4 - s5;
    if (other < 0) other = 0;
    return { t: p.t, err_4xx: s4, err_5xx: s5, err_other: other };
  });
}

/* =============================================================================
 * TOP LINKING PAGES (table)
 * ========================================================================== */
type LinkRow = { page: string; anchor: string; depth: number; type: "Follow" | "Nofollow" };
function makeTopLinkers(): LinkRow[] {
  return [
    { page: "/blog/seo-guide", anchor: "seo guide", depth: 2, type: "Follow" },
    { page: "/learn/technical-seo", anchor: "internal links", depth: 3, type: "Follow" },
    { page: "/category/seo", anchor: "learn more", depth: 2, type: "Nofollow" },
    { page: "/blog/canonical-tags", anchor: "canonical", depth: 4, type: "Follow" },
    { page: "/docs/faq", anchor: "faq", depth: 3, type: "Follow" },
  ];
}

/* =============================================================================
 * MAIN — Internal Link Overview Section
 * ========================================================================== */
type RangeKey = "7d" | "30d" | "90d";

export default function InternalLinkOverviewSection({
  onOpenAnalyzer,
}: {
  onOpenAnalyzer?: () => void;
}) {
  const [range, setRange] = React.useState<RangeKey>("30d");
  const [shareMode, setShareMode] = React.useState(false);

  // Demo series
  const SERIES = React.useMemo(() => makeMockIL(90), []);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  const cur = React.useMemo(() => aggRange(SERIES, days), [SERIES, days]);
  const prev = React.useMemo(() => aggRange(SERIES.slice(0, SERIES.length - days), days), [SERIES, days]);

  // Build SP time series
  const inSP: SP[] = SERIES.map((r) => ({ t: r.date, v: r.inlinks }));
  const inFollowSP: SP[] = SERIES.map((r) => ({ t: r.date, v: r.inlinksFollow }));
  const outSP: SP[] = SERIES.map((r) => ({ t: r.date, v: r.outlinks }));
  const outFollowSP: SP[] = SERIES.map((r) => ({ t: r.date, v: r.outlinksFollow }));
  const anchorsSP: SP[] = SERIES.map((r) => ({ t: r.date, v: r.anchorsTotal }));
  const brokenSP: SP[] = SERIES.map((r) => ({ t: r.date, v: r.brokenOutlinks }));
  const depthAvgSP: SP[] = SERIES.map((r) => ({ t: r.date, v: r.linkDepth }));
  const depthBaselineSP: SP[] = SERIES.map((r) => ({ t: r.date, v: r.inlinks + r.outlinks }));

  // Rows per KPI (meaningful breakdowns)
  const inSectionRows = React.useMemo(() => splitSeries(inSP, SECTIONS, 0.06), [SERIES]);
  const outSectionRows = React.useMemo(() => splitSeries(outSP, SECTIONS, 0.06), [SERIES]);
  const anchorTypeRows = React.useMemo(() => splitSeries(anchorsSP, ANCH, 0.06), [SERIES]);
  const depthRows = React.useMemo(() => depthBucketRows(depthAvgSP, depthBaselineSP), [SERIES]);
  const nfRows = React.useMemo(() => nofollowRows(inSP, inFollowSP), [SERIES]);
  const errRows = React.useMemo(() => errorRows(brokenSP), [SERIES]);

  // Donut snapshots
  const inParts = lastParts(inSectionRows, ["root", "blog", "docs", "other"], SECTION_COLORS);
  const outParts = lastParts(outSectionRows, ["root", "blog", "docs", "other"], SECTION_COLORS);
  const anchorParts = lastParts(anchorTypeRows, ["exact", "partial", "branded", "generic"], ANCH_COLORS);
  const depthParts = lastParts(depthRows, ["d_1_2", "d_3", "d_4p"], DEPTH_COLORS);
  const nfParts = lastParts(nfRows, ["follow", "nofollow"], NF_COLORS);
  const errParts = lastParts(errRows, ["err_4xx", "err_5xx", "err_other"], ERR_COLORS);

  // Deltas
  const dIn = deltaPct(cur.inlinks, prev.inlinks);
  const dOut = deltaPct(cur.outlinks, prev.outlinks);
  const dAnch = deltaPct(cur.anchorsTotal, prev.anchorsTotal);
  const dBroken = deltaPct(cur.brokenOutlinks, prev.brokenOutlinks);
  const currNfPct = cur.inlinks > 0 ? (cur.inlinks - cur.inlinksFollow) / cur.inlinks * 100 : 0;
  const prevNfPct = prev.inlinks > 0 ? (prev.inlinks - prev.inlinksFollow) / prev.inlinks * 100 : 0;
  const dNfPP = currNfPct - prevNfPct;
  const currDepth = cur.avgDepth;
  const prevDepth = prev.avgDepth || 0;
  const dDepth = currDepth - prevDepth;

  // Export
  const onExport = () => {
    const header = [
      "date",
      "inlinks",
      "inlinks_follow",
      "inlinks_nofollow",
      "outlinks",
      "outlinks_follow",
      "outlinks_nofollow",
      "anchors_total",
      "anchor_exact",
      "anchor_partial",
      "anchor_branded",
      "anchor_generic",
      "avg_depth",
      "broken_4xx",
      "broken_5xx",
      "broken_other",
    ];
    const byT: Record<string, any> = {};
    SERIES.forEach((r, i) => {
      const t = r.date;
      const aRow = anchorTypeRows[i] ?? { exact: 0, partial: 0, branded: 0, generic: 0 };
      const eRow = errRows[i] ?? { err_4xx: 0, err_5xx: 0, err_other: 0 };
      byT[t] = [
        t,
        r.inlinks,
        r.inlinksFollow,
        Math.max(0, r.inlinks - r.inlinksFollow),
        r.outlinks,
        r.outlinksFollow,
        Math.max(0, r.outlinks - r.outlinksFollow),
        r.anchorsTotal,
        aRow.exact ?? 0,
        aRow.partial ?? 0,
        aRow.branded ?? 0,
        aRow.generic ?? 0,
        r.linkDepth.toFixed(2),
        eRow.err_4xx ?? 0,
        eRow.err_5xx ?? 0,
        eRow.err_other ?? 0,
      ].join(",");
    });
    const body = Object.keys(byT)
      .slice(SERIES.length - days)
      .map((k) => byT[k])
      .join("\n");
    downloadText(`internal_link_overview_${range}.csv`, [header.join(","), body].join("\n"));
  };

  const topLinking = React.useMemo(() => makeTopLinkers(), []);

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-[76vw] overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">{title}</div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }


  return (
    <section
      className="rounded-md border bg-white p-4 mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
                              {drawerRow && (
                    <Drawer title="Page Keywords Analysis" onClose={closeDrawer}>
                      <KeywordDrawer   />
                    </Drawer>
                  )}
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            Internal Link Overview
          </h2>
          <Tip text="Each KPI shows a stacked donut snapshot and a stacked trend with the SAME breakdown for meaningful comparisons." />
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={range}
            onChange={(v) => (setRange(v as RangeKey))}
            items={[
              { label: "7d", value: "7d" },
              { label: "30d", value: "30d" },
              { label: "90d", value: "90d" },
            ]}
          />
          <label className="inline-flex items-center gap-2 text-xs ml-1" style={{ color: TK.muted, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ accentColor: TK.valueBlue, borderColor: TK.border, cursor: "pointer" }}
            />
            Show % share
          </label>
          <button
            onClick={onExport}
            className="ml-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 border hover:bg-gray-50"
            aria-label="Export Internal Link Overview"
            style={{ borderColor: TK.border, background: TK.panel, color: TK.valueBlue, cursor: "pointer" }}
          >
            <Download size={16} />
            <span className="text-sm">Export</span>
          </button>
        </div>
      </header>

      {/* KPI GRID — 6 cards */}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {/* 1) Internal Inlinks — by section */}
        <KpiCard
          title="Internal Inlinks"
          glyph={<GitMerge size={16} color={TK.brand} />}
          info="Where inlinks come from (site sections). Snapshot & trend use the same section breakdown."
          donut={<StackedDonut parts={inParts.map((p) => ({ ...p, name: p.key }))} nameMap={SECTION_NAMES} />}
          value={cur.inlinks}
          valueFmt={(v) => intFmt.format(v)}
          delta={dIn}
          deltaUnit="%"
          trend={<TrendStack rows={inSectionRows.slice(-days)} keys={["root", "blog", "docs", "other"]} colors={SECTION_COLORS} names={SECTION_NAMES} mode="bars" share={shareMode} />}
          onClick={onOpenAnalyzer}
        />

        {/* 2) Internal Outlinks — by section */}
        <KpiCard
          title="Internal Outlinks"
          glyph={<GitPullRequest size={16} color={TK.brand} />}
          info="Where this page links to (site sections)."
          donut={<StackedDonut parts={outParts.map((p) => ({ ...p, name: p.key }))} nameMap={SECTION_NAMES} />}
          value={cur.outlinks}
          valueFmt={(v) => intFmt.format(v)}
          delta={dOut}
          deltaUnit="%"
          trend={<TrendStack rows={outSectionRows.slice(-days)} keys={["root", "blog", "docs", "other"]} colors={SECTION_COLORS} names={SECTION_NAMES} mode="area" share={shareMode} />}
          onClick={onOpenAnalyzer}
        />

        {/* 3) Anchors to this Page — by anchor type */}
        <KpiCard
          title="Total Anchors (to page)"
          glyph={<Quote size={16} color={TK.brand} />}
          info="Anchor text types used to link to this page."
          donut={<StackedDonut parts={anchorParts.map((p) => ({ ...p, name: p.key }))} nameMap={ANCH_NAMES} />}
          value={cur.anchorsTotal}
          valueFmt={(v) => intFmt.format(v)}
          delta={dAnch}
          deltaUnit="%"
          trend={<TrendStack rows={anchorTypeRows.slice(-days)} keys={["exact", "partial", "branded", "generic"]} colors={ANCH_COLORS} names={ANCH_NAMES} mode="bars" share={shareMode} />}
          onClick={onOpenAnalyzer}
        />

        {/* 4) Link Depth — distribution buckets */}
        <KpiCard
          title="Link Depth"
          glyph={<Route size={16} color={TK.brand} />}
          info="Average crawl depth. Snapshot/trend show depth distribution across buckets."
          donut={<StackedDonut parts={depthParts.map((p) => ({ ...p, name: p.key }))} nameMap={DEPTH_NAMES} />}
          value={currDepth}
          valueFmt={(v) => `#${v.toFixed(1)} avg`}
          delta={dDepth}
        //   deltaUnit="pt"
          invert
          trend={<TrendStack rows={depthRows.slice(-days)} keys={["d_1_2", "d_3", "d_4p"]} colors={DEPTH_COLORS} names={DEPTH_NAMES} mode="area" share={shareMode} />}
          onClick={onOpenAnalyzer}
        />

        {/* 5) Nofollow (Inlinks) — follow vs nofollow */}
        <KpiCard
          title="Nofollow (Inlinks)"
          glyph={<GitMerge size={16} color={TK.brand} />}
          info="Share of inbound internal links marked nofollow."
          donut={<StackedDonut parts={nfParts.map((p) => ({ ...p, name: p.key }))} nameMap={NF_NAMES} />}
          value={currNfPct}
          valueFmt={(v) => pctFmt(v, 1)}
          delta={dNfPP}
          deltaUnit="pp"
          invert
          trend={<TrendStack rows={nfRows.slice(-days)} keys={["follow", "nofollow"]} colors={NF_COLORS} names={NF_NAMES} mode="bars" share={shareMode} />}
          onClick={onOpenAnalyzer}
        />

        {/* 6) Broken Outlinks — by error class */}
        <KpiCard
          title="Broken Outlinks"
          glyph={<AlertTriangle size={16} color={TK.brand} />}
          info="Outlinks from this page that are broken (4xx/5xx/timeout)."
          donut={<StackedDonut parts={errParts.map((p) => ({ ...p, name: p.key }))} nameMap={ERR_NAMES} />}
          value={cur.brokenOutlinks}
          valueFmt={(v) => intFmt.format(v)}
          delta={dBroken}
          deltaUnit="%"
          invert
          trend={<TrendStack rows={errRows.slice(-days)} keys={["err_4xx", "err_5xx", "err_other"]} colors={ERR_COLORS} names={ERR_NAMES} mode="bars" share={shareMode} />}
          onClick={onOpenAnalyzer}
        />
      </div>

      {/* Top Linking Pages — TABLE with horizontal lines */}
      <div className="rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} color={TK.brand} />
            <div className="text-[14px] font-medium" style={{ color: TK.text }}>
              Top Linking Pages
            </div>
            <Tip text="Preview of top internal pages linking here. Depth & type are from the latest crawl." />
          </div>
        </div>

        <div className="max-h-[280px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b" style={{ borderColor: TK.border }}>
              <tr className="text-left text-xs text-gray-500">
                <th className="px-2 py-2 font-medium">Page</th>
                <th className="px-2 py-2 font-medium">Anchor</th>
                <th className="px-2 py-2 font-medium">Depth</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {topLinking.map((r, i) => (
                <tr key={i} className="border-b hover:bg-[#F8FAFC]" style={{ borderColor: TK.border }}>
                  <td className="px-2 py-2">
                    <a className="text-[#0077FF] underline" style={{ cursor: "pointer" }} onClick={openDrawer}>
                      {r.page}
                    </a>
                  </td>
                  <td className="px-2 py-2">{r.anchor}</td>
                  <td className="px-2 py-2">{r.depth}</td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
                        r.type === "Follow" ? "text-emerald-600" : "text-amber-600"
                      )}
                      style={{ borderColor: TK.border }}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <a
                      onClick={openDrawer}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-gray-50"
                      style={{ borderColor: TK.border, cursor: "pointer" }}
                    >
                      Open <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
