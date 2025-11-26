'use client';
import React, { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
} from 'recharts';
import * as htmlToImage from 'html-to-image';

type Domain = {
  /** unique key used in data mapping */
  key: string;
  /** label shown in legend */
  label: string;
  /** color used for bars/legend */
  color: string;
  /** mark your project domain for emphasis in legend */
  isYou?: boolean;
};

type Feature = {
  id: string;           // e.g., 'FS', 'PAA', 'Sitelinks', 'TopStories'
  label: string;        // e.g., 'Featured Snippet', 'PAA', 'Sitelinks', 'Top Stories'
  short?: string;       // optional short code for chips
};

type FeatureWinMatrix = Record<
  /* featureId */ string,
  /* per-domain counts */ Record<string, number>
>;

export type VisualSerpTrendsProps = {
  /** Optional section title; defaults to "Visual SERP Trends Summary" */
  title?: string;

  /** Domain identities (order = legend + bar order) */
  domains?: Domain[];

  /** Feature list (order = X-axis order) */
  features?: Feature[];

  /**
   * Matrix of wins per feature per domain:
   * {
   *   FS: { you: 4, comp1: 6, comp2: 1 },
   *   PAA: { you: 2, comp1: 5, comp2: 4 },
   *   ...
   * }
   */
  data?: FeatureWinMatrix;

  /** initial chips selected; defaults to all features */
  initialSelectedFeatures?: string[];

  /** default display mode */
  modeDefault?: 'count' | 'percent';

  /** default chart orientation */
  orientationDefault?: 'vertical' | 'horizontal';

  /** Loading skeleton toggle */
  loading?: boolean;

  /** Click handler for bar segments → filter SERP Comparison Table below */
  onBarClick?: (payload: {
    featureId: string;
    domainKey: string;
    value: number;
    isPercent: boolean;
  }) => void;

  /** Optional container className */
  className?: string;

  /** Optional external export hook (receives dataURI after download) */
  onExport?: (dataUri: string) => void;
};

/** ---------- Demo defaults (safe to remove when wiring real data) ---------- */
const DEMO_DOMAINS: Domain[] = [
  { key: 'you',   label: 'Your Domain', color: '#1090D0', isYou: true },
  { key: 'comp1', label: 'comp1.com',   color: '#FDB022' },
  { key: 'comp2', label: 'comp2.com',   color: '#3CD856' },
];

const DEMO_FEATURES: Feature[] = [
  { id: 'FS',         label: 'Featured Snippet', short: 'FS' },
  { id: 'PAA',        label: 'PAA',              short: 'PAA' },
  { id: 'Sitelinks',  label: 'Sitelinks',        short: 'SL' },
  { id: 'TopStories', label: 'Top Stories',      short: 'TS' },
];

const DEMO_DATA: FeatureWinMatrix = {
  FS:         { you: 4, comp1: 6, comp2: 1 },
  PAA:        { you: 2, comp1: 5, comp2: 4 },
  Sitelinks:  { you: 3, comp1: 1, comp2: 2 },
  TopStories: { you: 0, comp1: 1, comp2: 0 },
};
/** ------------------------------------------------------------------------ */

const numberFmt = (n: number, max = 1_000_000) =>
  Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    Math.min(n, max)
  );

const percentFmt = (p: number) =>
  `${Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(p)}%`;

export const VisualSerpTrendsSummary: React.FC<VisualSerpTrendsProps> = ({
  title = 'Visual SERP Trends Summary',
  domains = DEMO_DOMAINS,
  features = DEMO_FEATURES,
  data = DEMO_DATA,
  initialSelectedFeatures,
  modeDefault = 'count',
  orientationDefault = 'vertical',
  loading = false,
  onBarClick,
  className,
  onExport,
}) => {
  const allFeatureIds = features.map(f => f.id);
  const [selected, setSelected] = useState<string[]>(
    initialSelectedFeatures && initialSelectedFeatures.length
      ? initialSelectedFeatures
      : allFeatureIds
  );
  const [mode, setMode] = useState<'count' | 'percent'>(modeDefault);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>(
    orientationDefault
  );
  const [legendOpen, setLegendOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const chartRows = useMemo(() => {
    const filtered = features.filter(f => selectedSet.has(f.id));
    return filtered.map((f) => {
      const counts = data[f.id] ?? {};
      const total = domains.reduce((sum, d) => sum + (counts[d.key] || 0), 0);
      // transform each row into chart-ready object
      const row: Record<string, number | string> = {
        featureId: f.id,
        featureLabel: f.label,
        total,
      };
      domains.forEach((d) => {
        const raw = counts[d.key] || 0;
        row[d.key] = mode === 'percent'
          ? (total > 0 ? (raw / total) * 100 : 0)
          : raw;
      });
      return row;
    });
  }, [features, selectedSet, data, domains, mode]);

  const maxValue = useMemo(() => {
    if (mode === 'percent') return 100;
    let m = 0;
    for (const row of chartRows) {
      for (const d of domains) {
        const v = Number((row as any)[d.key] || 0);
        if (v > m) m = v;
      }
    }
    // add cushion for axis top tick
    return Math.max(m, 5);
  }, [chartRows, domains, mode]);

  const allOff = selected.length === 0;

  const handleToggleFeature = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => setSelected(allFeatureIds);
  const handleClear = () => setSelected([]);

  const handleExport = async () => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    try {
      const dataUrl = await htmlToImage.toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'serp-trends-summary.png';
      a.click();
      onExport?.(dataUrl);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', e);
    }
  };

  const barSize = domains.length >= 4 ? 18 : 24;

  return (
    <section
      className={`w-full rounded-xl border border-sky-100 bg-white shadow-sm mt-4 ${className ?? ''}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-[#282829]">
            {title}
          </span>
          <span className="ml-2 rounded-md bg-sky-50 px-2 py-[2px] text-xs text-sky-700">
            Grouped Bar
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode toggle */}
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('count')}
              className={`rounded-full px-3 py-1 ${mode === 'count' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              aria-pressed={mode === 'count'}
              title="Show keyword counts"
            >
              Count
            </button>
            <button
              type="button"
              onClick={() => setMode('percent')}
              className={`rounded-full px-3 py-1 ${mode === 'percent' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              aria-pressed={mode === 'percent'}
              title="Show % share by feature"
            >
              % Share
            </button>
          </div>

          {/* Orientation toggle */}
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setOrientation('vertical')}
              className={`rounded-full px-3 py-1 ${orientation === 'vertical' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              aria-pressed={orientation === 'vertical'}
              title="Vertical bars"
            >
              Vertical
            </button>
            <button
              type="button"
              onClick={() => setOrientation('horizontal')}
              className={`rounded-full px-3 py-1 ${orientation === 'horizontal' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              aria-pressed={orientation === 'horizontal'}
              title="Horizontal bars"
            >
              Horizontal
            </button>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            title="Download chart as PNG"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0" aria-hidden>
              <path fill="currentColor" d="M5 20h14v-2H5v2zm7-18l-5 5h3v6h4V7h3l-5-5z"/>
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3">
        <div className="mr-2 text-xs font-medium text-gray-600">Filter:</div>
        {features.map((f) => {
          const active = selectedSet.has(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => handleToggleFeature(f.id)}
              className={`rounded-full border px-3 py-1 text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
              aria-pressed={active}
              title={f.label}
            >
              {f.short ?? f.id}
            </button>
          );
        })}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            onClick={handleSelectAll}
            title="Select all features"
          >
            Select All
          </button>
          <button
            type="button"
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            onClick={handleClear}
            title="Clear feature filters"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Legend (collapsible on mobile) */}
      <div className="border-t border-gray-100 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="hidden flex-wrap items-center gap-3 sm:flex">
            {domains.map((d) => (
              <span key={d.key} className="inline-flex items-center gap-2 text-xs text-gray-700">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: d.color }}
                  aria-hidden
                />
                <span className={`${d.isYou ? 'font-medium text-gray-900' : ''}`}>{d.label}</span>
              </span>
            ))}
          </div>

          {/* Mobile legend toggle */}
          <button
            type="button"
            className="sm:hidden inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
            onClick={() => setLegendOpen((s) => !s)}
            aria-expanded={legendOpen}
          >
            Legend
            <svg width="12" height="12" viewBox="0 0 24 24" className={`${legendOpen ? 'rotate-180' : ''} transition`} aria-hidden>
              <path fill="currentColor" d="m7 10l5 5l5-5z"/>
            </svg>
          </button>
        </div>
        {legendOpen && (
          <div className="mt-2 flex flex-wrap items-center gap-3 sm:hidden">
            {domains.map((d) => (
              <span key={d.key} className="inline-flex items-center gap-2 text-xs text-gray-700">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: d.color }}
                  aria-hidden
                />
                <span className={`${d.isYou ? 'font-medium text-gray-900' : ''}`}>{d.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full border-t border-gray-100 p-3 sm:p-4">
        <div className="h-[320px] sm:h-[340px]">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </div>
          ) : allOff ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows as any[]}
                layout={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
                barCategoryGap={12}
                margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <CartesianGrid stroke="#EEF2F6" vertical={orientation !== 'horizontal'} />
                {orientation === 'horizontal' ? (
                  <>
                    <YAxis
                      dataKey="featureLabel"
                      type="category"
                      tick={{ fontSize: 12, fill: '#555' }}
                      width={110}
                    />
                    <XAxis
                      type="number"
                      domain={[0, maxValue]}
                      tick={{ fontSize: 12, fill: '#555' }}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="featureLabel"
                      tick={{ fontSize: 12, fill: '#555' }}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, maxValue]}
                      tick={{ fontSize: 12, fill: '#555' }}
                    />
                  </>
                )}

                <ReTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload as any;
                    const total = row.total || 0;
                    return (
                      <div className="rounded-md border border-gray-200 bg-white p-2 text-xs shadow-sm">
                        <div className="mb-1 font-medium text-gray-800">{label}</div>
                        <div className="space-y-1">
                          {domains.map((d) => {
                            const v = row[d.key] as number;
                            const countRaw = (data[row.featureId]?.[d.key] ?? 0) as number;
                            const pct = total > 0 ? (countRaw / total) * 100 : 0;
                            return (
                              <div key={d.key} className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2 w-2 rounded-sm"
                                  style={{ backgroundColor: d.color }}
                                  aria-hidden
                                />
                                <span className="text-gray-700">{d.label}</span>
                                <span className="ml-auto tabular-nums text-gray-900">
                                  {mode === 'percent'
                                    ? percentFmt(v)
                                    : numberFmt(v)}
                                </span>
                                <span className="text-gray-400">
                                  {mode === 'percent' ? `(${numberFmt(countRaw)} kw)` : `(${percentFmt(pct)})`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-1 border-t border-gray-100 pt-1 text-gray-500">
                          Total keywords: {numberFmt(total)}
                        </div>
                      </div>
                    );
                  }}
                />

                {domains.map((d) => (
                  <Bar
                    key={d.key}
                    dataKey={d.key}
                    name={d.label}
                    fill={d.color}
                    radius={2}
                    barSize={barSize}
                    onClick={(_, idx) => {
                      // When a bar segment is clicked, emit domain + feature for filtering.
                      const row = (chartRows as any[])[idx];
                      const rawCount = (data[row.featureId]?.[d.key] ?? 0) as number;
                      onBarClick?.({
                        featureId: row.featureId,
                        domainKey: d.key,
                        value: mode === 'percent' ? Number(row[d.key]) : rawCount,
                        isPercent: mode === 'percent',
                      });
                    }}
                    className="cursor-pointer"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Footer helper line */}
      <div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500">
        Tip: Click any bar segment to filter the SERP Comparison Table to that <span className="font-medium">Domain × Feature</span>.
      </div>
    </section>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
    <div className="text-sm font-medium text-gray-800">No SERP features selected</div>
    <div className="max-w-[360px] text-xs text-gray-500">
      Use the filter chips above to pick one or more features (e.g., FS, PAA, Sitelinks).
    </div>
  </div>
);

export default VisualSerpTrendsSummary;
