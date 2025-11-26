"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** -----------------------------------------------------------------------
 *  Section 3 — New vs Lost Backlinks Over Time (Backlink Audit → Tab 3)
 *  - Toggle: Bar | Area   (modular segmented toggle)
 *  - Toggle: Daily | Weekly | Monthly
 *  - Time Duration filter chips: 30D, 90D, 6M, 1Y, All Time
 *  - Legend toggles: New / Lost / Net
 *  - Click bar/point → drilldown (New/Lost) tables with date filter
 *  - Export action in header (button)
 *  - Inter + Fallback fonts; brand icon (#008CCD) in section title
 *  - Pointer cursor for all clickable UI
 *  - NOTE: "Compare: Prev Period" removed as requested
 *  --------------------------------------------------------------------- */

type TimeRangeKey = "30d" | "90d" | "6m" | "1y" | "all";
type IntervalKey = "daily" | "weekly" | "monthly";
type ViewKey = "bar" | "area";

export type BacklinkPoint = {
  date: string | Date;
  /** Count of NEW backlinks on that day/week/month */
  newBL: number;
  /** Count of LOST backlinks on that day/week/month */
  lostBL: number;
};

export type NewVsLostBacklinksTrendProps = {
  title?: string;
  /** Raw backlink points; daily entries are fine — component will aggregate by interval */
  data?: BacklinkPoint[];
  /** Click handler (route/scroll) */
  onDrilldown?: (args: {
    date: Date;
    kind: "new" | "lost" | "both";
    range: TimeRangeKey;
    interval: IntervalKey;
  }) => void;
  /** Initial UI state */
  defaultRange?: TimeRangeKey;
  defaultView?: ViewKey; // "bar" | "area"
  /** If not provided, interval will be derived from selected range on mount */
  defaultInterval?: IntervalKey;
  /** Optional export click handler */
  onExport?: () => void;
  className?: string;
};

/* ----------------------------- Design Tokens ------------------------------ */
/**
 * Reads from CSS custom properties defined in the "recent designs".
 * Falls back to sane defaults if a token is missing.
 * Make sure your global theme defines these CSS variables on :root or a parent.
 */
const T = {
  brand: "var(--brand-600, #008CCD)",
  brandTint: "var(--brand-50, rgba(0,140,205,0.06))",

  fg: "var(--fg-default, #0B1220)",
  fgMuted: "var(--fg-muted, #6B7280)",

  cardBg: "var(--bg-card, #FFFFFF)",
  border: "var(--border-default, #E5E7EB)",
  grid: "var(--chart-grid, #EEF2F6)",

  success: "var(--success-600, #16A34A)", // New
  danger: "var(--danger-600, #DC2626)", // Lost
  neutral: "var(--neutral-500, #6B7280)", // Net

  chipBg: "var(--chip-bg, #F1F5F9)",
  chipFg: "var(--chip-fg, #0B1220)",
  chipSelectedBg: "var(--chip-selected-bg, rgba(0,140,205,0.08))",
  chipSelectedBorder: "var(--chip-selected-border, #008CCD)",

  toggleBg: "var(--toggle-bg, #F3F4F6)",
  toggleBorder: "var(--toggle-border, #E5E7EB)",
};

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

/* -------------------------------- Utils ----------------------------------- */

const fmtInt = (n: number) =>
  Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const isoDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

const startOfWeekMon = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfMonth = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const addMonths = (d: Date, months: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
};

const rangeStartFor = (range: TimeRangeKey, end: Date, min?: Date) => {
  const e = new Date(end);
  switch (range) {
    case "30d":
      return addDays(e, -29);
    case "90d":
      return addDays(e, -89);
    case "6m":
      return addDays(e, -179);
    case "1y":
      return addDays(e, -364);
    case "all":
      return min ?? addDays(e, -179);
  }
};

const normalize = (raw: BacklinkPoint[]) =>
  (raw || [])
    .map((p) => ({
      date: p.date instanceof Date ? new Date(p.date) : new Date(p.date),
      newBL: Number(p.newBL || 0),
      lostBL: Number(p.lostBL || 0),
    }))
    .sort((a, b) => +a.date - +b.date);

/** Suggest interval from range length */
function suggestInterval(range: TimeRangeKey, start: Date, end: Date): IntervalKey {
  const days =
    Math.max(1, Math.round((+end - +start) / (24 * 3600 * 1000)) + 1) || 1;
  if (days <= 31) return "daily";
  if (days <= 185) return "weekly";
  return "monthly";
}

/** Aggregate + fill empty buckets */
function aggregateFill(
  data: ReturnType<typeof normalize>,
  start: Date,
  end: Date,
  interval: IntervalKey
) {
  const buckets = new Map<
    string,
    { date: Date; newBL: number; lostBL: number }
  >();

  const keyOf = (d: Date) => {
    if (interval === "daily") return isoDay(d);
    if (interval === "weekly") return isoDay(startOfWeekMon(d));
    const m = startOfMonth(d);
    return `${m.getFullYear()}-${pad2(m.getMonth() + 1)}-01`;
  };
  const dateOf = (k: string) => new Date(k);

  // Sum into buckets
  for (const row of data) {
    if (row.date < start || row.date > end) continue;
    const k = keyOf(row.date);
    const prev = buckets.get(k);
    if (!prev) {
      buckets.set(k, { date: dateOf(k), newBL: row.newBL, lostBL: row.lostBL });
    } else {
      prev.newBL += row.newBL;
      prev.lostBL += row.lostBL;
    }
  }

  // Build sequential bucket timeline (zero-fill)
  const out: Array<{
    date: Date;
    newBL: number;
    lostBL: number;     // positive for tooltip/smart popover
    lostNeg: number;    // negative for plotting (-Y axis)
    net: number;        // New - Lost
  }> = [];
  let cursor = (() => {
    if (interval === "daily") return new Date(isoDay(start));
    if (interval === "weekly") return startOfWeekMon(start);
    return startOfMonth(start);
  })();

  const step = () => {
    if (interval === "daily") cursor = addDays(cursor, 1);
    else if (interval === "weekly") cursor = addDays(cursor, 7);
    else cursor = addMonths(cursor, 1);
  };

  const endKey = (() => {
    if (interval === "daily") return isoDay(end);
    if (interval === "weekly") return isoDay(startOfWeekMon(end));
    const m = startOfMonth(end);
    return `${m.getFullYear()}-${pad2(m.getMonth() + 1)}-01`;
  })();

  while (true) {
    const k = ((): string => {
      if (interval === "daily") return isoDay(cursor);
      if (interval === "weekly") return isoDay(startOfWeekMon(cursor));
      const m = startOfMonth(cursor);
      return `${m.getFullYear()}-${pad2(m.getMonth() + 1)}-01`;
    })();
    const b = buckets.get(k);
    const newBL = b?.newBL ?? 0;
    const lostBL = b?.lostBL ?? 0;
    out.push({
      date: new Date(k),
      newBL,
      lostBL,          // keep as positive for popover computations
      lostNeg: -lostBL, // negative for -Y plotting
      net: newBL - lostBL,
    });
    if (k === endKey) break;
    step();
    if (out.length > 1200) break; // guard
  }
  return out;
}

const fmtTick = (d: Date, interval: IntervalKey) => {
  if (interval === "daily") {
    return Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
    }).format(d);
  }
  if (interval === "weekly") {
    return `Wk of ${Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
    }).format(d)}`;
  }
  // monthly
  return Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "2-digit",
  }).format(d);
};

function alpha(hexOrCssColor: string, a: number) {
  // If it's a hex (#RRGGBB), convert; else assume already-valid rgba-capable
  if (/^#([0-9a-f]{6})$/i.test(hexOrCssColor)) {
    const r = parseInt(hexOrCssColor.slice(1, 3), 16);
    const g = parseInt(hexOrCssColor.slice(3, 5), 16);
    const b = parseInt(hexOrCssColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  // Fallback: use CSS color-mix if supported (low risk). Otherwise, fallback opacity layer.
  return `color-mix(in srgb, ${hexOrCssColor} ${a * 100}%, transparent)`;
}

/* -------------------------- UI Primitives --------------------------- */

const BrandLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M9.88 13.12a3 3 0 0 1 0-4.24l3.18-3.18a3 3 0 0 1 4.24 4.24l-1.13 1.13"
      fill="none"
      stroke={T.brand}
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M14.12 10.88a3 3 0 0 1 0 4.24l-3.18 3.18a3 3 0 0 1-4.24-4.24l1.13-1.13"
      fill="none"
      stroke={T.brand}
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M12 3v10m0 0l3.5-3.5M12 13L8.5 9.5M4 21h16"
      stroke={T.brand}
      strokeWidth="1.75"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

type SegmentedOption<T extends string> = { label: string; value: T };

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border p-0.5"
      style={{ borderColor: T.toggleBorder, background: T.toggleBg }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={[
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-white shadow-sm ring-1"
                : "hover:bg-white/70 focus:bg-white",
            ].join(" ")}
            style={{
              color: active ? T.fg : T.fgMuted,
              boxShadow: active ? "inset 0 0 0 1px var(--tw-ring-color)" : undefined,
              ["--tw-ring-color" as any]: T.brand,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const FilterChip: React.FC<
  React.PropsWithChildren<{
    active?: boolean;
    onClick?: () => void;
    className?: string;
    "aria-label"?: string;
  }>
> = ({ active, onClick, className, children, ...rest }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition",
      active
        ? "bg-[var(--chip-selected-bg,#E6F6FD)] text-[var(--brand-600,#008CCD)]"
        : "bg-[var(--chip-bg,#F1F5F9)] text-[var(--chip-fg,#0B1220)] hover:bg-white",
      className || "",
    ].join(" ")}
    style={{
      borderColor: active ? T.chipSelectedBorder : T.border,
    }}
    {...rest}
  >
    {children}
  </button>
);

/* -------------------------- Tooltip Card --------------------------- */
const TooltipCard: React.FC<{
  active?: boolean;
  payload?: any[];
}> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  const d = row?.date ? new Date(row.date) : null;

  // Values respect series visibility
  const newVal =
    payload.find((p) => p.dataKey === "newBL")?.value ?? row?.newBL ?? 0;
  const lostVal =
    payload.find((p) => p.dataKey === "lostBL")?.value ?? row?.lostBL ?? 0;
  const net = (newVal || 0) - (lostVal || 0);

  return (
    <div
      className="rounded-lg border bg-white px-3 py-2 shadow-md"
      style={{ borderColor: T.border }}
    >
      <div className="text-xs font-medium" style={{ color: T.fgMuted }}>
        {d ? d.toLocaleDateString() : ""}
      </div>
      <div className="mt-1 space-y-0.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: T.success }}
            />
            New
          </span>
          <span className="font-semibold" style={{ color: T.fg }}>
            {fmtInt(newVal)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: T.danger }}
            />
            Lost
          </span>
          <span className="font-semibold" style={{ color: T.fg }}>
            {fmtInt(lostVal)}
          </span>
        </div>
        <div
          className="mt-1 flex items-center justify-between border-t pt-1.5"
          style={{ borderColor: "var(--border-default, #F3F4F6)" }}
        >
          <span style={{ color: T.fgMuted }}>Net</span>
          <span
            className="font-semibold"
            style={{ color: net >= 0 ? T.success : T.danger }}
          >
            {net >= 0 ? "+" : ""}
            {fmtInt(net)}
          </span>
        </div>
      </div>
      <div className="mt-2 text-[11px]" style={{ color: T.fgMuted }}>
        Tip: click any point/bar to open the drilldown table.
      </div>
    </div>
  );
};

/* ---------------------------- Defaults ----------------------------- */
// Small synthetic series for dev/empty state (last 30 days)
const defaults: BacklinkPoint[] = (() => {
  const today = new Date();
  const out: BacklinkPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(today, -i);
    const newBL = Math.max(
      0,
      Math.round(18 + 8 * Math.sin(i / 3) + (Math.random() * 8 - 4))
    );
    const lostBL = Math.max(
      0,
      Math.round(10 + 6 * Math.cos(i / 4) + (Math.random() * 6 - 3))
    );
    out.push({ date: d, newBL, lostBL });
  }
  return out;
})();

/* --------------------------- Main Component ------------------------- */
export default function NewVsLostBacklinksTrend(
  props: NewVsLostBacklinksTrendProps
) {
  const {
    title = "New vs Lost Backlinks Over Time",
    data = defaults,
    onDrilldown,
    defaultRange = "30d",
    defaultView = "area",
    defaultInterval,
    onExport,
    className = "",
  } = props;

  const [range, setRange] = React.useState<TimeRangeKey>(defaultRange);
  const [view, setView] = React.useState<ViewKey>(defaultView);
  const normalized = React.useMemo(() => normalize(data), [data]);

  const [minDate, maxDate] = React.useMemo(() => {
    if (!normalized.length) return [new Date(), new Date()] as const;
    return [normalized[0].date, normalized[normalized.length - 1].date] as const;
  }, [normalized]);

  const rangeStart = React.useMemo(
    () => rangeStartFor(range, maxDate, minDate),
    [range, maxDate, minDate]
  );

  const [interval, setInterval] = React.useState<IntervalKey>(() =>
    defaultInterval || suggestInterval(range, rangeStart, maxDate)
  );

  // Re-suggest interval if range changes and user hasn't explicitly changed it this mount.
  const hasUserChangedInterval = React.useRef(!!defaultInterval);
  React.useEffect(() => {
    if (!hasUserChangedInterval.current) {
      setInterval(suggestInterval(range, rangeStart, maxDate));
    }

  }, [range, rangeStart, maxDate]);

  const series = React.useMemo(
    () => aggregateFill(normalized, rangeStart!, maxDate, interval),
    [normalized, rangeStart, maxDate, interval]
  );

  const [showNew, setShowNew] = React.useState(true);
  const [showLost, setShowLost] = React.useState(true);
  const [showNet, setShowNet] = React.useState(false);

  const handlePointClick = (evt: any, which: "new" | "lost" | "both") => {
    if (!onDrilldown) return;
    const payload = evt?.activePayload?.[0]?.payload;
    const when = payload?.date ? new Date(payload.date) : undefined;
    if (when) onDrilldown({ date: when, kind: which, range, interval });
  };

  const hasData = series.length > 0 && (showNew || showLost || showNet);

  return (
    <div
      className={[
        "rounded-xl border shadow-sm",
        "p-4 md:p-5",
        className,
      ].join(" ")}
      style={{ borderColor: T.border, background: T.cardBg, fontFamily: fontStack }}
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Title + subtitle */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <BrandLinkIcon />
            <h3 className="text-[15px] font-semibold" style={{ color: T.fg }}>
              {title}
            </h3>
          </div>
          <p className="text-xs" style={{ color: T.fgMuted }}>
            New vs Lost backlinks across the selected period. Toggle chart type or series, and click to drill down.
          </p>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {/* Chart Type */}
          <SegmentedToggle<ViewKey>
            aria-label="Chart type"
            options={[
              { label: "Area", value: "area" },
              { label: "Bar", value: "bar" },
            ]}
            value={view}
            onChange={(v) => setView(v)}
          />

          {/* Interval Toggle */}
          <SegmentedToggle<IntervalKey>
            aria-label="Aggregation interval"
            options={[
              { label: "Daily", value: "daily" },
              { label: "Weekly", value: "weekly" },
              { label: "Monthly", value: "monthly" },
            ]}
            value={interval}
            onChange={(v) => {
              hasUserChangedInterval.current = true;
              setInterval(v);
            }}
          />

          {/* Time Range Chips */}
          <div className="ml-0.5 flex items-center gap-1.5">
            {(["30d", "90d", "6m", "1y", "all"] as TimeRangeKey[]).map((k) => (
              <FilterChip
                key={k}
                active={range === k}
                onClick={() => setRange(k)}
                aria-label={`Set range ${k.toUpperCase()}`}
              >
                {k === "all" ? "All Time" : k.toUpperCase()}
              </FilterChip>
            ))}
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={onExport}
            className="group inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              borderColor: T.border,
              color: T.brand,
              ["--tw-ring-color" as any]: T.brand,
            }}
            aria-label="Export"
            title="Export"
          >
            <DownloadIcon className="transition group-hover:scale-105" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Legend toggles */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--success-600,#16A34A)]"
            checked={showNew}
            onChange={(e) => setShowNew(e.target.checked)}
          />
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: T.success }}
            />
            New
          </span>
        </label>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--danger-600,#DC2626)]"
            checked={showLost}
            onChange={(e) => setShowLost(e.target.checked)}
          />
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: T.danger }}
            />
            Lost
          </span>
        </label>
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--neutral-500,#6B7280)]"
            checked={showNet}
            onChange={(e) => setShowNet(e.target.checked)}
          />
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: T.neutral }}
            />
            Net (New − Lost)
          </span>
        </label>
      </div>

      {/* Chart */}
      <div className="h-[320px] w-full">
        {!hasData ? (
          <div
            className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm"
            style={{ borderColor: T.border, color: T.fgMuted }}
          >
            No data in selection.
          </div>
        ) : view === "bar" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series}
              margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
              onClick={(e) => handlePointClick(e, "both")}
              barCategoryGap="30%"
              barGap={2}
            >
              <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: T.grid }}
                tickFormatter={(v) => fmtTick(new Date(v), interval)}
                minTickGap={28}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: T.grid }}
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip
                content={<TooltipCard />}
                cursor={{ fill: "rgba(17,24,39,0.06)" }}
              />

              {showNew && (
                <Bar
                  name="New"
                  dataKey="newBL"
                  fill={T.success}
                  radius={[4, 4, 0, 0]}
                  className="cursor-pointer"
                  onClick={(e) => handlePointClick(e, "new")}
                />
              )}
              {showLost && (
                <Bar
                  name="Lost"
                  dataKey="lostNeg" // plot on -Y axis
                  fill={T.danger}
                  radius={[0, 0, 4, 4]}
                  className="cursor-pointer"
                  onClick={(e) => handlePointClick(e, "lost")}
                />
              )}
              {showNet && (
                <Line
                  name="Net"
                  type="monotone"
                  dataKey="net"
                  stroke={T.neutral}
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  dot={{ r: 0 }}
                  activeDot={{ r: 3, className: "cursor-pointer" }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
              margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
              onClick={(e) => handlePointClick(e, "both")}
              className="cursor-pointer"
            >
              <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: T.grid }}
                tickFormatter={(v) => fmtTick(new Date(v), interval)}
                minTickGap={28}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: T.grid }}
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip
                content={<TooltipCard />}
                cursor={{ stroke: "rgba(17,24,39,0.30)" }}
              />

              {showNew && (
                <Area
                  name="New"
                  type="monotone"
                  dataKey="newBL"
                  stroke={T.success}
                  strokeWidth={2}
                  fill={alpha(T.success, 0.18)}
                  isAnimationActive
                  dot={{ r: 2 }}
                  activeDot={{ r: 4, className: "cursor-pointer" }}
                />
              )}
              {showLost && (
                <Area
                  name="Lost"
                  type="monotone"
                  dataKey="lostNeg" // plot on -Y axis
                  stroke={T.danger}
                  strokeWidth={2}
                  fill={alpha(T.danger, 0.18)}
                  isAnimationActive
                  dot={{ r: 2 }}
                  activeDot={{ r: 4, className: "cursor-pointer" }}
                />
              )}
              {showNet && (
                <Line
                  name="Net"
                  type="monotone"
                  dataKey="net"
                  stroke={T.neutral}
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  dot={{ r: 0 }}
                  activeDot={{ r: 3, className: "cursor-pointer" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer micro-hint */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px]" style={{ color: T.fgMuted }}>
          Interval:{" "}
          <span className="font-medium" style={{ color: T.fg }}>
            {interval}
          </span>{" "}
          • Range:{" "}
          <span className="font-medium" style={{ color: T.fg }}>
            {range === "all" ? "ALL TIME" : range.toUpperCase()}
          </span>
        </div>
        <div className="text-[11px]" style={{ color: T.fgMuted }}>
          Colors — New: <span style={{ color: T.success }}>●</span> Lost:{" "}
          <span style={{ color: T.danger }}>●</span> Net:{" "}
          <span style={{ color: T.neutral }}>— —</span>
        </div>
      </div>
    </div>
  );
}

/* Named export for convenience */
export { NewVsLostBacklinksTrend };

