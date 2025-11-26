"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  BarChart3,
  Wrench,
  User,
  Cog,
  Copy,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Minimal tokens so this page looks correct even without global tokens loaded.
   Remove if you already inject these globally.  (Wranker Design Tokens)
   ────────────────────────────────────────────────────────────────────────── */
function GlobalTokens() {
  return (
    <style>{`
:root{
  --brand:#008CCD; --brand-600:#007BB8; --on-brand:rgba(255,255,255,0.88);
  --text-strong:#111827; --text:#374151; --text-muted:#6B7280;
  --bg-app:#F5F7FA; --bg-panel:#FFFFFF;
  --border:#E5E7EB; --border-subtle:#EFF0F6;
  --success:#34A853; --success-bg:#CBF8D7;
  --warning:#F9BB04; --warning-bg:#FCEBB8;
  --critical:#E94134; --critical-bg:#FBC4BF;
  --focus:#4286F5; --radius:6px;
}
* { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif; }
`}</style>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────────── */
type Outcome = "success" | "warning" | "error";
type Source =
  | "GSC"
  | "GA4"
  | "Crawl"
  | "Rank"
  | "Reports"
  | "Access"
  | "Automations";

type ActivityEvent = {
  id: string;
  title: string;                // e.g., "GA4 re‑authorized"
  outcome: Outcome;             // success | warning | error
  occurredAt: string;           // ISO
  summary?: string;             // short paragraph or error snippet
  actor?: { name?: string; email?: string };
  source?: Source;
  property?: string;            // e.g., "wranker.com" or GA4 property name
  before?: Record<string, string>;
  after?: Record<string, string>;
  logUrl?: string;              // deep log entry
  settingsHref?: string;        // open settings
  // Context actions (make any optional)
  reauth?: { label?: string; onClick?: () => Promise<void> | void; disabled?: boolean };
  retry?: { label?: string; onClick?: () => Promise<void> | void; disabled?: boolean };
};

export type ActivityDetailsDrawerProps = {
  open: boolean;
  onClose: () => void;
  event: ActivityEvent;

  // Optional pagination within the drawer
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
};

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */
const outcomeChip = (o: Outcome) =>
  `inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium ${
    o === "success"
      ? "text-[var(--success)] bg-[var(--success-bg)]"
      : o === "warning"
      ? "text-[var(--warning)] bg-[var(--warning-bg)]"
      : "text-[var(--critical)] bg-[var(--critical-bg)]"
  }`;

const iconForSource = (s?: Source) => {
  switch (s) {
    case "GSC":
      return <Search className="h-5 w-5" aria-hidden />;
    case "GA4":
      return <BarChart3 className="h-5 w-5" aria-hidden />;
    case "Crawl":
      return <Wrench className="h-5 w-5" aria-hidden />;
    case "Reports":
      return <FileText className="h-5 w-5" aria-hidden />;
    case "Access":
      return <User className="h-5 w-5" aria-hidden />;
    case "Automations":
      return <Cog className="h-5 w-5" aria-hidden />;
    case "Rank":
      return <FileText className="h-5 w-5" aria-hidden />;
    default:
      return <FileText className="h-5 w-5" aria-hidden />;
  }
};

const fmtRelative = (iso?: string) => {
  if (!iso) return "—";
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
  } catch {
    return "—";
  }
};

const unionKeys = (a?: Record<string, string>, b?: Record<string, string>) => {
  const set = new Set<string>([...(Object.keys(a || {})), ...(Object.keys(b || {}))]);
  return Array.from(set);
};

/* Focus trap + Esc + outside click (same pattern as Connection Drawer) */
function useModalA11y(
  open: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const isShift = e.shiftKey;
        if (!isShift && active === last) {
          e.preventDefault();
          first.focus();
        }
        if (isShift && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (!open) return;
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(e.target as Node)) onClose();
    };

    if (open) {
      lastFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("mousedown", onPointerDown, true);
      // Focus first control when opening
      setTimeout(() => {
        const el = containerRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        el?.focus();
      }, 0);
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown, true);
      // Restore focus
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === "function") {
        lastFocusedRef.current.focus();
      }
    };
  }, [open, onClose, containerRef]);
}

/* ──────────────────────────────────────────────────────────────────────────
   Named export: Activity Details Drawer (Recent Activity → click a row)
   ────────────────────────────────────────────────────────────────────────── */
export function ActivityDetailsDrawer({
  open,
  onClose,
  event,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: ActivityDetailsDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalA11y(open, onClose, containerRef);

  const [busy, setBusy] = useState<"reauth" | "retry" | null>(null);
  const titleId = useMemo(() => `activity-title-${event.id}`, [event.id]);

  if (!open) return null;

  const changedKeys = unionKeys(event.before, event.after);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(event.id);
    } catch {
      // no-op; clipboard might be blocked
    }
  };

  const run = async (kind: "reauth" | "retry") => {
    if (busy) return;
    const fn = kind === "reauth" ? event.reauth?.onClick : event.retry?.onClick;
    if (!fn) return;
    try {
      setBusy(kind);
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[80]" aria-labelledby={titleId} role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Sheet */}
      <div
        ref={containerRef}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[420px] bg-[var(--bg-panel)] border-l shadow-lg"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 text-[var(--brand)]">{iconForSource(event.source)}</div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-[16px] font-semibold text-[var(--text-strong)] truncate">
                {event.title || "Activity details"}
              </h2>
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                <span>{fmtRelative(event.occurredAt)}</span>
                {event.source ? <span>• {event.source}</span> : null}
                {event.property ? <span>• {event.property}</span> : null}
              </div>
            </div>
            <span className={`${outcomeChip(event.outcome)} ml-2`}>
              {event.outcome === "success" ? "Success" : event.outcome === "warning" ? "Warning" : "Error"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Prev / Next (optional) */}
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-disabled={!hasPrev}
              className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center border hover:bg-[var(--bg-app)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              title="Previous"
            >
              <ChevronLeft className="h-5 w-5 text-[var(--text)]" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              aria-disabled={!hasNext}
              className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center border hover:bg-[var(--bg-app)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              title="Next"
            >
              <ChevronRight className="h-5 w-5 text-[var(--text)]" />
            </button>

            {/* <button
              className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              <X className="h-5 w-5 text-[var(--text)]" />
            </button> */}
          </div>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-56px-80px)] overflow-auto px-4 py-4 space-y-5">
          {/* Summary */}
          {event.summary && (
            <div className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-start gap-2">
                {event.outcome === "error" ? (
                  <AlertTriangle className="h-4 w-4 mt-[2px] text-[var(--critical)]" aria-hidden />
                ) : event.outcome === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mt-[2px] text-[var(--success)]" aria-hidden />
                ) : (
                  <Info className="h-4 w-4 mt-[2px] text-[var(--warning)]" aria-hidden />
                )}
                <p className="text-sm text-[var(--text)]">{event.summary}</p>
              </div>
            </div>
          )}

          {/* Structured fields */}
          <section className="rounded-[var(--radius)] border" style={{ borderColor: "var(--border)" }}>
            <header
              className="px-3 py-2 border-b text-sm font-medium text-[var(--text-strong)]"
              style={{ borderColor: "var(--border)" }}
            >
              Details
            </header>
            <dl className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between py-1">
                <dt className="text-[var(--text-muted)]">Actor</dt>
                <dd className="text-[var(--text-strong)]">
                  {event.actor?.name || event.actor?.email || "System"}
                </dd>
              </div>
              {event.source && (
                <div className="flex items-center justify-between py-1">
                  <dt className="text-[var(--text-muted)]">Source</dt>
                  <dd className="text-[var(--text-strong)]">{event.source}</dd>
                </div>
              )}
              {event.property && (
                <div className="flex items-center justify-between py-1">
                  <dt className="text-[var(--text-muted)]">Property</dt>
                  <dd className="text-[var(--text-strong)]">{event.property}</dd>
                </div>
              )}
              <div className="flex items-center justify-between py-1">
                <dt className="text-[var(--text-muted)]">Event ID</dt>
                <dd className="text-[var(--text-strong)]">{event.id}</dd>
              </div>
              {event.logUrl && (
                <div className="flex items-center justify-between py-1">
                  <dt className="text-[var(--text-muted)]">Log</dt>
                  <dd>
                    <a
                      className="inline-flex items-center gap-1 text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
                      href={event.logUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View log <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Before / After diff (if present) */}
          {changedKeys.length > 0 && (
            <section className="rounded-[var(--radius)] border" style={{ borderColor: "var(--border)" }}>
              <header
                className="px-3 py-2 border-b text-sm font-medium text-[var(--text-strong)]"
                style={{ borderColor: "var(--border)" }}
              >
                Changes
              </header>
              <div className="px-3 py-2">
                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] mb-1">
                  <div>Before</div>
                  <div>After</div>
                </div>
                <ul className="space-y-2">
                  {changedKeys.map((k) => {
                    const before = event.before?.[k];
                    const after = event.after?.[k];
                    const changed = (before ?? "") !== (after ?? "");
                    return (
                      <li key={k} className="grid grid-cols-2 gap-2">
                        <div
                          className={`rounded-[var(--radius)] border px-2 py-1 text-sm ${
                            changed ? "line-through opacity-70" : ""
                          }`}
                          style={{ borderColor: "var(--border)" }}
                          title={before ?? ""}
                        >
                          <span className="text-[var(--text)]">{before ?? "—"}</span>
                        </div>
                        <div
                          className={`rounded-[var(--radius)] border px-2 py-1 text-sm ${
                            changed ? "bg-[var(--warning-bg)]" : ""
                          }`}
                          style={{ borderColor: "var(--border)" }}
                          title={after ?? ""}
                        >
                          <span className="text-[var(--text-strong)]">{after ?? "—"}</span>
                        </div>
                        <div className="col-span-2 text-xs text-[var(--text-muted)]">{k}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* Context CTAs */}
          {(event.reauth || event.retry || event.settingsHref) && (
            <section className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)] mb-2">Next steps</div>
              <div className="flex flex-wrap items-center gap-2">
                {event.retry && (
                  <button
                    type="button"
                    onClick={() => run("retry")}
                    disabled={!!event.retry.disabled || busy === "retry"}
                    aria-disabled={!!event.retry.disabled || busy === "retry"}
                    className="h-10 px-3 rounded-[var(--radius)] border text-sm text-[var(--text)] hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    style={{ borderColor: "var(--border)" }}
                    title={event.retry.disabled ? "Retry unavailable" : "Retry sync"}
                  >
                    {busy === "retry" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {event.retry.label || "Retry sync"}
                  </button>
                )}

                {event.reauth && (
                  <button
                    type="button"
                    onClick={() => run("reauth")}
                    disabled={!!event.reauth.disabled || busy === "reauth"}
                    aria-disabled={!!event.reauth.disabled || busy === "reauth"}
                    className="h-10 px-4 rounded-[var(--radius)] text-sm font-medium text-white bg-[var(--brand)] hover:bg-[var(--brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    title={event.reauth.disabled ? "Re‑auth unavailable" : "Re‑authorize"}
                  >
                    {busy === "reauth" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {event.reauth.label || "Re‑authorize"}
                  </button>
                )}

                {event.settingsHref && (
                  <a
                    href={event.settingsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 px-3 rounded-[var(--radius)] border inline-flex items-center gap-2 text-sm text-[var(--text)] hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                    style={{ borderColor: "var(--border)" }}
                    title="Open settings"
                  >
                    Open settings <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div
          className="h-[80px] px-4 py-3 border-t flex items-center gap-2 justify-end bg-[var(--bg-panel)]"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={handleCopyId}
            className="mr-auto h-10 px-3 rounded-[var(--radius)] border text-sm text-[var(--text)] hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] inline-flex items-center gap-2"
            style={{ borderColor: "var(--border)" }}
            title="Copy event ID"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy event ID
          </button>

          {event.logUrl && (
            <a
              href={event.logUrl}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-3 rounded-[var(--radius)] border inline-flex items-center gap-2 text-sm text-[var(--text)] hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
              style={{ borderColor: "var(--border)" }}
              title="Open in Audit Log"
            >
              Open in Audit Log <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>

        {/* Live region for SR announcements */}
        <p className="sr-only" aria-live="polite">
          {busy === "retry" ? "Retrying…" : busy === "reauth" ? "Re‑authorizing…" : ""}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Default export: Demo page with a visible button to open the drawer
   ────────────────────────────────────────────────────────────────────────── */
export default function ActivityDetailsDrawerDemo() {
  const [open, setOpen] = useState(true);

  // Mock event
  const demoEvent: ActivityEvent = {
    id: "evt_8Z9Q2",
    title: "GA4 re‑authorized",
    outcome: "success",
    occurredAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 90m ago
    summary: "Access to Google Analytics 4 was re‑authorized. Future syncs will resume on schedule.",
    actor: { name: "Priya" },
    source: "GA4",
    property: "Wranker Prod",
    before: { "Auth state": "Revoked", "Scopes": "analytics.readonly" },
    after: { "Auth state": "OK", "Scopes": "analytics.readonly" },
    logUrl: "https://example.com/audit/log/evt_8Z9Q2",
    settingsHref: "#/sources/ga4",
    retry: {
      label: "Retry last sync",
      onClick: async () => {
        await new Promise((r) => setTimeout(r, 700));
      },
    },
    reauth: {
      label: "Re‑authorize",
      onClick: async () => {
        await new Promise((r) => setTimeout(r, 900));
      },
      disabled: true, // already re‑authed in this demo
    },
  };

  return (
<>
      <ActivityDetailsDrawer
        open={open}
        onClose={() => setOpen(false)}
        event={demoEvent}
        hasPrev={true}
        hasNext={true}
        onPrev={() => alert("Go to previous activity (wire this to your feed index).")}
        onNext={() => alert("Go to next activity (wire this to your feed index).")}
      />
</>
  );
}
