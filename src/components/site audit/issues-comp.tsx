
"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Select } from "antd"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BsInfo } from "react-icons/bs"
import Image from "next/image"
import { FiRefreshCw } from "react-icons/fi"
import Pagination from "@/src/util/paginationComponent"
import { Popover } from "antd"
import InfoTooltip from "../common/InfoTooltip"
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import { toIssueKeyStrict } from "@/src/util/helper"
// Info InfoTooltip title for each metric/section
const infoContent = {
    totalIssues: "Total Issues shows the count and severity breakdown of all issues types found in your latest audit.",
    allIssues: "All Issues table lists every detected issue, with filters for type, severity, status, and validation.",
}

interface GroupedIssue {
    status: string
    severity: string
    instances: number
    issue_type: string
    validation: string
    pages_affected: number
}

interface IssuesCompProps {
    siteIssues: any[]
    onIssueTypeClick?: (issueType: string) => void

}

const IssuesComp: React.FC<IssuesCompProps> = ({ siteIssues, onIssueTypeClick }) => {
    const grouped_Issues = siteIssues?.[0]?.result?.grouped_issues || []

    const [searchText, setSearchText] = useState("")
    const [severityFilter, setSeverityFilter] = useState("")
    const [validationFilter, setValidationFilter] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [issueTypeFilter, setIssueTypeFilter] = useState<string[]>([])
    const [fixStatusFilter, setFixStatusFilter] = useState("")
    const { openTaskDrawer } = useTaskDrawer();
    const { selectedProject } = useProjectManager();


    const issueStats = useMemo(() => {
        const stats = { critical: 0, warning: 0, low: 0, info: 0 }
        grouped_Issues.forEach((issue: GroupedIssue) => {
            if (issue.severity.includes("🔴") || issue.severity.includes("Critical")) stats.critical += 1
            else if (issue.severity.includes("🟠") || issue.severity.includes("Warning")) stats.warning += 1
            else if (issue.severity.includes("🟡") || issue.severity.includes("Low")) stats.low += 1
            else stats.info += 1
        })
        return stats
    }, [grouped_Issues])

    const total = issueStats.critical + issueStats.warning + issueStats.low + issueStats.info

    // Progress bar widths in %
    const progressWidths = {
        critical: total ? (issueStats.critical / total) * 100 : 0,
        warning: total ? (issueStats.warning / total) * 100 : 0,
        low: total ? (issueStats.low / total) * 100 : 0,
        info: total ? (issueStats.info / total) * 100 : 0,
    }

    const issueTypeOptions = useMemo(() => {
        const types = [...new Set(grouped_Issues.map((issue: GroupedIssue) => issue.issue_type))]
        return types.map((type) => ({ name: type, value: type }))
    }, [grouped_Issues])

    const severityOptions = useMemo(() => {
        const severities = [...new Set(grouped_Issues.map((issue: GroupedIssue) => issue.severity))]
        return [
            { name: "All Severities", value: "" },
            ...severities.map((severity) => ({ name: severity, value: severity })),
        ]
    }, [grouped_Issues])

    const statusOptions = useMemo(() => {
        const statuses = [...new Set(grouped_Issues.map((issue: GroupedIssue) => issue.status))]
        return [{ name: "All Statuses", value: "" }, ...statuses.map((status) => ({ name: status, value: status }))]
    }, [grouped_Issues])

    const filteredIssues = useMemo(() => {
        return grouped_Issues.filter((issue: GroupedIssue) => {
            const matchesIssueType = !issueTypeFilter.length || issueTypeFilter.includes(issue.issue_type)
            const matchesSeverity = !severityFilter || issue.severity === severityFilter
            const matchesStatus = !fixStatusFilter || issue.status === fixStatusFilter
            const matchesValidation = !validationFilter || issue.validation === validationFilter
            const matchesSearch = !searchText || issue.issue_type.toLowerCase().includes(searchText.toLowerCase())

            return matchesIssueType && matchesSeverity && matchesStatus && matchesValidation && matchesSearch
        })
    }, [grouped_Issues, issueTypeFilter, severityFilter, fixStatusFilter, validationFilter, searchText])

    const handleClearFilters = () => {
        setSearchText("")
        setIssueTypeFilter([])
        setSeverityFilter("")
        setFixStatusFilter("")
        setValidationFilter("")
        setCurrentPage(1)
    }

    const getValidationColor = (validation: string) => {
        if (validation.includes("Not")) return "#E94134"
        if (validation.includes("Validated")) return "#10B981"
        return "#6b7280"
    }

    const validationOption = [
        { name: "All Validations", value: "" },
        { name: "Not Validated", value: "Not Validated" },
        { name: "In Progress", value: "In Progress" },
        { name: "Validated", value: "Validated" },
    ]

    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const currentIssues = filteredIssues.slice(startIndex, endIndex)

    return (
        <div className="issues-dashboard">
            {/* Header with statistics */}
            <Card className="border border-gray-200">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                            Total Issues Type:<span className="text-brand-blue">{grouped_Issues.length}</span>
                            <InfoTooltip title={infoContent.totalIssues} placement="right">
                                <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                            </InfoTooltip>
                        </CardTitle>

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
                                visible: {
                                    width: `${progressWidths.warning}%`,
                                    transition: { duration: 0.6, ease: "easeOut", delay: 0.1 },
                                },
                            }}
                        />
                        <motion.div
                            className="h-full bg-brand-yellow"
                            variants={{
                                hidden: { width: 0 },
                                visible: {
                                    width: `${progressWidths.low}%`,
                                    transition: { duration: 0.6, ease: "easeOut", delay: 0.2 },
                                },
                            }}
                        />
                        <motion.div
                            className="h-full bg-brand-blue"
                            variants={{
                                hidden: { width: 0 },
                                visible: {
                                    width: `${progressWidths.info}%`,
                                    transition: { duration: 0.6, ease: "easeOut", delay: 0.3 },
                                },
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
                            <h2 className="text-[18px] font-semibold">All Issues</h2>
                            <InfoTooltip title={infoContent.allIssues} placement="right">
                                <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                            </InfoTooltip>
                        </div>
                        <div className="flex items-center flex-wrap gap-5">
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
                    </div>
                    <div className="flex justify-between mt-2">
                        <div className="flex gap-2">
                            <div>
                                <Select
                                    mode="multiple"
                                    style={{ width: 250 }}
                                    placeholder="Issue Type"
                                    value={issueTypeFilter}
                                    onChange={(values) => setIssueTypeFilter(values)}
                                    options={issueTypeOptions.map((opt: any) => ({
                                        label: opt.name,
                                        value: opt.value,
                                    }))}
                                    maxTagCount="responsive"
                                />
                            </div>

                            <select
                                id="severity"
                                value={severityFilter}
                                onChange={(e) => {
                                    setSeverityFilter(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            >
                                {severityOptions.map((item: any, index: any) => (
                                    <option key={index} value={item.value}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="Search by issue type..."
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
                                {statusOptions.map((item: any, index: any) => (
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
                    <table className="w-full">
                        <thead className=" border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                    #
                                </th>
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
                                    Issues Found
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
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentIssues.length > 0 ? (
                                currentIssues.map((issue: GroupedIssue, index: number) => (
                                    <tr key={startIndex + index} className="hover:bg-gray-50 cursor-pointer">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{startIndex + index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <span
                                                className="text-brand-blue cursor-pointer underline"
                                                onClick={() => {
                                                    const key = toIssueKeyStrict(issue.issue_type);
                                                    if (!key) return;
                                                    onIssueTypeClick?.(key);
                                                }}                                            >
                                                {issue.issue_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <span>{issue.severity}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-blue font-medium">
                                            {issue.pages_affected}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-blue font-medium">
                                            {issue.instances}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{issue.status}</td>
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

                                                    onClick={() => openTaskDrawer({
                                                        title: issue.issue_type,
                                                        projectId: selectedProject?.id ?? null,
                                                        type: "createNew"
                                                    })}
                                                    className="text-brand-blue flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid"
                                                >
                                                    Create Task
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-4 text-gray-500">
                                        No issues found 🎉
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredIssues.length}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setCurrentPage}
                        onRowsPerPageChange={setRowsPerPage}
                    />
                </div>
            </Card>
        </div>
    )
}

export default IssuesComp
