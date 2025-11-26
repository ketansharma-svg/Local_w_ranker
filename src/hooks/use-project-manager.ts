"use client"

import { useEffect, useCallback, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import Cookies from "js-cookie"
import type { RootState, AppDispatch } from "../redux/store"
import {
  setSelectedProject,
  setSelectedButtonId,
  fetchProjects,
  deleteProject,
} from "../redux/reducer/projectReducer"

interface Project {
  id: string
  name: string
  domain?: string
  url?: string
  project_id?: string | number
  is_shared?: boolean
  share_id?: string
  shared_access_type?: string
  shared_by?: string
  manager_name?: string
  manager_email?: string
  shared_meta?: unknown
  [key: string]: unknown
}

const projectKeysToCompare = [
  "id",
  "domain",
  "url",
  "is_shared",
  "share_id",
  "shared_access_type",
  "shared_by",
  "manager_name",
  "manager_email",
] as const

const projectsEquivalent = (a?: Project | null, b?: Project | null) => {
  if (!a || !b) return false
  return projectKeysToCompare.every((key) => {
    const aValue = a[key]
    const bValue = b[key]
    if (aValue === bValue) return true
    if (typeof aValue === "number" || typeof bValue === "number") {
      return Number(aValue ?? NaN) === Number(bValue ?? NaN)
    }
    return String(aValue ?? "") === String(bValue ?? "")
  })
}

const SHARED_QUERY_PARAM = "sharedproject"

let fetchBootstrapInFlight = false

export const useProjectManager = () => {
  const dispatch = useDispatch<AppDispatch>()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const { activeSection } = useSelector((state: RootState) => state.sidebar)
  const {
    projects,
    sharedProjects,
    selectedProject,
    selectedButtonId,
    loading,
    fetched,
  } = useSelector((state: RootState) => state.projectReducer)

  const ownProjects = projects ?? []
  const sharedProjectsRaw = sharedProjects ?? []

  const normalizedSharedProjects = useMemo<Project[]>(() => {
    return sharedProjectsRaw.map((entry: any) => {
      const nestedProject = entry?.project ?? {}
      const base = { ...nestedProject }
      const idCandidate = entry?.id

      const domain =
        nestedProject?.domain ?? entry?.domain ?? nestedProject?.url ?? ""
      const urlValue =
        nestedProject?.url ?? entry?.url ?? nestedProject?.domain ?? ""

      const dashboardAccess =
        entry?.dashboards?.find((dashboard: any) => dashboard?.active)?.access ??
        entry?.dashboards?.[0]?.access

      const accessType =
        entry?.access_type ?? entry?.shared_access_type ?? dashboardAccess

      return {
        ...base,
        id: String(idCandidate),
        name:
          base?.name ??
          entry?.project_name ??
          base?.domain ??
          base?.url ??
          "",
        domain,
        url: urlValue,
        project_id: idCandidate,
        is_shared: true,
        share_id: entry?.id ? String(entry.id) : idCandidate ? String(idCandidate) : undefined,
        shared_access_type: accessType ? String(accessType).trim() : undefined,
        shared_by:
          entry?.shared_by ?? entry?.manager_email ?? entry?.manager_name,
        manager_name: entry?.manager_name,
        manager_email: entry?.manager_email,
        shared_meta: entry,
      }
    })
  }, [sharedProjectsRaw])

  const updateUrlWithProject = useCallback(
    (project: Project) => {
      const currentDomain = searchParams.get("domain") ?? ""
      const domain = project?.domain || project?.url || ""
      const currentShared = searchParams.get(SHARED_QUERY_PARAM) === "true"
      const nextShared = Boolean(project?.is_shared)

      const domainChanged = domain !== currentDomain
      const sharedFlagChanged = currentShared !== nextShared

      if (!domainChanged && !sharedFlagChanged) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())

      if (domain) {
        params.set("domain", domain)
      } else {
        params.delete("domain")
      }

      if (nextShared) {
        params.set(SHARED_QUERY_PARAM, "true")
      } else {
        params.delete(SHARED_QUERY_PARAM)
      }

      const queryString = params.toString()
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname
      router.push(nextUrl)
    },
    [pathname, router, searchParams],
  )

  const selectProject = useCallback(
    (project: Project) => {
      const projectId = String(project.id)
      dispatch(setSelectedProject(project))
      dispatch(setSelectedButtonId(projectId))

      if (typeof window !== "undefined") {
        localStorage.setItem("selectedProjectId", projectId)
        if (project.is_shared) {
          localStorage.setItem("selectedProjectIsShared", "1")
        } else {
          localStorage.removeItem("selectedProjectIsShared")
        }
      }

      updateUrlWithProject(project)
    },
    [dispatch, updateUrlWithProject],
  )

  const deleteProjectById = useCallback(
    async (projectId: string) => {
      try {
        await dispatch(deleteProject({ projectId })).unwrap()
        dispatch(fetchProjects())
      } catch (error) {
        console.error("Failed to delete project:", error)
      }
    },
    [dispatch],
  )

  useEffect(() => {
    if (loading || fetched || fetchBootstrapInFlight) return
    const token = Cookies.get("login_access_token_wrank")
    if (!token) return
    fetchBootstrapInFlight = true
    void dispatch(fetchProjects()).finally(() => {
      fetchBootstrapInFlight = false
    })
  }, [dispatch, loading, fetched])

  useEffect(() => {
    if (loading) return

    const domainFromUrl = searchParams.get("domain")
    const sharedFromUrl = searchParams.get(SHARED_QUERY_PARAM) === "true"
    const savedProjectId =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedProjectId")
        : null
    const isSavedShared =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedProjectIsShared") === "1"
        : false

    const findProjectById = (
      id: string | null,
      isShared: boolean,
    ): Project | undefined => {
      if (!id) return undefined
      if (isShared) {
        return normalizedSharedProjects.find((p) => String(p.id) === String(id))
      }
      return ownProjects.find((p: Project) => String(p.id) === String(id))
    }

    const findProjectByDomain = (
      domain: string | null,
      preferShared = false,
    ): Project | undefined => {
      if (!domain) return undefined
      const lower = domain.toLowerCase()

      const matches = (p: Project) => {
        const projectDomain = String(p.domain || "").toLowerCase()
        const projectUrl = String(p.url || "").toLowerCase()
        return projectDomain === lower || projectUrl === lower
      }

      const matchShared = normalizedSharedProjects.find(matches)
      const matchOwn = ownProjects.find(matches)

      if (preferShared) {
        return matchShared ?? matchOwn
      }

      return matchOwn ?? matchShared
    }

    if (selectedProject) {
      const source = selectedProject.is_shared
        ? normalizedSharedProjects
        : ownProjects
      const updated = source.find(
        (p: Project) => String(p.id) === String(selectedProject.id),
      )

      if (updated) {
        if (!projectsEquivalent(updated, selectedProject)) {
          dispatch(setSelectedProject(updated))
          return
        }
      } else {
        dispatch(setSelectedProject(null))
        dispatch(setSelectedButtonId(null))
        if (typeof window !== "undefined") {
          localStorage.removeItem("selectedProjectId")
          localStorage.removeItem("selectedProjectIsShared")
        }
      }
    }

    if (domainFromUrl) {
      const matchedProject = findProjectByDomain(domainFromUrl, sharedFromUrl)
      if (
        matchedProject &&
        (!selectedProject ||
          String(selectedProject.id) !== String(matchedProject.id))
      ) {
        selectProject(matchedProject)
        return
      }
    }

    if (!selectedProject) {
      const saved = findProjectById(savedProjectId, isSavedShared)
      if (saved) {
        selectProject(saved)
        return
      }

      if (ownProjects.length > 0) {
        selectProject(ownProjects[0])
        return
      }

      if (normalizedSharedProjects.length > 0) {
        selectProject(normalizedSharedProjects[0])
        return
      }
    } else if (
      !domainFromUrl &&
      !pathname.startsWith("/campaign-activity") &&
      activeSection === "SEO"
    ) {
      updateUrlWithProject(selectedProject)
    }
  }, [
    ownProjects,
    normalizedSharedProjects,
    loading,
    searchParams,
    selectedProject,
    selectProject,
    updateUrlWithProject,
    pathname,
    activeSection,
    dispatch,
  ])

  const getFilteredProjects = useCallback(
    (showMyProjects = true, showSharedProjects = false) => {
      const result: Project[] = []
      if (showMyProjects) {
        result.push(...ownProjects)
      }
      if (showSharedProjects) {
        result.push(...normalizedSharedProjects)
      }
      return result
    },
    [ownProjects, normalizedSharedProjects],
  )

  return {
    projects: ownProjects,
    sharedProjects: normalizedSharedProjects,
    selectedProject,
    selectedButtonId,
    loading,
    selectProject,
    getFilteredProjects,
    deleteProject: deleteProjectById,
    refreshProjects: () => dispatch(fetchProjects()),
  }
}
