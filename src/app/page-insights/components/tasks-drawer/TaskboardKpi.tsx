"use client";


/* =============================================================================
   Campaign Taskboard — Section 1: KPI Summary (Redesigned · Hover‑animated donuts)
   -----------------------------------------------------------------------------
   - Inter / Inter Fallback fonts; no emoji
   - Branded #008CCD icons for the section & card titles
   - KPI cards all follow the SAME pattern:
       • Stacked donut (snapshot) with smart popover
       • Stacked trend (area or bars) using the SAME breakdown
       • Donut popover highlights the hovered slice row with a colored dot
       • Donut slices have hover animation (scale + lift)
       • Info tooltip next to each card title
   - “Completed (7d)” → **Completed** with an inline toggle: 7 Day / All Time
   - Modern buttons/chips; pointer cursor on interactives
   - Export button in the section header (no 7d/14d toggle in header)
   - Drop‑in TSX; mock data included; Recharts only
   ============================================================================ */


import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Info as InfoIcon,
  ClipboardList,
  Timer,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  Download,
} from "lucide-react";


/* ----------------------------------------------------------------------------
 * TOKENS — latest (aligned with recent designs)
 * --------------------------------------------------------------------------*/
const TK = {
  brand: "#008CCD", // branded icons
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",


  surface: "#FFFFFF",
  text: "#111827",
  textStrong: "#0F172A",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  subtle: "#F5F7FA",


  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as any;


const cn = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const fmtInt = (n?: number) =>
  n === undefined || n === null || Number.isNaN(n) ? "—" : intFmt.format(n);
const toDateLabel = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "2-digit" });


/* ----------------------------------------------------------------------------
 * COLOR UTILS
 * --------------------------------------------------------------------------*/
function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  const v = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
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
function mixWithWhite(hex: string, w01: number) {
  const { r, g, b } = hexToRgb(hex);
  const W = 255;
  const w = Math.max(0, Math.min(1, w01));
  return rgbToHex(
    Math.round(r * (1 - w) + W * w),
    Math.round(g * (1 - w) + W * w),
    Math.round(b * (1 - w) + W * w)
  );
}


/* ----------------------------------------------------------------------------
 * RECHARTS — SMART POPOVERS (PORTALED)
 * --------------------------------------------------------------------------*/
function PortalShell({
  x,
  y,
  children,
  width = 280,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  width?: number;
}) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 2147483647,
        pointerEvents: "none",
      }}
    >
      <div
        className="rounded-md border bg-white p-2 text-xs shadow"
        style={{ borderColor: TK.border, color: TK.text, width }}
        role="tooltip"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}


/** Stacked trend tooltip (area/bars) */
function TrendPortal({
  active,
  label,
  payload,
  coordinate,
  containerRect,
}: any & { containerRect?: DOMRect | null }) {
  if (!active || !coordinate || !containerRect) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;


  const rows = (payload ?? []) as Array<{
    name: string;
    value: number;
    color: string;
  }>;
  return (
    <PortalShell x={x} y={y}>
      <div className="mb-1 font-medium" style={{ color: TK.textStrong }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center gap-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: p.color }}
              />
              <span style={{ color: TK.muted }}>{p.name}</span>
            </div>
            <div className="ml-auto font-semibold">{fmtInt(p.value)}</div>
          </div>
        ))}
      </div>
    </PortalShell>
  );
}


/** Donut tooltip — shows the full breakdown; highlights the hovered slice row */
function DonutPortal({
  active,
  payload,
  coordinate,
  containerRect,
  parts,
}: any & {
  containerRect?: DOMRect | null;
  parts: { name: string; count: number; color: string }[];
}) {
  if (!active || !coordinate || !containerRect) return null;
  const hoveredName: string | undefined = payload?.[0]?.name;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const total = Math.max(1, parts.reduce((s, p) => s + (p.count || 0), 0));


  return (
    <PortalShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const share = (p.count / total) * 100;
          const activeRow = p.name === hoveredName;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between gap-4 rounded px-1 py-0.5 whitespace-nowrap",
                activeRow && "bg-[rgba(0,0,0,0.03)]"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: p.color }}
                />
                <span
                  className={cn(activeRow && "font-semibold")}
                  style={{ color: TK.muted }}
                >
                  {p.name}
                </span>
              </div>
              <div className={cn("font-semibold", activeRow && "text-[#0077FF]")}>
                {fmtInt(p.count)}{" "}
                <span className="text-[11px]" style={{ color: TK.muted }}>
                  {share.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </PortalShell>
  );
}


/* ----------------------------------------------------------------------------
 * SHARED ATOMS — Title + Info + Segmented (for "Completed" only)
 * --------------------------------------------------------------------------*/
function TitleWithInfo({
  title,
  info,
  glyph,
}: {
  title: string;
  info?: string;
  glyph: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative flex min-w-0 items-center gap-2">
      <span className="shrink-0" aria-hidden>
        {glyph}
      </span>
      <div
        className="truncate text-[13px] font-semibold"
        style={{ color: TK.textStrong }}
      >
        {title}
      </div>
      {info ? (
        <button
          type="button"
          aria-label="More info"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="grid h-5 w-5 place-items-center rounded hover:bg-gray-50"
          style={{ cursor: "pointer" }}
        >
          <InfoIcon size={14} className="text-[#9CA3AF]" />
        </button>
      ) : null}
      {open && info ? (
        <div
          role="tooltip"
          className="absolute left-0 top-6 z-50 w-[260px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TK.border, color: TK.text }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}


function Segmented({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: string;
  items: { label: string; value: string }[];
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: "pointer" }}
      role="tablist"
      aria-label={ariaLabel || "Segmented control"}
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "h-7 px-3 text-xs rounded-full transition",
            value === it.value ? "bg-[#D9EEF8] font-medium" : "hover:bg-gray-100"
          )}
          style={{ cursor: "pointer" }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}


/* ----------------------------------------------------------------------------
 * CHARTS — Stacked Donut + Stacked Trend
 * --------------------------------------------------------------------------*/
type Row = { t: string } & Record<string, any>;


/** Hover‑animated stacked donut (slice lifts + scales slightly) */
function StackedDonut({
  parts,
  aria,
  size = 56,
}: {
  parts: { name: string; count: number; color: string }[];
  aria: string;
  size?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const total = parts.reduce((s, p) => s + (p.count || 0), 0) || 1;
  const data = parts.map((p) => ({ ...p, v: p.count / total }));


  // Track hovered slice for active animation
  const [active, setActive] = React.useState<number | undefined>(undefined);


  return (
    <div
      ref={ref}
      className="h-[56px] w-[56px] shrink-0"
      role="img"
      aria-label={aria}
    >
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            content={(tp: any) => (
              <DonutPortal
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                parts={parts}
              />
            )}
          />
          <Pie
            data={data}
            dataKey="v"
            nameKey="name"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            paddingAngle={1}
            isAnimationActive
            activeIndex={active}
            activeShape={(props: any) => {
              const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
              // Scale + subtle lift without bleeding outside the card
              return (
                <g
                  style={{
                    transform: `translate(${cx}px,${cy}px) scale(1.06) translate(${-cx}px,${-cy}px)`,
                    transition: "transform 160ms ease",
                    filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))",
                  }}
                >
                  <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 2}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                </g>
              );
            }}
            onMouseEnter={(_d, idx) => setActive(idx)}
            onMouseLeave={() => setActive(undefined)}
            style={{ cursor: "pointer" }}
          >
            {data.map((p, i) => (
              <Cell key={i} fill={p.color} stroke="#fff" strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


function TrendStack({
  rows,
  keys,
  colors,
  mode,
  aria,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  mode: "area" | "bars";
  aria: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  return (
    <div className="h-16 w-[180px]" role="img" aria-label={aria} ref={ref}>
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide />
            <RTooltip
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              content={(tp: any) => (
                <TrendPortal
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                />
              )}
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stackId="a"
                stroke={colors[k]}
                fill={colors[k]}
                fillOpacity={0.25}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide />
            <RTooltip
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              content={(tp: any) => (
                <TrendPortal
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                />
              )}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="a"
                fill={colors[k]}
                radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}


/* ----------------------------------------------------------------------------
 * CARD SHELL
 * --------------------------------------------------------------------------*/
function Card({
  title,
  info,
  glyph,
  donut,
  value,
  trend,
  trailingControl, // optional segmented in-title (e.g., Completed 7d/All)
  onClick,
}: {
  title: string;
  info?: string;
  glyph: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  trend: React.ReactNode;
  trailingControl?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left rounded-[12px] border p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40"
      style={{
        background: TK.surface,
        borderColor: TK.border,
        cursor: "pointer",
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label={`${title}, click to filter`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <TitleWithInfo title={title} info={info} glyph={glyph} />
        {trailingControl}
      </div>
      <div className="flex items-center justify-between gap-3">
        {donut}
        <div className="min-w-[120px]">
          <output
            className="block text-[20px] font-bold"
            style={{ color: TK.valueBlue }}
          >
            {fmtInt(value)}
          </output>
        </div>
        {trend}
      </div>
    </button>
  );
}


/* ----------------------------------------------------------------------------
 * MOCK DATA + BUILDERS
 * --------------------------------------------------------------------------*/
type SeriesPoint = { t: string; v: number };
type CountByAssignee = { id: string; name: string; count: number };


function lastNDates(n = 14) {
  const arr: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}


function makeSeries(days = 14, base = 100, noise = 0.15): SeriesPoint[] {
  const dates = lastNDates(days);
  let v = base;
  return dates.map((t, i) => {
    v = Math.max(
      0,
      Math.round(v + (Math.random() - 0.5) * base * noise + Math.sin(i / 3) * base * 0.05)
    );
    return { t, v };
  });
}


// Split a total series into stack rows based on fixed shares vector
function splitByShares(total: SeriesPoint[], entries: { key: string; share: number }[]) {
  const norm = (() => {
    const s = entries.reduce((a, b) => a + b.share, 0) || 1;
    return entries.map((e) => ({ key: e.key, w: e.share / s }));
  })();
  return total.map((p, i) => {
    // small wave on shares for visual dynamism
    const wobble = norm.map((e, j) => {
      const w = e.w * (1 + Math.sin((i + 1) * (j + 2) * 0.17) * 0.06);
      return { key: e.key, w };
    });
    const sw = wobble.reduce((a, b) => a + b.w, 0) || 1;
    const row: Row = { t: p.t };
    wobble.forEach((e, idx) => (row[e.key] = Math.round((e.w / sw) * p.v)));
    return row;
  });
}


// Build assignee stack: choose top N + "Others", stable tints, spread rows by those shares
function buildAssigneeStack(
  byAssignee: CountByAssignee[],
  totalSeries: SeriesPoint[],
  baseColor = TK.brand,
  maxSlices = 6
) {
  const sorted = [...byAssignee].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, maxSlices - 1);
  const tail = sorted.slice(maxSlices - 1);
  const others = tail.reduce((s, x) => s + x.count, 0);
  const partsRaw = others > 0 ? [...head, { id: "_others", name: "Others", count: others }] : head;


  // colors
  const colors: Record<string, string> = {};
  partsRaw.forEach((p, i) => {
    colors[p.name] =
      p.id === "_others"
        ? mixWithWhite(baseColor, 0.85)
        : mixWithWhite(baseColor, Math.min(0.75, 0.15 + i * 0.12));
  });


  const shares = partsRaw.map((p) => ({
    key: p.name,
    share: Math.max(0.001, p.count),
  }));


  const rows = splitByShares(totalSeries, shares);
  const parts = partsRaw.map((p) => ({
    name: p.name,
    count: p.count,
    color: colors[p.name],
  }));
  const keys = parts.map((p) => p.name);
  return { rows, parts, keys, colors };
}


/* ----------------------------------------------------------------------------
 * MAIN SECTION — KPI Summary
 * --------------------------------------------------------------------------*/
export default function TaskboardKpiSummary() {
  // Fixed display window (no 7d/14d toggle in header)
  const DAYS = 14 as const;
  const RANGE_LABEL = "14d";


  // COMPLETED CARD: local toggle 7d vs all
  const [completedMode, setCompletedMode] = React.useState<"7d" | "all">("7d");


  // TEAM (mock)
  const team = React.useMemo(
    () => [
      { id: "u1", name: "Ava Patel" },
      { id: "u2", name: "Ben Carter" },
      { id: "u3", name: "Chloe Nguyen" },
      { id: "u4", name: "Diego Rossi" },
      { id: "u5", name: "Elena García" },
      { id: "u6", name: "Farid Khan" },
      { id: "u7", name: "Grace Lee" },
      { id: "u8", name: "Hugo Silva" },
    ],
    []
  );


  // Simple deterministic distribution per teammate
  function spread(base: number, span: number, i: number, seed: number) {
    return base + Math.round(((Math.sin((i + 1) * (seed + 1)) + 1) / 2) * span);
  }
  function countsForTeam(base: number, span: number, seed: number): CountByAssignee[] {
    return team.map((m, i) => ({ id: m.id, name: m.name, count: spread(base, span, i, seed) }));
  }


  // SERIES (total per day)
  const openTotal = React.useMemo(() => makeSeries(DAYS, 180, 0.12), [DAYS]);
  const inProgTotal = React.useMemo(() => makeSeries(DAYS, 120, 0.1), [DAYS]);
  const overdueTotal = React.useMemo(() => makeSeries(DAYS, 18, 0.25), [DAYS]);
  const dueTodayTotal = React.useMemo(() => makeSeries(DAYS, 12, 0.22), [DAYS]);
  const completed7dTotal = React.useMemo(() => makeSeries(7, 22, 0.3), []);
  const completedAllTotal = React.useMemo(() => makeSeries(30, 20, 0.25), []);
  const commentsTotal = React.useMemo(() => makeSeries(DAYS, 20, 0.2), [DAYS]);


  // CARD 1 — Open (status breakdown)
  const OPEN_KEYS = ["In Progress", "In Review", "Not Started"];
  const OPEN_COLORS: Record<string, string> = {
    "In Progress": TK.brand,
    "In Review": mixWithWhite(TK.brand, 0.35),
    "Not Started": mixWithWhite(TK.brand, 0.65),
  };
  const openRows: Row[] = React.useMemo(
    () =>
      splitByShares(openTotal, [
        { key: "In Progress", share: 0.52 },
        { key: "In Review", share: 0.1 },
        { key: "Not Started", share: 0.38 },
      ]),
    [openTotal]
  );
  const openParts = React.useMemo(() => {
    const last = openRows[openRows.length - 1] || {};
    return OPEN_KEYS.map((k) => ({
      name: k,
      count: Number((last as any)[k] || 0),
      color: OPEN_COLORS[k],
    }));
  }, [openRows]);


  // CARD 2 — In‑Progress (due buckets)
  const IP_KEYS = ["Due Today", "Overdue", "Upcoming"];
  const IP_COLORS: Record<string, string> = {
    "Due Today": TK.warn,
    Overdue: TK.danger,
    Upcoming: mixWithWhite(TK.brand, 0.25),
  };
  const ipRows: Row[] = React.useMemo(
    () =>
      splitByShares(inProgTotal, [
        { key: "Due Today", share: 0.12 },
        { key: "Overdue", share: 0.1 },
        { key: "Upcoming", share: 0.78 },
      ]),
    [inProgTotal]
  );
  const ipParts = React.useMemo(() => {
    const last = ipRows[ipRows.length - 1] || {};
    return IP_KEYS.map((k) => ({
      name: k,
      count: Number((last as any)[k] || 0),
      color: IP_COLORS[k],
    }));
  }, [ipRows]);


  // CARD 3 — Overdue (assignee split)
  const overdueAssignees = React.useMemo(() => countsForTeam(2, 6, 3), [team]);
  const overdueStack = React.useMemo(
    () => buildAssigneeStack(overdueAssignees, overdueTotal, TK.danger),
    [overdueAssignees, overdueTotal]
  );


  // CARD 4 — Due Today (assignee split)
  const dueAssignees = React.useMemo(() => countsForTeam(2, 6, 4), [team]);
  const dueStack = React.useMemo(
    () => buildAssigneeStack(dueAssignees, dueTodayTotal, TK.warn),
    [dueAssignees, dueTodayTotal]
  );


  // CARD 5 — Completed (toggle 7d / all time) (assignee split)
  const completedAssignees7 = React.useMemo(() => countsForTeam(4, 8, 5), [team]);
  const completedAssigneesAll = React.useMemo(() => countsForTeam(35, 45, 6), [team]);
  const completedStack7 = React.useMemo(
    () => buildAssigneeStack(completedAssignees7, completed7dTotal, TK.success),
    [completedAssignees7, completed7dTotal]
  );
  const completedStackAll = React.useMemo(
    () => buildAssigneeStack(completedAssigneesAll, completedAllTotal, TK.success),
    [completedAssigneesAll, completedAllTotal]
  );
  const completedStack = completedMode === "7d" ? completedStack7 : completedStackAll;


  // CARD 6 — Comments (assignee split)
  const commentsAssignees = React.useMemo(() => countsForTeam(3, 7, 7), [team]);
  const commentsStack = React.useMemo(
    () => buildAssigneeStack(commentsAssignees, commentsTotal, TK.gray),
    [commentsAssignees, commentsTotal]
  );


  // Values (latest)
  const valOpen =
    OPEN_KEYS.reduce((s, k) => s + Number((openRows.at(-1) as any)?.[k] || 0), 0) || 0;
  const valInProg =
    IP_KEYS.reduce((s, k) => s + Number((ipRows.at(-1) as any)?.[k] || 0), 0) || 0;
  const valOverdue = Object.values(overdueStack.rows.at(-1) || {})
    .filter((_, i) => i > 0)
    .reduce((s: number, v: any) => s + Number(v || 0), 0);
  const valDueToday = Object.values(dueStack.rows.at(-1) || {})
    .filter((_, i) => i > 0)
    .reduce((s: number, v: any) => s + Number(v || 0), 0);
  const valCompleted = Object.values(completedStack.rows.at(-1) || {})
    .filter((_, i) => i > 0)
    .reduce((s: number, v: any) => s + Number(v || 0), 0);
  const valComments = Object.values(commentsStack.rows.at(-1) || {})
    .filter((_, i) => i > 0)
    .reduce((s: number, v: any) => s + Number(v || 0), 0);


  // EXPORT CSV (simple)
  const onExport = () => {
    const pack = (rows: Row[], keys: string[]) =>
      rows
        .map((r) => [r.t, ...keys.map((k) => (r[k] ?? 0))].join(","))
        .join("\n");
    const parts = [
      "Open",
      ["date", ...OPEN_KEYS].join(","),
      pack(openRows, OPEN_KEYS),
      "",
      "InProgress",
      ["date", ...IP_KEYS].join(","),
      pack(ipRows, IP_KEYS),
      "",
      "Overdue",
      ["date", ...overdueStack.keys].join(","),
      pack(overdueStack.rows, overdueStack.keys),
      "",
      "DueToday",
      ["date", ...dueStack.keys].join(","),
      pack(dueStack.rows, dueStack.keys),
      "",
      `Completed(${completedMode})`,
      ["date", ...completedStack.keys].join(","),
      pack(completedStack.rows, completedStack.keys),
      "",
      "Comments",
      ["date", ...commentsStack.keys].join(","),
      pack(commentsStack.rows, commentsStack.keys),
    ].join("\n");
    const blob = new Blob([parts], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kpi_summary_${RANGE_LABEL}_${completedMode}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };


  return (
    <section
      className="rounded-md border bg-white p-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header
        className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2"
        style={{ borderColor: TK.border }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            KPI Summary
          </h2>
          <span className="text-xs text-gray-500">
            Snapshot donuts + stacked trends (same breakdown)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.valueBlue, cursor: "pointer" }}
            aria-label="Export KPI Summary"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>


      {/* Grid */}
      <div className="grid grid-cols-12 gap-3">
        {/* Open */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card
            title="Open"
            info="Open tasks by status; trend shows the same status mix over time."
            glyph={<ClipboardList size={16} color={TK.brand} />}
            donut={<StackedDonut parts={openParts} aria="Open by status" />}
            value={valOpen}
            trend={
              <TrendStack
                rows={openRows}
                keys={OPEN_KEYS}
                colors={OPEN_COLORS}
                mode="area"
                aria="Open status trend"
              />
            }
            onClick={() => console.log("filter: open")}
          />
        </div>


        {/* In‑Progress */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card
            title="In‑Progress"
            info="Due‑state split for in‑progress tasks; trend uses the same due buckets."
            glyph={<Timer size={16} color={TK.brand} />}
            donut={<StackedDonut parts={ipParts} aria="In-Progress by due state" />}
            value={valInProg}
            trend={
              <TrendStack
                rows={ipRows}
                keys={IP_KEYS}
                colors={IP_COLORS}
                mode="bars"
                aria="In-Progress due-state trend"
              />
            }
            onClick={() => console.log("filter: in-progress")}
          />
        </div>


        {/* Overdue */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card
            title="Overdue"
            info="Overdue tasks by assignee; trend stacks by the same assignees."
            glyph={<AlertTriangle size={16} color={TK.brand} />}
            donut={<StackedDonut parts={overdueStack.parts} aria="Overdue by assignee" />}
            value={valOverdue}
            trend={
              <TrendStack
                rows={overdueStack.rows}
                keys={overdueStack.keys}
                colors={overdueStack.colors}
                mode="bars"
                aria="Overdue trend by assignee"
              />
            }
            onClick={() => console.log("filter: overdue")}
          />
        </div>


        {/* Due Today */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card
            title="Due Today"
            info="Due today by assignee; trend shows the same assignee mix."
            glyph={<CalendarClock size={16} color={TK.brand} />}
            donut={<StackedDonut parts={dueStack.parts} aria="Due today by assignee" />}
            value={valDueToday}
            trend={
              <TrendStack
                rows={dueStack.rows}
                keys={dueStack.keys}
                colors={dueStack.colors}
                mode="area"
                aria="Due today trend by assignee"
              />
            }
            onClick={() => console.log("filter: due_today")}
          />
        </div>


        {/* Completed — with 7d / All toggle */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card
            title="Completed"
            info="Completed tasks (toggle: 7 Day / All Time). Donut & trend share the same assignee breakdown."
            glyph={<CheckCircle2 size={16} color={TK.brand} />}
            trailingControl={
              <Segmented
                value={completedMode}
                onChange={(v) => setCompletedMode(v as "7d" | "all")}
                items={[
                  { label: "7 Day", value: "7d" },
                  { label: "All Time", value: "all" },
                ]}
                ariaLabel="Completed range"
              />
            }
            donut={
              <StackedDonut
                parts={completedStack.parts}
                aria={`Completed by assignee (${completedMode})`}
              />
            }
            value={valCompleted}
            trend={
              <TrendStack
                rows={completedStack.rows}
                keys={completedStack.keys}
                colors={completedStack.colors}
                mode="bars"
                aria={`Completed trend by assignee (${completedMode})`}
              />
            }
            onClick={() => console.log("filter: completed")}
          />
        </div>


        {/* Comments (72h) */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card
            title="New Comments (72h)"
            info="Tasks with recent comments by assignee; stacked trend uses same breakdown."
            glyph={<MessageSquare size={16} color={TK.brand} />}
            donut={<StackedDonut parts={commentsStack.parts} aria="Comments by assignee" />}
            value={valComments}
            trend={
              <TrendStack
                rows={commentsStack.rows}
                keys={commentsStack.keys}
                colors={commentsStack.colors}
                mode="area"
                aria="Comments trend by assignee"
              />
            }
            onClick={() => console.log("filter: comments")}
          />
        </div>
      </div>
    </section>
  );
}
