import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Modal } from "antd";
import { motion } from "framer-motion";
import Image from 'next/image';
import { BsInfo } from 'react-icons/bs';
import Spkapexcharts from '../spk-packages/apexcharts-component';
import Pagination from '@/src/util/paginationComponent';
const Structured = ({ sitedetails, siteIssues }: any) => {

    const [modalVisible, setModalVisible] = useState(false);
    const [modalPages, setModalPages] = useState([]);
    const [modalTitle, setModalTitle] = useState("");
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    const handleOpenModal = (title: any, pages: any) => {
        setModalTitle(title);
        setModalPages(pages);
        setModalVisible(true);
    };

    const schemaTypesSummary = siteIssues[0].result.schema_issues.schema_types_summary;

    const structuredDataTypes = Object.entries(schemaTypesSummary).map(([type, data]: any) => ({
        title: type,
        icon: "📦",
        richResultEligible: data.total_items || 0,
        pagesWithSchema: data.pages_with_schema || 0,
        pages: data.pages || [],
        notEligible: data?.errors?.count || 0
    }));

    const schemaValidationIssues: any[] = [];

    Object.entries(schemaTypesSummary).forEach(([schemaType, data]: any) => {
        if (Array.isArray(data?.errors) && data.errors.length > 0) {
            data.errors.forEach((err: any, index: number) => {
                schemaValidationIssues.push({
                    id: `${schemaType}-${index}`,
                    pageUrl: err.page_url,
                    schemaType: schemaType,
                    issueType: err.message,
                    severity: err.severity === "error" ? "Error" : "Warning",
                    richResult: "Not Eligible"
                });
            });
        }
    });

    const filteredIssues = schemaValidationIssues.filter(issue =>
        issue.pageUrl?.toLowerCase().includes(searchTerm.toLowerCase()) || issue.issueType?.toLowerCase().includes(searchTerm.toLowerCase())
    );



    const structuredDataStats = useMemo(() => {
        const links = sitedetails?.result?.links || [];

        let validCount = 0;
        let warningsCount = 0;
        let errorsCount = 0;
        let missingCount = 0;

        links.forEach((link: any) => {
            const analysis = link?.schema_analysis;

            if (analysis?.has_schema === true) {
                const hasErrors = Array.isArray(analysis.errors) && analysis.errors.length > 0;
                const hasWarnings = Array.isArray(analysis.warnings) && analysis.warnings.length > 0;

                if (!hasErrors && !hasWarnings) validCount++;
                if (hasWarnings) warningsCount++;
                if (hasErrors) errorsCount++;
            } else if (analysis?.has_schema === false) {
                missingCount++;
            }
        });

        return [
            {
                label: "Valid Structured Data",
                value: validCount,
                color: "text-green-600",
            },
            {
                label: "Structured Data with Warnings",
                value: warningsCount,
                color: "text-yellow-600",
            },
            {
                label: "Structured Data Errors",
                value: errorsCount,
                color: "text-red-600",
            },
            {
                label: "Missing Structured Data",
                value: missingCount,
                color: "text-gray-600",
            },
            {
                label: "Eligible for Rich Results",
                value: validCount,
                color: "text-blue-600",
            },
        ];
    }, [sitedetails]);

    const richResultEligibilityData = useMemo(() => {
        const links = sitedetails?.result?.links || [];

        let eligible = 0;
        let warnings = 0;
        let errors = 0;
        let missing = 0;

        links.forEach((link: any) => {
            const schema = link?.schema_analysis;

            if (schema?.has_schema === true) {
                const hasWarnings = Array.isArray(schema.warnings) && schema.warnings.length > 0;
                const hasErrors = Array.isArray(schema.errors) && schema.errors.length > 0;

                if (!hasErrors && !hasWarnings) eligible++;
                if (hasWarnings) warnings++;
                if (hasErrors) errors++;
            } else if (schema?.has_schema === false) {
                missing++;
            }
        });

        const total = eligible + warnings + errors + missing;

        return [
            {
                name: "Eligible",
                value: eligible,
                color: "#16a34a", // green
                percentage: total ? ((eligible / total) * 100).toFixed(0) : "0",
            },
            {
                name: "Warnings Present",
                value: warnings,
                color: "#eab308", // yellow
                percentage: total ? ((warnings / total) * 100).toFixed(0) : "0",
            },
            {
                name: "Schema Errors",
                value: errors,
                color: "#dc2626", // red
                percentage: total ? ((errors / total) * 100).toFixed(0) : "0",
            },
            {
                name: "No Structured Data",
                value: missing,
                color: "#9ca3af", // gray
                percentage: total ? ((missing / total) * 100).toFixed(0) : "0",
            },
        ].filter((d) => d.value > 0);
    }, [sitedetails]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const { name, value, payload: data } = payload[0];
            return (
                <div className="bg-white rounded-md shadow-md px-3 py-2 border border-gray-200 text-sm !z-[10]">
                    <p className="text-gray-800 font-semibold">{name}</p>
                    <p className="text-gray-500">
                        {value} pages ({data.percentage}%)
                    </p>
                </div>
            );
        }

        return null;
    };

    const Areaseries = richResultEligibilityData.map(item => item.value);

    const Areaoptions = {
        chart: {
            type: "polarArea",
            height: 300,
            events: {
                mounted: (chart: { windowResizeHandler: () => void; }) => {
                    chart.windowResizeHandler();
                }
            },
        },
        labels: richResultEligibilityData.map(item => item.name), // ✅ show names
        stroke: {
            colors: ["#fff"]
        },
        fill: {
            opacity: 0.8
        },
        legend: {
            position: "bottom"
        },
        colors: richResultEligibilityData.map(item => item.color), // ✅ dynamic colors
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 200
                },
                legend: {
                    position: "bottom"
                }
            }
        }]
    };

    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    const paginatedData = filteredIssues.slice(startIndex, endIndex)



    return (
        <>
            <div className='flex flex-col gap-4'>
                <div className="bg-white border rounded-md p-6  mx-auto shadow-sm w-full">
                    <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">Structured Data Summary</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>
                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                    <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 ">
                        {structuredDataStats.map((card: any, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-[#000000] text-[14px] font-medium">{card.label}</span>
                                        <BsInfo size={18} color="#9E9E9E" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-[24px] text-[#0077FF]">{card.value}</span>
                                            <span className="font-semibold text-[24px] text-[#0077FF]">Pages</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div >
                </div>
                <div className="grid grid-cols-4 gap-6 mb-6">
                    {/* Rich Result Eligibility */}
                    <Card className="border border-gray-200 3xl:col-span-1 2xl:col-span-1 xl:col-span-1 lg:col-span-2 md:col-span-3 sm:col-span-4 rounded-md shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                                <div className="flex text-[18px] font-semibold gap-1 items-center">
                                    <h2 className="text-[18px] font-semibold">Rich Result Eligibility</h2>
                                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                                </div>
                                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                    <span>Export</span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            <div className="flex flex-col items-center">
                                {/* Pie Chart */}
                                <div className="relative w-[200px] h-[200px]">
                                    <div id="polararea-basic">
                                        <Spkapexcharts chartOptions={Areaoptions} chartSeries={Areaseries} type="polarArea" width={"100%"} height={320} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                    </Card>


                    {/* Structured Data Type Coverage */}
                    <Card className="border border-gray-200 2xl:col-span-3 xl:col-span-3 lg:col-span-4 md:col-span-4 sm:col-span-4">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                                <div className="flex text-[18px] font-semibold gap-1 items-center">
                                    <h2 className="text-[18px] font-semibold">Structured Data Type Coverage</h2>
                                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                                </div>
                                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                    <span>Export</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="relative max-h-96 overflow-hidden overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4 ">
                                    {structuredDataTypes.map((type, index) => {
                                        const progress = type.richResultEligible + type.notEligible === 0
                                            ? 0
                                            : (type.richResultEligible / (type.richResultEligible + type.notEligible)) * 100;

                                        return (
                                            <motion.div
                                                key={index}
                                                className="border border-gray-200 rounded-md p-4 shadow-sm"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                            >
                                                <div className='flex flex-col gap-3'>
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        {/* <span className="text-2xl">{type.icon}</span> */}
                                                        <div>
                                                            <h4 className="font-medium text-[16px]">{type.title}</h4>
                                                            <p
                                                                className="text-xs text-blue-500 underline cursor-pointer"
                                                                onClick={() => handleOpenModal(type.title, type.pages)}
                                                            >
                                                                {type.pagesWithSchema} pages with schema
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-600">Rich Result Eligible</span>
                                                            <span className="font-medium text-blue-600">
                                                                {type.richResultEligible}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-600">Not Eligible</span>
                                                            <span className="font-medium text-red-600">
                                                                {type.notEligible}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full"
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div></div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border border-gray-200">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                            <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                                Schema Validation Issues
                                <BsInfo className="text-xl" color="#9E9E9E" />
                            </CardTitle>
                            <div className='flex gap-3'>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Search Issues..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] px-2'>
                                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                    <span>Export</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-[14px] font-medium text-gray-600 text-sm">PAGE URL</th>
                                        <th className="text-left py-3 px-4 text-[14px] font-medium text-gray-600 text-sm">SCHEMA TYPE</th>
                                        <th className="text-left py-3 px-4 text-[14px] font-medium text-gray-600 text-sm">ISSUE TYPE</th>
                                        <th className="text-left py-3 px-4 text-[14px] font-medium text-gray-600 text-sm">SEVERITY</th>
                                        <th className="text-left py-3 px-4 text-[14px] font-medium text-gray-600 text-sm">RICH RESULT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData?.length
                                        > 0 ? paginatedData.map((issue: any, index: number) => (
                                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-blue-600 text-sm font-mono break-all">{issue.pageUrl}</td>
                                                <td className="py-3 px-4 text-sm">{issue.schemaType}</td>
                                                <td className="py-3 px-4 text-sm">{issue.issueType}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${issue.severity === "Error" ? "bg-red-100 text-brand-red" : "bg-yellow-100 text-brand-red"
                                                        }`}>
                                                        {issue.severity}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-sm font-medium ${issue.richResult === "Eligible" ? "text-brand-green" : "text-brand-red"
                                                        }`}>
                                                        {issue.richResult}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) :
                                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                                            <td colSpan={5} className="text-center py-4 text-gray-500">
                                                Data Not Found 🎉
                                            </td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredIssues?.length}
                            rowsPerPage={rowsPerPage}
                            onPageChange={setCurrentPage}
                            onRowsPerPageChange={setRowsPerPage}
                        />
                        {/* <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-500">
                                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}–
                                {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={goToPrev} disabled={currentPage === 1}>
                                    Previous
                                </Button>
                                <span className="text-sm text-gray-700">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button variant="outline" size="sm" onClick={goToNext} disabled={currentPage === totalPages}>
                                    Next
                                </Button>
                            </div>
                        </div> */}
                    </CardContent>

                </Card>
            </div>
            <Modal
                title={`Pages with "${modalTitle}" schema`}
                open={modalVisible}
                footer={null}
                onCancel={() => setModalVisible(false)}
                width={600}
                centered
            >
                <motion.ul
                    className="space-y-2 max-h-[300px] overflow-y-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {modalPages.map((url, idx) => (
                        <li
                            key={idx}
                            className="text-sm text-blue-700 underline hover:text-blue-500 transition"
                        >
                            <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </li>
                    ))}
                </motion.ul>
            </Modal>
        </>
    )
}

export default Structured