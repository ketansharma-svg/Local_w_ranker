"use client";

/* =============================================================================
 *  Section 2 — Traffic Trends (GA4) · Page Detail (Redesigned)
 *  ----------------------------------------------------------------------------
 *  Follows the *same* design pattern as the provided reference section:
 *   - Bar & Area chart modes (segmented switch)
 *   - Compare with previous period (toggle)
 *   - Smart popover tooltip with branded icons + per‑metric deltas
 *   - Modular chips / dropdown chips for Time, Device, Country
 *   - Inter / Inter Fallback fonts, branded #008CCD icons
 *   - Pointer cursor for all interactive elements
 *  Metrics come from this section (GA4): Sessions, Bounce Rate, Avg. Duration,
 *  Users, and Event Count (Sessions is pinned ON).
 * =============================================================================*/

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
  Percent,
  Users,
  BarChart3,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 *  TOKENS / FONTS
 * ---------------------------------------------------------------------------*/
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
} as const;

const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

const cx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

/* -----------------------------------------------------------------------------
 *  TYPES (kept minimal for drop‑in)
 * ---------------------------------------------------------------------------*/
type ChartType = "bar" | "area";
type Device = "all" | "desktop" | "mobile" | "tablet";
type Country = "all" | "US" | "UK" | "IN" | "DE" | "AU";

export type TrafficPoint = {
  /** ISO Date string (YYYY-MM-DD) */
  date: string;
  /** Optional device & country buckets (used when filtering != 'all') */
  device?: Exclude<Device, "all">;
  country?: Exclude<Country, "all">;

  /** GA4 metrics */
  sessions: number;
  bounceRate?: number;             // % (0..100)
  avgSessionDurationSec?: number;  // seconds
  users?: number;
  eventCount?: number;
};

export type TrafficTrendsProps = {
  /** Current period rows (daily granularity, can include device/country buckets) */
  data?: TrafficPoint[];
  /** Previous period rows for comparison (optional). If omitted, a visual estimate is used. */
  previousData?: TrafficPoint[];
  /** Class passthrough */
  className?: string;
};

/* -----------------------------------------------------------------------------
 *  FORMATTERS / DATE UTILS
 * ---------------------------------------------------------------------------*/
const fmt = {
  num: (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : `${Math.round(n)}`,
  pct: (v: number, d = 1) => `${(isFinite(v) ? v : 0).toFixed(d)}%`,
  dur: (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  },
};

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
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parseISO(iso));

/* -----------------------------------------------------------------------------
 *  COLOR HELPERS (for hatches / gradients like the reference)
 * ---------------------------------------------------------------------------*/
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

/* -----------------------------------------------------------------------------
 *  METRICS (labels, colors, icons)
 * ---------------------------------------------------------------------------*/
type MetricKey = "sessions" | "bounceRate" | "avgDuration" | "users" | "eventCount";

/** Sessions is pinned ON; the rest are toggleable */
type Toggles = {
  bounceRate: boolean;
  avgDuration: boolean;
  users: boolean;
  eventCount: boolean;
};

const METRIC_COLORS: Record<MetricKey, string> = {
  sessions: TK.brand,       // main metric (branded)
  bounceRate: "#ef4444",    // red
  avgDuration: "#2563eb",   // blue
  users: "#7c3aed",         // violet
  eventCount: "#10b981",    // emerald
};
const METRIC_LABELS: Record<MetricKey, string> = {
  sessions: "Sessions",
  bounceRate: "Bounce Rate",
  avgDuration: "Avg. Duration",
  users: "Users",
  eventCount: "Event Count",
};
const METRIC_ICON: Record<MetricKey, React.ComponentType<any>> = {
  sessions: BarChart3,
  bounceRate: Percent,
  avgDuration: Timer,
  users: Users,
  eventCount: Activity,
};

/* -----------------------------------------------------------------------------
 *  MOCK DATA (used only if no props.data provided)
 * ---------------------------------------------------------------------------*/
const COUNTRIES: Exclude<Country, "all">[] = ["US", "UK", "IN", "DE", "AU"];
const DEVICES: Exclude<Device, "all">[] = ["desktop", "mobile", "tablet"];

const deviceAdj = {
  desktop: { br: -4, dur: +22, mult: 1.0, u: 0.80, e: 1.20 },
  mobile: { br: +6, dur: -10, mult: 1.12, u: 0.82, e: 1.18 },
  tablet: { br: +2, dur: +6, mult: 0.75, u: 0.84, e: 1.15 },
} as const;
const countryAdj: Record<Exclude<Country, "all">, number> = {
  US: 1.15,
  UK: 1.05,
  IN: 1.10,
  DE: 0.95,
  AU: 0.9,
};

function prand(seed: number) {
  let s = seed;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return Math.abs(s % 1000) / 1000;
  };
}

/** Build 90d of sample traffic across device & country buckets */
function buildSampleTraffic(days = 90): TrafficPoint[] {
  const end = new Date();
  const start = addDays(end, -days + 1);
  const R = prand(42);
  const rows: TrafficPoint[] = [];
  for (let i = 0; i < days; i++) {
    const iso = toISO(addDays(start, i));
    const season = 1 + 0.22 * Math.sin((i / days) * Math.PI * 2);
    for (const country of COUNTRIES) {
      for (const device of DEVICES) {
        const baseSess = 300 + Math.round(380 * R());
        const mult = deviceAdj[device].mult * (countryAdj[country] ?? 1) * season;
        const sessions = Math.max(0, Math.round(baseSess * mult));
        const br = Math.min(95, Math.max(2, 39 + 14 * R() + deviceAdj[device].br));
        const dur = Math.max(25, Math.round(75 + 90 * R() + deviceAdj[device].dur));
        const users = Math.round(sessions * (deviceAdj[device].u + 0.04 * R()));
        const eventCount = Math.round(sessions * (deviceAdj[device].e + 0.5 * R()));
        rows.push({
          date: iso,
          device,
          country,
          sessions,
          bounceRate: br,
          avgSessionDurationSec: dur,
          users,
          eventCount,
        });
      }
    }
  }
  return rows;
}

/* -----------------------------------------------------------------------------
 *  DATA HELPERS
 * ---------------------------------------------------------------------------*/
function aggregateByDate(
  points: TrafficPoint[] | undefined,
  device: Device,
  country: Country
) {
  type Acc = {
    sessions: number;
    brW: number; // weighted bounce numerator
    durW: number; // weighted duration numerator
    users: number;
    eventCount: number;
  };
  const acc = new Map<string, Acc>();
  (points || []).forEach((p) => {
    if (!p) return;
    if (device !== "all" && p.device !== device) return;
    if (country !== "all" && p.country !== country) return;
    const a = acc.get(p.date) || {
      sessions: 0,
      brW: 0,
      durW: 0,
      users: 0,
      eventCount: 0,
    };
    const s = p.sessions || 0;
    a.sessions += s;
    a.brW += (p.bounceRate || 0) * s;
    a.durW += (p.avgSessionDurationSec || 0) * s;
    a.users += p.users || 0;
    a.eventCount += p.eventCount || 0;
    acc.set(p.date, a);
  });
  const out: {
    date: string;
    sessions: number;
    bounceRate: number;
    avgDuration: number;
    users: number;
    eventCount: number;
  }[] = [];

  Array.from(acc.keys())
    .sort()
    .forEach((d) => {
      const a = acc.get(d)!;
      const br =
        a.sessions > 0 ? a.brW / a.sessions : 0;
      const dur =
        a.sessions > 0 ? a.durW / a.sessions : 0;
      out.push({
        date: d,
        sessions: a.sessions,
        bounceRate: br,
        avgDuration: dur,
        users: a.users,
        eventCount: a.eventCount,
      });
    });
  return out;
}

function estimatePrevious(current: Array<{ date: string } & Record<string, number>>) {
  return current.map((r, i) => {
    const f = 0.88 + 0.08 * Math.sin(i * 0.7);
    return {
      date: toISO(addDays(parseISO(r.date), -current.length)),
      sessions: Math.round((r.sessions || 0) * f),
      bounceRate: Math.max(0, (r.bounceRate || 0) * (0.98 + 0.02 * Math.cos(i))),
      avgDuration: Math.max(5, (r.avgDuration || 0) * (0.96 + 0.05 * Math.sin(i))),
      users: Math.round((r.users || 0) * f),
      eventCount: Math.round((r.eventCount || 0) * f),
    };
  });
}


/* -----------------------------------------------------------------------------
 *  MICRO UI — modular chips, dropdowns, toggle, segmented switches, export
 *  (pattern copied to match the reference section)
 * ---------------------------------------------------------------------------*/
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
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "#10B981" }}
        />
      )}
    </button>
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
            value === t
              ? "bg-white shadow text-slate-900"
              : "text-slate-600 hover:text-slate-900"
          )}
          title={`Show ${t} chart`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function ExportDropdown({ onCSV, onPNG }: { onCSV: () => void; onPNG: () => void }) {
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
          <button
            onClick={onCSV}
            className="block w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer"
          >
            CSV (series)
          </button>
          <button
            onClick={onPNG}
            className="block w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer"
          >
            PNG (chart)
          </button>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 *  LEGEND (branded icons + solid / hatch chips)
 * ---------------------------------------------------------------------------*/
function SolidDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 2,
        background: color,
      }}
    />
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

function BrandLegend({
  metrics,
  compareOn,
}: {
  metrics: MetricKey[];
  compareOn: boolean;
}) {
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-4 text-xs"
      style={{ color: "#475569" }}
    >
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

/* -----------------------------------------------------------------------------
 *  EXPORT HELPERS
 * ---------------------------------------------------------------------------*/
function exportSeriesCSV(
  rows: any[],
  metrics: MetricKey[],
  compareOn: boolean,
  startISO: string,
  endISO: string
) {
  const headers: string[] = ["Date"];
  metrics.forEach((m) => {
    headers.push(`Current ${METRIC_LABELS[m]}`);
    if (compareOn) headers.push(`Previous ${METRIC_LABELS[m]}`);
  });
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const parts: string[] = [row.date];
    metrics.forEach((m) => {
      parts.push(String(row[`cur_${m}`] ?? 0));
      if (compareOn) parts.push(String(row[`prev_${m}`] ?? 0));
    });
    lines.push(parts.join(","));
  });
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `traffic-trends-${startISO}_to_${endISO}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportChartPNG(root: HTMLDivElement | null, name: string) {
  if (!root) return;
  const svg = root.querySelector("svg");
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
  const bbox = root.getBoundingClientRect();
  const width = Math.max(820, Math.ceil(bbox.width));
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

/* -----------------------------------------------------------------------------
 *  MAIN — Traffic Trends (GA4)
 * ---------------------------------------------------------------------------*/
const RANGE_OPTS = [7, 14, 30, 60, 90] as const;

export default function TrafficTrendsGA4({
  data,
  previousData,
  className,
}: TrafficTrendsProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Controls — match reference pattern
  const [range, setRange] = React.useState<(typeof RANGE_OPTS)[number]>(30);
  const [device, setDevice] = React.useState<Device>("all");
  const [country, setCountry] = React.useState<Country>("all");
  const [comparePrev, setComparePrev] = React.useState<boolean>(true);
  const [chartType, setChartType] = React.useState<ChartType>("bar");
  const [show, setShow] = React.useState<Toggles>({
    bounceRate: true,
    avgDuration: true,
    users: true,
    eventCount: true,
  });

  // Data windows (aggregate to one row per day after device/country filters)
  const base = React.useMemo(
    () => (Array.isArray(data) && data.length ? data : buildSampleTraffic(90)),
    [data]
  );
  const prevBase = React.useMemo(
    () => (Array.isArray(previousData) ? previousData! : undefined),
    [previousData]
  );

  const endISO = React.useMemo(() => {
    const dates = base.map((d) => d.date).filter(Boolean);
    return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : toISO(new Date());
  }, [base]);
  const startISO = React.useMemo(
    () => toISO(addDays(parseISO(endISO), -(range - 1))),
    [endISO, range]
  );

  const currentAgg = React.useMemo(
    () =>
      aggregateByDate(
        base.filter((r) => r.date >= startISO && r.date <= endISO),
        device,
        country
      ),
    [base, startISO, endISO, device, country]
  );
  const previousAgg = React.useMemo(() => {
    if (prevBase && prevBase.length) {
      const prevEnd = toISO(addDays(parseISO(startISO), -1));
      const prevStart = toISO(addDays(parseISO(prevEnd), -(range - 1)));
      return aggregateByDate(
        prevBase.filter((r) => r.date >= prevStart && r.date <= prevEnd),
        device,
        country
      );
    }
    return estimatePrevious(currentAgg as unknown as ({ date: string } & Record<string, number>)[]);

  }, [prevBase, currentAgg, startISO, range, device, country]);

  // Merge into chart rows aligned by current dates
  const chartData = React.useMemo(() => {
    const byPrev = new Map(previousAgg.map((r) => [r.date, r]));
    return currentAgg.map((r) => {
      const p = byPrev.get(toISO(addDays(parseISO(r.date), -range))) || byPrev.get(r.date) || ({} as any);
      return {
        date: r.date,
        cur_sessions: r.sessions,
        cur_bounceRate: r.bounceRate,
        cur_avgDuration: r.avgDuration,
        cur_users: r.users,
        cur_eventCount: r.eventCount,
        prev_sessions: p.sessions ?? 0,
        prev_bounceRate: p.bounceRate ?? 0,
        prev_avgDuration: p.avgDuration ?? 0,
        prev_users: p.users ?? 0,
        prev_eventCount: p.eventCount ?? 0,
      };
    });
  }, [currentAgg, previousAgg, range]);

  const selectedOverlays = React.useMemo(
    () =>
      (Object.keys(show) as (keyof Toggles)[]).filter((k) => (show as any)[k]) as (keyof Toggles)[],
    [show]
  );

  const visibleMetrics: MetricKey[] = React.useMemo(
    () => ["sessions", ...selectedOverlays] as MetricKey[],
    [selectedOverlays]
  );
  const hasPercent = visibleMetrics.includes("bounceRate");
  const hasOthers = visibleMetrics.some((m) => m !== "bounceRate");

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

  /* ---------------------------------------------------------------------------
   * Smart Popover (tooltip) — reference pattern with branded icons
   * -------------------------------------------------------------------------*/
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const row = (payload[0] && payload[0].payload) || {};
    return (
      <div
        className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md"
        style={{ borderColor: TK.border, maxWidth: 380, fontFamily: FONT_STACK, color: TK.text }}
      >
        <div className="mb-1 font-medium">{niceDate(String(label))}</div>
        <div className="space-y-1.5">
          {visibleMetrics.map((m) => {
            const color = METRIC_COLORS[m];
            const Icon = METRIC_ICON[m];
            const cur = Number(row[`cur_${m}`] || 0);
            const prev = Number(row[`prev_${m}`] || 0);
            const isPct = m === "bounceRate";
            const isDur = m === "avgDuration";
            const fmtVal = (v: number) =>
              isPct ? fmt.pct(v, 1) : isDur ? fmt.dur(v) : fmt.num(v);
            const deltaPct =
              prev > 0 && !isDur
                ? ((cur - prev) / prev) * 100
                : undefined;
            const deltaDur = isDur && prev > 0 ? cur - prev : undefined;

            return (
              <div key={m} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2">
                <span className="inline-flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </span>
                <span className="text-slate-600">{METRIC_LABELS[m]}</span>
                <span className="font-medium text-slate-900">{fmtVal(cur)}</span>

                {comparePrev && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <HatchDot color={color} />
                    </span>
                    <span className="text-slate-500">Prev</span>
                    <span className="text-slate-700">
                      {fmtVal(prev)}
                      {prev > 0 && (
                        <span
                          className={cx(
                            "ml-1 font-medium",
                            (isDur ? (deltaDur || 0) : (deltaPct || 0)) >= 0
                              ? "text-emerald-600"
                              : "text-rose-600"
                          )}
                        >
                          (
                          {isDur
                            ? `${deltaDur! >= 0 ? "+" : "-"}${fmt.dur(
                                Math.abs(deltaDur!)
                              )}`
                            : `${deltaPct! >= 0 ? "+" : "-"}${Math.abs(
                                deltaPct!
                              ).toFixed(1)}%`}
                          )
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

  /* ---------------------------------------------------------------------------
   * Render
   * -------------------------------------------------------------------------*/
  return (
    <section
      className={cx(
        "w-full rounded-xl border bg-white p-4 md:p-6 shadow-sm mt-4",
        className
      )}
      style={{ borderColor: TK.border, fontFamily: FONT_STACK }}
      aria-label="Traffic Trends (GA4)"
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" style={{ color: TK.brand }} />
          <h2 className="text-base md:text-lg font-semibold" style={{ color: TK.text }}>
            Traffic Trends (GA4)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <ChartTypeSwitch value={chartType} onChange={setChartType} />
          <ToggleSwitch
            checked={comparePrev}
            onChange={setComparePrev}
            label="Compare previous period"
          />
          <ExportDropdown
            onCSV={() =>
              exportSeriesCSV(
                chartData,
                visibleMetrics,
                comparePrev,
                startISO,
                endISO
              )
            }
            onPNG={() =>
              exportChartPNG(
                rootRef.current,
                `traffic-trends-${startISO}_to_${endISO}.png`
              )
            }
          />
        </div>
      </div>

      {/* Controls / Chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Time */}
        <DropdownChip
          icon={<CalendarDays className="h-4 w-4" color={TK.brand} />}
          label="Time"
          valueLabel={`${range}d`}
        >
          {RANGE_OPTS.map((n) => (
            <MenuItem key={n} active={range === n} onClick={() => setRange(n)}>
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
          <MenuItem
            active={device === "all"}
            onClick={() => setDevice("all")}
            icon={<Monitor className="h-4 w-4" />}
          >
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

        {/* Country */}
        <DropdownChip
          icon={<Globe2 className="h-4 w-4" color={TK.brand} />}
          label="Country"
          valueLabel={country}
        >
          {(["all", ...COUNTRIES] as Country[]).map((c) => (
            <MenuItem key={c} active={country === c} onClick={() => setCountry(c)}>
              {c}
            </MenuItem>
          ))}
        </DropdownChip>

        {/* Metric chips (Sessions pinned; others toggle) */}
        {(
          [
            ["bounceRate", "Bounce Rate"] as const,
            ["avgDuration", "Avg. Duration"] as const,
            ["users", "Users"] as const,
            ["eventCount", "Event Count"] as const,
          ] as const
        ).map(([key, label]) => {
          const active = (show as any)[key] as boolean;
          const Icon = METRIC_ICON[key as MetricKey];
          return (
            <Chip
              key={key}
              active={active}
              onClick={() => setShow((s) => ({ ...s, [key]: !active }))}
              title={`Toggle ${label}`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: METRIC_COLORS[key as MetricKey] }}
              />
              <Icon className="h-4 w-4" color={TK.brand} aria-hidden />
              <span
                className={active ? "font-medium" : ""}
                style={{
                  color: active ? METRIC_COLORS[key as MetricKey] : TK.text,
                }}
              >
                {label}
              </span>
            </Chip>
          );
        })}

        {/* Range summary */}
        <span
          className="ml-1 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
          style={{ borderColor: TK.borderLight, color: TK.text }}
          title="Selected date range"
        >
          Range:&nbsp;<strong>{niceDate(startISO)}</strong>&nbsp;→&nbsp;
          <strong>{niceDate(endISO)}</strong>
        </span>
      </div>

      {/* Legend (branded pattern) */}
      <BrandLegend metrics={visibleMetrics} compareOn={comparePrev} />

      {/* =============================== CHART =============================== */}
      <div className="mt-2 h-[360px] w-full" ref={rootRef}>
        {chartType === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <defs>
                {visibleMetrics.map((m) => {
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
              <XAxis
                dataKey="date"
                tickFormatter={niceDate}
                tick={{ fontSize: 12, fill: "#475569" }}
                stroke="#cbd5e1"
              />
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

              {/* Previous period (pastel/dashed) */}
              {comparePrev &&
                visibleMetrics.map((m) => {
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
                      strokeWidth={2}
                      fill={`url(#gp-${m})`}
                      dot={false}
                      activeDot={false}
                    />
                  );
                })}

              {/* Current (solid) */}
              {visibleMetrics.map((m) => {
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
                {visibleMetrics.map((m) => {
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
              <XAxis
                dataKey="date"
                tickFormatter={niceDate}
                tick={{ fontSize: 12, fill: "#475569" }}
                stroke="#cbd5e1"
              />
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
                visibleMetrics.map((m) => (
                  <Bar
                    key={`prev-${m}`}
                    yAxisId={m === "bounceRate" ? "right" : "left"}
                    dataKey={`prev_${m}`}
                    name={`Previous — ${METRIC_LABELS[m]}`}
                    fill={`url(#pat-${m})`}
                    stroke={METRIC_COLORS[m]}
                    strokeOpacity={0.7}
                    radius={[6, 6, 0, 0]} // top corners only (flat base)
                  />
                ))}

              {/* Current bars (solid) */}
              {visibleMetrics.map((m) => (
                <Bar
                  key={`cur-${m}`}
                  yAxisId={m === "bounceRate" ? "right" : "left"}
                  dataKey={`cur_${m}`}
                  name={`Current — ${METRIC_LABELS[m]}`}
                  fill={METRIC_COLORS[m]}
                  radius={[6, 6, 0, 0]} // top corners only (flat base)
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer hint (concise) */}
      <div className="mt-3 text-[11px] leading-5 text-slate-500">
        <span className="font-medium">Tip:</span> Sessions is pinned on. Toggle other metrics with the chips. In
        <span className="font-medium"> Bar</span> mode, previous period uses a hatch; in
        <span className="font-medium"> Area</span> mode, previous period uses dashed lines with pastel fills.
      </div>
    </section>
  );
}

