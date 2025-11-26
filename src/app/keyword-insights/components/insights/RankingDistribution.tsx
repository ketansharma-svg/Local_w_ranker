import React, { useMemo, useRef, useState } from "react";

/**
 * Section B — Ranking Distribution (with View toggle)
 * - View: Bars (default) | 100% (stacked)
 * - Bars view: equal blue bars, gridlines, real counts; labels show % (toggle)
 * - 100% view: same as earlier, colored segments + percent labels (toggle)
 * - Legend pills (mute/mute), Export CSV/SVG, Premium gating on click
 * - Compact mode: 21–50 + 51–100 → 21–100
 * - A11y: focusable segments/bars, Enter/Space activates; left/right nav
 */

/* ================= TOKENS (scoped) ================= */
const LocalTokens = () => (
  <style>{`
    :root{
      --wr-text:#111827; --wr-muted:#6B7280; --wr-border:#EFF0F6; --wr-bg:#FFFFFF;
      --wr-action:#0077FF; --wr-chip:#F5F7FA; --wr-chip-hover:#E5E7EB;
      --wr-radius:6px; --wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);

      /* Palette for stacked view (spec) */
      --rd-top3:#4286F5;    --rd-top3-p:#BDD6FF;    /* chart blue */
      --rd-top10:#F9BB04;   --rd-top10-p:#FCEBB8;
      --rd-top20:#34A853;   --rd-top20-p:#CBF8D7;
      --rd-21-50:#22B8CF;   --rd-21-50-p:#CFF3F9;
      --rd-51-100:#F97316;  --rd-51-100-p:#FFE4D3;
      --rd-not:#E94134;     --rd-not-p:#FBC4BF;
    }

    .wr-card{background:var(--wr-bg); border:1px solid var(--wr-border); border-radius:var(--wr-radius); box-shadow:var(--wr-shadow-sm)}
    .rd-wrap{padding:16px}
    .wr-card-hd{display:flex; align-items:center; justify-content:space-between; gap:12px}
    .wr-title{font:600 18px/1.35 Inter,system-ui; color:var(--wr-text)}
    .wr-actions{display:flex; gap:10px; flex-wrap:wrap; align-items:center}
    .wr-sub{font:500 12px/1.3 Inter; color:var(--wr-muted)}

    /* Segmented control (for View) */
    .wr-seg{display:inline-flex; border:1px solid var(--wr-border); background:var(--wr-chip); border-radius:999px; padding:2px}
    .wr-seg-btn{min-width:58px; height:26px; padding:0 10px; border-radius:999px; border:none; cursor:pointer; background:transparent; color:var(--wr-muted); font:700 12px/1 Inter;}
    .wr-seg-btn[aria-pressed="true"]{background:var(--wr-action); color:#fff}
    .wr-seg-btn:hover{background:var(--wr-chip-hover); color:var(--wr-text)}

    /* Switches */
    .wr-switch{display:inline-flex; align-items:center; gap:8px; font:700 12px/1 Inter; color:var(--wr-muted); user-select:none; cursor:pointer}
    .wr-switch input{position:absolute; opacity:0; pointer-events:none}
    .wr-sw-track{width:42px; height:24px; background:#E5E7EB; border-radius:999px; position:relative; transition:background .2s}
    .wr-sw-thumb{position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.15); transition:left .18s}
    .wr-switch[data-on="true"] .wr-sw-track{background:var(--wr-action)}
    .wr-switch[data-on="true"] .wr-sw-thumb{left:21px}

    /* Legend pills */
    .wr-leg{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid var(--wr-border); border-radius:999px; background:var(--wr-chip); color:var(--wr-text); font:700 12px/1 Inter; cursor:pointer; user-select:none}
    .wr-leg[aria-pressed="false"]{opacity:.55}
    .wr-leg .dot{width:10px; height:10px; border-radius:2px; display:inline-block}

    /* Buttons */
    .wr-btn{display:inline-flex; align-items:center; gap:.4rem; height:28px; padding:0 .6rem; border:1px solid var(--wr-border); border-radius:8px; background:#fff; cursor:pointer; font:600 12px/1 Inter; color:var(--wr-text)}
    .wr-btn:hover{background:var(--wr-chip-hover)}

    /* 100% stacked bar */
    .rd-bar-wrap{position:relative; width:100%; height:110px}
    .rd-bar{position:absolute; left:0; right:0; top:36px; height:36px; border-radius:6px; overflow:hidden; border:1px solid var(--wr-border);}
    .rd-seg{position:absolute; top:0; height:100%; cursor:pointer; outline:none;}
    .rd-label{font:700 12px/1 Inter; fill:#fff; text-shadow:0 1px 2px rgba(0,0,0,.25); user-select:none}

    /* Vertical bars */
    .vb-wrap{position:relative; width:100%; height:220px; margin-top:4px}
    .vb-xlab{font:600 11px/1 Inter; fill:var(--wr-muted)}
    .vb-ylab{font:600 10px/1 Inter; fill:var(--wr-muted)}
    .vb-bar{cursor:pointer; outline:none;}
    .vb-val{font:700 11px/1 Inter; fill:var(--wr-text)}

    /* Tooltip */
    .wr-tooltip{position:absolute; background:#111827; color:#fff; padding:6px 8px; font-size:12px; border-radius:6px; box-shadow:var(--wr-shadow-sm); pointer-events:none; white-space:nowrap}
    .wr-tooltip:after{content:""; position:absolute; left:50%; transform:translateX(-50%); bottom:-6px; border:6px solid transparent; border-top-color:#111827}
  `}</style>
);

/* ================= TYPES ================= */
export interface RankingDistribution {
  top3?: number;
  top4_10?: number;
  top11_20?: number;
  top21_50?: number;
  top51_100?: number;
  notRanked?: number;
  total?: number;
}
type RankingDistributionDemoProps = {
  dataFromOverview?: any;
};

function mapOverviewToRDist(raw: any): RankingDistribution {
  const rows = raw?.data?.ranking_distribution ?? [];
  const by = Object.fromEntries(rows.map((r: any) => [r.range, r]));
  return {
    top3: by["Top 3"]?.count ?? 0,
    top4_10: by["4-10"]?.count ?? 0,
    top11_20: by["11-20"]?.count ?? 0,
    top21_50: by["21-50"]?.count ?? 0,
    top51_100: by["51-100"]?.count ?? 0,
    notRanked: by["Not Ranked"]?.count ?? 0,
  };
}

type Device = 'desktop' | 'mobile';
interface Scope { device: Device; locationISO: string; tw: '7d' | '14d' | '30d' | '90d' | { start: string; end: string }; }

interface Props {
  scope: Scope;
  data?: RankingDistribution;
  compact?: boolean;
  isPremium?: boolean;
  loading?: boolean;
  onDeepLink?: (dest: { type: 'rank-tracker'; rank: '1-3' | '4-10' | '11-20' | '21-50' | '51-100' | '21-100' | '>100'; device: Device; loc: string; tw: string }) => void;
  track?: (e: string, p?: Record<string, any>) => void;
}

/* ================= HELPERS ================= */
const fmtInt = (n: number) => new Intl.NumberFormat().format(n);
const pct = (n: number, d: number) => d > 0 ? (n / d) * 100 : 0;
const round0 = (n: number) => Math.round(n);
const twStr = (tw: Scope['tw']) => typeof tw === 'string' ? tw : `${tw.start}..${tw.end}`;

/* Small primitives */
function Segmented({ value, onChange }: { value: 'bars' | 'stacked'; onChange: (v: 'bars' | 'stacked') => void }) {
  return (
    <div className="wr-seg" role="tablist" aria-label="View">
      {(['bars', 'stacked'] as const).map(id => (
        <button key={id}
          className="wr-seg-btn"
          aria-pressed={String(value === id) as any}
          onClick={() => onChange(id)}
          role="tab"
        >{id === 'bars' ? 'Bars' : '100%'}</button>
      ))}
    </div>
  );
}
function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="wr-switch" data-on={checked}>
      <span>{label}</span>
      <span className="wr-sw-track"><span className="wr-sw-thumb" /></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
function LegendPill({ color, label, active, onToggle }: { color: string; label: string; active: boolean; onToggle: () => void }) {
  return (
    <button className="wr-leg" aria-pressed={active} onClick={onToggle}>
      <span className="dot" style={{ background: color }} />
      {label}
    </button>
  );
}



/* ================= MAIN CARD ================= */
export const RankingDistributionCard: React.FC<Props> = ({
  scope,
  data,
  compact = false,
  isPremium = true,
  loading = false,
  onDeepLink,
  track,
}) => {
  const d:any = data ;
  const total = d.total ?? (['top3', 'top4_10', 'top11_20', 'top21_50', 'top51_100', 'notRanked'] as const)
    .reduce((s, k) => s + (Number.isFinite((d as any)[k]) ? (d as any)[k] : 0), 0);

  type Range = '1-3' | '4-10' | '11-20' | '21-50' | '51-100' | '21-100' | '>100';
  type Key = 'top3' | 'top4_10' | 'top11_20' | 'top21_50' | 'top51_100' | 'notRanked' | 'top21_100';

  const buckets = useMemo(() => {
    const base = [
      { key: 'top3' as Key, label: 'Top 3', count: d.top3 ?? 0, color: 'var(--rd-top3)', pastel: 'var(--rd-top3-p)', range: '1-3' as Range },
      { key: 'top4_10' as Key, label: 'Top 10', count: d.top4_10 ?? 0, color: 'var(--rd-top10)', pastel: 'var(--rd-top10-p)', range: '4-10' },
      { key: 'top11_20' as Key, label: 'Top 20', count: d.top11_20 ?? 0, color: 'var(--rd-top20)', pastel: 'var(--rd-top20-p)', range: '11-20' },
      { key: 'top21_50' as Key, label: '21–50', count: d.top21_50 ?? 0, color: 'var(--rd-21-50)', pastel: 'var(--rd-21-50-p)', range: '21-50' },
      { key: 'top51_100' as Key, label: '51–100', count: d.top51_100 ?? 0, color: 'var(--rd-51-100)', pastel: 'var(--rd-51-100-p)', range: '51-100' },
      { key: 'notRanked' as Key, label: 'Not Ranked', count: d.notRanked ?? 0, color: 'var(--rd-not)', pastel: 'var(--rd-not-p)', range: '>100' },
    ];
    if (!compact) return base;
    const merged = base.filter(b => b.key !== 'top21_50' && b.key !== 'top51_100');
    const mergedCount = (d.top21_50 ?? 0) + (d.top51_100 ?? 0);
    merged.splice(3, 0, { key: 'top21_100' as Key, label: '21–100', count: mergedCount, color: 'var(--rd-51-100)', pastel: 'var(--rd-51-100-p)', range: '21-100' });
    return merged;
  }, [d.top3, d.top4_10, d.top11_20, d.top21_50, d.top51_100, d.notRanked, compact]);

  const [view, setView] = useState<'bars' | 'stacked'>('bars'); // default → Bars
  const [showLegend, setShowLegend] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [muted, setMuted] = useState<Record<Key, boolean>>({} as any);

  const [hover, setHover] = useState<{ x: number; y: number; txt: string } | null>(null);
  const svgStackRef = useRef<SVGSVGElement | null>(null);
  const svgBarsRef = useRef<SVGSVGElement | null>(null);

  const toggleMute = (k: Key) => setMuted(m => ({ ...m, [k]: !m[k] }));
  const empty = total <= 0;

  const handleDrill = (range: Range, key: Key) => {
    track?.('overview_rdist_click', { segment: key, range, tw: twStr(scope.tw), device: scope.device, loc: scope.locationISO });
    if (!isPremium) return alert('Filter by Rank Range is a premium feature.');
    onDeepLink?.({ type: 'rank-tracker', rank: range, device: scope.device, loc: scope.locationISO, tw: twStr(scope.tw) });
  };

  const exportCSV = () => {
    const rows = [['Bucket', 'Count', 'Percent']];
    buckets.forEach(b => rows.push([b.label, String(b.count), `${round0(pct(b.count, total))}%`]));
    rows.push(['Total', String(total), '100%']);
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'ranking-distribution.csv'; a.click(); URL.revokeObjectURL(url);
    track?.('overview_rdist_export', { fmt: 'csv', view });
  };
  const exportSVG = () => {
    const node = view === 'stacked' ? svgStackRef.current : svgBarsRef.current;
    if (!node) return;
    const src = new XMLSerializer().serializeToString(node);
    const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `ranking-distribution-${view}.svg`; a.click(); URL.revokeObjectURL(url);
    track?.('overview_rdist_export', { fmt: 'svg', view });
  };

  /* ---------- Stack layout ---------- */
  const W = 860, H = 110, BAR_Y = 36, BAR_H = 36, LABEL_MIN = 10;
  const stackLayout = useMemo(() => {
    let x = 0;
    return buckets.map(b => {
      const w = Math.max(0, pct(b.count, total));
      const seg = { x, w, b }; x += w; return seg;
    });
  }, [buckets, total]);

  /* ---------- Bars layout ---------- */
  const BW = 860, BH = 220, padX = 40, padY = 18;
  const barMax = Math.max(1, ...buckets.map(b => b.count));
  const barWidth = (BW - padX * 2) / buckets.length * 0.58;
  const gap = (BW - padX * 2) / buckets.length - barWidth;
  const xBar = (i: number) => padX + i * (barWidth + gap);

  return (
    <div className="wr-card w-full">
      <LocalTokens />
      <div className="rd-wrap">
        {/* Header */}
        <div className="wr-card-hd">
          <div className="wr-title">Ranking Distribution</div>
          <div className="wr-actions">
            <Segmented value={view} onChange={setView} />
            <Switch label="Legend" checked={showLegend} onChange={setShowLegend} />
            <Switch label="Show labels" checked={showLabels} onChange={setShowLabels} />
            <button className="wr-btn" onClick={exportCSV}>Export CSV</button>
            <button className="wr-btn" onClick={exportSVG}>Export SVG</button>
          </div>
        </div>

        {/* ==== VIEW: BARS (default) ==== */}
        {view === 'bars' && (
          <div className="vb-wrap" role="img" aria-label="Ranking distribution — vertical bars">
            {loading ? (
              <div style={{ height: BH, border: '1px solid var(--wr-border)', borderRadius: 6, background: 'linear-gradient(90deg,#f5f7fa,#eef2f7,#f5f7fa)', animation: 'rdShimmer 1.2s infinite' }} />
            ) : empty ? (
              <div style={{ height: BH, border: '1px solid var(--wr-border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="wr-sub">No data yet — Add keywords</span>
              </div>
            ) : (
              <>
                <svg ref={svgBarsRef} width="100%" height={BH} viewBox={`0 0 ${BW} ${BH}`}
                  onMouseLeave={() => setHover(null)}>
                  {/* grid lines */}
                  {[0.25, 0.5, 0.75].map((t, i) => {
                    const y = padY + (1 - t) * (BH - padY * 2);
                    return <line key={i} x1={padX} x2={BW - padX} y1={y} y2={y} stroke="var(--wr-border)" />;
                  })}
                  {/* y-axis labels (0%, 50%, 100% of max count) */}
                  {[0, 0.5, 1].map((t, i) => {
                    const y = padY + (1 - t) * (BH - padY * 2);
                    const val = Math.round(barMax * t);
                    return <text key={`ylab-${i}`} x={padX - 8} y={y + 4} textAnchor="end" className="vb-ylab">{fmtInt(val)}</text>;
                  })}

                  {buckets.map((b, i) => {
                    const h = (b.count / barMax) * (BH - padY * 2 - 18);
                    const x = xBar(i);
                    const y = (BH - padY) - h;
                    const labelPct = round0(pct(b.count, total));
                    const mutedOpacity = muted[b.key as Key] ? 0.35 : 1;
                    const tip = `${b.label}: ${fmtInt(b.count)} (${labelPct}%)`;

                    return (
                      <g key={b.key}
                        className="vb-bar"
                        role="button"
                        tabIndex={0}
                        aria-label={`${b.label}, ${fmtInt(b.count)} keywords, ${labelPct} percent. Press Enter to open Rank Tracker filtered to ${b.label}.`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDrill(b.range as any, b.key as Key); }
                          if (e.key === 'ArrowRight') (e.currentTarget.nextSibling as SVGGElement | null)?.focus();
                          if (e.key === 'ArrowLeft') (e.currentTarget.previousSibling as SVGGElement | null)?.focus();
                        }}
                        onClick={() => handleDrill(b.range as any, b.key as Key)}
                        onMouseMove={(e) => {
                          const rect = (e.currentTarget.ownerSVGElement as any).getBoundingClientRect();
                          setHover({ x: e.clientX - rect.left, y: y, txt: tip });
                        }}
                      >
                        {/* bar (blue) */}
<defs>
  <linearGradient id={`vbFill-${i}`} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#4286F5" stopOpacity="0.85" />
    <stop offset="100%" stopColor="#4286F5" stopOpacity="0.45" />
  </linearGradient>
</defs>
                        <rect x={x} y={y} width={barWidth} height={h} rx={4}
                          fill={b.color}
                          opacity={mutedOpacity}
                          stroke="var(--wr-border)" />
                        {/* percent label on/above bar */}
                        {showLabels && (
                          <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="vb-val">{labelPct}%</text>
                        )}
                        {/* x label */}
                        <text x={x + barWidth / 2} y={BH - 4} textAnchor="middle" className="vb-xlab">{b.label}</text>
                      </g>
                    );
                  })}
                </svg>

                {hover && (
                  <div className="wr-tooltip" style={{ left: Math.max(6, hover.x - 60), top: 10 }}>
                    {hover.txt}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==== VIEW: 100% STACKED ==== */}
        {view === 'stacked' && (
          <div className="rd-bar-wrap" role="img" aria-label="Ranking distribution — 100% stacked bar">
            {loading ? (
              <div className="rd-bar" style={{ background: 'linear-gradient(90deg,#f5f7fa,#eef2f7,#f5f7fa)', animation: 'rdShimmer 1.2s infinite' }} />
            ) : empty ? (
              <div className="rd-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="wr-sub">No data yet — Add keywords</span>
              </div>
            ) : (
              <>
                <svg
                  ref={svgStackRef}
                  width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
                  onMouseLeave={() => setHover(null)}
                >
                  <rect x={0} y={BAR_Y} width={W} height={BAR_H} rx={6} fill="#FFFFFF" stroke="var(--wr-border)" />
                  {stackLayout.map((s, idx) => {
                    const segX = (s.x / 100) * W;
                    const segW = (s.w / 100) * W;
                    const isWide = s.w >= LABEL_MIN;
                    const m = muted[s.b.key as Key];
                    const label = `${s.b.label}: ${fmtInt(s.b.count)} (${round0(s.w)}%)`;
                    return (
                      <g key={s.b.key}
                        role="button" tabIndex={0}
                        className="rd-seg"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDrill(s.b.range as any, s.b.key as Key); }
                          if (e.key === 'ArrowRight') (e.currentTarget.nextSibling as SVGGElement | null)?.focus();
                          if (e.key === 'ArrowLeft') (e.currentTarget.previousSibling as SVGGElement | null)?.focus();
                        }}
                        onClick={() => handleDrill(s.b.range as any, s.b.key as Key)}
                        onMouseMove={(e) => {
                          const r = (e.currentTarget.ownerSVGElement as any).getBoundingClientRect();
                          setHover({ x: e.clientX - r.left + segW / 2, y: BAR_Y, txt: label });
                        }}
                      >
                        <rect x={segX} y={BAR_Y} width={segW} height={BAR_H} rx={idx === 0 ? 6 : 0} ry={6}
                          fill={s.b.color} opacity={m ? 0.35 : 1} />
                        {(showLabels && isWide) && (
                          <text x={segX + segW / 2} y={BAR_Y + BAR_H / 2 + 4} textAnchor="middle" className="rd-label">
                            {`${round0(s.w)}%`}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
                {hover && (
                  <div className="wr-tooltip" style={{ left: Math.max(6, hover.x - 60), top: 12 }}>
                    {hover.txt}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Legend */}
        {(!loading && !empty && showLegend) && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }} aria-label="Legend">
            {buckets.map(b => (
              <LegendPill key={b.key} color={b.color} label={b.label}
                active={!muted[b.key as Key]} onToggle={() => toggleMute(b.key as Key)} />
            ))}
          </div>
        )}

        <div className="wr-sub" style={{ marginTop: 8 }}>Buckets based on today’s best rank.</div>
      </div>
    </div>
  );
};

/* skeleton keyframes (avoid duplicates) */
const _style = document.getElementById('rd-shimmer') ?? (() => {
  const el = document.createElement('style');
  el.id = 'rd-shimmer';
  el.textContent = `
  @keyframes rdShimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }`;
  if (typeof document !== 'undefined') document.head.appendChild(el);
  return el;
})();

/* ================= DEMO HARNESS (optional) ================= */
export default function RankingDistributionDemo({ dataFromOverview }: RankingDistributionDemoProps) {
  const [compact, setCompact] = useState(false);
  const [premium, setPremium] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<Scope>({ device: "desktop", locationISO: "US", tw: "30d" });

  const data = useMemo(() => dataFromOverview ? mapOverviewToRDist(dataFromOverview) : undefined, [dataFromOverview]);

  return (


    data &&     <RankingDistributionCard
      scope={scope}
      data={data}
      compact={compact}
      isPremium={premium}
      loading={loading}
      onDeepLink={(dest) => alert(`Open Rank Tracker → ${JSON.stringify(dest, null, 2)}`)}
      track={(e, p) => console.log("[track]", e, p)}
    />
  );
}


