"use client"
import type React from "react"
import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, RefreshCw, Download, Copy, StopCircle } from "lucide-react"
import { PiArrowBendLeftUpBold } from "react-icons/pi"
import Cookies from "js-cookie"
import { toast } from "sonner"
import Image from "next/image"
import { Select } from "antd"
import { BASE_URL_WR } from "@/src/util/api"
interface SitemapEntry {
  loc: string
  lastmod: string
}
export default function SitemapGenerator() {
  const [url, setUrl] = useState("")
  const [sitemapEntries, setSitemapEntries] = useState<SitemapEntry[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentUrl, setCurrentUrl] = useState("")
  const [analyzedUrls, setAnalyzedUrls] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)
  const [isFirstAnalysis, setIsFirstAnalysis] = useState(true)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [urlLimit, setUrlLimit] = useState<number>(0) // 0 means no limit
  const stopGenerationRef = useRef(false)
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
  }
  const handleUrlLimitChange = (value: string) => {
    setUrlLimit(Number.parseInt(value))
  }
  const stopGeneration = () => {
    stopGenerationRef.current = true
    toast.info("Stopping sitemap generation...")
  }
  const analyzeUrl = useCallback(
    async (urlToAnalyze: string): Promise<string[]> => {
      const access_token = Cookies.get("login_access_token_wrank")
      const response = await fetch(`${BASE_URL_WR}sitemap-generator/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ url: urlToAnalyze }),
      })
      const data = await response.json()
      if (isFirstAnalysis) {
        setIsFirstAnalysis(false)
      }
      return data.data.internal_links.map((link: any) => link.url)
    },
    [isFirstAnalysis],
  )
  const generateSitemap = useCallback(
    async (startUrl: string) => {
      const urlsToAnalyze = new Set([startUrl])
      const analyzed = new Set<string>()
      const distinctUrls = new Set<string>()
      // Reset stop flag
      stopGenerationRef.current = false
      while (urlsToAnalyze.size > 0) {
        // Check if we should stop generation
        if (stopGenerationRef.current) {
          toast.success("Sitemap generation stopped")
          break
        }
        // Check if we've reached the URL limit
        if (urlLimit > 0 && analyzed.size >= urlLimit) {
          toast.success(`Reached limit of ${urlLimit} URLs`)
          break
        }
        const currentUrl = Array.from(urlsToAnalyze)[0]
        urlsToAnalyze.delete(currentUrl)
        if (analyzed.has(currentUrl)) {
          continue
        }
        setCurrentUrl(currentUrl)
        try {
          const internalLinks = await analyzeUrl(currentUrl)
          analyzed.add(currentUrl)
          if (!distinctUrls.has(currentUrl)) {
            distinctUrls.add(currentUrl)
            setSitemapEntries((prevEntries) => [
              ...prevEntries,
              {
                loc: currentUrl,
                lastmod: new Date().toISOString(),
              },
            ])
          }
          internalLinks.forEach((link) => {
            if (!analyzed.has(link) && !urlsToAnalyze.has(link)) {
              urlsToAnalyze.add(link)
            }
          })
          setAnalyzedUrls(analyzed)
          setProgress((analyzed.size / (analyzed.size + urlsToAnalyze.size)) * 100)
        } catch (error) {
          console.error(`Error analyzing ${currentUrl}:`, error)
        }
      }
      return Array.from(distinctUrls)
    },
    [analyzeUrl, urlLimit],
  )
  const handleSubmit = async () => {
    if (!url) {
      toast.error("Please enter a URL")
      return
    }
    setIsGenerating(true)
    setSitemapEntries([]) // Reset sitemapEntries
    setAnalyzedUrls(new Set())
    setProgress(0)
    setCurrentUrl("")
    setIsFirstAnalysis(true)
    setStartTime(Date.now())
    setEndTime(null)
    try {
      await generateSitemap(url)
      if (!stopGenerationRef.current) {
        toast.success("Sitemap Generated Successfully!")
      }
    } 
    catch (error) {
      console.error("Error in sitemap generation:", error)
      toast.error("Failed to Generate Sitemap")
    } 
    finally {
      setIsGenerating(false)
      setCurrentUrl("")
      setEndTime(Date.now())
    }
  }
  const generateSitemapXML = () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${sitemapEntries
  .map(
    (entry) => `
  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
  </url>`,
  )
  .join("")}
</urlset>`
    return xmlContent
  }
  const handleCopySitemap = async () => {
    const sitemapXML = generateSitemapXML()
    try {
      await navigator.clipboard.writeText(sitemapXML)
      toast.success("Sitemap copied to clipboard!")
    } catch (err) {
      console.error("Failed to copy sitemap:", err)
      toast.error("Failed to copy sitemap")
    }
  }
  const handleDownloadSitemap = () => {
    const sitemapXML = generateSitemapXML()
    const blob = new Blob([sitemapXML], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sitemap.xml"
    a.click()
  }
  return (
    <div className="min-h-screen ">
      <main className=" mx-auto ">
        <section className="mb-12">
          <div className="shadowop rounded-xl bg-white p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <p className="mb-2 block text-lg font-medium text-gray-700">
                Generate a sitemap for your website to improve SEO and help search engines crawl your site more
                efficiently.
              </p>
              <div className="flex gap-3  ">
<div className="w-1/2">
              <div className="relative">
                <input
                  type="url"
                  id="website-url"
                  className="w-full rounded-lg bg-brand-blue1/10 px-4 py-3 pr-12 transition-all focus:outline-none focus:ring-2 focus:ring-blue"
                  placeholder="Enter website URL (e.g., https://example.com)"
                  value={url}
                  onChange={handleUrlChange}
                  />
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-blue1">
                <PiArrowBendLeftUpBold className="text-xl" />
                <span>Enter the complete URL including https:// or http://</span>
              </div>
                  </div>
              <div className="flex flex-col w-1/2  gap-4 sm:flex-row sm:items-center">
                <div className="w-full ">
                  <Select
                    defaultValue="0"
                    style={{ width: "100%" }}
                    onChange={handleUrlLimitChange}
                    options={[
                      { value: "0", label: "No limit" },
                      // { value: "10", label: "10 URLs" },
                      { value: "25", label: "25 URLs" },
                      { value: "50", label: "50 URLs" },
                      { value: "100", label: "100 URLs" },
                      { value: "200", label: "200 URLs" },
                      { value: "250", label: "250 URLs" },
                      { value: "500", label: "500 URLs" },
                      { value: "750", label: "750 URLs" },
                      { value: "1000", label: "1000 URLs" },
                      { value: "2500", label: "2500 URLs" },
                    ]}
                  />
                  <label className="mb-2 mt-2 flex  text-xs font-medium text-brand-blue1">
                  <PiArrowBendLeftUpBold className="text-xl" />
    Enter number of URLs in sitemap
  </label>
                </div>
              </div>
              </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={isGenerating}
                    className="smooth3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue1 px-8 py-2 text-white transition-colors hover:scale-105 sm:w-auto text-sm"
                  >
                  {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating Sitemap...
                      </>
                  ) 
                  :
                  (
                      <>
                        <RefreshCw className="h-5 w-5" />
                        Generate Sitemap
                      </>
                    )}
                  </button>

                  {isGenerating && (
                    <button
                      onClick={stopGeneration}
                      className="smooth3 flex items-center justify-center gap-2 rounded-lg bg-red-500 px-8 py-2 text-white transition-colors hover:bg-red-600"
                    >
                      <StopCircle className="h-5 w-5" />
                      Stop
                    </button>
                  )}
                </div>


              {isGenerating && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-gray-600">Currently analyzing: {currentUrl}</p>
                  <div className="h-2.5 w-full rounded-full bg-gray-200">
                    <div className="smooth3 h-2.5 rounded-full bg-purple" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    URLs analyzed: {analyzedUrls.size}
                    {urlLimit > 0 ? ` / ${urlLimit}` : ""}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {sitemapEntries.length > 0 ? (
          ""
        ) : (
          <div className="mx-auto flex w-full flex-col justify-between px-4 py-12 md:flex-row md:px-8 lg:px-16">
            <div className="flex w-full flex-col items-start gap-8 text-gray-700 md:w-1/2">
              <div className="flex flex-col gap-4">
                <h3 className="text-3xl font-semibold leading-tight text-gray-800">
                  Create a Comprehensive Sitemap for Better SEO
                </h3>
                <p className="text-base leading-relaxed text-gray-600">
                  Enter a webpage URL to generate a sitemap and optimize your website&apos;s performance.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-gray-700">Benefits:</h3>
                <ul className="flex flex-col gap-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    Improve Navigation: Ensure search engines and users can easily find all pages on your site
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    Boost SEO: Help search engines crawl your site effectively.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    Identify Gaps: Detect missing or inaccessible pages in your structure.
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-medium text-brand-blue1">Try it now!</span>
                <span className="text-sm text-gray-600">Enter a link above to see the results.</span>
              </div>
            </div>

            <div className="mt-8 flex w-full items-center justify-center md:mt-0 md:w-1/2">
              <div className="relative aspect-square w-full max-w-[500px]">
                <Image
                  src="/images/sitemapgen.svg"
                  width={1000000}
                  height={1000000}
                  className=" scale-150 transform object-contain "
                  alt="SEO Analysis Dashboard"
                  priority
                />
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {sitemapEntries.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="shadowop rounded-xl bg-white p-6 text-homeblack ">
                <h2 className="mb-4 text-2xl font-semibold">Generated Sitemap</h2>
                <div className="mb-4">
                  <p>
                    <strong>Total URLs:</strong> {sitemapEntries.length}
                  </p>
                  <p>
                    <strong>Generation Time:</strong>{" "}
                    {startTime && endTime ? `${((endTime - startTime) / 1000).toFixed(2)} seconds` : "N/A"}
                  </p>
                </div>
                <div className="mb-6 flex space-x-4">
                  <button
                    onClick={handleCopySitemap}
                    className="flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-white  transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Sitemap
                  </button>
                  <button
                    onClick={handleDownloadSitemap}
                    className="flex items-center gap-2 rounded-lg bg-brand-blue1 px-4 py-2 text-white  transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Sitemap
                  </button>
                </div>
                <div className="max-h-96 max-w-screen-lg overflow-auto rounded-lg bg-gray-100 p-4">
                  <pre className="text-sm">
                    <code>{generateSitemapXML()}</code>
                  </pre>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
