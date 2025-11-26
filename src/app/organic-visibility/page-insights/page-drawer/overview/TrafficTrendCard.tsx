"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  AreaChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Rectangle,
} from "recharts";
import {
  Calendar,
  BarChart3,
  AreaChart as AreaChartIcon,
  ChevronDown,
  Download,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  brand: "var(--wr-brand, #008CCD)",               // branded blue
  valueBlue: "var(--wr-value-blue, #4286F5)",
  pastelBlue: "var(--wr-pastel-blue, #D9EEF8)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  card: "var(--wr-card, #FFFFFF)",
  cursor: "rgba(0,140,205,0.10)",                  // brand‑tinted hover
};

/* ───────────────────────── Utilities ───────────────────────── */
type Pt = { date: string; value: number | null; label?: string };
const fmtNum = (n: number) => new Intl.NumberFormat().format(n);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

const daysArray = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });

/** Group into weeks (Sun‑Sat blocks) for the last ~4–5 labels */
function toWeeks(series: Pt[]) {
  const weeks: Pt[] = [];
  let acc = 0;
  let count = 0;
  for (let i = 0; i < series.length; i++) {
    const d = new Date(series[i].date);
    acc += series[i].value ?? 0;
    count += series[i].value == null ? 0 : 1;
    const isLast = i === series.length - 1;
    const isSat = d.getDay() === 6;
    if (isSat || isLast) {
      const start = new Date(series[i].date);
      start.setDate(d.getDate() - (count - 1));
      const label = `${start.toLocaleDateString(undefined, { month: "short", day: "2-digit" })} – ${fmtDate(
        series[i].date
      )}`;
      weeks.push({
        date: series[i].date,
        value: count ? Math.round(acc) : 0,
        label,
      });
      acc = 0;
      count = 0;
    }
  }
  return weeks;
}

/* ───────────────────────── Exports ───────────────────────── */
function download(filename: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function exportCSV(series: Pt[], filename = "page-traffic-trend_30d.csv") {
  const header = "date,value";
  const lines = series.map((d) => `${d.date},${d.value ?? ""}`);
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  download(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function exportPNGFromSvg(container: HTMLElement | null, filename = "page-traffic-trend_30d.png") {
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const rect = svg.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx?.drawImage(img, 0, 0);
    download(filename, canvas.toDataURL("image/png"));
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
}

/* ───────────────────────── Demo Data (30d) ───────────────────────── */
function makeDemo30d(): Pt[] {
  const dates = daysArray(30);
  return dates.map((iso, i) => {
    const base = 420 + Math.sin(i / 3.8) * 80 + Math.cos(i / 1.9) * 20;
    const noise = (Math.random() - 0.5) * 18;
    const v = Math.round(Math.max(120, base + noise));
    return { date: iso, value: v, label: fmtDate(iso) };
  });
}

/* ───────────────────────── Smart Tooltip (no prev‑day; colored dot) ───────────────────────── */
function SmartTooltip({
  active,
  payload,
  label,
  pinned,
}: any & { pinned?: boolean }) {
  if ((!active && !pinned) || !payload?.length) return null;
  const v = Number(payload[0]?.value ?? 0);
  return (
    <div
      className="rounded-md border bg-white px-3 py-2 shadow-sm"
      style={{ borderColor: TK.border, pointerEvents: "none", minWidth: 180 }}
      role="tooltip"
    >
      <div className="text-[12px]" style={{ color: TK.muted }}>
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {/* colored dot annotation for the value */}
        <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TK.valueBlue }} />
        <span className="text-[12px]" style={{ color: TK.muted }}>Visits</span>
        <span className="ml-auto text-[14px] font-semibold" style={{ color: TK.text }}>
          {fmtNum(v)}
        </span>
      </div>
      {pinned && (
        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
          Pinned — click again to unpin
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Rounded bar (top only) + hover anim ───────────────────────── */
function RoundedBar({
  x,
  y,
  width,
  height,
  fill,
  radius = [6, 6, 0, 0],
  isHovered = false,
}: any) {
  if (width <= 0 || height <= 0) return null;
  return (
    <g
      style={{
        transformOrigin: `${x + width / 2}px ${y + height}px`,
        transform: isHovered ? "scaleY(1.06)" : "scaleY(1)",
        cursor: "pointer",
      }}
    >
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={radius} />
    </g>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
export default function TrafficTrendCard({
  title = "Traffic Trend",
  series: inputSeries,
  defaultView = "bar", // 'bar' | 'area'
  defaultScale = "day", // 'day' | 'week'
}: {
  title?: string;
  series?: Pt[];
  defaultView?: "bar" | "area";
  defaultScale?: "day" | "week";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<"bar" | "area">(defaultView);
  const [scale, setScale] = useState<"day" | "week">(defaultScale);
  const raw = useMemo(
    () => (Array.isArray(inputSeries) && inputSeries.length ? inputSeries : makeDemo30d()),
    [inputSeries]
  );

  // Normalize to chart data (day vs week)
  const data = useMemo(() => {
    const prepared = raw.map((d) => ({ ...d, label: d.label ?? fmtDate(d.date) }));
    return scale === "week" ? toWeeks(prepared) : prepared;
  }, [raw, scale]);

  // Tooltip pin/hover index
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const activeIdx = pinnedIdx ?? hoverIdx ?? null;

  // Keyboard quick nav (← / → on chart area)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current) return;
      const within = containerRef.current.contains(document.activeElement);
      if (!within) return;
      if (e.key === "ArrowRight") {
        setPinnedIdx((i) => (i == null ? 0 : Math.min(data.length - 1, i + 1)));
      } else if (e.key === "ArrowLeft") {
        setPinnedIdx((i) => (i == null ? data.length - 1 : Math.max(0, i - 1)));
      } else if (e.key === "Escape") {
        setPinnedIdx(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data.length]);

  const hasData = data.some((d) => typeof d.value === "number");

  // Axes tick formatters
  const xTick = (v: any) => (typeof v === "string" ? v : String(v));
  const yTick = (v: number) => fmtNum(v);

  /* Modular chip */
  const Chip = ({ active, onClick, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium cursor-pointer transition
                  ${active ? "ring-1 ring-[rgba(0,140,205,0.25)]" : ""} hover:bg-gray-50`}
      style={{
        borderColor: TK.border,
        background: active ? "rgba(0,140,205,0.08)" : "#FFFFFF",
        color: TK.text,
      }}
    >
      {children}
    </button>
  );

  return (
    <section
      className="w-full rounded-xl border bg-white shadow-sm mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Estimated organic visits trend"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Branded icon for section title */}
          <BarChart3 className="h-5 w-5" color={TK.brand as string} />
          <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
            {title}
          </h3>
          <span
            className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px]"
            style={{ borderColor: TK.border, color: TK.muted }}
            title="Fixed scope for this card"
          >
            <Calendar className="h-3.5 w-3.5" color={TK.brand as string} />
            Last 30 days
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Day / Week chips (modular) */}
          <Chip active={scale === "day"} onClick={() => setScale("day")}>Day</Chip>
          <Chip active={scale === "week"} onClick={() => setScale("week")}>Week</Chip>

          {/* View toggle (modular segmented) */}
          <div
            className="ml-1 inline-flex items-center overflow-hidden rounded-md border"
            style={{ borderColor: TK.border }}
          >
            <button
              type="button"
              title="Bar view"
              onClick={() => setView("bar")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${
                view === "bar" ? "font-semibold bg-[rgba(0,140,205,0.08)]" : "font-medium"
              }`}
            >
              <BarChart3 className="h-4 w-4" color={TK.brand as string} />
              Bar
            </button>
            <button
              type="button"
              title="Area view"
              onClick={() => setView("area")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${
                view === "area" ? "font-semibold bg-[rgba(0,140,205,0.08)]" : "font-medium"
              }`}
            >
              <AreaChartIcon className="h-4 w-4" color={TK.brand as string} />
              Area
            </button>
          </div>

          {/* Export (modular button) */}
          <ExportMenu
            onPNG={() => exportPNGFromSvg(containerRef.current)}
            onCSV={() => exportCSV(data)}
            onPDF={() => {
              /* gated / placeholder */
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: TK.border }} />

      {/* Chart body */}
      <div
        ref={containerRef}
        className="relative p-4 outline-none cursor-pointer"
        tabIndex={0}
        aria-label={`Estimated organic visits trend for this page over the last 30 days.`}
      >
        <div className="h-[320px] w-full">
          {!hasData ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {view === "bar" ? (
                <BarChart
                  data={data}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => setPinnedIdx((i) => (hoverIdx == null ? i : hoverIdx))}
                  onMouseMove={(state: any) => {
                    if (!state?.isTooltipActive) {
                      setHoverIdx(null);
                      return;
                    }
                    const idx = state.activeTooltipIndex ?? null;
                    setHoverIdx(idx);
                  }}
                >
                  <CartesianGrid vertical={false} stroke={TK.borderLight} />
                  <XAxis
                    dataKey={(d: Pt) => d.label}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    tickFormatter={xTick}
                    axisLine={{ stroke: TK.border }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    tickMargin={8}
                    allowDecimals={false}
                    tickFormatter={yTick}
                    axisLine={{ stroke: TK.border }}
                  />

                  {/* Smart Tooltip (pinnable) — colored dot, no "vs prev day" */}
                  <Tooltip
                    cursor={{ fill: TK.cursor }}
                    content={<SmartTooltip pinned={pinnedIdx != null} />}
                    formatter={(v: any) => [v, "Visits"]}
                    labelFormatter={(lab: any, payload: any) => payload?.[0]?.payload?.label ?? lab}
                  />

                  {/* Bars with top rounding + hover animation */}
                  <Bar
                    dataKey="value"
                    name="Visits"
                    fill={TK.valueBlue}
                    isAnimationActive={false}
                    shape={(props: any) => {
                      const isHovered = props?.index === activeIdx;
                      return (
                        <RoundedBar
                          {...props}
                          radius={[6, 6, 0, 0]}
                          isHovered={isHovered}
                          fill={TK.valueBlue}
                        />
                      );
                    }}
                  />
                </BarChart>
              ) : (
                <AreaChart
                  data={data}
                  onMouseLeave={() => setHoverIdx(null)}
                  onMouseMove={(state: any) =>
                    setHoverIdx(state?.isTooltipActive ? state.activeTooltipIndex ?? null : null)
                  }
                  onClick={() => setPinnedIdx((i) => (hoverIdx == null ? i : hoverIdx))}
                >
                  <defs>
                    <linearGradient id="gradAreaTT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TK.valueBlue} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={TK.pastelBlue} stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={TK.borderLight} />
                  <XAxis
                    dataKey={(d: Pt) => d.label}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    tickFormatter={xTick}
                    axisLine={{ stroke: TK.border }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                    tickMargin={8}
                    allowDecimals={false}
                    tickFormatter={yTick}
                    axisLine={{ stroke: TK.border }}
                  />
                  <Tooltip
                    cursor={{ stroke: TK.border, strokeOpacity: 0.35 }}
                    content={<SmartTooltip pinned={pinnedIdx != null} />}
                    formatter={(v: any) => [v, "Visits"]}
                    labelFormatter={(lab: any, payload: any) => payload?.[0]?.payload?.label ?? lab}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={TK.valueBlue}
                    fill="url(#gradAreaTT)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Export menu (modular button) ───────────────────────── */
function ExportMenu({
  onPNG,
  onCSV,
  onPDF,
}: {
  onPNG?: () => void;
  onCSV?: () => void;
  onPDF?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium cursor-pointer hover:bg-gray-50"
        style={{ borderColor: TK.border, color: TK.text, background: "#FFFFFF" }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Export"
      >
        <Download className="h-4 w-4" color={TK.brand as string} />
        Export
        <ChevronDown className="h-3.5 w-3.5" color={"#9CA3AF"} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-md border bg-white shadow-lg"
          style={{ borderColor: TK.border }}
          role="menu"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              setOpen(false);
              onPNG?.();
            }}
          >
            PNG
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              setOpen(false);
              onCSV?.();
            }}
          >
            CSV
          </button>
          <button
            className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
            title="PDF export is Pro (gated)"
            onClick={() => {
              setOpen(false);
              onPDF?.();
            }}
          >
            PDF (Pro)
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Empty/Skeleton ───────────────────────── */
function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border" style={{ borderColor: TK.borderLight }}>
      <div className="text-sm" style={{ color: TK.muted }}>
        No data yet for selected range.
      </div>
    </div>
  );
}

