"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import {
  ArrowUpRight,
  Download,
  Eye,
  Filter,
  Monitor,
  Plus,
  Search,
  Settings,
  Smartphone,
  TrendingUp
} from "lucide-react"
import { useState } from "react"
import { ProjectSelector } from "../common/project-selector"
import { InsightsOverview } from "./insights-overview"
import { KeywordGapAnalyzer } from "./keyword-gap-analyzer"
import KeywordAddModal from "./keywordAddModal"
import { Opportunities } from "./opportunities"
import RankChecker from "./rank-checker"
import { TrackedKeywords } from "./tracked-keywords"

export function KeywordsInsightsPanel() {
  const [activeTab, setActiveTab] = useState("insights")
  const { selectedProject } = useProjectManager()
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-5 bg-card border-b border-border wr-shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section: Context & Filtering */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">

                  <ProjectSelector className="w-64" />

                </div>

                <Select defaultValue="all-folders">
                  <SelectTrigger className="w-[140px] focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-folders">All Folders</SelectItem>
                    <SelectItem value="seo-tools">SEO Tools</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="mobile-in">
                  <SelectTrigger className="w-[140px] focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile-in">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        <span>Mobile - IN</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="desktop-us">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span>Desktop - US</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Center Section: Quick Stats */}
              <div className="hidden lg:flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-success-light text-success border-success/20">
                    Top 10: 41%
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary via-secondary to-teal"
                      style={{ width: "65%" }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">Distribution</span>
                </div>
              </div>

              {/* Right Section: Actions */}
              <div className="flex items-center gap-3">
                <Button className="bg-brand-blue1 hover:bg-brand-blue1/80 text-white wr-shadow-sm"
                  onClick={() => {

                    setShowAddModal(true)
                  }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Keywords
                </Button>
                <Select>
                  <SelectTrigger className="w-[100px] focus:ring-primary">
                    <Download className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Export" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">Export CSV</SelectItem>
                    <SelectItem value="xlsx">Export XLSX</SelectItem>
                    <SelectItem value="pdf">Export PDF</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="hover:bg-muted focus:ring-primary bg-transparent">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-3">Keywords Insights Panel</h1>
            <p className="text-lg text-muted-foreground">
              Track, analyze, and optimize your keyword performance across multiple websites and pages.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-8 bg-muted p-1 rounded-lg">
              <TabsTrigger
                value="insights"
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-brand-blue1 data-[state=active]:shadow-sm hover:text-brand-blue1 cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" />
                Insights & Overview
              </TabsTrigger>
              <TabsTrigger
                value="tracked"
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-brand-blue1 data-[state=active]:shadow-sm hover:text-brand-blue1 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                Tracked Keywords
              </TabsTrigger>
              <TabsTrigger
                value="checker"
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-brand-blue1 data-[state=active]:shadow-sm hover:text-brand-blue1 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Rank Checker
              </TabsTrigger>
              <TabsTrigger
                value="gap"
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-brand-blue1 data-[state=active]:shadow-sm hover:text-brand-blue1 cursor-pointer"
              >
                <Filter className="w-4 h-4" />
                Keyword Gap
              </TabsTrigger>
              <TabsTrigger
                value="opportunities"
                className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-brand-blue1 data-[state=active]:shadow-sm hover:text-brand-blue1 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                Opportunities
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insights">
              <InsightsOverview />
            </TabsContent>

            <TabsContent value="tracked">
              <TrackedKeywords selectedProject={selectedProject} onOpen={() => setShowAddModal(true)} onClose={() => setShowAddModal(false)} />
            </TabsContent>

            <TabsContent value="checker">
              <RankChecker />
            </TabsContent>

            <TabsContent value="gap">
              <KeywordGapAnalyzer />
            </TabsContent>

            <TabsContent value="opportunities">
              <Opportunities />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <KeywordAddModal showAddModal={showAddModal} setShowAddModal={setShowAddModal} />
    </>
  )
}

