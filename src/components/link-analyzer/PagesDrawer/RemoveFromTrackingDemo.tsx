"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Unlink,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  Info,
  Copy,
  Eye,
  Wrench,
  ShieldAlert,
} from "lucide-react";

/**
 * Wranker — Link Analyzer → Pages Tab → "Remove from Tracking" Modal
 * Phase 2 Ready • TailwindCSS • Accessible • Responsive • Undo • Soft/Hard delete • Bulk
 *
 * Notes:
 * - Fonts: uses Inter → system sans (via Tailwind's `font-sans`).
 * - Buttons: Modular Button primitives (Primary / Secondary / Danger / IconOnly) to match recent sections.
 * - No emoji: toasts + titles rely on branded icons.
 * - A11y: labelled title/desc, ESC to close, focus trap, keyboard focus rings.
 */

// ----------------------------
// Design Tokens (light mode)
// ----------------------------
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#0077FF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  overlay: "rgba(17, 24, 39, 0.6)",
  danger: "#EF4444",
  dangerPastel: "rgba(239, 68, 68, 0.12)",
  success: "#10B981",
  successPastel: "rgba(16, 185, 129, 0.14)",
  info: "#3B82F6",
  infoPastel: "rgba(59, 130, 246, 0.14)",
  radius: 12,
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
};

// ----------------------------
// Utilities
// ----------------------------
function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function useEscape(onEsc: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEsc();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onEsc]);
}

function useFocusTrap(enabled: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    const root = containerRef.current;
    const selector = [
      'a[href]',
      'area[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(selector))
        .filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (current === first || !root.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (current === last || !root.contains(current)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    root.addEventListener('keydown', handleKeyDown);
    return () => root.removeEventListener('keydown', handleKeyDown);
  }, [enabled, containerRef]);
}

// ----------------------------
// Modular Buttons (shared)
// ----------------------------
const BTN_RADIUS = 8;
const BTN_BORDER = 2;

function IconOnlyButton(props: React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>) {
  const { title, onClick, disabled, children } = props;
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      className={classNames("grid place-items-center h-9 w-9", disabled && "opacity-50 cursor-not-allowed")}
      style={{
        borderRadius: BTN_RADIUS,
        border: `${BTN_BORDER}px solid ${TOKENS.borderLight}`,
        background: hover && !disabled ? TOKENS.chipHover : TOKENS.chipBg,
        color: TOKENS.text,
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ title, onClick, disabled, children }: React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={classNames("inline-flex items-center gap-2 h-9 px-3 text-white", disabled && "opacity-50 cursor-not-allowed")}
      style={{ background: hover && !disabled ? TOKENS.brandHover : TOKENS.brand, borderRadius: BTN_RADIUS }}
    >
      {children}
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

function SecondaryButton({ title, onClick, disabled, children }: React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={classNames("inline-flex items-center gap-2 h-9 px-3 text-sm", disabled && "opacity-50 cursor-not-allowed")}
      style={{
        borderRadius: BTN_RADIUS,
        border: `${BTN_BORDER}px solid ${TOKENS.borderLight}`,
        background: hover && !disabled ? TOKENS.chipHover : "#FFFFFF",
        color: TOKENS.text,
      }}
    >
      {children}
      <span className="font-medium">{title}</span>
    </button>
  );
}

function DangerButton({ title, onClick, disabled, children }: React.PropsWithChildren<{ title: string; onClick?: () => void; disabled?: boolean }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={classNames("inline-flex items-center gap-2 h-9 px-3 text-sm text-white", disabled && "opacity-50 cursor-not-allowed")}
      style={{
        borderRadius: BTN_RADIUS,
        background: hover && !disabled ? "#DC2626" : TOKENS.danger,
      }}
    >
      {children}
      <span className="font-medium">{title}</span>
    </button>
  );
}

// ----------------------------
// Toast / Snackbar (icon-only)
// ----------------------------
function Toast({
  open,
  kind = "success",
  message,
  onClose,
  actionLabel,
  onAction,
}: {
  open: boolean;
  kind?: "success" | "error" | "info";
  message: React.ReactNode;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!open) return null;
  const bg = kind === 'success' ? TOKENS.success : kind === 'error' ? TOKENS.danger : TOKENS.info;
  const Icon = kind === 'success' ? CheckCircle2 : kind === 'error' ? ShieldAlert : Info;
  return (
    <div role="status" aria-live="polite" className="fixed z-[70] bottom-6 left-1/2 -translate-x-1/2 font-sans" data-testid="toast">
      <div className="rounded-lg shadow-lg text-white px-4 py-3 min-w-[320px] max-w-[560px] flex items-start gap-3" style={{ background: bg }}>
        <Icon className="shrink-0" />
        <div className="text-sm leading-5 flex-1">{message}</div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="underline underline-offset-2 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white rounded"
            data-testid="toast-action"
          >
            {actionLabel}
          </button>
        )}
        <button onClick={onClose} aria-label="Dismiss" className="ml-2 opacity-90 hover:opacity-100 focus:outline-none">
          <X />
        </button>
      </div>
    </div>
  );
}

// ----------------------------
// Modal / Sheet
// ----------------------------
function Modal({
  open,
  titleId,
  descId,
  children,
  onCloseRequest,
  mobileFull = true,
}: {
  open: boolean;
  titleId: string;
  descId: string;
  children: React.ReactNode;
  onCloseRequest: () => void;
  mobileFull?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEscape(() => {
    if (open) onCloseRequest();
  });
useFocusTrap(open, panelRef as React.RefObject<HTMLElement>);


  if (!open) return null;
  return (
    <div
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 font-sans"
      data-testid="remove-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: TOKENS.overlay }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onCloseRequest();
        }}
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          ref={panelRef}
          className={classNames(
            "bg-white shadow-xl w-full max-h-[80vh] overflow-auto focus:outline-none",
            mobileFull ? "sm:rounded-xl rounded-none sm:max-w-[560px] max-w-full" : "rounded-xl max-w-[560px]",
            "border"
          )}
          style={{ borderColor: TOKENS.borderLight, borderRadius: TOKENS.radius }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ----------------------------
// API Simulation (demo)
// ----------------------------
function apiSoftUntrack(projectId: string, pageId: string, remove_history: boolean) {
  return new Promise<{ status: "accepted" | "queued"; pageId: string; untracked?: boolean; jobId?: string; estimatedSeconds?: number }>((resolve, reject) => {
    const delay = remove_history ? 1200 : 900;
    setTimeout(() => {
      if (Math.random() < 0.08) {
        reject(new Error("Network timeout. Please try again."));
        return;
      }
      if (remove_history) {
        resolve({ status: "queued", pageId, jobId: "job-" + Math.floor(Math.random() * 1000), estimatedSeconds: 12 });
      } else {
        resolve({ status: "accepted", pageId, untracked: true });
      }
    }, delay);
  });
}
function apiRetrack(projectId: string, pageId: string) {
  return new Promise<{ status: "restored"; pageId: string }>((resolve) => {
    setTimeout(() => resolve({ status: "restored", pageId }), 700);
  });
}

// ----------------------------
// Remove Modal Content
// ----------------------------
function RemoveFromTrackingContent({
  onClose,
  projectId,
  pages, // one or many (bulk)
  onCancel,
  onSuccess,
  requireTypedConfirmOnHardDelete = true,
  typedConfirmMode = "keyword", // 'keyword' => requires typing "REMOVE"; 'slug' => requires typing the exact path of single page
  hasPermission = true,
}: {
  onClose: () => void;
  projectId: string;
  pages: { pageId: string; path: string }[];
  onCancel: () => void;
  onSuccess: (opts: { removedPages: { pageId: string; path: string }[]; hardDelete: boolean; jobId?: string }) => void;
  requireTypedConfirmOnHardDelete?: boolean;
  typedConfirmMode?: "keyword" | "slug";
  hasPermission?: boolean;
}) {
  const isBulk = pages.length > 1;
  const primaryTitle = isBulk ? `Remove ${pages.length} Pages from Link Analyzer` : `Remove Page from Link Analyzer`;

  const [deleteHistory, setDeleteHistory] = useState(false);
  const [typing, setTyping] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = "remove-title";
  const descId = "remove-desc";

  const needsTyping = deleteHistory && requireTypedConfirmOnHardDelete;
  const requiredText = typedConfirmMode === "keyword" ? "REMOVE" : (pages.length === 1 ? pages[0].path : "");
  const typedOk = !needsTyping || typing.trim() === requiredText;

  const doSubmit = async () => {
    if (!hasPermission) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiSoftUntrack(projectId, pages[0].pageId, deleteHistory);
      if (res.status === "queued") {
        onSuccess({ removedPages: pages, hardDelete: true, jobId: res.jobId });
      } else {
        onSuccess({ removedPages: pages, hardDelete: false });
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      setSubmitting(false);
    }
  };

  const onCloseRequest = () => {
    if (typing || deleteHistory) {
      const ok = window.confirm("Discard your changes?");
      if (!ok) return;
    }
    onCancel();
  };

  return (
    <Modal open titleId={titleId} descId={descId} onCloseRequest={onCloseRequest} mobileFull>
      {/* Top brand/danger bar */}
      <div className="h-1.5" style={{ background: TOKENS.danger }} />

      {/* Header */}
      <div className="flex items-start gap-3 p-4 sm:p-6 border-b" style={{ borderColor: TOKENS.borderLight }}>
        {/* Branded icon chip (no emoji) */}
        <div className="rounded-full p-2 border" style={{ background: TOKENS.dangerPastel, borderColor: TOKENS.borderLight }} aria-hidden>
          <Unlink style={{ color: TOKENS.danger }} />
        </div>
        <div className="flex-1">
          <h2 id={titleId} className="text-[18px] font-semibold text-black">{primaryTitle}</h2>
          <p id={descId} className="text-sm text-gray-700 mt-1">
            This will stop tracking internal link data for {isBulk ? <strong>{pages.length} pages</strong> : "the page"}.
          </p>
        </div>
        <IconOnlyButton title="Close dialog" onClick={onClose}>
          <X />
        </IconOnlyButton>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 space-y-4">
        {!isBulk ? (
          <div className="space-y-3">
            <p className="text-[15px] text-gray-900">This will stop tracking internal link data for the page:</p>
            <div className="flex items-center justify-between bg-gray-50 border px-3 py-2 rounded font-mono text-sm" style={{ borderColor: TOKENS.borderLight }}>
              {/* <span>{pages[0].path}</span> */}
              <button
                className="inline-flex items-center gap-1 text-gray-600 hover:text-black"
                title="Copy page path"
                onClick={() => navigator.clipboard?.writeText(pages[0].path)}
                data-testid="copy-path"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            <p className="text-[14px] text-[#363636] leading-6">
              All interlink scores (PILS), AQS, and optimisation insights will be removed. This page will no longer appear in reports,
              tables, or linking recommendations. You can add it back at any time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[15px] text-gray-900">You are removing the following pages from Link Analyzer tracking:</p>
            <div className="bg-gray-50 border rounded p-3 space-y-1 max-h-40 overflow-auto" style={{ borderColor: TOKENS.borderLight }}>
              {pages.slice(0, 6).map((p) => (
                <div key={p.pageId} className="font-mono text-sm text-gray-800">{p.path}</div>
              ))}
              {pages.length > 6 && (
                <div className="text-sm text-gray-500">+ {pages.length - 6} more…</div>
              )}
            </div>
            <p className="text-[14px] text-[#363636] leading-6">
              All interlink scores (PILS), AQS, and optimisation insights for these pages will be removed. They will no longer
              appear in reports, tables, or recommendations. You can restore tracking later from Settings → Tracked Pages.
            </p>
          </div>
        )}

        {/* Hard delete toggle */}
        <label className="flex items-start gap-3 select-none">
          <input
            type="checkbox"
            className="mt-1.5"
            checked={deleteHistory}
            onChange={(e) => setDeleteHistory(e.target.checked)}
            aria-label="Also delete historical linking data"
            data-testid="toggle-delete-history"
          />
          <span className="text-[14px] text-gray-800">
            Also delete historical linking data for {isBulk ? "these pages" : "this page"}
            <span className="text-gray-500"> — This action is destructive and may be irreversible.</span>
          </span>
        </label>

        {/* Typed confirmation (if required) */}
        {deleteHistory && requireTypedConfirmOnHardDelete && (
          <div className="space-y-1">
            <div className="text-sm text-gray-700">
              {typedConfirmMode === 'keyword' ? (
                <>Type <span className="font-semibold">REMOVE</span> to confirm hard delete.</>
              ) : (
                <>Type the exact page path <span className="font-mono">{requiredText}</span> to confirm.</>
              )}
            </div>
            <input
              value={typing}
              onChange={(e) => setTyping(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: TOKENS.border, outlineColor: TOKENS.valueBlue }}
              placeholder={typedConfirmMode === 'keyword' ? 'REMOVE' : requiredText}
              aria-label="Confirmation input"
              data-testid="confirm-input"
            />
            {!typedOk && (
              <div className="text-xs text-red-600">Confirmation text does not match.</div>
            )}
          </div>
        )}

        {!hasPermission && (
          <div className="flex items-start gap-2 p-3 rounded border" style={{ borderColor: TOKENS.borderLight, background: "#FFFBEA" }}>
            <Info className="mt-0.5 text-yellow-600" />
            <div className="text-sm text-gray-800">You do not have permission. Requires <strong>Analyst</strong> role.</div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded border" style={{ borderColor: TOKENS.borderLight, background: TOKENS.dangerPastel }}>
            <ShieldAlert className="mt-0.5" style={{ color: TOKENS.danger }} />
            <div className="text-sm text-gray-800">Failed to remove page(s): {error}</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-t" style={{ borderColor: TOKENS.borderLight }}>
        <div className="text-xs text-gray-600">You can restore tracking later from <span className="font-medium">Settings → Tracked Pages</span>.</div>
        <div className="flex items-center gap-2">
          <SecondaryButton title="Cancel" onClick={onClose} disabled={submitting}>
            {/* spacer for alignment */}
          </SecondaryButton>
          <DangerButton
            title="Remove from Tracking"
            onClick={doSubmit}
            disabled={submitting || !typedOk || !hasPermission}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </DangerButton>
        </div>
      </div>
    </Modal>
  );
}

// ----------------------------
// Demo Table + Integration
// ----------------------------
type PageRow = { pageId: string; path: string };

export default function RemoveFromTrackingDemo({ onClose }: { onClose: () => void }) {
  const [pages, setPages] = useState<PageRow[]>([
    { pageId: "p-101", path: "/seo-tools" },
    { pageId: "p-102", path: "/seo-guide" },
    { pageId: "p-103", path: "/blog/internal-linking-best-practices" },
    { pageId: "p-104", path: "/pricing" },
  ]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(true);
  const [modalPages, setModalPages] = useState<PageRow[]>([]);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<React.ReactNode>("");
  const [toastKind, setToastKind] = useState<"success" | "info" | "error">("success");
  const [toastAction, setToastAction] = useState<null | (() => void)>(null);

  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Simulate roles
  const currentUserRole = "Admin" as "Owner" | "Admin" | "Analyst" | "Viewer";
  const hasPermission = currentUserRole === "Owner" || currentUserRole === "Admin" || currentUserRole === "Analyst";

  const projectId = "proj-001";

  const openSingle = (row: PageRow) => {
    setModalPages([row]);
    setModalOpen(true);
  };

  const openBulk = () => {
    const rows = pages.filter((p) => selected[p.pageId]);
    if (rows.length === 0) return;
    setModalPages(rows);
    setModalOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const onModalSuccess = ({ removedPages, hardDelete, jobId }: { removedPages: PageRow[]; hardDelete: boolean; jobId?: string }) => {
    // Optimistic remove from table
    setPages((list) => list.filter((row) => !removedPages.some((rp) => rp.pageId === row.pageId)));
    setModalOpen(false);

    const labelPaths = removedPages.slice(0, 2).map((p) => p.path).join(", ");
    const more = removedPages.length > 2 ? ` (+${removedPages.length - 2} more)` : "";

    if (!hardDelete) {
      const lastRemoved = removedPages.map((p) => p);
      const doUndo = async () => {
        await Promise.all(lastRemoved.map((p) => apiRetrack(projectId, p.pageId)));
        setPages((list) => [...lastRemoved, ...list]);
        setToastOpen(false);
      };

      setToastMsg(
        <span>
          <span className="font-medium">Removed from tracking:</span>{" "}
          <span className="font-mono">{labelPaths}</span>{more}. <span className="underline cursor-pointer">View Tracked Pages</span>
        </span>
      );
      setToastAction(() => doUndo);
      setToastKind("success");
      setToastOpen(true);
      if (undoTimer) clearTimeout(undoTimer);
      const timer = setTimeout(() => setToastOpen(false), 6000);
      setUndoTimer(timer);
    } else {
      setToastMsg(
        <span>
          <span className="font-medium">Delete job queued</span> for historical data on{" "}
          <span className="font-mono">{labelPaths}</span>{more}. Job ID: <strong>{jobId}</strong>.
        </span>
      );
      setToastAction(null);
      setToastKind("info");
      setToastOpen(true);
      if (undoTimer) clearTimeout(undoTimer);
      const timer = setTimeout(() => setToastOpen(false), 6000);
      setUndoTimer(timer);
    }
  };

  const anySelected = Object.values(selected).some(Boolean);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("RemoveFromTrackingDemo mounted: pages=", pages.length);
  }, []);

  return (

<>
      {/* Modal */}
   
        <RemoveFromTrackingContent
          projectId={projectId}
          pages={modalPages}
          onClose={onClose}
          onCancel={() => setModalOpen(false)}
          onSuccess={onModalSuccess}
          requireTypedConfirmOnHardDelete={true}
          typedConfirmMode={"keyword"}
          hasPermission={hasPermission}
        />


</>
  );
}
