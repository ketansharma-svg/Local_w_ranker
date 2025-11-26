import React from 'react'
import DemoPageInsightsHeader from "./components/Header";
import DemoPageInsightsSummary from "./components/InsightsSummary";
import OpportunityMatrixSection from "./components/OpportunityMatrix";
import DemoPerformanceTrend from "./components/PerformanceTrend";
import PageInsightsPagesSection from "./components/PageInsights";

const PageInsights = () => {
    return (
        <div className=' '>
            <DemoPageInsightsHeader />
            <DemoPageInsightsSummary />
            <OpportunityMatrixSection />
            <DemoPerformanceTrend />
            <PageInsightsPagesSection />
        </div>
    )
}

export default PageInsights;