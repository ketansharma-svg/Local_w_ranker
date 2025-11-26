'use client';
import * as React from 'react';
import {
  Search,
  BookmarkPlus,
  Download,
  Share2,
  FileText,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Wand2,
  LineChart,
  Layers,
  TrendingUp,
  List as ListIcon,
} from 'lucide-react';
import DiscoverTabPro from './DiscoverTable';
import AnalyzeTabPro from './AnalyzeTab';
import { ClustersTab } from './cluster/Clusters';
import DemoSerpSnapshot from './SERPSnapshot';
import { OpportunitiesTab } from './Opportunities';
import ListsTabDemo from './ListsSavedCollections';


/** ───────────────────────── Tokens / Fonts (Wranker‑aligned) ───────────────────────── */
const TOKENS = {
  brand: '#008CCD',
  action: '#0077FF',
  textStrong: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  borderLight: '#EFF0F6',
  chipBg: '#F5F7FA',
  chipBgHover: '#E5E7EB',
  radius: '6px',
};

const fontStack =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

/** ───────────────────────── Types ───────────────────────── */
export type KRMode = 'no-domain' | 'domain';
export type KRTab = 'discover' | 'analyze' | 'clusters' | 'serp' | 'opportunities' | 'lists';

export type KeywordResearchHeaderAndTabsProps = {
  /** Initial mode (default: 'no-domain') */
  defaultMode?: KRMode;
  /** Whether a project connection is present (affects banner copy) */
  projectConnected?: boolean;

  /** Initial active tab (default: 'analyze') */
  defaultTab?: KRTab;
  /** Called when tab changes */
  onTabChange?: (tab: KRTab) => void;

  /** Header actions (icon-only) */
  onSaveList?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onAddToReports?: () => void;
  onOpenSettings?: () => void;

  /** Enable/disable logic for header actions */
  hasResults?: boolean;        // enables Export / Add to Reports
  hasSelection?: boolean;      // enables Save List (selection)
  hasListContext?: boolean;    // enables Share (when a list is open)
  /** Optional handler for "Connect Project" in the banner (Domain‑Aware preview) */
  onConnectProject?: () => void;

  /** Style */
  className?: string;
  /** Make the bar sticky (default: true) */
  sticky?: boolean;
  /** Sync mode to URL (?mode=domain|no-domain). Default true */
  syncModeToUrl?: boolean;
};

/** ───────────────────────── Small Atoms ───────────────────────── */
function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={disabled ? undefined : onClick}
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-md border transition',
        'focus:outline-none focus-visible:ring-2',
        disabled ? 'opacity-40 pointer-events-none' : 'hover:bg-white',
        'cursor-pointer',
      ].join(' ')}
      style={{
        borderColor: TOKENS.border,
        ['--tw-ring-color' as any]: TOKENS.brand,
        background: '#FFFFFF',
      }}
    >
      {children}
    </button>
  );
}

function ModeSegment({
  mode,
  onChange,
}: {
  mode: KRMode;
  onChange: (m: KRMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Mode"
      className="inline-flex items-center rounded-md border p-0.5"
      style={{ borderColor: TOKENS.border, background: TOKENS.chipBg }}
    >
      {([
        { v: 'no-domain', label: 'No‑Domain' },
        { v: 'domain', label: 'Domain‑Aware' },
      ] as const).map((o) => {
        const active = mode === o.v;
        return (
          <button
            key={o.v}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(o.v)}
            className={[
              'px-3 py-1.5 text-[13px] font-semibold rounded-md transition',
              'focus:outline-none focus-visible:ring-2',
              'cursor-pointer',
              active ? 'bg-white shadow-sm' : 'hover:bg-white/70',
            ].join(' ')}
            style={{
              color: active ? TOKENS.textStrong : TOKENS.textMuted,
              ['--tw-ring-color' as any]: TOKENS.brand,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Banner({
  kind = 'info',
  children,
  onClose,
  primaryAction,
}: {
  kind?: 'info' | 'upsell';
  children: React.ReactNode;
  onClose?: () => void;
  primaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div
      role="status"
      className="mx-4 mt-2 rounded-md border px-3 py-2 text-[13px] flex items-start gap-2"
      style={{
        borderColor: TOKENS.borderLight,
        background: '#FAFCFF',
        color: TOKENS.textMuted,
      }}
    >
      <InfoIcon size={16} color={TOKENS.action} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {children}
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="ml-3 inline-flex items-center rounded-md border px-2.5 py-1 text-[12px] font-medium hover:bg-white cursor-pointer"
            style={{
              borderColor: TOKENS.border,
              color: TOKENS.action,
            }}
          >
            {primaryAction.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss message"
        onClick={onClose}
        className="rounded p-1 hover:bg-white cursor-pointer focus:outline-none focus-visible:ring-2"
        style={{ ['--tw-ring-color' as any]: TOKENS.brand }}
      >
        <span aria-hidden className="block h-3 w-3" />
      </button>
    </div>
  );
}

/** ───────────────────────── Tabs (Screenshot‑style) ───────────────────────── */
const TAB_DEFS: { key: KRTab; label: string; icon: React.ElementType }[] = [
  { key: 'discover', label: 'Discover', icon: Wand2 },
  { key: 'analyze', label: 'Analyze', icon: LineChart },
  // { key: 'clusters', label: 'Clusters', icon: Layers },
  // { key: 'serp', label: 'SERP Snapshot', icon: Search },
  // { key: 'opportunities', label: 'Opportunities', icon: TrendingUp },
  // { key: 'lists', label: 'Lists', icon: ListIcon },
];

function Tabs({
  active,
  onChange,
  stickyTop = 56,
}: {
  active: KRTab;
  onChange: (t: KRTab) => void;
  /** px offset for sticky top (defaults to Tool Header height) */
  stickyTop?: number;
}) {
  const refs = React.useRef<Record<KRTab, HTMLButtonElement | null>>({
    discover: null,
    analyze: null,
    clusters: null,
    serp: null,
    opportunities: null,
    lists: null,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const order = TAB_DEFS.map((t) => t.key);
    const idx = order.indexOf(active);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      let next = idx;
      if (e.key === 'ArrowRight') next = (idx + 1) % order.length;
      if (e.key === 'ArrowLeft') next = (idx - 1 + order.length) % order.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = order.length - 1;
      const nextKey = order[next] as KRTab;
      onChange(nextKey);
      refs.current[nextKey]?.focus();
    }
  };

  return (
    <div
      className="sticky z-[40] border-b bg-white"
      style={{ borderColor: TOKENS.borderLight, top: stickyTop, fontFamily: fontStack }}
    >
      <div className="mx-auto flex w-full items-center px-4">
        <div
          role="tablist"
          aria-label="Keyword Research tabs"
          className="relative flex flex-wrap items-center gap-6"
          onKeyDown={handleKeyDown}
          style={{ width: '100%' }}
        >
          {TAB_DEFS.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                ref={(el) => (refs.current[t.key] = el) as any}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${t.key}`}
                id={`tab-${t.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(t.key)}
                className={[
                  'relative inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-bold transition',
                  'focus:outline-none focus-visible:ring-2',
                  'cursor-pointer',
                  isActive ? '' : 'hover:bg-white',
                ].join(' ')}
                style={{
                  color: isActive ? TOKENS.textStrong : TOKENS.textMuted,
                  background: isActive ? '#D9EEF8' : 'transparent', // pastel chip for active (screenshot pattern)
                  border: `1px solid ${isActive ? TOKENS.borderLight : 'transparent'}`,
                  ['--tw-ring-color' as any]: TOKENS.brand,
                }}
              >
                <Icon size={16} color={isActive ? TOKENS.brand : '#9E9E9E'} className="shrink-0" />
                {t.label}
                {/* Bottom active indicator (thin brand line) */}
                <span
                  aria-hidden
                  className="absolute left-0 right-0 rounded"
                  style={{
                    height: '2px',
                    bottom: '-9px',
                    background: isActive ? TOKENS.brand : 'transparent',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** ───────────────────────── Main: Tool Header + Tabs ───────────────────────── */
export default function DemoKRHeader({
  defaultMode = 'no-domain',
  projectConnected,
  defaultTab = 'discover',
  onTabChange,
  onSaveList,
  onExport,
  onShare,
  onAddToReports,
  onOpenSettings,
  hasResults,
  hasSelection,
  hasListContext,
  onConnectProject,
  className,
  sticky = true,
  syncModeToUrl = true,
}: KeywordResearchHeaderAndTabsProps) {
  const [mode, setMode] = React.useState<KRMode>(defaultMode);
  const [tab, setTab] = React.useState<KRTab>(defaultTab);
  const [showBanner, setShowBanner] = React.useState(false);

  /** — Sync URL (?mode=) for deep‑links */
  React.useEffect(() => {
    if (!syncModeToUrl) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode === 'domain' ? 'domain' : 'no-domain');
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* noop for SSR */
    }
  }, [mode, syncModeToUrl]);

  /** — 2s info banner on mode switch */
  const triggerBanner = React.useCallback(() => {
    setShowBanner(true);
    const t = setTimeout(() => setShowBanner(false), 2000);
    return () => clearTimeout(t);
  }, []);
  React.useEffect(() => {
    // Fire on mount only if user toggles later; initial mode does not show.
  }, []);

  const handleModeChange = (m: KRMode) => {
    if (m !== mode) {
      setMode(m);
      triggerBanner();
    }
  };

  const changeTab = (t: KRTab) => {
    setTab(t);
    onTabChange?.(t);
  };

  /** — Keyboard shortcuts (conflict‑safe) */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = (k: string) => (navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey) && k;
      // Mode: Alt+M
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleModeChange(mode === 'domain' ? 'no-domain' : 'domain');
        return;
      }
      // Save List: Ctrl/Cmd+S
      if (mod('s') && e.key.toLowerCase() === 's') {
        if (hasSelection || hasListContext) {
          e.preventDefault();
          onSaveList?.();
        }
        return;
      }
      // Export: Ctrl/Cmd+Alt+E
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'e') {
        if (hasResults) {
          e.preventDefault();
          onExport?.();
        }
        return;
      }
      // Share: Ctrl/Cmd+Shift+S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        if (hasListContext) {
          e.preventDefault();
          onShare?.();
        }
        return;
      }
      // Add to Reports: Ctrl/Cmd+Alt+R
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'r') {
        if (hasResults) {
          e.preventDefault();
          onAddToReports?.();
        }
        return;
      }
      // Settings: Ctrl/Cmd+,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        onOpenSettings?.();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, hasResults, hasSelection, hasListContext, onSaveList, onExport, onShare, onAddToReports, onOpenSettings, handleModeChange]);

  /** — Derived disabled states */
  const canSave = !!(hasSelection || hasListContext) && !!onSaveList;
  const canExport = !!hasResults && !!onExport;
  const canShare = !!hasListContext && !!onShare;
  const canAddToReport = !!hasResults && !!onAddToReports;

  return (
    <div className={className} style={{ fontFamily: fontStack }}>
      {/* ── Tool Header (sticky) ───────────────────────────────────────────── */}
      <header
        className={[
          'bg-white border-b',
          sticky ? 'sticky top-0 z-[40]' : '',
          'w-full',
        ].join(' ')}
        style={{
          borderColor: TOKENS.borderLight,
          boxShadow: sticky ? 'var(--wr-shadow-sm, 0 1px 2px rgba(16,24,40,.06))' : undefined,
        }}
      >
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 py-3">
          {/* Left: Title */}
          <div className="flex min-w-0 items-center gap-2">
            <Search size={18} color={TOKENS.brand} className="shrink-0" />
            <h1 className="truncate text-[16px] font-semibold" style={{ color: TOKENS.textStrong }}>
              Keyword Research
            </h1>
          </div>

          {/* Center: Mode Switch (moves responsively if constrained) */}
          {/* <div className="hidden md:block">
            <ModeSegment mode={mode} onChange={handleModeChange} />
          </div> */}

          {/* Right: Actions (icon‑only) */}
          <div className="flex items-center gap-2">
            {/* On smaller widths, show mode switch here */}
            <div className="block md:hidden">
              <ModeSegment mode={mode} onChange={handleModeChange} />
            </div>

            <IconButton label="Save keywords to list" onClick={onSaveList} disabled={!canSave}>
              <BookmarkPlus size={16} color={TOKENS.brand} />
            </IconButton>

            <IconButton label="Export" onClick={onExport} disabled={!canExport}>
              <Download size={16} color={TOKENS.brand} />
            </IconButton>

            <IconButton label="Share" onClick={onShare} disabled={!canShare}>
              <Share2 size={16} color={TOKENS.brand} />
            </IconButton>

            <IconButton label="Add to Report" onClick={onAddToReports} disabled={!canAddToReport}>
              <FileText size={16} color={TOKENS.brand} />
            </IconButton>

            <IconButton label="Keyword Research settings" onClick={onOpenSettings}>
              <SettingsIcon size={16} color={TOKENS.brand} />
            </IconButton>
          </div>
        </div>

        {/* {showBanner && (
          <Banner
            kind={mode === 'domain' && !projectConnected ? 'upsell' : 'info'}
            onClose={() => setShowBanner(false)}
            primaryAction={
              mode === 'domain' && !projectConnected && onConnectProject
                ? { label: 'Connect Project', onClick: onConnectProject }
                : undefined
            }
          >
            {mode === 'domain' && projectConnected && (
              <span>
                <strong style={{ color: TOKENS.textStrong }}>Domain‑Aware enabled.</strong>{' '}
                Near‑Wins, Keyword Gaps, and Page Mapping are now visible. GSC/GA4 overlays are on.
              </span>
            )}
            {mode === 'domain' && !projectConnected && (
              <span>
                <strong style={{ color: TOKENS.textStrong }}>Domain‑Aware preview.</strong>{' '}
                Connect a project to unlock Near‑Wins, Keyword Gaps, and Page Mapping.
              </span>
            )}
            {mode === 'no-domain' && (
              <span>
                <strong style={{ color: TOKENS.textStrong }}>No‑Domain mode.</strong>{' '}
                Domain overlays are hidden—seed‑only research is active.
              </span>
            )}
          </Banner>
        )} */}
      </header>

      {/* ── Tabs (sticky sub‑header, screenshot‑style) ─────────────────────── */}
      <Tabs active={tab} onChange={changeTab} stickyTop={sticky ? 56 : 0} />
    <div className="mt-2">
        <div
          role="tabpanel"
          id="panel-discover"
          aria-labelledby="tab-discover"
          aria-hidden={tab !== "discover"}
          hidden={tab !== "discover"}
          style={{ display: tab === "discover" ? "block" : "none" }}
        >
          <DiscoverTabPro />
        </div>
        <div
          role="tabpanel"
          id="panel-analyze"
          aria-labelledby="tab-analyze"
          aria-hidden={tab !== "analyze"}
          hidden={tab !== "analyze"}
          style={{ display: tab === "analyze" ? "block" : "none" }}
        >
          <AnalyzeTabPro />
        </div>
        {/* <div
          role="tabpanel"
          id="panel-clusters"
          aria-labelledby="tab-clusters"
          aria-hidden={tab !== "clusters"}
          hidden={tab !== "clusters"}
          style={{ display: tab === "clusters" ? "block" : "none" }}
        >
          <ClustersTab />
        </div>
        <div
          role="tabpanel"
          id="panel-serp"
          aria-labelledby="tab-serp"
          aria-hidden={tab !== "serp"}
          hidden={tab !== "serp"}
          style={{ display: tab === "serp" ? "block" : "none" }}
        >
          <DemoSerpSnapshot />
        </div>
        <div
          role="tabpanel"
          id="panel-opportunities"
          aria-labelledby="tab-opportunities"
          aria-hidden={tab !== "opportunities"}
          hidden={tab !== "opportunities"}
          style={{ display: tab === "opportunities" ? "block" : "none" }}
        >
          <OpportunitiesTab />
        </div>
        <div
          role="tabpanel"
          id="panel-lists"
          aria-labelledby="tab-lists"
          aria-hidden={tab !== "lists"}
          hidden={tab !== "lists"}
          style={{ display: tab === "lists" ? "block" : "none" }}
        >
          <ListsTabDemo />
        </div> */}
      </div>
    </div>
  );
}

