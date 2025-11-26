"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Info, AlertTriangle, CheckCircle, Smartphone, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { Collapse } from "antd"
const { Panel } = Collapse
import { Tooltip } from "antd"
import { AiFillSwitcher } from "react-icons/ai"
import GaugeChart from "react-gauge-chart"
// Helper functions
const getScoreColor = (score: number): string => {
  if (score >= 90) return "#00976C" // green-500
  if (score >= 50) return "#FAC343" // orange-500
  return "#E9333D" // red-500
}
const stripMarkdownLinks = (text: string): string => {
  return text?.replace(/\[([^\]]+)\]$$[^)]+$$/g, "$1") || ""
}
// Tabs Component
interface TabItem {
  key: string
  label: React.ReactNode
}
interface TabsProps {
  items: TabItem[]
  activeKey: string
  onChange: (activeKey: string) => void
}

const GaugeProgressBar = ({ score, label, threshold }: any) => {
  const score1 = Number.parseFloat(score?.replace(/[^\d.]/g, ""))

  // Define min and artificial max to avoid needle looping back
  const min = 0
  const max = 10 // You can set this based on your actual expected max value

  // Clamp and normalize score to be in 0-1 range for react-gauge-chart
  const clampedValue = Math.min(score1, max)
  const gaugeValue = (clampedValue - min) / (max - min)
  // Normalize arcsLength to total 1
  const arcGreen = threshold.mid - min
  const arcOrange = threshold.max - threshold.mid
  const arcRed = max - threshold.max
  const total = arcGreen + arcOrange + arcRed
  const arcsLength = [arcGreen / total, arcOrange / total, arcRed / total]

  return (
    <div className="gauge-progress" style={{ textAlign: "center" }}>
      <span className="font-medium">{label}</span>
      <GaugeChart
        id={`gauge-${label}`}
        nrOfLevels={20}
        percent={gaugeValue}
        arcsLength={arcsLength}
        colors={["#00976C", "#FAC343", "#E9333D"]}
        style={{ width: "100%", height: "150px" }}
        animate={true}
        needleColor="#1688C9"
        // bool="false"
        animDelay={500}
        textColor="transparent" // Hide the text inside the gauge
        cornerRadius={1}
        animateDuration={2000}
      />
      <div className="bg-white border-[1px] border-purple font-semibold w-fit text-center px-3 mx-auto rounded-lg text-purple mt-6 text-[20px]">
        {score}
      </div>
      <div className="flex flex-col gap-1 pt-4">
        <div className="flex items-center">
          <span className="w-2.5 h-2.5 mr-2 rounded-full bg-green-500"></span>
          No Need To Improve (0–<span>{threshold.mid}s)</span>)
        </div>
        <div className="flex items-center">
          <span className="w-2.5 h-2.5 mr-2 rounded-full" style={{ backgroundColor: "#FAC343" }}></span>
          Need Improvement ({threshold.mid}s – <span>{threshold.max}s)</span>)
        </div>
        <div className="flex items-center">
          <span className="w-2.5 h-2.5 mr-2 rounded-full" style={{ backgroundColor: "#E9333D" }}></span>
          Very Poor ({threshold.max}s – <span>Infinity)</span>)
        </div>
      </div>
    </div>
  )
}

function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex space-x-4">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex items-center border-b-2 px-4 py-2 text-sm font-medium",
              activeKey === item.key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
// Card Component
interface CardProps {
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm", className)}>
      {title && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="text-base font-medium text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
// ProgressCircle Component
interface ProgressCircleProps {
  percent: number
  color?: string
  size?: number
  strokeWidth?: number
  showAnimation?: boolean
}

function ProgressCircle({
  percent,
  color = "#00976C",
  size = 150,
  strokeWidth = 14,
  showAnimation = false,
}: ProgressCircleProps) {
  const [displayPercent, setDisplayPercent] = useState(0)

  useEffect(() => {
    if (showAnimation) {
      // Animate from 0 to percent
      let start = 0
      const animationDuration = 1000 // 1 second
      const step = 10 // Update every 10ms
      const increment = (percent / animationDuration) * step
      const timer = setInterval(() => {
        start += increment
        if (start >= percent) {
          setDisplayPercent(percent)
          clearInterval(timer)
        } else {
          setDisplayPercent(Math.floor(start))
        }
      }, step)
      return () => clearInterval(timer)
    } else {
      setDisplayPercent(percent)
    }
  }, [percent, showAnimation])

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (displayPercent / 100) * circumference
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E9333D" />
            <stop offset="50%" stopColor="#FAC343" />
            <stop offset="100%" stopColor="#00976C" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f1f1" strokeWidth={strokeWidth} />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)" // Apply gradient stroke
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeLinecap="round"
          className={cn("transition-all duration-300", showAnimation && "animate-dash")}
          style={{
            transition: showAnimation ? "stroke-dashoffset 1s ease-in-out" : "none",
          }}
        />
      </svg>

      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center font-medium">{displayPercent}%</div>
    </div>
  )
}

// AnimatedProgressBar Component

// SegmentedProgressBar Component
interface SegmentedProgressBarProps {
  value: string
  showAnimation?: boolean
}

function SegmentedProgressBar({ value, showAnimation = false }: SegmentedProgressBarProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => {
        setVisible(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setVisible(true)
    }
  }, [showAnimation])

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
      {/* Green section */}
      <div
        className={`absolute left-0 top-0 h-full w-[60%] bg-green-500 transition-transform duration-1000 ease-out ${
          visible ? "translate-x-0" : "translate-x-[-100%]"
        }`}
      ></div>

      {/* Orange section */}
      <div
        className={`absolute left-[60%] top-0 h-full w-[20%] bg-orange-500 transition-transform duration-1000 ease-out delay-150 ${
          visible ? "translate-x-0" : "translate-x-[-100%]"
        }`}
      ></div>

      {/* Red section */}
      <div
        className={`absolute left-[80%] top-0 h-full w-[20%] bg-red-500 transition-transform duration-1000 ease-out delay-300 ${
          visible ? "translate-x-0" : "translate-x-[-100%]"
        }`}
      ></div>

      {/* Indicator dot */}
      <div
        className={`absolute top-0 h-full w-1 rounded-full bg-gray-800 transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          left: `${50}%`, // Calculate based on value
        }}
      ></div>
    </div>
  )
}

// SuggestionItem Component
interface SuggestionItemProps {
  suggestion: {
    title: string
    description: string
    importance: string
  }
  index: number
  showAnimation?: boolean
}

function SuggestionItem({ suggestion, index, showAnimation = false }: SuggestionItemProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(
        () => {
          setVisible(true)
        },
        100 + index * 100,
      )
      return () => clearTimeout(timer)
    } else {
      setVisible(true)
    }
  }, [showAnimation, index])

  const ImportanceIcon = () => {
    switch (suggestion.importance) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "medium":
        return <Info className="h-5 w-5 text-orange-500" />
      case "low":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return null
    }
  }

  return (
    <Collapse
      accordion
      defaultActiveKey={[]}
      ghost
      className={`transform rounded-lg border border-gray-100 bg-white px-3 shadow-sm transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 0.1}s` }}
    >
      <Panel
        header={
          <div className="flex items-center gap-2">
            <ImportanceIcon />
            <span className="font-medium text-gray-800">{suggestion.title}</span>
          </div>
        }
        key={index}
        className="group"
      >
        <div className="text-sm text-gray-600">{suggestion.description}</div>
      </Panel>
    </Collapse>
  )
}

// Main Dashboard Component
const SwiftMetricsDashboard = ({ data }: any) => {
  
  const [activeTab, setActiveTab] = useState<string>("mobile")
  const [showAll, setShowAll] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation when component mounts
    setIsVisible(true)
  }, [])

  const parsed_data = data?.parsed_data
  const suggestions_data = data?.suggestions

  const currentData =
    activeTab === "mobile"
      ? parsed_data?.mobile && !parsed_data.mobile.error
        ? parsed_data.mobile
        : null
      : parsed_data?.desktop && !parsed_data.desktop.error
        ? parsed_data.desktop
        : null

  const suggestions =
    activeTab === "mobile"
      ? suggestions_data?.mobile?.suggestions_by_category
        ? [
            ...(suggestions_data.mobile.suggestions_by_category.performance || []),
            ...(suggestions_data.mobile.suggestions_by_category.accessibility || []),
            ...(suggestions_data.mobile.suggestions_by_category.best_practices || []),
            ...(suggestions_data.mobile.suggestions_by_category.seo || []),
          ]
        : []
      : suggestions_data?.desktop?.suggestions_by_category
        ? [
            ...(suggestions_data.desktop.suggestions_by_category.performance || []),
            ...(suggestions_data.desktop.suggestions_by_category.accessibility || []),
            ...(suggestions_data.desktop.suggestions_by_category.best_practices || []),
            ...(suggestions_data.desktop.suggestions_by_category.seo || []),
          ]
        : []

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, 3)

  const handleToggle = () => {
    setShowAll((prev) => !prev)
  }

  const coreMetrics = [
    {
      key: "largest-contentful-paint",
      label: currentData?.metrics["largest-contentful-paint"]?.title,
      value: currentData?.metrics["largest-contentful-paint"]?.display_value,
      score: currentData?.metrics["largest-contentful-paint"]?.score,
      description: stripMarkdownLinks(currentData?.metrics["largest-contentful-paint"]?.description),
      threshold: {
        min: 0,
        mid: Number.parseFloat(
          currentData?.metrics["largest-contentful-paint"]?.thresholds?.good?.replace(/[^\d.]/g, "") || "2.5",
        ),
        max: Number.parseFloat(
          currentData?.metrics["largest-contentful-paint"]?.thresholds?.["needs-improvement"]?.replace(/[^\d.]/g, "") ||
            "4.0",
        ),
      },
    },
    {
      key: "interactive",
      label: currentData?.metrics["interactive"]?.title,
      value: currentData?.metrics["interactive"]?.display_value,
      score: currentData?.metrics["interactive"]?.score,
      description: stripMarkdownLinks(currentData?.metrics["interactive"]?.description),
      threshold: {
        min: 0,
        mid: Number.parseFloat(currentData?.metrics["interactive"]?.thresholds?.good?.replace(/[^\d.]/g, "") || "3.8"),
        max: Number.parseFloat(
          currentData?.metrics["interactive"]?.thresholds?.["needs-improvement"]?.replace(/[^\d.]/g, "") || "7.3",
        ),
      },
    },
    {
      key: "first-contentful-paint",
      label: currentData?.metrics["first-contentful-paint"]?.title,
      value: currentData?.metrics["first-contentful-paint"]?.display_value,
      score: currentData?.metrics["first-contentful-paint"]?.score,
      description: stripMarkdownLinks(currentData?.metrics["first-contentful-paint"]?.description),
      threshold: {
        min: 0,
        mid: Number.parseFloat(
          currentData?.metrics["first-contentful-paint"]?.thresholds?.good?.replace(/[^\d.]/g, "") || "1.8",
        ),
        max: Number.parseFloat(
          currentData?.metrics["first-contentful-paint"]?.thresholds?.["needs-improvement"]?.replace(/[^\d.]/g, "") ||
            "3.0",
        ),
      },
    },
    {
      key: "speed-index",
      label: currentData?.metrics["speed-index"]?.title,
      value: currentData?.metrics["speed-index"]?.display_value,
      score: currentData?.metrics["speed-index"]?.score,
      description: stripMarkdownLinks(currentData?.metrics["speed-index"]?.description),
      threshold: {
        min: 0,
        mid: Number.parseFloat(currentData?.metrics["speed-index"]?.thresholds?.good?.replace(/[^\d.]/g, "") || "3.4"),
        max: Number.parseFloat(
          currentData?.metrics["speed-index"]?.thresholds?.["needs-improvement"]?.replace(/[^\d.]/g, "") || "5.8",
        ),
      },
    },
  ]

  const performanceScores = [
    {
      label: "Performance",
      score: Math.round((currentData?.performance_rating?.score ?? 0) * 100),
      color: getScoreColor((currentData?.performance_rating?.score ?? 0) * 100),
    },
    {
      label: "Accessibility",
      score: Math.round((currentData?.accessibility_score ?? 0) * 100),
      color: getScoreColor((currentData?.accessibility_score ?? 0) * 100),
    },
    {
      label: "Best Practices",
      score: Math.round((currentData?.best_practices_score ?? 0) * 100),
      color: getScoreColor((currentData?.best_practices_score ?? 0) * 100),
    },
    {
      label: "SEO",
      score: Math.round((currentData?.seo_score ?? 0) * 100),
      color: getScoreColor((currentData?.seo_score ?? 0) * 100),
    },
  ]

  const tabItems = [
    {
      key: "mobile",
      label: (
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          <span className="hidden sm:inline">Mobile</span>
        </div>
      ),
    },
    {
      key: "desktop",
      label: (
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          <span className="hidden sm:inline">Desktop</span>
        </div>
      ),
    },
  ]

  return (
    <div className="rounded-lg bg-white p-4 shadow-lg md:p-6">
      <div className=" mb-5 flex items-center justify-start gap-3 rounded-md p-2">
        <Image src={"/images/new/pagespeed.png"} alt="pageSpeed" width={40} height={40} />
        <h2 className="text-2xl font-bold text-homeblack">Page Speed Analysis</h2>
      </div>

      <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      <div className="mt-6 flex flex-col gap-6">
        <div className="flex gap-5 ">
          <div className="w-2/3 ">
            <Card title="Performance Overview">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {performanceScores.map((score, index) => (
                  <motion.div
                    key={index}
                    className="flex flex-col shadow p-4 rounded-lg items-center justify-center gap-2"
                    initial={{ opacity: 0 }} // Fade out initially
                    whileInView={{ opacity: 1 }} // Fade in when in view
                    exit={{ opacity: 0 }} // Fade out when it leaves the view
                    transition={{ duration: 0.8, delay: index * 0.2 }} // Staggered delay based on index
                  >
                    <ProgressCircle
                      percent={score.score}
                      color={score.color}
                      showAnimation={true} // True since we are using Framer Motion
                    />
                    <div className="text-center">
                      <div className="font-medium">{score.score}</div>
                      <div className="text-sm text-gray-500">{score.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">90-100 (Good)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm">50-89 (Needs Improvement)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">0-49 (Poor)</span>
                </div>
              </div>
            </Card>
          </div>
          <motion.div
            initial={{ opacity: 0 }} // Fade out initially
            whileInView={{ opacity: 1 }} // Fade in when in view
            exit={{ opacity: 0 }} // Fade out when it leaves the view
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full mt-0  lg:w-1/3"
          >
            <Card title="Suggestions For Improving Performance" className="h-full">
              <div className="max-h-[230px] overflow-y-auto">
                <div className="space-y-4">
                  {displayedSuggestions?.map((suggestion: any, index: number) => (
                    <SuggestionItem key={index} suggestion={suggestion} index={index} showAnimation={isVisible} />
                  ))}
                </div>
              </div>
              {suggestions?.length > 3 && (
                <button onClick={handleToggle} className="mt-4 font-medium text-purple hover:text-blue-800">
                  {showAll ? "Show Less" : "Read More"}
                </button>
              )}
            </Card>
          </motion.div>
        </div>
        <div className="w-full flex flex-col gap-4">
          {/* First Block */}
          <div className="w-full border rounded-lg p-5 border-slate-200">
            <div className="bg-[#D9E9F9] px-4 py-2 rounded-lg">
              <p className="text-[16px] font-medium ml-5">Discover what your real users are experiencing</p>
            </div>
            <div className="flex flex-wrap w-full p-4 gap-8">
              {coreMetrics.map((metric: any, index: number) => (
                <AnimatePresence key={metric.key}>
                  <motion.div
                    initial={{ opacity: 0, height: "0%", width: "0%" }}
                    whileInView={{ opacity: 1, height: "100%", width: "100%" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.3 }}
                    className="flex-1 min-w-[240px] max-w-full border rounded-lg border-slate-200 p-6 shadow-md hover:shadow-lg transition-shadow duration-200"
                  >
                    <h2 className="text-xl text-center font-semibold mb-3">{metric.label}</h2>
                    <GaugeProgressBar score={metric.value} pointerColor="blue" threshold={metric.threshold} />
                    <Tooltip title={metric.description} overlayStyle={{ maxWidth: "300px" }}>
                      <p className="text-gray-600 cursor-pointer flex mt-2 items-center">
                        <AiFillSwitcher className="mr-2 text-xl" />
                        View Description
                      </p>
                    </Tooltip>
                  </motion.div>
                </AnimatePresence>
              ))}
            </div>
          </div>

          {/* Second Block (optional section for other metrics) */}
          <div className="w-full">{/* Optional: Add Card or other components here */}</div>
        </div>
      </div>
    </div>
  )
}

export default SwiftMetricsDashboard