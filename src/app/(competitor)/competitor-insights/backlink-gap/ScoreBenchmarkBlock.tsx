'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Info, Lock, Download } from 'lucide-react';

/* -----------------------------------------------------------------------------
   WR Score Benchmark Block (Radar + Table)
   - Tailwind-only, SVG mini-radars (no external chart lib)
   - Up to 3 mini radars side-by-side: You, Comp1, Comp2
   - Right-side Score Breakdown table (WR + 5 components)
   - Mobile: radar scroller + stacked table
   - Desktop: 2-column grid (50/50)

   Refinements in this version:
   • Smart Popover for Radar (axis glossary + reading tips)
   • Smart Popover for Table (highlight rules + badge scale)
   • "Export" button in the section header (CSV/PNG/PDF menu)
----------------------------------------------------------------------------- */

type AxisKey = 'RDAS' | 'LPDS' | 'AQS' | 'LVS' | 'ITDS';
type ScoreKey = AxisKey | 'WR';

type ScoreSet = Record<ScoreKey, number>;

export type WRBenchmarkBlockData = {
  project: { domain: string; alias?: string; scores: ScoreSet };
  /** Up to 2 competitors (we’ll render available ones only) */
  competitors: Array<{ domain: string; scores: ScoreSet }>;
};

export type WRScoreBenchmarkProps = {
  data?: WRBenchmarkBlockData;
  /** Show the “Compare Full Backlink Profile” CTA if true & there’s ≥1 competitor */
  canOpenAnalyzer?: boolean;
  onOpenAnalyzer?: () => void;
  className?: string;
};

/** Fixed 5‑axis meta (abbrev + full label + tooltip copy) */
const AXES: Array<{
  key: AxisKey;
  abbr: string;
  label: string;
  tooltip: string;
  emoji: string;
}> = [
  {
    key: 'RDAS',
    abbr: 'RDAS',
    label: '🏢 Domain Authority',
    tooltip: 'Average quality of referring domains',
    emoji: '🏢',
  },
  {
    key: 'LPDS',
    abbr: 'LPDS',
    label: '🔀 Link Diversity',
    tooltip: 'Balance of link types and source variety',
    emoji: '🔀',
  },
  {
    key: 'AQS',
    abbr: 'AQS',
    label: '🔤 Anchor Quality',
    tooltip: 'Ratio of branded vs spammy anchor texts',
    emoji: '🔤',
  },
  {
    key: 'LVS',
    abbr: 'LVS',
    label: '🔁 Link Velocity',
    tooltip: 'Backlink growth rate over time',
    emoji: '🔁',
  },
  {
    key: 'ITDS',
    abbr: 'ITDS',
    label: '🌐 IP & TLD Diversity',
    tooltip: 'Spread of IPs and top-level domains',
    emoji: '🌐',
  },
];

const TOKENS = {
  brand: '#1090D0', // Sky Blue
  border: '#D2EFFF',
  tableRow: '#E0E0E0',
  you: { fill: '#1090D0', line: '#0878B0', dot: '#1090D0' },
  comp1: { fill: '#FF6B6B', line: '#D95151', dot: '#FF6B6B' },
  comp2: { fill: '#FFA534', line: '#D98E2F', dot: '#FFA534' },
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function clamp100(n: number) {
  return Math.max(0, Math.min(100, n));
}

type RadarEntity = {
  title: string;
  scores: ScoreSet;
  palette: { fill: string; line: string; dot: string };
};

/* -----------------------------------------------------------------------------
   Headless Popover (accessible) — used for Smart Popovers & Export menu
----------------------------------------------------------------------------- */
function useOutsideDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('keydown', onEsc);
    }
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, onClose]);
  return ref;
}

function Popover({
  button,
  ariaLabel,
  children,
  align = 'right',
  widthClass = 'w-72',
}: {
  button: React.ReactNode;
  ariaLabel?: string;
  children: React.ReactNode;
  align?: 'left' | 'right';
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideDismiss<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {button}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className={[
            'absolute z-20 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-xl',
            widthClass,
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Smart Popover contents (wording aligned to reference design)  :contentReference[oaicite:1]{index=1}
----------------------------------------------------------------------------- */
function RadarHelpContent() {
  return (
    <div className="text-sm text-gray-800">
      <div className="mb-2 font-semibold">How to read this radar</div>
      <ul className="mb-3 list-disc pl-4 text-gray-600">
        <li>Bigger area = stronger performance for that entity.</li>
        <li>Compare shapes across entities to spot strengths/weaknesses fast.</li>
        <li>Hover points to see each metric for all entities together.</li>
      </ul>
      <div className="mb-1 font-semibold">Axis glossary</div>
      <ul className="space-y-1 text-gray-700">
        {AXES.map((a) => (
          <li key={a.key}>
            <span className="font-medium">{a.emoji} {a.label.replace(/^[^ ]+ /, '')}</span> — {a.tooltip}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-gray-500">Tip: Shapes should be compared, not the absolute polygon area.</p>
    </div>
  );
}

function TableHelpContent() {
  return (
    <div className="text-sm text-gray-800">
      <div className="mb-2 font-semibold">How to use this table</div>
      <ul className="mb-3 list-disc pl-4 text-gray-600">
        <li><span className="font-medium">WR Score</span> is a weighted composite of the five metrics below.</li>
        <li>Highest score per row is softly highlighted to show the current leader.</li>
        <li>Hover metric names for definitions; hover cells for exact scores.</li>
      </ul>
      <div className="mb-1 font-semibold">Row meanings</div>
      <ul className="space-y-1 text-gray-700">
        <li><b>RDAS</b> — Avg authority of referring domains.</li>
        <li><b>LPDS</b> — Link type & source variety balance.</li>
        <li><b>AQS</b> — Natural/branded anchors vs spammy anchors.</li>
        <li><b>LVS</b> — Backlink acquisition rate over time.</li>
        <li><b>ITDS</b> — Diversity of IPs and TLDs.</li>
      </ul>
      <p className="mt-3 text-[11px] text-gray-500">Badge color on WR: green ≥70, amber 40–69, red &lt;40.</p>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   SVG mini radar (160x160) for a single entity + Smart Popover icon
----------------------------------------------------------------------------- */
function MiniRadar({
  entity,
  datasetForTooltips,
}: {
  entity: RadarEntity;
  /** For axis dot <title> summaries showing all entities in one hover */
  datasetForTooltips: RadarEntity[];
}) {
  const W = 160;
  const H = 160;
  const cx = W / 2;
  const cy = H / 2;
  const rMax = 70; // per spec (20–70 range used for values)
  const axisCount = AXES.length; // 5

  // Build polygon points from entity’s 5 axis scores (0–100)
  const points = AXES.map((a, i) => {
    const theta = (2 * Math.PI * i) / axisCount - Math.PI / 2; // start at top
    const val = clamp100(entity.scores[a.key]);
    const r = Math.max(20, rMax * clamp01(val / 100));
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    return { x, y, axis: a, val };
  });

  const axisEnds = AXES.map((a, i) => {
    const theta = (2 * Math.PI * i) / axisCount - Math.PI / 2;
    const x = cx + rMax * Math.cos(theta);
    const y = cy + rMax * Math.sin(theta);
    const lx = cx + (rMax + 12) * Math.cos(theta); // label slightly outside
    const ly = cy + (rMax + 12) * Math.sin(theta);
    return { a, x, y, lx, ly };
  });

  const poly = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-sm">
      {/* Smart Popover trigger (top-right of card) */}
      <div className="absolute right-2 top-2">
        <Popover
          ariaLabel="Open radar help"
          button={
            <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 hover:bg-gray-200">
              <Info className="mr-1 h-3.5 w-3.5" />
              Help
            </span>
          }
          widthClass="w-80"
          align="right"
        >
          <RadarHelpContent />
        </Popover>
      </div>

      <div className="mb-1 text-center text-sm font-semibold text-gray-800">{entity.title}</div>
      <svg
        className="block"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${entity.title} — WR components mini radar`}
      >
        {/* Outer frame / background */}
        <rect x={0} y={0} width={W} height={H} rx={8} fill="white" />

        {/* Axis lines */}
        {axisEnds.map(({ a, x, y }) => (
          <line
            key={`axis-${a.key}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#CCCCCC"
            strokeOpacity={0.6}
            strokeWidth={1}
          />
        ))}

        {/* Optional rings (3 subtle rings) */}
        {[0.4, 0.7, 1].map((k, i) => (
          <polygon
            key={`ring-${i}`}
            points={AXES.map((_, j) => {
              const theta = (2 * Math.PI * j) / axisCount - Math.PI / 2;
              const rr = 20 + (rMax - 20) * k;
              const x = cx + rr * Math.cos(theta);
              const y = cy + rr * Math.sin(theta);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={1}
          />
        ))}

        {/* Entity polygon (filled area) */}
        <polygon
          points={poly}
          fill={entity.palette.fill}
          fillOpacity={0.25}
          stroke={entity.palette.line}
          strokeWidth={2}
          className="transition-opacity duration-200"
        />

        {/* Axis labels (abbr) */}
        {axisEnds.map(({ a, lx, ly }) => (
          <text
            key={`lbl-${a.key}`}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none text-[10px] font-medium fill-gray-700"
          >
            <tspan>{a.abbr}</tspan>
            <title>
              {`${a.label.replace(/^[^ ]+ /, '')} — ${a.tooltip}`}
            </title>
          </text>
        ))}

        {/* Data dots + tooltips showing all entities per axis */}
        {points.map((p, idx) => {
          const tt = [
            `${p.axis.label}`,
            ...datasetForTooltips.map((e) => `• ${e.title}: ${clamp100(e.scores[p.axis.key])}`),
          ].join('\n');
          return (
            <circle
              key={`dot-${idx}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={entity.palette.dot}
              stroke={entity.palette.line}
              strokeWidth={1}
            >
              <title>{tt}</title>
            </circle>
          );
        })}
      </svg>
      {/* Legend chips (fixed palette hint) */}
      <div className="mt-2 flex justify-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
          title="Polygon = 25% opacity · Line = 80% opacity"
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entity.palette.dot }}
          />
          {entity.title}
        </span>
      </div>
    </div>
  );
}

/** WR score badge with traffic‑light coloring */
function WrBadge({ value }: { value: number }) {
  const v = clamp100(value);
  const col =
    v >= 70 ? 'bg-green-100 text-green-800 ring-green-200' : v >= 40 ? 'bg-amber-100 text-amber-800 ring-amber-200' : 'bg-red-100 text-red-800 ring-red-200';
  return (
    <span
      className={[
        'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ring-1',
        col,
      ].join(' ')}
      title="Weighted composite of the 5 metrics below"
    >
      {v}
    </span>
  );
}

/** Identity dot before column labels */
function Dot({ color }: { color: string }) {
  return <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: color }} />;
}

/** Table for WR + 5 components (highlights top performer per row) */
function BreakdownTable({
  entities,
}: {
  entities: Array<{ key: 'you' | 'comp1' | 'comp2'; label: string; scores: ScoreSet; color: string }>;
}) {
  const rows: Array<{ key: ScoreKey; label: string; tooltip: string }> = [
    { key: 'WR', label: 'WR Score', tooltip: 'Overall backlink-driven domain authority' },
    { key: 'RDAS', label: '🏢 Referring Domain Authority', tooltip: 'Average authority of referring domains' },
    { key: 'LPDS', label: '🔀 Link Profile Diversity', tooltip: 'Balance of link types and source variety' },
    { key: 'AQS', label: '🔤 Anchor Text Quality', tooltip: 'Quality of anchor usage (natural vs spam)' },
    { key: 'LVS', label: '🔁 Link Velocity', tooltip: 'Rate of backlink acquisition over time' },
    { key: 'ITDS', label: '🌐 IP & TLD Diversity', tooltip: 'Geographic and IP diversity of link sources' },
  ];

  return (
    <div className="rounded-xl border border-[color:var(--t-border,#E5E7EB)] bg-white p-3 shadow-sm md:p-4"
         style={{ ['--t-border' as any]: TOKENS.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">WR Score Breakdown</div>
        {/* Smart Popover for the table */}
        <Popover
          ariaLabel="Open table help"
          button={
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-200">
              <Info className="mr-1 h-3.5 w-3.5" />
              Details
            </span>
          }
          widthClass="w-80"
          align="right"
        >
          <TableHelpContent />
        </Popover>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              <th className="border-b border-[#E0E0E0] py-2 pr-2 text-xs font-bold text-gray-700">Metric</th>
              {entities.map((e) => (
                <th key={e.key} className="border-b border-[#E0E0E0] py-2 text-center text-xs font-semibold text-gray-700">
                  <span className="inline-flex items-center justify-center">
                    <Dot color={e.color} />
                    {e.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const values = entities.map((e) => ({ e, v: clamp100(e.scores[r.key]) }));
              const max = Math.max(...values.map((x) => x.v));
              return (
                <tr key={r.key} className="text-sm">
                  <td
                    className={[
                      'whitespace-nowrap border-b border-[#E0E0E0] py-2 pr-2 font-medium text-gray-800',
                      idx === 0 ? 'border-l-4 border-l-[color:var(--brand,#1090D0)] pl-2' : '',
                    ].join(' ')}
                    title={r.tooltip}
                    style={{ ['--brand' as any]: TOKENS.brand }}
                  >
                    {r.label}
                  </td>
                  {values.map(({ e, v }) => {
                    const isWinner = v === max && values.filter((x) => x.v === max).length <= values.length; // highlight all ties
                    const baseTd =
                      'border-b border-[#E0E0E0] py-2 text-center align-middle';
                    const winnerBg = isWinner && r.key !== 'WR' ? 'bg-green-50' : '';
                    return (
                      <td key={e.key + r.key} className={[baseTd, winnerBg].join(' ')} title={`Score: ${v}`}>
                        {r.key === 'WR' ? (
                          <WrBadge value={v} />
                        ) : (
                          <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-sm text-gray-800">
                            {v}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-gray-600">
        Highest score per row is softly highlighted. Hover metric names for explanations.
      </p>
    </div>
  );
}

/** Helper to build the radar entities array (with fixed palette order) */
function buildRadarEntities(data: WRBenchmarkBlockData): RadarEntity[] {
  const out: RadarEntity[] = [];
  out.push({
    title: data.project.alias ? data.project.alias : 'You',
    scores: data.project.scores,
    palette: TOKENS.you,
  });
  if (data.competitors[0]) {
    out.push({ title: data.competitors[0].domain, scores: data.competitors[0].scores, palette: TOKENS.comp1 });
  }
  if (data.competitors[1]) {
    out.push({ title: data.competitors[1].domain, scores: data.competitors[1].scores, palette: TOKENS.comp2 });
  }
  return out;
}

/** Helper to build table entities array (label + color) */
function buildTableEntities(data: WRBenchmarkBlockData): Array<{
  key: 'you' | 'comp1' | 'comp2';
  label: string;
  scores: ScoreSet;
  color: string;
}> {
  const res: Array<{ key: 'you' | 'comp1' | 'comp2'; label: string; scores: ScoreSet; color: string }> = [];
  res.push({ key: 'you', label: data.project.alias || 'You', scores: data.project.scores, color: TOKENS.you.dot });
  if (data.competitors[0]) {
    res.push({ key: 'comp1', label: data.competitors[0].domain, scores: data.competitors[0].scores, color: TOKENS.comp1.dot });
  }
  if (data.competitors[1]) {
    res.push({ key: 'comp2', label: data.competitors[1].domain, scores: data.competitors[1].scores, color: TOKENS.comp2.dot });
  }
  return res;
}

/** Sample dataset for quick demo (numbers mirror your spec examples) */
const SAMPLE_DATA: WRBenchmarkBlockData = {
  project: {
    domain: 'yourdomain.com',
    alias: 'You',
    scores: { WR: 72, RDAS: 68, LPDS: 61, AQS: 80, LVS: 76, ITDS: 66 },
  },
  competitors: [
    { domain: 'comp1.com', scores: { WR: 63, RDAS: 72, LPDS: 66, AQS: 63, LVS: 54, ITDS: 58 } },
    { domain: 'comp2.com', scores: { WR: 41, RDAS: 55, LPDS: 49, AQS: 38, LVS: 41, ITDS: 50 } },
  ],
};

/* -----------------------------------------------------------------------------
   Export menu (stub handlers — wire to your exporter)
----------------------------------------------------------------------------- */
function ExportMenu({ onExport }: { onExport?: (kind: 'csv' | 'png' | 'pdf') => void }) {
  return (
    <Popover
      ariaLabel="Open export options"
      button={
        <span
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          title="Export"
        >
          <Download className="h-4 w-4" />
          Export
        </span>
      }
      align="right"
      widthClass="w-48"
    >
      <div className="flex flex-col">
        <button
          className="rounded px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-50"
          onClick={() => onExport?.('csv')}
        >
          CSV (Breakdown table)
        </button>
        <button
          className="rounded px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-50"
          onClick={() => onExport?.('png')}
        >
          PNG (Radar charts)
        </button>
        <button
          className="rounded px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-50"
          onClick={() => onExport?.('pdf')}
        >
          PDF (This section)
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-500">Applies current compare set & filters.</p>
    </Popover>
  );
}

/** Default export: drop-in component */
export default function WRScoreBenchmarkBlock({
  data = SAMPLE_DATA,
  canOpenAnalyzer = true,
  onOpenAnalyzer,
  className,
}: WRScoreBenchmarkProps) {
  // If no competitor selected → hide block entirely (per spec)
  const competitorCount = data.competitors.filter(Boolean).length;
  if (competitorCount === 0) return null;

  const radarEntities = buildRadarEntities(data);
  const tableEntities = buildTableEntities(data);

  // Decide radar grid
  const radarCols =
    radarEntities.length === 2 ? 'sm:grid-cols-2' : radarEntities.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-1';

  // stub: wire up to your export pipeline
  function handleExport(kind: 'csv' | 'png' | 'pdf') {
    // TODO: plug into real export (table CSV / canvas PNG / print-to-PDF)
    // eslint-disable-next-line no-console
    console.log('[WR Benchmark] Export requested:', kind, { data });
  }

  return (
    <section
      className={[
        'rounded-2xl border mt-4',
        'border-[color:var(--panel-border,#D2EFFF)] bg-white shadow-sm',
        'p-4 sm:p-5',
        className ?? '',
      ].join(' ')}
      style={{ ['--panel-border' as any]: TOKENS.border }}
      aria-labelledby="wr-benchmark-title"
    >
      {/* Title Row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 id="wr-benchmark-title" className="text-base font-semibold text-gray-800">
            🧠 WR Score Benchmark: You vs Competitors
          </h3>
          <Info
            className="h-4 w-4 text-gray-500"
            // title="Compare your domain's backlink reputation score and its key drivers with selected competitors."
          />
        </div>

        {/* Right-aligned Action Footer (Export + optional Compare CTA) */}
        <div className="flex items-center gap-2">
          <ExportMenu onExport={handleExport} />
          {competitorCount > 0 && (
            <button
              type="button"
              onClick={canOpenAnalyzer ? onOpenAnalyzer : undefined}
              disabled={!canOpenAnalyzer}
              className={[
                'inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition',
                canOpenAnalyzer
                  ? 'border-gray-200 bg-white text-[color:var(--brand,#1090D0)] hover:bg-gray-50'
                  : 'border-gray-200 bg-gray-100 text-gray-500',
              ].join(' ')}
              style={{ ['--brand' as any]: TOKENS.brand }}
              title={
                canOpenAnalyzer
                  ? 'Open full backlink analysis with current compare set'
                  : 'Upgrade to access full analysis'
              }
            >
              {canOpenAnalyzer ? 'Compare Full Backlink Profile' : 'Compare (Locked)'}
              {!canOpenAnalyzer && <Lock className="ml-1 h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 2-column layout: left radars (50%) · right table (50%) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Left: mini radars */}
        <div>
          {/* Mobile: horizontal scroller */}
          <div className="sm:hidden -mx-4 overflow-x-auto px-4 pb-1">
            <div className="flex snap-x gap-3">
              {radarEntities.map((e) => (
                <div key={e.title} className="snap-start">
                  <MiniRadar entity={e} datasetForTooltips={radarEntities} />
                </div>
              ))}
            </div>
          </div>
          {/* ≥ sm: grid */}
          <div className={['hidden sm:grid gap-3', radarCols].join(' ')}>
            {radarEntities.map((e) => (
              <MiniRadar key={e.title} entity={e} datasetForTooltips={radarEntities} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-600">
            Hover points or labels for component tooltips. Areas use fixed palette: You = 🟦, Comp1 = 🟥, Comp2 = 🟧.
          </p>
        </div>

        {/* Right: breakdown table */}
        <div>
          <BreakdownTable entities={tableEntities} />
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
   DEV TESTS — quick render scenarios (do not modify existing tests; these are additive)
   Usage in a dev page: <WRScoreBenchmarkTests />
----------------------------------------------------------------------------- */
export function WRScoreBenchmarkTests() {
  const oneCompetitor: WRBenchmarkBlockData = {
    project: { domain: 'yourdomain.com', alias: 'You', scores: { WR: 55, RDAS: 52, LPDS: 60, AQS: 58, LVS: 57, ITDS: 62 } },
    competitors: [
      { domain: 'onlycomp.io', scores: { WR: 61, RDAS: 64, LPDS: 59, AQS: 62, LVS: 60, ITDS: 55 } },
    ],
  };

  const lockedTwoCompetitors: WRBenchmarkBlockData = {
    project: { domain: 'yourdomain.com', alias: 'You', scores: { WR: 72, RDAS: 68, LPDS: 61, AQS: 80, LVS: 76, ITDS: 66 } },
    competitors: [
      { domain: 'comp1.com', scores: { WR: 63, RDAS: 72, LPDS: 66, AQS: 63, LVS: 54, ITDS: 58 } },
      { domain: 'comp2.com', scores: { WR: 41, RDAS: 55, LPDS: 49, AQS: 38, LVS: 41, ITDS: 50 } },
    ],
  };

  const extremeScores: WRBenchmarkBlockData = {
    project: { domain: 'alpha.dev', alias: 'Alpha', scores: { WR: 90, RDAS: 95, LPDS: 85, AQS: 92, LVS: 88, ITDS: 84 } },
    competitors: [
      { domain: 'beta.dev', scores: { WR: 30, RDAS: 25, LPDS: 35, AQS: 28, LVS: 31, ITDS: 29 } },
      { domain: 'gamma.dev', scores: { WR: 70, RDAS: 72, LPDS: 69, AQS: 68, LVS: 74, ITDS: 65 } },
    ],
  };

  return (
    <div className="space-y-8 p-4">
      <div>
        <h4 className="mb-2 text-sm font-semibold">Test A — Default sample (2 competitors)</h4>
        <WRScoreBenchmarkBlock data={SAMPLE_DATA} />
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Test B — One competitor (should render 2 radars)</h4>
        <WRScoreBenchmarkBlock data={oneCompetitor} />
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Test C — Locked compare CTA</h4>
        <WRScoreBenchmarkBlock data={lockedTwoCompetitors} canOpenAnalyzer={false} />
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Test D — Extreme score contrast</h4>
        <WRScoreBenchmarkBlock data={extremeScores} />
      </div>
    </div>
  );
}
