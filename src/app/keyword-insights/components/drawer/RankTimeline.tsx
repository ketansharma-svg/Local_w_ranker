"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  Line,
  Tooltip as RTooltip,
} from "recharts";
import {
  Download,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Globe2,
  ChevronDown,
} from "lucide-react";

/* ─────────────────────────────── TOKENS ─────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  panelBg: "#FFFFFF",
  appBg: "#F5F7FA",
  valueBlue: "#0A84FF",
  fillBlue: "#D2EFFF",
  prevGray: "#9CA3AF",
  danger: "#EF4444",
  radius: 8,
};

/* ─────────────────────────────── UTILITIES ─────────────────────────────── */
type Device = "desktop" | "mobile";
type RangeKey = "7d" | "30d" | "90d";
type Point = { date: string; rank: number | null; prev?: number | null };

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
const fullDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const dl = (blob: Blob, filename: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

const toCSV = (rows: Point[], device: Device, loc: string, kw: string, range: RangeKey) => {
  const header = "date,rank,device,location\n";
  const body = rows.map((r) => `${r.date},${r.rank ?? ""},${device},${loc}`).join("\n");
  return new Blob([header + body], { type: "text/csv;charset=utf-8" });
};

async function chartSvgToPng(chartEl: HTMLElement, filename: string) {
  const svg = chartEl.querySelector("svg");
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  const box = svg.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(box.width);
  canvas.height = Math.ceil(box.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) dl(blob, filename);
        resolve();
      });
    };
    img.src = dataUrl;
  });
}

/* demo series (local only) */
function makeDemoSeries(days: number): Point[] {
  const out: Point[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const base = 10 + Math.round(Math.sin((i / 7) * Math.PI) * 5) + Math.round(Math.random() * 3);
    const noisy = Math.max(1, Math.min(100, base + (Math.random() > 0.85 ? 10 : 0)));
    const isGap = Math.random() > 0.92;
    out.push({ date: iso, rank: isGap ? null : noisy });
  }
  return out;
}
function addPrev(series: Point[]): Point[] {
  return series.map((p) => ({
    ...p,
    prev: p.rank == null ? null : Math.max(1, Math.min(100, p.rank + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.round(Math.random() * 3)))),
  }));
}

/* ─────────────────────────────── ATOMS ─────────────────────────────── */
const Dot = ({ color }: { color: string }) => (
  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
);

const ChipBtn = ({
  active,
  children,
  onClick,
  title,
  disabled,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={`cursor-pointer rounded-full px-3 py-1.5 text-sm border ${
      active ? "font-medium" : "text-gray-600"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
    style={{ borderColor: active ? TK.brand : TK.border, background: active ? TK.appBg : "#fff" }}
  >
    {children}
  </button>
);

const Segmented = ({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: string;
  items: { value: string; label: React.ReactNode }[];
  onChange: (v: string) => void;
  ariaLabel?: string;
}) => (
  <div
    role="tablist"
    aria-label={ariaLabel || "segmented"}
    className="inline-flex overflow-hidden rounded-md border bg-white"
    style={{ borderColor: TK.border }}
  >
    {items.map((it) => (
      <button
        key={it.value}
        role="tab"
        aria-selected={value === it.value}
        onClick={() => onChange(it.value)}
        className={`cursor-pointer px-3 py-1.5 text-sm ${
          value === it.value ? "bg-[rgba(0,140,205,0.10)] text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        {it.label}
      </button>
    ))}
  </div>
);

const ToggleSwitch = ({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ borderColor: TK.border, color: TK.text }}
    title={label}
  >
    <span
      className="relative inline-flex h-5 w-9 items-center rounded-full border"
      style={{ borderColor: active ? TK.brand : TK.border, background: active ? "rgba(0,140,205,0.15)" : TK.appBg }}
      aria-hidden
    >
      <span
        className="absolute h-4 w-4 rounded-full transition-transform"
        style={{ background: active ? TK.brand : "#CBD5E1", transform: active ? "translateX(20px)" : "translateX(2px)" }}
      />
    </span>
    <span className="text-[13px]">{label}</span>
  </button>
);

/* Export dropdown */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onAway: () => void) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current) return;
      if (ref.current.contains(t)) return;
      onAway();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onAway]);
}

const ExportButton = ({
  disabled,
  onCSV,
  onPNG,
}: {
  disabled?: boolean;
  onCSV: () => void;
  onPNG: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: TK.border, color: TK.text }}
        title="Export"
      >
        <Download className="h-4 w-4" style={{ color: TK.brand }} />
        Export
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-40 rounded-md border bg-white p-1 shadow-xl"
          style={{ borderColor: TK.border }}
          role="menu"
          aria-label="Export options"
        >
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              onCSV();
              setOpen(false);
            }}
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              onPNG();
              setOpen(false);
            }}
          >
            <Download className="h-4 w-4" />
            PNG
          </button>
        </div>
      )}
    </div>
  );
};

/* Smart tooltip (popover) — colored dot annotations, NO CTAs */
const SmartTooltip = ({
  active,
  payload,
  label,
  showPrev,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  showPrev?: boolean;
}) => {
  if (!active || !payload || !payload.length) return null;
  const row: Point = payload[0].payload;
  const rank = typeof row.rank === "number" ? row.rank : null;
  const prev = typeof row.prev === "number" ? row.prev : null;

  return (
    <div
      className="rounded-md border bg-white p-2 shadow-xl"
      style={{ borderColor: TK.border, minWidth: 180 }}
    >
      <div className="mb-1 text-[12px] text-gray-500">{fullDate(label || "")}</div>
      <div className="space-y-1 text-[13px] text-gray-800">
        <div className="flex items-center gap-2">
          <Dot color={TK.valueBlue} />
          <span className="font-medium">Rank</span>
          <span className="ml-auto">{rank == null ? "—" : `#${rank}`}</span>
        </div>
        {showPrev && (
          <div className="flex items-center gap-2">
            <Dot color={TK.prevGray} />
            <span className="font-medium">Prev</span>
            <span className="ml-auto">{prev == null ? "—" : `#${prev}`}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────── MAIN COMPONENT ─────────────────────────────── */
export interface KeywordRankTimelineProps {
  keyword: string;
  projectDomain: string;
  initialDevice?: Device;
  initialLocationISO?: string;
  initialRange?: RangeKey;
  premium?: boolean;
}

export const KeywordRankTimeline: React.FC<KeywordRankTimelineProps> = ({
  keyword,
  projectDomain,
  initialDevice = "desktop",
  initialLocationISO = "US",
  initialRange = "30d",
  premium = true,
}) => {
  const [device, setDevice] = useState<Device>(initialDevice);
  const [locationISO, setLocationISO] = useState(initialLocationISO);
  const [range, setRange] = useState<RangeKey>(premium ? initialRange : "7d");
  const [comparePrev, setComparePrev] = useState<boolean>(premium);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const base = useMemo(() => makeDemoSeries(days), [days]);
  const data = useMemo(() => addPrev(base), [base]);

  /* keyboard-driven pinning */
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (!el.contains(document.activeElement)) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const len = data.length;
        const cur = pinnedIndex ?? activeIndex ?? len - 1;
        const next = Math.max(0, Math.min(len - 1, cur + (e.key === "ArrowRight" ? 1 : -1)));
        setPinnedIndex(next);
      }
      if (e.key === "Escape") setPinnedIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, pinnedIndex, data.length]);

  const allNull = data.every((p) => p.rank == null);
  const yMax = 100; // non‑inverted timeline (0..100 with ranks near bottom when low)
  const activeDate =
    pinnedIndex != null
      ? data[pinnedIndex]?.date
      : activeIndex != null
      ? data[activeIndex]?.date
      : undefined;

  /* export handlers (single button with dropdown) */
  const exportCSV = () => {
    const blob = toCSV(data, device, locationISO, keyword, range);
    const name = `rank-timeline_${keyword.replace(/\s+/g, "-")}_${device}_${locationISO}_${range}.csv`;
    dl(blob, name);
  };
  const exportPNG = async () => {
    if (!chartRef.current) return;
    const name = `rank-timeline_${keyword.replace(/\s+/g, "-")}_${device}_${locationISO}_${range}.png`;
    await chartSvgToPng(chartRef.current, name);
  };

  return (
    <section
      aria-label={`Rank timeline for '${keyword}'`}
      className="rounded-xl border bg-white"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-[#F5F7FA] px-3 py-2.5" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: TK.text }}>
          <CalendarClock className="h-5 w-5" style={{ color: TK.brand }} />
          Rank Timeline
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* timeframe chips */}
          {(["7d", "30d", "90d"] as RangeKey[]).map((rk) => {
            const locked = !premium && rk !== "7d";
            return (
              <ChipBtn
                key={rk}
                title={locked ? "Premium only" : `Last ${rk}`}
                active={range === rk}
                onClick={() => !locked && setRange(rk)}
                disabled={locked}
              >
                {rk.toUpperCase()}
              </ChipBtn>
            );
          })}

          {/* device segmented */}
          <Segmented
            ariaLabel="Device"
            value={device}
            onChange={(v) => setDevice(v as Device)}
            items={[
              { value: "desktop", label: <span className="inline-flex items-center gap-1"><Monitor className="h-4 w-4" style={{ color: TK.brand }} />Desktop</span> },
              { value: "mobile", label: <span className="inline-flex items-center gap-1"><Smartphone className="h-4 w-4" style={{ color: TK.brand }} />Mobile</span> },
            ]}
          />

          {/* location chip/select */}
          <div className="relative">
            <select
              aria-label="Location"
              value={locationISO}
              onChange={(e) => setLocationISO(e.target.value)}
              className="h-8 cursor-pointer rounded-md border bg-white pl-8 pr-2 text-sm"
              style={{ borderColor: TK.border, color: TK.text }}
            >
              {["US", "IN", "GB", "DE", "AU"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Globe2 className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: TK.brand }} />
          </div>

          {/* compare previous toggle */}
          <ToggleSwitch
            active={!!comparePrev}
            label="Compare previous"
            onClick={() => premium && setComparePrev((v) => !v)}
            disabled={!premium}
          />

          {/* single export with dropdown */}
          <ExportButton onCSV={exportCSV} onPNG={exportPNG} />
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} tabIndex={0} className="relative h-[260px] outline-none">
        {pinnedIndex != null && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 text-[12px] text-gray-500">
            <ChevronLeft className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
          </div>
        )}
        {allNull ? (
          <div className="grid h-full place-items-center text-sm text-gray-500">No rank data yet for the selected scope.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 12, bottom: 8, left: 8 }}
              onMouseMove={(e: any) =>
                setActiveIndex(e && typeof e.activeTooltipIndex === "number" ? e.activeTooltipIndex : null)
              }
              onClick={(e: any) =>
                setPinnedIndex(
                  e && typeof e.activeTooltipIndex === "number" ? (e.activeTooltipIndex as number) : null
                )
              }
            >
              <CartesianGrid stroke={TK.borderLight} vertical={false} />

              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fontSize: 12, fill: TK.muted }}
                stroke={TK.border}
                interval="preserveStartEnd"
              />

              {/* NON‑INVERTED axis (lower rank near bottom, higher rank near top) */}
              <YAxis
                domain={[0, yMax]}
                ticks={[0, 10, 20, 50, 100]}
                tickFormatter={(v) => String(v)}
                width={36}
                tick={{ fontSize: 12, fill: TK.muted }}
                stroke={TK.border}
              />

              {/* Current period */}
              <Area
                type="monotone"
                dataKey="rank"
                stroke={TK.valueBlue}
                fill={TK.fillBlue}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
                activeDot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="rank"
                stroke={TK.valueBlue}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />

              {/* Previous period (optional) */}
              {comparePrev && premium && (
                <Line
                  type="monotone"
                  dataKey="prev"
                  stroke={TK.prevGray}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}

              {/* Smart popover with colored dot annotations; NO CTAs */}
              <RTooltip
                content={<SmartTooltip showPrev={comparePrev && premium} />}
                cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between border-t px-3 py-2 text-[12px]" style={{ borderColor: TK.border, color: TK.muted }}>
        <div>
          <strong className="text-gray-900">{keyword}</strong> • {device === "desktop" ? "Desktop" : "Mobile"} • {locationISO} • Domain: {projectDomain}
        </div>
        <div>{activeIndex != null || pinnedIndex != null ? `Pinned: ${fullDate(activeDate || "")}` : "Use mouse or ← / → to inspect • Click to pin"}</div>
      </div>
    </section>
  );
};

/* ─────────────────────────────── DEMO (optional) ─────────────────────────────── */
export default function DemoRankTimeline() {
  return (
    <div className="bg-[#F5F7FA] p-4">
      <KeywordRankTimeline keyword="keyword research" projectDomain="wranker.com" premium />
    </div>
  );
}

