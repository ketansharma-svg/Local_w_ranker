"use client";

/* =============================================================================
   Page Insights · Page Analyzer Drawer
   Tab 1 · Overview — Section 3: Traffic Overview (Refinements)
   -----------------------------------------------------------------------------
   ✔ KPI cards: smart popovers now highlight the hovered part (donut + trend).
   ✔ Traffic Trend: single-bar hover animation (no shadow/duplicate bar) + export.
   ✔ Traffic by Channel: KPI‑style donut animation; single-slice moving popover
     (colored dot). “Only organic” toggle filters the Trend & highlights donut.
     Export button added.
   ✔ Traffic by Device: KPI‑style donut + single-slice popover + export.
   ✔ Top Sources & Top Countries: branded icons, info tooltips near titles,
     export buttons.
   ✔ Layout: after KPI row, remaining sections flow in an even 12‑col grid with
     no gaps (Trend full‑width; the rest half‑width).
   ✔ Fonts: Inter / Inter Fallback; no emoji; pointer cursor on interactives.
   ============================================================================ */

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  Sector,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import { createPortal } from "react-dom";
import {
  Info,
  Download,
  BarChart3,
  Activity,
  Target,
  Gauge,
  PieChart as PieIcon,
  Layers,
  Globe,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * TOKENS / HELPERS
 * ---------------------------------------------------------------------------*/
const TK = {
  brand: "#008CCD",
  blue: "#0077FF",
  pastel: "#D9EEF8",
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

type RangeKey = "7d" | "28d" | "90d" | "180d";
type Granularity = "day" | "week";
type ChannelKey = "organic" | "direct" | "referral" | "paid" | "social" | "email" | "other";
type SP = { t: string; v: number };
type Row = { t: string } & Record<string, any>;
type SplitSpec = { key: string; label: string; baseShare: number };

const nf = (n: number) => new Intl.NumberFormat().format(n);
const pf = (n: number, fd = 1) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(n)}%`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const toDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

const downloadText = (name: string, text: string, type = "text/csv;charset=utf-8") => {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* -----------------------------------------------------------------------------
 * DEMO DATA (replace with real data wiring)
 * ---------------------------------------------------------------------------*/
type TrafficPoint = {
  date: string;
  sessions: number;
  engaged: number;
  conversions: number;
  users: number;
  sessionsByChannel: Record<ChannelKey, number>;
};

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
function generateDemoSeries(days = 180): TrafficPoint[] {
  const dates = lastNDates(days);
  return dates.map((d, i) => {
    const season = 1 + 0.08 * Math.sin(i / 3) + 0.04 * Math.cos(i / 5);
    const noise = 1 + (Math.random() - 0.5) * 0.12;
    const sessions = Math.max(40, Math.round(420 * season * noise));
    const engaged = Math.round(sessions * 0.62 * (1 + (Math.random() - 0.5) * 0.06));
    const users = Math.round(sessions * (0.88 + (Math.random() - 0.5) * 0.06));
    const conversions = Math.round(sessions * 0.022 * (1 + (Math.random() - 0.5) * 0.3));
    const shares: Record<ChannelKey, number> = {
      organic: 0.36 + 0.04 * Math.sin(i / 10),
      direct: 0.26 + 0.03 * Math.cos(i / 14),
      referral: 0.10 + 0.02 * Math.sin(i / 7),
      paid: 0.12 + 0.02 * Math.cos(i / 9),
      social: 0.08 + 0.01 * Math.sin(i / 11),
      email: 0.04 + 0.005 * Math.cos(i / 6),
      other: 0.04,
    };
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    (Object.keys(shares) as ChannelKey[]).forEach((k) => (shares[k] = shares[k] / sum));
    const sessionsByChannel = (Object.keys(shares) as ChannelKey[]).reduce((acc, k) => {
      acc[k] = Math.max(0, Math.round(sessions * shares[k]));
      return acc;
    }, {} as Record<ChannelKey, number>);
    return { date: d, sessions, engaged, conversions, users, sessionsByChannel };
  });
}
function aggregateRange(points: TrafficPoint[], startIdx: number, endIdx: number) {
  const slice = points.slice(startIdx, endIdx);
  const sum = (fn: (p: TrafficPoint) => number) => slice.reduce((a, p) => a + fn(p), 0);
  const sessions = sum((p) => p.sessions);
  const engaged = sum((p) => p.engaged);
  const conversions = sum((p) => p.conversions);
  const users = sum((p) => p.users);
  const channels: Record<ChannelKey, number> = {
    organic: 0, direct: 0, referral: 0, paid: 0, social: 0, email: 0, other: 0,
  };
  slice.forEach((p) => (Object.keys(channels) as ChannelKey[]).forEach((k) => (channels[k] += p.sessionsByChannel[k])));
  return { slice, sessions, engaged, conversions, users, channels };
}
function groupByWeek(slice: TrafficPoint[]) {
  const out: TrafficPoint[] = [];
  for (let i = 0; i < slice.length; i += 7) {
    const bucket = slice.slice(i, i + 7);
    if (!bucket.length) continue;
    const d = bucket[bucket.length - 1].date;
    const sum = (fn: (p: TrafficPoint) => number) => bucket.reduce((a, p) => a + fn(p), 0);
    const sessionsByChannel = (
      ["organic", "direct", "referral", "paid", "social", "email", "other"] as ChannelKey[]
    ).reduce((acc, k) => ((acc[k] = sum((p) => p.sessionsByChannel[k])), acc), {} as Record<ChannelKey, number>);
    out.push({
      date: d,
      sessions: sum((p) => p.sessions),
      engaged: sum((p) => p.engaged),
      conversions: sum((p) => p.conversions),
      users: sum((p) => p.users),
      sessionsByChannel,
    });
  }
  return out;
}
function buildTopSources(channelsAgg: Record<ChannelKey, number>) {
  const map: Record<ChannelKey, string[]> = {
    organic: ["google / organic", "bing / organic"],
    direct: ["(direct) / (none)"],
    referral: ["example.com / referral", "partner.io / referral"],
    paid: ["google / cpc", "meta / cpc"],
    social: ["twitter / social", "linkedin / social"],
    email: ["mailchimp / email"],
    other: ["other / unlabeled"],
  };
  const rows: Array<{ sourceMedium: string; channel: ChannelKey; sessions: number; users: number; conversions: number; convRate: number; }> = [];
  (Object.keys(channelsAgg) as ChannelKey[]).forEach((k) => {
    const total = channelsAgg[k];
    const seeds = map[k];
    const splits = seeds.length;
    seeds.forEach((src, i) => {
      const share = splits === 1 ? 1 : i === 0 ? 0.65 : 0.35;
      const sessions = Math.max(1, Math.round(total * share));
      const users = Math.round(sessions * (0.88 + (Math.random() - 0.5) * 0.06));
      const conversions = Math.max(0, Math.round(sessions * (k === "organic" || k === "paid" ? 0.03 : 0.015) * (1 + (Math.random() - 0.5) * 0.3)));
      const convRate = sessions ? conversions / sessions : 0;
      rows.push({ sourceMedium: src, channel: k, sessions, users, conversions, convRate });
    });
  });
  return rows.sort((a, b) => b.sessions - a.sessions);
}
function lastDelta(curr: number, prev: number) {
  const raw = curr - prev;
  const pct = prev > 0 ? (raw / prev) * 100 : 0;
  return { raw, pct };
}

/* -----------------------------------------------------------------------------
 * UI PRIMITIVES
 * ---------------------------------------------------------------------------*/
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
      aria-label="Segmented control"
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
function Tip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-1 rounded hover:bg-gray-50"
        aria-label="Info"
        style={{ cursor: "pointer" }}
      >
        <Info size={16} color={TK.muted} />
      </button>
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

/* -----------------------------------------------------------------------------
 * PORTALED SMART POPOVERS (KPI donuts & trends use these)
 * ---------------------------------------------------------------------------*/
function PortalTooltipShell({
  x,
  y,
  width = 240,
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
        style={{ backgroundColor: "#fff", border: `1px solid ${TK.border}`, color: TK.text, borderRadius: 6 }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/** KPI Trend tooltip — highlights the row closest to the "pointed" series. */
function TrendPortalContent({
  active,
  label,
  payload,
  coordinate,
  containerRect,
  highlightName,
}: any & { coordinate?: { x: number; y: number }; containerRect?: DOMRect | null; highlightName?: string }) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const maxRow = rows.slice().sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  const hl = highlightName || maxRow?.name;

  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px]" style={{ color: TK.muted }}>Total</span>
        <span className="font-semibold">{nf(Math.round(total))}</span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => {
          const activeRow = p.name === hl;
          return (
            <div
              key={i}
              className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", activeRow && "bg-[rgba(0,0,0,0.03)]")}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={cn(activeRow && "font-semibold")} style={{ color: TK.muted }}>
                  {p.name}
                </span>
              </div>
              <div className={cn("font-semibold", activeRow && "text-[color:var(--focus,#0077FF)]")}>
                {nf(Math.round(Number(p.value) || 0))}
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/** KPI Donut tooltip — shows all parts but highlights the hovered slice. */
function DonutPortalContent({
  active,
  coordinate,
  containerRect,
  parts,
  highlightName,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  highlightName?: string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>Breakdown</div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = p.name === highlightName;
          return (
            <div key={i} className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={cn(isActive && "font-semibold")} style={{ color: TK.muted }}>
                  {p.name}
                </span>
              </div>
              <div className={cn("font-semibold", isActive && "text-[color:var(--focus,#0077FF)]")}>
                {nf(Math.round(Number(p.value) || 0))}
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/** Single-slice popover (for Channel/Device cards) — follows pointer Y and sits outside the donut (no overlap). */
function SingleSlicePortal({
  active,
  coordinate,
  payload,
  containerRect,
}: any & { coordinate?: { x: number; y: number }; containerRect?: DOMRect | null }) {
  if (!active || !containerRect || !payload?.[0]) return null;
  const p = payload[0];
  const width = 220;
  // Side: prefer right of chart, else left
  const preferRight = containerRect.right + 12;
  const x = preferRight + width > window.innerWidth ? containerRect.left - width - 12 : preferRight;
  // Follow cursor vertically, clamped to viewport
  const y = Math.min(
    Math.max(8, (containerRect.top + (coordinate?.y ?? containerRect.height / 2)) - 28),
    window.innerHeight - 60
  );

  return (
    <PortalTooltipShell x={x} y={y} width={width}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
          <span style={{ color: TK.muted }}>{p.name}</span>
        </div>
        <div className="font-semibold">{nf(Math.round(Number(p.value) || 0))}</div>
      </div>
    </PortalTooltipShell>
  );
}

/* -----------------------------------------------------------------------------
 * KPI STACKED DONUT (unchanged layout; popover now highlights hovered part)
 * ---------------------------------------------------------------------------*/
function StackedDonut({
  parts,
  size = 96,
  center,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  center?: { label?: string; value: number; fmt?: (n: number) => string };
}) {
  const data = parts.filter((p) => (p.value ?? 0) > 0).map((p) => ({ ...p, v: p.value }));
  const [activeIdx, setActiveIdx] = React.useState<number | undefined>(undefined);
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
                highlightName={tp?.payload?.[0]?.name}
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
            activeIndex={activeIdx}
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
            onMouseEnter={(_, i) => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(undefined)}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center value */}
      {center ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-tight">
          {center.label ? <div className="text-[12px]" style={{ color: TK.muted }}>{center.label}</div> : null}
          <div className="text-[14px] font-semibold" style={{ color: TK.text }}>
            {center.fmt ? center.fmt(center.value) : nf(center.value)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * KPI TREND STACK (popover now highlights a row)
 * ---------------------------------------------------------------------------*/
function to100(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
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
  const valueFmt = (v: number) => (share ? pf(v, 1) : nf(Math.round(v)));

  return (
    <div ref={ref} className="h-16 min-w-[20px]" role="img" aria-label="KPI trend">
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
                  highlightName={tp?.payload?.[0]?.name}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TK.blue, strokeOpacity: 0.15 }}
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
                  highlightName={tp?.payload?.[0]?.name}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ fill: "rgba(0,0,0,0.02)" }}
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
 * KPI CARD SHELL (unchanged structure; info icon near title)
 * ---------------------------------------------------------------------------*/
function KpiCard({
  title,
  glyph,
  info,
  donut,
  value,
  valueFmt,
  delta,
  deltaUnit = "%",
  trend,
}: {
  title: string;
  glyph: React.ReactNode;
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp";
  trend: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center gap-2">
        {glyph}
        <div className="text-[13px] font-semibold" style={{ color: TK.text }}>{title}</div>
        {info ? <Tip text={info} /> : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        {donut}
        <div className="min-w-[80px] leading-tight">
          <div className="text-[22px] font-bold" style={{ color: TK.blue }}>{valueFmt(value)}</div>
          {typeof delta === "number" ? (
            <div className="mt-0.5 text-xs" style={{ color: delta >= 0 ? TK.success : TK.danger }}>
              {delta >= 0 ? "▲" : "▼"} {deltaUnit === "pp" ? `${Math.abs(delta).toFixed(1)} pp` : `${Math.abs(delta).toFixed(1)}%`}
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">{trend}</div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * COLORS / LABELS
 * ---------------------------------------------------------------------------*/
const CH_COL: Record<ChannelKey, string> = {
  organic: "#10B981",
  direct: "#6B7280",
  referral: "#8B5CF6",
  paid: "#F59E0B",
  social: "#3B82F6",
  email: "#EC4899",
  other: "#9CA3AF",
};
const CH_NAMES: Record<ChannelKey, string> = {
  organic: "Organic",
  direct: "Direct",
  referral: "Referral",
  paid: "Paid",
  social: "Social",
  email: "Email",
  other: "Other",
};

const DEV_SPEC: SplitSpec[] = [
  { key: "mobile", label: "Mobile", baseShare: 0.58 },
  { key: "desktop", label: "Desktop", baseShare: 0.34 },
  { key: "tablet", label: "Tablet", baseShare: 0.08 },
];
const DEV_COLORS: Record<string, string> = { mobile: "#5CA8FF", desktop: TK.blue, tablet: "#9FC8FF" };
const DEV_NAMES = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };

/* -----------------------------------------------------------------------------
 * BIG CARD — TRAFFIC TREND (single bar hover, popover, export)
 * ---------------------------------------------------------------------------*/
function NearCursorTooltip({ active, payload, label, coordinate }: any) {
  if (!active || !payload || !payload.length || !coordinate) return null;
  const x = coordinate.x + 12;
  const y = coordinate.y - 12;
  return (
    <div
      className="pointer-events-none absolute z-50 rounded border bg-white px-2 py-1 text-xs shadow"
      style={{ left: x, top: y, borderColor: TK.border, color: TK.text }}
    >
      <div className="font-medium">{toDateLabel(label)}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-[3px]" style={{ background: p.color }} />
          <span>
            {p.name}: <b className="tabular-nums">{nf(Math.round(p.value))}</b>
          </span>
        </div>
      ))}
    </div>
  );
}
function TrafficTrendCard({
  series,
  gran,
  setGran,
}: {
  series: Array<{ date: string; sessions: number; conversions: number }>;
  gran: Granularity;
  setGran: (g: Granularity) => void;
}) {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  const onExport = () => {
    const rows = ["date,sessions,conversions", ...series.map((r) => [r.date, r.sessions, r.conversions].join(","))];
    downloadText(`traffic_trend_${gran}.csv`, rows.join("\n"));
  };

  return (
    <div className="lg:col-span-12 rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} color={TK.brand} />
          <div className="text-[14px] font-medium" style={{ color: TK.text }}>Traffic Trend</div>
          <Tip text="Bars: Sessions (filtered). Line: Conversions. Hover a bar to highlight that period." />
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={gran}
            onChange={(v) => setGran(v as Granularity)}
            items={[{ label: "Day", value: "day" }, { label: "Week", value: "week" }]}
          />
          <button
            onClick={onExport}
            className="h-8 rounded-[8px] border px-3 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.blue }}
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="h-[320px] relative">
        <ResponsiveContainer>
          <BarChart
            data={series}
            onMouseMove={(state: any) => {
              if (typeof state?.activeTooltipIndex === "number") setActiveIdx(state.activeTooltipIndex);
            }}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <CartesianGrid stroke={TK.borderLight} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: TK.muted, fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fill: TK.muted, fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: TK.muted, fontSize: 12 }} />

            {/* Single series with per-cell hover styling (no shadow/duplicate bar) */}
            <Bar yAxisId="left" dataKey="sessions" name="Sessions" fill={TK.blue} radius={[3, 3, 0, 0]} isAnimationActive>
              {series.map((_, i) => (
                <Cell
                  key={i}
                  fill={activeIdx === i ? "#2F8CFF" : TK.blue}
                  stroke={activeIdx === i ? "#1E62C7" : "none"}
                  strokeWidth={activeIdx === i ? 1 : 0}
                  style={{
                    filter: activeIdx === i ? "drop-shadow(0 2px 4px rgba(0,0,0,0.18))" : "none",
                    transform: activeIdx === i ? "translateY(-2px) scaleY(1.03)" : "translateY(0) scaleY(1)",
                    transition: "transform .15s ease, filter .15s ease, fill .15s ease",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Bar>

            <Line yAxisId="right" type="monotone" dataKey="conversions" name="Conversions" stroke={TK.brand} strokeWidth={2} dot={false} isAnimationActive />
            <RTooltip content={<NearCursorTooltip />} cursor={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * SINGLE‑SLICE DONUT (for Channel / Device cards)
 * ---------------------------------------------------------------------------*/
function SingleSliceDonut({
  parts,
  center,
  lockedKey,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  center?: { label?: string; value: number; fmt?: (n: number) => string };
  lockedKey?: string | null;
}) {
  const data = parts.filter((p) => (p.value ?? 0) > 0).map((p) => ({ ...p, v: p.value }));
  const [hoverIdx, setHoverIdx] = React.useState<number | undefined>(undefined);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const lockedIdx = typeof lockedKey === "string" ? data.findIndex((d) => d.key === lockedKey) : -1;
  const activeIndex = hoverIdx ?? (lockedIdx >= 0 ? lockedIdx : undefined);

  return (
    <div ref={ref} className="relative h-[240px]">
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={(tp: any) => (
              <SingleSlicePortal
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
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
            innerRadius={60}
            outerRadius={90}
            startAngle={90}
            endAngle={-270}
            paddingAngle={1}
            activeIndex={activeIndex}
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
            onMouseEnter={(_, i) => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(undefined)}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.color}
                opacity={lockedIdx >= 0 ? (i === lockedIdx ? 1 : 0.4) : 1}
                stroke="#fff"
                strokeWidth={1}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center metric */}
      {center ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {center.label ? <div className="text-xs" style={{ color: TK.muted }}>{center.label}</div> : null}
          <div className="text-[14px] font-semibold">{center.fmt ? center.fmt(center.value) : nf(center.value)}</div>
        </div>
      ) : null}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * COUNTRIES (export included)
 * ---------------------------------------------------------------------------*/
function TopCountriesCard({ series }: { series: TrafficPoint[] }) {
  const total = series.reduce((a, b) => a + b.sessions, 0) || 1;
  const base = [
    { country: "US", share: 0.34 },
    { country: "IN", share: 0.26 },
    { country: "GB", share: 0.12 },
    { country: "DE", share: 0.09 },
    { country: "AU", share: 0.07 },
  ];
  const rows = base.map((b) => ({
    country: b.country,
    sessions: Math.round(total * b.share),
    conversions: Math.round(total * b.share * 0.02),
  }));
  const max = Math.max(...rows.map((r) => r.sessions), 1);

  const onExport = () => {
    const csv = ["country,sessions,conversions,share%", ...rows.map((r) => `${r.country},${r.sessions},${r.conversions},${((r.sessions / total) * 100).toFixed(1)}`)].join("\n");
    downloadText("top_countries.csv", csv);
  };

  return (
    <div className="lg:col-span-6 rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={16} color={TK.brand} />
          <div className="text-[14px] font-medium" style={{ color: TK.text }}>Top Countries</div>
          <Tip text="Hover bars to see sessions and conversions." />
        </div>
        <button
          onClick={onExport}
          className="h-8 rounded-[8px] border px-3 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
          style={{ borderColor: TK.border, cursor: "pointer", color: TK.blue }}
        >
          <Download size={16} /> Export
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <CountryBarRow key={r.country} label={r.country} value={r.sessions} conv={r.conversions} max={max} />
        ))}
      </div>
    </div>
  );
}
function CountryBarRow({
  label,
  value,
  conv,
  max,
}: { label: string; value: number; conv: number; max: number; }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = React.useState<{ x: number } | null>(null);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    setTip({ x: Math.max(8, Math.min(rect.width - 8, x)) });
  };
  const sessionsColor = TK.blue;
  const convColor = TK.brand;

  return (
    <div className="relative flex items-center gap-3">
      <div className="w-10 text-xs text-gray-600">{label}</div>
      <div
        ref={ref}
        className="relative h-3 flex-1 rounded bg-gray-100"
        onMouseMove={onMove}
        onMouseLeave={() => setTip(null)}
      >
        <div className="h-3 rounded" style={{ width: `${(value / max) * 100}%`, background: sessionsColor }} />
        {tip && ref.current
          ? createPortal(
              <div
                className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded border bg-white px-2 py-0.5 text-xs shadow"
                style={{ left: tip.x, borderColor: TK.border, color: TK.text }}
              >
                <div className="font-medium">{label}</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-[3px]" style={{ background: sessionsColor }} />
                  Sessions: <b className="tabular-nums">{nf(value)}</b>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-[3px]" style={{ background: convColor }} />
                  Conversions: <b className="tabular-nums">{nf(conv)}</b>
                </div>
              </div>,
              ref.current
            )
          : null}
      </div>
      <div className="w-32 text-right text-xs tabular-nums text-gray-700">
        {nf(value)} • {nf(conv)} conv
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * MAIN — TRAFFIC OVERVIEW SECTION
 * ---------------------------------------------------------------------------*/
export default function TrafficOverviewSection() {
  const [range, setRange] = React.useState<RangeKey>("28d");
  const [gran, setGran] = React.useState<Granularity>("day");
  const [kpiBreakdown, setKpiBreakdown] = React.useState<"channel" | "device">("channel");
  const [shareMode, setShareMode] = React.useState(false);
  const [onlyOrganic, setOnlyOrganic] = React.useState(false); // unified toggle

  const ALL = React.useMemo(() => generateDemoSeries(180), []);
  const rangeDays = range === "7d" ? 7 : range === "28d" ? 28 : range === "90d" ? 90 : 180;
  const startIdx = Math.max(0, ALL.length - rangeDays);
  const { slice, sessions, engaged, conversions, users, channels } = React.useMemo(
    () => aggregateRange(ALL, startIdx, ALL.length), [ALL, startIdx]
  );

  const prevStart = Math.max(0, startIdx - rangeDays);
  const prevAgg = React.useMemo(() => aggregateRange(ALL, prevStart, startIdx), [ALL, prevStart, startIdx]);

  const dSessions = lastDelta(sessions, prevAgg.sessions);
  const dEngaged = lastDelta(engaged, prevAgg.engaged);
  const dConv = lastDelta(conversions, prevAgg.conversions);
  const engagementRate = sessions ? engaged / sessions : 0;
  const prevEngRate = prevAgg.sessions ? prevAgg.engaged / prevAgg.sessions : 0;
  const dEngRatePP = (engagementRate - prevEngRate) * 100;

  const baseSeries = React.useMemo(() => (gran === "day" ? slice : groupByWeek(slice)), [slice, gran]);

  // KPI breakdown rows
  const SESS_SP: SP[] = baseSeries.map((p) => ({ t: p.date, v: p.sessions }));
  const ENG_SP: SP[] = baseSeries.map((p) => ({ t: p.date, v: p.engaged }));
  const CONV_SP: SP[] = baseSeries.map((p) => ({ t: p.date, v: p.conversions }));

  function channelRowsFrom(series: SP[]): Row[] {
    return series.map((pt, i) => {
      const src = baseSeries[i];
      const total = Math.max(1, Object.values(src.sessionsByChannel).reduce((a, b) => a + b, 0));
      const out: Row = { t: pt.t };
      (Object.keys(src.sessionsByChannel) as ChannelKey[]).forEach((k) => {
        const share = src.sessionsByChannel[k] / total;
        out[k] = Math.round(pt.v * share);
      });
      return out;
    });
  }
  function splitBySpec(series: SP[], spec: SplitSpec[], jitter = 0.06): Row[] {
    return series.map((pt, i) => {
      let rem = 1;
      const shares: Record<string, number> = {};
      spec.forEach((sp, idx) => {
        const j = clamp01(sp.baseShare * (1 + Math.sin((i + 1) * (idx + 2) * 0.27) * jitter));
        const val = idx === spec.length - 1 ? rem : Math.min(rem, j);
        rem -= val;
        shares[sp.key] = val;
      });
      const sum = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
      const out: Row = { t: pt.t };
      spec.forEach((sp) => (out[sp.key] = Math.round(pt.v * (shares[sp.key] / sum))));
      return out;
    });
  }

  const DEV_ROWS_SPEC: SplitSpec[] = DEV_SPEC;
  const SESS_ROWS = React.useMemo(() => (kpiBreakdown === "channel" ? channelRowsFrom(SESS_SP) : splitBySpec(SESS_SP, DEV_ROWS_SPEC)), [SESS_SP, kpiBreakdown]);
  const ENG_ROWS = React.useMemo(() => (kpiBreakdown === "channel" ? channelRowsFrom(ENG_SP) : splitBySpec(ENG_SP, DEV_ROWS_SPEC)), [ENG_SP, kpiBreakdown]);
  const CONV_ROWS = React.useMemo(() => (kpiBreakdown === "channel" ? channelRowsFrom(CONV_SP) : splitBySpec(CONV_SP, DEV_ROWS_SPEC)), [CONV_SP, kpiBreakdown]);

  const ENG_RATE_ROWS: Row[] = React.useMemo(() => {
    const rows: Row[] = [];
    for (let i = 0; i < baseSeries.length; i++) {
      const s = baseSeries[i].sessions;
      const e = baseSeries[i].engaged;
      rows.push({ t: baseSeries[i].date, engaged: e, bounced: Math.max(0, s - e) }as unknown as Row);
    }
    return rows;
  }, [baseSeries]);

  // Trend (Only organic) — sessions filtered; conversions left as total (as requested behaviour focuses on sessions)
  const filteredSeries = React.useMemo(
    () =>
      baseSeries.map((p) => ({
        date: p.date,
        sessions: onlyOrganic ? p.sessionsByChannel.organic : Object.values(p.sessionsByChannel).reduce((a, b) => a + b, 0),
        conversions: p.conversions,
      })),
    [baseSeries, onlyOrganic]
  );

  const sourceRows = React.useMemo(() => buildTopSources(channels), [channels]);

  // Donuts
  const totalSessions = Object.values(channels).reduce((a, b) => a + b, 0);
  const donutChannelParts = (Object.keys(channels) as ChannelKey[]).map((k) => ({
    key: k, name: CH_NAMES[k], value: channels[k], color: CH_COL[k],
  }));

  const total = totalSessions || 1;
  const deviceAgg = React.useMemo(() => {
    const desktop = Math.round(total * 0.34);
    const mobile = Math.round(total * 0.58);
    const tablet = Math.max(1, total - desktop - mobile);
    return { desktop, mobile, tablet, total };
  }, [total]);

  const donutDeviceParts = [
    { key: "mobile", name: DEV_NAMES.mobile, value: deviceAgg.mobile, color: DEV_COLORS.mobile },
    { key: "desktop", name: DEV_NAMES.desktop, value: deviceAgg.desktop, color: DEV_COLORS.desktop },
    { key: "tablet", name: DEV_NAMES.tablet, value: deviceAgg.tablet, color: DEV_COLORS.tablet },
  ];

  return (
    <section
      className="rounded-md border bg-white p-4 mt-4"
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
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>Traffic Overview</h2>
          <Tip text="KPI cards: stacked donut snapshot + stacked trend. Hover tooltips use colored dots with the hovered part highlighted." />
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
            items={[{ label: "7d", value: "7d" }, { label: "28d", value: "28d" }, { label: "90d", value: "90d" }, { label: "180d", value: "180d" }]}
          />
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs" style={{ color: TK.muted }}>KPI breakdown:</span>
            <Segmented
              value={kpiBreakdown}
              onChange={(v) => setKpiBreakdown(v as "channel" | "device")}
              items={[{ label: "Channels", value: "channel" }, { label: "Devices", value: "device" }]}
            />
          </div>
          <label className="ml-2 inline-flex items-center gap-2 text-xs" style={{ color: TK.muted, cursor: "pointer" }}>
            <input type="checkbox" checked={shareMode} onChange={(e) => setShareMode(e.target.checked)} className="h-4 w-4 rounded border" style={{ accentColor: TK.blue, borderColor: TK.border }} />
            Show % share
          </label>
          <button
            onClick={() => {
              const rows = filteredSeries.map((p) => [p.date, p.sessions, p.conversions].join(","));
              downloadText(`traffic_${range}.csv`, ["date,sessions,conversions", ...rows].join("\n"));
            }}
            className="h-8 px-3 rounded-[8px] border text-sm bg-white hover:bg-gray-50 inline-flex items-center gap-2"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.blue }}
          >
            <Download size={16} /> Export
          </button>
        </div>
      </header>

      {/* KPI GRID — Sessions, Engaged Sessions, Conversions, Engagement Rate */}
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Sessions */}
        <KpiCard
          title="Sessions"
          glyph={<BarChart3 size={16} color={TK.brand} />}
          info={`Snapshot: ${kpiBreakdown === "channel" ? "Channel mix" : "Device mix"}. Trend shows ${shareMode ? "% share" : "absolute"} by ${kpiBreakdown}.`}
          donut={
            <StackedDonut
              parts={(kpiBreakdown === "channel" ? (Object.keys(CH_COL) as string[]) : ["mobile", "desktop", "tablet"]).map((k) => ({
                key: k, name: (kpiBreakdown === "channel" ? CH_NAMES[k as ChannelKey] : (DEV_NAMES as any)[k]),
                value: (kpiBreakdown === "channel" ? (channelRowsFrom([{ t: "", v: sessions }])[0][k] ?? 0) : (splitBySpec([{ t: "", v: sessions }], DEV_SPEC)[0][k] ?? 0)),
                color: (kpiBreakdown === "channel" ? CH_COL[k as ChannelKey] : DEV_COLORS[k]),
              }))}
              center={{ label: "Total", value: sessions }}
            />
          }
          value={sessions}
          valueFmt={nf}
          delta={dSessions.pct}
          trend={
            <TrendStack
              rows={kpiBreakdown === "channel" ? channelRowsFrom(baseSeries.map((p) => ({ t: p.date, v: p.sessions }))) : splitBySpec(SESS_SP, DEV_SPEC)}
              keys={kpiBreakdown === "channel" ? (Object.keys(CH_COL) as string[]) : ["mobile", "desktop", "tablet"]}
              colors={kpiBreakdown === "channel" ? CH_COL : DEV_COLORS}
              names={kpiBreakdown === "channel" ? CH_NAMES : (DEV_NAMES as any)}
              mode="area"
              share={shareMode}
            />
          }
        />

        {/* Engaged Sessions */}
        <KpiCard
          title="Engaged Sessions"
          glyph={<Activity size={16} color={TK.brand} />}
          info={`Snapshot: ${kpiBreakdown === "channel" ? "Channel mix" : "Device mix"}.`}
          donut={
            <StackedDonut
              parts={(kpiBreakdown === "channel" ? (Object.keys(CH_COL) as string[]) : ["mobile", "desktop", "tablet"]).map((k) => ({
                key: k, name: (kpiBreakdown === "channel" ? CH_NAMES[k as ChannelKey] : (DEV_NAMES as any)[k]),
                value: (kpiBreakdown === "channel" ? (channelRowsFrom([{ t: "", v: engaged }])[0][k] ?? 0) : (splitBySpec([{ t: "", v: engaged }], DEV_SPEC)[0][k] ?? 0)),
                color: (kpiBreakdown === "channel" ? CH_COL[k as ChannelKey] : DEV_COLORS[k]),
              }))}
              center={{ label: "Total", value: engaged }}
            />
          }
          value={engaged}
          valueFmt={nf}
          delta={dEngaged.pct}
          trend={
            <TrendStack
              rows={kpiBreakdown === "channel" ? channelRowsFrom(baseSeries.map((p) => ({ t: p.date, v: p.engaged }))) : splitBySpec(ENG_SP, DEV_SPEC)}
              keys={kpiBreakdown === "channel" ? (Object.keys(CH_COL) as string[]) : ["mobile", "desktop", "tablet"]}
              colors={kpiBreakdown === "channel" ? CH_COL : DEV_COLORS}
              names={kpiBreakdown === "channel" ? CH_NAMES : (DEV_NAMES as any)}
              mode="bars"
              share={shareMode}
            />
          }
        />

        {/* Conversions */}
        <KpiCard
          title="Conversions"
          glyph={<Target size={16} color={TK.brand} />}
          info={`Snapshot: ${kpiBreakdown === "channel" ? "Channel mix" : "Device mix"}.`}
          donut={
            <StackedDonut
              parts={(kpiBreakdown === "channel" ? (Object.keys(CH_COL) as string[]) : ["mobile", "desktop", "tablet"]).map((k) => ({
                key: k, name: (kpiBreakdown === "channel" ? CH_NAMES[k as ChannelKey] : (DEV_NAMES as any)[k]),
                value: (kpiBreakdown === "channel" ? (channelRowsFrom([{ t: "", v: conversions }])[0][k] ?? 0) : (splitBySpec([{ t: "", v: conversions }], DEV_SPEC)[0][k] ?? 0)),
                color: (kpiBreakdown === "channel" ? CH_COL[k as ChannelKey] : DEV_COLORS[k]),
              }))}
              center={{ label: "Total", value: conversions }}
            />
          }
          value={conversions}
          valueFmt={nf}
          delta={dConv.pct}
          trend={
            <TrendStack
              rows={kpiBreakdown === "channel" ? channelRowsFrom(baseSeries.map((p) => ({ t: p.date, v: p.conversions }))) : splitBySpec(CONV_SP, DEV_SPEC)}
              keys={kpiBreakdown === "channel" ? (Object.keys(CH_COL) as string[]) : ["mobile", "desktop", "tablet"]}
              colors={kpiBreakdown === "channel" ? CH_COL : DEV_COLORS}
              names={kpiBreakdown === "channel" ? CH_NAMES : (DEV_NAMES as any)}
              mode="area"
              share={shareMode}
            />
          }
        />

        {/* Engagement Rate */}
        <KpiCard
          title="Engagement Rate"
          glyph={<Gauge size={16} color={TK.brand} />}
          info="Snapshot: Engaged vs Bounced. Trend shows mix over time."
          donut={
            <StackedDonut
              parts={[
                { key: "engaged", name: "Engaged", value: (ENG_RATE_ROWS.at(-1)?.engaged ?? 0), color: TK.success },
                { key: "bounced", name: "Bounced", value: (ENG_RATE_ROWS.at(-1)?.bounced ?? 0), color: TK.danger },
              ]}
              center={{ label: "ER", value: engagementRate * 100, fmt: (n) => pf(n, 1) }}
            />
          }
          value={engagementRate * 100}
          valueFmt={(v) => pf(v, 1)}
          delta={dEngRatePP}
          deltaUnit="pp"
          trend={
            <TrendStack
              rows={ENG_RATE_ROWS}
              keys={["engaged", "bounced"]}
              colors={{ engaged: TK.success, bounced: TK.danger }}
              names={{ engaged: "Engaged", bounced: "Bounced" }}
              mode="bars"
              share={shareMode}
            />
          }
        />
      </div>

      {/* SECONDARY GRID — evenly distributed, no blank space */}
      <div className="grid gap-3 lg:grid-cols-12 auto-rows-auto">
        {/* Traffic Trend (full width) */}
        <TrafficTrendCard series={filteredSeries} gran={gran} setGran={setGran} />

        {/* Traffic by Channel (half) */}
        <div className="lg:col-span-6 rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon size={16} color={ TK.brand } />
              <div className="text-[14px] font-medium" style={{ color: TK.text }}>Traffic by Channel</div>
              <Tip text="Hover to see exact slice value (popover follows cursor without covering the chart). Toggle to filter Trend and highlight Organic." />
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs" style={{ color: TK.muted, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={onlyOrganic}
                  onChange={(e) => setOnlyOrganic(e.target.checked)}
                  className="h-4 w-4 rounded border"
                  style={{ accentColor: TK.blue, borderColor: TK.border }}
                />
                Only organic
              </label>
              <button
                onClick={() => {
                  const tot = Object.values(channels).reduce((a, b) => a + b, 0) || 1;
                  const csv = ["channel,sessions,share%", ...(Object.keys(channels) as ChannelKey[]).map((k) => `${CH_NAMES[k]},${channels[k]},${((channels[k] / tot) * 100).toFixed(1)}`)];
                  downloadText("traffic_by_channel.csv", csv.join("\n"));
                }}
                className="h-8 rounded-[8px] border px-3 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
                style={{ borderColor: TK.border, cursor: "pointer", color: TK.blue }}
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SingleSliceDonut parts={donutChannelParts} lockedKey={onlyOrganic ? "organic" : null} center={{ label: "Sessions", value: totalSessions }} />
            <div className="flex flex-col gap-1">
              {donutChannelParts.map((d) => (
                <div key={d.key} className="flex items-center justify-between rounded px-1.5 py-1 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: d.color, opacity: onlyOrganic && d.key !== "organic" ? 0.45 : 1 }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-gray-700">
                    {nf(d.value)} • {pf((d.value / Math.max(1, totalSessions)) * 100, 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Traffic by Device (half) */}
        <div className="lg:col-span-6 rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon size={16} color={ TK.brand } />
              <div className="text-[14px] font-medium" style={{ color: TK.text }}>Traffic by Device</div>
              <Tip text="Hover a slice to see the exact value; the popover follows the cursor and stays outside the chart." />
            </div>
            <button
              onClick={() => {
                const tot = deviceAgg.total || 1;
                const csv = [
                  "device,sessions,share%",
                  `Mobile,${deviceAgg.mobile},${((deviceAgg.mobile / tot) * 100).toFixed(1)}`,
                  `Desktop,${deviceAgg.desktop},${((deviceAgg.desktop / tot) * 100).toFixed(1)}`,
                  `Tablet,${deviceAgg.tablet},${((deviceAgg.tablet / tot) * 100).toFixed(1)}`,
                ];
                downloadText("traffic_by_device.csv", csv.join("\n"));
              }}
              className="h-8 rounded-[8px] border px-3 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
              style={{ borderColor: TK.border, cursor: "pointer", color: TK.blue }}
            >
              <Download size={16} /> Export
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SingleSliceDonut parts={donutDeviceParts} center={{ label: "Sessions", value: deviceAgg.total }} />
            <div className="flex flex-col gap-1">
              {donutDeviceParts.map((d) => (
                <div key={d.key} className="flex items-center justify-between px-1.5 py-1 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-gray-700">
                    {nf(d.value)} • {pf((d.value / Math.max(1, deviceAgg.total)) * 100, 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Sources (half) */}
        <div className="lg:col-span-6 rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} color={TK.brand} />
              <div className="text-[14px] font-medium" style={{ color: TK.text }}>Top Sources</div>
              <Tip text="Source/Medium aggregated by channel. Click Export to download the table." />
            </div>
            <button
              onClick={() => {
                const csv = [
                  "source_medium,channel,sessions,users,conversions,rate",
                  ...buildTopSources(channels).map((r) => `${r.sourceMedium},${CH_NAMES[r.channel]},${r.sessions},${r.users},${r.conversions},${(r.convRate * 100).toFixed(1)}%`),
                ];
                downloadText("top_sources.csv", csv.join("\n"));
              }}
              className="h-8 rounded-[8px] border px-3 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
              style={{ borderColor: TK.border, cursor: "pointer", color: TK.blue }}
            >
              <Download size={16} /> Export
            </button>
          </div>
          <div className="max-h-[260px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-gray-500">
                  <th className="px-1 py-1 font-medium">Source / Medium</th>
                  <th className="px-1 py-1 font-medium">Channel</th>
                  <th className="px-1 py-1 font-medium">Sessions</th>
                  <th className="px-1 py-1 font-medium">Users</th>
                  <th className="px-1 py-1 font-medium">Conv.</th>
                  <th className="px-1 py-1 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {buildTopSources(channels).map((r, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC]">
                    <td className="px-1 py-1">{r.sourceMedium}</td>
                    <td className="px-1 py-1">{CH_NAMES[r.channel]}</td>
                    <td className="px-1 py-1 tabular-nums">{nf(r.sessions)}</td>
                    <td className="px-1 py-1 tabular-nums">{nf(r.users)}</td>
                    <td className="px-1 py-1 tabular-nums">{nf(r.conversions)}</td>
                    <td className="px-1 py-1 tabular-nums">{pf(r.convRate * 100, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Countries (half) */}
        <TopCountriesCard series={slice} />
      </div>
    </section>
  );
}

