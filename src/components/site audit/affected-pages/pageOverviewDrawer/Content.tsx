import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Card } from 'antd'
import Image from 'next/image'
import React from 'react'
import { BsInfo } from 'react-icons/bs'
import { Lightbulb, Link2, FileQuestion, Target, PenTool, Search } from "lucide-react";
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const Content = ({siteDetailPageData, affectedDetailsPageData }:any) => {


    const suggestions = [
        {
            title: "Add Section on 'SEO Audit Tools'",
            description:
                "Your content covers the audit process well, but doesn't mention tools. Consider adding a paragraph on SEMrush, Screaming Frog, or Ahrefs to enhance depth and match competitor coverage.",
            tags: [
                { label: "Boost Depth", color: "bg-brand-blue" },
                { label: "Improve Relevance", color: "bg-brand-green" },
            ],
            icon: <Lightbulb className="w-5 h-5 text-red-500" />,
        },
        {
            title: "Add Internal Link to \"/seo-checklist\"",
            description:
                "Link from paragraph discussing audit steps to your SEO Checklist guide. Improves crawlability and user experience.",
            tags: [{ label: "Smart Interlinking", color: "bg-brand-green" }],
            icon: <Link2 className="w-5 h-5 text-green-600" />,
        },
        {
            title: "Add FAQ Block with Schema",
            description:
                "Include 2–3 common questions about SEO Audits. Helps capture People Also Ask features and improve SERP visibility.",
            tags: [{ label: "SERP Visibility Boost", color: "bg-brand-yellow" }],
            icon: <FileQuestion className="w-5 h-5 text-orange-500" />,
        },
        {
            title: "Improve Intent Alignment",
            description:
                "Content is informational; add a CTA for audit service to target transactional queries and improve conversion potential.",
            tags: [
                { label: "Intent Match", color: "bg-brand-blue" },
                { label: "Conversion Boost", color: "bg-brand-yellow" },
            ],
            icon: <Target className="w-5 h-5 text-pink-600" />,
        },
        {
            title: "Improve Tone Consistency",
            description:
                "Introduction section has overly generic tone. Consider making it more engaging and specific to your target audience.",
            tags: [{ label: "Tone Enhancement", color: "bg-brand-yellow" }],
            icon: <PenTool className="w-5 h-5 text-orange-500" />,
        },
        {
            title: "Address Content Gap: Schema Audit",
            description:
                "Your page doesn't mention schema audit – common topic in 80% of top-ranking pages. Adding this section could improve competitiveness.",
            tags: [
                { label: "Content Gap", color: "bg-brand-red" },
                { label: "Competitive Edge", color: "bg-brand-blue" },
            ],
            icon: <Search className="w-5 h-5 text-red-500" />,
        },
    ];

    return (
        <>
            <Card className="border border-gray-200 mt-4">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">Keyword Optimization Overview</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>
                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent >
                    <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ">
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">Primary Keyword Usage Coverage</span>
                                    {/* <BsInfo size={18} color="#9E9E9E" /> */}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="font-semibold text-[24px] text-[#0077FF]">{3 / 4}</span>
                                        <span className="font-semibold text-[24px] text-[#0077FF]">Areas</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${60}%` }}
                                        ></div>
                                    </div>
                                    <span className="flex gap-2 items-center text-[12px] text-[#363636]">
                                        <span>✅ Title</span>
                                        <span>✅ Meta</span>
                                        <span>✅ H1</span>
                                        <span>⚠ Body</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">Secondary Keyword Coverage</span>
                                    {/* <BsInfo size={18} color="#9E9E9E" /> */}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="font-semibold text-[24px] text-[#0077FF]">{6 / 10}</span>
                                        <span className="font-semibold text-[24px] text-[#0077FF]">Terms</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${60}%` }}
                                        ></div>
                                    </div>
                                    <span className="font-normal text-[12px] text-[#363636]">60% LSI coverage - needs improvement</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">Keyword Density</span>
                                    {/* <BsInfo size={18} color="#9E9E9E" /> */}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="font-semibold text-[24px] text-[#0077FF]">{2.9}</span>
                                        <span className="font-semibold text-[24px] text-[#0077FF]">%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${60}%` }}
                                        ></div>
                                    </div>

                                    <span className="font-normal text-[12px] text-[#363636]">Slightly high - optimal range is 1-2.5%</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">Over-Optimization Flags</span>
                                    {/* <BsInfo size={18} color="#9E9E9E" /> */}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="font-semibold text-[24px] text-[#0077FF]">{14}</span>
                                        <span className="font-semibold text-[24px] text-[#0077FF]">Times</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${60}%` }}
                                        ></div>
                                    </div>
                                    <span className="font-normal text-[12px] text-[#363636]">Repeated in 3 consecutive paragraphs -consider variation</span>
                                </div>
                            </div>
                        </div>
                    </div >
                </CardContent>
            </Card>

            <Card className="w-full bg-white shadow-sm border rounded-lg">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">Word Count & Structure Analysis</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>
                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-6 p-4">
                    {/* Left Side Stats */}
                    <div className="flex flex-col gap-4 w-1/4">
                        {/* Word Count */}
                        <div className="flex flex-col items-start bg-green-50 border rounded-lg p-3">
                            <span className="text-gray-600 text-sm">Word Count</span>
                            <span className="text-2xl font-bold text-green-700">1,460</span>
                            <span className="text-xs text-green-600">Good Length</span>
                        </div>

                        {/* Headings */}
                        <div className="flex flex-col items-start bg-blue-50 border rounded-lg p-3">
                            <span className="text-gray-600 text-sm">Headings</span>
                            <span className="text-2xl font-bold text-blue-700">11 Total</span>
                            <span className="text-xs text-blue-600">H1: 1 | H2: 5 | H3: 4</span>
                        </div>

                        {/* Paragraphs */}
                        <div className="flex flex-col items-start bg-purple-50 border rounded-lg p-3">
                            <span className="text-gray-600 text-sm">Paragraphs</span>
                            <span className="text-2xl font-bold text-purple-700">22</span>
                            <span className="text-xs text-purple-600">Avg: 68 words</span>
                        </div>

                        {/* Avg Sentence Length */}
                        <div className="flex flex-col items-start bg-orange-50 border rounded-lg p-3">
                            <span className="text-gray-600 text-sm">Avg. Sentence Length</span>
                            <span className="text-2xl font-bold text-orange-700">21.5</span>
                            <span className="text-xs text-orange-600">Words/Sentence</span>
                        </div>
                    </div>

                    {/* Right Side Outline */}
                    <div className="flex-1 border-l w-3/4 pl-6">
                        <ul className="space-y-2 text-sm w-full text-gray-700">
                            <li className='flex justify-between'>
                                <span className="font-semibold">H1: Complete SEO Audit Guide</span>
                                <span className="ml-2 text-gray-500 bg-gray-200 rounded-sm p-1">1460 words</span>
                            </li>
                            <li className="ml-4 flex justify-between">
                                <span className="font-semibold">H2: What is an SEO Audit?</span>
                                <span className="ml-2 text-gray-500 bg-gray-200 rounded-sm p-1">240 words</span>
                            </li>
                            <li className="ml-8 flex justify-between">
                                <span className="font-semibold">H3: Technical vs On-Page Audit</span>
                                <span className="ml-2 text-gray-500 bg-gray-200 rounded-sm p-1">180 words</span>
                            </li>
                            <li className="ml-4 flex justify-between">
                                <span className="font-semibold">H2: Step-by-Step Audit Checklist</span>
                                <span className="ml-2 text-gray-500 bg-gray-200 rounded-sm p-1">600 words</span>
                            </li>
                            <li className="ml-8 flex justify-between">
                                <span className="font-semibold">H3: Tools You’ll Need</span>
                                <span className="ml-2 text-gray-500 bg-gray-200 rounded-sm p-1">220 words</span>
                            </li>
                            <li className="ml-8 flex justify-between">
                                <span className="font-semibold">H3: Common Mistakes</span>
                                <span className="ml-2 text-gray-500 bg-gray-200 rounded-sm p-1">138 words</span>
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card className="w-full bg-white shadow-sm border rounded-lg">
                <CardHeader>
                    <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                        <div className="flex text-[18px] font-semibold gap-1 items-center">
                            <h2 className="text-[18px] font-semibold">AI Suggestions for Better Content Optimization</h2>
                            <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                        </div>
                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </CardHeader>

                {/* Card Grid */}
                <CardContent>
                    <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 mt-4 ">
                        {suggestions?.map((items: any, idx:any) => (
                            <div key={idx} className="bg-white p-4 rounded-md border border-gray-200">
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <span className="text-[#000000] text-[14px] font-semibold">{items.title}</span>
                                        <BsInfo size={20} color="#9E9E9E" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-5">
                                            <span className=" flex justify-start font-normal text-sm text-gray-400 text-[14px]">{items.description}</span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            {items.tags?.map((tag: any, idx:any) => (
                                                <div key={idx} className='text-[14px] font-medium flex items-center gap-2'>
                                                    <div className={`w-2 h-2 rounded-full ${tag.color}`}></div>
                                                    <span>{tag.label}</span>
                                                </div>
                                            ))}
                                            <span className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer align-middle underline decoration-solid">Create Task</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div >

                </CardContent>
            </Card>

        </>
    )
}

export default Content