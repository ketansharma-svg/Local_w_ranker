'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, Info, RotateCcw } from 'lucide-react';

/* -----------------------------------------------------------------------------
   Link Authority vs Opportunity Plot (Bubble Scatter)
   Pure SVG (no external chart libs) — robust in sandboxes

   ✅ Behaviors
   - Auto‑loads SAMPLE_BUBBLES when `data` is missing or empty
   - Shows a "Demo data" chip when auto‑demo is in use
   - Export: PNG (rasterized from SVG) and CSV (current filtered rows)
   - Click bubble: if opportunityUrl → open Vefogix, else → onOpenDomainDrawer(domain)

   🔧 Fixes
   - Guarded `.map` calls (normalize input)
   - Completed JSX around `{rows.map(...)}` to avoid syntax errors
   - Outside‑click + Esc closes Export menu
----------------------------------------------------------------------------- */

export type DomainType = 'Blog' | 'News' | 'EDU_GOV' | 'Directory' | 'Other';

export type BubbleDatum = {
  domain: string;
  wrScore: number;                // 0–100
  competitorDomains: string[];    // used to compute Y axis (count)
  backlinksCount: number;         // bubble size (log‑scaled)
  dofollowRatio: number;          // 0–100
  domainType: DomainType;
  opportunity?: boolean;
  opportunityUrl?: string;        // deep‑link to Vefogix
  anchors?: string[];             // optional sample anchors for tooltip
};

export type LinkAuthorityOpportunityPlotProps = {
  title?: string;
  data?: BubbleDatum[];           // may be omitted → demo will be used
  className?: string;
  onViewTable?: (filters: {
    domainType: DomainType | 'All';
    dofollowOnly: boolean;
    opportunitiesOnly: boolean;
  }) => void;
  onOpenDomainDrawer?: (domain: string) => void;
};

const COLORS: Record<DomainType, string> = {
  Blog: '#3B82F6',      // blue
  News: '#22C55E',      // green
  EDU_GOV: '#FBBF24',   // amber
  Directory: '#A855F7', // purple
  Other: '#111827',     // almost black
};

const TOKENS = {
  brand: '#1090D0',
  grid: '#E5E7EB',
  axis: '#6B7280',
  opportunity: '#22C55E',
};

/* --------------------------------- Utils --------------------------------- */
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const pct = (n: number) => `${Math.round(n)}%`;
const log1p = (n: number) => Math.log1p(Math.max(0, n));
function niceTicks(maxY: number, maxTicks = 5) {
  const m = Math.max(1, Math.round(maxY));
  const step = Math.max(1, Math.ceil(m / maxTicks));
  const ticks = [0];
  for (let v = step; v <= m; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== m) ticks.push(m);
  return ticks;
}

/* ------------------------------ Export helpers --------------------------- */
function download(filename: string, href: string) {
  const a = document.createElement('a');
  a.href = href; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}
function exportSVGToPNG(svgEl: SVGSVGElement, filename = 'link-opportunity-plot.png') {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);
  const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  const img = new Image();
  img.onload = () => {
    const rect = svgEl.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(800, Math.ceil(rect.width));
    canvas.height = Math.max(500, Math.ceil(rect.height));
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); download(filename, url); URL.revokeObjectURL(url); });
  };
  img.src = encoded;
}
function exportRowsToCSV(rows: any[], filename = 'link-opportunity-plot.csv') {
  const header = ['domain','wrScore','competitorCount','competitors','backlinksCount','dofollowRatio','domainType','opportunity','opportunityUrl'];
  const lines = rows.map((r) => ([
    r.domain, r.wrScore, r.competitorCount, (r.competitorsList || '').replace(/,/g, ';'), r.backlinksCount,
    Math.round(r.dofollowRatio), r.domainType, r.opportunity ? 'true' : 'false', r.opportunityUrl || '',
  ].map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')));
  const csv = [header.join(','), ...lines].join('\n');
  download(filename, 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
}

/* ------------------------------ Tooltip box ------------------------------ */
function BubbleTooltipBox({ p }: { p: any }) {
  if (!p) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-md text-xs">
      <div className="mb-1 font-semibold text-gray-800">🔗 {p.domain}</div>
      <div className="space-y-0.5 text-gray-700">
        <div><span className="font-medium">WR Score:</span> {p.wrScore}</div>
        <div><span className="font-medium">Competitors Linked:</span> {p.competitorCount > 0 ? p.competitorsList : '—'}</div>
        <div><span className="font-medium">Backlinks to Competitors:</span> {p.backlinksCount}</div>
        <div><span className="font-medium">Dofollow:</span> {pct(p.dofollowRatio)}</div>
        <div><span className="font-medium">Domain Type:</span> {p.domainTypeLabel}</div>
        {Array.isArray(p.anchors) && p.anchors.length > 0 && (
          <div><span className="font-medium">Anchors:</span> “{p.anchors.slice(0,2).join('”, “')}”</div>
        )}
        {p.opportunity && (
          <div className="mt-1 inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-green-200">
            🟢 Guest Post Available (via Vefogix)
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Resize observer hook ------------------------ */
function useSize(ref: React.RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: Math.max(0, Math.floor(rect.width)), height: Math.max(0, Math.floor(rect.height)) });
    };
    measure();
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    } else {
      const onResize = () => measure();
      // window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return () => ro?.disconnect();
  }, [ref]);
  return size;
}

/* -------------------------------- Component ------------------------------ */
export default function LinkAuthorityOpportunityPlot({
  title = '📊 Link Authority vs Opportunity Map',
  data,
  className,
  onViewTable,
  onOpenDomainDrawer,
}: LinkAuthorityOpportunityPlotProps) {
  // Filters
  const [domainType, setDomainType] = useState<DomainType | 'All'>('All');
  const [dofollowOnly, setDofollowOnly] = useState(false);
  const [opportunitiesOnly, setOpportunitiesOnly] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const exportWrapRef = useRef<HTMLDivElement | null>(null);
 const { width, height } = useSize(containerRef as React.RefObject<HTMLElement>);

  // Close Export on outside click / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!exportOpen) return;
      const el = exportWrapRef.current;
      if (el && !el.contains(e.target as Node)) setExportOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setExportOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onEsc); };
  }, [exportOpen]);

  // Auto‑load demo if data is missing/empty
  const isDemo = !Array.isArray(data) || data.length === 0;
  const dataUsed: BubbleDatum[] = isDemo ? SAMPLE_BUBBLES : (data as BubbleDatum[]);

  // Transform & filter rows
  const rows = useMemo(() => {
    const maxLinks = Math.max(1, ...dataUsed.map(d => Math.max(0, Number(d.backlinksCount) || 0)));
    const denom = Math.max(1, Math.log1p(maxLinks));
    const toR = (n: number) => { const z = log1p(n) / denom; return 6 + z * 22; }; // radius 6..28

    return dataUsed
      .map(d => ({
        ...d,
        competitorCount: Array.isArray(d.competitorDomains) ? d.competitorDomains.length : 0,
        competitorsList: Array.isArray(d.competitorDomains) ? d.competitorDomains.join(', ') : '',
        radius: toR(Number(d.backlinksCount) || 0),
        domainTypeLabel: d.domainType === 'EDU_GOV' ? 'EDU / GOV' : d.domainType,
        fill: COLORS[d.domainType] ?? COLORS.Other,
        wrScore: clamp(Number(d.wrScore) || 0, 0, 100),
        dofollowRatio: clamp(Number(d.dofollowRatio) || 0, 0, 100),
      }))
      .filter(row => (domainType === 'All' ? true : row.domainType === domainType))
      .filter(row => (dofollowOnly ? row.dofollowRatio >= 50 : true))
      .filter(row => (opportunitiesOnly ? !!row.opportunity : true));
  }, [dataUsed, domainType, dofollowOnly, opportunitiesOnly]);

  const maxY = Math.max(1, ...rows.map(r => r.competitorCount));
  const yTicks = useMemo(() => niceTicks(maxY), [maxY]);

  function resetAll() { setDomainType('All'); setDofollowOnly(false); setOpportunitiesOnly(false); }

  function handlePointClick(row: any) {
    if (!row) return;
    if (row.opportunity && row.opportunityUrl) {
      window.open(row.opportunityUrl, '_blank', 'noopener,noreferrer');
    } else if (onOpenDomainDrawer) {
      onOpenDomainDrawer(row.domain);
    }
  }

  function handleExportPNG() { setExportOpen(false); if (svgRef.current) exportSVGToPNG(svgRef.current, 'link-authority-opportunity-plot.png'); }
  function handleExportCSV() { setExportOpen(false); exportRowsToCSV(rows, 'link-authority-opportunity-plot.csv'); }

  const legendItems: Array<{label: string; color: string}> = [
    { label: 'Blog', color: COLORS.Blog },
    { label: 'News', color: COLORS.News },
    { label: 'EDU / GOV', color: COLORS.EDU_GOV },
    { label: 'Directory', color: COLORS.Directory },
    { label: 'Other', color: COLORS.Other },
  ];

  const [hover, setHover] = useState<null | { row: any; x: number; y: number }>(null);

  const PAD = { top: 8, right: 24, bottom: 36, left: 56 };
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = Math.max(0, height - PAD.top - PAD.bottom);
  const xScale = (v: number) => PAD.left + (clamp(v, 0, 100) / 100) * innerW;
  const yScale = (v: number) => PAD.top + innerH - (clamp(v, 0, maxY) / maxY) * innerH;
  const xTicks = [0, 20, 40, 60, 80, 100];

  const showEmpty = rows.length === 0;
  return (
    <section className={[ 'rounded-2xl border border-[#D2EFFF] bg-white shadow-sm mt-4', 'p-4 sm:p-5', className ?? '' ].join(' ')} aria-labelledby="lao-plot-title">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 id="lao-plot-title" className="text-base font-semibold text-gray-800">{title}</h3>
          <Info
  className="h-4 w-4 text-gray-500"
  aria-label={['X = WR Score (0–100)', 'Y = # of competitors linking from the domain', 'Bubble size = backlinks volume (log‑scaled)', 'Color = Domain type', 'Green glow = Vefogix opportunity'].join('\n')}
/>

          {isDemo && (
            <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200" title="Showing demo dataset">
              Demo data
            </span>
          )}
        </div>
        <div ref={exportWrapRef} className="relative">
          <button type="button" onClick={() => setExportOpen(v => !v)} className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--brand,#1090D0)] hover:bg-gray-50" style={{ ['--brand' as any]: TOKENS.brand }}>
            Export <Download className="ml-1 h-4 w-4" />
          </button>
          {exportOpen && (
            <div role="menu" className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
              <button onClick={handleExportPNG} className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Export PNG</button>
              <button onClick={handleExportCSV} className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">Export CSV</button>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="w-36 text-gray-700">Domain Type</span>
          <select className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm" value={domainType} onChange={(e) => setDomainType(e.target.value as DomainType | 'All')}>
            <option value="All">All</option>
            <option value="Blog">Blog</option>
            <option value="News">News</option>
            <option value="EDU_GOV">EDU / GOV</option>
            <option value="Directory">Directory</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[color:var(--brand,#1090D0)] focus:ring-[color:var(--brand,#1090D0)]" checked={dofollowOnly} onChange={(e) => setDofollowOnly(e.target.checked)} style={{ ['--brand' as any]: TOKENS.brand }} />
          <span className="text-gray-700">Dofollow Only (≥50%)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[color:var(--brand,#1090D0)] focus:ring-[color:var(--brand,#1090D0)]" checked={opportunitiesOnly} onChange={(e) => setOpportunitiesOnly(e.target.checked)} style={{ ['--brand' as any]: TOKENS.brand }} />
          <span className="text-gray-700">Show Only Link Opportunities</span>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={resetAll} className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50" title="Reset filters and view"><RotateCcw className="mr-1 h-4 w-4" /> Reset View</button>
          {onViewTable && (
            <button type="button" onClick={() => onViewTable({ domainType, dofollowOnly, opportunitiesOnly })} className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-[color:var(--brand,#1090D0)] hover:bg-gray-50" style={{ ['--brand' as any]: TOKENS.brand }}>View All in Table</button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {legendItems.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: it.color }} />{it.label}
          </span>
        ))}
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-green-200" title="Vefogix opportunity available">
          Glow = Opportunity <ExternalLink className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative h-[320px] sm:h-[380px] md:h-[440px]">
        <svg ref={svgRef} width={width} height={height} className="absolute inset-0">
          {/* Grid & axes */}
          {yTicks.map((t, i) => (
            <g key={`ygrid-${i}`}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={yScale(t)} y2={yScale(t)} stroke={TOKENS.grid} strokeDasharray="3 3" />
              <text x={PAD.left - 8} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fontSize={12} fill={TOKENS.axis}>{t}</text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <g key={`xgrid-${i}`}>
              <line x1={xScale(t)} x2={xScale(t)} y1={PAD.top} y2={PAD.top + innerH} stroke={TOKENS.grid} strokeDasharray="3 3" />
              <text x={xScale(t)} y={PAD.top + innerH + 16} textAnchor="middle" fontSize={12} fill={TOKENS.axis}>{t}</text>
            </g>
          ))}
          <text x={PAD.left + innerW / 2} y={PAD.top + innerH + 32} textAnchor="middle" fontSize={12} fill="#374151">WR Score</text>
          <text transform={`translate(${16}, ${PAD.top + innerH / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="#374151"># of Competitors Linked</text>

          {/* Bubbles */}
          {rows.map((row, idx) => {
            const cx = xScale(row.wrScore);
            const cy = yScale(row.competitorCount);
            const r = row.radius;
            return (
              <g
                key={`b-${row.domain}-${idx}`}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ row, x: e.clientX - rect.left + 8, y: e.clientY - rect.top + 8 });
                }}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ row, x: e.clientX - rect.left + 8, y: e.clientY - rect.top + 8 });
                }}
                onMouseLeave={() => setHover(null)}
                onClick={() => handlePointClick(row)}
                style={{ cursor: 'pointer' }}
              >
                {row.opportunity && (
                  <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={TOKENS.opportunity} strokeOpacity={0.35} strokeWidth={4} />
                )}
                <circle cx={cx} cy={cy} r={r} fill={row.fill} fillOpacity={0.9} stroke="#fff" strokeWidth={1.5} />
                {row.opportunity && (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={TOKENS.opportunity} strokeWidth={1.5} />
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip overlay (HTML) */}
        {hover && (
          <div className="pointer-events-none absolute z-10" style={{ left: hover.x, top: hover.y }}>
            <BubbleTooltipBox p={hover.row} />
          </div>
        )}

        {/* Empty state (rare due to demo fallback) */}
        {showEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-gray-600" aria-live="polite">
            <div>No data to plot.</div>
            <div className="text-xs">We attempted to load the demo dataset but it was unavailable. Please pass a valid <code>data</code> array.</div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-gray-600">Tip: Hover bubbles to preview domain details. Click a glowing bubble to open its Vefogix listing; otherwise we’ll open the Backlink Details drawer.</p>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* Sample data (tests)                                                       */
/* ------------------------------------------------------------------------- */
export const SAMPLE_BUBBLES: BubbleDatum[] = [
  { domain: 'techblog.com', wrScore: 82, competitorDomains: ['comp1.com','comp2.com'], backlinksCount: 38, dofollowRatio: 87, domainType: 'Blog', opportunity: true, opportunityUrl: 'https://vefogix.com/domain/techblog.com', anchors: ['seo tools','rank tips'] },
  { domain: 'quicknewsdaily.com', wrScore: 71, competitorDomains: ['comp1.com'], backlinksCount: 14, dofollowRatio: 66, domainType: 'News', anchors: ['ranking changes'] },
  { domain: 'educonnect.edu', wrScore: 85, competitorDomains: ['comp2.com'], backlinksCount: 9, dofollowRatio: 100, domainType: 'EDU_GOV', anchors: ['data research'] },
  { domain: 'directoryhub.net', wrScore: 53, competitorDomains: ['comp2.com','comp3.com'], backlinksCount: 27, dofollowRatio: 78, domainType: 'Directory', opportunity: true, opportunityUrl: 'https://vefogix.com/domain/directoryhub.net' },
  { domain: 'seonewbieforum.net', wrScore: 43, competitorDomains: ['comp3.com'], backlinksCount: 22, dofollowRatio: 45, domainType: 'Other', anchors: ['seo basics','learning'] },
];

export const SAMPLE_BUBBLES_DENSE: BubbleDatum[] = [
  { domain: 'a.com', wrScore: 5, competitorDomains: [], backlinksCount: 1, dofollowRatio: 10, domainType: 'Other' },
  { domain: 'b.com', wrScore: 25, competitorDomains: ['c1'], backlinksCount: 3, dofollowRatio: 40, domainType: 'Blog' },
  { domain: 'c.com', wrScore: 45, competitorDomains: ['c1','c2'], backlinksCount: 50, dofollowRatio: 60, domainType: 'News', opportunity: true, opportunityUrl: 'https://vefogix.com/domain/c.com' },
  { domain: 'd.edu', wrScore: 65, competitorDomains: ['c3','c4','c5'], backlinksCount: 120, dofollowRatio: 90, domainType: 'EDU_GOV' },
  { domain: 'e.net', wrScore: 85, competitorDomains: ['c2'], backlinksCount: 400, dofollowRatio: 70, domainType: 'Directory' },
  { domain: 'f.io', wrScore: 95, competitorDomains: ['c2','c3','c4','c5'], backlinksCount: 900, dofollowRatio: 55, domainType: 'Blog', opportunity: true, opportunityUrl: 'https://vefogix.com/domain/f.io' },
];

export const SAMPLE_BUBBLES_EDGE: BubbleDatum[] = [
  { domain: 'zero-links.com', wrScore: 0, competitorDomains: [], backlinksCount: 0, dofollowRatio: 0, domainType: 'Other' },
  { domain: 'max-wr.com', wrScore: 100, competitorDomains: ['c1','c2','c3','c4','c5','c6','c7'], backlinksCount: 1, dofollowRatio: 100, domainType: 'Blog' },
  { domain: 'huge-vol.net', wrScore: 55, competitorDomains: ['c1'], backlinksCount: 5000, dofollowRatio: 65, domainType: 'News', opportunity: true, opportunityUrl: 'https://vefogix.com/domain/huge-vol.net' },
];

// Additional quick checks
export const SAMPLE_BUBBLES_EMPTY: BubbleDatum[] = [];
export const SAMPLE_BUBBLES_SINGLE: BubbleDatum[] = [
  { domain: 'only-one.com', wrScore: 60, competitorDomains: ['c1','c2'], backlinksCount: 12, dofollowRatio: 80, domainType: 'Blog', opportunity: false },
];

/* ------------------------------------------------------------------------- */
/* Usage tests                                                               */
/* ------------------------------------------------------------------------- */
// (1) Auto‑demo: should show demo chip and SAMPLE_BUBBLES
// <LinkAuthorityOpportunityPlot />

// (2) Explicit empty array: should still show demo chip and SAMPLE_BUBBLES
// <LinkAuthorityOpportunityPlot data={SAMPLE_BUBBLES_EMPTY} />

// (3) Single bubble
// <LinkAuthorityOpportunityPlot data={SAMPLE_BUBBLES_SINGLE} />

// (4) Dense & Edge
// <LinkAuthorityOpportunityPlot data={SAMPLE_BUBBLES_DENSE} />
// <LinkAuthorityOpportunityPlot data={SAMPLE_BUBBLES_EDGE} />

