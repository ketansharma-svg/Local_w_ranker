"use client";

import React, { memo, useMemo, forwardRef, useState, useRef } from "react";
import {
  History,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  MessageSquare,
  Clock3,
  CheckCircle2,
  StickyNote,
  Plus,
  ArrowRight,
  UserRound,
} from "lucide-react";

/* ───────────────────────── TOKENS — latest (aligned with recent designs) ───────────────────────── */
const TK = {
  brand: "#008CCD",          // branded icons for section title
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  panel: "#FFFFFF",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();

/* ───────────────────────── Types ───────────────────────── */
type PageEventKind =
  | "task_created"
  | "status"
  | "due"
  | "reassign"
  | "comment"
  | "completed"
  | "timelog"
  | "note_added"
  | "note_edited"
  | "note_pinned";

type TaskStatus = "not_started" | "in_progress" | "review" | "blocked" | "completed" | "cancelled";

export type PageEvent = {
  id: string;
  ts: string; // ISO
  kind: PageEventKind;
  actor: { id: string; name: string; avatar?: string };
  task?: {
    id: string;
    title: string;
    status?: TaskStatus;
    priority?: "low" | "medium" | "high";
    assignee?: string;
    due?: string;
  };
  note?: { id: string; title?: string };
  meta?: Record<string, any>; // from→to, deltaMinutes, preview, assigneeFrom/To, dueFrom/To ...
};

/* ───────────────────────── Helpers ───────────────────────── */
const statusColor: Record<TaskStatus, string> = {
  not_started: "#CBD5E1",
  in_progress: TK.valueBlue,
  review: TK.warn,
  blocked: "#F97316",
  completed: TK.success,
  cancelled: "#6C757D",
};

function formatTime(ts: string, tz?: string) {
  try {
    const d = new Date(ts);
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }).format(d);
  } catch {
    return "";
  }
}

function minutesToHM(m?: number) {
  const n = Number(m ?? 0);
  if (!n || n <= 0) return "0m";
  const h = Math.floor(n / 60);
  const mm = n % 60;
  return h ? `${h}h${mm ? ` ${mm}m` : ""}` : `${mm}m`;
}

function mark(text: string, q?: string) {
  if (!q || typeof text !== "string") return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  const a = text.slice(0, i), b = text.slice(i, i + q.length), c = text.slice(i + q.length);
  return (
    <>
      {a}
      <mark className="rounded px-0.5" style={{ background: "#FEF08A" }}>
        {b}
      </mark>
      {c}
    </>
  );
}

/* ───────────────────────── Row (modern, clickable, Inter fonts) ───────────────────────── */
export const TimelineFeedRow = memo(
  forwardRef(function TimelineFeedRow(
    {
      event,
      onOpen,
      onFilterChip,
      queryHighlight,
      timezone,
      dense = false,
      showChevron = true,
      className,
    }: {
      event: PageEvent;
      onOpen: (ev: PageEvent) => void;
      onFilterChip?: (intent: { type: string; payload: any }) => void;
      queryHighlight?: string;
      timezone?: string;
      dense?: boolean;
      showChevron?: boolean;
      className?: string;
    },
    ref: React.Ref<HTMLDivElement>
  ) {
    const time = formatTime(event.ts, timezone);

    const verb = useMemo(() => {
      switch (event.kind) {
        case "task_created":
          return "created";
        case "status":
          return "changed status";
        case "due":
          return "changed due date";
        case "reassign":
          return "reassigned";
        case "comment":
          return "commented on";
        case "completed":
          return "completed";
        case "timelog":
          return "logged time on";
        case "note_added":
          return "added note";
        case "note_edited":
          return "edited note";
        case "note_pinned":
          return "pinned note";
        default:
          return "updated";
      }
    }, [event.kind]);

    const title = event.task?.title ?? event.note?.title ?? "(untitled)";
    const isNote = !!event.note && !event.task;

    // Build "modern chips"
    const chips: React.ReactNode[] = [];

    if (event.kind === "status" && event.meta) {
      const from = event.meta.from as TaskStatus | undefined;
      const to = event.meta.to as TaskStatus | undefined;
      if (from || to) {
        chips.push(
          <Chip
            key="status"
            tone="blue"
            title="Status changed"
            onClick={() => onFilterChip?.({ type: "status", payload: { from, to } })}
          >
            {from && (
              <>
                <StatusDot color={statusColor[from]} />
                <span className="capitalize">{String(from).replace("_", " ")}</span>
              </>
            )}
            <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
            {to && (
              <>
                <StatusDot color={statusColor[to]} />
                <span className="capitalize">{String(to).replace("_", " ")}</span>
              </>
            )}
          </Chip>
        );
      }
    }

    if (event.kind === "due" && event.meta) {
      const from = event.meta.dueFrom as string | undefined;
      const to = event.meta.dueTo as string | undefined;
      let deltaStr = "";
      try {
        if (from && to) {
          const df = new Date(from),
            dt = new Date(to);
          const deltaDays = Math.round((+dt - +df) / 86400000);
          if (deltaDays !== 0) deltaStr = `${deltaDays > 0 ? "+" : ""}${deltaDays}d`;
        }
      } catch {}
      chips.push(
        <Chip
          key="due"
          tone="amber"
          title="Due date changed"
          onClick={() => onFilterChip?.({ type: "due", payload: { from, to } })}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{from ? new Date(from).toLocaleDateString() : "—"}</span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          <span>{to ? new Date(to).toLocaleDateString() : "—"}</span>
          {deltaStr && <span className="ml-1 text-[11px] text-gray-500">({deltaStr})</span>}
        </Chip>
      );
    }

    if (event.kind === "reassign" && event.meta) {
      const from = event.meta.assigneeFrom as string | undefined;
      const to = event.meta.assigneeTo as string | undefined;
      chips.push(
        <Chip
          key="assign"
          tone="indigo"
          title="Assignee changed"
          onClick={() => onFilterChip?.({ type: "assignee", payload: { from, to } })}
        >
          <UserRound className="h-3.5 w-3.5" />
          <span>{from ?? "Unassigned"}</span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          <span>{to ?? "Unassigned"}</span>
        </Chip>
      );
    }

    if (event.kind === "timelog") {
      const min = Number(event.meta?.deltaMinutes ?? 0);
      chips.push(
        <Chip
          key="time"
          tone="violet"
          title="Time logged"
          onClick={() => onFilterChip?.({ type: "timelog", payload: { min } })}
        >
          <Clock3 className="h-3.5 w-3.5" />
          <span>{minutesToHM(min)}</span>
        </Chip>
      );
    }

    const commentPreview =
      event.kind === "comment" && typeof event.meta?.preview === "string" ? event.meta.preview : "";

    const aria = `${event.actor.name} ${verb} ${isNote ? "note" : "task"} “${title}” at ${time}`;

    const KindBadge = () => {
      const map: Record<
        PageEventKind,
        { c: string; bg: string; Icon: React.ComponentType<any> }
      > = {
        task_created: { c: TK.valueBlue, bg: "rgba(0,119,255,0.12)", Icon: Plus },
        status: { c: TK.valueBlue, bg: "rgba(0,119,255,0.12)", Icon: ArrowRight },
        due: { c: TK.warn, bg: "rgba(245,158,11,0.12)", Icon: Calendar },
        reassign: { c: "#5B7CFA", bg: "rgba(91,124,250,0.12)", Icon: UserRound },
        comment: { c: TK.muted, bg: "rgba(107,114,128,0.12)", Icon: MessageSquare },
        completed: { c: TK.success, bg: "rgba(16,185,129,0.12)", Icon: CheckCircle2 },
        timelog: { c: "#7C3AED", bg: "rgba(124,58,237,0.12)", Icon: Clock3 },
        note_added: { c: TK.gray, bg: "rgba(156,163,175,0.12)", Icon: StickyNote },
        note_edited: { c: TK.gray, bg: "rgba(156,163,175,0.12)", Icon: StickyNote },
        note_pinned: { c: TK.gray, bg: "rgba(156,163,175,0.12)", Icon: StickyNote },
      };
      const m = map[event.kind] ?? map.comment;
      return (
        <span
          className="grid h-7 w-7 place-items-center rounded-full"
          aria-hidden
          style={{ color: m.c, background: m.bg }}
        >
          <m.Icon className="h-4 w-4" />
        </span>
      );
    };

    return (
      <div
        ref={ref}
        role="article"
        aria-label={aria}
        tabIndex={0}
        onClick={() => onOpen(event)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(event);
          }
        }}
        className={cn(
          "group grid grid-cols-[auto,auto,1fr,auto] items-start gap-3 rounded-[10px] border bg-white shadow-sm transition",
          dense ? "px-3 py-2" : "px-3.5 py-3",
          "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#D2EFFF]",
          "border-[color:var(--bcol)]",
          className
        )}
        style={{
          cursor: "pointer",
          fontFamily:
            'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
          ["--bcol" as any]: TK.borderLight,
        }}
      >
        {/* Time */}
        <time
          className={cn(
            "text-xs tabular-nums text-gray-500 leading-6",
            dense && "mt-0.5"
          )}
          title={new Date(event.ts).toLocaleString()}
        >
          {time}
        </time>

        {/* Kind */}
        <KindBadge />

        {/* Main */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Avatar name={event.actor.name} src={event.actor.avatar} />
            <div className="min-w-0">
              <div className="text-[13px] text-gray-900">
                <span className="font-medium">{event.actor.name}</span>{" "}
                <span className="text-gray-600">{verb}</span>{" "}
                <span
                  className={cn(
                    "font-medium underline-offset-2 decoration-transparent group-hover:underline",
                    isNote ? "text-slate-700" : "text-blue-700"
                  )}
                >
                  {mark(title, queryHighlight)}
                </span>
              </div>

              {/* Chips row */}
              {chips.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">{chips}</div>
              )}

              {/* Comment preview */}
              {commentPreview && (
                <div className="mt-1 text-[13px] leading-5 text-gray-600 line-clamp-2">
                  {mark(commentPreview, queryHighlight)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chevron */}
        {showChevron && (
          <div
            className="self-center pr-0.5 text-gray-400 group-hover:text-gray-600"
            aria-hidden
          >
            <ChevronRight className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  })
);

/* ───────────────────────── Sub‑components ───────────────────────── */
function Avatar({ name, src }: { name?: string; src?: string }) {
  const initials = String(name || "?")
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return src ? (
    <img
      src={src}
      alt=""
      className="h-7 w-7 rounded-full object-cover ring-1"
      // style={{ ringColor: TK.border }}
    />
  ) : (
    <div
      className="grid h-7 w-7 place-items-center rounded-full text-xs font-semibold"
      style={{ background: "#E5E7EB", color: "#374151", boxShadow: `inset 0 0 0 1px ${TK.border}` }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/** Modern chip — subtle tinted bg, ring, pointer */
function Chip({
  children,
  tone = "neutral",
  title,
  onClick,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "amber" | "indigo" | "violet" | "success" | "danger";
  title?: string;
  onClick?: () => void;
}) {
  const map: Record<string, { fg: string; bg: string; ring: string }> = {
    neutral: { fg: TK.muted, bg: "rgba(0,0,0,0.04)", ring: TK.borderLight },
    blue: { fg: TK.valueBlue, bg: "rgba(0,119,255,0.08)", ring: TK.pastelBlue },
    amber: { fg: TK.warn, bg: "rgba(245,158,11,0.10)", ring: "#FDE68A" },
    indigo: { fg: "#5B7CFA", bg: "rgba(91,124,250,0.10)", ring: "#DBEAFE" },
    violet: { fg: "#7C3AED", bg: "rgba(124,58,237,0.10)", ring: "#EDE9FE" },
    success: { fg: TK.success, bg: "rgba(16,185,129,0.10)", ring: "#D1FAE5" },
    danger: { fg: TK.danger, bg: "rgba(239,68,68,0.10)", ring: "#FECACA" },
  };
  const t = map[tone] ?? map.neutral;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
      style={{
        cursor: "pointer",
        color: t.fg,
        background: t.bg,
        boxShadow: `inset 0 0 0 1px ${t.ring}`,
      }}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── Section (Header with branded icon, modern filter chips) ───────────────────────── */
type FilterKey = "all" | "task" | "comment" | "note" | "time";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "task", label: "Tasks" },
  { key: "comment", label: "Comments" },
  { key: "note", label: "Notes" },
  { key: "time", label: "Time logs" },
];

export default function TimelineFeedSection() {
  const [active, setActive] = useState<FilterKey>("all");

  // Demo data (with profile images)
  const items = DEMO_EVENTS;

  const filtered = useMemo(() => {
    if (active === "all") return items;
    if (active === "task")
      return items.filter((e) =>
        ["task_created", "status", "due", "reassign", "completed"].includes(e.kind)
      );
    if (active === "comment") return items.filter((e) => e.kind === "comment");
    if (active === "note")
      return items.filter((e) => e.kind === "note_added" || e.kind === "note_edited" || e.kind === "note_pinned");
    if (active === "time") return items.filter((e) => e.kind === "timelog");
    return items;
  }, [active, items]);

  return (
    <section
      className="rounded-md border bg-white p-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header
        className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2"
        style={{ borderColor: TK.border }}
      >
        <div className="flex items-center gap-2">
          <History size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            Timeline
          </h2>
          <span className="text-xs text-gray-500">Latest activity on tasks & notes</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Modern Filters button (visual only) */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.valueBlue, background: TK.panel, cursor: "pointer" }}
            onClick={() => alert("Open advanced filters")}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const isOn = active === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActive(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  )}
                  style={{
                    cursor: "pointer",
                    color: isOn ? TK.valueBlue : TK.muted,
                    background: isOn ? "rgba(0,119,255,0.08)" : "rgba(0,0,0,0.04)",
                    boxShadow: `inset 0 0 0 1px ${isOn ? TK.pastelBlue : TK.borderLight}`,
                  }}
                  aria-pressed={isOn}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="space-y-2">
        {filtered.map((ev) => (
          <TimelineFeedRow
            key={ev.id}
            event={ev}
            onOpen={(e) => alert(`${e.kind.toUpperCase()} — ${e.task?.title || e.note?.title}`)}
            onFilterChip={(intent) => console.log("filter", intent)}
            timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
          />
        ))}

        {/* Skeleton */}
        <TimelineFeedRowSkeleton />
      </div>
    </section>
  );
}

/* ───────────────────────── Skeleton ───────────────────────── */
export function TimelineFeedRowSkeleton() {
  return (
    <div
      className="grid grid-cols-[auto,auto,1fr,auto] items-start gap-3 rounded-[10px] border bg-white px-3.5 py-3 shadow-sm"
      style={{ borderColor: TK.borderLight }}
    >
      <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
      <span className="h-7 w-7 animate-pulse rounded-full bg-gray-200" />
      <div className="min-w-0 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
          <div className="h-5 w-28 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>
      <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

/* ───────────────────────── Demo Data (with profile images) ───────────────────────── */
const DEMO_EVENTS: PageEvent[] = [
  {
    id: "e1",
    ts: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    kind: "task_created",
    actor: { id: "u1", name: "Aarav Singh", avatar: "https://i.pravatar.cc/40?img=5" },
    task: {
      id: "t1",
      title: "Fix CLS on /pricing",
      status: "in_progress",
      priority: "high",
      assignee: "Aarav",
      due: new Date(Date.now() + 86400000 * 2).toISOString(),
    },
  },
  {
    id: "e2",
    ts: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    kind: "status",
    actor: { id: "u2", name: "Neha Verma", avatar: "https://i.pravatar.cc/40?img=32" },
    task: { id: "t1", title: "Fix CLS on /pricing", status: "review" },
    meta: { from: "in_progress", to: "review" },
  },
  {
    id: "e3",
    ts: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    kind: "comment",
    actor: { id: "u3", name: "Rahul Mehta", avatar: "https://i.pravatar.cc/40?img=12" },
    task: { id: "t1", title: "Fix CLS on /pricing" },
    meta: {
      preview:
        "Pushed a patch that reduces layout shift on hero image. Please verify on mobile and tablet widths.",
    },
  },
  {
    id: "e4",
    ts: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    kind: "due",
    actor: { id: "u1", name: "Aarav Singh", avatar: "https://i.pravatar.cc/40?img=5" },
    task: { id: "t1", title: "Fix CLS on /pricing" },
    meta: {
      dueFrom: new Date(Date.now() + 86400000).toISOString(),
      dueTo: new Date(Date.now() + 86400000 * 2).toISOString(),
    },
  },
  {
    id: "e5",
    ts: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    kind: "timelog",
    actor: { id: "u4", name: "Priya Sharma", avatar: "https://i.pravatar.cc/40?img=45" },
    task: { id: "t2", title: "Add FAQ schema to /seo-services" },
    meta: { deltaMinutes: 95 },
  },
  {
    id: "e6",
    ts: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    kind: "reassign",
    actor: { id: "u2", name: "Neha Verma", avatar: "https://i.pravatar.cc/40?img=32" },
    task: { id: "t2", title: "Add FAQ schema to /seo-services" },
    meta: { assigneeFrom: "Priya", assigneeTo: "Rahul" },
  },
  {
    id: "e7",
    ts: new Date(Date.now() - 1000 * 30).toISOString(),
    kind: "completed",
    actor: { id: "u5", name: "Kabir Patel", avatar: "https://i.pravatar.cc/40?img=66" },
    task: { id: "t3", title: "Fix 404s in blog /category/seo" },
  },
  {
    id: "e8",
    ts: new Date(Date.now() - 1000 * 10).toISOString(),
    kind: "note_added",
    actor: { id: "u1", name: "Aarav Singh", avatar: "https://i.pravatar.cc/40?img=5" },
    note: { id: "n1", title: "Client requested white‑label PDF for August" },
  },
];
