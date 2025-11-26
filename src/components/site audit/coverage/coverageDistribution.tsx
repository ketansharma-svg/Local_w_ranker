'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaRedo } from 'react-icons/fa';
import { MdInfoOutline } from 'react-icons/md';
import { BsExclamationCircle } from 'react-icons/bs';
import exportIconGray from "../../assests/WRanker - Export Icon grey.png"
import exportIconWhite from "../../assests/WRanker - Export Icon White brand color.png"
import { useState } from 'react';
import Image from 'next/image';
import Spkapexcharts from '../../spk-packages/apexcharts-component';
import { Areastackoptions,  getAreastackSeries } from '@/src/util/helper';
import { IoClose, IoWarningOutline } from 'react-icons/io5';
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";


const CoverageDistribution = ({ summary, createdAtDate }: any) => {


    const [indexCoverageType, setIndexCoverageType] = useState("donut")

    const severityData = [
        { name: "Indexed", value: summary?.indexed_urls },
        { name: "Excluded", value: summary?.excluded_urls },
        { name: "Error", value: summary?.errors_indexing },
        { name: "Warning", value: summary?.valid_with_warnings },
    ];

    const COLORS = ['#10B981', '#F9BB04', '#E94134', "#F97316"];

    const getPercentage = (value: number) => {
        if (!totalIssues) return "0%";
        return ((value / totalIssues) * 100).toFixed(1) + "%";
    };

    // ✅ Optional Custom Tooltip
    const CustomPieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white text-sm shadow-md border p-2 rounded">
                    <p className="font-medium">{payload[0].name}</p>
                    <p>Value: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    const totalIssues = severityData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="border border-gray-200 mt-6">
            <CardHeader>
                <div className="flex justify-between items-center border-b pb-3">
                    <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                        Index Coverage Distribution
                        <MdInfoOutline className="text-gray-500 text-lg" />
                    </CardTitle>

                    <div className="flex gap-3">
                        <div className=' border rounded  flex '>
                            <button
                                onClick={() => setIndexCoverageType("donut")}
                                className={`text-[14px] font-normal cursor-pointer ${indexCoverageType === "donut" ? " bg-[#D9EEF8]  text-[#008ccd]" : "text-gray-400 "} p-2 rounded `}>
                                Donut View
                            </button>
                            <button
                                onClick={() => setIndexCoverageType("area")}
                                className={`text-[14px] font-normal cursor-pointer ${indexCoverageType === "area" ? "bg-[#D9EEF8] text-[#008ccd]" : "text-gray-400 "} p-2 border-r rounded `}>
                                Area View
                            </button>
                        </div>
                        {/* <form>
                            <select id="countries" className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] w-full p-2 ">
                                <option value="US">Last 7 days</option>
                                <option value="CA">Canada</option>
                                <option value="FR">France</option>
                                <option value="DE">Germany</option>
                            </select>
                        </form> */}
                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="box-body">
                    <div id="area-stacked" className='flex flex-col gap-4'>
                        {indexCoverageType === "area" &&
                            <Spkapexcharts chartOptions={Areastackoptions} chartSeries={getAreastackSeries(summary, createdAtDate)} type="area" width={"100%"} height={350} />
                        }
                        {indexCoverageType === "donut" &&
                            <div className="w-full h-full relative">
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={severityData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={150}
                                            innerRadius={100}
                                            dataKey="value"
                                            labelLine={false}
                                            style={{ cursor: "pointer" }}
                                        >
                                            {severityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
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
                        }
                        <div className='flex justify-between flex-wrap px-8'>
                            <div className='flex items-center gap-2'>
                                <div className="w-3 h-3 bg-brand-green rounded-full transform -translate-x-1.5" />
                                <span className='font-medium text-[14px]'>Indexed</span>
                                <span className='font-normal text-[14px]'>({summary?.indexed_urls} pages - {getPercentage(summary?.indexed_urls)})</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <div className="w-3 h-3 bg-brand-yellow rounded-full transform -translate-x-1.5" />
                                <span className='font-medium text-[14px]'>Excluded</span>
                                <span className='font-normal text-[14px]'>({summary?.excluded_urls} pages - {getPercentage(summary?.excluded_urls)})</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <div className="w-3 h-3 bg-brand-red rounded-full transform -translate-x-1.5" />
                                <span className='font-medium text-[14px]'>Error</span>
                                <span className='font-normal text-[14px]'>({summary?.errors_indexing} pages - {getPercentage(summary?.errors_indexing)})</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <div className="w-3 h-3 bg-brand-warning rounded-full transform -translate-x-1.5" />
                                <span className='font-medium text-[14px]'>Warning</span>
                                <span className='font-normal text-[14px]'>({summary?.valid_with_warnings} pages - {getPercentage(summary?.valid_with_warnings)} )</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default CoverageDistribution