"use client";

/**
 * Approvals & Deadlines (mini‑Kanban + modular Calendar) — drop‑in TSX
 * - Inter / Inter Fallback (root)
 * - Tokens: brand/borders/text/status/focus/radius/shadow (Wranker v1)
 * - Board <-> Calendar toggle: brand‑filled segmented switch
 * - Board column headers: branded icons
 * - Calendar: highlighted header, weekday names, titles in day cells, stage chips + Project/Locale filters,
 *   Month / 2‑Week modes, day drawer with actions
 */

import React, { useCallback, useMemo, useRef, useState, useEffect, ReactElement } from "react";
import {
  Check,
  CircleEllipsis,
  Clock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Search,
  FileText,
  ShieldCheck,
  MessageSquareMore,
  UserPlus,
  Users,
  X,
  Download,
  ArrowLeftRight,
  Lock,
  Info,
} from "lucide-react";

/* ───────────────── Tokens (JS fallbacks—actual values from CSS vars) ───────────────── */
const TK = {
  brand: "var(--brand, #008CCD)",
  brand600: "var(--brand-600, #007BB8)",
  onBrand: "var(--on-brand, rgba(255,255,255,0.88))",
  bgApp: "var(--bg-app, #F5F7FA)",
  bgPanel: "var(--bg-panel, #FFFFFF)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  border: "var(--border, #E5E7EB)",
  textStrong: "var(--text-strong, #111827)",
  text: "var(--text, #374151)",
  textMuted: "var(--text-muted, #6B7280)",
  critical: "var(--critical, #E94134)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  warning: "var(--warning, #F9BB04)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  success: "var(--success, #34A853)",
  successBg: "var(--success-bg, #CBF8D7)",
  focus: "var(--focus, #4286F5)",
  radius: "var(--radius, 6px)",
  shadow1: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))",
} as const;

const fontStack: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter Fallback", "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

/* ───────────────── Types ───────────────── */
type ColumnKey = "review" | "legal" | "client" | "approved";
type Priority = "low" | "normal" | "high";
type SLA = "on_time" | "due_soon" | "late";

export interface ApprovalCard {
  id: string;
  doc_id: string;
  title: string;
  project: { id: string; domain: string; favicon_url?: string };
  content_type: string;
  locale: string;
  approval_state: ColumnKey;
  due_at: string;
  assignees: { id: string; name: string; avatar?: string }[];
  badges?: ("changes_requested")[];
  priority?: Priority;
  age_days?: number;
  deep_link: string;
}

export interface ApprovalsBoardSnapshot {
  columns: Record<ColumnKey, string[]>;
  counts: Record<ColumnKey, number>;
}

export interface ApprovalsDeadlinesProps {
  items?: ApprovalCard[];
  board?: ApprovalsBoardSnapshot;
  timeWindowLabel?: string;
  filterChips?: string[];
  loading?: boolean;
  error?: string | null;
  canApprove?: boolean;
  onOpenFull?: () => void;
  onMovePersist?: (taskId: string, from: ColumnKey, to: ColumnKey) => Promise<void> | void;
  onApprovePersist?: (taskId: string, fromColumn: ColumnKey) => Promise<void> | void;
  onRequestChangesPersist?: (taskId: string, note: string, column: ColumnKey) => Promise<void> | void;
  onReassignPersist?: (taskId: string, toUserName: string) => Promise<void> | void;
  onDueUpdatePersist?: (taskId: string, nextISO: string) => Promise<void> | void;
}

/* ───────────────── Utilities ───────────────── */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmt = (d: Date) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const daysDiff = (a: Date, b: Date) => Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);

function classifySLA(dueISO: string): SLA {
  const now = new Date();
  const due = new Date(dueISO);
  const diff = daysDiff(due, now);
  if (diff < 0) return "late";
  if (diff <= 7) return "due_soon";
  return "on_time";
}
function slaChipStyles(sla: SLA) {
  if (sla === "late") return { bg: TK.criticalBg, fg: TK.critical, label: "Overdue" };
  if (sla === "due_soon") return { bg: TK.warningBg, fg: TK.warning, label: "Due soon" };
  return { bg: TK.successBg, fg: TK.success, label: "On‑time" };
}
function nextColumn(k: ColumnKey): ColumnKey | null {
  if (k === "review") return "legal";
  if (k === "legal") return "client";
  if (k === "client") return "approved";
  return null;
}
const columnTitles: Record<ColumnKey, string> = {
  review: "Review",
  legal: "Legal",
  client: "Client",
  approved: "Approved",
};

/* ───────────────── Buttons / Chips ───────────────── */
function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:outline ",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-95 cursor-pointer",
        className
      )}
      style={{ background: TK.brand, color: TK.onBrand, outlineColor: TK.focus, ...style }}
    />
  );
}
function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm focus-visible:outline ",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-[color:var(--bg-app,#F5F7FA)] cursor-pointer",
        className
      )}
      style={{ borderColor: TK.border, color: TK.text, background: TK.bgPanel, outlineColor: TK.focus, ...style }}
    />
  );
}
function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm hover:bg-[color:var(--bg-app,#F5F7FA)] focus-visible:outline ",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      style={{ color: TK.text, background: "transparent", outlineColor: TK.focus, ...style }}
    />
  );
}
function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
      style={{ borderColor: TK.border, color: TK.text }}
    >
      {children}
    </span>
  );
}

/* ───────────────── Avatars ───────────────── */
function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return src ? (
    <img src={src} alt={name} className="h-6 w-6 rounded-full border" style={{ borderColor: TK.border }} />
  ) : (
    <div
      className="grid h-6 w-6 place-items-center rounded-full border text-[10px] font-semibold"
      title={name}
      style={{ borderColor: TK.border, color: TK.text }}
    >
      {initials}
    </div>
  );
}
function AvatarGroup({ people }: { people: { name: string; avatar?: string }[] }) {
  const shown = people.slice(0, 3);
  const overflow = Math.max(0, people.length - 3);
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <div key={i} className="inline-block" title={p.name}>
          <Avatar name={p.name} src={p.avatar} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="grid h-6 w-6 place-items-center rounded-full border text-[10px]"
          style={{ borderColor: TK.border, background: TK.bgPanel, color: TK.text }}
          title={`+${overflow}`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Due badge + popover ───────────────── */
function DueBadge({
  iso,
  onChange,
}: {
  iso: string;
  onChange: (nextISO: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const sla = classifySLA(iso);
  const { bg, fg, label } = slaChipStyles(sla);
  const d = new Date(iso);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px]"
        style={{ background: bg, color: fg, cursor: "pointer" }}
        title={fmt(d)}
      >
        <Clock size={14} /> {label} · {daysDiff(d, new Date()) >= 0 ? `in ${daysDiff(d, new Date())}d` : `${Math.abs(daysDiff(d, new Date()))}d late`}
      </button>
      {open && (
        <div
          className="absolute z-20 mt-2 w-56 rounded-md border bg-white p-2 text-sm shadow"
          style={{ borderColor: TK.border, boxShadow: TK.shadow1 }}
          role="dialog"
          aria-label="Set due date"
        >
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays size={16} style={{ color: TK.brand }} />
            <div className="font-medium" style={{ color: TK.textStrong }}>
              Due date
            </div>
          </div>
          <input
            type="date"
            className="mb-2 h-9 w-full rounded-md border px-2 outline-none focus-visible:outline "
            style={{ borderColor: TK.border, outlineColor: TK.focus }}
            defaultValue={iso.slice(0, 10)}
            onChange={(e) => {
              const next = e.target.value ? new Date(e.target.value) : new Date();
              onChange(next.toISOString());
            }}
          />
          <div className="flex items-center justify-between">
            <GhostButton onClick={() => onChange(startOfDay(new Date()).toISOString())}>Today</GhostButton>
            <GhostButton onClick={() => onChange(addDays(new Date(), 3).toISOString())}>+3d</GhostButton>
            <GhostButton onClick={() => onChange(addDays(new Date(), 7).toISOString())}>+7d</GhostButton>
            <GhostButton onClick={() => setOpen(false)}>
              <X size={14} /> Close
            </GhostButton>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────── Toasts ───────────────── */
function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; text: string; action?: { label: string; onClick: () => void } }[]>([]);
  const add = (text: string, action?: { label: string; onClick: () => void }) => {
    const id = Date.now() + Math.random();
    setToasts((xs) => [...xs, { id, text, action }]);
    setTimeout(() => setToasts((xs) => xs.filter((t) => t.id !== id)), 4000);
  };
  const remove = (id: number) => setToasts((xs) => xs.filter((t) => t.id !== id));
  return { toasts, add, remove };
}

/* ───────────────── Dialogs ───────────────── */
function RequestChangesDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string, reassignTo?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border bg-white p-4 shadow"
        style={{ borderColor: TK.border }}
        role="dialog"
        aria-label="Request changes"
      >
        <div className="mb-2 flex items-center gap-2">
          <MessageSquareMore size={18} style={{ color: TK.brand }} />
          <div className="text-base font-semibold" style={{ color: TK.textStrong }}>
            Request changes
          </div>
        </div>
        <label className="mb-1 block text-[12px]" style={{ color: TK.textMuted }}>
          Comment (required)
        </label>
        <textarea
          className="mb-3 min-h-[96px] w-full rounded-md border px-2 py-2 text-sm outline-none focus-visible:outline "
          style={{ borderColor: TK.border, outlineColor: TK.focus }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Explain what needs to change…"
        />
        <label className="mb-1 block text-[12px]" style={{ color: TK.textMuted }}>
          Assign rework to (optional)
        </label>
        <input
          className="mb-4 h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:outline "
          style={{ borderColor: TK.border, outlineColor: TK.focus }}
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="e.g., S. Rao"
        />
        <div className="flex items-center justify-end gap-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <SecondaryButton
            onClick={() => {
              if (!note.trim()) return;
              onSubmit(note.trim(), assignee.trim() || undefined);
              onClose();
            }}
          >
            Submit
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function AddNoteDialog({
  open,
  onClose,
  onSubmit,
  columnTitle,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
  columnTitle: string;
}) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!open) setNote("");
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-white p-4 shadow"
        style={{ borderColor: TK.border }}
        role="dialog"
        aria-label="Add note"
      >
        <div className="mb-2 flex items-center gap-2">
          <MessageSquareMore size={18} style={{ color: TK.brand }} />
          <div className="text-base font-semibold" style={{ color: TK.textStrong }}>
            Add note · {columnTitle}
          </div>
        </div>
        <textarea
          className="mb-3 min-h-[96px] w-full rounded-md border px-2 py-2 text-sm outline-none focus-visible:outline "
          style={{ borderColor: TK.border, outlineColor: TK.focus }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write a short note for this column…"
        />
        <div className="flex items-center justify-end gap-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <SecondaryButton
            onClick={() => {
              if (!note.trim()) return;
              onSubmit(note.trim());
              onClose();
            }}
          >
            Add note
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Brand‑filled Board/Calendar Toggle ───────────────── */
function BoardCalendarToggle({
  view,
  onChange,
}: {
  view: "board" | "calendar";
  onChange: (v: "board" | "calendar") => void;
}) {
  return (
    <div
      className="relative inline-flex items-center rounded-full border p-1"
      style={{ borderColor: TK.border, background: TK.bgApp }}
      role="tablist"
      aria-label="Board or Calendar view"
    >
      <button
        role="tab"
        aria-selected={view === "board"}
        onClick={() => onChange("board")}
        className={cn(
          "relative z-[1] h-8 rounded-full px-3 text-sm transition-colors",
          view === "board" ? "cursor-pointer" : "cursor-pointer"
        )}
        style={{
          color: view === "board" ? TK.onBrand : TK.text,
          background: view === "board" ? TK.brand : "transparent",
        }}
        title="Board"
      >
        <span className="inline-flex items-center gap-1">
          <FileText size={14} style={{ color: view === "board" ? TK.onBrand : TK.brand }} />
          Board
        </span>
      </button>
      <button
        role="tab"
        aria-selected={view === "calendar"}
        onClick={() => onChange("calendar")}
        className="relative z-[1] h-8 rounded-full px-3 text-sm transition-colors cursor-pointer"
        style={{
          color: view === "calendar" ? TK.onBrand : TK.text,
          background: view === "calendar" ? TK.brand : "transparent",
        }}
        title="Calendar"
      >
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={14} style={{ color: view === "calendar" ? TK.onBrand : TK.brand }} />
          Calendar
        </span>
      </button>
    </div>
  );
}

/* ───────────────── Card ───────────────── */
function TaskCard({
  card,
  compact,
  canApprove,
  onApprove,
  onRequestChanges,
  onOpenCanvas,
  onDueChange,
  onReassign,
  draggableProps,
  selected,
  onToggleSelect,
}: {
  card: ApprovalCard;
  compact: boolean;
  canApprove: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
  onOpenCanvas: () => void;
  onDueChange: (iso: string) => void;
  onReassign: () => void;
  draggableProps: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    tabIndex: number;
    "aria-grabbed": boolean;
  };
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const isApproved = card.approval_state === "approved";

  return (
    <div
      className={cn("group relative rounded-md border bg-white p-2 shadow-sm hover:shadow", compact ? "space-y-1" : "space-y-2")}
      style={{ borderColor: TK.borderSubtle, boxShadow: TK.shadow1 }}
      role="listitem"
      {...draggableProps}
    >
      {/* selection checkbox */}
      <div className="absolute right-2 top-2">
        <label className="inline-flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label="Select card" />
        </label>
      </div>

      {/* Title + project chip */}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium" title={card.title} style={{ color: TK.textStrong }}>
          {card.title}
        </div>
        <div className="mt-1 inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]" style={{ borderColor: TK.border, color: TK.text }} title={card.project.domain}>
            {card.project.favicon_url ? <img src={card.project.favicon_url} className="h-3.5 w-3.5 rounded" alt="" /> : <FileText size={12} style={{ color: TK.brand }} />}
            {card.project.domain}
          </span>
        </div>
      </div>

      {/* Meta + due */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12px]" style={{ color: TK.textMuted }}>
          {card.content_type} · {card.locale} · {columnTitles[card.approval_state]} · Canvas
        </div>
        <DueBadge iso={card.due_at} onChange={onDueChange} />
      </div>

      {/* Status chips (e.g., changes requested) */}
      {card.badges?.includes("changes_requested") && (
        <div className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px]" style={{ background: TK.criticalBg, color: TK.critical }}>
          <Info size={12} /> Changes requested
        </div>
      )}

      {/* Assignees + actions */}
      <div className="flex items-center justify-between">
        <AvatarGroup people={card.assignees} />
        <div className="inline-flex items-center gap-1">
          {!isApproved ? (
            <>
              <PrimaryButton onClick={onApprove} title="Approve">
                <Check size={16} /> Approve
              </PrimaryButton>
              <SecondaryButton onClick={onRequestChanges} title="Request changes">
                <ShieldCheck size={16} /> Request changes
              </SecondaryButton>
            </>
          ) : (
            <SecondaryButton onClick={onOpenCanvas} title="Open">
              <ExternalLink size={16} /> Open
            </SecondaryButton>
          )}
          <GhostButton onClick={onReassign} title="Reassign">
            <UserPlus size={16} />
          </GhostButton>
          <GhostButton onClick={onOpenCanvas} title="Open in Canvas">
            <ExternalLink size={16} />
          </GhostButton>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Column ───────────────── */
const columnIcon: Record<ColumnKey, React.ComponentType<any>> = {
  review: FileText,
  legal: ShieldCheck,
  client: Users,
  approved: Check,
};

function Column({
  column,
  items,
  compact,
  title,
  onSortChange,
  sortKey,
  onAddNoteClick,
  onDropCard,
  selectedIds,
  onToggleSelect,
  canApprove,
  onApprove,
  onRequestChanges,
  onOpenCanvas,
  onDueChange,
  onReassign,
  onLiftKeyboard,
  columnHasNotes,
}: {
  column: ColumnKey;
  items: ApprovalCard[];
  compact: boolean;
  title: string;
  sortKey: "due" | "priority" | "age";
  onSortChange: (k: "due" | "priority" | "age") => void;
  onAddNoteClick: () => void;
  onDropCard: (taskId: string, from: ColumnKey) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  canApprove: boolean;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string) => void;
  onOpenCanvas: (link: string) => void;
  onDueChange: (id: string, iso: string) => void;
  onReassign: (id: string) => void;
  onLiftKeyboard: (id: string) => void;
  columnHasNotes?: boolean;
}) {
  const [openSort, setOpenSort] = useState(false);
  const Icon = columnIcon[column];

  return (
    <section
      className="flex h-full min-w-[300px] flex-col rounded-md border bg-white"
      style={{ borderColor: TK.borderSubtle }}
      role="list"
      aria-label={`${title} column`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const taskId = e.dataTransfer.getData("text/task-id");
        const from = e.dataTransfer.getData("text/from") as ColumnKey;
        if (taskId) onDropCard(taskId, from);
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white px-2 py-2" style={{ borderColor: TK.borderSubtle }}>
        <div className="inline-flex items-center gap-2">
          <Icon size={16} style={{ color: TK.brand }} />
          <div className="text-sm font-semibold" style={{ color: TK.textStrong }}>
            {title}
          </div>
          <span className="rounded-full px-2 py-0.5 text-[12px]" style={{ background: TK.bgApp, color: TK.text }}>
            {items.length}
          </span>
          {columnHasNotes && <span className="rounded px-1 text-[11px]" style={{ background: TK.bgApp, color: TK.textMuted }} title="Has notes">•</span>}
        </div>
        <div className="relative inline-flex items-center gap-1">
          {/* Sort button: ChevronDown always visible */}
          <GhostButton onClick={() => setOpenSort((v) => !v)} aria-haspopup="menu" title="Sort">
            <ChevronDown size={16} />
            {sortKey === "due" ? "Due" : sortKey === "priority" ? "Priority" : "Age"}
          </GhostButton>
          <GhostButton onClick={onAddNoteClick} title="Add note">
            <MessageSquareMore size={16} /> Add note
          </GhostButton>
          {openSort && (
            <div className="absolute right-0 top-9 z-20 w-44 rounded-md border bg-white p-1 text-sm shadow" style={{ borderColor: TK.border }} role="menu">
              {(["due", "priority", "age"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    onSortChange(k);
                    setOpenSort(false);
                  }}
                  className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
                  style={{ cursor: "pointer" }}
                  role="menuitem"
                >
                  {k === "due" ? "Due date ↑" : k === "priority" ? "Priority" : "Age"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-auto p-2">
        {items.length === 0 ? (
          <div className="grid h-40 place-items-center rounded-md border text-sm" style={{ borderColor: TK.border, color: TK.textMuted }}>
            No items here.
          </div>
        ) : (
          items.map((card) => (
            <TaskCard
              key={card.id}
              card={card}
              compact={compact}
              canApprove={canApprove}
              onApprove={() => onApprove(card.id)}
              onRequestChanges={() => onRequestChanges(card.id)}
              onOpenCanvas={() => onOpenCanvas(card.deep_link)}
              onDueChange={(iso) => onDueChange(card.id, iso)}
              onReassign={() => onReassign(card.id)}
              draggableProps={{
                draggable: true,
                onDragStart: (e) => {
                  e.dataTransfer.setData("text/task-id", card.id);
                  e.dataTransfer.setData("text/from", card.approval_state);
                  e.dataTransfer.effectAllowed = "move";
                },
                onDragEnd: () => void 0,
                onKeyDown: (e) => {
                  if (e.key === " " || e.key === "Spacebar") {
                    e.preventDefault();
                    onLiftKeyboard(card.id);
                  }
                },
                tabIndex: 0,
                "aria-grabbed": false,
              }}
              selected={selectedIds.has(card.id)}
              onToggleSelect={() => onToggleSelect(card.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ───────────────── Calendar (modular, improved) ───────────────── */
type CalMode = "month" | "2w";
const stageFilters: { key: ColumnKey; label: string }[] = [
  { key: "review", label: "Review" },
  { key: "legal", label: "Legal" },
  { key: "client", label: "Client" },
  { key: "approved", label: "Approved" },
];

function DayDrawer({
  dateISO,
  tasks,
  canApprove,
  onApprove,
  onRequestChanges,
  onOpenCanvas,
  onDueChange,
  onClose,
}: {
  dateISO: string;
  tasks: ApprovalCard[];
  canApprove: boolean;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string) => void;
  onOpenCanvas: (href: string) => void;
  onDueChange: (id: string, iso: string) => void;
  onClose: () => void;
}) {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  return (
    <div className="mt-3 rounded-md border p-3" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <CalendarDays size={16} style={{ color: TK.brand }} />
          <div className="font-medium" style={{ color: TK.textStrong }}>
            {d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <GhostButton onClick={onClose}>
          <X size={14} /> Close
        </GhostButton>
      </div>
      {tasks.length === 0 ? (
        <div className="text-sm" style={{ color: TK.textMuted }}>
          No due items this day.
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-md border p-2" style={{ borderColor: TK.border }}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium" style={{ color: TK.textStrong }}>
                    {t.title}
                  </div>
                  <div className="text-[12px]" style={{ color: TK.textMuted }}>
                    {t.project.domain} · {t.content_type} · {t.locale} · {columnTitles[t.approval_state]}
                  </div>
                </div>
                <DueBadge iso={t.due_at} onChange={(iso) => onDueChange(t.id, iso)} />
              </div>
              {t.badges?.includes("changes_requested") && (
                <div className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px]" style={{ background: TK.criticalBg, color: TK.critical }}>
                  <Info size={12} /> Changes requested
                </div>
              )}
              <div className="mt-2 inline-flex items-center gap-2">
                {t.approval_state !== "approved" ? (
                  <>
                    <PrimaryButton onClick={() => onApprove(t.id)} disabled={!canApprove}>
                      <Check size={16} /> Approve
                    </PrimaryButton>
                    <SecondaryButton onClick={() => onRequestChanges(t.id)}>
                      <ShieldCheck size={16} /> Request changes
                    </SecondaryButton>
                  </>
                ) : (
                  <SecondaryButton onClick={() => onOpenCanvas(t.deep_link)}>
                    <ExternalLink size={16} /> Open
                  </SecondaryButton>
                )}
                <GhostButton onClick={() => onOpenCanvas(t.deep_link)}>
                  <ExternalLink size={16} /> Canvas
                </GhostButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CalendarView({
  items,
  canApprove,
  onApprove,
  onRequestChanges,
  onOpenCanvas,
  onDueChange,
}: {
  items: ApprovalCard[];
  canApprove: boolean;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string) => void;
  onOpenCanvas: (href: string) => void;
  onDueChange: (id: string, iso: string) => void;
}) {
  const today = startOfDay(new Date());
  const [mode, setMode] = useState<CalMode>("month");
  const [anchor, setAnchor] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [stageOn, setStageOn] = useState<Record<ColumnKey, boolean>>({ review: true, legal: true, client: true, approved: true });
  const [pickedISO, setPickedISO] = useState<string>("");
  const allProjects = useMemo(() => Array.from(new Set(items.map((t) => t.project.domain))), [items]);
  const allLocales = useMemo(() => Array.from(new Set(items.map((t) => t.locale))), [items]);
  const [projectFilter, setProjectFilter] = useState<string>("All projects");
  const [localeFilter, setLocaleFilter] = useState<string>("All locales");

  const matchesProject = (t: ApprovalCard) => (projectFilter === "All projects" ? true : t.project.domain === projectFilter);
  const matchesLocale = (t: ApprovalCard) => (localeFilter === "All locales" ? true : t.locale === localeFilter);

  const visibleItems = items.filter((t) => stageOn[t.approval_state] && matchesProject(t) && matchesLocale(t));

  const range = useMemo(() => {
    if (mode === "2w") {
      const wd = today.getDay();
      const monday = addDays(today, -((wd + 6) % 7));
      return { start: monday, end: addDays(monday, 13) };
    }
    const start = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const end = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
    return { start, end };
  }, [mode, anchor, today]);

  // Group visible items by day
  const byDay: Record<string, ApprovalCard[]> = {};
  visibleItems.forEach((t) => {
    const key = startOfDay(new Date(t.due_at)).toISOString().slice(0, 10);
    byDay[key] = byDay[key] || [];
    byDay[key].push(t);
  });

  // Weekday header labels
  const weekdayNames = Array.from({ length: 7 }).map((_, i) =>
    new Date(2025, 0, 5 + i).toLocaleDateString(undefined, { weekday: "short" }) // Sun..Sat
  );

  // Build cells
  const cells: ReactElement[] = [];
  if (mode === "month") {
    const pad = range.start.getDay(); // 0..6
    for (let i = 0; i < pad; i++) cells.push(<div key={`pad-${i}`} />);
    const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dateObj = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), d));
      const key = dateObj.toISOString().slice(0, 10);
      const list = byDay[key] || [];
      const dayName = dateObj.toLocaleDateString(undefined, { weekday: "short" });
      const top = list.slice(0, 2);

      cells.push(
        <div key={key} className="rounded-md border p-2" style={{ borderColor: TK.border }}>
          <button
            className="flex w-full items-center justify-between rounded px-1 py-0.5 text-left hover:bg-[color:var(--bg-app,#F5F7FA)] focus-visible:outline"
            style={{ outlineColor: TK.focus, cursor: "pointer" }}
            onClick={() => setPickedISO(key)}
            title={`${dayName} ${d}`}
          >
            <div className="text-sm font-medium" style={{ color: TK.text }}>
              {dayName} {d}
            </div>
            {list.length > 0 && (
              <span className="rounded px-1 text-[11px]" style={{ background: TK.bgApp, color: TK.textMuted }}>
                {list.length}
              </span>
            )}
          </button>

          {/* Top 1–2 titles inline */}
          <div className="mt-1 space-y-1">
            {top.map((t) => {
              const sla = classifySLA(t.due_at);
              const dotStyle =
                sla === "late"
                  ? { background: TK.critical }
                  : sla === "due_soon"
                  ? { background: TK.warning }
                  : { background: TK.success };
              return (
                <button
                  key={t.id}
                  className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
                  style={{ cursor: "pointer" }}
                  title={t.title}
                  onClick={() => setPickedISO(key)}
                >
                  <span className="mt-[6px] inline-block size-2 rounded-full" style={dotStyle} />
                  <span className="block min-w-0 truncate text-[12px]" style={{ color: TK.text }}>
                    {t.title}
                  </span>
                </button>
              );
            })}
            {list.length > 2 && (
              <button
                className="text-[12px] underline"
                style={{ color: TK.textMuted, cursor: "pointer" }}
                onClick={() => setPickedISO(key)}
              >
                View {list.length - 2} more
              </button>
            )}
          </div>
        </div>
      );
    }
  } else {
    // 2‑week strip
    for (let i = 0; i < 14; i++) {
      const d = addDays(range.start, i);
      const key = startOfDay(d).toISOString().slice(0, 10);
      const list = byDay[key] || [];
      const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
      const top = list.slice(0, 2);
      cells.push(
        <div key={key} className="rounded-md border p-2" style={{ borderColor: TK.border }}>
          <button
            className="flex w-full items-center justify-between rounded px-1 py-0.5 text-left hover:bg-[color:var(--bg-app,#F5F7FA)] focus-visible:outline"
            style={{ outlineColor: TK.focus, cursor: "pointer" }}
            onClick={() => setPickedISO(key)}
            title={`${dayName} ${d.getDate()}`}
          >
            <div className="text-sm font-medium" style={{ color: TK.text }}>
              {dayName} {d.getDate()}
            </div>
            {list.length > 0 && (
              <span className="rounded px-1 text-[11px]" style={{ background: TK.bgApp, color: TK.textMuted }}>
                {list.length}
              </span>
            )}
          </button>
          <div className="mt-1 space-y-1">
            {top.map((t) => {
              const sla = classifySLA(t.due_at);
              const dotStyle =
                sla === "late"
                  ? { background: TK.critical }
                  : sla === "due_soon"
                  ? { background: TK.warning }
                  : { background: TK.success };
              return (
                <button
                  key={t.id}
                  className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
                  style={{ cursor: "pointer" }}
                  onClick={() => setPickedISO(key)}
                  title={t.title}
                >
                  <span className="mt-[6px] inline-block size-2 rounded-full" style={dotStyle} />
                  <span className="block min-w-0 truncate text-[12px]" style={{ color: TK.text }}>
                    {t.title}
                  </span>
                </button>
              );
            })}
            {list.length > 2 && (
              <button
                className="text-[12px] underline"
                style={{ color: TK.textMuted, cursor: "pointer" }}
                onClick={() => setPickedISO(key)}
              >
                View {list.length - 2} more
              </button>
            )}
          </div>
        </div>
      );
    }
  }

  const selectedTasks = pickedISO ? (byDay[pickedISO] || []) : [];

  return (
    <div>
      {/* Calendar header (highlighted with filters) */}
      <div
        className="mb-3 rounded-md border px-3 py-2"
        style={{ borderColor: TK.border, background: TK.bgApp }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: nav + current label */}
          <div className="inline-flex items-center gap-2">
            <button
              className="rounded-md border px-2 py-1 hover:bg-[color:var(--bg-app,#F5F7FA)]"
              style={{ borderColor: TK.border, cursor: "pointer" }}
              onClick={() => setAnchor(new Date(today.getFullYear(), today.getMonth(), 1))}
            >
              Today
            </button>
            <div className="inline-flex items-center gap-1">
              <GhostButton onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}>
                <ChevronLeft size={16} />
              </GhostButton>
              <div className="text-sm font-semibold" style={{ color: TK.textStrong }}>
                {anchor.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </div>
              <GhostButton onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}>
                <ChevronRight size={16} />
              </GhostButton>
            </div>
          </div>

          {/* Right controls: Mode, Stage chips, Project & Locale dropdowns, SLA legend */}
          <div className="inline-flex flex-wrap items-center gap-2">
            {/* Mode segmented (brand fills active) */}
            <div className="inline-flex rounded-full border p-1" style={{ borderColor: TK.border, background: TK.bgPanel }}>
              <button
                className="h-8 rounded-full px-3 text-sm"
                onClick={() => setMode("month")}
                aria-pressed={mode === "month"}
                style={{ cursor: "pointer", background: mode === "month" ? TK.brand : "transparent", color: mode === "month" ? TK.onBrand : TK.text }}
              >
                Month
              </button>
              <button
                className="h-8 rounded-full px-3 text-sm"
                onClick={() => setMode("2w")}
                aria-pressed={mode === "2w"}
                style={{ cursor: "pointer", background: mode === "2w" ? TK.brand : "transparent", color: mode === "2w" ? TK.onBrand : TK.text }}
              >
                2‑Week
              </button>
            </div>

            {/* Stage filter chips */}
            <div className="inline-flex flex-wrap items-center gap-1">
              {stageFilters.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStageOn((st) => ({ ...st, [s.key]: !st[s.key] }))}
                  className={cn("rounded-full border px-2 py-0.5 text-[12px]", stageOn[s.key] ? "font-semibold" : "")}
                  style={{ borderColor: TK.border, cursor: "pointer" }}
                  title={s.label}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Project & Locale dropdowns */}
            <div className="inline-flex items-center gap-2">
              <select
                className="h-8 rounded-md border px-2 text-sm focus-visible:outline"
                style={{ borderColor: TK.border, outlineColor: TK.focus, cursor: "pointer" }}
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                title="Project"
              >
                <option>All projects</option>
                {allProjects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border px-2 text-sm focus-visible:outline"
                style={{ borderColor: TK.border, outlineColor: TK.focus, cursor: "pointer" }}
                value={localeFilter}
                onChange={(e) => setLocaleFilter(e.target.value)}
                title="Locale"
              >
                <option>All locales</option>
                {allLocales.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Legend */}
            <div className="inline-flex items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
              <span className="rounded px-1" style={{ background: TK.criticalBg, color: TK.critical }}>
                Late
              </span>
              <span className="rounded px-1" style={{ background: TK.warningBg, color: TK.warning }}>
                Due soon
              </span>
              <span className="rounded px-1" style={{ background: TK.successBg, color: TK.success }}>
                On‑time
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekday header row */}
      <div className="mb-1 grid grid-cols-7 gap-2">
        {weekdayNames.map((w, i) => (
          <div key={i} className="rounded-md border px-2 py-1 text-[12px] font-medium" style={{ borderColor: TK.border, background: TK.bgPanel, color: TK.textMuted }}>
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2">{cells}</div>

      {/* Day details drawer */}
      <DayDrawer
        dateISO={pickedISO}
        tasks={selectedTasks}
        canApprove={canApprove}
        onApprove={onApprove}
        onRequestChanges={onRequestChanges}
        onOpenCanvas={onOpenCanvas}
        onDueChange={onDueChange}
        onClose={() => setPickedISO("")}
      />
    </div>
  );
}

/* ───────────────── Overflow menu ───────────────── */
function OverflowMenu({
  densityCompact,
  onToggleDensity,
  groupByDue,
  onToggleGroupByDue,
  onExportCSV,
}: {
  densityCompact: boolean;
  onToggleDensity: () => void;
  groupByDue: boolean;
  onToggleGroupByDue: () => void;
  onExportCSV: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <GhostButton aria-haspopup="menu" title="More" onClick={() => setOpen((v) => !v)}>
        <CircleEllipsis size={16} />
      </GhostButton>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border bg-white p-1 text-sm shadow" style={{ borderColor: TK.border }}>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              onToggleDensity();
              setOpen(false);
            }}
          >
            {densityCompact ? "Comfortable density" : "Compact density"}
          </button>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              onToggleGroupByDue();
              setOpen(false);
            }}
          >
            {groupByDue ? "Group by due: Off" : "Group by due: On"}
          </button>
          <div className="px-2 py-1 text-[12px]" style={{ color: TK.textMuted }}>
            SLA colors: On‑time (success), Due soon ≤7d (warning), Overdue (critical)
          </div>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              onExportCSV();
              setOpen(false);
            }}
          >
            <Download size={14} className="mr-1 inline" /> Export CSV
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────── Main Section ───────────────── */
export default function ApprovalsDeadlines({
  items,
  board,
  timeWindowLabel = "Last 28 days",
  filterChips = [],
  loading,
  error,
  canApprove = true,
  onOpenFull,
  onMovePersist,
  onApprovePersist,
  onRequestChangesPersist,
  onReassignPersist,
  onDueUpdatePersist,
}: ApprovalsDeadlinesProps) {
  const rootStyle = fontStack;

  /* density / view / search */
  const [densityCompact, setDensityCompact] = useState(false);
  const [groupByDue, setGroupByDue] = useState(false);
  const [view, setView] = useState<"board" | "calendar">("board");
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState<Record<ColumnKey, "due" | "priority" | "age">>({ review: "due", legal: "due", client: "due", approved: "due" });

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelection((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelection(new Set());

  /* toasts + live region */
  const { toasts, add, remove } = useToasts();
  const liveRef = useRef<HTMLDivElement | null>(null);

  /* demo data (replace with real wiring) */
  const addDaysFromNow = (n: number) => addDays(new Date(), n).toISOString();
  const initialItems: ApprovalCard[] =
    items ||
    [
      {
        id: "t_4581", doc_id: "d_789", title: "What is Content Marketing? (2026 refresh)",
        project: { id: "p_12", domain: "wranker.com" },
        content_type: "Blog", locale: "en-US", approval_state: "review",
        due_at: addDaysFromNow(2),
        assignees: [{ id: "u_3", name: "S. Rao" }, { id: "u_4", name: "M. Lee" }],
        priority: "normal", deep_link: "/writer/canvas?project=p_12&draft=d_789",
      },
      {
        id: "t_4590", doc_id: "d_701", title: "Privacy Policy update",
        project: { id: "p_18", domain: "w3era.com" },
        content_type: "Docs", locale: "en-GB", approval_state: "legal",
        due_at: addDaysFromNow(-1),
        assignees: [{ id: "u_6", name: "A. Khan" }],
        badges: ["changes_requested"], priority: "high", deep_link: "/writer/canvas?project=p_18&draft=d_701",
      },
      {
        id: "t_4591", doc_id: "d_702", title: "Customer Case Study: FintechCo",
        project: { id: "p_12", domain: "wranker.com" },
        content_type: "Resource", locale: "en-US", approval_state: "client",
        due_at: addDaysFromNow(9),
        assignees: [{ id: "u_8", name: "J. Park" }],
        priority: "normal", deep_link: "/writer/canvas?project=p_12&draft=d_702",
      },
      {
        id: "t_4570", doc_id: "d_650", title: "Landing: AEO Optimizer",
        project: { id: "p_12", domain: "wranker.com" },
        content_type: "Landing", locale: "en-US", approval_state: "approved",
        due_at: addDaysFromNow(0),
        assignees: [{ id: "u_2", name: "R. Jain" }],
        priority: "low", deep_link: "/writer/canvas?project=p_12&draft=d_650",
      },
    ];

  const initialBoard: ApprovalsBoardSnapshot =
    board || { columns: { review: ["t_4581"], legal: ["t_4590"], client: ["t_4591"], approved: ["t_4570"] }, counts: { review: 1, legal: 1, client: 1, approved: 1 } };

  const [cards, setCards] = useState<Record<string, ApprovalCard>>(Object.fromEntries(initialItems.map((c) => [c.id, c])));
  const [cols, setCols] = useState<Record<ColumnKey, string[]>>({ ...initialBoard.columns });

  /* Column notes (per “Add note” modal) */
  const [notes, setNotes] = useState<Record<ColumnKey, { id: number; text: string; ts: number }[]>>({ review: [], legal: [], client: [], approved: [] });
  const [noteOpenCol, setNoteOpenCol] = useState<ColumnKey | null>(null);

  /* search filter */
  const textMatches = (c: ApprovalCard) =>
    [c.title, c.assignees.map((a) => a.name).join(" ")].join(" ").toLowerCase().includes(searchQ.toLowerCase());

  /* sorting + optional group by due */
  type SortKey = "due" | "priority" | "age";
  const sortColumn = (ids: string[], k: ColumnKey) => {
    const sorted = [...ids].sort((a, b) => {
      const ca = cards[a], cb = cards[b];
      const key = sortBy[k];
      if (key === "priority") {
        const rank: Record<Priority, number> = { high: 0, normal: 1, low: 2 };
        return (rank[ca.priority || "normal"] ?? 1) - (rank[cb.priority || "normal"] ?? 1);
      }
      if (key === "age") return (ca.age_days || 0) - (cb.age_days || 0);
      return new Date(ca.due_at).getTime() - new Date(cb.due_at).getTime();
    });
    if (!groupByDue) return sorted;
    const order: SLA[] = ["late", "due_soon", "on_time"];
    const bucket = (id: string) => order.indexOf(classifySLA(cards[id].due_at));
    return sorted.sort((a, b) => bucket(a) - bucket(b));
  };

  const colItems: Record<ColumnKey, ApprovalCard[]> = {
    review: sortColumn(cols.review.filter((id) => textMatches(cards[id])), "review").map((id) => cards[id]),
    legal: sortColumn(cols.legal.filter((id) => textMatches(cards[id])), "legal").map((id) => cards[id]),
    client: sortColumn(cols.client.filter((id) => textMatches(cards[id])), "client").map((id) => cards[id]),
    approved: sortColumn(cols.approved.filter((id) => textMatches(cards[id])), "approved").map((id) => cards[id]),
  };

  /* DnD + keyboard moves */
  const moveCard = useCallback((taskId: string, to: ColumnKey) => {
    setCols((prev) => {
      const from = (Object.keys(prev) as ColumnKey[]).find((k) => prev[k].includes(taskId)) as ColumnKey;
      if (!from || from === to) return prev;
      const next = { ...prev };
      next[from] = next[from].filter((id) => id !== taskId);
      next[to] = [taskId, ...next[to]];
      setCards((cs) => ({ ...cs, [taskId]: { ...cs[taskId], approval_state: to } }));
      const undo = () => {
        setCols((p) => {
          const back = { ...p };
          back[to] = back[to].filter((id) => id !== taskId);
          back[from] = [taskId, ...back[from]];
          setCards((c2) => ({ ...c2, [taskId]: { ...c2[taskId], approval_state: from } }));
          return back;
        });
      };
      // optimistic toast
      add(`Moved to ${columnTitles[to]}.`, { label: "Undo", onClick: undo });
      onMovePersist?.(taskId, from, to);
      liveRef.current?.append(`Moved ${taskId} to ${columnTitles[to]}. `);
      return next;
    });
  }, [add, onMovePersist]);

  const [kbdLift, setKbdLift] = useState<{ id: string; from: ColumnKey } | null>(null);
  const onLiftKeyboard = (id: string) => {
    const from = (Object.keys(cols) as ColumnKey[]).find((k) => cols[k].includes(id)) as ColumnKey;
    setKbdLift({ id, from });
    add("Lifted card. Use ←/→ to pick a column, Space to drop.");
  };
  const onKeyDownBoard = (e: React.KeyboardEvent) => {
    if (!kbdLift) return;
    const order: ColumnKey[] = ["review", "legal", "client", "approved"];
    const curIndex = order.indexOf(cards[kbdLift.id].approval_state);
    if (e.key === "ArrowRight") {
      moveCard(kbdLift.id, order[Math.min(order.length - 1, curIndex + 1)]);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      moveCard(kbdLift.id, order[Math.max(0, curIndex - 1)]);
      e.preventDefault();
    } else if (e.key === " " || e.key === "Spacebar") {
      setKbdLift(null);
      add("Dropped.");
      e.preventDefault();
    } else if (e.key === "Escape") {
      setKbdLift(null);
      add("Cancelled.");
      e.preventDefault();
    }
  };

  /* Actions */
  const openCanvas = (href: string) => window.open(href, "_blank");
  const approve = (id: string) => {
    const from = cards[id].approval_state;
    const to = nextColumn(from);
    if (!to) return;
    moveCard(id, to);
    onApprovePersist?.(id, from);
  };
  const [rcOpenFor, setRcOpenFor] = useState<string | null>(null);
  const submitRequestChanges = (note: string, reassignTo?: string) => {
    if (!rcOpenFor) return;
    setCards((cs) => ({ ...cs, [rcOpenFor]: { ...cs[rcOpenFor], badges: Array.from(new Set([...(cs[rcOpenFor].badges || []), "changes_requested"])) } }));
    if (reassignTo) onReassignPersist?.(rcOpenFor, reassignTo);
    onRequestChangesPersist?.(rcOpenFor, note, cards[rcOpenFor].approval_state);
    add("Changes requested.");
    setRcOpenFor(null);
  };
  const setDue = (id: string, iso: string) => {
    setCards((cs) => ({ ...cs, [id]: { ...cs[id], due_at: iso } }));
    onDueUpdatePersist?.(id, iso);
  };

  /* Export CSV */
  const exportCSV = () => {
    const rows = [["id", "title", "project", "state", "due_at", "assignees"].join(",")];
    Object.values(cards).forEach((c) =>
      rows.push([c.id, `"${c.title.replace(/"/g, '""')}"`, c.project.domain, c.approval_state, c.due_at, `"${c.assignees.map((a) => a.name).join("; ")}"`].join(","))
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "approvals.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  /* Bulk */
  const selectionIds = Array.from(selection);
  const bulkApprove = () => { selectionIds.forEach((id) => approve(id)); setSelection(new Set()); };
  const [bulkRCOpen, setBulkRCOpen] = useState(false);
  const submitBulkRC = (note: string, reassignTo?: string) => {
    selectionIds.forEach((id) => {
      setCards((cs) => ({ ...cs, [id]: { ...cs[id], badges: Array.from(new Set([...(cs[id].badges || []), "changes_requested"])) } }));
      if (reassignTo) onReassignPersist?.(id, reassignTo);
      onRequestChangesPersist?.(id, note, cards[id].approval_state);
    });
    add(`Requested changes on ${selectionIds.length} item(s).`);
    setSelection(new Set()); setBulkRCOpen(false);
  };

  /* Error / loading */
  if (error) {
    return (
      <section className="rounded-md border bg-white p-3" style={{ borderColor: TK.borderSubtle, ...rootStyle }} role="region" aria-label="Approvals & Deadlines">
        <div className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: TK.critical, background: TK.criticalBg, color: TK.textStrong }}>
          Error loading Approvals. <button className="underline" style={{ cursor: "pointer" }} onClick={() => location.reload()}>Retry</button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-md border bg-white p-3 mt-4" style={{ borderColor: TK.borderSubtle, ...rootStyle }} role="region" aria-label="Approvals & Deadlines" onKeyDown={onKeyDownBoard}>
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <FileText size={18} style={{ color: TK.brand }} />
          <h3 className="text-[20px] font-semibold" style={{ color: TK.textStrong }}>Approvals & Deadlines</h3>
          <MetaChip><Clock size={12} /> {timeWindowLabel}</MetaChip>
          {filterChips.map((c, i) => (<MetaChip key={i}><Filter size={12} /> {c}</MetaChip>))}
        </div>
        <div className="inline-flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex h-9 items-center gap-2 rounded-md border px-2" style={{ borderColor: TK.border }}>
            <Search size={16} />
            <input className="h-8 w-48 outline-none" placeholder="Find task or assignee…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} aria-label="Search tasks" />
          </div>

          {/* Brand‑filled Board/Calendar toggle */}
          <BoardCalendarToggle view={view} onChange={setView} />

          {/* Overflow */}
          <OverflowMenu
            densityCompact={densityCompact}
            onToggleDensity={() => setDensityCompact((v) => !v)}
            groupByDue={groupByDue}
            onToggleGroupByDue={() => setGroupByDue((v) => !v)}
            onExportCSV={exportCSV}
          />
          <SecondaryButton onClick={onOpenFull}><ExternalLink size={16} /> Open full Activity & Approvals</SecondaryButton>
        </div>
      </div>

      {/* Bulk toolbar */}
      {selection.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border bg-white px-3 py-2" style={{ borderColor: TK.borderSubtle }}>
          <div className="text-sm" style={{ color: TK.text }}>Selected {selection.size}</div>
          <div className="inline-flex items-center gap-2">
            <PrimaryButton onClick={() => { selectionIds.forEach((id) => approve(id)); setSelection(new Set()); }}>
              <Check size={16} /> Approve selected
            </PrimaryButton>
            <SecondaryButton onClick={() => setBulkRCOpen(true)}>
              <ShieldCheck size={16} /> Request changes
            </SecondaryButton>
            <GhostButton onClick={clearSelection}><X size={14} /> Clear</GhostButton>
          </div>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-[380px] animate-pulse rounded-md border bg-white" style={{ borderColor: TK.borderSubtle }} />))}
        </div>
      ) : view === "calendar" ? (
        <div className="rounded-md border bg-white p-3" style={{ borderColor: TK.borderSubtle }}>
          <CalendarView
            items={Object.values(cards)}
            canApprove={canApprove}
            onApprove={approve}
            onRequestChanges={(id) => setRcOpenFor(id)}
            onOpenCanvas={(href) => window.open(href, "_blank")}
            onDueChange={setDue}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(["review", "legal", "client", "approved"] as ColumnKey[]).map((k) => (
            <Column
              key={k}
              column={k}
              items={colItems[k]}
              compact={densityCompact}
              title={columnTitles[k]}
              sortKey={sortBy[k]}
              onSortChange={(kk) => setSortBy((s) => ({ ...s, [k]: kk }))}
              onAddNoteClick={() => setNoteOpenCol(k)}
              onDropCard={(taskId, from) => { if (from !== k) moveCard(taskId, k); }}
              selectedIds={selection}
              onToggleSelect={toggleSelect}
              canApprove={canApprove}
              onApprove={(id) => approve(id)}
              onRequestChanges={(id) => setRcOpenFor(id)}
              onOpenCanvas={(href) => window.open(href, "_blank")}
              onDueChange={setDue}
              onReassign={(id) => { const name = prompt("Reassign to (display name)?"); if (name) onReassignPersist?.(id, name); }}
              onLiftKeyboard={onLiftKeyboard}
              columnHasNotes={(notes[k] || []).length > 0}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <RequestChangesDialog open={!!rcOpenFor} onClose={() => setRcOpenFor(null)} onSubmit={submitRequestChanges} />
      <RequestChangesDialog open={selection.size > 0 && bulkRCOpen} onClose={() => setBulkRCOpen(false)} onSubmit={submitBulkRC} />
      <AddNoteDialog
        open={noteOpenCol !== null}
        onClose={() => setNoteOpenCol(null)}
        onSubmit={(text) => {
          if (!noteOpenCol) return;
          setNotes((n) => ({ ...n, [noteOpenCol]: [...(n[noteOpenCol] || []), { id: Date.now(), text, ts: Date.now() }] }));
        }}
        columnTitle={noteOpenCol ? columnTitles[noteOpenCol] : ""}
      />

      {/* aria-live region for announcements */}
      <div className="sr-only" aria-live="polite" ref={liveRef} />

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm shadow" style={{ borderColor: TK.border, boxShadow: TK.shadow1 }}>
            <span>{t.text}</span>
            {t.action && (
              <button className="rounded px-1 text-sm underline" style={{ cursor: "pointer" }} onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
            <GhostButton onClick={() => remove(t.id)}><X size={14} /></GhostButton>
          </div>
        ))}
      </div>
    </section>
  );
}
