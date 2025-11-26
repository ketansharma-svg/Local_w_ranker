"use client"
import { useState } from 'react'
import { BacklinkOverviewHeader } from './components/HeaderOverview'
import BIOverviewQuickActionGrid from './components/QuickActionGrid'
import ReferringDomainsPreviewTable from './components/ReferringDomainsTablePreview'
import Section2LeftInner from './components/SECTION2LeftSide'
import Section2RightKpiCards from './components/SECTION2RightSide'
import OVI_Chart_AnchorTypeDistribution from './components/section4charts/AnchorTypeDistribution'
import BacklinksAcquisitionTrend from './components/section4charts/BacklinksAcquisitionTrend'
import OVI_Chart_BacklinkTypesDistribution from './components/section4charts/BacklinkTypesDistribution'
import OVI_Section_RefDomainCategories from './components/section4charts/CategoriesofReferringDomains'
import DomainQualityBreakdown from './components/section4charts/DomainQualityBreakdown'
import LinkAttributeBreakdownDonut from './components/section4charts/LinkAttributeBreakdown'
import Chart8_LinkProfileDistribution from './components/section4charts/LinkProfileDistribution'
import RefDomainAcquisitionTrendFixed from './components/section4charts/ReferringDomainAcquisitionTrend'
import RefDomainsByCountry from './components/section4charts/ReferringDomainsbyCountry'
import RefDomainsGainLoss from './components/section4charts/ReferringDomainsGain&loss'
import TldDistributionChart from './components/section4charts/TLDDistribution'
import { TopPagesPreview } from './components/TopPages(byReferringDomains&Backlinks)'
import ReferringDomainBacklinksTrendChart from './components/section4charts/ReferringDomainTrendChart'

const BacklinkInsights = () => {
    const SAMPLE_PAGES: any = [
        { id: 1, url: "https://example.com/guide/technical-seo", title: "Ultimate Technical SEO Guide", refDomains: 142, backlinks: 823, avgWR: 76, toxicPercent: 4, anchorDiversityCount: 58, growthTrend: "up" },
        { id: 2, url: "https://example.com/blog/keyword-research", title: "Keyword Research 101", refDomains: 95, backlinks: 403, avgWR: 63, toxicPercent: 9, anchorDiversityCount: 41, growthTrend: "flat" },
        { id: 3, url: "https://example.com/templates/seo-audit-checklist", title: "SEO Audit Checklist (Free Template)", refDomains: 88, backlinks: 527, avgWR: 72, toxicPercent: 13, anchorDiversityCount: 35, growthTrend: "up" },
        { id: 4, url: "https://example.com/pricing", refDomains: 37, backlinks: 71, avgWR: 39, toxicPercent: 22, anchorDiversityCount: 12, growthTrend: "down" },
        { id: 5, url: "/academy/lesson/on-page-seo", title: "On-Page SEO – Lesson 1", refDomains: 51, backlinks: 188, avgWR: 55, toxicPercent: 7, anchorDiversityCount: 24, growthTrend: "flat" },
        { id: 6, url: "/case-studies/saas-growth-2025", title: "Case Study: SaaS Growth 2025", refDomains: 44, backlinks: 202, avgWR: 61, toxicPercent: 5, anchorDiversityCount: 19, growthTrend: "up" },
    ];

    return (
        <div className='p-4 space-y-4'>
            <BacklinkOverviewHeader
                projectName="w3era.com"
                onExport={() => alert("Export Report")}
                onCreateTask={() => alert("Create Task")}
                onDisavow={() => alert("Open Disavow Manager")}
                onAddToTracker={() => alert("Open Manual Link Tracker")}
                onFindNewLink={() => alert("Go to Opportunities")}
            />

            <div className='flex  gap-4 w-full'>
                <Section2LeftInner
                    data={{
                        wrScore: 71,
                        wrDelta30d: +5,
                        toxicityDeduction: 4,
                        toxicDomains: 2,
                        wrScoreHistory30d: [65, 66, 67, 68, 69, 70, 71],
                        radar: [
                            { key: 'RDAS', label: 'RDAS', value: 74, desc: 'Average quality of linking domains.' },
                            { key: 'LPDS', label: 'LPDS', value: 65, desc: 'Diversity across sources & follow types.' },
                            { key: 'LVS', label: 'LVS', value: 61, desc: 'Natural backlink growth pattern.' },
                            { key: 'AQS', label: 'AQS', value: 63, desc: 'Anchor diversity & spam prevention.' },
                            { key: 'ITDS', label: 'ITDS', value: 72, desc: 'IP & TLD diversity of backlinks.' },
                        ],
                    }}
                />
                <Section2RightKpiCards className='w-full' />
            </div>


            <RefDomainsGainLoss />

            <div className='flex  gap-4'>
                <>
                    <BacklinksAcquisitionTrend />
                </>
                <>
                    <DomainQualityBreakdown />
                </>
            </div>
            <div >
                    <ReferringDomainBacklinksTrendChart />

            </div>
            <div className='flex  gap-4'>
                <div className='flex-1'>
                    <TldDistributionChart />
                </div>
                <div className='flex-1'>
                    <RefDomainAcquisitionTrendFixed />
                </div>
            </div>
            <div className='flex  gap-4'>
                <>
                    <RefDomainsByCountry />
                </>
                <>
                    <Chart8_LinkProfileDistribution />
                </>
            </div>
            <div className='flex  gap-4'>
                <>
                    <OVI_Chart_BacklinkTypesDistribution />
                </>
                <>
                    <LinkAttributeBreakdownDonut />
                </>
            </div>
            <div className='flex  gap-4'>
                <>
                    <OVI_Chart_AnchorTypeDistribution />
                </>
                <>
                    <OVI_Section_RefDomainCategories />
                </>
            </div>
            <div className='flex  gap-4'>
                <div className='flex-[2]'>
                    <ReferringDomainsPreviewTable className='h-full' />
                </div>
                <div className='flex-1'>

                    <TopPagesPreview
                        pages={SAMPLE_PAGES}
                        maxRows={5}
                        onOpenPageAnalyzer={(row) => console.log("Open Page Analyzer →", row)}
                        onOpenRefDomains={(row) => console.log("Open Referring Domains →", row)}
                        onOpenBacklinks={(row) => console.log("Open Backlinks →", row)}
                        onViewAllPages={() => console.log("View All Pages CTA")} />

                </div>
            </div>



            <BIOverviewQuickActionGrid />
        </div>
    )
}

export default BacklinkInsights