"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
// import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Input } from "antd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BsInfo } from "react-icons/bs"
import Image from "next/image"
import Spkapexcharts from "../spk-packages/apexcharts-component"
import { ArrowRight, ExternalLink } from "lucide-react"
import Pagination from "@/src/util/paginationComponent"
import { FiRefreshCw } from "react-icons/fi"
import dynamic from "next/dynamic"
import AffectedDrawer from "./affected-pages/affectedDrawer"
import { useSiteDetail } from "@/src/redux/providers/SiteDetailProvider"
import { useAffectedDetails } from "@/src/redux/providers/AffectedDetailProvide"
import PageOverviewDrawer from "./affected-pages/pageOverviewDrawer/pageOverviewDrawer"

const ForceGraph2DMapStatic = dynamic(
    () => import("./ForceGraph2D"),
    { ssr: false }
);


interface LinkData {
    domain: string
    metrics: {
        avg_internal_links: number
        avg_page_depth: number
        max_page_depth: number
        orphan_pages: string[]
    }
    pages: Array<{
        url: string
        depth: number
        inbound_links: Array<{
            source: string
            text: string
        }>
        outbound_links: Array<{
            url: string
            text: string
        }>
    }>
}

interface TreeNode {
    url: string
    name: string
    depth: number
    children: TreeNode[]
    linkCount: number
    isOrphan: boolean
}

interface PageData {
    url: string
    depth: number
    inbound_links: Array<{ source: string; text: string }>
    outbound_links: Array<{ url: string; text: string }>
}

interface LinksData {
    domain: string
    metrics: {
        avg_internal_links: number
        avg_page_depth: number
        max_page_depth: number
        orphan_pages: string[]
    }
    pages: PageData[]
}

interface DynamicLinksDashboardProps {
    siteIssues: any
    linksData: LinksData
    selectedProject: any
}

interface Node {
    id: string
    name: string
    url: string
    x: number
    y: number
    depth: number
    inboundCount: number
    outboundCount: number
    isHome: boolean
}

const DynamicLinksDashboard = ({ siteIssues, linksData, selectedProject }: DynamicLinksDashboardProps) => {


    const [crawlMapType, setCrawlMapType] = useState("graph")
    const [hoveredNode, setHoveredNode] = useState<string | null>(null)
    const [searchPath, setSearchPath] = useState("");
    const [searchDepth, setSearchDepth] = useState("");
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [issueDrawerOpen, setIssueDrawerOpen] = useState(false)
    const [drawerPageData, setDrawerPageData] = useState<any>(null)
    const [pageOverviewDrawerOpen, setPageOverviewDrawerOpen] = useState(false)
    const [siteDetailPageData, setSiteDetailPageData] = useState()
    const [affectedDetailsPageData, setaffectedDetailsPageData] = useState()
    const { siteDetails } = useSiteDetail()
    const { affectedDetails, loading, fetchDetails }: any = useAffectedDetails()


    useEffect(() => {
        fetchDetails(selectedProject.id)
    }, [selectedProject.id])


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



    const getPageName = (url: string) => {
        if (url === `https://${linksData.domain}`) return "Home"
        const path = url.replace(`https://${linksData.domain}/`, "")
        return path
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
    }

    const getNodeColor = (linkCount: number, isHome = false) => {
        if (isHome) return "#008CCD" // blue-800
        if (linkCount >= 6) return "#16A34A" // green-600
        if (linkCount >= 4) return "#F59E0B" // amber-600
        return "#EF4444" // red-600
    }

    const { nodes, connections } = useMemo(() => {
        const nodes: Node[] = []
        const connections: any[] = []

        // Create nodes with better positioning
        linksData.pages.forEach((page, index) => {
            const isHome = page.url === `https://${linksData.domain}`
            const internalOutboundLinks = page.outbound_links.filter(
                (link: any) =>
                    link.url.startsWith(`https://${linksData.domain}`) && !link.url.includes(".pdf") && link.url !== page.url,
            )

            let x, y
            if (isHome) {
                // Home at center
                x = 400
                y = 150
            } else {
                // Arrange other nodes in a circle around home with proper margins
                const angle = ((index - 1) * 2 * Math.PI) / (linksData.pages.length - 1)
                const radius = 180
                x = 400 + radius * Math.cos(angle - Math.PI / 2)
                y = 250 + radius * Math.sin(angle - Math.PI / 2)

                // Ensure nodes stay within bounds
                x = Math.max(60, Math.min(740, x))
                y = Math.max(60, Math.min(440, y))
            }

            nodes.push({
                id: page.url,
                name: getPageName(page.url),
                url: page.url,
                x,
                y,
                depth: page.depth,
                inboundCount: page.inbound_links.length,
                outboundCount: internalOutboundLinks.length,
                isHome,
            })

            // Create connections
            internalOutboundLinks.forEach((link: any) => {
                connections.push({
                    from: page.url,
                    to: link.url,
                    text: link.text,
                })
            })
        })

        return { nodes, connections }
    }, [linksData])

    const ListView = () => (
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 w-full gap-4">
            {nodes.map((node) => (
                <div key={node.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow w-full hover:bg-brand-blue1/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: getNodeColor(node.outboundCount, node.isHome) }}
                            ></div>
                            <h3 className="font-semibold">{node.name}</h3>
                            {node.isHome && (
                                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">HOME</span>
                            )}
                        </div>
                        <span className="text-sm text-gray-500">Depth: {node.depth}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2 font-mono bg-gray-50 p-2 rounded">{node.url}</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <strong>Outbound Links:</strong> {node.outboundCount}
                        </div>
                        <div>
                            <strong>Inbound Links:</strong> {node.inboundCount}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )

    const analytics: any = useMemo(() => {
        if (!linksData?.pages || !linksData?.metrics) return null

        const pages = linksData.pages

        const metrics = linksData.metrics
        const totalPages = pages.length

        // Use metrics from the API
        const avgCrawlDepth = metrics.avg_page_depth
        const avgInternalLinks = Math.round(metrics.avg_internal_links)
        const orphanPages = metrics.orphan_pages.length
        const maxDepth = metrics.max_page_depth

        // Calculate crawl coverage
        const crawlCoverage = Math.round(((totalPages - orphanPages) / totalPages) * 100)

        // Find broken links (assuming 404s or other non-200 status codes)
        const brokenLinks = 0 // This would need status_code data in your structure

        // Find pages with only 1 outbound link
        const pagesWithOneLink = pages.filter((page) => page.outbound_links.length === 1).length

        // Create depth distribution for chart based on actual page depths
        const depthCounts = pages.reduce(
            (acc, page) => {
                const depth = Math.min(page.depth + 1, 10) // +1 because depth 0 = level 1
                acc[depth] = (acc[depth] || 0) + 1
                return acc
            },
            {} as Record<number, number>,
        )

        const depthDistribution = Array.from({ length: 10 }, (_, i) => ({
            depth: i + 1,
            count: depthCounts[i + 1] || 0,
        }))

        // Calculate page metrics for table
        const pageMetrics = pages
            .map((page) => ({
                url: page.url,
                inboundCount: page.inbound_links.length,
                outboundCount: page.outbound_links.length,
                depth: page.depth,
                isOrphan: metrics.orphan_pages.includes(page.url),
                anchorTexts:
                    page.outbound_links
                        .map((link: any) => link.text)
                        .filter((text) => text && text !== "No Text")
                        .slice(0, 2)
                        .join(", ") || "No anchor text",
            }))
            .sort((a, b) => b.inboundCount - a.inboundCount)

        // Pages without anchor text
        const pagesWithoutAnchorText = pages.filter((page) =>
            page.outbound_links.some((link: any) => !link.text || link.text === "No Text"),
        ).length

        return {
            totalPages,
            crawlCoverage,
            avgCrawlDepth: avgCrawlDepth.toFixed(1),
            avgInternalLinks,
            orphanPages,
            maxDepth,
            brokenLinks,
            pagesWithOneLink,
            pagesWithoutAnchorText,
            depthDistribution,
            pageMetrics,
        }
    }, [linksData])

    const filteredPages = useMemo(() => {
        if (!analytics?.pageMetrics) return [];

        return analytics.pageMetrics.filter((page: any) => {
            const matchesPath =
                page.url.toLowerCase().includes(searchPath.toLowerCase()) ||
                page.anchorTexts.toLowerCase().includes(searchPath.toLowerCase());

            const matchesDepth =
                !searchDepth || page.depth === Number(searchDepth);

            return matchesPath && matchesDepth;
        });
    }, [analytics, searchPath, searchDepth]);

    const crawlData = [
        { name: 'Reached', value: analytics.crawlCoverage },
        { name: 'Remaining', value: 100 - analytics.crawlCoverage },
    ];

    const COLORS = ['#10B981', '#E5E7EB'];

    const Columnseries = [{
        name: "Number of Pages",
        data: analytics.depthDistribution.map((item: any) => ({
            x: `${item.depth}`,
            y: [0, item.count],
            // count: item.count
        }))
    }];
    const Columnoptions: any = {
        chart: {
            type: 'rangeBar',
            height: 320,
            toolbar: {
                show: false
            }
        },
        grid: {
            borderColor: '#f2f5f7',
        },
        colors: ["#4286F5",],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '30%'
            }
        },
        xaxis: {
            title: {
                text: 'Crawl Depth', // bottom axis label
                style: {
                    color: '#8c9097',
                    fontSize: '12px',
                    fontWeight: 400
                }
            },
            labels: {
                show: true,
                style: {
                    colors: "#8c9097",
                    fontSize: '11px',
                    fontWeight: 600,
                    cssClass: 'apexcharts-xaxis-label',
                },
            }
        },
        yaxis: {
            title: {
                text: 'Number of Pages', // left side axis label
                style: {
                    color: '#8c9097',
                    fontSize: '12px',
                    fontWeight: 400,
                }
            },
            labels: {
                show: true,
                style: {
                    colors: "#8c9097",
                    fontSize: '11px',
                    fontWeight: 600,
                    cssClass: 'apexcharts-xaxis-label',
                },
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function (val: any, opts: any) {
                return opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex].count;
            }
        }

    }

    const TreeNodeComponent = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
        const nodeColor = getNodeColor(node.linkCount, node.isOrphan)

        return (
            <div className="flex flex-col items-center">
                <div className="flex flex-col items-center mb-4">
                    <div
                        className={`w-16 h-16 ${nodeColor} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                    >
                        {node.name.length > 8 ? node.name.substring(0, 8) + "..." : node.name}
                    </div>
                    <span className="text-xs mt-1 text-gray-600 max-w-20 text-center">{node.name}</span>
                </div>

                {node.children.length > 0 && (
                    <>
                        <div className="w-px h-8 bg-gray-300"></div>
                        <div className="flex items-start justify-center space-x-8">
                            {node.children.map((child, index) => (
                                <div key={child.url} className="flex flex-col items-center">
                                    {node.children.length > 1 && index === 0 && (
                                        <div
                                            className="w-full h-px bg-gray-300 absolute"
                                            style={{ width: `${(node.children.length - 1) * 8}rem` }}
                                        ></div>
                                    )}
                                    <div className="w-px h-8 bg-gray-300"></div>
                                    <TreeNodeComponent node={child} level={level + 1} />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        )
    }


    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const paginatedData = filteredPages.slice(startIndex, endIndex)

    const handleClearFilters = () => {
        setCurrentPage(1)
        setSearchPath("")
        setSearchDepth("")
    }

    if (!linksData) {
        return <div className="flex items-center justify-center h-[70vh]">No data available</div>
    }

    return (
        <div className="space-y-6">
            {/* Top Metrics Bar */}

            <Card className="border border-gray-200 w-full">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            Core internal link KPIs
                            <BsInfo className="text-xl flex-shrink-0" color="#9E9E9E" />
                        </CardTitle>
                        <div className="flex items-center gap-2 border border-gray-200 text-gray-600 rounded-md font-normal text-sm p-2 hover:bg-gray-50 transition-colors">
                            <Image
                                alt="Export icon"
                                src={"/placeholder.svg?height=14&width=14&query=export icon"}
                                className="cursor-pointer h-3.5 w-3.5"
                                height={14}
                                width={14}
                            />
                            <span>Export</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 lg:gap-6">
                        {/* Crawl Coverage Chart */}
                        <div className="flex flex-col items-center gap-4 bg-white rounded-lg border border-gray-200 p-4 lg:col-span-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-center">Crawl Coverage</span>
                                <BsInfo className="text-gray-400 cursor-pointer flex-shrink-0" size={16} />
                            </div>
                            <div className="w-full max-w-[200px] aspect-square relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={crawlData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="60%"
                                            outerRadius="80%"
                                            startAngle={90}
                                            endAngle={-270}
                                            labelLine={false}
                                            dataKey="value"
                                        >
                                            {crawlData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* Center number */}
                                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                                    {analytics.crawlCoverage}%
                                </div>
                            </div>


                            <span className="text-sm text-gray-500">Reached</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2">
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm font-medium text-gray-900">Avg. Crawl Depth</span>
                                        <BsInfo size={16} color="#9E9E9E" className="flex-shrink-0" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 items-baseline">
                                            <span className="font-semibold text-2xl text-blue-600">{analytics.avgCrawlDepth}</span>
                                            <span className="font-semibold text-lg text-blue-600">Levels</span>
                                        </div>
                                        <span className="text-sm text-gray-500">Average depth of crawled pages</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm font-medium text-gray-900">Avg. Internal</span>
                                        <BsInfo size={16} color="#9E9E9E" className="flex-shrink-0" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 items-baseline">
                                            <span className="font-semibold text-2xl text-blue-600">{analytics.avgInternalLinks}</span>
                                            <span className="font-semibold text-lg text-blue-600">Links</span>
                                        </div>
                                        <span className="text-sm text-gray-500">Average internal links per page</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm font-medium text-gray-900">Orphan Pages</span>
                                        <BsInfo size={16} color="#9E9E9E" className="flex-shrink-0" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 items-baseline">
                                            <span className="font-semibold text-2xl text-blue-600">{analytics.orphanPages}</span>
                                            <span className="font-semibold text-lg text-blue-600">Pages</span>
                                        </div>
                                        <span className="text-sm text-gray-500">Pages with no internal links</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm font-medium text-gray-900">Max Link Depth</span>
                                        <BsInfo size={16} color="#9E9E9E" className="flex-shrink-0" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 items-baseline">
                                            <span className="font-semibold text-2xl text-blue-600">
                                                {analytics.maxDepth < 10 ? "0" : ""}
                                                {analytics.maxDepth}
                                            </span>
                                            <span className="font-semibold text-lg text-blue-600">Levels</span>
                                        </div>
                                        <span className="text-sm text-gray-500">Maximum crawl depth reached</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-lg bg-white lg:col-span-2">
                            <div className="p-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Link Depth Distribution</h3>
                                <div className="h-64 sm:h-80">
                                    <Spkapexcharts
                                        chartOptions={Columnoptions}
                                        chartSeries={Columnseries}
                                        type="bar"
                                        width="100%"
                                        height="100%"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Visual Crawl Map */}
            <Card className="border border-gray-200 shadow-lg">
                <CardHeader className="">
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2 border-gray-200">
                        <CardTitle className="text-xl font-bold flex items-center gap-3 text-gray-800">

                            Visual Crawl Map
                            <BsInfo className="text-xl text-gray-400 hover:text-gray-600 cursor-help" />
                        </CardTitle>
                        <div className="flex gap-3 items-center">
                            <div className="border border-gray-300 rounded-lg flex overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setCrawlMapType("graph")}
                                    className={`text-sm font-medium cursor-pointer transition-all duration-200 ${crawlMapType === "graph" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                                        } px-4 py-2`}
                                >
                                    Graph View
                                </button>

                                <button
                                    onClick={() => setCrawlMapType("list")}
                                    className={`text-sm font-medium cursor-pointer transition-all duration-200 ${crawlMapType === "list" ? "bg-blue-500 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                                        } px-4 py-2 border-l border-gray-300`}
                                >
                                    List View
                                </button>
                            </div>
                            <div className="flex items-center gap-2 border border-gray-300 text-gray-600 rounded-lg font-medium text-sm px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors">
                                <ExternalLink className="w-4 h-4" />
                                <span>Export</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {crawlMapType === "list" ? <ListView /> : linksData && <ForceGraph2DMapStatic linksData={linksData} />}


                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm mt-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#008CCD" }}></div>
                            <span className="font-medium text-gray-700">Home Page</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#16A34A" }}></div>
                            <span className="font-medium text-gray-700">High Links (6+)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#F59E0B" }}></div>
                            <span className="font-medium text-gray-700">Medium Links (4-5)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#EF4444" }}></div>
                            <span className="font-medium text-gray-700">Low Links (0-3)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Internal Link Metrics */}
            <Card className="border border-gray-200">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                            Internal Link Metrics
                            <BsInfo className="text-xl" color="#9E9E9E" />
                        </CardTitle>

                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* <div className="space-y-4">
                        <h3 className="text-lg font-medium">Internal Link Metrics</h3> */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* 1. Top Linked Pages */}
                        <div className="border rounded-md p-4 bg-white shadow-sm space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>📍 Top Linked Pages</span>
                                <span className="text-blue-600 font-medium">Good</span>
                            </div>
                            <div className="text-md font-semibold text-gray-900">
                                &quot;{analytics.pageMetrics[0]?.url.replace(`https://${linksData.domain}`, "") || "/"}&quot;
                            </div>
                            <div className="text-xs text-gray-500">
                                {analytics.pageMetrics[0]?.inboundCount || 0} internal links
                            </div>
                        </div>

                        {/* 2. Pages with Only 1 Link */}
                        <div className="border rounded-md p-4 bg-white shadow-sm space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>⚠️ Pages with Only 1 Link</span>
                                <span className="text-yellow-600 font-medium">Warning</span>
                            </div>
                            <div className="text-2xl font-bold text-yellow-600">{analytics.pagesWithOneLink}</div>
                            <div className="text-xs text-gray-500">pages need more links</div>
                        </div>

                        {/* 3. Circular Linking Detected */}
                        <div className="border rounded-md p-4 bg-white shadow-sm space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>♻️ Circular Linking Detected</span>
                                <span className="text-red-600 font-medium">Error</span>
                            </div>
                            <div className="text-2xl font-bold text-red-600">{analytics.circularLinks}</div>
                            <div className="text-xs text-gray-500">circular link loops</div>
                        </div>

                        {/* 4. Broken Internal Links */}
                        <div className="border rounded-md p-4 bg-white shadow-sm space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>🧱 Broken Internal Links</span>
                                <span className="text-red-600 font-medium">Error</span>
                            </div>
                            <div className="text-2xl font-bold text-red-600">{analytics.brokenLinks}</div>
                            <div className="text-xs text-gray-500">broken URLs</div>
                        </div>

                        {/* 5. Pages Without Anchor Text */}
                        <div className="border rounded-md p-4 bg-white shadow-sm space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>✏️ Pages Without Anchor Text</span>
                                <span className="text-yellow-600 font-medium">Warning</span>
                            </div>
                            <div className="text-2xl font-bold text-yellow-600">{analytics.pagesWithoutAnchorText}</div>
                            <div className="text-xs text-gray-500">pages missing anchor text</div>
                        </div>

                        {/* 6. Internal Redirect Chains */}
                        <div className="border rounded-md p-4 bg-white shadow-sm space-y-1">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>🔁 Internal Redirect Chains</span>
                                <span className="text-yellow-600 font-medium">Warning</span>
                            </div>
                            <div className="text-2xl font-bold text-yellow-600">{analytics.redirectChains}</div>
                            <div className="text-xs text-gray-500">redirect chains</div>
                        </div>
                    </div>
                    {/* </div> */}

                </CardContent>
            </Card>
            <Card className="border border-gray-200">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                            Internal Linking Table
                            <BsInfo className="text-xl" color="#9E9E9E" />
                        </CardTitle>
                        <div className="flex items-center flex-wrap gap-5">

                            <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                <span>Export</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between pb-2">
                        <div className="flex items-center flex-wrap gap-5">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Search page path or anchor text..."
                                    value={searchPath}
                                    onChange={(e) => setSearchPath(e.target.value)}
                                    className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                                />
                            </div>
                            <div>
                                <input
                                    type="number"
                                    placeholder="Depth: 1-10"
                                    value={searchDepth}
                                    onChange={(e) => setSearchDepth(e.target.value)}
                                    className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                                />
                            </div>

                            <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                <span>Filter</span>
                            </div>
                        </div>
                        <div
                            onClick={handleClearFilters}
                            className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2"
                        >
                            <FiRefreshCw className="cursor-pointer h-[14px] w-auto" />
                            <span>Clear</span>
                        </div>
                    </div>
                    {/* Table */}
                    {/* <div className="border border-gray-200 rounded-md overflow-hidden"> */}
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="text-left text-[14px] font-normal text-gray-600 text-sm px-4 py-3 border-b">PAGE URL</th>
                                <th className="text-left text-[14px] font-normal text-gray-600 text-sm px-4 py-3 border-b"> INBOUND LINKS</th>
                                <th className="text-left text-[14px] font-normal text-gray-600 text-sm px-4 py-3 border-b"> OUTBOUND LINKS</th>
                                <th className="text-left text-[14px] font-normal text-gray-600 text-sm px-4 py-3 border-b"> ANCHOR TEXTS</th>
                                <th className="text-left text-[14px] font-normal text-gray-600 text-sm px-4 py-3 border-b"> CRAWL DEPTH</th>
                                <th className="text-left text-[14px] font-normal text-gray-600 text-sm px-4 py-3 border-b"> ORPHAN STATUS</th>
                                <th className="text-left text-[14px] font-normal text-gray-600 text-sm px-4 py-3 border-b"> ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((page: any, index: any) => (
                                <tr key={index} className="border-b hover:bg-gray-50 font-medium">
                                    <td className="px-4 py-3 text-blue-600 font-medium">
                                        {page.url}
                                    </td>
                                    <td className="px-4 py-3">{page.inboundCount}</td>
                                    <td className="px-4 py-3">{page.outboundCount}</td>
                                    <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]">&quot;{page.anchorTexts}&quot;</td>
                                    <td className="px-4 py-3">{page?.depth ? page?.depth : 0}</td>
                                    <td className="px-4 py-3">
                                        {page.isOrphan ? (
                                            <span className="text-red-600 font-medium">Yes</span>
                                        ) : (
                                            <span className="text-green-600 font-medium">No</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 flex items-center space-x-2">
                                        <span
                                            onClick={() => handlePageOverviewClick(page.url)}

                                            className="text-[#0077FF] hover:text-brand-blue1 flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">View</span>

                                        {page.isOrphan && (
                                            <span className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Task</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* </div> */}

                    {/* Footer */}
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredPages?.length}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setCurrentPage}
                        onRowsPerPageChange={setRowsPerPage}
                    />

                    <AffectedDrawer isOpen={issueDrawerOpen} onClose={handleCloseDrawer} pageData={drawerPageData} onPageAnalyzer={handlePageOverviewClick} />

                    {(siteDetailPageData && affectedDetailsPageData) &&
                        <PageOverviewDrawer 
                        isOpen={pageOverviewDrawerOpen} 
  onClose={() => setPageOverviewDrawerOpen(false)}
                        siteIssuesData={siteIssues} 
                        siteDetailPageData={siteDetailPageData}
                        affectedDetailsPageData={affectedDetailsPageData} />}
                </CardContent>
            </Card>
        </div>
    )
}

export default DynamicLinksDashboard
