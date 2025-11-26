"use client"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import { useAppDispatch, useAppSelector } from "@/src/redux/hooks"
import {
    fetchBacklinks,
    selectBacklinkError,
    selectBacklinkLoading,
    selectBacklinks,
    selectBacklinkStats,
    setTargetDomain,
} from "@/src/redux/reducer/backlinkReducer"
import { useEffect, useState } from "react"
import { AddLinkToMonitorModal } from "./components/AddLinktoMonitorModal"
import { HealthHeaderAndSmartInsights } from "./components/LinkHealthMonitorPanel"
import TrackedBacklinksTable from "./components/TRACKEDBACKLINKS"
import DetailDrawer from "./LinkDetailDrawer/drawer"
import SectionHealthMonitorKpiCards from "./components/HealthMonitorKpiCards";
import SmartInsightsDemo from "./components/SmartInsights";
const BacklinkHealthMonitor = () => {
    const dispatch = useAppDispatch()

    // Redux state
    const backlinks = useAppSelector(selectBacklinks)

    const loading = useAppSelector(selectBacklinkLoading)
    const stats = useAppSelector(selectBacklinkStats)
    const error = useAppSelector(selectBacklinkError)
    const { selectedProject, loading: projectLoading }: any = useProjectManager()

    // Local state
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedBacklinkId, setSelectedBacklinkId] = useState<number>()
    const [targetDomain, setTargetDomainLocal] = useState("")
    const [selectedDomain, setSelectedDomain] = useState("")
    const [detailData, setDetailData] = useState<any | null>(null);

    // Initialize data on mount
    useEffect(() => {
        if (selectedDomain) {
            dispatch(setTargetDomain(selectedDomain))
            dispatch(fetchBacklinks({ domain: selectedDomain }))
        }
    }, [dispatch, selectedDomain])

    useEffect(() => {
        if (selectedProject) {
            setTargetDomainLocal((selectedProject as any)?.url)
            setSelectedDomain(selectedProject.url)
        }
    }, [selectedProject])

    // Get existing monitored keys for duplicate detection
    const existingMonitoredKeys = backlinks.map((b) =>
        `${b.referal_url}__${b.backlinks[0]?.anchor_link || ""}`.toLowerCase(),
    )

    const handleExport = () => {
        // Generate CSV export
        const csvData = backlinks.flatMap((b) =>
            b.backlinks.map((bl) => ({
                source_url: b.referal_url,
                target_url: bl.anchor_link,
                anchor_text: bl.anchor_text,
                rel_attribute: bl.rel_attribute,
                status: b.status,
                status_code: bl.status_code,
                first_seen: bl.first_seen,
                last_checked: b.last_checked,
            })),
        )

        const csvContent = [
            Object.keys(csvData[0] || {}).join(","),
            ...csvData.map((row) => Object.values(row).join(",")),
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `backlinks-${stats.target_domain}-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const apiPayload = {
        results: backlinks,
        stats,
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto  ">

                {/* Main Content */}
                <div className="space-y-6">
                    <HealthHeaderAndSmartInsights
                        onAddToTracker={() => setAddModalOpen(true)}
                    />
                    {/* <SectionHealthMonitorKpiCards /> */}
                    <TrackedBacklinksTable
                        api={apiPayload}
                        onOpenDetail={(detail) => {
                            setDetailData(detail);
                            setDetailOpen(true);
                        }}
                    />
                    {/* <SmartInsightsDemo /> */}
                </div>

                {/* Modals and Drawers */}
<AddLinkToMonitorModal
  open={addModalOpen}
  onClose={() => setAddModalOpen(false)}
  existingMonitoredKeys={existingMonitoredKeys}
  domain={selectedDomain}
  onSuccess={() => {
    if (selectedDomain) {
      dispatch(fetchBacklinks({ domain: selectedDomain }));
    }
  }}
/>


                <DetailDrawer
                    detailOpen={detailOpen}
                    setDetailOpen={setDetailOpen}
                    backlinkId={selectedBacklinkId}
                    data={detailData}
                />            </div>
        </div>
    )
}

export default BacklinkHealthMonitor
