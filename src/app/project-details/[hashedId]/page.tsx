"use client";
import CommonLoading from "@/src/components/common/Loader";
import Loader from "@/src/components/common/Loader";
import CampaignActivity from "@/src/components/public/CampaignActivity";
import CrawledData from "@/src/components/public/crawledData";
import KeywordData from "@/src/components/public/KeywordData";
import KeywordTracking from "@/src/components/public/KeywordTracking";
import PageSpeed from "@/src/components/public/PageSpeed";
import Suggestion from "@/src/components/public/suggestion";
import { useProjectContext } from "@/src/redux/providers/ProjectContext";
import { BASE_URL_WR } from "@/src/util/api";
import axios from "axios";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
declare global {
  interface Window {
    pollingCleanup: (() => void) | null;
  }
  interface Link {
    url: string;
  }
}
if (typeof window !== "undefined") {
  window.pollingCleanup = null;
}
export default function SeoDashboard({ params }: { params: any }) {
  const { hashedId }:any = use(params);
  const { projects, sharedProjects } = useProjectContext();
  const [apiData, setApiData] = useState<any>();
  const [projectId, setProjectId] = useState<any>(null);
  const [isSharedProject, setIsSharedProject] = useState(false);
  const [projectSuggestion, setProjectSuggestion] = useState(null);

  const [domainInfo, setDomainInfo] = useState(null);
  
  const [detailedData, setDetailedData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allLinks, setAllLinks] = useState<any>([]);

  const [loading, setLoading] = useState(false);
  const [keyword_Data, setkeyword_Data] = useState<any>();
  const [lastCrawled, setlastCrawled] = useState<any>("N/A");
  const [seo_score, setseo_score] = useState("N/A");
  const [pagespeed, setpagespeed] = useState<any>(null);
  const [suggestion, setsuggestion] = useState<any>();
  const Router = useRouter();
  const [status_code, setstatus_code] = useState("pending");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [load, setLoad] = useState(false);
  const [downloadallLinks, setdownloadallLinks] = useState(false);
  const [domainScore, setDomainScore] = useState(null);
  const [access_type, setaccess_type] = useState("edit");

  useEffect(() => {
    if (projects && projects.length > 0) {
      const exists = projects.some((project: any) => project.id === projectId);
      if (exists) {
        // Do something if projectId is still present
      } else {
        // Handle if it's no longer found
      }
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (projects.length > 0 || sharedProjects.length > 0) {
      setProjectId(null);
    }
  }, []);

  useEffect(() => {
    if (allLinks?.length > 0) {
      setSearchQuery(allLinks[0]?.url);
      setDetailedData(allLinks[0]);
    }
  }, [allLinks]);

  useEffect(() => {
    if (listRef.current && selectedIndex !== -1) {
      const selectedItem = listRef.current.children[selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  const handleSelectUrl = (index: any) => {
    if (index >= 0 && index < filteredLinks.length) {
      setSearchQuery(filteredLinks[index].url);
      setDetailedData(filteredLinks[index]);
      setShowDropdown(false);
      setSelectedIndex(index);
    }
  };

  useEffect(() => {
    if (sharedProjects?.length) {
      const matched = sharedProjects.find(
        (elem: any) => elem?.project?.id === projectId,
      );
      if (matched) {
        setaccess_type(matched.access_type);
      }
    }
  }, [sharedProjects, projectId]);

  const handleKeyDown = (e: any) => {
    if (filteredLinks.length === 0) return;
    if (e.key === "ArrowDown") {
      setSelectedIndex((prev) =>
        prev < filteredLinks.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      handleSelectUrl(selectedIndex);
    }
  };

  const dashboardRef = useRef<HTMLDivElement | null>(null);

  const fetchProjectDetails = async () => {
    setLoading(true);
    try {
      let endpoint = `${BASE_URL_WR}project-details/${hashedId}`;
      const { data } = await axios.get(endpoint);
      setApiData(data);
      const seoAuditData = data?.seo_audit_data?.[0];

      setstatus_code(seoAuditData.status_code);
      if (seoAuditData && seoAuditData.status_code === "completed") {
        setDomainInfo(
          seoAuditData?.response?.data?.domain_info?.domain_info || null,
        );
        setDomainScore(seoAuditData?.response?.data?.domain_info || null);
        setAllLinks(seoAuditData?.response?.data?.links || []);
        setkeyword_Data(seoAuditData?.response?.data?.keyword_research);
        setseo_score(seoAuditData?.response?.data?.seo_score);
        setpagespeed(seoAuditData?.response?.data?.pagespeed_data);
        setsuggestion(
          seoAuditData?.response?.data?.pagespeed_data?.suggestions,
        );
        setlastCrawled(
          seoAuditData?.update_at
            ? new Date(seoAuditData?.update_at).toISOString().split("T")[0]
            : "",
        );
        return true;
      } else {
        return false;
      }
    } catch (error) {
      setLoading(false);
      console.error("Error fetching project details:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
    fetchProjectSuggestion();
  }, []);

  useEffect(() => {
    if (allLinks?.length > 0) {
      setSearchQuery(allLinks[0]?.url);
      setDetailedData(allLinks[0]);
    }
  }, [allLinks]);

  const fetchProjectSuggestion = async () => {
    try {
      let endpoint = `${BASE_URL_WR}seo-suggestions/${hashedId}`;
      const { data } = await axios.get(endpoint);

      setProjectSuggestion(data);
    } catch (error) {
      console.error("Error fetching project suggestions:", error);
    }
  };

  const filteredLinks = allLinks?.filter((elem: any) =>
    elem?.url.toLowerCase().includes(searchQuery.toLowerCase()),
  );


  return (
    <div ref={dashboardRef} className=" flex items-center justify-center">
      {loading ? (
        <CommonLoading />
      ) : (
        <div className=" max-w-screen-xl">
          <motion.div className="mt-8 rounded-lg border-t-[1px] border-slate-200 bg-white p-6 shadow-lg">
            {projectSuggestion && (
              <Suggestion
                Data={projectSuggestion}
                All_links={allLinks}
                total_link={allLinks?.length}
                seo_score={seo_score}
                domain_information={domainInfo}
                domainScore={domainScore}
              />
            )}
          </motion.div>

          <KeywordTracking
            projectId={projectId}
            isSharedProject={true}
            access_type={"view"}
            apidata={apiData}
          />

          <div className="mt-8 rounded-lg border-t-[1px] border-slate-200 bg-white p-6 shadow-lg">
            <CampaignActivity project_id={hashedId} isSharedProject={true} accessType={"view"} />
          </div>

          <div className="mt-8 rounded-xl py-12">
            {!pagespeed || !pagespeed.parsed_data ? (
              <div className="flex flex-col items-center justify-center p-10">
                <div className="flex max-h-screen items-center justify-center bg-white">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                </div>
                <p className="mt-4 text-gray-600">Crawling Your Site ...</p>
                <p className="mt-4 text-gray-600">
                  Please be patient while we gather your data. In the meantime,
                  feel free to explore our free SEO tools. We&lsquo;ll be back
                  with insights shortly!
                </p>
              </div>
            ) : (
              <PageSpeed
                data={pagespeed}
              />
            )}
          </div>

          {allLinks.error &&

          <div className="mt-8 rounded-xl border-t-[1px] border-slate-200 bg-white py-12 shadow-lg">
            <div className="mx-5 rounded-lg bg-lightblue p-2 px-4">
              <h3 className="text-xl font-semibold text-homeblack">
                Separate Link Analysis:
              </h3>
            </div>
            <div className="rounded-lg bg-white p-6">
              <div className="mb-5 flex items-center gap-2">
                <h3 className="text-xl font-semibold text-homeblack">
                  Total Pages Crawled:
                </h3>
                <span className="font-bold text-primary">
                  {allLinks?.length}
                </span>
              </div>
              <div className="relative w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search & Select URL..."
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 pr-10 outline-none"
                    value={searchQuery}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setSearchQuery(newValue);
                      setShowDropdown(true);
                      // Reset selection when typing (but keep the actual selected data)
                      if (newValue !== detailedData.url) {
                        setSelectedIndex(-1);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Show all URLs when backspace makes input empty
                      if (e.key === "Backspace" && searchQuery === "") {
                        setShowDropdown(true);
                      }
                      handleKeyDown(e);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 transform">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                {showDropdown && (
                  <ul
                    ref={listRef}
                    className="absolute left-0 z-999 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg"
                  >
                    {(searchQuery === "" ? allLinks : allLinks).map(
                      (elem, index) => (
                        <li
                          key={index}
                          onClick={() => {
                            setSearchQuery(elem.url);
                            setDetailedData(elem);
                            setShowDropdown(false);
                          }}
                          className={`cursor-pointer px-3 py-2 ${elem.url === detailedData.url
                            ? "bg-gray-100 shadow-md"
                            : "hover:bg-gray-100"
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 flex-shrink-0 text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              />
                            </svg>
                            <span className="truncate">{elem.url}</span>
                            {elem.url === detailedData.url && (
                              <span className="ml-auto rounded bg-primary px-2 py-1 text-xs text-white">
                                Selected
                              </span>
                            )}
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </div>
            </div>
            {!downloadallLinks && (
              <div className="mt-8 rounded-lg bg-white p-6">
                <CrawledData
                  Data={detailedData}
                  domain_information={domainInfo}
                />
              </div>
            )}
            {downloadallLinks &&
              allLinks?.map((elem: any, index: number) => (
                <div key={index} className="mt-8 rounded-lg bg-white p-6">
                  <CrawledData Data={elem} domain_information={domainInfo} />
                </div>
              ))}
          </div>}

          <motion.div className="mt-8 rounded-lg border-t-[1px] border-slate-200 bg-white p-6 shadow-lg">
            {keyword_Data && <KeywordData Data={keyword_Data} />}
          </motion.div>
        </div>
      )}
    </div>
  );
}
