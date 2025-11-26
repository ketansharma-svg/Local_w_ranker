import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'

const SmartRec = () => {

    const smartRecommendations = [
        {
            priority: "HIGH PRIORITY",
            title: "Excessive 404 errors detected",
            description:
                "820 URLs returned 404 in 24-48 vs previous period. This wastes crawl budget and affects user experience.",
            suggestedFix: "Set up 301 redirects or restore broken pages",
            action: "View Affected URLs",
            crawlType: "Crawl Status Table",
            color: "border-red-500 bg-red-50",
        },
        {
            priority: "MEDIUM PRIORITY",
            title: "Over 13% of crawls used on redirects",
            description:
                "1030 301 responses indicate internal link issues that could be optimized.",
            suggestedFix: "Review redirecting links with direct URLs",
            action: "Optimize Link Map",
            crawlType: "Crawl Type Table",
            color: "border-orange-500 bg-orange-50",
        },
        {
            priority: "HIGH PRIORITY",
            title: "Mobile crawler dominant but issues detected",
            description:
                "52% crawls by Googlebot-Mobile suggests mobile-first indexing is active. Ensure mobile optimization.",
            suggestedFix: "Run mobile usability audit and responsive design checks",
            action: "Run Mobile Audit",
            crawlType: "Crawl Type Table",
            color: "border-red-500 bg-red-50",
        },
        {
            priority: "LOW PRIORITY",
            title: "Minor increase in 500 errors",
            description:
                "150 server errors (+66%) detected during server health during peak crawl times.",
            suggestedFix: "Check server health and load balancing during crawl spikes",
            action: "View Server Logs",
            crawlType: "Crawl Status Table",
            color: "border-green-500 bg-green-50",
        },
    ];

    return (

        //   <div className="bg-white border rounded-md p-6 mt-4 mx-auto shadow-sm w-full">
        //             <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
        //                 <h2 className="text-[18px] font-medium">Smart Recommendations</h2>
        //                 <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2.5'>
        //                     <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
        //                     <span>Export</span>
        //                 </div>
        //             </div>
        //             <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
        //                 {serverStats.map((card: any, idx) => (
        //                     <div key={idx} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
        //                         <div className="flex flex-col gap-2">
        //                             <div className='flex justify-between items-center'>
        //                                 <div className="flex gap-2 items-center">
        //                                     <span className="text-[#000000] text-[14px] font-medium">{card.title}</span>
        //                                     <BsInfo size={18} color="#9E9E9E" />
        //                                 </div>
        //                                 <div
        //                                     className={`w-4 h-4 rounded-full ${card.color}`}
        //                                 >
        //                                 </div>
        //                             </div>
        //                             <div className="flex flex-col gap-2">
        //                                 <div className="flex gap-2 items-center">
        //                                     <span className="font-semibold text-[24px] text-[#0077FF]">{card.value}</span>
        //                                     {/* <span className="font-semibold text-[24px] text-[#0077FF]">Pages</span> */}
        //                                 </div>
        //                                 <span className=" flex justify-start font-normal text-[14px]">{card.description}</span>
        //                             </div>
        //                         </div>
        //                     </div>
        //                 ))}
        //             </div >
        //         </div>

        <Card className="border border-gray-200">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">
                            Smart Recommendations
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                            AI-powered insights to optimize crawl efficiency
                        </p>
                    </div>
                    {/* <Button variant="default" size="sm" className="bg-blue-600">
                        Download Report
                    </Button> */}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-6">
                    {smartRecommendations.map((rec, index) => (
                        <div
                            key={index}
                            className={`border-l-4 p-4 rounded-r-lg ${rec.color}`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-600">
                                    {rec.priority}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {rec.crawlType}
                                </span>
                            </div>
                            <h4 className="font-semibold text-sm mb-2">
                                {rec.title}
                            </h4>
                            <p className="text-sm text-gray-700 mb-3">
                                {rec.description}
                            </p>
                            <div className="mb-3">
                                <span className="text-xs font-medium text-gray-600">
                                    Suggested Fix:
                                </span>
                                <p className="text-sm text-gray-700">
                                    {rec.suggestedFix}
                                </p>
                            </div>
                            {/* <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 text-xs h-7 bg-transparent"
                            >
                                {rec.action}
                            </Button> */}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export default SmartRec