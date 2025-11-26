"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import AffectedDrawer from "./affectedDrawer"
import { useAffectedDetails } from "@/src/redux/providers/AffectedDetailProvide"
import { useSiteDetail } from "@/src/redux/providers/SiteDetailProvider"
import { formatDateYear, normalizeForCompare, toIssueKeyStrict } from "@/src/util/helper"
import { FiRefreshCw } from "react-icons/fi"
import { BsInfo } from "react-icons/bs"
import Pagination from "@/src/util/paginationComponent"
import { Select } from "antd"
import PageOverviewDrawer from "./pageOverviewDrawer/pageOverviewDrawer"
import { ExportManager } from "@/src/lib/export-utils"

const AllAffectedPage = ({ siteIssues, selectedProject, fltIssueType }: any) => {
  const [issueDrawerOpen, setIssueDrawerOpen] = useState(false)
  const [drawerPageData, setDrawerPageData] = useState<any>(null)
  const [pageOverviewDrawerOpen, setPageOverviewDrawerOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIssueType, setSelectedIssueType] = useState<(string | null)[]>([])
 
  const [selectedSeverity, setSelectedSeverity] = useState("")
  const [selectedPageStatus, setSelectedPageStatus] = useState("")
  const [showHighIssuesOnly, setShowHighIssuesOnly] = useState(false)
  const [sortBy, setSortBy] = useState("issue_count")
  const { affectedDetails, loading, fetchDetails }: any = useAffectedDetails()
  const { siteDetails } = useSiteDetail()
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [siteDetailPageData, setSiteDetailPageData] = useState()
  const [affectedDetailsPageData, setaffectedDetailsPageData] = useState()
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (fltIssueType) {
      const normalizedKey =
        toIssueKeyStrict(fltIssueType) ??
        (typeof fltIssueType === "string" ? fltIssueType : "")
      if (normalizedKey) {
        setSelectedIssueType([normalizedKey])
        setCurrentPage(1)
        return
      }
    }
    setSelectedIssueType([])
  }, [fltIssueType])

  const latest = siteIssues?.[0]?.result ?? {}

  const collectIssueUrls = useCallback(
    (issueKey?: string | null) => {
      if (!issueKey || typeof issueKey !== "string") return []
      const bucket = latest?.[issueKey]
      if (!bucket) return []

      const normalizedUrls = new Set<string>()
      const addUrl = (url?: string | null) => {
        if (typeof url === "string" && url.trim()) {
          normalizedUrls.add(normalizeForCompare(url))
        }
      }

      const inspectEntry = (entry: any) => {
        if (!entry) return
        if (typeof entry === "string") {
          addUrl(entry)
          return
        }

        addUrl(entry.url)
        addUrl(entry.page_url)
        addUrl(entry.page)
        addUrl(entry.source_url)
        addUrl(entry.destination_url)

        if (Array.isArray(entry.pages)) {
          entry.pages.forEach((pageItem: any) => {
            if (typeof pageItem === "string") {
              addUrl(pageItem)
            } else {
              inspectEntry(pageItem)
            }
          })
        }

        if (Array.isArray(entry.urls)) {
          entry.urls.forEach((urlItem: any) => {
            if (typeof urlItem === "string") {
              addUrl(urlItem)
            } else {
              inspectEntry(urlItem)
            }
          })
        }

        if (entry.details && typeof entry.details === "object") {
          addUrl(entry.details.url)
          addUrl(entry.details.page_url)
          if (Array.isArray(entry.details.pages)) {
            entry.details.pages.forEach((pageItem: any) => {
              if (typeof pageItem === "string") {
                addUrl(pageItem)
              } else {
                inspectEntry(pageItem)
              }
            })
          }
          if (Array.isArray(entry.details.urls)) {
            entry.details.urls.forEach((urlItem: any) => {
              if (typeof urlItem === "string") {
                addUrl(urlItem)
              } else {
                inspectEntry(urlItem)
              }
            })
          }
        }
      }

      const collectFromArray = (value: any) => {
        if (Array.isArray(value)) {
          value.forEach(inspectEntry)
        }
      }

      if (Array.isArray(bucket)) {
        bucket.forEach(inspectEntry)
      } else {
        collectFromArray(bucket?.issues)
        collectFromArray(bucket?.broken)
        collectFromArray(bucket?.internal)
        collectFromArray(bucket?.external)
        collectFromArray(bucket?.other)
        collectFromArray(bucket?.images)
        collectFromArray(bucket?.iframes)
        collectFromArray(bucket?.scripts)
        collectFromArray(bucket?.stylesheets)
        collectFromArray(bucket?.sitemap_robots_issues)
        if (bucket && typeof bucket === "object") {
          inspectEntry(bucket)
        }
      }

      if (bucket?.pages_with_issues && typeof bucket.pages_with_issues === "object") {
        Object.keys(bucket.pages_with_issues).forEach(addUrl)
      }

      if (Array.isArray(bucket?.duplicates)) {
        bucket.duplicates.forEach((dup: any) => {
          collectFromArray(dup?.pages)
          collectFromArray(dup?.urls)
        })
      }

      return Array.from(normalizedUrls)
    },
    [latest]
  )
  

  useEffect(() => {
    if (!selectedProject?.id) return
    fetchDetails(selectedProject.id)
  }, [fetchDetails, selectedProject?.id])

  const handleIssueClick = (pageData: any) => {
    setDrawerPageData(pageData)
    setIssueDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIssueDrawerOpen(false)
  }

  const handlePageOverviewClick = (url: any) => {
    setPageOverviewDrawerOpen(true);

    setSiteDetailPageData(
      siteDetails?.result?.links?.filter((detail: any) => {
        // substring match (case-insensitive)
        return detail.url?.toLowerCase().includes(url.toLowerCase());
      })
    );

    setaffectedDetailsPageData(
      affectedDetails?.pages_affected?.grouped_by_url[url]
    );
  };

  const handleClosePageOverviewDrawer = () => {
    setPageOverviewDrawerOpen(false)
  }

  const getPageScore = (url: string) => {
    const match = siteDetails?.result?.links?.find(
      (link: any) => link.url?.includes(url) // substring match
    )
    return match?.page_score ?? "-"
  }

  const handleExport = async () => {
    if (!AllAffectedPageDetail?.length || isExporting) return

    setIsExporting(true)
    try {
      const exportRows = AllAffectedPageDetail.map((page: any) => {
        const criticalCount =
          page.issue_counts?.["🔴 Critical"] ?? page.issue_counts?.["dY\"' Critical"] ?? 0
        const warningCount =
          page.issue_counts?.["🟠 Warning"] ?? page.issue_counts?.["dYY� Warning"] ?? 0
        const lowCount = page.issue_counts?.["🟡 Low"] ?? page.issue_counts?.["dYY� Low"] ?? 0

        return {
          URL: page.url ?? "",
          "Page Score": getPageScore(page.url),
          "Total Issues": page.total_issues ?? 0,
          "Critical Issues": criticalCount,
          "Warning Issues": warningCount,
          "Low Issues": lowCount,
          "Last Crawled": siteDetails?.result?.analysis_completed_at
            ? formatDateYear(siteDetails.result.analysis_completed_at)
            : "",
          Status: "valid",
        }
      })

      const metadata = {
        projectId: selectedProject?.id ? String(selectedProject.id) : "unknown",
        component: "affected-pages",
        filtersApplied: {
          searchTerm,
          selectedIssueType,
          selectedSeverity,
          selectedPageStatus,
          showHighIssuesOnly,
          sortBy,
        },
        generatedAt: new Date().toISOString(),
        exportScope: "filtered" as const,
        totalRecords: exportRows.length,
      }

      const csvResult = await ExportManager.exportToCSV(exportRows, metadata)
      if (typeof csvResult !== "string") {
        console.warn("Export queued", csvResult)
        return
      }

      const blob = new Blob([csvResult], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const filename = ExportManager.getExportFilename("affected-pages", "csv", "filtered")
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const issueTypeOption = [
    {
      label: "All Issue Types",
      value: null,
    },
    {
      label: "Broken Internal Links",
      value: "broken_link_issues",
    },
    {
      label: "Schema Markup Issues",
      value: "schema_issues",
    },
    {
      label: "Missing Alt Text",
      value: "image_alt_issues",
    },
    {
      label: "Missing H1 Tags",
      value: "heading_suggestions",
    },
    {
      label: "Meta Description Issues",
      value: "meta_description_suggestions",
    },
    {
      label: "Mixed Content",
      value: "mixed_content_issues",
    },
    {
      label: "Security Issues",
      value: "security_insights",
    },
    {
      label: "5xx Server Errors",
      value: "5xx_links",
    },
    {
      label: "Meta Title Issues",
      value: "title_suggestions",
    },
    {
      label: "Robots Meta Issues",
      value: "robots_suggestions",
    },
    {
      label: "Sitemap Missing",
      value: "sitemap_robots_issues",
    },
    {
      label: "Robots.txt Missing",
      value: "sitemap_robots_issues",
    },
  ]

  const pageStatusOptions = [
    {
      name: "All Status",
      value: "",
    },
    {
      name: "Valid",
      value: "valid",
    },
    {
      name: "Invalid",
      value: "invalid",
    },
    {
      name: "Pending",
      value: "pending",
    },
  ]

  const sortOptions = [
    {
      name: "Sort By: Issue Count",
      value: "issue_count",
    },
    {
      name: "Sort By: URL",
      value: "url",
    },
    {
      name: "Sort By: Page Score",
      value: "page_score",
    },
    {
      name: "Sort By: Last Crawled",
      value: "last_crawled",
    },
  ]

const allPages: any[] = Object.values(affectedDetails?.pages_affected?.grouped_by_url ?? {});

  let AllAffectedPageDetail = allPages;

  if (showHighIssuesOnly) {
    AllAffectedPageDetail = AllAffectedPageDetail?.filter((page: any) => page.total_issues > 5)
  }

  if (searchTerm) {
    AllAffectedPageDetail = AllAffectedPageDetail?.filter((page: any) =>
      page.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (Array.isArray(selectedIssueType) && selectedIssueType.length > 0) {
    const matchedUrlSet = new Set<string>()
    selectedIssueType.forEach((type) => {
      if (typeof type === "string" && type.trim()) {
        collectIssueUrls(type).forEach((url) => matchedUrlSet.add(url))
      }
    })

    if (matchedUrlSet.size > 0) {
      AllAffectedPageDetail = AllAffectedPageDetail.filter((page: any) =>
        matchedUrlSet.has(normalizeForCompare(String(page?.url || "")))
      )
    } else {
      AllAffectedPageDetail = []
    }
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedIssueType([])
    setSelectedSeverity("")
    setSelectedPageStatus("")
    setShowHighIssuesOnly(false)
    setSortBy("issue_count")
    setCurrentPage(1)
  }

  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedData = AllAffectedPageDetail.slice(startIndex, endIndex)

  const tableRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (tableRef.current && fltIssueType) {
      tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [fltIssueType])
  return (
    <>
  <AffectedDrawer isOpen={issueDrawerOpen} onClose={handleCloseDrawer} pageData={drawerPageData} onPageAnalyzer={handlePageOverviewClick} />
      {(siteDetailPageData && affectedDetailsPageData) &&
        <PageOverviewDrawer isOpen={pageOverviewDrawerOpen} onClose={handleClosePageOverviewDrawer} siteIssuesData={siteIssues} siteDetailPageData={siteDetailPageData}
          affectedDetailsPageData={affectedDetailsPageData} />}
      <Card className="border border-gray-200 mt-4" ref={tableRef}>
        <CardHeader>
          <div className="flex justify-between items-center gap-1 border-b-2 pb-2">
            <div className="flex text-[18px] font-semibold gap-1 items-center">
              <h2 className="text-[18px] font-semibold">All Affected Pages</h2>
              <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="cursor-pointer flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2 disabled:opacity-60"
            >
              <Image
                alt=""
                src={"/images/WRanker - Export Icon grey.png"}
                className=" h-[14px] w-auto"
                height={0}
                width={0}
              />
              <span>{isExporting ? "Exporting..." : "Export"}</span>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mt-2">
            <div className="flex items-center flex-wrap gap-5">
              <div>
                <input
                  type="text"
                  placeholder="Search by URL or path"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5"
                />
              </div>
              <Select
                mode="multiple"
                style={{ width: 250 }}
                placeholder="Issue Type"
                value={selectedIssueType}
                onChange={(values) => {
                  if (!Array.isArray(values)) {
                    setSelectedIssueType([])
                    return
                  }
                  if (values.includes(null)) {
                    setSelectedIssueType([])
                  } else {
                    setSelectedIssueType(values)
                  }
                }}
                options={issueTypeOption}
                maxTagCount="responsive"
              // maxTagCount={2}
              // maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more selected`}
              />
              <form>
                <select
                  value={selectedPageStatus}
                  onChange={(e) => setSelectedPageStatus(e.target.value)}
                  className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5"
                >
                  {pageStatusOptions.map((item, index) => (
                    <option key={index} value={item.value}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </form>

              <div>
                <div className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5 flex items-center gap-2">
                  <span>{"Show pages with >5 Issue Only"}</span>
                  <input
                    type="checkbox"
                    checked={showHighIssuesOnly}
                    onChange={(e) => setShowHighIssuesOnly(e.target.checked)}
                  />
                </div>
              </div>

              <form>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5"
                >
                  {sortOptions.map((item, index) => (
                    <option key={index} value={item.value}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </form>
            </div>
            <div
              className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2 cursor-pointer"
              onClick={handleClearFilters}
            >
              <FiRefreshCw className="cursor-pointer h-[14px] w-auto" />
              <span>Clear</span>
            </div>
          </div>
        </CardContent>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">#</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">URL</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">PAGE HEALTH</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">ISSUE</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">HIGH</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">MED</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">LOW</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">LAST CRAWLED</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">STATUS</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">TAGS</th>
                  <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData?.length > 0 ? (
                  paginatedData.map((page, index) => {
                    const { url, total_issues, issue_counts }: any = page
                    const shortUrl = url.replace(`https://${affectedDetails.domain}` || url.replace(`https://${affectedDetails.domain}/`), "")
                    // const matchingSiteDetail = siteDetails?.result?.links?.find((link: any) => link.url === url)
                    const lastCrawled = siteDetails?.result?.analysis_completed_at
                    const getPageScore = (url: string) => {
                      const match = siteDetails?.result?.links?.find(
                        (link: any) => link.url?.includes(url) // substring match
                      );
                      return match?.page_score ?? "-"; // return "-" if not found
                    };
                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      >
                        <td>
                          <input type="checkbox" />
                        </td>
                        <td className="text-blue-600 hover:text-blue-800 py-3 px-4 text-[14px] font-medium"
                          onClick={() => handlePageOverviewClick(url)}
                        >
                          {url}
                        </td>
                        <td>
                          <span className="py-3 px-4 text-[14px] font-medium p-[10px] rounded-full">
                            {getPageScore(url)}
                          </span>
                        </td>
                        <td onClick={() => handleIssueClick(page)}>
                          <span className="p-[10px] bg-gray-50 hover:bg-gray-200 rounded-lg text-blue-600 hover:text-blue-800 py-3 px-4 text-[14px] font-medium">
                            {total_issues}
                          </span>
                        </td>
                        <td>
                          <span className="py-3 px-4 text-[14px] font-medium p-[10px]  rounded-full">
                            {issue_counts["🔴 Critical"] ?? 0}
                          </span>
                        </td>
                        <td>
                          <span className="py-3 px-4 text-[14px] font-medium p-[10px]  rounded-full">
                            {issue_counts["🟡 Low"] ?? "--"}
                          </span>
                        </td>
                        <td>
                          <span className="py-3 px-4 text-[14px] font-medium p-[10px]  rounded-full">
                            {issue_counts["🟠 Warning"] ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[14px] font-medium">{formatDateYear(lastCrawled)}</td>
                        <td className="py-3 px-4 text-[14px] font-medium flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-[#10B981]`}></div>
                          <span>valid</span>
                        </td>
                        <td>
                          <span className="py-3 px-4 text-[14px] font-medium p-[10px] bg-gray-200 rounded-full">
                            info
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              🔍
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              ✅
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              ✅
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-gray-500">
                      {searchTerm || selectedIssueType || selectedSeverity || selectedPageStatus || showHighIssuesOnly
                        ? "No pages match your current filters"
                        : "Data Not Found 🎉"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalItems={AllAffectedPageDetail?.length}
              rowsPerPage={rowsPerPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default AllAffectedPage
