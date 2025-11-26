"use client"

import dynamic from "next/dynamic"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import Cookies from "js-cookie"
import { CalendarDays, RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import SetupModal from "@/src/components/common/SetupModal"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import { BASE_URL_WR } from "@/src/util/api"

import type { ProjectSummaryData, TrendSeries } from "./components/ProjectSummary"
import type { TopMoverRow, TrendPoint } from "./components/KeywordVisibility"
import DemoProjectOverviewHeader, { type FiltersState, type SourceStatuses } from "./components/HeaderProjectOverview"

const ProjectSummarySection = dynamic(() => import("./components/ProjectSummary"), {
  loading: () => <Skeleton height="220px" />,
})
const TrafficVisibilitySection = dynamic(() => import("./components/Traffic&Visibility"), {
  loading: () => <Skeleton height="250px" />,
})
const KeywordVisibility = dynamic(() => import("./components/KeywordVisibility"), {
  loading: () => <Skeleton height="320px" />,
})
const TopOrganicPages = dynamic(() => import("./components/TopOrganicPages"), {
  loading: () => <Skeleton height="300px" />,
})
const TechnicalHealthPXSection = dynamic(() => import("./components/TechnicalHealthPageExperience"), {
  loading: () => <Skeleton height="300px" />,
})
const BacklinkAuthoritySection = dynamic(() => import("./components/Backlink&Authority"), {
  loading: () => <Skeleton height="300px" />,
})
const ContentPerformancePipelineSection = dynamic(() => import("./components/ContentPerformancePipeline"), {
  loading: () => <Skeleton height="300px" />,
})
const CompetitorSnapshotSection = dynamic(() => import("./components/CompetitorSnapshot"), {
  loading: () => <Skeleton height="300px" />,
})
const TasksActivitiesSection = dynamic(() => import("./components/CampaignTasks&Activities"), {
  loading: () => <Skeleton height="300px" />,
})

const Skeleton = ({ height = "200px" }: { height?: string }) => (
  <div className="relative w-full overflow-hidden rounded-xl bg-gray-200" style={{ height }}>
    <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        div[style] > div {
          transform: translateX(-100%);
        }
      `}</style>
  </div>
)

const RANGE_OPTIONS = [
  { key: "last_7", label: "Last 7 days", days: 7 },
  { key: "last_28", label: "Last 28 days", days: 28 },
  { key: "last_90", label: "Last 90 days", days: 90 },
  { key: "last_180", label: "Last 180 days", days: 180 },
  { key: "last_365", label: "Last 365 days", days: 365 },
] as const

type RangeKey = (typeof RANGE_OPTIONS)[number]["key"]

interface DateRange {
  key: RangeKey
  startDate: string
  endDate: string
  days: number
}

interface ApiTopMover {
  keyword: string
  movement_type?: string | null
  date?: string
  previous_date?: string
  current_position: number | null
  previous_position: number | null
  rank_delta: number | null
  traffic_delta_monthly: number | null
  current_page: string | null
  previous_page: string | null
  volume: number | null
  intent?: string | null
  intent_confidence?: number | null
  bucket_crossings?: string[] | null
  rank_bucket_current?: string | null
  rank_bucket_previous?: string | null
  rank_trend_7d?: Array<number | null> | null
}

interface ApiCannibalizationPoint {
  date: string
  cannibalized_count: number
}

interface ProjectOverviewPayload {
  engagement?: {
    total_gsc_clicks?: number
    total_conversions?: number
    total_ga4_sessions?: number
  }
  ocr?: number
  avg_position_ctr?: {
    avg_position?: number
    ctr?: number
  }
  top_movers?: ApiTopMover[]
  cannibalization_timeline?: ApiCannibalizationPoint[]
  indexability_coverage?: {
    indexable?: number
    non_indexable?: number
    canonical?: number
  }
  keyword_distribuition?: {
    top_3?: number
    top_10?: number
    top_100?: number
  }
}

interface ProjectOverviewResponse {
  status: boolean
  message?: string
  data?: ProjectOverviewPayload
  is_ga_connected?: boolean
  is_gsc_connected?: boolean
}

const formatISODate = (date: Date) => date.toISOString().slice(0, 10)

const ensureDate = (value?: string | null) => {
  if (!value) return null
  const [year, month, day] = value.split("-").map((part) => Number(part))
  if (!year || !month || !day) return null
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const buildRange = (key: RangeKey): DateRange => {
  const option = RANGE_OPTIONS.find((opt) => opt.key === key) ?? RANGE_OPTIONS[0]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - (option.days - 1))
  return {
    key: option.key,
    startDate: formatISODate(start),
    endDate: formatISODate(today),
    days: option.days,
  }
}

const formatDisplayRange = (start: string, end: string) => {
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })
  const startDate = ensureDate(start) ?? new Date(start)
  const endDate = ensureDate(end) ?? new Date(end)
  return `${formatter.format(startDate)} → ${formatter.format(endDate)}`
}

const createSeriesFromTotal = (total: number | undefined, range?: DateRange): TrendSeries => {
  if (!range) return []
  const safeTotal = total ?? 0
  const days = Math.max(range.days, 1)
  const start = ensureDate(range.startDate) ?? new Date(range.startDate)
  return Array.from({ length: days }).map((_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return { t: formatISODate(day), v: Math.max(0, Math.round(safeTotal / days)) }
  })
}

const buildCannibalizationSeries = (timeline?: ApiCannibalizationPoint[]): TrendSeries | undefined => {
  if (!timeline?.length) return undefined
  return timeline.map((point) => ({
    t: point.date,
    v: point.cannibalized_count ?? 0,
  }))
}

const buildSummaryData = (payload?: ProjectOverviewPayload, range?: DateRange): ProjectSummaryData => {
  const keywordDistribution = payload?.keyword_distribuition
  const indexability = payload?.indexability_coverage
  const timeline = payload?.cannibalization_timeline
  const lastTimelinePoint = timeline?.[timeline.length - 1]
  const prevTimelinePoint = timeline?.[timeline.length - 2]

  const totalCoverage =
    (indexability?.indexable ?? 0) + (indexability?.non_indexable ?? 0) + (indexability?.canonical ?? 0)

  return {
    seoScore: { value: 0, delta: 0 },
    siteHealth: { value: 0, delta: 0 },
    wrScore: { value: 0, delta: 0 },
    pageExperience: { pass: true, deltaText: "Latest available audit", audits: [], deviceLabel: "All" },
    clicks: payload?.engagement
      ? {
          value: payload.engagement.total_gsc_clicks ?? 0,
          delta: 0,
          series: createSeriesFromTotal(payload.engagement.total_gsc_clicks, range),
        }
      : undefined,
    sessions: payload?.engagement
      ? {
          value: payload.engagement.total_ga4_sessions ?? 0,
          delta: 0,
          series: createSeriesFromTotal(payload.engagement.total_ga4_sessions, range),
        }
      : undefined,
    conversions: payload?.engagement
      ? {
          value: payload.engagement.total_conversions ?? 0,
          delta: 0,
          series: createSeriesFromTotal(payload.engagement.total_conversions, range),
        }
      : undefined,
    positionCtr: payload?.avg_position_ctr
      ? {
          position: { value: payload.avg_position_ctr.avg_position ?? 0, delta: 0 },
          ctr: { valuePct: ((payload.avg_position_ctr.ctr ?? 0) / 100), delta: 0 },
        }
      : undefined,
    internalLinking: { dils: { value: 0, delta: 0 }, orphanPct: 0, danglingPct: 0 },
    indexability: indexability
      ? {
          connected: true,
          indexablePct: totalCoverage > 0 ? (indexability.indexable ?? 0) / totalCoverage : 0,
          nonIndexablePct: totalCoverage > 0 ? (indexability.non_indexable ?? 0) / totalCoverage : 0,
          canonicalizedPct: totalCoverage > 0 ? (indexability.canonical ?? 0) / totalCoverage : 0,
          deltaPP: 0,
        }
      : { connected: false },
    keywordDistribution: {
      total: keywordDistribution?.top_100 ?? 0,
      delta: 0,
      top3: keywordDistribution?.top_3 ?? 0,
      top10: keywordDistribution?.top_10 ?? 0,
      top100: keywordDistribution?.top_100 ?? 0,
      newCount: 0,
      lostCount: 0,
    },
    serpFeatures: undefined,
    cannibalization: timeline?.length
      ? {
          cases: lastTimelinePoint?.cannibalized_count ?? 0,
          delta: (lastTimelinePoint?.cannibalized_count ?? 0) - (prevTimelinePoint?.cannibalized_count ?? 0),
          series: buildCannibalizationSeries(timeline),
        }
      : undefined,
    newLostRD: undefined,
    crawlErrors: undefined,
    trafficValue: payload ? { value: payload.ocr ?? 0, delta: 0 } : undefined,
  }
}

const deriveMoverType = (posNow: number | null, posPrev: number | null): TopMoverRow["mover_type"] => {
  const nowMissing = posNow == null || posNow > 100
  const prevMissing = posPrev == null || posPrev > 100
  if (!prevMissing && nowMissing) return "lost"
  if (prevMissing && !nowMissing) return "new"
  const delta = (posPrev ?? 0) - (posNow ?? 0)
  if (delta > 0) return "winner"
  if (delta < 0) return "loser"
  return "winner"
}

const mapIntent = (intent?: string | null): TopMoverRow["intent"] => {
  const lower = intent?.toLowerCase()
  if (lower === "informational") return "info"
  if (lower === "transactional") return "transactional"
  if (lower === "navigational") return "navigational"
  if (lower === "commercial") return "commercial"
  return undefined
}

const buildMoverTrend = (item: ApiTopMover): TrendPoint[] => {
  const points = item.rank_trend_7d ?? []
  const endDate = ensureDate(item.date) ?? new Date()
  return points.map((value, index) => {
    const day = new Date(endDate)
    day.setDate(endDate.getDate() - (points.length - 1 - index))
    return {
      t: formatISODate(day),
      position: value ?? null,
    }
  })
}

const mapTopMovers = (items?: ApiTopMover[]): TopMoverRow[] => {
  if (!items?.length) return []
  return items.map((item, index) => {
    const posNow = Number.isFinite(item.current_position) ? item.current_position : null
    const posPrev = Number.isFinite(item.previous_position) ? item.previous_position : null
    const delta = posNow != null && posPrev != null ? posPrev - posNow : 0
    const impressions = item.volume ?? 0
    const clicksDelta = item.traffic_delta_monthly ?? 0
    return {
      id: `api-mover-${index}-${item.keyword}`,
      keyword: item.keyword,
      pos_now: posNow,
      pos_prev: posPrev,
      delta_pos: Number.isFinite(delta) ? Number(delta) : 0,
      clicks_now: Math.max(0, Math.round(clicksDelta)),
      clicks_prev: Math.max(0, Math.round(clicksDelta - clicksDelta * 0.3)),
      impressions_now: Math.max(0, Math.round(impressions)),
      impressions_prev: Math.max(0, Math.round(impressions * 0.8)),
      url_now: item.current_page ?? "—",
      url_prev: item.previous_page ?? undefined,
      url_changed: Boolean(item.current_page && item.previous_page && item.current_page !== item.previous_page),
      mover_type: deriveMoverType(posNow, posPrev),
      features: [],
      intent: mapIntent(item.intent),
      trend: buildMoverTrend(item),
      serp_sample: [],
    }
  })
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
    {message}
  </div>
)

const ErrorBanner = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
      >
        Retry
      </button>
    )}
  </div>
)

const ProjectOverview = () => {
  const { selectedProject } = useProjectManager()

  const [modalOpen, setModalOpen] = useState(false)
  const [rangeKey, setRangeKey] = useState<RangeKey>("last_7")
  const range = useMemo(() => buildRange(rangeKey), [rangeKey])

  const [overview, setOverview] = useState<ProjectOverviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    if (!selectedProject?.id) return
    setLoading(true)
    setError(null)
    try {
      const token = Cookies.get("login_access_token_wrank")
      const response = await axios.post<ProjectOverviewResponse>(
        `${BASE_URL_WR}project-overview-dashboard/`,
        {
          project_id: Number(selectedProject.id),
          start_date: range.startDate,
          end_date: range.endDate,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      )
      setOverview(response.data)
    } catch (err:any) {
      console.error(err)
      setOverview(null)
      const message =err.response.data.error || "Unable to load the project overview right now."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [range.endDate, range.startDate, selectedProject?.id])

  useEffect(() => {
    void fetchOverview()
  }, [fetchOverview])

  const headerSources = useMemo<SourceStatuses>(
    () => ({
      ga4: { connected: overview?.is_ga_connected ?? false },
      gsc: { connected: overview?.is_gsc_connected ?? false },
      crawler: { connected: Boolean(overview) },
      backlinks: { connected: Boolean(overview) },
    }),
    [overview?.is_ga_connected, overview?.is_gsc_connected, overview],
  )

  const handleHeaderFiltersChange = useCallback(
    (filters: FiltersState) => {
      const nextRange = filters?.dateRange
      if (!nextRange || nextRange === "custom") return
      if (nextRange !== rangeKey) {
        setRangeKey(nextRange as RangeKey)
      }
    },
    [rangeKey],
  )

  const summaryData = useMemo(
    () => (overview?.data ? buildSummaryData(overview.data, range) : null),
    [overview, range],
  )
  const topMoversRows = useMemo(() => mapTopMovers(overview?.data?.top_movers), [overview])

  return (
    <div className="space-y-6 px-4 py-6">
      <SetupModal modalOpen={modalOpen} setModalOpen={setModalOpen} />
      <DemoProjectOverviewHeader
        sources={headerSources}
        defaultFilters={{ dateRange: rangeKey }}
        onFiltersChange={handleHeaderFiltersChange}
        onCreateProject={() => setModalOpen(true)}
      />

      {!selectedProject ? (
        <EmptyState message="Select a project to load the project overview dashboard." />
      ) : (
        <>
          {error && <ErrorBanner message={error} onRetry={fetchOverview} />}

          {loading && !overview ? (
            <Skeleton height="420px" />
          ) : summaryData ? (
            <ProjectSummarySection
              data={summaryData}
              sourceFilter="all"
              connected={{
                ga4: overview?.is_ga_connected ?? false,
                gsc: overview?.is_gsc_connected ?? false, 
              }}
              loading={loading}
              className="rounded-2xl bg-white px-4 py-6 shadow-sm"
            />
          ) : null}

          {(!topMoversRows.length && loading) && <Skeleton height="320px" />}
          {topMoversRows.length > 0 && <KeywordVisibility rows={topMoversRows} />}

          <TrafficVisibilitySection />
          <TopOrganicPages />
          <TechnicalHealthPXSection />
          <BacklinkAuthoritySection />
          <ContentPerformancePipelineSection />
          <CompetitorSnapshotSection />
          <TasksActivitiesSection />
        </>
      )}
    </div>
  )
}

export default ProjectOverview
