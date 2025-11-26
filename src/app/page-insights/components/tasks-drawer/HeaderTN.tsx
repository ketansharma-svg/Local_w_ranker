"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Folder,
  Link2,
  Lock,
  LayoutDashboard,
  SlidersHorizontal,
  Download,
  Share2,
  MoreHorizontal,
  CalendarRange,
  FileOutput,
  FileText,
  FileImage,
  Plus,
  Search,
  X,
} from "lucide-react";

/* ───────────────────────── Latest tokens (aligned with recent sections) ───────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-action:#0077FF;
  --wr-text:#111827;
  --wr-muted:#6B7280;
  --wr-card:#FFFFFF;
  --wr-subtle:#F5F7FA;
  --wr-border:#E5E7EB;
  --wr-borderLight:#EFF0F6;
  --wr-radius:10px;
  --wr-shadow:0 6px 18px rgba(17,24,39,.08);
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system,"Segoe UI",Roboto,Arial,"Helvetica Neue",sans-serif}
`}</style>
);

/* ───────────────────────── Types (kept identical to your original API) ───────────────────────── */
type Role = "admin" | "editor" | "viewer";

export function useOutside<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);
  return ref;
}

function useDebouncedValue<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function truncateMid(s = "", max = 44) {
  if (s.length <= max) return s;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return s.slice(0, head) + "…" + s.slice(-tail);
}

/* ───────────────────────── Component ───────────────────────── */
/**
 * Header: Tasks & Notes Overview — Drawer
 * Matches the latest pattern (chips, branded icons, filters button, export)
 */
export function TasksNotesHeader({
  pageUrl,
  canonical,
  projectName,
  view = "tasks",
  from,
  to,
  filtersCount = 0,
  overdueCount = 0,
  totalTasks = 0,
  role = "editor",
  canCreateTask = true,
  canAddNote = true,
  defaultRange = "30d",
  defaultSearch = "",
  onOpenFilters,
  onRangeChange,
  onOpenCustomRange,
  onSearch,
  onExport,
  onOpenTaskboard,
  onApplyTemplate,
  onCreateTask,
  onAddNote,
}: {
  pageUrl: string;
  canonical?: string;
  projectName: string;
  view?: "tasks" | "notes";
  from?: string;
  to?: string;
  filtersCount?: number;
  overdueCount?: number;
  totalTasks?: number;
  role?: Role;
  canCreateTask?: boolean;
  canAddNote?: boolean;
  defaultRange?: "7d" | "30d" | "90d" | "custom";
  defaultSearch?: string;
  onOpenFilters?: () => void;
  onRangeChange?: (r: "7d" | "30d" | "90d" | "custom") => void;
  onOpenCustomRange?: () => void;
  onSearch?: (q: string) => void;
  onExport?: (fmt: "csv" | "pdf" | "png") => void;
  onOpenTaskboard?: () => void;
  onApplyTemplate?: () => void;
  onCreateTask?: () => void;
  onAddNote?: () => void;
}) {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "custom">(defaultRange);
  const [q, setQ] = useState(defaultSearch);
  const dq = useDebouncedValue(q, 320);

  const [openExport, setOpenExport] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [openMore, setOpenMore] = useState(false);

  const exportRef = useOutside<HTMLDivElement>(openExport, () => setOpenExport(false));
  const shareRef = useOutside<HTMLDivElement>(openShare, () => setOpenShare(false));
  const moreRef = useOutside<HTMLDivElement>(openMore, () => setOpenMore(false));

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedDeep, setCopiedDeep] = useState(false);

  useEffect(() => {
    onSearch?.(dq.trim());
  }, [dq, onSearch]);

  const deepLink = useMemo(() => {
    const p = new URLSearchParams();
    p.set("drawer", "page-work");
    p.set("view", view);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return `#${p.toString()}`;
  }, [view, from, to]);

  const pageChipText = canonical || pageUrl;
  const emphasizeCreate =
    (totalTasks === 0 || overdueCount > 0) && canCreateTask && role !== "viewer";

  return (
    <>
      <GlobalTokens />
      <header className="wr-font w-full bg-[var(--wr-card)] sticky top-0 z-40">
        <div className="flex flex-col gap-2 border-b border-[var(--wr-borderLight)] py-3">
          {/* Top row: Title + Project/Page chips + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            {/* Left: Title & chips */}
            <div className="min-w-0 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} color="var(--wr-brand)" />
                <h3 className="text-[15px] font-semibold text-[var(--wr-text)]">
                  Tasks &amp; Notes
                </h3>
              </div>

              {/* Project chip (branded icon) */}
              <button
                type="button"
                className="cursor-default inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] border-[var(--wr-border)]"
                title="Project"
              >
                <Folder size={14} color="var(--wr-brand)" />
                <span className="text-[var(--wr-muted)]">Project</span>
                <span className="font-medium text-[var(--wr-text)]">
                  {truncateMid(projectName, 28)}
                </span>
              </button>

              {/* Page chip (copy URL) */}
              <button
                type="button"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-[var(--wr-subtle)] text-[12px] border-[var(--wr-border)] cursor-pointer"
                title="Copy page URL"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(pageChipText);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 900);
                  } catch {}
                }}
              >
                <Link2 size={14} color="var(--wr-brand)" />
                <span className="text-[var(--wr-text)]">{truncateMid(pageChipText, 44)}</span>
                <span className="ml-1 rounded px-1.5 py-0.5 border text-[11px] border-[var(--wr-border)] bg-white">
                  {copiedUrl ? "Copied" : "Copy"}
                </span>
              </button>

              {/* Source chip (important chip) */}
              <div
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] border-[var(--wr-border)]"
                title="Source"
              >
                <LayoutDashboard size={14} color="var(--wr-brand)" />
                <span className="text-[var(--wr-muted)]">Source</span>
                <span className="font-medium text-[var(--wr-text)]">Taskboard</span>
              </div>

              {/* Lock chip */}
              <div
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] border-[var(--wr-border)]"
                title="Page scope locked"
              >
                <Lock size={14} color="var(--wr-brand)" />
                <span className="text-[var(--wr-text)]">Locked</span>
              </div>
            </div>

            {/* Right: Primary actions (branded icons on action types) */}
            <div className="flex items-center gap-2">
              {/* Filters (modern button) */}
              <button
                type="button"
                onClick={onOpenFilters}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] border-[var(--wr-border)] hover:bg-[var(--wr-subtle)] cursor-pointer"
                title="Filters"
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                <span
                  className={`ml-1 grid place-items-center rounded-full min-w-[18px] h-[18px] text-[11px] ${
                    (filtersCount || 0) > 0
                      ? "bg-[var(--wr-brand)] text-white"
                      : "bg-[var(--wr-subtle)] text-[var(--wr-muted)]"
                  }`}
                >
                  {filtersCount || 0}
                </span>
              </button>

              {/* Export */}
              <div className="relative" ref={exportRef}>
                <button
                  type="button"
                  onClick={() => setOpenExport((s) => !s)}
                  aria-expanded={openExport}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] border-[var(--wr-border)] hover:bg-[var(--wr-subtle)] cursor-pointer"
                  title="Export"
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
                {openExport && (
                  <div className="absolute right-0 mt-2 w-64 rounded-[var(--wr-radius)] border border-[var(--wr-border)] bg-white shadow-lg p-1 z-50">
                    <button
                      className="w-full text-left px-3 py-2 rounded hover:bg-[var(--wr-subtle)] text-[13px] cursor-pointer inline-flex items-center gap-2"
                      onClick={() => {
                        onExport?.("csv");
                        setOpenExport(false);
                      }}
                    >
                      <FileOutput size={14} />
                      CSV (Tasks + Notes)
                    </button>
                    <hr className="my-1 border-[var(--wr-borderLight)]" />
                    <button
                      className="w-full text-left px-3 py-2 rounded hover:bg-[var(--wr-subtle)] text-[13px] cursor-pointer inline-flex items-center gap-2"
                      onClick={() => {
                        onExport?.("pdf");
                        setOpenExport(false);
                      }}
                    >
                      <FileText size={14} />
                      PDF (Header + View)
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 rounded hover:bg-[var(--wr-subtle)] text-[13px] cursor-pointer inline-flex items-center gap-2"
                      onClick={() => {
                        onExport?.("png");
                        setOpenExport(false);
                      }}
                    >
                      <FileImage size={14} />
                      PNG (Current View)
                    </button>
                  </div>
                )}
              </div>

              {/* Share */}
              <div className="relative" ref={shareRef}>
                <button
                  type="button"
                  onClick={() => setOpenShare((s) => !s)}
                  aria-expanded={openShare}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] border-[var(--wr-border)] hover:bg-[var(--wr-subtle)] cursor-pointer"
                  title="Share"
                >
                  <Share2 size={14} />
                  <span>Share</span>
                </button>
                {openShare && (
                  <div className="absolute right-0 mt-2 w-[360px] max-w-[80vw] rounded-[var(--wr-radius)] border border-[var(--wr-border)] bg-white shadow-lg p-2 z-50">
                    <div className="flex items-center gap-2 rounded border border-[var(--wr-border)] bg-[var(--wr-subtle)] px-2 py-1.5">
                      <code className="text-[12px] text-[var(--wr-muted)] truncate">
                        {truncateMid(deepLink, 56)}
                      </code>
                      <button
                        type="button"
                        className="ml-auto h-7 px-2 rounded border border-[var(--wr-border)] bg-white text-[12px] hover:bg-[var(--wr-subtle)] cursor-pointer"
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(deepLink);
                            setCopiedDeep(true);
                            setTimeout(() => setCopiedDeep(false), 900);
                          } catch {}
                        }}
                      >
                        {copiedDeep ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--wr-muted)]">
                      <CalendarRange size={14} />
                      Deep link keeps view &amp; date range.
                    </div>
                  </div>
                )}
              </div>

              {/* More */}
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setOpenMore((s) => !s)}
                  aria-expanded={openMore}
                  className="inline-flex items-center gap-2 h-8 px-2 rounded-full border bg-white text-[12px] border-[var(--wr-border)] hover:bg-[var(--wr-subtle)] cursor-pointer"
                  title="More"
                >
                  <MoreHorizontal size={16} />
                </button>
                {openMore && (
                  <div className="absolute right-0 mt-2 w-64 rounded-[var(--wr-radius)] border border-[var(--wr-border)] bg-white shadow-lg p-1 z-50">
                    <button
                      className="w-full text-left px-3 py-2 rounded hover:bg-[var(--wr-subtle)] text-[13px] cursor-pointer inline-flex items-center gap-2"
                      onClick={() => {
                        setOpenMore(false);
                        onOpenTaskboard?.();
                      }}
                    >
                      <LayoutDashboard size={14} color="var(--wr-brand)" />
                      Open in Taskboard (page filter)
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 rounded hover:bg-[var(--wr-subtle)] text-[13px] cursor-pointer inline-flex items-center gap-2"
                      onClick={() => {
                        setOpenMore(false);
                        onApplyTemplate?.();
                      }}
                    >
                      <FileText size={14} color="var(--wr-brand)" />
                      Apply Template…
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary actions (branded icons) */}
              {canAddNote && role !== "viewer" && (
                <button
                  type="button"
                  onClick={onAddNote}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] border-[var(--wr-border)] hover:bg-[var(--wr-subtle)] cursor-pointer"
                  title="Add Note"
                >
                  <FileText size={14} color="var(--wr-brand)" />
                  <span>Add Note</span>
                </button>
              )}
              {canCreateTask && role !== "viewer" && (
                <button
                  type="button"
                  onClick={onCreateTask}
                  title={emphasizeCreate ? "Recommended: Create a task" : "Create Task"}
                  className={`inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12px] cursor-pointer ${
                    emphasizeCreate
                      ? "bg-[var(--wr-brand)] text-white border border-[var(--wr-brand)]"
                      : "bg-white text-[var(--wr-text)] border border-[var(--wr-border)] hover:bg-[var(--wr-subtle)]"
                  }`}
                >
                  <Plus size={14} />
                  <span>Create Task</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom row: Segmented range + Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            {/* Segmented control (Latest chip style) */}
            <div
              role="group"
              aria-label="Time range"
              className="inline-flex rounded-full border border-[var(--wr-border)] bg-white overflow-hidden"
            >
              {(["7d", "30d", "90d", "custom"] as const).map((key) => {
                const active = range === key;
                const label = key === "custom" ? "Custom" : key.toUpperCase();
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setRange(key);
                      if (key === "custom") onOpenCustomRange?.();
                      onRangeChange?.(key);
                    }}
                    className={`h-8 px-3 text-[12px] cursor-pointer ${
                      active ? "bg-[var(--wr-subtle)] text-[var(--wr-text)]" : "text-[var(--wr-muted)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Search (modern field) */}
            <div className="relative w-full max-w-[380px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--wr-muted)] pointer-events-none"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQ("");
                }}
                placeholder="Search tasks & notes…"
                aria-label="Search tasks & notes"
                className="w-full h-9 rounded-full border border-[var(--wr-border)] bg-white pl-9 pr-8 text-[13px] outline-none focus:ring-2 focus:ring-[rgba(0,140,205,.18)]"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-full hover:bg-[var(--wr-subtle)] cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

/* ───────────────────────── Optional demo (remove when wiring) ───────────────────────── */
export default function DemoHeaderTN() {
  const [filters, setFilters] = useState(2);
  return (
   <>
    <TasksNotesHeader
        pageUrl="https://example.com/blog/technical-seo-checklist"
        canonical="https://example.com/blog/technical-seo-checklist"
        projectName="ABC Website Revamp"
        view="tasks"
        from="2025-09-01"
        to="2025-09-30"
        filtersCount={filters}
        overdueCount={5}
        totalTasks={27}
        role="editor"
        canCreateTask
        canAddNote
        defaultRange="30d"
        onOpenFilters={() => setFilters((n) => n + 1)}
        onRangeChange={(r) => console.log("range", r)}
        onOpenCustomRange={() => alert("Open date range picker")}
        onSearch={(q) => console.log("search:", q)}
        onExport={(fmt) => alert("Export: " + fmt)}
        onOpenTaskboard={() => alert("Open Taskboard (page filtered)")}
        onApplyTemplate={() => alert("Apply Template…")}
        onCreateTask={() => alert("Create Task")}
        onAddNote={() => alert("Add Note")}
      />
   </>
  );
}