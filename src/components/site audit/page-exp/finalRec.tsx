import React from "react";
import { BsInfo } from "react-icons/bs";
import Image from "next/image";
import { PerformanceCard } from "./PerformanceCard";

const FinalRec = ({ siteIssuesData }: any) => {
  const desktopError =
    siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.error;
  const mobileError =
    siteIssuesData?.result?.pagespeed_data?.parsed_data?.mobile?.error;

  let recommendations: any[] = [];

  if (!desktopError) {
    recommendations =
      siteIssuesData?.result?.pagespeed_data?.suggestions?.desktop
        ?.suggestions_by_category?.performance || [];
  } else if (!mobileError) {
    recommendations =
      siteIssuesData?.result?.pagespeed_data?.suggestions?.mobile
        ?.suggestions_by_category?.performance || [];
  } else {
    // both failed → don’t render
    return null;
  }

  return (
    <div className="bg-white border rounded-md p-6 mt-5 mx-auto shadow-sm w-full">
      <div className="flex justify-between text-base font-semibold items-center mb-4 border-b pb-1">
        <div className="flex text-[18px] font-semibold gap-1 items-center">
          <h2 className="text-[18px] font-semibold">Final Recommendations</h2>
          <BsInfo
            className="text-[20px] font-semibold cursor-pointer"
            color="#9E9E9E"
          />
        </div>
        <div className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2">
          <Image
            alt=""
            src={"/images/WRanker - Export Icon grey.png"}
            className="cursor-pointer h-[14px] w-auto"
            height={0}
            width={0}
          />
          <span>Export To Report</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 max-h-110 overflow-hidden overflow-y-auto">
        {recommendations.slice(0, 5).map((p: any, i: number) => (
          <PerformanceCard key={i} title={p.title} description={p.description} />
        ))}
      </div>
    </div>
  );
};

export default FinalRec;
