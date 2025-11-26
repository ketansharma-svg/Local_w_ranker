import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateYear } from '@/src/util/helper';
import Pagination from '@/src/util/paginationComponent';
import Image from 'next/image';
import React, { useState } from 'react'
import { BsInfo } from 'react-icons/bs';
import { FiRefreshCw } from 'react-icons/fi';

const CrawledURLS = ({ siteIssues, sitedetails, linksData }: any) => {
    const [statusFilter, setStatusFilter] = useState("all");
    const [depthFilter, setDepthFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    const filteredLinks = sitedetails?.result?.links.filter((status: any) => {
        const outboundLinksLength = linksData?.pages?.find(
            (page: any) => `${page.url}/` === status.url
        );

        const pageDepth = outboundLinksLength?.depth;
        const statusCode = status?.redirect_chain?.length > 0 && status?.redirect_chain[0]?.status_code;
        const urlPath = new URL(status.url).pathname.toLowerCase();

        const matchesStatus =
            statusFilter === "all" || String(statusCode) === statusFilter;

        const matchesDepth =
            depthFilter === "all" || Number(pageDepth) === Number(depthFilter);

        const matchesSearch = urlPath.includes(searchTerm.toLowerCase());

        return matchesStatus && matchesDepth && matchesSearch;
    });

    const statusOptions = Array.from(
        new Set(
            (sitedetails?.result?.links || [])
                .map((status: any) => status?.redirect_chain?.length > 0 && status?.redirect_chain[0]?.status_code)
                .filter(Boolean) // remove undefined/null
        )
    );

    const depthOptions = Array.from(
        new Set(
            (sitedetails?.result?.links || [])
                .map((status: any) => {
                    const outboundLinksLength = linksData?.pages?.find(
                        (page: any) => `${page.url}/` === status.url
                    );
                    return outboundLinksLength?.depth;
                })
                .filter((depth: any) => depth !== undefined && depth !== null)
        )
    );



    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const paginatedData = filteredLinks.slice(startIndex, endIndex)

    const handleClearFilters = () => {
        setStatusFilter("all")
        setDepthFilter("all")
        setSearchTerm("")
    }

    return (
        <Card className="border border-gray-200 mt-4">
            <CardHeader>
                <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                    <div className="flex text-[18px] font-semibold gap-1 items-center">
                        <h2 className="text-[18px] font-semibold">Crawl URLs List</h2>
                        <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                    </div>
                    <div className="flex items-center flex-wrap gap-5">

                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className='mt-0'>
                <div className='flex justify-between pb-2'>
                    <div className='flex items-center flex-wrap gap-5'>
                        <form>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            >
                                <option value={""}>All Status</option>
                                {statusOptions.map((statusCode: any) => (
                                    <option key={statusCode} value={statusCode}>
                                        {statusCode}
                                    </option>
                                ))}
                            </select>
                        </form>

                        <form>
                            <select
                                value={depthFilter}
                                onChange={(e) => setDepthFilter(e.target.value)}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            >
                                <option value={""}>All Depth</option>
                                {depthOptions.map((depth: any) => (
                                    <option key={depth} value={depth}>
                                        {depth}
                                    </option>
                                ))}
                            </select>
                        </form>


                        <div>
                            <input
                                type="text"
                                placeholder="Search URLs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2"
                            />
                        </div>


                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <span>Column</span>
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
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                    Page URL
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                    Status Code
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                    Crawl Depth
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                    Response Time
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                    Last Crawled
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                    Outlinks
                                </th>
                                {/* <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                                    Issue
                                </th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData?.length > 0 ? paginatedData.map((status: any, index: any) => {
                                const outboundLinksLength = linksData?.pages
                                    ?.find((page: any) => `${page.url}/` === status.url)
                                const lastCrawled = sitedetails?.result?.analysis_completed_at

                                return (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-100 hover:bg-gray-50"
                                    >
                                        <td className="text-blue-600 hover:text-blue-800  py-3 px-4 text-[14px] font-medium">
                                            <span className="text-sm font-medium">
                                                {new URL(status.url).pathname}
                                            </span>
                                        </td>
                                        <td className={`py-3 px-4 text-[14px] font-medium`}>
                                            <div className="flex items-center space-x-2">
                                                <span className={`w-2 h-2 rounded-full ${status?.redirect_chain?.length > 0 && status?.redirect_chain[0]?.status_code === 200
                                                    ? "bg-brand-green"
                                                    : "bg-brand-yellow"
                                                    }`}>
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {status?.redirect_chain?.length > 0 && status?.redirect_chain[0]?.status_code}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-[14px]  font-medium">
                                            {outboundLinksLength?.depth}
                                        </td>
                                        <td className="py-3 px-4 text-[14px] font-medium">
                                            {status?.initial_response_time_ms?.toFixed(2)} ms
                                        </td>
                                        <td className="py-3 px-4 text-[14px] font-medium">
                                            {formatDateYear(lastCrawled)}
                                        </td>
                                        <td className="py-3 px-4 text-[14px] font-medium">
                                            {outboundLinksLength?.outbound_links?.length}
                                        </td>
                                        {/* <td className="py-3 px-4 text-[14px] font-medium">
                                            {status.issues}
                                        </td> */}
                                        {/* <td className="py-3 px-4">
                                            <span
                                                className={`text-sm font-medium flex items-center space-x-1 ${status.changeType === "increase"
                                                    ? "text-red-600"
                                                    : status.changeType === "decrease"
                                                        ? "text-green-600"
                                                        : "text-gray-600"
                                                    }`}
                                            >
                                                {status.changeType === "increase" && (
                                                    <span>▲</span>
                                                )}
                                                {status.changeType === "decrease" && (
                                                    <span>▼</span>
                                                )}
                                                <span>{status.change}</span>
                                            </span>
                                        </td> */}
                                    </tr>
                                )
                            }) :
                                <tr>
                                    <td colSpan={11} className="text-center py-4 text-gray-500">
                                        Data Not Found 🎉
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredLinks?.length}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setCurrentPage}
                        onRowsPerPageChange={setRowsPerPage}
                    />
                </div>
            </CardContent>
        </Card>
    )
}

export default CrawledURLS