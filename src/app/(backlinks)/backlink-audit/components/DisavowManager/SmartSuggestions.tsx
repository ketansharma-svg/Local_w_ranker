import React, { useMemo, useState } from 'react';
import {
  Brain,
  Settings2,
  ShieldAlert,
  FileWarning,
  ArrowRight,
  ChevronRight,
  Link2,
  Globe,
  ExternalLink,
  X,
} from 'lucide-react';

/**
 * Section 0 · Smart Suggestions (Disavow Candidates)
 *
 * Updated to align with the latest Wranker design tokens/patterns
 * (Project Overview & KPI sections) — border, chip, brand, and typography. :contentReference[oaicite:0]{index=0}
 *
 * - Fonts: Inter, Inter Fallback
 * - Branded icons (#008CCD) for Section title + Card titles
 * - Pointer cursor on all clickable elements
 * - TailwindCSS-only (no external UI deps)
 */

/* --------------------------------- Tokens ---------------------------------- */
const TOKENS = {
  // core (aligned with recent designs)
  brand: '#008CCD',
  brandHover: '#007DB3',
  valueBlue: '#0077FF',
  pastelBrand: '#D9EEF8',

  surface: 'var(--wr-surface, #FFFFFF)',
  text: 'var(--wr-text, #111827)',
  muted: 'var(--wr-muted, #6B7280)',
  border: 'var(--wr-border, #EFF0F6)',
  chipBg: '#F5F7FA',
  chipHover: '#E5E7EB',

  // toxicity tiers
  red:   { rail: 'bg-red-400',    pill: 'bg-red-50 text-red-700',      border: 'border-red-200',    ring: 'ring-red-100' },
  orange:{ rail: 'bg-orange-400', pill: 'bg-orange-50 text-orange-800',border: 'border-orange-200', ring: 'ring-orange-100' },
  amber: { rail: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-800',  border: 'border-amber-200',  ring: 'ring-amber-100' },
  gray:  { rail: 'bg-gray-400',   pill: 'bg-gray-50 text-gray-700',    border: 'border-gray-200',   ring: 'ring-gray-100' },

  // pills
  aiPillBg: '#D9EEF8',
  rulePillBg: '#F5F7FA',

  // anchor mix legend (spam/branded/other)
  legendSpam: 'bg-red-400',
  legendBranded: 'bg-[color:var(--brand,#008CCD)]',
  legendOther: 'bg-gray-400',
};

type SuggestionOrigin = 'ai' | 'rule';
type EntityType = 'domain' | 'url';
type SuggestionReason =
  | 'toxicScore'
  | 'spamAnchors'
  | 'manualFlag'
  | 'lowWrContribution'
  | 'zeroReferral'
  | 'repeatOffender';

export type DisavowSuggestion = {
  id: string;
  origin: SuggestionOrigin;           // 'ai' or 'rule'
  entityType: EntityType;             // 'domain' | 'url'
  entity: string;                     // domain or full source URL
  display?: string;                   // optional pretty label
  reason: SuggestionReason;           // reason tag
  toxicityScore: number;              // 0–100
  refSessions?: number | null;        // GA4 sessions (if connected)
  anchorMix?: { spam: number; branded: number; other: number }; // % breakdown
  tooltip?: string;                   // optional tooltip text
};

export type Tab5Section0DisavowSmartSuggestionsProps = {
  suggestions?: DisavowSuggestion[];
  defaultFilter?: 'all' | 'ai' | 'rule';
  ga4Connected?: boolean;
  /** Called when user clicks the domain/URL text */
  onOpenRefDomains?: (opts: { entity: string; entityType: EntityType }) => void;
  /** Add to Queue action (Section 2). You can optimistically update your store. */
  onAddToQueue?: (s: DisavowSuggestion) => void;
  /** Navigate helper e.g., scroll to Section 2 after adding */
  onNavigate?: (opts: { section: 'queue' | 'active' | 'upload' | 'history' | 'refDomains'; filters?: any }) => void;
  /** Optional "View All" */
  onViewAll?: () => void;
  /** Optional GA4 connect CTA */
  onConnectGA4?: () => void;
  className?: string;
};

/* --------------------------------- Helpers --------------------------------- */
function bucketForToxicity(score: number) {
  if (score >= 80) return 'red';
  if (score >= 60) return 'orange';
  if (score >= 40) return 'amber';
  return 'gray';
}

function reasonLabel(reason: SuggestionReason) {
  switch (reason) {
    case 'toxicScore':       return 'Toxic Score';
    case 'spamAnchors':      return 'Spam Anchors';
    case 'manualFlag':       return 'Manual Flag';
    case 'lowWrContribution':return 'Low WR Value';
    case 'zeroReferral':     return 'Zero Referral';
    case 'repeatOffender':   return 'Repeat Offender';
    default:                 return 'Flagged';
  }
}

function ReasonBadge({ reason }: { reason: SuggestionReason }) {
  const cls =
    reason === 'toxicScore'       ? TOKENS.red.pill :
    reason === 'spamAnchors'      ? 'bg-fuchsia-50 text-fuchsia-800' :
    reason === 'manualFlag'       ? 'bg-yellow-50 text-yellow-800' :
    reason === 'lowWrContribution'? 'bg-gray-50 text-gray-700' :
    reason === 'zeroReferral'     ? 'bg-sky-50 text-sky-800' :
                                    'bg-rose-50 text-rose-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {reasonLabel(reason)}
    </span>
  );
}

function OriginBadge({ origin }: { origin: SuggestionOrigin }) {
  const isAI = origin === 'ai';
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        isAI ? 'text-[color:var(--brand,#008CCD)]' : 'text-[#374151]',
        isAI ? `bg-[color:var(--pastelBrand,#D9EEF8)]` : 'bg-[#F5F7FA]',
        'border',
      ].join(' ')}
      style={{
        ['--pastelBrand' as any]: TOKENS.pastelBrand,
        borderColor: TOKENS.border,
      }}
      title={isAI ? 'Suggested by AI' : 'Triggered by audit rule'}
    >
      {isAI ? <Brain className="mr-1 h-3 w-3 text-[color:var(--brand,#008CCD)]" /> : <Settings2 className="mr-1 h-3 w-3 text-[#6B7280]" />}
      {isAI ? 'AI' : 'Rule'}
    </span>
  );
}

function TypeBadge({ entityType }: { entityType: EntityType }) {
  const isDomain = entityType === 'domain';
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        isDomain ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700',
        'border',
      ].join(' ')}
      style={{ borderColor: TOKENS.border }}
    >
      {isDomain ? 'Domain' : 'URL'}
    </span>
  );
}

function ToxicityBadge({ score }: { score: number }) {
  const b = bucketForToxicity(score);
  const cls =
    b === 'red'    ? TOKENS.red :
    b === 'orange' ? TOKENS.orange :
    b === 'amber'  ? TOKENS.amber :
                     TOKENS.gray;
  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-1.5 py-1 text-[11px] font-semibold',
        cls.border, cls.pill,
      ].join(' ')}
      title="Wranker Toxicity Score (0–100)"
    >
      Toxicity&nbsp;<b className="ml-0.5">{score}</b>
    </span>
  );
}

/** Mini stacked bar: spam / branded / other */
function AnchorMixBar({
  mix, className,
}: {
  mix?: { spam: number; branded: number; other: number };
  className?: string;
}) {
  const spam = Math.max(0, Math.min(100, mix?.spam ?? 0));
  const branded = Math.max(0, Math.min(100, mix?.branded ?? 0));
  const other = Math.max(0, Math.min(100, mix?.other ?? 0));
  const total = Math.max(1, spam + branded + other);
  const wSpam = (spam / total) * 100;
  const wBranded = (branded / total) * 100;
  const wOther = (other / total) * 100;
  return (
    <div className={className ?? ''}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`${TOKENS.legendSpam} h-full`} style={{ width: `${wSpam}%` }} />
        <div className={`${TOKENS.legendBranded} h-full`} style={{ width: `${wBranded}%` }} />
        <div className={`${TOKENS.legendOther} h-full`} style={{ width: `${wOther}%` }} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: TOKENS.muted }}>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-red-400" /> Spam {spam}%</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[color:var(--brand,#008CCD)]" /> Branded {branded}%</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-gray-400" /> Other {other}%</span>
      </div>
    </div>
  );
}

function SuggestionCard({
  s,
  ga4Connected,
  onOpenRefDomains,
  onAddToQueue,
  onNavigate,
  onConnectGA4,
  onDismiss,
}: {
  s: DisavowSuggestion;
  ga4Connected?: boolean;
  onOpenRefDomains?: Tab5Section0DisavowSmartSuggestionsProps['onOpenRefDomains'];
  onAddToQueue?: Tab5Section0DisavowSmartSuggestionsProps['onAddToQueue'];
  onNavigate?: Tab5Section0DisavowSmartSuggestionsProps['onNavigate'];
  onConnectGA4?: Tab5Section0DisavowSmartSuggestionsProps['onConnectGA4'];
  onDismiss?: (id: string) => void;
}) {
  const toxBucket = bucketForToxicity(s.toxicityScore);
  const tox = (toxBucket === 'red' ? TOKENS.red : toxBucket === 'orange' ? TOKENS.orange : toxBucket === 'amber' ? TOKENS.amber : TOKENS.gray);

  const handleAdd = () => {
    onAddToQueue?.(s);
    onNavigate?.({ section: 'queue', filters: { addedFrom: 'smartSuggestion', id: s.id } });
  };

  return (
    <div
      className={[
        'group relative h-full rounded-xl border bg-white p-4 shadow-sm transition',
        tox.border, 'hover:shadow-md hover:ring', tox.ring,
      ].join(' ')}
      role="region"
      aria-label={`${s.entityType === 'domain' ? 'Domain' : 'URL'} suggestion ${s.entity}`}
      title={s.tooltip || 'Identified using toxicity, anchor, WR Score, and referral value signals'}
      style={{ ['--brand' as any]: TOKENS.brand, borderColor: TOKENS.border }}
    >
      {/* Left severity rail */}
      <div className={['absolute left-0 top-0 h-full w-1 rounded-l-xl', tox.rail].join(' ')} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onOpenRefDomains?.({ entity: s.entity, entityType: s.entityType })}
            className="group/link inline-flex max-w-full items-center gap-1 text-left cursor-pointer"
            title={s.entity}
          >
            {s.entityType === 'domain' ? (
              <Globe className="h-4 w-4 text-[color:var(--brand,#008CCD)]" />
            ) : (
              <Link2 className="h-4 w-4 text-[color:var(--brand,#008CCD)]" />
            )}
            <span className="truncate text-sm font-semibold text-gray-900 underline decoration-transparent group-hover/link:decoration-[color:var(--brand,#008CCD)]">
              {s.display || s.entity}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover/link:opacity-100" />
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <TypeBadge entityType={s.entityType} />
            <ReasonBadge reason={s.reason} />
            <OriginBadge origin={s.origin} />
          </div>
        </div>

        <ToxicityBadge score={s.toxicityScore} />
      </div>

      {/* Anchor mix mini bar */}
      {s.anchorMix && (
        <AnchorMixBar mix={s.anchorMix} className="mt-3" />
      )}

      {/* Referral traffic / GA4 CTA */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {ga4Connected ? (
            <span className="text-[12px]" style={{ color: TOKENS.muted }}>
              Ref. Sessions:&nbsp;
              <b className="text-gray-900">{typeof s.refSessions === 'number' ? s.refSessions : '—'}</b>
            </span>
          ) : (
            <button
              type="button"
              onClick={onConnectGA4}
              className="inline-flex items-center rounded-full border px-2 py-1 text-[12px] font-medium cursor-pointer"
              style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.text }}
              title="Connect Google Analytics 4 to display referral sessions"
            >
              Connect GA4
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer"
            style={{ background: 'var(--brand)', ['--brand' as any]: TOKENS.brand }}
          >
            Add to Queue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDismiss?.(s.id)}
            className="inline-flex items-center text-sm font-medium hover:underline cursor-pointer"
            style={{ color: 'var(--brand)', ['--brand' as any]: TOKENS.brand }}
            title="Temporarily hide this suggestion"
          >
            Ignore
            <X className="ml-1 h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Demo defaults — replace with live detections */
function buildDefaultSuggestions(): DisavowSuggestion[] {
  return [
    {
      id: 'd1',
      origin: 'rule',
      entityType: 'domain',
      entity: 'spamblog.xyz',
      display: 'spamblog.xyz',
      reason: 'toxicScore',
      toxicityScore: 92,
      refSessions: 0,
      anchorMix: { spam: 68, branded: 6, other: 26 },
      tooltip: 'Rule: Toxicity ≥ 80 from multiple spammy anchors and bad TLD.',
    },
    {
      id: 'd2',
      origin: 'rule',
      entityType: 'domain',
      entity: 'loan-casino.fun',
      display: 'loan-casino.fun',
      reason: 'spamAnchors',
      toxicityScore: 87,
      refSessions: 12,
      anchorMix: { spam: 74, branded: 3, other: 23 },
      tooltip: 'Spam-anchor cluster (casino/payday) across backlinks.',
    },
    {
      id: 'd3',
      origin: 'ai',
      entityType: 'url',
      entity: 'http://directory-bulk-links.net/listing/12345',
      display: '.../listing/12345',
      reason: 'repeatOffender',
      toxicityScore: 78,
      refSessions: 0,
      anchorMix: { spam: 55, branded: 10, other: 35 },
      tooltip: 'AI pattern: repeated low-value directory footprint.',
    },
    {
      id: 'd4',
      origin: 'rule',
      entityType: 'domain',
      entity: 'lowwr-news.info',
      display: 'lowwr-news.info',
      reason: 'lowWrContribution',
      toxicityScore: 62,
      refSessions: 0,
      anchorMix: { spam: 41, branded: 12, other: 47 },
      tooltip: 'Domain drags WR score and sends no value.',
    },
    {
      id: 'd5',
      origin: 'ai',
      entityType: 'domain',
      entity: 'widget-links.top',
      display: 'widget-links.top',
      reason: 'zeroReferral',
      toxicityScore: 58,
      refSessions: 0,
      anchorMix: { spam: 38, branded: 8, other: 54 },
      tooltip: 'AI tip: zero referral + weak anchors → safe disavow candidate.',
    },
  ];
}

/* -------------------------------- Component -------------------------------- */
export default function Tab5Section0DisavowSmartSuggestions({
  suggestions,
  defaultFilter = 'all',
  ga4Connected = false,
  onOpenRefDomains,
  onAddToQueue,
  onNavigate,
  onViewAll,
  onConnectGA4,
  className,
}: Tab5Section0DisavowSmartSuggestionsProps) {
  const [filter, setFilter] = useState<'all' | 'ai' | 'rule'>(defaultFilter);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const data = suggestions ?? buildDefaultSuggestions();

  const filtered = useMemo(() => {
    const base = filter === 'all' ? data : data.filter((s) => s.origin === filter);
    return base.filter((s) => !dismissed.has(s.id));
  }, [data, filter, dismissed]);

  const dismiss = (id: string) => setDismissed((prev) => new Set([...prev, id]));

  return (
    <section
      className={[
        'rounded-2xl border bg-white p-4 sm:p-5 shadow-sm',
        className ?? '',
      ].join(' ')}
      aria-labelledby="disavow-smart-suggestions-title"
      style={{
        ['--brand' as any]: TOKENS.brand,
        borderColor: TOKENS.border,
        color: TOKENS.text,
        fontFamily: 'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[color:var(--brand,#008CCD)]" />
          <h3 id="disavow-smart-suggestions-title" className="text-base font-semibold text-gray-800">
            Smart Suggestions — Disavow Candidates
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* AI | Rules | All segmented filter (chip style) */}
          <div
            className="inline-flex rounded-full border p-0.5"
            role="tablist"
            aria-label="Suggestion source filter"
            style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
          >
            {(['ai', 'rule', 'all'] as const).map((opt) => {
              const active = filter === opt;
              return (
                <button
                  key={opt}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(opt)}
                  className={[
                    'px-3 py-1.5 text-sm rounded-full transition cursor-pointer',
                    active ? 'font-semibold' : 'text-[color:var(--wr-muted,#6B7280)]',
                  ].join(' ')}
                  style={{
                    background: active ? TOKENS.pastelBrand : TOKENS.chipBg,
                    color: active ? TOKENS.brand : TOKENS.text,
                  }}
                >
                  {opt === 'ai' ? 'AI Only' : opt === 'rule' ? 'Rules Only' : 'All'}
                </button>
              );
            })}
          </div>

          {/* View All (optional) */}
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition cursor-pointer"
            style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.text }}
            title="Open full suggestions feed"
          >
            View All
            <ChevronRight className="ml-1 h-4 w-4 text-[color:var(--brand,#008CCD)]" />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-lg border border-dashed bg-white p-8 text-center text-sm"
          style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
        >
          No suggestions match this filter right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              ga4Connected={ga4Connected}
              onOpenRefDomains={onOpenRefDomains}
              onAddToQueue={onAddToQueue}
              onNavigate={onNavigate}
              onConnectGA4={onConnectGA4}
              onDismiss={dismiss}
            />
          ))}
        </div>
      )}

      {/* Helper note */}
      <div className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: TOKENS.muted }}>
        <ShieldAlert className="h-4 w-4 text-[color:var(--brand,#008CCD)]" />
        Suggestions blend <strong className="mx-1">toxicity</strong>, <strong className="mx-1">anchor spam</strong>,{' '}
        <strong className="mx-1">WR Score impact</strong>, and <strong className="mx-1">referral value</strong>.
        Add a card to the queue to review in Section 2.
      </div>
    </section>
  );
}

/* ------------------------------- USAGE EXAMPLE -------------------------------
<Tab5Section0DisavowSmartSuggestions
  ga4Connected={false}
  onOpenRefDomains={({ entity, entityType }) => {
    // Open Referring Domains & Backlinks tab pre-filtered
    console.log('[Open Ref Domains]', entity, entityType);
  }}
  onAddToQueue={(s) => {
    // Insert into Disavow Queue (Section 2) in your store/state
    console.log('[Add to Queue]', s);
  }}
  onNavigate={({ section, filters }) => {
    // e.g., scrollIntoView('#sec-2-disavow-queue') or route to sub-section
    console.log('[Navigate]', section, filters);
  }}
  onConnectGA4={() => {
    // Open GA4 connect modal/drawer
    console.log('[Connect GA4]');
  }}
/>
----------------------------------------------------------------------------- */

