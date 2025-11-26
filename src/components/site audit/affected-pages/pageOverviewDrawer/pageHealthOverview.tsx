import { CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { AiFillSwitcher } from 'react-icons/ai';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { GaugeProgressBar } from '../../page-exp/perfomanceMwetrics';
import { Tooltip } from 'antd';



interface MetricData {
    name: string
    value: number
    actualScore: number
    color: string
    displayValue: string
    thresholds: any
    rating: string
    title: string
    isGap?: boolean
    isFilled?: boolean
}



const PageHealthOverview = ({ siteIssuesData, siteDetailPageData, affectedDetailsPageData }: any) => {

    const pageData = siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.metrics || {};

    const requiredCards = Object.keys(pageData)?.filter(
        (key: string) => key !== "server-response-time"
    );

    const vitalsData = requiredCards?.map((key) => {
        const metric = pageData[key];
        const { score, title, display_value, description, thresholds } = metric;
        const numberValue = parseFloat(display_value.replace(/[^\d.]/g, ''));
        const format = display_value.includes('ms') ? 'ms' : 's';
        return {
            description,
            thresholds,
            title,
            display_value,
            score,
            value: numberValue,
            percent: score,
            format,
        };
    });



    const data = siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.metrics
    const metrics = data

    function getColorByScore(rating: string): { dark: string; light: string } {
        switch (rating) {
            case "good":
                return { dark: "#00976C", light: "#A7F3D0" }
            case "needs-improvement":
                return { dark: "#FAC343", light: "#FEF3C7" }
            case "poor":
                return { dark: "#E9333D", light: "#FECACA" }
            default:
                return { dark: "#E9333D", light: "#FECACA" }
        }
    }


    const createSegmentData = () => {
        const baseMetrics = [
            {
                name: "SI",
                actualScore: (metrics?.["speed-index"]?.score || 0.39) * 100,
                rating: metrics?.["speed-index"]?.rating || "good",
                displayValue: metrics?.["speed-index"]?.display_value || "2.6s",
                title: metrics?.["speed-index"]?.title || "Speed Index",
                thresholds: metrics?.["speed-index"]?.thresholds || {},
            },
            {
                name: "FCP",
                actualScore: (metrics?.["first-contentful-paint"]?.score || 0.99) * 100,
                rating: metrics?.["first-contentful-paint"]?.rating || "good",
                displayValue: metrics?.["first-contentful-paint"]?.display_value || "0.6s",
                title: metrics?.["first-contentful-paint"]?.title || "First Contentful Paint",
                thresholds: metrics?.["first-contentful-paint"]?.thresholds || {},
            },
            {
                name: "LCP",
                actualScore: (metrics?.["largest-contentful-paint"]?.score || 0.46) * 100,
                rating: metrics?.["largest-contentful-paint"]?.rating || "good",
                displayValue: metrics?.["largest-contentful-paint"]?.display_value || "2.5s",
                title: metrics?.["largest-contentful-paint"]?.title || "Largest Contentful Paint",
                thresholds: metrics?.["largest-contentful-paint"]?.thresholds || {},
            },
            {
                name: "TBT",
                actualScore: (metrics?.["total-blocking-time"]?.score || 0.02) * 100,
                rating: metrics?.["total-blocking-time"]?.rating || "poor",
                displayValue: metrics?.["total-blocking-time"]?.display_value || "1,330ms",
                title: metrics?.["total-blocking-time"]?.title || "Total Blocking Time",
                thresholds: metrics?.["total-blocking-time"]?.thresholds || {},
            },
            {
                name: "CLS",
                actualScore: (metrics?.["cumulative-layout-shift"]?.score || 1) * 100,
                rating: metrics?.["cumulative-layout-shift"]?.rating || "good",
                displayValue: metrics?.["cumulative-layout-shift"]?.display_value || "0",
                title: metrics?.["cumulative-layout-shift"]?.title || "Cumulative Layout Shift",
                thresholds: metrics?.["cumulative-layout-shift"]?.thresholds || {},
            },
        ]
        const segmentSize = 15
        const gapSize = 3
        const segments: MetricData[] = []

        baseMetrics.forEach((metric, index) => {
            const colors = getColorByScore(metric.rating)
            const filledPortion = (metric.actualScore / 100) * segmentSize
            const unfilledPortion = segmentSize - filledPortion

            // Add filled portion
            if (filledPortion > 0) {
                segments.push({
                    name: metric.name,
                    value: filledPortion,
                    actualScore: metric.actualScore,
                    color: colors.dark,
                    displayValue: metric.displayValue,
                    thresholds: metric.thresholds,
                    rating: metric.rating,
                    title: metric.title,
                    isFilled: true,
                })
            }

            // Add unfilled portion (NO gap between filled and unfilled)
            if (unfilledPortion > 0) {
                segments.push({
                    name: metric.name,
                    value: unfilledPortion,
                    actualScore: metric.actualScore,
                    color: colors.light,
                    displayValue: metric.displayValue,
                    thresholds: metric.thresholds,
                    rating: metric.rating,
                    title: metric.title,
                    isFilled: false,
                })
            }

            // Add gap only between different metrics
            if (index < baseMetrics.length) {
                segments.push({
                    name: `gap${index + 1}`,
                    value: gapSize,
                    actualScore: 0,
                    color: "transparent",
                    displayValue: "",
                    thresholds: {},
                    rating: "",
                    title: "",
                })
            }
        })

        return segments
    }

    const outerSegments = createSegmentData()


    const innerData = [
        { value: 33, color: "#E9333D" }, // Red color matching the reference
        { value: 100 - 33, color: "#F3F4F6" }, // Light gray
    ]

    return (
        <div className="bg-white border rounded-md p-6 mt-4 mx-auto shadow-sm w-full">
            <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-3">
                <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                    SEO & Page Health Overview
                </CardTitle>

                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                    <span>Export</span>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Performance Chart with Dual-Color Segments */}
                <div className="border border-gray-200 rounded-md">
                    <div className="flex flex-col items-center justify-center text-center gap-2 p-3">
                        <div className="flex items-center">
                            <span className="font-medium">SEO Score</span>
                            <span className="w-4 h-4 rounded-full bg-transparent text-gray-400 font-medium font-serif italic flex items-center justify-center">
                                i
                            </span>
                        </div>
                        <div className="relative mt-10">
                            <PieChart width={200} height={200}>
                                <Pie
                                    data={[
                                        { name: "Score", value: siteDetailPageData && siteDetailPageData[0]?.page_score },
                                        { name: "Remaining", value: 100 - (siteDetailPageData && siteDetailPageData[0]?.page_score) },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                >
                                    <Cell fill="#4286F5" />
                                    <Cell fill="#E5E7EB" />
                                </Pie>
                            </PieChart>
                            {/* Centered score */}
                            <div className="absolute inset-0 flex items-center justify-center space-x-2">
                                <div className="text-3xl font-semibold text-gray-900">{siteDetailPageData && siteDetailPageData[0]?.page_score}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Accessibility Chart */}
                <div className="border border-gray-200 rounded-md">
                    <div className="flex flex-col items-center justify-center text-center gap-2 p-3">
                        <div className="flex items-center">
                            <span className="font-medium">Health Score</span>
                            <span className="w-4 h-4 rounded-full bg-transparent text-gray-400 font-medium font-serif italic flex items-center justify-center">
                                i
                            </span>
                        </div>
                        <div className="relative mt-10">
                            <PieChart width={200} height={200}>
                                <Pie
                                    data={[
                                        { name: "Score", value: 44 },
                                        { name: "Remaining", value: 100 - 44 },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    startAngle={90}
                                    endAngle={-270}
                                    dataKey="value"
                                >
                                    <Cell fill="#4286F5" />
                                    <Cell fill="#E5E7EB" />
                                </Pie>
                            </PieChart>
                            {/* Centered score */}
                            <div className="absolute inset-0 flex items-center justify-center space-x-2">
                                <div className="text-3xl font-semibold text-gray-900">{44}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Best Practices Chart */}
                <div className="border border-gray-200 rounded-md bg-white shadow-sm flex flex-col items-center relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center text-center gap-2 p-3 relative backdrop-blur-[2px]">
                        {/* Header */}
                        <div className="flex items-center gap-1 backdrop-blur-[2px]">
                            <span className="font-medium">Performance Score</span>
                            <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 font-medium font-serif italic flex items-center justify-center text-xs">
                                i
                            </span>
                        </div>

                        {/* Chart (blurred) */}
                        <div className="relative pointer-events-none">
                            <ResponsiveContainer width={250} height={250}>
                                <PieChart>
                                    {/* Outer Ring */}
                                    <Pie
                                        data={outerSegments}
                                        dataKey="value"
                                        startAngle={90}
                                        endAngle={450}
                                        innerRadius={80}
                                        outerRadius={85}
                                        stroke="none"
                                        cornerRadius={3}
                                    >
                                        {outerSegments.map((entry, index) => (
                                            <Cell
                                                key={`outer-cell-${index}`}
                                                fill={entry.color}
                                                style={{ cursor: entry.isGap ? "default" : "pointer" }}
                                            />
                                        ))}
                                    </Pie>

                                    {/* Inner Ring */}
                                    <Pie
                                        data={innerData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        startAngle={90}
                                        endAngle={450}
                                        dataKey="value"
                                        stroke="none"
                                        isAnimationActive={false}
                                    >
                                        {innerData.map((entry, index) => (
                                            <Cell key={`inner-cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center Score */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-gray-900">{44}</span>
                            </div>

                            {/* Labels */}
                            <div className="absolute pointer-events-none left-[64px] top-[35px]">
                                <span className="text-sm font-medium text-gray-700">SI</span>
                            </div>
                            <div className="absolute pointer-events-none left-[189px] top-[50px]">
                                <span className="text-sm font-medium text-gray-700">CLS</span>
                            </div>
                            <div className="absolute pointer-events-none left-[207px] top-[155px]">
                                <span className="text-sm font-medium text-gray-700">TBT</span>
                            </div>
                            <div className="absolute pointer-events-none left-[110px] top-[210px]">
                                <span className="text-sm font-medium text-gray-700">LCP</span>
                            </div>
                            <div className="absolute pointer-events-none left-[14px] top-[135px]">
                                <span className="text-sm font-medium text-gray-700">FCP</span>
                            </div>
                        </div>

                        {/* Overlay Coming Soon */}
                    </div>
                    <div className="absolute inset-0 -top-0 flex items-center justify-center backdrop-blur-[2px] ">
                        <span className="bg-white text-gray-700 font-semibold px-4 py-2 rounded-md shadow-md text-lg">
                            Coming Soon
                        </span>
                    </div>
                </div>


                {/* SEO Chart */}
                <div className="flex flex-col border border-gray-200 rounded-md relative overflow-hidden ">
                    <div className="rounded-md shadow-sm p-4 flex flex-col items-center justify-between relative">
                        {/* Blurred chart */}
                        <div className="w-full relative ">
                            <div className=" pointer-events-none">
                                <GaugeProgressBar
                                    label={"Largest Contentful Paint"}
                                    score={0.1}
                                    threshold={{
                                        mid: 2.5,
                                        max: 4,
                                        unit: "seconds",
                                    }}
                                />
                            </div>

                            {/* Overlay Coming Soon */}
                            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] ">
                                <span className="text-gray-700 font-semibold px-4 py-2 rounded-md shadow-md text-lg">
                                    Coming Soon
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div >
    )
}

export default PageHealthOverview