"use client";

import * as React from "react";
import {
  ClipboardList,
  FileText,
  Calendar,
  MessageSquare,
  SlidersHorizontal,
  Download,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Tasks from "../tasks-drawer/Task";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion"
/* ───────────────────────── Latest tokens (aligned with recent sections) ───────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-action:#0077FF;
  --wr-text:#111827;
  --wr-muted:#6B7280;
  --wr-border:#E5E7EB;
  --wr-borderLight:#EFF0F6;
  --wr-card:#FFFFFF;
  --wr-chip:#F5F7FA;
  --wr-success:#10B981;
  --wr-warning:#F59E0B;
  --wr-danger:#EF4444;
  --wr-radius:10px;
  --wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);
  --wr-shadow-md:0 6px 18px rgba(17,24,39,.08);
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system,"Segoe UI",Roboto,Arial,"Helvetica Neue",sans-serif}
.wr-card{background:var(--wr-card);border:1px solid var(--wr-border);border-radius:var(--wr-radius);box-shadow:var(--wr-shadow-sm)}
.wr-header{border-bottom:1px solid var(--wr-borderLight)}
.wr-chip{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:999px;border:1px solid var(--wr-border);background:#fff;font-size:12px}
.wr-chip[data-active="true"]{background:var(--wr-chip);box-shadow:inset 0 0 0 1px var(--wr-brand)}
.wr-filter-btn{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:999px;border:1px solid var(--wr-border);background:#fff;font-size:12px}
.wr-pop{position:absolute;z-index:40;background:#fff;border:1px solid var(--wr-border);border-radius:10px;box-shadow:var(--wr-shadow-sm);padding:10px;min-width:240px}
`}</style>
);

/* ───────────────────────── Types ───────────────────────── */
type Role = "viewer" | "editor" | "admin";
type Status = "not_started" | "in_progress" | "review" | "completed";

export interface PageTask {
  id: string;
  title: string;
  status: Status;
  priority: "low" | "medium" | "high";
  dueDate?: string; // ISO
  assignee?: { id: string; name: string; avatarUrl?: string };
  comments?: number;
}

export interface TasksNotesSectionProps {
  pageId: string;
  pageUrl?: string;
  projectId?: string;
  role?: Role;

  initialTasks?: PageTask[];
  fetchTasks?: (opts: { pageId: string; status: Status | "open" }) => Promise<PageTask[]>;
  onOpenTask?: (taskId: string) => void;
  onCreateTask?: (opts: { pageId: string; projectId?: string }) => void;
  onOpenTaskboard?: (opts: { pageId: string; projectId?: string }) => void;
  onExportCSV?: (rows: PageTask[]) => void;

  initialNoteHtml?: string;
  onSaveNote?: (html: string, visibility: "internal" | "shared") => Promise<void> | void;
}

/* ───────────────────────── Utils ───────────────────────── */
const fmtShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

function exportTasksCSV(rows: PageTask[]) {
  const header = ["Task ID", "Title", "Status", "Priority", "Assignee", "Due Date", "Comments"];
  const body = rows.map((r) => [
    r.id,
    r.title.replace(/"/g, '""'),
    r.status,
    r.priority,
    r.assignee?.name ?? "",
    r.dueDate ?? "",
    String(r.comments ?? 0),
  ]);
  const csv = [header, ...body].map((cols) => cols.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `page-tasks_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const initialsOf = (name?: string) => {
  if (!name) return "U";
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
};

/* ───────────────────────── Micro UI ───────────────────────── */
function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; color: string; bg: string }> = {
    not_started: { label: "Not Started", color: "#6B7280", bg: "rgba(156,163,175,.12)" },
    in_progress: { label: "In Progress", color: "var(--wr-brand)", bg: "rgba(0,140,205,.15)" },
    review: { label: "Under Review", color: "var(--wr-warning)", bg: "rgba(245,158,11,.15)" },
    completed: { label: "Completed", color: "var(--wr-success)", bg: "rgba(16,185,129,.15)" },
  };
  const t = map[status];
  return (
    <span
      className="inline-flex items-center px-2 h-[22px] rounded-full text-[12px] font-medium"
      style={{ color: t.color, background: t.bg }}
    >
      {t.label}
    </span>
  );
}

function PriorityDot({ p }: { p: "low" | "medium" | "high" }) {
  const c = p === "high" ? "var(--wr-danger)" : p === "medium" ? "var(--wr-warning)" : "#9AA4B2";
  return (
    <span
      aria-label={`Priority ${p}`}
      title={`Priority ${p}`}
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ background: c }}
    />
  );
}

function Avatar({
  name,
  url,
  size = 20,
}: {
  name?: string;
  url?: string;
  size?: number;
}) {
  const s = `${size}px`;
  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name} avatar` : "User avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: s, height: s, border: "1px solid var(--wr-borderLight)" }}
      />
    );
  }
  return (
    <div
      className="rounded-full grid place-items-center"
      style={{
        width: s,
        height: s,
        background: "var(--wr-chip)",
        color: "var(--wr-text)",
        border: "1px solid var(--wr-borderLight)",
        fontSize: 10,
        fontWeight: 600,
      }}
      aria-label={name ? `${name} avatar` : "User avatar"}
      title={name}
    >
      {initialsOf(name)}
    </div>
  );
}

/* ───────────────────────── Task card ───────────────────────── */
function TaskCard({ task, onClick }: { task: PageTask; onClick?: () => void }) {
  const overdue =
    task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== "completed" : false;

  return (
    <button
      onClick={onClick}
      className="w-full text-left border bg-white rounded-[8px] p-3 hover:shadow-md hover:-translate-y-[1px] transition cursor-pointer"
      style={{ borderColor: "var(--wr-border)" }}
      aria-label={`Task: ${task.title}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="w-1 rounded-[2px] shrink-0"
          style={{
            background:
              task.status === "completed"
                ? "var(--wr-success)"
                : task.status === "review"
                ? "var(--wr-warning)"
                : task.status === "in_progress"
                ? "var(--wr-brand)"
                : "#CBD5E1",
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PriorityDot p={task.priority} />
              <span className="font-semibold text-[14px] leading-5 truncate">{task.title}</span>
            </div>
            <StatusPill status={task.status} />
          </div>

          <div className="mt-2 flex items-center flex-wrap gap-3 text-[12px]" style={{ color: "var(--wr-muted)" }}>
            <div className="inline-flex items-center gap-2">
              <Avatar name={task.assignee?.name} url={task.assignee?.avatarUrl} />
              <span className="truncate max-w-[140px]">
                {task.assignee?.name ?? "Unassigned"}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              <span className={overdue ? "text-[color:var(--wr-danger)] font-medium" : ""}>
                {fmtShort(task.dueDate)}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <MessageSquare size={14} />
              <span>{task.comments ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ───────────────────────── Main Section ───────────────────────── */
export function TasksNotesSection({
  pageId,
  pageUrl,
  projectId,
  role = "editor",
  initialTasks,
  fetchTasks,
  onOpenTask,
  onCreateTask,
  onOpenTaskboard,
  onExportCSV,
  initialNoteHtml = "",
  onSaveNote,
}: TasksNotesSectionProps) {
  type TabKey = "open" | "in_progress" | "completed";
  const [tab, setTab] = React.useState<TabKey>("open");
  const [loading, setLoading] = React.useState(false);
  const [tasks, setTasks] = React.useState<PageTask[]>(
    initialTasks ?? [
      { id: "T-101", title: "Fix missing meta description", status: "in_progress", priority: "high", dueDate: new Date(Date.now() + 86400e3).toISOString(), assignee: { id: "u1", name: "Maya Patel", avatarUrl: "https://i.pravatar.cc/40?img=1" }, comments: 3 },
      { id: "T-102", title: "Compress hero images", status: "review", priority: "medium", dueDate: new Date(Date.now() + 2 * 86400e3).toISOString(), assignee: { id: "u2", name: "John Lee", avatarUrl: "https://i.pravatar.cc/40?img=2" }, comments: 1 },
      { id: "T-103", title: "Fix broken internal links", status: "not_started", priority: "high", dueDate: new Date(Date.now() - 2 * 86400e3).toISOString(), assignee: { id: "u3", name: "Aarav Sharma" }, comments: 2 },
      { id: "T-104", title: "Add FAQ structured data", status: "completed", priority: "low", dueDate: new Date(Date.now() - 4 * 86400e3).toISOString(), assignee: { id: "u1", name: "Maya Patel", avatarUrl: "https://i.pravatar.cc/40?img=1" }, comments: 0 },
    ]
  );

  /* Filters (modern chip + Filters button) */
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [prio, setPrio] = React.useState<Set<PageTask["priority"]>>(new Set());
  const [assignee, setAssignee] = React.useState<string>("all");
  const [due, setDue] = React.useState<"all" | "overdue" | "week">("all");
  const popRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!filtersOpen) return;
      if (popRef.current && !popRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [filtersOpen]);

  const assigneeOptions = React.useMemo(() => {
    const names = Array.from(new Set(tasks.map((t) => t.assignee?.name ?? "Unassigned")));
    return ["all", ...names];
  }, [tasks]);

  const baseByTab = React.useMemo(() => {
    if (tab === "completed") return tasks.filter((t) => t.status === "completed");
    if (tab === "in_progress") return tasks.filter((t) => t.status === "in_progress" || t.status === "review");
    return tasks.filter((t) => t.status !== "completed");
  }, [tasks, tab]);

  const visible = React.useMemo(() => {
    const now = new Date();
    return baseByTab.filter((t) => {
      if (prio.size && !prio.has(t.priority)) return false;
      if (assignee !== "all") {
        const n = t.assignee?.name ?? "Unassigned";
        if (n !== assignee) return false;
      }
      if (due !== "all") {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        if (due === "overdue" && !(d < now && t.status !== "completed")) return false;
        if (due === "week") {
          const in7 = new Date();
          in7.setDate(now.getDate() + 7);
          if (!(d >= now && d <= in7)) return false;
        }
      }
      return true;
    });
  }, [baseByTab, prio, assignee, due]);

  async function refresh(nextTab: TabKey) {
    if (!fetchTasks) return;
    setLoading(true);
    try {
      const need: Status | "open" =
        nextTab === "completed" ? "completed" : nextTab === "in_progress" ? "in_progress" : "open";
      const data = await fetchTasks({ pageId, status: need });
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh(tab);
  }, []);

  /* Notes */
  const [noteHtml, setNoteHtml] = React.useState<string>(initialNoteHtml);
  const [noteVis, setNoteVis] = React.useState<"internal" | "shared">("internal");
  const [saving, setSaving] = React.useState(false);
  const noteRef = React.useRef<HTMLDivElement>(null);

  function handleExport() {
    (onExportCSV ?? exportTasksCSV)(visible);
  }

  const canWrite = role === "editor" || role === "admin";

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };

  return (
    <>
      <GlobalTokens />
      <section className="wr-font wr-card p-4">
                     {drawerRow && (
                        <Tasks  open={drawerRow}
            onClose={closeDrawer}  />
                    )}
        {/* Section header (brand icon + Export) */}
        <div className="wr-header flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} color="var(--wr-brand)" />
            <h3 className="text-[15px] font-semibold" style={{ color: "var(--wr-text)" }}>
              Tasks &amp; Notes
            </h3>
            {pageUrl && (
              <a
                href={pageUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-[12px] px-2 py-1 rounded border hover:bg-[var(--wr-chip)] cursor-pointer"
                style={{ borderColor: "var(--wr-border)", color: "var(--wr-muted)" }}
                title="Open page"
              >
                {new URL(pageUrl).hostname}
              </a>
            )}
          </div>

          <div className="relative flex items-center gap-2">
            {/* Filters (modern button) */}
            <button
              type="button"
              className="wr-filter-btn cursor-pointer"
              onClick={() => setFiltersOpen((s) => !s)}
              title="Filters"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>
            {/* Export (section header) */}
            <button
              type="button"
              className="wr-filter-btn cursor-pointer"
              onClick={handleExport}
              title="Export CSV"
            >
              <Download size={14} />
              <span>Export</span>
            </button>

            {/* Filters popover */}
            {filtersOpen && (
              <div ref={popRef} className="wr-pop right-0 top-9">
                <div className="text-[12px] font-semibold mb-2" style={{ color: "var(--wr-muted)" }}>
                  Task Filters
                </div>

                {/* Priority chips */}
                <div className="mb-2">
                  <div className="text-[12px] mb-1" style={{ color: "var(--wr-muted)" }}>
                    Priority
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["high", "medium", "low"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="wr-chip cursor-pointer"
                        data-active={prio.has(p)}
                        onClick={() =>
                          setPrio((prev) => {
                            const n = new Set(prev);
                            n.has(p) ? n.delete(p) : n.add(p);
                            return n;
                          })
                        }
                        title={p}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-[3px]"
                          style={{
                            background:
                              p === "high"
                                ? "var(--wr-danger)"
                                : p === "medium"
                                ? "var(--wr-warning)"
                                : "#9AA4B2",
                          }}
                        />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignee */}
                <div className="mb-2">
                  <div className="text-[12px] mb-1" style={{ color: "var(--wr-muted)" }}>
                    Assignee
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {assigneeOptions.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="wr-chip cursor-pointer"
                        data-active={assignee === n}
                        onClick={() => setAssignee(n)}
                        title={n === "all" ? "All" : n}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due */}
                <div className="mb-2">
                  <div className="text-[12px] mb-1" style={{ color: "var(--wr-muted)" }}>
                    Due
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["all", "overdue", "week"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className="wr-chip cursor-pointer"
                        data-active={due === k}
                        onClick={() => setDue(k)}
                        title={k === "week" ? "Next 7 days" : k}
                      >
                        {k === "all" ? "All" : k === "overdue" ? "Overdue" : "Next 7 days"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2 text-right">
                  <button
                    type="button"
                    className="wr-filter-btn cursor-pointer"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">
          {/* Left: Tasks */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Card title with brand icon */}
            <div className="flex items-center gap-2">
              <ClipboardList size={16} color="var(--wr-brand)" />
              <h4 className="text-[13px] font-semibold" style={{ color: "var(--wr-text)" }}>
                Tasks
              </h4>
            </div>

            {/* Tabs (modern chips) */}
            <div className="flex items-center gap-2">
              {(["open", "in_progress", "completed"] as const).map((k) => {
                const label = k === "open" ? "Open" : k === "in_progress" ? "In Progress" : "Completed";
                const active = tab === k;
                const count =
                  k === "completed"
                    ? tasks.filter((t) => t.status === "completed").length
                    : k === "in_progress"
                    ? tasks.filter((t) => t.status === "in_progress" || t.status === "review").length
                    : tasks.filter((t) => t.status !== "completed").length;

                return (
                  <button
                    key={k}
                    onClick={() => {
                      setTab(k);
                      refresh(k);
                    }}
                    className="wr-chip cursor-pointer"
                    data-active={active}
                    aria-pressed={active}
                    title={label}
                  >
                    {label} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Create / Board (right aligned) */}
            <div className="flex items-center gap-2">
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => onOpenTaskboard?.({ pageId, projectId })}
                  className="wr-filter-btn cursor-pointer"
                  title="View all tasks"
                >
                  Board
                </button>
                {(role === "editor" || role === "admin") && (
                  <button
                    onClick={openDrawer}
                    className="wr-filter-btn cursor-pointer"
                    title="Create task"
                    style={{ background: "var(--wr-brand)", color: "#fff", borderColor: "var(--wr-brand)" }}
                  >
                    + Create Task
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div role="list" aria-busy={loading} className="grid gap-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[74px] rounded-[8px] border bg-[var(--wr-chip)] animate-pulse"
                    style={{ borderColor: "var(--wr-border)" }}
                  />
                ))
              ) : visible.length === 0 ? (
                <div
                  className="border rounded-[8px] p-4 text-[13px]"
                  style={{ borderColor: "var(--wr-border)", color: "var(--wr-muted)" }}
                >
                  No tasks match the current view.
                  {(role === "editor" || role === "admin") && (
                    <>
                      {" "}
                      <button
                        className="text-[color:var(--wr-brand)] underline underline-offset-2 cursor-pointer"
                        onClick={() => onCreateTask?.({ pageId, projectId })}
                      >
                        Create one
                      </button>
                      .
                    </>
                  )}
                </div>
              ) : (
                visible.map((t) => (
                  <div role="listitem" key={t.id}>
                    <TaskCard task={t} onClick={() => onOpenTask?.(t.id)} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Notes */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="border rounded-[8px] p-3 bg-white" style={{ borderColor: "var(--wr-border)" }}>
              {/* Card title with brand icon */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} color="var(--wr-brand)" />
                  <h4 className="text-[13px] font-semibold" style={{ color: "var(--wr-text)" }}>
                    Notes
                  </h4>
                  <span
                    className="text-[11px] px-2 py-[2px] rounded-full border"
                    style={{ borderColor: "var(--wr-border)", color: "var(--wr-muted)" }}
                    title={noteVis === "internal" ? "Visible only to your team" : "Shared with collaborators"}
                  >
                    {noteVis === "internal" ? "Internal" : "Shared"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[12px]" style={{ color: "var(--wr-muted)" }}>
                    <input
                      type="checkbox"
                      className="cursor-pointer accent-[var(--wr-brand)]"
                      checked={noteVis === "internal"}
                      onChange={(e) => setNoteVis(e.target.checked ? "internal" : "shared")}
                    />
                    Internal by default
                  </label>
                </div>
              </div>

              <div
                ref={noteRef}
                contentEditable={canWrite}
                suppressContentEditableWarning
                onInput={() => setNoteHtml(noteRef.current?.innerHTML ?? "")}
                className={`mt-2 min-h-[160px] max-h-[360px] overflow-auto outline-none text-[14px] leading-6 rounded-[6px] p-3 ${
                  canWrite
                    ? "border focus-within:ring-2 focus-within:ring-[rgba(0,140,205,.18)]"
                    : "border border-transparent bg-[var(--wr-chip)]"
                }`}
                style={{ borderColor: "var(--wr-border)" }}
                role="textbox"
                aria-multiline="true"
                aria-label="Page Notes"
                dangerouslySetInnerHTML={{
                  __html: noteHtml || "<p><em style='color:var(--wr-muted)'>Add notes, decisions, and context…</em></p>",
                }}
              />

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px]" style={{ color: "var(--wr-muted)" }}>
                  {saving ? "Saving…" : "Last edited just now"}
                </span>
                {(role === "editor" || role === "admin") && (
                  <button
                    onClick={async () => {
                      try {
                        setSaving(true);
                        await (onSaveNote?.(noteHtml, noteVis) ?? new Promise((r) => setTimeout(r, 350)));
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="h-8 px-3 rounded-[6px] text-white text-[12px] font-medium cursor-pointer disabled:opacity-60"
                    style={{ background: "var(--wr-brand)" }}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ───────────────────────── Optional Demo Wrapper (remove in production) ───────────────────────── */
export default function DemoTasksNotesSection() {
  const [lastSaved, setLastSaved] = React.useState<string>("");
  return (
    <div
      className="w-full mt-4"
      style={{ background: "#F5F7FA" }}
    >
     <TasksNotesSection
          pageId="pg-001"
          pageUrl="https://example.com/collection/seo-tips"
          projectId="proj-01"
          role="editor"
          onOpenTask={(id) => alert(`Open Task Drawer → ${id}`)}
          onCreateTask={({ pageId }) => alert(`Create Task Drawer (page: ${pageId})`)}
          onOpenTaskboard={({ pageId }) => alert(`Open Taskboard filtered by page: ${pageId}`)}
          onExportCSV={(rows) => {
            exportTasksCSV(rows);
          }}
          initialNoteHtml="<p><strong>Context:</strong> Add FAQ schema and compress images before next crawl.</p>"
          onSaveNote={async (html, visibility) => {
            await new Promise((r) => setTimeout(r, 500));
            setLastSaved(new Date().toLocaleTimeString());
            console.log("Saved note:", { visibility, html });
          }}
        />
    </div>
  );
}

