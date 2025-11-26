"use client"
import Demo from "./Demo";
import LinkOpportunityKpiMetrics from "./KpiMetrics";
import LinkOpportunityWhySuggested from "./WhySuggested";
import DomainOverviewSection from "./DomainOverview";
import PurchaseAndRelated from "./PurchaseAndRelated";
const DetailViewer = () => {


    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto  ">
                <Demo />
                {/* Main Content */}
                <div className="space-y-6">
                 
                </div>

                {/* Modals and Drawers */}
                <LinkOpportunityKpiMetrics />
                <LinkOpportunityWhySuggested />
                <DomainOverviewSection />
                <PurchaseAndRelated domain={"dsd"} linkType={"Guest Post"} price={4}  deliveryDays={4}/>
                         </div>
        </div>
    )
}

export default DetailViewer;
