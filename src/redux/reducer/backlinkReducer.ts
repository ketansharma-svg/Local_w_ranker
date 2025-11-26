// redux/reducer/backlinkReducer.ts
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import axios, { type AxiosError } from "axios"
import Cookies from "js-cookie"
import { BASE_URL_WR } from "@/src/util/api"
import { toast } from "sonner"

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface Backlink {
  id: number
  created_at: string
  updated_at: string
  anchor_text: string
  anchor_link: string
  rel_attribute: string
  status_code: string
  page_from_title: string | null
  first_seen: string
  prev_seen: string | null
  last_seen: string
  is_new: boolean
  is_lost: boolean
  url_to_https: boolean
  url_to_status_code: number
  url_to_redirect_target: string | null
  alt: string | null
  image_url: string | null
  item_type: string
  is_broken: boolean
  source_type: string
  referal_url: number
}

interface BacklinkData {
  id: number
  backlinks: Backlink[]
  created_at: string
  updated_at: string
  referal_url: string
  status_code: string
  is_follow: boolean
  is_index: boolean
  status: string
  is_found: boolean
  last_checked: string
  response_json: {
    links: Array<{
      link_text: string
      link_found: string
      follow_type: string
      link_status_code: number
    }>
    post_url: string
    status_code: number
  }
  remark: string | null
  created_by: string | null
  refer_from: number
  refer_to: number
}

interface BacklinkResponse {
  count: number
  next: string | null
  previous: string | null
  results: {
    data: BacklinkData[]
    total: number
    dofollow: number
    nofollow: number
    limit: number
    target_domain: string
  }
  user: {
    id: number
    username: string
    email: string
  }
}

interface AddBacklinkPayload {
  post_urls: string[]
  domain: string
}

interface BacklinkState {
  backlinks: BacklinkData[]
  loading: boolean
  error: string | null
  stats: {
    total: number
    dofollow: number
    nofollow: number
    target_domain: string
  }
  user: {
    id: number
    username: string
    email: string
  } | null
  lastUpdated: string | null
}

// ─────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────

const initialState: BacklinkState = {
  backlinks: [],
  loading: false,
  error: null,
  stats: {
    total: 0,
    dofollow: 0,
    nofollow: 0,
    target_domain: "",
  },
  user: null,
  lastUpdated: null,
}

// ─────────────────────────────────────────
// Async Thunks
// ─────────────────────────────────────────

export const fetchBacklinks = createAsyncThunk<BacklinkResponse, { domain: string }, { rejectValue: unknown }>(
  "backlink/fetchBacklinks",
  async ({ domain }, { rejectWithValue }) => {
    try {
      const token = Cookies.get("login_access_token_wrank")
      const response = await axios.get(`${BASE_URL_WR}check-links/?domain=${encodeURIComponent(domain)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (err) {
      const error = err as AxiosError
      return rejectWithValue(error.response?.data || error.message)
    }
  },
)

export const addBacklinks = createAsyncThunk<BacklinkResponse, AddBacklinkPayload, { rejectValue: unknown }>(
  "backlink/addBacklinks",
  async ({ post_urls, domain }, { rejectWithValue }) => {
    try {
      const token = Cookies.get("login_access_token_wrank")
      const response = await axios.post(
        `${BASE_URL_WR}check-links/`,
        { post_urls, domain },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      toast.success(`Added ${post_urls.length} backlinks for monitoring`)
      return response.data
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>
      toast.error(error.response?.data?.error || "Failed to add backlinks")
      return rejectWithValue(error.response?.data || error.message)
    }
  },
)

export const refreshBacklinks = createAsyncThunk<BacklinkResponse, { domain: string }, { rejectValue: unknown }>(
  "backlink/refreshBacklinks",
  async ({ domain }, { rejectWithValue }) => {
    try {
      const token = Cookies.get("login_access_token_wrank")
      const response = await axios.get(`${BASE_URL_WR}check-links/?domain=${encodeURIComponent(domain)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Backlinks refreshed successfully")
      return response.data
    } catch (err) {
      const error = err as AxiosError
      toast.error("Failed to refresh backlinks")
      return rejectWithValue(error.response?.data || error.message)
    }
  },
)

// ─────────────────────────────────────────
// Slice
// ─────────────────────────────────────────

export const backlinkReducer = createSlice({
  name: "backlinkReducer",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setTargetDomain: (state, action: PayloadAction<string>) => {
      state.stats.target_domain = action.payload
    },
    updateBacklinkStatus: (state, action: PayloadAction<{ id: number; status: string }>) => {
      const backlink = state.backlinks.find((b) => b.id === action.payload.id)
      if (backlink) {
        backlink.status = action.payload.status
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch backlinks
      .addCase(fetchBacklinks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBacklinks.fulfilled, (state, action) => {
        state.loading = false
        state.backlinks = action.payload.results.data
        state.stats = {
          total: action.payload.results.total,
          dofollow: action.payload.results.dofollow,
          nofollow: action.payload.results.nofollow,
          target_domain: action.payload.results.target_domain,
        }
        state.user = action.payload.user
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchBacklinks.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || "Failed to fetch backlinks"
      })

      // Add backlinks
      .addCase(addBacklinks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(addBacklinks.fulfilled, (state, action) => {
        state.loading = false
        // Merge new backlinks with existing ones
        const existingIds = new Set(state.backlinks.map((b) => b.id))
        const newBacklinks = action.payload.results.data.filter((b) => !existingIds.has(b.id))
        state.backlinks = [...state.backlinks, ...newBacklinks]

        // Update stats
        state.stats = {
          total: action.payload.results.total,
          dofollow: action.payload.results.dofollow,
          nofollow: action.payload.results.nofollow,
          target_domain: action.payload.results.target_domain,
        }
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(addBacklinks.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || "Failed to add backlinks"
      })

      // Refresh backlinks
      .addCase(refreshBacklinks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(refreshBacklinks.fulfilled, (state, action) => {
        state.loading = false
        state.backlinks = action.payload.results.data
        state.stats = {
          total: action.payload.results.total,
          dofollow: action.payload.results.dofollow,
          nofollow: action.payload.results.nofollow,
          target_domain: action.payload.results.target_domain,
        }
        state.user = action.payload.user
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(refreshBacklinks.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || "Failed to refresh backlinks"
      })
  },
})

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

export const { clearError, setTargetDomain, updateBacklinkStatus } = backlinkReducer.actions

export default backlinkReducer.reducer

// Selectors
export const selectBacklinks = (state: any) => state.backlinkReducer.backlinks
export const selectBacklinkLoading = (state: any) => state.backlinkReducer.loading
export const selectBacklinkError = (state: any) => state.backlinkReducer.error
export const selectBacklinkStats = (state: any) => state.backlinkReducer.stats
export const selectBacklinkUser = (state: any) => state.backlinkReducer.user
export const selectLastUpdated = (state: any) => state.backlinkReducer.lastUpdated
