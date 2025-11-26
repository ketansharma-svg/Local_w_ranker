'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Info as InfoIcon,
  ChevronDown,
  ExternalLink,
  Search as SearchIcon,
  X,
  FileText,
  Download,
  Columns3,
  Star,
  HelpCircle,
  FileArchive,
  Image as ImageIcon,
  PlayCircle,
  Newspaper,
} from 'lucide-react';

/**
 * Wranker • Competitor Profiles — Section 4:
 * Top Pages & Content Structure Overview (Top 10)
 *
 * Hardened to avoid "Element type is invalid" by safely falling back to FileText
 * whenever a SERP icon is missing in the installed lucide-react version.
 *
 * Spec satisfied:
 * - Inter / Inter Fallback font family applied
 * - No emoji; branded (#008CCD) icons for title & actions
 * - Favicons for project/competitor
 * - Modular chips, buttons, toggle; pointer cursors
 * - Colored SERP feature icons; robust to icon availability
 * - Table header font-size tuned; sticky first col; no trailing gutter on scroll
 */

/* -------------------------------- TOKENS -------------------------------- */
const TOKENS = {
  brand: '#008CCD',        // branded blue
  brandHover: '#007DB3',
  compBlue: '#0077FF',     // competitor primary
  pastelBlue: '#D9EEF8',
  surface: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#EFF0F6',
  chipBg: '#F5F7FA',
} as const;

/* ------------------------------ Types/Models ----------------------------- */
type SerpFlag = 'FS' | 'PAA' | 'SITELINKS' | 'IMAGE' | 'VIDEO' | 'TOP_STORIES';

type PageRow = {
  urlPath: string;
  fullUrl: string;
  pageTitle?: string;
  wordCount?: number;
  keywordCount: number;
  serpFlags: SerpFlag[];
  visibilityPct?: number; // 0..100
  yourMatch?: {
    urlPath: string;
    fullUrl: string;
    wordCount?: number;
    keywordCount?: number;
    serpFlags?: SerpFlag[];
    visibilityPct?: number;
    matchScore?: number; // 0..100
  };
  topKeywordsForTask?: string[];
};

/* ----------------------------- Helpers / Utils --------------------------- */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}
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
const faviconUrl = (domain?: string, size: 16 | 24 = 16) =>
  domain
    ? `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(
        domain.startsWith('http') ? domain : `https://${domain}`
      )}`
    : '';

/** Robustly return a valid React component for an icon. */
type AnyIcon = React.ComponentType<{ size?: number; className?: string }>;
function getIconSafe(maybe: any): AnyIcon {
  return typeof maybe === 'function' ? (maybe as AnyIcon) : FileText;
}

/* ------------------------- SERP feature meta (icons) ------------------------- */
const SERP_META: Record<SerpFlag, { label: string; color: string; Icon: AnyIcon }> = {
  FS:         { label: 'Featured Snippet',     color: '#F59E0B', Icon: getIconSafe(Star) },
  PAA:        { label: 'People Also Ask',      color: '#8B5CF6', Icon: getIconSafe(HelpCircle) },
  SITELINKS:  { label: 'Sitelinks',            color: '#3B82F6', Icon: getIconSafe(FileArchive) },     // falls back if missing
  IMAGE:      { label: 'Image Pack',           color: '#06B6D4', Icon: getIconSafe(ImageIcon) },
  VIDEO:      { label: 'Video',                color: '#F43F5E', Icon: getIconSafe(PlayCircle) },
  TOP_STORIES:{ label: 'Top Stories',          color: '#10B981', Icon: getIconSafe(Newspaper) },    // falls back if missing
};

/* ------------------------------ Primitives ------------------------------ */
const Chip: React.FC<React.PropsWithChildren<{ title?: string }>> = ({ children, title }) => (
  <span
    title={title}
    className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-default"
    style={{ background: TOKENS.chipBg, borderColor: TOKENS.border, color: TOKENS.text }}
  >
    {children}
  </span>
);

function ButtonGhost(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer ${className || ''}`}
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    />
  );
}

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
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 h-9 rounded-md border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
      aria-pressed={checked}
    >
      <span className={`relative h-5 w-9 rounded-full ${checked ? 'bg-[color:var(--on)]' : 'bg-gray-300'}`} style={{ ['--on' as any]: TOKENS.brand }}>
        <span className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}

function InfoPopover({ label, side = 'bottom' }: { label: string; side?: 'bottom' | 'top' }) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} color="#9CA3AF" className="ml-1" />
      <span
        role="tooltip"
        className={classNames(
          'invisible group-hover:visible absolute z-50 w-64 rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow',
          side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
        )}
        style={{ left: '0', borderColor: TOKENS.border }}
      >
        {label}
      </span>
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = clamp(value);
  return (
    <div className="w-full h-2 rounded bg-[#E5E7EB] overflow-hidden" title={`${pct}%`}>
      <div className="h-full rounded transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Drawer({
  open,
  onClose,
  title,
  children,
  width = 560,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string; width?: number }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full bg-white shadow-xl flex flex-col"
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TOKENS.border }}>
          <h4 className="text-[16px] font-semibold">{title}</h4>
          <button
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100 cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

/* --------------------------------- Export -------------------------------- */
function exportCSV(rows: PageRow[], includeCompare: boolean) {
  const esc = (s: string | number | null | undefined) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const hdr = [
    'URL',
    'Title',
    'Word Count',
    'Keyword Count',
    'SERP Features',
    'Visibility %',
    ...(includeCompare ? ['Your URL', 'Your Word Count', 'Your Keyword Count', 'Your SERP Features', 'Your Visibility %'] : []),
  ];
  const lines = rows.map((r) =>
    [
      r.fullUrl,
      r.pageTitle || '',
      r.wordCount ?? '',
      r.keywordCount,
      r.serpFlags.join('|'),
      r.visibilityPct ?? '',
      ...(includeCompare
        ? [
            r.yourMatch?.fullUrl || '',
            r.yourMatch?.wordCount ?? '',
            r.yourMatch?.keywordCount ?? '',
            (r.yourMatch?.serpFlags || []).join('|'),
            r.yourMatch?.visibilityPct ?? '',
          ]
        : []),
    ]
      .map(esc)
      .join(',')
  );
  const csv = [hdr.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'top-pages.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------------------- SERP flags cell ---------------------------- */
function SerpPill({ flag, you = false }: { flag: SerpFlag; you?: boolean }) {
  const cfg = SERP_META[flag];
  const IconC = getIconSafe(cfg?.Icon);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-1.5 py-[2px] text-[11px]"
      title={cfg?.label || flag}
      style={{
        borderColor: `${cfg?.color || '#CBD5E1'}40`,
        background: `${cfg?.color || '#CBD5E1'}14`,
        color: you ? TOKENS.brand : (cfg?.color || '#64748B'),
      }}
    >
      <IconC size={12} />
      {flag}
    </span>
  );
}

function SerpFlagsCell({ flags, onClick, you = false }: { flags: SerpFlag[]; onClick?: () => void; you?: boolean }) {
  const shown = flags.slice(0, 4);
  const rest = flags.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((f) => (
        <SerpPill key={f} flag={f} you={you} />
      ))}
      {rest > 0 && (
        <span className="rounded bg-[#F5F7FA] px-1.5 py-[2px] text-[11px] text-[#374151]" title={`${rest} more`}>
          +{rest}
        </span>
      )}
      <button
        type="button"
        className="ml-1 inline-flex items-center rounded px-1 text-[11px] text-[#6B7280] hover:underline cursor-pointer"
        onClick={onClick}
        title="Open SERP Snapshot"
      >
        Snapshot <ExternalLink size={12} className="ml-1" />
      </button>
    </div>
  );
}

/* ------------------------------- Drawers -------------------------------- */
type KWRow = { kw: string; compPos: number; youPos?: number; volume: number; intent: 'Info' | 'Nav' | 'Comm' | 'Trans' };
function makeKW(page: PageRow, withYou = true): KWRow[] {
  const seeds = (page.topKeywordsForTask?.length
    ? page.topKeywordsForTask
    : ['seo audit checklist', 'technical seo', 'best seo tools', 'schema markup', 'backlink analyzer', 'content strategy'])!;
  const intents = ['Info', 'Nav', 'Comm', 'Trans'] as const;
  const out: KWRow[] = [];
  for (let i = 0; i < 20; i++) {
    const s = seeds[i % seeds.length];
    out.push({
      kw: i % 3 === 0 ? `${s}` : i % 3 === 1 ? `${s} 2025` : `how to ${s.split(' ')[0]}`,
      compPos: 1 + Math.floor(Math.random() * 25),
      youPos: withYou && Math.random() > 0.25 ? 5 + Math.floor(Math.random() * 50) : undefined,
      volume: 500 + Math.floor(Math.random() * 15000),
      intent: intents[Math.floor(Math.random() * intents.length)],
    });
  }
  return out.sort((a, b) => a.compPos - b.compPos).slice(0, 15);
}

function KeywordDrawer({ open, onClose, page, compareOn }: { open: boolean; onClose: () => void; page: PageRow | null; compareOn: boolean }) {
  const rows = useMemo(() => (page ? makeKW(page, compareOn) : []), [page, compareOn]);
  return (
    <Drawer open={open} onClose={onClose} title={page ? `Keywords — ${page.urlPath}` : 'Keywords'}>
      <div className="mb-3 text-sm" style={{ color: TOKENS.muted }}>
        Top terms by volume and position (current filters).
      </div>
      <div className="overflow-auto rounded-[6px] border" style={{ borderColor: TOKENS.border }}>
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB]">
            <tr className="text-left">
              <th className="px-3 py-2 text-[13px] font-semibold">Keyword</th>
              <th className="px-3 py-2 text-right text-[13px] font-semibold">Position (Comp)</th>
              <th className="px-3 py-2 text-right text-[13px] font-semibold">Volume</th>
              <th className="px-3 py-2 text-[13px] font-semibold">Intent</th>
              {compareOn && <th className="px-3 py-2 text-right text-[13px] font-semibold">Your Pos</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.kw} className="border-t" style={{ borderColor: TOKENS.border }}>
                <td className="px-3 py-2">{r.kw}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.compPos}</td>
                <td className="px-3 py-2 text-right tabular-nums">{nf(r.volume)}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background:
                          r.intent === 'Info' ? '#14B8A6' : r.intent === 'Nav' ? '#7C3AED' : r.intent === 'Comm' ? '#F59E0B' : '#F43F5E',
                      }}
                    />
                    {r.intent}
                  </span>
                </td>
                {compareOn && <td className="px-3 py-2 text-right tabular-nums">{r.youPos ?? '—'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ButtonGhost onClick={() => alert('Export CSV')}>
          <Download size={16} color={TOKENS.brand} />
          Export CSV
        </ButtonGhost>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm text-white cursor-pointer"
          style={{ background: TOKENS.brand }}
          onClick={() => alert('Add to Task')}
        >
          Add to Task
        </button>
      </div>
    </Drawer>
  );
}

function SerpSnapshotDrawer({ open, onClose, page }: { open: boolean; onClose: () => void; page: PageRow | null }) {
  if (!page) return null;
  const flags = page.serpFlags;
  return (
    <Drawer open={open} onClose={onClose} title={`SERP Snapshot — ${page.urlPath}`}>
      <div className="text-sm mb-3" style={{ color: TOKENS.muted }}>
        Latest SERP capture (mock). Feature pills reflect what was detected for this page.
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {(['FS', 'PAA', 'SITELINKS', 'IMAGE', 'VIDEO', 'TOP_STORIES'] as SerpFlag[]).map((f) => {
          const on = flags.includes(f);
          const cfg = SERP_META[f];
          const IconC = getIconSafe(cfg?.Icon);
          return (
            <span
              key={f}
              className={classNames('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs', on ? 'font-semibold' : '')}
              style={{
                borderColor: on ? `${cfg?.color || '#CBD5E1'}66` : TOKENS.border,
                background: on ? `${cfg?.color || '#CBD5E1'}14` : '#fff',
                color: on ? (cfg?.color || '#64748B') : TOKENS.text,
              }}
              title={cfg?.label || f}
            >
              <IconC size={14} />
              {f}
            </span>
          );
        })}
      </div>
      <div className="rounded-[6px] border p-3" style={{ borderColor: TOKENS.border }}>
        <div className="text-sm" style={{ color: TOKENS.muted }}>
          SERP snapshot preview would render here (image / DOM capture). For demo, open:
          <a href={page.fullUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline" style={{ color: TOKENS.compBlue }}>
            {page.fullUrl}
          </a>
        </div>
      </div>
    </Drawer>
  );
}

function TaskDrawer({ open, onClose, page }: { open: boolean; onClose: () => void; page: PageRow | null }) {
  const keywords = (page?.topKeywordsForTask || []).slice(0, 5);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Guide');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!page) return;
    setTitle(`Create competing page for ${page.urlPath}`);
    setType('Guide');
    setNotes(`Competing against: ${page.fullUrl}\nSERP features: ${page.serpFlags.join(', ') || 'none'}`);
  }, [page]);

  return (
    <Drawer open={open} onClose={onClose} title="Create New Page Task">
      <div className="space-y-3 text-sm">
        <div>
          <div className="mb-1 font-medium">Title</div>
          <input
            className="w-full rounded-[6px] border px-3 py-2 outline-none"
            style={{ borderColor: TOKENS.border }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <div className="mb-1 font-medium">Page Type</div>
          <select
            className="w-full rounded-[6px] border px-3 py-2 outline-none"
            style={{ borderColor: TOKENS.border }}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>Guide</option>
            <option>Blog</option>
            <option>Comparison</option>
            <option>Landing</option>
          </select>
        </div>
        <div>
          <div className="mb-1 font-medium">Keywords (top 5)</div>
          <div className="flex flex-wrap gap-1">
            {keywords.length ? (
              keywords.map((k) => (
                <span key={k} className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: TOKENS.border }}>
                  {k}
                </span>
              ))
            ) : (
              <span style={{ color: TOKENS.muted }}>No suggested keywords.</span>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 font-medium">Notes</div>
          <textarea
            rows={5}
            className="w-full rounded-[6px] border px-3 py-2 outline-none"
            style={{ borderColor: TOKENS.border }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="pt-1">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-sm text-white cursor-pointer"
            style={{ background: TOKENS.brand }}
            onClick={() => {
              alert('Task created (demo).');
              onClose();
            }}
          >
            Create Task
          </button>
        </div>
      </div>
    </Drawer>
  );
}

/* --------------------------- Column Visibility --------------------------- */
type ColKey = 'url' | 'title' | 'words' | 'keywords' | 'features' | 'visibility';
const DEFAULT_COLS: Record<ColKey, boolean> = {
  url: true,
  title: true,
  words: true,
  keywords: true,
  features: true,
  visibility: true,
};
const COL_INFO: Record<ColKey, string> = {
  url: 'Relative path. Opens the live page in a new tab.',
  title: 'Meta title (fallbacks to H1 or first heading).',
  words: 'Approximate word count from crawler.',
  keywords: 'Count of organic keywords ranking in Top 100. Click to open Keyword Drilldown.',
  features: 'SERP features detected for this page.',
  visibility: "% of the page’s keywords that rank in the Top 10 (progress bar).",
};

/* ------------------------------- Mock Data ------------------------------ */
function rnd(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function pick<T>(arr: T[], n: number) {
  const a = [...arr];
  const out: T[] = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}
function mockPages(): PageRow[] {
  const paths = [
    ['/seo-guide', 'The Ultimate SEO Guide for 2025'],
    ['/best-ai-tools', 'Top AI Tools for Marketers'],
    ['/technical-seo', 'Technical SEO: A Hands‑On Playbook'],
    ['/seo-audit-template', 'SEO Audit Template (Free Download)'],
    ['/keyword-research', 'Keyword Research: Complete Tutorial'],
    ['/rank-tracker', 'Rank Tracking: How To Measure SEO'],
    ['/content-briefs', 'How to Create Content Briefs'],
    ['/link-building', 'Link Building Strategies That Work'],
    ['/schema-generator', 'Schema Markup Generator'],
    ['/compare/ahrefs-vs-semrush', 'Ahrefs vs Semrush: Which Is Better?'],
    ['/topic-clusters', 'Topic Clusters: The Blueprint'],
    ['/paas/comparison', 'Best PaaS Solutions for SEO'],
  ] as const;

  const features: SerpFlag[] = ['FS', 'PAA', 'SITELINKS', 'IMAGE', 'VIDEO', 'TOP_STORIES'];
  const list: PageRow[] = paths.map(([urlPath, title]) => {
    const kCount = rnd(25, 140);
    const flags = pick(features, rnd(1, 3));
    const wc = rnd(900, 3500);
    const vis = rnd(18, 92);
    const hasYour = Math.random() > 0.25;
    const your: PageRow['yourMatch'] | undefined = hasYour
      ? {
          urlPath: `/you${urlPath}`,
          fullUrl: `https://you.com${urlPath}`,
          wordCount: Math.max(600, wc + rnd(-500, 400)),
          keywordCount: Math.max(10, kCount + rnd(-30, 20)),
          serpFlags: pick(features, rnd(0, 2)),
          visibilityPct: rnd(10, 85),
          matchScore: rnd(55, 92),
        }
      : undefined;

    return {
      urlPath,
      fullUrl: `https://comp1.com${urlPath}`,
      pageTitle: title,
      wordCount: wc,
      keywordCount: kCount,
      serpFlags: flags,
      visibilityPct: vis,
      yourMatch: your,
      topKeywordsForTask: ['seo audit checklist', 'technical seo basics', 'best seo tools', 'schema markup', 'link building'],
    };
  });

  return list;
}

/* ------------------------------- Main View ------------------------------- */
export type TopPagesProps = {
  compareOn?: boolean;
  pagesAnalyzed?: number;
  onViewDetailed?: () => void;
  projectHost?: string;
  competitorHost?: string;
};

export function TopPagesSection({
  compareOn: compareOnProp = true,
  pagesAnalyzed = 280,
  onViewDetailed,
  projectHost,
  competitorHost,
}: TopPagesProps) {
  const [compareOn, setCompareOn] = useState(compareOnProp);
  const [rows] = useState<PageRow[]>(() => mockPages());

  // Filters
  const [q, setQ] = useState('');
  const [featureFilters, setFeatureFilters] = useState<Set<SerpFlag>>(new Set());
  const [colOpen, setColOpen] = useState(false);
  const colRef = useOutsideClose<HTMLDivElement>(colOpen, () => setColOpen(false));
  const [cols, setCols] = useState<Record<ColKey, boolean>>({ ...DEFAULT_COLS });

  const featuresOrdered: SerpFlag[] = ['FS', 'PAA', 'SITELINKS', 'IMAGE', 'VIDEO', 'TOP_STORIES'];

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (text) {
          const hit = r.urlPath.toLowerCase().includes(text) || (r.pageTitle || '').toLowerCase().includes(text);
          if (!hit) return false;
        }
        if (featureFilters.size) {
          for (const f of featureFilters) if (!r.serpFlags.includes(f)) return false;
        }
        return true;
      })
      .sort((a, b) => b.keywordCount - a.keywordCount || b.serpFlags.length - a.serpFlags.length || (b.wordCount ?? 0) - (a.wordCount ?? 0))
      .slice(0, 10);
  }, [rows, q, featureFilters]);

  // Drawers
  const [kwPage, setKwPage] = useState<PageRow | null>(null);
  const [serpPage, setSerpPage] = useState<PageRow | null>(null);
  const [taskPage, setTaskPage] = useState<PageRow | null>(null);

  return (
    <section
      className="w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Section header */}
      <div className="rounded-[6px] border bg-white p-4 shadow-sm" style={{ borderColor: TOKENS.border }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md" style={{ background: TOKENS.pastelBlue, border: `1px solid ${TOKENS.border}` }}>
              <FileText size={16} color={TOKENS.brand} />
            </span>
            <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
              Top Pages &amp; Content Structure
            </h3>
            <Chip title="Total pages analyzed">
              Pages analyzed: {pagesAnalyzed}
            </Chip>

            {/* Optional domain chips (with favicon) */}
            {competitorHost && (
              <Chip title="Competitor">
                <img src={faviconUrl(competitorHost, 16)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                <span className="text-[11px]">Competitor: {competitorHost}</span>
              </Chip>
            )}
            {projectHost && (
              <Chip title="Project">
                <img src={faviconUrl(projectHost, 16)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                <span className="text-[11px]">You: {projectHost}</span>
              </Chip>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ButtonGhost onClick={onViewDetailed ?? (() => alert('Open Domain Analysis'))} title="View detailed analysis">
              <ExternalLink size={16} color={TOKENS.brand} />
              View detailed Analysis
            </ButtonGhost>

            {/* Export */}
            <ExportMenu onCSV={() => exportCSV(filtered, compareOn)} />
          </div>
        </div>

        {/* Filters bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2" size={16} color="#9CA3AF" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by URL or title…"
              className="h-9 w-[280px] rounded-[6px] border pl-7 pr-2 text-sm outline-none"
              style={{ borderColor: TOKENS.border }}
            />
          </div>

          {/* Feature chips (icons, colored) */}
          <div className="flex flex-wrap items-center gap-1">
            {featuresOrdered.map((f) => {
              const on = featureFilters.has(f);
              const cfg = SERP_META[f];
              const IconC = getIconSafe(cfg?.Icon);
              return (
                <button
                  key={f}
                  onClick={() => {
                    const next = new Set(featureFilters);
                    on ? next.delete(f) : next.add(f);
                    setFeatureFilters(next);
                  }}
                  className={classNames('h-8 rounded-full border px-2 text-sm inline-flex items-center gap-1 cursor-pointer', on && 'font-semibold')}
                  style={{
                    borderColor: on ? `${cfg?.color || '#CBD5E1'}66` : TOKENS.border,
                    background: on ? `${cfg?.color || '#CBD5E1'}14` : '#fff',
                    color: on ? (cfg?.color || '#64748B') : TOKENS.text,
                  }}
                  title={cfg?.label || f}
                >
                  <IconC size={14} />
                  {f}
                </button>
              );
            })}
            {featureFilters.size > 0 && (
              <button
                onClick={() => setFeatureFilters(new Set())}
                className="ml-1 h-8 rounded-full border px-2 text-sm text-[#6B7280] hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: TOKENS.border }}
                title="Clear filters"
              >
                Clear
              </button>
            )}
          </div>

          {/* Column menu */}
          <div className="relative" ref={colRef}>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              onClick={() => setColOpen((s) => !s)}
            >
              <Columns3 size={16} color={TOKENS.brand} />
              Columns
              <ChevronDown size={16} color="#9CA3AF" />
            </button>
            {colOpen && (
              <div className="absolute z-50 mt-2 w-64 rounded-[6px] border bg-white p-3 shadow" style={{ borderColor: TOKENS.border }}>
                <div className="mb-2 text-sm font-medium">Show / Hide Columns</div>
                <div className="space-y-1">
                  {(Object.keys(cols) as ColKey[]).map((key) => (
                    <label key={key} className="flex cursor-pointer items-center justify-between text-sm">
                      <span>
                        {key === 'url'
                          ? 'URL'
                          : key === 'title'
                          ? 'Page Title'
                          : key === 'words'
                          ? 'Word Count'
                          : key === 'keywords'
                          ? 'Keyword Count'
                          : key === 'features'
                          ? 'SERP Features'
                          : 'Visibility %'}
                      </span>
                      <input
                        type="checkbox"
                        checked={cols[key]}
                        onChange={(e) => setCols((s) => ({ ...s, [key]: e.target.checked }))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Compare toggle (demo control; globally managed in app) */}
          <ToggleSwitch checked={compareOn} onChange={setCompareOn} label={`Compare: ${compareOn ? 'ON' : 'OFF'}`} />
        </div>

        {/* Table */}
        <div className="mt-3 overflow-hidden rounded-[6px] border" style={{ borderColor: TOKENS.border }}>
          {/* Wrapper to ensure no trailing blank space: table uses fit-content width */}
          <div className="overflow-x-auto">
            <table
              className="table-auto w-max min-w-full text-sm"
              style={{ width: 'fit-content', minWidth: '100%' }}
            >
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b" style={{ borderColor: TOKENS.border }}>
                  {cols.url && (
                    <th className="px-3 py-2 text-left min-w-[360px] w-[360px] sticky left-0 bg-white z-20 text-[13px] font-semibold">
                      <span className="inline-flex items-center">
                        URL <InfoPopover label={COL_INFO.url} />
                      </span>
                    </th>
                  )}
                  {cols.title && (
                    <th className="px-3 py-2 text-left min-w-[420px] w-[420px] text-[13px] font-semibold">
                      <span className="inline-flex items-center">
                        Page Title <InfoPopover label={COL_INFO.title} />
                      </span>
                    </th>
                  )}
                  {cols.words && (
                    <th className="px-3 py-2 text-right min-w-[140px] w-[140px] text-[13px] font-semibold">
                      <span className="inline-flex items-center">
                        Word Count <InfoPopover label={COL_INFO.words} />
                      </span>
                    </th>
                  )}
                  {cols.keywords && (
                    <th className="px-3 py-2 text-right min-w-[140px] w-[140px] text-[13px] font-semibold">
                      <span className="inline-flex items-center">
                        Keyword Count <InfoPopover label={COL_INFO.keywords} />
                      </span>
                    </th>
                  )}
                  {cols.features && (
                    <th className="px-3 py-2 text-left min-w-[280px] w-[280px] text-[13px] font-semibold">
                      <span className="inline-flex items-center">
                        SERP Features <InfoPopover label={COL_INFO.features} />
                      </span>
                    </th>
                  )}
                  {cols.visibility && (
                    <th className="px-3 py-2 text-right min-w-[160px] w-[160px] text-[13px] font-semibold">
                      <span className="inline-flex items-center">
                        Visibility % <InfoPopover label={COL_INFO.visibility} />
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const yourRow = r.yourMatch;
                  return (
                    <React.Fragment key={r.fullUrl}>
                      {/* Competitor row */}
                      <tr className="hover:bg-[#FAFCFE] border-b" style={{ borderColor: TOKENS.border }}>
                        {cols.url && (
                          <td className="px-3 py-2 sticky left-0 bg-white z-10">
                            <a
                              title={r.fullUrl}
                              href={r.fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium underline decoration-1 cursor-pointer"
                              style={{ color: TOKENS.compBlue }}
                            >
                              {shortenPath(r.urlPath)}
                              <ExternalLink size={12} className="ml-1 inline-block align-[-2px] text-[#9CA3AF]" />
                            </a>
                          </td>
                        )}
                        {cols.title && (
                          <td className="px-3 py-2">
                            <span title={r.pageTitle || ''} className="line-clamp-1">
                              {r.pageTitle || '—'}
                            </span>
                          </td>
                        )}
                        {cols.words && <td className="px-3 py-2 text-right tabular-nums">{typeof r.wordCount === 'number' ? nf(r.wordCount) : '—'}</td>}
                        {cols.keywords && (
                          <td className="px-3 py-2 text-right tabular-nums">
                            <button
                              className="underline decoration-1 hover:opacity-80 cursor-pointer"
                              style={{ color: TOKENS.brand }}
                              onClick={() => setKwPage(r)}
                              title="Open Keyword Drilldown"
                            >
                              {nf(r.keywordCount)}
                            </button>
                          </td>
                        )}
                        {cols.features && (
                          <td className="px-3 py-2">
                            <SerpFlagsCell flags={r.serpFlags} onClick={() => setSerpPage(r)} />
                          </td>
                        )}
                        {cols.visibility && (
                          <td className="px-3 py-2">
                            {typeof r.visibilityPct === 'number' ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <ProgressBar value={r.visibilityPct} color={TOKENS.compBlue} />
                                </div>
                                <div className="w-10 text-right tabular-nums">{r.visibilityPct}%</div>
                              </div>
                            ) : (
                              <span className="text-[#9CA3AF]">—</span>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* Compare row — Your Closest Match OR No‑match info */}
                      {compareOn && (
                        <>
                          {yourRow ? (
                            <tr className="border-b" style={{ borderColor: TOKENS.border, background: TOKENS.chipBg }}>
                              {cols.url && (
                                <td className="px-3 py-2">
                                  <span className="mr-2" style={{ color: TOKENS.muted }}>
                                    Your Closest Match:
                                  </span>
                                  <a
                                    href={yourRow.fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline decoration-1 cursor-pointer"
                                    style={{ color: TOKENS.brand }}
                                  >
                                    {shortenPath(yourRow.urlPath)}
                                    <ExternalLink size={12} className="ml-1 inline-block align-[-2px] text-[#9CA3AF]" />
                                  </a>
                                  {typeof yourRow.matchScore === 'number' && (
                                    <span
                                      className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                                      style={{ borderColor: TOKENS.border, color: TOKENS.text, background: '#fff' }}
                                      title="Semantic + keyword overlap score"
                                    >
                                      Match {yourRow.matchScore}%
                                    </span>
                                  )}
                                </td>
                              )}
                              {cols.title && <td className="px-3 py-2"><span style={{ color: TOKENS.muted }}>—</span></td>}
                              {cols.words && (
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {typeof yourRow.wordCount === 'number' ? nf(yourRow.wordCount) : '—'}
                                </td>
                              )}
                              {cols.keywords && (
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {typeof yourRow.keywordCount === 'number' ? (
                                    <button
                                      className="underline decoration-1 hover:opacity-80 cursor-pointer"
                                      style={{ color: TOKENS.brand }}
                                      onClick={() =>
                                        setKwPage({
                                          ...r,
                                          urlPath: yourRow.urlPath,
                                          fullUrl: yourRow.fullUrl,
                                          keywordCount: yourRow.keywordCount || 0,
                                          serpFlags: yourRow.serpFlags || [],
                                        })
                                      }
                                      title="Open Keyword Drilldown (Your page)"
                                    >
                                      {nf(yourRow.keywordCount)}
                                    </button>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              )}
                              {cols.features && (
                                <td className="px-3 py-2">
                                  {yourRow.serpFlags?.length ? (
                                    <SerpFlagsCell flags={yourRow.serpFlags} onClick={() => setSerpPage({ ...r, serpFlags: yourRow.serpFlags! })} you />
                                  ) : (
                                    <span className="text-[#9CA3AF]">—</span>
                                  )}
                                </td>
                              )}
                              {cols.visibility && (
                                <td className="px-3 py-2">
                                  {typeof yourRow.visibilityPct === 'number' ? (
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <ProgressBar value={yourRow.visibilityPct} color={TOKENS.brand} />
                                      </div>
                                      <div className="w-10 text-right tabular-nums">{yourRow.visibilityPct}%</div>
                                    </div>
                                  ) : (
                                    <span className="text-[#9CA3AF]">—</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ) : (
                            <tr className="border-b" style={{ borderColor: TOKENS.border }}>
                              <td colSpan={Object.values(cols).filter(Boolean).length} className="px-3 py-2">
                                <NoMatchBlock onCreate={() => setTaskPage(r)} />
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <KeywordDrawer open={!!kwPage} onClose={() => setKwPage(null)} page={kwPage} compareOn={compareOn} />
      <SerpSnapshotDrawer open={!!serpPage} onClose={() => setSerpPage(null)} page={serpPage} />
      <TaskDrawer open={!!taskPage} onClose={() => setTaskPage(null)} page={taskPage} />
    </section>
  );
}

/* ----------------------------- Subcomponents ----------------------------- */
function ExportMenu({ onCSV }: { onCSV: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
      >
        <Download size={16} color={TOKENS.brand} />
        Export
        <ChevronDown size={16} color="#9CA3AF" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-[6px] border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer" onClick={() => (setOpen(false), onCSV())}>
            Export CSV
          </button>
          <button className="block w-full px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed" title="Coming soon">
            Export PNG (Soon)
          </button>
          <button className="block w-full px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed" title="Upgrade to Pro">
            Export PDF (Pro)
          </button>
        </div>
      )}
    </div>
  );
}

function NoMatchBlock({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-[6px] border bg-[#F5F7FA] px-3 py-2" style={{ borderColor: TOKENS.border }}>
      <div className="flex items-start gap-2">
        <span className="inline-block h-full w-1 rounded-[2px]" style={{ background: '#F04438' }} />
        <div className="text-sm">
          <div className="font-medium">No matching page found in your project.</div>
          <div style={{ color: TOKENS.muted }}>You are currently not targeting overlapping keywords.</div>
        </div>
      </div>
      <button
        className="inline-flex h-8 items-center rounded-[6px] px-3 text-sm text-white cursor-pointer"
        style={{ background: TOKENS.brand }}
        onClick={onCreate}
      >
        Create New Page Task
      </button>
    </div>
  );
}

function shortenPath(path: string, max = 36) {
  if (path.length <= max) return path;
  const head = path.slice(0, Math.floor((max - 1) / 2));
  const tail = path.slice(-Math.floor((max - 1) / 2));
  return `${head}…${tail}`;
}

/* ------------------------------ Default Export --------------------------- */
export default function TopPagesAndContentSectionMock() {
  return (
    <div className="w-full bg-white mt-4">
      <div className="mx-auto w-full">
        <TopPagesSection projectHost="yoursite.com" competitorHost="comp1.com" />
      </div>
    </div>
  );
}
