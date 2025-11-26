"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type TimeRangeKey = "30d" | "90d" | "6m" | "1y" | "all";
type IntervalKey = "daily" | "weekly";
type ViewKey = "bar" | "line";

export type RefDomainPoint = {
  /** Date of the bucket (raw “first seen” or “last seen” day) */
  date: string | Date;
  /** Count of NEW referring domains on that day/week */
  newRD: number;
  /** Count of LOST referring domains on that day/week */
  lostRD: number;
};

export type RefDomainsGainLossProps = {
  title?: string;
  data?: RefDomainPoint[];
  /** Called when the user clicks a bar/point. Use to route to Audit → Referring Domains with filtered state. */
  onDrilldown?: (args: {
    /** bucket date */
    date: Date;
    /** "new" | "lost" or "both" when clicking the column area (net) */
    kind: "new" | "lost" | "both";
    /** current active range + interval for your router */
    range: TimeRangeKey;
    interval: IntervalKey;
  }) => void;
  /** Initial controls */
  defaultRange?: TimeRangeKey;
  defaultInterval?: IntervalKey;
  defaultView?: ViewKey;
  className?: string;
};

/* ----------------------------- Utilities ----------------------------- */

const BRAND = {
  blue: "#1090D0",
  green: "#10B981", // new domains
  red: "#EF4444",   // lost domains
  grid: "#E5E7EB",
};

const fmtInt = (n: number) =>
  Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

const fmtShortDate = (d: Date) =>
  Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(d);

const isoDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};

const startOfWeekMon = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay(); // 0 (Sun) .. 6 (Sat)
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const rangeStartFor = (range: TimeRangeKey, end: Date, min?: Date) => {
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
  }
};

function normalizeData(raw: RefDomainPoint[]) {
  // Ensure dates are Date objects and values are numbers
  return raw
    .map((p) => ({
      date: p.date instanceof Date ? p.date : new Date(p.date),
      newRD: Number(p.newRD || 0),
      lostRD: Number(p.lostRD || 0),
    }))
    .sort((a, b) => +a.date - +b.date);
}

function aggregate(
  data: ReturnType<typeof normalizeData>,
  interval: IntervalKey
) {
  if (interval === "daily") {
    // Already daily — ensure there’s one row per day
    const map = new Map<string, { date: Date; newRD: number; lostRD: number }>();
    for (const d of data) {
      const k = isoDay(d.date);
      const prev = map.get(k);
      if (!prev) {
        map.set(k, { date: new Date(k), newRD: d.newRD, lostRD: d.lostRD });
      } else {
        prev.newRD += d.newRD;
        prev.lostRD += d.lostRD;
      }
    }
    return [...map.values()];
  }
  // weekly: group by Monday
  const map = new Map<string, { date: Date; newRD: number; lostRD: number }>();
  for (const d of data) {
    const wk = startOfWeekMon(d.date);
    const k = isoDay(wk);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, { date: new Date(k), newRD: d.newRD, lostRD: d.lostRD });
    } else {
      prev.newRD += d.newRD;
      prev.lostRD += d.lostRD;
    }
  }
  return [...map.values()];
}

/* ----------------------------- Tooltip ------------------------------ */

const TooltipCard: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
}> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  // Recharts may pass two entries (newRD and lostRD)
  const date: Date | null =
    payload[0]?.payload?.date ? new Date(payload[0].payload.date) : null;

  // Extract values
  let newRD = 0;
  let lostRD = 0;
  for (const p of payload) {
    if (p.dataKey === "newRD") newRD = p.value ?? 0;
    if (p.dataKey === "lostRD") lostRD = p.value ?? 0;
  }
  const net = (newRD || 0) - (lostRD || 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <div className="text-xs font-medium text-gray-500">
        {date ? date.toLocaleDateString() : ""}
      </div>
      <div className="mt-1 space-y-0.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: BRAND.green }}
            />
            New Domains
          </span>
          <span className="font-semibold text-gray-900">{fmtInt(newRD)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: BRAND.red }}
            />
            Lost Domains
          </span>
          <span className="font-semibold text-gray-900">{fmtInt(lostRD)}</span>
        </div>
        <div className="mt-1 border-t border-gray-100 pt-1.5 flex items-center justify-between">
          <span className="text-gray-600">Net Change</span>
          <span
            className={`font-semibold ${
              net >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {net >= 0 ? "+" : ""}
            {fmtInt(net)}
          </span>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-gray-500">
        Tip: click a bar/point to audit these domains.
      </div>
    </div>
  );
};

/* --------------------------- Main Component -------------------------- */

const defaults: RefDomainPoint[] = (() => {
  // small synthetic series (last 30d) for dev/empty state
  const today = new Date();
  const arr: RefDomainPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(today, -i);
    arr.push({
      date: d,
      newRD: Math.max(0, Math.round(8 + 6 * Math.sin(i / 4) + (Math.random() * 5 - 2))),
      lostRD: Math.max(0, Math.round(4 + 4 * Math.cos(i / 7) + (Math.random() * 4 - 2))),
    });
  }
  return arr;
})();

const ControlPill: React.FC<
  React.PropsWithChildren<{
    active?: boolean;
    onClick?: () => void;
    className?: string;
  }>
> = ({ active, onClick, className, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "rounded-full border px-3 py-1.5 text-xs font-medium",
      active
        ? "border-[#1090D0] bg-[#E8F5FD] text-[#1090D0]"
        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
      className || "",
    ].join(" ")}
  >
    {children}
  </button>
);

export function RefDomainsGainLoss(props: RefDomainsGainLossProps) {
  const {
    title = "Referring Domains – Gain vs Loss",
    data = defaults,
    onDrilldown,
    defaultRange = "30d",
    defaultInterval = "daily",
    defaultView = "bar",
    className = "",
  } = props;

  const [range, setRange] = React.useState<TimeRangeKey>(defaultRange);
  const [interval, setInterval] = React.useState<IntervalKey>(defaultInterval);
  const [view, setView] = React.useState<ViewKey>(defaultView);
  const [showNew, setShowNew] = React.useState(true);
  const [showLost, setShowLost] = React.useState(true);

  const normalized = React.useMemo(() => normalizeData(data), [data]);

  const [minDate, maxDate] = React.useMemo(() => {
    if (!normalized.length) return [new Date(), new Date()] as const;
    return [normalized[0].date, normalized[normalized.length - 1].date] as const;
  }, [normalized]);

  const filtered = React.useMemo(() => {
    if (!normalized.length) return [] as ReturnType<typeof normalizeData>;
    const end = maxDate;
    const start = rangeStartFor(range, end, minDate);
    return normalized.filter((d) => d.date >= start && d.date <= end);
  }, [normalized, range, maxDate, minDate]);

  const series = React.useMemo(() => aggregate(filtered, interval), [filtered, interval]);

  const handlePointClick = (payload: any, kind: "new" | "lost" | "both") => {
    if (!onDrilldown || !payload?.activePayload?.[0]?.payload) return;
    const when = new Date(payload.activePayload[0].payload.date);
    onDrilldown({ date: when, kind, range, interval });
  };

  // Empty-state guard
  const isEmpty = !series.length || (!showNew && !showLost);

  return (
    <div
      className={[
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        "p-4 md:p-5",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">
            New (🟢) vs Lost (🔴) referring domains over time — click a bar/point to drill down.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View */}
          <div className="flex items-center gap-1">
            <ControlPill active={view === "bar"} onClick={() => setView("bar")}>
              Bar
            </ControlPill>
            <ControlPill active={view === "line"} onClick={() => setView("line")}>
              Line
            </ControlPill>
          </div>
          {/* Interval */}
          <div className="ml-2 hidden items-center gap-1 md:flex">
            <ControlPill active={interval === "daily"} onClick={() => setInterval("daily")}>
              Daily
            </ControlPill>
            <ControlPill active={interval === "weekly"} onClick={() => setInterval("weekly")}>
              Weekly
            </ControlPill>
          </div>
          {/* Range */}
          <div className="ml-2 flex items-center gap-1">
            {(["30d", "90d", "6m", "1y", "all"] as TimeRangeKey[]).map((k) => (
              <ControlPill key={k} active={range === k} onClick={() => setRange(k)}>
                {k.toUpperCase()}
              </ControlPill>
            ))}
          </div>
        </div>
      </div>

      {/* Legend toggles (mobile friendly) */}
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-emerald-600"
            checked={showNew}
            onChange={(e) => setShowNew(e.target.checked)}
          />
        <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: BRAND.green }}
            />
            New
          </span>
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-rose-600"
            checked={showLost}
            onChange={(e) => setShowLost(e.target.checked)}
          />
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: BRAND.red }}
            />
            Lost
          </span>
        </label>
      </div>

      {/* Chart */}
      <div className="h-[300px] w-full">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-500">
            No data in selection.
          </div>
        ) : view === "bar" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series}
              margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
              onClick={(e) => handlePointClick(e, "both")}
            >
              <CartesianGrid stroke={BRAND.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: BRAND.grid }}
                tickFormatter={(v) => fmtShortDate(new Date(v))}
                minTickGap={28}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: BRAND.grid }}
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip content={<TooltipCard />} cursor={{ fill: "rgba(17,24,39,0.06)" }} />
              <Legend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => <span className="text-gray-700">{value === "newRD" ? "New" : "Lost"}</span>}
              />
              {showNew && (
                <Bar
                  name="New"
                  dataKey="newRD"
                  fill={BRAND.green}
                  radius={[4, 4, 0, 0]}
                  onClick={(e) => handlePointClick(e, "new")}
                />
              )}
              {showLost && (
                <Bar
                  name="Lost"
                  dataKey="lostRD"
                  fill={BRAND.red}
                  radius={[4, 4, 0, 0]}
                  onClick={(e) => handlePointClick(e, "lost")}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={series}
              margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
              onClick={(e) => handlePointClick(e, "both")}
            >
              <CartesianGrid stroke={BRAND.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: BRAND.grid }}
                tickFormatter={(v) => fmtShortDate(new Date(v))}
                minTickGap={28}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: BRAND.grid }}
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip content={<TooltipCard />} cursor={{ stroke: "rgba(17,24,39,0.30)" }} />
              <Legend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => <span className="text-gray-700">{value === "newRD" ? "New" : "Lost"}</span>}
              />
              {showNew && (
                <Line
                  name="New"
                  type="monotone"
                  dataKey="newRD"
                  stroke={BRAND.green}
                  strokeWidth={2.2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              )}
              {showLost && (
                <Line
                  name="Lost"
                  type="monotone"
                  dataKey="lostRD"
                  stroke={BRAND.red}
                  strokeWidth={2.2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer micro-hint */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-gray-500">
          Interval: <span className="font-medium text-gray-700">{interval}</span> • Range:{" "}
          <span className="font-medium text-gray-700">{range.toUpperCase()}</span>
        </div>
        <div className="text-[11px] text-gray-400">
          Colors — New: <span style={{ color: BRAND.green }}>●</span> Lost:{" "}
          <span style={{ color: BRAND.red }}>●</span>
        </div>
      </div>
    </div>
  );
}

export default RefDomainsGainLoss;


