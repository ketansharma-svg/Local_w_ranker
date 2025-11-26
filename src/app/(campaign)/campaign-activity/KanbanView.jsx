"use client"
import {
  deleteActivity,
  fetchActivitiesPage,
  patchActivity,
  selectActivitiesByProjectStatus,
  selectListMeta
} from "@/src/redux/reducer/campaignReducer"
import { BASE_URL_WR } from "@/src/util/api"
import { Popover, Tooltip } from "antd"
import clsx from "clsx"
import { format, isPast, isToday, parseISO } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import Cookies from "js-cookie"
import { ChevronDown, ChevronRight, Eye, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useState } from "react"
import { useDispatch, useSelector, useStore } from "react-redux"
import TaskCreationDrawerDemo from "../project-task-overview/UniversalTaskCreationDrawer"

import Image from "next/image"
import TaskManagerDrawer from "./TaskViewDrawer"

// ===== Constants (preserved) =====
const STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "working",
  REVIEW: "under_review",
  COMPLETED: "completed",
}
const SUMMARY_TO_API = {
  "Not Started": "not_started",
  Working: "working",
  "Under Review": "under_review",
  Completed: "completed",
}
// Internal UI keys
const STATUS_LABEL = {
  [STATUS.NOT_STARTED]: "Not Started",
  [STATUS.IN_PROGRESS]: "Working", // ← must be "Working" to match API semantics
  [STATUS.REVIEW]: "Under Review",
  [STATUS.COMPLETED]: "Completed",
}
// Internal → backend slug
const STATUS_TO_API = {
  [STATUS.NOT_STARTED]: "not_started",
  [STATUS.IN_PROGRESS]: "working",
  [STATUS.REVIEW]: "under_review",
  [STATUS.COMPLETED]: "completed",
}
const STATUS_COLOR = {
  [STATUS.NOT_STARTED]: "rgb(203, 213, 225)",
  [STATUS.IN_PROGRESS]: "rgb(16, 144, 208)",
  [STATUS.REVIEW]: "rgb(255, 159, 67)",
  [STATUS.COMPLETED]: "rgb(40, 199, 111)",
}
const COLUMN_KEYS = [STATUS.NOT_STARTED, STATUS.IN_PROGRESS, STATUS.REVIEW, STATUS.COMPLETED]
const WIP_LIMIT = {
  [STATUS.NOT_STARTED]: 999,
  [STATUS.IN_PROGRESS]: 10,
  [STATUS.REVIEW]: 8,
  [STATUS.COMPLETED]: 999,
}

// ===== DnD mock persistence (preserved) =====
function randomDelay(min = 200, max = 700) {
  return new Promise((r) => setTimeout(r, Math.round(Math.random() * (max - min) + min)))
}
// ===== TaskCard =====
function initials(name = "?") {
  const parts = `${name}`.trim().split(/\s+/)
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "")
}
function TaskCard({ task, onClick }) {
  const due = task.dueDate ? parseISO(task.dueDate) : null
  const overdue = due && isPast(due) && !isToday(due) && task.status !== "COMPLETED"
  const dueToday = due && isToday(due) && task.status !== "COMPLETED"
  return (
    <motion.button
      className="w-full bg-white border border-gray-200 rounded-xl p-3 shadow-md mb-2.5 transition-all duration-120 cursor-pointer  focus-visible:outline-2 focus-visible:outline-brand-blue1 focus-visible:outline-offset-2 hover:border-brand-blue1 smooth1"
      onClick={() => onClick?.(task)}
      role="button"
      aria-label={`Task: ${task.title}, Priority ${task.priority}, Due ${task.dueDate || "none"}`}
      whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-start gap-2">
        <Popover
          content={
            <div className="text-sm">
              Priority: <b>{task.priority}</b>
            </div>
          }
          title={null}
          trigger="hover"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 cursor-pointer"
            style={{
              background:
                task.priority === "High"
                  ? "#EA5455"
                  : task.priority === "Medium"
                    ? "#FF9F43"
                    : "#9AA4B2",
            }}
            aria-hidden
          />
        </Popover>
        <div className="font-semibold text-sm text-gray-900 text-left line-clamp-2" title={task.title}>
          {task.title}
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-1.5 gap-x-2.5 mt-2.5 text-gray-600 text-xs">
        <span
          className={clsx("px-2 py-0.5 rounded-full border font-semibold text-xs", {
            "bg-red-50 text-red-600 border-red-200": task.priority === "High",
            "bg-orange-50 text-orange-600 border-orange-200": task.priority === "Medium",
            "bg-gray-50 text-gray-600 border-gray-200": task.priority === "Low",
          })}
        >
          {task.priority}
        </span>
        {task.raw.category_name && (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 font-semibold text-xs">
            {task.raw.category_name}
          </span>
        )}
        <span
          className={clsx("flex items-center gap-1.5", {
            "text-red-600": overdue,
            "text-orange-600": dueToday,
          })}
          title="Due date"
        >
          <span aria-hidden>📅</span>
          {due ? format(due, "MMM d") : "No due"}
        </span>
        {task.assignee && (
          <span className="flex items-center gap-1.5" title={task.assignee.name}>
            <span
              className="w-5.5 h-5.5 rounded-full bg-blue-50 text-brand-blue1 flex items-center justify-center text-xs font-bold border border-gray-200"
              aria-hidden
            >
              {initials(task.assignee.name)}
            </span>
            <span className="text-xs">{task.assignee.firstName || task.assignee.name.split(" ")[0]}</span>
          </span>
        )}
        {typeof task.commentsCount === "number" && (
          <span className="text-xs" title="Comments">
            💬 {task.commentsCount}
          </span>
        )}
      </div>
    </motion.button>
  )
}

// ===== Board (lazy fetch per project, unchanged logic) =====
function KanbanBoard({
  groups = [],
  projects = [],
  tasks = [],
  onTaskClick,
  onViewProject,
  onAddTask,
  onMoveTask,
  hideEmptyProjects = false,
  onLoadMoreTasks,
  onLoadProjectInitial,
  summaryByProject = {},
  loadedProjects = {},
}) {

  const [collapsedGroups, setCollapsedGroups] = React.useState({})
  const [collapsedPanels, setCollapsedPanels] = React.useState({})

  const [loadingMore, setLoadingMore] = React.useState({})

  const [showOnlyActiveByColumn, setShowOnlyActiveByColumn] = React.useState({})

  React.useEffect(() => {
    const init = {}
    for (const p of projects) for (const key of COLUMN_KEYS) {
      init[`${p.id}|${key}`] = true
    }
    setCollapsedPanels(init)
  }, [projects])

  const orderRef = React.useRef(new Map())

  const byProjectStatus = React.useMemo(() => {
    const map = new Map()
    for (const p of projects) for (const key of COLUMN_KEYS) map.set(`${p.id}|${key}`, [])
    for (const t of tasks) {
      if (!orderRef.current.has(t.id)) {
        orderRef.current.set(t.id, orderRef.current.size)
      }
      const key = `${t.projectId}|${t.status}`
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => (orderRef.current.get(a.id) - orderRef.current.get(b.id)))
    }
    return map
  }, [tasks, projects])

  const countsByStatus = React.useMemo(() => {
    const counts = {}
    for (const key of COLUMN_KEYS) counts[key] = 0
    for (const t of tasks) if (counts[t.status] != null) counts[t.status] += 1
    return counts
  }, [tasks])

  const projectsCountByStatus = React.useMemo(() => {
    const map = {};
    for (const key of COLUMN_KEYS) map[key] = 0;

    // Strategy: if a project has any task in that status (from byProjectStatus) OR summary > 0 → count it.
    for (const p of projects) {
      for (const key of COLUMN_KEYS) {
        const arr = (byProjectStatus.get(`${p.id}|${key}`) || []);
        const summary = summaryByProject[p.id] || {};
        const titleCase = STATUS_LABEL[key]; // "Not Started" | "Working" | ...
        const summaryCount = summary[titleCase] || 0;
        if (arr.length > 0 || summaryCount > 0) {
          map[key] += 1;
        }
      }
    }
    return map;
  }, [projects, byProjectStatus, summaryByProject]);


  function projectEmptyBySummary(projectId) {
    const summary = summaryByProject[projectId] || {}
    const total =
      (summary["Not Started"] || 0) +
      (summary["Working"] || 0) +
      (summary["Under Review"] || 0) +
      (summary["Completed"] || 0)
    return total === 0
  }
  function projectEmptyLoaded(projectId) {
    for (const status of COLUMN_KEYS) {
      const arr = byProjectStatus.get(`${projectId}|${status}`) || []
      if (arr.length) return false
    }
    return true
  }
  function projectEmpty(projectId) {
    if (projectEmptyBySummary(projectId)) return true
    return loadedProjects[projectId] ? projectEmptyLoaded(projectId) : false
  }

  async function togglePanel(projectId, statusKey) {
    const panelKey = `${projectId}|${statusKey}`
    setCollapsedPanels((s) => ({ ...s, [panelKey]: !s[panelKey] }))
    const isExpanding = collapsedPanels[panelKey] === true
    if (isExpanding && !loadedProjects[projectId]) {
      try {
        const summary = summaryByProject[projectId] || {}
        const statusesToLoadApi = Object.entries(summary)
          .filter(([, c]) => c > 0)
          .map(([titleCase]) => SUMMARY_TO_API[titleCase]) // backend slugs

        const loadingKey = `${projectId}|initial`
        setLoadingMore((prev) => ({ ...prev, [loadingKey]: true }))

        await onLoadProjectInitial?.(projectId, statusesToLoadApi)
      } finally {
        setLoadingMore((prev) => {
          const clone = { ...prev }
          delete clone[`${projectId}|initial`]
          return clone
        })
      }
    }
  }

  const projectById = React.useMemo(() => {
    const m = new Map();
    for (const p of projects) m.set(String(p.id), p);
    return m;
  }, [projects]);

  function getSeoAccessRole(projectId) {
    const p = projectById.get(String(projectId));
    if (!p) return "admin";                   // default for safety
    if (p.groupId !== "g2") return "admin";   // My Projects → full
    const seo = p.accesses?.find(a => a.dashboard_type === "SEO");
    // map to canonical roles
    const level = String(seo?.access_level || "").toLowerCase();
    return level === "viewer" ? "viewer"
      : level === "editor" ? "editor"
        : "admin"; // fallback safest
  }


  return (

    <div className="flex flex-col h-full min-h-0 px-4" role="region" aria-label="Kanban Board">
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden bg-gray-50 pt-4">
        <motion.div className="flex items-start gap-4" aria-live="polite" layout>
          <>
            {COLUMN_KEYS.map((statusKey, columnIndex) => {
                const onlyActive = !!showOnlyActiveByColumn[statusKey];
              return (
                <motion.section
                  key={statusKey}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: columnIndex * 0.06 }}
                  className="w-full bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col max-h-[calc(100vh-140px)]"
                  role="region"
                  aria-label={`Column: ${STATUS_LABEL[statusKey]} (${countsByStatus[statusKey] || 0} tasks)`}
                >
                  <div className="sticky top-0 z-0  p-2.5 pb-2 border-b border-gray-200 bg-white flex items-center justify-between rounded-t-xl">
                    <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                      <span
                        aria-hidden
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: STATUS_COLOR[statusKey] }}
                      />
                      {statusKey === "working" ? "In Progress" : STATUS_LABEL[statusKey]}
                      <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {projectsCountByStatus[statusKey] || 0} project(s)
                      </span>
                    </div>
                            <button
          type="button"
          onClick={() =>
            setShowOnlyActiveByColumn((prev) => ({
              ...prev,
              [statusKey]: !onlyActive,
            }))
          }
          className={clsx(
            "text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors",
            onlyActive
              ? "bg-brand-blue1 text-white border-brand-blue1"
              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
          )}
        >
          {onlyActive ? "Active only" : "All projects"}
        </button>
                  </div>

                  <div className="overflow-y-auto overflow-x-hidden p-2">
                    {groups.map((g, groupIndex) => {
                      const groupProjects = projects.filter((p) => p.groupId === g.id);
                      const everyProjectEmpty = groupProjects.every((p) => projectEmpty(p.id));
                      if (hideEmptyProjects && everyProjectEmpty) return null;
                      const collapsed = !!collapsedGroups[g.id];
                      return (
                        <motion.div
                          key={g.id}
                          layout
                          initial={{ opacity: 0, y: 14 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.2 }}
                          transition={{ duration: 0.3, ease: "easeOut", delay: (columnIndex * 0.04) + (groupIndex * 0.03) }}
                          className="border border-dashed border-gray-200 rounded-lg p-2 mb-3 bg-white"
                        >
                          <div className="flex items-center justify-between p-1.5 pb-2 border-b border-gray-200">
                            <div className="font-semibold text-sm text-gray-600">📁 {g.name}</div>
                            <button
                              onClick={() => setCollapsedGroups((s) => ({ ...s, [g.id]: !s[g.id] }))}
                              aria-label={collapsed ? "Expand group" : "Collapse group"}
                              className="text-xs text-gray-500 hover:text-brand-blue1 bg-none border-none cursor-pointer"
                            >
                              {collapsed ? "Expand" : "Collapse"}
                            </button>
                          </div>

                          <AnimatePresence initial={false}>
                            {!collapsed && (
                              <motion.div
                                key="group-body"
                                layout
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: "easeOut" }}
                              >
                                {groupProjects.map((p, projectIndex) => {
                                  if (hideEmptyProjects && projectEmpty(p.id)) return null;

                                    if (onlyActive) {
    const label = STATUS_LABEL[statusKey]; // e.g. "Not Started", "Working", etc.
    const countForThisColumn = summaryByProject[p.id]?.[label] ?? 0;
    if (countForThisColumn === 0) return null;
  }

                                  const pCollapsed = !!collapsedPanels[`${p.id}|${statusKey}`];
                                  return (
                                    <motion.div
                                      key={p.id}
                                      layout
                                      initial={{ opacity: 0, y: 10 }}
                                      whileInView={{ opacity: 1, y: 0 }}
                                      viewport={{ once: true, amount: 0.2 }}
                                      transition={{
                                        duration: 0.28,
                                        ease: "easeOut",
                                        delay:
                                          columnIndex * 0.04 +
                                          groupIndex * 0.02 +
                                          projectIndex * 0.02,
                                      }}
                                      className="mt-2 border border-gray-200 rounded-lg overflow-hidden"
                                    >
                                      <div className="flex items-center justify-between bg-gray-50 px-2 py-1.5 border-b border-gray-200">
                                        <div className="font-semibold text-sm text-gray-900 flex items-center gap-2 min-w-0">
                                          <span
                                            className="truncate max-w-[160px] hover:underline flex gap-2 items-center cursor-pointer"
                                            onClick={() => onViewProject?.({ projectId: p.id, status: statusKey })}
                                            title={p.name}
                                          >
                                            <Image
                                              src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(p.url)}`}
                                              alt=""
                                              width={16}
                                              height={16}
                                              className="rounded"
                                            />

                                            <span className="truncate">{p.name}</span>
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            const label = STATUS_LABEL[statusKey];
                                            const countForThisColumn = summaryByProject[p.id]?.[label] ?? 0;
                                            return (
                                              <span
                                                title={`${label} tasks in ${p.name}`}
                                                className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-700"
                                              >
                                                {countForThisColumn}
                                              </span>
                                            );
                                          })()}


                                          <Tooltip title="View Project">
                                            <button
                                              className="p-1 rounded hover:bg-gray-200 text-brand-blue1"
                                              onClick={() => onViewProject?.({ projectId: p.id, status: statusKey })}
                                            >
                                              <Eye size={16} strokeWidth={2} />
                                            </button>
                                          </Tooltip>
                                          {!(
                                            p.groupId === "g2" &&
                                            p.accesses?.some(a => a.dashboard_type === "SEO" && String(a.access_level || "").toLowerCase() === "viewer")
                                          ) && (
                                              <Tooltip title="Add Task">
                                                <button
                                                  className="p-1 rounded bg-brand-blue1 text-white hover:bg-brand-blue1/90"
                                                  onClick={() => onAddTask?.({ project: p, projectId: p.id, status: statusKey })}
                                                >
                                                  <Plus size={16} strokeWidth={2} />
                                                </button>
                                              </Tooltip>
                                            )}

                                          <Tooltip title={pCollapsed ? "Expand" : "Collapse"}>
                                            <button
                                              className="p-1 rounded hover:bg-gray-200 text-gray-600"
                                              onClick={() => togglePanel(p.id, statusKey)}
                                              aria-label={pCollapsed ? "Expand project" : "Collapse project"}
                                            >
                                              {pCollapsed ? (
                                                <ChevronRight size={16} strokeWidth={2} />
                                              ) : (
                                                <ChevronDown size={16} strokeWidth={2} />
                                              )}
                                            </button>
                                          </Tooltip>
                                        </div>
                                      </div>

                                      <AnimatePresence initial={false}>
                                        {!pCollapsed && (
                                          <motion.div
                                            key="proj-body"
                                            layout
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: "easeOut" }}
                                          >
                                            {(() => {
                                              const key = `${p.id}|${statusKey}`;
                                              const full = byProjectStatus.get(key) || [];
                                              const list = full.slice(0, 10);
                                              return (
                                                <div className="p-2">
                                                  {/* mini header: Recent 10 + View all */}
                                                  <motion.div
                                                    className="flex items-center justify-between px-2 pb-2 text-sm text-gray-600"
                                                    initial={{ opacity: 0, y: 4 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true, amount: 0.5 }}
                                                    transition={{ duration: 0.2 }}
                                                  >
                                                    <span className="font-medium ">Recent 10 activities</span>
                                                    <button
                                                      className="text-brand-blue1 hover:underline cursor-pointer"
                                                      onClick={() => onViewProject?.({ projectId: p.id, status: statusKey })}
                                                    >
                                                      View all
                                                    </button>
                                                  </motion.div>

                                                  <AnimatePresence initial={false}>
                                                    {list.map((t, ti) => {
                                                      const role = getSeoAccessRole(t.projectId);
                                                      const taskWithRole = { ...t, __seoRole: role };
                                                      return (
                                                        <motion.div
                                                          key={t.id}
                                                          layout
                                                          initial={{ opacity: 0, scale: 0.98, y: 6 }}
                                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                                          exit={{ opacity: 0, scale: 0.98, y: -6 }}
                                                          transition={{ duration: 0.22, ease: "easeOut", delay: ti * 0.015 }}
                                                        >
                                                          <TaskCard task={taskWithRole} onClick={onTaskClick} />
                                                        </motion.div>
                                                      )
                                                    })}
                                                  </AnimatePresence>

                                                  {list.length === 0 && (
                                                    <motion.div
                                                      key="empty"
                                                      initial={{ opacity: 0, y: 6 }}
                                                      animate={{ opacity: 1, y: 0 }}
                                                      exit={{ opacity: 0, y: -6 }}
                                                      transition={{ duration: 0.2 }}
                                                      className="text-xs p-2 text-gray-500"
                                                    >
                                                      No tasks match current filters.
                                                    </motion.div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.section>
              )
            })}
          </>
        </motion.div>
      </div>
    </div>

  )
}

// ===== Helpers =====
function createProjectsAndGroupsFromCampaignData(campaignData) {
  if (!campaignData) return { groups: [], projects: [] }
  const groups = [
    { id: "g1", name: "My Projects" },
    { id: "g2", name: "Shared Projects" },
  ]
  const projects = []

  if (campaignData.as_manager) {
    campaignData.as_manager.forEach((project) => {

      projects.push({ id: project.project_id.toString(), name: project.project_name || project.domain, url: project.url, groupId: "g1" })
    })
  }
  if (campaignData.as_member) {
    campaignData.as_member.forEach((project) => {
      projects.push({ id: project.project_id.toString(), name: project.project_name || project.domain, url: project.url, groupId: "g2", accesses: project.accesses })
    })
  }
  return { groups, projects }
}

export default function KanbanViewDemo({ campaignData, onUpdate, filters, accessFilter = { mine: true, shared: true },
  selectedProjectIds = [] }) {

  const dispatch = useDispatch()

  const { groups, projects } = React.useMemo(
    () => createProjectsAndGroupsFromCampaignData(campaignData),
    [campaignData],
  )
  const summaryByProject = React.useMemo(() => {
    const map = {}
    if (!campaignData) return map
      ; (campaignData.as_manager || []).forEach((p) => (map[p.project_id.toString()] = p.summary || {}))
      ; (campaignData.as_member || []).forEach((p) => (map[p.project_id.toString()] = p.summary || {}))
    return map
  }, [campaignData])

  // existing
  const [openCreate, setOpenCreate] = React.useState(false)
  const [project, setProject] = React.useState("")
  const [projectId, setProjectId] = React.useState("")
  const [status, setStatus] = React.useState("")

  const projectsAccessFiltered = React.useMemo(() => {
    return projects.filter((p) => {
      if (!accessFilter.mine && p.groupId === "g1") return false;
      if (!accessFilter.shared && p.groupId === "g2") return false;
      return true;
    });
  }, [projects, accessFilter]);

  const groupsFiltered = React.useMemo(() => {
    return groups.filter((g) => {
      if (g.id === "g1") return !!accessFilter.mine;
      if (g.id === "g2") return !!accessFilter.shared;
      return true;
    });
  }, [groups, accessFilter]);

  const projectsFiltered = React.useMemo(() => {
    if (!selectedProjectIds?.length) return projectsAccessFiltered;
    const set = new Set(selectedProjectIds);
    return projectsAccessFiltered.filter((p) => set.has(String(p.id)));
  }, [projectsAccessFiltered, selectedProjectIds]);

  function applyTaskFilters(tasks, filters, currentUserId) {
    if (!filters) return tasks;
    const now = new Date();
    return tasks.filter((t) => {
      // Priority
      if (filters.high && !(t.priority === "High" || t.priority === "critical" || t.priority === "Critical")) return false;

      // Mine (assignee)
      if (filters.mine && !(t.assignee && (t.assignee.id === currentUserId || t.assignee_id === currentUserId))) return false;

      // Due dates
      const due = t.dueDate || t.due_date;
      if (filters.overdue) {
        if (!due) return false;
        if (new Date(due) >= now) return false;
      }
      if (filters.dueToday) {
        if (!due) return false;
        const d = new Date(due);
        const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        if (!sameDay) return false;
      }
      return true;
    });
  }

  const reduxTasks = useSelector((state) => {
    const out = []
    for (const p of projectsFiltered) {
      const pid = Number(p.id)
      for (const st of ["not_started", "working", "under_review", "completed"]) {
        const items = selectActivitiesByProjectStatus(state, pid, st)
        for (const a of items) out.push(transformApiTaskToComponent(a, pid))
      }
    }
    return out
  })

  const currentUserId = useSelector((state) => state?.auth?.user?.id); // adjust if you store elsewhere
  const tasksFiltered = React.useMemo(
    () => applyTaskFilters(reduxTasks, filters, currentUserId),
    [reduxTasks, filters, currentUserId]
  );

  const [hideEmpty, setHideEmpty] = React.useState(false)

  const [loadedProjects, setLoadedProjects] = React.useState({})

  // NEW — Drawer state
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerTask, setDrawerTask] = React.useState(null)

  const [drawerId, setDrawerId] = React.useState(null)

  // simple user/project lists for pickers (replace with real lists if available)
  const users = React.useMemo(() => {
    const base = [{ id: "me", name: "You", role: "Editor" }]
    if (drawerTask && drawerTask.assignee_id && !base.some((u) => String(u.id) === String(drawerTask.assignee_id))) {
      base.push({
        id: drawerTask.assignee_id,
        name: drawerTask.assignee_name || String(drawerTask.assignee_id),
        role: "Member",
      })
    }
    return base
  }, [drawerTask])

  const projectRefs = React.useMemo(() => projectsFiltered.map((p) => ({ id: p.id, name: p.name })), [projectsFiltered])

  function transformApiTaskToComponent(apiTask, projectId) {
    const priority = String(apiTask.priority || "").toLowerCase()
    // accept either "Not Started" (title) or "not_started" (slug)
    const rawStatus = String(apiTask.status || "").trim()
    const internal =
      rawStatus === "not_started" || rawStatus === "Not Started"
        ? STATUS.NOT_STARTED
        : rawStatus === "working" || rawStatus === "Working"
          ? STATUS.IN_PROGRESS
          : rawStatus === "under_review" || rawStatus === "Under Review"
            ? STATUS.REVIEW
            : STATUS.COMPLETED
    return {
      id: apiTask.id.toString(),
      title: apiTask.title,
      projectId: projectId.toString(),
      groupId: "g1",
      status: internal,
      priority: priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low",

      campaignType: "SEO",
      assignee: apiTask.assigned_to
        ? {
          id: apiTask.assigned_to,
          name: apiTask.assigned_to,
          firstName: String(apiTask.assigned_to).split("@")[0] || String(apiTask.assigned_to),
        }
        : null,
      dueDate: apiTask.due_date,
      commentsCount: 0,
      raw: apiTask,
    }
  }
  const store = useStore()
  const getListMeta = React.useCallback(
    (projId, internalStatus) => {
      const state = store.getState()
      return selectListMeta(state, Number(projId), internalStatus)
    },
    [store],
  )

  const handleLoadMoreTasks = React.useCallback(
    async (projId, internalStatus) => {
      const meta = getListMeta(projId, internalStatus)
      if (!meta?.next) return // No more pages to load

      await dispatch(
        fetchActivitiesPage({
          projectId: Number(projId),
          status: internalStatus,
          pageUrl: meta.next,
          replace: false, // Always append to existing list
        }),
      )
    },
    [dispatch, getListMeta],
  )

  const [projId, setProjId] = useState(null)

  const onLoadProjectInitial = React.useCallback(
    async (projId, apiStatusesToLoad = []) => {
      projId && setProjId(projId)
      if (loadedProjects[projId]) return
      for (const apiSlug of apiStatusesToLoad) {
        await dispatch(fetchActivitiesPage({ projectId: Number(projId), status: apiSlug, replace: true }))
      }
      setLoadedProjects((prev) => ({ ...prev, [projId]: true }))
    },
    [loadedProjects, dispatch],
  )

  function handleAddTask({ project, projectId, status }) {
    setProject(project)
    setStatus(status)
    setProjectId(projectId)
    setOpenCreate(true)
  }

  const router = useRouter()

  function handleViewProject({ projectId }) {
    router.push(`/project-task-overview?projectId=${projectId}`)
  }
  const [drawerUserRole, setDrawerUserRole] = React.useState("editor");

  function handleTaskClick(task) {
    const role = task?.__seoRole ?? getSeoAccessRole(task.projectId);
    setDrawerUserRole(role);
    setDrawerTask(null);
    setDrawerId(task.id);
    setDrawerOpen(true);
  }

  async function saveTaskHook(dt) {
    // Use slice → PATCH + auto refresh
    await dispatch(
      patchActivity({
        id: Number(dt.id),
        patch: {
          title: dt.title,
          status: STATUS_TO_API[dt.status], // send backend slug
          priority: dt.priority[0].toUpperCase() + dt.priority.slice(1),
          date: dt.start_date || null,
          due_date: dt.due_date || null,
          notes: dt.internal_notes || "",
          description: dt.description_html ? String(dt.description_html).replace(/<[^>]*>/g, "") : "",
        },
      }),
    ).unwrap()
    await onUpdate?.()
  }

  async function deleteTaskHook(taskId) {
    await dispatch(deleteActivity(Number(taskId))).unwrap()
    setDrawerOpen(false)
    onUpdate?.()
  }
  return (
    <div className="flex flex-col overflow-hidden ">
      <div className="flex items-center justify-between  px-5 border-gray-300 ">
        <div className="text-lg font-bold">Kanban View – All Projects</div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs flex items-center gap-1.5 cursor-pointer ">
            <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} /> Hide empty
            projects
          </label>
        </div>
      </div>

      <KanbanBoard
        groups={groupsFiltered}
        projects={projectsFiltered}
        tasks={tasksFiltered}
        hideEmptyProjects={hideEmpty}
        onMoveTask={() => { }}
        onAddTask={handleAddTask}
        onViewProject={handleViewProject}
        onTaskClick={handleTaskClick}
        onLoadMoreTasks={handleLoadMoreTasks}
        onLoadProjectInitial={onLoadProjectInitial}
        summaryByProject={summaryByProject}
        loadedProjects={loadedProjects}
      />

      {projectId && (
        <TaskCreationDrawerDemo
          open={openCreate}
          setOpen={setOpenCreate}
          type={"createNew"}
          idPassed={projectId}
          projectPassed={project}
          onUpdate={onUpdate}
        />
      )}

      <TaskManagerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        task={drawerTask}
        taskId={drawerId}
        users={users}
        projects={projectRefs}
        userRole={drawerUserRole}
        onUpdate={async () => {
          await onUpdate?.()
          if (projId) {
            const statuses = ["not_started", "working", "under_review", "completed"]
            for (const status of statuses) {
              const meta = getListMeta(projId, status)
              await dispatch(
                fetchActivitiesPage({
                  projectId: Number(projId),
                  status,
                  pageUrl: meta?.next,
                }),
              )
            }
          }
        }}
        api={{
          baseUrl: BASE_URL_WR,
          auth: { type: "bearer", token: Cookies.get("login_access_token_wrank") },
        }}
        onSave={saveTaskHook}
        onDelete={(id) => deleteTaskHook(id)}
      />
    </div>
  )
}
