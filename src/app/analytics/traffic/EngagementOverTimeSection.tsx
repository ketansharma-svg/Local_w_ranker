"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import {
  Activity,
  CalendarDays,
  Monitor,
  Smartphone,
  Tablet,
  Globe2,
  Download,
  ChevronDown,
  Timer,
  BookOpen,
  Percent,
  Users,
} from "lucide-react";

/* ============================================================================
 *  TOKENS / FONTS
 * ========================================================================== */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
};

const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

/* ============================================================================
 *  TYPES
 * ========================================================================== */
type Device = "all" | "desktop" | "mobile" | "tablet";
type SourceKey =
  | "all"
  | "google / organic"
  | "direct / (none)"
  | "facebook / referral"
  | "google / cpc"
  | "bing / organic";

type ChartType = "bar" | "area";

type Point = {
  date: string; // ISO YYYY-MM-DD
  avgTime: number; // seconds
  bounceRate: number; // %
  pagesPerSession: number; // pages
  engagedSessions: number; // count
};

type Toggles = {
  avgTime: boolean;
  pagesPerSession: boolean;
  bounceRate: boolean;
  engagedSessions: boolean;
};

/* ============================================================================
 *  FORMATTERS
 * ========================================================================== */
const fmt = {
  time: (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
  pct: (v: number) => `${(isFinite(v) ? v : 0).toFixed(1)}%`,
  num: (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${Math.round(n)}`,
  one: (n: number) => `${(isFinite(n) ? n : 0).toFixed(2)}`,
};

const parseISO = (d: string) => new Date(`${d}T00:00:00`);
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, days: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
};
const niceDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parseISO(iso));

/* ============================================================================
 *  COLOR HELPERS (for gradients / patterns like reference)
 * ========================================================================== */
function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const bigint = parseInt(full, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const h = x.toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("")
  );
}
function mixWithWhite(hex: string, ratio = 0.65) {
  const { r, g, b } = hexToRgb(hex);
  const R = Math.round(r + (255 - r) * ratio);
  const G = Math.round(g + (255 - g) * ratio);
  const B = Math.round(b + (255 - b) * ratio);
  return rgbToHex(R, G, B);
}

/* ============================================================================
 *  MOCK DATA (deterministic + device/source adjustments)
 * ========================================================================== */
const SOURCES: SourceKey[] = [
  "all",
  "google / organic",
  "direct / (none)",
  "facebook / referral",
  "google / cpc",
  "bing / organic",
];
const DEVICES: Device[] = ["all", "desktop", "mobile", "tablet"];

const deviceAdj = {
  desktop: { t: +25, b: -4, p: +0.8, e: +140 },
  mobile: { t: -12, b: +6, p: -0.4, e: +60 },
  tablet: { t: +6, b: +1, p: +0.2, e: +28 },
};
const sourceAdj: Record<Exclude<SourceKey, "all">, { t: number; b: number; p: number; e: number }> = {
  "google / organic": { t: +8, b: -3, p: +0.2, e: +160 },
  "direct / (none)": { t: -4, b: +3, p: -0.2, e: +100 },
  "facebook / referral": { t: -10, b: +8, p: -0.4, e: +70 },
  "google / cpc": { t: +2, b: +5, p: -0.1, e: +80 },
  "bing / organic": { t: +4, b: -2, p: +0.1, e: +40 },
};

function basePoint(i: number, phase = 0) {
  const s = Math.sin((i + phase) / 3);
  const c = Math.cos((i + phase) / 5);
  return {
    avgTime: 120 + s * 14 + c * 6, // seconds
    bounceRate: 44 + s * 3 - c * 2, // %
    pagesPerSession: 3.1 + s * 0.25 + c * 0.15,
    engagedSessions: 720 + s * 80 + c * 60,
  };
}

function buildSeries(opts: { days: number; device: Device; source: SourceKey; offsetDays?: number; phase?: number }) {
  const { days, device, source, offsetDays = 0, phase = 0 } = opts;
  const end = addDays(new Date(), -offsetDays);
  const start = addDays(end, -(days - 1));
  const rows: Point[] = [];
  for (let d = 0; d < days; d++) {
    const iso = toISO(addDays(start, d));
    const base = basePoint(d, phase);
    const dev = device === "all" ? { t: 0, b: 0, p: 0, e: 0 } : deviceAdj[device] ?? { t: 0, b: 0, p: 0, e: 0 };
    const src = source === "all" ? { t: 0, b: 0, p: 0, e: 0 } : sourceAdj[source] ?? { t: 0, b: 0, p: 0, e: 0 };
    const avgTime = Math.max(10, base.avgTime + dev.t + src.t);
    const bounceRate = Math.min(95, Math.max(0, base.bounceRate + dev.b + src.b));
    const pagesPerSession = Math.max(0.2, base.pagesPerSession + dev.p + src.p);
    const engagedSessions = Math.max(1, base.engagedSessions + dev.e + src.e);
    rows.push({ date: iso, avgTime, bounceRate, pagesPerSession, engagedSessions });
  }
  return rows;
}

/* ============================================================================
 *  MICRO UI — Modular chips (keep), DropdownChip (keep), Toggle (reference style)
 * ========================================================================== */
function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm cursor-pointer"
      style={{
        borderColor: TK.border,
        background: active ? "rgba(0,140,205,0.08)" : "#FFF",
        boxShadow: active ? "inset 0 0 0 1px rgba(0,140,205,.28)" : "none",
      }}
      aria-pressed={active}
      type="button"
    >
      {children}
    </button>
  );
}

function DropdownChip({
  icon,
  label,
  valueLabel,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  valueLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm cursor-pointer"
        style={{ borderColor: TK.border, background: "#FFF" }}
        aria-expanded={open}
      >
        {icon}
        <span className="font-medium">{label}</span>
        {valueLabel && <span className="text-gray-600">• {valueLabel}</span>}
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 min-w-[220px] rounded-md border bg-white p-1 shadow-lg"
          style={{ borderColor: TK.border }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-2 text-sm hover:bg-gray-50"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
      {active && (
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#10B981" }} />
      )}
    </button>
  );
}

/** Compare toggle — reference style */
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 cursor-pointer"
      title={label}
    >
      <span
        className={cx(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          checked ? "bg-[#008CCD]" : "bg-gray-300"
        )}
      >
        <span
          className={cx(
            "absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0"
          )}
        />
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}

/** Chart type segmented control — reference pattern (Bar default, Area option) */
function ChartTypeSwitch({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (v: ChartType) => void;
}) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-1">
      {(["bar", "area"] as ChartType[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cx(
            "px-2.5 py-1 text-xs rounded-md transition capitalize cursor-pointer",
            value === t ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"
          )}
          title={`Show ${t} chart`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/** Export dropdown — reference pattern */
function ExportDropdown({
  onCSV,
  onPNG,
}: {
  onCSV: () => void;
  onPNG: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50 cursor-pointer"
        style={{ borderColor: TK.border, color: TK.text }}
        title="Export"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" style={{ color: TK.brand }} />
        Export
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border bg-white text-xs shadow-lg"
          style={{ borderColor: TK.border }}
          role="menu"
        >
          <button onClick={onCSV} className="block w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer">
            CSV (series)
          </button>
          <button onClick={onPNG} className="block w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer">
            PNG (chart)
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 *  LEGEND — Branded icons + dots/hatch (reference pattern)
 * ========================================================================== */
function SolidDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span aria-hidden style={{ display: "inline-block", width: size, height: size, borderRadius: 2, background: color }} />
  );
}
function HatchDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 2,
        backgroundImage: `repeating-linear-gradient(45deg, ${color}66, ${color}66 1px, transparent 1px, transparent 3px),
                          repeating-linear-gradient(-45deg, ${color}66, ${color}66 1px, transparent 1px, transparent 3px)`,
        border: `1px solid ${color}55`,
      }}
    />
  );
}

/* Metric styling */
const METRIC_COLORS: Record<keyof Toggles, string> = {
  avgTime: "#2563eb", // blue
  pagesPerSession: "#10b981", // emerald
  bounceRate: "#ef4444", // red
  engagedSessions: "#7c3aed", // violet
};
const METRIC_LABELS: Record<keyof Toggles, string> = {
  avgTime: "Avg. Time",
  pagesPerSession: "Pages / Session",
  bounceRate: "Bounce Rate",
  engagedSessions: "Engaged Sessions",
};
const METRIC_ICON: Record<keyof Toggles, React.ComponentType<any>> = {
  avgTime: Timer,
  pagesPerSession: BookOpen,
  bounceRate: Percent,
  engagedSessions: Users,
};

function BrandLegend({
  metrics,
  compareOn,
}: {
  metrics: (keyof Toggles)[];
  compareOn: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs" style={{ color: "#475569" }}>
      {metrics.map((m) => {
        const Icon = METRIC_ICON[m];
        const color = METRIC_COLORS[m];
        return (
          <div key={m} className="inline-flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
            <SolidDot color={color} />
            <span className="font-medium">Current — {METRIC_LABELS[m]}</span>
            {compareOn && (
              <>
                <span className="inline-block h-px w-3 bg-slate-300 mx-1" />
                <HatchDot color={color} />
                <span>Previous</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================================
 *  EXPORT HELPERS
 * ========================================================================== */
function exportSeriesCSV(rows: { date: string }[], selected: (keyof Toggles)[], getVal: (row: any, key: string) => number, compareOn: boolean, startISO: string, endISO: string) {
  const headers: string[] = ["Date"];
  selected.forEach((m) => {
    headers.push(`Current ${METRIC_LABELS[m]}`);
    if (compareOn) headers.push(`Previous ${METRIC_LABELS[m]}`);
  });
  const lines = [headers.join(",")];
  rows.forEach((row: any) => {
    const parts: string[] = [row.date];
    selected.forEach((m) => {
      parts.push(String(getVal(row, `cur_${m}`) || 0));
      if (compareOn) parts.push(String(getVal(row, `prev_${m}`) || 0));
    });
    lines.push(parts.join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `engagement-trends-${startISO}_to_${endISO}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportChartPNG(root: HTMLDivElement | null, name: string) {
  if (!root) return;
  const svg = root.querySelector("svg");
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  const bbox = root.getBoundingClientRect();
  const width = Math.max(800, Math.ceil(bbox.width));
  const height = Math.max(360, Math.ceil(bbox.height));
  const canvas = document.createElement("canvas");
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = name;
  a.click();
}

/* ============================================================================
 *  MAIN SECTION (drop-in)
 * ========================================================================== */
export default function EngagementOverTimeSection({data}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Controls
  const [range, setRange] = React.useState<7 | 14 | 30 | 60 | 90>(30);
  const [device, setDevice] = React.useState<Device>("all");
  const [source, setSource] = React.useState<SourceKey>("all");
  const [comparePrev, setComparePrev] = React.useState<boolean>(true); // header toggle (reference style)
  const [chartType, setChartType] = React.useState<ChartType>("bar"); // BAR default per reference
  const [show, setShow] = React.useState<Toggles>({
    avgTime: true,
    pagesPerSession: true,
    bounceRate: true,
    engagedSessions: true,
  });

  const current = React.useMemo(() => {
    return (data ?? []).map(d => ({
      date: d.date,
      avgTime: Number(d.averageSessionDuration ?? 0),
      bounceRate: (d.bounceRate ?? 0) > 1 ? Number(d.bounceRate) : Number(d.bounceRate ?? 0) * 100,
      pagesPerSession: Number(d.pagesPerSession ?? 0),
      engagedSessions: Number(d.engagedSessions ?? 0),
    }));
  }, [data]);
  
  const previous = React.useMemo(() => {
    // If you have previous-period data later, map it here. For now, zeros.
    return current.map(r => ({
      ...r,
      avgTime: 0, bounceRate: 0, pagesPerSession: 0, engagedSessions: 0,
    }));
  }, [current]);
  

  // Combine into chartData aligned by current dates
  const chartData = React.useMemo(() => {
    return current.map((row, idx) => {
      const prev = previous[idx];
      return {
        date: row.date,
        cur_avgTime: row.avgTime,
        cur_pagesPerSession: row.pagesPerSession,
        cur_bounceRate: row.bounceRate,
        cur_engagedSessions: row.engagedSessions,
        prev_avgTime: prev?.avgTime ?? 0,
        prev_pagesPerSession: prev?.pagesPerSession ?? 0,
        prev_bounceRate: prev?.bounceRate ?? 0,
        prev_engagedSessions: prev?.engagedSessions ?? 0,
      };
    });
  }, [current, previous]);

  const selectedMetrics = React.useMemo(
    () =>
      (Object.keys(show) as (keyof Toggles)[]).filter((k) => (show as any)[k]) as (keyof Toggles)[],
    [show]
  );

  const hasPercent = selectedMetrics.includes("bounceRate");
  const hasOthers = selectedMetrics.some((m) => m !== "bounceRate");

  const endISO = React.useMemo(() => (current.length ? current[current.length - 1].date : toISO(new Date())), [
    current,
  ]);
  const startISO = React.useMemo(
    () => (current.length ? current[0].date : toISO(addDays(new Date(), -(range - 1)))),
    [current, range]
  );

  const rootRef = React.useRef<HTMLDivElement | null>(null);

  if (!mounted) {
    return (
      <section
        className="rounded-xl border bg-white p-4 md:p-6 shadow-sm"
        style={{ borderColor: TK.border, fontFamily: FONT_STACK }}
      >
        <div className="h-5 w-64 rounded bg-gray-100" />
        <div className="mt-3 h-[340px] rounded bg-gray-50" />
      </section>
    );
  }

  /* ---------------- Tooltip (smart popover — reference pattern) ---------------- */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const row = (payload[0] && payload[0].payload) || {};
    return (
      <div
        className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md mt-2"
        style={{ borderColor: TK.border, maxWidth: 340, fontFamily: FONT_STACK, color: TK.text }}
      >
        <div className="mb-1 font-medium">{niceDate(String(label))}</div>
        <div className="space-y-1.5">
          {selectedMetrics.map((m) => {
            const color = METRIC_COLORS[m];
            const cur = Number(row[`cur_${m}`] || 0);
            const prev = Number(row[`prev_${m}`] || 0);
            const delta = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
            const Icon = METRIC_ICON[m];
            const isPct = m === "bounceRate";
            const isTime = m === "avgTime";
            const formatVal = (v: number) => (isPct ? fmt.pct(v) : isTime ? fmt.time(v) : m === "pagesPerSession" ? fmt.one(v) : fmt.num(v));
            return (
              <div key={m} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2">
                <span className="inline-flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                </span>
                <span className="text-slate-600">{METRIC_LABELS[m]}</span>
                <span className="font-medium text-slate-900">{formatVal(cur)}</span>

                {comparePrev && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <HatchDot color={color} />
                    </span>
                    <span className="text-slate-500">Prev</span>
                    <span className="text-slate-700">
                      {formatVal(prev)}{" "}
                      {prev > 0 && (
                        <span
                          className={cx(
                            "ml-1 font-medium",
                            delta >= 0 ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          ({delta >= 0 ? "+" : "-"}
                          {Math.abs(delta).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ---------------- RENDER ---------------- */
  return (
    <section
      className="w-full rounded-xl border bg-white p-4 md:p-6 shadow-sm mt-4"
      style={{ borderColor: TK.border, fontFamily: FONT_STACK }}
      aria-label="Engagement Metrics Over Time"
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: TK.brand }} />
          <h2 className="text-base md:text-lg font-semibold" style={{ color: TK.text }}>
            Engagement Metrics Over Time
          </h2>
        </div>

        {/* Right: chart type switch, compare toggle (reference), export */}
        <div className="flex items-center gap-3">
          <ChartTypeSwitch value={chartType} onChange={setChartType} />
          <ToggleSwitch checked={comparePrev} onChange={setComparePrev} label="Compare previous period" />
          <ExportDropdown
            onCSV={() => exportSeriesCSV(chartData, selectedMetrics, (r, k) => Number(r[k] || 0), comparePrev, startISO, endISO)}
            onPNG={() => exportChartPNG(rootRef.current, `engagement-trends-${startISO}_to_${endISO}.png`)}
          />
        </div>
      </div>

      {/* Filters / Chips (KEEP from this design) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Time */}
        <DropdownChip
          icon={<CalendarDays className="h-4 w-4" color={TK.brand} />}
          label="Time"
          valueLabel={`${range}d`}
        >
          {[7, 14, 30, 60, 90].map((n) => (
            <MenuItem key={n} active={range === (n as any)} onClick={() => setRange(n as any)}>
              {n} days
            </MenuItem>
          ))}
        </DropdownChip>

        {/* Device */}
        <DropdownChip
          icon={<Monitor className="h-4 w-4" color={TK.brand} />}
          label="Device"
          valueLabel={device}
        >
          <MenuItem active={device === "all"} onClick={() => setDevice("all")} icon={<Monitor className="h-4 w-4" />}>
            All
          </MenuItem>
          <MenuItem
            active={device === "desktop"}
            onClick={() => setDevice("desktop")}
            icon={<Monitor className="h-4 w-4" />}
          >
            Desktop
          </MenuItem>
          <MenuItem
            active={device === "mobile"}
            onClick={() => setDevice("mobile")}
            icon={<Smartphone className="h-4 w-4" />}
          >
            Mobile
          </MenuItem>
          <MenuItem
            active={device === "tablet"}
            onClick={() => setDevice("tablet")}
            icon={<Tablet className="h-4 w-4" />}
          >
            Tablet
          </MenuItem>
        </DropdownChip>

        {/* Source */}
        <DropdownChip icon={<Globe2 className="h-4 w-4" color={TK.brand} />} label="Source" valueLabel={source}>
          {SOURCES.map((s) => (
            <MenuItem key={s} active={source === s} onClick={() => setSource(s)}>
              {s}
            </MenuItem>
          ))}
        </DropdownChip>

        {/* Metric chips (quick show/hide) — keep modular chip style */}
        {(
          [
            ["avgTime", "Avg. Time"] as const,
            ["pagesPerSession", "Pages / Session"] as const,
            ["bounceRate", "Bounce Rate"] as const,
            ["engagedSessions", "Engaged Sessions"] as const,
          ] as const
        ).map(([key, label]) => {
          const active = (show as any)[key] as boolean;
          const Icon = METRIC_ICON[key];
          return (
            <Chip key={key} active={active} onClick={() => setShow((s) => ({ ...s, [key]: !active }))} title={`Toggle ${label}`}>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: METRIC_COLORS[key] }} />
              <Icon className="h-4 w-4" color={TK.brand} aria-hidden />
              <span className={active ? "font-medium" : ""} style={{ color: active ? METRIC_COLORS[key] : TK.text }}>
                {label}
              </span>
            </Chip>
          );
        })}

        {/* Range summary chip */}
        <span
          className="ml-1 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
          style={{ borderColor: TK.borderLight, color: TK.text }}
          title="Selected date range"
        >
          Range:&nbsp;<strong>{niceDate(startISO)}</strong>&nbsp;→&nbsp;<strong>{niceDate(endISO)}</strong>
        </span>
      </div>

      {/* Legend (reference pattern) */}
      <BrandLegend metrics={selectedMetrics} compareOn={comparePrev} />

      {/* =========================== Chart =========================== */}
      <div className="mt-2 h-[360px] w-full" ref={rootRef}>
        {chartType === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <defs>
                {selectedMetrics.map((m) => {
                  const color = METRIC_COLORS[m];
                  const pastel = mixWithWhite(color, 0.65);
                  return (
                    <React.Fragment key={m}>
                      <linearGradient id={`g-${m}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id={`gp-${m}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={pastel} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={pastel} stopOpacity={0.04} />
                      </linearGradient>
                    </React.Fragment>
                  );
                })}
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={niceDate} tick={{ fontSize: 12, fill: "#475569" }} stroke="#cbd5e1" />
              {hasOthers && (
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmt.num(Number(v))}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  stroke="#cbd5e1"
                />
              )}
              {hasPercent && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmt.pct(Number(v))}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  stroke="#cbd5e1"
                />
              )}
              <RTooltip content={<CustomTooltip />} />

              {/* Previous period (pastel, dashed) */}
              {comparePrev &&
                selectedMetrics.map((m) => {
                  const color = METRIC_COLORS[m];
                  const axis = m === "bounceRate" ? "right" : "left";
                  return (
                    <Area
                      key={`prev-${m}`}
                      type="monotone"
                      yAxisId={axis}
                      dataKey={`prev_${m}`}
                      name={`Previous — ${METRIC_LABELS[m]}`}
                      stroke={mixWithWhite(color, 0.65)}
                      strokeDasharray="3 7"
                      strokeWidth={2.0}
                      fill={`url(#gp-${m})`}
                      fillOpacity={0.35}
                      dot={false}
                      activeDot={false}
                    />
                  );
                })}

              {/* Current (solid) */}
              {selectedMetrics.map((m) => {
                const color = METRIC_COLORS[m];
                const axis = m === "bounceRate" ? "right" : "left";
                return (
                  <Area
                    key={`cur-${m}`}
                    type="monotone"
                    yAxisId={axis}
                    dataKey={`cur_${m}`}
                    name={`Current — ${METRIC_LABELS[m]}`}
                    stroke={color}
                    strokeWidth={2.6}
                    fill={`url(#g-${m})`}
                    fillOpacity={0.5}
                    dot={false}
                    activeDot={{ r: 3, fill: color }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <defs>
                {selectedMetrics.map((m) => {
                  const color = METRIC_COLORS[m];
                  return (
                    <pattern key={m} id={`pat-${m}`} width="6" height="6" patternUnits="userSpaceOnUse">
                      <path d="M0,0 L6,6" stroke={color} strokeWidth={0.8} opacity={0.6} />
                      <path d="M6,0 L0,6" stroke={color} strokeWidth={0.8} opacity={0.6} />
                      <circle cx="3" cy="3" r="0.6" fill={color} opacity={0.5} />
                    </pattern>
                  );
                })}
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={niceDate} tick={{ fontSize: 12, fill: "#475569" }} stroke="#cbd5e1" />
              {hasOthers && (
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmt.num(Number(v))}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  stroke="#cbd5e1"
                />
              )}
              {hasPercent && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmt.pct(Number(v))}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  stroke="#cbd5e1"
                />
              )}
              <RTooltip content={<CustomTooltip />} />

              {/* Previous bars (hatch) */}
              {comparePrev &&
                selectedMetrics.map((m) => (
                  <Bar
                    key={`prev-${m}`}
                    yAxisId={m === "bounceRate" ? "right" : "left"}
                    dataKey={`prev_${m}`}
                    name={`Previous — ${METRIC_LABELS[m]}`}
                    fill={`url(#pat-${m})`}
                    stroke={METRIC_COLORS[m]}
                    strokeOpacity={0.7}
                    radius={[4, 4, 0, 0]}
                  />
                ))}

              {/* Current bars (solid) */}
              {selectedMetrics.map((m) => (
                <Bar
                  key={`cur-${m}`}
                  yAxisId={m === "bounceRate" ? "right" : "left"}
                  dataKey={`cur_${m}`}
                  name={`Current — ${METRIC_LABELS[m]}`}
                  fill={METRIC_COLORS[m]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-3 text-[11px] leading-5 text-slate-500">
        <span className="font-medium">Tip:</span> Use the metric chips to show/hide Avg. Time, Pages / Session,
        Bounce Rate, and Engaged Sessions. Previous period uses pastel (Area) or hatch (Bar).
      </div>
    </section>
  );
}
