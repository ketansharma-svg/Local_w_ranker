"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────
 * Tokens (shared)
 * ───────────────────────────────────────────────────────────── */
const T = {
  brand: "#1090D0",
  blue: "#0077FF",
  text: "#282829",
  muted: "rgba(40,40,41,0.64)",
  border: "#EFF0F6",
  bg: "#FFFFFF",
  chipBg: "#F5F7FA",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  radius: 6,
};

/* ─────────────────────────────────────────────────────────────
 * Section shell (title + right actions; sticky header)
 * ───────────────────────────────────────────────────────────── */
const SectionShell = ({ title, right, children, subtitle }) => {
  return (
    <section className="rb-sec">
      <header className="rb-sec__hdr">
        <div>
          <h3>{title}</h3>
          {subtitle && <div className="rb-sec__sub">{subtitle}</div>}
        </div>
        <div className="rb-sec__actions">{right}</div>
      </header>
      {children}
      <style>{`
        .rb-sec{
          background:${T.bg};
          border:1px solid ${T.border};
          border-radius:${T.radius}px;
          padding:12px;
        }
        .rb-sec__hdr{
          position:sticky; top:0; z-index:1;
          background:${T.bg};
          display:flex; align-items:center; justify-content:space-between;
          padding:4px 4px 8px;
          border-bottom:1px solid ${T.border};
        }
        .rb-sec__hdr h3{margin:0;color:${T.text};font-weight:700;font-size:16px}
        .rb-sec__sub{color:${T.muted};font-size:12px;margin-top:2px}
        .rb-sec, .rb-sec *{
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        }
      `}</style>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Small UI atoms
 * ───────────────────────────────────────────────────────────── */
const Seg = ({ options, value, onChange, "aria-label": aria }) => (
  <div className="seg" role="tablist" aria-label={aria}>
    {options.map((o) => (
      <button
        key={o.value}
        role="tab"
        aria-selected={value === o.value}
        className={value === o.value ? "on" : ""}
        onClick={() => onChange(o.value)}
        title={o.label}
      >
        {o.label}
      </button>
    ))}
    <style>{`
      .seg{display:inline-grid;grid-auto-flow:column;border:1px solid ${T.border};border-radius:8px;overflow:hidden}
      .seg button{padding:6px 10px;background:#fff;border:none;color:${T.text};font-weight:600;cursor:pointer}
      .seg button.on{background:${T.blue};color:#fff}
      .seg button:focus{outline:2px solid ${T.blue};outline-offset:1px}
    `}</style>
  </div>
);

const Select = (p) => (
  <label className="sel">
    <span>{p.label}</span>
    <select value={p.value} onChange={(e) => p.onChange(e.target.value)} aria-label={p.label}>
      {p.options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
    <style>{`
      .sel{display:inline-grid;grid-template-columns:auto auto;align-items:center;gap:6px;margin-right:8px}
      .sel span{color:${T.muted};font-size:12px}
      .sel select{border:1px solid ${T.border};border-radius:6px;padding:6px 8px;background:#fff}
      .sel select:focus{outline:2px solid ${T.blue};outline-offset:1px}
    `}</style>
  </label>
);

const ExportMenu = ({ onCsv }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="exp" ref={ref}>
      <button className="btn" onClick={() => setOpen((v) => !v)}>⬇ Export</button>
      {open && (
        <div className="menu">
          <button onClick={() => (onCsv?.("csv"), setOpen(false))}>Export CSV</button>
          <button onClick={() => (onCsv?.("xlsx"), setOpen(false))}>Export Excel</button>
        </div>
      )}
      <style>{`
        .exp{position:relative}
        .exp .btn{border:1px solid ${T.border};background:#fff;border-radius:6px;padding:6px 10px;font-weight:600;cursor:pointer}
        .exp .btn:hover{background:${T.chipBg}}
        .exp .menu{position:absolute;right:0;top:36px;background:#fff;border:1px solid ${T.border};border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.08);display:flex;flex-direction:column;min-width:160px;z-index:5}
        .exp .menu button{background:none;border:none; padding:8px 12px; text-align:left;cursor:pointer}
        .exp .menu button:hover{background:${T.chipBg}}
      `}</style>
    </div>
  );
};

const Tooltip = ({ children, x, parentW }) => {
  // clamp to parent width, render above
  const TW = 220, m = 10;
  const left = Math.max(m, Math.min((x || 0) - TW / 2, (parentW || 0) - m - TW));
  return (
    <div className="tip" style={{ left, top: -12 }}>
      {children}
      <style>{`
        .tip{position:absolute;pointer-events:none;background:#1f2937;color:#fff;border-radius:6px;padding:6px 8px;font-size:12px;z-index:10;max-width:220px;box-shadow:0 8px 18px rgba(0,0,0,.25)}
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────────── */
const dl = (filename, text) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
const fmtPct = (n) => `${(n * 100).toFixed(0)}%`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const classJoin = (...xs) => xs.filter(Boolean).join(" ");
const hashColor = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 65% 45%)`;
};

/* ─────────────────────────────────────────────────────────────
 * Charts
 * ───────────────────────────────────────────────────────────── */
const DonutMulti = ({ size = 200, thickness = 18, segments, onSliceClick }) => {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, d) => s + Math.max(0, d.value || 0), 0) || 1;
  let acc = 0;
  const [hov, setHov] = useState(null);

  return (
    <div className="donut" style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} role="img" aria-label="Role summary donut">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#E5E7EB" strokeWidth={thickness} />
        {segments.map((s, i) => {
          const len = (Math.max(0, s.value) / total) * circ;
          const offs = -acc;
          acc += len;
          return (
            <circle
              key={s.key}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={offs}
              transform={`rotate(-90 ${c} ${c})`}
              onMouseMove={(e) => {
                const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                setHov({
                  x: e.clientX - box.left,
                  label: s.label,
                  pct: len / circ,
                  s,
                });
              }}
              onMouseLeave={() => setHov(null)}
              onClick={() => onSliceClick?.(s.key)}
              style={{ cursor: "pointer" }}
            />
          );
        })}
        {/* center label */}
        <text x="50%" y="48%" textAnchor="middle" fontWeight="800" fontSize="18" fill={T.text}>
          {segments.length} roles
        </text>
        <text x="50%" y="64%" textAnchor="middle" fontSize="12" fill={T.muted}>
          click a slice to filter
        </text>
      </svg>
      {hov && (
        <Tooltip x={hov.x} parentW={size}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{hov.label}</div>
          {"users_total" in hov.s && (
            <div>Users: <b>{hov.s.users_total}</b> ({fmtPct(hov.s.users_total / (segments.reduce((s, d) => s + d.users_total, 0) || 1))})</div>
          )}
          {"users_active" in hov.s && (
            <div>Active: {hov.s.users_active} / {hov.s.users_total} ({fmtPct(hov.s.users_active / Math.max(1, hov.s.users_total))})</div>
          )}
          {"users_inactive" in hov.s && (
            <div>Inactive: {hov.s.users_inactive} / {hov.s.users_total} ({fmtPct(hov.s.users_inactive / Math.max(1, hov.s.users_total))})</div>
          )}
          {"avg_tasks_per_user" in hov.s && (
            <div>Avg tasks/user: <b>{hov.s.avg_tasks_per_user.toFixed(1)}</b></div>
          )}
          {"avg_sessions_per_user" in hov.s && (
            <div>Avg sessions/user: <b>{hov.s.avg_sessions_per_user.toFixed(1)}</b></div>
          )}
        </Tooltip>
      )}
    </div>
  );
};

const HBar = ({ data, height = 220, onBarClick }) => {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const pad = 8;
  const names = data.map((d) => d.label);
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const rowH = Math.max(26, Math.min(40, (height - pad * 2) / Math.max(1, data.length)));
  const gap = 8;

  const [hov, setHov] = useState(null);

  return (
    <div ref={ref} className="hbar" style={{ width: "100%", position: "relative" }}>
      <svg width={w} height={pad * 2 + data.length * (rowH + gap)}>
        {data.map((d, i) => {
          const x0 = 160;
          const y = pad + i * (rowH + gap);
          const barW = ((d.value || 0) / maxV) * (w - x0 - 16);
          return (
            <g key={d.key} onMouseLeave={() => setHov(null)}>
              <text x={8} y={y + rowH * 0.7} fill={T.text} fontSize="12">{d.label}</text>
              <rect
                x={x0}
                y={y}
                width={barW}
                height={rowH}
                fill={d.color}
                rx="6"
                onMouseMove={(e) => {
                  const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                  setHov({ x: e.clientX - r.left, y, d });
                }}
                onClick={() => onBarClick?.(d.key)}
                style={{ cursor: "pointer" }}
              />
              <text x={x0 + barW + 6} y={y + rowH * 0.7} fontSize="12" fill={T.muted}>
                {d.value.toFixed ? d.value.toFixed(1) : d.value}
              </text>
            </g>
          );
        })}
      </svg>
      {hov && (
        <Tooltip x={hov.x} parentW={w}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{hov.d.label}</div>
          {"users_total" in hov.d && (
            <div>Users: <b>{hov.d.users_total}</b></div>
          )}
          {"users_active" in hov.d && (
            <div>Active: {hov.d.users_active} / {hov.d.users_total} ({fmtPct(hov.d.users_active / Math.max(1, hov.d.users_total))})</div>
          )}
          {"users_inactive" in hov.d && (
            <div>Inactive: {hov.d.users_inactive} / {hov.d.users_total} ({fmtPct(hov.d.users_inactive / Math.max(1, hov.d.users_total))})</div>
          )}
          {"avg_tasks_per_user" in hov.d && (
            <div>Avg tasks/user: <b>{hov.d.avg_tasks_per_user.toFixed(1)}</b></div>
          )}
          {"avg_sessions_per_user" in hov.d && (
            <div>Avg sessions/user: <b>{hov.d.avg_sessions_per_user.toFixed(1)}</b></div>
          )}
        </Tooltip>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Legend
 * ───────────────────────────────────────────────────────────── */
const Legend = ({ items, hiddenKeys, onToggle }) => {
  return (
    <div className="legend">
      {items.map((it) => {
        const off = hiddenKeys.includes(it.key);
        return (
          <button
            key={it.key}
            className={classJoin("leg", off && "off")}
            onClick={() => onToggle(it.key)}
            title={`${off ? "Show" : "Hide"} ${it.label}`}
          >
            <span className="sw" style={{ background: it.color }} />
            {it.label}
          </button>
        );
      })}
      <style>{`
        .legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
        .leg{display:inline-flex;align-items:center;gap:6px;border:1px solid ${T.border};background:#fff;border-radius:999px;padding:4px 8px;font-size:12px;cursor:pointer}
        .leg.off{opacity:.55}
        .leg .sw{width:12px;height:12px;border-radius:999px;border:1px solid rgba(0,0,0,.06)}
        .leg:focus{outline:2px solid ${T.blue};outline-offset:1px}
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Table
 * ───────────────────────────────────────────────────────────── */
const RoleBadge = ({ label, color, custom }) => (
  <span className="rbg" title={custom ? "Custom role" : label} style={{ background: T.chipBg, borderColor: color || T.border }}>
    <span className="dot" style={{ background: color || T.text }} />
    {label}{custom ? " (Custom)" : ""}
    <style>{`
      .rbg{display:inline-flex;align-items:center;gap:6px;border:1px solid ${T.border};border-radius:999px;padding:3px 8px;font-size:12px}
      .rbg .dot{width:8px;height:8px;border-radius:999px}
    `}</style>
  </span>
);

const IntensityBadge = ({ label, v }) => {
  let ico = "❌", title = "0";
  if (v > 0 && v <= 2) { ico = "🟢"; title = "Low"; }
  else if (v >= 3 && v <= 9) { ico = "🟡"; title = "Medium"; }
  else if (v >= 10) { ico = "🔥"; title = "High"; }
  return <span title={`${label}: ${title}`}>{label} {ico}</span>;
};

const SuggestChip = ({ type, rationale, onClick }) => {
  const map = {
    change_role: { label: "Change Role", color: T.warn },
    investigate: { label: "Investigate", color: "#6366F1" },
    reassign: { label: "Reassign", color: T.danger },
    upgrade: { label: "Upgrade Role", color: T.good },
  };
  const meta = map[type] || { label: type, color: T.blue };
  return (
    <button className="sg" onClick={onClick} aria-label={`${meta.label}: ${rationale || ""}`} title={rationale}>
      {meta.label}
      <style>{`
        .sg{border:1px solid ${T.border};background:${T.chipBg};border-radius:999px;padding:4px 8px;font-size:12px;color:${meta.color};font-weight:600;cursor:pointer}
        .sg:focus{outline:2px solid ${T.blue};outline-offset:1px}
      `}</style>
    </button>
  );
};

const SortHeader = ({ label, sortKey, sort, onSort }) => {
  const dir = sort.key === sortKey ? sort.dir : null;
  return (
    <th
      scope="col"
      role="columnheader"
      aria-sort={dir ? (dir === "asc" ? "ascending" : "descending") : "none"}
      onClick={() =>
        onSort({
          key: sortKey,
          dir: sort.key === sortKey ? (sort.dir === "asc" ? "desc" : "asc") : "desc",
        })
      }
      title="Click to sort"
    >
      {label}{" "}
      {dir ? (dir === "asc" ? "▲" : "▼") : ""}
      <style>{`
        th{user-select:none;cursor:pointer;white-space:nowrap}
      `}</style>
    </th>
  );
};

/* ─────────────────────────────────────────────────────────────
 * Demo / mock API
 * ───────────────────────────────────────────────────────────── */
const mockBucketsCapacity = [
  {
    key: "owner",
    label: "Owner",
    users_total: 2,
    users_active: 2,
    users_inactive: 0,
    avg_tasks_per_user: 8.2,
    avg_sessions_per_user: 5.6,
    dashboards_avg: { seo: 0.9, content: 0.4, campaign: 0.2, reporting: 0.7 },
    color: "#111827",
  },
  {
    key: "admin",
    label: "Admin",
    users_total: 8,
    users_active: 4,
    users_inactive: 4,
    avg_tasks_per_user: 12.3,
    avg_sessions_per_user: 4.7,
    dashboards_avg: { seo: 0.8, content: 0.4, campaign: 0.2, reporting: 0.6 },
    suggestion: { type: "change_role", rationale: "50% inactive" },
    color: T.brand,
  },
  {
    key: "editor",
    label: "Editor",
    users_total: 10,
    users_active: 8,
    users_inactive: 2,
    avg_tasks_per_user: 9.1,
    avg_sessions_per_user: 6.2,
    dashboards_avg: { seo: 0.5, content: 0.6, campaign: 0.3, reporting: 0.4 },
    color: T.good,
  },
  {
    key: "viewer",
    label: "Viewer",
    users_total: 6,
    users_active: 2,
    users_inactive: 4,
    avg_tasks_per_user: 1.2,
    avg_sessions_per_user: 0.8,
    dashboards_avg: { seo: 0.3, content: 0.1, campaign: 0.0, reporting: 0.2 },
    suggestion: { type: "upgrade", rationale: "High engagement for some viewers" },
    color: "#9CA3AF",
  },
];

const mockBucketsRoleName = [
  ...mockBucketsCapacity,
  {
    key: "custom:ga4",
    label: "GA4 Analyst",
    users_total: 4,
    users_active: 3,
    users_inactive: 1,
    avg_tasks_per_user: 7.4,
    avg_sessions_per_user: 5.1,
    dashboards_avg: { seo: 0.1, content: 0.2, campaign: 0.0, reporting: 0.9 },
    color: "#0EA5E9",
  },
];

const fetchBreakdown = async ({ mode }) => {
  // Replace with GET /team-analytics/roles-breakdown?mode=...
  await new Promise((r) => setTimeout(r, 200));
  return {
    mode,
    buckets: mode === "capacity" ? mockBucketsCapacity : mockBucketsRoleName,
  };
};

/* ─────────────────────────────────────────────────────────────
 * Role Utilization Breakdown (main)
 * ───────────────────────────────────────────────────────────── */
export function RoleUtilizationBreakdown({
  onDrill = (what) => console.log("drill →", what),
}) {
  const [mode, setMode] = useState("capacity"); // capacity | role_name
  const [metric, setMetric] = useState("users"); // users | active_share | inactive_share | avg_tasks | avg_sessions
  const [view, setView] = useState("donut"); // donut | bar
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchBreakdown({ mode }).then((res) => {
      if (!alive) return;
      setBuckets(res.buckets || []);
      setLoading(false);
      if (res.buckets && res.buckets.length > 8 && view === "donut") {
        setView("bar"); // readability
      }
    });
    return () => (alive = false);
  }, [mode]);

  const hiddenKeysState = useState([]);
  const [hidden, setHidden] = hiddenKeysState;
  const toggleLegend = (k) =>
    setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]));

  const visibleBuckets = buckets.filter((b) => !hidden.includes(b.key) && b.users_total > 0);

  // map metric to value
  const valueFor = (b) => {
    switch (metric) {
      case "users":
        return b.users_total;
      case "active_share":
        return b.users_active; // aggregate by count of active (donut/ bar share)
      case "inactive_share":
        return b.users_inactive;
      case "avg_tasks":
        return b.avg_tasks_per_user;
      case "avg_sessions":
        return b.avg_sessions_per_user;
      default:
        return b.users_total;
    }
  };

  const segments = visibleBuckets.map((b) => ({
    key: b.key,
    label: b.label,
    value: valueFor(b),
    color: b.color || (mode === "role_name" ? hashColor(b.label) : T.blue),
    ...b,
  }));

  const legendItems = (buckets || []).map((b) => ({
    key: b.key,
    label: b.label,
    color: b.color || (mode === "role_name" ? hashColor(b.label) : T.blue),
  }));

  const onSliceClick = (key) => onDrill({ type: "filter_role", key, mode });

  /* Table sorting */
  const [sort, setSort] = useState({ key: "inactive_pct", dir: "desc" });
  const sortedRows = useMemo(() => {
    const rows = [...buckets].map((b) => ({
      ...b,
      inactive_pct: b.users_total ? b.users_inactive / b.users_total : 0,
      dashboards_count_avg:
        ["seo", "content", "campaign", "reporting"].reduce(
          (s, k) => s + (b.dashboards_avg?.[k] > 0 ? 1 : 0),
          0
        ),
    }));
    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      // secondary by users_total
      if (a.users_total < b.users_total) return 1;
      if (a.users_total > b.users_total) return -1;
      return 0;
    });
    return rows;
  }, [buckets, sort]);

  /* Export */
  const exportCsv = (fmt) => {
    const header = [
      "mode",
      "bucket_key",
      "label",
      "users_total",
      "users_active",
      "users_inactive",
      "avg_tasks_per_user",
      "avg_sessions_per_user",
      "seo_avg",
      "content_avg",
      "campaign_avg",
      "reporting_avg",
    ];
    const rows = (buckets || []).map((b) => [
      mode,
      b.key,
      `"${b.label}"`,
      b.users_total,
      b.users_active,
      b.users_inactive,
      b.avg_tasks_per_user.toFixed(2),
      b.avg_sessions_per_user.toFixed(2),
      b.dashboards_avg?.seo ?? 0,
      b.dashboards_avg?.content ?? 0,
      b.dashboards_avg?.campaign ?? 0,
      b.dashboards_avg?.reporting ?? 0,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    dl(`roles_breakdown_${mode}.${fmt === "xlsx" ? "csv" : "csv"}`, csv);
  };

  return (
    <SectionShell
      title="Role Utilization Breakdown"
      subtitle={mode === "capacity" ? "Users per capability (filtered scope)" : "Users per role name (including Custom)"}
      right={
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Select
            label="Group by"
            value={mode}
            onChange={setMode}
            options={[
              { value: "capacity", label: "Capacity" },
              { value: "role_name", label: "Role Name" },
            ]}
          />
          <Select
            label="Metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "users", label: "Users (Total)" },
              { value: "active_share", label: "Active share" },
              { value: "inactive_share", label: "Inactive share" },
              { value: "avg_tasks", label: "Avg tasks/user" },
              { value: "avg_sessions", label: "Avg sessions/user" },
            ]}
          />
          <Seg
            aria-label="View"
            options={[
              { value: "donut", label: "Donut" },
              { value: "bar", label: "Bar" },
            ]}
            value={view}
            onChange={setView}
          />
          <ExportMenu onCsv={exportCsv} />
        </div>
      }
    >
      {/* Chart area */}
      <div className="chartWrap">
        {loading ? (
          <div className="skel" aria-busy="true">Loading…</div>
        ) : segments.length === 0 ? (
          <div className="empty">Not enough data.</div>
        ) : view === "donut" ? (
          <DonutMulti segments={segments} onSliceClick={onSliceClick} />
        ) : (
          <HBar data={segments} onBarClick={onSliceClick} />
        )}
        <Legend items={legendItems} hiddenKeys={hidden} onToggle={toggleLegend} />
      </div>

      {/* Table */}
      <div className="tableWrap" role="region" aria-label="Role utilization table">
        <table>
          <thead>
            <tr>
              <SortHeader label="Role" sortKey="label" sort={sort} onSort={setSort} />
              <SortHeader label="# Users" sortKey="users_total" sort={sort} onSort={setSort} />
              <SortHeader label="# Active" sortKey="users_active" sort={sort} onSort={setSort} />
              <SortHeader label="# Inactive" sortKey="users_inactive" sort={sort} onSort={setSort} />
              <SortHeader label="% Inactive" sortKey="inactive_pct" sort={sort} onSort={setSort} />
              <SortHeader label="Avg Tasks/User" sortKey="avg_tasks_per_user" sort={sort} onSort={setSort} />
              <SortHeader label="Avg Sessions/User" sortKey="avg_sessions_per_user" sort={sort} onSort={setSort} />
              <th scope="col">Dashboards Used (avg)</th>
              <th scope="col">Suggested Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr><td colSpan={9} className="muted">No roles match your filters.</td></tr>
            )}
            {sortedRows.map((b) => (
              <tr key={b.key} onClick={() => onDrill({ type: "filter_role", key: b.key, mode })} title="Click to filter users by this role">
                <td>
                  <RoleBadge
                    label={b.label}
                    color={b.color || (mode === "role_name" ? hashColor(b.label) : undefined)}
                    custom={String(b.key).startsWith("custom:")}
                  />
                </td>
                <td>{b.users_total}</td>
                <td>{b.users_active}</td>
                <td>{b.users_inactive}</td>
                <td>
                  {fmtPct((b.users_inactive || 0) / Math.max(1, b.users_total))}
                </td>
                <td>{b.avg_tasks_per_user.toFixed(1)}</td>
                <td>{b.avg_sessions_per_user.toFixed(1)}</td>
                <td className="dashAvg">
                  <div className="badges">
                    <IntensityBadge label="SEO" v={Math.round((b.dashboards_avg?.seo || 0) * 12)} />
                    <IntensityBadge label="Content" v={Math.round((b.dashboards_avg?.content || 0) * 12)} />
                    <IntensityBadge label="Campaign" v={Math.round((b.dashboards_avg?.campaign || 0) * 12)} />
                    <IntensityBadge label="Reporting" v={Math.round((b.dashboards_avg?.reporting || 0) * 12)} />
                  </div>
                </td>
                <td>
                  {b.suggestion ? (
                    <SuggestChip
                      type={b.suggestion.type}
                      rationale={b.suggestion.rationale}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDrill({ type: "suggestion", bucket_key: b.key, suggestion: b.suggestion.type });
                      }}
                    />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optional inline recommendations (derived from suggestion flags) */}
      {buckets.some((b) => b.suggestion) && (
        <div className="inlineRecs">
          {buckets
            .filter((b) => b.suggestion)
            .slice(0, 4)
            .map((b) => (
              <div key={b.key} className="rec">
                <div className="rec__hd">
                  <b>
                    {b.suggestion.type === "change_role" && "Inactive Admins detected"}
                    {b.suggestion.type === "upgrade" && "High‑engagement Viewers"}
                    {b.suggestion.type === "reassign" && "Reassign tasks"}
                    {b.suggestion.type === "investigate" && "Investigate usage"}
                  </b>
                  <span className="muted"> • {b.label}</span>
                </div>
                <div className="rec__body">{b.suggestion.rationale}</div>
                <div className="rec__ctas">
                  <SuggestChip
                    type={b.suggestion.type}
                    rationale={b.suggestion.rationale}
                    onClick={() => onDrill({ type: "suggestion", bucket_key: b.key, suggestion: b.suggestion.type })}
                  />
                  <button className="link" onClick={() => onDrill({ type: "filter_role", key: b.key, mode })}>
                    Open Table (filtered) →
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <style>{`
        .chartWrap{
          display:grid;grid-template-columns: 1fr;gap:8px;justify-items:center;margin-top:10px;margin-bottom:8px
        }
        .skel{width:100%;height:220px;background:linear-gradient(90deg,#fafbfc,#f1f5f9,#fafbfc);background-size:200% 100%;animation:sh 1.4s infinite}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .empty{color:${T.muted};padding:24px}
        .tableWrap{margin-top:8px;overflow:auto;border-top:1px solid ${T.border}}
        table{width:100%;border-collapse:collapse}
        thead th{position:sticky;top:0;background:#fff;border-bottom:1px solid ${T.border};padding:10px;text-align:left}
        tbody td{border-bottom:1px solid ${T.border};padding:10px;vertical-align:middle}
        tbody tr{cursor:pointer}
        tbody tr:hover{background:#fafbfd}
        .muted{color:${T.muted}}
        .dashAvg .badges{display:flex;gap:8px;flex-wrap:wrap}
        .inlineRecs{display:grid;grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap:12px; margin-top:12px}
        .rec{border:1px solid ${T.border};border-radius:${T.radius}px;padding:10px;background:#fff}
        .rec__hd{margin-bottom:6px}
        .rec__body{color:${T.muted};margin-bottom:8px}
        .rec__ctas{display:flex;gap:8px;align-items:center}
        .link{border:none;background:none;color:${T.blue};font-weight:700;cursor:pointer}
        .link:focus{outline:2px solid ${T.blue};outline-offset:1px}
      `}</style>
    </SectionShell>
  );
}

