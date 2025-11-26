'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutGrid,
  Info,
  Download,
  Target,
  Search,
  Link as LinkIcon,
} from 'lucide-react';

/** ─────────────────────────────────────────────────────────────────────────────
 *  Types (UI boundary) — matches the contracts in your spec
 *  ────────────────────────────────────────────────────────────────────────── */
type ViewMode = 'query' | 'page';

export type GscEntity = {
  kind: 'query' | 'page';
  id: string;            // query text or canonical page URL
  clicks: number;
  impressions: number;
  ctr: number;           // 0..1 fraction
  position: number;      // impression-weighted avg position
};

export type HeatmapFilters = {
  view: ViewMode;
  device: 'all' | 'desktop' | 'mobile' | 'tablet';
  country: 'all' | string; // ISO code or "all"
  dateRange: '7d' | '30d' | '90d' | { start: string; end: string };
  searchType?: 'WEB' | 'IMAGE' | 'VIDEO';
  minImpressions?: number;
};

export type HeatBucket =
  | 'pos_1_3' | 'pos_4_6' | 'pos_7_10' | 'pos_11_20' | 'pos_21_30';
export type CtrBucket =
  | 'ctr_10_plus' | 'ctr_5_10' | 'ctr_3_5' | 'ctr_2_3' | 'ctr_1_2' | 'ctr_0_1';

export type HeatCell = {
  x: HeatBucket; y: CtrBucket;
  count: number;
  sampleIds: string[];     // up to 10 ids for preview
  avgCtr: number;          // mean CTR (0..1)
  avgPos: number;          // mean position
};

export type HeatmapResponse = {
  cells: HeatCell[];
  totals: { entities: number };
  filtersApplied: HeatmapFilters;
};

/** ─────────────────────────────────────────────────────────────────────────────
 *  Constants: buckets, labels, ranges, ordering
 *  ────────────────────────────────────────────────────────────────────────── */
const BRAND = '#008CCD';
const EPS = 1e-9;

const POS_BUCKETS: HeatBucket[] = [
  'pos_1_3', 'pos_4_6', 'pos_7_10', 'pos_11_20', 'pos_21_30'
];

const CTR_BUCKETS_VISUAL_ORDER: CtrBucket[] = [
  'ctr_10_plus', 'ctr_5_10', 'ctr_3_5', 'ctr_2_3', 'ctr_1_2', 'ctr_0_1'
];

const POS_LABEL: Record<HeatBucket, string> = {
  pos_1_3: '1–3',
  pos_4_6: '4–6',
  pos_7_10: '7–10',
  pos_11_20: '11–20',
  pos_21_30: '21–30'
};

const CTR_LABEL: Record<CtrBucket, string> = {
  ctr_10_plus: '10%+',
  ctr_5_10: '5–10%',
  ctr_3_5: '3–5%',
  ctr_2_3: '2–3%',
  ctr_1_2: '1–2%',
  ctr_0_1: '0–1%'
};

const POS_RANGE: Record<HeatBucket, [number, number]> = {
  pos_1_3: [1, 3],
  pos_4_6: [4, 6],
  pos_7_10: [7, 10],
  pos_11_20: [11, 20],
  pos_21_30: [21, 30]
};

const CTR_RANGE: Record<CtrBucket, [number, number | null]> = {
  // left-closed, right-open; last bucket open-ended
  ctr_0_1: [0.00, 0.01],
  ctr_1_2: [0.01, 0.02],
  ctr_2_3: [0.02, 0.03],
  ctr_3_5: [0.03, 0.05],
  ctr_5_10: [0.05, 0.10],
  ctr_10_plus: [0.10, null]
};

function mapPositionBucket(pos: number): HeatBucket | null {
  if (pos >= 1 - EPS && pos <= 3 + EPS) return 'pos_1_3';
  if (pos >= 4 - EPS && pos <= 6 + EPS) return 'pos_4_6';
  if (pos >= 7 - EPS && pos <= 10 + EPS) return 'pos_7_10';
  if (pos >= 11 - EPS && pos <= 20 + EPS) return 'pos_11_20';
  if (pos >= 21 - EPS && pos <= 30 + EPS) return 'pos_21_30';
  return null;
}

function mapCtrBucket(ctr: number): CtrBucket {
  // ctr is fraction
  if (ctr >= 0.10 - EPS) return 'ctr_10_plus';
  if (ctr >= 0.05 - EPS) return 'ctr_5_10';
  if (ctr >= 0.03 - EPS) return 'ctr_3_5';
  if (ctr >= 0.02 - EPS) return 'ctr_2_3';
  if (ctr >= 0.01 - EPS) return 'ctr_1_2';
  return 'ctr_0_1';
}

/** ─────────────────────────────────────────────────────────────────────────────
 *  Color logic (color-blind safe, matches spec)
 *  - Emphasize low CTR at strong ranks (pos ≤ 10)
 *  - For pos > 10, show muted tint over neutral
 *  ────────────────────────────────────────────────────────────────────────── */
const HEX = {
  poor: '#D92D20',      // red
  moderate: '#F59E0B',  // amber/yellow
  good: '#16A34A',      // green
  neutral: '#F3F4F6'    // gray-100/200
};

function pickBand(ctrBucket: CtrBucket): 'poor' | 'moderate' | 'good' {
  if (ctrBucket === 'ctr_0_1' || ctrBucket === 'ctr_1_2') return 'poor';
  if (ctrBucket === 'ctr_2_3' || ctrBucket === 'ctr_3_5') return 'moderate';
  return 'good';
}

function isStrongPosition(posBucket: HeatBucket) {
  return posBucket === 'pos_1_3' || posBucket === 'pos_4_6' || posBucket === 'pos_7_10';
}

function rgba(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function cellStyles(posBucket: HeatBucket, ctrBucket: CtrBucket, hasData: boolean) {
  if (!hasData) {
    return { bg: HEX.neutral, text: 'text-gray-400', ring: 'ring-gray-300', muted: true };
  }
  const band = pickBand(ctrBucket);
  const base = band === 'poor' ? HEX.poor : band === 'moderate' ? HEX.moderate : HEX.good;

  if (isStrongPosition(posBucket)) {
    // solid emphasis
    const text = band === 'moderate' ? 'text-gray-900' : 'text-white';
    return { bg: base, text, ring: 'ring-black/20', muted: false };
  }
  // muted tint for pos > 10 over neutral
  return { bg: rgba(base, 0.18), text: 'text-gray-900', ring: 'ring-black/10', muted: true };
}

/** ─────────────────────────────────────────────────────────────────────────────
 *  Bucketing computation (O[n])
 *  ────────────────────────────────────────────────────────────────────────── */
function computeHeatmap(entities: GscEntity[], filters: HeatmapFilters): HeatmapResponse {
  const minImpr = filters.minImpressions ?? 300;

  // Initialize cells
  const cellsMap = new Map<string, HeatCell>();
  for (const y of CTR_BUCKETS_VISUAL_ORDER) {
    for (const x of POS_BUCKETS) {
      const key = `${x}|${y}`;
      cellsMap.set(key, { x, y, count: 0, sampleIds: [], avgCtr: 0, avgPos: 0 });
    }
  }

  let represented = 0;

  for (const e of entities) {
    if (!Number.isFinite(e.position) || e.position <= 0) continue;
    if (e.impressions < (minImpr || 0)) continue;

    const x = mapPositionBucket(e.position);
    if (!x) continue;
    // Clamp CTR to [0, 1] to be safe
    const c = Math.max(0, Math.min(1, e.ctr));
    const y = mapCtrBucket(c);

    const key = `${x}|${y}`;
    const cell = cellsMap.get(key)!;
    cell.count += 1;
    represented += 1;

    if (cell.sampleIds.length < 10) cell.sampleIds.push(e.id);

    // Online running average
    const n = cell.count;
    cell.avgCtr = cell.avgCtr + (c - cell.avgCtr) / n;
    cell.avgPos = cell.avgPos + (e.position - cell.avgPos) / n;
  }

  return {
    cells: Array.from(cellsMap.values()),
    totals: { entities: represented },
    filtersApplied: filters
  };
}

/** ─────────────────────────────────────────────────────────────────────────────
 *  MOCK DATA (visible immediately)
 *  ────────────────────────────────────────────────────────────────────────── */
type Matrix = number[][];
/** Spec example (rows = CTR high→low, cols = pos buckets L→R) */
const SPEC_MATRIX: Matrix = [
  [18,  9,  3,  0,  0],   // 10%+
  [24, 16, 12,  2,  1],   // 5–10%
  [30, 27, 18,  3,  2],   // 3–5%
  [38, 32, 24,  5,  3],   // 2–3%
  [42, 35, 28, 11,  4],   // 1–2%
  [61, 39, 31, 17,  7]    // 0–1%
];

function randBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pickInRange<T extends string>(map: Record<T, [number, number | null]>, key: T) {
  const [lo, hi] = map[key];
  if (hi == null) return randBetween(lo, lo + 0.07); // open-ended → cap ~17% for mocks
  return randBetween(lo, hi - EPS);
}
function pickPosInRange(bucket: HeatBucket) {
  const [lo, hi] = POS_RANGE[bucket];
  return randBetween(lo, hi);
}
function impressionsForMock() {
  return Math.floor(randBetween(700, 6000)); // ≥ 300 threshold
}

function makeMockEntitiesFromMatrix(kind: 'query' | 'page', scale = 0.35): GscEntity[] {
  const out: GscEntity[] = [];
  CTR_BUCKETS_VISUAL_ORDER.forEach((ctrBucket, rowIndex) => {
    POS_BUCKETS.forEach((posBucket, colIndex) => {
      const specCount = SPEC_MATRIX[rowIndex][colIndex];
      const n = Math.max(0, Math.round(specCount * scale));
      for (let i = 0; i < n; i++) {
        const pos = pickPosInRange(posBucket);
        const ctr = pickInRange(CTR_RANGE, ctrBucket); // fraction
        const impr = impressionsForMock();
        const clicks = Math.max(0, Math.round(impr * ctr));
        const id = kind === 'query'
          ? `q:${CTR_LABEL[ctrBucket]}|${POS_LABEL[posBucket]}#${rowIndex}-${colIndex}-${i}`
          : `https://example.com/${posBucket}/${ctrBucket}/${i}`;
        out.push({
          kind,
          id,
          clicks,
          impressions: impr,
          ctr,
          position: pos
        });
      }
    });
  });
  return out;
}

/** Build once per mount; visible immediately */
const MOCK_QUERY_ENTITIES: GscEntity[] = makeMockEntitiesFromMatrix('query', 0.35);
const MOCK_PAGE_ENTITIES:  GscEntity[] = makeMockEntitiesFromMatrix('page', 0.18);

/** ─────────────────────────────────────────────────────────────────────────────
 *  Tooltip (smart popover) util
 *  ────────────────────────────────────────────────────────────────────────── */
type TooltipState = {
  show: boolean;
  x: number;
  y: number;
  title: string;
  stats: string;
  preview: string[];
  xBucket: HeatBucket;
  yBucket: CtrBucket;
} | null;

/** ─────────────────────────────────────────────────────────────────────────────
 *  Small primitives (segmented chips, hints)
 *  ────────────────────────────────────────────────────────────────────────── */
function SegmentedView({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className="inline-flex overflow-hidden cursor-pointer"
      style={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
    >
      {(['query','page'] as ViewMode[]).map((k, idx) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`px-3 py-1.5 text-sm ${idx>0?'border-l':''} cursor-pointer`}
            style={{
              borderColor: '#E5E7EB',
              background: active ? '#D9EEF8' : '#FFFFFF',
              color: active ? BRAND : '#374151',
              fontWeight: active ? 600 : 500
            }}
          >
            {k === 'query' ? 'Query' : 'Page'}
          </button>
        );
      })}
    </div>
  );
}

function AxisHint({ label }: { label: string }) {
  return (
    <span className="hidden md:inline-flex items-center gap-1" title={label}>
      <Info size={14} color={BRAND} />
      <span className="underline decoration-dotted text-gray-600">{label}</span>
    </span>
  );
}

/** ─────────────────────────────────────────────────────────────────────────────
 *  Component
 *  ────────────────────────────────────────────────────────────────────────── */
export default function CtrVsPositionHeatmap() {
  const [filters, setFilters] = useState<HeatmapFilters>({
    view: 'query',
    device: 'all',
    country: 'all',
    dateRange: '30d',
    minImpressions: 300
  });

  const data = useMemo(() => {
    return filters.view === 'query' ? MOCK_QUERY_ENTITIES : MOCK_PAGE_ENTITIES;
  }, [filters.view]);

  const hm = useMemo(() => computeHeatmap(data, filters), [data, filters]);

  // selection + tooltip
  const [selected, setSelected] = useState<{ x: HeatBucket; y: CtrBucket } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  function onCellClick(x: HeatBucket, y: CtrBucket, cell: HeatCell) {
    setSelected({ x, y });
    // Deep-link example (hash); replace with your router if needed
    const posRange = POS_LABEL[x];
    const ctrRange = CTR_LABEL[y];
    const params = new URLSearchParams({
      view: filters.view,
      device: filters.device,
      country: filters.country,
      date: typeof filters.dateRange === 'string' ? filters.dateRange : 'custom',
      pos: posRange,
      ctr: ctrRange
    });
    window.location.hash = `#heatmap?${params.toString()}`;
  }

  function onKeyNav(e: React.KeyboardEvent<HTMLButtonElement>, xi: number, yi: number) {
    const maxX = POS_BUCKETS.length - 1;
    const maxY = CTR_BUCKETS_VISUAL_ORDER.length - 1;
    let nx = xi, ny = yi;

    if (e.key === 'ArrowRight') nx = Math.min(maxX, xi + 1);
    else if (e.key === 'ArrowLeft') nx = Math.max(0, xi - 1);
    else if (e.key === 'ArrowDown') ny = Math.min(maxY, yi + 1);
    else if (e.key === 'ArrowUp') ny = Math.max(0, yi - 1);
    else if (e.key === 'Escape') { setSelected(null); return; }
    else if (e.key === 'Enter' || e.key === ' ') {
      return;
    } else return;

    e.preventDefault();
    const next = gridRef.current?.querySelector<HTMLButtonElement>(`[data-x="${nx}"][data-y="${ny}"]`);
    next?.focus();
  }

  function makeTooltip(x: HeatBucket, y: CtrBucket, cell: HeatCell, ev: React.MouseEvent) {
    const kind = filters.view === 'query' ? 'queries' : 'pages';
    const title = `${cell.count} ${kind} in ${POS_LABEL[x]} & ${CTR_LABEL[y]}`;
    const stats = `Avg CTR ${(cell.avgCtr * 100).toFixed(1)}% · Avg Pos ${cell.avgPos.toFixed(1)}`;
    const preview = cell.sampleIds.slice(0, 10);
    setTooltip({
      show: true,
      x: ev.clientX + 12,
      y: ev.clientY + 12,
      title,
      stats,
      preview,
      xBucket: x,
      yBucket: y
    });
  }

  function clearTooltip() {
    setTooltip(null);
  }

  const totals = hm.totals.entities;

  // dot color for list annotations (matches cell tone)
  function dotColor(x: HeatBucket, y: CtrBucket) {
    const band = pickBand(y);
    const base = band === 'poor' ? HEX.poor : band === 'moderate' ? HEX.moderate : HEX.good;
    return isStrongPosition(x) ? base : rgba(base, 0.6);
  }

  const ItemIcon = filters.view === 'query' ? Search : LinkIcon;

  return (
    <section
      className="w-full mt-4"
      style={{
        // Inter + Inter Fallback (requested)
        fontFamily:
          'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      {/* Header row */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid size={20} color={BRAND} aria-hidden />
            <h2 className="text-xl font-semibold">CTR vs Position Heatmap</h2>
          </div>
          {/* Legend */}
          <div className="hidden items-center gap-3 md:flex">
            <LegendPill color={HEX.good} label="Good (≥5% CTR & ≤10 pos)" />
            <LegendPill color={HEX.moderate} label="Moderate (2–5% CTR & ≤10 pos)" />
            <LegendPill color={HEX.poor} label="Poor (&lt;2% CTR & ≤10 pos)" />
            <span className="text-sm text-gray-500">Cols &gt;10 are muted</span>
          </div>
        </div>

        {/* Controls (view/device/country/date) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View segmented chips (modular toggle) */}
          <SegmentedView
            value={filters.view}
            onChange={(v) => setFilters((f) => ({ ...f, view: v }))}
          />

          {/* Device */}
          <select
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm cursor-pointer"
            value={filters.device}
            onChange={e => setFilters(f => ({ ...f, device: e.target.value as any }))}
            aria-label="Device filter"
          >
            <option value="all">All devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>

          {/* Country */}
          <select
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm cursor-pointer"
            value={filters.country}
            onChange={e => setFilters(f => ({ ...f, country: e.target.value }))}
            aria-label="Country filter"
          >
            <option value="all">All countries</option>
            <option value="US">US</option>
            <option value="IN">IN</option>
            <option value="GB">GB</option>
          </select>

          {/* Date */}
          <select
            className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm cursor-pointer"
            value={typeof filters.dateRange === 'string' ? filters.dateRange : '30d'}
            onChange={e => setFilters(f => ({ ...f, dateRange: e.target.value as any }))}
            aria-label="Time range"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Optimize (action chip with brand icon) */}
          <button
            className="ml-1 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              const scope = selected
                ? { posBucket: POS_LABEL[selected.x], ctrBucket: CTR_LABEL[selected.y] }
                : { posBucket: '≤10', ctrBucket: '<2%' };
              console.log('Optimize Low‑CTR Listings →', {
                action: 'optimize_ctr_snippet',
                scope,
                filters
              });
              alert('Task Drawer would open here with current selection.');
            }}
            style={{ borderColor: BRAND, color: BRAND }}
            aria-label="Optimize Low-CTR Listings"
            title="Optimize Low-CTR Listings"
          >
            <Target size={16} color={BRAND} />
            Optimize Low‑CTR Listings
          </button>

          {/* Export (added per request) */}
          <button
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              console.log('Export heatmap with current filters', { filters, selected });
              alert('Export dialog would open here.');
            }}
            aria-label="Export Heatmap"
            title="Export"
          >
            <Download size={16} color={BRAND} />
            Export
          </button>
        </div>
      </div>

      {/* Legend (mobile) */}
      <div className="mb-3 md:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <LegendPill color={HEX.good} label="Good (≥5% & ≤10)" />
          <LegendPill color={HEX.moderate} label="Moderate (2–5% & ≤10)" />
          <LegendPill color={HEX.poor} label="Poor (&lt;2% & ≤10)" />
          <span className="text-xs text-gray-500">Cols &gt;10 are muted</span>
        </div>
      </div>

      {/* Grid wrapper with sticky axis + horizontal scroll on mobile */}
      <div className="relative overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="min-w-[560px]">
          {/* Header row: corner + X-axis labels */}
          <div className="sticky top-0 z-10 grid grid-cols-[112px_repeat(5,minmax(72px,1fr))] bg-white">
            <div className="h-10 border-b border-gray-200" />
            {POS_BUCKETS.map((x) => (
              <div
                key={x}
                className="h-10 border-b border-gray-200 px-2 text-center text-sm font-semibold text-gray-700"
                title={`Average Position bucket ${POS_LABEL[x]}`}
              >
                {POS_LABEL[x]}
              </div>
            ))}
          </div>

          {/* Body rows: Y-axis labels + cells */}
          <div
            className="relative"
            role="grid"
            aria-rowcount={CTR_BUCKETS_VISUAL_ORDER.length}
            aria-colcount={POS_BUCKETS.length}
            ref={gridRef}
          >
            {CTR_BUCKETS_VISUAL_ORDER.map((y, yi) => (
              <div
                key={y}
                className="grid grid-cols-[112px_repeat(5,minmax(72px,1fr))]"
                role="row"
              >
                {/* Y-axis label (sticky) */}
                <div
                  className="sticky left-0 z-10 h-14 border-b border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
                  title="CTR bucket (fraction of clicks / impressions)"
                >
                  {CTR_LABEL[y]}
                </div>

                {/* Cells */}
                {POS_BUCKETS.map((x, xi) => {
                  const cell = hm.cells.find(c => c.x === x && c.y === y)!;
                  const has = cell.count > 0;
                  const style = cellStyles(x, y, has);
                  const isSelected = selected && selected.x === x && selected.y === y;
                  const isPoor = (isStrongPosition(x) && (y === 'ctr_0_1' || y === 'ctr_1_2'));

                  return (
                    <button
                      key={`${x}|${y}`}
                      role="gridcell"
                      aria-label={`${cell.count} ${filters.view === 'query' ? 'queries' : 'pages'}; position ${POS_LABEL[x]}; CTR ${CTR_LABEL[y]}; avg CTR ${(cell.avgCtr*100).toFixed(1)}%; avg position ${cell.avgPos.toFixed(1)}`}
                      data-x={xi}
                      data-y={yi}
                      onKeyDown={(e) => onKeyNav(e, xi, yi)}
                      onClick={() => onCellClick(x, y, cell)}
                      onMouseMove={(e) => makeTooltip(x, y, cell, e)}
                      onMouseLeave={clearTooltip}
                      onFocus={(e) => makeTooltip(x, y, cell, e as any)}
                      onBlur={clearTooltip}
                      className={`relative m-1 flex min-h-[56px] min-w-[72px] items-center justify-center rounded-md border text-sm font-semibold shadow-sm outline-none cursor-pointer
                        ${isSelected ? 'ring-2 ring-[color:var(--brand,#008CCD)] ring-offset-1' : `ring-1 ${style.ring}`}
                      `}
                      style={{ background: style.bg, borderColor: '#E5E7EB', ['--brand' as any]: BRAND } as React.CSSProperties}
                    >
                      <span className={`${style.text}`}>
                        {has ? cell.count : '—'}
                      </span>

                      {/* Poor performance badge dot (non-color signal) */}
                      {isPoor && has && (
                        <span
                          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-700"
                          aria-hidden="true"
                          title="Poor performance"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Smart Popover (branded icons, colored dots; no scrollbar) */}
        {tooltip?.show && (
          <div
            className="pointer-events-none fixed z-50 max-w-md rounded-md border border-gray-200 bg-white p-3 text-xs shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y }}
            role="tooltip"
          >
            <div className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
              <LayoutGrid size={14} color={BRAND} />
              <span>{tooltip.title}</span>
            </div>
            <div className="mb-2 text-gray-600">{tooltip.stats}</div>
            {tooltip.preview.length > 0 && (
              <div className="rounded bg-gray-50 p-2">
                <ul className="space-y-1 text-gray-800">
                  {tooltip.preview.map((s, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <ItemIcon size={14} color={BRAND} />
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: dotColor(tooltip.xBucket, tooltip.yBucket) }}
                        aria-hidden
                      />
                      <span className="truncate">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: totals + microcopy */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <div>{totals} {filters.view === 'query' ? 'queries' : 'pages'} represented (min impr ≥ {filters.minImpressions}).</div>
        <div className="flex gap-4">
          <AxisHint label="Position is impression‑weighted average; buckets are closed intervals (e.g., 4 ≤ pos ≤ 6)." />
          <AxisHint label="CTR = clicks ÷ impressions; buckets are left‑closed, right‑open (last is open‑ended)." />
        </div>
      </div>
    </section>
  );
}

/** ─────────────────────────────────────────────────────────────────────────────
 *  Small presentational helpers
 *  ────────────────────────────────────────────────────────────────────────── */
function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
