"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  Cell, // ⟵ FIX: import Cell to avoid ReferenceError
} from "recharts";
import {
  Smartphone,
  Monitor,
  Tablet as TabletIcon,
  Info,
  Download,
  RefreshCw,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  BarChart3 as SectionIcon,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Theme tokens (aligned) + font stack
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  valueBlue: "#0077ff", // main metric value in cards
  radius: 10,
  // Device colors (spec)
  device: {
    mobile: { stroke: "#4286F5", fill: "rgba(66,134,245,.18)" },
    desktop: { stroke: "#10B981", fill: "rgba(16,185,129,.18)" },
    tablet: { stroke: "#F59E0B", fill: "rgba(245,158,11,.18)" },
  },
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};
const FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
type DeviceKey = "mobile" | "desktop" | "tablet";
type Range = 7 | 14 | 30 | 60 | 90;
type SeriesPoint = { date: string; value: number };
type DeviceMetrics = {
  device: DeviceKey;
  sessions: number;
  bounceRate: number; // %
  avgTime: number; // seconds
  pagesPerSession: number;
  convRate: number; // %
  seriesSessions: SeriesPoint[];
};
type SortKey =
  | "device"
  | "sessions"
  | "bounceRate"
  | "avgTime"
  | "pagesPerSession"
  | "convRate";

/* ──────────────────────────────────────────────────────────────
   Helpers / formatters
   ────────────────────────────────────────────────────────────── */
const fmt = {
  num: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  one: (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n),
  pct: (n: number) =>
    `${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 1,
    }).format(n)}%`,
  time: (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
};
const DEVICE_LABEL: Record<DeviceKey, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  tablet: "Tablet",
};
const DEVICE_ICON: Record<DeviceKey, React.ComponentType<any>> = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: TabletIcon,
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/* ──────────────────────────────────────────────────────────────
   Mock GA4 data generator (deterministic)
   ────────────────────────────────────────────────────────────── */
function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function baseAt(i: number) {
  const s = Math.sin(i / 3);
  const c = Math.cos(i / 5);
  return {
    sessions: 900 + s * 120 + c * 80,
    bounce: 42 + s * 4 - c * 2,
    time: 125 + s * 18 + c * 8,
    pages: 3.1 + s * 0.25 + c * 0.18,
    conv: 3.2 + s * 0.35 - c * 0.15,
  };
}
const adj: Record<
  DeviceKey,
  { sessions: number; bounce: number; time: number; pages: number; conv: number }
> = {
  mobile: { sessions: +260, bounce: +4, time: -12, pages: -0.25, conv: -0.6 },
  desktop: { sessions: -40, bounce: -5, time: +25, pages: +0.6, conv: +0.8 },
  tablet: { sessions: -220, bounce: +1, time: +8, pages: +0.2, conv: +0.2 },
};


/* ──────────────────────────────────────────────────────────────
   UI Primitives — Dot, Chip (modular), ToggleSwitch (modular)
   ────────────────────────────────────────────────────────────── */
function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: color }}
      aria-hidden
    />
  );
}
function Chip({
  children,
  onClear,
}: {
  children: React.ReactNode;
  onClear?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: TK.borderLight, color: TK.text }}
    >
      {children}
      {onClear && (
        <button
          className="ml-1 rounded border px-1.5 py-0.5 text-[11px] cursor-pointer"
          style={{ borderColor: TK.borderLight, color: TK.muted }}
          onClick={onClear}
          title="Clear"
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

/* ──────────────────────────────────────────────────────────────
   Smart tooltips
   ────────────────────────────────────────────────────────────── */
function AreaSmartTooltip({
  active,
  payload,
  label,
  device,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  device: DeviceKey;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const color = TK.device[device].stroke;
  const Icon = DEVICE_ICON[device];
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.border }}
      role="tooltip"
    >
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {String(label)}
      </div>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Dot color={color} />
          <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <span style={{ color: TK.muted }}>Sessions</span>
        </div>
        <div className="font-semibold" style={{ color: TK.text }}>
          {fmt.num(Number(p.value))}
        </div>
      </div>
    </div>
  );
}

function DeviceShareTooltip({
  active,
  payload,
  activeKey,
}: {
  active?: boolean;
  payload?: any[];
  activeKey: DeviceKey | null;
}) {
  if (!active || !payload?.length) return null;

  // choose the hovered key if we have it; otherwise find first non-zero
  const item =
    (activeKey &&
      payload.find((x) => x.dataKey === activeKey && Number(x.value) > 0)) ||
    payload.find((x) => Number(x.value) > 0);

  if (!item) return null;
  const key = item.dataKey as DeviceKey;
  const val = Number(item.value);
  const color = TK.device[key].stroke;
  const Icon = DEVICE_ICON[key];

  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TK.border }}
      role="tooltip"
    >
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Device Sessions Share
      </div>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Dot color={color} />
          <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <span style={{ color: TK.text }}>{DEVICE_LABEL[key]}</span>
        </div>
        <div className="font-semibold" style={{ color: TK.text }}>
          {fmt.pct(val)}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Mini area (device sparkline) with smart tooltip
   ────────────────────────────────────────────────────────────── */
function MiniArea({
  data,
  tone,
  device,
}: {
  data: SeriesPoint[];
  tone: { stroke: string; fill: string };
  device: DeviceKey;
}) {
  return (
    <div className="w-full h-10">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={TK.borderLight} />
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin - 20", "dataMax + 20"]} />
          <RTooltip content={(props) => <AreaSmartTooltip device={device} {...props} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={tone.stroke}
            fill={tone.fill}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Export helpers
   ────────────────────────────────────────────────────────────── */
function exportPNG(el: HTMLElement | null, filename = "device-behavior.png") {
  if (!el) return;
  const wrapper = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${FONT_STACK};background:#fff;">
        ${el.outerHTML}
      </div>
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
function exportCSV(rows: DeviceMetrics[], file = "device-behavior.csv") {
  const header = [
    "device",
    "sessions",
    "bounceRate(%)",
    "avgEngagementTime(sec)",
    "pagesPerSession",
    "convRate(%)",
  ];
  const body = rows
    .map((r) =>
      [
        DEVICE_LABEL[r.device],
        r.sessions,
        r.bounceRate.toFixed(1),
        Math.round(r.avgTime),
        r.pagesPerSession.toFixed(2),
        r.convRate.toFixed(1),
      ].join(",")
    )
    .join("\n");
  const blob = new Blob([header.join(",") + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file;
  a.click();
}

/* ──────────────────────────────────────────────────────────────
   Device KPI Card
   ────────────────────────────────────────────────────────────── */
function DeviceCard({
  m,
  sharePct,
  selected,
  onToggle,
}: {
  m: DeviceMetrics;
  sharePct: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = DEVICE_ICON[m.device];
  const tone = TK.device[m.device];
  const bounceBadgeColor =
    m.bounceRate <= 40 ? TK.ok : m.bounceRate >= 50 ? TK.danger : TK.warn;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-lg p-3 text-left transition-shadow cursor-pointer ${
        selected ? "ring-2 ring-[#008CCD]" : ""
      }`}
      style={{
        background: TK.card,
        border: `1px solid ${TK.border}`,
        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
      }}
      title={`Filter table by ${DEVICE_LABEL[m.device]}`}
      aria-pressed={selected}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: TK.text }}>
          {/* branded icon for title + device color dot */}
          <Icon className="h-4 w-4" style={{ color: TK.brand }} />
          {DEVICE_LABEL[m.device]}
          <Dot color={tone.stroke} />
        </div>
        <span
          className="text-[11px] px-2 py-0.5 rounded-full"
          style={{
            color: tone.stroke,
            background: tone.fill,
            border: `1px solid ${tone.stroke}20`,
          }}
        >
          {fmt.pct(sharePct)}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-3">
        <div className="min-w-[150px]">
          <div className="text-[12px] uppercase tracking-wide" style={{ color: TK.muted }}>
            Sessions
          </div>
          {/* Main metric in blue #0077ff */}
          <div className="text-2xl font-semibold" style={{ color: TK.valueBlue }}>
            {fmt.num(m.sessions)}
          </div>

          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
            <div className="text-gray-500">Bounce</div>
            <div className="font-medium" style={{ color: bounceBadgeColor }}>
              {fmt.pct(m.bounceRate)}
            </div>
            <div className="text-gray-500">Avg. Time</div>
            <div className="font-medium" style={{ color: TK.text }}>
              {fmt.time(m.avgTime)}
            </div>
            <div className="text-gray-500">Pages/Sess.</div>
            <div className="font-medium">{fmt.one(m.pagesPerSession)}</div>
            <div className="text-gray-500">CR</div>
            <div className="font-medium">{fmt.pct(m.convRate)}</div>
          </div>
        </div>

        <div className="ml-auto w-[58%]">
          <MiniArea data={m.seriesSessions} tone={tone} device={m.device} />
        </div>
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Section Component (Drop-in)
   ────────────────────────────────────────────────────────────── */
export default function BehaviorByDeviceSection({data}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [range, setRange] = React.useState<Range>(30);
  const [selected, setSelected] = React.useState<DeviceKey | null>(null);
  const [normalize, setNormalize] = React.useState(true); // demo toggle (modular)

// Normalize input: never let metrics be undefined/null
const metrics: DeviceMetrics[] = React.useMemo(() => {
  if (!Array.isArray(data) || data.length === 0) return [];
  const toKey = (s: string): DeviceKey =>
    s?.toLowerCase().startsWith("desk") ? "desktop" :
    s?.toLowerCase().startsWith("mob")  ? "mobile"  :
    "tablet";

  return data.map((row) => ({
    device: toKey(row.device || ""),
    sessions: Number(row.sessions ?? 0),
    bounceRate: Number(row.bounce_rate ?? 0),
    avgTime: Number(row.avg_session_duration ?? 0),
    pagesPerSession: Number(row.pages_per_session ?? 0),
    convRate: Number(row.conv_rate ?? 0),
    seriesSessions: Array.isArray(row.seriesSessions) ? row.seriesSessions : [],
  }));
}, [data]);

  
const totalSessions = Array.isArray(metrics)
  ? metrics.reduce((s, m) => s + Number(m?.sessions ?? 0), 0)
  : 0;

const share = (m?: DeviceMetrics) => {
  const sess = Number(m?.sessions ?? 0);
  return totalSessions > 0 ? (sess / totalSessions) * 100 : 0;
};


  // Table sorting
  const [sortBy, setSortBy] = React.useState<SortKey>("sessions");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const tableRows = React.useMemo(() => {
    const rows = metrics.filter((m) => (selected ? m.device === selected : true));
    const val = (m: DeviceMetrics) => {
      switch (sortBy) {
        case "device":
          return DEVICE_LABEL[m.device];
        case "sessions":
          return m.sessions;
        case "bounceRate":
          return m.bounceRate;
        case "avgTime":
          return m.avgTime;
        case "pagesPerSession":
          return m.pagesPerSession;
        case "convRate":
          return m.convRate;
      }
    };
    rows.sort((a, b) => {
      const av = val(a) as any;
      const bv = val(b) as any;
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return rows;
  }, [metrics, sortBy, sortDir, selected]);

  const avgBounce =
    metrics.reduce((s, m) => s + m.bounceRate, 0) / metrics.length;

  const sectionRef = React.useRef<HTMLDivElement | null>(null);

  // hover state for horizontal stacked bar animation + tooltip choice
  const [hoveredKey, setHoveredKey] = React.useState<DeviceKey | null>(null);

  if (!mounted) {
    return (
      <section
        className="rounded-md bg-white p-4"
        style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
      >
        <div className="h-6 w-48 rounded bg-gray-100" />
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[126px] rounded bg-white"
              style={{
                border: `1px solid ${TK.border}`,
                boxShadow: "0 1px 2px rgba(17,24,39,.06)",
              }}
            />
          ))}
        </div>
        <div className="mt-4 h-[220px] rounded bg-gray-50" />
        <div className="mt-4 h-[220px] rounded bg-gray-50" />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="rounded-md bg-white p-4 mt-4"
      style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
    >
      {/* Header with branded icon */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SectionIcon className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Behavior by Device
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch
            checked={normalize}
            onChange={setNormalize}
            label="Normalize %"
          />
          <select
            className="h-8 px-2.5 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.border }}
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as Range)}
            title="Date range"
          >
            {[7, 14, 30, 60, 90].map((n) => (
              <option key={n} value={n}>
                {n}d
              </option>
            ))}
          </select>
          <button
            className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
            style={{ borderColor: TK.border }}
            onClick={() => exportPNG(sectionRef.current, "device-behavior.png")}
            title="Export PNG"
          >
            <Download className="h-4 w-4" /> PNG
          </button>
          <button
            className="h-8 px-2.5 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.border }}
            onClick={() => exportCSV(metrics)}
            title="Export CSV"
          >
            CSV
          </button>
          <button
            className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
            style={{ borderColor: TK.border }}
            onClick={() => setRange((r) => (r === 30 ? 14 : 30))}
            title="Refresh demo"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Device Sessions Share — HORIZONTAL stacked bar, only ends rounded */}
      <div
        className="mt-3 rounded-md p-3"
        style={{ border: `1px solid ${TK.borderLight}` }}
      >
        <div
          className="mb-2 flex items-center justify-between"
          aria-label="Device Sessions Share header"
        >
          <div
            className="text-[12px] font-semibold uppercase tracking-wide flex items-center gap-2"
            style={{ color: TK.muted }}
          >
            <SectionIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
            Device Sessions Share
          </div>

          {/* Custom legend with branded icons + colored dots */}
          <div className="flex items-center gap-4 text-xs">
            {(["mobile", "desktop", "tablet"] as DeviceKey[]).map((k) => {
              const Icon = DEVICE_ICON[k];
              return (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <Dot color={TK.device[k].stroke} />
                  <Icon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                  <span style={{ color: TK.text }}>{DEVICE_LABEL[k]}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="h-[110px] w-full">
          <ResponsiveContainer>
            <BarChart
              layout="vertical"
              data={[
                {
                  group: "Share",
                  mobile: Math.round(share(metrics[0])),
                  desktop: Math.round(share(metrics[1])),
                  tablet: Math.round(share(metrics[2])),
                },
              ]}
              margin={{ top: 10, right: 12, left: 12, bottom: 10 }}
            >
              <CartesianGrid horizontal={false} stroke={TK.borderLight} />
              {/* For a single horizontal bar: Y is category; X is numeric 0..100 */}
              <YAxis dataKey="group" type="category" hide />
              <XAxis type="number" domain={[0, 100]} hide />
              {/* Smart popover: shows hovered device only, with icon + dot */}
              <RTooltip
                cursor={false}
                content={(props) => (
                  <DeviceShareTooltip activeKey={hoveredKey} {...props} />
                )}
              />

              {/* MOBILE segment (left) — radius only on left ends */}
              <Bar dataKey="mobile" stackId="a" fill={TK.device.mobile.stroke}>
                <Cell
                  radius={[6, 0, 0, 6] as any}
                  cursor="pointer"
                  onMouseEnter={() => setHoveredKey("mobile")}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    transition: "opacity 160ms, filter 160ms",
                    opacity: hoveredKey && hoveredKey !== "mobile" ? 0.65 : 1,
                    filter:
                      hoveredKey === "mobile" ? "brightness(1.08) saturate(1.1)" : "none",
                  }}
                />
              </Bar>

              {/* DESKTOP segment (middle) — flat edges */}
              <Bar dataKey="desktop" stackId="a" fill={TK.device.desktop.stroke}>
                <Cell
                  radius={[0, 0, 0, 0] as any}
                  cursor="pointer"
                  onMouseEnter={() => setHoveredKey("desktop")}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    transition: "opacity 160ms, filter 160ms",
                    opacity: hoveredKey && hoveredKey !== "desktop" ? 0.65 : 1,
                    filter:
                      hoveredKey === "desktop" ? "brightness(1.08) saturate(1.1)" : "none",
                  }}
                />
              </Bar>

              {/* TABLET segment (right) — radius only on right ends */}
              <Bar dataKey="tablet" stackId="a" fill={TK.device.tablet.stroke}>
                <Cell
                  radius={[0, 6, 6, 0] as any}
                  cursor="pointer"
                  onMouseEnter={() => setHoveredKey("tablet")}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    transition: "opacity 160ms, filter 160ms",
                    opacity: hoveredKey && hoveredKey !== "tablet" ? 0.65 : 1,
                    filter:
                      hoveredKey === "tablet" ? "brightness(1.08) saturate(1.1)" : "none",
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cards */}
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => (
          <DeviceCard
            key={m.device}
            m={m}
            sharePct={share(m)}
            selected={selected === m.device}
            onToggle={() => setSelected((cur) => (cur === m.device ? null : m.device))}
          />
        ))}
      </div>

      {/* Comparison table */}
      <div
        className="mt-4 rounded-md border bg-white"
        style={{ borderColor: TK.border }}
      >
        <div
          className="sticky top-0 z-10 grid grid-cols-6 items-center border-b bg-white px-3 py-2 text-[13px] font-semibold"
          style={{ borderColor: TK.borderLight, color: TK.text }}
        >
          {(
            [
              ["device", "Device"],
              ["sessions", "Sessions"],
              ["avgTime", "Avg. Time"],
              ["pagesPerSession", "Pages / Session"],
              ["bounceRate", "Bounce %"],
              ["convRate", "CR"],
            ] as Array<[SortKey, string]>
          ).map(([key, label]) => {
            const active = sortBy === key;
            return (
              <button
                key={key}
                className="inline-flex items-center gap-1 text-left cursor-pointer"
                onClick={() => {
                  if (sortBy !== key) {
                    setSortBy(key);
                    setSortDir("desc");
                  } else {
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  }
                }}
                title={"Sort by " + label}
              >
                <span>{label}</span>
                {active ? (
                  sortDir === "asc" ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )
                ) : (
                  <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />
                )}
              </button>
            );
          })}
        </div>

        <div className="max-h-[340px] overflow-auto">
          {tableRows.map((m, i) => {
            const tone = TK.device[m.device];
            const bounceTone =
              m.bounceRate <= avgBounce - 2
                ? TK.ok
                : m.bounceRate >= avgBounce + 2
                ? TK.danger
                : TK.warn;
            const Icon = DEVICE_ICON[m.device];
            return (
              <div
                key={m.device}
                className="grid grid-cols-6 items-center px-3 py-2 text-sm hover:bg-[#FBFDFF]"
                style={{
                  borderTop: i === 0 ? "none" : `1px solid ${TK.borderLight}`,
                  color: TK.text,
                }}
              >
                <div className="inline-flex items-center gap-2">
                  {/* Branded icon + colored dot to match legend pattern */}
                  <Icon className="h-4 w-4" style={{ color: TK.brand }} />
                  <Dot color={tone.stroke} />
                  <span>{DEVICE_LABEL[m.device]}</span>
                </div>
                <div className="font-medium">{fmt.num(m.sessions)}</div>
                <div>{fmt.time(m.avgTime)}</div>
                <div>{fmt.one(m.pagesPerSession)}</div>
                <div className="inline-flex items-center gap-1">
                  <span
                    className="rounded px-1.5 py-0.5 text-[12px] font-medium"
                    style={{
                      background: `${bounceTone}20`,
                      color: bounceTone,
                      border: `1px solid ${bounceTone}33`,
                    }}
                    title={
                      m.bounceRate > avgBounce
                        ? `Above project avg (${fmt.pct(avgBounce)}) — check ${DEVICE_LABEL[m.device]} UX`
                        : `At/Below avg (${fmt.pct(avgBounce)})`
                    }
                  >
                    {fmt.pct(m.bounceRate)}
                  </span>
                  <Info className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <div>{fmt.pct(m.convRate)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter chip */}
      {selected && (
        <div className="mt-2 text-sm">
          <Chip onClear={() => setSelected(null)}>
            Filtered by: <strong>{DEVICE_LABEL[selected]}</strong>
          </Chip>
        </div>
      )}
    </section>
  );
}
