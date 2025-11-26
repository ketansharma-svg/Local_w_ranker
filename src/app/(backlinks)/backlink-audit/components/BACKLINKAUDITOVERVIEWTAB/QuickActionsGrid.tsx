import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  Shield,
  Link2,
  Activity,
  ClipboardList,
  Gauge,
  FileText,
  FileDown,
  HeartPulse,
  ChevronDown,
  ChevronUp,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

/** -----------------------------------------------------------------------
 *  Section 10 – Quick Actions Grid (Backlink Audit → Overview Tab)
 *  - Redesigned to match recent patterns & tokens
 *  - Inter / Inter Fallback fonts
 *  - Branded (#008CCD) iconography, modern Chips & Filters
 *  - TailwindCSS-only, no app router dependency
 *  - Callbacks let the host handle routing/drawers/exports
 * ---------------------------------------------------------------------- */

type ActionId =
  | 'audit-risky-domains'
  | 'open-disavow-manager'
  | 'audit-anchors'
  | 'analyze-velocity'
  | 'create-task'
  | 'open-wr-breakdown'
  | 'view-affected-pages'
  | 'export-disavow'
  | 'open-health-monitor';

type QuickAction = {
  id: ActionId;
  title: string;
  description: string;
  ctaLabel: string;
  /** Semantic destination the host can map to a route or drawer */
  destination?: string;
  /** Optional tooltip shown on card hover */
  tooltip?: string;
  /** Disable CTA & show reason on hover */
  disabledReason?: string;
  /** Emphasize as priority (adds subtle glow) */
  highlight?: boolean;
  /** Icon to render (lucide) */
  icon: React.ElementType<{ className?: string }>;
};

type Props = {
  /** Called for navigational cards */
  onRoute?: (destination: string, actionId: ActionId) => void;
  /** Called when "Export Disavow File" is clicked */
  onExportDisavow?: () => void;
  /** Control how many cards to show before “Expand” (default 6) */
  collapsedCount?: number;
  /** Optional overrides / dynamic disabling & highlighting */
  actionsOverride?: Partial<Record<ActionId, Partial<QuickAction>>>;
  /** Context flags to drive defaults (optional) */
  context?: {
    hasToxic?: boolean; // highlight "Audit Risky Domains"
    disavowQueuePending?: boolean; // highlight "Open Disavow Manager"
    canExportDisavow?: boolean; // enable/disable export CTA
  };
  className?: string;
};

/** Latest tokens aligned with recent designs (with runtime CSS vars for easy theming) */
const TOKENS = {
  brand: '#008CCD',
  brand700: '#007CAF',
  brand600: '#008CCD',
  brandTint: 'rgba(0,140,205,0.08)',
  brandTintStrong: 'rgba(0,140,205,0.16)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  borderSubtle: '#E6E8EC',
  surface: '#FFFFFF',
  chipBg: '#F4F7FA',
  chipBorder: '#E6E8EC',
  ring: 'rgba(0,140,205,0.35)',
} as const;

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ');
}

/** Category chips (client-side filter only; no API changes) */
type ChipId =
  | 'all'
  | 'priority'
  | 'risk'
  | 'audit'
  | 'trends'
  | 'tasks'
  | 'exports'
  | 'monitoring';

const CHIP_DEFS: { id: ChipId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'priority', label: 'Priority' },
  { id: 'risk', label: 'Risk' },
  { id: 'audit', label: 'Audit' },
  { id: 'trends', label: 'Trends' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'exports', label: 'Exports' },
  { id: 'monitoring', label: 'Monitoring' },
];

function categoriesFor(id: ActionId): ChipId[] {
  switch (id) {
    case 'audit-risky-domains':
    case 'open-disavow-manager':
      return ['risk', 'audit'];
    case 'audit-anchors':
    case 'open-wr-breakdown':
    case 'view-affected-pages':
      return ['audit'];
    case 'analyze-velocity':
      return ['trends'];
    case 'create-task':
      return ['tasks'];
    case 'export-disavow':
      return ['exports'];
    case 'open-health-monitor':
      return ['monitoring'];
    default:
      return ['all'];
  }
}

function BaseCard({
  action,
  onClick,
}: {
  action: QuickAction;
  onClick: () => void;
}) {
  const Icon = action.icon;
  const disabled = !!action.disabledReason;

  return (
    <div
      className={cx(
        'group relative rounded-xl border p-4 shadow-sm transition',
        'hover:shadow-md hover:-translate-y-[1px] will-change-transform',
        'bg-[var(--surface)] border-[var(--border-subtle)]',
        action.highlight ? 'ring-1 ring-[var(--ring)]' : 'ring-0',
        disabled ? 'opacity-60 cursor-default' : 'cursor-pointer'
      )}
      title={action.tooltip}
      role="button"
      tabIndex={0}
      onClick={() => !disabled && onClick()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) onClick();
      }}
      aria-disabled={disabled}
    >
      {/* Icon */}
      <div
        className={cx(
          'mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border',
          'bg-[var(--brand-tint)] border-[var(--brand-tint-strong)]'
        )}
      >
        <Icon className="h-5 w-5 text-[var(--brand-600)]" />
      </div>

      {/* Title */}
      <div className="text-[15px] font-semibold text-[var(--text-primary)]">
        {action.title}
      </div>

      {/* Description */}
      <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
        {action.description}
      </p>

      {/* CTA */}
      <div className="mt-3">
        <button
          type="button"
          className={cx(
            'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium',
            'transition hover:shadow-sm',
            disabled
              ? 'border-[var(--border-subtle)] text-[color:rgb(156,163,175)] cursor-not-allowed'
              : 'border-[var(--brand-600)] text-[var(--brand-700)] hover:bg-[var(--brand-tint)] cursor-pointer'
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onClick();
          }}
          title={disabled ? action.disabledReason : undefined}
          aria-label={action.ctaLabel}
        >
          {action.ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default function QuickActionsGridSection({
  onRoute,
  onExportDisavow,
  collapsedCount = 6,
  actionsOverride,
  context,
  className,
}: Props) {
  const canExport = context?.canExportDisavow ?? true;

  const base: QuickAction[] = [
    {
      id: 'audit-risky-domains',
      title: 'Audit Risky Domains',
      description: 'Filter and review toxic/suspicious referring domains.',
      ctaLabel: 'Audit Now',
      destination: 'audit/ref-domains?filter=toxic',
      tooltip: 'Open Referring Domains tab with Toxic filter applied.',
      icon: ShieldAlert,
      highlight: !!context?.hasToxic,
    },
    {
      id: 'open-disavow-manager',
      title: 'Open Disavow Manager',
      description: 'Manage the queue and export to GSC.',
      ctaLabel: 'View Disavow List',
      destination: 'disavow/manager',
      tooltip: 'Open the Disavow Manager for this project.',
      icon: Shield,
      highlight: !!context?.disavowQueuePending,
    },
    {
      id: 'audit-anchors',
      title: 'Fix Overused Anchors',
      description: 'Find spammy or exact‑match anchors across pages.',
      ctaLabel: 'Audit Anchors',
      destination: 'audit/anchors',
      tooltip: 'Open Anchor Risk Audit with risk filters.',
      icon: Link2,
    },
    {
      id: 'analyze-velocity',
      title: 'Analyze Link Velocity',
      description: 'View spikes in link gain/loss trends.',
      ctaLabel: 'Open Trends',
      destination: 'audit/new-lost',
      tooltip: 'Open New & Lost tab with velocity context.',
      icon: Activity,
    },
    {
      id: 'create-task',
      title: 'Create Cleanup Task',
      description: 'Assign removal or disavow work to your team.',
      ctaLabel: 'Create Task',
      destination: 'task-drawer',
      tooltip: 'Open the universal Task Drawer with backlink context.',
      icon: ClipboardList,
    },
    {
      id: 'open-wr-breakdown',
      title: 'Open WR Score Breakdown',
      description: 'See how risk is impacting WR Score.',
      ctaLabel: 'View Breakdown',
      destination: 'wr-score/drawer',
      tooltip: 'Open the WR Score drawer (Backlink Insights).',
      icon: Gauge,
    },
    {
      id: 'view-affected-pages',
      title: 'View All Affected Pages',
      description: 'Pages most impacted by risky backlinks.',
      ctaLabel: 'Audit Pages',
      destination: 'audit/target-pages',
      tooltip: 'Open Target Pages tab filtered by risk.',
      icon: FileText,
    },
    {
      id: 'export-disavow',
      title: 'Export Disavow File',
      description: 'Download latest .txt in GSC format.',
      ctaLabel: 'Export Now',
      tooltip: canExport ? 'Generate & download disavow file.' : 'No items to export yet.',
      icon: FileDown,
      ...(canExport ? {} : { disabledReason: 'No active disavowed items to export.' }),
    },
    {
      id: 'open-health-monitor',
      title: 'Open Health Monitor',
      description: 'Track manually added links and statuses.',
      ctaLabel: 'Monitor Links',
      destination: 'health-monitor',
      tooltip: 'Jump to Health Monitor.',
      icon: HeartPulse,
    },
  ];

  const actions = useMemo<QuickAction[]>(() => {
    if (!actionsOverride) return base;
    return base.map((a) => ({ ...a, ...(actionsOverride[a.id] ?? {}) } as QuickAction));
  }, [actionsOverride, context?.hasToxic, context?.disavowQueuePending, context?.canExportDisavow]);

  const [expanded, setExpanded] = useState(false);
  const [chip, setChip] = useState<ChipId>('all');

  const filtered = useMemo(() => {
    if (chip === 'all') return actions;
    if (chip === 'priority') return actions.filter((a) => a.highlight);
    return actions.filter((a) => categoriesFor(a.id).includes(chip));
  }, [actions, chip]);

  const visible = expanded ? filtered : filtered.slice(0, collapsedCount);

  function handleAction(a: QuickAction) {
    if (a.id === 'export-disavow') {
      if (a.disabledReason) return;
      if (onExportDisavow) onExportDisavow();
      else console.log('[QuickActions] export-disavow clicked');
      return;
    }
    if (onRoute && a.destination) {
      onRoute(a.destination, a.id);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('wranker:navigate', { detail: { to: a.destination ?? a.id } })
      );
    }
  }

  /** CSS custom properties mapped to tokens */
  const cssVars = {
    '--brand-700': TOKENS.brand700,
    '--brand-600': TOKENS.brand600,
    '--brand': TOKENS.brand,
    '--brand-tint': TOKENS.brandTint,
    '--brand-tint-strong': TOKENS.brandTintStrong,
    '--text-primary': TOKENS.textPrimary,
    '--text-secondary': TOKENS.textSecondary,
    '--border-subtle': TOKENS.borderSubtle,
    '--surface': TOKENS.surface,
    '--chip-bg': TOKENS.chipBg,
    '--chip-border': TOKENS.chipBorder,
    '--ring': TOKENS.ring,
  } as React.CSSProperties;

  return (
    <section
      className={cx(
        'w-full rounded-2xl border bg-[var(--surface)] p-5 sm:p-6',
        'border-[var(--border-subtle)] shadow-[0_2px_8px_rgba(2,6,23,0.06)]',
        className
      )}
      aria-labelledby="quick-actions-heading"
      style={{
        ...cssVars,
        fontFamily:
          'Inter, "Inter Fallback", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
      }}
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-tint)] ring-1 ring-[var(--brand-tint-strong)]">
              <Sparkles className="h-4 w-4 text-[var(--brand-600)]" />
            </span>
            <h3 id="quick-actions-heading" className="text-[16px] font-semibold text-[var(--text-primary)]">
              Quick Actions
            </h3>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            One‑click access to audit tools, disavow, trends, and tasks.
          </p>
          {/* Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CHIP_DEFS.map((c) => {
              const active = chip === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setChip(c.id)}
                  className={cx(
                    'inline-flex select-none items-center gap-2 rounded-full border px-3 py-1 text-sm transition',
                    'cursor-pointer',
                    active
                      ? 'border-[var(--brand-600)] bg-[var(--brand-tint)] text-[var(--brand-700)] ring-1 ring-[var(--ring)]'
                      : 'border-[var(--chip-border)] bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:border-[var(--brand-600)] hover:text-[var(--brand-700)]'
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('wranker:openFilters', { detail: { source: 'quick-actions' } }));
              }
            }}
            className={cx(
              'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium',
              'border-[var(--brand-600)] text-[var(--brand-700)] hover:bg-[var(--brand-tint)] cursor-pointer transition'
            )}
            aria-label="Open Filters"
            title="Open Filters"
          >
            <SlidersHorizontal className="h-4 w-4 text-[var(--brand-600)]" />
            Filters
          </button>

          {filtered.length > collapsedCount && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={cx(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium',
                'border-[var(--brand-600)] text-[var(--brand-700)] hover:bg-[var(--brand-tint)] cursor-pointer transition'
              )}
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  Collapse <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Expand <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((a) => (
          <BaseCard key={a.id} action={a} onClick={() => handleAction(a)} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span className="inline-block h-3 w-3 rounded-sm bg-[var(--brand-tint)] ring-1 ring-[var(--brand-tint-strong)]" />
        <span>Highlighted = suggested priority based on your current risk state.</span>
      </div>
    </section>
  );
}

/* ----------------------------- Usage Example ------------------------------
<QuickActionsGridSection
  context={{ hasToxic: true, disavowQueuePending: true, canExportDisavow: false }}
  onRoute={(dest, id) => {
    console.log('route →', dest, id);
  }}
  onExportDisavow={() => {
    console.log('export disavow requested');
  }}
/>
--------------------------------------------------------------------------- */
