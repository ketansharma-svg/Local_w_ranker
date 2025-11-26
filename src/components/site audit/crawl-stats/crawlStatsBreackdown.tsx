import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image';
import React, { useState } from 'react'
import { motion } from "framer-motion";
import Spkapexcharts from '../../spk-packages/apexcharts-component';
import { BsInfo } from 'react-icons/bs';
import { FiRefreshCw } from 'react-icons/fi';

const CrawlStatsBreackdown = ({ siteIssues, sitedetails }: any) => {    

    const [crawlStatsD, setcrawlStatsD] = useState("7D")
    const [crawlStatsType, setcrawlStatsType] = useState("table")
    const [crawnStatusChart, setCrawnStatusChart] = useState("stacked")

    const handleClearFilters = () => {
        setcrawlStatsType("table")
        setcrawlStatsD("7D")
        setCrawnStatusChart("stacked")
    }

    const statusDescriptions: Record<number, string> = {
  200: "OK (Successful)",
  301: "Moved Permanently (Redirect)",
  302: "Found (Redirect)",
  304: "Not Modified",
  404: "Not Found",
  410: "Gone",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

const links = sitedetails?.result?.links || [];

const statusCodeDistribution = links.reduce(
  (acc:any, item:any) => {
    const status = item?.redirect_status;
    const chainLength = item?.redirect_chain?.length || 0;

    if (chainLength > 1) {
      acc.redirect += 1;
    }
    else if (status === 200) {
      acc.success += 1;
    }
    else if (status >= 400 && status < 500) {
      acc.clientError += 1;
    }
    else if (status >= 500 && status < 600) {
      acc.serverError += 1;
    }

    return acc;
  },
  { success: 0, redirect: 0, clientError: 0, serverError: 0 }
);

// Map distribution into series for ApexPie
const Basicpieseries = [
  statusCodeDistribution.success,
  statusCodeDistribution.redirect,
  statusCodeDistribution.clientError,
  statusCodeDistribution.serverError,
];

// Config
const Basicpieoptions = {
  chart: {
    height: 300,
    type: "pie",
    events: {
      mounted: (chart: { windowResizeHandler: () => void }) => {
        chart.windowResizeHandler();
      },
    },
  },
  colors: ["#10B981", "#6d8bbd", "#4286F5", "#E94134"],
  labels: [
    "200 OK",
    "Redirect (3xx)",
    "Client Error (4xx)",
    "Server Error (5xx)",
  ],
  legend: {
    position: "bottom",
  },
  dataLabels: {
    dropShadow: {
      enabled: false,
    },
  },
};

// reduce into grouped summary
// reduce into grouped summary (no generic "Other statuses")
const statusSummary = links.reduce((acc: any, item: any) => {
  const rawStatus = item.redirect_chain?.[0]?.status_code;
  const code = typeof rawStatus === "number" ? rawStatus : null;
  const codeKey = code !== null ? String(code) : "no-status";
  const responseTime = item.initial_response_time_ms || 0;

  if (!acc[codeKey]) {
    // build a clear, user-friendly description
    let description = "Status not reported";

    if (code !== null) {
      if (statusDescriptions[code]) {
        // exact mapping from our dictionary
        description = statusDescriptions[code];
      } else if (code >= 200 && code < 300) {
        description = "2xx Success (Unmapped specific code)";
      } else if (code >= 300 && code < 400) {
        description = "3xx Redirect (Unmapped specific code)";
      } else if (code >= 400 && code < 500) {
        description = "4xx Client Error (Unmapped specific code)";
      } else if (code >= 500 && code < 600) {
        description = "5xx Server Error (Unmapped specific code)";
      } else {
        description = "Custom HTTP status from server";
      }
    }

    acc[codeKey] = {
      httpStatus: code !== null ? String(code) : "—",
      description,
      requests: 0,
      totalResponseTime: 0,
    };
  }

  acc[codeKey].requests += 1;
  acc[codeKey].totalResponseTime += responseTime;

  return acc;
}, {});


// convert to array + compute avg response time
const summaryArray = Object.values(statusSummary).map((entry: any) => ({
  ...entry,
  avgResponseTime: entry.requests > 0 
    ? (entry.totalResponseTime / entry.requests).toFixed(2) 
    : 0,
}));

    return (
        <Card className="border border-gray-200 mt-4">
            <CardHeader>
                <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                    <div className="flex text-[18px] font-semibold gap-1 items-center">
                        <h2 className="text-[18px] font-semibold">Crawl Status Breakdown</h2>
                        <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                    </div>
                    <div className="flex items-center flex-wrap gap-5">

                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className='mt-0'>
                <div className='flex justify-between pb-2'>
                    <div className=' flex items-center gap-5 '>
                        <div className=' border rounded  flex '>
                            <button
                                onClick={() => setcrawlStatsType("table")}
                                className={`text-[14px] font-normal cursor-pointer ${crawlStatsType === "table" ? " bg-[#D9EEF8]  text-[#008ccd]" : "text-gray-400 "} p-2 rounded `}>
                                Table
                            </button>
                            <button
                                onClick={() => setcrawlStatsType("graph")}
                                className={`text-[14px] font-normal cursor-pointer ${crawlStatsType === "graph" ? " bg-[#D9EEF8]  text-[#008ccd]" : "text-gray-400 "} p-2 rounded `}>
                                Chart
                            </button>
                        </div>
                    </div>
                    <div
                        onClick={handleClearFilters}
                        className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2"
                    >
                        <FiRefreshCw className="cursor-pointer h-[14px] w-auto" />
                        <span>Clear</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {crawlStatsType === "table" &&
<table className="w-full min-w-[700px]">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">HTTP Status</th>
          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Description</th>
          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Requests</th>
          <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Avg Response Time (ms)</th>
        </tr>
      </thead>
      <tbody>
        {summaryArray.map((status: any, index: number) => (
          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="py-3 px-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status.httpStatus === "200"
                      ? "bg-green-500"
                      : status.httpStatus === "301"
                      ? "bg-blue-500"
                      : status.httpStatus === "404"
                      ? "bg-red-500"
                      : status.httpStatus === "500"
                      ? "bg-red-600"
                      : status.httpStatus === "403"
                      ? "bg-yellow-500"
                      : "bg-gray-500"
                  }`}
                ></div>
                <span className="text-sm font-medium">{status.httpStatus}</span>
              </div>
            </td>
            <td className="py-3 px-4 text-sm">{status.description}</td>
            <td className="py-3 px-4 text-sm font-medium">{status.requests}</td>
            <td className="py-3 px-4 text-sm">{status.avgResponseTime}</td>
          </tr>
        ))}
      </tbody>
    </table>

                    }
                    {crawlStatsType === "graph" &&
                        <div className='flex flex-col gap-5 items-center'>
                            <div className='border rounded flex items-center w-fit'>
                                <button
                                    onClick={() => setCrawnStatusChart("stacked")}
                                    className={`text-[14px] font-normal cursor-pointer ${crawnStatusChart === "stacked" ? " bg-[#D9EEF8]  text-[#008ccd]" : "text-gray-400 "} p-2 rounded `}>
                                    Stacked Bar
                                </button>
                                <button
                                    onClick={() => setCrawnStatusChart("pie")}
                                    className={`text-[14px] font-normal cursor-pointer ${crawnStatusChart === "pie" ? " bg-[#D9EEF8]  text-[#008ccd]" : "text-gray-400 "} p-2 rounded `}>
                                    Pie Chart
                                </button>
                            </div>
                            {crawnStatusChart === "stacked" &&
                                <>
                                    <h2 className='font-medium text-[16px]'>Status Code Distribution</h2>
                                    <motion.div
                                        className="w-full h-6 bg-gray-200 rounded-sm overflow-hidden flex"
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true }}
                                    >
                                        <motion.div
                                            className="h-full bg-[#10B981]"
                                            variants={{
                                                hidden: { width: 0 },
                                                visible: { width: `${5230}%`, transition: { duration: 0.6, ease: "easeOut" } },
                                            }}
                                        />
                                        <motion.div
                                            className="h-full bg-[#6d8bbd]"
                                            variants={{
                                                hidden: { width: 0 },
                                                visible: { width: `${2130}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.1 } },
                                            }}
                                        />
                                        <motion.div
                                            className="h-full bg-[#4286F5]"
                                            variants={{
                                                hidden: { width: 0 },
                                                visible: { width: `${482}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.2 } },
                                            }}
                                        />
                                        <motion.div
                                            className="h-full bg-[#E94134]"
                                            variants={{
                                                hidden: { width: 0 },
                                                visible: { width: `${98}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.3 } },
                                            }}
                                        />
                                    </motion.div>
                                    <div className='flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                                        <div className='bg-gray-200 p-4 px-8'>
                                            <h2 className='font-medium text-[24px] text-[#E94134]'>{statusCodeDistribution.success}</h2>
                                            <span className='font-normal text-[14px]'>SUCESSFULL (200)</span>
                                        </div>
                                        <div className='bg-gray-200 p-4 px-8'>
                                            <h2 className='font-medium text-[24px] text-[#6d8bbd]'>{statusCodeDistribution.redirect}</h2>
                                            <span className='font-normal text-[14px]'>REDIRECT (3XX)</span>
                                        </div>
                                        <div className='bg-gray-200 p-4 px-8'>
                                            <h2 className='font-medium text-[24px] text-[#4286F5]'>
                                                {statusCodeDistribution.clientError}
                                            </h2>
                                            <span className='font-normal text-[14px]'>CLIENT ERRORS (4XX)</span>
                                        </div>
                                        <div className='bg-gray-200 p-4 px-8'>
                                            <h2 className='font-medium text-[24px] text-[#E94134]'>{statusCodeDistribution.serverError}</h2>
                                            <span className='font-normal text-[14px]'>SERVER ERRORS (5XX)</span>
                                        </div>

                                    </div>
                                </>
                            }
                            {crawnStatusChart === "pie" &&
                                <div id="pie-basic">
                                    <Spkapexcharts chartOptions={Basicpieoptions} chartSeries={Basicpieseries} type="pie" width={"100%"} height={300} />
                                </div>
                            }
                        </div>
                    }
                </div>
            </CardContent>
        </Card>
    )
}

export default CrawlStatsBreackdown