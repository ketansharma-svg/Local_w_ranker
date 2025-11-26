"use client";

import React, { useMemo, useState } from "react";
import {
  Brain,
  Settings2,
  AlertTriangle,
  RotateCcw,
  Handshake,
  Link2,
  ShieldAlert,
  TriangleAlert,
  FileWarning,
  Info,
  ArrowRight,
  Plus,
  Download,
} from "lucide-react";

/* -----------------------------------------------------------------------------
   Backlink Audit → Tab 3: New & Lost
   Section: Smart Suggestions (AI + Rule-Based)

   Update in this revision (per request):
   - Section title moved to the LEFT of the header.
   - Export button moved to the RIGHT of the header.
   - Reduced spacing between suggestion cards (mobile rail + desktop grid) to minimal.
   - No other changes.
----------------------------------------------------------------------------- */

/* ───────────────────────── Tokens (theme-aligned) ───────────────────────── */
const TK = {
  brand: "#008CCD",
  brandPastel: "rgba(0,140,205,0.10)",

  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  card: "#FFFFFF",

  // severity tints (backgrounds / subtle state)
  sev: {
    critical: { tint: "bg-rose-50", ring: "ring-rose-100", border: "border-rose-200" },
    warning: { tint: "bg-amber-50", ring: "ring-amber-100", border: "border-amber-200" },
    info: { tint: "bg-sky-50", ring: "ring-sky-100", border: "border-sky-200" },
  },
} as const;

const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial';

/* ───────────────────────── Types ───────────────────────── */
type SuggestionOrigin = "ai" | "rule";
type Severity = "critical" | "warning" | "info";

export type NLSuggestion = {
  id: string;
  origin: SuggestionOrigin; // 'ai' or 'rule'
  severity: Severity;
  icon?: React.ReactNode;

  title: string;
  reason?: string;
  meta?: Array<{ label: string }>;

  primaryCta: {
    label: string;
    onClick?: () => void;
    intent?: "lost" | "new" | "anchor" | "disavow" | "task";
    payload?: Record<string, any>;
  };
  secondaryCta?: {
    label: string;
    onClick?: () => void;
    intent?: "lost" | "new" | "anchor" | "disavow" | "task";
    payload?: Record<string, any>;
  };

  explainWhy?: string; // tooltip text
};

export type NewLostSmartSuggestionsProps = {
  suggestions?: NLSuggestion[];
  defaultFilter?: "all" | "ai" | "rule";
  onViewAll?: () => void;
  onExport?: () => void; // optional external export
  onNavigate?: {
    toLost?: (payload?: any) => void;
    toNew?: (payload?: any) => void;
    toAnchorAudit?: (payload?: any) => void;
    toDisavow?: (payload?: any) => void;
    openTask?: (payload?: any) => void;
  };
  className?: string;
};

/* ───────────────────────── Helpers ───────────────────────── */
function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}
function sevTheme(sev: Severity) {
  return TK.sev[sev];
}

/* ───────────────────────── Small UI bits ───────────────────────── */
function SourcePill({ origin }: { origin: SuggestionOrigin }) {
  const Icon = origin === "ai" ? Brain : Settings2;
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        origin === "ai" ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-700"
      )}
      title={origin === "ai" ? "Suggested by AI" : "Triggered by rule"}
    >
      <Icon className="mr-1 h-3 w-3" />
      {origin === "ai" ? "AI" : "Rule"}
    </span>
  );
}

function BrandGlyph({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color: TK.brand }}>{children}</span>;
}

function CardGlyph({ severity, override }: { severity: Severity; override?: React.ReactNode }) {
  if (override) return <BrandGlyph>{override}</BrandGlyph>;
  const M = severity === "critical" ? ShieldAlert : severity === "warning" ? AlertTriangle : Info;
  return (
    <BrandGlyph>
      <M className="h-5 w-5" />
    </BrandGlyph>
  );
}

/* Info popover (title-level) */
function InfoPopover({
  content,
  ariaLabel,
}: {
  content: React.ReactNode;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel ?? "Info"}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center rounded hover:bg-gray-50 p-1 cursor-pointer"
        title="About this section"
      >
        <Info className="h-4 w-4" style={{ color: TK.brand }} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="absolute right-0 z-20 mt-1 w-[280px] rounded-md border bg-white p-3 text-xs shadow"
          style={{ borderColor: TK.border }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

/* Toggle (AI | Rules | All) */
function Segmented({
  value,
  onChange,
}: {
  value: "ai" | "rule" | "all";
  onChange: (v: "ai" | "rule" | "all") => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Suggestion source filter"
      className="inline-flex rounded-md border bg-white p-0.5"
      style={{ borderColor: TK.border }}
    >
      {(["ai", "rule", "all"] as const).map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt)}
            className={classNames(
              "px-3 py-1.5 text-sm font-medium rounded cursor-pointer transition",
              active ? "text-[color:var(--brand)]" : "text-gray-700 hover:bg-gray-50"
            )}
            style={{
              ["--brand" as any]: TK.brand,
              background: active ? TK.brandPastel : "#fff",
              border: `1px solid ${active ? TK.brand : "transparent"}`,
            }}
          >
            {opt === "ai" ? "AI Only" : opt === "rule" ? "Rules Only" : "All"}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Card ───────────────────────── */
function SuggestionCard({
  s,
  onNavigate,
}: {
  s: NLSuggestion;
  onNavigate?: NewLostSmartSuggestionsProps["onNavigate"];
}) {
  const th = sevTheme(s.severity);

  const runIntent = (intent?: NLSuggestion["primaryCta"]["intent"], payload?: any) => {
    if (!intent) return;
    if (intent === "lost") onNavigate?.toLost?.(payload);
    if (intent === "new") onNavigate?.toNew?.(payload);
    if (intent === "anchor") onNavigate?.toAnchorAudit?.(payload);
    if (intent === "disavow") onNavigate?.toDisavow?.(payload);
    if (intent === "task") onNavigate?.openTask?.(payload);
  };

  return (
    <div
      className={classNames(
        "group relative h-full w-full shrink-0 snap-start rounded-xl border bg-white p-4 shadow-sm transition",
        th.border,
        "hover:shadow-md hover:ring",
        th.ring
      )}
      role="region"
      aria-label={s.title}
      title={s.explainWhy || "Generated using AI + backlink audit rules"}
    >
      {/* Accent rail */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ background: TK.brand }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardGlyph severity={s.severity} override={s.icon} />
          <h4 className="text-sm font-semibold text-gray-900">{s.title}</h4>
        </div>
        <SourcePill origin={s.origin} />
      </div>

      {/* Reason */}
      {s.reason && <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-gray-600">{s.reason}</p>}

      {/* Meta chips */}
      {!!s.meta?.length && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.meta!.map((m, idx) => (
            <span key={idx} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (s.primaryCta.onClick ? s.primaryCta.onClick() : runIntent(s.primaryCta.intent, s.primaryCta.payload))}
          className="inline-flex items-center rounded-full bg-[color:var(--brand)] px-3 py-1.5 text-sm font-medium text-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer"
          style={{ ["--brand" as any]: TK.brand }}
        >
          {s.primaryCta.label}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          {s.secondaryCta && (
            <button
              type="button"
              onClick={() =>
                s.secondaryCta?.onClick ? s.secondaryCta.onClick() : runIntent(s.secondaryCta?.intent, s.secondaryCta?.payload)
              }
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {s.secondaryCta.label}
              <Plus className="ml-1 h-4 w-4" />
            </button>
          )}

          <span
            className={classNames(
              "inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-semibold",
              s.severity === "critical"
                ? "bg-rose-100 text-rose-800"
                : s.severity === "warning"
                ? "bg-amber-100 text-amber-800"
                : "bg-sky-100 text-sky-800"
            )}
          >
            {s.severity === "critical" ? "High Priority" : s.severity === "warning" ? "Action Recommended" : "FYI"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Demo data ───────────────────────── */
const DEFAULT_SUGGESTIONS: NLSuggestion[] = [
  {
    id: "nl1",
    origin: "rule",
    severity: "critical",
    icon: <RotateCcw className="h-5 w-5" />,
    title: "Recover lost high‑authority backlink",
    reason: "WR Score −3.6 from loss of example.edu",
    primaryCta: { label: "View Lost Backlinks", intent: "lost", payload: { reason: "wr_drop", domain: "example.edu" } },
    secondaryCta: { label: "Create Recovery Task", intent: "task", payload: { type: "recovery", domain: "example.edu" } },
    meta: [{ label: "WR 92" }, { label: "dofollow" }],
    explainWhy: "Lost link from a very high WR domain; immediate recovery likely to restore WR points.",
  },
  {
    id: "nl2",
    origin: "rule",
    severity: "warning",
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Regain traffic from lost link",
    reason: "Lost link sent 120 visits last month",
    primaryCta: { label: "Create Recovery Task", intent: "task", payload: { type: "recovery", traffic: 120 } },
    secondaryCta: { label: "View Lost Backlinks", intent: "lost", payload: { traffic_gt: 50 } },
    meta: [{ label: "GA4: 120 sessions" }, { label: "last 30 days" }],
  },
  {
    id: "nl3",
    origin: "rule",
    severity: "info",
    icon: <Handshake className="h-5 w-5" />,
    title: "Follow up with new high‑authority domain",
    reason: "New domain WR 85: newsportal.com",
    primaryCta: { label: "View New Backlinks", intent: "new", payload: { min_wr: 80 } },
    secondaryCta: { label: "Create Outreach Task", intent: "task", payload: { type: "outreach", domain: "newsportal.com" } },
    meta: [{ label: "WR 85" }, { label: "publisher" }],
  },
  {
    id: "nl4",
    origin: "rule",
    severity: "critical",
    icon: <ShieldAlert className="h-5 w-5" />,
    title: "Remove toxic link from profile",
    reason: "High‑risk anchor from spamblog.net",
    primaryCta: { label: "Add to Disavow", intent: "disavow", payload: { domain: "spamblog.net" } },
    meta: [{ label: "Toxic anchor" }, { label: "WR < 20" }],
  },
  {
    id: "nl5",
    origin: "ai",
    severity: "warning",
    icon: <Link2 className="h-5 w-5" />,
    title: "Reduce exact‑match anchor overuse",
    reason: "43% of new links use exact match",
    primaryCta: { label: "View Anchor Audit", intent: "anchor", payload: { anchor_type: "exact" } },
    secondaryCta: { label: "Create Optimization Task", intent: "task", payload: { type: "anchor_opt" } },
    meta: [{ label: "EMD 43%" }, { label: "Last 30d" }],
  },
];

/* ───────────────────────── Main component ───────────────────────── */
export default function NewLostSmartSuggestions({
  suggestions = DEFAULT_SUGGESTIONS,
  defaultFilter = "all",
  onViewAll,
  onExport,
  onNavigate,
  className,
}: NewLostSmartSuggestionsProps) {
  const [filter, setFilter] = useState<"all" | "ai" | "rule">(defaultFilter);

  const filtered = useMemo(() => {
    if (filter === "all") return suggestions;
    return suggestions.filter((s) => s.origin === filter);
  }, [suggestions, filter]);

  const fallbackExport = () => {
    // Minimal CSV export of visible suggestions
    const header = ["id", "origin", "severity", "title"];
    const lines = filtered.map((s) => [s.id, s.origin, s.severity, s.title].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "smart_suggestions.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section
      className={classNames("rounded-2xl border bg-white shadow-sm", className)}
      style={{ borderColor: TK.border, background: TK.card, fontFamily: FONT_STACK }}
      aria-labelledby="nl-smart-suggestions-title"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: TK.border }}>
        {/* LEFT: Title + info */}
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-5 w-5" style={{ color: TK.brand }} />
          <h3 id="nl-smart-suggestions-title" className="text-base font-semibold" style={{ color: TK.text }}>
            Smart Suggestions
          </h3>
          <InfoPopover
            ariaLabel="Smart Suggestions info"
            content={
              <div className="space-y-2">
                <p style={{ color: TK.muted }}>
                  Suggestions combine AI patterns (anchors, velocity, toxicity) and rule triggers (WR drops, traffic loss, thresholds).
                </p>
                <p className="text-[11px]" style={{ color: TK.muted }}>
                  Use the filter to view AI-only, Rules-only, or All. Actions deep-link to the relevant views.
                </p>
              </div>
            }
          />
        </div>

        {/* RIGHT: Controls + Export (export at far right) */}
        <div className="flex items-center gap-2">
          <Segmented value={filter} onChange={setFilter} />
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: TK.border }}
              title="Open full suggestions feed"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" style={{ color: TK.brand }} />
            </button>
          )}

          <button
            type="button"
            onClick={() => (onExport ? onExport() : fallbackExport())}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: TK.border, color: TK.brand }}
            title="Export suggestions"
            aria-label="Export suggestions"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Cards: Mobile rail + Desktop grid */}
      <div className="p-4">
        {/* Mobile swipe rail */}
        <div className="-mx-4 block overflow-x-auto pb-2 sm:hidden">
          <div className="flex snap-x snap-mandatory gap-2 px-4">
            {filtered.map((s) => (
              <SuggestionCard key={s.id} s={s} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        {/* Tablet/Desktop grid */}
        <div className="hidden grid-cols-1 gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="min-h-full">
              <SuggestionCard s={s} onNavigate={onNavigate} />
            </div>
          ))}
        </div>

        {/* Helper note */}
        <div className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: TK.muted }}>
          <FileWarning className="h-4 w-4 text-gray-400" />
          Suggestions are generated from recent link activity; hover a card for quick context. CTAs deep‑link to the relevant views.
        </div>
      </div>
    </section>
  );
}

/* -------------------------- QUICK USAGE (example) ----------------------------
<NewLostSmartSuggestions
  onExport={() => {}}
  onNavigate={{
    toLost:    (p) => { document.getElementById('lost-table')?.scrollIntoView({behavior: 'smooth'}); console.log('[Route] Lost', p); },
    toNew:     (p) => { document.getElementById('new-table')?.scrollIntoView({behavior: 'smooth'}); console.log('[Route] New', p); },
    toAnchorAudit: (p) => { document.getElementById('anchor-audit')?.scrollIntoView({behavior: 'smooth'}); console.log('[Route] Anchor', p); },
    toDisavow: (p) => { console.log('[Route] Disavow Manager', p); },
    openTask:  (p) => { console.log('[Drawer] Task', p); },
  }}
/>
------------------------------------------------------------------------------- */
