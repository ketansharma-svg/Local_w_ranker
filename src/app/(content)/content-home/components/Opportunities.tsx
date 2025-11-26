"use client";

/**
 * Home · Opportunities (All Projects)
 * - Tabs: Content Gaps • Decay alerts • Internal link boosts
 * - Sort: Impact (high→low), Freshness (new→old)
 * - Bulk select → Create tasks (inherits active filters)
 * - Virtualization shell for long lists (fixed item height)
 * - Icons: lucide-react, tinted with --brand (#008CCD)
 * - Tokens: Wranker v1 (colors/radius/shadow/focus/type). Ensure tokens.css is loaded.
 *
 * Accessibility:
 * - role="tablist" + role="tab"/role="tabpanel"
 * - Focus ring via --focus; keyboard Left/Right to change tabs, Enter to activate
 * - Cards are focusable; buttons show pointer cursor
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  // Tabs & meta
  Target,
  TrendingDown,
  Link2,
  Info,
  HelpCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  // Cards & CTAs
  FilePlus2,
  RefreshCcw,
  Wand2,
  ExternalLink,
  ClipboardList,
  MoveRight,
  // Chips
  AlertTriangle,
  Star,
  Globe2,
  // Selection
  CheckSquare,
  Square,
} from "lucide-react";

/* ───────────────── Tokens (JS fallbacks; values come from CSS vars) ───────────────── */
const TK = {
  brand: "var(--brand, #008CCD)",
  brand600: "var(--brand-600, #007BB8)",
  onBrand: "var(--on-brand, rgba(255,255,255,0.88))",
  bgApp: "var(--bg-app, #F5F7FA)",
  bgPanel: "var(--bg-panel, #FFFFFF)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  border: "var(--border, #E5E7EB)",
  textStrong: "var(--text-strong, #111827)",
  text: "var(--text, #374151)",
  textMuted: "var(--text-muted, #6B7280)",
  critical: "var(--critical, #E94134)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  warning: "var(--warning, #F9BB04)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  success: "var(--success, #34A853)",
  successBg: "var(--success-bg, #CBF8D7)",
  focus: "var(--focus, #4286F5)",
  radius: "var(--radius, 6px)",
  shadow1: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))",
} as const;

const fontStack: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter Fallback", "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const fmt = (n: number) => Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);

/* ───────────────── Types ───────────────── */
type TabKey = "gaps" | "decay" | "links";
type SortKey = "impact" | "freshness";
type SortDir = "desc" | "asc";

export type GapOpportunity = {
  id: string;
  topic: string;
  missingTerms: string[];
  potentialTraffic: number; // estimated monthly
  impact: number; // 0..100
  lastSeenAt: string; // ISO
  project: string; // domain
  locale: string; // BCP-47
};

export type DecayOpportunity = {
  id: string;
  url: string;
  title: string;
  decayPct: number; // -% change vs prev period
  lostClicks: number;
  lastUpdatedAt: string; // ISO
  daysSincePeak: number;
  impact: number; // 0..100
  project: string;
  locale: string;
};

export type LinkOpportunity = {
  id: string;
  sourceCount: number; // candidate sources
  targetUrl: string;
  anchorSamples: string[];
  estimatedLift: number; // %
  impact: number; // 0..100
  project: string;
  locale: string;
  lastAnalyzedAt: string; // ISO
};

export interface OpportunitiesProps {
  timeWindowLabel?: string; // e.g., "Last 28 days"
  loading?: boolean;
  error?: string | null;

  gaps?: GapOpportunity[];
  decay?: DecayOpportunity[];
  links?: LinkOpportunity[];

  // Actions (override to integrate)
  onCreateBrief?: (gap: GapOpportunity) => void;
  onRefreshCanvas?: (decay: DecayOpportunity) => void;
  onInsertLinks?: (link: LinkOpportunity) => void;
  onBulkCreateTasks?: (payload: { tab: TabKey; ids: string[] }) => void;

  // Utilities
  faviconUrlForDomain?: (domain: string) => string;
}

/* ───────────────── UI Primitives ───────────────── */
function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium",
        "transition-colors focus-visible:outline",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-95 cursor-pointer",
        className
      )}
      style={{ background: TK.brand, color: TK.onBrand, outlineColor: TK.focus, ...style }}
    />
  );
}
function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm",
        "transition-colors hover:bg-[color:var(--bg-app,#F5F7FA)] focus-visible:outline",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      style={{ borderColor: TK.border, color: TK.text, background: TK.bgPanel, outlineColor: TK.focus, ...style }}
    />
  );
}
function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm hover:bg-[color:var(--bg-app,#F5F7FA)]",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      style={{ color: TK.text, background: "transparent", ...style }}
    />
  );
}

function ImpactChip({ v }: { v: number }) {
  let bg = TK.successBg,
    fg = TK.success;
  if (v < 34) (bg = TK.criticalBg as any), (fg = TK.critical as any);
  else if (v < 67) (bg = TK.warningBg as any), (fg = TK.warning as any);
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px]" style={{ background: bg, color: fg }}>
      <Star size={14} /> Impact {v}
    </span>
  );
}

function MetaPill({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]" style={{ borderColor: TK.border, color: TK.text }}>
      <Icon size={13} style={{ color: TK.brand }} />
      {children}
    </span>
  );
}

/* ───────────────── Virtualized list (fixed row height) ───────────────── */
function VirtualList<T>({
  items,
  rowHeight = 96,
  height = 480,
  render,
  getKey,
}: {
  items: T[];
  rowHeight?: number;
  height?: number;
  getKey: (item: T) => string;
  render: (item: T, idx: number) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const onScroll = () => {
    const y = ref.current?.scrollTop || 0;
    setScrollTop(y);
  };
  const total = items.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const visibleCount = Math.ceil(height / rowHeight) + 12;
  const slice = items.slice(start, start + visibleCount);
  const offsetY = start * rowHeight;

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="w-full overflow-auto"
      style={{ maxHeight: height, borderRadius: TK.radius as unknown as number }}
      role="list"
      aria-label="Opportunities list"
    >
      <div style={{ height: total, position: "relative" }}>
        <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
          {slice.map((it, i) => (
            <div key={getKey(it)} style={{ height: rowHeight }}>{render(it, start + i)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Main Component ───────────────── */
export default function HomeOpportunities({
  timeWindowLabel = "Last 28 days",
  loading,
  error,

  gaps,
  decay,
  links,

  onCreateBrief,
  onRefreshCanvas,
  onInsertLinks,
  onBulkCreateTasks,

  faviconUrlForDomain = (d) => `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(d)}`,
}: OpportunitiesProps) {
  /* Demo defaults */
  const _gaps: GapOpportunity[] =
    gaps ||
    Array.from({ length: 18 }).map((_, i) => ({
      id: `gap_${i}`,
      topic: i % 3 ? "What is Schema Markup" : "Product Page SEO Best Practices",
      missingTerms: ["schema", "rich results", "faq", "product markup"].slice(0, 2 + ((i + 1) % 3)),
      potentialTraffic: 1200 + i * 35,
      impact: 90 - (i % 7) * 7,
      lastSeenAt: new Date(Date.now() - i * 864e5).toISOString(),
      project: i % 2 ? "wranker.com" : "w3era.com",
      locale: i % 2 ? "en-US" : "en-GB",
    }));

  const _decay: DecayOpportunity[] =
    decay ||
    Array.from({ length: 14 }).map((_, i) => ({
      id: `decay_${i}`,
      url: `https://example.com/blog/guide-${i}`,
      title: `Ultimate Guide ${i}: Refresh for 2026`,
      decayPct: -(10 + (i % 6) * 7),
      lostClicks: 120 + i * 9,
      lastUpdatedAt: new Date(Date.now() - (i + 2) * 864e5).toISOString(),
      daysSincePeak: 90 + i * 3,
      impact: 70 - (i % 5) * 8,
      project: i % 2 ? "wranker.com" : "w3era.com",
      locale: "en-US",
    }));

  const _links: LinkOpportunity[] =
    links ||
    Array.from({ length: 22 }).map((_, i) => ({
      id: `links_${i}`,
      sourceCount: 4 + (i % 5),
      targetUrl: `https://example.com/resource/${i}`,
      anchorSamples: ["internal linking strategy", "content hubs", "topic clusters"].slice(0, 2 + (i % 2)),
      estimatedLift: 6 + (i % 4) * 3,
      impact: 55 + (i % 4) * 8,
      project: "wranker.com",
      locale: i % 2 ? "en-US" : "en-GB",
      lastAnalyzedAt: new Date(Date.now() - i * 36e5).toISOString(),
    }));

  /* Tabs, sorting, selection */
  const [tab, setTab] = useState<TabKey>("gaps");
  const [sortKey, setSortKey] = useState<SortKey>("impact");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Record<string, true>>({});

  useEffect(() => {
    // reset selection on tab change
    setSelected({});
  }, [tab]);

  const items = useMemo(() => {
    const arr = tab === "gaps" ? _gaps : tab === "decay" ? _decay : _links;
    const sorted = [...arr].sort((a: any, b: any) => {
      const av = sortKey === "impact" ? a.impact : Date.parse(a.lastSeenAt || a.lastUpdatedAt || a.lastAnalyzedAt || "1970-01-01");
      const bv = sortKey === "impact" ? b.impact : Date.parse(b.lastSeenAt || b.lastUpdatedAt || b.lastAnalyzedAt || "1970-01-01");
      return sortDir === "desc" ? (bv - av) : (av - bv);
    });
    return sorted;
  }, [_gaps, _decay, _links, tab, sortKey, sortDir]);

  const allSelected = items.length > 0 && items.every((it) => selected[it.id]);
  const toggleAll = () =>
    setSelected((s) => {
      if (allSelected) return {};
      const next: Record<string, true> = {};
      items.forEach((it) => (next[it.id] = true));
      return next;
    });
  const toggleOne = (id: string) => setSelected((s) => (s[id] ? (() => { const { [id]: _, ...r } = s; return r; })() : { ...s, [id]: true }));

  const bulkCreateTasks = () => onBulkCreateTasks?.({ tab, ids: Object.keys(selected) });

  /* Keyboard for tabs */
  const tabOrder: TabKey[] = ["gaps", "decay", "links"];
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const idx = tabOrder.indexOf(tab);
      const next = e.key === "ArrowRight" ? (idx + 1) % tabOrder.length : (idx - 1 + tabOrder.length) % tabOrder.length;
      setTab(tabOrder[next]);
    }
  };

  /* States */
  if (error) {
    return (
      <section style={fontStack}>
        <div className="rounded-md border px-3 py-2" style={{ borderColor: TK.critical, background: TK.criticalBg, color: TK.textStrong }}>
          <AlertTriangle className="inline mr-2" size={16} /> Failed to load Opportunities. <button className="underline" style={{ cursor: "pointer" }} onClick={() => location.reload()}>Retry</button>
        </div>
      </section>
    );
  }

  /* Helpers */
  const ProjectChip = ({ domain, locale }: { domain: string; locale: string }) => (
    <span className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[12px]" style={{ borderColor: TK.border, color: TK.text }}>
      <img src={faviconUrlForDomain(domain)} className="h-4 w-4 rounded" alt="" />
      {domain}
      <span className="ml-1 inline-flex items-center gap-1 rounded px-1" style={{ background: TK.bgApp }}>
        <Globe2 size={12} /> {locale}
      </span>
    </span>
  );

  const HeaderSelect = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      title={checked ? "Deselect all" : "Select all"}
      className="inline-flex items-center gap-1 rounded px-2 py-1"
      style={{ cursor: "pointer" }}
    >
      {checked ? <CheckSquare size={16} style={{ color: TK.brand }} /> : <Square size={16} style={{ color: TK.brand }} />}
      <span className="text-sm">Select all</span>
    </button>
  );

  /* Renderers per tab */
  const renderGap = (g: GapOpportunity) => (
    <div
      className="mx-0 my-1 flex h-full items-center justify-between rounded-md border bg-white px-3 py-2"
      style={{ borderColor: TK.borderSubtle, boxShadow: TK.shadow1 }}
      role="listitem"
      tabIndex={0}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={() => toggleOne(g.id)} title="Select" className="cursor-pointer">
          {selected[g.id] ? <CheckSquare size={18} style={{ color: TK.brand }} /> : <Square size={18} style={{ color: TK.brand }} />}
        </button>
        <Target size={18} style={{ color: TK.brand }} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" style={{ color: TK.textStrong }}>
            {g.topic}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
            <span>Terms:</span>
            {g.missingTerms.slice(0, 3).map((t) => (
              <span key={t} className="rounded border px-1" style={{ borderColor: TK.border }}>
                {t}
              </span>
            ))}
            {g.missingTerms.length > 3 && <span className="opacity-70">+{g.missingTerms.length - 3} more</span>}
            <span className="ml-2">Potential: ~{fmt(g.potentialTraffic)}/mo</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProjectChip domain={g.project} locale={g.locale} />
            <span className="text-[12px]" style={{ color: TK.textMuted }}>
              Seen {new Date(g.lastSeenAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ImpactChip v={g.impact} />
        <SecondaryButton onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(g.topic)}`, "_blank")} title="Open SERP">
          SERP <ExternalLink size={14} />
        </SecondaryButton>
        <PrimaryButton onClick={() => onCreateBrief?.(g)} title="Create Brief">
          <FilePlus2 size={16} /> Create Brief
        </PrimaryButton>
      </div>
    </div>
  );

  const renderDecay = (d: DecayOpportunity) => (
    <div
      className="mx-0 my-1 flex h-full items-center justify-between rounded-md border bg-white px-3 py-2"
      style={{ borderColor: TK.borderSubtle, boxShadow: TK.shadow1 }}
      role="listitem"
      tabIndex={0}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={() => toggleOne(d.id)} title="Select" className="cursor-pointer">
          {selected[d.id] ? <CheckSquare size={18} style={{ color: TK.brand }} /> : <Square size={18} style={{ color: TK.brand }} />}
        </button>
        <TrendingDown size={18} style={{ color: TK.warning }} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" style={{ color: TK.textStrong }}>
            {d.title}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
            <span>{new URL(d.url).pathname}</span>
            <span className="rounded px-1" style={{ background: TK.warningBg, color: TK.warning }}>
              {fmt(Math.abs(d.decayPct))}% ↓, -{fmt(d.lostClicks)} clicks
            </span>
            <span>Peak {d.daysSincePeak}d ago</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProjectChip domain={d.project} locale={d.locale} />
            <span className="text-[12px]" style={{ color: TK.textMuted }}>
              Updated {new Date(d.lastUpdatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ImpactChip v={d.impact} />
        <SecondaryButton onClick={() => window.open(d.url, "_blank")} title="Open URL">
          Open <ExternalLink size={14} />
        </SecondaryButton>
        <PrimaryButton onClick={() => onRefreshCanvas?.(d)} title="Open Canvas (Refresh)">
          <RefreshCcw size={16} /> Refresh in Canvas
        </PrimaryButton>
      </div>
    </div>
  );

  const renderLink = (l: LinkOpportunity) => (
    <div
      className="mx-0 my-1 flex h-full items-center justify-between rounded-md border bg-white px-3 py-2"
      style={{ borderColor: TK.borderSubtle, boxShadow: TK.shadow1 }}
      role="listitem"
      tabIndex={0}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={() => toggleOne(l.id)} title="Select" className="cursor-pointer">
          {selected[l.id] ? <CheckSquare size={18} style={{ color: TK.brand }} /> : <Square size={18} style={{ color: TK.brand }} />}
        </button>
        <Link2 size={18} style={{ color: TK.brand }} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" style={{ color: TK.textStrong }}>
            {new URL(l.targetUrl).pathname}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
            <span>{l.sourceCount} source pages</span>
            <span className="rounded px-1" style={{ background: TK.successBg, color: TK.success }}>
              +{fmt(l.estimatedLift)}% est. lift
            </span>
            <span className="truncate">Anchors: {l.anchorSamples.join(" · ")}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProjectChip domain={l.project} locale={l.locale} />
            <span className="text-[12px]" style={{ color: TK.textMuted }}>
              Analyzed {new Date(l.lastAnalyzedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ImpactChip v={l.impact} />
        <SecondaryButton onClick={() => window.open(l.targetUrl, "_blank")} title="Open target">
          Open <ExternalLink size={14} />
        </SecondaryButton>
        <PrimaryButton onClick={() => onInsertLinks?.(l)} title="Insert link suggestions">
          <Wand2 size={16} /> Insert suggestions
        </PrimaryButton>
      </div>
    </div>
  );

  const rowHeight = 104; // card + margins

  return (
    <section className="w-full mt-4" style={fontStack}>
      <div
        className="rounded-md border bg-white p-3"
        style={{ borderColor: TK.borderSubtle, boxShadow: TK.shadow1 }}
      >
        {/* Header row: Title, meta, controls */}
        <div className="mb-2 flex flex-wrap items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <ClipboardList size={18} style={{ color: TK.brand }} />
            <h3 className="text-[18px] font-semibold" style={{ color: TK.textStrong }}>
              Opportunities
            </h3>
            <span className="text-[12px]" style={{ color: TK.textMuted }}>
              {timeWindowLabel}
            </span>
            <button
              className="ml-2 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[12px] hover:bg-[color:var(--bg-app,#F5F7FA)]"
              style={{ borderColor: TK.border, cursor: "pointer" }}
              title="About this module"
            >
              <Info size={14} style={{ color: TK.brand }} />
              What is this?
            </button>
          </div>

          <div className="inline-flex items-center gap-2">
            <HeaderSelect checked={allSelected} onClick={toggleAll} />
            <div className="inline-flex items-center gap-1 rounded-md border px-2 py-1" style={{ borderColor: TK.border }}>
              <Filter size={14} style={{ color: TK.brand }} />
              <span className="text-sm">Sort</span>
              <select
                className="ml-1 h-8 rounded border px-1 text-sm focus-visible:outline"
                style={{ borderColor: TK.border, outlineColor: TK.focus, cursor: "pointer" }}
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                title="Sort key"
              >
                <option value="impact">Impact</option>
                <option value="freshness">Freshness</option>
              </select>
              <button
                onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5"
                style={{ cursor: "pointer" }}
                title={sortDir === "desc" ? "Descending" : "Ascending"}
              >
                {sortDir === "desc" ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>

            <PrimaryButton
              onClick={bulkCreateTasks}
              disabled={Object.keys(selected).length === 0}
              title="Create tasks for selected"
            >
              Create tasks <MoveRight size={16} />
            </PrimaryButton>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Opportunities Tabs"
          className="mb-2 inline-flex flex-wrap items-center gap-1"
          onKeyDown={onTabKey}
        >
          {([
            { k: "gaps", label: "Content Gaps", Icon: Target },
            { k: "decay", label: "Decay alerts", Icon: TrendingDown },
            { k: "links", label: "Internal link boosts", Icon: Link2 },
          ] as const).map((t) => {
            const selected = tab === t.k;
            return (
              <button
                key={t.k}
                role="tab"
                aria-selected={selected}
                aria-controls={`opp-panel-${t.k}`}
                id={`opp-tab-${t.k}`}
                onClick={() => setTab(t.k)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] focus-visible:outline",
                  selected ? "font-semibold" : "text-gray-600"
                )}
                style={{ outlineColor: TK.focus, cursor: "pointer" }}
                title={t.label}
              >
                <t.Icon size={15} style={{ color: TK.brand }} />
                {t.label}
              </button>
            );
          })}
          <span className="ml-2 text-[12px]" style={{ color: TK.textMuted }}>
            Tip: Click a card’s CTA to act immediately.
          </span>
        </div>

        {/* Panels */}
        <div className="mt-2">
          {/* Loading */}
          {loading && (
            <div className="grid gap-2" aria-live="polite">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-md border"
                  style={{ borderColor: TK.borderSubtle, background: "#FAFBFC" }}
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && items.length === 0 && (
            <div
              className="grid place-items-center rounded-md border p-6 text-center"
              style={{ borderColor: TK.borderSubtle, color: TK.textMuted }}
              role="status"
              aria-live="polite"
            >
              <HelpCircle size={20} className="mb-2" style={{ color: TK.brand }} />
              <div className="text-sm">No opportunities in {timeWindowLabel}. Try expanding your filters.</div>
            </div>
          )}

          {/* Gaps panel */}
          {!loading && tab === "gaps" && items.length > 0 && (
            <div id="opp-panel-gaps" role="tabpanel" aria-labelledby="opp-tab-gaps">
              <VirtualList
                items={items as GapOpportunity[]}
                rowHeight={rowHeight}
                height={480}
                getKey={(g) => g.id}
                render={(g) => renderGap(g)}
              />
            </div>
          )}

          {/* Decay panel */}
          {!loading && tab === "decay" && items.length > 0 && (
            <div id="opp-panel-decay" role="tabpanel" aria-labelledby="opp-tab-decay">
              <VirtualList
                items={items as DecayOpportunity[]}
                rowHeight={rowHeight}
                height={480}
                getKey={(d) => d.id}
                render={(d) => renderDecay(d)}
              />
            </div>
          )}

          {/* Links panel */}
          {!loading && tab === "links" && items.length > 0 && (
            <div id="opp-panel-links" role="tabpanel" aria-labelledby="opp-tab-links">
              <VirtualList
                items={items as LinkOpportunity[]}
                rowHeight={rowHeight}
                height={480}
                getKey={(l) => l.id}
                render={(l) => renderLink(l)}
              />
            </div>
          )}
        </div>

        {/* Footer helper */}
        <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderColor: TK.border }}>
          <div className="inline-flex items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
            <Info size={14} />
            Clicking a KPI segment in the row above will filter these opportunities.
          </div>
          <GhostButton onClick={() => alert("Opportunity rules & thresholds are managed centrally.")} title="Open documentation">
            Rules & thresholds <ExternalLink size={14} />
          </GhostButton>
        </div>
      </div>
    </section>
  );
}
