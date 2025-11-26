"use client";

/* =============================================================================
   Keywords — KPI Summary (Stacked Donuts + Trends) + Movement (Gainers & Losers)
   -----------------------------------------------------------------------------
   • Inter / Inter Fallback fonts; no emoji
   • Branded #008CCD icons for section & card titles
   • KPI cards follow ONE pattern (reference design):
       - Stacked DONUT snapshot (breakdown)
       - Stacked TREND (Area/Bars) using the SAME breakdown
       - Smart popover (portaled). For donuts, the hovered slice row is highlighted.
   • Global toggle: All Keywords / Tracked Keywords → applies to ALL KPI cards.
     - Show the "All Keywords" card when scope=All
     - Show the "Tracked Keywords" card when scope=Tracked
     - All other KPI cards are shown for BOTH scopes
   • Keep time chips (7d/30d/90d) in both sections
   • Export buttons in both headers
   • Pointer cursor on interactive controls
   • Movement — Gainers & Losers: keep existing chart design (only header/export added)
   • Tailwind + Recharts; ready to drop in
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
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Sector,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts";
import { createPortal } from "react-dom";
import {
  Info,
  Download,
  BarChart3,
  Search,
  Eye,
  Award,
  ListOrdered,
  ListChecks,
  GitCompare,
  TrendingUp,
  Activity,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * TOKENS
 * ---------------------------------------------------------------------------*/
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  panel: "#FFFFFF",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

/* -----------------------------------------------------------------------------
 * UTILS / FORMATTERS
 * ---------------------------------------------------------------------------*/
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const toDateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
type SP = { t: string; v: number };
type Row = { t: string } & Record<string, any>;

function to100(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
}
function last<T>(arr: T[], fb: T): T {
  return arr.length ? arr[arr.length - 1] : fb;
}
function pctDelta(curr: number, prev: number) {
  if (!isFinite(prev) || prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

/* -----------------------------------------------------------------------------
 * PORTALED SMART POPOVERS
 * ---------------------------------------------------------------------------*/
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
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none" }}>
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{ backgroundColor: "#fff", border: `1px solid ${TK.border}`, color: TK.text, width }}
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
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>
      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TK.muted }}>
            Total
          </span>
          <span className="font-semibold">{intFmt.format(Math.round(total))}</span>
        </div>
      )}
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
  payload,
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
  const hoveredName = payload?.[0]?.name as string | undefined;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  const total = parts.reduce((s, p) => s + (p.value || 0), 0) || 1;

  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const activeRow = p.name === hoveredName;
          const share = (Number(p.value || 0) / total) * 100;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between gap-6 rounded px-1 py-0.5",
                activeRow && "bg-[rgba(0,0,0,0.04)]"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={cn(activeRow && "font-semibold")} style={{ color: TK.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={cn("font-semibold", activeRow && "text-[#0077FF]")}>
                {fmt(Number(p.value))}{" "}
                <span className="text-[11px]" style={{ color: TK.muted }}>
                  {share.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* -----------------------------------------------------------------------------
 * SHARED CHIPS & INFO
 * ---------------------------------------------------------------------------*/
function Segmented({
  value,
  items,
  onChange,
  aria,
}: {
  value: string;
  items: { label: string; value: string }[];
  onChange: (v: string) => void;
  aria?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={aria || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: "pointer" }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "h-8 rounded-full px-3 text-sm transition",
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

function InfoHover({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="rounded p-1 hover:bg-gray-50"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Info"
        title="Info"
        style={{ cursor: "pointer" }}
      >
        <Info size={14} color={TK.gray} />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-6 z-50 w-[260px] rounded border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TK.border, color: TK.text }}
          role="tooltip"
        >
          {text}
        </div>
      ) : null}
    </span>
  );
}

function DeltaBadge({
  deltaPct,
  invert = false,
  unit = "%",
}: {
  deltaPct: number;
  invert?: boolean;
  unit?: "%" | "pp";
}) {
  const good = invert ? deltaPct < 0 : deltaPct > 0;
  const color = Math.abs(deltaPct) < 0.0001 ? TK.muted : good ? TK.success : TK.danger;
  const text =
    Math.abs(deltaPct) < 0.0001 ? "—" : unit === "pp" ? `${Math.abs(deltaPct).toFixed(1)} pp` : `${Math.abs(deltaPct).toFixed(1)}%`;
  return (
    <span className="text-xs" style={{ color }}>
      {text}
    </span>
  );
}

/* -----------------------------------------------------------------------------
 * STACKED DONUT + TREND
 * ---------------------------------------------------------------------------*/
function StackedDonut({
  parts,
  size = 92,
  nameMap,
  valueFmt,
  center,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  nameMap?: Record<string, string>;
  valueFmt?: (n: number) => string;
  center?: { label?: string; value: number; fmt?: (n: number) => string };
}) {
  const data = parts.filter((p) => (p.value ?? 0) > 0).map((p) => ({ ...p, v: p.value }));
  const [active, setActive] = React.useState<number | undefined>(undefined);
  const ref = React.useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size, overflow: "visible" }}>
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
              <g
                style={{
                  transform: `translate(${cx}px,${cy}px) scale(1.06) translate(${-cx}px,${-cy}px)`,
                  transition: "transform 160ms ease",
                  filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))",
                }}
              >
                <Sector
                  cx={cx}
                  cy={cy}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius + 4}
                  startAngle={startAngle}
                  endAngle={endAngle}
                  fill={fill}
                  stroke="none"
                  strokeWidth={0}
                />
              </g>
            )}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="none" strokeWidth={0} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-tight">
          {center.label ? (
            <div className="text-[11px]" style={{ color: TK.muted }}>
              {center.label}
            </div>
          ) : null}
          <div className="text-[13px] font-semibold" style={{ color: TK.text }}>
            {center.fmt ? center.fmt(center.value) : intFmt.format(Math.round(center.value))}
          </div>
        </div>
      ) : null}
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
    <div ref={ref} className="h-16 min-w-[160px]" role="img" aria-label="KPI trend">
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

/* -----------------------------------------------------------------------------
 * KPI CARD SHELL
 * ---------------------------------------------------------------------------*/
function KpiCard({
  title,
  glyph,
  info,
  donut,
  value,
  valueFmt,
  deltaPct,
  deltaInvert,
  deltaUnit = "%",
  trend,
}: {
  title: string;
  glyph: React.ReactNode;
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  deltaPct: number;
  deltaInvert?: boolean;
  deltaUnit?: "%" | "pp";
  trend: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="group relative w-full text-left cursor-pointer"
      aria-label={`${title} card`}
      style={{ cursor: "pointer" }}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
        style={{ borderColor: TK.border }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {glyph}
            <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
              {title}
            </div>
            {info ? <InfoHover text={info} /> : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[auto] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge deltaPct={deltaPct} invert={!!deltaInvert} unit={deltaUnit} />
            </div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* -----------------------------------------------------------------------------
 * BREAKDOWN KEYS/COLORS/NAMES
 * ---------------------------------------------------------------------------*/
const POS5 = ["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"] as const;
const POS5_COL: Record<string, string> = {
  p1_3: TK.success,
  p4_10: "#60A5FA",
  p11_20: "#7E72FF",
  p21_50: TK.warn,
  p51_100: TK.danger,
};
const POS5_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50", p51_100: "Pos 51–100" };

const VIS_KEYS = ["p1_3", "p4_10", "p11p"] as const;
const VIS_COL: Record<string, string> = { p1_3: TK.success, p4_10: "#60A5FA", p11p: TK.gray };
const VIS_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11p: "Pos 11+" };

const POS4_KEYS = ["p1_3", "p4_10", "p11_20", "p21p"] as const;
const POS4_COL: Record<string, string> = { p1_3: TK.success, p4_10: "#60A5FA", p11_20: "#7E72FF", p21p: TK.gray };
const POS4_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21p: "Pos 21+" };

const T3_KEYS = ["pos1", "pos2", "pos3"] as const;
const T3_COL: Record<string, string> = { pos1: TK.success, pos2: "#60A5FA", pos3: "#7E72FF" };
const T3_NAME = { pos1: "#1", pos2: "#2", pos3: "#3" };

const T10_KEYS = ["p1_3", "p4_6", "p7_10"] as const;
const T10_COL: Record<string, string> = { p1_3: TK.success, p4_6: "#60A5FA", p7_10: "#7E72FF" };
const T10_NAME = { p1_3: "Pos 1–3", p4_6: "Pos 4–6", p7_10: "Pos 7–10" };

const T50_KEYS = ["p1_3", "p4_10", "p11_20", "p21_50"] as const;
const T50_COL: Record<string, string> = {
  p1_3: TK.success,
  p4_10: "#60A5FA",
  p11_20: "#7E72FF",
  p21_50: TK.warn,
};
const T50_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50" };

const NL_KEYS = ["newK", "lostK"] as const;
const NL_COL: Record<string, string> = { newK: TK.success, lostK: TK.danger };
const NL_NAME = { newK: "New", lostK: "Lost" };

/* -----------------------------------------------------------------------------
 * DATA (demo generators; replace with real wiring)
 * ---------------------------------------------------------------------------*/
type KPIWindow = "7d" | "30d" | "90d";
type Scope = "all" | "tracked";

function lastNDates(n: number) {
  const a: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    a.push(toISO(d));
  }
  return a;
}

/** Build a daily panel of keyword counts by rank buckets (and exact 1/2/3) */
function makeKeywordPanel(days = 60, baseScale = 1000, seed = 0) {
  const dates = lastNDates(days);
  const rows = dates.map((t, i) => {
    // Base trend signal
    const base =
      baseScale +
      Math.round(6 * i + Math.sin((i + seed) / 3) * baseScale * 0.02 + (Math.random() - 0.5) * baseScale * 0.01);

    // Shares drift
    const s1 = 0.12 + 0.02 * Math.sin((i + seed) / 12);
    const s2 = 0.26 + 0.02 * Math.cos((i + seed) / 9);
    const s3 = 0.22 + 0.015 * Math.sin((i + seed) / 7);
    const s4 = 0.24 + 0.012 * Math.cos((i + seed) / 11);
    let s5 = 1 - (s1 + s2 + s3 + s4);
    if (s5 < 0.05) s5 = 0.05;

    const p1_3 = Math.round(base * s1);
    const p4_10 = Math.round(base * s2);
    const p11_20 = Math.round(base * s3);
    const p21_50 = Math.round(base * s4);
    const p51_100 = Math.max(0, base - p1_3 - p4_10 - p11_20 - p21_50);

    // Inside Top‑3 split to #1/#2/#3
    const pos1 = Math.round(p1_3 * (0.46 + 0.06 * Math.sin((i + seed) / 5)));
    const pos2 = Math.round(p1_3 * (0.33 + 0.05 * Math.cos((i + seed) / 6)));
    const pos3 = Math.max(0, p1_3 - pos1 - pos2);

    // Top‑10 split to 4‑6 vs 7‑10
    const p4_6 = Math.round(p4_10 * (0.45 + 0.05 * Math.sin((i + seed) / 8)));
    const p7_10 = Math.max(0, p4_10 - p4_6);

    // New/Lost daily
    const newK = Math.max(1, Math.round(8 + Math.sin((i + seed) / 1.1) * 2 + (Math.random() - 0.5) * 2));
    const lostK = Math.max(0, Math.round(5 + Math.cos((i + seed) / 1.3) * 2 + (Math.random() - 0.5) * 2));

    return { t, p1_3, p4_10, p11_20, p21_50, p51_100, pos1, pos2, pos3, p4_6, p7_10, newK, lostK };
  });
  return { dates, rows };
}

/* Transform rows for each KPI breakdown */
function rowsAllKeywords(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  return rows.map((r) => ({ t: r.t, p1_3: r.p1_3, p4_10: r.p4_10, p11_20: r.p11_20, p21_50: r.p21_50, p51_100: r.p51_100 }));
}
function rowsVisibility(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  return rows.map((r) => ({ t: r.t, p1_3: r.p1_3, p4_10: r.p4_10, p11p: r.p11_20 + r.p21_50 + r.p51_100 }));
}
function rowsAvgPos(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  return rows.map((r) => ({ t: r.t, p1_3: r.p1_3, p4_10: r.p4_10, p11_20: r.p11_20, p21p: r.p21_50 + r.p51_100 }));
}
function rowsTop3(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  return rows.map((r) => ({ t: r.t, pos1: r.pos1, pos2: r.pos2, pos3: r.pos3 }));
}
function rowsTop10(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  return rows.map((r) => ({ t: r.t, p1_3: r.p1_3, p4_6: r.p4_6, p7_10: r.p7_10 }));
}
function rowsTop50(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  return rows.map((r) => ({ t: r.t, p1_3: r.p1_3, p4_10: r.p4_10, p11_20: r.p11_20, p21_50: r.p21_50 }));
}
function rowsNewLost(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  return rows.map((r) => ({ t: r.t, newK: r.newK, lostK: r.lostK }));
}

function sumRowKeys(r: Row, keys: string[]) {
  return keys.reduce((s, k) => s + (Number(r[k]) || 0), 0);
}
function weightedAvgPosition(r: ReturnType<typeof makeKeywordPanel>["rows"][number]) {
  const w =
    r.pos1 * 1 +
    r.pos2 * 2 +
    r.pos3 * 3 +
    r.p4_6 * 5 +
    r.p7_10 * 8.5 +
    r.p11_20 * 15 +
    r.p21_50 * 35 +
    r.p51_100 * 75;
  const n = r.pos1 + r.pos2 + r.pos3 + r.p4_6 + r.p7_10 + r.p11_20 + r.p21_50 + r.p51_100;
  return n ? w / n : 0;
}

/* -----------------------------------------------------------------------------
 * MOVEMENT (Gainers vs Losers) — KEEP DESIGN (only header/export added)
 * ---------------------------------------------------------------------------*/
type TW = "7d" | "30d" | "90d";
type Gran = "daily" | "weekly";
type MRow = { date: string; gained: number; lost: number; net: number };

const fmtShort = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "2-digit" });

function makeMovementDemo(): MRow[] {
  const dates = lastNDates(90);
  return dates.map((date, i) => {
    const gained = Math.round(10 + 30 * Math.abs(Math.sin(i / 6)) + (Math.random() - 0.5) * 6);
    const lostAbs = Math.round(8 + 24 * Math.abs(Math.cos(i / 7)) + (Math.random() - 0.5) * 6);
    return { date, gained, lost: -lostAbs, net: gained - lostAbs };
  });
}
function aggregateWeekly(rows: MRow[]): MRow[] {
  const out: MRow[] = [];
  for (let i = 0; i < rows.length; i += 7) {
    const seg = rows.slice(i, i + 7);
    if (!seg.length) continue;
    const gained = seg.reduce((a, b) => a + b.gained, 0);
    const lost = seg.reduce((a, b) => a + b.lost, 0);
    out.push({ date: seg[seg.length - 1].date, gained, lost, net: gained + lost });
  }
  return out;
}
function NearCursorTooltipGL({ active, payload, label, coordinate }: any) {
  if (!active || !payload || !payload.length || !coordinate) return null;
  const x = coordinate.x + 12;
  const y = coordinate.y - 12;
  const gained = payload.find((p: any) => p.dataKey === "gained")?.value ?? 0;
  const lost = Math.abs(payload.find((p: any) => p.dataKey === "lost")?.value ?? 0);
  const net = payload.find((p: any) => p.dataKey === "net")?.value ?? gained - lost;
  return (
    <div
      className="pointer-events-none absolute z-50 rounded border bg-white px-2 py-1 text-xs shadow"
      style={{ left: x, top: y, borderColor: TK.border, color: TK.text }}
    >
      <div className="font-medium">{fmtShort(label)}</div>
      <div className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: TK.success }} />
        Gained: <b>{intFmt.format(Math.max(0, gained))}</b>
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: TK.danger }} />
        Lost: <b>{intFmt.format(Math.max(0, lost))}</b>
      </div>
      <div className="mt-0.5 border-t pt-0.5" style={{ borderColor: TK.border }}>
        Net:{" "}
        <b style={{ color: net >= 0 ? TK.success : TK.danger }}>
          {net >= 0 ? "+" : ""}
          {intFmt.format(net)}
        </b>
      </div>
    </div>
  );
}

/* =============================================================================
 * MAIN — Combined Section
 * ==========================================================================*/
export default function KeywordsKpiAndMovement() {
  /* ---------- Global fonts ---------- */
  const fontStack =
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

  /* ---------- KPI Summary state ---------- */
  const [kpiRange, setKpiRange] = React.useState<KPIWindow>("30d");
  const [scope, setScope] = React.useState<Scope>("all"); // Global toggle: All / Tracked
  const shareMode = false; // keep raw counts in trends by default (can be wired to a chip if needed)
  const kDays = kpiRange === "7d" ? 7 : kpiRange === "30d" ? 30 : 90;

  // Build panel with 2*window for deltas vs previous window — distinct for All vs Tracked
  const panelAll = React.useMemo(() => makeKeywordPanel(kDays * 2, 1100, 0), [kDays]);
  const panelTracked = React.useMemo(() => makeKeywordPanel(kDays * 2, 750, 7), [kDays]);

  const selectedPanel = scope === "all" ? panelAll : panelTracked;

  const currRows = React.useMemo(() => selectedPanel.rows.slice(kDays), [selectedPanel, kDays]);
  const prevRows = React.useMemo(() => selectedPanel.rows.slice(0, kDays), [selectedPanel, kDays]);

  // KPI stacked rows (same breakdown for donut & trend)
  const ALL_ROWS = React.useMemo(() => rowsAllKeywords(currRows), [currRows]);
  const VIS_ROWS = React.useMemo(() => rowsVisibility(currRows), [currRows]);
  const POS_ROWS = React.useMemo(() => rowsAvgPos(currRows), [currRows]);
  const T3_ROWS = React.useMemo(() => rowsTop3(currRows), [currRows]);
  const T10_ROWS = React.useMemo(() => rowsTop10(currRows), [currRows]);
  const T50_ROWS = React.useMemo(() => rowsTop50(currRows), [currRows]);
  const NL_ROWS = React.useMemo(() => rowsNewLost(currRows), [currRows]);

  // Current values (selected scope)
  const currAll = React.useMemo(() => {
    const r = last(ALL_ROWS, { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 });
    return sumRowKeys(r, [...POS5]);
  }, [ALL_ROWS]);
  const prevAll = React.useMemo(() => {
    const rows = rowsAllKeywords(prevRows);
    const r = last(rows, { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 });
    return sumRowKeys(r, [...POS5]);
  }, [prevRows]);

  const currVisTop10 = React.useMemo(() => {
    const r = last(VIS_ROWS, { t: "", p1_3: 0, p4_10: 0, p11p: 0 });
    const top10 = r.p1_3 + r.p4_10;
    const all = top10 + r.p11p;
    return all ? (top10 / all) * 100 : 0;
  }, [VIS_ROWS]);
  const prevVisTop10 = React.useMemo(() => {
    const rows = rowsVisibility(prevRows);
    const r = last(rows, { t: "", p1_3: 0, p4_10: 0, p11p: 0 });
    const top10 = r.p1_3 + r.p4_10;
    const all = top10 + r.p11p;
    return all ? (top10 / all) * 100 : 0;
  }, [prevRows]);

  const currAvgPos = React.useMemo(() => weightedAvgPosition(last(selectedPanel.rows, selectedPanel.rows[0])), [selectedPanel.rows]);
  const prevAvgPos = React.useMemo(() => weightedAvgPosition(last(prevRows, prevRows[0] ?? selectedPanel.rows[0])), [prevRows, selectedPanel.rows]);

  const currTop3 = React.useMemo(() => {
    const r = last(T3_ROWS, { t: "", pos1: 0, pos2: 0, pos3: 0 });
    return r.pos1 + r.pos2 + r.pos3;
  }, [T3_ROWS]);
  const prevTop3 = React.useMemo(() => {
    const rows = rowsTop3(prevRows);
    const r = last(rows, { t: "", pos1: 0, pos2: 0, pos3: 0 });
    return r.pos1 + r.pos2 + r.pos3;
  }, [prevRows]);

  const currTop10 = React.useMemo(() => {
    const r = last(T10_ROWS, { t: "", p1_3: 0, p4_6: 0, p7_10: 0 });
    return r.p1_3 + r.p4_6 + r.p7_10;
  }, [T10_ROWS]);
  const prevTop10 = React.useMemo(() => {
    const rows = rowsTop10(prevRows);
    const r = last(rows, { t: "", p1_3: 0, p4_6: 0, p7_10: 0 });
    return r.p1_3 + r.p4_6 + r.p7_10;
  }, [prevRows]);

  const currTop50 = React.useMemo(() => {
    const r = last(T50_ROWS, { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0 });
    return r.p1_3 + r.p4_10 + r.p11_20 + r.p21_50;
  }, [T50_ROWS]);
  const prevTop50 = React.useMemo(() => {
    const rows = rowsTop50(prevRows);
    const r = last(rows, { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0 });
    return r.p1_3 + r.p4_10 + r.p11_20 + r.p21_50;
  }, [prevRows]);

  const currNew = NL_ROWS.reduce((s, r) => s + (r.newK || 0), 0);
  const currLost = NL_ROWS.reduce((s, r) => s + (r.lostK || 0), 0);
  const prevNL = rowsNewLost(prevRows);
  const prevNew = prevNL.reduce((s, r) => s + (r.newK || 0), 0);
  const prevLost = prevNL.reduce((s, r) => s + (r.lostK || 0), 0);

  // Deltas
  const dAll = pctDelta(currAll, prevAll);
  const dVis = currVisTop10 - prevVisTop10; // percentage points
  const dAvgPosPct = pctDelta(currAvgPos, prevAvgPos); // invert "good"
  const dT3 = pctDelta(currTop3, prevTop3);
  const dT10 = pctDelta(currTop10, prevTop10);
  const dT50 = pctDelta(currTop50, prevTop50);
  const dNL = pctDelta(currNew - currLost, prevNew - prevLost);

  // KPI Export CSV (snapshot)
  const exportKpiCSV = () => {
    const rows = [
      ["scope", scope],
      ["range", kpiRange],
      [],
      ["metric", "value", "delta"],
      [scope === "all" ? "All Keywords" : "Tracked Keywords", currAll, `${dAll.toFixed(1)}%`],
      ["Visibility % (Top‑10)", `${currVisTop10.toFixed(1)}%`, `${dVis.toFixed(1)} pp`],
      ["Avg. Position", `#${currAvgPos.toFixed(1)}`, `${dAvgPosPct.toFixed(1)}%`],
      ["Top 3", currTop3, `${dT3.toFixed(1)}%`],
      ["Top 10", currTop10, `${dT10.toFixed(1)}%`],
      ["Top 50", currTop50, `${dT50.toFixed(1)}%`],
      ["New vs Lost (net)", currNew - currLost, `${dNL.toFixed(1)}%`],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kpis_${scope}_${kpiRange}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ---------- Movement state ---------- */
  const [tw, setTw] = React.useState<TW>("30d");
  const [gran, setGran] = React.useState<Gran>("daily");
  const [showNet, setShowNet] = React.useState(true);
  const [showGained, setShowGained] = React.useState(true);
  const [showLost, setShowLost] = React.useState(true);

  const ALL = React.useMemo(() => makeMovementDemo(), []);
  const rangeDays = tw === "7d" ? 7 : tw === "30d" ? 30 : 90;
  const sliced = ALL.slice(-rangeDays);
  const series = React.useMemo(() => (gran === "daily" ? sliced : aggregateWeekly(sliced)), [sliced, gran]);

  const maxMag = React.useMemo(() => {
    const m1 = Math.max(...series.map((d) => Math.abs(d.gained) || 0), 1);
    const m2 = Math.max(...series.map((d) => Math.abs(d.lost) || 0), 1);
    const m3 = Math.max(...series.map((d) => Math.abs(d.net) || 0), 1);
    return Math.max(m1, m2, m3);
  }, [series]);

  const totalGained = series.reduce((a, b) => a + Math.max(0, b.gained), 0);
  const totalLostAbs = series.reduce((a, b) => a + Math.abs(b.lost), 0);
  const net = totalGained - totalLostAbs;

  const exportMovementCSV = () => {
    const header = ["date", "gained", "lost", "net"].join(",");
    const lines = series.map((r) => [r.date, r.gained, r.lost, r.net].join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gainers_losers_${tw}_${gran}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="space-y-3 mt-4">
      {/* ================= KPI SUMMARY ================= */}
      <section
        className="rounded-[10px] border bg-white p-4"
        style={{ borderColor: TK.border, fontFamily: fontStack }}
        aria-label="KPI Summary"
      >
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={20} color={TK.brand} />
            <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
              KPI Summary
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Global scope toggle (applies to all KPI cards) */}
            <Segmented
              value={scope}
              onChange={(v) => setScope(v as Scope)}
              aria="Scope"
              items={[
                { label: "All Keywords", value: "all" },
                { label: "Tracked Keywords", value: "tracked" },
              ]}
            />
            {/* Time window */}
            <Segmented
              value={kpiRange}
              onChange={(v) => setKpiRange(v as KPIWindow)}
              aria="KPI Date Range"
              items={[
                { label: "7d", value: "7d" },
                { label: "30d", value: "30d" },
                { label: "90d", value: "90d" },
              ]}
            />
            <button
              onClick={exportKpiCSV}
              className="inline-flex h-8 items-center gap-2 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50"
              style={{ borderColor: TK.border, cursor: "pointer", color: TK.valueBlue }}
              aria-label="Export KPI Summary"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </header>

        {/* KPI GRID (7 visible at a time; first card depends on global scope) */}
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {/* 1) All/Tracked Keywords (conditional title) */}
          <KpiCard
            title={scope === "all" ? "All Keywords" : "Tracked Keywords"}
            glyph={<Search size={16} color={TK.brand} />}
            info="Total ranking keywords in the selected scope. Snapshot & trend show distribution by rank buckets."
            donut={
              <StackedDonut
                parts={[
                  { key: "p1_3", name: "p1_3", value: last(ALL_ROWS, ALL_ROWS[0])?.p1_3 || 0, color: POS5_COL.p1_3 },
                  { key: "p4_10", name: "p4_10", value: last(ALL_ROWS, ALL_ROWS[0])?.p4_10 || 0, color: POS5_COL.p4_10 },
                  { key: "p11_20", name: "p11_20", value: last(ALL_ROWS, ALL_ROWS[0])?.p11_20 || 0, color: POS5_COL.p11_20 },
                  { key: "p21_50", name: "p21_50", value: last(ALL_ROWS, ALL_ROWS[0])?.p21_50 || 0, color: POS5_COL.p21_50 },
                  { key: "p51_100", name: "p51_100", value: last(ALL_ROWS, ALL_ROWS[0])?.p51_100 || 0, color: POS5_COL.p51_100 },
                ]}
                nameMap={POS5_NAME}
                center={{ label: "Total", value: currAll }}
              />
            }
            value={currAll}
            valueFmt={(v) => intFmt.format(v)}
            deltaPct={dAll}
            trend={<TrendStack rows={ALL_ROWS} keys={[...POS5]} colors={POS5_COL} names={POS5_NAME} mode="bars" share={shareMode} />}
          />

          {/* 2) Visibility (Top‑10%) */}
          <KpiCard
            title="Visibility (Top‑10%)"
            glyph={<Eye size={16} color={TK.brand} />}
            info="Share of keywords in positions 1–10. Snapshot shows 1–3, 4–10, and 11+."
            donut={
              <StackedDonut
                parts={[
                  { key: "p1_3", name: "p1_3", value: last(VIS_ROWS, VIS_ROWS[0])?.p1_3 || 0, color: VIS_COL.p1_3 },
                  { key: "p4_10", name: "p4_10", value: last(VIS_ROWS, VIS_ROWS[0])?.p4_10 || 0, color: VIS_COL.p4_10 },
                  { key: "p11p", name: "p11p", value: last(VIS_ROWS, VIS_ROWS[0])?.p11p || 0, color: VIS_COL.p11p },
                ]}
                nameMap={VIS_NAME}
                center={{ label: "Top‑10", value: currVisTop10, fmt: (n) => pctFmt(n, 1) }}
              />
            }
            value={currVisTop10}
            valueFmt={(v) => pctFmt(v, 1)}
            deltaPct={dVis}
            deltaUnit="pp"
            trend={<TrendStack rows={VIS_ROWS} keys={[...VIS_KEYS]} colors={VIS_COL} names={VIS_NAME} mode="area" share={shareMode} />}
          />

          {/* 3) Avg. Position */}
          <KpiCard
            title="Avg. Position"
            glyph={<TrendingUp size={16} color={TK.brand} />}
            info="Average rank across keywords in scope (lower is better). Snapshot/trend show mix by rank bucket."
            donut={
              <StackedDonut
                parts={[
                  { key: "p1_3", name: "p1_3", value: last(POS_ROWS, POS_ROWS[0])?.p1_3 || 0, color: POS4_COL.p1_3 },
                  { key: "p4_10", name: "p4_10", value: last(POS_ROWS, POS_ROWS[0])?.p4_10 || 0, color: POS4_COL.p4_10 },
                  { key: "p11_20", name: "p11_20", value: last(POS_ROWS, POS_ROWS[0])?.p11_20 || 0, color: POS4_COL.p11_20 },
                  { key: "p21p", name: "p21p", value: last(POS_ROWS, POS_ROWS[0])?.p21p || 0, color: POS4_COL.p21p },
                ]}
                nameMap={POS4_NAME}
                center={{ label: "Avg", value: currAvgPos, fmt: (n) => `#${n.toFixed(1)}` }}
              />
            }
            value={currAvgPos}
            valueFmt={(v) => `#${v.toFixed(1)}`}
            deltaPct={dAvgPosPct}
            deltaInvert
            trend={<TrendStack rows={POS_ROWS} keys={[...POS4_KEYS]} colors={POS4_COL} names={POS4_NAME} mode="bars" share={shareMode} />}
          />

          {/* 4) Top 3 */}
          <KpiCard
            title="Top 3"
            glyph={<Award size={16} color={TK.brand} />}
            info="Keywords in positions #1, #2, and #3."
            donut={
              <StackedDonut
                parts={[
                  { key: "pos1", name: "pos1", value: last(T3_ROWS, T3_ROWS[0])?.pos1 || 0, color: T3_COL.pos1 },
                  { key: "pos2", name: "pos2", value: last(T3_ROWS, T3_ROWS[0])?.pos2 || 0, color: T3_COL.pos2 },
                  { key: "pos3", name: "pos3", value: last(T3_ROWS, T3_ROWS[0])?.pos3 || 0, color: T3_COL.pos3 },
                ]}
                nameMap={T3_NAME}
                center={{ label: "Total", value: currTop3 }}
              />
            }
            value={currTop3}
            valueFmt={(v) => intFmt.format(v)}
            deltaPct={dT3}
            trend={<TrendStack rows={T3_ROWS} keys={[...T3_KEYS]} colors={T3_COL} names={T3_NAME} mode="area" share={shareMode} />}
          />

          {/* 5) Top 10 */}
          <KpiCard
            title="Top 10"
            glyph={<ListOrdered size={16} color={TK.brand} />}
            info="Keywords in positions 1–10, grouped 1–3, 4–6, 7–10."
            donut={
              <StackedDonut
                parts={[
                  { key: "p1_3", name: "p1_3", value: last(T10_ROWS, T10_ROWS[0])?.p1_3 || 0, color: T10_COL.p1_3 },
                  { key: "p4_6", name: "p4_6", value: last(T10_ROWS, T10_ROWS[0])?.p4_6 || 0, color: T10_COL.p4_6 },
                  { key: "p7_10", name: "p7_10", value: last(T10_ROWS, T10_ROWS[0])?.p7_10 || 0, color: T10_COL.p7_10 },
                ]}
                nameMap={T10_NAME}
                center={{ label: "Total", value: currTop10 }}
              />
            }
            value={currTop10}
            valueFmt={(v) => intFmt.format(v)}
            deltaPct={dT10}
            trend={<TrendStack rows={T10_ROWS} keys={[...T10_KEYS]} colors={T10_COL} names={T10_NAME} mode="bars" share={shareMode} />}
          />

          {/* 6) Top 50 */}
          <KpiCard
            title="Top 50"
            glyph={<ListChecks size={16} color={TK.brand} />}
            info="Keywords in positions 1–50, grouped 1–3, 4–10, 11–20, 21–50."
            donut={
              <StackedDonut
                parts={[
                  { key: "p1_3", name: "p1_3", value: last(T50_ROWS, T50_ROWS[0])?.p1_3 || 0, color: T50_COL.p1_3 },
                  { key: "p4_10", name: "p4_10", value: last(T50_ROWS, T50_ROWS[0])?.p4_10 || 0, color: T50_COL.p4_10 },
                  { key: "p11_20", name: "p11_20", value: last(T50_ROWS, T50_ROWS[0])?.p11_20 || 0, color: T50_COL.p11_20 },
                  { key: "p21_50", name: "p21_50", value: last(T50_ROWS, T50_ROWS[0])?.p21_50 || 0, color: T50_COL.p21_50 },
                ]}
                nameMap={T50_NAME}
                center={{ label: "Total", value: currTop50 }}
              />
            }
            value={currTop50}
            valueFmt={(v) => intFmt.format(v)}
            deltaPct={dT50}
            trend={<TrendStack rows={T50_ROWS} keys={[...T50_KEYS]} colors={T50_COL} names={T50_NAME} mode="area" share={shareMode} />}
          />

          {/* 7) New vs Lost */}
          <KpiCard
            title="New vs Lost"
            glyph={<GitCompare size={16} color={TK.brand} />}
            info="Keywords entering vs leaving during the period."
            donut={
              <StackedDonut
                parts={[
                  { key: "newK", name: "newK", value: currNew, color: NL_COL.newK },
                  { key: "lostK", name: "lostK", value: currLost, color: NL_COL.lostK },
                ]}
                nameMap={NL_NAME}
                center={{ label: "Net", value: currNew - currLost }}
              />
            }
            value={currNew - currLost}
            valueFmt={(v) => (v >= 0 ? `+${intFmt.format(v)}` : intFmt.format(v))}
            deltaPct={dNL}
            trend={<TrendStack rows={NL_ROWS} keys={[...NL_KEYS]} colors={NL_COL} names={NL_NAME} mode="bars" share={shareMode} />}
          />
        </div>
      </section>

      {/* ================= MOVEMENT — Gainers & Losers (chart unchanged) ================= */}
      <section
        className="rounded-[10px] border bg-white p-4"
        style={{ borderColor: TK.border, fontFamily: fontStack }}
        aria-label="Movement — Gainers & Losers"
      >
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <Activity size={18} color={TK.brand} />
            <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
              Movement — Gainers & Losers
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={tw}
              onChange={(v) => setTw(v as TW)}
              aria="Time Window"
              items={[
                { label: "7d", value: "7d" },
                { label: "30d", value: "30d" },
                { label: "90d", value: "90d" },
              ]}
            />
            <Segmented
              value={gran}
              onChange={(v) => setGran(v as Gran)}
              aria="Granularity"
              items={[
                { label: "Daily", value: "daily" },
                { label: "Weekly", value: "weekly" },
              ]}
            />
            <button
              onClick={() => setShowNet((s) => !s)}
              className="h-8 rounded-full border px-3 text-sm hover:bg-gray-50"
              style={{ borderColor: TK.border, cursor: "pointer" }}
              aria-pressed={showNet}
              aria-label="Toggle Net line"
            >
              Net line {showNet ? "On" : "Off"}
            </button>
            <button
              onClick={exportMovementCSV}
              className="inline-flex h-8 items-center gap-2 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50"
              style={{ borderColor: TK.border, cursor: "pointer", color: TK.valueBlue }}
              aria-label="Export Movement"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </header>

        <div
          className="rounded-[10px] border p-3"
          style={{ borderColor: TK.border }}
          aria-label="Gainers vs Losers chart"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[14px] font-medium" style={{ color: TK.text }}>
              Gainers vs Losers (last {tw})
            </div>
            <div className="text-xs text-gray-600">
              <span className="mr-3">
                <b className="text-[13px]" style={{ color: TK.success }}>
                  +{intFmt.format(totalGained)}
                </b>{" "}
                gained
              </span>
              <span className="mr-3">
                <b className="text-[13px]" style={{ color: TK.danger }}>
                  -{intFmt.format(totalLostAbs)}
                </b>{" "}
                lost
              </span>
              <span>
                Net:{" "}
                <b style={{ color: net >= 0 ? TK.success : TK.danger }}>
                  {net >= 0 ? "+" : ""}
                  {intFmt.format(net)}
                </b>
              </span>
            </div>
          </div>

          <div className="relative h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={series} barCategoryGap={8}>
                <CartesianGrid stroke={TK.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: TK.muted, fontSize: 12 }} tickFormatter={fmtShort} interval="preserveStartEnd" />
                <YAxis tick={{ fill: TK.muted, fontSize: 12 }} domain={[-Math.ceil(maxMag * 1.3), Math.ceil(maxMag * 1.3)]} />
                <ReferenceLine y={0} stroke={TK.border} />
                <Bar dataKey="gained" name="Gained" fill={TK.success} radius={[3, 3, 0, 0]} hide={!showGained} />
                <Bar dataKey="lost" name="Lost" fill={TK.danger} radius={[0, 0, 3, 3]} hide={!showLost} />
                {showNet && <Line type="monotone" dataKey="net" name="Net" stroke={TK.text} dot={false} strokeWidth={1.75} />}
                <RTooltip content={<NearCursorTooltipGL />} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend toggles */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              onClick={() => setShowGained((s) => !s)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                showGained ? "bg-white" : "bg-[#F9FAFB] opacity-70"
              }`}
              style={{ borderColor: TK.border, cursor: "pointer" }}
              aria-pressed={showGained}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TK.success }} />
              Gained
            </button>
            <button
              onClick={() => setShowLost((s) => !s)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                showLost ? "bg-white" : "bg-[#F9FAFB] opacity-70"
              }`}
              style={{ borderColor: TK.border, cursor: "pointer" }}
              aria-pressed={showLost}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TK.danger }} />
              Lost
            </button>
          </div>

          <div className="mt-1 text-center text-xs text-gray-500">Click legend to toggle series • Hover bars for values</div>
        </div>
      </section>
    </section>
  );
}
