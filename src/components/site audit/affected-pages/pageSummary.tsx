

import { Employoptions, Employseries } from '@/src/util/helper'
import Image from 'next/image'
import { BsInfo } from 'react-icons/bs'
import { Cell, Pie, PieChart, Tooltip } from "recharts"
import SpkHrmcards from "../../reusable-widgets/spk-hrmcards"



const PageSummary = ({ siteIssues, sitedetails }: any) => {

const validLinks = sitedetails?.result?.links?.filter((item: any) => !item.error) || [];

const totalScore = validLinks.reduce((sum: number, item: any) => sum + item.page_score, 0);

const avgScore = validLinks.length > 0 ? totalScore / validLinks.length : 0;



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


    const Hrmcard = {
        id: 2,
        title: "Total Job Applied",
        value: "15,784",
        percentage: "1.5%",
        direction: "down",
        description: "Decreased from last year",
        chartOptions: Employoptions({ color: "#008ccd", gradientcolor: "rgba(0, 140, 205, 0.2)" }),
        chartSeries: Employseries,
        color: 'danger'

    }

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

    return (
        <div className="bg-white border rounded-md p-6  mx-auto shadow-sm w-full">
            <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
                <div className="flex text-[18px] font-semibold gap-1 items-center">
                    <h2 className="text-[18px] font-semibold">Affected Pages Summary</h2>
                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                </div>
                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                    {/* <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} /> */}
                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                    <span>Export</span>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-4">
                {/* <div className="grid grid-cols-12 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3  gap-4 mb-4"> */}
                {/* Site Health Score */}
                <div className="col-span-12 lg:col-span-4 flex flex-col items-center bg-white p-6 rounded-md border border-gray-200">
                    {/* Header with label and icon */}
                    <div className="flex items-center gap-1 mb-6">
                        <span className="text-[16px] font-medium">Avg. Page Health Score</span>
                        <BsInfo className="text-[20px] text-gray-400" />
                    </div>

                    {/* Donut chart with label */}
                    <div className="relative">
                        <PieChart width={200} height={200}>
                            <Pie
                                data={[
                                    { name: 'Score', value: avgScore },
                                    { name: 'Remaining', value: 100 - avgScore },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={100}
                                startAngle={90}
                                endAngle={-270}
                                dataKey="value"
                            >
                                <Cell fill="#008CCD" />
                                <Cell fill="#E5E7EB" />
                            </Pie>
                        </PieChart>

                        {/* Centered score */}
                        <div className="absolute inset-0 flex items-center justify-center space-x-2">
                            <div className="text-3xl font-semibold text-gray-900">{avgScore?.toFixed(0)}</div>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 flex flex-col items-center bg-white p-6 rounded-md border border-gray-200">
                    {/* Header with label and icon */}
                    <div className="flex items-center gap-1 mb-6">
                        <span className="text-[16px] font-medium">Total Affected Pages</span>
                        <BsInfo className="text-[20px] text-gray-400" />
                    </div>

                    <div className='flex gap-10 items-center'>

                    <div className="relative">
                        <PieChart width={200} height={200}>
                            <Pie
                                data={severityData || ""}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                innerRadius={80}
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
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                    Total: {totalIssues}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
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
                </div>

                <div className="col-span-12 lg:col-span-4 flex flex-col items-start gap-3 ">
                    <div className="border rounded-md p-4 w-full ">
                        <h2 className="text-[14px] font-semibold mb-3  pb-2">
                            <span className="text-[14px] font-medium">Top Affected pages Type</span>
                        </h2>

                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700 w-20">Critical</span>
                            <div className="flex-1 mx-2">
                                <div className="bg-orange-400 h-2" style={{ width: "85%;" }}></div>
                            </div>
                            <span className="text-sm text-blue-600 font-medium">123</span>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700 w-20">Blog</span>
                            <div className="flex-1 mx-2">
                                <div className="bg-teal-500 h-2 " style={{ width: " 60%;" }}></div>
                            </div>
                            <span className="text-sm text-blue-600 font-medium">78</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 w-20">Category</span>
                            <div className="flex-1 mx-2">
                                <div className="bg-red-500 h-2 " style={{ width: "40%;" }}></div>
                            </div>
                            <span className="text-sm text-blue-600 font-medium">51</span>
                        </div>
                    </div>
                    <div className="bg-white w-full border rounded-md p-4 ">
                        <SpkHrmcards cardClass="overflow-hidden" chartOptions={Hrmcard.chartOptions} color={Hrmcard.color} chartSeries={Hrmcard.chartSeries} icon={Hrmcard.direction} price={Hrmcard.value} title={Hrmcard.title} percent={Hrmcard.percentage} data={Hrmcard.description} type="area" height={70} width={"70px"} />
                    </div>
                </div>
            </div>

        </div> 
    )
}

export default PageSummary