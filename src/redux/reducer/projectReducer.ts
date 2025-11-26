// redux/reducer/projectReducer.ts
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import axios, { type AxiosError } from "axios"
import Cookies from "js-cookie"
import { BASE_URL_WR } from "@/src/util/api"
import { toast } from "sonner"
import type { NextRouter } from "next/router"

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface Project {
  id: string
  name: string
  [key: string]: unknown
}
interface SharProject {
  id: number
  status: boolean
  language: string
  location: string
  site_id: number
  analytics_id: string | null
  ga_email: string | null
  gsc_url: string | null
  gsc_email: string | null
  domain: string
  url: string
  location_code: number
}

interface ProjectPayload {
  name: string
  url: string
  language?: string
  location?: string[]
  location_code?: number
  competitors?: string[]
  keywords?: string[]
  [key: string]: unknown
}

interface CreatePayload {
  postData: ProjectPayload
  router: NextRouter
}

interface UpdatePayload {
  projectId: string
  postData: ProjectPayload
}

interface SharedProject {
  id: number
  project: SharProject
  shared_to: string
  access_type: "view" | "edit" // union of possible values
  shared_by: string
  created_at: string // ISO timestamp
}

interface ProjectState {
  projects: Project[]
  sharedProjects: SharedProject[]
  shared_by_user: Project[]
  shared_projects: []
  count: 0
  isModalVisible: boolean
  loading: boolean
  fetched: boolean
  selectedProject: Project | null
  createdId: string
  selectedButtonId: string | null
  // lastProject: Project
}

type FetchedPayload =
  | Project[]
  | {
      projects: Project[]
      shared_projects?: Project[]
      shared_by_user?: Project[]
    }

// ─────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────

// near top where initialState is declared
const createInitialState = (): ProjectState => ({
  projects: [],
  sharedProjects: [],
  shared_by_user: [],
  shared_projects: [],
  count: 0,
  isModalVisible: false,
  loading: false,
  fetched: false,
  selectedProject: null,
  createdId: "",
  selectedButtonId: null,
  // lastProject: {} as Project,
})

const initialState: ProjectState = createInitialState()

// ─────────────────────────────────────────
// Async Thunks
// ─────────────────────────────────────────

export const fetchProjects = createAsyncThunk<FetchedPayload, void, { rejectValue: unknown }>(
  "project/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const token = Cookies.get("login_access_token_wrank")
      const response = await axios.get(`${BASE_URL_WR}my-project/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return response.data
    } catch (err) {
      const error = err as AxiosError
      return rejectWithValue(error.response?.data || error.message)
    }
  },
)

export const createProject = createAsyncThunk<{ project_id: string }, CreatePayload, { rejectValue: unknown }>(
  "project/createProject",
  async ({ postData, router }, { rejectWithValue }) => {
    try {
      const token = Cookies.get("login_access_token_wrank")
      const response = await axios.post(`${BASE_URL_WR}my-project/`, postData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Project Created")
      router.push("/main-dashboard")
      return response.data
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>
      toast.error(error.response?.data?.error || "An error occurred.")
      return rejectWithValue(error.response?.data || error.message)
    }
  },
)

export const updateProject = createAsyncThunk<unknown, UpdatePayload, { rejectValue: unknown }>(
  "project/updateProject",
  async ({ projectId, postData }, { rejectWithValue }) => {
    try {
      const token = Cookies.get("login_access_token_wrank")
      const response = await axios.put(`${BASE_URL_WR}my-project/edit/${projectId}/`, postData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Project Updated")
      return response.data
    } catch (err) {
      const error = err as AxiosError<{ project_url?: string }>
      toast.error(error.response?.data?.project_url || "An error occurred.")
      return rejectWithValue(error.response?.data || error.message)
    }
  },
)

export const deleteProject = createAsyncThunk<
  { deleted_project_id: string },
  { projectId: string },
  { rejectValue: unknown }
>("project/deleteProject", async ({ projectId }, { rejectWithValue }) => {
  try {
    const token = Cookies.get("login_access_token_wrank")
    const payload = { status: false }

    const response = await axios.patch(`${BASE_URL_WR}my-project/delete/${projectId}/`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    })

    toast.success("Project Deleted Successfully")
    return { deleted_project_id: projectId }
  } catch (err) {
    const error = err as AxiosError<{ error?: string }>
    toast.error(error.response?.data?.error || "Failed to delete project.")
    return rejectWithValue(error.response?.data || error.message)
  }
})

// ─────────────────────────────────────────
// Slice
// ─────────────────────────────────────────

export const projectReducer = createSlice({
  name: "projectReducer",
  initialState,
  reducers: {
    showModal: (state) => {
      state.isModalVisible = true
    },
    hideModal: (state) => {
      state.isModalVisible = false
    },
    setSelectedProject: (state, action: PayloadAction<Project | null>) => {
      state.selectedProject = action.payload
    },
    setSelectedButtonId: (state, action: PayloadAction<string | null>) => {
      state.selectedButtonId = action.payload
    },
    removeProjectOptimistically: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter((project) => project.id !== action.payload)
      // If deleted project was selected, clear selection
      if (state.selectedProject?.id === action.payload) {
        state.selectedProject = null
        state.selectedButtonId = null
        localStorage.removeItem("selectedProjectId")
      }
    },
    resetProjectState: () => createInitialState(),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true
        state.fetched = false
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        const data = action.payload

        if (Array.isArray(data)) {
          state.projects = data
          state.sharedProjects = []
          state.shared_by_user = []
        } else {
          state.projects = data.projects || []
          state.sharedProjects =
            Array.isArray(data.shared_projects) &&
            data.shared_projects.length > 0 
              ? (data.shared_projects as any)
              : []
          state.shared_by_user = data.shared_by_user || []
        }

        // if (state.projects.length > 0) {
        //   state.lastProject = state.projects[state.projects.length - 1]
        // }

        state.loading = false
        state.isModalVisible = false
        state.fetched = true
      })
      .addCase(fetchProjects.rejected, (state) => {
        state.loading = false
        state.fetched = false
      })
      .addCase(createProject.fulfilled, (state, action) => {
        const projectId = action.payload.project_id
        state.createdId = projectId
        localStorage.setItem("selectedProjectId", projectId)
        state.selectedButtonId = projectId
        state.selectedProject = state.selectedProject
        state.isModalVisible = false
      })
      .addCase(deleteProject.pending, (state) => {
        state.loading = true
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        const deletedId = action.payload.deleted_project_id
        state.projects = state.projects.filter((project) => project.id !== deletedId)

        // If deleted project was selected, clear selection and select first available
        if (state.selectedProject?.id === deletedId) {
          state.selectedProject = null
          state.selectedButtonId = null
          localStorage.removeItem("selectedProjectId")

          // Auto-select first project if available
          if (state.projects.length > 0) {
            const firstProject = state.projects[0]
            state.selectedProject = firstProject
            state.selectedButtonId = firstProject.id
            localStorage.setItem("selectedProjectId", firstProject.id)
          }
        }

        state.loading = false
      })
      .addCase(deleteProject.rejected, (state) => {
        state.loading = false
      })
  },
})

// ─────────────────────────────────────────
// Exports
// ─────────────────────────────────────────

export const {
  showModal,
  hideModal,
  setSelectedProject,
  setSelectedButtonId,
  removeProjectOptimistically,
  resetProjectState,
} = projectReducer.actions

export default projectReducer.reducer
