import { CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import React from 'react'
import { BsInfo } from 'react-icons/bs'

const CrawlStateCard = ({ siteIssues, sitedetails }: any) => {

    const totalCount = siteIssues?.length > 0 && Object.values(siteIssues[0]?.issue_counts).reduce((sum: any, val: any) => sum + val, 0);
    const responseTimes = sitedetails?.result?.links?.map((link: any) => link.response_time_ms)
    const avgResponseTime = responseTimes?.length && responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length


    const statsCards = [
        {
            title: "Total Pages Crawled",
            value: `${sitedetails?.result?.total_pages_analyzed} Pages`,
            description: "Lorem text will be here",
        },
        {
            title: "Estimated Daily Crawl Rate",
            value: `${sitedetails?.result?.total_pages_analyzed} Pages`,
            description: "Lorem text will be here",
        },
        {
            title: "Crawl Error",
            value: `${totalCount} Error(s)`,
            description: "Lorem text will be here",
        },
        {
            title: "Average Response Time",
            value: `${avgResponseTime ? avgResponseTime?.toFixed(2) : 0} ms`,
            description: "Lorem text will be here",
        },
    ];

    return (

        <div className="bg-white border rounded-md p-6 mx-auto shadow-sm w-full">
            <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
                <div className="flex text-[18px] font-semibold gap-1 items-center">
                    <h2 className="text-[18px] font-semibold">Crawl Stats</h2>
                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                </div>
                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                    <span>Export</span>
                </div>
            </div>
            <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
                {statsCards?.map((card: any, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">{card.title}</span>
                                <BsInfo size={18} color="#9E9E9E" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{card.value}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div >
        </div>
    )
}

export default CrawlStateCard