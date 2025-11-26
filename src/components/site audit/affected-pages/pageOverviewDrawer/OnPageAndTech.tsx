import { useProjectManager } from "@/src/hooks/use-project-manager"
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider"
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { BsInfo } from "react-icons/bs"

interface SEOCheckItem {
  title: string
  description: string
  status: "ok" | "warning" | "issue"
  hasInfo?: boolean
  value?: string | number
  details?: string
}

const OnPageAndTech = ({ siteDetailPageData, affectedDetailsPageData }: any) => {
  const { openTaskDrawer } = useTaskDrawer();
  const { selectedProject } = useProjectManager();
  const data = siteDetailPageData?.[0] || {}

  const seoChecks: SEOCheckItem[] = [
    {
      title: "Meta Title",
      description: "Core for keyword targeting & CTR",
      status: data.title?.valid ? "ok" : "issue",
      hasInfo: true,
      value: data.title?.content || "Not found",
      details: `Length: ${data.title?.length || 0} characters`,
    },
    {
      title: "Meta Description",
      description: "Summary shown in SERP, affects CTR",
      status: data.meta_description?.valid ? "ok" : "warning",
      hasInfo: true,
      value: data.meta_description?.content || "Not found",
      details: `Length: ${data.meta_description?.length || 0} characters`,
    },
    {
      title: "Meta Robots Tag",
      description: "Tells bots how to index/crawl page",
      status: data.robots_meta?.valid ? "ok" : "warning",
      hasInfo: true,
      value: data.robots_meta?.content || "No robots meta tag found",
      details: `Index: ${data.robots_meta?.index_status || "index"}, Follow: ${data.robots_meta?.follow_status || "follow"}`,
    },
    {
      title: "Canonical Tag",
      description: "Prevent duplicate content indexing",
      status: data.canonical_url?.valid ? "ok" : "issue",
      hasInfo: true,
      value: data.canonical_url?.content || "Not found",
      details: `Length: ${data.canonical_url?.length || 0} characters`,
    },
    {
      title: "Heading Tags (H1-H3)",
      description: "Structure, keyword hierarchy",
      status: data.headings?.valid ? "ok" : "issue",
      hasInfo: true,
      value: `H1: ${data.headings?.h1_count || 0}, H2: ${data.headings?.h2_count || 0}, H3: ${data.headings?.h3_count || 0}`,
      details: data.headings?.h1?.[0] || "No H1 found",
    },
    {
      title: "Content-Length Check",
      description: "Short/thin content alert",
      status: (data.word_count || 0) > 300 ? "ok" : "warning",
      hasInfo: true,
      value: `${data.word_count || 0} words`,
      details: (data.word_count || 0) < 300 ? "Content may be too short" : "Good content length",
    },
    {
      title: "Image Alt Tags",
      description: "Affects accessibility + image SEO",
      status: data.images?.images_without_alt === 0 ? "ok" : data.images?.images_without_alt > 3 ? "issue" : "warning",
      hasInfo: true,
      value: `${data.images?.images_with_alt || 0}/${data.images?.total_images || 0} with alt text`,
      details: `${data.images?.missing_alt_text || 0} images missing alt text`,
    },
    {
      title: "Internal Outlinks Count",
      description: "On-page link structure",
      status: (data.internal_links?.length || 0) > 0 ? "ok" : "warning",
      hasInfo: true,
      value: `${data.internal_links?.length || 0} internal links`,
      details: `${data.external_links?.length || 0} external links`,
    },
  ]

  const sectionB = [
    {
      title: "Indexable (Yes/No)",
      description: "Ensures page is findable",
      value: data.robots_meta?.index_status === "index" ? "Yes" : "No",
      status: data.robots_meta?.index_status === "index" ? "ok" : "issue",
    },
    {
      title: "Crawlable (Yes/No)",
      description: "Based on robots.txt, internal links",
      value: data.robots_meta?.follow_status === "follow" ? "Yes" : "No",
      status: data.robots_meta?.follow_status === "follow" ? "ok" : "issue",
    },
    {
      title: "HTTP Status Code",
      description: "Must be 200 for crawl & index",
      value: data.redirect_status || "Unknown",
      status: data.redirect_status === 200 ? "ok" : "issue",
    },
    {
      title: "Redirect Chain",
      description: "Avoid unnecessary redirects",
      value: `${data.redirect_chain?.length - 1 || 0} redirects`,
      status: (data.redirect_chain?.length - 1 || 0) <= 1 ? "ok" : "warning",
    },
    {
      title: "Canonical Conflicts",
      description: "Must point to final destination",
      value: data.canonical_url?.valid ? "No conflicts" : "Conflicts detected",
      status: data.canonical_url?.valid ? "ok" : "issue",
    },
    {
      title: "Robots.txt Blocking",
      description: "Crawl control check",
      value: "Not blocked",
      status: "ok",
    },
    {
      title: "Sitemap Inclusion",
      description: "Should be present in sitemap",
      value: "Check required",
      status: "warning",
    },
    {
      title: "HTTPS + SSL Valid",
      description: "Security standard",
      value: data.security?.ssl_info?.ssl_valid ? "Valid SSL" : "Invalid SSL",
      status: data.security?.ssl_info?.ssl_valid ? "ok" : "issue",
    },
    {
      title: "Safe Browsing Check",
      description: "Avoids flagged listings",
      value: data.security?.safe_browsing?.safe ? "Safe" : "Threats detected",
      status: data.security?.safe_browsing?.safe ? "ok" : "issue",
    },
    {
      title: "Crawl Depth",
      description: "Indicates crawl priority",
      value: "Unknown",
      status: "warning",
    },
    {
      title: "Page Load Size (KB)",
      description: "Technical health (optional here)",
      value: `JS: ${data.resources?.js?.total_size_kb?.toFixed(1) || 0}KB, CSS: ${data.resources?.css?.total_size_kb?.toFixed(1) || 0}KB`,
      status:
        (data.resources?.js?.total_size_kb || 0) + (data.resources?.css?.total_size_kb || 0) < 3000 ? "ok" : "warning",
    },
  ]

  return (
    <>
      <div className="bg-white border rounded-md mt-4 mx-auto shadow-sm w-full">
        <div className="flex justify-between text-base p-6  font-semibold  items-center bg-blue-100 pb-4">
          <div className="flex text-[18px] font-semibold items-center">
            <h2 className="text-[18px] font-semibold">Section A: On-Page SEO Checks</h2>
            <BsInfo className="h-7 w-7 font-semibold cursor-pointer" color="#9E9E9E" />
          </div>
        </div>
        <div className="px-6 pt-4">
          <span className="text-sm text-gray-600 italic">
            Focus: Content-related HTML elements, metadata, crawl hints
          </span>
        </div>
        <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 p-6  md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 ">
          {seoChecks?.map((items: any, idx: any) => (
            <div key={idx} className="bg-white p-4 rounded-md border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <span className="text-[#000000] text-[14px] font-semibold">{items.title}</span>
                  <BsInfo size={20} color="#9E9E9E" />
                  {items.status === "ok" && <CheckCircle size={16} className="text-green-500" />}
                  {items.status === "warning" && <AlertTriangle size={16} className="text-yellow-500" />}
                  {items.status === "issue" && <XCircle size={16} className="text-red-500" />}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-5">
                    <span className=" flex justify-start font-normal text-sm text-gray-400 text-[14px]">
                      {items.description}
                    </span>
                  </div>
                  {items.value && (
                    <div className="text-sm font-medium text-gray-700 bg-gray-50 p-2 rounded">{items.value}</div>
                  )}
                  {items.details && <div className="text-xs text-gray-500">{items.details}</div>}
                  <span
                    onClick={() =>
                      openTaskDrawer({
                        title: items.title,
                        description: [items.description, items.value].filter(Boolean).join(" - "),
                        projectId: selectedProject?.id ?? null,
                        type: "createNew",
                      })
                    }
                    className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer align-middle underline decoration-solid">
                    Create Task
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-md mt-4 mx-auto shadow-sm w-full">
        <div className="flex justify-between text-base p-6  font-semibold  items-center bg-blue-100 pb-4">
          <div className="flex text-[18px] font-semibold items-center">
            <h2 className="text-[18px] font-semibold">Section B: Technical SEO Checks</h2>
            <BsInfo className="h-7 w-7 font-semibold cursor-pointer" color="#9E9E9E" />
          </div>
        </div>
        <div className="px-6 pt-4">
          <span className="text-sm text-gray-600 italic">Focus: indexability, crawlability, rendering, security</span>
        </div>
        <div className="flex-[4] grid grid-cols-12 sm:grid-cols-1 p-6  md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 ">
          {sectionB?.map((items: any, idx: any) => (
            <div key={idx} className="bg-white p-4 rounded-md border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <span className="text-[#000000] text-[14px] font-semibold">{items.title}</span>
                  <BsInfo size={20} color="#9E9E9E" />
                  {items.status === "ok" && <CheckCircle size={16} className="text-green-500" />}
                  {items.status === "warning" && <AlertTriangle size={16} className="text-yellow-500" />}
                  {items.status === "issue" && <XCircle size={16} className="text-red-500" />}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-5">
                    <span className=" flex justify-start font-normal text-sm text-gray-400 text-[14px]">
                      {items.description}
                    </span>
                  </div>
                  {items.value && (
                    <div className="text-sm font-medium text-gray-700 bg-gray-50 p-2 rounded">{items.value}</div>
                  )}
                  <span
                    onClick={() =>
                      openTaskDrawer({
                        title: items.title,
                        description: [items.description, items.value].filter(Boolean).join(" - "),
                        projectId: selectedProject?.id ?? null,
                        type: "createNew",
                      })
                    }
                    className="text-[#0077FF] flex justify-end font-normal text-[15px] cursor-pointer align-middle underline decoration-solid">
                    Create Task
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default OnPageAndTech
