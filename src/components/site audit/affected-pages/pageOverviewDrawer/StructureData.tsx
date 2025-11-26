import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Globe, FileJson, FileText, Package, Star, List } from "lucide-react"
import { BsInfo } from "react-icons/bs"
import Image from "next/image"
import { Lightbulb, MessageSquare, Link2, FileQuestion, Target, XCircle, Info } from "lucide-react"
import type { JSX } from "react/jsx-runtime" // Import JSX to fix the undeclared variable error
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider"
import { useProjectManager } from "@/src/hooks/use-project-manager"

const StructureData = ({ siteDetailPageData, affectedDetailsPageData }: any) => {
  const schemaData = siteDetailPageData?.[0]?.schema_analysis || {}
  const hasSchema = schemaData.has_schema || false
  const detectedSchemaTypes = schemaData.schema_types || []
  const schemaErrors = schemaData.errors || []
  const schemaWarnings = schemaData.warnings || []
  const detailedResults = schemaData.detailed_results || []

  const schemaTypes = detectedSchemaTypes.map((type: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      WebSite: <Globe className="w-4 h-4 text-blue-600" />,
      Organization: <Package className="w-4 h-4 text-green-600" />,
      Article: <FileText className="w-4 h-4 text-yellow-600" />,
      Product: <Package className="w-4 h-4 text-green-600" />,
      Breadcrumb: <List className="w-4 h-4 text-orange-500" />,
      Review: <Star className="w-4 h-4 text-yellow-500" />,
    }

    return {
      name: type,
      icon: iconMap[type] || <FileJson className="w-4 h-4 text-gray-600" />,
    }
  })

  const renderSchemaSection = (schemaResult: any) => {
    const { type, items, errors = [], warnings = [], item_count } = schemaResult
    const allIssues = [...errors, ...warnings]

    return (
      <Card key={type} className="w-full bg-white shadow-sm border rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
            <div className="flex text-[18px] font-semibold gap-1 items-center">
              <h2 className="text-[18px] font-semibold">{type} Schema</h2>
              <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
            </div>
            {allIssues.length > 0 ? (
              <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-md">{allIssues.length} Issues</span>
            ) : (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-md">Valid</span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 py-4">
          {/* Schema Details */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-800">
              Schema Properties ({item_count} item{item_count !== 1 ? "s" : ""})
            </h4>
            {items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.entries(item).map(
                    ([key, value]: [string, any]) =>
                      key !== "@context" && (
                        <div key={key} className="flex flex-col">
                          <span className="font-mono text-xs text-gray-500">{key}:</span>
                          <span className="text-gray-700 break-all">
                            {typeof value === "string" ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ),
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Issues if any */}
          {allIssues.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-gray-800">Issues Found</h4>
              {allIssues.map((issue: any, idx: number) => (
                <div key={idx} className="space-y-2">
                  <div className="flex gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {issue.type || (errors.includes(issue) ? "Schema Error" : "Schema Warning")}
                      </p>
                      <p className="text-sm font-mono text-gray-600 mt-1">{issue.field || "Schema Validation"}</p>
                    </div>
                  </div>

                  <p className="text-xs font-mono bg-gray-200 py-1 px-4 text-gray-500 rounded-md inline-block">
                    {type} Schema
                  </p>

                  <p className="text-sm text-gray-600">
                    {issue.message || issue.description || "Schema validation issue detected."}
                  </p>

                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="flex items-center gap-1 text-sm font-medium text-blue-700 mb-2">
                      <Info className="w-4 h-4" /> Suggested Fix:
                    </p>
                    <span>{issue.suggested_fix || `Review ${type} schema implementation.`}</span>
                    {issue.fix && (
                      <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded-md overflow-x-auto mt-2">
                        {issue.fix}
                      </pre>
                    )}
                  </div>

                  <div className="flex gap-4 mt-2">
                    <Button variant="link" className="text-blue-600 text-sm p-0">
                      Open Schema Fix Viewer
                    </Button>
                    <Button variant="link" className="text-blue-600 text-sm p-0">
                      Create Task
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const generateSuggestions = () => {
    const suggestions: any[] = []

    if (!detectedSchemaTypes.includes("FAQ")) {
      suggestions.push({
        title: "Add FAQ Schema to Expand SERP Coverage",
        description: "FAQ schema can increase visibility via FAQ-rich results and capture 'People Also Ask' features.",
        tags: [{ label: "High Impact", color: "bg-red-100 text-red-600" }],
        icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
        action: "Create Task",
      })
    }

    if (!detectedSchemaTypes.includes("Review")) {
      suggestions.push({
        title: "Use Review Schema for Testimonials",
        description: "Add Review schema to enable rich snippets with star ratings and improve click-through rates.",
        tags: [{ label: "Medium Impact", color: "bg-yellow-100 text-yellow-700" }],
        icon: <MessageSquare className="w-5 h-5 text-pink-500" />,
        action: "Create Task",
      })
    }

    if (!detectedSchemaTypes.includes("Breadcrumb")) {
      suggestions.push({
        title: "Use Breadcrumb Schema",
        description: "Implement BreadcrumbList schema for better crawling and rich snippets in search results.",
        tags: [{ label: "Medium Impact", color: "bg-yellow-100 text-yellow-700" }],
        icon: <Link2 className="w-5 h-5 text-blue-500" />,
        action: "Apply Suggestion",
      })
    }

    if (!detectedSchemaTypes.includes("Article")) {
      suggestions.push({
        title: "Add Article Schema",
        description:
          "Article schema helps search engines understand your content structure and can improve visibility.",
        tags: [{ label: "High Impact", color: "bg-red-100 text-red-600" }],
        icon: <FileQuestion className="w-5 h-5 text-orange-500" />,
        action: "Create Task",
      })
    }

    // Add general suggestions
    suggestions.push({
      title: "Improve Intent Alignment",
      description:
        "Optimize content structure and add clear CTAs to better target user search intent and boost conversions.",
      tags: [{ label: "Medium Impact", color: "bg-yellow-100 text-yellow-700" }],
      icon: <Target className="w-5 h-5 text-pink-600" />,
      action: "Create Task",
    })

    return suggestions.slice(0, 6) // Limit to 6 suggestions
  }
  const { openTaskDrawer } = useTaskDrawer();
  const { selectedProject } = useProjectManager();
  const suggestions = generateSuggestions()

  return (
    <>
      <Card className="w-full bg-white shadow-sm border rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
            <div className="flex text-[18px] font-semibold gap-1 items-center">
              <h2 className="text-[18px] font-semibold">Schema Presence Summary</h2>
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

        {/* Content */}
        <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left Side - Schema Types */}
          <div className="flex flex-col">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">📦 Detected Schema Types:</h3>
            <div className="flex flex-wrap gap-2">
              {!hasSchema ? (
                <span className="rounded-sm flex items-center gap-1 border px-3 py-1 text-sm font-medium text-red-500">
                  <XCircle className="w-4 h-4" />
                  No Schema Detected
                </span>
              ) : schemaTypes.length > 0 ? (
                schemaTypes.map((s: any, idx: number) => (
                  <span
                    key={idx}
                    className="rounded-sm flex items-center gap-1 border px-3 py-1 text-sm font-medium text-gray-600"
                  >
                    {s.icon}
                    {s.name} ✅
                  </span>
                ))
              ) : (
                <span className="rounded-sm flex items-center gap-1 border px-3 py-1 text-sm font-medium text-gray-400">
                  <Info className="w-4 h-4" />
                  Schema Present but No Types Detected
                </span>
              )}
            </div>
          </div>

          {/* Right Side - Buttons */}
          <div className="flex gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
              <Globe className="w-4 h-4" />
              View in Rich Results Test
            </Button>
            <Button variant="outline" className="flex items-center gap-2 border-gray-300 bg-transparent">
              <FileJson className="w-4 h-4 text-red-500" />
              Export Schema JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {detailedResults.map((schemaResult: any) => renderSchemaSection(schemaResult))}

      <Card className="w-full bg-white shadow-sm border rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
            <div className="flex text-[18px] font-semibold gap-1 items-center">
              <h2 className="text-[18px] font-semibold">AI Enhancement Suggestions</h2>
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

        {/* Card Grid */}
        <CardContent>
          <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 mt-4 ">
            {suggestions?.map((items: any, index: number) => (
              <div key={index} className="bg-white p-4 rounded-md border border-gray-200">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[#000000] text-[14px] font-semibold">{items.title}</span>
                    <BsInfo size={20} color="#9E9E9E" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-5">
                      <span className=" flex justify-start font-normal text-sm text-gray-400 text-[14px]">
                        {items.description}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      {items.tags?.map((tag: any, index: number) => (
                        <div key={index} className="text-[14px] font-medium flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${tag.color}`}></div>
                          <span>{tag.label}</span>
                        </div>
                      ))}
                      <span 
                      onClick={() =>
                      openTaskDrawer({
                        title: items.title,
                        description: items.description,
                        projectId: selectedProject?.id ?? null,
                        type: "createNew",
                      })
                    }
                      className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer align-middle underline decoration-solid">
                        Create Task
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default StructureData
