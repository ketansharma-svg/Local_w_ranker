
'use client';

import GaugeChart from 'react-gauge-chart';
import { AiFillSwitcher } from "react-icons/ai";
// import Spkwidgetcardcomponent from "../../reusable-widgets/spk-widgetcard";
import { formatUnit } from '@/src/util/helper';
import { Tooltip } from 'antd';
import Image from "next/image";
import { BsInfo } from 'react-icons/bs';


    export const GaugeProgressBar = ({ score, label, threshold }: any) => {
const scoreValue = typeof score === "string" 
  ? parseFloat(score.replace(/[^\d.]/g, "")) || 0 
  : Number(score) || 0;
        const unit = threshold.unit || '';

        const min = 0;
        const mid = threshold.mid;
        const max = threshold.max;

        const dynamicMax = Math.max(max * 1.5, scoreValue); // dynamically adjust max

        const gaugeValue = (scoreValue - min) / (dynamicMax - min);

        const arcGreen = mid - min;
        const arcOrange = max - mid;
        const arcRed = dynamicMax - max;
        const total = arcGreen + arcOrange + arcRed;

        const arcsLength = [
            arcGreen / total,
            arcOrange / total,
            arcRed / total,
        ];

        return (
            <div className="gauge-progress flex flex-col items-center text-center w-full">
                <div className='flex gap-1 items-center'>
                    <span className="font-medium text-gray-800 mb-1">{label}</span>
                    <span className="w-4 h-4 rounded-full bg-transparent text-gray-400 font-medium font-serif italic flex items-center justify-center">                    i
                    </span>
                </div>
                <GaugeChart
                    id={`gauge-${label}`}
                    nrOfLevels={20}
                    percent={gaugeValue}
                    arcsLength={arcsLength}
                    colors={['#10B981', '#F9BB04', '#E94134']}
                    style={{ width: '100%', height: '150px' }}
                    animate={true}
                    needleColor="#1688C9"
                    animDelay={500}
                    textColor="transparent"
                    cornerRadius={1}
                    animateDuration={2000}
                />
                <div className="bg-white text-[#1688C9] border border-[#1688C9] border-purple font-semibold w-fit text-center px-3 mx-auto rounded-md text-purple mt-4 text-[18px]">
                    {score}
                </div>

                <div className="flex flex-col gap-1 pt-4 text-[12px] text-[#676767] font-medium">
                    <div className="flex items-center">
                        <span className="w-2.5 h-2.5 mr-2 rounded-full bg-brand-green"></span>
                        No Need To Improve (0–{mid}{formatUnit})
                    </div>
                    <div className="flex items-center">
                        <span className="w-2.5 h-2.5 mr-2 rounded-full bg-brand-yellow"></span>
                        Need Improvement ({mid}{formatUnit(unit)} – {max}{formatUnit(unit)})
                    </div>
                    <div className="flex items-center">
                        <span className="w-2.5 h-2.5 mr-2 rounded-full bg-brand-red"></span>
                        Very Poor ({max}{formatUnit(unit)} – ∞)
                    </div>
                </div>
            </div>
        );
    };


const PerfomanceMwetrics = ({ siteIssuesData }: any) => {
const desktopError = siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.error;
const mobileError = siteIssuesData?.result?.pagespeed_data?.parsed_data?.mobile?.error;

let pageData: any = {};

if (!desktopError) {
  pageData = siteIssuesData?.result?.pagespeed_data?.parsed_data?.desktop?.metrics || {};
} else if (!mobileError) {
  pageData = siteIssuesData?.result?.pagespeed_data?.parsed_data?.mobile?.metrics || {};
} else {
  // both desktop & mobile failed → don't render anything
  return null;
}

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

    return (
        <div className="bg-white border rounded-md p-6  mx-auto shadow-sm w-full">
            <div className="flex justify-between text-base font-semibold items-center mb-4 border-b pb-1">
                <div className="flex text-[18px] font-semibold gap-1 items-center">
                    <h2 className="text-[18px] font-semibold">Core Web Vitals + Performance Metrics</h2>
                    <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                </div>
                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                    <span>Export</span>
                </div>
                {/* </div> */}
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 lg:grid-cols-2">
                {vitalsData?.map((item: any, idx: number) => {
                    const extractValue = (str: string) => parseFloat(str?.replace(/[^\d.]/g, '')) || 0;
                    const mid = extractValue(item.thresholds["good"]);
                    const max = extractValue(item.thresholds["needs-improvement"]);
                    return (
                        <div
                            key={idx}
                            className="border rounded-md shadow-sm p-4 flex flex-col items-center justify-between"
                        >
                            <GaugeProgressBar
                                label={item.title}
                                score={item.display_value}
                                threshold={{
                                    mid,
                                    max,
                                    unit: item.thresholds.unit,
                                }}
                            />
                            <div className="flex justify-st text-xs font-medium text-[#676767] pt-4">
                                <AiFillSwitcher className="mr-2 text-xl" />
                                <Tooltip title={item.description} overlayStyle={{ maxWidth: "300px" }}>
                                    <span>View Description</span>
                                </Tooltip>
                            </div>
                        </div>
                    );
                })}
                {/* <div className="flex flex-wrap w-full p-4 gap-8 rounded-2xl border">
                    <GaugeProgressBar
                        score={2}
                        pointerColor="blue"
                        threshold={0}
                    />
                </div>
                <div className="flex flex-wrap w-full p-4 gap-8 border">
                    <GaugeProgressBar
                        score={2}
                        pointerColor="blue"
                        threshold={0}
                    />
                </div>
                <div className="flex flex-wrap w-full p-4 gap-8 border">
                    <GaugeProgressBar
                        score={2}
                        pointerColor="blue"
                        threshold={0}
                    />
                </div>
                <div className="flex flex-wrap w-full p-4 gap-8 border">
                    <GaugeProgressBar
                        score={2}
                        pointerColor="blue"
                        threshold={0}
                    />
                </div>
                <div className="flex flex-wrap w-full p-4 gap-8 border">
                    <GaugeProgressBar
                        score={2}
                        pointerColor="blue"
                        threshold={0}
                    />
                </div>
                <div className="flex flex-wrap w-full p-4 gap-8 border">
                    <GaugeProgressBar
                        score={2}
                        pointerColor="blue"
                        threshold={0}
                    />
                </div> */}
            </div>
        </div>
    )
}

export default PerfomanceMwetrics