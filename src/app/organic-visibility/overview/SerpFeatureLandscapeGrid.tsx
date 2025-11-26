"use client";
import React, { ReactElement, useMemo, useState } from "react";
import {
  LayoutGrid,
  Download,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Star,
  HelpCircle,
  SquareStack,
  Video,
  Image as ImageIcon,
  MapPin,
  Newspaper,
  MessageSquare,
  BookOpen,
  Tag,
} from "lucide-react";

/**
 * Wranker • OVI — Section 7: SERP Feature Landscape (Cards View)
 *
 * REFINEMENTS APPLIED:
 * - Inter, Inter Fallback font stack
 * - No emoji anywhere
 * - Branded (#008CCD) icon in the section title (and export)
 * - SERP features use relevant icons with per-feature colors
 * - Pointer cursor for all clickable elements
 * - Modular chips (segmented controls) consistent with recent designs
 *
 * Pure React + Tailwind (no chart libs). CSV export supported.
 */

/* =========================
   Tokens (fallbacks at runtime)
   ========================= */
const TOKENS = {
  brand: "var(--wr-brand, #008CCD)",
  action: "var(--wr-action, #0077FF)",
  surface: "var(--wr-surface, #FFFFFF)",
  bgSubtle: "var(--wr-bg-subtle, #F5F7FA)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  success: "var(--wr-success, #2ECC71)",
  danger: "var(--wr-danger, #FF6B6B)",
  neutral: "var(--wr-neutral, #9CA3AF)",
  radiusLg: "var(--wr-radius-lg, 16px)",
  shadowSm: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.05))",
};

/* =========================
   Types
   ========================= */
type Device = "all" | "desktop" | "mobile";
type KeywordType = "all" | "branded" | "nonbranded";
type LinkedFilter = "all" | "linked" | "not_linked";
type FeatureCode =
  | "FS" // Featured Snippet
  | "PAA" // People Also Ask
  | "KP" // Knowledge Panel
  | "LP" // Local Pack
  | "TS" // Top Stories
  | "IP" // Image Pack
  | "VC" // Video Carousel
  | "DISC" // Discussions & Forums
  | "TTK" // Things to Know
  | "EB"; // Explore Brands

type Counters = { triggered: number; linked: number };

type FeatureCardData = {
  id: FeatureCode;
  name: string;
  /** retained for back-compat but NOT used (no emoji) */
  icon?: string;
  /** feature brand color used for icon + badge bg */
  color: string;
  counts: {
    all: Counters;
    branded?: Counters;
    nonbranded?: Counters;
    desktop?: Counters;
    mobile?: Counters;
  };
};

/* =========================
   Per-feature icon + color mapping
   ========================= */
const FEATURE_ICON: Record<FeatureCode, (props: { size?: number; color?: string }) => ReactElement> = {
  FS: ({ size = 16, color }) => <Star size={size} color={color} />,
  PAA: ({ size = 16, color }) => <HelpCircle size={size} color={color} />,
  KP: ({ size = 16, color }) => <SquareStack size={size} color={color} />,
  LP: ({ size = 16, color }) => <MapPin size={size} color={color} />,
  TS: ({ size = 16, color }) => <Newspaper size={size} color={color} />,
  IP: ({ size = 16, color }) => <ImageIcon size={size} color={color} />,
  VC: ({ size = 16, color }) => <Video size={size} color={color} />,
  DISC: ({ size = 16, color }) => <MessageSquare size={size} color={color} />,
  TTK: ({ size = 16, color }) => <BookOpen size={size} color={color} />,
  EB: ({ size = 16, color }) => <Tag size={size} color={color} />,
};

const FEATURE_COLOR: Record<FeatureCode, string> = {
  FS: "#34D399", // emerald
  PAA: "#3B82F6", // blue
  KP: "#14B8A6", // teal
  VC: "#8B5CF6", // purple
  IP: "#F59E0B", // amber
  LP: "#FACC15", // yellow
  TS: "#EF4444", // red
  DISC: "#64748B", // slate
  TTK: "#22D3EE", // cyan
  EB: "#F97316", // orange
};

/* =========================
   Demo dataset (replace with API data)
   ========================= */
const DEMO: FeatureCardData[] = [
  {
    id: "FS",
    name: "Featured Snippet",
    color: FEATURE_COLOR.FS,
    counts: {
      all: { triggered: 64, linked: 23 },
      branded: { triggered: 14, linked: 9 },
      nonbranded: { triggered: 50, linked: 14 },
      desktop: { triggered: 36, linked: 13 },
      mobile: { triggered: 28, linked: 10 },
    },
  },
  {
    id: "PAA",
    name: "People Also Ask",
    color: FEATURE_COLOR.PAA,
    counts: {
      all: { triggered: 108, linked: 31 },
      branded: { triggered: 16, linked: 7 },
      nonbranded: { triggered: 92, linked: 24 },
      desktop: { triggered: 60, linked: 18 },
      mobile: { triggered: 48, linked: 13 },
    },
  },
  {
    id: "KP",
    name: "Knowledge Panel",
    color: FEATURE_COLOR.KP,
    counts: {
      all: { triggered: 12, linked: 7 },
      branded: { triggered: 10, linked: 7 },
      nonbranded: { triggered: 2, linked: 0 },
    },
  },
  {
    id: "LP",
    name: "Local Pack",
    color: FEATURE_COLOR.LP,
    counts: {
      all: { triggered: 38, linked: 12 },
      branded: { triggered: 9, linked: 5 },
      nonbranded: { triggered: 29, linked: 7 },
    },
  },
  {
    id: "TS",
    name: "Top Stories",
    color: FEATURE_COLOR.TS,
    counts: {
      all: { triggered: 22, linked: 6 },
      nonbranded: { triggered: 22, linked: 6 },
    },
  },
  {
    id: "IP",
    name: "Image Pack",
    color: FEATURE_COLOR.IP,
    counts: {
      all: { triggered: 47, linked: 17 },
      desktop: { triggered: 26, linked: 10 },
      mobile: { triggered: 21, linked: 7 },
    },
  },
  {
    id: "VC",
    name: "Video Carousel",
    color: FEATURE_COLOR.VC,
    counts: {
      all: { triggered: 31, linked: 11 },
    },
  },
  {
    id: "DISC",
    name: "Discussions & Forums",
    color: FEATURE_COLOR.DISC,
    counts: {
      all: { triggered: 29, linked: 5 },
    },
  },
  {
    id: "TTK",
    name: "Things To Know",
    color: FEATURE_COLOR.TTK,
    counts: {
      all: { triggered: 9, linked: 2 },
    },
  },
  {
    id: "EB",
    name: "Explore Brands",
    color: FEATURE_COLOR.EB,
    counts: {
      all: { triggered: 18, linked: 4 },
    },
  },
];

/* =========================
   Utilities
   ========================= */
const fmt = (n: number) => n.toLocaleString();
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

function withAlpha(hex: string, a = 0.12) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${a})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** choose best scope based on filters, with fallback to "all" */
function pickCounts(f: FeatureCardData, device: Device, ktype: KeywordType): Counters {
  const base = f.counts.all;
  const byType =
    ktype === "branded" ? f.counts.branded ?? base : ktype === "nonbranded" ? f.counts.nonbranded ?? base : base;
  const byDevice = device === "desktop" ? f.counts.desktop ?? byType : device === "mobile" ? f.counts.mobile ?? byType : byType;
  return byDevice;
}

/** coverage color: good (>=70%) green, mid (30–69) yellow, low (<30) red */
function coverageColor(cov: number): string {
  if (!isFinite(cov)) return TOKENS.neutral;
  if (cov >= 0.7) return "var(--wr-success, #2ECC71)";
  if (cov >= 0.3) return "#FACC15";
  return "var(--wr-danger, #FF6B6B)";
}

/* =========================
   Segmented chips (modular)
   ========================= */
function Segmented<V extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: V;
  items: { label: React.ReactNode; value: V }[];
  onChange: (v: V) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TOKENS.border }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`h-8 rounded-full px-3 text-sm transition cursor-pointer ${
            value === it.value ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
          }`}
          title={typeof it.label === "string" ? it.label : undefined}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* =========================
   Component
   ========================= */
export default function SerpFeatureLandscapeGrid({
  data = DEMO,
  freemium = true, // true = PDF gated
  onViewKeywords,
}: {
  data?: FeatureCardData[];
  freemium?: boolean;
  onViewKeywords?: (featureId: FeatureCode) => void;
}) {
  const [device, setDevice] = useState<Device>("all");
  const [ktype, setKtype] = useState<KeywordType>("all");
  const [linkFilter, setLinkFilter] = useState<LinkedFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Filter + compute per card
  const computed = useMemo(() => {
    const rows = data
      .map((f) => {
        const c = pickCounts(f, device, ktype);
        const missed = Math.max(0, c.triggered - c.linked);
        const cov = c.triggered > 0 ? c.linked / c.triggered : 0;
        return { ...f, c, missed, cov };
      })
      .filter((row) => {
        if (linkFilter === "linked") return row.c.linked > 0;
        if (linkFilter === "not_linked") return row.missed > 0;
        return true;
      })
      .sort((a, b) => b.c.triggered - a.c.triggered);

    const totalTriggered = rows.reduce((s, r) => s + r.c.triggered, 0);
    const totalLinked = rows.reduce((s, r) => s + r.c.linked, 0);
    const totalMissed = Math.max(0, totalTriggered - totalLinked);

    return {
      rows,
      totals: { triggered: totalTriggered, linked: totalLinked, missed: totalMissed },
    };
  }, [data, device, ktype, linkFilter]);

  const visibleRows = showAll ? computed.rows : computed.rows.slice(0, 8);

  function exportCSV() {
    const head = [
      "feature_id",
      "feature_name",
      "triggered",
      "linked",
      "missed",
      "coverage",
      "device",
      "keyword_type",
      "linked_filter",
    ];
    const lines = computed.rows.map((r) =>
      [r.id, `"${r.name}"`, r.c.triggered, r.c.linked, r.missed, (r.cov * 100).toFixed(1) + "%", device, ktype, linkFilter].join(",")
    );
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "serp-feature-landscape.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  return (
    <section
      className="w-full rounded-xl border bg-white p-4 sm:p-6 mt-4"
      style={{
        borderColor: TOKENS.border,
        boxShadow: TOKENS.shadowSm,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-labelledby="serp-landscape-title"
    >
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" color={TOKENS.brand} aria-hidden="true" />
          <h3
            id="serp-landscape-title"
            className="text-[16px] font-semibold"
            style={{ color: TOKENS.text }}
            title="Which SERP features your keywords trigger, where you’re linked, and missed opportunities."
          >
            SERP Features Landscape: Linked vs Missed Opportunities
          </h3>

          {/* Totals chip */}
          <div
            className="hidden md:ml-2 md:inline-flex items-center rounded-full border px-2.5 py-1 text-xs"
            style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
          >
            <span className="font-medium" style={{ color: TOKENS.text }}>
              {fmt(computed.totals.triggered)} triggering
            </span>
            <span className="mx-2">·</span>
            <span className="font-medium" style={{ color: TOKENS.text }}>
              {fmt(computed.totals.linked)} linked
            </span>
            <span className="mx-2">·</span>
            <span className="font-medium" style={{ color: TOKENS.text }}>
              {fmt(computed.totals.missed)} missed
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Device chips */}
          <Segmented
            ariaLabel="Device"
            value={device}
            onChange={(v) => setDevice(v as Device)}
            items={[
              { value: "all", label: "All" },
              { value: "desktop", label: "Desktop" },
              { value: "mobile", label: "Mobile" },
            ]}
          />
          {/* Keyword type chips */}
          <Segmented
            ariaLabel="Keyword Type"
            value={ktype}
            onChange={(v) => setKtype(v as KeywordType)}
            items={[
              { value: "all", label: "All" },
              { value: "branded", label: "Branded" },
              { value: "nonbranded", label: "Non‑Branded" },
            ]}
          />
          {/* Linked status chips */}
          <Segmented
            ariaLabel="Linked Status"
            value={linkFilter}
            onChange={(v) => setLinkFilter(v as LinkedFilter)}
            items={[
              { value: "all", label: "All" },
              { value: "linked", label: "Linked Only" },
              { value: "not_linked", label: "Not Linked Only" },
            ]}
          />

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((s) => !s)}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition hover:bg-[var(--wr-bg-subtle,#F5F7FA)] cursor-pointer"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              title="Export this grid"
            >
              <Download className="h-4 w-4" color={TOKENS.brand} />
              Export
              <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
            </button>
            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white shadow-md"
                style={{ borderColor: TOKENS.border }}
              >
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={exportCSV}
                >
                  CSV (Cards Summary)
                </button>
                <button
                  className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
                  title="Upgrade to Pro to export PDF"
                  onClick={() => setExportOpen(false)}
                  disabled={freemium}
                >
                  PDF (Pro)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Divider */}
      <div className="my-4 border-t" style={{ borderColor: TOKENS.borderLight }} />

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleRows.map((f) => {
          const trig = f.c.triggered;
          const cov = f.cov;
          const missed = f.missed;
          const barColor = coverageColor(cov);
          const widthPct = trig > 0 ? `${(cov * 100).toFixed(0)}%` : "0%";
          const Icon = FEATURE_ICON[f.id];
          const color = FEATURE_COLOR[f.id] ?? f.color;

          return (
            <article
              key={f.id}
              className="flex flex-col rounded-xl border p-4"
              style={{
                borderColor: TOKENS.border,
                background: TOKENS.surface,
                borderRadius: TOKENS.radiusLg as any,
                boxShadow: TOKENS.shadowSm,
              }}
              title={`Triggered by ${trig} keywords. Your domain appears in ${f.c.linked}.`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-9 w-9 place-items-center rounded-full"
                    style={{ background: withAlpha(color, 0.12) }}
                    aria-hidden
                  >
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold" style={{ color: TOKENS.text }}>
                      {f.name}
                    </div>
                    <div className="text-xs" style={{ color: TOKENS.muted }}>
                      <span className="inline-flex items-center rounded-full border px-1.5 py-[1px]" style={{ borderColor: TOKENS.border }}>
                        {fmt(trig)} triggering
                      </span>
                    </div>
                  </div>
                </div>
                {/* Coverage */}
                <div className="text-right">
                  <div className="text-[12px]" style={{ color: TOKENS.muted }}>
                    Coverage
                  </div>
                  <div className="text-[14px] font-semibold" style={{ color: TOKENS.text }}>
                    {pct(cov)}
                  </div>
                </div>
              </div>

              {/* Counts */}
              <div className="mt-3 flex items-center gap-3 text-[12px]">
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1"
                  style={{ background: "rgba(46,204,113,0.10)", color: "var(--wr-success, #2ECC71)" }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {fmt(f.c.linked)} linked
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1"
                  style={{ background: "rgba(255,107,107,0.10)", color: "var(--wr-danger, #FF6B6B)" }}
                >
                  <XCircle className="h-4 w-4" />
                  {fmt(missed)} missed
                </span>
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden />
                <div
                  className="relative -mt-2 h-2 rounded-full transition-[width] duration-200 ease-out"
                  style={{ width: widthPct, background: barColor }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(cov * 100)}
                  aria-label={`${f.name} coverage`}
                />
                <div className="mt-1 text-[11px]" style={{ color: TOKENS.muted }}>
                  {trig === 0 ? "No keywords trigger this feature in the current filters." : `${fmt(f.c.linked)} of ${fmt(trig)} captured`}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4 flex-1" />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => onViewKeywords?.(f.id)}
                  className="inline-flex h-9 w-full items-center justify-center rounded-md border text-sm font-medium transition hover:bg-[var(--wr-brand-50,#D2EFFF)] cursor-pointer"
                  style={{
                    borderColor: TOKENS.border,
                    color: "var(--wr-brand, #008CCD)",
                    background: "var(--wr-brand-50, #D2EFFF)",
                  }}
                  title={`View keywords for ${f.name}`}
                >
                  View Keywords
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Footer: Show more */}
      {computed.rows.length > 8 && (
        <div className="mt-4 flex justify-center">
          <button
            className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-[var(--wr-bg-subtle,#F5F7FA)] cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? "Show Top 8" : `Show ${computed.rows.length - 8} More Features`}
          </button>
        </div>
      )}
    </section>
  );
}

