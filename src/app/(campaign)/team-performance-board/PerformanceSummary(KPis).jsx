

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ───────────────────────── Tokens (shared with panels) ───────────────────────── */
const TK = {
  brand: "#1090D0",
  brandHover: "#0A7AB2",
  text: "#111827",
  muted: "#6B7280",
  surface: "#FFFFFF",
  surfaceSubtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  focus: "#D2EFFF",
  shadow: "0 2px 6px rgba(0,0,0,0.05)",
  status: {
    notStarted: "#CBD5E1",
    inProgress: "#1090D0",
    review: "#FF9F43",
    completed: "#28C76F",
    overdue: "#EA5455",
    blocked: "#F97316",
    neutral: "#6C757D",
  },
  kpi: {
    assigned: "#1090D0",
    completed: "#28C76F",
    overdue: "#EA5455",
    avgTime: "#FF9F43",
    timeLogged: "#6C757D",
    reassigned: "#7367F0",
  },
  radiusCard: 6,
};

/* ───────────────────────── Utilities ───────────────────────── */
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString() : "—");

function useSessionState(key, initial) {
  const [s, setS] = useState(() => {
    try {
      const v = sessionStorage.getItem(key);
      return v ? JSON.parse(v) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(s));
    } catch {}
  }, [key, s]);
  return [s, setS];
}

function useCountTo(value, ms = 360) {
  const [display, setDisplay] = useState(value ?? 0);
  const fromRef = useRef(display);
  useEffect(() => {
    const from = (fromRef.current = display);
    const to = value ?? 0;
    const start = performance.now();
    let raf = 0;
    const step = (t) => {
      const p = clamp((t - start) / ms);
      const eased = 1 - Math.cos(p * Math.PI);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

const durLabel = (days) => {
  if (!Number.isFinite(days)) return "—";
  const d = Number(days);
  if (d >= 1) return `${d.toFixed(1)} d`;
  const hours = Math.round(d * 24);
  return `${hours} h`;
};

const timeHMM = (hours) => {
  if (!Number.isFinite(hours)) return "—";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

/* ───────────────────────── Micro‑charts ───────────────────────── */
const DonutSmall = ({ ratio = 0, size = 28, stroke = 6, color = TK.brand, track = TK.borderStrong, onHover }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = clamp(ratio) * c;
  return (
    <svg width={size} height={size}>
      <title>{`${Math.round(clamp(ratio) * 100)}%`}</title>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        onMouseEnter={() => onHover?.({ value: Math.round(clamp(ratio) * 100), pct: Math.round(clamp(ratio) * 100) })}
        onMouseLeave={() => onHover?.(null)}
        style={{ transition: "stroke-dasharray 220ms ease-out" }}
      />
    </svg>
  );
};

const DonutSegmented = ({ segments = [], size = 28, stroke = 6, track = TK.borderStrong, onHover }) => {
  const total = Math.max(1, segments.reduce((a, b) => a + (b.value || 0), 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {segments.map((s, i) => {
        const ratio = (s.value || 0) / total;
        const dash = ratio * c;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={s.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${c - dash}`}
            transform={`rotate(${offset * 360 - 90} ${size / 2} ${size / 2})`}
            onMouseEnter={() => onHover?.({ label: s.label, value: s.value, pct: Math.round(ratio * 100) })}
          />
        );
        offset += ratio;
        return el;
      })}
    </svg>
  );
};

const SparkMini = ({ series, width = 88, height = 30, color = TK.brand, fill = "rgba(16,144,208,0.15)", onHover }) => {
  const max = Math.max(1, ...series.map((d) => d.value));
  const pts = series.map((d, i) => {
    const x = (i / Math.max(1, series.length - 1)) * (width - 2) + 1;
    const y = height - (d.value / max) * (height - 2) - 1;
    return [x, y];
  });
  const path = pts.reduce((a, [x, y], i) => a + (i ? " L " : "M ") + x + " " + y, "");
  const area = `${path} L ${width - 1} ${height - 1} L 1 ${height - 1} Z`;
  return (
    <div style={{ position: "relative" }}>
      <svg
        width={width}
        height={height}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ix = clamp(
            Math.round(((e.clientX - rect.left) / (width - 2)) * Math.max(1, series.length - 1)),
            0,
            Math.max(0, series.length - 1)
          );
          onHover?.(series[ix], { x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => onHover?.(null)}
      >
        <path d={area} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />}
      </svg>
    </div>
  );
};

const MiniBars = ({ series, width = 88, height = 30, color = TK.brand, onHover }) => {
  const max = Math.max(1, ...series.map((d) => d.value));
  const w = Math.max(1, Math.floor((width - 8) / Math.max(1, series.length)));
  const gap = Math.min(3, Math.floor(w * 0.25));
  const bw = Math.max(1, w - gap);
  return (
    <svg
      width={width}
      height={height}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ix = clamp(Math.floor(((e.clientX - rect.left) - 4) / w), 0, Math.max(0, series.length - 1));
        onHover?.(series[ix], { x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => onHover?.(null)}
    >
      {series.map((d, i) => {
        const h = Math.max(1, Math.round((d.value / max) * (height - 4)));
        const x = 4 + i * w, y = height - h - 2;
        return <rect key={i} x={x} y={y} width={bw} height={h} rx="2" ry="2" fill={color} />;
      })}
    </svg>
  );
};

/* ───────────────────────── KPI Card (same shell as reference) ───────────────────────── */
const KpiCard = ({
  id, label, color, icon, value, valueSuffix, valueDisplay, donut, trend, mode, tooltip, onClick
}) => {
  const [tip, setTip] = useState(null);
  const display = typeof value === "number" ? useCountTo(value) : undefined;
  const donutType = donut && "segments" in donut ? "segmented" : "single";
  const ratio = useMemo(() => {
    if (!donut || donutType !== "single") return 0;
    const d = (donut || {}).denominator || 0;
    const n = (donut || {}).numerator || 0;
    return d <= 0 ? 0 : clamp(n / d);
  }, [donut, donutType]);

  const showDonut = mode === "donut" && !!donut;
  const showTrend = mode === "trend" && !!trend && trend.series?.length > 0;

  return (
    <button
      className="wr-kpi"
      onClick={onClick}
      title={tooltip}
      aria-label={`${label}${typeof display === "number" ? `: ${display}${valueSuffix ?? ""}` : valueDisplay ? `: ${valueDisplay}` : ""}. Click to filter.`}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
      style={{ borderRadius: TK.radiusCard, border: `1px solid ${TK.border}`, background: TK.surface, boxShadow: TK.shadow }}
    >
      <div className="wr-kpi-top">
        <div className="wr-kpi-left-col">
          <div className="wr-kpi-title-row">
            <span aria-hidden style={{ color }}>{icon}</span>
            <span className="wr-kpi-label">{label}</span>
          </div>
          <div className="wr-kpi-value" style={{ color: TK.brand }}>
            {valueDisplay ?? (typeof display === "number" ? `${fmtNum(display)}${valueSuffix ?? ""}` : "—")}
          </div>
        </div>

        <div className="wr-kpi-right" aria-hidden>
          {showDonut &&
            (donutType === "segmented" ? (
              <DonutSegmented segments={(donut.segments || [])} onHover={setTip} />
            ) : (
              <DonutSmall ratio={ratio} color={color} onHover={setTip} />
            ))}
          {showTrend &&
            (trend.kind === "bars" ? (
              <MiniBars series={trend.series} color={color} onHover={setTip} />
            ) : (
              <SparkMini series={trend.series} color={color} onHover={setTip} />
            ))}
          {tip && (
            <div className="wr-tip" role="tooltip">
              {tip.label ? <div><strong>{tip.label}</strong></div> : null}
              {tip.date ? <div><strong>{tip.date}</strong></div> : null}
              {"pct" in tip ? <div>{fmtNum(tip.value)} · {tip.pct}%</div> : <div>{fmtNum(tip.value)}</div>}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

/* ───────────────────────── CSV builder (pure) ───────────────────────── */
function buildCSV(cards) {
  const header = ["KPI", "Value", "Donut", "TrendPoints (date:value)"];
  const lines = cards.map((c) => {
    const s = c.trend?.series?.map((p) => `${p.date}:${p.value}`).join("|") || "";
    const donutStr = c.donut?.segments
      ? c.donut.segments.map((seg) => `${seg.label}:${seg.value}`).join("|")
      : c.donut
      ? `${c.donut.numerator}/${c.donut.denominator}`
      : "";
    return [c.label, String(c.value ?? c.valueDisplay ?? "—"), donutStr, s]
      .map((x) => `"${String(x).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

/* ───────────────────────── Team Performance KPI Row ───────────────────────── */
export function TeamKpiCards({
  boardId = "team-perf",
  data,
  onKpiClick,
  initialCollapsed = false,
}) {
  // Persisted UI state
  const [collapsed, setCollapsed] = useSessionState(`wr:team:${boardId}:kpi.collapsed`, initialCollapsed);
  const [mode, setMode] = useSessionState(`wr:team:${boardId}:kpi.mode`, "donut"); // "donut" | "trend"
  const [optOpen, setOptOpen] = useState(false);
  const [opts, setOpts] = useSessionState(`wr:team:${boardId}:kpi.opts`, {
    timeLogged: true,
    reassigned: true,
  });

  const cards = useMemo(() => {
    const C = [];

    // 🔵 Total Tasks Assigned — segmented by status
    const assignedTotal = data.assigned?.total ?? 0;
    const byStatus = data.assigned?.byStatus || {};
    C.push({
      id: "assigned",
      label: "Total Tasks Assigned",
      icon: "📋",
      color: TK.kpi.assigned,
      value: assignedTotal,
      donut: {
        segments: [
          { label: "Not Started", value: byStatus.not_started || 0, color: TK.status.notStarted },
          { label: "In Progress", value: byStatus.in_progress || 0, color: TK.status.inProgress },
          { label: "Review", value: byStatus.review || 0, color: TK.status.review },
          { label: "Completed", value: byStatus.completed || 0, color: TK.status.completed },
          { label: "Overdue", value: byStatus.overdue || 0, color: TK.status.overdue },
        ],
      },
      trend: { series: data.assigned?.trend7 || [], kind: "bars" },
      payload: { metric: "assigned" },
      tip: "Tasks assigned within selected time range.",
    });

    // 🟢 Tasks Completed — donut (completed / assigned) + spark trend
    const completed = data.completed?.total ?? 0;
    C.push({
      id: "completed",
      label: "Tasks Completed",
      icon: "✅",
      color: TK.kpi.completed,
      value: completed,
      valueSuffix: "",
      donut: { numerator: completed, denominator: Math.max(1, assignedTotal) },
      trend: { series: data.completed?.trend7 || [], kind: "spark" },
      payload: { status: ["Completed"] },
      tip: "Tasks completed inside the selected window.",
    });

    // 🔴 Overdue Tasks — donut by buckets + bars trend
    const overdue = data.overdue?.total ?? 0;
    const buckets = data.overdue?.buckets || { "1–3d": 0, "4–7d": 0, ">7d": 0 };
    C.push({
      id: "overdue",
      label: "Overdue Tasks",
      icon: "⏰",
      color: TK.kpi.overdue,
      value: overdue,
      donut: {
        segments: [
          { label: "1–3d", value: buckets["1–3d"] || 0, color: TK.status.review },
          { label: "4–7d", value: buckets["4–7d"] || 0, color: "#FFA74D" },
          { label: ">7d", value: buckets[">7d"] || 0, color: TK.status.overdue },
        ],
      },
      trend: { series: data.overdue?.trend14 || [], kind: "bars" },
      payload: { overdue: true, status_ne: "Completed" },
      tip: "Past due and not completed as of today.",
    });

    // 🟡 Avg. Completion Time — value + trend
    C.push({
      id: "avgTime",
      label: "Avg. Completion Time",
      icon: "⏱️",
      color: TK.kpi.avgTime,
      valueDisplay: durLabel(data.avgCompletionDays?.value),
      donut: null,
      trend: { series: (data.avgCompletionDays?.trend30 || []).map(d => ({ date: d.date, value: d.avgDays })), kind: "spark" },
      payload: { status: ["Completed"] },
      tip: "Mean cycle time for completed tasks.",
    });

    // 🕒 Total Time Logged (optional)
    if (opts.timeLogged && data.timeLogged) {
      C.push({
        id: "timeLogged",
        label: "Total Time Logged",
        icon: "⏰",
        color: TK.kpi.timeLogged,
        valueDisplay: timeHMM(data.timeLogged.totalHours),
        donut: null,
        trend: { series: data.timeLogged.trend14 || [], kind: "bars" },
        payload: { time_logged_gt: 0 },
        tip: "Sum of approved time entries in range.",
      });
    }

    // 🔁 Tasks Reassigned (optional)
    if (opts.reassigned && data.reassigned) {
      C.push({
        id: "reassigned",
        label: "Tasks Reassigned",
        icon: "🔁",
        color: TK.kpi.reassigned,
        value: data.reassigned.total,
        donut: null,
        trend: { series: data.reassigned.trend14 || [], kind: "bars" },
        payload: { event: "reassigned" },
        tip: "Assignee changes within the selected window.",
      });
    }

    return C;
  }, [data, opts, assignedTotalGuard(data)]);

  // local guard to avoid re-renders when assignedTotal changes via closure
  function assignedTotalGuard(d) {
    return d.assigned?.total ?? 0;
  }

  const exportCSV = () => {
    const csv = buildCSV(
      cards.map((c) => ({
        label: c.label,
        value: c.valueDisplay ?? c.value,
        donut: c.donut,
        trend: c.trend,
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "team-kpis.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="wr-kpi-wrap" aria-label="Team KPI summary">
      {/* header bar */}
      <div className="wr-kpi-header" style={{ borderBottom: `1px solid ${TK.border}` }}>
        <div className="wr-kpi-title">Team KPIs</div>
        <div className="wr-kpi-actions">
          {/* global mode */}
          <div role="group" aria-label="Global chart mode" className="wr-seg">
            <button className={`seg ${mode === "donut" ? "active" : ""}`} onClick={() => setMode("donut")} aria-pressed={mode === "donut"}>
              Snapshot
            </button>
            <button className={`seg ${mode === "trend" ? "active" : ""}`} onClick={() => setMode("trend")} aria-pressed={mode === "trend"}>
              Trend
            </button>
          </div>

          {/* gear / options */}
          <div className="wr-gear-wrap" style={{ position: "relative" }}>
            <button className="wr-btn ghost" onClick={() => setOptOpen((v) => !v)} aria-expanded={optOpen} title="Customize optional cards">⚙️ Customize</button>
            {optOpen && (
              <div className="wr-popover" onMouseLeave={() => setOptOpen(false)} style={{ right: 0 }}>
                <div className="wr-pop-title">Optional KPI cards</div>
                <div className="wr-pop-grid">
                  {[
                    { key: "timeLogged", label: "Total Time Logged" },
                    { key: "reassigned", label: "Tasks Reassigned" },
                  ].map((o) => (
                    <label key={o.key} className="wr-pop-item">
                      <input
                        type="checkbox"
                        checked={opts[o.key] !== false}
                        onChange={(e) => setOpts((s) => ({ ...s, [o.key]: e.target.checked }))}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
                <div className="wr-pop-actions">
                  <button className="wr-btn ghost" onClick={() => setOpts({ timeLogged: true, reassigned: true })}>
                    Reset
                  </button>
                  <button className="wr-btn" onClick={() => setOptOpen(false)}>Apply</button>
                </div>
              </div>
            )}
          </div>

          <button className="wr-btn ghost" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
            {collapsed ? "▲ Show Summary" : "▼ Collapse Summary"}
          </button>
          <button className="wr-btn" onClick={exportCSV} aria-label="Export KPIs as CSV">Export CSV</button>
        </div>
      </div>

      {!collapsed && (
        <div className="wr-kpi-row" role="list">
          {cards.map((c) => (
            <KpiCard
              key={c.id}
              id={c.id}
              label={c.label}
              color={c.color}
              icon={c.icon}
              value={c.value}
              valueSuffix={c.valueSuffix}
              valueDisplay={c.valueDisplay}
              donut={c.donut}
              trend={c.trend}
              mode={mode}
              tooltip={c.tip}
              onClick={() => onKpiClick?.(c.id, c.payload)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── Demo wiring (mock data) ───────────────────────── */
function mkSeries(days, base = 20, swing = 10) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const v = Math.max(0, Math.round(base + Math.sin(i / 2) * swing + (Math.random() * swing - swing / 2)));
    out.push({ date: d.toISOString().slice(0, 10), value: v });
  }
  return out;
}

function mockTeamSummary() {
  // assigned by status
  const trendAssigned = mkSeries(7, 40, 15);
  const assignedNow = trendAssigned[trendAssigned.length - 1].value + 60;
  const ns = Math.round(assignedNow * 0.18);
  const ip = Math.round(assignedNow * 0.42);
  const rv = Math.round(assignedNow * 0.12);
  const cm = Math.round(assignedNow * 0.22);
  const od = Math.max(0, assignedNow - ns - ip - rv - cm);

  // completed
  const trendCompleted = mkSeries(7, 22, 10);
  const completed = trendCompleted.reduce((a, b) => a + b.value, 0) - 10;

  // overdue
  const trendOverdue = mkSeries(14, 12, 8);
  const overdueTotal = trendOverdue[trendOverdue.length - 1].value;
  const buckets = {
    "1–3d": Math.round(overdueTotal * 0.4),
    "4–7d": Math.round(overdueTotal * 0.35),
    ">7d": Math.max(0, overdueTotal - Math.round(overdueTotal * 0.75)),
  };

  // avg completion days (rolling)
  const trendAvgDays = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
    const avgDays = Math.max(0.2, 2.8 + Math.sin(i / 5) * 0.6 + (Math.random() - 0.5) * 0.4);
    return { date, avgDays };
  });

  // time logged
  const timeTrend = mkSeries(14, 11, 6);
  const timeTotalHours = Math.round(timeTrend.reduce((a, b) => a + b.value, 0) * 0.7);

  // reassigned
  const reassignTrend = mkSeries(14, 4, 3);
  const reassignTotal = reassignTrend.reduce((a, b) => a + b.value, 0) - 6;

  return {
    assigned: {
      total: assignedNow,
      byStatus: { not_started: ns, in_progress: ip, review: rv, completed: cm, overdue: od },
      trend7: trendAssigned,
    },
    completed: {
      total: Math.max(0, completed),
      trend7: trendCompleted,
    },
    overdue: {
      total: overdueTotal,
      buckets,
      trend14: trendOverdue,
    },
    avgCompletionDays: {
      value: trendAvgDays[trendAvgDays.length - 1].avgDays,
      trend30: trendAvgDays,
    },
    timeLogged: {
      totalHours: timeTotalHours,
      trend14: timeTrend,
    },
    reassigned: {
      total: Math.max(0, reassignTotal),
      trend14: reassignTrend,
    },
  };
}

export default function DemoTeamKpiCards() {
  const [data, setData] = useState(() => mockTeamSummary());
  const [last, setLast] = useState(null);

  // quick self-check for CSV builder
  useEffect(() => {
    try {
      const csv = buildCSV([
        { label: "Assigned", value: 100, donut: { segments: [{ label: "In Progress", value: 40, color: TK.status.inProgress }] }, trend: { series: [{ date: "2025-01-01", value: 10 }] } },
        { label: "Completed", value: 62, donut: { numerator: 62, denominator: 100 }, trend: { series: [{ date: "2025-01-02", value: 12 }] } },
      ]);
      console.assert(csv.includes("62/100") && csv.includes("In Progress:40"), "CSV builder should encode donuts");
    } catch (e) {
      console.warn("KPI CSV self-test failed:", e);
    }
  }, []);

  return (
    <div style={{ padding: 16, background: "#FAFAFA" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Team Performance · KPI Row (Demo)</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="wr-btn ghost" onClick={() => setData(mockTeamSummary())}>Regenerate</button>
          <button className="wr-btn ghost" onClick={() => sessionStorage.clear()}>Reset State</button>
        </div>
      </header>

      <TeamKpiCards
        boardId="demo-team"
        data={data}
        onKpiClick={(key, payload) => setLast({ key, payload, t: new Date().toLocaleTimeString() })}
      />

      <div style={{ marginTop: 8, fontSize: 12, color: TK.muted }}>
        {last ? (
          <>
            <strong>Last click:</strong> {last.key} · {JSON.stringify(last.payload)} · {last.t}
          </>
        ) : (
          <em>Click any card to emit a filter payload (wire to your global query).</em>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Styles (idempotent; same family as reference) ───────────────────────── */
const SID = "wr-team-kpi-style-v1";
if (!document.getElementById(SID)) {
  const s = document.createElement("style");
  s.id = SID;
  s.textContent = `
.wr-btn{border:1px solid ${TK.border}; background:${TK.surface}; padding:6px 10px; border-radius:6px; font-size:12px; cursor:pointer}
.wr-btn.ghost{background:${TK.surfaceSubtle};}
.wr-btn:hover{border-color:${TK.borderStrong}}
.wr-kpi-wrap{margin:16px 0; background:transparent}
.wr-kpi-header{position:sticky; top:0; z-index:1; display:flex; align-items:center; justify-content:space-between; padding:10px 0 12px; background:transparent}
.wr-kpi-title{font-weight:600; color:${TK.muted}}
.wr-kpi-actions{display:flex; gap:8px; align-items:center}
.wr-seg {display:flex}
.wr-seg .seg{border:1px solid ${TK.border}; background:${TK.surface}; color:${TK.muted}; padding:6px 10px; font-size:12px; border-radius:6px 0 0 6px; cursor:pointer}
.wr-seg .seg + .seg{border-left:none; border-radius:0 6px 6px 0}
.wr-seg .seg.active{background:${TK.focus}; color:${TK.text}}
.wr-kpi-row{display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px; padding-top:8px}
.wr-kpi{display:flex; padding:12px; min-width:220px; height:96px; cursor:pointer; transition:transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease; border:1px solid ${TK.border}; border-radius:${TK.radiusCard}px; background:${TK.surface}}
.wr-kpi:hover{border-color:${TK.borderStrong}; box-shadow:${TK.shadow};}
.wr-kpi:focus-visible{outline:2px solid ${TK.focus}; outline-offset:2px}
.wr-kpi-top{display:flex; align-items:center; justify-content:space-between; width:100%}
.wr-kpi-left-col{display:flex; flex-direction:column; gap:6px}
.wr-kpi-title-row{display:flex; align-items:center; gap:8px; color:${TK.muted}; font-size:14px; font-weight:600}
.wr-kpi-right{position:relative; display:flex; align-items:center; justify-content:center; width:88px}
.wr-tip{position:absolute; top:-6px; right:0; transform:translateY(-100%); background:rgba(17,24,39,0.96); color:#fff; padding:6px 8px; border-radius:6px; font-size:11px; pointer-events:none}
.wr-kpi-value{font-size:18px; font-weight:700}
.wr-gear-wrap .wr-popover{position:absolute; top:36px; width:260px; background:#fff; border:1px solid ${TK.border}; border-radius:8px; box-shadow:0 10px 24px rgba(0,0,0,.08); padding:8px; z-index:5}
.wr-pop-title{font-weight:600; font-size:13px; margin-bottom:6px}
.wr-pop-grid{max-height:260px; overflow:auto; display:grid; grid-template-columns:1fr; gap:4px}
.wr-pop-item{display:flex; align-items:center; gap:8px; font-size:13px}
.wr-pop-actions{display:flex; justify-content:space-between; margin-top:8px}
@media (max-width: 768px){ .wr-kpi-row{ grid-template-columns: repeat( auto-fill, minmax(180px, 1fr) ); } }
`;
  document.head.appendChild(s);
}


