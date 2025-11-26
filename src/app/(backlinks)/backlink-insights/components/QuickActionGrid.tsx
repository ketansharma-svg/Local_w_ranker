import React from 'react';
import {
  // lucide-react icons
  Search,
  ShieldOff,
  PieChart,
  Activity,
  AlertTriangle,
  TrendingUp,
  ArrowRightLeft,
  Sparkles,
  ClipboardPlus,
} from 'lucide-react';

/* --------------------------------------------------------------------------
   Backlink Insights → Overview → SECTION 8: Quick Action Grid
   - TailwindCSS only (no external UI libs)
   - 3 cols (desktop) · 2 cols (tablet) · 1 col (mobile)
   - Shows 6 cards by default; expands up to 9 with toggle
   - Each card = icon + title + description + primary CTA
   - Optional: badge counts, glow highlight, disabled with tooltip
   - Refinements applied:
     • Inter + Inter Fallback fonts
     • Branded (#008CCD) iconography for section header
     • Pointer cursor on all clickable elements
     • Optional domain chips that use site favicons
     • Optional small circular gauge for WR score
     • Optional modular chips & toggle switch hooks (additive, non-breaking)
   -------------------------------------------------------------------------- */

type ActionId =
  | 'openAuditLinks'
  | 'openDisavow'
  | 'openWrScore'
  | 'openHealthMonitor'
  | 'openRiskInsights'
  | 'scrollToTrends'
  | 'openBacklinkGap'
  | 'openOpportunities'
  | 'openTaskDrawer';

type HandlerMap = Partial<Record<ActionId, () => void>>;

type ToggleSpec = {
  /** Optional label shown next to switch */
  label?: string;
  /** Initial checked state if no controlled state is wired */
  checked?: boolean;
  /** Optional callback when toggled */
  onChange?: (checked: boolean) => void;
};

type ChipItem =
  | string
  | {
      label: string;
      /** Optional leading image (e.g., custom icon) */
      iconUrl?: string;
      /** Visual hint only */
      tone?: 'default' | 'brand' | 'muted' | 'danger' | 'success';
      /** Optional click handler */
      onClick?: () => void;
    };

type ActionCard = {
  id: ActionId;
  title: string;
  description: string;
  ctaLabel: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tooltip?: string;
  disabled?: boolean;
  badgeCount?: number; // red dot count (e.g., pending disavows)
  highlight?: boolean; // glow border for high-priority actions

  /** ——— Refinement add-ons (all optional) ——— */
  /** Domain chips rendered with each domain's favicon */
  domains?: string[];
  /** Generic modular chips (e.g., "New", "Beta", "High Risk") */
  chips?: ChipItem[];
  /** Inline toggle switch (e.g., "Auto-monitor") */
  toggle?: ToggleSpec;
};

export type QuickActionGridProps = HandlerMap & {
  /** Provide a custom set of cards; defaults to 9 suggested actions from spec */
  actions?: ActionCard[];
  /** Show at most this many actions before "+ Expand" appears */
  maxVisible?: number; // default: 6
  /** Optional section header visibility */
  showHeader?: boolean; // default: true
  /** Optional anchor id to allow other blocks to scroll here */
  anchorId?: string; // default: "bi-overview-quick-actions"
  /** Optional className for outer wrapper */
  className?: string;
  /** Optional WR score (0–100) to render a small circular gauge on the WR card */
  wrScore?: number;
};

/** Brand tokens (updated) */
const T = {
  brand: '#008CCD',
  brandSoft: '#E6F7FF',
  danger: '#EF4444',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
};

/* ---------------------------------- UI bits --------------------------------- */

function getFaviconUrl(domain: string, size: 32 | 64 = 32) {
  // Uses Google S2 favicons endpoint; pass a bare domain like "example.com"
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=${size}`;
}
type ChipTone = 'default' | 'brand' | 'muted' | 'danger' | 'success';

type ChipItemObject = {
  label: string;
  iconUrl?: string;
  tone?: ChipTone;
  onClick?: () => void;
};

// type ChipItem = string | ChipItemObject;

function Chip({ item }: { item: ChipItem }) {
  // Normalize `item` into a full ChipItemObject
  const spec: ChipItemObject =
    typeof item === 'string' ? { label: item, tone: 'default' } : item;

  const tone: ChipTone = spec.tone ?? 'default';

  const toneStyles =
    tone === 'brand'
      ? 'border-[#BCE7F9] bg-[#F4FBFF] text-[#056C9A]'
      : tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'muted'
      ? 'border-gray-200 bg-gray-50 text-gray-700'
      : 'border-gray-200 bg-white text-gray-700';

  const clickable = typeof spec.onClick === 'function';

  return (
    <span
      onClick={spec.onClick}
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors',
        clickable ? 'hover:bg-gray-50 cursor-pointer' : '',
        toneStyles,
      ].join(' ')}
      title={spec.label}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : -1}
    >
      {spec.iconUrl && (
        <img
          src={spec.iconUrl}
          alt=""
          className="h-3.5 w-3.5 rounded-[3px] object-contain"
          loading="lazy"
        />
      )}
      <span className="leading-none">{spec.label}</span>
    </span>
  );
}

// function Chip({
//   item,
// }: {
//   item: ChipItem;
// }) {
//   const spec =
//     typeof item === 'string' ? ({ label: item, tone: 'default' } as NonNullable<ChipItem & { label: string }>) : item;

//   const tone = spec.tone ?? 'default';
//   const toneStyles =
//     tone === 'brand'
//       ? 'border-[#BCE7F9] bg-[#F4FBFF] text-[#056C9A]'
//       : tone === 'danger'
//       ? 'border-red-200 bg-red-50 text-red-700'
//       : tone === 'success'
//       ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
//       : tone === 'muted'
//       ? 'border-gray-200 bg-gray-50 text-gray-700'
//       : 'border-gray-200 bg-white text-gray-700';

//   const clickable = typeof spec.onClick === 'function';

//   return (
//     <span
//       onClick={spec.onClick}
//       className={[
//         'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs',
//         'transition-colors',
//         clickable ? 'hover:bg-gray-50 cursor-pointer' : '',
//         toneStyles,
//       ].join(' ')}
//       title={spec.label}
//       role={clickable ? 'button' : undefined}
//       tabIndex={clickable ? 0 : -1}
//     >
//       {spec.iconUrl && (
//         <img
//           src={spec.iconUrl}
//           alt=""
//           className="h-3.5 w-3.5 rounded-[3px] object-contain"
//           loading="lazy"
//         />
//       )}
//       <span className="leading-none">{spec.label}</span>
//     </span>
//   );
// }

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'inline-flex items-center gap-2 select-none',
        'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
          checked ? 'bg-[#0AA3E0]' : 'bg-gray-300',
        ].join(' ')}
      >
        <span
          className={[
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[1rem]' : 'translate-x-0',
          ].join(' ')}
        />
      </span>
      {label && (
        <span className="text-xs text-gray-700">{label}</span>
      )}
    </button>
  );
}

/** Tiny circular gauge for WR Score */
function MiniGauge({
  value,
  size = 36,
  strokeWidth = 4,
  trackColor = '#E5E7EB',
  barColor = T.brand,
}: {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  barColor?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={barColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: `${c} ${c}`,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 300ms ease',
          }}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-gray-800">
        {clamped}
      </span>
    </div>
  );
}

/* ------------------------------- Default list ------------------------------- */

function buildDefaultActions(h: HandlerMap): ActionCard[] {
  return [
    {
      id: 'openAuditLinks',
      title: 'Audit My Backlinks',
      description: 'Jump to detailed audit of all backlinks.',
      ctaLabel: 'Open Backlink Audit',
      icon: Search,
      tooltip: 'Opens the Backlink Audit → Links tab.',
    },
    {
      id: 'openDisavow',
      title: 'Disavow Spammy Links',
      description: 'Manage disavow list for risky sources.',
      ctaLabel: 'Go to Disavow Manager',
      icon: ShieldOff,
      tooltip: 'Opens Disavow Manager for this project.',
    },
    {
      id: 'openWrScore',
      title: 'Analyze WR Score',
      description: 'See the full WR Score breakdown.',
      ctaLabel: 'Open Score Breakdown',
      icon: PieChart,
      tooltip: 'Opens the WR Score drawer.',
    },
    {
      id: 'openHealthMonitor',
      title: 'Monitor Key Links',
      description: 'Track manually added or acquired links.',
      ctaLabel: 'Open Health Monitor',
      icon: Activity,
      tooltip: 'Routes to Health Monitor tab.',
    },
    {
      id: 'openRiskInsights',
      title: 'View Risk Insights',
      description: 'Toxic sources & trends at a glance.',
      ctaLabel: 'View SEO Risks',
      icon: AlertTriangle,
      tooltip: 'Opens Risk Insights tab.',
    },
    {
      id: 'scrollToTrends',
      title: 'Check Backlink Trends',
      description: 'Growth vs. loss & acquisition charts.',
      ctaLabel: 'View Trend Charts',
      icon: TrendingUp,
      tooltip: 'Scrolls to Trend & Distribution charts (Section 4).',
    },
    {
      id: 'openBacklinkGap',
      title: 'Compare Competitor Links',
      description: 'Run backlink gap analysis.',
      ctaLabel: 'Open Backlink Gap',
      icon: ArrowRightLeft,
      tooltip: 'Opens Competitor Insights → Backlink Gap.',
    },
    {
      id: 'openOpportunities',
      title: 'Explore Link Opportunities',
      description: 'Find prospects & placements.',
      ctaLabel: 'Go to Opportunities',
      icon: Sparkles,
      tooltip: 'Routes to Opportunities tab.',
    },
    {
      id: 'openTaskDrawer',
      title: 'Create a Task',
      description: 'Assign cleanup or outreach work.',
      ctaLabel: 'Assign Task',
      icon: ClipboardPlus,
      tooltip: 'Opens the Universal Task Drawer with backlink context.',
    },
  ];
}

export default function BIOverviewQuickActionGrid({
  actions,
  maxVisible = 6,
  showHeader = true,
  anchorId = 'bi-overview-quick-actions',
  className,
  wrScore,
  ...handlers
}: QuickActionGridProps) {
  const [expanded, setExpanded] = React.useState(false);

  const finalActions: ActionCard[] = React.useMemo(() => {
    const base = actions ?? buildDefaultActions(handlers);
    return base;
  }, [actions, handlers]);

  const visible = expanded ? finalActions : finalActions.slice(0, maxVisible);

  function run(id: ActionId) {
    const fn = handlers[id];
    if (fn) fn();
  }

  /** Local toggle state keyed by action id (avoids using hooks within list map) */
  const [toggleState, setToggleState] = React.useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        (actions ?? []).map((a) => [a.id, a.toggle?.checked ?? false])
      )
  );

  return (
    <section
      id={anchorId}
      style={{
        fontFamily:
          'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      className={[
        'w-full rounded-2xl border bg-white border-[#EFF0F6] shadow-sm',
        'p-5 sm:p-6',
        className ?? '',
      ].join(' ')}
    >
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-md"
              style={{ backgroundColor: T.brandSoft, color: T.brand }}
              aria-hidden="true"
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Quick Actions
            </h3>
          </div>
        </div>
      )}

      {/* Grid: 3 / 2 / 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((card) => {
          const Icon = card.icon;
          const disabled = !!card.disabled;

          const hasToggle = !!card.toggle;
          const isChecked =
            toggleState[card.id] ?? card.toggle?.checked ?? false;

          return (
            <div
              key={card.id}
              className={[
                'group relative overflow-hidden rounded-xl border bg-white',
                'min-h-[140px] p-4 sm:p-5',
                'transition-all',
                disabled
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:shadow-md hover:scale-[1.01] cursor-pointer',
                card.highlight
                  ? 'border-transparent ring-2 ring-[#008CCD] ring-offset-0'
                  : 'border-gray-200',
              ].join(' ')}
              onClick={() => !disabled && run(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) run(card.id);
              }}
              aria-disabled={disabled}
              title={card.tooltip}
            >
              {/* Alert badge */}
              {typeof card.badgeCount === 'number' && card.badgeCount > 0 && (
                <span className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {card.badgeCount}
                </span>
              )}

              {/* Optional WR mini-gauge (top-right) */}
              {card.id === 'openWrScore' && typeof wrScore === 'number' && (
                <div className="absolute right-3 top-3">
                  <MiniGauge value={wrScore} />
                </div>
              )}

              {/* Icon */}
              <div
                className="mb-3 inline-flex items-center justify-center rounded-lg"
                style={{ backgroundColor: T.brandSoft, color: T.brand }}
              >
                <Icon className="h-5 w-5 m-2" />
              </div>

              {/* Title row: title + optional toggle */}
              <div className="flex items-start justify-between gap-3 pr-2">
                <div className="text-[15px] font-semibold text-gray-900">
                  {card.title}
                </div>

                {hasToggle && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                    title={card.toggle?.label}
                  >
                    <ToggleSwitch
                      checked={isChecked}
                      onChange={(v) => {
                        setToggleState((prev) => ({ ...prev, [card.id]: v }));
                        card.toggle?.onChange?.(v);
                      }}
                      label={card.toggle?.label}
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-1 pr-2 text-sm text-gray-600">
                {card.description}
              </div>

              {/* Optional domain chips (with favicons) */}
              {card.domains && card.domains.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.domains.slice(0, 3).map((d) => (
                    <Chip
                      key={d}
                      item={{
                        label: d,
                        iconUrl: getFaviconUrl(d, 32),
                        tone: 'muted',
                      }}
                    />
                  ))}
                  {card.domains.length > 3 && (
                    <Chip
                      item={{
                        label: `+${card.domains.length - 3}`,
                        tone: 'muted',
                      }}
                    />
                  )}
                </div>
              )}

              {/* Optional generic chips */}
              {card.chips && card.chips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.chips.map((c, idx) => (
                    <Chip key={`${card.id}-chip-${idx}`} item={c} />
                  ))}
                </div>
              )}

              {/* CTA */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) run(card.id);
                  }}
                  disabled={disabled}
                  className={[
                    'inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium',
                    'transition-colors cursor-pointer',
                    disabled
                      ? 'border-gray-200 text-gray-400 bg-gray-50'
                      : 'border-[#008CCD] text-[#008CCD] hover:bg-[#008CCD] hover:text-white',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#80D0F0]',
                  ].join(' ')}
                >
                  {card.ctaLabel}
                </button>
              </div>

              {card.tooltip && <span className="sr-only">{card.tooltip}</span>}
            </div>
          );
        })}
      </div>

      {/* Expand / Collapse */}
      {finalActions.length > (maxVisible ?? 6) && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium text-[#008CCD] hover:underline cursor-pointer"
          >
            {expanded
              ? 'Collapse Actions'
              : `+ Expand Actions (${finalActions.length - (maxVisible ?? 6)} more)`}
          </button>
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------------------
   USAGE EXAMPLE (optional)

   <BIOverviewQuickActionGrid
     wrScore={72}  // small circular gauge on the WR card (optional)
     openAuditLinks={() => router.push('/backlinks/audit?tab=links')}
     openDisavow={() => router.push('/backlinks/audit?tab=disavow')}
     openWrScore={() => setWrScoreDrawerOpen(true)}
     openHealthMonitor={() => router.push('/backlinks/health-monitor')}
     openRiskInsights={() => router.push('/backlinks/risk-insights')}
     scrollToTrends={() => document.getElementById('bi-overview-trends')?.scrollIntoView({ behavior: 'smooth' })}
     openBacklinkGap={() => router.push('/competitors/insights?tab=backlink-gap')}
     openOpportunities={() => router.push('/backlinks/opportunities')}
     openTaskDrawer={() => setTaskDrawerOpen(true)}
     actions={[
       // Optional: enrich any card with domains (favicons), chips, or a toggle
       // {
       //   id: 'openBacklinkGap',
       //   title: 'Compare Competitor Links',
       //   description: 'Run backlink gap analysis.',
       //   ctaLabel: 'Open Backlink Gap',
       //   icon: ArrowRightLeft,
       //   domains: ['example.com', 'contoso.com', 'acme.org', 'another.net'],
       // }
       // {
       //   id: 'openHealthMonitor',
       //   title: 'Monitor Key Links',
       //   description: 'Track manually added or acquired links.',
       //   ctaLabel: 'Open Health Monitor',
       //   icon: Activity,
       //   toggle: { label: 'Auto-monitor', checked: true, onChange: (v) => console.log('auto-monitor:', v) },
       //   chips: [{ label: 'New', tone: 'brand' }, { label: '5 watching', tone: 'muted' }],
       // }
       // {
       //   id: 'openDisavow',
       //   title: 'Disavow Spammy Links',
       //   description: 'Manage disavow list for risky sources.',
       //   ctaLabel: 'Go to Disavow Manager',
       //   icon: ShieldOff,
       //   chips: [{ label: '3 pending', tone: 'danger' }],
       //   badgeCount: 3,
       //   highlight: true
       // }
     ]}
   />

   Notes:
   - Inter font is applied inline at the section root.
   - Section title uses branded (#008CCD) icon styling.
   - Domain chips automatically render favicons via Google S2.
   - The WR card shows a compact circular gauge when `wrScore` is provided.
   - Pointer cursors are enabled on cards, CTAs, toggles, and expand/collapse.
-------------------------------------------------------------------------- */
