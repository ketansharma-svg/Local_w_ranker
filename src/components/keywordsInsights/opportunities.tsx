"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  TrendingUp,
  Target,
  Eye,
  Plus,
  Download,
  Filter,
  Lightbulb,
  ArrowUpRight,
  Zap,
  AlertTriangle,
} from "lucide-react"

const opportunityData = [
  {
    id: 1,
    keyword: "seo audit checklist",
    volume: 3200,
    difficulty: 28,
    intent: "Informational",
    currentRank: 12,
    ctrScore: 75,
    trendScore: 85,
    opportunityScore: 89,
    recommendedAction: "Track",
    source: "Near Top 10",
    landingUrl: "/seo-audit",
  },
  {
    id: 2,
    keyword: "free backlink analysis",
    volume: 1800,
    difficulty: 35,
    intent: "Commercial",
    currentRank: null,
    ctrScore: 82,
    trendScore: 78,
    opportunityScore: 84,
    recommendedAction: "Track",
    source: "Competitor Win",
    landingUrl: null,
  },
  {
    id: 3,
    keyword: "keyword density checker",
    volume: 950,
    difficulty: 22,
    intent: "Informational",
    currentRank: 15,
    ctrScore: 68,
    trendScore: 92,
    opportunityScore: 81,
    recommendedAction: "Optimize",
    source: "Low Competition",
    landingUrl: "/keyword-tools",
  },
  {
    id: 4,
    keyword: "seo content optimization",
    volume: 2400,
    difficulty: 45,
    intent: "Commercial",
    currentRank: 8,
    ctrScore: 85,
    trendScore: 65,
    opportunityScore: 76,
    recommendedAction: "Track",
    source: "High Intent",
    landingUrl: "/content-optimization",
  },
  {
    id: 5,
    keyword: "website speed test tool",
    volume: 4100,
    difficulty: 52,
    intent: "Informational",
    currentRank: null,
    ctrScore: 72,
    trendScore: 88,
    opportunityScore: 73,
    recommendedAction: "Track",
    source: "Trending",
    landingUrl: null,
  },
]

const sourceIcons = {
  "Near Top 10": Target,
  "Competitor Win": TrendingUp,
  "Low Competition": Zap,
  "High Intent": Lightbulb,
  Trending: ArrowUpRight,
  Cannibalization: AlertTriangle,
}

const sourceColors = {
  "Near Top 10": "bg-primary text-primary-foreground",
  "Competitor Win": "bg-secondary text-secondary-foreground",
  "Low Competition": "bg-green-500 text-white",
  "High Intent": "bg-yellow-500 text-white",
  Trending: "bg-purple-500 text-white",
  Cannibalization: "bg-destructive text-destructive-foreground",
}

export function Opportunities() {
  const [selectedOpportunities, setSelectedOpportunities] = useState<number[]>([])
  const [opportunityType, setOpportunityType] = useState("all")
  const [intentFilter, setIntentFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOpportunities(filteredOpportunities.map((o) => o.id))
    } else {
      setSelectedOpportunities([])
    }
  }

  const handleSelectOpportunity = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedOpportunities([...selectedOpportunities, id])
    } else {
      setSelectedOpportunities(selectedOpportunities.filter((o) => o !== id))
    }
  }

  const filteredOpportunities = opportunityData.filter((opportunity) => {
    if (opportunityType !== "all" && opportunity.source !== opportunityType) return false
    if (intentFilter !== "all" && opportunity.intent !== intentFilter) return false
    if (scoreFilter !== "all") {
      if (scoreFilter === "high" && opportunity.opportunityScore < 75) return false
      if (scoreFilter === "medium" && (opportunity.opportunityScore < 50 || opportunity.opportunityScore >= 75))
        return false
      if (scoreFilter === "low" && opportunity.opportunityScore >= 50) return false
    }
    return true
  })

  const opportunityColor = (score: number) => {
    if (score >= 75) return "bg-primary text-primary-foreground"
    if (score >= 50) return "bg-yellow-500 text-white"
    return "bg-destructive text-destructive-foreground"
  }

  const difficultyColor = (difficulty: number) => {
    if (difficulty < 30) return "text-primary"
    if (difficulty < 60) return "text-yellow-600"
    return "text-destructive"
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={opportunityType} onValueChange={setOpportunityType}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Opportunity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Near Top 10">Near Top 10</SelectItem>
                <SelectItem value="Competitor Win">Competitor Win</SelectItem>
                <SelectItem value="Low Competition">Low Competition</SelectItem>
                <SelectItem value="High Intent">High Intent</SelectItem>
                <SelectItem value="Trending">Trending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={intentFilter} onValueChange={setIntentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intents</SelectItem>
                <SelectItem value="Informational">Informational</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Transactional">Transactional</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Opportunity Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="high">High (75+)</SelectItem>
                <SelectItem value="medium">Medium (50-74)</SelectItem>
                <SelectItem value="low">Low (0-49)</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOpportunities.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedOpportunities.length} opportunit{selectedOpportunities.length > 1 ? "ies" : "y"} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Track Selected
                </Button>
                <Button variant="outline" size="sm">
                  Assign Tasks
                </Button>
                <Button variant="outline" size="sm">
                  Add to Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Keyword Opportunities ({filteredOpportunities.length})
          </CardTitle>
          <CardDescription>AI-powered keyword suggestions based on your current performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">
                    <Checkbox
                      checked={selectedOpportunities.length === filteredOpportunities.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Keyword</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Volume</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Difficulty</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Intent</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Current Rank</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Opportunity Score</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Recommended Action</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opportunity) => {
                  const SourceIcon = sourceIcons[opportunity.source as keyof typeof sourceIcons]
                  return (
                    <tr key={opportunity.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <Checkbox
                          checked={selectedOpportunities.includes(opportunity.id)}
                          onCheckedChange={(checked) => handleSelectOpportunity(opportunity.id, checked as boolean)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-primary cursor-pointer hover:underline">
                          {opportunity.keyword}
                        </div>
                      </td>
                      <td className="py-3 px-4">{opportunity.volume.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${difficultyColor(opportunity.difficulty)}`}>
                          {opportunity.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{opportunity.intent}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {opportunity.currentRank ? (
                          <Badge variant="secondary">#{opportunity.currentRank}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Not ranked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={opportunityColor(opportunity.opportunityScore)}>
                          {opportunity.opportunityScore}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={`${sourceColors[opportunity.source as keyof typeof sourceColors]} flex items-center gap-1`}
                        >
                          <SourceIcon className="w-3 h-3" />
                          {opportunity.source}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{opportunity.recommendedAction}</Badge>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Opportunity Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>How Opportunity Scores Are Calculated</CardTitle>
          <CardDescription>Understanding the factors that contribute to keyword opportunity scoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Volume & Competition</h3>
              <p className="text-sm text-muted-foreground">
                High search volume with low competition difficulty scores higher
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold mb-2">Current Performance</h3>
              <p className="text-sm text-muted-foreground">
                Keywords already ranking 11-20 get bonus points for quick wins
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Lightbulb className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Intent & Trends</h3>
              <p className="text-sm text-muted-foreground">
                Commercial intent and positive trends increase opportunity value
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
