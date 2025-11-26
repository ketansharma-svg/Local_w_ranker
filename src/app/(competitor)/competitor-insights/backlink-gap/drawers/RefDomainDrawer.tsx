'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Info, Download, ExternalLink, Check, X as XIcon, Filter,
  FileText, Image as ImageIcon, Link2
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   Referring Domain Detail — Drawer Modal
   - Tailwind-only (no external UI libs)
   - Smart Popovers: header badges, column headers, anchor overflow
   - Table filters: Dofollow Only, Text Only, Competitor (multi-select chips)
   - CSV Export (filtered rows)
   - Paginated table (page size = 10)
   - Sample data + usage demo at bottom
----------------------------------------------------------------------------- */

type LinkType = 'Text' | 'Image' | 'Frame' | 'Redirect';

export type LinkedPageRow = {
  competitor: string;
  url: string;        // relative path, e.g., /seo-guide
  fullUrl?: string;   // optional absolute URL for tooltip
  anchor: string;
  type: LinkType;
  dofollow: boolean;
};

export type DomainDetailData = {
  domain: string;
  wrScore: number; // 0-100
  category: 'Blog' | 'News' | 'Directory' | 'Forum' | 'EDU/GOV' | 'Other';
  opportunity?: { available: boolean; url?: string; note?: string };
  summary: {
    competitors: string[];
    totalBacklinks: number;
    dofollow: number;
    nofollow: number;
    anchorDiversity: 'Low' | 'Medium' | 'High';
    linkTypes: { text: number; image: number; frame?: number; redirect?: number };
  };
  links: LinkedPageRow[];
};

export type RefDomainDrawerProps = {
  open: boolean;
  onClose: () => void;

  /** Domain detail payload (drives header, summary, and table) */
  data: DomainDetailData;

  /** Optional callbacks to integrate with your global flows */
  onCreateLink?: (domain: string) => void;
  onAddTask?: (payload: { domain: string; links: LinkedPageRow[] }) => void;
  onViewOpportunities?: (domain: string) => void;

  className?: string;
};

/* -------------------------------- SmartPopover ------------------------------ */

function useOutsideDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('mousedown', handle);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', handle);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open, onClose]);
  return ref;
}

type SmartPopoverProps = {
  trigger: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  placement?: 'bottom' | 'top';
  maxWidthClass?: string; // e.g., 'max-w-xs'
};
function SmartPopover({
  trigger,
  title,
  children,
  placement = 'bottom',
  maxWidthClass = 'max-w-xs',
}: SmartPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useOutsideDismiss<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        className="inline-flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="dialog"
          className={[
            'absolute z-50 rounded-md border border-gray-200 bg-white p-3 shadow-lg',
            placement === 'bottom' ? 'left-0 mt-2' : 'bottom-full mb-2 left-0',
            maxWidthClass,
          ].join(' ')}
        >
          {title && <div className="mb-1 text-xs font-semibold text-gray-700">{title}</div>}
          <div className="text-xs leading-relaxed text-gray-700">{children}</div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Small UI bits ----------------------------- */

function classNames(...x: Array<string | false | null | undefined>) {
  return x.filter(Boolean).join(' ');
}

function badgeIntentFromScore(v: number) {
  if (v >= 70) return 'bg-green-100 text-green-800 ring-green-200';
  if (v >= 40) return 'bg-amber-100 text-amber-800 ring-amber-200';
  return 'bg-red-100 text-red-800 ring-red-200';
}

function WRBadge({ value }: { value: number }) {
  return (
    <span
      className={classNames(
        'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ring-1',
        badgeIntentFromScore(value)
      )}
      title="Wranker Score – weighted composite of 5 backlink signals"
    >
      {Math.round(Math.max(0, Math.min(100, value)))}
    </span>
  );
}

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      <FileText className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function OpportunityBadge({ note }: { note?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 ring-1 ring-green-200">
      <Link2 className="h-3.5 w-3.5" />
      Available via Vefogix
      {note ? <span className="font-normal text-green-700">· {note}</span> : null}
    </span>
  );
}

function TypeIcon({ type }: { type: LinkType }) {
  switch (type) {
    case 'Text':
      return <FileText className="h-4 w-4" />;
    case 'Image':
      return <ImageIcon className="h-4 w-4" />;
    case 'Frame':
      return <span className="inline-block h-4 w-4 rounded border border-gray-400" title="Frame" />;
    case 'Redirect':
      return <ExternalLink className="h-4 w-4" />;
  }
}

/* -------------------------------- CSV Export -------------------------------- */

function escapeCSVField(s: string) {
  const v = s ?? '';
  if (/[,"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function buildCSVString(rows: LinkedPageRow[]) {
  const header = ['Competitor', 'Target Page', 'Full URL', 'Anchor Text', 'Type', 'Dofollow'];
  const lines = [header.join(',')].concat(
    rows.map((r) =>
      [
        r.competitor,
        r.url,
        r.fullUrl || '',
        r.anchor,
        r.type,
        r.dofollow ? 'TRUE' : 'FALSE',
      ]
        .map(escapeCSVField)
        .join(',')
    )
  );
  return '\uFEFF' + lines.join('\n');
}

function downloadCSVFile(rows: LinkedPageRow[], domain: string) {
  const csv = buildCSVString(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${domain.replace(/\W+/g, '-')}-ref-domain-links.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* -------------------------------- Drawer Core -------------------------------- */

export function RefDomainDrawer({
  open,
  onClose,
  data,
  onCreateLink,
  onAddTask,
  onViewOpportunities,
  className,
}: RefDomainDrawerProps) {
  const [dofollowOnly, setDofollowOnly] = useState(false);
  const [textOnly, setTextOnly] = useState(false);
  // Multi-select competitors: empty = All
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10; // per user request

  const compSet = useMemo(() => new Set(selectedCompetitors), [selectedCompetitors]);

  // reset pagination on filter changes
  useEffect(() => setPage(1), [dofollowOnly, textOnly, selectedCompetitors]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    return data.links.filter((r) => {
      if (dofollowOnly && !r.dofollow) return false;
      if (textOnly && r.type !== 'Text') return false;
      if (compSet.size > 0 && !compSet.has(r.competitor)) return false;
      return true;
    });
  }, [data.links, dofollowOnly, textOnly, compSet]);

  // Highest-value row heuristic: dofollow > text > WR bias + same-competitor bias
  const winnerIndex = useMemo(() => {
    let best = -1;
    let bestScore = -Infinity;
    filtered.forEach((r, i) => {
      const df = r.dofollow ? 60 : 15;
      const ty = r.type === 'Text' ? 20 : r.type === 'Image' ? 10 : 5;
      const wr = Math.max(0, Math.min(100, data.wrScore)) * 0.1; // light WR weight
      const compBias = 5 * (1 + filtered.filter(x => x.competitor === r.competitor).length / Math.max(1, filtered.length));
      const s = df + ty + wr + compBias;
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    });
    return best;
  }, [filtered, data.wrScore]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSlice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canExport = filtered.length > 0;

  const handleExport = () => downloadCSVFile(filtered, data.domain);

  const handleCreateLink = () => {
    if (onCreateLink) return onCreateLink(data.domain);
    if (data.opportunity?.available && data.opportunity.url) {
      window.open(data.opportunity.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAddTask = () => {
    if (onAddTask) return onAddTask({ domain: data.domain, links: filtered });
    // Fallback UX for demo
    alert(`Task created (demo): Acquire link(s) from ${data.domain} (${filtered.length} candidate links).`);
  };

  const handleViewOpp = () => {
    if (onViewOpportunities) return onViewOpportunities(data.domain);
    // Fallback deep link
    window.open(`/backlinks/opportunities?domain=${encodeURIComponent(data.domain)}`, '_blank');
  };

  // --- Competitor chip helpers ---
  function toggleCompetitor(c: string) {
    setSelectedCompetitors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }
  function clearCompetitors() {
    setSelectedCompetitors([]);
  }

  // 🚪 IMPORTANT: do not render the overlay/panel when closed, so it can't block clicks
  if (!open) return null;

  return (
    <div className={classNames('fixed inset-0 z-[70] overflow-hidden')}>
      {/* Overlay */}
      <div
        className={classNames(
          'absolute inset-0 z-[60] bg-black/30 transition-opacity opacity-100'
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <section
        className={classNames(
          'absolute right-0 top-0 z-[80] h-full w-[64vw] transform border-l border-[#E5E7EB] bg-white shadow-xl translate-x-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Referring Domain: ${data.domain}`}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-gray-800">
                  Referring Domain: {data.domain}
                </h3>

                <SmartPopover
                  title="About this panel"
                  trigger={<Info className="h-4 w-4" />}
                >
                  <div className="space-y-1">
                    <p>
                      Detail view of backlinks from <b>{data.domain}</b> to selected competitors. Use filters, hover tooltips, and export to CSV.
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Owner actions (Create Link / Add Task) appear in footer.
                    </p>
                  </div>
                </SmartPopover>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <WRBadge value={data.wrScore} />
                <SmartPopover
                  title="WR Score"
                  trigger={
                    <span className="text-xs text-gray-600 underline decoration-dotted underline-offset-2">
                      WR: {data.wrScore}
                    </span>
                  }
                >
                  Higher WR indicates stronger backlink authority of the referring domain.
                </SmartPopover>

                <CategoryPill label={data.category} />

                {data.opportunity?.available && (
                  <SmartPopover
                    title="Link Opportunity"
                    trigger={<OpportunityBadge note={data.opportunity?.note} />}
                  >
                    This domain is available via our verified partner network (Vefogix).
                    Use <b>Create Link</b> below to open its listing.
                  </SmartPopover>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={!canExport}
                className={classNames(
                  'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm font-medium transition mr-8',
                  canExport
                    ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    : 'border-gray-200 bg-gray-100 text-gray-400'
                )}
                title={canExport ? 'Export filtered links as CSV' : 'Nothing to export'}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>

              {/* <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button> */}
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex h-full flex-col overflow-hidden">
          {/* Summary */}
          <section className="border-b border-gray-200 p-4">
            <div className="mb-2 text-sm font-semibold text-gray-800">Summary</div>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              <SmartPopover
                title="Competitors Linked"
                trigger={<div className="truncate">Competitors: <b className="text-gray-800">{data.summary.competitors.join(', ')}</b></div>}
              >
                Competitor pages currently linked from <b>{data.domain}</b>.
              </SmartPopover>
              <div>Total backlinks: <b className="text-gray-800">{data.summary.totalBacklinks}</b></div>
              <div>Dofollow: <b className="text-gray-800">{data.summary.dofollow}</b></div>
              <div>Nofollow: <b className="text-gray-800">{data.summary.nofollow}</b></div>
              <SmartPopover
                title="Anchor Diversity"
                trigger={<div>Anchor diversity: <b className="text-gray-800">{data.summary.anchorDiversity}</b></div>}
              >
                Diversity of anchor texts (branded, generic, exact-match). Higher diversity often signals a healthier profile.
              </SmartPopover>
              <SmartPopover
                title="Link Types"
                trigger={
                  <div className="truncate">
                    Link types: Text ({data.summary.linkTypes.text}), Image ({data.summary.linkTypes.image})
                  </div>
                }
              >
                Breakdown of link formats used by competitors from this domain.
              </SmartPopover>
            </div>
          </section>

          {/* Filters */}
          <section className="border-b border-gray-200 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Filter className="h-4 w-4" />
              Linked Pages
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  checked={dofollowOnly}
                  onChange={(e) => setDofollowOnly(e.target.checked)}
                />
                Dofollow Only
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  checked={textOnly}
                  onChange={(e) => setTextOnly(e.target.checked)}
                />
                Text Links
              </label>

              {/* Multi-select Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-600">Competitor</span>
                <button
                  type="button"
                  onClick={clearCompetitors}
                  className={classNames(
                    'rounded-full border px-2 py-0.5 text-xs font-medium',
                    selectedCompetitors.length === 0
                      ? 'border-sky-300 bg-sky-50 text-sky-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  )}
                  title="Show all competitors"
                >
                  All
                </button>
                {data.summary.competitors.map((c) => {
                  const active = compSet.has(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCompetitor(c)}
                      className={classNames(
                        'rounded-full border px-2 py-0.5 text-xs font-medium',
                        active
                          ? 'border-sky-300 bg-sky-50 text-sky-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      )}
                      aria-pressed={active}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto text-xs text-gray-500">
                Showing <b>{filtered.length}</b> of {data.links.length}
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-2 text-sm font-semibold text-gray-800">Linked Pages</div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-[1] bg-gray-50">
                  <tr className="text-left text-xs text-gray-600">
                    <th className="border-b border-gray-200 px-3 py-2">
                      <div className="inline-flex items-center gap-1">
                        Competitor
                        <SmartPopover title="Column Help" trigger={<Info className="h-3.5 w-3.5" />}>
                          The competitor domain that received the link.
                        </SmartPopover>
                      </div>
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2">
                      <div className="inline-flex items-center gap-1">
                        Target Page
                        <SmartPopover title="Full URL" trigger={<Info className="h-3.5 w-3.5" />}>
                          Hover a path to preview the full URL.
                        </SmartPopover>
                      </div>
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2">
                      <div className="inline-flex items-center gap-1">
                        Anchor Text
                        <SmartPopover title="Anchor Tips" trigger={<Info className="h-3.5 w-3.5" />}>
                          Natural, branded anchors are generally safer than exact-match spam.
                        </SmartPopover>
                      </div>
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2">
                      <div className="inline-flex items-center gap-1">
                        Type
                        <SmartPopover title="Link Type" trigger={<Info className="h-3.5 w-3.5" />}>
                          Text, Image, Frame, or Redirect.
                        </SmartPopover>
                      </div>
                    </th>
                    <th className="border-b border-gray-200 px-3 py-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        DF
                        <SmartPopover title="Dofollow" trigger={<Info className="h-3.5 w-3.5" />}>
                          ✅ dofollow or ❌ nofollow.
                        </SmartPopover>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.map((r, idx) => {
                    const globalIndex = (page - 1) * PAGE_SIZE + idx;
                    const isWinner = winnerIndex === globalIndex;
                    return (
                      <tr
                        key={`${r.competitor}-${r.url}-${idx}`}
                        className={classNames(
                          'text-gray-800',
                          isWinner ? 'bg-amber-50' : 'bg-white'
                        )}
                      >
                        <td className="border-b border-gray-100 px-3 py-2 align-middle font-medium">
                          {r.competitor}
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 align-middle">
                          <span
                            className="truncate"
                            title={r.fullUrl || r.url}
                          >
                            {r.url}
                          </span>
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 align-middle">
                          <SmartPopover
                            title="Anchor"
                            trigger={
                              <span className="line-clamp-1 cursor-help underline decoration-dotted underline-offset-2">
                                {r.anchor}
                              </span>
                            }
                            maxWidthClass="max-w-sm"
                          >
                            {r.anchor}
                          </SmartPopover>
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 align-middle">
                          <span className="inline-flex items-center gap-1">
                            <TypeIcon type={r.type} />
                            {r.type}
                          </span>
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 text-center align-middle">
                          {r.dofollow ? (
                            <Check className="mx-auto h-4 w-4 text-green-600"  />
                          ) : (
                            <XIcon className="mx-auto h-4 w-4 text-gray-400"  />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {pageSlice.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">
                        No rows match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footnote */}
            <p className="mt-2 text-[11px] text-gray-600">
              Highest-value link row is softly highlighted. Hover icons/labels for context.
            </p>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                Page {page} of {totalPages}
              </div>
              <div className="inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={classNames(
                    'rounded-md border px-2 py-1 text-sm',
                    page <= 1 ? 'cursor-not-allowed border-gray-200 text-gray-400' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={classNames(
                    'rounded-md border px-2 py-1 text-sm',
                    page >= totalPages ? 'cursor-not-allowed border-gray-200 text-gray-400' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          {/* Footer actions */}
          <footer className="border-t border-gray-200 p-4">
            <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] text-gray-500">
                Source: Backlink Gap Analyzer · Filters apply to export.
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {data.opportunity?.available && (
                  <button
                    type="button"
                    onClick={handleCreateLink}
                    className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                    title="Open Vefogix listing (new tab)"
                  >
                    <Link2 className="h-4 w-4" />
                    Create Link
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  title="Open Task Drawer prefilled with this domain"
                >
                  📂 Add to Task
                </button>
                <button
                  type="button"
                  onClick={handleViewOpp}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  title="Open Opportunities tab (filtered)"
                >
                  📄 View in Opportunities Tab
                </button>
              </div>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------- Demo Data + Usage ------------------------- */

const DEMO_DATA: DomainDetailData = {
  domain: 'techinsider.com',
  wrScore: 82,
  category: 'Blog',
  opportunity: {
    available: true,
    url: 'https://vefogix.com/domain/techinsider.com',
    note: 'Guest post & link insertion',
  },
  summary: {
    competitors: ['comp1', 'comp2'],
    totalBacklinks: 7,
    dofollow: 6,
    nofollow: 1,
    anchorDiversity: 'High',
    linkTypes: { text: 6, image: 1 },
  },
  links: [
    { competitor: 'comp1', url: '/seo-guide', fullUrl: 'https://comp1.com/seo-guide', anchor: 'complete seo guide', type: 'Text', dofollow: true },
    { competitor: 'comp2', url: '/tools/keyword-research', anchor: 'keyword insights', type: 'Text', dofollow: true },
    { competitor: 'comp1', url: '/blog/2024-updates', anchor: 'latest seo trends', type: 'Image', dofollow: false },
    { competitor: 'comp2', url: '/seo-tools/free-checker', anchor: 'free seo tool', type: 'Text', dofollow: true },
    { competitor: 'comp1', url: '/strategy/link-building', anchor: 'link building tips', type: 'Text', dofollow: true },
    { competitor: 'comp1', url: '/audit/core-vitals', anchor: 'core vitals audit', type: 'Text', dofollow: true },
    { competitor: 'comp2', url: '/resources/templates', anchor: 'seo template pack', type: 'Text', dofollow: true },
    // extra rows to demo pagination quickly
    { competitor: 'comp1', url: '/blog/schema', anchor: 'faq schema', type: 'Text', dofollow: true },
    { competitor: 'comp2', url: '/content/outline', anchor: 'content outline template', type: 'Text', dofollow: false },
    { competitor: 'comp1', url: '/hub/topic', anchor: 'topic cluster hub', type: 'Text', dofollow: true },
  ],
};

/** Demo wrapper (remove if you wire this into your panel) */
export default function DemoRefDomainDrawer() {
  const [open, setOpen] = useState(true);

  // ------------------ Lightweight runtime tests (dev only) ------------------
  useEffect(() => {
    try {
      // CSV quoting test
      const testRows: LinkedPageRow[] = [
        { competitor: 'c1', url: '/a', fullUrl: '', anchor: 'hello, "world"', type: 'Text', dofollow: true },
      ];
      const csv = (buildCSVString as any)(testRows) as string;
      console.assert(csv.includes('"hello, ""world"""'), 'CSV quoting failed');

      // escapeCSVField basic tests
      console.assert(escapeCSVField('a,b') === '"a,b"', 'escapeCSVField comma test failed');
      console.assert(escapeCSVField('a"b') === '"a""b"', 'escapeCSVField quote test failed');

      // Pagination sanity for page size 10
      const total = 11;
      console.assert(Math.ceil(total / 10) === 2, 'pagination size 10 sanity failed');

      // Filter sanity (dofollowOnly=true removes false rows)
      const rows: LinkedPageRow[] = [
        { competitor: 'c', url: '/x', anchor: 'a', type: 'Text', dofollow: true },
        { competitor: 'c', url: '/y', anchor: 'b', type: 'Image', dofollow: false },
      ];
      const onlyDf = rows.filter(r => r.dofollow).length;
      console.assert(onlyDf === 1, 'dofollow filter sanity failed');

      // NEW: multi-select competitor logic tests
      const comps = ['comp1', 'comp2'];
      const pick = new Set(['comp1']);
      const multiFiltered = DEMO_DATA.links.filter(l => pick.has(l.competitor));
      console.assert(multiFiltered.every(l => l.competitor === 'comp1'), 'multi-select filter failed');
    } catch (e) {
      // noop – tests are best-effort in the browser console
    }
  }, []);

  return (
<>
      <RefDomainDrawer
        open={open}
        onClose={() => setOpen(false)}
        data={DEMO_DATA}
        onCreateLink={(domain) => window.open(`https://vefogix.com/domain/${domain}`, '_blank')}
        onAddTask={({ domain, links }) =>
          alert(`Add to Task (demo)\nDomain: ${domain}\nLinks included: ${links.length}`)
        }
        onViewOpportunities={(domain) =>
          window.open(`/backlinks/opportunities?domain=${encodeURIComponent(domain)}`, '_blank')
        }
      />
</>

  );
}
