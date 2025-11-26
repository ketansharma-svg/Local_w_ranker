"use client"

import { Tooltip } from "antd"
import { AnimatePresence, motion } from "framer-motion"
import {
  Calendar as CalendarIcon,
  MessageSquare,
  Paperclip,
  Pencil,
  Repeat2,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import TaskCreationDrawerDemo from "../project-task-overview/UniversalTaskCreationDrawer"


const T = {
  brand: "#1090D0",
  brandHover: "#0A7AB2",
  text: "#111827",
  muted: "#6B7280",
  surface: "#FFFFFF",
  subtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  shadow: "0 2px 6px rgba(0,0,0,0.05)",
  status: {
    not_started: "#9CA3AF",
    working: "#1090D0",
    under_review: "#FF9F43",
    completed: "#28C76F",
    blocked: "#F97316",
    cancelled: "#6B7280",
    overdue: "#EA5455",
  },
  priority: { high: "#EA5455", medium: "#FF9F43", low: "#9AA4B2" },
}

/** ===============================
 *  Helpers
 *  =============================== */
const todayISO = () => new Date().toISOString().slice(0, 10)
const parseISO = (d) => (d ? new Date(d + "T00:00:00") : null)
const isOverdue = (task) =>
  task?.dueDate && task.status !== "completed" && parseISO(task.dueDate) < parseISO(todayISO())
const isDueSoon = (task) =>
  task?.dueDate &&
  task.status !== "completed" &&
  parseISO(task.dueDate) >= parseISO(todayISO()) &&
  parseISO(task.dueDate) <= new Date(Date.now() + 48 * 60 * 60 * 1000)

const by =
  (k, dir = "asc") =>
    (a, b) =>
      (a[k] || "") > (b[k] || "") ? (dir === "asc" ? 1 : -1) : (a[k] || "") < (b[k] || "") ? (dir === "asc" ? -1 : 1) : 0

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("")

const STATUS_ORDER = [
  { key: "not_started", label: "Not Started", color: T.status.not_started },
  { key: "working", label: "In Progress", color: T.status.working },
  { key: "under_review", label: "Under Review", color: T.status.under_review },
  { key: "completed", label: "Completed", color: T.status.completed },
]

/** ===============================
 *  Filters (kept minimal)
 *  =============================== */
function matchesFilters(task, f = {}) {
  if (!task) return false
  if (f.statuses && f.statuses.length && !f.statuses.includes(task.status)) return false
  if (f.priorities && f.priorities.length && !f.priorities.includes(task.priority)) return false
  if (f.q && f.q.length && !task.title.toLowerCase().includes(f.q.toLowerCase())) return false
  if (f.dueFrom && task.dueDate && task.dueDate < f.dueFrom) return false
  if (f.dueTo && task.dueDate && task.dueDate > f.dueTo) return false
  return true
}

/** ===============================
 *  Small UI atoms
 *  =============================== */
const Avatar = ({ user, size = 24 }) => {
  const bg = "#E0F2FE"
  const fg = T.brand
  return user?.avatarUrl ? (
    <img
      src={user.avatarUrl || "/placeholder.svg"}
      alt={user.name}
      title={user.name}
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover", border: `1px solid ${T.border}` }}
    />
  ) : (
    <div
      title={user?.name || "Unassigned"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: fg,
        fontSize: 12,
        display: "grid",
        placeItems: "center",
        border: `1px solid ${T.border}`,
      }}
      aria-label={user?.name || "Unassigned"}
    >
      {user?.name ? initials(user.name) : "—"}
    </div>
  )
}

const PriorityChip = ({ priority }) => {
  const map = {
    high: { c: T.priority.high, label: "High" },
    medium: { c: T.priority.medium, label: "Medium" },
    low: { c: T.priority.low, label: "Low" },
  }
  const m = map[priority] || map.low
  return (
    <span
      title={`Priority: ${m.label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        fontSize: 12,
        borderRadius: 999,
        background: `${m.c}1A`,
        color: m.c,
        border: `1px solid ${T.border}`,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: m.c }} />
      {m.label}
    </span>
  )
}

const CampaignTag = ({ value }) =>
  value ? (
    <span
      title={value}
      style={{
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 999,
        background: T.subtle,
        border: `1px solid ${T.border}`,
        color: T.muted,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  ) : null


const TaskCard = ({ task, statusColor, onClick, onQuickUpdate, dragProps = {} }) => {
  const overdue = isOverdue(task)
  const dueSoon = isDueSoon(task)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      role="listitem"
      aria-label={`Task: ${task.title}`}
      className="relative grid grid-cols-[3px_1fr] border border-gray-200 rounded-xl bg-white shadow-sm cursor-pointer outline-none group"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.(task.id)}
      onClick={() => onClick?.(task.id)}
      draggable
      {...dragProps}
    >
      {/* left status strip */}
      <div aria-hidden className="w-[3px] rounded-l-xl" style={{ background: statusColor }} />

      <div className="p-2.5 flex flex-col gap-1.5">
        {/* Title */}
        <div className="text-sm text-gray-900 font-semibold leading-tight line-clamp-2" title={task.title}>
          {task.title}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap text-gray-500 text-xs">
          <PriorityChip priority={task.priority} />

          <div title={task.assignee?.name || "Unassigned"} className="flex items-center gap-1.5">
            <Avatar user={task.assignee} />
            <span className="hidden sm:inline">{task.assignee?.name?.split(" ")[0] || "Unassigned"}</span>
          </div>

          <div
            title={
              task.dueDate
                ? `Due ${task.dueDate}${overdue ? " • Overdue" : dueSoon ? " • Due soon" : ""}`
                : "No due date"
            }
            className={`ml-auto flex items-center gap-1 font-semibold ${overdue ? "text-red-500" : dueSoon ? "text-orange-500" : "text-gray-500"
              }`}
          >
            <CalendarIcon size={14} />
            <span>{task.dueDate || "—"}</span>
          </div>
        </div>

        {/* Footer badges */}
        <div className="flex items-center justify-between">
          <CampaignTag value={task.campaignType} />

          <div className="flex items-center gap-2.5 text-gray-500 text-xs">
            {typeof task.subtasks?.total === "number" && task.subtasks.total > 0 && (
              <span title={`Subtasks: ${task.subtasks.done}/${task.subtasks.total}`}>✅ {task.subtasks.done}/{task.subtasks.total}</span>
            )}
            {typeof task.commentsCount === "number" && (
              <span title="Comments" className="inline-flex items-center gap-1">
                <MessageSquare size={14} /> {task.commentsCount}
              </span>
            )}
            {typeof task.attachmentsCount === "number" && (
              <span title="Attachments" className="inline-flex items-center gap-1">
                <Paperclip size={14} /> {task.attachmentsCount}
              </span>
            )}

            {/* quick actions */}
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Tooltip title="Quick edit">
                <button
                  className="p-1 border border-gray-200 bg-white rounded text-xs text-gray-500 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick?.(task.id)
                  }}
                >
                  <Pencil size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Reassign">
                <button
                  className="p-1 border border-gray-200 bg-white rounded text-xs text-gray-500 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick?.(task.id)
                  }}
                >
                  <Repeat2 size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Change due date">
                <button
                  className="p-1 border border-gray-200 bg-white rounded text-xs text-gray-500 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick?.(task.id)
                  }}
                >
                  <CalendarIcon size={14} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Overdue ribbon */}
        {overdue && <div aria-hidden className="absolute top-0 right-0 w-full h-0.5 bg-red-500 rounded-tr-xl" />}
      </div>
    </motion.div>
  )
}

/** ===============================
 *  Column with Infinite Scroll + Fallback
 *  =============================== */
const Column = ({
  statusKey,
  statusLabel,
  statusColor,
  tasks,
  collapsed,
  onToggleCollapse,
  onCreateTask,
  onDropTask,
  onLoadMore, // () => Promise<void> | void
  hasMore = false,
  loadingMore = false,
  canDrag = true,
  groupByCampaignType = false,
  statusCount,
  canCreateTask = true,
  initialLoading = false,
}) => {
  // DnD helpers
  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const onDrop = (e) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("text/task-id")
    const fromStatus = e.dataTransfer.getData("text/from-status")
    const toIndex = Number(e.dataTransfer.getData("text/over-index") || tasks.length)
    if (taskId) onDropTask?.(taskId, fromStatus, statusKey, Math.max(0, Math.min(tasks.length, toIndex)))
  }

  const onDragEnterCard = (index) => (e) => {
    e.dataTransfer.setData("text/over-index", String(index))
  }

  // Grouping (optional)
  const grouped = useMemo(() => {
    if (!groupByCampaignType) return { All: tasks }

    const map = new Map()
    tasks.forEach((t) => {
      const k = t.campaignType || "—"
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(t)
    })
    return Object.fromEntries([...map.entries()].sort(([a], [b]) => (a > b ? 1 : -1)))
  }, [tasks, groupByCampaignType])

  // Infinite scroll
  const listRef = useRef(null)
  const sentinelRef = useRef(null)
  const gateRef = useRef(false) // throttle new calls while one in flight

  const handleIntersect = useCallback(
    (entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      if (!hasMore || loadingMore) return
      if (gateRef.current) return
      gateRef.current = true
      Promise.resolve(onLoadMore?.()).finally(() => {
        setTimeout(() => {
          gateRef.current = false
        }, 600) // basic throttle to avoid burst calls
      })
    },
    [hasMore, loadingMore, onLoadMore]
  )

  useEffect(() => {
    if (!hasMore || !onLoadMore || collapsed) return
    const root = listRef.current
    const target = sentinelRef.current
    if (!root || !target) return
    const obs = new IntersectionObserver(handleIntersect, {
      root,
      rootMargin: "300px 0px",
      threshold: 0.01,
    })
    obs.observe(target)
    return () => obs.disconnect()
  }, [hasMore, onLoadMore, collapsed, handleIntersect])

   const headerCount = typeof statusCount === "number" ? statusCount : tasks.length

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-[220px]"
      role="list"
      aria-label={`${statusLabel} column with ${headerCount} tasks`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-2.5 border-b border-gray-300 sticky top-0 bg-white rounded-t-xl z-10">
        <div className="flex items-center gap-2">
          <span aria-hidden className="w-2.5 h-2.5 rounded-full border border-gray-200" style={{ background: statusColor }} />
          <div className="text-sm font-bold text-gray-900">
            {statusLabel} <span className="font-semibold text-gray-500">· {headerCount}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canCreateTask && (
            <button
              className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600 hover:bg-gray-100"
              onClick={() => onCreateTask?.(statusKey)}
              title="Add task in this status"
            >
              + Add Task
            </button>
          )}
          <button
            className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600 hover:bg-gray-100"
            onClick={() => onToggleCollapse?.(statusKey)}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand column" : "Collapse column"}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {collapsed ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 text-xs text-gray-500">
            Column collapsed
          </motion.div>
        ) : (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-2.5 flex flex-col gap-2 overflow-auto max-h-[calc(100vh-280px)]"
          >
            {Object.entries(grouped).map(([lane, laneTasks]) => {


              return (
                <div key={lane} className="space-y-2">
                  {groupByCampaignType && (
                    <div className="text-xs text-gray-500 mx-0.5 mt-2.5 mb-1.5" title={`Campaign Type: ${lane}`}>
                      {lane}
                    </div>
                  )}

                  {laneTasks.length === 0 ? (
                    initialLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="border border-gray-200 rounded-lg bg-gray-50 p-2.5 animate-pulse space-y-2"
                          >
                            <div className="h-3 w-3/4 bg-gray-200 rounded" />
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-12 bg-gray-200 rounded" />
                              <div className="h-3 w-16 bg-gray-200 rounded" />
                            </div>
                            <div className="h-3 w-1/2 bg-gray-200 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-2.5 text-center bg-gray-50">
                        No tasks here
                      </div>
                    )
                  ) : (
                    <AnimatePresence>
                      {laneTasks.map((t, i) => {
                        const dragProps = {
                          onDragStart: (e) => {
                            e.dataTransfer.setData("text/task-id", t.id)
                            e.dataTransfer.setData("text/from-status", statusKey)
                            e.dataTransfer.effectAllowed = "move"
                          },
                          onDragEnter: onDragEnterCard(i),
                        }
                        return (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: i * 0.05 }}
                          >
                            <TaskCard
                              task={t}
                              statusColor={statusColor}
                              dragProps={dragProps}
                              onClick={() => onCreateTask?.("open_task_drawer", t.id)}
                              onQuickUpdate={(id, patch) => onCreateTask?.("quick_update", id, patch)}
                            />
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  )}
                </div>
              )
            })}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-8" />

            {/* Fallback / explicit load control */}
            <div className="flex items-center justify-center py-2">
              {loadingMore ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : hasMore ? (
                <button
                  onClick={() => onLoadMore?.()}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600 hover:bg-gray-100"
                >
                  Load more
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

/** ===============================
 *  Board
 *  =============================== */
export function ProjectKanbanView({
  tasks = [],
  currentUserId,
  activeFilters = {},
  statusOrder = STATUS_ORDER,
  bootstrapping = false,
  // API callbacks
  onTaskClick, // (id)
  onCreateTask, // (statusKey | "open_task_drawer", taskId?, patch?)
  onMoveTask, // (taskId, fromStatusKey, toStatusKey, index)
  onLoadMore,  // (statusKey)
  statusMeta = {}, // { key: { next?: string, loading?: boolean } }
  role = "editor",
}) {
  const [localTasks, setLocalTasks] = useState(tasks)
  useEffect(() => setLocalTasks(tasks), [tasks])


  const [myOnly, setMyOnly] = useState(false)
  const [groupByType, setGroupByType] = useState(false)
  const [collapsed, setCollapsed] = useState({})
  const [snack, setSnack] = useState(null)

  const visible = useMemo(() => {
    return localTasks.filter((t) => {
      if (myOnly && t.assignee?.id !== currentUserId) return false
      return matchesFilters(t, activeFilters)
    })
  }, [localTasks, activeFilters, myOnly, currentUserId])

  const cols = useMemo(() => {
    const map = {}
    statusOrder.forEach(({ key }) => (map[key] = []))
    visible.forEach((t) => {
      if (!map[t.status]) map[t.status] = []
      map[t.status].push(t)
    })
    Object.keys(map).forEach((k) => map[k].sort(by("updatedAt", "desc")))
    return map
  }, [visible, statusOrder])

  // Optimistic move with undo
  const applyMove = (taskId, from, to, index) => {
    setLocalTasks((prev) => {
      const p = [...prev]
      const i = p.findIndex((x) => x.id === taskId)
      if (i === -1) return prev
      const task = { ...p[i] }
      p.splice(i, 1)
      const toList = p.filter((x) => x.status === to)
      const safeIndex = Math.max(0, Math.min(index, toList.length))
      const before = p.filter((x) => x.status !== to)
      const after = p.filter((x) => x.status === to)
      after.splice(safeIndex, 0, { ...task, status: to, updatedAt: new Date().toISOString() })
      return [...before, ...after]
    })
    setSnack({ taskId, from, to, index })
    onMoveTask?.(taskId, from, to, index)
  }

  const undoMove = () => {
    if (!snack) return
    const { taskId, from } = snack
    setLocalTasks((prev) => {
      const p = [...prev]
      const i = p.findIndex((x) => x.id === taskId)
      if (i === -1) return prev
      const t = { ...p[i], status: from, updatedAt: new Date().toISOString() }
      p.splice(i, 1, t)
      return p
    })
    setSnack(null)
    toast.info("Move undone")
  }

  const toggleCollapse = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))
  const [mobileCol, setMobileCol] = useState(0)
  const canCreate = role !== "viewer"

  if (bootstrapping) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {statusOrder.map((s) => (
            <div key={s.key} className="bg-white border border-gray-200 rounded-xl p-3 animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
                <div className="h-3 w-10 bg-gray-200 rounded" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg bg-gray-50 p-2.5 space-y-2">
                    <div className="h-3 w-3/4 bg-gray-200 rounded" />
                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    <div className="flex gap-2">
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                      <div className="h-3 w-10 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-4">
      {/* Top rail controls */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* <label className="flex items-center gap-2 text-gray-600 text-sm">
            <input type="checkbox" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} />
            <span>Show my tasks</span>
          </label> */}

          <label className="flex items-center gap-2 text-gray-600 text-sm">
            <input type="checkbox" checked={groupByType} onChange={(e) => setGroupByType(e.target.checked)} />
            <span>Group by Campaign Type</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            onClick={() => {
              const anyOpen = Object.values(collapsed).some(Boolean)
              const next = {}
              STATUS_ORDER.forEach(({ key }) => (next[key] = !anyOpen))
              setCollapsed(next)
            }}
          >
            {Object.values(collapsed).some(Boolean) ? "Expand all" : "Collapse all"}
          </button>
        </div>
      </div>

      {/* Mobile column tabs */}
      <div className="flex gap-1.5 mb-1.5 md:hidden" role="tablist" aria-label="Kanban columns">
        {statusOrder.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={mobileCol === i}
            className={`px-2.5 py-1.5 text-xs rounded-full border ${mobileCol === i ? "bg-blue-50 text-gray-900 border-gray-300" : "bg-white text-gray-600 border-gray-200"
              }`}
            onClick={() => setMobileCol(i)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {statusOrder.map((s, i) => (
          <div key={s.key} className={`${mobileCol === i ? "block" : "hidden"} md:block`}>
            <Column
              statusKey={s.key}
              statusLabel={s.label}
              statusColor={s.color}
              tasks={cols[s.key] || []}
              collapsed={!!collapsed[s.key]}
              onToggleCollapse={toggleCollapse}
              onCreateTask={(arg, id, patch) => {
                if (arg === "open_task_drawer" && id) {
                  onTaskClick?.(id)
                  return
                }
                onCreateTask?.(s.key, id, patch)
              }}
              onDropTask={applyMove}
              canDrag={role !== "viewer"}
              groupByCampaignType={groupByType}
              hasMore={Boolean(statusMeta[s.key]?.next)}
              loadingMore={Boolean(statusMeta[s.key]?.loading)}
              onLoadMore={() => onLoadMore?.(s.key)}
              statusCount={typeof statusMeta[s.key]?.count === "number" ? statusMeta[s.key].count : undefined}
              canCreateTask={canCreate}
              initialLoading={Boolean(statusMeta[s.key]?.loading) && (cols[s.key]?.length || 0) === 0}

            />
          </div>
        ))}
      </div>

      {/* Snackbar (Undo) */}
      <AnimatePresence>
        {snack && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed left-1/2 transform -translate-x-1/2 bottom-4 bg-white border border-gray-200 shadow-lg rounded-lg px-2.5 py-2 flex items-center gap-2.5 z-50"
            role="status"
            aria-live="polite"
          >
            <span>Moved to {STATUS_ORDER.find((x) => x.key === snack.to)?.label || snack.to}</span>
            {/* <button
              className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
              onClick={undoMove}
            >
              Undo
            </button> */}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** ===============================
 *  Wrapper: accepts API arrays + next info
 *  =============================== */
const mapApiItemToTask = (apiItem, forcedKey) => {
  // apiItem example shows fields like: id, title, status("Not Started"), priority("Low"), assigned_to, due_date, updated_at, category, ...
  const statusKey =
    forcedKey ||
    (() => {
      const s = (apiItem?.status || "").toLowerCase()
      if (s.includes("not") && s.includes("start")) return "not_started"
      if (s.includes("progress") || s.includes("working")) return "working"
      if (s.includes("review")) return "under_review"
      if (s.includes("complete")) return "completed"
      return "not_started"
    })()

  return {
    id: apiItem.id,
    title: apiItem.title || "Untitled task",
    status: statusKey,
    priority: (apiItem.priority || "Low").toLowerCase(),
    assignee: apiItem.assigned_to ? { id: String(apiItem.assigned_to), name: "Assigned" } : undefined,
    dueDate: apiItem.due_date ? String(apiItem.due_date).slice(0, 10) : undefined,
    updatedAt: apiItem.updated_at || new Date().toISOString(),
    campaignType: apiItem.category_name, // not in payload; keep empty to preserve current UI
  }
}

export default function ProjectKanbanDemo({
  notStarted = [],
  inProgress = [],
  completed = [],
  underReview = [],
  pageInfo = {},
  onLoadMore,
  onMoveTask,
  onTaskClick,
  projectId,
  bootstrapping = false,
  role = "editor",
  projectMeta,
}) {
  const tasks = useMemo(() => {
    const a = notStarted.map((x) => mapApiItemToTask(x, "not_started"))
    const b = inProgress.map((x) => mapApiItemToTask(x, "working"))
    const c = underReview.map((x) => mapApiItemToTask(x, "under_review"))
    const d = completed.map((x) => mapApiItemToTask(x, "completed"))
    // Deduplicate by id just in case
    const merged = [...a, ...b, ...c, ...d]
    const seen = new Set()
    return merged.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
  }, [notStarted, inProgress, underReview, completed])


  const [filters] = useState({})
  const currentUserId = "u1"
  const [createOpen, setCreateOpen] = useState(false);
  const canCreateTasks = role !== "viewer"
  const handleOpenCreate = useCallback(() => {
    if (!canCreateTasks) {
      toast.error("You only have viewer access for this project.")
      return
    }
    setCreateOpen(true)
  }, [canCreateTasks])
  // const [createStatus, setCreateStatus] = useState<"not_started"|"working"|"under_review"|"completed">("not_started");

  return (
    <div style={{ background: "#FAFAFA" }}>
      <h3 style={{ margin: "0 0 8px" }}>Project · Kanban View</h3>

      <ProjectKanbanView
        tasks={tasks}
        currentUserId={currentUserId}
        activeFilters={filters}
        onTaskClick={(id) => {
          onTaskClick?.(id)
          if (!onTaskClick) toast.info(`Open Task Drawer for #${id}`)
        }}
        onCreateTask={(statusOrAction, id) => {
          if (!canCreateTasks) {
            toast.error("You only have viewer access for this project.")
            return
          }
          if (statusOrAction === "open_task_drawer") return
          handleOpenCreate();
        }}
        onMoveTask={onMoveTask}
        onLoadMore={onLoadMore}
        statusMeta={{
          not_started: { next: pageInfo?.not_started?.next, loading: pageInfo?.not_started?.loading, count: pageInfo?.not_started?.count },
          working: { next: pageInfo?.working?.next, loading: pageInfo?.working?.loading, count: pageInfo?.working?.count },
          under_review: { next: pageInfo?.under_review?.next, loading: pageInfo?.under_review?.loading, count: pageInfo?.under_review?.count },
          completed: { next: pageInfo?.completed?.next, loading: pageInfo?.completed?.loading, count: pageInfo?.completed?.count },
        }}
        bootstrapping={bootstrapping}
        role={role}

      />


      {/* Create Task drawer — mirrors KanbanView behaviour */}
      {projectId && (
        <TaskCreationDrawerDemo
          open={createOpen}
          setOpen={setCreateOpen}
          type="createNew"
          idPassed={String(projectId)}
          projectPassed={projectMeta || undefined}
        />
      )}


    </div>
  )
}
