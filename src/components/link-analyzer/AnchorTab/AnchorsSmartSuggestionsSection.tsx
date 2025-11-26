
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
  ArrowLeftRight,
  // Status/icons
  AlertTriangle,
  CheckCircle2,
  // Anchor type icons (branded)
  Target,
  Quote,
  Search,
  Tag,
  Image,
  MousePointerClick,
} from "lucide-react";

/**
 * Wranker — Anchors (Tab 3) → SECTION 5: Smart Suggestions (AI)
 * Update: Inter font, branded icons, pointer cursors, top-right dismiss (X),
 * no bottom "Dismiss" CTA, and anchor-type badges on examples.
 * Tailwind-only; no external UI lib.
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
  // Anchor palette
  exact: "#0B63D6",
  phrase: "#4AA3FF",
  partial: "#0EA5A6",
  branded: "#6366F1",
  generic: "#9CA3AF",
  imageOnly: "#FCA5A5",
} as const;

/* ───────────────────────── Utilities ───────────────────────── */
function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Impact = "high" | "moderate" | "quickwin";
type Confidence = "high" | "medium" | "low";
type Suggestion = {
  id: string;
  title: string;
  desc: string;
  impact: Impact;
  confidence: Confidence;
  metrics: Record<string, number> & {
    instances?: number;
    pages?: number;
    exactMatchRate?: number; // 0–1
    genericPct?: number; // 0–100
    brandedPct?: number; // 0–100
  };
  examples: Array<{ anchor: string; page?: string; instanceId?: string }>;
  actions: {
    canCreateTask?: boolean;
    canSuggestRewrites?: boolean;
    canReplace?: boolean;
  };
  provenance: {
    crawlId: string;
    gscSnapshot?: string;
    modelVersion?: string;
  };
  generatedAt: string; // ISO
  category: "Anchor-related" | "Page-focused" | "Replacement-ready";
};

const impactTone = (impact: Impact) =>
  impact === "high" ? TOKENS.danger : impact === "moderate" ? TOKENS.warn : TOKENS.good;

const impactLabel: Record<Impact, string> = {
  high: "High Impact",
  moderate: "Moderate",
  quickwin: "Quick Win",
};

const confidenceLabel = (c: Confidence) => c[0].toUpperCase() + c.slice(1);

/* ───────────────────────── Mock API ───────────────────────── */
const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: "s-1001",
    title: "Too many generic anchors like ‘click here’",
    desc: "86 instances across 42 pages. Replace with descriptive anchors to improve context.",
    impact: "high",
    confidence: "high",
    metrics: { instances: 86, pages: 42, genericPct: 21.3 },
    examples: [
      { anchor: "click here", page: "/blog/keyword-research" },
      { anchor: "read more", page: "/services/seo-audit" },
    ],
    actions: { canCreateTask: true, canSuggestRewrites: true, canReplace: true },
    provenance: { crawlId: "c-4321", gscSnapshot: "gsc-2025-08-20", modelVersion: "wranker-aqs-1.0" },
    generatedAt: "2025-08-22T09:10:00Z",
    category: "Anchor-related",
  },
  {
    id: "s-1002",
    title: "Exact-match anchors at 42% — risk of over-optimization",
    desc: "Anchor ‘seo tools’ appears on 61 pages; diversify to phrase variations.",
    impact: "moderate",
    confidence: "medium",
    metrics: { pages: 61, exactMatchRate: 0.42 },
    examples: [
      { anchor: "seo tools", page: "/blog/best-seo-tools" },
      { anchor: "seo tools", page: "/compare/ahrefs-vs-semrush" },
    ],
    actions: { canCreateTask: true, canSuggestRewrites: true },
    provenance: { crawlId: "c-4321", gscSnapshot: "gsc-2025-08-20", modelVersion: "wranker-aqs-1.0" },
    generatedAt: "2025-08-22T09:12:00Z",
    category: "Anchor-related",
  },
  {
    id: "s-1003",
    title: "Branded anchors are underutilized",
    desc: "Branded text used in only 4% of links. Suggest pages to add branded anchors.",
    impact: "quickwin",
    confidence: "medium",
    metrics: { brandedPct: 4, pages: 28 },
    examples: [
      { anchor: "Wranker", page: "/blog/internal-linking" },
      { anchor: "Wranker platform", page: "/case-studies/automation" },
    ],
    actions: { canCreateTask: true },
    provenance: { crawlId: "c-4321", modelVersion: "wranker-aqs-1.0" },
    generatedAt: "2025-08-22T09:13:40Z",
    category: "Page-focused",
  },
  {
    id: "s-1004",
    title: "Image-only anchors detected — add descriptive text",
    desc: "14 instances using images without alt/label. Improves accessibility & context.",
    impact: "moderate",
    confidence: "high",
    metrics: { instances: 14, pages: 9 },
    examples: [
      { anchor: "[image]", page: "/blog/schema-markup" },
      { anchor: "[image]", page: "/home" },
    ],
    actions: { canCreateTask: true, canReplace: true },
    provenance: { crawlId: "c-4321", modelVersion: "wranker-aqs-1.0" },
    generatedAt: "2025-08-22T09:18:10Z",
    category: "Replacement-ready",
  },
];

function mockFetchSuggestions(
  filters: Partial<{ highOnly: boolean; categories: Array<Suggestion["category"]> }>
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
  onClick,
  title,
  icon,
}: {
  text: string;
  onClick?: () => void;
  title?: string;
  icon?: React.ReactNode;
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

/* ───────────────────────── Anchor type badges ───────────────────────── */
type AnchorType = "exact" | "phrase" | "partial" | "branded" | "generic" | "imageOnly";

const anchorIcon: Record<AnchorType, React.ReactNode> = {
  exact: <Target size={12} />,
  phrase: <Quote size={12} />,
  partial: <Search size={12} />,
  branded: <Tag size={12} />,
  generic: <MousePointerClick size={12} />,
  imageOnly: <Image size={12} />,
};

const anchorColor: Record<AnchorType, string> = {
  exact: TOKENS.exact,
  phrase: TOKENS.phrase,
  partial: TOKENS.partial,
  branded: TOKENS.branded,
  generic: TOKENS.generic,
  imageOnly: TOKENS.imageOnly,
};

function detectAnchorType(anchor: string, contextTitle?: string): AnchorType {
  const a = anchor.trim().toLowerCase();
  if (a === "[image]" || a === "image") return "imageOnly";
  if (/(click here|read more|learn more|here|more|this)/.test(a)) return "generic";
  if (/wranker/.test(a)) return "branded";
  if (contextTitle && /exact[-\s]?match|over-optim/i.test(contextTitle)) return "exact";
  if (a.split(/\s+/).length >= 2) return "phrase";
  return "partial";
}

function AnchorTypeBadge({ type }: { type: AnchorType }) {
  const color = anchorColor[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full text-[10px] font-medium"
      style={{ backgroundColor: `${color}14`, color }}
      title={`Type: ${type}`}
    >
      {anchorIcon[type]}
      {type}
    </span>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
export default function AnchorsSmartSuggestionsSection() {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highOnly, setHighOnly] = useState(false);
  const [categorySel, setCategorySel] = useState<Array<Suggestion["category"]>>([]);

  const [explainFor, setExplainFor] = useState<Suggestion | null>(null);
  const [taskFor, setTaskFor] = useState<Suggestion | null>(null);
  const [replaceFor, setReplaceFor] = useState<Suggestion | null>(null);
  const [alternativesFor, setAlternativesFor] = useState<Suggestion | null>(null);

  const [dismissed, setDismissed] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" });

  const activeFilters = useMemo(() => ({ highOnly, categories: categorySel }), [highOnly, categorySel]);

  async function load() {
    setLoading(true);
    const data = await mockFetchSuggestions(activeFilters);
    setSuggestions(data);
    setLoading(false);
    emit("ai_suggestion_viewed", {
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
    emit("ai_suggestion_dismissed", { userId: "demo", projectId: "p-1", suggestionId: id, timestamp: Date.now() });
  }

  function undoLastDismiss() {
    setDismissed((d) => d.slice(0, -1));
  }

  function onCreateTask(s: Suggestion) {
    setTaskFor(s);
  }

  function onAccept(s: Suggestion, action: string) {
    setAccepted((a) => (a.includes(s.id) ? a : [...a, s.id]));
    setToast({ open: true, text: `Action queued: ${action}` });
    emit("ai_suggestion_accepted", {
      userId: "demo",
      projectId: "p-1",
      suggestionId: s.id,
      action,
      timestamp: Date.now(),
    });
  }

  function exportCSV(rows: Suggestion[]) {
    const header = ["suggestionId", "title", "impact", "confidence", "instances", "pages", "generatedAt"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [r.id, r.title, r.impact, r.confidence, r.metrics.instances ?? "", r.metrics.pages ?? "", r.generatedAt]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anchor_suggestions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    emit("anchor_trends_exported", { userId: "demo", projectId: "p-1", filterSummary: activeFilters, timestamp: Date.now() });
  }

  /* Category → branded icon for card titles */
  const categoryIcon = (c: Suggestion["category"]) =>
    c === "Anchor-related" ? <Link2 size={16} /> : c === "Page-focused" ? <FileText size={16} /> : <ArrowLeftRight size={16} />;

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
      <section className="mx-auto w-full max-w-[1200px] border rounded-lg bg-white" style={{ borderColor: TOKENS.borderLight }}>
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
            {(["Anchor-related", "Page-focused", "Replacement-ready"] as const).map((c) => (
              <Chip
                key={c}
                active={categorySel.includes(c)}
                onClick={() =>
                  setCategorySel((arr) => (arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]))
                }
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
            <Chip
              key={c}
              onClick={() => setCategorySel((arr) => arr.filter((x) => x !== c))}
              ariaLabel={`Remove ${c} filter`}
            >
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
                          onClick={() => emit("ai_suggestion_more", { id: s.id })}
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
                        </div>
                      </div>

                      {/* Title with category icon */}
                      <h3 className="text-[16px] font-semibold leading-snug flex items-center gap-2">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md" style={{ backgroundColor: "#F2F7FB", color: TOKENS.valueBlue }}>
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
                        {typeof s.metrics.instances === "number" && <Pill text={`${s.metrics.instances} instances`} />}
                        {typeof s.metrics.pages === "number" && <Pill text={`${s.metrics.pages} pages`} />}
                        {typeof s.metrics.exactMatchRate === "number" && (
                          <Pill text={`Exact-match ${(s.metrics.exactMatchRate * 100).toFixed(0)}%`} />
                        )}
                        {typeof s.metrics.genericPct === "number" && (
                          <Pill text={`Generic ${s.metrics.genericPct.toFixed(1)}%`} />
                        )}
                        {typeof s.metrics.brandedPct === "number" && (
                          <Pill text={`Branded ${s.metrics.brandedPct.toFixed(1)}%`} />
                        )}
                      </div>

                      {/* Examples with Anchor Type badges + icon */}
                      {s.examples?.length ? (
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-[color:var(--muted,#6B7280)]">Examples</div>
                          <div className="flex flex-wrap items-center gap-2">
                            {s.examples.slice(0, 2).map((ex, i) => {
                              const type = detectAnchorType(ex.anchor, s.title);
                              const ico = (
                                <span
                                  className="inline-flex items-center justify-center h-4 w-4 rounded-[4px]"
                                  style={{ backgroundColor: `${anchorColor[type]}14`, color: anchorColor[type] }}
                                >
                                  {/* tiny icon */}
                                  {anchorIcon[type]}
                                </span>
                              );
                              return (
                                <Pill
                                  key={i}
                                  icon={ico}
                                  text={`“${ex.anchor}”${ex.page ? ` · ${ex.page}` : ""}`}
                                  title="Click to view in table"
                                  onClick={() => {
                                    setToast({ open: true, text: `Scroll to table & filter by ${ex.anchor}` });
                                    emit("anchor_distribution_filtered", {
                                      userId: "demo",
                                      projectId: "p-1",
                                      filterSummary: ex.anchor,
                                      timestamp: Date.now(),
                                    });
                                  }}
                                />
                              );
                            })}
                          </div>
                          {/* mini legend */}
                          <div className="flex flex-wrap items-center gap-2">
                            {(["exact", "phrase", "partial", "branded", "generic", "imageOnly"] as AnchorType[]).map((t) => (
                              <AnchorTypeBadge key={t} type={t} />
                            ))}
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
                          <span>· based on crawl 2025-08-21</span>
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

                      {/* CTA row (no bottom Dismiss) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {s.actions.canCreateTask && (
                          <button
                            onClick={() => onCreateTask(s)}
                            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm text-white cursor-pointer"
                            style={{ backgroundColor: TOKENS.brand }}
                            aria-label={`Create optimization task for ${s.title}`}
                          >
                            <ClipboardIcon /> Create Task
                          </button>
                        )}
                        {s.actions.canSuggestRewrites && (
                          <button
                            onClick={() => setAlternativesFor(s)}
                            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm border hover:bg-gray-50 cursor-pointer"
                            style={{ borderColor: TOKENS.borderLight }}
                          >
                            <Sparkles size={16} /> Generate Phrase Alternatives
                          </button>
                        )}
                        {s.actions.canReplace && (
                          <button
                            onClick={() => setReplaceFor(s)}
                            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm border hover:bg-gray-50 cursor-pointer"
                            style={{ borderColor: TOKENS.borderLight }}
                          >
                            <ArrowUpRight size={16} /> Replace Anchors
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setToast({ open: true, text: "Applied table filters" });
                            emit("anchor_table_bulk_action", {
                              userId: "demo",
                              projectId: "p-1",
                              filterSummary: "view-affected",
                              timestamp: Date.now(),
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm border hover:bg-gray-50 cursor-pointer"
                          style={{ borderColor: TOKENS.borderLight }}
                        >
                          <ExternalLink size={16} /> View Affected Pages
                        </button>
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
                <li>ExactMatchRate (w 0.40): {(explainFor.metrics.exactMatchRate ?? 0) * 100}%</li>
                <li>AQS (w 0.30): 32</li>
                <li>SiteTrafficExposure (w 0.30): top pages ~5k visits/mo</li>
              </ul>
              <p className="mt-3 text-xs">
                Crawl: {explainFor.provenance.crawlId} · Model: {explainFor.provenance.modelVersion ?? "wranker-aqs-1.0"} ·
                Snapshot: {explainFor.provenance.gscSnapshot ?? "—"} · {new Date(explainFor.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="border rounded-md" style={{ borderColor: TOKENS.borderLight }}>
              <div className="px-3 py-2 border-b text-sm font-medium" style={{ borderColor: TOKENS.borderLight }}>
                Sample rows
              </div>
              <div className="overflow-x-auto p-3">
                <table className="min-w-[480px] text-sm">
                  <thead>
                    <tr className="text-left text-[13px] text-[var(--muted,#6B7280)]" style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}>
                      <th className="py-1 pr-3">Anchor</th>
                      <th className="py-1 pr-3">Page</th>
                      <th className="py-1 pr-3">Instances</th>
                    </tr>
                  </thead>
                  <tbody>
                    {explainFor.examples.slice(0, 5).map((e, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: TOKENS.borderLight }}>
                        <td className="py-1 pr-3">{e.anchor}</td>
                        <td className="py-1 pr-3">{e.page ?? "—"}</td>
                        <td className="py-1 pr-3">
                          {Math.ceil((explainFor.metrics.instances ?? 1) / Math.max(1, explainFor.examples.length))}
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

      {/* Task Creation Drawer */}
      <RightDrawer open={!!taskFor} onClose={() => setTaskFor(null)} title="Create Optimization Task" width={520}>
        {taskFor && <TaskForm suggestion={taskFor} onSubmit={() => { onAccept(taskFor, "create_task"); setTaskFor(null); }} />}
      </RightDrawer>

      {/* Replace Anchors Drawer */}
      <RightDrawer open={!!replaceFor} onClose={() => setReplaceFor(null)} title="Replace Anchors" width={520}>
        {replaceFor && <ReplaceForm suggestion={replaceFor} onSubmit={() => { onAccept(replaceFor, "replace"); setReplaceFor(null); }} />}
      </RightDrawer>

      {/* Alternatives Modal */}
      <ModalShell
        open={!!alternativesFor}
        onClose={() => setAlternativesFor(null)}
        title="Generate Phrase Alternatives"
      >
        {alternativesFor && (
          <AlternativesForm
            suggestion={alternativesFor}
            onSubmit={() => {
              onAccept(alternativesFor, "generate_alternatives");
              setAlternativesFor(null);
            }}
          />
        )}
      </ModalShell>

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
    `${suggestion.desc}\n\nExamples:\n${suggestion.examples
      .map((e) => `• ${e.anchor}${e.page ? ` — ${e.page}` : ""}`)
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
          affectedPages: suggestion.examples.map((e) => e.page).filter(Boolean),
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
  const proposed = useMemo(
    () =>
      suggestion.examples.map((e, i) => ({
        from: e.anchor,
        to: `Replace “${e.anchor}” with a descriptive phrase ${i + 1}`,
      })),
    [suggestion.examples]
  );

  return (
    <div className="space-y-3">
      <p
        className="text-sm text-[var(--muted,#6B7280)]"
        style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}
      >
        Bulk replace anchors requires a dry‑run and explicit confirmation. Type <b>REPLACE</b> to proceed.
      </p>
      <div className="border rounded-md overflow-hidden" style={{ borderColor: TOKENS.borderLight }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-2">From</th>
              <th className="p-2">Proposed To</th>
            </tr>
          </thead>
          <tbody>
            {proposed.map((row, i) => (
              <tr key={i} className="border-t" style={{ borderColor: TOKENS.borderLight }}>
                <td className="p-2">{row.from}</td>
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

function AlternativesForm({ suggestion, onSubmit }: { suggestion: Suggestion; onSubmit: () => void }) {
  const seeds = suggestion.examples.map((e) => e.anchor);
  const [rows, setRows] = useState(
    seeds.map((s, i) => ({
      seed: s,
      picks: [`${s} guide`, `${s} tutorial`, `${s} best practices`].map((p) => ({ text: p, chosen: i === 0 })),
    }))
  );

  return (
    <div className="space-y-3">
      <div
        className="text-sm text-[var(--muted,#6B7280)]"
        style={{ "--muted": TOKENS.textMuted } as React.CSSProperties}
      >
        Select alternatives to apply or create tasks for. These are AI-suggested and should be reviewed.
      </div>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="border rounded-md p-3" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-sm font-medium mb-2">Seed anchor: “{row.seed}”</div>
            <div className="flex flex-wrap gap-2">
              {row.picks.map((p, j) => (
                <label
                  key={j}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-full border text-sm cursor-pointer hover:bg-gray-50"
                  style={{ borderColor: TOKENS.borderLight }}
                >
                  <input
                    type="checkbox"
                    checked={p.chosen}
                    onChange={(e) => {
                      setRows((prev) =>
                        prev.map((r, ri) =>
                          ri === i
                            ? { ...r, picks: r.picks.map((pp, pj) => (pj === j ? { ...pp, chosen: e.target.checked } : pp)) }
                            : r
                        )
                      );
                    }}
                  />
                  {p.text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="pt-2 flex items-center justify-end gap-2">
        <button
          className="h-9 px-3 rounded-md border hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: TOKENS.borderLight }}
          onClick={() => onSubmit()}
        >
          Create Tasks
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
