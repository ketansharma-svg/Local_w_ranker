import DemoContentHomeHeader from "./Header";
import HomeKpiRow from "./HomeKpiRow";
import ContentProjectsSnapshotSection from "./ContentProjectsSnapshot";
import PipelineFunnel from "./PipelineFunnel";
import HomeOpportunities from "./Opportunities";
import ApprovalsDeadlines from "./ApprovalsDeadlines";
import RecentAIActivity from "./RecentAIActivity";
export default function ContentHome() {
  return (
    <>
    <DemoContentHomeHeader />
    <div className="px-4">
    <HomeKpiRow />
    <ContentProjectsSnapshotSection />
    <PipelineFunnel />
    <HomeOpportunities />
    <ApprovalsDeadlines />
    <RecentAIActivity />
    </div></>
  );
}