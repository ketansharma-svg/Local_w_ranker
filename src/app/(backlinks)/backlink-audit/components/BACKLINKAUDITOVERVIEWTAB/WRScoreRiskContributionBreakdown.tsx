'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Info,
  TriangleAlert,
  ArrowDownRight,
  ExternalLink,
  SlidersHorizontal,
  Download,
  Shield,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Cell,
} from 'recharts';

/* ----------------------------------------------------------------------------
   SECTION 6 – WR Score Risk Contribution (Redesigned, Section Container)
   - Section container with header (title + Filters + Export)
   - Left: Metric + Radar (impact-focused)
   - Right: Colored bars with legend chips
   - Tailwind + Recharts v2
   - Inter / Inter fallbacks via inline font-family on container
   - Branded icon color: #008CCD
---------------------------------------------------------------------------- */

type RiskKey =
  | 'toxicDomains'
  | 'overOptimizedAnchors'
  | 'linkVelocity'
  | 'ipTldDiversity'
  | 'disavowedHighImpact';

type RiskRow = {
  key: RiskKey;
  label: string;
  deduction: number; // absolute value in "points"
  desc: string;
};

type Props = {
  totalDeduction?: number; // e.g., 6 → “−6 pts”
  periodLabel?: string; // e.g., “Last 30 Days”
  rows?: RiskRow[];
  className?: string;
  onNavigate?: (key: RiskKey) => void; // route to filtered audit tab per row
};

const TOKENS = {
  // Latest tokens aligned to recent designs
  brand: '#008CCD', // branded primary
  text: '#0F172A', // slate-900
  muted: '#64748B', // slate-500
  border: '#E6E8EF', // subtle border
  borderStrong: '#D9DCE4',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  chipBg: '#F3F8FB',
  chipRing: '#CBE9F6',
  cardShadow: '0 2px 10px rgba(2, 8, 23, 0.06)',
  focus: '0 0 0 3px rgba(0,140,205,0.22)',
  // risk palette
  risk: {
    toxicDomains: '#EF4444', // red
    overOptimizedAnchors: '#F97316', // orange
    linkVelocity: '#F59E0B', // amber (slightly deeper for contrast)
    ipTldDiversity: '#8B5CF6', // violet
    disavowedHighImpact: '#3B82F6', // blue
  } as Record<RiskKey, string>,
};

const DEFAULT_ROWS: RiskRow[] = [
  {
    key: 'toxicDomains',
    label: 'Toxic Referring Domains',
    deduction: 2.5,
    desc: '12 domains flagged as toxic (WR < 20).',
  },
  {
    key: 'overOptimizedAnchors',
    label: 'Over-Optimized Anchors',
    deduction: 1.5,
    desc: '9 anchors used 5+ times (exact match).',
  },
  {
    key: 'linkVelocity',
    label: 'Link Velocity Anomaly',
    deduction: 1.0,
    desc: 'Spike in links detected (Jul 20–22).',
  },
  {
    key: 'ipTldDiversity',
    label: 'IP/TLD Diversity Risk',
    deduction: 0.5,
    desc: '57% links from same C‑class/IP or narrow TLD.',
  },
  {
    key: 'disavowedHighImpact',
    label: 'Disavowed (High‑Impact)',
    deduction: 0.5,
    desc: '3 high‑WR domains were disavowed.',
  },
];

const DEFAULT_PROPS: Required<Props> = {
  totalDeduction: 6,
  periodLabel: 'Last 30 Days',
  rows: DEFAULT_ROWS,
  className: '',
  onNavigate: () => {},
};

/* ----------------------------- Smart Popovers (Tooltips) ------------------ */

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function RadarTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as
    | { label: string; severity: number; which: RiskKey }
    | undefined;
  if (!p) return null;
  const color = TOKENS.risk[p.which] || TOKENS.brand;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm"
         style={{ borderColor: TOKENS.border }}>
      <div className="flex items-center gap-2 font-medium text-slate-900">
        <Dot color={color} />
        <span>{p.label}</span>
      </div>
      <div className="mt-1 text-slate-600">
        Severity: <span className="font-semibold text-slate-800">{Math.round(p.severity)} / 100</span>
      </div>
      <div className="mt-1 text-slate-500">Relative contribution (normalized).</div>
    </div>
  );
}

function BarsTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as RiskRow;
  const color = TOKENS.risk[row.key];
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm max-w-[280px]"
         style={{ borderColor: TOKENS.border }}>
      <div className="flex items-center gap-2 font-medium text-slate-900">
        <Dot color={color} />
        <span>{row.label}</span>
      </div>
      <div className="mt-1 text-slate-700">
        Deduction: <span className="font-semibold">−{row.deduction} pts</span>
      </div>
      <div className="mt-1 text-slate-600">{row.desc}</div>
      <div className="mt-2 text-[11px] text-[color:#0369A1]">Click bar to audit this component</div>
    </div>
  );
}

/* -------------------------- Left Card: Radar ------------------------------ */

function LeftMetricRadar({
  totalDeduction,
  periodLabel,
  rows,
}: Required<Pick<Props, 'totalDeduction' | 'periodLabel' | 'rows'>>) {
  // Normalize to 0–100 for radar
  const total = Math.max(1, rows.reduce((acc, r) => acc + Math.abs(r.deduction), 0));
  const radarData = rows.map((r) => ({
    which: r.key,
    label: shortLabel(r.label),
    severity: (Math.abs(r.deduction) / total) * 100,
  }));

  return (
    <div
      className="w-full rounded-xl border bg-white p-4 sm:p-5"
      style={{ borderColor: TOKENS.border, boxShadow: TOKENS.cardShadow }}
    >
      {/* Card Header */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" color={TOKENS.brand} />
          <h3 className="text-sm font-semibold text-slate-900">
            WR Impact from Backlink Risks
          </h3>
          <Info className="h-4 w-4" color={TOKENS.brand} />
        </div>
      </div>

      {/* Metric row */}
      <div className="mt-2 flex items-baseline gap-3">
        <div className="text-5xl font-extrabold leading-none tracking-tight text-[#EF4444]">
          −{totalDeduction} <span className="text-2xl align-top">pts</span>
        </div>
        <div
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
          style={{ background: TOKENS.chipBg, color: '#0B5D7A', border: `1px solid ${TOKENS.chipRing}` }}
        >
          <ArrowDownRight className="h-3.5 w-3.5" color="#EF4444" />
          <span>{periodLabel}</span>
        </div>
      </div>

      {/* Deduction note */}
      <div className="mt-3 flex items-start gap-2 text-[13px]">
        <TriangleAlert className="mt-[2px] h-4 w-4 shrink-0" color="#DC2626" />
        <div className="text-amber-700">
          Calculated from toxic domains, over‑optimized anchors, velocity anomalies, IP/TLD diversity risk, and high‑impact disavows.
        </div>
      </div>

      <div className="mt-4 border-b" style={{ borderColor: TOKENS.border }} />

      {/* Radar */}
      <div className="mt-4">
        <div className="mb-2 text-sm font-medium text-slate-900">Risk Components (Severity)</div>
        <div className="relative mx-auto h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid gridType="polygon" stroke="#E5E7EB" radialLines />
              <PolarAngleAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} tick={{ fill: '#94A3B8', fontSize: 10 }} tickCount={6} domain={[0, 100]} />
              <RechartsTooltip content={<RadarTip />} />
              <Radar
                name="Impact"
                dataKey="severity"
                stroke={TOKENS.brand}
                fill={TOKENS.brand}
                fillOpacity={0.28}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Right Card: Bars ------------------------------ */

function RightBars({
  rows,
  onNavigate,
}: Required<Pick<Props, 'rows' | 'onNavigate'>>) {
  const max = Math.max(...rows.map((r) => Math.abs(r.deduction)), 1);

  return (
    <div
      className="w-full rounded-xl border bg-white p-4 sm:p-5"
      style={{ borderColor: TOKENS.border, boxShadow: TOKENS.cardShadow }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" color={TOKENS.brand} />
          <div className="text-sm font-semibold text-slate-900">Risk Components Breakdown</div>
          <Info className="h-4 w-4" color={TOKENS.brand} />
        </div>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 28, left: 0, bottom: 8 }}
            barCategoryGap={12}
            barSize={18}
            onClick={(state: any) => {
              const row: RiskRow | undefined = state?.activePayload?.[0]?.payload;
              if (row) onNavigate(row.key);
            }}
          >
            <CartesianGrid stroke="#EEF2F7" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              domain={[0, Math.ceil(max * 1.1)]}
              tick={{ fontSize: 12, fill: '#64748B' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={190}
              tick={{ fontSize: 12, fill: '#334155' }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip content={<BarsTip />} cursor={{ fill: 'rgba(0,140,205,0.06)' }} />
            <Bar
              dataKey="deduction"
              name="Deduction"
              radius={[4, 4, 4, 4]}
              className="cursor-pointer"
            >
              {rows.map((r) => (
                <Cell key={r.key} fill={TOKENS.risk[r.key]} />
              ))}
              <LabelList
                dataKey="deduction"
                position="right"
                formatter={(v: number) => `−${v} pts`}
                className="text-[12px] fill-slate-700"
                offset={8}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.map((r) => (
          <span
            key={r.key}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs text-slate-700 transition"
            style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
            onClick={() => onNavigate(r.key)}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: TOKENS.risk[r.key] }}
            />
            <span className="font-medium">{r.label}</span>
            <span
              className="rounded px-1.5 py-[2px] text-[11px]"
              style={{ background: TOKENS.chipBg, color: '#0B5D7A', border: `1px solid ${TOKENS.chipRing}` }}
            >
              −{r.deduction} pts
            </span>
          </span>
        ))}
      </div>

      {/* Footnote */}
      <div className="mt-3 text-[11px] text-slate-500">
        Click a bar or chip to drill down into the filtered audit view.
        <ExternalLink className="ml-1 inline h-3 w-3 align-text-top" color={TOKENS.brand} />
      </div>
    </div>
  );
}

/* ------------------------------ Helpers ---------------------------------- */

function shortLabel(label: string) {
  const map: Record<string, string> = {
    'Toxic Referring Domains': 'Toxic Domains',
    'Over-Optimized Anchors': 'Anchors',
    'Link Velocity Anomaly': 'Velocity',
    'IP/TLD Diversity Risk': 'IP/TLD',
    'Disavowed (High‑Impact)': 'Disavowed',
  };
  return map[label] ?? label;
}

/* ------------------------------ Export ----------------------------------- */

export default function Section6WrImpactSplit(incoming: Props) {
  const { totalDeduction, periodLabel, rows, className, onNavigate } = {
    ...DEFAULT_PROPS,
    ...incoming,
  };

  // Sort rows by deduction desc for consistent bar order
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => Math.abs(b.deduction) - Math.abs(a.deduction)),
    [rows]
  );

  // Chip state (latest / modern chips to filter categories)
  const [activeKeys, setActiveKeys] = useState<Set<RiskKey>>(
    () => new Set(sortedRows.map((r) => r.key))
  );
  const [largeOnly, setLargeOnly] = useState<boolean>(false);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(e.target as Node)) setFiltersOpen(false);
    }
    if (filtersOpen) {
      window.addEventListener('mousedown', onClickOutside);
      return () => window.removeEventListener('mousedown', onClickOutside);
    }
  }, [filtersOpen]);

  const visibleRows = useMemo(() => {
    let base = sortedRows.filter((r) => activeKeys.has(r.key));
    if (largeOnly) base = base.filter((r) => Math.abs(r.deduction) >= 1);
    return base;
  }, [sortedRows, activeKeys, largeOnly]);

  function toggleChip(key: RiskKey | 'all') {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      if (key === 'all') {
        // toggle all on if some are off
        if (next.size < sortedRows.length) return new Set(sortedRows.map((r) => r.key));
        return new Set<RiskKey>(); // none
      }
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section
      className={['w-full', className ?? ''].join(' ')}
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
      }}
    >
      {/* Section Container */}
      <div
        className="rounded-2xl border bg-white p-4 sm:p-5"
        style={{ borderColor: TOKENS.border, boxShadow: TOKENS.cardShadow }}
      >
        {/* Section Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" color={TOKENS.brand} />
            <h2 className="text-base font-semibold text-slate-900">
              WR Score — Risk Contribution Breakdown
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Filters trigger */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((s) => !s)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus:outline-none"
                style={{ borderColor: TOKENS.border }}
              >
                <SlidersHorizontal className="h-4 w-4" color={TOKENS.brand} />
                Filters
              </button>

              {/* Smart Filters Popover */}
              {filtersOpen && (
                <div
                  className="absolute right-0 z-20 mt-2 w-64 rounded-lg border bg-white p-3 text-sm shadow-lg"
                  style={{ borderColor: TOKENS.border }}
                >
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quick Filters
                  </div>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <Dot color={TOKENS.brand} />
                      <span className="text-slate-800">Show ≥ 1.0 pts</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={largeOnly}
                      onChange={(e) => setLargeOnly(e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-[color:#008CCD]"
                    />
                  </label>
                  <div className="mt-2 border-t" style={{ borderColor: TOKENS.border }} />
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="mt-2 w-full cursor-pointer rounded-md bg-[color:#008CCD] px-3 py-1.5 text-center text-sm font-semibold text-white transition hover:opacity-95 focus:outline-none"
                    style={{ boxShadow: TOKENS.focus }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Export button */}
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none"
              style={{ borderColor: TOKENS.border }}
              onClick={() => {
                // Hook up to your export pipeline as needed
                // (Kept internal to avoid API changes)
                if (typeof window !== 'undefined') {
                  console.log('Export triggered: Section 6 – Risk Contribution Breakdown');
                }
              }}
            >
              <Download className="h-4 w-4" color={TOKENS.brand} />
              Export
            </button>
          </div>
        </div>

        {/* Modern Chips Row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggleChip('all')}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none cursor-pointer ${
              activeKeys.size === DEFAULT_ROWS.length ? 'ring-1' : ''
            }`}
            style={{
              borderColor: TOKENS.border,
              background: TOKENS.chipBg,
              color: '#0B5D7A',
              boxShadow: activeKeys.size === DEFAULT_ROWS.length ? TOKENS.focus : 'none',
            }}
          >
            <Dot color={TOKENS.brand} />
            All
          </button>
          {sortedRows.map((r) => {
            const active = activeKeys.has(r.key);
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => toggleChip(r.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none cursor-pointer ${
                  active ? 'ring-1' : ''
                }`}
                style={{
                  borderColor: active ? TOKENS.chipRing : TOKENS.border,
                  background: active ? TOKENS.chipBg : TOKENS.surfaceAlt,
                  color: active ? '#0B5D7A' : TOKENS.muted,
                  boxShadow: active ? TOKENS.focus : 'none',
                }}
              >
                <Dot color={TOKENS.risk[r.key]} />
                {shortLabel(r.label)}
              </button>
            );
          })}
        </div>

        {/* Body: Two cards */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <LeftMetricRadar
              totalDeduction={totalDeduction}
              periodLabel={periodLabel}
              rows={visibleRows.length ? visibleRows : sortedRows}
            />
          </div>
          <div className="lg:col-span-2">
            <RightBars
              rows={visibleRows.length ? visibleRows : sortedRows}
              onNavigate={onNavigate!}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Usage -----------------------------------

<Section6WrImpactSplit
  totalDeduction={6}
  periodLabel="Last 30 Days"
  rows={[
    { key: 'toxicDomains',        label: 'Toxic Referring Domains',  deduction: 2.5, desc: '12 domains flagged as toxic (WR < 20).' },
    { key: 'overOptimizedAnchors',label: 'Over-Optimized Anchors',   deduction: 1.5, desc: '9 anchors used 5+ times (exact match).' },
    { key: 'linkVelocity',        label: 'Link Velocity Anomaly',    deduction: 1.0, desc: 'Spike in links detected (Jul 20–22).' },
    { key: 'ipTldDiversity',      label: 'IP/TLD Diversity Risk',    deduction: 0.5, desc: '57% links from same C‑class/IP or narrow TLD.' },
    { key: 'disavowedHighImpact', label: 'Disavowed (High‑Impact)',  deduction: 0.5, desc: '3 high‑WR domains were disavowed.' },
  ]}
  onNavigate={(key) => {
    // Route per slice:
    // 'toxicDomains'        → Ref Domains & Backlinks (filter: Toxic)
    // 'overOptimizedAnchors'→ Anchor Risk Audit
    // 'linkVelocity'        → New & Lost (velocity spike filter)
    // 'ipTldDiversity'      → Ref Domains (IP/TLD filters)
    // 'disavowedHighImpact' → Disavow Manager
  }}
/>

---------------------------------------------------------------------------- */
