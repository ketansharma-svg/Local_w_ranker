"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Info as InfoIcon,
  ChevronDown,
  Check,
  AlertTriangle,
  Globe2,
  Type,
  FileText,
} from "lucide-react";

/**
 * Wranker • Competitor Tracker — Track Competitor Page Modal
 * Drop‑in, dependency‑free (React + tailwind + lucide-react) implementation.
 *
 * What’s included:
 * - 520px desktop modal (full mobile), 6px radius, focus trap, ESC to close
 * - Fields: Competitor (dropdown), Page URL (normalize + validate), Label, Page Type,
 *           Alert Rules (with thresholds), Internal Notes
 * - Validation: required URL, format, eTLD+1 domain match, async duplicate check
 * - Dedupe warning block (red stripe) with actions (Open / Update Alerts mode)
 * - Primary CTA disabled until valid; loading state; success toast “Page is now being tracked.”
 *
 * Usage:
 *   <TrackCompetitorPageModal
 *      open={open}
 *      onClose={() => setOpen(false)}
 *      competitors={[{id:"c1", domain:"comp1.com", nickname:"Comp One"}]}
 *      defaultCompetitorId="c1"
 *      initialUrl="/seo-guide"
 *      onCheckDuplicate={async (competitorId, url) => ({ exists:false })}
 *      onSubmit={async (payload) => { ...persist... }}
 *   />
 *
 * This file also exports a default DEMO wrapper at the bottom for quick preview.
 */

/* ------------------------------- TOKENS -------------------------------- */
const TK = {
  brand: "#1090D0",
  brandHover: "#0C7FB6",
  text: "#282829",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  danger: "#F04438",
  ok: "#16A34A",
  warn: "#F59E0B",
  radius: "6px",
} as const;

/* ------------------------------- TYPES --------------------------------- */
export type Competitor = { id: string; domain: string; nickname?: string; faviconUrl?: string };

export type TrackPagePayload = {
  competitorId: string;
  pageUrl: string; // normalized absolute https URL
  label?: string;
  pageType?: "blog" | "product" | "service" | "other";
  alerts: {
    gainsBacklinks: boolean;
    rankDeltaEnabled: boolean;
    rankDeltaThreshold?: number; // positions
    contentDeltaEnabled: boolean;
    contentDeltaPct?: number; // percent
  };
  notes?: string;
};

type DedupeResult = { exists: boolean; id?: string; label?: string; lastUpdatedISO?: string };

export type TrackCompetitorPageModalProps = {
  open: boolean;
  onClose: () => void;

  competitors: Competitor[];
  defaultCompetitorId?: string;

  initialUrl?: string;
  initialLabel?: string;
  initialPageType?: "blog" | "product" | "service" | "other";

  onCheckDuplicate?: (competitorId: string, absoluteUrl: string) => Promise<DedupeResult>;
  onSubmit?: (payload: TrackPagePayload, opts?: { existingId?: string; updateExisting?: boolean }) => Promise<void> | void;
};

/* ----------------------------- HELPERS --------------------------------- */
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function useFocusTrap(active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const selectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(selectors)).filter(
      (n) => !n.hasAttribute("disabled")
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);
  return ref;
}

function usePreventScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [active]);
}

/** Very small PSL helper (covers common multi-part TLDs). */
const MULTI_TLDS = [
  "co.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.in",
  "com.br",
  "com.mx",
  "com.tr",
  "com.ar",
  "com.pl",
  "co.jp",
  "com.sg",
];

function etldPlusOne(host: string) {
  const h = host.toLowerCase().replace(/^www\./, "");
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const last2 = parts.slice(-2).join(".");
  const last3 = parts.slice(-3).join(".");
  if (MULTI_TLDS.includes(last2)) {
    return parts.slice(-3).join(".");
  }
  if (MULTI_TLDS.includes(last3)) {
    return parts.slice(-4).join(".");
  }
  return last2;
}

function ensureHttpsUrl(u: string) {
  // Accepts absolute URL or bare domain/path; returns normalized absolute URL or null.
  try {
    // If starts with // or missing scheme, prepend https://
    const withScheme = /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/\//, "")}`;
    const url = new URL(withScheme);
    // Normalize protocol to https
    url.protocol = "https:";
    // Remove hash
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeFromPathOrUrl(input: string, competitorDomain?: string) {
  const raw = (input || "").trim();
  if (!raw) return { url: null, error: "required" as const };
  if (raw.startsWith("/")) {
    if (!competitorDomain) return { url: null, error: "domainMissing" as const };
    const abs = `https://${competitorDomain.replace(/^https?:\/\//, "")}${raw}`;
    const u = ensureHttpsUrl(abs);
    return { url: u, error: u ? null : ("format" as const) };
  }
  const u = ensureHttpsUrl(raw);
  return { url: u, error: u ? null : ("format" as const) };
}

function compactDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

/* ----------------------------- POPOVER --------------------------------- */
function InfoPopover({ label }: { label: string }) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className="invisible group-hover:visible absolute z-50 top-full mt-1 w-72 rounded-md border bg-white p-2 text-xs leading-snug"
        style={{ borderColor: TK.border, color: TK.text }}
      >
        {label}
      </span>
    </span>
  );
}

/* ------------------------------ TOAST ---------------------------------- */
function Toast({ text, onClose }: { text: string; onClose?: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), 3800);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed right-4 top-4 z-[110] rounded-md border px-3 py-2 shadow bg-white"
      style={{ borderColor: TK.border, color: TK.text }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Check size={16} color={TK.ok} />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

/* --------------------------- MAIN MODAL -------------------------------- */
export function TrackCompetitorPageModal({
  open,
  onClose,
  competitors,
  defaultCompetitorId,
  initialUrl,
  initialLabel,
  initialPageType,
  onCheckDuplicate,
  onSubmit,
}: TrackCompetitorPageModalProps) {
  const [competitorId, setCompetitorId] = useState<string>(defaultCompetitorId || competitors[0]?.id);
  const competitor = useMemo(
    () => competitors.find((c) => c.id === competitorId) || competitors[0],
    [competitors, competitorId]
  );

  const [urlInput, setUrlInput] = useState<string>(initialUrl || "");
  const [label, setLabel] = useState<string>(initialLabel || "");
  const [pageType, setPageType] = useState<"blog" | "product" | "service" | "other" | undefined>(
    initialPageType
  );

  const [alerts, setAlerts] = useState({
    gainsBacklinks: true,
    rankDeltaEnabled: true,
    rankDeltaThreshold: 3,
    contentDeltaEnabled: true,
    contentDeltaPct: 10,
  });

  const [notes, setNotes] = useState("");

  // Validation state
  const [errors, setErrors] = useState<{ url?: string }>({});
  const [checking, setChecking] = useState(false);
  const [dedupe, setDedupe] = useState<DedupeResult | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // A11y + UX
  const trapRef = useFocusTrap(open);
  usePreventScroll(open);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setChecking(false);
    setDedupe(null);
    setUpdateExisting(false);
  }, [open]);

  // ESC handle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        // simple unsaved guard
        if (saving) return;
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  // Normalize + validate URL (on blur)
  function validateAndMaybeCheckDuplicate(opts?: { onSubmit?: boolean }) {
    const compDomain = competitor?.domain || "";
    const norm = normalizeFromPathOrUrl(urlInput, compDomain);
    const nextErrors: typeof errors = { ...errors, url: undefined };

    if (!norm.url) {
      nextErrors.url =
        norm.error === "required"
          ? "Page URL is required."
          : norm.error === "domainMissing"
          ? "Enter a full URL or a path (e.g., /seo-guide) after choosing competitor."
          : "Enter a valid URL.";
      setErrors(nextErrors);
      setDedupe(null);
      return { ok: false, url: null };
    }

    // domain match check
    try {
      const u = new URL(norm.url);
      const host = u.host;
      const compHost = new URL(`https://${compDomain}`).host;
      if (etldPlusOne(host) !== etldPlusOne(compHost)) {
        nextErrors.url = `This URL doesn’t belong to ${compDomain}.`;
        setErrors(nextErrors);
        setDedupe(null);
        return { ok: false, url: null };
      }
    } catch {
      nextErrors.url = "Enter a valid URL.";
      setErrors(nextErrors);
      setDedupe(null);
      return { ok: false, url: null };
    }

    // OK so far — write back normalized URL into input (quality of life)
    if (!opts?.onSubmit) {
      setUrlInput(norm.url);
    }

    setErrors(nextErrors);

    // async duplicate check
    (async () => {
      setChecking(true);
      try {
        const res =
          (await onCheckDuplicate?.(competitor!.id, norm.url!)) ??
          // default mock behavior if no callback provided
          { exists: false };
        setDedupe(res);
      } catch {
        setDedupe(null);
      } finally {
        setChecking(false);
      }
    })();

    return { ok: true, url: norm.url };
  }

  function canSubmit(): boolean {
    if (saving || checking) return false;
    if (!competitor) return false;
    // quick front checks
    const norm = normalizeFromPathOrUrl(urlInput, competitor.domain);
    if (!norm.url) return false;
    try {
      const u = new URL(norm.url);
      const compHost = new URL(`https://${competitor.domain}`).host;
      if (etldPlusOne(u.host) !== etldPlusOne(compHost)) return false;
    } catch {
      return false;
    }
    // dedupe
    if (dedupe?.exists && !updateExisting) return false;
    return true;
  }

  async function handleSubmit() {
    const norm = validateAndMaybeCheckDuplicate({ onSubmit: true });
    if (!norm.ok || !norm.url || !competitor) return;

    if (dedupe?.exists && !updateExisting) return; // disallow until user chooses update

    setSaving(true);
    try {
      const payload: TrackPagePayload = {
        competitorId: competitor.id,
        pageUrl: norm.url,
        label: label?.trim() || undefined,
        pageType,
        alerts: {
          gainsBacklinks: !!alerts.gainsBacklinks,
          rankDeltaEnabled: !!alerts.rankDeltaEnabled,
          rankDeltaThreshold: alerts.rankDeltaEnabled ? Math.max(1, Math.round(alerts.rankDeltaThreshold || 3)) : undefined,
          contentDeltaEnabled: !!alerts.contentDeltaEnabled,
          contentDeltaPct: alerts.contentDeltaEnabled ? Math.max(1, Math.min(100, Math.round(alerts.contentDeltaPct || 10))) : undefined,
        },
        notes: notes?.trim() || undefined,
      };

      await onSubmit?.(payload, {
        existingId: dedupe?.id,
        updateExisting,
      });

      onClose();
      setToast("Page is now being tracked.");
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------- UI ---------------------------------- */
  if (!open) return null;
  const primaryLabel = dedupe?.exists && updateExisting ? "Update Alerts" : "Track Page";

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/30" />
      <div
        className="fixed inset-0 z-[100] grid place-items-start sm:place-items-center overflow-auto"
        aria-modal="true"
        role="dialog"
        aria-labelledby="track-page-title"
      >
        <div
          ref={trapRef}
          className="relative mt-8 w-full max-w-[520px] rounded-md border bg-white shadow-lg sm:mt-0"
          style={{ borderColor: TK.border, borderRadius: TK.radius }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
            <div className="pr-6">
              <h2 id="track-page-title" className="text-[16px] font-semibold" style={{ color: TK.text }}>
                ➕ Track Competitor Page
              </h2>
              <div className="mt-0.5 text-xs" style={{ color: TK.muted }}>
                Competitor: <b>{competitor?.nickname ? `${competitor.nickname} (${competitor.domain})` : competitor?.domain}</b>
              </div>
            </div>
            <button
              type="button"
              title="Close"
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            {/* Competitor dropdown */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Competitor
              </label>
              <CompetitorDropdown
                value={competitorId}
                items={competitors}
                onChange={(v) => {
                  setCompetitorId(v);
                  // Re-run validation when competitor changes
                  setTimeout(() => validateAndMaybeCheckDuplicate(), 0);
                }}
              />
              <p className="mt-1 text-xs" style={{ color: TK.muted }}>
                Choose which competitor the page belongs to.
              </p>
            </div>

            {/* Page URL */}
            <div className="mb-4">
              <label htmlFor="tcpm-url" className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Page URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="tcpm-url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onBlur={() => validateAndMaybeCheckDuplicate()}
                  placeholder={`https://${competitor?.domain || "competitor.com"}/seo-guide`}
                  className={classNames(
                    "h-10 w-full rounded-md border px-3 pr-9 text-sm outline-none",
                    errors.url ? "border-red-300 focus:ring-2 focus:ring-red-200" : "border-[#EFF0F6] focus:ring-2",
                  )}
                  style={{ borderColor: errors.url ? "#FCA5A5" : TK.border }}
                />
                {checking && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: TK.muted }}>
                    Checking…
                  </span>
                )}
              </div>
              {errors.url ? (
                <p className="mt-1 text-xs" style={{ color: TK.danger }}>
                  {errors.url}
                </p>
              ) : (
                <p className="mt-1 text-xs" style={{ color: TK.muted }}>
                  Tip: You can also paste a path like <code>/seo-guide</code>; we’ll attach the competitor domain.
                </p>
              )}

              {/* Dedupe warning */}
              {dedupe?.exists && !updateExisting && (
                <div className="mt-2 flex items-start gap-2 rounded-md border bg-[#F9FAFB] px-3 py-2 text-sm"
                  style={{ borderColor: TK.border }}>
                  <div className="mt-[2px] h-4 w-1 shrink-0 rounded-full" style={{ background: TK.danger }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-1 font-medium" style={{ color: TK.text }}>
                      <AlertTriangle size={14} color={TK.danger} />
                      This page is already being tracked
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: TK.muted }}>
                      {dedupe.label ? <b>{dedupe.label}</b> : "Existing entry"} • last updated {compactDate(dedupe.lastUpdatedISO)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                        style={{ borderColor: TK.border, color: TK.text }}
                        onClick={() => {
                          // open in new tab; we re-use current input
                          const norm = normalizeFromPathOrUrl(urlInput, competitor?.domain).url;
                          if (norm) window.open(norm, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Open tracked page
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 text-xs"
                        style={{ borderColor: TK.border, background: TK.chipBg, color: TK.text }}
                        onClick={() => setUpdateExisting(true)}
                      >
                        Update alert rules instead
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Label */}
            <div className="mb-4">
              <label htmlFor="tcpm-label" className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Label / Nickname (optional)
              </label>
              <input
                id="tcpm-label"
                value={label}
                onChange={(e) => setLabel(e.target.value.slice(0, 80))}
                placeholder="SEO Guide Page"
                className="h-10 w-full rounded-md border px-3 text-sm outline-none border-[#EFF0F6] focus:ring-2"
                style={{ borderColor: TK.border }}
              />
              <div className="mt-1 flex items-center justify-between text-xs" style={{ color: TK.muted }}>
                <span>Shown in Tracker tables & alerts.</span>
                <span>{label.length}/80</span>
              </div>
            </div>

            {/* Page Type */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Page Type (optional)
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["blog", "product", "service", "other"] as const).map((t) => (
                  <label
                    key={t}
                    className={classNames(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50",
                      pageType === t ? "ring-1" : ""
                    )}
                    style={{ borderColor: TK.border }}
                  >
                    <input
                      type="radio"
                      name="pageType"
                      className="accent-[var(--wr-brand,#1090D0)]"
                      checked={pageType === t}
                      onChange={() => setPageType(t)}
                    />
                    <span className="capitalize">{t}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs" style={{ color: TK.muted }}>
                Helps categorize activity and AI insights.
              </p>
            </div>

            {/* Alert Rules */}
            <div className="mb-4">
              <div className="mb-1 flex items-center gap-2">
                <div className="text-sm font-medium" style={{ color: TK.text }}>
                  Alert Rules
                </div>
                <InfoPopover label="Choose what changes should trigger alerts for this page." />
              </div>

              <div className="space-y-2 rounded-md border p-3" style={{ borderColor: TK.border }}>
                {/* Gains backlinks */}
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--wr-brand,#1090D0)]"
                      checked={alerts.gainsBacklinks}
                      onChange={(e) => setAlerts((a) => ({ ...a, gainsBacklinks: e.target.checked }))}
                    />
                    <span>Notify when this page receives new backlinks</span>
                  </span>
                </label>

                {/* Rank change */}
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--wr-brand,#1090D0)]"
                      checked={alerts.rankDeltaEnabled}
                      onChange={(e) => setAlerts((a) => ({ ...a, rankDeltaEnabled: e.target.checked }))}
                    />
                    <span>Notify if rank improves or drops by at least</span>
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={alerts.rankDeltaThreshold}
                      onChange={(e) => setAlerts((a) => ({ ...a, rankDeltaThreshold: Number(e.target.value || 1) }))}
                      disabled={!alerts.rankDeltaEnabled}
                      className="h-9 w-16 rounded-md border px-2 text-sm text-right outline-none border-[#EFF0F6]"
                      style={{ borderColor: TK.border }}
                    />
                    <span className="text-sm" style={{ color: TK.muted }}>
                      positions
                    </span>
                  </div>
                </label>

                {/* Content change */}
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--wr-brand,#1090D0)]"
                      checked={alerts.contentDeltaEnabled}
                      onChange={(e) => setAlerts((a) => ({ ...a, contentDeltaEnabled: e.target.checked }))}
                    />
                    <span>Notify if content length changes by</span>
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={alerts.contentDeltaPct}
                      onChange={(e) => setAlerts((a) => ({ ...a, contentDeltaPct: Number(e.target.value || 1) }))}
                      disabled={!alerts.contentDeltaEnabled}
                      className="h-9 w-16 rounded-md border px-2 text-sm text-right outline-none border-[#EFF0F6]"
                      style={{ borderColor: TK.border }}
                    />
                    <span className="text-sm" style={{ color: TK.muted }}>
                      %
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-2">
              <label htmlFor="tcpm-notes" className="mb-1 block text-sm font-medium" style={{ color: TK.text }}>
                Internal Notes (optional)
              </label>
              <textarea
                id="tcpm-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="This is their core SEO content page. Track closely."
                className="w-full rounded-md border px-3 py-2 text-sm outline-none border-[#EFF0F6] focus:ring-2"
                style={{ borderColor: TK.border }}
              />
              <div className="mt-1 flex items-center justify-between text-xs" style={{ color: TK.muted }}>
                <span className="inline-flex items-center gap-1">
                  <Globe2 size={12} /> Visible to your team only
                </span>
                <span>{notes.length}/500</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white px-4 py-3" style={{ borderColor: TK.border }}>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm bg-white hover:bg-gray-50"
              style={{ borderColor: TK.border, color: TK.text }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit()}
              onClick={handleSubmit}
              className={classNames(
                "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white shadow-sm",
                !canSubmit() ? "opacity-60 cursor-not-allowed" : ""
              )}
              style={{ background: TK.brand }}
              onMouseEnter={(e) => {
                if (!canSubmit()) return;
                (e.currentTarget as HTMLButtonElement).style.background = TK.brandHover;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = TK.brand;
              }}
            >
              {saving ? "Tracking…" : primaryLabel}
            </button>
          </div>
        </div>
      </div>

      {toast && <Toast text={toast} onClose={() => setToast(null)} />}
    </>
  );
}

/* ----------------------- Competitor Dropdown --------------------------- */
function CompetitorDropdown({
  value,
  items,
  onChange,
}: {
  value?: string;
  items: Competitor[];
  onChange?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = useMemo(() => items.find((i) => i.id === value) || items[0], [items, value]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm bg-white hover:bg-gray-50"
        style={{ borderColor: TK.border, color: TK.text }}
        onClick={() => setOpen((s) => !s)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded bg-[#F5F7FA]">
            <Type size={13} className="text-[#6B7280]" />
          </span>
          <span className="truncate">
            {current?.nickname ? `${current.nickname} (${current.domain})` : current?.domain ?? "Select competitor"}
          </span>
        </span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border bg-white shadow"
          style={{ borderColor: TK.border }}
        >
          <div className="max-h-[260px] overflow-auto">
            {items.map((c) => (
              <button
                key={c.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onChange?.(c.id);
                  setOpen(false);
                }}
                title={c.domain}
              >
                <span className="grid h-5 w-5 place-items-center rounded bg-[#F5F7FA]">
                  <FileText size={13} className="text-[#6B7280]" />
                </span>
                <span className="font-medium truncate">{c.nickname || c.domain}</span>
                <span className="ml-auto text-[#9CA3AF]">{c.domain}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ DEMO ----------------------------------- */
/** Remove this default export in production; kept for quick preview. */
export default function Demo_TrackCompetitorPageModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const competitors: Competitor[] = [
    { id: "c1", domain: "comp1.com", nickname: "Comp One" },
    { id: "c2", domain: "semcraft.io" },
    { id: "c3", domain: "rankpilot.co" },
  ];

  // Mock duplicate checker: treat /seo-guide under comp1.com as existing
  const mockCheck = async (competitorId: string, absoluteUrl: string): Promise<DedupeResult> => {
    await new Promise((r) => setTimeout(r, 600));
    const host = new URL(absoluteUrl).host.replace(/^www\./, "");
    if (competitorId === "c1" && host.endsWith("comp1.com") && absoluteUrl.includes("/seo-guide")) {
      return { exists: true, id: "pg_123", label: "SEO Guide Page", lastUpdatedISO: new Date().toISOString() };
    }
    return { exists: false };
    // return { exists: Math.random() < 0.25 }; // random mode
  };

  const mockSubmit = async (payload: TrackPagePayload) => {
    console.log("SUBMIT payload", payload);
    await new Promise((r) => setTimeout(r, 900));
  };

  return (
    // <div className="w-full bg-white">
    //   <div className="mx-auto max-w-3xl px-6 py-8">
    //     <h3 className="mb-3 text-lg font-semibold" style={{ color: TK.text }}>
    //       Demo — Track Competitor Page Modal
    //     </h3>
    //     <button
    //       className="rounded-md border px-3 py-2 text-sm"
    //       style={{ borderColor: TK.border, background: TK.chipBg, color: TK.text }}
    //       onClick={() => setOpen(true)}
    //     >
    //       Open Modal
    //     </button>
    //   </div>

    //   <TrackCompetitorPageModal
    //     open={open}
    //     onClose={() => setOpen(false)}
    //     competitors={competitors}
    //     defaultCompetitorId="c1"
    //     initialUrl="/seo-guide"
    //     onCheckDuplicate={mockCheck}
    //     onSubmit={mockSubmit}
    //   />
    // </div>
    <>
     <TrackCompetitorPageModal
        open={open}
        onClose={onClose}
        competitors={competitors}
        defaultCompetitorId="c1"
        initialUrl="/seo-guide"
        onCheckDuplicate={mockCheck}
        onSubmit={mockSubmit}
      />
    </>
  );
}
