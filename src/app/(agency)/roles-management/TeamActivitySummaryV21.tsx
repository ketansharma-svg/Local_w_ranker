"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, PieChart, Pie, Cell } from "recharts"
import { MoreHorizontal, Info as InfoIcon, RefreshCw } from "lucide-react"

/* ========================================================================================
 * TOKENS — unchanged
 * ====================================================================================== */
const TOKENS = {
  surface: "#FFFFFF",
  subtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",

  text: "#111827",
  muted: "#6B7280",
  mutedDark: "#282829",

  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",

  success: "#28C76F",
  warn: "#FF9F43",
  danger: "#EA5455",
  neutral: "#6C757D",
} as const

/* ========================================================================================
 * TYPES (as used by the existing UI)
 * ====================================================================================== */
type RoleKey = "owner" | "admin" | "editor" | "viewer" | "other"
type ProjectStatus = "active" | "paused"

type Member = {
  id: string
  name: string
  role: RoleKey
  roleAssignedAt?: string // ISO or undefined → render as —
  memberSince?: string // ISO or undefined → render as —
  dashboards: 1 | 2 | 3 | 4
  active: boolean
  inactiveSinceDays?: number
  projects: Array<{ id: string; name: string; status: ProjectStatus; assignedAt?: string }>
}

type Invite = {
  id: string
  name: string
  role: RoleKey
  projectsCount: number
  sinceDays: number
  sentAt: string // ISO
}

type Project = {
  id: string
  name: string
  color: string
  status: ProjectStatus
  membersCount: number
}

type RoleUpper = "Admin" | "Editor" | "Viewer"
type StatusUpper = "Active" | "Invited" | "Suspended" | "Deactivated"
type GlobalFilters = { members?: string[]; roles?: RoleUpper[]; statuses?: StatusUpper[] }

const accessRankUC: Record<string, number> = { Admin: 3, Editor: 2, Viewer: 1 }
type TeamMember = {
  member_id: string | number
  member_email?: string
  member_name?: string
  projects?: Array<{
    project_id: string | number
    project_name?: string | null
    project_domain?: string | null
    team_id?: string | number
    dashboards?: Array<{
      id?: number | null
      type?: string
      access?: "Admin" | "Editor" | "Viewer"
      active?: boolean
    }>
    invitation_status?: "Accepted" | "Pending" | "Declined"
    invitation_date?: string
    accepted_date?: string | null
  }>
}

function memberMatchesFilters(m: TeamMember, f?: GlobalFilters) {
  if (!f) return true
  // member id filter
  if (Array.isArray(f.members) && f.members.length && !f.members.includes(String(m.member_id))) return false
  // role filter (max access across dashboards)
  let max = 0
  ;(m.projects ?? []).forEach((p) =>
    (p.dashboards ?? []).forEach((d) => {
      const r = accessRankUC[String(d?.access || "")] ?? 0
      max = Math.max(max, r)
    }),
  )
  const upper: RoleUpper = max >= 3 ? "Admin" : max === 2 ? "Editor" : "Viewer"
  if (Array.isArray(f.roles) && f.roles.length && !f.roles.includes(upper)) return false
  // status filter
  if (Array.isArray(f.statuses) && f.statuses.length) {
    const hasPending = (m.projects ?? []).some((p) => String(p?.invitation_status || "").toLowerCase() === "pending")
    const isActive = (m.projects ?? []).some(
      (p) =>
        String(p?.invitation_status || "").toLowerCase() === "accepted" && (p.dashboards ?? []).some((d) => d?.active),
    )
    const ok =
      (f.statuses.includes("Active") && isActive) ||
      (f.statuses.includes("Invited") && hasPending) ||
      (f.statuses.includes("Suspended") && false) ||
      (f.statuses.includes("Deactivated") && false)
    if (!ok) return false
  }
  return true
}

type SeriesPoint<TExtra> = { t: string; v: number } & TExtra

/* ========================================================================================
 * HELPERS (unchanged)
 * ====================================================================================== */
const nf = new Intl.NumberFormat()
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const fmtInt = (n?: number | null) => (n == null || Number.isNaN(n) ? "—" : nf.format(n))
const toDateLabel = (d: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : "—"

function hexToRgb(hex: string) {
  const n = hex.replace("#", "")
  const bigint = Number.parseInt(
    n.length === 3
      ? n
          .split("")
          .map((c) => c + c)
          .join("")
      : n,
    16,
  )
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}
function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const h = x.toString(16)
        return h.length === 1 ? "0" + h : h
      })
      .join("")
  )
}
function mixWithWhite(hex: string, weight01: number) {
  const { r, g, b } = hexToRgb(hex)
  const W = 255
  const w = clamp01(weight01)
  return rgbToHex(Math.round(r * (1 - w) + W * w), Math.round(g * (1 - w) + W * w), Math.round(b * (1 - w) + W * w))
}
function hashColor(key: string, base = TOKENS.valueBlue) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const idx = (h % 10) / 10
  return mixWithWhite(base, 0.15 + idx * 0.7)
}
const roleLabel: Record<RoleKey, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
  other: "Other",
}

/* ========================================================================================
 * LAYER CONTEXT (unchanged)
 * ====================================================================================== */
import { useContext, createContext } from "react"
const CardLayerCtx = createContext<{ setRaised: (v: boolean) => void } | null>(null)
const useCardLayer = () => useContext(CardLayerCtx)

/* ========================================================================================
 * SMALL UI atoms (unchanged)
 * ====================================================================================== */
function InitialsAvatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("")
  return (
    <div
      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ background: color }}
      aria-hidden
    >
      {initials || "•"}
    </div>
  )
}
function ProjectIcon({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex h-4 w-4 items-center justify-center rounded-[4px]" style={{ background: color }} aria-hidden>
      <span className="text-[8px] font-semibold text-white">{name[0]?.toUpperCase()}</span>
    </div>
  )
}
function KebabMenu() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((s) => !s)
        }}
        className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[80] mt-1 w-44 rounded-md border bg-white py-1 text-sm shadow"
          style={{ borderColor: TOKENS.border }}
          onMouseLeave={() => setOpen(false)}
        >
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50">Pin card</button>
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50">Download CSV</button>
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50">Download PNG</button>
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50">Edit threshold</button>
          <button className="block w-full px-3 py-2 text-left hover:bg-gray-50">Show as % / absolute</button>
        </div>
      )}
    </div>
  )
}
function TitleWithHoverInfo({ title, info }: { title: string; info?: string }) {
  return (
    <div className="relative flex min-w-0 items-center gap-2 group/title">
      <div className="truncate text-[13px] font-semibold" style={{ color: TOKENS.mutedDark }}>
        {title}
      </div>
      {info ? <InfoIcon size={15} className="text-[#9CA3AF]" /> : null}
      {info ? (
        <div
          role="tooltip"
          className="invisible group-hover/title:visible absolute left-0 top-5 z-[80] w-[280px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        >
          {info}
        </div>
      ) : null}
    </div>
  )
}
function CardShell({
  title,
  info,
  headerRight,
  ariaLabel,
  children,
  onClick,
}: {
  title: string
  info?: string
  headerRight?: React.ReactNode
  ariaLabel: string
  children: React.ReactNode
  onClick?: () => void
}) {
  const [raised, setRaised] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col rounded-[16px] border p-4 text-left shadow-sm transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0077FF]/40"
      style={{ background: TOKENS.surface, borderColor: TOKENS.border, zIndex: raised ? 60 : undefined }}
      aria-label={ariaLabel}
    >
      <CardLayerCtx.Provider value={{ setRaised }}>
        <div className="flex items-center justify-between">
          <TitleWithHoverInfo title={title} info={info} />
          <div className="flex items-center gap-2">
            {headerRight}
            <KebabMenu />
          </div>
        </div>
        <div className="mt-2">{children}</div>
      </CardLayerCtx.Provider>
    </button>
  )
}
function PopoverCard({ title, children }: { title?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{
        borderColor: TOKENS.border,
        color: TOKENS.text,
        pointerEvents: "none",
        width: "max-content",
        maxWidth: "92vw",
      }}
    >
      {title ? (
        <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>
          {title}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}
function DonutSplit({
  parts,
  aria,
  size = 64,
  tooltip,
}: {
  parts: { name: string; value: number; color: string }[]
  aria: string
  size?: number
  tooltip?: React.ReactElement
}) {
  const data = parts.map((p) => ({ ...p, v: clamp01(p.value) }))
  const layer = useCardLayer()
  return (
    <div
      className="h-[64px] w-[64px] shrink-0"
      role="img"
      aria-label={aria}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={
              tooltip ?? (
                <PopoverCard>
                  {data.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-6">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: d.color }} />
                        <span style={{ color: TOKENS.muted }}>{d.name}</span>
                      </span>
                      <span className="font-semibold">{(d.v * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </PopoverCard>
              )
            }
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
            wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
          />
          <Pie
            data={data}
            dataKey="v"
            innerRadius={size / 2 - 12}
            outerRadius={size / 2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
type MiniBarItem = { x: string; y: number }
function MiniBars({
  data,
  aria,
  color = TOKENS.valueBlue,
  labelFormatter,
  tooltipRows,
}: {
  data: MiniBarItem[]
  aria: string
  color?: string
  labelFormatter?: (x: string) => string
  tooltipRows: (x: string, y: number) => React.ReactNode
}) {
  const layer = useCardLayer()
  return (
    <div
      className="h-16 w-[11rem]"
      role="img"
      aria-label={aria}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="x" hide />
          <YAxis hide />
          <RTooltip
            content={({ active, label, payload }: any) =>
              active ? (
                <PopoverCard title={labelFormatter ? labelFormatter(label) : String(label)}>
                  {tooltipRows(label, payload?.[0]?.value ?? 0)}
                </PopoverCard>
              ) : null
            }
            allowEscapeViewBox={{ x: true, y: true }}
            offset={8}
            wrapperStyle={{ zIndex: 9999, pointerEvents: "none" }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="y" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ========================================================================================
 * DATA ADAPTER — from team reducer → UI contract
 * ====================================================================================== */
type TeamSlice = {
  members?: Array<{
    member_id: number | string
    member_email?: string
    member_name?: string
    projects?: Array<{
      project_id: number | string
      project_name?: string | null
      project_domain?: string | null
      team_id?: number | string
      dashboards?: Array<{
        id?: number | null
        type?: string // SEO / Content / Reporting
        access?: "Admin" | "Editor" | "Viewer"
        active?: boolean
      }>
      invitation_status?: "Accepted" | "Pending" | "Declined"
      invitation_date?: string // ISO
      accepted_date?: string | null
    }>
  }>
}

const rankOf = (access?: string) => (access === "Admin" ? 3 : access === "Editor" ? 2 : access === "Viewer" ? 1 : 0)
const roleFromMaxAccess = (maxRank: number): RoleKey =>
  maxRank >= 3 ? "admin" : maxRank === 2 ? "editor" : maxRank === 1 ? "viewer" : "other"

function projectsColor(name: string) {
  switch (name) {
    case "Website":
      return "#6E44FF"
    case "Docs":
      return "#00B8D9"
    case "Growth":
      return "#FF7849"
    case "SEO":
      return "#34D399"
    case "Ads":
      return "#F59E0B"
    case "Content":
      return "#8B5CF6"
    default:
      return hashColor(name)
  }
}

function buildFromTeamSlice(raw: TeamSlice | undefined) {
  const inputMembers = raw?.members ?? []

  // Aggregate projects
  type AggProject = {
    id: string
    name: string
    domain: string | null
    members: Set<string>
    acceptedMembers: Set<string>
    hasActiveDash: boolean
    pendingInvites: number
  }
  const projectsAgg = new Map<string, AggProject>()
  const invites: Invite[] = []

  const members: Member[] = inputMembers.map((m, idx) => {
    const mid = String(m.member_id ?? idx)
    const mname = m.member_name || m.member_email || `Member ${idx + 1}`

    let maxAccessRank = 0
    let activeDashCount = 0

    const memberProjects: any = (m.projects ?? []).map((p) => {
      const pid = String(p.project_id ?? "")
      const pname = p.project_name ?? p.project_domain ?? "Project"
      const accepted = p.invitation_status === "Accepted"
      const dashboards = p.dashboards ?? []

      // max access rank
      dashboards.forEach((d) => {
        maxAccessRank = Math.max(maxAccessRank, rankOf(d?.access))
      })

      // count active dashboards for accepted memberships
      if (accepted) activeDashCount += dashboards.filter((d) => d?.active).length

      // aggregate project
      if (!projectsAgg.has(pid)) {
        projectsAgg.set(pid, {
          id: pid,
          name: pname,
          domain: p.project_domain ?? null,
          members: new Set<string>(),
          acceptedMembers: new Set<string>(),
          hasActiveDash: false,
          pendingInvites: 0,
        })
      }
      const agg = projectsAgg.get(pid)!
      agg.members.add(mid)
      if (accepted) {
        agg.acceptedMembers.add(mid)
        if (dashboards.some((d) => d?.active)) agg.hasActiveDash = true
      }

      // pending invites
      if (p.invitation_status === "Pending") {
        agg.pendingInvites += 1
        const sentAt = p.invitation_date ?? new Date().toISOString().slice(0, 10)
        const sinceDays = Math.max(0, Math.floor((Date.now() - new Date(sentAt).getTime()) / 86400000))
        invites.push({
          id: `${pid}:${mid}`,
          name: mname,
          role: roleFromMaxAccess(Math.max(1, ...dashboards.map((d) => rankOf(d?.access)))),
          projectsCount: 1,
          sinceDays,
          sentAt,
        })
      }

      return {
        id: pid,
        name: pname,
        status: accepted ? "active" : "paused",
        assignedAt: p.accepted_date ?? p.invitation_date,
      }
    })

    // dashboards bucket 1..4 (if 0 → 1 to avoid empty bucket)
    const dashboardsBucket = ((): 1 | 2 | 3 | 4 => {
      const n = Math.max(1, Math.min(4, activeDashCount))
      return n as 1 | 2 | 3 | 4
    })()

    const role = roleFromMaxAccess(maxAccessRank)
    const active = memberProjects.some((p) => p.status === "active") && activeDashCount > 0

    const member: Member = {
      id: mid,
      name: mname,
      role,
      roleAssignedAt: undefined, // not available → show —
      memberSince: undefined, // not available → show —
      dashboards: dashboardsBucket,
      active,
      projects: memberProjects,
    }
    return member
  })

  const projects: Project[] = Array.from(projectsAgg.values()).map((p) => ({
    id: p.id,
    name: p.name,
    color: projectsColor(p.name ?? p.id),
    status: p.hasActiveDash ? "active" : "paused",
    membersCount: p.members.size, // active + pending (matches card copy)
  }))

  // Counts
  const counts = {
    total_active_members: members.filter((m) => m.active).length,
    pending_invites: invites.length,
    expired_invites: invites.filter((i) => i.sinceDays >= 14).length,
    members_with_admin_role: members.filter((m) => m.role === "admin").length,
    owner_count: undefined as unknown as number, // no Owner in slice
    active_projects_assigned: projects.filter((p) => p.status === "active").length,
    multi_dashboard_users: members.filter((m) => m.dashboards >= 2).length,
    inactive_users_30d: undefined as unknown as number, // no inactivity signals
    total_projects_in_scope: projects.length,
  }

  // RoleCounts
  const roleCounts = (["owner", "admin", "editor", "viewer", "other"] as RoleKey[]).map((rk) => ({
    key: rk,
    label: roleLabel[rk],
    count: members.filter((m) => m.role === rk).length,
  }))

  // Dashboards buckets
  const dashboardsBuckets = {
    d1: members.filter((m) => m.dashboards === 1),
    d2: members.filter((m) => m.dashboards === 2),
    d3: members.filter((m) => m.dashboards === 3),
    d4: members.filter((m) => m.dashboards === 4),
  }

  // Admin members; inactive members cannot be derived → empty
  const adminMembers = members.filter((m) => m.role === "admin")
  const inactiveMembers: Member[] = []

  // Pending-by-date time series (from invitation_date)
  const pendingDateMap = new Map<string, Invite[]>()
  invites.forEach((inv) => {
    const key = (inv.sentAt ?? "").slice(0, 10)
    const k = key || new Date().toISOString().slice(0, 10)
    if (!pendingDateMap.has(k)) pendingDateMap.set(k, [])
    pendingDateMap.get(k)!.push(inv)
  })
  const pendingByDate: SeriesPoint<{ members: Invite[] }>[] = Array.from(pendingDateMap.keys())
    .sort()
    .map((d) => ({ t: d, v: pendingDateMap.get(d)!.length, members: pendingDateMap.get(d)! }))

  // Active projects members-by-date (from accepted_date or invitation_date)
  const apDateMap = new Map<string, { id: string; name: string; color: string; members: number }[]>()
  raw?.members?.forEach((m) => {
    ;(m.projects ?? []).forEach((p) => {
      const date = (p.accepted_date ?? p.invitation_date) || new Date().toISOString().slice(0, 10)
      const pid = String(p.project_id ?? "")
      const pname = p.project_name ?? p.project_domain ?? "Project"
      const color = projectsColor(pname)
      if (!apDateMap.has(date)) apDateMap.set(date, [])
      const arr = apDateMap.get(date)!
      const idx = arr.findIndex((x) => x.id === pid)
      if (idx === -1) arr.push({ id: pid, name: pname, color, members: 1 })
      else arr[idx].members += 1
    })
  })
  const activeProjectsMembersByDate: SeriesPoint<{
    projects: Array<{ id: string; name: string; color: string; members: number }>
  }>[] = Array.from(apDateMap.keys())
    .sort()
    .map((d) => {
      const list = apDateMap.get(d)!
      const total = list.reduce((s, x) => s + x.members, 0)
      return { t: d, v: total, projects: list }
    })

  const adapted = {
    counts,
    // no previous window → all deltas render as —
    prev: {} as any,
    members,
    invites,
    projects,
    roleCounts,
    dashboardsBuckets,
    adminMembers,
    inactiveMembers,
    pendingByDate,
    activeProjectsMembersByDate,
  }

  return adapted
}

/* ========================================================================================
 * MAIN — now reads from Redux (or optional prop)
 * ====================================================================================== */
export default function TeamActivitySummaryV21({
  team,
  filters,
  loading,
  refreshKey,
}: { team?: TeamSlice; filters?: GlobalFilters; loading?: boolean; refreshKey?: number }) {
  const teamSlice = useSelector((s: any) => s.team) as TeamSlice | undefined
  const [seed, setSeed] = useState(1)

  const filteredTeam = useMemo(() => {
    const src = (team ?? teamSlice) as TeamSlice | undefined
    if (!src) return undefined
    const members = Array.isArray(src.members) ? src.members.filter((m) => memberMatchesFilters(m, filters)) : []
    return { ...(src as any), members } as TeamSlice
  }, [team, teamSlice, filters, refreshKey, seed])

  const data = useMemo(() => buildFromTeamSlice(filteredTeam), [filteredTeam])

  // deltas (no prev → all undefined → UI shows —)
  const pct = (cur?: number, prev?: number) =>
    typeof cur === "number" && typeof prev === "number" && prev !== 0
      ? ((cur - prev) / Math.abs(prev)) * 100
      : undefined

  const deltas = {
    total: undefined as number | undefined,
    pending: undefined as number | undefined,
    admins: undefined as number | undefined,
    projects: undefined as number | undefined,
    multi: undefined as number | undefined,
    inactive: undefined as number | undefined,
  }

  const aria = {
    total: `Total team members, ${fmtInt(data.counts.total_active_members)}; opens Members filtered to Active.`,
    pending: `Pending invitations, ${fmtInt(data.counts.pending_invites)}; opens Pending Invitations.`,
    admins: `Admins assigned, ${fmtInt(data.counts.members_with_admin_role)}; opens Members filtered to Admin.`,
    projects: `Active projects assigned, ${fmtInt(data.counts.active_projects_assigned)}; opens Members with Project filter.`,
    multi: `Multi-dashboard users, ${fmtInt(data.counts.multi_dashboard_users)}; opens Members with dashboards ≥ 2.`,
    inactive: `Inactive users (30+ days), ${fmtInt(data.counts.inactive_users_30d)}; opens Members filtered to Inactive.`,
  }

  /* ---------- CARD 1: Total Team Members ---------- */
  const roleDonutParts = data.roleCounts
    .filter((rc) => rc.count > 0)
    .map((rc) => ({
      name: rc.label,
      value: rc.count / Math.max(1, data.counts.total_active_members ?? 1),
      color: hashColor(rc.label),
    }))

  const roleBars: MiniBarItem[] = data.roleCounts.filter((x) => x.count > 0).map((x) => ({ x: x.label, y: x.count }))

  function RoleBarsTooltip(label: string) {
    const roleKey = (Object.keys(roleLabel) as RoleKey[]).find((rk) => roleLabel[rk] === label) as RoleKey | undefined
    const persons = data.members.filter((m) => m.role === roleKey)
    return persons.length ? (
      <>
        {persons.slice(0, 8).map((m) => (
          <div key={m.id} className="flex items-center gap-3 whitespace-nowrap">
            <InitialsAvatar name={m.name} color={hashColor(m.name)} />
            <div className="min-w-0">
              <div className="truncate font-medium">{m.name}</div>
              <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                Assigned {m.roleAssignedAt ? toDateLabel(m.roleAssignedAt) : "—"} · {m.active ? "Active" : "Inactive"} ·{" "}
                {m.projects.length} projects
              </div>
            </div>
          </div>
        ))}
        {persons.length > 8 ? (
          <div className="mt-1 text-[11px]" style={{ color: TOKENS.muted }}>
            +{persons.length - 8} more
          </div>
        ) : null}
      </>
    ) : (
      <div style={{ color: TOKENS.muted }}>No members</div>
    )
  }

  /* ---------- CARD 2: Pending Invitations ---------- */
  const pendingDonutParts = data.invites.map((inv) => ({
    name: inv.name,
    value: 1 / Math.max(1, data.invites.length),
    color: hashColor(inv.name, TOKENS.valueBlue),
  }))
  const PendingDonutTooltip = (
    <PopoverCard title="Pending invitations">
      {data.invites.slice(0, 12).map((inv) => (
        <div key={inv.id} className="flex items-center justify-between gap-4 whitespace-nowrap">
          <div className="flex min-w-0 items-center gap-2">
            <InitialsAvatar name={inv.name} color={hashColor(inv.name)} />
            <span className="truncate" style={{ color: TOKENS.muted, maxWidth: "44ch" }}>
              {inv.name}
            </span>
          </div>
          <div className="text-right">
            <div className="font-semibold">{roleLabel[inv.role]}</div>
            <div className="text-[11px]" style={{ color: TOKENS.muted }}>
              {inv.projectsCount} projects · {inv.sinceDays}d pending
            </div>
          </div>
        </div>
      ))}
    </PopoverCard>
  )

  const pendingBars: MiniBarItem[] = data.pendingByDate.map((d) => ({ x: d.t, y: d.v }))
  function PendingBarsTooltip(label: string) {
    const row = data.pendingByDate.find((p) => p.t === label)
    const members = row?.members ?? []
    return (
      <>
        <div className="mb-1 font-semibold">
          {toDateLabel(label)} — {fmtInt(row?.v)} pending
        </div>
        {members.slice(0, 7).map((inv) => (
          <div key={inv.id} className="flex items-center gap-3">
            <InitialsAvatar name={inv.name} color={hashColor(inv.name)} />
            <div className="min-w-0">
              <div className="truncate font-medium">{inv.name}</div>
              <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                {roleLabel[inv.role]} · {inv.projectsCount} projects
              </div>
            </div>
          </div>
        ))}
        {members.length > 7 ? (
          <div className="mt-1 text-[11px]" style={{ color: TOKENS.muted }}>
            +{members.length - 7} more
          </div>
        ) : null}
      </>
    )
  }

  /* ---------- CARD 3: Admins Assigned ---------- */
  const admins = data.adminMembers
  const adminDonutParts = admins.map((m) => ({
    name: m.name,
    value: 1 / Math.max(1, admins.length),
    color: hashColor(m.name, TOKENS.valueBlue),
  }))
  const AdminDonutTooltip = (
    <PopoverCard title="Admins">
      {admins.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <InitialsAvatar name={m.name} color={hashColor(m.name)} />
            <span className="font-medium">{m.name}</span>
          </div>
          <div className="text-right">
            <div className="text-[11px]" style={{ color: TOKENS.muted }}>
              Admin · {m.projects.length} projects
            </div>
          </div>
        </div>
      ))}
    </PopoverCard>
  )
  const adminBars: MiniBarItem[] = admins.map((m) => ({ x: m.name, y: m.projects.length }))
  function AdminBarsTooltip(label: string) {
    const m = admins.find((x) => x.name === label)
    if (!m) return null
    return (
      <>
        <div className="mb-1 flex items-center gap-2">
          <InitialsAvatar name={m.name} color={hashColor(m.name)} />
          <div className="font-semibold">
            {m.name} · {m.projects.length} projects
          </div>
        </div>
        {m.projects.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ProjectIcon name={p.name} color={projectsColor(p.name)} />
              <span>{p.name}</span>
            </div>
            <div className="text-right text-[11px]" style={{ color: TOKENS.muted }}>
              {p.status === "active" ? "Active" : "Paused"}
            </div>
          </div>
        ))}
      </>
    )
  }

  /* ---------- CARD 4: Active Projects Assigned ---------- */
  const activeProjects = data.projects.filter((p) => p.status === "active")
  const activeProjectsTotalMembers = Math.max(
    1,
    activeProjects.reduce((s, p) => s + p.membersCount, 0),
  )
  const activeProjectsDonut = activeProjects.map((p) => ({
    name: p.name,
    value: p.membersCount / activeProjectsTotalMembers,
    color: p.color,
  }))
  const ActiveProjectsTooltip = (
    <PopoverCard title="Active projects">
      {activeProjects.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ProjectIcon name={p.name} color={p.color} />
            <span className="font-medium">{p.name}</span>
          </div>
          <div className="text-[11px]" style={{ color: TOKENS.muted }}>
            {p.membersCount} members (active + pending)
          </div>
        </div>
      ))}
    </PopoverCard>
  )

  const activeProjBars: MiniBarItem[] = data.activeProjectsMembersByDate.map((d) => ({ x: d.t, y: d.v }))
  function ActiveProjBarsTooltip(label: string) {
    const row = data.activeProjectsMembersByDate.find((x) => x.t === label)
    if (!row) return null
    return (
      <>
        <div className="mb-1 font-semibold">
          {toDateLabel(label)} — {fmtInt(row.v)} members
        </div>
        {row.projects.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ProjectIcon name={p.name} color={p.color} />
              <span>{p.name}</span>
            </div>
            <div className="text-[11px] font-medium">{fmtInt(p.members)}</div>
          </div>
        ))}
      </>
    )
  }

  /* ---------- CARD 5: Multi-dashboard Users ---------- */
  const dBuckets = data.dashboardsBuckets
  const totalMembers = Math.max(1, data.members.length)
  const multiDonutParts = [
    { name: "1 dashboard", value: dBuckets.d1.length / totalMembers, color: mixWithWhite(TOKENS.valueBlue, 0.85) },
    { name: "2 dashboards", value: dBuckets.d2.length / totalMembers, color: mixWithWhite(TOKENS.valueBlue, 0.55) },
    { name: "3 dashboards", value: dBuckets.d3.length / totalMembers, color: mixWithWhite(TOKENS.valueBlue, 0.35) },
    { name: "4 dashboards", value: dBuckets.d4.length / totalMembers, color: TOKENS.valueBlue },
  ]
  const dashboardsBars: MiniBarItem[] = [
    { x: "1 dashboard", y: dBuckets.d1.length },
    { x: "2 dashboards", y: dBuckets.d2.length },
    { x: "3 dashboards", y: dBuckets.d3.length },
    { x: "4 dashboards", y: dBuckets.d4.length },
  ]
  function DashboardsBarsTooltip(label: string) {
    const list = label.startsWith("1")
      ? dBuckets.d1
      : label.startsWith("2")
        ? dBuckets.d2
        : label.startsWith("3")
          ? dBuckets.d3
          : dBuckets.d4
    return (
      <>
        <div className="mb-1 font-semibold">{label}</div>
        {list.slice(0, 9).map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <InitialsAvatar name={m.name} color={hashColor(m.name)} />
            <div className="min-w-0">
              <div className="truncate font-medium">{m.name}</div>
              <div className="text-[11px]" style={{ color: TOKENS.muted }}>
                {roleLabel[m.role]} · member since {m.memberSince ? toDateLabel(m.memberSince) : "—"}
              </div>
            </div>
          </div>
        ))}
        {list.length > 9 ? (
          <div className="mt-1 text-[11px]" style={{ color: TOKENS.muted }}>
            +{list.length - 9} other users
          </div>
        ) : null}
      </>
    )
  }

  /* ---------- CARD 6: Inactive Users (30+ days) ---------- */
  const inactive = data.inactiveMembers
  const inactiveDonutParts = inactive.map((m) => ({
    name: m.name,
    value: 1 / Math.max(1, inactive.length),
    color: hashColor(m.name),
  }))
  const InactiveDonutTooltip = (
    <PopoverCard title="Inactive users (30+ days)">
      {inactive.length === 0 ? (
        <div style={{ color: TOKENS.muted }}>—</div>
      ) : (
        inactive.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <InitialsAvatar name={m.name} color={hashColor(m.name)} />
              <span className="font-medium">{m.name}</span>
            </div>
            <div className="text-right text-[11px]" style={{ color: TOKENS.muted }}>
              {m.projects.length} projects · inactive {m.inactiveSinceDays ?? "—"}d
            </div>
          </div>
        ))
      )}
    </PopoverCard>
  )
  const inactiveBars: MiniBarItem[] = inactive.map((m) => ({ x: m.name, y: m.projects.length }))
  function InactiveBarsTooltip(label: string) {
    const m = inactive.find((x) => x.name === label)
    if (!m) return null
    return (
      <>
        <div className="mb-1 flex items-center gap-2">
          <InitialsAvatar name={m.name} color={hashColor(m.name)} />
          <div className="font-semibold">
            {m.name} · member since {m.memberSince ? toDateLabel(m.memberSince) : "—"}
          </div>
        </div>
        {m.projects.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ProjectIcon name={p.name} color={projectsColor(p.name)} />
              <span>{p.name}</span>
            </div>
            <div className="text-right text-[11px]" style={{ color: TOKENS.muted }}>
              Assigned {p.assignedAt ? toDateLabel(p.assignedAt) : "—"} · {p.status === "active" ? "Active" : "Paused"}
            </div>
          </div>
        ))}
      </>
    )
  }

  if (loading) {
    return (
      <section className="w-full">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-semibold">Team Activity Summary</h3>
          <div className="h-9 w-24 rounded-md bg-[#F5F7FA]" />
        </div>
        <div className="mt-4 grid grid-cols-12 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
              <div className="rounded-[16px] border p-4 shadow-sm">
                <div className="h-4 w-40 bg-[#F5F7FA] rounded" />
                <div className="mt-3 h-16 bg-[#F5F7FA] rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }
  return (
    <section
      className="w-full"
      style={{ fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      {/* Header (unchanged) */}
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
          Team Activity Summary
        </h3>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
          style={{ borderColor: TOKENS.border }}
          onClick={() => setSeed((s) => s + 1)}
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={16} className="text-[#9CA3AF]" />
          Refresh
        </button>
      </div>
      <div className="mt-3 border-t" style={{ borderColor: TOKENS.border }} />

      {/* GRID — unchanged */}
      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* 1) Total Team Members */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell
            title="Total Team Members"
            info="Snapshot: headcount by role. Mini bars: role-wise member counts; hover to see people and details."
            ariaLabel={aria.total}
            onClick={() => {}}
          >
            <div className="flex items-center justify-between gap-3">
              <DonutSplit
                parts={roleDonutParts}
                aria="Headcount by role"
                tooltip={<RoleDonutTooltip parts={roleDonutParts} members={data.members} />}
              />
              <div className="min-w-[100px]">
                <output className="block text-[22px] font-bold">{fmtInt(data.counts.total_active_members)}</output>
                <DeltaLine value={deltas.total} />
              </div>
              <MiniBars
                data={roleBars}
                aria="Members by role"
                color={TOKENS.valueBlue}
                tooltipRows={(label) => RoleBarsTooltip(label)}
              />
            </div>
          </CardShell>
        </div>

        {/* 2) Pending Invitations */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell
            title="Pending Invitations"
            info="Donut: each slice represents a person pending. Bars: 30-day trend, hover to see who was pending that day."
            ariaLabel={aria.pending}
            onClick={() => {}}
          >
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={pendingDonutParts} aria="Pending by member" tooltip={PendingDonutTooltip} />
              <div className="min-w-[100px]">
                <output className="block text-[22px] font-bold">{fmtInt(data.counts.pending_invites)}</output>
                <DeltaLine value={deltas.pending} invert />
              </div>
              <MiniBars
                data={pendingBars}
                aria="Pending invites — by date"
                color={TOKENS.valueBlue}
                labelFormatter={(x) => toDateLabel(x)}
                tooltipRows={(label) => PendingBarsTooltip(label)}
              />
            </div>
          </CardShell>
        </div>

        {/* 3) Admins Assigned */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell
            title="Admins Assigned"
            info="Donut: one slice per admin. Bars: projects per admin, with project breakdown on hover."
            ariaLabel={aria.admins}
            onClick={() => {}}
          >
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={adminDonutParts} aria="Admins" tooltip={AdminDonutTooltip} />
              <div className="min-w-[100px]">
                <output className="block text-[22px] font-bold">{fmtInt(data.counts.members_with_admin_role)}</output>
                <DeltaLine value={deltas.admins} neutral />
              </div>
              <MiniBars
                data={adminBars}
                aria="Projects per admin"
                color={TOKENS.valueBlue}
                tooltipRows={(label) => AdminBarsTooltip(label)}
              />
            </div>
          </CardShell>
        </div>

        {/* 4) Active Projects Assigned */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell
            title="Active Projects Assigned"
            info="Donut: breakdown of active projects by members count. Bars: members on active projects per day."
            ariaLabel={aria.projects}
            onClick={() => {}}
          >
            <div className="flex items-center justify-between gap-3">
              <DonutSplit
                parts={activeProjectsDonut}
                aria="Active projects breakdown"
                tooltip={ActiveProjectsTooltip}
              />
              <div className="min-w-[100px]">
                <output className="block text-[22px] font-bold">{fmtInt(data.counts.active_projects_assigned)}</output>
                <DeltaLine value={deltas.projects} />
              </div>
              <MiniBars
                data={activeProjBars}
                aria="Active projects — members over time"
                color={TOKENS.valueBlue}
                labelFormatter={(x) => toDateLabel(x)}
                tooltipRows={(label) => ActiveProjBarsTooltip(label)}
              />
            </div>
          </CardShell>
        </div>

        {/* 5) Multi-dashboard Users */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell
            title="Multi-dashboard Users"
            info="Donut: share by # of dashboards. Bars: users per dashboard count."
            ariaLabel={aria.multi}
            onClick={() => {}}
          >
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={multiDonutParts} aria="Dashboards per user" />
              <div className="min-w-[100px]">
                <output className="block text-[22px] font-bold">{fmtInt(data.counts.multi_dashboard_users)}</output>
                <DeltaLine value={deltas.multi} neutral />
              </div>
              <MiniBars
                data={dashboardsBars}
                aria="Users by dashboards count"
                color={TOKENS.neutral}
                tooltipRows={(label) => DashboardsBarsTooltip(label)}
              />
            </div>
          </CardShell>
        </div>

        {/* 6) Inactive Users (30+ days) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-2">
          <CardShell
            title="Inactive Users (30+ days)"
            info="Donut: each slice is one inactive member. Bars: projects per inactive member."
            ariaLabel={aria.inactive}
            onClick={() => {}}
          >
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={inactiveDonutParts} aria="Inactive members share" tooltip={InactiveDonutTooltip} />
              <div className="min-w-[100px]">
                <output className="block text-[22px] font-bold">{fmtInt(data.counts.inactive_users_30d as any)}</output>
                <DeltaLine value={deltas.inactive} invert note="(lower is better)" />
              </div>
              <MiniBars
                data={inactiveBars}
                aria="Inactive members — projects"
                color={TOKENS.danger}
                tooltipRows={(label) => InactiveBarsTooltip(label)}
              />
            </div>
          </CardShell>
        </div>
      </div>
    </section>
  )
}

/* ========================================================================================
 * REMAINING SMALL ATOMS — unchanged (uses dashes where values are missing)
 * ====================================================================================== */
function DeltaLine({
  value,
  invert = false,
  neutral = false,
  note,
}: { value?: number; invert?: boolean; neutral?: boolean; note?: string }) {
  if (typeof value !== "number") {
    return (
      <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
        —
      </div>
    )
  }
  const good = invert ? value < 0 : value > 0
  const color = neutral ? TOKENS.muted : good ? TOKENS.success : TOKENS.danger
  return (
    <div className="mt-1 text-xs" style={{ color }}>
      {value > 0 ? "▲" : value < 0 ? "▼" : "—"} {Math.abs(value).toFixed(1)}%{" "}
      {note && (
        <span className="text-[11px]" style={{ color: TOKENS.muted }}>
          {note}
        </span>
      )}
    </div>
  )
}

function RoleDonutTooltip({
  parts,
  members,
}: { parts: { name: string; value: number; color: string }[]; members: Member[] }) {
  return (
    <PopoverCard title="Headcount by role">
      {parts.map((p) => {
        const role = (Object.keys(roleLabel) as RoleKey[]).find((rk) => roleLabel[rk] === p.name) as RoleKey | undefined
        const list = role ? members.filter((m) => m.role === role) : []
        return (
          <div key={p.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className="font-medium">{p.name}</span>
              </span>
              <span className="text-[11px]" style={{ color: TOKENS.muted }}>
                {(p.value * 100).toFixed(1)}%
              </span>
            </div>
            {list.slice(0, 6).map((m) => (
              <div key={m.id} className="ml-5 flex items-center gap-2">
                <InitialsAvatar name={m.name} color={hashColor(m.name)} />
                <div className="text-[11px]">
                  <span className="font-medium">{m.name}</span>{" "}
                  <span style={{ color: TOKENS.muted }}>
                    · assigned {m.roleAssignedAt ? toDateLabel(m.roleAssignedAt) : "—"} ·{" "}
                    {m.active ? "Active" : "Inactive"} · {m.projects.length} proj
                  </span>
                </div>
              </div>
            ))}
            {list.length > 6 ? (
              <div className="ml-5 text-[11px]" style={{ color: TOKENS.muted }}>
                +{list.length - 6} more
              </div>
            ) : null}
          </div>
        )
      })}
    </PopoverCard>
  )
}
