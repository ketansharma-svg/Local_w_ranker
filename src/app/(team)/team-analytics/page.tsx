import React from 'react'
import TeamAnalyticsKpiGrid from './KPICardsGrid'
import { TeamActivityTrends } from './UserActivityTrends'
import TeamAnalyticsHeatmap from './DashboardUsageHeatmap'
import { UserEngagementTable } from './UserEngagementTable'
import { RoleUtilizationBreakdown } from './RoleUtilizationBreakdown'
import SmartRecommendationsDemo from './SmartRecommendations'

const TeamAnalytics = () => {
    return (
        <div className='flex flex-col gap-4 p-4'>
            <TeamAnalyticsKpiGrid />
            <TeamActivityTrends />
            <TeamAnalyticsHeatmap />
            <UserEngagementTable />
                  <RoleUtilizationBreakdown />
                  <SmartRecommendationsDemo />
        </div>
    )
}

export default TeamAnalytics