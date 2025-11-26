import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings2,
  X,
  Info,
  ChevronDown,
  Search,
  Save,
  Loader2,
  Trash2,
  Check,
  AlertTriangle,
  Filter,
  SlidersHorizontal,
  Type as TypeIcon,
  ArrowLeftRight,
  BookmarkPlus,
  Target,
  Quote,
  ImageOff,
  Tag,
  BadgeCheck,
} from "lucide-react";

/**
 * Wranker – Anchors (Tab 3)
 * Section 6: Optional Controls Drawer (Advanced Controls)
 * --------------------------------------------------------------------
 * Update notes (drop-in):
 * - Font: Inter + Inter Fallback applied to the section
 * - Branded icons added for Drawer header + section titles + type chips
 * - Drawer width increased for easier layout (md:560px · lg:640px)
 * - CTA buttons refactored to modular components (Primary/Secondary/Ghost/Danger)
 * - No logic changes
 */

/* ----------------------------- Design Tokens ----------------------------- */
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  actionBlue: "#0077FF",
  pastelBrand: "#D9EEF8",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  success: "#34A853",
  warning: "#F9BB04",
  critical: "#E94134",
  // Anchor type colors
  exact: "#0B63D6",
  phrase: "#4AA3FF",
  partial: "#0EA5A6",
  branded: "#6366F1",
  generic: "#9CA3AF",
  empty: "#FCA5A5",
};

const FONT_STACK =
  '"Inter","Inter Fallback",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol",sans-serif';

/* ------------------------------- Utilities -------------------------------- */
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
function emit(event: string, payload?: unknown) {
  // Simple telemetry stub
  // eslint-disable-next-line no-console
  console.log(`[telemetry] ${event}`, payload);
}

/* ------------------------------ Brand atoms ------------------------------- */
function BrandMark({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full"
      style={{
        height: size,
        width: size,
        background:
          "radial-gradient(circle at 30% 30%, #BDD6FF 0, transparent 60%), linear-gradient(180deg, #008CCD, #4286F5)",
      }}
    />
  );
}

type CTAProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
  children: React.ReactNode;
};
const CTA = {
  Primary: ({ icon, children, className, ...rest }: CTAProps) => (
    <button
      {...rest}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm font-medium text-white",
        className
      )}
      style={{ background: TOKENS.brand, fontFamily: FONT_STACK }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TOKENS.brandHover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = TOKENS.brand)}
    >
      {icon}
      {children}
    </button>
  ),
  Secondary: ({ icon, children, className, ...rest }: CTAProps) => (
    <button
      {...rest}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm font-medium hover:bg-[var(--wr-chipHover,#E5E7EB)]",
        className
      )}
      style={{ borderColor: TOKENS.border, fontFamily: FONT_STACK }}
    >
      {icon}
      {children}
    </button>
  ),
  Ghost: ({ icon, children, className, ...rest }: CTAProps) => (
    <button
      {...rest}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm font-medium hover:bg-[var(--wr-chipHover,#E5E7EB)]",
        className
      )}
      style={{ fontFamily: FONT_STACK }}
    >
      {icon}
      {children}
    </button>
  ),
  Danger: ({ icon, children, className, ...rest }: CTAProps) => (
    <button
      {...rest}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm font-medium text-red-700 hover:bg-red-50",
        className
      )}
      style={{ borderColor: "#FECACA", fontFamily: FONT_STACK }}
    >
      {icon}
      {children}
    </button>
  ),
};

/* ------------------------------ Mocked Data ------------------------------- */
const MOCK_PAGES = [
  "/",
  "/blog/*",
  "/blog/seo-basics",
  "/category/seo",
  "/product/widget",
  "/product/gadget",
  "/pricing",
  "/about-us",
  "/contact",
  "/docs/*",
];

const MOCK_COMPETITORS = [
  "example-competitor.com",
  "bestseo.io",
  "rank-champs.net",
  "superlinks.org",
];

/* ------------------------------ Chip component ---------------------------- */
function Chip({
  label,
  onRemove,
  colorClass,
}: {
  label: string;
  onRemove?: () => void;
  colorClass?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[6px] border px-2 py-1 text-xs",
        "border-[var(--wr-border,#EFF0F6)] bg-[var(--wr-chipBg,#F5F7FA)] text-[var(--wr-text,#111827)]",
        colorClass
      )}
      style={{ fontFamily: FONT_STACK }}
    >
      {label}
      {onRemove && (
        <button
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="ml-1 opacity-70 hover:opacity-100"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

/* ------------------------------ Toggle Switch ----------------------------- */
function Toggle({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer select-none items-center gap-2"
      style={{ fontFamily: FONT_STACK }}
    >
      <span className="text-sm text-gray-700">{label}</span>
      <span className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={cn(
            "block h-5 w-9 rounded-full transition-colors",
            checked ? "bg-[var(--wr-brand,#008CCD)]" : "bg-gray-300"
          )}
        />
        <span
          className={cn(
            "absolute left-0 top-0 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </span>
    </label>
  );
}

/* ------------------------------ Range (min/max) --------------------------- */
function DualRange({
  min = 2,
  max = 20,
  value,
  onChange,
}: {
  min?: number;
  max?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const [minV, maxV] = value;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  return (
    <div
      className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto] md:items-center"
      style={{ fontFamily: FONT_STACK }}
    >
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={minV}
          onChange={(e) =>
            onChange([clamp(Number(e.target.value), min, maxV - 0), maxV])
          }
          className="w-full"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={maxV}
          onChange={(e) =>
            onChange([minV, clamp(Number(e.target.value), minV + 0, max)])
          }
          className="w-full"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Min</label>
        <input
          type="number"
          min={min}
          max={maxV}
          value={minV}
          onChange={(e) =>
            onChange([clamp(Number(e.target.value), min, maxV), maxV])
          }
          className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-600">Max</label>
        <input
          type="number"
          min={minV}
          max={max}
          value={maxV}
          onChange={(e) =>
            onChange([minV, clamp(Number(e.target.value), minV, max)])
          }
          className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}

/* ------------------------------ MultiSelect w/ typeahead ------------------ */
function MultiSelect({
  label,
  suggestions = [],
  values = [],
  onAdd,
  onRemove,
  placeholder = "Type to search pages...",
}: {
  label: string;
  suggestions: string[];
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      suggestions
        .filter(
          (s) =>
            s.toLowerCase().includes(query.toLowerCase()) &&
            !values.includes(s)
        )
        .slice(0, 6),
    [query, suggestions, values]
  );
  return (
    <div style={{ fontFamily: FONT_STACK }}>
      <label className="mb-1 block text-sm font-medium text-gray-800">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-[var(--wr-border,#EFF0F6)] bg-white p-2">
        {values.map((v) => (
          <Chip key={v} label={v} onRemove={() => onRemove(v)} />
        ))}
        <div className="relative grow">
          <Search
            size={16}
            className="pointer-events-none absolute left-2 top-2.5 text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-[6px] border border-transparent bg-transparent py-2 pl-7 pr-2 text-sm outline-none"
          />
          {query && filtered.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-[6px] border border-gray-200 bg-white shadow">
              {filtered.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onAdd(s);
                    setQuery("");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--wr-chipHover,#E5E7EB)]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Type Chips -------------------------------- */
const TYPE_DEFS: Array<{
  key: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { key: "exact", label: "Exact", color: TOKENS.exact, icon: Target },
  { key: "phrase", label: "Phrase", color: TOKENS.phrase, icon: Quote },
  { key: "partial", label: "Partial", color: TOKENS.partial, icon: TypeIcon },
  { key: "branded", label: "Branded", color: TOKENS.branded, icon: BadgeCheck },
  { key: "generic", label: "Generic", color: TOKENS.generic, icon: Tag },
  { key: "empty", label: "Empty/Image", color: TOKENS.empty, icon: ImageOff },
];

function TypeChip({
  active,
  label,
  color,
  onToggle,
  Icon,
}: {
  active: boolean;
  label: string;
  color: string;
  onToggle: () => void;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-[6px] border px-2.5 py-1 text-xs transition",
        active ? "border-transparent text-white" : "border-gray-200 text-gray-700",
        active ? "shadow" : ""
      )}
      style={{
        backgroundColor: active ? color : TOKENS.chipBg,
        fontFamily: FONT_STACK,
      }}
      aria-pressed={active}
    >
      <Icon size={14} className="opacity-90" />
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </button>
  );
}

/* ------------------------------ Overlap Gauge ----------------------------- */
function OverlapGauge({ value = 42 }: { value?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const gradient = `conic-gradient(${TOKENS.brand} ${clamped * 3.6}deg, #E5E7EB 0deg)`;
  return (
    <div className="flex items-center gap-3" style={{ fontFamily: FONT_STACK }}>
      <div
        className="relative h-12 w-12 rounded-full"
        style={{ background: gradient }}
        aria-label={`Anchor Overlap ${clamped}%`}
      >
        <div className="absolute inset-1 rounded-full bg-white" />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900">
          {clamped}%
        </div>
      </div>
      <div className="text-xs text-gray-600">
        Overlap of unique anchors (weighted by frequency)
      </div>
    </div>
  );
}

/* ------------------------------ Section Title ----------------------------- */
function SectionSummary({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <summary
      className="flex cursor-pointer list-none items-center justify-between rounded-[6px] border border-[var(--wr-border,#EFF0F6)] px-3 py-2 text-sm font-medium text-gray-800"
      style={{ fontFamily: FONT_STACK }}
    >
      <span className="inline-flex items-center gap-2">
        <ChevronDown size={16} className="transition group-open:rotate-180" />
        <BrandMark />
        <Icon size={16} className="text-[var(--wr-brand,#008CCD)]" />
        <span>{title}</span>
      </span>
      <span className="text-xs text-gray-500">{subtitle}</span>
    </summary>
  );
}

/* ------------------------------ Advanced Controls Drawer ------------------ */
function AdvancedControlsDrawer({
  open,
  onClose,
  onApply,
  lastApplied,
  userRole = "Analyst",
  presets,
  setPresets,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (snapshot: any, opts?: { keepOpen?: boolean }) => void;
  lastApplied: any;
  userRole?: "Analyst" | "Editor" | "Viewer";
  presets: Array<{ id: string; name: string; description?: string; snapshot: any }>;
  setPresets: React.Dispatch<
    React.SetStateAction<
      Array<{ id: string; name: string; description?: string; snapshot: any }>
    >
  >;
}) {
  // Local (dirty) state mirrors filters; not applied until Apply Changes
  const [includePages, setIncludePages] = useState<string[]>(
    lastApplied.includePages
  );
  const [excludePages, setExcludePages] = useState<string[]>(
    lastApplied.excludePages
  );
  const [regexEnabled, setRegexEnabled] = useState<boolean>(
    lastApplied.regexEnabled
  );
  const [regexPattern, setRegexPattern] = useState<string>(
    lastApplied.regexPattern || ""
  );

  const [anchorLen, setAnchorLen] = useState<[number, number]>(
    lastApplied.anchorLen
  ); // [min,max]
  const [cases, setCases] = useState<Set<string>>(new Set(lastApplied.cases)); // ['lower','sentence','title']

  const [includeNofollow, setIncludeNofollow] = useState<boolean>(
    lastApplied.includeNofollow
  );
  const [imageOnly, setImageOnly] = useState<boolean>(lastApplied.imageOnly);
  const [repetition, setRepetition] = useState<number>(lastApplied.repetition);
  const [minAqs, setMinAqs] = useState<number>(lastApplied.minAqs);

  const [types, setTypes] = useState<Set<string>>(new Set(lastApplied.types)); // keys from TYPE_DEFS

  const [compareEnabled, setCompareEnabled] = useState<boolean>(
    lastApplied.compare.enabled
  );
  const [compareDomain, setCompareDomain] = useState<string>(
    lastApplied.compare.domain || ""
  );
  const [highlightDiffs, setHighlightDiffs] = useState<boolean>(
    lastApplied.compare.highlightDiffs || false
  );
  const [overlap, setOverlap] = useState(37);

  const [liveApply, setLiveApply] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState("");

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Build filter snapshot for preview/apply
  const snapshot = useMemo(
    () => ({
      includePages,
      excludePages,
      regexEnabled,
      regexPattern,
      anchorLen,
      cases: Array.from(cases),
      includeNofollow,
      imageOnly,
      repetition,
      minAqs,
      types: Array.from(types),
      compare: { enabled: compareEnabled, domain: compareDomain, highlightDiffs },
    }),
    [
      includePages,
      excludePages,
      regexEnabled,
      regexPattern,
      anchorLen,
      cases,
      includeNofollow,
      imageOnly,
      repetition,
      minAqs,
      types,
      compareEnabled,
      compareDomain,
      highlightDiffs,
    ]
  );

  const isDirty = useMemo(
    () => JSON.stringify(snapshot) !== JSON.stringify(lastApplied),
    [snapshot, lastApplied]
  );

  // ESC to close (with confirm if dirty)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        if (isDirty) setShowCloseConfirm(true);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isDirty, onClose]);

  // Focus trap (minimal): focus drawer on open
  useEffect(() => {
    if (open && drawerRef.current) {
      drawerRef.current.focus();
      emit("advanced_drawer_opened", { timestamp: Date.now() });
    }
  }, [open]);

  // Live preview (debounced ~500ms)
  useEffect(() => {
    if (!open) return;
    setPreviewLoading(true);
    const t = setTimeout(() => {
      // Mock: compute a pseudo-count influenced by filters (purely for demo feel)
      let base = 12345;
      base -= includePages.length * 123;
      base -= excludePages.length * 231;
      base -= Math.max(0, minAqs - 20) * 7; // higher minAqs → lower count
      base -= imageOnly ? 700 : 0;
      base -= repetition > 0 ? Math.min(2000, repetition * 12) : 0;
      base -= types.size < TYPE_DEFS.length ? (TYPE_DEFS.length - types.size) * 300 : 0;
      base = Math.max(0, base);
      // overlap mock – higher minAqs narrows overlap
      const ov = Math.max(5, 80 - Math.floor(minAqs / 2));
      setOverlap(ov);
      setPreviewCount(base);
      setPreviewLoading(false);
      setPreviewUpdatedAt(new Date().toLocaleTimeString());
      emit("filters_previewed", { previewCount: base, snapshot });
      if (liveApply) {
        onApply(snapshot, { keepOpen: true });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [
    open,
    includePages,
    excludePages,
    minAqs,
    imageOnly,
    repetition,
    types,
    includeNofollow,
    anchorLen,
    regexEnabled,
    regexPattern,
    liveApply,
    snapshot,
    onApply,
  ]);

  // Validation helpers
  const regexError = useMemo(() => {
    if (!regexEnabled || !regexPattern) return "";
    try {
      // eslint-disable-next-line no-new
      new RegExp(regexPattern);
      return "";
    } catch (e: any) {
      return String(e.message || e);
    }
  }, [regexEnabled, regexPattern]);

  const overlapWarning = compareEnabled && !compareDomain;
  const conflictWarning = includePages.some((p) => excludePages.includes(p));

  function handleApply(closeAfter = true) {
    if (regexError) return; // prevent apply when invalid regex
    onApply(snapshot, { keepOpen: !closeAfter });
    emit("filters_applied", { snapshot });
    if (closeAfter) onClose();
  }

  function handleClear() {
    setIncludePages([]);
    setExcludePages([]);
    setRegexEnabled(false);
    setRegexPattern("");
    setAnchorLen([2, 20]);
    setCases(new Set());
    setIncludeNofollow(true);
    setImageOnly(false);
    setRepetition(0);
    setMinAqs(0);
    setTypes(new Set(TYPE_DEFS.map((t) => t.key)));
    setCompareEnabled(false);
    setCompareDomain("");
    setHighlightDiffs(false);
  }

  function quickTypes(action: "all" | "none" | "invert") {
    if (action === "all") setTypes(new Set(TYPE_DEFS.map((t) => t.key)));
    if (action === "none") setTypes(new Set());
    if (action === "invert") {
      setTypes((prev) => {
        const next = new Set<string>();
        TYPE_DEFS.forEach((t) => {
          if (!prev.has(t.key)) next.add(t.key);
        });
        return next;
      });
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => (isDirty ? setShowCloseConfirm(true) : onClose())}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-controls-title"
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-full outline-none focus:outline-none md:w-[560px] lg:w-[640px]",
          "translate-x-0 transform bg-white shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
        tabIndex={-1}
        style={{ fontFamily: FONT_STACK }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--wr-border,#EFF0F6)] bg-white p-4">
          <div className="flex items-start gap-2">
            <BrandMark />
            <div>
              <h3
                id="advanced-controls-title"
                className="flex items-center gap-2 text-base font-semibold text-gray-900"
              >
                <Settings2 size={18} className="text-[var(--wr-brand,#008CCD)]" />
                Advanced Controls
              </h3>
              <p className="mt-0.5 text-xs text-gray-600">
                Fine‑grained filters, competitor compare, and saved views.
              </p>
            </div>
          </div>
          <button
            aria-label="Close advanced controls"
            className="rounded p-1 hover:bg-[var(--wr-chipHover,#E5E7EB)]"
            onClick={() => (isDirty ? setShowCloseConfirm(true) : onClose())}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview bar */}
        <div className="flex items-center justify-between border-b border-[var(--wr-border,#EFF0F6)] bg-[var(--wr-chipBg,#F5F7FA)] px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            {previewLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Check size={16} className="text-[var(--wr-brand,#008CCD)]" />
            )}
            <span>
              Preview: <strong>{previewCount.toLocaleString()}</strong> anchors match
              {previewUpdatedAt && (
                <span className="text-gray-500"> • Last computed {previewUpdatedAt}</span>
              )}
            </span>
          </div>
          <Toggle
            id="live-apply"
            checked={liveApply}
            onChange={setLiveApply}
            label="Live Apply"
          />
        </div>

        {/* Body */}
        <div className="h-[calc(100%-132px)] overflow-y-auto p-4">
          {/* 3.1 Anchor Inclusion Settings */}
          <details open className="group">
            <SectionSummary
              icon={Filter}
              title="Anchor Inclusion Settings"
              subtitle="Include / exclude pages, length & cases"
            />
            <div className="mt-3 space-y-4">
              <MultiSelect
                label="Include Pages"
                suggestions={MOCK_PAGES}
                values={includePages}
                onAdd={(v) =>
                  setIncludePages((s) => Array.from(new Set([...s, v])))
                }
                onRemove={(v) =>
                  setIncludePages((s) => s.filter((x) => x !== v))
                }
              />
              <MultiSelect
                label="Exclude Pages"
                suggestions={MOCK_PAGES}
                values={excludePages}
                onAdd={(v) =>
                  setExcludePages((s) => Array.from(new Set([...s, v])))
                }
                onRemove={(v) =>
                  setExcludePages((s) => s.filter((x) => x !== v))
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800">
                    Anchor Length Filter (words)
                  </label>
                  <DualRange min={2} max={20} value={anchorLen} onChange={setAnchorLen} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800">
                    Anchor Case
                  </label>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                    {[
                      { k: "lower", l: "Lowercase only" },
                      { k: "sentence", l: "Sentence case" },
                      { k: "title", l: "Title case" },
                    ].map(({ k, l }) => (
                      <label key={k} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={cases.has(k)}
                          onChange={(e) =>
                            setCases((s) => {
                              const n = new Set(s);
                              if (e.target.checked) n.add(k);
                              else n.delete(k);
                              return n;
                            })
                          }
                        />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-[var(--wr-border,#EFF0F6)] p-3">
                <div className="flex items-center justify-between">
                  <Toggle
                    id="regex-toggle"
                    checked={regexEnabled}
                    onChange={setRegexEnabled}
                    label="Enable regex for include/exclude"
                  />
                  <span className="text-xs text-gray-500">
                    Advanced • Requires Analyst
                  </span>
                </div>
                {regexEnabled && (
                  <div className="mt-2">
                    <input
                      value={regexPattern}
                      onChange={(e) => setRegexPattern(e.target.value)}
                      placeholder="e.g. ^/(blog|docs)/.*$"
                      className={cn(
                        "w-full rounded-[6px] border px-3 py-2 text-sm",
                        regexError ? "border-red-300" : "border-gray-200"
                      )}
                      aria-invalid={!!regexError}
                    />
                    {regexError ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle size={14} /> Invalid regex: {regexError}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Patterns run after inclusions; exclusions win on conflict.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {conflictWarning && (
                <p className="flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle size={14} /> Include & Exclude contain overlapping
                  paths. Exclude takes precedence.
                </p>
              )}
            </div>
          </details>

          {/* 3.2 Advanced Anchor Filtering */}
          <details open className="group mt-4">
            <SectionSummary
              icon={SlidersHorizontal}
              title="Advanced Anchor Filtering"
              subtitle="NoFollow, image-only, repetition, AQS"
            />
            <div className="mt-3 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Toggle
                  id="nofollow-toggle"
                  checked={includeNofollow}
                  onChange={setIncludeNofollow}
                  label="Include NoFollow anchors"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={imageOnly}
                    onChange={(e) => setImageOnly(e.target.checked)}
                  />{" "}
                  Show Image/Empty anchors only
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800">
                    Anchor Repetition Threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={repetition}
                      onChange={(e) => setRepetition(Number(e.target.value))}
                      className="w-full"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={repetition}
                      onChange={(e) => setRepetition(Number(e.target.value))}
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800">
                    Minimum AQS Score
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={minAqs}
                      onChange={(e) => setMinAqs(Number(e.target.value))}
                      className="w-full"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={minAqs}
                      onChange={(e) => setMinAqs(Number(e.target.value))}
                      className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {previewCount === 0 && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle size={14} /> Your filter combo currently matches 0
                  anchors. Lower the AQS or remove Image‑only.
                </p>
              )}
            </div>
          </details>

          {/* 3.3 Anchor Type Focus */}
          <details open className="group mt-4">
            <SectionSummary
              icon={TypeIcon}
              title="Anchor Type Focus"
              subtitle="Quick-select colored type chips"
            />
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {TYPE_DEFS.map((t) => (
                  <TypeChip
                    key={t.key}
                    label={t.label}
                    color={t.color}
                    Icon={t.icon}
                    active={types.has(t.key)}
                    onToggle={() =>
                      setTypes((s) => {
                        const n = new Set(s);
                        if (n.has(t.key)) n.delete(t.key);
                        else n.add(t.key);
                        return n;
                      })
                    }
                  />
                ))}
              </div>
              <div className="flex gap-2 text-xs">
                <CTA.Secondary onClick={() => quickTypes("all")}>Select All</CTA.Secondary>
                <CTA.Secondary onClick={() => quickTypes("none")}>
                  Deselect All
                </CTA.Secondary>
                <CTA.Secondary onClick={() => quickTypes("invert")}>
                  Invert Selection
                </CTA.Secondary>
              </div>
            </div>
          </details>

          {/* 3.4 Competitor Comparison Toggle */}
          <details open className="group mt-4">
            <SectionSummary
              icon={ArrowLeftRight}
              title="Competitor Comparison"
              subtitle="Compare your anchors vs competitor"
            />
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Toggle
                  id="compare-toggle"
                  checked={compareEnabled}
                  onChange={setCompareEnabled}
                  label="Compare with Competitor Anchors"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    disabled={!compareEnabled}
                    checked={highlightDiffs}
                    onChange={(e) => setHighlightDiffs(e.target.checked)}
                  />{" "}
                  Highlight Diffs
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-800">
                    Competitor Domain
                  </label>
                  <input
                    disabled={!compareEnabled || userRole !== "Analyst"}
                    placeholder="e.g., example-competitor.com"
                    list="competitor-list"
                    value={compareDomain}
                    onChange={(e) => setCompareDomain(e.target.value)}
                    className="w-full rounded-[6px] border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
                  />
                  <datalist id="competitor-list">
                    {MOCK_COMPETITORS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {userRole !== "Analyst" && (
                    <p className="mt-1 text-xs text-gray-500">
                      Requires Analyst role.
                    </p>
                  )}
                  {compareEnabled && overlapWarning && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle size={14} /> Enter a competitor domain to
                      enable preview.
                    </p>
                  )}
                </div>
                <div className="md:pl-2">
                  <label className="mb-1 block text-sm font-medium text-gray-800">
                    Anchor Overlap Score
                  </label>
                  <OverlapGauge value={overlap} />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Privacy note: If competitor hasn’t been crawled, we may fetch their
                anchors. You’ll be asked to confirm.
              </p>
            </div>
          </details>

          {/* 3.5 Preset Configurations */}
          <details open className="group mt-4">
            <SectionSummary
              icon={BookmarkPlus}
              title="Preset Configurations"
              subtitle="Save / Load / Reset"
            />
            <div className="mt-3 space-y-3">
              <div className="rounded-[6px] border border-[var(--wr-border,#EFF0F6)] p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="grid gap-2">
                    <input
                      id="preset-name"
                      placeholder="Preset name (e.g., Blog focus)"
                      className="w-full rounded-[6px] border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      id="preset-desc"
                      placeholder="Optional description"
                      className="w-full rounded-[6px] border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <CTA.Primary
                    title="Save Custom View"
                    onClick={() => {
                      const name =
                        (document.getElementById("preset-name") as HTMLInputElement | null)
                          ?.value.trim() ?? "";
                      const description =
                        (document.getElementById("preset-desc") as HTMLInputElement | null)
                          ?.value.trim() ?? "";
                      if (!name) return;
                      const preset = { id: `p-${Date.now()}`, name, description, snapshot };
                      setPresets((p) => [preset, ...p]);
                      emit("preset_saved", { name });
                    }}
                    icon={<Save size={16} />}
                  >
                    Save Custom View
                  </CTA.Primary>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                <select
                  className="w-full rounded-[6px] border border-gray-200 px-3 py-2 text-sm"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const found = presets.find((x) => x.id === v);
                    if (found) {
                      const s = found.snapshot;
                      setIncludePages(s.includePages);
                      setExcludePages(s.excludePages);
                      setRegexEnabled(s.regexEnabled);
                      setRegexPattern(s.regexPattern || "");
                      setAnchorLen(s.anchorLen);
                      setCases(new Set(s.cases || []));
                      setIncludeNofollow(s.includeNofollow);
                      setImageOnly(s.imageOnly);
                      setRepetition(s.repetition);
                      setMinAqs(s.minAqs);
                      setTypes(new Set(s.types || []));
                      setCompareEnabled(s.compare?.enabled || false);
                      setCompareDomain(s.compare?.domain || "");
                      setHighlightDiffs(s.compare?.highlightDiffs || false);
                      emit("preset_loaded", { name: found.name });
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Load Saved View…
                  </option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <CTA.Secondary onClick={handleClear}>Reset to Default</CTA.Secondary>

                <CTA.Danger
                  onClick={() => {
                    setPresets([]);
                  }}
                  icon={<Trash2 size={14} />}
                >
                  Clear Presets
                </CTA.Danger>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-[var(--wr-border,#EFF0F6)] bg-white p-3">
          <div className="text-xs text-gray-500">
            {isDirty ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--wr-brand,#008CCD)]" />{" "}
                Unsaved changes
              </span>
            ) : (
              "All changes applied"
            )}
          </div>
          <div className="flex items-center gap-2">
            <CTA.Secondary onClick={handleClear} icon={<Trash2 size={16} />}>
              Clear All Filters
            </CTA.Secondary>
            <CTA.Ghost
              onClick={() => (isDirty ? setShowCloseConfirm(true) : onClose())}
              icon={<X size={16} />}
            >
              Close
            </CTA.Ghost>
            <CTA.Primary onClick={() => handleApply(true)} icon={<Check size={16} />}>
              Apply Changes
            </CTA.Primary>
          </div>
        </div>

        {/* Close confirm (minimal) */}
        {showCloseConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-[6px] bg-white p-4 shadow-lg">
              <h4 className="text-sm font-semibold text-gray-900">
                Discard unsaved changes?
              </h4>
              <p className="mt-2 text-sm text-gray-600">
                You have changes that aren’t applied yet.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <CTA.Ghost onClick={() => setShowCloseConfirm(false)}>Cancel</CTA.Ghost>
                <CTA.Secondary
                  onClick={() => {
                    setShowCloseConfirm(false);
                    onClose();
                  }}
                  icon={<X size={14} />}
                >
                  Discard
                </CTA.Secondary>
                <CTA.Primary onClick={() => handleApply(true)} icon={<Check size={14} />}>
                  Apply & Close
                </CTA.Primary>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

/* ------------------------------ Root Demo Wrapper ------------------------- */
export default function AnchorsAdvancedControlsDemo() {
  // Applied filters state lives at tab level
  const [applied, setApplied] = useState({
    includePages: [],
    excludePages: [],
    regexEnabled: false,
    regexPattern: "",
    anchorLen: [2, 20] as [number, number],
    cases: [] as string[], // ['lower','sentence','title']
    includeNofollow: true,
    imageOnly: false,
    repetition: 0,
    minAqs: 0,
    types: TYPE_DEFS.map((t) => t.key),
    compare: { enabled: false, domain: "", highlightDiffs: false },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presets, setPresets] = useState<
    Array<{ id: string; name: string; description?: string; snapshot: any }>
  >([]);

  // Count active filters for badge
  const activeCount = useMemo(() => {
    let c = 0;
    if (applied.includePages.length) c++;
    if (applied.excludePages.length) c++;
    if (applied.regexEnabled && applied.regexPattern) c++;
    if (applied.anchorLen[0] > 2 || applied.anchorLen[1] < 20) c++;
    if (applied.cases.length) c++;
    if (!applied.includeNofollow) c++;
    if (applied.imageOnly) c++;
    if (applied.repetition > 0) c++;
    if (applied.minAqs > 0) c++;
    if (applied.types.length !== TYPE_DEFS.length) c++;
    if (applied.compare.enabled) c++;
    return c;
  }, [applied]);

  function handleApply(newSnapshot: typeof applied) {
    setApplied(newSnapshot);
  }

  // Build chips summary from applied filters
  const chips = useMemo(() => {
    const arr: Array<{ k: string; label: string }> = [];
    if (applied.includePages.length)
      arr.push({
        k: "include",
        label: `Include: ${applied.includePages
          .slice(0, 2)
          .join(", ")}${applied.includePages.length > 2 ? "…" : ""}`,
      });
    if (applied.excludePages.length)
      arr.push({
        k: "exclude",
        label: `Exclude: ${applied.excludePages
          .slice(0, 2)
          .join(", ")}${applied.excludePages.length > 2 ? "…" : ""}`,
      });
    if (applied.regexEnabled && applied.regexPattern)
      arr.push({ k: "regex", label: `Regex: ${applied.regexPattern}` });
    if (applied.anchorLen[0] > 2 || applied.anchorLen[1] < 20)
      arr.push({
        k: "len",
        label: `Len: ${applied.anchorLen[0]}–${applied.anchorLen[1]}`,
      });
    if (applied.cases.length)
      arr.push({ k: "case", label: `Case: ${applied.cases.join("/")}` });
    if (!applied.includeNofollow) arr.push({ k: "nf", label: "NoFollow excluded" });
    if (applied.imageOnly) arr.push({ k: "img", label: "Image/Empty only" });
    if (applied.repetition > 0)
      arr.push({ k: "rep", label: `Repetition > ${applied.repetition}` });
    if (applied.minAqs > 0)
      arr.push({ k: "aqs", label: `Min AQS ≥ ${applied.minAqs}` });
    if (applied.types.length !== TYPE_DEFS.length)
      arr.push({
        k: "types",
        label: `Types: ${applied.types.length}/${TYPE_DEFS.length}`,
      });
    if (applied.compare.enabled)
      arr.push({
        k: "cmp",
        label: `Compare: ${applied.compare.domain || "(choose domain)"}`,
      });
    return arr;
  }, [applied]);

  return (
    <div className="min-h-[600px] w-full bg-white" style={{ fontFamily: FONT_STACK }}>
      {/* Anchors Tab header stub (to place the Advanced Controls toggle) */}
      <div className="flex items-center justify-between border-b border-[var(--wr-border,#EFF0F6)] px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Anchors — Optional Controls (Section 6)
          </h2>
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--wr-chipBg,#F5F7FA)] px-2 py-1 text-xs text-gray-600">
            <Info size={14} /> Phase II power‑user drawer
          </span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative inline-flex items-center gap-2 rounded-[6px] border border-[var(--wr-border,#EFF0F6)] bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-[var(--wr-chipHover,#E5E7EB)]"
          aria-pressed={drawerOpen}
          aria-label="Open Advanced Controls"
          style={{ fontFamily: FONT_STACK }}
        >
          <Settings2 size={16} className="text-[var(--wr-brand,#008CCD)]" />
          Advanced Controls
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-[var(--wr-brand,#008CCD)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Chips row (applied) */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--wr-border,#EFF0F6)] bg-[var(--wr-chipBg,#F5F7FA)] px-4 py-2">
        {chips.length === 0 ? (
          <span className="text-xs text-gray-500">
            No advanced filters applied. Use ⚙️ to configure.
          </span>
        ) : (
          chips.map((c) => <Chip key={c.k} label={c.label} />)
        )}
      </div>

      {/* Placeholder content area to show the rest of Anchors tab would live here */}
      <div className="p-4">
        <div className="rounded-[6px] border border-dashed border-[var(--wr-border,#EFF0F6)] p-6 text-center text-sm text-gray-500">
          This demo focuses on <strong>Section 6 – Optional Controls Drawer</strong>.
          Sections 1–5 are assumed to be implemented elsewhere in your Anchors tab.
        </div>
      </div>

      {/* Drawer Instance */}
      <AdvancedControlsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={(snap) => handleApply(snap)}
        lastApplied={applied}
        presets={presets}
        setPresets={setPresets}
        userRole="Analyst"
      />
    </div>
  );
}
