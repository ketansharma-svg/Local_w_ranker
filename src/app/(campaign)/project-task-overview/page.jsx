"use client"

import { AnimatePresence, motion } from "framer-motion"
import Cookies from "js-cookie"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState } from "react"
import { fetchCampaignOverview, selectCampaignOverview, selectCampaignOverviewLoading } from "@/src/redux/reducer/campaignReducer"
import {
  deleteActivity,
  fetchActivitiesPage,
  fetchActivityById,
  patchActivity,
  selectActivitiesByProjectStatus,
  selectListMeta,
} from "@/src/redux/reducer/campaignReducer"
import { useDispatch, useSelector, useStore } from "react-redux"

import { BASE_URL_WR } from "@/src/util/api"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import TaskManagerDrawer, { fromApiActivity } from "../campaign-activity/TaskViewDrawer"
import axios from "axios"
import { toast } from "sonner"
import TasksActivitiesTable from "./TableTaskViewsNew"

// Existing lazy parts
const Demo_ProjectHeader = dynamic(() => import("./PanelHeaderbar"), { ssr: false })
const ProjectTaskSummaryKpiRow = dynamic(() => import("./KPISummaryCards"), { ssr: false })
const ProjectKanbanDemo = dynamic(() => import("./KanbanTaskViews"), { ssr: false })
const ProjectGantt = dynamic(() => import("./GanttTaskViews"), { ssr: false })
const ProjectScopedFiltersDemo = dynamic(() => import("./FiltersDrawer"), { ssr: false })
const ProjectAnalyticsTeamActivity = dynamic(() => import("./Analytics&TeamActivity"), { ssr: false })
const TaskCreationDrawerDemo = dynamic(() => import("./UniversalTaskCreationDrawer"), { ssr: false })

export default function ProjectTaskOverview() {
  const dispatch = useDispatch()
  const store = useStore()
  const router = useRouter()
  const pathname = usePathname()

  const [currentView, setCurrentView] = useState("kanban")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openCreate, setOpenCreate] = useState(false)
  const [activeFilters, setActiveFilters] = useState({});
  const [filtersCount, setFiltersCount] = useState(0);
  const [kpiData, setkpiData] = useState();
  const [bootstrapping, setBootstrapping] = useState(true)

  const [kpiLoading, setkpiLoading] = useState(false)

  const searchParams = useSearchParams()
  useEffect(() => {
    const domainParam = searchParams.get("domain")
    if (!domainParam) return

    const params = new URLSearchParams(searchParams.toString())
    params.delete("domain")
    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [pathname, router, searchParams])
  const projectId = Number(searchParams.get("projectId")) || null
  // Initial load (Redux-backed) – wait for all buckets before showing board
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!projectId) {
        setBootstrapping(false)
        return
      }
      setBootstrapping(true)
      const statuses = ["not_started", "working", "under_review", "completed"]
      try {
        await Promise.all(
          statuses.map((status) =>
            dispatch(fetchActivitiesPage({ projectId, status, replace: true })),
          ),
        )
      } catch (err) {
        console.error("Failed to bootstrap activities", err)
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [projectId, dispatch])
  useEffect(() => {
    getKpiData()
  }, [projectId])

  // Select lists from reducer (same approach as KanbanView.jsx)
  const notStarted = useSelector((s) =>
    projectId ? selectActivitiesByProjectStatus(s, projectId, "not_started") : [],
  )
  const working = useSelector((s) =>
    projectId ? selectActivitiesByProjectStatus(s, projectId, "working") : [],
  )
  const underReview = useSelector((s) =>
    projectId ? selectActivitiesByProjectStatus(s, projectId, "under_review") : [],
  )
  const completed = useSelector((s) =>
    projectId ? selectActivitiesByProjectStatus(s, projectId, "completed") : [],
  )

  // Infinite scroll (per-status “next” from reducer meta)
  const getMeta = useCallback(
    (st) => (projectId ? selectListMeta(store.getState(), projectId, st) : null),
    [store, projectId],
  )

  const [loadingNext, setLoadingNext] = useState({
    not_started: 0,
    working: 0,
    under_review: 0,
    completed: 0,
  })

  const adjustLoading = useCallback((statusKey, delta) => {
    setLoadingNext((m) => ({ ...m, [statusKey]: Math.max(0, (m[statusKey] || 0) + delta) }))
  }, [])

  const fetchNextForStatus = useCallback(async (statusKey, opts = {}) => {
    if (!projectId) return
    const { page, pageSize = 10 } = opts
    const meta = getMeta(statusKey)
    const run = async (payload) => {
      adjustLoading(statusKey, 1)
      try {
        await dispatch(fetchActivitiesPage(payload))
      } finally {
        adjustLoading(statusKey, -1)
      }
    }

    if (page) {
      await run({ projectId, status: statusKey, page, pageSize, replace: false })
      return
    }

    const nextUrl = meta?.next
    if (!nextUrl || loadingNext[statusKey] > 0) return
    await run({ projectId, status: statusKey, pageUrl: nextUrl, replace: false })
  }, [projectId, getMeta, adjustLoading, dispatch, loadingNext])

  const handleMoveTask = async (taskId, from, to) => {
    try {
      if (to === "completed") {
        await axios.post(
          `${BASE_URL_WR}campaign-activities-new/complete/${taskId}/`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await dispatch(
          patchActivity({ id: Number(taskId), patch: { status: to } })
        ).unwrap();
      }

      await getKpiData();

      await refreshAll();
    } catch (err) {
      console.error("Error updating task:", err);
      toast.error("Failed to update task");
    }
  };

  const metaNotStarted = getMeta("not_started")
  const metaWorking = getMeta("working")
  const metaUnderReview = getMeta("under_review")
  const metaCompleted = getMeta("completed")

  const pageInfo = {
    not_started: {
      next: metaNotStarted?.next,
      previous: metaNotStarted?.previous,
      count: metaNotStarted?.count,
      loading: !!metaNotStarted?.loading || loadingNext.not_started > 0,
    },
    working: {
      next: metaWorking?.next,
      previous: metaWorking?.previous,
      count: metaWorking?.count,
      loading: !!metaWorking?.loading || loadingNext.working > 0,
    },
    under_review: {
      next: metaUnderReview?.next,
      previous: metaUnderReview?.previous,
      count: metaUnderReview?.count,
      loading: !!metaUnderReview?.loading || loadingNext.under_review > 0,
    },
    completed: {
      next: metaCompleted?.next,
      previous: metaCompleted?.previous,
      count: metaCompleted?.count,
      loading: !!metaCompleted?.loading || loadingNext.completed > 0,
    },
  };

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerId, setDrawerId] = useState(null)

  const onTaskClick = (id) => {
    setDrawerId(id)
    setDrawerUserRole(getProjectRoleFromOverview(overview, projectId))
    setDrawerOpen(true)
  }

  const refreshAll = useCallback(async () => {
    if (!projectId) return
    const statuses = ["not_started", "working", "under_review", "completed"]
    for (const status of statuses) {
      await dispatch(fetchActivitiesPage({ projectId, status, replace: true }))
    }
  }, [projectId, dispatch])

  const saveTaskHook = async (dt) => {
    await dispatch(
      patchActivity({
        id: Number(dt.id),
        patch: {
          title: dt.title,
          status: dt.status, // slugs: 'not_started' | 'working' | 'under_review' | 'completed'
          priority: dt.priority[0].toUpperCase() + dt.priority.slice(1),
          date: dt.start_date || null,
          due_date: dt.due_date || null,
          notes: dt.internal_notes || "",
          description: dt.description_html ? String(dt.description_html).replace(/<[^>]*>/g, "") : "",
        },
      }),
    ).unwrap()
    await refreshAll()
  }

  const deleteTaskHook = async (id) => {
    await dispatch(deleteActivity(Number(id))).unwrap()
    setDrawerOpen(false)
    await refreshAll()
  }

  // Motion variants preserved from original
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  }
  const token = Cookies.get("login_access_token_wrank")

  const getKpiData = async () => {
    if (projectId) {
      try {
        setkpiLoading(true)
        const kpidata = await axios.get(`${BASE_URL_WR}projects/overview/${projectId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setkpiData(kpidata.data)

      } catch (e) {
        console.log(e);
        setkpiLoading(false)
      } finally {
        setkpiLoading(false)
      }
    }
  }

  function getProjectRoleFromOverview(overview, projectId) {
    const id = String(projectId || "")
    if (!overview || !id) return "viewer"
    const asMgr = (overview.as_manager || []).find(p => String(p.project_id) === id)
    if (asMgr) return "admin"
    const asMem = (overview.as_member || []).find(p => String(p.project_id) === id)
    if (asMem) {
      const seo = Array.isArray(asMem.accesses) ? asMem.accesses.find(a => a?.dashboard_type === "SEO") : null
      const lvl = (seo?.access_level || "").toLowerCase()
      return lvl === "viewer" ? "viewer" : lvl === "editor" ? "editor" : "admin"
    }
    return "viewer"
  }

  function getProjectMetaFromOverview(overview, projectId) {
    const id = String(projectId || "")
    if (!overview || !id) return null
    const mapEntry = (entry, membership) => ({
      id: String(entry?.project_id ?? entry?.id ?? id),
      name: entry?.project_name || entry?.domain || entry?.url || "Untitled Project",
      domain: entry?.domain || "",
      url: entry?.url || "",
      is_shared: membership === "as_member",
      membership,
      accesses: entry?.accesses || [],
    })
    const asMgr = (overview.as_manager || []).find((p) => String(p.project_id) === id)
    if (asMgr) return mapEntry(asMgr, "as_manager")
    const asMem = (overview.as_member || []).find((p) => String(p.project_id) === id)
    if (asMem) return mapEntry(asMem, "as_member")
    return null
  }

  const overview = useSelector(selectCampaignOverview)
  const overviewLoading = useSelector(selectCampaignOverviewLoading)
  const projectMeta = useMemo(
    () => getProjectMetaFromOverview(overview, projectId),
    [overview, projectId],
  )

  useEffect(() => {
    if (!overview && !overviewLoading) {
      dispatch(fetchCampaignOverview())
    }
  }, [overview, overviewLoading, dispatch])

  // ---- Map API item -> TasksActivitiesTable row (status & priority canonical)
  const mapItemToTaskRow = useCallback((item) => {
    const slug = String(item?.status || "").toLowerCase()
    const status =
      slug.includes("complete") ? "done" :
        slug.includes("review") ? "review" :
          slug.includes("work") ? "inprogress" :
            slug.includes("block") ? "blocked" : "todo"

    const p = String(item?.priority || "").toLowerCase()
    const priority =
      p.startsWith("h") ? "P1" :
        p.startsWith("m") ? "P2" :
          p.startsWith("l") ? "P3" : "P4"

    const pick = (s) => (typeof s === "string" ? s.slice(0, 10) : undefined)
    const assignee = item?.assigned_to != null
      ? { id: String(item.assigned_to), name: item.assigned_to_name || "Assigned" }
      : null

    return {
      id: String(item.id),
      title: item.title || "Untitled task",
      description: item.description || "",
      status,
      priority,
      assignee,
      startAt: pick(item.date) || pick(item.created_at) || null,
      dueAt: pick(item.due_date) || null,
      // spentSeries (14‑day bars) is optional; provide when API supports it
    }
  }, [])

  const fetchPageForTable = useCallback(
    async (statusKey, pageNumber, pageSize) => {
      if (!projectId) return []
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const res = await axios.get(`${BASE_URL_WR}campaigns/activities/${projectId}/`, {
        params: { status: statusKey, page: pageNumber, page_size: pageSize },
        headers,
      })
      return (res.data?.results || []).map(mapItemToTaskRow)
    },
    [projectId, token, mapItemToTaskRow],
  )

  // ---- Merge all status buckets, de‑dupe by id
  const rows = useMemo(() => {
    const merged = [
      ...(notStarted || []),
      ...(working || []),
      ...(underReview || []),
      ...(completed || []),
    ].map(mapItemToTaskRow)
    const seen = new Set()
    return merged.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)))
  }, [notStarted, working, underReview, completed, mapItemToTaskRow])

  const anyLoading =
    !!pageInfo.not_started?.loading || !!pageInfo.working?.loading ||
    !!pageInfo.under_review?.loading || !!pageInfo.completed?.loading
  const initialLoading = rows.length === 0 && anyLoading
  const initialError = null // If you plumb error into reducer meta, pass it down here.

  const [drawerUserRole, setDrawerUserRole] = useState("admin")
  const canCreateTasks = drawerUserRole !== "viewer"
  const handleOpenCreateDrawer = useCallback(() => {
    if (!projectId) {
      toast.error("Select a project first.")
      return
    }
    if (!canCreateTasks) {
      toast.error("You only have viewer access for this project.")
      return
    }
    setOpenCreate(true)
  }, [projectId, canCreateTasks])
  useEffect(() => {
    setDrawerUserRole(getProjectRoleFromOverview(overview, projectId))
  }, [overview, projectId])


  // === Render ===
  return (
    <div className="min-h-screen bg-gray-50">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mx-auto">
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Demo_ProjectHeader
            onViewChange={setCurrentView}
            onOpenFilters={() => setFiltersOpen(true)}
            onOpenNewTask={handleOpenCreateDrawer}
          />
        </motion.div>

        {/* KPI Summary */}
        <motion.div variants={itemVariants} className="px-4 py-2">
          <ProjectTaskSummaryKpiRow kpiData={kpiData} loading={kpiLoading} />
        </motion.div>

        {/* Main Content */}
        <div className="px-4 py-4 space-y-6">
          <motion.div variants={itemVariants}>
            <AnimatePresence mode="wait">
              {currentView === "kanban" && (
                <motion.div key="kanban" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
                  <ProjectKanbanDemo
                    notStarted={notStarted}
                    inProgress={working}
                    completed={completed}
                    underReview={underReview}
                    pageInfo={pageInfo}
                    onLoadMore={fetchNextForStatus}
                    onMoveTask={handleMoveTask}
                    onTaskClick={onTaskClick}
                    projectId={projectId}
                    bootstrapping={bootstrapping}
                    role={drawerUserRole}
                    projectMeta={projectMeta || undefined}
                  />
                </motion.div>
              )}

              {currentView === "gantt" && (
                <motion.div key="gantt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
                  <ProjectGantt
                    notStarted={notStarted}
                    inProgress={working}
                    completed={completed}
                    underReview={underReview}
                    pageInfo={pageInfo}
                    onLoadMore={fetchNextForStatus}
                    onUpdateDates={async (taskId, startISO, endISO) => {
                      await dispatch(
                        patchActivity({
                          id: Number(taskId),
                          patch: { date: startISO ?? null, due_date: endISO ?? null },
                        }),
                      ).unwrap()
                    }}
                  />
                </motion.div>
              )}

              {currentView === "table" && (
                <motion.div key="table" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
                  <TasksActivitiesTable
                    projectName={String(projectId || "")}
                    rows={rows}
                    loading={initialLoading}
                    error={initialError}
                    pageInfo={pageInfo}
                    onLoadMore={fetchNextForStatus}
                    fetchPage={fetchPageForTable}
                    onOpenTask={onTaskClick}
                    onCompleteTask={async (id) => {
                      try {
                        await axios.post(
                          `${BASE_URL_WR}campaign-activities-new/complete/${id}/`,
                          {},
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        await getKpiData();
                        await refreshAll();
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to mark task complete");
                      }
                    }}

                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Filters Drawer */}
        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-25 z-40"
                onClick={() => setFiltersOpen(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 z-50"
              >
                <ProjectScopedFiltersDemo onClose={() => setFiltersOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating Action Button */}
      {canCreateTasks && projectId && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-brand-blue1 text-white rounded-full shadow-lg hover:bg-brand-blue1/80 flex items-center justify-center text-xl z-30 cursor-pointer"
          onClick={handleOpenCreateDrawer}
          title="Quick add task"
        >
          +
        </motion.button>
      )}

      {/* Create Task Drawer */}
      {projectId && (
        <TaskCreationDrawerDemo
          open={openCreate}
          setOpen={setOpenCreate}
          type={"createNew"}
          idPassed={projectId}
          projectPassed={projectMeta || undefined}
          onUpdate={async () => {
            await refreshAll()
            await getKpiData()
          }}
        />
      )}

      <TaskManagerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        taskId={drawerId ?? undefined}
        userRole={drawerUserRole}
        api={{
          baseUrl: BASE_URL_WR,
          auth: { type: "bearer", token: token },
        }}
        onSave={saveTaskHook}
        onDelete={deleteTaskHook}
        onUpdate={refreshAll}
      />
    </div>
  )
}
