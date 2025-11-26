"use client"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import styled from "styled-components"

/* ─────────────────────────────────────────────────────────
   Design Tokens (aligned with previous sections)
   ───────────────────────────────────────────────────────── */
const TK = {
  brand: "#1090D0",
  text: "#000000",
  muted: "#282829",
  surface: "#FFFFFF",
  subtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  accent: "#D2EFFF",
  radius: 10,
  status: {
    notStarted: "#CBD5E1",
    inProgress: "#1090D0",
    review: "#FF9F43",
    completed: "#28C76F",
    overdue: "#EA5455",
  },
  priority: {
    high: "#EA5455",
    medium: "#FF9F43",
    low: "#9AA4B2",
  },
}

/* ─────────────────────────────────────────────────────────
   Helpers (dates + utils) — safe ISO parsing
   ───────────────────────────────────────────────────────── */
const MS_DAY = 86400000
const todayISO = () => toISO(new Date())
function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
function parseISO(dateStr: string) {
  // Safer than new Date(iso) to avoid timezone/invalid issues
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * MS_DAY)
}
function isBetween(iso: string, start?: string, end?: string) {
  if (!iso) return false
  const t = parseISO(iso).getTime()
  if (start && t < parseISO(start).getTime()) return false
  if (end && t > parseISO(end).getTime()) return false
  return true
}

/* ─────────────────────────────────────────────────────────
   Demo data (single-project)
   ───────────────────────────────────────────────────────── */
const MEMBERS = [
  { id: "richa", name: "Richa", initials: "RS", color: "#7C8CF8" },
  { id: "john", name: "John", initials: "JD", color: "#6AB0FF" },
  { id: "maya", name: "Maya", initials: "MP", color: "#7AD8B0" },
  { id: "vikash", name: "Vikash", initials: "VB", color: "#6D85B8" },
]

const STATUSES = ["Not Started", "In Progress", "Under Review", "Completed"] as const
const CTYPES = ["SEO", "Content", "Technical", "Reporting"] as const

function makeTasks(n = 48) {
  const base = new Date()
  const out: any[] = []
  for (let i = 0; i < n; i++) {
    const assignee = MEMBERS[i % MEMBERS.length]
    const status = STATUSES[(i * 3) % STATUSES.length]
    const ctype = CTYPES[i % CTYPES.length]
    const due = addDays(base, Math.floor(Math.random() * 30) - 10)
    out.push({
      id: `t-${i + 1}`,
      title: ["SEO Audit Plan", "Blog Draft", "Fix Core Web Vitals", "Reporting – Weekly KPI"][i % 4] + ` #${i + 1}`,
      ctype,
      status,
      priority: ["High", "Medium", "Low"][(i * 5) % 3],
      assigneeId: assignee.id,
      due: toISO(due),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────
   Small UI atoms
   ───────────────────────────────────────────────────────── */
const Avatar: React.FC<{ id: string; size?: number; title?: string }> = ({ id, size = 24, title }) => {
  const m = MEMBERS.find((x) => x.id === id)
  if (!m) return null
  return (
    <span
      className="wr-avatar"
      title={title || m.name}
      style={{ background: m.color, width: size, height: size, fontSize: size < 24 ? 10 : 12 }}
      aria-label={m.name}
    >
      {m.initials}
    </span>
  )
}

const Chip: React.FC<React.PropsWithChildren<{ active?: boolean; onClick?: () => void; title?: string }>> = ({
  active,
  onClick,
  children,
  title,
}) => (
  <button className={`wr-chip ${active ? "active" : ""}`} onClick={onClick} title={title}>
    {children}
  </button>
)

const Pill: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span className="wr-pill" style={{ color, background: `${color}1A`, borderColor: `${color}33` }}>
    {label}
  </span>
)

/* ─────────────────────────────────────────────────────────
   Drawer component
   ───────────────────────────────────────────────────────── */
type Draft = {
  ctypes: string[]
  statuses: string[]
  priorities: string[]
  assignees: string[] // ids
  dueStart?: string
  dueEnd?: string
  q: string
}

const DEFAULT_DRAFT: Draft = {
  ctypes: [...CTYPES],
  statuses: [...STATUSES],
  priorities: ["High", "Medium", "Low"],
  assignees: MEMBERS.map((m) => m.id),
  dueStart: undefined,
  dueEnd: undefined,
  q: "",
}

function countActive(d: Draft) {
  let n = 0
  if (d.ctypes.length !== CTYPES.length) n++
  if (d.statuses.length !== STATUSES.length) n++
  if (d.priorities.length !== 3) n++
  if (d.assignees.length !== MEMBERS.length) n++
  if (d.dueStart || d.dueEnd) n++
  if (d.q.trim()) n++
  return n
}

function quickPreset(name: "today" | "week" | "month") {
  const t = parseISO(todayISO())
  if (name === "today") return { start: toISO(t), end: toISO(t) }
  if (name === "week") {
    const start = addDays(t, -t.getDay()) // Sunday..Saturday
    const end = addDays(start, 6)
    return { start: toISO(start), end: toISO(end) }
  }
  // month
  const start = new Date(t.getFullYear(), t.getMonth(), 1)
  const end = new Date(t.getFullYear(), t.getMonth() + 1, 0)
  return { start: toISO(start), end: toISO(end) }
}

const PERSIST_KEY = "wr.project.filters"

/* Props:
   - projectName (display only)
   - open, onClose
   - value (applied filters), onApply(newDraft)
   - previewCount (optional number to show matches)
*/
const ProjectFiltersDrawer: React.FC<{
  projectName: string
  open: boolean
  onClose: () => void
  value: Draft
  onApply: (d: Draft) => void
  previewCount?: number
}> = ({ projectName, open, onClose, value, onApply, previewCount }) => {
  const [draft, setDraft] = useState<Draft>(value)
  useEffect(() => setDraft(value), [value, open])

  const nActive = countActive(draft)

  const setDatePreset = (p: "today" | "week" | "month") => {
    const { start, end } = quickPreset(p)
    setDraft((d) => ({ ...d, dueStart: start, dueEnd: end }))
  }

  return (
    <div className={`wr-drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Project Filters">
      <div className="wr-dh">
        <div className="wr-dh-t">
          <div className="wr-proj">Project:</div>
          <div className="wr-proj-name" title={projectName}>
            {projectName}
          </div>
        </div>
        <button className="wr-x" aria-label="Close Filters" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="wr-db">
        {/* Search */}
        <div className="wr-sec">
          <div className="wr-sec-title">Search Task Name</div>
          <input
            className="wr-input"
            placeholder="Search by task title…"
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: (e.target as HTMLInputElement).value }))}
          />
        </div>

        {/* Campaign type */}
        <div className="wr-sec">
          <div className="wr-sec-title">Campaign Type</div>
          <div className="wr-row wrap">
            {CTYPES.map((t) => (
              <Chip
                key={t}
                active={draft.ctypes.includes(t)}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    ctypes: d.ctypes.includes(t) ? d.ctypes.filter((x) => x !== t) : [...d.ctypes, t],
                  }))
                }
              >
                {t}
              </Chip>
            ))}
          </div>
          <div className="wr-mini">
            <button className="wr-link" onClick={() => setDraft((d) => ({ ...d, ctypes: [...CTYPES] }))}>
              Select all
            </button>
            <button className="wr-link" onClick={() => setDraft((d) => ({ ...d, ctypes: [] }))}>
              Clear
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="wr-sec">
          <div className="wr-sec-title">Status</div>
          <div className="wr-col">
            {STATUSES.map((s) => (
              <label key={s} className="wr-check">
                <input
                  type="checkbox"
                  checked={draft.statuses.includes(s)}
                  onChange={() =>
                    setDraft((d) => ({
                      ...d,
                      statuses: d.statuses.includes(s) ? d.statuses.filter((x) => x !== s) : [...d.statuses, s],
                    }))
                  }
                />
                <span className="wr-check-lbl">{s}</span>
              </label>
            ))}
          </div>
          <div className="wr-mini">
            <button className="wr-link" onClick={() => setDraft((d) => ({ ...d, statuses: [...STATUSES] }))}>
              Select all
            </button>
            <button className="wr-link" onClick={() => setDraft((d) => ({ ...d, statuses: [] }))}>
              Clear
            </button>
          </div>
        </div>

        {/* Priority */}
        <div className="wr-sec">
          <div className="wr-sec-title">Priority</div>
          <div className="wr-row">
            {["High", "Medium", "Low"].map((p) => (
              <Chip
                key={p}
                active={draft.priorities.includes(p)}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    priorities: d.priorities.includes(p) ? d.priorities.filter((x) => x !== p) : [...d.priorities, p],
                  }))
                }
                title={`Priority: ${p}`}
              >
                {p}
              </Chip>
            ))}
          </div>
        </div>

        {/* Assignee */}
        <div className="wr-sec">
          <div className="wr-sec-title">Assignee</div>
          <div className="wr-col">
            {MEMBERS.map((m) => (
              <label key={m.id} className="wr-check">
                <input
                  type="checkbox"
                  checked={draft.assignees.includes(m.id)}
                  onChange={() =>
                    setDraft((d) => ({
                      ...d,
                      assignees: d.assignees.includes(m.id)
                        ? d.assignees.filter((x) => x !== m.id)
                        : [...d.assignees, m.id],
                    }))
                  }
                />
                <Avatar id={m.id} />
                <span className="wr-check-lbl">{m.name}</span>
              </label>
            ))}
          </div>
          <div className="wr-mini">
            <button
              className="wr-link"
              onClick={() => setDraft((d) => ({ ...d, assignees: MEMBERS.map((m) => m.id) }))}
            >
              Select all
            </button>
            <button className="wr-link" onClick={() => setDraft((d) => ({ ...d, assignees: [] }))}>
              Clear
            </button>
          </div>
        </div>

        {/* Due range */}
        <div className="wr-sec">
          <div className="wr-sec-title">Due Between</div>
          <div className="wr-row">
            <input
              className="wr-input"
              type="date"
              value={draft.dueStart || ""}
              onChange={(e) => setDraft((d) => ({ ...d, dueStart: (e.target as HTMLInputElement).value || undefined }))}
              aria-label="Start date"
            />
            <span style={{ alignSelf: "center" }}>—</span>
            <input
              className="wr-input"
              type="date"
              value={draft.dueEnd || ""}
              onChange={(e) => setDraft((d) => ({ ...d, dueEnd: (e.target as HTMLInputElement).value || undefined }))}
              aria-label="End date"
            />
          </div>
          <div className="wr-row">
            <button className="wr-chip ghost" onClick={() => setDatePreset("today")}>
              Today
            </button>
            <button className="wr-chip ghost" onClick={() => setDatePreset("week")}>
              This Week
            </button>
            <button className="wr-chip ghost" onClick={() => setDatePreset("month")}>
              This Month
            </button>
            <button
              className="wr-link"
              style={{ marginLeft: "auto" }}
              onClick={() => setDraft((d) => ({ ...d, dueStart: undefined, dueEnd: undefined }))}
            >
              Clear dates
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="wr-df">
        <div className="wr-df-left">
          {nActive > 0 ? (
            <span className="muted">
              {nActive} filter{nActive > 1 ? "s" : ""} selected
            </span>
          ) : (
            <span className="muted">No filters</span>
          )}
          {typeof previewCount === "number" && <span className="muted sep">•</span>}
          {typeof previewCount === "number" && (
            <span className="muted">
              {previewCount} match{previewCount === 1 ? "" : "es"}
            </span>
          )}
        </div>
        <div className="wr-df-right">
          <button
            className="wr-btn ghost"
            onClick={() => {
              setDraft({ ...DEFAULT_DRAFT, q: "" })
            }}
            title="Reset all filters"
          >
            Clear All
          </button>
          <button
            className="wr-btn"
            onClick={() => {
              onApply(draft)
              try {
                localStorage.setItem(PERSIST_KEY, JSON.stringify(draft))
              } catch {}
              onClose()
            }}
            title="Apply filters"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Demo page: header + Filters button + filtered table
   ───────────────────────────────────────────────────────── */
export default function ProjectScopedFiltersDemo() {
  const [tasks] = useState(() => makeTasks(64)) // sample dataset
  const [open, setOpen] = useState(false)

  // load persisted filters if available
  const [applied, setApplied] = useState<Draft>(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY)
      if (raw) return { ...DEFAULT_DRAFT, ...JSON.parse(raw) }
    } catch {}
    return { ...DEFAULT_DRAFT }
  })

  const nActive = countActive(applied)

  // apply filters
  const filtered = useMemo(() => {
    const q = applied.q.trim().toLowerCase()
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false
      if (!applied.ctypes.includes(t.ctype)) return false
      if (!applied.statuses.includes(t.status)) return false
      if (!applied.priorities.includes(t.priority)) return false
      if (!applied.assignees.includes(t.assigneeId)) return false
      if ((applied.dueStart || applied.dueEnd) && !isBetween(t.due, applied.dueStart, applied.dueEnd)) return false
      return true
    })
  }, [tasks, applied])

  // active filter summary chips (click to clear a category quickly)
  const SummaryChip: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
    <span className="wr-sum-chip">
      {label}
      <button className="x" aria-label="Remove filter" onClick={onClear}>
        ×
      </button>
    </span>
  )

  const projectName = "ABC Website (Demo)"

  return (
    <WrProjectFilters>

    <section className="wr-wrap">
      {/* Header bar (scoped to single project) */}
      <div className="wr-section-bar">
        <div className="wr-title">Project Gantt / Kanban / Table · Filters (Project‑Scoped)</div>
        <div className="wr-right">
          <button className="wr-btn ghost" onClick={() => setOpen(true)}>
            🔎 Filters{nActive > 0 ? ` (${nActive})` : ""}
          </button>
        </div>
      </div>

      {/* Active filters summary row */}
      {nActive > 0 && (
        <div className="wr-sum">
          {applied.q && <SummaryChip label={`“${applied.q}”`} onClear={() => setApplied((d) => ({ ...d, q: "" }))} />}
          {applied.ctypes.length !== CTYPES.length && (
            <SummaryChip
              label={`Type: ${applied.ctypes.join(", ")}`}
              onClear={() => setApplied((d) => ({ ...d, ctypes: [...CTYPES] }))}
            />
          )}
          {applied.statuses.length !== STATUSES.length && (
            <SummaryChip
              label={`Status: ${applied.statuses.join(", ")}`}
              onClear={() => setApplied((d) => ({ ...d, statuses: [...STATUSES] }))}
            />
          )}
          {applied.priorities.length !== 3 && (
            <SummaryChip
              label={`Priority: ${applied.priorities.join(", ")}`}
              onClear={() => setApplied((d) => ({ ...d, priorities: ["High", "Medium", "Low"] }))}
            />
          )}
          {applied.assignees.length !== MEMBERS.length && (
            <SummaryChip
              label={`Assignees: ${applied.assignees.length}`}
              onClear={() => setApplied((d) => ({ ...d, assignees: MEMBERS.map((m) => m.id) }))}
            />
          )}
          {(applied.dueStart || applied.dueEnd) && (
            <SummaryChip
              label={`Due: ${applied.dueStart || "…"} → ${applied.dueEnd || "…"}`}
              onClear={() => setApplied((d) => ({ ...d, dueStart: undefined, dueEnd: undefined }))}
            />
          )}
        </div>
      )}

      {/* Demo results table (compact) */}
      <div className="wr-table-wrap">
        <table className="wr-table" role="table" aria-label="Filtered tasks">
          <thead className="wr-thead">
            <tr>
              <th className="wr-th sticky left" style={{ minWidth: 260, width: 260 }}>
                Task Title
              </th>
              <th className="wr-th">Campaign</th>
              <th className="wr-th">Assignee</th>
              <th className="wr-th t-center">Priority</th>
              <th className="wr-th t-center">Status</th>
              <th className="wr-th t-right" style={{ width: 120 }}>
                Due
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const ass = MEMBERS.find((m) => m.id === r.assigneeId)!
              const dueColor =
                r.status !== "Completed" && parseISO(r.due) < parseISO(todayISO()) ? TK.status.overdue : TK.muted
              return (
                <tr key={r.id} className="wr-row">
                  <td className="wr-td sticky left">
                    <a className="wr-title" href="#" onClick={(e) => e.preventDefault()}>
                      {r.title}
                    </a>
                  </td>
                  <td className="wr-td">
                    <Pill label={r.ctype} color={TK.brand} />
                  </td>
                  <td className="wr-td">
                    <div className="wr-assignee">
                      <Avatar id={ass.id} /> <span>{ass.name}</span>
                    </div>
                  </td>
                  <td className="wr-td t-center">
                    <Pill
                      label={r.priority}
                      color={
                        r.priority === "High"
                          ? TK.priority.high
                          : r.priority === "Medium"
                            ? TK.priority.medium
                            : TK.priority.low
                      }
                    />
                  </td>
                  <td className="wr-td t-center">
                    <Pill
                      label={r.status}
                      color={
                        r.status === "Completed"
                          ? TK.status.completed
                          : r.status === "In Progress"
                            ? TK.status.inProgress
                            : r.status === "Under Review"
                              ? TK.status.review
                              : TK.status.notStarted
                      }
                    />
                  </td>
                  <td className="wr-td t-right" style={{ color: dueColor, fontWeight: 500 }}>
                    {r.due}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="wr-td" colSpan={6} style={{ color: TK.muted }}>
                  No tasks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <ProjectFiltersDrawer
        projectName={projectName}
        open={open}
        onClose={() => setOpen(false)}
        value={applied}
        onApply={setApplied}
        previewCount={filtered.length}
      />
    </section>
    </WrProjectFilters>

  )
}

export const WrProjectFilters = styled.div`
  /* wrapper + header */
  .wr-wrap {
    border: 1px solid ${TK.borderStrong};
    border-radius: ${TK.radius}px;
    background: ${TK.surface};
  }
  .wr-section-bar {
    position: sticky;
    top: 0;
    z-index: 6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid ${TK.border};
    background: ${TK.surface};
  }
  .wr-title {
    font-weight: 600;
    font-size: 14px;
    color: ${TK.text};
    text-decoration: none;
  }
  .wr-title:hover {
    text-decoration: underline;
  }
  .wr-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .wr-btn {
    height: 30px;
    padding: 0 10px;
    border: 1px solid ${TK.border};
    border-radius: ${TK.radius}px;
    background: ${TK.brand};
    color: #fff;
    font-size: 12px;
  }
  .wr-btn.ghost {
    background: ${TK.surface};
    color: ${TK.muted};
  }

  /* summary chips */
  .wr-sum {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 8px 12px;
    border-bottom: 1px solid ${TK.border};
    background: ${TK.subtle};
  }
  .wr-sum-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${TK.border};
    background: #fff;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 12px;
  }
  .wr-sum-chip .x {
    border: 0;
    background: transparent;
    cursor: pointer;
    font-weight: 700;
  }

  /* table */
  .wr-table-wrap {
    max-height: 60vh;
    overflow: auto;
  }
  .wr-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }
  .wr-thead th {
    position: sticky;
    top: 48px;
    background: #fff;
    z-index: 5;
    border-bottom: 1px solid ${TK.border};
    padding: 8px 10px;
    font-weight: 600;
    text-align: left;
  }
  .wr-th.sticky.left {
    position: sticky;
    left: 0;
    background: #fff;
    z-index: 6;
    box-shadow: 1px 0 0 0 ${TK.border} inset;
  }
  .wr-row:hover {
    background: ${TK.subtle};
  }
  .wr-td {
    border-bottom: 1px solid ${TK.border};
    padding: 8px 10px;
    vertical-align: middle;
    background: #fff;
  }
  .t-right {
    text-align: right;
  }
  .t-center {
    text-align: center;
  }
  .wr-assignee {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .wr-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    color: #fff;
    font-weight: 700;
  }

  /* pills + chips */
  .wr-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid transparent;
    font-size: 12px;
    white-space: nowrap;
  }
  .wr-chip {
    height: 26px;
    border: 1px solid ${TK.border};
    border-radius: 999px;
    background: #fff;
    padding: 0 10px;
    font-size: 12px;
    color: ${TK.muted};
  }
  .wr-chip.active {
    background: ${TK.accent};
  }
  .wr-chip.ghost {
    background: #fff;
  }

  /* Drawer */
  .wr-drawer {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    width: 400px;
    background: #fff;
    border-left: 1px solid ${TK.border};
    transform: translateX(100%);
    transition: transform 0.2s ease;
    z-index: 60;
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 16px rgba(0, 0, 0, 0.06);
  }
  .wr-drawer.open {
    transform: translateX(0);
  }
  .wr-dh {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid ${TK.border};
  }
  .wr-dh-t {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .wr-proj {
    font-size: 12px;
    color: ${TK.muted};
  }
  .wr-proj-name {
    font-weight: 700;
    max-width: 260px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wr-x {
    border: 1px solid ${TK.border};
    background: #fff;
    border-radius: ${TK.radius}px;
    width: 28px;
    height: 28px;
    cursor: pointer;
  }
  .wr-db {
    padding: 10px 12px;
    overflow: auto;
  }
  .wr-sec {
    border: 1px solid ${TK.border};
    border-radius: ${TK.radius}px;
    background: #fff;
    padding: 10px;
    margin-bottom: 10px;
  }
  .wr-sec-title {
    font-weight: 600;
    margin-bottom: 8px;
  }
  .wr-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .wr-row.wrap {
    flex-wrap: wrap;
  }
  .wr-col {
    display: grid;
    gap: 6px;
  }
  .wr-input {
    height: 30px;
    border: 1px solid ${TK.border};
    border-radius: ${TK.radius}px;
    background: #fff;
    padding: 0 8px;
  }
  .wr-mini {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }
  .wr-link {
    border: 0;
    background: transparent;
    color: ${TK.brand};
    cursor: pointer;
    padding: 0;
  }
  .wr-check {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .wr-check input {
    accent-color: ${TK.brand};
  }
  .wr-check-lbl {
    font-size: 14px;
  }

  /* Drawer footer */
  .wr-df {
    border-top: 1px solid ${TK.border};
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .wr-df-left {
    color: ${TK.muted};
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .wr-df-left .sep {
    opacity: 0.6;
  }
  .wr-df-right {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }
  .muted {
    color: ${TK.muted};
  }

  /* Responsive */
  @media (max-width: 560px) {
    .wr-drawer {
      width: 100%;
    }
    .wr-thead th {
      top: 48px;
    }
  }
`
