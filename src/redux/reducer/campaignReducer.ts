// src/redux/reducer/campaignReducer.ts
import { createSlice, createAsyncThunk, createEntityAdapter, type PayloadAction } from "@reduxjs/toolkit"
import Cookies from "js-cookie"
import { BASE_URL_WR } from "@/src/util/api" // same constant used across your code
import type { RootState } from "../store"

type StatusKey = "not_started" | "working" | "under_review" | "completed"
type PriorityKey = "low" | "medium" | "high" | "critical"

export type ApiStatus = "not_started" | "working" | "under_review" | "completed"
export type ApiPriority = "Low" | "Medium" | "High" | "Critical"

export interface ApiActivity {
  id: number | string
  title: string
  project: number
  category?: number
  description?: string
  progress?: string
  priority: ApiPriority
  status: ApiStatus
  date?: string | null
  due_date?: string | null
  notes?: string
  is_published?: boolean
  assigned_to?: string | null
}

export type Activity = {
  id: number
  title: string
  category_name: string
  project_id: number
  description?: string | null
  internal_notes?: string | null
  status: StatusKey
  priority: PriorityKey
  assigned_to: string | null // email or null
  assignee_name?: string | null
  date?: string | null // start
  due_date?: string | null // end
  updated_at?: string | null
  updated_by?: string | null
}

type ListKey = string // `${projectId}|${status}`
type ListState = {
  ids: string[] // activity ids as strings (normalised)
  next: string | null // next page URL
  count: number // server 'count'
  loading: boolean
  error?: string
}
type CampaignProjectOverview = {
  project_id: number
  project_name: string | null
  domain?: string
  url?: string
  summary: {
    "Not Started"?: number
    Working?: number
    "Under Review"?: number
    Completed?: number
  }
}

type CampaignOverview = {
  as_manager: CampaignProjectOverview[]
  as_member: CampaignProjectOverview[]
}

const adapter = createEntityAdapter<Activity, string>({
  selectId: (a) => String(a.id),
  sortComparer: (a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")),
})
const initialState = adapter.getInitialState<{
  lists: Record<ListKey, ListState>
  loadingById: Record<string, boolean>
  errorById: Record<string, string | undefined>
  overview: { data?: CampaignOverview; loading: boolean; error?: string }
  globalTemplates: { data?: any; loading: boolean; error?: string }
  myTemplates: { data?: any; loading: boolean; error?: string }
}>({
  lists: {},
  loadingById: {},
  errorById: {},
  overview: { data: undefined, loading: false, error: undefined },
  globalTemplates: { data: undefined, loading: false, error: undefined },
  myTemplates: { data: undefined, loading: false, error: undefined },
})

/* ───────────────── helpers ───────────────── */

function token() {
  return Cookies.get("login_access_token_wrank")
}
function authHeaders() {
  const t = token()
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }
}
function listKey(projectId: number | string, status: StatusKey): ListKey {
  return `${projectId}|${status}`
}
function ensureList(state: typeof initialState, key: ListKey): ListState {
  return (state.lists[key] ??= { ids: [], next: null, count: 0, loading: false })
}
function pushUnique(arr: string[], id: string, atStart = false) {
  if (arr.includes(id)) return
  atStart ? arr.unshift(id) : arr.push(id)
}

const statusNorm = (v: any): StatusKey => {
  const s = String(v || "")
    .toLowerCase()
    .replace(/\s+/g, "_")
  if (s === "in_progress") return "working"
  if (s === "working") return "working"
  if (s === "under_review") return "under_review"
  if (s === "completed") return "completed"
  return "not_started"
}

const priorityNorm = (v: any): PriorityKey => {
  const p = String(v || "low").toLowerCase()
  return (["low", "medium", "high", "critical"] as PriorityKey[]).includes(p as PriorityKey)
    ? (p as PriorityKey)
    : "low"
}

function pickAssignee(input: any): string | null {
  // API sometimes sends string email, sometimes object (name/email), or null.
  if (!input) return null
  if (typeof input === "string") return input
  if (typeof input === "object") return input.email || input.name || String(input.id || "")
  return null
}

function normaliseActivity(a: any): Activity {

  return {
    id: Number(a.id),
    title: a.title || "",
    project_id: Number(a.project_id ?? a.project),
    description: a.description ?? null,
    internal_notes: a.notes ?? null,
    status: statusNorm(a.status),
    priority: priorityNorm(a.priority),
    assigned_to: pickAssignee(a.assigned_to),
    assignee_name: a.assigned_to_name || a.assigned_to || null,
    date: a.date ? String(a.date).slice(0, 10) : null,
    due_date: a.due_date ? String(a.due_date).slice(0, 10) : null,
    updated_at: a.updated_at || a.updatedAt || null,
    updated_by: a.last_updated_by || a.updated_by || null,
    category_name: a.category_name || null,
  }
}

/* ───────────────── thunks ───────────────── */
export const fetchCampaignOverview = createAsyncThunk<CampaignOverview>(
  "campaign/fetchCampaignOverview",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL_WR}activities/overview/`, {
        headers: authHeaders(),
        credentials: "include",
      } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as CampaignOverview
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch overview")
    }
  },
)
/** Page over activities of a project for a given status. */
export const fetchActivitiesPage = createAsyncThunk(
  "campaign/fetchActivitiesPage",
  async (
    args: {
      projectId: number | string
      status?: any
      page?: number
      pageSize?: number
      pageUrl?: string
      replace?: boolean
    },
    { rejectWithValue },
  ) => {
    try {
      const { projectId, status, page = 1, pageSize = 10, pageUrl } = args
      const url =
        pageUrl ||
        `${BASE_URL_WR}campaigns/activities/${encodeURIComponent(projectId)}/?status=${encodeURIComponent(status)}&page=${page}&page_size=${pageSize}`
      const res = await fetch(url, { headers: authHeaders(), credentials: "include" } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const activities = (json.results || []).map(normaliseActivity)
      return {
        projectId: Number(projectId),
        status,
        activities,
        next: json.next || null,
        count: Number(json.count || 0),
        replace: args.replace === true,
      }
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch activities")
    }
  },
)
/** Get activity by id (canonical single-activity endpoint). */
export const fetchActivityById = createAsyncThunk(
  "campaign/fetchActivityById",
  async (id: number | string, { rejectWithValue }) => {
    try {
      const url = `${BASE_URL_WR}campaign-activities-new/${id}/`
      const res = await fetch(url, { headers: authHeaders(), credentials: "include" } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return normaliseActivity(json)
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch activity")
    }
  },
)
/** PATCH fields (excludes assignment; use assignActivity). Returns fresh entity (GET after mutate). */
export const patchActivity = createAsyncThunk(
  "campaign/patchActivity",
  async (args: { id: number | string; patch: Record<string, any> }, { rejectWithValue }) => {
    try {
      const { id, patch } = args
      const url = `${BASE_URL_WR}campaign-activities-new/${id}/`
      const res = await fetch(url, {
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify(patch),
      } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // GET fresh
      const res2 = await fetch(url, { headers: authHeaders(), credentials: "include" } as any)
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`)
      return normaliseActivity(await res2.json())
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to update activity")
    }
  },
)
/** Assign via dedicated endpoint. Returns fresh entity. */
export const assignActivity = createAsyncThunk(
  "campaign/assignActivity",
  async (args: { id: number | string; assigned_to: string }, { rejectWithValue }) => {
    try {
      const { id, assigned_to } = args
      const postUrl = `${BASE_URL_WR}campaign-activities-new/assign/${id}/`
      const res = await fetch(postUrl, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ assigned_to }),
      } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // GET fresh
      const getUrl = `${BASE_URL_WR}campaign-activities-new/${id}/`
      const res2 = await fetch(getUrl, { headers: authHeaders(), credentials: "include" } as any)
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`)
      return normaliseActivity(await res2.json())
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to assign activity")
    }
  },
)
/** Complete via dedicated endpoint. Returns fresh entity. */
export const completeActivity = createAsyncThunk(
  "campaign/completeActivity",
  async (id: number | string, { rejectWithValue }) => {
    try {
      const postUrl = `${BASE_URL_WR}campaign-activities-new/complete/${id}/`
      const res = await fetch(postUrl, { method: "POST", headers: authHeaders(), credentials: "include" } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // GET fresh
      const getUrl = `${BASE_URL_WR}campaign-activities-new/${id}/`
      const res2 = await fetch(getUrl, { headers: authHeaders(), credentials: "include" } as any)
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`)
      return normaliseActivity(await res2.json())
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to complete activity")
    }
  },
)
/** Delete activity and evict from all lists. */
export const deleteActivity = createAsyncThunk(
  "campaign/deleteActivity",
  async (id: number | string, { rejectWithValue }) => {
    try {
      const url = `${BASE_URL_WR}campaign-activities-new/${id}/`
      const res = await fetch(url, { method: "DELETE", headers: authHeaders(), credentials: "include" } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { id: String(id) }
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to delete activity")
    }
  },
)

export const createActivity = createAsyncThunk<ApiActivity, Omit<ApiActivity, "id">>(
  "campaign/createActivity",
  async (payload, { rejectWithValue }) => {
    const token = Cookies.get("login_access_token_wrank")
    const res = await fetch(`${BASE_URL_WR}campaign-activities-new/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return rejectWithValue(await res.text().catch(() => "Failed to create"))
    return (await res.json()) as ApiActivity
  },
)

export const fetchGlobalTemplates = createAsyncThunk<CampaignOverview>(
  "campaign/fetchGlobalTemplates",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL_WR}global-templates/`, {
        headers: authHeaders(),
        credentials: "include",
      } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as CampaignOverview
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch overview")
    }
  },
)
export const fetchMyTemplates = createAsyncThunk<CampaignOverview>(
  "campaign/fetchMyTemplates",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BASE_URL_WR}my-templates/`, {
        headers: authHeaders(),
        credentials: "include",
      } as any)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as CampaignOverview
    } catch (e: any) {
      return rejectWithValue(e?.message || "Failed to fetch overview")
    }
  },
)

function ensureBucket(state: any, projectId: string | number, status: ApiStatus) {
  const pid = String(projectId)
  state.activitiesByProjectStatus ||= {}
  state.activitiesByProjectStatus[pid] ||= {}
  state.activitiesByProjectStatus[pid][status] ||= { items: [], meta: {} }
  return state.activitiesByProjectStatus[pid][status]
}

/* ───────────────── slice ───────────────── */

const slice = createSlice({
  name: "campaign",
  initialState,
  reducers: {
    /** Optional: clear a list (eg. after filter change) */
    resetList(state, action: PayloadAction<{ projectId: number | string; status: StatusKey }>) {
      state.lists[listKey(action.payload.projectId, action.payload.status)] = {
        ids: [],
        next: null,
        count: 0,
        loading: false,
      }
    },
    addTaskOptimistic: (state, action: PayloadAction<{ tempId: string; task: Activity }>) => {
      const { tempId, task } = action.payload
      // Add to entity store with temp ID
      adapter.upsertOne(state, { ...task, id: tempId as any })

      // Add to appropriate list
      const key = listKey(task.project_id, task.status)
      const list = ensureList(state, key)
      pushUnique(list.ids, tempId, true) // Add at start for immediate visibility
    },

    replaceOptimisticTask: (state, action: PayloadAction<{ tempId: string; realTask: Activity }>) => {
      const { tempId, realTask } = action.payload
      const realId = String(realTask.id)

      // Remove temp entity and add real one
      adapter.removeOne(state, tempId)
      adapter.upsertOne(state, realTask)

      // Update all lists that contain the temp ID
      Object.values(state.lists).forEach((list) => {
        const index = list.ids.indexOf(tempId)
        if (index !== -1) {
          list.ids[index] = realId
        }
      })
    },

    removeOptimisticTask: (state, action: PayloadAction<{ tempId: string }>) => {
      const { tempId } = action.payload

      // Remove from entity store
      adapter.removeOne(state, tempId)

      // Remove from all lists
      Object.values(state.lists).forEach((list) => {
        list.ids = list.ids.filter((id) => id !== tempId)
      })
    },
  },
  extraReducers: (b) => {
    b
      // list page
      .addCase(fetchActivitiesPage.pending, (state, action) => {
        const { projectId, status, replace }: any = action.meta.arg
        const key = listKey(projectId, status)
        const l = ensureList(state, key)
        l.loading = true
        l.error = undefined
        if (replace === true) {
          l.ids = []
          l.next = null
          l.count = 0
        }
      })
      .addCase(fetchActivitiesPage.fulfilled, (state, action) => {
        const { projectId, status, activities, next, count, replace } = action.payload as any
        const key = listKey(projectId, status)
        const l = ensureList(state, key)
        adapter.upsertMany(state, activities)
        const ids = activities.map((a: Activity) => String(a.id))
        l.ids = replace ? Array.from(new Set(ids)) : Array.from(new Set([...l.ids, ...ids]))
        l.next = next
        l.count = count
        l.loading = false
      })
      .addCase(fetchActivitiesPage.rejected, (state, action) => {
        const { projectId, status }: any = action.meta.arg
        const key = listKey(projectId, status)
        const l = ensureList(state, key)
        l.loading = false
        l.error = action.payload as string | undefined
      })

      // fetch one
      .addCase(fetchActivityById.pending, (state, action) => {
        state.loadingById[String(action.meta.arg)] = true
        state.errorById[String(action.meta.arg)] = undefined
      })
      .addCase(fetchActivityById.fulfilled, (state, action) => {
        const act = action.payload as Activity
        const prev = state.entities[String(act.id)]
        adapter.upsertOne(state, act)
        reindexMembership(state, prev ?? null, act)
        state.loadingById[String(act.id)] = false
      })
      .addCase(fetchActivityById.rejected, (state, action) => {
        const id = String(action.meta.arg)
        state.loadingById[id] = false
        state.errorById[id] = action.payload as string | undefined
      })

      // patch / assign / complete → all upsert+reindex with fresh data
      .addCase(patchActivity.fulfilled, upsertAndReindex)
      .addCase(assignActivity.fulfilled, upsertAndReindex)
      .addCase(completeActivity.fulfilled, upsertAndReindex)

      // delete
      .addCase(deleteActivity.fulfilled, (state, action) => {
        const id = String(action.payload.id)
        // remove from every list
        Object.values(state.lists).forEach((l) => (l.ids = l.ids.filter((x) => x !== id)))
        adapter.removeOne(state, id)
        delete state.loadingById[id]
        delete state.errorById[id]
      })
      .addCase(fetchCampaignOverview.pending, (state) => {
        state.overview.loading = true
        state.overview.error = undefined
      })
      .addCase(fetchCampaignOverview.fulfilled, (state, action) => {
        state.overview.loading = false
        state.overview.data = action.payload
      })
      .addCase(fetchCampaignOverview.rejected, (state, action) => {
        state.overview.loading = false
        state.overview.error = action.payload as string | undefined
      })
      .addCase(createActivity.fulfilled, (state, { payload }) => {
        const bucket = ensureBucket(state, payload.project, payload.status)
        const exists = bucket.items.some((x: any) => String(x.id) === String(payload.id))
        if (!exists) bucket.items.unshift(payload)
      })
      .addCase(fetchGlobalTemplates.pending, (state) => {
        state.globalTemplates.loading = true
        state.globalTemplates.error = undefined
      })
      .addCase(fetchGlobalTemplates.fulfilled, (state, action) => {
        state.globalTemplates.loading = false
        state.globalTemplates.data = action.payload
      })
      .addCase(fetchGlobalTemplates.rejected, (state, action) => {
        state.globalTemplates.loading = false
        state.globalTemplates.error = action.payload as string | undefined
      })
      .addCase(fetchMyTemplates.pending, (state) => {
        state.myTemplates.loading = true
        state.myTemplates.error = undefined
      })
      .addCase(fetchMyTemplates.fulfilled, (state, action) => {
        state.myTemplates.loading = false
        state.myTemplates.data = action.payload
      })
      .addCase(fetchMyTemplates.rejected, (state, action) => {
        state.myTemplates.loading = false
        state.myTemplates.error = action.payload as string | undefined
      })
  },
})

function upsertAndReindex(state: typeof initialState, action: PayloadAction<Activity>) {
  const a = action.payload
  const prev = state.entities[String(a.id)]
  adapter.upsertOne(state, a)
  reindexMembership(state, prev ?? null, a)
  state.loadingById[String(a.id)] = false
  state.errorById[String(a.id)] = undefined
}

/** Ensure the activity lives in the right project|status list. */
function reindexMembership(state: typeof initialState, prev: Activity | null, curr: Activity) {
  const id = String(curr.id)
  const nextKey = listKey(curr.project_id, curr.status)

  // Remove from ALL lists to avoid duplication (safe & simple).
  for (const key of Object.keys(state.lists)) {
    const l = state.lists[key]
    if (l) l.ids = l.ids.filter((x) => x !== id)
  }

  // Add to the correct list if it exists (or create a minimal one so UIs can show it immediately).
  const l = ensureList(state, nextKey)
  pushUnique(l.ids, id, true)
}

export const { resetList, addTaskOptimistic, replaceOptimisticTask, removeOptimisticTask } = slice.actions
export default slice.reducer

/* ───────────── selectors ───────────── */
const selectors = adapter.getSelectors<RootState>((s) => s.campaign)

export const selectActivityById = (state: RootState, id: number | string) => selectors.selectById(state, String(id))

export const selectActivitiesByProjectStatus = (state: RootState, projectId: number | string, status: StatusKey) => {
  const key = listKey(projectId, status)
  const ids = state.campaign.lists[key]?.ids || []
  return ids.map((id) => selectors.selectById(state, id)).filter(Boolean) as Activity[]
}

export const selectListMeta = (state: RootState, projectId: number | string, status: StatusKey) =>
  state.campaign.lists[listKey(projectId, status)] || { ids: [], next: null, count: 0, loading: false }

export const selectLoadingById = (state: RootState, id: number | string) => !!state.campaign.loadingById[String(id)]
export const selectCampaignOverview = (s: RootState) => s.campaign.overview.data
export const selectCampaignOverviewLoading = (s: RootState) => s.campaign.overview.loading
export const selectCampaignOverviewError = (s: RootState) => s.campaign.overview.error

export const selectTemplates = (s: RootState) => s.campaign.globalTemplates.data
export const selectTemplatesLoading = (s: RootState) => s.campaign.globalTemplates.loading
export const selectTemplatesError = (s: RootState) => s.campaign.globalTemplates.error

export const selectMyTemplates = (s: RootState) => s.campaign.myTemplates.data
export const selectMyTemplatesLoading = (s: RootState) => s.campaign.myTemplates.loading
export const selectMyTemplatesError = (s: RootState) => s.campaign.myTemplates.error

