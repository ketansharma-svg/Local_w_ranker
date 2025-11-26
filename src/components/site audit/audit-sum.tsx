
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { extractTopIssues, toIssueKeyStrict } from '@/src/util/helper';
import { Pagination } from 'antd';
import { TrendingDown, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { BsInfo } from 'react-icons/bs';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import InfoTooltip from '../common/InfoTooltip';
import Component from './site-health-dashboard';
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

interface PageAffected {
    url: string;
    title: string;
    status: "New" | "Existing" | "Re_Appeared";
    validation: "Validated" | "Not Validated";
}

interface IssueDetail {
    title: string;
    severity: string;
    summary: string;
    pagesAffected: PageAffected[];
    fixInstructions: string;
}

interface LineChartClickData {
    activeLabel?: string;
}

interface PieChartClickData {
    name: string;
    value: number;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: {
        dataKey: string;
        value: number;
        color: string;
        payload: string;
    }[];
    label?: string;
}

const infoContent = {
    auditTrend: "Audit Trend Chart shows the SEO score and issue count trends over your last 5 audits.",
    issueSeverity: "Issue Severity Breakdown visualizes the proportion of critical, warning, low, and info issues found in your latest audit.",
    topIssues: "Top 10 Issue Types lists the most frequent or impactful issues detected in your site audit.",
}

const AuditSum = ({ siteIssues, sitedetails, onIssueClick, handleSelectIssueType }: any) => {

    const { selectedProject } = useProjectManager()
    const { openTaskDrawer } = useTaskDrawer();

    const CustomPieTooltip: any = ({ active, payload, total }: any) => {
        if (active && payload && payload.length > 0) {
            const { name, value } = payload[0];
            const percent = ((value / total) * 100).toFixed(0);

            return (
                <div className="bg-white border border-gray-200 p-2 rounded shadow text-sm text-brand-blue3 font-medium">
                    <p className="">
                        {name}: {value}
                    </p>
                    <p className="">Issues ({percent}%)</p>
                </div>
            );
        }
        return null;
    };

    const [chartMode, setChartMode] = useState<"seo" | "issues">("seo");

    const handleChartClick = (
        data: LineChartClickData | PieChartClickData | null,
        chartType: "line" | "pie"
    ) => {
        if (chartType === "line" && data && "activeLabel" in data) {
            const issueDetail: IssueDetail = {
                title: `Issues for ${data.activeLabel}`,
                severity: "Mixed",
                summary: `Showing all issues found on ${data.activeLabel}`,
                pagesAffected: [],
                fixInstructions: "",
            };
            onIssueClick(issueDetail);
        } else if (chartType === "pie" && data && "name" in data) {
            const issueDetail: IssueDetail = {
                title: `${data.name} Issues`,
                severity: data.name,
                summary: `Showing all ${data.name.toLowerCase()} severity issues (${data.value
                    } total)`,
                pagesAffected: [],
                fixInstructions: "",
            };
            onIssueClick(issueDetail);
        }
    };

    const trendData = siteIssues
        ?.map((item: any) => ({
            date: item.date,
            seoScore: item?.result?.seo_score || 0,
            critical: item?.result?.issue_counts["🔴 Critical"] || 0,
            warning: item?.result?.issue_counts["🟠 Warning"] || 0,
            info: item?.result?.issue_counts["🔵 Info"] || 0,
            low: item?.result?.issue_counts["🟡 Low"] || 0,
            totalIssues:
                (item?.result?.issue_counts["🔴 Critical"] || 0) +
                (item?.result?.issue_counts["🟠 Warning"] || 0) +
                (item?.result?.issue_counts["🟡 Low"] || 0) +
                (item?.result?.issue_counts["🔵 Info"] || 0),
        }))
        ?.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-md shadow-lg">
                    <p className="font-medium mb-1">{label}</p>
                    {payload.map((entry, index: number) => {
                        const labelMap: Record<string, string> = {
                            seoScore: "SEO Score",
                            critical: "Critical",
                            warning: "Warning",
                            info: "Info",
                        };

                        return (
                            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                                {labelMap[entry.dataKey] || entry.dataKey}: {entry.value}
                            </p>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    const severityData =
        siteIssues &&
            siteIssues.length > 0 &&
            siteIssues[0]?.result?.issue_counts
            ? [
                {
                    name: "Critical",
                    value: siteIssues[0].result.issue_counts["🔴 Critical"] || 0,
                    color: "#EA4335",
                },
                {
                    name: "Warning",
                    value: siteIssues[0].result.issue_counts["🟠 Warning"] || 0,
                    color: "#F97316",
                },
                {
                    name: "Low",
                    value: siteIssues[0].result.issue_counts["🟡 Low"] || 0,
                    color: "#FBBC05",
                },
                {
                    name: "Info",
                    value: siteIssues[0].result.issue_counts["🔵 Info"] || 0,
                    color: "#0077FF",
                },
            ]
            : [];

    const totalIssues = severityData.reduce((acc, item) => acc + item.value, 0);

    const topIssues = extractTopIssues(siteIssues);

    const [currentPage, setCurrentPage] = useState<any>(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const indexOfLast = currentPage * rowsPerPage;
    const indexOfFirst = indexOfLast - rowsPerPage;
    const currentData = topIssues.slice(indexOfFirst, indexOfLast);



    return (
        <div className=" space-y-4">
            {/* Statistics Bar */}
            {siteIssues && sitedetails && <Component sitedetails={sitedetails} historyData={siteIssues} />}

            {/* Charts Section */}
            <div className="grid 3xl:grid-cols-2 2xl:grid-cols-2 xl:grid-cols-2 lg:grid-cols-1 md:grid-cols-1 sm:grid-cols-1 gap-6">
                {/* Audit Trend Chart */}
                <Card className="border border-gray-200">
                    <CardHeader>
                        <div className="flex items-center justify-between  pb-2 border-b-2">
                            <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                                Audit Trend Chart
                                <InfoTooltip title={infoContent.auditTrend} placement="right">
                                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                                </InfoTooltip>
                            </CardTitle>

                            <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                <span>Export</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center mt-3 space-x-1">
                                <Button
                                    variant={chartMode === "seo" ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "px-3 py-1",
                                        chartMode === "seo"
                                            ? "bg-brand-blue1 text-white"
                                            : "text-gray-600 border-gray-300"
                                    )}
                                    onClick={() => setChartMode("seo")}
                                >
                                    SEO Score
                                </Button>
                                <Button
                                    variant={chartMode === "issues" ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "px-3 py-1",
                                        chartMode === "issues"
                                            ? "bg-blue-600 text-white"
                                            : "text-gray-600 border-gray-300"
                                    )}
                                    onClick={() => setChartMode("issues")}
                                >
                                    Issue Count
                                </Button>
                            </div>
                            <div className="flex justify-end">
                                <p className="text-xs flex justify-end text-gray-500">
                                    Data from last 5 completed audits
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    {trendData && trendData.length > 0 && (
                        <CardContent>



                            {chartMode === "issues" ?

                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={trendData}
                                            onClick={(data) => handleChartClick(data, "line")}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip content={<CustomTooltip />} />

                                            <Line
                                                type="monotone"
                                                dataKey="totalIssues"
                                                stroke="#0077FF"
                                                strokeWidth={2}
                                                dot={{ fill: "#0077FF", strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: "#0077FF" }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="critical"
                                                stroke="#EA4335"
                                                strokeWidth={2}
                                                dot={{ fill: "#EA4335", strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: "#EA4335" }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="warning"
                                                stroke="#FFA500"
                                                strokeWidth={2}
                                                dot={{ fill: "#FFA500", strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: "#FFA500" }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="info"
                                                stroke="#0077FF"
                                                strokeWidth={2}
                                                dot={{ fill: "#0077FF", strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: "#0077FF" }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="low"
                                                stroke="#FBBC05"
                                                strokeWidth={2}
                                                dot={{ fill: "#FBBC05", strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: "#FBBC05" }}
                                            />

                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                :
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={trendData}
                                            onClick={(data) => handleChartClick(data, "line")}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            (
                                            <Line
                                                type="monotone"
                                                dataKey="seoScore"
                                                stroke="#0077FF"
                                                strokeWidth={2}
                                                dot={{ fill: "#0077FF", strokeWidth: 2, r: 4 }}
                                                activeDot={{ r: 6, fill: "#0077FF" }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            }
                            {chartMode === "issues" && (
                                <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-[#EA4335] rounded"></div>
                                        <span>Critical</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-[#FFA500] rounded"></div>
                                        <span>Warning</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-[#0077FF] rounded"></div>
                                        <span>Info</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-[#FBBC05] rounded"></div>
                                        <span>Low</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>

                {/* Issue Severity Breakdown */}
                <Card className="border border-gray-200">
                    <CardHeader>

                        <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                            <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                                Issue Severity Breakdown
                                <InfoTooltip title={infoContent.issueSeverity} placement="right">
                                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                                </InfoTooltip>
                            </CardTitle>

                            <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                <span>Export</span>
                            </div>
                        </div>

                    </CardHeader>
                    <CardContent>
                        <div className="h-80 relative flex">
                            <div className="w-2/3 h-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={severityData || ""}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={120}
                                            innerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                            // onClick={(data) => handleChartClick(data, "pie")}
                                            style={{ cursor: "pointer" }}
                                        >
                                            {severityData?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={<CustomPieTooltip total={totalIssues} />}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-gray-900">
                                            Total: {totalIssues}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/3 flex flex-col justify-center pl-4 space-y-2">
                                {severityData.map((item, index) => {
                                    const percent = (
                                        (item.value / totalIssues) *
                                        100
                                    ).toFixed(0);
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center space-x-2 text-sm"
                                        >
                                            <div
                                                className="w-3 h-3 rounded"
                                                style={{ backgroundColor: item.color }}
                                            ></div>
                                            <span className="text-gray-800">
                                                {item.name}: {item.value} ({percent}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top 10 Issue Types */}
            <Card className="border border-gray-200">
                <CardHeader>
                    <div className="flex items-center justify-between pb-2 border-b-2">
                        <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                            Top 10 Issue Types
                            <InfoTooltip title={infoContent.topIssues} placement="right">
                                <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                            </InfoTooltip>
                        </CardTitle>

                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                        #
                                    </th>
                                    <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                        ISSUE TYPE
                                    </th>
                                    <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                        COUNT
                                    </th>
                                    <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                        SEVERITY
                                    </th>
                                    <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                        AFFECTED PAGES
                                    </th>
                                    <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                        TREND
                                    </th>
                                    <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                        ACTION
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData?.map((issue: any) => (
                                    <tr
                                        key={issue?.id}
                                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                    >
                                        <td className="py-3 px-4 text-[14px] font-medium"
                                        >{issue?.id}</td>
                                        <td className="py-3 px-4 text-[14px] font-medium"
                                            onClick={() => {
                                                const key = toIssueKeyStrict(issue?.type);
                                                if (!key) return; // or show a toast: "Unsupported issue type"
                                                handleSelectIssueType("Affected Page", key);
                                            }}                                        >
                                            {issue?.type}
                                        </td>
                                        <td className="py-3 px-4 text-[14px] font-medium">{issue?.count}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center space-x-1">
                                                <div
                                                    className={`w-2 h-2 rounded-full  ${issue?.severity === "Critical"
                                                        ? "bg-[#EA4335]"
                                                        : issue?.severity === "Warning"
                                                            ? "bg-[#FFA500]"
                                                            : issue?.severity === "Info" ? "bg-[#0077FF]" : "bg-[#FBBC05]"
                                                        }`}
                                                ></div>
                                                <span className="text-[14px] font-medium">{issue?.severity}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Button
                                                variant="link"
                                                className="text-blue-600 text-[14px] font-medium p-0 h-auto"
                                                onClick={() => {
                                                    const key = toIssueKeyStrict(issue?.type);
                                                    if (!key) return; // or show a toast: "Unsupported issue type"
                                                    handleSelectIssueType("Affected Page", key);
                                                }}
                                            >
                                                {issue?.affectedPages}
                                            </Button>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center space-x-1 font-medium">
                                                {issue?.trend?.trend === "up" && (
                                                    <TrendingUp className="h-3 w-3 text-brand-red" />
                                                )}
                                                {issue?.trend?.trend === "down" && (
                                                    <TrendingDown className="h-3 w-3 text-brand-green" />
                                                )}
                                                <span
                                                    className={`text-sm ${issue?.trend?.trend === "up"
                                                        ? "text-brand-red"
                                                        : issue?.trend === "down"
                                                            ? "text-brand-green"
                                                            : "text-gray-500"
                                                        }`}
                                                >
                                                    {issue?.trend === "neutral"
                                                        ? "-"
                                                        : `${issue?.trend?.trend === "up" ? "+" : "-"}${issue?.trend?.trendValue
                                                        }`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <button
                                            disabled={!issue?.count}
                                                onClick={() => openTaskDrawer({
                                                    title: issue?.type,
                                                    projectId: selectedProject?.id ?? null,
                                                    type: "createNew"
                                                })}
                                                className={` font-normal text-[15px]  leading-[20px] align-middle  decoration-solid ${issue?.count ? "cursor-pointer text-[#0077FF] hover:underline" :" cursor-not-allowed  text-gray-600 "}`}>Create Task</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <Pagination
                            current={currentPage}
                            total={topIssues.length}
                            pageSize={rowsPerPage}
                            onChange={setCurrentPage}
                            onShowSizeChange={(_, size) => setRowsPerPage(size)}
                            showSizeChanger
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default AuditSum