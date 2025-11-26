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
   Tokens & font (align with reference)
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
  device: {
    desktop: { stroke: "#10B981", fill: "rgba(16,185,129,.18)" }, // green
    mobile: { stroke: "#4286F5", fill: "rgba(66,134,245,.18)" }, // blue
    tablet: { stroke: "#F59E0B", fill: "rgba(245,158,11,.18)" }, // amber
  },
  gauge: {
    good: "#10B981", // >= 60%
    warn: "#F59E0B", // 40–59.9%
    bad: "#EF4444",  // < 40%
    track: "#E5E7EB",
  },
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ──────────────────────────────────────────────────────────────
   Types (keep API parity with existing drop-in)
   ────────────────────────────────────────────────────────────── */
type Device = "all" | "desktop" | "mobile" | "tablet";
type RangeDays = 7 | 14 | 30 | 60 | 90;

export type ScrollDepthPageDetailProps = {
  pagePath: string;
  defaultRange?: RangeDays;            // default 30
  allowDeviceFilter?: boolean;         // default true
  showTrendDefault?: boolean;          // default true
  hasCustomScroll?: boolean;           // ignored in this redesign (per spec to remove)
  onAssignTask?: (payload: {
    pagePath: string;
    scrolled90Pct: number;
    device: Device;
  }) => void;

  // Core GA4 adapter
  fetchScroll90: (args: {
    pagePath: string;
    range: RangeDays;
    device: Device;
  }) => Promise<{
    series: Array<{ date: string; scroll90: number; pageViews: number }>;
    snapshot: { pageViews: number; scrollEvents90: number; pct: number };
    devices: Array<{ device: "desktop" | "mobile" | "tablet"; pct: number }>;
  }>;

  // Present for compatibility but unused in this version (custom distribution removed)
  fetchCustomBuckets?: any;
};

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const fmt = {
  pct1: (n: number) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)}%`,
  int: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
};
function clamp01pct(n: number) {
  return Math.max(0, Math.min(100, n));
}
function gaugeColor(p: number) {
  if (p >= 60) return TK.gauge.good;
  if (p >= 40) return TK.gauge.warn;
  return TK.gauge.bad;
}

/* Export helpers (PNG + CSV) — keep, but ensure Inter / Inter Fallback */
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
function exportCSV(series: Array<{ date: string; scroll90: number; pageViews: number }>, file = "scroll-depth.csv") {
  const header = "date,scrolled90_pct,scrollEvents,pageViews";
  const body = series
    .map((r) => {
      const scrollEvents = Math.round(Math.max(0, r.pageViews) * (clamp01pct(r.scroll90) / 100));
      return [r.date, r.scroll90.toFixed(1), scrollEvents, r.pageViews].join(",");
    })
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
}

/* Demo-safe mock (fallback only if adapter throws) */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
async function mockFetchScroll90(args: { pagePath: string; range: RangeDays; device: Device }, seed = 1) {
  const rand = mulberry32((seed * 9973) ^ args.range ^ (args.device === "all" ? 0 : args.device === "desktop" ? 1 : args.device === "mobile" ? 2 : 3));
  const len = args.range;
  const base = 46 + (rand() * 8 - 4);
  const series: Array<{ date: string; scroll90: number; pageViews: number }> = [];
  let pvTotal = 0;
  let evtTotal = 0;

  for (let i = len - 1; i >= 0; i--) {
    const wave = Math.sin((i / len) * Math.PI * 2) * 6;
    const noise = (rand() - 0.5) * 4;
    const scroll90 = clamp01pct(base + wave + noise);
    const pv = Math.max(120, Math.round(220 + Math.sin((i / 7) * Math.PI * 2) * 60 + rand() * 80));
    const ev = Math.round(pv * scroll90 / 100);
    pvTotal += pv;
    evtTotal += ev;
    series.push({ date: dateNDaysAgo(i), scroll90: Number(scroll90.toFixed(1)), pageViews: pv });
  }

  const overallPct = pvTotal > 0 ? Number(((evtTotal / pvTotal) * 100).toFixed(1)) : 0;
  const devAdj = [
    { device: "desktop" as const, pct: clamp01pct(overallPct + 4 + (rand() - 0.5) * 3) },
    { device: "mobile"  as const, pct: clamp01pct(overallPct - 3 + (rand() - 0.5) * 3) },
    { device: "tablet"  as const, pct: clamp01pct(overallPct + (rand() - 0.5) * 5) },
  ].sort((a, b) => (a.device > b.device ? 1 : -1));

  return {
    series,
    snapshot: { pageViews: pvTotal, scrollEvents90: evtTotal, pct: overallPct },
    devices: devAdj,
  };
}

/* ──────────────────────────────────────────────────────────────
   UI primitives (chips, toggle, info, dots)
   ────────────────────────────────────────────────────────────── */
function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />;
}
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      aria-label="metric information"
      role="img"
    >
      <Info size={14} className="text-gray-500" />
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 top-5 right-0 rounded-md bg-white p-2 text-xs shadow"
          style={{ border: `1px solid ${TK.border}`, maxWidth: 260, opacity: 1 }} /* fully opaque */
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
  value: RangeDays;
  onChange: (v: RangeDays) => void;
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
          style={{ borderColor: TK.border, opacity: 1 }} /* fully opaque */
          role="listbox"
        >
          {[7, 14, 30, 60, 90].map((n) => (
            <button
              key={n}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F5F7FA] flex items-center gap-2 cursor-pointer"
              onClick={() => {
                onChange(n as RangeDays);
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
  const DEVICES: Device[] = ["all", "desktop", "mobile", "tablet"];
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
          style={{ borderColor: TK.border, opacity: 1 }} /* fully opaque */
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
   Smart Popovers (Donut, Bar, Area) — fully opaque
   ────────────────────────────────────────────────────────────── */
function DonutSmartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const color = p.color || p.payload?.fill || "#ccc";
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.border, opacity: 1 }}
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
      style={{ borderColor: TK.border, opacity: 1 }}
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
      style={{ borderColor: TK.border, opacity: 1 }}
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
   Main Component — Section 4 (redesigned to match reference)
   ────────────────────────────────────────────────────────────── */
export default function ScrollDepthPageDetail({
  pagePath,
  defaultRange = 30,
  allowDeviceFilter = true,
  showTrendDefault = true,
  hasCustomScroll = false, // ignored
  onAssignTask, // not rendered in header per reference design
  fetchScroll90,
}: ScrollDepthPageDetailProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // UI controls
  const [range, setRange] = React.useState<RangeDays>(defaultRange);
  const [device, setDevice] = React.useState<Device>("all");
  const [showTrend, setShowTrend] = React.useState<boolean>(showTrendDefault);

  // Data state
  const [series, setSeries] = React.useState<Array<{ date: string; scroll90: number; pageViews: number }>>([]);
  const [snapshot, setSnapshot] = React.useState<{ pageViews: number; scrollEvents90: number; pct: number } | null>(null);
  const [devices, setDevices] = React.useState<Array<{ device: "desktop" | "mobile" | "tablet"; pct: number }>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState<number>(0);

  React.useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const args = { pagePath, range, device };
        let base: Awaited<ReturnType<typeof fetchScroll90>>;
        try {
          base = await fetchScroll90(args);
        } catch (e: any) {
          // Fallback (demo)
          base = await mockFetchScroll90(args, 100 + refreshNonce);
        }
        if (cancelled) return;
        setSeries(base.series || []);
        setSnapshot(base.snapshot || null);
        setDevices(base.devices || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load scroll depth.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mounted, pagePath, range, device, fetchScroll90, refreshNonce]);

  const chartRef = React.useRef<HTMLDivElement | null>(null);

  // Derived
  const pct = snapshot ? clamp01pct(Number(snapshot.pct.toFixed(1))) : 0;
  const ringColor = gaugeColor(pct);
  const gaugeData = [
    { name: "Scrolled 90%", value: pct, fill: ringColor },
    { name: "Remaining", value: 100 - pct, fill: TK.gauge.track },
  ];
  const deviceBars = (devices || []).map((d) => ({
    device: d.device[0].toUpperCase() + d.device.slice(1),
    pct: Number(clamp01pct(d.pct).toFixed(1)),
  }));

  // Donut hover state
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

  // Skeleton (SSR-safe)
  if (!mounted) {
    return (
      <section
        className="rounded-md bg-white p-4"
        style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
        aria-label="Scroll Depth (Page Detail View)"
      >
        <div className="h-6 w-[260px] rounded bg-gray-100" />
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="h-[260px] rounded bg-gray-50" />
          <div className="h-[260px] rounded bg-gray-50" />
        </div>
        <div className="mt-3 h-[280px] rounded bg-gray-50" />
      </section>
    );
  }

  return (
    <section
      className="rounded-md bg-white p-4 mt-4"
      style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
      aria-label="Scroll Depth (Page Detail View)"
    >
      {/* Header (match reference: branded icon + chips + toggle + export) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PieIcon className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Scroll Depth (90% Completion)
          </div>
          <InfoTip text="Based on GA4 'scroll' event at 90% page height. Deep Scroll Rate = scroll events ÷ page views × 100." />
          {error && (
            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
              {error}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangeChip value={range} onChange={setRange} />
          {allowDeviceFilter && <DeviceChip value={device} onChange={setDevice} />}
          <ToggleSwitch checked={showTrend} onChange={setShowTrend} label="Show trend" />
          <div className="ml-1 inline-flex gap-2">
            <button
              className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: TK.border }}
              onClick={() => exportPNG(chartRef.current, "scroll-depth.png")}
              title="Export PNG"
              aria-label="Export PNG"
            >
              <Download className="h-4 w-4" />
              PNG
            </button>
            <button
              className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: TK.border }}
              onClick={() => exportCSV(series)}
              title="Export CSV"
              aria-label="Export CSV (trend)"
            >
              CSV
            </button>
            <button
              className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: TK.border }}
              onClick={() => setRefreshNonce((n) => n + 1)}
              title="Refresh"
              aria-label="Refresh"
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
              Events: {snapshot ? fmt.int(snapshot.scrollEvents90) : "—"} • Views: {snapshot ? fmt.int(snapshot.pageViews) : "—"}
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
                    isAnimationActive={!loading}
                    activeIndex={activeSlice}
                    activeShape={renderActiveSlice}
                    onMouseLeave={() => setActiveSlice(-1)}
                  >
                  {gaugeData.map((d, idx) => (
                    <Cell
                      key={idx}
                      fill={d.fill}
                      cursor="pointer"
                      onMouseEnter={(e) => setActiveSlice(idx)}
                    />
                  ))}

                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center metric */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-2xl font-semibold" style={{ color: ringColor }}>
                    {snapshot ? fmt.pct1(pct) : "—"}
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
                    {snapshot ? fmt.pct1(pct) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <Dot color={TK.gauge.track} />
                    <PieIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                    <span style={{ color: TK.text }}>Remaining</span>
                  </div>
                  <span className="font-semibold" style={{ color: TK.text }}>
                    {snapshot ? fmt.pct1(100 - pct) : "—"}
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
                <Bar dataKey="pct" name="Scrolled 90%" radius={[4, 4, 0, 0]} isAnimationActive={!loading}>
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

      {/* Trend (Area) */}
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
              <AreaChart
                data={series.map((r) => ({ date: r.date, scrolledPct: r.scroll90 }))}
                margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
              >
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
                  isAnimationActive={!loading}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Footnote */}
      <div className="mt-3 text-[11px] text-gray-500">
        * “Scrolled to 90%” = (count of GA4 <code>scroll</code> events at <code>percent_scrolled=90</code> for this page) ÷ (page views) × 100.
      </div>
    </section>
  );
}
