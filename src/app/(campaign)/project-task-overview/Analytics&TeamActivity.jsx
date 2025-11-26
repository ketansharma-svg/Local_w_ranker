"use client"
import { useEffect, useMemo, useState } from "react"

/* ─────────────────────────────────────────────────────────
   0) TOKENS – aligned with previous sections
   ───────────────────────────────────────────────────────── */
const TK = {
  brand: "#1090D0",
  text: "#000000",
  muted: "#282829",
  surface: "#FFFFFF",
  subtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  accent: "#D2EFFF",
  status: {
    notStarted: "#CBD5E1",
    inProgress: "#1090D0",
    review: "#FF9F43",
    completed: "#28C76F",
    overdue: "#EA5455",
  },
  priority: {
    high: "#EA5455",
    medium: "#FF9F43",
    low: "#9AA4B2",
  },
  radius: 10,
}

const STATUS_LIST = ["Not Started", "In Progress", "Under Review", "Completed"]
const CTYPES = ["SEO", "Content", "Technical", "Reporting"]

/* ─────────────────────────────────────────────────────────
   1) DATE HELPERS
   ───────────────────────────────────────────────────────── */
const MS_DAY = 86400000
const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const addDays = (d, n) => new Date(startOfDay(d).getTime() + n * MS_DAY)
const iso = (d) => startOfDay(new Date(d)).toISOString().slice(0, 10)
const between = (d, s, e) => startOfDay(d) >= startOfDay(s) && startOfDay(d) <= startOfDay(e)
const fmtShort = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "2-digit" })

/* ─────────────────────────────────────────────────────────
   2) DEMO DATA – single project with > 80 tasks and time logs
   ───────────────────────────────────────────────────────── */
const MEMBERS = [
  { id: "richa", name: "Richa", initials: "R", color: "#7C8CF8" },
  { id: "john", name: "John", initials: "J", color: "#6AB0FF" },
  { id: "maya", name: "Maya", initials: "M", color: "#7AD8B0" },
  { id: "vikash", name: "Vikash", initials: "V", color: "#6D85B8" },
  { id: "sara", name: "Sara", initials: "S", color: "#E49B5E" },
  { id: "nina", name: "Nina", initials: "N", color: "#A16BD9" },
]

function seededRand(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}
function pick(arr, n) {
  return arr[Math.floor(seededRand(n) * arr.length)]
}

function makeDemoTasks(n = 84) {
  const now = startOfDay(new Date())
  const tasks = []
  for (let i = 0; i < n; i++) {
    const assignee = MEMBERS[i % MEMBERS.length]
    const status = STATUS_LIST[(i * 7) % STATUS_LIST.length]
    const ctype = CTYPES[(i * 5) % CTYPES.length]
    const priority = ["High", "Medium", "Low"][(i * 3) % 3]

    // start between -50 and +10 days
    const s = addDays(now, Math.floor(seededRand(i + 1) * 61) - 50)
    const dur = Math.max(1, 1 + Math.floor(seededRand(i + 4) * 9))
    const e = addDays(s, dur)

    let completedAt = null
    if (status === "Completed") {
      // sometime between start and due + 2
      completedAt = addDays(s, Math.max(0, Math.floor(seededRand(i + 9) * (dur + 3))))
    }

    // small time logs across the span
    const logs = []
    const logCount = Math.floor(seededRand(i + 13) * 4) // 0..3 entries
    for (let j = 0; j < logCount; j++) {
      const day = addDays(s, Math.floor(seededRand(i * 31 + j) * (dur + 4)) - 1)
      const hrs = Math.round((0.5 + seededRand(i * 17 + j) * 5) * 10) / 10 // 0.5..5.5
      logs.push({ date: iso(day), hours: hrs, userId: assignee.id })
    }

    tasks.push({
      id: `t-${i + 1}`,
      title: ["SEO Audit Plan", "Blog Optimization", "Fix Core Web Vitals", "Weekly Reporting"][i % 4] + ` #${i + 1}`,
      ctype,
      status,
      priority,
      start: iso(s),
      due: iso(e),
      completedAt: completedAt ? iso(completedAt) : null,
      assigneeId: assignee.id,
      timeLogs: logs,
      // activity stubs (for feed)
      updatedAt: iso(addDays(s, Math.floor(seededRand(i + 19) * dur))),
    })
  }
  return tasks
}

const TASKS = makeDemoTasks(96)

/* ─────────────────────────────────────────────────────────
   3) CHART COLOR HELPERS
   ───────────────────────────────────────────────────────── */
const STATUS_COLOR = {
  "Not Started": TK.status.notStarted,
  "In Progress": TK.status.inProgress,
  "Under Review": TK.status.review,
  Completed: TK.status.completed,
}
const ctypeColor = (t) =>
  t === "SEO" ? "#1C7ED6" : t === "Content" ? "#2FB886" : t === "Technical" ? "#6366F1" : "#FF7849"

/* ─────────────────────────────────────────────────────────
   4) ROOT – Analytics & Team Activity
   ───────────────────────────────────────────────────────── */
export default function ProjectAnalyticsTeamActivity() {
  /* Filters state */
  const [rangePreset, setRangePreset] = useState("30") // 14 | 30 | 90 | custom
  const [customStart, setCustomStart] = useState(iso(addDays(new Date(), -30)))
  const [customEnd, setCustomEnd] = useState(iso(new Date()))
  const [statusFilter, setStatusFilter] = useState([...STATUS_LIST])
  const [ctypeFilter, setCtypeFilter] = useState([...CTYPES])
  const [assigneeFilter, setAssigneeFilter] = useState([]) // none means all

  /* Derived range */
  const today = startOfDay(new Date())
  const { winStart, winEnd } = useMemo(() => {
    if (rangePreset !== "custom") {
      const days = Number(rangePreset)
      return { winStart: addDays(today, -days + 1), winEnd: today }
    }
    return { winStart: new Date(customStart), winEnd: new Date(customEnd) }
  }, [rangePreset, customStart, customEnd])

  /* Apply filters to tasks in-window */
  const filtered = useMemo(() => {
    return TASKS.filter((t) => {
      // window inclusion: if any of [start,due,completedAt,updatedAt] in range
      const inWin =
        between(new Date(t.start), winStart, winEnd) ||
        between(new Date(t.due), winStart, winEnd) ||
        (t.completedAt && between(new Date(t.completedAt), winStart, winEnd)) ||
        between(new Date(t.updatedAt), winStart, winEnd)
      if (!inWin) return false
      if (!statusFilter.includes(t.status)) return false
      if (!ctypeFilter.includes(t.ctype)) return false
      if (assigneeFilter.length && !assigneeFilter.includes(t.assigneeId)) return false
      return true
    })
  }, [winStart, winEnd, statusFilter, ctypeFilter, assigneeFilter])

  /* KPI metrics */
  const metrics = useMemo(() => {
    const total = filtered.length || 1
    const completed = filtered.filter((t) => t.status === "Completed").length
    const open = filtered.filter((t) => t.status !== "Completed").length
    const overdue = filtered.filter((t) => new Date(t.due) < today && t.status !== "Completed").length
    const completedWithDur = filtered.filter((t) => t.status === "Completed" && t.completedAt)
    const avgDur =
      completedWithDur.length === 0
        ? 0
        : Math.round(
            (completedWithDur.reduce(
              (acc, t) => acc + (startOfDay(new Date(t.completedAt)) - startOfDay(new Date(t.start))) / MS_DAY,
              0,
            ) /
              completedWithDur.length) *
              10,
          ) / 10

    // time logged within window
    let timeHrs = 0
    for (const t of filtered) {
      for (const lg of t.timeLogs || []) {
        const d = new Date(lg.date)
        if (between(d, winStart, winEnd)) timeHrs += lg.hours
      }
    }

    return {
      total,
      open,
      completed,
      overdue,
      completionRate: Math.round((completed / total) * 100),
      overduePct: Math.round((overdue / total) * 100),
      avgDur,
      timeHrs: Math.round(timeHrs * 10) / 10,
    }
  }, [filtered, winStart, winEnd, today])

  /* Datasets for charts */
  const byStatus = useMemo(() => {
    const map = new Map()
    STATUS_LIST.forEach((s) => map.set(s, 0))
    filtered.forEach((t) => map.set(t.status, (map.get(t.status) || 0) + 1))
    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      color: STATUS_COLOR[label],
    }))
  }, [filtered])

  const byType = useMemo(() => {
    const map = new Map()
    CTYPES.forEach((c) => map.set(c, 0))
    filtered.forEach((t) => map.set(t.ctype, (map.get(t.ctype) || 0) + 1))
    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      color: ctypeColor(label),
    }))
  }, [filtered])

  const timeSeries = useMemo(() => {
    // aggregate hours per day within window (all users)
    const out = []
    for (let d = new Date(winStart); d <= winEnd; d = addDays(d, 1)) {
      const key = iso(d)
      let hrs = 0
      for (const t of filtered) {
        for (const lg of t.timeLogs || []) {
          if (lg.date === key) hrs += lg.hours
        }
      }
      out.push({ date: key, value: Math.round(hrs * 10) / 10 })
    }
    return out
  }, [filtered, winStart, winEnd])

  /* Team table rows */
  const TEAM = useMemo(() => {
    const byUser = new Map() // id => metrics
    for (const m of MEMBERS) {
      byUser.set(m.id, {
        user: m,
        assigned: 0,
        completed: 0,
        overdue: 0,
        avgDays: 0,
        sumDays: 0,
        doneCount: 0,
        timeHrs: 0,
        projects: 1, // single project in this panel
      })
    }
    for (const t of filtered) {
      const row = byUser.get(t.assigneeId)
      if (!row) continue
      row.assigned++
      if (t.status === "Completed") {
        row.completed++
        if (t.completedAt) {
          const d = (startOfDay(new Date(t.completedAt)) - startOfDay(new Date(t.start))) / MS_DAY
          row.sumDays += d
          row.doneCount++
        }
      }
      if (new Date(t.due) < today && t.status !== "Completed") row.overdue++

      for (const lg of t.timeLogs || []) {
        const d = new Date(lg.date)
        if (between(d, winStart, winEnd)) row.timeHrs += lg.hours
      }
    }
    const rows = Array.from(byUser.values()).map((r) => ({
      ...r,
      avgDays: r.doneCount ? Math.round((r.sumDays / r.doneCount) * 10) / 10 : 0,
      timeHrs: Math.round(r.timeHrs * 10) / 10,
    }))
    return rows
  }, [filtered, winStart, winEnd, today])

  /* Sorting for table */
  const [sortKey, setSortKey] = useState("assigned")
  const [sortDir, setSortDir] = useState("desc")
  const sortedTeam = useMemo(() => {
    const arr = [...TEAM]
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === bv) return 0
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1
    })
    return arr
  }, [TEAM, sortKey, sortDir])

  /* Export CSV (team table) */
  const exportCsv = () => {
    const head = ["Assignee", "Assigned", "Completed", "Overdue", "Avg Duration (d)", "Time Logged (h)"].join(",")
    const lines = sortedTeam.map((r) =>
      [r.user.name, r.assigned, r.completed, r.overdue, r.avgDays, r.timeHrs]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    const blob = new Blob([head + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "project-analytics-team.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /* Styles once */
  useEffect(() => {
    if (document.getElementById("ana-styles")) return
    const s = document.createElement("style")
    s.id = "ana-styles"
    s.textContent = `
.ana-wrap{border:1px solid ${TK.borderStrong};border-radius:${TK.radius}px;background:${TK.surface}}
.ana-top{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid ${TK.border}}
.ana-title{font-weight:700}
.ana-right{display:flex;gap:8px;align-items:center}
.ana-btn{height:30px;padding:0 10px;border:1px solid ${TK.border};border-radius:${TK.radius}px;background:${TK.brand};color:#fff;font-size:12px}
.ana-btn.ghost{background:#fff;color:${TK.muted}}
.ana-chip{height:26px;border:1px solid ${TK.border};border-radius:999px;background:#fff;padding:0 10px;font-size:12px;color:${TK.muted}}
.ana-chip.active{background:${TK.accent}}
.ana-select, .ana-input{height:30px;border:1px solid ${TK.border};border-radius:${TK.radius}px;background:#fff;padding:0 8px}
.ana-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:12px;border-bottom:1px solid ${TK.border}}
.kpi{background:#fff;border:1px solid ${TK.border};border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:4px}
.kpi .n{font-size:20px;font-weight:800}
.kpi .l{font-size:12px;color:${TK.muted}}
.kpi.blue{box-shadow:0 0 0 1px ${TK.status.inProgress} inset}
.kpi.red{box-shadow:0 0 0 1px ${TK.status.overdue} inset}
.kpi.yellow{box-shadow:0 0 0 1px ${TK.status.review} inset}
.kpi.green{box-shadow:0 0 0 1px ${TK.status.completed} inset}
.kpi.gray{box-shadow:0 0 0 1px ${TK.border} inset}

.ana-grid{display:grid;grid-template-columns:420px 1fr;gap:12px;padding:12px}
.card{background:#fff;border:1px solid ${TK.border};border-radius:${TK.radius}px;padding:12px}
.card h4{margin:0 0 8px 0}
.legend{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.legend .dot{width:10px;height:10px;border-radius:50%}
.chart-wrap{position:relative}
.tip{position:absolute;background:#111827;color:#fff;font-size:12px;padding:6px 8px;border-radius:8px;box-shadow:0 6px 14px rgba(0,0,0,.12);transform:translate(-50%,-8px);white-space:nowrap;pointer-events:none}

.table-wrap{padding:0 12px 12px}
.team-table{width:100%;border-collapse:separate;border-spacing:0}
.team-table th{position:sticky;top:0;background:#fff;border-bottom:1px solid ${TK.border};padding:8px 10px;text-align:left;font-weight:700}
.team-table td{border-bottom:1px solid ${TK.border};padding:8px 10px;vertical-align:middle}
.tr:hover{background:${TK.subtle}}
.sort{border:1px solid ${TK.border};background:#fff;border-radius:${TK.radius}px;height:24px;width:24px;display:inline-flex;align-items:center;justify-content:center;margin-left:6px}
.avatar{width:24px;height:24px;border-radius:999px;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:12px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;border:1px solid transparent;font-size:12px}
.pill{border:1px solid ${TK.border};border-radius:999px;padding:0 8px;height:22px;display:inline-flex;align-items:center;font-size:12px}
.feed{padding:12px;border-top:1px dashed ${TK.border}}
.feed-item{display:flex;gap:10px;align-items:flex-start;padding:6px 2px}
.feed-dot{width:8px;height:8px;border-radius:50%}
@media (max-width: 1100px){
  .ana-kpis{grid-template-columns:repeat(3,1fr)}
  .ana-grid{grid-template-columns:1fr}
}
`
    document.head.appendChild(s)
  }, [])

  /* Chart interactivity – donut & bars tooltips */
  const [tip, setTip] = useState(null)

  return (
    <section className="ana-wrap" aria-label="Analytics & Team Activity">
      {/* Top controls */}
      <div className="ana-top">
        <div className="ana-title">📈 Analytics & Team Activity</div>
        <div className="ana-right" role="group" aria-label="Filters">
          {/* Range */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              className="ana-select"
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value)}
              title="Time range"
            >
              <option value="14">Last 14d</option>
              <option value="30">Last 30d</option>
              <option value="90">Last 90d</option>
              <option value="custom">Custom…</option>
            </select>
            {rangePreset === "custom" && (
              <>
                <input
                  className="ana-input"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  aria-label="Start date"
                />
                <span>→</span>
                <input
                  className="ana-input"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  aria-label="End date"
                />
              </>
            )}
          </div>

          {/* Status chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_LIST.map((s) => (
              <button
                key={s}
                className={`ana-chip ${statusFilter.includes(s) ? "active" : ""}`}
                onClick={() => setStatusFilter((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]))}
                title={`Status: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Campaign type chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CTYPES.map((c) => (
              <button
                key={c}
                className={`ana-chip ${ctypeFilter.includes(c) ? "active" : ""}`}
                onClick={() => setCtypeFilter((arr) => (arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]))}
                title={`Campaign: ${c}`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Assignee select */}
          <select
            className="ana-select"
            multiple
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(Array.from(e.target.selectedOptions).map((o) => o.value))}
            title="Filter assignees (hold Ctrl/Cmd for multi-select)"
            style={{ minWidth: 160 }}
          >
            {MEMBERS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            className="ana-btn ghost"
            onClick={() => {
              setStatusFilter([...STATUS_LIST])
              setCtypeFilter([...CTYPES])
              setAssigneeFilter([])
              setRangePreset("30")
              setCustomStart(iso(addDays(new Date(), -30)))
              setCustomEnd(iso(new Date()))
            }}
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="ana-kpis">
        <div className="kpi blue" title="Completed / Total in the selected range">
          <div className="n">{metrics.completionRate}%</div>
          <div className="l">Completion rate</div>
        </div>
        <div className="kpi red" title="Overdue / Total in the selected range">
          <div className="n">{metrics.overduePct}%</div>
          <div className="l">Overdue %</div>
        </div>
        <div className="kpi yellow" title="Average duration (Completed tasks only)">
          <div className="n">{metrics.avgDur}d</div>
          <div className="l">Avg. task duration</div>
        </div>
        <div className="kpi green" title="Tasks marked Completed within the range">
          <div className="n">{metrics.completed}</div>
          <div className="l">Completed</div>
        </div>
        <div className="kpi gray" title="Sum of time logs inside the range (demo)">
          <div className="n">{metrics.timeHrs}h</div>
          <div className="l">Time logged</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="ana-grid">
        <div className="card">
          <h4>Tasks by Status</h4>
          <DonutChart
            data={byStatus}
            size={260}
            inner={72}
            onClick={(label) => {
              // toggle status by clicking the segment
              setStatusFilter((arr) => (arr.includes(label) ? arr.filter((x) => x !== label) : [...arr, label]))
            }}
            onTip={setTip}
          />
          <Legend items={byStatus} />
        </div>

        <div className="card">
          <h4>Time Logged by Day</h4>
          <LineChart data={timeSeries} height={160} onTip={setTip} />
          <div className="legend" style={{ marginTop: 6, color: TK.muted, fontSize: 12 }}>
            Range: {fmtShort(winStart)} → {fmtShort(winEnd)}
          </div>
        </div>

        <div className="card">
          <h4>Tasks by Campaign Type</h4>
          <HBarChart
            data={byType}
            height={200}
            onClick={(label) =>
              setCtypeFilter((arr) => (arr.includes(label) ? arr.filter((x) => x !== label) : [...arr, label]))
            }
            onTip={setTip}
          />
          <Legend items={byType} />
        </div>

        <div className="card">
          <h4>Recent Activity (last 7 days)</h4>
          <ActivityFeed tasks={TASKS} />
        </div>
      </div>

      {/* Tooltip for charts */}
      {tip && (
        <div className="tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <div style={{ fontSize: 11, opacity: 0.85 }}>{tip.label}</div>
          <div style={{ fontWeight: 800 }}>{tip.value}</div>
        </div>
      )}

      {/* Team performance */}
      <div className="table-wrap">
        <div className="ana-top" style={{ borderTop: `1px solid ${TK.border}` }}>
          <div className="ana-title">🧑‍🤝‍🧑 Team Performance</div>
          <div className="ana-right">
            <button className="ana-btn ghost" onClick={exportCsv} title="Export team table to CSV">
              ⬇️ Export CSV
            </button>
          </div>
        </div>

        <div style={{ overflow: "auto", maxHeight: "60vh" }}>
          <table className="team-table" role="table" aria-label="Team performance">
            <thead>
              <tr>
                {[
                  { key: "name", label: "Assignee" },
                  { key: "assigned", label: "Assigned" },
                  { key: "completed", label: "Completed" },
                  { key: "overdue", label: "Overdue" },
                  { key: "avgDays", label: "Avg Duration (d)" },
                  { key: "timeHrs", label: "Time Logged (h)" },
                ].map((c) => (
                  <th key={c.key}>
                    <span>{c.label}</span>
                    {c.key !== "name" && (
                      <button
                        className="sort"
                        title="Sort"
                        onClick={() => {
                          if (sortKey !== c.key) {
                            setSortKey(c.key)
                            setSortDir("desc")
                          } else {
                            setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                          }
                        }}
                        aria-label={`Sort by ${c.label}`}
                      >
                        {sortKey === c.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTeam.map((r) => (
                <tr className="tr" key={r.user.id}>
                  <td>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <div className="avatar" style={{ background: r.user.color }}>
                        {r.user.initials}
                      </div>
                      <span>{r.user.name}</span>
                    </div>
                  </td>
                  <td>{r.assigned}</td>
                  <td>
                    <span className="badge" style={{ background: `${TK.status.completed}1A`, color: "#1F7A47" }}>
                      {r.completed}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${TK.status.overdue}1A`, color: "#9B1C1E" }}>
                      {r.overdue}
                    </span>
                  </td>
                  <td>{r.avgDays}</td>
                  <td>{r.timeHrs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────
   5) UI SUB‑COMPONENTS
   ───────────────────────────────────────────────────────── */
const Legend = ({ items }) => {
  return (
    <div className="legend">
      {items.map((i) => (
        <div
          key={i.label}
          title={`${i.label}: ${i.value}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <span className="dot" style={{ background: i.color }} />
          <span style={{ fontSize: 12 }}>
            {i.label} <b>· {i.value}</b>
          </span>
        </div>
      ))}
    </div>
  )
}

/* Donut Chart (pure SVG) */
const DonutChart = ({ data, size = 240, inner = 60, onClick, onTip }) => {
  const total = Math.max(
    1,
    data.reduce((a, b) => a + b.value, 0),
  )
  const cx = size / 2,
    cy = size / 2,
    r = size / 2 - 4

  let angle = -Math.PI / 2 // start at top
  const arcs = data.map((d) => {
    const frac = d.value / total
    const a0 = angle
    const a1 = angle + frac * Math.PI * 2
    angle = a1
    return { ...d, a0, a1 }
  })

  const arcPath = (a0, a1) => {
    const large = a1 - a0 > Math.PI ? 1 : 0
    const x0 = cx + r * Math.cos(a0)
    const y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${cx} ${cy} Z`
  }

  return (
    <div className="chart-wrap" style={{ width: "100%", display: "grid", placeItems: "center" }}>
      <svg width={size} height={size} role="img" aria-label="Tasks by status donut">
        {arcs.map((a, i) =>
          a.value > 0 ? (
            <path
              key={a.label}
              d={arcPath(a.a0, a.a1)}
              fill={a.color}
              opacity="0.9"
              onMouseMove={(e) =>
                onTip?.({
                  x: e.currentTarget.getBoundingClientRect().left + e.nativeEvent.offsetX,
                  y: e.currentTarget.getBoundingClientRect().top + e.nativeEvent.offsetY,
                  label: a.label,
                  value: a.value,
                })
              }
              onMouseLeave={() => onTip?.(null)}
              onClick={() => onClick?.(a.label)}
              style={{ cursor: "pointer" }}
            />
          ) : null,
        )}
        {/* hole */}
        <circle cx={cx} cy={cy} r={inner} fill="#fff" />
        {/* center text */}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontWeight="700"
          fontSize="14"
          fill={TK.muted}
        >
          {data.reduce((a, b) => a + b.value, 0)} tasks
        </text>
      </svg>
    </div>
  )
}

/* Horizontal Bar Chart */
const HBarChart = ({ data, height = 220, onClick, onTip }) => {
  const pad = 14
  const barH = 18
  const gap = 10
  const rows = data.length
  const H = pad * 2 + rows * (barH + gap)
  const W = 420

  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="chart-wrap">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tasks by campaign type">
        {data.map((d, i) => {
          const y = pad + i * (barH + gap)
          const w = Math.round((d.value / max) * (W - pad * 2 - 70))
          return (
            <g key={d.label} transform={`translate(${pad}, ${y})`}>
              <text x="0" y={barH - 4} fontSize="12" fill={TK.muted}>
                {d.label}
              </text>
              <rect
                x={110}
                y="0"
                width={w}
                height={barH}
                rx="4"
                fill={d.color}
                opacity="0.95"
                onClick={() => onClick?.(d.label)}
                onMouseMove={(e) =>
                  onTip?.({
                    x: e.currentTarget.getBoundingClientRect().left + e.nativeEvent.offsetX,
                    y: e.currentTarget.getBoundingClientRect().top + e.nativeEvent.offsetY,
                    label: d.label,
                    value: d.value,
                  })
                }
                onMouseLeave={() => onTip?.(null)}
                style={{ cursor: "pointer" }}
              />
              <text x={110 + w + 8} y={barH - 4} fontSize="12" fontWeight="700">
                {d.value}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* Line Chart (time logged) */
const LineChart = ({ data, height = 160, onTip }) => {
  const W = 520
  const H = height
  const pad = 18

  const max = Math.max(1, ...data.map((d) => d.value))
  const xFor = (i) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1)
  const yFor = (v) => H - pad - (v / max) * (H - pad * 2)

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(d.value)}`).join(" ")

  return (
    <div className="chart-wrap">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Time logged line chart">
        {/* axis baseline */}
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke={TK.border} />
        <path d={path} fill="none" stroke={TK.brand} strokeWidth="2" />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(d.value)}
            r="3"
            fill={TK.brand}
            onMouseMove={(e) =>
              onTip?.({
                x: e.currentTarget.getBoundingClientRect().left + e.nativeEvent.offsetX,
                y: e.currentTarget.getBoundingClientRect().top + e.nativeEvent.offsetY,
                label: fmtShort(d.date),
                value: `${d.value}h`,
              })
            }
            onMouseLeave={() => onTip?.(null)}
          />
        ))}
      </svg>
    </div>
  )
}

/* Mini feed (last 7 days) */
const ActivityFeed = ({ tasks }) => {
  const cutoff = addDays(new Date(), -7)
  const recent = tasks.filter((t) => startOfDay(new Date(t.updatedAt)) >= startOfDay(cutoff)).slice(0, 12)
  if (recent.length === 0) return <div className="pill">No updates in last 7 days</div>

  return (
    <div className="feed">
      {recent.map((t) => {
        const m = MEMBERS.find((x) => x.id === t.assigneeId)
        return (
          <div key={t.id} className="feed-item">
            <span className="feed-dot" style={{ background: STATUS_COLOR[t.status] }} />
            <div style={{ lineHeight: "1.25" }}>
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: TK.muted }}>
                {fmtShort(t.updatedAt)} • {t.ctype} •{" "}
                <span className="badge" style={{ background: `${STATUS_COLOR[t.status]}1A`, color: "#1f2937" }}>
                  {t.status}
                </span>{" "}
                •{" "}
                <span className="pill" title={m?.name}>
                  {m?.name || "—"}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
