"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Tokens
   ───────────────────────────────────────────────────────────── */
const T = {
  brand: "#1090D0",
  text: "#282829",
  muted: "rgba(40,40,41,0.64)",
  border: "#EFF0F6",
  bg: "#FFFFFF",
  chipBg: "#F5F7FA",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  radius: 6,
  blue: "#0077FF",
};

const DASHES = [
  { key: "seo", label: "SEO" },
  { key: "content", label: "Content" },
  { key: "campaign", label: "Campaign" },
  { key: "reporting", label: "Reporting" },
];

const DEFAULT_COLS = { user: true, role: true, proj: true, login: true, ses: true, task: true, dash: true, inact: true, sugg: true, actions: true };
const COLS = [
  { key: "user", label: "User" },
  { key: "role", label: "Role" },
  { key: "proj", label: "Projects" },
  { key: "login", label: "Last Login" },
  { key: "ses", label: "Sessions" },
  { key: "task", label: "Tasks A/C" },
  { key: "dash", label: "Dashboards Used" },
  { key: "inact", label: "Inactivity" },
  { key: "sugg", label: "Suggestions" },
  { key: "actions", label: "Actions" },
];

/* ─────────────────────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────────────────────── */
const cls = (...xs) => xs.filter(Boolean).join(" ");
const dateRel = (iso) => {
  if (!iso) return "Never";
  const n = new Date();
  const d = new Date(iso);
  const days = Math.max(0, Math.floor((n - d) / (24 * 3600 * 1000)));
  return days === 0 ? "Today" : `${days}d ago`;
};
const fmt = {
  date(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch {
      return "—";
    }
  },
};
const dl = (filename, text) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
/* heatmap-ish intensity color for dashboard badges */
const intensity = (n) => (n >= 10 ? "🔥" : n >= 3 ? "🟡" : n >= 1 ? "🟢" : "❌");

/* ─────────────────────────────────────────────────────────────
   Demo data (server would populate in prod)
   ───────────────────────────────────────────────────────────── */
const demoRows = [
  {
    user: {
      id: "u1",
      name: "Ana Costa",
      email: "ana.costa@agency.com",
      avatar: null,
    },
    roles: ["editor"],
    projects: [
      { id: "p1", name: "wranker.com" },
      { id: "p2", name: "app.w3era.com" },
    ],
    last_login_at: null, // never
    sessions: 23,
    tasks: { assigned: 5, completed: 4, overdue: 1 },
    dashboards_used: [
      { key: "seo", sessions: 7, last_access_at: "2025-08-30T10:22:00Z", has_access: true },
      { key: "content", sessions: 8, last_access_at: "2025-08-31T10:22:00Z", has_access: true },
      { key: "campaign", sessions: 8, last_access_at: "2025-08-29T10:22:00Z", has_access: true },
      { key: "reporting", sessions: 0, last_access_at: null, has_access: true },
    ],
    inactivity_days: 999, // never login
    status: "never",
    suggestions: [{ type: "remind", rationale: "No login in 30+ days" }],
  },
  {
    user: {
      id: "u2",
      name: "Aditya Chauhan",
      email: "aditya.chauhan@agency.com",
      avatar: null,
    },
    roles: ["editor"],
    projects: [
      { id: "p1", name: "wranker.com" },
      { id: "p2", name: "app.w3era.com" },
    ],
    last_login_at: null,
    sessions: 12,
    tasks: { assigned: 7, completed: 4, overdue: 0 },
    dashboards_used: [
      { key: "seo", sessions: 1, last_access_at: "2025-08-28T10:22:00Z", has_access: true },
      { key: "content", sessions: 10, last_access_at: "2025-08-31T10:22:00Z", has_access: true },
      { key: "campaign", sessions: 1, last_access_at: "2025-08-20T10:22:00Z", has_access: true },
      { key: "reporting", sessions: 1, last_access_at: "2025-08-27T10:22:00Z", has_access: true },
    ],
    inactivity_days: 999,
    status: "never",
    suggestions: [{ type: "remind", rationale: "No login in 30+ days" }],
  },
  {
    user: {
      id: "u3",
      name: "Arjun Rao",
      email: "arjun.rao@agency.com",
      avatar: null,
    },
    roles: ["viewer"],
    projects: [
      { id: "p1", name: "wranker.com" },
      { id: "p3", name: "app.w3era.com, +1" },
    ],
    last_login_at: "2025-08-07T10:22:00Z",
    sessions: 4,
    tasks: { assigned: 3, completed: 1, overdue: 0 },
    dashboards_used: [
      { key: "seo", sessions: 0, last_access_at: null, has_access: true },
      { key: "content", sessions: 0, last_access_at: null, has_access: true },
      { key: "campaign", sessions: 0, last_access_at: null, has_access: true },
      { key: "reporting", sessions: 4, last_access_at: "2025-08-30T10:22:00Z", has_access: true },
    ],
    inactivity_days: 30,
    status: "inactive",
    suggestions: [{ type: "change_role", rationale: "Viewer with low usage" }],
  },
  {
    user: {
      id: "u4",
      name: "Ethan Brown",
      email: "ethan.brown@agency.com",
      avatar: null,
    },
    roles: ["viewer", "custom:GA4Analyst"],
    projects: [{ id: "p1", name: "wranker.com" }],
    last_login_at: null,
    sessions: 11,
    tasks: { assigned: 14, completed: 13, overdue: 0 },
    dashboards_used: [
      { key: "seo", sessions: 6, last_access_at: "2025-08-31T10:22:00Z", has_access: true },
      { key: "content", sessions: 5, last_access_at: "2025-08-28T10:22:00Z", has_access: true },
      { key: "campaign", sessions: 0, last_access_at: null, has_access: true },
      { key: "reporting", sessions: 0, last_access_at: null, has_access: true },
    ],
    inactivity_days: 999,
    status: "never",
    suggestions: [],
  },
  {
    user: {
      id: "u5",
      name: "Karan Malhotra 56",
      email: "karan.malhotra@agency.com",
      avatar: null,
    },
    roles: ["viewer"],
    projects: [{ id: "p1", name: "wranker.com" }],
    last_login_at: null,
    sessions: 19,
    tasks: { assigned: 11, completed: 7, overdue: 0 },
    dashboards_used: [
      { key: "seo", sessions: 13, last_access_at: "2025-08-31T10:22:00Z", has_access: true },
      { key: "content", sessions: 0, last_access_at: null, has_access: true },
      { key: "campaign", sessions: 0, last_access_at: null, has_access: false },
      { key: "reporting", sessions: 6, last_access_at: "2025-08-30T10:22:00Z", has_access: true },
    ],
    inactivity_days: 999,
    status: "never",
    suggestions: [{ type: "upgrade", rationale: "High activity across dashboards" }],
  },
];

/* ─────────────────────────────────────────────────────────────
   Section Shell
   ───────────────────────────────────────────────────────────── */
const SectionShell = ({ title, right, children }) => {
  const hdrRef = useRef(null);
  const [hdrH, setHdrH] = useState(48);
  useEffect(() => {
    if (!hdrRef.current) return;
    const el = hdrRef.current;
    const ro = new ResizeObserver(() => setHdrH(el.offsetHeight || 48));
    ro.observe(el);
    setHdrH(el.offsetHeight || 48);
    return () => ro.disconnect();
  }, []);
  return (
    <section className="ta-sec" style={{ ["--hdrH"]: `${hdrH}px` }}>
      <header className="ta-sec__hdr" ref={hdrRef}>
        <h3>{title}</h3>
        <div className="ta-sec__right">{right}</div>
      </header>
      {children}
      <style>{`
        .ta-sec{background:${T.bg};border:1px solid ${T.border};border-radius:${T.radius}px}
        .ta-sec__hdr{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid ${T.border};position:sticky;top:0;background:${T.bg};z-index:3}
        .ta-sec__hdr h3{margin:0;font-size:16px;color:${T.text};font-weight:700}
        .ta-sec,.ta-sec *{font-family: Inter, ui-sans-serif, system-ui, -apple-system,"Segoe UI",Roboto,Arial,"Helvetica Neue",sans-serif}
        .ta-sec__right .hdr-actions{display:flex;gap:8px;align-items:center}
      `}</style>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   Export button
   ───────────────────────────────────────────────────────────── */
const ExportMenu = ({ onCsv }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="exp" ref={ref}>
      <button className="btn" onClick={() => setOpen((v) => !v)}>⬇ Export</button>
      {open && (
        <div className="menu" role="menu">
          <button onClick={() => (setOpen(false), onCsv?.())}>Export CSV</button>
        </div>
      )}
      <style>{`
        .exp{position:relative}
        .exp .btn{border:1px solid ${T.border};background:#fff;border-radius:6px;padding:6px 10px;font-weight:600;cursor:pointer}
        .exp .btn:hover{background:${T.chipBg}}
        .exp .menu{position:absolute;right:0;top:36px;background:#fff;border:1px solid ${T.border};border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.08);display:flex;flex-direction:column;min-width:148px;z-index:10}
        .exp .menu button{background:none;border:none;text-align:left;padding:8px 12px;cursor:pointer}
        .exp .menu button:hover{background:${T.chipBg}}
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Columns control (show/hide table columns)
   ───────────────────────────────────────────────────────────── */
const ColumnControl = ({ visible, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);
  const toggle = (k) => onChange({ ...visible, [k]: !visible[k] });
  const setAll = (v) => { const next = {}; Object.keys(visible).forEach(k => next[k] = v); onChange(next); };
  return (
    <div className="exp" ref={ref}>
      <button className="btn" onClick={() => setOpen(v => !v)}>🧱 Columns</button>
      {open && (
        <div className="menu colmenu" role="menu">
          <div className="menuhdr">Show / Hide Columns</div>
          {COLS.map(c => (
            <label key={c.key} className="row">
              <input type="checkbox" checked={!!visible[c.key]} onChange={() => toggle(c.key)} />
              <span>{c.label}</span>
            </label>
          ))}
          <div className="divider" />
          <div className="row actions">
            <button onClick={() => setAll(true)}>Show all</button>
            <button onClick={() => setAll(false)}>Hide all</button>
            <button onClick={() => onChange(DEFAULT_COLS)}>Reset</button>
          </div>
        </div>
      )}
      <style>{`
        .colmenu{padding:8px 8px}
        .colmenu .menuhdr{font-weight:700;padding:6px 8px;color:${T.text}}
        .colmenu .row{display:flex;align-items:center;gap:8px;padding:4px 8px}
        .colmenu .row:hover{background:${T.chipBg}}
        .colmenu .divider{height:1px;background:${T.border};margin:6px 0}
        .colmenu .actions{gap:8px}
        .colmenu .actions button{border:1px solid ${T.border};border-radius:6px;padding:4px 8px;background:#fff}
        .colmenu .actions button:hover{background:${T.chipBg}}
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Filter bar controls (local)
   ───────────────────────────────────────────────────────────── */
const Toggle = ({ value, onChange, a = "By Usage", b = "By Access" }) => (
  <div className="seg">
    <button className={value === "usage" ? "on" : ""} onClick={() => onChange("usage")}>{a}</button>
    <button className={value === "access" ? "on" : ""} onClick={() => onChange("access")}>{b}</button>
    <style>{`
      .seg{display:inline-grid;grid-auto-flow:column;border:1px solid ${T.border};border-radius:8px;overflow:hidden}
      .seg button{padding:6px 12px;background:#fff;border:none;color:${T.text};cursor:pointer;font-weight:700}
      .seg button.on{background:${T.blue};color:#fff}
      .seg button:focus{outline:2px solid ${T.blue};outline-offset:1px}
    `}</style>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   A11y chips / small UI helpers
   ───────────────────────────────────────────────────────────── */
const Chip = ({ tone, children, title, style }) => (
  <span
    className={cls("chip", tone)}
    title={title}
    style={style}
  >
    {children}
    <style>{`
      .chip{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;font-size:12px;background:${T.chipBg};color:${T.text};white-space:nowrap}
      .chip.good{color:${T.good}}
      .chip.warn{color:${T.warn}}
      .chip.bad{color:${T.danger}}
      .chip.gray{color:${T.muted}}
    `}</style>
  </span>
);

/* ─────────────────────────────────────────────────────────────
   Table‑level tooltip host (single instance)
   ───────────────────────────────────────────────────────────── */
const TooltipHost = ({ tip }) => {
  if (!tip) return null;
  // clamp to viewport
  const m = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = 220;
  const h = 96;
  const left = Math.min(vw - w - m, Math.max(m, tip.x));
  const top = Math.min(vh - h - m, Math.max(m, tip.y));
  return (
    <div className="tip" style={{ left, top, width: w }}>
      {tip.content}
      <style>{`
        .tip{position:fixed;z-index:1000;background:#111827;color:#fff;border-radius:8px;padding:8px 10px;pointer-events:none;box-shadow:0 12px 26px rgba(0,0,0,.25)}
        .tip h5{margin:0 0 4px;font-size:13px}
        .tip .muted{opacity:.85}
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Actions menu (position: fixed, rect‑anchored)
   ───────────────────────────────────────────────────────────── */
const KebabMenu = ({ anchor, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onClose?.();
    const k = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [onClose]);
  if (!anchor) return null;
  const vw = window.innerWidth;
  const menuW = 220;
  const left = Math.min(vw - menuW - 8, anchor.right + 8);
  const top = Math.max(8, anchor.top);
  return (
    <div className="menu" ref={ref} style={{ left, top }}>
      <button>View Summary</button>
      <button>Edit Access</button>
      <button>Open in Taskboard</button>
      <button className="danger">Remove</button>
      <style>{`
        .menu{position:fixed;z-index:999;background:#fff;border:1px solid ${T.border};border-radius:10px;box-shadow:0 12px 24px rgba(0,0,0,.12);display:flex;flex-direction:column;min-width:${menuW}px}
        .menu button{background:none;border:none;text-align:left;padding:10px 12px;font-size:14px;cursor:pointer}
        .menu button:hover{background:${T.chipBg}}
        .menu .danger{color:${T.danger}}
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main: User Engagement Table
   ───────────────────────────────────────────────────────────── */
export function UserEngagementTable({
  rows = demoRows,
}) {
  /* local filters */
  const [dashMode, setDashMode] = useState("usage"); // 'usage' | 'access'
  const [dashSel, setDashSel] = useState([]); // array of dashboard keys
  const [inact, setInact] = useState("all"); // active|inactive|pending|never|all
  const [taskLoad, setTaskLoad] = useState("all"); // none|low|high|all
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState([]);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_COLS); // e.g., ['admin','editor','custom:...']

  /* table‑level tooltip host & kebab menu anchor */
  const [dashTip, setDashTip] = useState(null); // {x,y,content}
  const [menuAnchor, setMenuAnchor] = useState(null);

  /* debounced search */
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  /* filter logic (AND) */
  const filtered = useMemo(() => {
    const dashFilterOn = dashSel.length > 0;
    const now = new Date();
    const rows2 = rows.filter((r) => {
      // role filter
      if (roleFilter.length) {
        const hit = r.roles.some((rk) => roleFilter.includes(rk) || roleFilter.includes(rk.split(":")[0]));
        if (!hit) return false;
      }

      // search (name/email)
      if (search) {
        const s = `${r.user.name} ${r.user.email}`.toLowerCase();
        if (!s.includes(search)) return false;
      }

      // inactivity
      if (inact !== "all") {
        if (inact === "active" && r.status !== "active") return false;
        if (inact === "inactive" && r.status !== "inactive") return false;
        if (inact === "pending" && r.status !== "pending") return false;
        if (inact === "never" && r.status !== "never") return false;
      }

      // task load
      if (taskLoad !== "all") {
        const activeTasks = r.tasks?.assigned ?? 0;
        if (taskLoad === "none" && activeTasks !== 0) return false;
        if (taskLoad === "low" && !(activeTasks >= 1 && activeTasks <= 10)) return false;
        if (taskLoad === "high" && !(activeTasks >= 11)) return false;
      }

      // dashboards filter: usage vs access
      if (dashFilterOn) {
        if (dashMode === "usage") {
          const used = r.dashboards_used.some(
            (d) => dashSel.includes(d.key) && d.sessions > 0
          );
          if (!used) return false;
        } else {
          const has = r.dashboards_used.some(
            (d) => dashSel.includes(d.key) && d.has_access
          );
          if (!has) return false;
        }
      }

      return true;
    });
    // default sort: last_login desc (Never comes after dated)
    return rows2.sort((a, b) => {
      const ad = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
      const bd = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
      return bd - ad; // desc
    });
  }, [rows, roleFilter, search, inact, taskLoad, dashMode, dashSel]);

  /* export (current filtered) */
  const exportCsv = () => {
    const header = [
      "user_id",
      "name",
      "email",
      "roles",
      "projects_count",
      "last_login",
      "sessions",
      "tasks_assigned",
      "tasks_completed",
      "inactivity_status",
      "dash_seo",
      "dash_content",
      "dash_campaign",
      "dash_reporting",
    ];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const d = (k) => r.dashboards_used.find((x) => x.key === k) || {};
      lines.push(
        [
          r.user.id,
          `"${r.user.name}"`,
          r.user.email,
          `"${r.roles.join("|")}"`,
          r.projects.length,
          r.last_login_at || "",
          r.sessions,
          r.tasks.assigned,
          r.tasks.completed,
          r.status,
          d("seo").sessions ?? 0,
          d("content").sessions ?? 0,
          d("campaign").sessions ?? 0,
          d("reporting").sessions ?? 0,
        ].join(",")
      );
    });
    dl("user_engagement.csv", lines.join("\n"));
  };

  const toggleDashSel = (k) =>
    setDashSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  return (
    <SectionShell
      title="User Engagement"
      right={<div className="hdr-actions"><ColumnControl visible={visibleCols} onChange={setVisibleCols} /><ExportMenu onCsv={exportCsv} /></div>}
    >
      {/* Filter bar (non-sticky per spec) */}
      <div className="filters">
        <div className="row">
          <div className="group">
            <label>Role</label>
            <div className="rolepills">
              {["owner", "admin", "editor", "viewer"].map((r) => (
                <button
                  key={r}
                  className={cls("pill", roleFilter.includes(r) && "on")}
                  onClick={() =>
                    setRoleFilter((s) =>
                      s.includes(r) ? s.filter((x) => x !== r) : [...s, r]
                    )
                  }
                >
                  {r[0].toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <label>Mode</label>
            <Toggle value={dashMode} onChange={setDashMode} />
          </div>

          <div className="group">
            <label>Dashboards</label>
            <div className="rolepills">
              {DASHES.map((d) => (
                <button
                  key={d.key}
                  className={cls("pill", dashSel.includes(d.key) && "on")}
                  onClick={() => toggleDashSel(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <label>Inactivity</label>
            <select value={inact} onChange={(e) => setInact(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive (≥30d)</option>
              <option value="pending">Pending</option>
              <option value="never">Never Logged In</option>
            </select>
          </div>

          <div className="group">
            <label>Task Load</label>
            <select
              value={taskLoad}
              onChange={(e) => setTaskLoad(e.target.value)}
            >
              <option value="all">All</option>
              <option value="none">None</option>
              <option value="low">Low (1–10)</option>
              <option value="high">High (11+)</option>
            </select>
          </div>

          <div className="group grow">
            <label>Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users by name or email…"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="tablewrap">
        <table className={`utbl ${Object.entries(visibleCols).filter(([k,v])=>!v).map(([k])=>`hide-${k}`).join(' ')}`}>
          <thead>
            <tr>
              <th className="col-user">👤 User</th>
              <th className="col-role">🧢 Role</th>
              <th className="col-proj">🗂 Projects</th>
              <th className="col-login">⏱ Last Login</th>
              <th className="col-ses">🔁 Sessions</th>
              <th className="col-task">📝 Tasks A/C</th>
              <th className="col-dash">📊 Dashboards Used</th>
              <th className="col-inact">⚠ Inactivity</th>
              <th className="col-sugg">💡 Suggestions</th>
              <th className="col-actions">⚙ Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.user.id}>
                {/* User */}
                <td className="col-user">
                  <div className="usercell">
                    <div className="av">{r.user.name?.[0] || "U"}</div>
                    <div>
                      <div className="name">{r.user.name}</div>
                      <div className="email">{r.user.email}</div>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="col-role">
                  <div className="stack">
                    {r.roles.map((k) => (
                      <Chip key={k} tone="gray">
                        {k.startsWith("custom:")
                          ? (
                            <>
                              {k.split(":")[1]} <span style={{opacity:.7}}>(Custom)</span>
                            </>
                          )
                          : k[0].toUpperCase() + k.slice(1)}
                      </Chip>
                    ))}
                  </div>
                </td>

                {/* Projects */}
                <td className="col-proj">
                  {r.projects.slice(0, 2).map((p, i) => (
                    <span key={p.id}>
                      {p.name}
                      {i < r.projects.slice(0, 2).length - 1 ? ", " : ""}
                    </span>
                  ))}
                  {r.projects.length > 2 && (
                    <span title={r.projects.map((p) => p.name).join(", ")}> +{r.projects.length - 2}</span>
                  )}
                </td>

                {/* Last login */}
                <td className="col-login">
                  <div className="muted">
                    {r.last_login_at ? fmt.date(r.last_login_at) : "Never"}
                    {" • "}
                    {r.last_login_at ? dateRel(r.last_login_at) : "—"}
                  </div>
                </td>

                {/* Sessions */}
                <td className="col-ses">{r.sessions}</td>

                {/* Tasks */}
                <td className="col-task">
                  {r.tasks?.assigned ?? 0} / {r.tasks?.completed ?? 0}
                </td>

                {/* Dashboards Used (tooltip host is table-level; each cell clears on leave) */}
                <td
                  className="col-dash"
                  onMouseLeave={() => setDashTip(null)}
                >
                  <div className="dashbadges">
                    {DASHES.map((d) => {
                      const m = r.dashboards_used.find((x) => x.key === d.key);
                      const n = m?.sessions ?? 0;
                      const has = m?.has_access ?? false;
                      const txt = `${d.label} ${intensity(n)} ${n}`;
                      return (
                        <button
                          key={d.key}
                          className={cls("badge", n > 0 ? "on" : has ? "has" : "off")}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDashTip({
                              x: rect.right + 8,
                              y: rect.top,
                              content: (
                                <div>
                                  <h5>{d.label}</h5>
                                  <div className="muted">Sessions: {n}</div>
                                  <div className="muted">
                                    Last access: {m?.last_access_at ? fmt.date(m.last_access_at) : "Never"}
                                  </div>
                                  <div className="muted">Access: {has ? "Yes" : "No"}</div>
                                </div>
                              ),
                            });
                          }}
                          onFocus={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDashTip({
                              x: rect.right + 8,
                              y: rect.top,
                              content: (
                                <div>
                                  <h5>{d.label}</h5>
                                  <div className="muted">Sessions: {n}</div>
                                  <div className="muted">
                                    Last access: {m?.last_access_at ? fmt.date(m.last_access_at) : "Never"}
                                  </div>
                                  <div className="muted">Access: {has ? "Yes" : "No"}</div>
                                </div>
                              ),
                            });
                          }}
                          onBlur={() => setDashTip(null)}
                        >
                          <span className="ico">{intensity(n)}</span>
                          {d.label} {n > 0 && <span className="count">{n}</span>}
                        </button>
                      );
                    })}
                  </div>
                </td>

                {/* Inactivity (wider column + nowrap chips) */}
                <td className="col-inact">
                  {r.status === "active" && <Chip tone="good">Active</Chip>}
                  {r.status === "inactive" && (
                    <Chip tone="warn" title={`Inactive — ${r.inactivity_days}d`}>
                      Inactive — {r.inactivity_days}d
                    </Chip>
                  )}
                  {r.status === "never" && <Chip tone="gray">Never Logged In</Chip>}
                  {r.status === "pending" && <Chip tone="gray">Invite Pending</Chip>}
                </td>

                {/* Suggestions */}
                <td className="col-sugg">
                  <div className="stack">
                    {r.suggestions?.map((s, i) => (
                      <Chip
                        key={i}
                        tone={s.type === "change_role" ? "warn" : s.type === "upgrade" ? "good" : "gray"}
                        title={s.rationale}
                      >
                        {s.type === "change_role" && "Change Role"}
                        {s.type === "reassign" && "Reassign"}
                        {s.type === "remind" && "Send Reminder"}
                        {s.type === "upgrade" && "Upgrade Role"}
                      </Chip>
                    ))}
                  </div>
                </td>

                {/* Actions */}
                <td className="col-actions">
                  <button
                    className="kebab"
                    aria-label={`Open actions for ${r.user.name}`}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuAnchor(rect);
                    }}
                  >
                    ⋮
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Single tooltip for the whole table */}
        <TooltipHost tip={dashTip} />
        {/* Fixed menu anchored to clicked ⋮ */}
        <KebabMenu anchor={menuAnchor} onClose={() => setMenuAnchor(null)} />
      </div>

      <style>{`
        .filters{padding:12px}
        .filters .row{display:flex;gap:12px;flex-wrap:wrap}
        .filters .group{display:flex;gap:8px;align-items:center}
        .filters .group label{font-size:12px;color:${T.muted}}
        .filters .group select,.filters .group input{
          border:1px solid ${T.border};border-radius:6px;padding:6px 10px;min-width:140px
        }
        .filters .group .rolepills{display:flex;gap:8px;flex-wrap:wrap}
        .filters .group .pill{border:1px solid ${T.border};padding:6px 10px;border-radius:999px;background:#fff;cursor:pointer}
        .filters .group .pill.on{background:${T.blue};color:#fff;border-color:${T.blue}}
        .filters .group.grow{flex:1}

        .tablewrap{overflow:auto}
        .utbl{width:100%;border-collapse:separate;border-spacing:0}
        $1var(--hdrH,48px)$2
        tbody td{padding:12px;border-bottom:1px solid ${T.border};vertical-align:middle}

        /* Column sizing — note wider Inactivity column per feedback */
        .col-user{min-width:260px}
        .col-role{min-width:160px}
        .col-proj{min-width:220px}
        .col-login{min-width:200px}
        .col-ses{min-width:100px}
        .col-task{min-width:120px}
        .col-dash{min-width:260px}
        .col-inact{min-width:220px;white-space:nowrap} /* widened + nowrap */
        .col-sugg{min-width:220px}
        .col-actions{width:64px;text-align:right}

        .usercell{display:flex;align-items:center;gap:10px}
        .usercell .av{width:32px;height:32px;border-radius:999px;background:${T.chipBg};display:grid;place-items:center;font-weight:800;color:${T.text}}
        .usercell .name{font-weight:700}
        .usercell .email{color:${T.muted};font-size:12px}

        .stack{display:flex;gap:6px;flex-wrap:wrap}

        .dashbadges{display:flex;gap:6px;flex-wrap:wrap}
        .dashbadges .badge{
          display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border-radius:999px;
          border:1px solid ${T.border};background:#fff;font-size:12px;cursor:default
        }
        .dashbadges .badge .ico{font-size:12px}
        .dashbadges .badge.on{border-color:rgba(16,185,129,.25);background:rgba(16,185,129,.08)}
        .dashbadges .badge.has{border-color:${T.border};background:${T.chipBg}}
        .dashbadges .badge.off{opacity:.6}
        .dashbadges .badge .count{font-weight:700}

        .kebab{border:1px solid ${T.border};border-radius:8px;background:#fff;width:32px;height:32px;display:grid;place-items:center;cursor:pointer}
        $1

        /* Column hide helpers */
        .utbl.hide-user th.col-user, .utbl.hide-user td.col-user { display:none }
        .utbl.hide-role th.col-role, .utbl.hide-role td.col-role { display:none }
        .utbl.hide-proj th.col-proj, .utbl.hide-proj td.col-proj { display:none }
        .utbl.hide-login th.col-login, .utbl.hide-login td.col-login { display:none }
        .utbl.hide-ses th.col-ses, .utbl.hide-ses td.col-ses { display:none }
        .utbl.hide-task th.col-task, .utbl.hide-task td.col-task { display:none }
        .utbl.hide-dash th.col-dash, .utbl.hide-dash td.col-dash { display:none }
        .utbl.hide-inact th.col-inact, .utbl.hide-inact td.col-inact { display:none }
        .utbl.hide-sugg th.col-sugg, .utbl.hide-sugg td.col-sugg { display:none }
        .utbl.hide-actions th.col-actions, .utbl.hide-actions td.col-actions { display:none }
      `}</style>
    </SectionShell>
  );
}


