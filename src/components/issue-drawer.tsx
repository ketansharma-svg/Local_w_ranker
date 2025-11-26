"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Drawer } from "antd"
import { Calendar, Check, ExternalLink, Eye, Plus, RotateCcw, Shield, Tag, Upload, X } from "lucide-react"
import { useState } from "react"

interface PageAffected {
  url: string
  title: string
  status: "New" | "Existing" | "Re_Appeared"
  validation: "Validated" | "Not Validated"
}

interface Issue {
  title: string
  severity: "Critical" | "Medium" | "Low" | string
  summary: string
  pagesAffected: PageAffected[]
  fixInstructions: string
}

interface IssueDrawerProps {
  issue: Issue | null
  isOpen: boolean
  onClose: () => void
}

// Demo data for different tabs
const issueMetadata = {
  firstDetected: "May 8, 2025",
  lastAudit: "June 13, 2025",
  source: "Webflow AI",
  validation: "Not Validated",
  category: "Content",
  auditType: "Full Site Audit",
  seoImpact: "High - Affects on-page structure",
  affectedPagesCount: 8,
}

const taskHistory = [
  {
    id: 1,
    action: "Issue Detected",
    date: "May 8, 2025",
    user: "System",
    status: "Completed",
  },
  {
    id: 2,
    action: "Validation Requested",
    date: "May 15, 2025",
    user: "John Doe",
    status: "Pending",
  },
  {
    id: 3,
    action: "Fix Applied",
    date: "May 20, 2025",
    user: "Jane Smith",
    status: "In Progress",
  },
]

const fixInstructions = [
  {
    step: 1,
    title: "Identify pages without H1 tags",
    description: "Review the affected pages list and prioritize based on traffic and importance.",
  },
  {
    step: 2,
    title: "Add appropriate H1 tags",
    description: "Create descriptive H1 tags that accurately represent the main topic of each page.",
  },
  {
    step: 3,
    title: "Ensure H1 uniqueness",
    description: "Make sure each page has only one H1 tag and that it's unique across your site.",
  },
  {
    step: 4,
    title: "Test and validate",
    description: "Use SEO tools to verify the H1 tags are properly implemented and crawlable.",
  },
]

export function IssueDrawer({ issue, isOpen, onClose }: IssueDrawerProps) {
  const [activeTab, setActiveTab] = useState("issue-details")
  const [isPageOverviewOpen, setIsPageOverviewOpen] = useState(false)
  const [selectedPage, setSelectedPage] = useState<PageAffected | null>(null)

  if (!isOpen || !issue) return null

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "Existing":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "Re_Appeared":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getValidationColor = (validation: string) => {
    return validation === "Validated"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200"
  }

  const tabItems = [
    { id: "issue-details", label: "Issue Details", icon: Shield },
    { id: "affected-pages", label: "Affected Pages", icon: ExternalLink },
    { id: "fix-instructions", label: "Fix Instructions", icon: Check },
    { id: "screenshot", label: "Screenshot", icon: Eye },
    { id: "task-status", label: "Task Status", icon: Tag },
    { id: "issue-history", label: "Issue History", icon: Calendar },
  ]


  return (
    <>
      <Drawer
        placement="right"
        onClose={onClose}
        open={isOpen}
        width={1100}
        closable={false}
        bodyStyle={{ padding: 0 }}
      >


        {/* Drawer */}
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-[1100px] bg-white shadow-xl z-50 transform transition-transform duration-300",
            isOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-gray-900">Issue: {issue.title}</h2>
              <Badge className={cn("text-xs font-medium border", getSeverityColor(issue.severity))}>
                ● {issue.severity}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-green-600 flex items-center">● Last Audit: {issueMetadata.lastAudit}</span>
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Upload className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex h-full">
            {/* Left Sidebar Navigation */}
            <div className="w-48 bg-gray-50 border-r">
              <nav className="p-2 space-y-1">
                {tabItems.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab === tab.id
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
              {/* Issue Details Tab */}
              {activeTab === "issue-details" && (
                <div className="p-6 space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">{issue.title}</h3>
                    <p className="text-blue-800 text-sm leading-relaxed">{issue.summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">SEO Impact:</span>
                        <span className="text-sm text-red-600 font-medium">{issueMetadata.seoImpact}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">First Detected:</span>
                        <span className="text-sm text-gray-900">{issueMetadata.firstDetected}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">Source:</span>
                        <span className="text-sm text-gray-900">{issueMetadata.source}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">Validation:</span>
                        <Badge className={cn("text-xs", getValidationColor(issueMetadata.validation))}>
                          {issueMetadata.validation === "Not Validated" ? "✗" : "✓"} {issueMetadata.validation}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">Category:</span>
                        <span className="text-sm text-gray-900">{issueMetadata.category}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">Audit Type:</span>
                        <span className="text-sm text-gray-900">{issueMetadata.auditType}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Affected Pages Tab */}
              {activeTab === "affected-pages" && (
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Affected Pages ({issue.pagesAffected?.length || 0})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed border border-gray-200 rounded-md">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="w-1/5 text-left py-3 px-4 font-medium text-gray-600 text-sm">URL</th>
                          <th className="w-1/5 text-left py-3 px-4 font-medium text-gray-600 text-sm">TITLE</th>
                          <th className="w-1/5 text-left py-3 px-4 font-medium text-gray-600 text-sm">STATUS</th>
                          <th className="w-1/5 text-left py-3 px-4 font-medium text-gray-600 text-sm">VALIDATION</th>
                          <th className="w-1/5 text-left py-3 px-4 font-medium text-gray-600 text-sm">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issue.pagesAffected?.map((page: PageAffected, index: number) => (
                          <tr key={index} className="border-t hover:bg-gray-50">
                            <td
                              className="w-1/5 py-3 px-4 text-blue-600 font-mono text-sm hover:underline cursor-pointer break-words"
                              onClick={() => {
                                setSelectedPage(page);
                                setIsPageOverviewOpen(true);
                              }}
                            >
                              {page.url}
                            </td>
                            <td className="w-1/5 py-3 px-4 text-sm break-words">{page.title}</td>
                            <td className="w-1/5 py-3 px-4">
                              <Badge className={cn("text-xs border", getStatusColor(page.status))}>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">●</span>
                                  <span>{page.status.replace("_", " ")}</span>
                                </div>
                              </Badge>
                            </td>
                            <td className="w-1/5 py-3 px-4">
                              <Badge className={cn("text-xs border", getValidationColor(page.validation))}>
                                <div className="flex items-center gap-1">
                                  <span>{page.validation === "Validated" ? "✓" : "✗"}</span>
                                  <span>{page.validation}</span>
                                </div>
                              </Badge>
                            </td>
                            <td className="w-1/5 py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex items-center justify-center">
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7 px-2 text-blue-600 border-blue-200 bg-transparent"
                                >
                                  {page.validation === "Not Validated" ? "Create Task" : "View Task"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                  </div>
                </div>
              )}

              {/* Fix Instructions Tab */}
              {activeTab === "fix-instructions" && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">How to Fix This Issue</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                      <p className="text-blue-800 text-sm leading-relaxed">{issue.fixInstructions}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Step-by-Step Instructions</h4>
                    <div className="space-y-4">
                      {fixInstructions.map((instruction) => (
                        <div key={instruction.step} className="flex space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {instruction.step}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-1">{instruction.title}</h5>
                            <p className="text-sm text-gray-600">{instruction.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h5 className="font-medium text-yellow-800 mb-2">⚠️ Important Notes</h5>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Ensure each page has exactly one H1 tag</li>
                      <li>• H1 tags should be descriptive and unique</li>
                      <li>• Test changes in a staging environment first</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Screenshot Tab */}
              {activeTab === "screenshot" && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Issue Screenshot</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No screenshot available for this issue</p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Screenshot
                    </Button>
                  </div>
                </div>
              )}

              {/* Task Status Tab */}
              {activeTab === "task-status" && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Task Status</h3>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Task
                    </Button>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Current Status</span>
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200">In Progress</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Task created and assigned to development team</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Task History</h4>
                    <div className="space-y-3">
                      {taskHistory.map((task) => (
                        <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{task.action}</span>
                              <span className="text-xs text-gray-500">{task.date}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-600">by {task.user}</span>
                              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                                {task.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Issue History Tab */}
              {activeTab === "issue-history" && (
                <div className="p-6 space-y-6">
                  <h3 className="text-lg font-semibold">Issue History</h3>

                  <div className="space-y-4">
                    <div className="border-l-4 border-red-500 pl-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-red-600">Issue First Detected</span>
                        <span className="text-sm text-gray-500">{issueMetadata.firstDetected}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Missing H1 tag detected on {issueMetadata.affectedPagesCount} pages during full site audit
                      </p>
                    </div>

                    <div className="border-l-4 border-yellow-500 pl-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-yellow-600">Validation Requested</span>
                        <span className="text-sm text-gray-500">May 15, 2025</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Manual validation requested for affected pages</p>
                    </div>

                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-600">Issue Updated</span>
                        <span className="text-sm text-gray-500">{issueMetadata.lastAudit}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Issue status updated during latest audit - 3 pages fixed, 5 still affected
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Next Steps</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Complete H1 tag implementation on remaining pages</li>
                      <li>• Schedule validation for fixed pages</li>
                      <li>• Monitor for new occurrences in future audits</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Drawer>
      {/* Page Overview Modal */}
      {selectedPage && (
        <PageOverviewModal
          isOpen={isPageOverviewOpen}
          onClose={() => setIsPageOverviewOpen(false)}
        />
      )}
    </>
  )
}

function PageOverviewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("content-quality")

  const tabItems = [
    { id: "content-quality", label: "Content Quality" },
    { id: "seo-health", label: "SEO & Health" },
    { id: "on-page-seo", label: "On-Page SEO" },
    { id: "structured-data", label: "Structured Data" },
    { id: "ux-readability", label: "UX & Readability" },
  ]

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-6xl h-[90vh] bg-white shadow-xl z-50 rounded-md overflow-hidden transform transition-all duration-300",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Page Overview --- /example-page</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Opened from: Broken Internal Links</span>
              <span className="flex items-center">
                <Check className="h-3 w-3 mr-1 text-green-500" />
                Last Audit: June 13, 2025
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-full">
          {/* Left Sidebar Navigation */}
          <div className="w-48 bg-gray-50 border-r p-2">
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Page Snapshot</h3>
              <div className="space-y-1">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                      activeTab === tab.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Content Quality Tab */}
            {activeTab === "content-quality" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Content Quality Metrics</h3>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="border rounded-md p-4">
                      <p className="text-sm text-gray-600 mb-1">Word Count</p>
                      <p className="font-semibold">845 words</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <p className="text-sm text-gray-600 mb-1">Unique Content %</p>
                      <p className="font-semibold text-green-600 flex items-center">
                        ▲ 87%
                      </p>
                    </div>
                    <div className="border rounded-md p-4">
                      <p className="text-sm text-gray-600 mb-1">Readability Score</p>
                      <p className="font-semibold">Grade 8.5</p>
                    </div>
                    <div className="border rounded-md p-4">
                      <p className="text-sm text-gray-600 mb-1">SEO Content Score</p>
                      <p className="font-semibold text-green-600 flex items-center">
                        ▲ 78/100
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Content Quality</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Structured Data</li>
                        <li>• UX & Readability</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Grammar Quality</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Minor Errors Detected</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Keyword Usage</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Target KW used 5 times.</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Heading Structure</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• H1: 1 | H2: 3 | H3: 2</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Image Alt Attributes</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• 5/6 images with alt</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Content Freshness</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Updated 27 days ago</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Smart Recommendations</h3>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start">
                      <span className="text-gray-600 mr-2">•</span>
                      <span>Increase keyword coverage in subheadings (H2/H3).</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-600 mr-2">•</span>
                      <span>Add alt attributes to all images.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-600 mr-2">•</span>
                      <span>Update content to maintain freshness (last update: 27 days ago).</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-600 mr-2">•</span>
                      <span>Add internal links to high-authority blog posts.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* SEO & Health Tab */}
            {activeTab === "seo-health" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">SEO & Page Health Overview</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">SEO & Health</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Issue Summary</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">On-Page SEO</span>
                          <span className="text-sm font-medium">88/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Content Quality</span>
                          <span className="text-sm font-medium text-green-600">Optimized</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Page Health</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Score</span>
                          <span className="text-sm font-medium">82/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status</span>
                          <span className="text-sm font-medium text-yellow-600">Needs Improvement</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Page Speed (Mobile)</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Score</span>
                          <span className="text-sm font-medium">64/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status</span>
                          <span className="text-sm font-medium">Moderate</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Page Speed (Desktop)</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Score</span>
                          <span className="text-sm font-medium">86/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status</span>
                          <span className="text-sm font-medium text-green-600">Good</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Mobile Usability</span>
                        <span className="text-sm font-medium text-red-600">Failed</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-gray-600">HTTP</span>
                        <span className="text-sm font-medium text-green-600">Secure</span>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">HTTP Status</span>
                        <span className="text-sm font-medium">200 OK</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-gray-600">Sitemap Listed</span>
                        <span className="text-sm font-medium text-green-600">Yes</span>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Page Experience Score</span>
                        <span className="text-sm font-medium text-yellow-600">Needs Improvement</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-gray-600">Security Status</span>
                        <span className="text-sm font-medium text-red-600">2 Threats Detected</span>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Load Time (Mobile)</span>
                        <span className="text-sm font-medium">4.3s</span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-gray-600">Load Time (Desktop)</span>
                        <span className="text-sm font-medium">2.7s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* On-Page SEO Tab */}
            {activeTab === "on-page-seo" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">On-Page SEO</h3>
                  <div className="space-y-4">
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-3">Title Tag</h4>
                      <div className="flex items-center space-x-2 mb-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Boost Rankings with .....</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Title Length: 34 Characters</span>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-3">Meta Description</h4>
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Try Wranker for .....</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Structured Data Tab */}
            {activeTab === "structured-data" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Structured Data</h3>
                  <div className="border rounded-md p-4">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Structured data detected</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UX & Readability Tab */}
            {activeTab === "ux-readability" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">UX & Readability</h3>
                  <div className="border rounded-md p-4">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Readability score: Grade 8.5</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}