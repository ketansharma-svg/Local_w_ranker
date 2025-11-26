"use client";

/* =============================================================================
   Page Insights · Page Analyzer Drawer
   Section 5: Keywords Overview — Sub‑Section 1: KPI GRID (6) & Big Charts (2)
   -----------------------------------------------------------------------------
   - KPI Cards (All Keywords, Visibility %, Avg Position, Top 3, Top 10, New vs Lost)
     • Snapshot: STACKED DONUT (meaningful breakdown per KPI)
     • Trend: STACKED BARS / AREA (same breakdown as snapshot)
     • Smart popovers (PORTALED) with colored dot annotations
   - Rank Distribution: keep layout, add animated hover + smart popover
   - Rank Coverage Trend: keep layout, upgrade smart popover (dot annotations)
   - Inter / Inter Fallback fonts; no emoji
   - Branded #008CCD icons for section & card titles
   - Pointer cursor for interactive chips/controls
   - Export button in section header (CSV)
   - Tailwind + Recharts; ready-to-drop-in TSX
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
} from "recharts";
import { createPortal } from "react-dom";
import {
  Info,
  Download,
  BarChart3,
  Search,
  Eye,
  Award,
  GitCompare,
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
type SplitSpec = { key: string; label: string; baseShare: number };

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
 * PORTALED SMART POPOVERS (shared)
 * ---------------------------------------------------------------------------*/
function PortalTooltipShell({ x, y, width = 260, children }: { x: number; y: number; width?: number; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none" }}>
      <div className="rounded-md p-2 text-xs shadow ring-1 ring-black/10" style={{ backgroundColor: "#fff", border: `1px solid ${TK.border}`, color: TK.text }}>
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
}: any & { coordinate?: { x: number; y: number }; containerRect?: DOMRect | null; nameMap?: Record<string, string>; valueFmt?: (v: number) => string; asShare?: boolean }) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const fmt = valueFmt ?? ((v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v))));
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>{typeof label === "string" ? toDateLabel(label) : String(label)}</div>
      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TK.muted }}>Total</span>
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
  coordinate,
  containerRect,
  parts,
  nameMap,
  valueFmt,
}: any & { coordinate?: { x: number; y: number }; containerRect?: DOMRect | null; parts: { key: string; name: string; value: number; color: string }[]; nameMap?: Record<string, string>; valueFmt?: (v: number) => string }) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  return (
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>Breakdown</div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => (
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

/* -----------------------------------------------------------------------------
 * SEGMENTED & TIPS
 * ---------------------------------------------------------------------------*/
function Segmented({ value, items, onChange, aria }: { value: string; items: { label: string; value: string }[]; onChange: (v: string) => void; aria?: string }) {
  return (
    <div role="tablist" aria-label={aria || "segmented"} className="inline-flex rounded-full border p-0.5" style={{ borderColor: TK.border, cursor: "pointer" }}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn("h-8 rounded-full px-3 text-sm transition", value === it.value ? "bg-[#D9EEF8] font-medium" : "hover:bg-gray-100")}
          style={{ cursor: "pointer" }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
function Tip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button type="button" className="rounded p-1 hover:bg-gray-50" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} aria-label="Info" style={{ cursor: "pointer" }}>
        <Info size={16} color={TK.muted} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-10 max-w-[240px] rounded border bg-white p-2 text-xs shadow" style={{ borderColor: TK.border, color: TK.text }}>
          {text}
        </div>
      )}
    </span>
  );
}

/* -----------------------------------------------------------------------------
 * DELTA BADGE
 * ---------------------------------------------------------------------------*/
function DeltaBadge({ deltaPct, invert = false, unit = "%" }: { deltaPct: number; invert?: boolean; unit?: "%" | "pp" }) {
  const good = invert ? deltaPct < 0 : deltaPct > 0;
  const color = Math.abs(deltaPct) < 0.0001 ? TK.muted : good ? TK.success : TK.danger;
  return <span className="text-xs" style={{ color }}>{deltaPct === 0 ? "—" : (unit === "pp" ? `${Math.abs(deltaPct).toFixed(1)} pp` : `${Math.abs(deltaPct).toFixed(1)}%`)}</span>;
}

/* -----------------------------------------------------------------------------
 * STACKED DONUT (with active slice lift + portaled popover)
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
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={(tp: any) => <DonutPortalContent {...tp} containerRect={ref.current?.getBoundingClientRect() ?? null} parts={data} nameMap={nameMap} valueFmt={valueFmt} />}
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
              <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))" }} />
            )}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
            isAnimationActive
          >
            {data.map((d, i) => <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={1} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-tight">
          {center.label ? <div className="text-[11px]" style={{ color: TK.muted }}>{center.label}</div> : null}
          <div className="text-[13px] font-semibold" style={{ color: TK.text }}>
            {center.fmt ? center.fmt(center.value) : intFmt.format(Math.round(center.value))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * TREND STACK (bars / area) with portaled popover
 * ---------------------------------------------------------------------------*/
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
              content={(tp: any) => <TrendPortalContent {...tp} containerRect={ref.current?.getBoundingClientRect() ?? null} nameMap={names} valueFmt={valueFmt} asShare={share} />}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[k]} fill={colors[k]} fillOpacity={0.25} strokeWidth={2} dot={false} />)}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => <TrendPortalContent {...tp} containerRect={ref.current?.getBoundingClientRect() ?? null} nameMap={names} valueFmt={valueFmt} asShare={share} />}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            {keys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={colors[k]} radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * KPI CARD SHELL (donut | value+delta | trend)
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
    <button type="button" className="group relative w-full text-left cursor-pointer" aria-label={`${title} card`} style={{ cursor: "pointer" }}>
      <div className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40" style={{ borderColor: TK.border }}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {glyph}
            <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>{title}</div>
            {info ? (
              <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info}>
                <Info size={14} />
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>{valueFmt(value)}</div>
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
 * BREAKDOWNS (colors / names)
 * ---------------------------------------------------------------------------*/
// Position buckets for “All Keywords”
const POS5 = [
  { key: "p1_3", label: "Pos 1–3", baseShare: 0.14 },
  { key: "p4_10", label: "Pos 4–10", baseShare: 0.28 },
  { key: "p11_20", label: "Pos 11–20", baseShare: 0.23 },
  { key: "p21_50", label: "Pos 21–50", baseShare: 0.22 },
  { key: "p51_100", label: "Pos 51–100", baseShare: 0.13 },
] as const;
const POS5_COL: Record<string, string> = {
  p1_3: TK.success,
  p4_10: "#60A5FA",
  p11_20: "#7E72FF",
  p21_50: TK.warn,
  p51_100: TK.danger,
};
const POS5_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21_50: "Pos 21–50", p51_100: "Pos 51–100" };

// Visibility% breakdown (Top‑10 vs outside, with 1–3 / 4–10 detail)
const VIS_KEYS = ["p1_3", "p4_10", "p11p"] as const;
const VIS_COL: Record<string, string> = { p1_3: TK.success, p4_10: "#60A5FA", p11p: TK.gray };
const VIS_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11p: "Pos 11+" };

// Avg Position breakdown (4 buckets)
const POS4_KEYS = ["p1_3", "p4_10", "p11_20", "p21p"] as const;
const POS4_COL: Record<string, string> = { p1_3: TK.success, p4_10: "#60A5FA", p11_20: "#7E72FF", p21p: TK.gray };
const POS4_NAME = { p1_3: "Pos 1–3", p4_10: "Pos 4–10", p11_20: "Pos 11–20", p21p: "Pos 21+" };

// Top 3 exact positions
const T3_KEYS = ["pos1", "pos2", "pos3"] as const;
const T3_COL: Record<string, string> = { pos1: TK.success, pos2: "#60A5FA", pos3: "#7E72FF" };
const T3_NAME = { pos1: "#1", pos2: "#2", pos3: "#3" };

// Top 10 grouped
const T10_KEYS = ["p1_3", "p4_6", "p7_10"] as const;
const T10_COL: Record<string, string> = { p1_3: TK.success, p4_6: "#60A5FA", p7_10: "#7E72FF" };
const T10_NAME = { p1_3: "Pos 1–3", p4_6: "Pos 4–6", p7_10: "Pos 7–10" };

// New vs Lost
const NL_KEYS = ["newK", "lostK"] as const;
const NL_COL: Record<string, string> = { newK: TK.success, lostK: TK.danger };
const NL_NAME = { newK: "New", lostK: "Lost" };

/* -----------------------------------------------------------------------------
 * DATA (demo generator; replace with real data wiring)
 * ---------------------------------------------------------------------------*/
type KPIWindow = "7d" | "30d" | "90d";

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
function makeKeywordPanel(days = 60) {
  const dates = lastNDates(days);
  const rows = dates.map((t, i) => {
    // Base trend signal
    const base = 950 + Math.round(6 * i + Math.sin(i / 3) * 18);
    // Shares drift
    const s1 = 0.12 + 0.02 * Math.sin(i / 12);
    const s2 = 0.26 + 0.02 * Math.cos(i / 9);
    const s3 = 0.22 + 0.015 * Math.sin(i / 7);
    const s4 = 0.24 + 0.012 * Math.cos(i / 11);
    let s5 = 1 - (s1 + s2 + s3 + s4);
    if (s5 < 0.05) s5 = 0.05;
    const p1_3 = Math.round(base * s1);
    const p4_10 = Math.round(base * s2);
    const p11_20 = Math.round(base * s3);
    const p21_50 = Math.round(base * s4);
    const p51_100 = Math.max(0, base - p1_3 - p4_10 - p11_20 - p21_50);

    // Inside Top‑3 split to #1/#2/#3
    const pos1 = Math.round(p1_3 * (0.46 + 0.06 * Math.sin(i / 5)));
    const pos2 = Math.round(p1_3 * (0.33 + 0.05 * Math.cos(i / 6)));
    const pos3 = Math.max(0, p1_3 - pos1 - pos2);

    // Top‑10 split to 4‑6 vs 7‑10
    const p4_6 = Math.round(p4_10 * (0.45 + 0.05 * Math.sin(i / 8)));
    const p7_10 = Math.max(0, p4_10 - p4_6);

    // New/Lost daily
    const newK = Math.max(1, Math.round(8 + Math.sin(i) * 2 + (Math.random() - 0.5) * 2));
    const lostK = Math.max(0, Math.round(5 + Math.cos(i / 1.3) * 2 + (Math.random() - 0.5) * 2));

    return { t, p1_3, p4_10, p11_20, p21_50, p51_100, pos1, pos2, pos3, p4_6, p7_10, newK, lostK };
  });
  return { dates, rows };
}

/* -----------------------------------------------------------------------------
 * BUILD STACKED ROWS FOR KPI CARDS
 * ---------------------------------------------------------------------------*/
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
function rowsNewLost(rows: ReturnType<typeof makeKeywordPanel>["rows"]): Row[] {
  return rows.map((r) => ({ t: r.t, newK: r.newK, lostK: r.lostK }));
}

/* -----------------------------------------------------------------------------
 * KPI VALUE COMPUTATION HELPERS
 * ---------------------------------------------------------------------------*/
function sumRowKeys(r: Row, keys: string[]) { return keys.reduce((s, k) => s + (Number(r[k]) || 0), 0); }
function currentVsPrevDelta(currSeries: number[], prevSeries: number[]) {
  const curr = last(currSeries, 0);
  const prev = last(prevSeries, 0);
  return { curr, prev, deltaPct: pctDelta(curr, prev) };
}
function weightedAvgPosition(r: ReturnType<typeof makeKeywordPanel>["rows"][number]) {
  // Approximate center of each bucket
  const w = r.pos1 * 1 + r.pos2 * 2 + r.pos3 * 3 + r.p4_6 * 5 + r.p7_10 * 8.5 + r.p11_20 * 15 + r.p21_50 * 35 + r.p51_100 * 75;
  const n = r.pos1 + r.pos2 + r.pos3 + r.p4_6 + r.p7_10 + r.p11_20 + r.p21_50 + r.p51_100;
  return n ? w / n : 0;
}

/* -----------------------------------------------------------------------------
 * RANK DISTRIBUTION (Big Card) — same layout, animated hover + smart popover
 * ---------------------------------------------------------------------------*/
type BucketKey = "1-3" | "4-10" | "11-20" | "21-50" | "51-100";
const bucketColor = (b: BucketKey) => ({ "1-3": TK.success, "4-10": "#60A5FA", "11-20": "#7E72FF", "21-50": TK.warn, "51-100": TK.danger }[b]);

function RankDistributionCard({ buckets, today, ago30 }: { buckets: BucketKey[]; today: number[]; ago30: number[] }) {
  const [mode, setMode] = React.useState<"count" | "percent">("count");
  const [compare, setCompare] = React.useState<"off" | "on">("off");
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  const dataCount = buckets.map((b, i) => ({ bucket: b, today: today[i] ?? 0, ago30: ago30[i] ?? 0 }));
  const sums = {
    t: dataCount.reduce((s, r) => s + r.today, 0) || 1,
    a: dataCount.reduce((s, r) => s + r.ago30, 0) || 1,
  };
  const dataPercent = dataCount.map((r) => ({ bucket: r.bucket, todayPct: (r.today / sums.t) * 100, ago30Pct: (r.ago30 / sums.a) * 100 }));

  return (
    <div className="rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-medium" style={{ color: TK.text }}>Rank Distribution</div>
          <Tip text="Distribution of keywords by best rank bucket (today). Hover bars for details." />
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={mode} onChange={(v) => setMode(v as any)} aria="mode" items={[{ label: "Count", value: "count" }, { label: "%", value: "percent" }]} />
          <Segmented value={compare} onChange={(v) => setCompare(v as any)} aria="compare" items={[{ label: "Compare Off", value: "off" }, { label: "30d ago", value: "on" }]} />
        </div>
      </div>

      <div className="h-[250px]" ref={ref}>
        <ResponsiveContainer>
          <BarChart
            data={mode === "count" ? dataCount : dataPercent}
            onMouseMove={(st: any) => {
              if (typeof st?.activeTooltipIndex === "number") setActiveIdx(st.activeTooltipIndex);
            }}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <CartesianGrid stroke={TK.border} vertical={false} />
            <XAxis dataKey="bucket" tick={{ fill: TK.muted }} />
            <YAxis tick={{ fill: TK.muted }} />
            <RTooltip
              content={(tp: any) => {
                if (!tp?.active || !ref.current) return null;
                const rect = ref.current.getBoundingClientRect();
                const x = rect.left + (tp?.coordinate?.x ?? 0) + 12;
                const y = rect.top + (tp?.coordinate?.y ?? 0) + 12;
                const p0 = tp?.payload?.[0]?.payload;
                if (!p0) return null;
                const color = bucketColor(p0.bucket);
                const val = mode === "count" ? p0.today : p0.todayPct;
                const comp = compare === "on" ? (mode === "count" ? p0.ago30 : p0.ago30Pct) : undefined;
                return (
                  <PortalTooltipShell x={x} y={y} width={240}>
                    <div className="mb-1 font-medium" style={{ color: TK.muted }}>{p0.bucket}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                        <span style={{ color: TK.muted }}>Today</span>
                      </div>
                      <div className="font-semibold">{mode === "count" ? intFmt.format(val) : pctFmt(val, 1)}</div>
                    </div>
                    {typeof comp === "number" && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: "rgba(0,0,0,0.25)" }} />
                          <span style={{ color: TK.muted }}>30d ago</span>
                        </div>
                        <div className="font-semibold">{mode === "count" ? intFmt.format(comp) : pctFmt(comp, 1)}</div>
                      </div>
                    )}
                  </PortalTooltipShell>
                );
              }}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={false}
            />
            <Bar dataKey={mode === "count" ? "today" : "todayPct"} radius={[4, 4, 0, 0]}>
              {(mode === "count" ? dataCount : dataPercent).map((r: any, i: number) => (
                <Cell
                  key={i}
                  fill={bucketColor(r.bucket)}
                  style={{
                    filter: activeIdx === i ? "drop-shadow(0 2px 4px rgba(0,0,0,0.18))" : "none",
                    transition: "filter .15s ease, transform .15s ease",
                    transform: activeIdx === i ? "translateY(-2px)" : "translateY(0)",
                  }}
                />
              ))}
            </Bar>
            {compare === "on" && (
              <Bar dataKey={mode === "count" ? "ago30" : "ago30Pct"} radius={[4, 4, 0, 0]} fill="rgba(0,0,0,0.08)" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 text-xs text-gray-500">Buckets reflect each keyword’s best rank today.</div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * COVERAGE TREND (Big Card) — same chart, upgraded popover
 * ---------------------------------------------------------------------------*/
function CoverageTrendCard({ dates, top3, top10, top50 }: { dates: string[]; top3: number[]; top10: number[]; top50: number[] }) {
  const [smooth, setSmooth] = React.useState(true);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const data = dates.map((d, i) => ({ d, top3: top3[i], top10: top10[i], top50: top50[i] }));
  const series = [
    { key: "top3", name: "Top 3", color: TK.success },
    { key: "top10", name: "Top 10", color: "#60A5FA" },
    { key: "top50", name: "Top 50", color: TK.valueBlue },
  ];

  return (
    <div className="rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[14px] font-medium" style={{ color: TK.text }}>Rank Coverage Trend</div>
        <button onClick={() => setSmooth((s) => !s)} className="h-8 rounded-full border px-3 text-sm hover:bg-gray-50" style={{ borderColor: TK.border, cursor: "pointer" }}>
          Smoothing {smooth ? "On" : "Off"}
        </button>
      </div>
      <div className="h-[250px]" ref={ref}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke={TK.border} vertical={false} />
            <XAxis dataKey="d" tick={{ fill: TK.muted }} />
            <YAxis tick={{ fill: TK.muted }} />
            <RTooltip
              content={(tp: any) => {
                if (!tp?.active || !ref.current) return null;
                const rect = ref.current.getBoundingClientRect();
                const x = rect.left + (tp?.coordinate?.x ?? 0) + 12;
                const y = rect.top + (tp?.coordinate?.y ?? 0) + 12;
                const rows = (tp.payload ?? []) as Array<{ name: string; value: number; color: string }>;
                return (
                  <PortalTooltipShell x={x} y={y} width={260}>
                    <div className="mb-1 font-medium" style={{ color: TK.muted }}>{toDateLabel(tp.label)}</div>
                    {rows.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                          <span style={{ color: TK.muted }}>{p.name}</span>
                        </div>
                        <div className="font-semibold">{intFmt.format(Math.round(Number(p.value) || 0))}</div>
                      </div>
                    ))}
                  </PortalTooltipShell>
                );
              }}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
            />
            {series.map((s) => (
              <Area key={s.key} type={smooth ? "monotone" : "linear"} dataKey={s.key} name={s.name} stroke={s.color} fill={s.color} fillOpacity={0.2} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * MAIN — Keywords Overview (KPI GRID + Big Charts)
 * ---------------------------------------------------------------------------*/
export default function KeywordsOverviewRedesigned() {
  const [kpiRange, setKpiRange] = React.useState<KPIWindow>("30d");
  const [shareMode, setShareMode] = React.useState(false);
  const kDays = kpiRange === "7d" ? 7 : kpiRange === "30d" ? 30 : 90;

  // Build panel with 2*window to compute deltas vs previous window
  const panel = React.useMemo(() => makeKeywordPanel(kDays * 2), [kDays]);

  const currRows = React.useMemo(() => panel.rows.slice(kDays), [panel, kDays]);
  const prevRows = React.useMemo(() => panel.rows.slice(0, kDays), [panel, kDays]);

  // KPI stacked rows (same breakdown for donut & trend)
  const ALL_ROWS = React.useMemo(() => rowsAllKeywords(currRows), [currRows]);
  const VIS_ROWS = React.useMemo(() => rowsVisibility(currRows), [currRows]);
  const POS_ROWS = React.useMemo(() => rowsAvgPos(currRows), [currRows]);
  const T3_ROWS = React.useMemo(() => rowsTop3(currRows), [currRows]);
  const T10_ROWS = React.useMemo(() => rowsTop10(currRows), [currRows]);
  const NL_ROWS = React.useMemo(() => rowsNewLost(currRows), [currRows]);

  // Current values
  const currAll = React.useMemo(() => {
    const r = last(ALL_ROWS, { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 });
    return sumRowKeys(r, Object.keys(POS5_NAME));
  }, [ALL_ROWS]);
  const prevAll = React.useMemo(() => {
    const prevAllRows = rowsAllKeywords(prevRows);
    const r = last(prevAllRows, { t: "", p1_3: 0, p4_10: 0, p11_20: 0, p21_50: 0, p51_100: 0 });
    return sumRowKeys(r, Object.keys(POS5_NAME));
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

  const currAvgPos = React.useMemo(() => weightedAvgPosition(last(panel.rows, panel.rows[0])), [panel.rows]);
  const prevAvgPos = React.useMemo(() => weightedAvgPosition(last(prevRows, prevRows[0] ?? panel.rows[0])), [prevRows, panel.rows]);

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

  const currNew = NL_ROWS.reduce((s, r) => s + (r.newK || 0), 0);
  const currLost = NL_ROWS.reduce((s, r) => s + (r.lostK || 0), 0);
  const prevNL = rowsNewLost(prevRows);
  const prevNew = prevNL.reduce((s, r) => s + (r.newK || 0), 0);
  const prevLost = prevNL.reduce((s, r) => s + (r.lostK || 0), 0);

  // Deltas
  const dAll = pctDelta(currAll, prevAll);
  const dVis = currVisTop10 - prevVisTop10; // use pp
  const dAvgPosPct = pctDelta(currAvgPos, prevAvgPos); // show % change, invert good
  const dT3 = pctDelta(currTop3, prevTop3);
  const dT10 = pctDelta(currTop10, prevTop10);
  const dNL = pctDelta(currNew - currLost, prevNew - prevLost);

  // Coverage trend (Big Card)
  const covDates = currRows.map((r) => r.t);
  const covTop3 = currRows.map((r) => r.p1_3);
  const covTop10 = currRows.map((r) => r.p1_3 + r.p4_10);
  const covTop50 = currRows.map((r) => r.p1_3 + r.p4_10 + r.p11_20 + r.p21_50);

  // Rank distribution (Big Card)
  const distBuckets: BucketKey[] = ["1-3", "4-10", "11-20", "21-50", "51-100"];
  const todayRow = last(currRows, currRows[0]);
  const ago30Row = last(prevRows, prevRows[0] ?? currRows[0]);
  const distToday = [todayRow.p1_3, todayRow.p4_10, todayRow.p11_20, todayRow.p21_50, todayRow.p51_100];
  const distAgo30 = [ago30Row.p1_3, ago30Row.p4_10, ago30Row.p11_20, ago30Row.p21_50, ago30Row.p51_100];

  // Export CSV (KPI grid snapshot)
  const exportCSV = () => {
    const rows = [
      ["metric", "value", "delta"],
      ["All Keywords", currAll, `${dAll.toFixed(1)}%`],
      ["Visibility % (Top‑10)", `${currVisTop10.toFixed(1)}%`, `${dVis.toFixed(1)} pp`],
      ["Avg Position", `#${currAvgPos.toFixed(1)}`, `${dAvgPosPct.toFixed(1)}%`],
      ["Top 3", currTop3, `${dT3.toFixed(1)}%`],
      ["Top 10", currTop10, `${dT10.toFixed(1)}%`],
      ["New vs Lost (net)", currNew - currLost, `${dNL.toFixed(1)}%`],
    ].map((r) => r.join(",")).join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `keywords_overview_kpis_${kpiRange}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section
      className="rounded-[10px] border bg-white p-4 mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>Keywords Overview</h2>
          <button className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50" title="Each KPI uses a stacked donut snapshot and a stacked trend with the same breakdown." aria-label="About" style={{ cursor: "pointer" }}>
            <Info size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={kpiRange}
            onChange={(v) => setKpiRange(v as KPIWindow)}
            aria="KPI Date Range"
            items={[{ label: "7d", value: "7d" }, { label: "30d", value: "30d" }, { label: "90d", value: "90d" }]}
          />
          <label className="inline-flex items-center gap-2 text-xs ml-2" style={{ color: TK.muted, cursor: "pointer" }}>
            <input type="checkbox" checked={shareMode} onChange={(e) => setShareMode(e.target.checked)} className="h-4 w-4 rounded border" style={{ accentColor: TK.valueBlue, borderColor: TK.border }} />
            Show % share in trends
          </label>
          <button onClick={exportCSV} className="h-8 rounded-[8px] border bg-white px-3 text-sm hover:bg-gray-50 inline-flex items-center gap-2" style={{ borderColor: TK.border, cursor: "pointer", color: TK.valueBlue }}>
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* KPI GRID (6 cards) */}
      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 1) All Keywords — snapshot/trend by 5 rank buckets */}
        <KpiCard
          title="All Keywords"
          glyph={<Search size={16} color={TK.brand} />}
          info="Total ranking keywords. Snapshot & trend show distribution by rank buckets."
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
          trend={<TrendStack rows={ALL_ROWS} keys={["p1_3", "p4_10", "p11_20", "p21_50", "p51_100"]} colors={POS5_COL} names={POS5_NAME} mode="bars" share={shareMode} />}
        />

        {/* 2) Visibility % (Top‑10) — donut/trend: 1–3, 4–10, 11+ */}
        <KpiCard
          title="Visibility % (Top‑10)"
          glyph={<Eye size={16} color={TK.brand} />}
          info="Share of keywords in positions 1–10. Snapshot also shows how many are 1–3 vs 4–10."
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
          deltaPct={dVis} // in pp; show as "pp"
          deltaInvert={false}
          deltaUnit="pp"
          trend={<TrendStack rows={VIS_ROWS} keys={["p1_3", "p4_10", "p11p"]} colors={VIS_COL} names={VIS_NAME} mode="area" share={shareMode} />}
        />

        {/* 3) Avg Position — donut/trend by 4 buckets (lower is better) */}
        <KpiCard
          title="Avg Position (All)"
          glyph={<Search size={16} color={TK.brand} />}
          info="Average rank across all keywords (lower is better). Snapshot/trend: impression mix by rank bucket."
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
          deltaInvert={true}
          trend={<TrendStack rows={POS_ROWS} keys={["p1_3", "p4_10", "p11_20", "p21p"]} colors={POS4_COL} names={POS4_NAME} mode="bars" share={shareMode} />}
        />

        {/* 4) Top 3 — donut/trend: #1, #2, #3 */}
        <KpiCard
          title="Top 3 Keywords"
          glyph={<Award size={16} color={TK.brand} />}
          info="Count of keywords in exact positions #1, #2, and #3."
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
          trend={<TrendStack rows={T3_ROWS} keys={["pos1", "pos2", "pos3"]} colors={T3_COL} names={T3_NAME} mode="area" share={shareMode} />}
        />

        {/* 5) Top 10 — donut/trend: 1–3 / 4–6 / 7–10 */}
        <KpiCard
          title="Top 10 Keywords"
          glyph={<Award size={16} color={TK.brand} />}
          info="Count of keywords in positions 1–10, grouped as 1–3, 4–6, 7–10."
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
          trend={<TrendStack rows={T10_ROWS} keys={["p1_3", "p4_6", "p7_10"]} colors={T10_COL} names={T10_NAME} mode="bars" share={shareMode} />}
        />

        {/* 6) New vs Lost — donut/trend: New vs Lost (per day) */}
        <KpiCard
          title="New vs Lost Keywords"
          glyph={<GitCompare size={16} color={TK.brand} />}
          info="Keywords entering vs leaving the index/range during the period."
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
          trend={<TrendStack rows={NL_ROWS} keys={["newK", "lostK"]} colors={NL_COL} names={NL_NAME} mode="bars" share={shareMode} />}
        />
      </div>

      {/* Big charts row */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <RankDistributionCard buckets={distBuckets} today={distToday} ago30={distAgo30} />
        <CoverageTrendCard dates={covDates} top3={covTop3} top10={covTop10} top50={covTop50} />
      </div>
    </section>
  );
}
