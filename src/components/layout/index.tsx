"use client"
import { setActiveSidebar } from "@/src/redux/reducer/sidebarReducer"
import { usePathname } from "next/navigation"
import type React from "react"
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "@/src/redux/store"
import Header from "../header"
import Sidebar from "../sidebar"

const routeMapping: Record<string, { section: string; submenu?: string }> = {
  "/": { section: "Home" },
  "/projects/all": { section: "SEO", submenu: "Home" },
  "/projects/overview": { section: "SEO", submenu: "Project Overview" },
  "/dashboard": { section: "SEO", submenu: "Site Audit" },
  "/analytics": { section: "SEO", submenu: "Analytics" },
  "/projects/competitors": { section: "SEO", submenu: "Interlink Analyzer" },
  "/projects/backlink-analyzer": { section: "SEO", submenu: "Organic Visibility Insights" },
  "/keyword-insights": { section: "SEO", submenu: "Keyword Insights" },
  "/projects/backlink-monitor": { section: "SEO", submenu: "Page Insights" },
  "/projects/backlink-generator": { section: "SEO", submenu: "Backlink Insights" },
  "/projects/campaign-activities": { section: "SEO", submenu: "Competitor Intelligence System" },
  "/seo": { section: "Tools" },
  "/content": { section: "Content" },
  "/activity": { section: "Campaign" },
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const dispatch = useDispatch()
  const { activeSection, activeSubmenu } = useSelector((state: RootState) => state.sidebar)

  useEffect(() => {
    const routeConfig = routeMapping[pathname]
    if (routeConfig) {
      dispatch(
        setActiveSidebar({
          section: routeConfig.section,
          submenu: routeConfig.submenu,
        }),
      )
    }
  }, [pathname, dispatch])

  const handleActiveChange = (section: string, submenu?: string) => {
    dispatch(setActiveSidebar({ section, submenu }))
  }

  return (
    <div className="">
      <Header />
      <div className="flex h-[93vh] overflow-hidden">
        <Sidebar onActiveChange={handleActiveChange} />
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <main>
            <div key={pathname} className="mx-auto max-w-full  bg-[#F9F9F9]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
