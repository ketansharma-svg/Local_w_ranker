"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Link2,
  ListChecks,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Sparkles,
  Target,
  Wand2,
  X,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   Design Tokens (use global tokens when available)
   ──────────────────────────────────────────────────────────────────────────── */
const TOKENS = {
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "var(--wr-action, #0077FF)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  panel: "var(--wr-bg-panel, #F5F7FA)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  success: "var(--wr-good, #10B981)",
  warning: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  radius: "var(--wr-radius, 6px)",
};

/* ────────────────────────────────────────────────────────────────────────────
   Types & mock API
   ──────────────────────────────────────────────────────────────────────────── */
type Impact = "high" | "medium" | "low";
type Category = "anchor" | "page" | "technical" | "replacement";

export type Suggestion = {
  id: string;
  type:
    | "overused_anchor"
    | "link_to_orphans"
    | "low_pils_targets"
    | "technical_barrier"
    | "generic_anchor_ratio";
  title: string;
  description: string;
  impact: Impact;
  confidence: number; // 0–1
  category: Category;
  metrics?: {
    instances?: number;
    pages?: number;
    genericPct?: number;
    aqsAvg?: number;
    exposureClicks?: number;
    targets?: number;
  };
  evidence: Array<{
    instanceId: string;
    sourcePage: string;
    anchor?: string;
    lastVerified?: string;
  }>;
  generatedAt: string; // ISO date
  actions: {
    canSuggestReplacements?: boolean;
  };
  crawlId?: string;
  modelVersion?: string;
};

function mockSuggestions(pageId = "p-123"): Promise<Suggestion[]> {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const rows: Suggestion[] = [
    {
      id: "s-101",
      type: "overused_anchor",
      title: "Overused Anchor Text",
      description: "'SEO tools' appears in 9/12 inlinks — diversify to avoid over‑optimization.",
      impact: "high",
      confidence: 0.92,
      category: "anchor",
      metrics: { instances: 12, pages: 9, genericPct: 0.15, aqsAvg: 0.61, exposureClicks: 2300 },
      evidence: [
        { instanceId: "i-1", sourcePage: "/guide/seo-audit", anchor: "SEO tools", lastVerified: iso(now) },
        { instanceId: "i-2", sourcePage: "/blog/keyword-ideas", anchor: "SEO tools", lastVerified: iso(now) },
      ],
      generatedAt: iso(now),
      crawlId: "c-4321",
      modelVersion: "ai.1.7",
      actions: { canSuggestReplacements: true },
    },
    {
      id: "s-102",
      type: "link_to_orphans",
      title: "Link to Orphan Pages",
      description: "This page could link to 3 orphan pages — add internal links to boost discoverability.",
      impact: "medium",
      confidence: 0.86,
      category: "page",
      metrics: { targets: 3, exposureClicks: 540 },
      evidence: [
        { instanceId: "i-3", sourcePage: "/docs/faq", lastVerified: iso(now) },
        { instanceId: "i-4", sourcePage: "/blog/whats-new", lastVerified: iso(now) },
      ],
      generatedAt: iso(now),
      crawlId: "c-4321",
      modelVersion: "ai.1.7",
      actions: { canSuggestReplacements: false },
    },
    {
      id: "s-103",
      type: "low_pils_targets",
      title: "Low PILS Target Pages",
      description: "2 targets have PILS < 50% — add supporting links.",
      impact: "low",
      confidence: 0.74,
      category: "page",
      metrics: { targets: 2, exposureClicks: 180 },
      evidence: [{ instanceId: "i-5", sourcePage: "/seo-tools", lastVerified: iso(now) }],
      generatedAt: iso(now),
      actions: { canSuggestReplacements: true },
      crawlId: "c-4321",
      modelVersion: "ai.1.7",
    },
    {
      id: "s-104",
      type: "technical_barrier",
      title: "Technical Barrier Detected",
      description:
        "Page Health Score is low while the page has >5 inlinks. Fix technical blockers to unlock benefit.",
      impact: "high",
      confidence: 0.88,
      category: "technical",
      metrics: { exposureClicks: 1200 },
      evidence: [{ instanceId: "i-6", sourcePage: "/tech-audit", lastVerified: iso(now) }],
      generatedAt: iso(now),
      actions: { canSuggestReplacements: false },
      crawlId: "c-4321",
      modelVersion: "ai.1.7",
    },
    {
      id: "s-105",
      type: "generic_anchor_ratio",
      title: "High Generic Anchor Ratio",
      description: "Generic anchors exceed 40% of inlinks — replace some with phrase/partial anchors.",
      impact: "medium",
      confidence: 0.81,
      category: "anchor",
      metrics: { genericPct: 0.42, instances: 7, pages: 5 },
      evidence: [{ instanceId: "i-7", sourcePage: "/blog/compare", anchor: "read more" }],
      generatedAt: iso(now),
      crawlId: "c-4321",
      modelVersion: "ai.1.7",
      actions: { canSuggestReplacements: true },
    },
  ];
  return new Promise((res) => setTimeout(() => res(rows), 350));
}

/* ────────────────────────────────────────────────────────────────────────────
   Small helpers
   ──────────────────────────────────────────────────────────────────────────── */
function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
const impactColor = (i: Impact) =>
  i === "high" ? TOKENS.critical : i === "medium" ? TOKENS.warning : TOKENS.brand;

const pct = (n: number | undefined) =>
  typeof n === "number" ? `${Math.round(n * 100)}%` : "—";

/* ────────────────────────────────────────────────────────────────────────────
   Suggestion Card
   ──────────────────────────────────────────────────────────────────────────── */
function SuggestionCard({
  s,
  onCreateTask,
  onViewAffected,
  onDryRun,
  onDismiss,
  premium = true,
}: {
  s: Suggestion;
  onCreateTask: (s: Suggestion) => void;
  onViewAffected: (s: Suggestion) => void;
  onDryRun: (s: Suggestion) => void;
  onDismiss: (s: Suggestion, snoozeDays?: number) => void;
  premium?: boolean;
}) {
  const [explain, setExplain] = useState(false);
  const [busy, setBusy] = useState<"task" | "dry" | null>(null);

  return (
    <Card
      className="relative overflow-hidden transition hover:shadow-sm"
      style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius, background: "#fff" }}
      aria-labelledby={`s-title-${s.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* Left: AI badge + title */}
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
              style={{ borderColor: TOKENS.borderLight, color: TOKENS.valueBlue, background: `${TOKENS.valueBlue}10` }}
              aria-label="AI generated">
              <Brain className="h-3.5 w-3.5" />
              AI
            </div>
            <CardTitle id={`s-title-${s.id}`} className="text-[16px] leading-6 truncate">
              {s.title}
            </CardTitle>
          </div>

          {/* Right: Impact pill */}
          <div
            className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{
              background: `${impactColor(s.impact)}14`,
              color: impactColor(s.impact),
              border: `1px solid ${impactColor(s.impact)}33`,
            }}
            aria-label={`Impact: ${s.impact}`}
          >
            {s.impact[0].toUpperCase() + s.impact.slice(1)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Summary */}
        <p className="text-sm text-[color:var(--wr-muted,#6B7280)]">{s.description}</p>

        {/* Key metrics row */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-[color:var(--wr-text-strong,#111827)] sm:grid-cols-4">
          {typeof s.metrics?.instances === "number" && (
            <div className="inline-flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
              <span><strong>{s.metrics.instances}</strong> instances</span>
            </div>
          )}
          {typeof s.metrics?.pages === "number" && (
            <div className="inline-flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
              <span><strong>{s.metrics.pages}</strong> pages</span>
            </div>
          )}
          {typeof s.metrics?.genericPct === "number" && (
            <div className="inline-flex items-center gap-1.5">
              <Wand2 className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
              <span>Generic: <strong>{pct(s.metrics.genericPct)}</strong></span>
            </div>
          )}
          {typeof s.metrics?.aqsAvg === "number" && (
            <div className="inline-flex items-center gap-1.5">
              <Target className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
              <span>AQS avg: <strong>{Math.round((s.metrics.aqsAvg ?? 0) * 100)}</strong></span>
            </div>
          )}
          {typeof s.metrics?.targets === "number" && (
            <div className="inline-flex items-center gap-1.5">
              <Rocket className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
              <span>Targets: <strong>{s.metrics.targets}</strong></span>
            </div>
          )}
          {typeof s.metrics?.exposureClicks === "number" && (
            <div className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[color:var(--wr-muted,#6B7280)]" />
              <span>Exposure: <strong>{s.metrics.exposureClicks.toLocaleString()}</strong>/mo</span>
            </div>
          )}
        </div>

        {/* Confidence + provenance */}
        <div className="mt-2 text-[12px] text-[color:var(--wr-muted,#6B7280)]">
          Confidence: <strong>{Math.round(s.confidence * 100)}%</strong>
          {" · "}based on crawl{" "}
          <strong>{new Date(s.generatedAt).toLocaleString()}</strong>
          {s.crawlId ? ` (crawlId: ${s.crawlId})` : ""}.
        </div>

        {/* Explainability toggle */}
        <div className="mt-2">
          <button
            className="inline-flex items-center gap-1 text-[13px] underline decoration-dotted hover:text-[color:var(--wr-action,#0077FF)]"
            onClick={() => setExplain((v) => !v)}
            aria-expanded={explain}
          >
            {explain ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Explain
          </button>

          {explain && (
            <div
              className="mt-2 rounded-md border p-3 text-[13px]"
              style={{ borderColor: TOKENS.borderLight, background: TOKENS.panel }}
            >
              <div className="mb-2 font-medium">Signals & weights</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                <div className="flex items-center justify-between">
                  <span>ExactMatchRate</span><span className="font-medium">0.35</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>AQSAvg</span><span className="font-medium">0.25</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>TrafficExposure</span><span className="font-medium">0.15</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>PILS impact</span><span className="font-medium">0.15</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Placement</span><span className="font-medium">0.10</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 font-medium">Sample evidence</div>
                <ul className="list-disc pl-5 space-y-1">
                  {s.evidence.slice(0, 5).map((e) => (
                    <li key={e.instanceId} className="text-[13px]">
                      {e.anchor ? <span className="font-medium">“{e.anchor}”</span> : "Instance"} on{" "}
                      <span className="underline" style={{ color: TOKENS.valueBlue }}>
                        {e.sourcePage}
                      </span>{" "}
                      {e.lastVerified && (
                        <span className="text-[color:var(--wr-muted,#6B7280)]">
                          · verified {new Date(e.lastVerified).toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-2 text-[12px] text-[color:var(--wr-muted,#6B7280)]">
                Model: {s.modelVersion ?? "—"}
              </div>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={async () => {
              setBusy("task");
              await new Promise((r) => setTimeout(r, 250));
              onCreateTask(s);
              setBusy(null);
            }}
            style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
            aria-label="Create optimization task"
            disabled={busy !== null}
          >
            {busy === "task" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
            Create Task
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewAffected(s)}
            aria-label="View affected rows"
          >
            <EyeIcon className="mr-2 h-4 w-4" />
            View Affected
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setBusy("dry");
                      await new Promise((r) => setTimeout(r, 300));
                      onDryRun(s);
                      setBusy(null);
                    }}
                    disabled={!premium || !s.actions.canSuggestReplacements || busy !== null}
                    aria-label="Run dry‑run suggestions"
                  >
                    {busy === "dry" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Suggest Replacements
                  </Button>
                </span>
              </TooltipTrigger>
              {!premium ? (
                <TooltipContent>Requires enterprise permission</TooltipContent>
              ) : !s.actions.canSuggestReplacements ? (
                <TooltipContent>No auto‑suggestions available</TooltipContent>
              ) : (
                <TooltipContent>Preview replacements (dry‑run)</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="More actions">
                <MoreIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => onDismiss(s)}
                >
                  <X className="mr-2 h-4 w-4" /> Dismiss
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => onDismiss(s, 14)}
                >
                  <Clock className="mr-2 h-4 w-4" /> Snooze 14 days
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Footer micro-copy */}
        <div className="mt-3 text-[12px] text-[color:var(--wr-muted,#6B7280)]">
          Fixes suggested: <strong>{(s.metrics?.instances ?? s.metrics?.targets ?? 1) + 1}</strong> · Addressed:{" "}
          <strong>0</strong>
        </div>
      </CardContent>
    </Card>
  );
}

/* Simple icon fallbacks so you don’t need extra imports */
function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width="16" height="16" {...props}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" fill="none" stroke="currentColor"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor"/></svg>;
}
function MoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width="16" height="16" {...props}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>;
}

/* ────────────────────────────────────────────────────────────────────────────
   Section Toolbar
   ──────────────────────────────────────────────────────────────────────────── */
type ToolbarFilters = {
  onlyHighImpact: boolean;
  categories: Set<Category>;
};

function Toolbar({
  filters,
  setFilters,
  refreshing,
  onRefresh,
}: {
  filters: ToolbarFilters;
  setFilters: (f: ToolbarFilters) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const categories: Array<{ id: Category; label: string; icon: React.ReactNode }> = [
    { id: "anchor", label: "Anchor‑related", icon: <Link2 className="h-4 w-4" /> },
    { id: "page", label: "Page‑focused", icon: <Target className="h-4 w-4" /> },
    { id: "technical", label: "Technical", icon: <ShieldAlert className="h-4 w-4" /> },
    { id: "replacement", label: "Replacement‑ready", icon: <Wand2 className="h-4 w-4" /> },
  ];

  const chips = Array.from(filters.categories);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-3 py-2"
      style={{ borderColor: TOKENS.border }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[color:var(--wr-muted,#6B7280)]">High Impact only</span>
          <Switch
            checked={filters.onlyHighImpact}
            onCheckedChange={(v) => setFilters({ ...filters, onlyHighImpact: Boolean(v) })}
          />
        </div>

        {/* Category toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => {
            const active = filters.categories.has(c.id);
            return (
              <button
                key={c.id}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px]",
                  active ? "font-medium" : "text-[color:var(--wr-muted,#6B7280)]"
                )}
                style={{
                  borderColor: active ? `${TOKENS.valueBlue}66` : TOKENS.border,
                  background: active ? `${TOKENS.valueBlue}12` : "#fff",
                  color: active ? TOKENS.valueBlue : undefined,
                }}
                onClick={() => {
                  const next = new Set(filters.categories);
                  active ? next.delete(c.id) : next.add(c.id);
                  setFilters({ ...filters, categories: next });
                }}
              >
                {c.icon}
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh suggestions"
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="w-full -mb-1 mt-1">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]"
                style={{ borderColor: TOKENS.borderLight, background: TOKENS.panel }}
              >
                {id}
                <button
                  className="ml-1 rounded p-0.5 hover:bg-black/[0.04]"
                  onClick={() => {
                    const next = new Set(filters.categories);
                    next.delete(id);
                    setFilters({ ...filters, categories: next });
                  }}
                  aria-label={`Remove filter ${id}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Main Section Component (export this)
   ──────────────────────────────────────────────────────────────────────────── */
export default function OptimizationOpportunitiesSection({
  pageId = "p-123",
  premium = true, // permission for Suggest Replacements
  onCreateTask,
  onViewAffected,
  onDryRun,
}: {
  pageId?: string;
  premium?: boolean;
  onCreateTask?: (s: Suggestion) => void;
  onViewAffected?: (s: Suggestion) => void;
  onDryRun?: (s: Suggestion) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Suggestion[]>([]);
  const [filters, setFilters] = useState<ToolbarFilters>({
    onlyHighImpact: false,
    categories: new Set<Category>(),
  });

  const liveRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const rows = await mockSuggestions(pageId);
      if (!active) return;
      setData(rows);
      setLoading(false);
      if (liveRef.current) {
        liveRef.current.textContent = `${rows.length} suggestions loaded`;
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId]);

  // Refresh
  const refresh = async () => {
    setRefreshing(true);
    const rows = await mockSuggestions(pageId);
    setData(rows);
    setRefreshing(false);
    if (liveRef.current) {
      liveRef.current.textContent = `Suggestions refreshed at ${new Date().toLocaleTimeString()}`;
    }
  };

  // Derive filtered set
  const filtered = useMemo(() => {
    let rows = data.slice();
    if (filters.onlyHighImpact) rows = rows.filter((r) => r.impact === "high");
    if (filters.categories.size) {
      rows = rows.filter((r) => filters.categories.has(r.category));
    }
    return rows;
  }, [data, filters]);

  // Handlers
  const handleCreateTask = (s: Suggestion) => {
    onCreateTask?.(s);
    // placeholder telemetry / toast
    console.info("task_created", { suggestionId: s.id, pageId });
  };
  const handleViewAffected = (s: Suggestion) => {
    onViewAffected?.(s);
    console.info("breadcrumb_navigate_to_affected", { suggestionId: s.id, pageId });
  };
  const handleDryRun = (s: Suggestion) => {
    onDryRun?.(s);
    console.info("ai_suggestion_dryrun_previewed", { suggestionId: s.id, pageId });
  };
  const handleDismiss = (s: Suggestion, snoozeDays?: number) => {
    setData((rows) => rows.filter((r) => r.id !== s.id));
    console.info(snoozeDays ? "ai_suggestion_snoozed" : "ai_suggestion_dismissed", {
      suggestionId: s.id,
      snoozeDays: snoozeDays ?? 0,
    });
  };

  return (
    <section className="space-y-3 w-full" aria-labelledby="opt-title">
      {/* Section header */}
      <div className="flex items-center justify-between mt-4">
        <h3 id="opt-title" className="text-lg font-semibold" style={{ color: TOKENS.text }}>
          Optimization Opportunities
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 cursor-help text-[color:var(--wr-muted,#6B7280)]" />
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-xs">
              AI‑driven, prioritized suggestions to improve internal linking. Actions are safe‑guarded with dry‑runs and require confirmation for bulk changes.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-sm -mt-1" style={{ color: TOKENS.muted }}>
        Suggestions for this page based on the latest crawl. Use actions to create tasks, view affected rows, or preview replacement dry‑runs.
      </p>

      {/* Toolbar */}
      <Toolbar filters={filters} setFilters={setFilters} refreshing={refreshing} onRefresh={refresh} />

      {/* Live region for updates */}
      <div className="sr-only" aria-live="polite" ref={liveRef} />

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-[184px] animate-pulse border" style={{ borderColor: TOKENS.border }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border" style={{ borderColor: TOKENS.border }}>
          <CardContent className="flex items-center gap-3 p-6 text-sm" style={{ color: TOKENS.muted }}>
            <CheckCircle2 className="h-5 w-5 text-[color:var(--wr-good,#10B981)]" />
            No suggestions match your filters. Try refreshing or widening the filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              premium={premium}
              onCreateTask={handleCreateTask}
              onViewAffected={handleViewAffected}
              onDryRun={handleDryRun}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </section>
  );
}
