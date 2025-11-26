"use client";

import { useProjectManager } from "@/src/hooks/use-project-manager";
import { BASE_URL_WR } from "@/src/util/api";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";

/* NEW: Framer Motion for animations */
import { AnimatePresence, motion } from "framer-motion";
import { Select, Tooltip } from "antd";
import type { SelectProps } from "antd";
import { User } from "lucide-react";
import { fetchTeamDetails, selectMembersRaw } from "@/src/redux/reducer/teamReducer";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  brand: "#1090D0",
  danger: "#EA5455",
  warn: "#FF9F43",
  low: "#6C757D",
  success: "#28C76F",
  text: "#111827",
  muted: "#6B7280",
  surface: "#FFFFFF",
  backdrop: "rgba(17,24,39,0.5)",
  border: "#E5E7EB",
  shadow: "0 2px 6px rgba(0,0,0,0.05)",
  radius: 16,
};

const MAX_MULTI_PROJECTS = 5;
const BASE_REVIEW_HEADERS = ["#", "Task Title", "Duration", "Est. Due Date", "Priority"];
const ASSIGNEE_COLUMN_WIDTH = 230;
const SELF_ASSIGN_OPTION = { value: "__self__", label: "Assign to yourself", disabled: false, meta: { isSelf: true } };

/* ───────────────────────── Types ───────────────────────── */
type Priority = "High" | "Medium" | "Low";

type TemplateTask = {
  id: string;
  title: string;
  durationDays: number;
  priority: Priority;
  defaultAssigneeId?: string;
};

type TaskPreview = {
  idx: number;
  title: string;
  durationDays: number;
  estDue: string;
  priority: Priority;
  assigneeName?: string;
  weekend: boolean;
};

type Project = { id: string; name: string; memberIds: string[]; role: "admin" | "editor" | "viewer" };
type User = { id: string; name: string };

type ProjectAssigneeConfig = {
  options: SelectProps["options"];
  memberCount: number;
};

type MemberEntry = {
  member_email: string;
  member_name: string;
  invitation_status?: string;
};

type PickerProject = {
  id: number | string;
  name?: string | null;
  domain?: string;
  url?: string;
  canApplyTemplate?: boolean;
  disableReason?: string;
  [key: string]: unknown;
};

/* ───────────────────────── Utilities ───────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
};
const isWeekendISO = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const wd = d.getDay();
  return wd === 0 || wd === 6;
};
const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

function normalizeTemplateTasks(raw?: any[]): TemplateTask[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEMO_TASKS;
  return raw.map((a, i) => ({
    id: String(a.id ?? `t-${i}`),
    title: a.title ?? `Task ${i + 1}`,
    durationDays: Number(a.durationDays ?? 1),
    priority: a.priority === "High" || a.priority === "Medium" || a.priority === "Low" ? a.priority : "Medium",
    defaultAssigneeId: a.defaultAssigneeId,
  }));
}

function toProjectLabel(p: { id: number | string; name?: string | null; domain?: string }) {
  return p?.name || p?.domain || `Project ${p?.id}`;
}

const VIEWER_ACCESS_ROLES = new Set(["viewer", "view"]);
const normalizeText = (value?: unknown) => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  return String(value).trim().toLowerCase();
};
const isViewerAccess = (access?: unknown) => {
  const normalized = normalizeText(access);
  if (!normalized) return false;
  return VIEWER_ACCESS_ROLES.has(normalized);
};
const isSeoDashboardType = (value?: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return normalized === "seo" || normalized.includes("seo");
};
const collectSharedDashboards = (project: any) => {
  const meta = project?.shared_meta ?? project?.raw ?? project;
  const sources = [project?.dashboards, meta?.dashboards, meta?.project?.dashboards];
  for (const source of sources) {
    if (Array.isArray(source) && source.length) {
      return source;
    }
  }
  return [];
};
const sharedProjectHasSeoWriteAccess = (project: any): boolean => {
  const dashboards = collectSharedDashboards(project);
  const fallbackAccess =
    project?.shared_access_type ??
    project?.shared_meta?.shared_access_type ??
    project?.shared_meta?.access_type ??
    "";
  if (!dashboards.length) {
    return fallbackAccess ? !isViewerAccess(fallbackAccess) : false;
  }
  return dashboards.some((dashboard: any) => {
    if (!isSeoDashboardType(dashboard?.type ?? dashboard?.name ?? dashboard?.label)) {
      return false;
    }
    const access = dashboard?.access ?? dashboard?.role ?? dashboard?.permission ?? fallbackAccess;
    return !isViewerAccess(access);
  });
};

/* ───────────────────────── Mock Data (unchanged) ───────────────────────── */
const USERS: User[] = [
  { id: "u1", name: "Aarav Singh" },
  { id: "u2", name: "Priya Sharma" },
  { id: "u3", name: "Rahul Mehta" },
  { id: "u4", name: "Isha Patel" },
  { id: "u5", name: "Guest (Viewer)" },
];

const PROJECTS: Project[] = [
  { id: "p1", name: "Acme.com — SEO", memberIds: ["u1", "u2", "u3"], role: "admin" },
  { id: "p2", name: "Acme Store — Content", memberIds: ["u2", "u4"], role: "editor" },
  { id: "p3", name: "Globex — Marketing", memberIds: ["u1", "u3", "u4"], role: "viewer" },
  { id: "p4", name: "Initech — SEO", memberIds: ["u1", "u2"], role: "editor" },
  { id: "p5", name: "Umbrella — Launch", memberIds: ["u3", "u4"], role: "admin" },
];

const DEMO_TASKS: TemplateTask[] = [
  { id: "t1", title: "Keyword Brief & Scope", durationDays: 2, priority: "High", defaultAssigneeId: "u1" },
  { id: "t2", title: "On-Page Audit", durationDays: 3, priority: "High", defaultAssigneeId: "u2" },
  { id: "t3", title: "Content Outline Draft", durationDays: 2, priority: "Medium", defaultAssigneeId: "u4" },
  { id: "t4", title: "Internal Link Pass", durationDays: 1, priority: "Low" },
  { id: "t5", title: "QA & Publish", durationDays: 2, priority: "Medium", defaultAssigneeId: "u3" },
];

/* ───────────────────────── Scheduling ───────────────────────── */
function computeSchedule(
  tasks: TemplateTask[],
  startISO: string,
  sequential: boolean,
  users: User[],
  assigneeLogic: "none" | "template" | "single",
  singleUserId?: string
) {
  let cursor = startISO;
  const previews: TaskPreview[] = [];
  let lastDue = startISO;
  const singleUser = users.find((u) => u.id === singleUserId);
  tasks.forEach((t, i) => {
    const start = sequential ? cursor : startISO;
    const due = addDays(start, Math.max(1, t.durationDays) - 1);
    if (sequential) cursor = addDays(due, 1);

    let assigneeName: string | undefined;
    if (assigneeLogic === "single" && singleUser) assigneeName = singleUser.name;
    else if (assigneeLogic === "template" && t.defaultAssigneeId) {
      const u = users.find((u) => u.id === t.defaultAssigneeId);
      assigneeName = u?.name || undefined;
    }

    lastDue = due;
    previews.push({
      idx: i + 1,
      title: t.title,
      durationDays: t.durationDays,
      estDue: due,
      priority: t.priority,
      assigneeName,
      weekend: isWeekendISO(due),
    });
  });
  const weekendWarnings = previews.filter((p) => p.weekend).length;
  return { previews, lastDue, weekendWarnings };
}

/* ───────────────────────── Small UI Helpers ───────────────────────── */
function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{children}</div>
      {hint && <div style={{ fontSize: 12, color: TK.muted }}>{hint}</div>}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  border: "1px solid " + TK.border,
  background: "#fff",
  width: 32,
  height: 32,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const tdStyle: React.CSSProperties = { padding: "8px 10px", fontSize: 14 };
const linkBtn: React.CSSProperties = { background: "none", border: "none", padding: 6, color: TK.brand, cursor: "pointer" };

function PriorityPill({ p }: { p: Priority }) {
  const color = p === "High" ? TK.danger : p === "Medium" ? TK.warn : TK.low;
  return (
    <span style={{ border: `1px solid ${color}55`, color, background: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>
      {p}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8 }}>
      <div style={{ fontSize: 12, color: TK.muted }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

/* ───────────────────────── Animated Shell / Stepper ───────────────────────── */
function ModalShell({
  applyOpen,
  onClose,
  title,
  children,
  footer,
}: {
  applyOpen: any;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!applyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyOpen, onClose]);
  useEffect(() => {
    if (applyOpen) ref.current?.focus();
  }, [applyOpen]);

  return (
    <AnimatePresence>
      {applyOpen && (
        <motion.div
          aria-label="Apply Template Modal"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          style={{ position: "fixed", inset: 0, background: TK.backdrop, zIndex: 9999, display: "grid", placeItems: "center" }}
        >
          <motion.div
            ref={ref}
            tabIndex={-1}
            initial={{ y: 20, filter: "blur(6px)", opacity: 0 }}
            animate={{ y: 0, filter: "blur(0px)", opacity: 1, transition: { duration: 0.25 } }}
            exit={{ y: 12, opacity: 0, filter: "blur(4px)", transition: { duration: 0.18 } }}
            style={{
              width: "min(96vw, 720px)",
              maxWidth: "720px",
              background: TK.surface,
              color: TK.text,
              borderRadius: 12,
              boxShadow: TK.shadow,
              display: "flex",
              flexDirection: "column",
              maxHeight: "92vh",
            }}
          >
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${TK.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 id="modalTitle" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {title}
              </h2>
              <button onClick={onClose} aria-label="Close" style={iconBtnStyle}>
                ✕
              </button>
            </div>
            <div style={{ padding: 16, overflow: "auto" }}>{children}</div>
            <div style={{ padding: 12, borderTop: `1px solid ${TK.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Select destination", "Start date & scheduling", "Review & confirm"];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const active = n === step;
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-20% 0px -20% 0px" }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            style={{ border: `1px solid ${TK.border}`, borderRadius: 8, padding: 8, background: active ? "#F5F7FA" : "#fff" }}
          >
            <div style={{ fontSize: 12, color: TK.muted }}>Step {n}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Step 1: Destination ───────────────────────── */
function DestinationSelector({
  destinationType,
  setDestinationType,
  selectedProjectIds,
  setSelectedProjectIds,
  myProjects,
  sharedProjects,
  maxProjects,
}: {
  destinationType: "project" | "multi";
  setDestinationType: (t: "project" | "multi") => void;
  selectedProjectIds: string[];
  setSelectedProjectIds: (ids: string[]) => void;
  myProjects: PickerProject[];
  sharedProjects: PickerProject[];
  maxProjects: number;
}) {
  const [q, setQ] = useState("");
  const normalizedSearch = q.trim().toLowerCase();
  const filterList = useCallback(
    (list: PickerProject[] = []) =>
      list.filter((p) => (p?.name || p?.domain || p?.url || "").toLowerCase().includes(normalizedSearch)),
    [normalizedSearch],
  );
  const filteredMyProjects = useMemo(() => filterList(myProjects), [filterList, myProjects]);
  const filteredSharedProjects = useMemo(() => filterList(sharedProjects), [filterList, sharedProjects]);
  const isMulti = destinationType === "multi";
  const multiLimitReached = isMulti && selectedProjectIds.length >= maxProjects;

  useEffect(() => {
    if (destinationType === "project" && selectedProjectIds.length > 1) {
      setSelectedProjectIds(selectedProjectIds.slice(0, 1));
    }
  }, [destinationType, selectedProjectIds, setSelectedProjectIds]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      <FieldLabel hint="Project or Multiple Projects">Destination</FieldLabel>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        {(["project", "multi"] as const).map((t) => (
          <label key={t} style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
            <input type="radio" name="destType" checked={destinationType === t} onChange={() => setDestinationType(t)} />
            <span>{t === "multi" ? "multiple projects" : "project"}</span>
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #E5E7EB", borderRadius: 8 }}
        />
      </div>
      {isMulti && (
        <div style={{ fontSize: 12, color: multiLimitReached ? TK.warn : TK.muted, marginBottom: 8 }}>
          Select up to {maxProjects} projects at once.{multiLimitReached ? " You've reached the limit." : ""}
        </div>
      )}

      <ProjectPickList
        destinationType={destinationType}
        selectedProjectIds={selectedProjectIds}
        setSelectedProjectIds={setSelectedProjectIds}
        myProjects={filteredMyProjects}
        sharedProjects={filteredSharedProjects}
        multiLimitReached={multiLimitReached}
      />
    </motion.div>
  );
}

const ProjectPickList = ({
  destinationType,
  selectedProjectIds,
  setSelectedProjectIds,
  myProjects,
  sharedProjects,
  multiLimitReached,
}: {
  destinationType: "project" | "multi";
  selectedProjectIds: string[];
  setSelectedProjectIds: (ids: string[]) => void;
  myProjects: PickerProject[];
  sharedProjects: PickerProject[];
  multiLimitReached: boolean;
}) => {
  const renderRows = (projects: PickerProject[], isShared: boolean, startIndex: number) => {
    return projects.map((project, idx) => {
      const label = project.name || project.domain || project.url || `Project ${project.id}`;
      const idStr = String(project.id);
      const checked = selectedProjectIds.includes(idStr);
      const delay = (startIndex + idx) * 0.02;
      const disabledShared = isShared && project?.canApplyTemplate === false;
      const disableMessage =
        disabledShared && project?.disableReason
          ? project.disableReason
          : disabledShared
          ? "Viewer access on SEO dashboard. Request higher access to use templates."
          : "";
      const limitBlocked = destinationType === "multi" ? !checked && multiLimitReached : false;
      const optionDisabled = disabledShared || limitBlocked;
      const toggleSelection = () => {
        if (optionDisabled) return;
        if (destinationType === "multi") {
          setSelectedProjectIds(checked ? selectedProjectIds.filter((x) => x !== idStr) : [...selectedProjectIds, idStr]);
        } else {
          setSelectedProjectIds([idStr]);
        }
      };
      return (
        <motion.label
          key={`${isShared ? "shared" : "own"}-${idStr}`}
          initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.18, delay } }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: 8,
            borderBottom: "1px solid #E5E7EB",
            background: isShared ? "#F9FAFB" : "#fff",
            opacity: disabledShared ? 0.65 : 1,
            cursor: optionDisabled ? "not-allowed" : "pointer",
          }}
          title={disableMessage}
        >
          <input
            type={destinationType === "multi" ? "checkbox" : "radio"}
            name="projPick"
            checked={checked}
            disabled={optionDisabled}
            onChange={toggleSelection}
            style={{ marginTop: 4 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 600, color: "#111827" }}>{label}</span>
              {isShared && (
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#B45309", background: "#FEF3C7", padding: "2px 6px", borderRadius: 999 }}>
                  Shared
                </span>
              )}
            </div>
            {(project.domain || project.url) && (
              <div style={{ fontSize: 12, color: "#6B7280" }}>{project.domain || project.url}</div>
            )}
            {disabledShared && disableMessage && (
              <div style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>{disableMessage}</div>
            )}
          </div>
        </motion.label>
      );
    });
  };

  const ownRows = renderRows(myProjects, false, 0);
  const sharedRows = renderRows(sharedProjects, true, ownRows.length);
  const hasResults = ownRows.length + sharedRows.length > 0;

  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ maxHeight: 200, overflow: "auto" }}>
        <AnimatePresence initial={false}>
          {hasResults ? (
            <>
              {ownRows.length > 0 && (
                <div style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#6B7280", background: "#F3F4F6" }}>My Projects</div>
              )}
              {ownRows}
              {sharedRows.length > 0 && (
                <>
                  <div style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", borderTop: "1px solid #E5E7EB" }}>Shared Projects</div>
                  {sharedRows}
                </>
              )}
            </>
          ) : (
            <div style={{ padding: 16, fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>No projects match your search.</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ───────────────────────── Step 2: Schedule ───────────────────────── */
function ScheduleConfigurator({
  startDate,
  setStartDate,
  sequential,
  setSequential,
}: {
  startDate?: string;
  setStartDate: (d?: string) => void;
  sequential: boolean;
  setSequential: (b: boolean) => void;
}) {
  const [local, setLocal] = useState(startDate || toISODate(new Date()));
  useEffect(() => {
    if (startDate) setLocal(startDate);
  }, [startDate]);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      <FieldLabel>Start Date</FieldLabel>
      <input
        type="date"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          setStartDate(e.target.value);
        }}
        style={{ padding: "8px 10px", border: `1px solid ${TK.border}`, borderRadius: 8 }}
      />

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <input id="seq" type="checkbox" checked={sequential} onChange={(e) => setSequential(e.target.checked)} />
        <label htmlFor="seq">
          <strong>Sequential Due Date</strong> (uses task durations from the template to chain due dates)
        </label>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: TK.muted }}>Uses task durations from the template to chain due dates.</div>

      <div style={{ marginTop: 10, fontSize: 12, color: TK.warn }}>⚠ Weekend conflicts (if any) will be shown in Review. You can adjust after apply.</div>
    </motion.div>
  );
}

/* ───────────────────────── Step 3: Review & Confirm ─────────────────────────
   UPDATED: Checkbox column + selected activity IDs                                      */
function ReviewPreview({
  templateName,
  destinations,
  startDate,
  sequential,
  tasks,
  projectLookup,
  selectedActivityIds,
  setSelectedActivityIds,
  previews,
  weekendWarnings,
  activityDueDates,
  onDueDateChange,
  assigneeConfigByProject,
  resolvedProjectAssignees,
  onProjectAssigneeChange,
  showAllInitially = false,
}: {
  templateName: any;
  destinations: string[];
  startDate: string;
  sequential: boolean;
  tasks: TemplateTask[];
  projectLookup: Map<string, string>;
  selectedActivityIds: string[];
  setSelectedActivityIds: (ids: string[]) => void;
  previews: TaskPreview[];
  weekendWarnings: number;
  activityDueDates: Record<string, string>;
  onDueDateChange: (activityId: string, dueDate: string) => void;
  assigneeConfigByProject: Record<string, ProjectAssigneeConfig>;
  resolvedProjectAssignees: Record<string, Record<string, string | undefined>>;
  onProjectAssigneeChange: (projectId: string, activityId: string, value?: string) => void;
  showAllInitially?: boolean;
}) {
  const destIds = useMemo(() => destinations.map((d) => String(d)), [destinations]);
  const [activeProj, setActiveProj] = useState(destIds[0] || "");
  const [showAll, setShowAll] = useState(showAllInitially);

  useEffect(() => {
    if (destIds.length && !destIds.includes(activeProj)) setActiveProj(destIds[0]);
  }, [destIds, activeProj]);

  const previewRows = showAll ? previews : previews.slice(0, 6);
  const tableMinWidth = 640 + destIds.length * ASSIGNEE_COLUMN_WIDTH;

  const toggleAll = (checked: boolean) => {
    setSelectedActivityIds(checked ? tasks.map((t) => t.id) : []);
  };

  const allChecked = selectedActivityIds.length === tasks.length && tasks.length > 0;
  const someChecked = selectedActivityIds.length > 0 && !allChecked;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} style={{ display: "grid", gap: 12 }}>
      <SummaryRow label="Template" value={String(templateName)} />
      <SummaryRow label="Destinations" value={`${destIds.length} project(s)`} />
      <SummaryRow label="Start date" value={fmtDate(startDate)} />
      <SummaryRow label="Sequential" value={sequential ? "Yes" : "No"} />

      {destIds.length === 1 ? (
        <SummaryRow label="Preview project" value={projectLookup.get(destIds[0]) ?? `Project ${destIds[0]}`} />
      ) : destIds.length > 1 ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: TK.muted }}>Preview project:</span>
          <select value={activeProj} onChange={(e) => setActiveProj(e.target.value)} style={{ padding: "6px 8px", border: `1px solid ${TK.border}`, borderRadius: 8 }}>
            {destIds.map((pid) => (
              <option key={pid} value={pid}>
                {projectLookup.get(pid) ?? `Project ${pid}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div style={{ border: `1px solid ${TK.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: tableMinWidth, borderCollapse: "collapse" }}>
          <thead style={{ background: "#F5F7FA" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12, borderBottom: `1px solid ${TK.border}`, width: 32 }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all activities"
                />
              </th>
              {BASE_REVIEW_HEADERS.map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 12, borderBottom: `1px solid ${TK.border}` }}>
                  {h}
                </th>
              ))}
              {destIds.map((pid) => (
                <th
                  key={`proj-head-${pid}`}
                  style={{ textAlign: "left", padding: "8px 10px", fontSize: 12, borderBottom: `1px solid ${TK.border}`, minWidth: ASSIGNEE_COLUMN_WIDTH }}
                >
                  {projectLookup.get(pid) ?? `Project ${pid}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {previewRows.map((row, i) => {
                const activityId = tasks[row.idx - 1]?.id; // align preview row to tasks index
                const rowChecked = activityId ? selectedActivityIds.includes(activityId) : false;
                const dueValue = (activityId && activityDueDates[activityId]) || row.estDue || "";
                const dueIsWeekend = dueValue ? isWeekendISO(dueValue) : false;
                return (
                  <motion.tr
                    key={row.idx}
                    initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                    transition={{ duration: 0.18, delay: i * 0.03 }}
                    style={{ borderBottom: `1px solid ${TK.border}` }}
                  >
                    <td style={{ ...tdStyle, width: 32 }}>
                      <input
                        type="checkbox"
                        checked={rowChecked}
                        onChange={(e) => {
                          if (!activityId) return;
                          setSelectedActivityIds(
                            e.target.checked
                              ? [...new Set([...selectedActivityIds, activityId])]
                              : selectedActivityIds.filter((id) => id !== activityId)
                          );
                        }}
                        aria-label={`Select ${row.title}`}
                      />
                    </td>
                    <td style={tdStyle}>{row.idx}</td>
                    <td style={tdStyle}>{row.title}</td>
                    <td style={tdStyle}>{row.durationDays}d</td>
                    <td style={tdStyle}>
                      <input
                        type="date"
                        value={dueValue}
                        onChange={(e) => {
                          if (activityId) onDueDateChange(activityId, e.target.value);
                        }}
                        disabled={!activityId}
                        style={{ padding: "4px 6px", border: `1px solid ${TK.border}`, borderRadius: 6 }}
                        aria-label={`Update due date for ${row.title}`}
                      />
                      {dueIsWeekend && (
                        <span style={{ color: TK.warn, fontSize: 12, marginLeft: 6, display: "inline-block" }}>⚠ weekend</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <PriorityPill p={row.priority} />
                    </td>
                    {destIds.map((pid) => {
                      const config = assigneeConfigByProject[pid];
                      const options = (config?.options && config.options.length > 0 ? config.options : [{ ...SELF_ASSIGN_OPTION }]) as SelectProps["options"];
                      const memberCount = config?.memberCount ?? 0;
                      const selectValue = activityId ? resolvedProjectAssignees[pid]?.[activityId] : undefined;
                      const placeholder = memberCount === 0 ? "Assign to yourself" : "Select an assignee";
                      return (
                        <td key={`assignee-${pid}-${row.idx}`} style={{ ...tdStyle, minWidth: ASSIGNEE_COLUMN_WIDTH }}>
                          <Select
                            size="small"
                            value={selectValue}
                            style={{ minWidth: 200 }}
                            disabled={!activityId}
                            options={options}
                            placeholder={placeholder}
                            optionFilterProp="label"
                            showSearch
                            dropdownMatchSelectWidth={false}
                            allowClear={memberCount > 0}
                            onChange={(val) => {
                              if (!activityId) return;
                              onProjectAssigneeChange(pid, activityId, (val as string | undefined) ?? undefined);
                            }}
                            onClear={() => {
                              if (!activityId) return;
                              onProjectAssigneeChange(pid, activityId, undefined);
                            }}
                            notFoundContent={memberCount === 0 ? "Assign to yourself" : "No members available"}
                            optionRender={(option) => {
                              if (option.value === "__self__") {
                                return (
                                  <div className="flex items-center gap-2 font-medium text-brand-blue1">
                                    <User className="w-4 h-4" />
                                    <span>{option.data?.label || "Assign to yourself"}</span>
                                  </div>
                                );
                              }
                              const isPending = option.data?.meta?.isPending;
                              const content = <div className={isPending ? "text-gray-400" : ""}>{option.data?.label}</div>;
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
                      );
                    })}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
          </table>
        </div>

        {previews.length > 6 && (
          <div style={{ padding: 8, textAlign: "center" }}>
            <button onClick={() => setShowAll(!showAll)} style={linkBtn}>
              {showAll ? "Show less" : "Show all"} ({previews.length})
            </button>
          </div>
        )}
      </div>

      {!!weekendWarnings && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: 10, border: `1px solid ${TK.warn}`, background: "#FFF7ED", color: TK.warn, borderRadius: 8 }}
        >
          ⚠ {weekendWarnings} task(s) land on a weekend. Adjust if needed.
        </motion.div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <div style={{ fontSize: 14 }}>
          <b>Selected:</b> {selectedActivityIds.length} of {tasks.length} activities will be applied per project.
        </div>
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Root: ApplyTemplateModal ───────────────────────── */
type ApplyTemplateModalProps = {
  applyOpen?: boolean;
  templateId?: string;
  templateName?: string;
  defaultSequential?: any;
  preselectProjectId?: string;
  tasksOverride?: TemplateTask[];
  onClose(): void;
  onApplied?(result: { createdTasks: number; projects: string[]; failed?: { projectId: string; error: string }[] }): void;
};

export function ApplyTemplateModal(props: ApplyTemplateModalProps & { embedded?: boolean }) {
  const {
    applyOpen,
    onClose,
    templateId,
    templateName,
    defaultSequential,
    preselectProjectId,
    onApplied,
    tasksOverride,
    embedded,
  } = props;

  const dispatch = useDispatch();
  const rawMembers = useSelector(selectMembersRaw) as any[] | undefined;
  const { projects: ownedProjects = [], sharedProjects: sharedProjectsRaw = [] } = useProjectManager();
  const sharedProjectsWithMeta = useMemo<PickerProject[]>(
    () =>
      (sharedProjectsRaw || []).map((project: any) => {
        const canApplyTemplate = sharedProjectHasSeoWriteAccess(project);
        return {
          ...project,
          canApplyTemplate,
          disableReason: canApplyTemplate
            ? ""
            : "Need Editor/Admin access on the SEO dashboard to use templates.",
        } as PickerProject;
      }),
    [sharedProjectsRaw],
  );
  const selectableProjects = useMemo(
    () => [...(ownedProjects || []), ...sharedProjectsWithMeta],
    [ownedProjects, sharedProjectsWithMeta],
  );
  console.log("projects", selectableProjects);
  
  const projectLookup = React.useMemo(() => {
    const map = new Map<string, string>();
    selectableProjects.forEach((p: any) => {
      map.set(String(p.id), toProjectLabel(p));
    });
    return map;
  }, [selectableProjects]);
  useEffect(() => {
    if (applyOpen) {
      dispatch(fetchTeamDetails({ force: false }) as any);
    }
  }, [applyOpen, dispatch]);

  const TASKS = React.useMemo(() => normalizeTemplateTasks(tasksOverride), [tasksOverride]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [destinationType, setDestinationType] = useState<"project" | "multi">("project");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => (preselectProjectId ? [preselectProjectId] : []));
  const [startDate, setStartDate] = useState<string | undefined>(toISODate(new Date()));
  const [sequential, setSequential] = useState<boolean>(!!defaultSequential);
  const [assigneeMode] = useState<"none" | "useTemplate" | "singleUser">("none");
  const [assigneeUserId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [dupWarning, setDupWarning] = useState<string | undefined>();
  const [assigneeSelectionsByProject, setAssigneeSelectionsByProject] = useState<Record<string, Record<string, string>>>({});

  /* NEW: Maintain selected activity IDs (all checked initially) */
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(() => TASKS.map((t) => t.id));
  const [dueDateOverrides, setDueDateOverrides] = useState<Record<string, string>>({});
  useEffect(() => {
    // Reset activity selection whenever tasks change or modal reopens
    if (applyOpen) setSelectedActivityIds(TASKS.map((t) => t.id));
  }, [applyOpen, TASKS]);
  useEffect(() => {
    if (applyOpen) {
      setDueDateOverrides({});
    }
  }, [applyOpen, startDate, sequential, TASKS]);

  useEffect(() => {
    if (applyOpen) {
      setStep(1);
      setDestinationType("project");
      setSelectedProjectIds(preselectProjectId ? [preselectProjectId] : []);
      setStartDate(toISODate(new Date()));
      setError(undefined);
      setDupWarning(undefined);
    }
  }, [applyOpen, preselectProjectId]);
  useEffect(() => {
    setSelectedProjectIds((prev) => {
      if (destinationType === "project" && prev.length > 1) {
        return prev.slice(0, 1);
      }
      if (destinationType === "multi" && prev.length > MAX_MULTI_PROJECTS) {
        return prev.slice(0, MAX_MULTI_PROJECTS);
      }
      return prev;
    });
  }, [destinationType, selectedProjectIds.length]);
  useEffect(() => {
    const allowedIds = new Set<string>([
      ...(ownedProjects || []).map((p: any) => String(p.id)),
      ...sharedProjectsWithMeta.filter((project: any) => project.canApplyTemplate !== false).map((p: any) => String(p.id)),
    ]);
    setSelectedProjectIds((prev) => {
      const filtered = prev.filter((id) => allowedIds.has(String(id)));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [ownedProjects, sharedProjectsWithMeta]);

  const destinations: string[] = useMemo(() => selectedProjectIds, [selectedProjectIds]);
  const destinationsKey = destinations.join("|");

  const schedule = useMemo(() => {
    if (!startDate) {
      return { previews: [] as TaskPreview[], weekendWarnings: 0, lastDue: "" };
    }
    const strategy = assigneeMode === "singleUser" ? "single" : assigneeMode === "useTemplate" ? "template" : "none";
    return computeSchedule(TASKS, startDate, sequential, USERS, strategy, assigneeUserId);
  }, [TASKS, startDate, sequential, assigneeMode, assigneeUserId]);
  const membersByProject = useMemo(() => {
    const map = new Map<string, MemberEntry[]>();
    (rawMembers || []).forEach((member: any) => {
      const projectList = Array.isArray(member?.projects) ? member.projects : [];
      projectList.forEach((proj: any) => {
        const pid = proj?.project_id ?? proj?.id;
        if (pid == null) return;
        const key = String(pid);
        const entry: MemberEntry = {
          member_email: member.member_email,
          member_name: member.member_name,
          invitation_status: proj?.invitation_status || "Accepted",
        };
        if (!map.has(key)) {
          map.set(key, [entry]);
        } else {
          map.get(key)!.push(entry);
        }
      });
    });
    return map;
  }, [rawMembers]);

  const baseDueDates = useMemo(() => {
    const map: Record<string, string> = {};
    schedule.previews.forEach((preview) => {
      const task = TASKS[preview.idx - 1];
      if (task?.id) map[task.id] = preview.estDue;
    });
    return map;
  }, [schedule, TASKS]);

  const resolvedDueDates = useMemo(() => {
    const map: Record<string, string> = {};
    TASKS.forEach((task) => {
      map[task.id] = dueDateOverrides[task.id] ?? baseDueDates[task.id] ?? startDate ?? "";
    });
    return map;
  }, [TASKS, baseDueDates, dueDateOverrides, startDate]);

  const weekendWarnings = useMemo(() => {
    return Object.values(resolvedDueDates).filter((date) => date && isWeekendISO(date)).length;
  }, [resolvedDueDates]);
  const assigneeConfigByProject = useMemo(() => {
    const config: Record<string, ProjectAssigneeConfig> = {};
    destinations.forEach((pid) => {
      const members = membersByProject.get(pid) || [];
      const options: NonNullable<SelectProps["options"]> = [
        { ...SELF_ASSIGN_OPTION },
        ...members.map((m) => {
          const invitationStatus = m.invitation_status || "Accepted";
          const isPending = invitationStatus === "Pending";
          return {
            value: m.member_email,
            label: `${m.member_name} (${m.member_email})`,
            disabled: isPending,
            meta: { isPending, invitationStatus },
          };
        }),
      ];
      config[pid] = {
        options,
        memberCount: members.length,
      };
    });
    return config;
  }, [destinationsKey, destinations, membersByProject]);
  useEffect(() => {
    setAssigneeSelectionsByProject((prev) => {
      const next: Record<string, Record<string, string>> = {};
      destinations.forEach((pid) => {
        next[pid] = prev[pid] ? { ...prev[pid] } : {};
      });
      return next;
    });
  }, [destinationsKey]);
  useEffect(() => {
    if (applyOpen) {
      setAssigneeSelectionsByProject({});
    }
  }, [applyOpen]);
  const resolvedAssigneesByProject = useMemo(() => {
    const map: Record<string, Record<string, string | undefined>> = {};
    destinations.forEach((pid) => {
      const defaultValue = assigneeConfigByProject[pid]?.memberCount === 0 ? "__self__" : undefined;
      const selections = assigneeSelectionsByProject[pid] || {};
      const perTask: Record<string, string | undefined> = {};
      TASKS.forEach((task) => {
        perTask[task.id] = selections[task.id] ?? defaultValue;
      });
      map[pid] = perTask;
    });
    return map;
  }, [assigneeSelectionsByProject, destinationsKey, destinations, TASKS, assigneeConfigByProject]);
  const handleProjectAssigneeChange = useCallback((projectId: string, activityId: string, value?: string) => {
    if (!projectId || !activityId) return;
    setAssigneeSelectionsByProject((prev) => {
      const next = { ...prev };
      const current = { ...(next[projectId] || {}) };
      if (!value) {
        delete current[activityId];
      } else {
        current[activityId] = value;
      }
      next[projectId] = current;
      return next;
    });
  }, []);

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

  const blockPrimary = useMemo(() => {
    if (step === 1) return destinations.length === 0;
    if (step === 2) return !startDate;
    if (step === 3) return selectedActivityIds.length === 0;
    return false;
  }, [step, destinations.length, startDate, selectedActivityIds.length]);

  async function next() {
    setError(undefined);
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      await submit();
    }
  }
  function back() {
    if (step > 1) setStep((step - 1) as any);
  }

  const accessToken = Cookies.get("login_access_token_wrank");

async function submit() {
  if (!startDate) return;
  if (destinations.length === 0) {
    setError("Select at least one project.");
    return;
  }
  if (selectedActivityIds.length === 0) {
    setError("Select at least one activity.");
    return;
  }

  setSubmitting(true);
  setError(undefined);

  try {
    // Build the projects payload for all destinations
    const projectsPayload = destinations.map((projectId) => {
      const activitiesPayload = selectedActivityIds.map((id) => {
        const parsed = Number(String(id).replace(/^\D+/, ""));
        const fallbackParsed = Number(id);
        const normalizedId =
          Number.isFinite(parsed) && parsed !== 0
            ? parsed
            : Number.isFinite(fallbackParsed) && fallbackParsed !== 0
            ? fallbackParsed
            : id;

        const dueDate = resolvedDueDates[id] || startDate;
        const selectionKey = resolvedAssigneesByProject[projectId]?.[id];

        const payload: { id: number | string; due_date: string; assigned_to?: string } = {
          id: normalizedId,
          due_date: dueDate,
        };
        if (selectionKey && selectionKey !== "__self__") {
          payload.assigned_to = selectionKey;
        }
        return payload;
      });

      return {
        id: Number(projectId),
        activities: activitiesPayload,
      };
    });

    const res = await fetch(`${BASE_URL_WR}apply-activities/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        project_ids: destinations.map((p) => Number(p)),
        projects: projectsPayload,
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || `HTTP ${res.status}`);
    }

    toast.success(`Template activities applied to ${destinations.length} project(s).`);
    onApplied?.({ createdTasks: 0, projects: destinations });
    setSubmitting(false);
    onClose();
  } catch (e:any) {
    setSubmitting(false);
    setError(e?.message || "Network error. Please retry.");
  }
}

  const primaryLabel = step < 3 ? "Apply Template to Project(s)" : "Confirm & Apply";

  const footerJSX = (
    <>
      <button
        onClick={onClose}
        disabled={submitting}
        style={{ padding: "8px 12px", border: `1px solid ${TK.border}`, borderRadius: 8, background: "#fff", cursor: "pointer" }}
      >
        Cancel
      </button>
      {step > 1 && (
        <button
          onClick={back}
          disabled={submitting}
          style={{ padding: "8px 12px", border: `1px solid ${TK.border}`, borderRadius: 8, background: "#fff", cursor: "pointer" }}
        >
          ← Go Back
        </button>
      )}
      <button
        onClick={next}
        disabled={blockPrimary || submitting}
        style={{
          padding: "8px 14px",
          border: "none",
          borderRadius: 8,
          background: blockPrimary ? "#9CCEF0" : TK.brand,
          color: "#fff",
          cursor: blockPrimary ? "not-allowed" : "pointer",
        }}
        title={blockPrimary ? "Complete previous step(s)" : "Apply"}
      >
        {submitting ? "Applying…" : primaryLabel}
      </button>
    </>
  );

  const bodyJSX = (
    <>
      <Stepper step={step} />

      <AnimatePresence initial={false} mode="wait">
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{ marginBottom: 12, padding: 10, border: `1px solid ${TK.danger}`, background: "#FEF2F2", color: TK.danger, borderRadius: 8 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {dupWarning && step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 12, padding: 10, border: `1px solid ${TK.warn}`, background: "#FFF7ED", color: TK.warn, borderRadius: 8 }}
        >
          {dupWarning}{" "}
          <button
            style={{ background: "none", border: "none", color: TK.brand, cursor: "pointer", padding: 0 }}
            onClick={() => setDupWarning(undefined)}
          >
            Apply anyway
          </button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <DestinationSelector
            key="s1"
            destinationType={destinationType}
            setDestinationType={setDestinationType}
            selectedProjectIds={selectedProjectIds}
            setSelectedProjectIds={setSelectedProjectIds}
            myProjects={ownedProjects}
            sharedProjects={sharedProjectsWithMeta}
            maxProjects={MAX_MULTI_PROJECTS}
          />
        )}

        {step === 2 && (
          <ScheduleConfigurator
            key="s2"
            startDate={startDate}
            setStartDate={setStartDate as any}
            sequential={sequential}
            setSequential={setSequential}
          />
        )}

        {step === 3 && startDate && (
          <ReviewPreview
            key="s3"
            templateName={templateName}
            destinations={destinations}
            startDate={startDate}
            sequential={sequential}
            tasks={TASKS}
            projectLookup={projectLookup}
            selectedActivityIds={selectedActivityIds}
            setSelectedActivityIds={setSelectedActivityIds}
            previews={schedule.previews}
            weekendWarnings={weekendWarnings}
            activityDueDates={resolvedDueDates}
            onDueDateChange={handleDueDateChange}
            assigneeConfigByProject={assigneeConfigByProject}
            resolvedProjectAssignees={resolvedAssigneesByProject}
            onProjectAssigneeChange={handleProjectAssigneeChange}
          />
        )}
      </AnimatePresence>

      {step === 1 && destinations.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12, fontSize: 12, color: TK.muted }}>
          Permissions: Admin ✅ / Editor ✅ / Contributor ⛔ — Some destinations may be restricted by your role.
        </motion.div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div>
        <div style={{ padding: 16, overflow: "auto" }}>{bodyJSX}</div>
        <div style={{ padding: 12, borderTop: `1px solid ${TK.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>{footerJSX}</div>
      </div>
    );
  }

  return (
    <ModalShell applyOpen={applyOpen} onClose={onClose} title={`Apply Template: ${templateName}`} footer={footerJSX}>
      {bodyJSX}
    </ModalShell>
  );
}
