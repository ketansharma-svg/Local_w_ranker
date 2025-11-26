"use client";

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Info as InfoIcon, ChevronDown } from "lucide-react";

/* ----------------------------------------------------------------------------
 * DESIGN TOKENS (unchanged visual language)
 * --------------------------------------------------------------------------*/
const TOKENS = {
  surface: "#FFFFFF",
  text: "#000000",
  muted: "#6B7280",
  mutedDark: "#282829",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  subtle: "#F5F7FA",
  tint: "#D2EFFF",

  brand: "#1090D0",

  red: "#EA5455",
  yellow: "#FF9F43",
  green: "#28C76F",
  neutral: "#6C757D",

  teal: "#20C997", // optional accent for “My” cards
} as const;

/* ----------------------------------------------------------------------------
 * TYPES
 * --------------------------------------------------------------------------*/
type SeriesPoint = { t: string; v: number };
type TrendSeries = SeriesPoint[];

type TeamMember = { id: string; name: string };
type CountByAssignee = { id: string; name: string; count: number };

type SingleProjectKpiData = {
  team: TeamMember[];
  viewerId: string;

  open: {
    total: number;
    deltaPct: number;
    statusSplit: { notStarted: number; inProgress: number; inReview?: number };
    series: TrendSeries;
  };

  inProgress: {
    total: number;
    deltaPct: number;
    dueSplit: { dueToday: number; overdue: number; upcoming: number };
    series: TrendSeries;
  };

  overdue: { total: number; deltaPct: number; byAssignee: CountByAssignee[]; series: TrendSeries };
  dueToday: { total: number; deltaPct: number; byAssignee: CountByAssignee[]; series: TrendSeries };
  completed7d: { total: number; deltaPct: number; byAssignee: CountByAssignee[]; series: TrendSeries };
  comments72h: { total: number; deltaPct: number; byAssignee: CountByAssignee[]; series: TrendSeries };

  myOpen: {
    total: number;
    deltaPct: number;
    statusSplit: { notStarted: number; inProgress: number; inReview?: number };
    series: TrendSeries;
  };

  upcoming: {
    total: number;
    deltaPct: number;
    byAssignee: CountByAssignee[];
    series: TrendSeries;
    windowDays: number;
  };

  myUpcoming: {
    total: number;
    deltaPct: number;
    dueBuckets: { tomorrow: number; twoToThree: number; fourToSeven: number; noDue?: number };
    series: TrendSeries;
    windowDays: number;
  };
};

/* ----------------------------------------------------------------------------
 * FORMATTERS
 * --------------------------------------------------------------------------*/
const intFmt = new Intl.NumberFormat();
function fmtInt(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return intFmt.format(n);
}
function caret(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v) || v === 0) return "—";
  return v > 0 ? "▲" : "▼";
}
function deltaColor(v?: number, invert = false) {
  if (typeof v !== "number" || Number.isNaN(v) || v === 0) return TOKENS.muted;
  const good = invert ? v < 0 : v > 0;
  return good ? TOKENS.green : TOKENS.red;
}
function toDateLabel(d: string | number | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

/* ----------------------------------------------------------------------------
 * COLOR UTILS + MIXERS
 * --------------------------------------------------------------------------*/
function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  const bigint = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const h = x.toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("")
  );
}
function mixWithWhite(hex: string, weight01: number) {
  const { r, g, b } = hexToRgb(hex);
  const W = 255;
  const w = Math.max(0, Math.min(1, weight01));
  return rgbToHex(Math.round(r * (1 - w) + W * w), Math.round(g * (1 - w) + W * w), Math.round(b * (1 - w) + W * w));
}
function toRgba(c: string, alpha: number) {
  if (c.startsWith("rgb(")) return c.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  if (c.startsWith("#")) {
    const { r, g, b } = hexToRgb(c);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return c;
}

/* ----------------------------------------------------------------------------
 * ZERO-DATA VISUALS (exact subtle behaviour you asked for)
 * --------------------------------------------------------------------------*/
function EmptyMini({ label = "No data" }: { label?: string }) {
  return (
    <div className="flex h-16 w-full items-center justify-center text-[11px]" title={label}>
      {label}
    </div>
  );
}

function SmartTooltip({ active, label, payload, zeroMode }: any) {
  if (!active) return null;
  const rows = payload ?? [];
  const total = rows.reduce((s: number, r: any) => s + (r?.value ?? 0), 0);
  const showRows = rows.length > 0 ? rows : [{ name: "Value", value: 0, color: TOKENS.muted }];

  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{
        borderColor: TOKENS.border,
        color: TOKENS.text,
        pointerEvents: "none",
        zIndex: 9999,
        width: "max-content",
        maxWidth: "90vw",
      }}
    >
      {label !== undefined && (
        <div className="mb-1 font-medium" style={{ color: TOKENS.mutedDark }}>
          {toDateLabel(label as string)}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {showRows.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TOKENS.muted }}>{p.name}</span>
            </div>
            <div className="ml-auto font-semibold">{fmtInt(p.value as number)}</div>
          </div>
        ))}
      </div>
      {(zeroMode || total === 0) && (
        <div className="mt-1 text-[11px]" style={{ color: TOKENS.muted }}>
          No data for this period
        </div>
      )}
    </div>
  );
}

/* Donut with faded single-ring when total = 0 */
function DonutSplit({
  parts,
  aria,
  size = 52,
  tooltipTitle,
}: {
  parts: { name: string; count: number; color: string }[];
  aria: string;
  size?: number;
  tooltipTitle?: string;
}) {
  const total = parts.reduce((s, p) => s + (p.count || 0), 0) || 0;
  const base = parts[0]?.color || TOKENS.muted;
  const safeParts =
    total === 0 ? [{ name: "No data", count: 1, color: toRgba(base, 0.18) }] : parts;

  const normTotal = safeParts.reduce((s, p) => s + (p.count || 0), 0) || 1;
  const normalized = safeParts.map((p) => ({ ...p, v: p.count / normTotal, share01: p.count / normTotal }));

  function DonutTooltipInner({ active }: any) {
    if (!active) return null;
    return (
      <div
        role="tooltip"
        className="rounded-md border bg-white p-2 text-xs shadow"
        style={{ borderColor: TOKENS.border, color: TOKENS.text, pointerEvents: "none", zIndex: 9999, width: "max-content", maxWidth: "90vw" }}
      >
        {tooltipTitle && (
          <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
            {tooltipTitle}
          </div>
        )}
        <div className="flex flex-col gap-1">
          {normalized.map((p, i) => (
            <div key={i} className="flex items-center gap-4 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span style={{ color: TOKENS.muted }}>{p.name}</span>
              </div>
              <div className="ml-auto flex items-baseline gap-2">
                <span className="font-semibold">{fmtInt(Math.round(p.share01 * total))}</span>
                <span className="text-[11px]" style={{ color: TOKENS.muted }}>
                  {(p.share01 * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[52px] w-[52px] shrink-0" role="img" aria-label={aria} title={total === 0 ? "No data" : undefined}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }} content={<DonutTooltipInner />} offset={8} />
          <Pie
            data={normalized}
            dataKey="v"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
          >
            {normalized.map((p, i) => (
              <Cell key={i} fill={p.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Spark Area — switches to EmptyMini / faded tooltip when all zeros */
function SparkArea({ series, aria, color }: { series: TrendSeries; aria: string; color: string }) {
  const data = series.map((p) => ({ date: p.t, value: p.v }));
  const allZero = data.every((d) => (d.value ?? 0) === 0);
  if (allZero) return <EmptyMini />;

  const stroke = allZero ? toRgba(color, 0.35) : color;
  const fillTop = allZero ? toRgba(color, 0.18) : color;
  const fillBottom = allZero ? toRgba("#ffffff", 0.06) : "#ffffff";
  const gradId = `grad-${aria.replace(/\s+/g, "-")}`;

  return (
    <div className="h-16 w-[10.5rem]" role="img" aria-label={aria} title={allZero ? "No data for this period" : undefined}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillTop} stopOpacity={allZero ? 1 : 0.45} />
              <stop offset="100%" stopColor={fillBottom} stopOpacity={allZero ? 1 : 0.2} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
            content={<SmartTooltip zeroMode={allZero} />}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={{ stroke: stroke, strokeOpacity: allZero ? 0.08 : 0.15 }}
          />
          <Area type="monotone" dataKey="value" stroke={stroke} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Spark Bars — switches to EmptyMini / faded tooltip when all zeros */
function SparkBars({ series, aria, color }: { series: TrendSeries; aria: string; color: string }) {
  const data = series.map((p) => ({ date: p.t, value: p.v }));
  const allZero = data.every((d) => (d.value ?? 0) === 0);
  if (allZero) return <EmptyMini />;

  const barFill = allZero ? toRgba(color, 0.25) : color;

  return (
    <div className="h-16 w-[10.5rem]" role="img" aria-label={aria} title={allZero ? "No data for this period" : undefined}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <RTooltip
            wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
            content={<SmartTooltip zeroMode={allZero} />}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={{ fill: allZero ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="value" fill={barFill} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}



function TitleWithHoverInfo({ title, info }: { title: string; info?: string }) {
  return (
    <div className="relative flex min-w-0 items-center gap-2 group/title">
      <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.mutedDark }}>
        {title}
      </div>
      {info ? <InfoIcon size={15} className="text-[#9CA3AF]" /> : null}
      {info ? (
        <div
          role="tooltip"
          className="invisible group-hover/title:visible absolute left-0 top-5 z-50 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}

function CardShell({
  title,
  info,
  children,
  onClick,
}: {
  title: string;
  info?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group   z-0 flex w-full flex-col rounded-[16px] border p-4 text-left shadow-sm transition-transform hover:-translate-y-[2px] hover:z-[10] focus-within:z-[10] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1090D0]/40"
      style={{
        background: TOKENS.surface,
        borderColor: TOKENS.border,
        overflow: "visible", // allow smart popovers to overflow
      }}
      aria-label={`${title}, click to filter`}
    >
      <div className="flex items-center justify-between">
        <TitleWithHoverInfo title={title} info={info} />
      </div>
      <div className="mt-2">{children}</div>
    </button>
  );
}

/* ----------------------------------------------------------------------------
 * ADAPTER — your API → UI
 * --------------------------------------------------------------------------*/
type ApiKpi = {
  project?: { id: number; name: string | null; domain?: string; url?: string };
  role?: string;
  summary?: {
    team_open_tasks: number;
    team_in_progress: number;
    team_in_review?: number;  // ← add
    my_open_tasks?: number;
    my_in_progress?: number;
    my_in_review?: number;
    overdue: number;
    due_today: number;
    completed_this_week: number;
    upcoming_7d: number;
  };
  trends_last_7_days?: Array<{
    date: string;
    open_tasks: number;
    in_progress: number;
    overdue: number;
    due_today: number;
    completed: number;
    upcoming: number;
  }>;
};

function make7dZeroSkeleton(): Array<{ date: string; open: number; ip: number; od: number; dt: number; comp: number; upc: number }> {
  const out: any[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    out.push({ date, open: 0, ip: 0, od: 0, dt: 0, comp: 0, upc: 0 });
  }
  return out;
}
function pctDelta(vals: number[]) {
  if (!vals || vals.length < 2) return 0;
  const last = vals[vals.length - 1] ?? 0;
  const prev = vals[vals.length - 2] ?? 0;
  if (prev === 0) return last === 0 ? 0 : 100;
  return ((last - prev) / prev) * 100;
}
function toSeries(trend: Array<{ date: string; value: number }>) {
  return trend.map((d) => ({ t: d.date, v: Math.max(0, d.value ?? 0) }));
}
function adaptFromApi(api?: ApiKpi): SingleProjectKpiData {
  const s = api?.summary ?? {
    team_open_tasks: 0,
    team_in_progress: 0,
    overdue: 0,
    due_today: 0,
    completed_this_week: 0,
    upcoming_7d: 0,
  };

  const raw = api?.trends_last_7_days ?? [];
  const mapped = raw.map((d) => ({
    date: d.date,
    open: d.open_tasks ?? 0,
    ip: d.in_progress ?? 0,
    od: d.overdue ?? 0,
    dt: d.due_today ?? 0,
    comp: d.completed ?? 0,
    upc: d.upcoming ?? 0,
  }));
  const trend = mapped.length ? mapped : make7dZeroSkeleton();

  const seriesOpen = toSeries(trend.map((d) => ({ date: d.date, value: d.open })));
  const seriesIP = toSeries(trend.map((d) => ({ date: d.date, value: d.ip })));
  const seriesOD = toSeries(trend.map((d) => ({ date: d.date, value: d.od })));
  const seriesDT = toSeries(trend.map((d) => ({ date: d.date, value: d.dt })));
  const seriesCW = toSeries(trend.map((d) => ({ date: d.date, value: d.comp })));
  const seriesUP = toSeries(trend.map((d) => ({ date: d.date, value: d.upc })));

const openTotal = s.team_open_tasks ?? 0;
const inProgTotal = s.team_in_progress ?? 0;

const inReviewTotal =
  (s.team_in_review ?? 0);

const notStarted = Math.max(0, openTotal - inProgTotal - inReviewTotal);


  const empty: CountByAssignee[] = [];

  return {
    team: [],
    viewerId: "u1",

    open: {
      total: openTotal,
      deltaPct: pctDelta(seriesOpen.map((p) => p.v)),
      statusSplit: { notStarted, inProgress: inProgTotal, inReview: inReviewTotal },
      series: seriesOpen,
    },

    inProgress: {
  total: s.team_in_progress ?? 0,
        deltaPct: pctDelta(seriesIP.map((p) => p.v)),
      dueSplit: { dueToday: s.due_today ?? 0, overdue: s.overdue ?? 0, upcoming: s.upcoming_7d ?? 0 },
      series: seriesIP,
    },

    overdue: { total: s.overdue ?? 0, deltaPct: 0, byAssignee: empty, series: seriesOD },
    dueToday: { total: s.due_today ?? 0, deltaPct: pctDelta(seriesDT.map((p) => p.v)), byAssignee: empty, series: seriesDT },
    completed7d: { total: s.completed_this_week ?? 0, deltaPct: pctDelta(seriesCW.map((p) => p.v)), byAssignee: empty, series: seriesCW },
    comments72h: { total: 0, deltaPct: 0, byAssignee: empty, series: [] },

myOpen: {
  total: openTotal,
  deltaPct: pctDelta(seriesOpen.map((p) => p.v)),
  statusSplit: { notStarted, inProgress: inProgTotal, inReview: inReviewTotal },
  series: seriesOpen,
},
    upcoming: { total: s.upcoming_7d ?? 0, deltaPct: pctDelta(seriesUP.map((p) => p.v)), byAssignee: empty, series: seriesUP, windowDays: 7 },

myUpcoming: {
  total: s.upcoming_7d ?? 0,
  deltaPct: pctDelta(seriesUP.map((p) => p.v)),
  dueBuckets: { tomorrow: 0, twoToThree: 0, fourToSeven: 0, noDue: 0 },
  series: seriesUP,
  windowDays: 7,
},  };
}

/* ----------------------------------------------------------------------------
 * MAIN — Single-Project KPI Row (wired to your payload)
 * --------------------------------------------------------------------------*/
export default function ProjectTaskSummaryKpiRow({
  kpiData,
  loading,
}: {
  kpiData?: ApiKpi;
  loading?: boolean;
}) {
  
  // Build data from API; if absent, we still return a 7-day zero skeleton
  const data: SingleProjectKpiData = useMemo(() => adaptFromApi(kpiData), [kpiData]);  

  // (Optional) detect single contributor if later you add assignee splits
  const teamSizeWithAnyTasks = useMemo(() => {
    const set = new Set<string>();
    [data.overdue.byAssignee, data.dueToday.byAssignee, data.completed7d.byAssignee, data.comments72h.byAssignee, data.upcoming.byAssignee].forEach(
      (arr) => arr.forEach((x) => (x.count > 0 ? set.add(x.id) : null))
    );
    return Math.max(set.size, data.team.length);
  }, [data]);
  const isSingleContributor = teamSizeWithAnyTasks <= 1;

  /* ------------------------------ DONUT PARTS ------------------------------ */
  const openStatusParts = useMemo(() => {
    const p = data.open.statusSplit;    
    return [
      { name: "In Progress", count: p.inProgress, color: TOKENS.brand },
      ...(p.inReview ? [{ name: "In Review", count: p.inReview, color: mixWithWhite(TOKENS.brand, 0.35) }] : []),
      { name: "Not Started + Under Review", count: p.notStarted, color: mixWithWhite(TOKENS.brand, 0.65) },
    ];
  }, [data.open.statusSplit]);

  const ipDueParts = useMemo(() => {
    const p = data.inProgress.dueSplit;
    return [
      { name: "Due Today", count: p.dueToday, color: TOKENS.yellow },
      { name: "Overdue", count: p.overdue, color: TOKENS.red },
      { name: "Upcoming", count: p.upcoming, color: mixWithWhite(TOKENS.brand, 0.2) },
    ];
  }, [data.inProgress.dueSplit]);

  const myOpenStatusParts = useMemo(() => {
    const p = data.myOpen.statusSplit;
    return [
      { name: "In Progress", count: p.inProgress, color: TOKENS.teal },
      ...(p.inReview ? [{ name: "In Review", count: p.inReview, color: mixWithWhite(TOKENS.teal, 0.35) }] : []),
      { name: "Not Started + Under Review", count: p.notStarted, color: mixWithWhite(TOKENS.teal, 0.65) },
    ];
  }, [data.myOpen.statusSplit]);

  // Placeholder assignee splits (empty → placeholder ring shows)
  const overdueParts: { name: string; count: number; color: string }[] = [{ name: "Overdue", count: data.overdue.total, color: TOKENS.red }];
  const dueTodayParts: { name: string; count: number; color: string }[] = [{ name: "Due Today", count: data.dueToday.total, color: TOKENS.yellow }];
  const completedParts: { name: string; count: number; color: string }[] = [{ name: "Completed (7d)", count: data.completed7d.total, color: TOKENS.green }];
  const commentsParts: { name: string; count: number; color: string }[] = [{ name: "Comments (72h)", count: data.comments72h.total, color: TOKENS.neutral }];
  const upcomingParts: { name: string; count: number; color: string }[] = [{ name: "Upcoming (7d)", count: data.upcoming.total, color: TOKENS.brand }];
  const myUpcomingParts: { name: string; count: number; color: string }[] = [
    { name: "Tomorrow", count: data.myUpcoming.dueBuckets.tomorrow, color: mixWithWhite(TOKENS.brand, 0.2) },
    { name: "2–3 days", count: data.myUpcoming.dueBuckets.twoToThree, color: mixWithWhite(TOKENS.brand, 0.45) },
    { name: "4–7 days", count: data.myUpcoming.dueBuckets.fourToSeven, color: mixWithWhite(TOKENS.brand, 0.65) },
    ...(data.myUpcoming.dueBuckets.noDue !== undefined ? [{ name: "No Due Date", count: data.myUpcoming.dueBuckets.noDue, color: TOKENS.neutral }] : []),
  ];

  /* ------------------------------ EXPORT (unchanged) ------------------------------ */
  const [expOpen, setExpOpen] = useState(false);
  const doExport = (fmt: "PNG" | "CSV" | "PDF") => {
    setExpOpen(false);
    alert(`Export ${fmt}`);
  };

  if (loading && !kpiData) {
    return (
      <section className="w-full">
        <div className="mt-4 grid grid-cols-12 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
              <div className="h-[110px] w-full rounded-[16px] border bg-white shadow-sm animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
          Project Task Summary
        </h3>

        <div className="relative">
          <button
            onClick={() => setExpOpen((s) => !s)}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
            style={{ borderColor: TOKENS.border }}
          >
            Export
            <ChevronDown size={16} className="text-[#9CA3AF]" />
          </button>
          {expOpen && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-1 w-40 rounded-md border bg-white py-1 text-sm shadow"
              style={{ borderColor: TOKENS.border }}
              onMouseLeave={() => setExpOpen(false)}
            >
              <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => doExport("PNG")}>
                PNG
              </button>
              <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => doExport("CSV")}>
                CSV
              </button>
              <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={() => doExport("PDF")}>
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

      {/* GRID (keep the same order/layout) */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* Card 1 — Team Open Tasks (or My Open when single contributor) */}
        {!isSingleContributor ? (
          <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
            <CardShell title="Team Open Tasks" info="Not Started + In Progress (project scope).">
              <div className="flex items-center justify-between gap-3">
                <DonutSplit parts={openStatusParts} aria="Open tasks by status" tooltipTitle="Open by status" />
                <div className="min-w-[90px]">
                  <output className="block text-[20px] font-bold">{fmtInt(data.open.total)}</output>
                  <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.open.deltaPct) }}>
                    {caret(data.open.deltaPct)} {Math.abs(data.open.deltaPct).toFixed(1)}%
                  </div>
                </div>
                <SparkArea series={data.open.series} aria="Open trend" color={TOKENS.brand} />
              </div>
            </CardShell>
          </div>
        ) : (
          <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
            <CardShell title="My Open Tasks" info="Your open tasks split by status.">
              <div className="flex items-center justify-between gap-3">
                <DonutSplit parts={myOpenStatusParts} aria="My open by status" tooltipTitle="My open by status" />
                <div className="min-w-[90px]">
                  <output className="block text-[20px] font-bold">{fmtInt(data.myOpen.total)}</output>
                  <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.myOpen.deltaPct) }}>
                    {caret(data.myOpen.deltaPct)} {Math.abs(data.myOpen.deltaPct).toFixed(1)}%
                  </div>
                </div>
                <SparkArea series={data.myOpen.series} aria="My open trend" color={TOKENS.teal} />
              </div>
            </CardShell>
          </div>
        )}

        {/* Card 2 — Team In-Progress */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell title="Team In-Progress" info="In Progress grouped by Due Today / Overdue / Upcoming.">
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={ipDueParts} aria="In-progress by due state" tooltipTitle="In-progress by due state" />
              <div className="min-w-[90px]">
                <output className="block text-[20px] font-bold">{fmtInt(data.inProgress.total)}</output>
                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.inProgress.deltaPct) }}>
                  {caret(data.inProgress.deltaPct)} {Math.abs(data.inProgress.deltaPct).toFixed(1)}%
                </div>
              </div>
              <SparkBars series={data.inProgress.series} aria="In-progress trend" color={TOKENS.brand} />
            </div>
          </CardShell>
        </div>

        {/* Card 3 — Overdue */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell title="Overdue" info="Past due & not completed.">
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={overdueParts} aria="Overdue" tooltipTitle="Overdue" />
              <div className="min-w-[90px]">
                <output className="block text-[20px] font-bold">{fmtInt(data.overdue.total)}</output>
                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.overdue.deltaPct, true) }}>
                  {caret(data.overdue.deltaPct)} {Math.abs(data.overdue.deltaPct).toFixed(1)}%{" "}
                  <span className="font-normal" style={{ color: TOKENS.muted }}>
                    (lower is better)
                  </span>
                </div>
              </div>
              <SparkBars series={data.overdue.series} aria="Overdue trend" color={TOKENS.red} />
            </div>
          </CardShell>
        </div>

        {/* Card 4 — Due Today */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell title="Due Today" info="Due today & not completed.">
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={dueTodayParts} aria="Due today" tooltipTitle="Due today" />
              <div className="min-w-[90px]">
                <output className="block text-[20px] font-bold">{fmtInt(data.dueToday.total)}</output>
                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.dueToday.deltaPct) }}>
                  {caret(data.dueToday.deltaPct)} {Math.abs(data.dueToday.deltaPct).toFixed(1)}%
                </div>
              </div>
              <SparkArea series={data.dueToday.series} aria="Due today trend" color={TOKENS.yellow} />
            </div>
          </CardShell>
        </div>

        {/* Card 5 — Completed This Week */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell title="Completed This Week" info="Completed in the last 7 days.">
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={completedParts} aria="Completed (7d)" tooltipTitle="Completed (7d)" />
              <div className="min-w-[90px]">
                <output className="block text-[20px] font-bold">{fmtInt(data.completed7d.total)}</output>
                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.completed7d.deltaPct) }}>
                  {caret(data.completed7d.deltaPct)} {Math.abs(data.completed7d.deltaPct).toFixed(1)}%
                </div>
              </div>
              <SparkBars series={data.completed7d.series} aria="Completed trend" color={TOKENS.green} />
            </div>
          </CardShell>
        </div>

        {/* Card 6 — New Comments (72h) */}
        {/* <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell title="New Comments (72h)" info="Tasks with recent comments.">
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={commentsParts} aria="Comments (72h)" tooltipTitle="Comments (72h)" />
              <div className="min-w-[90px]">
                <output className="block text-[20px] font-bold">{fmtInt(data.comments72h.total)}</output>
                <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.comments72h.deltaPct) }}>
                  {caret(data.comments72h.deltaPct)} {Math.abs(data.comments72h.deltaPct).toFixed(1)}%
                </div>
              </div>
              <SparkArea series={data.comments72h.series} aria="Comments trend" color={TOKENS.neutral} />
            </div>
          </CardShell>
        </div> */}

        {/* Card 8 or 9 — Upcoming */}
        {!isSingleContributor ? (
          <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
            <CardShell title={`Upcoming (${data.upcoming.windowDays}d)`} info="Tasks due in next 7 days.">
              <div className="flex items-center justify-between gap-3">
                <DonutSplit parts={upcomingParts} aria="Upcoming (7d)" tooltipTitle="Upcoming (7d)" />
                <div className="min-w-[90px]">
                  <output className="block text-[20px] font-bold">{fmtInt(data.upcoming.total)}</output>
                  <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.upcoming.deltaPct) }}>
                    {caret(data.upcoming.deltaPct)} {Math.abs(data.upcoming.deltaPct).toFixed(1)}%
                  </div>
                </div>
                <SparkBars series={data.upcoming.series} aria="Upcoming trend" color={TOKENS.brand} />
              </div>
            </CardShell>
          </div>
        ) : (
          <div className="col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
            <CardShell title={`My Upcoming (${data.myUpcoming.windowDays}d)`} info="Your tasks due in next 7 days.">
              <div className="flex items-center justify-between gap-3">
                <DonutSplit parts={myUpcomingParts} aria="My upcoming (7d)" tooltipTitle="My upcoming (7d)" />
                <div className="min-w-[90px]">
                  <output className="block text-[20px] font-bold">{fmtInt(data.myUpcoming.total)}</output>
                  <div className="mt-1 text-xs font-semibold" style={{ color: deltaColor(data.myUpcoming.deltaPct) }}>
                    {caret(data.myUpcoming.deltaPct)} {Math.abs(data.myUpcoming.deltaPct).toFixed(1)}%
                  </div>
                </div>
                <SparkBars series={data.myUpcoming.series} aria="My upcoming trend" color={TOKENS.teal} />
              </div>
            </CardShell>
          </div>
        )}
      </div>
    </section>
  );
}
