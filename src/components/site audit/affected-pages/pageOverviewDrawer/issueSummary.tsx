import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import React, { useMemo } from 'react'
import { BsInfo } from 'react-icons/bs'
import { motion } from "framer-motion";

const IssueSummary = ({ siteDetailPageData, affectedDetailsPageData }: any) => {

    const low_issue_counts = affectedDetailsPageData?.issue_counts["🟡 Low"] || 0
    const critical_issue_counts = affectedDetailsPageData?.issue_counts["🔴 Critical"] || 0
    const warning_issue_counts = affectedDetailsPageData?.issue_counts["🟠 Warning"] || 0
    const info_issue_counts = affectedDetailsPageData?.issue_counts["Warning"] || 0

    const total_issues =
        (low_issue_counts ?? 0) +
        (critical_issue_counts ?? 0) +
        (warning_issue_counts ?? 0) +
        (info_issue_counts ?? 0);

    const low_percentage = total_issues ? (low_issue_counts / total_issues) * 100 : 0;
    const critical_percentage = total_issues ? (critical_issue_counts / total_issues) * 100 : 0;
    const warning_percentage = total_issues ? (warning_issue_counts / total_issues) * 100 : 0;
    const info_percentage = total_issues ? (info_issue_counts / total_issues) * 100 : 0;


    return (
        <Card className="border border-gray-200">
            <CardHeader>
                <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                    <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                        Issue Summary
                        <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                    </CardTitle>

                    <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                        <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                        <span>Export</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <h2 className="text-[14px] font-normal text-gray-900 mb-4">Total Issues: <span className="text-brand-blue">{affectedDetailsPageData.total_issues}</span></h2>

                {/* Progress bar */}
                <motion.div
                    className="w-full h-6 bg-gray-200 rounded-sm overflow-hidden flex"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <motion.div
                        className="h-full bg-brand-red"
                        variants={{
                            hidden: { width: 0 },
                            visible: { width: `${critical_percentage}%`, transition: { duration: 0.6, ease: "easeOut" } },
                        }}
                    />
                    <motion.div
                        className="h-full bg-brand-warning"
                        variants={{
                            hidden: { width: 0 },
                            visible: { width: `${warning_percentage}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.1 } },
                        }}
                    />
                    <motion.div
                        className="h-full bg-brand-yellow"
                        variants={{
                            hidden: { width: 0 },
                            visible: { width: `${low_percentage}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.2 } },
                        }}
                    />
                    <motion.div
                        className="h-full bg-brand-blue"
                        variants={{
                            hidden: { width: 0 },
                            visible: { width: `${info_percentage}%`, transition: { duration: 0.6, ease: "easeOut", delay: 0.3 } },
                        }}
                    />
                </motion.div>

                {/* Legend */}
                <div className="flex gap-6 mt-3 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                        <span>Critical: {critical_issue_counts || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-brand-warning rounded-full"></div>
                        <span>Warning: {warning_issue_counts || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-brand-yellow rounded-full"></div>
                        <span>Low: {low_issue_counts || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-brand-blue rounded-full"></div>
                        <span>Info: {info_issue_counts || 0}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

    )
}

export default IssueSummary