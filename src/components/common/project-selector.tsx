"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import Image from "next/image"
import { ChevronDown, ExternalLink, Filter, Trash2, Search, X } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Modal, Popover } from "antd"
import { useProjectManager } from "@/src/hooks/use-project-manager"

export const formatAccessLabel = (value: unknown) => {
  const raw = String(value ?? "").trim()
  if (!raw) return "View"
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`)
    .join(" ")
}

export const accessBadgeClass = (label: string) => {
  const normalized = label.trim().toLowerCase()
  if (["owner", "admin"].includes(normalized)) {
    return "bg-red-50 text-red-600"
  }
  if (["editor", "edit"].includes(normalized)) {
    return "bg-amber-50 text-amber-700"
  }
  if (["viewer", "view"].includes(normalized)) {
    return "bg-slate-100 text-slate-700"
  }
  return "bg-blue-50 text-blue-600"
}

interface ProjectSelectorProps {
  className?: string
  showExternalLink?: boolean
  placeholder?: string
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  className = "",
  showExternalLink = true,
  placeholder = "Select a project",
}) => {
  const {
    projects,
    sharedProjects,
    selectedProject,
    selectProject,
    loading,
    deleteProject,
  } = useProjectManager()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [showMyProjects, setShowMyProjects] = useState(true)
  const [showSharedProjects, setShowSharedProjects] = useState(true)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<any>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  const dropdownRef = useRef<HTMLDivElement>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounce query for smooth filtering
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 150)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Keyboard UX: "/" focuses search, "Escape" closes dropdown
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!dropdownOpen) return
      if (e.key === "/") {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === "Escape") {
        setDropdownOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dropdownOpen])

  const displayDomain: any = selectedProject?.domain || selectedProject?.url || ""
  const displayUrl: any = selectedProject?.url || selectedProject?.domain || ""

  const baseMyProjects = showMyProjects ? projects : []
  const baseSharedProjects = showSharedProjects ? (sharedProjects || []) : []

  // Filter logic (domain, url, shared_by)
  const { filteredMy, filteredShared } = useMemo(() => {
    if (!debouncedQuery) {
      return {
        filteredMy: baseMyProjects,
        filteredShared: baseSharedProjects,
      }
    }
    const q = debouncedQuery
    const fMy = baseMyProjects.filter((p: any) => {
      const domain = String(p.domain || "").toLowerCase()
      const url = String(p.url || "").toLowerCase()
      return domain.includes(q) || url.includes(q)
    })
    const fShared = baseSharedProjects.filter((project: any) => {
      const domain = String(project?.domain || "").toLowerCase()
      const url = String(project?.url || "").toLowerCase()
      const sharedMeta = project?.shared_meta || {}
      const by = String(
        project?.shared_by ||
        sharedMeta.manager_name ||
        sharedMeta.manager_email ||
        sharedMeta.shared_by ||
        "",
      ).toLowerCase()
      return domain.includes(q) || url.includes(q) || by.includes(q)
    })
    return { filteredMy: fMy, filteredShared: fShared }
  }, [debouncedQuery, baseMyProjects, baseSharedProjects])


  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg px-3 py-2 w-48 ${className}`}>
        <div className="h-4 bg-gray-300 rounded"></div>
      </div>
    )
  }

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete.id)
      setDeleteModalVisible(false)
      setProjectToDelete(null)
    }
  }

  const showDeleteConfirmation = (project: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToDelete(project)
    setDeleteModalVisible(true)
  }

  return (
    <div className={`relative ${className}`} data-tour="project-selector">
      <div className="flex items-center gap-2">

        {/* Filter Toggle */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            onClick={() => setFilterDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-800 focus:outline-none border rounded-lg px-2 py-1 text-sm hover:bg-gray-50 transition-colors"
            title="Filter projects"
          >
            <Filter className="size-4" />
          </button>

          <AnimatePresence>
            {filterDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 z-[100] mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg"
              >
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-700 mb-2">Show Projects</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showMyProjects}
                        onChange={(e) => setShowMyProjects(e.target.checked)}
                        className="rounded border-gray-300 text-brand-blue1 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">My Projects</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSharedProjects}
                        onChange={(e) => setShowSharedProjects(e.target.checked)}
                        className="rounded border-gray-300 text-brand-blue1 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Shared with Me</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selector button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setDropdownOpen(prev => !prev)
              // Focus search when opening
              setTimeout(() => searchInputRef.current?.focus(), 60)
            }}
            className="flex items-center gap-1 text-brand-blue1 font-semibold focus:outline-none border rounded-lg px-2 py-1 text-sm hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              {selectedProject ? (
                <>
                  <Image
                    src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(displayUrl)}`}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded"
                    priority
                  />
                  <span className="text-sm truncate max-w-[120px] sm:max-w-[180px]">{displayDomain}</span>
                </>
              ) : (
                <span className="text-sm text-gray-500">{placeholder}</span>
              )}
              <ChevronDown className="size-5" />
            </div>
            {selectedProject && showExternalLink && displayUrl && (
              <Link
                href={displayUrl.startsWith("http") ? displayUrl : `https://${displayUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-600 hover:text-gray-800 ml-0.5"
              >
                <ExternalLink className="size-5" />
              </Link>
            )}
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 z-[100] mt-1 w-full sm:w-[360px] bg-white/60 backdrop-blur-md border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto"
              >
                {/* Sticky Search Bar */}
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="sticky top-0 z-10 bg-white/70 backdrop-blur-md border-b border-gray-200"
                >
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                      <input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects (press / to focus)"
                        className="w-full rounded-md border border-gray-200 bg-white/80 focus:bg-white px-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                          aria-label="Clear search"
                        >
                          <X className="size-4 text-gray-500" />
                        </button>
                      )}
                    </div>

                    {/* Tiny meta row */}
                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                      <span>
                        {debouncedQuery
                          ? `Results for “${searchQuery.trim()}”`
                          : "Type to filter projects"}
                      </span>
                      <span className="rounded border border-gray-200 px-1.5 py-0.5">
                        {filteredMy.length + filteredShared.length} found
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* My Projects */}
                {filteredMy.map((project: any, index: number) => {
                  const projectDomain = project.domain || project.url || ""
                  const projectUrl = project.url || project.domain || ""
                  const isSelected = selectedProject?.id === project.id


                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex items-center justify-between group
        ${isSelected
                          ? "bg-blue-50/80 "
                          : "hover:bg-blue-50/60"
                        }`}                    >
                      <button
                        onClick={() => {
                          selectProject(project)
                          setDropdownOpen(false)
                          setSearchQuery("")
                        }}
                        className="flex-1 flex items-center gap-2 px-4 py-2 text-sm text-left"
                      >
                        <Image
                          src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(projectUrl)}`}
                          alt=""
                          width={16}
                          height={16}
                          className="rounded"
                        />
                        <span className={`truncate ${isSelected ? "font-medium text-brand-blue1" : ""}`}>
                          {projectDomain}
                        </span>
                      </button>
                      <button
                        onClick={(e) => showDeleteConfirmation(project, e)}
                        className={`p-2 rounded transition-all ${isSelected ? "hover:bg-red-100" : "hover:bg-red-50"}`}
                        aria-label="Delete project"
                      >
                        <Trash2 className={`size-4 ${isSelected ? "text-red-700" : "text-red-600"}`} />
                      </button>
                    </motion.div>
                  )
                })}

                {/* Shared With Me */}
                {filteredShared && filteredShared.length > 0 && (
                  <>
                    {(filteredMy.length > 0) && <div className="border-t border-gray-200 my-1"></div>}
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 sticky top-[56px]">
                      Shared With Me
                    </div>
                    {filteredShared.map((project: any, idx: number) => {
                      const sharedMeta = project?.shared_meta || {}
                      const projectDomain = project?.domain || project?.url || ""
                      const projectUrl = project?.url || project?.domain || ""
                      const dashboards = Array.isArray(sharedMeta?.dashboards) ? sharedMeta.dashboards : []
                      const dashboardAccess =
                        dashboards.find((dashboard: any) => dashboard?.active)?.access ||
                        dashboards[0]?.access
                      const accessValue =
                        project?.shared_access_type ||
                        sharedMeta?.access_type ||
                        sharedMeta?.shared_access_type ||
                        dashboardAccess
                      const accessLabel = formatAccessLabel(accessValue)
                      const sharedBy =
                        project?.shared_by ||
                        sharedMeta.manager_name ||
                        sharedMeta.manager_email ||
                        "-"
                      const isSelected =
                        !!selectedProject && String(selectedProject.id) === String(project?.id)

                      const popoverContent = (
                        <div className="text-xs space-y-1">
                          <div><b>Domain:</b> {projectDomain || "-"}</div>
                          <div><b>Name:</b> {project?.name || "-"}</div>
                          <div><b>Shared by:</b> {`${sharedMeta.manager_name || "-"} - ${sharedMeta.manager_email || "-"}`}</div>
                          {dashboards.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 mt-1 space-y-1">
                              <div className="text-[10px] uppercase tracking-wide text-gray-400">Dashboard access</div>
                              <div className="space-y-1">
                                {dashboards.map((dashboard: any, dashboardIdx: number) => {
                                  const dashLabel = formatAccessLabel(dashboard?.access || accessLabel)
                                  const dashTitle =
                                    dashboard?.type ||
                                    (dashboard?.id ? `Dashboard #${dashboard.id}` : "Dashboard")
                                  return (
                                    <div
                                      key={`${dashboard?.id ?? "dashboard"}-${dashboardIdx}`}
                                      className="flex items-center justify-between gap-3 text-[11px]"
                                    >
                                      <span className="text-gray-600 truncate">{dashTitle}</span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${accessBadgeClass(dashLabel)}`}
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
                        <Popover
                          key={`shared-${project?.share_id || project?.id}`}
                          content={popoverContent}
                          placement="right"
                        >
                          <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (filteredMy.length + idx) * 0.03 }}
                            onClick={() => {
                              selectProject(project)
                              setDropdownOpen(false)
                              setSearchQuery("")
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left
        ${isSelected
                                ? "bg-blue-50/80 ring-1 ring-blue-200"
                                : "hover:bg-blue-50/60"
                              }`}                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Image
                                src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(projectUrl)}`}
                                alt=""
                                width={16}
                                height={16}
                                className="rounded flex-shrink-0"
                              />
                              <span className={`truncate ${isSelected ? "font-medium text-brand-blue1" : ""}`}>
                                {projectDomain}
                              </span>                          </div>
                            <span className={`text-xs truncate  max-w-32 ${isSelected ? "text-brand-blue1" : "text-gray-500"}`}>
                              (Shared by: {sharedBy})
                            </span>                        </motion.button>
                        </Popover>
                      ) 
                    })}
                  </>
                )}

                {/* Empty state */}
                {filteredMy.length === 0 && filteredShared.length === 0 && (
                  <div className="px-4 py-6 text-gray-500 text-sm text-center">
                    No projects match your search.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </div>

      {/* Delete Modal */}
      <Modal
        title="Delete Project"
        open={deleteModalVisible}
        onOk={handleDeleteProject}
        onCancel={() => {
          setDeleteModalVisible(false)
          setProjectToDelete(null)
        }}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        centered
      >
        <p>
          Are you sure you want to delete the project <strong>{projectToDelete?.domain || projectToDelete?.url}</strong>?
        </p>
        <p className="text-gray-600 text-sm mt-2">
          This action cannot be undone and will permanently remove all project data.
        </p>
      </Modal>
    </div>
  )
}
