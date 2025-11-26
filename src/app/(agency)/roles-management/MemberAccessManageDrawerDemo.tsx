"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Drawer, Popconfirm, message } from "antd"
import { useDispatch, useSelector } from "react-redux"
import { updateMemberAccess, fetchTeamDetails, selectMembersRaw } from "@/src/redux/reducer/teamReducer"
import { RawMember } from "@/src/redux/reducer/teamReducer"

const TOKENS = {
  brand: "#1090D0",
  brandPastel: "#E7F4FB",
  good: "#28C76F",
  warn: "#FF9F43",
  critical: "#EA5455",
  neutral: "#6C757D",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  surface: "#FFFFFF",
  text: "#1F2937",
  muted: "#6B7280",
} as const


type IconName =
  | "shield"
  | "role-owner"
  | "role-admin"
  | "role-editor"
  | "role-viewer"
  | "dash-seo"
  | "dash-content"
  | "dash-taskboard"
  | "dash-reporting"
  | "x"
  | "lock"
  | "trash"

const WrIcon: React.FC<{ name: IconName; size?: number; className?: string; title?: string }> = ({
  name,
  size = 18,
  className,
  title,
}) => {
  const common = "stroke-current"
  switch (name) {
    case "shield":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "Manage Access"} className={className}>
          <path
            className={common}
            fill="none"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          />
        </svg>
      )
    case "role-admin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "Admin"} className={className}>
          <path className={common} fill="none" strokeWidth="1.8" d="M12 21s8-4 8-10V6l-8-3-8 3v5c0 6 8 10 8 10z" />
          <circle className={common} fill="none" strokeWidth="1.8" cx="12" cy="11" r="2" />
        </svg>
      )
    case "role-editor":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "Editor"} className={className}>
          <path
            className={common}
            fill="none"
            strokeWidth="1.8"
            d="M12 19l-3 1 1-3 7-7 2 2-7 7zM18 7l2-2 1 1-2 2-1-1z"
          />
        </svg>
      )
    case "role-viewer":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "Viewer"} className={className}>
          <path className={common} fill="none" strokeWidth="1.8" d="M2 12s4.5-6 10-6 10 6 10 6-4.5 6-10 6-10-6-10-6z" />
          <circle className={common} fill="none" strokeWidth="1.8" cx="12" cy="12" r="2.8" />
        </svg>
      )
    case "dash-seo":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "SEO"} className={className}>
          <circle className={common} fill="none" strokeWidth="1.8" cx="11" cy="11" r="5" />
          <path className={common} fill="none" strokeWidth="1.8" d="M21 21l-4.2-4.2M11 6v2M11 14v2M6 11h2M14 11h2" />
        </svg>
      )
    case "dash-content":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "Content"} className={className}>
          <path
            className={common}
            fill="none"
            strokeWidth="1.8"
            d="M6 3h9l3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"
          />
          <path className={common} fill="none" strokeWidth="1.8" d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      )
    case "dash-taskboard":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "TaskBoard"} className={className}>
          <rect className={common} fill="none" strokeWidth="1.8" x="4" y="5" width="4" height="14" rx="1" />
          <rect className={common} fill="none" strokeWidth="1.8" x="10" y="5" width="4" height="10" rx="1" />
          <rect className={common} fill="none" strokeWidth="1.8" x="16" y="5" width="4" height="6" rx="1" />
        </svg>
      )
    case "dash-reporting":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "Reporting"} className={className}>
          <path
            className={common}
            fill="none"
            strokeWidth="1.8"
            d="M3 20h18M4 20V10M10 20V6M16 20v-8M4 12l6-4 6 3 5-4"
          />
        </svg>
      )
    case "lock":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title ?? "Locked"} className={className}>
          <rect className={common} fill="none" strokeWidth="1.8" x="5" y="11" width="14" height="10" rx="2" />
          <path className={common} fill="none" strokeWidth="1.8" d="M7 11V8a5 5 0 1 1 10 0v3" />
        </svg>
      )
    case "trash":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          <path
            className={common}
            fill="none"
            strokeWidth="1.8"
            d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6"
          />
        </svg>
      )
    default:
      return null
  }
}

type DashboardKey = "seo" | "content" | "taskboard" | "reporting"

const DASHBOARD_LABEL: Record<DashboardKey, string> = {
  seo: "SEO",
  content: "Content",
  taskboard: "TaskBoard",
  reporting: "Reporting",
}

const dashIcon: Record<DashboardKey, IconName> = {
  seo: "dash-seo",
  content: "dash-content",
  taskboard: "dash-taskboard",
  reporting: "dash-reporting",
}

function toDashKey(type: string): DashboardKey {
  const t = (type || "").toLowerCase()
  if (t.includes("task")) return "taskboard"
  if (t.includes("repo")) return "reporting"
  if (t.includes("cont")) return "content"
  return "seo"
}

function toRoleKey(access: string): "admin" | "editor" | "viewer" {
  const a = (access || "").toLowerCase()
  if (a === "admin") return "admin"
  if (a === "editor") return "editor"
  return "viewer"
}

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("")
}

function domainFrom(input: string) {
  try {
    const s = input.trim()
    if (s.includes("://")) return new URL(s).hostname
    return s.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  } catch {
    return input
  }
}

function faviconFor(domainLike: string) {
  const host = domainFrom(domainLike)
  return `https://icons.duckduckgo.com/ip3/${host}.ico`
}

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ")
}

export const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { iconLeft?: React.ReactNode; widthClass?: string }
> = ({ className, iconLeft, widthClass = "w-44", children, style, ...rest }) => {
  return (
    <div className={classNames("relative", widthClass)}>
      {iconLeft ? (
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#6B7280]">{iconLeft}</div>
      ) : null}
      <select
        {...rest}
        className={classNames(
          "h-9 w-full appearance-none rounded-md border bg-white pr-8 text-sm cursor-pointer",
          iconLeft ? "pl-8" : "pl-3",
          className,
        )}
        style={{
          borderColor: TOKENS.borderStrong,
          color: TOKENS.text,
          fontFamily: "Inter, system-ui, sans-serif",
          ...style,
        }}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
        <svg width={18} height={18} viewBox="0 0 24 24">
          <path className="stroke-current" fill="none" strokeWidth="1.8" d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  )
}

export const ToggleSwitch: React.FC<{
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}> = ({ checked, onChange, disabled, ariaLabel }) => {
  const bg = disabled ? "#F3F4F6" : checked ? TOKENS.brandPastel : "#FFFFFF"
  const knobX = checked ? 36 : 2
  const knobBg = checked ? TOKENS.brand : "#E5E7EB"
  const knobText = checked ? "#FFFFFF" : "#374151"
  const label = checked ? "ON" : "OFF"
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center cursor-pointer"
      style={{
        width: 66,
        height: 28,
        borderRadius: 999,
        border: `1px solid ${TOKENS.borderStrong}`,
        background: bg,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span
        className="absolute inline-flex items-center justify-center text-[10px] font-bold select-none"
        style={{
          width: 28,
          height: 24,
          borderRadius: 999,
          transform: `translateX(${knobX}px)`,
          left: 0,
          color: knobText,
          background: knobBg,
          transition: "transform 120ms ease, background 120ms ease",
        }}
      >
        {label}
      </span>
    </button>
  )
}

const ProjectFavicon: React.FC<{ domain: string }> = ({ domain }) => {
  const [ok, setOk] = useState(true)
  return (
    <span className="relative inline-flex h-4 w-4 overflow-hidden rounded" title={domain}>
      {ok ? (
        <img src={faviconFor(domain) || "/placeholder.svg"} className="h-4 w-4" alt="" onError={() => setOk(false)} />
      ) : (
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px]"
          style={{ background: "#F5F7FA", color: TOKENS.text }}
        >
          {(domain[0] || "?").toUpperCase()}
        </span>
      )}
    </span>
  )
}

const ProjectChip: React.FC<{ label: string; domain: string }> = ({ label, domain }) => {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ border: `1px solid ${TOKENS.borderStrong}`, background: "#fff", color: TOKENS.text }}
      title={domain}
    >
      <ProjectFavicon domain={domain} />
      <span className="max-w-[260px] truncate">{label}</span>
    </span>
  )
}

export const Chip: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({
  children,
  className,
  title,
}) => (
  <span
    title={title}
    className={classNames(
      "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold",
      className,
    )}
    style={{
      borderColor: TOKENS.borderStrong,
      background: "#fff",
      color: TOKENS.text,
      fontFamily: "Inter, system-ui, sans-serif",
    }}
  >
    {children}
  </span>
)

export interface MemberAccessDrawerProps {
  open: boolean
  onClose: () => void
  memberId: number
}

export const MemberAccessDrawer: React.FC<MemberAccessDrawerProps> = ({ open, onClose, memberId }) => {
  const dispatch = useDispatch()
  const members = useSelector(selectMembersRaw) as RawMember[]
  const [messageApi, contextHolder] = message.useMessage()

  const member = members.find((m) => m.member_id === memberId)

  const [localChanges, setLocalChanges] = useState<Record<string, { access: string; active: boolean }>>({})
  const [roleConfirm, setRoleConfirm] = useState<{
    key: string
    projectId: number
    dashboardId: number
    dashboardType: string
    newRole: string
  } | null>(null)

  useEffect(() => {
    // Reset local changes when drawer opens
    if (open) {
      setLocalChanges({})
    }
  }, [open, memberId])

  const status = useMemo(() => {
    if (!member) return "removed"
    return member.projects.some((p) => p.invitation_status === "Accepted")
      ? "active"
      : member.projects.some((p) => p.invitation_status === "Pending")
        ? "pending"
        : "removed"
  }, [member])

  const summaryPairs = useMemo(() => {
    if (!member) return []
    const pairs: Array<{ role: string; dash: DashboardKey; count: number }> = []
    const map = new Map<string, { role: string; dash: DashboardKey; count: number }>()

    member.projects.forEach((project) => {
      project.dashboards.forEach((dashboard) => {
        const dashKey = toDashKey(dashboard.type)
        const roleKey = toRoleKey(dashboard.access)
        const key = `${roleKey}::${dashKey}`

        const existing = map.get(key)
        if (existing) {
          existing.count++
        } else {
          map.set(key, { role: roleKey, dash: dashKey, count: 1 })
        }
      })
    })

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [member])

  if (!member) {
    return (
      <Drawer title="Member Not Found" placement="right" width={720} onClose={onClose} open={open}>
        <div className="p-4">Member not found.</div>
      </Drawer>
    )
  }

  const handleToggleAccess = async (
    projectId: number,
    dashboardId: number | null,
    dashboardType: string,
    currentActive: boolean,
  ) => {
    if (!dashboardId) {
      console.warn("Cannot update dashboard without ID")
      return
    }

    const key = `${projectId}-${dashboardId}`
    const currentAccess =
      member.projects.find((p) => p.project_id === projectId)?.dashboards.find((d) => d.id === dashboardId)?.access ||
      "Viewer"

    // Update local state immediately for UI responsiveness
    setLocalChanges((prev) => ({
      ...prev,
      [key]: { access: currentAccess, active: !currentActive },
    }))

    try {
      const resultAction = (await dispatch(
        updateMemberAccess({
          dashboard_id: String(dashboardId),
          dashboard_type: dashboardType,
          access_level: currentAccess,
        }) as any,
      )) as any

      if (updateMemberAccess.fulfilled.match(resultAction)) {
        messageApi.success(((resultAction.payload as any)?.message) || "Dashboard access updated.")
      } else {
        throw new Error(resultAction.error?.message || "Failed to update access")
      }
      await dispatch(fetchTeamDetails({ force: true }) as any)
    } catch (error) {
      console.error("Failed to update access:", error)
      messageApi.error("Failed to update access. Please try again.")
      // Revert local change on error
      setLocalChanges((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleRoleChange = async (
    projectId: number,
    dashboardId: number | null,
    dashboardType: string,
    newRole: string,
  ) => {
    if (!dashboardId) {
      console.warn("Cannot update dashboard without ID")
      return
    }

    const key = `${projectId}-${dashboardId}`
    const currentActive =
      member.projects.find((p) => p.project_id === projectId)?.dashboards.find((d) => d.id === dashboardId)?.active ??
      false

    // Update local state
    setLocalChanges((prev) => ({
      ...prev,
      [key]: { access: newRole, active: currentActive },
    }))

    try {
      const resultAction = (await dispatch(
        updateMemberAccess({
          dashboard_id: String(dashboardId),
          dashboard_type: dashboardType,
          access_level: newRole,
        }) as any,
      )) as any

      if (updateMemberAccess.fulfilled.match(resultAction)) {
        messageApi.success(((resultAction.payload as any)?.message) || "Dashboard access updated.")
      } else {
        throw new Error(resultAction.error?.message || "Failed to update access")
      }
      await dispatch(fetchTeamDetails({ force: true }) as any)
    } catch (error) {
      console.error("Failed to update role:", error)
      messageApi.error("Failed to update access. Please try again.")
      // Revert local change on error
      setLocalChanges((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const getDashboardState = (projectId: number, dashboardId: number | null, dashboard: any) => {
    if (!dashboardId) return { active: dashboard.active, access: dashboard.access }

    const key = `${projectId}-${dashboardId}`
    const localChange = localChanges[key]

    if (localChange) {
      return { active: localChange.active, access: localChange.access }
    }

    return { active: dashboard.active, access: dashboard.access }
  }

  return (
    <Drawer
      title={
        <div className="flex items-center gap-3">
          <div
            className="relative h-10 w-10 overflow-hidden rounded-full border"
            style={{ borderColor: TOKENS.borderStrong }}
          >
            <div
              className="flex h-full w-full items-center justify-center bg-[#F5F7FA] text-[13px] font-bold"
              style={{ color: TOKENS.brand }}
            >
              {toInitials(member.member_name)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[15px] font-bold text-[#111827]">
              <WrIcon name="shield" className="text-[#1090D0]" />
              <span className="truncate">Manage Access — {member.member_name}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
              <span className="truncate" title={member.member_email}>
                {member.member_email}
              </span>
              <span>•</span>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                style={{
                  borderColor: TOKENS.borderStrong,
                  color: status === "active" ? TOKENS.good : status === "pending" ? TOKENS.warn : TOKENS.critical,
                  background: "#FFFFFF",
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background:
                      status === "active" ? TOKENS.good : status === "pending" ? TOKENS.warn : TOKENS.critical,
                  }}
                  aria-hidden
                />
                {status[0].toUpperCase() + status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      }
      placement="right"
      width={720}
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: 0 },
      }}
    >
      {contextHolder}
      <div className="space-y-5 p-4" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {/* Projects & Dashboards */}
        {member.projects.map((project:any) => {
          
        return (
          <section
            key={project.project_id}
            className="rounded-lg border bg-white p-4"
            style={{ borderColor: TOKENS.border }}
          >
            <div className="mb-3 flex items-center gap-2">
              <ProjectChip
                label={project.project_name ||  project.project_domain}
                domain={project.project_name || ""}
              />
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: TOKENS.borderStrong,
                  color: project.invitation_status === "Accepted" ? TOKENS.good : TOKENS.warn,
                }}
              >
                {project.invitation_status}
              </span>
            </div>

            <div
              className="grid grid-cols-12 items-center rounded-md border text-sm"
              style={{ borderColor: TOKENS.border }}
            >
              {/* Header */}
              <div
                className="col-span-6 border-b px-3 py-2 font-semibold"
                style={{ borderColor: TOKENS.border, background: "#FAFAFB" }}
              >
                Dashboard
              </div>
              <div
                className="col-span-3 border-b px-3 py-2 font-semibold"
                style={{ borderColor: TOKENS.border, background: "#FAFAFB" }}
              >
                Access
              </div>
              <div
                className="col-span-3 border-b px-3 py-2 font-semibold"
                style={{ borderColor: TOKENS.border, background: "#FAFAFB" }}
              >
                Role
              </div>

              {/* Rows */}
              {project.dashboards.map((dashboard, idx) => {
                const dashKey = toDashKey(dashboard.type)
                const currentState = getDashboardState(project.project_id, dashboard.id, dashboard)
                const isActive = currentState.active
                const currentRole = toRoleKey(currentState.access)
                const accessKey = `${project.project_id}-${dashboard.id}`

                return (
                  <React.Fragment key={idx}>
                    <div className="col-span-6 border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-[6px]"
                          style={{ background: "#F5F7FA" }}
                        >
                          <WrIcon name={dashIcon[dashKey]} className="text-[#1090D0]" size={14} />
                        </span>
                        <div className="font-medium" style={{ color: TOKENS.text }}>
                          {DASHBOARD_LABEL[dashKey]}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                      <Popconfirm
                        title="Update access?"
                        description={`Turn ${DASHBOARD_LABEL[dashKey]} ${isActive ? "off" : "on"} for ${member.member_name}?`}
                        okText="Update"
                        cancelText="Cancel"
                        onConfirm={() =>
                          handleToggleAccess(project.project_id, dashboard.id, dashboard.type, isActive)
                        }
                        disabled={!dashboard.id}
                      >
                        <span className="inline-flex">
                          <ToggleSwitch
                            ariaLabel={`${DASHBOARD_LABEL[dashKey]} access`}
                            checked={isActive}
                            onChange={() => {}}
                            disabled={!dashboard.id}
                          />
                        </span>
                      </Popconfirm>
                    </div>

                    <div className="col-span-3 border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                      <Popconfirm
                        title="Update access?"
                        description={
                          roleConfirm?.key === accessKey
                            ? `Change role to ${roleConfirm.newRole}?`
                            : `Change role for ${DASHBOARD_LABEL[dashKey]}?`
                        }
                        okText="Update"
                        cancelText="Cancel"
                        open={roleConfirm?.key === accessKey}
                        onConfirm={() => {
                          if (roleConfirm) {
                            handleRoleChange(
                              roleConfirm.projectId,
                              roleConfirm.dashboardId,
                              roleConfirm.dashboardType,
                              roleConfirm.newRole,
                            )
                          }
                          setRoleConfirm(null)
                        }}
                        onCancel={() => setRoleConfirm(null)}
                        disabled={!isActive || !dashboard.id}
                      >
                        <Select
                          value={currentRole}
                          onChange={(e) => {
                            if (!dashboard.id) return
                            const nextRole = e.target.value
                            if (nextRole === currentRole) return
                            setRoleConfirm({
                              key: accessKey,
                              projectId: project.project_id,
                              dashboardId: dashboard.id,
                              dashboardType: dashboard.type,
                              newRole: nextRole,
                            })
                          }}
                          disabled={!isActive || !dashboard.id}
                          iconLeft={<WrIcon name={`role-${currentRole}` as IconName} size={14} />}
                          widthClass="w-full"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </Select>
                      </Popconfirm>
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
          </section>
        )})}

        {/* Danger Zone */}
        <section className="rounded-lg border bg-white p-4" style={{ borderColor: TOKENS.border }}>
          <div className="mb-3 text-[13px] font-bold text-[#111827]">Danger Zone</div>
          <div className="flex flex-wrap gap-2">
            <button
              className="flex items-center gap-2 border px-3 py-2 rounded-md text-sm"
              style={{ borderColor: TOKENS.borderStrong }}
              onClick={() => {
                if (confirm(`Revoke all access for ${member.member_name}?`)) {
                  // TODO: Implement revoke all
                  console.log("Revoke all access")
                }
              }}
            >
              <WrIcon name="lock" size={16} />
              Revoke All Access
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white"
              style={{ background: TOKENS.critical }}
              onClick={() => {
                if (confirm(`Remove ${member.member_name} from team?`)) {
                  // TODO: Implement remove member
                  console.log("Remove member")
                }
              }}
            >
              <WrIcon name="trash" size={16} />
              Remove from Team
            </button>
          </div>
        </section>
      </div>
    </Drawer>
  )
}
