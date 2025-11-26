"use client"

import Layout from "@/src/components/layout"
import { useProjectManager } from "@/src/hooks/use-project-manager";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import TabLoadingState from "@/src/components/link-analyzer/TabLoadingState";
import { TaskDrawerProvider } from "@/src/redux/providers/TaskDrawerProvider";

// Default exports
const LinkMap = dynamic(
  () => import("@/src/components/link-analyzer/link-map-tab"),
  { ssr: false, loading: () => <TabLoadingState /> }
);

const OverviewKpiSummary = dynamic(
  () => import("@/src/components/link-analyzer/OverviewGptTab"),
  { ssr: false, loading: () => <TabLoadingState /> }
);

const PagesTabAdvancedTable = dynamic(
  () => import("../../components/link-analyzer/PagesDrawer/pages-tab"),
  { ssr: false, loading: () => <TabLoadingState /> }
);

const BrokenLinksTab = dynamic(
  () => import("../../components/link-analyzer/broken-links-tab"),
  { ssr: false, loading: () => <TabLoadingState /> }
);

const ExternalLinksTab = dynamic(
  () =>
    import("../../components/link-analyzer/external-links-tab"),
  { ssr: false, loading: () => <TabLoadingState /> }
);

const DemoHeaderTabs = dynamic(
  () =>
    import("../../components/link-analyzer/link-analyzer-header").then(
      (mod) => mod.DemoHeaderTabs
    ),
  { ssr: false, loading: () => <TabLoadingState /> }
);
const RedirectsTab = dynamic(
  () =>
    import("../../components/link-analyzer/redirects-tab"),
  { ssr: false, loading: () => <TabLoadingState /> }
);

const SettingsTab = dynamic(
  () =>
    import("../../components/link-analyzer/settings-tab"),
  { ssr: false, loading: () => <TabLoadingState /> }
);

const AnchorsTab = dynamic(
  () => import("../../components/link-analyzer/anchor-tab"),
  { ssr: false, loading: () => <TabLoadingState /> }
);

function LinkAnalyzerPageContent() {
  const [activeTab, setActiveTab] = useState("overviewGpt")
  const { selectedProject } = useProjectManager();


  const renderTabContent = () => {
    switch (activeTab) {
      case "overviewGpt":
        return <OverviewKpiSummary projectId={selectedProject?.id} />
      case "pages":
        return <PagesTabAdvancedTable isActive={activeTab === "pages"} />
      case "anchors":
        return <AnchorsTab />
      case "broken-links":
        return <BrokenLinksTab isActive={activeTab === "broken-links"} />
      case "redirects":
        return <RedirectsTab isActive={activeTab === "redirects"} />
      case "external-links":
        return <ExternalLinksTab isActive={activeTab === "external-links"} />
      case "link-map":
        return <LinkMap isActive={activeTab === "link-map"} />
      // case "settings":
      //   return <SettingsTab />
      default:
        return <OverviewKpiSummary projectId={selectedProject?.id} />
    }
  }

  return (
      <TaskDrawerProvider>
        <Layout>
          <div className="min-h-screen bg-background px-4">
            <DemoHeaderTabs activeTab={activeTab} onTabChange={setActiveTab} />
            <main className="py-6 ">{renderTabContent()}</main>
          </div>
        </Layout>
      </TaskDrawerProvider>
  )
}

export default function LinkAnalyzerPage() {
  return (
    <Suspense fallback={<TabLoadingState />}>
      <LinkAnalyzerPageContent />
    </Suspense>
  );
}