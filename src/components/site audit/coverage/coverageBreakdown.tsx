
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IoClose, IoSearch, IoWarning } from "react-icons/io5";
import { GrNotes } from "react-icons/gr";
import { FaCheckSquare, FaSearch } from "react-icons/fa";
import { CiSquareCheck } from "react-icons/ci";
import Image from "next/image";
import { BsInfo } from "react-icons/bs";
import { FiRefreshCw } from "react-icons/fi";
import Pagination from "@/src/util/paginationComponent";
import { ExportManager } from "@/src/lib/export-utils";

const CoverageBreakdown = ({ coverage_breakdown }: any) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [issueTypeFilter, setIssueTypeFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [isExporting, setIsExporting] = useState(false)

    const statusOptions: any = [];
    const issueTypeOptions: any = [];

    coverage_breakdown?.forEach((link: any) => {
        if (!statusOptions.some((item: any) => item.value === link.coverage_state)) {
            statusOptions.push({
                name: link.coverage_state,
                value: link.coverage_state,
            });
        }
        if (!issueTypeOptions.some((item: any) => item.value === link.gsc_issue_type)) {
            issueTypeOptions.push({
                name: link.gsc_issue_type,
                value: link.gsc_issue_type,
            });
        }
    });

    // 🔎 Filtering logic
    const filteredData = useMemo(() => {
        return (coverage_breakdown || []).filter((row: any) => {
            const matchesSearch =
                row.url.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter
                ? row.coverage_state === statusFilter
                : true;
            const matchesIssue = issueTypeFilter
                ? row.gsc_issue_type === issueTypeFilter
                : true;

            return matchesSearch && matchesStatus && matchesIssue;
        });
    }, [coverage_breakdown, searchQuery, statusFilter, issueTypeFilter]);

    const handleClearFilters = () => {
        setSearchQuery("")
        setStatusFilter("")
        setIssueTypeFilter("")
    }

    const handleExport = async () => {
        if (!filteredData?.length || isExporting) return;

        setIsExporting(true);
        try {
            const exportRows = filteredData.map((row: any) => ({
                URL: row.url || "",
                Status: row.coverage_state || "",
                Reason: row.gsc_issue_type || "",
                "First Detected": row.detected || "",
                Validated: row.validated || "",
                "Fix Status": row.fixStatus || "",
                Task: row.task || "",
            }));

            const metadata = {
                projectId: coverage_breakdown?.[0]?.project_id
                    ? String(coverage_breakdown[0].project_id)
                    : "unknown",
                component: "coverage-breakdown",
                filtersApplied: { searchQuery, statusFilter, issueTypeFilter },
                generatedAt: new Date().toISOString(),
                exportScope: "filtered" as const,
                totalRecords: exportRows.length,
            };

            const csvResult = await ExportManager.exportToCSV(exportRows, metadata);
            if (typeof csvResult !== "string") {
                console.warn("Export queued", csvResult);
                return;
            }

            const blob = new Blob([csvResult], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const filename = ExportManager.getExportFilename("coverage-breakdown", "csv", "filtered");
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    };


    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const currentIssues = filteredData.slice(startIndex, endIndex)
    return (
        <Card className="border border-gray-200 mt-4">
            <CardHeader>
                <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                    <div className="flex text-[18px] font-semibold gap-1 items-center">
                        <h2 className="text-[18px] font-semibold">Coverage Breakdown</h2>
                        <BsInfo
                            className="text-[20px] font-semibold cursor-pointer"
                            color="#9E9E9E"
                        />
                    </div>


                    {/* Export */}
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={!filteredData?.length || isExporting}
                        className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Image
                            alt=""
                            src={"/images/WRanker - Export Icon grey.png"}
                            className="h-[14px] w-auto"
                            height={0}
                            width={0}
                        />
                        <span>{isExporting ? "Exporting..." : "Export"}</span>
                    </button>
                </div>
            </CardHeader>

            <CardContent>

                <div className="flex justify-between">
                    <div className="flex items-center flex-wrap gap-5">
                        <form>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2 "
                            >
                                <option value="">All Status</option>
                                {statusOptions.map((item: any, index: any) => (
                                    <option key={index} value={item.value}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </form>
                        <div>
                            <input
                                type="text"
                                placeholder="Search URLs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className=" bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2 "
                            />
                        </div>
                        <form>
                            <select
                                value={issueTypeFilter}
                                onChange={(e) => setIssueTypeFilter(e.target.value)}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2 "
                            >
                                <option value="">All Issue</option>
                                {issueTypeOptions.map((item: any, index: any) => (
                                    <option key={index} value={item.value}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </form>
                    </div>
                    <div onClick={handleClearFilters} className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2 cursor-pointer hover:bg-gray-50">
                        <FiRefreshCw className="cursor-pointer h-[14px] w-auto" />
                        <span>Clear</span>
                    </div>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                URL
                            </th>
                            <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                Status
                            </th>
                            <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                Reason
                            </th>
                            <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                First Detected
                            </th>
                            <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                Validated
                            </th>
                            <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                Fix Status
                            </th>
                            <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                Task
                            </th>
                            <th className="text-left py-3 px-4 text-[14px] font-normal text-[#363636]">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentIssues.length > 0 ? (
                            currentIssues.map((row: any, idx: any) => (
                                <tr
                                    key={idx}
                                    className="border-b text-[14px] font-normal text-gray-600"
                                >
                                    <td className="text-blue-600 hover:text-blue-800 py-3 px-4 ">
                                        {row.url}
                                    </td>
                                    <td className="py-3 px-4">{row.coverage_state}</td>
                                    <td className="py-3 px-4">{row.gsc_issue_type}</td>
                                    <td className="py-3 px-4">{row.detected}</td>
                                    <td className="py-3 px-4">{row.validated}</td>
                                    <td className="py-3 px-4">{row.fixStatus}</td>
                                    <td className="py-3 px-4">{row.task}</td>
                                    <td className="flex items-center gap-2 py-3 px-4">
                                        <button className="text-gray-500 hover:text-gray-800">
                                            <FaSearch />
                                        </button>
                                        <button className="text-gray-500 hover:text-gray-800">
                                            <GrNotes />
                                        </button>
                                        <button className="text-gray-500 hover:text-gray-800">
                                            <FaCheckSquare className="text-gray-500" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center py-4 text-gray-500">
                                    No results found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <Pagination
                    currentPage={currentPage}
                    totalItems={coverage_breakdown?.length}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setCurrentPage}
                    onRowsPerPageChange={setRowsPerPage}
                />
            </CardContent>
        </Card>
    );
};

export default CoverageBreakdown;
