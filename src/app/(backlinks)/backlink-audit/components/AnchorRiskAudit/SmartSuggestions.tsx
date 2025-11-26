import React, { useMemo, useState } from 'react';
import {
  Brain,
  Settings2,
  ShieldAlert,
  AlertTriangle,
  Wand2,
  Link2,
  FileWarning,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   TAB 4 · Anchor Risk Audit — Section 1: Smart Suggestions (AI + Rule-Based)

   • Updated to use latest tokens + branded icon color (#008CCD)
   • Inter / Inter Fallback family applied at the section root
   • Similar card + filter pattern as recent designs
   • Branded icons for the section title and each card title (origin-based)
   • Severity indicated by left rail + badge (icon near title is branded)
   • Pointer cursor on all clickable elements
----------------------------------------------------------------------------- */

type SuggestionOrigin = 'ai' | 'rule';
type Severity = 'critical' | 'warning' | 'info';

export type AnchorSmartSuggestion = {
  id: string;
  origin: SuggestionOrigin;         // 'ai' or 'rule'
  severity: Severity;               // affects rail and severity pill
  title: string;                    // concise 1‑line insight
  description?: string;             // optional support text
  meta?: Array<{ label: string }>;  // tiny chips (e.g., "18%", "5 domains")
  explainWhy?: string;              // hover title
  ctaLabel: string;                 // primary CTA label
  onCta?: () => void;               // primary action
  secondaryCtaLabel?: string;       // optional secondary CTA (link style)
  onSecondaryCta?: () => void;      // secondary action
};

export type Tab4Section1AnchorSmartSuggestionsProps = {
  suggestions?: AnchorSmartSuggestion[];
  defaultFilter?: 'all' | 'ai' | 'rule';
  /** If true → container uses attention tint (#FFF7E6). Else neutral panel tint. */
  highRiskDetected?: boolean;
  /** "View All" button handler (optional) */
  onViewAll?: () => void;
  /** Optional global navigation helper */
  onNavigate?: (opts: {
    section:
      | 'distribution'
      | 'riskBreakdown'
      | 'overusedAnchors'
      | 'targetPages'
      | 'disavowManager';
    filters?: Record<string, unknown>;
  }) => void;
  className?: string;
};

/** Design tokens (override via CSS vars if needed) */
const TOKENS = {
  brand: '#008CCD', // branded icon + primary accents
  brandHover: '#007CB4',

  // Surfaces / text / borders (CSS vars allow alignment with "recent designs")
  surface: 'var(--surface-1, #F6F8FB)',
  surfaceAttention: '#FFF7E6',
  panel: 'var(--panel, #FFFFFF)',
  border: 'var(--border, #E5E7EB)',
  text: {
    primary: 'var(--text-1, #0F172A)',   // slate-900
    secondary: 'var(--text-2, #475569)', // slate-600
  },

  // Pills
  aiPill: 'bg-indigo-100 text-indigo-800',
  rulePill: 'bg-gray-100 text-gray-700',

  // Severity rails / rings / pills
  sev: {
    critical: {
      rail: 'bg-red-500',
      border: 'border-red-200',
      ring: 'ring-red-100',
      pill: 'bg-red-100 text-red-700',
      label: 'Critical',
    },
    warning: {
      rail: 'bg-amber-500',
      border: 'border-amber-200',
      ring: 'ring-amber-100',
      pill: 'bg-amber-100 text-amber-800',
      label: 'Warning',
    },
    info: {
      rail: 'bg-sky-500',
      border: 'border-sky-200',
      ring: 'ring-sky-100',
      pill: 'bg-sky-100 text-sky-800',
      label: 'Info',
    },
  },
};

function severityTokens(sev: Severity) {
  return TOKENS.sev[sev];
}

function OriginBadge({ origin }: { origin: SuggestionOrigin }) {
  const isAI = origin === 'ai';
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        isAI ? TOKENS.aiPill : TOKENS.rulePill,
      ].join(' ')}
      title={isAI ? 'Suggested by AI' : 'Triggered by audit rule'}
    >
      {isAI ? <Brain className="mr-1 h-3 w-3" /> : <Settings2 className="mr-1 h-3 w-3" />}
      {isAI ? 'AI' : 'Rule'}
    </span>
  );
}

function BrandedTitleIcon({ origin }: { origin: SuggestionOrigin }) {
  // Branded (#008CCD) icons for card titles
  const Icon = origin === 'ai' ? Brain : Settings2;
  return (
    <Icon
      className="h-4 w-4"
      style={{ color: `var(--brand, ${TOKENS.brand})` }}
      aria-hidden="true"
    />
  );
}

function SeverityPill({ severity }: { severity: Severity }) {
  const t = severityTokens(severity);
  return (
    <span
      className={['inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-semibold', t.pill].join(' ')}
      aria-label={`Severity: ${t.label}`}
    >
      {t.label}
    </span>
  );
}

/** A single suggestion card */
function SuggestionCard({ s }: { s: AnchorSmartSuggestion }) {
  const t = severityTokens(s.severity);
  return (
    <div
      className={[
        'group relative h-full rounded-xl border bg-white p-4 shadow-sm transition',
        t.border,
        'hover:shadow-md hover:ring',
        t.ring,
      ].join(' ')}
      role="region"
      aria-label={s.title}
      title={s.explainWhy || 'Generated using AI + backlink audit rules'}
      data-severity={s.severity}
    >
      {/* Left severity rail */}
      <div className={['absolute left-0 top-0 h-full w-1 rounded-l-xl', t.rail].join(' ')} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BrandedTitleIcon origin={s.origin} />
          <h4
            className="text-sm font-semibold"
            style={{ color: `var(--text-1, ${TOKENS.text.primary})` }}
          >
            {s.title}
          </h4>
        </div>
        <OriginBadge origin={s.origin} />
      </div>

      {s.description && (
        <p
          className="mt-2 line-clamp-3 text-[13px] leading-relaxed"
          style={{ color: `var(--text-2, ${TOKENS.text.secondary})` }}
        >
          {s.description}
        </p>
      )}

      {s.meta && s.meta.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.meta.map((m, idx) => (
            <span
              key={idx}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
              title={m.label}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={s.onCta}
            className={[
              'cursor-pointer inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-white',
              'shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-1',
            ].join(' ')}
            style={{
              backgroundColor: `var(--brand, ${TOKENS.brand})`,
              ['--tw-ring-color' as any]: 'rgba(0,140,205,0.2)',
            }}
          >
            {s.ctaLabel}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </button>

          {s.secondaryCtaLabel && (
            <button
              type="button"
              onClick={s.onSecondaryCta}
              className="cursor-pointer text-sm font-medium hover:underline"
              style={{ color: `var(--brand, ${TOKENS.brand})` }}
            >
              {s.secondaryCtaLabel}
            </button>
          )}
        </div>

        <SeverityPill severity={s.severity} />
      </div>
    </div>
  );
}

/** Demo defaults — replace with live detections */
function buildDefaultSuggestions(
  onNavigate?: Tab4Section1AnchorSmartSuggestionsProps['onNavigate']
): AnchorSmartSuggestion[] {
  return [
    {
      id: 'a1',
      origin: 'rule',
      severity: 'critical',
      title: 'Exact‑match anchor overuse: "best seo agency" at 18%',
      description: 'Higher than the recommended ≤10% threshold across recent backlinks.',
      meta: [{ label: 'Exact‑Match 18%' }, { label: '9 domains' }],
      ctaLabel: 'View Anchors',
      onCta: () =>
        onNavigate?.({
          section: 'overusedAnchors',
          filters: { anchor: 'best seo agency', type: 'exact_match' },
        }),
      secondaryCtaLabel: 'Create Task',
      onSecondaryCta: () =>
        onNavigate?.({
          section: 'overusedAnchors',
          filters: { anchor: 'best seo agency', openTaskDrawer: true },
        }),
      explainWhy: 'Rule: exact‑match anchors > 10% of profile.',
    },
    {
      id: 'a2',
      origin: 'rule',
      severity: 'warning',
      title: 'Branded anchor usage is only 22%',
      description: 'Low branded ratio increases risk of unnatural profile.',
      meta: [{ label: 'Branded 22%' }, { label: 'Target ≥ 30%' }],
      ctaLabel: 'View Distribution',
      onCta: () => onNavigate?.({ section: 'distribution', filters: { focus: 'branded' } }),
      secondaryCtaLabel: 'Create Task',
      onSecondaryCta: () =>
        onNavigate?.({
          section: 'distribution',
          filters: { openTaskDrawer: true, taskType: 'anchor_optimization' },
        }),
      explainWhy: 'Rule: branded anchors < 30%.',
    },
    {
      id: 'a3',
      origin: 'rule',
      severity: 'critical',
      title: 'Spam anchor cluster: "online casino" from 5 domains',
      description: 'High‑risk terms detected repeatedly across sources.',
      meta: [{ label: '5 domains' }, { label: 'Spam/Toxic' }],
      ctaLabel: 'Disavow Sources',
      onCta: () =>
        onNavigate?.({
          section: 'disavowManager',
          filters: { seedAnchor: 'online casino' },
        }),
      secondaryCtaLabel: 'View in Domain List',
      onSecondaryCta: () =>
        onNavigate?.({
          section: 'overusedAnchors',
          filters: { anchor: 'online casino' },
        }),
      explainWhy: 'Rule: toxic/spam keywords detected across multiple domains.',
    },
    {
      id: 'a4',
      origin: 'rule',
      severity: 'warning',
      title: "Page '/services/seo/' has 9 over‑optimized anchors",
      description: 'Concentration of keyword anchors on a single target page.',
      meta: [{ label: '9 backlinks' }, { label: 'Target page' }],
      ctaLabel: 'View Page Anchors',
      onCta: () =>
        onNavigate?.({
          section: 'targetPages',
          filters: { page: '/services/seo/', anchorRisk: 'high' },
        }),
      secondaryCtaLabel: 'Create Task',
      onSecondaryCta: () =>
        onNavigate?.({
          section: 'targetPages',
          filters: { page: '/services/seo/', openTaskDrawer: true },
        }),
      explainWhy: 'Rule: anchor risk concentrated on specific target page.',
    },
    {
      id: 'a5',
      origin: 'rule',
      severity: 'info',
      title: 'Generic anchor "click here" appears in 35 backlinks',
      description: 'Excessive generic anchors can dilute topical relevance.',
      meta: [{ label: '35 backlinks' }, { label: 'Generic' }],
      ctaLabel: 'Review Anchors',
      onCta: () =>
        onNavigate?.({
          section: 'overusedAnchors',
          filters: { anchor: 'click here', type: 'generic' },
        }),
      secondaryCtaLabel: 'Create Task',
      onSecondaryCta: () =>
        onNavigate?.({
          section: 'overusedAnchors',
          filters: { anchor: 'click here', openTaskDrawer: true },
        }),
      explainWhy: 'Rule: generic anchors exceeding advisory share.',
    },
    {
      id: 'a6',
      origin: 'ai',
      severity: 'info',
      title: 'AI tip: diversify anchors this week',
      description:
        'Shift mix towards branded/generic anchors; reduce exact‑match on top pages to lower penalty risk.',
      meta: [{ label: 'Suggested mix: 40%+ branded' }],
      ctaLabel: 'Open Anchor Summary',
      onCta: () => onNavigate?.({ section: 'riskBreakdown', filters: { view: 'ai_summary' } }),
      explainWhy: 'AI patterning across anchor types, page clusters, and risk signals.',
    },
  ];
}

export default function Tab4Section1AnchorSmartSuggestions({
  suggestions,
  defaultFilter = 'all',
  highRiskDetected = false,
  onViewAll,
  onNavigate,
  className,
}: Tab4Section1AnchorSmartSuggestionsProps) {
  const [filter, setFilter] = useState<'all' | 'ai' | 'rule'>(defaultFilter);
  const data = suggestions ?? buildDefaultSuggestions(onNavigate);

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter((s) => s.origin === filter);
  }, [data, filter]);

  return (
    <section
      className={[
        'rounded-2xl p-4 sm:p-5 shadow-sm border',
        highRiskDetected ? '' : 'bg-[color:var(--surface-1,#F6F8FB)]',
        'border-[color:var(--border,#E5E7EB)]',
        className ?? '',
      ].join(' ')}
      aria-labelledby="anchor-smart-suggestions-title"
      style={{
        fontFamily: 'Inter, Inter Fallback, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: highRiskDetected ? TOKENS.surfaceAttention : undefined,
      }}
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link2
            className="h-5 w-5"
            style={{ color: `var(--brand, ${TOKENS.brand})` }}
            aria-hidden="true"
          />
          <h3
            id="anchor-smart-suggestions-title"
            className="text-base font-semibold"
            style={{ color: `var(--text-1, ${TOKENS.text.primary})` }}
          >
            Smart Suggestions
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* AI | Rules | All segmented filter */}
          <div
            className="inline-flex rounded-md border bg-white p-0.5"
            role="tablist"
            aria-label="Suggestion source filter"
            style={{ borderColor: `var(--border, ${TOKENS.border})` }}
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
                    'px-3 py-1.5 text-sm font-medium rounded cursor-pointer transition',
                    active
                      ? 'text-white'
                      : 'text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                  style={{
                    backgroundColor: active ? `var(--brand, ${TOKENS.brand})` : 'transparent',
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
            className="inline-flex items-center rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: `var(--border, ${TOKENS.border})` }}
            title="Open full suggestions feed"
          >
            View All
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-gray-600"
          style={{ borderColor: `var(--border, ${TOKENS.border})` }}
        >
          No suggestions match this filter right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SuggestionCard key={s.id} s={s} />
          ))}
        </div>
      )}

      {/* Helper note */}
      <div className="mt-4 flex items-center gap-2 text-[12px] text-gray-600">
        <FileWarning className="h-4 w-4 text-gray-500" aria-hidden="true" />
        Suggestions blend <strong className="mx-1">AI</strong> signals (anchor mix, page clusters) with
        <strong className="mx-1"> rule triggers</strong> (thresholds, toxic phrases, domain repetition). Hover cards
        for quick context; CTAs deep‑link to the relevant audit view.
      </div>
    </section>
  );
}

/* ------------------------------- USAGE EXAMPLE -------------------------------
<Tab4Section1AnchorSmartSuggestions
  highRiskDetected={true}
  onNavigate={({ section, filters }) => {
  }}
/>
----------------------------------------------------------------------------- */
