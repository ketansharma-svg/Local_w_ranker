"use client"

import {
  fetchCampaignOverview,
  selectCampaignOverview,
  selectCampaignOverviewLoading,
} from "@/src/redux/reducer/campaignReducer"
import type { AppDispatch, RootState } from "@/src/redux/store"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useDispatch, useSelector } from "react-redux"
import GanttDemoApp from "./GanttChartView"
import HeaderBar from "./HeaderBar"
import AllProjectsTaskSummary from "./KPISummaryCards"
import KanbanView from "./KanbanView"
import ListView from "./ListView"
import { Skeleton } from "antd"
import { buildUnifiedCampaignProjects } from "../campaignProjects"

type ViewMode = "kanban" | "gantt" | "table"

export default function Page() {
  const [view, setView] = useState<ViewMode>("kanban")
  const dispatch = useDispatch<AppDispatch>()
  const campaignData = useSelector((s: RootState) => selectCampaignOverview(s))
  const loading = useSelector((s: RootState) => selectCampaignOverviewLoading(s))
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [taskFilters, setTaskFilters] = useState({
    overdue: false,
    dueToday: false,
    high: false,
    mine: false,
  })
  const [filtersCount, setFiltersCount] = useState(0)
  const [accessFilter, setAccessFilter] = useState<any>({ mine: true, shared: true })
  const [selectedProjectIds, setSelectedProjectIds] = useState<any>([])

  useEffect(() => {
    const domainParam = searchParams.get("domain")
    if (!domainParam) return

    const params = new URLSearchParams(searchParams.toString())
    params.delete("domain")
    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [pathname, router, searchParams])

const projectsForHeader = useMemo(() => {
  const unified = buildUnifiedCampaignProjects(campaignData)

  return unified.map((p) => ({
    id: p.id,
    name: p.name,
    groupId: p.is_shared ? "g2" : "g1",   // g1 = mine, g2 = shared
    domain: p.domain,
    url: p.url,
    is_shared: p.is_shared,
    accesses: p.accesses,
  }))
}, [campaignData])


  useEffect(() => {
    if (projectsForHeader.length > 0 && selectedProjectIds.length === 0) {
      // Filter projects based on current access settings
      const availableProjects = projectsForHeader.filter(
        (p) => (accessFilter.mine && p.groupId === "g1") || (accessFilter.shared && p.groupId === "g2"),
      )
      setSelectedProjectIds(availableProjects.map((p) => p.id))
    }
  }, [projectsForHeader, accessFilter]) // Include accessFilter in dependencies

  const handleAccessChange = useCallback(
    (newAccessFilter: { mine: boolean; shared: boolean }) => {
      setAccessFilter(newAccessFilter)

      // Update selected projects based on new access settings
      setSelectedProjectIds((prev) => {
        const allowedProjects = projectsForHeader.filter(
          (p) => (newAccessFilter.mine && p.groupId === "g1") || (newAccessFilter.shared && p.groupId === "g2"),
        )
        const allowedIds = new Set(allowedProjects.map((p) => p.id))

        // Keep only projects that are still allowed
        const filteredIds = prev.filter((id) => allowedIds.has(id))

        // If no projects remain selected, select all allowed projects
        if (filteredIds.length === 0 && allowedProjects.length > 0) {
          return allowedProjects.map((p) => p.id)
        }

        return filteredIds
      })
    },
    [projectsForHeader],
  )

  const handleProjectSelectionChange = useCallback((ids: string[]) => {
    setSelectedProjectIds(ids)
  }, [])

  const filteredCampaignData = useMemo(() => {
    if (!campaignData || selectedProjectIds.length === 0) return campaignData

    const selectedIdSet = new Set(selectedProjectIds)

    return {
      ...campaignData,
      as_manager: campaignData.as_manager?.filter((p) => selectedIdSet.has(String(p.project_id))) || [],
      as_member: campaignData.as_member?.filter((p) => selectedIdSet.has(String(p.project_id))) || [],
    }
  }, [campaignData, selectedProjectIds])


  useEffect(() => {
    dispatch(fetchCampaignOverview())
  }, [dispatch])

  const refreshOverview = useCallback(() => {
    dispatch(fetchCampaignOverview())
  }, [dispatch])

  return (
    <MotionConfig reducedMotion="user">
      <main className="">
        {/* Header with entrance animation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <HeaderBar
            view={view as ViewMode}
            onViewChange={setView}
            onFiltersChange={(state, count) => {
              setTaskFilters(state)
              setFiltersCount(count)
            }}
            projects={projectsForHeader}
            onAccessChange={handleAccessChange}
            onProjectSelectionChange={handleProjectSelectionChange}
          />
        </motion.div>

        {/* KPI Summary with index-based entrance */}
        <motion.section
          className="mx-auto px-4 py-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {loading ? (
            <div className="w-full flex flex-wrap mb-4 ">
              <div
                className="h-24 w-full rounded-xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer"
              ></div>
            </div>
          ) : (
            <AllProjectsTaskSummary campaignData={filteredCampaignData} />
          )}

        </motion.section>

        <section className="mx-auto pb-16">
          <AnimatePresence mode="wait">
            {view === "kanban" && (
              <motion.div
                key="kanban"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
              >
                <KanbanView
                  campaignData={filteredCampaignData}
                  onUpdate={refreshOverview}
                  filters={taskFilters}
                  accessFilter={accessFilter}
                  selectedProjectIds={selectedProjectIds}
                />
              </motion.div>
            )}
            {view === "gantt" && (
              <motion.div
                key="gantt"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
              >
                <GanttDemoApp campaignData={filteredCampaignData} />
              </motion.div>
            )}
            {view === "table" && (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
              >
                <ListView
                  campaignData={filteredCampaignData}
                  filters={taskFilters}
                  accessFilter={accessFilter}
                  selectedProjectIds={selectedProjectIds}
                  onUpdate={refreshOverview}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </MotionConfig>
  )
}
