"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  // Section & UI
  Sparkles,
  Brain,
  Info,
  RefreshCw,
  Download,
  Loader2,
  X,
  MoreVertical,
  ExternalLink,
  ArrowUpRight,
  // Card/category icons
  Link2,
  FileText,
  Globe,
  // Status/icons
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";
import { useProjectManager } from "@/src/hooks/use-project-manager";

/**
 * Wranker — Broken Links → SECTION: Smart Suggestions (AI)
 * Matches the reference Anchors → Smart Suggestions section:
 * - Inter font, brand/value blues
 * - Tailwind-only; no external UI libs
 * - Sticky header with segmented filter, chips, Refresh/Export
 * - Cards with top-right dismiss, AI/Impact badges, evidence rows
 * - Explain modal, right-side drawers, bottom-left toast
 */

/* ───────────────────────── Tokens ───────────────────────── */
const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  text: "#111827",
  textMuted: "#6B7280",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  // Link scope/status palette
  internal: "#0EA5A6",
  external: "#4AA3FF",
  http404: "#EF4444",
  http410: "#F59E0B",
  http5xx: "#DC2626",
} as const;

/* ───────────────────────── Utilities ───────────────────────── */
function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Impact = "high" | "moderate" | "quickwin";
type Confidence = "high" | "medium" | "low";
type Category = "Page-focused" | "External-domain" | "Anchor-related";

type Example = {
  url: string;
  page: string;
  status: number; // e.g., 404, 410, 500
  scope: "internal" | "external";
};

type Suggestion = {
  id: string;
  title: string;
  desc: string;
  impact: Impact;
  confidence: Confidence;
  metrics: {
    pages?: number;
    totalLinks?: number;
    traffic?: number;
  };
  examples: Example[];
  actions: {
    canCreateTask?: boolean;
    canReplace?: boolean;
  };
  provenance: {
    crawlId: string;
    ga4Snapshot?: string;
    modelVersion?: string;
  };
  generatedAt: string; // ISO
  category: Category;
  externalOnly?: boolean;
};

const impactTone = (impact: Impact) =>
  impact === "high" ? TOKENS.danger : impact === "moderate" ? TOKENS.warn : TOKENS.good;

const impactLabel: Record<Impact, string> = {
  high: "High Impact",
  moderate: "Moderate",
  quickwin: "Quick Win",
};

const confidenceLabel = (c: Confidence) => c[0].toUpperCase() + c.slice(1);

/* ───────────────────────── Mock API (Broken Links) ───────────────────────── */
const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: "s-1",
    impact: "high",
    confidence: "high",
    title: "Fix 404s on 6 revenue pages",
    desc: "Pages with high traffic contain multiple 404s. Prioritize to protect conversions and UX.",
    metrics: { pages: 6, totalLinks: 17, traffic: 5200 },
    examples: [
      { url: "https://example.com/old-guide", page: "/pricing", status: 404, scope: "external" },
      { url: "/media/whitepaper.pdf", page: "/checkout", status: 404, scope: "internal" },
    ],
    actions: { canCreateTask: true, canReplace: true },
    provenance: { crawlId: "c-4321", ga4Snapshot: "ga4-2025-08", modelVersion: "wranker-bl-1.0" },
    generatedAt: "2025-08-22T09:10:00Z",
    category: "Page-focused",
  },
  {
    id: "s-2",
    impact: "moderate",
    confidence: "medium",
    title: "Replace repeated external links from example.org",
    desc: "Repeated broken outbound links to example.org cause UX issues. Replace with alternative resources.",
    metrics: { pages: 3, totalLinks: 9, traffic: 1800 },
    examples: [
      { url: "https://example.org/toolkit", page: "/blog/seo-checklist", status: 404, scope: "external" },
      { url: "https://example.org/resource", page: "/resources", status: 404, scope: "external" },
    ],
    actions: { canCreateTask: true, canReplace: true },
    provenance: { crawlId: "c-4321", modelVersion: "wranker-bl-1.0" },
    generatedAt: "2025-08-22T09:12:00Z",
    externalOnly: true,
    category: "External-domain",
  },
  {
    id: "s-3",
    impact: "quickwin",
    confidence: "high",
    title: "Improve generic anchors on 8 pages",
    desc: "Many anchors like ‘click here’ reduce accessibility and SEO relevance. Update to descriptive text.",
    metrics: { pages: 8, totalLinks: 21, traffic: 900 },
    examples: [
      { url: "/docs/start", page: "/docs/start", status: 404, scope: "internal" },
      { url: "/blog/intro", page: "/blog/intro", status: 404, scope: "internal" },
    ],
    actions: { canCreateTask: true, canReplace: false },
    provenance: { crawlId: "c-4321", modelVersion: "wranker-bl-1.0" },
    generatedAt: "2025-08-22T09:13:00Z",
    category: "Anchor-related",
  },
];

function mockFetchSuggestions(
  filters: Partial<{ highOnly: boolean; categories: Array<Category> }>
): Promise<Suggestion[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let data = [...MOCK_SUGGESTIONS];
      if (filters.highOnly) data = data.filter((s) => s.impact === "high");
      if (filters.categories && filters.categories.length) {
        data = data.filter((s) => filters.categories!.includes(s.category));
      }
      resolve(data);
    }, 420);
  });
}

/* ───────────────────────── Telemetry ───────────────────────── */
function emit(event: string, payload: Record<string, any>) {
  // eslint-disable-next-line no-console
  console.log("[telemetry]", event, payload);
}

/* ───────────────────────── Small atoms ───────────────────────── */
function Badge({
  color,
  children,
  title,
}: {
  color: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {children}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className={clsx(
        "px-2.5 h-8 inline-flex items-center gap-2 rounded-full border text-sm cursor-pointer",
        active
          ? "bg-white border-[var(--chip-border,#D1D5DB)]"
          : "bg-[var(--chip-bg,#F5F7FA)] border-transparent hover:bg-[var(--chip-hover,#E5E7EB)]"
      )}
      style={
        {
          "--chip-bg": TOKENS.chipBg,
          "--chip-hover": TOKENS.chipHover,
        } as React.CSSProperties
      }
    >
      {children}
    </button>
  );
}

function Pill({
  text,
  icon,
  title,
  onClick,
}: {
  text: string;
  icon?: React.ReactNode;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="px-2 py-0.5 rounded-full bg-[var(--chip-bg,#F5F7FA)] hover:bg-[var(--chip-hover,#E5E7EB)] text-xs text-[var(--muted,#6B7280)] border border-[var(--border,#EFF0F6)] inline-flex items-center gap-1.5 cursor-pointer"
      style={
        {
          "--chip-bg": TOKENS.chipBg,
          "--chip-hover": TOKENS.chipHover,
          "--border": TOKENS.borderLight,
          "--muted": TOKENS.textMuted,
        } as React.CSSProperties
      }
    >
      {icon}
      {text}
    </button>
  );
}

/* ───────────────────────── Modals / Drawers ───────────────────────── */
function ModalShell({
  open,
  onClose,
  title,
  children,
  maxWidth = 680,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-4">
        <div className="w-full bg-white rounded-2xl shadow-xl" style={{ maxWidth }}>
          <div
            className="sticky top-0 flex items-center justify-between gap-2 p-4 border-b"
            style={{ borderColor: TOKENS.borderLight }}
          >
            <h3 className="text-lg font-semibold text-[var(--text,#111827)]" style={{ "--text": TOKENS.text } as React.CSSProperties}>
              {title}
            </h3>
            <button aria-label="Close" onClick={onClose} className="p-2 rounded hover:bg-gray-100 cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function RightDrawer({
  open,
  onClose,
  title,
  width = 520,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={onClose} />
          <motion.aside
            initial={{ x: width }}
            animate={{ x: 0 }}
            exit={{ x: width }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute right-0 top-0 h-full bg-white shadow-2xl flex flex-col"
            style={{ width }}
          >
            <div
              className="sticky top-0 flex items-center justify-between gap-2 p-4 border-b"
              style={{ borderColor: TOKENS.borderLight }}
            >
              <h3 className="text-[17px] font-semibold">{title}</h3>
              <button aria-label="Close" onClick={onClose} className="p-2 rounded hover:bg-gray-100 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Toast ───────────────────────── */
function Toast({ open, text, onClose }: { open: boolean; text: string; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed left-4 bottom-4 z-[80]">
      <div className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg shadow">
        <CheckCircle2 size={16} />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

/* ───────────────────────── Link status/scope badges ───────────────────────── */
function StatusBadge({ status }: { status: number }) {
  const color =
    status === 404 ? TOKENS.http404 : status === 410 ? TOKENS.http410 : status >= 500 ? TOKENS.http5xx : TOKENS.good;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full text-[10px] font-medium"
      style={{ backgroundColor: `${color}14`, color }}
      title={`HTTP ${status}`}
    >
      <AlertTriangle size={12} />
      {status}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: "internal" | "external" }) {
  const color = scope === "internal" ? TOKENS.internal : TOKENS.external;
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full text-[10px] font-medium"
      style={{ backgroundColor: `${color}14`, color }}
      title={`${scope} link`}
    >
      {scope === "internal" ? <Link2 size={12} /> : <ExternalLink size={12} />}
      {scope}
    </span>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
export default function SmartSuggestionsSection() {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highOnly, setHighOnly] = useState(false);
  const [categorySel, setCategorySel] = useState<Array<Category>>([]);

  const [explainFor, setExplainFor] = useState<Suggestion | null>(null);
  const [replaceFor, setReplaceFor] = useState<Suggestion | null>(null);
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  const [dismissed, setDismissed] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" });

  const activeFilters = useMemo(() => ({ highOnly, categories: categorySel }), [highOnly, categorySel]);

  async function load() {
    setLoading(true);
    const data = await mockFetchSuggestions(activeFilters);
    setSuggestions(data);
    setLoading(false);
    emit("bl_suggestion_viewed", {
      userId: "demo",
      projectId: "p-1",
      suggestionId: data.map((d) => d.id),
      timestamp: Date.now(),
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highOnly, categorySel.join(",")]);

  const visibleSuggestions = suggestions.filter((s) => !dismissed.includes(s.id));
  const addressedCount = accepted.length + dismissed.length;

  function onDismiss(id: string) {
    setDismissed((d) => [...d, id]);
    setToast({ open: true, text: "Suggestion dismissed. Undo?" });
    emit("bl_suggestion_dismissed", { userId: "demo", projectId: "p-1", suggestionId: id, timestamp: Date.now() });
  }

  function undoLastDismiss() {
    setDismissed((d) => d.slice(0, -1));
  }

  function onCreateTask(s: Suggestion) {
    const exampleLines = s.examples
      .slice(0, 5)
      .map((e) => `- ${e.page || "Unknown page"} -> ${e.url} (HTTP ${e.status}, ${e.scope})`)
      .join("\n");
    const descriptionParts = [
      s.desc,
      "",
      s.metrics.pages ? `Pages impacted: ${s.metrics.pages}` : null,
      exampleLines ? "Sample links:\n" + exampleLines : null,
    ].filter(Boolean) as string[];

    openTaskDrawer({
      title: s.title,
      description: descriptionParts.join("\n"),
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
    onAccept(s, "create_task");
  }

  function onAccept(s: Suggestion, action: string) {
    setAccepted((a) => (a.includes(s.id) ? a : [...a, s.id]));
    setToast({ open: true, text: `Action queued: ${action}` });
    emit("bl_suggestion_accepted", {
      userId: "demo",
      projectId: "p-1",
      suggestionId: s.id,
      action,
      timestamp: Date.now(),
    });
  }

  function exportCSV(rows: Suggestion[]) {
    const header = ["suggestionId", "title", "impact", "confidence", "pages", "totalLinks", "traffic", "generatedAt"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.title,
          r.impact,
          r.confidence,
          r.metrics.pages ?? "",
          r.metrics.totalLinks ?? "",
          r.metrics.traffic ?? "",
          r.generatedAt,
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `broken_link_suggestions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    emit("bl_suggestions_exported", { userId: "demo", projectId: "p-1", filterSummary: activeFilters, timestamp: Date.now() });
  }

  /* Category → branded icon for card titles */
  const categoryIcon = (c: Category) =>
    c === "Page-focused" ? <FileText size={16} /> : c === "Anchor-related" ? <Link2 size={16} /> : <Globe size={16} />;

  return (
    <div
      className="w-full font-sans"
      style={{
        color: TOKENS.text,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans"',
      }}
    >
      {/* Section container + header */}
      <section className="w-full border rounded-lg bg-white" style={{ borderColor: TOKENS.borderLight}}>
        <div
          className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-white/95 backdrop-blur px-4 py-3"
          style={{ borderColor: TOKENS.borderLight }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} color={TOKENS.valueBlue} />
            <h2 className="text-[18px] font-semibold">Smart Suggestions (AI)</h2>
            <Badge color={TOKENS.valueBlue} title="AI-generated">
              <span className="inline-flex items-center gap-1">
                <Brain size={12} /> AI
              </span>
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented toggle */}
            <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: TOKENS.borderLight }}>
              <button
                onClick={() => setHighOnly(false)}
                className={clsx("px-3 h-8 text-sm cursor-pointer", !highOnly ? "bg-[var(--brand,#008CCD)] text-white" : "bg-white")}
                style={{ "--brand": TOKENS.brand } as React.CSSProperties}
                aria-label="Show all suggestions"
              >
                All
              </button>
              <button
                onClick={() => setHighOnly(true)}
                className={clsx("px-3 h-8 text-sm cursor-pointer", highOnly ? "bg-[var(--brand,#008CCD)] text-white" : "bg-white")}
                style={{ "--brand": TOKENS.brand } as React.CSSProperties}
                aria-label="High impact only"
              >
                High impact
              </button>
            </div>

            {/* Category filter chips */}
            {(["Page-focused", "External-domain", "Anchor-related"] as const).map((c) => (
              <Chip
                key={c}
                active={categorySel.includes(c)}
                onClick={() => setCategorySel((arr) => (arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]))}
                ariaLabel={`Filter ${c}`}
              >
                <span className="inline-flex items-center gap-1 text-xs">
                  {categoryIcon(c)}
                  {c}
                </span>
              </Chip>
            ))}

            <div
              className="mx-1 w-px self-stretch bg-[var(--divider,#EFF0F6)]"
              style={{ "--divider": TOKENS.borderLight } as React.CSSProperties}
            />

            <button
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: TOKENS.borderLight }}
              aria-label="Refresh suggestions"
            >
              <RefreshCw size={14} /> Refresh
            </button>

            <button
              onClick={() => exportCSV(visibleSuggestions)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: TOKENS.borderLight }}
              aria-label="Export suggestions"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Active filter chips row */}
        <div
          className="px-4 py-2 border-b flex flex-wrap items-center gap-2 bg-[var(--chip-bg,#F5F7FA)]"
          style={{ borderColor: TOKENS.borderLight, "--chip-bg": TOKENS.chipBg } as React.CSSProperties}
        >
          {highOnly && (
            <Chip onClick={() => setHighOnly(false)} ariaLabel="Remove high-impact filter">
              High impact only <X size={14} />
            </Chip>
          )}
          {categorySel.map((c) => (
            <Chip key={c} onClick={() => setCategorySel((arr) => arr.filter((x) => x !== c))} ariaLabel={`Remove ${c} filter`}>
              {c} <X size={14} />
            </Chip>
          ))}
          {!highOnly && categorySel.length === 0 && (
            <span className="text-sm text-[var(--muted,#6B7280)]">No active filters</span>
          )}
        </div>

        {/* Progress tracker */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2 text-sm text-[var(--muted,#6B7280)]"
            style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}
          >
            <span>Progress:</span>
            <div className="w-44 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--brand,#008CCD)]"
                style={
                  {
                    width: `${Math.min(100, Math.round((addressedCount / (suggestions.length || 1)) * 100))}%`,
                    "--brand": TOKENS.brand,
                  } as React.CSSProperties
                }
              />
            </div>
            <span>
              {addressedCount} / {suggestions.length} addressed
            </span>
          </div>
          <button
            onClick={() => {
              setDismissed([]);
              setAccepted([]);
              setToast({ open: true, text: "Progress reset" });
            }}
            className="text-sm text-[var(--blue,#0077FF)] hover:underline cursor-pointer"
            style={{ "--blue": TOKENS.valueBlue } as React.CSSProperties}
          >
            Reset
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-[var(--muted,#6B7280)]">
              <Loader2 className="animate-spin" size={16} /> Loading suggestions…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence initial={false}>
                {visibleSuggestions.map((s) => {
                  const categoryIco = categoryIcon(s.category);
                  return (
                    <motion.article
                      key={s.id}
                      role="article"
                      aria-label={s.title}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="relative rounded-lg border bg-white shadow-sm p-4 flex flex-col gap-3"
                      style={{ borderColor: TOKENS.borderLight }}
                    >
                      {/* Top-right dismiss */}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          aria-label="More actions"
                          className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => emit("bl_suggestion_more", { id: s.id })}
                        >
                          <MoreVertical size={16} />
                        </button>
                        <button
                          aria-label="Dismiss suggestion"
                          className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => onDismiss(s.id)}
                          title="Dismiss"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Header badges */}
                      <div className="flex items-start justify-between gap-3 pr-10">
                        <div className="flex items-center gap-2">
                          <Badge color={TOKENS.valueBlue} title="AI-generated">
                            <Brain size={12} /> AI
                          </Badge>
                          <Badge color={impactTone(s.impact)} title={impactLabel[s.impact]}>
                            {s.impact === "high" ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                            {impactLabel[s.impact]}
                          </Badge>
                          {s.externalOnly && (
                            <Badge color={TOKENS.external} title="External only">
                              <ExternalLink size={12} /> external
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Title with category icon */}
                      <h3 className="text-[16px] font-semibold leading-snug flex items-center gap-2">
                        <span
                          className="inline-flex items-center justify-center h-6 w-6 rounded-md"
                          style={{ backgroundColor: "#F2F7FB", color: TOKENS.valueBlue }}
                        >
                          {categoryIco}
                        </span>
                        {s.title}
                      </h3>

                      {/* Body / Evidence */}
                      <p className="text-[14px] text-[var(--muted,#6B7280)]" style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}>
                        {s.desc}
                      </p>

                      {/* Inline metrics chips */}
                      <div className="flex flex-wrap items-center gap-2">
                        {typeof s.metrics.pages === "number" && <Pill text={`${s.metrics.pages} pages`} />}
                        {typeof s.metrics.totalLinks === "number" && <Pill text={`${s.metrics.totalLinks} broken links`} />}
                        {typeof s.metrics.traffic === "number" && <Pill text={`~${s.metrics.traffic.toLocaleString()} monthly visits`} />}
                      </div>

                      {/* Examples with scope + status badges */}
                      {s.examples?.length ? (
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-[color:var(--muted,#6B7280)]">Examples</div>
                          <div className="flex flex-wrap items-center gap-2">
                            {s.examples.slice(0, 2).map((ex, i) => {
                              const ico = (
                                <span
                                  className="inline-flex items-center justify-center h-4 w-4 rounded-[4px]"
                                  style={{ backgroundColor: `${(ex.scope === "internal" ? TOKENS.internal : TOKENS.external)}14`, color: ex.scope === "internal" ? TOKENS.internal : TOKENS.external }}
                                >
                                  {ex.scope === "internal" ? <Link2 size={12} /> : <ExternalLink size={12} />}
                                </span>
                              );
                              return (
                                <Pill
                                  key={i}
                                  icon={ico}
                                  text={`${ex.url} · ${ex.page}`}
                                  title="Click to view in table"
                                  onClick={() => {
                                    setToast({ open: true, text: `Scroll to table & filter by ${ex.url}` });
                                    emit("bl_table_filtered", {
                                      userId: "demo",
                                      projectId: "p-1",
                                      filterSummary: ex.url,
                                      timestamp: Date.now(),
                                    });
                                    // bubble event for host app routing/scroll
                                    window.dispatchEvent(new CustomEvent("wr:scroll-to-broken-table", { detail: { url: ex.url } }));
                                  }}
                                />
                              );
                            })}
                          </div>
                          {/* mini legend */}
                          <div className="flex flex-wrap items-center gap-2">
                            <ScopeBadge scope="internal" />
                            <ScopeBadge scope="external" />
                            <StatusBadge status={404} />
                            <StatusBadge status={410} />
                            <StatusBadge status={500} />
                          </div>
                        </div>
                      ) : null}

                      {/* Confidence & provenance row */}
                      <div
                        className="flex items-center justify-between gap-2 text-xs text-[var(--muted,#6B7280)]"
                        style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-2">
                          <span>Confidence: {confidenceLabel(s.confidence)}</span>
                          <span>· based on crawl {s.provenance.crawlId}</span>
                          <button
                            onClick={() => setExplainFor(s)}
                            className="inline-flex items-center gap-1 text-[var(--blue,#0077FF)] hover:underline cursor-pointer"
                            style={{ "--blue": TOKENS.valueBlue } as React.CSSProperties}
                          >
                            <Info size={14} /> Explain
                          </button>
                        </div>
                        <span className="text-[11px]">{new Date(s.generatedAt).toLocaleString()}</span>
                      </div>

                      {/* CTA row */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {s.actions.canCreateTask && (
                          <button
                            onClick={() => onCreateTask(s)}
                            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm text-white cursor-pointer"
                            style={{ backgroundColor: TOKENS.brand }}
                            aria-label={`Create fix task for ${s.title}`}
                          >
                            <ClipboardIcon /> Create Task
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setToast({ open: true, text: "Applied table filters" });
                            emit("bl_table_view_affected", {
                              userId: "demo",
                              projectId: "p-1",
                              filterSummary: "view-affected",
                              timestamp: Date.now(),
                            });
                            window.dispatchEvent(new CustomEvent("wr:scroll-to-broken-table", { detail: { suggestionId: s.id } }));
                          }}
                          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm border hover:bg-gray-50 cursor-pointer"
                          style={{ borderColor: TOKENS.borderLight }}
                        >
                          <ExternalLink size={16} /> View Affected Pages
                        </button>
                        {s.actions.canReplace && (
                          <button
                            onClick={() => setReplaceFor(s)}
                            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm border hover:bg-gray-50 cursor-pointer"
                            style={{ borderColor: TOKENS.borderLight }}
                          >
                            <ArrowUpRight size={16} /> Replace Links
                          </button>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {!loading && visibleSuggestions.length === 0 && (
            <div
              className="p-6 text-center text-[var(--muted,#6B7280)]"
              style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}
            >
              <CheckCircle2 className="mx-auto mb-2" color={TOKENS.good} />
              <p>All caught up! No suggestions matching current filters.</p>
              {dismissed.length > 0 && (
                <button
                  onClick={undoLastDismiss}
                  className="mt-2 text-[var(--blue,#0077FF)] hover:underline cursor-pointer"
                  style={{ "--blue": TOKENS.valueBlue } as React.CSSProperties}
                >
                  Undo last dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Explain Modal */}
      <ModalShell open={!!explainFor} onClose={() => setExplainFor(null)} title={`Explain: ${explainFor?.title ?? ""}`}>
        {explainFor && (
          <div className="space-y-4">
            <div
              className="text-sm text-[var(--muted,#6B7280)]"
              style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}
            >
              <p className="mb-2">Top signals contributing to this suggestion:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>BrokenLinks (w 0.45): {explainFor.metrics.totalLinks ?? 0}</li>
                <li>TrafficExposure (w 0.35): ~{(explainFor.metrics.traffic ?? 0).toLocaleString()} sessions/mo</li>
                <li>PagesImpacted (w 0.20): {explainFor.metrics.pages ?? 0}</li>
              </ul>
              <p className="mt-3 text-xs">
                Crawl: {explainFor.provenance.crawlId} · Model: {explainFor.provenance.modelVersion ?? "wranker-bl-1.0"} ·
                Snapshot: {explainFor.provenance.ga4Snapshot ?? "—"} · {new Date(explainFor.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="border rounded-md" style={{ borderColor: TOKENS.borderLight }}>
              <div className="px-3 py-2 border-b text-sm font-medium" style={{ borderColor: TOKENS.borderLight }}>
                Sample rows
              </div>
              <div className="overflow-x-auto p-3">
                <table className="min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-[13px] text-[var(--muted,#6B7280)]" style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}>
                      <th className="py-1 pr-3">Broken URL</th>
                      <th className="py-1 pr-3">Page</th>
                      <th className="py-1 pr-3">HTTP</th>
                      <th className="py-1 pr-3">Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {explainFor.examples.slice(0, 5).map((e, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: TOKENS.borderLight }}>
                        <td className="py-1 pr-3">{e.url}</td>
                        <td className="py-1 pr-3">{e.page ?? "—"}</td>
                        <td className="py-1 pr-3">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="py-1 pr-3">
                          <ScopeBadge scope={e.scope} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </ModalShell>

      {/* Replace Links Drawer */}
      <RightDrawer open={!!replaceFor} onClose={() => setReplaceFor(null)} title="Replace Links (Preview)" width={640}>
        {replaceFor && <ReplaceForm suggestion={replaceFor} onSubmit={() => { onAccept(replaceFor, "replace"); setReplaceFor(null); }} />}
      </RightDrawer>

      <Toast open={toast.open} text={toast.text} onClose={() => setToast({ open: false, text: "" })} />
    </div>
  );
}

/* ───────────────────────── Forms ───────────────────────── */
function TaskForm({ suggestion, onSubmit }: { suggestion: Suggestion; onSubmit: (payload: any) => void }) {
  const [title, setTitle] = useState(suggestion.title);
  const [priority, setPriority] = useState(
    suggestion.impact === "high" ? "High" : suggestion.impact === "moderate" ? "Medium" : "Low"
  );
  const [desc, setDesc] = useState(
    `${suggestion.desc}\n\nPages impacted (${suggestion.metrics.pages ?? 0}):\n${suggestion.examples
      .map((e) => `• ${e.page} — ${e.url} (HTTP ${e.status}, ${e.scope})`)
      .join("\n")}`
  );
  const [assignee, setAssignee] = useState("Unassigned");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          title,
          priority,
          assignee,
          desc,
          affectedPages: Array.from(new Set(suggestion.examples.map((e) => e.page))).filter(Boolean),
        });
      }}
    >
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-9 px-2 rounded border"
          style={{ borderColor: TOKENS.borderLight }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full h-9 px-2 rounded border bg-white cursor-pointer"
            style={{ borderColor: TOKENS.borderLight }}
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </Field>
        <Field label="Assignee">
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full h-9 px-2 rounded border bg-white cursor-pointer"
            style={{ borderColor: TOKENS.borderLight }}
          >
            <option>Unassigned</option>
            <option>SEO Team</option>
            <option>Content Team</option>
            <option>Engineering</option>
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full h-32 p-2 rounded border"
          style={{ borderColor: TOKENS.borderLight }}
        />
      </Field>
      <div className="pt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          className="h-9 px-3 rounded-md border hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: TOKENS.borderLight }}
          onClick={() => window.dispatchEvent(new Event("close-task"))}
        >
          Cancel
        </button>
        <button type="submit" className="h-9 px-3 rounded-md text-white cursor-pointer" style={{ backgroundColor: TOKENS.brand }}>
          Create Task
        </button>
      </div>
    </form>
  );
}

function ReplaceForm({ suggestion, onSubmit }: { suggestion: Suggestion; onSubmit: () => void }) {
  const [confirm, setConfirm] = useState("");
  const proposed = useMemo(() => {
    // naive proposal: internalize or point to /resources if external 404s
    return suggestion.examples.map((e, i) => ({
      from: e.url,
      to:
        e.scope === "external"
          ? "/resources/alternative" // internal resource hub
          : e.url.replace(/^(\/.+)$/, "/fix$1"),
      status: e.status,
    }));
  }, [suggestion.examples]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted,#6B7280)]" style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}>
        Bulk replace links requires a dry‑run and explicit confirmation. Type <b>REPLACE</b> to proceed.
      </p>
      <div className="border rounded-md overflow-hidden" style={{ borderColor: TOKENS.borderLight }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-2">From (Broken)</th>
              <th className="p-2">HTTP</th>
              <th className="p-2">Proposed To</th>
            </tr>
          </thead>
          <tbody>
            {proposed.map((row, i) => (
              <tr key={i} className="border-t" style={{ borderColor: TOKENS.borderLight }}>
                <td className="p-2">{row.from}</td>
                <td className="p-2">
                  <StatusBadge status={row.status} />
                </td>
                <td className="p-2">{row.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <input
          placeholder="Type REPLACE to confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="flex-1 h-9 px-2 rounded border"
          style={{ borderColor: TOKENS.borderLight }}
        />
        <button
          disabled={confirm !== "REPLACE"}
          onClick={onSubmit}
          className={clsx(
            "h-9 px-3 rounded-md text-white",
            confirm === "REPLACE" ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
          )}
          style={{ backgroundColor: TOKENS.brand }}
        >
          Confirm Replace
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Shared form bits ───────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--muted,#6B7280)] mb-1" style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}>
        {label}
      </div>
      {children}
    </label>
  );
}

function ClipboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
