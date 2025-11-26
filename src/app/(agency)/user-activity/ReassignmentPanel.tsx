/* Section — Reassignment Panel (Drawer header + KPI cards + Table + Assign To + Notifications + Footer)
   Drop‑in React + Tailwind TSX (no emojis)

   What’s included (matches your requested pattern):
   • Drawer header with user profile image and status
   • KPI cards — metric value under the title, trend chart on the right (#0077ff)
   • Table — all columns left-aligned, profile image for user, branded icons for Status,
     project favicon with domain tooltip, branded icons in Actions/View, filter bar with chips, pagination
   • Assign To — radio: Assign all to one user / Assign individually (adds per-row select column)
   • Notifications — three toggles + comment template box
   • Sticky Footer — total selected count + Confirm Reassignment / Reset / Cancel

   NOTE: Uses lucide-react icons for branded iconography.
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Timer,
  FolderKanban,
  Search,
  SlidersHorizontal,
  Eye,
  MoreVertical,
  Copy,
  ExternalLink,
  Circle,
  Loader2,
  Octagon,
  Calendar,
  Filter,
  X,
  Mail,
  MessageSquareText,
  AtSign,
  Users,
  UserPlus,
} from "lucide-react";

/* ───────────────────────────────── Tokens ───────────────────────────────── */
const TK = {
  brand: "#1090D0",
  blue: "#0077ff", // trend line color
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderSubtle: "#EFF0F6",
  subtle: "#F5F7FA",
  card: "#FFFFFF",
};

/* ───────────────────────────────── Utils ───────────────────────────────── */
const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");
const domainOf = (name: string) => (name.includes(".") ? name : `${name.toLowerCase()}.com`);
const faviconUrl = (domain: string, sz = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const useDebounced = (v: string, ms = 250) => {
  const [x, setX] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setX(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return x;
};

/* ───────────────────────────────── Mock Data (same schema) ───────────────────────────────── */
type Task = {
  taskId: string;
  title: string;
  description: string;
  status: "Not Started" | "In Progress" | "Blocked" | "Completed";
  projectId: string;
  projectName: string;
  dueAt: string | null;
  currentAssigneeId: string;
};

const MOCK_USERS = [
  { id: "u_1", name: "Sara Mehta", email: "sara@wranker.com" },
  { id: "u_2", name: "Ankit Rao", email: "ankit@wranker.com" },
  { id: "u_3", name: "Priya Shah", email: "priya@wranker.com" },
  { id: "u_4", name: "Dev K.", email: "dev@wranker.com" },
  { id: "u_5", name: "Aman Gupta", email: "aman@wranker.com" },
];

const PROJECTS = [
  { id: "p_1", name: "wranker.com" },
  { id: "p_2", name: "app.w3era.com" },
  { id: "p_3", name: "academy.wranker.com" },
];

const STATUS: Task["status"][] = ["Not Started", "In Progress", "Blocked", "Completed"];

function makeTasks(): Task[] {
  const titles = [
    "Optimize Service Page",
    "Review Backlinks",
    "Fix 404s",
    "Improve CLS on Blog",
    "Schema Cleanup",
    "Keyword Map for /pricing",
    "Migrate Redirect Rules",
    "Refresh Top Articles",
    "Setup GA4 Conversions",
    "Audit Local SEO Pages",
    "Build Topic Cluster Plan",
    "Competitor Gap Deep Dive",
    "Replace Broken Anchors",
    "Consolidate Thin Pages",
    "Alt Text Improvements",
  ];
  const out: Task[] = [];
  for (let i = 0; i < 70; i++) {
    const p = PROJECTS[i % PROJECTS.length];
    const s = STATUS[i % STATUS.length];
    const dueRand = (i * 11) % 17;
    const due = s === "Completed" ? null : new Date(Date.now() + (dueRand - 8) * 86400000).toISOString();
    out.push({
      taskId: `t_${i + 1}`,
      title: `${titles[i % titles.length]} #${i + 1}`,
      description: `Short description of ${titles[i % titles.length]}.`,
      status: s,
      projectId: p.id,
      projectName: p.name,
      dueAt: due,
      currentAssigneeId: "u_1", // all currently assigned to same user for demo
    });
  }
  return out;
}
const ALL_TASKS = makeTasks();

/* API mocks */
async function apiFetchSummary(fromUsers: string[]) {
  const mine = ALL_TASKS.filter((t) => fromUsers.includes("u_1") && t.currentAssigneeId === "u_1");
  const total = mine.length;
  const completed = mine.filter((t) => t.status === "Completed").length;
  const active = mine.filter((t) => t.status !== "Completed").length;
  const projects = Array.from(new Set(mine.map((t) => t.projectId))).map((id) => ({
    id,
    name: PROJECTS.find((p) => p.id === id)?.name || id,
  }));
  return { total, completed, active, projects };
}
async function apiFetchTasks(fromUsers: string[], cursor = 0, limit = 70) {
  const mine = ALL_TASKS.filter((t) => fromUsers.includes("u_1") && t.currentAssigneeId === "u_1");
  const start = cursor;
  const end = Math.min(start + limit, mine.length);
  return { items: mine.slice(start, end), total: mine.length, nextCursor: end < mine.length ? end : null };
}

/* ───────────────────────────────── Mini Area Chart (with tooltip) ───────────────────────────────── */
type Point = { date: string; value: number };
function mkTrend(base: number, days = 30): Point[] {
  const arr: Point[] = [];
  const today = new Date();
  let v = base;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    v = Math.max(0, Math.round((0.92 + Math.random() * 0.16) * base + (Math.sin(i / 4) * base) / 12));
    arr.push({ date: toISODate(d), value: v });
  }
  return arr;
}

function AreaMini({
  series,
  color = TK.blue,
  height = 64,
  aria,
}: {
  series: Point[];
  color?: string;
  height?: number;
  aria?: string;
}) {
  const ref = useRef<SVGSVGElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ i: number; mx: number; my: number } | null>(null);

  const W = 220;
  const H = height;
  const pad = { l: 8, r: 8, t: 8, b: 18 };
  const n = series.length;
  const width = W - pad.l - pad.r;
  const heightInner = H - pad.t - pad.b;
  const maxV = Math.max(1, ...series.map((s) => s.value));
  const xs = (i: number) => pad.l + (i / Math.max(1, n - 1)) * width;
  const ys = (v: number) => pad.t + (1 - v / maxV) * heightInner;

  const path = series.map((s, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(s.value)}`).join(" ");
  const area = `${path} L ${pad.l + width} ${pad.t + heightInner} L ${pad.l} ${pad.t + heightInner} Z`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    const wrap = hostRef.current?.getBoundingClientRect();
    if (!rect || !wrap) return;
    const xVb = ((e.clientX - rect.left) / rect.width) * W;
    const rel = xVb - pad.l;
    const step = width / Math.max(1, n - 1);
    const idx = clamp(Math.round(rel / step), 0, n - 1);
    setHover({ i: idx, mx: e.clientX - wrap.left, my: e.clientY - wrap.top });
  };

  const tipLeft = hover ? clamp(hover.mx + (hover.mx < 110 ? 10 : -10), 8, 212) : 0;
  const tipTop = hover ? clamp(hover.my - 26, 6, H - 34) : 0;
  const flip = hover ? (hover.mx < 110 ? "" : "translateX(-100%)") : "translateX(0)";

  return (
    <div className="relative" ref={hostRef}>
      <svg
        ref={ref}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-label={aria}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        className="cursor-crosshair"
      >
        <path d={area} fill="rgba(0,119,255,0.15)" />
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        {hover && (
          <>
            <line x1={xs(hover.i)} x2={xs(hover.i)} y1={pad.t} y2={pad.t + heightInner} stroke={TK.border} />
            <circle cx={xs(hover.i)} cy={ys(series[hover.i].value)} r="3.5" fill={color} />
          </>
        )}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute rounded border bg-white px-2 py-1 text-xs shadow"
          style={{
            left: tipLeft,
            top: tipTop,
            transform: flip,
            borderColor: TK.borderSubtle,
          }}
        >
          <div className="font-semibold text-gray-900">{series[hover.i].value.toLocaleString()}</div>
          <div className="text-[11px] text-gray-600">{series[hover.i].date}</div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────── Filter Chips (dropdown) ───────────────────────────────── */
function ChipDropdown({
  label,
  active,
  children,
}: {
  label: React.ReactNode;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        className={`h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC] ${
          active ? "font-semibold" : ""
        }`}
        style={{ borderColor: TK.borderSubtle }}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <SlidersHorizontal className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 rounded-md border bg-white p-3 text-sm shadow-lg"
          style={{ borderColor: TK.borderSubtle, minWidth: 280 }}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────── Status helpers ───────────────────────────────── */
function StatusPill({ s }: { s: Task["status"] }) {
  const map: Record<
    Task["status"],
    { Icon: React.FC<any>; bg: string; color: string; label: string }
  > = {
    "Not Started": { Icon: Circle, bg: "rgba(156,163,175,0.10)", color: "#6B7280", label: "Not Started" },
    "In Progress": { Icon: Loader2, bg: "rgba(0,119,255,0.12)", color: "#0B4C6C", label: "In Progress" },
    Blocked: { Icon: Octagon, bg: "rgba(239,68,68,0.12)", color: "#7A1D1F", label: "Blocked" },
    Completed: { Icon: CheckCircle2, bg: "rgba(16,185,129,0.12)", color: "#0C5E3B", label: "Completed" },
  };
  const S = map[s];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[12px] font-medium"
      style={{ background: S.bg, color: S.color, border: `1px solid ${TK.border}` }}
    >
      <S.Icon className="h-3.5 w-3.5" />
      {S.label}
    </span>
  );
}

/* ───────────────────────────────── Main Component ───────────────────────────────── */
export default function ReassignmentPanel() {
  const fromUsers = ["u_1"]; // source (inactive) user(s)
  const [summary, setSummary] = useState<{ total: number; completed: number; active: number; projects: { id: string; name: string }[] }>(
    { total: 0, completed: 0, active: 0, projects: [] }
  );
  const [tasks, setTasks] = useState<Task[]>([]);

  // filters
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [selStatuses, setSelStatuses] = useState<Task["status"][]>(["Not Started", "In Progress", "Blocked"]);
  const [selProjects, setSelProjects] = useState<string[]>([]);
  const [due, setDue] = useState<"all" | "overdue" | "week" | "none">("all");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // assign to
  const [assignMode, setAssignMode] = useState<"one" | "perRow">("one");
  const [globalAssignee, setGlobalAssignee] = useState<string>("");
  const [perRowAssignee, setPerRowAssignee] = useState<Record<string, string>>({});
  const candidateUsers = useMemo(() => MOCK_USERS.filter((u) => u.id !== "u_1"), []);

  // notifications
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [addComment, setAddComment] = useState(true);
  const [mentionInComment, setMentionInComment] = useState(false);
  const [commentTemplate, setCommentTemplate] = useState(
    "Reassigned from {{oldAssignee}} due to inactivity ({{inactiveDays}} days)."
  );

  // load
  useEffect(() => {
    (async () => {
      const s = await apiFetchSummary(fromUsers);
      const t = await apiFetchTasks(fromUsers, 0, 999);
      setSummary(s);
      setTasks(t.items);
      setSelected(
        t.items.reduce((acc, it) => {
          if (it.status !== "Completed") acc[it.taskId] = true;
          return acc;
        }, {} as Record<string, boolean>)
      );
    })();
  }, []);

  // trends for KPI cards
  const trendAssigned = useMemo(() => mkTrend(Math.max(1, summary.total)), [summary.total]);
  const trendCompleted = useMemo(() => mkTrend(Math.max(1, summary.completed)), [summary.completed]);
  const trendActive = useMemo(() => mkTrend(Math.max(1, summary.active)), [summary.active]);

  // derived filters
  const filtered = useMemo(() => {
    const sset = new Set(selStatuses);
    const pset = new Set(selProjects);
    const now = Date.now();
    const weekEnd = now + 7 * 86400000;
    const ql = dq.trim().toLowerCase();

    return tasks.filter((t) => {
      if (t.status !== "Completed" && !sset.has(t.status)) return false;
      if (pset.size && !pset.has(t.projectId)) return false;
      if (due !== "all") {
        const ts = t.dueAt ? new Date(t.dueAt).getTime() : null;
        if (due === "overdue" && !(ts && ts < now)) return false;
        if (due === "week" && !(ts && ts >= now && ts <= weekEnd)) return false;
        if (due === "none" && t.dueAt) return false;
      }
      if (ql) {
        const hay = `${t.title} ${t.description}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [tasks, selStatuses, selProjects, due, dq]);

  // paging
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [pages, page]);
  const start = (page - 1) * pageSize;
  const view = filtered.slice(start, start + pageSize);

  const allOnPageIds = view.map((t) => t.taskId);
  const pageAllSelected = allOnPageIds.length > 0 && allOnPageIds.every((id) => selected[id]);

  // helpers
  const toggleAllOnPage = (v: boolean) =>
    setSelected((s) => {
      const next = { ...s };
      allOnPageIds.forEach((id) => (next[id] = v));
      return next;
    });

  const currentAssignee = MOCK_USERS.find((u) => u.id === "u_1")!;
  const assigneeAvatar = (email: string) => `https://i.pravatar.cc/64?u=${encodeURIComponent(email)}`;

  // selection derived
  const selectedTasks = useMemo(
    () => tasks.filter((t) => selected[t.taskId] && t.status !== "Completed"),
    [tasks, selected]
  );

  // confirm guard
  const perRowMissing = useMemo(
    () => assignMode === "perRow" ? selectedTasks.filter((t) => !perRowAssignee[t.taskId]).length : 0,
    [assignMode, selectedTasks, perRowAssignee]
  );
  const canConfirm =
    selectedTasks.length > 0 &&
    (assignMode === "one" ? !!globalAssignee : perRowMissing === 0);

  // actions
  const handleConfirm = () => {
    const mapping =
      assignMode === "one"
        ? Object.fromEntries(selectedTasks.map((t) => [t.taskId, globalAssignee]))
        : Object.fromEntries(selectedTasks.map((t) => [t.taskId, perRowAssignee[t.taskId]]));
    alert(
      `Confirming reassignment for ${Object.keys(mapping).length} task(s).\n` +
        `Notify: ${notifyEmail ? "Yes" : "No"}, Comment: ${addComment ? "Yes" : "No"}, @mention: ${mentionInComment ? "Yes" : "No"}`
    );
  };
  const handleReset = () => {
    setQ("");
    setSelStatuses(["Not Started", "In Progress", "Blocked"]);
    setSelProjects([]);
    setDue("all");
    setPage(1);
    setAssignMode("one");
    setGlobalAssignee("");
    setPerRowAssignee({});
    setNotifyEmail(true);
    setAddComment(true);
    setMentionInComment(false);
    setCommentTemplate("Reassigned from {{oldAssignee}} due to inactivity ({{inactiveDays}} days).");
    setSelected(
      tasks.reduce((acc, it) => {
        if (it.status !== "Completed") acc[it.taskId] = true;
        return acc;
      }, {} as Record<string, boolean>)
    );
  };

  const colCount = 7 + (assignMode === "perRow" ? 1 : 0);

  return (
    <section className="font-sans">
      {/* Drawer Header */}
      <div className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={assigneeAvatar(currentAssignee.email)}
              alt={currentAssignee.name}
              className="h-9 w-9 rounded-full object-cover border"
              style={{ borderColor: TK.borderSubtle }}
            />
            <div>
              <div className="text-[16px] font-semibold text-gray-900">
                Reassign Tasks from {currentAssignee.name}
              </div>
              <div className="text-xs text-gray-500">
                {currentAssignee.email} · Inactive — 42d
              </div>
            </div>
          </div>
          {/* <button
            className="h-8 w-8 grid place-items-center rounded border hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.borderSubtle }}
            title="Close"
            onClick={() => alert("Close drawer")}
          >
            <X className="h-4 w-4" />
          </button> */}
        </div>
      </div>

      {/* KPI Cards (value under title • chart on right) */}
      <div className="mx-4 mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        {/* Assigned */}
        <div className="rounded-xl border bg-white p-3" style={{ borderColor: TK.border }}>
          <div className="flex items-stretch justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClipboardList className="h-4 w-4" style={{ color: TK.blue }} />
                <span>Total Assigned</span>
              </div>
              <div className="mt-1 text-xl font-semibold text-gray-900">
                {summary.total.toLocaleString()}
              </div>
            </div>
            <div className="w-40 md:w-44 lg:w-48">
              <AreaMini series={trendAssigned} color={TK.blue} aria="Total assigned trend" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-xl border bg-white p-3" style={{ borderColor: TK.border }}>
          <div className="flex items-stretch justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4" style={{ color: TK.blue }} />
                <span>Completed</span>
              </div>
              <div className="mt-1 text-xl font-semibold text-gray-900">
                {summary.completed.toLocaleString()}
              </div>
            </div>
            <div className="w-40 md:w-44 lg:w-48">
              <AreaMini series={trendCompleted} color={TK.blue} aria="Completed trend" />
            </div>
          </div>
        </div>

        {/* Active / Pending */}
        <div className="rounded-xl border bg-white p-3" style={{ borderColor: TK.border }}>
          <div className="flex items-stretch justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Timer className="h-4 w-4" style={{ color: TK.blue }} />
                <span>Active / Pending</span>
              </div>
              <div className="mt-1 text-xl font-semibold text-gray-900">
                {summary.active.toLocaleString()}
              </div>
            </div>
            <div className="w-40 md:w-44 lg:w-48">
              <AreaMini series={trendActive} color={TK.blue} aria="Active trend" />
            </div>
          </div>
        </div>

        {/* Projects (list) */}
        <div className="rounded-xl border bg-white p-3" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FolderKanban className="h-4 w-4" style={{ color: TK.brand }} />
            <span>Projects Affected</span>
          </div>
          <div className="mt-1 text-xl font-semibold text-gray-900">
            {summary.projects.length}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-gray-700">
            {summary.projects.slice(0, 3).map((p) => {
              const dom = domainOf(p.name);
              return (
                <div key={p.id} className="flex items-center gap-2" title={dom}>
                  <img src={faviconUrl(dom, 32)} alt="" className="h-4 w-4 rounded-sm" />
                  <span className="truncate">{p.name}</span>
                </div>
              );
            })}
            {summary.projects.length === 0 && <div className="text-gray-500">—</div>}
          </div>
        </div>
      </div>

      {/* Filtered Table */}
      <div className="mx-4 mt-4 rounded-xl border bg-white" style={{ borderColor: TK.border }}>
        {/* Filters Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
          style={{ borderColor: TK.borderSubtle }}
        >
          <div className="text-base font-semibold text-gray-900">Tasks to Reassign</div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="h-8 w-[260px] rounded border pl-7 pr-2 text-sm outline-none placeholder:text-gray-400"
                style={{ borderColor: TK.borderSubtle }}
                placeholder="Search tasks..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Status filter */}
            <ChipDropdown
              label={<span className={selStatuses.length !== 3 ? "font-semibold" : ""}>Status</span>}
              active={selStatuses.length !== 3}
            >
              <div className="mb-2 text-sm font-medium">Select statuses</div>
              {STATUS.map((s) => (
                <label key={s} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selStatuses.includes(s)}
                    onChange={(e) =>
                      setSelStatuses((arr) =>
                        e.target.checked ? Array.from(new Set([...arr, s])) : arr.filter((x) => x !== s)
                      )
                    }
                  />
                  <StatusPill s={s} />
                </label>
              ))}
            </ChipDropdown>

            {/* Project filter */}
            <ChipDropdown
              label={<span className={selProjects.length ? "font-semibold" : ""}>Projects</span>}
              active={selProjects.length > 0}
            >
              <div className="mb-2 text-sm font-medium">Filter by project</div>
              <div className="max-h-56 overflow-auto pr-1">
                {PROJECTS.map((p) => {
                  const dom = domainOf(p.name);
                  return (
                    <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selProjects.includes(p.id)}
                        onChange={(e) =>
                          setSelProjects((arr) =>
                            e.target.checked ? [...arr, p.id] : arr.filter((x) => x !== p.id)
                          )
                        }
                      />
                      <img src={faviconUrl(dom, 32)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                      <span title={dom}>{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </ChipDropdown>

            {/* Due filter */}
            <ChipDropdown label={<span className={due !== "all" ? "font-semibold" : ""}>Due</span>} active={due !== "all"}>
              <div className="mb-2 text-sm font-medium">Due window</div>
              {(["all", "overdue", "week", "none"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 py-1 text-sm">
                  <input type="radio" checked={due === k} onChange={() => setDue(k)} />
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    {k === "all" ? "All" : k === "week" ? "Due this week" : k === "none" ? "No due date" : "Overdue"}
                  </span>
                </label>
              ))}
            </ChipDropdown>

            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderSubtle }}
              onClick={() => {
                setQ("");
                setSelStatuses(["Not Started", "In Progress", "Blocked"]);
                setSelProjects([]);
                setDue("all");
                setPage(1);
              }}
            >
              <Filter className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b" style={{ borderColor: TK.border }}>
                <th className="w-10 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={pageAllSelected}
                    onChange={(e) => toggleAllOnPage(e.target.checked)}
                  />
                </th>
                <th className="min-w-[320px] px-3 py-2 text-left">Task Title</th>
                <th className="min-w-[160px] px-3 py-2 text-left">Status</th>
                <th className="min-w-[200px] px-3 py-2 text-left">Project</th>
                <th className="min-w-[220px] px-3 py-2 text-left">Assignee</th>
                {assignMode === "perRow" && <th className="min-w-[220px] px-3 py-2 text-left">New Assignee</th>}
                <th className="min-w-[140px] px-3 py-2 text-left">Due</th>
                <th className="min-w-[140px] px-3 py-2 text-left">View</th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-gray-500">
                    No tasks match your filters.
                  </td>
                </tr>
              )}
              {view.map((t) => {
                const disabled = t.status === "Completed";
                const dom = domainOf(t.projectName);
                return (
                  <tr key={t.taskId} className="border-b hover:bg-[rgba(16,144,208,0.04)]" style={{ borderColor: TK.border }}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.title}`}
                        disabled={disabled}
                        checked={!!selected[t.taskId]}
                        onChange={(e) => setSelected((s) => ({ ...s, [t.taskId]: e.target.checked }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="text-[14px] font-medium text-[#0B4C6C] underline underline-offset-2 hover:text-[#08384f]"
                        title={t.description}
                      >
                        {t.title}
                      </button>
                      {disabled && <span className="ml-2 text-xs text-gray-500">Completed</span>}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill s={t.status} />
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
                        style={{ borderColor: TK.border, background: TK.subtle }}
                        title={dom}
                      >
                        <img src={faviconUrl(dom, 32)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                        {t.projectName}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={assigneeAvatar(currentAssignee.email)}
                          alt={currentAssignee.name}
                          className="h-8 w-8 rounded-full object-cover border"
                          style={{ borderColor: TK.borderSubtle }}
                        />
                        <div className="leading-tight">
                          <div className="text-sm font-medium text-gray-900">{currentAssignee.name}</div>
                          <div className="text-xs text-gray-500">{currentAssignee.email}</div>
                        </div>
                      </div>
                    </td>

                    {assignMode === "perRow" && (
                      <td className="px-3 py-2">
                        <select
                          className="h-8 w-full rounded border px-2 text-sm"
                          style={{ borderColor: TK.borderSubtle }}
                          value={perRowAssignee[t.taskId] || ""}
                          onChange={(e) =>
                            setPerRowAssignee((m) => ({ ...m, [t.taskId]: e.target.value }))
                          }
                          disabled={disabled}
                        >
                          <option value="" disabled>
                            Select user
                          </option>
                          {candidateUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}

                    <td className="px-3 py-2">
                      <span className="text-gray-800">{fmtDate(t.dueAt)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <RowActions task={t} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div
          className="flex items-center justify-between border-t px-3 py-3 text-sm text-gray-600"
          style={{ borderColor: TK.border }}
        >
          <div>
            Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(filtered.length, start + view.length)} of{" "}
            {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-8 rounded border px-2"
              style={{ borderColor: TK.borderSubtle }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              className="h-8 rounded border px-3 hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{ borderColor: TK.borderSubtle }}
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              First
            </button>
            <button
              className="h-8 rounded border px-3 hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{ borderColor: TK.borderSubtle }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <div className="w-16 text-center">
              {page} / {pages}
            </div>
            <button
              className="h-8 rounded border px-3 hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{ borderColor: TK.borderSubtle }}
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </button>
            <button
              className="h-8 rounded border px-3 hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{ borderColor: TK.borderSubtle }}
              disabled={page >= pages}
              onClick={() => setPage(pages)}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Assign To */}
      <div className="mx-4 mt-4 rounded-xl border bg-white" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.borderSubtle }}>
          <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Users className="h-5 w-5 text-[#0B4C6C]" />
            Assign To
          </div>
        </div>
        <div className="grid gap-3 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="assignMode"
                checked={assignMode === "one"}
                onChange={() => setAssignMode("one")}
              />
              <span className="inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#0B4C6C]" /> Assign all to one user
              </span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="assignMode"
                checked={assignMode === "perRow"}
                onChange={() => setAssignMode("perRow")}
              />
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-[#0B4C6C]" /> Assign individually
              </span>
            </label>
          </div>

          {assignMode === "one" ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-gray-600">New Assignee</div>
              <select
                className="h-9 w-[260px] rounded border px-2 text-sm"
                style={{ borderColor: TK.borderSubtle }}
                value={globalAssignee}
                onChange={(e) => setGlobalAssignee(e.target.value)}
              >
                <option value="">Select user</option>
                {candidateUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="h-9 rounded border px-3 text-sm hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderSubtle }}
                onClick={() => {
                  const fallback = candidateUsers[0]?.id;
                  if (!fallback) return;
                  const next = { ...perRowAssignee };
                  selectedTasks.forEach((t) => {
                    next[t.taskId] = fallback;
                  });
                  setPerRowAssignee(next);
                }}
              >
                Set same user for all selected
              </button>
              {perRowMissing > 0 && (
                <div className="text-sm text-[#7A1D1F]">
                  {perRowMissing} selected row(s) missing new assignee.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="mx-4 mt-4 rounded-xl border bg-white" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.borderSubtle }}>
          <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <MessageSquareText className="h-5 w-5 text-[#0B4C6C]" />
            Notifications
          </div>
        </div>
        <div className="grid gap-4 p-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-4 w-4" /> Notify new assignee(s) via email
              </span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={addComment} onChange={(e) => setAddComment(e.target.checked)} />
              <span className="inline-flex items-center gap-1.5">
                <MessageSquareText className="h-4 w-4" /> Add a comment to each task
              </span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mentionInComment}
                onChange={(e) => setMentionInComment(e.target.checked)}
              />
              <span className="inline-flex items-center gap-1.5">
                <AtSign className="h-4 w-4" /> Mention new assignee in comment
              </span>
            </label>
          </div>
          <div>
            <div className="mb-1 text-xs text-gray-500">Comment template (max 160 chars)</div>
            <textarea
              value={commentTemplate}
              onChange={(e) => setCommentTemplate(e.target.value.slice(0, 160))}
              rows={2}
              className="w-full rounded border p-2 text-sm"
              style={{ borderColor: TK.borderSubtle }}
            />
            <div className="mt-1 text-right text-xs text-gray-500">{commentTemplate.length}/160</div>
          </div>
        </div>
      </div>

      {/* Sticky Footer (Confirm / Reset / Cancel) */}
      <div className="sticky bottom-0 z-20 mt-4 bg-white/90 backdrop-blur">
        <div className="border-t px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-semibold">{selectedTasks.length}</span> tasks selected
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-9 rounded border px-3 text-sm hover:bg-[#F7FAFC] disabled:opacity-50"
              style={{color: "#fff",background: canConfirm ? TK.brand : "#9CA3AF",borderColor: canConfirm ? TK.brand : TK.borderSubtle,}}
                onClick={handleConfirm}
                disabled={!canConfirm}
                title="Confirm Reassignment"
              >
                Confirm Reassignment
              </button>
              <button
                className="h-9 rounded border px-3 text-sm hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderSubtle }}
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                className="h-9 rounded border px-3 text-sm hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderSubtle }}
                onClick={() => alert("Cancel")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────── Row Actions (branded icons) ───────────────────────────────── */
function RowActions({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative inline-flex items-center gap-1.5" ref={ref}>
      <button
        className="grid h-8 w-8 place-items-center rounded border hover:bg-[#F7FAFC]"
        style={{ borderColor: TK.borderSubtle }}
        title="View details"
        onClick={() => alert(`Open preview for ${task.title}`)}
      >
        <Eye className="h-4 w-4" style={{ color: TK.brand }} />
      </button>
      <button
        className="grid h-8 w-8 place-items-center rounded border hover:bg-[#F7FAFC]"
        style={{ borderColor: TK.borderSubtle }}
        title="More"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-44 rounded-md border bg-white p-1.5 shadow-lg"
          style={{ borderColor: TK.borderSubtle }}
        >
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-[#F7FAFC]"
            onClick={() => navigator.clipboard.writeText(task.taskId)}
          >
            <Copy className="h-4 w-4" /> Copy ID
          </button>
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-[#F7FAFC]"
            onClick={() => alert("Open in Taskboard")}
          >
            <ExternalLink className="h-4 w-4" /> Open in Taskboard
          </button>
        </div>
      )}
    </div>
  );
}
