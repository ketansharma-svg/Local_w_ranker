import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Image from 'next/image'
import React, { useState } from 'react'
import { BsInfo } from 'react-icons/bs'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Pagination } from "antd";


const PAGE_SIZE = 10; // number of rows per page

const LinkMap = ({ siteDetailPageData, affectedDetailsPageData }: any) => {

    const normalizeUrl = (str: string) => str.replace(/\/+$/, ""); // remove trailing slash

    const url = affectedDetailsPageData.url;
    const matchedItem = siteDetailPageData.find((item: any) =>
        normalizeUrl(item.url) === normalizeUrl(url)
    );

    const internal_links = matchedItem ? matchedItem.internal_links : [];
    const broken_links = matchedItem ? matchedItem.broken_links : [];
    const external_links = matchedItem ? matchedItem.external_links : [];

    const severityData = [
        {
            name: "Exact Match",
            value: 50,
            color: "#4286F5",
        },
        {
            name: "Branded",
            value: 50,
            color: "#F97316",
        },
        {
            name: "Naked URLs",
            value: 40,
            color: "#EE3EA5",
        },
        {
            name: "Partial Match",
            value: 30,
            color: "#10B981",
        },
        {
            name: "Generic",
            value: 20,
            color: "#A76AFC",
        },
        {
            name: "Image",
            value: 10,
            color: "#A76AFC",
        },
    ]

    const totalIssues = severityData.reduce((acc, item) => acc + item.value, 0);

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

    const anchorUsageTable = [
        {
            "id": 1,
            "anchorText": "SEO Audit Tool",
            "anchorType": "EXACT",
            "usageCount": 5,
            "sourcePages": 3,
            "flag": "error",
            "actions": ["view", "edit", "delete"]
        },
        {
            "id": 2,
            "anchorText": "Wranker Tools",
            "anchorType": "BRANDED",
            "usageCount": 6,
            "sourcePages": 5,
            "flag": null,
            "actions": ["view"]
        },
        {
            "id": 3,
            "anchorText": "click here",
            "anchorType": "GENERIC",
            "usageCount": 4,
            "sourcePages": 4,
            "flag": "warning",
            "actions": ["view", "edit", "delete"]
        },
        {
            "id": 4,
            "anchorText": "best SEO tool",
            "anchorType": "PARTIAL",
            "usageCount": 3,
            "sourcePages": 3,
            "flag": null,
            "actions": ["view"]
        },
        {
            "id": 5,
            "anchorText": "https://wranker.com/audit",
            "anchorType": "NAKED URL",
            "usageCount": 2,
            "sourcePages": 2,
            "flag": null,
            "actions": ["view"]
        },
        {
            "id": 6,
            "anchorText": "SEO analysis screenshot",
            "anchorType": "IMAGE",
            "usageCount": 1,
            "sourcePages": 1,
            "flag": null,
            "actions": ["view"]
        },
        {
            "id": 7,
            "anchorText": "comprehensive SEO audit",
            "anchorType": "PARTIAL",
            "usageCount": 2,
            "sourcePages": 2,
            "flag": null,
            "actions": ["view"]
        },
        {
            "id": 8,
            "anchorText": "read more",
            "anchorType": "GENERIC",
            "usageCount": 1,
            "sourcePages": 1,
            "flag": "warning",
            "actions": ["view", "edit"]
        }
    ]

    const [selectedType, setSelectedType] = useState<"Total" | "Internal" | "Broken" | "External">("Total");
    const [currentPage, setCurrentPage] = useState(1);

    const getData = () => {
        switch (selectedType) {
            case "Total":
                return [...internal_links, ...broken_links, ...external_links];
            case "Internal":
                return internal_links;
            case "Broken":
                return broken_links;
            case "External":
                return external_links;
            default:
                return [];
        }
    };

    const data = getData();
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const currentData = data.slice(startIndex, endIndex);



    return (
        <>
            <Card className="border border-gray-200 mt-4">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">Internal Link Summary</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>
                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent >
                    {/* <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">Images with Missing Alt Text</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="font-semibold text-[24px] text-[#0077FF]">12</span>
                                    </div>
                                    <span className="font-normal text-[12px] text-[#363636]">⚠️ Needs Attention</span>
                                </div>
                            </div>
                        </div> */}
                    <div className="flex ">
                        {/* Total Links */}
                        <div
                            className={`flex flex-col gap-2 border-r-2 px-4  cursor-pointer  py-1
      ${selectedType === "Total" ? "bg-gray-100" : "hover:bg-gray-50"}`}
                            onClick={() => { setSelectedType("Total"); setCurrentPage(1); }}
                        >
                            <span className="text-[#000000] text-[14px] font-medium">Total Links</span>
                            <span className="font-semibold text-[24px] text-[#0077FF]">
                                {internal_links.length + external_links.length + broken_links.length}
                            </span>
                        </div>

                        {/* Internal Links */}
                        <div
                            className={`flex flex-col gap-2 border-r-2 px-4  cursor-pointer  py-1
      ${selectedType === "Internal" ? "bg-gray-100" : "hover:bg-gray-50"}`}
                            onClick={() => { setSelectedType("Internal"); setCurrentPage(1); }}
                        >
                            <span className="text-[#000000] text-[14px] font-medium">Good In-Links</span>
                            <span className="font-semibold text-[24px] text-[#0077FF]">{internal_links.length}</span>
                        </div>

                        {/* Broken Links */}
                        <div
                            className={`flex flex-col gap-2 border-r-2 px-4  cursor-pointer  py-1
      ${selectedType === "Broken" ? "bg-gray-100" : "hover:bg-gray-50"}`}
                            onClick={() => { setSelectedType("Broken"); setCurrentPage(1); }}
                        >
                            <span className="text-[#000000] text-[14px] font-medium">Broken In-Links</span>
                            <span className="font-semibold text-[24px] text-[#0077FF]">{broken_links.length}</span>
                        </div>

                        {/* External Links */}
                        <div
                            className={`flex flex-col gap-2 border-r-2 px-4  cursor-pointer  py-1
      ${selectedType === "External" ? "bg-gray-100" : "hover:bg-gray-50"}`}
                            onClick={() => { setSelectedType("External"); setCurrentPage(1); }}
                        >
                            <span className="text-[#000000] text-[14px] font-medium">External In-Links</span>
                            <span className="font-semibold text-[24px] text-[#0077FF]">{external_links.length}</span>
                        </div>

                        <div className="flex flex-col gap-2 border-r-2 px-4 "> <span className="text-[#000000] text-[14px] font-medium">Unique Anchor Variants</span> <span className="font-semibold text-[24px] text-[#0077FF]">N/A</span> </div>
                        {/* <div className="flex flex-col gap-2 border-r-2 px-4 "> <span className="text-[#000000] text-[14px] font-medium">Anchor Quality Score</span> <span className="font-semibold text-[24px] text-[#0077FF]">N/A</span> </div> */}
                        <div className="flex flex-col gap-2 border-r-2 px-4 "> <span className="text-[#000000] text-[14px] font-medium">Link Placement Health</span> <span className="font-semibold text-[24px] text-[#0077FF]">N/A</span> </div>
                    </div>


                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border border-gray-200 mt-4">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">{selectedType} Links</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Search Source"
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10 w-full">
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">SOURCE PAGE URL</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ANCHOR TEXT</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">STATUS</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">PLACEMENT ZONE</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">LR SCORE</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">CONTEXT MATCH</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 w-full">
                            {currentData.map((page: any, index: any) => (
                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                                    <td className="px-4 py-3 align-middle max-w-sm whitespace-pre-wrap break-words">{page?.url}</td>
                                    <td className="px-4 py-3 align-middle">{page?.text}</td>
                                    <td className="px-4 py-3 align-middle">{page?.status_code}</td>
                                    <td className="px-4 py-3 align-middle">-</td>
                                    <td className="px-4 py-3 align-middle">-</td>
                                    <td className="px-4 py-3 align-middle flex items-center gap-1">
                                        View <BsInfo className="text-[20px] cursor-pointer" color="#9E9E9E" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>

                <div className="flex justify-end mt-4 w-full">
                    <Pagination
                        current={currentPage}
                        pageSize={PAGE_SIZE}
                        total={data.length}
                        onChange={(page) => setCurrentPage(page)}
                        showSizeChanger={false}
                    />
                </div>
            </Card>

            <Card className="border border-gray-200 mt-4">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">Anchor Type Distribution</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>

                        <div>
                            <input
                                type="text"
                                placeholder="Search Source"
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5"
                            />
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


            <Card className="border border-gray-200 mt-4">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">Anchor Usage Table</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>

                        <div>
                            <input
                                type="text"
                                placeholder="Search Source"
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent >
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700 tracking-wide">ANCHOR TEXT</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700 tracking-wide">ANCHOR TYPE</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700 tracking-wide">USEAGE COUNT</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700 tracking-wide">SOURCE PAGE</th>
                                <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700 tracking-wide">FLAG</th>
                                {/* <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700 tracking-wide">ACTIONS</th> */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {anchorUsageTable.map((page: any, index: any) => (
                                <tr
                                    key={index}
                                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                >
                                    <td className='px-4 py-3 align-middle'>{page.anchorText}</td>
                                    <td className='px-4 py-3 align-middle'>{page.anchorType}</td>
                                    <td className='px-4 py-3 align-middle'>{page.usageCount}</td>
                                    <td className='px-4 py-3 align-middle'>{page.sourcePages}</td>
                                    <td className='px-4 py-3 align-middle'>{page.flag}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">Link Placement Heatmap</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>

                        <div>
                            <input
                                type="text"
                                placeholder="Search Source"
                                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2.5"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center mb-6">
                                    <div className="w-4 h-4 bg-gray-800 rounded-sm mr-3" />
                                    <h2 className="text-lg font-medium text-gray-900">Heatmap Grid - Visual Layout</h2>
                                </div>
                                <div className="space-y-1">
                                    <div className="bg-blue-500 text-white rounded-t-lg p-6 text-center">
                                        <div className="text-3xl font-bold mb-1">5</div>
                                        <div className="text-sm">Header Links</div>
                                    </div>
                                    <div className="flex">
                                        <div className="bg-green-500 text-white p-8 flex-1 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-4xl font-bold mb-2">18</div>
                                                <div className="text-base">Main Body Links</div>
                                            </div>
                                        </div>
                                        <div className="bg-orange-500 text-white p-8 w-80 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-4xl font-bold mb-2">3</div>
                                                <div className="text-base">Sidebar Links</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-purple-600 text-white rounded-b-lg p-6 text-center">
                                        <div className="text-3xl font-bold mb-1">5</div>
                                        <div className="text-sm">Footer Links</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center mb-6">
                                    <div className="w-4 h-4 bg-green-600 rounded-sm mr-3" />
                                    <h2 className="text-lg font-medium text-gray-900">Link Distribution Stats</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-500 pb-2 border-b">
                                        <div>Zone</div>
                                        <div className="text-right">Links</div>
                                        <div className="text-right">%</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <div className="text-gray-900">Header</div>
                                        <div className="text-right text-gray-900 font-medium">5</div>
                                        <div className="text-right">
                                            <span className="text-gray-900 font-medium">16%</span>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '16%' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <div className="text-gray-900">Body</div>
                                        <div className="text-right text-gray-900 font-medium">18</div>
                                        <div className="text-right">
                                            <span className="text-gray-900 font-medium">58%</span>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '58%' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <div className="text-gray-900">Sidebar</div>
                                        <div className="text-right text-gray-900 font-medium">3</div>
                                        <div className="text-right">
                                            <span className="text-gray-900 font-medium">10%</span>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '10%' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <div className="text-gray-900">Footer</div>
                                        <div className="text-right text-gray-900 font-medium">5</div>
                                        <div className="text-right">
                                            <span className="text-gray-900 font-medium">16%</span>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '16%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">AI Suggestions</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>

                        <div>
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center">
                                <i className="fas fa-eye-slash mr-2" />
                                Hide Suggestions
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                    <i className="fas fa-magic text-purple-600 text-sm" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Replace Anchor</h3>
                            </div>
                            <span className="text-sm text-gray-500">Score 9%</span>
                        </div>
                        <div className="mb-4">
                            <div className="text-sm text-gray-600 mb-2">CURRENT</div>
                            <div className="text-gray-900">"Learn more"</div>
                        </div>
                        <div className="mb-6">
                            <div className="text-sm text-gray-600 mb-2">SUGGESTED</div>
                            <div className="text-gray-900">"Explore our SEO content planner"</div>
                        </div>
                        <div className="mb-6">
                            <div className="text-sm text-gray-600 mb-2">PLACEMENT</div>
                            <div className="text-gray-900">Paragraph 5</div>
                        </div>
                        <div className="flex items-center text-sm text-brand-green mb-6">
                            <i className="fas fa-arrow-up mr-2" />
                            <span>Boosts keyword clarity + CTR</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-lg font-medium flex-1 mr-3">
                                Create Task
                            </button>
                            <button className="text-gray-500 hover:text-gray-700 px-4 py-2">
                                Why?
                            </button>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                    <i className="fas fa-magic text-purple-600 text-sm" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Add Internal Link</h3>
                            </div>
                            <span className="text-sm text-gray-500">Score 7%</span>
                        </div>
                        <div className="mb-4">
                            <div className="text-sm text-gray-600 mb-2">CURRENT</div>
                            <div className="text-gray-900">"Missing link opportunity"</div>
                        </div>
                        <div className="mb-6">
                            <div className="text-sm text-gray-600 mb-2">SUGGESTED</div>
                            <div className="text-gray-900">"Link 'keyword research' to /tools/keyword-planner"</div>
                        </div>
                        <div className="mb-6">
                            <div className="text-sm text-gray-600 mb-2">PLACEMENT</div>
                            <div className="text-gray-900">H3: Research Tools</div>
                        </div>
                        <div className="flex items-center text-sm text-brand-green mb-6">
                            <i className="fas fa-arrow-up mr-2" />
                            <span>Improves crawl flow</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-lg font-medium flex-1 mr-3">
                                Create Task
                            </button>
                            <button className="text-gray-500 hover:text-gray-700 px-4 py-2">
                                Why?
                            </button>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                    <i className="fas fa-magic text-purple-600 text-sm" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">Fix Overused Anchor</h3>
                            </div>
                            <span className="text-sm text-gray-500">Score 7%</span>
                        </div>
                        <div className="mb-4">
                            <div className="text-sm text-gray-600 mb-2">CURRENT</div>
                            <div className="text-gray-900">"SEO Audit used &gt; linear"</div>
                        </div>
                        <div className="mb-6">
                            <div className="text-sm text-gray-600 mb-2">SUGGESTED</div>
                            <div className="text-gray-900">"Vary with 'SEO analysis', 'site audit'"</div>
                        </div>
                        <div className="mb-6">
                            <div className="text-sm text-gray-600 mb-2">PLACEMENT</div>
                            <div className="text-gray-900">Multiple locations</div>
                        </div>
                        <div className="flex items-center text-sm text-brand-green mb-6">
                            <i className="fas fa-arrow-up mr-2" />
                            <span>Reduces anchor spam risk</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-lg font-medium flex-1 mr-3">
                                Create Task
                            </button>
                            <button className="text-gray-500 hover:text-gray-700 px-4 py-2">
                                Why?
                            </button>
                        </div>
                    </div>
                </div>

            </Card> */}
        </>
    )
}

export default LinkMap