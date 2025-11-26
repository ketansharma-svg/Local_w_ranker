"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Loader2,
  Info,
  ExternalLink,
  ArrowUpRight,
  RefreshCw,
  Activity,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Global tokens + Inter / Inter Fallback
   Remove <GlobalTokens/> if your app already provides these CSS variables.
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
* { font-family: Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Helvetica Neue", sans-serif; }
`}</style>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────────── */
type Severity = "success" | "warning" | "error";
type Blocker = { id: string; label: string; severity: "warning" | "error"; href?: string; onClick?: () => void };

type ModulesItem = { key: string; label: string; points: number; inPlan?: boolean };

type HealthBreakdown = {
  connectors: {
    gsc: number; // +20 max
    ga4: number; // +10 max
    crawl: number; // +10 max
  };
  modules: ModulesItem[]; // sum up to +30
  errorPosture: { critical: number; warning: number; points: number }; // +20 − (5×critical) − (2×warning)
  freshness: { window: "24h" | "72h" | "stale"; points: number }; // +10 / +5 / 0
  total: number; // 0..100 (cap at 100)
};

export type HealthDetailsDrawerProps = {
  open: boolean;
  onClose: () => void;

  score: number; // 0..100
  lastCheckAt?: string; // ISO for "Last check"
  breakdown: HealthBreakdown;
  topBlockers?: Blocker[];

  canRecalculate?: boolean;
  onRecalculate?: () => Promise<{ score: number; breakdown?: HealthBreakdown; topBlockers?: Blocker[] }>;

  learnMoreHref?: string; // help URL
};

/* ──────────────────────────────────────────────────────────────────────────
   Helpers (labels, chips, formatting)
   ────────────────────────────────────────────────────────────────────────── */
const labelForScore = (n: number) =>
  n >= 80 ? ("Healthy" as const) : n >= 50 ? ("Needs attention" as const) : ("Critical" as const);

const statusChipClassFromScore = (n: number) => {
  const base = "inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium";
  if (n >= 80) return `${base} text-[var(--success)] bg-[var(--success-bg)]`;
  if (n >= 50) return `${base} text-[var(--warning)] bg-[var(--warning-bg)]`;
  return `${base} text-[var(--critical)] bg-[var(--critical-bg)]`;
};

const outcomeChip = (sev: Severity) =>
  `inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs font-medium ${
    sev === "success"
      ? "text-[var(--success)] bg-[var(--success-bg)]"
      : sev === "warning"
      ? "text-[var(--warning)] bg-[var(--warning-bg)]"
      : "text-[var(--critical)] bg-[var(--critical-bg)]"
  }`;

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

const deltaText = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/* ──────────────────────────────────────────────────────────────────────────
   Reusable UI atoms (modular, modern)
   ────────────────────────────────────────────────────────────────────────── */
function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`cursor-pointer h-10 px-4 rounded-[var(--radius)] text-sm font-medium text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 ${className}`}
    />
  );
}
function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`cursor-pointer h-10 px-3 rounded-[var(--radius)] border text-sm text-[var(--text)] hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 ${className}`}
      style={{ borderColor: "var(--border)" }}
    />
  );
}
function BrandIcon({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--brand)] inline-flex items-center">{children}</span>;
}

/** Toggle (latest, modular) */
function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  const toggleId = id || `toggle-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center gap-3">
      <button
        id={toggleId}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]
          ${checked ? "bg-[var(--brand)]" : "bg-[var(--border-subtle)]"}
          ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </button>
      <label htmlFor={toggleId} className="select-none text-sm text-[var(--text)] cursor-pointer">
        {label}
      </label>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   A11y focus trap (Esc + outside click)
   ────────────────────────────────────────────────────────────────────────── */
function useModalA11y(open: boolean, onClose: () => void, containerRef: React.RefObject<HTMLDivElement | null>) {
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
        if (!isShift && active === last) { e.preventDefault(); first.focus(); }
        if (isShift && active === first) { e.preventDefault(); last.focus(); }
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
      setTimeout(() => {
        const el = containerRef.current?.querySelector<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
        el?.focus();
      }, 0);
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown, true);
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === "function") {
        lastFocusedRef.current.focus();
      }
    };
  }, [open, onClose, containerRef]);
}

/* ──────────────────────────────────────────────────────────────────────────
   Health Details Drawer (matches Connection Drawer shell & styling)
   ────────────────────────────────────────────────────────────────────────── */
export function HealthDetailsDrawer({
  open,
  onClose,
  score,
  lastCheckAt,
  breakdown,
  topBlockers = [],
  canRecalculate = true,
  onRecalculate,
  learnMoreHref,
}: HealthDetailsDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalA11y(open, onClose, containerRef);

  const [busy, setBusy] = useState(false);
  const [localScore, setLocalScore] = useState(score);
  const [localBreakdown, setLocalBreakdown] = useState<HealthBreakdown>(breakdown);
  const [localBlockers, setLocalBlockers] = useState<Blocker[]>(topBlockers);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalScore(score);
      setLocalBreakdown(breakdown);
      setLocalBlockers(topBlockers);
      setBusy(false);
    }
  }, [open, score, breakdown, topBlockers]);

  // Simple auto-refresh demo (local only)
  useEffect(() => {
    if (!open || !autoRefresh || !onRecalculate) return;
    const id = setInterval(async () => {
      setBusy(true);
      try {
        const res = await onRecalculate();
        setLocalScore(res.score);
        if (res.breakdown) setLocalBreakdown(res.breakdown);
        if (res.topBlockers) setLocalBlockers(res.topBlockers);
      } finally {
        setBusy(false);
      }
    }, 8000);
    return () => clearInterval(id);
  }, [open, autoRefresh, onRecalculate]);

  const titleId = useMemo(() => "health-details-title", []);
  if (!open) return null;

  const label = labelForScore(localScore);
  const paletteClass = statusChipClassFromScore(localScore);

  const onClickRecalculate = async () => {
    if (!canRecalculate || !onRecalculate || busy) return;
    try {
      setBusy(true);
      const res = await onRecalculate();
      setLocalScore(res.score);
      if (res.breakdown) setLocalBreakdown(res.breakdown);
      if (res.topBlockers) setLocalBlockers(res.topBlockers);
    } finally {
      setBusy(false);
    }
  };

  const meterColor =
    localScore >= 80 ? "var(--success)" : localScore >= 50 ? "var(--warning)" : "var(--critical)";

  return (
    <div className="fixed inset-0 z-[40]" aria-labelledby={titleId} role="dialog" aria-modal="true">
      {/* Solid background (no transparency) */}
      {/* <div className="absolute inset-0 bg-[var(--bg-panel)]" aria-hidden /> */}

      {/* Sheet */}
      <div
        ref={containerRef}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[420px] bg-[var(--bg-panel)] border-l shadow-lg"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0 flex items-center gap-2">
            <BrandIcon><Activity className="h-5 w-5" aria-hidden /></BrandIcon>
            <div className="min-w-0">
              <h2 id={titleId} className="text-[16px] font-semibold text-[var(--text-strong)] truncate">
                Health details
              </h2>
              <div className="text-xs text-[var(--text-muted)]">Last check: {fmtRelative(lastCheckAt)}</div>
            </div>
            <span className={`${paletteClass} ml-2`} aria-label={`Project health: ${label}, ${localScore} out of 100`}>
              {label}
            </span>
          </div>

          {/* <button
            className="cursor-pointer h-9 w-9 rounded-[var(--radius)] flex items-center justify-center hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X className="h-5 w-5 text-[var(--text)]" />
          </button> */}
        </div>

        {/* Body */}
        <div className="h-[calc(100%-56px-80px)] overflow-auto px-4 py-4 space-y-5">
          {/* Score + meter + explainer */}
          <section>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-semibold text-[var(--text-strong)]">{localScore}</div>

              {/* mini meter */}
              <div
                className="ml-1 flex items-center gap-2"
                aria-label="Health meter"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={localScore}
                aria-valuetext={label}
              >
                <div className="w-40 h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, localScore))}%`, background: meterColor }}
                  />
                </div>
                <div className="text-xs text-[var(--text-muted)]">{localScore}%</div>
              </div>

              {/* Actions (brand icons) */}
              <div className="ml-auto flex items-center gap-2">
                <SecondaryButton
                  onClick={onClickRecalculate}
                  disabled={!canRecalculate || !onRecalculate || busy}
                  title={!canRecalculate ? "You don't have permission to recalculate" : "Recalculate now"}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4 text-[var(--brand)]" aria-hidden />}
                  Recalculate
                </SecondaryButton>
              </div>
            </div>

            <p className="mt-2 text-sm text-[var(--text)] flex items-start gap-2">
              <BrandIcon><Info className="h-4 w-4 mt-[2px]" aria-hidden /></BrandIcon>
              Hygiene score reflects connectors, enabled modules, error posture, and sync freshness. It is not a performance metric.
            </p>
          </section>

          {/* Preferences (modern toggles; local-only UI) */}
          <section className="rounded-[var(--radius)] border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--text-strong)] flex items-center gap-2">
                <BrandIcon><Activity className="h-4 w-4" aria-hidden /></BrandIcon>
                Preferences
              </div>
              <div className="flex items-center gap-4">
                <ToggleSwitch checked={autoRefresh} onChange={setAutoRefresh} label="Auto refresh" />
              </div>
            </div>
          </section>

          {/* Breakdown */}
          <section className="rounded-[var(--radius)] border" style={{ borderColor: "var(--border)" }}>
            <header className="px-3 py-2 border-b text-sm font-medium text-[var(--text-strong)] flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
              <BrandIcon><Activity className="h-4 w-4" aria-hidden /></BrandIcon>
              Breakdown
            </header>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {/* Connectors */}
              <div className="px-3 py-2 text-sm">
                <div className="font-medium text-[var(--text-strong)] mb-1">Connectors (max +40)</div>
                <ul className="space-y-1">
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--text)]">GSC</span>
                    <span className="text-[var(--text-strong)]">{deltaText(localBreakdown.connectors.gsc)}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--text)]">GA4</span>
                    <span className="text-[var(--text-strong)]">{deltaText(localBreakdown.connectors.ga4)}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-[var(--text)]">Crawl</span>
                    <span className="text-[var(--text-strong)]">{deltaText(localBreakdown.connectors.crawl)}</span>
                  </li>
                </ul>
              </div>

              {/* Modules */}
              <div className="px-3 py-2 text-sm">
                <div className="font-medium text-[var(--text-strong)] mb-1">Modules (max +30)</div>
                <ul className="space-y-1">
                  {localBreakdown.modules.map((m) => (
                    <li key={m.key} className="flex items-center justify-between">
                      <span className="text-[var(--text)]">
                        {m.label}
                        {!m.inPlan ? <span className="text-[var(--text-muted)]"> • not in plan</span> : null}
                      </span>
                      <span className="text-[var(--text-strong)]">{deltaText(m.points)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Error posture */}
              <div className="px-3 py-2 text-sm">
                <div className="font-medium text-[var(--text-strong)] mb-1">Error posture (max +20)</div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text)]">
                    +20 baseline − (5 × critical: {localBreakdown.errorPosture.critical}) − (2 × warning: {localBreakdown.errorPosture.warning})
                  </span>
                  <span className="text-[var(--text-strong)]">{deltaText(localBreakdown.errorPosture.points)}</span>
                </div>
              </div>

              {/* Freshness */}
              <div className="px-3 py-2 text-sm">
                <div className="font-medium text-[var(--text-strong)] mb-1">Freshness (max +10)</div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text)]">
                    {localBreakdown.freshness.window === "24h"
                      ? "All sources synced ≤ 24h"
                      : localBreakdown.freshness.window === "72h"
                      ? "All sources synced ≤ 72h"
                      : "Stale syncs"}
                  </span>
                  <span className="text-[var(--text-strong)]">{deltaText(localBreakdown.freshness.points)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="px-3 py-2 text-sm bg-[var(--bg-app)]">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-[var(--text-strong)]">Total</span>
                  <span className="text-[var(--text-strong)]">{Math.min(100, Math.max(0, localBreakdown.total))}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Top blockers */}
          <section className="rounded-[var(--radius)] border" style={{ borderColor: "var(--border)" }}>
            <header className="px-3 py-2 border-b text-sm font-medium text-[var(--text-strong)] flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
              <BrandIcon><Activity className="h-4 w-4" aria-hidden /></BrandIcon>
              Top blockers
            </header>
            {localBlockers.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[var(--text-muted)]">No blockers detected.</div>
            ) : (
              <ul className="px-3 py-2 space-y-2">
                {localBlockers.slice(0, 3).map((b) => (
                  <li key={b.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className={outcomeChip(b.severity === "warning" ? "warning" : "error")}>
                        {b.severity === "warning" ? "Warning" : "Error"}
                      </span>
                      <button
                        onClick={() => (b.onClick ? b.onClick() : b.href ? window.open(b.href, "_blank") : undefined)}
                        disabled={busy}
                        className="cursor-pointer truncate text-sm text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
                        aria-disabled={busy ? "true" : "false"}
                        title={b.href ? "Open" : "Fix"}
                      >
                        {b.label}
                      </button>
                    </div>
                    {b.href ? (
                      <a
                        className="cursor-pointer ml-2 inline-flex items-center gap-1 text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
                        href={b.href}
                        target="_blank"
                        rel="noreferrer"
                        title="Open"
                      >
                        Open <ArrowUpRight className="h-3.5 w-3.5 text-[var(--brand)]" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Inline recalculating note */}
          {busy && (
            <div className="rounded-[var(--radius)] border px-3 py-2 text-sm flex items-start gap-2" style={{ borderColor: "var(--border)" }}>
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)] mt-[2px]" aria-hidden />
              <div className="text-[var(--text)]">Recalculating…</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-[80px] px-4 py-3 border-t flex items-center gap-2 justify-end bg-[var(--bg-panel)]" style={{ borderColor: "var(--border)" }}>
          {learnMoreHref && (
            <a
              href={learnMoreHref}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer mr-auto inline-flex items-center gap-1 text-sm text-[var(--text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded"
              title="Learn how we calculate health"
            >
              Learn how we calculate health
              <ExternalLink className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
            </a>
          )}
          <SecondaryButton
            onClick={onClickRecalculate}
            disabled={!canRecalculate || !onRecalculate || busy}
            title={!canRecalculate ? "You don't have permission to recalculate" : "Recalculate now"}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4 text-[var(--brand)]" aria-hidden />}
            Recalculate
          </SecondaryButton>
        </div>

        {/* Live region for SR */}
        <p className="sr-only" aria-live="polite">
          {busy ? "Recalculating health…" : ""}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Default export: Demo wrapper (visible Open button)
   ────────────────────────────────────────────────────────────────────────── */
export default function HealthDetailsDrawerDemo() {
  const [open, setOpen] = useState(true);

  // Mock breakdown for demo
  const breakdown: HealthBreakdown = {
    connectors: { gsc: +20, ga4: +0, crawl: +10 },
    modules: [
      { key: "crawl", label: "Technical / Crawl", points: +10, inPlan: true },
      { key: "rank", label: "Rank Tracker", points: +10, inPlan: true },
      { key: "onpage", label: "On‑page", points: +5, inPlan: true },
      { key: "content", label: "Content", points: +5, inPlan: true },
    ],
    errorPosture: { critical: 0, warning: 1, points: 20 - 2 * 1 },
    freshness: { window: "24h", points: +10 },
    total: 20 + 0 + 10 + (10 + 10 + 5 + 5) + (20 - 2) + 10, // 78
  };

  const blockers: Blocker[] = [
    { id: "b1", label: "GA4 re‑auth required", severity: "warning", href: "#/sources/ga4" },
    { id: "b2", label: "Crawl frequency is disabled", severity: "error", href: "#/modules/crawl" },
  ];

  const lastCheckAt = new Date(Date.now() - 1000 * 60 * 55).toISOString();

  const onRecalculate = async () => {
    await new Promise((r) => setTimeout(r, 800));
    const improved = { ...breakdown, connectors: { ...breakdown.connectors, ga4: +10 }, total: breakdown.total + 10 };
    return { score: Math.min(100, improved.total), breakdown: improved, topBlockers: blockers.slice(0, 1) };
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text)]">
      <GlobalTokens />

      <HealthDetailsDrawer
        open={open}
        onClose={() => setOpen(false)}
        score={78}
        lastCheckAt={lastCheckAt}
        breakdown={breakdown}
        topBlockers={blockers}
        canRecalculate={true}
        onRecalculate={onRecalculate}
        learnMoreHref="https://example.com/help/health-score"
      />
    </div>
  );
}
