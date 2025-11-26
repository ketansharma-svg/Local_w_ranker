"use client"
import OpportunitiesHeaderAndSmartPicks from "./compenents/Header";
import OpportunitiesKpiSummary from "./compenents/KpiSummary";
import OpportunityTableSection from "./compenents/OpportunityTable";
const LinkBuildingOpportunities = () => {


    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto  ">
                <OpportunitiesHeaderAndSmartPicks />
                {/* Main Content */}

                {/* Modals and Drawers */}
                <OpportunitiesKpiSummary />
                <OpportunityTableSection />

                         </div>
        </div>
    )
}

export default LinkBuildingOpportunities;
