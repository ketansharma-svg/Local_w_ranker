

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeselectedProjectUrl } from "@/src/util/helper";
import Pagination from "@/src/util/paginationComponent";
import { Modal } from "antd";
import { CheckCircle, Search } from 'lucide-react';
import Image from "next/image";
import { useState } from 'react';
import { AiOutlineInfoCircle } from "react-icons/ai";
import { BsInfo } from "react-icons/bs";
import { MdInfoOutline } from "react-icons/md";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const Security = ({ siteIssues, sitedetails, selectedProject }: any) => {
    const [showSecurityAlerts, setShowSecurityAlerts] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [depthFilter, setDepthFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    const pageRoleMap = [
        {
            title: "Homepage",
            match: (url: string) => url === normalizeselectedProjectUrl(selectedProject?.url),
            icon: "🏠",
        },
        {
            title: "Top Product Page",
            match: (url: string) => url.includes("/product"),
            icon: "🧾",
        },
        {
            title: "Checkout Page",
            match: (url: string) => url.includes("/checkout"),
            icon: "⚠️",
        },
        {
            title: "Most Visited Blog",
            match: (url: string) => url.includes("/blog"),
            icon: "⏳",
        },
    ];


    const analysisDate = new Date(sitedetails?.result?.analysis_completed_at || "").toLocaleDateString();

    const links = sitedetails?.result?.links || [];

    const securityPageStatus = pageRoleMap.map((role) => {
        const link = links.find((l: any) => role.match(l.url));
        const safe = link?.security?.safe_browsing?.safe;
        const threats = link?.security?.safe_browsing?.threats || [];

        if (!link) {
            return {
                title: role.title,
                url: "#",
                status: "N/A",
                description: "No data available",
                statusColor: "text-gray-500",
                bgColor: "bg-gray-100",
                icon: role.icon,
            };
        }



        return {
            title: role.title,
            url: link?.url || "#",
            status: !link
                ? "Pending Scan"
                : safe
                    ? "Safe"
                    : `Threat: ${threats.join(", ")}`,
            description: !link ? "Not yet scanned" : `Last Scanned: ${analysisDate}`,
            statusColor: !link
                ? "text-yellow-600"
                : safe
                    ? "text-green-600"
                    : "text-red-600",
            bgColor: !link
                ? "bg-yellow-50"
                : safe
                    ? "bg-green-50"
                    : "bg-red-50",
            icon: role.icon,
        };
    });


    const securityIssuesLog = links.flatMap((link: any) => {
        const threats = link.security?.safe_browsing?.threats || [];
        if (!threats.length) return [];

        return threats.map((threat: string, idx: number) => ({
            id: `${link.url}-${idx}`,
            pageUrl: link.url,
            threatType: threat.toUpperCase(),
            status: "Active",
            detectedOn: sitedetails?.result?.analysis_completed_at
                ? new Date(sitedetails.result.analysis_completed_at).toLocaleString()
                : "Unknown",
            actions: ["View Details", "Mark as Resolved", "Report Review"],
        }));
    });

    const securityAlerts = links.flatMap((link: any, index: number) => {
        const threats = link.security?.safe_browsing?.threats || [];
        return threats.map((threat: string, idx: number) => ({
            id: `${index}-${idx}`,
            page: link.url.replace("https://www.w3era.com", "") || "/",
            threat: threat,
            description: `Detected ${new Date(sitedetails.result.analysis_completed_at).toLocaleDateString()}`,
            color: "bg-red-100 border-red-500", // optional logic for colors based on threat
        }));
    });

    const securityInsights = siteIssues[0]?.result?.security_insights

    const safeCount = securityInsights?.summary?.safe || 0;
    const errorCount =
        (securityInsights?.summary?.error || 0) +
        (securityInsights?.summary?.unsafe || 0);

    const severityData = [
        { name: "Safe", value: safeCount },
        { name: "Error", value: errorCount },
    ];

    const totalIssues = severityData.reduce((acc, curr) => acc + curr.value, 0);

    const COLORS = ["#10B981", "#e6eaeb"];


    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const paginatedData = securityIssuesLog.slice(startIndex, endIndex)

    return (
        <>
            <div className="bg-white border rounded-md p-6 mx-auto shadow-sm w-full">
                <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-2">
                    {/* <h2 className="text-[18px] font-semibold">Coverage Summary</h2> */}
                    <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                        Current Security Status
                        <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                    </CardTitle>
                    <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                        <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                        <span>Export</span>
                    </div>
                </div>
                <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 ">
                    {securityPageStatus.map((card: any, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex justify-between">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">{card.title}</span>
                                    <BsInfo size={18} color="#9E9E9E" />
                                </div>
                                {/* <div
                                    className={`text-sm font-medium ${card.statusColor}`}
                                >
                                    {card.status}
                                </div> */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-4 items-center">
                                        <span className={`font-semibold text-[24px] text-[#0077FF]`}>{card.status}</span>
                                    </div>
                                    <span className="text-right flex justify-start font-normal text-[14px]">{card.description}</span>
                                </div>
                            </div>
                            <span className="text-[#0077FF] flex justify-end items-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid"
                                onClick={() => {
                                    const issue = securityIssuesLog.find(
                                        (log: any) => log.pageUrl === card.url
                                    );

                                    if (issue) {
                                        setSelectedIssue(issue);
                                    } else {
                                        setSelectedIssue({
                                            pageUrl: card.url,
                                            threatType: "None",
                                            status: card.status,
                                            detectedOn: card.description,
                                            actions: [],
                                        });
                                    }

                                    setIsModalOpen(true);
                                }}

                            >View Details</span>
                        </div>
                    ))}
                </div>
                <Modal
                    open={isModalOpen}
                    onCancel={() => setIsModalOpen(false)}
                    footer={null}
                    title="Security Threat Details"
                >
                    {selectedIssue ? (
                        <div className="space-y-2">
                            <div>
                                <span className="font-medium text-gray-700">Page URL: </span>
                                <span className="text-blue-600">{selectedIssue.pageUrl}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Threat Type: </span>
                                <span className="text-red-600">{selectedIssue.threatType}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Status: </span>
                                <span className="text-gray-800">{selectedIssue.status}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Detected On: </span>
                                <span className="text-gray-600">{selectedIssue.detectedOn}</span>
                            </div>

                        </div>
                    ) : (
                        <p>No issue selected</p>
                    )}
                </Modal>
            </div>

            <div className='grid grid-cols-4 gap-4 '>

                <div className="bg-white col-span-1 border rounded-md p-6 mt-4 shadow-sm">
                    <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-2">
                        {/* <h2 className="text-[18px] font-semibold">Coverage Summary</h2> */}
                        <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                            Full Site Security Scan
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </CardTitle>
                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="h-full relative">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={severityData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        innerRadius={100}
                                        dataKey="value"
                                        labelLine={false}
                                        style={{ cursor: "pointer" }}
                                    >
                                        {severityData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    {/* <Tooltip content={<CustomPieTooltip />} /> */}
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
                        {/* Dynamic threat status */}
                        <div className="p-4">
                            {(() => {
                                const links = sitedetails?.result?.links || [];
                                const hasThreats = links.some(
                                    (link: any) =>
                                        link?.security?.safe_browsing?.safe === false ||
                                        (link?.security?.safe_browsing?.threats || []).length > 0
                                );

                                if (hasThreats) {
                                    return (
                                        <div className="flex items-center space-x-2 text-red-600">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">
                                                Threats detected in the last scan. Review recommended.
                                            </span>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="flex items-center space-x-2 text-green-700">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">
                                                Your site is safe, no threats were detected in the
                                                last scan.
                                            </span>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                </div>


                <div className="bg-white border col-span-3 rounded-md p-6 mt-4 shadow-sm">
                    <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-2">
                        {/* <h2 className="text-[18px] font-semibold">Coverage Summary</h2> */}
                        <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                            Security Issues Log
                            <MdInfoOutline className="text-gray-500 text-lg" />
                        </CardTitle>
                        <div className="flex items-center flex-wrap gap-5">

                            <div>
                                <input
                                    type="text"
                                    placeholder="Search by URL or Threat Type"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                                />
                            </div>

                            <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                <span>Export</span>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        PAGE URL
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        THREAT TYPE
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        STATUS
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        DETECTED ON
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>
                            <tbody>

                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4 text-gray-500">
                                            No security issues found 🎉
                                        </td>
                                    </tr>
                                ) : (paginatedData.map((issue: any) => (
                                    <tr
                                        key={issue.id}
                                        className="border-b border-gray-100 hover:bg-gray-50"
                                    >
                                        <td className="py-3 px-4 text-brand-blue3 text-sm font-mono">
                                            {issue.pageUrl}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${issue.threatType === "PHISHING"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-orange-100 text-orange-800"
                                                    }`}
                                            >
                                                {issue.threatType}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm">{issue.status}</td>
                                        <td className="py-3 px-4 text-sm">
                                            {issue.detectedOn}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex space-x-2">
                                                {issue.actions.map((action: any, actionIndex: any) => (
                                                    <Button
                                                        key={actionIndex}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-brand-blue3 text-xs h-7 bg-transparent"
                                                    >
                                                        {action}
                                                    </Button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )))}

                            </tbody>
                        </table>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={securityIssuesLog?.length}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setCurrentPage}
                            onRowsPerPageChange={setRowsPerPage}
                        />
                    </div>
                    {/* <div className="mt-4 text-sm text-gray-500">
                        Showing 1 to 10 of 2 results
                    </div> */}
                </div>
            </div>

            {/* <div className=" mb-6 space-y-6">


                <Card className="border border-gray-200">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">🔍</span>
                            </div>
                            <CardTitle className="text-lg">Full Site Security Scan</CardTitle>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            We auto-scan your key pages, but you can run a complete scan
                            across all URLs for a full security audit.
                        </p>
                    </CardHeader>

                    <CardContent>
                        <div className="space-y-4 max-w-sm">
                            <div className="space-y-2 flex gap-2 justify-between ">
                                <div className="flex flex-col text-sm">
                                    <span className="text-gray-600">Last Full Scan:</span>
                                    <span className="font-medium">
                                        {sitedetails.result?.analysis_completed_at
                                            ? new Date(sitedetails.result.analysis_completed_at).toLocaleDateString()
                                            : "N/A"}
                                    </span>
                                </div>
                                <div className="flex flex-col text-sm">
                                    <span className="text-gray-600">Total URLs Detected:</span>
                                    <span className="font-medium">
                                        {sitedetails.result?.total_pages_analyzed ?? "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <Button className="bg-brand-blue1 text-white">
                                    🔍 Run Full Scan
                                </Button>
                                <Button
                                    variant="link"
                                    className="text-gray-500 text-sm ml-4"
                                >
                                    <AiOutlineInfoCircle /> Why full scan is optional?
                                </Button>
                            </div>

                            <div className="p-4">
                                {(() => {
                                    const links = sitedetails?.result?.links || [];
                                    const hasThreats = links.some(
                                        (link: any) =>
                                            link?.security?.safe_browsing?.safe === false ||
                                            (link?.security?.safe_browsing?.threats || []).length > 0
                                    );

                                    if (hasThreats) {
                                        return (
                                            <div className="flex items-center space-x-2 text-red-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    Threats detected in the last scan. Review recommended.
                                                </span>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className="flex items-center space-x-2 text-green-700">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    Your site is safe, no threats were detected in the
                                                    last scan.
                                                </span>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div> */}
            {/* Full Site Security Scan */}

            {/* Security Issues Log */}
            {/* <Card className="border border-gray-200 mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">📋</span>
                            <CardTitle className="text-lg">
                                Security Issues Log
                            </CardTitle>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search by URL or Threat Type"
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        PAGE URL
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        THREAT TYPE
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        STATUS
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        DETECTED ON
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>
                            <tbody>

                                {securityIssuesLog.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4 text-gray-500">
                                            No security issues found 🎉
                                        </td>
                                    </tr>
                                ) : (securityIssuesLog.map((issue: any) => (
                                    <tr
                                        key={issue.id}
                                        className="border-b border-gray-100 hover:bg-gray-50"
                                    >
                                        <td className="py-3 px-4 text-brand-blue3 text-sm font-mono">
                                            {issue.pageUrl}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${issue.threatType === "PHISHING"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-orange-100 text-orange-800"
                                                    }`}
                                            >
                                                {issue.threatType}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm">{issue.status}</td>
                                        <td className="py-3 px-4 text-sm">
                                            {issue.detectedOn}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex space-x-2">
                                                {issue.actions.map((action: any, actionIndex: any) => (
                                                    <Button
                                                        key={actionIndex}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-brand-blue3 text-xs h-7 bg-transparent"
                                                    >
                                                        {action}
                                                    </Button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )))}

                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        Showing 1 to 10 of 2 results
                    </div>
                </CardContent>
            </Card> */}

            {/* Security Alerts Sidebar */}
            {showSecurityAlerts && (
                <div className="fixed top-20 right-4 w-80 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-yellow-500">⚠️</span>
                            <span className="font-medium text-sm">
                                Security Alerts (3)
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setShowSecurityAlerts(false)}
                        >
                            ✕
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {securityAlerts.map((alert: any) => (
                            <div
                                key={alert.id}
                                className={`border-l-4 p-3 rounded-r-lg`}
                            >
                                <div className="font-medium text-sm">{alert.page}</div>
                                <div className="text-sm text-gray-600">
                                    Threat: {alert.threat}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {alert.description}
                                </div>
                                <Button
                                    variant="link"
                                    className="text-brand-blue3 text-xs p-0 h-auto mt-1"
                                >
                                    View Details
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}

export default Security