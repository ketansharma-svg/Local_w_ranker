'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ComposedChart,
} from 'recharts';
import { Download, BarChart3, Info } from 'lucide-react';

/* ───────────────────────── Tokens (Wranker-aligned) ─────────────────────────
   Colors + type pulled from your design tokens (brand, status, text, borders).
----------------------------------------------------------------------------- */
const T = {
  brand: 'var(--brand,#008CCD)',
  brand600: 'var(--brand-600,#007BB8)',
  panel: 'var(--bg-panel,#FFFFFF)',
  text: 'var(--text-strong,#111827)',
  muted: 'var(--text-muted,#6B7280)',
  border: 'var(--border,#E5E7EB)',
  borderSubtle: 'var(--border-subtle,#EFF0F6)',
  grid: 'var(--chart-grid,#EEF2F6)',

  success: 'var(--success,#34A853)', // New
  danger: 'var(--critical,#E94134)', // Lost
  neutral: 'var(--text,#374151)',    // Net line
};

const fontStack =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

/* ───────────────────────── Types ───────────────────────── */
export type VelocityPoint = {
  date: string | Date;
  newCount: number;
  lostCount: number;
};

type RangeKey = '30d' | '90d' | '180d';
type IntervalKey = 'daily' | 'weekly' | 'monthly';
type ViewKey = 'bar' | 'area';

export type LinkVelocityNewLostProps = {
  /** Section title (kept minimal per brief) */
  title?: string; // default "Link Velocity"
  data?: VelocityPoint[];
  onDrilldown?: (args: { date: Date; kind: 'new' | 'lost' | 'both'; range: RangeKey; interval: IntervalKey }) => void;
  defaultRange?: RangeKey;
  defaultView?: ViewKey;
  defaultInterval?: IntervalKey;
  className?: string;
  onExport?: () => void;
};

/* ───────────────────────── Utilities ───────────────────────── */
const toDate = (v: string | Date) => (v instanceof Date ? new Date(v) : new Date(v));
const dayISO = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtInt = (n: number) => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

const fmtTick = (d: Date, interval: IntervalKey) => {
  if (interval === 'daily') return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  if (interval === 'weekly') return 'Wk of ' + d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

/* Aggregate helpers to support Daily/Weekly/Monthly buckets */
const startOfWeekMon = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfMonth = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
};

const normalize = (raw: VelocityPoint[]) =>
  (raw ?? [])
    .map((r) => ({ date: toDate(r.date), newCount: +r.newCount || 0, lostCount: +r.lostCount || 0 }))
    .sort((a, b) => +a.date - +b.date);

function suggestInterval(days: number): IntervalKey {
  if (days <= 31) return 'daily';
  if (days <= 185) return 'weekly';
  return 'monthly';
}

/* ───────────── Demo data (safe defaults) ───────────── */
function makeDemoData(days = 90): VelocityPoint[] {
  const today = new Date();
  const out: VelocityPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const newCount = Math.max(0, Math.round(12 + 6 * Math.sin(i / 3) + (Math.random() * 6 - 3)));
    const lostCount = Math.max(0, Math.round(8 + 5 * Math.cos(i / 4) + (Math.random() * 5 - 2.5)));
    out.push({ date: d, newCount, lostCount });
  }
  return out;
}

/* Bucket + zero-fill; lost plotted as negative for symmetric axes */
function bucketize(
  data: ReturnType<typeof normalize>,
  range: RangeKey,
  interval: IntervalKey
): Array<{ date: Date; newBL: number; lostBL: number; lostNeg: number; net: number }> {
  if (!data.length) return [];

  const end = data[data.length - 1].date;
  const start = (() => {
    if (range === '30d') return addDays(end, -29);
    if (range === '90d') return addDays(end, -89);
    return addDays(end, -179);
  })();

  const keyOf = (d: Date) => {
    if (interval === 'daily') return dayISO(d);
    if (interval === 'weekly') return dayISO(startOfWeekMon(d));
    const m = startOfMonth(d);
    return dayISO(m);
  };

  // Sum rows into time buckets
  const map = new Map<string, { date: Date; newBL: number; lostBL: number }>();
  for (const r of data) {
    if (r.date < start || r.date > end) continue;
    const k = keyOf(r.date);
    const prev = map.get(k);
    if (!prev) map.set(k, { date: new Date(k), newBL: r.newCount, lostBL: r.lostCount });
    else {
      prev.newBL += r.newCount;
      prev.lostBL += r.lostCount;
    }
  }

  // Build sequential timeline and zero‑fill
  const series: Array<{ date: Date; newBL: number; lostBL: number; lostNeg: number; net: number }> = [];
  let cursor =
    interval === 'daily' ? new Date(dayISO(start)) : interval === 'weekly' ? startOfWeekMon(start) : startOfMonth(start);

  const step = () => {
    if (interval === 'daily') cursor = addDays(cursor, 1);
    else if (interval === 'weekly') cursor = addDays(cursor, 7);
    else {
      const m = new Date(cursor);
      m.setMonth(m.getMonth() + 1);
      cursor = m;
    }
  };

  const lastKey = keyOf(end);
  while (true) {
    const k = keyOf(cursor);
    const r = map.get(k);
    const newBL = r?.newBL ?? 0;
    const lostBL = r?.lostBL ?? 0;
    series.push({ date: new Date(k), newBL, lostBL, lostNeg: -lostBL, net: newBL - lostBL });
    if (k === lastKey) break;
    step();
    if (series.length > 1200) break;
  }

  return series;
}

/* ───────────────────────── Atoms (chips / toggles) ───────────────────────── */
type SegOpt<T extends string> = { label: string; value: T };
function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
}: {
  options: SegOpt<T>[];
  value: T;
  onChange: (v: T) => void;
  'aria-label'?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border p-0.5"
      style={{ borderColor: T.border, background: 'var(--toggle-bg,#F3F4F6)' }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition',
              'cursor-pointer focus:outline-none focus-visible:ring-2',
              active ? 'bg-white shadow-sm' : 'hover:bg-white/70',
            ].join(' ')}
            style={{
              color: active ? T.text : T.muted,
              ['--tw-ring-color' as any]: T.brand,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs font-medium transition cursor-pointer"
      style={{
        borderColor: active ? T.brand : T.border,
        background: active ? 'rgba(0,140,205,0.08)' : 'var(--chip-bg,#F1F5F9)',
        color: active ? T.brand : T.text,
      }}
    >
      {children}
    </button>
  );
}

/** Modular legend toggles (multi-select) — consistent with other sections */
function LegendToggle({
  label,
  color,
  active,
  onToggle,
}: {
  label: string;
  color: string;
  active: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => onToggle(!active)}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium transition"
      style={{
        borderColor: active ? T.brand : T.border,
        background: active ? 'rgba(0,140,205,0.08)' : 'var(--chip-bg,#F1F5F9)',
        color: active ? T.brand : T.text,
        cursor: 'pointer',
      }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
      <span
        aria-hidden="true"
        className="ml-1 inline-flex h-4 w-7 items-center rounded-full border"
        style={{
          borderColor: active ? T.brand : T.border,
          background: active ? T.brand : '#E5E7EB',
        }}
      >
        <span
          className="mx-[2px] inline-block h-3 w-3 rounded-full bg-white transition-transform"
          style={{ transform: `translateX(${active ? '12px' : '0'})` }}
        />
      </span>
    </button>
  );
}

/* ───────────────────────── Tooltip ───────────────────────── */
const SmartTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const date = row?.date ? new Date(row.date) : undefined;

  const newVal = payload.find((p: any) => p.dataKey === 'newBL')?.value ?? row?.newBL ?? 0;
  const lostVal = payload.find((p: any) => p.dataKey === 'lostBL')?.value ?? row?.lostBL ?? 0; // keep positive in card
  const net = (newVal || 0) - (lostVal || 0);

  return (
    <div className="rounded-md border bg-white px-3 py-2 text-xs shadow-sm" style={{ borderColor: T.border }}>
      <div className="font-medium" style={{ color: T.muted }}>
        {date?.toLocaleDateString()}
      </div>
      <div className="mt-1 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: T.success }} />
            New
          </span>
          <span className="font-semibold" style={{ color: T.text }}>
            {fmtInt(newVal)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: T.danger }} />
            Lost
          </span>
          <span className="font-semibold" style={{ color: T.text }}>
            {fmtInt(lostVal)}
          </span>
        </div>
        <div className="mt-1 border-t pt-1.5" style={{ borderColor: T.borderSubtle }}>
          <div className="flex items-center justify-between">
            <span style={{ color: T.muted }}>Net</span>
            <span className="font-semibold" style={{ color: net >= 0 ? T.success : T.danger }}>
              {net >= 0 ? '+' : ''}
              {fmtInt(net)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── Main (refined) ───────────────────────── */
export default function LinkVelocityNewLost({
  title = 'Link Velocity',
  data,
  onDrilldown,
  defaultRange = '90d',
  defaultView = 'area',
  defaultInterval,
  className,
  onExport,
}: LinkVelocityNewLostProps) {
  const [range, setRange] = React.useState<RangeKey>(defaultRange);
  const [view, setView] = React.useState<ViewKey>(defaultView);
  const base = React.useMemo(() => normalize(data?.length ? data : makeDemoData(180)), [data]);

const totalDays = React.useMemo(() => {
  const firstDate = base[0]?.date ?? 0;
  const lastDate = base.at(-1)?.date ?? firstDate;
  return Math.max(1, Math.round((+lastDate - +firstDate) / 86400000) + 1);
}, [base]);

  const initialInterval = defaultInterval ?? suggestInterval(totalDays);
const [interval, setInterval] = React.useState<IntervalKey>(initialInterval);


  const series = React.useMemo(() => bucketize(base, range, interval), [base, range, interval]);

  /* Legend toggles (modular switches) */
  const [showNew, setShowNew] = React.useState(true);
  const [showLost, setShowLost] = React.useState(true);
  const [showNet, setShowNet] = React.useState(false);

  /* Axis domain synced to highest stacked bar + net line so bars don't look tiny */
  const domain = React.useMemo<[number, number]>(() => {
    if (!series.length) return [0, 10];
    const maxPos = Math.max(
      showNew ? Math.max(...series.map((r) => r.newBL)) : 0,
      showNet ? Math.max(...series.map((r) => r.net)) : 0
    );
    const minNeg = Math.min(
      showLost ? Math.min(...series.map((r) => r.lostNeg)) : 0,
      showNet ? Math.min(...series.map((r) => r.net)) : 0
    );
    // Add 10% headroom relative to the larger magnitude
    const topPad = Math.ceil(maxPos * 0.1);
    const botPad = Math.floor(Math.abs(minNeg) * 0.1);
    return [minNeg - botPad, maxPos + topPad];
  }, [series, showNew, showLost, showNet]);

  const handlePointClick = (evt: any, which: 'new' | 'lost' | 'both') => {
    if (!onDrilldown) return;
    const payload = evt?.activePayload?.[0]?.payload;
    const when = payload?.date ? new Date(payload.date) : undefined;
    if (when) onDrilldown({ date: when, kind: which, range, interval });
  };

  const hasData = series.length > 0 && (showNew || showLost || showNet);

  return (
    <section
      className={['rounded-xl border bg-white shadow-sm mt-4', className || ''].join(' ')}
      style={{ borderColor: T.border, fontFamily: fontStack }}
      aria-labelledby="link-velocity-title"
    >
      {/* Header (brand icon + title + actions) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 size={18} color={T.brand as string} className="shrink-0" />
          <h3 id="link-velocity-title" className="truncate text-[16px] font-semibold" style={{ color: T.text }}>
            {title}
          </h3>
          <button
            type="button"
            className="ml-1 rounded p-1 text-gray-400 hover:bg-gray-50"
            title="New vs Lost backlinks; click points/bars to drill down"
            style={{ cursor: 'pointer' }}
          >
            <Info size={14} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedToggle<ViewKey>
            aria-label="Chart type"
            options={[
              { label: 'Area', value: 'area' },
              { label: 'Bar', value: 'bar' },
            ]}
            value={view}
            onChange={setView}
          />
          <SegmentedToggle<IntervalKey>
            aria-label="Aggregation"
            options={[
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
              { label: 'Monthly', value: 'monthly' },
            ]}
            value={interval}
            onChange={setInterval}
          />
          <div className="flex items-center gap-1.5">
            {(['30d', '90d', '180d'] as RangeKey[]).map((k) => (
              <Chip key={k} active={range === k} onClick={() => setRange(k)}>
                {k.toUpperCase()}
              </Chip>
            ))}
          </div>

          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            title="Export"
            style={{ borderColor: T.border, background: T.panel, color: T.brand, cursor: 'pointer' }}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: T.borderSubtle }} />

      {/* Modular legend toggles */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2">
        <LegendToggle label="New" color={T.success as string} active={showNew} onToggle={setShowNew} />
        <LegendToggle label="Lost" color={T.danger as string} active={showLost} onToggle={setShowLost} />
        <LegendToggle label="Net (New − Lost)" color={T.neutral as string} active={showNet} onToggle={setShowNet} />
      </div>

      {/* Chart */}
      <div className="px-4 pb-4">
        <div className="h-[320px] w-full">
          {!hasData ? (
            <div
              className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm"
              style={{ borderColor: T.border, color: T.muted }}
            >
              No data in selection.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={series}
                margin={{ top: 6, right: 8, left: 0, bottom: 2 }}
                onClick={(e) => handlePointClick(e, 'both')}
                barCategoryGap={view === 'bar' ? '32%' : undefined}
                barGap={view === 'bar' ? 2 : undefined}
              >
                <CartesianGrid stroke={T.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => fmtTick(new Date(v), interval)}
                  tickLine={false}
                  axisLine={{ stroke: T.grid }}
                  minTickGap={28}
                  fontSize={12}
                />
                <YAxis domain={domain} tickLine={false} axisLine={{ stroke: T.grid }} allowDecimals={false} fontSize={12} />
                <RTooltip
                  content={<SmartTooltip />}
                  cursor={view === 'bar' ? { fill: 'rgba(17,24,39,0.06)' } : { stroke: 'rgba(17,24,39,0.30)' }}
                />

                {/* AREA MODE */}
                {view === 'area' && showNew && (
                  <Area
                    name="New"
                    type="monotone"
                    dataKey="newBL"
                    stroke={T.success}
                    strokeWidth={2}
                    fill="rgba(52,168,83,0.18)"
                    isAnimationActive
                    dot={{ r: 2 }}
                    activeDot={{ r: 4, className: 'cursor-pointer' }}
                  />
                )}
                {view === 'area' && showLost && (
                  <Area
                    name="Lost"
                    type="monotone"
                    dataKey="lostNeg" // negative for -Y
                    stroke={T.danger}
                    strokeWidth={2}
                    fill="rgba(233,65,52,0.18)"
                    isAnimationActive
                    dot={{ r: 2 }}
                    activeDot={{ r: 4, className: 'cursor-pointer' }}
                  />
                )}

                {/* BAR MODE */}
                {view === 'bar' && showNew && (
                  <Bar
                    name="New"
                    dataKey="newBL"
                    stackId="p"
                    fill={T.success}
                    radius={[6, 6, 0, 0]}
                    className="cursor-pointer"
                    onClick={(e) => handlePointClick(e, 'new')}
                  />
                )}
                {view === 'bar' && showLost && (
                  <Bar
                    name="Lost"
                    dataKey="lostNeg" // plot negative (below zero)
                    stackId="n"
                    fill={T.danger}
                    radius={[0, 0, 6, 6]} // bottom-most edge rounded since it’s top-most edge in -Y
                    className="cursor-pointer"
                    onClick={(e) => handlePointClick(e, 'lost')}
                  />
                )}

                {/* NET LINE — rendered on top in both modes */}
                {showNet && (
                  <Line
                    name="Net"
                    type="monotone"
                    dataKey="net"
                    stroke={T.neutral}
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, className: 'cursor-pointer' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer micro‑hint */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div style={{ color: T.muted }}>
            Interval: <span className="font-medium" style={{ color: T.text }}>{interval}</span> • Range:{' '}
            <span className="font-medium" style={{ color: T.text }}>{range.toUpperCase()}</span>
          </div>
          <div style={{ color: T.muted }}>
            New: <span style={{ color: T.success }}>●</span> Lost: <span style={{ color: T.danger }}>●</span> Net:{' '}
            <span style={{ color: T.neutral }}>— —</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Named export for convenience */
export { LinkVelocityNewLost };

