import { useProjectManager } from '@/src/hooks/use-project-manager'
import { useTaskDrawer } from '@/src/redux/providers/TaskDrawerProvider'
import { formatTypeLabel } from '@/src/util/helper'
import Image from 'next/image'
import React from 'react'
import { BsInfo } from 'react-icons/bs'

const KeyFinding = ({ siteDetailPageData, affectedDetailsPageData }: any) => {
    const { openTaskDrawer } = useTaskDrawer();
    const { selectedProject } = useProjectManager();

    const groupedIssues = affectedDetailsPageData?.issues.reduce((acc: any, issue: any) => {
        if (!acc[issue.type]) {
            acc[issue.type] = { ...issue, count: 1 };
        } else {
            acc[issue.type].count += 1; 
        }
        return acc;
    }, {});

    const issuesArray = Object.values(groupedIssues);

    return (
        <div className="bg-white border rounded-md p-6 mt-4 mx-auto shadow-sm w-full">
            <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
                <div className="flex text-[18px] font-semibold items-center">
                    <h2 className="text-[18px] font-semibold">Key Findings</h2>
                    <BsInfo className="h-7 w-7 font-semibold cursor-pointer" color="#9E9E9E" />
                </div>
                <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2.5'>
                    <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                    <span>Export</span>
                </div>
            </div>
            <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 ">

                {issuesArray.filter((issue: any) => issue.type !== "link_health").map((issue: any, index: number) => {
                    const label = formatTypeLabel(issue.type);

                    return (
                        <div key={index} className="bg-white p-4 rounded-md border border-gray-200">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 items-center">
                                    <span className="text-[#000000] text-[14px] font-semibold">
                                        {label}
                                    </span>
                                    <BsInfo size={20} color="#9E9E9E" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-5">
                                        <span className="font-semibold text-[24px] text-[#0077FF]">{issue.count}</span>
                                    </div>
                                    <div className='flex justify-between items-center'>
                                        <span className=" flex justify-start font-normal text-[14px]">
                                            {`${issue.issue_type.replace(/[\u{1F600}-\u{1FAFF}]/gu, '').trim()} Impact - SEO`}
                                        </span>
                                        <span
                                            onClick={() =>
                                                openTaskDrawer({
                                                    title: label,
                                                    projectId: selectedProject?.id ?? null,
                                                    type: "createNew",
                                                })
                                            }
                                            className="text-[#0077FF] font-normal text-[15px] cursor-pointer align-middle underline decoration-solid">
                                            Create Task
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div >
        </div >
    )
}

export default KeyFinding