"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Link2,
  LinkIcon,
  XCircle
} from "lucide-react";
import Image from 'next/image';
import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import { FaCheckCircle } from "react-icons/fa";
import { FiMapPin } from "react-icons/fi";
import { MdCancel } from "react-icons/md";
import { PiWarningCircle } from "react-icons/pi";
import { RxLinkBreak2 } from "react-icons/rx";
import { useInView } from "react-intersection-observer";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { toast } from "sonner";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

interface AnalysisState {
  internal_links: any[];
  external_links: any[];
  broken_links: any[];
  total_internal: number;
  total_external: number;
  total_broken: number;
}
export default function CrawledData({ Data, domain_information }: any) {
  const [responseData, setResponseData] = useState<AnalysisState | null>(null);
  const [filterText, setFilterText] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [seo_score, setseo_score] = useState<any>("N/A");
  const [showImageAlts, setShowImageAlts] = useState(false);
  const [showdomain_information, setShowdomain_information] =
    useState<any>(false);
  const [showh1tags, seth1tags] =
    useState<any>(false);
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  const toggleExpanded = (tag: string) => {
    setExpandedTags(prev => ({
      ...prev,
      [tag]: !prev[tag],
    }));
  };

  useEffect(() => {
    setseo_score(Data?.page_score);
  }, [Data]);
  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.info("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };
  const chartData = {
    labels: ["Internal Links", "External Links", "Broken Links"],
    datasets: [
      {
        data: [
          Data?.internal_links?.length || 0,
          Data?.external_links?.length || 0,
          Data?.broken_links?.length || 0,
        ],
        backgroundColor: ["#1688C9", "#36BAFC", "#E9333D"],
        borderColor: ["#1688C9", "#36BAFC", "#E9333D"],
        borderWidth: 1,
      },
    ],
  };
  const [filteredLinks, setFilteredLinks] = useState({
    internal: [],
    external: [],
    broken: [],
  });

  const filteredAndSortedLinks: any = useMemo(() => {
    if (!responseData) return { internal: [], external: [], broken: [] };

    // Filter links based on the text and type
    const filterLinks = (links: any[]) => {
      return links?.filter((link) => {
        const matchesFilter =
          link?.url?.toLowerCase().includes(filterText.toLowerCase()) ||
          (link?.text &&
            link.text.toLowerCase().includes(filterText.toLowerCase()));
        const matchesType =
          selectedType === "all" || link.type === selectedType;
        return matchesFilter && matchesType;
      });
    };

    return {
      internal: filterLinks(responseData.internal_links || []),
      external: filterLinks(responseData.external_links || []),
      broken: filterLinks(responseData.broken_links || []),
    };
  }, [responseData, filterText, selectedType]);

  useEffect(() => {
    setFilteredLinks(filteredAndSortedLinks);
  }, [filteredAndSortedLinks]);

  const totalDofollowInternal = Data?.internal_links
    ? Object.values(Data.internal_links).filter(
      (link: any) => link.type === "dofollow",
    ).length
    : 0;
  const totalDofollowExternal = Data?.external_links
    ? Object.values(Data.external_links).filter(
      (link: any) => link.type === "dofollow",
    ).length
    : 0;
  const totalDofollowBroken = Data?.broken_links
    ? Object.values(Data.broken_links).filter(
      (link: any) => link.type === "dofollow",
    ).length
    : 0;

  const totalDofollow =
    totalDofollowInternal + totalDofollowExternal + totalDofollowBroken;

  const totalNofollow = Math.max(
    Object.values(Data?.internal_links || {}).length +
    Object.values(Data?.external_links || {}).length +
    Object.values(Data?.broken_links || {}).length -
    totalDofollow,
    0,
  );

  const renderSection = (
    title: string,
    content: React.ReactNode,
    optimal: boolean,
    link: any,
    isLastItem?: boolean
  ) => (
    <motion.div initial={{ opacity: 0 }} // Fade out initially
      whileInView={{ opacity: 1 }} // Fade in when in view
      exit={{ opacity: 0 }} // Fade out when it leaves the view
      transition={{ duration: 0.5, delay: 0.3 }}
      className={`overflow-hidden rounded-lg border bg-white p-6 shadow-sm  ${isLastItem ? 'col-span-full' : ''}`}>
      <div className="relative mb-4 flex w-full items-center gap-2">
        <div className="bg-purple-500 flex h-6 w-6 items-center justify-center rounded-full">
          {optimal ? (
            <FaCheckCircle className="text-xl text-green-500" />
          ) : (
            <MdCancel className="text-2xl text-red-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-homeblack">{title}</h3>
        {/* {link ?
                    <Link
                        href={link}
                        className="flex items-end  px-4 py-2 bg-pink text-white rounded-md justify-end right-0 absolute hover:scale-105 smooth3 ">Detailed Analysis</Link>
                    : ""} */}
      </div>
      <div className="space-y-4 rounded-md border px-8 py-4">{content}</div>
    </motion.div>
  );
  const seoData = [
    { name: " Page SEO Score", value: seo_score, fill: "url(#gradient)" }, // Foreground with gradient
    // { name: "Full", value: 100, fill: "#E0E0E0" }, // Light gray background
  ];
  // const HeadingTable = ({ Data }: { Data: any }) => {
  // const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  // const toggleExpanded = (tag: string) => {
  //   setExpandedTags(prev => ({ ...prev, [tag]: !prev[tag] }));
  // };

  return (
    <div className="min-h-screen">
      <main className="">
        <AnimatePresence>
          {/* {responseData && ( */}
          <section
            className="space-y-8"
          >
            {/* Statistics Cards */}
            <motion.div initial={{ opacity: 0 }} // Fade out initially
              whileInView={{ opacity: 1 }} // Fade in when in view
              exit={{ opacity: 0 }} // Fade out when it leaves the view
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-1 rounded-lg bg-lightblue p-2 px-4"
            >
              <h3 className="text-xl font-semibold text-homeblack">
                Link Analysis:
              </h3>
            </motion.div>
            <div
              className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-6"
            >
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.2 }}>
                <StatsCard
                  title="Total Links"
                  count={
                    Data?.internal_links?.length +
                    Data?.external_links?.length +
                    Data?.broken_links?.length
                  }
                  icon={<LinkIcon />}
                  // color="pink"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.3 }}>
                <StatsCard
                  title="Internal Links"
                  count={Data?.internal_links?.length || 0}
                  icon={<Link2 className="-rotate-45 text-xl" />}
                  // color="orange"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.4 }}>
                <StatsCard
                  title="External Links"
                  count={Data?.external_links?.length || 0}
                  icon={<ExternalLink />}
                  // color="yellow"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.5 }}>
                <StatsCard
                  title="Broken Links"
                  count={Data?.broken_links?.length || 0}
                  icon={<RxLinkBreak2 className="text-2xl" />}
                  // color="red"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.6 }}>
                <StatsCard
                  title="Dofollow Links"
                  count={totalDofollow}
                  icon={<CheckCircle />}
                  // color="blue"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.7 }}>
                <StatsCard
                  title="Nofollow Links"
                  count={totalNofollow}
                  icon={<XCircle />}
                  // color="green"
                />
              </motion.div>
            </div>
            {/* Charts */}
            <div className="grid gap-6 text-homeblack md:grid-cols-3">
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col  rounded-lg bg-white p-4 shadow"
              >
                <h3
                  className="mb-4 text-left text-lg font-semibold text-homeblack"
                >
                  Page SEO Score
                </h3>
                <div className="flex items-center gap-5">
                  <div
                  >
                    {/* Circular Graph */}
                    <RadialBarChart
                      width={180}
                      height={180}
                      cx={90}
                      cy={90}
                      innerRadius="80%"
                      outerRadius="100%"
                      barSize={18}
                      data={seoData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {/* Animated Gradient Definition */}
                      <defs>
                        <linearGradient
                          id="gradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="1"
                        >
                          <motion.stop
                            initial={{ stopColor: "#E9333D" }}
                            animate={{
                              stopColor: ["#E9333D", "#FAC343", "#00976C"],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatType: "reverse",
                            }}
                            offset="0%"
                          />
                          <motion.stop
                            initial={{ stopColor: "#FAC343" }}
                            animate={{
                              stopColor: ["#FAC343", "#00976C", "#E9333D"],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatType: "reverse",
                            }}
                            offset="50%"
                          />
                          <motion.stop
                            initial={{ stopColor: "#00976C" }}
                            animate={{
                              stopColor: ["#00976C", "#E9333D", "#FAC343"],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatType: "reverse",
                            }}
                            offset="100%"
                          />
                        </linearGradient>
                      </defs>

                      <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                      />
                      <RadialBar
                        dataKey="value"
                        background
                        cornerRadius={10}
                        animationBegin={300}
                        animationDuration={1500}
                      />
                      <text
                        x={90}
                        y={90}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-3xl font-bold text-black"
                      >
                        {seo_score}
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
                  <div
                  >
                    <p
                      className="mt-2 text-homeblack"
                    >
                      Website score for
                    </p>
                    <h3
                      className="mb-2 flex items-center text-lg font-semibold text-homeblack"
                    >
                      <span
                        // animate={{
                        //   color: ["#FF6F61", "#FFC107", "#4CAF50"],
                        //   transition: {
                        //     duration: 3,
                        //     repeat: Infinity,
                        //     repeatType: "reverse",
                        //   },
                        // }}
                        className="mr-1 mt-1 flex-shrink-0"
                      >
                        <FiMapPin className=" text-[#4CAF50] mr-3 h-4 w-4" />
                      </span>
                      <div className="flex items-center gap-2">
                        {Data?.canonical_url?.content ? (
                          <>
                            <Image
                              src={`https://www.google.com/s2/favicons?domain=${new URL(Data.canonical_url.content).hostname}`}
                              alt="Favicon"
                              width={16}
                              height={16}
                              unoptimized
                              className="mt-0.5"
                            />
                            <span className="overflow-hidden whitespace-normal break-all">
                              {Data.canonical_url.content}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">Not found</span>
                        )}
                      </div>
                    </h3>
                  </div>
                </div>
                <p
                  className="mt-2 text-sm text-homeblack"
                >
                  Overall website SEO performance
                </p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-xl chart1 bg-white p-6 shadow-lg"
              >
                <h3 className="mb-4 text-lg font-semibold">
                  Link Distribution
                </h3>
                <div className="h-64 ">
                  <Pie
                    data={chartData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-xl chart1 bg-white p-6 shadow-lg"
              >
                <h3 className="mb-4 text-lg font-semibold">
                  Dofollow vs Nofollow
                </h3>
                <div className="h-64 ">
                  <Bar
                    data={{
                      labels: ["Dofollow", "Nofollow"],
                      datasets: [
                        {
                          label: "Number of Links",
                          data: [totalDofollow, totalNofollow],
                          backgroundColor: ["#1688C9", "#E9333D"],
                          borderColor: ["#1688C9", "#E9333D"],
                          borderWidth: 2,
                          hoverBackgroundColor: ["#1688C9", "#E9333D"],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          callbacks: {
                            label: (tooltipItem) => {
                              return `${tooltipItem.label}: ${tooltipItem.raw}`;
                            },
                          },
                        },
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: "Number of Links",
                            font: {
                              size: 14,
                              weight: "bold",
                            },
                          },
                          grid: {
                            color: "rgba(0, 0, 0, 0.1)",
                          },
                          ticks: {
                            font: {
                              size: 12,
                            },
                          },
                        },
                        y: {
                          title: {
                            display: true,
                            text: "Type of Links",
                            font: {
                              size: 14,
                              weight: "bold",
                            },
                          },
                          grid: {
                            color: "rgba(0, 0, 0, 0.1)",
                          },
                          ticks: {
                            font: {
                              size: 12,
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </motion.div>
            </div>
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.3 }}>

                <LinkList
                  title="Unique Internal Links"
                  links={Data?.internal_links}
                  icon={<LinkIcon className="h-5 w-5 text-blue" />}
                  onCopy={handleCopyLink}
                />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.3 }}>

                <LinkList
                  title=" Unique External Links"
                  links={Data?.external_links}
                  icon={<ExternalLink className="h-5 w-5 text-green-600" />}
                  onCopy={handleCopyLink}
                />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} // Fade out initially
                whileInView={{ opacity: 1 }} // Fade in when in view
                exit={{ opacity: 0 }} // Fade out when it leaves the view
                transition={{ duration: 0.5, delay: 0.3 }}>

                <LinkList
                  title="Unique Broken Links"
                  links={Data?.broken_links}
                  icon={
                    Data?.broken_links?.length > 0 ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )
                  }
                  onCopy={handleCopyLink}
                />
              </motion.div>

            </div>

            <div className="grid gap-6 rounded-md  md:grid-cols-2">
              {renderSection(
                "Title Tag",
                <>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Title Tag:
                    </div>
                    <div>
                      {Data?.title?.content ? Data.title?.content : "Not Found"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Length:
                    </div>
                    <div>
                      {Data?.title?.length ? Data?.title?.length : "0"}{" "}
                      Character(s)
                    </div>
                  </div>
                  {Data?.title?.warnings.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-lightblue p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-homeblack">
                        <PiWarningCircle color="red" fontSize={20} />
                        <span>Warnings:</span>
                      </div>
                      {Data?.title?.warnings?.map((elem: any, index: any) => (
                        <div key={index}>• {elem}</div>
                      ))}
                    </div>
                  )}
                </>,
                Data?.title?.valid,
                null,
              )}
              {renderSection(
                "Meta Description",
                <>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Meta Description:
                    </div>
                    <div>
                      {Data?.meta_description?.content
                        ? Data?.meta_description?.content
                        : "Not Found"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Length:
                    </div>
                    <div>
                      {Data?.meta_description?.length
                        ? Data?.meta_description?.length
                        : "0"}{" "}
                      Character(s)
                    </div>
                  </div>
                  {Data?.meta_description?.warnings.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-lightblue p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-homeblack">
                        <PiWarningCircle color="red" fontSize={20} />
                        <span>Warnings:</span>
                      </div>
                      {Data?.meta_description?.warnings?.map(
                        (elem: any, index: number) => (
                          <div key={index}>• {elem}</div>
                        ),
                      )}
                    </div>
                  )}
                </>,
                Data?.meta_description?.valid,
                null,
              )}
              {renderSection(
                "Robots Meta",
                <>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Robots Meta:
                    </div>
                    <div>
                      {Data?.robots_meta?.content
                        ? Data?.robots_meta?.content
                        : "Not Found"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Index Status:
                    </div>
                    <div>
                      {Data?.robots_meta?.index_status
                        ? Data?.robots_meta?.index_status
                        : "Not Found"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Follow Status:
                    </div>
                    <div>
                      {Data?.robots_meta?.follow_status
                        ? Data?.robots_meta?.follow_status
                        : "Not Follow"}
                    </div>
                  </div>
                </>,
                Data?.robots_meta?.valid,
                null,
              )}
              {renderSection(
                "Images",
                <>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      {" "}
                      Total Images:
                    </div>
                    <div>{Data?.images?.total_images}</div>
                  </div>
                  {/* <div>
                                        <div className="text-sm text-homeblack font-semibold">  Images Without Alt Text:</div>
                                        <div>{Data?.images?.images_without_alt}</div>
                                    </div> */}
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Images without{" "}
                      <span className="text-red-500"> Alt Text:</span>
                    </div>
                    <div>{Data?.images?.alt_text_analysis?.message}</div>
                  </div>
                  {Data?.images?.alt_text_analysis?.images_without_alt_details
                    ?.length > 0 && (
                      <div className="flex flex-col max-h-[250px]">
                        <div className="text-sm font-semibold text-homeblack">
                          Images without{" "}
                          <span className="text-red-500">Alt URLs:</span>
                        </div>
                        <ul className="list-disc pl-5 flex-1 overflow-y-auto">
                          {Data.images.alt_text_analysis.images_without_alt_details.map(
                            (url: any, index: any) => (
                              <li key={index}>{url?.url}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </>,
                Data?.images?.images_without_alt == "0",
                "/image-alt-text-checker",
              )}
              {renderSection(
                "Seo Friendly",
                <>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Protocole Used:
                    </div>
                    <div>
                      {Data?.seo_friendly?.protocol
                        ? Data?.seo_friendly?.protocol
                        : "Not Found"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Canonical Url:
                    </div>
                    <div>
                      {Data?.canonical_url?.content
                        ? Data?.canonical_url?.content
                        : "Not found"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Hyphen Used:
                    </div>
                    <div>
                      {Data?.seo_friendly?.hyphen_used
                        ? Data?.seo_friendly?.hyphen_used
                        : "false"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Url Contains Numbers:
                    </div>
                    <div>
                      {Data?.seo_friendly?.contains_numbers
                        ? " Contains"
                        : "Not Contain"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      {" "}
                      Url Contains Special Characters
                    </div>
                    <div>
                      {Data?.seo_friendly?.contains_special_characters
                        ? "Contains"
                        : "Not Contain"}
                    </div>
                  </div>
                  {Data?.seo_friendly?.warnings.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-lightblue p-4">
                      <div className="item-center flex gap-2 text-sm font-semibold text-homeblack">
                        <PiWarningCircle color="red" fontSize={20} />
                        <span>Warnings:</span>
                      </div>
                      {Data?.seo_friendly?.warnings?.map(
                        (elem: any, index: number) => (
                          <div key={index}>• {elem}</div>
                        ),
                      )}
                    </div>
                  )}
                </>,
                Data?.seo_friendly?.valid,
                null,
              )}
              {renderSection(
                "Headings",
                <>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      H1 Tag:
                    </div>
                    <div>
                      {Data?.headings?.h1.length > 0 ? "Present" : "Missing"}
                    </div>
                    {Data?.headings?.h1.length === 0 ? (
                      <div>Not Found</div>
                    ) : (
                      <ul className="list-disc pl-5 max-h-[200px] overflow-y-auto">
                        {Data?.headings?.h1
                          .slice(0, showh1tags ? Data.headings?.h1.length : 1)
                          .map((ns: string, index: number) => (
                            <li key={`ns-${index}`}>{ns}</li>
                          ))}
                        {!showh1tags && Data?.headings?.h1.length > 1 && (
                          <li
                            onClick={() => seth1tags(true)}
                            className="smooth1 flex cursor-pointer items-center font-semibold text-purple hover:underline"
                          >
                            {Data.headings?.h1.length - 1} more
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </li>
                        )}
                        {showh1tags && Data?.headings?.h1.length > 1 && (
                          <li
                            onClick={() => seth1tags(false)}
                            className="smooth1 mt-2 flex cursor-pointer items-center font-semibold text-purple hover:underline"
                          >
                            Show less
                            <ChevronUp className="ml-1 h-4 w-4" />
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 text-sm font-semibold text-homeblack">
                      H1-H6 Header Tag Usage
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                    <table className="w-full">
      <thead className="text-black">
        <tr className="bg-gray-50">
          <th className="p-3 text-left text-sm font-medium">Header Tag</th>
          <th className="p-3 text-left text-sm font-medium">Frequency</th>
          <th className="p-3 text-left text-sm font-medium">Content</th>
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3, 4, 5, 6].map((elem: number) => {
          const tag = `h${elem}`;
          const count = Data?.headings?.[`${tag}_count`] || 0;
          const texts: string[] = Data?.headings?.all_headings_texts?.[tag] || [];
          const isExpanded = expandedTags[tag] || false;
          const shouldShowToggle = texts.length > 2;
          const visibleTexts = isExpanded ? texts : texts.slice(0, 2);
          return (
            <tr key={tag} className="border-t align-top">
              <td className="p-3 text-sm">Number of {tag.toUpperCase()}</td>
              <td className="p-3 text-sm">{count}</td>
              <td className="p-3 text-sm">
                {texts.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto bg-slate-100 p-2 rounded">
                    <ol className="list-decimal ml-4 text-sm text-gray-800">
                      {visibleTexts.map((text, i) => (
                        <li key={i} className="mb-1">{text}</li>
                      ))}
                    </ol>
                    {shouldShowToggle && (
                      <button
                        onClick={() => toggleExpanded(tag)}
                        className="mt-2 text-purple  text-sm font-semibold hover:underline"
                      >
                        {isExpanded ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">No Content</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
                    </div>
                    {Data?.headings?.warnings.length > 0 && (
                      <div className="mt-5 rounded-lg border border-slate-200 bg-lightblue p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-homeblack">
                          <PiWarningCircle fontSize={20} color="red" />
                          <span>Warnings:</span>
                        </div>
                        {Data?.headings?.warnings?.map(
                          (elem: any, index: any) => (
                            <div key={index}>• {elem}</div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                  </div>
                </>,
                Data?.headings?.valid,
                "/image-alt-text-checker",
              )}
              {renderSection(
                "Schema Message",
                <>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Message{" "}
                    </div>
                    <div>
                      {Data?.schema_message
                        ? Data?.schema_message
                        : "Not Found"}
                    </div>
                  </div>
                </>,
                Data?.schema_message,
                null,
              )}
              {renderSection(
                "Word Count",
                <>
                  <div>
                    <div className="text-sm font-semibold text-homeblack">
                      Total Words found On Page{" "}
                    </div>
                    <div>{Data?.word_count ? Data?.word_count : "0"}</div>
                  </div>
                </>,
                Data?.schema_message,
                null,
              )}
              {
                renderSection(
                  "Domain Details",
                  <>
                    <div className="grid grid-cols-1 space-y-2 lg:grid-cols-2">
                      <div>
                        <div className="text-sm font-semibold text-homeblack">
                          Domain:
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {domain_information?.domain && (
                            <Image
                              src={`https://www.google.com/s2/favicons?domain=${domain_information.domain}`}
                              alt={`${domain_information.domain} favicon`}
                              width={16}
                              height={16}
                              unoptimized
                              className="mt-0.5"
                            />
                          )}
                          <span className="break-all">{domain_information?.domain || 'Not found'}</span>
                        </div>
                      </div>

                      <div className="">
                        <div className="text-sm font-semibold text-homeblack">
                          Domain Age:
                        </div>
                        <div>{domain_information?.domain_age}</div>
                      </div>
                      <div className="">
                        <div className="text-sm font-semibold text-homeblack">
                          Sub Domain:
                        </div>
                        <div>{domain_information?.subdomain || "N/A"}</div>
                      </div>
                      <div className="">
                        <div className="text-sm font-semibold text-homeblack">
                          IP Address:
                        </div>
                        <div>{domain_information?.ip_address}</div>
                      </div>
                      <div className="">
                        <div className="text-sm font-semibold text-homeblack">
                          Domain Country:
                        </div>
                        <div>{domain_information?.country}</div>
                      </div>
                      <div className="">
                        <div className="text-sm font-semibold text-homeblack">
                          Registrar:
                        </div>
                        <div>{domain_information?.registrar}</div>
                      </div>
                      <div className="">
                        <div className="text-sm font-semibold text-homeblack">
                          Creation Date:
                        </div>
                        <div>{domain_information?.creation_date}</div>
                      </div>
                      <div className="">
                        <div className="text-sm font-semibold text-homeblack">
                          Expiration Date:
                        </div>
                        <div>{domain_information?.expiry_date}</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-homeblack">
                          Name Servers:
                        </div>
                       {Array.isArray(domain_information?.name_servers) ? (
  domain_information.name_servers.length === 0 ? (
    <div>Not Found</div>
  ) : (
    <ul className="list-disc pl-5 max-h-[200px] overflow-y-auto">
      {domain_information.name_servers
        .slice(
          0,
          showdomain_information
            ? domain_information.name_servers.length
            : 1
        )
        .map((ns: string, index: number) => (
          <li key={`ns-${index}`}>{ns}</li>
        ))}

      {!showdomain_information &&
        domain_information.name_servers.length > 1 && (
          <li
            onClick={() => setShowdomain_information(true)}
            className="smooth1 flex cursor-pointer items-center font-semibold text-purple hover:underline"
          >
            {domain_information.name_servers.length - 1} more
            <ChevronDown className="ml-1 h-4 w-4" />
          </li>
        )}

      {showdomain_information &&
        domain_information.name_servers.length > 1 && (
          <li
            onClick={() => setShowdomain_information(false)}
            className="smooth1 mt-2 flex cursor-pointer items-center font-semibold text-purple hover:underline"
          >
            Show less
            <ChevronUp className="ml-1 h-4 w-4" />
          </li>
        )}
    </ul>
  )
) : (
  <div>Not Found</div>
)}

                      </div>
                    </div>
                  </>,
                  domain_information,
                  null,
                  true
                )}
            </div>
            {/* Filters */}
            {/* <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
                <div className="flex flex-wrap gap-4">
                <div className="flex-1">
                    <input
                    type="text"
                    placeholder="Filter links..."
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue outline-none"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="p-2 px-4 border rounded-lg outline-none"
                >
                    <option value="all">All Types</option>
                    {availableLinkTypes.map((type) => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                    ))}
                </select>
                </div>
              </div> */}
            {/* Export Button */}
            {/* <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    const jsonStr = JSON.stringify(responseData, null, 2)
                                    const blob = new Blob([jsonStr], { type: "application/json" })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement("a")
                                    a.href = url
                                    a.download = "link-analysis.json"
                                    a.click()
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Export Results
                            </button>
                        </div> */}
          </section>
          {/* )} */}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatsCard({ title, count, icon, color }: any) {
  const colorClasses: any = {
    blue: "bg-lightblue text-purple",
    pink: "bg-[#E2F2E9] text-purple",
    green: "bg-[#FAF0CC] text-purple",
    red: "bg-[#FAD6E9] text-purple",
    yellow: "bg-[#7ecff7] text-primary",
    orange: "bg-[#59b3e0]",
  };

  return (
    <div
      className={`rounded-xl p-6 shadow-lg hover:scale-105 duration-100 ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-lg font-medium text-homeblack"
          >
            {title}
          </p>
          <p
            className="mt-2 text-3xl font-bold text-homeblack"
          >
            {count}
          </p>
        </div>
        <div
          className="rounded-lg bg-white bg-opacity-30 p-3"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
interface Link {
  url: string;
  text?: string;
  type: "dofollow" | "nofollow";
  source: string;
}

interface LinkListProps {
  title: string;
  links: Link[];
  icon?: any;
  onCopy: (url: string) => void;
}

const LinkList: React.FC<LinkListProps> = ({ title, links, icon, onCopy }) => {
  const { ref, inView } = useInView({
    threshold: 0.1, // trigger when 10% of it is visible
    triggerOnce: true, // Only trigger once
  });

  return (
    <div className="rounded-xl bg-white p-6 text-homeblack shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-xl font-bold">{title}</h3>
        <span className="text-md">({links?.length})</span>
      </div>
      {links && links.length > 0 && (
        <div
          ref={ref}
          className={`relative isolate  rounded-lg transition-all duration-300 ${inView ? "max-h-[400px] overflow-auto opacity-100" : "h-full"
            }`}
          style={{ transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out' }}
        >
          <table className="min-w-full border border-gray-300 text-center shadow-md">
            <thead className="sticky top-0 !z-[100] bg-[#5b758f] bg-clip-padding shadow-lg backdrop-blur-0">
              <tr className="bg-[#D9E9F9]">
                <th className="border p-3">Link</th>
                <th className="border p-3">Link Text</th>
                <th className="border p-3">Link Type</th>
                <th className="border p-3">Source</th>
                {title === "Unique Broken Links" && <th className="border p-3">Status Code</th>}
                {/* {title === "Unique Broken Links" && <th className="border p-3">Status Code</th>} */}
                <th className="border p-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {links?.map((link: any, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`transition-colors ${index % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-gray-200`} >
                  <td className="max-w-[200px] truncate border p-3 !text-start">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary-dark block truncate text-primary transition-colors"
                    >
                      {link.url}
                    </a>
                  </td>
                  <td className="truncate border p-3">{link.text || "-"}</td>
                  <td className="border p-3">
                    {link.type === "dofollow" ? "Do Follow" : "No Follow"}
                  </td>
                  <td className="border p-3">{link.source}</td>
                  {title === "Unique Broken Links" && (
                    <td className="border p-3">{link.status_code}</td>
                  )}                  <td className="border p-3">
                    <button
                      onClick={() => onCopy(link.url)}
                      className="rounded-lg p-2 transition-colors hover:bg-gray-200 hover:text-gray-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};