'use client';

import * as React from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Download, Info, Lock, RefreshCw, Search, ZoomIn, ZoomOut, Plus, BarChart3,
} from 'lucide-react';

/* ───────────────────────── Tokens / Theme (Inter + Wranker) ───────────────────────── */
const TK = {
  border: 'var(--border,#E5E7EB)',
  borderLight: 'var(--border-subtle,#EFF0F6)',
  textStrong: 'var(--text-strong,#111827)',
  text: 'var(--text,#374151)',
  muted: 'var(--text-muted,#6B7280)',
  panel: 'var(--bg-panel,#FFFFFF)',
  brand: 'var(--brand,#008CCD)', // branded
  brand600: 'var(--brand-600,#007BB8)',
  tracked: '#10B981',
  newComp: '#F59E0B',
  appBg: 'var(--bg-app,#F5F7FA)',
  radius: '12px',
};

type DomainType = 'yours' | 'tracked' | 'new';
export type CompetitorPoint = {
  id: string;
  domain: string;
  type: DomainType;
  traffic: number;         // x
  visibility: number;      // y (0..100)
  keywords: number;        // bubble size
  sharedKeywords?: number;
  top3?: number;
  top10?: number;
  trafficValue?: number;   // $
  tracked?: boolean;
};

type Props = {
  isPro?: boolean;
  data?: CompetitorPoint[];
  maxBubblesDefault?: 10;
  onBubbleClick?: (row: CompetitorPoint) => void;
  onAddCompetitor?: (domain: string) => void;
  height?: number;
};

/* ───────────────────────── Demo generator (optional) ───────────────────────── */
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function makeDemo(n = 14): CompetitorPoint[] {
  const domains = [
    'yourdomain.com', 'ahrefs.com', 'semrush.com', 'moz.com',
    'ubersuggest.com', 'unknownseo.co', 'rankmath.com', 'surferseo.com',
    'seobility.net', 'screamingfrog.co.uk', 'nightwatch.io', 'contentkingapp.com',
    'spyfu.com', 'brightedge.com',
  ];
  return domains.slice(0, n).map((d, i) => {
    const type: DomainType = i === 0 ? 'yours' : (Math.random() > .55 ? 'tracked' : 'new');
    const traffic = i === 0 ? 61000 : rnd(8000, 120000);
    const visibility = i === 0 ? 72 : rnd(10, 90);
    const keywords = i === 0 ? 1320 : rnd(300, 3200);
    const shared = i === 0 ? undefined : rnd(180, Math.min(keywords, 2200));
    const top10 = Math.round(visibility / 100 * keywords);
    const top3 = Math.round(top10 * (0.38 + Math.random() * 0.2));
    return {
      id: d, domain: d, type, traffic, visibility, keywords,
      sharedKeywords: shared, top10, top3,
      trafficValue: rnd(40000, 240000),
      tracked: type !== 'new',
    };
  });
}

/* ───────────────────────── Helpers ───────────────────────── */
const COLORS: Record<DomainType, string> = { yours: TK.brand, tracked: TK.tracked, new: TK.newComp };
const typeLabel: Record<DomainType, string> = { yours: 'Your Domain', tracked: 'Tracked', new: 'New' };
const fmt = (n?: number | null) => (n == null ? '—' : Intl.NumberFormat().format(n!));
const fmtMoney = (n?: number | null) => (n == null ? '—' : `$${Intl.NumberFormat().format(n!)}`);

/* ───────────────────────── Component ───────────────────────── */
export default function CompetitorPositioningMap({
  isPro = true,
  data,
  maxBubblesDefault = 10,
  onBubbleClick,
  onAddCompetitor,
  height = 460,
}: Props) {
  const [query, setQuery] = React.useState('');
  const [logScale, setLogScale] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<Record<DomainType, boolean>>({ yours: true, tracked: true, new: true });
  const [limit, setLimit] = React.useState(maxBubblesDefault.toString());
  const [custom, setCustom] = React.useState('');
  const chartRef = React.useRef<ReactECharts>(null);

  const base = React.useMemo<CompetitorPoint[]>(
    () => (data?.length ? data : makeDemo(14)),
    [data],
  );

  const filtered = React.useMemo(() => {
    const matches = base
      .filter(r => typeFilter[r.type])
      .filter(r => (!query ? true : r.domain.toLowerCase().includes(query.toLowerCase())))
      .sort((a, b) => b.traffic - a.traffic);
    const n = Number(limit);
    return matches.slice(0, Number.isFinite(n) ? n : 10);
  }, [base, query, typeFilter, limit]);

  const [minK, maxK] = React.useMemo(() => {
    let mn = Number.POSITIVE_INFINITY, mx = 0;
    for (const r of filtered) { mn = Math.min(mn, r.keywords); mx = Math.max(mx, r.keywords); }
    if (!isFinite(mn) || !isFinite(mx) || mn === mx) return [1, Math.max(1, mn || 1)];
    return [mn, mx];
  }, [filtered]);

  const top3Ids = React.useMemo(() => filtered.slice(0, 3).map(r => r.id), [filtered]);

  // Inline branded bullet icon (SVG) for tooltip list items (no emoji)
  const itemIconSvg =
    `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style="flex:0 0 12px">
       <circle cx="12" cy="12" r="5" fill="${TK.brand}"/>
     </svg>`;

  const option = React.useMemo(() => {
    const seriesData = filtered.map(r => ({
      value: [r.traffic, r.visibility, r.keywords],
      name: r.domain,
      id: r.id,
      itemStyle: {
        color: COLORS[r.type],
        shadowColor: r.type !== 'yours' && r.tracked ? `${COLORS[r.type]}66` : undefined,
        shadowBlur: r.type !== 'yours' && r.tracked ? 12 : 0,
        borderColor: COLORS[r.type],
        borderWidth: r.type === 'yours' ? 2 : 1,
      },
      label: {
        show: top3Ids.includes(r.id),
        formatter: r.domain,
        color: '#111827',
        fontWeight: 600,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 4,
        padding: [2, 6],
      },
      emphasis: {
        label: { show: true },
        itemStyle: { shadowBlur: 18, shadowColor: `${COLORS[r.type]}88` },
      },
      _meta: r,
      symbolSize: (() => {
        if (maxK === minK) return 26;
        const t = (r.keywords - minK) / (maxK - minK);
        return 14 + t * 38; // 14..52px
      })(),
    }));

    return {
      animationDuration: 500,
      grid: { left: 48, right: 24, top: 26, bottom: 50 },
      xAxis: {
        name: 'Est. Organic Traffic',
        nameLocation: 'middle',
        nameGap: 32,
        type: (logScale ? 'log' : 'value') as any,
        axisLine: { lineStyle: { color: '#9CA3AF' } },
        axisLabel: { formatter: (v: number) => Intl.NumberFormat().format(v) },
        splitLine: { show: true, lineStyle: { type: 'dotted', color: '#E5E7EB' } },
      },
      yAxis: {
        name: 'Visibility Score (%)',
        nameLocation: 'middle',
        nameGap: 36,
        min: 0, max: 100,
        axisLine: { lineStyle: { color: '#9CA3AF' } },
        axisLabel: { formatter: (v: number) => `${v}%` },
        splitLine: { show: true, lineStyle: { type: 'dotted', color: '#E5E7EB' } },
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: '#fff',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#111827' },
        formatter: (params: any) => {
          const r: CompetitorPoint = params.data._meta;
          const favicon = `https://www.google.com/s2/favicons?domain=${r.domain}&sz=32`;
          const typeLabelPretty = r.type === 'yours' ? 'Your domain' : r.type === 'tracked' ? 'Tracked' : 'New';
          return `
            <div style="font-family:Inter,system-ui,Arial;font-size:12.5px;line-height:1.35;min-width:220px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <img src="${favicon}" alt="" width="16" height="16" style="border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,0.05)" />
                <div style="font-weight:600">${r.domain}</div>
              </div>
              <div style="display:grid;gap:4px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="display:inline-flex;align-items:center;gap:6px">${itemIconSvg}<span>Shared Keywords</span></span>
                  <b>${fmt(r.sharedKeywords)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="display:inline-flex;align-items:center;gap:6px">${itemIconSvg}<span>Visibility</span></span>
                  <b>${r.visibility}%</b>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;color:#6B7280;font-size:12px">
                  <span>Top 3 • Top 10</span>
                  <span><b>${fmt(r.top3)}</b> • <b>${fmt(r.top10)}</b></span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="display:inline-flex;align-items:center;gap:6px">${itemIconSvg}<span>Est. Traffic</span></span>
                  <b>${fmt(r.traffic)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="display:inline-flex;align-items:center;gap:6px">${itemIconSvg}<span>Traffic Value</span></span>
                  <b>${fmtMoney(r.trafficValue)}</b>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="display:inline-flex;align-items:center;gap:6px">${itemIconSvg}<span>Type</span></span>
                  <b>${typeLabelPretty}</b>
                </div>
              </div>
              <div style="margin-top:6px;color:#6B7280;font-size:11px">Click a bubble to open Keyword Gap.</div>
            </div>
          `;
        },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'inside', yAxisIndex: 0, filterMode: 'none' },
      ],
      series: [{ type: 'scatter', data: seriesData }],
    };
  }, [filtered, logScale, maxK, minK, top3Ids, itemIconSvg]);

  const handleResetZoom = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;
    chart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
    chart.dispatchAction({ type: 'dataZoom', yAxisIndex: 0, start: 0, end: 100 });
  };

  const handleClick = (e: any) => {
    const row: CompetitorPoint = e?.data?._meta;
    if (!row) return;
    onBubbleClick?.(row);
  };

  const exportPNG = () => {
    if (!isPro) { alert('Export chart (PNG) is a Pro feature'); return; }
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;
    const url = chart.getDataURL({ pixelRatio: 2, type: 'png', backgroundColor: '#fff' });
    const a = document.createElement('a');
    a.href = url; a.download = 'competitive-map.png'; a.click();
  };

  const exportCSV = () => {
    if (!isPro) { alert('Export data (CSV) is a Pro feature'); return; }
    const cols = ['domain', 'type', 'traffic', 'visibility', 'keywords', 'sharedKeywords', 'top3', 'top10', 'trafficValue'];
    const header = cols.join(',');
    const lines = filtered.map(r => [
      r.domain, r.type, r.traffic, r.visibility, r.keywords, r.sharedKeywords ?? '',
      r.top3 ?? '', r.top10 ?? '', r.trafficValue ?? '',
    ].map(String).map(v => JSON.stringify(v)).join(','));
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'competitive-map.csv'; a.click();
    URL.revokeObjectURL(a.href);
  };

  const addCompetitor = () => {
    if (!isPro) { alert('Add custom competitor is a Pro feature'); return; }
    if (!custom.trim()) return;
    onAddCompetitor?.(custom.trim());
    setCustom('');
  };

  return (
    <section
      className="w-full md:ml-auto mt-4"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      <Card className="border" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            {/* Title with branded icon */}
            <div className="flex items-center gap-2">
              <BarChart3 size={18} color={TK.brand as string} />
              <CardTitle className="text-lg" style={{ color: TK.textStrong }}>Competitive Positioning Map</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1 rounded p-1 text-gray-400 hover:bg-gray-50" style={{ cursor: 'pointer' }} title="About">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Bubble size = # of ranking keywords. Color = domain type.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Right controls */}
            <div className="flex flex-wrap items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-3 cursor-pointer" onClick={handleResetZoom}>
                      <RefreshCw className="h-4 w-4 mr-1" /> Reset Zoom
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset pan/zoom</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 cursor-pointer"
                  onClick={() => setLogScale(v => !v)}
                >
                  {logScale ? <ZoomOut className="h-4 w-4 mr-1" /> : <ZoomIn className="h-4 w-4 mr-1" />}
                  {logScale ? 'Linear' : 'Log (X)'}
                </Button>
              </div>

              {/* Export */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 cursor-pointer"
                  onClick={(e) => {
                    const menu = (e.currentTarget.nextSibling as HTMLElement) || null;
                    if (menu) menu.classList.toggle('hidden');
                  }}
                  title="Export"
                >
                  <Download className="h-4 w-4 mr-1" /> Export
                  {!isPro && <Lock className="ml-1 h-4 w-4 text-gray-400" />}
                </Button>
                <div
                  className="absolute right-0 z-40 mt-2 hidden min-w-[160px] overflow-hidden rounded-md border bg-white shadow-md"
                  style={{ borderColor: TK.border }}
                  role="menu"
                >
                  <button
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={(e) => { exportPNG(); (e.currentTarget.parentElement as HTMLElement).classList.add('hidden'); }}
                  >
                    PNG { !isPro && <Lock className="ml-1 inline h-3.5 w-3.5 text-gray-400" /> }
                  </button>
                  <button
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={(e) => { exportCSV(); (e.currentTarget.parentElement as HTMLElement).classList.add('hidden'); }}
                  >
                    CSV { !isPro && <Lock className="ml-1 inline h-3.5 w-3.5 text-gray-400" /> }
                  </button>
                  <button
                    className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
                    title="PDF (Pro)"
                    onClick={(e) => { (e.currentTarget.parentElement as HTMLElement).classList.add('hidden'); }}
                  >
                    PDF (Pro)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filters row (Legend button removed per brief) */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[280px] pl-7 h-8"
                placeholder="Search domain…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Type chips */}
            {(['yours', 'tracked', 'new'] as DomainType[]).map(t => {
              const on = typeFilter[t];
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(s => ({ ...s, [t]: !s[t] }))}
                  className="h-8 px-3 rounded-full border text-xs font-medium transition cursor-pointer"
                  style={{
                    borderColor: on ? TK.brand : TK.borderLight,
                    background: on ? 'rgba(0,140,205,0.08)' : '#FFF',
                    color: on ? COLORS[t] : TK.text,
                  }}
                  title={typeLabel[t]}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[t] }} />
                    {typeLabel[t]}
                  </span>
                </button>
              );
            })}

            {/* Top N */}
            <Select value={limit} onValueChange={(v) => setLimit(v)}>
              <SelectTrigger className="h-8 w-[140px] cursor-pointer">
                <SelectValue placeholder="Top N" />
              </SelectTrigger>
              <SelectContent>
                {['5', '10', '20', '50'].map(n => <SelectItem key={n} value={n}>Top {n}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Add custom competitor */}
            <div className="ml-auto flex items-center gap-2">
              <Input
                className="h-8 w-[220px]"
                placeholder="Add competitor (domain.com)"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                disabled={!isPro}
              />
              <Button
                size="sm"
                className="h-8 cursor-pointer"
                onClick={addCompetitor}
                disabled={!isPro}
                title={!isPro ? 'Pro feature' : 'Add domain'}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
                {!isPro && <Lock className="ml-1 h-3.5 w-3.5 text-gray-300" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Chart */}
          <div className="relative">
            <div className="absolute left-3 top-2 z-[2] inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Size = # Keywords • Color = Domain type</span>
            </div>
            <ReactECharts
              ref={chartRef}
              style={{ height }}
              option={option}
              notMerge
              onEvents={{ click: handleClick }}
            />
            {/* Bottom legend helper */}
            <div className="px-4 pb-3 -mt-1 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: TK.brand }} />
                Your domain
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: TK.tracked }} />
                Tracked
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: TK.newComp }} />
                New
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/* ───────────────────────── Optional Demo Wrapper ───────────────────────── */
export function Demo_CompetitorPositioningMap() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-2 text-[15px] font-semibold">Tab 6: Organic Competitors — Positioning Map</div>
      <CompetitorPositioningMap
        isPro
        onBubbleClick={(row) => alert(`Open Gap Analyzer for ${row.domain}`)}
      />
    </div>
  );
}
