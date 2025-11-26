'use client';

import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink as ExternalLinkIcon,
  Eye,
  ClipboardPlus,
  Pin,
  Link2,
  Clock,
  Info,
  AlertTriangle,
  Undo2,
  Unlink,
  Wrench,
  RefreshCw as RefreshIcon,
} from 'lucide-react';

/**
 * Wranker – Smart Insights (Redesigned)
 * ------------------------------------------------------------------
 * Drop-in React + Tailwind TSX for the "Smart Insights" section.
 * Matches the latest tokens / chip & button patterns used recently.
 * Font: Inter, Inter fallback.
 *
 * Tokens aligned to the Project Overview spec (2025‑08‑21). :contentReference[oaicite:0]{index=0}
 */

/* ----------------------- Design Tokens (latest) ----------------------- */
const TOKENS = {
  surface: 'var(--wr-surface, #FFFFFF)',
  text: 'var(--wr-text, #111827)',
  muted: 'var(--wr-muted, #6B7280)',
  border: 'var(--wr-border, #EFF0F6)',

  brand: 'var(--wr-brand, #008CCD)',
  brandHover: 'var(--wr-brand-hover, #007DB3)',

  valueBlue: 'var(--wr-value-blue, #0077FF)',
  pastelBlue: 'var(--wr-pastel-blue, #D9EEF8)',

  chipBg: 'var(--wr-chip-bg, #F5F7FA)',
  chipHover: 'var(--wr-chip-hover, #E5E7EB)',

  success: 'var(--wr-success, #10B981)',
  successPastel: 'rgba(16,185,129,0.15)',

  warning: 'var(--wr-warning, #F59E0B)',
  warningPastel: 'rgba(245,158,11,0.15)',

  danger: 'var(--wr-danger, #EF4444)',
  dangerPastel: 'rgba(239,68,68,0.15)',

  info: 'var(--wr-info, #3B82F6)',
  infoPastel: 'rgba(59,130,246,0.15)',
} as const;
const RADIUS = 8;
const BORDER = 2;

/* ----------------------- Utilities ----------------------- */
function clsx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}
function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
function formatDateTime(d: Date) {
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ----------------------- Types ----------------------- */
export type HealthInsightKind =
  | 'Lost Links'
  | 'Recovered Links'
  | 'Nofollow Changed'
  | 'Broken (404/410)'
  | 'Redirected'
  | 'Anchor Changed'
  | 'Source Unindexed'
  | 'Newly Verified';

export type InsightSeverity = 'critical' | 'warning' | 'info';

export interface HealthInsight {
  id: string;
  kind: HealthInsightKind;
  title: string;
  reason: string;
  count: number;
  severity: InsightSeverity;
  lastEventAt?: Date;
  sampleDomains?: string[];
  sampleTargets?: string[];
  ai?: boolean;
}

/* ----------------------- Tone helpers (chips) ----------------------- */
function toneChipStyles(tone: 'good' | 'warning' | 'critical' | 'info') {
  switch (tone) {
    case 'good':
      return { bg: TOKENS.successPastel, fg: TOKENS.success };
    case 'warning':
      return { bg: TOKENS.warningPastel, fg: TOKENS.warning };
    case 'critical':
      return { bg: TOKENS.dangerPastel, fg: TOKENS.danger };
    case 'info':
    default:
      return { bg: TOKENS.infoPastel, fg: TOKENS.info };
  }
}
function severityToTone(sev: InsightSeverity): 'critical' | 'warning' | 'info' {
  if (sev === 'critical') return 'critical';
  if (sev === 'warning') return 'warning';
  return 'info';
}
function kindBadge(kind: HealthInsightKind) {
  switch (kind) {
    case 'Lost Links':
      return { label: 'Lost', tone: 'critical' as const, Icon: Unlink };
    case 'Recovered Links':
      return { label: 'Recovered', tone: 'good' as const, Icon: Undo2 };
    case 'Nofollow Changed':
      return { label: 'Nofollow Changed', tone: 'warning' as const, Icon: AlertTriangle };
    case 'Broken (404/410)':
      return { label: 'Broken', tone: 'critical' as const, Icon: Wrench };
    case 'Redirected':
      return { label: 'Redirected', tone: 'info' as const, Icon: RefreshIcon };
    case 'Anchor Changed':
      return { label: 'Anchor Changed', tone: 'info' as const, Icon: Sparkles };
    case 'Source Unindexed':
      return { label: 'Unindexed', tone: 'warning' as const, Icon: AlertTriangle };
    case 'Newly Verified':
    default:
      return { label: 'Newly Verified', tone: 'good' as const, Icon: Sparkles };
  }
}

/* ----------------------- Primitives: Buttons & Chips ----------------------- */
function PrimaryButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex cursor-pointer items-center gap-2 h-9 px-3 text-sm font-medium text-white rounded-md"
      style={{ background: hover ? TOKENS.brandHover : TOKENS.brand }}
    >
      {Icon ? <Icon size={16} /> : null}
      {title}
    </button>
  );
}

function OutlineButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex cursor-pointer items-center gap-2 h-9 px-3 text-sm font-medium rounded-md"
      style={{
        color: TOKENS.text,
        background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        border: `${BORDER}px solid ${TOKENS.border}`,
      }}
    >
      {Icon ? <Icon size={16} className="text-[color:var(--wr-muted,#6B7280)]" /> : null}
      {title}
    </button>
  );
}

function ToneChip({
  label,
  tone,
  icon: Icon,
}: {
  label: string;
  tone: 'good' | 'warning' | 'critical' | 'info';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  const { bg, fg } = toneChipStyles(tone);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium"
      style={{ background: bg, color: fg }}
    >
      {Icon ? <Icon size={12} /> : null}
      {label}
    </span>
  );
}

/* ----------------------- Header Chips ----------------------- */
function AccessChip({ label = 'All' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium"
      style={{ background: TOKENS.chipBg, border: `${BORDER}px solid ${TOKENS.border}`, color: TOKENS.text }}
      title="Project Access Type"
    >
      <ShieldCheck size={14} color={TOKENS.brand} />
      {label}
    </span>
  );
}

function DomainChip({ domain }: { domain?: string }) {
  if (!domain) return null;
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[12px] font-medium"
      style={{ background: TOKENS.chipBg, border: `${BORDER}px solid ${TOKENS.border}`, color: TOKENS.text }}
      title={domain}
    >
      <img src={src} alt="" className="h-4 w-4 rounded-sm" />
      {domain}
    </span>
  );
}

/* ----------------------- Card ----------------------- */
function InsightCard({
  insight,
  onInvestigate,
  onTask,
  onPinToggle,
  pinned = false,
}: {
  insight: HealthInsight;
  onInvestigate?: (i: HealthInsight) => void;
  onTask?: (i: HealthInsight) => void;
  onPinToggle?: (i: HealthInsight) => void;
  pinned?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const badge = kindBadge(insight.kind);
  const sevTone = severityToTone(insight.severity);

  return (
    <div
      className={clsx(
        'relative flex flex-col rounded-md border bg-white shadow-sm transition-transform focus-within:ring-2',
        hover ? '-translate-y-[2px]' : ''
      )}
      style={{
        borderColor: TOKENS.border,
        background: TOKENS.surface,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Pin & AI */}
      <div className="absolute right-2 top-2 flex items-center gap-2">
        {insight.ai && <ToneChip label="AI" tone="info" icon={Sparkles} />}
        <button
          title={pinned ? 'Unpin this insight' : 'Pin this insight'}
          onClick={() => onPinToggle?.(insight)}
          className={clsx(
            'grid place-items-center size-7 rounded-md border cursor-pointer',
            pinned ? 'bg-[rgba(245,158,11,0.15)] text-[color:var(--wr-warning,#F59E0B)]' : 'bg-[var(--wr-chip-bg,#F5F7FA)]'
          )}
          style={{ borderColor: TOKENS.border }}
        >
          <Pin size={14} />
        </button>
      </div>

      {/* Header chips */}
      <div className="flex items-center gap-2 px-4 pt-4">
        <ToneChip label={insight.severity === 'critical' ? 'Critical' : insight.severity === 'warning' ? 'Warning' : 'Info'} tone={sevTone} />
        <ToneChip label={badge.label} tone={badge.tone} icon={badge.Icon} />
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <h3 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
          {insight.title}
        </h3>
        <p className="mt-1 text-[13px]" style={{ color: TOKENS.muted }}>
          Reason: {insight.reason}
        </p>

        {/* Metrics */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-[13px]" style={{ color: TOKENS.text }}>
          <div className="flex items-center gap-1">
            <Link2 size={16} className="text-[color:var(--wr-muted,#6B7280)]" />
            <span>{formatCount(insight.count)} affected</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={16} className="text-[color:var(--wr-muted,#6B7280)]" />
            <span>{insight.lastEventAt ? formatDateTime(insight.lastEventAt) : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Info size={16} className="text-[color:var(--wr-muted,#6B7280)]" />
            <span title={(insight.sampleDomains || []).join(', ')}>
              {insight.sampleDomains?.length ? `${insight.sampleDomains.length} domain(s)` : 'Context'}
            </span>
          </div>
        </div>

        {/* Samples */}
        {(insight.sampleTargets?.length || insight.sampleDomains?.length) && (
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-wide" style={{ color: TOKENS.muted }}>
              Samples
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(insight.sampleTargets || []).slice(0, 3).map((t, i) => (
                <span
                  key={`t-${i}`}
                  className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px]"
                  style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                  title={t}
                >
                  {t}
                </span>
              ))}
              {(insight.sampleDomains || []).slice(0, 3).map((d, i) => (
                <span
                  key={`d-${i}`}
                  className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px]"
                  style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                  title={d}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer CTAs */}
      <div className="px-4 pb-4 pt-2 flex items-center gap-2">
        <PrimaryButton title="Investigate" onClick={() => onInvestigate?.(insight)} icon={Eye} />
        <OutlineButton title="Create Task" onClick={() => onTask?.(insight)} icon={ClipboardPlus} />
      </div>
    </div>
  );
}

/* ----------------------- Main Section ----------------------- */
export function SmartHealthInsights({
  insights,
  maxVisible = 6,
  onInvestigate,
  onCreateTask,
  onRefresh,
  onViewAll,
  projectDomain,
  projectAccessLabel = 'All',
}: {
  insights: HealthInsight[];
  maxVisible?: number;
  onInvestigate?: (i: HealthInsight) => void;
  onCreateTask?: (i: HealthInsight) => void;
  onRefresh?: () => void;
  onViewAll?: () => void;
  /** Optional: domain for header chip with favicon */
  projectDomain?: string;
  /** Optional: access label for header chip (e.g., "My Projects", "Shared", "All") */
  projectAccessLabel?: string;
}) {
  const [pinned, setPinned] = useState<string[]>([]);
  const togglePin = (i: HealthInsight) =>
    setPinned((prev) => (prev.includes(i.id) ? prev.filter((id) => id !== i.id) : [...prev, i.id]));

  // Sorting: pinned → severity → count → lastEventAt
  const sorted = useMemo(() => {
    const sevScore = (s: InsightSeverity) => (s === 'critical' ? 3 : s === 'warning' ? 2 : 1);
    const list = insights.slice().sort((a, b) => {
      const pinA = pinned.includes(a.id) ? 1 : 0;
      const pinB = pinned.includes(b.id) ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      const sev = sevScore(b.severity) - sevScore(a.severity);
      if (sev !== 0) return sev;
      const cnt = (b.count ?? 0) - (a.count ?? 0);
      if (cnt !== 0) return cnt;
      const at = (b.lastEventAt?.getTime() || 0) - (a.lastEventAt?.getTime() || 0);
      return at;
    });
    return list;
  }, [insights, pinned]);

  const visible = sorted.slice(0, maxVisible);
  const hasOverflow = sorted.length > maxVisible;

  return (
    <section
      aria-label="Smart Insights"
      className="mx-auto w-full px-5 py-2"
      style={{
        color: TOKENS.text,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="grid size-9 place-items-center rounded-md"
            style={{ background: TOKENS.pastelBlue, border: `${BORDER}px solid ${TOKENS.border}` }}
            aria-hidden
          >
            <Sparkles size={18} color={TOKENS.brand} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[18px] md:text-[20px] font-semibold truncate" style={{ color: TOKENS.text }}>
              Smart Insights
            </h2>
            <p className="text-[13px] truncate" style={{ color: TOKENS.muted }}>
              Live highlights: lost links, changes, broken/redirected sources, recoveries and more.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <AccessChip label={projectAccessLabel} />
          <DomainChip domain={projectDomain} />
          <OutlineButton title="Refresh Insights" icon={RefreshCw} onClick={onRefresh} />
        </div>
      </div>

      {/* Grid (md+) */}
      <div className="mt-4 hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visible.map((i) => (
          <InsightCard
            key={i.id}
            insight={i}
            pinned={pinned.includes(i.id)}
            onPinToggle={togglePin}
            onInvestigate={onInvestigate}
            onTask={onCreateTask}
          />
        ))}
      </div>

      {/* Mobile carousel */}
      <div className="sm:hidden mt-4 overflow-x-auto">
        <div className="flex gap-3 snap-x snap-mandatory pr-2">
          {visible.map((i) => (
            <div key={i.id} className="snap-start min-w-[86%]">
              <InsightCard
                insight={i}
                pinned={pinned.includes(i.id)}
                onPinToggle={togglePin}
                onInvestigate={onInvestigate}
                onTask={onCreateTask}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer action */}
      <div className="mt-4 flex items-center justify-center">
        {hasOverflow && (
          <button
            type="button"
            className="inline-flex items-center gap-2 text-[13px] font-medium rounded-md border px-3 py-1.5 hover:bg-[color:var(--wr-chip-hover,#E5E7EB)] cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text, background: TOKENS.chipBg }}
            onClick={onViewAll}
            title="View All Insights"
          >
            <ExternalLinkIcon size={16} />
            View All Insights
          </button>
        )}
      </div>
    </section>
  );
}

/* ----------------------- Demo (self-contained) ----------------------- */
const demoInsights: HealthInsight[] = [
  {
    id: 'i1',
    kind: 'Lost Links',
    title: 'Spike in Lost Links (last 7 days)',
    reason: 'Links removed or pages 404 from 12 domains',
    count: 32,
    severity: 'critical',
    lastEventAt: new Date(),
    sampleDomains: ['bloghub.site', 'promo-x.net', 'newsweekly.co'],
    sampleTargets: ['/blog/seo-trends', '/services/seo'],
    ai: true,
  },
  {
    id: 'i2',
    kind: 'Nofollow Changed',
    title: '12 dofollow → nofollow changes detected',
    reason: 'Policy update on 5 source sites',
    count: 12,
    severity: 'warning',
    lastEventAt: new Date(),
    sampleDomains: ['techdaily.org', 'greenplanetnews.co'],
    ai: true,
  },
  {
    id: 'i3',
    kind: 'Broken (404/410)',
    title: 'Broken linking pages found',
    reason: 'Source URLs now return 404/410',
    count: 7,
    severity: 'critical',
    lastEventAt: new Date(),
    sampleDomains: ['startupdigestpro.com'],
    sampleTargets: ['/case-studies/abc-tech'],
  },
  {
    id: 'i4',
    kind: 'Redirected',
    title: 'Links redirected to different pages',
    reason: '301 redirects on referring pages',
    count: 9,
    severity: 'warning',
    lastEventAt: new Date(),
    sampleDomains: ['markettrendwatch.org'],
  },
  {
    id: 'i5',
    kind: 'Recovered Links',
    title: 'Previously lost links recovered',
    reason: 'Source pages restored or recrawled',
    count: 14,
    severity: 'info',
    lastEventAt: new Date(),
    sampleDomains: ['digitalgrowthzone.net'],
  },
  {
    id: 'i6',
    kind: 'Anchor Changed',
    title: 'Anchor text changed on existing links',
    reason: 'Potential optimization or editorial edits',
    count: 5,
    severity: 'info',
    lastEventAt: new Date(),
    sampleTargets: ['/tools/keyword-analyzer'],
  },
  {
    id: 'i7',
    kind: 'Source Unindexed',
    title: 'Linking pages not indexed',
    reason: 'Noindex or removed from search',
    count: 4,
    severity: 'warning',
    lastEventAt: new Date(),
  },
  {
    id: 'i8',
    kind: 'Newly Verified',
    title: 'Newly verified live links',
    reason: 'Manual tracker items confirmed',
    count: 18,
    severity: 'info',
    lastEventAt: new Date(),
  },
];

export default function SmartInsightsDemo() {
  const [toast, setToast] = useState<string | null>(null);
  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1000);
  };

  return (
    // <div className="min-h-screen bg-white">
    //   {/* Brand bar */}
    //   <div className="w-full px-6 py-4 border-b" style={{ borderColor: TOKENS.border }}>
    //     <div className="mx-auto max-w-6xl flex items-center justify-between">
    //       <div className="flex items-center gap-3">
    //         <div
    //           className="h-8 w-8 rounded-md"
    //           style={{ background: TOKENS.pastelBlue, border: `${BORDER}px solid ${TOKENS.border}` }}
    //         />
    //         <span className="font-semibold">Wranker – Smart Insights (Demo)</span>
    //       </div>
    //       <div className="text-sm" style={{ color: TOKENS.muted }}>
    //         Extracted Smart Insights Section
    //       </div>
    //     </div>
    //   </div>

    //   <SmartHealthInsights
    //     insights={demoInsights}
    //     projectDomain="wranker.com"
    //     projectAccessLabel="All"
    //     onRefresh={() => flash('Refresh Insights')}
    //     onViewAll={() => flash('View All Insights')}
    //     onInvestigate={(i) => flash(`Investigate: ${i.title}`)}
    //     onCreateTask={(i) => flash(`Task from insight: ${i.title}`)}
    //   />

    //   <main className="mx-auto max-w-6xl px-6 py-10 text-sm" style={{ color: TOKENS.muted }}>
    //     <p>Below this, you can render any panel content (filters, KPIs, tables) as needed for your page.</p>
    //     <div className="h-[360px]" />
    //   </main>

    //   {toast && (
    //     <div
    //       className="fixed bottom-4 right-4 shadow-lg rounded-md px-3 py-2 text-sm"
    //       style={{ background: TOKENS.text, color: 'white' }}
    //     >
    //       {toast}
    //     </div>
    //   )}
    // </div>

          <SmartHealthInsights
        insights={demoInsights}
        projectDomain="wranker.com"
        projectAccessLabel="All"
        onRefresh={() => flash('Refresh Insights')}
        onViewAll={() => flash('View All Insights')}
        onInvestigate={(i) => flash(`Investigate: ${i.title}`)}
        onCreateTask={(i) => flash(`Task from insight: ${i.title}`)}
      />
  );
}
