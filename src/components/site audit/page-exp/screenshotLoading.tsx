


import Image from 'next/image'
import React, { useState } from 'react'
import exportIcon from "../../assests/Group 1000008949@3x.png"
import { IoEyeOutline } from "react-icons/io5";

const ScreenshotLoading = ({ siteIssuesData }: any) => {

    const [activeTab, setActiveTab] = useState("desktop");


    return (
        <div className="bg-white border rounded-md p-4  mx-auto shadow-sm w-full ">
            <div className="flex justify-between items-center text-base font-semibold mb-4 border-b pb-1">
                <h2 className="text-base font-semibold  pb-1">Screenshot & Loading Timeline</h2>

                <Image
                    className="cursor-pointer h-[14px] w-auto"
                    src={exportIcon}
                    alt="Developer illustration"
                    width={14}
                // height={15}
                />
            </div>

            <div className="">
                {/* <div className="flex justify-between text-base font-semibold mb-4 border-b pb-1"> */}
                <div className="flex justify-between items-center mb-4 pt-1">
                    <h2 className="text-base font-semibold">Above-the-Fold Screenshot</h2>
                    <div className='flex gap-2 flex-wrap items-center'>
                        <div className="inline-flex items-center  rounded-md p-1 text-sm font-medium text-center text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            <button
                                onClick={() => setActiveTab("mobile")}
                                className={`inline-flex items-center px-4 py-1 rounded-md ${activeTab === "mobile"
                                        ? "text-white bg-blue-600"
                                        : "text-gray-900 bg-white border border-gray-300 hover:bg-gray-50"
                                    }`}

                            >
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                                </svg>
                                Mobile
                            </button>
                            <button
                                onClick={() => setActiveTab("desktop")}
                                className={`inline-flex items-center px-4 py-1 rounded-md ${activeTab === "desktop"
                                        ? "text-white bg-blue-600"
                                        : "text-gray-900 bg-white border border-gray-300 hover:bg-gray-50"
                                    }`}

                            >
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm1 2h10v10H5V5z" />
                                </svg>
                                Desktop
                            </button>
                        </div>


                        <div className='flex gap-1 items-center border p-1 rounded-md'>
                            <IoEyeOutline />
                            <span className=''>View Full</span>
                        </div>
                    </div>
                </div>
                <div className='bg-gray-100 rounded-md p-4'>
                    <div className="grid xl:grid-cols-8 lg:grid-cols-6 md:grid-cols-4 sm:grid-cols-2 grid-col-1 gap-4 items-stretch">
                        <Image alt="" height={0} width={0} src="/images/screenshot.png" className="w-[100px] h-[160px] object-cover border border-gray-200 rounded" />
                        <Image alt="" height={0} width={0} src="/images/screenshot.png" className="w-[100px] h-[160px] object-cover border border-gray-200 rounded" />
                        <Image alt="" height={0} width={0} src="/images/screenshot.png" className="w-[100px] h-[160px] object-cover border border-gray-200 rounded" />
                        <Image alt="" height={0} width={0} src="/images/screenshot.png" className="w-[100px] h-[160px] object-cover border border-gray-200 rounded" />
                        <Image alt="" height={0} width={0} src="/images/screenshot.png" className="w-[100px] h-[160px] object-cover border border-gray-200 rounded" />
                        <Image alt="" height={0} width={0} src="/images/screenshot.png" className="w-[100px] h-[160px] object-cover border border-gray-200 rounded" />
                        <Image alt="" height={0} width={0} src="/images/screenshot.png" className="w-[100px] h-[160px] object-cover border border-gray-200 rounded" />
                        <Image alt="" height={0} width={0} src="/images/screenshot.png" className="w-[100px] h-[160px] object-cover border border-gray-200 rounded" />
                    </div>

                </div>
            </div>
        </div>
    )
}

export default ScreenshotLoading