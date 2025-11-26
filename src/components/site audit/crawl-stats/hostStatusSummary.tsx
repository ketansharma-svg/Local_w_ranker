import Image from 'next/image'
import React from 'react'
import { BsInfo } from 'react-icons/bs'

const HostStatusSummary = ({ siteIssues, sitedetails }: any) => {

    const responseTimes = sitedetails?.result?.links?.map((link: any) => link.response_time_ms)
    const avgResponseTime = responseTimes?.length && responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length
    const maxResponseTime = responseTimes?.length
        ? Math.max(...responseTimes)
        : 0;


    const serverStats = [
        {
            title: "Server Availability",
            value: "N/A",
            color: "bg-green-500",
            iconColor: "bg-green-400",
            description: "% of pages successfully crawled without timeouts or DNS issues",
        },
        {
            title: "Avg. Response Time",
            value: `${avgResponseTime?.toFixed(2) || 0}ms`,
            color: "bg-orange-500",
            iconColor: "bg-orange-400",
            description: "Median server response time across all successful requests",
        },
        // {
        //     title: "Timeout Errors",
        //     value: "12",
        //     color: "bg-red-500",
        //     iconColor: "bg-red-400",
        //     description: "Number of pages where server timeout or unreachable error occurred",
        // },
        {
            title: "DNS Resolution Failures",
            value: "N/A",
            color: "bg-yellow-500",
            iconColor: "bg-yellow-400",
            description: "Count of URLs that failed DNS or couldn’t resolve the host",
        },
        {
            title: "Max Response Time",
            value: `${maxResponseTime?.toFixed(2) || 0}ms`,
            color: "bg-blue-500",
            iconColor: "bg-blue-400",
            description: "Slowest server response time observed in the crawl",
        },
    ];


    return (
        <div className="bg-white border rounded-md p-6 mt-4 mx-auto shadow-sm w-full">
            <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
                <div className="flex text-[18px] font-semibold gap-1 items-center">
                    <h2 className="text-[18px] font-semibold">Host Status Summary</h2>
                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                </div>
                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                    <span>Export</span>
                </div>
            </div>
            <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
                {serverStats.map((card: any, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                        <div className="flex flex-col gap-2">
                            <div className='flex justify-between items-center'>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">{card.title}</span>
                                    <BsInfo size={18} color="#9E9E9E" />
                                </div>
                                {/* <div
                                    className={`w-4 h-4 rounded-full ${card.color}`}
                                >
                                </div> */}
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <div
                                        className={`w-4 h-4 rounded-full ${card.color}`}
                                    >
                                    </div>
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{card.value}</span>
                                    {/* <span className="font-semibold text-[24px] text-[#0077FF]">Pages</span> */}
                                </div>
                                <span className=" flex justify-start font-normal text-[14px]">{card.description}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div >
        </div>
    )
}

export default HostStatusSummary