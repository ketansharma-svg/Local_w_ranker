'use client';

import React, { useMemo, useState } from 'react';
import {
  Globe2,
  ExternalLink,
  Eye,
  Shield,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  Info,
  Link2,
  Filter,
  FileDown,
  X,
} from 'lucide-react';

/* ========================================================================
   Top Risky Referring Domains Table (Section 7) — Redesigned
   - TailwindCSS only; Inter / Inter Fallback fonts
   - Uses design tokens via CSS variables with safe fallbacks
   - Branded (#008CCD) icons for header + action types
   - Modern Chips + Filters button row
   - Export CSV action in the section header
   - GA4-aware "Referral Traffic" column with tooltip + Connect CTA
   - Row click opens domain drawer via onOpenDomain callback
   - Small-screen responsive: key columns visible, the rest hide/wrap
   ======================================================================== */

/** Types */
type AnchorRisk = 'high' | 'medium' | 'low';
type DisavowStatus = 'disavowed' | 'pending' | 'not_disavowed';
type GA4State = 'connected' | 'connected_no_data' | 'not_connected';

export type TopDomainRow = {
  domain: string;
  wrScore: number; // 0–100
  toxicBacklinks: number;
  anchorRisk: AnchorRisk;
  ga4: { state: GA4State; sessions?: number | null };
  disavow: DisavowStatus;
};

type Props = {
  rows?: TopDomainRow[];
  /** Callbacks for routing / drawers */
  onOpenDomain?: (domain: string) => void; // row click
  onViewLinks?: (domain: string) => void; // actions → View
  onDisavow?: (domain: string) => void; // actions → Disavow
  onConnectGA4?: () => void; // GA4 CTA
  onExport?: (visibleRows: TopDomainRow[]) => void; // optional override for export
  className?: string;
  title?: string; // optional section title
  subtitle?: string; // optional subtitle
};

/* ---- helpers ---------------------------------------------------------- */

/** WR color tokens (use CSS vars with safe fallbacks) */
const WR_COLORS = {
  excellent: 'bg-[var(--success-600,#059669)]',
  good: 'bg-[var(--info-600,#0284C7)]',
  moderate: 'bg-[var(--warning-500,#F59E0B)]',
  weak: 'bg-[var(--danger-600,#DC2626)]',
};

function wrBadgeColor(score: number) {
  if (score >= 81) return WR_COLORS.excellent;
  if (score >= 61) return WR_COLORS.good;
  if (score >= 41) return WR_COLORS.moderate;
  return WR_COLORS.weak;
}

function wrBadgeLabel(score: number) {
  if (score >= 81) return 'Excellent';
  if (score >= 61) return 'Very Good';
  if (score >= 41) return 'Moderate';
  if (score >= 21) return 'Weak';
  return 'Toxic';
}

function riskChip(risk: AnchorRisk) {
  switch (risk) {
    case 'high':
      return {
        label: 'High',
        className:
          'text-[var(--danger-700,#B91C1C)] border-[var(--danger-200,#FECACA)] bg-[var(--danger-50,#FEF2F2)]',
      };
    case 'medium':
      return {
        label: 'Medium',
        className:
          'text-[var(--warning-800,#92400E)] border-[var(--warning-200,#FDE68A)] bg-[var(--warning-50,#FFFBEB)]',
      };
    default:
      return {
        label: 'Low',
        className:
          'text-[var(--success-800,#065F46)] border-[var(--success-200,#BBF7D0)] bg-[var(--success-50,#ECFDF5)]',
      };
  }
}

function disavowChip(status: DisavowStatus) {
  switch (status) {
    case 'disavowed':
      return {
        label: 'Disavowed',
        className:
          'text-[var(--success-800,#065F46)] bg-[var(--success-50,#ECFDF5)] border-[var(--success-200,#BBF7D0)]',
      };
    case 'pending':
      return {
        label: 'Pending',
        className:
          'text-[var(--warning-800,#92400E)] bg-[var(--warning-50,#FFFBEB)] border-[var(--warning-200,#FDE68A)]',
      };
    default:
      return {
        label: 'Not Disavowed',
        className:
          'text-[var(--text-secondary,#475569)] bg-[var(--surface-subtle,#F8FAFC)] border-[var(--border,#E5E7EB)]',
      };
  }
}

const fmt = (n: number) => n.toLocaleString();

/* very light-weight tooltip */
function Tooltip({
  children,
  content,
  className,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          className={[
            'absolute left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap',
            'rounded-md border border-[var(--border,#E5E7EB)] bg-[var(--surface-elevated,#FFFFFF)] px-2.5 py-1.5 text-xs',
            'shadow-lg text-[var(--text-secondary,#475569)]',
            className ?? '',
          ].join(' ')}
        >
          {content}
        </div>
      )}
    </span>
  );
}

function Favicon({ domain }: { domain: string }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  return <img src={src} alt="" className="h-5 w-5 rounded-sm" />;
}

/* sort utility */
type SortKey = 'domain' | 'wrScore' | 'toxicBacklinks' | 'anchorRisk' | 'sessions' | 'disavow';
type SortDir = 'asc' | 'desc';

/* Filters */
type QuickFilterKey = 'highRisk' | 'pendingDisavow' | 'ga4Connected' | 'toxicGt10';

/* ---- default sample rows (safe placeholder) --------------------------- */
const DEFAULT_ROWS: TopDomainRow[] = [
  {
    domain: 'backlinkhub.info',
    wrScore: 14,
    toxicBacklinks: 18,
    anchorRisk: 'high',
    ga4: { state: 'connected', sessions: 1284 },
    disavow: 'not_disavowed',
  },
  {
    domain: 'spamzone.xyz',
    wrScore: 8,
    toxicBacklinks: 10,
    anchorRisk: 'medium',
    ga4: { state: 'connected', sessions: 20 },
    disavow: 'pending',
  },
  {
    domain: 'bestoffers.biz',
    wrScore: 32,
    toxicBacklinks: 9,
    anchorRisk: 'medium',
    ga4: { state: 'connected_no_data', sessions: 0 },
    disavow: 'disavowed',
  },
  {
    domain: 'coupon-galaxy.top',
    wrScore: 19,
    toxicBacklinks: 7,
    anchorRisk: 'high',
    ga4: { state: 'not_connected', sessions: null },
    disavow: 'not_disavowed',
  },
];

/* =========================================================================
   Component
   ========================================================================= */
export default function TopRiskyRefDomainsTable({
  rows = DEFAULT_ROWS,
  onOpenDomain,
  onViewLinks,
  onDisavow,
  onConnectGA4,
  onExport,
  className,
  title = 'Top Risky Referring Domains',
  subtitle = 'Most dangerous ref domains (risk vs. referral value)',
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('toxicBacklinks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filters UI state
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilters, setQuickFilters] = useState<Record<QuickFilterKey, boolean>>({
    highRisk: false,
    pendingDisavow: false,
    ga4Connected: false,
    toxicGt10: false,
  });

  const toggleQuick = (key: QuickFilterKey) =>
    setQuickFilters((s) => ({ ...s, [key]: !s[key] }));

  const sorted = useMemo(() => {
    const clone = [...rows];
    clone.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      const getSessions = (r: TopDomainRow) =>
        r.ga4.state === 'connected' || r.ga4.state === 'connected_no_data'
          ? (r.ga4.sessions ?? 0)
          : -1; // not connected sorts last

      const valA =
        sortKey === 'domain'
          ? a.domain
          : sortKey === 'wrScore'
          ? a.wrScore
          : sortKey === 'toxicBacklinks'
          ? a.toxicBacklinks
          : sortKey === 'anchorRisk'
          ? a.anchorRisk === 'high'
            ? 3
            : a.anchorRisk === 'medium'
            ? 2
            : 1
          : sortKey === 'sessions'
          ? getSessions(a)
          : sortKey === 'disavow'
          ? a.disavow === 'disavowed'
            ? 3
            : a.disavow === 'pending'
            ? 2
            : 1
          : 0;

      const valB =
        sortKey === 'domain'
          ? b.domain
          : sortKey === 'wrScore'
          ? b.wrScore
          : sortKey === 'toxicBacklinks'
          ? b.toxicBacklinks
          : sortKey === 'anchorRisk'
          ? b.anchorRisk === 'high'
            ? 3
            : b.anchorRisk === 'medium'
            ? 2
            : 1
          : sortKey === 'sessions'
          ? getSessions(b)
          : sortKey === 'disavow'
          ? b.disavow === 'disavowed'
            ? 3
            : b.disavow === 'pending'
            ? 2
            : 1
          : 0;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * dir;
      }
      return ((valA as number) - (valB as number)) * dir;
    });
    return clone;
  }, [rows, sortDir, sortKey]);

  const filtered = useMemo(() => {
    return sorted.filter((r) => {
      if (quickFilters.highRisk && r.anchorRisk !== 'high') return false;
      if (quickFilters.pendingDisavow && r.disavow !== 'pending') return false;
      if (quickFilters.ga4Connected && r.ga4.state === 'not_connected') return false;
      if (quickFilters.toxicGt10 && !(r.toxicBacklinks > 10)) return false;
      return true;
    });
  }, [sorted, quickFilters]);

  const setSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'domain' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === 'asc' ? (
        <ChevronUp className="ml-1 h-4 w-4 text-[var(--text-muted,#94A3B8)]" />
      ) : (
        <ChevronDown className="ml-1 h-4 w-4 text-[var(--text-muted,#94A3B8)]" />
      )
    ) : null;

  const brandIconClass = 'text-[var(--brand-600,#008CCD)]';

  const handleExport = () => {
    if (onExport) return onExport(filtered);
    // Default CSV export
    const headers = [
      'Domain',
      'WR Score',
      'Toxic Backlinks',
      'Anchor Risk',
      'GA4 State',
      'Sessions',
      'Disavow Status',
    ];
    const rowsCsv = filtered.map((r) =>
      [
        r.domain,
        r.wrScore,
        r.toxicBacklinks,
        r.anchorRisk,
        r.ga4.state,
        r.ga4.sessions ?? '',
        r.disavow,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), ...rowsCsv].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'top-risky-referring-domains.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className={['w-full', className ?? ''].join(' ')}
      style={{
        fontFamily:
          'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-50,#E6F5FB)]">
            <ShieldAlert className={`h-5 w-5 ${brandIconClass}`} />
          </div>
          <div>
            <h3 className="text-[17px] font-semibold text-[var(--text-primary,#0F172A)]">
              {title}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--text-secondary,#475569)]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={[
                'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium',
                'border-[var(--border,#E5E7EB)] bg-[var(--surface-elevated,#FFFFFF)]',
                'text-[var(--text-primary,#0F172A)] hover:bg-[var(--surface-subtle,#F8FAFC)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600,#008CCD)]',
                'cursor-pointer',
              ].join(' ')}
              aria-expanded={showFilters}
            >
              <Filter className={`h-4 w-4 ${brandIconClass}`} />
              Filters
            </button>

            {showFilters && (
              <div
                className={[
                  'absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border',
                  'border-[var(--border,#E5E7EB)] bg-[var(--surface-elevated,#FFFFFF)] shadow-xl',
                ].join(' ')}
              >
                <div className="p-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted,#64748B)]">
                    Quick Filters
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      active={quickFilters.highRisk}
                      onClick={() => toggleQuick('highRisk')}
                      label="High Risk"
                    />
                    <Chip
                      active={quickFilters.pendingDisavow}
                      onClick={() => toggleQuick('pendingDisavow')}
                      label="Pending Disavow"
                    />
                    <Chip
                      active={quickFilters.ga4Connected}
                      onClick={() => toggleQuick('ga4Connected')}
                      label="GA4 Connected"
                    />
                    <Chip
                      active={quickFilters.toxicGt10}
                      onClick={() => toggleQuick('toxicGt10')}
                      label="Toxic &gt; 10"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[var(--border,#E5E7EB)] bg-[var(--surface-subtle,#F8FAFC)] px-3 py-2">
                  <button
                    className="text-xs font-medium text-[var(--text-secondary,#475569)] hover:underline cursor-pointer"
                    onClick={() =>
                      setQuickFilters({
                        highRisk: false,
                        pendingDisavow: false,
                        ga4Connected: false,
                        toxicGt10: false,
                      })
                    }
                  >
                    Reset
                  </button>
                  <button
                    className={[
                      'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold',
                      'border-[var(--brand-200,#BDE8F7)] bg-[var(--brand-50,#E6F5FB)]',
                      'text-[var(--brand-700,#0369A1)] hover:bg-[var(--brand-100,#CCEFFD)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600,#008CCD)]',
                      'cursor-pointer',
                    ].join(' ')}
                    onClick={() => setShowFilters(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className={[
              'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold',
              'border-[var(--brand-200,#BDE8F7)] bg-[var(--brand-50,#E6F5FB)]',
              'text-[var(--brand-700,#0369A1)] hover:bg-[var(--brand-100,#CCEFFD)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600,#008CCD)]',
              'cursor-pointer',
            ].join(' ')}
            title="Export CSV"
          >
            <FileDown className={`h-4 w-4 ${brandIconClass}`} />
            Export
          </button>
        </div>
      </div>

      {/* Quick chips row (latest/modern chips) */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Chip
          active={quickFilters.highRisk}
          onClick={() => toggleQuick('highRisk')}
          label="High Risk"
        />
        <Chip
          active={quickFilters.pendingDisavow}
          onClick={() => toggleQuick('pendingDisavow')}
          label="Pending Disavow"
        />
        <Chip
          active={quickFilters.ga4Connected}
          onClick={() => toggleQuick('ga4Connected')}
          label="GA4 Connected"
        />
        <Chip
          active={quickFilters.toxicGt10}
          onClick={() => toggleQuick('toxicGt10')}
          label="Toxic &gt; 10"
        />
      </div>

      {/* Table container */}
      <div
        className={[
          'overflow-hidden rounded-xl border shadow-sm',
          'border-[var(--border,#E5E7EB)] bg-[var(--surface-elevated,#FFFFFF)]',
        ].join(' ')}
      >
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="bg-[var(--surface-subtle,#F8FAFC)] text-xs uppercase tracking-wide text-[var(--text-muted,#64748B)]">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <button
                    className="inline-flex items-center cursor-pointer hover:underline underline-offset-4"
                    onClick={() => setSort('domain')}
                  >
                    <span className="mr-1">Domain</span>
                    <SortIcon k="domain" />
                  </button>
                </th>
                <th className="px-3 py-3 font-medium w-[110px]">
                  <button
                    className="inline-flex items-center cursor-pointer hover:underline underline-offset-4"
                    onClick={() => setSort('wrScore')}
                  >
                    <span className="mr-1">WR</span>
                    <SortIcon k="wrScore" />
                  </button>
                </th>
                <th className="px-3 py-3 font-medium w-[140px]">
                  <button
                    className="inline-flex items-center cursor-pointer hover:underline underline-offset-4"
                    onClick={() => setSort('toxicBacklinks')}
                  >
                    <span className="mr-1">Toxic Backlinks</span>
                    <SortIcon k="toxicBacklinks" />
                  </button>
                </th>
                <th className="px-3 py-3 font-medium w-[130px]">
                  <button
                    className="inline-flex items-center cursor-pointer hover:underline underline-offset-4"
                    onClick={() => setSort('anchorRisk')}
                  >
                    <span className="mr-1">Anchor Risk</span>
                    <SortIcon k="anchorRisk" />
                  </button>
                </th>
                {/* Referral Traffic (GA4) */}
                <th className="px-3 py-3 font-medium w-[170px]">
                  <button
                    className="inline-flex items-center cursor-pointer hover:underline underline-offset-4"
                    onClick={() => setSort('sessions')}
                  >
                    <span className="mr-1">Referral Traffic</span>
                    <Info className="ml-1 h-4 w-4 text-[var(--text-muted,#94A3B8)]" />
                    <SortIcon k="sessions" />
                  </button>
                </th>
                <th className="px-3 py-3 font-medium w-[160px]">
                  <button
                    className="inline-flex items-center cursor-pointer hover:underline underline-offset-4"
                    onClick={() => setSort('disavow')}
                  >
                    <span className="mr-1">Disavow Status</span>
                    <SortIcon k="disavow" />
                  </button>
                </th>
                <th className="px-3 py-3 font-medium w-[180px]">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border,#E5E7EB)] text-sm">
              {filtered.map((r) => {
                const wrColor = wrBadgeColor(r.wrScore);
                const wrLabel = wrBadgeLabel(r.wrScore);
                const risk = riskChip(r.anchorRisk);
                const dis = disavowChip(r.disavow);

                /* GA4 cell render */
                const ga4Cell = (() => {
                  if (r.ga4.state === 'connected') {
                    const sessions = Math.max(0, r.ga4.sessions ?? 0);
                    return (
                      <Tooltip
                        content={
                          <span>
                            This domain referred <strong>{fmt(sessions)}</strong> sessions in the last 30
                            days.
                          </span>
                        }
                      >
                        <span className="font-medium text-[var(--brand-600,#008CCD)]">
                          {fmt(sessions)} sessions
                        </span>
                      </Tooltip>
                    );
                  }
                  if (r.ga4.state === 'connected_no_data') {
                    return (
                      <Tooltip content="No referral traffic recorded from this domain recently.">
                        <span className="text-[var(--text-muted,#94A3B8)]">0 sessions</span>
                      </Tooltip>
                    );
                  }
                  // not connected
                  return (
                    <div className="flex items-center gap-2">
                      <Tooltip content="Referral traffic not available. Connect GA4 to enable this metric.">
                        <span className="text-[var(--text-muted,#94A3B8)]">—</span>
                      </Tooltip>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConnectGA4?.();
                        }}
                        className={[
                          'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium',
                          'border-[var(--brand-200,#BDE8F7)] text-[var(--brand-700,#0369A1)]',
                          'bg-[var(--brand-50,#E6F5FB)] hover:bg-[var(--brand-100,#CCEFFD)]',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600,#008CCD)]',
                          'cursor-pointer',
                        ].join(' ')}
                        title="Connect Google Analytics 4"
                      >
                        Connect GA4
                      </button>
                    </div>
                  );
                })();

                return (
                  <tr
                    key={r.domain}
                    className="hover:bg-[var(--surface-subtle,#F8FAFC)] cursor-pointer"
                    onClick={() => onOpenDomain?.(r.domain)}
                  >
                    {/* DOMAIN */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Favicon domain={r.domain} />
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary,#0F172A)]">
                            {r.domain}
                          </span>
                          <a
                            href={`https://${r.domain}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[var(--text-muted,#94A3B8)] hover:text-[var(--text-secondary,#475569)] cursor-pointer"
                            aria-label="Open domain"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* WR SCORE */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${wrColor}`} />
                        <span className="font-semibold text-[var(--text-primary,#0F172A)]">
                          {r.wrScore}
                        </span>
                        <span className="ml-1 rounded-full bg-[var(--surface-subtle,#F1F5F9)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary,#475569)]">
                          {wrLabel}
                        </span>
                      </div>
                    </td>

                    {/* TOXIC BACKLINKS */}
                    <td className="px-3 py-3">
                      <span className="font-medium text-[var(--text-primary,#0F172A)]">
                        {fmt(r.toxicBacklinks)}
                      </span>
                    </td>

                    {/* ANCHOR RISK */}
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${risk.className}`}
                      >
                        <ShieldAlert className="mr-1 h-3.5 w-3.5 text-[var(--brand-600,#008CCD)]" />
                        {risk.label}
                      </span>
                    </td>

                    {/* GA4 REFERRAL TRAFFIC */}
                    <td className="px-3 py-3">{ga4Cell}</td>

                    {/* DISAVOW STATUS */}
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${dis.className}`}
                      >
                        <Shield className="mr-1 h-3.5 w-3.5 text-[var(--brand-600,#008CCD)]" />
                        {dis.label}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewLinks?.(r.domain);
                          }}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                            'border-[var(--border,#E5E7EB)] text-[var(--text-secondary,#475569)]',
                            'bg-[var(--surface-elevated,#FFFFFF)] hover:bg-[var(--surface-subtle,#F8FAFC)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600,#008CCD)]',
                            'cursor-pointer',
                          ].join(' ')}
                          title="View Links from this domain"
                        >
                          <Eye className={`h-3.5 w-3.5 ${brandIconClass}`} />
                          View
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDomain?.(r.domain);
                          }}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                            'border-[var(--border,#E5E7EB)] text-[var(--text-secondary,#475569)]',
                            'bg-[var(--surface-elevated,#FFFFFF)] hover:bg-[var(--surface-subtle,#F8FAFC)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600,#008CCD)]',
                            'cursor-pointer',
                          ].join(' ')}
                          title="Open Domain Drawer"
                        >
                          <Globe2 className={`h-3.5 w-3.5 ${brandIconClass}`} />
                          Open
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDisavow?.(r.domain);
                          }}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold',
                            'bg-[var(--danger-600,#DC2626)] text-white hover:bg-[var(--danger-700,#B91C1C)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600,#008CCD)]',
                            'cursor-pointer',
                          ].join(' ')}
                          title="Add to Disavow"
                        >
                          <Link2 className="h-3.5 w-3.5 rotate-45" />
                          Disavow
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile hint */}
        <div className="block border-t border-[var(--border,#E5E7EB)] px-4 py-2 text-xs text-[var(--text-muted,#64748B)] sm:hidden">
          Tip: tap a row to open the Referring Domain drawer. Swipe table horizontally to see all
          columns.
        </div>
      </div>
    </section>
  );
}

/* ============================== */
/* UI Elements: Modern Chip */
/* ============================== */
function Chip({
  active,
  onClick,
  label,
}: {
  active?: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-[var(--brand-200,#BDE8F7)] bg-[var(--brand-50,#E6F5FB)] text-[var(--brand-700,#0369A1)]'
          : 'border-[var(--chip-border,var(--border,#E5E7EB))] bg-[var(--chip-bg,#FFFFFF)] text-[var(--text-secondary,#475569)] hover:bg-[var(--surface-subtle,#F8FAFC)]',
        'shadow-[0_0_0_1px_rgba(15,23,42,0.02)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600,#008CCD)]',
        'cursor-pointer select-none',
      ].join(' ')}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--brand-600,#008CCD)]" />
      {label}
      {active && <X className="ml-0.5 h-3 w-3 text-[var(--brand-600,#008CCD)]" />}
    </button>
  );
}
