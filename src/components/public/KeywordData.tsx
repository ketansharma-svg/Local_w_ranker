"use client";

import { useEffect, useState } from "react";
import { Table, Select, Tooltip } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Info as InfoCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const { Option } = Select;

// Column definitions with tooltips
const columnDefinitions: Record<string, string> = {
  keyword: "The search term being analyzed",
  bid_rank: "Ranking based on bid competitiveness (lower is better)",
  volume_rank: "Ranking based on search volume (lower is better)",
  overall_rank:
    "Combined ranking considering multiple factors (lower is better)",
  competition_enum: "Competition level categorized as Low, Medium, or High",
  competition_rank:
    "Numerical ranking of competition level (lower means less competition)",
  competition_index:
    "Index measuring the level of competition for this keyword",
  CompetitionNumeric: "Numerical value representing competition (0-1 scale)",
  avg_monthly_searches: "Average number of monthly searches for this keyword",
  low_top_of_page_bid:
    "Lowest estimated bid needed to appear at the top of search results",
  high_top_of_page_bid:
    "Highest estimated bid needed to appear at the top of search results",
};

// Color Palette for Chart
const colorPalette = [
  "#1688C9", // Light green
  "#8F6CF9", // Blue
  "#000000", // Orange
  "#FAC343", // Red
  "#00976C", // Purple
  "#E9333D", // Green
  "#f8e71c", // Yellow
];

interface KeywordDataProps {
  Data: any[];
}

const KeywordData = ({ Data }: KeywordDataProps) => {
  const [selectedKeywords, setSelectedKeywords] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  // Table Columns
  const columns = Object.keys(columnDefinitions).map((key) => ({
    title: (
      <Tooltip title={columnDefinitions[key]}>
        <div className="flex items-center justify-center">
          {key.replace(/_/g, " ")} <InfoCircle className=" ml-1" size={14} />
        </div>
      </Tooltip>
    ),
    dataIndex: key,
    key: key,
    render: (text: any) => (typeof text === "number" ? text.toFixed(2) : text),
  }));

  const keywords = Data?.map((item) => item.keyword) || [];

  useEffect(() => {
    if (Data.length > 0) {
      setSelectedKeywords(Data.slice(0, 3)); // Default to the first three keywords
    }
  }, [Data]);

  useEffect(() => {
    const months = [
      "Sep 2024",
      "Oct 2024",
      "Nov 2024",
      "Dec 2024",
      "Jan 2025",
      "Feb 2025",
    ];

    const chartData = months.map((month) => {
      const dataPoint: Record<string, any> = { month };

      selectedKeywords.forEach((keyword) => {
        const monthKey = `Searches: ${month}`;
        dataPoint[keyword.keyword] = keyword[monthKey] || 0;
      });

      return dataPoint;
    });

    setMonthlyData(chartData);
  }, [selectedKeywords]);

  const handleKeywordChange = (value: string[]) => {
    const selectedItems = Data.filter((item) => value.includes(item.keyword));
    setSelectedKeywords(selectedItems);
  };
  return (
    <div className="w-full">
      <div className="mb-4 rounded-lg bg-lightblue p-2 px-4">
        <h2 className="text-xl font-bold text-homeblack">Keyword Analysis</h2>
      </div>
      <Select
        mode="multiple"
        style={{ width: "100%", marginBottom: "20px" }}
        placeholder="Select keywords For Graphical Analysis"
        onChange={handleKeywordChange}
        // defaultValue={keywords.slice(0, 3)}
      >
        {keywords.map((keyword, index) => (
          <Option key={index} value={keyword}>
            {keyword}
          </Option>
        ))}
      </Select>
      {selectedKeywords.length > 0 && (
        <motion.div initial={{ opacity: 0 }} // Fade out initially
          whileInView={{ opacity: 1  }} // Fade in when in view
          exit={{ opacity: 0 }} // Fade out when it leaves the view
          transition={{ duration: 0.3, delay:  0.2}}
          className="mb-20 h-[300px] w-full">
          <ResponsiveContainer>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                }}
                formatter={(value, name) => [value, name]}
              />
              <Legend />
              {selectedKeywords.map((keyword, index) => (
                <Bar
                  key={keyword.keyword}
                  dataKey={keyword.keyword}
                  name={keyword.keyword}
                  fill={colorPalette[index % colorPalette.length]}
                  barSize={45}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
        <motion.div initial={{ opacity: 0 }} // Fade out initially
          whileInView={{ opacity: 1  }} // Fade in when in view
          exit={{ opacity: 0 }} // Fade out when it leaves the view
          transition={{ duration: 0.5, delay:  0.2}}
          className="w-full overflow-x-auto keywordtable border">
        <Table 
            columns={Object.keys(columnDefinitions).map((key) => ({
            title: (
              <Tooltip title={columnDefinitions[key]}>
                <div className="flex items-center justify-center text-[12px] font-bold uppercase">
                  {key.replace(/_/g, " ")}
                  <InfoCircle className="ml-1" size={14} />
                </div>
              </Tooltip>
            ),
            dataIndex: key,
            key: key,
            render: (text: any) =>
              typeof text === "number" ? text.toFixed(2) : text,
          }))}
          dataSource={Data}
          pagination={false}
          rowKey="keyword"
          className="w-full overflow-hidden rounded-lg border-gray-300"
          rowClassName={(_, index) =>
            `text-center ${index % 2 === 0 ? "bg-gray-100" : "bg-white"} border hover:bg-white transition duration-200`
          }
        />
      </motion.div>
    </div>
  );
};
export default KeywordData;
