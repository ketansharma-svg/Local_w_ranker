"use client";


import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  StopOutlined
} from "@ant-design/icons";
import {
  Button,
  Input,
  message,
  Spin,
  Table,
  Typography
} from "antd";
import axios from "axios";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import CustomPieChart from "./pichart";
import { BASE_URL_WR } from "@/src/util/api";
const { Title, Text } = Typography;
interface LinkData {
  link_found: string;
  link_status_code: number;
  link_text: string;
  follow_type: string;
}

interface ResultData {
  post_url: string;
  status_code: number;
  links: LinkData[];
}

interface BacklinkResponse {
  results: ResultData[];
  errors: string[];
  target_domain: string;
  total_urls_processed: number;
  successful_checks: number;
  failed_checks: number;
}

export default function BacklinkMonitor() {
  const [postUrls, setPostUrls] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacklinkResponse | null>(null);

  const fetchBacklinkData = async () => {
    if (!postUrls || !domain) {
      message.error("Please enter both Post URLs and Domain.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL_WR}backlink-monitor/`,
        {
          post_urls: postUrls
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean),
          domain: domain,
        },
      );
      setResult(response.data);
    } catch (error) {
      message.error("Failed to fetch backlink data. Please try again.");
    }
    setLoading(false);
  };

  const flattenedData = result?.results.flatMap((result: any) => {
    if (!result.links || result.links.length === 0) {
      // If no links exist, return a single row with '0' for link_found
      return [
        {
          key: `${result.post_url}-no-links`,
          post_url: result.post_url,
          status_code: result.status_code,
          link_found: "0", // Indicating no links found
          link_status_code: "N/A",
          link_text: "N/A",
          follow_type: "N/A",
        },
      ];
    }

    // If links exist, map over them normally
    return result.links.map((link: any, index: number) => ({
      key: `${result.post_url}-${index}`, // Unique key for each row
      post_url: result.post_url,
      status_code: result.status_code,
      link_found: link.link_found,
      link_status_code: link.link_status_code,
      link_text: link.link_text || "N/A",
      follow_type: link.follow_type,
    }));
  });
  // Calculate statistics for charts

  const columns = [
    {
      title: (
        <span>
          <LinkOutlined /> Post URL
        </span>
      ),
      dataIndex: "post_url",
      key: "post_url",
      render: (text: any) => (
        <a href={text} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ),
    },
    {
      title: (
        <span>
          <CheckCircleOutlined /> Status Code
        </span>
      ),
      dataIndex: "status_code",
      key: "status_code",
      render: (code: any) => (
        <span style={{ color: code === 200 ? "green" : "red" }}>
          {code === 200 ? (
            <CheckCircleOutlined style={{ color: "green" }} />
          ) : (
            <CloseCircleOutlined style={{ color: "red" }} />
          )}{" "}
          {code}
        </span>
      ),
    },
    {
      title: (
        <span>
          <LinkOutlined /> Backlink URL
        </span>
      ),
      dataIndex: "link_found",
      key: "link_found",
      render: (text: any) => (
        <a href={text} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ),
    },
    {
      title: (
        <span>
          <CheckCircleOutlined /> Backlink Status
        </span>
      ),
      dataIndex: "link_status_code",
      key: "link_status_code",
      render: (code: any) => (
        <span style={{ color: code === 200 ? "green" : "red" }}>
          {code === 200 ? (
            <CheckCircleOutlined style={{ color: "green" }} />
          ) : (
            <CloseCircleOutlined style={{ color: "red" }} />
          )}{" "}
          {code}
        </span>
      ),
    },
    {
      title: (
        <span>
          <LinkOutlined /> Backlink Text
        </span>
      ),
      dataIndex: "link_text",
      key: "link_text",
    },
    {
      title: (
        <span>
          <SafetyCertificateOutlined /> Follow Type
        </span>
      ),
      dataIndex: "follow_type",
      key: "follow_type",
      render: (type: any) => (
        <span>
          {type === "DoFollow" ? (
            <SafetyCertificateOutlined style={{ color: "blue" }} />
          ) : (
            <StopOutlined style={{ color: "gray" }} />
          )}{" "}
          {type}
        </span>
      ),
    },
  ];

  return (
    <div className=" mx-auto px-4 py-8">
      <motion.div
        className="mb-8 rounded-lg border bg-white p-6 shadow-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.h2
          className="mb-2 text-lg font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Backlink Monitor Tool
        </motion.h2>
        <motion.p
          className="mb-4 text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Track and analyze backlinks to your domain across multiple URLs
        </motion.p>

        <motion.div className="space-y-4">
          {/* Target Domain Input */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Text strong>Target Domain</Text>
            <Input
              placeholder="Enter Domain (e.g., example.com)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </motion.div>

          {/* Post URLs Input */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Text strong>Post URLs</Text>
            <Input.TextArea
              placeholder="Enter Post URLs needs one url in a line"
              value={postUrls}
              onChange={(e) => setPostUrls(e.target.value)}
              rows={4}
            />
          </motion.div>
          
          <Button
            type="primary"
            onClick={fetchBacklinkData}
            loading={loading}
            className="w-full sm:w-auto !bg-brand-blue1"
          >
            Validate
          </Button>
        </motion.div>
      </motion.div>
      {loading && <Spin size="large" tip="Fetching backlink data..." />}

      {!loading && result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 rounded-xl border p-4 shadow"
        >
          {/* Summary Card */}
          <div className="mt-5 p-4   ">
            <Title level={5}>Result:</Title>
            <div className="flex  gap-3">
              <div className="grid w-[50%] grid-cols-1 gap-4">
                <div className="flex flex-wrap items-center justify-between rounded-lg bg-[#DDE7F9] px-4 py-2">
                  <div className=" flex  items-center">
                    <DatabaseOutlined className="text-brand-blue1 mr-2 text-3xl" />
                    <Text className="text-sm">URLs Processed</Text>
                  </div>
                  <div className="mt-2 flex h-[80px] w-[80px] items-center justify-center rounded-full bg-white">
                    <Text className="text-3xl font-bold">
                      {result.total_urls_processed}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#DDE7F9] px-4 py-2">
                  <div className=" flex items-center gap-3">
                    <CheckCircleOutlined className="text-3xl text-green-600" />
                    <Text className="text-sm">Successful Checks</Text>
                  </div>
                  <div className="mt-2 flex h-[80px] w-[80px] items-center justify-center rounded-full bg-white">
                    <Text className="text-2xl font-bold ">
                      {result.successful_checks}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#DDE7F9] px-4 py-2">
                  <div className=" flex items-center gap-3">
                    <CloseCircleOutlined className="text-3xl text-red-600" />
                    <Text className="text-sm">Failed Checks</Text>
                  </div>
                  <div className="mt-2 flex h-[80px] w-[80px] items-center justify-center rounded-full bg-white">
                    <Text className="text-2xl font-bold ">
                      {result.failed_checks}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[#DDE7F9] px-4 py-2">
                  <div className=" flex items-center gap-3">
                    <LinkOutlined className="text-brand-blue1 text-3xl" />
                    <Text className="text-sm">Total Backlinks</Text>
                  </div>
                  <div className="mt-2 flex h-[80px] w-[80px] items-center justify-center rounded-full bg-white">
                    <Text className="text-brand-blue1 text-2xl font-bold">
                      {flattenedData?.length || 0}
                    </Text>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 w-[50%] grid-cols-2">
                <div className="col-span-2 flex justify-center rounded-lg   border-[1px] border-slate-200">
                  <CustomPieChart
                    totalUrls={result.total_urls_processed}
                    successfulChecks={result.successful_checks}
                    failedChecks={result.failed_checks}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className=" h-inherit flex-1 overflow-y-auto rounded border p-4">
            <div className="">Result:</div>
            <Table
              columns={columns}
              dataSource={flattenedData}
              rowKey="key"
              pagination={false} // Enables vertical scroll with a fixed height
            />
          </div>

          {/* <div className="mt-5 p-4 max-h-[600px] overflow-y-auto border rounded">
      <Title level={5}>Result:</Title>
      <Table columns={columns} dataSource={flattenedData} rowKey="key" pagination={false}   scroll={{ y: 100 }}  // Enables vertical scroll with a fixed height
  sticky />
    </div> */}
          {/* Errors Section (if any) */}
          {/* {result.errors && result.errors.length > 0 && (
            <Alert message="Errors" description="The following errors occurred during processing" type="error" showIcon />
          )} */}
        </motion.div>
      )}

      {!loading && !result && (
        <div className="mx-auto flex w-full flex-col  justify-between px-4 py-12 text-black md:flex-row md:px-8 lg:px-16">
          {/* Left Section */}
          <div className="flex w-full flex-col items-start gap-8 md:w-[50%] ">
            {/* Heading and Description */}
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-semibold leading-tight ">
                Audit Your Website&apos;s SEO Performance
              </h3>
              <p className="text-base  leading-relaxed">
                Enter a website URL to uncover technical SEO issues, performance
                metrics, and optimization opportunities.
              </p>
            </div>

            {/* Benefits Section */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold ">Benefits:</h3>
              <ul className="flex flex-col gap-2 ">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full " />
                  Identify Critical Issues: Fix errors impacting your SEO.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full " />
                  Improve Rankings: Enhance overall site health for better
                  visibility.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full " />
                  Comprehensive Analysis: Understand and optimize your site
                  structure.
                </li>
              </ul>
            </div>

            {/* Try it now section */}
            <div className="flex flex-col gap-2">
              <span className="font-medium text-brand-blue">Try it now!</span>
              <span className="text-sm ">
                Enter a link above to see the results.
              </span>
            </div>
          </div>

          {/* Right Section - Image */}
          <div className="-z-0 mt-8 flex w-full items-center md:mt-0 md:w-[50%]">
            <Image
              src={"/images/Frame 1116607879.svg"}
              alt="Post"
              height={1000}
              width={1000}
            />
          </div>
        </div>
      )}
    </div>
  );
}
