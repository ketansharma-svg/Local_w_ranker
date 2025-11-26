"use client"
/* ───────────────────────── Imports & Day.js ───────────────────────── */
import * as React from "react"
import { useSelector } from "react-redux"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import localizedFormat from "dayjs/plugin/localizedFormat"
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Users,
  SearchIcon,
  Download,
  SlidersHorizontal,
  RefreshCw,
  ChevronDown,
  RotateCcw,
  RotateCw,
  XCircle,
  Info,
  FileSpreadsheet,
  FileText,
  BarChart3,
  LayoutDashboard,
  Shield,
  PencilLine,
  Eye,
  Clock,
  Hourglass,
} from "lucide-react"
import { useProfile } from "@/src/redux/providers/ProfileProvider"

/* ───────────────────────── Brand Tokens (aligned to reference) ───────────────────────── */
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
    info: "#1090D0",
    warning: "#FF9F43",
    danger: "#EA5455",
    success: "#28C76F",
    neutral: "#6C757D",
  },
  radius: "12px",
}

/* ───────────────────────── Types (same as original) ───────────────────────── */
type DashboardKey = "seo" | "content" | "reporting" | "taskboard"
type RoleKey = "admin" | "editor" | "viewer"

type Project = { id: string; name: string; is_shared?: boolean }
type Inviter = { user_id: string; name: string; email: string; avatarUrl?: string }

type InviteRow = {
  invite_id: string
  email: string
  invited_by: Inviter
  project_ids: string[]
  projects: Project[]
  dashboards: { dashboard: DashboardKey; enabled: boolean; role: RoleKey }[]
  created_at: string
  last_sent_at?: string
  expires_at?: string
  status: "pending" | "expired" | "canceled"
  resend_cooldown_seconds?: number
  tags?: ("client" | "external_domain")[]
}

type ListParams = {
  query?: string
  role?: RoleKey[]
  project_ids?: string[]
  invited_by_ids?: string[]
  sort?: "sent_on_desc" | "sent_on_asc" | "email_asc" | "invited_by_asc" | "expires_on_asc" | "expires_on_desc"
  cursor?: string
}

type PendingApi = {
  listPending: (params: ListParams) => Promise<{ data: InviteRow[]; total: number; next_cursor?: string }>
  resendInvite: (
    invite_id: string,
  ) => Promise<{ last_sent_at: string; expires_at?: string; resend_cooldown_seconds: number }>
  cancelInvite: (invite_id: string) => Promise<{ status: "canceled" }>
  exportPending?: (params: ListParams, format: "csv" | "xlsx") => Promise<Blob>
}

/* ───────────────────────── Icon Maps (branded) ───────────────────────── */
const DashIcon: Record<DashboardKey, React.FC<React.SVGProps<SVGSVGElement>>> = {
  seo: SearchIcon,
  content: FileText,
  reporting: BarChart3,
  taskboard: LayoutDashboard,
}
const DashColor: Record<DashboardKey, string> = {
  seo: TK.brand,
  content: "#10B981",
  reporting: "#F59E0B",
  taskboard: "#EF4444",
}
const RoleIcon: Record<RoleKey, React.FC<React.SVGProps<SVGSVGElement>>> = {
  admin: Shield,
  editor: PencilLine,
  viewer: Eye,
}
const RoleColor: Record<RoleKey, string> = {
  admin: TK.brand,
  editor: "#10B981",
  viewer: TK.muted,
}

/* ───────────────────────── Small UI Helpers ───────────────────────── */
const HeaderTip: React.FC<{ tip?: string; children: React.ReactNode }> = ({ tip, children }) => (
  <Popover>
    <PopoverTrigger asChild>
      <span className="inline-flex items-center gap-1 cursor-help">
        {children}
        <Info className="h-3.5 w-3.5 text-[#9E9E9E]" />
      </span>
    </PopoverTrigger>
    {tip ? (
      <PopoverContent side="top" align="start" className="max-w-[320px] text-xs">
        {tip}
      </PopoverContent>
    ) : null}
  </Popover>
)

function mmss(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m)}:${String(s).padStart(2, "0")}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

function classNames(...v: Array<string | false | undefined>) {
  return v.filter(Boolean).join(" ")
}

/* Project domain + favicon helpers */
const projectDomain = (name: string) => name.replace(/^https?:\/\//i, "").replace(/\/.*$/g, "")
const faviconUrl = (domain: string, size = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`

/* ───────────────────────── Age / Expiry logic ───────────────────────── */
function computeAge(row: InviteRow) {
  const last = row.last_sent_at || row.created_at
  const days = Math.max(0, Math.floor(dayjs().diff(dayjs(last), "day")))
  const expired = row.status === "expired" || (!!row.expires_at && dayjs(row.expires_at).isBefore(dayjs()))
  if (expired) return { tone: "danger" as const, label: "Expired", days }
  if (days >= 3) return { tone: "warning" as const, label: `Pending ${days}d`, days }
  return { tone: "neutral" as const, label: "", days }
}

/* Column tips for header popovers */
const COL_TIPS: Record<string, string> = {
  email: "Invitee email. Chips show client/external and pending/expired state.",
  invited_by: "Member who sent the invite.",
  projects: "Projects assigned in this invitation (hover to see domain).",
  dashboards: "Dashboards that the invitee will access (subject to plan).",
  roles: "Assigned role per dashboard for this invitation.",
  sent_on: "When it was sent/resend last and the expiry date.",
  actions: "Resend invitation or cancel it.",
}

/* ───────────────────────── Props ───────────────────────── */
export type PendingInvitesSectionProps = {
  api: PendingApi
  projects: Project[]
  inviters?: Inviter[]
  enableSentByFilter?: boolean
  pageSize?: number
  onInviteMoreClick?: () => void
  /** optional: keep role chips in sync with global filters */
  externalRoles?: RoleKey[]
  onExternalRolesChange?: (roles: RoleKey[]) => void
  /** optional: force loader while parent is fetching team slice */
  externalLoading?: boolean
}

/* ───────────────────────── Component (unchanged UI) ───────────────────────── */
export function PendingInvitesSection({
  api,
  projects,
  inviters = [],
  enableSentByFilter = false,
  pageSize: pageSizeProp = 25,
  onInviteMoreClick,
  externalRoles,
  onExternalRolesChange,
  externalLoading,
}: PendingInvitesSectionProps) {
  /* Filters / State */
  const [q, setQ] = React.useState("")
  const [debouncedQ, setDebouncedQ] = React.useState(q)
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const [roleFilter, setRoleFilter] = React.useState<Record<RoleKey, boolean>>({
    admin: true,
    editor: true,
    viewer: true,
  })

React.useEffect(() => {
  // Only take control when parent actually passes a value (undefined = uncontrolled)
  if (externalRoles === undefined) return
  setRoleFilter({
    admin: externalRoles.includes("admin"),
    editor: externalRoles.includes("editor"),
    viewer: externalRoles.includes("viewer"),
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [Array.isArray(externalRoles) ? externalRoles.join("|") : ""])


  const roleValues = React.useMemo<RoleKey[]>(
    () => (Object.keys(roleFilter) as RoleKey[]).filter((r) => roleFilter[r]),
    [roleFilter],
  )

  const [projectIds, setProjectIds] = React.useState<Record<string, boolean>>({})
  const projectValues = React.useMemo(() => Object.keys(projectIds).filter((id) => projectIds[id]), [projectIds])

  const [invitedByIds, setInvitedByIds] = React.useState<Record<string, boolean>>({})
  const invitedByValues = React.useMemo(
    () => Object.keys(invitedByIds).filter((id) => invitedByIds[id]),
    [invitedByIds],
  )

  const [sort, setSort] = React.useState<ListParams["sort"]>("sent_on_desc")

  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<InviteRow[]>([])
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(pageSizeProp)
  const [cooldowns, setCooldowns] = React.useState<Record<string, number>>({})
  const cooldownTimerRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (externalLoading === true) setLoading(true)
    if (externalLoading === false) setLoading(false)
  }, [externalLoading])

  /* Fetch */
  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const resp = await api.listPending({
        query: debouncedQ || undefined,
        role: roleValues.length ? roleValues : undefined,
        project_ids: projectValues.length ? projectValues : undefined,
        invited_by_ids: enableSentByFilter && invitedByValues.length ? invitedByValues : undefined,
        sort,
      })
      const filtered = resp.data.filter((r) => r.status !== "canceled")
      setRows(filtered)
      setPage(1)

      const cd: Record<string, number> = {}
      filtered.forEach((r) => {
        const sec = r.resend_cooldown_seconds ?? 0
        if (sec > 0) cd[r.invite_id] = sec
      })
      setCooldowns(cd)
    } finally {
      setLoading(false)
    }
  }, [api, debouncedQ, roleValues, projectValues, invitedByValues, sort, enableSentByFilter])

  React.useEffect(() => {
    fetchData()
  }, [])

  // 1) Add this state near your other useState calls
const [autoResetTried, setAutoResetTried] = React.useState(false);

// 2) Add this effect below your data/filters effects
React.useEffect(() => {
  // Only attempt once; only when not loading; only if table is empty
  if (autoResetTried) return;
  if (loading) return;

  // If there are no rows on first paint, auto-trigger a reset after 1.2s
  if (Array.isArray(rows) && rows.length === 0) {
    const t = window.setTimeout(() => {
      setAutoResetTried(true);
      // Call the same function your Reset button calls
      resetFilters(); // <- your existing reset logic
    }, 1200);

    return () => window.clearTimeout(t);
  }
}, [autoResetTried, loading, rows, resetFilters]);


  /* Cooldown ticking */
  React.useEffect(() => {
    if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current)
    if (!Object.values(cooldowns).some((v) => v > 0)) return

    cooldownTimerRef.current = window.setInterval(() => {
      setCooldowns((prev) => {
        const next: Record<string, number> = {}
        let any = false
        Object.entries(prev).forEach(([id, sec]) => {
          const ns = Math.max(sec - 1, 0)
          next[id] = ns
          if (ns > 0) any = true
        })
        if (!any && cooldownTimerRef.current) {
          window.clearInterval(cooldownTimerRef.current)
          cooldownTimerRef.current = null
        }
        return next
      })
    }, 1000) as unknown as number

    return () => {
      if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current)
      cooldownTimerRef.current = null
    }
  }, [cooldowns])

  /* Paging window */
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const windowRows = React.useMemo(() => rows.slice(start, start + pageSize), [rows, start, pageSize])

  /* Column defs (sticky header) */
  const COLS = [
    { key: "email", label: "Email Address", min: 350 },
    { key: "invited_by", label: "Invited By", min: 220 },
    { key: "projects", label: "Projects Assigned", min: 260 },
    { key: "dashboards", label: "Dashboards Access", min: 260 },
    { key: "roles", label: "Assigned Roles", min: 280 },
    { key: "sent_on", label: "Sent On", min: 220 },
    { key: "actions", label: "Actions", min: 160 },
  ] as const

  /* Actions */
  async function onExport(format: "csv" | "xlsx") {
    const params: ListParams = {
      query: debouncedQ || undefined,
      role: roleValues.length ? roleValues : undefined,
      project_ids: projectValues.length ? projectValues : undefined,
      invited_by_ids: enableSentByFilter && invitedByValues.length ? invitedByValues : undefined,
      sort,
    }
    if (api.exportPending) {
      const blob = await api.exportPending(params, format)
      downloadBlob(blob, `pending-invitations.${format === "csv" ? "csv" : "xlsx"}`)
      return
    }
    // Fallback CSV from visible rows
    const header = [
      "Email",
      "Invited By",
      "Projects",
      "Dashboards",
      "Roles",
      "Created At",
      "Last Sent At",
      "Expires At",
      "Status",
    ].join(",")
    const lines = rows.map((r) => {
      const projs = r.projects.map((p) => p.name).join("; ")
      const dashes = r.dashboards
        .filter((d) => d.enabled)
        .map((d) => d.dashboard)
        .join("; ")
      const roles = r.dashboards.map((d) => `${d.role} — ${d.dashboard}${d.enabled ? "" : " (pending)"}`).join("; ")
      return `"${r.email}","${r.invited_by.name}","${projs}","${dashes}","${roles}","${r.created_at}","${r.last_sent_at ?? ""}","${r.expires_at ?? ""}","${r.status}"`
    })
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    downloadBlob(blob, "pending-invitations.csv")
  }

  async function handleResend(r: InviteRow) {
    const cd = cooldowns[r.invite_id] ?? r.resend_cooldown_seconds ?? 0
    if (cd > 0) return
    try {
      const resp = await api.resendInvite(r.invite_id)
      setRows((prev) =>
        prev.map((x) =>
          x.invite_id === r.invite_id
            ? {
              ...x,
              last_sent_at: resp.last_sent_at,
              expires_at: resp.expires_at || x.expires_at,
              status: "pending",
              resend_cooldown_seconds: resp.resend_cooldown_seconds,
            }
            : x,
        ),
      )
      setCooldowns((prev) => ({ ...prev, [r.invite_id]: resp.resend_cooldown_seconds }))
    } catch {
      // hook up toast if needed
    }
  }

  async function handleCancel(r: InviteRow) {
    const ok = window.confirm(
      `Cancel this invite?\n\nThis will revoke the invite for ${r.email} and remove any pre‑assigned access mappings.`,
    )
    if (!ok) return
    try {
      await api.cancelInvite(r.invite_id)
      setRows((prev) => prev.filter((x) => x.invite_id !== r.invite_id))
    } catch {
      // hook up toast if needed
    }
  }

function resetFilters() {
  setQ("")
  setDebouncedQ("")           // clear debounce immediately
  setRoleFilter({ admin: true, editor: true, viewer: true }) // all ON
  setProjectIds({})
  setInvitedByIds({})
  setSort("sent_on_desc")
  setPage(1)
  fetchData()                 // fetch right away so the table fills instantly
}



  /* Cells (unchanged rendering) */
  const EmailCell: React.FC<{ r: InviteRow }> = ({ r }) => {
    const age = computeAge(r)
    const onCopy = async () => {
      try {
        await navigator.clipboard.writeText(r.email)
      } catch { }
    }
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={onCopy}
          title="Copy email"
          className="font-medium text-foreground hover:text-[#1090D0] transition-colors truncate"
        >
          {r.email}
        </button>
        <div className="flex items-center gap-1.5">
          {r.tags?.includes("client") && (
            <span
              className="px-2 py-0.5 rounded border text-[11px]"
              style={{ borderColor: TK.borderLight, color: TK.status.info, background: "rgba(16,144,208,0.08)" }}
            >
              Client
            </span>
          )}
          {r.tags?.includes("external_domain") && (
            <span className="px-2 py-0.5 rounded border text-[11px]" style={{ borderColor: TK.borderLight }}>
              External
            </span>
          )}
          {age.label && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] min-w-25"
              style={{
                background: age.tone === "danger" ? "rgba(234,84,85,0.12)" : "rgba(255,159,67,0.12)",
                color: age.tone === "danger" ? TK.status.danger : TK.status.warning,
              }}
            >
              {age.tone === "danger" ? <Hourglass className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {age.label}
            </span>
          )}
        </div>
      </div>
    )
  }


const InvitedByCell: React.FC<{ r: InviteRow }> = ({ r }) => {
  const { profile } = useProfile()
  const { first_name, last_name, email } = profile || {}

  // build display name
  const name = `${first_name ?? ""} ${last_name ?? ""}`.trim() || "—"
  const initials =
    name
      .split(" ")
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "—"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default">
            <div
              className="h-6 w-6 rounded-full grid place-items-center text-[10px] font-semibold text-white"
              style={{ background: TK.brand }}
            >
              {initials}
            </div>
            <span className="truncate max-w-[180px]">{name}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{email || "—"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}


  const ProjectsCell: React.FC<{ r: InviteRow }> = ({ r }) => {
    const max = 2
    const chips = r.projects.slice(0, max)
    const more = r.projects.length - chips.length
    return (
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((p) => {
          const domain = projectDomain(p.name)
          return (
            <TooltipProvider key={p.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="px-2 py-0.5 rounded-full border text-xs bg-white inline-flex items-center gap-1.5"
                    style={{ borderColor: TK.borderLight }}
                  >
                    <img
                      src={faviconUrl(domain, 32) || "/placeholder.svg"}
                      alt=""
                      className="h-3.5 w-3.5 rounded-sm"
                      loading="lazy"
                    />
                    <span>{p.name}</span>
                    {p.is_shared && (
                      <span
                        className="ml-1 text-[11px] px-1 rounded"
                        style={{ background: "rgba(16,144,208,0.08)", color: TK.status.info }}
                      >
                        Shared
                      </span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{domain}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
        {more > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="px-2 py-0.5 rounded-full border text-xs bg-white cursor-default"
                  style={{ borderColor: TK.borderLight }}
                >
                  +{more}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {r.projects.map((p) => (
                  <div key={p.id}>
                    {projectDomain(p.name)}
                    {p.is_shared ? " — Shared" : ""}
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  const DashboardsCell: React.FC<{ r: InviteRow }> = ({ r }) => (
    <div className="flex flex-wrap items-center gap-3">
      {r.dashboards.map((d) => {
        const Ico = DashIcon[d.dashboard]
        const color = DashColor[d.dashboard]
        const label = d.enabled ? `${d.dashboard[0].toUpperCase()}${d.dashboard.slice(1)}` : `${d.dashboard} (disabled)`
        const tip = d.enabled ? `${d.role} — ${label}` : "Not in plan for selected project(s)"
        return (
          <TooltipProvider key={`${r.invite_id}-${d.dashboard}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={classNames("inline-flex items-center gap-1.5 border  px-2 py-0.5 rounded text-xs")}
                  aria-label={label}
                >
                  <Ico className="h-4 w-4" style={{ color }} />
                  <span className="text-sm">{label.replace(" (disabled)", "")}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{tip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </div>
  )

  const RolesCell: React.FC<{ r: InviteRow }> = ({ r }) => {
    const pairs = r.dashboards.map((d) => ({ role: d.role, dash: d.dashboard, enabled: d.enabled }))
    const max = 2
    const visible = pairs.slice(0, 2)
    const more = pairs.length - visible.length
    return (
      <div className="flex flex-wrap items-center gap-2">
        {visible.map((p, i) => {
          const RI = RoleIcon[p.role]
          const DI = DashIcon[p.dash]
          const bg = RoleColor[p.role]
          return (
            <span
              key={`${r.invite_id}-role-${i}`}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs `}
              style={{ background: bg, color: "#fff" }}
              title={!p.enabled ? "Pending (dashboard not active yet)" : undefined}
            >
              <RI className="h-3.5 w-3.5" />
              <span className="capitalize">{p.role}</span>
              <span className="opacity-70">•</span>
              <DI className="h-3.5 w-3.5 opacity-90" />
              <span className="capitalize">{p.dash}</span>
            </span>
          )
        })}
        {more > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="px-2 py-0.5 rounded border text-xs bg-white cursor-default"
                  style={{ borderColor: TK.borderLight }}
                >
                  +{more} more
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {pairs.map((p, idx) => (
                  <div key={idx} className="capitalize">
                    {p.role} — {p.dash}
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  const SentOnCell: React.FC<{ r: InviteRow }> = ({ r }) => {
    const sent = r.last_sent_at || r.created_at
    const rel = r.last_sent_at && r.last_sent_at !== r.created_at ? `Last sent ${dayjs(r.last_sent_at).fromNow()}` : ""
    const expires = r.expires_at
      ? dayjs(r.expires_at).isBefore(dayjs())
        ? `Expired ${dayjs(r.expires_at).format("ll")}`
        : `Expires ${dayjs(r.expires_at).format("ll")}`
      : ""
    return (
      <div className="flex flex-col">
        <span title={dayjs(sent).format("ddd, ll – HH:mm")}>{dayjs(sent).format("ll")}</span>
        {rel && <span className="text-xs text-muted-foreground">{rel}</span>}
        {expires && <span className="text-xs text-muted-foreground">{expires}</span>}
      </div>
    )
  }

  const ActionsCell: React.FC<{ r: InviteRow }> = ({ r }) => {
    const cd = cooldowns[r.invite_id] ?? r.resend_cooldown_seconds ?? 0
    const disabled = cd > 0
    return (
      <div className="flex items-center  gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Resend invite to ${r.email}`}
                onClick={() => handleResend(r)}
                disabled={disabled}
                className={classNames("text-[#4286F5]")}
                title={disabled ? `Try again in ${mmss(cd)}` : "Resend invite"}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              {disabled ? `Try again in ${mmss(cd)}` : "Resend invite"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Cancel invite for ${r.email}`}
                onClick={() => handleCancel(r)}
                className="text-red-500"
                title="Cancel invite"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Cancel invite</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  /* ─────────────── UI ─────────────── */
  const pendingCount = rows.length
  const anyRoleActive = roleValues.length > 0
  const anyProjectActive = projectValues.length > 0
  const anyInvitedByActive = invitedByValues.length > 0

  return (
    <section className="space-y-3" style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}>
      <Card className="border " style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* Header with title info popover */}
        <CardHeader
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: TK.brand }} />
            <HeaderTip tip="Pending invitation requests awaiting acceptance. Use actions to resend or cancel.">
              <CardTitle className="text-lg">Pending Invitations</CardTitle>
            </HeaderTip>
            <span
              className="ml-2 px-2 py-0.5 rounded border text-xs text-muted-foreground"
              style={{ borderColor: TK.borderLight }}
            >
              {pendingCount} pending
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Columns placeholder */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="text-sm text-muted-foreground">Column configuration is fixed for this section.</div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 px-3 inline-flex items-center gap-2 bg-transparent">
                  <Download className="h-4 w-4" /> Export
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-2">
                <button
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-[#F7FAFC] inline-flex items-center gap-2"
                  onClick={() => onExport("csv")}
                >
                  <FileSpreadsheet className="h-4 w-4" /> CSV
                </button>
                <button
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-[#F7FAFC] inline-flex items-center gap-2"
                  onClick={() => onExport("xlsx")}
                >
                  <FileText className="h-4 w-4" /> Excel
                </button>
              </PopoverContent>
            </Popover>

            {/* Refresh */}
            <Button variant="ghost" className="h-8 px-2 text-muted-foreground" title="Refresh" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* CTA */}
            {onInviteMoreClick && (
              <Button className="h-8 px-3 text-white" style={{ background: TK.brand }} onClick={onInviteMoreClick}>
                + Invite Members
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filter bar */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[280px] pl-7"
                placeholder="Search email or inviter…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            {/* Role multi */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={classNames(
                    "h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]",
                    anyRoleActive && "font-semibold",
                  )}
                  title="Filter by role"
                >
                  Roles <ChevronDown className="h-4 w-4 opacity-70" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52">
                <div className="text-sm font-medium mb-2">Filter by role</div>
                {(["admin", "editor", "viewer"] as RoleKey[]).map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm py-1">
                    <Checkbox
                      checked={roleFilter[r]}
                      onCheckedChange={(v) => {
                        setRoleFilter((s) => {
                          const next = { ...s, [r]: Boolean(v) }
                          onExternalRolesChange?.((Object.keys(next) as RoleKey[]).filter((k) => next[k]))
                          return next
                        })
                      }}
                    />
                    <span className="capitalize">{r}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            {/* Project multi */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={classNames(
                    "h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]",
                    anyProjectActive && "font-semibold",
                  )}
                >
                  Projects <ChevronDown className="h-4 w-4 opacity-70" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 max-h-[320px] overflow-auto">
                <div className="text-sm font-medium mb-2">Filter by project</div>
                {projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm py-1">
                    <Checkbox
                      checked={!!projectIds[p.id]}
                      onCheckedChange={(v) => setProjectIds((s) => ({ ...s, [p.id]: Boolean(v) }))}
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            {/* Sent by multi (optional) */}
            {enableSentByFilter && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={classNames(
                      "h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]",
                      anyInvitedByActive && "font-semibold",
                    )}
                  >
                    Sent by <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[320px] max-h-[320px] overflow-auto">
                  <div className="text-sm font-medium mb-2">Filter by inviter</div>
                  {inviters.map((u) => (
                    <label key={u.user_id} className="flex items-center gap-2 text-sm py-1">
                      <Checkbox
                        checked={!!invitedByIds[u.user_id]}
                        onCheckedChange={(v) => setInvitedByIds((s) => ({ ...s, [u.user_id]: Boolean(v) }))}
                      />
                      <span className="truncate">
                        {u.name} — <span className="text-muted-foreground">{u.email}</span>
                      </span>
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
            )}

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Sort</span>
              <Select value={sort ?? "sent_on_desc"} onValueChange={(v: any) => setSort(v)}>
                <SelectTrigger className="h-8 px-3 w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sent_on_desc">Sent On ↓</SelectItem>
                  <SelectItem value="sent_on_asc">Sent On ↑</SelectItem>
                  <SelectItem value="email_asc">Email A–Z</SelectItem>
                  <SelectItem value="invited_by_asc">Invited By A–Z</SelectItem>
                  <SelectItem value="expires_on_asc">Expires On ↑</SelectItem>
                  <SelectItem value="expires_on_desc">Expires On ↓</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset */}
              <Button variant="ghost" className="h-8 px-3" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-20" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
                <TableRow className="hover:bg-white">
                  {COLS.map((c) => (
                    <TableHead key={c.key} style={{ minWidth: c.min }} className="text-left">
                      <HeaderTip tip={COL_TIPS[c.key]}>
                        <span>{c.label}</span>
                      </HeaderTip>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-white">
                      {COLS.map((c) => (
                        <TableCell key={c.key}>
                          <div className="h-4 w-full rounded bg-[#F5F7FA]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!loading && windowRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={COLS.length}>
                      <div className="py-10 text-center">
                        <div className="text-base font-semibold text-foreground mb-1">
                          All team members have accepted their invites.
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">You can invite more members any time.</div>
                        {/* {onInviteMoreClick && (
                          <Button
                            className="h-8 px-3 text-white"
                            style={{ background: TK.brand }}
                            onClick={onInviteMoreClick}
                          >
                            Invite Members
                          </Button>
                        )} */}
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  windowRows.map((r) => (
                    <TableRow key={r.invite_id} className="hover:bg=[rgba(16,144,208,0.03)]">
                      <TableCell>
                        <EmailCell r={r} />
                      </TableCell>
                      <TableCell>
                        <InvitedByCell r={r} />
                      </TableCell>
                      <TableCell>
                        <ProjectsCell r={r} />
                      </TableCell>
                      <TableCell>
                        <DashboardsCell r={r} />
                      </TableCell>
                      <TableCell>
                        <RolesCell r={r} />
                      </TableCell>
                      <TableCell>
                        <SentOnCell r={r} />
                      </TableCell>
                      <TableCell>
                        <ActionsCell r={r} />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Bottom pagination */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm text-muted-foreground">
            Showing {total === 0 ? 0 : start + 1}–{Math.min(total, start + windowRows.length)} of {total}
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
              {page} / {pageCount}
            </div>
            <Button
              variant="outline"
              className="h-8 px-3 bg-transparent"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
            <Button
              variant="outline"
              className="h-8 px-3 bg-transparent"
              disabled={page >= pageCount}
              onClick={() => setPage(pageCount)}
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

/* ───────────────────────── Redux → InviteRow mapping helpers ───────────────────────── */

/** Maps "SEO" | "Content" | "Reporting" to the internal keys; ignore unknowns safely. */
function toDashKey(t?: string): DashboardKey | undefined {
  if (!t) return undefined
  const s = String(t).toLowerCase()
  if (s === "seo") return "seo"
  if (s === "content") return "content"
  if (s === "reporting") return "reporting"
  if (s === "taskboard") return "taskboard"
  return undefined
}

function toRoleKey(t?: string): RoleKey {
  const s = String(t || "").toLowerCase()
  return s === "admin" ? "admin" : s === "editor" ? "editor" : "viewer"
}
const roleScore: Record<RoleKey, number> = { viewer: 0, editor: 1, admin: 2 }

const DEFAULT_INVITER: Inviter = {
  user_id: "mock-0",
  name: "Team Admin (mock)",
  email: "admin@w3era.com",
  avatarUrl: undefined,
}

/** Build InviteRow[] for *pending* invitations from teamSlice members/projects. */
function mapTeamSliceToPendingRows(teamSlice: any): InviteRow[] {
  const out: InviteRow[] = []
  const members: any[] = Array.isArray(teamSlice?.members) ? teamSlice.members : []

  for (const m of members) {
    const pendingProjects = Array.isArray(m?.projects)
      ? m.projects.filter((p: any) => String(p?.invitation_status || "").toLowerCase() === "pending")
      : []

    if (pendingProjects.length === 0) continue

    // Aggregate projects for the invite row (group per member)
    const projectObjs: Project[] = pendingProjects.map((p: any) => ({
      id: String(p?.project_id ?? ""),
      name: String(p?.project_name || p?.project_domain || p?.project_id || "").trim() || `#${p?.project_id}`,
    }))

    // Merge dashboards across pending projects: enabled if any active; role = highest privilege encountered
    const dashAgg: Record<DashboardKey, { enabled: boolean; role: RoleKey }> = {
      seo: { enabled: false, role: "viewer" },
      content: { enabled: false, role: "viewer" },
      reporting: { enabled: false, role: "viewer" },
      taskboard: { enabled: false, role: "viewer" },
    }
    for (const p of pendingProjects) {
      const dashes: any[] = Array.isArray(p?.dashboards) ? p.dashboards : []
      for (const d of dashes) {
        const k = toDashKey(d?.type)
        if (!k) continue
        const role = toRoleKey(d?.access)
        const enabled = Boolean(d?.active)
        if (!dashAgg[k]) {
          dashAgg[k] = { enabled, role }
        } else {
          dashAgg[k].enabled = dashAgg[k].enabled || enabled
          if (roleScore[role] > roleScore[dashAgg[k].role]) dashAgg[k].role = role
        }
      }
    }
    const dashboards: InviteRow["dashboards"] = Object.entries(dashAgg).map(([dashboard, v]) => ({
      dashboard: dashboard as DashboardKey,
      enabled: v.enabled,
      role: v.role,
    }))

    // Dates (created_at from earliest invitation_date)
    const createdAt = pendingProjects
      .map((p: any) => (p?.invitation_date ? new Date(p.invitation_date) : undefined))
      .filter(Boolean) as Date[]
    const created_at = (
      createdAt.length > 0 ? new Date(Math.min(...createdAt.map((d) => d.getTime()))) : new Date()
    ).toISOString()

    const inviteRow: InviteRow = {
      invite_id: `member-${m?.member_id}`,
      email: String(m?.member_email || "").trim() || "(unknown)",
      invited_by: DEFAULT_INVITER, // MOCK: inviter not provided by Redux
      project_ids: projectObjs.map((p) => p.id),
      projects: projectObjs,
      dashboards,
      created_at,
      status: "pending",
      resend_cooldown_seconds: Number((teamSlice?.resendCooldowns || {})[m?.member_email]) || 0, // often 0
    }
    out.push(inviteRow)
  }

  return out
}

/** Build unique Project[] (for the Projects filter chip) from the current pending rows. */
function buildFilterProjects(rows: InviteRow[]): Project[] {
  const map = new Map<string, Project>()
  rows.forEach((r) => r.projects.forEach((p) => map.set(p.id, p)))
  return Array.from(map.values())
}

/* ───────────────────────── Filter/sort used by API (parity with original mock) ───────────────────────── */
function applyFilters(list: InviteRow[], params: ListParams) {
  let out = [...list]
  if (params.query) {
    const s = params.query.toLowerCase()
    out = out.filter(
      (r) =>
        r.email.toLowerCase().includes(s) ||
        r.invited_by.name.toLowerCase().includes(s) ||
        r.invited_by.email.toLowerCase().includes(s),
    )
  }
  if (params.role?.length) {
    out = out.filter((r) => r.dashboards.some((d) => params.role!.includes(d.role)))
  }
  if (params.project_ids?.length) {
    out = out.filter((r) => r.projects.some((p) => params.project_ids!.includes(p.id)))
  }
  if (params.invited_by_ids?.length) {
    out = out.filter((r) => params.invited_by_ids!.includes(r.invited_by.user_id))
  }
  switch (params.sort) {
    case "sent_on_asc":
      out.sort(
        (a, b) =>
          new Date(a.last_sent_at || a.created_at).getTime() - new Date(b.last_sent_at || b.created_at).getTime(),
      )
      break
    case "sent_on_desc":
    default:
      out.sort(
        (a, b) =>
          new Date(b.last_sent_at || b.created_at).getTime() - new Date(a.last_sent_at || a.created_at).getTime(),
      )
      break
    case "email_asc":
      out.sort((a, b) => a.email.localeCompare(b.email))
      break
    case "invited_by_asc":
      out.sort((a, b) => a.invited_by.name.localeCompare(b.invited_by.name))
      break
    case "expires_on_asc":
      out.sort(
        (a, b) => new Date(a.expires_at || "2100-01-01").getTime() - new Date(b.expires_at || "2100-01-01").getTime(),
      )
      break
    case "expires_on_desc":
      out.sort(
        (a, b) => new Date(b.expires_at || "1900-01-01").getTime() - new Date(a.expires_at || "1900-01-01").getTime(),
      )
      break
  }
  return out.filter((r) => r.status !== "canceled")
}

/* ───────────────────────── Redux‑backed PendingApi (stable identity) ───────────────────────── */
function useReduxBackedPendingApi(rowsFromRedux: InviteRow[]): PendingApi {
  // Keep a local store that mirrors Redux rows so Actions (Resend/Cancel) feel immediate.
  const storeRef = React.useRef<InviteRow[]>(rowsFromRedux)

  // The original code had `teamSlice?.resendCooldowns` as a dependency to `useMemo` which can lead to
  // unnecessary re-renders and potential stale closures. By removing this specific dependency and relying
  // on the `rowsFromRedux` which is already derived from `teamSlice`, we ensure that the API is recreated
  // only when the actual rows change.
  const syncedRows = React.useMemo(() => {
    const byId = new Map(storeRef.current.map((r) => [r.invite_id, r]))
    const next = rowsFromRedux.map((r) => {
      const prev = byId.get(r.invite_id)
      return prev
        ? {
          ...r,
          last_sent_at: prev.last_sent_at ?? r.last_sent_at,
          resend_cooldown_seconds: prev.resend_cooldown_seconds ?? r.resend_cooldown_seconds,
        }
        : r
    })
    storeRef.current = next
    return next
  }, [rowsFromRedux])

  const listPending = React.useCallback(async (params: ListParams) => {
    const filtered = applyFilters(storeRef.current, params || {})
    return { data: filtered, total: filtered.length }
  }, [])

  const resendInvite = React.useCallback(async (invite_id: string) => {
    // Demo behaviour: update local store only (no reducer change)
    const idx = storeRef.current.findIndex((s) => s.invite_id === invite_id)
    if (idx >= 0) {
      const last_sent_at = new Date().toISOString()
      const expires_at = undefined as string | undefined // MOCK: no expiry from Redux
      storeRef.current[idx] = {
        ...storeRef.current[idx],
        last_sent_at,
        expires_at,
        status: "pending",
        resend_cooldown_seconds: 120,
      }
      return { last_sent_at, expires_at, resend_cooldown_seconds: 120 }
    }
    throw new Error("Not found")
  }, [])

  const cancelInvite = React.useCallback(async (invite_id: string) => {
    storeRef.current = storeRef.current.filter((s) => s.invite_id !== invite_id)
    return { status: "canceled" as const }
  }, [])

  const exportPending = React.useCallback(async (params: ListParams, format: "csv" | "xlsx") => {
    const filtered = applyFilters(storeRef.current, params || {})
    const header = [
      "Email",
      "Invited By",
      "Projects",
      "Dashboards",
      "Roles",
      "Created At",
      "Last Sent At",
      "Expires At",
      "Status",
    ].join(",")
    const lines = filtered.map((r) => {
      const projs = r.projects.map((p) => p.name).join("; ")
      const dashes = r.dashboards
        .filter((d) => d.enabled)
        .map((d) => d.dashboard)
        .join("; ")
      const roles = r.dashboards
        .filter((d) => d.enabled)
        .map((d) => `${d.role} — ${d.dashboard}`)
        .join("; ")
      return `"${r.email}","${r.invited_by.name}","${projs}","${dashes}","${roles}","${r.created_at}","${r.last_sent_at ?? ""}","${r.expires_at ?? ""}","${r.status}"`
    })
    const csv = header + "\n" + lines.join("\n")
    return new Blob([csv], { type: "text/csv;charset=utf-8;" })
  }, [])

  // Stable object identity
  return React.useMemo<PendingApi>(
    () => ({
      listPending,
      resendInvite,
      cancelInvite,
      exportPending,
    }),
    [listPending, resendInvite, cancelInvite, exportPending],
  )
}

/* ───────────────────────── Demo Wrapper (Redux‑integrated) ─────────────────────────
   - UI unchanged
   - Rows & filters come from s.team (Redux)
   - Minimal mock only for data Redux does not provide (inviter/expiry) */
type RoleUpper = "Admin" | "Editor" | "Viewer"
type StatusUpper = "Active" | "Invited" | "Suspended" | "Deactivated"
type GlobalFilters = { members?: string[]; roles?: RoleUpper[]; statuses?: StatusUpper[] }

export default function PendingInvitesSectionDemo({ filters, onFiltersChange, loading }) {
  const teamSlice: any = useSelector((s: any) => s.team)

  // Build rows from Redux (only projects with invitation_status === "Pending")
  const rowsFromRedux = React.useMemo(() => {
    const base = mapTeamSliceToPendingRows(teamSlice)
    let xs = [...base]
    // member ids filter (invite_id is "member-<id>")
    if (filters?.members?.length) {
      const ids = new Set(filters.members.map(String))
      xs = xs.filter((r) => ids.has(r.invite_id.replace(/^member-/, "")))
    }
    // roles filter
    if (filters?.roles?.length) {
      const want = new Set(filters.roles.map((r) => r.toLowerCase() as RoleKey))
      xs = xs.filter((r) => r.dashboards.some((d) => want.has(d.role)))
    }
    // statuses filter: show only when Invited is selected (otherwise hide list)
// Show pending invites by default. Only hide when statuses is provided AND Invited is not selected.
if (Array.isArray(filters?.statuses) && filters.statuses.length > 0 && !filters.statuses.includes("Invited")) {
  xs = []
}
    return xs
  }, [teamSlice?.members, filters?.members, filters?.roles, filters?.statuses]) // Removed teamSlice?.resendCooldowns from dependency array

  // Projects for the filter chip (from current pending rows)
  const projectsForFilter = React.useMemo(() => buildFilterProjects(rowsFromRedux), [rowsFromRedux])

  // Inviter list is not present in Redux sample; keep a minimal mock so the "Sent by" filter remains functional.
  const invitersSeed: Inviter[] = React.useMemo(
    () => [
      {
        user_id: DEFAULT_INVITER.user_id,
        name: DEFAULT_INVITER.name,
        email: DEFAULT_INVITER.email,
        avatarUrl: DEFAULT_INVITER.avatarUrl,
      },
    ],
    [], // This dependency array is intentionally empty.
  )

  // Stable API bound to the Redux‑derived rows
  const api = useReduxBackedPendingApi(rowsFromRedux)

  return (
    <div className="w-full mx-auto my-4">
      <PendingInvitesSection
        api={api}
        projects={projectsForFilter}
        inviters={invitersSeed}
        enableSentByFilter
        onInviteMoreClick={() => alert("Open Invite Member modal")}
        externalRoles={(filters?.roles ?? []).map((r) => r.toLowerCase() as RoleKey)}
        externalLoading={loading}
        onExternalRolesChange={(rs) => {
          const up: RoleUpper[] = rs.map((r) => (r === "admin" ? "Admin" : r === "editor" ? "Editor" : "Viewer"))
          onFiltersChange?.({ ...(filters || {}), roles: up.length === 0 ? [] : up })
        }}
      />
    </div>
  )
}