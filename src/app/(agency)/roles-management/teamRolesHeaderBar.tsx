"use client"

import { useDispatch, useSelector } from "react-redux"
import {
  clearLastInviteResult,
  fetchTeamDetails,
  selectProjects,
  selectLastInviteResult,
  type InviteConfirmIn,
} from "@/src/redux/reducer/teamReducer"
import {
  Check,
  ChevronDown,
  Info,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Upload,
  UserPlus,
  Users,
} from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import ActiveMembersSection from "./ActiveMembersSection"
import DemoInviteModalCanvas from "./DemoInviteModalCanvas"
import PendingInvitesSectionDemo from "./PendingInvitesSectionDemo"
import TeamActivitySummaryV21 from "./TeamActivitySummaryV21"
import { RolesPermissionsConfigModal } from "../../(team)/team-management/RolesPermissionsConfig"
import InviteMemberModal from "../../(team)/team-management/InviteMemberModal"
import { InviteConfirmModal } from "../../(team)/team-management/InviteConfirmationModal"

/* ───────────────────────── Tokens (align with Team Performance Board) ───────────────────────── */
const TOKENS = {
  brand: "#1090D0",
  brandHover: "#0B79AD",
  pastelBrand: "#D2EFFF",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  darkerMuted: "#374151",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  success: "#28C76F",
  warn: "#FF9F43",
  danger: "#EA5455",
}
const RADIUS = 8
const BORDER = 2

/* ───────────────────────── Types ───────────────────────── */
export type Role = "Admin" | "Editor" | "Viewer"
export type MemberStatus = "Active" | "Invited" | "Suspended" | "Deactivated"

export type UserOption = {
  id: string
  name: string
  email?: string
  role: Role
  status: MemberStatus
  avatar?: string
}

export type TeamRolesQuery = {
  members: string[] // user_ids
  roles: Role[] // selected roles
  statuses: MemberStatus[]
  savedView?: string
}

type AsyncMaybe<T> = T | undefined

/* ───────────────────────── Utilities & Hooks ───────────────────────── */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ")
}

function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    function h(e: MouseEvent) {
      if (!isOpen) return
      const el = ref.current
      if (el && !el.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [isOpen, onClose])
  return ref
}

/* ───────────────────────── Micro Primitives (chips + buttons) ───────────────────────── */
function IconOnlyButton({
  title,
  onClick,
  children,
  disabled,
}: React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={classNames("cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}
      style={{
        height: 36,
        width: 36,
        display: "grid",
        placeItems: "center",
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${TOKENS.border}`,
        background: hover && !disabled ? TOKENS.chipHover : TOKENS.chipBg,
        color: TOKENS.text,
      }}
    >
      {children}
    </button>
  )
}

function PrimaryButton({
  title,
  onClick,
  children,
  disabled,
}: React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={classNames(
        "inline-flex items-center gap-2 h-9 px-3 text-white cursor-pointer",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{ background: hover && !disabled ? TOKENS.brandHover : TOKENS.brand, borderRadius: RADIUS }}
    >
      {children}
      <span className="text-sm font-medium">{title}</span>
    </button>
  )
}

/** NEW: Secondary button with brand pastel styling (for Roles & Permissions) */
function SecondaryButton({
  title,
  onClick,
  children,
  disabled,
}: React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={classNames(
        "inline-flex items-center gap-2 h-9 px-3 text-[13px] cursor-pointer",
        disabled && "opacity-60 cursor-not-allowed",
      )}
      style={{
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${hover ? TOKENS.brandHover : TOKENS.brand}`,
        color: TOKENS.brand,
        fontWeight: 600,
      }}
    >
      {children}
      <span>{title}</span>
    </button>
  )
}

/** Chip with optional dropdown styling & chevron */
function Chip({
  label,
  active,
  onClick,
  leadingIcon: Leading,
  ariaControls,
  ariaExpanded,
  dropdown, // shows chevron
  open, // rotates chevron when true
  brandFilterStyle, // white bg + brand border (for filter chips)
}: {
  label: string
  active?: boolean
  onClick?: () => void
  leadingIcon?: React.ComponentType<{ size?: number; className?: string }>
  ariaControls?: string
  ariaExpanded?: boolean
  dropdown?: boolean
  open?: boolean
  brandFilterStyle?: boolean
}) {
  const [hover, setHover] = useState(false)

  const bg = brandFilterStyle ? "#FFFFFF" : active ? TOKENS.pastelBrand : hover ? TOKENS.chipHover : TOKENS.chipBg

  const borderColor = brandFilterStyle ? (hover || open ? TOKENS.brandHover : TOKENS.brand) : TOKENS.border

  const textColor = brandFilterStyle ? TOKENS.darkerMuted : active ? TOKENS.brand : TOKENS.text

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 h-9 px-2.5 text-[13px] cursor-pointer select-none"
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      aria-haspopup={dropdown ? "menu" : undefined}
      style={{
        borderRadius: 999,
        border: `${BORDER}px solid ${borderColor}`,
        background: bg,
        color: textColor,
        fontWeight: active ? 600 : 500,
      }}
    >
      {Leading && <Leading size={16} className={active || brandFilterStyle ? "" : "text-[#6B7280]"} />}
      <span>{label}</span>
      {dropdown && (
        <ChevronDown
          size={16}
          className={classNames("transition-transform duration-150 ease-out", open ? "rotate-180" : "")}
        />
      )}
    </button>
  )
}

/* ───────────────────────── Pickers ───────────────────────── */

/** Team members multi-select (with search + role/status hints) */
function TeamMemberPicker({
  options = [],
  selected = [],
  onChange = () => { },
}: {
  options?: UserOption[]
  selected?: string[]
  onChange?: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState<any>("")
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))

  // FIX: always operate on a safe, clean array
  const safeOptions = useMemo(
    () => (Array.isArray(options) ? (options.filter(Boolean) as UserOption[]) : []),
    [options],
  )

  const sel = Array.isArray(selected) ? selected : []
  const selCount = sel.length
  const label = selCount === 0 ? "Team: All Members" : `Team: ${selCount} selected`

  const term = q.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      safeOptions.filter((u) => {
        if (!term) return true
        const hay = `${u?.name ?? ""} ${u?.email ?? ""} ${u?.role ?? ""} ${u?.status ?? ""}`.toLowerCase()
        return hay.includes(term)
      }),
    [safeOptions, term],
  )

  const toggle = (id: string, check: boolean) => onChange?.(check ? [...sel, id] : sel.filter((x) => x !== id))

  const initials = (name?: string) =>
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2) || "•"

  return (
    <div className="relative" ref={ref}>
      <Chip
        label={label}
        leadingIcon={Users}
        onClick={() => setOpen((s) => !s)}
        ariaControls="member-picker"
        ariaExpanded={open}
        dropdown
        open={open}
        brandFilterStyle
      />
      {open && (
        <div
          id="member-picker"
          className="absolute z-50 mt-2 min-w-[320px] bg-white shadow"
          role="menu"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="p-2 border-b" style={{ borderColor: TOKENS.border }}>
            <div
              className="flex items-center gap-2 rounded border px-2 py-1.5 bg-white"
              style={{ borderColor: TOKENS.border }}
            >
              <Search size={16} className="text-[#9CA3AF]" />
              <input
                className="w-full text-sm outline-none"
                placeholder="Search name, email, role, status"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[260px] overflow-auto py-1">
            {filtered.map((u) => {
              const checked = sel.includes(u.id)
              return (
                <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={checked} onChange={(e) => toggle(u.id, e.target.checked)} />
                  <span className="inline-flex h-6 w-6 rounded-full bg-[#E6F4FB] items-center justify-center text-[11px]">
                    {initials(u.name)}
                  </span>
                  <span className="flex-1">
                    {u.name}
                    {u.email ? <span className="ml-1 text-xs text-[#6B7280]">• {u.email}</span> : null}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded border"
                    style={{ borderColor: TOKENS.border }}
                    title={`Role: ${u.role}`}
                  >
                    {u.role}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded border"
                    style={{ borderColor: TOKENS.border, color: u.status === "Active" ? TOKENS.text : TOKENS.muted }}
                    title={`Status: ${u.status}`}
                  >
                    {u.status}
                  </span>
                </label>
              )
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm" style={{ color: TOKENS.muted }}>
                No matches.
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: TOKENS.border }}>
            <button className="text-sm underline" onClick={() => onChange?.(safeOptions.map((o) => o.id))}>
              Select all
            </button>
            <button className="text-sm underline" onClick={() => onChange?.([])}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Role multi-select (popover) */
const ROLE_OPTIONS: Role[] = ["Admin", "Editor", "Viewer"]

function RolesPicker({
  selected = [],
  onChange = () => { },
}: {
  selected?: Role[]
  onChange?: (roles: Role[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  const sel = Array.isArray(selected) ? selected : []
  const toggleRole = (r: Role, check: boolean) => onChange?.(check ? [...sel, r] : sel.filter((x) => x !== r))

  const label = sel.length === 0 ? "Roles: All" : `Roles: ${sel.length} selected`

  return (
    <div className="relative" ref={ref}>
      <Chip
        label={label}
        leadingIcon={Shield}
        onClick={() => setOpen((s) => !s)}
        ariaControls="role-picker"
        ariaExpanded={open}
        dropdown
        open={open}
        brandFilterStyle
      />
      {open && (
        <div
          id="role-picker"
          className="absolute z-50 mt-2 min-w-[220px] bg-white shadow"
          role="menu"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="max-h-[260px] overflow-auto py-1">
            {ROLE_OPTIONS.map((r) => {
              const checked = sel.includes(r)
              return (
                <label key={r} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={checked} onChange={(e) => toggleRole(r, e.target.checked)} />
                  <span>{r}</span>
                </label>
              )
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: TOKENS.border }}>
            <button className="text-sm underline" onClick={() => onChange?.(ROLE_OPTIONS)}>
              Select all
            </button>
            <button className="text-sm underline" onClick={() => onChange?.([])}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Status multi-select (popover) */
const STATUS_OPTIONS: MemberStatus[] = ["Active", "Invited", "Suspended", "Deactivated"]

function StatusPicker({
  selected = [],
  onChange = () => { },
}: {
  selected?: MemberStatus[]
  onChange?: (statuses: MemberStatus[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  const sel = Array.isArray(selected) ? selected : []
  const toggleStatus = (s: MemberStatus, check: boolean) => onChange?.(check ? [...sel, s] : sel.filter((x) => x !== s))

  const label = sel.length === 0 ? "Status: All" : `Status: ${sel.length} selected`

  return (
    <div className="relative" ref={ref}>
      <Chip
        label={label}
        leadingIcon={SlidersHorizontal}
        onClick={() => setOpen((s) => !s)}
        ariaControls="status-picker"
        ariaExpanded={open}
        dropdown
        open={open}
        brandFilterStyle
      />
      {open && (
        <div
          id="status-picker"
          className="absolute z-50 mt-2 min-w-[240px] bg-white shadow"
          role="menu"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="max-h-[260px] overflow-auto py-1">
            {STATUS_OPTIONS.map((s) => {
              const checked = sel.includes(s)
              return (
                <label key={s} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={checked} onChange={(e) => toggleStatus(s, e.target.checked)} />
                  <span>{s}</span>
                </label>
              )
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: TOKENS.border }}>
            <button className="text-sm underline" onClick={() => onChange?.(STATUS_OPTIONS)}>
              Select all
            </button>
            <button className="text-sm underline" onClick={() => onChange?.([])}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Saved Views chip & panel */
function SavedViews({
  currentName,
  onSave = () => { },
  onLoad = () => { },
  views = [],
  onDelete = () => { },
  onSetDefault = () => { },
  defaultName,
}: {
  currentName?: string
  onSave?: (name: string) => void
  onLoad?: (name: string) => void
  views?: string[]
  onDelete?: (name: string) => void
  onSetDefault?: (name: string) => void
  defaultName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  const [name, setName] = useState("")
  return (
    <div className="relative" ref={ref}>
      <Chip
        label={currentName ? `View: ${currentName}` : "Saved Views"}
        leadingIcon={Info}
        onClick={() => setOpen((s) => !s)}
        ariaControls="saved-views"
        ariaExpanded={open}
      />
      {open && (
        <div
          id="saved-views"
          className="absolute z-50 mt-2 min-w-[280px] bg-white shadow"
          role="menu"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="text-[12px]" style={{ color: TOKENS.muted }}>
              Save current filters as
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="w-full text-sm rounded border px-2 py-1.5 outline-none"
                style={{ borderColor: TOKENS.border }}
                placeholder="e.g., Editors • Active"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <PrimaryButton
                title="Save"
                onClick={() => {
                  if (name.trim()) {
                    onSave?.(name.trim())
                    setName("")
                  }
                }}
              >
                <Check className="size-4" />
              </PrimaryButton>
            </div>
          </div>
          <div className="max-h-[240px] overflow-auto">
            {views.length === 0 ? (
              <div className="px-3 py-3 text-sm" style={{ color: TOKENS.muted }}>
                No saved views yet.
              </div>
            ) : (
              views.map((v) => (
                <div key={v} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50">
                  <button className="text-left cursor-pointer" onClick={() => onLoad?.(v)}>
                    {v}
                    {v === defaultName ? " • default" : ""}
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="underline" onClick={() => onSetDefault?.(v)}>
                      Set default
                    </button>
                    <button className="underline text-red-600" onClick={() => onDelete?.(v)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Export menu */
function ExportMenu({
  onExport = () => { },
  disabled,
}: {
  onExport?: (fmt: "csv" | "pdf") => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <IconOnlyButton title="Export" onClick={() => !disabled && setOpen((s) => !s)} disabled={disabled}>
        <Upload className="size-4" />
      </IconOnlyButton>
      {open && !disabled && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[180px] bg-white shadow"
          role="menu"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          {[
            ["Export CSV", "csv"],
            ["Export PDF", "pdf"],
          ].map(([l, k]) => (
            <button
              key={k}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onExport?.(k as "csv" | "pdf")
                setOpen(false)
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Invite Team popover */
function InviteTeam({ onInvite = () => { } }: { onInvite?: (invites: { email: string; role: Role }[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  const [rows, setRows] = useState<{ email: string; role: Role }[]>([{ email: "", role: "Editor" }])

  const setEmail = (i: number, v: string) => {
    setRows((xs) => xs.map((r, idx) => (idx === i ? { ...r, email: v } : r)))
  }

  const setRole = (i: number, v: Role) => {
    setRows((xs) => xs.map((r, idx) => (idx === i ? { ...r, role: v } : r)))
  }

  const addRow = () => setRows((xs) => [...xs, { email: "", role: "Viewer" }])
  const removeRow = (i: number) => setRows((xs) => xs.filter((_, idx) => idx !== i))

  return (
    <div className="relative" ref={ref}>
      {/* <PrimaryButton title="Invite Team" onClick={() => setOpen((s) => !s)}>
        <UserPlus className="size-4" />
      </PrimaryButton> */}
      <DemoInviteModalCanvas />
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-[360px] bg-white shadow"
          style={{ borderRadius: 12, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="font-semibold text-sm">Invite Team Members</div>
            <div className="text-xs" style={{ color: TOKENS.muted }}>
              Add emails and choose roles (Admin / Editor / Viewer).
            </div>
          </div>
          <div className="p-3 space-y-2 max-h-[320px] overflow-auto">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="flex-1 rounded border px-2 py-1.5 text-sm outline-none"
                  style={{ borderColor: TOKENS.border }}
                  placeholder="name@company.com"
                  value={r.email}
                  onChange={(e) => setEmail(i, e.target.value)}
                />
                <select
                  className="rounded border px-2 py-1.5 text-sm outline-none cursor-pointer"
                  style={{ borderColor: TOKENS.border }}
                  value={r.role}
                  onChange={(e) => setRole(i, e.target.value as Role)}
                >
                  {(["Admin", "Editor", "Viewer"] as Role[]).map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                {rows.length > 1 && (
                  <button
                    className="text-xs underline text-red-600 cursor-pointer"
                    onClick={() => removeRow(i)}
                    title="Remove"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button className="text-sm underline cursor-pointer" onClick={addRow} title="Add another">
              + Add another
            </button>
          </div>
          <div
            className="flex items-center justify-end gap-2 px-3 py-2 border-t"
            style={{ borderColor: TOKENS.border }}
          >
            <button className="text-sm underline cursor-pointer" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <PrimaryButton
              title="Send Invites"
              onClick={() => {
                const clean = rows.filter((r) => r.email.trim())
                onInvite?.(clean)
                setOpen(false)
              }}
            >
              <SendIcon />
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="translate-y-[1px]">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/* ───────────────────────── Main Header (Team & Roles) ───────────────────────── */
export default function TeamRolesHeaderBar({
  defaultQuery,
  canExport = true,
  onQueryChange,
  onOpenFilters,
  onExport,
  onInvite,
  onSettings,
  onOpenRolesPermissions,
  title = "Team & Roles",
}: {
  defaultQuery?: Partial<TeamRolesQuery>
  canExport?: boolean
  onQueryChange?: (q: TeamRolesQuery) => void
  onOpenFilters?: () => void
  onExport?: (fmt: "csv" | "pdf") => void
  onInvite?: (invites: { email: string; role: Role }[]) => void
  onSettings?: () => void
  onOpenRolesPermissions?: () => void
  title?: string
}) {
  const dispatch = useDispatch<any>()
  const projects: any = useSelector(selectProjects)
  const teamSlice: any = useSelector((s: any) => s.team)

  const teamMemberOptions = useMemo<UserOption[]>(() => {
    const members = Array.isArray(teamSlice?.members) ? teamSlice.members : []
    return members.map((m: any) => {
      const projects = Array.isArray(m.projects) ? m.projects : []

      // Determine role from max access across dashboards
      let maxAccess = 0
      projects.forEach((p: any) => {
        ; (p.dashboards || []).forEach((d: any) => {
          const access = String(d?.access || "").toLowerCase()
          if (access === "admin") maxAccess = Math.max(maxAccess, 3)
          else if (access === "editor") maxAccess = Math.max(maxAccess, 2)
          else if (access === "viewer") maxAccess = Math.max(maxAccess, 1)
        })
      })
      const role: Role = maxAccess >= 3 ? "Admin" : maxAccess === 2 ? "Editor" : "Viewer"

      // Determine status
      const hasPending = projects.some((p: any) => String(p?.invitation_status || "").toLowerCase() === "pending")
      const isActive = projects.some(
        (p: any) =>
          String(p?.invitation_status || "").toLowerCase() === "accepted" &&
          (p.dashboards || []).some((d: any) => d?.active),
      )
      const status: MemberStatus = isActive ? "Active" : hasPending ? "Invited" : "Deactivated"

      return {
        id: String(m.member_id),
        name: m.member_name || m.member_email || `Member ${m.member_id}`,
        email: m.member_email,
        role,
        status,
      }
    })
  }, [teamSlice?.members])

  const [q, setQ] = useState<TeamRolesQuery>({
    members: defaultQuery?.members ?? [],
    roles: defaultQuery?.roles ?? [],
    statuses: defaultQuery?.statuses ?? [],
    savedView: defaultQuery?.savedView,
  })

  /* Saved views (local) */
  const [views, setViews] = useState<string[]>([])
  const [defaultViewName, setDefaultViewName] = useState<string | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)

  const isTeamLoading = !Array.isArray(teamSlice?.members)

  /* Debounced emit */
  useEffect(() => {
    const t = setTimeout(() => onQueryChange?.(q), 400)
    return () => clearTimeout(t)
  }, [q, onQueryChange])

  const activeFiltersCount = (q.members.length ? 1 : 0) + (q.roles.length ? 1 : 0) + (q.statuses.length ? 1 : 0)

  // fetch team once (cached in reducer)
  useEffect(() => {
    dispatch(fetchTeamDetails({ force: false }))
  }, [dispatch])

  // UI local states
  const [inviteOpen, setInviteOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const pendingRef = useRef<HTMLDivElement | null>(null)

  // Invite → Confirm glue
  const confirmData: any = useSelector(selectLastInviteResult)
  const mappedData = confirmData
    ? {
      success: confirmData.data.map((item: any) => ({
        email: item.member_email,
        notes: item.requested_access
          .map((ra: any) => {
            const dashboards = ra.dashboards.map((d: any) => `${d.type} (${d.access})`).join(", ")
            return `Project ${ra.project_id}: ${dashboards}`
          })
          .join(" | "),
      })),
      skipped: [],
    }
    : { success: [], skipped: [] }

  const confirmOpen = !!confirmData

  const handleCloseConfirm = useCallback(() => {
    dispatch(clearLastInviteResult())
  }, [dispatch])

  return (
    <div
      className="font-sans text-[14px] supports-[backdrop-filter]:bg-white/80 border-b"
      style={{ borderColor: TOKENS.border }}
      role="region"
      aria-label="Team & Roles Header"
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
            {title}
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full border"
            style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
          >
            Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : "(0)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PrimaryButton title="Invite Team" onClick={() => setInviteOpen((s) => !s)}>
            <UserPlus className="size-4" />
          </PrimaryButton>
          <SecondaryButton title="Roles & Permissions" onClick={() => setRolesOpen((s) => !s)}>
            <UserPlus className="size-4" />
          </SecondaryButton>

          <ExportMenu disabled={!canExport} onExport={(fmt) => onExport?.(fmt)} />
          <IconOnlyButton title="Settings" onClick={onSettings}>
            <Settings className="size-4" />
          </IconOnlyButton>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <TeamMemberPicker
            options={teamMemberOptions}
            selected={q.members}
            onChange={(ids) => setQ((prev) => ({ ...prev, members: ids }))}
          />

          <RolesPicker selected={q.roles} onChange={(roles) => setQ((prev) => ({ ...prev, roles }))} />

          <StatusPicker selected={q.statuses} onChange={(statuses) => setQ((prev) => ({ ...prev, statuses }))} />

          <div className="ml-auto flex items-center gap-2">
            <div className=" flex items-center gap-2">
              <SavedViews
                currentName={q.savedView}
                views={views}
                defaultName={defaultViewName}
                onSave={(name) => {
                  setViews((xs) => (xs.includes(name) ? xs : [...xs, name]))
                  setQ((prev) => ({ ...prev, savedView: name }))
                }}
                onLoad={(name) => setQ((prev) => ({ ...prev, savedView: name }))}
                onDelete={(name) => {
                  setViews((xs) => xs.filter((x) => x !== name))
                  if (q.savedView === name) setQ((prev) => ({ ...prev, savedView: undefined }))
                }}
                onSetDefault={(name) => setDefaultViewName(name)}
              />
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
              <Info size={14} />
              <span>Filters update Members & Roles lists and any linked tables/charts in sync.</span>
            </div>
          </div>
          <TeamActivitySummaryV21 team={teamSlice} filters={q} loading={isTeamLoading} refreshKey={refreshKey} />
          <ActiveMembersSection />
          <PendingInvitesSectionDemo  onFiltersChange={""}  filters={""} loading={""}/>
        </div>
      </div>

      <RolesPermissionsConfigModal open={rolesOpen} onClose={() => setRolesOpen(false)} />

      {/* Invite member → confirmation */}
      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onResult={(_res: InviteConfirmIn) => {
          dispatch(fetchTeamDetails({ force: true }))
        }}
      />
      <InviteConfirmModal
        open={confirmOpen}
        data={mappedData || { success: [], skipped: [] }}
        onClose={handleCloseConfirm}
        onViewPending={() => {
          handleCloseConfirm()
          pendingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        onInviteMore={() => {
          handleCloseConfirm()
          setInviteOpen(true)
        }}
        onOpenAccessEditor={(email) => {
          handleCloseConfirm()
          alert(`Open Manage Access for: ${email}`)
        }}
        onEditAndReinvite={() => {
          handleCloseConfirm()
          setInviteOpen(true)
        }}
      />
    </div>
  )
}
