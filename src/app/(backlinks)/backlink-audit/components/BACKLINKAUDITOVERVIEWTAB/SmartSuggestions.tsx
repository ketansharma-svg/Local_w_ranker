import React, { useMemo, useState } from 'react';
import {
  Brain,
  Settings2,
  ShieldAlert,
  AlertTriangle,
  Wand2,
  FileWarning,
  ArrowRight,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  FileDown,
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   SECTION 9 – Smart Suggestions (AI + Rule-Based)
   - TailwindCSS-only / no external UI deps
   - Grid: 3 cols desktop, 2 cols tablet, 1 col mobile
   - Header: Branded title + Chips filter + Filters button + Export + View All
   - Cards: icon (brand-tinted), title, description, chips, CTA, severity pill
   - Fonts: Inter, "Inter Fallback"
   - Icons: brand color #008CCD (via tokens/vars)
----------------------------------------------------------------------------- */

type SuggestionOrigin = 'ai' | 'rule';
type Severity = 'critical' | 'warning' | 'info';

export type SmartSuggestion = {
  id: string;
  origin: SuggestionOrigin;           // 'ai' or 'rule'
  severity: Severity;                 // determines accent treatment
  title: string;                      // concise 1-line insight
  description?: string;               // optional support text
  ctaLabel: string;                   // e.g., "Disavow Domains"
  onCta?: () => void;                 // action callback
  meta?: Array<{ label: string }>;    // optional chips
  explainWhy?: string;                // optional "why" tooltip
};

export type Section9SmartSuggestionsProps = {
  suggestions?: SmartSuggestion[];
  defaultFilter?: 'all' | 'ai' | 'rule';
  onViewAll?: () => void;
  /** Optional export handler for header Export button */
  onExport?: () => void;
  className?: string;
};

/** Design tokens (hooked to CSS vars; fallbacks ensure drop‑in use) */
const TOKENS = {
  // Brand (icons, accents)
  brand: 'var(--brand-600, #008CCD)',
  brandHover: 'var(--brand-700, #0079B3)',
  // Surfaces & borders
  surface: 'var(--surface, #FFFFFF)',
  border: 'var(--border-200, #E5E7EB)',
  // Text
  text: 'var(--text-900, #0F172A)',
  muted: 'var(--text-600, #64748B)',
  // Chips
  chipBg: 'var(--chip-bg, #F1F5F9)',
  chipText: 'var(--chip-text, #0F172A)',
  chipRing: 'var(--chip-ring, rgba(0, 140, 205, 0.15))',
  // Severity accents (rails, pills)
  critical: {
    rail: 'bg-red-400',
    pill: 'bg-red-100 text-red-700',
    ring: 'ring-red-100',
    border: 'border-red-200',
  },
  warning: {
    rail: 'bg-amber-400',
    pill: 'bg-amber-100 text-amber-800',
    ring: 'ring-amber-100',
    border: 'border-amber-200',
  },
  info: {
    rail: 'bg-sky-400',
    pill: 'bg-sky-100 text-sky-800',
    ring: 'ring-sky-100',
    border: 'border-sky-200',
  },
  // Source pills
  aiPill: 'bg-indigo-100 text-indigo-800',
  rulePill: 'bg-gray-100 text-gray-700',
};

function classForSeverity(sev: Severity) {
  return sev === 'critical' ? TOKENS.critical : sev === 'warning' ? TOKENS.warning : TOKENS.info;
}

/** Branded (not severity-colored) header/iconography for cards */
function BrandedIcon({ severity, className }: { severity: Severity; className?: string }) {
  const Cmp = severity === 'critical' ? ShieldAlert : severity === 'warning' ? AlertTriangle : Wand2;
  return (
    <Cmp
      className={[
        'h-5 w-5',
        className ?? '',
        'transition-colors',
        'text-[color:var(--brand-600,#008CCD)]',
        'group-hover:text-[color:var(--brand-700,#0079B3)]',
      ].join(' ')}
    />
  );
}

function SourceBadge({ origin }: { origin: SuggestionOrigin }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        origin === 'ai' ? TOKENS.aiPill : TOKENS.rulePill,
      ].join(' ')}
      title={origin === 'ai' ? 'Suggested by AI' : 'Triggered by audit rule'}
    >
      {origin === 'ai' ? (
        <Brain className="mr-1 h-3 w-3 text-[color:var(--brand-600,#008CCD)]" />
      ) : (
        <Settings2 className="mr-1 h-3 w-3 text-[color:var(--brand-600,#008CCD)]" />
      )}
      {origin === 'ai' ? 'AI' : 'Rule'}
    </span>
  );
}

/** A single suggestion card */
function SuggestionCard({ suggestion }: { suggestion: SmartSuggestion }) {
  const sev = classForSeverity(suggestion.severity);
  return (
    <div
      className={[
        'group relative h-full rounded-xl border bg-white p-4 shadow-sm transition',
        'hover:shadow-md hover:ring',
        sev.border,
        sev.ring,
      ].join(' ')}
      role="region"
      aria-label={suggestion.title}
      title={suggestion.explainWhy || undefined}
    >
      {/* Left severity rail */}
      <div className={['absolute left-0 top-0 h-full w-1 rounded-l-xl', sev.rail].join(' ')} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center">
            <BrandedIcon severity={suggestion.severity} />
          </span>
          <h4 className="text-sm font-semibold text-gray-900">{suggestion.title}</h4>
        </div>
        <SourceBadge origin={suggestion.origin} />
      </div>

      {suggestion.description && (
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-gray-600">
          {suggestion.description}
        </p>
      )}

      {suggestion.meta && suggestion.meta.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestion.meta.map((m, idx) => (
            <span
              key={idx}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                background: TOKENS.chipBg,
                color: TOKENS.chipText,
              }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={suggestion.onCta}
          className={[
            'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-white',
            'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer',
          ].join(' ')}
          style={{ background: `var(--brand-600, #008CCD)` }}
        >
          {suggestion.ctaLabel}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </button>

        <span className={['inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-semibold', sev.pill].join(' ')}>
          {suggestion.severity === 'critical'
            ? 'High Priority'
            : suggestion.severity === 'warning'
            ? 'Action Recommended'
            : 'FYI'}
        </span>
      </div>
    </div>
  );
}

/** Default demo content (safe to replace with live data) */
const DEFAULT_SUGGESTIONS: SmartSuggestion[] = [
  {
    id: 's1',
    origin: 'rule',
    severity: 'critical',
    title: 'Disavow 3 domains causing 71% of toxic score',
    description: 'WR < 20 and anchor abuse detected on 3 root domains.',
    ctaLabel: 'Review & Disavow',
    onCta: () => console.log('[Route] → Disavow Manager (pre-filtered)'),
    meta: [{ label: '3 domains' }, { label: 'WR < 20' }],
    explainWhy: 'Cluster of toxic domains contributes majority of current toxicity.',
  },
  {
    id: 's2',
    origin: 'rule',
    severity: 'warning',
    title: 'Exact-match anchor overuse detected',
    description: '“buy backlinks”, “seo tool” used > 25% across 9 domains.',
    ctaLabel: 'View Anchor Audit',
    onCta: () => console.log('[Route] → Anchor Risk Audit (filters applied)'),
    meta: [{ label: '9 anchors' }, { label: '>25% exact-match' }],
  },
  {
    id: 's3',
    origin: 'rule',
    severity: 'warning',
    title: 'Unnatural link spike (48h window)',
    description: '302 backlinks acquired between Jul 20–22. Possible link farm.',
    ctaLabel: 'View New & Lost',
    onCta: () => console.log('[Route] → New & Lost tab (date window)'),
    meta: [{ label: '+302 links / 48h' }],
  },
  {
    id: 's4',
    origin: 'rule',
    severity: 'info',
    title: 'Pending disavow export',
    description: '8 new entries not yet exported to GSC format.',
    ctaLabel: 'Export Disavow File',
    onCta: () => console.log('[Action] → Trigger disavow .txt export'),
    meta: [{ label: '8 pending' }],
  },
  {
    id: 's5',
    origin: 'ai',
    severity: 'info',
    title: 'AI Summary: Focus on toxic domains this week',
    description: 'Your link profile shows a 42% risk footprint. Prioritize domains and anchors.',
    ctaLabel: 'Open Risk Summary',
    onCta: () => console.log('[Drawer] → Risk Summary (AI)'),
  },
  {
    id: 's6',
    origin: 'rule',
    severity: 'critical',
    title: 'Recurring spam domains linking again',
    description: '2 previously disavowed patterns reappeared with new links.',
    ctaLabel: 'Re‑audit Domains',
    onCta: () => console.log('[Route] → Referring Domains (repeat filter)'),
    meta: [{ label: '2 repeating' }],
  },
];

export default function Section9SmartSuggestions({
  suggestions = DEFAULT_SUGGESTIONS,
  defaultFilter = 'all',
  onViewAll,
  onExport,
  className,
}: Section9SmartSuggestionsProps) {
  const [filter, setFilter] = useState<'all' | 'ai' | 'rule'>(defaultFilter);

  const filtered = useMemo(() => {
    if (filter === 'all') return suggestions;
    return suggestions.filter((s) => s.origin === filter);
  }, [suggestions, filter]);

  return (
    <section
      className={[
        'rounded-2xl border bg-white p-4 sm:p-5 shadow-sm',
        'border-[#EFF0F6]',
        className ?? '',
      ].join(' ')}
      aria-labelledby="smart-suggestions-title"
      style={{
        // Font + tokens (fallbacks ensure drop-in use without global CSS vars)
        fontFamily: 'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        // Provide CSS variables used above (can be overridden by global design tokens)
        ['--brand-600' as any]: '#008CCD',
        ['--brand-700' as any]: '#0079B3',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[color:var(--brand-600,#008CCD)]" />
          <h3 id="smart-suggestions-title" className="text-base font-semibold text-gray-900">
            Smart Suggestions
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Chips: AI | Rules | All (modern filter chips) */}
          <div className="inline-flex items-center gap-1.5" role="tablist" aria-label="Suggestion source filter">
            {(['ai', 'rule', 'all'] as const).map((opt) => {
              const active = filter === opt;
              const label = opt === 'ai' ? 'AI Only' : opt === 'rule' ? 'Rules Only' : 'All';
              return (
                <button
                  key={opt}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(opt)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                    'hover:shadow-sm focus:outline-none focus:ring-2',
                    active
                      ? 'text-white cursor-pointer'
                      : 'text-gray-700 hover:bg-gray-50 cursor-pointer',
                  ].join(' ')}
                  style={{
                    borderColor: active ? 'transparent' : TOKENS.border,
                    background: active ? 'var(--brand-600, #008CCD)' : TOKENS.surface,
                    boxShadow: active ? '0 0 0 2px var(--brand-600, #008CCD) inset' : '0 0 0 0 transparent',
                  }}
                >
                  {opt === 'ai' ? (
                    <Brain className={active ? 'h-4 w-4 text-white' : 'h-4 w-4 text-[color:var(--brand-600,#008CCD)]'} />
                  ) : opt === 'rule' ? (
                    <Settings2 className={active ? 'h-4 w-4 text-white' : 'h-4 w-4 text-[color:var(--brand-600,#008CCD)]'} />
                  ) : (
                    <Sparkles className={active ? 'h-4 w-4 text-white' : 'h-4 w-4 text-[color:var(--brand-600,#008CCD)]'} />
                  )}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Filters (modern button) */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 cursor-pointer"
            style={{ borderColor: TOKENS.border }}
            title="Open filters"
            onClick={() => console.log('[UI] → Open filters panel')}
          >
            <SlidersHorizontal className="h-4 w-4 text-[color:var(--brand-600,#008CCD)]" />
            Filters
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={onExport ?? (() => console.log('[Action] → Export suggestions'))}
            className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 cursor-pointer"
            style={{ borderColor: TOKENS.border }}
            title="Export"
          >
            <FileDown className="h-4 w-4 text-[color:var(--brand-600,#008CCD)]" />
            Export
          </button>

          {/* View All */}
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 cursor-pointer"
            style={{ borderColor: TOKENS.border }}
            title="Open full suggestions feed"
          >
            View All
            <ChevronRight className="h-4 w-4 text-[color:var(--brand-600,#008CCD)]" />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-600"
          style={{ borderColor: TOKENS.border }}
        >
          No suggestions match this filter right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      )}

      {/* Footer helper note */}
      <div className="mt-4 flex items-center gap-2 text-[12px] text-gray-500">
        <FileWarning className="h-4 w-4 text-gray-400" />
        Suggestions combine <strong>AI patterns</strong> (toxicity, anchors, velocity) with <strong>rule triggers</strong> (thresholds, recurrences). Hover cards for quick context; CTAs deep‑link to the relevant audit view.
      </div>
    </section>
  );
}

/* ------------------------------- USAGE EXAMPLE -------------------------------
<Section9SmartSuggestions
  onViewAll={() => router.push('/backlinks/risk-insights')}
  onExport={() => exportSuggestionsToCSV()} // optional
  suggestions={[
    // …supply live suggestions here (SmartSuggestion[])
  ]}
/>
----------------------------------------------------------------------------- */


