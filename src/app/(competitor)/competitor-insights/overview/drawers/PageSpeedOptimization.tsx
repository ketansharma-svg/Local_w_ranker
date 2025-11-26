import React, { useMemo, useState } from 'react';
import {
  X,
  Rocket,
  Timer,
  Turtle,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';

/** ---------------------------------------------------------------------------
 *  Page Speed Optimization Drawer – Drop-in + Demo-ready
 *  - TailwindCSS only
 *  - Uncontrolled by default (opens with demo data); controlled via `open` prop
 * --------------------------------------------------------------------------*/

type SlowPage = { path: string; speedSec: number };
type SuggestionItem = {
  label: string;
  countLabel?: string;              // e.g., "12 pages", "8 templates"
  status?: 'actionable' | 'resolved';
};

export type PageSpeedDrawerProps = {
  projectDomain?: string;
  competitorDomain?: string;
  yourAvgSec?: number;              // e.g., 2.4
  competitorAvgSec?: number;        // e.g., 1.6
  slowestPages?: SlowPage[];        // Top 3–5
  suggestions?: SuggestionItem[];   // Quick fixes list
  originTag?: string;               // e.g., "Insight from Overview Tab"

  // Controlled mode
  open?: boolean;
  onClose?: () => void;

  // CTA handlers
  onCreateTask?: () => void;
  onRunAudit?: () => void;
  onViewAllPages?: () => void;

  // Style
  className?: string;
  widthPx?: number;                 // default 520
};

const BRAND = '#1090D0';

function formatSec(sec: number | undefined) {
  if (sec == null || Number.isNaN(sec)) return '—';
  return `${sec.toFixed(1)}s`;
}

function speedTone(sec: number | undefined) {
  // Spec: Green < 2s, Yellow 2–3s, Red > 3s
  if (sec == null) return { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-100' };
  if (sec < 2) return { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-100' };
  if (sec <= 3) return { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-100' };
  return { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-100' };
}

function SpeedChip({ value }: { value?: number }) {
  const tone = speedTone(value);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}>
      {formatSec(value)}
    </span>
  );
}

function Divider() {
  return <hr className="my-4 border-gray-200" />;
}

export default function PageSpeedOptimizationDrawer(props: PageSpeedDrawerProps) {
  // Uncontrolled by default (opens on mount for demo)
  const [internalOpen, setInternalOpen] = useState<boolean>(props.open ?? true);
  const isControlled = typeof props.open === 'boolean';
  const isOpen = isControlled ? !!props.open : internalOpen;

  const projectDomain = props.projectDomain ?? 'wranker.com';
  const competitorDomain = props.competitorDomain ?? 'competitor2.com';
  const widthPx = props.widthPx ?? 520;

  const yourAvg = props.yourAvgSec ?? 2.4;
  const compAvg = props.competitorAvgSec ?? 1.6;

  // Demo data fallbacks
  const slowest: SlowPage[] =
    props.slowestPages ??
    [
      { path: '/product/seo-tool', speedSec: 3.8 },
      { path: '/blog/load-time-guide', speedSec: 3.4 },
      { path: '/home', speedSec: 3.2 },
    ];

  const suggestions: SuggestionItem[] =
    props.suggestions ??
    [
      { label: 'Compress images', countLabel: '12 pages', status: 'actionable' },
      { label: 'Minify CSS/JS', countLabel: '8 templates', status: 'actionable' },
      { label: 'Reduce third‑party scripts', countLabel: '5 pages', status: 'actionable' },
    ];

  const deltaPct = useMemo(() => {
    if (!compAvg || compAvg <= 0) return undefined;
    const diff = ((yourAvg - compAvg) / compAvg) * 100;
    return Math.round(diff);
  }, [yourAvg, compAvg]);

  const deltaMessage =
    deltaPct == null
      ? 'Speed comparison unavailable.'
      : deltaPct === 0
      ? `Your site matches ${competitorDomain}.`
      : deltaPct > 0
      ? `⚠️ Your site is ${deltaPct}% slower than ${competitorDomain}.`
      : `✅ Your site is ${Math.abs(deltaPct)}% faster than ${competitorDomain}.`;

  const handleClose = () => {
    props.onClose?.();
    if (!isControlled) setInternalOpen(false);
  };

  const openUncontrolled = () => {
    if (!isControlled) setInternalOpen(true);
  };

  // Optional demo open button when component is uncontrolled & closed
  const renderDemoTrigger =
    !isControlled && !isOpen ? (
      <button
        type="button"
        onClick={openUncontrolled}
        className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand,#1090D0)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ ['--brand' as any]: BRAND }}
      >
        <Rocket className="h-4 w-4" />
        Open Page Speed Drawer
      </button>
    ) : null;

  return (
    <>
      {renderDemoTrigger}

      {/* Overlay */}
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-50 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'} transition`}
      >
        {/* Backdrop */}
        <div
          // onClick={handleClose}
          className={`absolute inset-0 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Drawer Panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="psod-title"
          className={[
            'absolute right-0 top-0 h-full w-full max-w-full sm:max-w-[520px]',
            'transform bg-white shadow-xl transition-transform',
            isOpen ? 'translate-x-0' : 'translate-x-full',
            props.className ?? '',
          ].join(' ')}
          style={{ width: `min(100%, ${widthPx}px)` }}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 p-4">
            <div className="flex min-w-0 items-center gap-2">
              <Rocket className="h-5 w-5 text-[color:var(--brand,#1090D0)]" style={{ ['--brand' as any]: BRAND }} />
              <div className="min-w-0">
                <h2 id="psod-title" className="truncate text-base font-semibold text-gray-900">
                  Page Speed Comparison
                </h2>
                <p className="truncate text-xs text-gray-600">
                  {projectDomain} vs {competitorDomain}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {props.originTag && (
                <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 sm:inline">
                  {props.originTag}
                </span>
              )}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex h-[calc(100%-56px)] flex-col">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* Avg Speed block */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Timer className="h-5 w-5 text-gray-700" />
                  <h3 className="text-sm font-semibold text-gray-900">Avg Speed</h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">{projectDomain}</span>
                    </div>
                    <SpeedChip value={yourAvg} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">{competitorDomain}</span>
                    </div>
                    <SpeedChip value={compAvg} />
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                  <p
                    className={`text-sm ${
                      deltaPct != null && deltaPct > 0 ? 'text-amber-700' : 'text-gray-700'
                    }`}
                  >
                    {deltaMessage}
                  </p>
                </div>
              </div>

              <Divider />

              {/* Slowest Pages */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Turtle className="h-5 w-5 text-gray-700" />
                  <h3 className="text-sm font-semibold text-gray-900">Slowest Pages</h3>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Page URL</th>
                        <th className="px-3 py-2 text-right">Load Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {slowest.slice(0, 5).map((row, i) => (
                        <tr key={`${row.path}-${i}`} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-800">{row.path}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <SpeedChip value={row.speedSec} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={props.onViewAllPages ?? (() => console.log('[Route] → Site Audit > Pages (Speed filter)'))}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--brand,#1090D0)] hover:underline"
                    style={{ ['--brand' as any]: BRAND }}
                  >
                    View All Pages in Site Audit
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Divider />

              {/* Quick Suggestions */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-gray-700" />
                  <h3 className="text-sm font-semibold text-gray-900">Quick Suggestions</h3>
                </div>

                <ul className="space-y-2">
                  {suggestions.map((s, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:shadow-sm"
                      title="Suggested by AI / Lighthouse signals"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden />
                        <span className="truncate text-sm text-gray-800">
                          {s.label}
                          {s.countLabel ? <span className="ml-1 text-gray-500">— {s.countLabel}</span> : null}
                        </span>
                      </div>
                      {s.status && (
                        <span
                          className={[
                            'ml-3 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            s.status === 'resolved'
                              ? 'bg-green-50 text-green-700 ring-1 ring-green-100'
                              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
                          ].join(' ')}
                        >
                          {s.status === 'resolved' ? '✅ Resolved' : '🔧 Actionable'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Tiny helper note */}
                <div className="mt-3 flex items-start gap-1 text-xs text-gray-500">
                  <Info className="mt-0.5 h-4 w-4 text-gray-400" />
                  <p>
                    Tips sourced from Page Audit / Lighthouse signals. Use the buttons below for quick execution.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="shrink-0 border-t border-gray-200 p-4">
              <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={props.onRunAudit ?? (() => console.log('[Route] → Site Audit > Speed tab'))}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2"
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Run Full Speed Audit
                </button>

                <button
                  type="button"
                  onClick={props.onCreateTask ?? (() => console.log('[Drawer] → Create Task (Speed)'))}
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--brand,#1090D0)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ ['--brand' as any]: BRAND }}
                >
                  Create Speed Task
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
USAGE (Demo)
------------------------------------------------------------------------------
Render <PageSpeedOptimizationDrawer /> by itself. It will open with demo data.
In controlled mode:

<PageSpeedOptimizationDrawer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  projectDomain="wranker.com"
  competitorDomain="competitor2.com"
  yourAvgSec={2.4}
  competitorAvgSec={1.6}
  slowestPages={[
    { path: '/product/seo-tool', speedSec: 3.8 },
    { path: '/blog/load-time-guide', speedSec: 3.4 },
    { path: '/home', speedSec: 3.2 },
  ]}
  suggestions={[
    { label: 'Compress images', countLabel: '12 pages', status: 'actionable' },
    { label: 'Minify CSS/JS', countLabel: '8 templates', status: 'actionable' },
    { label: 'Reduce third‑party scripts', countLabel: '5 pages', status: 'actionable' },
  ]}
  originTag="Insight from Overview Tab"
/>

Tailwind notes:
- Uses standard classes; no custom plugins required.
- Brand color is #1090D0 per spec.
---------------------------------------------------------------------------*/
