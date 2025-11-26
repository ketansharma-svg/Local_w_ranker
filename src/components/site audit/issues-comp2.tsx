"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Drawer } from "antd"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Calendar, Check, ExternalLink, Eye, Plus, RotateCcw, Shield, Tag, Upload, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BsInfo } from "react-icons/bs"
import Image from "next/image"
import { FiRefreshCw } from "react-icons/fi"

interface PageAffected {
    url: string
    title: string
    status: "New" | "Existing" | "Re_Appeared"
    validation: "Validated" | "Not Validated"
    details?: any
}

interface GroupedIssue {
    key: string
    issueType: string
    severity: string
    pagesAffected: number
    fixStatus: string
    validation: string
    summary: string
    fixInstructions: string
    affectedPages: PageAffected[]
    rawData: any[]
}

interface IssuesCompProps {
    siteIssues: any[]
}

const IssuesComp: React.FC<IssuesCompProps> = ({ siteIssues }) => {

    const [searchText, setSearchText] = useState("")
    const [severityFilter, setSeverityFilter] = useState("all")
    const [validationFilter, setValidationFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [selectedIssue, setSelectedIssue] = useState<GroupedIssue | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [activeTab, setActiveTab] = useState("issue-details")
    const [isPageOverviewOpen, setIsPageOverviewOpen] = useState(false)
    const [selectedPage, setSelectedPage] = useState<PageAffected | null>(null)
    const [issueTypeFilter, setIssueTypeFilter] = useState("all")
    const [fixStatusFilter, setFixStatusFilter] = useState("all")

    // Process and group issues by type
    const groupedIssues = useMemo(() => {
        if (!siteIssues || siteIssues.length === 0) return []

        const issueGroups: { [key: string]: GroupedIssue } = {}

        const { result } = siteIssues[0]

        // Process 5xx Server Errors
        if (result["5xx_links"]?.broken && result["5xx_links"].broken.length > 0) {
            const key = "5xx-server-errors"
            if (!issueGroups[key]) {
                issueGroups[key] = {
                    key,
                    issueType: "5xx Server Errors",
                    severity: "Critical",
                    pagesAffected: 0,
                    fixStatus: "Not Started",
                    validation: "Not Validated",
                    summary:
                        "Server errors (5xx status codes) are preventing pages from loading properly, affecting user experience and search engine crawling.",
                    fixInstructions:
                        "Contact your hosting provider or development team to investigate server configuration issues. Check server logs for specific error details and resolve underlying infrastructure problems.",
                    affectedPages: [],
                    rawData: [],
                }
            }

            result["5xx_links"].broken.forEach((link: any) => {
                issueGroups[key].affectedPages.push({
                    url: link.url,
                    title: link.link_text || "Unknown Title",
                    status: "New",
                    validation: "Not Validated",
                    details: link,
                })
                issueGroups[key].rawData.push(link)
            })
            issueGroups[key].pagesAffected = issueGroups[key].affectedPages.length
        }

        // Process Broken Internal Links
        if (result.broken_link_issues && result.broken_link_issues.length > 0) {
            const key = "broken-internal-links"
            if (!issueGroups[key]) {
                issueGroups[key] = {
                    key,
                    issueType: "Broken Internal Links",
                    severity: "Warning",
                    pagesAffected: 0,
                    fixStatus: "In Progress",
                    validation: "Not Validated",
                    summary:
                        "Internal links are pointing to pages that return error status codes, creating poor user experience and affecting SEO crawl efficiency.",
                    fixInstructions:
                        "Review all broken internal links and either fix the URLs to point to correct pages or remove the links entirely. Update your content management system to prevent future broken links.",
                    affectedPages: [],
                    rawData: [],
                }
            }

            result.broken_link_issues.forEach((issue: any) => {
                issueGroups[key].affectedPages.push({
                    url: issue.url,
                    title: issue.broken_link?.anchor_text || "Unknown Title",
                    status: "Existing",
                    validation: "Not Validated",
                    details: issue,
                })
                issueGroups[key].rawData.push(issue)
            })
            issueGroups[key].pagesAffected = issueGroups[key].affectedPages.length
        }

        // Process Schema Markup Issues
        if (result.schema_issues?.issues && result.schema_issues.issues.length > 0) {
            const key = "schema-markup-issues"
            if (!issueGroups[key]) {
                issueGroups[key] = {
                    key,
                    issueType: "Schema Markup Issues",
                    severity: "Critical",
                    pagesAffected: 0,
                    fixStatus: "Not Started",
                    validation: "Not Validated",
                    summary:
                        "Structured data markup contains errors that prevent search engines from properly understanding your content, affecting rich snippet eligibility.",
                    fixInstructions:
                        "Review and fix schema markup errors using Google's Structured Data Testing Tool. Ensure all required properties are present and properly formatted according to schema.org specifications.",
                    affectedPages: [],
                    rawData: [],
                }
            }

            result.schema_issues.issues.forEach((schemaIssue: any) => {
                issueGroups[key].affectedPages.push({
                    url: schemaIssue.url,
                    title: `Schema errors: ${schemaIssue.errors.length}`,
                    status: "New",
                    validation: "Not Validated",
                    details: schemaIssue,
                })
                issueGroups[key].rawData.push(schemaIssue)
            })
            issueGroups[key].pagesAffected = issueGroups[key].affectedPages.length
        }

        // Process Missing Alt Text Issues
        if (result.image_alt_issues?.issues && result.image_alt_issues.issues.length > 0) {
            const key = "missing-alt-text"
            if (!issueGroups[key]) {
                issueGroups[key] = {
                    key,
                    issueType: "Missing Alt Text",
                    severity: "Low",
                    pagesAffected: 0,
                    fixStatus: "Not Started",
                    validation: "Not Validated",
                    summary:
                        "Images are missing alternative text attributes, affecting accessibility for screen readers and SEO image optimization.",
                    fixInstructions:
                        "Add descriptive alt attributes to all images. Alt text should describe the image content and context for users who cannot see the image.",
                    affectedPages: [],
                    rawData: [],
                }
            }

            result.image_alt_issues.issues.forEach((altIssue: any) => {
                issueGroups[key].affectedPages.push({
                    url: altIssue.url,
                    title: `${altIssue.missing_alt} missing alt texts`,
                    status: "Existing",
                    validation: "Not Validated",
                    details: altIssue,
                })
                issueGroups[key].rawData.push(altIssue)
            })
            issueGroups[key].pagesAffected = issueGroups[key].affectedPages.length
        }

        // Process Missing H1 Tags
        if (result.heading_suggestions?.pages_with_issues) {
            const key = "missing-h1-tags"
            if (!issueGroups[key]) {
                issueGroups[key] = {
                    key,
                    issueType: "Missing H1 Tags",
                    severity: "Critical",
                    pagesAffected: 0,
                    fixStatus: "Not Started",
                    validation: "Not Validated",
                    summary:
                        "Pages are missing H1 tags, which are crucial for SEO and content structure. Every page should have exactly one H1 tag.",
                    fixInstructions:
                        "Add a unique, descriptive H1 tag to each page that accurately represents the main topic. Ensure only one H1 tag exists per page.",
                    affectedPages: [],
                    rawData: [],
                }
            }

            Object.entries(result.heading_suggestions.pages_with_issues).forEach(([url, pageIssues]: [string, any]) => {
                issueGroups[key].affectedPages.push({
                    url: url,
                    title: "Missing H1 tag",
                    status: "New",
                    validation: "Not Validated",
                    details: pageIssues,
                })
                issueGroups[key].rawData.push({ url, issues: pageIssues })
            })
            issueGroups[key].pagesAffected = issueGroups[key].affectedPages.length
        }

        // Process Meta Description Issues
        if (result.meta_description_suggestions?.issues && result.meta_description_suggestions.issues.length > 0) {
            const key = "meta-description-issues"
            if (!issueGroups[key]) {
                issueGroups[key] = {
                    key,
                    issueType: "Meta Description Issues",
                    severity: "Warning",
                    pagesAffected: 0,
                    fixStatus: "Not Started",
                    validation: "Not Validated",
                    summary:
                        "Pages are missing meta descriptions or have suboptimal meta descriptions, affecting search engine result snippets and click-through rates.",
                    fixInstructions:
                        "Add unique, compelling meta descriptions to all pages. Keep them between 150-160 characters and include relevant keywords while maintaining readability.",
                    affectedPages: [],
                    rawData: [],
                }
            }

            result.meta_description_suggestions.issues.forEach((metaIssue: any) => {
                issueGroups[key].affectedPages.push({
                    url: metaIssue.url,
                    title: metaIssue.errors.join(", "),
                    status: "Existing",
                    validation: "Not Validated",
                    details: metaIssue,
                })
                issueGroups[key].rawData.push(metaIssue)
            })
            issueGroups[key].pagesAffected = issueGroups[key].affectedPages.length
        }

        // Process Robots.txt Issues
        if (result.robots_suggestions?.robots_issues && result.robots_suggestions.robots_issues.length > 0) {
            const key = "robots-txt-issues"
            if (!issueGroups[key]) {
                issueGroups[key] = {
                    key,
                    issueType: "Robots.txt Issues",
                    severity: "Critical",
                    pagesAffected: 0,
                    fixStatus: "Not Started",
                    validation: "Not Validated",
                    summary:
                        "Robots.txt configuration is blocking search engines from accessing important pages or content, affecting SEO performance.",
                    fixInstructions:
                        "Review and update robots.txt file to ensure important pages are not blocked. Remove unnecessary disallow directives and ensure proper sitemap references.",
                    affectedPages: [],
                    rawData: [],
                }
            }

            result.robots_suggestions.robots_issues.forEach((robotIssue: any) => {
                issueGroups[key].affectedPages.push({
                    url: robotIssue.url,
                    title: robotIssue.issue,
                    status: "New",
                    validation: "Not Validated",
                    details: robotIssue,
                })
                issueGroups[key].rawData.push(robotIssue)
            })
            issueGroups[key].pagesAffected = issueGroups[key].affectedPages.length
        }

        // Process Duplicate Title Tags
        if (result.title_suggestions?.duplicates && result.title_suggestions.duplicates.length > 0) {
            const key = "duplicate-title-tags"
            if (!issueGroups[key]) {
                issueGroups[key] = {
                    key,
                    issueType: "Duplicate Title Tags",
                    severity: "Warning",
                    pagesAffected: 0,
                    fixStatus: "Not Started",
                    validation: "Not Validated",
                    summary:
                        "Multiple pages share the same title tag, which can confuse search engines and reduce the effectiveness of your SEO efforts.",
                    fixInstructions:
                        "Create unique, descriptive title tags for each page. Ensure titles accurately reflect the page content and include relevant keywords.",
                    affectedPages: [],
                    rawData: [],
                }
            }

            result.title_suggestions.duplicates.forEach((titleIssue: any) => {
                titleIssue.urls.forEach((url: string) => {
                    issueGroups[key].affectedPages.push({
                        url: url,
                        title: titleIssue.title,
                        status: "Existing",
                        validation: "Not Validated",
                        details: titleIssue,
                    })
                })
                issueGroups[key].rawData.push(titleIssue)
            })
            issueGroups[key].pagesAffected = issueGroups[key].affectedPages.length
        }


        return Object.values(issueGroups)
    }, [siteIssues])

    // Calculate issue statistics
    const issueStats = useMemo(() => {
        const stats = {
            critical: 0,
            warning: 0,
            low: 0,
            info: 0,
            total: groupedIssues.length,
        }

        groupedIssues.forEach((issue) => {
            switch (issue.severity.toLowerCase()) {
                case "critical":
                    stats.critical++
                    break
                case "warning":
                    stats.warning++
                    break
                case "low":
                    stats.low++
                    break
                case "info":
                    stats.info++
                    break
            }
        })

        return stats
    }, [groupedIssues])


    const filteredIssues = useMemo(() => {
        return groupedIssues.filter((issue: any) => {
            const searchValue = searchText || ""
            const matchesSearch =
                searchValue === "" ||
                issue.issueType.toLowerCase().includes(searchValue.toLowerCase()) ||
                issue.summary.toLowerCase().includes(searchValue.toLowerCase())

            const matchesIssueType = issueTypeFilter === "all" || issue.issue_type === issueTypeFilter

            const matchesSeverity = severityFilter === "all" || issue.severity.toLowerCase() === severityFilter.toLowerCase()

            const matchesFixStatus = fixStatusFilter === "all" || issue.fixStatus === fixStatusFilter

            const matchesValidation =
                validationFilter === "all" || issue.validation.toLowerCase() === validationFilter.toLowerCase()

            return matchesSearch && matchesIssueType && matchesSeverity && matchesFixStatus && matchesValidation
        })
    }, [searchText, issueTypeFilter, severityFilter, fixStatusFilter, validationFilter])

    // Pagination
    const totalPages = Math.ceil(filteredIssues.length / rowsPerPage)
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const currentIssues = filteredIssues.slice(startIndex, endIndex)

    // let issueTypeOptions = []
    // let severityOptions = []
    // let statusOptions = []
    // currentIssues.forEach((link: any) => {
    //     issueTypeOptions.push({
    //         name: link.issueType,
    //         value: link.issueType
    //     })
    //     severityOptions.push({
    //         name: link.severity,
    //         value: link.severity
    //     })
    //     statusOptions.push({
    //         name: link.fixStatus,
    //         value: link.fixStatus
    //     })

    // })

    const handleClearFilters = () => {
        setSearchText("")
        setIssueTypeFilter("all")
        setSeverityFilter("all")
        setFixStatusFilter("all")
        setValidationFilter("all")
        setCurrentPage(1)
    }



    const getSeverityColor = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "critical":
                return "#E94134"
            case "warning":
                return "#F97316"
            case "low":
                return "#F9BB04"
            case "info":
                return "#2563eb"
            default:
                return "#4286F5"
        }
    }

    const getValidationColor = (validation: string) => {
        if (validation.includes("Not")) return "#E94134"
        if (validation.includes("Validated")) return "#10B981"
        return "#6b7280"
    }

    const calculateProgressBarWidths = () => {
        const total = issueStats.total
        if (total === 0) return { critical: 0, warning: 0, low: 0, info: 0 }

        return {
            critical: (issueStats.critical / total) * 100,
            warning: (issueStats.warning / total) * 100,
            low: (issueStats.low / total) * 100,
            info: (issueStats.info / total) * 100,
        }
    }

    const progressWidths = calculateProgressBarWidths()

    const handleRowClick = (issue: GroupedIssue) => {
        setSelectedIssue(issue)
        setIsDrawerOpen(true)
        setActiveTab("issue-details")
    }

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false)
        setSelectedIssue(null)
        setActiveTab("issue-details")
    }

    // Issue metadata for drawer
    const issueMetadata = {
        firstDetected: "May 8, 2025",
        lastAudit: "June 13, 2025",
        source: "Webflow AI",
        validation: selectedIssue?.validation || "Not Validated",
        category: "Content",
        auditType: "Full Site Audit",
        seoImpact:
            selectedIssue?.severity === "Critical"
                ? "High - Affects on-page structure"
                : selectedIssue?.severity === "Warning"
                    ? "Medium - May impact rankings"
                    : "Low - Minor SEO impact",
        affectedPagesCount: selectedIssue?.pagesAffected || 0,
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
            title: "Identify affected pages",
            description: "Review the affected pages list and prioritize based on traffic and importance.",
        },
        {
            step: 2,
            title: "Apply the fix",
            description: selectedIssue?.fixInstructions || "Follow the specific instructions for this issue type.",
        },
        {
            step: 3,
            title: "Test implementation",
            description: "Verify that the fix has been properly implemented and is working as expected.",
        },
        {
            step: 4,
            title: "Validate and monitor",
            description: "Use SEO tools to validate the fix and monitor for any new occurrences.",
        },
    ]

    const tabItems = [
        { id: "issue-details", label: "Issue Details", icon: Shield },
        { id: "affected-pages", label: "Affected Pages", icon: ExternalLink },
        { id: "fix-instructions", label: "Fix Instructions", icon: Check },
        { id: "screenshot", label: "Screenshot", icon: Eye },
        { id: "task-status", label: "Task Status", icon: Tag },
        { id: "issue-history", label: "Issue History", icon: Calendar },
    ]



    const issueTypeOption = [
        { name: "Issue Types", value: "" },
        {
            name: "Broken Internal Links",
            value: ""
        },
        {
            name: "Schema Markup Issues",
            value: ""
        },
        {
            name: "Missing Alt Text",
            value: ""
        },
        {
            name: "Missing H1 Tags",
            value: ""
        },
        {
            name: "Meta Description Issues",
            value: ""
        },
        {
            name: "Mixed Content",
            value: ""
        },
        {
            name: "Security Issues",
            value: ""
        },
        {
            name: "5xx Server Errors",
            value: ""
        },
        {
            name: "Meta Title Issues",
            value: ""
        },
        {
            name: "Robots Meta Issues",
            value: ""
        },
        {
            name: "Sitemap Missing",
            value: ""
        },
        {
            name: "Robots.txt Missing",
            value: ""
        },
    ]

    const severityOption = [
        { name: "Severities", value: "" },
        {
            name: "Critical",
            value: "Critical"
        },
        {
            name: "Warning",
            value: "Warning"
        },
        {
            name: "Low",
            value: "Low"
        },
        {
            name: "Info",
            value: "Info"
        },
    ]

    const fixStatusOption = [
        { name: "Status", value: "" },
        {
            name: "Not Started",
            value: "Not Started"
        },
        {
            name: "In Progress",
            value: "In Progress"
        }
    ]
    const validationOption = [
        { name: "Validations", value: "" },
        {
            name: "Not Validated",
            value: "Not Validated"
        },
        {
            name: "In Progress",
            value: "In Progress"
        }
    ]

    return (
        <div className="issues-dashboard">
            {/* Header with statistics */}

            <Card className="border border-gray-200">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                            Total Issues
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </CardTitle>

                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <h2 className="text-[14px] font-normal text-gray-900 mb-4">Total Issues: <span className="text-brand-blue">{issueStats.total}</span></h2>

                    {/* Progress bar */}
                    <motion.div
                        className="w-full h-6 bg-gray-200 rounded-sm overflow-hidden flex"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        <motion.div
                            className="h-full bg-brand-red"
                            variants={{
                                hidden: { width: 0 },
                                visible: { width: `${progressWidths.critical}%`, transition: { duration: 0.6, ease: "easeOut" } },
                            }}
                        />
                        <motion.div
                            className="h-full bg-brand-warning"
                            variants={{
                                hidden: { width: 0 },
                                visible: { width: `${progressWidths.warning}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.1 } },
                            }}
                        />
                        <motion.div
                            className="h-full bg-brand-yellow"
                            variants={{
                                hidden: { width: 0 },
                                visible: { width: `${progressWidths.low}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.2 } },
                            }}
                        />
                        <motion.div
                            className="h-full bg-brand-blue"
                            variants={{
                                hidden: { width: 0 },
                                visible: { width: `${progressWidths.info}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.3 } },
                            }}
                        />
                    </motion.div>

                    {/* Legend */}
                    <div className="flex gap-6 mt-3 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                            <span>Critical: {issueStats.critical.toString().padStart(2, "0")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-brand-warning rounded-full"></div>
                            <span>Warning: {issueStats.warning.toString().padStart(2, "0")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-brand-yellow rounded-full"></div>
                            <span>Low: {issueStats.low.toString().padStart(2, "0")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-brand-blue rounded-full"></div>
                            <span>Info: {issueStats.info.toString().padStart(2, "0")}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* Custom Table */}
            <Card className="border border-gray-200 mt-4">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">All Issue</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>
                        <div className="flex items-center flex-wrap gap-5">

                            <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                {/* <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} /> */}
                                <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                <span>Export</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-2">
                        <div className="flex gap-2">
                            <select
                                id="issueType"
                                value={issueTypeFilter}
                                onChange={(e) => {
                                    setIssueTypeFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            >
                                {issueTypeOption.map((item, index) => (
                                    <option key={index} value={item.value}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                id="severity"
                                value={severityFilter}
                                onChange={(e) => {
                                    setSeverityFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            >
                                {severityOption.map((item, index) => (
                                    <option key={index} value={item.value}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="Search by issue type or summary..."
                                value={searchText}
                                onChange={(e) => {
                                    setSearchText(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            />

                            <select
                                id="fixStatus"
                                value={fixStatusFilter}
                                onChange={(e) => {
                                    setFixStatusFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            >
                                {fixStatusOption.map((item, index) => (
                                    <option key={index} value={item.value}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                id="validation"
                                value={validationFilter}
                                onChange={(e) => {
                                    setValidationFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            >
                                {validationOption.map((item, index) => (
                                    <option key={index} value={item.value}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>

                            {/* <form>
                            <select id="countries" className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2 ">
                                <option value="US">Validation</option>
                                <option value="CA">Canada</option>
                                <option value="FR">France</option>
                                <option value="DE">Germany</option>
                            </select>
                        </form> */}
                        </div>
                        <div
                            onClick={handleClearFilters}
                            className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2 cursor-pointer hover:bg-gray-50"
                        >
                            <FiRefreshCw className="cursor-pointer h-[14px] w-auto" />
                            <span>Clear</span>
                        </div>
                    </div>
                </CardHeader>
                <div className="bg-white rounded-md overflow-hidden mt-4">
                    {/* Filters */}



                    <table className="w-full">
                        <thead className=" border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Issue Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center gap-1">
                                        Severity
                                        <svg className="w-4 h-4 text-brand-blue" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pages Affected
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fix Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="flex items-center gap-1">
                                        Validation
                                        <svg className="w-4 h-4 text-brand-blue" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Task Action
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    All Projects
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentIssues?.length > 0 ? currentIssues.map((issue, index) => (
                                <tr key={issue.key} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(issue)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{startIndex + index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{issue.issueType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: getSeverityColor(issue.severity) }}
                                            ></div>
                                            <span>{issue.severity}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-blue font-medium">{issue.pagesAffected}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{issue.fixStatus}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: getValidationColor(issue.validation) }}
                                            ></div>
                                            <span>{issue.validation}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex gap-2">
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    // Handle create task
                                                }}
                                                className="text-brand-blue flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                </tr>
                            )) :
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-gray-500">
                                        Data Not Found 🎉
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredIssues.length)} of {filteredIssues.length} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <div className="flex gap-1 ml-4">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    ‹
                                </button>
                                <button className="px-3 py-1 bg-brand-blue text-white rounded text-sm">{currentPage}</button>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
            {/* Issue Details Drawer */}
            <Drawer
                placement="right"
                onClose={handleCloseDrawer}
                open={isDrawerOpen}
                width={1100}
                closable={false}
                bodyStyle={{ padding: 0 }}
            >
                {selectedIssue && (
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                            <div className="flex items-center space-x-3">
                                <h2 className="text-lg font-semibold text-gray-900">Issue: {selectedIssue.issueType}</h2>
                                <Badge
                                    className={cn(
                                        "text-xs font-medium border",
                                        selectedIssue.severity === "Critical"
                                            ? "bg-red-100 text-red-800 border-red-200"
                                            : selectedIssue.severity === "Warning"
                                                ? "bg-orange-100 text-orange-800 border-orange-200"
                                                : "bg-green-100 text-green-800 border-green-200",
                                    )}
                                >
                                    ● {selectedIssue.severity}
                                </Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-green-600 flex items-center">
                                    ● Last Audit: {issueMetadata.lastAudit}
                                </span>
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
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleCloseDrawer}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-1">
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
                                                        ? "bg-brand-blue text-white"
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
                                            <h3 className="font-semibold text-blue-900 mb-2">{selectedIssue.issueType}</h3>
                                            <p className="text-blue-800 text-sm leading-relaxed">{selectedIssue.summary}</p>
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
                                                    <Badge
                                                        className={cn(
                                                            "text-xs",
                                                            issueMetadata.validation === "Not Validated"
                                                                ? "bg-red-100 text-red-800 border-red-200"
                                                                : "bg-green-100 text-green-800 border-green-200",
                                                        )}
                                                    >
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
                                            <h3 className="text-lg font-semibold mb-2">Affected Pages ({selectedIssue.pagesAffected})</h3>
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
                                                    {selectedIssue.affectedPages.map((page: PageAffected, index: number) => (
                                                        <tr key={index} className="border-t hover:bg-gray-50">
                                                            <td
                                                                className="w-1/5 py-3 px-4 text-blue-600 font-mono text-sm hover:underline cursor-pointer break-words"
                                                                onClick={() => {
                                                                    setSelectedPage(page)
                                                                    setIsPageOverviewOpen(true)
                                                                }}
                                                            >
                                                                {page.url}
                                                            </td>
                                                            <td className="w-1/5 py-3 px-4 text-sm break-words">{page.title}</td>
                                                            <td className="w-1/5 py-3 px-4">
                                                                <Badge
                                                                    className={cn(
                                                                        "text-xs border",
                                                                        page.status === "New"
                                                                            ? "bg-blue-100 text-blue-800 border-blue-200"
                                                                            : page.status === "Existing"
                                                                                ? "bg-gray-100 text-gray-800 border-gray-200"
                                                                                : "bg-orange-100 text-orange-800 border-orange-200",
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-sm">●</span>
                                                                        <span>{page.status.replace("_", " ")}</span>
                                                                    </div>
                                                                </Badge>
                                                            </td>
                                                            <td className="w-1/5 py-3 px-4">
                                                                <Badge
                                                                    className={cn(
                                                                        "text-xs border",
                                                                        page.validation === "Validated"
                                                                            ? "bg-green-100 text-green-800 border-green-200"
                                                                            : "bg-red-100 text-red-800 border-red-200",
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-1">
                                                                        <span>{page.validation === "Validated" ? "✓" : "✗"}</span>
                                                                        <span>{page.validation}</span>
                                                                    </div>
                                                                </Badge>
                                                            </td>
                                                            <td className="w-1/5 py-3 px-4">
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 flex items-center justify-center"
                                                                    >
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
                                                <p className="text-blue-800 text-sm leading-relaxed">{selectedIssue.fixInstructions}</p>
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
                                            <h5 className="font-medium text-brand-yellow mb-2">⚠️ Important Notes</h5>
                                            <ul className="text-sm text-brand-yellow space-y-1">
                                                <li>• Test all changes in a staging environment first</li>
                                                <li>• Monitor the affected pages after implementing fixes</li>
                                                <li>• Document all changes for future reference</li>
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
                                                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                                    {selectedIssue.fixStatus}
                                                </Badge>
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
                                                    {selectedIssue.issueType} detected on {issueMetadata.affectedPagesCount} pages during full
                                                    site audit
                                                </p>
                                            </div>

                                            <div className="border-l-4 border-brand-yellow pl-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-brand-yellow">Validation Requested</span>
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
                                                    Issue status updated during latest audit - some pages fixed, others still affected
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                            <h5 className="font-medium text-blue-900 mb-2">Next Steps</h5>
                                            <ul className="text-sm text-blue-800 space-y-1">
                                                <li>• Complete implementation on remaining pages</li>
                                                <li>• Schedule validation for fixed pages</li>
                                                <li>• Monitor for new occurrences in future audits</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>

            {/* Page Overview Modal */}
            {selectedPage && <PageOverviewModal isOpen={isPageOverviewOpen} onClose={() => setIsPageOverviewOpen(false)} />}
        </div>
    )
}

// Page Overview Modal Component
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
                            <span>Opened from: Issue Details</span>
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
                                            <p className="font-semibold text-green-600 flex items-center">▲ 87%</p>
                                        </div>
                                        <div className="border rounded-md p-4">
                                            <p className="text-sm text-gray-600 mb-1">Readability Score</p>
                                            <p className="font-semibold">Grade 8.5</p>
                                        </div>
                                        <div className="border rounded-md p-4">
                                            <p className="text-sm text-gray-600 mb-1">SEO Content Score</p>
                                            <p className="font-semibold text-green-600 flex items-center">▲ 78/100</p>
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

                        {/* Other tabs content would go here */}
                        {activeTab !== "content-quality" && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">{tabItems.find((t) => t.id === activeTab)?.label}</h3>
                                    <p className="text-gray-600">
                                        Content for {tabItems.find((t) => t.id === activeTab)?.label} tab would be displayed here.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default IssuesComp
