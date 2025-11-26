// IntegrationPromptModal.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

/* =============================================================================
   Wranker Token Aliases (with safe fallbacks)
   --------------------------------------------------------------------------- */
const TK = {
  brand: "var(--brand, #008CCD)",
  brandPastel: "var(--brand-pastel, #D9EEF8)",
  focus: "var(--focus, #4286F5)",
  text: "var(--text-strong, #111827)",
  muted: "var(--text-muted, #6B7280)",
  panel: "var(--bg-panel, #FFFFFF)",
  border: "var(--border, #E5E7EB)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  critical: "var(--critical, #E94134)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  warning: "var(--warning, #F59E0B)",
  warningBg: "var(--warning-bg, #FDECC8)",
  success: "var(--success, #34A853)",
  successBg: "var(--success-bg, #CBF8D7)",
  shadow: "var(--shadow, 0 1px 3px rgba(0,0,0,0.1))",
  radius: "var(--radius, 6px)",
  overlay: "var(--overlay, rgba(17,24,39,0.60))",
};

const FONT_STACK =
  'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial';

/* =============================================================================
   Types
   --------------------------------------------------------------------------- */
type IntegrationStatus = "connected" | "expired" | "none";
type IntegrationType = "ga4" | "gsc";

export type IntegrationPromptModalProps = {
  /** Which integration is required for the current view */
  type: IntegrationType;
  /** Whether the modal is open (defaults to true) */
  open?: boolean;
  /** Current statuses (to render the status chips) */
  ga4Status?: IntegrationStatus;
  gscStatus?: IntegrationStatus;
  /** Optional project/site label to personalize copy */
  projectName?: string;

  /** Handlers (all optional; sensible fallbacks provided) */
  onConnect?: (type: IntegrationType) => void;
  onLearnMore?: (type: IntegrationType) => void;
  onClose?: () => void;

  /** Optional: show a preview block with short feature bullets */
  previewFeatures?: string[];
};

/* =============================================================================
   Tiny svg icons (no external deps) — brand-colored where applicable
   --------------------------------------------------------------------------- */
const Icon = {
  X: () => (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 10-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  ),
  // Brand mark (simple dot-in-ring)
  BrandMark: () => (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="10" cy="10" r="8" />
      <circle cx="10" cy="10" r="4" fill="white" />
    </svg>
  ),
  Lock: () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M5 8V6a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1h1zm2-2a3 3 0 116 0v2H7V6z" />
    </svg>
  ),
  Info: () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M9 9h2v6H9V9zm1-7a8 8 0 100 16A8 8 0 0010 2zm0 10a1 1 0 110 2 1 1 0 010-2zM9 5h2v2H9V5z" />
    </svg>
  ),
  Check: () => (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293A1 1 0 103.293 10.707l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" />
    </svg>
  ),
  Alert: () => (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-8h-2v6h2V10z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10.293 15.707a1 1 0 010-1.414L12.586 12H4a1 1 0 110-2h8.586L10.293 5.707A1 1 0 1111.707 4.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
    </svg>
  ),
  External: () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M12.293 2.293a1 1 0 011.414 0L18 6.586a1 1 0 01-1.414 1.414L13 4.414V8a1 1 0 11-2 0V3a1 1 0 011-1h4a1 1 0 110 2h-3.586l3.293 3.293a3 3 0 11-4.243 4.243l-6 6A3 3 0 013 19a3 3 0 01-2.121-.879A3 3 0 013 13l6-6a3 3 0 014.243 0z" />
    </svg>
  ),
};

/* =============================================================================
   Helpers
   --------------------------------------------------------------------------- */
const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const typeLabel = (t: IntegrationType) => (t === "ga4" ? "Google Analytics 4" : "Google Search Console");

/* =============================================================================
   Modular Chip
   --------------------------------------------------------------------------- */
type ChipTone = "neutral" | "brand" | "success" | "warning" | "critical";
function Chip({
  tone = "neutral",
  icon: IconEl,
  title,
  children,
}: React.PropsWithChildren<{ tone?: ChipTone; icon?: React.ComponentType; title?: string }>) {
  const map = {
    neutral: { bg: "#FFFFFF", fg: TK.text, bd: TK.borderSubtle },
    brand: { bg: TK.brandPastel, fg: TK.brand, bd: TK.borderSubtle },
    success: { bg: TK.successBg, fg: TK.success, bd: TK.borderSubtle },
    warning: { bg: TK.warningBg, fg: TK.warning, bd: TK.borderSubtle },
    critical: { bg: TK.criticalBg, fg: TK.critical, bd: TK.borderSubtle },
  } as const;
  const s = map[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.bd}` }}
      title={title}
    >
      {IconEl ? (
        <span className="inline-flex" style={{ color: s.fg }}>
          <IconEl />
        </span>
      ) : null}
      <span className="font-medium">{children}</span>
    </span>
  );
}

function statusChip(t: "GA4" | "GSC", s: IntegrationStatus) {
  const ok = s === "connected";
  const tone: ChipTone = ok ? "success" : s === "expired" ? "warning" : "critical";
  const IconEl = ok ? Icon.Check : Icon.Alert;
  const text = ok ? "Connected" : s === "expired" ? "Expired" : "Not Connected";
  return (
    <Chip key={t} tone={tone} icon={IconEl} title={`${t} ${text}`}>
      <strong className="font-semibold">{t}</strong> {text}
    </Chip>
  );
}

/* =============================================================================
   Focus Trap (simple + robust)
   --------------------------------------------------------------------------- */
function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const root = containerRef.current;
    const selector = 'a[href],button,textarea,input,select,[tabindex]:not([tabindex="-1"])';
    const first = () => root.querySelectorAll<HTMLElement>(selector)[0];
    const last = () => {
      const els = root.querySelectorAll<HTMLElement>(selector);
      return els[els.length - 1];
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const closeBtn = root.querySelector<HTMLElement>('[data-close="true"]');
        closeBtn?.click();
      }
      if (e.key === "Tab") {
        const ff = first();
        const ll = last();
        if (!ff || !ll) return;
        if (e.shiftKey && document.activeElement === ff) {
          e.preventDefault();
          ll.focus();
        } else if (!e.shiftKey && document.activeElement === ll) {
          e.preventDefault();
          ff.focus();
        }
      }
    };

    // Autofocus first interactive
    const f = first();
    f?.focus();

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [active, containerRef]);
}

/* =============================================================================
   Modal Component
   --------------------------------------------------------------------------- */
export function IntegrationPromptModal({
  type,
  open = true,
  ga4Status = "none",
  gscStatus = "none",
  projectName,
  onConnect,
  onLearnMore,
  onClose,
  previewFeatures,
}: IntegrationPromptModalProps) {
const ref = useRef<HTMLDivElement>(null);
useFocusTrap(open, ref as React.RefObject<HTMLElement>);



  const requiredIsConnected =
    (type === "ga4" && ga4Status === "connected") || (type === "gsc" && gscStatus === "connected");

  if (!open) return null;

  const requiredChip = type === "ga4" ? statusChip("GA4", ga4Status) : statusChip("GSC", gscStatus);
  const otherChip = type === "ga4" ? statusChip("GSC", gscStatus) : statusChip("GA4", ga4Status);

  const title = `Connect ${typeLabel(type)}`;
  const contextMsg =
    type === "ga4"
      ? `To access traffic insights, connect your ${typeLabel(type)} property${projectName ? ` for ${projectName}` : ""}.`
      : `To access search performance data, connect your ${typeLabel(type)} property${projectName ? ` for ${projectName}` : ""}.`;

  const handleConnect = () => onConnect?.(type);
  const handleLearn = () => onLearnMore?.(type);
  const handleClose = () => onClose?.();

  return (
    <div className="fixed inset-0 z-[1000]" style={{ fontFamily: FONT_STACK }}>
      {/* Overlay */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{ background: TK.overlay }}
        aria-hidden
        onClick={handleClose}
        title="Close"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby="intg-title"
          aria-describedby="intg-desc"
          className="relative w-full max-w-2xl rounded-lg border shadow-md outline-none"
          style={{ background: TK.panel, borderColor: TK.border, boxShadow: TK.shadow }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: TK.borderSubtle }}>
            <div className="flex items-center gap-2">
              <span className="inline-flex" style={{ color: TK.brand }}>
                <Icon.BrandMark />
              </span>
              <h2 id="intg-title" className="text-lg md:text-[20px] font-semibold" style={{ color: TK.text }}>
                {title}
              </h2>
            </div>

            <button
              data-close="true"
              onClick={handleClose}
              aria-label="Close"
              className="cursor-pointer inline-flex items-center justify-center rounded p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ color: TK.muted, outlineColor: TK.focus }}
              title="Close"
            >
              <Icon.X />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 pt-4 pb-5 space-y-4">
            <p id="intg-desc" className="text-sm leading-6" style={{ color: TK.text }}>
              {contextMsg}
            </p>

            {/* Status chips */}
            <div className="flex flex-wrap items-center gap-2">
              {requiredChip}
              {otherChip}
              <Chip tone="brand" icon={Icon.Info} title="Read-only access via Google APIs">
                Read-only access via Google APIs
              </Chip>
            </div>

            {/* Preview (optional, always shows a simple card if none provided) */}
            <div className="rounded-md border p-3 bg-white/70" style={{ borderColor: TK.borderSubtle }}>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: TK.text }}>
                <span className="inline-flex" style={{ color: TK.brand }}>
                  <Icon.Lock />
                </span>
                Your analytics view is locked
              </div>
              <div className="text-xs mt-1" style={{ color: TK.muted }}>
                Here’s a peek at what unlocks once connected:
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                {(previewFeatures && previewFeatures.length
                  ? previewFeatures
                  : ["Sessions & device breakdown", "Clicks • Impressions • CTR", "Top pages & countries"]
                ).map((f, i) => (
                  <div key={i} className="rounded-md border p-2 text-xs" style={{ borderColor: TK.borderSubtle, background: "#FAFBFF" }}>
                    <div className="font-medium mb-1" style={{ color: TK.text }}>
                      {f.split(" ")[0]}
                    </div>
                    <div style={{ color: TK.muted }}>{f}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap gap-2 items-center justify-between px-5 py-4 border-t" style={{ borderColor: TK.borderSubtle }}>
            <div className="text-xs" style={{ color: TK.muted }}>
              Stay in context — connection happens inside this panel.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConnect}
                className="cursor-pointer inline-flex items-center gap-2 h-9 px-3 rounded text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ background: TK.brand, outlineColor: TK.focus }}
                title={`Connect ${typeLabel(type)}`}
              >
                Connect {type === "ga4" ? "GA4" : "GSC"}
                <span className="inline-flex" style={{ color: "#ffffff" }}>
                  <Icon.ArrowRight />
                </span>
              </button>

              <button
                onClick={handleLearn}
                className="cursor-pointer inline-flex items-center gap-2 h-9 px-3 rounded border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ borderColor: TK.border, color: TK.text, outlineColor: TK.focus }}
                title="Learn more"
              >
                Learn More
                <span className="inline-flex" style={{ color: TK.brand }}>
                  <Icon.External />
                </span>
              </button>

              <button
                onClick={handleClose}
                className="cursor-pointer inline-flex items-center h-9 px-3 rounded text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ outlineColor: TK.focus }}
                title="Maybe later"
              >
                Maybe Later
              </button>
            </div>
          </div>

          {/* Connected hint (if user opens modal even when connected) */}
          {requiredIsConnected && (
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-6 text-[11px] rounded px-2 py-1"
              style={{ background: TK.successBg, color: TK.success, border: `1px solid ${TK.borderSubtle}` }}
            >
              {typeLabel(type)} is already connected for this project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   100% functional demo usage (drop into any page to verify visually)
   Remove this block in production and import <IntegrationPromptModal /> instead.
   --------------------------------------------------------------------------- */
export default function Demo_IntegrationPromptModal() {
  const [open, setOpen] = useState(true);
  const [ga4, setGa4] = useState<IntegrationStatus>("none");
  const [gsc, setGsc] = useState<IntegrationStatus>("connected");

  // Simulate "connect" completing inside the panel:
  const handleConnect = (t: IntegrationType) => {
    if (t === "ga4") setGa4("connected");
    if (t === "gsc") setGsc("connected");
    alert(`Starting ${t.toUpperCase()} OAuth… (demo)`);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center" style={{ fontFamily: FONT_STACK }}>
      {/* <button
        onClick={() => setOpen(true)}
        className="cursor-pointer inline-flex items-center gap-2 h-10 px-4 rounded text-sm text-white"
        style={{ background: TK.brand }}
        title="Open Modal"
      >
        Open Integration Prompt
      </button> */}

      <IntegrationPromptModal
        open={open}
        type="ga4"
        ga4Status={ga4}
        gscStatus={gsc}
        projectName="wranker.com"
        onConnect={handleConnect}
        onLearnMore={() => alert("Open help docs… (demo)")}
        onClose={() => setOpen(false)}
        previewFeatures={[
          "Sessions & device breakdown",
          "Clicks • Impressions • CTR",
          "Landing pages by query",
        ]}
      />
    </div>
  );
}
