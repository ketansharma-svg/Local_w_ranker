'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Settings,
  Upload,
  MoreHorizontal,
  ChevronDown,
  Clock,
  Globe2,
  MonitorSmartphone,
  CalendarDays,
  Search,
  RefreshCw,
  Users,
  ExternalLink,
  Info,
  Building2,
  Shield,
} from 'lucide-react';
import Demo_ProfilesSummarySection from "./ProfilesSummarySection";
import Demo_ProfilesTrafficSection from "./ProfilesTrafficSection";
import KeywordsOverviewPanelMock from  "./KeywordsOverviewPanelMock";
import TopPagesAndContentSectionMock from "./TopPagesAndContent";
import BacklinkSummarySectionMock from "./BacklinkSummary"; 
import CompetitiveSummarySectionMock from "./CompetitiveSummary";
import AiOpportunitiesSectionMock from "./AiOpportunities";
import CompareSetupDrawerDemo from "./CompareSetupDrawer";
/**
 * Competitor Profiles — Panel Header (drop‑in)
 * - Inter / Inter Fallback fonts
 * - Branded (#008CCD) icons for section & action types
 * - Favicon for project/domain and competitors
 * - Modular Chips / Buttons / Toggle (all clickable elements use pointer cursor)
 * - Tailwind‑only; no external UI libs
 *
 * Props mirror the original snippet for painless replacement.
 */

/* ──────────────────────────────────────────────────────────── */
/* Design Tokens                                               */
/* ──────────────────────────────────────────────────────────── */
const TOKENS = {
  brand: '#008CCD',
  brandHover: '#007DB3',
  pastelBrand: '#E6F4FA',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#EFF0F6',
  chipBg: '#F5F7FA',
  chipHover: '#E5E7EB',
} as const;

/* ──────────────────────────────────────────────────────────── */
/* Utilities                                                   */
/* ──────────────────────────────────────────────────────────── */
const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ');

function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);
  return ref;
}

function daysUntil(dateISO?: string) {
  if (!dateISO) return null;
  const now = new Date();
  const end = new Date(dateISO);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

const faviconUrl = (domain?: string, size: 16 | 24 | 32 = 16) =>
  domain
    ? `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(
        domain.startsWith('http') ? domain : `https://${domain}`
      )}`
    : '';

/* ──────────────────────────────────────────────────────────── */
/* Primitives: Chips / Buttons / IconButton / Toggle           */
/* ──────────────────────────────────────────────────────────── */
function ChipButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  title,
  withCaret = true,
  activeBg = false,
}: {
  label: string;
  icon?: React.ComponentType<any>;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  withCaret?: boolean;
  activeBg?: boolean;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm cursor-pointer',
        activeBg ? 'bg-white' : 'bg-[var(--chip-bg)]',
        'hover:bg-[var(--chip-hover)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      style={
        {
          color: TOKENS.text,
          borderColor: TOKENS.border,
          ['--chip-bg' as any]: TOKENS.chipBg,
          ['--chip-hover' as any]: TOKENS.chipHover,
        } as React.CSSProperties
      }
    >
      {Icon && <Icon size={16} color={TOKENS.brand} />}
      <span className="truncate">{label}</span>
      {withCaret && <ChevronDown size={16} color="#9CA3AF" />}
    </button>
  );
}

function GhostButton({
  label,
  onClick,
  icon: Icon,
  title,
}: {
  label: string;
  onClick?: () => void;
  icon?: React.ComponentType<any>;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50 cursor-pointer"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      {Icon && <Icon size={16} color={TOKENS.brand} />}
      <span>{label}</span>
    </button>
  );
}

function IconOnly({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-md border cursor-pointer hover:bg-[var(--chip-hover)]"
      style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.text }}
    >
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Dropdowns: Device / Country / Date                          */
/* ──────────────────────────────────────────────────────────── */
type DeviceOpt = 'All' | 'Desktop' | 'Mobile';
type DateOpt = 'Last 7 Days' | 'Last 30 Days' | 'Last 90 Days' | 'Custom';

function DeviceDropdown({ value, onChange }: { value: DeviceOpt; onChange?: (v: DeviceOpt) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const opts: DeviceOpt[] = ['All', 'Desktop', 'Mobile'];
  return (
    <div className="relative" ref={ref}>
      <ChipButton
        label={`Device: ${value}`}
        icon={MonitorSmartphone}
        onClick={() => setOpen((s) => !s)}
        title="Select device"
      />
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[200px] rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {opts.map((o) => (
            <button
              key={o}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onChange?.(o);
                setOpen(false);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CountryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange?: (v: string) => void;
}) {
  // No emoji flags; show ISO code + name
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'IN', name: 'India' },
    { code: 'AU', name: 'Australia' },
  ];
  const current = countries.find((c) => c.code === value) ?? countries[0];
  return (
    <div className="relative" ref={ref}>
      <ChipButton
        label={`Country: ${current.code}`}
        icon={Globe2}
        onClick={() => setOpen((s) => !s)}
        title="Select country"
      />
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[220px] rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {countries.map((c) => (
            <button
              key={c.code}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onChange?.(c.code);
                setOpen(false);
              }}
            >
              <Globe2 size={14} color={TOKENS.brand} />
              <span>{c.name}</span>
              <span className="ml-auto text-[#9CA3AF]">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateDropdown({ value, onChange }: { value: DateOpt; onChange?: (v: DateOpt) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const opts: DateOpt[] = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Custom'];
  return (
    <div className="relative" ref={ref}>
      <ChipButton label={`Date: ${value}`} icon={CalendarDays} onClick={() => setOpen((s) => !s)} title="Select date range" />
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[220px] rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {opts.map((o) => (
            <button
              key={o}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onChange?.(o);
                setOpen(false);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Project Access & Selector (with favicons)                    */
/* ──────────────────────────────────────────────────────────── */
type ProjectAccessType = 'my' | 'shared';
function ProjectAccessChip({
  value,
  onChange,
}: {
  value: ProjectAccessType;
  onChange?: (v: ProjectAccessType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const label = value === 'my' ? 'Project Access: My Projects' : 'Project Access: Shared';
  return (
    <div className="relative" ref={ref}>
      <ChipButton
        label={label}
        icon={value === 'my' ? Building2 : Shield}
        onClick={() => setOpen((s) => !s)}
        title="Filter project scope"
      />
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[220px] rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              onChange?.('my');
              setOpen(false);
            }}
          >
            <Building2 size={16} color={TOKENS.brand} /> My Projects
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              onChange?.('shared');
              setOpen(false);
            }}
          >
            <Shield size={16} color={TOKENS.brand} /> Shared with me
          </button>
        </div>
      )}
    </div>
  );
}

type ProjectItem = { id: string; name: string; domain: string; href?: string };
function ProjectSelectorChip({
  currentLabel,
  allowSwitch,
  items,
  onSelect,
}: {
  currentLabel: string; // expected domain (e.g., "wranker.com")
  allowSwitch?: boolean;
  items?: ProjectItem[];
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={allowSwitch ? 'Switch Project' : 'Active Project'}
        onClick={() => allowSwitch && setOpen((s) => !s)}
        className={cx(
          'inline-flex items-center gap-2 h-9 px-3 rounded-md border',
          allowSwitch ? 'hover:bg-[var(--chip-hover)] cursor-pointer' : 'bg-[var(--chip-bg)] cursor-default'
        )}
        style={
          {
            borderColor: TOKENS.border,
            ['--chip-bg' as any]: TOKENS.chipBg,
            ['--chip-hover' as any]: TOKENS.chipHover,
          } as React.CSSProperties
        }
      >
        <img
          src={faviconUrl(currentLabel, 16)}
          alt=""
          className="h-4 w-4 rounded-sm"
        />
        <span className="text-[14px] font-medium text-[#1E3A8A]">{currentLabel}</span>
        {allowSwitch && <ChevronDown size={16} color="#9CA3AF" />}
      </button>
      {open && items && (
        <div
          className="absolute z-50 mt-2 min-w-[280px] overflow-hidden rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="border-b px-3 py-2 text-xs" style={{ borderColor: TOKENS.border, color: TOKENS.textMuted }}>
            Select Project
          </div>
          <div className="max-h-[280px] overflow-auto">
            {items.map((p) => (
              <button
                key={p.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onSelect?.(p.id);
                  setOpen(false);
                }}
              >
                <img src={faviconUrl(p.domain, 16)} alt="" className="h-4 w-4 rounded-sm" />
                <span className="font-medium">{p.name}</span>
                <span className="ml-auto text-[#9CA3AF]">{p.domain}</span>
                {p.href && <ExternalLink size={14} color="#9CA3AF" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Competitor Switcher (with favicons)                          */
/* ──────────────────────────────────────────────────────────── */
type CompetitorItem = { id: string; domain: string; nickname?: string; active?: boolean };
function CompetitorSwitcher({
  items,
  activeId,
  onChange,
}: {
  items: CompetitorItem[];
  activeId?: string;
  onChange?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  const active = items.find((c) => c.id === activeId) ?? items[0];
  const display = active ? (active.nickname ? `${active.nickname} (${active.domain})` : active.domain) : 'Select Competitor';
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter(
      (c) => (c.nickname || '').toLowerCase().includes(s) || c.domain.toLowerCase().includes(s)
    );
  }, [q, items]);

  return (
    <div className="relative" ref={ref}>
      <ChipButton
        label={`Competitor: ${display}`}
        icon={Users}
        onClick={() => setOpen((s) => !s)}
        title="Switch competitor profile"
      />
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[340px] overflow-hidden rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
            <Search size={14} color="#9CA3AF" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search competitors…"
              className="w-full text-sm outline-none placeholder:text-[#9CA3AF]"
            />
          </div>
          <div className="max-h-[300px] overflow-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onChange?.(c.id);
                  setOpen(false);
                }}
              >
                <img src={faviconUrl(c.domain, 16)} alt="" className="h-4 w-4 rounded-sm" />
                <span className="font-medium">{c.nickname || c.domain}</span>
                <span className="ml-auto text-[#9CA3AF]">{c.domain}</span>
                {c.active && (
                  <span className="ml-2 rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[11px]"
                    style={{ ['--chip-bg' as any]: TOKENS.chipBg, color: TOKENS.textMuted }}
                  >
                    Active
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm" style={{ color: TOKENS.textMuted }}>
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Compare Toggle                                               */
/* ──────────────────────────────────────────────────────────── */
function CompareToggle({
  checked,
  onChange,
  projectDomain,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  projectDomain?: string;
}) {
      const [drawerRow, setDrawerRow] = useState(false);
    const openDrawer = () => {
      setDrawerRow(true); // You can set the data here if needed
    };
  
    // This function will handle closing the drawer
    const closeDrawer = () => {
      setDrawerRow(false);
    };
      function Drawer({
        title,
        children,
        onClose,
      }: {
        title: string;
        children: React.ReactNode;
        onClose: () => void;
      }) {
        return (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />
            <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-base font-semibold"></div>
                <button
                  onClick={onClose}
                  className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              {children}
            </aside>
          </div>
        );
      }
  return (
    <>
                                        {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <CompareSetupDrawerDemo   />
                    </Drawer>
                  )} 
        <button
      type="button"
      onClick={openDrawer}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm bg-white hover:bg-gray-50 cursor-pointer"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
      title="Show side-by-side values vs your project"
    >
      <div className={cx('relative w-9 h-5 rounded-full transition-colors', checked ? 'bg-[color:var(--on)]' : 'bg-gray-300')}
        style={{ ['--on' as any]: TOKENS.brand } as React.CSSProperties}
      >
        <span
          className={cx(
            'absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          )}
        />
      </div>
      <span className="whitespace-nowrap">
        Compare with My Project{projectDomain ? ` (${projectDomain})` : ''}
      </span>
    </button>
    </>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Export Menu                                                  */
/* ──────────────────────────────────────────────────────────── */
function ExportMenu({ onExport }: { onExport?: (fmt: 'CSV' | 'PDF' | 'Link') => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <IconOnly title="Export Profile" onClick={() => setOpen((s) => !s)}>
        <Upload size={16} color={TOKENS.brand} />
      </IconOnly>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[160px] rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          {(['CSV', 'PDF', 'Link'] as const).map((x) => (
            <button
              key={x}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                onExport?.(x);
                setOpen(false);
              }}
            >
              Export {x}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Types                                                        */
/* ──────────────────────────────────────────────────────────── */
export type ProfilesHeaderFilters = {
  device: DeviceOpt;
  country: string;
  date: DateOpt;
};

/* ──────────────────────────────────────────────────────────── */
/* Main Component                                               */
/* ──────────────────────────────────────────────────────────── */
export function CompetitorProfilesHeader({
  // breadcrumb & title
  breadcrumb = ['SEO Dashboard', 'Competitor Intelligence', 'Competitor Profiles'],
  note = 'Single‑competitor deep dive • Header pattern aligned',

  // project scope
  projectAccess = 'my',
  onProjectAccessChange,
  projectDomain = 'wranker.com',
  allowProjectSwitch = true,
  projects = [],
  onProjectSwitch,

  // competitors
  competitors = [],
  activeCompetitorId,
  onCompetitorChange,

  // compare & filters
  compareEnabled = false,
  onCompareChange,
  filters: initialFilters = { device: 'All', country: 'US', date: 'Last 30 Days' },
  onFiltersChange,

  // actions
  onRefresh,
  onExport,
  onViewInTracker,
  onCompareInInsights,
  onOpenSettings,

  // misc
  resetAt,
}: {
  breadcrumb?: string[];
  note?: string;
  projectAccess?: ProjectAccessType;
  onProjectAccessChange?: (v: ProjectAccessType) => void;
  projectDomain?: string;
  allowProjectSwitch?: boolean;
  projects?: ProjectItem[];
  onProjectSwitch?: (projectId: string) => void;

  competitors?: CompetitorItem[];
  activeCompetitorId?: string;
  onCompetitorChange?: (id: string) => void;

  compareEnabled?: boolean;
  onCompareChange?: (v: boolean) => void;
  filters?: ProfilesHeaderFilters;
  onFiltersChange?: (next: ProfilesHeaderFilters) => void;

  onRefresh?: () => void;
  onExport?: (fmt: 'CSV' | 'PDF' | 'Link') => void;
  onViewInTracker?: () => void;
  onCompareInInsights?: () => void;
  onOpenSettings?: () => void;

  resetAt?: string;
}) {
  const [filters, setFilters] = useState<ProfilesHeaderFilters>(initialFilters);
  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters]); // eslint-disable-line

  const resetIn = daysUntil(resetAt);

  return (
    <header
      className="w-full text-[14px]"
      style={{
        color: TOKENS.text,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Row 0: breadcrumb + note */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <nav className="flex items-center gap-2 text-[14px] leading-tight" aria-label="Breadcrumb">
          {breadcrumb.map((b, i) => (
            <div key={b} className="flex items-center gap-2">
              <span
                className={cx(i < breadcrumb.length - 1 ? 'text-[#6B7280]' : 'font-semibold')}
                style={{ color: i < breadcrumb.length - 1 ? TOKENS.textMuted : TOKENS.text }}
              >
                {b}
              </span>
              {i < breadcrumb.length - 1 && <span className="text-[#9CA3AF]">›</span>}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-sm" style={{ color: TOKENS.textMuted }}>
          <Clock className="size-4" color={TOKENS.brand} />
          <span>
            {note}
            {typeof resetIn === 'number'
              ? ` • Resets in ${resetIn} days`
              : resetAt
              ? ` • Resets on ${resetAt}`
              : ''}
          </span>
        </div>
      </div>

      {/* Row 1: Title + competitor controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md"
            style={{ background: TOKENS.pastelBrand, border: `1px solid ${TOKENS.border}` }}
          >
            <Search size={16} color={TOKENS.brand} />
          </span>
          <h1 className="text-xl font-semibold">Competitor Profiles</h1>
          <span
            className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
            style={{ background: TOKENS.chipBg, color: TOKENS.textMuted }}
            title="This panel shows a deep dive for a single competitor"
          >
            <Info size={12} color={TOKENS.brand} />
            Single‑competitor deep dive
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CompetitorSwitcher items={competitors} activeId={activeCompetitorId} onChange={onCompetitorChange} />
          <CompareToggle checked={!!compareEnabled} onChange={onCompareChange} projectDomain={projectDomain} />
          <GhostButton label="Refresh Data" icon={RefreshCw} onClick={onRefresh} title="Pull latest profile data" />
        </div>
      </div>

      {/* Row 2: Project access + project chip + filters + tools */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Access Chip (before selector) */}
          <ProjectAccessChip value={projectAccess} onChange={onProjectAccessChange} />

          {/* Project Selection Chip (with favicon) */}
          <ProjectSelectorChip
            currentLabel={projectDomain}
            allowSwitch={allowProjectSwitch}
            items={projects}
            onSelect={onProjectSwitch}
          />

          {/* Filters */}
          <DeviceDropdown value={filters.device} onChange={(v) => setFilters((f) => ({ ...f, device: v }))} />
          <CountryDropdown value={filters.country} onChange={(v) => setFilters((f) => ({ ...f, country: v }))} />
          <DateDropdown value={filters.date} onChange={(v) => setFilters((f) => ({ ...f, date: v }))} />
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu onExport={onExport} />
          <GhostButton label="View in Tracker" onClick={onViewInTracker} icon={ExternalLink} />
          <GhostButton label="Compare in Insights" onClick={onCompareInInsights} icon={ExternalLink} />
          <IconOnly title="Settings" onClick={onOpenSettings}>
            <Settings size={16} color={TOKENS.brand} />
          </IconOnly>
          <div className="relative">
            <IconOnly title="More">
              <MoreHorizontal size={16} color={TOKENS.brand} />
            </IconOnly>
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="mt-3 border-b" style={{ borderColor: TOKENS.border }} />
    </header>
  );
}

/* ──────────────────────────────────────────────────────────── */
/* Optional Demo Wrapper (remove in production)                 */
/* ──────────────────────────────────────────────────────────── */

export default function Demo_CompetitorProfilesHeader() {
  const [filters, setFilters] = useState<ProfilesHeaderFilters>({ device: "All", country: "US", date: "Last 30 Days" });
  const [projectAccess, setProjectAccess] = useState<ProjectAccessType>("my");
  const [project, setProject] = useState("wranker.com");
  const [activeComp, setActiveComp] = useState("c1");
  const [compare, setCompare] = useState(false);

  const projects: ProjectItem[] = [
    { id: "p1", name: "WrProj • wranker.com", domain: "wranker.com" },
    { id: "p2", name: "Client A • example.com", domain: "example.com" },
  ];

  const competitors: CompetitorItem[] = [
    { id: "c1", domain: "comp1.com", nickname: "Comp One", active: true },
    { id: "c2", domain: "comp2.io", nickname: "Comp Two" },
    { id: "c3", domain: "alpha.dev" },
  ];

  return (
    <div className="w-full bg-white">
      <div className="mx-auto w-full px-4 py-3">
        <CompetitorProfilesHeader
          breadcrumb={["SEO Dashboard", "Competitor Intelligence", "Competitor Profiles"]}
          note="Single‑competitor deep dive • Header pattern aligned"
          projectAccess={projectAccess}
          onProjectAccessChange={setProjectAccess}
          projectDomain={project}
          allowProjectSwitch
          projects={projects}
          onProjectSwitch={(id) => {
            const p = projects.find((x) => x.id === id);
            if (p) setProject(p.domain);
          }}
          competitors={competitors}
          activeCompetitorId={activeComp}
          onCompetitorChange={(id) => setActiveComp(id)}
          compareEnabled={compare}
          onCompareChange={setCompare}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={() => alert("Refreshed profile")}
          onExport={(fmt) => alert(`Export Profile: ${fmt}`)}
          onViewInTracker={() => alert("Open Tracker")}
          onCompareInInsights={() => alert("Open Insights (comparison)")}
          onOpenSettings={() => alert("Open Settings")}
        />

        {/* demo body */}
        <Demo_ProfilesSummarySection />
        <Demo_ProfilesTrafficSection />
        <KeywordsOverviewPanelMock />
        <TopPagesAndContentSectionMock />
        <BacklinkSummarySectionMock />
        <CompetitiveSummarySectionMock />
        <AiOpportunitiesSectionMock />
      </div>
    </div>
  );
}
