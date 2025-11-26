"use client"

import { ProjectSelector } from "@/src/components/common/project-selector"
import GscIntegrationPanel from "@/src/components/link-analyzer/gsc/GscIntegrationPanel"

import KeywordAddModal from "@/src/components/keywordsInsights/keywordAddModal"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import { useProjectContext } from "@/src/redux/providers/ProjectContext"
import type { AppDispatch, RootState } from "@/src/redux/store"
import { BASE_URL_WR } from "@/src/util/api"
import { DatePicker, message } from "antd"
import axios from "axios"
import type { Dayjs } from "dayjs"
import dayjs from "dayjs"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import Cookies from "js-cookie"
import {
  BarChart3,
  ChevronRight,
  ClipboardPlus,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react"
import type { Session } from "next-auth"
import { signIn, signOut, useSession } from "next-auth/react"
import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "sonner"
import KeywordSettings from "./Setting"
import DemoCanvas from "./insights/2LargerCards"
import KeywordsInsightsSummary from "./insights/6CoreCards_New"
import CannibalKPISectionDemo from "./insights/CannibalizedKeywords"
import DemoCannibalTrend from "./insights/CannibalizedKeywordsLarge"
import ClusterView from "./insights/ClusterView"
import KeywordsPerformanceTrendRightHalf from "./insights/KeywordPerformanceTrend_New"
import KeywordMovementFeed from "./insights/KeywordsMovementFeed"
import RankingDistributionDemo from "./insights/RankingDistribution"
import { PerformanceKeywordsTable } from "./insights/TopPerformingKeywords"
import GapInputCardApp from "./keywordGapAnalysis/KeywordGapAnalysis"
import GapResultsTableSectionApp from "./keywordGapAnalysis/KeywordsGapResultsTable"
import GapSummarySectionApp from "./keywordGapAnalysis/Summarycardscharts"
import OpportunitiesSummaryApp from "./opportunities/OpportunitiesSummaryKPIs"
import OpportunitiesTable from "./opportunities/OpportunitiesTable"
import KeywordRankSummary from "./rankCheckerTab/BatchKPIRow_New"
import { RankCheckerInputPanel } from "./rankCheckerTab/KeywordInput&TargetingPanel"
import RankCheckerResultsTableApp from "./rankCheckerTab/ResultsTable"
import TrackedKeywordsPerformanceSummary from "./trackedkeywords/Summarytrackedkeywords_New"
import TabletrackedkeywordsApp from "./trackedkeywords/TableTrackedKeywords"

const { RangePicker } = DatePicker

interface KeywordDetail {
  id: number
  project_keyword_id: number
  datetime: string
  user_id: number
  task_id: string
  domain: string | null
  rank: number
  serp_page: string
  google_page: string
  status: string
  date: string
  time: string
}
interface KeywordData {
  id: number
  created_at: string
  updated_at: string
  keyword: string
  project_id: number
  location_code: string
  location: string
  created_date: string
  created_time: string
  keyword_details: KeywordDetail[]
  device: string
  engine_id: number | null
  volume: number
  intent: string
  priority: string
}
interface ApiResponse {
  project_id: number
  language: string
  location: string
  keyword_data: KeywordData[]
}

type InsightType = "overview" | "cannibalization" | "clusterview"

type InsightMap = Record<InsightType, any>

type CustomSession = Session & {
  accessToken?: string
  refreshToken?: string
}

const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  pastelBrand: "#D9EEF8",
  valueBlue: "#4286F5",
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  text: "#111827",
  textMuted: "#6B7280",
  textDarkerMuted: "#374151",
}
const RADIUS = 8
const BORDER = 2

function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!isOpen) return
      const el = ref.current
      if (el && !el.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [isOpen, onClose])
  return ref
}

function IconOnlyButton({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <motion.button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        height: 36,
        width: 36,
        display: "grid",
        placeItems: "center",
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${TOKENS.borderLight}`,
        background: TOKENS.chipBg,
        color: TOKENS.text,
      }}
    >
      {children}
    </motion.button>
  )
}

function PrimaryButton({
  title,
  children,
  onClick,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <motion.button
      type="button"
      title={title}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center gap-2 h-9 px-3 text-white"
      style={{ background: TOKENS.brand, borderRadius: RADIUS }}
      initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
      <span className="text-sm font-medium">{title}</span>
    </motion.button>
  )
}

export function Breadcrumb() {
  const { activeSection, activeSubmenu } = useSelector((state: RootState) => state.sidebar)
  return (
    <motion.div
      className="text-sm sm:text-base text-gray-500 flex gap-1 items-center "
      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <span>{activeSection}</span>
      <ChevronRight className="text-gray-400 text-sm" />
      <span className="text-gray-900 font-medium">{activeSubmenu}</span>
    </motion.div>
  )
}

export function KeywordsHeader({
  active,
  onTabChange,
  onAddKeywords,
}: { active?: string; onTabChange?: (k: string) => void; onAddKeywords?: () => void }) {
  const lastUpdatedLabel = useMemo(() => {
    const d = new Date()
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

  const DISABLED_TABS = new Set<string>(["gap", "opps"])

  const TABS = [
    { key: "insights", label: "Insights & Overview", icon: BarChart3 },
    { key: "tracked", label: "Tracked Keywords", icon: ListChecks },
    { key: "checker", label: "Rank Checker", icon: TrendingUp },
    { key: "gap", label: "Keyword Gap Analyzer", icon: Search },
    { key: "opps", label: "Opportunities", icon: Sparkles },
  ]
  const activeKey = active ?? (DISABLED_TABS.has("insights") ? "tracked" : "insights")

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useOutsideClose<HTMLDivElement>(exportOpen, () => setExportOpen(false))
  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
  function Drawer({
    title,
    children,
    onClose,
  }: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) {
    return (
      <div className="fixed inset-0 z-40">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />
        <aside className="absolute right-0 top-0 h-full w-[72vw] overflow-auto bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-base font-semibold"></div>
            <button
              onClick={onClose}
              className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
            >
              ✕
            </button>
          </div>
          {children}
        </aside>
      </div>
    );
  }
  return (
    <LayoutGroup>
      {drawerRow && (
        <Drawer title="Drawer" onClose={closeDrawer}>
          <KeywordSettings />
        </Drawer>
      )}
      <div className="w-full" style={{ color: TOKENS.text }}>
        {/* Row 1 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <Breadcrumb />
          <motion.div
            className="flex items-center gap-2 text-sm"
            style={{ color: TOKENS.textDarkerMuted }}
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
          >
            <Clock className="size-4" />
            <span>Last updated: {lastUpdatedLabel}</span>
          </motion.div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 z-100">
            <ProjectSelector className="" />
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <PrimaryButton title="Add Keywords" onClick={onAddKeywords}>
              <Plus className="size-4" />
            </PrimaryButton>

            <div className="relative" ref={exportRef}>
              <IconOnlyButton title="Export" onClick={() => setExportOpen((s) => !s)}>
                <Upload className="size-4" />
              </IconOnlyButton>
              <AnimatePresence>
                {exportOpen && (
                  <motion.div
                    className="absolute right-0 z-50 mt-2 min-w-[260px] bg-white shadow"
                    style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.borderLight}` }}
                    initial={{ opacity: 0, y: -8, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="px-3 py-2 text-[12px] font-semibold" style={{ color: TOKENS.textMuted }}>
                      Data Exports
                    </div>
                    {[
                      { icon: FileText, label: "Tracked Keywords (CSV)" },
                      { icon: FileSpreadsheet, label: "Tracked Keywords (XLS)", lock: true },
                      { icon: Download, label: "Visibility Chart (PNG)", lock: true },
                    ].map((item, i) => (
                      <motion.button
                        key={item.label}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                      >
                        <item.icon className="size-4" />
                        {item.label} {item.lock ? <Lock className="size-4 ml-auto text-[#9CA3AF]" /> : null}
                      </motion.button>
                    ))}
                    <div className="my-1" style={{ borderTop: `${BORDER}px solid ${TOKENS.borderLight}` }} />
                    <div className="px-3 py-2 text-[12px] font-semibold" style={{ color: TOKENS.textMuted }}>
                      Insights Exports
                    </div>
                    {[
                      { icon: FileText, label: "Keyword Gaps (CSV)" },
                      { icon: FileText, label: "Overview (PDF)", lock: true },
                    ].map((item, i) => (
                      <motion.button
                        key={item.label}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 inline-flex items-center gap-2"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.2, delay: 0.1 + i * 0.03 }}
                      >
                        <item.icon className="size-4" />
                        {item.label} {item.lock ? <Lock className="size-4 ml-auto text-[#9CA3AF]" /> : null}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <IconOnlyButton title="Re-crawl">
              <RefreshCw className="size-4" />
            </IconOnlyButton>
            <IconOnlyButton title="Create Task">
              <ClipboardPlus className="size-4" />
            </IconOnlyButton>
            <IconOnlyButton title="Share">
              <Share2 className="size-4" />
            </IconOnlyButton>
            <IconOnlyButton title="Add to Reports">
              <BarChart3 className="size-4" />
            </IconOnlyButton>
            <IconOnlyButton title="Settings">
              <Settings className="size-4 cursor-pointer" onClick={openDrawer} />
            </IconOnlyButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4" style={{ borderBottom: `${BORDER}px solid ${TOKENS.borderLight}` }}>
          <div className="flex items-center gap-2 pb-1">
            {[
              { key: "insights", label: "Insights & Overview", icon: BarChart3 },
              { key: "tracked", label: "Tracked Keywords", icon: ListChecks },
              { key: "checker", label: "Rank Checker", icon: TrendingUp },
              { key: "gap", label: "Keyword Gap Analyzer", icon: Search },
              { key: "opps", label: "Opportunities", icon: Sparkles },
            ].map(({ key, label, icon: Icon }, i) => {
              const isActive = key === (active ?? "insights")
              const isDisabled = new Set([
                "gap", "opps"
              ]).has(key)
              return (
                <motion.button
                  key={key}
                  className="relative flex items-center gap-2 py-2 px-3 rounded-md"
                  aria-disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return
                    onTabChange?.(key)
                  }}
                  style={{
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    color: isActive ? TOKENS.brand : TOKENS.text,
                    backgroundColor: isActive ? TOKENS.pastelBrand : "transparent",
                    opacity: isDisabled ? 0.5 : 1,
                    filter: isDisabled ? "grayscale(1)" : "none",
                  }}
                  initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.04 }}
                >
                  <Icon size={16} className={isActive ? "" : "text-[#6B7280]"} />
                  <span className={isActive ? "font-semibold" : "font-medium"}>{label}</span>
                  <AnimatePresence>
                    {isActive && !isDisabled && (
                      <motion.span
                        layoutId="tab-underline"
                        className="absolute left-0 right-0 -bottom-[6px] h-[2px]"
                        style={{ backgroundColor: TOKENS.brand }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </LayoutGroup>
  )
}

const ShimmerBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative overflow-hidden bg-gray-100 ${className ?? ""}`} style={{ borderRadius: 12 }}>
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(229,231,235,0.9) 50%, rgba(255,255,255,0) 100%)",
        transform: "translateX(-100%)",
        animation: "shimmer 1.4s infinite",
      }}
    />
    <style jsx>{`
      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        60% {
          transform: translateX(100%);
        }
        100% {
          transform: translateX(100%);
        }
      }
    `}</style>
  </div>
)

const OverviewSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="grid md:grid-cols-2 gap-4">
      <ShimmerBlock className="h-28" />
      <ShimmerBlock className="h-28" />
    </div>
    <ShimmerBlock className="h-64" />
  </div>
)

const SelectDatesCallout: React.FC = () => (
  <motion.div
    className="bg-white border rounded-xl p-6 mt-4 shadow"
    initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.35, ease: "easeOut" }}
  >
    <div className="flex items-start gap-3">
      <div className="shrink-0">
        <motion.div
          className="h-10 w-10 rounded-full grid place-items-center"
          style={{ background: TOKENS.pastelBrand, color: TOKENS.brand }}
          initial={{ scale: 0.9, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        >
          <BarChart3 className="h-5 w-5" />
        </motion.div>
      </div>
      <div className="text-sm text-gray-700">
        <p className="font-medium">Select a date range to load Insights.</p>
        <p className="text-gray-600 mt-1">
          We will fetch <strong>Overview</strong> first, then deeper insights. No data is requested until you choose
          dates.
        </p>
      </div>
    </div>
  </motion.div>
)

type InsightsGateProps = {
  project: any
  hasSession: boolean
  session: CustomSession | null
  gscSites: Array<{ siteUrl: string; permissionLevel: string }>
  gscSiteOptions: Array<{ value: string; label: string }>
  selectedSite?: string
  setSelectedSite: React.Dispatch<React.SetStateAction<string | undefined>>
  onLoadSites: () => Promise<void>
  onSelectSite: (site: string) => Promise<void>
  onDisconnect: () => Promise<void>
}


/* ────────────────────────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────────────────────────── */
export default function DemoKeywordsHeader() {
  const { selectedProject, refreshProjects } = useProjectManager()
  const token = Cookies.get("login_access_token_wrank")
  const { updateProject } = useProjectContext()

  const [active, setActive] = useState<string>("insights")
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Rank checker
  const [rankings, setRankings] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(false)

  const [state, setState] = useState<any>({
    keywords: [],
    device: "desktop",
    locationISO: "",
    competitors: [],
    plan: "free",
    limits: { manual: 5, csv: 50 },
    isSubmitting: false,
    cachedAt: null,
    tw: "30d",
  })
  const dispatch = useDispatch<AppDispatch>()

  const MAX = dayjs().endOf("day")
  const MIN = dayjs().subtract(3, "month").startOf("day")

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeTaskIdsRef = useRef<Set<string>>(new Set())
  const clearPollTimer = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }
  useEffect(() => {
    return () => clearPollTimer()
  }, [])

  // Date range (no preselect)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const fmt = (d: Dayjs) => d.format("YYYY-MM-DD")

  const flash = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 1600)
  }


  const handleSubmit = async (payload: {
    device: "desktop" | "mobile"
    location_id: number
    domain: string
    keywords: string[]
    competitors?: string[]
  }): Promise<void> => {
    if (!token) return
    clearPollTimer()
    setState((s: any) => ({ ...s, isSubmitting: true }))
    setIsLoading(true)
    try {
      const response = await axios.post(
        "https://dashboard.wranker.com/api/check-keywords/",
        {
          device: payload.device,
          location_id: payload.location_id,
          domain: payload.domain,
          keywords: payload.keywords,
          competitors: payload.competitors ?? [],
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      )
      const createdTasks = response?.data?.results ?? []
      const taskIds = createdTasks
        .map((item: any) => (item?.task_id ? String(item.task_id) : null))
        .filter((id): id is string => Boolean(id))
      activeTaskIdsRef.current = taskIds.length > 0 ? new Set(taskIds) : new Set()
      if (createdTasks.length > 0) {
        const pendingRows = transformRankings(createdTasks)
        setRankings((prev) => mergeRankingRows(prev, pendingRows))
      }

      // Start polling ONLY for the submitted criteria
      await getRankingsForCriteria({
        domain: payload.domain,
        keywords: payload.keywords,
        device: payload.device,
      })
    } catch (err) {
      console.error("Error handling submit:", err)
      alert("Failed to submit request")
      setIsLoading(false)
      setState((s: any) => ({ ...s, isSubmitting: false }))
      clearPollTimer()
    }
  }

  async function fetchRankResults(): Promise<any[]> {
    const headers = { Authorization: `Bearer ${token}` }
    const collected: any[] = []
    const pageSize = 100
    let page = 1

    while (true) {
      const res = await axios.get(`${BASE_URL_WR}rank/results/`, {
        headers,
        params: {
          page,
          page_size: pageSize,
        },
      })

      const data = res?.data
      const results = data?.results || []
      collected.push(...results)

      const totalPages = data?.num_pages ?? null
      const nextExists =
        (typeof data?.next === "string" && data.next.length > 0) ||
        (typeof totalPages === "number" && page < totalPages)

      if (!nextExists || results.length === 0) {
        break
      }

      page += 1
    }

    return collected
  }

  function transformRankings(data: any[]) {
    return data.map((item: any, index: number) => {
      const apiId = item?.id != null ? String(item.id) : null
      const taskId = item?.task_id ? String(item.task_id) : null
      const fallbackId = `${index}-${normalizeString(item?.keyword) || "row"}`
      const id = apiId ?? taskId ?? fallbackId
      return {
        id,
        taskId,
        domain: item.domain ?? "-",
        keyword: item.keyword ?? "-",
        volume: "-",
        device: item.device ?? "desktop",
        locationISO: item.location ?? "-",
        rank: item.rank ?? null,
        url: item.serp_page ?? "",
        googlePage: item.google_page ?? null,
        inTracker: false,
        competitors: (item.competitors || []).map((c: any) => ({
          domain: c.domain,
          rank: c.rank ?? null,
          ranked_url: c.ranked_url ?? null,
        })),
        status: item.status,
      }
    })
  }

  function normalizeString(value: unknown): string {
    return String(value ?? "").trim().toLowerCase()
  }

  function rowKeyForRanking(row: any): string {
    if (row?.id) return `id:${row.id}`
    if (row?.taskId) return `task:${row.taskId}`
    return [
      normalizeString(row?.keyword),
      String(row?.device ?? ""),
      normalizeString(row?.locationISO),
      normalizeString(row?.domain ?? ""),
    ].join("|")
  }

  function mergeRankingRows(prev: any[], updates: any[]) {
    const map = new Map<string, any>()
    for (const item of prev) map.set(rowKeyForRanking(item), item)
    for (const item of updates) map.set(rowKeyForRanking(item), item)
    return Array.from(map.values())
  }

  function isPendingStatus(status: unknown) {
    const normalized = normalizeString(status)
    return (
      !normalized ||
      normalized === "pending" ||
      normalized === "in progress" ||
      normalized === "processing" ||
      normalized === "queued"
    )
  }

  async function getRankingsForCriteria(criteria: {
    domain: string
    keywords: string[]
    device: "desktop" | "mobile"
  }) {
    try {
      clearPollTimer()

      const all = await fetchRankResults()
      const norm = normalizeString
      const targetTaskIds = activeTaskIdsRef.current
      const hasTaskFilter = targetTaskIds.size > 0

      const kwSet = new Set(criteria.keywords.map((k) => norm(k)))
      const filtered = all.filter((r: any) => {
        const deviceOk = norm(r.device) === norm(criteria.device)
        const keywordOk = kwSet.has(norm(r.keyword))
        const domainOk = norm(r.domain) === norm(criteria.domain)
        const taskId = r?.task_id ? String(r.task_id) : ""
        const taskOk = !hasTaskFilter || (taskId && targetTaskIds.has(taskId))
        return deviceOk && keywordOk && domainOk && taskOk
      })

      const transformed = transformRankings(filtered)

      setRankings((prev) => mergeRankingRows(prev, transformed))

      const seenByTask = new Map<string, any>()
      const seenByKw = new Map<string, any>()
      for (const r of transformed) {
        if (r.taskId) seenByTask.set(String(r.taskId), r)
        seenByKw.set(norm(r.keyword), r)
      }

      const haveAnyPending = hasTaskFilter
        ? Array.from(targetTaskIds).some((taskId) => {
          const row = seenByTask.get(taskId)
          return !row || isPendingStatus(row?.status)
        })
        : criteria.keywords.some((k) => {
          const row = seenByKw.get(norm(k))
          return !row || isPendingStatus(row?.status)
        })

      if (!haveAnyPending) {
        setIsLoading(false)
        setState((s: any) => ({ ...s, isSubmitting: false }))
        activeTaskIdsRef.current = new Set()
        clearPollTimer()
        return
      }

      pollTimerRef.current = setTimeout(() => getRankingsForCriteria(criteria), 25000)
    } catch (err) {
      console.error("Error fetching rank results:", err)
      setIsLoading(false)
      setState((s: any) => ({ ...s, isSubmitting: false }))
      clearPollTimer()
    }
  }



  useEffect(() => {
    if (active !== "checker") return
    let cancelled = false
    setIsLoading(true)
      ; (async () => {
        try {
          const all = await fetchRankResults()
          if (cancelled) return
          const transformed = transformRankings(all)
          setRankings(transformed)
          setIsLoading(false)
          setState((s: any) => ({ ...s, isSubmitting: false }))
        } catch (err) {
          if (cancelled) return
          console.error("Initial rank results load failed:", err)
          setIsLoading(false)
        }
      })()

    return () => {
      cancelled = true
    }
  }, [active, selectedProject?.id])


  const [keywordData, setKeywordData] = useState<KeywordData[]>([])
  const [loading, setLoading] = useState(false)

  const [insights, setInsights] = useState<InsightMap>({
    overview: null,
    cannibalization: null,
    clusterview: null,
  })
  const [movementFeed, setMovementFeed] = useState<any>()
  const [keywordPerf, setKeywordPerf] = useState<any>()


  // Loading state for the overview-first flow
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [restLoading, setRestLoading] = useState(false)

  // --- API helpers (unchanged endpoints)
  async function fetchInsight(projectId: number, insight: any, start = "", end = "") {
    const body = JSON.stringify({
      project_id: projectId,
      insight_type: insight,
      start_date: start,
      end_date: end,
    })
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${BASE_URL_WR}keywords-insights/`, { method: "POST", headers, body })
    const text = await res.text()
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }

    if (res.status === 401) {
      try {
        await refreshProjects()
      } catch (refreshErr) {
        console.error("Failed to refresh projects after 401:", refreshErr)
      }
      const message = data?.message || "GSC connection expired. Please reconnect."
      throw new Error(message)
    }

    if (!res.ok) {
      const message = data?.message || `insight ${insight} HTTP ${res.status}`
      throw new Error(message)
    }

    return data
  }
  async function fetchKeywordMovementFeed(projectId: number, start = "", end = "") {
    const body = JSON.stringify({ project_id: projectId, start_date: start, end_date: end })
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${BASE_URL_WR}movement-feed/`, { method: "POST", headers, body })
    if (!res.ok) throw new Error(`movement feed HTTP ${res.status}`)
    return res.json()
  }
  async function fetchKeywordPerformance(projectId: number, start = "", end = "") {
    const body = JSON.stringify({ project_id: projectId, start_date: start, end_date: end, page: 1 })
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${BASE_URL_WR}performance/`, { method: "POST", headers, body })
    if (!res.ok) throw new Error(`fetchKeywordPerformance HTTP ${res.status}`)
    return res.json()
  }

  // --- DEDUP across parameter sets
  const fetchIdRef = useRef(0)
  const lastFetchKeyRef = useRef<string>("")
  const inflightRef = useRef<Record<string, boolean>>({})
  const doneRef = useRef<Record<string, boolean>>({})
  const makeKey = (insight: string, projectId: number, start: string, end: string) =>
    `${insight}|${projectId}|${start}|${end}`

  async function requestCannibalization(projectId: number, start: string, end: string) {
    const key = makeKey("cannibalization", projectId, start, end)
    if (inflightRef.current[key] || doneRef.current[key]) return insights.cannibalization
    inflightRef.current[key] = true
    try {
      const dto = await fetchInsight(projectId, "cannibalization", start, end)
      if (lastFetchKeyRef.current.endsWith(`${projectId}|${start}|${end}`)) {
        setInsights((prev) => ({ ...prev, cannibalization: dto }))
      }
      doneRef.current[key] = true
      return dto
    } finally {
      inflightRef.current[key] = false
    }
  }
  async function requestClusterView(projectId: number, start: string, end: string) {
    const key = makeKey("cluster_view", projectId, start, end)
    if (inflightRef.current[key] || doneRef.current[key]) return insights.clusterview
    inflightRef.current[key] = true
    try {
      const dto = await fetchInsight(projectId, "cluster_view", start, end)
      if (lastFetchKeyRef.current.endsWith(`${projectId}|${start}|${end}`)) {
        setInsights((prev) => ({ ...prev, clusterview: dto }))
      }
      doneRef.current[key] = true
      return dto
    } finally {
      inflightRef.current[key] = false
    }
  }
  async function requestMovement(projectId: number, start: string, end: string) {
    const key = makeKey("movement", projectId, start, end)
    if (inflightRef.current[key] || doneRef.current[key]) return movementFeed
    inflightRef.current[key] = true
    try {
      const dto = await fetchKeywordMovementFeed(projectId, start, end)
      if (lastFetchKeyRef.current.endsWith(`${projectId}|${start}|${end}`)) {
        setMovementFeed(dto)
      }
      doneRef.current[key] = true
      return dto
    } finally {
      inflightRef.current[key] = false
    }
  }
  async function requestPerf(projectId: number, start: string, end: string) {
    const key = makeKey("performance", projectId, start, end)
    if (inflightRef.current[key] || doneRef.current[key]) return keywordPerf
    inflightRef.current[key] = true
    try {
      const dto = await fetchKeywordPerformance(projectId, start, end)
      if (lastFetchKeyRef.current.endsWith(`${projectId}|${start}|${end}`)) {
        setKeywordPerf(dto)
      }
      doneRef.current[key] = true
      return dto
    } finally {
      inflightRef.current[key] = false
    }
  }

  const overviewPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearOverviewPoll = () => {
    if (overviewPollRef.current) {
      clearTimeout(overviewPollRef.current);
      overviewPollRef.current = null;
    }
  };
  useEffect(() => () => clearOverviewPoll(), []);


  async function fetchOverviewThenRest(projectId: number, start: string, end: string) {
    const fetchKey = `overview|${projectId}|${start}|${end}`;
    if (lastFetchKeyRef.current === fetchKey && insights.overview) return;

    lastFetchKeyRef.current = fetchKey;
    const myId = ++fetchIdRef.current;

    // reset & show skeleton
    clearOverviewPoll();
    setInsightsLoading(true);
    setRestLoading(false);
    setInsightsError(null);
    setInsights({ overview: null, cannibalization: null, clusterview: null });
    setMovementFeed(undefined);
    setKeywordPerf(undefined);

    // inner function: poll overview until ready
    const pollOnce = async () => {
      try {
        const overview = await fetchInsight(projectId, "overview", start, end);
        if (fetchIdRef.current !== myId) return; // stale

        if (overview?.status === "failed" && overview?.action === "permission_issue") {
          const errorMessage =
            overview?.message || "Access denied for this Google Search Console property. Please update permissions."
          toast.error(errorMessage);
          setInsightsLoading(false);
          setRestLoading(false);
          setInsightsError(errorMessage);
          return;
        }

        // If server is still building (“Fetching”), keep skeleton up and poll again in 2s
        if (overview?.status === "fetching") {
          setInsightsLoading(true);
          overviewPollRef.current = setTimeout(pollOnce, 2000); // 2 sec
          return;
        }

        // ✅ Overview is ready → render + fan-out the rest
        setInsights((prev) => ({ ...prev, overview }));
        setInsightsLoading(false);

        setRestLoading(true);
        try {
          await Promise.all([
            requestCannibalization(projectId, start, end),
            requestClusterView(projectId, start, end),
            requestMovement(projectId, start, end),
            requestPerf(projectId, start, end),
          ]);
        } finally {
          if (fetchIdRef.current === myId) setRestLoading(false);
        }
      } catch (e: any) {
        if (fetchIdRef.current !== myId) return;
        setInsightsLoading(false);
        setInsightsError(e?.message || "Failed to load overview");
      }
    };

    // kick off first check
    pollOnce();
  }


  // tracked keywords (unchanged)
  const fetchKeywords = async () => {
    if (!selectedProject?.id) return
    setLoading(true)
    setKeywordData([])
    try {
      const res = await fetch(`${BASE_URL_WR}tracked-keywords/?project_id=${selectedProject.id}`, { method: "GET" })
      const data: ApiResponse = await res.json()
      setKeywordData(data.keyword_data || [])
    } catch (err) {
      console.error("Failed fetching keywords:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active !== "tracked") return
    if (!selectedProject?.id) return
    fetchKeywords()
  }, [active, selectedProject?.id])



  // local mirror of project for GSC UI
  const [project, setProject] = useState<any>(selectedProject || null)

  // Session / GSC linkage
  const { data: sessionData, status } = useSession()
  const session = sessionData as CustomSession
  const hasSession = !!session && status === "authenticated"

  const isProjectConnectedToGsc = Boolean(project?.gsc_url && project?.gsc_email_data)
  const [gscSites, setGscSites] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([])
  const [selectedSite, setSelectedSite] = useState<string | undefined>(undefined)
  const prevProjectIdRef = useRef<number | string | null>(selectedProject?.id ?? null)

  useEffect(() => {
    if (!selectedProject) {
      setProject(null)
      setGscSites([])
      setSelectedSite(undefined)
      prevProjectIdRef.current = null
      return
    }

    setProject(selectedProject)
    const currentProjectId = selectedProject.id ?? null
    if (prevProjectIdRef.current !== currentProjectId) {
      setGscSites([])
      setSelectedSite(undefined)
      prevProjectIdRef.current = currentProjectId
    }
  }, [selectedProject])

  const [justLinked, setJustLinked] = useState(false)
  const isConnected = justLinked ? true : isProjectConnectedToGsc

  const datePickerRef = useRef<HTMLDivElement | null>(null)
  const scrollToDates = () => {
    datePickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const gscSiteOptions = useMemo(
    () => gscSites.map((s) => ({ label: s.siteUrl, value: s.siteUrl, permission: s.permissionLevel })),
    [gscSites],
  )

  const handleSignIn = () => {
    if (selectedProject?.id) {
      localStorage.setItem("connectingProjectDomain", String(selectedProject.domain))
      localStorage.setItem("redirectTo", "keywordInsights")
    }
    signIn("google", { callbackUrl: window.location.href })
  }

  // ---- GSC: avoid repeated PATCH/GETs
  const fetchGSCSites = useCallback(async () => {
    if (!hasSession || !session?.accessToken) {
      toast.error("Connect your Google account first to load sites.")
      return []
    }
    try {
      const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (!res.ok) throw new Error(`GSC sites HTTP ${res.status}`)
      const data = await res.json()
      const sites =
        data.siteEntry?.map((s: any) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel })) || []
      setGscSites(sites)
      localStorage.setItem("gscSites", JSON.stringify(sites))
      return sites
    } catch (err: any) {
      console.error(err)
      toast.error(`Could not fetch GSC sites: ${err.message || "Unknown error"}`)
      return []
    }
  }, [hasSession, session?.accessToken])

  const sitePatchInFlightRef = useRef(false)
  const lastSavedSiteRef = useRef<string | undefined>(undefined)
  const disconnectInFlightRef = useRef(false)

  const onSelectSite = async (site: string) => {
    setSelectedSite(site)
    if (!project?.id || !hasSession) return

    // Dedup: same site, or patch already in-flight
    if (sitePatchInFlightRef.current) return
    if (lastSavedSiteRef.current === site && project?.gsc_url === site) return

    sitePatchInFlightRef.current = true
    try {
      await updateProject(Number(project.id), {
        gsc_email: session.user?.email,
        gsc_url: site,
        gsc_access_token: session.accessToken,
        gsc_refresh_token: session.refreshToken,
      })
      await refreshProjects()

      // No explicit refresh. Mirror locally instantly.
      setProject((p: any) =>
        p ? { ...p, gsc_email_data: session.user?.email, gsc_url: site, is_gsc_connected: true } : p,
      )
      lastSavedSiteRef.current = site
      setJustLinked(true)
      toast.success("Project updated with selected GSC site.")
      setTimeout(scrollToDates, 50)
    } catch (e) {
      console.error(e)
      toast.error("Failed to save selected GSC site.")
    } finally {
      sitePatchInFlightRef.current = false
    }
  }

  const onDisconnect = async () => {
    if (!project?.id || disconnectInFlightRef.current) return
    disconnectInFlightRef.current = true
    try {
      await updateProject(Number(project.id), { remove_gsc: true })
      await refreshProjects()
      // Local mirror first; no explicit refresh
      setProject((p: any) => (p ? { ...p, gsc_email_data: null, gsc_url: null, is_gsc_connected: false } : p))
      setJustLinked(false)
      setSelectedSite(undefined)

      // Requirement: do PATCH work and sign out as well (no explicit Sign out button)
      await signOut({ redirect: true })
      toast.success("Disconnected from Google Search Console for this project.")
    } catch (e) {
      console.error(e)
      toast.error("Failed to disconnect GSC.")
    } finally {
      disconnectInFlightRef.current = false
    }
  }

  // Auto-scroll focus once (unchanged)
  const scrolledOnceRef = useRef(false)
  useEffect(() => {
    if (active === "insights" && isConnected) {
      if (!scrolledOnceRef.current) {
        scrolledOnceRef.current = true
        setTimeout(scrollToDates, 50)
      }
    } else {
      scrolledOnceRef.current = false
    }
  }, [active, isConnected, project?.id])

  // Trigger Overview → Rest (deps trimmed to stop duplicate runs on minor project field changes)
  useEffect(() => {
    if (active === "insights" && isConnected && selectedProject?.id && dateRange?.[0] && dateRange?.[1]) {
      const [s, e] = dateRange
      fetchOverviewThenRest(Number(selectedProject.id), fmt(s), fmt(e))
    }
  }, [
    active,
    isConnected,
    selectedProject?.id,
    dateRange?.[0]?.toString(),
    dateRange?.[1]?.toString(),
  ])

  // Keep local flags sane if the global selection is cleared
  useEffect(() => {
    if (!isProjectConnectedToGsc) {
      setJustLinked(false)
      setSelectedSite(undefined)
    }
  }, [isProjectConnectedToGsc])

  // Global watcher: if any server row is Pending, keep refreshing the table
  useEffect(() => {
    if (active !== "checker") return;
    let t: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    async function tick() {
      try {
        const all = await fetchRankResults() // reuses your existing helper
        const transformed = transformRankings(all)
        if (!cancelled) {
          setRankings((prev) => {
            const map = new Map<string, any>()
            for (const p of prev) map.set(rowKeyForRanking(p), p)
            for (const r of transformed) map.set(rowKeyForRanking(r), r)
            return Array.from(map.values())
          })
        }

        const anyPending = transformed.some(r => r.status === 'Pending' || r.status === 'In progress')
        if (anyPending && !cancelled) {
          t = setTimeout(tick, 25000)
        }
      } catch (e) {
        // swallow & retry next cycle
        if (!cancelled) t = setTimeout(tick, 30000)
      }
    }

    tick()

    return () => {
      cancelled = true
      if (t) clearTimeout(t)
    }
  }, [active])

function transformKeywordPerfToSeries(keywordPerf: any) {
  if (!keywordPerf?.data?.keywords?.length) return [];

  // 1) Derive start/end from API (which already uses RangePicker dates)
  let startStr: string | null = null;
  let endStr: string | null = null;

  // Prefer explicit structured range if present
  if (keywordPerf?.metadata?.actual_range?.start && keywordPerf.metadata.actual_range.end) {
    startStr = keywordPerf.metadata.actual_range.start;
    endStr = keywordPerf.metadata.actual_range.end;
  } else if (typeof keywordPerf.date_range === "string") {
    // Fallback: parse "YYYY-MM-DD to YYYY-MM-DD"
    const parts = keywordPerf.date_range.split("to");
    if (parts.length === 2) {
      startStr = parts[0].trim();
      endStr = parts[1].trim();
    }
  }

  if (!startStr || !endStr) return [];

  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  // 2) Build EXACT day list from selected range
  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }

  // 3) Top 5 keywords by clicks
  const top = [...keywordPerf.data.keywords]
    .sort((a: any, b: any) => (b.gscClicks || 0) - (a.gscClicks || 0))
    .slice(0, 5);

  // 4) Deterministic spread of clicks across the selected days
  const seededRand = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return () => {
      h = Math.imul(48271, h) % 0x7fffffff;
      return (h & 0xffff) / 0xffff;
    };
  };

  return top.map((k: any, i: number) => {
    const rand = seededRand(k.keyword || `kw_${i}`);
    const total = Math.max(0, k.gscClicks || 0);
    const base = days.length > 0 ? total / days.length : 0;

    const raw = days.map(() =>
      Math.max(0, Math.round(base * (0.6 + rand() * 0.8))),
    );

    // Keep sum equal to total
    const diff = total - raw.reduce((a, b) => a + b, 0);
    if (diff !== 0 && raw.length) {
      const lastIdx = raw.length - 1;
      raw[lastIdx] = Math.max(0, raw[lastIdx] + diff);
    }

    return {
      keywordId: `kw_${i + 1}`,
      keyword: k.keyword,
      color: undefined,
      points: days.map((d, idx) => ({ date: d, value: raw[idx] })),
    };
  });
}




  return (
    <>
      <>
        <div className="mx-auto px-6 py-6">
          <KeywordsHeader
            active={active}
            onTabChange={(k) => {
              setActive(k)
              flash(`Switched to “${k}” tab`)
            }}
            onAddKeywords={() => setShowAddModal(true)}
          />

          <div className="py-2" />

          {/* INSIGHTS: Gate behind GSC connect (stable component; no remount storm) */}
          {active === "insights" && (
            <AnimatePresence>
              <GscIntegrationPanel
                project={project}
                hasSession={hasSession}
                session={session}
                gscSites={gscSites}
                gscSiteOptions={gscSiteOptions}
                selectedSite={selectedSite}
                setSelectedSite={setSelectedSite}
                onLoadSites={fetchGSCSites}
                onSelectSite={onSelectSite}
                onDisconnect={onDisconnect}
              />

              {isConnected && (
                <motion.div
                  key="insights-body"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {/* Date range */}
                  <div ref={datePickerRef} className="flex items-center justify-end gap-4 mt-3 mb-2">
                    <div className="text-sm text-brand-blue1 font-medium">Select date range for Insights</div>
                    <RangePicker
                      allowClear
                      value={dateRange as any}
                      placeholder={["Start date", "End date"]}
                      disabledDate={(cur) => {
                        if (!cur) return false
                        return cur.isBefore(MIN, "day") || cur.isAfter(MAX, "day")
                      }}
                      onChange={(vals) => {
                        if (!vals || !vals[0] || !vals[1]) {
                          setDateRange(null)
                          return
                        }
                        const [s, e] = vals
                        if (s.isBefore(MIN, "day") || e.isAfter(MAX, "day")) {
                          message.warning("Please select a range within the last 3 months.")
                          return
                        }
                        setDateRange([s, e])
                      }}
                      format="YYYY-MM-DD"
                      inputReadOnly
                      color="#008ccd"
                    />
                  </div>
                  {!dateRange && <SelectDatesCallout />}

                  {/* Overview loading */}
                  <AnimatePresence>
                    {insightsLoading && (
                      <motion.div
                        key="overview-skeleton"
                        className="mt-4"
                        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        aria-live="polite"
                      >
                        <div className="flex items-center gap-2 text-brand-blue1 mb-3">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="text-sm font-medium">Loading Overview…</span>
                        </div>
                        <OverviewSkeleton />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
                  {insightsError && (
                    <motion.div
                      className="mt-3 text-sm text-red-600"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {insightsError}
                    </motion.div>
                  )}

                  {/* Overview */}
                  <AnimatePresence>
                    {insights.overview && !insightsLoading && !insightsError && (
                      <motion.div
                        key="overview-content"
                        initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        >
                          {/* <KeywordsKpiSummaryDemo dto={insights.overview} /> */}
                          <KeywordsInsightsSummary dto={insights.overview} />
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
                        >
                          <DemoCanvas data={insights.overview} />
                        </motion.div>

                        <motion.div
                          className="flex md:flex-row flex-col gap-3 w-full"
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
                        >
                          <div className='flex flex-1'>
                            <RankingDistributionDemo dataFromOverview={insights.overview} />
                          </div>
                          <div className='flex-1 flex'>
                            {keywordPerf && <KeywordsPerformanceTrendRightHalf
                                series={transformKeywordPerfToSeries(keywordPerf )}
                              />}
                          </div>

                          {/* {keywordPerf && <KeywordPerformanceTrendDemo data={keywordPerf} />} */}


                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
                        >
                          {keywordPerf && (
                            <PerformanceKeywordsTable
                              data={keywordPerf}                            // initial (page 1)
                              projectId={Number(selectedProject?.id)}       // for subsequent pages
                              startDate={fmt(dateRange![0])}                // "YYYY-MM-DD"
                              endDate={fmt(dateRange![1])}
                            />
                          )}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cannibalization */}
                  <AnimatePresence>
                    {insights.cannibalization && !insightsLoading && !insightsError && (
                      <motion.div
                        key="cannibal"
                        initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <CannibalKPISectionDemo dtoCannib={insights.cannibalization} />
                        <DemoCannibalTrend dtoCannib={insights.cannibalization} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Movement */}
                  <AnimatePresence>
                    {movementFeed && !insightsLoading && !insightsError && (
                      <motion.div
                        key="movement"
                        initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <KeywordMovementFeed data={movementFeed} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cluster View */}
                  <AnimatePresence>
                    {insights.clusterview && !insightsLoading && !insightsError && (
                      <motion.div
                        key="cluster"
                        initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <ClusterView dtoCluster={insights.clusterview} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Subtle secondary loading note */}
                  <AnimatePresence>
                    {restLoading && !insightsLoading && !insightsError && (
                      <motion.div
                        key="rest-loading-indicator"
                        className="mt-3 text-xs text-black flex items-center gap-2 bg-white rounded-lg py-2 px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.div
                          className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            ease: "linear",
                            duration: 0.5,
                          }}
                        />
                        Fetching additional insights…
                      </motion.div>

                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* TRACKED */}
          {active === "tracked" && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {/* <SummaryTrackedKeywordsApp
                  selectedProject={selectedProject}
                  onOpen={() => {
                    if (!keywordData || keywordData.length === 0) setShowAddModal(true)
                  }}
                  onClose={() => setShowAddModal(false)}
                  keywordData={keywordData}
                  loading={loading}
                /> */}
                <TrackedKeywordsPerformanceSummary
                  keywordData={keywordData}
                  loading={loading}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
              >
                <TabletrackedkeywordsApp
                  selectedProject={selectedProject}
                  onOpen={() => {
                    if (!keywordData || keywordData.length === 0) setShowAddModal(true)
                  }}
                  onClose={() => setShowAddModal(false)}
                  keywordData={keywordData}
                  loading={loading}
                  onRefresh={fetchKeywords}
                />
              </motion.div>
            </>
          )}

          {/* CHECKER */}
          {active === "checker" && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <RankCheckerInputPanel
                  state={state}
                  setState={setState}
                  onSubmit={handleSubmit}
                  onClearResults={() => setRankings([])}
                  onResetForm={() => {
                    setState((s: any) => ({
                      ...s,
                      keywords: [],
                      competitors: [],
                      device: "desktop",
                      locationISO: "IN" as any,
                    }))
                  }}
                />
              </motion.div>
              <AnimatePresence>
                {rankings.length > 0 && (
                  <motion.div
                    key="rank-results"
                    className="space-y-4"
                    initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    {/* <RankCheckerKpiRowApp rankings={rankings} isLoading={isLoading} /> */}
                    <KeywordRankSummary
                      checked={rankings.length}
                      ranked={rankings.filter(r => r.rank > 0 && r.rank <= 100).length}
                      avgCurrent={
                        rankings.filter(r => r.rank > 0 && r.rank <= 100).length
                          ? Number(
                            (
                              rankings
                                .filter(r => r.rank > 0 && r.rank <= 100)
                                .reduce((s, r) => s + r.rank, 0) /
                              rankings.filter(r => r.rank > 0 && r.rank <= 100).length
                            ).toFixed(1)
                          )
                          : null
                      }
                      avgHistory={
                        // 10 historical points based on avgCurrent or null
                        Array.from({ length: 10 }, () =>
                          rankings.filter(r => r.rank > 0 && r.rank <= 100).length
                            ? Number(
                              (
                                rankings
                                  .filter(r => r.rank > 0 && r.rank <= 100)
                                  .reduce((s, r) => s + r.rank, 0) /
                                rankings.filter(r => r.rank > 0 && r.rank <= 100).length
                              ).toFixed(1)
                            )
                            : null
                        )
                      }
                      counts10={Array.from({ length: 10 }, () => rankings.length)}
                      coverage10={Array.from({ length: 10 }, () =>
                        rankings.length
                          ? Number(
                            (
                              (rankings.filter(r => r.rank > 0 && r.rank <= 100).length /
                                rankings.length) *
                              100
                            ).toFixed(1)
                          )
                          : 0
                      )}
                      newly7d={{
                        dates: Array.from({ length: 7 }, (_, i) => `D-${6 - i}`),
                        counts: Array.from({ length: 7 }, (_, i) =>
                          i === 6
                            ? rankings.filter(r => !r.inTracker && r.rank > 0 && r.rank <= 100).length
                            : 0
                        )
                      }}
                    />

                    <RankCheckerResultsTableApp rankings={rankings} isLoading={isLoading} />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* GAP */}
          {active === "gap" && (
            <>
              <GapInputCardApp />
              <GapSummarySectionApp />
              <GapResultsTableSectionApp />
            </>
          )}

          {/* OPPORTUNITIES */}
          {active === "opps" && (
            <>
              <OpportunitiesSummaryApp />
              <OpportunitiesTable />
            </>
          )}
        </div>

        {/* Tiny toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              className="fixed bottom-4 right-4 shadow-lg rounded-md px-3 py-2 text-sm"
              style={{ background: TOKENS.text, color: "white" }}
              initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </>

      {/* Add modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div key="add-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <KeywordAddModal showAddModal={showAddModal} setShowAddModal={setShowAddModal} onAdd={fetchKeywords} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
