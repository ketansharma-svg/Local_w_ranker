"use client";
import React, { ReactElement, useMemo, useState } from "react";

/** -----------------------------------------------------------
 *  Wranker • OVI – Section 11: Top Organic Competitors (Preview)
 *  (Drop‑in React + Tailwind TSX)
 *
 *  ✅ Inter, Inter Fallback font stack
 *  ✅ No emoji
 *  ✅ Branded (#008CCD) icons for section title & actions (inline SVGs)
 *  ✅ Pointer cursor on all clickable elements
 *  ✅ Modular chips / toggle switch (as in recent designs)
 *  ✅ Uses Wranker tokens for colors; per‑SERP icons have relevant colors
 *  ✅ Favicons shown for domains (desktop + mobile)
 *  ✅ All table columns left‑aligned
 *  ✅ Pure React + Tailwind (no external icon libs)
 * ----------------------------------------------------------- */

type SerpCode =
  | "FS" // Featured Snippet
  | "PAA" // People Also Ask
  | "VIDEO"
  | "IMAGE"
  | "LOCAL"
  | "TOPSTORIES"
  | "KP" // Knowledge Panel
  | "DISCUSSIONS";

type SerpDiff = {
  code: SerpCode;
  you: number;
  competitor: number;
};

type Row = {
  domain: string;
  sharedKeywords: number;
  totalKeywords: number;
  visibilitySharedTop10Pct: number; // 0..100
  serpDiff?: SerpDiff[];
  faviconUrl?: string;
};

type Props = {
  rows?: Row[];
  yourTotalKeywords?: number;
  onCompare?: () => void;
  onOpenCompetitor?: (domain: string) => void;
  freemium?: boolean;
};

/* ------------------------------ TOKENS ------------------------------ */
const TOKENS = {
  brand: "var(--wr-brand,#008CCD)",
  brand50: "var(--wr-brand-50,#D2EFFF)",
  surface: "var(--wr-surface,#FFFFFF)",
  bgSubtle: "var(--wr-bg-subtle,#F5F7FA)",
  text: "var(--wr-text,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  success: "var(--wr-success,#2ECC71)",
  danger: "var(--wr-danger,#FF6B6B)",
  neutral: "var(--wr-neutral,#9CA3AF)",
  radius: "var(--wr-radius-lg,16px)",
  shadowSm: "var(--wr-shadow-sm,0 2px 6px rgba(0,0,0,.05))",
};

/* ------------------------------ UTILS ------------------------------ */
const fmt = (n: number) => n.toLocaleString();
const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;
const safeHost = (domainOrUrl: string) => {
  try {
    return new URL(domainOrUrl).hostname || domainOrUrl;
  } catch {
    return domainOrUrl;
  }
};
const faviconFor = (domain: string) =>
  `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(safeHost(domain))}`;

function visBadgeClass(p: number) {
  if (p > 50) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (p >= 30) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
}

/* ------------------------------ INLINE ICONS (no deps) ------------------------------ */
/** Section title icon (target/radar) — brand colored via CSS */
const IconCompetitors = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" className={className ?? "h-5 w-5"}>
    <circle cx="12" cy="12" r="7.5" strokeWidth="1.7" />
    <path d="M12 4v3M12 17v3M4 12h3M17 12h3" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="2.5" strokeWidth="1.7" />
  </svg>
);

const IconExport = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M12 3v12m0-12 4 4m-4-4-4 4M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconLock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const IconExternal = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M14 4h6v6M10 14 20 4M20 14v6h-6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ---- SERP feature icons (inline) with relevant colors ---- */
const SF_LABEL: Record<SerpCode, string> = {
  FS: "Featured Snippet",
  PAA: "People Also Ask",
  VIDEO: "Video",
  IMAGE: "Image Pack",
  LOCAL: "Local Pack",
  TOPSTORIES: "Top Stories",
  KP: "Knowledge Panel",
  DISCUSSIONS: "Discussions",
};
const SF_COLOR: Record<SerpCode, string> = {
  FS: "#34D399", // emerald
  PAA: "#3B82F6", // blue
  VIDEO: "#8B5CF6", // purple
  IMAGE: "#F59E0B", // amber
  LOCAL: "#FACC15", // yellow
  TOPSTORIES: "#EF4444", // red
  KP: "#14B8A6", // teal
  DISCUSSIONS: "#64748B", // slate
};

const IconStar = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.8">
    <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 18.8 6.2 20.8l1.1-6.4L2.6 9.8l6.5-.9L12 3z" />
  </svg>
);
const IconHelp = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.8">
    <path d="M12 18h.01M9.1 9.75A3 3 0 1115 11a2.5 2.5 0 00-2 2v.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="9.5" />
  </svg>
);
const IconVideo = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.8">
    <rect x="3" y="7" width="12" height="10" rx="2" />
    <path d="M19 9v6l3-2v-2l-3-2z" />
  </svg>
);
const IconImage = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M8 11l3 3 3-4 4 6" />
    <circle cx="8.5" cy="9.5" r="1.2" />
  </svg>
);
const IconPin = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.8">
    <path d="M12 22s7-5.1 7-11.2A7 7 0 105 10.8C5 16.9 12 22 12 22z" />
    <circle cx="12" cy="10.8" r="2.3" />
  </svg>
);
const IconNews = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 9h7M7 13h10M7 17h8" />
  </svg>
);
const IconKP = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 8h8M8 12h6M8 16h4" />
  </svg>
);
const IconDiscuss = ({ color = "currentColor" }) => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.8">
    <path d="M4 17l-1 4 4-1h9a4 4 0 004-4V8a4 4 0 00-4-4H8a4 4 0 00-4 4v9z" />
  </svg>
);

const SF_ICON: Record<SerpCode, (props: { color?: string }) => ReactElement> = {
  FS: ({ color }) => <IconStar color={color} />,
  PAA: ({ color }) => <IconHelp color={color} />,
  VIDEO: ({ color }) => <IconVideo color={color} />,
  IMAGE: ({ color }) => <IconImage color={color} />,
  LOCAL: ({ color }) => <IconPin color={color} />,
  TOPSTORIES: ({ color }) => <IconNews color={color} />,
  KP: ({ color }) => <IconKP color={color} />,
  DISCUSSIONS: ({ color }) => <IconDiscuss color={color} />,
};

/* ------------------------------ CHIPS / TOGGLE (modular) ------------------------------ */
function Segmented<V extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: V;
  items: { value: V; label: React.ReactNode }[];
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
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`h-8 rounded-full px-3 text-sm transition cursor-pointer ${
            value === it.value ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
          }`}
          title={typeof it.label === "string" ? it.label : undefined}
          type="button"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function ToggleSwitch({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: TOKENS.border, color: active ? TOKENS.text : TOKENS.muted }}
      title={title || label}
    >
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full border"
        style={{ borderColor: active ? TOKENS.brand : TOKENS.border, background: active ? "rgba(0,140,205,0.15)" : TOKENS.bgSubtle }}
      >
        <span
          className="absolute h-4 w-4 rounded-full transition-transform"
          style={{ background: active ? TOKENS.brand : "#CBD5E1", transform: active ? "translateX(20px)" : "translateX(2px)" }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>{label}</span>
    </button>
  );
}

/* ------------------------------ MAIN ------------------------------ */
export default function OVI_TopOrganicCompetitors({
  rows,
  yourTotalKeywords = 0,
  onCompare,
  onOpenCompetitor,
  freemium = false,
}: Props) {
  // demo data if none provided
  const demoRows: Row[] = [
    {
      domain: "contentpro.io",
      sharedKeywords: 684,
      totalKeywords: 1953,
      visibilitySharedTop10Pct: 45,
      serpDiff: [
        { code: "FS", you: 4, competitor: 7 },
        { code: "PAA", you: 12, competitor: 16 },
        { code: "VIDEO", you: 2, competitor: 1 },
      ],
    },
    {
      domain: "seoexpert.com",
      sharedKeywords: 512,
      totalKeywords: 2210,
      visibilitySharedTop10Pct: 38,
      serpDiff: [
        { code: "FS", you: 3, competitor: 5 },
        { code: "PAA", you: 10, competitor: 13 },
        { code: "LOCAL", you: 1, competitor: 3 },
      ],
    },
    {
      domain: "ranklabs.ai",
      sharedKeywords: 437,
      totalKeywords: 1340,
      visibilitySharedTop10Pct: 52,
      serpDiff: [
        { code: "FS", you: 6, competitor: 4 },
        { code: "PAA", you: 9, competitor: 9 },
        { code: "VIDEO", you: 1, competitor: 2 },
      ],
    },
    {
      domain: "pagesurge.io",
      sharedKeywords: 390,
      totalKeywords: 990,
      visibilitySharedTop10Pct: 28,
      serpDiff: [
        { code: "FS", you: 2, competitor: 6 },
        { code: "PAA", you: 7, competitor: 11 },
      ],
    },
    {
      domain: "optimz.ly",
      sharedKeywords: 342,
      totalKeywords: 1224,
      visibilitySharedTop10Pct: 33,
      serpDiff: [
        { code: "FS", you: 1, competitor: 3 },
        { code: "PAA", you: 6, competitor: 8 },
        { code: "IMAGE", you: 2, competitor: 5 },
      ],
    },
  ];

  /* sort controls (segmented) */
  type SortKey = "shared" | "visibility" | "total";
  const [sortKey, setSortKey] = useState<SortKey>("shared");
  const [showOverlapPct, setShowOverlapPct] = useState(true);
  const [openExport, setOpenExport] = useState(false);

  const base = (rows && rows.length ? rows : demoRows).slice(0, 5);
  const data = useMemo(() => {
    const arr = [...base];
    arr.sort((a, b) => {
      if (sortKey === "shared") return b.sharedKeywords - a.sharedKeywords;
      if (sortKey === "total") return b.totalKeywords - a.totalKeywords;
      return b.visibilitySharedTop10Pct - a.visibilitySharedTop10Pct;
    });
    return arr;
  }, [base, sortKey]);

  function exportCSV() {
    const head = [
      "Competitor Domain",
      "Shared Keywords",
      "Total Keywords",
      "Visibility (Shared Top10, %)",
      "SERP Advantage (short)",
      "Overlap % (vs your total)",
    ];
    const lines = data.map((r) => {
      const adv = (r.serpDiff || [])
        .slice(0, 5)
        .map((s) => {
          const diff = s.competitor - s.you;
          const tag = diff > 0 ? `+${diff}` : `${diff}`;
          return `${s.code}:${tag}`;
        })
        .join(" | ");
      const overlap = yourTotalKeywords > 0 ? (r.sharedKeywords / yourTotalKeywords) * 100 : NaN;
      return [
        r.domain,
        r.sharedKeywords,
        r.totalKeywords,
        r.visibilitySharedTop10Pct.toFixed(1),
        adv || "",
        isNaN(overlap) ? "" : overlap.toFixed(1),
      ].join(",");
    });
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "top-organic-competitors.csv";
    a.click();
    URL.revokeObjectURL(url);
    setOpenExport(false);
  }

  return (
    <section
      className="w-full rounded-xl border bg-white p-4 sm:p-5 mt-4"
      style={{
        borderColor: TOKENS.border,
        boxShadow: TOKENS.shadowSm,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-labelledby="wr-top-competitors-title"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconCompetitors className="h-5 w-5" />
          <h3 id="wr-top-competitors-title" className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Top Organic Competitors
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            ariaLabel="Sort metric"
            value={sortKey}
            onChange={(v) => setSortKey(v as SortKey)}
            items={[
              { value: "shared", label: "Shared KW" },
              { value: "visibility", label: "Visibility" },
              { value: "total", label: "Total KW" },
            ]}
          />
          <ToggleSwitch
            label="Show Overlap %"
            active={showOverlapPct}
            onClick={() => setShowOverlapPct((s) => !s)}
            title="Show overlap % in tooltip for Shared KW"
          />

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setOpenExport((s) => !s)}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition hover:bg-[var(--wr-bg-subtle,#F5F7FA)] cursor-pointer"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              aria-haspopup="menu"
              aria-expanded={openExport}
              aria-label="Export competitors table"
              title="Export"
            >
              <IconExport className="h-4 w-4" style={{ color: TOKENS.brand }} />
              Export
            </button>
            {openExport && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-2 min-w-[160px] overflow-hidden rounded-md border bg-white shadow-md"
                style={{ borderColor: TOKENS.border }}
              >
                <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer" onClick={exportCSV}>
                  CSV
                </button>
                <button
                  disabled={freemium}
                  title="Upgrade to export PDF"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed"
                >
                  <IconLock className="h-4 w-4" />
                  PDF (Pro)
                </button>
              </div>
            )}
          </div>

          {/* Compare CTA */}
          <button
            onClick={onCompare}
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white transition cursor-pointer"
            style={{ background: TOKENS.brand }}
            aria-label="Compare with Competitors"
            title="Compare with Competitors"
          >
            Compare with Competitors
            <IconExternal className="h-4 w-4 text-white/90" />
          </button>
        </div>
      </header>

      {/* Divider */}
      <div className="my-3 border-t" style={{ borderColor: TOKENS.borderLight }} />

      {/* Table (desktop/tablet) */}
      <div className="hidden md:block">
        <div className="overflow-auto rounded-lg border" style={{ borderColor: TOKENS.border }}>
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[var(--wr-bg-subtle,#F5F7FA)]">
              <tr className="text-[12px] text-[var(--wr-muted,#6B7280)]">
                <th className="px-3 py-2 font-medium">Competitor Domain</th>
                <th className="px-3 py-2 font-medium">Shared Keywords</th>
                <th className="px-3 py-2 font-medium">Total Keywords</th>
                <th className="px-3 py-2 font-medium">Visibility Score</th>
                <th className="px-3 py-2 font-medium">SERP Advantage</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const overlap = yourTotalKeywords > 0 ? (r.sharedKeywords / yourTotalKeywords) * 100 : undefined;
                const fav = r.faviconUrl || faviconFor(r.domain);
                return (
                  <tr key={r.domain} className="border-t hover:bg-gray-50" style={{ borderColor: TOKENS.borderLight }}>
                    {/* Domain + favicon */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onOpenCompetitor?.(r.domain)}
                        className="group inline-flex max-w-full items-center gap-2 hover:underline cursor-pointer"
                        title="Open Competitor Profile"
                      >
                        <img
                          src={fav}
                          alt=""
                          className="h-5 w-5 rounded"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                        />
                        <span className="truncate font-semibold" style={{ color: TOKENS.text }}>
                          {r.domain}
                        </span>
                      </button>
                    </td>

                    {/* Shared Keywords */}
                    <td className="px-3 py-2">
                      <span
                        className="font-medium"
                        style={{ color: TOKENS.text }}
                        title={
                          showOverlapPct && typeof overlap === "number"
                            ? `Shared with you: ${fmt(r.sharedKeywords)} (${overlap.toFixed(1)}% of your portfolio)`
                            : `Shared with you: ${fmt(r.sharedKeywords)}`
                        }
                      >
                        {fmt(r.sharedKeywords)}
                      </span>
                    </td>

                    {/* Total Keywords */}
                    <td className="px-3 py-2">{fmt(r.totalKeywords)}</td>

                    {/* Visibility Score (shared Top 10 %) */}
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-xs ${visBadgeClass(
                          r.visibilitySharedTop10Pct
                        )}`}
                        title="Share of your shared keywords ranking in Top 10 for this competitor"
                      >
                        {pct(r.visibilitySharedTop10Pct, 0)}
                      </span>
                    </td>

                    {/* SERP Advantage — per-feature icons with relevant colors */}
                    <td className="px-3 py-2">
                      {r.serpDiff && r.serpDiff.length ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r.serpDiff.slice(0, 4).map((s) => {
                            const diff = s.competitor - s.you;
                            const state = diff > 0 ? "comp-adv" : diff < 0 ? "you-adv" : "equal";
                            const ring =
                              state === "comp-adv"
                                ? "ring-rose-200 text-rose-700 bg-rose-50"
                                : state === "you-adv"
                                ? "ring-emerald-200 text-emerald-700 bg-emerald-50"
                                : "ring-gray-200 text-gray-700 bg-gray-100";
                            const tip = `${SF_LABEL[s.code]} — ${
                              diff > 0 ? `Competitor advantage (+${diff})` : diff < 0 ? `Your advantage (${diff})` : "Even"
                            } (You: ${s.you}, Competitor: ${s.competitor})`;
                            const Icon = SF_ICON[s.code];
                            const icolor = SF_COLOR[s.code];
                            return (
                              <span
                                key={r.domain + s.code}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-[2px] text-[11px] ring-1 ${ring}`}
                                title={tip}
                              >
                                <Icon color={icolor} />
                                <span>{s.code}</span>
                              </span>
                            );
                          })}
                          {r.serpDiff.length > 4 && (
                            <span
                              className="rounded bg-gray-100 px-1.5 py-[2px] text-[11px] text-gray-700"
                              title={`${r.serpDiff.length - 4} more features...`}
                            >
                              +{r.serpDiff.length - 4}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!data.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[13px] text-[var(--wr-muted,#6B7280)]">
                    No competitor data available for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer CTA */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={onCompare}
            className="text-[13px] font-medium text-[var(--wr-brand,#008CCD)] hover:underline cursor-pointer"
            aria-label="Open full competitor benchmark"
          >
            Compare with Competitors
          </button>
        </div>
      </div>

      {/* Mobile: list (favicons + badges) */}
      <div className="md:hidden">
        <ul className="divide-y" style={{ borderColor: TOKENS.border }}>
          {data.map((r) => {
            const fav = r.faviconUrl || faviconFor(r.domain);
            const overlap = yourTotalKeywords > 0 ? (r.sharedKeywords / yourTotalKeywords) * 100 : undefined;
            return (
              <li key={r.domain} className="py-3 first:pt-0 last:pb-0">
                <button
                  className="flex w-full items-center justify-between cursor-pointer"
                  onClick={() => onOpenCompetitor?.(r.domain)}
                  title="Open Competitor Profile"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={fav}
                      alt=""
                      className="h-5 w-5 rounded"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                    <span className="truncate text-[14px] font-semibold" style={{ color: TOKENS.text }}>
                      {r.domain}
                    </span>
                  </div>
                  <span className={`ml-2 inline-flex items-center rounded-full px-2 py-[2px] text-xs ${visBadgeClass(r.visibilitySharedTop10Pct)}`}>
                    {pct(r.visibilitySharedTop10Pct, 0)}
                  </span>
                </button>

                <div className="mt-2 pl-7 text-left text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--wr-muted,#6B7280)]">Shared KW</span>
                    <span
                      className="font-medium"
                      style={{ color: TOKENS.text }}
                      title={
                        showOverlapPct && typeof overlap === "number"
                          ? `${fmt(r.sharedKeywords)} (${overlap.toFixed(1)}% of your portfolio)`
                          : fmt(r.sharedKeywords)
                      }
                    >
                      {fmt(r.sharedKeywords)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[var(--wr-muted,#6B7280)]">Total KW</span>
                    <span className="font-medium" style={{ color: TOKENS.text }}>
                      {fmt(r.totalKeywords)}
                    </span>
                  </div>

                  {r.serpDiff && r.serpDiff.length ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {r.serpDiff.slice(0, 5).map((s) => {
                        const diff = s.competitor - s.you;
                        const state = diff > 0 ? "comp-adv" : diff < 0 ? "you-adv" : "equal";
                        const ring =
                          state === "comp-adv"
                            ? "ring-rose-200 text-rose-700 bg-rose-50"
                            : state === "you-adv"
                            ? "ring-emerald-200 text-emerald-700 bg-emerald-50"
                            : "ring-gray-200 text-gray-700 bg-gray-100";
                        const Icon = SF_ICON[s.code];
                        const icolor = SF_COLOR[s.code];
                        const tip = `${SF_LABEL[s.code]} — ${
                          diff > 0 ? `Competitor advantage (+${diff})` : diff < 0 ? `Your advantage (${diff})` : "Even"
                        } (You: ${s.you}, Competitor: ${s.competitor})`;
                        return (
                          <span key={r.domain + s.code} className={`inline-flex items-center gap-1 rounded px-1.5 py-[2px] text-[11px] ring-1 ${ring}`} title={tip}>
                            <Icon color={icolor} />
                            <span>{s.code}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
          {!data.length && (
            <li className="py-6 text-center text-[13px] text-[var(--wr-muted,#6B7280)]">No competitor data for this period.</li>
          )}
        </ul>

        {/* Footer CTA */}
        <div className="mt-3 flex justify-end">
          <button onClick={onCompare} className="text-[13px] font-medium text-[var(--wr-brand,#008CCD)] hover:underline cursor-pointer">
            Compare with Competitors
          </button>
        </div>
      </div>
    </section>
  );
}
