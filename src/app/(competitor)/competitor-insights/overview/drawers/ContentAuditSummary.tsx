import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   Content Audit Summary Drawer (Demo-Ready)
   - Drawer width: 520px desktop / 100% mobile (responsive)
   - Includes: skeletons, mock API, error + empty states
   - Primary CTA: Create Content Task
   - Secondary CTA: Open in Content Dashboard
   - Anchored right; consistent with other Wranker drawers
----------------------------------------------------------------------------- */

type WeakPage = { url: string; words: number };
type Suggestion = { label: string; count: number; status?: 'action' | 'resolved' };

type ContentAuditResponse = {
  projectDomain: string;
  competitorDomain: string;
  averages: {
    projectWords: number;
    competitorWords: number;
  };
  weakPages: WeakPage[]; // shortest by word count
  suggestions: Suggestion[];
};

type DrawerState = 'idle' | 'loading' | 'ok' | 'error' | 'empty';

export type ContentAuditSummaryDrawerProps = {
  open: boolean;
  onClose: () => void;

  /** Project + competitor context */
  projectDomain: string;
  competitorDomain: string;

  /** Replace with real fetcher. If omitted, uses mock. Must reject to simulate error. */
  fetchAudit?: (project: string, competitor: string) => Promise<ContentAuditResponse>;

  /** Event handlers (optional) */
  onCreateTask?: (payload: any) => void;
  onOpenDashboard?: (payload: any) => void;
  onViewFullAudit?: (payload: any) => void;

  /** Optional flag to force an error during the demo */
  simulateError?: boolean;
  className?: string;
};

/** Brand tokens used across drawers */
const TOKENS = {
  brand: '#1090D0',
  border: '#EFF0F6',
  text: '#111827',
  muted: '#6B7280',
  danger: '#F04438',
  positive: '#16A34A',
  warn: '#F59E0B',
};

/** Mock API returning stable demo data with a tiny delay */
async function mockAuditFetcher(project: string, competitor: string): Promise<ContentAuditResponse> {
  // Small delay for skeleton demo
  await new Promise((r) => setTimeout(r, 800));

  // Return consistent mock
  return {
    projectDomain: project,
    competitorDomain: competitor,
    averages: {
      projectWords: 1060,
      competitorWords: 1470,
    },
    weakPages: [
      { url: '/blog/basic-seo', words: 680 },
      { url: '/services/local-seo', words: 720 },
      { url: '/blog/seo-checklist', words: 790 },
    ],
    suggestions: [
      { label: 'Add internal links', count: 8, status: 'action' },
      { label: 'Expand thin content', count: 5, status: 'action' },
      { label: 'Add FAQs', count: 4, status: 'action' },
      { label: 'Improve headings/subtopics', count: 6, status: 'action' },
    ],
  };
}

/** Utility: compute delta as % lower/higher vs competitor */
function computeDepthDelta(project: number, competitor: number) {
  if (!competitor || competitor <= 0) return null;
  const diff = competitor - project;
  const pct = (diff / competitor) * 100; // positive means you're lower than competitor
  return Math.round(pct);
}

/** Badge for data origin hint */
function InsightBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
      title="Insight from Competitor Overview"
    >
      <Info className="mr-1 h-3 w-3" /> Overview Insight
    </span>
  );
}

/** Divider */
const Divider = () => <div className="my-4 h-px w-full bg-gray-200" />;

/** Skeleton rows */
function SkeletonRow({ lines = 1 }: { lines?: number }) {
  return (
    <div className="animate-pulse">
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="mb-2 h-3 w-full rounded bg-gray-200 last:mb-0" />
      ))}
    </div>
  );
}

/** Chip */
function TinyChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
      {children}
    </span>
  );
}

/** Colored value helper based on thresholds */
function depthColor(words: number) {
  if (words > 1400) return 'text-green-700';
  if (words >= 1000) return 'text-amber-600';
  return 'text-red-600';
}

export function ContentAuditSummaryDrawer({
  open,
  onClose,
  projectDomain,
  competitorDomain,
  fetchAudit = mockAuditFetcher,
  onCreateTask,
  onOpenDashboard,
  onViewFullAudit,
  simulateError,
  className,
}: ContentAuditSummaryDrawerProps) {
  const [state, setState] = useState<DrawerState>('idle');
  const [data, setData] = useState<ContentAuditResponse | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setState('loading');
    setErrMsg(null);
    const go = async () => {
      try {
        if (simulateError) {
          throw new Error('Network error (simulated)');
        }
        const res = await fetchAudit(projectDomain, competitorDomain);
        // Empty state check (e.g., no weak pages & no suggestions)
        if (!res?.weakPages?.length && !res?.suggestions?.length) {
          setData({
            ...res,
            weakPages: [],
            suggestions: [],
          });
          setState('empty');
        } else {
          setData(res);
          setState('ok');
        }
      } catch (e: any) {
        setErrMsg(e?.message || 'Failed to load content audit.');
        setState('error');
      }
    };
    go();
  }, [open, projectDomain, competitorDomain, fetchAudit, simulateError]);

  const deltaPct = useMemo(() => {
    if (!data) return null;
    return computeDepthDelta(data.averages.projectWords, data.averages.competitorWords);
  }, [data]);

  const isWorse = typeof deltaPct === 'number' && deltaPct > 0;

  const handleCreateTask = () => {
    const payload = {
      type: 'content',
      title: 'Expand thin content on blog/service pages',
      urls:
        data?.weakPages?.map((p) => `${data?.projectDomain}${p.url}`) ?? [],
      source: 'Content Audit Summary Drawer',
      context: {
        project: projectDomain,
        competitor: competitorDomain,
      },
    };
    if (onCreateTask) onCreateTask(payload);
    else console.log('[Task Drawer] →', payload);
  };

  const handleOpenDashboard = () => {
    const payload = {
      route: '/content/audit',
      filters: { project: projectDomain, competitor: competitorDomain },
    };
    if (onOpenDashboard) onOpenDashboard(payload);
    else console.log('[Route] → Content Dashboard', payload);
  };

  const handleViewFullAudit = () => {
    const payload = {
      route: '/content/audit',
      filters: { sort: 'wordCount:asc', focus: 'weak' },
    };
    if (onViewFullAudit) onViewFullAudit(payload);
    else console.log('[Route] → View Full Content Audit', payload);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/30 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        aria-hidden={!open}
        // onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={[
          'fixed right-0 top-0 z-50 h-full w-full max-w-[520px] translate-x-0 transform bg-white shadow-xl transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
          'flex flex-col',
          className ?? '',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-audit-title"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[color:var(--brand,#1090D0)]" style={{ ['--brand' as any]: TOKENS.brand }} />
                <h3 id="content-audit-title" className="truncate text-base font-semibold text-gray-900">
                  Content Audit Summary
                </h3>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-gray-600">
                {projectDomain} <span className="mx-1">vs</span> {competitorDomain}
              </p>
              <div className="mt-1">
                <InsightBadge />
              </div>
            </div>

            {/* <button
              onClick={onClose}
              className="ml-3 inline-flex rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button> */}
          </div>
        </div>

        {/* Body scroll area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {/* Loading */}
          {state === 'loading' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-800">Avg. Word Count</p>
                </div>
                <SkeletonRow lines={2} />
                <Divider />
                <SkeletonRow lines={1} />
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-800">Weak Pages</p>
                </div>
                <SkeletonRow lines={3} />
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gray-500" />
                  <p className="text-sm font-medium text-gray-800">Optimization Opportunities</p>
                </div>
                <SkeletonRow lines={4} />
              </div>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-semibold">Couldn’t load content audit</p>
              </div>
              <p className="text-sm text-red-700/90">{errMsg ?? 'Please try again.'}</p>
              <div className="mt-3">
                <button
                  onClick={() => {
                    // reload
                    setState('loading');
                    setTimeout(() => {
                      setState('idle');
                      // re-run effect by toggling open off/on is clunky, so fetch again here:
                      (async () => {
                        try {
                          const res = await (simulateError
                            ? Promise.reject(new Error('Network error (simulated)'))
                            : fetchAudit(projectDomain, competitorDomain));
                          if (!res?.weakPages?.length && !res?.suggestions?.length) {
                            setData({ ...res, weakPages: [], suggestions: [] });
                            setState('empty');
                          } else {
                            setData(res);
                            setState('ok');
                          }
                        } catch (e: any) {
                          setErrMsg(e?.message || 'Failed to load content audit.');
                          setState('error');
                        }
                      })();
                    }, 350);
                  }}
                  className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100"
                >
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Empty */}
          {state === 'empty' && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-1 flex items-center gap-2 text-gray-800">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-semibold">No underperforming pages found</p>
              </div>
              <p className="text-sm text-gray-600">
                We couldn’t find weak pages or suggestions for the current selection.
              </p>
              <div className="mt-3">
                <button
                  onClick={handleOpenDashboard}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Open Content Dashboard
                  <ExternalLink className="ml-1.5 h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* OK */}
          {state === 'ok' && data && (
            <div className="space-y-4">
              {/* Avg Word Count */}
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900">Avg. Word Count</h4>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-gray-700">{data.projectDomain}</span>
                    <span className={['font-semibold', depthColor(data.averages.projectWords)].join(' ')}>
                      {data.averages.projectWords.toLocaleString()} words
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-gray-700">{data.competitorDomain}</span>
                    <span className={['font-semibold', depthColor(data.averages.competitorWords)].join(' ')}>
                      {data.averages.competitorWords.toLocaleString()} words
                    </span>
                  </div>
                </div>

                <Divider />

                <div
                  className={[
                    'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
                    isWorse ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
                  ].join(' ')}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <p className="leading-relaxed">
                    {typeof deltaPct === 'number' ? (
                      isWorse ? (
                        <>You are <strong>{deltaPct}%</strong> lower in average content depth.</>
                      ) : (
                        <>You exceed competitor average by <strong>{Math.abs(deltaPct)}%</strong>.</>
                      )
                    ) : (
                      <>Comparison unavailable.</>
                    )}
                  </p>
                </div>
              </section>

              {/* Weak Pages */}
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-900">Weak Pages (Shortest by Word Count)</h4>
                  </div>
                  <TinyChip>Top 3</TinyChip>
                </div>

                {data.weakPages?.length ? (
                  <ol className="space-y-2 pl-4 text-sm">
                    {data.weakPages.slice(0, 3).map((p, idx) => (
                      <li key={idx} className="list-decimal">
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                          <span className="truncate text-gray-800">{p.url}</span>
                          <span className="whitespace-nowrap text-gray-700">
                            {p.words.toLocaleString()} words
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-gray-600">No weak pages detected.</p>
                )}

                <div className="mt-3">
                  <button
                    onClick={handleViewFullAudit}
                    className="inline-flex items-center text-sm font-medium text-[color:var(--brand,#1090D0)] hover:underline"
                    style={{ ['--brand' as any]: TOKENS.brand }}
                  >
                    View Full Content Audit
                    <ChevronRight className="ml-0.5 h-4 w-4" />
                  </button>
                </div>
              </section>

              {/* Optimization Opportunities */}
              <section className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900">Optimization Opportunities</h4>
                </div>

                <ul className="space-y-2">
                  {data.suggestions?.map((s, idx) => {
                    const resolved = s.status === 'resolved';
                    return (
                      <li
                        key={idx}
                        className={[
                          'flex items-center justify-between rounded-lg px-3 py-2',
                          resolved ? 'bg-green-50' : 'bg-sky-50',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-800">
                            {s.label} on <strong>{s.count}</strong> {s.count === 1 ? 'page' : 'pages'}
                          </span>
                        </div>
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            resolved ? 'bg-green-100 text-green-700' : 'bg-sky-100 text-sky-800',
                          ].join(' ')}
                        >
                          {resolved ? 'Resolved' : 'Actionable'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-gray-500">
              Tips powered by Content Dashboard + Link Analyzer. Values reflect top performing pages.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenDashboard}
                className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                title="Open full Content Dashboard"
              >
                Open in Content Dashboard
                <ExternalLink className="ml-1.5 h-4 w-4" />
              </button>
              <button
                onClick={handleCreateTask}
                className="inline-flex items-center rounded-md bg-[color:var(--brand,#1090D0)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ ['--brand' as any]: TOKENS.brand }}
                title="Create a content optimization task"
              >
                Create Content Task
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* -----------------------------------------------------------------------------
   DEMO WRAPPER
   - Renders a page button + keeps the drawer open initially
   - Provides simulateError toggle example (disabled by default)
----------------------------------------------------------------------------- */
export default function ContentAuditSummaryDrawerDemo() {
  const [open, setOpen] = useState(true);
  const [simulateError, setSimulateError] = useState(false);

  return (
    <>
    
          <ContentAuditSummaryDrawer
        open={open}
        onClose={() => setOpen(false)}
        projectDomain="wranker.com"
        competitorDomain="competitor1.com"
        simulateError={simulateError}
      />
    </>
  );
}



