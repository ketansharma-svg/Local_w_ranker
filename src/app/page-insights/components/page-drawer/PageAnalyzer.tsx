'use client'
import React from 'react'
import DemoPageAnalyzerSummaryKPI from "./SummaryKPI";
import DemoAuditSummary from "./AuditSummary";
import TrafficOverviewSection from "./TrafficOverview";
import KeywordsOverviewRedesigned from "./KeywordsOverview";
import DemoTopMoversRightHalf from "./TopMovers";
import InternalLinkOverviewSection from "./InternalLink";
import BacklinksOverviewSection from "./BacklinksOverview";
import DemoTasksNotesSection from "./TasksNotesSection";
import { Drawer } from "antd";  
export interface DrawerProps {
  open?: boolean;
  onClose?: () => void;
}
const PageAnalyzer:React.FC<DrawerProps> = ({open,onClose}) => {
    return (
            <Drawer       placement="right"
      width={1500}
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: 0 },
      }}>
        <div className=' '>
            <DemoPageAnalyzerSummaryKPI />
            <DemoAuditSummary />
            <TrafficOverviewSection />
            <KeywordsOverviewRedesigned />
            <DemoTopMoversRightHalf />
            <InternalLinkOverviewSection />
            <BacklinksOverviewSection />
            <DemoTasksNotesSection />
        </div></Drawer>
    )
}

export default PageAnalyzer;