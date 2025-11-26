"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

/* ───────────────────────── Tokens (match Campaign Taskboard) ───────────────────────── */
const TK = {
  brand: "#1090D0",
  text: "#000000",
  muted: "#6B7280",
  surface: "#FFFFFF",
  surfaceSubtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  focus: "#D2EFFF",
  shadow: "0 2px 6px rgba(0,0,0,0.05)",
  good: "#10B981",
  warn: "#F59E0B",
  risk: "#EF4444",
  radiusCard: 6,
};

/* ───────────────────────── Utilities ───────────────────────── */
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const fmtNum = (n) => (typeof n === "number" ? n.toLocaleString() : "—");
const pct = (n) => `${Math.round(n * 100)}%`;

// stable local storage with try/catch (no URL writes in about:srcdoc)
function useLocalState(key, initial) {
  const [s, setS] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(s));
      // safe URL reflection (guard about: and cross‑origin iframes)
      try {
        const href = window.location?.href || "";
        if (!href.startsWith("about:")) {
          const url = new URL(href);
          if (key.endsWith(":kpiView")) {
            url.searchParams.set("kpiView", s);
            window.history.replaceState({}, "", url.toString());
          }
        }
      } catch {}
    } catch {}
  }, [key, s]);
  return [s, setS];
}

/* ───────────────────────── Micro‑charts (same skeleton) ───────────────────────── */
const DonutSmall = ({ ratio = 0, size = 48, stroke = 8, color = TK.brand, track = TK.borderStrong, onHover }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = clamp(ratio) * c;
  return (
    <svg width={size} height={size} role="img" aria-label={`${Math.round(clamp(ratio) * 100)}%`}>
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

const DonutSegmented = ({ segments = [], size = 48, stroke = 8, track = TK.borderStrong, onHover }) => {
  const total = Math.max(1, segments.reduce((a, b) => a + (b.value || 0), 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} role="img" aria-label="Segmentation by dashboard">
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

const SparkMini = ({ series, width = 112, height = 42, color = TK.brand, fill = "rgba(16,144,208,0.14)", onHover }) => {
  const max = Math.max(1, ...series.map((d) => d.value));
  const pts = series.map((d, i) => {
    const x = (i / Math.max(1, series.length - 1)) * (width - 2) + 1;
    const y = height - (d.value / max) * (height - 2) - 1;
    return [x, y];
  });
  const path = pts.reduce((a, [x, y], i) => a + (i ? " L " : "M ") + x + " " + y, "");
  const area = `${path} L ${width - 1} ${height - 1} L 1 ${height - 1} Z`;
  return (
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
      role="img"
      aria-label="Trend"
    >
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />}
    </svg>
  );
};

const MiniBars = ({ series, width = 112, height = 42, color = TK.brand, onHover }) => {
  const max = Math.max(1, ...series.map((d) => d.value));
  const w = Math.max(1, Math.floor((width - 12) / Math.max(1, series.length)));
  const gap = Math.min(4, Math.floor(w * 0.25));
  const bw = Math.max(1, w - gap);
  return (
    <svg
      width={width}
      height={height}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ix = clamp(Math.floor(((e.clientX - rect.left) - 6) / w), 0, Math.max(0, series.length - 1));
        onHover?.(series[ix], { x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => onHover?.(null)}
      role="img"
      aria-label="Trend"
    >
      {series.map((d, i) => {
        const h = Math.max(1, Math.round((d.value / max) * (height - 6)));
        const x = 6 + i * w, y = height - h - 3;
        return <rect key={i} x={x} y={y} width={bw} height={h} rx="2" ry="2" fill={color} />;
      })}
    </svg>
  );
};

/* ───────────────────────── Reusable KPI Card (skeleton) ───────────────────────── */
const KpiCard = ({
  label,
  icon,
  valueDisplay,
  delta,           // { label: "+8.3%", tone: "good"|"warn"|"risk" }
  color = TK.brand,
  mode,            // "donut" | "trend"
  donut,           // { numerator, denominator } OR { segments:[{label,value,color}...] }
  trend,           // { series:[{date,value}], kind:"spark"|"bars" }
  onClick,
  tooltip,
}) => {
  const [tip, setTip] = useState(null);
  const donutType = donut && "segments" in donut ? "segmented" : donut ? "single" : null;
  const ratio = donutType === "single" ? (donut.denominator > 0 ? donut.numerator / donut.denominator : 0) : 0;

  const showDonut = mode === "donut" && donut;
  const showTrend = mode === "trend" && trend && trend.series?.length > 0;

  return (
    <button
      className="wr-kpi"
      onClick={onClick}
      title={tooltip}
      aria-label={`${label}: ${valueDisplay}`}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
      style={{ borderRadius: TK.radiusCard, border: `1px solid ${TK.border}`, background: TK.surface, boxShadow: TK.shadow }}
    >
      <div className="wr-kpi-top">
        {/* Left: label + metric + delta chip */}
        <div className="wr-kpi-left-col">
          <div className="wr-kpi-title-row">
            <span aria-hidden style={{ color }}>{icon}</span>
            <span className="wr-kpi-label">{label}</span>
          </div>
          <div className="wr-kpi-value" style={{ color: TK.brand }}>{valueDisplay || "—"}</div>
          {delta && (
            <div
              className={`wr-kpi-delta ${delta.tone === "good" ? "good" : delta.tone === "warn" ? "warn" : "risk"}`}
              aria-label={`Delta ${delta.label}`}
            >
              {delta.label}
            </div>
          )}
        </div>

        {/* Right: chart + floating tooltip (clamped above, so it never hides the donut) */}
        <div className="wr-kpi-right" aria-hidden>
          {showDonut &&
            (donutType === "segmented" ? (
              <DonutSegmented segments={donut.segments} onHover={setTip} />
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

/* ───────────────────────── CSV export (values + trends) ───────────────────────── */
function buildCSV(cards) {
  const header = ["KPI", "Value", "Donut", "TrendPoints (date:value)"];
  const lines = cards.map((c) => {
    const s = c.trend?.series?.map((p) => `${p.date}:${p.value}`).join("|") || "";
    const donutStr = c.donut?.segments
      ? c.donut.segments.map((seg) => `${seg.label}:${seg.value}`).join("|")
      : c.donut
      ? `${c.donut.numerator}/${c.donut.denominator}`
      : "";
    return [c.label, String(c.valueDisplay ?? "—"), donutStr, s]
      .map((x) => `"${String(x).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

/* ───────────────────────── Demo data (replace with API) ───────────────────────── */
function mkSeries(days, base = 20, swing = 10) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const v = Math.max(0, Math.round(base + Math.sin(i / 2) * swing + (Math.random() * swing - swing / 2)));
    out.push({ date: d.toISOString().slice(0, 10), value: v });
  }
  return out;
}

const demoSummary = {
  active_users: { current: 18, total: 24, prev: 16 },
  idle_users_30d: { current: 6, total: 24, prev: 8 },
  most_visited_dashboard: {
    label: "SEO",
    share: 0.62,
    distribution: [
      { dashboard: "seo", share: 0.62 },
      { dashboard: "content", share: 0.21 },
      { dashboard: "campaign", share: 0.12 },
      { dashboard: "reporting", share: 0.05 },
    ],
    prev_share: 0.58,
  },
  tasks: {
    completed: 226,
    created_in_range: 280,
    prev_completed: 210,
    prev_created: 265,
  },
  avg_sessions_per_user: { current: 5.2, prev: 4.8 },
  top_performer: {
    user: { id: "u123", name: "Sara Mehta" },
    score: 32,
    team_total: 210,
    prev_score: 28,
    prev_team_total: 198,
  },
};

const demoTrends = {
  active_users_daily: mkSeries(30, 12, 6),
  idle_users_daily: mkSeries(30, 4, 3),
  sessions_by_dashboard: { seo: mkSeries(30, 14, 8) },
  tasks_completed_daily: mkSeries(30, 11, 6),
  avg_sessions_daily: mkSeries(30, 5, 2),
  top_user_activity_daily: mkSeries(30, 7, 4),
};

/* ───────────────────────── Main Component ───────────────────────── */
export default function TeamAnalyticsKpiGrid({
  summary = demoSummary,
  trends = demoTrends,
  onCardClick = (what) => console.log("CTA:", what),
}) {
  const [mode, setMode] = useLocalState("ta:kpi:kpiView", "donut"); // "donut" | "trend"

  // thresholds & tones
  const toneForPct = (p) => (p >= 0.7 ? "good" : p >= 0.4 ? "warn" : "risk");
  const idleTone = (p) => (p <= 0.1 ? "good" : p <= 0.25 ? "warn" : "risk");
  const gaugeTone = (r) => (r >= 1.1 ? "good" : r >= 0.9 ? "warn" : "risk");

  // computed helpers
  const pctActive = summary.active_users.total ? summary.active_users.current / summary.active_users.total : 0;
  const deltaActivePts =
    summary.active_users.total && summary.active_users.prev != null
      ? (summary.active_users.current / summary.active_users.total - summary.active_users.prev / summary.active_users.total) * 100
      : 0;

  const pctIdle = summary.idle_users_30d.total ? summary.idle_users_30d.current / summary.idle_users_30d.total : 0;
  const deltaIdlePts =
    summary.idle_users_30d.prev != null
      ? ((summary.idle_users_30d.current - summary.idle_users_30d.prev) / Math.max(1, summary.idle_users_30d.total)) * 100
      : 0;

  const completionRate =
    summary.tasks.created_in_range > 0 ? summary.tasks.completed / summary.tasks.created_in_range : 0;
  const completionPrev =
    summary.tasks.prev_created > 0 ? summary.tasks.prev_completed / summary.tasks.prev_created : 0;

  const avgSessionsDeltaPct =
    summary.avg_sessions_per_user.prev > 0
      ? (summary.avg_sessions_per_user.current / summary.avg_sessions_per_user.prev) * 100 - 100
      : 0;

  const topShare =
    summary.top_performer.team_total > 0 ? summary.top_performer.score / summary.top_performer.team_total : 0;
  const topPrevShare =
    summary.top_performer.prev_team_total > 0
      ? summary.top_performer.prev_score / summary.top_performer.prev_team_total
      : 0;

  // build cards (values, donuts, trends, deltas)
  const cards = useMemo(() => {
    const C = [];

    // 1) Active Users
    const toneA = toneForPct(pctActive);
    C.push({
      id: "active",
      label: "Active Users (30d)",
      icon: "👥",
      color: toneA === "good" ? TK.good : toneA === "warn" ? TK.warn : TK.risk,
      valueDisplay: `${summary.active_users.current} / ${summary.active_users.total} (${pct(pctActive)})`,
      delta: { label: `${deltaActivePts >= 0 ? "▲" : "▼"} ${Math.abs(deltaActivePts).toFixed(1)} pts`, tone: deltaActivePts >= 0 ? "good" : "risk" },
      donut: { numerator: summary.active_users.current, denominator: Math.max(1, summary.active_users.total) },
      trend: { series: trends.active_users_daily, kind: "spark" },
      tooltip: `Active users: ${summary.active_users.current} of ${summary.active_users.total} (${pct(pctActive)}). Prev: ${pct(summary.active_users.prev / Math.max(1, summary.active_users.total))}.`,
      onClick: () => onCardClick("active_users"),
    });

    // 2) Idle Users
    const toneI = idleTone(pctIdle);
    C.push({
      id: "idle",
      label: "Idle Users (30+ d)",
      icon: "⏳",
      color: toneI === "good" ? TK.good : toneI === "warn" ? TK.warn : TK.risk,
      valueDisplay: `${summary.idle_users_30d.current} of ${summary.idle_users_30d.total}`,
      delta: { label: `${deltaIdlePts <= 0 ? "▲" : "▼"} ${Math.abs(deltaIdlePts).toFixed(1)} pts vs prev`, tone: deltaIdlePts <= 0 ? "good" : "risk" },
      donut: { numerator: summary.idle_users_30d.current, denominator: Math.max(1, summary.idle_users_30d.total) },
      trend: { series: trends.idle_users_daily, kind: "spark" },
      tooltip: `Idle: ${summary.idle_users_30d.current} of ${summary.idle_users_30d.total} (${pct(pctIdle)}). Prev: ${pct(summary.idle_users_30d.prev / Math.max(1, summary.idle_users_30d.total))}.`,
      onClick: () => onCardClick("idle_users"),
    });

    // 3) Most Visited Dashboard
    const dist = summary.most_visited_dashboard.distribution;
    C.push({
      id: "most",
      label: "Most Visited Dashboard",
      icon: "🧭",
      color: TK.brand,
      valueDisplay: `${summary.most_visited_dashboard.label} (${pct(summary.most_visited_dashboard.share)})`,
      delta: {
        label: `${summary.most_visited_dashboard.share - summary.most_visited_dashboard.prev_share >= 0 ? "▲" : "▼"} ${Math.abs((summary.most_visited_dashboard.share - summary.most_visited_dashboard.prev_share) * 100).toFixed(1)} pts`,
        tone: summary.most_visited_dashboard.share - summary.most_visited_dashboard.prev_share >= 0 ? "good" : "warn",
      },
      donut: {
        segments: [
          { label: "SEO", value: Math.round(dist[0].share * 100), color: "#0EA5E9" },
          { label: "Content", value: Math.round(dist[1].share * 100), color: "#8B5CF6" },
          { label: "Campaign", value: Math.round(dist[2].share * 100), color: "#F59E0B" },
          { label: "Reporting", value: Math.round(dist[3].share * 100), color: "#10B981" },
        ],
      },
      trend: { series: trends.sessions_by_dashboard?.seo || [], kind: "bars" },
      tooltip: "Share of sessions in scope (top slice labeled).",
      onClick: () => onCardClick("most_visited"),
    });

    // 4) Total Tasks Completed
    const toneT = toneForPct(completionRate);
    C.push({
      id: "tasks",
      label: "Total Tasks Completed",
      icon: "✅",
      color: toneT === "good" ? TK.good : toneT === "warn" ? TK.warn : TK.risk,
      valueDisplay: `${fmtNum(summary.tasks.completed)}`,
      delta: {
        label: `${completionRate - completionPrev >= 0 ? "▲" : "▼"} ${Math.abs((completionRate - completionPrev) * 100).toFixed(1)}% rate`,
        tone: completionRate - completionPrev >= 0 ? "good" : "warn",
      },
      donut:
        summary.tasks.created_in_range > 0
          ? { numerator: summary.tasks.completed, denominator: Math.max(1, summary.tasks.created_in_range) }
          : null,
      trend: { series: trends.tasks_completed_daily, kind: "bars" },
      tooltip:
        summary.tasks.created_in_range > 0
          ? `Completion rate: ${pct(completionRate)} · ${summary.tasks.completed} of ${summary.tasks.created_in_range}`
          : "No new tasks created.",
      onClick: () => onCardClick("tasks"),
    });

    // 5) Avg. Sessions per User
    const r = summary.avg_sessions_per_user.prev ? summary.avg_sessions_per_user.current / summary.avg_sessions_per_user.prev : 1;
    const toneG = gaugeTone(r);
    C.push({
      id: "avg",
      label: "Avg. Sessions per User",
      icon: "📈",
      color: toneG === "good" ? TK.good : toneG === "warn" ? TK.warn : TK.risk,
      valueDisplay: `${summary.avg_sessions_per_user.current}`,
      delta: { label: `${avgSessionsDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(avgSessionsDeltaPct).toFixed(1)}% vs prev`, tone: avgSessionsDeltaPct >= 0 ? "good" : "warn" },
      // gauge: ratio 0..200% mapped into 0..1 ring (clamped to 200%)
      donut: { numerator: Math.min(200, Math.round(r * 100)), denominator: 200 },
      trend: { series: trends.avg_sessions_daily, kind: "spark" },
      tooltip: `vs prev: ${(r * 100).toFixed(0)}% (current ${summary.avg_sessions_per_user.current} / prev ${summary.avg_sessions_per_user.prev})`,
      onClick: () => onCardClick("avg_sessions"),
    });

    // 6) Top Performer
    const toneTop = topShare > 0.4 ? "risk" : "good";
    C.push({
      id: "top",
      label: "Top Performer",
      icon: "🏅",
      color: toneTop === "risk" ? TK.risk : TK.good,
      valueDisplay: `${summary.top_performer.user.name} (${summary.top_performer.score})`,
      delta: { label: `${(topShare - topPrevShare) >= 0 ? "▲" : "▼"} ${Math.abs((topShare - topPrevShare) * 100).toFixed(1)} pts`, tone: (topShare - topPrevShare) >= 0 ? "good" : "warn" },
      donut: { numerator: Math.round(topShare * 100), denominator: 100 },
      trend: { series: trends.top_user_activity_daily, kind: "bars" },
      tooltip:
        topShare > 0.4
          ? `Share ${(topShare * 100).toFixed(1)}%. Over‑concentration risk.`
          : `Share ${(topShare * 100).toFixed(1)}% of team activity.`,
      onClick: () => onCardClick("top_performer"),
    });

    return C;
  }, [
    summary,
    trends,
    pctActive,
    deltaActivePts,
    pctIdle,
    deltaIdlePts,
    completionRate,
    completionPrev,
    avgSessionsDeltaPct,
    topShare,
    topPrevShare,
  ]);

  const exportCSV = () => {
    const csv = buildCSV(cards.map((c) => ({
      label: c.label,
      valueDisplay: c.valueDisplay,
      donut: c.donut,
      trend: c.trend,
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "team-kpis.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <KPIWrapper>
    <section className="wr-kpi-wrap">
      {/* header bar */}
      <div className="wr-kpi-header" style={{ borderBottom: `1px solid ${TK.border}` }}>
        <div className="wr-kpi-title">Team KPIs</div>
        <div className="wr-kpi-actions">
          <div role="group" aria-label="Global chart mode" className="wr-seg">
            <button className={`seg ${mode === "donut" ? "active" : ""}`} onClick={() => setMode("donut")} aria-pressed={mode === "donut"}>Snapshot</button>
            <button className={`seg ${mode === "trend" ? "active" : ""}`} onClick={() => setMode("trend")} aria-pressed={mode === "trend"}>Trend</button>
          </div>
          <button className="wr-btn" onClick={exportCSV} aria-label="Export KPIs as CSV">Export CSV</button>
        </div>
      </div>

      {/* grid of 6 cards (auto‑fit) */}
      <div className="wr-kpi-row" role="list">
        {cards.map((c) => (
          <KpiCard
            key={c.id}
            label={c.label}
            icon={c.icon}
            valueDisplay={c.valueDisplay}
            delta={c.delta}
            color={c.color}
            mode={mode === "donut" ? "donut" : "trend"}
            donut={c.donut}
            trend={c.trend}
            tooltip={c.tooltip}
            onClick={c.onClick}
          />
        ))}
      </div>
    </section>
    </KPIWrapper>
  );
}


export const KPIWrapper = styled.div`
  .wr-btn {
    border: 1px solid ${TK.border};
    background: ${TK.surface};
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
  .wr-btn:hover {
    border-color: ${TK.borderStrong};
  }

  .wr-kpi-wrap {
    margin: 16px 0;
    background: transparent;
  }

  .wr-kpi-header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0 12px;
    background: transparent;
  }

  .wr-kpi-title {
    font-weight: 600;
    color: ${TK.muted};
  }

  .wr-kpi-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .wr-seg {
    display: flex;
  }
  .wr-seg .seg {
    border: 1px solid ${TK.border};
    background: ${TK.surface};
    color: ${TK.muted};
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 6px 0 0 6px;
    cursor: pointer;
  }
  .wr-seg .seg + .seg {
    border-left: none;
    border-radius: 0 6px 6px 0;
  }
  .wr-seg .seg.active {
    background: ${TK.focus};
    color: ${TK.text};
  }

  /* grid */
  .wr-kpi-row {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
    padding-top: 8px;
  }
  @media (max-width: 1280px) {
    .wr-kpi-row {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 880px) {
    .wr-kpi-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 640px) {
    .wr-kpi-row {
      grid-template-columns: 1fr;
    }
  }

  /* card */
  .wr-kpi {
    display: flex;
    padding: 12px;
    min-width: 220px;
    height: 104px;
    cursor: pointer;
    transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    border: 1px solid ${TK.border};
    border-radius: ${TK.radiusCard}px;
    background: ${TK.surface};
  }
  .wr-kpi:hover {
    border-color: ${TK.borderStrong};
    box-shadow: ${TK.shadow};
  }
  .wr-kpi:focus-visible {
    outline: 2px solid ${TK.focus};
    outline-offset: 2px;
  }

  .wr-kpi-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .wr-kpi-left-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .wr-kpi-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${TK.muted};
    font-size: 14px;
    font-weight: 600;
  }

  .wr-kpi-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;
  }

  .wr-kpi-value {
    font-size: 18px;
    font-weight: 800;
    line-height: 1.1;
  }

  .wr-kpi-delta {
    margin-top: 2px;
    width: max-content;
    font-weight: 700;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 999px;
    background: ${TK.surfaceSubtle};
    color: ${TK.muted};
    border: 1px solid ${TK.border};
  }
  .wr-kpi-delta.good {
    color: ${TK.good};
  }
  .wr-kpi-delta.warn {
    color: ${TK.warn};
  }
  .wr-kpi-delta.risk {
    color: ${TK.risk};
  }

  .wr-kpi-right {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 116px;
    min-width: 116px;
  }

  .wr-tip {
    position: absolute;
    top: -8px;
    right: 0;
    transform: translateY(-100%);
    background: rgba(17, 24, 39, 0.96);
    color: #fff;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 11px;
    pointer-events: none;
    max-width: 220px;
  }
`;