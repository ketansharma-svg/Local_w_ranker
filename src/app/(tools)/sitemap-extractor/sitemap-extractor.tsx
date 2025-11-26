"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Download, Copy, ExternalLink, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { BASE_URL_WR } from "@/src/util/api"

interface SitemapResponse {
  sitemap_url: string
  total_urls: number
  urls: string[]
}

export default function SitemapExtractor() {
  const [sitemapUrl, setSitemapUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SitemapResponse | null>(null)
  const [error, setError] = useState("")
  const [showResults, setShowResults] = useState(true)

  const extractSitemap = async () => {
    if (!sitemapUrl.trim()) {
      toast.error("Please enter a sitemap URL")
      return
    }

    // Basic URL validation
    try {
      new URL(sitemapUrl)
    } catch {
      toast.error("Please enter a valid URL")
      return
    }

    setLoading(true)
    setError("")
    setResults(null)

    try {
      const response = await fetch(`${BASE_URL_WR}extract-sitemap/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: sitemapUrl.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: SitemapResponse = await response.json()
      setResults(data)
      setShowResults(true)
      toast.success(`Successfully extracted ${data.total_urls} URLs`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to extract sitemap"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!results) return

    const urlList = results.urls.join("\n")
    navigator.clipboard.writeText(urlList)
    toast.success("URLs copied to clipboard")
  }

  const downloadUrls = () => {
    if (!results) return

    const urlList = results.urls.join("\n")
    const blob = new Blob([urlList], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sitemap-urls-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("URLs downloaded successfully")
  }

  const exportAsCSV = () => {
    if (!results) return

    const csvContent = ["URL,Index", ...results.urls.map((url, index) => `"${url}",${index + 1}`)].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sitemap-urls-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("CSV exported successfully")
  }

  const clearResults = () => {
    setResults(null)
    setError("")
    setSitemapUrl("")
  }

  return (
    <div className="">
      <div className="flex justify-center">
        <div className="min-h-screen w-full p-4">
          <h1 className="text-2xl md:text-2xl font-bold mb-8 md:text-start text-center text-blue">
            XML Sitemap URL Extractor
          </h1>

          <div className="flex xl:flex-row flex-col gap-8">
            {/* Input Section */}
            <motion.div
              className="bg-white p-6 rounded shadow-md flex-[5]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <label className="block text-lg font-semibold mb-4 text-pink">Enter Sitemap URL</label>

              <div className="mb-6">
                <input
                  type="url"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                  className="w-full p-3 border border-gray-300 rounded mb-4 transition-colors focus:border-blue-500 focus:outline-none text-lg"
                  onKeyPress={(e) => e.key === "Enter" && extractSitemap()}
                />

                <motion.button
                  onClick={extractSitemap}
                  disabled={loading}
                  className="bg-brand-blue1 text-white px-5 py-2 rounded-md transition-colors hover:bg-brand-blue1/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {loading ? "Extracting..." : "Extract"}
                </motion.button>
              </div>

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-50 border border-red-200 rounded p-4 mb-6 flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Toggle */}
              {results && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowResults(!showResults)}
                    className="flex items-center justify-between w-full p-2 bg-gray-100 rounded transition-colors hover:bg-gray-200"
                  >
                    <span className="font-semibold">Extracted URLs ({results.total_urls})</span>
                    {showResults ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>
              )}

              {/* URL List */}
              <AnimatePresence>
                {results && showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 gap-2"
                  >
                    <div className="bg-gray-50 rounded p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-purple">{results.total_urls}</div>
                          <div className="text-sm text-gray-600">Total URLs</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-pink">{results.urls.length}</div>
                          <div className="text-sm text-gray-600">Extracted</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue">{new URL(results.sitemap_url).hostname}</div>
                          <div className="text-sm text-gray-600">Domain</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
                      <div className="space-y-2">
                        {results.urls.map((url, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.01 }}
                            className="flex items-center justify-between bg-white p-3 rounded border hover:shadow-sm transition-shadow"
                          >
                            <span className="text-sm text-gray-700 flex-1 mr-4 break-all">{url}</span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple hover:text-pink transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Results Panel */}
             {results && (
            <motion.div
              className="bg-white p-6 rounded shadow-md w-full xl:w-1/3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <label className="block text-lg font-semibold mb-4 text-pink">Export Options</label>

              {results ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 p-4 rounded">
                    <h3 className="font-semibold mb-2">Sitemap Summary</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>URL: {results.sitemap_url}</div>
                      <div>Total URLs: {results.total_urls}</div>
                      <div>Extracted: {results.urls.length}</div>
                    </div>
                  </div>

                  <div className="flex sm:flex-row flex-col justify-end gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={copyToClipboard}
                      className="bg-brand-blue1 text-white p-2 rounded transition-colors flex hover:bg-pink items-center justify-center"
                    >
                      <Copy className="inline-block mr-2 w-5 h-4" /> Copy
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={downloadUrls}
                      className="bg-brand-blue1 text-white p-2 rounded transition-colors flex hover:bg-pink items-center justify-center"
                    >
                      <Download className="inline-block mr-2 w-5 h-4" /> TXT
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={exportAsCSV}
                      className="bg-brand-blue1 text-white p-2 rounded transition-colors flex hover:bg-pink items-center justify-center"
                    >
                      <Download className="inline-block mr-2 w-5 h-4" /> CSV
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={clearResults}
                      className="bg-gray-500 text-white p-2 px-4 rounded transition-colors flex hover:bg-gray-600 items-center justify-center"
                    >
                      Clear
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 p-8 rounded text-center">
                  <div className="text-gray-500">
                    {loading ? "Extracting URLs from sitemap..." : "Enter a sitemap URL to extract URLs"}
                  </div>
                </div>
              )}
            </motion.div>)}
          </div>

          {/* Quick Answers Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded shadow-md p-6 mt-8"
          >
            <h2 className="text-2xl font-bold text-blue mb-6 flex items-center gap-2">
              {/* <span className="text-pink">⚡</span> */}
              Quick Answers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-pink mb-2">What is a sitemap?</h3>
                <p className="text-gray-600 text-sm">
                  A sitemap is an XML file that lists all the important pages on your website, helping search engines
                  discover and index your content more efficiently.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-pink mb-2">How to find a sitemap?</h3>
                <p className="text-gray-600 text-sm">
                  Most sitemaps are located at yoursite.com/sitemap.xml or yoursite.com/sitemap_index.xml. You can also
                  check the robots.txt file for sitemap references.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-pink mb-2">Why extract sitemap URLs?</h3>
                <p className="text-gray-600 text-sm">
                  Extracting URLs helps with SEO analysis, content auditing, competitive research, and understanding
                  website structure for optimization purposes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-pink mb-2">Is this tool free?</h3>
                <p className="text-gray-600 text-sm">
                  Yes! This sitemap extractor is completely free to use. Extract URLs from any XML sitemap without
                  limits or registration requirements.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
