'use client';


import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  Bar,
  Line,
} from 'recharts';


/* ============================================================================
 * Wranker‑token alias layer (keep left side; point right side to your tokens)
 * You can put this block once in your global CSS; included here as comments:
 *
 * :root {
 *   --color-blue-600:   var(--wr-data-clicks-600);        // Clicks
 *   --color-teal-600:   var(--wr-data-impressions-600);   // Impressions
 *   --color-purple-600: var(--wr-data-ctr-600);           // CTR
 *   --color-amber-600:  var(--wr-data-position-600);      // Position
 *   --color-gray-200:   var(--wr-border-subtle);          // grid/axes
 *   --color-slate-600:  var(--wr-text-subtle);            // axis ticks
 *   --color-slate-800:  var(--wr-text-strong);            // titles/labels
 *   --color-emerald-600: var(--wr-positive-600);          // ▲ up good
 *   --color-rose-600:    var(--wr-negative-600);          // ▼ down bad
 * }
 * ========================================================================== */


/** =============================== Types =============================== */
type MetricKey = 'clicks' | 'impressions' | 'ctr' | 'position';
type DeviceKey = 'all' | 'desktop' | 'mobile' | 'tablet';
type ChartMode = 'area' | 'bar';
type RangeKey = '7d' | '14d' | '30d' | '90d' | 'custom';


export type TrendPoint = {
  date: string;               // ISO yyyy-mm-dd
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;        // ratio 0..1 or percent 0..100 (normalized internally)
  position?: number | null;   // avg rank (lower is better)
};


export interface KeywordTrendMiniProps {
  query?: string;


  /** Data (if omitted, a mock series is auto-generated) */
  current?: TrendPoint[];
  previous?: TrendPoint[];           // equal-length/keys preferred, but not required


  /** Controls (initial) */
  defaultMetrics?: MetricKey[];      // default: ['clicks','impressions']
  defaultRange?: RangeKey;           // default: '30d'
  defaultDevice?: DeviceKey;         // default: 'all'
  defaultCompareOn?: boolean;        // default: false
  defaultChart?: ChartMode;          // default: 'area'


  /** Behavior / UX */
  showCompareToggle?: boolean;       // default: true (Phase 1.1); set false for Phase 1.0
  latestDayPartial?: boolean;        // exclude partial last day
  insightText?: string;              // optional banner (e.g., spike detected)
  timezone?: string;                 // e.g., 'America/Los_Angeles'


  /** Telemetry */
  onEvent?: (name: 'trends_metric_change'|'trends_compare_toggle'|'trends_export'|'trends_point_hover',
             payload: Record<string, any>) => void;


  /** Styling */
  className?: string;
}


/** =============================== Tokens =============================== */
const TOKENS = {
  blue600:   'var(--color-blue-600, #2563eb)',   // Clicks
  teal600:   'var(--color-teal-600, #0d9488)',   // Impressions
  purple600: 'var(--color-purple-600, #7c3aed)', // CTR
  amber600:  'var(--color-amber-600, #d97706)',  // Position
  gray200:   'var(--color-gray-200, #e5e7eb)',   // Grid
  slate600:  'var(--color-slate-600, #475569)',  // Ticks
  slate800:  'var(--color-slate-800, #1f2937)',  // Titles
  emerald600:'var(--color-emerald-600, #059669)',// Positive
  rose600:   'var(--color-rose-600, #e11d48)',   // Negative
  white:     '#ffffff',
};


const METRIC_META: Record<MetricKey, { label: string; color: string; axis: 'count'|'pct'|'rank' }> = {
  clicks: { label: 'Clicks',        color: TOKENS.blue600,   axis: 'count' },
  impressions: { label: 'Impressions', color: TOKENS.teal600,   axis: 'count' },
  ctr: { label: 'CTR',              color: TOKENS.purple600, axis: 'pct'   },
  position: { label: 'Avg. Position', color: TOKENS.amber600,  axis: 'rank'  },
};


const METRIC_ORDER: MetricKey[] = ['clicks','impressions','ctr','position'];


/** =============================== Utils =============================== */
const cx = (...xs: (string|false|null|undefined)[]) => xs.filter(Boolean).join(' ');


const fmtShort = (n: number | null | undefined) => {
  if (n == null || !isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${(n/1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
};
const fmtPct = (ratio: number | null | undefined, decimals = 2) => {
  if (ratio == null || !isFinite(ratio)) return '—';
  return `${ratio.toFixed(decimals)}%`;
};
const fmtPos = (p: number | null | undefined, decimals = 1) => {
  if (p == null || !isFinite(p)) return '—';
  return p.toFixed(decimals);
};
const pctDelta = (curr?: number|null, prev?: number|null) => {
  if (curr == null || prev == null || !isFinite(curr) || !isFinite(prev) || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
};
const ppDelta = (curr?: number|null, prev?: number|null) => {
  if (curr == null || prev == null || !isFinite(curr) || !isFinite(prev)) return null;
  return curr - prev; // percentage points
};
const normalizeCtrToPct = (v: number | null | undefined) =>
  v == null ? null : v > 1 ? v : v * 100;


const isoToLabel = (iso: string, tz?: string) =>
  new Intl.DateTimeFormat(undefined, { timeZone: tz || 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
    .format(new Date(iso + 'T00:00:00Z')); // Thu, Jun 13


const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0,10);
};
const daysBetween = (startISO: string, endISO: string) => {
  const out: string[] = [];
  let d = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  while (d <= end) { out.push(d.toISOString().slice(0,10)); d.setUTCDate(d.getUTCDate()+1); }
  return out;
};


const getReduceMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};


/** =============================== Data shaping =============================== */
type ChartRow = {
  date: string;
  clicks: number;
  impressions: number;
  ctrPct: number | null;        // 0..100
  position: number | null;
  prev_clicks?: number;
  prev_impressions?: number;
  prev_ctrPct?: number | null;
  prev_position?: number | null;
};


function pickRange(
  arr: TrendPoint[],
  preset: RangeKey,
  custom?: { start?: string; end?: string },
  latestDayPartial?: boolean
) {
  if (!arr?.length) return { start: undefined, end: undefined };
  const sorted = [...arr].sort((a,b) => (a.date < b.date ? -1 : 1));
  let end = sorted[sorted.length - 1].date;
  if (latestDayPartial && sorted.length > 1) end = sorted[sorted.length - 2].date;


  if (preset === 'custom' && custom?.start && custom?.end) {
    return { start: custom.start, end: custom.end };
  }
  const days = preset === '7d' ? 7 : preset === '14d' ? 14 : preset === '30d' ? 30 : 90;
  const s = addDays(end, -(days - 1));
  return { start: s, end };
}


function materializeWindow(cur: TrendPoint[], start: string, end: string) {
  const map = new Map(cur.map(r => [r.date, r]));
  return daysBetween(start, end).map(d => {
    const r = map.get(d);
    const clicks = r?.clicks ?? 0;
    const impressions = r?.impressions ?? 0;
    const ctrPct = normalizeCtrToPct(
      r?.ctr ?? (impressions > 0 ? (clicks / impressions) : null)
    );
    const position = (typeof r?.position === 'number' && r.position >= 1) ? r?.position ?? null : null;


    return { date: d, clicks, impressions, ctrPct, position } as ChartRow;
  });
}


function overlayPrevious(rows: ChartRow[], previous?: TrendPoint[], start?: string, end?: string) {
  if (!rows.length) return rows;
  let prevRows: ChartRow[] | undefined;


  if (previous?.length && start && end) {
    const prevMap = new Map(previous.map(r => [r.date, r]));
    prevRows = rows.map(r => {
      const p = prevMap.get(r.date);
      const pc = p?.clicks ?? 0;
      const pi = p?.impressions ?? 0;
      const pctr = normalizeCtrToPct(p?.ctr ?? (pi > 0 ? pc / pi : null));
      const ppos = (typeof p?.position === 'number' && p.position >= 1) ? p.position : null;
      return { ...r, prev_clicks: pc, prev_impressions: pi, prev_ctrPct: pctr, prev_position: ppos };
    });
  } else {
    // Synthetic (visual) previous: 10% down for counts, -4% absolute pp for CTR, +0.3 worse for position
    prevRows = rows.map(r => ({
      ...r,
      prev_clicks: Math.max(0, Math.round(r.clicks * 0.9)),
      prev_impressions: Math.max(0, Math.round(r.impressions * 0.9)),
      prev_ctrPct: r.ctrPct == null ? null : Math.max(0, r.ctrPct * 0.96),
      prev_position: r.position == null ? null : (r.position + 0.3),
    }));
  }
  return prevRows;
}


/** =============================== Component =============================== */
export const KeywordTrendMini: React.FC<KeywordTrendMiniProps> = ({
  query = 'selected query',
  current,
  previous,
  defaultMetrics = ['clicks','impressions'],
  defaultRange = '30d',
  defaultDevice = 'all',
  defaultCompareOn = false,
  defaultChart = 'area',
  showCompareToggle = true,           // set false in Phase 1.0
  latestDayPartial = false,
  insightText,
  timezone,
  onEvent,
  className,
}) => {
  const uid = useId().replace(/:/g,'-');
  const chartRef = useRef<HTMLDivElement|null>(null);
  const reduceMotion = getReduceMotion();


  /** ---- Mock data fallback ---- */
  const MOCK = useMemo(() => makeMockSeries(90), []);
  const cur = (current && current.length) ? current : MOCK.current;
  const prv = (previous && previous.length) ? previous : MOCK.previous;


  /** ---- Controls ---- */
  const [metrics, setMetrics] = useState<MetricKey[]>(defaultMetrics.length ? defaultMetrics : ['clicks','impressions']);
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [device, setDevice] = useState<DeviceKey>(defaultDevice);
  const [compareOn, setCompareOn] = useState<boolean>(defaultCompareOn);
  const [chartMode, setChartMode] = useState<ChartMode>(defaultChart);


  /** ---- Window selection ---- */
  const { start, end } = useMemo(
    () => pickRange(cur, range, { start: customStart, end: customEnd }, latestDayPartial),
    [cur, range, customStart, customEnd, latestDayPartial]
  );


  /** ---- Materialize + overlay ---- */
  const rows = useMemo<ChartRow[]>(() => {
    if (!start || !end) return [];
    const base = materializeWindow(cur, start, end);
    if (!compareOn) return base;
    return overlayPrevious(base, prv, start, end);
  }, [cur, prv, start, end, compareOn]);


  const hasCounts = metrics.some(m => METRIC_META[m].axis === 'count');
  const hasPct    = metrics.includes('ctr');
  const hasRank   = metrics.includes('position');


  /** ---- Export helpers ---- */
  async function exportPNG() {
    try {
      const root = chartRef.current; if (!root) throw new Error('no-root');
      const svg = root.querySelector('svg'); if (!svg) throw new Error('no-svg');
      const xml = new XMLSerializer().serializeToString(svg);
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      const img = new Image();
      const { width, height } = svg.getBoundingClientRect();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(width); canvas.height = Math.ceil(height);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('no-ctx');
      ctx.fillStyle = TOKENS.white; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img, 0,0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a'); a.href = pngUrl; a.download = `keyword-trend-${start}_to_${end}.png`; a.click();
      onEvent?.('trends_export', { surface:'drawer', format:'png', metrics:metrics.join(','), range, compare:compareOn });
    } catch {
      exportCSV(); // fallback
    }
  }
  function exportCSV() {
    const header: string[] = ['Date'];
    metrics.forEach(m => {
      header.push(`Current ${METRIC_META[m].label}`);
      if (compareOn) header.push(`Previous ${METRIC_META[m].label}`);
    });
    const lines = [header.join(',')];
    rows.forEach(r => {
      const parts: (string|number)[] = [r.date];
      metrics.forEach(m => {
        const curVal = m === 'ctr' ? (r.ctrPct ?? '') : m === 'position' ? (r.position ?? '') : (r[m] as any ?? '');
        const prevVal = compareOn
          ? m === 'ctr' ? (r.prev_ctrPct ?? '') :
            m === 'position' ? (r.prev_position ?? '') :
            (r[`prev_${m}` as const] as any ?? '')
          : null;
        parts.push(curVal);
        if (compareOn) parts.push(prevVal as any);
      });
      lines.push(parts.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `keyword-trend-${start}_to_${end}.csv`; a.click();
    URL.revokeObjectURL(url);
    onEvent?.('trends_export', { surface:'drawer', format:'csv', metrics:metrics.join(','), range, compare:compareOn });
  }


  /** ---- Tooltip ---- */
  const TooltipContent = ({ active, label }: any) => {
    if (!active || !label) return null;
    const i = rows.findIndex(r => r.date === label);
    if (i < 0) return null;
    const row = rows[i];
    const prevRow = i > 0 ? rows[i-1] : undefined;


    return (
      <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-md"
           style={{ borderColor: TOKENS.gray200, maxWidth: 360 }}>
        <div className="mb-1 font-semibold" style={{ color: TOKENS.slate800 }}>{isoToLabel(label, timezone)}</div>
        <div className="space-y-1.5">
          {metrics.map(m => {
            const meta = METRIC_META[m];
            // Current value
            const curVal = ((): string => {
              if (m === 'ctr')      return fmtPct(row.ctrPct, 2);
              if (m === 'position') return fmtPos(row.position, 1);
              return fmtShort((row as any)[m] ?? null);
            })();


            // DoD delta (vs previous day in current window)
            const dod = ((): { txt: string; good?: boolean } => {
              if (!prevRow) return { txt: '—' };
              if (m === 'position') {
                const a = row.position, b = prevRow.position; if (a == null || b == null) return { txt:'—' };
                const diff = a - b; // + worse, - better
                const good = diff < 0; // down is good
                return { txt: `${diff < 0 ? '▼' : diff > 0 ? '▲' : ''} ${fmtPos(Math.abs(diff), 1)} vs previous day ${diff < 0 ? '(better)' : diff > 0 ? '(worse)' : ''}`, good };
              } else if (m === 'ctr') {
                const a = row.ctrPct, b = prevRow.ctrPct; if (a == null || b == null) return { txt:'—' };
                const pp = ppDelta(a, b)!;
                return { txt: `${pp >= 0 ? '▲' : '▼'} ${Math.abs(pp).toFixed(2)} pp vs previous day`, good: pp >= 0 };
              } else {
                const a = (row as any)[m] as number, b = (prevRow as any)[m] as number;
                const d = pctDelta(a, b); if (d == null) return { txt:'—' };
                return { txt: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}% vs previous day`, good: d >= 0 };
              }
            })();


            // Previous period delta (when compare)
            const prev = compareOn ? ((): { val: string; delta: string } => {
              let pv: number | null | undefined;
              if (m === 'ctr')      pv = row.prev_ctrPct ?? null;
              else if (m === 'position') pv = row.prev_position ?? null;
              else pv = (row as any)[`prev_${m}`] ?? null;


              const pvTxt = m === 'ctr' ? fmtPct(pv ?? null, 2) :
                            m === 'position' ? fmtPos(pv ?? null, 1) :
                            fmtShort(pv ?? null);


              let deltaTxt = '—';
              if (pv != null) {
                if (m === 'position') {
                  const a = row.position; if (a != null) {
                    const diff = a - pv;
                    deltaTxt = `${diff < 0 ? '▼' : diff > 0 ? '▲' : ''} ${fmtPos(Math.abs(diff), 1)}`;
                  }
                } else {
                  const a = (m === 'ctr') ? row.ctrPct : (row as any)[m];
                  const d = pctDelta(a, pv);
                  if (d != null) deltaTxt = `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}%`;
                }
              }
              return { val: pvTxt, delta: deltaTxt };
            })() : null;


            return (
              <div key={m} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-0.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-slate-600" style={{ color: TOKENS.slate600 }}>{meta.label}</span>
                <span className="font-medium" style={{ color: TOKENS.slate800 }}>{curVal}</span>


                <span />
                <span className="text-slate-500" style={{ color: '#64748b' }}>DoD</span>
                <span className={cx('font-medium', dod.good === undefined ? '' : (dod.good ? 'text-emerald-600' : 'text-rose-600'))}
                      style={{ color: dod.good === undefined ? undefined : (dod.good ? TOKENS.emerald600 : TOKENS.rose600) }}>
                  {dod.txt}
                </span>


                {compareOn && prev && (
                  <>
                    <span className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: meta.color, opacity: 0.45 }} />
                    <span className="text-slate-500" style={{ color: '#64748b' }}>Prev period</span>
                    <span className="text-slate-700" style={{ color: '#334155' }}>
                      {prev.val} <span className="ml-1 font-medium">{prev.delta}</span>
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  /** ---- Metric chip ---- */
  const [metricMenuOpen, setMetricMenuOpen] = useState(false);
  const metricRef = useRef<HTMLDivElement|null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!metricRef.current) return;
      if (metricMenuOpen && !metricRef.current.contains(e.target as Node)) setMetricMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [metricMenuOpen]);


  function toggleMetric(m: MetricKey) {
    setMetrics(prev => {
      if (prev.includes(m)) { if (prev.length === 1) return prev; return prev.filter(x => x !== m); }
      return [...prev, m];
    });
    onEvent?.('trends_metric_change', { surface:'drawer', metric:m, all:metrics.join(','), range, device });
  }


  /** ---- Range summary ---- */
  const rangeSummary = start && end ? `${isoToLabel(start, timezone)} → ${isoToLabel(end, timezone)}` : '—';


  /** ---- Gradients & patterns ids ---- */
  const gImpr = `${uid}-g-impr`;
  const pPrev = `${uid}-p-prev`;


  /** ---- A11y label ---- */
  const ariaLabel = `Performance trend for ${query}: ${metrics.map(m => METRIC_META[m].label).join(', ')}, ${rangeSummary}, ${device}.`;


  return (
    <section aria-label={ariaLabel} className={cx('w-full rounded-xl border bg-white p-4 md:p-5 mt-4', className)}
             style={{ borderColor: TOKENS.gray200 }}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm md:text-base font-semibold" style={{ color: TOKENS.slate800 }}>Performance trend</h3>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: '#ecfdf5', color: '#065f46' }}>GSC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: TOKENS.gray200 }}>
            {(['area','bar'] as ChartMode[]).map((k, i) => {
              const active = chartMode === k;
              return (
                <button key={k} type="button"
                        className={cx('px-2.5 py-1.5 text-xs font-medium',
                                      i>0 && 'border-l',
                                      active ? 'bg-white' : 'bg-[#f1f5f9]')}
                        style={{ borderColor: TOKENS.gray200, color: active ? TOKENS.slate800 : TOKENS.slate600 }}
                        onClick={() => setChartMode(k)}>
                  {k.toUpperCase()}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <button type="button"
                    className="rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50"
                    style={{ borderColor: TOKENS.gray200, color: TOKENS.slate800 }}
                    onClick={(e) => {
                      const btn = e.currentTarget;
                      const menu = btn.nextElementSibling as HTMLDivElement;
                      menu?.classList.toggle('hidden');
                    }}>
              Export
            </button>
            <div className="absolute right-0 z-10 mt-1 hidden min-w-[140px] overflow-hidden rounded-md border bg-white text-xs shadow"
                 style={{ borderColor: TOKENS.gray200 }}>
              <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={exportCSV}>CSV</button>
              <button className="block w-full px-3 py-2 text-left hover:bg-gray-50" onClick={exportPNG}>PNG</button>
            </div>
          </div>
        </div>
      </div>


      {/* Filters row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Metric chip (multi-select) */}
        <div className="relative" ref={metricRef}>
          <button type="button"
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs hover:bg-gray-50"
                  style={{ borderColor: TOKENS.gray200, color: TOKENS.slate800 }}
                  aria-haspopup="menu" aria-expanded={metricMenuOpen}
                  onClick={() => setMetricMenuOpen(s => !s)}>
            <span className="font-medium">Metric</span>
            <span className="flex items-center gap-1">
              {metrics.map(m => (
                <span key={m} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]"
                      style={{ background: 'color-mix(in srgb, currentColor 12%, white)', color: METRIC_META[m].color }}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: METRIC_META[m].color }} />
                  {METRIC_META[m].label.split(' (')[0]}
                </span>
              ))}
            </span>
            <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden className="opacity-70">
              <path fill="currentColor" d="M5.5 7l4.5 4.5L14.5 7z" />
            </svg>
          </button>
          {metricMenuOpen && (
            <div role="menu"
                 className="absolute z-10 mt-1 w-60 rounded-md border bg-white p-2 text-xs shadow-md"
                 style={{ borderColor: TOKENS.gray200 }}>
              {METRIC_ORDER.map(m => {
                const checked = metrics.includes(m);
                const disabled = checked && metrics.length === 1;
                return (
                  <label key={m}
                         className={cx('flex cursor-pointer select-none items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50',
                                       disabled && 'opacity-60')}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: METRIC_META[m].color }} />
                      {METRIC_META[m].label}{m === 'position' && <span className="ml-1 text-[10px] opacity-70">(lower is better)</span>}
                    </span>
                    <input type="checkbox" className="h-4 w-4"
                           checked={checked} disabled={disabled}
                           onChange={() => toggleMetric(m)} />
                  </label>
                );
              })}
            </div>
          )}
        </div>


        {/* Time segmented */}
        <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: TOKENS.gray200 }}>
          {(['7d','14d','30d','90d','custom'] as RangeKey[]).map((r, i) => {
            const active = range === r;
            return (
              <button key={r} type="button"
                      className={cx('px-2.5 py-1.5 text-xs font-medium', i>0 && 'border-l')}
                      style={{ borderColor: TOKENS.gray200, background: active ? '#ffffff' : '#f1f5f9', color: active ? TOKENS.slate800 : TOKENS.slate600 }}
                      onClick={() => setRange(r)}>
                {r}
              </button>
            );
          })}
        </div>
        {range === 'custom' && (
          <div className="flex items-center gap-1 text-xs">
            <input type="date" value={customStart} onChange={(e)=>setCustomStart(e.target.value)}
                   className="h-8 rounded-md border px-2" style={{ borderColor: TOKENS.gray200 }} />
            <span className="px-1" style={{ color: TOKENS.slate600 }}>→</span>
            <input type="date" value={customEnd} onChange={(e)=>setCustomEnd(e.target.value)}
                   className="h-8 rounded-md border px-2" style={{ borderColor: TOKENS.gray200 }} />
          </div>
        )}


        {/* Device segmented */}
        <div className="inline-flex overflow-hidden rounded-md border" style={{ borderColor: TOKENS.gray200 }}>
          {(['all','desktop','mobile','tablet'] as DeviceKey[]).map((d,i) => {
            const active = device === d;
            return (
              <button key={d} type="button"
                      className={cx('px-2.5 py-1.5 text-xs font-medium capitalize', i>0 && 'border-l')}
                      style={{ borderColor: TOKENS.gray200, background: active ? '#ffffff' : '#f1f5f9', color: active ? TOKENS.slate800 : TOKENS.slate600 }}
                      onClick={() => setDevice(d)}>
                {d}
              </button>
            );
          })}
        </div>


        {/* Compare toggle (Phase 1.1) */}
        {showCompareToggle && (
          <button type="button" role="switch" aria-checked={compareOn}
                  className="ml-auto inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  style={{ borderColor: TOKENS.gray200, color: TOKENS.slate800 }}
                  onClick={() => { setCompareOn(v => !v); onEvent?.('trends_compare_toggle', { surface:'drawer', on: !compareOn }); }}>
            <span className={cx('inline-flex h-4 w-7 items-center rounded-full border',
                                compareOn ? 'justify-end' : 'justify-start')}
                  style={{ background: compareOn ? TOKENS.slate800 : '#e2e8f0', borderColor: compareOn ? TOKENS.slate800 : '#cbd5e1' }}>
              <span className="h-3 w-3 rounded-full bg-white" />
            </span>
            Compare previous period
          </button>
        )}
      </div>


      {/* Range summary */}
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-medium"
              style={{ color: TOKENS.slate800 }}>
          {rangeSummary}
        </span>
        {latestDayPartial && (
          <span className="inline-flex items-center rounded-md bg-[#fffbeb] px-2 py-0.5 text-[10px] font-semibold"
                style={{ color: '#92400e' }}>
            partial excluded
          </span>
        )}
      </div>


      {/* Chart */}
      <div ref={chartRef} className="relative h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <defs>
              {/* Impressions gradient (current) */}
              <linearGradient id={gImpr} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={TOKENS.teal600}   stopOpacity={0.22} />
                <stop offset="100%" stopColor={TOKENS.teal600}   stopOpacity={0.04} />
              </linearGradient>
              {/* Previous pattern (bars) */}
              <pattern id={pPrev} patternUnits="userSpaceOnUse" width="6" height="6">
                <rect width="6" height="6" fill="white" />
                <path d="M0 6 L6 0" stroke="#cbd5e1" strokeWidth="1" />
              </pattern>
            </defs>


            <CartesianGrid stroke={TOKENS.gray200} strokeDasharray="3 3" />
            <XAxis dataKey="date"
                   tickFormatter={(iso) => isoToLabel(iso, timezone)}
                   stroke={TOKENS.gray200}
                   tick={{ fill: TOKENS.slate600, fontSize: 12 }}
                   height={36} />
            {hasCounts && (
              <YAxis yAxisId="count" orientation="left"
                     tickFormatter={(v:any) => fmtShort(Number(v))}
                     stroke={TOKENS.gray200}
                     tick={{ fill: TOKENS.slate600, fontSize: 12 }}
                     width={48} />
            )}
            {hasPct && (
              <YAxis yAxisId="pct" orientation="right"
                     tickFormatter={(v:any) => fmtPct(Number(v), 2)}
                     stroke={TOKENS.gray200}
                     tick={{ fill: TOKENS.slate600, fontSize: 12 }}
                     width={56} />
            )}
            {hasRank && (
              <YAxis yAxisId="rank" orientation="right" hide domain={['auto','auto']} />
            )}


            <Tooltip
              content={(props) => {
                const { label } = props; if (label) onEvent?.('trends_point_hover', { surface:'drawer', date: label });
                return <TooltipContent {...props} />;
              }}
              cursor={{ stroke: '#94a3b8', strokeDasharray:'3 3' }}
              isAnimationActive={!reduceMotion}
            />


            <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
              payload={metrics.flatMap(m => ([
                { id:`cur-${m}`,  value:`Current — ${METRIC_META[m].label}`,  type: 'line' as const, color: METRIC_META[m].color },
                ...(compareOn ? [{ id:`prev-${m}`, value:`Previous — ${METRIC_META[m].label}`, type: 'line' as const, color: METRIC_META[m].color }] : [])
              ]))} />


            {/* ===== CURRENT SERIES ===== */}
            {/* Impressions: Area (default) or Bar */}
            {metrics.includes('impressions') && (
              chartMode === 'area' ? (
                <Area yAxisId="count" type="monotone" dataKey="impressions"
                  stroke={TOKENS.teal600} strokeWidth={2.25} fill={`url(#${gImpr})`}
                  dot={false} activeDot={{ r: 3 }} isAnimationActive={!reduceMotion} />
              ) : (
                <Bar yAxisId="count" dataKey="impressions"
                  stroke={TOKENS.teal600} fill={TOKENS.teal600} barSize={10}
                  isAnimationActive={!reduceMotion} />
              )
            )}


            {/* Clicks: Line (solid) or Bar */}
            {metrics.includes('clicks') && (
              chartMode === 'area' ? (
                <Line yAxisId="count" type="monotone" dataKey="clicks"
                  stroke={TOKENS.blue600} strokeWidth={2.25} dot={false}
                  isAnimationActive={!reduceMotion} />
              ) : (
                <Bar yAxisId="count" dataKey="clicks"
                  stroke={TOKENS.blue600} fill={TOKENS.blue600} barSize={10}
                  isAnimationActive={!reduceMotion} />
              )
            )}


            {/* CTR: dotted line on right axis */}
            {metrics.includes('ctr') && (
              <Line yAxisId="pct" type="monotone" dataKey="ctrPct"
                stroke={TOKENS.purple600} strokeWidth={2}
                strokeDasharray="2 6" dot={false} isAnimationActive={!reduceMotion} />
            )}


            {/* Position: thin line (hidden rank axis; lower is better) */}
            {metrics.includes('position') && (
              <Line yAxisId="rank" type="monotone" dataKey="position"
                stroke={TOKENS.amber600} strokeWidth={1.75} dot={false}
                isAnimationActive={!reduceMotion} />
            )}


            {/* ===== PREVIOUS (overlay, dashed/pastel) ===== */}
            {compareOn && (
              <>
                {metrics.includes('impressions') && (
                  chartMode === 'area' ? (
                    <Area yAxisId="count" type="monotone" dataKey="prev_impressions"
                      stroke={TOKENS.teal600} strokeDasharray="6 4" strokeWidth={2}
                      fill={TOKENS.teal600} fillOpacity={0.08} dot={false}
                      isAnimationActive={!reduceMotion} />
                  ) : (
                    <Bar yAxisId="count" dataKey="prev_impressions"
                      stroke={TOKENS.teal600} fill={`url(#${pPrev})`} barSize={10}
                      isAnimationActive={!reduceMotion} />
                  )
                )}


                {metrics.includes('clicks') && (
                  chartMode === 'area' ? (
                    <Line yAxisId="count" type="monotone" dataKey="prev_clicks"
                      stroke={TOKENS.blue600} strokeDasharray="6 4" strokeWidth={2}
                      dot={false} isAnimationActive={!reduceMotion} />
                  ) : (
                    <Bar yAxisId="count" dataKey="prev_clicks"
                      stroke={TOKENS.blue600} fill={`url(#${pPrev})`} barSize={10}
                      isAnimationActive={!reduceMotion} />
                  )
                )}


                {metrics.includes('ctr') && (
                  <Line yAxisId="pct" type="monotone" dataKey="prev_ctrPct"
                    stroke={TOKENS.purple600} strokeDasharray="6 4" strokeWidth={2}
                    dot={false} isAnimationActive={!reduceMotion} />
                )}


                {metrics.includes('position') && (
                  <Line yAxisId="rank" type="monotone" dataKey="prev_position"
                    stroke={TOKENS.amber600} strokeDasharray="6 4" strokeWidth={2}
                    dot={false} isAnimationActive={!reduceMotion} />
                )}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>


      {/* Insight banner (optional) */}
      {insightText && (
        <div className="mt-2 rounded-md border px-3 py-2 text-xs"
             style={{ background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
          {insightText}
        </div>
      )}


      {/* Footer tip */}
      <div className="mt-2 text-[11px]" style={{ color: TOKENS.slate600 }}>
        Tip: Hover the chart to see day‑over‑day change and previous period deltas. “Avg. Position: lower is better.”
      </div>
    </section>
  );
};


/* =============================== Mock data (demo‑ready) =============================== */
function toISO(d: Date) { const x = new Date(d); x.setUTCHours(0,0,0,0); return x.toISOString().slice(0,10); }
function makeMockSeries(days = 90): { current: TrendPoint[]; previous: TrendPoint[] } {
  const end = new Date(); end.setUTCHours(0,0,0,0);
  const start = new Date(end); start.setUTCDate(end.getUTCDate() - (days - 1));
  const cur: TrendPoint[] = [];
  for (let i=0;i<days;i++){
    const d = new Date(start); d.setUTCDate(start.getUTCDate()+i);
    const iso = toISO(d);
    const season = 1 + 0.15 * Math.sin(i/4) + 0.08 * Math.cos(i/9);
    const baseImpr = 1800 + i * 12;
    const impressions = Math.round(baseImpr * season + 220);
    const ctr = 0.032 + 0.006 * Math.sin(i/3); // ~3.2%..3.8%
    const clicks = Math.max(0, Math.round(impressions * ctr));
    const position = 7.6 - i*0.02 + 0.25 * Math.sin(i/2);
    cur.push({ date: iso, clicks, impressions, ctr, position });
  }
  const prev: TrendPoint[] = cur.map(r => ({
    date: r.date,
    clicks: Math.round((r.clicks ?? 0) * 0.9),
    impressions: Math.round((r.impressions ?? 0) * 0.9),
    ctr: (typeof r.ctr === 'number' ? r.ctr : 0) * 0.96,
    position: (typeof r.position === 'number' ? r.position : 7.5) + 0.3,
  }));
  return { current: cur, previous: prev };
}


/* =============================== Default export =============================== */
/** Default export is the component (so you can import it directly).
 * If you want a ready-to-run demo page, see the named export below. */
export default KeywordTrendMini;


/** Optional: quick demo wrapper (use in a /page.tsx or Storybook) */
export function KeywordTrendMiniDemo() {
  const { current, previous } = makeMockSeries(30);
  return (
    <div className="p-4">
      <KeywordTrendMini
        query="best seo tools"
        current={current}
        previous={previous}
        defaultMetrics={['clicks','impressions']}
        defaultRange="30d"
        defaultDevice="all"
        defaultCompareOn={true}
        defaultChart="area"
        showCompareToggle={true}
        insightText="⚡ Spike Detected — mid‑month: +200% impressions"
        onEvent={(name, payload) => console.log('[telemetry]', name, payload)}
      />
    </div>
  );
}
