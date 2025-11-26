import React from 'react'
import DemoKeywordsHeader from "./KeywordsHeader";
import KeywordsKpiAndMovement from "./KeywordsKpi";
import TargetKeywordsSetSection from "./TargetKeywords";
import OnPageCoverage from "./OnPageCoverage";
import OpportunitiesGapsSection from "./OpportunitiesGaps";
import SerpSnapshot from "./SerpSnapshot";
import CannibalizationRedesigned from "./Cannibalization";
import BacklinksHeader from "./BacklinksHeader";
const KeywordDrawer = () => {
    return (
        <div className=' '>
            <DemoKeywordsHeader />
            <KeywordsKpiAndMovement />
            <TargetKeywordsSetSection />
            <OnPageCoverage />
            <OpportunitiesGapsSection />
            <SerpSnapshot />
            <CannibalizationRedesigned />
            <BacklinksHeader url={""}/>

        </div>
    )
}

export default KeywordDrawer;