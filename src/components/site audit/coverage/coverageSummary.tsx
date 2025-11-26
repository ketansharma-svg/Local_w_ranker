


import React from 'react'
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import exportIcon from "../../assests/Group 1000008949@3x.png"
import Image from "next/image"
import { BsInfo } from 'react-icons/bs'
import { CardTitle } from '@/components/ui/card'
import { MdInfoOutline } from 'react-icons/md'


const CoverageSummary = ({ summary }: any) => {

    const cardsData = [
        {
            title: 'Total URLs',
            value: summary?.total_urls,
            description: 'URLs Reported',
            progress: summary?.total_urls,
        },
        {
            title: 'Indexed URLs',
            value: summary?.indexed_urls,
            description: 'Pages are indexed & visible in search results.',
            progress: summary?.indexed_urls,
        },
        {
            title: 'Excluded URLs',
            value: summary?.excluded_urls,
            description: 'Meta tag or HTTP header blocked indexing.',
            progress: summary?.excluded_urls,
        },
        {
            title: 'Errors (Indexing)',
            value: summary?.errors_indexing,
            description: 'Pages failing redirection during crawl.',
            progress: summary?.errors_indexing,
        },
        {
            title: 'Valid with Warnings',
            value: summary?.valid_with_warnings,
            description: 'Pages indexed with issues like redirects ....',
            progress: summary?.valid_with_warnings,
        },
        {
            title: 'Indexed, not submitted in sitemap',
            value: summary?.indexed_not_submitted_in_sitemap,
            description: 'Pages indexed but not included in sitemap.xml.',
            progress: summary?.indexed_not_submitted_in_sitemap,
        },
        {
            title: "Indexed but blocked by robots.txt",
            value: summary?.indexed_but_blocked_by_robots_txt,
            description: 'Indexed but prevented from crawling.',
            progress: summary?.indexed_but_blocked_by_robots_txt,
        },
        {
            title: "Excluded by 'noindex'",
            value: summary?.excluded_by_noindex,
            description: 'Meta tag or HTTP header blocked indexing.',
            progress: summary?.excluded_by_noindex,
        },
        {
            title: 'Alternate page with canonical',
            value: summary?.alternate_page_with_canonical,
            description: 'Canonical exists, but page not shown in results.',
            progress: summary?.alternate_page_with_canonical,
        },
        {
            title: 'Server Errors (5xx)',
            value: summary?.server_errors_5xx,
            description: 'Pages returning server error on crawl.',
            progress: summary?.server_errors_5xx,
        },
        {
            title: 'Duplicate without canonical',
            value: summary?.duplicate_without_canonical,
            description: 'URLs with Warnings',
            progress: summary?.duplicate_without_canonical,
        },
        {
            title: 'Crawled - not indexed',
            value: summary?.crawled_not_indexed,
            description: 'Crawled but not indexed yet.',
            progress: summary?.crawled_not_indexed,
        },
    ];



    return (
        <div className="bg-white border rounded-md p-6 mt-4 mx-auto shadow-sm w-full">
            <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-3">
                <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                    Coverage Summary
                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                </CardTitle>

                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                    <span>Export</span>
                </div>
            </div>
            <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 ">

                {cardsData.map((card, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[#000000] text-[14px] font-medium">{card.title}</span>
                                <BsInfo size={18} color="#9E9E9E" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-4 items-center">
                                    <span className="font-semibold text-[24px] text-[#0077FF]">{card.value}</span>
                                    <div className="h-[40px] w-[40px]">
                                        <PieChart width={40} height={40}>
                                            <Pie
                                                dataKey="value"
                                                startAngle={90}
                                                endAngle={-270}
                                                innerRadius={12}
                                                outerRadius={18}
                                                data={[
                                                    { name: 'Used', value: card.progress },
                                                    { name: 'Remaining', value: 100 - card.progress },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                            >
                                                <Cell fill="#0077FF" />
                                                <Cell fill="#E5E7EB" />
                                            </Pie>
                                        </PieChart>
                                    </div>
                                </div>
                                <span className="text-right flex justify-start font-normal text-[14px]">{card.description}</span>
                            </div>
                        </div>
                    </div>
                ))}

            </div >
        </div >
    )
}

export default CoverageSummary