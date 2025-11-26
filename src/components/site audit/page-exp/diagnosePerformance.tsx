"use client"
import { useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import Image from "next/image"
import { AiOutlineExport, AiOutlineCloseCircle } from "react-icons/ai"
import { splitAndRenderMultipleLinksNoJSX } from "@/src/util/helper"
import { PerformanceCard } from "./PerformanceCard"
import { BsInfo } from "react-icons/bs"

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

const PerformanceRingChart = ({ siteIssuesData }: any) => {
  const [activeTab, setActiveTab] = useState("performance")
  const data = siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.metrics

  const tabs = [
    { label: "Performance", value: "performance" },
    { label: "Accessibility", value: "accessibility" },
    { label: "Best Practices", value: "best-practices" },
    { label: "SEO", value: "seo" },
  ]

  const coreWebVitals = data?.core_web_vitals
  const metrics = data

const desktopError = siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.error;
const mobileError = siteIssuesData?.result?.pagespeed_data?.parsed_data?.mobile?.error;

let categoryScores;


if (!desktopError) {
  categoryScores = siteIssuesData?.result?.pagespeed_data?.suggestions?.desktop?.category_scores;
} else if (!mobileError) {
  categoryScores = siteIssuesData?.result?.pagespeed_data?.suggestions?.mobile?.category_scores;
} else {
  // both desktop & mobile failed → don't render anything
  return null;
}

function getSuggestionsByCategory(category: string) {
  if (!desktopError) {
    return siteIssuesData?.result?.pagespeed_data?.suggestions?.desktop?.suggestions_by_category?.[category] || [];
  } else if (!mobileError) {
    return siteIssuesData?.result?.pagespeed_data?.suggestions?.mobile?.suggestions_by_category?.[category] || [];
  }
  return []; // both failed → return empty → render nothing
}

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

  // Create segments with filled and unfilled portions using actual data
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

  // Inner circle data for the performance score
  const performanceScore = Math.round((categoryScores?.performance || 0) * 100)
  const accessibilityeScore = Math.round((categoryScores?.accessibility || 0) * 100)
  const bestPracticesScore = Math.round((categoryScores?.best_practices || 0) * 100)
  const seoScore = Math.round((categoryScores?.seo) * 100 || 0)

  const innerData = [
    { value: performanceScore, color: "#E9333D" }, // Red color matching the reference
    { value: 100 - performanceScore, color: "#F3F4F6" }, // Light gray
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload
      if (data.isGap) return null

      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg z-[9999] pointer-events-none max-w-xs">
          <p className="font-semibold text-gray-900">{data.title}</p>
          <p className="text-sm text-gray-600">Score: {Math.round(data.actualScore)}%</p>
          <p className="text-sm text-gray-600">Value: {data.displayValue}</p>
          <p className="text-sm text-gray-600">Rating: {data.rating}</p>
          {data.thresholds && (
            <div className="text-xs text-gray-500 mt-1">
              <p>Good: {data.thresholds.good}</p>
              <p>Poor: {data.thresholds.poor}</p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white border rounded-md p-6 mx-auto shadow-sm w-full">
      <div className="flex justify-between text-base font-semibold items-center mb-4 border-b pb-1">
        <div className="flex text-[18px] font-semibold gap-1 items-center">
          <h2 className="text-[18px] font-semibold">Diagnose Performance Issues</h2>
          <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
        </div>
        <div className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2">
          <Image
            alt=""
            src={"/images/WRanker - Export Icon grey.png"}
            className="cursor-pointer h-[14px] w-auto"
            height={0}
            width={0}
          />
          <span>Export</span>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-4">
          {/* Performance Chart with Dual-Color Segments */}
          <div className="border border-gray-200 rounded-md bg-white shadow-sm flex flex-col items-center">
            <div className="flex flex-col items-center justify-center text-center gap-2 p-3">
              <div className="flex items-center gap-1">
                <span className="font-medium">Performance</span>
                <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 font-medium font-serif italic flex items-center justify-center text-xs">
                  i
                </span>
              </div>
              <div className="relative">
                <ResponsiveContainer width={250} height={250}>
                  <PieChart>
                    {/* Outer Ring - Metrics with filled/unfilled segments */}
                    <Pie
                      data={outerSegments}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                      innerRadius={100}
                      outerRadius={105}
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

                    {/* Inner Ring - Performance Score */}
                    <Pie
                      data={innerData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
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

                    <Tooltip
                      content={<CustomTooltip />}
                      wrapperStyle={{ zIndex: 9999 }}
                      allowEscapeViewBox={{ x: true, y: true }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Score */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-gray-900">{performanceScore}</span>
                </div>

                {/* Labels positioned exactly as in image - OUTSIDE the chart */}
                <div className="absolute pointer-events-none" style={{ left: "50px", top: "-3px" }}>
                  <span className="text-sm font-medium text-gray-700">SI</span>
                </div>
                <div className="absolute pointer-events-none" style={{ left: "190px", top: "-3px" }}>
                  <span className="text-sm font-medium text-gray-700">CLS</span>
                </div>
                <div className="absolute pointer-events-none" style={{ left: "245px", top: "140px" }}>
                  <span className="text-sm font-medium text-gray-700">TBT</span>
                </div>
                <div className="absolute pointer-events-none" style={{ left: "110px", top: "240px" }}>
                  <span className="text-sm font-medium text-gray-700">LCP</span>
                </div>
                <div className="absolute pointer-events-none" style={{ left: "-23px", top: "120px" }}>
                  <span className="text-sm font-medium text-gray-700">FCP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility Chart */}
          <div className="border border-gray-200 rounded-md">
            <div className="flex flex-col items-center justify-center text-center gap-2 p-3">
              <div className="flex items-center">
                <span className="font-medium">Accessibility</span>
                <span className="w-4 h-4 rounded-full bg-transparent text-gray-400 font-medium font-serif italic flex items-center justify-center">
                  i
                </span>
              </div>
              <div className="relative">
                <PieChart width={200} height={200}>
                  <Pie
                    data={[
                      { name: "Score", value: accessibilityeScore },
                      { name: "Remaining", value: 100 - accessibilityeScore },
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
                  <div className="text-3xl font-semibold text-gray-900">{accessibilityeScore}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Best Practices Chart */}
          <div className="flex flex-col border border-gray-200 rounded-md">
            <div className="flex flex-col items-center justify-center text-center gap-2 p-3">
              <div className="flex items-center">
                <span className="font-medium">Best Practices</span>
                <span className="w-4 h-4 rounded-full bg-transparent text-gray-400 font-medium font-serif italic flex items-center justify-center">
                  i
                </span>
              </div>
              <div className="relative">
                <PieChart width={200} height={200}>
                  <Pie
                    data={[
                      { name: "Score", value: bestPracticesScore },
                      { name: "Remaining", value: 100 - bestPracticesScore },
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
                  <div className="text-3xl font-semibold text-gray-900">{bestPracticesScore}</div>
                </div>
              </div>
            </div>
          </div>

          {/* SEO Chart */}
          <div className="flex flex-col border border-gray-200 rounded-md">
            <div className="flex flex-col items-center justify-center text-center gap-2 p-3">
              <div className="flex items-center">
                <span className="font-medium">SEO</span>
                <span className="w-4 h-4 rounded-full bg-transparent text-gray-400 font-medium font-serif italic flex items-center justify-center">
                  i
                </span>
              </div>
              <div className="relative">
                <PieChart width={200} height={200}>
                  <Pie
                    data={[
                      { name: "Score", value: seoScore },
                      { name: "Remaining", value: 100 - seoScore },
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
                  <div className="text-3xl font-semibold text-gray-900">{seoScore}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700">
            <ul className="flex flex-wrap -mb-px">
              {tabs.map((tab) => (
                <li key={tab.value} className="me-2">
                  <button
                    onClick={() => setActiveTab(tab.value)}
                    className={`inline-block p-4 border-b-2 rounded-t-lg transition-colors duration-200
                      ${activeTab === tab.value
                        ? "text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500"
                        : "border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
                      }`}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>


          {activeTab === "performance" &&
            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 max-h-110 overflow-hidden overflow-y-auto">
              {getSuggestionsByCategory("performance")?.map((p: any, i: number) => {
                return (
                  <PerformanceCard key={i} title={p.title} description={p.description} />
                )
              })}
            </div>
          }
          {activeTab === "accessibility" &&
            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 max-h-110 overflow-hidden overflow-y-auto">
              {getSuggestionsByCategory("accessibility")?.map((p: any, i: number) => {
                // const { before, link, after } = splitAndRenderLink(performance.description);
                return (
                  <PerformanceCard key={i} title={p.title} description={p.description} />
                )
              })}
            </div>
          }

          {activeTab === "best-practices" &&
            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 max-h-110 overflow-hidden overflow-y-auto">
              {getSuggestionsByCategory("best_practices")?.map((p: any, i: number) => {
                // const { before, link, after } = splitAndRenderLink(performance.description);
                return (
                  <PerformanceCard key={i} title={p.title} description={p.description} />
                )
              })}
            </div>
          }

          {activeTab === "seo" &&
            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 max-h-110 overflow-hidden overflow-y-auto">
              {getSuggestionsByCategory("seo")?.map((p: any, i: number) => {
                // const { before, link, after } = splitAndRenderLink(performance.description);
                return (
                  <PerformanceCard key={i} title={p.title} description={p.description} />
                )
              })}
            </div>
          }
        </div>

        {/* <div className="flex justify-between border rounded-md p-6">
            <div className="flex flex-col gap-2 ">
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                  <AiOutlineCloseCircle className="text-[#E94134]" />
                  <span className="font-semibold text-[16px] ">Reduce Unused Javascript</span>
                </div>
                <span className="border rounded-full p-2 bg-red-200 text-red-800 font-normal">high Impact</span>
              </div>
              <span className="font-normal text-gray-600 text-[16px]">2.1MB of JS in not used during load.</span>
              <div className="flex items-center gap-1">
                <AiOutlineExport className="text-[#0077FF] font-normal text-[16px] cursor-pointer" />
                <span className="text-[#0077FF] font-normal text-[16px] cursor-pointer leading-[20px] align-middle underline decoration-solid">
                  View Google Docs
                </span>
              </div>
            </div>
            <span className="text-[#0077FF] flex justify-end items-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
          </div>

          <div className="flex justify-between border rounded-md p-6">
            <div className="flex flex-col gap-2 ">
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2">
                  <AiOutlineCloseCircle className="text-[#E94134]" />
                  <span className="font-semibold text-[16px] ">Eliminate Render Blocking Resources</span>
                </div>
                <span className="border rounded-full p-2 bg-red-200 text-red-800 font-normal">high Impact</span>
              </div>
              <span className="font-normal text-gray-600 text-[16px]">
                Resources are blocking the first paint of your page.
              </span>
              <div className="flex items-center gap-1">
                <AiOutlineExport className="text-[#0077FF] font-normal text-[16px] cursor-pointer" />
                <span className="text-[#0077FF] font-normal text-[16px] cursor-pointer leading-[20px] align-middle underline decoration-solid">
                  View Google Docs
                </span>
              </div>
            </div>
            <span className="text-[#0077FF] flex justify-end items-end font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Create Task</span>
          </div> */}
      </div>
    </div>
  )
}

export default PerformanceRingChart
