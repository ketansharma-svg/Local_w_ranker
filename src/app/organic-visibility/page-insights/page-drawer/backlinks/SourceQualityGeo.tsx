'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts';
import {
  BadgePercent,
  Globe2,
  Globe,
  Download,
  ChevronDown,
  Info,
  Filter,
} from 'lucide-react';

/* ───────────────────────── Tokens (Wranker-aligned) ─────────────────────────
   Brand + system tokens map to CSS vars with safe fallbacks.
   Font: Inter / Inter Fallback (per design tokens).
--------------------------------------------------------------------------- */
const TK = {
  brand: 'var(--brand,#008CCD)',
  brand600: 'var(--brand-600,#007BB8)',
  panel: 'var(--bg-panel,#FFFFFF)',
  textStrong: 'var(--text-strong,#111827)',
  text: 'var(--text,#374151)',
  muted: 'var(--text-muted,#6B7280)',
  border: 'var(--border,#E5E7EB)',
  borderSubtle: 'var(--border-subtle,#EFF0F6)',
  grid: 'var(--chart-grid,#EEF2F6)',
  success: 'var(--success,#34A853)',
  critical: 'var(--critical,#E94134)',
  coreBlue: 'var(--core-blue,#4286F5)',
  green: '#10B981',
  purple: '#8B5CF6',
  blue: '#3B82F6',
};
const fontStack =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

/* ───────────────────────── Types ───────────────────────── */
type ViewMode = 'authority' | 'geo';
type GeoDim = 'country' | 'tld';
type ScaleMode = 'count' | 'share';
type AuthorityBucket = '0–10' | '11–30' | '31–50' | '51–70' | '71–100';

export type AuthorityDatum = { bucket: AuthorityBucket; count: number };
export type GeoDatum = { key: string; label?: string; count: number };

export type SourceQualityGeoProps = {
  /** Histogram rows (DA buckets) */
  authority?: AuthorityDatum[];
  /** Top countries (ISO2 code in key, optional label) */
  countries?: GeoDatum[];
  /** Top TLDs (.com, .org…) */
  tlds?: GeoDatum[];
  /** Initial state */
  defaultView?: ViewMode;      // 'authority' | 'geo'
  defaultGeoDim?: GeoDim;      // 'country' | 'tld'
  defaultScale?: ScaleMode;    // 'count' | 'share'
  defaultTopN?: number;        // 5 | 10 | 15
  /** Fired when user clicks a bar (wire to table filter) */
  onFilter?: (args: {
    dimension: 'authority' | 'country' | 'tld';
    value: string;
    scale: ScaleMode;
  }) => void;
  className?: string;
};

/* ───────────────────────── Demo data (safe fallback) ───────────────────────── */
const DEMO_AUTH: AuthorityDatum[] = [
  { bucket: '0–10', count: 18 },
  { bucket: '11–30', count: 42 },
  { bucket: '31–50', count: 74 },
  { bucket: '51–70', count: 45 },
  { bucket: '71–100', count: 21 },
];

const DEMO_COUNTRIES: GeoDatum[] = [
  { key: 'US', label: 'United States', count: 64 },
  { key: 'IN', label: 'India', count: 38 },
  { key: 'GB', label: 'United Kingdom', count: 26 },
  { key: 'DE', label: 'Germany', count: 22 },
  { key: 'CA', label: 'Canada', count: 20 },
  { key: 'AU', label: 'Australia', count: 17 },
  { key: 'FR', label: 'France', count: 15 },
  { key: 'ES', label: 'Spain', count: 14 },
  { key: 'NL', label: 'Netherlands', count: 12 },
  { key: 'SG', label: 'Singapore', count: 9 },
];

const DEMO_TLDS: GeoDatum[] = [
  { key: '.com', count: 128 },
  { key: '.org', count: 26 },
  { key: '.net', count: 22 },
  { key: '.co', count: 18 },
  { key: '.io', count: 16 },
  { key: '.de', count: 14 },
  { key: '.uk', count: 12 },
  { key: '.in', count: 12 },
  { key: '.ca', count: 10 },
  { key: '.fr', count: 9 },
];

/* ───────────────────────── Utilities ───────────────────────── */
const fmtInt = (n: number) =>
  Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const fmtPct = (p: number) =>
  Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(p);

function toShare<T extends { count: number }>(rows: T[]) {
  const total = rows.reduce((s, r) => s + (r.count || 0), 0) || 1;
  return rows.map((r) => ({ ...(r as any), share: r.count / total, total }));
}
function topNWithOthers(rows: GeoDatum[], n: number) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, n);
  const tail = sorted.slice(n);
  const others = tail.reduce((s, r) => s + r.count, 0);
  return others > 0 ? [...head, { key: 'Others', label: 'Others', count: others }] : head;
}

function download(filename: string, href: string) {
  const a = document.createElement('a');
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function exportCSV_authority(rows: ReturnType<typeof toShare<AuthorityDatum>>, scale: ScaleMode) {
  const header = ['bucket', 'count', 'share'].join(',');
  const lines = rows.map((r) =>
    [r.bucket, r.count, (r.share ?? r.count / (r.total || 1)).toFixed(4)].join(','),
  );
  const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  download(`source_quality_authority_${scale}.csv`, url);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function exportCSV_geo(
  dim: 'country' | 'tld',
  rows: ReturnType<typeof toShare<GeoDatum>>,
  scale: ScaleMode,
) {
  const header = [dim, 'label', 'count', 'share'].join(',');
  const lines = rows.map((r) =>
    [r.key, r.label ?? '', r.count, (r.share ?? r.count / (r.total || 1)).toFixed(4)].join(','),
  );
  const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  download(`source_geo_${dim}_${scale}.csv`, url);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function exportPNGFromSvg(container: HTMLElement | null, filename: string) {
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
    download(filename, canvas.toDataURL('image/png'));
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
}

/* ───────────────────────── Smart Tooltip ───────────────────────── */
const TooltipCard: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const d = p?.payload;
  const label = d?.label ?? d?.bucket ?? d?.key ?? '';
  const count = d?.count ?? p?.value ?? 0;
  const share =
    typeof d?.share === 'number'
      ? d.share
      : d?.total
      ? (count || 0) / d.total
      : undefined;

  return (
    <div
      className="rounded-md border bg-white px-2.5 py-2 text-xs shadow"
      style={{ borderColor: TK.border }}
      role="tooltip"
    >
      <div className="font-medium" style={{ color: TK.textStrong }}>
        {label}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-4">
        <span className="text-[12px]" style={{ color: TK.muted }}>Count</span>
        <span className="font-semibold" style={{ color: TK.textStrong }}>{fmtInt(count)}</span>
      </div>
      {typeof share === 'number' && (
        <div className="mt-0.5 flex items-center justify-between gap-4">
          <span className="text-[12px]" style={{ color: TK.muted }}>Share</span>
          <span className="font-semibold" style={{ color: TK.textStrong }}>{fmtPct(share)}</span>
        </div>
      )}
      <div className="mt-1.5 text-[11px]" style={{ color: TK.muted }}>
        Click a bar to filter the Backlinks table.
      </div>
    </div>
  );
};

/* ───────────────────────── UI Primitives (chips / toggles) ───────────────────────── */
type SegOpt<T extends string> = { label: string; value: T; icon?: React.ReactNode };
function Segmented<T extends string>({
  options, value, onChange, ariaLabel,
}: {
  options: SegOpt<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border p-0.5"
      style={{ borderColor: TK.border, background: 'var(--toggle-bg,#F3F4F6)' }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer',
              active ? 'bg-white shadow-sm' : 'hover:bg-white/70 focus:bg-white',
            ].join(' ')}
            style={{
              color: active ? TK.textStrong : TK.muted,
              ['--tw-ring-color' as any]: TK.brand,
            }}
          >
            {o.icon ? <span className="mr-1 inline-block align-middle">{o.icon}</span> : null}
            <span className="align-middle">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
function Chip({
  active, onClick, children, title,
}: { active?: boolean; onClick?: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs font-medium transition cursor-pointer"
      style={{
        borderColor: active ? TK.brand : TK.border,
        background: active ? 'rgba(0,140,205,0.08)' : 'var(--chip-bg,#F1F5F9)',
        color: active ? TK.brand : TK.textStrong,
      }}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── Component ───────────────────────── */
export default function SourceQualityGeo({
  authority = DEMO_AUTH,
  countries = DEMO_COUNTRIES,
  tlds = DEMO_TLDS,
  defaultView = 'authority',
  defaultGeoDim = 'country',
  defaultScale = 'count',
  defaultTopN = 10,
  onFilter,
  className,
}: SourceQualityGeoProps) {
  const [view, setView] = React.useState<ViewMode>(defaultView);
  const [geoDim, setGeoDim] = React.useState<GeoDim>(defaultGeoDim);
  const [scale, setScale] = React.useState<ScaleMode>(defaultScale);
  const [topN, setTopN] = React.useState<number>(defaultTopN);
  const chartRef = React.useRef<HTMLDivElement | null>(null);

  // Prepared series
  const authoritySeries = React.useMemo(() => toShare(authority), [authority]);
  const geoRaw = geoDim === 'country' ? countries : tlds;
  const geoSeries = React.useMemo(() => toShare(topNWithOthers(geoRaw, topN)), [geoRaw, topN]);

  const yDomain =
    scale === 'share'
      ? [0, 1]
      : ['dataMin', (dataMax: number) => Math.max(5, Math.round((dataMax || 0) * 1.15))];
  const yTickFormatter = (v: number) => (scale === 'share' ? fmtPct(v) : fmtInt(v));
  const barValueKey = scale === 'share' ? 'share' : 'count';

  // Click → filter context
  const handleBarClick = (payload: any) => {
    if (!payload?.payload) return;
    if (view === 'authority') {
      onFilter?.({ dimension: 'authority', value: payload.payload.bucket, scale });
    } else {
      onFilter?.({ dimension: geoDim, value: payload.payload.key, scale });
    }
  };

  // Export
  const doExportCSV = () => {
    if (view === 'authority') exportCSV_authority(authoritySeries, scale);
    else exportCSV_geo(geoDim, geoSeries, scale);
  };
  const doExportPNG = () => {
    const base = view === 'authority' ? 'authority' : `geo_${geoDim}`;
    exportPNGFromSvg(chartRef.current, `source_quality_${base}_${scale}.png`);
  };

  const data = view === 'authority' ? authoritySeries : geoSeries;
  const color = view === 'authority' ? TK.blue : geoDim === 'country' ? TK.green : TK.purple;
  const empty = !data?.length;

  return (
    <section
      className={[
        'ml-auto w-full mt-4', // ← right-side half width
        'rounded-xl border bg-white shadow-sm',
        'p-4 md:p-5',
        className || '',
      ].join(' ')}
      style={{ borderColor: TK.border, fontFamily: fontStack }}
      role="img"
      aria-label={
        view === 'authority'
          ? `Histogram of referring domains by authority bucket (${scale}).`
          : `Top ${topN} ${geoDim === 'country' ? 'countries' : 'TLDs'} by backlinks (${scale}).`
      }
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* Branded icon in section title */}
            {view === 'authority' ? (
              <BadgePercent size={18} color={TK.brand as string} />
            ) : (
              <Globe2 size={18} color={TK.brand as string} />
            )}
            <h3 className="truncate text-[15px] font-semibold" style={{ color: TK.textStrong }}>
              Source Quality / Geo
            </h3>
            <button
              type="button"
              className="ml-1 rounded p-1 text-gray-400 hover:bg-gray-50"
              title="Authority histogram or Geo distribution. Hover for details; click bar to filter."
              style={{ cursor: 'pointer' }}
            >
              <Info size={14} />
            </button>
          </div>
          <p className="mt-0.5 text-xs" style={{ color: TK.muted }}>
            Hover to see Count + % · Click a bar to filter the Backlinks table.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle (segmented) */}
          <Segmented<ViewMode>
            ariaLabel="View mode"
            options={[
              { label: 'Authority', value: 'authority', icon: <BadgePercent size={14} color={TK.brand as string} /> },
              { label: 'Geo', value: 'geo', icon: <Globe2 size={14} color={TK.brand as string} /> },
            ]}
            value={view}
            onChange={setView}
          />

          {/* Geo dimension (only in Geo) */}
          {view === 'geo' && (
            <Segmented<GeoDim>
              ariaLabel="Geo dimension"
              options={[
                { label: 'Countries', value: 'country', icon: <Globe size={14} color={TK.brand as string} /> },
                { label: 'TLDs', value: 'tld', icon: <span className="text-[11px] font-semibold text-[color:var(--brand,#008CCD)]">.TLDs</span> },
              ]}
              value={geoDim}
              onChange={setGeoDim}
            />
          )}

          {/* Scale */}
          <Segmented<ScaleMode>
            ariaLabel="Scale"
            options={[
              { label: 'Count', value: 'count' },
              { label: '% Share', value: 'share' },
            ]}
            value={scale}
            onChange={setScale}
          />

          {/* TopN (Geo) */}
          {view === 'geo' && (
            <div className="flex items-center gap-1.5">
              {[5, 10, 15].map((n) => (
                <Chip key={n} active={n === topN} onClick={() => setTopN(n)} title={`Top ${n}`}>
                  Top {n}
                </Chip>
              ))}
            </div>
          )}

          {/* Export */}
          <div className="relative">
            <details className="group relative">
              <summary
                className="flex list-none items-center gap-2 h-8 px-3 rounded-md border text-sm font-medium cursor-pointer hover:bg-gray-50"
                style={{ borderColor: TK.border, background: '#FFFFFF', color: TK.textStrong }}
              >
                <Download className="h-4 w-4" color={TK.brand as string} />
                Export
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </summary>
              <div
                className="absolute right-0 z-40 mt-2 min-w-[160px] overflow-hidden rounded-md border bg-white shadow-md"
                style={{ borderColor: TK.border }}
              >
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ cursor: 'pointer' }}
                  onClick={doExportPNG}
                >
                  PNG
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ cursor: 'pointer' }}
                  onClick={doExportCSV}
                >
                  CSV
                </button>
                <button
                  className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
                  title="PDF export is locked (Pro)"
                >
                  PDF (Pro)
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="h-[320px] w-full">
        {empty ? (
          <div
            className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm"
            style={{ borderColor: TK.border, color: TK.muted }}
          >
            No data in selection.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 2 }}
              onClick={({ activePayload }: any) => {
                if (activePayload?.[0]) handleBarClick(activePayload[0]);
              }}
            >
              <CartesianGrid stroke={TK.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey={view === 'authority' ? 'bucket' : 'key'}
                tickLine={false}
                axisLine={{ stroke: TK.grid }}
                fontSize={12}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: TK.grid }}
                fontSize={12}
                allowDecimals={false}
                domain={yDomain as any}
                tickFormatter={yTickFormatter}
              />
              <RTooltip cursor={{ fill: 'rgba(17,24,39,0.06)' }} content={<TooltipCard />} />
              <Bar
                dataKey={barValueKey}
                fill={color}
                radius={[6, 6, 0, 0]}  // top-only rounded (per spec)
                isAnimationActive
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div style={{ color: TK.muted }}>
          <Filter className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
          Click any bar to apply a filter to the Backlinks table.
        </div>
        <div style={{ color: TK.muted }}>
          View:{" "}
          <span className="font-medium text-gray-700">
            {view === 'authority' ? 'Authority' : `Geo • ${geoDim === 'country' ? 'Countries' : 'TLDs'}`}
          </span>{" "}
          · Scale:{" "}
          <span className="font-medium text-gray-700">{scale === 'share' ? '% Share' : 'Count'}</span>
        </div>
      </div>
    </section>
  );
}

/* Named export for convenience */
export { SourceQualityGeo };
