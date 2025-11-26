"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Upload,
  Eye,
  Plus,
  Download,
  Smartphone,
  Monitor,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Calendar,
  Globe,
  Target,
  Check,
} from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

const sampleResults = [
  {
    keyword: "seo audit tool",
    volume: 2900,
    rank: 8,
    url: "/seo-audit",
    difficulty: 42,
    serpFeatures: ["Featured Snippet", "PAA"],
    intent: "Informational",
    opportunityScore: 78,
    title: "Free SEO Audit Tool - Comprehensive Website Analysis",
    description:
      "Get a complete SEO audit of your website with our free tool. Analyze technical issues, content gaps, and optimization opportunities.",
    competitors: [
      { domain: "ahrefs.com", rank: 1, title: "Free SEO Audit Tool by Ahrefs" },
      { domain: "semrush.com", rank: 2, title: "SEO Audit Tool - SEMrush" },
      { domain: "moz.com", rank: 3, title: "Free SEO Audit Tool - Moz" },
    ],
    serpAnalysis: {
      totalResults: "About 45,600,000 results",
      topAds: 3,
      organicResults: 10,
      featuredSnippet: true,
      peopleAlsoAsk: 4,
      relatedSearches: 8,
    },
  },
  {
    keyword: "best backlink checker",
    volume: 1200,
    rank: 3,
    url: "/backlink-checker",
    difficulty: 35,
    serpFeatures: ["Top Ads", "Reviews"],
    intent: "Commercial",
    opportunityScore: 85,
    title: "Best Backlink Checker Tool - Free Link Analysis",
    description:
      "Discover your website's backlink profile with our comprehensive backlink checker. Analyze link quality, anchor text, and competitor links.",
    competitors: [
      { domain: "ahrefs.com", rank: 1, title: "Backlink Checker - Free Tool by Ahrefs" },
      { domain: "semrush.com", rank: 2, title: "Free Backlink Checker Tool - SEMrush" },
      { domain: "yoursite.com", rank: 3, title: "Best Backlink Checker Tool - Free Link Analysis" },
    ],
    serpAnalysis: {
      totalResults: "About 12,300,000 results",
      topAds: 4,
      organicResults: 10,
      featuredSnippet: false,
      peopleAlsoAsk: 3,
      relatedSearches: 6,
    },
  },
  {
    keyword: "free keyword planner",
    volume: 5400,
    rank: 14,
    url: "/keyword-planner",
    difficulty: 58,
    serpFeatures: ["Featured Snippet", "Top Ads", "PAA"],
    intent: "Informational",
    opportunityScore: 65,
    title: "Free Keyword Planner Tool - Find SEO Keywords",
    description:
      "Research keywords for SEO and PPC campaigns with our free keyword planner. Get search volume, competition data, and keyword suggestions.",
    competitors: [
      { domain: "ads.google.com", rank: 1, title: "Keyword Planner - Google Ads" },
      { domain: "ubersuggest.com", rank: 2, title: "Free Keyword Tool - Ubersuggest" },
      { domain: "wordstream.com", rank: 3, title: "Free Keyword Tool - WordStream" },
    ],
    serpAnalysis: {
      totalResults: "About 78,900,000 results",
      topAds: 5,
      organicResults: 10,
      featuredSnippet: true,
      peopleAlsoAsk: 5,
      relatedSearches: 10,
    },
  },
]

export default function RankChecker() {
  const [inputMethod, setInputMethod] = useState<"manual" | "csv">("manual")
  const [keywords, setKeywords] = useState("")
  const [device, setDevice] = useState("desktop")
  const [location, setLocation] = useState("US")
  const [results, setResults] = useState<typeof sampleResults>([])
  const [isChecking, setIsChecking] = useState(false)
  const [expandedResult, setExpandedResult] = useState<number | null>(null)
  const [selectedKeywordForPanel, setSelectedKeywordForPanel] = useState<(typeof sampleResults)[0] | any>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isAddToTrackingOpen, setIsAddToTrackingOpen] = useState(false)
  const [isAddKeywordOpen, setIsAddKeywordOpen] = useState(false)
  const [selectedKeywordsForTracking, setSelectedKeywordsForTracking] = useState<(typeof sampleResults|any)[]>([])
  const [newKeywordText, setNewKeywordText] = useState("")
  const [selectedFolder, setSelectedFolder] = useState("main")
  const [isAddingToTracking, setIsAddingToTracking] = useState(false)
  const [trackingSuccess, setTrackingSuccess] = useState(false)

  const handleCheck = async () => {
    setIsChecking(true)
    // Simulate API call
    setTimeout(() => {
      setResults(sampleResults)
      setIsChecking(false)
    }, 2000)
  }

  const handleAddToTracking = async () => {
    setIsAddingToTracking(true)

    // Simulate API call to add keywords to tracking
    setTimeout(() => {

      setIsAddingToTracking(false)
      setTrackingSuccess(true)

      // Show success state briefly then close modal
      setTimeout(() => {
        setIsAddToTrackingOpen(false)
        setSelectedKeywordsForTracking([])
        setTrackingSuccess(false)
      }, 1500)
    }, 1500)
  }

  const handleDirectAddToTracking = async () => {
    setIsAddingToTracking(true)

    const keywordList = newKeywordText.split("\n").filter((k) => k.trim())

    // Simulate API call
    setTimeout(() => {


      setIsAddingToTracking(false)
      setTrackingSuccess(true)

      // Show success state briefly then close modal
      setTimeout(() => {
        setIsAddKeywordOpen(false)
        setNewKeywordText("")
        setTrackingSuccess(false)
      }, 1500)
    }, 1500)
  }

  const difficultyColor = (difficulty: number) => {
    if (difficulty < 30) return "text-primary"
    if (difficulty < 60) return "text-yellow-600"
    return "text-destructive"
  }

  const opportunityColor = (score: number) => {
    if (score >= 75) return "bg-primary text-primary-foreground"
    if (score >= 50) return "bg-yellow-500 text-white"
    return "bg-destructive text-destructive-foreground"
  }

  const openDetailedPanel = (result: (typeof sampleResults)[0]) => {
    setSelectedKeywordForPanel(result)
    setIsPanelOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rank Checker</h2>
          <p className="text-muted-foreground">Check keyword rankings manually or upload a CSV file</p>
        </div>
        <Button onClick={() => setIsAddKeywordOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Keywords
        </Button>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Rank Checker</CardTitle>
          <CardDescription>Check keyword rankings manually or upload a CSV file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Method Selector */}
          <div className="flex gap-4">
            <Button
              variant={inputMethod === "manual" ? "default" : "outline"}
              onClick={() => setInputMethod("manual")}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Manual Entry
            </Button>
            <Button
              variant={inputMethod === "csv" ? "default" : "outline"}
              onClick={() => setInputMethod("csv")}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </Button>
          </div>

          {/* Input Area */}
          {inputMethod === "manual" ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Keywords (one per line)</label>
                <Textarea
                  placeholder="seo audit tool&#10;best backlink checker&#10;free keyword planner"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <Button variant="outline">Choose File</Button>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Device</label>
              <Select value={device} onValueChange={setDevice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desktop">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Desktop
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Mobile
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="IN">🇮🇳 India</SelectItem>
                  <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Language</label>
              <Select defaultValue="en">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Check Button */}
          <Button
            onClick={handleCheck}
            disabled={isChecking || (!keywords.trim() && inputMethod === "manual")}
            className="w-full"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Checking Rankings...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Check Rankings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-6">
          {/* Results Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Keywords Checked</p>
                    <p className="text-2xl font-bold">{results.length}</p>
                  </div>
                  <Search className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Rank</p>
                    <p className="text-2xl font-bold">
                      {Math.round(results.reduce((acc, r) => acc + r.rank, 0) / results.length)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Top 10 Rankings</p>
                    <p className="text-2xl font-bold">{results.filter((r) => r.rank <= 10).length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Opportunity</p>
                    <p className="text-2xl font-bold">
                      {Math.round(results.reduce((acc, r) => acc + r.opportunityScore, 0) / results.length)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Ranking Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detailed Ranking Results</CardTitle>
                  <CardDescription>
                    Click on any row to view detailed SERP analysis or open the analysis panel
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </Button>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    <span
                      onClick={() => {
                        setSelectedKeywordsForTracking(results)
                        setIsAddToTrackingOpen(true)
                      }}
                    >
                      Add All to Tracking
                    </span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg">
                    {/* Enhanced Result Row with Click to Expand */}
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedResult(expandedResult === index ? null : index)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center">
                        <div className="md:col-span-2">
                          <div className="font-medium text-primary">{result.keyword}</div>
                          <div className="text-sm text-muted-foreground">Vol: {result.volume.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <Badge variant={result.rank <= 3 ? "default" : result.rank <= 10 ? "secondary" : "outline"}>
                            #{result.rank}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <span className={`font-medium ${difficultyColor(result.difficulty)}`}>
                            {result.difficulty}
                          </span>
                        </div>
                        <div>
                          <Badge variant="outline">{result.intent}</Badge>
                        </div>
                        <div>
                          <Badge className={opportunityColor(result.opportunityScore)}>{result.opportunityScore}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {result.serpFeatures.slice(0, 2).map((feature, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {result.serpFeatures.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{result.serpFeatures.length - 2}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedKeywordsForTracking([result])
                              setIsAddToTrackingOpen(true)
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetailedPanel(result)
                            }}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Detailed SERP Analysis Section */}
                    {expandedResult === index && (
                      <div className="border-t bg-muted/20 p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Your Result Details */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg">Your Result</h4>
                            <div className="bg-background border rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <Badge variant="secondary" className="mt-1">
                                  #{result.rank}
                                </Badge>
                                <div className="flex-1">
                                  <h5 className="font-medium text-primary hover:underline cursor-pointer">
                                    {result.title}
                                  </h5>
                                  <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-sm text-green-600">{result.url}</span>
                                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* SERP Analysis */}
                            <div>
                              <h5 className="font-medium mb-3">SERP Analysis</h5>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Total Results:</span>
                                  <span className="ml-2 font-medium">{result.serpAnalysis.totalResults}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Top Ads:</span>
                                  <span className="ml-2 font-medium">{result.serpAnalysis.topAds}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Featured Snippet:</span>
                                  <span className="ml-2 font-medium">
                                    {result.serpAnalysis.featuredSnippet ? "Yes" : "No"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">PAA Questions:</span>
                                  <span className="ml-2 font-medium">{result.serpAnalysis.peopleAlsoAsk}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Top Competitors */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg">Top Competitors</h4>
                            <div className="space-y-3">
                              {result.competitors.map((competitor, idx) => (
                                <div key={idx} className="bg-background border rounded-lg p-3">
                                  <div className="flex items-start gap-3">
                                    <Badge
                                      variant={
                                        competitor.rank === 1
                                          ? "default"
                                          : competitor.rank <= 3
                                            ? "secondary"
                                            : "outline"
                                      }
                                      className="mt-1"
                                    >
                                      #{competitor.rank}
                                    </Badge>
                                    <div className="flex-1">
                                      <h6 className="font-medium text-primary hover:underline cursor-pointer">
                                        {competitor.title}
                                      </h6>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-muted-foreground">{competitor.domain}</span>
                                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        <Button variant="outline" size="sm">
                                          <Eye className="w-3 h-3 mr-1" />
                                          Analyze
                                        </Button>
                                        <Button variant="outline" size="sm">
                                          <Globe className="w-3 h-3 mr-1" />
                                          Visit
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 pt-2">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                View Full SERP
                              </Button>
                              <Button variant="outline" size="sm">
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Track Changes
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comprehensive Rank Checker Analysis Panel */}
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedKeywordForPanel && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Detailed Analysis: {selectedKeywordForPanel.keyword}
                </SheetTitle>
                <SheetDescription>Comprehensive SERP analysis and ranking insights</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Key Metrics Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Rank</p>
                          <p className="text-2xl font-bold">#{selectedKeywordForPanel.rank}</p>
                        </div>
                        <Target className="w-8 h-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Search Volume</p>
                          <p className="text-2xl font-bold">{selectedKeywordForPanel.volume.toLocaleString()}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Analysis Tabs */}
                <Tabs defaultValue="serp" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="serp">SERP Analysis</TabsTrigger>
                    <TabsTrigger value="competitors">Competitors</TabsTrigger>
                    <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="serp" className="space-y-4">
                    {/* Your Current Result */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Your Current Result</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted/50 border rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-1">
                              #{selectedKeywordForPanel.rank}
                            </Badge>
                            <div className="flex-1">
                              <h5 className="font-medium text-primary hover:underline cursor-pointer">
                                {selectedKeywordForPanel.title}
                              </h5>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedKeywordForPanel.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm text-green-600">{selectedKeywordForPanel.url}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* SERP Features Analysis */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">SERP Features</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Featured Snippet</span>
                              <Badge
                                variant={selectedKeywordForPanel.serpAnalysis.featuredSnippet ? "default" : "outline"}
                              >
                                {selectedKeywordForPanel.serpAnalysis.featuredSnippet ? "Present" : "None"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">People Also Ask</span>
                              <Badge variant="secondary">
                                {selectedKeywordForPanel.serpAnalysis.peopleAlsoAsk} questions
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Top Ads</span>
                              <Badge variant="outline">{selectedKeywordForPanel.serpAnalysis.topAds} ads</Badge>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Total Results</span>
                              <span className="text-sm font-medium">
                                {selectedKeywordForPanel.serpAnalysis.totalResults}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Related Searches</span>
                              <Badge variant="secondary">{selectedKeywordForPanel.serpAnalysis.relatedSearches}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Organic Results</span>
                              <Badge variant="outline">{selectedKeywordForPanel.serpAnalysis.organicResults}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="competitors" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Ranking Competitors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedKeywordForPanel.competitors.map((competitor:any, idx:any) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <Badge
                                  variant={
                                    competitor.rank === 1 ? "default" : competitor.rank <= 3 ? "secondary" : "outline"
                                  }
                                  className="mt-1"
                                >
                                  #{competitor.rank}
                                </Badge>
                                <div className="flex-1">
                                  <h6 className="font-medium text-primary hover:underline cursor-pointer">
                                    {competitor.title}
                                  </h6>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-muted-foreground">{competitor.domain}</span>
                                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <Button variant="outline" size="sm">
                                      <Eye className="w-3 h-3 mr-1" />
                                      Analyze
                                    </Button>
                                    <Button variant="outline" size="sm">
                                      <Globe className="w-3 h-3 mr-1" />
                                      Visit
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="opportunities" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Optimization Opportunities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium">Opportunity Score</p>
                              <p className="text-sm text-muted-foreground">Based on competition and potential</p>
                            </div>
                            <div className="text-right">
                              <Badge className={opportunityColor(selectedKeywordForPanel.opportunityScore)}>
                                {selectedKeywordForPanel.opportunityScore}/100
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="font-medium text-sm">Featured Snippet Opportunity</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Current featured snippet is weak. Optimize for question-based content to capture
                                position 0.
                              </p>
                              <Progress value={75} className="mt-2" />
                            </div>

                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="font-medium text-sm">Content Gap Analysis</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Top competitors cover 3 additional subtopics. Consider expanding content depth.
                              </p>
                              <Progress value={60} className="mt-2" />
                            </div>

                            <div className="p-3 border rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="font-medium text-sm">Technical SEO</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Page speed and Core Web Vitals optimization could improve rankings.
                              </p>
                              <Progress value={45} className="mt-2" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Ranking History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Historical data will be available after tracking this keyword
                            </span>
                          </div>

                          <div className="p-4 bg-muted/50 rounded-lg text-center">
                            <p className="text-sm text-muted-foreground mb-3">
                              Start tracking this keyword to see ranking changes over time
                            </p>
                            <Button size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              <span
                                onClick={() => {
                                  setSelectedKeywordsForTracking([selectedKeywordForPanel])
                                  setIsAddToTrackingOpen(true)
                                }}
                              >
                                Add to Tracking
                              </span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    <span
                      onClick={() => {
                        setSelectedKeywordsForTracking([selectedKeywordForPanel])
                        setIsAddToTrackingOpen(true)
                      }}
                    >
                      Add to Tracking
                    </span>
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={isAddToTrackingOpen} onOpenChange={setIsAddToTrackingOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Keywords to Tracking
            </SheetTitle>
            <SheetDescription>
              Add {selectedKeywordsForTracking.length} keyword{selectedKeywordsForTracking.length !== 1 ? "s" : ""} to
              your tracking list
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Keywords Preview */}
            <div>
              <label className="text-sm font-medium mb-3 block">Keywords to Track</label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-muted/20">
                <div className="space-y-2">
                  {selectedKeywordsForTracking.map((keyword:any, idx:any) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{keyword.keyword}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{keyword.rank}</Badge>
                        <Badge variant="secondary">{keyword.volume.toLocaleString()}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Folder Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Folder</label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">📁 Main Keywords</SelectItem>
                  <SelectItem value="brand">🏷️ Brand Keywords</SelectItem>
                  <SelectItem value="competitors">🎯 Competitor Keywords</SelectItem>
                  <SelectItem value="long-tail">📝 Long-tail Keywords</SelectItem>
                  <SelectItem value="new">➕ Create New Folder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tracking Settings */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tracking Frequency</label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">📅 Daily</SelectItem>
                    <SelectItem value="weekly">📊 Weekly</SelectItem>
                    <SelectItem value="monthly">📈 Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Device</label>
                  <Select value={device} onValueChange={setDevice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          Desktop
                        </div>
                      </SelectItem>
                      <SelectItem value="mobile">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          Mobile
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">🇺🇸 United States</SelectItem>
                      <SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                      <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsAddToTrackingOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddToTracking} disabled={isAddingToTracking}>
                {isAddingToTracking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding to Tracking...
                  </>
                ) : trackingSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Added Successfully!
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Tracking
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isAddKeywordOpen} onOpenChange={setIsAddKeywordOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Keywords
            </SheetTitle>
            <SheetDescription>Add keywords to check rankings or directly to tracking</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Keyword Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Keywords (one per line)</label>
              <Textarea
                placeholder="seo audit tool&#10;best backlink checker&#10;free keyword planner&#10;keyword research tool"
                value={newKeywordText}
                onChange={(e) => setNewKeywordText(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {newKeywordText.split("\n").filter((k) => k.trim()).length} keywords entered
              </p>
            </div>

            {/* Quick Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Device</label>
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Desktop
                      </div>
                    </SelectItem>
                    <SelectItem value="mobile">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        Mobile
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Location</label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">🇺🇸 United States</SelectItem>
                    <SelectItem value="IN">🇮🇳 India</SelectItem>
                    <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                    <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Options */}
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Check Rankings Only</p>
                    <p className="text-sm text-muted-foreground">Get one-time ranking data without tracking</p>
                  </div>
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Add to Tracking</p>
                    <p className="text-sm text-muted-foreground">Check rankings and start tracking changes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsAddKeywordOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                disabled={!newKeywordText.trim() || isAddingToTracking}
                onClick={() => {
                  const keywordList = newKeywordText
                    .split("\n")
                    .filter((k) => k.trim())
                    .join("\n")
                  setKeywords(keywordList)
                  setIsAddKeywordOpen(false)
                  setNewKeywordText("")
                  handleCheck()
                }}
              >
                <Search className="w-4 h-4 mr-2" />
                Check Rankings
              </Button>
              <Button
                className="flex-1"
                disabled={!newKeywordText.trim() || isAddingToTracking}
                onClick={handleDirectAddToTracking}
              >
                {isAddingToTracking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : trackingSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Added!
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Tracking
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export { RankChecker }
