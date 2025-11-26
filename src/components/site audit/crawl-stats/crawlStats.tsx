import React from 'react'
import CrawlStateCard from './crawlStateCard'
import CrawlStatsBreackdown from './crawlStatsBreackdown'
import CrawledURLS from './crawledURLS'
import HostStatusSummary from './hostStatusSummary'

const CrawlStats = ({siteIssues, sitedetails, linksData}:any) => {
  return (
    <div className='flex flex-col gap-6'>
        <CrawlStateCard siteIssues={siteIssues} sitedetails={sitedetails}/>
        <CrawlStatsBreackdown siteIssues={siteIssues} sitedetails={sitedetails}/>
        <CrawledURLS siteIssues={siteIssues} sitedetails={sitedetails} linksData={linksData}/>
        <HostStatusSummary siteIssues={siteIssues} sitedetails={sitedetails}/>
    </div>
  )
}

export default CrawlStats