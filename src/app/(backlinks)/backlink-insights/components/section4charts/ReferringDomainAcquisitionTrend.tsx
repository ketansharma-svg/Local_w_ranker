
import React, { useMemo, useState } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    Legend,
    BarChart,
    Bar,
} from "recharts";

/**
 * INPUT SHAPE (any of these are fine; the component will normalize):
 * [{ date: '2025-08-01', total?: number, cumulative?: number, gained?: number, lost?: number }]
 * - If gained/lost are not provided, they are derived from total/cumulative deltas.
 * - date can be Date or ISO-like string (YYYY-MM-DD recommended).
 */

type RawPoint = {
    date: string | Date;
    total?: number;       // cumulative total for that day
    cumulative?: number;  // alias of total (accepted)
    gained?: number;      // gained that day
    lost?: number;        // lost that day
};

type NormPoint = {
    date: Date;
    label: string;  // e.g., "Aug 12"
    total: number;  // cumulative total
    gained: number; // >= 0
    lost: number;   // >= 0
    net: number;    // gained - lost (can be negative)
};

type Props = {
    data?: RawPoint[];
    height?: number;
    className?: string;
    onPointClick?: (point: NormPoint) => void; // for deep-linking to Audit
};

const COLORS = {
    line: "#1090D0",    // branded blue for cumulative line
    area: "rgba(16,144,208,0.20)",
    gain: "#10B981",    // green
    loss: "#EF4444",    // red
    grid: "#E5E7EB",
    text: "#374151",
};

const fmtLabel = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });

const parseDate = (d: string | Date) => (d instanceof Date ? d : new Date(d));

const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

/** Build fallback demo data (non-zero movement) */
const buildDemoData = (days = 30): RawPoint[] => {
    const today = new Date();
    const start = addDays(today, -days + 1);
    let running = 500 + Math.floor(Math.random() * 100); // seed
    const out: RawPoint[] = [];

    for (let i = 0; i < days; i++) {
        const dt = addDays(start, i);
        // Create “events” with occasional loss
        const gain = Math.max(0, Math.round((Math.sin(i / 3) + 1.2) * 3 + (Math.random() * 5)));
        const loss = Math.max(0, Math.round((Math.cos(i / 5) - 0.4) * 2 + (Math.random() * 2)));
        running = Math.max(0, running + gain - loss);
        out.push({
            date: toISO(dt),
            gained: gain,
            lost: loss,
            total: running,
        });
    }
    return out;
};

const toISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

/** Normalize any input to a clean daily series with {total,gained,lost,net} */
function normalizeDaily(raw: RawPoint[]): NormPoint[] {
    if (!raw || raw.length === 0) return [];

    // sort by date asc, coerce numbers
    const sorted = [...raw]
        .map((r) => ({
            date: parseDate(r.date),
            total: Number(r.total ?? r.cumulative ?? NaN),
            gained: r.gained != null ? Number(r.gained) : undefined,
            lost: r.lost != null ? Number(r.lost) : undefined,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const out: NormPoint[] = [];
    let prevTotal: number | undefined = undefined;

    for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        const total = Number.isFinite(p.total)
            ? (p.total as number)
            : (() => {
                // If total is missing, but we have explicit gained/lost + prevTotal, build it.
                const g = Math.max(0, Number(p.gained ?? 0));
                const l = Math.max(0, Number(p.lost ?? 0));
                const t = Math.max(0, (prevTotal ?? 0) + g - l);
                return t;
            })();

        let gained = Math.max(0, Number(p.gained ?? 0));
        let lost = Math.max(0, Number(p.lost ?? 0));

        if (p.gained == null && p.lost == null && prevTotal != null) {
            // derive from day-over-day deltas of cumulative total
            const diff = total - prevTotal;
            if (diff >= 0) {
                gained = diff;
                lost = 0;
            } else {
                gained = 0;
                lost = -diff;
            }
        }

        if (prevTotal == null && p.gained == null && p.lost == null) {
            // first point, no prior context: treat the whole total as gained (or 0 if negative)
            gained = Math.max(0, total);
            lost = 0;
        }

        const net = gained - lost;

        out.push({
            date: p.date,
            label: fmtLabel(p.date),
            total,
            gained,
            lost,
            net,
        });

        prevTotal = total;
    }

    return out;
}

/** Group daily points into weeks: sum gained/lost/net, carry last total of the week */
function toWeekly(points: NormPoint[]): NormPoint[] {
    if (points.length === 0) return [];
    const weeks = new Map<
        string,
        { start: Date; gained: number; lost: number; net: number; total: number }
    >();

    const weekKey = (d: Date) => {
        // Monday-based week start
        const wd = d.getDay(); // 0..6
        const offset = wd === 0 ? -6 : 1 - wd; // move to Monday
        const start = addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), offset);
        return toISO(start);
    };

    points.forEach((p) => {
        const key = weekKey(p.date);
        const bucket = weeks.get(key) ?? {
            start: new Date(key),
            gained: 0,
            lost: 0,
            net: 0,
            total: p.total, // will be updated to last-of-week
        };
        bucket.gained += p.gained;
        bucket.lost += p.lost;
        bucket.net += p.net;
        bucket.total = p.total; // last seen wins (end-of-week total)
        weeks.set(key, bucket);
    });

    const out: NormPoint[] = Array.from(weeks.values())
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map((w) => ({
            date: w.start,
            label: fmtLabel(w.start),
            total: w.total,
            gained: w.gained,
            lost: w.lost,
            net: w.net,
        }));

    return out;
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string }> = ({
    active,
    payload,
    label,
}) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0]?.payload as NormPoint;
    if (!p) return null;
    return (
        <div className="rounded-lg bg-white/95 shadow border border-gray-200 p-3 min-w-[220px]">
            <div className="text-[13px] font-medium text-gray-700">{label}</div>
            {"total" in p && (
                <div className="mt-1 text-[13px]">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: COLORS.line }} />
                    <span className="text-gray-600">Total Domains: </span>
                    <span className="font-semibold text-gray-800">{p.total}</span>
                </div>
            )}
            <div className="mt-1 text-[13px]">
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: COLORS.gain }} />
                <span className="text-gray-600">Gained: </span>
                <span className="font-semibold text-gray-800">+{p.gained}</span>
            </div>
            <div className="mt-0.5 text-[13px]">
                <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: COLORS.loss }} />
                <span className="text-gray-600">Lost: </span>
                <span className="font-semibold text-gray-800">-{p.lost}</span>
            </div>
            <div className="mt-0.5 text-[13px]">
                <span className="text-gray-600">Net Change: </span>
                <span
                    className={`font-semibold ${p.net > 0 ? "text-emerald-600" : p.net < 0 ? "text-rose-600" : "text-gray-800"
                        }`}
                >
                    {p.net > 0 ? `+${p.net}` : p.net}
                </span>
            </div>
            <div className="mt-2 text-[12px] text-sky-600 hover:underline cursor-pointer">
                Audit these domains →
            </div>
        </div>
    );
};

export default function RefDomainAcquisitionTrendFixed({
    data,
    height = 320,
    className = "",
    onPointClick,
}: Props) {
    const [range, setRange] = useState<"30D" | "90D">("30D");
    const [interval, setInterval] = useState<"daily" | "weekly">("daily");
    const [mode, setMode] = useState<"cumulative" | "net">("cumulative");

    /** Use provided data or a sensible demo fallback */
    const baseDaily = useMemo<NormPoint[]>(() => {
        const raw = (data && data.length > 0 ? data : buildDemoData(30)) as RawPoint[];
        const normalized = normalizeDaily(raw);
        // If range is 30D but you passed a longer series, we’ll trim later.
        return normalized;
    }, [data]);

    /** Apply range filter (keeps the last N points) */
    const rangedDaily = useMemo(() => {
        const n = range === "30D" ? 30 : 90;
        return baseDaily.slice(-n);
    }, [baseDaily, range]);

    /** Apply interval transform */
    const series: NormPoint[] = useMemo(
        () => (interval === "weekly" ? toWeekly(rangedDaily) : rangedDaily),
        [rangedDaily, interval]
    );

    const handleClick = (e: any) => {
        if (!e || !onPointClick) return;
        const point = e.activePayload?.[0]?.payload as NormPoint;
        if (point) onPointClick(point);
    };

    const HeaderToggles = () => (
        <div className="flex items-center gap-2 ml-auto">
            <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
                {(["30D", "90D"] as const).map((opt) => (
                    <button
                        key={opt}
                        onClick={() => setRange(opt)}
                        className={`px-2.5 py-1.5 text-xs rounded ${range === opt ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
                {(["daily", "weekly"] as const).map((opt) => (
                    <button
                        key={opt}
                        onClick={() => setInterval(opt)}
                        className={`px-2.5 py-1.5 text-xs rounded capitalize ${interval === opt ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
                {(["cumulative", "net"] as const).map((opt) => (
                    <button
                        key={opt}
                        onClick={() => setMode(opt)}
                        className={`px-2.5 py-1.5 text-xs rounded capitalize ${mode === opt ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className={`rounded-2xl h-full border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
            <div className="flex items-start gap-3">
                <div>
                    <h3 className="text-[16px] font-semibold text-gray-900">Referring Domain Acquisition Trend</h3>
                    <p className="text-xs text-gray-500">
                        Cumulative total or per-period net change in referring domains. Hover for daily breakdown; click to drill
                        down.
                    </p>
                </div>
                <HeaderToggles />
            </div>

            <div style={{ height }} className="mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    {mode === "cumulative" ? (
                        <LineChart
                            data={series}
                            margin={{ top: 10, right: 12, bottom: 4, left: 6 }}
                            onClick={handleClick}
                        >
                            <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fill: COLORS.text, fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fill: COLORS.text, fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="none"
                                fill={COLORS.area}
                                isAnimationActive={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke={COLORS.line}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 4 }}
                                isAnimationActive={false}
                            />
                            <Legend
                                verticalAlign="bottom"
                                align="left"
                                wrapperStyle={{ fontSize: 12, color: COLORS.text, paddingTop: 8 }}
                                formatter={(v) => (v === "total" ? "Total Referring Domains" : v)}
                            />
                        </LineChart>
                    ) : (
                        <BarChart data={series} margin={{ top: 10, right: 12, bottom: 4, left: 6 }} onClick={handleClick}>
                            <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fill: COLORS.text, fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fill: COLORS.text, fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="gained" stackId="a" fill={COLORS.gain} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="lost" stackId="b" fill={COLORS.loss} radius={[4, 4, 0, 0]} />
                            {/* Show net as a thin line overlay if you want a quick glance at balance */}
                            {/* <Line type="monotone" dataKey="net" stroke="#111827" strokeDasharray="4 4" dot={false} /> */}
                            <Legend
                                verticalAlign="bottom"
                                align="left"
                                wrapperStyle={{ fontSize: 12, color: COLORS.text, paddingTop: 8 }}
                                payload={[
                                    { value: "Gained", type: "square", id: "g", color: COLORS.gain },
                                    { value: "Lost", type: "square", id: "l", color: COLORS.loss },
                                ]}
                            />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>

            <div className="mt-2 text-[11px] text-gray-500">
                Click a point/bar to open the Referring Domains table for that date range. Legend items are toggleable.
            </div>
        </div>
    );
}


