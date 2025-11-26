import Image from "next/image";
import React from "react";

const LoadingTimeline = ({ siteIssuesData }: any) => {
  const desktopError = siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.error;
  const mobileError = siteIssuesData?.result?.pagespeed_data?.parsed_data?.mobile?.error;

  let metrics: any = {};

  if (!desktopError) {
    metrics = siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.metrics || {};
  } else if (!mobileError) {
    metrics = siteIssuesData?.result?.pagespeed_data?.parsed_data?.mobile?.metrics || {};
  } else {
    // both desktop & mobile failed → don’t render component
    return null;
  }

  // Extract values dynamically
  const fcpValue = metrics?.["first-contentful-paint"]?.display_value || "--";
  const lcpValue = metrics?.["largest-contentful-paint"]?.display_value || "--";
  const ttiValue = metrics?.interactive?.display_value || "--";

  // Convert numeric values (e.g. "3.5s" → 3.5) for bar widths
  const parseSeconds = (val: string) => {
    if (!val || typeof val !== "string") return 0;
    const num = parseFloat(val.replace("s", ""));
    return isNaN(num) ? 0 : num;
  };

  const fcpNum = parseSeconds(fcpValue);
  const lcpNum = parseSeconds(lcpValue);
  const ttiNum = parseSeconds(ttiValue);

  // Normalize widths (cap at 100)
  const calcWidth = (val: number) => `${Math.min(val * 5, 100)}%`; // scale factor adjustable

  return (
    <div className="bg-white border rounded-md p-6 mt-5 mx-auto shadow-sm w-full">
      <div className="flex justify-between text-base font-semibold items-center mb-4 border-b pb-1">
        <h2 className="text-base font-semibold">Loading Timeline</h2>
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

      <div className="flex flex-col gap-3">
        {/* FCP */}
        <div>
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>FCP</span>
            <span className="text-gray-400">{fcpValue}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full">
            <div
              className="bg-brand-yellow h-2 rounded-full"
              style={{ width: calcWidth(fcpNum) }}
            />
          </div>
        </div>

        {/* LCP */}
        <div>
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>LCP</span>
            <span className="text-gray-400">{lcpValue}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full">
            <div
              className="bg-brand-red h-2 rounded-full"
              style={{ width: calcWidth(lcpNum) }}
            />
          </div>
        </div>

        {/* TTI */}
        <div>
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>TTI</span>
            <span className="text-gray-400">{ttiValue}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full">
            <div
              className="bg-brand-red h-2 rounded-full"
              style={{ width: calcWidth(ttiNum) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingTimeline;
