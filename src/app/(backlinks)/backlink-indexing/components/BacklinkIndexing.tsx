import BacklinksIndexingSubpanelHeader from "./IndexingHeader";
import SubmitAndValidateSection from "./SubmitAndValidate";
import SectionIndexingProgressKpis from "./ProgressKpis";
import DiscoveryBoostersLog from "./DiscoveryBoostersLog";
import QueueStatusTable from "./QueueStatus";
export default function BacklinkIndexing(){
    return(
        <>
        <BacklinksIndexingSubpanelHeader />
        <SubmitAndValidateSection />
        <SectionIndexingProgressKpis />
        <DiscoveryBoostersLog />
        <QueueStatusTable />
        </>
    )
}