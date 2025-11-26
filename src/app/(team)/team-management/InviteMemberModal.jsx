"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Modal, Button, Input, Select, Switch, Spin, Checkbox, Tag, Tooltip } from "antd"
import { UserAddOutlined, CheckOutlined } from "@ant-design/icons"
import { useProfile } from "@/src/redux/providers/ProfileProvider"
import { toast } from "sonner"
import { useDispatch } from "react-redux"
import { sendInvites } from "@/src/redux/reducer/teamReducer"
import { useProjectContext } from "@/src/redux/providers/ProjectContext"

const { TextArea } = Input

const DASHBOARD_LIBRARY = [
  { key: "seo", label: "SEO" },
  { key: "reporting", label: "Reporting" },
  { key: "content", label: "Content" },
  { key: "taskboard", label: "Taskboard" },
]
const DEFAULT_ENABLED_DASHBOARDS = new Set(["seo", "reporting"])
const ADMIN_ACCESS_ROLES = new Set(["admin", "owner"])
const ROLE_OPTIONS = ["admin", "editor", "viewer"]

const canonicalDashKey = (value = "") => {
  const normalized = value.toLowerCase()
  if (normalized.startsWith("repo")) return "reporting"
  if (normalized.startsWith("cont")) return "content"
  if (normalized.startsWith("task")) return "taskboard"
  return "seo"
}

const labelForDashboard = (key) => DASHBOARD_LIBRARY.find((entry) => entry.key === key)?.label ?? key.toUpperCase()

const buildDefaultAccessState = () =>
  DASHBOARD_LIBRARY.map((entry) => ({
    dashboard: entry.key,
    label: entry.label,
    enabled: DEFAULT_ENABLED_DASHBOARDS.has(entry.key),
    role: "viewer",
  }))

const getProjectDisplayName = (project = {}) =>
  project?.name || project?.domain || project?.url || project?.gsc_url || `Project ${project?.id ?? ""}`

const buildFaviconUrl = (input = "") =>
  `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(input || "wranker.com")}`

const formatList = (items = []) => {
  if (!items.length) return ""
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}

const normalizeOwnedProjects = (projects = []) =>
  projects.map((project) => {
    const id = project?.id ?? project?.project_id ?? project?.projectId
    return {
      key: `own-${id}`,
      projectId: id,
      id,
      name: getProjectDisplayName(project),
      domain: project?.domain ?? project?.url ?? project?.gsc_url ?? "",
      url: project?.url ?? "",
      location: project?.location ?? "",
      language: project?.language ?? "",
      status: project?.status,
      source: "own",
      raw: project,
      canDelegate: true,
      allowedDashboards: new Set(DASHBOARD_LIBRARY.map((entry) => entry.key)),
      adminDashboardLabels: DASHBOARD_LIBRARY.map((entry) => entry.label),
    }
  })

const normalizeSharedProjects = (entries = []) =>
  entries.map((entry) => {
    const nestedProject = entry?.project || {}
    const projectId = nestedProject?.id ?? entry?.project_id ?? entry?.site_id ?? entry?.id
    const shareIdentifier = entry?.id ?? `shared-${projectId}`
    const dashboardsRaw = Array.isArray(entry?.dashboards)
      ? entry.dashboards
      : Array.isArray(nestedProject?.dashboards)
      ? nestedProject.dashboards
      : []
    const dashboards = dashboardsRaw.map((dashboard) => {
      const key = canonicalDashKey(dashboard?.type || dashboard?.name || "")
      const label = labelForDashboard(key)
      const access = String(dashboard?.access || dashboard?.role || "").toLowerCase()
      return { key, label, access, raw: dashboard }
    })
    const adminDashboards = dashboards.filter((item) => ADMIN_ACCESS_ROLES.has(item.access))
    const allowedSet = new Set(adminDashboards.map((item) => item.key))
    const managerName = entry?.manager_name ?? entry?.manager ?? entry?.managerName ?? entry?.shared_by ?? ""
    const managerEmail = entry?.manager_email ?? entry?.managerEmail ?? entry?.shared_by ?? ""
    const disableReason = allowedSet.size
      ? ""
      : "You need Admin access to at least one dashboard in this shared project to send invites."
    return {
      key: `shared-${shareIdentifier}`,
      projectId,
      id: projectId,
      name: entry?.name || getProjectDisplayName(nestedProject) || `Project ${projectId}`,
      domain: nestedProject?.domain ?? entry?.domain ?? nestedProject?.url ?? "",
      url: nestedProject?.url ?? entry?.url ?? "",
      location: nestedProject?.location ?? entry?.location ?? "",
      language: nestedProject?.language ?? entry?.language ?? "",
      source: "shared",
      raw: entry,
      dashboards,
      allowedDashboards: allowedSet,
      adminDashboardLabels: adminDashboards.map((item) => item.label),
      canDelegate: allowedSet.size > 0,
      disableReason,
      managerName,
      managerEmail,
    }
  })

const resolveProjectId = (project) =>
  project?.id

const formatRoleLabel = (role = "") => role.charAt(0).toUpperCase() + role.slice(1)

const isValidEmail = (email = "") => {
  const re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
  return re.test(String(email).trim())
}

const parseEmails = (input = "") =>
  input
    .split(/[\s,;,]+/)
    .map((part) => part.trim())
    .filter(Boolean)

export default function InviteMemberModal({ open, onClose, preselectProjectId = null, onResult }) {
  const dispatch = useDispatch()
  const { profile } = useProfile()
  const {
    projects: ctxProjects = [],
    sharedProjects: ctxSharedProjects = [],
    fetchProjects: ctxFetchProjects,
    loading: ctxLoading,
  } = useProjectContext()

  const [loading, setLoading] = useState(false)
  const [projectsBootstrapping, setProjectsBootstrapping] = useState(false)
  const [selectedProjectKeys, setSelectedProjectKeys] = useState([])
  const [emailInput, setEmailInput] = useState("")
  const [chips, setChips] = useState([])
  const [access, setAccess] = useState(buildDefaultAccessState)
  const [applySameToAll, setApplySameToAll] = useState(false)
  const [welcomeNote, setWelcomeNote] = useState("")
  const [projectSearch, setProjectSearch] = useState("")
  const inputRef = useRef(null)
  const appliedPreselectRef = useRef(null)

  useEffect(() => {
    if (!open) return
    let mounted = true
    const ensureProjects = async () => {
      const haveProjects = (ctxProjects?.length || 0) + (ctxSharedProjects?.length || 0) > 0
      if (!haveProjects && typeof ctxFetchProjects === "function") {
        setProjectsBootstrapping(true)
        try {
          await ctxFetchProjects()
        } catch (error) {
          console.error("Failed to load projects:", error)
        } finally {
          if (mounted) {
            setProjectsBootstrapping(false)
          }
        }
      }
      setTimeout(() => inputRef.current?.focus?.(), 160)
    }
    ensureProjects()
    return () => {
      mounted = false
    }
  }, [open, ctxProjects, ctxSharedProjects, ctxFetchProjects])

  const normalizedMyProjects = useMemo(() => normalizeOwnedProjects(ctxProjects), [ctxProjects])
  const normalizedSharedProjects = useMemo(
    () => normalizeSharedProjects(ctxSharedProjects),
    [ctxSharedProjects],
  )
  const combinedProjects = useMemo(
    () => [...normalizedMyProjects, ...normalizedSharedProjects],
    [normalizedMyProjects, normalizedSharedProjects],
  )
  const normalizedSearchTerm = projectSearch.trim().toLowerCase()
  const filteredMyProjects = useMemo(() => {
    if (!normalizedSearchTerm) return normalizedMyProjects
    return normalizedMyProjects.filter((project) => {
      const haystack = [project.name, project.domain, project.url].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(normalizedSearchTerm)
    })
  }, [normalizedMyProjects, normalizedSearchTerm])
  const filteredSharedProjects = useMemo(() => {
    if (!normalizedSearchTerm) return normalizedSharedProjects
    return normalizedSharedProjects.filter((project) => {
      const haystack = [project.name, project.domain, project.url].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(normalizedSearchTerm)
    })
  }, [normalizedSharedProjects, normalizedSearchTerm])
  const projectByKey = useMemo(() => {
    const map = new Map()
    combinedProjects.forEach((project) => map.set(project.key, project))
    return map
  }, [combinedProjects])
  const selectedProjectKeySet = useMemo(() => new Set(selectedProjectKeys), [selectedProjectKeys])
  const selectedSharedProjects = useMemo(
    () =>
      selectedProjectKeys
        .map((key) => projectByKey.get(key))
        .filter((project) => project && project.source === "shared"),
    [selectedProjectKeys, projectByKey],
  )
const hasSharedProjectSelected = selectedSharedProjects.length > 0

  useEffect(() => {
    const validKeys = new Set(combinedProjects.map((project) => project.key))
    setSelectedProjectKeys((prev) => {
      const filtered = prev.filter((key) => validKeys.has(key))
      return filtered.length === prev.length ? prev : filtered
    })
  }, [combinedProjects])

  useEffect(() => {
    if (!open || preselectProjectId == null) return
    const normalizedId = String(preselectProjectId)
    if (appliedPreselectRef.current === normalizedId) return
    const target = combinedProjects.find(
      (project) => String(project.projectId ?? project.id) === normalizedId,
    )
    if (target) {
      setSelectedProjectKeys([target.key])
      appliedPreselectRef.current = normalizedId
    }
  }, [open, preselectProjectId, combinedProjects])

  useEffect(() => {
    if (!open) {
      appliedPreselectRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!applySameToAll) return
    setAccess((prev) => {
      const firstEnabled = prev.find((entry) => entry.enabled)
      if (!firstEnabled) return prev
      const targetRole = firstEnabled.role
      let changed = false
      const next = prev.map((entry) => {
        if (!entry.enabled || entry.role === targetRole) return entry
        changed = true
        return { ...entry, role: targetRole }
      })
      return changed ? next : prev
    })
  }, [applySameToAll])

  const sharedAllowedSet = useMemo(() => {
    if (!selectedSharedProjects.length) return null
    const [first, ...rest] = selectedSharedProjects
    let allowed = new Set(first.allowedDashboards)
    rest.forEach((project) => {
      allowed = new Set([...allowed].filter((key) => project.allowedDashboards.has(key)))
    })
    return allowed
  }, [selectedSharedProjects])

  const dashboardsDisabledByShared = useMemo(() => {
    if (!selectedSharedProjects.length) return new Set()
    const allowed = sharedAllowedSet ?? new Set()
    const blockedKeys = DASHBOARD_LIBRARY.map((entry) => entry.key).filter((key) => !allowed.has(key))
    return new Set(blockedKeys)
  }, [selectedSharedProjects, sharedAllowedSet])

  useEffect(() => {
    if (!selectedSharedProjects.length || dashboardsDisabledByShared.size === 0) return
    setAccess((prev) => {
      let updated = false
      const next = prev.map((entry) => {
        if (!dashboardsDisabledByShared.has(entry.dashboard) || !entry.enabled) return entry
        updated = true
        return { ...entry, enabled: false }
      })
      return updated ? next : prev
    })
  }, [dashboardsDisabledByShared, selectedSharedProjects])

  const addEmailsFromInput = () => {
    const parsed = parseEmails(emailInput)
    if (!parsed.length) return
    setChips((prev) => {
      const existing = new Set(prev.map((chip) => chip.value.toLowerCase()))
      const incoming = parsed
        .map((value) => ({ value, status: isValidEmail(value) ? "valid" : "invalid" }))
        .filter((chip) => !existing.has(chip.value.toLowerCase()))
      return [...prev, ...incoming]
    })
    setEmailInput("")
  }

  const removeChip = (value) => setChips((prev) => prev.filter((chip) => chip.value !== value))

  const availableDashboards = useMemo(
    () => access.filter((entry) => entry.enabled && !dashboardsDisabledByShared.has(entry.dashboard)),
    [access, dashboardsDisabledByShared],
  )

  const hasValidEmails = useMemo(() => chips.some((chip) => chip.status === "valid"), [chips])
  const hasProject = selectedProjectKeys.length > 0
  const hasAccess = availableDashboards.length > 0
  const projectsLoading = ctxLoading
  const canSubmit = hasValidEmails && hasProject && hasAccess && !loading

  const onChangeRole = (dashboardKey, newRole) => {
    if (applySameToAll) {
      setAccess((prev) => prev.map((entry) => (entry.enabled ? { ...entry, role: newRole } : entry)))
      return
    }
    setAccess((prev) =>
      prev.map((entry) => (entry.dashboard === dashboardKey ? { ...entry, role: newRole } : entry)),
    )
  }

  const toggleDashboardEnabled = (dashboardKey, enabled) => {
    if (dashboardsDisabledByShared.has(dashboardKey)) return
    setAccess((prev) =>
      prev.map((entry) => (entry.dashboard === dashboardKey ? { ...entry, enabled } : entry)),
    )
  }

  const toggleProjectSelection = (projectKey, disabled) => {
    if (disabled) return
    setSelectedProjectKeys((prev) =>
      prev.includes(projectKey) ? prev.filter((key) => key !== projectKey) : [...prev, projectKey],
    )
  }

  const submit = async () => {
    setLoading(true)
    const invalidEmails = chips.filter((chip) => chip.status === "invalid").map((chip) => chip.value)
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email(s): ${invalidEmails.join(", ")}`)
      setLoading(false)
      return
    }

    const selectedProjectsForPayload = selectedProjectKeys
      .map((key) => projectByKey.get(key))
      .filter(Boolean)
    const requestedDashboards = availableDashboards.map((entry) => ({
      type: entry.label,
      access: (entry.role),
    }))

    const payload = {
      members: chips
        .filter((chip) => chip.status === "valid")
        .map((chip) => ({
          email: chip.value,
          requested_access: selectedProjectsForPayload.map((project) => {
            return{
              project_id: project?.raw.id,
              dashboards: requestedDashboards,
          }
          }),
        })),
    }

    try {
          console.log(payload);
      const response = await dispatch(sendInvites(payload)).unwrap()
      toast.success("Invitations sent.")
      onResult?.(response)
      onClose?.()
    } catch (error) {
      console.warn("Invite API failed:", error)
      const errorMessage =  error?.non_field_errors ? error?.non_field_errors[0]
        : "Failed to send invitations. Please try again."
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const selectedSharedProjectNames = selectedSharedProjects.map((project) => project.name)
  const sharedAllowedLabels = sharedAllowedSet
    ? DASHBOARD_LIBRARY.filter((entry) => sharedAllowedSet.has(entry.key)).map((entry) => entry.label)
    : []

  const sharedRestrictionMessage = (label) => {
    if (!selectedSharedProjects.length) return ""
    if (sharedAllowedLabels.length === 0) {
      return `Selected shared project${selectedSharedProjects.length > 1 ? "s" : ""} (${formatList(
        selectedSharedProjectNames,
      )}) do not grant Admin access on any dashboard. Remove one project or ask for Admin access.`
    }
    return `Can't grant ${label} because selected shared project${
      selectedSharedProjects.length > 1 ? "s" : ""
    } (${formatList(selectedSharedProjectNames)}) only provide Admin access on ${formatList(
      sharedAllowedLabels,
    )}.`
  }

  const renderProjectCard = (project) => {
    const selected = selectedProjectKeySet.has(project.key)
    const isShared = project.source === "shared"
    const disabled = isShared && !project.canDelegate
    const card = (
      <button
        type="button"
        key={project.key}
        onClick={() => toggleProjectSelection(project.key, disabled)}
        disabled={disabled}
        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
          selected ? "border-brand-blue1 bg-brand-blue1/10 shadow-sm" : "border-gray-200 bg-white"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-brand-blue1/70"} flex gap-3`}
      >
        <div className="mt-1">
          <Image
            src={buildFaviconUrl(project.domain || project.url || project.name)}
            alt=""
            width={20}
            height={20}
            className="rounded"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{project.name}</span>
            {isShared && (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Shared
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">{project.domain || project.url || "--"}</div>
          {project.location && (
            <div className="text-xs text-gray-500">
              {project.language ? `${project.language} - ${project.location}` : project.location}
            </div>
          )}
          {isShared && project.managerName && (
            <div className="text-xs text-gray-500">Managed by {project.managerName}</div>
          )}
          {isShared && project.adminDashboardLabels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {project.adminDashboardLabels.map((label) => (
                <span
                  key={`${project.key}-${label}`}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        {selected && <CheckOutlined className="mt-1 text-brand-blue1" />}
      </button>
    )
    return disabled && project.disableReason ? (
      <Tooltip key={project.key} title={project.disableReason} placement="top">
        <span className="block">{card}</span>
      </Tooltip>
    ) : (
      card
    )
  }

  return (
    <Modal
      width={1000}
      title={
        <span className="flex items-center gap-2 text-brand-blue1">
          <UserAddOutlined /> Invite New Member(s)
        </span>
      }
      open={open}
      onCancel={() => {
        if (!loading) onClose?.()
      }}
      destroyOnClose={false}
      footer={[
        <Button key="cancel" onClick={() => onClose?.()} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={submit}
          disabled={!canSubmit}
          loading={loading}
          icon={<CheckOutlined />}
        >
          Send Invites
        </Button>,
      ]}
    >
      <Spin spinning={ctxLoading}>
        <div className="flex flex-col gap-6">
          {profile && (
            <div className="text-sm text-gray-600">
              Inviting on behalf of{" "}
              <strong>
                {profile.first_name} {profile.last_name}
              </strong>{" "}
              ({profile.email})
            </div>
          )}

          <div>
            <div className="mb-2 font-semibold ">
              Email(s) <span className="text-red-500">*</span>
            </div>
            <div className="flex flex-wrap gap-2 rounded border border-dashed border-gray-200 p-2">
              {chips.map((chip) => (
                <Tag
                  key={chip.value}
                  color={chip.status === "valid" ? "blue" : "red"}
                  className="flex items-center gap-1"
                >
                  {chip.value}
                  <button
                    type="button"
                    className="text-xs text-white/80 hover:text-white"
                    onClick={() => removeChip(chip.value)}
                  >
                    &times;
                  </button>
                </Tag>
              ))}
              <Input
                ref={inputRef}
                style={{ minWidth: 260 }}
                placeholder="Paste emails and press Enter / Comma / Space"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                onPressEnter={addEmailsFromInput}
                onBlur={addEmailsFromInput}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === ",") {
                    event.preventDefault()
                    addEmailsFromInput()
                  }
                }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">Tip: separate emails with commas, spaces or new lines.</div>
          </div>

          <div>
            <div className="mb-2 font-semibold">Search projects</div>
            <Input
              allowClear
              placeholder="Search by project name, domain or URL"
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
            />
            <div className="mt-1 text-xs text-gray-500">Filtering applies to both My and Shared project lists.</div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">
                My Projects <span className="text-red-500">*</span>
              </div>
              <div className="text-xs text-gray-500">Selected: {selectedProjectKeys.length}</div>
            </div>
            {filteredMyProjects.length ? (
              <div className="max-h-[360px] overflow-y-auto pr-1">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredMyProjects.map(renderProjectCard)}</div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                {normalizedMyProjects.length ? "No projects match your search." : "No projects available in your account."}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <div className="font-semibold">Shared Projects</div>
              <div className="text-xs text-gray-500">
                You can only share the dashboards where you already have Admin access.
              </div>
            </div>
            {filteredSharedProjects.length ? (
              <div className="max-h-[360px] overflow-y-auto pr-1">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredSharedProjects.map(renderProjectCard)}</div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                {normalizedSharedProjects.length ? "No shared projects match your search." : "No shared projects found."}
              </div>
            )}
          </div>

          <div className="rounded border border-gray-200">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">Dashboard access & roles</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                Apply the same role to all enabled dashboards
                <Switch checked={applySameToAll} onChange={setApplySameToAll} size="small" />
              </div>
            </div>
            <div
              className="grid gap-x-4 gap-y-2 px-4 py-4"
              style={{ gridTemplateColumns: "200px 120px 1fr" }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dashboard</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Access</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Role</div>
              {access.map((row) => {
                const isBlocked = dashboardsDisabledByShared.has(row.dashboard)
                const checkbox = (
                  <Checkbox
                    checked={row.enabled && !isBlocked}
                    disabled={isBlocked}
                    onChange={(event) => toggleDashboardEnabled(row.dashboard, event.target.checked)}
                  />
                )
                const roleSelector = (
                  <Select
                    value={row.role}
                    style={{ width: 150 }}
                    disabled={!row.enabled || isBlocked}
                    onChange={(value) => onChangeRole(row.dashboard, value)}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <Select.Option key={role} value={role} disabled={hasSharedProjectSelected && role === "admin"}>
                        {formatRoleLabel(role)}
                      </Select.Option>
                    ))}
                  </Select>
                )
                return (
                  <React.Fragment key={row.dashboard}>
                    <div className="flex items-center gap-2">
                      <Image
                        src={buildFaviconUrl(`${row.dashboard}.wranker.com`)}
                        alt=""
                        width={16}
                        height={16}
                        className="rounded"
                      />
                      <span>{row.label}</span>
                    </div>
                    {isBlocked ? (
                      <Tooltip title={sharedRestrictionMessage(row.label)}>{checkbox}</Tooltip>
                    ) : (
                      checkbox
                    )}
                    {isBlocked ? (
                      <Tooltip title={sharedRestrictionMessage(row.label)}>{roleSelector}</Tooltip>
                    ) : (
                      roleSelector
                    )}
                  </React.Fragment>
                )
              })}
            </div>
            {selectedSharedProjects.length > 0 && (
              <div className="border-t bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Sharing limited by shared project{selectedSharedProjects.length > 1 ? "s" : ""}:{" "}
                {formatList(selectedSharedProjectNames)}. You currently have Admin access on{" "}
                {sharedAllowedLabels.length ? formatList(sharedAllowedLabels) : "no dashboards"} for
                this selection.
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 font-semibold">Welcome note (optional)</div>
            <TextArea
              rows={3}
              maxLength={400}
              value={welcomeNote}
              onChange={(event) => setWelcomeNote(event.target.value)}
              placeholder='E.g. "Welcome -- you have access to SEO & Reporting for these projects."'
            />
          </div>
        </div>
      </Spin>
    </Modal>
  )
}
