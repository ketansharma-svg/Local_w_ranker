


"use client"
import SetupModal from "@/src/components/common/SetupModal"
import { formatDateYear } from "@/src/util/helper"
import { BarChart3, Check, ChevronRight, ClipboardPlus, Plus, RefreshCw, Settings, Share2, Upload } from "lucide-react"
import { useEffect, useState } from "react"
import { ProjectSelector } from "../common/project-selector"
import { toast } from "sonner"
import { useSiteDetail } from "@/src/redux/providers/SiteDetailProvider"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import { BASE_URL_WR } from "@/src/util/api"
import { Progress } from "antd"
import axios from "axios"


const DashboardHeader = ({ activeSection, activeSubmenu, analysis_completed_at }: any) => {
  
  const { fetchDetails, crawling, crawlingData, setSiteId }: any = useSiteDetail()
  const [modalOpen, setModalOpen] = useState(false)
  const { selectedProject } = useProjectManager()
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);


  const cleanUrl = typeof selectedProject?.url === "string" ? selectedProject.url.replace(/\/$/, "") : "";

  const handleReCrawl = async () => {
    if (!cleanUrl) return;
    try {
      const res = await fetch(`${BASE_URL_WR}recrawl-project/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();

      toast.success("Re-crawl initiated successfully");
      setSiteId(selectedProject?.id);
      fetchDetails();
    } catch (err) {
      console.error("Re-crawl error:", err);
    }
  };

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (crawling) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 30
          return prev + 1
        })
      }, 100)
    } else {
      setProgress(100)
    }

    return () => clearInterval(timer)
  }, [])

  const handleCopy = async () => {
    try {
      setIsCopying(true);
      const res = await axios.get(
        `${BASE_URL_WR}shareable-link/project/${selectedProject?.id}/`,
      );
      if (res?.data?.hashed_id) {
        const projectUrl = `https://dashboard.wranker.com/project-details/${res.data.hashed_id}`;
        await navigator.clipboard.writeText(projectUrl);
        toast.success("URL copied to clipboard");
        setIsCopied(true); // Set state to true on successful copy
        setTimeout(() => {
          setIsCopied(false); // Reset state after 2 seconds
        }, 2000);
      }
    } catch (e) {
      console.log(e);
      toast.error("Failed to copy URL"); // Add error toast for better UX
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
    <div className="bg-white border-b border-gray-200 px-4 sm:pl-6">
      <div className="flex flex-col sm:flex-row flex-wrap lg:flex-nowrap justify-between items-start sm:items-center gap-4 pt-2 pb-3">
        {/* Left: Project Dropdown and Project Access */}
        <div className="flex flex-col gap-3 w-full sm:w-auto relative">
          <div className="text-sm sm:text-base text-gray-500 flex gap-1 items-center ">
            <span>{activeSection}</span>
            <ChevronRight className="text-gray-400 text-sm" />
            <span className="text-gray-900 font-medium">{activeSubmenu}</span>
          </div>


          <div className="flex  gap-2 items-center">


            {/* Site Audit Title and Project Selection Dropdown */}
            {/* <h1 className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">Site Audit:</h1> */}

            <ProjectSelector className="w-64" />

          </div>
        </div>

        <div className="flex flex-col sm:flex-col items-end gap-3 w-full sm:w-auto">

          <div className="flex flex-row gap-4 items-center ">
            {crawling && (
              <div className="flex items-center gap-2 w-60">
                <div className="wrapper">
                  <div className="padding-mask">
                    <div className="slide"></div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">Crawling…</span>
              </div>
            )}
            <div className="flex gap-1 items-center">
              <img src={"/images/valid.png"} className="h-[14px] w-auto" />
              <span>Last Audit : {formatDateYear(analysis_completed_at)}</span>
            </div>

          </div>

          <div className="flex items-center gap-2">
            {/* Create Project Button */}
            <button
              onClick={() => setModalOpen(true)}
              className="bg-brand-blue1 cursor-pointer hover:bg-brand-blue1/80 text-white px-3 sm:px-4 py-1.5 rounded-md flex items-center gap-1.5 text-sm sm:text-base whitespace-nowrap"
            >
              <Plus className="size-3 sm:size-4" />
              <span>Create Project</span>
            </button>

            {/* Action Buttons with Tooltip */}
            <button
              className="flex items-center p-1.5 text-sm sm:text-base whitespace-nowrap gap-1.5 sm:p-2 bg-gray-100 rounded-md text-gray-600 hover:text-gray-700 hover:bg-gray-200 transition-colors">
              <Upload className="size-3 sm:size-5" />
              <span>Export</span>
            </button>
            <IconButton icon={<RefreshCw className="text-base sm:text-lg" />} label="Re-crawl" onClick={handleReCrawl} disabled={crawling} />
            <IconButton icon={<ClipboardPlus className="text-base sm:text-lg" />} label="Create Task" />
    <IconButton
      icon={isCopied ? <Check className="text-base sm:text-lg" /> : <Share2 className="text-base sm:text-lg" />}
      label="Share"
      onClick={handleCopy}
    />            <IconButton icon={<BarChart3 className="text-base sm:text-lg" />} label="Add to Reports" />
            <IconButton icon={<Settings className="text-base sm:text-lg" />} label="Settings" />
          </div>

        </div>
      </div>
      <SetupModal modalOpen={modalOpen} setModalOpen={setModalOpen} />
    </div>
    </>
  )
}


const IconButton = ({ icon, label, onClick, disabled = false }: any) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={`p-1.5 sm:p-2 rounded-md transition-colors 
          ${disabled
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200"
          }`}      >
        {icon}
      </button>

      {/* Tooltip */}
      {hover && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-md">
            {label}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

export default DashboardHeader
