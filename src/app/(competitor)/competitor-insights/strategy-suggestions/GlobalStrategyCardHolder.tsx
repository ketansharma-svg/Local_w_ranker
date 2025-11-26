'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, ArrowRight, Plus, Star, Link2, BarChart3, Wrench, FileText, Lightbulb,
  ChevronLeft, ChevronRight
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   Global Strategy Card Holder (floating section)
   - Shows up to 4 high-priority, not-dismissed suggestions (synced from Tab 6)
   - Horizontal scroller, desktop prev/next arrows, mobile swipe
   - Per-card dismiss + Hide All
   - "View All Recommendations" CTA (wire to Strategy tab)
   - Drop-in, Tailwind-only (no UI lib)
----------------------------------------------------------------------------- */

type StrategyType = 'serp' | 'links' | 'content' | 'tech' | 'keywords';
type Priority = 'High' | 'Medium' | 'Low';

export type GlobalStrategyCard = {
  id: string;
  type: StrategyType;
  title: string;      // concise headline
  summary: string;    // one or two sentence supporting copy
  priority: Priority;
  source: string;     // "SERP Layout", "Backlink Gap", etc.
  inGlobal?: boolean; // flagged by Strategy tab as currently in global
  dismissedGlobally?: boolean; // if hidden from global view upstream
  ai?: boolean;       // surfaced by AI
  primaryCta?: { label: string; onClick?: (id: string) => void };
  secondaryCta?: { label: string; onClick?: (id: string) => void };
};

export type GlobalStrategyCardHolderProps = {
  project?: string;
  items?: GlobalStrategyCard[];     // raw pool (Strategy tab is source of truth)
  onViewAll?: () => void;           // open Strategy Suggestions tab
  onDismissAll?: () => void;        // optional external persistence
  onDismissCard?: (id: string) => void;
  className?: string;
  hiddenKey?: string;               // localStorage key to persist "Hide All"
};

/* --------------------------- Design tokens --------------------------- */
const TOKENS = {
  brand: '#1090D0',
  border: '#D2EFFF',
  rail: '#EEF7FD',
  text: '#111827',
  muted: '#6B7280',
  white: '#FFFFFF',
  // strategy type colors (top border / icon tint)
  type: {
    serp:   { bar: '#FEC84B', icon: '#B58500' },  // SERP feature insights (yellow)
    links:  { bar: '#3CD856', icon: '#18823A' },  // Link-building (green)
    content:{ bar: '#1090D0', icon: '#0C74A9' },  // Content / CTR (blue)
    tech:   { bar: '#F04438', icon: '#B42318' },  // Technical (red)
    keywords:{ bar: '#A259FF', icon: '#6E30C5' }, // Keyword gap (violet)
  },
};

function iconForType(t: StrategyType, className?: string) {
  switch (t) {
    case 'serp': return <Star className={className} />;
    case 'links': return <Link2 className={className} />;
    case 'content': return <FileText className={className} />;
    case 'tech': return <Wrench className={className} />;
    case 'keywords': return <BarChart3 className={className} />;
    default: return <Lightbulb className={className} />;
  }
}

/* --------------------------- Mock data (demo) --------------------------- */
const MOCK_ITEMS: GlobalStrategyCard[] = [
  {
    id: 'c1',
    type: 'serp',
    title: '12 Featured Snippets Missed',
    summary: 'comp1.com owns 12 FS on keywords you already rank for. Add FAQ/definition blocks to capture intent.',
    priority: 'High',
    source: 'SERP Layout',
    inGlobal: true,
    ai: true,
    primaryCta: { label: 'Add to Task' },
    secondaryCta: { label: 'View Details →' },
  },
  {
    id: 'c2',
    type: 'links',
    title: '24 Competitor‑Only Domains (14 on Vefogix)',
    summary: 'These domains link to your competitors but not you. 14 have verified placements.',
    priority: 'High',
    source: 'Backlink Gap',
    inGlobal: true,
    primaryCta: { label: 'Create Link' },
    secondaryCta: { label: 'View Details →' },
  },
  {
    id: 'c3',
    type: 'content',
    title: '42 Keywords in CTR Dead Zone',
    summary: 'You rank P5–P9 with avg. CTR 4.1%. Improve titles and rich snippets to lift traffic.',
    priority: 'High',
    source: 'Keyword Gap',
    ai: true,
    primaryCta: { label: 'View Keywords' },
    secondaryCta: { label: 'View Details →' },
  },
  {
    id: 'c4',
    type: 'tech',
    title: 'Schema Gaps on Top Pages',
    summary: 'Missing FAQ and Article schema on 9 high‑value URLs. Add to qualify for rich results.',
    priority: 'High',
    source: 'SERP Layout',
    primaryCta: { label: 'Add to Task' },
    secondaryCta: { label: 'View Details →' },
  },
  // Example of a non-High item (won’t show in holder per sync rules)
  {
    id: 'c5',
    type: 'keywords',
    title: 'Topic Coverage: “technical audit”',
    summary: 'Competitors publish deeper guides; add comparison table and internal links.',
    priority: 'Medium',
    source: 'Content Gap',
    primaryCta: { label: 'Add to Task' },
    secondaryCta: { label: 'View Details →' },
    dismissedGlobally: false,
  },
];

/* --------------------------- Utilities --------------------------- */
function priorityRank(p: Priority): number {
  return p === 'High' ? 3 : p === 'Medium' ? 2 : 1;
}

function cx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

/* --------------------------- Single Card --------------------------- */
function StrategyCard({
  item,
  onPrimary,
  onSecondary,
  onDismiss,
}: {
  item: GlobalStrategyCard;
  onPrimary?: (id: string) => void;
  onSecondary?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const colors = TOKENS.type[item.type];
  return (
    <div
      className="group relative flex h-full w-[280px] min-w-[260px] max-w-[320px] flex-col rounded-xl border bg-white p-4 shadow-sm"
      style={{ borderColor: TOKENS.border }}
      role="article"
      aria-label={item.title}
    >
      {/* Type color bar */}
      <div
        className="absolute left-0 top-0 h-1 w-full rounded-t-xl"
        style={{ background: colors.bar }}
        aria-hidden
      />

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onDismiss?.(item.id)}
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Dismiss suggestion"
        title="Dismiss from Global view"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Title row */}
      <div className="mb-2 flex items-center gap-2 pr-8">
        <span
          className="grid size-7 place-items-center rounded-md"
          style={{ background: '#F8FAFC', color: colors.icon, border: '1px solid #EDF2F7' }}
          aria-hidden
        >
          {iconForType(item.type, 'h-4 w-4')}
        </span>
        <h4 className="line-clamp-2 text-sm font-semibold text-gray-900" title={item.title}>
          {item.title}
        </h4>
      </div>

      {/* Summary */}
      <p className="mb-3 line-clamp-3 text-[13px] leading-relaxed text-gray-700" title={item.summary}>
        {item.summary}
      </p>

      {/* Meta row */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
          From: {item.source}
        </span>
        <span
          className={cx(
            'rounded-full px-2 py-0.5 font-semibold',
            item.priority === 'High'
              ? 'bg-red-100 text-red-700'
              : item.priority === 'Medium'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-gray-100 text-gray-700'
          )}
        >
          Priority: {item.priority}
        </span>
        {item.inGlobal && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
            💡 In Global
          </span>
        )}
        {item.ai && (
          <span className="rounded-full bg-purple-50 px-2 py-0.5 font-medium text-purple-700">
            🤖 AI
          </span>
        )}
      </div>

      {/* CTAs */}
      <div className="mt-auto flex items-center gap-2">
        {item.primaryCta && (
          <button
            type="button"
            onClick={() => onPrimary?.(item.id)}
            className="inline-flex items-center rounded-md bg-[color:var(--brand,#1090D0)] px-3 py-1.5 text-sm font-medium text-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={{ ['--brand' as any]: TOKENS.brand }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {item.primaryCta.label}
          </button>
        )}
        {item.secondaryCta && (
          <button
            type="button"
            onClick={() => onSecondary?.(item.id)}
            className="text-sm font-medium text-[color:var(--brand,#1090D0)] hover:underline"
            style={{ ['--brand' as any]: TOKENS.brand }}
          >
            {item.secondaryCta.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Holder Component --------------------------- */
export default function GlobalStrategyCardHolder({
  project = 'mydomain.com',
  items = MOCK_ITEMS,
  onViewAll,
  onDismissAll,
  onDismissCard,
  className,
  hiddenKey = 'wr_global_strategy_holder_hidden',
}: GlobalStrategyCardHolderProps) {
  // Hide-all persisted
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const raw = window.localStorage.getItem(hiddenKey);
    return raw === '1';
  });
  const setHiddenPersist = (v: boolean) => {
    setHidden(v);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(hiddenKey, v ? '1' : '0');
    }
  };
  const railRef = useRef<HTMLDivElement>(null);
    const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // Local dismiss tracking (non-destructive demo)
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  // Sync logic: High priority + not dismissed globally + not locally dismissed
  const curated = useMemo(() => {
    const pool = (items ?? []).filter(
      (it) => it.priority === 'High' && !it.dismissedGlobally && !dismissed[it.id]
    );
    // Sort: inGlobal first, then priority rank (all High), then type alpha as tie-breaker
    pool.sort((a, b) => {
      const ig = (b.inGlobal ? 1 : 0) - (a.inGlobal ? 1 : 0);
      if (ig !== 0) return ig;
      const pr = priorityRank(b.priority) - priorityRank(a.priority);
      if (pr !== 0) return pr;
      return a.type.localeCompare(b.type);
    });
    return pool.slice(0, 4);
  }, [items, dismissed]);
  useEffect(() => {
    updateNav();
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => updateNav();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [curated.length]);
  // Early exit if hidden or nothing to show
  if (hidden || curated.length === 0) return null;

  // Horizontal scroll controls



  const updateNav = () => {
    const el = railRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };



  const scrollBy = (delta: number) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Handlers (demo wiring)
  const handleDismissAll = () => {
    setHiddenPersist(true);
    onDismissAll?.();
  };
  const handleDismissCard = (id: string) => {
    setDismissed((s) => ({ ...s, [id]: true }));
    onDismissCard?.(id);
  };
  const handlePrimary = (id: string) => {
    // route to Task Drawer / Vefogix / etc.
    console.info('Primary CTA:', id);
    // you can wire deeper here…
  };
  const handleSecondary = (id: string) => {
    console.info('Secondary CTA:', id);
    onViewAll?.(); // often goes to Strategy tab highlighting this card
  };

  return (
    <aside
      className={cx(
        'relative mb-4 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 mt-4',
        'border-[color:var(--holder-border,#D2EFFF)]',
        className
      )}
      style={{ ['--holder-border' as any]: TOKENS.border }}
      role="region"
      aria-label="Global Strategy Card Holder"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid size-6 place-items-center rounded-md"
            style={{ background: TOKENS.rail, color: TOKENS.brand, border: `1px solid ${TOKENS.border}` }}
            aria-hidden
          >
            <Lightbulb className="h-4 w-4" />
          </span>
        <h3 className="text-sm font-semibold text-gray-800">
            Smart Strategy Suggestions
          </h3>
          <span className="ml-2 text-xs text-gray-500">
            Top picks for <strong className="font-semibold text-gray-700">{project}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onViewAll}
            className="hidden sm:inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--brand,#1090D0)] hover:bg-gray-50"
            style={{ ['--brand' as any]: TOKENS.brand }}
          >
            View All Recommendations
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleDismissAll}
            className="inline-flex items-center rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            aria-label="Hide all strategy suggestions"
            title="Hide all strategy suggestions"
          >
            ✖ Hide All
          </button>
        </div>
      </div>

      {/* Rail with arrows (desktop) / swipe (mobile) */}
      <div className="relative">
        {/* Prev/Next (desktop only) */}
        <button
          type="button"
          onClick={() => scrollBy(-320)}
          disabled={!canPrev}
          className={cx(
            'absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border bg-white p-2 shadow-sm sm:inline-flex',
            canPrev ? 'opacity-100' : 'opacity-40 cursor-default'
          )}
          aria-label="Scroll left"
          style={{ borderColor: TOKENS.border }}
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <button
          type="button"
          onClick={() => scrollBy(320)}
          disabled={!canNext}
          className={cx(
            'absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border bg-white p-2 shadow-sm sm:inline-flex',
            canNext ? 'opacity-100' : 'opacity-40 cursor-default'
          )}
          aria-label="Scroll right"
          style={{ borderColor: TOKENS.border }}
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>

        {/* Cards rail */}
        <div
          ref={railRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pr-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {curated.map((it) => (
            <StrategyCard
              key={it.id}
              item={it}
              onPrimary={handlePrimary}
              onSecondary={handleSecondary}
              onDismiss={handleDismissCard}
            />
          ))}
        </div>
      </div>

      {/* Mobile "View All" */}
      <div className="mt-3 sm:hidden">
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--brand,#1090D0)] hover:bg-gray-50"
          style={{ ['--brand' as any]: TOKENS.brand }}
        >
          View All Recommendations
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

/* ---------------------------------- USAGE -----------------------------------
<GlobalStrategyCardHolder
  project="yourdomain.com"
  items={fetchedFromStrategyTab}
  onViewAll={() => router.push('/analyzer/competitors/strategy')}
  onDismissAll={() => persistHideAll(projectId)}
  onDismissCard={(id) => markDismissedGlobally(id)}
/>
----------------------------------------------------------------------------- */
