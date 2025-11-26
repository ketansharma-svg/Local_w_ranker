"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { Drawer, Popover, Select, Spin, Tooltip } from "antd"
import { AnimatePresence, motion } from "framer-motion"
import { useDispatch, useSelector } from "react-redux"
import { fetchTeamDetails, selectMembersRaw } from "@/src/redux/reducer/teamReducer"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import InviteMemberModal from "../../(team)/team-management/InviteMemberModal"
import { toast } from "sonner"
import {
  addTaskOptimistic,
  replaceOptimisticTask,
  removeOptimisticTask,
  createActivity,
} from "@/src/redux/reducer/campaignReducer"
import { TaskTemplateDrawer } from "./TaskTemplateDrawer"
import { User } from "lucide-react"
import { AppDispatch, RootState } from "@/src/redux/store"
import { BASE_URL_WR } from "@/src/util/api"
import Cookies from "js-cookie";


const TK = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  pastel: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  focus: "#D2EFFF",
  radius: 8,
  z: 1200,
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const byId = (id) => document.getElementById(id)
const toISODate = (d) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
const accessToken = Cookies.get("login_access_token_wrank");

const fetchCategories = async () => {
  try {
    const response = await fetch(`${BASE_URL_WR}categories/`,{
          headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    }
    })
    if (!response.ok) throw new Error("Failed to fetch categories")
    return await response.json()
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

const normalizeUrl = (raw, base = "https://") => {
  let s = (raw || "").trim()
  if (!s) return null
  try {
    if (!/^https?:\/\//i.test(s)) s = base + s.replace(/^\/*/g, "")
    const u = new URL(s)
    return u.toString()
  } catch {
    return null
  }
}

const Label = ({ children }) => (
  <label style={{ display: "block", fontSize: 13, color: "#000", marginBottom: 6 }}>{children}</label>
)

const ErrorText: any = ({ id, children }) => (
  <div id={id} style={{ color: "#EA5455", fontSize: 12, marginTop: 6 }}>
    {children}
  </div>
)

export default function UniversalTaskCreationDrawer({
  open, onClose, defaultTitle = "", defaultDesc = "", setOpen, type, projectPassed, idPassed, status, onUpdate
}: any) {

  const [context, setContext] = useState("allProjects")
  const [projectId, setProjectId] = useState("")
  const [projectName, setProjectName] = useState("")
  const [userRole, setUserRole] = useState("editor")
  const [categories, setCategories] = useState([])
  
  const [loadingCategories, setLoadingCategories] = useState(false)
  const { projects,sharedProjects, loading: projectsLoading }: any = useProjectManager()
  const allProjects = [...projects, ...sharedProjects];

  const dispatch = useDispatch<any>()
  const rawMembers = useSelector(selectMembersRaw)

  useEffect(() => {
    setLoadingCategories(true)
    fetchCategories().then((data) => {
      setCategories(data)
      setLoadingCategories(false)
    })
  }, [])

  useEffect(() => {
    if (context === "project" && projects.length > 0) {
      setProjectId(projects[0].id)
      setProjectName(projects[0].name || projects[0].domain)
    } else {
      setProjectId("")
      setProjectName("")
    }
  }, [context, projects])

  useEffect(() => {
    dispatch(fetchTeamDetails({ force: false }))
  }, [dispatch])

  const canCreate = userRole === "editor" || userRole === "admin"



  const resolvedInitialProjectId = idPassed || (context === "project" ? projectId : projectId || "")
  const resolvedProjectLocked = !!idPassed || context === "project"

  return (
    <AnimatePresence>
      {open && canCreate && (
        <Drawer
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>Create Task</span>
            </div>
          }
          placement="right"
          onClose={() => {
            onClose?.()
            setOpen && setOpen(false)
          }}
          open={open}
          width={480}
          styles={{
            body: { padding: 0 },
            header: { borderBottom: `1px solid ${TK.border}` },
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <TaskForm
              initialTitle={defaultTitle}
              initialDesc={defaultDesc}
              projectPassed={projectPassed}
              initialProjectId={resolvedInitialProjectId}
              projectLocked={resolvedProjectLocked}
              modeType={type}
              statusProp={status}
              onCancel={() => {
                onClose?.()
                setOpen && setOpen(false)
              }}
              onSuccess={(res) => {
                onClose?.()
                setOpen && setOpen(false)
                toast.success(`Task created successfully!`)
                onUpdate?.()
              }}
              categories={categories}
              loadingCategories={loadingCategories}
              projects={allProjects as any}
              projectsLoading={projectsLoading}
              rawMembers={rawMembers}

            />
          </motion.div>
        </Drawer>
      )}
    </AnimatePresence>
  )
}

function TaskForm({
  theme = "light",
  initialProjectId,
  projectLocked,
  projectPassed,
  modeType,
  statusProp,
  onCancel,
  onSuccess,
  categories,
  loadingCategories,
  projects = [],
  projectsLoading,
  rawMembers,
  initialTitle = "",
  initialDesc = "",

}) {


  const dispatch = useDispatch<AppDispatch>()

  const STATUS_MAP = {
    not_started: "Not Started",
    working: "Working",
    completed: "Completed",
    under_review: "Under Review",
  }

  const convertStatusToKey = (incomingStatus) => {
    if (!incomingStatus) return "not_started"
    return incomingStatus.toLowerCase()
  }

  const getInitialStatus = () => {
    if (modeType === "createNew") {
      return "not_started"
    } else if (modeType === "edit" && statusProp) {
      return convertStatusToKey(statusProp)
    }
    return "not_started"
  }
  const [taskTemplateDrawerOpen, setTaskTemplateDrawerOpen] = useState(false)
  const isStatusDisabled = modeType === "createNew" || modeType === "edit"
  const isProjectDisabled = projectLocked || !!initialProjectId

  const formRef = useRef(null)
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<any>({
    title: initialTitle || "",
    projectId: initialProjectId || "",
    categoryId: "",
    description: initialDesc || "",
    progress: "",
    priority: "Medium",
    status: getInitialStatus(),
    date: toISODate(new Date()),
    dueDate: "",
    timeSpentHours: 0,
    timeSpentMinutes: 0,
    notes: "",
    isPublished: false,
    assignedTo: null,
  })

  const selectedProjectIdNum = formData.projectId ? Number(formData.projectId) : null;

  const membersForProject = useMemo(() => {
    if (!selectedProjectIdNum) return [];
    return (rawMembers || []).filter(
      (m) =>
        Array.isArray(m.projects) &&
        m.projects.some((p) => Number(p.project_id) === selectedProjectIdNum)
    );
  }, [rawMembers, selectedProjectIdNum]);

  useEffect(() => {
    if (!selectedProjectIdNum) {
      if (formData.assignedTo) updateFormData("assignedTo", "");
      return;
    }
    if (
      formData.assignedTo &&
      !membersForProject.some((m) => m.member_email === formData.assignedTo)
    ) {
      updateFormData("assignedTo", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectIdNum, membersForProject.length]);
  const assigneeOptions = useMemo(() => {
    if (!selectedProjectIdNum) return [];

    return membersForProject.map((m) => {
      const proj = (m.projects || []).find(
        (p) => Number(p.project_id) === selectedProjectIdNum
      );
      const invitationStatus = proj?.invitation_status || "Accepted";
      const isPending = invitationStatus === "Pending";

      return {
        value: m.member_email,
        label: `${m.member_name} (${m.member_email})`,
        disabled: isPending,
        meta: { isPending, invitationStatus, memberId: m.member_id },
      };
    });
  }, [membersForProject, selectedProjectIdNum]);
  const projectOptions = useMemo(() => {
    return projects.map((p:any) => ({
      value: String(p.id),
      label: p.name || p.domain || `Project ${p.id}`,
      data: { domain: p.domain, name: p.name },
    }));
  }, [projects]);
  const resolvedProjectName = useMemo(() => {
    if (!projects.length) return "";
    const normalizeId = (value?: string | number | null) => (value == null ? "" : String(value));
    const tryMatch = (id?: string | number | null) => {
      const normalized = normalizeId(id);
      if (!normalized) return "";
      const match:any = projects.find((p:any) => String(p.id) === normalized);
      return match ? match.name || match.domain || `Project ${match.id}` : "";
    };
    const active = tryMatch(formData.projectId);
    if (active) return active;
    return tryMatch(initialProjectId);
  }, [projects, formData.projectId, initialProjectId]);
  const categoryOptions = useMemo(() => {
    return categories.map((cat: any) => ({
      value: String(cat.id),
      label: cat.name,
      data: cat,
    }));
  }, [categories]);

  const [inviteOpen, setInviteOpen] = useState(false)
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    setDirty(true)
  }, [formData])

  useEffect(() => {
    if (projectLocked) {
      setFormData((prev) => ({ ...prev, projectId: initialProjectId }))
    }
  }, [initialProjectId, projectLocked])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (!dirty || confirm("Discard unsaved changes?")) onCancel?.()
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        onSubmit(e)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [dirty, formData.title, formData.projectId, formData.assignedTo])

  function validate() {
    const e: any = {}
    if (!formData.title || formData.title.trim().length < 4 || formData.title.trim().length > 100) {
      e.title = "Required, 4–100 characters."
    }
    if (!formData.projectId) e.projectId = "Project is required."
    if (!formData.categoryId) e.categoryId = "Category is required."
    // if (!formData.assignedTo) e.assignedTo = "Assignee is required."
    if (!formData.date) e.date = "Start date is required."
    if (!formData.dueDate) e.dueDate = "Due date is required."
    if (formData.dueDate && formData.date && new Date(formData.dueDate) < new Date(formData.date)) {
      e.dueDate = "Due date must be after start date."
    }
    if (formData.description && formData.description.length > 1000) {
      e.description = "Description must be under 1000 characters."
    }
    if (formData.progress && !normalizeUrl(formData.progress)) {
      e.progress = "Progress URL must be valid."
    }

    setErrors(e)
    return e
  }

  function scrollToFirstError(e) {
    const keys = Object.keys(e)
    if (!keys.length) return
    const map = {
      title: "f-title",
      projectId: "f-project",
      categoryId: "f-category",
      assignedTo: "f-assignee",
      date: "f-date",
      dueDate: "f-due-date",
    }
    const id = map[keys[0]]
    const node = byId(id)
    if (node) node.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  async function onSubmit(ev) {
    ev?.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length) {
      scrollToFirstError(validationErrors)
      return
    }

    setSubmitting(true)

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      const taskData: any = {
        title: formData.title.trim(),
        project: Number.parseInt(formData.projectId),
        category: Number.parseInt(formData.categoryId),
        description: formData.description.trim(),
        progress: formData.progress.trim() || "",
        priority: formData.priority,
        status: formData.status,
        date: formData.date,
        due_date: formData.dueDate,
        time_spent_hours: Number.parseInt(formData.timeSpentHours) || 0,
        time_spent_minutes: Number.parseInt(formData.timeSpentMinutes) || 0,
        notes: formData.notes.trim(),
        is_published: formData.isPublished,
        assigned_to: formData.assignedTo,
      }

      const optimisticTask: any = {
        id: tempId,
        title: taskData.title,
        project_id: taskData.project,
        description: taskData.description,
        internal_notes: taskData.notes,
        status: taskData.status,
        priority: taskData.priority.toLowerCase(),
        assigned_to: taskData.assigned_to,
        assignee_name:
          rawMembers?.find((m) => m.member_email === taskData.assigned_to)?.member_name || taskData.assigned_to,
        date: taskData.date,
        due_date: taskData.due_date,
        updated_at: new Date().toISOString(),
        updated_by: null,
      }

      dispatch(addTaskOptimistic({ tempId, task: optimisticTask }))

      try {
        const result = await dispatch(createActivity(taskData)).unwrap()

        const realTask: any = {
          id: Number(result.id),
          title: result.title,
          project_id: result.project,
          description: result.description || null,
          internal_notes: result.notes || null,
          status: result.status,
          priority: result.priority.toLowerCase(),
          assigned_to: result.assigned_to,
          assignee_name: result.assigned_to,
          date: result.date,
          due_date: result.due_date,
          updated_at: new Date().toISOString(),
          updated_by: null,
        }

        dispatch(replaceOptimisticTask({ tempId, realTask }))

        onSuccess?.(result)
        setDirty(false)
      } catch (error) {
        dispatch(removeOptimisticTask({ tempId }))
        throw error
      }
    } catch (error: any) {
      console.error("Failed to create task:", error)
      toast.error(`Failed to create task: ${error}`)
    } finally {
      setSubmitting(false)
    }
  }

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const sectionStyle = { padding: 16, borderBottom: `1px solid ${TK.border}` }
  const inputBase = {
    width: "100%",
    border: `1px solid ${TK.borderStrong}`,
    borderRadius: TK.radius,
    padding: 10,
    outline: "none",
    background: theme === "dark" ? "#0f172a" : "#fff",
    color: theme === "dark" ? "#E5E7EB" : TK.text,
  }
  const focusStyle = { boxShadow: `0 0 0 3px ${TK.focus}` }
  const disabledInputStyle = {
    backgroundColor: theme === "dark" ? "#1a1a1a" : "#f5f5f5",
    cursor: "not-allowed",
    opacity: 0.7,
    color: theme === "dark" ? "#666" : "#8b8b8b",
  }

  const resolvedProjId = formData.projectId || initialProjectId || "";
  const canImportTemplate = Boolean(resolvedProjId || projectLocked);

  const importBtnStyles = {
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 13,
    border: 0,
    minHeight: 34,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: canImportTemplate ? "pointer" : "not-allowed",
    opacity: canImportTemplate ? 1 : 0.6,
    background: canImportTemplate ? TK.brand : "#E6EEF5", // subtle disabled look
    color: canImportTemplate ? "#fff" : TK.muted,
  };

  return (
    <>
      <motion.form
        ref={formRef}
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {/* Task Information */}
        <section style={sectionStyle}>
          <div className='flex items-center justify-between'>
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Task Information</h3>

            <button
              type="button"
              onClick={(e) => {
                // runtime guard — useful if JS triggers the click or keyboard action
                if (!canImportTemplate) {
                  toast.error("Please select a project first.");
                  return;
                }
                setTaskTemplateDrawerOpen(true);
              }}
              disabled={!canImportTemplate}
              title={!canImportTemplate ? "Select a project first to enable template import" : "Import from templates"}
              style={importBtnStyles}
              aria-disabled={!canImportTemplate}
            >
              Import from Templates
            </button>

          </div>
          {!canImportTemplate && (
            <div className="w-full text-gray-500 justify-end flex text-xs ">
              Please select a project to enable template import.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <div>
              <Label>Task Title <span className="text-red-600">*</span></Label>
              <input
                id="f-title"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "e-title" : undefined}
                value={formData.title}
                onChange={(e) => updateFormData("title", e.target.value)}
                onBlur={validate}
                placeholder="e.g., Write blog post about SEO trends"
                style={{ ...inputBase }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = focusStyle.boxShadow)}
                onBlurCapture={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
              {errors.title && <ErrorText id="e-title">{errors.title}</ErrorText>}
            </div>

            <div>
              <Label>Project <span className="text-red-600">*</span></Label>
              {isProjectDisabled ? (
                <input
                  id="f-project"
                  value={
                    projectPassed
                      ? projectPassed.name || projectPassed.domain || ""
                      : resolvedProjectName
                  }
                  readOnly
                  disabled
                  style={{ ...inputBase, ...disabledInputStyle }}
                  title="Project is locked for this task"
                />
              ) : (
                <Select
                  id="f-project"
                  aria-invalid={!!errors.projectId}
                  aria-describedby={errors.projectId ? "e-project" : undefined}
                  value={formData.projectId || undefined}
                  onChange={(value) => updateFormData("projectId", value ? String(value) : "")}
                  onBlur={validate}
                  style={{ width: "100%" }}
                  disabled={projectsLoading}
                  placeholder="Select a project"
                  showSearch
                  optionFilterProp="label"
                  options={projectOptions}
                  loading={projectsLoading}
                  allowClear
                  notFoundContent={projectsLoading ? <Spin size="small" /> : "No projects"}
                  optionRender={(option) => {
                    const meta:any = option.data || {};
                    return (
                      <div className="flex flex-col leading-tight">
                        <span className=" text-gray-900">{option.label}</span>
                        {meta.domain && <span className="text-xs text-gray-500">{meta.domain}</span>}
                      </div>
                    );
                  }}
                />
              )}
              {projectsLoading && (
                <div style={{ fontSize: 12, color: TK.muted, marginTop: 4 }}>Loading projects...</div>
              )}
              {errors.projectId && <ErrorText id="e-project">{errors.projectId}</ErrorText>}
            </div>

            <div>
              <Label>Category <span className="text-red-600">*</span></Label>

              <Select
                id="f-category"
                aria-invalid={!!errors.categoryId}
                aria-describedby={errors.categoryId ? "e-category" : undefined}
                value={formData.categoryId || undefined}
                onChange={(value) => updateFormData("categoryId", value ? String(value) : "")}
                onBlur={validate}
                style={{ width: "100%" }}
                disabled={loadingCategories}
                loading={loadingCategories}
                placeholder="Select a category"
                notFoundContent={loadingCategories ? <Spin size="small" /> : "No categories"}
                showSearch
                optionFilterProp="label"
                options={categoryOptions}
                allowClear
                optionRender={(option) => {
                  const cat = option.data || {};
                  return (
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="truncate  text-gray-900">{option.label}</span>
                      {cat.campaign_name && (
                        <span className="text-xs text-gray-600 border border-gray-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                          {cat.campaign_name}
                        </span>
                      )}
                    </div>
                  );
                }}
              />
              {loadingCategories && (
                <div style={{ fontSize: 12, color: TK.muted, marginTop: 4 }}>Loading categories...</div>
              )}
              {errors.categoryId && <ErrorText id="e-category">{errors.categoryId}</ErrorText>}
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                placeholder="Draft a 1200-word blog post covering 2025 SEO predictions."
                rows={4}
                style={{ ...inputBase, resize: "vertical" }}
              />
              {errors.description && <ErrorText>{errors.description}</ErrorText>}
            </div>

            <div>
              <Label>Progress URL</Label>
              <input
                value={formData.progress}
                onChange={(e) => updateFormData("progress", e.target.value)}
                placeholder="https://docs.google.com/document/d/123456"
                style={{ ...inputBase }}
              />
              {errors.progress && <ErrorText>{errors.progress}</ErrorText>}
            </div>
          </div>
        </section>

        {/* Assignment & Status */}
        <section style={sectionStyle}>
          <div className="flex items-center justify-between">
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Assignment & Status</h3>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="px-4 py-2 bg-brand-blue1 hover:bg-brand-blue1/90 text-white rounded-md"
            >
              Invite
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Label>Assignee</Label>
              <Select
                id="f-assignee"
                style={{ width: "100%" }}
                placeholder={!selectedProjectIdNum ? "Select a project first" : "Select a user"}
                value={formData.assignedTo ?? undefined}
                onChange={(val) => {
                  if (val === "__self__") {
                    updateFormData("assignedTo", null)
                  } else {
                    updateFormData("assignedTo", val)
                  }
                }}
                disabled={!selectedProjectIdNum}
                options={[
                  { value: "__self__", label: "Assign to yourself" },
                  ...assigneeOptions,
                ]}
                showSearch
                optionFilterProp="label"
                className=""
                optionRender={(option) => {
                  if (option.value === "__self__") {
                    return <div className="flex items-center gap-2 font-medium text-brand-blue1">
                      <User className="w-4 h-4" />
                      Assign to yourself
                    </div>
                  }

                  const isPending = option.data?.meta?.isPending
                  const content = (
                    <div className={isPending ? "text-gray-400" : ""}>
                      {option.data?.label}
                    </div>
                  )
                  return isPending ? (
                    <Tooltip trigger="hover" title="Invitation pending" placement="right">
                      {content}
                    </Tooltip>
                  ) : (
                    content
                  )
                }}
                listHeight={256}
              />


              {!selectedProjectIdNum && (
                <div style={{ fontSize: 12, color: TK.muted, marginTop: 4 }}>
                  Choose a project to see eligible assignees.
                </div>
              )}
              {selectedProjectIdNum && membersForProject.length === 0 && (
                <div style={{ fontSize: 12, color: TK.muted, marginTop: 4 }}>
                  No team members are mapped to this project. Please Invite.
                </div>
              )}
              {errors.assignedTo && <ErrorText id="e-assignee">{errors.assignedTo}</ErrorText>}
            </div>

            <div>
              <Label>Priority</Label>
              <select
                value={formData.priority}
                onChange={(e) => updateFormData("priority", e.target.value)}
                style={{ ...inputBase }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <Label>Status</Label>
              <select
                value={formData.status}
                onChange={(e) => updateFormData("status", e.target.value)}
                disabled={isStatusDisabled}
                style={{
                  ...inputBase,
                  ...(isStatusDisabled ? disabledInputStyle : {}),
                }}
                title={isStatusDisabled ? "Status is locked for this mode" : ""}
              >
                {Object.entries(STATUS_MAP).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              {isStatusDisabled && (
                <div style={{ fontSize: 12, color: TK.muted, marginTop: 4 }}>
                  Status is {modeType === "createNew" ? "set to 'Not Started' for new tasks" : "locked in edit mode"}
                </div>
              )}
            </div>

            <div>
              <Label>Start Date <span className="text-red-600">*</span></Label>
              <input
                id="f-date"
                type="date"
                value={formData.date}
                onChange={(e) => updateFormData("date", e.target.value)}
                onBlur={validate}
                style={{ ...inputBase }}
              />
              {errors.date && <ErrorText>{errors.date}</ErrorText>}
            </div>

            <div>
              <Label>Due Date <span className="text-red-600">*</span></Label>
              <input
                id="f-due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateFormData("dueDate", e.target.value)}
                onBlur={validate}
                style={{ ...inputBase }}
              />
              {errors.dueDate && <ErrorText>{errors.dueDate}</ErrorText>}
            </div>
          </div>
        </section>

        {/* Internal Notes */}
        <section style={sectionStyle}>
          <h3 style={{ margin: 0, marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Internal Notes</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => updateFormData("notes", e.target.value)}
            placeholder="Make sure to include latest Google algorithm changes."
            rows={3}
            style={{ ...inputBase, background: theme === "dark" ? "#0f172a" : "#F5F7FA" }}
          />

          {/* <div style={{ marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => updateFormData("isPublished", e.target.checked)}
              />
              Mark as published
            </label>
          </div> */}
        </section>

        {/* Footer (sticky) */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: theme === "dark" ? "#0b1220" : "#fff",
            borderTop: `1px solid ${TK.border}`,
            padding: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ color: dirty ? TK.muted : "transparent", fontSize: 13 }}>{dirty ? "Unsaved changes" : " "}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (!dirty || confirm("Discard unsaved changes?")) onCancel?.()
              }}
              style={{
                border: `1px solid ${TK.borderStrong}`,
                background: "transparent",
                borderRadius: TK.radius,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                !formData.title ||
                !formData.projectId ||
                !formData.categoryId ||
                // !formData.assignedTo ||
                !formData.date ||
                !formData.dueDate
              }
              aria-busy={submitting}
              className="disabled:!cursor-not-allowed"
              style={{
                background: submitting ? TK.brandHover : TK.brand,
                color: "#fff",
                border: 0,
                borderRadius: TK.radius,
                padding: "10px 16px",
                cursor: submitting ? "wait" : "pointer",
                minWidth: 140,
                opacity:
                  submitting ||
                    !formData.title ||
                    !formData.projectId ||
                    !formData.categoryId ||
                    // !formData.assignedTo ||
                    !formData.date ||
                    !formData.dueDate
                    ? 0.6
                    : 1,
              }}
            >
              {submitting ? "Creating…" : "Create Task"}
            </button>
          </div>
        </div>
      </motion.form>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onResult={(_res) => {
          dispatch(fetchTeamDetails({ force: true }))
        }}
      />

      <TaskTemplateDrawer
        open={taskTemplateDrawerOpen}
        onClose={() => setTaskTemplateDrawerOpen(false)}
        projectId={formData.projectId || initialProjectId || ""}
        projectName={
          resolvedProjectName ||
          projectPassed?.name ||
          projectPassed?.domain ||
          ""
        }
      />

    </>
  )
}
