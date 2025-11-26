"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";
import {
  CalendarDays,
  Monitor,
  Smartphone,
  Tablet as TabletIcon,
  Download,
  RefreshCw,
  ChevronDown,
  Info,
  PieChart as PieIcon,
  BarChart3 as BarIcon,
  AreaChart as AreaIcon,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Tokens (match Wranker theme & earlier sections)
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
  // Device colors (consistent with earlier sections)
  device: {
    desktop: { stroke: "#10B981", fill: "rgba(16,185,129,.18)" }, // green
    mobile: { stroke: "#4286F5", fill: "rgba(66,134,245,.18)" }, // blue
    tablet: { stroke: "#F59E0B", fill: "rgba(245,158,11,.18)" }, // amber
  },
  // Gauge thresholds
  gauge: {
    good: "#10B981", // >= 60%
    warn: "#F59E0B", // 40-59.9%
    bad: "#EF4444", // < 40%
    track: "#E5E7EB",
  },
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ──────────────────────────────────────────────────────────────
   Types & formatters
   ────────────────────────────────────────────────────────────── */
type Device = "all" | "desktop" | "mobile" | "tablet";

type TrendPoint = {
  date: string; // label (MMM dd)
  scrolledPct: number; // %
  scrollEvents: number;
  pageViews: number;
};

type DeviceRow = {
  device: "desktop" | "mobile" | "tablet";
  scrolledPct: number;
  scrollEvents: number;
  pageViews: number;
};

type PageRow = {
  path: string;
  pageViews: number;
  scrollEvents: number;
  scrolledPct: number; // 90% scroll %
  avgTimeSec: number;
};

type ScrollDepthPayload = {
  overall: {
    scrolledPct: number; // % 90% scroll
    scrollEvents: number; // raw "scroll @ 90%" events
    pageViews: number; // total page views
    deepScrollRate: number; // events / pageViews * 100
  };
  devices: DeviceRow[];
  trend: TrendPoint[];
  pages: PageRow[];
};

const fmt = {
  pct1: (n: number) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)}%`,
  int: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  time: (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
};

const DEVICES: Device[] = ["all", "desktop", "mobile", "tablet"];

/* ──────────────────────────────────────────────────────────────
   Mock GA4 adapter (same pattern as earlier sections)
   Replace mockGA4.scrollDepth(...) with your live adapter call.
   ────────────────────────────────────────────────────────────── */
const mockGA4 = {
  _dayLabel(offset: number) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  },
  _base(i: number, phase = 0) {
    const s = Math.sin((i + phase) / 4);
    const c = Math.cos((i + phase) / 5.5);
    const scrolledPct = 44 + s * 6 + c * 2; // baseline % oscillates 36–52
    const pageViews = 9000 + s * 700 + c * 500 + 600;
    const scrollEvents = Math.max(1, Math.round(pageViews * (scrolledPct / 100)));
    return { scrolledPct: Math.max(10, Math.min(85, scrolledPct)), pageViews: Math.round(pageViews), scrollEvents };
  },
  _deviceAdj(device: Device) {
    switch (device) {
      case "desktop":
        return { pct: +8, pv: 0.9, share: 0.35 };
      case "mobile":
        return { pct: -5, pv: 1.2, share: 0.58 };
      case "tablet":
        return { pct: +1, pv: 0.3, share: 0.07 };
      default:
        return { pct: 0, pv: 1.0, share: 1.0 };
    }
  },
  scrollDepth(rangeDays: number, device: Device): ScrollDepthPayload {
    // Trend series
    const trend: TrendPoint[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const { scrolledPct, pageViews, scrollEvents } = this._base(i, 0);
      const pctAdj = this._deviceAdj(device).pct;
      trend.push({
        date: this._dayLabel(i),
        scrolledPct: Math.max(0, Math.min(100, scrolledPct + pctAdj)),
        scrollEvents,
        pageViews,
      });
    }

    // Overall aggregation
    const last = trend.at(-1)!;
    const overall = {
      scrolledPct: last.scrolledPct,
      scrollEvents: last.scrollEvents,
      pageViews: last.pageViews,
      deepScrollRate: (last.scrollEvents / Math.max(1, last.pageViews)) * 100,
    };

    // Device breakdown
    const basePV = last.pageViews;
    const devRows: DeviceRow[] = (["desktop", "mobile", "tablet"] as const).map((d) => {
      const adj = this._deviceAdj(d);
      const pv = Math.round(basePV * adj.share);
      const pct = Math.max(0, Math.min(100, last.scrolledPct + adj.pct));
      const ev = Math.max(1, Math.round(pv * (pct / 100)));
      return { device: d, pageViews: pv, scrolledPct: pct, scrollEvents: ev };
    });

    // Per-page sample
    const pages: PageRow[] = Array.from({ length: 8 }).map((_, i) => {
      const pv = Math.round(600 + Math.random() * 4200);
      const pct = Math.max(12, Math.min(88, last.scrolledPct + (Math.random() - 0.5) * 14));
      const ev = Math.max(1, Math.round(pv * (pct / 100)));
      const avg = Math.round(90 + Math.random() * 180); // 1:30 – 4:30
      return {
        path: i < 3 ? `/blog/seo-guide-${i + 1}` : i < 5 ? `/product/feature-${i - 2}` : `/landing/offer-${i - 4}`,
        pageViews: pv,
        scrollEvents: ev,
        scrolledPct: pct,
        avgTimeSec: avg,
      };
    });

    return { overall, devices: devRows, trend, pages };
  },
};

/* ──────────────────────────────────────────────────────────────
   Primitives: Dot, InfoTip, ToggleSwitch, Chip selects
   ────────────────────────────────────────────────────────────── */
function Dot({ color }: { color: string }) {
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
  );
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Info size={14} className="text-gray-500" />
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 top-5 right-0 rounded-md bg-white p-2 text-xs shadow"
          style={{ border: `1px solid ${TK.border}`, maxWidth: 260 }}
        >
          {text}
        </div>
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
  label?: string;
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
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </button>
  );
}

function RangeChip({
  value,
  onChange,
}: {
  value: 7 | 14 | 30 | 60 | 90;
  onChange: (v: 7 | 14 | 30 | 60 | 90) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 px-3 py-2 border rounded-[6px] text-sm hover:bg-[#F5F7FA] cursor-pointer"
        style={{ borderColor: TK.border }}
        onClick={() => setOpen((s) => !s)}
      >
        <CalendarDays size={14} className="text-[#008CCD]" />
        <span className="font-medium">Range</span>
        <span className="text-xs text-gray-600">{value}d</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute z-10 mt-2 w-40 bg-white border rounded-[6px] p-2 shadow"
          style={{ borderColor: TK.border }}
          role="listbox"
        >
          {[7, 14, 30, 60, 90].map((n) => (
            <button
              key={n}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F5F7FA] flex items-center gap-2 cursor-pointer"
              onClick={() => {
                onChange(n as any);
                setOpen(false);
              }}
            >
              <CalendarDays size={14} className="text-[#008CCD]" />
              <span className="text-sm" style={{ color: TK.text }}>
                {n} days
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceChip({
  value,
  onChange,
}: {
  value: Device;
  onChange: (v: Device) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const iconFor = (d: Device) =>
    d === "desktop" ? <Monitor size={14} className="text-[#008CCD]" /> :
    d === "mobile" ? <Smartphone size={14} className="text-[#008CCD]" /> :
    d === "tablet" ? <TabletIcon size={14} className="text-[#008CCD]" /> :
    <Monitor size={14} className="text-[#008CCD]" />;
  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 px-3 py-2 border rounded-[6px] text-sm hover:bg-[#F5F7FA] cursor-pointer"
        style={{ borderColor: TK.border }}
        onClick={() => setOpen((s) => !s)}
      >
        {iconFor(value)}
        <span className="font-medium">Device</span>
        <span className="text-xs text-gray-600">{value}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute z-10 mt-2 w-44 bg-white border rounded-[6px] p-2 shadow"
          style={{ borderColor: TK.border }}
          role="listbox"
        >
          {DEVICES.map((d) => (
            <button
              key={d}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F5F7FA] flex items-center gap-2 cursor-pointer"
              onClick={() => {
                onChange(d);
                setOpen(false);
              }}
            >
              {iconFor(d)}
              <span className="text-sm" style={{ color: TK.text }}>
                {d}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Smart Popovers (Donut, Bar, Area) with dots + icons
   ────────────────────────────────────────────────────────────── */
function DonutSmartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const color = p.color || p.payload?.fill || "#ccc";
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.border }}
      role="tooltip"
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Dot color={color} />
          <PieIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <span style={{ color: TK.text }}>{p.name}</span>
        </div>
        <div className="font-semibold" style={{ color: TK.text }}>
          {`${Number(p.value).toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
}
function BarSmartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const device = (p?.payload?.device || "").toLowerCase();
  const color =
    device === "desktop"
      ? TK.device.desktop.stroke
      : device === "mobile"
      ? TK.device.mobile.stroke
      : TK.device.tablet.stroke;
  const DeviceIcon =
    device === "desktop" ? Monitor : device === "mobile" ? Smartphone : TabletIcon;

  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.border }}
      role="tooltip"
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Dot color={color} />
          <BarIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <DeviceIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <span style={{ color: TK.text }}>{p?.payload?.device}</span>
        </div>
        <div className="font-semibold" style={{ color: TK.text }}>
          {`${Number(p.value).toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
}
function AreaSmartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const color = p.color || TK.brand;
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.border }}
      role="tooltip"
    >
      <div className="mb-1 text-[12px] font-medium" style={{ color: TK.muted }}>
        {String(label)}
      </div>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Dot color={color} />
          <AreaIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <span style={{ color: TK.text }}>Scrolled 90%</span>
        </div>
        <div className="font-semibold" style={{ color: TK.text }}>
          {`${Number(p.value).toFixed(1)}%`}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function gaugeColor(p: number) {
  if (p >= 60) return TK.gauge.good;
  if (p >= 40) return TK.gauge.warn;
  return TK.gauge.bad;
}

/* ──────────────────────────────────────────────────────────────
   Main Section
   ────────────────────────────────────────────────────────────── */
export default function ScrollDepthSection({da_ta}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [range, setRange] = React.useState<7 | 14 | 30 | 60 | 90>(30);
  const [device, setDevice] = React.useState<Device>("all");
  const [showTrend, setShowTrend] = React.useState(true);

  const overallPct = React.useMemo(() => {
    const s = Number(da_ta?.summary?.total_sessions ?? 0);
    const ev = Number(da_ta?.summary?.total_scroll_events ?? 0);
    return s > 0 ? (ev / s) * 100 : Number(da_ta?.rows?.[0]?.scrolled_to_depth_percentage ?? 0);
  }, [da_ta]);
  
  const mapped = React.useMemo(() => {
    return {
      overall: {
        scrolledPct: Number(overallPct.toFixed(1)),
        scrollEvents: Number(da_ta?.summary?.total_scroll_events ?? 0),
        pageViews: Number(da_ta?.summary?.total_sessions ?? 0),
        deepScrollRate: Number(overallPct.toFixed(2)),
      },
      devices: [
        // If you later add device splits, map them here. For now one bar “Desktop”.
        { device: "desktop", scrolledPct: Number(overallPct.toFixed(1)), scrollEvents: 0, pageViews: Number(da_ta?.summary?.total_sessions ?? 0) },
      ],
      trend: (da_ta?.rows ?? []).map((r, i) => ({
        date: `D${i+1}`,
        scrolledPct: Number(r.scrolled_to_depth_percentage ?? overallPct),
        scrollEvents: Number(r.scroll_events ?? 0),
        pageViews: Number(r.screenPageViews ?? r.sessions ?? 0),
      })),
      pages: [], // You can pass real per-page rows when available
    };
  }, [da_ta, overallPct]);
  

  const data = mapped

  const chartRef = React.useRef<HTMLDivElement | null>(null);

  // Derived for donut
  const pct = Math.max(0, Math.min(100, Number(data.overall.scrolledPct.toFixed(1))));
  const ringColor = gaugeColor(pct);
  const gaugeData = [
    { name: "Scrolled 90%", value: pct, fill: ringColor },
    { name: "Remaining", value: 100 - pct, fill: TK.gauge.track },
  ];

  // Hover state for donut
  const [activeSlice, setActiveSlice] = React.useState<number>(-1);
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

  // Device bars chart data
  const deviceBars = data.devices.map((d) => ({
    device: d.device[0].toUpperCase() + d.device.slice(1),
    pct: Number(d.scrolledPct.toFixed(1)),
  }));

  if (!mounted) {
    return (
      <section
        className="rounded-md bg-white p-4 mt-4"
        style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
      >
        <div className="h-6 w-[220px] rounded bg-gray-100" />
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="h-[260px] rounded bg-gray-50" />
          <div className="h-[260px] rounded bg-gray-50" />
        </div>
        <div className="mt-3 h-[280px] rounded bg-gray-50" />
        <div className="mt-3 h-[280px] rounded bg-gray-50" />
      </section>
    );
  }

  return (
    <section
      className="rounded-md bg-white p-4 mt-4"
      style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PieIcon className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Scroll Depth (90% Completion)
          </div>
          <InfoTip text="Based on GA4 'scroll' event at 90% page height. Deep Scroll Rate = scroll events ÷ page views × 100." />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Modular chips & toggle */}
          <RangeChip value={range} onChange={setRange} />
          <DeviceChip value={device} onChange={setDevice} />
          <ToggleSwitch checked={showTrend} onChange={setShowTrend} label="Show trend" />
          {/* Export */}
          <div className="ml-1 inline-flex gap-2">
            <button
              className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: TK.border }}
              onClick={() => exportPNG(chartRef.current, "scroll-depth.png")}
              title="Export PNG"
            >
              <Download className="h-4 w-4" />
              PNG
            </button>
            <button
              className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: TK.border }}
              onClick={() => exportCSV(data as any)}
              title="Export CSV"
            >
              CSV
            </button>
            <button
              className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: TK.border }}
              onClick={() => {
                // simple re‑seed visual refresh
                (setRange as any)((r: number) => (r === 30 ? 31 : 30));
                setTimeout(() => (setRange as any)((r: number) => (r === 31 ? 30 : r)), 0);
              }}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Top row: Donut (with right legends) + Device bars */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {/* Donut card */}
        <div
          ref={chartRef}
          className="rounded-md bg-white p-3"
          style={{ border: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: TK.text }}>
              <PieIcon className="h-4 w-4" style={{ color: TK.brand }} />
              Deep Scroll Rate (90%)
            </div>
            <span className="text-xs text-gray-500">
              Events: {fmt.int(data.overall.scrollEvents)} • Views: {fmt.int(data.overall.pageViews)}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-4">
            {/* Donut */}
            <div className="relative h-[220px] w-full max-w-[320px]">
              <ResponsiveContainer>
                <PieChart>
                  <RTooltip content={<DonutSmartTooltip />} />
                  <Pie
                    data={gaugeData}
                    dataKey="value"
                    nameKey="name"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={70}
                    outerRadius={96}
                    stroke="none"
                    isAnimationActive
                    activeIndex={activeSlice}
                    activeShape={renderActiveSlice}
                    onMouseLeave={() => setActiveSlice(-1)}
                  >
                    {gaugeData.map((d, idx) => (
                      <Cell
                        key={d.name}
                        fill={d.fill}
                        cursor="pointer"
                        onMouseEnter={() => setActiveSlice(idx)}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center metric */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-2xl font-semibold" style={{ color: ringColor }}>
                    {fmt.pct1(pct)}
                  </div>
                  <div className="text-xs text-gray-600">Scrolled to 90%</div>
                </div>
              </div>
            </div>

            {/* Legends at right (with values) */}
            <div className="min-w-[180px]">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <Dot color={ringColor} />
                    <PieIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                    <span style={{ color: TK.text }}>Scrolled 90%</span>
                  </div>
                  <span className="font-semibold" style={{ color: TK.text }}>
                    {fmt.pct1(pct)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <Dot color={TK.gauge.track} />
                    <PieIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                    <span style={{ color: TK.text }}>Remaining</span>
                  </div>
                  <span className="font-semibold" style={{ color: TK.text }}>
                    {fmt.pct1(100 - pct)}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Thresholds: <span style={{ color: TK.gauge.bad }}>Red &lt; 40%</span> •{" "}
                <span style={{ color: TK.gauge.warn }}>Amber 40–59%</span> •{" "}
                <span style={{ color: TK.gauge.good }}>Green ≥ 60%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Device bars */}
        <div
          className="rounded-md bg-white p-3"
          style={{ border: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: TK.text }}>
              <BarIcon className="h-4 w-4" style={{ color: TK.brand }} />
              By Device (90% Scroll %)
            </div>
            {/* Custom legend (branded icons + colored dots) */}
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Dot color={TK.device.desktop.stroke} />
                <Monitor className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                Desktop
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Dot color={TK.device.mobile.stroke} />
                <Smartphone className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                Mobile
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Dot color={TK.device.tablet.stroke} />
                <TabletIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                Tablet
              </span>
            </div>
          </div>

          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer>
              <BarChart data={deviceBars} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={TK.borderLight} vertical={false} />
                <XAxis dataKey="device" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <RTooltip content={<BarSmartTooltip />} cursor={{ fill: "#F3F4F6" }} />
                <Bar dataKey="pct" name="Scrolled 90%" radius={[4, 4, 0, 0]} isAnimationActive>
                  {deviceBars.map((entry, idx) => {
                    const key = entry.device.toLowerCase() as "desktop" | "mobile" | "tablet";
                    const color =
                      key === "desktop"
                        ? TK.device.desktop.stroke
                        : key === "mobile"
                        ? TK.device.mobile.stroke
                        : TK.device.tablet.stroke;
                    return <Cell key={`dev-${idx}`} fill={color} cursor="pointer" />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend (Area instead of Line) */}
      {showTrend && (
        <div
          className="mt-3 rounded-md bg-white p-3"
          style={{ border: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: TK.text }}>
              <AreaIcon className="h-4 w-4" style={{ color: TK.brand }} />
              Trend — Scrolled to 90% over time
            </div>
            <div className="text-xs text-gray-500">Hover for value & date</div>
          </div>
          <div className="mt-2 h-[280px] w-full">
            <ResponsiveContainer>
              <AreaChart data={data.trend} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={TK.borderLight} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <RTooltip content={<AreaSmartTooltip />} cursor={{ stroke: "#C7E2F8", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="scrolledPct"
                  name="Scrolled 90%"
                  stroke={TK.brand}
                  fill={TK.brand}
                  fillOpacity={0.15}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pages table (unchanged) */}
      <div
        className="rounded-md bg-white p-3 mt-4"
        style={{ border: `1px solid ${TK.borderLight}` }}
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: TK.text }}>
            <BarIcon className="h-4 w-4" style={{ color: TK.brand }} />
            Pages — Scroll 90% Detail
          </div>
          <div className="text-xs text-gray-500">Click column headers to sort (client‑side hook in Phase 1.1)</div>
        </div>
        <div className="mt-2 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b" style={{ borderColor: TK.borderLight }}>
                <th className="p-2 text-left font-semibold text-gray-700">Page Path</th>
                <th className="p-2 text-right font-semibold text-gray-700">Page Views</th>
                <th className="p-2 text-right font-semibold text-gray-700">Scroll Events (90%)</th>
                <th className="p-2 text-right font-semibold text-gray-700">Scrolled 90%</th>
                <th className="p-2 text-right font-semibold text-gray-700">Avg. Time</th>
              </tr>
            </thead>
            <tbody>
              {data.pages.map((r:any, i) => (
                <tr
                  key={i}
                  className="border-b hover:bg-[#FBFDFF]"
                  style={{ borderColor: TK.borderLight }}
                >
                  <td className="p-2">
                    <a
                      href={r.path}
                      className="text-[#4286F5] underline-offset-2 hover:underline cursor-pointer"
                    >
                      {r.path}
                    </a>
                  </td>
                  <td className="p-2 text-right">{fmt.int(r.pageViews)}</td>
                  <td className="p-2 text-right">{fmt.int(r.scrollEvents)}</td>
                  <td className="p-2 text-right" style={{ color: gaugeColor(r.scrolledPct) }}>
                    {fmt.pct1(r.scrolledPct)}
                  </td>
                  <td className="p-2 text-right">{fmt.time(r.avgTimeSec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          * GA4 only fires a 90% scroll event by default; intermediate depths (25/50/75%) require custom instrumentation (Phase 2).
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────
   Export helpers (PNG + CSV)
   ────────────────────────────────────────────────────────────── */
function exportPNG(el: HTMLElement | null, filename = "scroll-depth.png") {
  if (!el) return;
  const wrapper = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${FONT_STACK}">${el.outerHTML}</div>
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

function exportCSV(payload: ScrollDepthPayload, file = "scroll-depth.csv") {
  const header = "date,scrolled90_pct,scrollEvents,pageViews";
  const body = payload.trend
    .map((r) => [r.date, r.scrolledPct.toFixed(1), r.scrollEvents, r.pageViews].join(","))
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
}
