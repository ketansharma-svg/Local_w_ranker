"use client"
import { setActiveSidebar } from "@/src/redux/reducer/sidebarReducer"
import type { AppDispatch, RootState } from "@/src/redux/store"
import { AnimatePresence, easeInOut, motion } from "framer-motion"
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  Hash,
  Home,
  Link,
  Link2Icon,
  Megaphone,
  PieChart,
  Settings,
  TrendingUp,
  Unlink,
  Users,
  Wrench,
  DoorClosedLocked,
  LaptopMinimalCheck,
  ClockAlert,
  LayoutDashboard,
  TextSearch,
  House,
  NotebookPen,
  Wallpaper,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { AiOutlineAudit, AiOutlineFundView } from "react-icons/ai"
import { BsImageAlt } from "react-icons/bs"
import { MdOutlineContentPasteSearch } from "react-icons/md"
import { RiMenuSearchLine, RiSeoLine } from "react-icons/ri"
import { TbHeartRateMonitor, TbTemplate } from "react-icons/tb"
import { MdDatasetLinked } from "react-icons/md";
import { VscSymbolKeyword } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { LiaSitemapSolid } from "react-icons/lia";
import { MdOutlineMergeType } from "react-icons/md";




interface SidebarProps {
  onActiveChange?: (item: string, submenu?: string) => void
}

const menuItems: any = [
  { id: "Home", icon: Home, label: "Home", shortLabel: "Home", badge: null, route: "/" },
  {
    id: "SEO",
    icon: BarChart3,
    label: "SEO Dashboard",
    shortLabel: "SEO",
    badge: 12,
    submenu: [
      { label: "Home", route: "/home", id: "Home", icon: Home, count: null },
      { label: "Project Overview", route: "/project-overview", id: "Project Overview", icon: FileText, count: null },
      { label: "Site Audit", route: "/dashboard", id: "Site Audit", icon: Globe, count: 156 },
      { label: "Analytics", route: "/analytics", id: "Analytics", icon: TrendingUp, count: null },
      { label: "Interlink Analyzer", route: "/link-analyzer", id: "Interlink Analyzer", icon: Link, count: 23 },
      { label: "Organic Visibility Insights", route: "/organic-visibility", id: "Organic Visibility Insights", icon: Eye, count: null },
      { label: "Keyword Insights", route: "/keyword-insights", id: "Keyword Insights", icon: Hash, count: 45 },
      { label: "Page Insights", route: "/page-insights", id: "Page Insights", icon: FileText, count: null },

      /** NEW: Grouped dropdown */
      {
        label: "Backlink Insights",
        id: "Backlink Insights",
        icon: Link,
        group: [
          {
            label: "Backlinks – Overview",
            route: "/backlink-insights",
            id: "Backlinks – Overview",
            icon: AiOutlineFundView,
            count: null,
          },
          {
            label: "Backlink Audit",
            route: "/backlink-audit",
            id: "Backlink Audit",
            icon: AiOutlineAudit,
            count: null,
          },
          {
            label: "Backlink Health Monitor",
            route: "/backlink-health-monitor",
            id: "Backlink Health Monitor",
            icon: TbHeartRateMonitor,
            count: null,
          },
           {
            label: "Backlinks Indexing",
            route: "/backlink-indexing",
            id: "Backlinks Indexing",
            icon: TextSearch,
            count: null,
          },
               {
            label: "Link Building Opportunities",
            route: "/link-building-opportunities",
            id: "Link Building Opportunities",
            icon: MdDatasetLinked,
            count: null,
          },
        ],
      },

      {
        label: "Competitor Intelligence System",
        id: "Competitor Intelligence System",
        icon: TrendingUp,
        group: [
          {
            label: "Competitor Insights",
            route: "/competitor-insights",
            id: "Competitor Insights",
            icon: AiOutlineFundView,
            count: null,
          },
          {
            label: "Competitor Profiles",
            route: "/competitor-profiles",
            id: "Competitor Profiles",
            icon: AiOutlineAudit,
            count: null,
          },
          {
            label: "Competitor Tracker",
            route: "/competitor-tracker",
            id: "Competitor Tracker",
            icon: TbHeartRateMonitor,
            count: null,
          },
        ],
      },
    ],
  },
  {
    id: "Tools",
    icon: Wrench,
    label: "Tools",
    shortLabel: "Tools",
    badge: null,
    submenu: [
      { label: "Backlink Monitor", route: "/backlink-monitor", id: "Backlink Monitor", icon: Link2Icon, count: null },
      {
        label: "Broken Links Checker",
        route: "/broken-links-checker",
        id: "Broken Links Checker",
        icon: Unlink,
        count: null,
      },
      {
        label: "Dummy Content Checker",
        route: "/dummy-content-checker",
        id: "Dummy Content Checker",
        icon: MdOutlineContentPasteSearch,
        count: null,
      },
      {
        label: "Image Alt Text Checker",
        route: "/image-alt-text-checker",
        id: "Image Alt Text Checker",
        icon: BsImageAlt,
        count: null,
      },
      {
        label: "Keyword Density Report",
        route: "/keyword-density-report",
        id: "Keyword Density Report",
        icon: VscSymbolKeyword,
        count: null,
      },
      {
        label: "Keyword Research",
        route: "/keyword-research",
        id: "Keyword Research",
        icon: RiMenuSearchLine,
        count: null,
      },
      {
        label: "Keyword Research Tool",
        route: "/keyword-research-tool",
        id: "Keyword Research Tool",
        icon: RiMenuSearchLine,
        count: null,
      },
      {
        label: "Website Seo Analyzer",
        route: "/website-seo-analyzer",
        id: "Website Seo Analyzer",
        icon: RiSeoLine,
        count: null,
      },
      {
        label: "Sitemap Extractor",
        route: "/sitemap-extractor",
        id: "Sitemap Extractor",
        icon: MdOutlineMergeType,
        count: null,
      },
      {
        label: "Sitemap Generator",
        route: "/sitemap-generator",
        id: "Sitemap Generator",
        icon: LiaSitemapSolid,
        count: null,
      },
    ],
  },

  { id: "Content", icon: FileText, label: "Content Dashboard", shortLabel: "Content", badge: 3, submenu: [
      { label: "Home", route: "/content-home", id: "Home", icon: House, count: null },
      { label: "AI Content Writer", route: "/ai-content", id: "AI Content Writer", icon: NotebookPen, count: null },
      { label: "Writer Canvas", route: "/writer-canvas", id: "Writer Canvas", icon: Wallpaper, count: null },
    ], },
  { id: "Reports", icon: PieChart, label: "Reports", shortLabel: "Reports", badge: null },

  {
    id: "Campaign Activity",
    icon: Megaphone,
    label: "Campaign Activity",
    shortLabel: "Campaign Act",
    badge: "New",
    submenu: [
      { label: "All Projects", route: "/campaign-activity", id: "All Projects", icon: FolderOpen, count: null },
      {
        label: "Project Task Overview",
        route: "/project-task-overview",
        id: "Project Task Overview",
        icon: ClipboardList,
        count: null,
      },
      { label: "Task Templates", route: "/task-templates", id: "Task Templates", icon: TbTemplate, count: null },
      {
        label: "Team Performance Board",
        route: "/team-performance-board",
        id: "Team Performance Board",
        icon: Users,
        count: null,
      },
    ],
  },

  {
    id: "Settings",
    icon: Settings,
    label: "Settings",
    shortLabel: "Settings",
    badge: null,
    submenu: [
      { label: "Team And Roles", route: "/team-management", id: "Team And Roles", icon: Users, count: null },
      { label: "Team Analytics", route: "/team-analytics", id: "Team Analytics", icon: BarChart3, count: null },
      {
        label: "Audit Logs & User Activity",
        route: "/audit-logs",
        id: "Audit Logs & User Activity",
        icon: FileText,
        count: null,
      },
      { label: "Project Control Center", route: "/project-control", id: "Project Control Center", icon: LayoutDashboard, count: null },

    ],
  },

  {
    id: "Agency",
    icon: DoorClosedLocked,
    label: "Agency",
    shortLabel: "Agency",
    badge: null,
    submenu: [
      { label: "Roles Management", route: "/roles-management", id: "Roles Management", icon: Users, count: null },
      { label: "Access & Engagement", route: "/access-engagement", id: "Access & Engagement", icon: LaptopMinimalCheck, count: null },
      { label: "User Activity Tracking", route: "/user-activity", id: "User Activity Tracking", icon: ClockAlert, count: null },
    ],
  },
]

/* ───────────────────────── Motion helpers ───────────────────────── */
const spring = { type: "spring", stiffness: 160, damping: 30, restDelta: 0.5 } as const
const subtleTween = { type: "tween", duration: 0.16, ease: [0.33, 1, 0.68, 1] } as const
const indicatorLayoutId = "sidebar-active-indicator" as const
const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as const
const labelPresence = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } as const
const labelPresenceTransition = { duration: 0.14, ease: easeInOut } as const

const Sidebar = ({ onActiveChange }: SidebarProps) => {
  const dispatch = useDispatch<AppDispatch>()
  const { activeSection, activeSubmenu }: any = useSelector((state: RootState) => state.sidebar)
  const router = useRouter()
  const pathname = usePathname()

  const { projects, loading, fetched } = useSelector((state: RootState) => state.projectReducer)

  const DISABLED_MAIN = useMemo(() => new Set<string>([
    "Home",
    // "Content",
    "Reports",
    // "Settings"
  ]), [])

  const DISABLED_SEO = useMemo(
    () =>
      new Set<string>([
        // "Home",
        // "Project Overview",
        // "Analytics",
        // "Interlink Analyzer",
        // "Organic Visibility Insights", 
        // "Page Insights",
        // "Competitor Intelligence System",
        // "Backlinks – Overview",/* to be commented on staging */
        // "Backlink Audit",/* to be commented on staging */
      ]),
    [],
  )
  const DISABLED_CONTENT = useMemo(
    () =>
      new Set<string>([
        // "Home",
        // "Writer Canvas",
      ]),
    [],
  )
  const DISABLED_CAMPAIGN = useMemo(() => new Set<string>([
    // "Team Performance Board" /* to be commented on staging */
  ]), [])
  const DISABLED_SETTINGS = useMemo(() => new Set<string>([
    // "Team Analytics", /* to be commented on staging */
    // "Audit Logs & User Activity" /* to be commented on staging */
  ]), [])
  const DISABLED_AGENCY = useMemo(
    () => new Set<string>([
      // "Access & Engagement", /* to be commented on staging */
      //  "User Activity Tracking" /* to be commented on staging */
    ]),
    []
  )

  const comingOnText = "Coming Soon!"

  const [submenuCollapsed, setSubmenuCollapsed] = useState<boolean>(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const submenuTargetWidth = submenuCollapsed ? 64 : 256

  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelCollapse = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
  }
  const scheduleCollapse = (ms = 150) => {
    cancelCollapse()
    collapseTimerRef.current = setTimeout(() => setSubmenuCollapsed(true), ms)
  }

  const previewSection = (item: any) => {
    const isDisabled = DISABLED_MAIN.has(item.id)
    if (!item.submenu || isDisabled) return

    cancelCollapse()
    setSubmenuCollapsed(false)

    const firstEnabledSubmenu = getFirstEnabledSubmenuItem(item)
    if (firstEnabledSubmenu) {
      handleActiveChange(item.id, firstEnabledSubmenu.id)
    } else {
      handleActiveChange(item.id)
    }
  }


  const toggleGroup = (groupId: string, forceOpen?: boolean) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: forceOpen ?? !prev[groupId] }))
  }

  const handleActiveChange = (section: string, submenu?: string) => {
    dispatch(setActiveSidebar({ section, submenu }))
    onActiveChange?.(section, submenu)
  }

  const getFirstEnabledFromNode = (node: any, disabledSet: Set<string>) => {
    if (node.group && Array.isArray(node.group)) {
      return node.group.find((c: any) => !disabledSet.has(c.id)) ?? null
    }
    return disabledSet.has(node.id) ? null : node
  }

  const getFirstEnabledSubmenuItem = (menuItem: any) => {
    if (!menuItem.submenu || menuItem.submenu.length === 0) return null

    const disabledSet =
      menuItem.id === "SEO"
        ? DISABLED_SEO
        : menuItem.id === "Campaign Activity"
          ? DISABLED_CAMPAIGN
          : menuItem.id === "Settings"
            ? DISABLED_SETTINGS
            : menuItem.id === "Content"
              ? DISABLED_CONTENT
              : activeSection === "Agency"
                ? DISABLED_AGENCY
                : new Set<string>()
    for (const node of menuItem.submenu) {
      const first = getFirstEnabledFromNode(node, disabledSet)
      if (first) return first
    }
    return null
  }

  const findMenuByRoute = (route: string) => {
    for (const menuItem of menuItems) {
      if (menuItem.route === route) {
        return { mainMenu: menuItem, submenu: null }
      }
      if (menuItem.submenu) {
        for (const sub of menuItem.submenu) {
          if (sub.route === route) return { mainMenu: menuItem, submenu: sub }
          if (sub.group) {
            const hit = sub.group.find((g: any) => g.route === route)
            if (hit) return { mainMenu: menuItem, submenu: hit }
          }
        }
      }
    }
    return null
  }

  useEffect(() => {
    const routeMatch = findMenuByRoute(pathname)
    if (routeMatch) {
      const { mainMenu, submenu } = routeMatch
      if (submenu) {
        handleActiveChange(mainMenu.id, submenu.id)
      } else if (mainMenu.submenu) {
        const firstEnabledSubmenu = getFirstEnabledSubmenuItem(mainMenu)
        if (firstEnabledSubmenu) {
          handleActiveChange(mainMenu.id, firstEnabledSubmenu.id)
        } else {
          handleActiveChange(mainMenu.id)
        }
      } else {
        handleActiveChange(mainMenu.id)
      }
    }
  }, [pathname])

  const restoreActiveFromRoute = () => {
    const routeMatch = findMenuByRoute(pathname)
    if (!routeMatch) return

    const { mainMenu, submenu } = routeMatch
    if (submenu) {
      handleActiveChange(mainMenu.id, submenu.id)
      return
    }

    if (mainMenu.submenu) {
      const firstEnabledSubmenu = getFirstEnabledSubmenuItem(mainMenu)
      if (firstEnabledSubmenu) {
        handleActiveChange(mainMenu.id, firstEnabledSubmenu.id)
      } else {
        handleActiveChange(mainMenu.id)
      }
    } else {
      handleActiveChange(mainMenu.id)
    }
  }


  const handleSubmenuClick = (submenuItem: any) => {
    handleActiveChange(activeSection, submenuItem.id)
    router.push(submenuItem.route)
  }

  const handleItemClick = (item: any) => {
    if (item.submenu) {
      const firstEnabledSubmenu = getFirstEnabledSubmenuItem(item)
      if (firstEnabledSubmenu) {
        handleActiveChange(item.id, firstEnabledSubmenu.id)
        router.push(firstEnabledSubmenu.route)
      } else {
        handleActiveChange(item.id)
      }
    } else {
      handleActiveChange(item.id)
      if (item.route) router.push(item.route)
    }
  }

  const activeMenu = useMemo(() => menuItems.find((m: any) => m.id === activeSection), [activeSection])
  const hasSubmenu = activeMenu?.submenu && activeMenu.submenu.length > 0

  useEffect(() => {
    if (activeMenu?.submenu && !activeSubmenu) {
      const firstEnabledSubmenu = getFirstEnabledSubmenuItem(activeMenu)
      if (firstEnabledSubmenu) {
        handleActiveChange(activeSection, firstEnabledSubmenu.id)
      }
    }
  }, [activeSection, activeSubmenu, activeMenu])

  const groupContainsActive = (node: any, activeSub: string | undefined) => {
    if (!node?.group) return false
    return node.group.some((c: any) => c.id === activeSub)
  }

  // Auto-open any group that contains the active submenu (prevents “where did my active item go?”)
  useEffect(() => {
    if (!activeMenu?.submenu) return
    for (const node of activeMenu.submenu) {
      if (node.group && groupContainsActive(node, activeSubmenu)) {
        setOpenGroups((prev) => ({ ...prev, [node.id]: true }))
      }
    }
  }, [activeSection, activeSubmenu, activeMenu])

  const submenuRef = useMemo(() => ({ current: null as HTMLDivElement | null }), [])
  const sidebarRootRef = useRef<HTMLDivElement | null>(null)

  // Click outside / Escape collapses the SECONDARY rail only (not groups)
  useEffect(() => {
    if (!hasSubmenu) return
    const onDocClick = (e: MouseEvent) => {
      const rootEl = sidebarRootRef.current
      if (!rootEl) return
      if (!rootEl.contains(e.target as Node)) {
        setTimeout(() => setSubmenuCollapsed(true), 0)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSubmenuCollapsed(true)
    }
    document.addEventListener("click", onDocClick, { capture: false })
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("click", onDocClick as any, { capture: false } as any)
      document.removeEventListener("keydown", onKey)
    }
  }, [hasSubmenu])

  const handleGroupedParentClick = (node: any) => {
    // Always open the group and navigate to its first enabled child
    toggleGroup(node.id, true)

    if (node.id === "Backlink Insights") {
      handleActiveChange(activeSection, "Backlink Health Monitor")
      router.push("/backlink-health-monitor")
      return
    }
    const disabledSet =
      activeSection === "SEO"
        ? DISABLED_SEO
        : activeSection === "Campaign Activity"
          ? DISABLED_CAMPAIGN
          : activeSection === "Settings"
            ? DISABLED_SETTINGS
            : activeSection === "Content"
              ? DISABLED_CONTENT
              : activeSection === "Agency"
                ? DISABLED_AGENCY
                : new Set<string>()
    const firstLeaf = getFirstEnabledFromNode(node, disabledSet)
    if (firstLeaf) {
      handleActiveChange(activeSection, firstLeaf.id)
      router.push(firstLeaf.route)
    }
  }

  return (
    <div ref={sidebarRootRef} className="flex bg-white text-black" onMouseLeave={restoreActiveFromRoute}>
      <div className="flex flex-col w-20 bg-gray-50 border-r border-gray-200 p-2">
        <div className="grid grid-cols-1 gap-2">
          {menuItems.map((item: any) => {
            const isSelected = activeSection === item.id
            const Icon = item.icon as any
            const isDisabled = DISABLED_MAIN.has(item.id)

            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    if (isDisabled) return
                    handleItemClick(item)
                    if (item.id !== activeSection) setSubmenuCollapsed(false)
                  }}

                  className={[
                    "w-full flex flex-col items-center justify-center py-2 rounded-md transition-all text-black",
                    isDisabled ? "cursor-not-allowed opacity-50 grayscale" : "cursor-pointer",
                  ].join(" ")}
                  style={{ backgroundColor: isSelected ? "#D9EEF8" : "transparent", borderRadius: "6px" }}
                  onMouseEnter={() => {
                    if (!isDisabled && item.submenu) previewSection(item)
                    else cancelCollapse()
                  }}
                  onMouseLeave={() => {
                    scheduleCollapse(180)
                  }}
                  title={isDisabled ? comingOnText : item.label}
                  aria-disabled={isDisabled}
                  tabIndex={isDisabled ? -1 : 0}
                >
                  <Icon size={20} style={{ color: isSelected ? "#008CCD" : "#6B7280" }} />
                  <span className="mt-1 text-xs leading-none truncate max-w-[3.75rem]">
                    {item.shortLabel || item.label}
                  </span>

                  {!isDisabled && item.badge && (
                    <span
                      className={`${item.badge === "New" && "animate-pulse"
                        } absolute -top-2 -right-1 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center font-medium `}
                      style={{
                        backgroundColor:
                          item.badge > 5 ? "#E94134" : item.badge > 0 ? "#F9BB04" : "#34A853",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>

                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  <div
                    className="text-white text-xs px-2 py-1 whitespace-nowrap relative"
                    style={{ backgroundColor: "rgba(17, 24, 39, 0.96)", borderRadius: "6px" }}
                  >
                    {isDisabled ? comingOnText : item.label}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1"
                      style={{
                        width: 0,
                        height: 0,
                        borderTop: "6px solid transparent",
                        borderBottom: "6px solid transparent",
                        borderRight: "6px solid rgba(17, 24, 39, 0.96)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Secondary rail */}
      {hasSubmenu && (
        <aside
          ref={(n: any) => (submenuRef.current = n)}
          className="flex flex-col bg-white border-r"
          style={{ width: submenuTargetWidth, transition: "width 160ms ease-in-out" }}
          onMouseEnter={() => {
            cancelCollapse()
            setSubmenuCollapsed(false)
          }}
          onMouseLeave={() => {
            scheduleCollapse(180)
          }}
        >
          {/* Header with collapse control */}
          <div className={`p-3 relative ${submenuCollapsed ? "mb-3" : ""}`}>
            <div className="flex items-center justify-between">
              {!submenuCollapsed && (
                <motion.h2 className="text-sm font-medium text-black" {...fade} transition={subtleTween}>
                  {activeMenu.label}
                </motion.h2>
              )}
              <button
                onClick={() => setSubmenuCollapsed(true)}
                className={`px-1 py-0.5 bg-gray-50 hover:bg-gray-100 rounded ${submenuCollapsed ? "absolute left-1/3 top-2 " : ""
                  }`}
                aria-label={submenuCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={submenuCollapsed ? "Expand" : "Collapse"}
              >
                <motion.span
                  animate={{ rotate: submenuCollapsed ? 180 : 0 }}
                  transition={subtleTween}
                  className="inline-block text-gray-500"
                >
                  <ChevronLeft size={16} />
                </motion.span>
              </button>
            </div>
          </div>

          {/* Submenu Items */}
          <nav className="flex-1 p-2">
            <div className="space-y-1">
              {activeMenu.submenu.map((submenuItem: any) => {
                  // Determine disabled set for current section
                  const disabledSet =
                    activeSection === "SEO"
                      ? DISABLED_SEO
                      : activeSection === "Campaign Activity"
                        ? DISABLED_CAMPAIGN
                        : activeSection === "Settings"
                          ? DISABLED_SETTINGS
                          : activeSection === "Content"
                            ? DISABLED_CONTENT
                            : activeSection === "Agency"
                              ? DISABLED_AGENCY
                              : new Set<string>()
                  /** ───── Grouped parent (e.g., Backlink Insights) ───── */
                  if (submenuItem.group) {
                    const ParentIcon = submenuItem.icon as any
                    const isOpen = !!openGroups[submenuItem.id]
                    const isParentSelected = submenuCollapsed
                      ? groupContainsActive(submenuItem, activeSubmenu) // when collapsed, reflect active child
                      : groupContainsActive(submenuItem, activeSubmenu)
                    const isParentDisabled = submenuItem.group.every((c: any) => disabledSet.has(c.id))

                    return (
                      <motion.div key={submenuItem.id} className="relative group" layout="position">
                        {/* Parent row */}
                        <button
                          onClick={() => {
                            if (isParentDisabled) return
                            handleGroupedParentClick(submenuItem)
                          }}
                          className={[
                            "w-full flex items-center p-2.5 text-left transition-all",
                            submenuCollapsed ? "justify-center" : "",
                            isParentSelected ? "text-brand-blue1" : "text-black",
                            isParentDisabled ? "!cursor-not-allowed opacity-50 grayscale" : "cursor-pointer hover:text-brand-blue1",
                          ].join(" ")}
                          style={{
                            backgroundColor: isParentSelected ? "white" : "transparent",
                            fontWeight: isParentSelected ? 600 : 500,
                            borderRadius: "6px",
                            boxShadow: isParentSelected ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                          }}
                          title={submenuCollapsed ? (isParentDisabled ? comingOnText : submenuItem.label) : ""}
                          aria-disabled={isParentDisabled}
                          aria-expanded={isOpen}
                          tabIndex={isParentDisabled ? -1 : 0}
                        >
                          <ParentIcon
                            size={18}
                            className="flex-shrink-0"
                            style={{
                              color: isParentSelected ? "#008CCD" : isParentDisabled ? "#9CA3AF" : "#6B7280",
                            }}
                          />

                          {/* Label */}
                          <AnimatePresence initial={false} mode="wait">
                            {!submenuCollapsed && (
                              <motion.span
                                key={`${submenuItem.id}-parent-label`}
                                className="ml-3 flex-1 text-sm"
                                {...labelPresence}
                                transition={labelPresenceTransition}
                              >
                                {submenuItem.label}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Caret (toggle only, no navigation) */}
                          {!submenuCollapsed && (
                            <motion.span
                              initial={false}
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={subtleTween}
                              className="ml-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isParentDisabled) return
                                toggleGroup(submenuItem.id)
                              }}
                              aria-hidden
                            >
                              <ChevronDown size={16} />
                            </motion.span>
                          )}
                        </button>

                        {/* Children */}
                        {!submenuCollapsed && (
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                key={`group-${submenuItem.id}-content`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={subtleTween}
                                className="mt-1 space-y-1"
                              >
                                {submenuItem.group.map((child: any) => {
                                  const ChildIcon = child.id === "Backlink Monitor" ? Link : child.icon
                                  const isChildSelected = activeSubmenu === child.id
                                  const isChildDisabled = disabledSet.has(child.id)

                                  return (
                                    <motion.div
                                      key={child.id}
                                      className="relative group pl-3"
                                      layout="position"
                                    >
                                      {isChildSelected && (
                                        <motion.div
                                          initial={false}
                                          layoutId={indicatorLayoutId}
                                          className="absolute left-0 top-0 h-full rounded-r"
                                          style={{ backgroundColor: "#008CCD", width: 2 }}
                                          transition={subtleTween}
                                        />
                                      )}

                                      <button
                                        onClick={() => {
                                          if (isChildDisabled) return
                                          handleSubmenuClick(child)
                                        }}
                                        className={[
                                          "w-full flex items-center p-2.5 text-left transition-all",
                                          isChildSelected ? "text-brand-blue1" : "text-black",
                                          isChildDisabled
                                            ? "!cursor-not-allowed opacity-50 grayscale"
                                            : "cursor-pointer hover:text-brand-blue1",
                                        ].join(" ")}
                                        style={{
                                          backgroundColor: isChildSelected ? "white" : "transparent",
                                          fontWeight: isChildSelected ? 600 : 400,
                                          borderRadius: "6px",
                                        }}
                                        title={isChildDisabled ? comingOnText : ""}
                                        aria-disabled={isChildDisabled}
                                        tabIndex={isChildDisabled ? -1 : 0}
                                      >
                                        <ChildIcon
                                          size={18}
                                          className="flex-shrink-0"
                                          style={{
                                            color: isChildSelected ? "#008CCD" : isChildDisabled ? "#9CA3AF" : "#6B7280",
                                          }}
                                        />
                                        <span className="ml-3 flex-1 text-sm transition-opacity duration-100">
                                          {child.label}
                                        </span>
                                      </button>
                                    </motion.div>
                                  )
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                      </motion.div>
                    )
                  }

                  /** ───── Regular leaf item ───── */
                  const Icon = submenuItem.id === "Backlink Monitor" ? Link : submenuItem.icon
                  const isSelected = activeSubmenu === submenuItem.id
                  const isDisabled = disabledSet.has(submenuItem.id)

                  return (
                    <motion.div key={submenuItem.id} className="relative group" layout="position">
                      {isSelected && (
                        <motion.div
                          initial={false}
                          layoutId={indicatorLayoutId}
                          className="absolute left-0 top-0 h-full rounded-r"
                          style={{ backgroundColor: "#008CCD", width: 2 }}
                          transition={subtleTween}
                        />
                      )}

                      <button
                        onClick={() => {
                          if (isDisabled) return
                          handleSubmenuClick(submenuItem)
                        }}
                        className={[
                          "w-full flex items-center p-2.5 text-left transition-all",
                          submenuCollapsed ? "justify-center" : "",
                          isSelected ? "text-brand-blue1" : "text-black",
                          isDisabled ? "!cursor-not-allowed opacity-50 grayscale" : "cursor-pointer hover:text-brand-blue1",
                        ].join(" ")}
                        style={{
                          backgroundColor: isSelected ? "white" : "transparent",
                          fontWeight: isSelected ? 600 : 400,
                          borderRadius: "6px",
                          boxShadow: isSelected ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
                        }}
                        title={submenuCollapsed ? (isDisabled ? comingOnText : submenuItem.label) : ""}
                        aria-disabled={isDisabled}
                        tabIndex={isDisabled ? -1 : 0}
                      >
                        <Icon
                          size={18}
                          className="flex-shrink-0"
                          style={{ color: isSelected ? "#008CCD" : isDisabled ? "#9CA3AF" : "#6B7280" }}
                        />

                        <AnimatePresence initial={false} mode="wait">
                          {!submenuCollapsed && (
                            <motion.span
                              key={`${submenuItem.id}-label`}
                              className="ml-3 flex-1 text-sm"
                              {...labelPresence}
                              transition={labelPresenceTransition}
                            >
                              {submenuItem.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {!submenuCollapsed && !isDisabled && submenuItem.count && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full transition-opacity duration-100"
                            style={{
                              backgroundColor: isSelected ? "#D9EEF8" : "#E5E7EB",
                              color: isSelected ? "#008CCD" : "#6B7280",
                              fontSize: "12px",
                            }}
                          >
                            {submenuItem.count}
                          </span>
                        )}
                      </button>

                      {/* Tooltip */}
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[9999]">
                        <div
                          className="text-white text-xs px-2 py-1 whitespace-nowrap relative"
                          style={{ backgroundColor: "rgba(17,24,39,0.96)", borderRadius: "6px" }}
                        >
                          {isDisabled ? comingOnText : submenuItem.label}
                          <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1"
                            style={{
                              width: 0,
                              height: 0,
                              borderTop: "6px solid transparent",
                              borderBottom: "6px solid transparent",
                              borderRight: "6px solid rgba(17,24,39,0.96)",
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </nav>
          </aside>
        )}
    </div>
  )
}

export default Sidebar
