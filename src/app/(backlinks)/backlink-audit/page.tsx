"use client"
import React, { useMemo, useState } from "react"
import { BacklinkAuditHeader } from "./components/HeaderbacklinkAudit"
import AuditOverviewKpiCards from "./components/BACKLINKAUDITOVERVIEWTAB/KPICardsSummaryRow"
import AuditToxicityBreakdown from "./components/BACKLINKAUDITOVERVIEWTAB/ToxicityPieChartLinkRiskBreakdown"
import Section3LinkProfileRiskSummary from "./components/BACKLINKAUDITOVERVIEWTAB/LinkProfileRiskSummary"
import Section4AnchorRiskSnapshot from "./components/BACKLINKAUDITOVERVIEWTAB/AnchorSpamRiskSnapshot"
import DisavowActivityMonitor from "./components/BACKLINKAUDITOVERVIEWTAB/DisavowActivityMonitor"
import Section6WrImpactSplit from "./components/BACKLINKAUDITOVERVIEWTAB/WRScoreRiskContributionBreakdown"
import TopRiskyRefDomainsTable from "./components/BACKLINKAUDITOVERVIEWTAB/TopRiskyReferringDomainsTable"
import Section9SmartSuggestions from "./components/BACKLINKAUDITOVERVIEWTAB/SmartSuggestions"
import QuickActionsGridSection from "./components/BACKLINKAUDITOVERVIEWTAB/QuickActionsGrid"
import RefDomainsBacklinksTable from "./components/ReferringDomains&Backlinks/ReferringDomains&Backlinks"
import Tab3KpiSummary from "./components/New&LostLinks/KPICards"
import NewVsLostBacklinksTrend from "./components/New&LostLinks/NewvsLostTrendChart"
import WrScoreVolatility from "./components/New&LostLinks/WRScoreVolatilityChart"
import NewLostBacklinksSection from "./components/New&LostLinks/TopNew&LostBacklinksTable"
import NewLostSmartSuggestions from "./components/New&LostLinks/SmartSuggestions"
import Tab4Section1AnchorSmartSuggestions from "./components/AnchorRiskAudit/SmartSuggestions"
import { demoPageSnapshotData, OrganicPageDrawer_Overview_KPIs } from "./components/AnchorRiskAudit/KPISummary"
import AnchorTypeDistributionClassicPie from "./components/AnchorRiskAudit/AnchorTypeDistributionChart"
import AnchorRiskLevelBreakdown from "./components/AnchorRiskAudit/AnchorRiskLevelBreakdown"
import OverusedSpamAnchorsTable from "./components/AnchorRiskAudit/OverusedSpamAnchorsTable"
import TopTargetPagesByRiskyAnchorsTable from "./components/AnchorRiskAudit/TopTargetPagesbyRiskyAnchorUsageTable"
import Tab5Section0DisavowSmartSuggestions from "./components/DisavowManager/SmartSuggestions"
import { demoDisavowSummaryData, DisavowSummary_KPIs } from "./components/DisavowManager/DisavowSummaryKPI"
import DisavowQueueTable from "./components/DisavowManager/DisavowQueueTable"
import ActiveDisavowListTable from "./components/DisavowManager/ActiveDisavowList"
import DisavowDownloadPanel from "./components/DisavowManager/DownloadDisavowFile"
import DisavowHistoryLog from "./components/DisavowManager/DisavowHistoryLog"
import Tab6Section0TargetPagesSmartSuggestions from "./components/TargetPagesTab/SmartSuggestions"
import TargetPagesKpiCards from "./components/TargetPagesTab/TargetpagesSummary"
import LinkQualityDistribution from "./components/TargetPagesTab/LinkQualityDistribution"
import TopLinkedPagesTable from "./components/TargetPagesTab/TopLinkedPagesTable"
import Section8TopPagesAffectedTable from "./components/BACKLINKAUDITOVERVIEWTAB/Section8TopPagesAffectedTable";
const BacklinkAudit = () => {
    const [activeTab, setActiveTab] = useState<"overview" | "domains" | "new-lost" | "anchors" | "disavow" | "pages">("overview");
    const data = useMemo(() => demoPageSnapshotData(), []);
    const dataDisavow = useMemo(() => demoDisavowSummaryData(), []);


    return (
        <div className="p-4 space-y-4">
            <BacklinkAuditHeader
                projectName="w3era.com"
                lastAudit={new Date()}
                gscConnected={true}
                ga4Connected={false}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id)}
                onExport={() => alert("Export current tab")}
                onCreateTask={() => alert("Open Task Drawer")}
                onOpenDisavowSettings={() => alert("Open Disavow Settings")}
                onOpenIntegrations={() => alert("Open Integrations")}
                onOpenSettings={() => alert("Open Panel Settings")}
                onRerunAudit={() => alert("Rerun audit requested")}
                onGoDashboard={() => alert("Go: SEO Dashboard")}
                onGoBacklinks={() => alert("Go: Backlinks Overview")}
                onOpenFilters={() => alert("Open filters for current tab")}
            />

            {activeTab === "overview" && (
                <>
                    <AuditOverviewKpiCards />
                    <AuditToxicityBreakdown />
                    <Section3LinkProfileRiskSummary />
                    <Section4AnchorRiskSnapshot />
                    <DisavowActivityMonitor />
                    <Section6WrImpactSplit />
                    <TopRiskyRefDomainsTable />
                    <Section8TopPagesAffectedTable />
                    <Section9SmartSuggestions />
                    <QuickActionsGridSection />
                </>
            )}

            {activeTab === "domains" && (
                <RefDomainsBacklinksTable />
            )}

            {activeTab === "new-lost" && (
                <>
                    <Tab3KpiSummary />
                    <NewVsLostBacklinksTrend />
                    <WrScoreVolatility />
                    <NewLostBacklinksSection />
                    <NewLostSmartSuggestions
                        onNavigate={{
                            toLost: (p) => { document.getElementById('lost-table')?.scrollIntoView({ behavior: 'smooth' }); console.log('[Route] Lost', p); },
                            toNew: (p) => { document.getElementById('new-table')?.scrollIntoView({ behavior: 'smooth' }); console.log('[Route] New', p); },
                            toAnchorAudit: (p) => { document.getElementById('anchor-audit')?.scrollIntoView({ behavior: 'smooth' }); console.log('[Route] Anchor', p); },
                            toDisavow: (p) => { console.log('[Route] Disavow Manager', p); },
                            openTask: (p) => { console.log('[Drawer] Task', p); },
                        }}
                    />
                </>
            )}

            {activeTab === "anchors" && (
                <>
                    <Tab4Section1AnchorSmartSuggestions />
                    <OrganicPageDrawer_Overview_KPIs />
                    <AnchorTypeDistributionClassicPie />
                    <AnchorRiskLevelBreakdown />
                    <OverusedSpamAnchorsTable />
                    <TopTargetPagesByRiskyAnchorsTable />
                </>)}

            {activeTab === "disavow" && (
                <>
                    <Tab5Section0DisavowSmartSuggestions />
                    <DisavowSummary_KPIs/>
                    <DisavowQueueTable />
                    <ActiveDisavowListTable />
                    <DisavowDownloadPanel />
                    <DisavowHistoryLog />

                </>)}

            {activeTab === "pages" && (
                <>
                    <Tab6Section0TargetPagesSmartSuggestions />
                    <TargetPagesKpiCards />
                    <LinkQualityDistribution />
                    <TopLinkedPagesTable />
                </>)}
        </div>
    )
}

export default BacklinkAudit
