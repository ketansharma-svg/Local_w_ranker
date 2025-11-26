"use client"

import { DatePicker, message } from "antd"
import type { Dayjs } from "dayjs"
import dayjs from "dayjs"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import Cookies from "js-cookie"
import { ChevronDown, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { FcGoogle } from "react-icons/fc"
import { toast } from "sonner"

import { GaIntegrationPanel } from "@/src/components/ga/GaIntegrationPanel"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import { useProjectContext } from "@/src/redux/providers/ProjectContext"
import { BASE_URL_WR } from "@/src/util/api"
import { clearGaCache, GaProperty, hasValidGaCache, readGaCache, writeGaCache } from "@/src/util/gaIntegration"

const { RangePicker } = DatePicker
const MIN = dayjs().subtract(3, "month")
const MAX = dayjs()

type GaIntegrationSectionProps = {
  onOverviewData?: (data: any | null) => void
  onOverviewLoadingChange?: (loading: boolean) => void
  onOverviewError?: (error: string | null) => void
  onDateRangeChange?: (range: { start: string; end: string; projectId?: number } | null) => void
  shouldFetchOverview?: boolean
}

const normalizePropertyId = (resourceName: string) => {
  if (!resourceName) return resourceName
  const parts = resourceName.split("/")
  return parts[parts.length - 1] || resourceName
}

export function GaIntegrationSection({
  onOverviewData,
  onOverviewLoadingChange,
  onOverviewError,
  onDateRangeChange,
  shouldFetchOverview = true
}: GaIntegrationSectionProps) {
  const { selectedProject, refreshProjects } = useProjectManager()  
  
  const { updateProject } = useProjectContext()
  const { data: sessionData, status } = useSession()
  const session = sessionData as (typeof sessionData & { accessToken?: string; refreshToken?: string }) | null
  const hasSession = status === "authenticated" && !!session?.accessToken

  const [project, setProject] = useState<any>(selectedProject || null)
  const [propertyOptions, setPropertyOptions] = useState<{ value: string; label: string; accountName?: string }[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string | undefined>(undefined)
  const [isLoadingProperties, setIsLoadingProperties] = useState(false)
  const [gaDateRange, setGaDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [datePreset, setDatePreset] = useState<"last7" | "last30" | "last90" | "custom">("last7")
  const [justLinked, setJustLinked] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null)
  const [overviewData, setOverviewData] = useState<any | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [isOverviewPolling, setIsOverviewPolling] = useState(false)

  const autoCollapsedRef = useRef(false)
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPollingTimer = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearPollingTimer()
    }
  }, [clearPollingTimer])
  const hasPersistedGaConnection = Boolean(
    project?.analytics_id_data && project?.ga_email_data,
  )
  const isConnected = justLinked ? true : hasPersistedGaConnection

  useEffect(() => {
    if (!hasPersistedGaConnection) {
      setIsPanelCollapsed(false)
      autoCollapsedRef.current = false
      return
    }

    if (!autoCollapsedRef.current && !justLinked) {
      setIsPanelCollapsed(true)
      autoCollapsedRef.current = true
    }
  }, [hasPersistedGaConnection, justLinked])

  const prevProjectIdRef = useRef<number | string | null>(selectedProject?.id ?? null)

  useEffect(() => {
    if (!selectedProject) {
      setProject(null)
      setSelectedProperty(undefined)
      return
    }

    const currentProjectId = selectedProject.id ?? null
    const projectChanged = prevProjectIdRef.current !== currentProjectId
    prevProjectIdRef.current = currentProjectId

    setProject(selectedProject)

    const rawPropertyId =
      selectedProject.analytics_id_data ?? selectedProject.analytics_id ?? null

    const normalizedExistingProperty = rawPropertyId
      ? normalizePropertyId(String(rawPropertyId))
      : undefined

    setSelectedProperty(normalizedExistingProperty)

    if (projectChanged) {
      setIsPanelCollapsed(false)
      autoCollapsedRef.current = false
      setJustLinked(false)
    }
  }, [selectedProject])

  useEffect(() => {
    if (!hasSession) return
    const cache = readGaCache()
    if (hasValidGaCache(cache)) {
      setPropertyOptions(
        cache!.properties.map((p) => ({
          value: normalizePropertyId(p.propertyId),
          label: `${p.displayName} (${normalizePropertyId(p.propertyId)})`,
          accountName: p.accountId,
        }))
      )
      setLastFetchedAt(cache!.timestamp)
    }
  }, [hasSession])

  const fetchGaProperties = useCallback(async () => {
    if (!session?.accessToken) throw new Error("Google session missing access token.")

    const response = await fetch("https://analyticsadmin.googleapis.com/v1alpha/accountSummaries?pageSize=200", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/json",
      },
    })

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message ||
          "Access denied to Google Analytics. Ensure the API is enabled and you have permissions."
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed to fetch account summaries (${response.status}).`)
    }

    const data = await response.json()
    const summaries: GaProperty[] = []

    const accountSummaries = (data.accountSummaries || []) as Array<{
      account: string
      displayName?: string
      propertySummaries?: Array<{ property: string; displayName: string }>
    }>

    for (const account of accountSummaries) {
      const props = account.propertySummaries || []
      for (const prop of props) {
        summaries.push({
          accountId: account.account,
          propertyId: prop.property,
          displayName: prop.displayName,
        })
      }
    }

    if (summaries.length === 0) {
      return []
    }

    writeGaCache({ timestamp: Date.now(), properties: summaries })
    setLastFetchedAt(Date.now())

    setPropertyOptions(
      summaries.map((p) => ({
        value: normalizePropertyId(p.propertyId),
        label: `${p.displayName} (${normalizePropertyId(p.propertyId)})`,
        accountName: p.accountId,
      }))
    )

    return summaries
  }, [session?.accessToken])

  const refreshProperties = useCallback(async () => {
    try {
      setIsLoadingProperties(true)
      clearGaCache()
      await fetchGaProperties()
      toast.success("Properties revalidated successfully")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh Google Analytics properties."
      toast.error(message)
    } finally {
      setIsLoadingProperties(false)
    }
  }, [fetchGaProperties])

  const onLoadProperties = useCallback(async () => {
    const cache = readGaCache()
    if (hasValidGaCache(cache)) {
      setPropertyOptions(
        cache!.properties.map((p) => ({
          value: normalizePropertyId(p.propertyId),
          label: `${p.displayName} (${normalizePropertyId(p.propertyId)})`,
          accountName: p.accountId,
        }))
      )
      setLastFetchedAt(cache!.timestamp)
      return cache!.properties
    }

    return fetchGaProperties()
  }, [fetchGaProperties])

  const onSelectProperty = useCallback(
    async (propertyId: string) => {
      if (!selectedProject?.id || !session?.accessToken) return

      try {
        const normalizedPropertyId = normalizePropertyId(propertyId)
        await updateProject(Number(selectedProject.id), {
          ga_email: session.user?.email,
          analytics_id: normalizedPropertyId,
          ga_access_token: session.accessToken,
          ga_refresh_token: session.refreshToken,
        })
        await refreshProjects()
        setProject((prev: any) =>
          prev
            ? {
                ...prev,
                ga_email: session.user?.email,
                ga_email_data: session.user?.email,
                analytics_id: normalizedPropertyId,
                analytics_id_data: normalizedPropertyId,
              }
            : prev
        )
        setJustLinked(true)
        setOverviewData(null)
        setOverviewError(null)
        setOverviewLoading(false)
        onOverviewData?.(null)
        onOverviewError?.(null)
        onOverviewLoadingChange?.(false)
        toast.success("Google Analytics property connected to this project.")
        setTimeout(() => scrollToInsights(), 50)
      } catch (error) {
        console.error(error)
        toast.error("Failed to attach Google Analytics property to project.")
      }
    },
    [
      onOverviewData,
      onOverviewError,
      onOverviewLoadingChange,
      refreshProjects,
      selectedProject?.id,
      session?.accessToken,
      session?.refreshToken,
      session?.user?.email,
      updateProject,
    ]
  )

  const onDisconnect = useCallback(async () => {
    if (!selectedProject?.id) return
    try {
      await updateProject(Number(selectedProject.id), {
        remove_ga: true,
      })
      await refreshProjects()
      clearGaCache()
      setProject((prev: any) =>
        prev
          ? {
              ...prev,
              ga_email: null,
              ga_email_data: null,
              analytics_id: null,
              analytics_id_data: null,
            }
          : prev
      )
      setJustLinked(false)
      setSelectedProperty(undefined)
      setGaDateRange(null)
      setOverviewData(null)
      setOverviewError(null)
      setOverviewLoading(false)
      onOverviewData?.(null)
      onOverviewError?.(null)
      onOverviewLoadingChange?.(false)
      toast.success("Disconnected Google Analytics for this project.")
    } catch (error) {
      console.error(error)
      toast.error("Failed to disconnect Google Analytics.")
    }
  }, [onOverviewData, onOverviewError, onOverviewLoadingChange, refreshProjects, selectedProject?.id, updateProject])

  const fetchGaOverview = useCallback(async (projectId: number, start: string, end: string) => {
    const token = Cookies.get("login_access_token_wrank")
    if (!token) {
      throw new Error("Authentication token missing. Please sign in again.")
    }

    const response = await fetch(`${BASE_URL_WR}analytics-overview/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id: projectId,
        start_date: start,
        end_date: end,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Failed to fetch analytics overview (${response.status}).`)
    }

    return response.json()
  }, [])

  const scrollToInsights = () => {
    const el = document.getElementById("ga-insights-anchor")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  useEffect(() => {
  if (!isConnected) return
  if (gaDateRange) return

  const end = dayjs()
  const start = end.subtract(6, "day")

  applyRange([start, end], "last7")
}, [isConnected, gaDateRange])


  useEffect(() => {
    if (!hasPersistedGaConnection) {
      setGaDateRange(null)
      setJustLinked(false)
      setOverviewData(null)
      setOverviewError(null)
      setOverviewLoading(false)
      onOverviewData?.(null)
      onOverviewError?.(null)
      onOverviewLoadingChange?.(false)
    }
  }, [
    onOverviewData,
    onOverviewError,
    onOverviewLoadingChange,
    hasPersistedGaConnection,
  ])

  useEffect(() => {
    if (!isConnected || !gaDateRange || !selectedProject?.id || !shouldFetchOverview) {
      clearPollingTimer()
      setIsOverviewPolling(false)
      if (!shouldFetchOverview) {
        setOverviewLoading(false)
        onOverviewLoadingChange?.(false)
      }
      return
    }

    const [start, end] = gaDateRange
    const startStr = start.format("YYYY-MM-DD")
    const endStr = end.format("YYYY-MM-DD")
    const projectId = Number(selectedProject.id)

    let cancelled = false

    const load = async (isPollingRequest = false) => {
      if (cancelled) return
      let shouldContinuePolling = false
      try {
        if (!isPollingRequest) {
          setOverviewLoading(true)
          setOverviewError(null)
          onOverviewLoadingChange?.(true)
          onOverviewError?.(null)
        }

        const data = await fetchGaOverview(projectId, startStr, endStr)
        if (cancelled) return

        const status = data?.status
        const stillFetching = status === "fetching"

        if (stillFetching) {
          shouldContinuePolling = true
          setIsOverviewPolling(true)
          setOverviewData(null)
          onOverviewData?.(null)
          clearPollingTimer()
          pollingTimeoutRef.current = setTimeout(() => {
            if (cancelled) return
            load(true)
          }, 10000)
        } else {
          setIsOverviewPolling(false)
          setOverviewData(data)
          onOverviewData?.(data)
          clearPollingTimer()
          if (justLinked) {
            setJustLinked(false)
          }
        }
      } catch (err) {
        if (cancelled) return
        clearPollingTimer()
        setIsOverviewPolling(false)
        const message = err instanceof Error ? err.message : "Failed to load analytics overview."
        setOverviewError(message)
        setOverviewData(null)
        onOverviewData?.(null)
        onOverviewError?.(message)
        toast.error(message)
      } finally {
        if (!cancelled && !shouldContinuePolling) {
          setOverviewLoading(false)
          onOverviewLoadingChange?.(false)
        }
      }
    }

    clearPollingTimer()
    setIsOverviewPolling(false)
    load()

    return () => {
      cancelled = true
      clearPollingTimer()
    }
  }, [
    clearPollingTimer,
    fetchGaOverview,
    gaDateRange,
    isConnected,
    justLinked,
    shouldFetchOverview,
    onOverviewData,
    onOverviewError,
    onOverviewLoadingChange,
    selectedProject?.id,
  ])

  const renderInsightsPlaceholder = () => {
    if (isOverviewPolling) {
      return (
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="mb-3 text-sm font-medium text-brand-blue1">Preparing your Analytics overview...</div>
        </motion.div>
      )
    }

    if (overviewLoading) {
      return (
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="mb-3 flex items-center gap-2 text-brand-blue1">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Loading Analytics insights...</span>
          </div>
        </motion.div>
      )
    }

    if (overviewError) {
      return (
        <motion.div
          className="mt-4 bg-white border border-red-100 text-red-600 rounded-xl p-4 shadow-sm"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {overviewError}
        </motion.div>
      )
    }

    if (!gaDateRange || !overviewData) {
      return (
        <motion.div
          className="bg-white border rounded-xl px-6 py-2"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="h-10 w-10 rounded-full grid place-items-center"
              style={{ background: "rgba(0,140,205,0.1)", color: "#008CCD" }}
              initial={{ scale: 0.9, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <FcGoogle className="h-5 w-5" />
            </motion.div>
            <div className="text-sm text-gray-700">
              <p className="font-medium">Select a date range above to load Analytics insights.</p>
            </div>
          </div>
        </motion.div>
      )
    }

    return (
      <motion.div
        id="ga-insights-anchor"
        className="mt-4 text-sm text-gray-700"
        initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <p className="font-medium mb-2 text-brand-blue1">
          Analytics overview is ready
        </p>
      </motion.div>
    )
  }

const handleDateChange: any = (vals: null | [Dayjs, Dayjs]) => {
  applyRange(vals as any, "custom")
}


  const applyRange = (
  vals: [Dayjs, Dayjs] | null,
  preset: "last7" | "last30" | "last90" | "custom"
) => {
  if (!vals || !vals[0] || !vals[1]) {
    setGaDateRange(null)
    setDatePreset(preset)
    setOverviewData(null)
    setOverviewError(null)
    setOverviewLoading(false)
    onOverviewData?.(null)
    onOverviewError?.(null)
    onOverviewLoadingChange?.(false)
    return
  }

  const [s, e] = vals

  if (s.isBefore(MIN, "day") || e.isAfter(MAX, "day")) {
    message.warning("Please select a range within the last 3 months.")
    return
  }

  setGaDateRange(vals)
  setDatePreset(preset)

  onDateRangeChange?.({
    start: s.format("YYYY-MM-DD"),
    end: e.format("YYYY-MM-DD"),
    projectId: Number(selectedProject?.id) || undefined,
  })
}


  const showIntegrationPanel = !isConnected || !isPanelCollapsed

  return (
    <LayoutGroup>
      {isConnected && (
        <motion.div
          className="flex justify-end"
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <button
            type="button"
            onClick={() => setIsPanelCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isPanelCollapsed ? "" : "rotate-180"}`}
            />
            {isPanelCollapsed ? "Show Analytics integration panel" : "Hide Analytics integration panel"}
          </button>
        </motion.div>
      )}

      <AnimatePresence initial={false}>
        {showIntegrationPanel && (
          <motion.div
            key="ga-integration-panel"
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <GaIntegrationPanel
              project={project}
              session={session}
              hasSession={hasSession}
              onDisconnect={onDisconnect}
              onSelectProperty={onSelectProperty}
              onLoadProperties={onLoadProperties}
              propertyOptions={propertyOptions}
              selectedProperty={selectedProperty}
              setSelectedProperty={setSelectedProperty}
              isLoadingProperties={isLoadingProperties}
              setIsLoadingProperties={setIsLoadingProperties}
              refreshProperties={refreshProperties}
              lastFetchedAt={lastFetchedAt}
            />
          </motion.div>
        )}
      </AnimatePresence>

<AnimatePresence>
  {isConnected && (
    <motion.div
      key="ga-date-controls"
      className="flex items-center justify-between"
      initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {renderInsightsPlaceholder()}

      <div className="flex items-center gap-4">
        <div className="text-sm text-brand-blue1 font-medium">
          Select date range for Analytics
        </div>

        {/* Preset chips */}
        <div className="flex items-center gap-2">
          {[
            { id: "last7", label: "Last 7 days" },
            { id: "last30", label: "Last 30 days" },
            { id: "last90", label: "Last 3 months" },
            { id: "custom", label: "Custom" },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                if (chip.id === "custom") {
                  setDatePreset("custom")
                  return
                }

                const end = dayjs()
                const start =
                  chip.id === "last7"
                    ? end.subtract(6, "day")
                    : chip.id === "last30"
                    ? end.subtract(29, "day")
                    : end.subtract(89, "day") // last 3 months (~90 days)

                applyRange([start, end], chip.id as any)
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                datePreset === chip.id
                  ? "bg-brand-blue1 text-white border-brand-blue1 shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Show date picker only when "Custom" is active */}
        {datePreset === "custom" && (
          <RangePicker
            allowClear
            value={gaDateRange as any}
            placeholder={["Start date", "End date"]}
            disabledDate={(cur) => {
              if (!cur) return false
              return cur.isBefore(MIN, "day") || cur.isAfter(MAX, "day")
            }}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
            inputReadOnly
            color="#008ccd"
          />
        )}
      </div>
    </motion.div>
  )}
</AnimatePresence>

    </LayoutGroup>
  )
}

export default GaIntegrationSection
