"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BASE_URL_WR } from "@/src/util/api"
import axios from "axios"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  Download,
  Edit,
  Eye,
  Filter,
  Loader2,
  Minus,
  Monitor,
  MoreHorizontal,
  Plus,
  Search,
  Smartphone,
  Trash2,
  TrendingDown,
  TrendingUp
} from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"

interface KeywordDetail {
  id: number
  project_keyword_id: number
  datetime: string
  user_id: number
  task_id: string
  domain: string | null
  rank: number
  serp_page: string
  google_page: string
  status: string
  date: string
  time: string
}

interface KeywordData {
  id: number
  created_at: string
  updated_at: string
  keyword: string
  project_id: number
  location_code: string
  location: string
  created_date: string
  created_time: string
  keyword_details: KeywordDetail[]
  device: string
  volume: number
  intent: string
  priority: string
}

interface ApiResponse {
  project_id: number
  language: string
  location: string
  keyword_data: KeywordData[]
}

const priorityColors = {
  high: "bg-destructive",
  medium: "bg-yellow-500",
  low: "bg-brand-blue1",
}

const intentColors = {
  informational: "bg-blue-500",
  commercial: "bg-green-500",
  transactional: "bg-purple-500",
  navigational: "bg-orange-500",
}

const cardVariants: any = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

export function TrackedKeywords({ selectedProject, onOpen, onClose  }: any) {
  const [keywordData, setKeywordData] = useState<KeywordData[]>([])
  
  const [loading, setLoading] = useState(false)
  const [selectedKeywords, setSelectedKeywords] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const calculateKeywordMetrics = (keywords: KeywordData[]) => {
    const totalKeywords = keywords.length
    let googleRanked = 0
    let top3 = 0
    let top6 = 0
    let top10 = 0
    let top50 = 0
    let improved = 0
    let declined = 0
    let unchanged = 0

    const rankDistribution = {
      "Top 3": 0,
      "Top 4-10": 0,
      "Top 11-20": 0,
      "Top 21-50": 0,
      "Top 51-100": 0,
      "Not Ranked": 0,
    }

    const trendData: { date: string; rank: number }[] = []

    keywords.forEach((keyword) => {
      const details = keyword.keyword_details
      if (details.length === 0) return

      // Sort by date to get latest and previous
      const sortedDetails = details.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
      const latestRank = sortedDetails[0]?.rank || 0
      const previousRank = sortedDetails[1]?.rank || latestRank

      if (latestRank > 0) {
        googleRanked++

        if (latestRank <= 3) {
          top3++
          rankDistribution["Top 3"]++
        }
        if (latestRank <= 6) top6++
        if (latestRank <= 10) {
          top10++
          if (latestRank > 3) rankDistribution["Top 4-10"]++
        }
        if (latestRank <= 50) {
          top50++
          if (latestRank > 10 && latestRank <= 20) rankDistribution["Top 11-20"]++
          else if (latestRank > 20) rankDistribution["Top 21-50"]++
        }
        if (latestRank > 50 && latestRank <= 100) rankDistribution["Top 51-100"]++
      } else {
        rankDistribution["Not Ranked"]++
      }

      // Calculate change
      if (previousRank > latestRank && latestRank > 0) improved++
      else if (previousRank < latestRank) declined++
      else unchanged++

      // Add to trend data
keywordData.forEach((keyword) => {
  if (keyword.keyword_details && keyword.keyword_details.length > 0) {
    const series:any = {
      name: keyword.keyword, // for line label
      data: keyword.keyword_details.map((detail) => ({
        date: detail.date,
        rank: detail.rank ?? 0, // handle null/undefined
      })),
    };
    trendData.push(series);
  }
});
    })

    return {
      totalKeywords,
      googleRanked,
      top3,
      top6,
      top10,
      top50,
      improved,
      declined,
      unchanged,
      rankDistribution,
      trendData: trendData.slice(0, 10), // Limit for chart
    }
  }

  const fetchKeywords = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${BASE_URL_WR}tracked-keywords/?project_id=${selectedProject.id}`,
        {
          method: "GET",
        },
      )
      const data: ApiResponse = await res.json()
      setKeywordData(data.keyword_data || [])
    } catch (err) {
      console.error("Failed fetching keywords:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedProject) return
    fetchKeywords()
  }, [selectedProject])

  const metrics = calculateKeywordMetrics(keywordData)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeywords(keywordData.map((k) => k.id))
    } else {
      setSelectedKeywords([])
    }
  }

  const handleSelectKeyword = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedKeywords([...selectedKeywords, id])
    } else {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== id))
    }
  }

  const filteredKeywords = keywordData.filter((keyword) =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase()),
  )


  const handleBulkAction = async (action: string) => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (action === "delete") {
      setSelectedKeywords([])
    }

    setIsProcessing(false)
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="transition-all duration-200 hover:shadow-md min-h-32">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-blue1">Total Keywords</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{metrics.totalKeywords}</p>
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="transition-all duration-200 hover:shadow-md min-h-32">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-blue1">Google Ranked Keywords</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {metrics.googleRanked} / {metrics.totalKeywords}
                    </p>
                    <BarChart3 className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">In Google Rank</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="transition-all duration-200 hover:shadow-md min-h-32">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-blue1">Top 3 Keywords</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {metrics.top3} / {metrics.totalKeywords}
                    </p>
                    <BarChart3 className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">In Top 3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="transition-all duration-200 hover:shadow-md min-h-32">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-blue1">Top 6 Keywords</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {metrics.top6} / {metrics.totalKeywords}
                    </p>
                    <BarChart3 className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">In Top 6</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="transition-all duration-200 hover:shadow-md min-h-32">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-blue1">Top 10 Keywords</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {metrics.top10} / {metrics.totalKeywords}
                    </p>
                    <BarChart3 className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">In Top 10</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="transition-all duration-200 hover:shadow-md min-h-32">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-blue1">Top 50 Keywords</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {metrics.top50} / {metrics.totalKeywords}
                    </p>
                    <BarChart3 className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">In Top 50</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="transition-all duration-200 hover:shadow-md min-h-32">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-blue1">📈 Top Movers</p>
                  <p className="text-sm font-medium text-green-600">Most Improved</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <p className="text-lg font-bold text-green-600">{metrics.improved}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.improved > 0
                      ? `${metrics.improved} improved keywords found`
                      : "No improved keywords found"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover="hover">
          <Card className="transition-all duration-200 hover:shadow-md min-h-32">
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Most Declined</p>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <p className="text-lg font-bold text-red-600">{metrics.declined}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.declined > 0
                      ? `${metrics.declined} declined keywords found`
                      : "No declined keywords found"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>


      {/* Search and Filters */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardContent className="">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search keywords, tags, or URLs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 transition-all duration-200 hover:scale-105"
                >
                  <Filter className="w-4 h-4" />
                  Smart Filters
                </Button>
                <Select>
                  <SelectTrigger className="w-[120px]">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rank">By Rank</SelectItem>
                    <SelectItem value="volume">By Volume</SelectItem>
                    <SelectItem value="change">By Change</SelectItem>
                  </SelectContent>
                </Select>

                    <Button 
                    onClick={onOpen}
                    className="flex items-center gap-2 transition-all duration-200  bg-brand-blue1 hover:bg-brand-blue1/80">
                      <Plus className="w-4 h-4" />
                      Add Keywords
                    </Button>

              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 p-4 border rounded-lg bg-muted/50"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Intent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="informational">Informational</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seo-tools">SEO Tools</SelectItem>
                        <SelectItem value="backlinks">Backlinks</SelectItem>
                        <SelectItem value="keyword-tools">Keyword Tools</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Device" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Movement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gained">Gained</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="stable">Stable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Actions */}
      {selectedKeywords.length > 0 && (
        <Card className="border-primary">
          <CardContent className="">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedKeywords.length} keyword{selectedKeywords.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction("folder")} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add to Folder
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction("tags")} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit className="w-4 h-4 mr-2" />}
                  Bulk Edit Tags
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction("export")} disabled={isProcessing}>
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction("delete")}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <motion.div variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <CardTitle>Tracked Keywords ({filteredKeywords.length})</CardTitle>
            <CardDescription>Manage and monitor your keyword rankings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">
                      <Checkbox
                        checked={selectedKeywords.length > 0 && selectedKeywords.length === filteredKeywords.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Keyword</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Volume</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Device</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Current Rank</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Previous Rank</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Change</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ranked Page</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">SERP Results</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Intent</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((keyword, index) => {
                    const details = keyword.keyword_details.sort(
                      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
                    )
                    const currentRank = details[0]?.rank || 0
                    const previousRank = details[1]?.rank || currentRank
                    const change = previousRank - currentRank

                    return (
                      <motion.tr
                        key={keyword.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b hover:bg-muted/50 transition-colors duration-200"
                      >
                        <td className="py-3 px-2">
                          <Checkbox
                            checked={selectedKeywords.includes(keyword.id)}
                            onCheckedChange={(checked) => handleSelectKeyword(keyword.id, Boolean(checked))}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-brand-blue1 cursor-pointer hover:underline transition-all duration-200">
                            {keyword.keyword}
                          </div>
                        </td>
                        <td className="py-3 px-4">{keyword.volume.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          {keyword.device === "desktop" ? (
                            <Monitor className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="bg-brand-blue/10">{keyword.location}</Badge>
                        </td>
                        <td className="py-3 px-4">{currentRank || "N/A"}</td>
                        <td className="py-3 px-4">{previousRank || "N/A"}</td>
                        <td className="py-3 px-4">
                          <motion.div
                            className={`flex items-center font-semibold gap-1 ${change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-muted-foreground"
                              }`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            {change > 0 ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : change < 0 ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : (
                              <Minus className="w-4 h-4" />
                            )}
                            {Math.abs(change) || 0}
                          </motion.div>
                        </td>
                        <td className="py-3 px-4">
                          {details[0]?.serp_page ? (
                            <a
                              href={details[0].serp_page}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {details[0]?.google_page ? (
                            <a
                              href={details[0].google_page}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>


                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-white ${intentColors[keyword.intent as keyof typeof intentColors] || "bg-gray-500"}`}
                          >
                            {keyword.intent}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`w-3 h-3 rounded-full ${priorityColors[keyword.priority as keyof typeof priorityColors] || "bg-gray-500"}`}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
