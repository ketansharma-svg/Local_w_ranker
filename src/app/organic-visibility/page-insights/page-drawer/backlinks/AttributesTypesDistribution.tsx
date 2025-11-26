'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Info, Download, Lock, Percent, BarChart3, Layers3, ChevronDown
} from 'lucide-react';

/* ----------------------------------------------------------------------------
   Chart B — Attributes & Types (distribution)
   - X axis: attributes (Follow/NoFollow/Sponsored/UGC) or link types (Text/Image/Redirect/JS)
   - Grouped bars by domain (You + competitors)
   - Hover: count + % share; Click bar: calls onApplyTableFilter(...)
   - Export: CSV/PNG (PDF locked); legend chips (toggle domains)
   - Fully demoable with built-in data if no props provided
---------------------------------------------------------------------------- */

type RelKey = 'follow' | 'nofollow' | 'sponsored' | 'ugc';
type TypeKey = 'text' | 'image' | 'redirect' | 'js';

type Domain = {
  /** unique id (safe for object keys) */
  id: string;
  /** label shown in legend, tooltips */
  label: string;
  /** color for bars; distinct across domains */
  color?: string;
  /** if this is the user's domain (visual hint) */
  isYou?: boolean;
};

type AttributeBucket = { key: RelKey; label: string; counts: Record<string /*domainId*/, number> };
type LinkTypeBucket = { key: TypeKey; label: string; counts: Record<string /*domainId*/, number> };

export type AttributesTypesData = {
  domains: Domain[];
  attributes: AttributeBucket[]; // Follow/NoFollow/Sponsored/UGC
  types: LinkTypeBucket[];       // Text/Image/Redirect/JS
};

export type ChartBProps = {
  /** Data for the chart; falls back to safe demo if omitted */
  data?: AttributesTypesData;
  /** "attributes" | "types" — initial tab */
  defaultMode?: 'attributes' | 'types';
  /** count | share — initial y-axis */
  defaultNormalize?: 'count' | 'share';
  /** Export naming hint (domain/country/device/range) */
  filenameHint?: string; // e.g., "wranker.com_US_desktop_30d"
  /** Wire this to your backlinks table to apply a filter when a bar is clicked */
  onApplyTableFilter?: (args: {
    dimension: 'attribute' | 'type';
    key: RelKey | TypeKey;
    label: string;
    domainId: string;
    domainLabel: string;
    normalized: boolean;
  }) => void;
  /** Show loading skeleton (external async load) */
  loading?: boolean;
  /** Error text; if present, shows inline error UI */
  error?: string | null;
  className?: string;
};

/* ----------------------------- Tokens (CSS vars safe) ----------------------------- */
const TK = {
  border: 'var(--wr-border,#E5E7EB)',
  borderLight: 'var(--wr-borderLight,#EFF0F6)',
  text: 'var(--wr-text,#111827)',
  muted: 'var(--wr-muted,#6B7280)',
  card: 'var(--wr-surface,#FFFFFF)',
  grid: '#EFF0F6',
  youBadge: 'var(--wr-brand,#1090D0)', // accent ring for your domain
};

/* ----------------------------- Demo data (safe defaults) ----------------------------- */
function demoData(): AttributesTypesData {
  const domains: Domain[] = [
    { id: 'you', label: 'Your Domain', color: '#1090D0', isYou: true },
    { id: 'compA', label: 'competitor-a.com', color: '#10B981' },
    { id: 'compB', label: 'competitor-b.io', color: '#F59E0B' },
  ];

  const A = (key: RelKey, label: string, y: number, a: number, b: number): AttributeBucket => ({
    key, label, counts: { you: y, compA: a, compB: b }
  });
  const T = (key: TypeKey, label: string, y: number, a: number, b: number): LinkTypeBucket => ({
    key, label, counts: { you: y, compA: a, compB: b }
  });

  const attributes: AttributeBucket[] = [
    A('follow', 'Follow',    420, 380, 300),
    A('nofollow', 'NoFollow',180, 210, 260),
    A('sponsored', 'Sponsored', 24, 18,  30),
    A('ugc', 'UGC',           42, 28,  36),
  ];

  const types: LinkTypeBucket[] = [
    T('text', 'Text',      540, 480, 520),
    T('image', 'Image',     60,  80,  70),
    T('redirect', 'Redirect', 28,  40,  25),
    T('js', 'JS',           38,  35,  31),
  ];

  return { domains, attributes, types };
}

/* ----------------------------- Utils: formatters & export ----------------------------- */
const fmtInt = (n: number) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(n);

function fileDownload(name: string, href: string) {
  const a = document.createElement('a');
  a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

function exportCSV(rows: Array<Record<string, string | number>>, filename: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const header = cols.join(',');
  const lines = rows.map(r => cols.map(c => {
    const v = r[c]; const s = v == null ? '' : String(v);
    return s.match(/[",\n]/) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(','));
  const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  fileDownload(filename, url);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function exportPNGFromSvg(container: HTMLDivElement | null, filename: string) {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;
  const serializer = new XMLSerializer();
  const str = serializer.serializeToString(svg);
  const rect = svg.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(rect.width);
  canvas.height = Math.ceil(rect.height);
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx?.drawImage(img, 0, 0);
    fileDownload(filename, canvas.toDataURL('image/png'));
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
}

/* ----------------------------- Legend chips ----------------------------- */
const LegendChip: React.FC<{
  color: string;
  label: string;
  active: boolean;
  isYou?: boolean;
  onToggle: () => void;
}> = ({ color, label, active, isYou, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition"
    style={{
      borderColor: TK.border,
      background: active ? 'rgba(16,144,208,0.08)' : '#FFFFFF',
      color: active ? TK.text : TK.muted,
      boxShadow: isYou ? 'inset 0 0 0 1.5px rgba(16,144,208,0.35)' : undefined,
    }}
    aria-pressed={active}
    title={isYou ? 'Your domain' : label}
  >
    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
    <span className="font-medium">{label}</span>
    {!active && <span className="ml-1 text-[10px] text-gray-400">(hidden)</span>}
  </button>
);

/* ----------------------------- Header Export menu (lightweight) ----------------------------- */
const ExportMenu: React.FC<{
  onPNG: () => void; onCSV: () => void; onPDF?: () => void;
}> = ({ onPNG, onCSV, onPDF }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium"
        style={{ borderColor: TK.border, background: '#FFFFFF', color: TK.text }}
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-40 mt-2 min-w-[160px] overflow-hidden rounded-md border bg-white shadow-lg"
          style={{ borderColor: TK.border }}
          onMouseLeave={() => setOpen(false)}
        >
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onPNG(); }}>PNG</button>
          <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setOpen(false); onCSV(); }}>CSV</button>
          <button
            className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
            title="PDF export is Pro (locked)"
            onClick={() => { setOpen(false); onPDF?.(); }}
          >
            <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> PDF (Pro)</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* ----------------------------- Smart Tooltip ----------------------------- */
const TooltipCard: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  normalize?: boolean; // if % share view
  domainsByKey?: Record<string, Domain>;
}> = ({ active, payload, label, normalize, domainsByKey }) => {
  if (!active || !payload?.length) return null;

  // Payload contains 1 item per visible domain (dataKey = domainId)
  const rows = payload
    .filter(p => p && typeof p.value === 'number')
    .map(p => ({
      domainId: p.dataKey as string,
      domainLabel: domainsByKey?.[p.dataKey]?.label ?? p.dataKey,
      color: p.fill as string,
      value: Number(p.value) || 0,
    }));

  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm" style={{ borderColor: TK.border }}>
      <div className="mb-1 text-[12px] font-medium" style={{ color: TK.muted }}>
        {label}
      </div>
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.domainId} className="flex items-center justify-between gap-3 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
              <span>{r.domainLabel}</span>
            </div>
            <div className="font-medium tabular-nums">
              {normalize ? fmtPct(total > 0 ? r.value / total : 0) : fmtInt(r.value)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t pt-1.5 text-[12px]" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{normalize ? 'Total (100%)' : 'Total'}</span>
          <span className="font-semibold">{normalize ? '—' : fmtInt(total)}</span>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------- Main Component ----------------------------- */
export default function AttributesTypesDistribution({
  data,
  defaultMode = 'attributes',
  defaultNormalize = 'count',
  filenameHint = 'page-backlinks',
  onApplyTableFilter,
  loading,
  error,
  className,
}: ChartBProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const dataset = useMemo(() => data ?? demoData(), [data]);

  // mode: attributes vs types
  const [mode, setMode] = useState<'attributes' | 'types'>(defaultMode);
  // normalize: count vs % share
  const [normalize, setNormalize] = useState<'count' | 'share'>(defaultNormalize);
  // visible domains
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    (dataset.domains || []).forEach(d => (v[d.id] = true));
    return v;
  });

  const domainsByKey = useMemo(() => {
    const map: Record<string, Domain> = {};
    dataset.domains.forEach(d => { map[d.id] = d; });
    return map;
  }, [dataset.domains]);

  // Build chart rows for current mode
  type Row = { key: string; label: string } & Record<string, number>;
  const rows: Row[] = useMemo(() => {
    const buckets = mode === 'attributes' ? dataset.attributes : dataset.types;
    const raw = buckets.map(b => {
      const base: any = { key: b.key, label: b.label };
      dataset.domains.forEach(d => {
        base[d.id] = Math.max(0, Number(b.counts[d.id] ?? 0));
      });
      return base as Row;
    });

    if (normalize === 'share') {
      return raw.map(r => {
        const total = dataset.domains.reduce((s, d) => visible[d.id] ? s + (r as any)[d.id] : s, 0) || 0;
        const nr: any = { key: r.key, label: r.label };
        dataset.domains.forEach(d => {
          nr[d.id] = total > 0 ? (visible[d.id] ? (r as any)[d.id] : 0) : 0;
        });
        return nr as Row;
      });
    }
    return raw;
  }, [dataset, mode, normalize, visible]);

  const hasAnyVisibleDomain = useMemo(() => Object.values(visible).some(Boolean), [visible]);
  const isEmpty = useMemo(() => {
    if (!rows.length || !hasAnyVisibleDomain) return true;
    return rows.every(r => dataset.domains.every(d => !visible[d.id] || (r as any)[d.id] === 0));
  }, [rows, dataset.domains, visible, hasAnyVisibleDomain]);

  const yLabel = normalize === 'share' ? 'Share' : 'Count';
  const title = mode === 'attributes' ? 'Rel Attributes (Follow/NoFollow/Sponsored/UGC)' : 'Link Types (Text/Image/Redirect/JS)';

  // CSV export (respect current mode, visibility, and normalization)
  function onExportCSV() {
    const cols = ['dimension', 'bucket', ...dataset.domains.filter(d => visible[d.id]).map(d => d.label)];
    const body = rows.map(r => {
      const out: Record<string, string | number> = {
        dimension: mode === 'attributes' ? 'attribute' : 'type',
        bucket: r.label,
      };
      dataset.domains.forEach(d => {
        if (!visible[d.id]) return;
        const val = (r as any)[d.id] || 0;
        out[d.label] = normalize === 'share' ? Number(((val / dataset.domains.reduce((s, dom) => visible[dom.id] ? s + (r as any)[dom.id] : s, 0) || 0) * 100).toFixed(2)) : val;
      });
      return out;
    });

    exportCSV(
      [Object.fromEntries(cols.map(c => [c, c])), ...body as any],
      `attributes_types_${filenameHint}_${mode}_${normalize}.csv`
    );
  }

  function onExportPNG() {
    exportPNGFromSvg(containerRef.current, `attributes_types_${filenameHint}_${mode}_${normalize}.png`);
  }

  // Click handler → wire to backlinks table filter
  function onBarClick(e: any, domainId: string) {
    if (!e?.activePayload?.[0]?.payload) return;
    const p = e.activePayload[0].payload as Row;
    const key = (p.key as RelKey | TypeKey);
    const label = p.label;
    onApplyTableFilter?.({
      dimension: mode === 'attributes' ? 'attribute' : 'type',
      key,
      label,
      domainId,
      domainLabel: domainsByKey[domainId]?.label ?? domainId,
      normalized: normalize === 'share',
    });
  }

  // Controls
  const Pill: React.FC<React.PropsWithChildren<{ active?: boolean; onClick?: () => void }>> =
    ({ active, onClick, children }) => (
      <button
        type="button"
        onClick={onClick}
        className={`h-8 rounded-md border px-3 text-sm ${active ? 'font-semibold' : 'font-medium'}`}
        style={{ borderColor: TK.border, background: active ? 'rgba(16,144,208,0.08)' : '#FFFFFF', color: TK.text }}
      >
        {children}
      </button>
    );

  /* ----------------------------- Render ----------------------------- */
  return (
    <section
      className={`rounded-xl border bg-white shadow-sm mt-4 ${className ?? ''}`}
      style={{ borderColor: TK.border }}
      aria-label="Backlink attributes and types distribution"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-900">Attributes & Types (distribution)</h3>
          <p className="mt-0.5 text-[12px] text-gray-500">
            Grouped bars per category &nbsp;—&nbsp; colors = domains. Click a bar to filter the backlinks table.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex items-center gap-1">
            <Pill active={mode === 'attributes'} onClick={() => setMode('attributes')}><Layers3 className="mr-1 h-4 w-4" /> Attributes</Pill>
            <Pill active={mode === 'types'} onClick={() => setMode('types')}><BarChart3 className="mr-1 h-4 w-4" /> Types</Pill>
          </div>

          {/* Normalize */}
          <div className="ml-1 inline-flex items-center gap-1">
            <Pill active={normalize === 'count'} onClick={() => setNormalize('count')}>Count</Pill>
            <Pill active={normalize === 'share'} onClick={() => setNormalize('share')}>
              <Percent className="mr-1 h-4 w-4" /> % Share
            </Pill>
          </div>

          {/* Info */}
          <span className="ml-1 inline-flex items-center" title="Rel attributes (follow/nofollow/sponsored/UGC) or link types (text/image/redirect/JS). Hover shows count + %, click bar to filter the table.">
            <Info className="h-4 w-4 text-gray-400" />
          </span>

          {/* Export */}
          <div className="ml-2">
            <ExportMenu onPNG={onExportPNG} onCSV={onExportCSV} />
          </div>
        </div>
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
        {dataset.domains.map(d => (
          <LegendChip
            key={d.id}
            color={d.color || '#1090D0'}
            label={d.label}
            active={!!visible[d.id]}
            isYou={d.isYou}
            onToggle={() => setVisible(v => ({ ...v, [d.id]: !v[d.id] }))}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: TK.borderLight }} />

      {/* Body */}
      <div ref={containerRef} className="p-4">
        {/* States */}
        {loading ? (
          <div className="h-[280px] w-full animate-pulse rounded-lg border" style={{ borderColor: TK.borderLight }}>
            <div className="h-full w-full bg-[repeating-linear-gradient(90deg,#F8FAFC,#F8FAFC_8px,#F1F5F9_8px,#F1F5F9_16px)] rounded-lg" />
          </div>
        ) : error ? (
          <div className="flex h-[280px] items-center justify-center rounded-lg border text-sm" style={{ borderColor: '#FCA5A5', color: '#B91C1C' }}>
            {error} &nbsp;—&nbsp; Please retry.
          </div>
        ) : isEmpty ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-lg border text-sm text-gray-500" style={{ borderColor: TK.borderLight }}>
            No data for the current selection.
            <div className="text-[12px] text-gray-400">Tip: enable one or more domains in the legend above.</div>
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
                barCategoryGap={20}
              >
                <CartesianGrid vertical={false} stroke={TK.grid} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: TK.grid }}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: TK.grid }}
                  fontSize={12}
                  tickFormatter={(v) => normalize === 'share' ? fmtPct((v as number) / 100) : fmtInt(v as number)}
                  domain={normalize === 'share' ? [0, (data ? 100 : 'dataMax')] : ['auto', 'auto']}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(17,24,39,0.06)' }}
                  content={
                    <TooltipCard
                      normalize={normalize === 'share'}
                      domainsByKey={domainsByKey}
                    />
                  }
                />

                {/* One <Bar> per visible domain (grouped across categories) */}
                {dataset.domains.filter(d => visible[d.id]).map(d => (
                  <Bar
                    key={d.id}
                    dataKey={d.id}
                    name={d.label}
                    fill={d.color || '#1090D0'}
                    radius={[4, 4, 0, 0]}
                    onClick={(e) => onBarClick(e, d.id)}
                    isAnimationActive
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Footer meta */}
        {!loading && !error && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">{title}</span>
              <span className="h-3 w-px bg-gray-200" />
              <span>Y: {yLabel}</span>
            </div>
            <div className="text-gray-400">
              Click a bar to apply a table filter &nbsp;•&nbsp; PNG/CSV export available (PDF locked)
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- Optional Demo Wrapper ----------------------------- */
export function Demo_ChartB_AttributesTypes() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <AttributesTypesDistribution
        onApplyTableFilter={(args) => {
          alert(
            `Filter table → ${args.dimension} = ${args.label} (${args.key}) • Domain: ${args.domainLabel} • ${args.normalized ? '% share' : 'count'}`
          );
        }}
        filenameHint="demo_US_desktop_30d"
      />
    </div>
  );
}
