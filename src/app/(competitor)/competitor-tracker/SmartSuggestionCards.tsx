"use client";

import React, { useEffect, useMemo } from "react";
import { Info as InfoIcon, ChevronRight } from "lucide-react";

/**
 * Backlink Tracker • Section 4.1 — Smart Suggestions Cards
 * Drop‑in TSX (Tailwind only; no external UI deps)
 *
 * ✅ Implements
 *  - Three smart KPI cards: New Backlinks, Broken Links, Vefogix Opportunities
 *  - Threshold‑based “Opportunity Detected” highlights
 *  - Tooltips (pure CSS, accessible)
 *  - “New since last visit” blue dot
 *  - Desktop: horizontal scroll; Mobile: stacked
 *  - CTA handlers (scroll/redirect) passed in via props
 *  - Optional Phase‑2 AI hint line (sharedAcrossCompetitorsCount)
 *
 * Wire your real counts into <SmartSuggestionCards data=... onCta=... />
 */

/* -------------------------------- TOKENS -------------------------------- */
const TK = {
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  cardShadow: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)",
  brand: "#1090D0", // CTA/link blue
  primaryAlt: "#0077FF", // secondary brand blue (not primary CTA for these cards)
  red: "#EF4444",
  yellow: "#F59E0B",
  blueDot: "#3B82F6",
  green: "#10B981",
} as const;

/* -------------------------------- TYPES --------------------------------- */
export type SmartCardData = {
  rangeLabel: string; // "This Month", "Last 30 Days"...
  lastVisitISO?: string;
  isNewSinceLastVisit?: boolean;

  // New Backlinks
  newLinksCount?: number;
  competitorCountWithNew?: number;

  // Broken Links
  brokenCount?: number;
  highWrBrokenCount?: number; // subset with WR >= 70

  // Vefogix
  vefogixDomainsCount?: number;
  topVefogixDomains?: { domain: string; recommended?: boolean }[];

  // Phase‑2 AI enhancement (optional)
  sharedAcrossCompetitorsCount?: number; // >=1 -> render AI hint
};

type SmartSuggestionCardsProps = {
  data: SmartCardData;
  projectId?: string;
  onCta: {
    /** Scroll to table w/ Status=New */
    viewNew: () => void;
    /** Scroll to table w/ Status in (Broken/Removed/Not Found) */
    viewBroken: () => void;
    /** Redirect to Opportunities tab w/ prefilters */
    viewVefogix: () => void;
  };
  /** Optional analytics hook */
  onEvent?: (name: string, payload?: Record<string, any>) => void;
  /** Optional: force compact when embedding in tight sidebars */
  dense?: boolean;
  className?: string;
};

/* ------------------------------ UTILITIES ------------------------------- */
function clsx(...xs: (string | undefined | false | null)[]) {
  return xs.filter(Boolean).join(" ");
}
const nf = (n?: number) =>
  typeof n === "number" ? new Intl.NumberFormat().format(n) : "0";

/* ------------------------------ TOOLTIP UI ------------------------------ */
function InfoTip({
  label,
  side = "top",
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const pos =
    side === "top"
      ? "bottom-full mb-1 left-1/2 -translate-x-1/2"
      : side === "bottom"
      ? "top-full mt-1 left-1/2 -translate-x-1/2"
      : side === "left"
      ? "right-full mr-1 top-1/2 -translate-y-1/2"
      : "left-full ml-1 top-1/2 -translate-y-1/2";
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} className="text-[#9CA3AF]" />
      <span
        role="tooltip"
        className={clsx(
          "pointer-events-none invisible group-hover:visible absolute z-50 w-64 rounded border bg-[#111827] px-2 py-1 text-xs leading-snug text-white shadow",
          pos
        )}
        style={{ borderColor: "#00000020" }}
      >
        {label}
      </span>
    </span>
  );
}

/* ------------------------------ BADGE UI -------------------------------- */
function Pill({
  children,
  color,
  title,
}: React.PropsWithChildren<{ color: string; title?: string }>) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded px-2 py-[2px] text-[12px] font-medium"
      style={{
        color,
        background: `${color}14`,
        border: `1px solid ${color}26`,
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------ CARD BASE -------------------------------- */
function SmartCardBase({
  title,
  icon,
  tooltip,
  valueLine,
  ctaLabel,
  onCta,
  highlightColor,
  showNewDot,
  extraBadge,
  secondaryLine,
  dense,
  ariaLabel,
}: {
  title: string;
  icon?: React.ReactNode;
  tooltip?: string;
  valueLine: string;
  ctaLabel: string;
  onCta: () => void;
  /** When provided → left border + subtle highlight */
  highlightColor?: string;
  /** small blue dot top‑right */
  showNewDot?: boolean;
  /** optional chip below title (e.g., High Authority Loss / Recommended ×N) */
  extraBadge?: React.ReactNode;
  /** optional secondary descriptive line (AI hint) */
  secondaryLine?: string;
  dense?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel || title}
      className={clsx(
        "relative inline-block align-top",
        // card
        "rounded-[10px] border bg-white shadow-sm",
        dense ? "w-[260px]" : "w-[280px]",
        "px-3 py-3",
        "transition-transform will-change-transform hover:-translate-y-0.5"
      )}
      style={{
        borderColor: TK.border,
        boxShadow: TK.cardShadow,
        ...(highlightColor
          ? {
              boxShadow:
                "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)",
              borderLeft: `3px solid ${highlightColor}`,
            }
          : null),
      }}
    >
      {/* new-dot */}
      {showNewDot && (
        <span
          aria-hidden
          className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full"
          style={{ background: TK.blueDot }}
        />
      )}

      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h4
              className="truncate text-[15px] font-semibold"
              style={{ color: TK.text }}
              title={title}
            >
              {title}
            </h4>
            {tooltip && <InfoTip label={tooltip} />}
          </div>
          {extraBadge ? <div className="mt-1">{extraBadge}</div> : null}
        </div>
      </div>

      {/* value line */}
      <div className="mt-2 text-[13px]" style={{ color: TK.muted }}>
        {valueLine}
      </div>

      {/* secondary line (AI hint) */}
      {secondaryLine ? (
        <div className="mt-1 text-[12px]" style={{ color: TK.text }}>
          {secondaryLine}
        </div>
      ) : null}

      {/* CTA */}
      <div className="mt-3">
        <button
          type="button"
          onClick={onCta}
          className="group inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm"
          style={{ color: TK.brand }}
          aria-label={ctaLabel}
        >
          <span className="underline decoration-1">{ctaLabel}</span>
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

/* --------------------------- MAIN CARDS WRAPPER ------------------------- */
export function SmartSuggestionCards({
  data,
  projectId,
  onCta,
  onEvent,
  dense,
  className,
}: SmartSuggestionCardsProps) {
  // Derived flags
  const hasNew = (data.newLinksCount ?? 0) >= 5;
  const hasBroken = (data.brokenCount ?? 0) >= 1;
  const hasVfx = (data.vefogixDomainsCount ?? 0) >= 1;

  const recommendedCount = useMemo(
    () =>
      (data.topVefogixDomains || []).filter((d) => d.recommended).length,
    [data.topVefogixDomains]
  );

  // Fire impression event once (simplified)
  useEffect(() => {
    onEvent?.("suggestions_card_impression", {
      range: data.rangeLabel,
      newLinksCount: data.newLinksCount,
      brokenCount: data.brokenCount,
      vefogixDomainsCount: data.vefogixDomainsCount,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cards content
  const cards = [
    {
      key: "new",
      title: `🔗 New Backlinks This ${data.rangeLabel}`,
      tooltip: "Links acquired since last sync.",
      valueLine: `${nf(data.newLinksCount)} total new backlinks${
        data.competitorCountWithNew
          ? ` across ${nf(data.competitorCountWithNew)} competitors`
          : ""
      }`,
      ctaLabel: "View All →",
      onCta: () => {
        onEvent?.("suggestions_card_cta_click", {
          cardType: "new",
          range: data.rangeLabel,
          filterApplied: "status=new",
        });
        onCta.viewNew();
      },
      highlightColor: hasNew ? TK.brand : undefined,
      showNewDot: data.isNewSinceLastVisit,
      extraBadge: null,
      secondaryLine:
        data.sharedAcrossCompetitorsCount && data.sharedAcrossCompetitorsCount > 0
          ? `✨ ${data.sharedAcrossCompetitorsCount} domains are shared across 2+ competitors. High‑priority targets.`
          : undefined,
    },
    {
      key: "broken",
      title: "❌ Broken Competitor Links",
      tooltip: "May offer link insertion opportunity.",
      valueLine: `${nf(data.brokenCount)} detected${
        data.highWrBrokenCount
          ? `, ${nf(data.highWrBrokenCount)} on high WR domains`
          : ""
      }`,
      ctaLabel: "View Broken Links →",
      onCta: () => {
        onEvent?.("suggestions_card_cta_click", {
          cardType: "broken",
          range: data.rangeLabel,
          filterApplied: "status=broken|removed|not_found",
        });
        onCta.viewBroken();
      },
      highlightColor: hasBroken ? TK.red : undefined,
      showNewDot: data.isNewSinceLastVisit,
      extraBadge:
        (data.highWrBrokenCount ?? 0) > 0 ? (
          <Pill color={TK.red} title="High Authority Loss: WR ≥ 70">
            🔥 High Authority Loss
          </Pill>
        ) : null,
      secondaryLine: undefined,
    },
    {
      key: "vefogix",
      title: "⚡ Vefogix Opportunities",
      tooltip:
        "Backlink opportunity found via our link‑building marketplace.",
      valueLine: `${nf(
        data.vefogixDomainsCount
      )} referring domains available for outreach`,
      ctaLabel: "Explore Opportunities →",
      onCta: () => {
        onEvent?.("suggestions_card_cta_click", {
          cardType: "vefogix",
          range: data.rangeLabel,
          destination: "opportunities_tab",
          utm: { source: "wranker", medium: "suggestions_card", projectId },
        });
        onCta.viewVefogix();
      },
      highlightColor: hasVfx ? TK.yellow : undefined,
      showNewDot: data.isNewSinceLastVisit,
      extraBadge:
        recommendedCount > 0 ? (
          <Pill color={TK.yellow} title="Top recommended domains based on WR & niche match">
            Recommended ×{recommendedCount}
          </Pill>
        ) : null,
      secondaryLine: undefined,
    },
  ];

  // Optional: re‑order with “detected” cards first (kept simple: stable order)
  // If you want to float highlights first, uncomment:
  // cards.sort((a, b) => Number(Boolean(b.highlightColor)) - Number(Boolean(a.highlightColor)));

  return (
    <section className={clsx("w-full", className)}>
      {/* Desktop: horizontal scroll (cards are inline‑block) / Mobile: stack */}
      <div
        className={clsx(
          // container
          "rounded-[10px] border bg-white p-3",
          "shadow-sm"
        )}
        style={{ borderColor: TK.border }}
      >
        <div className="hidden gap-3 md:flex md:overflow-x-auto md:whitespace-nowrap md:[scrollbar-width:thin]">
          {cards.map((c) => (
            <SmartCardBase
              key={c.key}
              title={c.title}
              tooltip={c.tooltip}
              valueLine={c.valueLine}
              ctaLabel={c.ctaLabel}
              onCta={c.onCta}
              highlightColor={c.highlightColor}
              showNewDot={c.showNewDot}
              extraBadge={c.extraBadge}
              secondaryLine={c.secondaryLine}
              dense={dense}
              ariaLabel={`${c.title}: ${c.valueLine}. ${c.ctaLabel}`}
            />
          ))}
        </div>

        {/* Mobile: stacked */}
        <div className="flex flex-col gap-2 md:hidden">
          {cards.map((c) => (
            <div key={c.key} className="w-full">
              <SmartCardBase
                title={c.title}
                tooltip={c.tooltip}
                valueLine={c.valueLine}
                ctaLabel={c.ctaLabel}
                onCta={c.onCta}
                highlightColor={c.highlightColor}
                showNewDot={c.showNewDot}
                extraBadge={c.extraBadge}
                secondaryLine={c.secondaryLine}
                dense
                ariaLabel={`${c.title}: ${c.valueLine}. ${c.ctaLabel}`}
              />
              {/* Mobile full‑width CTA (mirrors inside card action, optional) */}
              <button
                type="button"
                onClick={c.onCta}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: TK.border, color: TK.brand, background: "#fff" }}
              >
                {c.ctaLabel}
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ DEMO EXPORT ----------------------------- */
/** Demo/mock usage — replace with real data & handlers in your app */
export default function SmartSuggestionCardsDemo() {
  const data: SmartCardData = {
    rangeLabel: "This Month",
    isNewSinceLastVisit: true,
    newLinksCount: 48,
    competitorCountWithNew: 3,
    brokenCount: 12,
    highWrBrokenCount: 6,
    vefogixDomainsCount: 9,
    topVefogixDomains: [
      { domain: "techdaily.ai", recommended: true },
      { domain: "marcomedia.io", recommended: true },
      { domain: "seogear.co", recommended: true },
    ],
    sharedAcrossCompetitorsCount: 3,
  };

  return (
    <div className="w-full mt-4">
      <div className="mx-auto w-full ">
        <SmartSuggestionCards
          data={data}
          projectId="myproject123"
          onCta={{
            viewNew: () => {
              // Example: apply filter + smooth scroll
              console.info("Scroll to table with filter: status=new");
              document.querySelector("#backlinks-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
            },
            viewBroken: () => {
              console.info("Scroll to table with filter: status=broken|removed|not_found");
              document.querySelector("#backlinks-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
            },
            viewVefogix: () => {
              console.info("Redirect to Opportunities Tab (prefilter: MatchedFromCompetitorTracker=true)");
              // window.location.href = "/backlinks/opportunities?matchedFromTracker=1";
            },
          }}
          onEvent={(name, payload) => console.debug("[analytics]", name, payload)}
        />
      </div>
    </div>
  );
}
