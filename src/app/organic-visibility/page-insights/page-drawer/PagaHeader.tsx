'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  ExternalLink,
  X,
  Download,
  MoreVertical,
  Laptop,
  Smartphone,
  Check,
  Loader2,
  FileSpreadsheet,
  FileText,
  ClipboardList,
  Globe,
  ChevronRight,
  BarChart3 as OverviewIcon,
  Search,
  Stars,
  Link2,
} from 'lucide-react';
import DemoPageKpiSummary from "./overview/OrganicPageDrawer";
import TrafficTrendCard from "./overview/TrafficTrendCard";
import RankDistributionTimeseriesCard from "./overview/RankDistributionTimeseriesCard";
import TopKeywordsSerpTable from "./overview/TopKeywordsSerpTable";
import KeywordsTab from "./overview/KeywordsTab";
import SerpFeaturesTab from "./overview/SerpFeaturesTab";
import Section2Left from "./backlinks/Section2Left";
import BacklinksKpiCards from "./backlinks/BacklinksKpiCards";
import LinkVelocityNewLost from "./backlinks/LinkVelocityNewLost";
import AttributesTypesDistribution from "./backlinks/AttributesTypesDistribution";
import Demo_SourceQualityGeo from "./backlinks/SourceQualityGeo";
import PageBacklinksTable from "./backlinks/PageBacklinksTable";
import DemoAnchorsPatterns from "./backlinks/DemoAnchorsPatterns";  
/**
 * Organic Page Drawer — Header (with Breadcrumbs + Tabs)
 * - Inter / Inter Fallback fonts; NO emoji anywhere
 * - Brand icons (#008CCD) for section & actions
 * - Top row: Breadcrumb (left) • Actions cluster (right)
 * - Second row: Page URL identity (left) • scope chips (center) • mobile tracked (right)
 * - Below: Tab navigation (4 tabs only) styled like main headers
 * - Width matches main panel header via --wr-content-max
 * - Pointer cursor on interactive elements
 */

const TK = {
  brand: 'var(--wr-brand, #008CCD)',
  textStrong: 'var(--wr-text-strong, #111827)',
  text: 'var(--wr-text, #374151)',
  muted: 'var(--wr-text-muted, #6B7280)',
  panel: 'var(--wr-bg-panel, #FFFFFF)',
  app: 'var(--wr-bg-app, #F5F7FA)',
  border: 'var(--wr-border, #E5E7EB)',
  borderSubtle: 'var(--wr-border-subtle, #EFF0F6)',
  focus: 'var(--wr-focus, #4286F5)',
  success: 'var(--wr-success, #34A853)',
  pastelBrand: 'var(--wr-brand-50, #D9EEF8)',
};

/* ------------------------------- Types & Props ------------------------------- */
export type PageIdentity = {
  absoluteUrl?: string;
  relativePath?: string;
  faviconUrl?: string;
};

export type Scope = {
  device: 'desktop' | 'mobile';
  countryCode: string; // ISO-2
};

export type Crumb = { label: string; onClick?: () => void; href?: string };

export type HeaderProps = {
  page?: PageIdentity;
  scope?: Scope | null;
  tracking?: boolean;
  lastUpdated?: string | null;
  breadcrumbs?: Crumb[];
  // Actions / events
  onToggleTracked?: (next: boolean) => Promise<void> | void;
  onAssignTask?: (page: Required<PageIdentity>, scope: Scope) => void;
  onExport?: (fmt: 'csv' | 'xlsx' | 'pdf') => void;
  onClose?: () => void;
  onOpenPage?: (url: string) => void;
  onChangeScope?: () => void;

  // Tabs (fixed to 4 as requested)
  activeTabKey?: 'overview' | 'keywords' | 'serp-features' | 'backlinks';
  onTabChange?: (key: 'overview' | 'keywords' | 'serp-features' | 'backlinks') => void;
};

/* -------------------------------- Utilities -------------------------------- */
function middleEllipsis(input: string, max = 54) {
  if (!input) return '';
  if (input.length <= max) return input;
  const keep = Math.max(6, Math.floor((max - 3) / 2));
  return input.slice(0, keep) + '...' + input.slice(-keep);
}

function formatRelative(iso?: string | null) {
  if (!iso) return { rel: '—', title: 'No snapshot yet' };
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return { rel: '—', title: 'No snapshot yet' };
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.round(diff / 1000);
  const m = Math.round(s / 60);
  const h = Math.round(m / 60);
  const d = Math.round(h / 24);
  const rel = d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : `${s}s ago`;
  const title = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
  return { rel, title };
}

/* --------------------------- Primitives (chips, btns) --------------------------- */
function IconGhostButton({
  title,
  onClick,
  children,
  className = '',
  disabled,
  brand = false,
}: React.PropsWithChildren<{
  title: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  brand?: boolean;
}>) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--wr-brand-50,#D9EEF8)]'
      }`}
      style={{
        color: brand ? (TK.brand as string) : (TK.textStrong as string),
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Chip({
  children,
  onClick,
  title,
  asButton = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  asButton?: boolean;
}) {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs';
  const style: React.CSSProperties = {
    background: TK.app as string,
    color: TK.text as string,
    borderColor: TK.border as string,
    cursor: onClick ? 'pointer' : 'default',
  };
  if (asButton) {
    return (
      <button
        type="button"
        className={`${base} hover:bg-gray-100 focus:outline-none focus:ring-2`}
        style={{ ...style, outlineColor: TK.focus as string }}
        title={title}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
  return (
    <span className={base} style={style} title={title}>
      {children}
    </span>
  );
}

function ExportMenu({
  onExport,
  lockedTooltip = 'Upgrade to Pro',
}: {
  onExport?: (fmt: 'csv' | 'xlsx' | 'pdf') => void;
  lockedTooltip?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <IconGhostButton title="Export" onClick={() => setOpen((s) => !s)} brand>
        <Download size={20} color={TK.brand as string} />
      </IconGhostButton>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white shadow"
          style={{ borderColor: TK.border as string }}
        >
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            style={{ cursor: 'pointer', color: TK.textStrong as string }}
            onClick={() => {
              setOpen(false);
              onExport?.('csv');
            }}
          >
            <Download size={16} />
            CSV (Free)
          </button>

          <button
            role="menuitem"
            className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-left text-sm text-gray-400"
            title={lockedTooltip}
            onClick={(e) => e.preventDefault()}
          >
            <FileSpreadsheet size={16} />
            XLSX (Pro)
          </button>

          <button
            role="menuitem"
            className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-left text-sm text-gray-400"
            title={lockedTooltip}
            onClick={(e) => e.preventDefault()}
          >
            <FileText size={16} />
            PDF (Pro)
          </button>
        </div>
      )}
    </div>
  );
}

function MobileActions({
  onOpen,
  onAssign,
  onExport,
  onClose,
}: {
  onOpen: () => void;
  onAssign: () => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <div ref={ref} className="relative md:hidden">
      <IconGhostButton title="More actions" onClick={() => setOpen((s) => !s)} brand>
        <MoreVertical size={20} color={TK.brand as string} />
      </IconGhostButton>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[200px] overflow-hidden rounded-md border bg-white shadow"
          style={{ borderColor: TK.border as string }}
        >
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onOpen();
            }}
          >
            Open Page
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onAssign();
            }}
          >
            Assign Task
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onExport();
            }}
          >
            Export
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            onClick={() => {
              setOpen(false);
              onClose();
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Breadcrumbs ------------------------------ */
function Breadcrumbs({ items, maxWidth }: { items: Crumb[]; maxWidth?: number }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1"
      style={{ maxWidth }}
    >
      <Globe size={16} color={TK.brand as string} className="mr-1 shrink-0" />
      {items.map((c, idx) => {
        const isLast = idx === items.length - 1;
        const content = (
          <span
            className={`truncate text-[13px] ${isLast ? 'font-medium' : ''}`}
            style={{
              color: isLast ? (TK.textStrong as string) : (TK.muted as string),
              lineHeight: 1.25,
            }}
          >
            {c.label}
          </span>
        );

        return (
          <div key={idx} className="flex min-w-0 items-center">
            {idx > 0 && (
              <ChevronRight
                size={14}
                className="mx-1 shrink-0"
                color={TK.muted as string}
              />
            )}
            {isLast ? (
              <span className="min-w-0 truncate">{content}</span>
            ) : c.onClick ? (
              <button
                type="button"
                onClick={c.onClick}
                className="min-w-0 truncate underline decoration-transparent hover:decoration-[var(--wr-brand,#008CCD)]"
                style={{ cursor: 'pointer', color: TK.muted as string }}
              >
                {content}
              </button>
            ) : c.href ? (
              <a
                href={c.href}
                className="min-w-0 truncate underline decoration-transparent hover:decoration-[var(--wr-brand,#008CCD)]"
                style={{ color: TK.muted as string }}
              >
                {content}
              </a>
            ) : (
              <span className="min-w-0 truncate">{content}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* --------------------------------- Tabs --------------------------------- */
type DrawerTabKey = 'overview' | 'keywords' | 'serp-features' | 'backlinks';

function Tabs({
  activeKey,
  onChange,
}: {
  activeKey: DrawerTabKey;
  onChange?: (key: DrawerTabKey) => void;
}) {
  const items: { key: DrawerTabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <OverviewIcon size={14} /> },
    { key: 'keywords', label: 'Keywords', icon: <Search size={14} /> },
    { key: 'serp-features', label: 'SERP Features', icon: <Stars size={14} /> },
    { key: 'backlinks', label: 'Backlinks', icon: <Link2 size={14} /> },
  ];

  return (
    <div
      className="border-b w-full"
      style={{ borderColor: TK.borderSubtle as string, background: TK.panel as string }}
    >
      {/* Tabs */}
      <div
        className="mx-auto flex w-full items-center gap-1 overflow-x-auto px-4"
        style={{
          // maxWidth: 'var(--wr-content-max, 1200px)',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          minHeight: 44,
        }}
        role="tablist"
        aria-label="Page sections"
      >
        {items.map((t) => {
          const active = t.key === activeKey;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange?.(t.key)}
              className={`relative -mb-px mr-1 inline-flex h-9 shrink-0 items-center gap-2 rounded-[8px] px-3 text-sm outline-none transition ${
                active
                  ? 'bg-[var(--wr-brand-50,#D9EEF8)] font-semibold text-[color:var(--wr-brand,#008CCD)]'
                  : 'text-[color:var(--wr-text-muted,#6B7280)] hover:text-[color:var(--wr-text-strong,#111827)]'
              }`}
              style={{ cursor: 'pointer' }}
            >
              {t.icon}
              {t.label}
              {active && (
                <span
                  className="pointer-events-none absolute inset-x-2 -bottom-px h-[2px] rounded-full"
                  style={{ background: TK.brand as string }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Content */}
      {activeKey === 'overview' && (
        <>
          <DemoPageKpiSummary />
          <TrafficTrendCard />
          <RankDistributionTimeseriesCard />
          <TopKeywordsSerpTable />
        </>
      )}

      {activeKey === 'keywords' && <KeywordsTab />}

      {activeKey === 'serp-features' && <SerpFeaturesTab />}

      {activeKey === 'backlinks' && (
        <>
          <div className="flex gap-4">
            <Section2Left />
            <BacklinksKpiCards />
          </div>
          <LinkVelocityNewLost />
          <AttributesTypesDistribution />
          <Demo_SourceQualityGeo />
          <PageBacklinksTable />
          <DemoAnchorsPatterns />
        </>
      )}
    </div>
  );
}


/* --------------------------------- Toast --------------------------------- */
function Toast({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[9999] flex justify-center"
    >
      <div
        className="rounded-md border px-3 py-1.5 text-sm shadow"
        style={{
          background: TK.panel as string,
          color: TK.textStrong as string,
          borderColor: TK.border as string,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ----------------------------- Main Header Component ----------------------------- */
export default function OrganicPageHeader({
  page,
  scope,
  tracking,
  lastUpdated,
  breadcrumbs,
  onToggleTracked,
  onAssignTask,
  onExport,
  onClose,
  onOpenPage,
  onChangeScope,
   activeTabKey: initialTabKey = 'overview',
  onTabChange,
}: HeaderProps) {
  // Safe fallbacks
  const absUrl = page?.absoluteUrl || '';
  const relPath = page?.relativePath || '/';
  const faviconUrl = page?.faviconUrl;
  const device = scope?.device ?? 'desktop';
  const cc = (scope?.countryCode || 'US').toUpperCase();
 const [activeTabKey, setActiveTabKey] = useState<DrawerTabKey>(initialTabKey);
  const [isTracked, setIsTracked] = useState(!!tracking);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setIsTracked(!!tracking), [tracking]);

  const { rel: relTime, title: exactTime } = formatRelative(lastUpdated);
  const relPathTrunc = useMemo(() => middleEllipsis(relPath, 64), [relPath]);

  async function copyUrl() {
    try {
      if (!absUrl) return;
      await navigator.clipboard.writeText(absUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no-op */
    }
  }
  function openPage() {
    if (!absUrl) return;
    if (onOpenPage) onOpenPage(absUrl);
    else window.open(absUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleToggle() {
    const next = !isTracked;
    setIsTracked(next);
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      await onToggleTracked?.(next);
    } finally {
      setSaving(false);
    }
  }

  // Breadcrumbs: default if not provided
  const crumbItems: Crumb[] =
    breadcrumbs && breadcrumbs.length
      ? breadcrumbs
      : [
          { label: 'Organic' },
          { label: 'Pages' },
          { label: relPath.replace(/^\//, '') || '(root)' },
        ];

  // Chips — NOTE: no flag emoji, uses Globe icon instead
  const chips = [
    <Chip key="device" asButton onClick={onChangeScope} title="Change device">
      {device === 'desktop' ? (
        <>
          <Laptop size={14} />
          Desktop
        </>
      ) : (
        <>
          <Smartphone size={14} />
          Mobile
        </>
      )}
    </Chip>,
    <Chip key="country" asButton onClick={onChangeScope} title="Change country">
      <Globe size={14} color={TK.brand as string} />
      <span className="ml-0.5">{cc}</span>
    </Chip>,
    <Chip key="checked" title={exactTime}>
      <span className="text-[11px]" style={{ color: TK.muted as string }}>
        Last checked: {relTime}
      </span>
    </Chip>,
  ];
  const chipsMobile = chips.slice(0, 2);
  const chipOverflowCount = Math.max(0, chips.length - chipsMobile.length);

  return (
    <>
      <Toast show={copied}>URL copied</Toast>

      {/* HEADER (sticky) */}
      <header
        role="region"
        aria-label="Page header"
        className="sticky top-0 z-40 border-b"
        style={{
          background: TK.panel as string,
          borderColor: TK.borderSubtle as string,
          fontFamily:
            'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
        }}
      >
        {/* Constrain width to main panel header */}
        <div
          className="mx-auto w-full px-4"
          // style={{ maxWidth: 'var(--wr-content-max, 1200px)' }}
        >
          {/* Row 1: Breadcrumb (L) • Actions (R) */}
          <div className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <Breadcrumbs items={crumbItems} />
            </div>

            {/* Actions cluster (right, desktop) */}
            <div className="hidden items-center gap-3 md:flex">
              {/* Tracked */}
              <button
                type="button"
                role="switch"
                aria-checked={isTracked}
                aria-label="Tracked"
                title="Tracked"
                onClick={handleToggle}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2"
                style={{
                  borderColor: TK.border as string,
                  color: TK.textStrong as string,
                  cursor: 'pointer',
                  outlineColor: TK.focus as string,
                }}
              >
                <span
                  className={`inline-flex h-4 w-8 items-center rounded-full transition ${
                    isTracked
                      ? 'justify-end bg-[color:var(--wr-brand,#008CCD)]'
                      : 'justify-start bg-gray-300'
                  }`}
                >
                  <span className="mx-0.5 h-3.5 w-3.5 rounded-full bg-white shadow" />
                </span>
                <span className="text-xs">{saving ? 'Saving…' : 'Tracked'}</span>
                {saving ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : isTracked ? (
                  <Check size={16} color={TK.success as string} />
                ) : null}
              </button>

              {/* Open Page */}
              <IconGhostButton
                title="Open Page"
                onClick={openPage}
                className={absUrl ? '' : 'opacity-50 cursor-not-allowed'}
                brand
              >
                <ExternalLink size={20} color={TK.brand as string} />
              </IconGhostButton>

              {/* Assign Task */}
              <IconGhostButton
                title="Assign Task"
                onClick={() =>
                  onAssignTask?.(
                    {
                      absoluteUrl: absUrl,
                      relativePath: relPath,
                      faviconUrl,
                    } as Required<PageIdentity>,
                    { device, countryCode: cc }
                  )
                }
                brand
              >
                <ClipboardList size={20} color={TK.brand as string} />
              </IconGhostButton>

              {/* Export */}
              <ExportMenu onExport={(fmt) => onExport?.(fmt)} />

              {/* Close */}
            </div>

            {/* Mobile kebab */}
            <div className="md:hidden">
              <MobileActions
                onOpen={openPage}
                onAssign={() =>
                  onAssignTask?.(
                    {
                      absoluteUrl: absUrl,
                      relativePath: relPath,
                      faviconUrl,
                    } as Required<PageIdentity>,
                    { device, countryCode: cc }
                  )
                }
                onExport={() => onExport?.('csv')}
                onClose={() => onClose?.()}
              />
            </div>
          </div>

          {/* Row 2: URL Identity (L) • Chips (C) • (Mobile tracked inline) */}
          <div className="grid grid-cols-12 items-center gap-3 pb-2">
            {/* Left — URL row */}
            <div className="col-span-12 flex min-w-0 items-center gap-2 md:col-span-6">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0 rounded"
                />
              ) : (
                <div aria-hidden className="h-4 w-4 shrink-0 rounded bg-gray-200" />
              )}

              <button
                type="button"
                className="min-w-0 truncate text-left outline-none focus:ring-2"
                onClick={openPage}
                onKeyDown={(e) => e.key === 'Enter' && openPage()}
                title={absUrl || 'No URL'}
                style={{
                  color: TK.textStrong as string,
                  fontWeight: 600,
                  fontSize: 15,
                  lineHeight: 1.25,
                  cursor: 'pointer',
                  outlineColor: TK.focus as string,
                }}
              >
                <span className="hover:underline" style={{ color: TK.brand as string }}>
                  {relPathTrunc}
                </span>
              </button>

              <IconGhostButton
                title="Copy URL"
                onClick={copyUrl}
                className={absUrl ? '' : 'opacity-50 cursor-not-allowed'}
                brand
              >
                <Copy size={20} color={TK.brand as string} />
              </IconGhostButton>

              <IconGhostButton
                title="Open in new tab"
                onClick={openPage}
                className={absUrl ? '' : 'opacity-50 cursor-not-allowed'}
                brand
              >
                <ExternalLink size={20} color={TK.brand as string} />
              </IconGhostButton>
            </div>

            {/* Center — Chips */}
            <div className="col-span-12 hidden items-center gap-2 md:col-span-4 md:flex">
              {chips}
            </div>

            {/* Right — (mobile tracked switch inline, desktop handled above) */}
            <div className="col-span-12 flex items-center justify-end gap-2 md:hidden">
              <button
                type="button"
                role="switch"
                aria-checked={isTracked}
                aria-label="Tracked"
                onClick={handleToggle}
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs hover:bg-gray-50 focus:outline-none focus:ring-2"
                style={{
                  borderColor: TK.border as string,
                  color: TK.textStrong as string,
                  cursor: 'pointer',
                  outlineColor: TK.focus as string,
                }}
              >
                <span
                  className={`inline-flex h-4 w-8 items-center rounded-full transition ${
                    isTracked
                      ? 'justify-end bg-[color:var(--wr-brand,#008CCD)]'
                      : 'justify-start bg-gray-300'
                  }`}
                >
                  <span className="mx-0.5 h-3.5 w-3.5 rounded-full bg-white shadow" />
                </span>
                <span>{saving ? 'Saving…' : 'Tracked'}</span>
              </button>
            </div>

            {/* Mobile — chip overflow indicator */}
            <div className="col-span-12 flex items-center gap-2 md:hidden">
              <div className="flex flex-wrap items-center gap-2">
                {chipsMobile}
                {chipOverflowCount > 0 && <Chip title="More">+{chipOverflowCount}</Chip>}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs (below header; same width as header) — EXACTLY 4 tabs */}
<Tabs
  activeKey={activeTabKey}
  onChange={(k) => {
    setActiveTabKey(k);
    onTabChange?.(k);
  }}
/>
    </>
  );
}
