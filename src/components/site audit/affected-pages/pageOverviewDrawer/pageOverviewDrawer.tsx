import { Drawer } from 'antd'
import React, { useState } from 'react'
import { FiBarChart2, FiDatabase, FiEdit3, FiRefreshCw, FiTrendingUp, FiUpload } from 'react-icons/fi'
import PageHealthOverview from './pageHealthOverview'
import IssueSummary from './issueSummary'
import KeyFinding from './keyFinding'
import { CircleAlert, Newspaper, NotepadText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import OnPageAndTech from './OnPageAndTech'
import Content from './Content'
import StructureData from './StructureData'
import ImageAndMedia from './imageAndMedia'
import LinkMap from './linkMap'
import PageExp from './PageExp'
import { IoSearchOutline } from "react-icons/io5";
import { LuNotebookPen } from "react-icons/lu";
import { MdOutlineInsertLink } from "react-icons/md";
import { CiImageOn } from "react-icons/ci";

const PageOverviewDrawer = ({ onClose, isOpen, siteIssuesData, siteDetailPageData, affectedDetailsPageData }: any) => {

    const [activeTab, setActiveTab] = useState<string>("Summary");
    const [crawlMapType, setCrawlMapType] = useState("mobile")

    const tabItems = [
        {
            label: "Summary",
            shortLabel: "Summary",
            key: "Summary",
            icon: FiBarChart2,
        },
        {
            label: "On Page & Technical",
            shortLabel: "On Page & Technical",
            key: "On Page & Technical",
            icon: IoSearchOutline,
        },
        {
            label: "Content",
            shortLabel: "Content",
            key: "Content",
            icon: LuNotebookPen,
            disabled: true
        },
        {
            label: "Page Exp.",
            shortLabel: "Page Exp.",
            key: "Page Exp.",
            icon: CircleAlert,
            disabled: true
        },
        {
            label: "Struct. Data",
            shortLabel: "Struct. Data",
            key: "Struct. Data",
            icon: FiDatabase,
        },
        {
            label: "Link Map",
            shortLabel: "Link Map",
            key: "Link Map",
            icon: MdOutlineInsertLink,
        },
        {
            label: "Image & Media",
            shortLabel: "Image & Media",
            key: "Image & Media",
            icon: CiImageOn,
        }
    ];


    const handleActiveTabe = (active: any) => {
        if (active !== "Page Exp." && active !== "Content") {
            setActiveTab(active)
        }
    }


    return (
        <Drawer
            placement="right"
            onClose={onClose}
            open={isOpen}
            width={1300}
            closable={false}
            bodyStyle={{ padding: 10 }}
        >
            <div className='bg-white p-8'>
                <div className='flex flex-col pb-4 gap-[15px] w-full'>
                    <div className=' flex justify-between'>
                        <div className="flex justify-between items-start">
                            {/* Left Section */}
                            <div className="flex flex-col flex-1 min-w-0">


                                <div className="flex items-center gap-1">
                                    <span className="text-[#7F7F7F] text-[14px] font-medium">
                                        SEO Dashboard &gt; Site Audit &gt;
                                    </span>
                                    <span className="text-[#000000] text-[14px] font-medium">
                                        Page Audit
                                    </span>
                                </div>

                                {/* Truncated URL */}
                                <div className="flex gap-2 items-center mt-1">
                                    <h2
                                        className="text-[#000000] text-[18px] font-semibold truncate max-w-[600px]"
                                        title={affectedDetailsPageData?.url} // shows full URL on hover
                                    >
                                        Page Audit Overview – {affectedDetailsPageData?.url}
                                    </h2>
                                </div>
                            </div>

                            {/* Close Button */}

                        </div>

                        <div className='flex gap-5 items-center'>
                            <div className="border border-gray-300 rounded-lg flex overflow-hidden shadow-sm">
                                <button
                                disabled
                                    onClick={() => setCrawlMapType("mobile")}
                                    className={`text-sm font-medium cursor-pointer disabled:cursor-not-allowed transition-all duration-200 ${crawlMapType === "mobile" ? "bg-brand-blue text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                                        } px-4 py-2`}
                                >
                                    Mobile
                                </button>

                                <button
                                disabled
                                    onClick={() => setCrawlMapType("desktop")}
                                    className={`text-sm font-medium cursor-pointer disabled:cursor-not-allowed transition-all duration-200 ${crawlMapType === "desktop" ? "bg-brand-blue text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                                        } px-4 py-2 border-l border-gray-300`}
                                >
                                    Desktop
                                </button>
                            </div>
                            <button disabled className='text-sm py-2 font-medium cursor-pointer disabled:cursor-not-allowed rounded-sm transition-all duration-200 bg-brand-blue shadow-sm px-4 text-white'>
                                View Page Analytics
                            </button>
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-800 transition-all duration-150 p-2 rounded-md bg-gray-100 cursor-pointer"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>


                </div>
                <div className='border'></div>



                <div className="border-b border-gray-200 w-full bg-white pb-10 pt-10 px-4 flex overflow-x-auto">
                    <div className="flex flex-wrap sm:flex-nowrap w-full">
                        {tabItems.map((tab, index) => (
                            <button
                                key={index}
                                disabled={tab.disabled}
                                className={cn(
                                    "flex items-center justify-center py-3 px-4 relative whitespace-nowrap",
                                    "transition-all duration-200 min-w-[80px] sm:min-w-[100px]",
                                    "group",
                                    tab.disabled
                                        ? "text-gray-400 bg-gray-50 cursor-not-allowed"
                                        : activeTab === tab.key
                                            ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                                            : "text-gray-600 hover:bg-gray-100"
                                )}
                                onClick={() => {
                                    handleActiveTabe(tab.key)
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <tab.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate font-semibold hidden sm:inline">
                                        {activeTab === tab.key ? tab.label : tab.shortLabel}
                                    </span>
                                    {/* {tab.count && (
                                        <span
                                            className={cn(
                                                "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
                                                activeTab === tab.key
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-200 text-gray-800"
                                            )}
                                        >
                                            {tab.count}
                                        </span>
                                    )} */}
                                </div>
                            </button>
                        ))}
                    </div>
                    {/* <div className="flex items-center gap-1 ml-2 text-blue-600">
                        <FiRefreshCw className="cursor-pointer hover:scale-105 hover:bg-gray-100 h-6 w-6 p-1 rounded-sm" />
                        <FiUpload className="cursor-pointer hover:scale-105 hover:bg-gray-100 h-6 w-6 p-1 rounded-sm" />
                        <FiEdit3 className="cursor-pointer hover:scale-105 hover:bg-gray-100 h-6 w-6 p-1 rounded-sm" />
                        <FiBarChart2 className="cursor-pointer hover:scale-105 hover:bg-gray-100 h-6 w-6 p-1 rounded-sm" />
                    </div> */}
                </div>

                {activeTab === "Summary" &&
                    <div className='flex flex-col gap-10'>
                        <PageHealthOverview siteIssuesData={siteIssuesData} siteDetailPageData={siteDetailPageData}
                            affectedDetailsPageData={affectedDetailsPageData} />
                        <IssueSummary siteDetailPageData={siteDetailPageData}
                            affectedDetailsPageData={affectedDetailsPageData} />
                        <KeyFinding siteDetailPageData={siteDetailPageData}
                            affectedDetailsPageData={affectedDetailsPageData} />
                    </div>
                }
                {activeTab === "On Page & Technical" &&
                    <div className='flex flex-col gap-10'>
                        <OnPageAndTech siteDetailPageData={siteDetailPageData}
                            affectedDetailsPageData={affectedDetailsPageData} />
                    </div>
                }
                {activeTab === "Content" &&
                    <div className='flex flex-col gap-10'>
                        <Content siteDetailPageData={siteDetailPageData}
                            affectedDetailsPageData={affectedDetailsPageData} />
                    </div>
                }
                {activeTab === "Struct. Data" &&
                    <div className='flex flex-col gap-10'>
                        <StructureData siteDetailPageData={siteDetailPageData}
                            affectedDetailsPageData={affectedDetailsPageData} />
                    </div>
                }
                {activeTab === "Page Exp." &&
                    <div className='flex flex-col gap-10'>
                        <PageExp siteDetailPageData={siteDetailPageData}
                            affectedDetailsPageData={affectedDetailsPageData} />
                    </div>
                }
                {activeTab === "Link Map" &&
                    <div className='flex flex-col gap-10'>
                        <LinkMap siteDetailPageData={siteDetailPageData}
                            affectedDetailsPageData={affectedDetailsPageData} />
                    </div>
                }
                {activeTab === "Image & Media" &&
                    <div className='flex flex-col gap-10'>
                        <ImageAndMedia siteDetailPageData={siteDetailPageData} />
                    </div>
                }
            </div>
        </Drawer>
    )
}

export default PageOverviewDrawer