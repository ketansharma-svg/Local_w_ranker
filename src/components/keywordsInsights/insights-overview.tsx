"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Eye, Target, ArrowUpRight, ArrowDownRight, ExternalLink, AlertTriangle, Clock } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const kpiData = [
  {
    title: "Visibility Score",
    value: "41%",
    description: "Keywords in Top 20",
    trend: "up",
    change: "+5%",
    icon: Eye,
    color: "text-primary",
  },
  {
    title: "Top 10 Keywords",
    value: "312",
    description: "Currently ranking 1-10",
    trend: "up",
    change: "+23",
    icon: Target,
    color: "text-gray-500",
  },
  {
    title: "Cannibalized Keywords",
    value: "18",
    description: "Multiple pages ranking",
    trend: "down",
    change: "-3",
    icon: AlertTriangle,
    color: "text-critical",
  },
  {
    title: "Total Tracked",
    value: "1,247",
    description: "Keywords being monitored",
    trend: "up",
    change: "+47",
    icon: TrendingUp,
    color: "text-teal",
  },
]

const rankingDistribution = [
  { name: "Top 3", value: 120, color: "#008CCD" },
  { name: "4-10", value: 240, color: "#4286F5" },
  { name: "11-20", value: 210, color: "#14B8A6" },
  { name: "21-100", value: 330, color: "#6366F1" },
  { name: "Not Ranked", value: 300, color: "#E94134" },
]

const gainsLossesData = [
  { date: "Jun 18", gains: 56, losses: 24 },
  { date: "Jun 19", gains: 42, losses: 31 },
  { date: "Jun 20", gains: 67, losses: 18 },
  { date: "Jun 21", gains: 38, losses: 45 },
  { date: "Jun 22", gains: 71, losses: 22 },
  { date: "Jun 23", gains: 49, losses: 33 },
  { date: "Jun 24", gains: 83, losses: 19 },
]

const topPages = [
  {
    url: "/seo-audit",
    keywordsTop10: 18,
    avgRank: 7.4,
    topKeyword: "seo audit tool",
    topRank: 2,
    traffic: 1100,
  },
  {
    url: "/backlink-checker",
    keywordsTop10: 12,
    avgRank: 8.2,
    topKeyword: "best backlink checker",
    topRank: 3,
    traffic: 890,
  },
  {
    url: "/keyword-planner",
    keywordsTop10: 15,
    avgRank: 6.8,
    topKeyword: "free keyword planner",
    topRank: 1,
    traffic: 1340,
  },
  {
    url: "/rank-tracker",
    keywordsTop10: 9,
    avgRank: 9.1,
    topKeyword: "rank tracker online",
    topRank: 5,
    traffic: 650,
  },
]

const cannibalizedKeywords = [
  {
    keyword: "seo audit tool",
    volume: 2900,
    pages: 3,
    primaryUrl: "/seo-audit",
    avgSpread: "5-22",
    intent: "Commercial",
  },
  {
    keyword: "backlink analysis",
    volume: 1800,
    pages: 2,
    primaryUrl: "/backlink-checker",
    avgSpread: "8-15",
    intent: "Informational",
  },
  {
    keyword: "keyword research tool",
    volume: 4400,
    pages: 4,
    primaryUrl: "/keyword-planner",
    avgSpread: "3-28",
    intent: "Commercial",
  },
]

const movementFeed = [
  {
    keyword: "seo audit tool",
    change: "+7",
    from: 15,
    to: 8,
    url: "/seo-audit",
    type: "gain",
    time: "2 hours ago",
  },
  {
    keyword: "best backlink checker",
    change: "+2",
    from: 5,
    to: 3,
    url: "/backlink-checker",
    type: "gain",
    time: "4 hours ago",
  },
  {
    keyword: "free keyword planner",
    change: "-2",
    from: 12,
    to: 14,
    url: "/keyword-planner",
    type: "loss",
    time: "6 hours ago",
  },
  {
    keyword: "rank tracker online",
    change: "-1",
    from: 4,
    to: 5,
    url: "/rank-tracker",
    type: "loss",
    time: "8 hours ago",
  },
]

export function InsightsOverview() {
  return (
    <div className="space-y-8">
      {/* Updated KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer wr-shadow-sm bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      kpi.trend === "up" ? "text-success" : "text-critical"
                    }`}
                  >
                    {kpi.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpi.change}
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Updated Ranking Distribution Chart */}
        <Card className="wr-shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Ranking Distribution</CardTitle>
            <CardDescription>How your keywords are distributed across ranking positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rankingDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: item.color,
                          width: `${(item.value / 1200) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Updated Gains & Losses Trend */}
        <Card className="wr-shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Gains & Losses (7 Days)</CardTitle>
            <CardDescription>Keyword ranking movements over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={gainsLossesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFF0F6" />
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Area type="monotone" dataKey="gains" stackId="1" stroke="#34A853" fill="#34A853" fillOpacity={0.6} />
                <Area type="monotone" dataKey="losses" stackId="2" stroke="#E94134" fill="#E94134" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Updated Top Performing Pages */}
      <Card className="wr-shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Top Performing Pages</CardTitle>
          <CardDescription>Pages with the most keywords in top rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">Page URL</th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground"># Keywords Top 10</th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">Avg. Rank</th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">Top Keyword</th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">Est. Traffic</th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((page, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary">{page.url}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary">{page.keywordsTop10}</Badge>
                    </td>
                    <td className="py-3 px-4">{page.avgRank}</td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium">{page.topKeyword}</span>
                        <Badge variant="outline" className="ml-2">
                          #{page.topRank}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">{page.traffic}</td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">
                        View All
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Updated Cannibalized Keywords */}
        <Card className="wr-shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <AlertTriangle className="w-5 h-5 text-critical" />
              Cannibalized Keywords
            </CardTitle>
            <CardDescription>Keywords ranking on multiple pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cannibalizedKeywords.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.keyword}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.volume} volume • {item.pages} pages • Rank spread: {item.avgSpread}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.intent}</Badge>
                    <Button variant="outline" size="sm">
                      Fix
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Updated Keyword Movement Feed */}
        <Card className="wr-shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <Clock className="w-5 h-5 text-gray-400" />
              Recent Movements
            </CardTitle>
            <CardDescription>Latest keyword ranking changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {movementFeed.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.keyword}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.url} • {item.time}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.type === "gain" ? "default" : "destructive"}
                      className={item.type === "gain" ? "bg-primary" : ""}
                    >
                      {item.type === "gain" ? (
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                      )}
                      #{item.from} → #{item.to}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
