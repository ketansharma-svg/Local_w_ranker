import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Wranker – Add Competitor Modal (100% self-contained)
 * - React + Tailwind only (no external icon libs)
 * - Includes a demo shell with a button to open the modal
 * - Named export: AddCompetitorModal (use inside your header)
 * - Default export: DemoAddCompetitorModal (for quick testing)
 *
 * Design behaviors covered:
 * - Seats/limit/reset & upgrade gating
 * - Role gating (owner/admin vs editor/viewer)
 * - Domain normalization (trim http/https/www, strip path/query, force lowercase)
 * - Root-domain enforcement (+ gentle canonicalization for common multi-TLDs)
 * - Duplicate + "deleted-locked" checks
 * - Optional "Validate" reachability (favicon ping; non-blocking)
 * - Focus trap + ESC + overlay click
 * - Sticky footer; mobile full-screen
 */

// ---- small helpers ---------------------------------------------------------

const ROLES = { OWNER: "owner", ADMIN: "admin", EDITOR: "editor", VIEWER: "viewer" };

// Common multi-part public suffixes (not exhaustive, but practical for canonicalization)
const MULTI_TLDS = [
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.au", "net.au", "org.au",
  "co.in", "com.br", "com.mx", "com.tr", "com.sg", "com.my", "co.jp"
];

// Very permissive domain regex (ASCII). IDNs would need punycode conversion upstream.
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function toURLLike(input) {
  // Ensure we can feed it to URL()
  if (!input) return "";
  const s = input.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function extractHostname(raw) {
  try {
    const u = new URL(toURLLike(raw));
    return u.hostname || "";
  } catch {
    return "";
  }
}

function stripWww(host) {
  return host.replace(/^www\./i, "");
}

function canonicalRoot(host) {
  const h = stripWww(host.toLowerCase());
  const parts = h.split(".");
  if (parts.length < 2) return h;

  const tld2 = parts.slice(-2).join(".");
  const tld3 = parts.slice(-3).join(".");
  // Handle known multi-level TLDs
  if (MULTI_TLDS.includes(tld2) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  if (MULTI_TLDS.includes(tld3) && parts.length >= 4) {
    return parts.slice(-4).join(".");
  }
  // Default: last two labels
  return parts.slice(-2).join(".");
}

function isLikelyRoot(host) {
  const h = host.toLowerCase();
  if (!DOMAIN_RE.test(h)) return false;
  return canonicalRoot(h) === stripWww(h);
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Simple toast for the demo
function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] rounded-md bg-black/90 px-3 py-2 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}

// ---- reachability "Validate": ping favicon (non-blocking, CORS safe) --------
async function pingHostFavicon(host) {
  return new Promise((resolve) => {
    if (!DOMAIN_RE.test(host)) return resolve({ ok: false, reason: "invalid" });
    const img = new Image();
    const t = setTimeout(() => resolve({ ok: false, reason: "timeout" }), 6000);
    const done = (ok) => () => {
      clearTimeout(t);
      resolve({ ok });
    };
    img.onload = done(true);
    img.onerror = done(true); // host responded (even 404) => reachable enough
    img.src = `https://${host}/favicon.ico?cb=${Date.now()}`;
  });
}

// ---- Modal component --------------------------------------------------------
interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    domain_canonical: string;
    domain_raw?: string;
    nickname?: string;
    notes?: string;
  }) => void | Promise<void>;
  seats?: {
    used: number;
    limit: number;
    resetsOn: string;
  };
  userRole?: typeof ROLES[keyof typeof ROLES];
  existing?: string[]; // ✅ canonical strings
  locked?: Record<string, string>; // ✅ map domain -> lock date
  atPlanLimit?: boolean;
  onUpgrade?: () => void;
  projectId?: string | number;
}

export function AddCompetitorModal({
  isOpen,
  onClose,
  onSubmit, // async or sync callback gets { domain_canonical, domain_raw, nickname, notes }
  seats = { used: 0, limit: 0, resetsOn: "" }, // e.g., { used: 6, limit: 10, resetsOn: "2025-08-01" }
  userRole = ROLES.OWNER, // "owner" | "admin" | "editor" | "viewer"
  existing = [], // canonical strings (e.g., ["comp1.com","comp2.com"])
  locked = {}, // { "example.com": "2025-08-01" }
  atPlanLimit = false, // if limit == 0 plan or hard-locked
  onUpgrade, // optional handler for upgrade click
  projectId,
}: AddCompetitorModalProps) {
  const allowSubmit = userRole === ROLES.OWNER || userRole === ROLES.ADMIN;
  const overLimit = seats.limit > 0 ? seats.used >= seats.limit : atPlanLimit;
  const showUpgrade = atPlanLimit || overLimit;

  const [domainInput, setDomainInput] = useState("");
  const [domainCanonical, setDomainCanonical] = useState("");
  const [nickname, setNickname] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");
  const [validating, setValidating] = useState(false);
  const [reachable, setReachable] = useState(null); // null | true | false
const [subdomainChoice, setSubdomainChoice] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setDomainInput("");
      setDomainCanonical("");
      setNickname("");
      setNotes("");
      setError("");
      setWarn("");
      setReachable(null);
      setSubdomainChoice(null);
      // setTimeout(() => firstInputRef.current?.focus(), 20);
    }
  }, [isOpen]);



useEffect(() => {
  if (!isOpen) return;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
      return;
    }

    if (e.key === "Tab") {
      // Cast querySelectorAll to HTMLElement
      const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusables || focusables.length === 0) return;

      const list = Array.from(focusables); // list: HTMLElement[]

      const first: HTMLElement = list[0];
      const last: HTMLElement = list[list.length - 1];

      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}, [isOpen, onClose]);


  // Domain normalization on blur/change
  function normalizeAndSet(input, onBlur = false) {
    setError("");
    setWarn("");
    setReachable(null);

    const host = extractHostname(input);
    const stripped = stripWww(host);
    let canonical = canonicalRoot(stripped);

    const looksValid = DOMAIN_RE.test(stripped);
    const isRoot = isLikelyRoot(stripped);

    // If it's a subdomain, suggest canonical root (non-blocking)
    if (looksValid && !isRoot && onBlur && !subdomainChoice) {
      setWarn(`We normalized this to ${canonical}. You can keep the subdomain if needed.`);
      setSubdomainChoice("use-root");
      setDomainCanonical(canonical);
      setDomainInput(stripped);
      return;
    }

    if (subdomainChoice === "keep-sub" && looksValid) {
      canonical = stripped; // honor explicit subdomain choice
    }

    setDomainInput(stripped || input.trim());
    setDomainCanonical(looksValid ? canonical : "");
  }

  // Validate blocking rules for Add button
const duplicate = useMemo(() => {
  if (!domainCanonical) return false;
  return (existing as string[])
    .map((d) => d.toLowerCase())
    .includes(domainCanonical.toLowerCase());
}, [domainCanonical, existing]);


  const lockedUntil = useMemo(() => {
    if (!domainCanonical) return null;
    const key = domainCanonical.toLowerCase();
    return locked[key] || null;
  }, [domainCanonical, locked]);

  function validateBlocking() {
    if (!domainInput.trim()) {
      setError("Please enter a domain to continue.");
      return false;
    }
    if (!DOMAIN_RE.test(domainCanonical)) {
      setError("Enter a valid root domain (e.g., example.com).");
      return false;
    }
    if (duplicate) {
      setError("This domain is already in your competitor list.");
      return false;
    }
    if (lockedUntil) {
      setError(`This domain is locked until reset on ${lockedUntil}.`);
      return false;
    }
    if (!allowSubmit) {
      setError("Only Admins or Owners can add competitors.");
      return false;
    }
    if (showUpgrade) {
      setError("You’ve reached your plan’s competitor limit.");
      return false;
    }
    return true;
  }

  async function handleValidate() {
    setValidating(true);
    setReachable(null);
    const h = domainCanonical || extractHostname(domainInput);
    const host = stripWww(h);
const res = (await pingHostFavicon(host)) as { ok: boolean };
// setReachable(res.ok);
if (!res.ok) {
  setWarn("Domain not reachable now — still allowed to add.");
}

  }

  async function handleSubmit() {
    setError("");
    if (!validateBlocking()) return;

    const payload = {
      project_id: projectId ?? "demo-project",
      domain_raw: domainInput,
      domain_canonical: domainCanonical,
      nickname: nickname.trim(),
      notes: notes.trim(),
    };
    await onSubmit?.(payload);
    onClose?.();
  }

  if (!isOpen) return null;

  const infoLine = seats.limit > 0
    ? `You’ve used ${seats.used} of ${seats.limit} competitor slots.`
    : atPlanLimit
      ? "Your current plan does not include competitor slots."
      : "";

  const resetLine = seats.resetsOn ? `Slots reset on: ${new Date(seats.resetsOn).toLocaleDateString()}` : "";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="add-competitor-title"
    >
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onClose?.()}
        aria-hidden="true"
      />

      {/* modal */}
      <div
        ref={modalRef}
        className={classNames(
          "relative z-[91] w-full max-w-[480px] rounded-xl bg-white shadow-xl",
          "max-h-[90vh] overflow-hidden",
          "sm:max-h-[85vh]"
        )}
      >
        {/* header */}
        <div className="sticky top-0 z-[92] border-b border-[#EFF0F6] bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 id="add-competitor-title" className="text-base font-semibold text-[#282829]">
              🔘 Add New Competitor
            </h2>
            <button
              onClick={() => onClose?.()}
              className="rounded-md px-2 py-1 text-sm text-[#6B7280] hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* body (scrollable) */}
        <div className="overflow-y-auto px-5 py-4">
          {/* Domain */}
          <label className="block text-sm font-medium text-[#282829]">
            Domain <span className="text-red-600">*</span>
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              ref={firstInputRef}
              type="text"
              inputMode="url"
              placeholder="https://www.example.com"
              className="w-full rounded-lg border border-[#EFF0F6] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1090D0]"
              value={domainInput}
              onChange={(e) => normalizeAndSet(e.target.value, false)}
              onBlur={(e) => normalizeAndSet(e.target.value, true)}
              aria-describedby="domain-help domain-error"
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={!DOMAIN_RE.test(domainCanonical) || validating}
              className={classNames(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white",
                validating ? "bg-[#0d7fb5]/60" : "bg-[#1090D0] hover:bg-[#0d7fb5]",
                !DOMAIN_RE.test(domainCanonical) && "opacity-50 cursor-not-allowed"
              )}
              title="Validate domain is reachable"
              aria-label="Validate domain is reachable"
            >
              {validating ? "…" : "Validate"}
            </button>
          </div>
          <p id="domain-help" className="mt-1 text-xs text-[#374151]">
            We’ll auto-trim http(s):// and <span className="font-mono">www.</span>, forcing lowercase & root domain.
          </p>

          {/* Canonicalization hint */}
          {warn && !error && (
            <div className="mt-2 rounded-md bg-[#FFF9E5] p-3 text-xs text-[#6B4E00]">
              ⚠ {warn}{" "}
              {subdomainChoice && (
                <span className="ml-1 inline-flex gap-2">
                  <button
                    className="underline"
                    onClick={() => {
                      setSubdomainChoice("use-root");
                      setDomainCanonical(canonicalRoot(extractHostname(domainInput)));
                    }}
                  >
                    Use root
                  </button>
                  <span>·</span>
                  <button
                    className="underline"
                    onClick={() => {
                      setSubdomainChoice("keep-sub");
                      const stripped = stripWww(extractHostname(domainInput));
                      setDomainCanonical(stripped);
                      setWarn("Subdomain kept intentionally.");
                    }}
                  >
                    Keep typed
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Validate status */}
          {reachable !== null && !error && (
            <div
              className={classNames(
                "mt-2 rounded-md p-2 text-xs",
                reachable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              )}
              role="status"
              aria-live="polite"
            >
              {reachable ? "Domain appears reachable." : "Domain not reachable now — still allowed to add."}
            </div>
          )}

          {/* Nickname */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#282829]">Nickname (optional)</label>
            <input
              type="text"
              maxLength={50}
              placeholder="Main US Blog"
              className="mt-1.5 w-full rounded-lg border border-[#EFF0F6] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1090D0]"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#282829]">Internal Notes (optional)</label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Competitor has strong backlinks in tech blog cluster"
              className="mt-1.5 w-full resize-y rounded-lg border border-[#EFF0F6] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1090D0]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Seats & reset info */}
          <div className="mt-4 rounded-md bg-[#F5F7FA] p-3 text-sm text-[#374151]">
            <div className="flex items-center justify-between">
              <span>🔔 {infoLine}</span>
              {seats.limit > 0 && (
                <span className="text-xs text-[#6B7280]">⏰ {resetLine}</span>
              )}
            </div>
            <div className="mt-2 text-xs text-[#6B7280]">
              ⚠ Deleting won’t free this seat this cycle (it unlocks on reset).
            </div>
          </div>

          {/* Upgrade banner */}
          {showUpgrade && (
            <div className="mt-3 rounded-md border border-[#FFE7A6] bg-[#FFF9E5] p-3 text-sm text-[#6B4E00]">
              You’ve hit your plan’s competitor limit.{" "}
              <button
                className="ml-1 inline-flex items-center underline"
                onClick={() => onUpgrade?.()}
              >
                Upgrade Plan ↗
              </button>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div id="domain-error" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-[#E53935]">
              {error}
            </div>
          )}
        </div>

        {/* footer (sticky) */}
        <div className="sticky bottom-0 z-[92] flex items-center justify-end gap-3 border-t border-[#EFF0F6] bg-white px-5 py-3">
          <button
            onClick={() => onClose?.()}
            className="rounded-lg border border-[#EFF0F6] bg-[#F5F7FA] px-4 py-2 text-sm font-medium text-[#282829] hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !allowSubmit ||
              showUpgrade ||
              !DOMAIN_RE.test(domainCanonical) ||
              duplicate ||
              !!lockedUntil
            }
            className={classNames(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white",
              (!allowSubmit ||
                showUpgrade ||
                !DOMAIN_RE.test(domainCanonical) ||
                duplicate ||
                !!lockedUntil) ?
                "bg-[#1090D0]/60 cursor-not-allowed" :
                "bg-[#1090D0] hover:bg-[#0d7fb5]"
            )}
          >
            ✅ Add Competitor
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Demo wrapper (so you can see it immediately) ---------------------------

export default function DemoAddCompetitorModal() {
  const [open, setOpen] = useState(false); // auto-open so it's visible in a playground
  const [used, setUsed] = useState(6);
  const [toast, setToast] = useState("");

  // Simulate existing and locked states
  const existing = ["comp1.com", "comp2.com"];
  const locked = { "oldcompetitor.com": "2025-08-01" };

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1600);
  }

  return (
    <>
                  <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-[#1090D0] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d7fb5] cursor-pointer"
          >
            ➕ Add Competitor
          </button>
          <AddCompetitorModal
        isOpen={open}
        onClose={() => setOpen(false)}
        seats={{ used, limit: 10, resetsOn: "2025-08-01" }}
        userRole={ROLES.OWNER}
        existing={existing}
        locked={locked}
        atPlanLimit={false}
        onUpgrade={() => flash("Upgrade Plan clicked")}
        onSubmit={async ({ domain_canonical }) => {
          // emulate successful save and seat consumption
          await new Promise((r) => setTimeout(r, 400));
          setUsed((u) => u + 1);
          flash(`Competitor added successfully. Slot ${used + 1} of 10 used. (${domain_canonical})`);
        }}
      />

      <Toast message={toast} />
    </>
  );
}
