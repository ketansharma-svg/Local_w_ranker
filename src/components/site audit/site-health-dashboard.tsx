
"use client"

import Image from "next/image"
import { useCallback, useState } from "react"
import { BsInfo } from "react-icons/bs"
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import InfoTooltip from "../common/InfoTooltip"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import UniversalTaskCreationDrawer from "@/src/app/(campaign)/project-task-overview/UniversalTaskCreationDrawer"
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider"

const CustomTooltip = ({ active, payload, label, text }: any) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white border p-2 rounded shadow text-xs">
                <p>{label}</p>
                <p>{text}: {payload[0].value}</p>
            </div>
        )
    }
    return null
}


export default function Component({ sitedetails, historyData }: any) {
    const { selectedProject } = useProjectManager()
    const { openTaskDrawer } = useTaskDrawer();

    const infoContent = {
        seoAudit: "SEO Audit Summary provides a quick overview of your site's health based on the latest scan.",
        siteHealthScore: "Site Health Score is calculated based on critical SEO factors and issues found during the audit.",
        crawledPages: "Total number of pages analyzed in the latest site audit.",
        criticalIssues: "Critical issues are severe problems that can significantly impact your site's SEO and visibility.",
        warnings: "Warnings are moderate issues that should be addressed to improve site performance.",
        brokenLinks: "Broken links are URLs on your site that do not work or return errors.",
        orphanPages: "Orphan pages are pages not linked from anywhere else on your site, making them hard to discover.",
        kpiSummary: "KPI Summary highlights key metrics and issues found during the audit.",
        duplicateMetaTitle: "Duplicate meta titles can confuse search engines and reduce ranking effectiveness.",
        securityIssue: "Security issues include mixed content and other vulnerabilities that may affect user trust.",
        duplicateMetaDescription: "Duplicate meta descriptions can lead to poor search engine results and user experience.",
        missingH1Tag: "Missing H1 tags can make it harder for search engines to understand page content.",
        slowLoadingPages: "Slow loading pages negatively impact user experience and SEO rankings.",
        canonicalTagMissing: "Missing canonical tags can cause duplicate content issues and dilute SEO value.",
        missingAltAttributes: "Missing alt attributes on images reduce accessibility and SEO value.",
        pagesBlocked: "Blocked pages are not accessible to search engines due to robots.txt or other restrictions."
    }

    const [activeIndex, setActiveIndex] = useState(null)

    const handleMouseEnter = (_: any, index: any) => setActiveIndex(index)
    const handleMouseLeave = () => setActiveIndex(null)
    // Extract data from the latest scan (first item in history array)
    const siteScore = (sitedetails?.result.seo_score) 
    const total_pages_analyzed = sitedetails?.result?.total_pages_analyzed || "-"
    const latestScan = historyData[0] || {}
    const latestResult = latestScan?.result || {}
    const criticalIssues = latestScan.issue_counts?.["🔴 Critical"] || 0
    const warningIssues = latestScan.issue_counts?.["🟠 Warning"] || 0

    const brokenLinks = latestScan.result?.broken_link_issues?.length || 0
    const orphanPages = latestScan.result?.orphan_pages || 0


    const criticalIssuesData = historyData.map((entry: any) => ({
        name: new Date(entry.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "2-digit"
        }),
        value: entry.issue_counts?.["🔴 Critical"] || 0
    }));


    const warningsData = historyData.map((entry: any) => ({
        name: new Date(entry.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "2-digit"
        }),
        value: entry.issue_counts?.["🟠 Warning"] || 0
    }));

    const brokenLinksData = historyData.map((entry: any) => ({
        name: new Date(entry.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "2-digit"
        }),
        value: entry.result?.broken_link_issues?.length || 0
    }));

    const orphanPagesData = historyData.map((entry: any) => ({
        name: new Date(entry.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "2-digit"
        }),
        value: entry.result?.orphan_pages || 0
    }));

    const clickableElements: any = "N/A" // 🔹 Not in your data; this seems static or from a different metric.
    const securityIssues = latestResult.mixed_content_issues
        ? Object.values(latestResult.mixed_content_issues).flat().length
        : 0

    const duplicateMetaDescriptions = latestResult.meta_description_suggestions?.duplicates?.length || 0
    const duplicateMetaTitle = latestResult.title_suggestions?.duplicates?.length || 0


    const missingH1Tags: any = Object.values(latestResult.heading_suggestions?.pages_with_issues || {}).reduce(
        (count: any, issues: any) =>
            count + issues.filter((issue: any) => issue.issue_type === "🔴 Critical" && issue.issue === "Missing <h1> tag.").length,
        0
    )

    const slowLoadingPages = latestResult.slow_loading_page || 0
    const missingAltAttributes = latestResult?.image_alt_issues?.total_missing_alt || 0

    const canonicalTagMissing = latestResult.sitemap_robots_issues?.sitemap_robots_issues?.filter(
        (issue: any) => issue.issue?.toLowerCase().includes("canonical")
    ).length || 0

    const summary = historyData[0]?.result?.link_health?.summary || {}
    const healthy = summary.healthy || 0
    const broken = summary.broken || 0
    const withIssues = summary.with_issues || 0
    const redirects = summary.redirects || 0
    const blocked = summary.blocked || 0

    const getPercentage = (count: any) => {
        return total_pages_analyzed ? ((count / total_pages_analyzed) * 100).toFixed(2) : 0
    }

    const percentHealthy = getPercentage(healthy)
    const percentBroken = getPercentage(broken)
    const percentWithIssues = getPercentage(withIssues)
    const percentRedirects = getPercentage(redirects)
    const percentBlocked = getPercentage(blocked)


    return (
        <div className="relative bg-gray-50 flex flex-col gap ">
            {/* Last Scanned Badge */}


            {/* <div className="flex gap-2 "> */}
            {/* Left Side */}

            <div className="bg-white border rounded-lg p-4 sm:p-6 mx-auto shadow-sm w-full">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-base font-semibold mb-4 gap-3 sm:gap-0 border-b pb-3 sm:pb-1">
                    <div className="flex text-lg font-semibold gap-2 items-center">
                        <h2 className="text-lg font-semibold">SEO Audit Summary</h2>
                        <InfoTooltip title={infoContent.seoAudit} placement="right">
                            <BsInfo className="text-xl font-semibold cursor-pointer flex-shrink-0" color="#9E9E9E" />
                        </InfoTooltip>
                    </div>
                    <div className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-sm p-2.5 w-fit">
                        <Image
                            alt=""
                            src={"/images/WRanker - Export Icon grey.png"}
                            className="cursor-pointer h-3.5 w-auto"
                            height={0}
                            width={0}
                        />
                        <span>Export</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                    <div className="lg:col-span-3 flex flex-col items-center bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-4 sm:mb-6">
                            <span className="font-medium text-sm sm:text-base text-center">Site Health Score</span>
                            <InfoTooltip title={infoContent.siteHealthScore} placement="right">
                                <BsInfo className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </InfoTooltip>
                        </div>

                        <div className="relative">
                            <PieChart width={160} height={160} className="sm:w-[200px] sm:h-[200px]">
                                <Pie
                                    data={[
                                        { name: "Score", value: siteScore },
                                        { name: "Remaining", value: 100 - siteScore },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                >
                                    <Cell fill="#008CCD" />
                                    <Cell fill="#E5E7EB" />
                                </Pie>
                            </PieChart>

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex items-baseline gap-1">
                                    <div className="text-2xl sm:text-3xl font-semibold text-gray-900">{Math.round(siteScore)}</div>
                                    <span className="text-xl sm:text-2xl font-semibold text-gray-900">/</span>
                                    <div className="text-sm text-gray-500">100</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                        <div className="space-x-2 items-center">
                            <span className="text-sm sm:text-base font-medium">Crawled Pages</span>
                            <InfoTooltip title={infoContent.crawledPages} placement="right">
                                <BsInfo className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </InfoTooltip>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-brand-blue">{total_pages_analyzed.toLocaleString()}</div>

                        <div className="h-4 sm:h-6 bg-gray-200 rounded-sm overflow-hidden">
                            <div className="h-full flex">
                                <div className="bg-green-500" style={{ width: `${percentHealthy}%` }}></div>
                                <div className="bg-red-500" style={{ width: `${percentBroken}%` }}></div>
                                <div className="bg-orange-500" style={{ width: `${percentWithIssues}%` }}></div>
                                <div className="bg-blue-500" style={{ width: `${percentRedirects}%` }}></div>
                                <div className="bg-gray-500" style={{ width: `${percentBlocked}%` }}></div>
                            </div>
                        </div>

                        <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Healthy</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-blue-600">{healthy}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Broken</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-blue-600">{broken}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Have Issues</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-blue-600">{withIssues}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Redirects</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-blue-600">{redirects}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-500 rounded-full flex-shrink-0"></div>
                                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Blocked</span>
                                </div>
                                <span className="text-xs sm:text-sm font-medium text-blue-600">{blocked}</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 bg-white p-3 sm:p-4 rounded-lg border border-gray-200 gap-3 sm:gap-4">
                        <div className="relative sm:pr-3 sm:border-r border-gray-300 pb-3 sm:pb-0 border-b sm:border-b-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-xs sm:text-sm font-medium">Critical Issues</span>
                                    <InfoTooltip title={infoContent.criticalIssues} placement="right">
                                        <BsInfo className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    </InfoTooltip>
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-[#0077FF] mb-2">
                                {criticalIssues.toString().padStart(2, "0")}
                            </div>

                            <div className="h-16 sm:h-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={criticalIssuesData} onMouseLeave={handleMouseLeave}>
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 8 }}
                                            interval={0}
                                            padding={{ left: 10, right: 10 }}
                                            tickFormatter={(value, index) => {
                                                if (index === 0 || index === criticalIssuesData.length - 1) {
                                                    return value
                                                }
                                                return ""
                                            }}
                                            reversed={true}
                                        />
                                        <Tooltip content={<CustomTooltip text="Critical" />} />
                                        <Bar dataKey="value" radius={[1, 1, 0, 0]} onMouseEnter={handleMouseEnter}>
                                            {criticalIssuesData.map((entry: any, index: any) => (
                                                <Cell key={`cell-${index}`} fill={index === activeIndex ? "#EF4444" : "#FCA5A5"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="pb-3 sm:pb-0 border-b sm:border-b-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-xs sm:text-sm font-medium">Warnings</span>
                                    <InfoTooltip title={infoContent.warnings} placement="right">
                                        <BsInfo className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    </InfoTooltip>
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-brand-blue mb-2">
                                {warningIssues.toString().padStart(2, "0")}
                            </div>
                            <div className="h-16 sm:h-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={warningsData}>
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 8 }}
                                            interval={0}
                                            padding={{ left: 10, right: 10 }}
                                            tickFormatter={(value, index) => {
                                                if (index === 0 || index === warningsData.length - 1) {
                                                    return value
                                                }
                                                return ""
                                            }}
                                            reversed={true}
                                        />
                                        <Tooltip content={<CustomTooltip text="Warnings" />} />
                                        <Area type="monotone" dataKey="value" stroke="#F59E0B" fill="#FEF3C7" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="relative sm:pr-3 sm:border-r border-gray-300 sm:pt-3 pt-3 border-t sm:border-t-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-xs sm:text-sm font-medium">Broken Links</span>
                                    <InfoTooltip title={infoContent.brokenLinks} placement="right">
                                        <BsInfo className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    </InfoTooltip>
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-[#0077FF] mb-2">{brokenLinks}</div>
                            <div className="h-16 sm:h-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={brokenLinksData}>
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 8 }}
                                            interval={0}
                                            padding={{ left: 10, right: 10 }}
                                            tickFormatter={(value, index) => {
                                                if (index === 0 || index === brokenLinksData.length - 1) {
                                                    return value
                                                }
                                                return ""
                                            }}
                                            reversed={true}
                                        />
                                        <Tooltip content={<CustomTooltip text="Broken" />} />
                                        <Area type="monotone" dataKey="value" stroke="#EF4444" fill="#FECACA" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="pt-3 border-t sm:border-t-0 sm:pt-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1">
                                    <span className="text-xs sm:text-sm font-medium">Orphan Pages</span>
                                    <InfoTooltip title={infoContent.orphanPages} placement="right">
                                        <BsInfo className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    </InfoTooltip>
                                </div>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-brand-blue mb-2">{orphanPages}</div>
                            <div className="h-16 sm:h-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={orphanPagesData}>
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 8 }}
                                            interval={0}
                                            padding={{ left: 10, right: 10 }}
                                            tickFormatter={(value, index) => {
                                                if (index === 0 || index === orphanPagesData.length - 1) {
                                                    return value
                                                }
                                                return ""
                                            }}
                                            reversed={true}
                                        />
                                        <Tooltip content={<CustomTooltip text="Orphan" />} />
                                        <Area type="monotone" dataKey="value" stroke="#EAB308" fill="#FEF08A" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border rounded-md p-6 mt-4 mx-auto shadow-sm w-full">
                <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
                    <div className="flex text-[18px] font-semibold items-center gap-2">
                        <h2 className="text-[18px] font-semibold">KPI Summary</h2>
                        <InfoTooltip title={infoContent.kpiSummary} placement="right">
                            <BsInfo className="h-7 w-7 font-semibold cursor-pointer" color="#9E9E9E" />
                        </InfoTooltip>
                    </div>
                    <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2.5'>
                        <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                        <span>Export</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-2 ">

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-semibold">Duplicate Meta Title</span>
                                <InfoTooltip title={infoContent.duplicateMetaTitle} placement="right">
                                    <BsInfo size={20} color="#9E9E9E" />
                                </InfoTooltip>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-5">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{duplicateMetaTitle}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                data={[
                                                    { name: 'Score', value: duplicateMetaTitle },
                                                    { name: 'Remaining', value: 100 - 0 },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={12}
                                                outerRadius={18}
                                                startAngle={90}
                                                endAngle={-270}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openTaskDrawer({
                                        title: "Duplicate Meta Title",
                                        projectId: selectedProject?.id ?? null,
                                        type: "createNew"
                                    })}
                                    className="text-[#0077FF] underline text-sm ml-auto block cursor-pointer ">
                                    Create Task
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">Secrity Issue</span>
                                <InfoTooltip title={infoContent.securityIssue} placement="right">
                                    <BsInfo size={20} color="#9E9E9E" />
                                </InfoTooltip>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-5">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{securityIssues}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                data={[
                                                    { name: 'Score', value: securityIssues },
                                                    { name: 'Remaining', value: 100 - securityIssues },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={12}
                                                outerRadius={18}
                                                startAngle={90}
                                                endAngle={-270}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <span
                                    onClick={() => openTaskDrawer({
                                        title: "Secrity Issue",
                                        projectId: selectedProject?.id ?? null,
                                        type: "createNew"
                                    })}
                                    className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">
                                    Create Task</span>
                            </div>

                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">Duplicate Meta Description</span>
                                <InfoTooltip title={infoContent.duplicateMetaDescription} placement="right">
                                    <BsInfo size={20} color="#9E9E9E" />
                                </InfoTooltip>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-5">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{duplicateMetaDescriptions}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                data={[
                                                    { name: 'Score', value: duplicateMetaDescriptions },
                                                    { name: 'Remaining', value: 100 - duplicateMetaDescriptions },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={12}
                                                outerRadius={18}
                                                startAngle={90}
                                                endAngle={-270}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <span onClick={() => openTaskDrawer({
                                            title: "Duplicate Meta Description",
                                            projectId: selectedProject?.id ?? null,
                                            type: "createNew"
                                        })}
                                         className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">Missing H1 Tag</span>
                                <InfoTooltip title={infoContent.missingH1Tag} placement="right">
                                    <BsInfo size={20} color="#9E9E9E" />
                                </InfoTooltip>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-5">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{missingH1Tags}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                data={[
                                                    { name: 'Score', value: missingH1Tags },
                                                    { name: 'Remaining', value: 100 - missingH1Tags },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={12}
                                                outerRadius={18}
                                                startAngle={90}
                                                endAngle={-270}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <span
                                onClick={() => openTaskDrawer({
                                            title: "Missing H1 Tag",
                                            projectId: selectedProject?.id ?? null,
                                            type: "createNew"
                                        })}
                                className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
                            </div>

                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">Slow Loading Pages</span>
                                <InfoTooltip title={infoContent.slowLoadingPages} placement="right">
                                    <BsInfo size={20} color="#9E9E9E" />
                                </InfoTooltip>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-5">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{slowLoadingPages}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                data={[
                                                    { name: 'Score', value: slowLoadingPages },
                                                    { name: 'Remaining', value: 100 - slowLoadingPages },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={12}
                                                outerRadius={18}
                                                startAngle={90}
                                                endAngle={-270}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <span
                                onClick={() => openTaskDrawer({
                                            title: "Slow Loading Pages",
                                            projectId: selectedProject?.id ?? null,
                                            type: "createNew"
                                        })}
                                className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
                            </div>

                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">Canonical Tag Missing</span>
                                <InfoTooltip title={infoContent.canonicalTagMissing} placement="right">
                                    <BsInfo size={20} color="#9E9E9E" />
                                </InfoTooltip>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-5">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{canonicalTagMissing}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                data={[
                                                    { name: 'Score', value: canonicalTagMissing },
                                                    { name: 'Remaining', value: 100 - canonicalTagMissing },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={12}
                                                outerRadius={18}
                                                startAngle={90}
                                                endAngle={-270}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <span
                                onClick={() => openTaskDrawer({
                                            title: "Canonical Tag Missing",
                                            projectId: selectedProject?.id ?? null,
                                            type: "createNew"
                                        })}
                                className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
                            </div>

                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">Missing Alt Attributes</span>
                                <InfoTooltip title={infoContent.missingAltAttributes} placement="right">
                                    <BsInfo size={20} color="#9E9E9E" />
                                </InfoTooltip>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-5">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{missingAltAttributes}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                data={[
                                                    { name: 'Score', value: missingAltAttributes },
                                                    { name: 'Remaining', value: 100 - missingAltAttributes },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={12}
                                                outerRadius={18}
                                                startAngle={90}
                                                endAngle={-270}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <span
                                onClick={() => openTaskDrawer({
                                            title: "Missing Alt Attributes",
                                            projectId: selectedProject?.id ?? null,
                                            type: "createNew"
                                        })}
                                className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
                            </div>

                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-md border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">Pages Blocked</span>
                                <InfoTooltip title={infoContent.pagesBlocked} placement="right">
                                    <BsInfo size={20} color="#9E9E9E" />
                                </InfoTooltip>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-5">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{blocked}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                data={[
                                                    { name: 'Score', value: blocked },
                                                    { name: 'Remaining', value: 100 - blocked },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={12}
                                                outerRadius={18}
                                                startAngle={90}
                                                endAngle={-270}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <span
                                onClick={() => openTaskDrawer({
                                            title: "Pages Blocked",
                                            projectId: selectedProject?.id ?? null,
                                            type: "createNew"
                                        })}
                                className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
                            </div>

                        </div>
                    </div>
                </div >
            </div >



        </div >
    )
}
