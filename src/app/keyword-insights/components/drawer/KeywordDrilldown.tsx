import React from "react";
import DemoKeywordDrilldownHeader from "./Header";
import DemoRankTimeline from "./RankTimeline";
import DemoSerpSnapshot from "./SerpSnapshot";
import DemoKeywordAttributes from "./KeywordAttributes";
import DemoLandingPageInsightsSection from "./LandingPageInsights";
import DemoKeywordOpportunitiesGaps from "./KeywordOpportunities";
export default function KeywordDrilldown(){
    return(
        <>
        <DemoKeywordDrilldownHeader />
        <DemoRankTimeline />
        <DemoSerpSnapshot />
        <DemoKeywordAttributes />
        <DemoLandingPageInsightsSection />
        <DemoKeywordOpportunitiesGaps />
        </>
    )
}