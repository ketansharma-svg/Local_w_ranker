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
  ExternalLink,
  Clock,
  ChevronRight,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Minimal tokens so this page looks correct even without global tokens loaded.
   Remove if you already inject these globally.
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
* { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Helvetica Neue", sans-serif; }
`}</style>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────────── */
export type SourceKey = "gsc" | "ga4" | "crawl";
export type SourceStatus = "ok" | "warning" | "error" | "idle";

export type RecentEvent = {
  id: string;
  title: string; // e.g., "Re-authorized"
  status: "success" | "warning" | "error";
  at: string; // ISO
};

export type LastJob = {
  outcome: "success" | "warning" | "error";
  at: string; // ISO
  code?: string;
  message?: string;
  logUrl?: string;
};

export type ConnectionDrawerProps = {
  open: boolean;
  onClose: () => void;

  service: SourceKey;            // gsc | ga4 | crawl
  status: SourceStatus;          // ok | warning | error | idle

  site?: string;                 // e.g., wranker.com
  propertyName?: string;         // e.g., "Wranker Prod"
  accountId?: string;
  propertyId?: string;
  scopes?: string[];

  lastSyncAt?: string;
  lastSyncDurationMs?: number;
  nextScheduledAt?: string;
  lastJob?: LastJob;
  events?: RecentEvent[];

  viewSettingsHref?: string;

  // Actions (all optional; safe no-ops if omitted)
  primaryAction?: {
    label?: string;              // defaults by status
    onClick?: () => Promise<void> | void;
    disabled?: boolean;
    disabledReason?: string;
  };
  retryAction?: {
    label?: string;              // "Retry sync"
    onClick?: () => Promise<void> | void;
    disabled?: boolean;
    disabledReason?: string;
  };

  onStatusChange?: (next: SourceStatus) => void;
  autoCloseOnSuccess?: boolean;  // default true
};

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */
const iconForService = (key: SourceKey) => {
  switch (key) {
    case "gsc":
      return <Search className="h-5 w-5" aria-hidden />;
    case "ga4":
      return <BarChart3 className="h-5 w-5" aria-hidden />;
    case "crawl":
      return <Wrench className="h-5 w-5" aria-hidden />;
  }
};

const displayNameForService = (key: SourceKey) => {
  switch (key) {
    case "gsc":
      return "Google Search Console";
    case "ga4":
      return "Google Analytics 4";
    case "crawl":
      return "Site Crawl";
  }
};

const statusChipClass = (status: SourceStatus) => {
  const base =
    "inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium";
  switch (status) {
    case "ok":
      return `${base} text-[var(--success)] bg-[var(--success-bg)]`;
    case "warning":
      return `${base} text-[var(--warning)] bg-[var(--warning-bg)]`;
    case "error":
      return `${base} text-[var(--critical)] bg-[var(--critical-bg)]`;
    default:
      return `${base} text-[var(--text)] bg-[var(--bg-app)]`;
  }
};
const statusChipText = (status: SourceStatus) =>
  status === "ok" ? "OK" : status === "warning" ? "Warning" : status === "error" ? "Error" : "Idle";

const outcomeChipClass = (o: "success" | "warning" | "error") =>
  o === "success"
    ? "text-[var(--success)] bg-[var(--success-bg)]"
    : o === "warning"
    ? "text-[var(--warning)] bg-[var(--warning-bg)]"
    : "text-[var(--critical)] bg-[var(--critical-bg)]";

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
  } catch {
    return "—";
  }
};
const fmtDuration = (ms?: number) => {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10; // 0.1s precision
  return `${s}s`;
};

/* Focus trap + Esc & outside click */
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
   Connection Drawer (Source Status)
   ────────────────────────────────────────────────────────────────────────── */
export function ConnectionDrawer({
  open,
  onClose,

  service,
  status,

  site,
  propertyName,
  accountId,
  propertyId,
  scopes = [],

  lastSyncAt,
  lastSyncDurationMs,
  nextScheduledAt,
  lastJob,
  events = [],

  viewSettingsHref,

  primaryAction,
  retryAction,

  onStatusChange,
  autoCloseOnSuccess = true,
}: ConnectionDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalA11y(open, onClose, containerRef);

  // Safe defaults for actions (prevent runtime errors)
  const primaryLabelDefault =
    status === "warning" ? "Re‑authorize" : status === "error" ? "Fix connection" : "Connect";
  const primaryActionSafe = {
    label: primaryAction?.label ?? (status === "ok" ? undefined : primaryLabelDefault),
    onClick:
      primaryAction?.onClick ??
      (async () => {
        await new Promise((r) => setTimeout(r, 400));
        onStatusChange?.("ok");
        if (autoCloseOnSuccess) setTimeout(onClose, 600);
      }),
    disabled: primaryAction?.disabled ?? false,
    disabledReason: primaryAction?.disabledReason,
  };
  const retryActionSafe = {
    label: retryAction?.label ?? "Retry sync",
    onClick:
      retryAction?.onClick ??
      (async () => {
        await new Promise((r) => setTimeout(r, 400));
      }),
    disabled: retryAction?.disabled ?? (status !== "ok" && status !== "warning"),
    disabledReason: retryAction?.disabledReason ?? (status === "error" ? "Connect first" : undefined),
  };

  const [busyPrimary, setBusyPrimary] = useState(false);
  const [busyRetry, setBusyRetry] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    // reset transient state when drawer opens/changes
    if (open) {
      setBusyPrimary(false);
      setBusyRetry(false);
      setInlineError(null);
    }
  }, [open, service, status]);

  const onClickPrimary = async () => {
    // if (!primaryActionSafe.label || primaryActionSafe.disabled || busyPrimary) return;
    // try {
    //   setInlineError(null);
    //   setBusyPrimary(true);
    //   await primaryActionSafe.onClick();
    // } catch (e: any) {
    //   setInlineError(e?.message || "Something went wrong. Please try again.");
    //   onStatusChange?.("error");
    // } finally {
    //   setBusyPrimary(false);
    // }
    alert("Re-authorized")
  };

  const onClickRetry = async () => {
    if (retryActionSafe.disabled || busyRetry) return;
    try {
      setInlineError(null);
      setBusyRetry(true);
      await retryActionSafe.onClick();
    } catch (e: any) {
      setInlineError(e?.message || "Retry failed. Please try again.");
    } finally {
      setBusyRetry(false);
    }
  };

  const titleId = useMemo(() => `conn-title-${service}`, [service]);

  if (!open) return null;

  const headerName = displayNameForService(service);
  const headerIcon = iconForService(service);

  return (
    <div
      className="fixed inset-0 z-[80]"
      aria-labelledby={titleId}
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Sheet */}
      <div
        ref={containerRef}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[420px] bg-[var(--bg-panel)] border-l shadow-lg"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 text-[var(--brand)]">{headerIcon}</div>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-[16px] font-semibold text-[var(--text-strong)] truncate"
              >
                {headerName}
              </h2>
              {(site || propertyName) && (
                <div className="text-xs text-[var(--text-muted)] truncate">
                  {site ? `Property: ${site}` : null}
                  {site && propertyName ? " • " : ""}
                  {propertyName ? `GA4: “${propertyName}”` : null}
                </div>
              )}
            </div>
            <span
              className={`${statusChipClass(status)} ml-2`}
              aria-label={`${headerName} status: ${statusChipText(status)}`}
            >
              {statusChipText(status)}
            </span>
          </div>

          <button
            className="h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-56px-80px)] overflow-auto px-4 py-4 space-y-4">
          {/* Inline callout if error */}
          {status === "error" && (
            <div
              className="rounded-[var(--radius)] border px-3 py-2 text-sm flex items-start gap-2"
              style={{ background: "var(--critical-bg)", color: "var(--critical)", borderColor: "var(--border)" }}
              role="alert"
            >
              <AlertTriangle className="h-4 w-4 mt-[2px]" aria-hidden />
              <div>
                Connection needs attention. {lastJob?.message ? lastJob.message : "Please review and fix."}
              </div>
            </div>
          )}

          {/* Connection details */}
          <section className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Connection details</div>
            <dl className="mt-2 grid grid-cols-1 gap-y-2 text-sm">
              {accountId && (
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--text-muted)]">Account ID</dt>
                  <dd className="text-[var(--text-strong)]">{accountId}</dd>
                </div>
              )}
              {propertyId && (
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--text-muted)]">Property ID</dt>
                  <dd className="text-[var(--text-strong)]">{propertyId}</dd>
                </div>
              )}
              {scopes && scopes.length > 0 && (
                <div>
                  <dt className="text-[var(--text-muted)]">Scopes</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {scopes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center h-6 px-2 rounded-[var(--radius)] border text-xs"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Sync times */}
          <section className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-medium text-[var(--text-strong)]">Sync & schedule</div>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
                <span className="text-[var(--text)]">
                  Last sync: <span className="text-[var(--text-strong)]">{fmtRelative(lastSyncAt)}</span>
                  {typeof lastSyncDurationMs === "number" ? (
                    <span className="text-[var(--text-muted)]"> • {fmtDuration(lastSyncDurationMs)}</span>
                  ) : null}
                </span>
              </li>
              {nextScheduledAt && (
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
                  <span className="text-[var(--text)]">
                    Next scheduled:{" "}
                    <span className="text-[var(--text-strong)]">{fmtRelative(nextScheduledAt)}</span>
                  </span>
                </li>
              )}
            </ul>
          </section>

          {/* Last job result */}
          <section className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-strong)]">Last job</div>
              {lastJob?.outcome && (
                <span
                  className={`inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium ${outcomeChipClass(
                    lastJob.outcome
                  )}`}
                >
                  {lastJob.outcome === "success"
                    ? "Success"
                    : lastJob.outcome === "warning"
                    ? "Warning"
                    : "Error"}
                </span>
              )}
            </div>
            <div className="mt-2 text-sm text-[var(--text)]">
              {lastJob ? (
                <>
                  {lastJob.outcome === "success" ? "Success" : "Result"} at{" "}
                  <span className="text-[var(--text-strong)]">{fmtRelative(lastJob.at)}</span>
                  {lastJob.code ? ` • ${lastJob.code}` : ""}
                  {lastJob.message ? ` — ${lastJob.message}` : ""}
                  {lastJob.logUrl && (
                    <a
                      className="ml-2 inline-flex items-center gap-1 text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
                      href={lastJob.logUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View log <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </>
              ) : (
                "No job history yet."
              )}
            </div>
          </section>

          {/* Recent events (optional) */}
          {events.length > 0 && (
            <section className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-medium text-[var(--text-strong)]">Recent events</div>
              <ul className="mt-2 space-y-2">
                {events.slice(0, 3).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start gap-2 rounded-[var(--radius)] p-2 hover:bg-[var(--bg-app)] focus-within:bg-[var(--bg-app)]"
                  >
                    <ChevronRight className="h-4 w-4 mt-1 text-[var(--text-muted)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-[var(--text-strong)] truncate">{ev.title}</div>
                        <span
                          className={`inline-flex items-center h-5 px-2 rounded-[var(--radius)] text-xs ${outcomeChipClass(
                            ev.status
                          )}`}
                        >
                          {ev.status === "success" ? "Success" : ev.status === "warning" ? "Warning" : "Error"}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]"> {fmtRelative(ev.at)} </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Advanced / settings link */}
          {viewSettingsHref && (
            <a
              href={viewSettingsHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
            >
              View settings
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}

          {/* Inline error (action failure) */}
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

        {/* Footer */}
        <div
          className="h-[80px] px-4 py-3 border-t flex items-center gap-2 justify-end bg-[var(--bg-panel)]"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Secondary: Retry */}
          <button
            type="button"
            onClick={onClickRetry}
            disabled={retryActionSafe.disabled || busyRetry}
            aria-disabled={retryActionSafe.disabled || busyRetry}
            title={retryActionSafe.disabled ? retryActionSafe.disabledReason : undefined}
            className="h-10 px-3 rounded-[var(--radius)] border text-sm text-[var(--text)] hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            {busyRetry && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {retryActionSafe.label}
          </button>

          {/* Primary: Connect / Re‑auth / Fix (hidden by default when OK unless label provided) */}
          {primaryActionSafe.label && (
            <button
              // onClick={onClose}
              // disabled={primaryActionSafe.disabled || busyPrimary}
              // aria-disabled={primaryActionSafe.disabled || busyPrimary}
              // title={primaryActionSafe.disabled ? primaryActionSafe.disabledReason : undefined}
              className="h-10 px-4 rounded-[var(--radius)] text-sm font-medium text-white bg-[var(--brand)] hover:bg-[var(--brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {/* {busyPrimary && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} */}
              {primaryActionSafe.label}
            </button>
          )}
        </div>

        {/* Live region for SR announcements */}
        <p className="sr-only" aria-live="polite">
          {busyPrimary ? "Working…" : busyRetry ? "Retrying…" : ""}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Default export: demo page with a visible button to open the drawer
   ────────────────────────────────────────────────────────────────────────── */
export default function ConnectionDrawerDemo() {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState<SourceStatus>("warning"); // start with Warning to show Re‑authorize

  // Mock data for the demo
  const now = Date.now();
  const events: RecentEvent[] = [
    { id: "1", title: "Re-authorized", status: "success", at: new Date(now - 1000 * 60 * 50).toISOString() },
    { id: "2", title: "Sync throttled", status: "warning", at: new Date(now - 1000 * 60 * 90).toISOString() },
    { id: "3", title: "Token expiring", status: "warning", at: new Date(now - 1000 * 60 * 120).toISOString() },
  ];
  const lastJob: LastJob = {
    outcome: status === "error" ? "error" : status === "warning" ? "warning" : "success",
    at: new Date(now - 1000 * 60 * 30).toISOString(),
    code: status === "error" ? "AUTH_REVOKED" : undefined,
    message: status === "error" ? "Google revoked access. Re‑authorize to resume." : "Completed with minor backoff.",
    logUrl: "https://example.com/log/abc123",
  };

  return (
     <ConnectionDrawer
        open={open}
        onClose={() => setOpen(false)}
        service="gsc"
        status={status}
        site="wranker.com"
        propertyName="Wranker Prod"
        accountId="acct_123"
        propertyId="G-123456"
        scopes={["webmasters.readonly", "searchconsole.site.readonly"]}
        lastSyncAt={new Date(now - 1000 * 60 * 120).toISOString()}
        lastSyncDurationMs={1450}
        nextScheduledAt={new Date(now + 1000 * 60 * 60 * 6).toISOString()}
        lastJob={lastJob}
        events={events}
        viewSettingsHref="https://app.example.com/projects/123/sources#gsc"
        onStatusChange={setStatus}
        autoCloseOnSuccess={true}
      />
  );
}
