"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { useState, useMemo } from "react"
import { BsInfo } from "react-icons/bs"
import Spkapexcharts from "../spk-packages/apexcharts-component"
import { Pagination } from "antd"
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider"
import { useProjectManager } from "@/src/hooks/use-project-manager"


const Enhancement = ({ siteIssues, sitedetails }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalPages, setModalPages] = useState<string[]>([])
  const [validationTimelineType, setvalidationTimelineType] = useState("timeline")
  const { openTaskDrawer } = useTaskDrawer();
  const { selectedProject } = useProjectManager();

  // Get the latest issue data
  const latestIssues = siteIssues && siteIssues.length > 0 ? siteIssues[0] : null
  const schemaIssues = latestIssues?.result?.schema_issues || {}
  const schemaTypesData = schemaIssues.schema_types_summary || {}


  const schemaWarningsCount =
    siteIssues[0]?.result?.schema_issues?.issues?.filter((obj: any) => obj.warning && obj.warning.length > 0).length ||
    0
  const schemaErrorsCount =
    siteIssues[0]?.result?.schema_issues?.issues?.filter((obj: any) => obj.errors && obj.errors.length > 0).length || 0
  const richResultsEligible = sitedetails?.result?.total_pages_analyzed

  const REQUIRED_SCHEMAS = [
    "FAQPage",
    "BreadcrumbList",
    "LocalBusiness",
    "Product",
    "Organization",
    "Article",
    "ImageObject",
    "VideoObject",
  ]

  const SCHEMA_DISPLAY_NAMES = {
    FAQPage: "FAQ Schema",
    BreadcrumbList: "Breadcrumb Schema",
    LocalBusiness: "Local Business Schema",
    Product: "Product Schema",
    Organization: "Organization Schema",
    ImageObject: "Image Markup",
    Article: "Article Schema",
    VideoObject: "Video Markup",
  }

  const schemaSummary = siteIssues[0]?.result?.schema_issues?.schema_types_summary || {}

  const allIssues = siteIssues[0]?.result?.schema_issues?.issues || []

  const enhancementSchemas = REQUIRED_SCHEMAS.map((schemaType, index) => {
    const data = schemaSummary[schemaType]
    const pages = data?.pages || []

    const pagesWithIssues = allIssues.filter((issue: any) => pages.includes(issue.url))

    const errorPages = pagesWithIssues.filter((issue: any) => issue.errors.length > 0).length
    const warningPages = pagesWithIssues.filter(
      (issue: any) => issue.warnings.length > 0 && issue.errors.length === 0,
    ).length
    const totalPages = data?.pages_with_schema || 0
    const validPages = totalPages - errorPages - warningPages

    return {
      title: SCHEMA_DISPLAY_NAMES[schemaType as keyof typeof SCHEMA_DISPLAY_NAMES] || schemaType,
      totalPages,
      validPages: Math.max(0, validPages),
      errorPages,
      warningPages,
      pages,
    }
  })


  // Create validation chart data
  const validationChartData = enhancementSchemas.map((schema) => ({
    name: schema.title.replace(" Schema", "").replace("AMP Status", "AMP"),
    valid: schema.validPages,
    warnings: schema.warningPages,
    errors: schema.errorPages,
  }))

  const validationStatusData = useMemo(() => {
    const tableData: any[] = []
    let id = 1

    // Iterate through all schema types in the summary
    Object.entries(schemaSummary).forEach(([schemaType, schemaData]: [string, any]) => {
      const enhancementType = SCHEMA_DISPLAY_NAMES[schemaType as keyof typeof SCHEMA_DISPLAY_NAMES] || schemaType
      const pages = schemaData?.pages || []
      const errors = schemaData?.errors || []
      const warnings = schemaData?.warnings || []

      // Create a row for each page with this schema type
      pages.forEach((url: string) => {
        // Determine status based on errors and warnings
        let status = "Valid"
        if (errors.length > 0) {
          status = "Error"
        } else if (warnings.length > 0) {
          status = "Warning"
        }

        // Generate placeholder dates (you can modify this logic as needed)
        const detectedDate = "2025-08-25"
        const lastChecked = "2025-08-26"

        tableData.push({
          id: id++,
          url: url,
          enhancementType: enhancementType,
          status: status, // Renamed from gscStatus to status
          validationStatus: status === "Valid" ? "Valid" : status === "Error" ? "Still Present" : "Under Review",
          detectedDate: detectedDate,
          lastChecked: lastChecked,
        })
      })
    })

    return tableData
  }, [schemaSummary, SCHEMA_DISPLAY_NAMES])

  // Timeline data
  const timelineData = [
    {
      title: "FAQ Schema",
      date: "May 24",
      status: "Detected",
      color: "bg-gray-400",
    },
    {
      title: "Product Schema",
      date: "May 30",
      status: "Detected",
      color: "bg-gray-400",
    },
    {
      title: "Product Schema",
      date: "Jun 5",
      status: "Submitted",
      color: "bg-blue-500",
    },
    {
      title: "Review Snippets",
      date: "Jun 16",
      status: "Fixed",
      color: "bg-green-500",
    },
  ]

  const cardsData = [
    {
      title: "Rich Results Eligible",
      value: 422,
      description: "Ipsum text will be here",
      progress: 100,
    },
    {
      title: "Enhancement Errors",
      value: 26,
      description: "Ipsum text will be here.",
      progress: Math.round((842 / 1434) * 100),
    },
    {
      title: "Enhancement Warnings",
      value: 73,
      description: "Ipsum text will be here",
      progress: Math.round((512 / 1434) * 100),
    },
    {
      title: "Under Validation",
      value: "N/A",
      description: "Ipsum text will be here",
      progress: Math.round((16 / 1434) * 100),
    },
  ]

  const Columnbasicseries = [
    {
      name: "Errors",
      data: validationChartData.map((item) => item.errors),
    },
    {
      name: "Warnings",
      data: validationChartData.map((item) => item.warnings),
    },
    {
      name: "Valid",
      data: validationChartData.map((item) => item.valid),
    },
  ]
  const Columnbasicoptions: any = {
    chart: {
      type: "bar",
      height: 320,
      events: {
        mounted: (chart: { windowResizeHandler: () => void }) => {
          chart.windowResizeHandler()
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "80%",
      },
    },
    grid: {
      borderColor: "#f2f5f7",
    },
    dataLabels: {
      enabled: false,
    },
    colors: ["#E94134", "#F9BB04", "#10B981"],
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      // categories: ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
      categories: validationChartData.map((item) => item.name),
      labels: {
        show: true,
        style: {
          colors: "#8c9097",
          fontSize: "11px",
          fontWeight: 600,
          cssClass: "apexcharts-xaxis-label",
        },
      },
    },
    yaxis: {
      title: {
        // text: "$ (thousands)",
        style: {
          color: "#8c9097",
        },
      },
      labels: {
        show: true,
        style: {
          colors: "#8c9097",
          fontSize: "11px",
          fontWeight: 600,
          cssClass: "apexcharts-xaxis-label",
        },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val: string) => val,
      },
    },
  }
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5 // rows per page

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = validationStatusData.slice(startIndex, endIndex)

  return (
    <>
      {/* Top Statistics Cards */}

      <div className="flex flex-col gap-4">
        <Card className="border border-gray-200 ">
          <CardHeader>
            <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
              <div className="flex text-[18px] font-semibold gap-1 items-center">
                <h2 className="text-[18px] font-semibold">Enahancement Summary</h2>
                <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
              </div>
              <div className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2">
                <Image
                  alt=""
                  src={"/images/WRanker - Export Icon grey.png"}
                  className="cursor-pointer h-[14px] w-auto"
                  height={0}
                  width={0}
                />
                <span>Export</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
              <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[#000000] text-[14px] font-medium">Rich Results Eligible</span>
                    <BsInfo size={18} color="#9E9E9E" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <span className="font-semibold text-[24px] text-[#0077FF]">{richResultsEligible}</span>
                      <span className="font-semibold text-[24px] text-[#0077FF]">Pages</span>
                    </div>
                    <span className="text-right flex justify-start font-normal text-[14px]">
                      Ipsum text will be here
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[#000000] text-[14px] font-medium">Enhancement Errors</span>
                    <BsInfo size={18} color="#9E9E9E" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <span className="font-semibold text-[24px] text-[#0077FF]">{schemaErrorsCount}</span>
                      <span className="font-semibold text-[24px] text-[#0077FF]">Pages</span>
                    </div>
                    <span className="text-right flex justify-start font-normal text-[14px]">
                      Ipsum text will be here
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[#000000] text-[14px] font-medium">Enhancement Warnings</span>
                    <BsInfo size={18} color="#9E9E9E" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <span className="font-semibold text-[24px] text-[#0077FF]">{schemaWarningsCount}</span>
                      <span className="font-semibold text-[24px] text-[#0077FF]">Pages</span>
                    </div>
                    <span className="text-right flex justify-start font-normal text-[14px]">
                      Ipsum text will be here
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[#000000] text-[14px] font-medium">Under Validation</span>
                    <BsInfo size={18} color="#9E9E9E" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <span className="font-semibold text-[24px] text-[#0077FF]">{"N/A"}</span>
                      <span className="font-semibold text-[24px] text-[#0077FF]">Pages</span>
                    </div>
                    <span className="text-right flex justify-start font-normal text-[14px]">
                      Ipsum text will be here
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Schema Type Cards Grid */}
        <Card className="border border-gray-200 mt-4">
          <CardHeader>
            <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
              <div className="flex text-[18px] font-semibold gap-1 items-center">
                <h2 className="text-[18px] font-semibold">Enahancement Type</h2>
                <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
              </div>
              <div className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2">
                <Image
                  alt=""
                  src={"/images/WRanker - Export Icon grey.png"}
                  className="cursor-pointer h-[14px] w-auto"
                  height={0}
                  width={0}
                />
                <span>Export</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
                {enhancementSchemas.map((schema: any, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                    <div className="flex justify-between">
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-2 items-center">
                          <span className="text-[#000000] text-[14px] font-medium">{schema.title}</span>
                          <BsInfo size={18} color="#9E9E9E" />
                        </div>
                        <div className="text-[14px] font-normal">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-brand-green rounded-full"></div>
                            <span>{schema.totalPages} pages</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-brand-red rounded-full"></div>
                            <span>{schema.errorPages} Pages</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-brand-yellow rounded-full"></div>
                            <span>{schema.warningPages} Pages</span>
                          </div>
                        </div>
                      </div>

      {(
        (schema.totalPages ?? 0) > 0 ||
        (schema.errorPages ?? 0) > 0 ||
        (schema.warningPages ?? 0) > 0
      ) && (
        <div className="flex items-end">
          <span
            onClick={() =>
              openTaskDrawer({
                title: schema.title,
                projectId: selectedProject?.id ?? null,
                type: "createNew",
              })
            }
            className="text-[#0077FF] font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid"
          >
            Create Task
          </span>
        </div>
      )}
                    </div>
                  </div>
                ))}
              </div>
              <Card className="bg-white border border-gray-200 mb-6">
                <CardContent className="p-6">
                  <div className="h-80">
                    <div id="column-basic">
                      <Spkapexcharts
                        chartOptions={Columnbasicoptions}
                        chartSeries={Columnbasicseries}
                        type="bar"
                        width={"100%"}
                        height={320}
                      />
                    </div>
                  </div>
                  {/* <div className="flex items-center justify-end space-x-6 mt-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Valid</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>Warnings</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Errors</span>
                  </div>
                </div> */}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Validation Chart */}

        {/* Validation Status Table */}
        <Card className="bg-white border border-gray-200 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
              <div className="flex text-[18px] font-semibold gap-1 items-center">
                <h2 className="text-[18px] font-semibold">Validation Status</h2>
                <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
              </div>
              <div className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2">
                <Image
                  alt=""
                  src={"/images/WRanker - Export Icon grey.png"}
                  className="cursor-pointer h-[14px] w-auto"
                  height={0}
                  width={0}
                />
                <span>Export</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase">URL</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase">
                        ENHANCEMENT TYPE
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase">STATUS</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase">
                        VALIDATION STATUS
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase">DETECTED DATE</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase">LAST CHECKED</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item: any) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-blue-600 text-sm max-w-xs">
                          <div className="truncate">{item.url}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">{item.enhancementType}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-sm ${item.status === "Error"
                                ? "text-red-600"
                                : item.status === "Warning"
                                  ? "text-yellow-600"
                                  : "text-green-600"
                              }`}
                          >
                            {item.status === "Error" ? "❌ Error" : item.status === "Warning" ? "⚠️ Warning" : "✅ Valid"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{item.validationStatus}</td>
                        <td className="py-3 px-4 text-sm">{item.detectedDate}</td>
                        <td className="py-3 px-4 text-sm">{item.lastChecked}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
            <div className="flex items-center justify-end mt-4">
              <div className="flex justify-end mt-4">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={validationStatusData.length}
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Validation Timeline */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Validation Timeline</CardTitle>
              <div className=" border rounded  flex ">
                <button
                  onClick={() => setvalidationTimelineType("timeline")}
                  className={`text-[14px] font-normal cursor-pointer ${validationTimelineType === "timeline" ? "bg-[#D9EEF8] text-[#008ccd]" : "text-gray-400 "} p-2 border-r rounded `}
                >
                  Timeline View
                </button>
                <button
                  onClick={() => setvalidationTimelineType("table")}
                  className={`text-[14px] font-normal cursor-pointer ${validationTimelineType === "table" ? " bg-[#D9EEF8]  text-[#008ccd]" : "text-gray-400 "} p-2 rounded `}
                >
                  Table View
                </button>
              </div>
              {/* <div className="flex space-x-2">
              <Button className="bg-blue-600 text-white text-sm px-4 py-2">Timeline</Button>
              <Button variant="outline" className="text-sm px-4 py-2 bg-transparent">
                Table
              </Button>
            </div> */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Legend */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span>Detected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Submitted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Fixed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Warning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Error</span>
                </div>
              </div>

              {/* Timeline Items */}
              <div className="space-y-6">
                {timelineData.map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                      {index < timelineData.length - 1 && <div className="w-px h-12 bg-gray-300 mt-2"></div>}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default Enhancement
