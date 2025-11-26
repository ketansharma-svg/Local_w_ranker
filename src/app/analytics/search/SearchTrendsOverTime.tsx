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
  Percent as PercentIcon,
  Target,
  MousePointerClick,
  Eye,
} from "lucide-react";

/* ============================================================================
 * TYPES (aligned to your section)
 * ============================================================================ */
type TrendMetric = "clicks" | "impressions" | "ctr" | "position";
type ChartType = "bar" | "area";
type DeviceKey = "all" | "desktop" | "mobile" | "tablet";

export type TrendPoint = {
  date: string; // ISO yyyy-mm-dd
  clicks?: number;
  impressions?: number;
  ctr?: number | null; // 0..1 as fraction
  position?: number | null;
};

export type SearchTrendsProps = {
  /** Provide current period daily rows (grouped by date) with at least clicks & impressions. */
  current?: TrendPoint[];
  /** Optional previous period daily rows. If omitted, a baseline is estimated (visual use only). */
  previous?: TrendPoint[];
  /** Initial control state */
  defaultMetrics?: TrendMetric[]; // multi-select initial
  defaultRange?: "7d" | "30d" | "90d";
  defaultDevice?: DeviceKey;
  defaultCountry?: "all" | string; // ISO code (e.g., "US")
  defaultCompareOn?: boolean;
  defaultChart?: ChartType; // default: "bar"
  /** If latest feed day is partial, we exclude it automatically from end */
  latestDayPartial?: boolean;
  /** Countries to show as quick chips (ISO). If empty, only "All" chip shows. */
  availableCountries?: string[];
  /** Optional banner */
  insightText?: string;
  /** Loading / error states */
  loading?: boolean;
  error?: string | null;
  /** Class passthrough */
  className?: string;
  /** Optional telemetry */
  onEvent?: (
    name:
      | "trends_metric_change"
      | "trends_compare_toggle"
      | "trends_export"
      | "trends_point_hover",
    payload: Record<string, unknown>
  ) => void;
};

/* ============================================================================
 * DESIGN TOKENS / FONTS
 * ============================================================================ */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  slate600: "#475569",
  slate900: "#0f172a",
  grid: "#e2e8f0",
  axis: "#cbd5e1",
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ============================================================================
 * UTILS
 * ============================================================================ */
const cx = (...p: (string | false | null | undefined)[]) =>
  p.filter(Boolean).join(" ");

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
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
const isISO = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const fmtNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${Math.round(n)}`;
const fmtPct = (n: number) => `${(isFinite(n) ? n : 0).toFixed(2)}%`;
const fmtRank = (n: number) => (isFinite(n) ? n.toFixed(1) : "—");
const niceDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parseISO(iso));

/* Color helpers */
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

/* ============================================================================
 * METRICS / COLORS / ICONS
 * ============================================================================ */
const METRIC_LABEL: Record<TrendMetric, string> = {
  clicks: "Clicks",
  impressions: "Impressions",
  ctr: "CTR (%)",
  position: "Avg. Position",
};

const METRIC_COLOR: Record<TrendMetric, string> = {
  clicks: "#0077FF",
  impressions: "#0d9488", // teal600
  ctr: "#7c3aed", // purple600
  position: "#d97706", // amber600
};

function MetricIcon({ m }: { m: TrendMetric }) {
  const props = { className: "h-3.5 w-3.5", style: { color: TK.brand } as React.CSSProperties };
  if (m === "clicks") return <MousePointerClick {...props} />;
  if (m === "impressions") return <Eye {...props} />;
  if (m === "ctr") return <PercentIcon {...props} />;
  return <Target {...props} />;
}

/* ============================================================================
 * MOCK DATA (deterministic, used when props not supplied)
 * ============================================================================ */
function prand(seed: number) {
  return () => {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return Math.abs(seed % 1000) / 1000;
  };
}

/** Generate 90-day GSC-like series with seasonality. */
function buildMock(days = 90) {
  const end = addDays(new Date(), -1);
  const start = addDays(end, -days + 1);
  const rnd = prand(42);
  const cur: TrendPoint[] = [];
  for (let i = 0; i < days; i++) {
    const iso = toISO(addDays(start, i));
    const season = 1 + 0.25 * Math.sin((i / days) * Math.PI * 2);
    const impressions = Math.max(300, Math.round(1400 * season * (0.8 + 0.4 * rnd())));
    const ctr = clamp01(0.035 + 0.02 * Math.sin(i / 7) + (rnd() - 0.5) * 0.02);
    const clicks = Math.round(impressions * ctr);
    const position = Math.max(1, 13 - (i / days) * 4 + Math.cos(i / 6) * 0.4 + (rnd() - 0.5) * 0.6);
    cur.push({ date: iso, clicks, impressions, ctr, position });
  }
  // previous window: simple slightly lower baseline
  const prev: TrendPoint[] = cur.map((d, idx) => {
    return {
      date: toISO(addDays(parseISO(d.date), -days)),
      clicks: Math.round((d.clicks || 0) * 0.92),
      impressions: Math.round((d.impressions || 0) * 0.9),
      ctr: d.ctr == null ? null : clamp01(d.ctr * (0.98 - 0.02 * Math.sin(idx))),
      position: d.position == null ? null : Math.max(1, (d.position || 0) * (1.05 + 0.03 * Math.cos(idx))),
    };
  });
  return { current: cur, previous: prev };
}

/* ============================================================================
 * DATA PREP (materialize windows, align prev)
 * ============================================================================ */
function materializeWindow(opts: {
  startISO: string;
  endISO: string;
  rows?: TrendPoint[];
}) {
  const map = new Map<
    string,
    { clicks: number; impressions: number; ctr: number | null; position: number | null }
  >();
  (opts.rows || []).forEach((r) => {
    if (!r?.date || !isISO(r.date)) return;
    const clicks = Number(r.clicks || 0);
    const impressions = Number(r.impressions || 0);
    const ctr = typeof r.ctr === "number" ? clamp01(r.ctr) : impressions > 0 ? clicks / impressions : null;
    let position =
      typeof r.position === "number" && isFinite(r.position) && r.position >= 1 ? r.position : null;
    map.set(r.date, { clicks, impressions, ctr, position });
  });

  const out: { date: string; clicks: number; impressions: number; ctr: number | null; position: number | null }[] =
    [];
  for (let d = new Date(parseISO(opts.startISO)); d <= parseISO(opts.endISO); d = addDays(d, 1)) {
    const iso = toISO(d);
    const v = map.get(iso);
    out.push({
      date: iso,
      clicks: v ? v.clicks : 0,
      impressions: v ? v.impressions : 0,
      ctr: v ? v.ctr : null,
      position: v ? v.position : null,
    });
  }
  return out;
}

function estimatePrevious(current: ReturnType<typeof materializeWindow>) {
  return current.map((d, idx) => ({
    date: toISO(addDays(parseISO(d.date), -current.length)),
    clicks: Math.max(0, d.clicks * (0.88 + 0.06 * Math.sin(idx))),
    impressions: Math.max(0, d.impressions * (0.86 + 0.06 * Math.cos(idx))),
    ctr: d.ctr == null ? null : clamp01(d.ctr * (0.98 - 0.02 * Math.sin(idx))),
    position: d.position == null ? null : Math.max(1, d.position * (1.05 + 0.03 * Math.cos(idx))),
  }));
}

function buildChartRows(
  current: ReturnType<typeof materializeWindow>,
  previous: ReturnType<typeof materializeWindow> | ReturnType<typeof estimatePrevious>
) {
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < current.length; i++) {
    const c = current[i];
    const p = previous[i] || {};
    rows.push({
      date: c.date,
      cur_clicks: c.clicks,
      cur_impressions: c.impressions,
      cur_ctr: c.ctr == null ? null : c.ctr * 100, // store CTR as %
      cur_position: c.position,
      prev_clicks: p.clicks ?? 0,
      prev_impressions: p.impressions ?? 0,
      prev_ctr: p.ctr == null ? null : p.ctr * 100,
      prev_position: typeof p.position === "number" ? p.position : null,
    });
  }
  return rows;
}

/* ============================================================================
 * MICRO UI — Chip / Toggle (modular, pointer cursor)
 * ============================================================================ */
function Chip({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: TK.borderLight, color: TK.text }}
      title={title}
    >
      {children}
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

/* ============================================================================
 * LEGEND — Branded icons + color dots / hatch for previous
 * ============================================================================ */
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

function BrandLegend({
  metrics,
  compareOn,
}: {
  metrics: TrendMetric[];
  compareOn: boolean;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs" style={{ color: TK.slate600 }}>
      {metrics.map((m) => (
        <div key={m} className="inline-flex items-center gap-2">
          <MetricIcon m={m} />
          <SolidDot color={METRIC_COLOR[m]} />
          <span className="font-medium">
            Current — {METRIC_LABEL[m].split(" (")[0]}
          </span>
          {compareOn && (
            <>
              <span className="inline-block h-px w-3 bg-slate-300 mx-1" />
              <HatchDot color={METRIC_COLOR[m]} />
              <span>Previous</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 * CLICK OUTSIDE HOOK
 * ============================================================================ */
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

/* ============================================================================
 * COMPONENT
 * ============================================================================ */
const METRIC_OPTS: { key: TrendMetric; label: string }[] = [
  { key: "clicks", label: METRIC_LABEL.clicks },
  { key: "impressions", label: METRIC_LABEL.impressions },
  { key: "ctr", label: METRIC_LABEL.ctr },
  { key: "position", label: METRIC_LABEL.position },
];
const RANGE_OPTS = ["7d", "30d", "90d"] as const;
const DEV_OPTS: DeviceKey[] = ["all", "desktop", "mobile", "tablet"];

export default function SearchTrendsOverTime({
  current: currentProp,
  previous: previousProp,
  defaultMetrics = ["clicks"],
  defaultRange = "30d",
  defaultDevice = "all",
  defaultCountry = "all",
  defaultCompareOn = false,
  defaultChart = "bar",
  latestDayPartial = false,
  availableCountries = [],
  insightText,
  loading,
  error,
  className,
  onEvent,
}: SearchTrendsProps) {
  /* Safe data with mock fallback */
  const MOCK = useMemo(() => buildMock(90), []);
  const usingMock = !(currentProp && currentProp.length);
  const currentData: TrendPoint[] = usingMock ? MOCK.current : (currentProp as TrendPoint[]);
  const previousData: TrendPoint[] = previousProp && previousProp.length ? previousProp : MOCK.previous;

  /* State */
  const [metrics, setMetrics] = useState<TrendMetric[]>(
    Array.isArray(defaultMetrics) && defaultMetrics.length ? defaultMetrics : ["clicks"]
  );
  const [range, setRange] = useState<"7d" | "30d" | "90d">(defaultRange);
  const [device, setDevice] = useState<DeviceKey>(defaultDevice);
  const [country, setCountry] = useState<string>(defaultCountry);
  const [chartType, setChartType] = useState<ChartType>(defaultChart || "bar");
  const [compareOn, setCompareOn] = useState<boolean>(defaultCompareOn);

  const [metricMenuOpen, setMetricMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  /* Date window */
  const endISOAll = useMemo(() => {
    const dates = (currentData || []).map((r) => r.date).filter(isISO) as string[];
    if (!dates.length) return toISO(addDays(new Date(), -1));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    return latestDayPartial ? toISO(addDays(parseISO(max), -1)) : max;
  }, [currentData, latestDayPartial]);

  const startISOAll = useMemo(() => {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    return toISO(addDays(parseISO(endISOAll), -(days - 1)));
  }, [range, endISOAll]);

  const startISO = startISOAll;
  const endISO = endISOAll;

  /* Materialize series */
  const seriesCurrent = useMemo(
    () => materializeWindow({ startISO, endISO, rows: currentData }),
    [currentData, startISO, endISO]
  );

  const seriesPrevWindow = useMemo(() => {
    const prevEnd = toISO(addDays(parseISO(startISO), -1));
    const days =
      Math.max(
        1,
        Math.round((Number(parseISO(endISO)) - Number(parseISO(startISO))) / 86400000) + 1
      ) || 30;
    const prevStart = toISO(addDays(parseISO(prevEnd), -(days - 1)));
    return previousData && previousData.length
      ? materializeWindow({ startISO: prevStart, endISO: prevEnd, rows: previousData })
      : estimatePrevious(seriesCurrent);
  }, [previousData, seriesCurrent, startISO, endISO]);

  const chartData = useMemo(
    () => buildChartRows(seriesCurrent, seriesPrevWindow),
    [seriesCurrent, seriesPrevWindow]
  );

  const noRows = chartData.length === 0;

  /* Totals for the first selected metric */
  const driveMetric = metrics[0] || "clicks";
  const totals = useMemo(() => {
    let cur = 0;
    let prev = 0;
    const keyCur = `cur_${driveMetric}`;
    const keyPrev = `prev_${driveMetric}`;
    chartData.forEach((r) => {
      const a = r[keyCur];
      const b = r[keyPrev];
      if (driveMetric === "ctr" || driveMetric === "position") {
        if (typeof a === "number") cur += a;
        if (typeof b === "number") prev += b;
      } else {
        cur += Number(a || 0);
        prev += Number(b || 0);
      }
    });
    const deltaPct = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
    return { cur, prev, deltaPct };
  }, [chartData, driveMetric]);

  /* Axes */
  const hasPercent = metrics.includes("ctr");
  const hasCount = metrics.some((m) => m === "clicks" || m === "impressions" || m === "position");

  /* Dropdown outside click */
  const exportMenuRef = useClickOutside<HTMLDivElement>(() => setExportOpen(false));
  const metricMenuRef = useClickOutside<HTMLDivElement>(() => setMetricMenuOpen(false));

  /* Export */
  function exportCSV() {
    const headers: string[] = ["Date"];
    metrics.forEach((m) => {
      headers.push(`Current ${METRIC_LABEL[m]}`);
      if (compareOn) headers.push(`Previous ${METRIC_LABEL[m]}`);
    });
    const lines = [headers.join(",")];
    chartData.forEach((row) => {
      const parts: string[] = [row.date];
      metrics.forEach((m) => {
        const cur = row[`cur_${m}`];
        const prev = row[`prev_${m}`];
        if (m === "ctr") {
          parts.push(cur == null ? "" : (cur as number).toFixed(4));
          if (compareOn) parts.push(prev == null ? "" : (prev as number).toFixed(4));
        } else if (m === "position") {
          parts.push(cur == null ? "" : (cur as number).toFixed(2));
          if (compareOn) parts.push(prev == null ? "" : (prev as number).toFixed(2));
        } else {
          parts.push(String(cur ?? 0));
          if (compareOn) parts.push(String(prev ?? 0));
        }
      });
      lines.push(parts.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `search-trends-${startISO}_to_${endISO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    onEvent?.("trends_export", { format: "csv", metric: metrics.join(","), range, compare: compareOn });
  }

  async function exportPNG() {
    try {
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
      a.download = `search-trends-${startISO}_to_${endISO}.png`;
      a.click();
      setExportOpen(false);
      onEvent?.("trends_export", { format: "png", metric: metrics.join(","), range, compare: compareOn });
    } catch {
      exportCSV();
    }
  }

  /* Metric toggle */
  function toggleMetric(m: TrendMetric) {
    setMetrics((prev) => {
      let next: TrendMetric[];
      if (prev.includes(m)) {
        if (prev.length === 1) return prev; // keep at least one
        next = prev.filter((x) => x !== m);
      } else {
        next = [...prev, m];
      }
      onEvent?.("trends_metric_change", { metric: next.join(","), range, device, country });
      return next;
    });
  }
  function labelFor(m: TrendMetric) {
    return METRIC_OPTS.find((x) => x.key === m)?.label ?? m;
  }

  /* Tooltip (matches reference pattern; no emoji) */
  const chartRef = useRef<HTMLDivElement | null>(null);
  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const row = (payload[0] && payload[0].payload) || {};
    return (
      <div
        className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md mt-4"
        style={{ borderColor: TK.border, maxWidth: 340, fontFamily: FONT_STACK }}
      >
        <div className="mb-1 font-medium" style={{ color: TK.text }}>
          {niceDate(String(label))}
        </div>
        <div className="space-y-1.5">
          {metrics.map((m) => {
            const color = METRIC_COLOR[m];
            const cur = row[`cur_${m}`];
            const prev = row[`prev_${m}`];
            const isPct = m === "ctr";
            const isRank = m === "position";
            const fmtVal = (v: any) =>
              v == null ? "—" : isPct ? fmtPct(Number(v)) : isRank ? fmtRank(Number(v)) : fmtNum(Number(v));

            // For delta: % for counts/ctr, absolute for rank
            let deltaText = "";
            if (prev != null && cur != null) {
              if (isRank) {
                const diff = Number(cur) - Number(prev);
                deltaText = `${diff >= 0 ? "+" : "-"}${Math.abs(diff).toFixed(2)}`;
              } else {
                const d = Number(prev) > 0 ? ((Number(cur) - Number(prev)) / Number(prev)) * 100 : 0;
                deltaText = `${d >= 0 ? "+" : "-"}${Math.abs(d).toFixed(1)}%`;
              }
            }

            return (
              <div key={m} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2">
                <span className="inline-flex items-center gap-1">
                  <MetricIcon m={m} />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </span>
                <span className="text-slate-600">{labelFor(m)}</span>
                <span className="font-medium text-slate-900">{fmtVal(cur)}</span>

                {compareOn && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <HatchDot color={color} />
                    </span>
                    <span className="text-slate-500">Prev</span>
                    <span className="text-slate-700">
                      {fmtVal(prev)} {prev != null && cur != null && (
                        <span className="ml-1 font-medium" style={{ color: Number(cur) >= Number(prev) ? "#059669" : "#E11D48" }}>
                          ({deltaText})
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

  return (
    <section
      className={cx("w-full rounded-xl border bg-white p-4 md:p-6 shadow-sm mt-4", className)}
      style={{ borderColor: TK.border, fontFamily: FONT_STACK }}
      aria-label="Search Trends Over Time"
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: TK.brand }} />
          <h2 className="text-base md:text-lg font-semibold" style={{ color: TK.text }}>
            Search Trends Over Time
          </h2>
          <span
            title="Google Search Console"
            className="inline-flex items-center rounded-full bg-[#E6F4FB] px-2.5 py-1 text-[11px] font-medium"
            style={{ color: TK.brand, border: `1px solid ${TK.borderLight}` }}
          >
            <Info className="mr-1 h-3.5 w-3.5" style={{ color: TK.brand }} />
            GSC
          </span>
        </div>

        {/* Chart toggle + Export */}
        <div className="flex items-center gap-2">
          {/* Chart type segmented control (Bar default) */}
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

      {/* Filters / Chips (modular, pointer cursors) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Metric chip (multi-select) */}
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
                  style={{ backgroundColor: withAlpha(METRIC_COLOR[m], 0.08) }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: METRIC_COLOR[m] }}
                  />
                  {METRIC_LABEL[m].split(" (")[0]}
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
              {METRIC_OPTS.map(({ key, label }) => {
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
                        style={{ backgroundColor: METRIC_COLOR[key] }}
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

        {/* Device segmented chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Device</span>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {DEV_OPTS.map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-md transition capitalize cursor-pointer",
                  device === d ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"
                )}
                title={`Device: ${d}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Country segmented chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Country</span>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {["all", ...(availableCountries || []).slice(0, 5)].map((c) => (
              <button
                key={c}
                onClick={() => setCountry(c)}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-md transition uppercase cursor-pointer",
                  country === c ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"
                )}
                title={`Country: ${c}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Range segmented chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Time</span>
          <div className="flex rounded-lg bg-slate-100 p-1">
            {RANGE_OPTS.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cx(
                  "px-2.5 py-1 text-xs rounded-md transition cursor-pointer",
                  range === r ? "bg-white shadow text-slate-900" : "text-slate-600 hover:text-slate-900"
                )}
                title={`${r} range`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Compare previous period (toggle) */}
        <ToggleSwitch
          checked={compareOn}
          onChange={(v) => {
            setCompareOn(v);
            onEvent?.("trends_compare_toggle", { on: v });
          }}
          label="Compare previous period"
        />

        {/* Range summary chip */}
        <Chip title="Selected date range">
          Range:&nbsp;<strong>{niceDate(startISO)}</strong>&nbsp;→&nbsp;<strong>{niceDate(endISO)}</strong>
        </Chip>
      </div>

      {/* Branded Legend */}
      <BrandLegend metrics={metrics} compareOn={compareOn} />

      {/* ============================ CHART ============================ */}
      <div className="mt-2 h-[340px] w-full" ref={chartRef}>
        {loading ? (
          <div className="h-full animate-pulse rounded-md bg-slate-100" />
        ) : error ? (
          <div className="flex h-full items-center justify-center text-sm text-rose-600 border border-rose-200 rounded">
            {error}
          </div>
        ) : noRows ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No data for the selected filters.
          </div>
        ) : chartType === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              {/* Gradients for current + pastel for previous */}
              <defs>
                {(["clicks", "impressions", "ctr", "position"] as TrendMetric[]).map((m) => {
                  const color = METRIC_COLOR[m];
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

              <CartesianGrid strokeDasharray="3 3" stroke={TK.grid} />
              <XAxis
                dataKey="date"
                tickFormatter={niceDate}
                tick={{ fontSize: 12, fill: TK.slate600 }}
                stroke={TK.axis}
              />
              {hasCount && (
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtNum(Number(v))}
                  tick={{ fontSize: 12, fill: TK.slate600 }}
                  stroke={TK.axis}
                />
              )}
              {hasPercent && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtPct(Number(v))}
                  tick={{ fontSize: 12, fill: TK.slate600 }}
                  stroke={TK.axis}
                />
              )}
              <Tooltip content={<CustomTooltip />} />

              {/* Previous (pastel dashed, thicker per pattern) */}
              {compareOn &&
                metrics.map((m) => {
                  const color = METRIC_COLOR[m];
                  const pastel = mixWithWhite(color, 0.65);
                  return (
                    <Area
                      key={`prev-${m}`}
                      type="monotone"
                      yAxisId={m === "ctr" ? "right" : "left"}
                      dataKey={`prev_${m}`}
                      name={`Previous — ${METRIC_LABEL[m]}`}
                      stroke={pastel}
                      strokeWidth={2.0}
                      strokeDasharray="3 7"
                      fill={`url(#gp-${m})`}
                      fillOpacity={0.35}
                      dot={false}
                      activeDot={false}
                    />
                  );
                })}

              {/* Current */}
              {metrics.map((m) => {
                const color = METRIC_COLOR[m];
                return (
                  <Area
                    key={`cur-${m}`}
                    type="monotone"
                    yAxisId={m === "ctr" ? "right" : "left"}
                    dataKey={`cur_${m}`}
                    name={`Current — ${METRIC_LABEL[m]}`}
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
              {/* Hatch patterns for previous bars */}
              <defs>
                {(["clicks", "impressions", "ctr", "position"] as TrendMetric[]).map((m) => {
                  const color = METRIC_COLOR[m];
                  return (
                    <pattern
                      key={`pat-${m}`}
                      id={`pat-${m}`}
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

              <CartesianGrid strokeDasharray="3 3" stroke={TK.grid} />
              <XAxis
                dataKey="date"
                tickFormatter={niceDate}
                tick={{ fontSize: 12, fill: TK.slate600 }}
                stroke={TK.axis}
              />
              {hasCount && (
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => fmtNum(Number(v))}
                  tick={{ fontSize: 12, fill: TK.slate600 }}
                  stroke={TK.axis}
                />
              )}
              {hasPercent && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => fmtPct(Number(v))}
                  tick={{ fontSize: 12, fill: TK.slate600 }}
                  stroke={TK.axis}
                />
              )}
              <Tooltip content={<CustomTooltip />} />

              {/* Previous bars */}
              {compareOn &&
                metrics.map((m) => (
                  <Bar
                    key={`prev-${m}`}
                    yAxisId={m === "ctr" ? "right" : "left"}
                    dataKey={`prev_${m}`}
                    name={`Previous — ${METRIC_LABEL[m]}`}
                    fill={`url(#pat-${m})`}
                    stroke={METRIC_COLOR[m]}
                    strokeOpacity={0.7}
                    radius={[4, 4, 0, 0]}
                  />
                ))}

              {/* Current bars */}
              {metrics.map((m) => (
                <Bar
                  key={`cur-${m}`}
                  yAxisId={m === "ctr" ? "right" : "left"}
                  dataKey={`cur_${m}`}
                  name={`Current — ${METRIC_LABEL[m]}`}
                  fill={METRIC_COLOR[m]}
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
          <span className="font-medium">Tip:</span> Use the Metric chip to overlay Clicks, Impressions,
          CTR, and Position. Previous period uses pastel (Area) or hatch (Bar).
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
              style={{
                color: totals.deltaPct >= 0 ? "#059669" : "#E11D48",
                transform: totals.deltaPct >= 0 ? "none" : "rotate(180deg)",
              }}
            />
          )}
          <span>
            Total ({METRIC_LABEL[driveMetric].split(" (")[0]}):{" "}
            <strong className="text-slate-900">
              {driveMetric === "ctr"
                ? fmtPct(totals.cur)
                : driveMetric === "position"
                ? fmtRank(totals.cur)
                : fmtNum(totals.cur)}
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

      {/* Optional insight banner */}
      {typeof insightText === "string" && insightText.trim() !== "" && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {insightText}
        </div>
      )}
    </section>
  );
}
