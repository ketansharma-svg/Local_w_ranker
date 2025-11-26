"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  Search,
  BarChart3,
  Wrench,
  ListChecks,
  Target,
  ExternalLink,
} from "lucide-react";
import ConnectionDrawerDemo from "./Connection";

/* ──────────────────────────────────────────────────────────────────────────
   Minimal global tokens & Inter font (remove if your app already injects)
   ────────────────────────────────────────────────────────────────────────── */
function GlobalTokens() {
  return (
    <style>{`
:root{
  /* Brand & text */
  --brand:#008CCD; --brand-600:#007BB8; --on-brand:rgba(255,255,255,0.88);
  --text-strong:#111827; --text:#374151; --text-muted:#6B7280;
  /* Surfaces & borders */
  --bg-app:#F5F7FA; --bg-panel:#FFFFFF; --border:#E5E7EB; --border-subtle:#EFF0F6;
  /* Status */
  --success:#34A853; --success-bg:#CBF8D7;
  --warning:#F9BB04; --warning-bg:#FCEBB8;
  --critical:#E94134; --critical-bg:#FBC4BF;
  /* Focus & radius */
  --focus:#4286F5; --radius:6px;
}
* { font-family: Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Helvetica Neue", sans-serif; }
`}</style>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Types (align with Setup Progress)
   ────────────────────────────────────────────────────────────────────────── */
export type SetupTaskKey = "gsc" | "ga4" | "crawl" | "rank" | "kpi";
export type SetupTaskStatus = "ok" | "warning" | "error" | "skipped" | "idle" | "pending";

export type SetupTask = {
  key: SetupTaskKey;
  name: string;             // e.g., "Connect Google Search Console"
  why?: string;             // one‑sentence “why this matters”
  helper?: string;          // optional brief helper
  status: SetupTaskStatus;
  required: boolean;
  lastSuccessAt?: string;   // ISO
  lastError?: { code?: string; message: string };
  instructions?: string[];  // 1–3 short bullets
  actions: {
    primary: { label: string; onClick: () => Promise<void> | void; disabled?: boolean; disabledReason?: string };
    secondary?: { label: string; onClick: () => void };
  };
};

export type SetupTaskDrawerProps = {
  open: boolean;
  task: SetupTask;                     // required
  onClose: () => void;
  onStatusChange?: (next: SetupTaskStatus) => void;
  viewDetailsHref?: string;
  autoCloseOnSuccess?: boolean;        // default true (≤800ms)
};

/* ──────────────────────────────────────────────────────────────────────────
   Small, modular UI primitives (Chips / Buttons)
   ────────────────────────────────────────────────────────────────────────── */
const StatusChip: React.FC<{ status: SetupTaskStatus; ariaLabel?: string }> = ({ status, ariaLabel }) => {
  const base = "inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium";
  const cls =
    status === "ok"
      ? `${base} text-[var(--success)] bg-[var(--success-bg)]`
      : status === "warning"
      ? `${base} text-[var(--warning)] bg-[var(--warning-bg)]`
      : status === "error"
      ? `${base} text-[var(--critical)] bg-[var(--critical-bg)]`
      : status === "skipped"
      ? `${base} text-[var(--text-muted)] bg-[var(--bg-app)]`
      : `${base} text-[var(--text)] bg-[var(--bg-app)]`;

  const text = status === "ok" ? "OK" : status[0].toUpperCase() + status.slice(1);
  return (
    <span className={`${cls}`} aria-label={ariaLabel}>
      {text}
    </span>
  );
};

const BtnSecondary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => (
  <button
    {...props}
    className={`cursor-pointer h-10 px-3 rounded-[var(--radius)] border text-sm text-[var(--text)] hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    style={{ borderColor: "var(--border)" }}
  />
);

const BtnPrimary: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => (
  <button
    {...props}
    className={`cursor-pointer h-10 px-4 rounded-[var(--radius)] text-sm font-medium text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 ${className}`}
  />
);

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */
const iconForTask = (key: SetupTaskKey) => {
  const branded = "h-5 w-5 text-[var(--brand)]"; // brand #008CCD icons (title/action types)
  switch (key) {
    case "gsc":  return <Search className={branded} aria-hidden />;
    case "ga4":  return <BarChart3 className={branded} aria-hidden />;
    case "crawl":return <Wrench className={branded} aria-hidden />;
    case "rank": return <ListChecks className={branded} aria-hidden />;
    case "kpi":  return <Target className={branded} aria-hidden />;
  }
};

const ariaForStatus = (taskName: string, status: SetupTaskStatus) => {
  const v = status === "ok" ? "OK" : status === "warning" ? "Warning" : status === "error" ? "Error" : status;
  return `${taskName} status: ${v}`;
};

const fmtRelative = (iso?: string) => {
  if (!iso) return "never";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return "—"; }
};

/* ──────────────────────────────────────────────────────────────────────────
   Focus trap (+ Esc & outside click), same pattern as Connection Drawer
   ────────────────────────────────────────────────────────────────────────── */
// function useModalA11y(open: boolean, onClose: () => void, containerRef: React.RefObject<HTMLDivElement | null>) {
//   const lastFocusedRef = useRef<HTMLElement | null>(null);

//   useEffect(() => {
//     const onKeyDown = (e: KeyboardEvent) => {
//       if (!open) return;
//       // if (e.key === "Escape") { e.stopPropagation(); onClose(); }
//       if (e.key === "Tab") {
//         const c = containerRef.current;
//         if (!c) return;
//         const focusable = c.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
//         if (!focusable.length) return;
//         const first = focusable[0];
//         const last = focusable[focusable.length - 1];
//         const active = document.activeElement as HTMLElement | null;
//         const isShift = e.shiftKey;
//         if (!isShift && active === last) { e.preventDefault(); first.focus(); }
//         if (isShift && active === first) { e.preventDefault(); last.focus(); }
//       }
//     };




// const onPointerDown = (e: MouseEvent) => {
//   if (!open) return;
//   const c = containerRef.current;
//   if (!c) return;
//   if (!c.contains(e.target as Node)) {
//     e.stopPropagation();
//     onClose();
//   }
// };

//     if (open) {
//       lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
//       document.addEventListener("keydown", onKeyDown, true);
//       document.addEventListener("mousedown", onPointerDown, true);
//       setTimeout(() => {
//         const el = containerRef.current?.querySelector<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
//         el?.focus();
//       }, 0);
//     }
// return () => {
//   document.removeEventListener("keydown", onKeyDown, true);
//   document.removeEventListener("mousedown", onPointerDown, true);
//   lastFocusedRef.current?.focus?.();
// };

//   }, [open, onClose, containerRef]);
// }



/* ──────────────────────────────────────────────────────────────────────────
   Named export: Setup Task Details Drawer (same shell as Connection Drawer)
   ────────────────────────────────────────────────────────────────────────── */
export function SetupTaskDrawer({
  open,
  task,
  onClose,
  onStatusChange,
  viewDetailsHref,
  autoCloseOnSuccess = true,
}: SetupTaskDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [drawerRow, setDrawerRow] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(task.status === "skipped");
  const containerRef = useRef<HTMLDivElement>(null);
  // useModalA11y(open, onClose, containerRef);

  useEffect(() => {
    setLoading(false);
    setInlineError(null);
    setSkipped(task.status === "skipped");
  }, [open, task]);

  const titleId = useMemo(() => `setup-task-title-${task.key}`, [task.key]);
  if (!open) return null;

  const headerStatus: SetupTaskStatus = skipped ? "skipped" : task.status;

  const onPrimary = async () => {
    // if (task.actions.primary.disabled) return;
    // try {
    //   setInlineError(null);
    //   setLoading(true);
    //   await task.actions.primary.onClick();
    //   onStatusChange?.("ok");
    //   if (autoCloseOnSuccess) setTimeout(() => onClose(), 800);
    // }   catch (e: any) {
    //   setInlineError(e?.message || "Something went wrong. Please try again.");
    //   onStatusChange?.("error");
    // } finally {
    //   setLoading(false);
    // }
  };

  const onSkip = () => {
    setSkipped(true);
    onStatusChange?.("skipped");
    task.actions.secondary?.onClick();
  };

  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }

  return (
    <div className="fixed inset-0 z-[80]" aria-labelledby={titleId} role="dialog" aria-modal="true">
      {/* Overlay (same as Connection Drawer) */}
                              {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <ConnectionDrawerDemo   />
                    </Drawer>
                  )}
      <div className="absolute inset-0 bg-black/30" aria-hidden />

      {/* Right-side sheet */}
      <div
        ref={containerRef}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[420px] bg-[var(--bg-panel)] border-l shadow-lg"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header (56px) */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0">{iconForTask(task.key)}</div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-[16px] font-semibold text-[var(--text-strong)] truncate">
                {task.name}
              </h2>
              {task.helper && <div className="text-xs text-[var(--text-muted)] truncate">{task.helper}</div>}
            </div>
            <div className="ml-2">
              <StatusChip status={headerStatus} ariaLabel={ariaForStatus(task.name, headerStatus)} />
            </div>
          </div>

          <button
            className="cursor-pointer h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        {/* Body (scroll area = full height minus header 56px & footer 80px) */}
        <div className="h-[calc(100%-56px-80px)] overflow-auto px-4 py-4 space-y-4">
          {/* Why this matters */}
          {task.why && (
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-[var(--brand)] mt-[2px]" aria-hidden />
              <p className="text-sm text-[var(--text)]">{task.why}</p>
            </div>
          )}

          {/* Status panel */}
          <section className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              {task.status === "ok"      && <CheckCircle2  className="h-4 w-4 text-[var(--success)]"  aria-hidden />}
              {task.status === "warning" && <AlertTriangle className="h-4 w-4 text-[var(--warning)]" aria-hidden />}
              {task.status === "error"   && <AlertTriangle className="h-4 w-4 text-[var(--critical)]" aria-hidden />}
              <div className="text-sm text-[var(--text-strong)]">
                {task.status === "ok" ? "Connected" : task.status === "warning" ? "Needs attention" : task.status === "error" ? "Error" : "Status"}
              </div>
              <div className="ml-auto text-xs text-[var(--text-muted)]">
                {task.status === "warning" && task.lastSuccessAt && <>Last successful sync {fmtRelative(task.lastSuccessAt)}</>}
              </div>
            </div>

            {task.lastError?.message && task.status === "error" && (
              <div
                className="mt-2 rounded-[var(--radius)] border px-3 py-2 text-sm"
                style={{ background: "var(--critical-bg)", color: "var(--critical)", borderColor: "var(--border)" }}
                role="alert"
              >
                {task.lastError.message}
              </div>
            )}
          </section>

          {/* Instructions */}
          {task.instructions && task.instructions.length > 0 && (
            <section className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">How to complete</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {task.instructions.map((s, i) => (
                  <li key={i} className="text-sm text-[var(--text)]">{s}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Advanced / details */}
          {viewDetailsHref && (
            <a
              href={viewDetailsHref}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer inline-flex items-center gap-1 text-sm text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
              title="View details"
            >
              View details
              <ExternalLink className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
            </a>
          )}

          {/* Inline error (primary action failure) */}
          {inlineError && (
            <div
              className="rounded-[var(--radius)] border px-3 py-2 text-sm flex items-start gap-2"
              style={{ background: "var(--critical-bg)", color: "var(--critical)", borderColor: "var(--border)" }}
              role="alert"
            >
              <AlertTriangle className="h-4 w-4 mt-[2px]" aria-hidden />
              <div>{inlineError}</div>
            </div>
          )}
        </div>

        {/* Footer (sticky, 80px) */}
        <div
          className="h-[80px] px-4 py-3 border-t flex items-center gap-2 justify-end bg-[var(--bg-panel)]"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Secondary: Skip for now */}
          {task.actions.secondary && (
            <BtnSecondary onClick={onSkip} title="Skip for now">{task.actions.secondary.label || "Skip for now"}</BtnSecondary>
          )}

          {/* Primary */}
          <BtnPrimary
            onClick={openDrawer}
            disabled={!!task.actions.primary.disabled || loading}
            aria-disabled={!!task.actions.primary.disabled || loading}
            title={task.actions.primary.disabled ? (task.actions.primary.disabledReason || "Unavailable") : undefined}
            aria-busy={loading ? "true" : "false"}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {task.actions.primary.label}
          </BtnPrimary>
        </div>

        {/* Live region for SR announcements */}
        <p className="sr-only" aria-live="polite">
          {loading ? "Working…" : ""}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   DEFAULT EXPORT: Demo wrapper with a visible Open button
   ────────────────────────────────────────────────────────────────────────── */
export default function SetupTaskDrawerDemo() {
  const [open, setOpen] = useState(true);

  const mockTask: SetupTask = {
    key: "gsc",
    name: "Connect Google Search Console",
    why: "Required to fetch queries & pages.",
    helper: "Required connector",
    status: "warning",
    required: true,
    lastSuccessAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2h ago
    instructions: [
      "Sign in with a Google account that has access.",
      "Select the correct property.",
      "Confirm scopes & finish.",
    ],
    actions: {
      primary: {
        label: "Connect Google Search Console",
        onClick: async () => {
          // Simulate async flow
          await new Promise((r) => setTimeout(r, 800));
        },
      },
      secondary: { label: "Skip for now", onClick: () => {} },
    },
  };

  return (
<>
      <SetupTaskDrawer
        open={open}
        task={mockTask}
        onClose={() => setOpen(false)}
        onStatusChange={(s) => console.log("task status changed to:", s)}
        viewDetailsHref="https://app.example.com/projects/123/sources#gsc"
        autoCloseOnSuccess={true}
      />
</>
  );
}
