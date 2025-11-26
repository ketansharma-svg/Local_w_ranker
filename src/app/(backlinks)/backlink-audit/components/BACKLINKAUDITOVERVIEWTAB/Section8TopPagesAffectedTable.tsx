import React from 'react';
import {
  Info,
  ExternalLink,
  FileSearch,
  Shield,
  Eye,
  AlertCircle,
  PlugZap,
  Filter,
  FileDown,
  ShieldAlert,
} from 'lucide-react';

/** -----------------------------------------------------------------------
 * Section 8 – Top Pages Affected by Toxic/Suspicious Links (Table)
 * - React + TailwindCSS (Inter / Inter Fallback)
 * - Desktop: compact table; Mobile: stacked card layout
 * - GA4 referral traffic cell: Connected / 0 sessions / Not Connected (CTA)
 * - Actions: (branded icon buttons with hover-name): Page Analyzer • Audit Links • Disavow
 * - Header: modern Chips + Filters button + Export button
 * - Pointer cursor on clickable elements
 * - Branded icon color: #008CCD
 * ---------------------------------------------------------------------- */

type AnchorRiskLevel = 'High' | 'Medium' | 'Low';

type ReferralState =
  | { connected: true; total: number; risky: number }          // ✅ Connected
  | { connected: true; total: 0; risky: 0 }                     // ⚠️ Connected but no data
  | { connected: false };                                       // ❌ Not connected

export type TopPageRiskRow = {
  id: string;
  title?: string;                   // Optional human title
  url: string;                      // Page path or full URL
  toxicBacklinks: number;           // Count of toxic backlinks
  suspiciousBacklinks: number;      // Count of suspicious backlinks
  anchorRisk: AnchorRiskLevel | { label: AnchorRiskLevel; aqs?: number }; // Label or label+score
  wrImpact: number;                 // Negative = reduction (e.g., -1.5)
  referral: ReferralState;          // GA4 metric state
};

export type Section8Props = {
  rows?: TopPageRiskRow[];
  loading?: boolean;
  onConnectGA4?: () => void;
  onOpenPageAnalyzer?: (row: TopPageRiskRow) => void;
  onAuditLinks?: (row: TopPageRiskRow) => void;
  onDisavow?: (row: TopPageRiskRow) => void;
  onExport?: () => void;            // 🆕 Export handler (CSV/XLSX/etc.)
  className?: string;
};

/** Latest tokens (fallbacks included) */
const TOKENS = {
  brand: '#008CCD',
  border: 'var(--ds-border, #E8EDF2)',
  surface: 'var(--ds-surface, #FFFFFF)',
  soft: 'var(--ds-soft, #F6FAFD)',
  mutedText: 'var(--ds-text-muted, #667085)',
  strongText: 'var(--ds-text-strong, #0B1220)',
  chipBg: 'var(--ds-chip-bg, #E9F6FD)',
  chipText: 'var(--ds-chip-text, #075985)',
  danger: 'var(--ds-danger, #DC2626)',
  warn: 'var(--ds-warn, #D97706)',
  success: 'var(--ds-success, #047857)',
};

function clsx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}
function formatInt(n: number) {
  return new Intl.NumberFormat().format(n);
}
function riskBadge(level: AnchorRiskLevel) {
  switch (level) {
    case 'High':
      return 'border-red-200 text-red-700 bg-red-50';
    case 'Medium':
      return 'border-amber-200 text-amber-700 bg-amber-50';
    case 'Low':
      return 'border-emerald-200 text-emerald-700 bg-emerald-50';
  }
}
function anchorRiskLabel(a: TopPageRiskRow['anchorRisk']): AnchorRiskLevel {
  return typeof a === 'string' ? a : a.label;
}
function anchorRiskAqs(a: TopPageRiskRow['anchorRisk']): number | undefined {
  return typeof a === 'string' ? undefined : a.aqs;
}

/** Small tooltip using Tailwind group hover (scoped to the element only) */
const HoverTip: React.FC<{ text: string; offsetClass?: string; children: React.ReactNode }> = ({
  text,
  offsetClass = 'top-[118%] left-1/2 -translate-x-1/2',
  children,
}) => {
  return (
    <span className="relative inline-flex items-center group/tip">
      {children}
      <span
        className={clsx(
          'pointer-events-none absolute z-30 hidden w-max max-w-[260px] rounded-md border bg-white px-3 py-1.5 text-xs text-gray-700 shadow-md',
          'border-[var(--border)] group-hover/tip:block',
          offsetClass
        )}
        style={{ ['--border' as any]: TOKENS.border, fontFamily: "'Inter','Inter Fallback',ui-sans-serif" }}
      >
        {text}
      </span>
    </span>
  );
};

/** Referral traffic cell renderer */
const ReferralCell: React.FC<{
  referral: ReferralState;
  onConnect?: () => void;
}> = ({ referral, onConnect }) => {
  if (!referral.connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-400">–</span>
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-[var(--brand-soft)] cursor-pointer"
          style={{
            borderColor: 'color-mix(in oklab, var(--brand) 24%, #0000)',
            color: 'var(--brand)',
            ['--brand' as any]: TOKENS.brand,
            ['--brand-soft' as any]: TOKENS.soft,
            fontFamily: "'Inter','Inter Fallback',ui-sans-serif",
          }}
        >
          <PlugZap className="h-3.5 w-3.5" />
          Connect GA4
        </button>
      </div>
    );
  }

  const total = referral.total ?? 0;
  const risky = referral.risky ?? 0;

  const text = (
    <div className="flex flex-col sm:block">
      <span className="font-medium" style={{ color: TOKENS.brand }}>
        {formatInt(total)} sessions
      </span>
      <span className="sm:ml-1 text-gray-500">/ {formatInt(risky)} risky</span>
    </div>
  );

  const tip =
    total > 0
      ? `Total Referral Traffic: ${formatInt(total)} sessions\nFrom Risky Domains: ${formatInt(risky)} (${total ? ((risky / total) * 100).toFixed(1) : '0.0'}%)\nData from GA4 – last 30 days.`
      : `No referral traffic recorded for this page recently.`;

  return <HoverTip text={tip}>{text}</HoverTip>;
};

/** Branded circular icon button (Actions) */
const ActionIconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: React.ReactNode }
> = ({ label, children, className, ...rest }) => {
  return (
    <HoverTip text={label}>
      <button
        {...rest}
        className={clsx(
          'inline-flex h-8 w-8 items-center justify-center rounded-full border transition',
          'hover:bg-[var(--brand-soft)] active:scale-[0.98] cursor-pointer',
          className
        )}
        style={{
          borderColor: 'color-mix(in oklab, var(--brand) 24%, #0000)',
          color: 'var(--brand)',
          ['--brand' as any]: TOKENS.brand,
          ['--brand-soft' as any]: TOKENS.soft,
        }}
        aria-label={label}
        title={label}
      >
        <span className="sr-only">{label}</span>
        {children}
      </button>
    </HoverTip>
  );
};

/** Modern Chip */
const Chip: React.FC<
  { active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ active, children, className, ...rest }) => {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition',
        'ring-1 ring-inset backdrop-blur-sm cursor-pointer',
        active
          ? 'bg-[var(--chip-bg)] text-[var(--chip-text)] ring-[color-mix(in oklab,var(--brand) 55%,#0000)]'
          : 'bg-white text-[var(--muted)] ring-[var(--border)] hover:bg-[var(--soft)]',
        className
      )}
      style={{
        ['--brand' as any]: TOKENS.brand,
        ['--chip-bg' as any]: TOKENS.chipBg,
        ['--chip-text' as any]: TOKENS.chipText,
        ['--muted' as any]: TOKENS.mutedText,
        ['--soft' as any]: TOKENS.soft,
        ['--border' as any]: TOKENS.border,
        fontFamily: "'Inter','Inter Fallback',ui-sans-serif",
      }}
    >
      {children}
    </button>
  );
};

const DEFAULT_ROWS: TopPageRiskRow[] = [
  {
    id: '1',
    title: 'SEO Guide',
    url: '/blog/seo-guide',
    toxicBacklinks: 18,
    suspiciousBacklinks: 32,
    anchorRisk: { label: 'High', aqs: 38 },
    wrImpact: -2.1,
    referral: { connected: true, total: 1812, risky: 432 },
  },
  {
    id: '2',
    title: 'Pricing',
    url: '/pricing',
    toxicBacklinks: 5,
    suspiciousBacklinks: 9,
    anchorRisk: { label: 'Medium', aqs: 62 },
    wrImpact: -0.7,
    referral: { connected: true, total: 821, risky: 0 },
  },
  {
    id: '3',
    title: 'Bulk Analyzer',
    url: '/tools/bulk-analyzer',
    toxicBacklinks: 15,
    suspiciousBacklinks: 10,
    anchorRisk: 'High',
    wrImpact: -1.2,
    referral: { connected: false },
  },
];

export default function Section8TopPagesAffectedTable({
  rows = DEFAULT_ROWS,
  loading,
  onConnectGA4,
  onOpenPageAnalyzer,
  onAuditLinks,
  onDisavow,
  onExport,
  className,
}: Section8Props) {
  return (
    <div
      className={clsx(
        'w-full rounded-2xl border shadow-[0_2px_6px_rgba(0,0,0,0.05)]',
        'p-4 sm:p-5',
        className
      )}
      style={{
        background: TOKENS.surface,
        borderColor: TOKENS.border,
        fontFamily: "'Inter','Inter Fallback',ui-sans-serif",
      }}
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border"
            style={{
              color: TOKENS.brand,
              borderColor: 'color-mix(in oklab, var(--brand) 24%, #0000)',
              ['--brand' as any]: TOKENS.brand,
            }}
            aria-hidden
          >
            <ShieldAlert className="h-4 w-4" />
          </span>
          <h3 className="text-[15px] font-semibold" style={{ color: TOKENS.strongText }}>
            Top Pages Affected by Toxic/Suspicious Links
          </h3>
          <Info
            className="h-4 w-4"
            style={{ color: TOKENS.mutedText }}
            // title="Pages with risky backlinks + GA4 referral context (Total vs Risky)."
          />
        </div>

        {/* Right-side: chips / Filters / Export */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip active>All</Chip>
          <Chip>High</Chip>
          <Chip>Medium</Chip>
          <Chip>Low</Chip>
          <button
            type="button"
            className="ml-1 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--soft)] cursor-pointer"
            style={{
              color: TOKENS.brand,
              borderColor: 'color-mix(in oklab, var(--brand) 24%, #0000)',
              ['--soft' as any]: TOKENS.soft,
              ['--brand' as any]: TOKENS.brand,
            }}
            title="Open filters"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--soft)] cursor-pointer"
            onClick={onExport}
            style={{
              color: TOKENS.brand,
              borderColor: 'color-mix(in oklab, var(--brand) 24%, #0000)',
              ['--soft' as any]: TOKENS.soft,
              ['--brand' as any]: TOKENS.brand,
            }}
            title="Export this table"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full table-fixed">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[20%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="text-left">
            <tr className="border-b text-[13px]" style={{ borderColor: TOKENS.border, color: TOKENS.mutedText }}>
              <th className="pb-2 font-medium">Page URL / Title</th>
              <th className="pb-2 font-medium">Toxic</th>
              <th className="pb-2 font-medium">Suspicious</th>
              <th className="pb-2 font-medium">Anchor Risk</th>
              <th className="pb-2 font-medium">WR Impact</th>
              <th className="pb-2 font-medium">Referral Traffic (Total vs Risky)</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const risk = anchorRiskLabel(row.anchorRisk);
                const aqs = anchorRiskAqs(row.anchorRisk);
                return (
                  <tr
                    key={row.id}
                    className="group border-b hover:bg-[var(--soft)]"
                    style={{ borderColor: TOKENS.border, ['--soft' as any]: TOKENS.soft }}
                    onClick={() => onOpenPageAnalyzer?.(row)}
                    role="button"
                    tabIndex={0}
                    // className="group border-b hover:bg-[var(--soft)] cursor-pointer"
                  >
                    {/* Page */}
                    <td className="py-3 pr-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium" style={{ color: TOKENS.strongText }}>
                            {row.title ?? row.url}
                          </div>
                          {row.title && (
                            <div className="truncate text-[13px]" style={{ color: TOKENS.mutedText }}>
                              {row.url}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Toxic */}
                    <td className="py-3 pr-3 text-sm font-semibold" style={{ color: TOKENS.danger }}>
                      {formatInt(row.toxicBacklinks)}
                    </td>

                    {/* Suspicious */}
                    <td className="py-3 pr-3 text-sm font-semibold text-amber-600">
                      {formatInt(row.suspiciousBacklinks)}
                    </td>

                    {/* Anchor Risk */}
                    <td className="py-3 pr-3">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
                          riskBadge(risk)
                        )}
                        title={aqs ? `Anchor Quality Score: ${aqs}` : undefined}
                      >
                        {risk === 'High' && <AlertCircle className="h-3.5 w-3.5" />}
                        {risk} {aqs ? <span className="ml-1 text-[11px] font-normal">• AQS {aqs}</span> : null}
                      </span>
                    </td>

                    {/* WR Impact */}
                    <td className="py-3 pr-3">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold',
                          row.wrImpact < 0 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                        )}
                        title="WR Score reduction due to backlinks impacting this page"
                      >
                        {row.wrImpact < 0 ? '−' : '+'}
                        {Math.abs(row.wrImpact).toFixed(1)} pts
                      </span>
                    </td>

                    {/* Referral Traffic */}
                    <td className="py-3 pr-3">
                      <ReferralCell referral={row.referral} onConnect={() => onConnectGA4?.()} />
                    </td>

                    {/* Actions (icon-only with branded hover tips) */}
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <ActionIconButton
                          label="View Page Analyzer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPageAnalyzer?.(row);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </ActionIconButton>
                        <ActionIconButton
                          label="Audit Links"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAuditLinks?.(row);
                          }}
                        >
                          <FileSearch className="h-4 w-4" />
                        </ActionIconButton>
                        <ActionIconButton
                          label="Disavow"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDisavow?.(row);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                        </ActionIconButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="sm:hidden">
        <ul className="divide-y" style={{ borderColor: TOKENS.border }}>
          {rows.map((row) => {
            const risk = anchorRiskLabel(row.anchorRisk);
            const aqs = anchorRiskAqs(row.anchorRisk);
            return (
              <li
                key={row.id}
                className="py-3 cursor-pointer"
                onClick={() => onOpenPageAnalyzer?.(row)}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start gap-2">
                  <ExternalLink className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold" style={{ color: TOKENS.strongText }}>
                      {row.title ?? row.url}
                    </div>
                    {row.title && (
                      <div className="truncate text-[13px]" style={{ color: TOKENS.mutedText }}>
                        {row.url}
                      </div>
                    )}
                    {/* Line 1: Toxic + Anchor Risk */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="font-semibold" style={{ color: TOKENS.danger }}>
                        {formatInt(row.toxicBacklinks)} toxic
                      </span>
                      <span className="text-gray-300">•</span>
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          riskBadge(risk)
                        )}
                        title={aqs ? `AQS ${aqs}` : undefined}
                      >
                        {risk} {aqs ? <span className="ml-1 text-[10px] font-normal">• AQS {aqs}</span> : null}
                      </span>
                    </div>
                    {/* Line 2: WR Impact + Referral Traffic */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
                          row.wrImpact < 0 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                        )}
                        title="WR Score impact from backlinks"
                      >
                        {row.wrImpact < 0 ? '−' : '+'}
                        {Math.abs(row.wrImpact).toFixed(1)} pts
                      </span>
                      <span className="text-gray-300">•</span>
                      <ReferralCell referral={row.referral} onConnect={onConnectGA4} />
                    </div>

                    {/* Actions (keep labels on touch for clarity) */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-[var(--soft)] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPageAnalyzer?.(row);
                        }}
                        style={{
                          color: TOKENS.brand,
                          borderColor: 'color-mix(in oklab, var(--brand) 24%, #0000)',
                          ['--soft' as any]: TOKENS.soft,
                          ['--brand' as any]: TOKENS.brand,
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Page
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-[var(--soft)] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAuditLinks?.(row);
                        }}
                        style={{
                          color: TOKENS.brand,
                          borderColor: 'color-mix(in oklab, var(--brand) 24%, #0000)',
                          ['--soft' as any]: TOKENS.soft,
                          ['--brand' as any]: TOKENS.brand,
                        }}
                      >
                        <FileSearch className="h-3.5 w-3.5" />
                        Audit Links
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDisavow?.(row);
                        }}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Disavow
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer helper / legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: TOKENS.mutedText }}>
        <div className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Toxic Backlinks
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Suspicious Backlinks
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TOKENS.brand }} /> GA4 Connected Metric
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-300" /> 0 Sessions / Not Connected dash “–”
        </div>
      </div>
    </div>
  );
}
