"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  Fragment,
} from "react";
import {
  motion,
  AnimatePresence,
  Variants,
} from "framer-motion";
import { RefreshCw, LinkIcon, Loader2 } from "lucide-react";
import { PiArrowBendLeftUpBold } from "react-icons/pi";
import Cookies from "js-cookie";
import { toast } from "sonner";
import Image from "next/image";
import { BASE_URL_WR } from "@/src/util/api";

interface AnalysisState {
  internal_links: any[];
  external_links: any[];
  broken_links: any[];
  total_internal: number;
  total_external: number;
  total_broken: number;
}

type FilterMode = "all" | "brokenOnly";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      delay: index * 0.01,
      ease: "easeOut",
    },
  }),
  exit: {
    opacity: 0,
    y: 10,
    filter: "blur(4px)",
    transition: { duration: 0.25, ease: "easeInOut" },
  },
};

const BrokenLinkCheck: React.FC = () => {
  const [url, setUrl] = useState("");
  const [responseData, setResponseData] = useState<AnalysisState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentlyAnalyzing, setCurrentlyAnalyzing] = useState<string | null>(
    null
  );
  const [progress, setProgress] = useState(0);
  const [filterText, setFilterText] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [analysisResults, setAnalysisResults] = useState<
    { url: string; data: AnalysisState }[]
  >([]);
  const [isFirstAnalysis, setIsFirstAnalysis] = useState(true);
  const [error, setError] = useState<string>("");
  const [analyzedurl, setAnalyzedurl] = useState<number | null>(null);

  // New: filter mode for result cards
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const validateURL = (value: string) => {
    const urlRegex = new RegExp(
      "^(https?:\\/\\/)" +
        "((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*\\.)+[a-zA-Z]{2,}|" +
        "((\\d{1,3}\\.){3}\\d{1,3}))|" +
        "\\[([a-fA-F\\d:]+)\\])" +
        "(:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*" +
        "(\\?[;&a-zA-Z\\d%_.~+=-]*)?" +
        "(#[-a-zA-Z\\d_]*)?$",
      "i"
    );
    return urlRegex.test(value);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    if (value.trim() && !validateURL(value)) {
      setError("Please enter a valid URL starting with http:// or https://");
    } else {
      setError("");
    }
  };

  const analyzeUrl = useCallback(
    async (urlToAnalyze: string): Promise<AnalysisState> => {
      const access_token = Cookies.get("login_access_token_wrank");
      const response = await fetch(`${BASE_URL_WR}link-analyzer-details/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify({ url: urlToAnalyze, domain: isFirstAnalysis }),
      });

      const data = await response.json();
      if (isFirstAnalysis) setIsFirstAnalysis(false);
      // keep responseData internally if you want chartData later
      setResponseData({
        internal_links: data.data.internal_links || [],
        external_links: data.data.external_links || [],
        broken_links: data.data.broken_links || [],
        total_internal: data.data.total_internal ?? 0,
        total_external: data.data.total_external ?? 0,
        total_broken: data.data.total_broken ?? 0,
      });
      return data.data;
    },
    [isFirstAnalysis]
  );

  const recursiveAnalysis = useCallback(
    async (startUrl: string) => {
      const urlsToAnalyze = new Set([startUrl]);
      const analyzed = new Set<string>();

      const uniqueInternalUrls = new Set<string>();
      const uniqueExternalUrls = new Set<string>();
      const uniqueBrokenUrls = new Set<string>();

      while (urlsToAnalyze.size > 0) {
        const currentUrl = Array.from(urlsToAnalyze)[0];
        urlsToAnalyze.delete(currentUrl);

        if (analyzed.has(currentUrl)) continue;

        setCurrentlyAnalyzing(currentUrl);

        try {
          const analysis = await analyzeUrl(currentUrl);
          analyzed.add(currentUrl);

          analysis.internal_links.forEach((link: any) => {
            if (!uniqueInternalUrls.has(link.url)) {
              uniqueInternalUrls.add(link.url);
              if (!analyzed.has(link.url)) urlsToAnalyze.add(link.url);
            }
          });

          analysis.external_links.forEach((link: any) => {
            uniqueExternalUrls.add(link.url);
          });

          analysis.broken_links.forEach((link: any) => {
            if (!uniqueBrokenUrls.has(link.url)) uniqueBrokenUrls.add(link.url);
          });

          const result: AnalysisState = {
            internal_links: analysis.internal_links,
            external_links: analysis.external_links,
            broken_links: analysis.broken_links,
            total_internal: uniqueInternalUrls.size,
            total_external: uniqueExternalUrls.size,
            total_broken: uniqueBrokenUrls.size,
          };

          setAnalysisResults((prevResults) => [
            ...prevResults,
            { url: currentUrl, data: result },
          ]);

          setAnalyzedurl(analyzed.size);
          setProgress(
            (analyzed.size / (analyzed.size + urlsToAnalyze.size)) * 100
          );
        } catch (err) {
          console.error(`Error analyzing ${currentUrl}:`, err);
        }
      }
    },
    [analyzeUrl]
  );

  const handleSubmit = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }
    if (error) {
      toast.error(error);
      return;
    }

    setAnalysisResults([]);
    setFilterMode("all");
    setIsAnalyzing(true);
    setResponseData(null);
    setProgress(0);
    setCurrentlyAnalyzing(url);
    setIsFirstAnalysis(true);
    setAnalyzedurl(null);

    try {
      await recursiveAnalysis(url);
      toast.success("Analysis completed!");
    } catch (err) {
      console.error("Error in recursive analysis:", err);
      toast.error("Failed to complete analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.info("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const filteredAndSortedLinks = useMemo(() => {
    if (!responseData) return { internal: [], external: [], broken: [] };

    const filterLinks = (links: any[]) =>
      links.filter(
        (link) =>
          (link?.url
            ?.toLowerCase()
            .includes(filterText.toLowerCase()) ||
            link?.text?.toLowerCase().includes(filterText.toLowerCase())) &&
          (selectedType === "all" || link.type === selectedType)
      );

    return {
      internal: filterLinks(responseData.internal_links),
      external: filterLinks(responseData.external_links),
      broken: filterLinks(responseData.broken_links),
    };
  }, [responseData, filterText, selectedType]);

  useEffect(() => {
    if (responseData) {
      // reserved for future side-effects
    }
  }, [filteredAndSortedLinks, responseData]);

  const totalUniqueBrokenLinks = useMemo(() => {
    return Array.from(
      new Set(
        analysisResults.flatMap(({ data }) =>
          data.broken_links.map((link) => link.url)
        )
      )
    ).length;
  }, [analysisResults]);

  // Apply filterMode to result cards
  const visibleResults = useMemo(() => {
    if (filterMode === "brokenOnly") {
      return analysisResults.filter(
        ({ data }) => data.broken_links && data.broken_links.length > 0
      );
    }
    return analysisResults;
  }, [analysisResults, filterMode]);

  const showEmptyState = !analyzedurl && !isAnalyzing;

  return (
    <div className="min-h-screen">
      <main>
        {/* Top input section */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-op p-8 shadowop">
            <motion.div
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="space-y-2"
            >
              <p className="text-lg font-medium text-gray-700 mb-2">
                Check Your Website for Broken Links
              </p>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="url"
                    id="website-url"
                    className="w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue transition-all"
                    placeholder="Enter website URL (e.g., https://example.com)"
                    value={url}
                    onChange={handleUrlChange}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <LinkIcon className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
                <div className="text-xs font-semibold text-blue flex items-center gap-2">
                  <PiArrowBendLeftUpBold className="font-bold text-xl" />
                  <span>
                    Enter the complete URL including https:// or http://
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!!error || !url || isAnalyzing}
                    className="w-full md:w-auto px-8 py-2 bg-brand-blue1 text-white rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Analyze Links
                      </>
                    )}
                  </button>
                </div>
                {isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <p className="text-sm text-black mb-2">
                      Currently analyzing:{" "}
                      <span className="font-medium">
                        {currentlyAnalyzing}
                      </span>
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        className="bg-brand-blue1 h-2.5 rounded-full"
                        style={{ width: `${progress}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Empty state section */}
        {showEmptyState && (
          <section className="flex flex-col md:flex-row w-full justify-between px-4 md:px-8 lg:px-16 py-12 mx-auto">
            <motion.div
              className="w-full md:w-1/2 flex flex-col items-start gap-8 text-gray-700"
              initial={{ opacity: 0, x: -24, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex flex-col gap-4">
                <h3 className="text-3xl font-semibold leading-tight text-gray-800">
                  Detect and Fix Broken Links on Your Website
                </h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Enter a webpage URL to identify broken links and improve your
                  website&apos;s performance.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Benefits:
                </h3>
                <ul className="flex flex-col gap-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue" />
                    Enhance User Experience: Ensure visitors do not encounter
                    dead links.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue" />
                    Boost SEO: Help search engines crawl your site without
                    issues.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue" />
                    Save Time: Quickly detect broken internal and external
                    links.
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-blue font-medium">Try it now.</span>
                <span className="text-sm text-gray-600">
                  Enter a link above to see the results.
                </span>
              </div>
            </motion.div>

            <motion.div
              className="w-full md:w-1/2 flex items-center justify-center mt-8 md:mt-0"
              initial={{ opacity: 0, x: 24, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="relative w-full max-w-[500px] aspect-square">
                <Image
                  src="/images/brokenlink.svg"
                  width={1000000}
                  height={1000000}
                  className="object-contain transform scale-150"
                  alt="SEO Analysis Dashboard"
                  priority
                />
              </div>
            </motion.div>
          </section>
        )}


        {/* Results section */}
        {analyzedurl && (
          <section className="text-black mx-auto space-y-3 p-6 pt-0 md:pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              {/* Left: metric labels act as filters */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`text-base font-semibold transition-colors cursor-pointer hover:underline  ${
                    filterMode === "all"
                      ? "text-brand-blue1"
                      : "text-gray-800 hover:text-brand-blue1"
                  }`}
                >
                  Analyzed urls : {analyzedurl}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("brokenOnly")}
                  className={`text-base font-semibold transition-colors cursor-pointer block text-left hover:underline`}
                >
                  <span
                    className={
                      filterMode === "brokenOnly"
                        ? "text-red-600"
                        : "text-black hover:text-red-600"
                    }
                  >
                    Total Unique Broken Links Found on the Website:{" "}
                    {totalUniqueBrokenLinks}
                  </span>
                </button>
              </div>

              {/* Optional compact filter hint */}
              <div className="text-xs text-gray-500">
                {filterMode === "all"
                  ? "Showing all analyzed URLs."
                  : "Showing only URLs that contain broken links."}
              </div>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {visibleResults.map(({ url: itemUrl, data }, index) => (
                  <motion.div
                    key={itemUrl}
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    exit="exit"
                    viewport={{ once: true, amount: 0.25 }}
                    className="bg-white shadowop rounded-lg p-6 mb-2"
                  >
                    <p className="text-sm text-black mb-4 break-words">
                      <span className="font-bold text-brand-blue1">Analyzed URL: </span>
                      <a
                        href={itemUrl}
                        className="text-blue hover:underline break-all"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {itemUrl}
                      </a>
                    </p>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">
                        Broken Links On This URL:{" "}
                        {data.broken_links.length > 0
                          ? data.broken_links.length
                          : "0"}
                      </h4>

                      {data.broken_links.length > 0 ? (
                        <ul className="list-disc space-y-2">
                          {data.broken_links.map(
                            (link: any, linkIndex: number) => (
                              <motion.li
                                key={`${itemUrl}-${link.url}-${linkIndex}`}
                                initial={{ opacity: 0, x: -6, filter: "blur(2px)" }}
                                whileInView={{
                                  opacity: 1,
                                  x: 0,
                                  filter: "blur(0px)",
                                }}
                                viewport={{ once: true, amount: 0.4 }}
                                transition={{
                                  duration: 0.3,
                                  delay: linkIndex * 0.02,
                                }}
                                className="text-sm text-red-500 flex flex-col gap-1 p-2 rounded-lg bg-gray-100"
                              >
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline truncate block break-words"
                                >
                                  {link.url}
                                </a>
                                <div className="flex items-center justify-between gap-2 text-xs text-red-500 uppercase">
                                  <span>
                                    Status Code: {link.status_code}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-[11px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                    onClick={() => handleCopyLink(link.url)}
                                  >
                                    Copy link
                                  </button>
                                </div>
                              </motion.li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-black">
                          No broken links found for this URL.
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* No results state after filter */}
            {visibleResults.length === 0 && (
              <div className="text-sm text-gray-600 mt-4">
                No URLs match the current filter.
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default BrokenLinkCheck;
