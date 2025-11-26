/* Section 3 — User Activity Trends
   Drop‑in React + Tailwind TSX (no emojis)

   What’s updated to match your latest system patterns:
   • Latest design tokens (same as recent table & chart sections)
   • Inter font stack everywhere (including SVG axis/tooltip text)
   • Modular Filter Chips like recent tables
   • Branded segmented toggle with icons (Users / Roles)
   • Legend placed just below the Filters bar, inside the chart area (top‑left)
   • Charts and smart popover logic kept the same; only font updated
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart as LineChartIcon,
  Download,
  FileSpreadsheet,
  SlidersHorizontal,
  Users,
  BadgeCheck,
  Layers3,
  ArrowLeftRight,
} from "lucide-react";

/* ───────────────────────────────── Tokens (latest) ───────────────────────────────── */
const TK = {
  brand: "#1090D0",
  blue: "#0077ff",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderSubtle: "#EFF0F6",
  subtle: "#F5F7FA",
  card: "#FFFFFF",
};
const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif";

/* ───────────────────────────────── Types ───────────────────────────────── */
type GroupBy = "users" | "roles";
type MetricKey =
  | "logins"
  | "sessions"
  | "tasks_created"
  | "task_updates"
  | "comments"
  | "content_edits";

type Point = { t: string; v: number }; // ISO day + value
type Series = { key: string; label: string; points: Point[]; total: number };
type TrendsResponse = {
  bucket: "day" | "week";
  series: Series[];
  prev_period?: { series: Series[] };
  summary?: {
    most_active_day?: { t: string; v: number };
    least_active_day?: { t: string; v: number };
    top?: { key: string; label: string; v: number };
  };
};

/* ───────────────────────────────── Labels & Colors ───────────────────────────────── */
const METRIC_LABEL: Record<MetricKey, string> = {
  logins: "Total Logins",
  sessions: "Sessions",
  tasks_created: "Tasks Created",
  task_updates: "Task Updates",
  comments: "Comments Added",
  content_edits: "Content Edits",
};

/** Consistent, color‑blind‑aware categorical palette */
const PALETTE = [
  "#1F77B4",
  "#FF7F0E",
  "#2CA02C",
  "#D62728",
  "#9467BD",
  "#8C564B",
  "#E377C2",
  "#7F7F7F",
  "#BCBD22",
  "#17BECF",
];
const dotted = "4 4";

/* ───────────────────────────────── Helpers ───────────────────────────────── */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtNumber = (n: number) => new Intl.NumberFormat().format(n);

function daysBack(count = 30) {
  const out: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    out.push(d.toISOString());
  }
  return out;
}
function seededRand(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function makeSeries(
  key: string,
  label: string,
  dates: string[],
  base: number,
  volatility: number,
  noiseSeed: number
): Series {
  let total = 0;
  const points: Point[] = dates.map((t, idx) => {
    const r =
      base +
      Math.round(volatility * (seededRand(noiseSeed + idx * 13) - 0.5) * 2) +
      (idx % 7 === 0 ? -1 : 0) +
      (idx % 13 === 0 ? 2 : 0);
    const v = Math.max(0, r);
    total += v;
    return { t, v };
  });
  return { key, label, points, total };
}

/* ───────────────────────────────── Demo data (mock API) ───────────────────────────────── */
const USERS = [
  { id: "u1", name: "Sara Mehta" },
  { id: "u2", name: "John Patel" },
  { id: "u3", name: "Vikash Bharia" },
  { id: "u4", name: "Ana Singh" },
  { id: "u5", name: "Michael Romero" },
  { id: "u6", name: "Alice Verma" },
  { id: "u7", name: "Lauren Chen" },
  { id: "u8", name: "Karan Shah" },
];
const ROLES: { key: string; label: string }[] = [
  { key: "owner", label: "Owner" },
  { key: "admin", label: "Admin" },
  { key: "editor", label: "Editor" },
  { key: "viewer", label: "Viewer" },
];

async function mockFetchTrends(
  metric: MetricKey,
  group_by: GroupBy,
  top: 5 | 10 | "all"
): Promise<TrendsResponse> {
  const dates = daysBack(30);
  const sets =
    group_by === "users"
      ? USERS.map((u, i) => {
          const base =
            metric === "logins"
              ? 1 + (i % 3)
              : metric === "sessions"
              ? 3 + (i % 5)
              : metric === "tasks_created"
              ? 2 + (i % 4)
              : metric === "task_updates"
              ? 3 + (i % 6)
              : metric === "comments"
              ? 1 + (i % 4)
              : 2 + (i % 5);
          const vol = metric === "sessions" ? 3 : 2;
          return makeSeries(`user:${u.id}`, u.name, dates, base, vol, i + 7);
        })
      : ROLES.map((r, i) => {
          const base = r.key === "owner" ? 1 : r.key === "admin" ? 3 : r.key === "editor" ? 2 : 1;
          const mul = metric === "sessions" || metric === "tasks_created" ? 2 : 1;
          return makeSeries(`role:${r.key}`, r.label, dates, base * mul, 3, i + 23);
        });

  const sorted = sets.sort((a, b) => b.total - a.total);
  const limited = group_by === "roles" ? sorted : top === "all" ? sorted : sorted.slice(0, top);

  const prev_series = limited.map((s, i) => {
    const factor = 0.85 + seededRand(i + 123) * 0.2;
    const points = s.points.map((p) => ({ t: p.t, v: Math.max(0, Math.round(p.v * factor)) }));
    return { key: s.key, label: s.label, points, total: Math.round(s.total * factor) };
  });

  await new Promise((r) => setTimeout(r, 300));
  return {
    bucket: "day",
    series: limited,
    prev_period: { series: prev_series },
    summary: {
      most_active_day: { t: dates[dates.length - 5], v: 72 },
      least_active_day: { t: dates[2], v: 5 },
      top: { key: limited[0]?.key ?? "", label: limited[0]?.label ?? "", v: limited[0]?.total ?? 0 },
    },
  };
}

/* ───────────────────────────────── UI: Chip dropdown (modular) ───────────────────────────────── */
function ChipDropdown({
  label,
  children,
  active,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        className={`inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC] ${
          active ? "font-semibold" : ""
        }`}
        style={{ borderColor: TK.borderSubtle }}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <SlidersHorizontal className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 w-[280px] rounded-md border bg-white p-3 text-sm shadow-lg"
          style={{ borderColor: TK.borderSubtle }}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────── UI: Segmented toggle (branded) ───────────────────────────────── */
function SegToggle<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; Icon: React.ComponentType<any> }[];
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-md border"
      style={{ borderColor: TK.border }}
      role="tablist"
      aria-label="View by"
    >
      {items.map((it) => {
        const on = it.value === value;
        const Cmp = it.Icon;
        return (
          <button
            key={String(it.value)}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.value)}
            className={`inline-flex h-8 items-center gap-1.5 px-3 text-sm ${
              on ? "text-white" : "text-gray-800"
            }`}
            style={{ background: on ? TK.brand : "#fff" }}
          >
            <Cmp className="h-4 w-4" />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────────── Component ───────────────────────────────── */
export function TeamActivityTrends({
  onOpenUserSummary,
  onOpenRoleTable,
}: {
  onOpenUserSummary?: (userId: string, whenISO: string, metric: MetricKey) => void;
  onOpenRoleTable?: (roleKey: string, whenISO: string, metric: MetricKey) => void;
}) {
  /* Controls */
  const [metric, setMetric] = useState<MetricKey>("logins");
  const [groupBy, setGroupBy] = useState<GroupBy>("users");
  const [topN, setTopN] = useState<5 | 10 | "all">(5);
  const [comparePrev, setComparePrev] = useState<boolean>(false);
  const [legendOpen, setLegendOpen] = useState<boolean>(true);

  /* Data */
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<TrendsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Legend state */
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  /* Hover / focus */
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);
    mockFetchTrends(metric, groupBy, topN)
      .then((r) => {
        if (!canceled) {
          setResp(r);
          setLoading(false);
          setHidden(new Set());
          setHoverIdx(null);
          setActiveKey(null);
        }
      })
      .catch(() => {
        if (!canceled) {
          setError("We couldn’t load analytics. Retry.");
          setLoading(false);
        }
      });
    return () => {
      canceled = true;
    };
  }, [metric, groupBy, topN]);

  const series = resp?.series ?? [];
  const prevMap: Record<string, Series> = useMemo(() => {
    const m: Record<string, Series> = {};
    resp?.prev_period?.series.forEach((s) => (m[s.key] = s));
    return m;
  }, [resp]);

  /* Chart geometry */
  const chartRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(860);
  const height = 380;
  const margins = { top: 40, right: 24, bottom: 42, left: 52 };

  useEffect(() => {
    if (!chartRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setWidth(Math.max(500, Math.floor(e.contentRect.width)));
      }
    });
    ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, []);

  const dates = series[0]?.points?.map((p) => p.t) ?? daysBack(30);
  const xCount = dates.length;
  const innerW = width - margins.left - margins.right;
  const innerH = height - margins.top - margins.bottom;
  const xTo = (i: number) => margins.left + (innerW * i) / Math.max(1, xCount - 1);
  const yMax = useMemo(() => {
    let m = 0;
    for (const s of series) {
      if (hidden.has(s.key)) continue;
      for (const p of s.points) m = Math.max(m, p.v);
      if (comparePrev && prevMap[s.key]) for (const p of prevMap[s.key].points) m = Math.max(m, p.v);
    }
    if (m <= 5) return 5;
    if (m <= 10) return 10;
    return Math.ceil(m / 5) * 5;
  }, [series, hidden, prevMap, comparePrev]);
  const yTo = (v: number) => margins.top + innerH - (innerH * v) / Math.max(1, yMax);
  const ticks = useMemo(() => {
    const out: number[] = [];
    const step = yMax <= 10 ? 2 : 5;
    for (let y = 0; y <= yMax; y += step) out.push(y);
    return out;
  }, [yMax]);

  /* Tooltip */
  const [tool, setTool] = useState<{
    x: number;
    y: number;
    date: string;
    lines: { key: string; label: string; value: number; color: string; prev?: number }[];
  } | null>(null);
  const colorFor = (key: string, idx: number) => PALETTE[idx % PALETTE.length];

  function nearestIndex(clientX: number) {
    const rect = (chartRef.current?.querySelector("svg") as SVGSVGElement)?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left - margins.left;
    const idx = Math.round((x / innerW) * (xCount - 1));
    return Math.min(Math.max(0, idx), xCount - 1);
  }
  function onMouseMove(ev: React.MouseEvent) {
    if (!series.length) return;
    const idx = nearestIndex(ev.clientX);
    if (idx == null) return;
    setHoverIdx(idx);

    const lines: { key: string; label: string; value: number; color: string; prev?: number }[] = [];
    series.forEach((s, i) => {
      if (hidden.has(s.key)) return;
      const value = s.points[idx]?.v ?? 0;
      const color = colorFor(s.key, i);
      const prev = comparePrev ? prevMap[s.key]?.points[idx]?.v : undefined;
      lines.push({ key: s.key, label: s.label, value, color, prev });
    });
    let active = activeKey;
    if (lines.length > 0) {
      let best: { key: string; dist: number } | null = null;
      lines.forEach((l) => {
        const dist = Math.abs(yTo(l.value) - (ev.nativeEvent as any).offsetY);
        if (!best || dist < best.dist) best = { key: l.key, dist };
      });
      active = best?? null;
      setActiveKey(active);
    }
    const x = xTo(idx);
    setTool({ x, y: margins.top + 8, date: dates[idx], lines: lines.sort((a, b) => b.value - a.value) });
  }
  function onMouseLeave() {
    setHoverIdx(null);
    setTool(null);
  }

  function onPointClick() {
    if (hoverIdx == null) return;
    const dt = dates[hoverIdx];
    const key = activeKey ?? series[0]?.key;
    if (!key) return;
    if (key.startsWith("user:")) onOpenUserSummary?.(key.replace("user:", ""), dt, metric);
    else onOpenRoleTable?.(key.replace("role:", ""), dt, metric);
  }

  /* Legend interactions */
  function toggleLegend(k: string, isolate: boolean) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (isolate) {
        const all = new Set(series.map((s) => s.key));
        const visCount = series.filter((s) => !prev.has(s.key)).length;
        if (visCount === 1 && !prev.has(k)) return new Set(); // already isolated; show all
        all.forEach((kk) => kk !== k && next.add(kk));
        next.delete(k);
      } else {
        if (next.has(k)) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  function exportCSV(fmt: "csv" | "xlsx") {
    if (!resp) return;
    const rows: string[] = [];
    rows.push(`#Access & Engagement Analytics — Trends (${METRIC_LABEL[metric]})`);
    rows.push(`# Group By: ${groupBy.toUpperCase()}, Top: ${groupBy === "users" ? topN : "N/A"}, Compare: ${
      comparePrev ? "yes" : "no"
    }`);
    rows.push(`# Range: ${fmtDate(dates[0])} — ${fmtDate(dates[dates.length - 1])}`);
    rows.push("");
    const header = ["date", ...series.map((s) => s.label)];
    rows.push(header.join(","));
    for (let i = 0; i < dates.length; i++) {
      const row = [dates[i], ...series.map((s) => s.points[i]?.v ?? 0)];
      rows.push(row.join(","));
    }
    const blob = new Blob([rows.join("\n")], {
      type: fmt === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ta_trends_${metric}_${groupBy}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onKeyDown(ev: React.KeyboardEvent) {
    if (!series.length) return;
    if (hoverIdx == null) setHoverIdx(dates.length - 1);
    if (ev.key === "ArrowLeft") setHoverIdx((i) => Math.max(0, (i ?? 0) - 1));
    else if (ev.key === "ArrowRight") setHoverIdx((i) => Math.min(dates.length - 1, (i ?? 0) + 1));
    else if (ev.key === "Enter") onPointClick();
  }

  /* ───────────────────────────────── Render ───────────────────────────────── */
  return (
    <section
      className="font-sans rounded-md border bg-white p-4"
      style={{ borderColor: TK.border, fontFamily: FONT }}
      aria-labelledby="ta-trends-title"
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5" style={{ color: TK.brand }} />
          <h3 id="ta-trends-title" className="m-0 text-[16px] font-semibold text-gray-900">
            User Activity Trends
          </h3>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.borderSubtle }}
            onClick={() => exportCSV("csv")}
            aria-label="Export CSV"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.borderSubtle }}
            onClick={() => exportCSV("xlsx")}
            aria-label="Export Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Filter Chips bar */}
      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-md border p-2"
        style={{ borderColor: TK.border, background: TK.subtle }}
        aria-label="Trends controls"
      >
        {/* Metric chip */}
        <ChipDropdown label={<span>Metric</span>} active>
          <div className="mb-2 text-sm font-medium">Select metric</div>
          {(Object.keys(METRIC_LABEL) as MetricKey[]).map((m) => (
            <label key={m} className="flex items-center gap-2 py-1 text-sm">
              <input type="radio" checked={metric === m} onChange={() => setMetric(m)} />
              <span>{METRIC_LABEL[m]}</span>
            </label>
          ))}
        </ChipDropdown>

        {/* View by segmented toggle */}
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-gray-500">View by</span>
          <SegToggle<GroupBy>
            value={groupBy}
            onChange={(v) => {
              setGroupBy(v);
              if (v === "roles") setTopN(5);
            }}
            items={[
              { value: "users", label: "Users", Icon: Users },
              { value: "roles", label: "Roles", Icon: BadgeCheck },
            ]}
          />
        </div>

        {/* Top chip (users only) */}
        <ChipDropdown label={<span className={groupBy === "users" ? "" : "opacity-60"}>Top</span>} active={groupBy === "users"}>
          <div className="mb-2 text-sm font-medium">Limit series</div>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="radio"
              checked={topN === 5}
              onChange={() => setTopN(5)}
              disabled={groupBy === "roles"}
            />
            <span>Top 5</span>
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="radio"
              checked={topN === 10}
              onChange={() => setTopN(10)}
              disabled={groupBy === "roles"}
            />
            <span>Top 10</span>
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="radio"
              checked={topN === "all"}
              onChange={() => setTopN("all")}
              disabled={groupBy === "roles"}
            />
            <span>All</span>
          </label>
        </ChipDropdown>

        {/* Compare toggle (branded pill) */}
        <button
          className={`inline-flex h-8 items-center gap-2 rounded border px-3 text-sm ${
            comparePrev ? "font-semibold" : ""
          } hover:bg-[#F7FAFC]`}
          style={{
            borderColor: TK.borderSubtle,
            background: comparePrev ? "#D2EFFF" : "#fff",
            color: comparePrev ? "#0B4C6C" : TK.text,
          }}
          onClick={() => setComparePrev((v) => !v)}
          aria-pressed={comparePrev}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Prev period
        </button>

        {/* Legend show/hide chip */}
        <button
          className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC]"
          style={{ borderColor: TK.borderSubtle }}
          onClick={() => setLegendOpen((v) => !v)}
          aria-pressed={legendOpen}
        >
          <Layers3 className="h-4 w-4" />
          {legendOpen ? "Hide legend" : "Show legend"}
        </button>
      </div>

      {/* Chart area (legend anchored at top‑left inside) */}
      <div
        ref={chartRef}
        className="relative w-full"
        style={{ height, userSelect: "none", outline: "none" as const }}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {/* Legend (inside chart area, just below filters bar, top-left) */}
        {legendOpen && series.length > 0 && (
          <div
            className="pointer-events-auto absolute z-10 flex max-w-[calc(100%-32px)] flex-wrap gap-2 rounded-md bg-white/85 p-2 backdrop-blur"
            style={{ left: margins.left, top: 8, border: `1px solid ${TK.border}` }}
          >
            {series.map((s, i) => {
              const color = PALETTE[i % PALETTE.length];
              const isHidden = hidden.has(s.key);
              return (
                <button
                  key={s.key}
                  className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: TK.border,
                    background: isHidden ? "#fff" : TK.subtle,
                    color: TK.text,
                    fontFamily: FONT,
                  }}
                  title={"Click to toggle • Shift+click to isolate"}
                  onClick={(e) => toggleLegend(s.key, (e as any).shiftKey)}
                >
                  <span
                    aria-hidden
                    className="inline-block h-3 w-3 rounded-full"
                    style={{
                      background: color,
                      boxShadow: `0 0 0 2px ${color}22`,
                      outline: isHidden ? `3px solid #fff` : "none",
                    }}
                  />
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Chart */}
        {loading && <div className="p-4 text-sm text-gray-500">Loading trend…</div>}
        {!loading && error && (
          <div className="p-4 text-sm" style={{ color: "#EF4444" }}>
            {error}{" "}
            <button
              className="inline-flex h-7 items-center gap-2 rounded border px-2 text-xs hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderSubtle }}
              onClick={() => setMetric((m) => m)}
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && series.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No activity for selected filters/date range.</div>
        )}

        {!loading && !error && series.length > 0 && (
          <>
            <svg width={width} height={height} role="img" aria-label="User activity trends">
              {/* Y grid + labels */}
              {ticks.map((t, i) => (
                <g key={i}>
                  <line x1={margins.left} y1={yTo(t)} x2={width - margins.right} y2={yTo(t)} stroke="#E5E7EB" />
                  <text
                    x={margins.left - 8}
                    y={yTo(t)}
                    textAnchor="end"
                    dominantBaseline="central"
                    style={{ fill: TK.muted, fontSize: 11, fontFamily: FONT }}
                  >
                    {t}
                  </text>
                </g>
              ))}

              {/* X labels (sparse) */}
              {dates.map((d, i) =>
                i % Math.max(1, Math.floor(dates.length / 6)) === 0 ? (
                  <text
                    key={d}
                    x={margins.left + (innerW * i) / Math.max(1, xCount - 1)}
                    y={height - margins.bottom + 22}
                    textAnchor="middle"
                    style={{ fill: TK.muted, fontSize: 11, fontFamily: FONT }}
                  >
                    {fmtDate(d)}
                  </text>
                ) : null
              )}

              {/* Axes */}
              <line x1={margins.left} y1={margins.top} x2={margins.left} y2={height - margins.bottom} stroke={TK.border} />
              <line x1={margins.left} y1={height - margins.bottom} x2={width - margins.right} y2={height - margins.bottom} stroke={TK.border} />

              {/* Previous period (dotted) */}
              {comparePrev &&
                series.map((s, i) => {
                  if (hidden.has(s.key)) return null;
                  const ps = prevMap[s.key];
                  if (!ps) return null;
                  const d = ps.points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${xTo(idx)} ${yTo(p.v)}`).join(" ");
                  return (
                    <path
                      key={s.key + "_prev"}
                      d={d}
                      fill="none"
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeOpacity={0.4}
                      strokeDasharray={dotted}
                      strokeWidth={2}
                    />
                  );
                })}

              {/* Current series */}
              {series.map((s, i) => {
                if (hidden.has(s.key)) return null;
                const d = s.points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${xTo(idx)} ${yTo(p.v)}`).join(" ");
                const color = PALETTE[i % PALETTE.length];
                const isActive = !activeKey || activeKey === s.key;
                return (
                  <g key={s.key}>
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      strokeOpacity={isActive ? 1 : 0.5}
                    />
                    {s.points.map((p, idx) => {
                      const r = hoverIdx === idx && activeKey === s.key ? 4.5 : 3;
                      return <circle key={`${s.key}_${idx}`} cx={xTo(idx)} cy={yTo(p.v)} r={r} fill={color} opacity={isActive ? 1 : 0.5} />;
                    })}
                  </g>
                );
              })}

              {/* Hover line */}
              {hoverIdx != null && (
                <line
                  x1={xTo(hoverIdx)}
                  y1={margins.top}
                  x2={xTo(hoverIdx)}
                  y2={height - margins.bottom}
                  stroke={TK.muted}
                  strokeDasharray="2 4"
                />
              )}

              {/* Hit area */}
              <rect
                x={margins.left}
                y={margins.top}
                width={innerW}
                height={innerH}
                fill="transparent"
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
                onClick={onPointClick}
                cursor="crosshair"
              />
            </svg>

            {/* Smart Tooltip */}
            {tool && (
              <div
                className="pointer-events-none absolute rounded border bg-white p-2 text-xs shadow"
                style={{
                  left: Math.min(tool.x + 12, width - 260),
                  top: tool.y,
                  width: 248,
                  borderColor: TK.border,
                  fontFamily: FONT,
                  color: TK.text,
                }}
                role="tooltip"
              >
                <div className="mb-1 font-semibold">
                  {METRIC_LABEL[metric]} — {fmtDate(tool.date)}
                </div>
                {tool.lines.map((l) => (
                  <div key={l.key} className="mb-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: l.color }}
                    />
                    <span className="flex-1">{l.label}</span>
                    <span className="font-semibold">{fmtNumber(l.value)}</span>
                  </div>
                ))}
                {comparePrev && <div className="mt-1 text-[11px] text-gray-500">Prev period shown as dotted line.</div>}
              </div>
            )}

            {/* Offscreen a11y table */}
            <table aria-hidden style={{ position: "absolute", left: -9999, top: -9999, fontFamily: FONT }}>
              <thead>
                <tr>
                  <th>Date</th>
                  {series.map((s) => (
                    <th key={s.key}>{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((d, i) => (
                  <tr key={d}>
                    <td>{d}</td>
                    {series.map((s) => (
                      <td key={s.key}>{s.points[i]?.v ?? 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────────────── Demo wrapper (optional) ───────────────────────────────── */
export default function TeamActivityTrendsDemo() {
  return (
    <div className="p-4" style={{ background: "#FAFBFC", fontFamily: FONT }}>
      <TeamActivityTrends />
    </div>
  );
}
