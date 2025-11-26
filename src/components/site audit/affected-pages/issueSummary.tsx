import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import exportIcon from "../../assests/Group 1000008949@3x.png"
import Image from 'next/image';
import {
    TrendingUp
} from "lucide-react";
import { GoDotFill } from "react-icons/go";

import { FiCalendar, FiEyeOff } from 'react-icons/fi';
import { IoCloseSharp } from 'react-icons/io5';
import ReactApexChart from 'react-apexcharts';
import Spkapexcharts from '../../spk-packages/apexcharts-component';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BsInfo } from 'react-icons/bs';


interface LineChartClickData {
    activeLabel?: string;
}

interface PieChartClickData {
    name: string;
    value: number;
}

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


const IssueSummary = ({ siteIssues }: any) => {

    const series = [
        {
            name: "Data",
            data: [
                { x: "May 29", y: 20, marker: { fillColor: "#FF4560", shape: "triangle" } },
                { x: "May 30", y: 10 },
                { x: "May 31", y: 35 },
                { x: "Jun 01", y: 25 },
                { x: "Jun 04", y: 0, marker: { fillColor: "#FEB019", shape: "circle" } },
                { x: "Jun 10", y: 0, marker: { fillColor: "#00E396", shape: "circle" } },
                { x: "Jun 14", y: 0, marker: { fillColor: "#FF4560", shape: "triangle" } },
                { x: "Jun 18", y: 0, marker: { fillColor: "#FF4560", shape: "circle" } },
            ],
        },
    ];

    const options = {
        chart: {
            type: "line",
            height: 200,
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        stroke: {
            curve: "straight",
            width: 2,
            colors: ["#3b82f6"], // blue line
        },
        markers: {
            size: 6,
            hover: { size: 7 },
            shape: "circle",
        },
        xaxis: {
            type: "category",
            labels: {
                style: {
                    fontSize: "12px",
                    colors: "#6B7280",
                },
            },
        },
        yaxis: {
            show: true,
            labels: {
                style: {
                    fontSize: "12px",
                    colors: "#6B7280",
                },
            },
        },
        tooltip: {
            shared: false,
            intersect: true,
        },
        grid: {
            borderColor: "#f1f5f9",
            strokeDashArray: 5,
        },
    };

    const trendData = siteIssues
        ?.map((item: any) => ({
            date: item.date,
            seoScore: item?.result?.seo_score || 0,
            critical: item?.result?.issue_counts["🔴 Critical"] || 0,
            warning: item?.result?.issue_counts["🟠 Warning"] || 0,
            info: item?.result?.issue_counts["🔵 Info"] || 0,
            low: item?.result?.issue_counts["🟡 Low"] || 0,
        }))
        ?.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
            // onIssueClick(issueDetail);
        } else if (chartType === "pie" && data && "name" in data) {
            const issueDetail: IssueDetail = {
                title: `${data.name} Issues`,
                severity: data.name,
                summary: `Showing all ${data.name.toLowerCase()} severity issues (${data.value
                    } total)`,
                pagesAffected: [],
                fixInstructions: "",
            };
            // onIssueClick(issueDetail);
        }
    };

    const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-md shadow-lg">
                    <p className="font-medium mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => {
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


    return (
        <Card className="border border-gray-200 mt-4">

            <div className="flex items-center justify-between gap-1 border-b-2 pb-1 px-5">
                <div className="flex text-[18px] font-semibold gap-1 items-center">
                    <h2 className="text-[18px] font-semibold">ISSUE HISTORY</h2>
                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                </div>
                {/* <input type='text' placeholder='Missing H1 Tag' className='w-100 bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2 inline-block' /> */}
                <div className='flex  gap-2 items-center   '>
                    {/* <div className='bg-blue-500 border text-[white] border-[#EFF0F6] rounded-md font-normal w-fit text-[14px]  p-2'>
                        <span className='flex'>Create Task for This Issue</span>
                    </div>
                    <div className='bg-green-500 border text-[white] border-[#EFF0F6] rounded-md font-normal w-fit text-[12px]  p-2'>
                        <span className='flex'>Mark Issue as fixed (All Pages)</span>
                    </div>
                    <div className='bg-gray-50 border text-[#676767] border-[#EFF0F6] rounded-md font-normal w-fit text-[12px]  p-2'>
                        <span className='flex'>See Affected Pages</span>
                    </div> */}
                    <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                        <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                        <span>Export</span>
                    </div>

                </div>
            </div>

            <CardContent className='border-b pb-4'>
                <div className='flex flex-wrap items-center justify-between'>
                    <div className="flex items-center  gap-2 text-[16px] font-semibold">
                        <TrendingUp className='text-blue-500' />
                        <CardTitle className=""> Issue Trend (Last 5 Audits)</CardTitle>
                    </div>
                    {/* <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                        <FiEyeOff />
                        <span>Hide Chart</span>
                    </div> */}
                </div>

                <div className="bg-white p-4 rounded-md shadow w-full">
                    {/* <Spkapexcharts chartOptions={options} chartSeries={series} type="line" height={200} /> */}
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
                    <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-brand-red rounded"></div>
                            <span>Critical</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-brand-warning rounded"></div>
                            <span>Warning</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-brand-blue rounded"></div>
                            <span>Info</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-brand-yellow rounded"></div>
                            <span>Low</span>
                        </div>
                    </div>
                </div>

            </CardContent>
            {/* <CardContent className=' pb-4'>
                <div className="flex items-center  gap-2 text-[16px] font-semibold">
                    <FiCalendar className='text-blue-500' />
                    <CardTitle className=""> Audit History Timeline</CardTitle>
                </div>
                <div className='border mt-4 p-4 rounded-md bg-gray-100 text-[14px] font-medium flex justify-between w-full'>
                    <div className='flex flex-col gap-3'>
                        <span>Jun 14</span>
                        <div className='flex flex-col gap-1'>
                            <span className='font-normal'>Pages:</span>
                            <span>O Pages</span>
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <span className='font-normal'>Validation: <span className='font-medium'>pending</span></span>
                    </div>
                    <div>
                        <div className='text-[#E94134] flex items-center gap-1 p-1 rounded-full border-[#E94134]'>
                            <GoDotFill />
                            <span>Detected</span>
                        </div>
                    </div>
                </div>

                <div className='border mt-4 p-4 rounded-md bg-gray-100 text-[14px] font-medium flex justify-between w-full'>
                    <div className='flex flex-col gap-3'>
                        <span>Jun 10</span>
                        <div className='flex flex-col gap-1'>
                            <span className='font-normal'>Pages:</span>
                            <span>O Pages</span>
                        </div>
                        <div className='flex gap-1 items-center text-[14px] font-normal'>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full text-white bg-blue-500">
                                N
                            </span>
                            <span>Changed by Neha</span>
                        </div>
                    </div>
                    <div className='flex items-center'>

                        <span className='font-normal flex gap-2'>Validation:
                            <div className='flex items-center gap-2'>
                                <Image alt='' src={"/images/valid.png"} className='h-[14px] w-auto' height={0} width={0} />
                                <span className='font-medium text-[#10B981]'>
                                    Passed</span>
                            </div>
                        </span>
                    </div>
                    <div>
                        <div className='text-[#10B981] flex items-center gap-2  p-1 rounded-full border-[#10B981]'>

                            <GoDotFill />
                            <span>Fixed</span>
                        </div>
                    </div>
                </div>

                <div className='border mt-4 p-4 rounded-md bg-gray-100 text-[14px] font-medium flex justify-between w-full'>
                    <div className='flex flex-col gap-3'>
                        <span>Jun 4</span>
                        <div className='flex flex-col gap-1'>
                            <span className='font-normal'>Pages:</span>
                            <span>4 Pages</span>
                        </div>
                        <div className='flex gap-1 items-center text-[14px] font-normal'>
                            <span className="w-6 h-6 flex items-center justify-center rounded-full text-white bg-blue-500">
                                R
                            </span>
                            <span>Changed by Rahul</span>
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <span className='font-normal flex gap-2'>Validation:
                            <div className='flex items-center gap-2'>
                                <IoCloseSharp className='text-[#E94134]' />
                                <span className='font-medium text-[#E94134]'>Failed</span>
                            </div>
                        </span>
                    </div>
                    <div>
                        <div className='text-yellow-900 flex items-center gap-1  p-1 rounded-full border-[#E94134]'>
                            <GoDotFill />
                            <span>Reappeared</span>
                        </div>
                    </div>
                </div>

                <div className='border mt-4 p-4 rounded-md bg-gray-100 text-[14px] font-medium flex justify-between w-full'>
                    <div className='flex flex-col gap-3'>
                        <span>May 29</span>
                        <div className='flex flex-col gap-1'>
                            <span className='font-normal'>Pages:</span>
                            <span>4 Pages</span>
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <span className='font-normal'>Validation: <span className='font-medium '>--</span></span>
                    </div>
                    <div>
                        <div className='text-[#E94134] flex items-center gap-1 p-1 rounded-full border-[#E94134]'>
                            <GoDotFill />
                            <span>Detected</span>
                        </div>
                    </div>
                </div>

            </CardContent> */}
        </Card >
    )
}

export default IssueSummary