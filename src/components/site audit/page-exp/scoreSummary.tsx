import { formatDate, normalizeselectedProjectUrl } from "@/src/util/helper";
import { Modal } from "antd";
import Image from "next/image";
import { useState } from "react";
import { BsInfo } from "react-icons/bs";
import { Cell, Pie, PieChart } from "recharts";

const ScoreSummary = ({ siteIssuesData, sitedetails, selectedProject }: any) => {
    
    const ScoreSummary = siteIssuesData?.result?.links?.find((item: any) => item.url === normalizeselectedProjectUrl(selectedProject.url));

    const [sslModalVisible, setSslModalVisible] = useState(false);
    const [redirectModalVisible, setRedirectModalVisible] = useState(false);

    const handleOpenModal = (type: any) => {
        if (type === "ssl") setSslModalVisible(true);
        if (type === "redirect") setRedirectModalVisible(true);
    };

    const redirectData = ScoreSummary?.redirect_chain?.length
        ? ScoreSummary.redirect_chain.map((r: any, i: number) => ({
            url: r.url,
            status: r.status_code,
            note: i === ScoreSummary.redirect_chain.length - 1 ? "Final destination" : "Redirect",
        }))
        : [];

    const statusColors: any = {
        200: "text-green-500 bg-green-100",
        301: "text-yellow-500 bg-yellow-100",
        302: "text-yellow-500 bg-yellow-100",
        303: "text-yellow-500 bg-yellow-100",
        404: "text-red-500 bg-red-100",
        500: "text-red-500 bg-red-100",
    };

    return (
        <>
            <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-4">
                <div className="col-span-1">
                    <div className="bg-white border rounded-md p-6 mx-auto shadow-sm w-full">
                        <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
                            <div className="flex text-[18px] font-semibold gap-1 items-center">
                                <h2 className="text-[18px] font-semibold">Page Verdict</h2>
                                <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                            </div>
                            <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                <span>Export</span>
                            </div>
                        </div>
                        <div className="gap-2 rounded-md flex flex-col items-center">
                            <span className="text-[#000000] text-[14px] font-medium">Page Health Score</span>
                            <div className="relative">
                                <PieChart width={200} height={200}>
                                    <Pie
                                        data={[
                                            { name: 'Score', value: ScoreSummary?.page_score ?? 0 },
                                            { name: 'Remaining', value: 100 - (ScoreSummary?.page_score ?? 0) },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                    >
                                        <Cell fill="#10B981" />
                                        <Cell fill="#E5E7EB" />
                                    </Pie>
                                </PieChart>
                                <div className="absolute inset-0 flex items-center justify-center space-x-2">
                                    <div className="text-3xl font-semibold text-gray-900">{ScoreSummary?.page_score ?? 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-span-3">
                    <div className="bg-white border rounded-md p-6 mx-auto shadow-sm w-full">
                        <div className="flex justify-between text-base font-semibold mb-4 items-center border-b pb-1">
                            <div className="flex text-[18px] font-semibold gap-1 items-center">
                                <h2 className="text-[18px] font-semibold">Score Summary</h2>
                                <BsInfo className="text-[20px] font-semibold cursor-pointer" color="#9E9E9E" />
                            </div>
                            <div className='flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md font-normal text-[14px] p-2'>
                                <Image alt='' src={"/images/WRanker - Export Icon grey.png"} className="cursor-pointer h-[14px] w-auto" height={0} width={0} />
                                <span>Export</span>
                            </div>
                        </div>
                        <div className="grid xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-4 items-stretch">
                            <div className="flex flex-col gap-2 border-r-2 pr-2">
                                <div className="flex gap-2 justify-between items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">SSL Certificate</span>
                                </div>
                                <div className="flex flex-col justify-between gap-[25px]">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-4 h-4 rounded-full ${ScoreSummary?.security?.ssl_info?.ssl_valid ? "bg-[#10B981]" : "bg-red-500"}`}></div>
                                        <span className="font-semibold text-[24px] text-[#0077FF]">{ScoreSummary?.security?.ssl_info?.ssl_valid ? "Valid" : "Invalid"}</span>
                                        <div className="h-[40px] w-[40px]"></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[13px] text-[#363636] font-medium flex items-center">
                                                Expires on {formatDate(ScoreSummary?.security?.ssl_info?.expiration_on)}
                                            </span>
                                            <span
                                                onClick={() => handleOpenModal("ssl")}
                                                className="text-[#0077FF] font-medium text-[13.18px] cursor-pointer leading-[20px] align-middle underline decoration-solid"
                                            >
                                                View Detail
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 border-r-2 pr-2">
                                <div className="flex gap-2 justify-between items-center">
                                    <span className="text-[#000000] text-[14px] font-medium">Redirect Chain</span>
                                </div>
                                <div className="flex flex-col gap-[25px]">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-4 h-4 rounded-full ${redirectData.length > 1 ? "bg-yellow-400" : "bg-[#10B981]"}`}></div>
                                        <span className="font-semibold text-[24px] text-[#0077FF]">{redirectData.length > 1 ? "Present" : "Not Present"}</span>
                                        <div className="h-[40px] w-[40px]"></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[13px] text-[#363636] font-medium flex items-center">
                                                {redirectData.map((redirect: any) => redirect.status).join(" -> ")}
                                            </span>
                                            <span
                                                onClick={() => handleOpenModal("redirect")}
                                                className="text-[#0077FF] font-medium text-[13.18px] cursor-pointer leading-[20px] align-middle underline decoration-solid"
                                            >
                                                View Detail
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid xl:grid-cols-2 lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 gap-4 items-stretch">
                                <div className="flex flex-col gap-2 border-r-2">
                                    <div className="flex flex-col gap-1 border-b-2 mr-[18px]">
                                        <span className="text-[#000000] text-[14px] font-medium">HTTPS Status</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${ScoreSummary?.seo_friendly?.protocol === "https" ? "bg-[#10B981]" : "bg-red-500"}`}></div>
                                            <span className="font-semibold text-[20px] text-[#0077FF]">{ScoreSummary?.seo_friendly?.protocol === "https" ? "Valid" : "Invalid"}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[#000000] text-[14px] font-medium">Safe Browsing</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${ScoreSummary?.security?.safe_browsing?.safe ? "bg-[#10B981]" : "bg-red-500"}`}></div>
                                            <span className="font-semibold text-[20px] text-[#0077FF]">{ScoreSummary?.security?.safe_browsing?.threats?.length > 0 ? "Threats found" : "No threats"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-1 border-b-2">
                                        <span className="text-[#000000] text-[14px] font-medium">Canonical URL</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${ScoreSummary?.canonical_url ? "bg-[#10B981]" : "bg-red-500"}`}></div>
                                            <span className="font-semibold text-[20px] text-[#0077FF]">{ScoreSummary?.canonical_url ? "Present" : "Not Present"}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[#000000] text-[14px] font-medium">Indexability</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${ScoreSummary?.robots_meta?.index_status === "index" ? "bg-[#10B981]" : "bg-red-500"}`}></div>
                                            <span className="font-semibold text-[20px] text-[#0077FF]">{ScoreSummary?.robots_meta?.index_status ?? "Unknown"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                open={sslModalVisible}
                footer={null}
                onCancel={() => setSslModalVisible(false)}
                width={600}
                centered
            >
                <div className="w-full rounded-md bg-white overflow-hidden">
                    <div className="p-4 border-b">
                        <h2 className="text-sm font-semibold text-blue-600">SSL Certificate Details</h2>
                        <p className="text-xs text-gray-500">{ScoreSummary?.url}</p>
                    </div>
                    <div className="p-4 flex flex-col gap-5 text-sm">
                        <div className="flex flex-col gap-1">
                            <p className="text-gray-600 font-medium">SSL Status</p>
                            <div className={`flex items-center gap-3 w-fit ${ScoreSummary?.security?.ssl_info?.ssl_valid ? "bg-green-200" : "bg-red-200"} p-2 rounded-full mt-1 border px-4`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${ScoreSummary?.security?.ssl_info?.ssl_valid ? "bg-green-500" : "bg-red-500"} text-[13px]`}></span>
                                <span className={`font-semibold text-[13px] ${ScoreSummary?.security?.ssl_info?.ssl_valid ? "text-green-600" : "text-red-600"}`}>{ScoreSummary?.security?.ssl_info?.ssl_valid ? "Valid" : "Invalid"}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex">
                                <Image alt="" height={0} width={0} className="text-gray-600 font-medium" src={"images/clock.svg"} />
                                <p className="text-gray-600 font-medium">Expiration Date</p>
                            </div>
                            <p className="text-gray-800 bg-gray-100 p-2 rounded-2xl mt-1 text-[13px]">{formatDate(ScoreSummary?.security?.ssl_info?.expiration_on)}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-gray-600 font-medium">Days Remaining</p>
                            <span className="inline-flex items-center gap-1 p-2 w-fit text-[13px] text-xs rounded-full px-4 bg-blue-100 text-blue-700 font-semibold">
                                ⏳ {ScoreSummary?.security?.ssl_info?.valid_days_remaining ?? "N/A"} days left
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-gray-600 font-medium">Registrar</p>
                            <p className="text-gray-800 mt-1 text-[13px]">{ScoreSummary?.security?.domain_info?.registrar ?? "N/A"}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-gray-600 font-medium">Domain Age</p>
                            <p className="text-gray-800 mt-1 text-[13px]">{ScoreSummary?.security?.domain_info?.domain_age?.formatted ?? "N/A"}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <p className="text-gray-600 font-medium">Safety Check</p>
                            <p className={`mt-1 inline-flex items-center text-[13px] p-2 w-fit px-4 text-xs rounded-full ${ScoreSummary?.security?.safe_browsing?.safe ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} font-semibold`}>
                                {ScoreSummary?.security?.safe_browsing?.safe ? "✅ Safe – No threats found" : "❌ Threats found"}
                            </p>
                        </div>
                        <div className="p-3 rounded-md bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                            <p className="font-medium mb-1">🔒 Why SSL matters</p>
                            <p>SSL certificates encrypt data between your website and visitors, ensuring secure connections and building trust.</p>
                        </div>
                    </div>
                    <div className="p-4 border-t border-blue-100">
                        <button className="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
                            Add to Report
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={redirectModalVisible}
                footer={null}
                onCancel={() => setRedirectModalVisible(false)}
                width={600}
                centered
            >
                <div className="bg-white rounded-md w-full max-w-lg p-6 relative">
                    <h2 className="text-xl font-semibold text-center mb-4">Redirect Chain Analysis</h2>
                    <div className="flex justify-between items-center bg-gray-50 rounded-md p-4 text-sm mb-4">
                        <div>
                            <div className="text-gray-500">Total Redirects</div>
                            <div className="font-medium">{redirectData.length -1}</div>
                        </div>
                        <div>
                            <div className="text-gray-500">Final Status</div>
                            <div className={`font-medium flex items-center gap-1 ${redirectData.length && redirectData[redirectData.length - 1].status === 200 ? "text-green-600" : "text-red-600"}`}>
                                {redirectData.length && redirectData[redirectData.length - 1].status === 200 ? "✅ 200" : "❌ Error"}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500">Loop Detected</div>
                            <div className="text-red-500 font-medium">❌ No</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 text-xs text-gray-500 font-medium py-2 border-b border-gray-200">
                        <div className="pl-2">#</div>
                        <div className="col-span-2">Redirect URL</div>
                        <div className="text-left">HTTP STATUS</div>
                        <div className="text-left">NOTES</div>
                    </div>
                    {redirectData.map((item: any, i: number) => {
                        const isFinal = item.status === 200;
                        return (
                            <div
                                key={i}
                                className={`grid grid-cols-5 items-center text-sm py-3 px-2 rounded-md ${isFinal ? "bg-blue-50" : ""}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-gray-200 text-xs flex items-center justify-center rounded-full text-gray-700">
                                        {i + 1}
                                    </div>
                                </div>
                                <div className="col-span-2 text-blue-600 text-xs">{item.url}</div>
                                <div className={`w-fit px-2 py-0.5 rounded-md text-xs ${statusColors[item.status] || ""}`}>
                                    {item.status}
                                </div>
                                <div className="text-[11px] text-gray-500 italic">{item.note}</div>
                            </div>
                        );
                    })}
                    <div className="text-xs text-gray-400 mt-4">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> 200 OK
                            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block ml-4"></span> 3xx Redirects
                            <span className="w-3 h-3 rounded-full bg-red-400 inline-block ml-4"></span> 4xx/5xx Errors
                        </div>
                    </div>
                    <div className="flex justify-end mt-6 gap-3">
                        <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100" onClick={() => setRedirectModalVisible(false)}>Close</button>
                        <button className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">Create Fix Task</button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ScoreSummary;
