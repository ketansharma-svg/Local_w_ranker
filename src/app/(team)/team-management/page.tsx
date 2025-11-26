// app/(team)/page.tsx
"use client"
import { useEffect, useRef, useState, useCallback } from "react"
  import { useDispatch, useSelector } from "react-redux"
import {
  fetchTeamDetails,
  clearLastInviteResult,
  selectProjects,
  selectLastInviteResult,
  type InviteConfirmIn,
} from "@/src/redux/reducer/teamReducer"

import InviteMemberModal from "./InviteMemberModal"
import { InviteConfirmModal } from "./InviteConfirmationModal"
import { RolesPermissionsConfigModal } from "./RolesPermissionsConfig"
import { TeamActivitySummarySection } from "./TeamActivitySummary"
import { PendingInvitesSection } from "./PendingInvitations"
import { ActiveMembersTable, TeamHeader } from "./PanelHeaderActiveMembersTable"

export default function TeamManagementPage() {
  const dispatch = useDispatch<any>()

  // fetch team once (cached in reducer)
  useEffect(() => {
    dispatch(fetchTeamDetails({ force: false }))
  }, [dispatch])

  // UI local states
  const [inviteOpen, setInviteOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const pendingRef = useRef<HTMLDivElement | null>(null)

  // projects for PendingInvites filters
  const projects: any = useSelector(selectProjects)
  

  // Invite → Confirm glue
  const confirmData:any = useSelector(selectLastInviteResult)
  
  const mappedData = confirmData
  ? {
      success: confirmData.data.map((item: any) => ({
        email: item.member_email,
        notes: item.requested_access
          .map((ra: any) => {
            const dashboards = ra.dashboards
              .map((d: any) => `${d.type} (${d.access})`)
              .join(", ")
            return `Project ${ra.project_id}: ${dashboards}`
          })
          .join(" | "),
      })),
      skipped: [],
    }
  : { success: [], skipped: [] }

  

  
  const confirmOpen = !!confirmData

  const handleCloseConfirm = useCallback(() => {
    dispatch(clearLastInviteResult())
  }, [dispatch])

  return (
    <div style={{ background: "#fafafa" }}>
      <TeamHeader
        onInvite={() => setInviteOpen(true)}
        onRolesConfig={() => setRolesOpen(true)}
        onMoreAction={(a: string) => {
          if (a === "export") {
            alert("Use Export CSV in the table.")
          }
        }}
      />
<ActiveMembersTable />
      <div ref={pendingRef} id="pending-invites" style={{ padding: "16px" }}>
        <PendingInvitesSection projects={projects} onInviteMoreClick={() => setInviteOpen(true)} />
      </div>

      {/* KPI summary (uses reducer counts) */}
      <div style={{ padding: "10px 12px" }}>
        <TeamActivitySummarySection
          scope="all"
          onDrilldown={(action) => {
            if (action === "pending_invites") pendingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
        />
      </div>

      {/* Pending Invitations */}

      {/* Roles & Permissions Config */}
      <RolesPermissionsConfigModal open={rolesOpen} onClose={() => setRolesOpen(false)} />

      {/* Invite member → confirmation */}
      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onResult={(_res: InviteConfirmIn) => {
          dispatch(fetchTeamDetails({ force: true }))
        }}
      />
      <InviteConfirmModal
        open={confirmOpen}
        data={mappedData || { success: [], skipped: [] }}
        onClose={handleCloseConfirm}
        onViewPending={() => {
          handleCloseConfirm()
          pendingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        onInviteMore={() => {
          handleCloseConfirm()
          setInviteOpen(true)
        }}
        onOpenAccessEditor={(email) => {
          handleCloseConfirm()
          alert(`Open Manage Access for: ${email}`)
        }}
        onEditAndReinvite={() => {
          handleCloseConfirm()
          setInviteOpen(true)
        }}
      />
    </div>
  )
}
