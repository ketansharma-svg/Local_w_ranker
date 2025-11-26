"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ===========================
 *  Types (match your spec)
 *  =========================== */
type Bucket = "day" | "week";
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
  bucket: Bucket;
  series: Series[];
  prev_period?: { series: Series[] };
  summary?: {
    most_active_day?: { t: string; v: number };
    least_active_day?: { t: string; v: number };
    top?: { key: string; label: string; v: number };
  };
};

/** ===========================
 *  Demo helpers / Tokens
 *  =========================== */
const TOKENS = {
  brand: "#1090D0",
  text: "#282829",
  border: "#EFF0F6",
  muted: "rgba(40,40,41,0.64)",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  bg: "#FFFFFF",
  grid: "rgba(40,40,41,0.06)",
};

const METRIC_LABEL: Record<MetricKey, string> = {
  logins: "Total Logins",
  sessions: "Sessions",
  tasks_created: "Tasks Created",
  task_updates: "Task Updates",
  comments: "Comments Added",
  content_edits: "Content Edits",
};

/** Deterministic, color‑blind‑safe palette. */
const PALETTE = [
  "#1F77B4", // blue
  "#FF7F0E", // orange
  "#2CA02C", // green
  "#D62728", // red
  "#9467BD", // purple
  "#8C564B", // brown
  "#E377C2", // pink
  "#7F7F7F", // gray
  "#BCBD22", // olive
  "#17BECF", // cyan
];
const dotted = "4 4";

/** Formatters */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtNumber = (n: number) => new Intl.NumberFormat().format(n);

/** ===========================
 *  Mock fetch (demo data)
 *  Replace with your /team-analytics/trends
 *  =========================== */
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
  // deterministic-ish
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

async function mockFetchTrends(
  metric: MetricKey,
  group_by: GroupBy,
  top: 5 | 10 | "all",
  // filters omitted for demo
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
          const base =
            r.key === "owner"
              ? 1
              : r.key === "admin"
              ? 3
              : r.key === "editor"
              ? 2
              : 1;
          const mul =
            metric === "logins"
              ? 1
              : metric === "sessions"
              ? 2
              : metric === "tasks_created"
              ? 2
              : 1;
          return makeSeries(`role:${r.key}`, r.label, dates, base * mul, 3, i + 23);
        });

  // Sort by total (desc) and cut by top
  const sorted = sets.sort((a, b) => b.total - a.total);
  const limited =
    group_by === "roles" ? sorted : top === "all" ? sorted : sorted.slice(0, top);

  // Prev period: scale 0.85–1.05 to simulate change
  const prev_series = limited.map((s, i) => {
    const factor = 0.85 + (seededRand(i + 123) * 0.2); // 0.85..1.05
    const points = s.points.map((p) => ({ t: p.t, v: Math.max(0, Math.round(p.v * factor)) }));
    return { key: s.key, label: s.label, points, total: Math.round(s.total * factor) };
  });

  // Simulate latency
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

/** ===========================
 *  Core component
 *  =========================== */
export function TeamActivityTrends({
  onOpenUserSummary,
  onOpenRoleTable,
}: {
  onOpenUserSummary?: (userId: string, whenISO: string, metric: MetricKey) => void;
  onOpenRoleTable?: (roleKey: string, whenISO: string, metric: MetricKey) => void;
}) {
  // Controls
  const [metric, setMetric] = useState<MetricKey>("logins");
  const [groupBy, setGroupBy] = useState<GroupBy>("users");
  const [topN, setTopN] = useState<5 | 10 | "all">(5);
  const [comparePrev, setComparePrev] = useState<boolean>(false);
  const [legendOpen, setLegendOpen] = useState<boolean>(true);

  // Data
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<TrendsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Legend state
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Hover / keyboard focus
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
          // Reset legend selections and hover
          setHidden(new Set());
          setHoverIdx(null);
          setActiveKey(null);
        }
      })
      .catch((e) => {
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
    const map: Record<string, Series> = {};
    resp?.prev_period?.series.forEach((s) => (map[s.key] = s));
    return map;
  }, [resp]);

  /** ======= Chart geometry ======= */
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

  /** Domains & scales */
  const dates = series[0]?.points?.map((p) => p.t) ?? daysBack(30);
  const xCount = dates.length;

  const visibleKeys = series
    .filter((s) => !hidden.has(s.key))
    .map((s) => s.key);

  const yMax = useMemo(() => {
    let m = 0;
    for (const s of series) {
      if (hidden.has(s.key)) continue;
      for (const p of s.points) m = Math.max(m, p.v);
      if (comparePrev && prevMap[s.key]) {
        for (const p of prevMap[s.key].points) m = Math.max(m, p.v);
      }
    }
    if (m <= 5) return 5;
    if (m <= 10) return 10;
    // round up to nearest 5
    return Math.ceil(m / 5) * 5;
  }, [series, hidden, prevMap, comparePrev]);

  const innerW = width - margins.left - margins.right;
  const innerH = height - margins.top - margins.bottom;

  const xTo = (i: number) => margins.left + (innerW * i) / Math.max(1, xCount - 1);
  const yTo = (v: number) => margins.top + innerH - (innerH * v) / Math.max(1, yMax);

  const ticks = useMemo(() => {
    const out: number[] = [];
    const step = yMax <= 10 ? 2 : 5;
    for (let y = 0; y <= yMax; y += step) out.push(y);
    return out;
  }, [yMax]);

  /** Tooltip math */
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
    // Highlight nearest by vertical distance
    let active = activeKey;
    if (lines.length > 0) {
      let best: { key: string; dist: number } | null | any = null;
      lines.forEach((l) => {
        const dist = Math.abs(yTo(l.value) - (ev.nativeEvent as any).offsetY);
        if (!best || dist < best.dist) best = { key: l.key, dist };
      });
      active = best?.key  ?? null;
      setActiveKey(active);
    }
    const x = xTo(idx);
    const values = lines.sort((a, b) => b.value - a.value);
    setTool({
      x,
      y: margins.top + 8,
      date: dates[idx],
      lines: values,
    });
  }

  function onMouseLeave() {
    setHoverIdx(null);
    setTool(null);
  }

  function onPointClick() {
    if (hoverIdx == null) return;
    const dt = dates[hoverIdx];
    if (groupBy === "users") {
      const key = activeKey ?? series[0]?.key;
      if (!key) return;
      onOpenUserSummary?.(key.replace("user:", ""), dt, metric);
      alert(`Open User Summary → ${key} • ${fmtDate(dt)} • ${METRIC_LABEL[metric]}`);
    } else {
      const key = activeKey ?? series[0]?.key;
      if (!key) return;
      onOpenRoleTable?.(key.replace("role:", ""), dt, metric);
      alert(`Open Engagement Table (role) → ${key} • ${fmtDate(dt)} • ${METRIC_LABEL[metric]}`);
    }
  }

  /** Legend behavior (click toggle / Shift+click isolate) */
  function toggleLegend(k: string, isolate: boolean) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (isolate) {
        // Hide all except k if any other visible; else show all
        const all = new Set(series.map((s) => s.key));
        const visCount = series.filter((s) => !prev.has(s.key)).length;
        if (visCount === 1 && !prev.has(k)) {
          // already isolated; show all
          return new Set();
        }
        // isolate k
        all.forEach((kk) => kk !== k && next.add(kk));
        next.delete(k);
      } else {
        if (next.has(k)) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  /** Export current view */
  function exportCSV(fmt: "csv" | "xlsx") {
    if (!resp) return;
    const rows: string[] = [];
    // metadata header
    rows.push(`# Team Analytics — Trends (${METRIC_LABEL[metric]})`);
    rows.push(`# Group By: ${groupBy.toUpperCase()}, Top: ${groupBy === "users" ? topN : "N/A"}, Compare: ${comparePrev ? "yes" : "no"}`);
    rows.push(`# Range: ${fmtDate(dates[0])} — ${fmtDate(dates[dates.length - 1])}`);
    rows.push("");
    // header
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

  /** Keyboard navigation on chart */
  function onKeyDown(ev: React.KeyboardEvent) {
    if (!series.length) return;
    if (hoverIdx == null) setHoverIdx(dates.length - 1);
    if (ev.key === "ArrowLeft") {
      setHoverIdx((i) => Math.max(0, (i ?? 0) - 1));
    } else if (ev.key === "ArrowRight") {
      setHoverIdx((i) => Math.min(dates.length - 1, (i ?? 0) + 1));
    } else if (ev.key === "Enter") {
      onPointClick();
    }
  }

  /** Render */
  return (
    <section
      style={{
        background: TOKENS.bg,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 6,
        padding: 16,
      }}
      className="mb-4"
      aria-labelledby="ta-trends-title"
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h3 id="ta-trends-title" style={{ margin: 0, fontSize: 18, fontWeight: 600, color: TOKENS.text }}>
          📈 User Activity Trends
        </h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => exportCSV("csv")}
            aria-label="Export CSV"
            style={btnSecondary}
          >
            ⬇ Export CSV
          </button>
          <button
            onClick={() => exportCSV("xlsx")}
            aria-label="Export Excel"
            style={btnSecondary}
          >
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          padding: 8,
          background: "#F5F7FA",
          borderRadius: 6,
          border: `1px solid ${TOKENS.border}`,
          marginBottom: 12,
        }}
        aria-label="Trends controls"
      >
        {/* Metric */}
        <label style={ctlWrap}>
          <span style={ctlLabel}>Metric</span>
          <select
            value={metric}
            onChange={(e) => {
              setMetric(e.target.value as MetricKey);
              console.log("ta.trends.metric_change", e.target.value);
            }}
            style={select}
          >
            <option value="logins">Total Logins</option>
            <option value="sessions">Sessions</option>
            <option value="tasks_created">Tasks Created</option>
            <option value="task_updates">Task Updates</option>
            <option value="comments">Comments Added</option>
            <option value="content_edits">Content Edits</option>
          </select>
        </label>

        {/* View by */}
        <div style={ctlWrap}>
          <span style={ctlLabel}>View by</span>
          <div role="tablist" aria-label="View by" style={{ display: "inline-flex", border: `1px solid ${TOKENS.border}`, borderRadius: 6, overflow: "hidden" }}>
            {(["users", "roles"] as GroupBy[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={groupBy === v}
                onClick={() => {
                  setGroupBy(v);
                  if (v === "roles") setTopN(5); // top hidden in roles
                  console.log("ta.trends.group_by_change", v);
                }}
                style={{
                  padding: "6px 10px",
                  background: groupBy === v ? TOKENS.brand : "#fff",
                  color: groupBy === v ? "#fff" : TOKENS.text,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {v === "users" ? "👤 Users" : "🧢 Roles"}
              </button>
            ))}
          </div>
        </div>

        {/* Top */}
        <label style={{ ...ctlWrap, opacity: groupBy === "roles" ? 0.5 : 1 }}>
          <span style={ctlLabel}>Top</span>
          <select
            value={String(topN)}
            onChange={(e) => setTopN((e.target.value === "all" ? "all" : Number(e.target.value)) as any)}
            disabled={groupBy === "roles"}
            style={select}
          >
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="all">All</option>
          </select>
        </label>

        {/* Compare */}
        <label style={ctlWrap}>
          <span style={ctlLabel}>Compare</span>
          <input
            type="checkbox"
            checked={comparePrev}
            onChange={(e) => {
              setComparePrev(e.target.checked);
              console.log("ta.trends.compare_toggle", e.target.checked);
            }}
          />{" "}
          <span style={{ color: TOKENS.muted }}>Prev period</span>
        </label>

        {/* Legend toggle */}
        <label style={ctlWrap}>
          <span style={ctlLabel}>Legend</span>
          <button
            onClick={() => {
              setLegendOpen((v) => !v);
              console.log("ta.trends.legend_toggle", { open: !legendOpen });
            }}
            style={btnSecondary}
          >
            {legendOpen ? "Hide" : "Show"}
          </button>
        </label>
      </div>

      {/* Chart body */}
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height,
          position: "relative",
          userSelect: "none",
          outline: "none",
        }}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {loading && (
          <div style={{ padding: 16, color: TOKENS.muted }}>Loading trend…</div>
        )}
        {!loading && error && (
          <div style={{ padding: 16, color: TOKENS.danger }}>
            {error} <button style={btnSecondary} onClick={() => setMetric((m) => m)}>Retry</button>
          </div>
        )}
        {!loading && !error && series.length === 0 && (
          <div style={{ padding: 16, color: TOKENS.muted }}>
            No activity for selected filters/date range.
          </div>
        )}

        {!loading && !error && series.length > 0 && (
          <>
            <svg width={width} height={height} role="img" aria-label="User activity trends">
              {/* gridlines */}
              {ticks.map((t, i) => (
                <g key={i}>
                  <line
                    x1={margins.left}
                    y1={yTo(t)}
                    x2={width - margins.right}
                    y2={yTo(t)}
                    stroke={TOKENS.grid}
                  />
                  <text
                    x={margins.left - 8}
                    y={yTo(t)}
                    textAnchor="end"
                    dominantBaseline="central"
                    style={{ fill: TOKENS.muted, fontSize: 11 }}
                  >
                    {t}
                  </text>
                </g>
              ))}
              {/* X axis labels (sparse) */}
              {dates.map((d, i) =>
                i % Math.max(1, Math.floor(dates.length / 6)) === 0 ? (
                  <text
                    key={d}
                    x={xTo(i)}
                    y={height - margins.bottom + 22}
                    textAnchor="middle"
                    style={{ fill: TOKENS.muted, fontSize: 11 }}
                  >
                    {fmtDate(d)}
                  </text>
                ) : null
              )}
              {/* Y axis line */}
              <line
                x1={margins.left}
                y1={margins.top}
                x2={margins.left}
                y2={height - margins.bottom}
                stroke={TOKENS.border}
              />
              {/* X axis line */}
              <line
                x1={margins.left}
                y1={height - margins.bottom}
                x2={width - margins.right}
                y2={height - margins.bottom}
                stroke={TOKENS.border}
              />

              {/* Prev period (ghost) */}
              {comparePrev &&
                series.map((s, i) => {
                  if (hidden.has(s.key)) return null;
                  const ps = prevMap[s.key];
                  if (!ps) return null;
                  const d = ps.points
                    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xTo(idx)} ${yTo(p.v)}`)
                    .join(" ");
                  return (
                    <path
                      key={s.key + "_prev"}
                      d={d}
                      fill="none"
                      stroke={colorFor(s.key, i)}
                      strokeOpacity={0.4}
                      strokeDasharray={dotted}
                      strokeWidth={2}
                    />
                  );
                })}

              {/* Current series */}
              {series.map((s, i) => {
                if (hidden.has(s.key)) return null;
                const d = s.points
                  .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xTo(idx)} ${yTo(p.v)}`)
                  .join(" ");
                const color = colorFor(s.key, i);
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
                    {/* points */}
                    {s.points.map((p, idx) => {
                      const r =
                        hoverIdx === idx && activeKey === s.key
                          ? 4.5
                          : 3;
                      return (
                        <circle
                          key={`${s.key}_${idx}`}
                          cx={xTo(idx)}
                          cy={yTo(p.v)}
                          r={r}
                          fill={color}
                          opacity={isActive ? 1 : 0.5}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Hover/keyboard vertical line */}
              {hoverIdx != null && (
                <line
                  x1={xTo(hoverIdx)}
                  y1={margins.top}
                  x2={xTo(hoverIdx)}
                  y2={height - margins.bottom}
                  stroke={TOKENS.muted}
                  strokeDasharray="2 4"
                />
              )}

              {/* hit‑rect for hover */}
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

            {/* Tooltip */}
            {tool && (
              <div
                style={{
                  position: "absolute",
                  top: tool.y,
                  left: Math.min(tool.x + 12, width - 260),
                  width: 248,
                  background: "#fff",
                  border: `1px solid ${TOKENS.border}`,
                  borderRadius: 6,
                  padding: 10,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  pointerEvents: "none",
                  fontSize: 12,
                  color: TOKENS.text,
                }}
                role="tooltip"
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {METRIC_LABEL[metric]} — {fmtDate(tool.date)}
                </div>
                {tool.lines.map((l) => (
                  <div key={l.key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        background: l.color,
                        borderRadius: 999,
                      }}
                    />
                    <span style={{ flex: 1 }}>{l.label}</span>
                    <span style={{ fontWeight: 600 }}>{fmtNumber(l.value)}</span>
                  </div>
                ))}
                {comparePrev && (
                  <div style={{ marginTop: 6, color: TOKENS.muted }}>
                    Prev period shown as dotted line.
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            {legendOpen && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {series.map((s, i) => {
                  const color = colorFor(s.key, i);
                  const isHidden = hidden.has(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={(e) => toggleLegend(s.key, (e as any).shiftKey)}
                      title={
                        "Click to toggle • Shift+click to isolate\n" +
                        (isHidden ? "Hidden" : "Visible")
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        border: `1px solid ${TOKENS.border}`,
                        borderRadius: 999,
                        background: isHidden ? "#fff" : "#F5F7FA",
                        cursor: "pointer",
                        color: TOKENS.text,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          background: color,
                          outline: isHidden ? `3px solid #fff` : "none",
                          boxShadow: `0 0 0 2px ${color}33`,
                        }}
                      />
                      <span style={{ fontSize: 12 }}>{s.label}</span>
                    </button>
                  );
                })}
                <span style={{ marginLeft: "auto", color: TOKENS.muted, fontSize: 12 }}>
                  Legend: click to show/hide · <b>Shift+click</b> to isolate
                </span>
              </div>
            )}

            {/* Offscreen data table for a11y / export parity */}
            <table aria-hidden style={{ position: "absolute", left: -9999, top: -9999 }}>
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


const btnSecondary: React.CSSProperties = {
  padding: "6px 10px",
  background: "#fff",
  border: `1px solid ${TOKENS.border}`,
  borderRadius: 6,
  cursor: "pointer",
  color: TOKENS.text,
};

const ctlWrap: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6 };
const ctlLabel: React.CSSProperties = { color: TOKENS.muted, fontSize: 12, marginRight: 6 };
const select: React.CSSProperties = {
  height: 32,
  padding: "0 8px",
  borderRadius: 6,
  border: `1px solid ${TOKENS.border}`,
  color: TOKENS.text,
  background: "#fff",
};


