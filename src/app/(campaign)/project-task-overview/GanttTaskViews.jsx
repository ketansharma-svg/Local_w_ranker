"use client"
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"

/* ──────────────────────────────────────────────────────────────────────────
   0) DESIGN TOKENS (aligned with Campaign Taskboard)
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
  // Status → bar colors
  status: {
    notStarted: "#CBD5E1",
    inProgress: "#1090D0",
    review: "#FF9F43",
    completed: "#28C76F",
    overdue: "#EA5455",
  },
  // Priority dots
  priority: {
    high: "#EA5455",
    medium: "#FF9F43",
    low: "#9AA4B2",
  },
  shadow: "0 2px 6px rgba(0,0,0,0.05)",
}

const STATUS_COLOR = {
  "Not Started": TOKENS.status.notStarted,
  "In Progress": TOKENS.status.inProgress,
  "Under Review": TOKENS.status.review,
  "Completed": TOKENS.status.completed,
}

/* ──────────────────────────────────────────────────────────────────────────
   1) DATE UTILS (safe parsing + formatting)
   ────────────────────────────────────────────────────────────────────────── */
const MS_DAY = 24 * 60 * 60 * 1000

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseISO(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : startOfDay(d)
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

function fmtShort(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function fmtISO(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—"
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, "0")
  const day = `${d.getDate()}`.padStart(2, "0")
  return `${y}-${m}-${day}`
}

/* ──────────────────────────────────────────────────────────────────────────
   2) API → GANTT TASK MAPPING
   ────────────────────────────────────────────────────────────────────────── */
const STATUS_KEYS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  review: "Under Review",
  completed: "Completed",
}

const pickDatePart = (v) => (typeof v === "string" ? v.slice(0, 10) : undefined)

/** Derive a start date:
 *  1) item.date (if your API uses it as "start")
 *  2) else created_at
 *  3) else if end exists → end - 2 days
 *  4) else undefined (unscheduled)
 */
function deriveStartISO(item) {
  const endISO = pickDatePart(item?.due_date)
  const dateISO = pickDatePart(item?.date)
  const createdISO = pickDatePart(item?.created_at)
  if (dateISO) return dateISO
  if (createdISO) return createdISO
  if (endISO) {
    const e = parseISO(endISO)
    return e ? fmtISO(addDays(e, -2)) : undefined
  }
  return undefined
}

function mapApiItemToGanttTask(item, forcedStatusKey) {
  const status = STATUS_KEYS[forcedStatusKey] || "Not Started"
  const endISO = pickDatePart(item?.due_date)
  const startISO = deriveStartISO(item)
  // Ensure end >= start if both exist; otherwise leave as-is
  let s = startISO ? parseISO(startISO) : null
  let e = endISO ? parseISO(endISO) : null
  if (s && e && e < s) {
    // push end to at least start
    e = s
  }

  // Light, consistent avatar tint from id
  const assignee =
    item.assigned_to != null
      ? {
          name: "Assigned",
          avatarColor: avatarTintFromId(String(item.assigned_to)),
        }
      : undefined

  return {
    id: String(item.id),
    title: item.title || "Untitled task",
    status,
    priority: (item.priority || "Low").toLowerCase(),
    assignee,
    campaignType: undefined, // Not in payload → grouped as “Other”
    start: s ? fmtISO(s) : undefined,
    end: e ? fmtISO(e) : undefined,
  }
}

function avatarTintFromId(id) {
  // Simple, deterministic tint so the same id always gets the same colour
  const hues = ["#5B8DEF", "#96C56F", "#E49B5E", "#6D85B8", "#B26CDA", "#4FB0AE", "#7081FF", "#C0CA33"]
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % hues.length
  return hues[h]
}

/* ──────────────────────────────────────────────────────────────────────────
   3) ENTRY: PROJECT GANTT (dynamic)
   ────────────────────────────────────────────────────────────────────────── */
/**
 * Props:
 *  - notStarted, inProgress, completed, underReview: arrays from the API
 *  - pageInfo?: { not_started:{next,loading}, in_progress:{...}, review:{...}, completed:{...} }
 *  - onLoadMore?: (statusKey) => Promise<void>
 *  - onUpdateDates?: (taskId, startISO, endISO) => void
 */
export default function ProjectGantt({
  notStarted = [],
  inProgress = [],
  completed = [],
  underReview = [],
  pageInfo = {},
  onLoadMore,
  onUpdateDates,
}) {
  // Normalise and dedupe tasks
  const tasks = useMemo(() => {
    const A = notStarted.map((it) => mapApiItemToGanttTask(it, "not_started"))
    const B = inProgress.map((it) => mapApiItemToGanttTask(it, "in_progress"))
    const C = underReview.map((it) => mapApiItemToGanttTask(it, "review"))
    const D = completed.map((it) => mapApiItemToGanttTask(it, "completed"))
    const merged = [...A, ...B, ...C, ...D]
    const seen = new Set()
    return merged.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
  }, [notStarted, inProgress, underReview, completed])

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", color: TOKENS.textTitle }}>
      <Style />
      <GanttSingleProject
        tasks={tasks}
        pageInfo={pageInfo}
        onLoadMore={onLoadMore}
        onUpdateDates={onUpdateDates}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   4) SINGLE‑PROJECT GANTT (unchanged visuals)
   ────────────────────────────────────────────────────────────────────────── */
function GanttSingleProject({ tasks, pageInfo, onLoadMore, onUpdateDates }) {
  const today = startOfDay(new Date())

  // Controls (kept identical)
  const [scale, setScale] = useState("day") // "day" | "week" | "month"
  const [density, setDensity] = useState("comfy") // "compact" | "comfy"
  const [showMeta, setShowMeta] = useState(false)
  const [winStart, setWinStart] = useState(addDays(today, -30))
  const [winEnd, setWinEnd] = useState(addDays(today, +60))

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

  const rowH = density === "compact" ? 48 : 56
  const headerH = 32

  // Group by campaign type (unchanged behaviour)
  const sections = useMemo(() => {
    const map = new Map()
    tasks.forEach((t) => {
      const key = t.campaignType || "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, items]) => ({ label, items }))
  }, [tasks])

  // Vertical positions for bars
  const positions = useMemo(() => {
    const y = {}
    let acc = 0
    sections.forEach((sec) => {
      acc += headerH
      sec.items.forEach((t, i) => {
        y[t.id] = acc + i * rowH + 6
      })
      acc += Math.max(0, sec.items.length * rowH)
    })
    return { yMap: y, totalH: acc + 8 }
  }, [sections, rowH])

  // Scroll sync + infinite scroll
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const headRef = useRef(null)
  const sentinelRef = useRef(null)
  const gateRef = useRef(false)
  const rrRef = useRef(0)

  const statusOrder = ["not_started", "in_progress", "review", "completed"]

  useEffect(() => {
    const l = leftRef.current
    const r = rightRef.current
    if (!l || !r) return
    const onL = () => (r.scrollTop = l.scrollTop)
    const onR = () => {
      l.scrollTop = r.scrollTop
      if (headRef.current) headRef.current.scrollLeft = r.scrollLeft
    }
    l.addEventListener("scroll", onL)
    r.addEventListener("scroll", onR)
    return () => {
      l.removeEventListener("scroll", onL)
      r.removeEventListener("scroll", onR)
    }
  }, [])

  /** Round‑robin loader across columns that still have a `next` cursor */
  const handleIntersect = useCallback(
    (entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      if (!onLoadMore) return

      const candidates = statusOrder.filter((k) => pageInfo?.[k]?.next && !pageInfo?.[k]?.loading)
      if (!candidates.length) return
      if (gateRef.current) return

      gateRef.current = true
      const nextKey = candidates[rrRef.current % candidates.length]
      rrRef.current = rrRef.current + 1

      Promise.resolve(onLoadMore(nextKey)).finally(() => {
        // small throttle to avoid rapid bursts
        setTimeout(() => {
          gateRef.current = false
        }, 600)
      })
    },
    [onLoadMore, pageInfo]
  )

  useEffect(() => {
    if (!onLoadMore) return
    const root = rightRef.current
    const target = sentinelRef.current
    if (!root || !target) return
    const obs = new IntersectionObserver(handleIntersect, {
      root,
      rootMargin: "400px 0px",
      threshold: 0.01,
    })
    obs.observe(target)
    return () => obs.disconnect()
  }, [onLoadMore, handleIntersect])

  const unscheduled = useMemo(() => tasks.filter((t) => !parseISO(t.start) || !parseISO(t.end)), [tasks])

  // x helpers
  function xFor(d) {
    return diffDays(d, winStart) * pxPerDay
  }
  function rectForTask(t) {
    const s = parseISO(t.start)
    const e = parseISO(t.end)
    if (!s || !e) return null
    const days = Math.max(1, diffDays(addDays(e, 1), s)) // inclusive
    return { left: xFor(s), width: days * pxPerDay, start: s, end: e, days }
  }

  // Header ticks (unchanged)
  const monthTicks = useMemo(() => {
    const out = []
    let c = startOfDay(new Date(winStart))
    c.setDate(1)
    while (c <= winEnd) {
      const next = new Date(c.getFullYear(), c.getMonth() + 1, 1)
      const left = xFor(c)
      const width = Math.max(1, diffDays(next, c)) * pxPerDay
      out.push({ label: c.toLocaleDateString(undefined, { month: "short", year: "numeric" }), left, width })
      c = next
    }
    return out
  }, [winStart, winEnd, pxPerDay])

  const subTicks = useMemo(() => {
    const out = []
    if (scale === "day") {
      let c = startOfDay(new Date(winStart))
      while (c <= winEnd) {
        out.push({ label: String(c.getDate()), left: xFor(c) })
        c = addDays(c, 1)
      }
    } else if (scale === "week") {
      let c = startOfDay(new Date(winStart))
      while (c <= winEnd) {
        const wn = weekNumber(c)
        out.push({ label: `W${wn}`, left: xFor(c) })
        c = addDays(c, 7)
      }
    } else {
      monthTicks.forEach((m) => out.push({ label: m.label, left: m.left }))
    }
    return out
  }, [scale, winStart, winEnd, pxPerDay, monthTicks])

  // Weekend shading (Day scale)
  const weekends = useMemo(() => {
    if (scale !== "day") return []
    const out = []
    let c = startOfDay(new Date(winStart))
    while (c <= winEnd) {
      if (c.getDay() === 0 || c.getDay() === 6) out.push({ left: xFor(c), width: pxPerDay })
      c = addDays(c, 1)
    }
    return out
  }, [scale, winStart, winEnd, pxPerDay])

  function onUpdateDatesLocal(taskId, ns, ne) {
    // Delegate to parent if provided; keep console as no-op fallback
    if (onUpdateDates) onUpdateDates(taskId, fmtISO(ns), fmtISO(ne))
    else console.log("Update", taskId, fmtISO(ns), fmtISO(ne))
  }

  function scheduleNow(taskId) {
    const s = startOfDay(new Date())
    const e = addDays(s, 2)
    onUpdateDatesLocal(taskId, s, e)
  }

  const anyNext =
    !!pageInfo?.not_started?.next || !!pageInfo?.in_progress?.next || !!pageInfo?.review?.next || !!pageInfo?.completed?.next
  const anyLoading =
    !!pageInfo?.not_started?.loading ||
    !!pageInfo?.in_progress?.loading ||
    !!pageInfo?.review?.loading ||
    !!pageInfo?.completed?.loading

  return (
    <div className="gantt-root">
      {/* Controls (unchanged) */}
      <div className="g-controls">
        <div className="segmented">
          <button className={`seg ${scale === "day" ? "active" : ""}`} onClick={() => setScale("day")} title="Day (Alt+D)">
            Day
          </button>
          <button className={`seg ${scale === "week" ? "active" : ""}`} onClick={() => setScale("week")} title="Week (Alt+W)">
            Week
          </button>
          <button className={`seg ${scale === "month" ? "active" : ""}`} onClick={() => setScale("month")} title="Month (Alt+M)">
            Month
          </button>
        </div>
        <div className="segmented">
          <button className={`seg ${density === "compact" ? "active" : ""}`} onClick={() => setDensity("compact")} title="Compact rows">
            Compact
          </button>
          <button className={`seg ${density === "comfy" ? "active" : ""}`} onClick={() => setDensity("comfy")} title="Comfy rows">
            Comfy
          </button>
        </div>
        <label className="switch">
          <input type="checkbox" checked={showMeta} onChange={(e) => setShowMeta(e.target.checked)} />
          <span>Show meta on rows</span>
        </label>
        <div className="g-spacer" />
        <button
          className="g-btn ghost"
          onClick={() => {
            const span = Math.max(1, diffDays(winEnd, winStart))
            const half = Math.floor(span / 2)
            setWinStart(addDays(today, -half))
            setWinEnd(addDays(today, half))
            const el = rightRef.current
            if (el) el.scrollTo({ left: Math.max(0, xFor(today) - el.clientWidth / 2), behavior: "smooth" })
          }}
        >
          Today
        </button>
      </div>

      {/* Unscheduled chips */}
      {unscheduled.length > 0 && (
        <div className="unscheduled">
          <div className="uns-title">Unscheduled</div>
          <div className="uns-list">
            {unscheduled.map((t, i) => (
              <div key={i} className="uns-chip">
                <span className="prior-dot" style={{ background: TOKENS.priority[(t.priority || "low").toLowerCase()] }} />
                <span className="uns-label">{t.title}</span>
                <button className="g-btn xs" onClick={() => scheduleNow(t.id)}>
                  Schedule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two panes */}
      <div className="g-grid">
        {/* LEFT (tree) */}
        <div className="left-pane" ref={leftRef}>
          <div className="left-header">Tasks</div>
          {sections.map((sec, i) => (
            <div className="section" key={i}>
              <div className="section-head">{sec.label}</div>
              {sec.items.map((t) => (
                <TaskRow key={t.id} task={t} rowH={rowH} showMeta={showMeta} />
              ))}
            </div>
          ))}
        </div>

        {/* RIGHT (timeline) */}
        <div className="right-pane" ref={rightRef}>
          <div className="time-header" ref={headRef}>
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

          {weekends.map((w, i) => (
            <div key={i} className="weekend" style={{ left: w.left, width: w.width }} />
          ))}

          <div className="today" style={{ left: xFor(today) }} title="Today" />

          <div className="rows" style={{ height: positions.totalH }}>
            {sections.map((sec) =>
              sec.items.map((task) => {
                const rect = rectForTask(task)
                const top = positions.yMap[task.id] ?? 0
                return (
                  <React.Fragment key={task.id}>
                    <div className="row-guide" style={{ top: top + rowH - 14 }} />
                    {rect && (
                      <TaskBar
                        task={task}
                        rect={rect}
                        top={top}
                        color={STATUS_COLOR[task.status] || TOKENS.status.notStarted}
                        onUpdate={(s, e) => onUpdateDatesLocal(task.id, s, e)}
                      />
                    )}
                  </React.Fragment>
                )
              })
            )}

            {/* Infinite scroll sentinel + fallback controls */}
            <div ref={sentinelRef} style={{ height: 24 }} />
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
              {anyLoading ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : anyNext && onLoadMore ? (
                <button
                  className="g-btn ghost"
                  onClick={() => {
                    // manual round‑robin fallback
                    const candidates = statusOrder.filter((k) => pageInfo?.[k]?.next && !pageInfo?.[k]?.loading)
                    if (!candidates.length) return
                    rrRef.current = rrRef.current + 1
                    onLoadMore(candidates[rrRef.current % candidates.length])
                  }}
                >
                  Load more
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Left task row (unchanged) */
function TaskRow({ task, rowH, showMeta }) {
  const pri = TOKENS.priority[(task.priority || "low").toLowerCase()]
  const assClr = task.assignee?.avatarColor || "#9AA4B2"

  return (
    <div className="task-row" style={{ height: rowH }}>
      <div className="avatar" style={{ background: assClr }}>
        {(task.assignee?.name || "?").slice(0, 1).toUpperCase()}
      </div>
      <div className="row-body">
        <div className="row-title" title={task.title}>
          <span className="prior-dot" style={{ background: pri }} />
          {task.title}
        </div>
        <div className={`row-meta ${showMeta ? "visible" : ""}`}>
          <span className="chip ghost">{task.assignee?.name || "Unassigned"}</span>
          <span
            className="chip"
            style={{
              background: tint(STATUS_COLOR[task.status] || TOKENS.status.notStarted, 0.18),
              color: darken(STATUS_COLOR[task.status] || TOKENS.status.notStarted, 0.2),
            }}
          >
            {task.status}
          </span>
          <span className="chip mute">
            {parseISO(task.start) ? fmtShort(parseISO(task.start)) : "—"} →{" "}
            {parseISO(task.end) ? fmtShort(parseISO(task.end)) : "—"}
          </span>
        </div>
      </div>
    </div>
  )
}

/* Timeline bar + drag/resize (unchanged interactions) */
function TaskBar({ task, rect, top, color, onUpdate }) {
  const [drag, setDrag] = useState(null)
  const ref = useRef(null)

  function onDown(e, mode) {
    setDrag({
      mode,
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

  function onMove(e) {
    if (!drag || !ref.current) return
    const pxPerDay = rect.width / rect.days
    const dx = Math.round((e.clientX - drag.startX) / pxPerDay) * pxPerDay

    if (drag.mode === "move") {
      const left = Math.max(0, drag.origLeft + dx)
      const delta = Math.round((left - drag.origLeft) / pxPerDay)
      const ns = addDays(drag.origStart, delta)
      const ne = addDays(drag.origEnd, delta)
      ref.current.style.left = `${left}px`
      ref.current.style.width = `${drag.origWidth}px`
      ref.current.dataset.preview = `${fmtISO(ns)}→${fmtISO(ne)}`
    } else if (drag.mode === "left") {
      const left = clamp(drag.origLeft + dx, 0, drag.origLeft + drag.origWidth - pxPerDay)
      const w = drag.origWidth + (drag.origLeft - left)
      const delta = Math.round((drag.origLeft - left) / pxPerDay)
      const ns = addDays(drag.origStart, -delta)
      ref.current.style.left = `${left}px`
      ref.current.style.width = `${w}px`
      ref.current.dataset.preview = `${fmtISO(ns)}→${fmtISO(drag.origEnd)}`
    } else if (drag.mode === "right") {
      const w = Math.max(pxPerDay, drag.origWidth + dx)
      const delta = Math.round((w - drag.origWidth) / pxPerDay)
      const ne = addDays(drag.origEnd, delta)
      ref.current.style.width = `${w}px`
      ref.current.dataset.preview = `${fmtISO(drag.origStart)}→${fmtISO(ne)}`
    }
  }

  function onUp() {
    if (!drag || !ref.current) return
    const el = ref.current
    const pxPerDay = rect.width / rect.days
    const left = Number.parseFloat(el.style.left || String(rect.left))
    const width = Number.parseFloat(el.style.width || String(rect.width))
    const deltaL = Math.round((left - drag.origLeft) / pxPerDay)
    const deltaW = Math.round((width - drag.origWidth) / pxPerDay)

    if (drag.mode === "move") {
      onUpdate(addDays(drag.origStart, deltaL), addDays(drag.origEnd, deltaL))
    } else if (drag.mode === "left") {
      onUpdate(addDays(drag.origStart, -deltaL), drag.origEnd)
    } else {
      onUpdate(drag.origStart, addDays(drag.origEnd, deltaW))
    }
    el.removeAttribute("data-preview")
    setDrag(null)
  }

  const isOverdue =
    task.end && parseISO(task.end) && parseISO(task.end) < startOfDay(new Date()) && task.status !== "Completed"

  return (
    <div
      ref={ref}
      className="bar"
      role="button"
      aria-label={`${task.title} ${fmtISO(rect.start)} → ${fmtISO(rect.end)}`}
      style={{
        top,
        left: rect.left,
        width: rect.width,
        background: color,
        outline: isOverdue ? `2px solid ${TOKENS.status.overdue}` : "none",
        boxShadow: isOverdue ? `inset -2px 0 0 ${TOKENS.status.overdue}` : "none",
      }}
      onPointerDown={(e) => onDown(e, "move")}
      onPointerMove={onMove}
      onPointerUp={onUp}
      title={`${task.title}\n${task.status} • ${task.priority}\n${task.assignee?.name || "Unassigned"}\n${fmtISO(rect.start)} → ${fmtISO(rect.end)} (${rect.days}d)${isOverdue ? "\n⚠ Overdue" : ""}`}
    >
      <div className="bar-content">
        <span className="bar-title">{task.title}</span>
      </div>
      <div className="handle left" onPointerDown={(e) => onDown(e, "left")} title="Resize start" />
      <div className="handle right" onPointerDown={(e) => onDown(e, "right")} title="Resize end" />
    </div>
  )
}

/* Week number-ish label (for sub ticks) */
function weekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date - yearStart) / MS_DAY + 1) / 7)
}

/* ──────────────────────────────────────────────────────────────────────────
   5) STYLE (scoped) — identical to your original
   ────────────────────────────────────────────────────────────────────────── */
function Style() {
  return (
    <style>{`
.gantt-root { background:${TOKENS.surface}; border:1px solid ${TOKENS.borderSubtle}; border-radius:10px; box-shadow:${TOKENS.shadow}; }
.g-controls { display:flex; gap:8px; align-items:center; padding:8px 12px; border-bottom:1px solid ${TOKENS.borderSubtle}; }
.segmented { display:flex; border:1px solid ${TOKENS.borderSubtle}; border-radius:10px; overflow:hidden; }
.seg { background:#fff; border:0; padding:6px 10px; cursor:pointer; font-size:12px; }
.seg.active { background:${TOKENS.accentLight}; color:${TOKENS.brand}; font-weight:600; }
.switch { display:flex; align-items:center; gap:6px; color:${TOKENS.textMuted}; font-size:12px; }
.g-spacer { flex:1; }
.g-btn { border:1px solid ${TOKENS.brand}; background:${TOKENS.brand}; color:#fff; border-radius:10px; padding:6px 10px; font-size:12px; cursor:pointer; }
.g-btn.ghost { background:transparent; color:${TOKENS.brand}; border-color:${TOKENS.borderSubtle}; }
.g-btn.xs { padding:2px 8px; font-size:12px; }

/* Unscheduled chips */
.unscheduled { padding:8px 12px; border-bottom:1px solid ${TOKENS.borderSubtle}; background:${TOKENS.surfaceSubtle}; }
.uns-title { font-size:12px; color:${TOKENS.textMuted}; margin-bottom:4px; }
.uns-list { display:flex; flex-wrap:wrap; gap:8px; }
.uns-chip { background:#fff; border:1px solid ${TOKENS.borderSubtle}; border-radius:999px; padding:4px 8px; display:flex; align-items:center; gap:8px; }
.uns-label { font-size:13px; }
.prior-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }

/* Two panes */
.g-grid { display:grid; grid-template-columns: 360px 1fr; height: calc(100vh - 300px); }
.left-pane, .right-pane { overflow:auto; position:relative; }
.left-pane { border-right:1px solid ${TOKENS.borderSubtle}; }
.left-header { position:sticky; top:0; z-index:6; background:${TOKENS.surface}; padding:10px 12px; border-bottom:1px solid ${TOKENS.borderSubtle}; font-weight:600; }
.section-head { position:sticky; top:40px; z-index:5; background:${TOKENS.surfaceSubtle}; padding:6px 12px; border-bottom:1px solid ${TOKENS.borderSubtle}; font-size:12px; color:${TOKENS.textMuted}; }
.task-row { display:flex; align-items:flex-start; gap:10px; padding:8px 12px; border-bottom:1px dashed ${TOKENS.borderSubtle}; }
.task-row:hover { background:${TOKENS.surfaceSubtle}; }
.avatar { width:28px; height:28px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; flex:0 0 auto; }
.row-body { flex:1; min-width:0; }
.row-title { font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:8px; }
.row-meta { display:flex; gap:6px; margin-top:6px; opacity:0; transition:opacity .15s ease; }
.row-meta.visible, .task-row:hover .row-meta { opacity:1; }
.chip { border-radius:999px; padding:2px 8px; font-size:12px; }
.chip.mute { background:#fff; border:1px solid ${TOKENS.borderSubtle}; color:${TOKENS.textMuted}; }
.chip.ghost { background:#fff; border:1px solid ${TOKENS.borderSubtle}; }

/* Timeline */
.time-header { position:sticky; top:0; z-index:8; background:${TOKENS.surface}; border-bottom:1px solid ${TOKENS.borderSubtle}; height:48px; overflow:hidden; white-space:nowrap; }
.month-band { position:relative; height:24px; border-bottom:1px solid ${TOKENS.borderSubtle}; }
.sub-band { position:relative; height:24px; }
.month-block { position:absolute; top:0; bottom:0; display:flex; align-items:center; padding-left:6px; font-size:12px; color:${TOKENS.textMuted}; border-right:1px solid ${TOKENS.borderSubtle}; }
.tick { position:absolute; top:0; bottom:0; width:1px; border-left:1px solid ${TOKENS.borderSubtle}; transform:translateX(-.5px); font-size:11px; color:${TOKENS.textMuted}; padding-left:4px; display:flex; align-items:center; }
.weekend { position:absolute; top:48px; bottom:0; background:${TOKENS.surfaceSubtle}; }
.today { position:absolute; top:48px; bottom:0; width:1px; background:${TOKENS.brand}; box-shadow:0 0 0 1px ${TOKENS.brand}, 0 0 6px ${TOKENS.brand}; }
.rows { position:relative; }

/* Row guides + bars */
.row-guide { position:absolute; left:0; right:0; height:16px; border-bottom:1px dashed ${TOKENS.borderSubtle}; }
.bar { position:absolute; height:20px; border-radius:6px; color:#fff; cursor:grab; user-select:none; display:flex; align-items:center; }
.bar:active { cursor:grabbing; }
.bar-content { padding:0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; }
.bar-title { font-size:12px; font-weight:700; text-shadow:0 1px 0 rgba(0,0,0,0.25); }
.handle { position:absolute; top:0; width:6px; height:100%; cursor:ew-resize; background:rgba(255,255,255,.2); }
.handle.left { left:0; border-top-left-radius:6px; border-bottom-left-radius:6px; }
.handle.right { right:0; border-top-right-radius:6px; border-bottom-right-radius:6px; }
.bar[data-preview]::after {
  content: attr(data-preview);
  position:absolute; bottom:100%; left:0; transform:translateY(-4px);
  background:#000; color:#fff; font-size:11px; padding:2px 6px; border-radius:4px; white-space:nowrap;
}

/* Responsive */
@media (max-width: 1100px) { .g-grid { grid-template-columns: 300px 1fr; } }
@media (max-width: 780px)  { .g-grid { grid-template-columns: 1fr; } .left-pane { display:none; } }
    `}</style>
  )
}

/* Small colour helpers (unchanged) */
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
  const n = Number.parseInt(clean, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
