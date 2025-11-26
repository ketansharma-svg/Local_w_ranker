'use client';

import React, { useMemo, useRef, useState, useEffect, ReactElement } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Rectangle,
} from 'recharts';
import {
  BarChart3 as BarIcon,
  AreaChart as AreaIcon,
  LineChart as LineIcon,
  Download,
  Star,
  HelpCircle,
  MapPin,
  Video as VideoIcon,
  Newspaper,
  SquareStack,
} from 'lucide-react';

/**
 * Section 8 — SERP Feature Trend Over Time (drop‑in)
 *
 * ✔ Inter / Inter Fallback fonts
 * ✔ Branded (#008CCD) section icon
 * ✔ Relevant SERP icons (colored per feature)
 * ✔ Pointer cursors on interactive elements
 * ✔ Modular segmented toggles (View, Count vs %)
 * ✔ Colors from Wranker tokens (see FEATURE_COLORS)
 * ✔ Stacked BAR rule: only the TOP visible segment per stack has 6px rounded top
 *    (middle/bottom edges remain flat and the rule persists when legend items are toggled)
 */

/* -------------------- Tokens from Wranker (with safe fallbacks) -------------------- */
const TK = {
  brand: '#008CCD', // Brand / Logo Primary
  surface: 'var(--bg-panel, #FFFFFF)',
  bgSubtle: 'var(--bg-app, #F5F7FA)',
  textStrong: 'var(--text-strong, #111827)',
  textMuted: 'var(--text-muted, #6B7280)',
  border: 'var(--border, #E5E7EB)',
  borderLight: 'var(--border-subtle, #EFF0F6)',
  overlay: 'var(--overlay, rgba(17,24,39,0.96))',
  radius: 'var(--radius, 6px)',
  shadowSm: 'var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))',
};

/* -------------------- SERP Feature palette + labels + icons (from tokens) -------------------- */
const FEATURE_COLORS: Record<string, string> = {
  FS: '#34A853',        // Success Green
  PAA: '#4286F5',       // Core Blue (Charts)
  LOCAL: '#F9BB04',     // Warning Yellow
  VIDEO: '#6366F1',     // Indigo
  TOPSTORIES: '#E94134',// Critical Red
  KP: '#14B8A6',        // Teal / Aqua
};

const FEATURE_LABELS: Record<string, string> = {
  FS: 'Featured Snippet',
  PAA: 'People Also Ask',
  LOCAL: 'Local Pack',
  VIDEO: 'Video Carousel',
  TOPSTORIES: 'Top Stories',
  KP: 'Knowledge Panel',
};

const FEATURE_ICONS: Record<
  keyof typeof FEATURE_LABELS,
  (props: { size?: number; color?: string }) => ReactElement
> = {
  FS: ({ size = 14, color = FEATURE_COLORS.FS }) => <Star size={size} color={color} />,
  PAA: ({ size = 14, color = FEATURE_COLORS.PAA }) => <HelpCircle size={size} color={color} />,
  LOCAL: ({ size = 14, color = FEATURE_COLORS.LOCAL }) => <MapPin size={size} color={color} />,
  VIDEO: ({ size = 14, color = FEATURE_COLORS.VIDEO }) => <VideoIcon size={size} color={color} />,
  TOPSTORIES: ({ size = 14, color = FEATURE_COLORS.TOPSTORIES }) => <Newspaper size={size} color={color} />,
  KP: ({ size = 14, color = FEATURE_COLORS.KP }) => <SquareStack size={size} color={color} />,
};

/* Stacked order (bottom ➜ top) for bars; governs which segment gets rounded top */
const STACK_ORDER: Array<keyof typeof FEATURE_LABELS> = ['KP', 'TOPSTORIES', 'VIDEO', 'LOCAL', 'PAA', 'FS'];

/* -------------------- Demo data (replace with live API data) -------------------- */
function makeDates(days = 30) {
  const out: string[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }
  return out;
}

function makeSeries(days = 30) {
  const dates = makeDates(days);
  return dates.map((date, i) => {
    const base = 10 + Math.round(6 * Math.sin(i / 4));
    const noise = (n: number) => Math.max(0, Math.round(n + (Math.random() * 4 - 2)));
    return {
      date,
      FS: noise(base + 6),
      PAA: noise(base + 3),
      LOCAL: noise(base - 1),
      VIDEO: noise(base + (i % 7 === 0 ? 6 : 2)),
      TOPSTORIES: noise(Math.max(0, base - 3)),
      KP: noise(base + (i % 9 === 0 ? 4 : 1)),
    };
  });
}

/* -------------------- Utilities: export -------------------- */
function download(filename: string, href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportCSV(rows: any[], keys: string[], name = 'serp-feature-trend.csv') {
  const head = ['date', ...keys];
  const lines = rows.map((r) => head.map((k) => String(r[k] ?? '')).join(','));
  const csv = [head.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  download(name, url);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportChartPNG(container: HTMLDivElement | null, filename = 'serp-feature-trend.png') {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  const { width, height } = svg.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  const ctx = canvas.getContext('2d');
  await new Promise<void>((res) => {
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      res();
    };
    img.src = url;
  });
  download(filename, canvas.toDataURL('image/png'));
}

/* -------------------- UI atoms -------------------- */
function Segmented({
  value,
  items,
  onChange,
  aria,
}: {
  value: string;
  items: { label: React.ReactNode; value: string }[];
  onChange: (v: string) => void;
  aria?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={aria || 'segment'}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: 'pointer' }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`h-8 rounded-full px-3 text-sm transition ${
            value === it.value
              ? 'bg-[var(--brand-50,#D9EEF8)] font-medium text-[var(--brand,#008CCD)]'
              : 'hover:bg-gray-100 text-[var(--text-muted,#6B7280)]'
          }`}
          style={{ cursor: 'pointer' }}
          type="button"
          title={typeof it.label === 'string' ? it.label : undefined}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function FeaturePill({
  k,
  active,
  onClick,
}: {
  k: keyof typeof FEATURE_LABELS;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = FEATURE_ICONS[k];
  const color = FEATURE_COLORS[k];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
        active ? 'bg-white' : 'bg-gray-100 opacity-60'
      }`}
      style={{ borderColor: TK.border, color: TK.textStrong, cursor: 'pointer' }}
      aria-pressed={active}
      title={`${FEATURE_LABELS[k]} — toggle`}
      type="button"
    >
      <Icon size={14} color={color} />
      <span className="inline-block h-2 w-2 rounded" style={{ background: color }} />
      <span>{FEATURE_LABELS[k]}</span>
    </button>
  );
}

/* Rounded-top-only rectangle for bars */
function RoundedTopRect(props: any) {
  const { x, y, width, height, fill, radius = [6, 6, 0, 0] } = props;
  if (height <= 0 || width <= 0) return null;
  return <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={radius} />;
}

/* Tooltip (uses tokenized overlay bg) */
function TooltipBox({ active, label, payload, mode }: any) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload
    .filter((p: any) => p && p.value != null && !Number.isNaN(p.value))
    .map((p: any) => ({
      key: p.dataKey,
      label: FEATURE_LABELS[p.dataKey] ?? p.dataKey,
      value: p.value,
      color: p.color,
    }));
  return (
    <div
      className="rounded-md px-3 py-2 text-[12px]"
      style={{ background: TK.overlay, color: '#fff' }}
    >
      <div className="mb-1 text-[12px] font-semibold opacity-90">{label}</div>
      <div className="space-y-1">
        {rows.map((r: any) => (
          <div key={r.key} className="flex items-center gap-2">
            <span className="inline-block h-[10px] w-[10px] rounded-[2px]" style={{ background: r.color }} />
            <span className="opacity-90">{r.label}:</span>
            <b className="ml-1">
              {mode === 'percent' ? `${(r.value as number).toFixed(1)}%` : Math.round(r.value as number)}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- Main Component -------------------- */
export default function OVI_SerpFeatureTrend({
  days = 30,
  initialMode = 'line', // 'line' | 'area' | 'bar'
}: {
  days?: number;
  initialMode?: 'line' | 'area' | 'bar';
}) {
  const raw = useMemo(() => makeSeries(days), [days]);

  const [view, setView] = useState<'line' | 'area' | 'bar'>(initialMode);
  const [yMode, setYMode] = useState<'count' | 'percent'>('count');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    FS: true,
    PAA: true,
    LOCAL: true,
    VIDEO: true,
    TOPSTORIES: true,
    KP: true,
  });
  const [exportOpen, setExportOpen] = useState(false);

  const keys = useMemo(() => STACK_ORDER.filter((k) => enabled[k]), [enabled]);

  /* Normalize to % when requested, across VISIBLE keys only */
  const data = useMemo(() => {
    if (!raw?.length) return [];
    if (yMode === 'count') return raw;
    return raw.map((d) => {
      const sum = keys.reduce((acc, k) => acc + (Number((d as any)[k]) || 0), 0) || 1;
      const row: any = { date: (d as any).date };
      for (const k of Object.keys(FEATURE_LABELS)) {
        row[k] = keys.includes(k as any) ? ((Number((d as any)[k]) || 0) / sum) * 100 : 0;
      }
      return row;
    });
  }, [raw, yMode, keys]);

  const yDomain = yMode === 'percent' ? [0, 100] : ['auto', 'auto'];
  const yTickFormatter = (v: number) => (yMode === 'percent' ? `${v}%` : `${v}`);

  /* ---------- Which key is truly at the top per x-index (for rounded bars) ---------- */
  const topKeyByIndex = useMemo(() => {
    return data.map((row: any) => {
      for (let i = STACK_ORDER.length - 1; i >= 0; i--) {
        const k = STACK_ORDER[i];
        if (enabled[k] && Number(row[k] ?? 0) > 0) return k;
      }
      return null as keyof typeof FEATURE_LABELS | null;
    });
  }, [data, enabled]);

  /* Ensure at least one series is visible */
  useEffect(() => {
    if (keys.length === 0) {
      setEnabled((prev) => ({ ...prev, FS: true }));
    }
  }, [keys.length]);

  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const exportPNG = async () => {
    await exportChartPNG(chartWrapRef.current);
    setExportOpen(false);
  };
  const exportCSVHandler = () => {
    exportCSV(data, Object.keys(FEATURE_LABELS));
    setExportOpen(false);
  };
  const resetChart = () => {
    setEnabled({ FS: true, PAA: true, LOCAL: true, VIDEO: true, TOPSTORIES: true, KP: true });
    setYMode('count');
    setView('line');
  };

  return (
    <section
      className="w-full rounded-xl border p-4 sm:p-5 mt-4"
      style={{
        borderColor: TK.borderLight,
        background: TK.surface,
        boxShadow: TK.shadowSm,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarIcon size={18} color={TK.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TK.textStrong }}>
            SERP Feature Trend Over Time
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View segmented */}
          <Segmented
            value={view}
            onChange={(v) => setView(v as any)}
            aria="View mode"
            items={[
              {
                value: 'line',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <LineIcon size={14} color={TK.brand} />
                    Line
                  </span>
                ),
              },
              {
                value: 'area',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <AreaIcon size={14} color={TK.brand} />
                    Stacked Area
                  </span>
                ),
              },
              {
                value: 'bar',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <BarIcon size={14} color={TK.brand} />
                    Bar
                  </span>
                ),
              },
            ]}
          />

          {/* Y axis segmented */}
          <Segmented
            value={yMode}
            onChange={(v) => setYMode(v as any)}
            aria="Scale mode"
            items={[
              { value: 'count', label: 'Count' },
              { value: 'percent', label: 'Percent' },
            ]}
          />

          {/* Actions */}
          <button
            onClick={resetChart}
            className="h-8 rounded-md border px-3 text-sm"
            style={{ borderColor: TK.border, color: TK.textStrong, cursor: 'pointer' }}
            title="Reset"
            type="button"
          >
            Reset
          </button>

          <div className="relative">
            <button
              onClick={() => setExportOpen((s) => !s)}
              className="h-8 rounded-md border px-3 text-sm"
              style={{ borderColor: TK.border, color: TK.textStrong, cursor: 'pointer' }}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              title="Export"
              type="button"
            >
              <Download size={14} color={TK.brand} />
            </button>
            {exportOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-2 min-w-[160px] overflow-hidden rounded-md border bg-white"
                style={{ borderColor: TK.border }}
              >
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ cursor: 'pointer' }}
                  onClick={exportPNG}
                >
                  PNG (Chart)
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  style={{ cursor: 'pointer' }}
                  onClick={exportCSVHandler}
                >
                  CSV (Series)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Divider */}
      <div className="my-3 border-t" style={{ borderColor: TK.borderLight }} />

      {/* Legend chips (icons colored by feature) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {STACK_ORDER.map((k) => (
          <FeaturePill
            key={k}
            k={k}
            active={!!enabled[k]}
            onClick={() => setEnabled((prev) => ({ ...prev, [k]: !prev[k] }))}
          />
        ))}
      </div>

      {/* Chart */}
      <div ref={chartWrapRef} className="w-full">
        <div
          className="min-h-[360px] rounded-lg border"
          style={{ borderColor: TK.borderLight, background: TK.bgSubtle }}
        >
          <ResponsiveContainer width="100%" height={360}>
            {view === 'line' ? (
              <LineChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: TK.textMuted }} tickMargin={8} />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 12, fill: TK.textMuted }}
                  tickFormatter={yTickFormatter}
                />
                <Tooltip content={<TooltipBox mode={yMode} />} />
                {STACK_ORDER.map((k) =>
                  enabled[k] ? (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={FEATURE_LABELS[k]}
                      stroke={FEATURE_COLORS[k]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      activeDot={{ r: 4 }}
                    />
                  ) : null
                )}
              </LineChart>
            ) : view === 'area' ? (
              <AreaChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: TK.textMuted }} tickMargin={8} />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 12, fill: TK.textMuted }}
                  tickFormatter={yTickFormatter}
                />
                <Tooltip content={<TooltipBox mode={yMode} />} />
                {STACK_ORDER.map((k) =>
                  enabled[k] ? (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={FEATURE_LABELS[k]}
                      stroke={FEATURE_COLORS[k]}
                      fill={FEATURE_COLORS[k]}
                      fillOpacity={0.25}
                      stackId="one"
                      isAnimationActive={false}
                    />
                  ) : null
                )}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: TK.textMuted }} tickMargin={8} />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 12, fill: TK.textMuted }}
                  tickFormatter={yTickFormatter}
                />
                <Tooltip content={<TooltipBox mode={yMode} />} />
                {/* Stacked bars: only TRUE top segment per x-index gets 6px rounded top */}
                {STACK_ORDER.map((k) =>
                  enabled[k] ? (
                    <Bar
                      key={k}
                      dataKey={k}
                      name={FEATURE_LABELS[k]}
                      stackId="one"
                      fill={FEATURE_COLORS[k]}
                      isAnimationActive={false}
                      shape={(props: any) => {
                        const isTop = topKeyByIndex[props.index] === k;
                        const radius = isTop ? [6, 6, 0, 0] : [0, 0, 0, 0];
                        return <RoundedTopRect {...props} radius={radius} fill={FEATURE_COLORS[k]} />;
                      }}
                    />
                  ) : null
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
