"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ChevronDown,
  Search,
  Info,
  Plus,
  Minus,
  Check,
} from "lucide-react";

/**
 * ---------------------------------------------------------------------------
 * Wranker • Competitor Tracker → "Track Competitor Keyword" Modal
 * ---------------------------------------------------------------------------
 * - No external UI libs (just React + lucide-react + Tailwind)
 * - Fully typed + accessible (aria + keyboard)
 * - Includes validation, dedupe (per competitor), mock toast, and a demo wrapper
 *
 * EXPORTS:
 *   1) TrackCompetitorKeywordModal (named) — the actual modal (drop-in)
 *   2) default Demo_TrackCompetitorKeywordModal — demo harness with mock data
 *
 * HOW TO USE (real app):
 *   <TrackCompetitorKeywordModal
 *     open={isOpen}
 *     onClose={() => setIsOpen(false)}
 *     competitors={[{id:"c1", domain:"comp1.com"}, ...]}
 *     currentCompetitorId="c1"
 *     tracked={{ c1: ["best seo tools", "schema generator"] }} // optional
 *     onSubmit={(payload) => api.trackKeyword(payload)}
 *   />
 */

// ------------------------------ TOKENS ------------------------------------
const TK = {
  brand: "#1090D0", // primary (You)
  brandHover: "#0C7FB6",
  compBlue: "#0077FF", // competitor blue accent
  border: "#EFF0F6",
  text: "#282829",
  muted: "#6B7280",
  chipBg: "#F5F7FA",
  danger: "#F04438",
  dangerText: "#B42318",
  focusRing: "rgba(16,144,208,0.25)",
} as const;

// ------------------------------ TYPES -------------------------------------
type Intent = "informational" | "navigational" | "commercial" | "transactional" | null;
type Feature = "FS" | "PAA" | "SITELINKS" | "IMAGE" | "VIDEO" | "TOP_STORIES";

export type CompetitorLite = { id: string; domain: string; nickname?: string };

export type TrackCompetitorKeywordPayload = {
  competitorId: string;
  keyword: string; // normalized lowercase
  intent: Intent;
  features: Feature[];
  alerts: {
    rank: { enabled: boolean; improveBy: number }; // 1..20
    features: { enabled: boolean; watch: Feature[] };
  };
  notes?: string;
  source: "competitor-tracker/keyword-modal";
};

// ------------------------------ HELPERS -----------------------------------
function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function normalizeKeyword(raw: string) {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}
function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
}

// ------------------------------ POPOVER -----------------------------------
function InfoPopover({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center align-middle group cursor-help">
      <Info size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className="invisible group-hover:visible absolute left-1/2 top-full z-50 mt-1 w-72 -translate-x-1/2 rounded-md border bg-white p-2 text-xs leading-snug text-[#111827] shadow"
        style={{ borderColor: TK.border }}
      >
        {text}
      </span>
    </span>
  );
}

// ------------------------------ TOAST (mock) ------------------------------
function Toast({ show, message }: { show: boolean; message: string }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "fixed left-1/2 z-[70] -translate-x-1/2 transition-all",
        show ? "bottom-6 opacity-100" : "-bottom-10 opacity-0"
      )}
    >
      <div
        className="rounded-md border px-3 py-2 text-sm shadow"
        style={{ background: "#fff", borderColor: TK.border, color: TK.text }}
      >
        {message}
      </div>
    </div>
  );
}

// ------------------------------ FEATURE CHIPS -----------------------------
const FEATURE_META: Record<Feature, { icon: string; label: string }> = {
  FS: { icon: "🔥", label: "Featured Snippet" },
  PAA: { icon: "💡", label: "People Also Ask" },
  IMAGE: { icon: "🖼️", label: "Image" },
  SITELINKS: { icon: "⭐", label: "Sitelinks" },
  VIDEO: { icon: "🎥", label: "Video" },
  TOP_STORIES: { icon: "📰", label: "Top Stories" },
};

function FeatureChip({
  code,
  active,
  onToggle,
}: {
  code: Feature;
  active: boolean;
  onToggle: (next: boolean) => void;
}) {
  const meta = FEATURE_META[code];
  return (
    <button
      type="button"
      onClick={() => onToggle(!active)}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm",
        active ? "font-semibold" : ""
      )}
      style={{
        borderColor: TK.border,
        background: active ? TK.chipBg : "#fff",
        color: active ? TK.compBlue : TK.text,
      }}
      title={meta.label}
    >
      <span className="text-base leading-none">{meta.icon}</span>
      <span>{code}</span>
      {active && <Check size={14} className="text-[#10B981]" />}
    </button>
  );
}

// ------------------------------ INTENT RADIOS -----------------------------
const INTENT_ORDER: NonNullable<Intent>[] = [
  "informational",
  "navigational",
  "commercial",
  "transactional",
];
const INTENT_LABEL: Record<NonNullable<Intent>, string> = {
  informational: "Informational",
  navigational: "Navigational",
  commercial: "Commercial",
  transactional: "Transactional",
};
const INTENT_TONE: Record<NonNullable<Intent>, { dot: string; tint: string }> = {
  informational: { dot: "#14B8A6", tint: "rgba(20,184,166,.10)" }, // teal
  navigational: { dot: "#7C3AED", tint: "rgba(124,58,237,.10)" }, // violet
  commercial: { dot: "#F59E0B", tint: "rgba(245,158,11,.12)" }, // amber
  transactional: { dot: "#F43F5E", tint: "rgba(244,63,94,.10)" }, // rose
};

function IntentRadio({
  value,
  selected,
  onChange,
}: {
  value: NonNullable<Intent>;
  selected: Intent;
  onChange: (v: NonNullable<Intent>) => void;
}) {
  const act = selected === value;
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1 text-sm",
        act ? "font-semibold" : ""
      )}
      style={{
        borderColor: TK.border,
        background: act ? INTENT_TONE[value].tint : "#fff",
      }}
    >
      <input
        type="radio"
        className="sr-only"
        checked={act}
        onChange={() => onChange(value)}
      />
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: INTENT_TONE[value].dot }}
      />
      {INTENT_LABEL[value]}
    </label>
  );
}

// ------------------------------ DROPDOWN (Competitor) ---------------------
function CompetitorDropdown({
  items,
  value,
  onChange,
}: {
  items: CompetitorLite[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  const active = items.find((x) => x.id === value) ?? items[0];
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter(
      (it) =>
        it.domain.toLowerCase().includes(s) ||
        (it.nickname ?? "").toLowerCase().includes(s)
    );
  }, [q, items]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-[#F7FAFC]"
        style={{ borderColor: TK.border, color: TK.text, background: "#fff" }}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        Competitor: <b>{active?.nickname ? `${active.nickname} (${active.domain})` : active?.domain}</b>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[320px] overflow-hidden rounded-md border bg-white shadow"
          style={{ borderColor: TK.border }}
          role="listbox"
          aria-label="Select competitor"
        >
          <div
            className="flex items-center gap-2 border-b px-3 py-2"
            style={{ borderColor: TK.border }}
          >
            <Search size={14} className="text-[#9CA3AF]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search competitors..."
              className="w-full text-sm outline-none placeholder:text-[#9CA3AF]"
            />
          </div>
          <div className="max-h-[240px] overflow-auto">
            {filtered.map((it) => (
              <button
                key={it.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onChange(it.id);
                  setOpen(false);
                }}
                role="option"
                aria-selected={it.id === value}
              >
                <span className="font-medium">
                  {it.nickname ?? it.domain}
                </span>
                {it.nickname && (
                  <span className="ml-1 text-[#9CA3AF]">({it.domain})</span>
                )}
                {!it.nickname && (
                  <span className="ml-auto text-[#9CA3AF]">{it.domain}</span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-[#6B7280]">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------ MODAL -------------------------------------
export function TrackCompetitorKeywordModal({
  open,
  onClose,
  competitors,
  currentCompetitorId,
  tracked, // optional — map of competitorId -> string[] (already tracked keywords)
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  competitors: CompetitorLite[];
  currentCompetitorId?: string;
  tracked?: Record<string, string[]>;
  onSubmit?: (payload: TrackCompetitorKeywordPayload) => Promise<void> | void;
}) {
  // ------- local state
  const initialComp = competitors[0]?.id ?? "";
  const [competitorId, setCompetitorId] = useState<string>(
    currentCompetitorId ?? initialComp
  );
  const [keywordRaw, setKeywordRaw] = useState("");
  const [intent, setIntent] = useState<Intent>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [alertRankOn, setAlertRankOn] = useState(true);
  const [improveBy, setImproveBy] = useState(3);
  const [alertFeatOn, setAlertFeatOn] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errKw, setErrKw] = useState<string | null>(null);

  const keywordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => keywordRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    // reset feature alert toggle if no features selected
    if (features.length === 0) setAlertFeatOn(false);
  }, [features]);

  useEffect(() => {
    // ensure competitorId is valid as list may be async
    if (!competitors.find((c) => c.id === competitorId)) {
      setCompetitorId(competitors[0]?.id ?? "");
    }
  }, [competitors]);

  // ------- dedupe set (lowercased normalized)
  const trackedSet = useMemo(() => {
    const set = new Set<string>();
    const list = tracked?.[competitorId] ?? [];
    list.forEach((kw) => set.add(normalizeKeyword(kw)));
    return set;
  }, [tracked, competitorId]);

  // ------- validation
  function validateKeyword(): string | null {
    const norm = normalizeKeyword(keywordRaw);
    if (!norm) return "Please enter a keyword.";
    if (norm.length < 3 || norm.length > 80) return "Use 3–80 characters.";
    if (trackedSet.has(norm)) {
      const domain =
        competitors.find((c) => c.id === competitorId)?.domain ?? "this competitor";
      return `Already tracking this keyword for ${domain}.`;
    }
    return null;
  }

  useEffect(() => {
    if (!open) return;
    setErrKw(null);
  }, [open, competitorId]);

  function toggleFeature(code: Feature, next: boolean) {
    setFeatures((prev) =>
      next ? Array.from(new Set([...prev, code])) : prev.filter((f) => f !== code)
    );
  }

  async function handleSubmit() {
    const err = validateKeyword();
    setErrKw(err);
    if (err) return;

    const payload: TrackCompetitorKeywordPayload = {
      competitorId,
      keyword: normalizeKeyword(keywordRaw),
      intent,
      features,
      alerts: {
        rank: {
          enabled: alertRankOn,
          improveBy:
            alertRankOn && Number.isFinite(improveBy)
              ? Math.max(1, Math.min(20, Math.round(improveBy)))
              : 3,
        },
        features: { enabled: alertFeatOn && features.length > 0, watch: features },
      },
      notes: notes?.trim() ? notes.trim() : undefined,
      source: "competitor-tracker/keyword-modal",
    };

    try {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 500)); // simulate API
      await onSubmit?.(payload);
      // Success → return focus + close
      (document.activeElement as HTMLElement | null)?.blur();
      onClose();
      // fire a DOM custom event toast (demo harness listens) — or rely on parent
      document.dispatchEvent(
        new CustomEvent("wr-toast", {
          detail: { message: `Tracking initiated for keyword: ${payload.keyword}` },
        })
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="trkKwTitle" aria-describedby="trkKwHint">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={() => !loading && onClose()} />

      {/* Panel */}
      <div className="absolute left-1/2 top-1/2 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border bg-white shadow-lg max-w-[94vw]" style={{ borderColor: TK.border }}>
        {/* Header */}
        <div className="flex items-start justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
          <div>
            <h2 id="trkKwTitle" className="text-[16px] font-semibold" style={{ color: TK.text }}>
              🔍 Track Competitor Keyword
            </h2>
            <p id="trkKwHint" className="mt-0.5 text-xs" style={{ color: TK.muted }}>
              We’ll monitor rank and SERP feature changes for this query.
            </p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-auto px-4 py-4">
          {/* Competitor */}
          <div className="mb-4">
            <label className="mb-1 inline-flex items-center gap-1 text-sm font-medium" style={{ color: TK.text }}>
              Competitor
              <InfoPopover text="Choose the competitor for whom this keyword will be tracked." />
            </label>
            <div>
              <CompetitorDropdown
                items={competitors}
                value={competitorId}
                onChange={(id) => setCompetitorId(id)}
              />
            </div>
          </div>

          {/* Keyword */}
          <div className="mb-4">
            <label htmlFor="kw" className="mb-1 inline-flex items-center gap-1 text-sm font-medium" style={{ color: TK.text }}>
              Keyword to Track <span className="text-[#EF4444]">*</span>
              <InfoPopover text="We’ll track rank daily (or per schedule) and detect SERP feature changes." />
            </label>
            <input
              id="kw"
              ref={keywordRef}
              value={keywordRaw}
              onChange={(e) => setKeywordRaw(e.target.value)}
              onBlur={() => setErrKw(validateKeyword())}
              placeholder='e.g., "best seo tools"'
              className={cn(
                "h-10 w-full rounded-md border px-3 text-sm outline-none",
                errKw ? "border-[#F04438] bg-[rgba(240,68,56,.06)]" : "bg-white"
              )}
              style={{
                borderColor: errKw ? TK.danger : TK.border,
                boxShadow: errKw ? "none" : "0 0 0 0 rgba(0,0,0,0)",
              }}
              aria-invalid={!!errKw}
              aria-describedby={errKw ? "kw-error" : undefined}
            />
            {errKw && (
              <div id="kw-error" className="mt-1 text-xs" style={{ color: TK.dangerText }}>
                {errKw}
              </div>
            )}
          </div>

          {/* Intent */}
          <div className="mb-4">
            <div className="mb-1 inline-flex items-center gap-1 text-sm font-medium" style={{ color: TK.text }}>
              Intent (optional)
            </div>
            <div className="flex flex-wrap gap-2">
              {INTENT_ORDER.map((code) => (
                <IntentRadio key={code} value={code} selected={intent} onChange={(v) => setIntent(v)} />
              ))}
              {/* Clear selection */}
              <button
                type="button"
                className="ml-1 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm"
                style={{ borderColor: TK.border, color: TK.muted }}
                onClick={() => setIntent(null)}
                title="Clear intent"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="mb-4">
            <div className="mb-1 inline-flex items-center gap-1 text-sm font-medium" style={{ color: TK.text }}>
              Target SERP Features (optional)
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FEATURE_META) as Feature[]).map((f) => (
                <FeatureChip
                  key={f}
                  code={f}
                  active={features.includes(f)}
                  onToggle={(next) => toggleFeature(f, next)}
                />
              ))}
            </div>
          </div>

          {/* Alert Rules */}
          <div className="mb-4 rounded-md border p-3" style={{ borderColor: TK.border, background: "#FFF" }}>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium" style={{ color: TK.text }}>
              Alert Rules
              <InfoPopover text="Get notified when this keyword improves by N positions, or when selected SERP features are gained/lost." />
            </div>

            {/* Rank alert */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--wr-brand,#1090D0)]"
                  checked={alertRankOn}
                  onChange={(e) => setAlertRankOn(e.target.checked)}
                />
                Notify if rank improves by
              </label>

              {/* stepper */}
              <div className="inline-flex items-center">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-l-md border"
                  style={{ borderColor: TK.border, background: "#fff" }}
                  onClick={() => setImproveBy((n) => Math.max(1, Math.min(20, n - 1)))}
                  disabled={!alertRankOn}
                  aria-label="Decrease threshold"
                >
                  <Minus size={16} className="text-[#6B7280]" />
                </button>
                <input
                  type="number"
                  value={improveBy}
                  onChange={(e) =>
                    setImproveBy(() => {
                      const n = Number(e.target.value);
                      return Number.isFinite(n) ? Math.max(1, Math.min(20, Math.round(n))) : 3;
                    })
                  }
                  className="h-8 w-14 border-t border-b text-center outline-none"
                  style={{ borderColor: TK.border }}
                  min={1}
                  max={20}
                  disabled={!alertRankOn}
                />
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-r-md border"
                  style={{ borderColor: TK.border, background: "#fff" }}
                  onClick={() => setImproveBy((n) => Math.max(1, Math.min(20, n + 1)))}
                  disabled={!alertRankOn}
                  aria-label="Increase threshold"
                >
                  <Plus size={16} className="text-[#6B7280]" />
                </button>
              </div>

              <span className="text-sm" style={{ color: TK.muted }}>
                positions (lower number = better rank)
              </span>
            </div>

            {/* Feature alert (only if any feature selected) */}
            <div className={cn(features.length ? "opacity-100" : "opacity-60")}>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--wr-brand,#1090D0)]"
                  checked={alertFeatOn}
                  onChange={(e) => setAlertFeatOn(e.target.checked)}
                  disabled={features.length === 0}
                />
                Alert if selected feature(s) are gained or lost
              </label>
              {alertFeatOn && features.length > 0 && (
                <div className="mt-1 text-xs" style={{ color: TK.muted }}>
                  Features watched: {features.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-1">
            <label htmlFor="notes" className="mb-1 inline-flex items-center gap-1 text-sm font-medium" style={{ color: TK.text }}>
              Internal Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="High-value SEO term. Track all SERP changes."
              className="w-full rounded-md border p-2 text-sm outline-none"
              style={{ borderColor: TK.border }}
            />
            <div className="mt-1 text-right text-xs" style={{ color: TK.muted }}>
              {notes.length}/1000
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: TK.border }}>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, color: TK.text, background: "#fff" }}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !!validateKeyword()}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white shadow-sm",
              loading || !!validateKeyword() ? "opacity-80 cursor-not-allowed" : ""
            )}
            style={{ background: TK.brand }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brandHover)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TK.brand)}
          >
            {loading ? "Tracking…" : "✅ Track Keyword"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------ DEMO WRAPPER ------------------------------
/**
 * Demo_TrackCompetitorKeywordModal
 * - Provides mock competitors + tracked map + toast
 * - Renders a button to open the modal
 */
export default function Demo_TrackCompetitorKeywordModal() {
  const competitors: CompetitorLite[] = [
    { id: "c1", domain: "comp1.com", nickname: "Comp One" },
    { id: "c2", domain: "comp2.io", nickname: "Comp Two" },
    { id: "c3", domain: "alpha.dev" },
  ];

  // mock tracked keywords per competitor (lowercase)
  const [tracked, setTracked] = useState<Record<string, string[]>>({
    c1: ["best seo tools", "schema generator", "rank checker"],
    c2: ["technical seo checklist"],
    c3: [],
  });

  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ message: string }>;
      setToast({ show: true, message: ce.detail.message });
      const t = setTimeout(() => setToast({ show: false, message: "" }), 2000);
      return () => clearTimeout(t);
    };
    document.addEventListener("wr-toast", handler as any);
    return () => document.removeEventListener("wr-toast", handler as any);
  }, []);

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h3 className="text-lg font-semibold" style={{ color: TK.text }}>
          Keyword Tracking Monitor — Demo
        </h3>
        <p className="mt-1 text-sm" style={{ color: TK.muted }}>
          Click the button to open the <b>Track Competitor Keyword</b> modal. This demo has a mock
          dedupe list per competitor, validation, and a success toast.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white shadow-sm"
            style={{ background: TK.brand }}
            onClick={() => setOpen(true)}
          >
            Open Modal
          </button>
          <div className="ml-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: TK.border }}>
            <div className="font-medium" style={{ color: TK.text }}>
              Mock Tracked (c1):
            </div>
            <div className="text-xs" style={{ color: TK.muted }}>
              {tracked.c1.length ? tracked.c1.join(", ") : "—"}
            </div>
          </div>
        </div>

        <TrackCompetitorKeywordModal
          open={open}
          onClose={() => setOpen(false)}
          competitors={competitors}
          currentCompetitorId="c1"
          tracked={tracked}
          onSubmit={(p) => {
            // mimic storing in mock tracked map for dedupe
            setTracked((prev) => {
              const list = prev[p.competitorId] ?? [];
              const norm = p.keyword;
              if (!list.map((x) => x.toLowerCase()).includes(norm)) {
                return { ...prev, [p.competitorId]: [...list, norm] };
              }
              return prev;
            });
          }}
        />
      </div>

      <Toast show={toast.show} message={toast.message} />
    </div>
  );
}
