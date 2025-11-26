"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pagination, Popover, Button as AntBtn } from "antd";
import { BsInfo } from "react-icons/bs";
import { AiOutlinePicture } from "react-icons/ai";

// 🔗 Wranker hooks
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";
import { useProjectManager } from "@/src/hooks/use-project-manager";

const PAGE_SIZE = 10;

type Props = {
  siteDetailPageData: any;
};

const TK = {
  blue: "#0077FF",
  border: "#EFF0F6",
  text: "#1F2937",
  muted: "#6B7280",
} as const;

const ImageAndMedia: React.FC<Props> = ({ siteDetailPageData }) => {
  // ─────────────────────────── data plumbing ───────────────────────────
  const siteData = siteDetailPageData?.[0] || {};
  const pageUrl: string = siteData?.url || siteData?.original_url || "";
  const imagesData = siteData.images || {};
  const resourcesData = siteData.resources || {};

  const totalImages = imagesData.total_images || 0;
  const missingAltCount = imagesData.images_without_alt || 0;
  const imagesWithAlt = imagesData.images_with_alt || 0;

  const jsTotal = resourcesData.js?.total_files || 0;
  const jsSize = Math.round((resourcesData.js?.total_size_kb || 0) * 10) / 10;
  const cssTotal = resourcesData.css?.total_files || 0;
  const cssSize = Math.round((resourcesData.css?.total_size_kb || 0) * 10) / 10;

  // rows (Image Optimization table)
  const imageIssues = (imagesData.image_details || []).map((img: any, index: number) => {
    const filename = img.url?.split("/").pop() || `image-${index + 1}`;
    const sizeKB = img.size_bytes ? Math.round(img.size_bytes / 1024) : undefined;
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    const issues: string[] = [];
    if (!img.alt) issues.push("Missing Alt");
    if (typeof sizeKB === "number" && sizeKB > 200) issues.push("Oversized");
    if (!["webp", "avif", "svg"].includes(ext)) issues.push("Wrong Format");
    // We don't have lazy flag from API; assume "Not Lazy-loaded"
    issues.push("Not Lazy-loaded");

    return {
      preview: img.url || "/placeholder.svg",
      filename,
      alt: img.alt || "—",
      size: typeof sizeKB === "number" ? `${sizeKB} KB` : "Unknown",
      dimensions: "Unknown", // not in API
      lazy: false,
      issue: issues,
      raw: img,
    };
  });

  // rows (Broken Images & Media)
  const imageIssues2 =
    imagesData.image_details
      ?.filter((img: any) => !img.url || img.url === "")
      .map((img: any, index: number) => ({
        preview: "/placeholder.svg",
        type: "IMG",
        source_url: img.url || "Empty URL",
        error: "404",
        placement: "Body",
        severity: "High",
        status: "red-500",
        raw: img,
      })) || [];

  // rows (Alt Text Quality Audit)
  const imageIssues3 =
    imagesData.images_without_alt_details?.map((img: any, index: number) => ({
      preview: img.url || "/placeholder.svg",
      file: img.url?.split("/").pop() || `image-${index + 1}`,
      alt_text: "Missing",
      issue: "Missing Alt Text",
      length: "0",
      raw: img,
    })) || [];

  // ─────────────────────────── state: filters/search/pagination ───────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [issueFilters, setIssueFilters] = useState<Set<string>>(new Set());
  const [altFilters, setAltFilters] = useState<Set<string>>(new Set());

  const toggleFilter = (label: string, group: "issue" | "alt") => {
    const setter = group === "issue" ? setIssueFilters : setAltFilters;
    const current = group === "issue" ? new Set(issueFilters) : new Set(altFilters);
    current.has(label) ? current.delete(label) : current.add(label);
    setter(current);
    setCurrentPage(1);
  };

  const issueChips = [
    { label: "Missing Alt" },
    { label: "Oversized" },
    { label: "Not Lazy-loaded" },
    { label: "Wrong Format" },
  ];
  const altChips = [
    { label: "Missing" },
    { label: "Keyword Stuffed" },
    { label: "Too Long" },
    { label: "Too Generic" },
    { label: "Duplicate" },
  ];

  const searchNormalized = search.trim().toLowerCase();

  const filteredImageIssues = useMemo(() => {
    return imageIssues.filter((row) => {
      // search
      const hitSearch =
        !searchNormalized ||
        row.filename.toLowerCase().includes(searchNormalized) ||
        String(row.alt || "—").toLowerCase().includes(searchNormalized);

      // chips
      const active = Array.from(issueFilters);
      const hitChips = active.length === 0 || active.every((chip) => row.issue.includes(chip));

      return hitSearch && hitChips;
    });
  }, [imageIssues, searchNormalized, issueFilters]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentData = filteredImageIssues.slice(startIndex, startIndex + PAGE_SIZE);

  // ─────────────────────────── actions: create task / view analyzer ───────────────────────────
  const { openTaskDrawer } = useTaskDrawer();
  const { selectedProject } = useProjectManager();

  const createTask = (title: string, description: string) => {
    openTaskDrawer({
      title,
      description,
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
  };

  const describeCommon = () =>
    [
      `Page URL: ${pageUrl || "—"}`,
      `Images found: ${totalImages}`,
      `Images with alt: ${imagesWithAlt}`,
      `Images missing alt: ${missingAltCount}`,
      `JS: ${jsTotal} files (${jsSize} KB) · CSS: ${cssTotal} files (${cssSize} KB)`,
    ].join("\n");

  const createTaskForOptimizationRow = (row: any) => {
    const title = `Fix Image: ${row.filename} · ${row.issue.join(", ")}`;
    const desc = [
      describeCommon(),
      "",
      `File: ${row.filename}`,
      `Alt: ${row.alt}`,
      `Size: ${row.size}`,
      `Dimensions: ${row.dimensions}`,
      `Issues: ${row.issue.join(", ")}`,
      `Preview: ${row.preview}`,
    ].join("\n");
    createTask(title, desc);
  };

  const createTaskForBrokenRow = (row: any) => {
    const title = `Fix Broken Media: ${row.type} · ${row.error}`;
    const desc = [
      describeCommon(),
      "",
      `Source URL: ${row.source_url}`,
      `Placement: ${row.placement}`,
      `Severity: ${row.severity}`,
    ].join("\n");
    createTask(title, desc);
  };

  const createTaskForAltRow = (row: any) => {
    const title = `Write Alt Text: ${row.file}`;
    const desc = [
      describeCommon(),
      "",
      `File: ${row.file}`,
      `Issue: ${row.issue}`,
      `Suggested: Provide concise, descriptive, non-keyword-stuffed alt text.`,
      `Preview: ${row.preview}`,
    ].join("\n");
    createTask(title, desc);
  };


  const Pop = ({ text }: { text: string }) => (
    <Popover content={<div style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>{text}</div>}>
      <BsInfo className="text-[18px] cursor-pointer" color="#9E9E9E" />
    </Popover>
  );

  const Chip = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1 text-xs rounded-full border transition-colors",
        active ? "bg-[#D9EEF8] border-[#BFE9FF] text-[#008CCD]" : "bg-white border-[#E5E7EB] text-[#374151]",
      ].join(" ")}
    >
      {label}
    </button>
  );

  // ─────────────────────────── UI ───────────────────────────
  return (
    <>
      {/* Header / KPI cards */}
      <Card className="border border-gray-200 mt-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold">Performance Overview</h2>
              <Pop text="High-level image & static asset stats detected on this page." />
            </div>

            <div className="flex items-center gap-2">

              <AntBtn
                type="primary"
                onClick={() =>
                  createTask(
                    "Improve Page Media Performance",
                    [
                      describeCommon(),
                      "",
                      "Suggested actions:",
                      "• Add descriptive alt text for missing images.",
                      "• Convert large JPEG/PNG to WebP/AVIF.",
                      "• Enable lazy-loading where appropriate.",
                      "• Merge/minify critical CSS/JS if possible.",
                    ].join("\n")
                  )
                }
              >
                Create Task
              </AntBtn>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* KPI 1 */}
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium">Images with Missing Alt Text</span>
                <Pop text="Count of images missing accessible alt." />
              </div>
              <div className="mt-2">
                <span className="font-semibold text-[24px]" style={{ color: TK.blue }}>
                  {missingAltCount}
                </span>
                <div className="text-[12px] text-[#363636]">{missingAltCount > 0 ? "Needs Attention" : "All Good"}</div>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium">Total Images</span>
                <Pop text="Total <img> elements detected." />
              </div>
              <div className="mt-2">
                <span className="font-semibold text-[24px]" style={{ color: TK.blue }}>
                  {totalImages}
                </span>
                <div className="text-[12px] text-[#363636]">Images Found</div>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium">Images with Alt Text</span>
                <Pop text="Images that already provide alt attribute." />
              </div>
              <div className="mt-2">
                <span className="font-semibold text-[24px]" style={{ color: TK.blue }}>
                  {imagesWithAlt}
                </span>
                <div className="text-[12px] text-[#363636]">
                  {imagesWithAlt === totalImages ? "Perfect" : "Can Be Improved"}
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium">Static Assets</span>
                <Pop text="Total JS/CSS fetched on this page." />
              </div>
              <div className="mt-2 text-[13px] text-[#363636]">
                <div>JS: {jsTotal} files · {jsSize} KB</div>
                <div>CSS: {cssTotal} files · {cssSize} KB</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Optimization Issues */}
      <Card className="border border-gray-200 mt-4">
        <CardHeader>
          <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold">Image Optimization Issues</h2>
              <Pop text="Detect missing alt, large files, format, lazy-loading." />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by filename or alt text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-gray-50 border border-[#EFF0F6] text-[#676767] rounded-md text-[14px] w-[260px] p-2.5"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="pb-5 flex flex-wrap gap-2">
            {issueChips.map((c) => (
              <Chip
                key={c.label}
                label={c.label}
                active={issueFilters.has(c.label)}
                onClick={() => toggleFilter(c.label, "issue")}
              />
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">PREVIEW</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700 max-w-sm">FILENAME</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ALT TEXT</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">SIZE</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">DIMENSIONS</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">LAZY</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ISSUE</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentData.map((row: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <img src={row.preview} alt="" className="w-10 h-10 object-cover rounded" />
                    </td>
                    <td className="px-4 py-3 align-middle max-w-sm break-words">{row.filename}</td>
                    <td className="px-4 py-3 align-middle">{row.alt}</td>
                    <td className="px-4 py-3 align-middle">{row.size}</td>
                    <td className="px-4 py-3 align-middle">{row.dimensions}</td>
                    <td className="px-4 py-3 align-middle">{row.lazy ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-wrap gap-2">
                        {row.issue.map((i: string) => (
                          <span
                            key={i}
                            className="border border-red-300 bg-red-50 text-red-700 px-2 py-1 rounded text-xs"
                          >
                            {i}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <AntBtn type="primary" size="small" onClick={() => createTaskForOptimizationRow(row)}>
                          Create Task
                        </AntBtn>

                      </div>
                    </td>
                  </tr>
                ))}
                {currentData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                      No rows match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Showing {currentData.length} of {filteredImageIssues.length}
            </div>
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={filteredImageIssues.length}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Broken Images & Media */}
      {imageIssues2.length > 0 && (
        <Card className="border border-gray-200 mt-4">
          <CardHeader>
            <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold">Broken Images & Media Elements</h2>
                <Pop text="Media elements with invalid/missing sources detected at crawl." />
              </div>
              <div className="flex items-center gap-2">

                <AntBtn
                  type="primary"
                  onClick={() =>
                    createTask(
                      "Fix Broken Media Links",
                      [
                        describeCommon(),
                        "",
                        "Resolve the broken/empty media source URLs detected on the page.",
                      ].join("\n")
                    )
                  }
                >
                  Create Task
                </AntBtn>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">PREVIEW</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">TYPE</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">SOURCE URL</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ERROR</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">PLACEMENT</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">SEVERITY</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imageIssues2.map((row: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <img src={row.preview} alt="" className="w-10 h-10 object-cover rounded" />
                    </td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="px-4 py-3 break-all">{row.source_url}</td>
                    <td className="px-4 py-3">{row.error}</td>
                    <td className="px-4 py-3">{row.placement}</td>
                    <td className="px-4 py-3 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {row.severity}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AntBtn type="primary" size="small" onClick={() => createTaskForBrokenRow(row)}>
                          Create Task
                        </AntBtn>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Alt Text Quality Audit */}
      {imageIssues3.length > 0 && (
        <Card className="border border-gray-200 mt-4">
          <CardHeader>
            <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold">Alt Text Quality Audit</h2>
                <Pop text="Flags assets that need descriptive, concise alt text." />
              </div>
              <div className="flex items-center gap-2">
                {altChips.map((c) => (
                  <Chip
                    key={c.label}
                    label={c.label}
                    active={altFilters.has(c.label)}
                    onClick={() => toggleFilter(c.label, "alt")}
                  />
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">PREVIEW</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">FILE</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ALT TEXT</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ISSUE</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">LENGTH</th>
                  <th className="text-left py-3 px-4 text-[13px] font-medium text-gray-700">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imageIssues3.map((row: any, index: number) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <img src={row.preview} alt="" className="w-10 h-10 object-cover rounded" />
                    </td>
                    <td className="px-4 py-3">{row.file}</td>
                    <td className="px-4 py-3">{row.alt_text}</td>
                    <td className="px-4 py-3">{row.issue}</td>
                    <td className="px-4 py-3">{row.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AntBtn type="primary" size="small" onClick={() => createTaskForAltRow(row)}>
                          Create Task
                        </AntBtn>


                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ImageAndMedia;
