/* eslint-disable react/no-unescaped-entities */

import React from 'react'
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { FiCalendar, FiRefreshCw } from 'react-icons/fi';
import { FaLongArrowAltRight } from "react-icons/fa";
import { MdDateRange } from 'react-icons/md';
import { IoWarning } from "react-icons/io5";
import { FaLightbulb } from "react-icons/fa";
import Image from 'next/image';


const IssueExplain = ({ siteIssues }: any) => {
    return (
        <Card className="border border-gray-200 mt-4">
            <div className="flex items-center justify-between gap-1 border-b-2 pb-1 px-5">
                <h2 className="text-[18px] font-semibold">Issue Explanation & Fix Guide Panel</h2>
                <input type='text' placeholder='Missing H1 Tag' className='w-100 bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2 inline-block' />
                <div className='flex  gap-2 items-center   '>
                    <div className='bg-blue-500 border text-[white] border-[#EFF0F6] rounded-md font-normal w-fit text-[14px]  p-2'>
                        <span className='flex'>Create Task for This Issue</span>
                    </div>
                    <div className='bg-green-500 border text-[white] border-[#EFF0F6] rounded-md font-normal w-fit text-[12px]  p-2'>
                        <span className='flex'>Mark Issue as fixed (All Pages)</span>
                    </div>
                    <div className='bg-gray-50 border text-[#676767] border-[#EFF0F6] rounded-md font-normal w-fit text-[12px]  p-2'>
                        <span className='flex'>See Affected Pages</span>
                    </div>
                    <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                        <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                        <span>Export</span>
                    </div>

                </div>
            </div>
            {/* <CardHeader>
                <div className="flex items-center justify-between gap-1 border-b-2">
                    <CardTitle className="text-[18px] font-semibold w-full">Issue Explanation & Fix Guide Panel</CardTitle>
                    <input type='text' placeholder='Missing H1 Tag' className='bg-gray-50 border w-full border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2.5' />
                    <div className='flex  gap-2 w-full'>
                        <div className='bg-blue-500 border text-[white] border-[#EFF0F6] rounded-md font-normal text-[14px] w-full p-2.5'>
                            <span className='flex'>Create Task for This Issue</span>
                        </div>
                        <div className='bg-green-500 border text-[white] border-[#EFF0F6] rounded-md font-normal text-[14px] w-full p-2.5'>
                            <span className='flex'>Mark Issue as fixed (All Pages)</span>
                        </div>
                        <div className='bg-gray-50 border text-[#676767] border-[#EFF0F6] rounded-md font-normal text-[14px] w-full p-2.5'>
                            <span className='flex'>See Affected Pages</span>
                        </div>
                        <div>
                            <Image
                                className="cursor-pointer h-[14px] w-auto"
                                src={exportIcon}
                                alt="Developer illustration"
                            // width={14}
                            // height={15}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader> */}
            <CardContent className=' pb-4'>
                <div className='flex justify-between items-center'>
                    <div className="flex items-center w-full  flex-wrap gap-2 text-[16px] font-semibold">
                        <FiCalendar className='text-blue-500' />
                        <CardTitle className=""> Missing H1 Tag</CardTitle>
                        <span className='text-[10px] text-brand-red border font-normal border-brand-red px-3 rounded-full p-1'>HIGH</span>
                        <span className='text-[10px] text-purple-500 font-normal border border-purple-500 px-3 rounded-full p-1'>Content</span>
                    </div>
                    <div className='flex items-center gap-1 w-full justify-end'>
                        <div className='bg-gray-50 border text-[#676767] border-[#EFF0F6] rounded-md font-normal text-[12px] flex gap-2 items-center  p-2.5'>
                            <div className="cursor-pointer w-4 h-4 flex items-center justify-center bg-[#008CCD] text-white shadow border border-black">
                                <FiRefreshCw className="w-3 h-3" />
                            </div>
                            <span className='flex'>Clear Filter</span>
                        </div>
                        <div className='bg-gray-50 border text-[#676767] border-[#EFF0F6] rounded-md font-normal text-[12px] flex gap-2 items-center  p-2.5'>
                            <span className='flex'>"Open in Issue Tab</span>
                        </div>
                    </div>
                </div>

                <div className="border rounded-md shadow-md text-sm font-sans overflow-hidden text-[14px]">
                    {/* Issue Explanation */}
                    <div className=" p-4 ">
                        <h3 className="font-semibold text-[14px] flex items-center gap-2">
                            <svg className="w-4 h-4 mt-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 0a10 10 0 100 20A10 10 0 0010 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z" /></svg>
                            <h2>Issue Explanation</h2>
                        </h3>
                        <p className="text-gray-400 font-normal mt-2 flex gap-1 items-center">
                            <FaLongArrowAltRight />
                            <strong className="text-gray-600 font-medium">This issue means</strong> the page does not include an H1 heading, which is important for SEO structure and user clarity.
                        </p>
                        <p className="text-gray-400 font-normal mt-2 flex gap-1 items-center">
                            <FaLongArrowAltRight />
                            <strong className="text-gray-600 font-medium">Pages without H1 tags</strong>  may confuse search engines and weaken keyword targeting.                        </p>
                        <div className=" py-2 font-medium border  mt-2 rounded-md">
                            <p className="text-gray-400 font-normal flex gap-1 items-center">
                                {/* <FaLongArrowAltRight /> */}
                                <IoWarning size={20} className='text-yellow-600' />
                                <strong className="text-gray-600 font-medium">SEO Impact: High –</strong>Affects on-page structure</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 py-2 gap-2">
                            <div className='flex gap-1'>
                                <strong className='flex font-medium items-center gap-2'>
                                    <MdDateRange />
                                    <span>First Detected:</span>
                                </strong>
                                <span className='font-normal'>May 8, 2024</span>
                            </div>
                            <div className='flex gap-1'>
                                <strong className='flex font-medium items-center gap-2'>
                                    <MdDateRange />
                                    <span>Source:</span>
                                </strong>
                                <span className='font-normal'>Wranker AI</span>
                            </div>
                            <div className='flex gap-1'>
                                <strong className='flex font-medium items-center gap-2'>
                                    <MdDateRange />
                                    <span>Validation</span>
                                </strong>
                                <span className='font-normal'>Not Validate</span>
                            </div>
                            <div className='flex gap-1'>
                                <strong className='flex font-medium items-center gap-2'>
                                    <MdDateRange />
                                    <span>Category:</span>
                                </strong>
                                <span className='font-normal'>Content</span>
                            </div>
                            <div className='flex gap-1'>
                                <strong className='flex font-medium items-center gap-2'>
                                    <MdDateRange />
                                    <span>Audit Type:</span>
                                </strong>
                                <span className='font-normal'>Full Site Audit</span>
                            </div>
                        </div>
                    </div>
                    {/* SEO Impact */}
                    {/* Metadata */}
                    {/* Fix Guide */}
                    <div className="p-4 border-b flex flex-col gap-3">
                        <h3 className=" font-medium mb-2 text-[14px] flex items-center gap-2">
                            Fix Guide
                        </h3>
                        <h3 className="font-medium text-[14px] mb-2 flex items-center gap-2">
                            ✅ What to Do:
                        </h3>
                        <ul className="list-disc pl-6 text-gray-700 text-[14px] font-normal space-y-1">
                            <li>Add a clear, descriptive <code className="bg-gray-100 px-1 rounded">&lt;h1&gt;</code> tag to the page.</li>
                            <li>Use the primary keyword naturally within the heading.</li>
                            <li>Ensure only one <code className="bg-gray-100 px-1 rounded">&lt;h1&gt;</code> tag exists per page.</li>
                            <li>Structure the rest of the page using <code className="bg-gray-100 px-1 rounded">&lt;h2&gt;</code>, <code className="bg-gray-100 px-1 rounded">&lt;h3&gt;</code>, etc., for subheadings.</li>
                        </ul>
                        <div className="">
                            <h4 className=" mb-2 flex items-center font-medium text-[14px] gap-2">
                                <FaLightbulb className='text-yellow-600' />
                                Best Practices:
                            </h4>
                            <ul className="list-disc pl-6 text-gray-700 text-[14px] font-normal space-y-1">
                                <li>Keep the <code className="bg-gray-100 px-1 rounded">&lt;h1&gt;</code> between 20–70 characters.</li>
                                <li>Place it near the top of the main content area (not hidden in banners).</li>
                                <li>Avoid keyword stuffing or generic labels like "Home" or "Welcome".</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium text-[14px] mb-2 flex items-center gap-2">
                                Simple HTML:
                            </h3>
                            <div className="py-2 font-medium border  mt-2 rounded-md">
                                <p className="text-gray-400 font-normal  flex gap-1 items-center">
                                    {/* <FaLongArrowAltRight /> */}
                                    <span className='font-normal text-[14px] text-black'>{"<h1> Best SEO Stratigies for 2025 </h1>"}1</span>
                                </p>
                            </div>
                        </div>
                        <div>
                            <h4 className=" mb-2 flex items-center font-medium text-[14px] gap-2">
                                <IoWarning size={20} className='text-yellow-600' />
                                Commomn Mistakes to Avoide:
                            </h4>
                            <ul className="list-disc pl-6 text-gray-700 text-[14px] font-normal space-y-1">
                                <li>{"Using <div> or <span> instead of semantic headings"}</li>
                                <li>{"Using multiple <h1> tags on the same page"}</li>
                                <li>{"Heading the <h1> with css"}</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className=" mb-2 flex items-center font-medium text-[14px] gap-2">
                                <IoWarning size={20} className='text-yellow-600' />
                                Resource Link:
                            </h4>
                            <span className="text-[#0077FF] flex  font-normal text-[15px] cursor-pointer leading-[20px] align-middle underline decoration-solid">Google HTML Starter Guide for SEO</span>

                        </div>
                    </div>
                    {/* Best Practices */}
                </div>


            </CardContent>
        </Card >
    )
}

export default IssueExplain