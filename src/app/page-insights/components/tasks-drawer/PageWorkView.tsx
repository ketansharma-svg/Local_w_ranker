"use client"

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, ListTodo, StickyNote, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Section 2: View switch (Timeline | Tasks | Notes)
 * Redesigned to match the latest tokens, chip patterns, and tab style used across recent designs.
 * - Inter / Inter Fallback font stack
 * - Branded (#008CCD) tab icons
 * - Selected tab chip uses brand pastel background (#D9EEF8) + brand text/icon
 * - Modern chips for filters (brand / warn / danger tones)
 * - Pointer cursor on all clickable UI
 *
 * Tokens & patterns aligned with the latest Wranker dashboard spec (2025‑08‑21). :contentReference[oaicite:0]{index=0}
 */

/* ───────────────────────────────── TOKENS (latest) ───────────────────────────────── */
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#0077FF",
  pastelBrand: "#D9EEF8",

  surface: "#FFFFFF",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",

  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",

  success: "#10B981",
  warning: "#F59E0B",
  warningPastel: "rgba(245,158,11,0.15)",
  danger: "#EF4444",
  dangerPastel: "rgba(239,68,68,0.15)",
} as const;

const RADIUS = 999; // chips
const RADIUS_PANEL = 8;
const BORDER = 1;

/* ───────────────────────────────── Safe session storage ───────────────────────────────── */
const ssGet = (k: string) => {
  try {
    return typeof window !== "undefined" ? window.sessionStorage.getItem(k) : null;
  } catch {
    return null;
  }
};
const ssSet = (k: string, v: string) => {
  try {
    if (typeof window !== "undefined") window.sessionStorage.setItem(k, v);
  } catch {}
};

/* ───────────────────────────────── Deep-link helpers (#drawer=page-work&view=tasks) ───────────────────────────────── */
export type ViewKey = "timeline" | "tasks" | "notes";
function readViewFromHash(): ViewKey | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash.includes("&") ? hash.split("?").pop() : hash);
  const view = params.get("view");
  if (view === "timeline" || view === "tasks" || view === "notes") return view;
  return null;
}
function writeViewToHash(view: ViewKey) {
  if (typeof window === "undefined") return;
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash.includes("&") ? hash.split("?").pop() : hash);
  params.set("drawer", "page-work");
  params.set("view", view);
  const next = `#${params.toString()}`;
  if (window.location.hash !== next) {
    history.replaceState(null, "", next);
  }
}

/* ───────────────────────────────── Types / Props ───────────────────────────────── */
export type TimelineKind =
  | "task_created"
  | "status"
  | "due"
  | "reassign"
  | "comment"
  | "completed"
  | "timelog"
  | "note";

export interface PageWorkViewTabsProps {
  pageId: string;
  counts?: Partial<Record<ViewKey, number>>;
  defaultView?: ViewKey;

  renderTimeline?: (state: { kinds: Set<TimelineKind>; mineOnly: boolean }) => React.ReactNode;
  renderTasks?: (state: { density: "comfortable" | "compact" }) => React.ReactNode;
  renderNotes?: (state: { showPinnedFirst: boolean; authorId?: string | null }) => React.ReactNode;

  onViewChange?: (view: ViewKey) => void;
  onRequestSlice?: (payload: Record<string, any>) => void;
}

/* ───────────────────────────────── Small primitives ───────────────────────────────── */
function TabBadge({ n }: { n?: number }) {
  if (typeof n !== "number") return null;
  return (
    <span
      className="ml-2 inline-flex items-center rounded-full px-2 text-[10px] leading-5"
      style={{ background: TOKENS.chipBg, color: TOKENS.muted, border: `${BORDER}px solid ${TOKENS.border}` }}
    >
      {n}
    </span>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  tone = "default",
  title,
}: {
  active?: boolean;
  label: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "brand" | "danger" | "warn";
  title?: string;
}) {
  const base = {
    default: {
      on: { bg: TOKENS.chipBg, text: TOKENS.text, brd: TOKENS.border },
      off: { bg: TOKENS.surface, text: TOKENS.muted, brd: TOKENS.border },
    },
    brand: {
      on: { bg: TOKENS.pastelBrand, text: TOKENS.brand, brd: TOKENS.pastelBrand },
      off: { bg: TOKENS.surface, text: TOKENS.brand, brd: TOKENS.border },
    },
    danger: {
      on: { bg: TOKENS.dangerPastel, text: TOKENS.danger, brd: TOKENS.dangerPastel },
      off: { bg: TOKENS.surface, text: TOKENS.danger, brd: TOKENS.border },
    },
    warn: {
      on: { bg: TOKENS.warningPastel, text: TOKENS.warning, brd: TOKENS.warningPastel },
      off: { bg: TOKENS.surface, text: TOKENS.warning, brd: TOKENS.border },
    },
  }[tone];

  const s = active ? base.on : base.off;

  return (
    <button
      type="button"
      title={title}
      aria-pressed={!!active}
      onClick={onClick}
      className="cursor-pointer inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2"
      style={{
        background: s.bg,
        color: s.text,
        border: `${BORDER}px solid ${s.brd}`,
        borderRadius: RADIUS,
        boxShadow: "0 0 0 0 rgba(0,0,0,0)",
      }}
    >
      {label}
    </button>
  );
}

function TabChip({
  active,
  icon: Icon,
  label,
  onClick,
  id,
  controls,
}: {
  active: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: any;
  onClick: () => void;
  id: string;
  controls: string;
}) {
  return (
    <button
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold focus:outline-none focus-visible:ring-2"
      style={{
        background: active ? TOKENS.pastelBrand : TOKENS.surface,
        color: active ? TOKENS.brand : TOKENS.muted,
        border: `${BORDER}px solid ${active ? TOKENS.pastelBrand : TOKENS.border}`,
        borderRadius: RADIUS,
      }}
    >
      <Icon
        size={16}
        className="shrink-0"
        // style={{ color: TOKENS.brand, opacity: active ? 1 : 0.9 }}
      />
      <span>{label}</span>
    </button>
  );
}

/* ───────────────────────────────── Helpers ───────────────────────────────── */
function kindLabel(k: TimelineKind) {
  const m: Record<TimelineKind, string> = {
    task_created: "Tasks",
    status: "Status",
    due: "Due edits",
    reassign: "Reassign",
    comment: "Comments",
    completed: "Completed",
    timelog: "Time logged",
    note: "Notes",
  };
  return m[k];
}
function kindTitle(k: TimelineKind) {
  return (
    {
      task_created: "Task created",
      status: "Status changes",
      due: "Due date edits",
      reassign: "Reassignments",
      comment: "Comments",
      completed: "Completions",
      timelog: "Time log entries",
      note: "Notes added/edited/pinned",
    } as Record<TimelineKind, string>
  )[k];
}

function Placeholder({ label, helper }: { label: string; helper?: string }) {
  return (
    <div
      className="grid place-items-center rounded-lg border p-8 text-center"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
        {label} view
      </div>
      <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
        {helper}
      </div>
      <div className="mt-4 grid w-full gap-2">
        <div className="h-9 animate-pulse rounded-md" style={{ background: TOKENS.chipBg }} />
        <div className="h-9 animate-pulse rounded-md" style={{ background: TOKENS.chipBg }} />
        <div className="h-9 animate-pulse rounded-md" style={{ background: TOKENS.chipBg }} />
      </div>
    </div>
  );
}

/* ───────────────────────────────── Main component ───────────────────────────────── */
export default function PageWorkViewTabs({
  pageId,
  counts,
  defaultView = "timeline",
  renderTimeline,
  renderTasks,
  renderNotes,
  onViewChange,
  onRequestSlice,
}: PageWorkViewTabsProps) {
  /* Persisted / deep‑link initial view */
  const storageKey = `wr:page:${pageId}:work:view`;
  const [view, setView] = useState<ViewKey>(() => {
    return readViewFromHash() ?? (ssGet(storageKey) as ViewKey) ?? defaultView;
  });

  useEffect(() => {
    ssSet(storageKey, view);
    writeViewToHash(view);
    onViewChange?.(view);
  }, [view]);

  /* Tabs keyboard navigation */
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const order: ViewKey[] = ["timeline", "tasks", "notes"];
  const moveFocus = (dir: -1 | 1) => {
    const idx = order.indexOf(view);
    const next = (idx + dir + order.length) % order.length;
    setView(order[next]);
    tabsRef.current[next]?.focus();
  };

  /* Timeline state (chips) */
  const allKinds: TimelineKind[] = [
    "task_created",
    "status",
    "due",
    "reassign",
    "comment",
    "completed",
    "timelog",
    "note",
  ];
  const kindsKey = `wr:page:${pageId}:work:timeline.kinds`;
  const mineKey = `wr:page:${pageId}:work:timeline.mine`;

  const [timelineKinds, setTimelineKinds] = useState<Set<TimelineKind>>(() => {
    const raw = ssGet(kindsKey);
    if (raw) try { return new Set(JSON.parse(raw) as TimelineKind[]); } catch {}
    return new Set(allKinds);
  });
  const [mineOnly, setMineOnly] = useState<boolean>(() => ssGet(mineKey) === "true");

  useEffect(() => {
    ssSet(kindsKey, JSON.stringify(Array.from(timelineKinds)));
  }, [timelineKinds]);
  useEffect(() => {
    ssSet(mineKey, String(mineOnly));
  }, [mineOnly]);

  /* Tasks state (density) */
  const densityKey = `wr:page:${pageId}:work:tasks.density`;
  const [density, setDensity] = useState<"comfortable" | "compact">(
    () => (ssGet(densityKey) as any) || "comfortable"
  );
  useEffect(() => {
    ssSet(densityKey, density);
  }, [density]);

  /* Notes header state */
  const pinnedKey = `wr:page:${pageId}:work:notes.pinnedFirst`;
  const [notesPinnedFirst, setNotesPinnedFirst] = useState<boolean>(() => ssGet(pinnedKey) !== "false");
  useEffect(() => {
    ssSet(pinnedKey, String(notesPinnedFirst));
  }, [notesPinnedFirst]);
  const [notesAuthorId, setNotesAuthorId] = useState<string | null>(null);

  /* Emitters */
  const emitSlice = (payload: Record<string, any>) => onRequestSlice?.(payload);
  const badge = (k: ViewKey) => counts?.[k];

  /* Labels/Icons */
  const tabMeta: Record<ViewKey, { label: string; Icon: React.ComponentType<any> }> = {
    timeline: { label: "Timeline", Icon: Clock3 },
    tasks: { label: "Tasks", Icon: ListTodo },
    notes: { label: "Notes", Icon: StickyNote },
  };

  return (
    <section
      aria-label="Tasks & Notes — View switch"
      className="mt-3"
      style={{
        // Inter + Inter Fallback font stack
        fontFamily:
          'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      {/* ───────── Tab strip ───────── */}
      <div
        role="tablist"
        aria-label="View"
        className="sticky top-0 z-10 bg-white"
        style={{ borderBottom: `${BORDER}px solid ${TOKENS.border}` }}
      >
        <div className="flex items-center gap-2 py-2">
          {order.map((k, i) => {
            const active = view === k;
            const { label, Icon } = tabMeta[k];
            return (
              <TabChip
                key={k}
                active={active}
                icon={Icon}
                label={
                  <>
                    <span>{label}</span>
                    <TabBadge n={badge(k)} />
                  </>
                }
                id={`wr-tab-${k}`}
                controls={`wr-panel-${k}`}
                onClick={() => setView(k)}
              />
            );
          })}
          <div className="ml-auto flex items-center gap-1 pr-0.5 text-xs" style={{ color: TOKENS.muted }}>
            {/* Arrow key hint (kept subtle) */}
            <ChevronLeft size={14} className="opacity-60" />
            <ChevronRight size={14} className="opacity-60" />
            <span className="hidden sm:inline">Use arrow keys</span>
          </div>
        </div>
      </div>

      {/* Keyboard bindings on the container for tabs */}
      <div
        className="sr-only"
        aria-hidden
        onKeyDownCapture={(e) => {
          if (e.key === "ArrowRight") moveFocus(1);
          if (e.key === "ArrowLeft") moveFocus(-1);
          if (e.key === "Home") {
            setView("timeline");
            tabsRef.current[0]?.focus();
          }
          if (e.key === "End") {
            setView("notes");
            tabsRef.current[2]?.focus();
          }
        }}
      />

      {/* ───────── View-specific control bars ───────── */}
      {view === "timeline" && (
        <div
          className="flex flex-wrap items-center gap-2 border-b py-2"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs font-medium" style={{ color: TOKENS.muted }}>
              Types:
            </span>
            {allKinds.map((k) => (
              <FilterChip
                key={k}
                active={timelineKinds.has(k)}
                onClick={() => {
                  const next = new Set(timelineKinds);
                  next.has(k) ? next.delete(k) : next.add(k);
                  setTimelineKinds(next);
                }}
                label={kindLabel(k)}
                title={`Toggle ${kindTitle(k)}`}
              />
            ))}
            <FilterChip
              label="All"
              tone="brand"
              active={timelineKinds.size === allKinds.length}
              onClick={() => setTimelineKinds(new Set(allKinds))}
              title="Show all activity types"
            />
            <FilterChip
              label="None"
              onClick={() => setTimelineKinds(new Set())}
              title="Hide all types"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <FilterChip
              tone="brand"
              active={mineOnly}
              onClick={() => setMineOnly((v) => !v)}
              label={
                <span className="inline-flex items-center gap-1">
                  <SlidersHorizontal size={14} style={{ color: TOKENS.brand }} />
                  My activity
                </span>
              }
              title="Show only activity by me"
            />
          </div>
        </div>
      )}

      {view === "tasks" && (
        <div
          className="flex flex-wrap items-center gap-2 border-b py-2"
          style={{ borderColor: TOKENS.border }}
        >
          <span className="mr-1 text-xs font-medium" style={{ color: TOKENS.muted }}>
            Quick slices:
          </span>
          <FilterChip
            tone="brand"
            label="Open"
            onClick={() => emitSlice?.({ status_not_in: ["completed", "cancelled"] })}
            title="Status ≠ Completed/Cancelled"
          />
          <FilterChip
            tone="danger"
            label="Overdue"
            onClick={() => emitSlice?.({ due_lt: "today", status_ne: "completed" })}
            title="Due < today and not completed"
          />
          <FilterChip
            tone="warn"
            label="Due Today"
            onClick={() => emitSlice?.({ due_eq: "today", status_ne: "completed" })}
            title="Due = today and not completed"
          />
          <FilterChip
            label="Assigned to me"
            onClick={() => emitSlice?.({ assignee_eq: "me" })}
            title="Assignee = me"
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs" style={{ color: TOKENS.muted }}>
              Density
            </span>
            <FilterChip
              tone={density === "comfortable" ? "brand" : "default"}
              active={density === "comfortable"}
              label="Comfortable"
              onClick={() => setDensity("comfortable")}
            />
            <FilterChip
              tone={density === "compact" ? "brand" : "default"}
              active={density === "compact"}
              label="Compact"
              onClick={() => setDensity("compact")}
            />
          </div>
        </div>
      )}

      {view === "notes" && (
        <div
          className="flex flex-wrap items-center gap-2 border-b py-2"
          style={{ borderColor: TOKENS.border }}
        >
          <FilterChip
            tone="brand"
            active={notesPinnedFirst}
            onClick={() => setNotesPinnedFirst((v) => !v)}
            label="Show pinned first"
          />
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs" htmlFor="notes-author" style={{ color: TOKENS.muted }}>
              Author
            </label>
            <select
              id="notes-author"
              className="h-8 rounded-md px-2 text-xs"
              style={{
                color: TOKENS.text,
                background: TOKENS.surface,
                border: `${BORDER}px solid ${TOKENS.border}`,
                borderRadius: RADIUS_PANEL,
              }}
              value={notesAuthorId ?? ""}
              onChange={(e) => setNotesAuthorId(e.target.value || null)}
            >
              <option value="">All</option>
              {/* wire actual authors here */}
              <option value="me">Me</option>
            </select>
          </div>
        </div>
      )}

      {/* ───────── Panels ───────── */}
      <div id={`wr-panel-${view}`} role="tabpanel" aria-labelledby={`wr-tab-${view}`} className="py-3">
        {view === "timeline" &&
          (renderTimeline ? (
            renderTimeline({ kinds: timelineKinds, mineOnly })
          ) : (
            <Placeholder label="Timeline" helper="Render your unified activity feed here." />
          ))}

        {view === "tasks" &&
          (renderTasks ? (
            renderTasks({ density })
          ) : (
            <Placeholder label="Tasks" helper="Render your tasks table/list here." />
          ))}

        {view === "notes" &&
          (renderNotes ? (
            renderNotes({ showPinnedFirst: notesPinnedFirst, authorId: notesAuthorId ?? undefined })
          ) : (
            <Placeholder label="Notes" helper="Render your notes list & composer here." />
          ))}
      </div>
    </section>
  );
}
