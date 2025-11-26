"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cookies from "js-cookie";
import { toast } from "sonner";

import { BASE_URL_WR } from "@/src/util/api";
import {
  fetchGlobalTemplates,
  selectTemplates,
  selectTemplatesLoading,
} from "@/src/redux/reducer/campaignReducer";
import { fetchTeamDetails, selectMembersRaw } from "@/src/redux/reducer/teamReducer";
import { FileText, User } from "lucide-react";
import { Modal, Select, Tooltip } from "antd";

/* ───────────────────────── Design Tokens (Wranker) ───────────────────────── */
const TK = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#0077FF",
  text: "#111827",
  title: "#000000",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  subtle: "#F5F7FA",
  focus: "#D2EFFF",
  radius: 10,
  shadow: "0 16px 50px rgba(0,0,0,.22)",
  backdrop: "rgba(17,24,39,0.45)",
  z: 1100,
};

/* ───────────────────────── Utilities ───────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const addDaysISO = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const isWeekendISO = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const wd = d.getDay(); // 0=Sun 6=Sat
  return wd === 0 || wd === 6;
};
const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const PREVIEW_HEADERS: Array<{ key: string; label: string }> = [
  { key: "index", label: "#" },
  { key: "title", label: "Task title" },
  { key: "duration", label: "Duration" },
  { key: "due", label: "Est. due date" },
  { key: "priority", label: "Priority" },
  { key: "assignee", label: "Assignee" },
];

const PREVIEW_COLUMN_STYLE: Record<string, React.CSSProperties> = {
  checkbox: { width: 48, minWidth: 48 },
  index: { width: 60, minWidth: 50 },
  title: { minWidth: 240 },
  duration: { width: 110, minWidth: 100 },
  due: { minWidth: 200 },
  priority: { width: 120, minWidth: 110 },
  assignee: { minWidth: 240 },
};

const PREVIEW_TABLE_MIN_WIDTH = 960;

/* ───────────────────────── Types ───────────────────────── */
type Row = {
  id: string; // "cat-123"
  title: string;
  campaignType: string;
  taskCount: number;
  updatedAt: string; // ISO
  projectCount: number;
  activities?: Array<{
    id: string | number;
    title: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    is_published?: boolean;
  }>;
};

type Priority = "High" | "Medium" | "Low";
type TaskForPreview = { title: string; durationDays: number; priority: Priority };
type PreviewRow = {
  idx: number;
  title: string;
  durationDays: number;
  estDue: string;
  priority: Priority;
  weekend: boolean;
};

/* Activities → Tasks mapping (same defaults as table: 1 day, first two High).  */
/* Ref: Filters&TemplateTableListView mapping of activities → compact task list.  */
function tasksFromActivities(acts: Row["activities"]): TaskForPreview[] {
  return (acts || []).map((a, i) => ({
    title: a.title,
    durationDays: 1,
    priority: i < 2 ? "High" : "Medium",
  }));
}

/* Build preview schedule (sequential: N+1 starts after N completes; non‑seq: due = start+duration-1) */
function computePreview(tasks: TaskForPreview[], startISO: string, sequential: boolean): {
  rows: PreviewRow[];
  lastDue: string;
  weekendCount: number;
} {
  const rows: PreviewRow[] = [];
  let cursor = startISO;
  let last = startISO;

  tasks.forEach((t, i) => {
    const start = sequential ? cursor : startISO;
    const due = addDaysISO(start, Math.max(1, t.durationDays) - 1);
    if (sequential) cursor = addDaysISO(due, 1);
    last = due;
    rows.push({
      idx: i + 1,
      title: t.title,
      durationDays: t.durationDays,
      estDue: due,
      priority: t.priority,
      weekend: isWeekendISO(due),
    });
  });

  return { rows, lastDue: last, weekendCount: rows.filter((r) => r.weekend).length };
}

/* ───────────────────────── Component ───────────────────────── */
export const TaskTemplateDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}> = ({ open, onClose, projectId, projectName }) => {
  const dispatch = useDispatch();
  const templateData = useSelector(selectTemplates) as any[] | undefined;
  const loading = useSelector(selectTemplatesLoading) as boolean;
  const rawMembers = useSelector(selectMembersRaw) as any[] | undefined;
  const selectedProjectIdNum = projectId ? Number(projectId) : null;

  /* Load catalogue when opened (idempotent) */
  useEffect(() => {
    if (!open) return;
    if (!templateData || templateData.length === 0) {
      dispatch(fetchGlobalTemplates() as any);
    }
  }, [open, templateData, dispatch]);
  useEffect(() => {
    if (!open) return;
    dispatch(fetchTeamDetails({ force: false }) as any);
  }, [open, dispatch]);

  /* Flatten campaigns → categories → rows (same shape as page.tsx) */
  const rows: Row[] = useMemo(() => {
    const flat: Row[] = [];
    (templateData || []).forEach((camp: any) => {
      (camp?.categories || []).forEach((cat: any) => {
        const latest = (cat.activities || []).reduce((acc: string, a: any) => {
          const t = a?.updated_at || a?.created_at || "";
          return t && (!acc || new Date(t) > new Date(acc)) ? t : acc;
        }, "");
        flat.push({
          id: `cat-${cat.id}`,
          title: cat.template_name,
          campaignType: camp.campaign_name,
          activities: cat.activities,
          taskCount: (cat.activities || []).length,
          updatedAt: latest || new Date().toISOString(),
          projectCount: cat?.project_count || 0,
        });
      });
    });
    return flat;
  }, [templateData]);

  /* Search + filter (campaign) */
  const [q, setQ] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string>("All");
  const campaigns = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(String(r.campaignType)));
    return ["All", ...Array.from(s)];
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQ = !qq || r.title.toLowerCase().includes(qq);
      const matchesC = campaignFilter === "All" || String(r.campaignType) === campaignFilter;
      return matchesQ && matchesC;
    });
  }, [rows, q, campaignFilter]);
  const membersForProject = useMemo(() => {
    if (!selectedProjectIdNum) return [];
    return (rawMembers || []).filter(
      (m: any) =>
        Array.isArray(m.projects) && m.projects.some((p: any) => Number(p.project_id) === selectedProjectIdNum)
    );
  }, [rawMembers, selectedProjectIdNum]);
  const assigneeOptions = useMemo(() => {
    if (!selectedProjectIdNum) return [];
    const projectMembers = membersForProject.map((m: any) => {
      const proj = (m.projects || []).find((p: any) => Number(p.project_id) === selectedProjectIdNum);
      const invitationStatus = proj?.invitation_status || "Accepted";
      const isPending = invitationStatus === "Pending";
      return {
        value: m.member_email,
        label: `${m.member_name} (${m.member_email})`,
        disabled: isPending,
        meta: { isPending, invitationStatus },
      };
    });
    return [
      {
        value: "__self__",
        label: "Assign to yourself",
        disabled: false,
        meta: { isSelf: true },
      },
      ...projectMembers,
    ];
  }, [membersForProject, selectedProjectIdNum]);


  /* Selection + scheduling */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    // reset selection when it opens
    setSelectedId(null);
    setQ("");
    setCampaignFilter("All");
    setStartDate(todayISO());
    setSequential(true);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev && filtered.some((r) => r.id === prev)) return prev;
      return filtered[0].id;
    });
  }, [filtered, open]);

  const selected = useMemo(() => filtered.find((r) => r.id === selectedId) || null, [filtered, selectedId]);
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [sequential, setSequential] = useState<boolean>(true);

  const preview = useMemo(() => {
    const tasks = tasksFromActivities(selected?.activities);
    return computePreview(tasks, startDate, sequential);
  }, [selected, startDate, sequential]);

  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [dueDateOverrides, setDueDateOverrides] = useState<Record<string, string>>({});
  const [assigneeSelections, setAssigneeSelections] = useState<Record<string, string>>({});
  const defaultAssigneeValue = useMemo(() => {
    if (!selectedProjectIdNum) return undefined;
    if (membersForProject.length === 0) return "__self__";
    return undefined;
  }, [membersForProject.length, selectedProjectIdNum]);

  useEffect(() => {
    if (!selected?.activities?.length) {
      setSelectedActivityIds([]);
      setDueDateOverrides({});
      return;
    }
    const ids = selected.activities
      .map((a) => (a?.id == null ? undefined : String(a.id)))
      .filter((id): id is string => Boolean(id));
    setSelectedActivityIds(ids);
    setDueDateOverrides({});
  }, [selected]);
  useEffect(() => {
    setAssigneeSelections({});
  }, [selectedId, projectId]);

  useEffect(() => {
    setDueDateOverrides({});
  }, [startDate, sequential]);

  const activities = selected?.activities || [];
  const resolvedAssigneeValues = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    activities.forEach((activity) => {
      if (activity?.id == null) return;
      const key = String(activity.id);
      const manual = assigneeSelections[key];
      map[key] = manual ?? defaultAssigneeValue;
    });
    return map;
  }, [activities, assigneeSelections, defaultAssigneeValue]);
  const handleAssigneeChange = useCallback((activityId: string, value?: string) => {
    if (!activityId) return;
    setAssigneeSelections((prev) => {
      const next = { ...prev };
      if (!value) {
        delete next[activityId];
      } else {
        next[activityId] = value;
      }
      return next;
    });
  }, []);

  const baseDueDates = useMemo(() => {
    const map: Record<string, string> = {};
    activities.forEach((activity, idx) => {
      if (activity?.id == null) return;
      const row = preview.rows[idx];
      if (!row) return;
      map[String(activity.id)] = row.estDue;
    });
    return map;
  }, [activities, preview.rows]);

  const resolvedDueDates = useMemo(() => {
    const map: Record<string, string> = {};
    activities.forEach((activity) => {
      if (activity?.id == null) return;
      const key = String(activity.id);
      map[key] = dueDateOverrides[key] ?? baseDueDates[key] ?? startDate ?? todayISO();
    });
    return map;
  }, [activities, baseDueDates, dueDateOverrides, startDate]);

  const weekendWarnings = useMemo(() => {
    return Object.values(resolvedDueDates).filter((date) => date && isWeekendISO(date)).length;
  }, [resolvedDueDates]);

  const handleDueDateChange = useCallback((activityId: string, dueDate: string) => {
    if (!activityId) return;
    setDueDateOverrides((prev) => {
      if (!dueDate) {
        if (!(activityId in prev)) return prev;
        const next = { ...prev };
        delete next[activityId];
        return next;
      }
      if (prev[activityId] === dueDate) return prev;
      return { ...prev, [activityId]: dueDate };
    });
  }, []);

  const allChecked = activities.length > 0 && selectedActivityIds.length === activities.length;
  const someChecked = selectedActivityIds.length > 0 && !allChecked;

  const toggleAllActivities = useCallback(
    (checked: boolean) => {
      if (!activities.length) {
        setSelectedActivityIds([]);
        return;
      }
      if (checked) {
        const ids = activities
          .map((a) => (a?.id == null ? undefined : String(a.id)))
          .filter((id): id is string => Boolean(id));
        setSelectedActivityIds(ids);
      } else {
        setSelectedActivityIds([]);
      }
    },
    [activities]
  );

  /* Apply */
  const [applying, setApplying] = useState(false);
  const canApply = Boolean(open && projectId && selected && selectedActivityIds.length > 0 && !applying);

  async function applyToProject() {
    if (!selected || !projectId) {
      toast.error("Please select a project and a template first.");
      return;
    }
    if (selectedActivityIds.length === 0) {
      toast.error("Select at least one activity to apply.");
      return;
    }
    try {
      setApplying(true);
      const accessToken = Cookies.get("login_access_token_wrank");
      const activitiesPayload = selectedActivityIds.map((id) => {
        const parsed = Number(String(id).replace(/^\D+/, ""));
        const fallbackParsed = Number(id);
        const normalizedId = Number.isFinite(parsed) && parsed !== 0 ? parsed : Number.isFinite(fallbackParsed) && fallbackParsed !== 0 ? fallbackParsed : id;
        const dueDate = resolvedDueDates[id] || startDate;
        const selectedAssigneeKey = assigneeSelections[id] ?? defaultAssigneeValue;
        const payload: { id: number | string; due_date: string; assigned_to?: string } = {
          id: normalizedId,
          due_date: dueDate,
        };
        if (selectedAssigneeKey && selectedAssigneeKey !== "__self__") {
          payload.assigned_to = selectedAssigneeKey;
        }
        return payload;
      });

      const res = await fetch(`${BASE_URL_WR}apply-activities/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
    project_ids: [Number(projectId)],
    projects: [
      {
        id: Number(projectId),
        activities: activitiesPayload,
      },
    ],
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `HTTP ${res.status}`);
      }

      toast.success(`Template “${selected.title}” applied to ${projectName}.`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to apply template.");
    } finally {
      setApplying(false);
    }
  }

  /* Guards */
  const noProject = !projectId;

  if (!open) return null;

  return (
    
    <Modal
      open={open}
      onCancel={onClose}
      width={1200}
      centered
      maskStyle={{ background: TK.backdrop }}
      zIndex={TK.z}
      footer={null} // we render a custom sticky footer inside the modal body
      bodyStyle={{ padding: 0, maxHeight: "92vh", overflow: "hidden" }}
      destroyOnClose
      maskClosable={false}
      keyboard
      closable={false}
    >      <section
        style={{
          maxHeight: "92vh",
          background: "#fff",
          color: TK.text,
          boxShadow: TK.shadow,
          borderRadius: TK.radius,
          border: `1px solid ${TK.border}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: 14, borderBottom: `1px solid ${TK.borderStrong}`, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
    <div className="flex items-center gap-2">
      <FileText className="w-5 h-5 text-gray-700" aria-hidden="true" />
      <h2 className="m-0 text-lg font-bold text-gray-900">
        Import from Templates
      </h2>
    </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search templates…"
              aria-label="Search templates"
              style={{
                width: 280,
                padding: "8px 10px",
                border: `1px solid ${TK.borderStrong}`,
                borderRadius: 8,
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${TK.focus}`)}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            />
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              aria-label="Campaign type"
              style={{ padding: "8px 10px", border: `1px solid ${TK.borderStrong}`, borderRadius: 8 }}
            >
              {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span title="Selected project" style={{ fontSize: 13, color: TK.muted }}>
              Project:&nbsp;<strong style={{ color: TK.text }}>{projectName || "—"}</strong>
            </span>
            <button onClick={onClose}
                    aria-label="Close"
                    style={{ border: `1px solid ${TK.borderStrong}`, borderRadius: 8, width: 32, height: 32, background: "#fff", cursor: "pointer" }}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 0, minHeight: 420, flex: 1, overflow: "hidden" }}>
          {/* Left: Template list */}
          <div style={{ borderRight: `1px solid ${TK.borderStrong}`, overflowY: "auto" }}>
            {/* Loading */}
            {loading && (
              <div style={{ padding: 12, color: TK.muted, fontSize: 14 }}>Loading templates…</div>
            )}

            {!loading && filtered.length === 0 && (
              <div style={{ padding: 16, color: TK.muted, fontSize: 14 }}>No templates match your filters.</div>
            )}

            {!loading && filtered.map((r) => {
              const active = selectedId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="wr-tpl-row"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 12,
                    borderBottom: `1px solid ${TK.border}`,
                    background: active ? "#008ccd33" : "#fff",
                    cursor: "pointer",
                  }}
                  aria-pressed={active}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="ct" style={{ fontSize: 11, border: `1px solid ${TK.borderStrong}`, padding: "2px 6px", borderRadius: 6 }}>
                      {r.campaignType}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: 14, color: TK.title, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.title}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12, color: TK.muted }}>
                    <span>{r.taskCount} task(s)</span>
                    <span>•</span>
                    <span>Updated {fmtDate(r.updatedAt)}</span>
                    {r.projectCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{r.projectCount} project(s)</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Preview panel */}
          <div style={{ overflowY: "auto" }}>
            {!selected ? (
              <div style={{ padding: 16, color: TK.muted, fontSize: 14 }}>
                Select a template on the left to preview and apply.
              </div>
            ) : (
              <div style={{ padding: 16, display: "grid", gap: 12 }}>
                {/* Selection summary */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: TK.muted }}>Template</div>
                    <div style={{ fontWeight: 700 }}>{selected.title}</div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 12, color: TK.muted }}>Start date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value || todayISO())}
                        style={{ padding: "8px 10px", border: `1px solid ${TK.borderStrong}`, borderRadius: 8 }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontSize: 12, color: TK.muted }}>Sequential flow</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          id="wr-seq"
                          type="checkbox"
                          checked={sequential}
                          onChange={(e) => setSequential(e.target.checked)}
                        />
                        <label htmlFor="wr-seq" style={{ fontSize: 13, color: TK.text }}>Chain tasks by duration</label>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Preview table */}
                <div style={{ border: `1px solid ${TK.borderStrong}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ width: "100%", overflowX: "auto" }}>
                    <table style={{ width: "100%", minWidth: PREVIEW_TABLE_MIN_WIDTH, borderCollapse: "collapse" }}>
                      <thead style={{ background: TK.subtle }}>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            fontSize: 12,
                            borderBottom: `1px solid ${TK.borderStrong}`,
                            ...PREVIEW_COLUMN_STYLE.checkbox,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = someChecked;
                            }}
                            onChange={(e) => toggleAllActivities(e.target.checked)}
                            aria-label="Select all activities"
                          />
                        </th>
                        {PREVIEW_HEADERS.map((col) => (
                          <th
                            key={col.key}
                            style={{
                              textAlign: "left",
                              padding: "8px 10px",
                              fontSize: 12,
                              borderBottom: `1px solid ${TK.borderStrong}`,
                              ...PREVIEW_COLUMN_STYLE[col.key],
                            }}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                      </thead>
                      <tbody>
                      {preview.rows.map((r) => {
                        const activity = activities[r.idx - 1];
                        const activityId = activity?.id == null ? undefined : String(activity.id);
                        const rowChecked = activityId ? selectedActivityIds.includes(activityId) : false;
                        const dueValue = activityId ? resolvedDueDates[activityId] || "" : "";
                        const dueIsWeekend = dueValue ? isWeekendISO(dueValue) : false;
                        const assigneeValue = activityId ? resolvedAssigneeValues[activityId] : undefined;
                        const assigneePlaceholder = !selectedProjectIdNum
                          ? "Select a project first"
                          : membersForProject.length === 0
                          ? "Assign to yourself"
                          : "Select an assignee";
                        return (
                          <tr key={r.idx} style={{ borderTop: `1px solid ${TK.border}` }}>
                            <td style={{ padding: "8px 10px", fontSize: 13, ...PREVIEW_COLUMN_STYLE.checkbox }}>
                              <input
                                type="checkbox"
                                disabled={!activityId}
                                checked={rowChecked}
                                onChange={(e) => {
                                  if (!activityId) return;
                                  setSelectedActivityIds((prev) =>
                                    e.target.checked ? [...new Set([...prev, activityId])] : prev.filter((id) => id !== activityId)
                                  );
                                }}
                                aria-label={`Select ${r.title}`}
                              />
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 13, ...PREVIEW_COLUMN_STYLE.index }}>{r.idx}</td>
                            <td
                              style={{
                                padding: "8px 10px",
                                fontSize: 13,
                                ...PREVIEW_COLUMN_STYLE.title,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span style={{ display: "inline-block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {r.title}
                              </span>
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 13, ...PREVIEW_COLUMN_STYLE.duration }}>{r.durationDays}d</td>
                            <td
                              style={{
                                padding: "8px 10px",
                                fontSize: 13,
                                ...PREVIEW_COLUMN_STYLE.due,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <input
                                type="date"
                                value={dueValue}
                                disabled={!activityId}
                                onChange={(e) => {
                                  if (activityId) handleDueDateChange(activityId, e.target.value);
                                }}
                                style={{ padding: "6px 8px", border: `1px solid ${TK.borderStrong}`, borderRadius: 6, minWidth: 150 }}
                                aria-label={`Update due date for ${r.title}`}
                              />
                              {dueIsWeekend && <span style={{ color: "#F59E0B", fontSize: 12, marginLeft: 8 }}>⚠ weekend</span>}
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 13, ...PREVIEW_COLUMN_STYLE.priority }}>
                              <span
                                style={{
                                  border: `1px solid ${
                                    r.priority === "High" ? "#EA545555" : r.priority === "Medium" ? "#FF9F4355" : "#6C757D55"
                                  }`,
                                  color: r.priority === "High" ? "#EA5455" : r.priority === "Medium" ? "#FF9F43" : "#6C757D",
                                  background: "#fff",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                }}
                              >
                                {r.priority}
                              </span>
                            </td>
                            <td style={{ padding: "8px 10px", fontSize: 13, ...PREVIEW_COLUMN_STYLE.assignee }}>
                              <Select
                                size="small"
                                value={assigneeValue}
                                style={{ minWidth: 200, width: "100%" }}
                                disabled={!activityId || !selectedProjectIdNum}
                                options={assigneeOptions}
                                placeholder={assigneePlaceholder}
                                optionFilterProp="label"
                                showSearch
                                dropdownMatchSelectWidth={false}
                                allowClear={membersForProject.length > 0}
                                onChange={(val) => {
                                  if (!activityId) return;
                                  handleAssigneeChange(activityId, (val as string | undefined) ?? undefined);
                                }}
                                onClear={() => {
                                  if (!activityId) return;
                                  handleAssigneeChange(activityId, undefined);
                                }}
                                notFoundContent={!selectedProjectIdNum ? "Select a project first" : "No members available"}
                                optionRender={(option) => {
                                  if (option.value === "__self__") {
                                    return (
                                      <div className="flex items-center gap-2 font-medium text-brand-blue1">
                                        <User className="w-4 h-4" />
                                        <span>{option.data?.label || "Assign to yourself"}</span>
                                      </div>
                                    );
                                  }

                                  const isPending = option.data?.meta && 'isPending' in option.data.meta ? option.data.meta.isPending : false;
                                  const content = (
                                    <div className={isPending ? "text-gray-400" : ""}>{option.data?.label}</div>
                                  );
                                  return isPending ? (
                                    <Tooltip trigger="hover" title="Invitation pending" placement="right">
                                      {content}
                                    </Tooltip>
                                  ) : (
                                    content
                                  );
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                </div>
                  {/* Summary */}
                  <div style={{ padding: 10, borderTop: `1px solid ${TK.borderStrong}`, display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 13, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                      <span>
                        <strong>Total:</strong> {preview.rows.length} task(s) · <strong>Est. completion:</strong> {fmtDate(preview.lastDue)}
                      </span>
                      <span style={{ fontSize: 12, color: TK.muted }}>Preview is informational; scheduling applies server-side.</span>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <strong>Selected:</strong> {selectedActivityIds.length} of {activities.length} activities
                    </div>
                    {weekendWarnings > 0 && (
                      <div style={{ fontSize: 12, color: "#92400E" }}>
                        ⚠ {weekendWarnings} task{weekendWarnings === 1 ? "" : "s"} land on a weekend. Adjust dates as needed.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 12, borderTop: `1px solid ${TK.borderStrong}`, display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          <div style={{ marginRight: "auto", fontSize: 12, color: TK.muted }}>
            {noProject ? "Please select a project to enable applying." : "Ready to import tasks into the selected project."}
          </div>
          <button
            onClick={onClose}
            style={{ padding: "8px 12px", border: `1px solid ${TK.borderStrong}`, borderRadius: 8, background: "#fff", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={applyToProject}
            disabled={!canApply || noProject}
            title={noProject ? "Select a project first" : "Apply this template"}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: !canApply || noProject ? "#9CCEF0" : TK.brand,
              color: "#fff",
              cursor: !canApply || noProject ? "not-allowed" : "pointer",
            }}
          >
            {applying ? "Applying…" : `Apply to ${projectName || "Project"}`}
          </button>
        </div>
      </section>
    </Modal>
  );
};
