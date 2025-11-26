import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * DeleteCompetitorModal.jsx
 * Tailwind-ready, self-contained modal component.
 *
 * PROPS
 * - isOpen: boolean                         // controls visibility
 * - domain: string                          // canonical domain to delete (e.g., "comp1.com")
 * - userRole: "owner" | "admin" | "editor" | "viewer"
 * - seats: { used?: number, limit?: number, resetsOn?: string | Date }
 * - onClose: () => void                     // called when modal should close
 * - onConfirm: (domain: string) => Promise<void> | void // called on delete confirm
 * - source?: string                         // telemetry (optional): "insights" | "profiles" | "tracker"
 *
 * Notes:
 * - Safe defaults prevent runtime errors (e.g., missing seats.resetsOn).
 * - No external libs; focus trap + keyboard handlers included.
 * - Tooltip is simple `title` attributes; swap for your tooltip lib if needed.
 */

export function DeleteCompetitorModal({
  isOpen = false,
  domain = "",
  userRole = "viewer",
  seats = { used: 0, limit: 0, resetsOn: undefined },
  onClose = () => {},
  onConfirm = async () => {},
  source = "insights",
}) {
  const canDelete = userRole === "owner" || userRole === "admin";
  const used = Number.isFinite(seats?.used) ? seats.used : 0;
  const limit = Number.isFinite(seats?.limit) ? seats.limit : 0;

  const resetsOnDate =
    seats?.resetsOn ? new Date(seats.resetsOn) : null;

  const resetsOnLabel = resetsOnDate && !isNaN(resetsOnDate.valueOf())
    ? resetsOnDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [touched, setTouched] = useState(false);

  const isMatch =
    (confirmText || "").trim().toLowerCase() === (domain || "").trim().toLowerCase();
  const removeEnabled = isMatch && canDelete && !submitting;

  // Refs for focus trap
 const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef(null);
 const lastFocusedBeforeOpenRef = useRef<HTMLElement | null>(null);


  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Manage focus on open/close
useEffect(() => {
  if (isOpen) {
    lastFocusedBeforeOpenRef.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => {
      // firstFocusableRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  } else {
    lastFocusedBeforeOpenRef.current?.focus();
    setConfirmText("");
    setNetworkError("");
    setTouched(false);
    setSubmitting(false);
  }
}, [isOpen]);


  const onKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;
      // ESC to close (unless submitting)
      if (e.key === "Escape" && !submitting) {
        e.stopPropagation();
        onClose();
      }
      // Enter to confirm
      if (e.key === "Enter" && removeEnabled) {
        e.preventDefault();
        handleConfirm();
      }

      // Focus trap on Tab
      if (e.key === "Tab") {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // reverse tab
          if (document.activeElement === first) {
            e.preventDefault();
            // last.focus();
          }
        } else {
          // forward tab
          if (document.activeElement === last) {
            e.preventDefault();
            // first.focus();
          }
        }
      }
    },
    [isOpen, removeEnabled, submitting, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onKeyDown]);

function getFocusableElements(container: HTMLElement | null) {
    if (!container) return [];
    // Buttons, links, inputs, textareas etc (visible & not disabled)
    const selectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const nodes = Array.from(container.querySelectorAll(selectors));
    return nodes.filter(
      (el) =>
        !!( el.getClientRects().length) &&
        window.getComputedStyle(el).visibility !== "hidden"
    );
  }

  const handleBackdropClick = (e) => {
    if (!modalRef.current) return;
    if (!modalRef.current.contains(e.target) && !submitting) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (!removeEnabled) return;
    setNetworkError("");
    setSubmitting(true);
    try {
      // Await caller; they can close the modal in their handler or rely on us on success.
      // await onConfirm((domain || "").trim().toLowerCase());
      // Auto-close on success
      onClose();
    } catch (err:any) {
      setNetworkError(
       (err)
      );
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      aria-labelledby="delete-competitor-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onMouseDown={handleBackdropClick}
      />

      {/* Modal container (mobile: full screen sheet, desktop: centered card) */}
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          ref={modalRef}
          className="w-full h-full sm:h-auto sm:max-w-md bg-white rounded-none sm:rounded-2xl shadow-xl flex flex-col max-h-[100vh] sm:max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <header className="px-5 sm:px-6 py-4 border-b border-gray-200">
            <h2
              id="delete-competitor-title"
              className="text-[17px] sm:text-[18px] font-semibold text-[#282829] flex items-center gap-2"
            >
              <span role="img" aria-label="trash">🗑️</span>
              Remove Competitor – Are you sure?
            </h2>
          </header>

          {/* Permission banner (if gated) */}
          {!canDelete && (
            <div className="mx-5 sm:mx-6 mt-4 rounded-md bg-[#FFF9E5] border border-[#FEC84B] px-4 py-3 text-sm text-[#6B7280]">
              You don’t have permission to delete competitors.{" "}
              <span className="font-medium">Only Admins or Owners can delete.</span>
            </div>
          )}

          {/* Warning block + body (scrollable) */}
          <main className="px-5 sm:px-6 py-4 overflow-y-auto">
            {/* Red warning surface */}
            <div className="rounded-lg border border-[#FECACA] bg-[#FEE2E2] px-4 py-3 text-[14px] text-[#111827]">
              <div className="flex items-start gap-2">
                <div className="text-[#F04438]" aria-hidden>⚠️</div>
                <p className="font-medium">
                  Removing <span className="font-semibold">{domain || "this domain"}</span> will permanently delete all tracked data for this project.
                </p>
              </div>

              {/* Effect list */}
              <ul className="mt-3 list-disc list-inside space-y-1 text-[14px] text-[#374151]">
                <li>Won’t free a seat this cycle — seats refill on reset.</li>
                <li>History won’t be restored (comparisons, charts, deltas).</li>
                <li>Re‑adding is blocked until the next reset.</li>
              </ul>

              {/* Reset & Seat Status */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-[#374151]">
                <div className="flex items-center gap-2">
                  <span role="img" aria-label="calendar">📅</span>
                  <span>
                    Seats reset on: <span className="font-medium">{resetsOnLabel}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span role="img" aria-label="tickets">🎟️</span>
                  <span>
                    Slot usage this cycle:{" "}
                    <span className="font-medium">
                      {used} / {limit} used
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Friction confirm input */}
            <div className="mt-5">
              <label
                htmlFor="confirm-domain"
                className="block text-sm font-medium text-[#282829]"
              >
                Type the domain to confirm
              </label>
              <input
                id="confirm-domain"
                ref={firstFocusableRef}
                type="text"
                placeholder={domain || "example.com"}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={!canDelete || submitting}
                aria-invalid={touched && !isMatch}
                aria-describedby="confirm-help confirm-error"
                className={[
                  "mt-1 w-full rounded-lg border px-3 py-2 text-[15px] outline-none",
                  !canDelete
                    ? "bg-[#F5F7FA] text-gray-500 cursor-not-allowed"
                    : "bg-white",
                  touched && !isMatch
                    ? "border-[#E53935] focus:ring-2 focus:ring-[#1090D0]/40"
                    : "border-[#E5E7EB] focus:border-[#1090D0] focus:ring-2 focus:ring-[#1090D0]/40",
                ].join(" ")}
              />
              <div id="confirm-help" className="mt-1 text-[12px] text-[#6B7280]">
                Enter <span className="font-medium">{domain || "the domain"}</span> exactly to enable deletion.
              </div>
              {touched && !isMatch && (
                <div
                  id="confirm-error"
                  role="alert"
                  className="mt-1 text-[12px] text-[#E53935]"
                >
                  Type <span className="font-semibold">{domain || "the domain"}</span> to confirm.
                </div>
              )}
            </div>

            {/* Network error (non-blocking) */}
            {networkError && (
              <div
                role="alert"
                className="mt-4 rounded-md border border-[#FECACA] bg-[#FEE2E2] px-3 py-2 text-[13px] text-[#B42318]"
              >
                {networkError}
              </div>
            )}
          </main>

          {/* Sticky footer */}
          <footer className="mt-auto border-t border-gray-200 bg-white px-5 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg border border-[#EFF0F6] bg-[#F5F7FA] px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-[#eef1f6] focus:outline-none focus:ring-2 focus:ring-[#1090D0]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!removeEnabled}
                title={
                  canDelete
                    ? isMatch
                      ? ""
                      : `Type "${(domain || "").toLowerCase()}" to enable`
                    : "Only Admins or Owners can delete competitors."
                }
                className={[
                  "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white focus:outline-none focus:ring-2",
                  removeEnabled
                    ? "bg-[#F04438] hover:brightness-95 focus:ring-[#1090D0]"
                    : "bg-[#F04438]/60 cursor-not-allowed focus:ring-transparent",
                ].join(" ")}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Removing…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden>❌</span> Remove Competitor
                  </span>
                )}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

/** Simple spinner (no external libs) */
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Demo harness below (optional). Remove this block in production.    */
/* ------------------------------------------------------------------ */

export default function DemoDeleteCompetitor() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("admin"); // try "viewer" or "editor" to see gating

  // Fake seats data; adjust to test
  const demoSeats = {
    used: 7,
    limit: 10,
    resetsOn: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), // next month 1st
  };

  // Simulated async delete
  const handleConfirm = async (domain) => {
    // simulate latency
    await new Promise((r) => setTimeout(r, 800));
    // You can throw to simulate network error:
    // throw new Error("Server unreachable");
    // Show a demo toast (replace with your toast lib)
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-alert
      alert(`Removed ${domain}. Seat remains used until ${new Date(demoSeats.resetsOn).toLocaleDateString()}.`);
    }
  };

  return (
    // <div className="min-h-[60vh] grid place-items-center p-6 bg-[#F5F7FA]">
    //   <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow">
    //     <h1 className="text-xl font-semibold mb-2">Delete Competitor Modal – Demo</h1>
    //     <p className="text-sm text-[#6B7280] mb-4">
    //       Click the button to open the modal. Try changing roles and typing the domain to enable the destructive action.
    //     </p>

    //     <div className="flex items-center gap-3 mb-6">
    //       <button
    //         onClick={() => setOpen(true)}
    //         className="inline-flex items-center gap-2 rounded-lg bg-[#1090D0] px-4 py-2.5 text-white text-[14px] font-medium hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#1090D0]/40"
    //       >
    //         Open Delete Modal
    //       </button>

    //       <label className="ml-auto text-sm text-[#374151]">
    //         Role:&nbsp;
    //         <select
    //           value={role}
    //           onChange={(e) => setRole(e.target.value)}
    //           className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-[#1090D0] focus:ring-2 focus:ring-[#1090D0]/30"
    //         >
    //           <option value="owner">owner</option>
    //           <option value="admin">admin</option>
    //           <option value="editor">editor</option>
    //           <option value="viewer">viewer</option>
    //         </select>
    //       </label>
    //     </div>

    //     <ul className="text-sm text-[#374151] space-y-1">
    //       <li>• <strong>Domain:</strong> <code>comp1.com</code></li>
    //       <li>• <strong>Seats:</strong> {demoSeats.used} / {demoSeats.limit} used</li>
    //       <li>• <strong>Reset:</strong> {new Date(demoSeats.resetsOn).toLocaleDateString()}</li>
    //       <li>• <strong>Role:</strong> {role} (only owner/admin can confirm)</li>
    //     </ul>
    //   </div>

    //   <DeleteCompetitorModal
    //     isOpen={open}
    //     domain="comp1.com"
    //     userRole={role}
    //     seats={demoSeats}
    //     source="insights"
    //     onClose={() => setOpen(false)}
    //     onConfirm={handleConfirm}
    //   />
    // </div>
    <>
              <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#cf1a1aef] px-4 py-2.5 text-white text-[14px] font-medium hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#1090D0]/40 cursor-pointer"
          >
            Delete
          </button>
      <DeleteCompetitorModal
        isOpen={open}
        domain="comp1.com"
        userRole={role}
        // seats={demoSeats}
        source="insights"
        onClose={() => setOpen(false)}
        // onConfirm={handleConfirm}
      />
    
    </>
  );
}
