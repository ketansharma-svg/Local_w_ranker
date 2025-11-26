"use client";

import React, { useMemo, useState } from "react";

/** =========================================================
 * Wranker • OVI – Section 10: Top Subdomains (Preview)
 * REFINEMENTS APPLIED:
 * - Inter, Inter Fallback fonts
 * - No emoji
 * - Branded (#008CCD) icon in section title
 * - Pointer cursor for all clickable elements
 * - Modular toggle switch style consistent with recent designs
 * - Colors pulled from Wranker tokens (brand/success/danger/etc.)
 * - Favicons shown for each subdomain (desktop + mobile)
 * - All table columns left-aligned
 * - React + Tailwind only (no external libs)
 * ========================================================= */

type Row = {
  subdomain: string; // e.g., "blog.wranker.com"
  organicTraffic: number;
  trafficDeltaPct?: number | null; // signed % vs previous (e.g., 12.3 => +12.3%)
  keywordsRanked: number; // count in Top 100
  visibilityTop10: number; // numerator
  visibilityTotal: number; // denominator
  url?: string; // optional convenience link
};

type Props = {
  rows?: Row[];
  onViewFullReport?: () => void;
  onSubdomainClick?: (subdomain: string) => void;
  onKeywordsClick?: (subdomain: string) => void;
};

/* ------------------------------ TOKENS ------------------------------ */
const T = {
  brand: "var(--wr-brand, #008CCD)",
  surface: "var(--wr-surface, #FFFFFF)",
  bgSubtle: "var(--wr-bg-subtle, #F5F7FA)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  success: "var(--wr-success, #2ECC71)",
  danger: "var(--wr-danger, #FF6B6B)",
  neutral: "var(--wr-neutral, #9CA3AF)",
  radius: "var(--wr-radius-lg, 16px)",
  shadow: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.05))",
};

/* ------------------------------ ICONS (inline SVG, brand-colored) ------------------------------ */
const IconGrid = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" className={className ?? "h-5 w-5"}>
    <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.7" />
    <path strokeWidth="1.7" d="M5 8h14M8 12h3m3 0h3m-9 4h6" />
  </svg>
);
const IconChevronDown = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? "h-4 w-4"}>
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
      clipRule="evenodd"
    />
  </svg>
);
const IconArrowUp = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? "h-3.5 w-3.5"}>
    <path d="M10 3l4 6H6l4-6zM6 17h8v-2H6v2z" />
  </svg>
);
const IconArrowDown = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className ?? "h-3.5 w-3.5"}>
    <path d="M6 7h8V5H6v2zm4 12l-4-6h8l-4 6z" />
  </svg>
);
const IconExport = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" className={className ?? "h-4 w-4"}>
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l4 4m-4-4L8 8M4 20h16" />
  </svg>
);

/* ------------------------------ UTILS ------------------------------ */
const fmt = (n: number) => n.toLocaleString();
const pct = (n: number) => `${n.toFixed(1)}%`;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function middleTruncate(text: string, max = 28) {
  if (text.length <= max) return text;
  const keep = Math.floor((max - 3) / 2);
  return text.slice(0, keep) + "..." + text.slice(-keep);
}

/** Visibility % and contextual badge coloring using Wranker palette */
function visibilityBadge(row: Row) {
  const pctVal = row.visibilityTotal > 0 ? (row.visibilityTop10 / row.visibilityTotal) * 100 : 0;
  let cls = "bg-gray-100 text-gray-700";
  if (pctVal >= 70) cls = "bg-emerald-50 text-emerald-700";
  else if (pctVal >= 30) cls = "bg-amber-50 text-amber-700";
  else cls = "bg-rose-50 text-rose-700";
  return { pctVal, cls };
}

/** Favicon helper (uses Google S2 favicons) */
function Favicon({ host, size = 24 }: { host: string; size?: number }) {
  const src = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => {
        // subtle placeholder if favicon missing
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

/* ------------------------------ Toggle (modular, consistent with recent designs) ------------------------------ */
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
      title={title || label}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: T.border, color: active ? T.text : T.muted }}
    >
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full border"
        style={{ borderColor: active ? T.brand : T.border, background: active ? "rgba(0,140,205,0.15)" : T.bgSubtle }}
      >
        <span
          className="absolute h-4 w-4 rounded-full transition-transform"
          style={{ background: active ? T.brand : "#CBD5E1", transform: active ? "translateX(20px)" : "translateX(2px)" }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>{label}</span>
    </button>
  );
}

/* ------------------------------ DeltaPill (SVG arrows, no emoji) ------------------------------ */
function DeltaPill({ delta }: { delta?: number | null }) {
  if (delta == null) {
    return (
      <span
        className="inline-flex items-center rounded px-1.5 py-[2px] text-xs"
        style={{ background: T.bgSubtle, color: T.neutral }}
        title="No prior period"
      >
        —
      </span>
    );
  }
  const positive = delta > 0;
  const zero = delta === 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-[2px] text-xs ${
        zero ? "bg-gray-100 text-gray-600" : positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
      title={positive ? "Traffic increased" : zero ? "No change" : "Traffic decreased"}
    >
      {zero ? (
        "0.0%"
      ) : (
        <>
          {positive ? <IconArrowUp /> : <IconArrowDown />}
          {pct(Math.abs(delta))}
        </>
      )}
    </span>
  );
}

/* ============================== MAIN ============================== */
export default function Demo_TopSubdomainsPreview({
  rows = [],
  onViewFullReport,
  onSubdomainClick,
  onKeywordsClick,
}: Props) {
  // demo fallback
  const demoRows: Row[] =
    rows.length > 0
      ? rows
      : [
          {
            subdomain: "blog.wranker.com",
            organicTraffic: 12480,
            trafficDeltaPct: 12.4,
            keywordsRanked: 820,
            visibilityTop10: 320,
            visibilityTotal: 780,
            url: "https://blog.wranker.com",
          },
          {
            subdomain: "academy.wranker.com",
            organicTraffic: 9860,
            trafficDeltaPct: -5.6,
            keywordsRanked: 640,
            visibilityTop10: 190,
            visibilityTotal: 620,
            url: "https://academy.wranker.com",
          },
          {
            subdomain: "www.wranker.com",
            organicTraffic: 8450,
            trafficDeltaPct: 3.1,
            keywordsRanked: 510,
            visibilityTop10: 260,
            visibilityTotal: 500,
            url: "https://www.wranker.com",
          },
          {
            subdomain: "support.wranker.com",
            organicTraffic: 3660,
            trafficDeltaPct: 0.0,
            keywordsRanked: 210,
            visibilityTop10: 65,
            visibilityTotal: 190,
            url: "https://support.wranker.com",
          },
          {
            subdomain: "docs.wranker.com",
            organicTraffic: 2140,
            trafficDeltaPct: 9.2,
            keywordsRanked: 160,
            visibilityTop10: 52,
            visibilityTotal: 150,
            url: "https://docs.wranker.com",
          },
        ];

  // preview top 5 by traffic
  const top5 = useMemo(() => [...demoRows].sort((a, b) => b.organicTraffic - a.organicTraffic).slice(0, 5), [demoRows]);

  // mobile accordion
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // small view toggle (keeps spec intact; defaults to % badges)
  const [showPercent, setShowPercent] = useState(true);
  const [expOpen, setExpOpen] = useState(false);

  // CSV export
  function exportCSV() {
    const head = [
      "Subdomain",
      "OrganicTraffic",
      "TrafficDeltaPct",
      "KeywordsRanked",
      "VisibilityTop10",
      "VisibilityTotal",
      "URL",
    ];
    const body = top5.map((r) =>
      [r.subdomain, r.organicTraffic, r.trafficDeltaPct ?? "", r.keywordsRanked, r.visibilityTop10, r.visibilityTotal, r.url ?? ""].join(",")
    );
    const csv = [head.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "top-subdomains-preview.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExpOpen(false);
  }

  return (
    <section
      className="w-full rounded-xl border p-4 sm:p-5 mt-4"
      style={{
        background: T.surface,
        borderColor: T.border,
        boxShadow: T.shadow,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconGrid className="h-5 w-5" />
          <h3 className="text-[16px] font-semibold" style={{ color: T.text }}>
            Top Subdomains
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleSwitch label="Show % badges" active={showPercent} onClick={() => setShowPercent((v) => !v)} />
          {/* Export dropdown (chip-style) */}
          <div className="relative">
            <button
              onClick={() => setExpOpen((s) => !s)}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition hover:bg-[var(--wr-bg-subtle,#F5F7FA)] cursor-pointer"
              style={{ borderColor: T.border, color: T.text }}
              aria-haspopup="menu"
              aria-expanded={expOpen}
              title="Export"
            >
              <span style={{ color: T.brand }}>
                <IconExport />
              </span>
              Export
              <IconChevronDown />
            </button>
            {expOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white text-sm shadow"
                style={{ borderColor: T.border }}
              >
                <button className="block w-full px-3 py-2 text-left hover:bg-gray-50 cursor-pointer" onClick={exportCSV}>
                  CSV (Table)
                </button>
                <button
                  className="block w-full cursor-not-allowed px-3 py-2 text-left text-gray-400"
                  title="Upgrade to export PDF"
                  onClick={() => setExpOpen(false)}
                  disabled
                >
                  PDF (Pro)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onViewFullReport}
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition hover:bg-[var(--wr-brand-50,#D2EFFF)] cursor-pointer"
            style={{ borderColor: T.border, color: T.brand, background: "var(--wr-brand-50,#D2EFFF)" }}
            title="View Full Subdomain Report"
          >
            View Full Report
          </button>
        </div>
      </header>

      {/* Divider */}
      <div className="my-3 border-t" style={{ borderColor: T.borderLight }} />

      {/* Desktop / Tablet table */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: T.border }}>
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[var(--wr-bg-subtle,#F5F7FA)] text-[12px]">
              <tr className="text-[var(--wr-muted,#6B7280)]">
                <th scope="col" className="px-3 py-2 font-medium">
                  Subdomain
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Organic Traffic
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Traffic Δ
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Keywords Ranked
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Visibility Score
                </th>
              </tr>
            </thead>
            <tbody>
              {top5.map((r, idx) => {
                const { pctVal, cls } = visibilityBadge(r);
                const visPctText = pct(clamp(pctVal, 0, 100));
                const visFracText =
                  r.visibilityTotal > 0 ? `${r.visibilityTop10}/${r.visibilityTotal}` : "0/0";
                const host = r.url ? safeHost(r.url) : r.subdomain;
                return (
                  <tr key={r.subdomain + idx} className="border-t hover:bg-gray-50" style={{ borderColor: T.borderLight }}>
                    {/* Subdomain */}
                    <td className="px-3 py-2">
                      <button
                        className="inline-flex max-w-[320px] items-center gap-2 text-left hover:underline cursor-pointer"
                        style={{ color: T.text }}
                        onClick={() => onSubdomainClick?.(r.subdomain)}
                        title={r.url || r.subdomain}
                        aria-label={`Open ${r.subdomain}`}
                      >
                        <Favicon host={host} />
                        <span className="truncate font-medium">{middleTruncate(r.subdomain)}</span>
                      </button>
                    </td>

                    {/* Organic Traffic */}
                    <td className="px-3 py-2">
                      <span className="font-medium" style={{ color: T.text }}>
                        {fmt(r.organicTraffic)}
                      </span>
                    </td>

                    {/* Traffic Δ */}
                    <td className="px-3 py-2">
                      <DeltaPill delta={r.trafficDeltaPct ?? null} />
                    </td>

                    {/* Keywords Ranked */}
                    <td className="px-3 py-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-[2px] text-xs transition hover:bg-gray-50 cursor-pointer"
                        style={{ borderColor: T.border, color: T.text }}
                        onClick={() => onKeywordsClick?.(r.subdomain)}
                        aria-label={`Open keywords for ${r.subdomain}`}
                        title="Open Keyword Trends (filtered by subdomain)"
                      >
                        {fmt(r.keywordsRanked)}
                      </button>
                    </td>

                    {/* Visibility Score */}
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-[3px] text-xs ${cls}`}>
                        <span className="font-semibold">{showPercent ? visPctText : visFracText}</span>
                        <span className="text-[11px] text-gray-600">{showPercent ? "Top 10 Coverage" : "Top10 / Total"}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!top5.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[13px]" style={{ color: T.muted }}>
                    Nothing to show for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile accordion (≤640px) */}
      <div className="sm:hidden">
        <ul className="divide-y" style={{ borderColor: T.borderLight }}>
          {top5.map((r, idx) => {
            const open = openIdx === idx;
            const { pctVal, cls } = visibilityBadge(r);
            const visPctText = pct(clamp(pctVal, 0, 100));
            const visFracText = r.visibilityTotal > 0 ? `${r.visibilityTop10}/${r.visibilityTotal}` : "0/0";
            const host = r.url ? safeHost(r.url) : r.subdomain;
            return (
              <li key={r.subdomain + idx} className="py-2">
                <button
                  className="flex w-full items-center justify-between gap-3"
                  onClick={() => setOpenIdx(open ? null : idx)}
                  aria-expanded={open}
                  aria-controls={`sd-${idx}`}
                  title="Toggle details"
                >
                  <div className="flex min-w-0 items-center gap-2 text-left">
                    <Favicon host={host} />
                    <span className="truncate font-medium" style={{ color: T.text }}>
                      {middleTruncate(r.subdomain, 30)}
                    </span>
                  </div>
                  <span className={`transition-transform ${open ? "rotate-180" : ""}`} style={{ color: T.muted }}>
                    <IconChevronDown />
                  </span>
                </button>

                {open && (
                  <div id={`sd-${idx}`} className="mt-2 rounded-md border p-3 text-left text-[13px]" style={{ borderColor: T.border }}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-gray-500">Organic Traffic</span>
                      <span className="font-semibold" style={{ color: T.text }}>
                        {fmt(r.organicTraffic)}
                      </span>
                    </div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-gray-500">Traffic Δ</span>
                      <DeltaPill delta={r.trafficDeltaPct ?? null} />
                    </div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-gray-500">Keywords Ranked</span>
                      <button
                        className="rounded-md border px-2 py-[2px] text-xs transition hover:bg-gray-50 cursor-pointer"
                        style={{ borderColor: T.border, color: T.text }}
                        onClick={() => onKeywordsClick?.(r.subdomain)}
                        title="Open Keyword Trends (filtered by subdomain)"
                      >
                        {fmt(r.keywordsRanked)}
                      </button>
                    </div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-gray-500">Visibility</span>
                      <span className={`rounded-full px-2.5 py-[3px] text-xs ${cls}`}>
                        {showPercent ? visPctText : visFracText}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-end">
                      <a
                        className="text-xs underline cursor-pointer"
                        href={r.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: T.brand }}
                        title={r.url || r.subdomain}
                      >
                        Visit
                      </a>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {!top5.length && (
            <li className="py-6 text-center text-[13px]" style={{ color: T.muted }}>
              Nothing to show for the selected period.
            </li>
          )}
        </ul>
      </div>

      {/* Footer CTA (desktop/tablet) */}
      <div className="mt-4 hidden items-center justify-end sm:flex">
        <button
          onClick={onViewFullReport}
          className="rounded-md px-3 py-2 text-sm font-medium underline cursor-pointer"
          style={{ color: T.brand }}
          aria-label="View Full Subdomain Report"
          title="View Full Subdomain Report"
        >
          View Full Subdomain Report
        </button>
      </div>
    </section>
  );
}

/* ------------------------------ Helpers ------------------------------ */
function safeHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
