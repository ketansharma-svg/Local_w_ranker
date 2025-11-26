"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Brain, Settings2, AlertTriangle, ShieldAlert, Wand2,
  X as XIcon, ArrowRight, Link2, Gauge, Link as LinkIcon, Sparkles
} from "lucide-react";
import PageSpeedOptimizationDrawer from "./drawers/PageSpeedOptimization"
import DemoLinkInterlinkingDrawer from "./drawers/DemoLinkInterlinking";
/* ───────────────────────── Tokens (tailwind-friendly) ───────────────────────── */
const TOKENS = {
  brand: "#1090D0",
  border: "#E5E7EB",
  chipBg: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  // severity accents
  critical: {
    border: "border-red-200",
    ring: "ring-red-100",
    tint: "bg-red-50",
    icon: "text-red-600",
    pill: "bg-red-100 text-red-700",
  },
  warning: {
    border: "border-amber-200",
    ring: "ring-amber-100",
    tint: "bg-amber-50",
    icon: "text-amber-600",
    pill: "bg-amber-100 text-amber-800",
  },
  info: {
    border: "border-sky-200",
    ring: "ring-sky-100",
    tint: "bg-sky-50",
    icon: "text-sky-600",
    pill: "bg-sky-100 text-sky-800",
  },
  aiPill: "bg-indigo-100 text-indigo-800",
  rulePill: "bg-gray-100 text-gray-700",
};

/* ───────────────────────── Types ───────────────────────── */
type SuggestionOrigin = "ai" | "rule";
type Severity = "critical" | "warning" | "info";

export type CTA = {
  label: string;
  onClick?: () => void;   // use to deep-link via router or open drawer
  href?: string;          // optional direct link (opens in new tab)
  title?: string;         // optional tooltip/title
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export type SmartSuggestion = {
  id: string;
  origin: SuggestionOrigin;           // 'ai' or 'rule'
  severity: Severity;                 // visual accents
  title: string;                      // concise 1-line insight
  description?: string;               // optional support text (2 lines)
  meta?: Array<{ label: string }>;    // small chips
  explainWhy?: string;                // optional tooltip
  primary: CTA;                       // main action
  secondary?: CTA;                    // second action
  dismissible?: boolean;              // default true
};

export type Section5Props = {
  suggestions?: SmartSuggestion[];    // supply live data, or fallback demo
  defaultFilter?: "all" | "ai" | "rule";
  storageKey?: string;                // persist dismiss state (per project)
  onViewAll?: () => void;             // optional "View All" handler
  className?: string;
};

/* ───────────────────────── UI helpers ───────────────────────── */
function classForSeverity(sev: Severity) {
  const map = { critical: TOKENS.critical, warning: TOKENS.warning, info: TOKENS.info };
  return map[sev];
}

function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  if (severity === "critical") return <ShieldAlert className={className ?? ""} />;
  if (severity === "warning") return <AlertTriangle className={className ?? ""} />;
  return <Wand2 className={className ?? ""} />; // info
}

function SourceBadge({ origin }: { origin: SuggestionOrigin }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        origin === "ai" ? TOKENS.aiPill : TOKENS.rulePill,
      ].join(" ")}
      title={origin === "ai" ? "Suggested by AI engine" : "Triggered by rule threshold"}
    >
      {origin === "ai" ? <Brain className="mr-1 h-3 w-3" /> : <Settings2 className="mr-1 h-3 w-3" />}
      {origin === "ai" ? "AI" : "Rule"}
    </span>
  );
}

function ActionButton({
  cta, primaryColor = TOKENS.brand,
}: { cta: CTA; primaryColor?: string }) {
  const base = "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition";
  if (cta.variant === "secondary") {
    return cta.href ? (
      <a
        href={cta.href}
        target="_blank"
        rel="noreferrer"
        title={cta.title}
        className={[
          base,
          "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-60",
        ].join(" ")}
        aria-disabled={cta.disabled || undefined}
        onClick={cta.onClick}
      >
        {cta.label}
      </a>
    ) : (
      <button
        type="button"
        title={cta.title}
        className={[
          base,
          "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-60",
        ].join(" ")}
        disabled={cta.disabled}
        onClick={cta.onClick}
      >
        {cta.label}
      </button>
    );
  }
  // primary (default)
  return cta.href ? (
    <a
      href={cta.href}
      target="_blank"
      rel="noreferrer"
      title={cta.title}
      className={[
        base,
        "text-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
      ].join(" ")}
      style={{ ["--btn-bg" as any]: primaryColor, background: primaryColor }}
      onClick={cta.onClick}
      aria-disabled={cta.disabled || undefined}
    >
      {cta.label}
      <ArrowRight className="ml-1.5 h-4 w-4" />
    </a>
  ) : (
    <button
      type="button"
      title={cta.title}
      className={[
        base,
        "text-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60",
      ].join(" ")}
      style={{ ["--btn-bg" as any]: primaryColor, background: primaryColor }}
      onClick={cta.onClick}
      disabled={cta.disabled}
    >
      {cta.label}
      <ArrowRight className="ml-1.5 h-4 w-4" />
    </button>
  );
}

/* ───────────────────────── Card with 2 CTAs + Dismiss ───────────────────────── */
function SuggestionCard({
  suggestion,
  onDismiss,
}: {
  suggestion: SmartSuggestion;
  onDismiss?: (id: string) => void;
}) {
  const theme = classForSeverity(suggestion.severity);
  const isDismissible = suggestion.dismissible !== false;

  return (
    <div
      className={[
        "group relative h-full rounded-xl border bg-white p-4 shadow-sm transition",
        theme.border,
        "hover:shadow-md hover:ring",
        theme.ring,
      ].join(" ")}
      role="region"
      aria-label={suggestion.title}
      title={suggestion.explainWhy || undefined}
    >
      {/* left severity rail */}
      <div
        className={[
          "absolute left-0 top-0 h-full w-1 rounded-l-xl",
          suggestion.severity === "critical" ? "bg-red-400"
            : suggestion.severity === "warning" ? "bg-amber-400" : "bg-sky-400",
        ].join(" ")}
      />

      {/* dismiss */}
      {isDismissible && !!onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(suggestion.id)}
          title="Dismiss this suggestion"
          aria-label="Dismiss suggestion"
          className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100 rounded p-1 hover:bg-gray-100"
        >
          <XIcon className="h-4 w-4 text-gray-500" />
        </button>
      )}

      {/* head */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={[theme.icon, "inline-flex h-5 w-5 items-center justify-center"].join(" ")}>
            <SeverityIcon severity={suggestion.severity} className="h-5 w-5" />
          </span>
          <h4 className="text-sm font-semibold text-gray-900">{suggestion.title}</h4>
        </div>
        <SourceBadge origin={suggestion.origin} />
      </div>

      {suggestion.description && (
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-gray-600">
          {suggestion.description}
        </p>
      )}

      {suggestion.meta && suggestion.meta.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestion.meta.map((m, idx) => (
            <span
              key={idx}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
            >
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* actions: primary + secondary + priority pill */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ActionButton cta={{ variant: "primary", ...suggestion.primary }} />
          {suggestion.secondary && (
            <ActionButton cta={{ variant: "secondary", ...suggestion.secondary }} />
          )}
        </div>
        <span
          className={[
            "inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-semibold",
            theme.pill,
          ].join(" ")}
        >
          {suggestion.severity === "critical" ? "High Priority"
            : suggestion.severity === "warning" ? "Action Recommended" : "FYI"}
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────── Demo content (swap for live data) ───────────────────────── */
const DEMO: SmartSuggestion[] = [
  {
    id: "kw-gap",
    origin: "ai",
    severity: "warning",
    title: "competitor1.com ranks for 142 keywords you don’t.",
    description: "Quick wins exist in low‑difficulty terms within your topic cluster.",
    meta: [{ label: "US • Desktop" }, { label: "Filter: Volume > 500" }],
    explainWhy: "AI detected a material keyword gap vs competitor1.com on shared topics.",
    primary: {
      label: "View Keyword Gap",
      title: "Open Keyword Gap tab pre‑filtered to competitor1.com",
      onClick: () => console.log("[Route] → /competitors/keyword-gap?competitor=competitor1.com&gap=missing&sort=volume"),
    },
    secondary: {
      label: "Create Task",
      title: "Open Task Drawer with pre‑filled gap context",
      onClick: () => console.log("[Drawer] → Task(Create content for KW gap)"),
      variant: "secondary",
    },
  },
  {
    id: "speed-delta",
    origin: "rule",
    severity: "critical",
    title: "Your average page speed is 32% slower than comp2.com.",
    description: "Largest gaps found on /blog/* templates; images and 3rd‑party scripts dominate.",
    meta: [{ label: "LCP > 3.5s" }, { label: "12 pages impacted" }],
    explainWhy: "PageSpeed vs comp2.com shows consistent delay; actionable on media & scripts.",
    primary: {
      label: "Analyze Page Speed",
      title: "Open Speed drawer with comparison to comp2.com",
      onClick: () => console.log("[Drawer] → Page Speed Comparison (you vs comp2.com)"),
    },
    secondary: {
      label: "Assign Optimization",
      title: "Create task for image compression & script budget",
      onClick: () => console.log("[Drawer] → Task(Create speed optimization)"),
      variant: "secondary",
    },
  },
  {
    id: "link-velocity",
    origin: "ai",
    severity: "info",
    title: "competitor1.com gained 43 backlinks in the last 30 days.",
    description: "Several domains (WR > 70) overlap with your topics—good outreach targets.",
    meta: [{ label: "43 new domains" }, { label: "WR>70: 11" }],
    explainWhy: "Link velocity anomaly indicates active outreach; consider prospecting overlap.",
    primary: {
      label: "View Link Gap",
      title: "Open Backlink Gap tab filtered to competitor1.com new domains",
      onClick: () => console.log("[Route] → /competitors/backlink-gap?competitor=competitor1.com&when=30d&filter=new"),
    },
    secondary: {
      label: "Add Outreach Task",
      title: "Create outreach task with matched domains",
      onClick: () => console.log("[Drawer] → Task(Outreach: matched domains)"),
      variant: "secondary",
    },
  },
  {
    id: "serp-feature-miss",
    origin: "ai",
    severity: "warning",
    title: "You appear in 0 snippets; competitor1.com owns 7.",
    description: "Pages ranking #3–7 miss FAQ structure and concise definitions.",
    meta: [{ label: "Snippets: 7 vs 0" }],
    primary: {
      label: "View SERP Insights",
      onClick: () => console.log("[Route] → /competitors/serp-layout?feature=snippets&competitor=competitor1.com"),
    },
    secondary: {
      label: "Add FAQ Schema Task",
      onClick: () => console.log("[Drawer] → Task(Add FAQ schema to target pages)"),
      variant: "secondary",
    },
  },
];

/* ───────────────────────── Section 5 – Smart Suggestions (2 CTAs + Dismiss) ───────────────────────── */
export default function Section5SmartSuggestions({
  suggestions = DEMO,
  defaultFilter = "all",
  storageKey,    // e.g. "wr:project-123:smart-suggestions:dismissed"
  onViewAll,
  className,
}: Section5Props) {
  const [filter, setFilter] = useState<"all" | "ai" | "rule">(defaultFilter);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // load dismissed ids (optional)
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDismissed(JSON.parse(raw));
    } catch { /* noop */ }
  }, [storageKey]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* noop */ }
      }
      return next;
    });
  };

  const visible = useMemo(
    () => suggestions.filter((s) => !dismissed.includes(s.id)),
    [suggestions, dismissed]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return visible;
    return visible.filter((s) => s.origin === filter);
  }, [visible, filter]);


  const [drawerRow, setDrawerRow] = useState(false);
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
    <section
      className={[
        "rounded-2xl border bg-white p-2 sm:p-5 shadow-sm mt-4",
        "border-[#EFF0F6]",
        className ?? "",
      ].join(" ")}
      aria-labelledby="ai-smart-suggestions-title"
    >
                                          {drawerRow && (
                                <Drawer title="Drawer" onClose={closeDrawer}>
                                  <DemoLinkInterlinkingDrawer   />
                                </Drawer>
                              )}
      {/* header */}
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: TOKENS.brand }} />
          <h3 id="ai-smart-suggestions-title" className="text-base font-semibold text-gray-900">
            AI Smart Suggestions
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* AI | Rules | All */}
          <div
            className="inline-flex rounded-md border border-gray-200 bg-white p-0.5"
            role="tablist"
            aria-label="Suggestion source filter"
          >
            {(["ai", "rule", "all"] as const).map((opt) => {
              const active = filter === opt;
              return (
                <button
                  key={opt}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(opt)}
                  className={[
                    "px-3 py-1.5 text-sm font-medium rounded",
                    active ? "bg-[color:var(--brand,#1090D0)] text-white"
                           : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                  style={{ ["--brand" as any]: TOKENS.brand }}
                >
                  {opt === "ai" ? "AI Only" : opt === "rule" ? "Rules Only" : "All"}
                </button>
              );
            })}
          </div>

          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              title="Open full suggestions feed"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
          No suggestions match this filter right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onDismiss={handleDismiss} />
          ))}
        </div>
      )}

      {/* helper note */}
      <div className="mt-4 flex items-center gap-2 text-[12px] text-gray-500">
        <Link2 className="h-4 w-4 text-gray-400" />
        CTAs deep‑link to pre‑filtered views (Keyword Gap, Backlink Gap, SERP Layout) or open the Task
        Drawer with pre‑filled context—mirroring cross‑panel rules in Competitor Intelligence. 
      </div>
    </section>
  );
}

/* ----------------------------- USAGE NOTES -----------------------------
<Section5SmartSuggestions
  storageKey="wr:project-123:smart-suggestions:dismissed"
  onViewAll={() => console.log("[Route] → /competitors/strategy-suggestions")}
/>

Wire CTA handlers to your router/drawers:
- Keyword Gap (missing): /competitors/keyword-gap?competitor=competitor1.com&gap=missing
- Backlink Gap (new/unique): /competitors/backlink-gap?competitor=competitor1.com
- SERP Layout (feature-focused): /competitors/serp-layout?feature=snippets&competitor=competitor1.com
- Task Drawer: open with pre-filled payload for content, speed, links, etc.
------------------------------------------------------------------------ */
