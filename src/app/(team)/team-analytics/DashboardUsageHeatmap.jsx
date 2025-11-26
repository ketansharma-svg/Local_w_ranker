"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Team Analytics – Section 4: Dashboard Usage Heatmap (v2.3)
 * Single-file, no dependencies. Mock API included for demo.
 *
 * Drop into your project and render: <TeamAnalyticsHeatmap />
 */

// ───────────────────────────────────────────────────────────────────────────────
// Tokens (kept local to avoid collisions)
// ───────────────────────────────────────────────────────────────────────────────
const TOKENS = {
  brand: "#1090D0",
  text: "#282829",
  muted: "rgba(40,40,41,0.64)",
  border: "#EFF0F6",
  panel: "#FFFFFF",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
  hatch: "#E5E7EB",
  focus: "#1090D0",
};

// Dashboard metadata
const DASHBOARDS = /** @type {const} */ ([
  { key: "seo", label: "SEO" },
  { key: "content", label: "Content" },
  { key: "campaign", label: "Campaign" }, // TaskBoard/Campaign
  { key: "reporting", label: "Reporting" },
]);

const ROLE_BADGES = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

// ───────────────────────────────────────────────────────────────────────────────
// Mock API (replace with your real /team-analytics/heatmap endpoint)
// ───────────────────────────────────────────────────────────────────────────────
/**
 * Returns demo heatmap data that respects requested dashboards.
 * @param {{dashboards: string[], roles: string[]|null, level: 'all'|'active'|'idle'}} params
 */
function fetchHeatmapMock(params) {
  const thresholds = { low_max: 2, med_min: 3, med_max: 9, high_min: 10 };

  // make deterministic for the session
  const seededRand = mulberry32(12345678);

  /** @type {any[]} */
  const rows = [];
  const firstNames = [
    "Sara",
    "Ayaan",
    "Noah",
    "Maya",
    "Vikash",
    "Ana",
    "Michael",
    "Priya",
    "Liam",
    "Ava",
    "Ishaan",
    "Meera",
    "John",
    "Lauren",
    "Ravi",
    "Elena",
    "Arjun",
    "Nina",
    "Ethan",
    "Olivia",
  ];
  const lastNames = ["Mehta", "Bharia", "Singh", "Patel", "Shah", "Khan", "Cruz", "Verma", "Liu", "Kim"];

  const usersCount = 24;
  for (let i = 0; i < usersCount; i++) {
    const name =
      firstNames[i % firstNames.length] + " " + lastNames[(i * 3) % lastNames.length];
    const id = `u_${i + 1}`;
    const email = `${name.toLowerCase().replace(/\s+/g, ".") }@agency.com`;
    const primaryRole = i % 9 === 0 ? "admin" : i % 3 === 0 ? "viewer" : "editor";

    // role per dashboard
    const rolesByDash = {
      seo: i % 5 === 0 ? "admin" : primaryRole,
      content: i % 7 === 0 ? "viewer" : primaryRole,
      campaign: i % 4 === 0 ? null : primaryRole,
      reporting: "viewer",
    };

    // cells (sessions + access)
    const cells = {};
    for (const d of DASHBOARDS) {
      const inPlan = true;
      const hasAccess =
        rolesByDash[d.key] !== null && (d.key !== "campaign" || i % 4 !== 0);
      // sessions by bucket to reflect variety
      let sessions = 0;
      if (hasAccess) {
        const r = seededRand();
        if (r < 0.25) sessions = 0;
        else if (r < 0.55) sessions = 1 + Math.floor(seededRand() * thresholds.low_max);
        else if (r < 0.85)
          sessions =
            thresholds.med_min +
            Math.floor(seededRand() * (thresholds.med_max - thresholds.med_min + 1));
        else
          sessions = thresholds.high_min + Math.floor(seededRand() * 12);
      }
      const last_access_at =
        sessions > 0 ? new Date(Date.now() - seededRand() * 1000 * 60 * 60 * 24 * 12).toISOString() : null;
      cells[d.key] = { sessions, has_access: !!hasAccess, last_access_at };
    }

    rows.push({
      user: {
        id,
        name,
        email,
        avatar: null,
        roles: [primaryRole],
        roles_by_dashboard: rolesByDash,
      },
      cells,
    });
  }

  // filter by activity level (computed over selected dashboards)
  const selectedDash = params.dashboards;
  const filtered = rows.filter((row) => {
    const sum = selectedDash.reduce((acc, dk) => acc + (row.cells[dk]?.sessions || 0), 0);
    const hasAnyAccess = selectedDash.some((dk) => row.cells[dk]?.has_access);
    if (params.level === "active") return sum > 0;
    if (params.level === "idle") return hasAnyAccess && sum === 0;
    return true;
  });

  return Promise.resolve({
    dashboards: DASHBOARDS.map((d) => d.key),
    thresholds,
    rows: filtered,
  });
}

// deterministic psuedo-random
function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// CSV export helper
// ───────────────────────────────────────────────────────────────────────────────
function downloadCsv(filename, rows, metaHeader) {
  const hdr = `# Team Analytics – Heatmap Export\n# ${metaHeader}\n`;
  const csv =
    hdr +
    rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ───────────────────────────────────────────────────────────────────────────────
// Utilities
// ───────────────────────────────────────────────────────────────────────────────
/** @param {{sessions:number, has_access:boolean}} cell @param {{low_max:number,med_min:number,med_max:number,high_min:number}} th */
function cellBucket(cell, th) {
  if (!cell.has_access) return "noaccess";
  const n = cell.sessions;
  if (n === 0) return "mismatch"; // access but 0 usage
  if (n <= th.low_max) return "low";
  if (n >= th.med_min && n <= th.med_max) return "med";
  if (n >= th.high_min) return "high";
  return "low";
}
function bucketColor(bucket) {
  switch (bucket) {
    case "high":
      return "#2FB6A6"; // teal-ish for high
    case "med":
      return "#F59E0B"; // amber
    case "low":
      return "#84CC16"; // greenish
    case "mismatch":
      return "#FFFFFF"; // white fill; we add border/dot
    case "noaccess":
      return "#F3F4F6"; // light gray
    default:
      return "#EEE";
  }
}

function formatDate(iso) {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ───────────────────────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────────────────────

export default function TeamAnalyticsHeatmap() {
  // local filter state
  const [selectedDashboards, setSelectedDashboards] = useState(
    DASHBOARDS.map((d) => d.key)
  );
  const [roleFilter, setRoleFilter] = useState(["admin", "editor", "viewer"]); // show all by default
  const [level, setLevel] = useState("all"); // 'all' | 'active' | 'idle'
  const [showNumbers, setShowNumbers] = useState(true);
  const [highlightUnder, setHighlightUnder] = useState(true);

  // sorting
  const [sort, setSort] = useState({ by: "user", dir: "desc", key: "user" }); // key for column sort

  // data
  const [data, setData] = useState({ thresholds: { low_max: 2, med_min: 3, med_max: 9, high_min: 10 }, rows: [] });

  // fetch mock data for demo
  useEffect(() => {
    fetchHeatmapMock({
      dashboards: selectedDashboards,
      roles: roleFilter,
      level,
    }).then((res) => {
      setData({ thresholds: res.thresholds, rows: res.rows });
    });
  }, [selectedDashboards, roleFilter, level]);

  // filtered rows (by roles)
  const rowsFiltered = useMemo(() => {
    if (!roleFilter?.length) return data.rows;
    return data.rows.filter((r) => {
      const primary = r.user.roles?.[0];
      // include if any of user's roles are in filter; treat custom roles as "custom"
      if (primary && roleFilter.includes(primary)) return true;
      if (!primary && roleFilter.includes("custom")) return true;
      return false;
    });
  }, [data.rows, roleFilter]);

  // sorting logic
  const rowsSorted = useMemo(() => {
    const rows = [...rowsFiltered];
    if (sort.by === "user") {
      rows.sort((a, b) => {
        const statsA = aggForUser(a, selectedDashboards);
        const statsB = aggForUser(b, selectedDashboards);
        const cmpUsed = statsB.usedCount - statsA.usedCount;
        if (cmpUsed !== 0) return sort.dir === "desc" ? cmpUsed : -cmpUsed;
        const cmpTotal = statsB.totalSessions - statsA.totalSessions;
        return sort.dir === "desc" ? cmpTotal : -cmpTotal;
      });
    } else {
      // sort by a dashboard column key
      const dk = sort.key;
      rows.sort((a, b) => {
        const na = a.cells[dk]?.sessions || 0;
        const nb = b.cells[dk]?.sessions || 0;
        const d = nb - na;
        return sort.dir === "desc" ? d : -d;
      });
    }
    return rows;
  }, [rowsFiltered, selectedDashboards, sort]);

  // helpers
  function aggForUser(row, dkeys) {
    let usedCount = 0;
    let totalSessions = 0;
    for (const dk of dkeys) {
      const c = row.cells[dk];
      if (!c) continue;
      if (c.sessions > 0) usedCount++;
      totalSessions += c.sessions;
    }
    return { usedCount, totalSessions };
  }

  // export visible
  function onExport(format = "csv") {
    const headerMeta =
      `Dashboards=${selectedDashboards.join("|")} | Roles=${roleFilter.join("|")} | Level=${level} | Generated=${new Date().toISOString()}`;

    const table = [
      [
        "user_id",
        "name",
        "email",
        "primary_role",
        "dashboards_used_total",
        ...selectedDashboards.flatMap((dk) => [
          `${dk}_sessions`,
          `${dk}_has_access`,
          `${dk}_last_access_at`,
        ]),
      ],
    ];

    for (const row of rowsSorted) {
      const { usedCount } = aggForUser(row, selectedDashboards);
      const base = [
        row.user.id,
        row.user.name,
        row.user.email,
        row.user.roles?.[0] || "custom",
        usedCount,
      ];
      for (const dk of selectedDashboards) {
        const c = row.cells[dk] || { sessions: 0, has_access: false, last_access_at: null };
        base.push(c.sessions, c.has_access ? "yes" : "no", c.last_access_at || "");
      }
      table.push(base);
    }

    if (format === "csv") {
      downloadCsv("team-analytics-heatmap.csv", table, headerMeta);
    }
  }

  // keyboard grid navigation
  const gridRef = useRef(null);
  function handleCellKeyDown(e) {
    const target = e.currentTarget;
    const row = Number(target.getAttribute("data-ri"));
    const col = Number(target.getAttribute("data-ci"));
    const cells = gridRef.current?.querySelectorAll('[data-cell="1"]');
    if (!cells) return;

    function focusCell(r, c) {
      const next = gridRef.current?.querySelector(
        `[data-cell="1"][data-ri="${r}"][data-ci="${c}"]`
      );
      next && next.focus();
    }

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusCell(row, col + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusCell(row, col - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        focusCell(row + 1, col);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusCell(row - 1, col);
        break;
      case "Enter":
        // mock drawer open
        const u = rowsSorted[row]?.user;
        const dk = selectedDashboards[col - 1];
        alert(`Open User Summary (mock)\nUser: ${u?.name}\nDashboard: ${labelFor(dk)}`);
        break;
      default:
        break;
    }
  }

  // sorting handlers
  function toggleSortUser() {
    setSort((s) =>
      s.by === "user"
        ? { ...s, dir: s.dir === "desc" ? "asc" : "desc" }
        : { by: "user", dir: "desc", key: "user" }
    );
  }
  function toggleSortByDash(dk) {
    setSort((s) =>
      s.by === "column" && s.key === dk
        ? { by: "column", key: dk, dir: s.dir === "desc" ? "asc" : "desc" }
        : { by: "column", key: dk, dir: "desc" }
    );
  }

  // render helpers
  const selectedCols = DASHBOARDS.filter((d) => selectedDashboards.includes(d.key));

  return (
    <div style={styles.card}>

      {/* Header */}
      <div style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <span style={styles.title}>Dashboard Usage Heatmap</span>
          <span style={styles.subtitle}>Sessions per user & dashboard (filtered range)</span>
        </div>

        <div style={styles.controls}>
          {/* Dashboards multi-select as pills */}
          <div style={styles.controlGroup} aria-label="Dashboards filter">
            {DASHBOARDS.map((d) => {
              const on = selectedDashboards.includes(d.key);
              return (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSelectedDashboards((prev) =>
                      on ? prev.filter((k) => k !== d.key) : [...prev, d.key]
                    )
                  }
                  style={{
                    ...styles.pill,
                    ...(on ? styles.pillOn : styles.pillOff),
                  }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Role filter */}
          <div style={styles.controlGroup} aria-label="Roles filter">
            {["admin", "editor", "viewer"].map((r) => {
              const on = roleFilter.includes(r);
              return (
                <label key={r} style={styles.chkLabel}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setRoleFilter((prev) =>
                        on ? prev.filter((x) => x !== r) : [...prev, r]
                      )
                    }
                  />
                  <span style={{ marginLeft: 6 }}>{ROLE_BADGES[r]}</span>
                </label>
              );
            })}
          </div>

          {/* Activity level */}
          <div style={styles.controlGroup}>
            {[
              { k: "all", label: "All" },
              { k: "active", label: "Only Active" },
              { k: "idle", label: "Only Idle" },
            ].map((opt) => (
              <button
                key={opt.k}
                type="button"
                onClick={() => setLevel(opt.k)}
                aria-pressed={level === opt.k}
                style={{
                  ...styles.segment,
                  ...(level === opt.k ? styles.segmentOn : styles.segmentOff),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* toggles */}
          <div style={styles.controlGroup}>
            <label style={styles.chkLabel}>
              <input
                type="checkbox"
                checked={showNumbers}
                onChange={() => setShowNumbers((v) => !v)}
              />
              <span style={{ marginLeft: 6 }}>Show Numbers</span>
            </label>
            <label style={{ ...styles.chkLabel, marginLeft: 12 }}>
              <input
                type="checkbox"
                checked={highlightUnder}
                onChange={() => setHighlightUnder((v) => !v)}
              />
              <span style={{ marginLeft: 6 }}>Highlight Underutilized</span>
            </label>
          </div>

          {/* Export */}
          <div style={styles.controlGroup}>
            <button type="button" style={styles.exportBtn} onClick={() => onExport("csv")}>
              ⬇ Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={styles.legendRow}>
        <span style={styles.legendLabel}>Legend:</span>
        <LegendSwatch color={bucketColor("high")} label="🔥 10+" />
        <LegendSwatch color={bucketColor("med")} label="🟡 3–9" />
        <LegendSwatch color={bucketColor("low")} label="🟢 1–2" />
        <LegendSwatch color={bucketColor("mismatch")} label="❌ 0 (has access)" hatch="mismatch" />
        <LegendSwatch color={bucketColor("noaccess")} label="– No Access" hatch="noaccess" />
      </div>

      {/* Grid */}
      <div style={styles.gridWrap} ref={gridRef} role="table" aria-label="Dashboard usage heatmap table">
        {/* Header row */}
        <div role="row" style={{ ...styles.row, position: "sticky", top: 0, zIndex: 5, background: TOKENS.panel, borderBottom: `1px solid ${TOKENS.border}` }}>
          {/* Frozen user header */}
          <div
            role="columnheader"
            style={{
              ...styles.userCell,
              ...styles.headerCell,
              position: "sticky",
              left: 0,
              zIndex: 6,
              background: TOKENS.panel,
            }}
            onClick={toggleSortUser}
            aria-sort={sort.by === "user" ? (sort.dir === "desc" ? "descending" : "ascending") : "none"}
            title="Sort by dashboards used, then total sessions"
          >
            User {sort.by === "user" ? (sort.dir === "desc" ? "▼" : "▲") : ""}
          </div>

          {/* Dynamic dashboard columns */}
          {selectedCols.map((d) => (
            <div
              key={d.key}
              role="columnheader"
              style={{ ...styles.headerCell, ...styles.colHead }}
              onClick={() => toggleSortByDash(d.key)}
              aria-sort={
                sort.by === "column" && sort.key === d.key
                  ? sort.dir === "desc"
                    ? "descending"
                    : "ascending"
                  : "none"
              }
              title={`Sort by ${d.label} sessions`}
            >
              {d.label}{" "}
              {sort.by === "column" && sort.key === d.key ? (sort.dir === "desc" ? "▼" : "▲") : ""}
            </div>
          ))}
        </div>

        {/* Body rows */}
        {rowsSorted.map((row, ri) => {
          const user = row.user;
          const userAgg = aggForUser(row, selectedDashboards);
          const isRowUnder =
            highlightUnder &&
            selectedDashboards.some((dk) => row.cells[dk]?.has_access) &&
            selectedDashboards.every((dk) => (row.cells[dk]?.sessions || 0) === 0);

          return (
            <div role="row" key={user.id} style={{ ...styles.row, background: TOKENS.panel }}>
              {/* Frozen user cell */}
              <div
                role="cell"
                style={{
                  ...styles.userCell,
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  background: TOKENS.panel,
                  borderRight: `1px solid ${TOKENS.border}`,
                  ...(isRowUnder ? { boxShadow: `inset 0 0 0 2px ${TOKENS.warn}40` } : null),
                }}
                title={`${user.name} • ${user.email}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={styles.avatar}>{user.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: TOKENS.text }}>{user.name}</div>
                    <div style={{ color: TOKENS.muted, fontSize: 12 }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ marginLeft: 40, color: TOKENS.muted, fontSize: 12 }}>
                  Used: {userAgg.usedCount} • Sessions: {userAgg.totalSessions}
                </div>
              </div>

              {/* Data cells */}
              {selectedCols.map((d, ci) => {
                const c = row.cells[d.key] || { sessions: 0, has_access: false, last_access_at: null };
                const bucket = cellBucket(c, data.thresholds);
                const bg = bucketColor(bucket);

                const mismatch =
                  bucket === "mismatch" && c.has_access && c.sessions === 0;

                const aria = `${d.label} — ${user.name}: ${c.sessions} session${
                  c.sessions === 1 ? "" : "s"
                }; last access ${formatDate(c.last_access_at)}; Access: ${
                  c.has_access ? "Yes" : "No"
                }; Role: ${user.roles_by_dashboard?.[d.key] || "—"}`;

                const title = `${d.label} — ${user.name}
Sessions: ${c.sessions}
Last access: ${formatDate(c.last_access_at)}
Access: ${c.has_access ? "Yes" : "No"}
Role on ${d.label}: ${user.roles_by_dashboard?.[d.key] || "—"}`;

                const showHatch = !c.has_access;
                const showAmberBorder = highlightUnder && mismatch;

                return (
                  <div
                    key={d.key}
                    role="cell"
                    data-cell="1"
                    data-ri={ri}
                    data-ci={ci + 1} // +1 because first column is user
                    tabIndex={0}
                    onKeyDown={handleCellKeyDown}
                    aria-label={aria}
                    title={title}
                    onClick={() =>
                      alert(`Open User Summary (mock)\nUser: ${user.name}\nDashboard: ${d.label}`)
                    }
                    style={{
                      ...styles.dataCell,
                      background: bg,
                      ...(showAmberBorder ? { boxShadow: `inset 0 0 0 2px ${TOKENS.warn}` } : null),
                      ...(showHatch
                        ? {
                            background:
                              `linear-gradient(135deg, ${TOKENS.hatch} 25%, transparent 25%) 0 0/8px 8px, ` +
                              `linear-gradient(135deg, transparent 75%, ${TOKENS.hatch} 75%) 0 0/8px 8px`,
                          }
                        : null),
                      borderStyle: mismatch ? "dotted" : "solid",
                      borderColor: mismatch ? TOKENS.danger : TOKENS.border,
                    }}
                  >
                    {/* red corner dot when mismatch */}
                    {mismatch && (
                      <div style={styles.cornerDot} aria-hidden="true" />
                    )}
                    <div style={styles.cellInner}>
                      {showNumbers ? (
                        <span style={styles.cellNumber}>
                          {c.has_access ? c.sessions : "–"}
                        </span>
                      ) : (
                        <span aria-hidden="true" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Empty view */}
      {rowsSorted.length === 0 && (
        <div style={styles.empty}>
          No dashboard usage detected in the selected date range.
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Small pieces
// ───────────────────────────────────────────────────────────────────────────────

function LegendSwatch({ color, label, hatch }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", marginRight: 12 }}>
      <div
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          background: hatch === "noaccess"
            ? `linear-gradient(135deg, ${TOKENS.hatch} 25%, transparent 25%) 0 0/8px 8px, linear-gradient(135deg, transparent 75%, ${TOKENS.hatch} 75%) 0 0/8px 8px`
            : color,
          border: `1px solid ${TOKENS.border}`,
          marginRight: 6,
          position: "relative",
        }}
      >
        {hatch === "mismatch" && (
          <div
            style={{
              position: "absolute",
              top: 1,
              right: 1,
              width: 6,
              height: 6,
              borderRadius: 6,
              background: TOKENS.danger,
            }}
          />
        )}
      </div>
      <span style={{ fontSize: 12, color: TOKENS.text }}>{label}</span>
    </div>
  );
}

function labelFor(key) {
  return DASHBOARDS.find((d) => d.key === key)?.label || key;
}

// ───────────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────────
const styles = {
  card: {
    background: TOKENS.panel,
    border: `1px solid ${TOKENS.border}`,
    borderRadius: 6,
    padding: 16,
    color: TOKENS.text,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    position: "sticky",
    top: 0,
    background: TOKENS.panel,
    zIndex: 10,
  },
  titleWrap: { display: "flex", flexDirection: "column" },
  title: { fontWeight: 700, fontSize: 16, color: TOKENS.text },
  subtitle: { fontSize: 12, color: TOKENS.muted },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-end",
  },
  controlGroup: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pill: {
    padding: "6px 10px",
    borderRadius: 16,
    border: `1px solid ${TOKENS.border}`,
    fontSize: 12,
    cursor: "pointer",
    background: "#fff",
  },
  pillOn: { background: "#D2EFFF", borderColor: "#B6E1FF", color: TOKENS.brand },
  pillOff: { background: "#fff", color: TOKENS.text },
  chkLabel: { fontSize: 12, color: TOKENS.text, display: "inline-flex", alignItems: "center" },
  segment: {
    padding: "6px 10px",
    fontSize: 12,
    borderRadius: 16,
    border: `1px solid ${TOKENS.border}`,
    cursor: "pointer",
    background: "#fff",
  },
  segmentOn: { color: "#fff", background: TOKENS.brand, borderColor: TOKENS.brand },
  segmentOff: { color: TOKENS.text },
  exportBtn: {
    padding: "6px 10px",
    fontSize: 12,
    borderRadius: 6,
    border: `1px solid ${TOKENS.border}`,
    background: "#fff",
    cursor: "pointer",
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  legendLabel: { fontSize: 12, color: TOKENS.muted, marginRight: 6 },
  gridWrap: {
    overflow: "auto",
    border: `1px solid ${TOKENS.border}`,
    borderRadius: 6,
    maxHeight: 480,
  },
  row: {
    display: "grid",
    gridTemplateColumns: `minmax(280px, 420px) repeat(${DASHBOARDS.length}, 120px)`,
    minHeight: 56,
  },
  headerCell: {
    fontWeight: 600,
    fontSize: 13,
    color: TOKENS.text,
    padding: "10px 12px",
    cursor: "pointer",
    borderRight: `1px solid ${TOKENS.border}`,
    userSelect: "none",
  },
  colHead: {
    textAlign: "center",
  },
  userCell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "8px 12px",
    fontSize: 13,
    borderRight: `1px solid ${TOKENS.border}`,
    borderBottom: `1px solid ${TOKENS.border}`,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#D1E9F8",
    color: TOKENS.brand,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dataCell: {
    height: 56,
    borderRight: `1px solid ${TOKENS.border}`,
    borderBottom: `1px solid ${TOKENS.border}`,
    position: "relative",
    outline: "none",
  },
  cellInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  cellNumber: {
    fontWeight: 700,
    color: TOKENS.text,
    textShadow: "0 1px 0 rgba(255,255,255,0.6)",
  },
  cornerDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 8,
    background: TOKENS.danger,
  },
  empty: {
    padding: 24,
    textAlign: "center",
    color: TOKENS.muted,
  },
};


