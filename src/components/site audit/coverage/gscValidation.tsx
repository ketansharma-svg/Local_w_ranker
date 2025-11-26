'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaRedo } from 'react-icons/fa';
import { MdInfoOutline } from 'react-icons/md';
import { BsExclamationCircle } from 'react-icons/bs';
import exportIcon from "../../assests/Group 1000008949@3x.png"
import { useState } from 'react';
import Image from 'next/image';

const gscData = [
    {
        issue: 'Redirect Error',
        timeline: ['Detected', 'Validated', 'Reappeared'],
        lastEvent: 'Jun 10, 2025',
        validationStatus: 'Needs Fix Again',
    },
    {
        issue: 'Soft 404',
        timeline: ['Detected', 'Validated'],
        lastEvent: 'May 30, 2025',
        validationStatus: 'Fixed',
    },
    {
        issue: 'Noindex Excluded',
        timeline: ['Detected'],
        lastEvent: 'Apr 12, 2025',
        validationStatus: 'Awaiting Fix',
    },
];

const statusBadge: any = {
    Detected: { color: 'bg-red-100 text-red-600', icon: <BsExclamationCircle className="mr-1" /> },
    Validated: { color: 'bg-green-100 text-green-600', icon: <FaCheckCircle className="mr-1" /> },
    Reappeared: { color: 'bg-yellow-100 text-yellow-600', icon: <FaRedo className="mr-1" /> },
};

const validationBadge: any = {
    'Needs Fix Again': { color: 'text-red-600', icon: <FaTimesCircle className="mr-1" /> },
    Fixed: { color: 'text-green-600', icon: <FaCheckCircle className="mr-1" /> },
    'Awaiting Fix': { color: 'text-yellow-600', icon: <FaExclamationTriangle className="mr-1" /> },
};

export default function GscValidation() {

    const [GscValidationType, setGscValidationType] = useState("table")

    return (
        <Card className="border border-gray-200 mt-6">
            <CardHeader>
                <div className="flex justify-between items-center border-b pb-3">
                    <CardTitle className="text-[18px] font-medium flex items-center gap-2">
                        GSC Validation Timeline
                        <MdInfoOutline className="text-gray-500 text-lg" />
                    </CardTitle>

                    <div className="flex gap-3">
                        <div className=' border rounded  flex '>
                            <button
                                onClick={() => setGscValidationType("timeline")}
                                className={`text-[14px] font-normal cursor-pointer ${GscValidationType === "timeline" ? "bg-[#D9EEF8] text-[#008ccd]" : "text-gray-400 "} p-2 border-r rounded `}>
                                Timeline View
                            </button>
                            <button
                                onClick={() => setGscValidationType("table")}
                                className={`text-[14px] font-normal cursor-pointer ${GscValidationType === "table" ? " bg-[#D9EEF8]  text-[#008ccd]" : "text-gray-400 "} p-2 rounded `}>
                                Table View
                            </button>
                        </div>
                        <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                            <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                            <span>Export</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {GscValidationType === "table" &&
                    <table className="w-full">
                        <thead>
                            <tr className="border-b  text-left text-[14px] text-[#363636]">
                                <th className="py-2 px-4 font-normal text-[14px]">Issue Type</th>
                                <th className="py-2 px-4 font-normal text-[14px]">Status Timeline</th>
                                <th className="py-2 px-4 font-normal text-[14px]">Last Event</th>
                                <th className="py-2 px-4 font-normal text-[14px]">Validation Status</th>
                            </tr>
                        </thead>

                        <tbody className="w-full">


                            {gscData.map((row, idx) => (
                                <tr key={idx} className="border-b text-[14px] text-gray-700">
                                    <td className="py-3 px-4 font-medium flex items-center gap-1">
                                        {row.issue === 'Redirect Error' && (
                                            <FaTimesCircle className="text-red-600 text-[16px]" />
                                        )}
                                        {row.issue === 'Soft 404' && (
                                            <FaExclamationTriangle className="text-yellow-500 text-[16px]" />
                                        )}
                                        {row.issue === 'Noindex Excluded' && (
                                            <BsExclamationCircle className="text-pink-600 text-[16px]" />
                                        )}
                                        {row.issue}
                                    </td>

                                    <td className='py-3 px-4 '>
                                        <div className='flex gap-2'>
                                            {row.timeline.map((status, index) => (
                                                <span
                                                    key={index}
                                                    className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[status].color}`}
                                                >
                                                    {statusBadge[status].icon}
                                                    {status}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 ">{row.lastEvent}</td>
                                    <td className="py-3 px-4 font-medium flex items-center gap-1">
                                        <span className={validationBadge[row.validationStatus]?.color}>{validationBadge[row.validationStatus]?.icon}</span>
                                        <span className={""}>
                                            {row.validationStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }
                {GscValidationType === "timeline" &&
                    <div className="w-full flex flex-col gap-4">
                        {/* Redirect Error */}
                        <div className="flex items-start space-x-3 mb-4 w-full">
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-grow w-full">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Redirect Error</h3>
                                {/* Timeline */}
                                <div className="relative w-full">
                                    <div className="flex items-center justify-between mb-2 w-full">
                                        <span className="text-sm text-gray-600">Detected</span>
                                        <span className="text-sm text-gray-600">Validation Requested</span>
                                        <span className="text-sm text-gray-600">Fixed Confirmed</span>
                                        <span className="text-sm text-gray-600">Reappeared</span>
                                    </div>
                                    {/* Progress Line */}
                                    <div className="relative flex items-center mb-4 w-full">
                                        <div className="flex-grow h-0.5 bg-gray-200 relative">
                                            <div className="absolute left-0 top-0 h-0.5 bg-blue-500" style={{ width: '75%' }} />
                                        </div>
                                        {/* Status Points */}
                                        <div className="absolute left-0 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1.5" />
                                        <div className="absolute left-1/3 w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1.5" />
                                        <div className="absolute left-2/3 w-3 h-3 bg-green-500 rounded-full transform -translate-x-1.5" />
                                        <div className="absolute right-0 w-3 h-3 bg-orange-500 rounded-full transform translate-x-1.5" />
                                    </div>
                                    {/* Dates */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 w-full">
                                        <span>Apr 21</span>
                                        <span>May 2</span>
                                        <span>May 8</span>
                                        <span>Jun 10</span>
                                    </div>
                                </div>
                                <button className="mt-4 text-blue-600 text-sm hover:text-blue-800 font-medium">View Affected URLs</button>
                            </div>
                        </div>

                        {/* Soft 404 */}
                        <div className="flex items-start space-x-3 mb-4 w-full">
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-grow w-full">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Soft 404</h3>
                                {/* Timeline */}
                                <div className="relative w-full">
                                    <div className="flex items-center justify-between mb-2 w-full">
                                        <span className="text-sm text-gray-600">Detected</span>
                                        <span className="text-sm text-gray-600">Validation Requested</span>
                                        <span className="text-sm text-gray-600">Fixed Confirmed</span>
                                    </div>
                                    {/* Progress Line */}
                                    <div className="relative flex items-center mb-4 w-full">
                                        <div className="flex-grow h-0.5 bg-gray-200 relative">
                                            <div className="absolute left-0 top-0 h-0.5 bg-blue-500" style={{ width: '100%' }} />
                                        </div>
                                        {/* Status Points */}
                                        <div className="absolute left-0 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1.5" />
                                        <div className="absolute left-1/2 w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1.5" />
                                        <div className="absolute right-0 w-3 h-3 bg-green-500 rounded-full transform translate-x-1.5" />
                                    </div>
                                    {/* Dates */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 w-full">
                                        <span>Apr 28</span>
                                        <span>May 15</span>
                                        <span>May 30</span>
                                    </div>
                                </div>
                                <button className="mt-4 text-blue-600 text-sm hover:text-blue-800 font-medium">View Affected URLs</button>
                            </div>
                        </div>

                        {/* Noindex Excluded */}
                        <div className="flex items-start space-x-3 mb-4 w-full">
                            <div className="flex-shrink-0">
                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex-grow w-full">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Noindex Excluded</h3>
                                {/* Timeline */}
                                <div className="relative w-full">
                                    <div className="flex items-center justify-start mb-2 w-full">
                                        <span className="text-sm text-gray-600">Detected</span>
                                    </div>
                                    {/* Progress Line */}
                                    <div className="relative flex items-center mb-4 w-full">
                                        <div className="flex-grow h-0.5 bg-gray-200 relative">
                                            <div className="absolute left-0 top-0 h-0.5 bg-red-500" style={{ width: '10%' }} />
                                        </div>
                                        {/* Status Points */}
                                        <div className="absolute left-0 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1.5" />
                                    </div>
                                    {/* Dates */}
                                    <div className="flex items-start justify-start text-xs text-gray-500 w-full">
                                        <span>Apr 30</span>
                                    </div>
                                </div>
                                <button className="mt-4 text-blue-600 text-sm hover:text-blue-800 font-medium">View Affected URLs</button>
                            </div>
                        </div>
                    </div>
                }
            </CardContent>
        </Card>
    );
}
