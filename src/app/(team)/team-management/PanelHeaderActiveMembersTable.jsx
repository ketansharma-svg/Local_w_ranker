// src/components/team/PanelHeaderActiveMembersTable.jsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useDispatch, useSelector } from "react-redux"
import { Popover, Tag, Tooltip } from "antd"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react"

import {
  fetchTeamDetails,
  removeMember,
  resendInvite,
  selectMembersRaw,
  selectTeamLoading,
  updateMemberAccess, 
} from "@/src/redux/reducer/teamReducer"
import ManageAccessModal from "./ManageAccessModal"

/* ======================= */
const TOKENS_CSS = `:root{--brand:#008CCD;--brand-hover:#007DB3;--value-blue:#0077FF;--good:#10B981;--info:#3B82F6;--warning:#F59E0B;--critical:#EF4444;--ink:#111827;--muted:#6B7280;--border:#EFF0F6;--chip:#F5F7FA;--chip-hover:#E5E7EB;--bg:#FFFFFF;--row-hover:#FAFAFC;--radius:6px;--focus:0 0 0 3px rgba(0,140,205,0.25);} 
.wr-btn{border-radius:var(--radius);font-weight:500;line-height:1;padding:.625rem .9rem;border:1px solid transparent;cursor:pointer}
.wr-btn:focus-visible{outline:none;box-shadow:var(--focus)}
.wr-btn--primary{background:var(--brand);color:#fff}
.wr-btn--primary:hover{background:var(--brand-hover)}
.wr-btn--outline{background:#fff;border-color:var(--border);color:var(--ink)}
.wr-btn--outline:hover{background:#F5F7FA}
.wr-btn[disabled]{cursor:not-allowed;opacity:.55}
.wr-iconbtn{background:transparent;border:1px solid var(--border);border-radius:8px;padding:.35rem .45rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.wr-iconbtn:hover{background:#F5F7FA}
.wr-iconbtn[disabled]{cursor:not-allowed;opacity:.55}
.wr-tag{display:inline-flex;align-items:center;padding:.15rem .5rem;border-radius:999px;font-size:.75rem;gap:.35rem;border:1px solid transparent}
.wr-tag--good{background:rgba(16,185,129,.08);color:var(--good)}
.wr-tag--warn{background:rgba(245,158,11,.1);color:var(--warning)}
.wr-tag--crit{background:rgba(239,68,68,.1);color:var(--critical)}
.wr-tag--neutral{background:#F5F7FA;color:var(--muted);border-color:var(--border)}
.pill{background:var(--chip);border:1px solid var(--border);border-radius:999px;padding:.2rem .6rem;font-size:.75rem;color:var(--ink)}
.pill--muted{color:var(--muted)}
.wr-table{width:100%;border-collapse:separate;border-spacing:0}
.wr-th,.wr-td{text-align:left;padding:14px 16px;border-bottom:1px solid var(--border)}
.wr-tr:hover{background:var(--row-hover)}
.wr-thead .wr-th{position:sticky;top:0;background:#fff;z-index:1}
.wr-input{width:100%;border:1px solid var(--border);border-radius:var(--radius);padding:.55rem .75rem;font-size:.95rem}
.wr-input:focus{outline:none;box-shadow:var(--focus)}
.wr-select{border:1px solid var(--border);border-radius:var(--radius);padding:.45rem .6rem;background:#fff}
.wr-chip{background:var(--chip);border:1px solid var(--border);border-radius:999px;padding:.2rem .5rem;font-size:.8rem}
.section{background:#fff;border:1px solid var(--border);border-radius:var(--radius)}
.headerbar{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--border)}
`

function useInjectCss(css) {
  useEffect(() => {
    const el = document.createElement("style")
    el.setAttribute("data-wr", "tokens")
    el.innerHTML = css
    document.head.appendChild(el)
    return () => {
      document.head.removeChild(el)
    }
  }, [css])
}

/* --------------------- */
function debounce(fn, delay = 300) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}
function relativeTime(iso) {
  if (!iso) return "—"
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`
  return new Date(then).toLocaleString("en-GB")
}
function csvEscape(v) {
  if (v == null) return ""
  const s = String(v).replace(/"/g, '""')
  return /[,"\n]/.test(s) ? `"${s}"` : s
}
function exportCsv(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 0)
}

/* --------------------- */
function normalizeMembers(raw) {
  const roleRank = { owner: 4, admin: 3, editor: 2, viewer: 1 }
  return (raw || []).map((m) => {
    const rolesMap = new Map()
    const dashboardsSet = new Set()
    let status = "pending"
    const projects = (m.projects || []).map((p) => {
      if (p.invitation_status === "Accepted") status = "active"
      const dashboards = (p.dashboards || []).map((d, idx) => {
        const type = (d.type || "").toLowerCase()
        const dashKey = type.startsWith("task")
          ? "taskboard"
          : type.startsWith("repo")
          ? "reporting"
          : type.startsWith("cont")
          ? "content"
          : "seo"

        dashboardsSet.add(dashKey)
        const role = (d.access || "viewer").toLowerCase()
        if (!rolesMap.has(dashKey) || roleRank[role] > roleRank[rolesMap.get(dashKey)]) rolesMap.set(dashKey, role)
        const id = d.id ?? `${m.member_id}-${p.project_id}-${type}-${idx}`
        return { id, type: d.type, access: d.access, active: !!d.active }
      })

      return {
        projectId: p.project_id,
        projectName: p.project_name || p.project_domain || `Project ${p.project_id}`,
        domain: p.project_domain || null,
        teamId: p.team_id || null,
        status: p.invitation_status || "Pending",
        invitation_date: p.invitation_date || null,
        accepted_date: p.accepted_date || null,
        declined_date: p.declined_date || null,
        notes: p.notes || "",
        dashboards,
      }
    })
    return {
      user_id: String(m.member_id),
      name: m.member_name,
      email: m.member_email,
      status,
      roles: Array.from(rolesMap.entries()).map(([dashboard, role]) => ({ dashboard, role })),
      dashboards: Array.from(dashboardsSet),
      projects,
      _raw: m,
      last_active_at: projects[0]?.accepted_date || null,
      inactivity_days: m.inactivity_days ?? null,
    }
  })
}

/* --------------------- */
function MenuItem({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        border: "none",
        background: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}
function prettyRole(role) {
  if (typeof role === "string") return role.charAt(0).toUpperCase() + role.slice(1)
  return "Viewer"
}
function prettyDash(d) {
  return d === "seo" ? "SEO" : d === "content" ? "Content" : d === "reporting" ? "Reporting" : "TaskBoard"
}
function dashEmoji(d) {
  return d === "seo" ? "🟦" : d === "content" ? "🟩" : d === "reporting" ? "🟨" : "🟥"
}
function mmss(total) {
  const m = Math.floor(total / 60),
    s = total % 60
  return `${String(m)}:${String(s).padStart(2, "0")}`
}

/* ---------------- Floating portal menu (does not affect table height) ---- */
function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose()
    }
    function onClick(e) {
      if (!ref.current) return
      if (!ref.current.contains(e.target)) onClose()
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onClick)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onClick)
    }
  }, [onClose, ref])
}

function FloatingMenu({ anchorRect, width = 240, onClose, children }) {
  const menuRef = useRef(null)
  useOutsideClose(menuRef, onClose)

  if (!anchorRect) return null
  const vw = typeof window !== "undefined" ? window.innerWidth : 0
  const vh = typeof window !== "undefined" ? window.innerHeight : 0
  const left = Math.min(Math.max(8, anchorRect.right - width), vw - width - 8)
  const top = Math.min(anchorRect.bottom + 8, vh - 8)

  return createPortal(
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "transparent",
        }}
      />
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top,
          left,
          width,
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 8,
          boxShadow: "0 8px 28px rgba(0,0,0,.12)",
          zIndex: 1001,
          overflow: "hidden",
        }}
        role="menu"
      >
        {children}
      </div>
    </>,
    document.body,
  )
}

/* --------------------- */
export function TeamHeader({ onInvite, onRolesConfig, onMoreAction }) {
  useInjectCss(TOKENS_CSS)
  return (
    <div className="headerbar" style={{ padding: "14px 16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--ink)" }}>Team & Roles</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: ".9rem" }}>
            Manage users, roles, invitations, and access across projects and dashboards.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button className="wr-btn wr-btn--primary" onClick={onInvite} aria-label="Invite member">
            + Invite Member
          </button>
          <button className="wr-btn wr-btn--outline" onClick={onRolesConfig} aria-label="Open Roles & Permissions">
            Roles & Permissions
          </button>
          <button
            className="wr-iconbtn"
            aria-label="Help: How roles work"
            onClick={() => window.open("https://example.com/help/roles", "_blank")}
          >
            ?
          </button>
          <div style={{ position: "relative" }}>
            <button
              className="wr-iconbtn"
              aria-label="More menu"
              onClick={(e) => {
                const menu = e.currentTarget.nextSibling
                menu.style.display = menu.style.display === "block" ? "none" : "block"
              }}
            >
              <MoreHorizontal size={18} />
            </button>
            <div
              style={{
                display: "none",
                position: "absolute",
                right: 0,
                top: "36px",
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                minWidth: "180px",
                boxShadow: "0 4px 20px rgba(0,0,0,.06)",
                zIndex: 10,
              }}
            >
              <MenuItem label="Export Members (CSV)" onClick={() => onMoreAction?.("export")} />
              <MenuItem label="Open Activity Log" onClick={() => onMoreAction?.("open_log")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


  /* Small subcomponents used in table body */
  function Avatar({ name }) {
    const initials = (name || "")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    return (
      <div
        aria-hidden
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "#E5F4FA",
          color: "#007DB3",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
        }}
      >
        {initials}
      </div>
    )
  }
  function StatusBadge({ m }) {
    const inactive = m.status === "active" && (m.inactivity_days ?? 0) >= 30
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {m.status === "active" && <span className="wr-tag wr-tag--good">● Active</span>}
        {m.status === "pending" && <span className="wr-tag wr-tag--warn">● Pending</span>}
        {m.status === "removed" && <span className="wr-tag wr-tag--crit">● Removed</span>}
        {inactive && <span className="wr-tag wr-tag--warn">⚠ Inactive {m.inactivity_days}d</span>}
      </div>
    )
  }
  function RoleBadge({ dashboard, role }) {
    const label = `${prettyRole(role)} — ${prettyDash(dashboard)}`
    const style = {
      borderRadius: 999,
      padding: ".2rem .55rem",
      fontSize: ".8rem",
      border: "1px solid transparent",
      color: "#fff",
    }
    if (role === "admin") style.background = "var(--value-blue)"
    else if (role === "editor") style.background = "var(--good)"
    else if (role === "viewer") style.background = "#6B7280"
    else if (role === "owner") style.background = "var(--brand)"
    else {
      style.background = "#fff"
      style.border = "1px solid var(--border)"
      style.color = "var(--ink)"
    }
    return (
      <span title={label} style={style}>
        {label}
      </span>
    )
  }

  function ProjectSummary({ projects, member }) {
    if (projects.length === 0) {
      return <div style={{ color: "var(--muted)" }}>No projects</div>
    }

    const acceptedCount = projects.filter((p) => p.status === "Accepted").length
    const pendingCount = projects.filter((p) => p.status === "Pending").length

    const projectsContent = (
      <div style={{ maxWidth: 400, maxHeight: 300, overflowY: "auto" }}>
        {projects.map((p) => (
          <div
            key={p.projectId}
            style={{
              padding: "12px",
              borderBottom: "1px solid var(--border)",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {(p.domain || p.projectName || "PR").slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.projectName}</div>
                {p.domain && <div style={{ color: "var(--muted)", fontSize: 11 }}>{p.domain}</div>}
              </div>
              <Tag color={p.status === "Accepted" ? "green" : "orange"} size="small">
                {p.status}
              </Tag>
            </div>

            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
              Invited: {p.invitation_date ? new Date(p.invitation_date).toLocaleDateString("en-GB") : "—"}
              {p.accepted_date && (
                <span style={{ marginLeft: 8 }}>
                  • Accepted: {new Date(p.accepted_date).toLocaleDateString("en-GB")}
                </span>
              )}
            </div>

            {p.dashboards.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {p.dashboards.slice(0, 4).map((d, i) => (
                  <Tag key={i} size="small" style={{ fontSize: 10 }}>
                    {d.type} · {d.access}
                  </Tag>
                ))}
                {p.dashboards.length > 4 && (
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>+{p.dashboards.length - 4} more</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )

    return (
      <Popover
        content={projectsContent}
        title={`${member.name}'s Projects (${projects.length})`}
        trigger="hover"
        placement="left"
        overlayStyle={{ maxWidth: 450 }}
      >
        <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{projects.length}</span>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>project{projects.length !== 1 ? "s" : ""}</span>
          </div>
          {acceptedCount > 0 && (
            <Tag color="green" size="small">
              {acceptedCount} active
            </Tag>
          )}
          {pendingCount > 0 && (
            <Tag color="orange" size="small">
              {pendingCount} pending
            </Tag>
          )}
        </div>
      </Popover>
    )
  }

  function ExpandedProjectDetails({ projects }) {
    return (
      <div style={{ padding: "16px", background: "var(--chip)", borderRadius: 8 }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600 }}>Project Details</h4>
        <div style={{ display: "grid", gap: 12 }}>
          {projects.map((p) => (
            <div
              key={p.projectId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px",
                borderRadius: 8,
                background: "#fff",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: "var(--chip)",
                    border: "1px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  {(p.domain || p.projectName || "PR").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <strong style={{ fontSize: 13 }}>{p.projectName}</strong>
                    {p.domain && <span style={{ color: "var(--muted)", fontSize: 12 }}>{p.domain}</span>}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      Invited: {p.invitation_date ? new Date(p.invitation_date).toLocaleDateString("en-GB") : "—"}
                    </span>
                    {p.accepted_date && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        Accepted: {new Date(p.accepted_date).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <Tag color={p.status === "Accepted" ? "green" : "orange"}>{p.status}</Tag>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {p.dashboards.slice(0, 3).map((d, i) => (
                    <Tag key={i} size="small" style={{ fontSize: 10 }}>
                      {d.type} · {d.access}
                    </Tag>
                  ))}
                  {p.dashboards.length > 3 && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>+{p.dashboards.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

 /* --------------------- */
export function ActiveMembersTable() {
  useInjectCss(TOKENS_CSS)

  const dispatch = useDispatch()
  const rawMembers = useSelector(selectMembersRaw)
  
  const loading = useSelector(selectTeamLoading)

  // Ensure reducer has data (cached fetch)
  useEffect(() => {
    dispatch(fetchTeamDetails({ force: false }))
  }, [dispatch])

    const [filters, setFilters] = useState({
    query: "",
    roles: [],
    status: ["active", "pending"],
    dashboards: [],
    projects: [],
    sort: "last_active_desc",
    page: 1,
    pageSize: 25,
  })

  const rows = useMemo(() => normalizeMembers(rawMembers), [rawMembers])

const query = (filters.query || "").trim().toLowerCase();

const filtered = useMemo(() => {
  if (!rows?.length) return [];
  if (!query) return rows;

  return rows.filter((r) => {
    const name = (r.name || "").toLowerCase();
    const email = (r.email || "").toLowerCase();
    return name.includes(query) || email.includes(query);
  });
}, [rows, query]);

const total = filtered.length;
const start = total ? (filters.page - 1) * filters.pageSize + 1 : 0;
const end = Math.min(filters.page * filters.pageSize, total);

const paginated = useMemo(() => {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize;
  return filtered.slice(from, to);
}, [filtered, filters.page, filters.pageSize]);



  const [cooldown, setCooldown] = useState({}) // email -> seconds remaining
  const [manageAccessOpen, setManageAccessOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [menuState, setMenuState] = useState({ open: false, rect: null, member: null })

  useEffect(() => {
    if (!Object.keys(cooldown).length) return
    const id = setInterval(() => {
      setCooldown((prev) => {
        const next = {}
        let any = false
        for (const k of Object.keys(prev)) {
          const t = Math.max(0, prev[k] - 1)
          if (t > 0) {
            next[k] = t
            any = true
          }
        }
        return any ? next : {}
      })
    }, 1000)
    return () => clearInterval(id)
  }, [cooldown])

const onSearch = (v) => setFilters((f) => ({ ...f, query: v, page: 1 }));
  function resetFilters() {
    setFilters({
      query: "",
      roles: [],
      status: ["active", "pending"],
      dashboards: [],
      projects: [],
      sort: "last_active_desc",
      page: 1,
      pageSize: 25,
    })
  }

  function exportVisible() {
    exportCsv(
      "members.csv",
      rows.map((r) => ({
        name: r.name,
        email: r.email,
        status: r.status,
        roles: r.roles.map((x) => `${prettyRole(x.role)} — ${prettyDash(x.dashboard)}`).join("; "),
        projects: r.projects.map((p) => p.projectName).join("; "),
        dashboards: r.dashboards.join(","),
        lastActive: relativeTime(r.last_active_at),
        inactivityDays: r.inactivity_days ?? "",
      })),
    )
  }

  async function onResend(email) {
    try {
      const res = await dispatch(resendInvite({ email })).unwrap()
      const secs = (res && (res.resend_cooldown_seconds ?? res.cooldownSeconds ?? res.cooldown)) || 120
      setCooldown((prev) => ({ ...prev, [email]: secs }))
      toast(`Invite resent to ${email}`)
    } catch (e) {
      const secs = e?.seconds ?? e?.payload?.seconds ?? null
      if (secs) {
        setCooldown((prev) => ({ ...prev, [email]: secs }))
        toast(`Try again in ${secs}s`)
        return
      }
      toast("Could not resend invite")
    }
  }

  async function onRemove(m) {
    if (m.roles.some((r) => r.role === "owner")) {
      toast("Owner cannot be removed.")
      return
    }
    const suffix = m.has_pending_tasks ? "\n\nThey still own active tasks. Reassign before removal." : ""
    if (!confirm(`Remove ${m.name} from the workspace? This revokes access to all projects.${suffix}`)) return
    try {
      await dispatch(removeMember({ member_id: m.user_id })).unwrap()
      dispatch(fetchTeamDetails({ force: true }))
      toast(`Removed ${m.name}`)
    } catch {
      toast("Could not remove user")
    }
  }

  function openManageAccess(member) {
    const hasAcceptedProjects = member.projects.some((p) => p.status === "Accepted")
    if (!hasAcceptedProjects) {
      toast("Can only manage access for accepted members")
      return
    }
    setSelectedMember(member)
    setManageAccessOpen(true)
  }

  async function updateAccess(dashboard_id, dashboard_type, access_level) {
    try {
      await dispatch(
        updateMemberAccess({
          dashboard_id: dashboard_id,
          dashboard_type: dashboard_type,
          access_level: access_level,
        }),
      ).unwrap()
      dispatch(fetchTeamDetails({ force: true }))
      toast(`Access updated successfully`)
    } catch (error) {
      toast("Failed to update access")
    }
  }



  function ActionsMenu({ member }) {
    const canResend = member.status === "pending"
    const cd = cooldown[member.email] ?? 0
    const isOwnerRow = member.roles.some((r) => r.role === "owner")
    const hasAcceptedProjects = member.projects.some((p) => p.status === "Accepted")

    const triggerRef = useRef(null)

    const openMenu = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuState({ open: true, rect, member })
    }

    const closeMenu = () => setMenuState({ open: false, rect: null, member: null })

    return (
      <div style={{ position: "relative" }}>
        <button
          className="wr-iconbtn"
          ref={triggerRef}
          aria-label="Row actions"
          onClick={openMenu}
          type="button"
        >
          <MoreHorizontal size={18} />
        </button>

        {menuState.open && menuState.member?.user_id === member.user_id && (
          <FloatingMenu anchorRect={menuState.rect} onClose={closeMenu}>
            <MenuItem label="View Activity" onClick={() => { closeMenu(); alert(`Open activity for ${member.name}`) }} />
            <MenuItem
              label="Manage Access"
              onClick={() => {
                closeMenu()
                openManageAccess(member)
              }}
              disabled={!hasAcceptedProjects}
            />
            {canResend && (
              <MenuItem
                label={cd > 0 ? `Resend Invite (in ${mmss(cd)})` : "Resend Invite"}
                disabled={cd > 0}
                onClick={() => {
                  closeMenu()
                  onResend(member.email)
                }}
              />
            )}
            {!isOwnerRow && member.status !== "removed" && (
              <MenuItem label="Remove Member" onClick={() => { closeMenu(); onRemove(member) }} />
            )}
          </FloatingMenu>
        )}
      </div>
    )
  }

  function toggleRowExpansion(userId) {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  return (
    <section className="section" aria-label="Active Members">
      {/* Filter bar */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 56,
          background: "#fff",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
<input
  className="wr-input"
  style={{ maxWidth: 320 }}
  placeholder="Search by name or email…"
  value={filters.query}
  onChange={(e) => onSearch(e.target.value)}
  aria-label="Search members"
/>

          <button className="wr-btn wr-btn--outline" onClick={resetFilters} aria-label="Reset filters">
            Reset
          </button>
          <div style={{ flex: 1 }} />
          <button className="wr-btn wr-btn--outline" onClick={exportVisible} aria-label="Export CSV">
            Export CSV
          </button>
        </div>
<div aria-live="polite" style={{ marginTop: 6, fontSize: ".85rem", color: "var(--muted)" }}>
  {loading
    ? "Loading…"
    : `${total} result${total !== 1 ? "s" : ""}${total ? ` • showing ${start}–${end}` : ""}`}
</div>

      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="wr-table" role="grid" aria-rowcount={total}>
          <thead className="wr-thead">
            <tr>
              <th className="wr-th" style={{ width: "40px" }}></th>
              <th className="wr-th">Name & Email</th>
              <th className="wr-th">Status</th>
              <th className="wr-th">Roles</th>
              <th className="wr-th">Projects</th>
              <th className="wr-th">Dashboards</th>
              <th className="wr-th">Last Active</th>
              <th className="wr-th" aria-label="Actions">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr className="wr-tr">
                <td className="wr-td" colSpan={8}>
                  Loading…
                </td>
              </tr>
            )}
{!loading && filtered.length === 0 && (
  <tr className="wr-tr">
    <td className="wr-td" colSpan={8}>
      No members match your filters.
      <button
        className="wr-btn wr-btn--outline"
        onClick={resetFilters}
        style={{ marginLeft: 8 }}
      >
        Clear filters
      </button>
    </td>
  </tr>
)}
{!loading &&
  paginated.map((m) => (
    <FragmentRow
      key={m.user_id}
      member={m}
      isExpanded={expandedRows.has(m.user_id)}
      onToggle={() => toggleRowExpansion(m.user_id)}
      onManageAccess={openManageAccess}
    >
      <ActionsMenu member={m} />
    </FragmentRow>
))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px" }}>
        <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>
          Showing {start}–{end} of {total}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="wr-btn wr-btn--outline"
            disabled={filters.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
          >
            Prev
          </button>
          <button
            className="wr-btn wr-btn--outline"
            disabled={end >= total}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Next
          </button>
        </div>
      </div>

      {manageAccessOpen && selectedMember && (
        <ManageAccessModal
          member={selectedMember}
          onClose={() => {
            setManageAccessOpen(false)
            setSelectedMember(null)
          }}
          onUpdateAccess={updateAccess}
        />
      )}
    </section>
  )
}

/* ---- Row component with Lucide toggle + framer-motion expansion ---------- */
/* NOTE: added `onManageAccess` param so the row-level Manage Access button opens the modal */
function FragmentRow({ member: m, isExpanded, onToggle, children, onManageAccess }) {
  return (
    <>
      <tr className="wr-tr" tabIndex={0}>
        <td className="wr-td" style={{ width: "40px", padding: "8px" }}>
          {m.projects.length > 0 && (
            <Tooltip title={isExpanded ? "Collapse details" : "Expand details"}>
              <button className="wr-iconbtn" onClick={onToggle} style={{ fontSize: "12px" }} aria-label="Expand row">
                <motion.span
                  initial={false}
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: "inline-flex" }}
                >
                  <ChevronRight size={16} />
                </motion.span>
              </button>
            </Tooltip>
          )}
        </td>
        <td className="wr-td" style={{ maxWidth: 240 }}>
          <div className="flex items-center gap-3">
            <Avatar name={m.name} />
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="shrink-0">{m.name}</strong>
                {m._raw?.tags?.map((t, i) => (
                  <span key={i} className="pill pill--muted" aria-label={t.replace("_", " ")}>
                    {t.replace("_", " ")}
                  </span>
                ))}
                {m.roles.some((r) => r.role === "owner") && (
                  <span className="pill" title="Owner (locked)">
                    🔒 Owner
                  </span>
                )}
              </div>
              <span className="text-muted-foreground break-words">{m.email}</span>
            </div>
          </div>
        </td>
        <td className="wr-td" style={{ minWidth: 120 }}>
          <StatusBadge m={m} />
        </td>
        <td className="wr-td" style={{ minWidth: 200 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {m.roles.slice(0, 2).map((r, i) => (
              <RoleBadge key={i} dashboard={r.dashboard} role={r.role} />
            ))}
            {m.roles.length > 2 && (
              <Tooltip
                title={m.roles
                  .slice(2)
                  .map((r) => `${prettyRole(r.role)} — ${prettyDash(r.dashboard)}`)
                  .join(", ")}
              >
                <span className="wr-chip" style={{ cursor: "help" }}>
                  +{m.roles.length - 2} more
                </span>
              </Tooltip>
            )}
          </div>
        </td>
        <td className="wr-td" style={{ minWidth: 160 }}>
          <ProjectSummary projects={m.projects} member={m} />
        </td>
        <td className="wr-td" style={{ minWidth: 140 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {m.dashboards.slice(0, 3).map((d) => (
              <span
                key={d}
                className="wr-chip"
                role="button"
                title={prettyDash(d)}
                onClick={() => alert(`Filter by ${prettyDash(d)}`)}
                aria-label={`${prettyDash(d)} dashboard enabled`}
              >
                {dashEmoji(d)} {d === "taskboard" ? "Task" : prettyDash(d)}
              </span>
            ))}
            {m.dashboards.length > 3 && (
              <Tooltip title={m.dashboards.slice(3).map(prettyDash).join(", ")}>
                <span className="wr-chip" style={{ cursor: "help" }}>
                  +{m.dashboards.length - 3}
                </span>
              </Tooltip>
            )}
          </div>
        </td>
        <td className="wr-td" style={{ minWidth: 140 }}>
          <span title={m.last_active_at || "No activity"}>{relativeTime(m.last_active_at)}</span>
        </td>
        <td className="wr-td" style={{ width: 140 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="wr-btn wr-btn--outline"
              onClick={() => onManageAccess && onManageAccess(m)}
              aria-label={`Manage access for ${m.name}`}
              disabled={!m.projects.some((p) => p.status === "Accepted")}
              style={{ cursor: !m.projects.some((p) => p.status === "Accepted") ? "not-allowed" : "pointer" }}
            >
              Manage Access
            </button>
            {children}
          </div>
        </td>
      </tr>

      {/* Smooth expanding details */}
      <tr>
        <td colSpan={8} style={{ padding: 0, border: "none" }}>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
                style={{ overflow: "hidden" }}
              >
                <ExpandedProjectDetails projects={m.projects} />
              </motion.div>
            )}
          </AnimatePresence>
        </td>
      </tr>
    </>
  )
}

/* tiny toast shim retained */
function toast(msg) {
  if (typeof window !== "undefined") console.log("[toast]", msg)
}
