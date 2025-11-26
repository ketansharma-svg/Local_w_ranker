import * as React from "react";
import {
  Area,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";

type RangeKey = "30D" | "90D" | "6M" | "1Y" | "ALL";
type IntervalKey = "DAILY" | "WEEKLY";

export type BacklinkPoint = {
  /** ISO date string (yyyy-mm-dd) */
  date: string;
  /** backlinks first seen on this day/period */
  gained: number;
  /** backlinks lost/removed on this day/period */
  lost: number;
};

export interface BacklinksAcquisitionTrendProps {
  /** Optional pre-aggregated daily series; if omitted or all zeros, demo data is generated */
  data?: BacklinkPoint[];
  /** Initial range */
  defaultRange?: RangeKey;
  /** Initial interval */
  defaultInterval?: IntervalKey;
  /** Called when user clicks a point or area (route to Audit tab, etc.) */
  onPointClick?: (payload: {
    date: string;
    metric: "gained" | "lost" | "both";
    values: { gained: number; lost: number; net: number };
  }) => void;
  /** Height of the chart card */
  height?: number;
  /** Show subtle area fill under the lines */
  areaFillDefault?: boolean;
  /** Optional title override */
  title?: string;
  /** Optional description under title */
  subtitle?: string;
}

/* ---------- styling & color tokens (Wranker) ---------- */
const GREEN = "#10B981"; // gained
const RED = "#EF4444"; // lost
const GRID = "#E5E7EB";
const TEXT = "#374151";
const BLUE = "#1090D0";

/* ---------- utilities ---------- */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

const daysBetween = (a: Date, b: Date) =>
  Math.round((+a - +b) / (1000 * 60 * 60 * 24));

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const startOfISOWeek = (d: Date) => {
  // ISO week starts Monday
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1) - day;
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() + diff);
  return s;
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);

/** generate deterministic demo data (30D baseline), then extend for longer ranges */
function generateDemoDailySeries(totalDays: number): BacklinkPoint[] {
  const today = new Date();
  const start = addDays(today, -totalDays + 1);
  const rngSeed = 37;
  let s = rngSeed;

  const series: BacklinkPoint[] = [];
  for (let i = 0; i < totalDays; i++) {
    // simple pseudo‑random with a mild weekly rhythm
    s = (s * 9301 + 49297) % 233280;
    const base = (s / 233280) * 8;

    const d = addDays(start, i);
    const weekday = d.getDay();

    // slight weekly cycle: mid‑week higher, weekend lower
    const gained = Math.max(
      0,
      Math.round(
        (weekday === 2 || weekday === 3 ? base + 6 : weekday === 0 ? base - 2 : base + 2) +
          (i % 17 === 0 ? 10 : 0) // occasional spikes
      )
    );
    const lost = Math.max(
      0,
      Math.round(
        (weekday === 4 ? base + 2 : weekday === 6 ? base + 1 : base * 0.5) +
          (i % 23 === 0 ? 6 : 0) // rarer loss spikes
      )
    );

    series.push({ date: toISO(d), gained, lost });
  }
  return series;
}

/** if the input is empty or flat zeros, seed demo data */
function ensureNonEmptyData(input?: BacklinkPoint[], rangeDays = 30): BacklinkPoint[] {
  if (!input || input.length === 0) return generateDemoDailySeries(rangeDays);
  const sum = input.reduce((acc, p) => acc + p.gained + p.lost, 0);
  return sum === 0 ? generateDemoDailySeries(rangeDays) : input;
}

/** slice by range from the end */
function sliceByRange(data: BacklinkPoint[], range: RangeKey): BacklinkPoint[] {
  if (range === "ALL") return data;
  const days = range === "30D" ? 30 : range === "90D" ? 90 : range === "6M" ? 182 : 365;
  return data.slice(-days);
}

/** when WEEKLY, aggregate by ISO week starting Monday */
function toWeekly(data: BacklinkPoint[]): BacklinkPoint[] {
  const map = new Map<string, { gained: number; lost: number }>();
  for (const p of data) {
    const weekStart = toISO(startOfISOWeek(new Date(p.date)));
    const agg = map.get(weekStart) ?? { gained: 0, lost: 0 };
    agg.gained += p.gained;
    agg.lost += p.lost;
    map.set(weekStart, agg);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, v]) => ({ date, gained: v.gained, lost: v.lost }));
}

/** gradient id helper to avoid DOM id collisions when the component is used multiple times */
const useUID = (prefix: string) => React.useId().replace(/:/g, "_") + `_${prefix}`;

/* ---------- custom tooltip ---------- */
const TrendTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const gained = Number(payload.find((p) => p.dataKey === "gained")?.value ?? 0);
  const lost = Number(payload.find((p) => p.dataKey === "lost")?.value ?? 0);
  const net = gained - lost;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
      <div className="mb-1 text-xs text-gray-500">{fmtDate(label!)}</div>
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: GREEN }} />
        <span className="text-gray-800">Backlinks Gained:</span>
        <span className="font-semibold text-gray-900">{gained}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: RED }} />
        <span className="text-gray-800">Backlinks Lost:</span>
        <span className="font-semibold text-gray-900">{lost}</span>
      </div>
      <div className="mt-2 border-t pt-2 text-sm">
        <span className="text-gray-800">Net Change:</span>{" "}
        <span className={`font-semibold ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {net >= 0 ? `+${net}` : net}
        </span>
      </div>
      <div className="mt-2 text-[11px] text-blue-600 underline">View in Backlink Audit</div>
    </div>
  );
};

/* ---------- main component ---------- */
const BacklinksAcquisitionTrend: React.FC<BacklinksAcquisitionTrendProps> = ({
  data,
  defaultRange = "30D",
  defaultInterval = "DAILY",
  onPointClick,
  height = 320,
  areaFillDefault = true,
  title = "Backlinks Gain vs Loss (Time Series)",
  subtitle = "Tracks backlinks gained or lost over time. Toggle range/interval, hover for breakdown, click to drill into the audit."
}) => {
  const [range, setRange] = React.useState<RangeKey>(defaultRange);
  const [interval, setInterval] = React.useState<IntervalKey>(defaultInterval);
  const [areaFill, setAreaFill] = React.useState<boolean>(areaFillDefault);
  const [showGained, setShowGained] = React.useState(true);
  const [showLost, setShowLost] = React.useState(true);

  // Ensure we always have something to render
  const baseDaily = React.useMemo(
    () => ensureNonEmptyData(data, 90),
    [data]
  );

  // Slice by range
  const sliced = React.useMemo(() => sliceByRange(baseDaily, range), [baseDaily, range]);

  // Interval transform
  const series = React.useMemo(
    () => (interval === "WEEKLY" ? toWeekly(sliced) : sliced),
    [interval, sliced]
  );

  // unique ids for gradient defs
  const gradGain = useUID("gain");
  const gradLoss = useUID("loss");

  const handleClick = (e: any) => {
    if (!e || !e.activePayload) return;
    const row = e.activePayload[0].payload as BacklinkPoint;
    const payload = {
      date: row.date,
      metric: "both" as const,
      values: { gained: row.gained, lost: row.lost, net: row.gained - row.lost },
    };
    onPointClick?.(payload);
  };

  // Legend toggling (click legend item)
  const handleLegendClick = (o: any) => {
    if (o?.dataKey === "gained") setShowGained((v) => !v);
    if (o?.dataKey === "lost") setShowLost((v) => !v);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* range */}
          <div className="inline-flex overflow-hidden rounded-md border border-gray-200">
            {(["30D", "90D", "6M", "1Y", "ALL"] as RangeKey[]).map((r) => (
              <button
                key={r}
                className={`px-3 py-1.5 text-xs ${range === r ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>

          {/* interval */}
          <div className="inline-flex overflow-hidden rounded-md border border-gray-200">
            {(["DAILY", "WEEKLY"] as IntervalKey[]).map((i) => (
              <button
                key={i}
                className={`px-3 py-1.5 text-xs ${interval === i ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                onClick={() => setInterval(i)}
              >
                {i === "DAILY" ? "Daily" : "Weekly"}
              </button>
            ))}
          </div>

          {/* area fill */}
          <button
            className={`rounded-md border px-3 py-1.5 text-xs ${areaFill ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
            onClick={() => setAreaFill((v) => !v)}
            title="Toggle line fill"
          >
            {areaFill ? "Area On" : "Area Off"}
          </button>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
            onClick={handleClick}
          >
            <defs>
              <linearGradient id={gradGain} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.25} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={gradLoss} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={RED} stopOpacity={0.25} />
                <stop offset="100%" stopColor={RED} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: TEXT, fontSize: 12 }}
              tickFormatter={fmtDate}
              axisLine={{ stroke: GRID }}
              tickLine={{ stroke: GRID }}
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: TEXT, fontSize: 12 }}
              allowDecimals={false}
              axisLine={{ stroke: GRID }}
              tickLine={{ stroke: GRID }}
            />

            <Tooltip content={<TrendTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={28}
              onClick={handleLegendClick}
              formatter={(v) => (
                <span className="text-[13px] font-medium text-gray-700">
                  {v === "gained" ? "Backlinks Gained" : "Backlinks Lost"}
                </span>
              )}
            />

            {/* Areas with strokes act as line+fill; conditionally hidden via showGained/showLost */}
            {showGained && (
              <Area
                type="monotone"
                dataKey="gained"
                stroke={GREEN}
                strokeWidth={2.5}
                fill={areaFill ? `url(#${gradGain})` : "transparent"}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {showLost && (
              <Area
                type="monotone"
                dataKey="lost"
                stroke={RED}
                strokeWidth={2.5}
                fill={areaFill ? `url(#${gradLoss})` : "transparent"}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-[11px] text-gray-500">
          Legend items are toggleable. Click a point to open filtered “New & Lost” in Backlink Audit.
        </div>
        <button
          className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
          onClick={() => {
            // optional "View Full History" action
            const payload = series.at(-1);
            if (!payload) return;
            onPointClick?.({
              date: payload.date,
              metric: "both",
              values: { gained: payload.gained, lost: payload.lost, net: payload.gained - payload.lost },
            });
          }}
        >
          View Full History →
        </button>
      </div>
    </div>
  );
};

export default BacklinksAcquisitionTrend;



