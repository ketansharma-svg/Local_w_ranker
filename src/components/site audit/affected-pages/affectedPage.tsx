import React from 'react'
import PageSummary from './pageSummary'
import AllAffectedPage from './allAffectedPage'
import IssueSummary from './issueSummary'
import IssueExplain from './IssueExplain'

const AffectedPage = ({ siteIssues, sitedetails, selectedProject, fltIssueType }: any) => {
    return (
        <>
            <PageSummary siteIssues={siteIssues} sitedetails={sitedetails} />
            <AllAffectedPage siteIssues={siteIssues} sitedetails={sitedetails} selectedProject={selectedProject} fltIssueType={fltIssueType}/>
            <IssueSummary siteIssues={siteIssues}/>
            {/* <IssueExplain siteIssues={siteIssues}/> */}
        </>
    )
}

export default AffectedPage