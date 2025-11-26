"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
  ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, Legend, Line, Area,
  BarChart, Bar,
} from "recharts";
import {
  Download, ChevronDown, MonitorSmartphone, Globe2,
  LineChart as LineIcon, AreaChart as AreaIcon,
  ArrowUpRight, ArrowDownRight, Minus,
  Users as UsersIcon, UserPlus2, RotateCw, ChartPie,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Tokens (aligned to global pattern)
   ───────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",            // main metric value color
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  pastelBrand: "#D9EEF8",
  radius: 10,
  // Keep your current chart colors
  newU:    { stroke: "#0EA5E9", fill: "rgba(14,165,233,.15)" }, // sky (kept)
  returnU: { stroke: "#10B981", fill: "rgba(16,185,129,.15)" }, // emerald (kept)
  danger: "#EF4444",
  success: "#10B981",
  // Metric palette for stacked bar in KPI cards
  metric: {
    bounce: "#F59E0B",   // amber
    time:   "#3B82F6",   // info blue
    cr:     "#10B981",   // green
  },
};

type Device = "all" | "desktop" | "mobile" | "tablet";
type SourceKey =
  | "all"
  | "google / organic"
  | "direct / (none)"
  | "facebook / referral"
  | "google / cpc"
  | "bing / organic";

const DEVICES: Device[] = ["all", "desktop", "mobile", "tablet"];
const SOURCES: SourceKey[] = [
  "all",
  "google / organic",
  "direct / (none)",
  "facebook / referral",
  "google / cpc",
  "bing / organic",
];

/* ─────────────────────────────────────────────
   Formatters
   ───────────────────────────────────────────── */
const fmt = {
  num: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  one: (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n),
  pct: (v: number) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v)}%`,
  time: (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
};

function DeltaBadge({
  delta,
  inverse = false,
  format = (n: number) => fmt.one(Math.abs(n)),
}: {
  delta?: number;
  inverse?: boolean; // lower is better if true
  format?: (n: number) => string;
}) {
  if (delta == null) return null;
  const isZero = Math.abs(delta) < 0.001;
  const positiveGood = !inverse;
  const good = (delta > 0 && positiveGood) || (delta < 0 && !positiveGood);
  const tone = isZero ? TK.muted : good ? TK.success : TK.danger;
  const Icon = isZero ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: tone }}>
      <Icon size={14} />
      {format(delta)}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Smart tooltip (adds colored dots + chart-type icons)
   — updated: formatters can receive (value, row)
   ───────────────────────────────────────────── */
function SmartTooltip({
  active,
  label,
  payload,
  formatters,
  seriesMeta,
}: {
  active?: boolean;
  label?: string;
  payload?: any[];
  formatters?: Record<string, (v: number, row?: any) => string>;
  seriesMeta?: Record<
    string,
    {
      icon?: "line" | "area" | "donut";
      color?: string;
      prev?: boolean;
    }
  >;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md"
      style={{
        background: "#fff",
        border: `1px solid ${TK.border}`,
        boxShadow: "0 8px 24px rgba(17,24,39,.08)",
        padding: "8px 10px",
        fontSize: 12,
        color: TK.text,
      }}
      role="tooltip"
    >
      {label != null && (
        <div className="text-[12px] font-medium" style={{ color: TK.muted, marginBottom: 4 }}>
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => {
          const name = p.name as string;
          const val = Number(p.value);
          const f = formatters?.[name];
          const meta = seriesMeta?.[name];
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded"
                style={{ background: meta?.color || p.color || "#999" }}
                aria-hidden
              />
              <span className="min-w-[150px]">{name}</span>
              <span className="font-semibold">
                {typeof f === "function" ? f(val, p?.payload) : val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Mock GA4 adapter (range / device / source)
   ───────────────────────────────────────────── */
type Day = { date: string; newSessions: number; retSessions: number };
type SegmentAgg = {
  sessions: number;
  bounceRate: number; // %
  avgTime: number;    // sec
  cr: number;         // %
};
type AdapterResult = {
  current: { newU: SegmentAgg; retU: SegmentAgg; series: Day[] };
  previous: { newU: SegmentAgg; retU: SegmentAgg; series: Day[] };
};

const deviceShareAdj: Record<Device, number> = {
  all: 0,
  desktop: -0.02,
  mobile: +0.03,
  tablet: -0.01,
};

const sourceShareAdj: Record<Exclude<SourceKey, "all">, number> = {
  "google / organic": +0.00,
  "direct / (none)": +0.10,
  "facebook / referral": +0.05,
  "google / cpc": -0.05,
  "bing / organic": +0.01,
};

function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function baseSessions(i: number, phase = 0) {
  return 1800 + Math.sin((i + phase) / 3) * 150 + Math.cos((i + phase) / 5) * 90;
}
function clamp01(v: number) { return Math.max(0.05, Math.min(0.95, v)); }

function aggregateSegment(series: Day[], which: "new" | "ret"): SegmentAgg {
  const total = series.reduce(
    (acc, d) => acc + (which === "new" ? d.newSessions : d.retSessions),
    0
  );
  const avgBounce =
    series.reduce((acc, d, i) => {
      const s = which === "new" ? d.newSessions : d.retSessions;
      const base = which === "new" ? 50 : 34; // %
      const wobble = Math.sin(i / 4) * 2 - Math.cos(i / 5) * 1.5;
      return acc + s * (base + wobble);
    }, 0) / Math.max(1, total);

  const avgTime =
    series.reduce((acc, d, i) => {
      const s = which === "new" ? d.newSessions : d.retSessions;
      const base = which === "new" ? 110 : 190; // sec
      const wobble = Math.sin(i / 3) * 6 + Math.cos(i / 6) * 4;
      return acc + s * (base + wobble);
    }, 0) / Math.max(1, total);

  const cr =
    series.reduce((acc, d, i) => {
      const s = which === "new" ? d.newSessions : d.retSessions;
      const base = which === "new" ? 2.2 : 5.8; // %
      const wobble = Math.sin(i / 5) * 0.3;
      return acc + s * (base + wobble);
    }, 0) / Math.max(1, total);

  return {
    sessions: total,
    bounceRate: Math.max(0, Math.min(100, avgBounce)),
    avgTime: Math.max(10, avgTime),
    cr: Math.max(0, cr),
  };
}

function buildSeries(
  range: number,
  device: Device,
  source: SourceKey,
  phase = 0
): Day[] {
  const shareBump =
    (deviceShareAdj[device] || 0) +
    (source === "all" ? 0 : sourceShareAdj[source] || 0);

  const list: Day[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const base = baseSessions(i, phase);
    const newShare = clamp01(0.62 + Math.sin((i + phase) / 6) * 0.06 + shareBump);
    const newSessions = Math.max(1, base * newShare);
    const retSessions = Math.max(1, base - newSessions);
    list.push({
      date: dayLabel(i),
      newSessions,
      retSessions,
    });
  }
  return list;
}



/* ─────────────────────────────────────────────
   NEW: stacked mini trend for KPI cards
   - shows Bounce, Avg. Time, CR as a stacked bar "trend"
   - normalization keeps each day's total = 100 (composition)
   - tooltip shows the real values (%, mm:ss, %)
   ───────────────────────────────────────────── */
type StackRow = {
  date: string;
  // normalized values used for stacking (sum = 100)
  BounceN: number;
  "Avg. TimeN": number;
  CRN: number;
  // raw values for tooltip
  bounceRaw: number;    // %
  timeRaw: number;      // sec
  crRaw: number;        // %
};

function StackedMetricsSpark({
  data,
  aria,
}: {
  data: StackRow[];
  aria: string;
}) {
  const ttFmt = {
    "Bounce rate": (_: number, row?: StackRow) => fmt.pct(row?.bounceRaw ?? 0),
    "Avg. Time":   (_: number, row?: StackRow) => fmt.time(row?.timeRaw ?? 0),
    "CR":          (_: number, row?: StackRow) => fmt.pct(row?.crRaw ?? 0),
  } as Record<string, (v: number, row?: StackRow) => string>;

  const ttMeta = {
    "Bounce rate": { color: TK.metric.bounce },
    "Avg. Time":   { color: TK.metric.time },
    "CR":          { color: TK.metric.cr },
  } as const;

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={[0, 100]} />
          <RTooltip
            content={<SmartTooltip formatters={ttFmt} seriesMeta={ttMeta as any} />}
            labelFormatter={(l) => String(l)}
          />
          {/* flat edges for lower stacks */}
          <Bar name="Bounce rate" dataKey="BounceN" stackId="m" fill={TK.metric.bounce} radius={[0,0,0,0]} />
          <Bar name="Avg. Time" dataKey="Avg. TimeN" stackId="m" fill={TK.metric.time} radius={[0,0,0,0]} />
          {/* only the top-most stack gets curved 6px top corners */}
          <Bar name="CR" dataKey="CRN" stackId="m" fill={TK.metric.cr} radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Chips / segmented toggles (kept)
   ───────────────────────────────────────────── */
function Segmented({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
  "aria-label"?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden border rounded-[8px]"
      style={{ borderColor: TK.border, fontFamily: "inherit" }}
    >
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 h-8 text-sm flex items-center gap-1.5 ${i === 0 ? "rounded-l-[8px]" : ""} ${
              i === options.length - 1 ? "rounded-r-[8px]" : ""
            } ${active ? "bg-[#D9EEF8] font-semibold" : "bg-white"} cursor-pointer`}
            style={{ color: active ? TK.brand : TK.text }}
            type="button"
            title={opt.label}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   KPI Cards (updated trend on right)
   ───────────────────────────────────────────── */
function SegmentCard({
  title,
  titleIcon,
  tone,
  sessions,
  sessionsDelta,
  bounce,
  bounceDelta,
  time,
  timeDelta,
  cr,
  crDelta,
  stackedTrend, // NEW
  active,
  onClick,
}: {
  title: string;
  titleIcon: React.ReactNode;
  tone: { stroke: string; fill: string };
  sessions: number;
  sessionsDelta?: number;
  bounce: number;
  bounceDelta?: number;
  time: number;      // seconds
  timeDelta?: number;
  cr: number;        // %
  crDelta?: number;
  stackedTrend: StackRow[];  // NEW: normalized mini stacked series
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg p-3 text-left transition-shadow cursor-pointer ${active ? "ring-2" : ""}`}
      style={{
        border: `1px solid ${TK.border}`,
        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
        background: "#fff",
        // @ts-expect-error ringColor token (inline style)
        ringColor: active ? TK.brand : undefined,
      }}
      aria-pressed={!!active}
      title={`${title} — click to focus`}
    >
      <div className="text-[12px] font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: TK.muted }}>
        <span className="inline-flex items-center justify-center w-4 h-4" style={{ color: TK.brand }}>
          {titleIcon}
        </span>
        {title}
      </div>
      <div className="mt-1 flex items-end gap-3">
        <div className="min-w-[150px]">
          <div className="text-2xl font-bold" style={{ color: TK.valueBlue }}>
            {fmt.num(sessions)}
          </div>
          <DeltaBadge delta={sessionsDelta} />
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-[11px]" style={{ color: TK.muted }}>Bounce</div>
              <div className="font-medium">{fmt.pct(bounce)}</div>
              <DeltaBadge delta={bounceDelta} inverse format={(n)=>`${fmt.one(Math.abs(n))}%`} />
            </div>
            <div>
              <div className="text-[11px]" style={{ color: TK.muted }}>Avg. Time</div>
              <div className="font-medium">{fmt.time(time)}</div>
              <DeltaBadge delta={timeDelta} format={(n)=>fmt.time(Math.abs(n))} />
            </div>
            <div>
              <div className="text-[11px]" style={{ color: TK.muted }}>CR</div>
              <div className="font-medium">{fmt.pct(cr)}</div>
              <DeltaBadge delta={crDelta} format={(n)=>`${fmt.one(Math.abs(n))}%`} />
            </div>
          </div>
        </div>
        <div className="w-[58%] ml-auto">
          {/* NEW: stacked mini spark showing Bounce / Avg. Time / CR */}
          <StackedMetricsSpark data={stackedTrend} aria={`${title} composition trend`} />
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Export helpers (unchanged)
   ───────────────────────────────────────────── */
function exportPNG(el: HTMLElement | null, filename = "returning-new.png") {
  if (!el) return;
  const wrapper = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,Inter Fallback,system-ui">${el.outerHTML}</div>
    </foreignObject>
  </svg>`;
  const blob = new Blob([wrapper], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = el.clientWidth;
    canvas.height = el.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function exportCSV(series: Day[], file = "returning-vs-new-series.csv") {
  const header = "date,newSessions,returningSessions";
  const body = series
    .map((d) => `${d.date},${Math.round(d.newSessions)},${Math.round(d.retSessions)}`)
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
}

/* ─────────────────────────────────────────────
   Helpers for daily metrics → stacked mini trend
   ───────────────────────────────────────────── */
function dailyMetrics(i: number, which: "new" | "ret") {
  // mirror the aggregator's bases + wobble so the trend feels coherent
  const bounceBase = which === "new" ? 50 : 34;
  const bounceW = Math.sin(i / 4) * 2 - Math.cos(i / 5) * 1.5;
  const bounce = Math.max(0, Math.min(100, bounceBase + bounceW)); // %

  const timeBase = which === "new" ? 110 : 190; // sec
  const timeW = Math.sin(i / 3) * 6 + Math.cos(i / 6) * 4;
  const time = Math.max(10, timeBase + timeW);   // sec

  const crBase = which === "new" ? 2.2 : 5.8;   // %
  const crW = Math.sin(i / 5) * 0.3;
  const cr = Math.max(0, crBase + crW);         // %

  return { bounce, time, cr };
}

/** Normalize three metrics so each day's stacked total = 100 (visual composition).
 * We keep the true values on each row for the tooltip.
 */
function toStackRow(date: string, i: number, which: "new" | "ret"): StackRow {
  const { bounce, time, cr } = dailyMetrics(i, which);
  // simple normalization anchors:
  const bN = (bounce / 100);          // 0..1
  const tN = Math.min(1, time / 240); // cap ~4 minutes baseline
  const cN = cr / 10;                 // ~0..0.6 typical
  const sum = bN + tN + cN || 1;
  return {
    date,
    BounceN:  (bN / sum) * 100,
    "Avg. TimeN": (tN / sum) * 100,
    CRN:      (cN / sum) * 100,
    bounceRaw: bounce,
    timeRaw: time,
    crRaw: cr,
  };
}

/* ─────────────────────────────────────────────
   Main Section (Donut + Cards + Series)
   ───────────────────────────────────────────── */
export default function ReturningVsNewUsersSection({data}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Controls
  const [range, setRange] = React.useState<7 | 14 | 30 | 60 | 90>(30);
  const [device, setDevice] = React.useState<Device>("all");
  const [source, setSource] = React.useState<SourceKey>("all");
  const [mode, setMode] = React.useState<"line" | "area">("line");
  const [focus, setFocus] = React.useState<"all" | "new" | "ret">("all");

  const ref = React.useRef<HTMLDivElement | null>(null);

  const newSessions = Number(
    data?.cards?.find(c => c.type === "New Users")?.sessions ??
    data?.split?.new_sessions ?? 0
  );
  const retSessions = Number(
    data?.cards?.find(c => c.type === "Returning Users")?.sessions ??
    data?.split?.returning_sessions ?? 0
  );
  const totalCur = newSessions + retSessions;
  const newShare = totalCur > 0 ? (newSessions / totalCur) * 100 : (data?.split?.new_percentage ?? 0);
  const retShare = 100 - newShare;
  
  const current = {
    newU: {
      sessions: newSessions,
      bounceRate: Number(data?.cards?.find(c=>c.type==="New Users")?.bounce_rate ?? 0),
      avgTime: Number(data?.cards?.find(c=>c.type==="New Users")?.avg_time_seconds ?? 0),
      cr: 0,
    },
    retU: {
      sessions: retSessions,
      bounceRate: Number(data?.cards?.find(c=>c.type==="Returning Users")?.bounce_rate ?? 0),
      avgTime: Number(data?.cards?.find(c=>c.type==="Returning Users")?.avg_time_seconds ?? 0),
      cr: 0,
    },
    series: Array.from({length: Math.max(7, (data?.cards?.length ?? 2))}).map((_, i) => ({
      date: `D${i+1}`,
      newSessions: Math.round(newSessions / Math.max(1, (data?.cards?.length ?? 7))),
      retSessions: Math.round(retSessions / Math.max(1, (data?.cards?.length ?? 7))),
    })),
  };
  

  // (Keep deltas as-is using the mock adapter's 'previous', but overlay control removed)
  const deltas = {
    newSessions: undefined as number | undefined, // not displayed in header now; keep TS happy
    retSessions: undefined as number | undefined,
    newBounce: undefined as number | undefined,
    retBounce: undefined as number | undefined,
    newTime: undefined as number | undefined,
    retTime: undefined as number | undefined,
    newCr: undefined as number | undefined,
    retCr: undefined as number | undefined,
  };

  // Series for chart
  const series = current.series.map((d) => ({
    date: d.date,
    "New Users": d.newSessions,
    "Returning Users": d.retSessions,
  }));

  // Smart tooltip mapping for bottom chart
  const ttMeta: Record<string, { icon: "line" | "area"; color: string; prev?: boolean }> = {
    "New Users": { icon: mode === "line" ? "line" : "area", color: TK.newU.stroke },
    "Returning Users": { icon: mode === "line" ? "line" : "area", color: TK.returnU.stroke },
  };
  const ttFmt = {
    "New Users": (v: number) => fmt.num(v),
    "Returning Users": (v: number) => fmt.num(v),
  } as Record<string, (v: number) => string>;

  // Donut hover animation (active slice only)
  const [activeSlice, setActiveSlice] = React.useState<number | null>(null);
  const renderActiveSlice = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  // Build stacked-mini trends for cards (composition per day)
  const stackedNew: StackRow[] = React.useMemo(
    () => current.series.map((d, i) => toStackRow(d.date, i, "new")),
    [current.series]
  );
  const stackedRet: StackRow[] = React.useMemo(
    () => current.series.map((d, i) => toStackRow(d.date, i, "ret")),
    [current.series]
  );

  if (!mounted) {
    return (
      <section
        className="rounded-md bg-white p-4"
        style={{ border: `1px solid ${TK.border}` }}
      >
        <div className="h-6 w-48 rounded bg-gray-100" />
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="h-[220px] rounded bg-gray-50" />
          <div className="h-[220px] rounded bg-gray-50" />
        </div>
        <div className="mt-3 h-[360px] rounded bg-gray-50" />
      </section>
    );
  }

  return (
    <section
      ref={ref}
      className="rounded-md bg-white p-4 mt-4"
      style={{
        border: `1px solid ${TK.border}`,
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: TK.text }}>
          <UsersIcon size={18} style={{ color: TK.brand }} />
          Returning vs. New Users
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Range */}
          <div className="relative">
            <select
              className="h-8 px-2.5 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border }}
              value={range}
              onChange={(e) => setRange(Number(e.target.value) as any)}
              title="Date range"
            >
              {[7, 14, 30, 60, 90].map((n) => (
                <option key={n} value={n}>{n}d</option>
              ))}
            </select>
          </div>
          {/* Device */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: TK.brand }}>
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            <select
              className="h-8 pl-7 pr-2.5 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border }}
              value={device}
              onChange={(e) => setDevice(e.target.value as Device)}
              title="Device"
            >
              {DEVICES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {/* Source */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: TK.brand }}>
              <Globe2 className="h-4 w-4" />
            </span>
            <select
              className="h-8 pl-7 pr-2.5 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border }}
              value={source}
              onChange={(e) => setSource(e.target.value as SourceKey)}
              title="Source / Medium"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Mode (Line | Area) */}
          <Segmented
            aria-label="Chart type"
            value={mode}
            onChange={(v) => setMode(v as "line" | "area")}
            options={[
              { value: "line", label: "Line", icon: <LineIcon size={14} /> },
              { value: "area", label: "Area", icon: <AreaIcon size={14} /> },
            ]}
          />

          {/* Export */}
          <div className="inline-flex gap-2">
            <button
              className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: TK.border }}
              onClick={() => exportPNG(ref.current, "returning-new.png")}
              title="Export PNG"
            >
              <Download className="h-4 w-4" /> PNG
            </button>
            <button
              className="h-8 px-2.5 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border }}
              onClick={() => exportCSV(current.series)}
              title="Export CSV"
            >
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Top: Donut + Cards */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {/* Donut */}
        <div
          className="rounded-md p-3 bg-white"
          style={{ border: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: TK.text }}>
              <ChartPie size={16} style={{ color: TK.brand }} /> User Distribution
            </div>
            <div className="text-xs" style={{ color: TK.muted }}>
              Click a slice to focus
            </div>
          </div>

          <div className="h-[220px] w-full flex">
            {/* Donut at left */}
            <div className="flex-1">
              <ResponsiveContainer>
                <PieChart>
                  <RTooltip
                    content={
                      <SmartTooltip
                        formatters={{
                          "New Users": (v) => `${fmt.num(v)} (${fmt.pct(newShare)})`,
                          "Returning Users": (v) => `${fmt.num(v)} (${fmt.pct(retShare)})`,
                        }}
                        seriesMeta={{
                          "New Users": { icon: "donut", color: TK.newU.stroke },
                          "Returning Users": { icon: "donut", color: TK.returnU.stroke },
                        }}
                      />
                    }
                    labelFormatter={() => "Distribution"}
                  />
                  <Pie
                    data={[
                      { name: "New Users", value: current.newU.sessions },
                      { name: "Returning Users", value: current.retU.sessions },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive
                    activeIndex={activeSlice ?? undefined}
                    activeShape={renderActiveSlice}
                    onClick={(e) => {
                      if (!e?.name) return;
                      setFocus((f) =>
                        e.name === "New Users" ? (f === "new" ? "all" : "new") :
                        e.name === "Returning Users" ? (f === "ret" ? "all" : "ret") :
                        "all"
                      );
                    }}
                  >
                    <Cell
                      fill={TK.newU.stroke}
                      opacity={focus === "ret" ? 0.35 : 1}
                      onMouseEnter={() => setActiveSlice(0)}
                      onMouseLeave={() => setActiveSlice(null)}
                    />
                    <Cell
                      fill={TK.returnU.stroke}
                      opacity={focus === "new" ? 0.35 : 1}
                      onMouseEnter={() => setActiveSlice(1)}
                      onMouseLeave={() => setActiveSlice(null)}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legends at right with values */}
            <div className="w-[180px] pl-2 flex flex-col justify-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: TK.newU.stroke }} />
                <span className="font-medium">New</span>
                <span className="ml-auto font-semibold" style={{ color: TK.text }}>
                  {fmt.pct(newShare)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: TK.returnU.stroke }} />
                <span className="font-medium">Returning</span>
                <span className="ml-auto font-semibold" style={{ color: TK.text }}>
                  {fmt.pct(retShare)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-3">
          <SegmentCard
            title="New Users"
            titleIcon={<UserPlus2 size={14} />}
            tone={TK.newU}
            sessions={current.newU.sessions}
            sessionsDelta={deltas.newSessions}
            bounce={current.newU.bounceRate}
            bounceDelta={deltas.newBounce}
            time={current.newU.avgTime}
            timeDelta={deltas.newTime}
            cr={current.newU.cr}
            crDelta={deltas.newCr}
            stackedTrend={stackedNew}
            active={focus === "new" || focus === "all"}
            onClick={() => setFocus((f) => (f === "new" ? "all" : "new"))}
          />
          <SegmentCard
            title="Returning Users"
            titleIcon={<RotateCw size={14} />}
            tone={TK.returnU}
            sessions={current.retU.sessions}
            sessionsDelta={deltas.retSessions}
            bounce={current.retU.bounceRate}
            bounceDelta={deltas.retBounce}
            time={current.retU.avgTime}
            timeDelta={deltas.retTime}
            cr={current.retU.cr}
            crDelta={deltas.retCr}
            stackedTrend={stackedRet}
            active={focus === "ret" || focus === "all"}
            onClick={() => setFocus((f) => (f === "ret" ? "all" : "ret"))}
          />
        </div>
      </div>

      {/* Legend-like toggles (chips) */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {([
          ["new","New Users", TK.newU, <UserPlus2 size={14} key="i1" />],
          ["ret","Returning Users", TK.returnU, <RotateCw size={14} key="i2" />],
        ] as const).map(([k, label, tone, ic]) => {
          const active = focus === "all" || (focus === "new" && k === "new") || (focus === "ret" && k === "ret");
          return (
            <button
              key={k}
              className={`h-8 px-3 rounded-full text-sm border ${active ? "font-semibold" : ""} cursor-pointer inline-flex items-center gap-2`}
              style={{
                borderColor: TK.border,
                background: active ? TK.pastelBrand : "transparent",
                color: active ? TK.brand : TK.text,
              }}
              onClick={() => setFocus((f) => (f === k ? "all" : (k as any)))}
              title={`Toggle ${label}`}
            >
              <span style={{ color: TK.brand }}>{ic}</span>
              <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: (tone as any).stroke }} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Series Chart */}
      <div className="mt-3 h-[360px] w-full rounded-md bg-white" style={{ border: `1px solid ${TK.borderLight}` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid stroke={TK.borderLight} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RTooltip
              content={<SmartTooltip formatters={ttFmt} seriesMeta={ttMeta} />}
              labelFormatter={(l) => String(l)}
            />
            <Legend
              content={({ payload }) => (
                <div className="flex flex-wrap items-center gap-3 px-2 py-1 text-[12px]">
                  {(payload || []).map((p, i) => {
                    const n = p.value as string;
                    const meta = ttMeta[n];
                    const IconCmp = meta?.icon === "line" ? LineIcon : meta?.icon === "area" ? AreaIcon : undefined;
                    return (
                      <div key={i} className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: meta?.color || p.color }} />
                        {IconCmp ? <IconCmp size={12} style={{ color: TK.brand }} /> : null}
                        <span>{n}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            />

            {/* Current period */}
            {(focus === "all" || focus === "new") &&
              (mode === "line" ? (
                <Line
                  name="New Users"
                  type="monotone"
                  dataKey="New Users"
                  stroke={TK.newU.stroke}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive
                />
              ) : (
                <Area
                  name="New Users"
                  type="monotone"
                  dataKey="New Users"
                  stroke={TK.newU.stroke}
                  fill={TK.newU.fill}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive
                />
              ))}

            {(focus === "all" || focus === "ret") &&
              (mode === "line" ? (
                <Line
                  name="Returning Users"
                  type="monotone"
                  dataKey="Returning Users"
                  stroke={TK.returnU.stroke}
                  strokeWidth={2.5}
                  dot={false}
                />
              ) : (
                <Area
                  name="Returning Users"
                  type="monotone"
                  dataKey="Returning Users"
                  stroke={TK.returnU.stroke}
                  fill={TK.returnU.fill}
                  strokeWidth={2.5}
                  dot={false}
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
