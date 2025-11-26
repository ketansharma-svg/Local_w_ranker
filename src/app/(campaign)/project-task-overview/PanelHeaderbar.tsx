"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useDispatch, useSelector } from "react-redux"
import { fetchCampaignOverview, selectCampaignOverview, selectCampaignOverviewLoading } from "@/src/redux/reducer/campaignReducer"
import { ChevronDown, Search } from "lucide-react"
import { useOutsideClose } from "../campaign-activity/HeaderBar"
import { buildUnifiedCampaignProjects } from "../campaignProjects"
import { Popover } from "antd"
import { accessBadgeClass, formatAccessLabel } from "@/src/components/common/project-selector"


const Icon = {
  back: (p) => (
    <svg width="16" height="16" viewBox="0 0 20 20" {...p}>
      <path d="M11.5 4L5 10l6.5 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  chev: (p) => (
    <svg width="12" height="12" viewBox="0 0 20 20" {...p}>
      <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  kanban: (p) => (
    <svg width="16" height="16" viewBox="0 0 20 20" {...p}>
      <rect x="3" y="4" width="4" height="12" rx="1" />
      <rect x="9" y="4" width="4" height="12" rx="1" />
      <rect x="15" y="4" width="2" height="12" rx="1" />
    </svg>
  ),
  gantt: (p) => (
    <svg width="16" height="16" viewBox="0 0 20 20" {...p}>
      <path d="M3 5h5v3H3zM9 8h8v3H9zM3 12h10v3H3z" />
    </svg>
  ),
  table: (p) => (
    <svg width="16" height="16" viewBox="0 0 20 20" {...p}>
      <path d="M3 5h14v3H3zm0 4h6v6H3zm7 0h7v6h-7z" />
    </svg>
  ),
  plus: (p) => (
    <svg width="16" height="16" viewBox="0 0 20 20" {...p}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  filter: (p) => (
    <svg width="16" height="16" viewBox="0 0 20 20" {...p}>
      <path d="M3 5h14M6 10h8M8 15h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  more: (p) => (
    <svg width="16" height="16" viewBox="0 0 20 20" {...p}>
      <circle cx="5" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
    </svg>
  ),
  settings: (p) => (
    <svg width="14" height="14" viewBox="0 0 20 20" {...p}>
      <path d="M11.6 2l.6 2.4 2.2 1-1.2 2 1.2 2-2.2 1-.6 2.4H8.4L7.8 13l-2.2-1 1.2-2-1.2-2 2.2-1 .6-2.4zM10 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  ),
  template: (p) => (
    <svg width="14" height="14" viewBox="0 0 20 20" {...p}>
      <path d="M4 4h12v12H4zM4 8h12" />
    </svg>
  ),
}

const getStored = (k, fallback) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
const setStored = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch { }
}

function getProjectAccess(overview: any, pid?: any) {
  const id = String(pid ?? "")
  if (!overview || !id) return { membership: null as null | "as_manager" | "as_member", role: "viewer" as "viewer" | "editor" | "admin" }

  const asMgr = (overview.as_manager || []).find((p: any) => String(p.project_id) === id)
  if (asMgr) return { membership: "as_manager" as const, role: "admin" as const }

  const asMem = (overview.as_member || []).find((p: any) => String(p.project_id) === id)
  if (asMem) {
    const seo = Array.isArray(asMem.accesses) ? asMem.accesses.find((a: any) => a?.dashboard_type === "SEO") : null
    const level = (seo?.access_level || "").toLowerCase()
    const role = level === "viewer" ? "viewer" : level === "editor" ? "editor" : "admin"
    return { membership: "as_member" as const, role }
  }

  return { membership: null, role: "viewer" as const }
}

export function ProjectHeader({
  projectId,
  projectName,
  projects = [],
  initialView = getStored("wr:proj:view", "kanban"),
  filterCount = 0,
  role = "editor",
  onBack,
  onProjectChange,
  onViewChange,
  onOpenNewTask,
  onOpenFilters,
  onOpenSettings,
  onApplyTemplate,
}:any) {
  const [view, setView] = useState(initialView)

    const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return projects.filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.domain?.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const handleSelect = (p: any) => {
    onProjectChange?.(p);
    setOpen(false);
  };

  const activeProject = useMemo(
    () => projects.find((x: any) => String(x.id) === String(projectId)),
    [projects, projectId],
  );
  const activeProjectLabel =
    activeProject?.name ||
    activeProject?.domain ||
    projectName ||
    "Select project";

  useEffect(() => {
    setStored("wr:proj:view", view)
  }, [view])
  useEffect(() => {
    onViewChange?.(view)
  }, [view])

  const [openMore, setOpenMore] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onDoc = (e) => {
      if (openMore && moreRef.current && !moreRef.current.contains(e.target)) setOpenMore(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [openMore])

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-10  flex items-center justify-between gap-3 px-4 py-3 h-16 bg-white border-b border-gray-200"
      role="toolbar"
      aria-label="Project header"
    >
      {/* Left cluster: back + project selector */}
      <div className="flex items-center gap-2.5 min-w-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-1.5 text-brand-blue1 bg-none border-none px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50"
          onClick={onBack}
          aria-label="Back to All Projects"
          title="Back to All Projects"
        >
          <Icon.back className="mr-1.5" /> Back
        </motion.button>

        <div className="w-px h-6 bg-gray-200" aria-hidden />

        <label className="text-sm text-gray-600">Project:</label>
      {/* Project Selector */}
      <div ref={ref} className="relative inline-flex items-center">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg text-sm text-gray-900 hover:bg-gray-50 focus:ring-1 focus:ring-brand-blue1 focus:border-transparent transition min-w-64 justify-between"
        >
          <span className="truncate max-w-[180px]">{activeProjectLabel}</span>
          <ChevronDown size={16} className="ml-1 text-gray-500" />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              key="dropdown"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full mt-2 right-0 min-w-[340px] max-h-[500px] overflow-hidden border border-gray-200 bg-white rounded-lg shadow-lg   "
            >
              <div className="p-2 border-b border-gray-100 relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-brand-blue1 focus:border-transparent outline-none"
                />
              </div>

              <div className="max-h-[260px] overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="px-4 py-6 text-sm text-gray-500 text-center">
                    No matching projects found
                  </div>
                )}

{filtered.map((p: any) => {
  const accesses = Array.isArray(p.accesses) ? p.accesses : []
  const baseLabel = formatAccessLabel(p.is_shared ? "viewer" : "admin")

  const popoverContent = (
    <div className="text-xs space-y-1">
      <div><b>Domain:</b> {p.domain || "-"}</div>
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

  const label = p.name || p.domain || p.url || "Untitled Project"
  const isActive = String(p.id) === String(projectId)

  return (
    <Popover key={p.id} content={popoverContent} placement="right">
      <button
        onClick={() => handleSelect(p)}
        className={`w-full text-left flex items-center justify-between px-4 py-1.5 text-sm hover:bg-gray-50 ${
          isActive ? "bg-blue-50 text-brand-blue1" : "text-gray-800"
        }`}
      >
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">{label}</span>
          <span
            className={`ml-2 inline-flex items-center px-2 rounded-full text-xs whitespace-nowrap ${
              p.is_shared
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}
            aria-label={p.is_shared ? "Shared to me" : "My project"}
          >
            {p.is_shared ? "Shared to me" : "My project"}
          </span>
        </span>
      </button>
    </Popover>
  )
})}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </div>

      {/* Right cluster: view toggle | + task | filters | more */}
      <div className="flex items-center gap-2">
        <div
          className="inline-flex border border-gray-200 rounded-md overflow-hidden bg-white"
          role="group"
          aria-label="Switch view"
        >
          {[
            { key: "kanban", icon: Icon.kanban, label: "Kanban" },
            // { key: "gantt", icon: Icon.gantt, label: "Gantt" },
            { key: "table", icon: Icon.table, label: "Table" },
          ].map(({ key, icon: IconComponent, label }) => {
            const isDisabled = key === "gantt"
            const isActive = view === key

            return (
              <motion.button
                key={key}
                whileHover={!isDisabled ? { scale: 1.02 } : {}}
                whileTap={!isDisabled ? { scale: 0.98 } : {}}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                onClick={() => !isDisabled && setView(key)}
                className={`inline-flex items-center gap-1.5 p-2 border-none text-sm
          ${isDisabled
                    ? "cursor-not-allowed opacity-50 text-gray-400"
                    : "cursor-pointer text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
          ${isActive && !isDisabled ? "bg-brand-blue1 text-white" : ""}`}
                title={label}
                aria-pressed={isActive}
              >
                <IconComponent />
                <span className="hidden sm:inline">{label}</span>
              </motion.button>
            )
          })}
        </div>


        {role !== "viewer" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center px-3 py-2 bg-brand-blue1 text-white border border-brand-blue1 rounded-lg text-sm cursor-pointer hover:bg-brand-blue1/90 hover:border-brand-blue1/90"
            onClick={onOpenNewTask}
            title="Create a new task prefilled with this project"
          >
            <Icon.plus className="mr-1.5" /> New Task
          </motion.button>
        )}

        {/* <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm cursor-pointer hover:bg-gray-50"
          onClick={onOpenFilters}
          aria-label="Open Filters"
          title="Open Filters"
        >
          <Icon.filter className="mr-1.5" />
          Filters
          <span
            className={`ml-1.5 min-w-[18px] h-[18px] px-1.5 rounded-full inline-flex items-center justify-center text-xs text-white ${
              filterCount ? "bg-brand-blue1" : "bg-gray-500"
            }`}
            aria-label={`${filterCount} active filters`}
          >
            {filterCount}
          </span>
        </motion.button> */}

        {/* <div className="relative" ref={moreRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white border border-gray-200 rounded-lg p-1.5 cursor-pointer hover:bg-gray-50"
            onClick={() => setOpenMore((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={openMore}
          >
            <Icon.more />
          </motion.button>
          {openMore && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 top-9 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg p-1.5"
              role="menu"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setOpenMore(false)
                  onOpenSettings?.()
                }}
                className="w-full flex items-center bg-none border-none text-left px-2.5 py-2 rounded-lg cursor-pointer text-sm hover:bg-gray-50"
              >
                <Icon.settings className="mr-2" /> Project Settings
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setOpenMore(false)
                  onApplyTemplate?.()
                }}
                className="w-full flex items-center bg-none border-none text-left px-2.5 py-2 rounded-lg cursor-pointer text-sm hover:bg-gray-50"
              >
                <Icon.template className="mr-2" /> Apply Template
              </button>
            </motion.div>
          )}
        </div> */}
      </div>
    </motion.header>
  )
}

export default function Demo_ProjectHeader({ onViewChange, onOpenFilters, onOpenNewTask }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPid = searchParams.get("projectId")
  const [pid, setPid] = useState(initialPid)

  const dispatch = useDispatch()
  const overview:any = useSelector(selectCampaignOverview as any)
  const overviewLoading = useSelector(selectCampaignOverviewLoading as any)

  useEffect(() => {
    if (!overview && !overviewLoading) dispatch(fetchCampaignOverview() as any)
  }, [overview, overviewLoading, dispatch])

const allProjects = useMemo(
  () => buildUnifiedCampaignProjects(overview),
  [overview],
)

  const access = useMemo(() => getProjectAccess(overview, pid), [overview, pid])


  useEffect(() => {
    if (overviewLoading) return

    if (!pid) {
      const first = allProjects[0]
      setPid(String(first.id))
      router.replace(`?projectId=${first.id}`)
    }
  }, [allProjects, overviewLoading, pid, router])
  
  const activeProject =
    allProjects.find((p) => String(p.id) === String(pid)) || null
  const active =
    activeProject?.name
    || activeProject?.domain
    || "Select project"


  if (overviewLoading && !overview) {
    return (
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-8 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-40 bg-gray-200 rounded" />
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="ml-auto h-8 w-36 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }


  return (
    <div>
      <ProjectHeader
        projectId={pid}
        projectName={active}
        projects={allProjects}
        role={access?.role || "viewer"}
        onBack={() => router.push('/campaign-activity')}
        onProjectChange={(p) => {
          if (!p?.id) {
            toast.error("No projects available")
            return
          }
          setPid(String(p.id))
          router.push(`?projectId=${p.id}`)
        }}
        onViewChange={(v) => onViewChange(v)}
        onOpenNewTask={() => onOpenNewTask()}
        onOpenFilters={() => onOpenFilters()}
        onOpenSettings={() => alert("Open Project Settings")}
        onApplyTemplate={() => alert("Open Apply Template Drawer")}
      />
    </div>
  )
}
