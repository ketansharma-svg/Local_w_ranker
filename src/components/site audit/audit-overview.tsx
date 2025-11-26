
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import axios, { CancelTokenSource } from "axios";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug,
  CheckCircle,
  ChevronDown,
  CircleAlert,
  Database,
  Link2,
  Newspaper,
  NotepadText
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  FiBarChart2,
  FiDatabase,
  FiShield,
  FiTrendingUp
} from "react-icons/fi";
import Enhancement from "./enhancement";
import IssuesComp from "./issues-comp";
import LinksMap from "./linksMap";
import Security from "./security";
import Structured from "./structured";
// import Coverage from "./coverage";
import { extractTopIssues } from "@/src/util/helper";
import AffectedPage from "./affected-pages/affectedPage";
import AuditSum from "./audit-sum";
import Coverage from "./coverage/coverage";
import CrawlStats from "./crawl-stats/crawlStats";
import PageExp from "./page-exp/pageExp";
import { useAffectedDetails } from "@/src/redux/providers/AffectedDetailProvide";
import { TaskDrawerProvider } from "@/src/redux/providers/TaskDrawerProvider";

interface SiteDetailsResponse {
  domain: string;
  data: {
    id: number;
    domain: string;
    url: string;
    task_id: string;
    status: string;
    progress: number;
    history: string;
    result: {
      links: Array<{ url: string; title: { valid: boolean } }>;
      seo_score: number;
      domain_info: any;
      pagespeed_data: any;
      suggestions: {
        mobile: Array<{ importance: string;[key: string]: any }>;
        desktop: Array<{ importance: string;[key: string]: any }>;
      };
      total_pages_analyzed: number;
      analysis_completed_at: string;
    };
    error: any;
    created_at: string;
    updated_at: string;
  };
}

export const AuditOverviewComponent = ({ onIssueClick, id, sitedetails, selectedProject }: any) => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wr_audit_active_tab") || "audit-sum";
    }
    return "audit-sum";
  });

  const [cardsExpanded, setCardsExpanded] = useState(true); // Default to expanded
  const [showAuditCards, setShowAuditCards] = useState(true);
  const [loading, setLoading] = useState(false);
  const [siteIssues, setSiteIssues] = useState<any>(null);

  const [linksData, setLinksData] = useState<any>(null);
  const [lastCrawled, setLastCrawled] = useState<any>(null);
  const [siteIssuesData, setSiteIssueData] = useState<any>()
  const { affectedDetails, loading: affectedLoading, fetchDetails }: any = useAffectedDetails()
  const allPages = Object.values(
    affectedDetails?.pages_affected?.grouped_by_url ?? {}
  );

  useEffect(() => {
    if (!selectedProject?.id) return
    fetchDetails(selectedProject.id)
  }, [fetchDetails, selectedProject?.id])
  useEffect(() => {
    if (typeof window !== "undefined" && activeTab) {
      localStorage.setItem("wr_audit_active_tab", activeTab);
    }
  }, [activeTab]);

  const MotionIcon = motion(ChevronDown);
  const seoCancelRef = useRef<CancelTokenSource | null>(null)
  const linkCancelRef = useRef<CancelTokenSource | null>(null)

  useEffect(() => {
    if (id && id !== null && sitedetails?.status !== "pending") {
      fetchLinkMap(id)
      fetchSeoDetails(id)
    }
    return () => {
      seoCancelRef.current?.cancel("SEO issues request cancelled")
      linkCancelRef.current?.cancel("Link map request cancelled")
    }
  }, [id, sitedetails?.status])

  const fetchSeoDetails = async (projectId: number) => {
    try {
      seoCancelRef.current?.cancel("SEO issues request superseded")
      seoCancelRef.current = axios.CancelToken.source()
      setLoading(true);
      const response: any = await axios.get<SiteDetailsResponse>(`https://dashboard.wranker.com/api/seo-issues/${projectId}/`, {
        cancelToken: seoCancelRef.current.token,
      });
      setSiteIssues(response?.data?.history);
      setLastCrawled(response?.data?.history[0].date);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error("Error fetching site details:", error);
        setSiteIssues(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkMap = async (projectId: number) => {
    try {
      linkCancelRef.current?.cancel("Link map request superseded")
      linkCancelRef.current = axios.CancelToken.source()
      setLoading(true);
      const response: any = await axios.get(
        `https://dashboard.wranker.com/api/link-graph/${projectId}/`,
        {
          cancelToken: linkCancelRef.current.token,
        }
      );
      setLinksData(response?.data);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error("Error fetching site details:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const severityData =
    siteIssues &&
      siteIssues.length > 0 &&
      siteIssues[0]?.result?.issue_counts
      ? [
        {
          name: "Critical",
          value: siteIssues[0].result.issue_counts["🔴 Critical"] || 0,
          color: "#EA4335",
        },
        {
          name: "Warning",
          value: siteIssues[0].result.issue_counts["🟠 Warning"] || 0,
          color: "#F97316",
        },
        {
          name: "Low",
          value: siteIssues[0].result.issue_counts["🟡 Low"] || 0,
          color: "#FBBC05",
        },
        {
          name: "Info",
          value: siteIssues[0].result.issue_counts["🔵 Info"] || 0,
          color: "#0077FF",
        },
      ]
      : [];


  const totalIssues = severityData.reduce((acc, item) => acc + item.value, 0);

  const toggleCardsVisibility = () => {
    setShowAuditCards(!showAuditCards);
    if (!showAuditCards) {
      setCardsExpanded(true); // When showing, ensure cards are expanded
    }
  };

  const tabItems = [
    {
      label: "Summary",
      shortLabel: "Summary",
      key: "audit-sum",
      icon: FiBarChart2,
    },
    {
      label: "Issues",
      shortLabel: "Issues",
      key: "Issues",
      icon: CircleAlert,
      count: totalIssues,
    },
    {
      label: "Affected Page",
      shortLabel: "Affected Page",
      key: "Affected Page",
      icon: CircleAlert,
      count: affectedLoading
        ? "..."
        : `${allPages?.length || 0}`,
    },
    {
      label: "Coverage",
      shortLabel: "Coverage",
      key: "coverage",
      icon: Newspaper,
    },
    {
      label: "Enhancement",
      shortLabel: "Enhance",
      key: "Enhancement",
      icon: FiTrendingUp,
    },
    {
      label: "Page Expericence",
      shortLabel: "Page Exp.",
      key: "Core Web",
      icon: NotepadText,
    },
    {
      label: "Structured Data",
      shortLabel: "Structured",
      key: "Structured",
      icon: FiDatabase,
    },
    {
      label: "Internal Links",
      shortLabel: "Internal Links",
      key: "Internal",
      icon: Link2,
    },
    {
      label: "Crawl Stats",
      shortLabel: "Crawl Stats",
      key: "Crawl",
      icon: Bug,
    },
    {
      label: "Security Actions",
      shortLabel: "Security",
      key: "Security",
      icon: FiShield,
    },
  ];

  const auditCards = [
    {
      title: "Audit Summary",
      description: "Overview of site health metrics",
      status: "Completed",
      statusColor: "bg-green-500",
      statusIcon: CheckCircle,
      statusIconColor: "text-[#166534]",
      icon: BarChart3,
      action: "Go to Tab",
      tabKey: "audit-sum",
    },
    {
      title: "Issues",
      description: "Critical and warning issues found",
      status: `${totalIssues} Issues`,
      statusColor: "bg-red-500",
      statusIcon: AlertTriangle,
      statusIconColor: "text-[#991B1B]",
      icon: CircleAlert,
      action: "Go to Tab",
      clickable: true,
      issuesFound: true,
      tabKey: "Issues",
    },
    {
      title: "Affected Page",
      description: "Critical and warning issues found",
      status: affectedLoading
        ? "Loading..."
        : `${allPages?.length || 0} Issues`,
      statusColor: "bg-red-500",
      statusIcon: null,
      statusIconColor: "text-[#991B1B]",
      icon: CircleAlert,
      action: "Go to Tab",
      clickable: true,
      issuesFound: true,
      tabKey: "Affected Page",
    },
    {
      title: "Coverage",
      description: "Google search console coverage data",
      status: "Not Reviewed",
      statusColor: "bg-gray-500",
      statusIcon: null,
      statusIconColor: "text-gray-500",
      icon: Newspaper,
      action: "Go to Tab",
      tabKey: "coverage",
    },
    {
      title: "Enhancement",
      description: "LCP, FID, and CLS performance metrics",
      status: "Issues Found",
      statusColor: "bg-yellow-500",
      statusIcon: AlertTriangle,
      statusIconColor: "text-yellow-500",
      icon: FiTrendingUp,
      action: "Go to Tab",
      issuesFound: true,
      tabKey: "Enhancement",
    },
    {
      title: "Page Expericence",
      description: "LCP, FID, and CLS performance metrics",
      status: "Issues Found",
      statusColor: "bg-yellow-500",
      statusIcon: AlertTriangle,
      statusIconColor: "text-yellow-500",
      icon: NotepadText,
      action: "Go to Tab",
      issuesFound: true,
      tabKey: "Core Web",
    },
    {
      title: "Structured Data",
      description: "Schema markup and rich snippets",
      status: "Completed",
      statusColor: "bg-green-500",
      statusIcon: CheckCircle,
      statusIconColor: "text-[#166534]",
      icon: Database,
      action: "Go to Tab",
      tabKey: "Structured",
    },
    {
      title: "Internal Links",
      description: "LCP, FID, and CLS performance metrics",
      status: "Issues Found",
      statusColor: "bg-yellow-500",
      statusIcon: AlertTriangle,
      statusIconColor: "text-yellow-500",
      icon: Link2,
      action: "Go to Tab",
      issuesFound: true,
      tabKey: "Internal",
    },
    {
      title: "Crawl Stats",
      description: "Schema markup and rich snippets",
      status: "Completed",
      statusColor: "bg-green-500",
      statusIcon: CheckCircle,
      statusIconColor: "text-[#166534]",
      icon: Bug,
      action: "Go to Tab",
      tabKey: "Crawl",
    },
    {
      title: "Security Actions",
      description: "Schema markup and rich snippets",
      status: "Completed",
      statusColor: "bg-green-500",
      statusIcon: CheckCircle,
      statusIconColor: "text-[#166534]",
      icon: FiShield,
      action: "Go to Tab",
      tabKey: "Security",
    },
  ];

  const topIssues = extractTopIssues(siteIssues);
  const [fltIssueType, setFltIssueType] = useState("")

  const handleSelectIssueType = (active: any, issueType: any) => {
    if (issueType) {
      setActiveTab(active)
      setFltIssueType(issueType)
    } else {
      setActiveTab(active)
      setFltIssueType("")
    }
  }

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentData = topIssues.slice(indexOfFirst, indexOfLast);


  return (
    <div className="pb-4">
      {/* Audit Overview */}
      <div className="px-4 pt-4">
        {/* Title & Toggle */}
        <div className="flex items-center  mb-1">
          <h2 className="text-xl font-semibold text-gray-900">Tab Index Overview </h2>
          <Button
            variant="ghost"
            onClick={toggleCardsVisibility}
            className="flex items-center gap-1 transition-colors hover:text-blue-600"
          >
            <motion.div
              initial={false}
              animate={{ rotate: showAuditCards ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <MotionIcon className="size-5 mt-1" />
            </motion.div>
          </Button>
        </div>

        <p className="text-gray-600 mb-6">
          Quick access to all audit sections with status indicators
        </p>

        {/* Cards Grid with Animation */}
        <AnimatePresence initial={false}>
          {showAuditCards && (
            <motion.div
              key="audit-cards"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {auditCards.map((card, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.5,
                      delay: 0.1 * index,
                      ease: "easeOut",
                    }}>
                    <Card
                      className={cn(
                        "transition-shadow  smooth2  min-h-[8.5rem] 2xl:min-h-[9rem] h-full relative flex flex-col hover:border-brand-blue1",
                        cardsExpanded ? "hover:shadow-md" : "overflow-hidden"
                      )}
                    >
                      <CardHeader className="cursor-pointer">
                        <div className="flex w-full flex-wrap items-start gap-3 sm:flex-nowrap">
                          <card.icon className="h-5 w-5 text-gray-600 mt-1 shrink-0" />
                          <div className="flex-1 min-w-[9rem]">
                            <CardTitle className="text-md font-medium leading-tight">
                              {card.title}
                            </CardTitle>
                            {cardsExpanded && (
                              <motion.p
                                className="mt-1 text-xs leading-relaxed text-gray-500"
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                {card.description}
                              </motion.p>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {cardsExpanded && (
                        <CardContent className="mt-auto pt-2 sm:pt-3">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {card.statusIcon && (
                                <card.statusIcon
                                  className={`w-4 h-4 ${card.statusIconColor}`}
                                />
                              )}
                              <span
                                className={`text-sm font-medium ${card.statusIconColor}`}
                              >
                                {card.status}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 text-sm h-8 px-3 w-full justify-center sm:h-6 sm:px-2 sm:w-auto sm:ml-auto"
                                onClick={() => {
                                  setActiveTab(card.tabKey)
                                  const element = document.getElementById("tab-section");
                                  if (element) {
                                    element.scrollIntoView({ behavior: "smooth" });
                                  }
                                }}
                              >
                                {card.action}
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LayoutGroup id="audit-tabs">
        <div id="tab-section" className="w-full bg-white flex flex-col sm:flex-row">
          {/* Tabs Section */}
          <div className="flex overflow-x-auto sm:overflow-visible w-full">
            <div className="relative flex flex-nowrap sm:flex-wrap w-full">
              {tabItems.map((tab, index) => (
                <motion.button
                  key={index}
                  className={cn(
                    "relative flex items-center justify-center py-3 px-4 font-semibold shrink-0",
                    "transition-colors duration-200 ease-out min-w-[90px] sm:min-w-[110px]",
                    "group overflow-hidden border-b-2 border-transparent",
                    activeTab === tab.key ? "text-brand-blue1" : "text-gray-600"
                  )}
                  onClick={() => handleSelectIssueType(tab.key, '')}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-brand-blue1/5 via-brand-blue1/10 to-brand-blue1/5 transition-opacity duration-200" />
                  <div className="relative flex items-center gap-2">
                    <tab.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate hidden sm:inline">
                      {activeTab === tab.key ? tab.label : tab.shortLabel}
                    </span>
                    {tab.count !== undefined && tab.count !== null && (
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 transition-colors duration-200",
                          activeTab === tab.key
                            ? "bg-brand-blue1/10 text-brand-blue1 shadow-[0_0_0_1px_rgba(59,130,246,0.22)]"
                            : "bg-gray-200 text-gray-800"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </div>
                  {activeTab === tab.key && (
                    <motion.span
                      layoutId="tab-underline"
                      className="absolute left-2 right-2 bottom-0 h-[2px] bg-brand-blue1"
                      transition={{ type: "spring", stiffness: 170, damping: 24, mass: 0.42 }}
                      style={{ borderRadius: 999 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

        </div>
      </LayoutGroup>

      <TaskDrawerProvider>
        <div className="px-4 pt-4">
          {/* Open Audit Summary Tab (moved from Issues) */}
          {siteIssues && activeTab === "audit-sum" && (
            <AuditSum siteIssues={siteIssues} sitedetails={sitedetails} onIssueClick={onIssueClick} handleSelectIssueType={handleSelectIssueType} />
          )}

          {/* Issues Tab (new content from screenshot) */}
          {siteIssues && activeTab === "Issues" && (
            <IssuesComp siteIssues={siteIssues} onIssueTypeClick={(issueType) => handleSelectIssueType("Affected Page", issueType)} />
          )}

          {/* Coverage tab */}
          {activeTab === "coverage" && (
            <Coverage />
          )}

          {siteIssues && activeTab === "Affected Page" && (
            <AffectedPage siteIssues={siteIssues} sitedetails={sitedetails} selectedProject={selectedProject} fltIssueType={fltIssueType} />
          )}

          {/* Enhancement Tab */}
          {siteIssues && activeTab === "Enhancement" && (
            <Enhancement siteIssues={siteIssues} sitedetails={sitedetails} />
          )}

          {/* Page Experience Tab */}
          {siteIssues && activeTab === "Core Web" && (
            <PageExp siteIssuesData={sitedetails} selectedProject={selectedProject} sitedetails={sitedetails} />
          )}

          {/* Structured Tab */}
          {siteIssues && activeTab === "Structured" && (
            <Structured siteIssues={siteIssues} sitedetails={sitedetails} />
          )}

          {/* Internal Tab */}
          {linksData && activeTab === "Internal" && (
            <LinksMap siteIssues={siteIssues} linksData={linksData} selectedProject={selectedProject} />
          )}

          {/* Crawl Tab */}
          {siteIssues && activeTab === "Crawl" && (
            <CrawlStats siteIssues={siteIssues} sitedetails={sitedetails} linksData={linksData} />
          )}

          {/* Security Tab */}
          {siteIssues && activeTab === "Security" && (
            <Security siteIssues={siteIssues} sitedetails={sitedetails} selectedProject={selectedProject} />
          )}


        </div>
      </TaskDrawerProvider>

    </div>
  );
};
