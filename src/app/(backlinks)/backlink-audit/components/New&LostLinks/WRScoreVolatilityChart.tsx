"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import {
  LineChart as LineChartIcon,
  Waves,
  Info,
  Calendar,
  ChevronDown,
  Download,
} from "lucide-react";

/* =============================================================================
   Section 4 — WR Score Volatility (Redesigned)
   - Inter / Inter Fallback fonts; no emoji
   - Latest tokens from recent designs
   - Branded (#008CCD) icons near title
   - Pointer cursor on interactive elements
   - Export button placed at the TOP RIGHT of the header
   - Info tooltip icon next to title (popover content)
   - Date Range uses a drop‑down filter chip
   - Selected chips use brand pastel color
   ========================================================================== */

/* ---------- TOKENS (aligned with recent designs) ---------- */
const TK = {
  brand: "#008CCD",
  action: "#0077FF",
  pastel: "#D9EEF8",

  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",

  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  subtle: "#F5F7FA",

  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
} as const;

/* ---------- Types ---------- */
type TimeRangeKey = "30d" | "90d" | "6m" | "1y" | "all" | "custom";
type IntervalKey = "daily" | "weekly" | "monthly";
type ViewKey = "line" | "area";

export type WrVolPoint = {
  date: string | Date;
  wr: number; // 0–100
  newLinks?: number;
  lostLinks?: number;
  note?: string;
};

export type WrScoreVolatilityProps = {
  title?: string;
  data?: WrVolPoint[];
  defaultRange?: Exclude<TimeRangeKey, "custom">;
  defaultView?: ViewKey;
  onDrilldown?: (args: {
    date: Date;
    metric: "score" | "new" | "lost";
    change?: "up" | "down";
    range: TimeRangeKey;
    interval: IntervalKey;
  }) => void;
  className?: string;
};

/* ---------- Utilities ---------- */
const fmtInt = (n: number) => new Intl.NumberFormat().format(Math.round(n));
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(d);
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const isoDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};
const startOfWeekMon = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfMonth = (d: Date) => {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/* ---------- Data helpers ---------- */
function normalize(raw: WrVolPoint[]) {
  return (raw ?? [])
    .map((d) => ({
      date: d.date instanceof Date ? d.date : new Date(d.date),
      wr: Number(d.wr ?? 0),
      newLinks: Number(d.newLinks ?? 0),
      lostLinks: Number(d.lostLinks ?? 0),
      note: d.note,
    }))
    .sort((a, b) => +a.date - +b.date);
}
function inferInterval(range: TimeRangeKey): IntervalKey {
  switch (range) {
    case "30d":
      return "daily";
    case "90d":
      return "weekly";
    case "6m":
      return "weekly";
    case "1y":
    case "all":
    case "custom":
      return "monthly";
  }
}
function rangeStartFor(range: TimeRangeKey, end: Date, min?: Date) {
  const x = new Date(end);
  switch (range) {
    case "30d":
      return addDays(x, -29);
    case "90d":
      return addDays(x, -89);
    case "6m":
      return addDays(x, -179);
    case "1y":
      return addDays(x, -364);
    case "all":
      return min ?? addDays(x, -179);
    case "custom":
      return min ?? addDays(x, -179);
  }
}

type AggRow = {
  date: Date;
  wr: number;
  newLinks: number;
  lostLinks: number;
  deltaWr?: number;
  note?: string;
};

function aggregate(data: ReturnType<typeof normalize>, interval: IntervalKey): AggRow[] {
  if (!data.length) return [];
  const keyFn =
    interval === "daily"
      ? (d: Date) => isoDay(d)
      : interval === "weekly"
      ? (d: Date) => isoDay(startOfWeekMon(d))
      : (d: Date) => isoDay(startOfMonth(d));

  const map = new Map<
    string,
    { date: Date; wrSum: number; wrCnt: number; newSum: number; lostSum: number; note?: string }
  >();
  for (const r of data) {
    const k = keyFn(r.date);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, {
        date: new Date(k),
        wrSum: r.wr,
        wrCnt: 1,
        newSum: r.newLinks ?? 0,
        lostSum: r.lostLinks ?? 0,
        note: r.note,
      });
    } else {
      prev.wrSum += r.wr;
      prev.wrCnt += 1;
      prev.newSum += r.newLinks ?? 0;
      prev.lostSum += r.lostLinks ?? 0;
      prev.note = prev.note || r.note;
    }
  }
  const series: AggRow[] = [...map.values()]
    .sort((a, b) => +a.date - +b.date)
    .map((r) => ({
      date: r.date,
      wr: r.wrSum / Math.max(1, r.wrCnt),
      newLinks: r.newSum,
      lostLinks: r.lostSum,
      note: r.note,
    }));
  for (let i = 0; i < series.length; i++) series[i].deltaWr = i ? series[i].wr - series[i - 1].wr : 0;
  return series;
}

/* ---------- Tooltip ---------- */
const TooltipCard: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const row: AggRow | undefined = payload[0]?.payload;
  const newVal = payload.find((p) => p.dataKey === "newLinks")?.value ?? row?.newLinks ?? 0;
  const lostVal = payload.find((p) => p.dataKey === "lostLinks")?.value ?? row?.lostLinks ?? 0;
  return (
    <div
      className="rounded-md border bg-white px-3 py-2 text-xs shadow"
      style={{ borderColor: TK.border }}
    >
      <div className="font-medium" style={{ color: TK.muted }}>
        {row?.date ? row.date.toLocaleDateString() : ""}
      </div>
      <div className="mt-1 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.action }} />
            WR Score
          </span>
          <span className="font-semibold" style={{ color: TK.text }}>
            {fmtInt(row?.wr ?? 0)}
            {!!row && row.deltaWr !== 0 && (
              <span className={cn("ml-1", row.deltaWr! > 0 ? "text-emerald-600" : "text-rose-600")}>
                {row.deltaWr! > 0 ? "▲" : "▼"} {fmtInt(Math.abs(row.deltaWr!))}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.success }} />
            New
          </span>
          <span className="font-semibold" style={{ color: TK.text }}>
            {fmtInt(newVal)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.danger }} />
            Lost
          </span>
          <span className="font-semibold" style={{ color: TK.text }}>
            {fmtInt(lostVal)}
          </span>
        </div>
        <div className="mt-1 border-t pt-1" style={{ borderColor: TK.borderLight, color: TK.muted }}>
          Net:{" "}
          <b className={cn(newVal - lostVal >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {newVal - lostVal >= 0 ? "+" : ""}
            {fmtInt(newVal - lostVal)}
          </b>
        </div>
      </div>
      {row?.note && (
        <div className="mt-2 text-[11px]" style={{ color: TK.muted }}>
          {row.note}
        </div>
      )}
    </div>
  );
};

/* ---------- Small UI primitives ---------- */
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
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
        active ? "font-medium" : "hover:bg-gray-50"
      )}
      style={{
        borderColor: TK.border,
        background: active ? TK.pastel : TK.surface,
        color: active ? TK.brand : TK.text,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Popover({
  button,
  children,
  align = "right",
}: {
  button: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((s) => !s)} style={{ cursor: "pointer" }}>
        {button}
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-[300px] rounded-md border bg-white p-3 text-sm shadow",
            align === "right" ? "right-0" : "left-0"
          )}
          style={{ borderColor: TK.border }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function SplitButton({
  label,
  onPrimary,
  items,
  title,
}: {
  label: string;
  onPrimary: () => void;
  items: { label: string; onClick: () => void }[];
  title?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={onPrimary}
        title={title}
        className="inline-flex items-center gap-2 rounded-l-full border-y border-l px-3 py-1.5 text-sm hover:bg-gray-50"
        style={{ borderColor: TK.border, cursor: "pointer" }}
      >
        <Download size={16} color={TK.brand} />
        {label}
      </button>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="rounded-r-full border px-2 py-1.5 hover:bg-gray-50"
        style={{ borderColor: TK.border, cursor: "pointer" }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ChevronDown size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[110%] z-50 min-w-[180px] rounded-md border bg-white p-1 shadow"
          style={{ borderColor: TK.border }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={it.onClick}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-[#F7FAFC]"
              style={{ cursor: "pointer" }}
              role="menuitem"
            >
              <span className="inline-flex items-center gap-2">
                <Download size={14} color={TK.brand} /> {it.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Demo data (if none provided) ---------- */
const demoSeries: WrVolPoint[] = (() => {
  const today = new Date();
  const out: WrVolPoint[] = [];
  let wr = 68;
  for (let i = 119; i >= 0; i--) {
    const d = addDays(today, -i);
    const newL = Math.max(0, Math.round(12 + 7 * Math.sin(i / 4) + (Math.random() * 6 - 3)));
    const lostL = Math.max(0, Math.round(8 + 5 * Math.cos(i / 6) + (Math.random() * 5 - 2)));
    const drift = (newL - lostL) * 0.05 + (Math.random() * 2 - 1);
    wr = clamp(wr + drift, 0, 100);
    const prev = out[out.length - 1]?.wr ?? wr;
    const delta = wr - prev;
    let note: string | undefined;
    if (Math.abs(delta) >= 5) {
      note = delta > 0 ? "▲ WR improved due to strong new links" : "▼ WR dropped after losing high‑value links";
    }
    out.push({ date: d, wr: Math.round(wr * 10) / 10, newLinks: newL, lostLinks: lostL, note });
  }
  return out;
})();

/* ---------- MAIN ---------- */
export default function WrScoreVolatility({
  title = "WR Score Volatility",
  data = demoSeries,
  defaultRange = "90d",
  defaultView = "area",
  onDrilldown,
  className = "",
}: WrScoreVolatilityProps) {
  const [range, setRange] = React.useState<TimeRangeKey>(defaultRange);
  const [customFrom, setCustomFrom] = React.useState<string>("");
  const [customTo, setCustomTo] = React.useState<string>("");

  const [view, setView] = React.useState<ViewKey>(defaultView);
  const [showNew, setShowNew] = React.useState(true);
  const [showLost, setShowLost] = React.useState(true);

  const norm = React.useMemo(() => normalize(data), [data]);
  const minDate = norm[0]?.date ?? new Date();
  const maxDate = norm[norm.length - 1]?.date ?? new Date();
  const interval = React.useMemo(() => inferInterval(range), [range]);

  const inRange = React.useMemo(() => {
    if (!norm.length) return [] as ReturnType<typeof normalize>;
    if (range === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      return norm.filter((d) => d.date >= from && d.date <= to);
    }
    const start = rangeStartFor(range, maxDate, minDate);
    return norm.filter((d) => d.date >= start && d.date <= maxDate);
  }, [norm, range, customFrom, customTo, minDate, maxDate]);

  const series = React.useMemo(() => aggregate(inRange, interval), [inRange, interval]);
  const chartRef = React.useRef<HTMLDivElement | null>(null);

  const exportCSV = () => {
    const rows = [
      ["date", "wr", "delta_wr", "new_links", "lost_links"],
      ...series.map((r) => [
        isoDay(r.date),
        r.wr.toFixed(1),
        (r.deltaWr ?? 0).toFixed(1),
        String(r.newLinks ?? 0),
        String(r.lostLinks ?? 0),
      ]),
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wr_volatility_${range}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPNG = async () => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return alert("Chart not ready for export.");
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    const svg64 = btoa(unescape(encodeURIComponent(source)));
    const image64 = "data:image/svg+xml;base64," + svg64;
    const img = new Image();
    const bbox = svg.getBoundingClientRect();
    const width = Math.max(800, Math.round(bbox.width));
    const height = Math.max(320, Math.round(bbox.height));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const link = document.createElement("a");
      link.download = `wr_volatility_${range}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = image64;
  };

  const onChartClick = (e: any) => {
    if (!onDrilldown || !e?.activePayload?.[0]?.payload) return;
    const row: AggRow = e.activePayload[0].payload;
    const change = (row.deltaWr ?? 0) >= 0 ? "up" : "down";
    onDrilldown({ date: new Date(row.date), metric: "score", change, range, interval });
  };
  const onBarClick = (payload: any, kind: "new" | "lost") => {
    if (!onDrilldown || !payload?.payload) return;
    const row: AggRow = payload.payload;
    onDrilldown({ date: new Date(row.date), metric: kind, range, interval });
  };

  const isEmpty = !series.length;

  const dateLabel =
    range === "custom" && customFrom && customTo
      ? `Custom ${customFrom} → ${customTo}`
      : range.toUpperCase();

  return (
    <section
      className={cn("rounded-[12px] border bg-white p-4 md:p-5 shadow-sm", className)}
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* LEFT: Title + Info */}
        <div className="flex flex-wrap items-center gap-2">
          <LineChartIcon size={20} color={TK.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
            {title}
          </h3>

          {/* Info popover right next to title */}
          <Popover
            button={
              <button
                type="button"
                className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
                aria-label="Info"
                title="About this chart"
                style={{ cursor: "pointer" }}
              >
                <Info size={16} />
              </button>
            }
            align="left"
          >
            <div className="space-y-2 text-sm" style={{ color: TK.text }}>
              <p className="text-[13px]" style={{ color: TK.muted }}>
                WR Score (blue) with optional overlays for <b>New</b> (green) and <b>Lost</b> (red) backlinks.
              </p>
              <ul className="list-disc pl-5 text-[13px]" style={{ color: TK.muted }}>
                <li>
                  Use the <b>Date Range</b> chip to change the period.
                </li>
                <li>Click points/bars to drill down into the selected date.</li>
                <li>Export CSV/PNG from the Export button.</li>
              </ul>
            </div>
          </Popover>
        </div>

        {/* RIGHT: Controls + Export at top-right */}
        <div className="flex w-full items-center gap-2 md:w-auto">
          {/* Controls cluster */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range — Drop-down chip */}
            <Popover
              align="right"
              button={
                <Chip active title="Date range">
                  <Calendar size={16} />
                  {dateLabel}
                </Chip>
              }
            >
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2">
                  {(["30d", "90d", "6m", "1y", "all"] as Exclude<TimeRangeKey, "custom">[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={cn(
                        "rounded border px-2 py-1.5 text-sm",
                        range === r ? "bg-[#D9EEF8] font-medium" : "hover:bg-[#F7FAFC]"
                      )}
                      style={{
                        borderColor: TK.border,
                        cursor: "pointer",
                        color: range === r ? TK.brand : TK.text,
                      }}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRange("custom")}
                    className={cn(
                      "rounded border px-2 py-1.5 text-sm",
                      range === "custom" ? "bg-[#D9EEF8] font-medium" : "hover:bg-[#F7FAFC]"
                    )}
                    style={{
                      borderColor: TK.border,
                      cursor: "pointer",
                      color: range === "custom" ? TK.brand : TK.text,
                    }}
                  >
                    Custom
                  </button>
                </div>
                {range === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs" style={{ color: TK.muted }}>
                        From
                      </label>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full rounded border px-2 py-1.5 text-sm"
                        style={{ borderColor: TK.border }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs" style={{ color: TK.muted }}>
                        To
                      </label>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full rounded border px-2 py-1.5 text-sm"
                        style={{ borderColor: TK.border }}
                      />
                    </div>
                  </div>
                )}
                <div className="text-[12px]" style={{ color: TK.muted }}>
                  Tip: Custom dates switch chart aggregation to monthly for long spans.
                </div>
              </div>
            </Popover>

            {/* View chips */}
            <Chip active={view === "area"} onClick={() => setView("area")} title="Area view">
              <Waves size={16} />
              Area
            </Chip>
            <Chip active={view === "line"} onClick={() => setView("line")} title="Line view">
              <LineChartIcon size={16} />
              Line
            </Chip>

            {/* Overlay chips */}
            <Chip active={showNew} onClick={() => setShowNew((s) => !s)} title="Toggle New links">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.success }} />
              New
            </Chip>
            <Chip active={showLost} onClick={() => setShowLost((s) => !s)} title="Toggle Lost links">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.danger }} />
              Lost
            </Chip>
          </div>

          {/* Export — anchored to the right edge */}
          <div className="ml-auto">
            <SplitButton
              label="Export"
              onPrimary={exportCSV}
              items={[
                { label: "Export CSV", onClick: exportCSV },
                { label: "Export PNG", onClick: exportPNG },
              ]}
              title="Export chart & data"
            />
          </div>
        </div>
      </header>

      {/* Chart */}
      <div ref={chartRef} className="h-[320px] w-full">
        {isEmpty ? (
          <div
            className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm"
            style={{ borderColor: TK.border, color: TK.muted }}
          >
            No data in selection.
          </div>
        ) : (
          <ResponsiveContainer>
            <ComposedChart data={series} margin={{ top: 6, right: 10, left: 4, bottom: 2 }} onClick={onChartClick}>
              <defs>
                <linearGradient id="wrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor={TK.action} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={TK.action} stopOpacity={0.06} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke={TK.borderLight} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: TK.borderLight }}
                tickFormatter={(v) => fmtDate(new Date(v))}
                minTickGap={28}
                fontSize={12}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tickLine={false}
                axisLine={{ stroke: TK.borderLight }}
                allowDecimals={false}
                fontSize={12}
                label={{ value: "WR", angle: -90, position: "insideLeft", fill: TK.muted, fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={{ stroke: TK.borderLight }}
                allowDecimals={false}
                fontSize={12}
                label={{ value: "Links", angle: 90, position: "insideRight", fill: TK.muted, fontSize: 11 }}
              />

              <RTooltip content={<TooltipCard />} cursor={{ stroke: "rgba(17,24,39,0.12)" }} />
              <Legend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => {
                  const map: Record<string, string> = { wr: "WR Score", newLinks: "New Links", lostLinks: "Lost Links" };
                  return <span style={{ color: TK.text }}>{map[value] ?? value}</span>;
                }}
              />

              {/* WR series (view switch) */}
              {view === "line" ? (
                <Line
                  name="WR Score"
                  yAxisId="left"
                  type="monotone"
                  dataKey="wr"
                  stroke={TK.action}
                  strokeWidth={2.6}
                  dot={{ r: 2, stroke: TK.action, strokeWidth: 1 }}
                  activeDot={(p: any) => {
                    const delta = p?.payload?.deltaWr ?? 0;
                    const cx = p?.cx ?? 0;
                    const cy = p?.cy ?? 0;
                    const color = delta >= 5 ? "#059669" : delta <= -5 ? "#DC2626" : TK.action;
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={4} fill={color} />
                        {Math.abs(delta) >= 5 && (
                          <path
                            d={delta >= 5 ? `M ${cx} ${cy - 10} l 6 10 h -12 z` : `M ${cx} ${cy + 10} l 6 -10 h -12 z`}
                            fill={color}
                            opacity={0.9}
                          />
                        )}
                      </g>
                    );
                  }}
                />
              ) : (
                <Area
                  name="WR Score"
                  yAxisId="left"
                  type="monotone"
                  dataKey="wr"
                  stroke={TK.action}
                  strokeWidth={2.2}
                  fill="url(#wrFill)"
                  dot={{ r: 1.8, stroke: TK.action, strokeWidth: 1 }}
                  activeDot={(p: any) => {
                    const delta = p?.payload?.deltaWr ?? 0;
                    const cx = p?.cx ?? 0;
                    const cy = p?.cy ?? 0;
                    const color = delta >= 5 ? "#059669" : delta <= -5 ? "#DC2626" : TK.action;
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={4} fill={color} />
                        {Math.abs(delta) >= 5 && (
                          <path
                            d={delta >= 5 ? `M ${cx} ${cy - 10} l 6 10 h -12 z` : `M ${cx} ${cy + 10} l 6 -10 h -12 z`}
                            fill={color}
                            opacity={0.9}
                          />
                        )}
                      </g>
                    );
                  }}
                />
              )}

              {/* Overlays */}
              {showNew && (
                <Bar
                  name="New Links"
                  yAxisId="right"
                  dataKey="newLinks"
                  fill={TK.success}
                  radius={[3, 3, 0, 0]}
                  barSize={8}
                  onClick={(e) => onBarClick(e, "new")}
                />
              )}
              {showLost && (
                <Bar
                  name="Lost Links"
                  yAxisId="right"
                  dataKey="lostLinks"
                  fill={TK.danger}
                  radius={[3, 3, 0, 0]}
                  barSize={8}
                  onClick={(e) => onBarClick(e, "lost")}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer meta */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px]" style={{ color: TK.muted }}>
          Interval: <span className="font-medium" style={{ color: TK.text }}>{interval}</span> • Range:{" "}
          <span className="font-medium" style={{ color: TK.text }}>{dateLabel}</span>
        </div>
        <div className="text-[11px]" style={{ color: TK.muted }}>
          Colors — WR: <span style={{ color: TK.action }}>●</span> New: <span style={{ color: TK.success }}>●</span> Lost:{" "}
          <span style={{ color: TK.danger }}>●</span>
        </div>
      </div>
    </section>
  );
}

/* Named export (optional) */
export { WrScoreVolatility };
