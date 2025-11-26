"use client";
import { useState, useEffect, useRef, SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { FiMapPin } from "react-icons/fi";
import { FaCheckCircle } from "react-icons/fa";
import { opacity } from "html2canvas/dist/types/css/property-descriptors/opacity";
import Image from 'next/image'
import { useProjectContext } from "@/src/redux/providers/ProjectContext";
export default function SeoDashboard({
  Data,
  seo_score,
  All_links,
  domainScore,
  domain_information,
  total_link,
}: any) {  
  const [activeTab, setActiveTab] = useState("");
  const totalIssuesRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const missingElementsRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const duplicateContentRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const [highlightType, setHighlightType] = useState<string | null>(null);
const allPageScores = All_links?.map((page:any) => page.page_score) ?? [];

// Filter only valid numbers
const validScores = allPageScores.filter(
  (score:any): score is number => score !== null && score !== undefined
);

const totalScore = validScores.reduce((sum:any, score:any) => sum + score, 0);

// Use valid count for average (avoid divide by 0)
const averageScore = validScores.length > 0 ? totalScore / validScores.length : 0;

const domainscore = Number(domainScore?.domain_score);
const seo_score_average: number = Number((averageScore + domainscore).toFixed(0));

  
  const getHighlightClass = (issueType: any) => {
    return highlightType === issueType ? "text-red-400" : "";
  };
  const getTabClass = (tab: any) =>
    `border-b-2 px-3 py-2 text-sm font-medium transition-all duration-200 ${activeTab === tab
      ? "border-red-400 text-purple"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
    }`;
  const handleTabClick = (
    section: SetStateAction<string>,
    ref: React.RefObject<HTMLDivElement>,
    highlight?: any
  ) => {
    setActiveTab(section);
    setHighlightType(highlight);
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const [stats, setStats] = useState({
    seoScore: 0,
    totalIssues: 0,
    titleIssues: 0,
    descriptionIssues: 0,
    headingIssues: 0,
    duplicateTitles: 0,
    duplicateDescriptions: 0,
  });
  const [projectSuggestion, setProjectSuggestion] = useState<any>(null);
  useEffect(() => {
    setProjectSuggestion(Data);
  }, [Data]);
  const { projects } = useProjectContext();
  useEffect(() => {
    if (projectSuggestion) {
      const { seo_suggestions } = projectSuggestion;
      const titleIssues = seo_suggestions.title_suggestions.issues.length;
      const descriptionIssues =
        seo_suggestions.meta_description_suggestions.issues.length;
      const headingIssues = Object.keys(
        seo_suggestions.heading_suggestions.pages_with_issues
      ).length;
      const duplicateTitles =
        seo_suggestions.title_suggestions.duplicates.reduce(
          (acc: any, curr: any) => acc + curr.count,
          0
        );
      const duplicateDescriptions =
        seo_suggestions.meta_description_suggestions.duplicates.reduce(
          (acc: any, curr: any) => acc + curr.count,
          0
        );
      setStats({
        seoScore: seo_score,
        totalIssues:
          titleIssues +
          descriptionIssues +
          headingIssues +
          duplicateTitles +
          duplicateDescriptions,
        titleIssues,
        descriptionIssues,
        headingIssues,
        duplicateTitles,
        duplicateDescriptions,
      });
    }
  }, [projectSuggestion]);
  if (!projectSuggestion) return null;
  const { seo_suggestions } = projectSuggestion;
  // Function to render a simple bar chart
  const renderBarChart = (data: any, maxValue: number) => {
    return (
      <div className="flex chart1 w-full flex-col space-y-2">
        {Object.entries(data).map(([key, value], index) => {
          const numericValue = Number(value) || 0; // Ensure value is a number
          const isGreen = numericValue === 0;
          return (
            <motion.div
            key={index}
            className="flex flex-col"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <div className="mb-1 flex justify-between">
              <span
                className={`flex items-center gap-1 text-sm font-bold ${
                  isGreen ? "text-[#00976C]" : "text-[#E9333D]"
                }`}
              >
                <span>{isGreen && <FaCheckCircle fontSize={20} />}</span>
                {key.replace(/_/g, " ")}
              </span>
              <span
                className={`text-sm font-bold ${
                  isGreen ? "text-[#00976C]" : "text-[#E9333D]"
                }`}
              >
                {numericValue} Pages
              </span>
            </div>
          
            <div className="h-2.5 w-full rounded-full bg-gray-200">
  <div
    className={`h-2.5 rounded-full ${
      isGreen ? "bg-[#00976C]" : "bg-[#E9333D]"
    }`}
    style={{
      width: isGreen
        ? "100%"
        : `${maxValue > 0 ? (numericValue / maxValue) * 100 : 0}%`,
    }}
  ></div>
</div>

          </motion.div>
          
          );
        })}
      </div>
    );
  };
  // Function to render a simple pie chart using CSS
  const renderPieChart = (segments: any) => {
    const total = segments.reduce((acc: any, curr: any) => acc + curr.value, 0);
    let cumulativePercentage = 0;
    const gradientString = segments
      .map((segment: any, index: any) => {
        const startPercentage = cumulativePercentage;
        const percentage = (segment.value / total) * 100;
        cumulativePercentage += percentage;
        return `${segment.color} ${startPercentage}% ${cumulativePercentage}%`;
      })
      .join(", ");
    return (
      <div className="relative mx-auto h-40 w-40">
        <div
          className="h-full w-full rounded-full"
          style={{
            background: `conic-gradient(${gradientString})`,
          }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white">
            <span className="text-lg font-bold text-homeblack">{total}</span>
          </div>
        </div>
        <div className="mt-4">
          <ul className="flex flex-col gap-2">
            {segments.map((segment: any, index: any) => (
              <li key={index} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                ></div>
                <span className="text-sm text-homeblack">
                  {segment.label}: {segment.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  const seoData = [
    { name: "SEO Score", value: seo_score, fill: "url(#gradient)" },
  ];
  return (
    <div>
          {!domain_information?.error && 
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-lg bg-white"
      >
        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="rounded-lg bg-lightblue p-3 px-4"
        >
          <h2 className="text-xl font-bold text-homeblack">
            Suggestions For Improving Website SEO
          </h2>
        </motion.div>
        <motion.div
          className="mb-8  mt-5 flex gap-4">
          {/* SEO Score */}
          <motion.div
            className="flex w-1/3 flex-col rounded-lg bg-white p-4 shadow"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: false, amount: 0.3 }} // Ensures repeated animation
          >
            <h3 className="mb-4 text-left text-lg font-semibold text-homeblack">
              Overall SEO Score
            </h3>
            <div className="flex items-center gap-5 ">
              <div>
                <RadialBarChart
                  width={180}
                  height={180}
                  cx={90}
                  cy={90}
                  innerRadius="80%"
                  outerRadius="100%"
                  barSize={18}
                  data={[{ value: seo_score_average }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#E9333D" />
                      <stop offset="50%" stopColor="#FAC343" />
                      <stop offset="100%" stopColor="#00976C" />
                    </linearGradient>
                  </defs>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar
                    dataKey="value"
                    background
                    cornerRadius={10}
                    fill="url(#gradient)"
                    isAnimationActive={true}
                    animationDuration={2000}
                    animationEasing="ease-in-out"
                  />
                  <text
                    x={90}
                    y={90}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-3xl font-bold"
                  >
                    {seo_score_average}
                  </text>
                  <text
                    x={90}
                    y={110}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm text-gray-500"
                  >
                    of 100
                  </text>
                </RadialBarChart>
              </div>
              <motion.div >
                <p className="mt-2 text-homeblack">Website score for</p>
                <div className="flex items-center gap-1 ">
  <Image
    src={`https://www.google.com/s2/favicons?domain=${domain_information?.domain}`}
    alt={`${domain_information?.domain} favicon`}
    width={16}
    height={16}
    className="mt-1"
    unoptimized // because it's a remote image from a non-optimized domain
  />
  <h3 className="text-lg font-semibold text-homeblack truncate break-words">
    {domain_information?.domain}
  </h3>
</div>

                <p className="mt-2 flex items-center text-sm text-homeblack">
                  <FiMapPin className="mr-1 h-4 w-4 text-gray-500" />
                  {domain_information?.ip_address}
                </p>
              </motion.div>
            </div>
            <p className="mt-2 text-sm text-homeblack">
              Overall website SEO performance
            </p>
          </motion.div>
          {/* Total Issues */}
          <div className="flex flex-1 justify-between cursor-pointer flex-col gap-3">
            {/** === Total Issues Card === */}
            <motion.div
              className={`flex h-fit items-center justify-around gap-5 rounded-lg bg-white p-4 shadow ${getTabClass("titles")}`}
              onClick={() => handleTabClick("titles", totalIssuesRef, "totalIssues")}
              initial={{ opacity: 0, }} // Keep opacity and scale animations
              whileInView={{ opacity: 1, }} // Animate to full opacity and scale
              exit={{ opacity: 0, }} // Reset on exit for smooth transition
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 }}
            >
              <div>
                <h3 className="mb-2 text-lg font-semibold text-[#E9333D]">Total Issues</h3>
                <p className="mt-2 text-sm text-homeblack">
                  Issues found across your website
                </p>
              </div>
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-200 p-4">
                <p className="text-2xl font-bold text-[#E9333D]">{stats.totalIssues}</p>
              </div>
            </motion.div>
            {/** === Missing Elements Card === */}
            <motion.div
              className={`flex items-center justify-around gap-5 rounded-lg bg-white p-4 shadow ${getTabClass("descriptions")}`}
              onClick={() =>
                handleTabClick("descriptions", missingElementsRef, "missingDescriptions")
              }
              initial={{ opacity: 0, }} // Keep opacity and scale animations
              whileInView={{ opacity: 1, }} // Animate to full opacity and scale
              exit={{ opacity: 0, }} // Reset on exit for smooth transition
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 }}>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-[#E9333D]">
                  Missing Elements
                </h3>
                <p className="mt-2 text-sm text-homeblack">
                  Titles, descriptions, and headings
                </p>
              </div>
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-200 p-4">
                <p className="text-2xl font-bold text-[#E9333D]">
                  {stats.titleIssues + stats.descriptionIssues + stats.headingIssues}
                </p>
              </div>
            </motion.div>
            {/** === Duplicate Content Card === */}
            <motion.div
              className={`flex items-center justify-around gap-5 rounded-lg bg-white p-4 shadow ${getTabClass("headings")}`}
              onClick={() =>
                handleTabClick("headings", duplicateContentRef, "duplicateContent")
              }
              initial={{ opacity: 0, }} // Keep opacity and scale animations
              whileInView={{ opacity: 1, }} // Animate to full opacity and scale
              exit={{ opacity: 0, }} // Reset on exit for smooth transition
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 }}
            >
              <div>
                <h3 className="mb-2 text-lg font-semibold text-[#E9333D]">
                  Duplicate Content
                </h3>
                <p className="mt-2 text-sm text-homeblack">
                  Duplicate titles and descriptions
                </p>
              </div>
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-200 p-4">
                <p className="text-2xl font-bold text-[#E9333D]">
                  {stats.duplicateTitles + stats.duplicateDescriptions}
                </p>
              </div>
            </motion.div>
          </div>
          <motion.div
            className="w-1/3 rounded-lg p-6 shadow"
            initial={{ opacity: 0, }} // Keep opacity and scale animations
            whileInView={{ opacity: 1, }} // Animate to full opacity and scale
            exit={{ opacity: 0, }} // Reset on exit for smooth transition
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 }}
          >
            <h3 className="mb-4 text-xl font-semibold text-homeblack">
              Recommendations
            </h3>
            {renderBarChart(
              {
                "Missing Titles": stats.titleIssues,
                "Missing Descriptions": stats.descriptionIssues,
                "Heading Issues": stats.headingIssues,
                "Duplicate Titles": stats.duplicateTitles,
                "Duplicate Descriptions": stats.duplicateDescriptions,
              },
              total_link
            )}
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 border-t border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => handleTabClick("titles", totalIssuesRef)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${activeTab === "titles"
                  ? "border-purple text-purple"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
            >
              Titles
            </button>
            <button
              onClick={() => handleTabClick("descriptions", missingElementsRef)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${activeTab === "descriptions"
                  ? "border-purple text-purple"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
            >
              Descriptions
            </button>
            <button
              onClick={() => handleTabClick("headings", duplicateContentRef)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${activeTab === "headings"
                  ? "border-purple text-purple"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
            >
              Headings
            </button>
          </nav>
        </div>
        {/* Tab Content */}
        <div className="mb-6">
          {activeTab === "overview" && (
            <div>
              <div className="grid h-fit grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-xl font-semibold text-homeblack">
                    Issues by Type
                  </h3>
                  {renderBarChart(
                    {
                      "Missing Titles": stats.titleIssues,
                      "Missing Descriptions": stats.descriptionIssues,
                      "Heading Issues": stats.headingIssues,
                      "Duplicate Titles": stats.duplicateTitles,
                      "Duplicate Descriptions": stats.duplicateDescriptions,
                    },
                    total_link
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === "titles" && (
            <div className={`flex flex-wrap gap-5 ${getHighlightClass("totalIssues")}`}>
              <div className="h-inherit w-full rounded-lg border border-slate-200 p-4">
                <h3
                  className={`mb-3 rounded-lg bg-[#D9E9F9] p-2 text-xl font-semibold text-homeblack ${getHighlightClass("totalIssues")}`}
                >
                  Missing Titles ({stats.titleIssues})
                </h3>
                {seo_suggestions.title_suggestions.issues.length > 0 ? (
                  <div className=" rounded-lg p-4 max-h-[250px] overflow-auto">
                    <ul className="list-disc space-y-2 pl-5">
                      {seo_suggestions.title_suggestions.issues.map(
                        (issue: any, index: any) => (
                          <motion.li key={index} className="text-homeblack"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}>
                            <span className="font-medium">{issue.url}</span>
                          </motion.li>
                        )
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-homeblack">No missing titles found.</p>
                )}
              </div>
              <div className="max-h-[280px] w-full overflow-y-auto rounded-lg border border-slate-200 p-4">
                <h3
                className={`mb-3 rounded-lg bg-[#D9E9F9] p-2 text-xl font-semibold text-homeblack ${getHighlightClass("totalIssues")}`}
                >
                  Duplicate Titles
                </h3>
                {seo_suggestions.title_suggestions.duplicates.length > 0 ? (
                  <div className="rounded-lg p-4">
                    <ul className="list-none space-y-4 pl-5">
                      {seo_suggestions?.title_suggestions?.duplicates.map(
                        (duplicate: any, index: any) => (
                          <li key={index} className="text-homeblack">
                            <div className="w-full rounded-lg bg-slate-200 p-2 font-medium">
                              {duplicate.title}
                            </div>
                            <div className="mt-4 text-sm">
                              <span className="font-medium">
                                URLs: (used {duplicate.count} times)
                              </span>
                              <ul className="mt-1 list-disc pl-5">
                                {duplicate.urls.map(
                                  (url: any, urlIndex: any) => (
                                    <li key={urlIndex} className="list-disc text-sm">
                                      {url}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-homeblack">No duplicate titles found.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "descriptions" && (
            <div
              className={`flex flex-wrap gap-5 ${getHighlightClass("missingDescriptions")}`}
              ref={missingElementsRef}
            >
              <div className="max-h-[250px] w-full overflow-y-auto rounded-lg border border-slate-200 p-4">
                <h3
                  className={`mb-3 rounded-lg bg-[#D9E9F9] p-2 text-xl font-semibold text-homeblack ${getHighlightClass("missingDescriptions")}`}
                >
                  Missing Descriptions ({stats.descriptionIssues})
                </h3>
                {seo_suggestions.meta_description_suggestions.issues.length > 0 ? (
                  <div className="rounded-lg p-4">
                    <ul className="list-disc space-y-2 pl-5">
                      {seo_suggestions.meta_description_suggestions.issues.map(
                        (issue: any, index: any) => (
                          <motion.li key={index} className="text-homeblack"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}>
                            <span className="text-sm">{issue.url}</span>
                          </motion.li>
                        )
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-homeblack">No missing descriptions found.</p>
                )}
              </div>
              <div className="max-h-[390px] w-full overflow-y-auto rounded-lg border border-slate-200 p-4">
                <h3
                  className={`mb-3 rounded-lg bg-[#D9E9F9] p-2 text-xl font-semibold text-homeblack`}
                >
                  Duplicate Descriptions
                </h3>
                {seo_suggestions.meta_description_suggestions.duplicates.length > 0 ? (
                  <div className="rounded-lg p-4">
                    <ul className="list-disc space-y-4 pl-5">
                      {seo_suggestions.meta_description_suggestions.duplicates.map(
                        (duplicate: any, index: any) => (
                          <li key={index} className="text-homeblack">
                            <div className="font-medium">
                              Used on {duplicate.count} pages:
                            </div>
                            <div className="mt-1 rounded border border-gray-200 bg-slate-200 p-2 text-sm italic">
                              {duplicate.meta_description}
                            </div>
                            <div className="mt-2 text-sm">
                              <span className="font-medium">URLs:</span>
                              <ul className="mt-1 list-disc pl-5">
                                {duplicate.urls.map(
                                  (url: any, urlIndex: any) => (
                                    <li key={urlIndex} className="text-sm">
                                      {url}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-homeblack">No duplicate descriptions found.</p>
                )}
              </div>
            </div>
          )}
          {activeTab === "headings" && (
            <div
              className={`${getHighlightClass("duplicateContent")}`}
              ref={duplicateContentRef}
            >
              <div className="mb-6 max-h-[290px] overflow-y-auto ">
                <div className="border border-gray-200 mb-6 rounded-lg p-4">
                  <h3 className="mb-3 rounded-lg bg-[#D9E9F9] p-2 text-xl font-semibold text-homeblack">
                    Heading Suggestions
                  </h3>
                  {seo_suggestions.heading_suggestions.suggestions.length > 0 ? (
                    <div className="mb-4 rounded-lg p-4">
                      <ul className="list-disc pl-4">
                        {seo_suggestions.heading_suggestions.suggestions.map(
                          (suggestion: any, index: any): any => (
                            <motion.li key={index} className="text-homeblack"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1, duration: 0.3 }}>
                              {suggestion}
                            </motion.li>
                          )
                        )}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-homeblack">No heading suggestions found.</p>
                  )}
                </div>
                <div className="mt-3 border border-gray-200 rounded-lg p-4">
                  <h4 className="mb-2 rounded-lg bg-[#D9E9F9] p-2 text-lg font-semibold text-homeblack">
                    Pages with Heading Issues ({stats.headingIssues})
                  </h4>
                  {Object.keys(seo_suggestions.heading_suggestions.pages_with_issues).length > 0 ? (
                    <div className="rounded-lg p-4">
                      <ul className="list-disc space-y-2 pl-5">
                        {Object.entries(
                          seo_suggestions.heading_suggestions.pages_with_issues
                        ).map(([url, issues], index) => (
                          <li key={index} className="text-homeblack">
                            <span className="font-medium">{url}</span>:{" "}
                            {Array.isArray(issues) ? issues.join(", ") : "No issues found"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-homeblack">No heading issues found.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
                }
    </div>
  );
}