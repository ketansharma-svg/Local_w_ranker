"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  AreaChart,
  Area,
} from "recharts";
import { ChevronDown, Download, Info as InfoIcon } from "lucide-react";

/**
 * Backlink Tracker — Part 1 (KPI Cards + Referring Domain Trend)
 * Single-container layout as requested:
 *   Row 1: Header — Title • Bar/Line toggle • Time filter dropdown chip • Export button
 *   Row 2: KPI Cards (unchanged design)
 *   Row 3: Trend Chart — custom legend (toggles) in the top-right of chart area
 *
 * Notes
 * - Total RD = blue (#0077FF) for BOTH line and bar views.
 * - Bar view now also shows a BLUE BAR for Total (in addition to the line overlay).
 * - Smart tooltips on KPI mini charts and main chart with colored dot annotations.
 * - Replace makeMockDaily() with real series when wiring to backend.
 */

/* -------------------------------- TOKENS ------------------------------- */
const COLOR = {
  blue: "#0077FF", // Total RD
  green: "#10B981", // New RD
  red: "#EF4444", // Lost RD
  grid: "#E5E7EB",
  border: "#EFF0F6",
  text: "#111827",
  muted: "#6B7280",
  chip: "#F5F7FA",
  chipHover: "#E5E7EB",
} as const;

/* -------------------------------- TYPES -------------------------------- */
type TimeRangeKey = "30d" | "90d" | "6m" | "1y" | "all";
type IntervalKey = "daily" | "weekly";
type ViewKey = "bar" | "line";

type Point = {
  date: Date;
  newRD: number;
  lostRD: number;
  totalRD: number; // cumulative active RD
};

type KPIProps = {
  label: string;
  value: number;
  series: { date: Date; value: number }[];
  kindColor: string;
  variant?: "bar" | "area";
};

/* ------------------------------- HELPERS ------------------------------- */
const fmtInt = (n: number) =>
  Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

const fmtShortDate = (d: Date) =>
  Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(d);

const isoDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const startOfWeekMon = (d: Date) => {
  const x = new Date(d);
  const dow = x.getDay(); // 0..6
  const diff = (dow === 0 ? -6 : 1) - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

function aggregateIntervalDaily(points: Point[]) {
  const map = new Map<string, Point>();
  for (const p of points) {
    const k = isoDay(p.date);
    const prev = map.get(k);
    if (!prev) map.set(k, { ...p, date: new Date(k) });
    else {
      map.set(k, {
        date: new Date(k),
        newRD: prev.newRD + p.newRD,
        lostRD: prev.lostRD + p.lostRD,
        totalRD: p.totalRD,
      });
    }
  }
  return [...map.values()].sort((a, b) => +a.date - +b.date);
}
function aggregateIntervalWeekly(points: Point[]) {
  const map = new Map<string, Point>();
  for (const p of points) {
    const wk = startOfWeekMon(p.date);
    const k = isoDay(wk);
    const prev = map.get(k);
    if (!prev) map.set(k, { ...p, date: new Date(k) });
    else {
      map.set(k, {
        date: new Date(k),
        newRD: prev.newRD + p.newRD,
        lostRD: prev.lostRD + p.lostRD,
        totalRD: p.totalRD,
      });
    }
  }
  return [...map.values()].sort((a, b) => +a.date - +b.date);
}

function rangeStartFor(range: TimeRangeKey, end: Date, min?: Date) {
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
}

/* ---------------------------- SMART TOOLTIPS --------------------------- */
const TooltipCard: React.FC<{ active?: boolean; payload?: any[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.payload;
  const d = raw?.date ? new Date(raw.date) : null;

  const byKey: Record<string, number> = {};
  for (const p of payload) byKey[p.dataKey] = p.value;

  const rows: { key: any; label: string; color: string }[] = [
    { key: "totalRD", label: "Total", color: COLOR.blue },
    { key: "newRD", label: "New", color: COLOR.green },
    { key: "lostRD", label: "Lost", color: COLOR.red },
  ].filter((r) => byKey[r.key] !== undefined);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <div className="text-xs font-medium text-gray-600">
        {d ? d.toLocaleDateString() : ""}
      </div>
      <div className="mt-1 space-y-0.5 text-sm">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="font-semibold text-gray-900">{fmtInt(byKey[r.key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MiniTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload?.date ? new Date(payload[0].payload.date) : null;
  const v = payload[0]?.value ?? 0;
  const color = payload[0]?.fill || payload[0]?.stroke || COLOR.blue;
  return (
    <div className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] shadow">
      <div className="text-gray-500">{d ? d.toLocaleDateString() : ""}</div>
      <div className="mt-0.5 inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
        <b className="text-gray-900">{fmtInt(v)}</b>
      </div>
    </div>
  );
};

/* ------------------------------- PRIMITIVES ---------------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const ChipButton: React.FC<
  React.PropsWithChildren<{
    onClick?: () => void;
    active?: boolean;
    title?: string;
    className?: string;
  }>
> = ({ onClick, active, title, className, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={classNames(
      "inline-flex items-center gap-2 h-9 px-3 rounded-full border text-sm",
      active ? "bg-white" : "bg-[#F5F7FA]",
      "hover:bg-[#E5E7EB]"
    )}
    style={{ borderColor: COLOR.border, color: COLOR.text }}
  >
    {children}
  </button>
);

function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
}

/* --------------------------------- KPI --------------------------------- */
function KPI_Card({ label, value, series, kindColor, variant = "bar" }: KPIProps) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3" style={{ borderColor: COLOR.border }}>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-0.5 text-[18px] font-semibold tabular-nums text-gray-900">{fmtInt(value)}</div>
      </div>
      <div className="h-10 w-36">
        <ResponsiveContainer>
          {variant === "bar" ? (
            <BarChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <RTooltip content={<MiniTooltip />} />
              <Bar dataKey="value" fill={kindColor} radius={[6, 6, 0, 0]} maxBarSize={8} />
            </BarChart>
          ) : (
            <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`mini-${label.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={kindColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={kindColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <RTooltip content={<MiniTooltip />} />
              <Area type="monotone" dataKey="value" stroke={kindColor} fillOpacity={1} fill={`url(#mini-${label.replace(/\s+/g, "")})`} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------- MOCK DATA ---------------------------- */
function makeMockDaily(days = 240): Point[] {
  const raw: { date: Date; newRD: number; lostRD: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const newRD = Math.max(0, Math.round(10 + 6 * Math.sin(i / 5) + (Math.random() * 6 - 3)));
    const lostRD = Math.max(0, Math.round(6 + 5 * Math.cos(i / 9) + (Math.random() * 5 - 2)));
    raw.push({ date: new Date(d.toDateString()), newRD, lostRD });
  }
  const base = 220 + Math.round(Math.random() * 60);
  let total = base;
  return raw.map((r) => {
    total = Math.max(20, total + r.newRD - r.lostRD);
    return { ...r, totalRD: total };
  });
}

function sliceByRange(all: Point[], range: TimeRangeKey) {
  const max = all[all.length - 1]?.date ?? new Date();
  const min = all[0]?.date ?? addDays(max, -179);
  const start = rangeStartFor(range, max, min);
  return all.filter((p) => p.date >= start && p.date <= max);
}

function toInterval(points: Point[], interval: IntervalKey) {
  return interval === "daily" ? aggregateIntervalDaily(points) : aggregateIntervalWeekly(points);
}

/* ------------------------------ MAIN VIEW ----------------------------- */
export default function BacklinkTrackerKPIsAndTrend() {
  const allDaily = useMemo(() => makeMockDaily(240), []);

  // Controls
  const [view, setView] = useState<ViewKey>("bar");
  const [range, setRange] = useState<TimeRangeKey>("30d");
  const [interval, setInterval] = useState<IntervalKey>("daily");
  const [show, setShow] = useState({ total: true, new: true, lost: true });

  // Time dropdown
  const [timeOpen, setTimeOpen] = useState(false);
  const timeRef = useOutsideClose<HTMLDivElement>(timeOpen, () => setTimeOpen(false));

  // Data
  const trend = useMemo(() => toInterval(sliceByRange(allDaily, range), interval), [allDaily, range, interval]);

  // KPI (fixed to 30d as per spec)
  const kpiDaily = useMemo(() => sliceByRange(allDaily, "30d"), [allDaily]);
  const kpiNewSeries = useMemo(() => kpiDaily.map((p) => ({ date: p.date, value: p.newRD })), [kpiDaily]);
  const kpiLostSeries = useMemo(() => kpiDaily.map((p) => ({ date: p.date, value: p.lostRD })), [kpiDaily]);
  const kpiOppSeries = useMemo(
    () =>
      kpiDaily.map((p) => ({
        date: p.date,
        value: Math.max(0, Math.round(p.newRD * 0.35 + p.lostRD * 0.55 + (Math.random() * 2 - 1))),
      })),
    [kpiDaily]
  );
  const kpiNewCount = useMemo(() => kpiNewSeries.reduce((s, r) => s + r.value, 0), [kpiNewSeries]);
  const kpiLostCount = useMemo(() => kpiLostSeries.reduce((s, r) => s + r.value, 0), [kpiLostSeries]);
  const kpiOppCount = useMemo(() => kpiOppSeries.reduce((s, r) => s + r.value, 0), [kpiOppSeries]);

  // Export
  const exportCSV = () => {
    const hdr = ["date", "totalRD", "newRD", "lostRD"];
    const lines = trend.map((r) =>
      [new Date(r.date).toISOString().slice(0, 10), r.totalRD, r.newRD, r.lostRD].join(",")
    );
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "referring-domain-trend.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const timeLabel = `${range.toUpperCase()} • ${interval === "daily" ? "Daily" : "Weekly"}`;

  return (
    <section className="w-full mt-4">
      <div className="rounded-[10px] border bg-white p-4 shadow-sm md:p-5" style={{ borderColor: COLOR.border }}>
        {/* Row 1 — Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-[16px] font-semibold text-gray-900">Backlink Tracker — Referring Domains</h3>
            <p className="text-xs text-gray-500 inline-flex items-center gap-1">
              <InfoIcon size={12} className="text-gray-400" />
              Total (blue), New (green) &amp; Lost (red). Use the controls to adjust range &amp; interval.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <ChipButton
              onClick={() => setView((v) => (v === "bar" ? "line" : "bar"))}
              title="Toggle Bar / Line"
            >
              <span className="font-medium">{view === "bar" ? "Bar" : "Line"}</span>
            </ChipButton>

            {/* Time dropdown chip */}
            <div className="relative" ref={timeRef}>
              <ChipButton onClick={() => setTimeOpen((s) => !s)} title="Time filter">
                <span className="font-medium">{timeLabel}</span>
                <ChevronDown size={16} className="text-[#9CA3AF]" />
              </ChipButton>
              {timeOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-[280px] rounded-md border bg-white p-3 shadow"
                  style={{ borderColor: COLOR.border }}
                >
                  <div className="mb-2 text-xs font-semibold text-gray-700">Range</div>
                  <div className="mb-3 grid grid-cols-3 gap-1 text-sm">
                    {(["30d", "90d", "6m", "1y", "all"] as TimeRangeKey[]).map((k) => (
                      <label
                        key={k}
                        className={classNames(
                          "cursor-pointer rounded border px-2 py-1 text-center",
                          range === k ? "border-[#1090D0] bg-[#E8F5FD] text-[#1090D0]" : "border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <input
                          type="radio"
                          name="range"
                          className="sr-only"
                          checked={range === k}
                          onChange={() => setRange(k)}
                        />
                        {k.toUpperCase()}
                      </label>
                    ))}
                  </div>

                  <div className="mb-2 text-xs font-semibold text-gray-700">Interval</div>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {(["daily", "weekly"] as IntervalKey[]).map((i) => (
                      <label
                        key={i}
                        className={classNames(
                          "cursor-pointer rounded border px-2 py-1 text-center",
                          interval === i ? "border-[#1090D0] bg-[#E8F5FD] text-[#1090D0]" : "border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <input
                          type="radio"
                          name="interval"
                          className="sr-only"
                          checked={interval === i}
                          onChange={() => setInterval(i)}
                        />
                        {i[0].toUpperCase() + i.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export */}
            <ChipButton onClick={exportCSV} title="Export CSV">
              <Download size={16} className="text-[#6B7280]" />
              <span>Export</span>
            </ChipButton>
          </div>
        </div>

        {/* Row 2 — KPI Cards */}
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <KPI_Card
            label="New Referring Domains (30d)"
            value={kpiNewCount}
            series={kpiNewSeries}
            kindColor={COLOR.green}
            variant="bar"
          />
          <KPI_Card
            label="Lost Referring Domains (30d)"
            value={kpiLostCount}
            series={kpiLostSeries}
            kindColor={COLOR.red}
            variant="area"
          />
          <KPI_Card
            label="Opportunities (30d)"
            value={kpiOppCount}
            series={kpiOppSeries}
            kindColor={COLOR.blue}
            variant="bar"
          />
        </div>

        {/* Row 3 — Trend Chart with legend overlay (top-right) */}
        <div className="relative mt-3 h-[340px] w-full rounded-md border" style={{ borderColor: COLOR.border }}>
          {/* Legend / Toggles (top-right corner) */}
          <div className="absolute right-2 top-2 z-10 rounded-md border bg-white/90 px-2 py-1 text-xs backdrop-blur-sm"
               style={{ borderColor: COLOR.border }}>
            <label className="mr-3 inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={show.total}
                onChange={() => setShow((s) => ({ ...s, total: !s.total }))}
              />
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR.blue }} />
                Total
              </span>
            </label>
            <label className="mr-3 inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                className="accent-emerald-600"
                checked={show.new}
                onChange={() => setShow((s) => ({ ...s, new: !s.new }))}
              />
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR.green }} />
                New
              </span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                className="accent-rose-600"
                checked={show.lost}
                onChange={() => setShow((s) => ({ ...s, lost: !s.lost }))}
              />
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR.red }} />
                Lost
              </span>
            </label>
          </div>

          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              {view === "bar" ? (
                <BarChart data={trend} margin={{ top: 16, right: 12, left: 8, bottom: 8 }} barCategoryGap={24}>
                  <CartesianGrid stroke={COLOR.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => fmtShortDate(new Date(v))}
                    minTickGap={28}
                    tick={{ fontSize: 12, fill: COLOR.muted }}
                    axisLine={{ stroke: COLOR.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: COLOR.muted }}
                    axisLine={{ stroke: COLOR.grid }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RTooltip content={<TooltipCard />} cursor={{ fill: "rgba(17,24,39,0.06)" }} />
                  {/* New & Lost bars */}
                  {show.new && (
                    <Bar name="New" dataKey="newRD" fill={COLOR.green} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  )}
                  {show.lost && (
                    <Bar name="Lost" dataKey="lostRD" fill={COLOR.red} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  )}
                  {/* TOTAL BAR (blue) — added per requirement */}
                  {show.total && (
                    <Bar
                      name="Total"
                      dataKey="totalRD"
                      fill={COLOR.blue}
                      radius={[4, 4, 0, 0]}
                      opacity={0.85}
                      maxBarSize={14}
                    />
                  )}
                  {/* Keep the blue line overlay for readability (no other changes) */}
                  {show.total && (
                    <Line
                      name="Total (line)"
                      type="monotone"
                      dataKey="totalRD"
                      stroke={COLOR.blue}
                      dot={false}
                      strokeWidth={2}
                    />
                  )}
                </BarChart>
              ) : (
                <LineChart data={trend} margin={{ top: 16, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={COLOR.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => fmtShortDate(new Date(v))}
                    minTickGap={28}
                    tick={{ fontSize: 12, fill: COLOR.muted }}
                    axisLine={{ stroke: COLOR.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: COLOR.muted }}
                    axisLine={{ stroke: COLOR.grid }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RTooltip content={<TooltipCard />} cursor={{ stroke: "rgba(17,24,39,0.30)" }} />
                  {show.total && (
                    <Line name="Total" type="monotone" dataKey="totalRD" stroke={COLOR.blue} strokeWidth={2.2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  )}
                  {show.new && (
                    <Line name="New" type="monotone" dataKey="newRD" stroke={COLOR.green} strokeWidth={2.2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  )}
                  {show.lost && (
                    <Line name="Lost" type="monotone" dataKey="lostRD" stroke={COLOR.red} strokeWidth={2.2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
