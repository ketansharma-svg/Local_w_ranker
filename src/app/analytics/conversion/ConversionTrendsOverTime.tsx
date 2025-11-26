"use client";


import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  Download,
  ChevronDown,
  Info,
  Target,
  Users,
  Percent,
} from "lucide-react";


/* ======================================================================================
 *  TYPES
 * ====================================================================================== */
type MetricKey = "conversions" | "sessions" | "cvr";
type ChartType = "area" | "bar";
type SourceKey = "All" | "Organic" | "Paid" | "Referral" | "Direct" | string;


export type TrendPoint = {
  date: string; // ISO YYYY-MM-DD
  source?: SourceKey;
  sessions?: number;
  conversions?: number;
  cvr?: number; // %
};


export type ConversionTrendsProps = {
  data?: TrendPoint[];
  previousData?: TrendPoint[];
  defaultMetrics?: MetricKey[];
  defaultRangeDays?: 7 | 30 | 90 | 180;
  defaultSource?: SourceKey;
  defaultChart?: ChartType; // default is BAR per spec
  initialComparisonOn?: boolean;
  insightText?: string;
  className?: string;
};


/* ======================================================================================
 *  TOKENS / UTILS
 * ====================================================================================== */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';


const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");


const fmtNum = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : `${Math.round(n)}`;


const fmtPct = (n: number) => `${(isFinite(n) ? n : 0).toFixed(2)}%`;


const parseISO = (d: string) => new Date(`${d}T00:00:00`);
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const addDays = (d: Date, days: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
};
const niceDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    parseISO(iso)
  );


/** Deterministic mock */
const prand = (seed: number) => () => {
  seed ^= seed << 13;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  return Math.abs(seed % 1000) / 1000;
};


function buildSampleData(days = 30): TrendPoint[] {
  const end = new Date();
  const start = addDays(end, -days + 1);
  const roll = prand(42);
  const sources: SourceKey[] = ["Organic", "Direct", "Referral", "Paid"];
  const rows: TrendPoint[] = [];


  for (let d = 0; d < days; d++) {
    const iso = toISO(addDays(start, d));
    for (const s of sources) {
      const base = 220 + Math.round(220 * roll());
      const season = 1 + 0.25 * Math.sin((d / days) * Math.PI * 2);
      const sessions = Math.round(base * season * (s === "Paid" ? 0.7 : 1));
      const convRate = 1.1 + 1.8 * roll() + (s === "Organic" ? 0.8 : 0) + (s === "Paid" ? 0.4 : 0);
      const conversions = Math.round((sessions * convRate) / 100);
      rows.push({
        date: iso,
        source: s,
        sessions,
        conversions,
        cvr: sessions > 0 ? (conversions / sessions) * 100 : 0,
      });
    }
  }
  return rows;
}


function aggregateByDate(points: TrendPoint[] | undefined, source: SourceKey) {
  const acc: Record<
    string,
    { sessions: number; conversions: number; cvr: number; hasAny: boolean }
  > = {};
  (points || []).forEach((p) => {
    if (!p || !p.date) return;
    if (source !== "All" && p.source !== source) return;
    if (!acc[p.date]) acc[p.date] = { sessions: 0, conversions: 0, cvr: 0, hasAny: false };
    acc[p.date].sessions += p.sessions || 0;
    acc[p.date].conversions += p.conversions || 0;
    acc[p.date].hasAny = true;
  });
  Object.keys(acc).forEach((d) => {
    const a = acc[d];
    a.cvr = a.sessions > 0 ? (a.conversions / a.sessions) * 100 : 0;
  });
  return acc;
}


function toWindowSeries(opts: {
  aggregated: ReturnType<typeof aggregateByDate>;
  startISO: string;
  endISO: string;
  metric: MetricKey;
}) {
  const { aggregated, startISO, endISO, metric } = opts;
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const out: { date: string; value: number }[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const iso = toISO(cursor);
    const a = aggregated[iso];
    const value = a
      ? metric === "cvr"
        ? a.cvr
        : metric === "conversions"
        ? a.conversions
        : a.sessions
      : 0;
    out.push({ date: iso, value });
  }
  return out;
}


function estimatePrevious(current: { date: string; value: number }[]) {
  return current.map((d, idx) => ({
    date: toISO(addDays(parseISO(d.date), -current.length)),
    value: Math.max(0, d.value * (0.85 + 0.07 * Math.sin(idx))),
  }));
}


/** Colors */
const PRIMARY_BLUE = "#0077ff"; // conversions main metric per spec
const METRIC_COLORS: Record<MetricKey, string> = {
  conversions: PRIMARY_BLUE,
  sessions: "#00b894",
  cvr: "#7c3aed",
};


function hexToRgb(hex: string) {
  const raw = hex.replace("#", "");
  const bigint = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16);
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
function withAlpha(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}


/** Click outside hook */
function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}


/* ======================================================================================
 *  MICRO UI — Modular Chip & Toggle
 * ====================================================================================== */
function Chip({
  children,
  onClear,
  title,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  title?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: TK.borderLight, color: TK.text }}
      title={title}
    >
      {children}
      {onClear && (
        <button
          className="ml-0.5 rounded border px-1.5 py-0.5 text-[11px] cursor-pointer"
          style={{ borderColor: TK.borderLight, color: "#6B7280" }}
          onClick={onClear}
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </span>
  );
}


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
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-[#008CCD]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}


/* ======================================================================================
 *  LEGEND — Branded icons + color dots
 * ====================================================================================== */
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
function SolidDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ display: "inline-block", width: size, height: size, borderRadius: 2, background: color }}
    />
  );
}


function MetricIcon({ m }: { m: MetricKey }) {
  const props = { className: "h-3.5 w-3.5", style: { color: TK.brand } as React.CSSProperties };
  if (m === "conversions") return <Target {...props} />;
  if (m === "sessions") return <Users {...props} />;
  return <Percent {...props} />;
}


function BrandLegend({
  metrics,
  compareOn,
}: {
  metrics: MetricKey[];
  compareOn: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs" style={{ color: "#475569" }}>
      {metrics.map((m) => (
        <div key={m} className="inline-flex items-center gap-2">
          <MetricIcon m={m} />
          <SolidDot color={METRIC_COLORS[m]} />
          <span className="font-medium">Current — {m === "cvr" ? "Conv. Rate" : m[0].toUpperCase() + m.slice(1)}</span>
          {compareOn && (
            <>
              <span className="inline-block h-px w-3 bg-slate-300 mx-1" />
              <HatchDot color={METRIC_COLORS[m]} />
              <span>Previous</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}


/* ======================================================================================
 *  COMPONENT
 * ====================================================================================== */
const METRIC_OPTS: { key: MetricKey; label: string }[] = [
  { key: "conversions", label: "Conversions" },
  { key: "cvr", label: "Conv. Rate" },
  { key: "sessions", label: "Sessions" },
];
const RANGE_OPTS = [7, 30, 90, 180] as const;


export default function ConversionTrendsOverTime({
  data,
  previousData,
  defaultMetrics = ["conversions"],
  defaultRangeDays = 30,
  defaultSource = "All",
  defaultChart = "bar", // ← BAR by default per refinement
  initialComparisonOn = true,
  insightText,
  className,
}: ConversionTrendsProps) {
  /* ---------------- State ---------------- */
  const [metrics, setMetrics] = useState<MetricKey[]>(
    Array.isArray(defaultMetrics) && defaultMetrics.length ? defaultMetrics : ["conversions"]
  );
  const [range, setRange] = useState<typeof RANGE_OPTS[number]>(defaultRangeDays);
  const [source, setSource] = useState<SourceKey>(defaultSource);
  const [chartType, setChartType] = useState<ChartType>(defaultChart);
  const [compareOn, setCompareOn] = useState<boolean>(initialComparisonOn);


  const [metricMenuOpen, setMetricMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);


  /* ---------------- Data (safe defaults) ---------------- */
  const safeData: TrendPoint[] = useMemo(
    () => (Array.isArray(data) && data.length ? data : buildSampleData(90)),
    [data]
  );
  const safePrevData: TrendPoint[] = Array.isArray(previousData) ? previousData! : [];


  const availableSources = useMemo<SourceKey[]>(() => {
    const s = new Set<SourceKey>(["All"]);
    safeData.forEach((d) => d?.source && s.add(d.source));
    return Array.from(s);
  }, [safeData]);


  const endISO = useMemo(() => {
    const dates = safeData.map((d) => d.date).filter(Boolean);
    return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : toISO(new Date());
  }, [safeData]);
  const startISO = useMemo(
    () => toISO(addDays(parseISO(endISO), -(range - 1))),
    [endISO, range]
  );


  const aggCurrent = useMemo(() => aggregateByDate(safeData, source), [safeData, source]);
  const aggPrev = useMemo(
    () => (safePrevData.length ? aggregateByDate(safePrevData, source) : null),
    [safePrevData, source]
  );


  const seriesCurrentByMetric = useMemo(() => {
    const out: Record<MetricKey, { date: string; value: number }[]> = {
      conversions: [],
      sessions: [],
      cvr: [],
    };
    (["conversions", "sessions", "cvr"] as MetricKey[]).forEach((key) => {
      out[key] = toWindowSeries({ aggregated: aggCurrent, startISO, endISO, metric: key });
    });
    return out;
  }, [aggCurrent, startISO, endISO]);


  const seriesPrevByMetric = useMemo(() => {
    const result: Record<MetricKey, { date: string; value: number }[]> = {
      conversions: [],
      sessions: [],
      cvr: [],
    };
    const prevEnd = toISO(addDays(parseISO(startISO), -1));
    const prevStart = toISO(addDays(parseISO(prevEnd), -(range - 1)));
    (["conversions", "sessions", "cvr"] as MetricKey[]).forEach((key) => {
      result[key] = aggPrev
        ? toWindowSeries({ aggregated: aggPrev, startISO: prevStart, endISO: prevEnd, metric: key })
        : estimatePrevious(seriesCurrentByMetric[key]);
    });
    return result;
  }, [aggPrev, seriesCurrentByMetric, startISO, range]);


  const chartData = useMemo(() => {
    const driving: MetricKey = (metrics[0] || "conversions") as MetricKey;
    const base = seriesCurrentByMetric[driving] || [];
    return base.map((pt, idx) => {
      const row: Record<string, any> = { date: pt.date };
      (["conversions", "sessions", "cvr"] as MetricKey[]).forEach((m) => {
        row[`cur_${m}`] = seriesCurrentByMetric[m]?.[idx]?.value ?? 0;
        row[`prev_${m}`] = seriesPrevByMetric[m]?.[idx]?.value ?? 0;
      });
      return row;
    });
  }, [seriesCurrentByMetric, seriesPrevByMetric, metrics]);


  const totals = useMemo(() => {
    const main = (metrics[0] || "conversions") as MetricKey;
    const currSum = chartData.reduce((s, d) => s + (Number(d[`cur_${main}`]) || 0), 0);
    const prevSum = chartData.reduce((s, d) => s + (Number(d[`prev_${main}`]) || 0), 0);
    const deltaPct = prevSum > 0 ? ((currSum - prevSum) / prevSum) * 100 : 0;
    return { currSum, prevSum, deltaPct, metric: main };
  }, [chartData, metrics]);


  const hasPercent = metrics.includes("cvr");
  const hasCount = metrics.some((m) => m === "sessions" || m === "conversions");


  const uid = useMemo(() => Math.random().toString(36).slice(2, 9), []);
  const chartRef = useRef<HTMLDivElement | null>(null);


  /* ---------------- Export ---------------- */
  const exportMenuRef = useClickOutside<HTMLDivElement>(() => setExportOpen(false));
  const metricMenuRef = useClickOutside<HTMLDivElement>(() => setMetricMenuOpen(false));


  function exportCSV() {
    const headers: string[] = ["Date"];
    metrics.forEach((m) => {
      headers.push(`Current ${labelFor(m)}`);
      if (compareOn) headers.push(`Previous ${labelFor(m)}`);
    });
    const lines = [headers.join(",")];
    chartData.forEach((row) => {
      const parts: string[] = [row.date];
      metrics.forEach((m) => {
        const cur = row[`cur_${m}`] || 0;
        const prev = row[`prev_${m}`] || 0;
        parts.push(m === "cvr" ? (cur as number).toFixed(4) : String(cur));
        if (compareOn) parts.push(m === "cvr" ? (prev as number).toFixed(4) : String(prev));
      });
      lines.push(parts.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversion-trends-${startISO}_to_${endISO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }


  async function exportPNG() {
    const root = chartRef.current;
    if (!root) return exportCSV();
    const svg = root.querySelector("svg");
    if (!svg) return exportCSV();


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
    const height = Math.max(340, Math.ceil(bbox.height));


    const canvas = document.createElement("canvas");
    const scale = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return exportCSV();
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);


    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `conversion-trends-${startISO}_to_${endISO}.png`;
    a.click();
    setExportOpen(false);
  }


  function toggleMetric(m: MetricKey) {
    setMetrics((prev) => {
      if (prev.includes(m)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== m);
      }
      return [...prev, m];
    });
  }
  function labelFor(m: MetricKey) {
    return METRIC_OPTS.find((x) => x.key === m)?.label ?? m;
  }


  /* ---------------- Tooltip ---------------- */
  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const row = (payload[0] && payload[0].payload) || {};
    return (
      <div
        className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md"
        style={{ borderColor: TK.border, maxWidth: 320, fontFamily: FONT_STACK }}
      >
        <div className="mb-1 font-medium" style={{ color: TK.text }}>
          {niceDate(String(label))}
        </div>
        <div className="space-y-1.5">
          {metrics.map((m) => {
            const base = METRIC_COLORS[m];
            const pastel = mixWithWhite(base, 0.65);
            const cur = Number(row[`cur_${m}`] || 0);
            const prev = Number(row[`prev_${m}`] || 0);
            const delta = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
            const isPct = m === "cvr";
            return (
              <div key={m} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2">
                <span className="inline-flex items-center gap-1">
                  <MetricIcon m={m} />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: base }}
                  />
                </span>
                <span className="text-slate-600">{labelFor(m)}</span>
                <span className="font-medium text-slate-900">
                  {isPct ? fmtPct(cur) : fmtNum(cur)}
                </span>


                {compareOn && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <HatchDot color={base} />
                    </span>
                    <span className="text-slate-500">Prev</span>
                    <span className="text-slate-700">
                      {isPct ? fmtPct(prev) : fmtNum(prev)}{" "}
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
  const METRIC_OPTS_LIST = METRIC_OPTS;
  const RANGE_OPTS_LIST = RANGE_OPTS;
  const noRows = !chartData.length;


  return (
    <section
      className={cx(
        "w-full rounded-xl border bg-white p-4 md:p-6 shadow-sm mt-4",
        className
      )}
      style={{ borderColor: TK.border, fontFamily: FONT_STACK }}
      aria-label="Conversion Trends Over Time"
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: TK.brand }} />
          <h2 className="text-base md:text-lg font-semibold" style={{ color: TK.text }}>
            Conversion Trends Over Time
          </h2>
          <span
            title="Google Analytics 4"
            className="inline-flex items-center rounded-full bg-[#E6F4FB] px-2.5 py-1 text-[11px] font-medium"
            style={{ color: TK.brand, border: `1px solid ${TK.borderLight}` }}
          >
            <Info className="mr-1 h-3.5 w-3.5" style={{ color: TK.brand }} />
            GA4
          </span>
        </div>


        {/* Chart toggle + Export */}
        <div className="flex items-center gap-2">
          {/* Chart type segmented control (Bar default, Area option) */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(["bar", "area"] as ChartType[]).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-md transition capitalize cursor-pointer",
                  chartType === t ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"
                )}
                title={`Show ${t} chart`}
              >
                {t}
              </button>
            ))}
          </div>


          {/* Single Export button (dropdown) */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50 cursor-pointer"
              style={{ borderColor: TK.border, color: TK.text }}
              title="Export"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
            >
              <Download className="h-4 w-4" style={{ color: TK.brand }} />
              Export
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border bg-white text-xs shadow-lg"
                style={{ borderColor: TK.border }}
                role="menu"
              >
                <button
                  onClick={exportCSV}
                  className="block w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer"
                >
                  CSV (series)
                </button>
                <button
                  onClick={exportPNG}
                  className="block w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer"
                >
                  PNG (chart)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Filters / Chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Metric multi-select chip */}
        <div className="relative" ref={metricMenuRef}>
          <button
            onClick={() => setMetricMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer"
            style={{ borderColor: TK.border }}
            title="Select metrics"
          >
            <span className="font-medium text-slate-600">Metric</span>
            <span className="flex items-center gap-1">
              {metrics.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] ring-1 ring-slate-200"
                  style={{ backgroundColor: withAlpha(METRIC_COLORS[m], 0.08) }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: METRIC_COLORS[m] }}
                  />
                  {labelFor(m)}
                </span>
              ))}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </button>
          {metricMenuOpen && (
            <div
              className="absolute z-10 mt-1 w-56 rounded-md border bg-white p-2 text-xs shadow-md"
              style={{ borderColor: TK.border }}
            >
              {METRIC_OPTS_LIST.map(({ key, label }) => {
                const selected = metrics.includes(key);
                const onlyOneLeft = selected && metrics.length === 1;
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer select-none items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: METRIC_COLORS[key] }}
                      />
                      {label}
                    </span>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={onlyOneLeft}
                      onChange={() => toggleMetric(key)}
                      className="h-4 w-4 accent-slate-900 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>


        {/* Source selector (chips) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Source</span>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {availableSources.slice(0, 6).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-md transition cursor-pointer",
                  source === s ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"
                )}
                title={`Filter: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>


        {/* Range selector (chips) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Time</span>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {RANGE_OPTS_LIST.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-md transition cursor-pointer",
                  range === r ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"
                )}
                title={`${r} days`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>


        {/* Comparison toggle (modular switch) */}
        <ToggleSwitch
          checked={compareOn}
          onChange={setCompareOn}
          label="Compare previous period"
        />


        {/* Range summary chip */}
        <Chip title="Selected date range">
          Range:&nbsp;<strong>{niceDate(startISO)}</strong>&nbsp;→&nbsp;<strong>{niceDate(endISO)}</strong>
        </Chip>
      </div>


      {/* Branded Legend */}
      <BrandLegend metrics={metrics} compareOn={compareOn} />


      {/* =========================== Chart =========================== */}
      <div className="mt-2 h-[340px] w-full" ref={chartRef}>
        {noRows ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No data for the selected filters.
          </div>
        ) : chartType === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <defs>
                {(["conversions", "sessions", "cvr"] as MetricKey[]).map((m) => {
                  const color = METRIC_COLORS[m];
                  const pastel = mixWithWhite(color, 0.65);
                  return (
                    <React.Fragment key={m}>
                      <linearGradient id={`g-${uid}-${m}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id={`gp-${uid}-${m}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={pastel} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={pastel} stopOpacity={0.04} />
                      </linearGradient>
                    </React.Fragment>
                  );
                })}
              </defs>


              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={niceDate}
                tick={{ fontSize: 12, fill: "#475569" }}
                stroke="#cbd5e1"
              />
              {hasCount && (
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtNum(Number(v))}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  stroke="#cbd5e1"
                />
              )}
              {hasPercent && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtPct(Number(v))}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  stroke="#cbd5e1"
                />
              )}
              <Tooltip content={<CustomTooltip />} />


              {/* Previous (thicker than before, pastel) */}
              {compareOn &&
                metrics.map((m) => {
                  const color = METRIC_COLORS[m];
                  const pastel = mixWithWhite(color, 0.65);
                  return (
                    <Area
                      key={`prev-${m}`}
                      type="monotone"
                      yAxisId={m === "cvr" ? "right" : "left"}
                      dataKey={`prev_${m}`}
                      name={`Previous — ${labelFor(m)}`}
                      stroke={pastel}
                      strokeDasharray="3 7"
                      strokeWidth={2.0} // thicker lines per refinement
                      fill={`url(#gp-${uid}-${m})`}
                      fillOpacity={0.35}
                      dot={false}
                      activeDot={false}
                    />
                  );
                })}


              {/* Current series (thicker stroke) */}
              {metrics.map((m) => {
                const color = METRIC_COLORS[m];
                return (
                  <Area
                    key={`cur-${m}`}
                    type="monotone"
                    yAxisId={m === "cvr" ? "right" : "left"}
                    dataKey={`cur_${m}`}
                    name={`Current — ${labelFor(m)}`}
                    stroke={color}
                    strokeWidth={2.6} // thicker lines per refinement
                    fill={`url(#g-${uid}-${m})`}
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
                {(["conversions", "sessions", "cvr"] as MetricKey[]).map((m) => {
                  const color = METRIC_COLORS[m];
                  return (
                    <pattern
                      key={`pat-${m}`}
                      id={`pat-${uid}-${m}`}
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                    >
                      <path d="M0,0 L6,6" stroke={color} strokeWidth={0.8} opacity={0.6} />
                      <path d="M6,0 L0,6" stroke={color} strokeWidth={0.8} opacity={0.6} />
                      <circle cx="3" cy="3" r="0.6" fill={color} opacity={0.5} />
                    </pattern>
                  );
                })}
              </defs>


              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={niceDate}
                tick={{ fontSize: 12, fill: "#475569" }}
                stroke="#cbd5e1"
              />
              {hasCount && (
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtNum(Number(v))}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  stroke="#cbd5e1"
                />
              )}
              {hasPercent && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtPct(Number(v))}
                  tick={{ fontSize: 12, fill: "#475569" }}
                  stroke="#cbd5e1"
                />
              )}
              <Tooltip content={<CustomTooltip />} />


              {/* Previous bars */}
              {compareOn &&
                metrics.map((m) => (
                  <Bar
                    key={`prev-${m}`}
                    yAxisId={m === "cvr" ? "right" : "left"}
                    dataKey={`prev_${m}`}
                    name={`Previous — ${labelFor(m)}`}
                    fill={`url(#pat-${uid}-${m})`}
                    stroke={METRIC_COLORS[m]}
                    strokeOpacity={0.7}
                    radius={[4, 4, 0, 0]}
                  />
                ))}


              {/* Current bars */}
              {metrics.map((m) => (
                <Bar
                  key={`cur-${m}`}
                  yAxisId={m === "cvr" ? "right" : "left"}
                  dataKey={`cur_${m}`}
                  name={`Current — ${labelFor(m)}`}
                  fill={METRIC_COLORS[m]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>


      {/* Insight / Totals */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] leading-5 text-slate-500">
          <span className="font-medium">Tip:</span> Use the Metric chip to overlay Conversions, Sessions,
          and Conv. Rate. Previous period uses pastel (Area) or hatch (Bar).
        </div>
        <div
          className={cx(
            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs",
            compareOn
              ? totals.deltaPct >= 0
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-rose-200 bg-rose-50 text-rose-900"
              : "border border-slate-200 bg-slate-50 text-slate-700"
          )}
        >
          {compareOn && (
            <TrendingUp
              className="h-3.5 w-3.5"
              style={{ color: totals.deltaPct >= 0 ? "#059669" : "#E11D48", transform: totals.deltaPct >= 0 ? "none" : "rotate(180deg)" }}
            />
          )}
          <span>
            Total ({labelFor(totals.metric)}):{" "}
            <strong className="text-slate-900">
              {totals.metric === "cvr" ? fmtPct(totals.currSum) : fmtNum(totals.currSum)}
            </strong>
            {compareOn && (
              <>
                &nbsp;({totals.deltaPct >= 0 ? "+" : "-"}
                {Math.abs(totals.deltaPct).toFixed(1)}% vs prev)
              </>
            )}
          </span>
        </div>
      </div>


      {/* Optional insight text */}
      {typeof insightText === "string" && insightText.trim() !== "" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {insightText}
        </div>
      )}
    </section>
  );
}
