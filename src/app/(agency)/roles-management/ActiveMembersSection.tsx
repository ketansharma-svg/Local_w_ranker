"use client"
import React, { useEffect, useMemo, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  SlidersHorizontal,
  Download,
  Search,
  Info,
  Users,
  Filter,
  RefreshCw,
  Eye,
  ClipboardList,
  LinkIcon,
} from "lucide-react"
import { fetchTeamDetails, updateMemberAccess } from "@/src/redux/reducer/teamReducer"
import { MemberAccessDrawer } from "./MemberAccessManageDrawerDemo"

const TK = {
  brand: "#1090D0",
  brandHover: "rgba(16,144,208,0.08)",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  subtle: "#F5F7FA",
  tintPanel: "#D2EFFF",
  status: {
    completed: "#28C76F",
    review: "#FF9F43",
    overdue: "#EA5455",
    neutral: "#6C757D",
    inProgress: "#1090D0",
    notStarted: "#8FBED8",
  },
  radius: "12px",
}

/* ───────────────────────── Types ───────────────────────── */
type Role = "Admin" | "Editor" | "Viewer"
type StatusKey = "not_started" | "in_progress" | "review" | "completed" | "overdue"
type CampaignType = "seo" | "content" | "technical" | "reporting" | "ads" | "internal"

type RecentTask = {
  id: string
  title: string
  status: "Not Started" | "In Progress" | "Under Review" | "Completed" | "Overdue"
  project: string
  due?: string
  updatedAt: string
}

type ProjectSlice = { project: string; assigned: number; completed: number; overdue: number }

type MemberDetail = {
  statusMix: Record<StatusKey, number>
  projectBreakdown: ProjectSlice[]
  recentTasks: RecentTask[]
}

type MemberRow = {
  id: string
  name: string
  email?: string // Added for display
  projects?: TeamProject[] // Added for display of access
  role: Role
  avatarHue: number
  projectsCount: number
  assigned: number // MOCK
  completed: number // MOCK
  overdue: number // MOCK
  avgDurationHours: number | null // MOCK
  timeLoggedMinutes?: number // MOCK
  reassignedCount?: number // MOCK
  campaigns: Partial<Record<CampaignType, number>>
  loadPct: number // derived
  detail?: MemberDetail // contains mocked slices
}

type StatusUpper = "Active" | "Invited" | "Suspended" | "Deactivated"
type GlobalFilters = { members?: string[]; roles?: Role[]; statuses?: StatusUpper[] }

function memberMatchesFilters(m: TeamMember, f?: GlobalFilters) {
  if (!f) return true
  if (Array.isArray(f.members) && f.members.length && !f.members.includes(String(m.member_id))) return false
  // status
  if (Array.isArray(f.statuses) && f.statuses.length) {
    const hasPending = (m.projects || []).some((p) => String(p?.invitation_status || "").toLowerCase() === "pending")
    const isActive = (m.projects || []).some(
      (p) =>
        String(p?.invitation_status || "").toLowerCase() === "accepted" && (p.dashboards || []).some((d) => d?.active),
    )
    const ok =
      (f.statuses.includes("Active") && isActive) ||
      (f.statuses.includes("Invited") && hasPending) ||
      (f.statuses.includes("Suspended") && false) ||
      (f.statuses.includes("Deactivated") && false)
    if (!ok) return false
  }
  // role (max across dashboards)
  const role = inferMemberRole(m.projects || [])
  if (Array.isArray(f.roles) && f.roles.length && !f.roles.includes(role)) return false
  return true
}

/* ───────────────────────── Seeded random helpers ───────────────────────── */
const seededHash = (s: string) => {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const sRandInt = (rng: () => number, min: number, max: number) => Math.round(min + rng() * (max - min))

/* ───────────────────────── Formatting helpers ───────────────────────── */
function hhmmFromMinutes(min?: number) {
  if (min == null) return "—"
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m.toString().padStart(2, "0")}m`
}
function dhFromHours(h: number | null) {
  if (!h && h !== 0) return "—"
  const d = Math.floor(h / 24)
  const hr = Math.round(h % 24)
  if (d === 0) return `${hr}h`
  if (hr === 0) return `${d}d`
  return `${d}d ${hr}h`
}
function fmt(n: number) {
  return n.toLocaleString()
}

/* ───────────────────────── UI helpers ───────────────────────── */
const HeaderTip: React.FC<{ tip: string; children: React.ReactNode }> = ({ tip, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          <Info className="h-3.5 w-3.5 text-[#9E9E9E]" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[320px] text-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

function rolePill(role: Role) {
  return (
    <span className="px-2 py-0.5 rounded border text-xs" style={{ borderColor: TK.borderLight, color: TK.muted }}>
      {role}
    </span>
  )
}
function overduePill(n: number) {
  const bg = "rgba(234,84,85,0.10)"
  return (
    <span className="px-2 py-0.5 rounded text-xs" style={{ background: bg, color: TK.status.overdue }}>
      {fmt(n)}
    </span>
  )
}
function loadBadge(pct: number) {
  const tier = pct >= 150 ? "Critical" : pct >= 100 ? "High" : "Normal"
  const tone = tier === "Critical" ? TK.status.overdue : tier === "High" ? TK.status.review : TK.status.neutral
  const bg =
    tier === "Critical" ? "rgba(234,84,85,0.12)" : tier === "High" ? "rgba(255,159,67,0.12)" : "rgba(108,117,125,0.12)"
  return (
    <span className="px-2 py-0.5 rounded text-xs" title={`Load = ${pct}% vs team median`}>
      <span className="px-1.5 py-0.5 rounded" style={{ background: bg, color: tone }}>
        {tier}
      </span>
    </span>
  )
}

const CampaignChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`h-8 px-3 rounded-full border text-sm ${active ? "font-semibold" : ""}`}
    style={{
      borderColor: TK.borderLight,
      background: active ? TK.tintPanel : "#fff",
      color: active ? TK.text : TK.text,
    }}
  >
    {label}
  </button>
)

/* Compact 100% stacked bar for Status mix (expander) */
const StatusStackBar: React.FC<{ mix: Record<StatusKey, number> }> = ({ mix }) => {
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1
  const segs: { key: StatusKey; color: string; value: number; label: string }[] = [
    { key: "not_started", color: TK.status.notStarted, value: mix.not_started || 0, label: "Not Started" },
    { key: "in_progress", color: TK.status.inProgress, value: mix.in_progress || 0, label: "In Progress" },
    { key: "review", color: TK.status.review, value: mix.review || 0, label: "Under Review" },
    { key: "completed", color: TK.status.completed, value: mix.completed || 0, label: "Completed" },
    { key: "overdue", color: TK.status.overdue, value: mix.overdue || 0, label: "Overdue" },
  ]
  return (
    <div>
      <div className="h-3 w-full rounded overflow-hidden border" style={{ borderColor: TK.borderLight }}>
        <div className="flex h-3 w-full">
          {segs.map((s) => {
            const w = (s.value / total) * 100
            if (w <= 0) return null
            return <div key={s.key} style={{ width: `${w}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label} <b className="text-foreground">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── Columns (UI unchanged) ───────────────────────── */
type ColKey =
  | "select"
  | "expander"
  | "member"
  | "projects"
  | "assigned"
  | "completed"
  | "overdue"
  | "avgDuration"
  | "timeLogged"
  | "reassigned"
  | "load"
  | "actions"

type ColDef = { key: ColKey; label: string; width?: number; sortable?: boolean; sticky?: boolean; tip?: string }

const COLS: ColDef[] = [
  { key: "select", label: "", width: 46, sticky: true },
  { key: "expander", label: "", width: 44, sticky: true },
  {
    key: "member",
    label: "Assignee",
    width: 280,
    sortable: true,
    sticky: true,
    tip: "Member name, role (click name to open detail in future phase).",
  },
  { key: "projects", label: "Projects", width: 110, sortable: true, tip: "Distinct projects within scope." },
  { key: "assigned", label: "Assigned", width: 120, sortable: true, tip: "Tasks assigned in the selected range." },
  { key: "completed", label: "Completed", width: 130, sortable: true, tip: "Tasks completed in the selected range." },
  { key: "overdue", label: "Overdue", width: 110, sortable: true, tip: "Past due & not completed." },
  {
    key: "avgDuration",
    label: "Avg. Duration",
    width: 150,
    sortable: true,
    tip: "Mean completion time for tasks finished in range.",
  },
  {
    key: "timeLogged",
    label: "Time Logged",
    width: 140,
    sortable: true,
    tip: "Sum of time entries in range (if enabled).",
  },
  {
    key: "reassigned",
    label: "Reassigned",
    width: 130,
    sortable: true,
    tip: "Tasks that changed assignee within range.",
  },
  { key: "load", label: "Load Risk", width: 140, sortable: true, tip: "Load % vs team median; ≥150% highlighted." },
  { key: "actions", label: "Actions", width: 170, tip: "Open in Taskboard, Create Task, Copy." },
]

/* ───────────────────────── Redux → Rows mapping ───────────────────────── */
type TeamProject = {
  project_id: number | string
  project_name: string | null
  project_domain: string | null
  team_id: number | string
  dashboards: { id: number | null; type: string; access: string; active: boolean }[]
  invitation_status: string | null
  task_stats?: Record<string, number> // Added for task stats
}
type TeamMember = {
  member_id: number | string
  member_email: string
  member_name: string | null
  projects: TeamProject[]
}

const accessRank: Record<string, number> = { admin: 3, editor: 2, viewer: 1 }
const toRole = (dashboards: TeamProject["dashboards"]): Role => {
  let best = 0
  for (const d of dashboards || []) {
    const r = accessRank[(d?.access ?? "").toLowerCase()] ?? 0
    if (r > best) best = r
  }
  return best >= 3 ? "Admin" : best === 2 ? "Editor" : "Viewer"
}

function inferMemberRole(projects: TeamProject[]): Role {
  let best = 0
  for (const p of projects || []) {
    const r = toRole(p?.dashboards || [])
    const rank = accessRank[r.toLowerCase()]
    if (rank > best) best = rank
  }
  return best >= 3 ? "Admin" : best === 2 ? "Editor" : "Viewer"
}

function countActiveDashboards(projects: TeamProject[]) {
  const tally = { seo: 0, content: 0, reporting: 0 }
  for (const p of projects || []) {
    for (const d of p?.dashboards || []) {
      if (!d?.active) continue
      const t = (d.type ?? "").toLowerCase()
      if (t === "seo") tally.seo += 1
      else if (t === "content") tally.content += 1
      else if (t === "reporting") tally.reporting += 1
    }
  }
  return tally
}

const TASK_TITLES = [
  "Fix meta tags",
  "Review content brief",
  "Schema updates",
  "QA internal links",
  "Campaign kickoff",
  "Backlink outreach",
  "Prepare monthly report",
]

/** Build rows from Redux with seeded mock where needed */
function makeRowsFromTeam(members: TeamMember[]): MemberRow[] {
  const rows: MemberRow[] = []

  for (const m of members || []) {
    const seedStr = `${m.member_id}|${m.member_email || ""}`
    const rng = mulberry32(seededHash(seedStr))
    const name = (m.member_name && m.member_name.trim()) || m.member_email || `Member ${m.member_id}`
    const projects = Array.isArray(m.projects) ? m.projects : []
    const projectsCount = projects.length

    // REAL: inferred role from dashboards
    const role = inferMemberRole(projects)

    // REAL: active dashboard campaign counts
    const activeDash = countActiveDashboards(projects)

    const assigned = projects.reduce((sum, p) => {
      const stats = p.task_stats || {}
      return (
        sum +
        (stats["Not Started"] || 0) +
        (stats["Working"] || 0) +
        (stats["Completed"] || 0) +
        (stats["Under Review"] || 0) +
        (stats["Overdue"] || 0)
      )
    }, 0)

    const completed = projects.reduce((sum, p) => sum + ((p.task_stats || {})["Completed"] || 0), 0)
    const overdue = projects.reduce((sum, p) => sum + ((p.task_stats || {})["Overdue"] || 0), 0)

    const avgDurationHours = completed > 0 ? sRandInt(rng, 18, 140) : null
    const timeLoggedMinutes = sRandInt(rng, 300, 4200)
    const reassignedCount = sRandInt(rng, 0, 4)
    const avatarHue = sRandInt(rng, 0, 359)

    // REAL: campaign counts from active dashboards
    const campaigns: MemberRow["campaigns"] = {
      seo: activeDash.seo,
      content: activeDash.content,
      reporting: activeDash.reporting,
      technical: sRandInt(rng, 0, 4),
      ads: sRandInt(rng, 0, 4),
      internal: sRandInt(rng, 0, 3),
    }

    // MOCK detail: status mix
    const in_progress = projects.reduce((sum, p) => sum + ((p.task_stats || {})["Working"] || 0), 0)
    const review = projects.reduce((sum, p) => sum + ((p.task_stats || {})["Under Review"] || 0), 0)
    const not_started = projects.reduce((sum, p) => sum + ((p.task_stats || {})["Not Started"] || 0), 0)
    const statusMix: MemberDetail["statusMix"] = {
      not_started,
      in_progress,
      review,
      completed,
      overdue,
    }

    // REAL project names; task stats per project
    const projectBreakdown: ProjectSlice[] = projects.slice(0, 5).map((p) => {
      const stats = p.task_stats || {}
      const a =
        (stats["Not Started"] || 0) +
        (stats["Working"] || 0) +
        (stats["Completed"] || 0) +
        (stats["Under Review"] || 0) +
        (stats["Overdue"] || 0)
      const c = stats["Completed"] || 0
      const o = stats["Overdue"] || 0
      const label = p.project_name || p.project_domain || `Project ${p.project_id}`
      return { project: label, assigned: a, completed: c, overdue: o }
    })

    // MOCK: recent tasks (names seeded; project names from Redux)
    const recentCount = sRandInt(rng, 0, 5)
    const projectLabels = projectBreakdown.map((pb) => pb.project)
    const recentTasks: RecentTask[] = Array.from({ length: recentCount }, (_, i) => {
      const rr = mulberry32(seededHash(`${seedStr}|task|${i}`))
      const title = TASK_TITLES[sRandInt(rr, 0, TASK_TITLES.length - 1)]
      const statuses: RecentTask["status"][] = ["Not Started", "In Progress", "Under Review", "Completed", "Overdue"]
      const status: RecentTask["status"] = statuses[sRandInt(rr, 0, statuses.length - 1)]
      const proj = projectLabels.length ? projectLabels[sRandInt(rr, 0, projectLabels.length - 1)] : "General"
      const due =
        rr() > 0.5 ? new Date(Date.now() + sRandInt(rr, -6, 14) * 86400000).toISOString().slice(0, 10) : undefined
      const updatedAt = new Date(Date.now() - sRandInt(rr, 0, 14) * 86400000).toISOString()
      return { id: `${m.member_id}-${i}`, title, status, project: proj, due, updatedAt }
    })

    rows.push({
      id: `member-${m.member_id}`,
      name,
      email: m.member_email, // Store email for display
      projects: projects, // Store full projects for access display
      role,
      avatarHue,
      projectsCount,
      assigned,
      completed,
      overdue,
      avgDurationHours,
      timeLoggedMinutes,
      reassignedCount,
      campaigns,
      loadPct: 100, // normalize later
      detail: { statusMix, projectBreakdown, recentTasks },
    })
  }

  // Normalize loadPct vs team median assigned (same logic as original)
  const assignedArr = rows.map((r) => r.assigned).sort((a, b) => a - b)
  const median = assignedArr[Math.floor(assignedArr.length / 2)] || 1
  rows.forEach((r) => {
    r.loadPct = Math.min(200, Math.round((r.assigned / Math.max(1, median)) * 100))
  })

  return rows
}

/* ORIGINAL mock builder kept for fallback / parity */
function makeMockRows(n = 24): MemberRow[] {
  const rows: MemberRow[] = []
  for (let i = 0; i < n; i++) {
    const seed = `mock-${i}`
    const rng = mulberry32(seededHash(seed))
    const assigned = sRandInt(rng, 10, 80)
    const completed = Math.max(0, assigned - sRandInt(rng, 0, 20))
    const overdue = Math.max(0, sRandInt(rng, 0, 6))
    const avgDurationHours = completed > 0 ? sRandInt(rng, 18, 120) : null
    const timeLoggedMinutes = sRandInt(rng, 300, 4200)
    const reassignedCount = sRandInt(rng, 0, 4)
    const avatarHue = sRandInt(rng, 0, 359)

    const statusMix: MemberDetail["statusMix"] = {
      not_started: Math.max(0, assigned - completed - overdue - sRandInt(rng, 0, 6) - sRandInt(rng, 0, 6)),
      in_progress: sRandInt(rng, 0, 10),
      review: sRandInt(rng, 0, 6),
      completed,
      overdue,
    }
    const projectBreakdown: ProjectSlice[] = Array.from({ length: sRandInt(rng, 1, 5) }, (_, k) => {
      const a = sRandInt(rng, 3, 22)
      const c = Math.max(0, a - sRandInt(rng, 0, 6))
      const o = Math.max(0, sRandInt(rng, 0, 3))
      return { project: `Project ${k + 1}`, assigned: a, completed: c, overdue: o }
    })
    const recentTasks: RecentTask[] = Array.from({ length: sRandInt(rng, 0, 5) }, (_, r) => ({
      id: `${i}-${r}`,
      title: TASK_TITLES[sRandInt(rng, 0, TASK_TITLES.length - 1)],
      status: [
        "Not Started",
        "In Progress",
        "Under Review",
        "Completed",
        "Overdue",
      ][sRandInt(rng, 0, 4)] as RecentTask["status"],
      project: projectBreakdown[sRandInt(rng, 0, projectBreakdown.length - 1)]?.project ?? "General",
      due:
        Math.random() > 0.5
          ? new Date(Date.now() + sRandInt(rng, -6, 14) * 86400000).toISOString().slice(0, 10)
          : undefined,
      updatedAt: new Date(Date.now() - sRandInt(rng, 0, 14) * 86400000).toISOString(),
    }))

    rows.push({
      id: `u-${i + 1}`,
      name: `Member ${i + 1}`,
      role: (["Admin", "Editor", "Viewer"] as Role[])[sRandInt(rng, 0, 2)],
      avatarHue,
      projectsCount: sRandInt(rng, 1, 6),
      assigned,
      completed,
      overdue,
      avgDurationHours,
      timeLoggedMinutes,
      reassignedCount,
      campaigns: {
        seo: sRandInt(rng, 0, 12),
        content: sRandInt(rng, 0, 10),
        technical: sRandInt(rng, 0, 6),
        reporting: sRandInt(rng, 0, 6),
        ads: sRandInt(rng, 0, 6),
        internal: sRandInt(rng, 0, 4),
      },
      loadPct: 100,
      detail: { statusMix, projectBreakdown, recentTasks },
    })
  }

  const assignedArr = rows.map((r) => r.assigned).sort((a, b) => a - b)
  const median = assignedArr[Math.floor(assignedArr.length / 2)] || 1
  rows.forEach((r) => {
    r.loadPct = Math.min(200, Math.round((r.assigned / Math.max(1, median)) * 100))
  })
  return rows
}

/* ───────────────────────── Component ───────────────────────── */
export default function ActiveMembersSection({
  filters,
  loading,
  onFiltersChange,
}: { filters?: GlobalFilters; loading?: boolean; onFiltersChange?: (q: GlobalFilters) => void }) {
  const dispatch = useDispatch()
  const teamSlice: any = useSelector((s: any) => s.team)

  /* Build rows from Redux, fallback to mock if empty */
  const rows = useMemo<MemberRow[]>(() => {
    const all: TeamMember[] = Array.isArray(teamSlice?.members) ? teamSlice.members : []
    const subset = all.filter((m) => memberMatchesFilters(m, filters))
    if (subset.length > 0) return makeRowsFromTeam(subset)
    // if slice is present but nothing matches, return empty (no mock)
    if (Array.isArray(teamSlice?.members)) return []
    return makeMockRows(24)
  }, [teamSlice, filters])

  /* Column visibility (UI unchanged) */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() =>
    COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>),
  )

  /* Sort */
  const [sortBy, setSortBy] = useState<ColKey>("assigned")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const toggleSort = (key: ColKey) => {
    if (!COLS.find((c) => c.key === key)?.sortable) return
    if (sortBy !== key) {
      setSortBy(key)
      setSortDir("asc")
    } else setSortBy(key)
    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
  }

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  /* Expanded (only if detail exists) */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggleExpand = (r: MemberRow) => {
    if (!r.detail) return
    setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))
  }

  /* Density */
  const [density, setDensity] = useState<"compact" | "comfortable" | "cozy">("comfortable")
  const rowH = density === "compact" ? "h-12" : density === "cozy" ? "h-16" : "h-14"

  /* Filters */
  const [q, setQ] = useState("")
  const [datePreset, setDatePreset] = useState("last30")
  const [roleFilter, setRoleFilter] = useState<{ Admin: boolean; Editor: boolean; Viewer: boolean }>({
    Admin: true,
    Editor: true,
    Viewer: true,
  })
  useEffect(() => {
    const selected = filters?.roles ?? []
    if (!selected.length) {
      setRoleFilter({ Admin: true, Editor: true, Viewer: true })
      return
    }
    setRoleFilter({
      Admin: selected.includes("Admin"),
      Editor: selected.includes("Editor"),
      Viewer: selected.includes("Viewer"),
    })
  }, [filters?.roles])
  const [campaignFilter, setCampaignFilter] = useState<Record<CampaignType, boolean>>({
    seo: false,
    content: false,
    technical: false,
    reporting: false,
    ads: false,
    internal: false,
  })
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [onlyHighLoad, setOnlyHighLoad] = useState(false)

  /* Pagination */
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  /* Derived: filtered */
  const filtered = useMemo(() => {
    const activeCampaigns = (Object.keys(campaignFilter) as CampaignType[]).filter((k) => campaignFilter[k])
    return rows.filter((r) => {
      if (!roleFilter[r.role]) return false
      if (q) {
        const s = q.toLowerCase()
        if (!r.name.toLowerCase().includes(s)) return false
      }
      if (onlyOverdue && r.overdue <= 0) return false
      if (onlyHighLoad && r.loadPct < 150) return false
      if (activeCampaigns.length) {
        const hasAny = activeCampaigns.some((ct) => (r.campaigns[ct] || 0) > 0)
        if (!hasAny) return false
      }
      return true
    })
  }, [rows, roleFilter, q, onlyOverdue, onlyHighLoad, campaignFilter])

  /* Sorted */
  const sorted = useMemo(() => {
    const arr = [...filtered]
    const getVal = (r: MemberRow) => {
      switch (sortBy) {
        case "member":
          return r.name
        case "projects":
          return r.projectsCount
        case "assigned":
          return r.assigned
        case "completed":
          return r.completed
        case "overdue":
          return r.overdue
        case "avgDuration":
          return r.avgDurationHours ?? Number.POSITIVE_INFINITY
        case "timeLogged":
          return r.timeLoggedMinutes ?? -1
        case "reassigned":
          return r.reassignedCount ?? 0
        case "load":
          return r.loadPct
        default:
          return 0
      }
    }
    arr.sort((a, b) => {
      const av = getVal(a),
        bv = getVal(b)
      if (av === bv) return 0
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1
    })
    return arr
  }, [filtered, sortBy, sortDir])

  /* Window rows */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])
  const pageStart = (page - 1) * pageSize
  const windowRows = useMemo(() => sorted.slice(pageStart, pageStart + pageSize), [sorted, pageStart, pageSize])

  /* Selection scope + bulk bar */
  const pageIds = useMemo(() => windowRows.map((r) => r.id), [windowRows])
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected[id])
  const toggleSelectAll = () => {
    const checked = !allSelected
    setSelected((prev) => {
      const next = { ...prev } as Record<string, boolean>
      pageIds.forEach((id) => {
        next[id] = checked
      })
      return next
    })
  }

  /* Visible columns */
  const VISIBLE = useMemo(() => COLS.filter((c) => visibleCols[c.key] !== false), [visibleCols])

  /* Export (respects visible cols; unchanged) */
  const exportCSV = () => {
    const headers = VISIBLE.filter((c) => !["select", "expander", "actions"].includes(c.key)).map((c) => c.label)
    const mapVal = (r: MemberRow, key: ColKey) => {
      switch (key) {
        case "member":
          return `${r.name} (${r.role})`
        case "projects":
          return r.projectsCount
        case "assigned":
          return r.assigned
        case "completed":
          return r.completed
        case "overdue":
          return r.overdue
        case "avgDuration":
          return dhFromHours(r.avgDurationHours ?? 0)
        case "timeLogged":
          return hhmmFromMinutes(r.timeLoggedMinutes)
        case "reassigned":
          return r.reassignedCount ?? 0
        case "load":
          return `${r.loadPct}%`
        default:
          return ""
      }
    }
    const rowsCsv = sorted.map((r) =>
      VISIBLE.filter((c) => !["select", "expander", "actions"].includes(c.key))
        .map((c) => JSON.stringify(mapVal(r, c.key)))
        .join(","),
    )
    const csv = [headers.join(","), ...rowsCsv].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "active-members.csv"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /* Styles */
  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? {
          position: "sticky" as const,
          left: c.key === "select" ? 0 : c.key === "expander" ? 46 : c.key === "member" ? 90 : 0,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        }
      : undefined

  const headerSortIcon = (key: ColKey) =>
    sortBy === key ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    ) : (
      <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    )

  /* Role multi-select content */
  const RoleCheckbox: React.FC<{ r: Role }> = ({ r }) => (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={roleFilter[r]}
        onCheckedChange={(v) => {
          const next = { ...roleFilter, [r]: Boolean(v) }
          setRoleFilter(next)
          const selected = (Object.entries(next) as Array<[Role, boolean]>)
            .filter(([, on]) => on)
            .map(([k]) => k as Role)
          // empty array means "All" in header semantics
          onFiltersChange?.({ ...(filters || {}), roles: selected.length === 3 ? [] : selected })
        }}
      />
      <span>{r}</span>
    </label>
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null)
  
  const [selectedMemberId, setSelectedMemberId] = useState<any>(null)
  const openDrawer = (member: MemberRow) => {
    const memberId = member.id.replace("member-", "")
    setSelectedMemberId(memberId)
        setDrawerOpen(true)
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    setSelectedMemberId(null)
  }

  const memberToVM = (member: MemberRow) => {
    if (!member) return undefined

    const projects = (member.projects || []).map((p: any) => ({
      project_id: String(p.project_id),
      project_name: p.project_name || p.project_domain || `Project ${p.project_id}`,
      dashboards: (p.dashboards || []).map((d: any) => ({
        key: d.type.toLowerCase() as "seo" | "content" | "taskboard" | "reporting",
        enabled: d.active,
        role: d.access.toLowerCase() as "admin" | "editor" | "viewer",
      })),
    }))

    return {
      user_id: member.id,
      name: member.name,
      email: member.email || "",
      avatar_url: undefined,
      status: "active" as const,
      projects,
    }
  }

  const handleUpdateAccess = async (dashboardId: string, dashboardType: string, newAccessLevel: string) => {
    try {
      await dispatch(
        updateMemberAccess({
          dashboard_id: dashboardId,
          dashboard_type: dashboardType,
          access_level: newAccessLevel,
        }) as any,
      )
      // Refresh team data after update
      await dispatch(fetchTeamDetails({ force: true }) as any)
    } catch (error) {
      console.error("[v0] Failed to update access:", error)
      throw error
    }
  }

  return (
    <section className="space-y-3 w-full" style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
      <Card className="border" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {drawerOpen && selectedMemberId && (
          <MemberAccessDrawer
            open={drawerOpen}
            onClose={closeDrawer}
            memberId={Number(selectedMemberId)}

          />
        )}

        {/* ─ Header bar ─ */}
        <CardHeader
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: TK.brand }} />
            <CardTitle className="text-lg">Active Members</CardTitle>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Density */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
                  title="Density"
                >
                  <Filter className="h-4 w-4" /> Density
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48">
                <div className="text-sm font-medium mb-2">Row density</div>
                <div className="space-y-2">
                  {(["compact", "comfortable", "cozy"] as const).map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="density" checked={density === d} onChange={() => setDensity(d)} />
                      <span className="capitalize">{d}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Columns control */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {COLS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={c.key === "select" || c.key === "expander" || c.key === "member"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                      />
                      <span>{c.label || c.key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCols(COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as any))}
                  >
                    Reset
                  </Button>
                  <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Button variant="outline" className="h-8 px-3 bg-transparent" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>

            {/* Refresh (placeholder) */}
            <Button variant="ghost" className="h-8 px-2 text-muted-foreground" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* ─ Filter bar with chips ─ */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[280px] pl-7"
                placeholder="Search assignee…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            {/* Role (multi) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]">
                  Roles
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56">
                <div className="text-sm font-medium mb-2">Filter by role</div>
                <div className="space-y-2">
                  <RoleCheckbox r="Admin" />
                  <RoleCheckbox r="Editor" />
                  <RoleCheckbox r="Viewer" />
                </div>
              </PopoverContent>
            </Popover>

            {/* Chips */}
            <button
              onClick={() => {
                setOnlyOverdue((v) => !v)
                setPage(1)
              }}
              className={`h-8 px-3 rounded-full border text-sm ${onlyOverdue ? "font-semibold" : ""}`}
              style={{ borderColor: TK.borderLight, background: onlyOverdue ? TK.tintPanel : "#fff" }}
            >
              Overdue &gt; 0
            </button>

            <button
              onClick={() => {
                setOnlyHighLoad((v) => !v)
                setPage(1)
              }}
              className={`h-8 px-3 rounded-full border text-sm ${onlyHighLoad ? "font-semibold" : ""}`}
              style={{ borderColor: TK.borderLight, background: onlyHighLoad ? TK.tintPanel : "#fff" }}
              title="Load ≥ 150% vs team median"
            >
              High Load
            </button>

            {/* Campaign chips */}
            <div className="flex items-center gap-1 ml-1">
              {(["seo", "content", "technical", "reporting", "ads", "internal"] as CampaignType[]).map((ct) => (
                <CampaignChip
                  key={ct}
                  label={ct.charAt(0).toUpperCase() + ct.slice(1)}
                  active={campaignFilter[ct]}
                  onClick={() => {
                    setCampaignFilter((s) => ({ ...s, [ct]: !s[ct] }))
                    setPage(1)
                  }}
                />
              ))}
            </div>

            {/* DatePreset */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Range</span>
              <Select
                value={datePreset}
                onValueChange={(v) => {
                  setDatePreset(v) /* connect to API when available */
                }}
              >
                <SelectTrigger className="h-8 px-3 w-[160px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="qtd">Quarter‑to‑date</SelectItem>
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div
              className="w-full mt-2 p-2 rounded border flex items-center gap-2"
              style={{ borderColor: TK.borderLight, background: TK.subtle }}
            >
              <span className="text-sm">
                <strong>{selectedIds.length}</strong> selected
              </span>
              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
              <Button size="sm" variant="outline" onClick={() => alert("Compare selected (placeholder)")}>
                Compare
              </Button>
              <Button size="sm" variant="outline" onClick={exportCSV}>
                Export Selected
              </Button>
              <Button size="sm" variant="outline" onClick={() => alert("Open Taskboard with selected (placeholder)")}>
                Open in Taskboard
              </Button>
              <div className="ml-auto">
                <Button size="sm" variant="ghost" onClick={() => setSelected({})}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* ─ Table ─ */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-20" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
                <TableRow className="hover:bg-white">
                  {VISIBLE.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }}
                      className="text-left"
                    >
                      {c.key === "select" ? (
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all on page"
                        />
                      ) : c.sortable ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() => toggleSort(c.key)}
                          aria-label={`Sort by ${c.label}`}
                        >
                          <HeaderTip tip={c.tip ?? ""}>
                            <span>{c.label}</span>
                          </HeaderTip>
                          {headerSortIcon(c.key)}
                        </button>
                      ) : (
                        <HeaderTip tip={c.tip ?? ""}>
                          <span>{c.label}</span>
                        </HeaderTip>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`sk-${i}`} className="hover:bg-white">
                      {VISIBLE.map((c) => (
                        <TableCell key={`${c.key}-${i}`}>
                          <div className="h-4 w-full rounded bg-[#F5F7FA]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {windowRows.map((r) => {
                  const hasDetail = !!r.detail
                  return (
                    <React.Fragment key={r.id}>
                      <TableRow
                        className={`${rowH} hover:bg-[${TK.brandHover}]`}
                        style={{ cursor: hasDetail ? "pointer" : "default" }}
                        onDoubleClick={() => hasDetail && toggleExpand(r)}
                      >
                        {/* select */}
                        {visibleCols.select !== false && (
                          <TableCell style={stickyStyle(COLS[0]) as any} className="text-left">
                            <Checkbox
                              checked={!!selected[r.id]}
                              onCheckedChange={(v) => setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))}
                              aria-label={`Select ${r.name}`}
                            />
                          </TableCell>
                        )}

                        {/* expander (only if detail exists) */}
                        {visibleCols.expander !== false && (
                          <TableCell style={stickyStyle(COLS[1]) as any} className="text-left">
                            {hasDetail ? (
                              <button
                                onClick={() => toggleExpand(r)}
                                aria-label={expanded[r.id] ? "Collapse details" : "Expand details"}
                                className="rounded border p-1 hover:bg-muted"
                                title={expanded[r.id] ? "Collapse" : "Expand"}
                              >
                                {expanded[r.id] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="inline-block w-4 h-4" aria-hidden />
                            )}
                          </TableCell>
                        )}

                        {visibleCols.member !== false && (
                          <TableCell style={{ ...stickyStyle(COLS[2]), minWidth: 280 }} className="text-left">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDrawer(r)}>
                              <div
                                className="w-8 h-8 rounded-full grid place-items-center text-white text-xs font-semibold"
                                style={{ background: `hsl(${r.avatarHue} 70% 45%)` }}
                                aria-hidden
                              >
                                {r.name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((s) => s[0])
                                  .join("")}
                              </div>
                              <div className="flex flex-col">
                                <span className="leading-tight font-medium">{r.name}</span>
                                <span className="text-xs text-muted-foreground">{r.email}</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {r.projects?.slice(0, 2).map((p: any) =>
                                    p.dashboards
                                      ?.filter((d: any) => d.active)
                                      .slice(0, 2)
                                      .map((d: any, idx: number) => (
                                        <span
                                          key={`${p.project_id}-${idx}`}
                                          className="text-[10px] px-1.5 py-0.5 rounded border"
                                          style={{ borderColor: TK.borderLight, background: TK.subtle }}
                                          title={`${d.type} - ${d.access} on ${p.project_name || p.project_domain}`}
                                        >
                                          {d.type}: {d.access}
                                        </span>
                                      )),
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {/* Projects */}
                        {visibleCols.projects !== false && (
                          <TableCell className="text-left">{fmt(r.projectsCount)}</TableCell>
                        )}

                        {/* Assigned */}
                        {visibleCols.assigned !== false && (
                          <TableCell className="text-left">{fmt(r.assigned)}</TableCell>
                        )}

                        {/* Completed */}
                        {visibleCols.completed !== false && (
                          <TableCell className="text-left">
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ background: "rgba(40,199,111,0.12)", color: TK.status.completed }}
                            >
                              {fmt(r.completed)}
                            </span>
                          </TableCell>
                        )}

                        {/* Overdue */}
                        {visibleCols.overdue !== false && (
                          <TableCell className="text-left">{overduePill(r.overdue)}</TableCell>
                        )}

                        {/* Avg Duration */}
                        {visibleCols.avgDuration !== false && (
                          <TableCell className="text-left">{dhFromHours(r.avgDurationHours)}</TableCell>
                        )}

                        {/* Time Logged */}
                        {visibleCols.timeLogged !== false && (
                          <TableCell className="text-left">{hhmmFromMinutes(r.timeLoggedMinutes)}</TableCell>
                        )}

                        {/* Reassigned */}
                        {visibleCols.reassigned !== false && (
                          <TableCell className="text-left">{fmt(r.reassignedCount ?? 0)}</TableCell>
                        )}

                        {/* Load */}
                        {visibleCols.load !== false && (
                          <TableCell className="text-left">{loadBadge(r.loadPct)}</TableCell>
                        )}

                        {/* Actions */}
                        {visibleCols.actions !== false && (
                          <TableCell className="text-left">
                            <div className="inline-flex items-center gap-1.5">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => openDrawer(r)}
                                      size="icon"
                                      variant="ghost"
                                      className="text-[#4286F5]"
                                      aria-label="Manage Access"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Manage Access</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-[#4286F5]"
                                      aria-label="Create Task"
                                    >
                                      <ClipboardList className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Create Task</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" aria-label="Open Taskboard">
                                      <LinkIcon className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Open in Taskboard</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Expanded row */}
                      {expanded[r.id] && r.detail && (
                        <TableRow>
                          <TableCell colSpan={VISIBLE.length} className="text-left">
                            <div
                              className="p-4 rounded-md border"
                              style={{ borderColor: TK.borderLight, background: "#FAFBFF" }}
                            >
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Status mix stacked bar */}
                                <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-medium">Status Mix</div>
                                    <div className="text-xs text-muted-foreground">Total {fmt(r.assigned)}</div>
                                  </div>
                                  <StatusStackBar mix={r.detail.statusMix} />
                                </div>

                                {/* Project breakdown */}
                                <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                                  <div className="text-sm font-medium mb-2">Top Projects</div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Assigned • Completed • Overdue
                                  </div>
                                  <div className="space-y-2">
                                    {r.detail.projectBreakdown.map((p, idx) => (
                                      <div key={idx} className="flex items-center justify-between gap-2">
                                        <div className="truncate">{p.project}</div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-foreground">{fmt(p.assigned)}</span>
                                          <span
                                            className="text-[12px] px-1.5 py-0.5 rounded"
                                            style={{ background: "rgba(40,199,111,0.12)", color: TK.status.completed }}
                                          >
                                            {fmt(p.completed)}
                                          </span>
                                          <span
                                            className="text-[12px] px-1.5 py-0.5 rounded"
                                            style={{ background: "rgba(234,84,85,0.12)", color: TK.status.overdue }}
                                          >
                                            {fmt(p.overdue)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Recent tasks */}
                                <div
                                  className="lg:col-span-2 rounded border p-3"
                                  style={{ borderColor: TK.borderLight }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-medium">Recent Tasks</div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => alert(`View all tasks by ${r.name}`)}
                                    >
                                      View all
                                    </Button>
                                  </div>
                                  {r.detail.recentTasks.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">
                                      No recent updates in the selected range.
                                    </div>
                                  ) : (
                                    <ul className="space-y-2">
                                      {r.detail.recentTasks.map((t) => (
                                        <li key={t.id} className="flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="truncate text-sm">{t.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {t.project} • Updated {new Date(t.updatedAt).toLocaleDateString()}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span
                                              className="px-2 py-0.5 rounded text-xs border"
                                              style={{ borderColor: TK.borderLight }}
                                            >
                                              {t.status}
                                            </span>
                                            {t.due && (
                                              <span
                                                className="px-2 py-0.5 rounded text-xs"
                                                style={{ background: "rgba(255,159,67,0.12)", color: TK.status.review }}
                                              >
                                                Due {t.due}
                                              </span>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Bottom pagination */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm text-muted-foreground">
            Showing {sorted.length === 0 ? 0 : pageStart + 1}–{Math.min(sorted.length, pageStart + windowRows.length)}{" "}
            of {sorted.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 px-3 bg-transparent"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              First
            </Button>
            <Button
              variant="outline"
              className="h-8 px-3 bg-transparent"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <div className="text-sm w-16 text-center">
              {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              className="h-8 px-3 bg-transparent"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
            <Button
              variant="outline"
              className="h-8 px-3 bg-transparent"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </Button>
            <Select
              value={String(pageSize)}
              onValueChange={(v: any) => {
                setPageSize(Number(v))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 px-3 w-[120px]">
                <SelectValue placeholder="Rows / page" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </section>
  )
}