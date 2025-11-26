// src/redux/teamReducer.ts
import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit"
import axios from "axios"
import Cookies from "js-cookie"
import { BASE_URL_WR } from "@/src/util/api"

// ---------- Types matching your backend ----------
type RawDashboard = { id: number | null; type: string; access: string; active: boolean }
type RawProject = {
  project_id: number
  project_name: string | null
  team_id: number
  dashboards: RawDashboard[]
  invitation_status: "Accepted" | "Pending" | "Declined"
  invitation_date: string | null
  accepted_date: string | null
  declined_date: string | null
  decline_reason: string | null
  notes: string
}
export type RawMember = {
  member_id: number
  member_email: string
  member_name: string
  projects: RawProject[]
}

// ---------- Invite confirmation (shared type) ----------
export type InviteConfirmIn = {
  success: Array<{ email: string; notes?: string }>
  skipped: Array<{ email: string; reason: string; message?: string; resolvable?: boolean; invite_id?: string }>
  invite_expiry_days?: number
}

// ---------- State ----------
type TeamState = {
  members: RawMember[]
  loadedAt?: number
  loading: boolean
  error?: string

  // UX glue
  lastInviteResult: InviteConfirmIn | null

  // cooldowns for resends (email or invite_id)
  resendCooldowns: Record<string, number>
}

const initialState: TeamState = {
  members: [],
  loading: false,
  lastInviteResult: null,
  resendCooldowns: {},
}

// ---------- Thunks ----------
const authHeader = () => {
  const token = Cookies.get("login_access_token_wrank")
  if (!token) throw new Error("Missing auth token")
  return { Authorization: `Bearer ${token}` }
}

/** Cached load: fetch once unless force = true */
export const fetchTeamDetails = createAsyncThunk<RawMember[], { force?: boolean } | undefined>(
  "team/fetchTeamDetails",
  async (arg, { getState }) => {
    const state = getState() as any
    const force = !!arg?.force
    const already = state.team?.loadedAt
    if (already && !force) return state.team.members as RawMember[]
    const { data } = await axios.get(`${BASE_URL_WR}backend-auth/team-details/`, { headers: authHeader() })
    return (data?.members ?? []) as RawMember[]
  },
)

/** Send invites; backend returns the confirmation payload. */
export const sendInvites = createAsyncThunk<InviteConfirmIn, any>(
  "team/sendInvites",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL_WR}backend-auth/invitations/send/`,
        payload,
        { headers: authHeader() }
      );
      return (data || { success: [], skipped: [] }) as InviteConfirmIn;
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors) {
        return rejectWithValue(apiErrors);
      }
      return rejectWithValue({ detail: "Unexpected error" });
    }
  }
);

/** Update member access level */
export const updateMemberAccess = createAsyncThunk<
  { member_id: string; dashboard_id: string; access_level: string },
  { dashboard_id: string; dashboard_type: string; access_level: string }
>("team/updateMemberAccess", async ({ dashboard_id, dashboard_type, access_level }) => {
  const { data } = await axios.patch(
    `${BASE_URL_WR}backend-auth/update-access/${dashboard_id}/`,
    { dashboard_type, access_level },
    { headers: authHeader() },
  )
  return data
})

/** Resend invite (best-effort; fallback 120s cooldown if endpoint differs). */
export const resendInvite = createAsyncThunk<
  { id: string; last_sent_at: string; expires_at?: string | null; cooldown: number },
  { invite_id?: string; email: string }
>("team/resendInvite", async ({ invite_id, email }) => {
  try {
    const { data } = await axios.post(
      `${BASE_URL_WR}backend-auth/invitations/resend/`,
      { invite_id: invite_id ?? null, email },
      { headers: authHeader() },
    )
    return {
      id: invite_id ?? email,
      last_sent_at: data.last_sent_at,
      expires_at: data.expires_at ?? null,
      cooldown: data.resend_cooldown_seconds ?? 120,
    }
  } catch {
    // graceful fallback
    const now = new Date().toISOString()
    return { id: invite_id ?? email, last_sent_at: now, expires_at: null, cooldown: 120 }
  }
})

/** Cancel invite */
export const cancelInvite = createAsyncThunk<{ invite_id: string }, { invite_id: string }>(
  "team/cancelInvite",
  async ({ invite_id }) => {
    try {
      await axios.post(`${BASE_URL_WR}backend-auth/invitations/cancel/`, { invite_id }, { headers: authHeader() })
    } catch {
      /* ignore for now */
    }
    return { invite_id }
  },
)

/** Remove member (best-effort; blocks Owner server-side) */
export const removeMember = createAsyncThunk<{ member_id: string }, { member_id: string }>(
  "team/removeMember",
  async ({ member_id }) => {
    try {
      await axios.post(`${BASE_URL_WR}backend-auth/members/remove/`, { member_id }, { headers: authHeader() })
    } catch {
      /* ignore for now */
    }
    return { member_id }
  },
)

// ---------- Slice ----------
export const teamSlice = createSlice({
  name: "team",
  initialState,
  reducers: {
    clearLastInviteResult(state) {
      state.lastInviteResult = null
    },
    tickCooldowns(state) {
      const next: Record<string, number> = {}
      Object.entries(state.resendCooldowns).forEach(([k, v]) => {
        if (v > 1) next[k] = v - 1
      })
      state.resendCooldowns = next
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchTeamDetails.pending, (s) => {
      s.loading = true
      s.error = undefined
    })
    b.addCase(fetchTeamDetails.fulfilled, (s, a) => {
      s.loading = false
      s.members = a.payload
      s.loadedAt = Date.now()
    })
    b.addCase(fetchTeamDetails.rejected, (s, a) => {
      s.loading = false
      s.error = a.error.message
    })

    b.addCase(sendInvites.fulfilled, (s, a) => {
      s.lastInviteResult = a.payload
      s.loadedAt = undefined 
    })

    b.addCase(updateMemberAccess.fulfilled, (s, a) => {
      // Force refresh team data after access update
      s.loadedAt = undefined
    })

    b.addCase(resendInvite.fulfilled, (s, a) => {
      s.resendCooldowns[a.payload.id] = a.payload.cooldown
    })

    b.addCase(cancelInvite.fulfilled, (_s, _a) => {
      // UI will refetch/derive pending rows from members; no-op here.
    })

    b.addCase(removeMember.fulfilled, (s, a) => {
      s.members = s.members.filter((m) => String(m.member_id) !== a.payload.member_id)
    })
  },
})

export const { clearLastInviteResult, tickCooldowns } = teamSlice.actions
export default teamSlice.reducer

// ---------- Selectors ----------
const selectTeam = (s: any) => s.team as TeamState
export const selectMembersRaw = (s: any) => selectTeam(s).members
export const selectTeamLoading = (s: any) => selectTeam(s).loading
export const selectProjects = createSelector(selectMembersRaw, (members) => {
  const map = new Map<string, { id: string; name: string; is_shared: boolean }>()
  members?.forEach((m) =>
    m.projects?.forEach((p) => {
      const id = String(p.project_id)
      if (!map.has(id)) map.set(id, { id, name: p.project_name || `Project ${p.project_id}`, is_shared: false })
    }),
  )
  return Array.from(map.values())
})

/** Map backend dashboards to canonical keys */
const toDashKey = (t: string): "seo" | "content" | "reporting" | "taskboard" => {
  const s = (t || "").toLowerCase()
  if (s.startsWith("task")) return "taskboard"
  if (s.startsWith("repo")) return "reporting"
  if (s.startsWith("cont")) return "content"
  return "seo"
}
const toRoleKey = (a: string) => {
  const r = (a || "").toLowerCase()
  return r === "owner" || r === "admin" || r === "editor" ? r : "viewer"
}

/** Pending invites derived from members */
export const selectPendingInvites = createSelector(selectMembersRaw, (members) => {
  const rows: Array<{
    invite_id: string
    email: string
    invited_by: { user_id: string; name: string; email: string }
    project_ids: string[]
    projects: Array<{ id: string; name: string; is_shared: boolean }>
    dashboards: Array<{
      dashboard: "seo" | "content" | "reporting" | "taskboard"
      enabled: boolean
      role: "admin" | "editor" | "viewer"
    }>
    created_at?: string
    last_sent_at?: string
    expires_at?: string | null
    status: "pending" | "expired" | "canceled"
    resend_cooldown_seconds: number
    tags?: string[]
  }> = []
  ;(members || []).forEach((m) =>
    (m.projects || []).forEach((p) => {
      if (p.invitation_status !== "Pending") return
      rows.push({
        invite_id: `m${m.member_id}-p${p.project_id}`,
        email: m.member_email,
        invited_by: { user_id: "", name: "—", email: "" },
        project_ids: [String(p.project_id)],
        projects: [{ id: String(p.project_id), name: p.project_name || `Project ${p.project_id}`, is_shared: false }],
        dashboards: (p.dashboards || []).map((d) => ({
          dashboard: toDashKey(d.type),
          enabled: true,
          role: toRoleKey(d.access) as any,
        })),
        created_at: p.invitation_date || undefined,
        last_sent_at: p.invitation_date || undefined,
        expires_at: null,
        status: "pending",
        resend_cooldown_seconds: 0,
      })
    }),
  )
  return rows
})

/** Invite confirmation payload from last send */
export const selectLastInviteResult = (s: any) => selectTeam(s).lastInviteResult

/** Resend cooldown lookup */
export const selectResendCooldowns = (s: any) => selectTeam(s).resendCooldowns

/** Summary counts used by TeamActivitySummary */
export const selectTeamSummary = createSelector(selectMembersRaw, (members) => {
  const accepted = members.filter((m) => m.projects.some((p) => p.invitation_status === "Accepted"))
  const pending = members.filter((m) => m.projects.some((p) => p.invitation_status === "Pending"))
  const adminCount = members.filter((m) =>
    m.projects.some((p) => p.dashboards.some((d) => d.access.toLowerCase() === "admin")),
  ).length
  const ownerCount = members.filter((m) =>
    m.projects.some((p) => p.dashboards.some((d) => d.access.toLowerCase() === "owner")),
  ).length
  const activeProjects = new Set<string>()
  members.forEach((m) =>
    m.projects
      .filter((p) => p.invitation_status === "Accepted")
      .forEach((p) => activeProjects.add(String(p.project_id))),
  )
  const multiDashUsers = members.filter((m) => m.projects.flatMap((p) => p.dashboards).length > 1).length
  return {
    counts: {
      total_active_members: accepted.length,
      pending_invites: pending.length,
      members_with_admin_role: adminCount,
      owner_count: ownerCount,
      active_projects_assigned: activeProjects.size,
      multi_dashboard_users: multiDashUsers,
      inactive_users_30d: 0,
    },
    last_generated_at: new Date().toISOString(),
  }
})
