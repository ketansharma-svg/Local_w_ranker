"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Eye, Download, X } from "lucide-react"

const gapResults = [
  {
    keyword: "seo content strategy",
    volume: 1900,
    yourRank: null,
    competitorRanks: [
      { domain: "semrush.com", rank: 3 },
      { domain: "ahrefs.com", rank: 5 },
    ],
    bestUrl: "https://semrush.com/blog/seo-content-strategy",
    intent: "Informational",
    opportunityScore: 82,
    type: "missing",
  },
  {
    keyword: "backlink analysis tool",
    volume: 2400,
    yourRank: 12,
    competitorRanks: [
      { domain: "ahrefs.com", rank: 2 },
      { domain: "moz.com", rank: 4 },
    ],
    bestUrl: "https://ahrefs.com/backlink-checker",
    intent: "Commercial",
    opportunityScore: 75,
    type: "weak",
  },
  {
    keyword: "keyword research guide",
    volume: 3200,
    yourRank: 8,
    competitorRanks: [
      { domain: "semrush.com", rank: 1 },
      { domain: "ahrefs.com", rank: 3 },
    ],
    bestUrl: "https://semrush.com/blog/keyword-research",
    intent: "Informational",
    opportunityScore: 68,
    type: "weak",
  },
]

export function KeywordGapAnalyzer() {
  const [yourDomain, setYourDomain] = useState("wranker.com")
  const [competitors, setCompetitors] = useState(["semrush.com", "ahrefs.com"])
  const [newCompetitor, setNewCompetitor] = useState("")
  const [device, setDevice] = useState("desktop")
  const [location, setLocation] = useState("US")
  const [gapType, setGapType] = useState("missing")
  const [results, setResults] = useState<typeof gapResults>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const addCompetitor = () => {
    if (newCompetitor && competitors.length < 5) {
      setCompetitors([...competitors, newCompetitor])
      setNewCompetitor("")
    }
  }

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index))
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    // Simulate API call
    setTimeout(() => {
      setResults(gapResults.filter((result) => gapType === "all" || result.type === gapType))
      setIsAnalyzing(false)
    }, 2000)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "missing":
        return "bg-destructive text-destructive-foreground"
      case "weak":
        return "bg-yellow-500 text-white"
      default:
        return "bg-primary text-primary-foreground"
    }
  }

  const opportunityColor = (score: number) => {
    if (score >= 75) return "bg-primary text-primary-foreground"
    if (score >= 50) return "bg-yellow-500 text-white"
    return "bg-destructive text-destructive-foreground"
  }

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Keyword Gap Analysis</CardTitle>
          <CardDescription>Compare your keyword rankings with up to 5 competitors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Domain Configuration */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Domain</label>
              <Input value={yourDomain} onChange={(e) => setYourDomain(e.target.value)} placeholder="example.com" />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Competitor Domains</label>
              <div className="space-y-2">
                {competitors.map((competitor, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={competitor} readOnly />
                    <Button variant="outline" size="sm" onClick={() => removeCompetitor(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {competitors.length < 5 && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      placeholder="competitor.com"
                    />
                    <Button onClick={addCompetitor} disabled={!newCompetitor}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analysis Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Gap Type</label>
              <Select value={gapType} onValueChange={setGapType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missing">Missing Keywords</SelectItem>
                  <SelectItem value="weak">Weak Keywords</SelectItem>
                  <SelectItem value="all">All Keywords</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Device</label>
              <Select value={device} onValueChange={setDevice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
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
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Analyze Button */}
          <Button onClick={handleAnalyze} disabled={isAnalyzing || competitors.length === 0} className="w-full bg-brand-blue1">
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing Gaps...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Run Gap Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gap Analysis Results</CardTitle>
                <CardDescription>Found {results.length} keyword opportunities</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Tracking
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Keyword</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Volume</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Your Rank</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Best Competitor</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Gap Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Intent</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Opportunity</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-primary">{result.keyword}</span>
                      </td>
                      <td className="py-3 px-4">{result.volume.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {result.yourRank ? (
                          <Badge variant="secondary">#{result.yourRank}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Not ranked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{result.competitorRanks[0].domain}</span>
                          <Badge variant="outline">#{result.competitorRanks[0].rank}</Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getTypeColor(result.type)}>
                          {result.type === "missing" ? "Missing" : "Weak Position"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{result.intent}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={opportunityColor(result.opportunityScore)}>{result.opportunityScore}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
