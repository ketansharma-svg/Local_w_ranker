"use client"

import { useProfile } from "@/src/redux/providers/ProfileProvider"
import { fetchTeamDetails, selectMembersRaw } from "@/src/redux/reducer/teamReducer"
import { AppDispatch } from "@/src/redux/store"
import { Drawer, Popconfirm, Tooltip } from "antd"
import { set } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
// import { toast } from 'react-toastify';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Link as LinkIcon,
    Loader2,
    MoreHorizontal,
    Paperclip,
    Pencil,
    Trash2,
    UserRound,
    X
} from "lucide-react"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "sonner"

/* ═════════ Types ═════════ */

export type DrawerStatus =
    | "not_started"
    | "working"
    | "under_review"
    | "completed"


export type DrawerPriority = "low" | "medium" | "high" | "critical"

export type DrawerTask = {
    id: string | number
    title: string
    project_id?: string | number
    description_html?: string
    labels?: string[]
    internal_notes?: string
    status: DrawerStatus
    priority: DrawerPriority
    assignee_id?: string | number | null
    assignee_name?: string | number | null
    start_date?: string | null
    due_date?: string | null
    duration_days?: number | null
    source?: { pages?: string[]; insights?: string[] }
    time_logs?: { id: string; user_id?: string | number | null; minutes: number; note?: string; ts: number | string }[]
    activity?: { t: string; at: number | string; by?: string | number | null; msg?: string; from?: string; to?: string; minutes?: number }[]
    attachments?: { id: string; name: string; size: number }[]
    comments?: { id: string; user_id?: string | number | null; ts: number | string; text: string }[]
    last_updated_by?: string | number | null
    updated_at?: number | string | null
    category_name?: string
    progress?: string
    time_spent_hours?: number
    time_spent_minutes?: number
    raw?: any
    assigned_by?: string | null;   // ← add

}

export type UserRef = { id: string | number; name: string; role?: string }
export type ProjectRef = { id: string | number; name: string }

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
    const ref = useRef<T | null>(null);
    useEffect(() => {
        function handle(e: MouseEvent | TouchEvent) {
            const el = ref.current;
            if (!el) return;
            if (!el.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", handle);
        document.addEventListener("touchstart", handle);
        return () => {
            document.removeEventListener("mousedown", handle);
            document.removeEventListener("touchstart", handle);
        };
    }, [onClose]);
    return ref;
}
/* ═════════ Mapping helpers ═════════ */

const apiStatusToDrawer: Record<string, DrawerStatus> = {
    "Not Started": "not_started",
    Working: "working",
    "Under Review": "under_review",
    Completed: "completed",
}

const drawerStatusToApi: Record<DrawerStatus, string> = {
    not_started: "Not Started",
    working: "Working",
    under_review: "Under Review",
    completed: "Completed",
}

const apiPriorityToDrawer = (p?: string | null): DrawerPriority => (p || "Low").toLowerCase() as DrawerPriority
const drawerPriorityToApi = (p: DrawerPriority) => p[0].toUpperCase() + p.slice(1)

/** Map your backend activity object → DrawerTask */
export function fromApiActivity(a): DrawerTask {

    const minsFromApi = (Number(a.time_spent_hours || 0) * 60) + Number(a.time_spent_minutes || 0)

    const seedTimeLogs = minsFromApi > 0
        ? [{
            id: "api-seed",
            user_id: a.assigned_to ?? null,
            minutes: minsFromApi,
            note: "",
            ts: a.updated_at || a.created_at || a.updatedAt || a.createdAt || Date.now(),
        }]
        : []

    // If "progress" looks like a URL, also surface it in source.pages
    const progressUrl = typeof a.progress === "string" ? a.progress : ""
    const pageLinks: any = []
    try { if (progressUrl && new URL(progressUrl)) pageLinks.push(progressUrl) } catch { }

    return {
        id: a.id,
        title: a.title || "",
        project_id: a.project_id ?? a.project,
        description_html: a.description ? `<p>${escapeHtml(a.description)}</p>` : "",
        labels: [],

        internal_notes: (a.notes ?? a.internal_notes ?? "") as string,

        status: apiStatusToDrawer[a.status] || (a.status as DrawerStatus) || "not_started",
        priority: apiPriorityToDrawer(a.priority),

        assignee_id: a.assigned_to ?? null,
        assignee_name: a.assigned_to_name || a.assigned_to || null,

        start_date: a.date ? a.date.slice(0, 10) : null,
        due_date: a.due_date ? a.due_date.slice(0, 10) : null,

        duration_days: null,

        source: { pages: pageLinks, insights: [] },

        time_logs: seedTimeLogs,

        activity: [],
        attachments: [],
        comments: [],

        last_updated_by: a.last_updated_by ?? a.updated_by ?? null,
        updated_at: a.updated_at || a.updatedAt || a.updated || null,

        category_name: a.category_name,
        progress: progressUrl,
        time_spent_hours: Number(a.time_spent_hours || 0),
        time_spent_minutes: Number(a.time_spent_minutes || 0),
        assigned_by: a.assigned_by ?? null,
        raw: a,
    }
}

/** Minimal mapping for Kanban card → DrawerTask (uses card.raw if present) */
export function fromKanbanTask(card: any): DrawerTask {
    if (card?.raw) return fromApiActivity(card.raw)
    const statusMap: Record<string, DrawerStatus> = {
        NOT_STARTED: "not_started",
        IN_PROGRESS: "working",
        WORKING: "working",
        REVIEW: "under_review",
        UNDER_REVIEW: "under_review",
        COMPLETED: "completed",
    }

    const prioMap: Record<string, DrawerPriority> = { High: "high", Medium: "medium", Low: "low" }
    return {
        id: card.id,
        title: card.title || "",
        project_id: card.projectId,
        status: statusMap[card.status] || "not_started",
        priority: prioMap[card.priority] || "low",
        assignee_id: card?.assignee?.id || null,
        assignee_name: card?.assignee?.name || card?.assignee?.id || null,
        due_date: card?.dueDate ? String(card.dueDate).slice(0, 10) : null,
        description_html: "",
    } as DrawerTask
}

/** Map DrawerTask payload → backend patch shape (excludes assignee; assignment uses dedicated API) */
export function toApiPatch(t: DrawerTask) {
    return {
        title: t.title,
        status: drawerStatusToApi[t.status],
        priority: drawerPriorityToApi(t.priority),
        // assigned_to is intentionally excluded; use /assign/:id/ endpoint
        date: t.start_date || null,
        due_date: t.due_date || null,
        notes: t.internal_notes || "",
        description: stripHtml(t.description_html || ""),
    }
}

/* ═════════ Self‑contained API wiring ═════════ */

export type TaskManagerDrawerApi = {
    baseUrl: string
    auth?:
    | { type: "bearer"; token?: string }
    | { type: "header"; key: string; value: string }
    routes?: {
        getById?: (id: string | number) => string
        patch?: (id: string | number) => string
        remove?: (id: string | number) => string
        assign?: (id: string | number) => string
        complete?: (id: string | number) => string
    }
    http?: (input: string, init?: RequestInit) => Promise<Response>
}

function buildHeaders(api?: TaskManagerDrawerApi): Headers {
    const h = new Headers({ "Content-Type": "application/json" })
    if (!api?.auth) return h
    if (api.auth.type === "bearer" && api.auth.token) h.set("Authorization", `Bearer ${api.auth.token}`)
    else if (api.auth.type === "header") h.set(api.auth.key, api.auth.value)
    return h
}

async function httpJson<T>(url: string, init: RequestInit, api?: TaskManagerDrawerApi): Promise<T> {
    const res = api?.http ? await api.http(url, init) : await fetch(url, init)
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `HTTP ${res.status}`)
    }
    return (await res.json()) as T
}

function defaultGetUrl(api: TaskManagerDrawerApi, id: string | number) {
    return api.routes?.getById?.(id) ?? `${api.baseUrl}campaign-activities-new/${id}/`
}
function defaultPatchUrl(api: TaskManagerDrawerApi, id: string | number) {
    return api.routes?.patch?.(id) ?? `${api.baseUrl}campaign-activities-new/${id}/`
}
function defaultDeleteUrl(api: TaskManagerDrawerApi, id: string | number) {
    return api.routes?.remove?.(id) ?? `${api.baseUrl}campaign-activities-new/${id}/`
}
function defaultAssignUrl(api: TaskManagerDrawerApi, id: string | number) {
    return api.routes?.assign?.(id) ?? `${api.baseUrl}campaign-activities-new/assign/${id}/`
}
function defaultCompleteUrl(api: TaskManagerDrawerApi, id: string | number) {
    return api.routes?.complete?.(id) ?? `${api.baseUrl}campaign-activities-new/complete/${id}/`
}


/* ═════════ Props ═════════ */

export type TaskManagerDrawerProps = {
    open: boolean
    onClose: () => void
    onUpdate: () => void

    task?: DrawerTask | null
    taskId?: string | number

    loader?: (taskId: string | number) => Promise<DrawerTask>
    onSave?: (task: DrawerTask) => Promise<void>        // optional override
    onDelete?: (taskId: string | number) => Promise<void>

    api?: TaskManagerDrawerApi

    users?: UserRef[]
    projects?: ProjectRef[]
    projectLocked?: boolean
    userRole?: "viewer" | "editor" | "admin"
}

/* ═════════ Component ═════════ */

export default function TaskManagerDrawer({
    open,
    onClose,
    task,
    taskId,
    loader,
    onSave,
    onDelete,
    api,
    users = [],
    userRole = "editor",
    onUpdate
}: TaskManagerDrawerProps) {
    const [dates, setDates] = useState({ start: '', due: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false)
    const [assignBusy, setAssignBusy] = useState(false)
    const [completeBusy, setCompleteBusy] = useState(false)
    const [deleteBusy, setDeleteBusy] = useState(false)

    const [edit, setEdit] = useState(false)
    const [local, setLocal] = useState<DrawerTask | null>(task ?? null)
    const [editSourceOpen, setEditSourceOpen] = useState(false);
    const [nextSource, setNextSource] = useState<string>(local?.progress || "");
    const [timeLogsBusy, setTimeLogsBusy] = React.useState(false);
    const [timeLogsKey, setTimeLogsKey] = React.useState(0);
    const [suppressPropSyncUntil, setSuppressPropSyncUntil] = useState(0);

    const [editLogId, setEditLogId] = useState<string | null>(null);
    const [editH, setEditH] = useState<number>(0);
    const [editM, setEditM] = useState<number>(0);
    const [editNote, setEditNote] = useState<string>("");
    const [editTs, setEditTs] = useState<string>(""); // datetime-local string "YYYY-MM-DDTHH:mm"


    const { profile } = useProfile()

    const original = useRef<DrawerTask | null>(task ?? null)

    const dispatch = useDispatch<AppDispatch>()
    const rawMembers = useSelector(selectMembersRaw)



    useEffect(() => { dispatch(fetchTeamDetails({ force: false })) }, [dispatch])
    useEffect(() => { setNextSource(local?.progress || ""); }, [local?.progress]);


    /* ── Built‑in fallbacks ───────────────── */

    async function loadByIdInternal(id: string | number): Promise<DrawerTask> {
        if (typeof loader === "function") return loader(id)
        if (api?.baseUrl) {
            const url = defaultGetUrl(api, id)
            const data = await httpJson<any>(url, { method: "GET", headers: buildHeaders(api) }, api)
            console.log("Fetched task data:", data.date, data.due_date);
            setDates({ start: data.date || '', due: data.due_date || '' });
            return fromApiActivity(data)
        }
        throw new Error("No loader provided and no API config available to fetch task by id.")
    }

    async function saveInternal(t: DrawerTask): Promise<void> {
        if (typeof onSave === "function") return onSave(t)   // (override if parent wants)
        if (api?.baseUrl) {
            const url = defaultPatchUrl(api, t.id)
            const patch = toApiPatch(t) // assignment excluded
            await httpJson(url, { method: "PATCH", headers: buildHeaders(api), body: JSON.stringify(patch) }, api)
            return
        }
        throw new Error("No onSave provided and no API config available to save task.")
    }

    async function deleteInternal(id: string | number): Promise<void> {
        if (typeof onDelete === "function") return onDelete(id)
        if (api?.baseUrl) {
            const url = defaultDeleteUrl(api, id)
            await httpJson(url, { method: "DELETE", headers: buildHeaders(api) }, api)
            return
        }
        throw new Error("No onDelete provided and no API config available to delete task.")
    }

    async function assignInternal(id: string | number, assignedToEmail: string | null): Promise<void> {
        if (!api?.baseUrl) throw new Error("No API config provided for assignment.")
        const url = defaultAssignUrl(api, id)
        await httpJson(url, {
            method: "POST",
            headers: buildHeaders(api),
            body: JSON.stringify({ assigned_to: assignedToEmail }),
        }, api)
    }

    async function completeInternal(id: string | number): Promise<void> {
        if (!api?.baseUrl) throw new Error("No API config provided for complete.")
        const url = defaultCompleteUrl(api, id)
        await httpJson(url, { method: "POST", headers: buildHeaders(api) }, api)
    }

    async function patchPartial(id: string | number, body: Record<string, any>) {
        if (!api?.baseUrl) throw new Error("No API config available for patch.");
        const url = defaultPatchUrl(api, id);
        return httpJson(url, {
            method: "PATCH",
            headers: buildHeaders(api),
            body: JSON.stringify(body),
        }, api);
    }

    /* ── Data lifecycle ───────────────────── */

    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!open) return;

            if (task) {
                setLocal(prev => {
                    // 1) respect suppression window
                    if (Date.now() < suppressPropSyncUntil) return prev || task;

                    if (!prev) return task;

                    // 2) prefer fresher/greater minutes
                    const prevM = (Number(prev.time_spent_hours || 0) * 60) + Number(prev.time_spent_minutes || 0);
                    const nextM = (Number(task.time_spent_hours || 0) * 60) + Number(task.time_spent_minutes || 0);

                    // If parent gives us older minutes, keep current minutes but merge other fields
                    if (nextM < prevM) {
                        return { ...task, time_spent_hours: prev.time_spent_hours, time_spent_minutes: prev.time_spent_minutes };
                    }
                    return task;
                });

                // Only advance "original" when we aren't suppressing (prevents Save CTA flicker)
                if (Date.now() >= suppressPropSyncUntil) {
                    original.current = task;
                }
                return;
            }

            if (taskId) {
                setBusy(true);
                try {
                    const data = await loadByIdInternal(taskId);
                    if (!cancelled) {
                        setLocal(data);
                        original.current = data;
                    }
                } catch (e: any) {
                    toast.error(e?.message || "Failed to load task");
                } finally {
                    setBusy(false);
                }
            }
        }
        run();
        return () => { cancelled = true; };
    }, [open, taskId, task, suppressPropSyncUntil]);


    useEffect(() => { if (!open) setEdit(false) }, [open])

    const assignedByEmail = local?.assigned_by ?? local?.raw?.assigned_by ?? null;
    const myEmail = profile?.email ?? null;

    const isOwnerEditor = (userRole === "editor") && assignedByEmail && myEmail && (assignedByEmail === myEmail);
    const isAdmin = (userRole === "admin") || isOwnerEditor;

    const perms = {
        canEditAll: isAdmin,
        canMarkDone: userRole !== "viewer",
        canAssign: isAdmin,
        canDelete: isAdmin,
        canToggleEdit: isAdmin,
        canLogTime: isAdmin,
        canEditTimeEntry: isAdmin,

    };

    /* ── Mutators ─────────────────────────── */


    // function mutate(patch: Partial<DrawerTask>) {
    //     const startdate = patch.start_date ?? dates.start;
    //     const dueDate = patch.due_date ?? dates.due;

    //     setDates({ start: startdate, due: dueDate });

    //     const date1 = new Date(startdate);
    //     const date2 = new Date(dueDate);

    //     if (startdate && dueDate && date1 > date2) {
    //         toast.error("Start date cannot be after due date");
           
    //     } else {
    //         setError('');
    //     }

    //     setLocal((t) => (t ? { ...t, ...patch } : t));

    // }

    function mutate(patch: Partial<DrawerTask>) {
        // 1. नई (संभावित) start/due dates प्राप्त करें
        const startdate = patch.start_date ?? dates.start;
        const dueDate = patch.due_date ?? dates.due;
    
        // 2. Date objects बनाएं
        const date1 = new Date(startdate);
        const date2 = new Date(dueDate);
    
        // 3. Validation (मान्यता) करें: Start Date > Due Date
        if (startdate && dueDate && date1 > date2) {
            
            // --- इनपुट को बदलने से रोकने का लॉजिक ---
            
            // ❌ Error toast दिखाएँ
            toast.error("Start date cannot be after due date");
            
            // 💡 1. dates state को पिछली सही वैल्यू पर रीसेट करें
            setDates({ start: dates.start, due: dates.due });
            
            // 💡 2. local state (जिससे input की value मिलती है) को भी रीसेट करें
            // हम local state को भी पुरानी start_date पर वापस ले जाएंगे
            setLocal((t) => (t ? { ...t, start_date: dates.start } : t));
            
            // ----------------------------------------
            
        } else {
            // यदि कोई error नहीं है
            
            // 4. State को नई valid dates के साथ अपडेट करें
            setDates({ start: startdate, due: dueDate });
            
            // 5. local state को नई valid patch के साथ अपडेट करें
            setLocal((t) => (t ? { ...t, ...patch } : t));
        }
    }


    function minutesSplit(mins = 0) { return { h: Math.floor(mins / 60), m: mins % 60 }; }
    function toDatetimeLocalValue(ts: number | string) {
        const d = new Date(typeof ts === "number" ? ts : ts);
        const off = d.getTimezoneOffset();
        const dLocal = new Date(d.getTime() - off * 60000);
        return dLocal.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    }

    function update(path: string, value: any) {
        setLocal((cur) => {
            if (!cur) return cur
            const next = structuredClone(cur) as any
            const keys = path.split(".")
            let ref = next
            for (let i = 0; i < keys.length - 1; i++) {
                ref[keys[i]] = ref[keys[i]] ?? {}
                ref = ref[keys[i]]
            }
            ref[keys.at(-1)!] = value
            return next
        })
    }

    const changedKeys = useMemo(() => {
        if (!original.current || !local) return []
        const fields: (keyof DrawerTask)[] = [
            "title", "status", "priority", "start_date", "due_date", "internal_notes", "description_html"
        ]
        const list: string[] = []
        for (const k of fields) {
            const a = k === "description_html" ? stripHtml(original.current[k] || "") : (original.current[k] ?? "")
            const b = k === "description_html" ? stripHtml(local[k] || "") : (local[k] ?? "")
            if (String(a) !== String(b)) list.push(String(k).replace("_", " "))
        }
        return list
    }, [local])

    const hasNonAssignChanges = changedKeys.length > 0


    async function handleSave() {
        if (!local) return
        if (!local.title?.trim()) { toast.error("Please provide a title."); return }
        try {
            setBusy(true)
            await saveInternal(local)
            toast.success("Task updated")
            await onUpdate?.()
            setEdit(false)
            original.current = local
        } catch (e: any) {
            toast.error(e?.message || "Failed to update task")
        } finally {
            setBusy(false)
        }
    }

    async function handleDelete() {
        if (!local) return
        try {
            setDeleteBusy(true)
            await deleteInternal(local.id)
            toast.success("Task deleted")
            onClose()
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete task")
        } finally {
            setDeleteBusy(false)
        }
    }

    async function handleAssign(nextUser: UserRef) {
        if (!local) return
        try {
            setAssignBusy(true)
            await assignInternal(local.id, nextUser.id === null ? null : String(nextUser.id))
            mutate({ assignee_id: nextUser.id, assignee_name: nextUser.name })
            update("activity", [...(local?.activity || []), { t: "assigned", at: Date.now(), by: nextUser.id }])
            toast.success("Assignee updated")
            // Reflect in local "original" too so Save won't nag unless other edits exist
            original.current = { ...(original.current as DrawerTask), assignee_id: nextUser.id, assignee_name: nextUser.name }
            await onUpdate?.()
        } catch (e: any) {
            toast.error(e?.message || "Failed to update assignee")
        } finally {
            setAssignBusy(false)
        }
    }

    async function handleComplete() {
        if (!local) return
        try {
            setCompleteBusy(true)
            await completeInternal(local.id)
            mutate({ status: "completed" })
            toast.success("Activity marked as completed")
            original.current = { ...(original.current as DrawerTask), status: "completed" }
            await onUpdate?.()

        } catch (e: any) {
            toast.error(e?.message || "Failed to complete activity")
        } finally {
            setCompleteBusy(false)
        }
    }

    // --- NEW: project-scoped assignee options (mirror of UniversalTaskCreationDrawer) ---
    const selectedProjectIdNum = useMemo(() => {
        const pid = local?.project_id;
        return pid != null ? Number(pid) : null;
    }, [local?.project_id]);

    type AssigneeOpt = UserRef & {
        meta?: {
            isPending?: boolean;
            invitationStatus?: string;
            memberId?: string | number;
            addedByName?: string | null;
            addedByEmail?: string | null;
        };
    };


    const projectAssigneeOptions: AssigneeOpt[] = useMemo(() => {
        if (!selectedProjectIdNum) return [];

        // Filter rawMembers to only those mapped to this project
        const eligible = (rawMembers || []).filter((m: any) =>
            Array.isArray(m.projects) &&
            m.projects.some((p: any) => Number(p.project_id) === selectedProjectIdNum)
        );

        // Build options with pending flag (tooltip/disabled)
        const options = eligible.map((m: any) => {
            const proj = (m.projects || []).find((p: any) => Number(p.project_id) === selectedProjectIdNum);
            const invitationStatus = proj?.invitation_status || "Accepted";
            const isPending = invitationStatus === "Pending";

            const addedByName = proj?.added_by?.name ?? null;
            const addedByEmail = proj?.added_by?.email ?? null;

            return {
                id: (m.member_email || m.member_id || "").toString(),
                name: m.member_name || (m.member_email || "").toString(),
                role: "Member",
                meta: {
                    isPending,
                    invitationStatus,
                    memberId: m.member_id,
                    addedByName,
                    addedByEmail,
                },
            } as AssigneeOpt;
        });


        // Ensure current assignee stays visible at top even if not mapped
        const curId = (local?.assignee_id ?? "").toString();
        if (curId && !options.some(o => o.id.toString() === curId)) {
            options.unshift({
                id: curId,
                name: (local?.assignee_name ?? curId).toString(),
                role: "Member",
            });
        }

        // Sort with current first, then by name
        return options.sort((a, b) => {
            if (String(a.id) === curId) return -1;
            if (String(b.id) === curId) return 1;
            return String(a.name).localeCompare(String(b.name));
        });
    }, [rawMembers, selectedProjectIdNum, local?.assignee_id, local?.assignee_name]);

    // console.log(projectAssigneeOptions);

    // Skeleton row (shimmer) only for this list
    const TimeLogSkeletonRow: React.FC<{ i: number }> = ({ i }) => (
        <motion.div
            key={`sk-${i}`}
            className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-2 animate-pulse"

        >
            <div className="flex items-start gap-2 w-full">
                <div className="mt-1 h-7 w-7 rounded-full bg-blue-50 ring-1 ring-gray-200" />
                <div className="flex-1 space-y-1">
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                    <div className="h-2 w-20 bg-gray-100 rounded" />
                </div>
            </div>
        </motion.div>
    );




    return (
        <>
            <Drawer
                open={open}
                onClose={() => {
                    if (edit && (hasNonAssignChanges)) {
                        const leave = confirm("Discard unsaved changes?")
                        if (!leave) return
                    }
                    onClose()
                }}
                width={820}
                title={
                    <div className="flex items-center gap-2 min-w-0">
                        {edit ? (
                            <input
                                className="w-full max-w-[300px] rounded-md border border-gray-200 px-2.5 py-1.5 text-base outline-none focus-visible:ring-1 focus-visible:ring-blue-200"
                                placeholder="Task title"
                                value={local?.title || ""}
                                onChange={(e) => mutate({ title: e.target.value })}
                                autoFocus
                                disabled={!perms.canEditAll || busy}
                            />
                        ) : (
                            <div className="break-words text-base font-semibold max-w-[350px] " title={local?.title}>
                                {local?.title || (busy ? "Loading…" : "—")}
                            </div>
                        )}
                        <StatusPill value={local?.status} />
                        <PriorityPill value={local?.priority} />
                        {local?.category_name ? (
                            <span
                                className="shrink-0 rounded-full px-2 py-1.5 text-xs  text-gray-700 ring-1 ring-gray-200"
                            >
                                Category Name:  <span className="font-medium text-brand-blue1">{local.category_name}</span>
                            </span>
                        ) : null}
                    </div>
                }
                closeIcon={<X className="w-4 h-4" />}
                extra={
                    <div className="flex items-center gap-1.5">
                        {perms.canToggleEdit && (
                            <Tooltip title={edit ? "Exit edit" : "Edit Task Details"}>
                                <button
                                    onClick={() => setEdit((v) => !v)}
                                    className="rounded-md border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-50"
                                    aria-label="Toggle edit"
                                    disabled={busy}
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip title="More">
                            <button className="rounded-md border border-gray-200 p-1.5 hover:bg-gray-50" aria-label="More" disabled={busy}>
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    </div>
                }
                styles={{
                    body: { padding: 12 },
                    header: { padding: 12, borderBottom: "1px solid #EFF0F6" },
                    footer: { padding: 12, borderTop: "1px solid #EFF0F6" },
                }}
                footer={
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                            {local?.updated_at ? (
                                <>Last updated {relativeTime(local.updated_at)}{local?.last_updated_by ? <> by {local.last_updated_by}</> : null}</>
                            ) : <>&nbsp;</>}
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onClose} disabled={busy}>
                                Cancel
                            </button>
                            {perms.canMarkDone && local?.status !== "completed" && (
                                <>
                                    <Popconfirm
                                        title="Complete activity?"
                                        description="Are you sure you want to mark this activity as completed?"
                                        onConfirm={handleComplete}
                                        okText="Complete"
                                        cancelText="Cancel"
                                        okButtonProps={{ loading: completeBusy }}
                                    >
                                        <button
                                            className="rounded-md border border-green-700 px-3 py-1.5 text-sm hover:bg-green-50 disabled:opacity-50"
                                            disabled={completeBusy || busy}
                                        >
                                            <div className="inline-flex items-center gap-1 text-green-700 ">
                                                {completeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                Mark done
                                            </div>
                                        </button>
                                    </Popconfirm>

                                    {/* {perms.canEditAll && <Popconfirm
                                        title="Update task?"
                                        description={
                                            hasNonAssignChanges
                                                ? `You changed: ${changedKeys.join(", ")}. Proceed with update?`
                                                : "No content changes detected."
                                        }
                                        onConfirm={handleSave}
                                        okText="Update"
                                        cancelText="Cancel"
                                        okButtonProps={{ loading: busy, disabled: !hasNonAssignChanges }}
                                        disabled={!hasNonAssignChanges}
                                    >
                                        <button
                                            className="rounded-md bg-[#1090D0] px-3 py-1.5 text-sm text-white hover:bg-[#0C7FBF] disabled:opacity-50"
                                            disabled={busy || !hasNonAssignChanges}
                                        >
                                            <div className="inline-flex items-center gap-1.5">
                                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                Save changes
                                            </div>
                                        </button>
                                    </Popconfirm>} */}
<Popconfirm
    title="Update task?"
    description={
        hasNonAssignChanges
            ? `You changed: ${changedKeys.join(", ")}. Proceed with update?`
            : "No content changes detected."
    }
    onConfirm={handleSave}
    okText="Update"
    cancelText="Cancel"
    okButtonProps={{ loading: busy, disabled: !hasNonAssignChanges }}
    disabled={!hasNonAssignChanges}
>
    <button
        className="rounded-md bg-[#1090D0] px-3 py-1.5 text-sm text-white hover:bg-[#0C7FBF] disabled:opacity-50"
        disabled={busy || !hasNonAssignChanges}   // <-- this line handles disable logic
    >
        <div className="inline-flex items-center gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
        </div>
    </button>
</Popconfirm>



                                </>
                            )}
                        </div>
                    </div>
                }
            >
                {/* Body */}
                <div className="space-y-3">
                    {/* Role notice */}
                    {userRole === "viewer" && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            You’re viewing this task as a <span className="font-semibold">Viewer</span>. Updates are disabled for your access level.
                        </div>
                    )}
                    {userRole === "editor" && !perms.canEditAll && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                            You’re viewing this task as an <span className="font-semibold">Editor</span>. Only <span className="font-semibold">Mark done</span> is permitted.
                        </div>
                    )}

                    {/* Overview */}
                    <Section title="Task Overview" >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.03 }}>
                                <Label label="Description" />
                                {edit ? (
                                    <textarea
                                        rows={5}
                                        className=" w-full resize-y rounded-md border border-gray-200 p-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                                        value={htmlToText(local?.description_html || "")}
                                        onChange={(e) => update("description_html", (e.target.value))}
                                        disabled={!perms.canEditAll || busy}
                                    />
                                ) : (
                                    <div
                                        className="break-words prose prose-sm max-w-none rounded-md border border-gray-200 p-2"
                                        dangerouslySetInnerHTML={{ __html: local?.description_html || "<em>No description</em>" }}
                                    />
                                )}
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.03 }}>
                                <Label label="Internal notes" />
                                {edit ? (
                                    <textarea
                                        rows={5}
                                        className="w-full resize-y rounded-md border border-gray-200 p-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                                        value={(local?.internal_notes ?? "").normalize?.("NFC") ?? ""}
                                        onChange={(e) => update("internal_notes", e.target.value)}
                                        disabled={!perms.canEditAll || busy}
                                    />
                                ) : (
                                    <div className="break-words prose prose-sm max-w-none rounded-md border border-gray-200 p-2">
                                        {local?.internal_notes || (
                                            <em className="text-gray-500">None</em>
                                        )}
                                    </div>
                                )}
                            </motion.div>

                        </div>
                    </Section>
                    {/* Assignment & Scheduling */}
                    <Section title="Assignment & Scheduling">
                        <motion.div className="flex flex-wrap items-center gap-2">
                            <PickerChip
                                label="Assignee"
                                valueLabel={
                                    <div className="inline-flex items-center gap-1.5">
                                        {assignBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                        <span>{(local?.assignee_name || projectAssigneeOptions.find(o => String(o.id) === String(local?.assignee_id))?.name) || "Unassigned"}</span>
                                    </div>
                                }
                                disabled={!perms.canAssign || assignBusy || busy || !selectedProjectIdNum}
                            >
                                <div className="p-1">
                                    {!selectedProjectIdNum && (
                                        <div className="px-2 py-1 text-xs text-gray-500">
                                            Attach a project to this task to choose eligible assignees.
                                        </div>
                                    )}

                                    {selectedProjectIdNum && projectAssigneeOptions.length === 0 && (
                                        <div className="px-2 py-1 text-xs text-gray-500">
                                            No team members are mapped to this project. Invite them from <a href="/roles-management" className="text-brand-blue1 cursor-pointer">Team Management</a>.
                                        </div>
                                    )}

                                    {projectAssigneeOptions.map((u, idx) => {
                                        const selected = String(u.id) === String(local?.assignee_id);
                                        const isPending = u.meta?.isPending;

                                        const ButtonEl = (
                                            <motion.button
                                                className={`flex gap-1 w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm border ${selected ? "border-blue-200 bg-blue-50" : "border-transparent hover:border-gray-200 "
                                                    } ${assignBusy ? "opacity-60 cursor-not-allowed" : ""} ${isPending ? "text-gray-400 cursor-not-allowed" : " cursor-pointer"}`}
                                                disabled={assignBusy || selected || !!isPending}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 6 }}
                                                transition={{ delay: idx * 0.02 }}
                                            >
                                                <div className="inline-flex items-start gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <UserRound className="h-4 w-4" />
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-sm font-medium">{u.name}</span>
                                                            <span className="text-[11px] text-gray-500">{u.id}</span>

                                                            {u.meta?.addedByName && (
                                                                <Tooltip title={`Added by ${u.meta.addedByName}${u.meta.addedByEmail ? ` (${u.meta.addedByEmail})` : ""}`}>
                                                                    <span className="text-[11px] text-gray-400 hover:text-black underline decoration-dotted">
                                                                        Added by {u.meta.addedByName}
                                                                    </span>
                                                                </Tooltip>
                                                            )}

                                                        </div>
                                                    </div>

                                                </div>

                                                <span className="text-xs text-gray-500 flex gap-1 flex-col">
                                                    {selected ? (
                                                        <span className=" font-semibold text-brand-blue1">
                                                            (current)
                                                        </span>
                                                    ) : null}
                                                    {isPending ? u.meta?.invitationStatus : u.role}
                                                </span>
                                            </motion.button>
                                        );


                                        // Keep Popconfirm for the happy path, wrap disabled option with Tooltip
                                        return isPending ? (
                                            <Tooltip key={String(u.id)} title="Invitation pending" placement="right">
                                                <div>{ButtonEl}</div>
                                            </Tooltip>
                                        ) : (
                                            <Popconfirm
                                                key={String(u.id)}
                                                title="Change assignee"
                                                description={`Assign to ${u.name}`}
                                                onConfirm={() => handleAssign({ id: u.id, name: u.name })}
                                                okText="Update"
                                                cancelText="Cancel"
                                                okButtonProps={{ loading: assignBusy }}
                                                disabled={assignBusy || selected}
                                            >
                                                {ButtonEl}
                                            </Popconfirm>
                                        );
                                    })}

                                    <div className="my-1 h-px bg-gray-200" />
                                    <Popconfirm
                                        title="Assign to yourself?"
                                        description="This action will remove the current assignee, if any."
                                        onConfirm={() => handleAssign({ id: null as any, name: "Unassigned" })}
                                        okText="Confirm"
                                        cancelText="Cancel"
                                        okButtonProps={{ loading: assignBusy }}
                                        disabled={assignBusy || !local?.assignee_id}
                                    >
                                        <button
                                            className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 font-medium text-brand-blue1 disabled:cursor-not-allowed"
                                            disabled={assignBusy || !local?.assignee_id}
                                        >
                                            <UserRound className="h-4 w-4" />
                                            Assign to yourself </button>
                                    </Popconfirm>
                                </div>
                            </PickerChip>


                            <PickerChip label="Priority" valueLabel={<PriorityInline value={local?.priority} />} disabled={!perms.canEditAll || busy}>
                                {(["low", "medium", "high"] as DrawerPriority[]).map((p, idx) => {
                                    const isActive = local?.priority === p;
                                    return (
                                        <motion.button
                                            key={p}
                                            className={
                                                "block w-full rounded-md px-2 py-1.5 text-left text-sm " +
                                                (isActive
                                                    ? "bg-blue-50 text-blue-700 font-medium"
                                                    : "hover:bg-gray-50 text-gray-800")
                                            } onClick={() => mutate({ priority: p })}
                                            disabled={busy}
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                            transition={{ delay: idx * 0.02 }}
                                        >
                                            <PriorityInline value={p} />
                                        </motion.button>
                                    )
                                })}
                            </PickerChip>

                            <PickerChip label="Status" valueLabel={<StatusInline value={local?.status} />} disabled={!perms.canEditAll || busy}>
                                {(["not_started", "working", "under_review"] as DrawerStatus[]).map((s, idx) => {
                                    const isActive = local?.status === s;
                                    return (
                                        <motion.button
                                            key={s}
                                            className={
                                                "block w-full rounded-md px-2 py-1.5 text-left text-sm " +
                                                (isActive
                                                    ? "bg-blue-50 text-blue-700 font-medium"
                                                    : "hover:bg-gray-50 text-gray-800")
                                            } onClick={() => mutate({ status: s })}
                                            disabled={busy}
                                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                            transition={{ delay: idx * 0.02 }}
                                        >
                                            <StatusInline value={s} />
                                        </motion.button>
                                    )
                                })}
                            </PickerChip>
                        </motion.div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                                <Label label="Start date" />
                                <input
                                    type="date"
                                    className="w-full rounded-md border border-gray-200 p-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                                    value={local?.start_date || ""}
                                    onChange={(e) => {
                                        mutate({ start_date: e.target.value || null  })
                                        console.log(e.target.value)
                                    }}
                                    disabled={!perms.canEditAll || busy}
                                />
                                {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.03 }}>
                                <Label label="Due date" />
                                <input
                                    type="date"
                                    className="w-full rounded-md border border-gray-200 p-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                                    value={local?.due_date || ""}
                                    onChange={(e) => mutate({ due_date: e.target.value || null  })}
                                    disabled={!perms.canEditAll || busy}
                                />
                                {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}>
                                <Label label="Duration (days)" />
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full rounded-md border border-gray-200 p-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                                    value={
                                        local?.start_date && local?.due_date
                                            ? Math.max(0, Math.ceil((new Date(local.due_date).getTime() - new Date(local.start_date).getTime()) / (1000 * 60 * 60 * 24)))
                                            : local?.duration_days ?? ""
                                    }
                                    onChange={(e) => mutate({ duration_days: Number(e.target.value || 0) })}
                                    disabled={!perms.canEditAll || busy}
                                />
                            </motion.div>
                        </div>
                    </Section>

                    {/* Time & Activity */}
                    <Section title="Time & Activity"
                        right={
                            <span className="text-xs text-gray-500">
                                {
                                    (() => {
                                        const fromLogs = totalMins(local?.time_logs)
                                        const fromApi = (Number(local?.time_spent_hours || 0) * 60) + Number(local?.time_spent_minutes || 0)
                                        const total = Math.max(fromLogs, fromApi)
                                        return hm(total) + " total"
                                    })()
                                }
                            </span>
                        }
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            {perms.canLogTime ? (
                                <>
                                    <Popconfirm title="Update time?" description="Add 15 minutes to this activity?" okText="Update" cancelText="Cancel"
                                        onConfirm={() => confirmPatchTime(15)}>
                                        <span><QuickBtn onClick={() => { }} label="+ 15m" /></span>
                                    </Popconfirm>
                                    <Popconfirm title="Update time?" description="Add 30 minutes to this activity?" okText="Update" cancelText="Cancel"
                                        onConfirm={() => confirmPatchTime(30)}>
                                        <span><QuickBtn onClick={() => { }} label="+ 30m" /></span>
                                    </Popconfirm>
                                    <Popconfirm title="Update time?" description="Add 1 hour to this activity?" okText="Update" cancelText="Cancel"
                                        onConfirm={() => confirmPatchTime(60)}>
                                        <span><QuickBtn onClick={() => { }} label="+ 1h" /></span>
                                    </Popconfirm>
                                </>
                            ) : (
                                <button
                                    className="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-400 cursor-not-allowed"
                                    disabled
                                    title="You don’t have permission to log time on this task."
                                >
                                    + Time
                                </button>
                            )}
                        </div>


                        <LogTimeForm />

                        <List key={timeLogsKey}>
                            <AnimatePresence mode="popLayout">
                                {timeLogsBusy ? (
                                    <TimeLogSkeletonRow key={`s-${0}`} i={0} />
                                ) : (
                                    (local?.time_logs || [])
                                        .slice()
                                        .reverse()
                                        .map((l, idx) => (
                                            <motion.div
                                                key={l.id}
                                                className="flex items-start justify-between w-full rounded-lg border border-gray-200 bg-white p-2"
                                            >
                                                <div className="flex items-center gap-2 w-full">
                                                    <div className="mt-1 rounded-full bg-blue-50 p-1.5 text-blue-700 ring-1 ring-gray-200">
                                                        <Clock className="h-4 w-4" />
                                                    </div>

                                                    {/* view mode */}
                                                    {editLogId !== l.id ? (
                                                        <div className="flex-1 w-full">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="text-sm font-medium">
                                                                    {hm(l.minutes)} {l.note ? <span className="text-gray-500">• {l.note}</span> : null}
                                                                </div>
                                                                {perms.canEditTimeEntry && (
                                                                    <button
                                                                        className="rounded px-2.5 py-0.5 text-xs text-brand-blue1  hover:bg-gray-50 border  border-brand-blue1 cursor-pointer"
                                                                        onClick={() => beginEditLog(l)}
                                                                        aria-label="Edit time log"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{fmtTs(l.ts)}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    className="w-16 rounded-md border border-gray-200 px-2 py-1 text-sm"
                                                                    value={editH}
                                                                    onChange={(e) => setEditH(Number(e.target.value || 0))}
                                                                    disabled={busy}
                                                                />
                                                                <span className="text-xs text-gray-500">hr</span>
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={59}
                                                                    className="w-16 rounded-md border border-gray-200 px-2 py-1 text-sm"
                                                                    value={editM}
                                                                    onChange={(e) =>
                                                                        setEditM(Math.min(59, Math.max(0, Number(e.target.value || 0))))
                                                                    }
                                                                    disabled={busy}
                                                                />
                                                                <span className="text-xs text-gray-500">min</span>
                                                            </div>

                                                            <input
                                                                type="datetime-local"
                                                                className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm cursor-not-allowed"
                                                                value={editTs}
                                                                onChange={(e) => setEditTs(e.target.value)}
                                                                disabled
                                                            />

                                                            <button
                                                                className="rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
                                                                onClick={cancelEditLog}
                                                                disabled={busy}
                                                            >
                                                                Cancel
                                                            </button>

                                                            <button
                                                                className="rounded-md bg-[#1090D0] px-2.5 py-1 text-xs text-white hover:bg-[#0C7FBF] disabled:opacity-50"
                                                                onClick={() => saveEditLog(l)}
                                                                disabled={busy}
                                                            >
                                                                Save
                                                            </button>
                                                        </div>

                                                    )}
                                                </div>

                                            </motion.div>
                                        ))
                                )}
                            </AnimatePresence>

                            {!timeLogsBusy && (local?.time_logs || []).length === 0 && (
                                <div className="text-sm text-gray-500">No time logged yet.</div>
                            )}
                        </List>


                        <List>
                            <AnimatePresence mode="popLayout">
                                {(local?.activity || []).slice().reverse().map((a, idx) => (
                                    <motion.div
                                        key={String(idx)}
                                        className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-2"
                                        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                                        viewport={{ once: true }} transition={{ delay: idx * 0.03 }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#1090D0]" />
                                            <div>
                                                <div className="text-sm font-medium">{activityLabel(a)}</div>
                                                <div className="text-xs text-gray-500">{fmtTs(a.at)}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </List>
                    </Section>

                    {/* Source */}
                    <Section title="Progress URL">
                        <motion.div className="flex flex-wrap gap-2" initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            {/* existing chips... */}
                            {(local?.source?.pages || []).map((p, i) => (
                                <motion.span
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs bg-white"
                                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                    transition={{ delay: i * 0.02 }}
                                >
                                    <a href={p} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                                        <LinkIcon className="h-3.5 w-3.5" />
                                        {p}
                                    </a>

                                    {/* Edit trigger */}
                                    {perms.canEditAll && (
                                        <button
                                            className="ml-1 rounded px-1 py-0.5 hover:bg-gray-50 text-gray-600"
                                            onClick={() => { setEditSourceOpen(true); setNextSource(p); }}
                                            aria-label="Edit source"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </motion.span>
                            ))}

                            {/* If there was no page, show an edit button to set one */}
                            {!local?.source?.pages?.length && perms.canEditAll && (
                                <button
                                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                    onClick={() => { setEditSourceOpen(true); setNextSource(local?.progress || ""); }}
                                >
                                    <Pencil className="h-3.5 w-3.5" /> Add source URL
                                </button>
                            )}

                            <AnimatePresence>
                                {editSourceOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                                        className="basis-full mt-2 flex items-center gap-2"
                                    >
                                        <input
                                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                                            placeholder="https://example.com"
                                            value={nextSource}
                                            onChange={(e) => setNextSource(e.target.value)}
                                        />

                                        <Popconfirm
                                            title="Update source?"
                                            description="Are you sure you want to update the source link for this activity?"
                                            okText="Update"
                                            cancelText="Cancel"
                                            onConfirm={async () => {
                                                if (!local) return;
                                                try {
                                                    setBusy(true);
                                                    await patchPartial(local.id, { progress: nextSource || "" });

                                                    // reflect everywhere locally
                                                    mutate({
                                                        progress: nextSource || "",
                                                        source: { pages: nextSource ? [nextSource] : [] as string[], insights: local?.source?.insights || [] }
                                                    });
                                                    original.current = { ...(original.current as any), progress: nextSource || "" };

                                                    setEditSourceOpen(false);
                                                    await onUpdate?.();
                                                    toast.success("Source updated");
                                                } catch (e: any) {
                                                    toast.error(e?.message || "Failed to update source");
                                                } finally {
                                                    setBusy(false);
                                                }
                                            }}
                                            onCancel={() => setEditSourceOpen(false)}
                                        >
                                            <button className="rounded-md bg-[#1090D0] px-2.5 py-1 text-xs text-white hover:bg-[#0C7FBF]" disabled={busy}>Save</button>
                                        </Popconfirm>

                                        <button className="rounded-md border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50" onClick={() => setEditSourceOpen(false)} disabled={busy}>Cancel</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </Section>

                    <Section title="Comments">
                        <List>
                            <AnimatePresence mode="popLayout">
                                {(local?.comments || []).map((c, idx) => (
                                    <motion.div
                                        key={c.id}
                                        className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-2"
                                        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                                        viewport={{ once: true }} transition={{ delay: idx * 0.03 }}
                                    >
                                        <div className="text-sm">
                                            <div className="font-medium">
                                                {c.user_id || "Unknown"} <span className="text-xs text-gray-500">• {fmtTs(c.ts)}</span>
                                            </div>
                                            <div>{c.text}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </List>
                        <CommentInput
                            onSend={(text) => {
                                const c = { id: "c" + Math.random().toString(36).slice(2), user_id: local?.assignee_id ?? "You", ts: Date.now(), text }
                                update("comments", [...(local?.comments || []), c])
                                update("activity", [...(local?.activity || []), { t: "comment", at: Date.now(), by: c.user_id, msg: text }])
                            }}
                        />
                    </Section>

                    {/* Danger zone */}
                    {(onDelete || api?.baseUrl) && perms.canDelete && (
                        <motion.div className="rounded-md border border-red-200 bg-red-50 p-3 space-x-2" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                            <div className="mb-2 text-sm font-semibold text-red-700 inline-flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                Danger zone
                            </div>
                            <Popconfirm
                                title="Delete task?"
                                description="This action cannot be undone."
                                onConfirm={handleDelete}
                                okText="Delete"
                                cancelText="Cancel"
                                okButtonProps={{ loading: deleteBusy, danger: true }}
                            >
                                <button className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                    disabled={deleteBusy}>
                                    <Trash2 className="h-4 w-4" />
                                    Delete task
                                </button>
                            </Popconfirm>
                        </motion.div>
                    )}
                </div>
            </Drawer>
        </>
    )

    /* ── Local helpers ───────────────────── */

    function LogTimeForm() {

        const [mins, setMins] = useState(30)
        const [note, setNote] = useState("")
        const cls = (...xs) => xs.filter(Boolean).join(" ")

        if (!perms.canLogTime) return null;

        return (
            <div className="wr-addline mt-2 space-x-2">
                <input type="number" min={1} className="border px-4 py-1 rounded-md" value={mins} onChange={e => setMins(Number(e.target.value || 0))} disabled={busy} />
                <span className="wr-muted">min</span>
                <Popconfirm
                    title="Update time?"
                    description={`Add ${mins} minutes to this activity?`}
                    okText="Update"
                    cancelText="Cancel"
                    onConfirm={() => { if (mins > 0) { confirmPatchTime(mins); setNote(""); } }}
                >
                    <span>
                        <button onClick={() => { }} className="  px-3 py-1 rounded-md bg-brand-blue1 hover:bg-brand-blue1/80  text-white cursor-pointer" >Log</button>
                    </span>
                </Popconfirm>
            </div>
        )
    }

    function logTime(mins: number) {
        if (!perms.canLogTime) return;
        const entry = { id: "t" + Math.random().toString(36).slice(2), user_id: local?.assignee_id ?? null, minutes: mins, note: "", ts: Date.now() }
        update("time_logs", [...(local?.time_logs || []), entry])
        update("activity", [...(local?.activity || []), { t: "time", at: Date.now(), by: entry.user_id, minutes: mins }])
    }
    async function confirmPatchTime(mins: number) {
        if (!perms.canLogTime || !local) return;
        try {
            setBusy(true);
            setTimeLogsBusy(true);

            const curH = Number(local.time_spent_hours || 0);
            const curM = Number(local.time_spent_minutes || 0);
            const next = addMinutesToHM(curH, curM, mins);

            await patchPartial(local.id, {
                time_spent_hours: next.h,
                time_spent_minutes: next.m,
            });

            // IMPORTANT: do not push any new log rows; just sync totals everywhere
            mutate({ time_spent_hours: next.h, time_spent_minutes: next.m });

            // Keep original in sync so the footer “Save” does not light up
            original.current = { ...(original.current as any), time_spent_hours: next.h, time_spent_minutes: next.m };
            setSuppressPropSyncUntil(Date.now() + 1500);
            // If other views depend on the same record, notify parent to refresh
            await onUpdate?.();
            setTimeLogsKey(k => k + 1);
            toast.success(`Time updated: +${mins}m`);
        } catch (e: any) {
            toast.error(e?.message || "Failed to update time");
        } finally {
            setTimeLogsBusy(false);
            setBusy(false);
        }
    }
    function beginEditLog(l: { id: string; minutes: number; note?: string; ts: number | string }) {
        const { h, m } = minutesSplit(l.minutes);
        setEditLogId(l.id);
        setEditH(h);
        setEditM(m);
        setEditNote(l.note || "");
        setEditTs(toDatetimeLocalValue(l.ts));
    }

    function cancelEditLog() {
        setEditLogId(null);
    }

    async function saveEditLog(l: { id: string; minutes: number; ts: number | string }) {
        if (!local) return;
        const newTotalMins = Math.max(0, Number(editH || 0) * 60 + Number(editM || 0));
        const delta = newTotalMins - Number(l.minutes || 0);

        try {
            setBusy(true);
            setTimeLogsBusy(true);

            // bump task totals by delta
            const curH = Number(local.time_spent_hours || 0);
            const curM = Number(local.time_spent_minutes || 0);
            const next = addMinutesToHM(curH, curM, delta);

            await patchPartial(local.id, {
                time_spent_hours: next.h,
                time_spent_minutes: next.m,
            });

            // update the edited row locally (minutes, ts, note)
            const newTs = editTs ? new Date(editTs).getTime() : Date.now();
            const nextLogs = (local.time_logs || []).map(x => x.id === l.id
                ? { ...x, minutes: newTotalMins, ts: newTs, note: editNote }
                : x
            );

            mutate({ time_spent_hours: next.h, time_spent_minutes: next.m, time_logs: nextLogs });
            original.current = { ...(original.current as any), time_spent_hours: next.h, time_spent_minutes: next.m };
            setSuppressPropSyncUntil(Date.now() + 1500);
            setEditLogId(null);
            setTimeLogsKey(k => k + 1);
            await onUpdate?.();
            toast.success("Time log updated");
        } catch (e: any) {
            toast.error(e?.message || "Failed to update time log");
        } finally {
            setTimeLogsBusy(false);
            setBusy(false);
        }
    }



    function activityLabel(it: any) {
        switch (it.t) {
            case "created": return "Task created"
            case "assigned": return `Assigned to user`
            case "status": return `Status changed: ${statusLabel(it.from)} → ${statusLabel(it.to)}`
            case "comment": return "New comment"
            case "time": return `Time logged (${minutesToHM(it.minutes)})`
            case "reopened": return "Task reopened"
            case "cancelled": return "Task cancelled"
            default: return it.t
        }
    }
}

/* ═════════ Small UI pieces ═════════ */

function Section({ title, children, hint, right }: { title: React.ReactNode; children: React.ReactNode; hint?: string; right?: React.ReactNode }) {
    return (
        <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="text-sm font-semibold text-gray-800">{title}</div>
                <div className="text-xs text-gray-500">{right || hint}</div>
            </div>
            {children}
        </motion.section>
    )
}

function Label({ label, hint }: { label: string; hint?: string }) {
    return (
        <div className="mb-1 text-xs font-medium text-gray-600">
            {label} {hint ? <span className="text-gray-400">— {hint}</span> : null}
        </div>
    )
}
function List({ children }: { children: React.ReactNode }) {
    return <div className="mt-2 flex flex-col gap-2">{children}</div>
}
function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
    return <button onClick={onClick} className="rounded-md border border-gray-200 px-2 py-1 text-sm hover:bg-gray-50">{label}</button>
}

function CommentInput({ onSend }: { onSend: (text: string) => void }) {
    const [v, setV] = useState("")

    const isDisabled = !v.trim()

    return (
        <div className="mt-2 flex items-center gap-2">
            <input
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 
          ${isDisabled
                        ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 bg-white text-black focus-visible:ring-blue-200"}`
                }
                placeholder="Write a comment… (Ctrl/Cmd+Enter to send)"
                value={v}
                onChange={(e) => setV(e.target.value)}
                onKeyDown={(e) => {
                    if (!isDisabled && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        onSend(v.trim())
                        setV("")
                    }
                }}
                disabled={isDisabled}
            />
            <button
                className={`rounded-md px-3 py-2 text-sm text-white 
          ${isDisabled
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-[#1090D0] hover:bg-[#0C7FBF]"}`
                }
                onClick={() => {
                    if (!isDisabled) {
                        onSend(v.trim())
                        setV("")
                    }
                }}
                disabled={isDisabled}
            >
                Send
            </button>
        </div>
    )
}


function PickerChip({ label, valueLabel, children, disabled }: { label: string; valueLabel?: React.ReactNode; children: React.ReactNode; disabled?: boolean }) {
    const [open, setOpen] = useState(false)
    const menuRef = useOutsideClose<HTMLDivElement>(() => setOpen(false));

    return (
        <div className="relative" ref={menuRef}>
            <button
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-800">{valueLabel}</span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-10 mt-1 min-w-[240px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
                    // NOTE: removed onMouseLeave so AntD Popconfirm inside stays interactive
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function StatusPill({ value }: { value?: DrawerStatus }) {
    const label = value ? statusLabel(value) : "—"
    const color =
        value === "not_started" ? "bg-gray-50 text-gray-700 ring-gray-200"
            : value === "working" ? "bg-blue-50 text-blue-700 ring-blue-200"
                : value === "under_review" ? "bg-orange-50 text-orange-700 ring-orange-200"
                    : value === "completed" ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-gray-50 text-gray-700 ring-gray-200"

    return <span className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${color}`}>{label}</span>
}
function StatusInline({ value }: { value?: DrawerStatus }) {
    const color =
        value === "working" ? "text-[#1090D0]"
            : value === "under_review" ? "text-[#FF9F43]"
                : value === "completed" ? "text-[#28C76F]"
                    : "text-gray-700"

    return <span className={color}>{statusLabel(value || "not_started")}</span>
}
function PriorityPill({ value }: { value?: DrawerPriority }) {
    const l = caps(value)
    const c =
        value === "critical" ? "bg-red-50 text-red-700 ring-red-200"
            : value === "high" ? "bg-orange-50 text-orange-700 ring-orange-200"
                : value === "medium" ? "bg-amber-50 text-amber-700 ring-amber-200"
                    : "bg-gray-50 text-gray-700 ring-gray-200"
    return <span className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${c}`}>{l}</span>
}
function PriorityInline({ value }: { value?: DrawerPriority }) {
    const l = caps(value)
    const c =
        value === "critical" ? "text-red-600"
            : value === "high" ? "text-orange-600"
                : value === "medium" ? "text-amber-600"
                    : "text-gray-700"
    return <span className={c}>{l}</span>
}

/* ═════════ Utils ═════════ */

function caps(v?: string | null) { return v ? v.charAt(0).toUpperCase() + v.slice(1) : "—" }
function statusLabel(s: DrawerStatus | string) {
    switch (s) {
        case "not_started": return "Not Started"
        case "working": return "Working"
        case "under_review": return "Under Review"
        case "completed": return "Completed"
        default: return String(s)
    }

}
function relativeTime(ts: number | string) {
    const t = typeof ts === "number" ? ts : new Date(ts).getTime()
    const d = Math.round((Date.now() - t) / 1000)
    if (d < 60) return `${d}s ago`
    if (d < 3600) return `${Math.round(d / 60)}m ago`
    if (d < 86400) return `${Math.round(d / 3600)}h ago`
    return `${Math.round(d / 86400)}d ago`
}
function hm(mins = 0) { const h = Math.floor(mins / 60), m = mins % 60; return `${h}h ${String(m).padStart(2, "0")}m` }
function totalMins(logs?: { minutes: number }[]) { return (logs || []).reduce((a, b) => a + (b.minutes || 0), 0) }
function fmtTs(ts: number | string) { const d = new Date(typeof ts === "number" ? ts : ts); return d.toLocaleString() }
function escapeHtml(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") }
function stripHtml(h: string) { return h.replace(/<\/?[^>]+(>|$)/g, "").trim() }

function htmlToText(h = "") { return String(h || "").replace(/<br\s*\/>/gi, "\n").replace(/<\/p>\s*<p>/gi, "\n").replace(/<\/?[^>]+(>|$)/g, "") }
function minutesToHM(mins = 0) { const h = Math.floor(mins / 60), m = mins % 60; return `${h}h ${String(m).padStart(2, "0")}m` }
function addMinutesToHM(h = 0, m = 0, add = 0) {
    const total = Math.max(0, (Number(h) * 60) + Number(m) + Number(add || 0));
    return { h: Math.floor(total / 60), m: total % 60 };
}

