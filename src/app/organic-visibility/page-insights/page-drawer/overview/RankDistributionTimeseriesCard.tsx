"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Rectangle,
  Cell,
} from "recharts";
import {
  Calendar,
  Download,
  ChevronDown,
  Percent,
  BarChart3,
} from "lucide-react";

/* ============================================================
   Latest design tokens (with CSS var fallbacks)
   ============================================================ */
const TOKENS = {
  // Brand & UI
  brand: "var(--wr-brand, #008CCD)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  surface: "var(--wr-surface, #FFFFFF)",
  grid: "var(--wr-grid, #EFF0F6)",
  cursor: "rgba(0,140,205,0.08)",

  // Chart palette (latest suite)
  valueBlue: "var(--wr-value-blue, #0077FF)",
  success: "var(--wr-success, #10B981)",
  warn: "var(--wr-warning, #F59E0B)",
  danger: "var(--wr-danger, #EF4444)",
  gray: "var(--wr-gray, #9CA3AF)",
};

/* Rank bucket colors (use latest palette) */
const COLORS: Record<string, string> = {
  top3: TOKENS.success,       // Pos 1–3
  top4_10: "#60A5FA",         // Pos 4–10 (light blue)
  top11_20: TOKENS.valueBlue, // Pos 11–20
  top21_50: TOKENS.warn,      // Pos 21–50
  top51_100: TOKENS.gray,     // Pos 51–100
};

const LABELS: Record<string, string> = {
  top3: "Top 1–3",
  top4_10: "Top 4–10",
  top11_20: "Top 11–20",
  top21_50: "Top 21–50",
  top51_100: "Top 51–100",
};

const STACK_ORDER = ["top51_100", "top21_50", "top11_20", "top4_10", "top3"]; // bottom -> top

type SnapshotPoint = {
  date: string;          // YYYY-MM-DD
  top3: number;
  top4_10: number;
  top11_20: number;
  top21_50: number;
  top51_100: number;
};

/* ============================================================
   Demo data (safe fallback if no props.data provided)
   ============================================================ */
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function makeDemoSeries(days = 30): SnapshotPoint[] {
  const out: SnapshotPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 260 + Math.round(40 * Math.sin((i + 3) / 4));
    const top3 = Math.max(0, Math.round(0.08 * base + Math.sin(i / 6) * 3));
    const top4_10 = Math.max(0, Math.round(0.18 * base + Math.cos(i / 7) * 5));
    const top11_20 = Math.max(0, Math.round(0.26 * base + Math.sin(i / 8) * 6));
    const top21_50 = Math.max(0, Math.round(0.30 * base + Math.cos(i / 9) * 7));
    const top51_100 = Math.max(0, Math.round(0.18 * base + Math.sin(i / 5) * 4));
    out.push({
      date: fmt(d),
      top3,
      top4_10,
      top11_20,
      top21_50,
      top51_100,
    });
  }
  return out;
}

/* ============================================================
   Utilities (export, formatting)
   ============================================================ */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const pf = (n: number, fd = 0) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(n)}%`;

function download(filename: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function exportPNGFromSvg(container: HTMLDivElement | null, filename = "rank_distribution.png") {
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

function exportCSV(
  data: SnapshotPoint[],
  visible: Record<string, boolean>,
  mode: "counts" | "share"
) {
  const activeKeys = STACK_ORDER.filter((k) => visible[k]);
  const header = ["date", ...activeKeys.map((k) => (mode === "share" ? `${k}_pct` : k))].join(",");
  const lines = data.map((row) => {
    const total = activeKeys.reduce((s, k) => s + (row as any)[k], 0) || 1;
    const cols = [row.date, ...activeKeys.map((k) => {
      const v = (row as any)[k] ?? 0;
      return mode === "share" ? ((v / total) * 100).toFixed(2) : String(v);
    })];
    return cols.join(",");
  });
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  download("rank_distribution.csv", url);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function toShortLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function dateAdd(iso: string, offsetDays: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + offsetDays);
  return fmt(d);
}

/* ============================================================
   Rounded-top-only bar shape (for top segments)
   ============================================================ */
function RoundedTopRect(props: any) {
  const { x, y, width, height, fill, radius = [6, 6, 0, 0] } = props;
  if (height <= 0 || width <= 0) return null;
  return (
    <g style={{ cursor: "pointer" }}>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={radius} />
    </g>
  );
}

/* ============================================================
   Header Controls (Export, Legend chips, Date range)
   ============================================================ */
function ExportMenu({
  onPNG,
  onCSV,
  onPDF,
}: {
  onPNG: () => void;
  onCSV: () => void;
  onPDF?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: TOKENS.border, background: "#fff", color: TOKENS.text }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Export"
      >
        <Download className="h-4 w-4" color={TOKENS.brand as string} />
        Export
        <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-md border bg-white shadow-lg"
          style={{ borderColor: TOKENS.border }}
          role="menu"
        >
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              setOpen(false);
              onPNG();
            }}
          >
            PNG
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              setOpen(false);
              onCSV();
            }}
          >
            CSV
          </button>
          <button
            className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
            title="PDF export is routed via Reports (Pro)"
            onClick={() => {
              setOpen(false);
              onPDF?.();
            }}
          >
            PDF (via Reports)
          </button>
        </div>
      )}
    </div>
  );
}

function LegendChips({
  visible,
  onToggle,
}: {
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const items = ["top3", "top4_10", "top11_20", "top21_50", "top51_100"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((key) => {
        const active = !!visible[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[12px] sm:text-sm transition hover:bg-gray-50 cursor-pointer"
            style={{
              borderColor: TOKENS.border,
              background: active ? "rgba(0,140,205,0.08)" : "#FFFFFF",
              color: active ? TOKENS.text : TOKENS.muted,
            }}
            aria-pressed={active}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: COLORS[key] }}
            />
            <span className={active ? "font-medium" : "font-normal"}>{LABELS[key]}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   Tooltips — use colored dot annotation for values
   ============================================================ */
function TimeseriesTooltip({
  active,
  payload,
  label,
  visibleKeys,
  mode,
}: any) {
  if (!active || !payload || !payload.length) return null;

  // Aggregate visible rows only
  const rows: Array<{ key: string; label: string; value: number; color: string }> = [];
  let total = 0;
  payload.forEach((p: any) => {
    if (!p || !p.dataKey) return;
    const k = p.dataKey as string;
    if (visibleKeys[k]) {
      const val = Number(p.payload[k] ?? 0);
      rows.push({ key: k, label: LABELS[k], value: val, color: COLORS[k] });
      total += val;
    }
  });

  return (
    <div
      className="rounded-lg border bg-white p-3 shadow-sm"
      style={{ borderColor: TOKENS.border, pointerEvents: "none" }}
      role="tooltip"
    >
      <div className="mb-1 text-[12px] font-medium" style={{ color: TOKENS.muted }}>
        {toShortLabel(label)}
      </div>
      <div className="space-y-1">
        {rows
          .sort((a, b) => STACK_ORDER.indexOf(b.key) - STACK_ORDER.indexOf(a.key))
          .map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 text-[13px]">
              <div className="flex items-center gap-2">
                {/* colored dot annotation */}
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: r.color }} />
                <span>{r.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{nf(r.value)}</span>
                {mode === "share" && (
                  <span className="text-[12px]" style={{ color: TOKENS.muted }}>
                    {pf(total > 0 ? (r.value / total) * 100 : 0, 1)}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function SingleDayTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const bucket = p?.payload?.bucket || p?.dataKey;
  const bucketLabel = p?.payload?.bucketLabel || LABELS[bucket] || "";
  const value = Number(p?.payload?.value ?? p?.value ?? 0);
  const share = Number(p?.payload?.share ?? 0);
  const color = COLORS[bucket as string] || TOKENS.gray;

  return (
    <div
      className="rounded-lg border bg-white p-3 shadow-sm"
      style={{ borderColor: TOKENS.border, pointerEvents: "none" }}
      role="tooltip"
    >
      <div className="mb-1 text-[12px] font-medium" style={{ color: TOKENS.muted }}>
        {bucketLabel}
      </div>
      <div className="flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-2">
          {/* colored dot annotation */}
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
          <span>Keywords</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{nf(value)}</span>
          {mode === "share" && (
            <span className="text-[12px]" style={{ color: TOKENS.muted }}>
              {pf(share, 1)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 text-[12px]" style={{ color: TOKENS.muted }}>
        Snapshot: {toShortLabel(label)}
      </div>
    </div>
  );
}

/* ============================================================
   Main component
   ============================================================ */
export default function RankDistributionTimeseriesCard({
  title = "Rank Distribution", // UPDATED default title
  data,
  defaultDays = 7,
  showSingleDayAs = "grouped", // 'grouped' | 'stacked' (kept for API parity; current UI uses grouped)
  onSelectBracket,
}: {
  title?: string;
  data?: SnapshotPoint[];
  defaultDays?: number;
  showSingleDayAs?: "grouped" | "stacked";
  onSelectBracket?: (args: { bracket: "1-3" | "4-10" | "11-20" | "21-50" | "51-100"; date: string }) => void;
}) {
  const raw: SnapshotPoint[] = Array.isArray(data) && data.length ? data : makeDemoSeries(Math.max(defaultDays, 7));

  // min/max from data for robust time filtering
  const minDate = raw[0]?.date ?? fmt(new Date());
  const maxDate = raw[raw.length - 1]?.date ?? fmt(new Date());

  // Date range controls
  const defaultEnd = maxDate;
  const defaultStart =
    raw[Math.max(0, raw.length - defaultDays)]?.date ?? dateAdd(defaultEnd, -(defaultDays - 1));

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Ensure valid bounds & ordering when inputs change
  useEffect(() => {
    // Clamp to data bounds
    let s = startDate < minDate ? minDate : startDate > maxDate ? maxDate : startDate;
    let e = endDate < minDate ? minDate : endDate > maxDate ? maxDate : endDate;
    // Auto-correct ordering
    if (s > e) {
      // If user dragged start past end, snap end to start (or vice versa on end change)
      e = s;
    }
    if (s !== startDate) setStartDate(s);
    if (e !== endDate) setEndDate(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDate, maxDate]);

  // Counts vs % Share
  const [mode, setMode] = useState<"counts" | "share">("counts");

  // Visible segments
  const [visible, setVisible] = useState<Record<string, boolean>>({
    top3: true,
    top4_10: true,
    top11_20: true,
    top21_50: true,
    top51_100: true,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Slice by date range (inclusive, clamped)
  const windowed = useMemo(() => {
    const s = startDate < minDate ? minDate : startDate;
    const e = endDate > maxDate ? maxDate : endDate;
    const list = raw.filter((r) => r.date >= s && r.date <= e);
    // Always keep at least 1 point (the end bound)
    return list.length ? list : [raw[raw.length - 1]];
  }, [raw, startDate, endDate, minDate, maxDate]);

  const isSingleDay = windowed.length === 1;

  // Normalize to % share if needed
  const stackedData = useMemo(() => {
    if (mode === "counts") return windowed;
    return windowed.map((row) => {
      const sum = STACK_ORDER.filter((k) => visible[k]).reduce((s, k) => s + (row as any)[k], 0) || 1;
      const out: any = { date: row.date };
      STACK_ORDER.forEach((k) => {
        out[k] = visible[k] ? ((row as any)[k] / sum) * 100 : 0;
      });
      return out as SnapshotPoint;
    });
  }, [windowed, mode, visible]);

  // For single day grouped bars
  const singleDayBuckets = useMemo(() => {
    if (!isSingleDay) return [];
    const r = windowed[0];
    const total = STACK_ORDER.filter((k) => visible[k]).reduce((s, k) => s + (r as any)[k], 0) || 1;
    return STACK_ORDER
      .filter((k) => visible[k])
      .map((k) => ({
        bucket: k,
        bucketLabel: LABELS[k],
        value: (r as any)[k],
        share: ((r as any)[k] / total) * 100,
      }));
  }, [windowed, isSingleDay, visible]);

  // Which segment is topmost for each date (for rounded corners)
  const topKeyByIndex = useMemo(() => {
    if (isSingleDay) return [];
    return stackedData.map((row) => {
      for (let i = STACK_ORDER.length - 1; i >= 0; i--) {
        const key = STACK_ORDER[i];
        if (!visible[key]) continue;
        const v = (row as any)[key];
        if (v > 0) return key;
      }
      return null;
    });
  }, [stackedData, visible, isSingleDay]);

  const toggleKey = (key: string) => setVisible((v) => ({ ...v, [key]: !v[key] }));

  const quickRange = (days: number) => {
    const last = maxDate;
    const proposedStart = dateAdd(last, -(days - 1));
    const boundedStart = proposedStart < minDate ? minDate : proposedStart;
    setEndDate(last);
    setStartDate(boundedStart);
  };

  const toBracket = (k: string): "1-3" | "4-10" | "11-20" | "21-50" | "51-100" => {
    switch (k) {
      case "top3":
        return "1-3";
      case "top4_10":
        return "4-10";
      case "top11_20":
        return "11-20";
      case "top21_50":
        return "21-50";
      default:
        return "51-100";
    }
  };

  const snapshotCopy = useMemo(() => {
    const diff =
      (new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) /
        (1000 * 3600 * 24) +
      1;
    const daysTxt = diff > 1 ? `Last ${diff} days` : "Single day";
    return `${daysTxt} • snapshot on ${endDate}`;
  }, [startDate, endDate]);

  const xTickCount = isSingleDay ? 1 : Math.min(10, stackedData.length);

  /* --------------------------- Render --------------------------- */
  return (
    <section
      className="w-full rounded-2xl border bg-white shadow-sm mt-4"
      style={{
        borderColor: TOKENS.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-start gap-2">
          <BarChart3 className="mt-[2px] h-5 w-5" color={TOKENS.brand as string} />
          <div>
            <h3 className="text-[16px] font-semibold sm:text-[18px]" style={{ color: TOKENS.text }}>
              {title}
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: TOKENS.muted }}>
              {snapshotCopy}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Counts | % Share toggle */}
          <div
            className="inline-flex items-center rounded-md border"
            style={{ borderColor: TOKENS.border }}
            role="tablist"
            aria-label="Value mode"
          >
            <button
              type="button"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${
                mode === "counts" ? "font-semibold bg-[rgba(0,140,205,0.08)]" : "font-medium"
              }`}
              style={{ color: TOKENS.text }}
              onClick={() => setMode("counts")}
              aria-selected={mode === "counts"}
            >
              <BarChart3 className="h-4 w-4" color={TOKENS.brand as string} />
              Counts
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${
                mode === "share" ? "font-semibold bg-[rgba(0,140,205,0.08)]" : "font-medium"
              }`}
              style={{ color: TOKENS.text }}
              onClick={() => setMode("share")}
              aria-selected={mode === "share"}
            >
              <Percent className="h-4 w-4" color={TOKENS.brand as string} />
              % Share
            </button>
          </div>

          {/* Date range */}
          <div
            className="ml-1 inline-flex items-center gap-2 rounded-md border px-2 py-1"
            style={{ borderColor: TOKENS.border }}
            aria-label="Date range"
          >
            <Calendar className="h-4 w-4" color={TOKENS.brand as string} />
            <input
              type="date"
              value={startDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                const v = e.target.value;
                const clamped = v < minDate ? minDate : v > maxDate ? maxDate : v;
                setStartDate((prev) => {
                  // keep order valid
                  if (clamped > endDate) setEndDate(clamped);
                  return clamped;
                });
              }}
              className="h-7 rounded border px-2 text-sm"
              style={{ borderColor: TOKENS.border }}
            />
            <span className="text-sm" style={{ color: TOKENS.muted }}>
              —
            </span>
            <input
              type="date"
              value={endDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                const v = e.target.value;
                const clamped = v < minDate ? minDate : v > maxDate ? maxDate : v;
                setEndDate((prev) => {
                  if (clamped < startDate) setStartDate(clamped);
                  return clamped;
                });
              }}
              className="h-7 rounded border px-2 text-sm"
              style={{ borderColor: TOKENS.border }}
            />
          </div>

          {/* Quick presets */}
          <div className="inline-flex items-center rounded-md border" style={{ borderColor: TOKENS.border }}>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => quickRange(d)}
                className="px-2.5 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                title={`Last ${d} days`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Export */}
          <ExportMenu
            onPNG={() => exportPNGFromSvg(containerRef.current)}
            onCSV={() => exportCSV(windowed, visible, mode)}
          />
        </div>
      </div>

      <div className="border-t" style={{ borderColor: TOKENS.border }} />

      {/* Chart + Legends (legends at top-left of chart area) */}
      <div ref={containerRef} className="relative p-4">
        {/* Legends overlay (top-left of chart area) */}
        <div className="pointer-events-auto absolute left-4 top-2 z-10">
          <LegendChips visible={visible} onToggle={toggleKey} />
        </div>

        {/* INCREASED HEIGHT to avoid overlap with legends */}
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {!isSingleDay ? (
              <BarChart data={stackedData} margin={{ top: 36, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={TOKENS.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickMargin={8}
                  interval="preserveStart"
                  tickFormatter={toShortLabel}
                  tickCount={Math.min(10, stackedData.length)}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickMargin={8}
                  allowDecimals={false}
                  domain={mode === "share" ? [0, 100] : ["auto", "auto"]}
                  tickFormatter={(v) => (mode === "share" ? `${v}%` : String(v))}
                />
                <Tooltip
                  cursor={{ fill: TOKENS.cursor }}
                  content={<TimeseriesTooltip visibleKeys={visible} mode={mode} />}
                />
                {STACK_ORDER.map((key) =>
                  visible[key] ? (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={COLORS[key]}
                      isAnimationActive={false}
                      shape={(props: any) => {
                        const isTop = topKeyByIndex[props.index] === key;
                        const r = isTop ? [6, 6, 0, 0] : [0, 0, 0, 0];
                        return <RoundedTopRect {...props} radius={r} fill={COLORS[key]} />;
                      }}
                      onClick={(_entry: any, idx: number) => {
                        onSelectBracket?.({ bracket: toBracket(key), date: stackedData[idx].date });
                      }}
                    />
                  ) : null
                )}
              </BarChart>
            ) : (
              // SINGLE-DAY: grouped bars per bucket
              <BarChart data={singleDayBuckets} margin={{ top: 36, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={TOKENS.grid} />
                <XAxis dataKey="bucketLabel" tick={{ fontSize: 12, fill: "#6B7280" }} tickMargin={8} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickMargin={8}
                  allowDecimals={false}
                  domain={mode === "share" ? [0, 100] : ["auto", "auto"]}
                  tickFormatter={(v) => (mode === "share" ? `${v}%` : String(v))}
                />
                <Tooltip
                  cursor={{ fill: TOKENS.cursor }}
                  content={<SingleDayTooltip label={windowed[0].date} mode={mode} />}
                />
                <Bar
                  dataKey={mode === "share" ? "share" : "value"}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                  className="cursor-pointer"
                  onClick={(entry: any) => {
                    onSelectBracket?.({ bracket: toBracket(entry.bucket), date: windowed[0].date });
                  }}
                >
                  {singleDayBuckets.map((row: any) => (
                    <Cell key={row.bucket} fill={COLORS[row.bucket]} className="cursor-pointer" />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* NOTE: Per request, removed the bottom-left "Top 10" & "Top 20" chips */}
    </section>
  );
}

/* ============================================================
   Demo wrapper (remove in prod)
   ============================================================ */
export function Demo_RankDistribution() {
  const series = useMemo(() => makeDemoSeries(28), []);
  const handleSelect = (args: { bracket: string; date: string }) => {
    console.log("Navigate to Keywords tab with filter:", args);
  };

  return (
    <div className="mx-auto max-w-6xl p-6" style={{ background: "#F5F7FA" }}>
      <RankDistributionTimeseriesCard
        title="Rank Distribution"
        data={series}
        defaultDays={7}
        showSingleDayAs="grouped"
        onSelectBracket={handleSelect}
      />
    </div>
  );
}

