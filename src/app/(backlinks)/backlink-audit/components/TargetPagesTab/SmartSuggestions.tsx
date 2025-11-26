import React, { useMemo, useState } from 'react';
import {
  Brain,
  Settings2,
  ShieldAlert,
  AlertTriangle,
  Wand2,
  Link2,
  TrendingDown,
  Shield,
  Rocket,
  FileWarning,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   TAB 6 · Target Pages — Section 0: Smart Suggestions (AI + Rule-Based)
   Redesigned to match recent tokens/patterns:
   - Fonts: Inter, Inter Fallback
   - Brand color accents (#008CCD) for section/card icons
   - Neutral surfaces/borders per tokens
   - Pointer cursor on all clickable elements
----------------------------------------------------------------------------- */

type SuggestionOrigin = 'ai' | 'rule';
type Severity = 'critical' | 'warning' | 'info';
type SuggestionKind =
  | 'toxicRatio'
  | 'lostLinks'
  | 'anchorOveropt'
  | 'lowTrust'
  | 'opportunity';

export type TargetPagesSmartSuggestion = {
  id: string;
  origin: SuggestionOrigin;
  severity: Severity;
  kind: SuggestionKind;
  title: string;
  description?: string;
  meta?: Array<{ label: string }>;
  quickStat?: string;
  explainWhy?: string;
  requiresGA4?: boolean;
  ctaLabel: string;
  onCta?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
};

export type Tab6Section0TargetPagesSmartSuggestionsProps = {
  suggestions?: TargetPagesSmartSuggestion[];
  defaultFilter?: 'all' | 'ai' | 'rule';
  highRiskDetected?: boolean;
  ga4Connected?: boolean;
  onViewAll?: () => void;
  onConnectGA4?: () => void;
  onNavigate?: (opts: {
    section:
      | 'topPagesTable'
      | 'filtersRow'
      | 'anchorRiskTable'
      | 'newLostTab'
      | 'disavowManager'
      | 'pageAnalyzer'
      | 'analyticsIntegration';
    filters?: Record<string, unknown>;
  }) => void;
  className?: string;
};

/* ----------------------- Design Tokens (latest) ----------------------- */
const TOKENS = {
  brand: '#008CCD',
  brandHover: '#007DB3',
  valueBlue: '#0077FF',
  pastelBrand: '#D9EEF8',
  border: '#EFF0F6',
  chipBg: '#F5F7FA',
  chipHover: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  darkerMuted: '#374151',
  // Status palette
  status: {
    good: { solid: '#10B981', pastel: 'rgba(16,185,129,0.15)' },
    warning: { solid: '#F59E0B', pastel: 'rgba(245,158,11,0.15)' },
    critical: { solid: '#EF4444', pastel: 'rgba(239,68,68,0.15)' },
    info: { solid: '#3B82F6', pastel: 'rgba(59,130,246,0.15)' },
  },
  // Source pills
  aiPill: 'bg-[color:var(--wr-ai-pill,#EDE9FE)] text-[#3730A3]',
  rulePill: 'bg-[color:var(--wr-rule-pill,#F3F4F6)] text-[#374151]',
};

function classForSeverity(sev: Severity) {
  if (sev === 'critical') return TOKENS.status.critical;
  if (sev === 'warning') return TOKENS.status.warning;
  return TOKENS.status.info;
}

function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  if (severity === 'critical') return <ShieldAlert className={className ?? ''} />;
  if (severity === 'warning') return <AlertTriangle className={className ?? ''} />;
  return <Wand2 className={className ?? ''} />;
}

function KindIcon({ kind, className }: { kind: SuggestionKind; className?: string }) {
  switch (kind) {
    case 'toxicRatio':
      return <Link2 className={className} />;
    case 'lostLinks':
      return <TrendingDown className={className} />;
    case 'anchorOveropt':
      return <Link2 className={className} />;
    case 'lowTrust':
      return <Shield className={className} />;
    case 'opportunity':
      return <Rocket className={className} />;
    default:
      return <Link2 className={className} />;
  }
}

function SourceBadge({ origin }: { origin: SuggestionOrigin }) {
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

/** A single suggestion card */
function SuggestionCard({
  s,
  ga4Connected,
  onConnectGA4,
}: {
  s: TargetPagesSmartSuggestion;
  ga4Connected?: boolean;
  onConnectGA4?: () => void;
}) {
  const sev = classForSeverity(s.severity);
  const needsGA4 = s.requiresGA4 && !ga4Connected;

  return (
    <div
      className={[
        'group relative h-full min-w-[300px] sm:min-w-0 rounded-[8px] border bg-white p-4 shadow-sm transition',
        'hover:shadow-md',
      ].join(' ')}
      style={{ borderColor: TOKENS.border }}
      role="region"
      aria-label={s.title}
      title={s.explainWhy || 'Generated using AI + page-level backlink rules'}
    >
      {/* Left severity rail */}
      <div
        className="absolute left-0 top-0 h-full w-1 rounded-l-[8px]"
        style={{ background: sev.solid }}
        aria-hidden="true"
      />

      {/* Top row: icon + title + quick stat + source */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Branded type icon */}
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded"
            style={{ color: TOKENS.brand }}
          >
            <KindIcon kind={s.kind} className="h-5 w-5" />
          </span>
          <h4 className="text-sm font-semibold" style={{ color: TOKENS.text }}>
            {s.title}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {s.quickStat && (
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: TOKENS.chipBg, color: TOKENS.darkerMuted }}
            >
              {s.quickStat}
            </span>
          )}
          <SourceBadge origin={s.origin} />
        </div>
      </div>

      {s.description && (
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed" style={{ color: TOKENS.muted }}>
          {s.description}
        </p>
      )}

      {s.meta && s.meta.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.meta.map((m, idx) => (
            <span
              key={idx}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: TOKENS.chipBg, color: TOKENS.darkerMuted }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* CTAs & priority pill */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {needsGA4 ? (
            <button
              type="button"
              onClick={onConnectGA4}
              className="inline-flex cursor-pointer items-center rounded-full border bg-white px-3 py-1.5 text-sm font-medium transition"
              style={{ borderColor: TOKENS.brand, color: TOKENS.brand }}
            >
              Connect GA4
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={s.onCta}
              className="inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-sm font-medium text-white transition hover:shadow-sm"
              style={{ background: TOKENS.brand }}
              disabled={!s.onCta}
            >
              {s.ctaLabel}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </button>
          )}

          {s.secondaryCtaLabel && (
            <button
              type="button"
              onClick={s.onSecondaryCta}
              className="text-sm font-medium underline-offset-2 hover:underline cursor-pointer"
              style={{ color: TOKENS.brand }}
            >
              {s.secondaryCtaLabel}
            </button>
          )}
        </div>

        <span
          className="inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-semibold"
          style={{
            color: sev.solid,
            background: sev.pastel,
          }}
        >
          {s.severity === 'critical' ? 'High Priority' : s.severity === 'warning' ? 'Action Recommended' : 'FYI'}
        </span>
      </div>
    </div>
  );
}

/** Demo defaults — replace with live detections (unchanged behavior) */
function buildDefaultSuggestions(
  onNavigate?: Tab6Section0TargetPagesSmartSuggestionsProps['onNavigate'],
  ga4Connected?: boolean
): TargetPagesSmartSuggestion[] {
  return [
    {
      id: 'tp1',
      origin: 'rule',
      severity: 'critical',
      kind: 'toxicRatio',
      title: 'Pages at high toxic link ratio (>50%)',
      description: 'These pages receive a majority of their backlinks from toxic sources.',
      meta: [{ label: '≥50% toxic' }, { label: 'Immediate review' }],
      quickStat: '12 pages',
      ctaLabel: 'Review Pages',
      onCta: () =>
        onNavigate?.({
          section: 'topPagesTable',
          filters: { toxicityPctMin: 50 },
        }),
      secondaryCtaLabel: 'Open Filters',
      onSecondaryCta: () =>
        onNavigate?.({
          section: 'filtersRow',
          filters: { toxicityPreset: 'high' },
        }),
      explainWhy: 'Rule: page‑level toxic backlink share above threshold.',
    },
    {
      id: 'tp2',
      origin: 'rule',
      severity: 'warning',
      kind: 'anchorOveropt',
      title: 'Anchor over‑optimization detected',
      description: 'Multiple pages show excessive exact‑match or spam anchors.',
      meta: [{ label: 'Over‑optimized anchors' }, { label: 'Pages: 9' }],
      quickStat: '9 pages',
      ctaLabel: 'Review Anchors',
      onCta: () =>
        onNavigate?.({
          section: 'anchorRiskTable',
          filters: { anchorRisk: 'high' },
        }),
      secondaryCtaLabel: 'Create Task',
      onSecondaryCta: () =>
        onNavigate?.({
          section: 'anchorRiskTable',
          filters: { anchorRisk: 'high', openTaskDrawer: true },
        }),
      explainWhy: 'Rule: page anchor risk score exceeds threshold.',
    },
    {
      id: 'tp3',
      origin: 'ai',
      severity: 'info',
      kind: 'opportunity',
      title: 'Link opportunity pages (high potential)',
      description: 'Pages with few but high‑quality links — additional links could lift rankings.',
      meta: [{ label: 'Low link count' }, { label: 'High value' }],
      quickStat: '15 pages',
      ctaLabel: 'Create Outreach Task',
      onCta: () =>
        onNavigate?.({
          section: 'topPagesTable',
          filters: { linkOpportunity: true, openTaskDrawer: true },
        }),
      explainWhy: 'AI: low volume but positive trust/traffic signals.',
    },
    {
      id: 'tp4',
      origin: 'rule',
      severity: 'critical',
      kind: 'lowTrust',
      title: 'Pages receiving links from low‑trust domains',
      description: 'Flagged potential link network patterns sending links to key pages.',
      meta: [{ label: 'Low WR sources' }, { label: 'Risk clusters' }],
      quickStat: '6 pages',
      ctaLabel: 'Add to Disavow',
      onCta: () =>
        onNavigate?.({
          section: 'disavowManager',
          filters: { scope: 'pages_low_trust' },
        }),
      secondaryCtaLabel: 'View Table',
      onSecondaryCta: () =>
        onNavigate?.({
          section: 'topPagesTable',
          filters: { riskyDomainSources: true },
        }),
      explainWhy: 'Rule: repeated low‑trust domains linking to same pages.',
    },
    {
      id: 'tp5',
      origin: 'rule',
      severity: 'warning',
      kind: 'lostLinks',
      title: 'High‑traffic pages losing backlinks (last 30d)',
      description: ga4Connected
        ? 'Important pages lost quality backlinks recently; consider recovery.'
        : 'Connect GA4 to view traffic impact and prioritize recoveries.',
      meta: [{ label: 'Last 30 days' }],
      quickStat: '8 pages',
      requiresGA4: true,
      ctaLabel: ga4Connected ? 'View Lost Links' : 'Connect GA4',
      onCta: ga4Connected
        ? () =>
            onNavigate?.({
              section: 'newLostTab',
              filters: { mode: 'lost', scope: 'pages_high_traffic' },
            })
        : () => onNavigate?.({ section: 'analyticsIntegration' }),
      secondaryCtaLabel: ga4Connected ? 'Create Task' : undefined,
      onSecondaryCta: ga4Connected
        ? () =>
            onNavigate?.({
              section: 'newLostTab',
              filters: { mode: 'lost', openTaskDrawer: true },
            })
        : undefined,
      explainWhy: 'Rule + Traffic: lost links on pages with meaningful referral value.',
    },
  ];
}

export default function Tab6Section0TargetPagesSmartSuggestions({
  suggestions,
  defaultFilter = 'all',
  highRiskDetected = false,
  ga4Connected = false,
  onViewAll,
  onConnectGA4,
  onNavigate,
  className,
}: Tab6Section0TargetPagesSmartSuggestionsProps) {
  const [filter, setFilter] = useState<'all' | 'ai' | 'rule'>(defaultFilter);
  const data = suggestions ?? buildDefaultSuggestions(onNavigate, ga4Connected);

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter((s) => s.origin === filter);
  }, [data, filter]);

  return (
    <section
      className={[
        'rounded-2xl p-4 sm:p-5 shadow-sm',
        className ?? '',
        'font-[Inter,_Inter_Fallback]',
      ].join(' ')}
      style={{
        background: highRiskDetected ? 'rgba(245,158,11,0.08)' : '#FFFFFF',
        border: `1px solid ${TOKENS.border}`,
      }}
      aria-labelledby="tp-smart-suggestions-title"
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" style={{ color: TOKENS.brand }} />
          <h3 id="tp-smart-suggestions-title" className="text-base font-semibold" style={{ color: TOKENS.darkerMuted }}>
            Smart Suggestions
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* AI | Rules | All segmented filter */}
          <div
            className="inline-flex rounded-md border bg-white p-0.5"
            style={{ borderColor: TOKENS.border }}
            role="tablist"
            aria-label="Suggestion source filter"
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
                    active ? 'text-white' : '',
                  ].join(' ')}
                  style={{
                    background: active ? TOKENS.brand : 'transparent',
                    color: active ? '#FFFFFF' : TOKENS.darkerMuted,
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
            className="inline-flex items-center rounded-md border bg-white px-3 py-1.5 text-sm font-medium hover:bg-[var(--chipHover)] cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.darkerMuted, ['--chipHover' as any]: TOKENS.chipHover }}
            title="Open full suggestions feed"
          >
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards: mobile = horizontal scroll; desktop = grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-lg border border-dashed bg-white p-8 text-center text-sm"
          style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
        >
          No suggestions match this filter right now.
        </div>
      ) : (
        <>
          {/* Mobile / small screens: horizontal scroller */}
          <div className="sm:hidden -mx-4 px-4">
            <div className="flex snap-x gap-4 overflow-x-auto pb-1">
              {filtered.map((s) => (
                <div key={s.id} className="snap-start">
                  <SuggestionCard s={s} ga4Connected={ga4Connected} onConnectGA4={onConnectGA4} />
                </div>
              ))}
            </div>
          </div>

          {/* ≥ sm: grid layout */}
          <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:gap-4">
            {filtered.map((s) => (
              <SuggestionCard key={s.id} s={s} ga4Connected={ga4Connected} onConnectGA4={onConnectGA4} />
            ))}
          </div>
        </>
      )}

      {/* Helper note */}
      <div className="mt-4 flex items-center gap-2 text-[12px]" style={{ color: TOKENS.muted }}>
        <FileWarning className="h-4 w-4" style={{ color: TOKENS.darkerMuted }} />
        Suggestions combine <strong className="mx-1">AI</strong> + <strong className="mx-1">rules</strong> across
        toxicity, lost‑link trends, anchor risk, and domain trust. CTAs deep‑link to the relevant audit views.
      </div>
    </section>
  );
}

