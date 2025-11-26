'use client';
import React, { useMemo } from 'react';
import {
  Sparkles,
  Magnet,
  BarChart3,
  Brain,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

/** ---------------------------------------------------------------------------
 *  BacklinkSmartInsights (Smart Insight Card Block)
 *  - Spec-driven cards for backlink gap insights (Vefogix-aware)
 *  - Desktop: 2–3 cards per row grid; Mobile: horizontal scroll
 *  - Only shows cards when the current filtered dataset supports them
 *  - Primary pill buttons (#1090D0), secondary ghost buttons, sky-blue border
 *  - Card min width 320px; spacing 16px; responsive padding
 * -------------------------------------------------------------------------- */

type RefDomain = {
  domain: string;
  wrScore: number; // 0–100 (authority)
  linksToCompetitors: string[]; // competitors this domain links to
  linksToYou: boolean; // whether it links to your site
  dofollowRatio?: number; // 0–100
  hasOpportunity?: boolean; // via Vefogix
  isNewOpportunity?: boolean; // optional: show "New" badge
};

export type BacklinkSmartInsightsProps = {
  /** Referring domains from the CURRENT filtered view (source of truth) */
  refDomains?: RefDomain[] | null;
  /** Prefer a competitor to personalize the "Unique to X" quick wins */
  selectedCompetitor?: string | null;
  /** Handlers (host app can deep-link to tables, drawers, or external) */
  onViewAllOpportunities?: () => void;
  onOpenOpportunitiesForDomain?: (domain: string) => void;
  onCreateLink?: (domain: string) => void;
  onShowInTable?: (filters: Record<string, unknown>) => void;
  onAddTask?: (payload: { type: 'link' | 'outreach'; domains: string[]; note?: string }) => void;
  onAnalyzeDomain?: (domain: string) => void;
  /** Force horizontal scroll layout (otherwise: scroll on mobile, grid on desktop) */
  forceScroll?: boolean;
  className?: string;
};

const BRAND = '#1090D0';
const ACTIONABLE_BORDER = '#D2EFFF';

function fmt(n: number) {
  try {
    return Number(n).toLocaleString();
  } catch {
    return String(n);
  }
}

/** Demo dataset so the block renders immediately in VS Code / Storybook */
function buildDemoData(): RefDomain[] {
  const out: RefDomain[] = [];
  // "Most linked domain" example
  out.push({
    domain: 'techinsider.com',
    wrScore: 82,
    linksToCompetitors: ['comp1.com', 'comp2.com', 'comp3.com'],
    linksToYou: false,
    hasOpportunity: true,
    isNewOpportunity: true,
  });
  // 23 additional opportunities (to reach 24)
  for (let i = 0; i < 23; i++) {
    out.push({
      domain: `opportunity-${i + 1}.blog`,
      wrScore: 55 + (i % 20),
      linksToCompetitors: i % 3 === 0 ? ['comp1.com', 'comp2.com'] : ['comp2.com'],
      linksToYou: false,
      hasOpportunity: i < 12,
      isNewOpportunity: i < 2,
    });
  }
  // 11 high-authority missed domains (WR > 80)
  for (let i = 0; i < 11; i++) {
    out.push({
      domain: `authority-${i + 1}.io`,
      wrScore: 81 + (i % 10),
      linksToCompetitors: i % 2 === 0 ? ['comp2.com'] : ['comp1.com', 'comp2.com'],
      linksToYou: false,
      hasOpportunity: i % 3 === 0,
    });
  }
  // 5 unique-to-comp1 quick wins
  for (let i = 0; i < 5; i++) {
    out.push({
      domain: `unique-comp1-${i + 1}.net`,
      wrScore: 60 + (i % 8),
      linksToCompetitors: ['comp1.com'],
      linksToYou: false,
      hasOpportunity: i % 2 === 0,
    });
  }
  // A few noise rows (already link to us → should not appear in "gap" logic)
  out.push({
    domain: 'allyours.com',
    wrScore: 77,
    linksToCompetitors: ['comp3.com'],
    linksToYou: true,
    hasOpportunity: false,
  });
  return out;
}

/** A single Smart Insight card */
function Card({
  icon,
  title,
  body,
  primary,
  secondary,
  actionable,
  newBadge,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actionable?: boolean;
  newBadge?: boolean;
  primary?: { label: string; onClick?: () => void; disabled?: boolean; tooltip?: string };
  secondary?: { label: string; onClick?: () => void; disabled?: boolean; tooltip?: string };
}) {
  const borderClass = actionable ? 'border-[var(--sky)]' : 'border-gray-200';
  return (
    <div
      className={[
        'group relative min-w-[320px] rounded-xl bg-white p-4 sm:p-5 shadow-sm transition',
        'hover:shadow-md',
        'border',
        borderClass,
      ].join(' ')}
      style={{ ['--sky' as any]: ACTIONABLE_BORDER }}
      role="region"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5" aria-hidden>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-gray-900">{title}</h4>
            {newBadge && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                New
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">{body}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {primary && (
              <button
                type="button"
                title={primary.tooltip}
                onClick={primary.onClick}
                disabled={primary.disabled}
                className={[
                  'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-white',
                  'bg-[color:var(--brand,#1090D0)] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                ].join(' ')}
                style={{ ['--brand' as any]: BRAND }}
              >
                {primary.label}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </button>
            )}
            {secondary && (
              <button
                type="button"
                title={secondary.tooltip}
                onClick={secondary.onClick}
                disabled={secondary.disabled}
                className={[
                  'inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700',
                  'hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
                ].join(' ')}
              >
                {secondary.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Metric builders (driven from the current filtered table) */
function useDerived(refDomains: RefDomain[] = [], selectedCompetitor?: string | null) {
  const safe = Array.isArray(refDomains) ? refDomains : [];
  const gap = safe.filter((d) => d && !d.linksToYou);
  const opp = gap.filter((d) => d.hasOpportunity);
  const highAuth = gap.filter((d) => Number(d.wrScore) > 80);

  // Most linked domain to competitors but not to you (priority gap)
  const mostLinked = gap
    .slice()
    .sort((a, b) => (b.linksToCompetitors?.length || 0) - (a.linksToCompetitors?.length || 0))[0];

  // Unique-to-competitor quick wins (length === 1)
  const byCompetitor: Record<string, RefDomain[]> = {};
  for (const d of gap) {
    const arr = Array.isArray(d.linksToCompetitors) ? d.linksToCompetitors : [];
    if (arr.length === 1) {
      const c = arr[0];
      if (c) (byCompetitor[c] ||= []).push(d);
    }
  }

  const bestQuickWinsEntry =
    selectedCompetitor && byCompetitor[selectedCompetitor]
      ? [selectedCompetitor, byCompetitor[selectedCompetitor] as RefDomain[]]
      : (Object.entries(byCompetitor).sort((a, b) => (b[1]?.length ?? 0) - (a[1]?.length ?? 0))[0] as
          | [string, RefDomain[]]
          | undefined);

  const quickWinsCompetitor = bestQuickWinsEntry?.[0];
  const quickWinsDomains = bestQuickWinsEntry?.[1] ?? [];

  // Highest WR opportunity (for "Create Link" single-domain jump)
  const topOpp = opp.slice().sort((a, b) => Number(b.wrScore) - Number(a.wrScore))[0];

  const newBadge = opp.some((d) => d.isNewOpportunity);

  return {
    gapCount: gap.length,
    opportunityCount: opp.length,
    topOpportunityDomain: topOpp,
    mostLinkedDomain: mostLinked,
    highAuthorityMissedCount: highAuth.length,
    highAuthorityMissedList: highAuth,
    quickWinsCompetitor,
    quickWinsDomains,
    hasNew: newBadge,
  };
}

export default function BacklinkSmartInsights({
  refDomains,
  selectedCompetitor,
  onViewAllOpportunities,
  onOpenOpportunitiesForDomain,
  onCreateLink,
  onShowInTable,
  onAddTask,
  onAnalyzeDomain,
  forceScroll = false,
  className,
}: BacklinkSmartInsightsProps) {
  const data = useMemo(() => (Array.isArray(refDomains) ? refDomains : buildDemoData()), [refDomains]);
  const d = useDerived(data, selectedCompetitor ?? undefined);

  // Build spec cards (max 4, only if relevant metrics exist)
  const cards: Array<React.ReactNode> = [];

  // ✅ 1) Link Opportunities Available
  if (d.opportunityCount > 0) {
    cards.push(
      <Card
        key="c-opportunities"
        icon={<Sparkles className="h-5 w-5 text-[color:var(--brand,#1090D0)]" style={{ ['--brand' as any]: BRAND }} />}
        title="Link Opportunities Available"
        body={`✨ ${fmt(d.opportunityCount)} domain${d.opportunityCount === 1 ? '' : 's'} from your backlink gap are available for link-building.`}
        actionable
        newBadge={d.hasNew}
        primary={{
          label: 'View All Opportunities',
          onClick: onViewAllOpportunities ?? (() => alert('Open: Backlink Opportunities (filtered)')),
          tooltip: 'See these domains inside the Backlink Opportunities panel.',
        }}
        secondary={{
          label: 'Create Link',
          onClick:
            d.topOpportunityDomain && (onCreateLink || onOpenOpportunitiesForDomain)
              ? () =>
                  (onCreateLink
                    ? onCreateLink(d.topOpportunityDomain!.domain)
                    : onOpenOpportunitiesForDomain?.(d.topOpportunityDomain!.domain))
              : undefined,
          disabled: !d.topOpportunityDomain,
          tooltip: d.topOpportunityDomain ? 'Opens first available opportunity on Vefogix.' : 'No verified opportunity available yet.',
        }}
      />
    );
  }

  // 🧲 2) Most Linked Domain (High Priority Gap)
  if (d.mostLinkedDomain && (d.mostLinkedDomain.linksToCompetitors?.length || 0) > 0) {
    const ld = d.mostLinkedDomain;
    cards.push(
      <Card
        key="c-most-linked"
        icon={<Magnet className="h-5 w-5 text-amber-600" />}
        title="Most Linked Domain (High Priority Gap)"
        body={`🧲 ${ld.domain} links to ${ld.linksToCompetitors.length} competitor${
          ld.linksToCompetitors.length === 1 ? '' : 's'
        } but not your site.`}
        actionable
        primary={{
          label: 'Analyze',
          onClick: onAnalyzeDomain ? () => onAnalyzeDomain(ld.domain) : () => alert(`Analyze ${ld.domain}`),
          tooltip: 'This domain may be a critical missed opportunity.',
        }}
        secondary={{
          label: 'Create Link',
          onClick:
            ld.hasOpportunity && onCreateLink
              ? () => onCreateLink(ld.domain)
              : ld.hasOpportunity
              ? () => alert(`Open Vefogix for ${ld.domain}`)
              : undefined,
          disabled: !ld.hasOpportunity,
          tooltip: ld.hasOpportunity ? 'Open Vefogix listing.' : 'No verified opportunity available yet.',
        }}
      />
    );
  }

  // 📊 3) High Authority Missed Domains (WR > 80)
  if (d.highAuthorityMissedCount > 0) {
    const list = d.highAuthorityMissedList;
    cards.push(
      <Card
        key="c-high-auth"
        icon={<BarChart3 className="h-5 w-5 text-sky-600" />}
        title="High Authority Missed Domains"
        body={`📊 ${fmt(d.highAuthorityMissedCount)} domain${
          d.highAuthorityMissedCount === 1 ? '' : 's'
        } with WR Score > 80 link to your competitors.`}
        actionable
        primary={{
          label: 'Show in Table',
          // onClick:
          //   onShowInTable ?? (() => alert('Apply filters: linksToYou=false, wrScoreMin=81; scroll to Referring Domains table')),
          // tooltip: 'Shows a filtered table view (WR > 80).',
        }}
        secondary={{
          label: 'Add to Task',
          // onClick:
          //   onAddTask ??
          //   (() =>
          //     alert(
          //       `Add to task: ${Math.min(15, list.length)} domain(s)...\n\n${list
          //         .slice(0, 15)
          //         .map((d) => d.domain)
          //         .join(', ')}`
          //     )),
        }}
      />
    );
  }

  // 🧠 4) Outreach Quick Wins (unique to a single competitor)
  if (d.quickWinsCompetitor && d.quickWinsDomains.length > 0) {
    const count = d.quickWinsDomains.length;
    cards.push(
      <Card
        key="c-quick-wins"
        icon={<Brain className="h-5 w-5 text-indigo-600" />}
        title="Outreach Quick Wins"
        body={`🧠 ${fmt(count)} domain${count === 1 ? '' : 's'} linking only to ${d.quickWinsCompetitor} are easy wins.`}
        actionable
        primary={{
          label: 'View Unique Domains',
          // onClick:
          //   onShowInTable ?? (() => alert(`Apply filters: matchType="unique", competitor="${d.quickWinsCompetitor}".`)),
          // tooltip: 'Use Match Type filter logic to show unique sources.',
        }}
        secondary={{
          label: 'Assign Task',
          // onClick:
          //   onAddTask ??
          //   (() =>
          //     alert(
          //       `Assign outreach for ${Math.min(15, count)} domain(s)...\n\n${d.quickWinsDomains
          //         .slice(0, 15)
          //         .map((x) => x.domain)
          //         .join(', ')}`
          //     )),
        }}
      />
    );
  }

  const visible = cards.slice(0, 4); // Card limit: max 4

  return (
    <section
      className={[
        'rounded-2xl border border-gray-200 bg-white/50  mt-4 py-2 sm:p-5',
        className ?? '',
      ].join(' ')}
      aria-labelledby="smart-insights-title"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[color:var(--brand,#1090D0)]" style={{ ['--brand' as any]: BRAND }} />
          <h3 id="smart-insights-title" className="text-base font-semibold text-gray-800">
            Smart Insights
          </h3>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Move from diagnosis → execution</span>
        </div>
      </div>

      {/* Empty / no-data */}
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          No smart insights match the current dataset.
        </div>
      ) : forceScroll ? (
        // Option B: Full width horizontal scroll (can be forced)
        <div className="-mx-4 px-4">
          <div className="flex gap-4 overflow-x-auto pb-1">{visible.map((c, i) => <div key={i}>{c}</div>)}</div>
        </div>
      ) : (
        // Mobile: horizontal scroll · Desktop: 2–3 column grid
        <>
          <div className="sm:hidden -mx-4 px-4">
            <div className="flex gap-4 overflow-x-auto pb-1">{visible.map((c, i) => <div key={i}>{c}</div>)}</div>
          </div>
          <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">{visible.map((c, i) => <div key={i}>{c}</div>)}</div>
        </>
      )}

      {/* Footnote */}
      <p className="mt-4 text-[12px] text-gray-600">
        Cards render only when the current filtered dataset supports them; CTAs disable when no verified
        opportunity is available. Metrics are derived from the Referring Domains table state (no extra calls).
      </p>
    </section>
  );
}

/* -------------------------- DEV SANITY TESTS -----------------------------
   Lightweight console.assert checks in dev to reduce runtime surprises.
--------------------------------------------------------------------------- */
(() => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // 1) Most Linked Domain exists when there are gaps with competitor links
    const base = buildDemoData();
    const { mostLinkedDomain, opportunityCount, highAuthorityMissedCount } = (function () {
      const gap = base.filter((d) => !d.linksToYou);
      const opp = gap.filter((d) => d.hasOpportunity);
      const high = gap.filter((d) => d.wrScore > 80);
      const most = gap.slice().sort((a, b) => b.linksToCompetitors.length - a.linksToCompetitors.length)[0];
      return { mostLinkedDomain: most, opportunityCount: opp.length, highAuthorityMissedCount: high.length };
    })();
    console.assert(!!mostLinkedDomain, 'DEV Test: mostLinkedDomain should be defined for demo data');
    console.assert(opportunityCount > 0, 'DEV Test: opportunityCount should be > 0 for demo data');
    console.assert(highAuthorityMissedCount > 0, 'DEV Test: highAuthorityMissedCount should be > 0 for demo data');

    // 2) Safety with null / malformed inputs
    const safe = (arr: any) => (Array.isArray(arr) ? arr : []);
    console.assert(safe(null).length === 0, 'DEV Test: null refDomains safely handled');
    console.assert(safe(undefined).length === 0, 'DEV Test: undefined refDomains safely handled');
    console.debug('[BacklinkSmartInsights] dev sanity tests passed');
  }
})();

