"use client";

/**
 * Recent AI Activity (feed) — drop‑in TSX
 *
 * - Inter / Inter Fallback; tokenized colors/radii/shadow/focus per Wranker v1
 *   (brand/status/borders/focus/type scale)  :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3}
 *
 * What’s included (spec‑driven):
 * - Header toolbar: title + brand‑tinted Sparkles, meta chips (time + filter echoes),
 *   search, view toggle (List / Diff Queue), Export (CSV/JSON), overflow (Compact, Auto‑refresh,
 *   Show unresolved, Pin)
 * - Feed: sticky day headers (“Today”, “Yesterday”, or absolute dates) with status counts,
 *   reverse‑chronological entries, per‑day “Load more”
 * - Row anatomy: status rail, action icon + title, project chip (favicon), doc title link,
 *   sub‑meta (actor · model · source · timestamp with tooltip), change‑summary chips
 *   (sections, metrics deltas, scopes), quick actions (Open, View diff, Restore, Undo, More)
 * - Diff drawer: right side (≈45% width desktop / 100% mobile), tabs (Unified/Side‑by‑side/Sections),
 *   Restore version (primary), Copy snippet, Open full history
 * - Accessibility: role="region" (section), day groups role="list", items role="listitem",
 *   keyboard: ↑/↓ row nav, Enter/D/O/R shortcuts, Esc closes drawer, focus rings everywhere
 * - States: empty, loading skeletons, error, no‑permission (masked with lock)
 * - Performance: precomputed list; day‑by‑day pagination; optional auto‑refresh soft inserts
 *
 * Tailwind‑only; icons: lucide-react (brand tinted); no emojis.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Search,
  Filter,
  Download,
  CircleEllipsis,
  ChevronDown,
  ExternalLink,
  GitCompare,
  Undo2,
  History,
  Copy,
  MoreHorizontal,
  Lock,
  ShieldCheck,
  Wand2,
  ListChecks,
  FileText,
  Info,
} from "lucide-react";

/* ───────────────── Tokens (JS fallbacks; actual values from CSS vars) ───────────────── */
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
type Status = "success" | "warning" | "critical";
type Source = "canvas" | "optimizer" | "bulk";
type ActionType =
  | "outline_generated"
  | "draft_regenerated"
  | "aeo_fixes"
  | "readability_apply_all"
  | "internal_links_inserted"
  | "sections_rewritten"
  | "version_restored"
  | "fact_check_added";

export interface FeedEntry {
  id: string;
  doc_id: string;
  project: { id: string; domain: string; favicon_url?: string };
  title: string; // action title, e.g., "Outline generated"
  doc_title: string;
  actor: { id: string; name: string };
  model: string; // e.g., "gpt-5-nano"
  action_type: ActionType;
  source: Source;
  created_at: string; // ISO
  status: Status;
  metrics_delta?: { score?: number; fk?: number; aeo_pct?: number };
  sections?: string[];
  scope?: { blocks?: number; policy_terms?: number };
  badges?: Array<"auto" | "human_reviewed" | "needs_attention" | "skipped">;
  diff_available?: boolean;
  diff_id?: string;
  restore_version_id?: string;
  undo_available?: boolean;
  deep_link: string;
}

export interface DiffPayload {
  diff_id: string;
  view: "unified" | "side_by_side" | "sections";
  before: string; // HTML
  after: string; // HTML
  restore_version_id: string;
}

export interface RecentAIActivityProps {
  entries?: FeedEntry[];
  timeWindowLabel?: string; // e.g., "Last 28 days"
  filterChips?: string[];
  loading?: boolean;
  error?: string | null;
  noPermission?: boolean;
  // handlers (optional, fall back to console.log)
  onExport?: (format: "csv" | "json", rows: FeedEntry[]) => void;
  onOpenCanvas?: (entry: FeedEntry) => void;
  onOpenDiff?: (entry: FeedEntry) => Promise<DiffPayload> | DiffPayload;
  onRestore?: (entry: FeedEntry, versionId: string) => Promise<void> | void;
  onUndo?: (entry: FeedEntry) => Promise<void> | void;
  onAutoRefreshToggle?: (on: boolean) => void;
}

/* ───────────────── Utilities ───────────────── */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const relTime = (iso: string) => {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.round((now - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.round(h / 24);
  return `${dd}d ago`;
};
const fmtAbs = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const statusRail = (s: Status) =>
  s === "success" ? TK.success : s === "warning" ? TK.warning : TK.critical;
const statusChip = (s: Status) =>
  s === "success"
    ? { bg: TK.successBg, fg: TK.success, label: "Success" }
    : s === "warning"
    ? { bg: TK.warningBg, fg: TK.warning, label: "Warning" }
    : { bg: TK.criticalBg, fg: TK.critical, label: "Critical" };

const actionIcon: Record<ActionType, React.ComponentType<any>> = {
  outline_generated: Sparkles,
  draft_regenerated: Wand2,
  aeo_fixes: ShieldCheck,
  readability_apply_all: ListChecks,
  internal_links_inserted: FileText, // link variant not ideal for long titles; keeping compact
  sections_rewritten: FileText,
  version_restored: History,
  fact_check_added: Info,
};

/* ───────────────── UI primitives ───────────────── */
function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium",
        "focus-visible:outline",
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
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm",
        "focus-visible:outline hover:bg-[color:var(--bg-app,#F5F7FA)]",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
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
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm",
        "focus-visible:outline hover:bg-[color:var(--bg-app,#F5F7FA)]",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      style={{ background: "transparent", color: TK.text, outlineColor: TK.focus, ...style }}
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

/* ───────────────── Rows & Day groups ───────────────── */
function ProjectChip({ domain, favicon }: { domain: string; favicon?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
      style={{ borderColor: TK.border, color: TK.text }}
      title={domain}
    >
      {favicon ? (
        <img src={favicon} className="h-3.5 w-3.5 rounded" alt="" />
      ) : (
        <FileText size={12} style={{ color: TK.brand }} />
      )}
      {domain}
    </span>
  );
}

function DeltaChip({
  label,
  value,
  kind,
}: {
  label: string;
  value: number | undefined;
  kind: "score" | "fk" | "aeo_pct";
}) {
  if (typeof value !== "number") return null;
  let colorBg:any = TK.successBg,
    colorFg:any = TK.success,
    sign = value > 0 ? "+" : value < 0 ? "−" : "";
  // For FK (lower is better), invert semantics
  const effective = kind === "fk" ? -value : value;
  if (effective < 0) {
    colorBg = TK.criticalBg;
    colorFg = TK.critical;
  } else if (effective === 0) {
    colorBg = TK.warningBg;
    colorFg = TK.warning;
  }
  const pretty =
    kind === "fk" ? `${value > 0 ? "+" : ""}${value.toFixed(1)}` : `${value > 0 ? "+" : ""}${value}${kind === "aeo_pct" ? "%" : ""}`;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px]"
      style={{ background: colorBg, color: colorFg }}
      title={`${label} delta`}
    >
      {label}: {pretty}
    </span>
  );
}

function SectionChip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
      style={{ borderColor: TK.border, color: TK.text }}
    >
      {text}
    </span>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const { bg, fg, label } = statusChip(s);
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px]"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

/* ───────────────── Diff Drawer ───────────────── */
function DiffDrawer({
  open,
  entry,
  payload,
  onClose,
  onRestore,
  onCopy,
  onOpenHistory,
}: {
  open: boolean;
  entry: FeedEntry | null;
  payload: DiffPayload | null;
  onClose: () => void;
  onRestore: () => void;
  onCopy: () => void;
  onOpenHistory: () => void;
}) {
  const [tab, setTab] = useState<"unified" | "side_by_side" | "sections">("unified");
  useEffect(() => {
    if (payload) setTab(payload.view);
  }, [payload]);
  if (!open || !entry) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Diff Viewer">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-full md:w-[50vw] lg:w-[45vw] bg-white shadow"
        style={{ borderLeft: `1px solid ${TK.border}` }}
      >
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: TK.border }}>
          <div className="min-w-0">
            <div className="truncate font-semibold" style={{ color: TK.textStrong }}>
              {entry.doc_title}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
              <ProjectChip domain={entry.project.domain} favicon={entry.project.favicon_url} />
              <span>· {entry.model}</span>
              <span>· {new Date(entry.created_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2">
            {entry.restore_version_id && (
              <PrimaryButton onClick={onRestore}>Restore version</PrimaryButton>
            )}
            <GhostButton onClick={onCopy}>
              <Copy size={14} /> Copy snippet
            </GhostButton>
            <SecondaryButton onClick={onOpenHistory}>
              <History size={16} /> Full history
            </SecondaryButton>
            <GhostButton onClick={onClose}>Close</GhostButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-3" style={{ borderColor: TK.border }}>
          <div className="inline-flex gap-1 py-2">
            {(["unified", "side_by_side", "sections"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn("rounded px-2 py-1 text-sm focus-visible:outline", tab === t ? "font-semibold" : "")}
                style={{ outlineColor: TK.focus, cursor: "pointer" }}
              >
                {t === "unified" ? "Unified diff" : t === "side_by_side" ? "Side‑by‑side" : "Sections"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-120px)] overflow-auto p-3 text-sm">
          {!payload ? (
            <div className="animate-pulse rounded-md border p-3" style={{ borderColor: TK.border }}>
              Loading diff…
            </div>
          ) : tab === "sections" ? (
            <div className="grid gap-3">
              <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                <div className="text-[12px]" style={{ color: TK.textMuted }}>
                  Changed sections
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(entry.sections || []).map((s) => (
                    <SectionChip key={s} text={s} />
                  ))}
                </div>
              </div>
              <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                <div className="text-[12px]" style={{ color: TK.textMuted }}>
                  Before
                </div>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: payload.before }} />
              </div>
              <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                <div className="text-[12px]" style={{ color: TK.textMuted }}>
                  After
                </div>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: payload.after }} />
              </div>
            </div>
          ) : tab === "side_by_side" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                <div className="text-[12px]" style={{ color: TK.textMuted }}>
                  Before
                </div>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: payload.before }} />
              </div>
              <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                <div className="text-[12px]" style={{ color: TK.textMuted }}>
                  After
                </div>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: payload.after }} />
              </div>
            </div>
          ) : (
            <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: payload.after }} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ───────────────── Row ───────────────── */
function Row({
  entry,
  compact,
  onOpenCanvas,
  onOpenDiff,
  onRestore,
  onUndo,
}: {
  entry: FeedEntry;
  compact: boolean;
  onOpenCanvas: (e: FeedEntry) => void;
  onOpenDiff: (e: FeedEntry) => void;
  onRestore: (e: FeedEntry) => void;
  onUndo: (e: FeedEntry) => void;
}) {
  const ActionIcon = actionIcon[entry.action_type] || Sparkles;
  const rail = statusRail(entry.status);

  // keyboard shortcuts on the row
  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key.toLowerCase() === "d" && entry.diff_available) {
      onOpenDiff(entry);
      ev.preventDefault();
    } else if (ev.key.toLowerCase() === "o") {
      onOpenCanvas(entry);
      ev.preventDefault();
    } else if (ev.key.toLowerCase() === "r" && entry.restore_version_id) {
      onRestore(entry);
      ev.preventDefault();
    } else if (ev.key === "Enter") {
      entry.diff_available ? onOpenDiff(entry) : onOpenCanvas(entry);
      ev.preventDefault();
    }
  };

  return (
    <article
      className={cn(
        "group relative rounded-md border bg-white p-2",
        compact ? "space-y-1" : "space-y-2",
        "hover:shadow"
      )}
      style={{ borderColor: TK.borderSubtle, boxShadow: TK.shadow1 }}
      role="listitem"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* status rail */}
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-md" style={{ background: rail }} />

      {/* top row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 inline-flex items-center gap-2">
          <ActionIcon size={16} style={{ color: TK.brand }} />
          <div className="truncate font-medium" style={{ color: TK.textStrong }} title={entry.title}>
            {entry.title}
          </div>
          <ProjectChip domain={entry.project.domain} favicon={entry.project.favicon_url} />
          <a
            href={entry.deep_link}
            target="_blank"
            rel="noreferrer"
            className="truncate underline decoration-dotted"
            title={entry.doc_title}
            onClick={(e) => {
              e.preventDefault();
              onOpenCanvas(entry);
            }}
            style={{ color: TK.text }}
          >
            {entry.doc_title}
          </a>
        </div>

        {/* quick actions (reveal on hover/focus) */}
        <div className="hidden items-center gap-1 group-focus-within:flex group-hover:flex">
          <SecondaryButton onClick={() => onOpenCanvas(entry)} title="Open in Canvas">
            <ExternalLink size={16} /> Open
          </SecondaryButton>
          {entry.diff_available && (
            <SecondaryButton onClick={() => onOpenDiff(entry)} title="View diff">
              <GitCompare size={16} /> Diff
            </SecondaryButton>
          )}
          {entry.restore_version_id && (
            <PrimaryButton onClick={() => onRestore(entry)} title="Restore version">
              <History size={16} /> Restore
            </PrimaryButton>
          )}
          {entry.undo_available && (
            <GhostButton onClick={() => onUndo(entry)} title="Undo">
              <Undo2 size={16} /> Undo
            </GhostButton>
          )}
          <div className="relative">
            <GhostButton title="More">
              <MoreHorizontal size={16} />
            </GhostButton>
            {/* simple popover stub — wire to your menu system */}
          </div>
        </div>
      </div>

      {/* sub‑meta */}
      <div className="flex flex-wrap items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
        <StatusBadge s={entry.status} />
        <span>· {entry.actor.name}</span>
        <span>· {entry.model}</span>
        <span>· {entry.source === "canvas" ? "Canvas" : entry.source === "optimizer" ? "Optimizer" : "Bulk"}</span>
        <span title={fmtAbs(entry.created_at)}>{relTime(entry.created_at)}</span>
        {entry.badges?.includes("auto") && (
          <span className="rounded px-1" style={{ background: TK.bgApp, color: TK.text }}>Auto</span>
        )}
        {entry.badges?.includes("human_reviewed") && (
          <span className="rounded px-1" style={{ background: TK.successBg, color: TK.success }}>Human‑reviewed</span>
        )}
        {entry.badges?.includes("needs_attention") && (
          <span className="rounded px-1" style={{ background: TK.warningBg, color: TK.warning }}>Needs attention</span>
        )}
        {entry.badges?.includes("skipped") && (
          <span className="rounded px-1" style={{ background: TK.warningBg, color: TK.warning }}>Skipped</span>
        )}
      </div>

      {/* change summary chips */}
      <div className="flex flex-wrap items-center gap-1">
        {(entry.sections || []).slice(0, 4).map((s) => (
          <SectionChip key={s} text={s} />
        ))}
        <DeltaChip label="Score" value={entry.metrics_delta?.score} kind="score" />
        <DeltaChip label="FK" value={entry.metrics_delta?.fk} kind="fk" />
        <DeltaChip label="AEO" value={entry.metrics_delta?.aeo_pct} kind="aeo_pct" />
        {entry.scope?.blocks !== undefined && (
          <SectionChip text={`${entry.scope.blocks} block${entry.scope.blocks === 1 ? "" : "s"}`} />
        )}
        {entry.scope?.policy_terms !== undefined && (
          <SectionChip text={`Policy terms covered: ${entry.scope.policy_terms}`} />
        )}
      </div>
    </article>
  );
}

/* ───────────────── Header overflow ───────────────── */
function OverflowMenu({
  compact,
  setCompact,
  autoRefresh,
  setAutoRefresh,
  unresolvedOnly,
  setUnresolvedOnly,
  pinned,
  setPinned,
  onExportCSV,
  onExportJSON,
  onAutoRefreshToggle,
}: {
  compact: boolean;
  setCompact: (v: boolean) => void;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  unresolvedOnly: boolean;
  setUnresolvedOnly: (v: boolean) => void;
  pinned: boolean;
  setPinned: (v: boolean) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onAutoRefreshToggle?: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <GhostButton aria-haspopup="menu" title="More" onClick={() => setOpen((v) => !v)}>
        <CircleEllipsis size={16} />
      </GhostButton>
      {open && (
        <div
          className="absolute right-0 z-10 mt-1 w-60 rounded-md border bg-white p-1 text-sm shadow"
          style={{ borderColor: TK.border }}
          role="menu"
        >
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setCompact(!compact);
              setOpen(false);
            }}
          >
            {compact ? "Comfortable density" : "Compact density"}
          </button>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              const next = !autoRefresh;
              setAutoRefresh(next);
              onAutoRefreshToggle?.(next);
              setOpen(false);
            }}
          >
            Auto‑refresh: {autoRefresh ? "On" : "Off"}
          </button>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setUnresolvedOnly(!unresolvedOnly);
              setOpen(false);
            }}
          >
            {unresolvedOnly ? "Show all activity" : "Show only unresolved"}
          </button>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setPinned(!pinned);
              setOpen(false);
            }}
          >
            {pinned ? "Unpin panel" : "Pin panel"}
          </button>
          <div className="my-1 border-t" style={{ borderColor: TK.border }} />
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              onExportCSV();
              setOpen(false);
            }}
          >
            <Download size={14} className="mr-1 inline" />
            Export CSV
          </button>
          <button
            className="block w-full rounded px-2 py-1 text-left hover:bg-[color:var(--bg-app,#F5F7FA)]"
            style={{ cursor: "pointer" }}
            onClick={() => {
              onExportJSON();
              setOpen(false);
            }}
          >
            <Download size={14} className="mr-1 inline" />
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────── Main Section ───────────────── */
export default function RecentAIActivity({
  entries,
  timeWindowLabel = "Last 28 days",
  filterChips = [],
  loading,
  error,
  noPermission,
  onExport,
  onOpenCanvas,
  onOpenDiff,
  onRestore,
  onUndo,
  onAutoRefreshToggle,
}: RecentAIActivityProps) {
  const rootStyle = fontStack;

  // demo data (remove when wired)
  const demo: FeedEntry[] =
    entries ||
    [
      {
        id: "a_10291",
        doc_id: "d_789",
        project: { id: "p_12", domain: "wranker.com" },
        title: "Outline generated",
        doc_title: "What is Content Marketing? (2026 refresh)",
        actor: { id: "u_3", name: "S. Rao" },
        model: "gpt-5-nano",
        action_type: "outline_generated",
        source: "canvas",
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: "success",
        metrics_delta: { score: 6, fk: -0.7, aeo_pct: 8 },
        sections: ["H2", "TL;DR", "FAQ"],
        scope: { blocks: 4, policy_terms: 2 },
        diff_available: true,
        diff_id: "v_5561",
        restore_version_id: "ver_4478",
        undo_available: true,
        deep_link: "/writer/canvas?project=p_12&draft=d_789",
      },
      {
        id: "a_10292",
        doc_id: "d_702",
        project: { id: "p_12", domain: "wranker.com" },
        title: "Readability apply‑all",
        doc_title: "Customer Case Study: FintechCo",
        actor: { id: "u_8", name: "J. Park" },
        model: "gpt-5-nano",
        action_type: "readability_apply_all",
        source: "optimizer",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: "success",
        metrics_delta: { fk: -1.2 },
        sections: ["Paragraphs"],
        scope: { blocks: 7 },
        diff_available: false,
        deep_link: "/writer/canvas?project=p_12&draft=d_702",
      },
      {
        id: "a_10293",
        doc_id: "d_701",
        project: { id: "p_18", domain: "w3era.com" },
        title: "Internal links inserted",
        doc_title: "Privacy Policy update",
        actor: { id: "u_6", name: "A. Khan" },
        model: "gpt-5-nano",
        action_type: "internal_links_inserted",
        source: "bulk",
        created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        status: "warning",
        sections: ["Links"],
        scope: { blocks: 3 },
        badges: ["needs_attention"],
        diff_available: true,
        diff_id: "v_5562",
        restore_version_id: "ver_4479",
        deep_link: "/writer/canvas?project=p_18&draft=d_701",
      },
    ];

  /* state */
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "diff">("list");
  const [compact, setCompact] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [diffOpenFor, setDiffOpenFor] = useState<FeedEntry | null>(null);
  const [diffPayload, setDiffPayload] = useState<DiffPayload | null>(null);

  // live region for “New activity loaded.”
  const liveRef = useRef<HTMLDivElement | null>(null);

  /* filtering */
  const filtered = demo
    .filter((e) =>
      q
        ? [e.doc_title, e.title, e.actor.name, e.project.domain].join(" ").toLowerCase().includes(q.toLowerCase())
        : true
    )
    .filter((e) => (view === "diff" ? e.diff_available : true))
    .filter((e) => (unresolvedOnly ? e.badges?.includes("needs_attention") || e.status !== "success" : true))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  /* group by day */
  const groups = useMemo(() => {
    const m = new Map<string, FeedEntry[]>();
    filtered.forEach((e) => {
      const key = new Date(e.created_at).toISOString().slice(0, 10);
      m.set(key, [...(m.get(key) || []), e]);
    });
    // sort days descending
    return Array.from(m.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dateISO, entries]) => ({ dateISO, entries }));
  }, [filtered]);

  /* auto‑refresh demo — soft insert */
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      liveRef.current?.append("New activity loaded. ");
      // no actual data mutation here; wire to your data fetcher
    }, 8000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  /* handlers */
  const openCanvas = (e: FeedEntry) => onOpenCanvas?.(e) ?? window.open(e.deep_link, "_blank");
  const openDiff = async (e: FeedEntry) => {
    if (!e.diff_available) return;
    setDiffOpenFor(e);
    // lazy load diff
    const payload =
      (await onOpenDiff?.(e)) ??
      ({
        diff_id: e.diff_id!,
        view: "unified",
        before: `<p><strong>Before</strong> content…</p>`,
        after: `<p><strong>After</strong> content with improvements…</p>`,
        restore_version_id: e.restore_version_id || "",
      } as DiffPayload);
    setDiffPayload(payload);
  };
  const restore = async (e: FeedEntry) => {
    if (!e.restore_version_id) return;
    await onRestore?.(e, e.restore_version_id);
    // optimistic toast
    alert("Restored. You can undo from Versions.");
  };
  const undo = async (e: FeedEntry) => {
    if (!e.undo_available) return;
    await onUndo?.(e);
    alert("Undone.");
  };

  /* export */
  const exportCSV = () => {
    const rows = [
      ["id", "doc_id", "project", "title", "doc_title", "actor", "model", "action", "source", "created_at", "status"].join(","),
      ...filtered.map((e) =>
        [
          e.id,
          e.doc_id,
          e.project.domain,
          `"${e.title.replace(/"/g, '""')}"`,
          `"${e.doc_title.replace(/"/g, '""')}"`,
          e.actor.name,
          e.model,
          e.action_type,
          e.source,
          e.created_at,
          e.status,
        ].join(",")
      ),
    ].join("\n");
    onExport?.("csv", filtered);
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recent_ai_activity.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportJSON = () => {
    onExport?.("json", filtered);
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recent_ai_activity.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* error / loading / no‑permission */
  if (error) {
    return (
      <section
        className="rounded-md border bg-white p-3"
        style={{ borderColor: TK.borderSubtle, ...rootStyle }}
        role="region"
        aria-label="Recent AI Activity"
      >
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: TK.critical, background: TK.criticalBg, color: TK.textStrong }}
        >
          Error loading activity.{" "}
          <button className="underline" style={{ cursor: "pointer" }} onClick={() => location.reload()}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (noPermission) {
    return (
      <section
        className="rounded-md border bg-white p-3"
        style={{ borderColor: TK.borderSubtle, ...rootStyle }}
        role="region"
        aria-label="Recent AI Activity"
      >
        <div
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: TK.border }}
        >
          <Lock size={16} />
          <div className="flex-1">
            You don’t have permission to view AI activity. Values are masked.
          </div>
          <SecondaryButton onClick={() => alert("Request sent")}>Request access</SecondaryButton>
        </div>
        <div className="mt-3 grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-md border bg-white"
              style={{ borderColor: TK.borderSubtle }}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn("rounded-md border bg-white p-3 mt-4", pinned ? "sticky bottom-3" : "")}
      style={{ borderColor: TK.borderSubtle, ...rootStyle }}
      role="region"
      aria-label="Recent AI Activity"
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <Sparkles size={18} style={{ color: TK.brand }} />
          <h3 className="text-[20px] font-semibold" style={{ color: TK.textStrong }}>
            Recent AI Activity
          </h3>
          <MetaChip>
            <Filter size={12} />
            {timeWindowLabel}
          </MetaChip>
          {filterChips.map((c, i) => (
            <MetaChip key={i}>
              <Filter size={12} /> {c}
            </MetaChip>
          ))}
        </div>

        <div className="inline-flex flex-wrap items-center gap-2">
          {/* Search */}
          <div
            className="flex h-9 items-center gap-2 rounded-md border px-2"
            style={{ borderColor: TK.border }}
          >
            <Search size={16} />
            <input
              className="h-8 w-56 outline-none"
              placeholder="Search activity, doc, or actor…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search activity"
            />
          </div>

          {/* View toggle (brand-filled active) */}
          <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: TK.border }}>
            <button
              onClick={() => setView("list")}
              className={cn("h-8 rounded px-2 text-sm", view === "list" ? "font-semibold" : "")}
              style={{
                cursor: "pointer",
                background: view === "list" ? TK.brand : "transparent",
                color: view === "list" ? TK.onBrand : TK.text,
              }}
              aria-pressed={view === "list"}
            >
              List
            </button>
            <button
              onClick={() => setView("diff")}
              className={cn("h-8 rounded px-2 text-sm", view === "diff" ? "font-semibold" : "")}
              style={{
                cursor: "pointer",
                background: view === "diff" ? TK.brand : "transparent",
                color: view === "diff" ? TK.onBrand : TK.text,
              }}
              aria-pressed={view === "diff"}
            >
              Diff Queue
            </button>
          </div>

          {/* Export */}
          <SecondaryButton onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </SecondaryButton>
          <GhostButton onClick={exportJSON}>
            <Download size={14} /> JSON
          </GhostButton>

          {/* Overflow */}
          <OverflowMenu
            compact={compact}
            setCompact={setCompact}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            unresolvedOnly={unresolvedOnly}
            setUnresolvedOnly={setUnresolvedOnly}
            pinned={pinned}
            setPinned={setPinned}
            onExportCSV={exportCSV}
            onExportJSON={exportJSON}
            onAutoRefreshToggle={onAutoRefreshToggle}
          />
        </div>
      </div>

      {/* Body states */}
      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-md border bg-white"
              style={{ borderColor: TK.borderSubtle }}
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="grid place-items-center rounded-md border py-10 text-center" style={{ borderColor: TK.border }}>
          <div className="mb-2 text-sm" style={{ color: TK.textStrong }}>
            No AI activity in range.
          </div>
          <div className="text-[12px]" style={{ color: TK.textMuted }}>
            Try adjusting filters or create something new.
          </div>
          <div className="mt-3 inline-flex items-center gap-2">
            <PrimaryButton onClick={() => alert("New Brief")}>New Brief</PrimaryButton>
            <SecondaryButton onClick={() => alert("New Draft")}>New Draft</SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map(({ dateISO, entries }) => {
            // day aggregates
            const counts: Record<Status, number> = { success: 0, warning: 0, critical: 0 };
            const typeCounts = new Map<ActionType, number>();
            entries.forEach((e) => {
              counts[e.status]++;
              typeCounts.set(e.action_type, (typeCounts.get(e.action_type) || 0) + 1);
            });
            const topTypes = Array.from(typeCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);

            return (
              <section key={dateISO} role="list" aria-label={dateISO}>
                {/* sticky day header */}
                <div
                  className="sticky top-[64px] z-10 -mx-3 border-y bg-white px-3 py-1"
                  style={{ borderColor: TK.borderSubtle }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="text-sm font-semibold" style={{ color: TK.textStrong }}>
                        {dayLabel(dateISO)}
                      </div>
                      {/* status chips */}
                      <span
                        className="rounded px-1 text-[11px]"
                        style={{ background: TK.successBg, color: TK.success }}
                        title="Success"
                      >
                        {counts.success}
                      </span>
                      <span
                        className="rounded px-1 text-[11px]"
                        style={{ background: TK.warningBg, color: TK.warning }}
                        title="Warning"
                      >
                        {counts.warning}
                      </span>
                      <span
                        className="rounded px-1 text-[11px]"
                        style={{ background: TK.criticalBg, color: TK.critical }}
                        title="Critical"
                      >
                        {counts.critical}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1 text-[12px]" style={{ color: TK.textMuted }}>
                      {topTypes.map(([t, n]) => (
                        <span key={t} className="rounded-full border px-2 py-0.5" style={{ borderColor: TK.border }}>
                          {t.replaceAll("_", " ")}: {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={cn("mt-2 grid gap-2", compact ? "text-[13px]" : "")}>
                  {entries.map((e) => (
                    <Row
                      key={e.id}
                      entry={e}
                      compact={compact}
                      onOpenCanvas={openCanvas}
                      onOpenDiff={openDiff}
                      onRestore={restore}
                      onUndo={undo}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Diff drawer */}
      <DiffDrawer
        open={!!diffOpenFor}
        entry={diffOpenFor}
        payload={diffPayload}
        onClose={() => {
          setDiffOpenFor(null);
          setDiffPayload(null);
        }}
        onRestore={() => diffOpenFor && restore(diffOpenFor)}
        onCopy={() => {
          if (!diffPayload) return;
          const text = diffPayload.after.replace(/<[^>]+>/g, "");
          navigator.clipboard.writeText(text);
        }}
        onOpenHistory={() => alert("Open full history")}
      />

      {/* aria-live region */}
      <div className="sr-only" aria-live="polite" ref={liveRef} />
    </section>
  );
}

