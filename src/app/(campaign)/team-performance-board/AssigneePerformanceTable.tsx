import React, { useEffect, useMemo, useRef, useState } from "react";

/* ───────────────────────── Tokens (shared across panels; matches others) ───────────────────────── */
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
  radius: 6,
  status: {
    notStarted: "#CBD5E1",
    inProgress: "#1090D0",
    review: "#FF9F43",
    completed: "#28C76F",
    overdue: "#EA5455",
    neutral: "#6C757D",
  },
  role: { admin: "#3B82F6", editor: "#10B981", viewer: "#9CA3AF" },
  risk: { high: "#FF9F43", critical: "#EA5455", normal: "#9AA4B2" },
};

/* ───────────────────────── Utilities ───────────────────────── */
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const fmtNum = (n: any) => (typeof n === "number" ? n.toLocaleString() : "—");
const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

function useSessionState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [s, setS] = useState<T>(() => {
    try { const v = sessionStorage.getItem(key); return v ? (JSON.parse(v) as T) : initial; } catch { return initial; }
  });
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(s)); } catch {} }, [key, s]);
  return [s, setS];
}

function copyText(t: string) {
  try { navigator.clipboard.writeText(t); } catch {}
}

function dhLabel(days: number | null | undefined) {
  if (!Number.isFinite(days as number)) return "—";
  const d = Number(days);
  const whole = Math.floor(d);
  const frac = d - whole;
  const hh = Math.round(frac * 24);
  return `${whole}d ${String(hh).padStart(2, "0")}h`;
}

function hmLabel(mins: number | null | undefined) {
  if (!Number.isFinite(mins as number)) return "—";
  const m = Math.max(0, Math.round(Number(mins)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${String(mm).padStart(2, "0")}m`;
}

function hoursToHM(hours: number | null | undefined) {
  if (!Number.isFinite(hours as number)) return "—";
  return hmLabel(Math.round(Number(hours) * 60));
}

/* ───────────────────────── Micro sparkline (reuses style from other panels) ───────────────────────── */
const SparkMini: React.FC<{
  series: { date: string; value: number }[];
  width?: number; height?: number; color?: string; fill?: string;
}> = ({ series, width = 120, height = 28, color = TK.brand, fill = "rgba(16,144,208,0.15)" }) => {
  const max = Math.max(1, ...series.map((d) => d.value));
  const pts = series.map((d, i) => {
    const x = (i / Math.max(1, series.length - 1)) * (width - 2) + 1;
    const y = height - (d.value / max) * (height - 2) - 1;
    return [x, y] as const;
  });
  const path = pts.reduce((a, [x, y], i) => a + (i ? " L " : "M ") + x + " " + y, "");
  const area = `${path} L ${width - 1} ${height - 1} L 1 ${height - 1} Z`;
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />}
    </svg>
  );
};

/* ───────────────────────── Types ───────────────────────── */
type Role = "admin" | "editor" | "viewer";
type AssigneeRow = {
  id: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  projects_count: number;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_overdue: number;
  avg_duration_days: number | null; // mean completion days
  time_logged_minutes?: number | null;
  reassigned_count?: number | null;
  load_index?: number | null; // e.g., 0.0 = team avg, >1.5 = risk
  status_mix: { not_started: number; in_progress: number; review: number; completed: number; overdue: number };
  project_breakdown: Array<{ project: string; assigned: number; completed: number; overdue: number }>;
  campaign_breakdown: Array<{ type: string; count: number }>;
  recent_tasks: Array<{ id: string; title: string; status: string; due?: string }>;
  overdue_tasks: Array<{ id: string; title: string; days_overdue: number }>;
  time_trend: Array<{ date: string; value: number }>; // hours/day
};

/* ───────────────────────── CSV export ───────────────────────── */
function rowsToCSV(rows: AssigneeRow[], cols: string[]) {
  const header = cols.join(",");
  const lines = rows.map((r) => {
    const access: Record<string, string | number> = {
      Assignee: r.name,
      Role: r.role,
      Projects: r.projects_count,
      Assigned: r.tasks_assigned,
      Completed: r.tasks_completed,
      Overdue: r.tasks_overdue,
      AvgDurationDays: r.avg_duration_days ?? "",
      TimeLoggedMinutes: r.time_logged_minutes ?? "",
      Reassigned: r.reassigned_count ?? "",
      LoadIndex: r.load_index ?? "",
    };
    return cols.map((c) => `"${String(access[c] ?? "").replace(/"/g, '""')}"`).join(",");
  });
  return [header, ...lines].join("\n");
}

/* ───────────────────────── Table Component ───────────────────────── */
type SortDir = "asc" | "desc";
type SortKey =
  | "name"
  | "projects_count"
  | "tasks_assigned"
  | "tasks_completed"
  | "tasks_overdue"
  | "avg_duration_days"
  | "time_logged_minutes"
  | "reassigned_count"
  | "load_index";

const defaultVisibleCols = {
  projects: true,
  assigned: true,
  completed: true,
  overdue: true,
  avgDuration: true,
  timeLogged: true,
  reassigned: false,
  loadRisk: false,
};

export function AssigneePerformanceTable({
  rows,
  canExport = true,
  onNavigateToTaskboard,
}: {
  rows: AssigneeRow[];
  canExport?: boolean;
  onNavigateToTaskboard?: (ids: string[]) => void;
}) {
  const [search, setSearch] = useSessionState<string>("wr:tpb:tbl:search", "");
  const [density, setDensity] = useSessionState<"comfortable" | "compact">("wr:tpb:tbl:density", "comfortable");
  const [timeFormat, setTimeFormat] = useSessionState<"dh" | "hm">("wr:tpb:tbl:timefmt", "dh");
  const [visible, setVisible] = useSessionState("wr:tpb:tbl:cols", defaultVisibleCols);
  const [sort, setSort] = useSessionState<Array<{ key: SortKey; dir: SortDir }>>("wr:tpb:tbl:sort", [
    { key: "tasks_completed", dir: "desc" },
  ]);
  const [page, setPage] = useSessionState<number>("wr:tpb:tbl:page", 1);
  const [pageSize, setPageSize] = useSessionState<number>("wr:tpb:tbl:ps", 25);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCols, setShowCols] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Filter & Sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q))
      : rows.slice();
    // Multi-sort
    const sorted = base.sort((a, b) => {
      for (const s of sort) {
        const dir = s.dir === "asc" ? 1 : -1;
        const av = (a as any)[s.key];
        const bv = (b as any)[s.key];
        if (av == null && bv == null) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "string") {
          const cmp = av.localeCompare(bv);
          if (cmp !== 0) return cmp * dir;
        } else {
          const cmp = av === bv ? 0 : av > bv ? 1 : -1;
          if (cmp !== 0) return cmp * dir;
        }
      }
      return 0;
    });
    return sorted;
  }, [rows, search, sort]);

  // Pagination
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const curr = Math.min(page, pages);
  const start = (curr - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  const view = filtered.slice(start, end);

  // Selection logic
  const allOnPageIds = view.map((r) => r.id);
  const allOnPageSelected = allOnPageIds.every((id) => selected.has(id)) && allOnPageIds.length > 0;
  const someOnPageSelected = allOnPageIds.some((id) => selected.has(id)) && !allOnPageSelected;

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      const curr = [...prev];
      const idx = curr.findIndex((s) => s.key === key);
      if (idx === -1) return [{ key, dir: "asc" }];
      const entry = curr[idx];
      const nextDir = entry.dir === "asc" ? "desc" : "asc";
      curr[idx] = { key, dir: nextDir };
      return curr.slice(0, 2); // keep at most 2 keys
    });
  }

  function onHeaderClick(key: SortKey, e: React.MouseEvent) {
    setSort((prev) => {
      const exists = prev.find((s) => s.key === key);
      if (e.shiftKey) {
        // add or flip
        if (!exists) return [...prev.slice(0, 1), { key, dir: "asc" }];
        return prev.map((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : s));
      } else {
        return exists ? [{ key, dir: exists.dir === "asc" ? "desc" : "asc" }] : [{ key, dir: "asc" }];
      }
    });
  }

  function exportCSV(scope: "all" | "selected" | "page" = "selected") {
    const cols = [
      "Assignee",
      "Role",
      "Projects",
      "Assigned",
      "Completed",
      "Overdue",
      "AvgDurationDays",
      "TimeLoggedMinutes",
      "Reassigned",
      "LoadIndex",
    ];
    const dataset =
      scope === "all"
        ? filtered
        : scope === "page"
        ? view
        : filtered.filter((r) => selected.has(r.id));
    const csv = rowsToCSV(dataset, cols);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `assignee-performance-${scope}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const visibleCols = visible; // alias

  // Bulk summary text
  const summaryText = useMemo(() => {
    const pick = filtered.filter((r) => selected.has(r.id));
    if (pick.length === 0) return "";
    const totalA = pick.reduce((a, b) => a + b.tasks_assigned, 0);
    const totalC = pick.reduce((a, b) => a + b.tasks_completed, 0);
    const totalO = pick.reduce((a, b) => a + b.tasks_overdue, 0);
    return `${pick.length} users — Assigned ${totalA}, Completed ${totalC}, Overdue ${totalO}`;
  }, [filtered, selected]);

  return (
    <section className="wr-team-table-wrap" aria-label="Assignee Performance section">
      {/* Section header (sticky) */}
      <div className="wr-section-header" role="region" aria-label="Assignee Performance header">
        <div className="left">
          <h3 className="title">Assignee Performance</h3>
          <div className="search">
            <span aria-hidden>🔎</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search assignee…"
              aria-label="Search assignee"
            />
            {search && (
              <button className="x" aria-label="Clear search" onClick={() => setSearch("")}>×</button>
            )}
          </div>
        </div>

        <div className="right">
          <div role="group" aria-label="Density">
            <button
              className={`seg ${density === "comfortable" ? "active" : ""}`}
              onClick={() => setDensity("comfortable")}
              aria-pressed={density === "comfortable"}
            >
              Cozy
            </button>
            <button
              className={`seg ${density === "compact" ? "active" : ""}`}
              onClick={() => setDensity("compact")}
              aria-pressed={density === "compact"}
            >
              Compact
            </button>
          </div>

          <div role="group" aria-label="Time display">
            <button
              className={`seg ${timeFormat === "dh" ? "active" : ""}`}
              onClick={() => setTimeFormat("dh")}
              aria-pressed={timeFormat === "dh"}
              title="Days:Hours"
            >
              D:H
            </button>
            <button
              className={`seg ${timeFormat === "hm" ? "active" : ""}`}
              onClick={() => setTimeFormat("hm")}
              aria-pressed={timeFormat === "hm"}
              title="Hours:Minutes"
            >
              H:M
            </button>
          </div>

          <div className="gear-wrap">
            <button className="wr-btn ghost" onClick={() => setShowCols((v) => !v)} aria-expanded={showCols} aria-haspopup="true">
              ⚙️ Columns
            </button>
            {showCols && (
              <div className="wr-popover" onMouseLeave={() => setShowCols(false)} role="dialog" aria-label="Choose columns">
                <div className="wr-pop-title">Visible columns</div>
                {[
                  ["projects", "Projects"],
                  ["assigned", "Assigned"],
                  ["completed", "Completed"],
                  ["overdue", "Overdue"],
                  ["avgDuration", "Avg. Duration"],
                  ["timeLogged", "Time Logged"],
                  ["reassigned", "Reassigned"],
                  ["loadRisk", "Load Risk"],
                ].map(([k, label]) => (
                  <label key={k} className="wr-pop-item">
                    <input
                      type="checkbox"
                      checked={(visible as any)[k] !== false}
                      onChange={(e) => setVisible((s: any) => ({ ...s, [k]: e.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {canExport && (
            <div className="export-wrap">
              <button className="wr-btn ghost" title="Export current page" onClick={() => exportCSV("page")}>Export Page</button>
              <button className="wr-btn" title="Export all filtered" onClick={() => exportCSV("all")}>Export All</button>
            </div>
          )}

          <button className="wr-btn ghost" title="Refresh data" onClick={() => window.location.reload()}>↻ Refresh</button>
          <button className="wr-btn ghost" aria-expanded={showHelp} onClick={() => setShowHelp((v) => !v)}>ⓘ Help</button>
        </div>
      </div>

      {showHelp && (
        <div className="wr-help">
          <strong>Metric definitions</strong> — Assigned: tasks assigned in range; Completed: completed in range;
          Overdue: due date past and not completed; Avg. Duration: mean completion time (days); Time Logged: sum of approved time entries.
        </div>
      )}

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="wr-bulkbar" role="toolbar" aria-label="Bulk actions">
          <div className="info"><strong>{selected.size}</strong> selected · {summaryText}</div>
          <div className="actions">
            <button className="wr-btn" onClick={() => exportCSV("selected")}>Export selected</button>
            <button className="wr-btn ghost" onClick={() => copyText(summaryText)}>Copy summary</button>
            <button
              className="wr-btn ghost"
              onClick={() => onNavigateToTaskboard?.(Array.from(selected))}
              title="Open selected in Taskboard"
            >
              Open in Taskboard
            </button>
            <button className="wr-btn ghost" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={`wr-table ${density === "compact" ? "compact" : ""}`} role="grid" aria-rowcount={view.length}>
        <div className="thead" role="row">
          <div className="th sel">
            <input
              aria-label="Select all on page"
              type="checkbox"
              checked={allOnPageSelected}
              ref={(el:any) => el && (el.indeterminate = someOnPageSelected)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) allOnPageIds.forEach((id) => next.add(id));
                else allOnPageIds.forEach((id) => next.delete(id));
                setSelected(next);
              }}
            />
          </div>
          <div className="th exp" aria-hidden />
          <HeaderCell label="Assignee" sorted={sort.find((s) => s.key === "name")?.dir} onClick={(e) => onHeaderClick("name", e)} />
          {visibleCols.projects && (
            <HeaderCell label="Projects" align="right" sorted={sort.find((s) => s.key === "projects_count")?.dir} onClick={(e) => onHeaderClick("projects_count", e)} />
          )}
          {visibleCols.assigned && (
            <HeaderCell label="Assigned" align="right" sorted={sort.find((s) => s.key === "tasks_assigned")?.dir} onClick={(e) => onHeaderClick("tasks_assigned", e)} />
          )}
          {visibleCols.completed && (
            <HeaderCell label="Completed" align="right" sorted={sort.find((s) => s.key === "tasks_completed")?.dir} onClick={(e) => onHeaderClick("tasks_completed", e)} />
          )}
          {visibleCols.overdue && (
            <HeaderCell label="Overdue" align="right" sorted={sort.find((s) => s.key === "tasks_overdue")?.dir} onClick={(e) => onHeaderClick("tasks_overdue", e)} />
          )}
          {visibleCols.avgDuration && (
            <HeaderCell label="Avg. Duration" align="right" sorted={sort.find((s) => s.key === "avg_duration_days")?.dir} onClick={(e) => onHeaderClick("avg_duration_days", e)} />
          )}
          {visibleCols.timeLogged && (
            <HeaderCell label="Time Logged" align="right" sorted={sort.find((s) => s.key === "time_logged_minutes")?.dir} onClick={(e) => onHeaderClick("time_logged_minutes", e)} />
          )}
          {visibleCols.reassigned && (
            <HeaderCell label="Reassigned" align="right" sorted={sort.find((s) => s.key === "reassigned_count")?.dir} onClick={(e) => onHeaderClick("reassigned_count", e)} />
          )}
          {visibleCols.loadRisk && (
            <HeaderCell label="Load Risk" align="center" sorted={sort.find((s) => s.key === "load_index")?.dir} onClick={(e) => onHeaderClick("load_index", e)} />
          )}
        </div>

        <div role="rowgroup">
          {view.map((r) => {
            const isExp = expanded.has(r.id);
            const isSel = selected.has(r.id);
            return (
              <React.Fragment key={r.id}>
                <div className={`tr ${isExp ? "expd" : ""}`} role="row" tabIndex={0}>
                  <div className="td sel">
                    <input
                      aria-label={`Select ${r.name}`}
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(r.id);
                        else next.delete(r.id);
                        setSelected(next);
                      }}
                    />
                  </div>
                  <div className="td exp">
                    <button
                      className="expbtn"
                      aria-label={`${isExp ? "Collapse" : "Expand"} details for ${r.name}`}
                      onClick={() => {
                        const next = new Set(expanded);
                        isExp ? next.delete(r.id) : next.add(r.id);
                        setExpanded(next);
                      }}
                    >
                      {isExp ? "▾" : "▸"}
                    </button>
                  </div>
                  <div className="td name">
                    <div className="assignee">
                      <div className="avatar" aria-hidden>{(r.name || "?").slice(0, 1)}</div>
                      <div className="meta">
                        <div className="n">{r.name}</div>
                        <div className="role" style={{ borderColor: TK.role[r.role] }}>{r.role}</div>
                      </div>
                    </div>
                  </div>

                  {visibleCols.projects && <div className="td num">{fmtNum(r.projects_count)}</div>}
                  {visibleCols.assigned && <div className="td num">{fmtNum(r.tasks_assigned)}</div>}
                  {visibleCols.completed && <div className="td num">{fmtNum(r.tasks_completed)}</div>}
                  {visibleCols.overdue && (
                    <div className="td num">
                      <span className={`pill pill-red ${r.tasks_overdue > 3 ? "strong" : ""}`} title={r.tasks_overdue > 0 ? "Overdue tasks" : ""}>
                        {fmtNum(r.tasks_overdue)}
                      </span>
                    </div>
                  )}
                  {visibleCols.avgDuration && (
                    <div className="td num">{timeFormat === "dh" ? dhLabel(r.avg_duration_days ?? null) : hoursToHM((r.avg_duration_days ?? 0) * 24)}</div>
                  )}
                  {visibleCols.timeLogged && (
                    <div className="td num">{hmLabel(r.time_logged_minutes ?? null)}</div>
                  )}
                  {visibleCols.reassigned && <div className="td num">{fmtNum(r.reassigned_count ?? 0)}</div>}
                  {visibleCols.loadRisk && (
                    <div className="td risk">
                      <RiskBadge index={r.load_index ?? 0} />
                    </div>
                  )}
                </div>

                {/* Expander */}
                {isExp && (
                  <div className="exp-row" role="row">
                    <div className="exp-cell" role="cell" style={{ gridColumn: "span 999" }}>
                      <div className="exp-grid">
                        <div className="col">
                          <div className="subttl">Top projects</div>
                          <div className="proj-list">
                            {r.project_breakdown.slice(0, 5).map((p, i) => (
                              <div key={i} className="proj-item" title={`${p.assigned} assigned · ${p.completed} completed · ${p.overdue} overdue`}>
                                <span className="pname">{p.project}</span>
                                <span className="meta">
                                  <span className="chip">Assigned {fmtNum(p.assigned)}</span>
                                  <span className="chip green">Completed {fmtNum(p.completed)}</span>
                                  {p.overdue > 0 && <span className="chip red">Overdue {fmtNum(p.overdue)}</span>}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="subttl" style={{ marginTop: 8 }}>Status mix</div>
                          <div className="mix">
                            {[
                              ["Not Started", r.status_mix.not_started, TK.status.notStarted],
                              ["In Progress", r.status_mix.in_progress, TK.status.inProgress],
                              ["Review", r.status_mix.review, TK.status.review],
                              ["Completed", r.status_mix.completed, TK.status.completed],
                              ["Overdue", r.status_mix.overdue, TK.status.overdue],
                            ].map(([label, val, color]) => (
                              <span key={label as string} className="mix-chip" style={{ borderColor: String(color) }}>
                                <span className="dot" style={{ background: String(color) }} />
                                {label}: {fmtNum(val)}
                              </span>
                            ))}
                          </div>

                          <div className="subttl" style={{ marginTop: 8 }}>Campaigns</div>
                          <div className="mix">
                            {r.campaign_breakdown.map((c, i) => (
                              <span key={i} className="mix-chip">
                                {c.type}: {fmtNum(c.count)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="col">
                          <div className="subttl">Recent tasks</div>
                          <div className="task-list">
                            {r.recent_tasks.slice(0, 5).map((t) => (
                              <div key={t.id} className="task">
                                <span className="t">{t.title}</span>
                                <span className={`status s-${t.status.replace(/\s+/g, "").toLowerCase()}`}>{t.status}</span>
                                {t.due && <span className="due" title="Due date">📅 {t.due}</span>}
                              </div>
                            ))}
                          </div>

                          <div className="subttl" style={{ marginTop: 8 }}>Overdue</div>
                          <div className="task-list">
                            {r.overdue_tasks.length === 0 ? (
                              <div className="task empty">No overdue tasks 🎉</div>
                            ) : (
                              r.overdue_tasks.slice(0, 5).map((t) => (
                                <div key={t.id} className="task">
                                  <span className="t">{t.title}</span>
                                  <span className="pill pill-red">+{t.days_overdue}d</span>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="subttl" style={{ marginTop: 8 }}>Time trend (last 30)</div>
                          <SparkMini series={r.time_trend} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="wr-pager" role="navigation" aria-label="Pagination">
        <div className="rows">
          Rows per page{" "}
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {[10, 20, 50, 100].map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
        </div>
        <div className="range">Showing {fmtNum(start + 1)}–{fmtNum(end)} of {fmtNum(total)}</div>
        <div className="nav">
          <button className="wr-btn ghost" onClick={() => setPage(1)} disabled={curr === 1} aria-label="First page">«</button>
          <button className="wr-btn ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={curr === 1} aria-label="Previous page">‹</button>
          <span className="pidx">Page {curr} / {pages}</span>
          <button className="wr-btn ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={curr === pages} aria-label="Next page">›</button>
          <button className="wr-btn ghost" onClick={() => setPage(pages)} disabled={curr === pages} aria-label="Last page">»</button>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Header cell subcomponent ───────────────────────── */
function HeaderCell({
  label, align = "left", sorted, onClick,
}: { label: string; align?: "left" | "right" | "center"; sorted?: "asc" | "desc"; onClick: (e: React.MouseEvent) => void; }) {
  return (
    <div className={`th ${align}`} role="columnheader" aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : "none"}>
      <button className="hbtn" onClick={onClick} title="Click to sort, Shift+Click to add secondary sort">
        <span>{label}</span>
        {sorted && <span className="sort">{sorted === "asc" ? "▲" : "▼"}</span>}
      </button>
    </div>
  );
}

/* ───────────────────────── Risk badge ───────────────────────── */
function RiskBadge({ index }: { index: number }) {
  let tier: "normal" | "high" | "critical" = "normal";
  if (index >= 1.5) tier = "critical";
  else if (index >= 1.0) tier = "high";
  const label = tier === "critical" ? "Critical" : tier === "high" ? "High" : "Normal";
  const color = tier === "critical" ? TK.risk.critical : tier === "high" ? TK.risk.high : TK.risk.normal;
  return (
    <span className="load" style={{ color, borderColor: color }} title={`Load index ${index.toFixed(2)} (${label})`}>
      {label}
    </span>
  );
}

/* ───────────────────────── Demo wiring (mock realistic data) ───────────────────────── */
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(a: T[]) { return a[rnd(0, a.length - 1)]; }
function mkTimeSeries(days = 30, base = 2.5, swing = 1.6) {
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const v = Math.max(0, Number((base + Math.sin(i / 2) * swing + (Math.random() - 0.5) * swing).toFixed(1)));
    out.push({ date: d, value: v });
  }
  return out;
}
function mkUser(i: number): AssigneeRow {
  const first = ["Maya", "John", "Richa", "Vikash", "Aisha", "Carlos", "Chen", "Sofia", "Kai", "Ava", "Ishaan", "Mina", "Omar", "Liam", "Emma", "Noah", "Mila", "Leo"];
  const last = ["Sharma", "Lee", "Singh", "Brown", "Garcia", "Patel", "Kim", "Ghosh", "Khan", "Lopez", "Nguyen", "Martinez", "Kumar", "Das"];
  const role: Role = pick(["editor", "editor", "editor", "admin", "viewer"]);
  const name = `${pick(first)} ${pick(last)}`;
  const projects = rnd(1, 6);
  const assigned = rnd(8, 32);
  const completed = rnd(Math.floor(assigned * 0.4), assigned);
  const overdue = Math.max(0, rnd(0, 5) - (completed > assigned * 0.7 ? 2 : 0));
  const avgDays = Number((Math.random() * 4 + 1.2 - (role === "admin" ? 0.5 : 0)).toFixed(1));
  const timeMins = rnd(300, 3200);
  const reassigned = rnd(0, 3);
  const loadIndex = Number((assigned / 16).toFixed(2)); // rough index

  const status_mix = {
    not_started: Math.max(0, assigned - completed - rnd(0, 4) - overdue),
    in_progress: rnd(0, Math.max(0, assigned - completed)),
    review: rnd(0, Math.max(0, assigned - completed)),
    completed,
    overdue,
  };

  const projectsList = Array.from({ length: Math.min(5, projects) }).map((_, k) => ({
    project: `Project ${String.fromCharCode(65 + ((i + k) % 26))}`,
    assigned: rnd(2, Math.max(2, Math.round(assigned / projects))),
    completed: rnd(1, Math.max(1, Math.round(completed / projects))),
    overdue: rnd(0, Math.max(0, Math.round(overdue / projects))),
  }));

  const campaigns = ["SEO", "Content", "Technical", "Reporting", "Ads", "Internal"];
  const campaign_breakdown = campaigns
    .map((c) => ({ type: c, count: rnd(0, Math.max(0, Math.round(assigned / 3))) }))
    .filter((c) => c.count > 0)
    .slice(0, 4);

  const rtitles = ["Fix meta tags", "Blog outline", "Schema update", "Site speed audit", "Backlink review", "Landing page copy", "Core Web Vitals", "Alt text pass"];
  const statuses = ["Completed", "In Progress", "Review", "Not Started"];
  const recent_tasks = Array.from({ length: 6 }).map((_, k) => ({
    id: `t-${i}-${k}`,
    title: pick(rtitles),
    status: pick(statuses),
    due: Math.random() > 0.5 ? new Date(Date.now() + rnd(-5, 10) * 86400000).toISOString().slice(0, 10) : undefined,
  }));

  const overdue_tasks = overdue
    ? Array.from({ length: Math.min(5, overdue) }).map((_, k) => ({
        id: `o-${i}-${k}`,
        title: pick(rtitles),
        days_overdue: rnd(1, 10),
      }))
    : [];

  return {
    id: `u_${i}`,
    name,
    role,
    projects_count: projects,
    tasks_assigned: assigned,
    tasks_completed: completed,
    tasks_overdue: overdue,
    avg_duration_days: avgDays,
    time_logged_minutes: timeMins,
    reassigned_count: reassigned,
    load_index: loadIndex,
    status_mix,
    project_breakdown: projectsList,
    campaign_breakdown,
    recent_tasks,
    overdue_tasks,
    time_trend: mkTimeSeries(30, 2.5, 1.6),
  };
}

export default function DemoAssigneePerformanceTable() {
  const [data, setData] = useState<AssigneeRow[]>(() => Array.from({ length: 38 }).map((_, i) => mkUser(i)));
  const [lastOpen, setLastOpen] = useState<string>("");

  return (
    <div style={{ padding: 16, background: "#FAFAFA" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Team Performance Board · Assignee Performance (Demo)</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="wr-btn ghost" onClick={() => setData(Array.from({ length: 38 }).map((_, i) => mkUser(i)))}>Regenerate</button>
          <button className="wr-btn ghost" onClick={() => sessionStorage.clear()}>Reset State</button>
        </div>
      </header>

      <AssigneePerformanceTable
        rows={data}
        canExport={true}
        onNavigateToTaskboard={(ids) => setLastOpen(`Open Taskboard with users: ${ids.join(", ")}`)}
      />

      <div style={{ marginTop: 8, fontSize: 12, color: TK.muted }}>
        {lastOpen ? <>{lastOpen}</> : <em>Select rows and click “Open in Taskboard” to simulate deep‑link.</em>}
      </div>
    </div>
  );
}

/* ───────────────────────── Styles (idempotent) ───────────────────────── */
const SID = "wr-team-table-style-v3";
if (!document.getElementById(SID)) {
  const s = document.createElement("style");
  s.id = SID;
  s.textContent = `
.wr-btn{border:1px solid ${TK.border}; background:${TK.surface}; padding:6px 10px; border-radius:${TK.radius}px; font-size:12px; cursor:pointer}
.wr-btn.ghost{background:${TK.surfaceSubtle};}
.wr-btn:hover{border-color:${TK.borderStrong}}
.wr-team-table-wrap{margin-top:8px}
.wr-section-header{position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 0 12px; background:linear-gradient(${TK.surface}, ${TK.surface}); border-bottom:1px solid ${TK.border}}
.wr-section-header .title{margin:0 12px 0 0; font-size:16px; font-weight:700; color:${TK.text}}
.wr-section-header .left{display:flex; align-items:center; gap:12px}
.wr-section-header .search{display:flex; align-items:center; gap:6px; border:1px solid ${TK.border}; background:${TK.surface}; padding:6px 8px; border-radius:${TK.radius}px; min-width:240px}
.wr-section-header .search input{border:none; outline:none; font-size:12px; width:160px}
.wr-section-header .search .x{border:none; background:transparent; cursor:pointer; font-size:14px}
.wr-section-header .right{display:flex; align-items:center; gap:8px}
.seg{border:1px solid ${TK.border}; background:${TK.surface}; color:${TK.muted}; padding:6px 10px; font-size:12px; border-radius:${TK.radius}px 0 0 ${TK.radius}px; cursor:pointer}
.seg + .seg{border-left:none; border-radius:0 ${TK.radius}px ${TK.radius}px 0}
.seg.active{background:${TK.focus}; color:${TK.text}}
.gear-wrap{position:relative}
.wr-popover{position:absolute; top:36px; right:0; background:#fff; border:1px solid ${TK.border}; border-radius:8px; box-shadow:0 10px 24px rgba(0,0,0,.08); padding:8px; z-index:10; min-width:220px}
.wr-pop-title{font-weight:600; font-size:13px; margin-bottom:6px}
.wr-pop-item{display:flex; align-items:center; gap:8px; font-size:13px; padding:4px 2px}
.wr-help{margin:8px 0; padding:8px; background:${TK.surfaceSubtle}; border:1px solid ${TK.border}; border-radius:${TK.radius}px; color:${TK.muted}; font-size:12px}

.wr-bulkbar{position:sticky; top:56px; z-index:2; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px; background:${TK.surface}; border:1px solid ${TK.border}; border-radius:${TK.radius}px; box-shadow:${TK.shadow}; margin:8px 0}
.wr-bulkbar .info{font-size:12px; color:${TK.text}}
.wr-bulkbar .actions{display:flex; gap:8px}

.wr-table{border:1px solid ${TK.border}; border-radius:${TK.radius}px; background:${TK.surface}; overflow:hidden; box-shadow:${TK.shadow}}
.wr-table.compact .tr{min-height:44px}
.thead{display:grid; grid-template-columns: 44px 40px 1.4fr repeat(7, 0.8fr); gap:0; align-items:center; border-bottom:1px solid ${TK.borderStrong}; background:${TK.surfaceSubtle}}
.th{padding:10px 12px; font-size:12px; font-weight:600; color:${TK.muted}; display:flex; align-items:center}
.th.right{justify-content:flex-end}
.th.center{justify-content:center}
.th.sel{display:flex; align-items:center; justify-content:center}
.hbtn{display:flex; align-items:center; gap:6px; background:transparent; border:none; padding:0; cursor:pointer; color:inherit; font:inherit}
.hbtn .sort{opacity:0.9}

.tr{display:grid; grid-template-columns: 44px 40px 1.4fr repeat(7, 0.8fr); align-items:center; border-top:1px solid ${TK.border}; min-height:56px}
.tr:focus-visible{outline:2px solid ${TK.focus}; outline-offset:-2px}
.td{padding:8px 12px; display:flex; align-items:center}
.td.num{justify-content:flex-end}
.td.risk{justify-content:center}
.td.sel{justify-content:center}
.td.exp{justify-content:center}
.expbtn{border:none; background:transparent; cursor:pointer; font-size:14px}
.assignee{display:flex; align-items:center; gap:10px}
.avatar{width:32px; height:32px; border-radius:50%; background:${TK.surfaceSubtle}; display:flex; align-items:center; justify-content:center; font-weight:700; color:${TK.muted}; border:1px solid ${TK.border}}
.meta .n{font-weight:600}
.meta .role{border:1px solid; border-radius:10px; padding:1px 6px; font-size:11px; color:${TK.muted}; margin-top:2px; width:max-content}

.pill{display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; border:1px solid ${TK.border}; font-size:12px}
.pill-red{background:rgba(234,84,85,0.08); color:${TK.status.overdue}; border-color:rgba(234,84,85,0.25)}
.pill-red.strong{box-shadow:0 0 0 2px rgba(234,84,85,0.1) inset}

.load{display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; border:1px solid ${TK.border}; font-size:12px}

.exp-row{border-top:1px dashed ${TK.borderStrong}; background:${TK.surface}}
.exp-cell{padding:10px 12px 14px}
.exp-grid{display:grid; grid-template-columns: 1fr 1fr; gap:12px}
.subttl{font-size:12px; color:${TK.muted}; font-weight:700; margin-bottom:6px}
.proj-list{display:flex; flex-direction:column; gap:6px}
.proj-item{display:flex; align-items:center; justify-content:space-between; gap:8px; border:1px solid ${TK.border}; padding:8px; border-radius:${TK.radius}px; background:${TK.surfaceSubtle}}
.proj-item .pname{font-weight:600}
.proj-item .chip{border:1px solid ${TK.border}; border-radius:999px; padding:2px 6px; font-size:11px}
.proj-item .chip.green{color:${TK.status.completed}; border-color:rgba(40,199,111,.35)}
.proj-item .chip.red{color:${TK.status.overdue}; border-color:rgba(234,84,85,.35)}
.mix{display:flex; flex-wrap:wrap; gap:6px}
.mix-chip{display:inline-flex; align-items:center; gap:6px; border:1px solid ${TK.border}; border-radius:999px; padding:2px 8px; font-size:12px}
.mix-chip .dot{width:8px; height:8px; border-radius:50%}
.task-list{display:flex; flex-direction:column; gap:6px}
.task{display:flex; align-items:center; gap:8px; border:1px dashed ${TK.border}; padding:6px 8px; border-radius:${TK.radius}px; background:${TK.surfaceSubtle}}
.task .t{font-weight:600}
.task .status{font-size:11px; border:1px solid ${TK.border}; border-radius:999px; padding:1px 6px; color:${TK.muted}}
.task .due{font-size:12px; color:${TK.muted}}
.task.empty{justify-content:center; color:${TK.muted}}

.wr-pager{display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 8px; color:${TK.muted}}
.wr-pager .rows select{font-size:12px; padding:4px 8px}
.wr-pager .nav{display:flex; align-items:center; gap:6px}
.wr-pager .pidx{font-size:12px; color:${TK.text}}

@media (max-width: 980px){
  .thead, .tr{ grid-template-columns: 44px 40px 1.6fr repeat(5, 0.9fr); }
}
@media (max-width: 760px){
  .exp-grid{ grid-template-columns: 1fr; }
  .wr-section-header .search{ min-width: 180px; }
}
`;
  document.head.appendChild(s);
}


