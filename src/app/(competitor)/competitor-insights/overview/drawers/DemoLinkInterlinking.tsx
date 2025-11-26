import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Link2,
  AlertTriangle,
  X,
  ChevronRight,
  Info,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

/* =============================================================================
   LinkInterlinkingDrawer (Internal Linking Summary – PILS)
   - Drop-in TSX component with professional drawer shell
   - TailwindCSS only; no external UI deps
   - Includes skeleton, error, and empty states
   - Mock API wired up; replace fetcher with real endpoint later
   - Aligns with spec: "Link Interlinking Drawer – Design"
==============================================================================*/

type SuggestionIndicator = 'easy' | 'priority' | undefined;

type WeakPage = {
  url: string;
  pils: number;
  badges?: string[]; // e.g., ['Orphaned','Low Equity']
};

type InterlinkingSummary = {
  project: { domain: string; avgPILS: number };
  compareAgainst: { domain: string; avgPILS: number };
  weakPages: WeakPage[]; // top 3–5
  suggestions: Array<{ label: string; count: number; indicator?: SuggestionIndicator }>;
  sourceTag?: 'Overview Tab' | 'Link Analyzer' | 'AI Insight';
};

type FetchParams = {
  projectDomain: string;
  competitors: string[];
  preferredCompetitor?: string;
  simulateEmpty?: boolean;
  simulateError?: boolean;
};

// ---- Tokens (brand + semantic helpers) --------------------------------------
const BRAND = {
  blue: '#1090D0',
  border: '#EFF0F6',
};

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

// ---- Mock fetcher (replace with real API later) ------------------------------
async function fetchInterlinkingSummary(
  params: FetchParams
): Promise<InterlinkingSummary> {
  const { projectDomain, competitors, preferredCompetitor, simulateEmpty, simulateError } = params;
  await new Promise((r) => setTimeout(r, 820)); // simulate latency

  if (simulateError) {
    throw new Error('Network error: unable to load internal linking data');
  }

  const comp = preferredCompetitor ?? (competitors[0] || 'competitor1.com');

  const base: InterlinkingSummary = {
    project: { domain: projectDomain, avgPILS: 64 },
    compareAgainst: { domain: comp, avgPILS: 84 },
    weakPages: simulateEmpty
      ? []
      : [
          { url: '/blog/site-architecture', pils: 28, badges: ['Orphaned'] },
          { url: '/features/link-tools', pils: 34, badges: ['Low Equity'] },
          { url: '/seo-checklist', pils: 39 },
        ],
    suggestions: [
      { label: 'Add contextual links', count: 7, indicator: 'easy' },
      { label: 'Add footer/sidebar links (orphan fix)', count: 5, indicator: 'priority' },
      { label: 'Improve keyword‑rich anchors', count: 12 },
    ],
    sourceTag: 'Overview Tab',
  };

  return base;
}

// ---- Tiny helpers ------------------------------------------------------------
function pctDelta(project: number, compare: number): { pct: number; relation: 'ahead' | 'behind' | 'tie' } {
  if (compare === 0) return { pct: 0, relation: 'tie' };
  if (project === compare) return { pct: 0, relation: 'tie' };
  if (project < compare) return { pct: Math.round(((compare - project) / compare) * 100), relation: 'behind' };
  return { pct: Math.round(((project - compare) / compare) * 100), relation: 'ahead' };
}

function speedColorByPils(p: number) {
  // purely visual helper: Red <40, Yellow 40–69, Green 70+
  if (p >= 70) return 'text-green-600 bg-green-50';
  if (p >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function badgeColor(b?: string) {
  if (!b) return 'bg-gray-100 text-gray-700';
  const key = b.toLowerCase();
  if (key.includes('orphan')) return 'bg-red-100 text-red-700';
  if (key.includes('low')) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}

function indicatorPill(i?: SuggestionIndicator) {
  if (i === 'easy') return 'bg-emerald-50 text-emerald-700';
  if (i === 'priority') return 'bg-rose-50 text-rose-700';
  return 'bg-gray-50 text-gray-700';
}

// ---- Skeletons ---------------------------------------------------------------
function SkeletonLine({ w = 'w-40' }: { w?: string }) {
  return <div className={cls('h-3 rounded bg-gray-200/70 animate-pulse', w)} />;
}
function MetricSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-3">
          <SkeletonLine w="w-24" />
          <div className="mt-2 flex items-baseline gap-2">
            <SkeletonLine w="w-12" />
            <SkeletonLine w="w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-gray-200/70 animate-pulse" />
            <SkeletonLine w="w-40" />
          </div>
          <SkeletonLine w="w-12" />
        </div>
      ))}
    </div>
  );
}

// ---- Component Props ---------------------------------------------------------
export type LinkInterlinkingDrawerProps = {
  open: boolean;
  onClose: () => void;

  projectDomain: string;
  competitors: string[]; // pass selected competitors (first or best PILS will be baseline if preferredCompetitor is not provided)
  preferredCompetitor?: string;

  onCreateTask?: (payload: {
    source: string;
    pages: string[];
    suggestions: string[];
    compareAgainst: string;
  }) => void;

  onOpenLinkAnalyzer?: () => void;
  onViewFullAudit?: () => void;

  // demo flags:
  simulateEmpty?: boolean;
  simulateError?: boolean;
};

// ---- Main Drawer -------------------------------------------------------------
export function LinkInterlinkingDrawer({
  open,
  onClose,
  projectDomain,
  competitors,
  preferredCompetitor,
  onCreateTask,
  onOpenLinkAnalyzer,
  onViewFullAudit,
  simulateEmpty,
  simulateError,
}: LinkInterlinkingDrawerProps) {
  const [data, setData] = useState<InterlinkingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetchInterlinkingSummary({
      projectDomain,
      competitors,
      preferredCompetitor,
      simulateEmpty,
      simulateError,
    })
      .then((res) => {
        setData(res);
      })
      .catch((e: any) => {
        setError(e?.message || 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, [open, projectDomain, competitors, preferredCompetitor, simulateEmpty, simulateError]);

  // Compute headline delta
  const delta = useMemo(() => {
    if (!data) return null;
    return pctDelta(data.project.avgPILS, data.compareAgainst.avgPILS);
  }, [data]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Derived payload for Create Task
  const taskPayload = useMemo(() => {
    if (!data) return null;
    return {
      source: 'Link Interlinking Drawer',
      pages: (data?.weakPages || []).map((p) => p.url),
      suggestions: data?.suggestions.map((s) => s.label) || [],
      compareAgainst: data.compareAgainst.domain,
    };
  }, [data]);

  const handleCreateTask = () => {
    if (onCreateTask && taskPayload) onCreateTask(taskPayload);
    else console.log('[Create Task]', taskPayload);
  };

  const handleOpenAnalyzer = () => {
    if (onOpenLinkAnalyzer) onOpenLinkAnalyzer();
    else console.log('[Route] → Link Analyzer (filtered)');
  };

  const handleViewFullAudit = () => {
    if (onViewFullAudit) onViewFullAudit();
    else console.log('[Route] → Link Analyzer - Full Link Audit');
  };

  return (
    <div
      className={cls(
        'fixed inset-0 z-50',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cls(
          'absolute inset-0 bg-black/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="interlinking-drawer-title"
        className={cls(
          'absolute right-0 top-0 h-full w-full max-w-[520px] transform bg-white shadow-xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b"
          style={{ borderColor: BRAND.border }}
        >
          <div className="flex items-center gap-2 p-4">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded bg-[color:var(--brand)]"
              style={{ ['--brand' as any]: BRAND.blue }}
            >
              <Link2 className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 id="interlinking-drawer-title" className="text-[15px] font-semibold text-gray-900">
                Internal Linking Summary
              </h2>
              {loading ? (
                <div className="mt-1"><SkeletonLine w="w-40" /></div>
              ) : error ? (
                <p className="mt-0.5 text-xs text-gray-500">wranker.com vs selected competitor</p>
              ) : (
                <p className="mt-0.5 text-xs text-gray-500">
                  {data?.project.domain} vs {data?.compareAgainst.domain}
                </p>
              )}
            </div>
            {data?.sourceTag && !loading && !error && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                {data.sourceTag}
              </span>
            )}
          </div>

          <button
            aria-label="Close"
            onClick={onClose}
            className="m-2 inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex h-[calc(100%-64px)] flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {/* AVG PILS Block */}
            <section aria-labelledby="avg-pils-title" className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <h3 id="avg-pils-title" className="text-sm font-semibold text-gray-900">
                  Avg. Interlinking Score (PILS)
                </h3>
                <Info
                  className="h-4 w-4 text-gray-400"
                  aria-activedescendant="PILS = Page Interlinking Score (measures link depth & distribution)"
                />
              </div>

              {loading ? (
                <MetricSkeleton />
              ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    We couldn’t load internal linking data.
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        // manually retry
                        (async () => {
                          setLoading(true);
                          setError(null);
                          try {
                            const res = await fetchInterlinkingSummary({
                              projectDomain,
                              competitors,
                              preferredCompetitor,
                              simulateEmpty,
                              simulateError: false,
                            });
                            setData(res);
                          } catch (e: any) {
                            setError(e?.message || 'Failed to load');
                          } finally {
                            setLoading(false);
                          }
                        })();
                      }}
                      className="inline-flex items-center rounded-md bg-[color:var(--brand)] px-3 py-1.5 text-sm font-medium text-white"
                      style={{ ['--brand' as any]: BRAND.blue }}
                    >
                      Retry
                    </button>
                    <button
                      onClick={handleOpenAnalyzer}
                      className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Open Link Analyzer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Project */}
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-xs text-gray-500">{data?.project.domain}</div>
                      <div className="mt-1 flex items-end justify-between">
                        <div className={cls('rounded px-2 py-1 text-sm font-semibold', speedColorByPils(data!.project.avgPILS))}>
                          {data!.project.avgPILS} PILS
                        </div>
                      </div>
                    </div>
                    {/* Competitor */}
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-xs text-gray-500">{data?.compareAgainst.domain}</div>
                      <div className="mt-1 flex items-end justify-between">
                        <div className={cls('rounded px-2 py-1 text-sm font-semibold', speedColorByPils(data!.compareAgainst.avgPILS))}>
                          {data!.compareAgainst.avgPILS} PILS
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delta message */}
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {delta?.relation === 'behind' && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        You are <strong className="font-semibold">{delta.pct}%</strong> lower than{' '}
                        <span className="font-semibold">{data?.compareAgainst.domain}</span>.
                      </div>
                    )}
                    {delta?.relation === 'ahead' && (
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        You’re ahead by <strong className="font-semibold">{delta.pct}%</strong> vs{' '}
                        <span className="font-semibold">{data?.compareAgainst.domain}</span>. Keep it up!
                      </div>
                    )}
                    {delta?.relation === 'tie' && (
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-gray-500" />
                        You and {data?.compareAgainst.domain} have comparable interlinking strength.
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

            <hr className="my-4 border-t" style={{ borderColor: BRAND.border }} />

            {/* Weakly Linked Pages */}
            <section aria-labelledby="weak-pages-title" className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900" id="weak-pages-title">
                    🚫 Weakly Linked Pages
                  </span>
                </div>
                {!loading && !error && (
                  <button
                    onClick={handleViewFullAudit}
                    className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    title="Open full Link Audit"
                  >
                    View Full Link Audit
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </button>
                )}
              </div>

              {loading && <ListSkeleton rows={3} />}

              {!loading && !error && data && data.weakPages.length === 0 && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Your internal linking is in strong shape ✅ — no weak pages detected.
                  </div>
                </div>
              )}

              {!loading && !error && data && data.weakPages.length > 0 && (
                <ol className="space-y-2">
                  {data.weakPages.map((p, idx) => (
                    <li
                      key={p.url}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-gray-700">
                          {idx + 1}
                        </span>
                        <a
                          className="truncate text-sm font-medium text-gray-900 hover:text-[color:var(--brand)]"
                          style={{ ['--brand' as any]: BRAND.blue }}
                          href={p.url}
                          onClick={(e) => e.preventDefault()}
                          title={p.url}
                        >
                          {p.url}
                        </a>
                        <div className="flex flex-wrap gap-1">
                          {(p.badges || []).map((b) => (
                            <span key={b} className={cls('rounded-full px-2 py-0.5 text-[11px] font-medium', badgeColor(b))}>
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className="rounded bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-800">
                          {p.pils} PILS
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <hr className="my-4 border-t" style={{ borderColor: BRAND.border }} />

            {/* Suggestions */}
            <section aria-labelledby="opt-suggestions-title" className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <h3 id="opt-suggestions-title" className="text-sm font-semibold text-gray-900">
                  ✅ Optimization Suggestions
                </h3>
              </div>

              {loading ? (
                <ListSkeleton rows={3} />
              ) : error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Suggestions unavailable due to an error.
                </div>
              ) : (
                <ul className="space-y-2">
                  {data?.suggestions.map((s) => (
                    <li
                      key={s.label}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
                    >
                      <div className="text-sm text-gray-800">- {s.label}</div>
                      <div className="flex items-center gap-2">
                        {typeof s.count === 'number' && (
                          <span className="rounded bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-800">
                            {s.count} {s.label.toLowerCase().includes('link') ? (s.label.toLowerCase().includes('anchor') ? 'links' : 'pages') : 'pages'}
                          </span>
                        )}
                        {s.indicator && (
                          <span className={cls('rounded px-2 py-0.5 text-[11px] font-medium', indicatorPill(s.indicator))}>
                            {s.indicator === 'easy' ? '🟢 Easy' : '🔴 Priority'}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Sticky Footer CTAs */}
          <div
            className="border-t bg-white p-3 sm:p-4"
            style={{ borderColor: BRAND.border }}
          >
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] text-gray-500">
                CTAs deep‑link to Link Analyzer with filters. PILS data from crawl & internal metrics.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAnalyzer}
                  className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  title="Open in Link Analyzer"
                >
                  Open in Link Analyzer
                  <ExternalLink className="ml-1.5 h-4 w-4" />
                </button>
                <button
                  onClick={handleCreateTask}
                  className="inline-flex items-center rounded-md bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                  style={{ ['--brand' as any]: BRAND.blue }}
                  title="Create Linking Task"
                >
                  Create Linking Task
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* =============================================================================
   Demo component
   - Mount anywhere to preview Success / Empty / Error states
==============================================================================*/
export default function DemoLinkInterlinkingDrawer() {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<'success' | 'empty' | 'error'>('success');

  return (
    // <div className="p-4">
    //   <div className="mb-3 flex items-center gap-2">
    //     <span className="text-sm font-medium text-gray-800">Link Interlinking Drawer (Demo)</span>
    //     <span className="text-xs text-gray-500">— fully wired with skeletons & states</span>
    //   </div>

    //   <div className="mb-4 flex flex-wrap items-center gap-2">
    //     <label className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm">
    //       <input
    //         type="radio"
    //         name="mode"
    //         value="success"
    //         checked={mode === 'success'}
    //         onChange={() => setMode('success')}
    //         className="mr-1"
    //       />
    //       Success
    //     </label>
    //     <label className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm">
    //       <input
    //         type="radio"
    //         name="mode"
    //         value="empty"
    //         checked={mode === 'empty'}
    //         onChange={() => setMode('empty')}
    //         className="mr-1"
    //       />
    //       Empty
    //     </label>
    //     <label className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm">
    //       <input
    //         type="radio"
    //         name="mode"
    //         value="error"
    //         checked={mode === 'error'}
    //         onChange={() => setMode('error')}
    //         className="mr-1"
    //       />
    //       Error
    //     </label>

    //     <button
    //       onClick={() => setOpen(true)}
    //       className="ml-auto inline-flex items-center rounded-md bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white"
    //       style={{ ['--brand' as any]: BRAND.blue }}
    //     >
    //       Open Drawer
    //     </button>
    //   </div>

    //   <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-600">
    //     Click “Open Drawer” to preview. Use the radio buttons to switch states.
    //   </div>

    //   <LinkInterlinkingDrawer
    //     open={open}
    //     onClose={() => setOpen(false)}
    //     projectDomain="wranker.com"
    //     competitors={['competitor1.com', 'competitor2.com']}
    //     preferredCompetitor="competitor1.com"
    //     simulateEmpty={mode === 'empty'}
    //     simulateError={mode === 'error'}
    //     onCreateTask={(payload) => {
    //       console.log('[Task Drawer] Prefill:', payload);
    //       alert('Task payload logged to console.');
    //     }}
    //     onOpenLinkAnalyzer={() => {
    //       console.log('[Route] → /link-analyzer?scope=internal&compare=competitor1.com');
    //       alert('Pretend navigating to Link Analyzer.');
    //     }}
    //     onViewFullAudit={() => {
    //       console.log('[Route] → /link-analyzer/audit?tab=interlinking');
    //       alert('Pretend navigating to Full Link Audit.');
    //     }}
    //   />
    // </div>
    <LinkInterlinkingDrawer
        open={open}
        onClose={() => setOpen(false)}
        projectDomain="wranker.com"
        competitors={['competitor1.com', 'competitor2.com']}
        preferredCompetitor="competitor1.com"
        simulateEmpty={mode === 'empty'}
        simulateError={mode === 'error'}
        onCreateTask={(payload) => {
          console.log('[Task Drawer] Prefill:', payload);
          alert('Task payload logged to console.');
        }}
        onOpenLinkAnalyzer={() => {
          console.log('[Route] → /link-analyzer?scope=internal&compare=competitor1.com');
          alert('Pretend navigating to Link Analyzer.');
        }}
        onViewFullAudit={() => {
          console.log('[Route] → /link-analyzer/audit?tab=interlinking');
          alert('Pretend navigating to Full Link Audit.');
        }}
      />
  );
}
