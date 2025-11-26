

import React from 'react'
import ScoreSummary from './scoreSummary'
import PerfomanceMwetrics from './perfomanceMwetrics'
import PerformanceRingChart from './diagnosePerformance';
import ScreenshotLoading from './screenshotLoading';
import LoadingTimeline from './loadingTimeline';
import FinalRec from './finalRec';

const PageExp = ({ siteIssuesData, sitedetails, selectedProject }: any) => {    

    return (
        <>
            <div className='flex flex-col gap-4'>
                <ScoreSummary siteIssuesData={siteIssuesData} sitedetails={sitedetails} selectedProject={selectedProject} />
                <PerfomanceMwetrics siteIssuesData={siteIssuesData} />
                <PerformanceRingChart siteIssuesData={siteIssuesData} />
                {/* <ScreenshotLoading siteIssuesData={siteIssuesData} /> */}
                <LoadingTimeline siteIssuesData={siteIssuesData}/>
                <FinalRec siteIssuesData={siteIssuesData} />
            </div>
        </>

    )
}

export default PageExp