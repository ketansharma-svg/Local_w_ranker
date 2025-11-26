"use client"
import { accessBadgeClass, formatAccessLabel } from "@/src/components/common/project-selector"
import SetupModal from "@/src/components/common/SetupModal"
import { Button, Checkbox, Drawer, Popover } from "antd"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, FilterIcon, Plus, RefreshCw, UserPlus2, X } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import TaskCreationDrawerDemo from "../project-task-overview/UniversalTaskCreationDrawer"

type ViewMode = "kanban" | "gantt" | "table"

// Icons for view toggle
const KanbanIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...props} aria-hidden>
    <rect x="3" y="4" width="6" height="16" rx="2" />
    <rect x="10" y="4" width="4" height="16" rx="2" />
    <rect x="15" y="4" width="6" height="16" rx="2" />
  </svg>
)
const GanttIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...props} aria-hidden>
    <rect x="3" y="6" width="9" height="3" rx="1.5" />
    <rect x="8" y="11" width="13" height="3" rx="1.5" />
    <rect x="3" y="16" width="7" height="3" rx="1.5" />
  </svg>
)

const TableIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...props} aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
    <line x1="9" y1="4" x2="9" y2="20" stroke="currentColor" strokeWidth="2" />
    <line x1="15" y1="4" x2="15" y2="20" stroke="currentColor" strokeWidth="2" />
  </svg>
)

// Utilities
export function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open, onClose])
  return ref
}

// UI primitives converted to Tailwind
function PrimaryButton(props: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-brand-blue1 hover:bg-brand-blue1/90 text-white border-none cursor-pointer text-sm font-medium transition-colors"
    >
      {props.children}
      <span>{props.title}</span>
    </button>
  )
}

function OutlineButton(props: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-transparent hover:bg-gray-50 text-branbg-brand-blue1 border border-branbg-brand-blue1 cursor-pointer text-sm font-medium transition-colors"
    >
      {props.children}
      <span>{props.title}</span>
    </button>
  )
}

function IconButton(props: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      aria-label={props.title}
      title={props.title}
      onClick={props.onClick}
      className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 cursor-pointer transition-colors"
    >
      {props.children}
    </button>
  )
}


function FiltersButton({
  count = 0,
  onClick,
}: {
  count?: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title="Filters"
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 cursor-pointer text-sm font-medium transition-colors"
    >
      <FilterIcon size={16} />
      <span>Filters</span>
      {count > 0 && (
        <span
          aria-label={`${count} active filters`}
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold leading-[18px]"
        >
          {count}
        </span>
      )}
    </button>
  )
}


function Breadcrumb({ segments = ["Projects", "Campaign Taskboard"] }: { segments?: string[] }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">{segments[0]}</span>
      <span className="text-gray-400">›</span>
      <span className="text-gray-900 font-semibold">{segments[1]}</span>
    </div>
  )
}

function ProjectAccess({
  value,
  onChange,
}: {
  value: { mine: boolean; shared: boolean }
  onChange: (v: { mine: boolean; shared: boolean }) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  const menuRef = useRef<HTMLDivElement | null>(null)
  const { mine, shared } = value

  // Focus the menu container when it opens (keyboard users)
  useEffect(() => {
    if (open) menuRef.current?.focus()
  }, [open])

  return (
    <div ref={ref} className="relative  ">
      <div className=" z-1 flex items-center gap-2 border px-2 py-1.5 rounded-lg" title="Project Access" aria-haspopup="menu" aria-expanded={open} aria-controls="project-access-menu">
        <span>Project Access</span>
        <ChevronDown size={16} className="text-gray-400" />
      </div>

      <button
        aria-hidden
        onClick={() => setOpen((s) => !s)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />

      {open && (
        <div
          id="project-access-menu"
          ref={menuRef}
          role="menu"
          tabIndex={-1}
          aria-labelledby="project-access-legend"
          className="absolute z-1 mt-2 min-w-[240px] bg-white rounded-md border border-gray-200 shadow-sm p-3"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false)
          }}
        >
          {/* Group the related controls for screen readers */}
          <fieldset role="group" aria-describedby="project-access-help">
            <legend id="project-access-legend" className="text-xs font-medium text-gray-700 mb-2">
              Select project visibility
            </legend>

            <div className="space-y-2">
              <label htmlFor="pa-mine" className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  id="pa-mine"
                  name="project_access_mine"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={mine}
                  onChange={(e) => onChange({ mine: e.target.checked, shared })}
                />
                <span>My projects</span>
              </label>

              <label htmlFor="pa-shared" className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  id="pa-shared"
                  name="project_access_shared"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={shared}
                  onChange={(e) => onChange({ mine, shared: e.target.checked })}
                />
                <span>Shared with me</span>
              </label>
            </div>

            <p id="project-access-help" className="mt-2 text-xs text-gray-500">
              Toggle which project sets appear in the board.
            </p>
          </fieldset>
        </div>
      )}
    </div>
  )
}

function ProjectsMultiSelect({
  available,
  selected,
  onSelect,
  onRemove,
  onViewProject,
}: {
  available: {
    id: string
    name: string
    groupId: "g1" | "g2"
    domain?: string
    url?: string
    is_shared?: boolean
    accesses?: { dashboard_type?: string; access_level?: string }[]
  }[]
  selected: string[]
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onViewProject: any
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false))
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const unselected = useMemo(() => available.filter((p) => !selectedSet.has(p.id)), [available, selectedSet])

  const filtered = useMemo(() => {
    if (!query.trim()) return unselected
    const q = query.toLowerCase()
    return unselected.filter((p) => p.name.toLowerCase().includes(q))
  }, [unselected, query])

  useEffect(() => {
    if (activeIndex > Math.max(filtered.length - 1, 0)) setActiveIndex(0)
  }, [filtered.length, activeIndex])

  const selectAll = () => {
    filtered.forEach((p) => onSelect(p.id))
    setQuery("")
  }

  const clearAll = () => {
    selected.forEach((id) => onRemove(id))
  }

  const toggleProject = (id: string) => {
    if (selectedSet.has(id)) {
      onRemove(id)
    } else {
      onSelect(id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const item = filtered[activeIndex]
      if (item) toggleProject(item.id)
    }
    if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative  z-1">
      <div className=' flex items-center gap-2'>
        <div
          className="flex items-center border px-2 py-1.5 rounded-lg cursor-pointer"
          title="Select projects"
          onClick={() => setOpen((prev) => !prev)}
        >
          <span>
            {selected.length ? `${selected.length} project${selected.length !== 1 ? "s" : ""}` : "All Projects"}
          </span>
          <ChevronDown size={16} className="text-gray-400 ml-2" />
        </div>


        {selected.length > 0 && (
          <div className=" flex flex-wrap gap-1.5 ">
            <AnimatePresence initial={false}>
              {available
                .filter((p) => selectedSet.has(p.id))
                .slice(0, 2)
                .map((p) => (
                  <motion.span
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 bg-blue-50 text-brand-blue1 text-sm "
                  >
                    <span className="font-medium">{p.name}</span>
                    <button
                      type="button"
                      title="Remove from selection"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove(p.id)
                      }}
                      className="p-0.5 rounded hover:bg-blue-100 transition-colors"
                    >
                      <X size={10} className="text-brand-blue1" />
                    </button>
                  </motion.span>
                ))}
              {selected.length > 2 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs"
                >
                  +{selected.length - 2} more
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            key="projects-menu"
            role="listbox"
            aria-label="Projects"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute z-1 mt-2 min-w-[340px] max-h-[500px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl "
            onKeyDown={handleKeyDown}
          >
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  <circle cx="11" cy="11" r="7" stroke="currentColor" fill="none" />
                  <path d="M20 20l-3-3" stroke="currentColor" />
                </svg>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-brand-blue1 focus:border-transparent text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  disabled={filtered.length === 0}
                  className="px-3 py-1.5 text-xs rounded-md hover:bg-brand-blue1 hover:text-white border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Select all ({filtered.length})
                </button>
                <button
                  onClick={clearAll}
                  disabled={selected.length === 0}
                  className="px-3 py-1.5 text-xs rounded-md hover:bg-brand-blue1 hover:text-white border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Clear all
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {selected.length} of {available.length} selected
              </span>
            </div> */}

            <div className="max-h-[280px] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-sm text-center text-gray-500">
                  {query.trim() ? "No matching projects found" : "All projects are selected"}
                </div>
              )}
{filtered.map((p, i) => {
  const isSelected = selectedSet.has(p.id)
  const domain = p.domain || p.name
  const projectUrl = p.url || p.domain || ""
  const accesses = Array.isArray(p.accesses) ? p.accesses : []
  const baseLabel = formatAccessLabel(p.groupId === "g2" ? "viewer" : "admin")

  const popoverContent = (
    <div className="text-xs space-y-1">
      <div><b>Domain:</b> {domain || "-"}</div>
      <div><b>Name:</b> {p.name || "-"}</div>
      {accesses.length > 0 && (
        <div className="pt-2 border-t border-gray-100 mt-1 space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">
            Dashboard access
          </div>
          <div className="space-y-1">
            {accesses.map((a: any, idx: number) => {
              const dashLabel = formatAccessLabel(a?.access_level || baseLabel)
              const dashTitle = a?.dashboard_type || "Dashboard"
              return (
                <div
                  key={`${dashTitle}-${idx}`}
                  className="flex items-center justify-between gap-3 text-[11px]"
                >
                  <span className="text-gray-600 truncate">{dashTitle}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${accessBadgeClass(
                      dashLabel,
                    )}`}
                  >
                    {dashLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Popover key={p.id} content={popoverContent} placement="right">
      <button
        role="option"
        aria-selected={isSelected}
        onClick={() => toggleProject(p.id)}
        className="flex w-full items-center justify-between px-4 py-1.5 text-left text-sm border-none bg-transparent cursor-pointer hover:bg-gray-100"
      >
        <div className="flex items-center gap-3 min-w-0">
          {projectUrl && (
            <Image
              src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(projectUrl)}`}
              alt=""
              width={16}
              height={16}
              className="rounded flex-shrink-0"
            />
          )}
          <span className="font-medium truncate block max-w-[12.5rem]">
            {domain}
          </span>
        </div>
        <div className="flex-shrink-0">
          <span
            className={`ml-2 inline-flex items-center px-2 rounded-full text-xs whitespace-nowrap
              ${p.groupId === "g1"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
              }`}
            aria-label={p.groupId === "g1" ? "My project" : "Shared to me"}
          >
            {p.groupId === "g1" ? "My project" : "Shared to me"}
          </span>
        </div>
      </button>
    </Popover>
  )
})}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      className="inline-flex items-center border border-gray-200 rounded-md overflow-hidden"
      role="tablist"
      aria-label="View mode"
    >
      {(
        [
          ["kanban", KanbanIcon],
          // ["gantt", GanttIcon],
          ["table", TableIcon],
        ] as const
      ).map(([k, Icon]) => {
        const active = value === k
        const isDisabled: any = ""
        return (
          <button
            key={k}
            role="tab"
            aria-selected={active}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onClick={() => !isDisabled && onChange(k)}
            className={`border-none p-2 inline-flex items-center gap-1.5 transition-colors 
              ${isDisabled
                ? "cursor-not-allowed opacity-50 text-gray-400"
                : "cursor-pointer text-gray-900 hover:bg-gray-50"
              } 
              ${active && !isDisabled ? "!bg-brand-blue1 text-white" : ""}`}
            title={`${k[0].toUpperCase()}${k.slice(1)} View`}
          >
            <Icon />
            <span className="capitalize">{k}</span>
          </button>
        )
      })}
    </div>
  )
}


// Public component
export function TaskboardHomeHeader({
  breadcrumb = ["Projects", "Campaign Taskboard"],
  defaultView = "kanban",
  filtersCount = 0,
  onViewChange,
  onOpenFilters,
  onCreateTask,
  onCreateProject,
  onExport,
  onAddMember,
  onSettings,
  onRefresh,
  onViewProject,
  projects = [],
  onAccessChange,
  onProjectSelectionChange,
}: {
  breadcrumb?: string[]
  defaultView?: ViewMode
  filtersCount?: number
  onViewChange?: (v: ViewMode) => void
  onOpenFilters?: () => void
  onCreateTask?: () => void
  onCreateProject?: () => void
  onExport?: () => void
  onAddMember?: () => void
  onSettings?: () => void
  onRefresh?: () => void
  onViewProject?: (projectId: string) => void
  projects?: {
    id: string
    name: string
    groupId: "g1" | "g2"
    domain?: string
    url?: string
    is_shared?: boolean
    accesses?: { dashboard_type?: string; access_level?: string }[]
  }[]
  onAccessChange?: (access: { mine: boolean; shared: boolean }) => void
  onProjectSelectionChange?: (ids: string[]) => void
}) {

  const router = useRouter()
  const [view, setView] = useState<ViewMode>(defaultView)
  const [access, setAccess] = useState({ mine: true, shared: true })
  const handleView = (v: ViewMode) => {
    setView(v)
    onViewChange?.(v)
  }
  const [open, setOpen] = useState(false)
  const withAccess = useMemo(
    () => projects.map(p => ({ ...p, access: p.groupId === "g1" ? "mine" : "shared" })),
    [projects]
  );

  // Remove groupId entirely unless you really need it
  const availableProjects = useMemo(() => {
    // If you mapped groupId -> access, use "withAccess" instead of "projects"
    const list = withAccess; // or withAccess
    return list.filter(p =>
      (access.mine && p.access === "mine") ||
      (access.shared && p.access === "shared")
    );
  }, [projects, access]);

  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    const allowed = new Set(availableProjects.map((p) => p.id))
    setSelected((prev) => prev.filter((id) => allowed.has(id)))
  }, [availableProjects])


  useEffect(() => {
    onProjectSelectionChange?.(selected)
  }, [selected, onProjectSelectionChange])


  return (
    <motion.div
      role="region"
      aria-label="Campaign Taskboard header"
      className="sticky top-0 z-1 isolate bg-white border-b border-gray-300"

    >
      {/* Row 1: Breadcrumb */}
      <div className="flex items-center justify-between px-4 py-2.5 pb-1.5">
        <Breadcrumb segments={breadcrumb} />
      </div>

      {/* Row 2: Controls + Actions */}
      <div className="flex  flex-col gap-3 px-4 py-2 pb-3">
        <div className='flex items-center justify-between'>

          <motion.div
            className="flex items-center gap-2 flex-wrap"
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <ProjectAccess
              value={access}
              onChange={(next) => {
                setAccess(next)
                onAccessChange?.(next)
              }}
            />{" "}

            <ProjectsMultiSelect
              available={availableProjects}
              selected={selected}
              onSelect={(id) => router.push(`project-task-overview?projectId=${id}`)}
              onRemove={(id) => setSelected((xs) => xs.filter((x) => x !== id))}
              onViewProject={onViewProject}
            />

          </motion.div>


          <motion.div
            className="inline-flex gap-2 flex-wrap">

            <FiltersButton count={filtersCount} onClick={onOpenFilters} />

            <PrimaryButton
              title="Create Task"
              onClick={() => {
                onCreateTask
                setOpen(true)
              }}
            >
              <Plus size={16} />
            </PrimaryButton>
            <OutlineButton data-tour="add-task" title="Create Project" onClick={onCreateProject}>
              <Plus size={16} />
            </OutlineButton>
            <ViewToggle value={view} onChange={handleView} />
            <IconButton title="Add Team Member" onClick={onAddMember}>
              <UserPlus2 size={16} />
            </IconButton>
            {/* <IconButton title="Export" onClick={onExport}>
              <Upload size={16} />
            </IconButton> */}
            <IconButton title="Refresh / Re-crawl" onClick={onRefresh}>
              <RefreshCw size={16} />
            </IconButton>
            {/* <IconButton title="Settings" onClick={onSettings}>
              <Settings size={16} />
            </IconButton> */}
          </motion.div>

        </div>

      </div>


      {/* Divider */}
      <div className="border-b border-gray-200" />
      <TaskCreationDrawerDemo
        open={open}
        setOpen={setOpen}
        idPassed={""}
        status={""}
        type={"createNew"}
        onUpdate={() => { }}
      />
    </motion.div>
  )
}

// Demo wrapper
export default function TaskboardHomeHeaderDemo({
  view,
  onViewChange,
  onFiltersChange,
  onAccessChange,
  onProjectSelectionChange,
  projects,
}) {
  const [toast, setToast] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filtersCount, setFiltersCount] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 1400)
  }
  const router = useRouter()

  return (
    <div className="bg-white text-gray-900 text-sm ">
      <TaskboardHomeHeader
        filtersCount={filtersCount}
        onOpenFilters={() => setFiltersOpen(true)}
        onViewChange={onViewChange}
        onCreateProject={() => setModalOpen(true)}
        onAddMember={() => router.push("/roles-management")}
        onExport={() => flash("Export")}
        onSettings={() => flash("Open Settings")}
        onRefresh={() => router.refresh()}
        onViewProject={(id) => flash(`Open Project: ${id}`)}
        onAccessChange={onAccessChange}
        onProjectSelectionChange={onProjectSelectionChange}
        projects={projects}
      />
      <DemoFiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={(state, count) => {
          setFiltersCount(count)
          onFiltersChange?.(state, count)
        }}
      />
      <SetupModal modalOpen={modalOpen} setModalOpen={setModalOpen} />
    </div>
  )
}

type FiltersState = {
  overdue: boolean
  dueToday: boolean
  high: boolean
  mine: boolean
}

const FILTERS = [
  { key: "overdue", label: "Overdue tasks" },
  { key: "dueToday", label: "Due today" },
  { key: "high", label: "High priority" },
  { key: "mine", label: "Assigned to me" },
]

function DemoFiltersDrawer({
  open,
  onClose,
  onApply,
  initial = { overdue: false, dueToday: false, high: false, mine: false },
}: {
  open: boolean
  onClose: () => void
  onApply: (state: FiltersState, activeCount: number) => void // CHANGED
  initial?: FiltersState
}) {
  const [state, setState] = useState<FiltersState>(initial)

  useEffect(() => {
    setState(initial)
  }, [])

  const set = (k: keyof FiltersState) => (v: boolean) => setState((s) => ({ ...s, [k]: v }))

  const activeCount = Object.values(state).filter(Boolean).length

  return (
    <Drawer
      title={
        <div className="flex justify-between items-center">
          <span className="font-semibold">Filters</span>
          <Button type="text" icon={<X className="w-5 h-5 text-gray-500" />} onClick={onClose} />
        </div>
      }
      placement="right"
      open={open}
      closable={false}
      onClose={onClose}
      width={380}
      bodyStyle={{ padding: 0 }}
    >
      {/* Body */}
      <motion.div
        key="body"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="flex flex-col h-full"
      >
        <div className="p-4 flex-1 overflow-auto space-y-2">
          <div className="text-xs text-gray-500 mb-2">Quick demo filters</div>
          {FILTERS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 cursor-pointer py-1">
              <Checkbox
                checked={state[f.key as keyof FiltersState]}
                onChange={(e) => set(f.key as keyof FiltersState)(e.target.checked)}
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Active: <strong className="text-gray-900">{activeCount}</strong>
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setState({ overdue: false, dueToday: false, high: false, mine: false })}>
              Clear All
            </Button>
            <Button
              type="primary"
              onClick={() => {
                onApply(state, activeCount)
                onClose()
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </motion.div>
    </Drawer>
  )
}
