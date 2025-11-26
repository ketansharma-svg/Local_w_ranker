"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { Tooltip } from "antd"
import Cookies from "js-cookie"

/* ──────────────────────────────────────────────────────────────────────────
   0) DESIGN TOKENS (unchanged)
   ────────────────────────────────────────────────────────────────────────── */
const TOKENS = {
  brand: "#1090D0",
  textTitle: "#000000",
  textMuted: "#282829",
  surface: "#FFFFFF",
  surfaceSubtle: "#F5F7FA",
  borderSubtle: "#EFF0F6",
  borderStrong: "#E5E7EB",
  accentLight: "#D2EFFF",
  // Status
  status: {
    notStarted: "#CBD5E1",
    inProgress: "#1090D0",
    review: "#FF9F43",
    completed: "#28C76F",
    overdue: "#EA5455",
  },
  // Priority
  priority: {
    high: "#EA5455",
    medium: "#FF9F43",
    low: "#9AA4B2",
  },
}
const API_TO_UI = {
  not_started: "Not Started",
  working: "In Progress",      // UI label stays "In Progress"
  under_review: "Under Review",
  completed: "Completed",
};
const UI_TO_API = {
  "Not Started": "not_started",
  "In Progress": "working",
  "Under Review": "under_review",
  "Completed": "completed",
};

function toUiStatusFromApi(apiStatus) {
  const key = String(apiStatus || "").toLowerCase();
  return API_TO_UI[key] || "Not Started";
}

/* ──────────────────────────────────────────────────────────────────────────
   1) HELPERS
   ────────────────────────────────────────────────────────────────────────── */
const STATUS_COLOR = {
  "Not Started": TOKENS.status.notStarted,
  "In Progress": TOKENS.status.inProgress,
  "Under Review": TOKENS.status.review,
  Completed: TOKENS.status.completed,
}

const API_BASE = "https://dashboard.wranker.com/api/campaigns/activities"
/** API statuses we may need to fetch (map "Working" → "In Progress" for UI). */
const API_STATUS_ORDER = ["working", "under_review", "not_started", "completed"];
const UI_STATUS_ORDER = ["In Progress", "Under Review", "Not Started", "Completed"];

/** Map API status to UI status tokens used by the existing UI styles. */
function toUiStatus(apiStatus) {
  return apiStatus === "Working" ? "In Progress" : apiStatus
}

const isCompleted = (t) => t.status === "Completed"
const isOverdue = (t) => !!t.end && new Date(t.end) < startOfDay(new Date()) && t.status !== "Completed"

/* ──────────────────────────────────────────────────────────────────────────
   2) DATE UTILITIES (unchanged)
   ────────────────────────────────────────────────────────────────────────── */
const MS_DAY = 24 * 60 * 60 * 1000
function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function fmt(d) {
  return d.toISOString().slice(0, 10) // yyyy-mm-dd
}
function addDays(d, n) {
  return new Date(d.getTime() + n * MS_DAY)
}
function diffDays(a, b) {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_DAY)
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
function getMonthLabel(d) {
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" })
}
function daysBetween(a, b) {
  return Math.max(0, diffDays(b, a))
}

/* ──────────────────────────────────────────────────────────────────────────
   3) DATA MAPPING (API → UI)
   ────────────────────────────────────────────────────────────────────────── */
/** Fallback: generate a stable colour for avatars from any string/id */
function colorFromString(str) {
  let hash = 0
  for (let i = 0; i < String(str).length; i++) {
    hash = String(str).charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 60%)`
}

/** Try best-effort to map API task to the UI's task model. */
function mapApiTaskToUi(r) {
  const startDate = r?.date ? startOfDay(new Date(r.date))
    : r?.created_at ? startOfDay(new Date(r.created_at)) : null;
  const endDate = r?.due_date ? startOfDay(new Date(r.due_date))
    : startDate ? addDays(startDate, 2) : null;

  const assignee = r?.assigned_to
    ? { id: String(r.assigned_to), name: "Assigned", avatarColor: colorFromString(r.assigned_to) }
    : { id: "unassigned", name: "Unassigned", avatarColor: "#9AA4B2" };

  return {
    id: r.id,
    title: r.title || "Untitled Task",
    status: toUiStatusFromApi(r.status), // ← use API→UI mapping here
    priority: (r.priority || "Low").replace(/^\w/, (m) => m.toUpperCase()),
    assignee,
    campaignType: null,
    start: startDate ? fmt(startDate) : undefined,
    end: endDate ? fmt(endDate) : undefined,
  };
}


/** Build groups from the provided campaignData (as_manager / as_member). */
function buildGroupsFromCampaign(campaignData) {
  const asManager = (campaignData?.as_manager || []).map((p) => ({
    id: p.project_id,
    name: p.project_name || p.domain || `Project ${p.project_id}`,
    domain: p.domain,
    url: p.url,
    summary: p.summary || {},
    tasks: [],
    loading: false,
    loaded: false,
    nextQueue: [], // [{ status, next }]
    error: null,
  }))

  const asMember = (campaignData?.as_member || []).map((p) => ({
    id: p.project_id,
    name: p.project_name || p.domain || `Project ${p.project_id}`,
    domain: p.domain,
    url: p.url,
    summary: p.summary || {},
    tasks: [],
    loading: false,
    loaded: false,
    nextQueue: [],
    error: null,
  }))

  const out = []
  if (asManager.length) out.push({ id: "as_manager", name: "Projects I Manage", projects: asManager })
  if (asMember.length) out.push({ id: "as_member", name: "Projects I Contribute To", projects: asMember })
  if (!out.length) out.push({ id: "empty", name: "Projects", projects: [] })
  return out
}

/* ──────────────────────────────────────────────────────────────────────────
   4) PAGE ENTRY
   ────────────────────────────────────────────────────────────────────────── */
export default function GanttChartView({ campaignData }) {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", color: TOKENS.textTitle }}>
      <Style />
      {/* Header (unchanged visuals) */}
      <div className="g-header">
        <div className="g-title">📅 Gantt Chart – All Projects</div>
        <div className="g-actions">
          <button className="g-btn">+ Create Task</button>
          <button className="g-btn ghost">Filters (2)</button>
        </div>
      </div>
      <GanttPanel campaignData={campaignData} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   5) MAIN PANEL (data flow fully integrated)
   ────────────────────────────────────────────────────────────────────────── */
function GanttPanel({ campaignData }) {
  const today = startOfDay(new Date())

  // Build groups from API-provided campaignData
  const initialGroups = useMemo(() => buildGroupsFromCampaign(campaignData), [campaignData])
  const [groups, setGroups] = useState(initialGroups)

  // Collapsed: groups open, projects collapsed (as requested for many projects)
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [collapsedProjects, setCollapsedProjects] = useState(() => {
    const map = {}
    initialGroups.forEach((g) => g.projects.forEach((p) => (map[p.id] = true)))
    return map
  })

  // Timeline state
  const [scale, setScale] = useState("day")
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [assigneeId] = useState(null) // wire in when current user id is known
  const [drawerTask, setDrawerTask] = useState(null)
  const [snack, setSnack] = useState("")

  // Window: Last 30d → Next 60d
  const [winStart, setWinStart] = useState(addDays(today, -30))
  const [winEnd, setWinEnd] = useState(addDays(today, +60))

  // Pane refs for scroll sync
  const leftPaneRef = useRef(null)
  const rightPaneRef = useRef(null)
  const headerRef = useRef(null)

  // px-per-day by scale (unchanged)
  const pxPerDay = useMemo(() => {
    switch (scale) {
      case "day":
        return 28
      case "week":
        return 12
      case "month":
        return 3.5
      default:
        return 28
    }
  }, [scale])

  const allTasks = useMemo(() => groups.flatMap((g) => g.projects.flatMap((p) => p.tasks)), [groups])
  const unscheduled = useMemo(() => allTasks.filter((t) => !t.start || !t.end), [allTasks])

  // Scroll sync (vertical)
  useEffect(() => {
    const left = leftPaneRef.current
    const right = rightPaneRef.current
    if (!left || !right) return
    const onScrollLeft = () => (right.scrollTop = left.scrollTop)
    const onScrollRight = () => (left.scrollTop = right.scrollTop)
    left.addEventListener("scroll", onScrollLeft)
    right.addEventListener("scroll", onScrollRight)
    return () => {
      left.removeEventListener("scroll", onScrollLeft)
      right.removeEventListener("scroll", onScrollRight)
    }
  }, [])

  // Header horizontal sync
  useEffect(() => {
    const right = rightPaneRef.current
    const head = headerRef.current
    if (!right || !head) return
    const onScrollRight = () => (head.scrollLeft = right.scrollLeft)
    right.addEventListener("scroll", onScrollRight)
    return () => right.removeEventListener("scroll", onScrollRight)
  }, [])

  // Map a day to x
  function xForDay(d) {
    return diffDays(d, winStart) * pxPerDay
  }
  function dayForX(x) {
    const d = addDays(winStart, Math.round(x / pxPerDay))
    return startOfDay(d)
  }

  function barRect(t) {
    if (!t.start || !t.end) return null
    const s = startOfDay(new Date(t.start))
    const e = startOfDay(new Date(t.end))
    const days = Math.max(1, daysBetween(e, s) + 1)
    const left = xForDay(s)
    return { left, width: days * pxPerDay, start: s, end: e, days }
  }

  function updateTaskDates(taskId, start, end) {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        projects: g.projects.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, start: fmt(start), end: fmt(end) } : t)),
        })),
      })),
    )
    setSnack("Dates updated — Undo")
    toast.success("Task dates updated (local)")
    setTimeout(() => setSnack(""), 3000)
  }

  function onUndo() {
    // Future: maintain history stack for real undo
    setSnack("")
  }

  function scheduleNow(taskId) {
    const s = startOfDay(new Date())
    const e = addDays(s, 2)
    updateTaskDates(taskId, s, e)
  }

  const filteredGroups = useMemo(() => {
    if (!showMineOnly || !assigneeId) return groups
    return groups.map((g) => ({
      ...g,
      projects: g.projects.map((p) => ({
        ...p,
        tasks: p.tasks.filter((t) => t.assignee.id === assigneeId),
      })),
    }))
  }, [groups, showMineOnly, assigneeId])

  function handleKeyZoom(e) {
    const key = String(e.key || "").toLowerCase()
    if (e.altKey && key === "d") setScale("day")
    if (e.altKey && key === "w") setScale("week")
    if (e.altKey && key === "m") setScale("month")
  }

  // Header ticks
  const monthTicks = useMemo(() => {
    const out = []
    let cursor = startOfDay(new Date(winStart))
    cursor.setDate(1)
    while (cursor <= winEnd) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      const left = xForDay(cursor)
      const width = Math.max(1, diffDays(next, cursor)) * pxPerDay
      out.push({ label: getMonthLabel(cursor), left, width })
      cursor = next
    }
    return out
  }, [winStart, winEnd, pxPerDay])

  const subTicks = useMemo(() => {
    const out = []
    if (scale === "day") {
      let c = startOfDay(new Date(winStart))
      while (c <= winEnd) {
        out.push({ label: String(c.getDate()), left: xForDay(c) })
        c = addDays(c, 1)
      }
    } else if (scale === "week") {
      let c = startOfDay(new Date(winStart))
      while (c <= winEnd) {
        out.push({ label: `W${weekNumber(c)}`, left: xForDay(c) })
        c = addDays(c, 7)
      }
    } else {
      monthTicks.forEach((m) => out.push({ label: m.label, left: m.left }))
    }
    return out
  }, [winStart, winEnd, pxPerDay, scale, monthTicks])

  // Weekend shading (day scale only)
  const weekendRects = useMemo(() => {
    if (scale !== "day") return []
    const out = []
    let c = startOfDay(new Date(winStart))
    while (c <= winEnd) {
      const day = c.getDay()
      if (day === 0 || day === 6) {
        out.push({ left: xForDay(c), width: pxPerDay })
      }
      c = addDays(c, 1)
    }
    return out
  }, [winStart, winEnd, pxPerDay, scale])

  /* ────────────────────────────────────────────────────────────────────────
     5.a) Project-level fetching (lazy on expand)
     ──────────────────────────────────────────────────────────────────────── */
  function updateProjectById(projectId, updater) {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        projects: g.projects.map((p) => (p.id === projectId ? updater(p) : p)),
      })),
    )
  }

function statusesToFetchFromSummary(summary) {
  if (!summary) return ["not_started"]; // safe default

  // Accept either Title Case or snake_case in summary and normalize to API keys
  const knownUiKeys = Object.keys(UI_TO_API);
  const presentApi = [];

  for (const [k, v] of Object.entries(summary)) {
    const count = Number(v || 0);
    if (!count) continue;

    const maybeUi = knownUiKeys.includes(k) ? UI_TO_API[k] : null;
    const maybeApi = maybeUi || String(k).toLowerCase(); // if backend already returns snake_case
    if (API_STATUS_ORDER.includes(maybeApi)) presentApi.push(maybeApi);
  }

  return presentApi.length ? presentApi : ["not_started"];
}


async function fetchStatusPage(projectId, statusApiKey, pageUrl) {
  const accessToken = Cookies.get("login_access_token_wrank");

  // Ensure snake_case going out
  const safeStatus = API_STATUS_ORDER.includes(statusApiKey)
    ? statusApiKey
    : (UI_TO_API[statusApiKey] || "not_started");

  const url = pageUrl || `${API_BASE}/${encodeURIComponent(projectId)}/?status=${encodeURIComponent(safeStatus)}&page=1&page_size=10`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch "${safeStatus}" (HTTP ${res.status})`);

  const json = await res.json();
  const tasks = (json.results || []).map(mapApiTaskToUi); // map below handles API→UI
  return { tasks, next: json.next || null, count: json.count || 0 };
}


  async function loadProjectTasks(project) {
    updateProjectById(project.id, (p) => ({ ...p, loading: true, error: null }))
    try {
      const statuses = statusesToFetchFromSummary(project.summary)
      // Fetch initial page for each status (parallel to keep UX snappy but limited to initial load)
      const results = await Promise.all(
        statuses.map((s) =>
          fetchStatusPage(project.id, s).then(
            ({ tasks, next }) => ({ status: s, tasks, next }),
            (err) => ({ status: s, tasks: [], next: null, error: err?.message || String(err) }),
          ),
        ),
      )

      const combined = []
      const nextQueue = []
      let hadError = false
      results.forEach((r) => {
        if (r.error) {
          hadError = true
          toast.error(`Failed loading ${toUiStatus(r.status)} for ${project.name}`)
        }
        combined.push(...r.tasks)
        if (r.next) nextQueue.push({ status: r.status, next: r.next })
      })

      updateProjectById(project.id, (p) => ({
        ...p,
        tasks: combined,
        nextQueue,
        loaded: true,
        loading: false,
        error: hadError ? "Some statuses failed to load" : null,
      }))

      toast.success(
        `Loaded ${combined.length} task${combined.length === 1 ? "" : "s"} for ${project.name}`,
      )
    } catch (e) {
      updateProjectById(project.id, (p) => ({ ...p, loading: false, loaded: false, error: String(e?.message || e) }))
      toast.error(`Failed to load tasks for ${project.name}`)
    }
  }

  async function handleLoadMore(project) {
    if (!project?.nextQueue?.length) return
    const [{ status, next }, ...rest] = project.nextQueue
    updateProjectById(project.id, (p) => ({ ...p, loading: true, nextQueue: rest }))
    try {
      const { tasks, next: nextUrl } = await fetchStatusPage(project.id, status, next)
      updateProjectById(project.id, (p) => ({
        ...p,
        loading: false,
        tasks: [...p.tasks, ...tasks],
        nextQueue: nextUrl ? [...p.nextQueue, { status, next: nextUrl }] : p.nextQueue,
      }))
    } catch (e) {
      updateProjectById(project.id, (p) => ({ ...p, loading: false }))
      toast.error("Could not load more tasks. Please try again.")
    }
  }

  /* ────────────────────────────────────────────────────────────────────────
     5.b) Render
     ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="gantt-root" onKeyDown={handleKeyZoom}>
      {/* Controls (unchanged visuals) */}
      <div className="g-controls">
        <div className="segmented">
          <button
            aria-pressed={scale === "day"}
            className={`seg ${scale === "day" ? "active" : ""}`}
            onClick={() => setScale("day")}
            title="Day (Alt+D)"
          >
            Day
          </button>
          <button
            aria-pressed={scale === "week"}
            className={`seg ${scale === "week" ? "active" : ""}`}
            onClick={() => setScale("week")}
            title="Week (Alt+W)"
          >
            Week
          </button>
          <button
            aria-pressed={scale === "month"}
            className={`seg ${scale === "month" ? "active" : ""}`}
            onClick={() => setScale("month")}
            title="Month (Alt+M)"
          >
            Month
          </button>
        </div>

        <div className="g-spacer" />

        <label className="switch">
          <input type="checkbox" checked={showMineOnly} onChange={(e) => setShowMineOnly(e.target.checked)} />
          <span>Show My Tasks</span>
        </label>

        <button
          className="g-btn ghost"
          onClick={() => {
            const span = daysBetween(winEnd, winStart)
            const half = Math.floor(span / 2)
            setWinStart(addDays(today, -half))
            setWinEnd(addDays(today, +half))
            const pane = rightPaneRef.current
            if (!pane) return
            const x = xForDay(today) - pane.clientWidth / 2
            pane.scrollTo({ left: x > 0 ? x : 0, behavior: "smooth" })
          }}
          title="Jump to Today"
        >
          Today
        </button>

        <button
          className="g-btn ghost"
          onClick={() => {
            const allCollapsed = Object.values(collapsedGroups).every(Boolean)
            if (allCollapsed) {
              setCollapsedGroups({})
              // re-collapse all projects again (as per requirement)
              const map = {}
              groups.forEach((g) => g.projects.forEach((p) => (map[p.id] = true)))
              setCollapsedProjects(map)
            } else {
              const cg = {}
              const cp = {}
              groups.forEach((g) => {
                cg[g.id] = true
                g.projects.forEach((p) => {
                  cp[p.id] = true
                })
              })
              setCollapsedGroups(cg)
              setCollapsedProjects(cp)
            }
          }}
        >
          Collapse/Expand All
        </button>
      </div>

      {/* Unscheduled tasks (dynamic, from API-mapped tasks without dates) */}
      {unscheduled.length > 0 && (
        <div className="unscheduled">
          <div className="uns-title">Unscheduled tasks</div>
          <div className="uns-list">
            {unscheduled.map((t) => (
              <div key={`uns-${t.id}`} className="uns-chip">
                <span
                  className="prior-dot"
                  style={{
                    background: TOKENS.priority[(t.priority || "Low").toLowerCase()],
                  }}
                />
                <span className="uns-label">{t.title}</span>
                <button className="g-btn xs" onClick={() => scheduleNow(t.id)}>
                  Schedule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="g-grid">
        {/* LEFT TREE PANE */}
        <div className="left-pane" ref={leftPaneRef} role="treegrid" aria-label="Tasks tree" tabIndex={0}>
          <div className="left-header">Tasks</div>

          {filteredGroups.map((group) => {
            const gCollapsed = !!collapsedGroups[group.id]
            return (
              <div key={group.id} className="group">
                <div className="group-head">
                  {/* Keep original triangle glyphs to avoid visual change */}
                  <button
                    className="chev"
                    onClick={() => setCollapsedGroups((s) => ({ ...s, [group.id]: !gCollapsed }))}
                    aria-label={`${gCollapsed ? "Expand" : "Collapse"} group ${group.name}`}
                  >
                    {gCollapsed ? "▶" : "▼"}
                  </button>
                  <div className="group-title">{group.name}</div>
                </div>

                {!gCollapsed &&
                  group.projects.map((project) => {
                    const pCollapsed = !!collapsedProjects[project.id]
                    return (
                      <div key={project.id} className="project">
                        <div className="project-head">
                          {/* Keep original triangle glyphs to avoid visual change */}
                          <button
                            className="chev"
                            onClick={async () => {
                              setCollapsedProjects((s) => ({ ...s, [project.id]: !pCollapsed }))
                              // On first expand → lazy-load tasks for this project
                              if (pCollapsed && !project.loaded && !project.loading) {
                                await loadProjectTasks(project)
                              }
                            }}
                            aria-label={`${pCollapsed ? "Expand" : "Collapse"} project ${project.name}`}
                          >
                            {pCollapsed ? "▶" : "▼"}
                          </button>

                          <div className="proj-title" title={project.name}>
                            {project.name}
                          </div>

                          {/* Inline loader + Load More button (does not alter row heights) */}
                          {project.loading && (
                            <Loader2 size={16} className="spin" aria-label="Loading tasks" title="Loading tasks…" />
                          )}

                          {project.nextQueue?.length > 0 && !project.loading && (
                            <button className="g-btn xs" onClick={() => handleLoadMore(project)} title="Load more tasks">
                              Load More
                            </button>
                          )}

                          <Tooltip title={project.url || "Open Project"}>
                            <button
                              className="view-link"
                              title="View Project"
                              onClick={() => {
                                if (project.url) window.open(project.url, "_blank", "noopener,noreferrer")
                              }}
                            >
                              🔎
                            </button>
                          </Tooltip>
                        </div>

                        {/* Tasks list */}
                        <AnimatePresence initial={false}>
                          {!pCollapsed && (
                            <motion.div
                              key={`proj-${project.id}-body`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              {project.tasks.map((task) => (
                                <div key={task.id} className="task-row">
                                  <div className="assignee" title={task.assignee.name} aria-hidden>
                                    <div className="avatar" style={{ background: task.assignee.avatarColor }}>
                                      {task.assignee.name.slice(0, 1).toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="task-title" title={task.title}>
                                    <span
                                      className="prior-dot"
                                      style={{
                                        background: TOKENS.priority[(task.priority || "Low").toLowerCase()],
                                      }}
                                    />
                                    {task.title}
                                  </div>
                                  <div className="task-meta">
                                    <span
                                      className="status-pill"
                                      style={{
                                        background: tint(STATUS_COLOR[task.status], 0.18),
                                        color: darken(STATUS_COLOR[task.status], 0.2),
                                      }}
                                    >
                                      {task.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {/* Note: "Load More" and loader are kept in project header to avoid row misalignment */}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>

        {/* RIGHT TIMELINE PANE */}
        <div className="right-pane" ref={rightPaneRef} role="grid" aria-label="Timeline grid" tabIndex={0}>
          {/* Sticky timeline header */}
          <div className="time-header" ref={headerRef}>
            <div className="month-band">
              {monthTicks.map((m, i) => (
                <div key={i} className="month-block" style={{ left: m.left, width: m.width }} title={m.label}>
                  {m.label}
                </div>
              ))}
            </div>
            <div className="sub-band">
              {subTicks.map((t, i) => (
                <div key={i} className="tick" style={{ left: t.left }}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* Weekend shading */}
          {weekendRects.map((w, i) => (
            <div key={i} className="weekend" style={{ left: w.left, width: w.width }} />
          ))}

          {/* Today line */}
          <div className="today" style={{ left: xForDay(today) }} title="Today" aria-hidden />

          {/* Rows aligned with left pane */}
          <div className="rows">
            {filteredGroups.map((group) => {
              const gCollapsed = !!collapsedGroups[group.id]
              const groupTasksHeight = getGroupHeight(group, collapsedProjects, gCollapsed)
              return (
                <div key={group.id} className="group-rows" style={{ height: groupTasksHeight }}>
                  {!gCollapsed &&
                    group.projects.map((project) => {
                      const pCollapsed = !!collapsedProjects[project.id]
                      const projectTasksHeight = pCollapsed ? 40 : Math.max(40, project.tasks.length * 40)
                      return (
                        <div key={project.id} className="project-rows" style={{ height: projectTasksHeight }}>
                          {!pCollapsed &&
                            project.tasks.map((task, idx) => {
                              const rect = barRect(task)
                              const rowTop = idx * 40 + 10
                              return (
                                <TaskBar
                                  key={task.id}
                                  task={task}
                                  rect={rect}
                                  rowTop={rowTop}
                                  pxPerDay={pxPerDay}
                                  todayX={xForDay(today)}
                                  onOpen={() => setDrawerTask(task)}
                                  onUpdate={(s, e) => updateTaskDates(task.id, s, e)}
                                />
                              )
                            })}
                        </div>
                      )
                    })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Drawer (unchanged visuals) */}
      {drawerTask && <TaskDrawer task={drawerTask} onClose={() => setDrawerTask(null)} />}

      {/* Snackbar (Undo) */}
      {snack && (
        <div className="snack">
          {snack}{" "}
          <button className="link" onClick={onUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

/* Compute dynamic heights to keep row alignment between panes (unchanged) */
function getGroupHeight(g, collapsedProjects, gCollapsed) {
  if (gCollapsed) return 40
  let total = 40 // group header band
  g.projects.forEach((p) => {
    const pCollapsed = !!collapsedProjects[p.id]
    if (pCollapsed) total += 40
    else total += Math.max(40, p.tasks.length * 40)
  })
  return total
}

/* Week number label (unchanged) */
function weekNumber(d) {
  const MS_DAY = 24 * 60 * 60 * 1000
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date - yearStart) / MS_DAY + 1) / 7)
}

/* ──────────────────────────────────────────────────────────────────────────
   6) TASK BAR (unchanged logic)
   ────────────────────────────────────────────────────────────────────────── */
function TaskBar({ task, rect, rowTop, pxPerDay, todayX, onOpen, onUpdate }) {
  const barRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const [hover, setHover] = useState(false)

  if (!rect) return null

  const bg = STATUS_COLOR[task.status]
  const overdueStyle =
    isOverdue(task) && !isCompleted(task)
      ? {
          outline: `2px solid ${TOKENS.status.overdue}`,
          boxShadow: `inset -2px 0 0 ${TOKENS.status.overdue}`,
        }
      : {}

  function onPointerDown(e, mode) {
    if (!barRef.current) return
    setDrag({
      mode, // "move" | "resize-left" | "resize-right"
      startX: e.clientX,
      origLeft: rect.left,
      origWidth: rect.width,
      origStart: rect.start,
      origEnd: rect.end,
    })
    e.target.setPointerCapture?.(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  }

  function onPointerMove(e) {
    if (!drag || !barRef.current) return
    const dx = Math.round((e.clientX - drag.startX) / pxPerDay) * pxPerDay

    if (drag.mode === "move") {
      const newLeft = Math.max(0, drag.origLeft + dx)
      const deltaDays = Math.round((newLeft - drag.origLeft) / pxPerDay)
      const ns = addDays(drag.origStart, deltaDays)
      const ne = addDays(drag.origEnd, deltaDays)
      barRef.current.style.left = `${newLeft}px`
      barRef.current.style.width = `${drag.origWidth}px`
      barRef.current.dataset.preview = `${fmt(ns)}→${fmt(ne)}`
    } else if (drag.mode === "resize-left") {
      const newLeft = clamp(drag.origLeft + dx, 0, drag.origLeft + drag.origWidth - pxPerDay)
      const newWidth = drag.origWidth + (drag.origLeft - newLeft)
      const deltaDays = Math.round((drag.origLeft - newLeft) / pxPerDay)
      const ns = addDays(drag.origStart, -deltaDays)
      barRef.current.style.left = `${newLeft}px`
      barRef.current.style.width = `${newWidth}px`
      barRef.current.dataset.preview = `${fmt(ns)}→${fmt(drag.origEnd)}`
    } else if (drag.mode === "resize-right") {
      const newWidth = clamp(drag.origWidth + dx, pxPerDay, 99999)
      const deltaDays = Math.round((newWidth - drag.origWidth) / pxPerDay)
      const ne = addDays(drag.origEnd, deltaDays)
      barRef.current.style.width = `${newWidth}px`
      barRef.current.dataset.preview = `${fmt(drag.origStart)}→${fmt(ne)}`
    }
  }

  function onPointerUp() {
    if (!drag || !barRef.current) return
    const el = barRef.current
    const left = Number.parseFloat(el.style.left || String(rect.left))
    const width = Number.parseFloat(el.style.width || String(rect.width))
    const deltaLeft = Math.round((left - drag.origLeft) / pxPerDay)
    const deltaWidth = Math.round((width - drag.origWidth) / pxPerDay)

    if (drag.mode === "move") {
      const ns = addDays(drag.origStart, deltaLeft)
      const ne = addDays(drag.origEnd, deltaLeft)
      onUpdate(ns, ne)
    } else if (drag.mode === "resize-left") {
      const ns = addDays(drag.origStart, -deltaLeft)
      onUpdate(ns, drag.origEnd)
    } else {
      const ne = addDays(drag.origEnd, deltaWidth)
      onUpdate(drag.origStart, ne)
    }
    el.removeAttribute("data-preview")
    setDrag(null)
  }

  return (
    <>
      <div className="row-guide" style={{ top: rowTop + 10 }} />
      <div
        ref={barRef}
        className="bar"
        role="button"
        aria-label={`Task ${task.title} from ${task.start || "—"} to ${task.end || "—"}, ${task.status}`}
        style={{ top: rowTop, left: rect.left, width: rect.width, background: bg, ...overdueStyle }}
        onPointerDown={(e) => onPointerDown(e, "move")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onOpen}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={`${task.title}\n${task.status} • ${task.priority}\n${task.assignee.name}\n${fmt(rect.start)} → ${fmt(rect.end)} (${rect.days}d)${isOverdue(task) ? "\n⚠ Overdue" : ""}`}
      >
        <div className="bar-content">
          <span className="bar-title">{task.title}</span>
        </div>
        <div className="handle left" onPointerDown={(e) => onPointerDown(e, "resize-left")} title="Resize start" />
        <div className="handle right" onPointerDown={(e) => onPointerDown(e, "resize-right")} title="Resize end" />
      </div>
      {hover && <div className="today-dot" style={{ left: todayX, top: rowTop + 10 }} />}
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   7) TASK DRAWER (unchanged visuals; dynamic data)
   ────────────────────────────────────────────────────────────────────────── */
function TaskDrawer({ task, onClose }) {
  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label={`Task ${task.title}`}>
      <div className="drawer-head">
        <div className="drawer-title">
          <span
            className="status-pill"
            style={{ background: tint(STATUS_COLOR[task.status], 0.18), color: darken(STATUS_COLOR[task.status], 0.2) }}
          >
            {task.status}
          </span>
          <span className="drawer-name">{task.title}</span>
        </div>
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="drawer-body">
        <div className="row">
          <label>Assignee</label>
          <div className="avatar" style={{ background: task.assignee.avatarColor }}>
            {task.assignee.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="text">{task.assignee.name}</div>
        </div>
        <div className="row">
          <label>Priority</label>
          <div
            className="pill"
            style={{
              background: tint(priorityColor(task.priority || "Low"), 0.15),
              color: darken(priorityColor(task.priority || "Low"), 0.2),
            }}
          >
            {task.priority || "Low"}
          </div>
        </div>
        <div className="row">
          <label>Dates</label>
          <div className="text">
            {task.start ? task.start : "—"} → {task.end ? task.end : "—"}
          </div>
        </div>
        <div className="row">
          <label>Campaign</label>
          <div className="text">{task.campaignType || "—"}</div>
        </div>
      </div>
      <div className="drawer-foot">
        <button className="g-btn ghost" onClick={onClose}>
          Close
        </button>
        <button className="g-btn">Open in Task Manager</button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   8) STYLE (unchanged look; only added a spin keyframe)
   ────────────────────────────────────────────────────────────────────────── */
function Style() {
  return (
    <style>{`
/* Header (simulated) */
.g-header {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  background: ${TOKENS.surface}; border-bottom: 1px solid ${TOKENS.borderSubtle};
  padding: 12px 16px;
}
.g-title { font-size: 18px; font-weight: 700; }
.g-actions { display: flex; gap: 8px; }
.g-btn {
  border: 1px solid ${TOKENS.brand}; background: ${TOKENS.brand}; color: #fff;
  border-radius: 10px; padding: 6px 10px; font-size: 14px; cursor: pointer;
}
.g-btn.ghost { background: transparent; color: ${TOKENS.brand}; }
.g-btn.xs { padding: 2px 8px; font-size: 12px; }

/* Panel Controls */
.g-controls {
  display:flex; align-items:center; gap:12px;
  padding: 8px 12px; border-bottom:1px solid ${TOKENS.borderSubtle}; background:${TOKENS.surface};
  position: sticky; top: 48px; z-index: 9;
}
.segmented { display:flex; border:1px solid ${TOKENS.borderSubtle}; border-radius: 10px; overflow:hidden; }
.seg { background:#fff; border:0; padding:6px 10px; cursor:pointer; }
.seg.active { background:${TOKENS.accentLight}; color:${TOKENS.brand}; font-weight:600; }
.g-spacer { flex:1; }
.switch { display:flex; align-items:center; gap:6px; color:${TOKENS.textMuted}; }

/* Unscheduled */
.unscheduled { padding: 8px 12px; background: ${TOKENS.surfaceSubtle}; border-bottom:1px solid ${TOKENS.borderSubtle}; }
.uns-title { font-size: 12px; color:${TOKENS.textMuted}; margin-bottom:4px; }
.uns-list { display:flex; flex-wrap:wrap; gap:8px; }
.uns-chip { background:#fff; border:1px solid ${TOKENS.borderSubtle}; border-radius:999px; padding:4px 8px; display:flex; align-items:center; gap:8px; }
.uns-label { font-size:13px; }
.prior-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }

/* Grid Layout (two panes) */
.g-grid { display:grid; grid-template-columns: 340px 1fr; height: calc(100vh - 180px); }
.left-pane, .right-pane { overflow:auto; position:relative; }
.left-pane { border-right:1px solid ${TOKENS.borderSubtle}; background:${TOKENS.surface}; }
.right-pane { background:${TOKENS.surface}; }

/* Left pane (tree) */
.left-header { position: sticky; top:0; z-index: 7; background:${TOKENS.surface}; padding:10px 12px; border-bottom:1px solid ${TOKENS.borderSubtle}; font-weight:600; }
.group { border-bottom:1px solid ${TOKENS.borderSubtle}; }
.group-head { display:flex; align-items:center; gap:6px; padding:8px 12px; background:${TOKENS.surfaceSubtle}; position: sticky; top: 36px; z-index: 1; }
.group-title { font-weight:600; font-size:14px; }
.project { }
.project-head { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px dashed ${TOKENS.borderSubtle}; }
.proj-title { font-weight:600; font-size:14px; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.view-link { border:0; background:transparent; color:${TOKENS.brand}; cursor:pointer; }
.task-row { display:flex; align-items:center; gap:8px; padding:8px 12px; height:40px; }
.assignee .avatar { width:24px; height:24px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; }
.task-title { flex:1; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.task-meta { }
.status-pill { border-radius:999px; font-size:12px; padding:2px 8px; }

/* Right pane (timeline) */
.time-header {
  position: sticky; top:0; z-index:8; background:${TOKENS.surface}; border-bottom:1px solid ${TOKENS.borderSubtle};
  height: 48px; overflow:hidden; white-space:nowrap;
}
.month-band { position: relative; height: 24px; border-bottom:1px solid ${TOKENS.borderSubtle}; }
.sub-band { position: relative; height: 24px; }
.month-block {
  position:absolute; top:0; bottom:0; display:flex; align-items:center; padding-left:6px; font-size:12px; color:${TOKENS.textMuted};
  border-right:1px solid ${TOKENS.borderSubtle};
}
.tick {
  position:absolute; top:0; bottom:0; width:1px; border-left:1px solid ${TOKENS.borderSubtle};
  padding-left:4px; transform: translateX(-.5px); font-size:11px; color:${TOKENS.textMuted}; display:flex; align-items:center;
}
.weekend {
  position:absolute; top:48px; bottom:0; background:${TOKENS.surfaceSubtle};
}
.today {
  position:absolute; top:48px; bottom:0; width:1px; background:${TOKENS.brand};
  box-shadow: 0 0 0 1px ${TOKENS.brand}, 0 0 6px ${TOKENS.brand};
}
.rows { position: relative; }

/* Bar + row guides */
.row-guide {
  position:absolute; left:0; right:0; height:20px; background:transparent; border-bottom:1px dashed ${TOKENS.borderSubtle};
}
.bar {
  position:absolute; height:20px; border-radius:6px; color:#fff; cursor:grab; user-select:none;
  display:flex; align-items:center; outline-offset: 0;
}
.bar:focus { outline:2px solid ${TOKENS.accentLight}; }
.bar-content { padding:0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; }
.bar-title { font-size:12px; font-weight:600; text-shadow: 0 1px 0 rgba(0,0,0,0.25); }
.handle { position:absolute; top:0; width:6px; height:100%; cursor:ew-resize; background:rgba(255,255,255,0.2); }
.handle.left { left:0; border-top-left-radius:6px; border-bottom-left-radius:6px; }
.handle.right { right:0; border-top-right-radius:6px; border-bottom-right-radius:6px; }
.bar:active { cursor:grabbing; }
.bar[data-preview]::after {
  content: attr(data-preview);
  position:absolute; bottom:100%; left:0; transform:translateY(-4px);
  background:#000; color:#fff; font-size:11px; padding:2px 6px; border-radius:4px; white-space:nowrap;
}

/* Hover help dot on today */
.today-dot { position:absolute; width:6px; height:6px; background:${TOKENS.brand}; border-radius:50%; }

/* Drawer */
.drawer {
  position: fixed; right:0; top:0; bottom:0; width: 420px; background:#fff; z-index: 20;
  border-left:1px solid ${TOKENS.borderSubtle}; box-shadow: -8px 0 16px rgba(0,0,0,0.06);
  display:flex; flex-direction:column;
}
.drawer-head { display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid ${TOKENS.borderSubtle}; }
.drawer-title { display:flex; align-items:center; gap:8px; font-weight:700; }
.drawer-name { font-size:16px; }
.close { border:0; background:transparent; font-size:24px; cursor:pointer; }
.drawer-body { padding: 12px; display:grid; gap:8px; }
.drawer-body .row { display:flex; align-items:center; gap:8px; }
.drawer-body .row label { width:96px; color:${TOKENS.textMuted}; font-size:12px; }
.drawer-body .row .text { font-size:14px; }
.pill { border-radius:999px; font-size:12px; padding:2px 8px; }
.drawer-foot { margin-top:auto; padding:12px; border-top:1px solid ${TOKENS.borderSubtle}; display:flex; justify-content:flex-end; gap:8px; }
.avatar { width:24px; height:24px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; }

/* Chevrons */
.chev { border:0; background:transparent; cursor:pointer; }

/* Snackbar */
.snack {
  position: fixed; left: 16px; bottom: 16px; background:#111; color:#fff; padding:8px 12px; border-radius:8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2); font-size:13px; display:flex; align-items:center; gap:8px; z-index: 30;
}
.snack .link { background:transparent; border:0; color:${TOKENS.accentLight}; text-decoration:underline; cursor:pointer; }

/* Spinner util */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }

/* Responsive */
@media (max-width: 1024px) {
  .g-grid { grid-template-columns: 260px 1fr; }
}
@media (max-width: 720px) {
  .g-grid { grid-template-columns: 1fr; }
  .left-pane { display:none; }
  .g-controls { top: 48px; }
}
    `}</style>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   9) SMALL COLOUR HELPERS (unchanged)
   ────────────────────────────────────────────────────────────────────────── */
function tint(hex, amount = 0.1) {
  const { r, g, b } = hexToRgb(hex)
  const nr = Math.round(r + (255 - r) * amount)
  const ng = Math.round(g + (255 - g) * amount)
  const nb = Math.round(b + (255 - b) * amount)
  return `rgb(${nr}, ${ng}, ${nb})`
}
function darken(hex, amount = 0.2) {
  const { r, g, b } = hexToRgb(hex)
  const nr = Math.round(r * (1 - amount))
  const ng = Math.round(g * (1 - amount))
  const nb = Math.round(b * (1 - amount))
  return `rgb(${nr}, ${ng}, ${nb})`
}
function hexToRgb(hex) {
  const clean = hex.replace("#", "")
  const bigint = Number.parseInt(clean, 16)
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}
function priorityColor(p) {
  return TOKENS.priority[String(p || "Low").toLowerCase()]
}
