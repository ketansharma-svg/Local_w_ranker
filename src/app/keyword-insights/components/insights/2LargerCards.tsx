import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * KeywordInsightSummaryLargeCards — Rank Tracker–aligned big cards
 * (with mini donut beside the Ranked Coverage value + delta)
 * - Section container with header + filters (segmented TW).
 * - Card 1: Ranked Coverage (Coverage/Smoothing switches). Mini donut sized to value+delta block.
 * - Card 2: Gainers vs Losers (Daily/Weekly segmented, Net line switch, bottom-centered legend).
 * - Real ISO dates on both charts; net/delta reflect selected TW.
 * - No external chart libs.
 */

/* ===================== DESIGN TOKENS ===================== */
const GlobalStyles = () => (
  <style>{`
    :root{
      --wr-brand:#008CCD;
      --wr-action:#0077FF;         /* value/links */
      --wr-action-pastel:#BDD6FF;
      --wr-text:#111827;
      --wr-muted:#6B7280;
      --wr-border:#EFF0F6;
      --wr-bg:#FFFFFF;
      --wr-chip:#F5F7FA;
      --wr-chip-hover:#E5E7EB;
      --wr-ok:#10B981;             /* success */
      --wr-warn:#F59E0B;
      --wr-danger:#E94134;         /* loss */
      --wr-radius:6px;
      --wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);
      --wr-shadow-md:0 4px 10px rgba(17,24,39,.08);
    }
    *{box-sizing:border-box}
    body{margin:0;font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial}

    /* Section container */
    .wr-sec{background:var(--wr-bg); border:1px solid var(--wr-border); border-radius:var(--wr-radius); box-shadow:var(--wr-shadow-sm)}
    .wr-sec-hd{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border-bottom:1px solid var(--wr-border)}
    .wr-sec-ttl{font:600 16px/1.35 Inter,system-ui; color:var(--wr-text)}
    .wr-sec-filters{display:flex; flex-wrap:wrap; gap:8px; align-items:center}

    /* Cards */
    .wr-card{position:relative; background:var(--wr-bg); border:1px solid var(--wr-border); border-radius:var(--wr-radius); box-shadow:var(--wr-shadow-sm)}
    .wr-card-hd{display:flex; align-items:flex-start; justify-content:space-between; gap:10px}
    .wr-card-ttl{font:600 14px/1.25 Inter; color:var(--wr-muted)}
    .wr-card-val{font:700 28px/1.1 Inter; color:var(--wr-action); margin-top:4px} /* blue value */
    .wr-delta{font:600 12px/1.2 Inter; margin-top:4px}
    .wr-delta.pos{color:var(--wr-ok)}
    .wr-delta.neg{color:var(--wr-danger)}
    .wr-delta.neu{color:var(--wr-muted)}
    .wr-card-sub{font:500 12px/1.3 Inter; color:var(--wr-muted); margin-top:4px}
    .wr-legend-btm{display:flex; justify-content:center; align-items:center; gap:12px; margin-top:10px}
    .wr-valbox{display:flex; gap:12px; align-items:flex-start} /* value+delta with donut on the right */

    /* Segmented control */
    .wr-seg{display:inline-flex; border:1px solid var(--wr-border); background:var(--wr-chip); border-radius:999px; padding:2px}
    .wr-seg-btn{min-width:46px; height:26px; padding:0 10px; border-radius:999px; border:none; cursor:pointer; background:transparent; color:var(--wr-muted); font:700 12px/1 Inter;}
    .wr-seg-btn[aria-pressed="true"]{background:var(--wr-action-pastel); color:var(--wr-text)}
    .wr-seg-btn:hover{background:var(--wr-chip-hover); color:var(--wr-text)}

    /* Switch */
    .wr-switch{display:inline-flex; align-items:center; gap:8px; font:700 12px/1 Inter; color:var(--wr-muted); user-select:none; cursor:pointer}
    .wr-switch input{position:absolute; opacity:0; pointer-events:none}
    .wr-sw-track{width:42px; height:24px; background:#E5E7EB; border-radius:999px; position:relative; transition:background .2s}
    .wr-sw-thumb{position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.15); transition:left .18s}
    .wr-switch[data-on="true"] .wr-sw-track{background:var(--wr-action)}
    .wr-switch[data-on="true"] .wr-sw-thumb{left:21px}

    /* Legend */
    .wr-leg{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid var(--wr-border); border-radius:999px; background:var(--wr-chip); color:var(--wr-text); font:700 12px/1 Inter; cursor:pointer; user-select:none}
    .wr-leg[aria-pressed="false"]{opacity:.55}
    .wr-leg .dot{width:10px; height:10px; border-radius:2px; display:inline-block}

    /* Buttons */
    .wr-btn{display:inline-flex; align-items:center; gap:.5rem; height:36px; padding:0 .75rem; border:1px solid var(--wr-border); border-radius:8px; background:#fff; cursor:pointer}
    .wr-btn:hover{background:var(--wr-chip-hover)}
    .wr-btn.primary{background:var(--wr-action); color:#fff; border-color:var(--wr-action)}
    .wr-cta-br{position:absolute; right:16px; bottom:14px}

    /* Charts */
    .wr-chart{position:relative; width:100%; height:240px}
    .wr-grid line{stroke:var(--wr-border)}
    .wr-tooltip{position:absolute; background:#111827; color:#fff; padding:6px 8px; font-size:12px; border-radius:6px; box-shadow:var(--wr-shadow-sm); pointer-events:none; white-space:nowrap}
    .wr-tooltip:after{content:""; position:absolute; left:10px; bottom:-6px; border:6px solid transparent; border-top-color:#111827}
  `}</style>
);

/* ===================== TYPES ===================== */
type TW = '7d'|'14d'|'30d'|'90d';
/** @typedef {{ device:'desktop'|'mobile', locationISO:string, tw:TW|{start:string,end:string} }} Scope */


type DemoCanvasProps = { data?: any };

function mapOverviewToLargeCards(raw:any){
  const vis = raw?.data?.overview_kpis?.visibility_top_20 ?? {};
  const dates  = (vis.sparkline_data ?? []).map((d:any)=> d.date);
  const values = (vis.sparkline_data ?? []).map((d:any)=> Number(d.value ?? 0));

  const gl = raw?.data?.gains_losses_chart ?? {};
  const gainsHistory = (gl.dates ?? []).map((date:string, i:number)=> ({
    date,
    gained: gl.gained_keywords?.[i] ?? 0,
    lost:   gl.lost_keywords?.[i] ?? 0,
  }));

  return {
    totals: {
      tracked: raw?.metadata?.total_keyword_relationships ?? 0,
      ranked: undefined,
      top3: 0,
      top10: raw?.data?.overview_kpis?.top_10_keywords?.count ?? 0,
      top50: 0,
    },
    coverageHistory: values,
    coverageDates: dates,
    gainsHistory,

    visibilityPct: typeof vis.percentage === 'number' ? vis.percentage : null,
    visibilityDisplay: vis.display_value ?? null,   // e.g. "33.33%"
    visibilityChange: vis.change ?? null,           // e.g. "-33.33%"
  };
}

const parseChange = (s:any) => {
  if (s == null) return null;
  const n = Number(String(s).replace('%',''));
  return Number.isFinite(n) ? n : null;
};


const pad2 = (n:number)=> (n<10?`0${n}`:`${n}`);
const toISO = (d:Date)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const fmtShort = (iso:string)=> new Date(iso+'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'2-digit' });
const lastNDates = (n:number)=>{ const out:string[]=[]; const t=new Date(); for(let i=n-1;i>=0;i--){const d=new Date(t);d.setDate(t.getDate()-i);out.push(toISO(d));} return out; };


/* ===================== UTILITIES ===================== */
const areaPath = (vals:number[], w=540, h=220, pad=10) => {
  if(!vals?.length) return '';
  const min = Math.min(...vals), max = Math.max(...vals);
  const x = (i:number)=> pad + (i*(w-2*pad))/Math.max(1,(vals.length-1));
  const y = (v:number)=> h - pad - ((v-min)/(max-min || 1))*(h-2*pad);
  let d = `M ${x(0)} ${y(vals[0])}`;
  for(let i=1;i<vals.length;i++) d += ` L ${x(i)} ${y(vals[i])}`;
  d += ` L ${x(vals.length-1)} ${h-pad} L ${x(0)} ${h-pad} Z`;
  return d;
};
const movingAvg = (a:number[], w=5) => {
  if (w<=1) return a.slice();
  const out:number[]=[]; const n=a.length; const r=(w-1)/2;
  for(let i=0;i<n;i++){ let s=0,c=0; for(let k=-r;k<=r;k++){ const j=i+k; if(j>=0&&j<n){ s+=a[j]; c++; } } out.push(s/Math.max(1,c)); }
  return out;
};
const sum=(xs:number[])=> xs.reduce((a,b)=>a+b,0);

/* ===================== PRIMITIVES ===================== */
function Segmented({ options, value, onChange }:{
  options:{id:string;label:string}[], value:string, onChange:(id:string)=>void
}){
  return (
    <div className="wr-seg" role="tablist" aria-label="Time window">
      {options.map(opt=>(
        <button key={opt.id}
          className="wr-seg-btn"
          aria-pressed={String(value===opt.id) as any}
          onClick={()=>onChange(opt.id)}
          role="tab"
        >{opt.label}</button>
      ))}
    </div>
  );
}
function Switch({ label, checked, onChange, id }:{
  label:string; checked:boolean; onChange:(v:boolean)=>void; id?:string
}){
  return (
    <label className="wr-switch" data-on={checked} htmlFor={id || undefined}>
      <span>{label}</span>
      <span className="wr-sw-track"><span className="wr-sw-thumb"/></span>
      <input id={id} type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} />
    </label>
  );
}
function LegendPill({ color, label, active, onChange }:{
  color:string; label:string; active:boolean; onChange:(v:boolean)=>void
}){
  return (
    <button className="wr-leg" aria-pressed={active} onClick={()=>onChange(!active)}>
      <span className="dot" style={{ background: color }}/>
      {label}
    </button>
  );
}

/* ===================== CHARTS ===================== */
function CoverageArea({
  dates, values, smooth=false, active=true, w=720, h=220
}:{ dates:string[]; values:number[]; smooth?:boolean; active?:boolean; w?:number; h?:number }){
  const ref = useRef<SVGSVGElement|null>(null);
  const [hover, setHover] = useState<{i:number,x:number,y:number,val:number}|null>(null);
  const pad = 12;
  const series = smooth ? movingAvg(values, 5) : values;
  const min = Math.min(...series), max = Math.max(...series);
  const x = (i:number)=> pad + (i*(w-2*pad))/Math.max(1,(series.length-1));
  const y = (v:number)=> h - pad - ((v-min)/(max-min || 1))*(h-2*pad);
  const gridY = Array.from({length:4}).map((_,i)=> pad + (i/3)*(h-2*pad));

  const onMove = (e:React.MouseEvent<SVGSVGElement>)=>{
    if(!ref.current) return;
    const r=ref.current.getBoundingClientRect();
    const relX=Math.max(pad, Math.min(w-pad, e.clientX - r.left));
    const idx = Math.round(((relX-pad)/(w-2*pad))*((series.length-1)||0));
    const val = series[idx] ?? 0;
    setHover({ i:idx, x:x(idx), y:y(val), val });
  };

  const area = active ? areaPath(series, w, h, pad) : '';

  return (
    <div className="wr-chart">
      <svg ref={ref} width="100%" height={h} viewBox={`0 0 ${w} ${h}`}
           onMouseMove={onMove} onMouseLeave={()=>setHover(null)} aria-label="Coverage area chart">
        <g className="wr-grid">
          {gridY.map((gy,i)=>(<line key={i} x1={pad} x2={w-pad} y1={gy} y2={gy}/>))}
        </g>
        <rect x="0" y="0" width={w} height={h} fill="#fff"/>
        {active && (
          <>
            <defs>
              <linearGradient id="covFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0077FF" stopOpacity="0.35"/>
                <stop offset="100%" stopColor="#0077FF" stopOpacity="0.05"/>
              </linearGradient>
            </defs>
            <path d={area} fill="url(#covFill)" stroke="#0077FF" strokeWidth={2}/>
          </>
        )}
        {hover && active && (
          <>
            <line x1={hover.x} x2={hover.x} y1={pad} y2={h-pad} stroke="#EFF0F6"/>
            <circle cx={hover.x} cy={hover.y} r="4" fill="#0077FF" stroke="#fff" strokeWidth="2"/>
          </>
        )}
        {dates.map((iso, i, arr) => {
          const step = Math.max(1, Math.floor(arr.length/6));
          const show = i % step === 0 || i === arr.length - 1;
          if(!show) return null;
          return (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={h-20} y2={h-16} stroke="#E5E7EB"/>
              <text x={x(i)} y={h-4} textAnchor="middle" fontSize="10" fill="#6B7280">{fmtShort(iso)}</text>
            </g>
          );
        })}
      </svg>
      {hover && active && (
        <div className="wr-tooltip" style={{ left: Math.max(4, hover.x-56), top: Math.max(6, hover.y-44) }}>
          <div style={{fontWeight:600, marginBottom:2}}>{fmtShort(dates[hover.i] || '')}</div>
          Coverage: <b>{Math.round(hover.val)}%</b>
        </div>
      )}
    </div>
  );
}
function GainsLossesBars({
  data, w=720, h=220, showGained=true, showLost=true, showNet=false
}:{ data:{date:string; gained:number; lost:number}[]; w?:number; h?:number; showGained?:boolean; showLost?:boolean; showNet?:boolean }){
  const pad = 12;
  const ref = useRef<SVGSVGElement|null>(null);
  const [hover, setHover] = useState<{i:number,x:number}|null>(null);

  const maxCell = Math.max(1, ...data.map(d=>Math.max(d.gained, d.lost)));
  const barW = (w - pad*2) / Math.max(1, data.length);
  const xFromI = (i:number)=> pad + i*barW;

  const netPts = data.map((d,i)=> {
    const up = d.gained/maxCell * (h/2 - 18);
    const dn = d.lost/maxCell   * (h/2 - 18);
    const y = (h/2) - (up - dn);
    return { x:xFromI(i)+barW/2, y };
  });
  const netPath = netPts.map((p,i)=> `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="wr-chart">
      <svg ref={ref} width="100%" height={h} viewBox={`0 0 ${w} ${h}`}
           onMouseMove={(e)=>{
             const r=ref.current!.getBoundingClientRect();
             const rel = e.clientX - r.left;
             const idx = Math.max(0, Math.min(data.length-1, Math.floor((rel - pad)/barW)));
             setHover({ i:idx, x:xFromI(idx)+barW/2 });
           }}
           onMouseLeave={()=>setHover(null)}
           aria-label="Gainers vs Losers chart">
        <rect x="0" y="0" width={w} height={h} fill="#fff"/>
        <g className="wr-grid"><line x1={pad} x2={w-pad} y1={h/2} y2={h/2}/></g>

        {data.map((d,i)=>{
          const x = xFromI(i);
          const gH = (d.gained/maxCell) * (h/2 - 18);
          const lH = (d.lost/maxCell)   * (h/2 - 18);
          const upX = x + 4;
          const dnX = x + barW/2;
          const width = Math.max(4, barW/3);
          return (
            <g key={i}>
              {showGained && <rect x={upX} y={h/2 - gH} width={width} height={gH} fill="var(--wr-ok)" rx="3" />}
              {showLost   && <rect x={dnX} y={h/2}       width={width} height={lH} fill="var(--wr-danger)" rx="3" />}
              <text x={x+barW/2} y={h-4} textAnchor="middle" fontSize="10" fill="#6B7280">{fmtShort(d.date)}</text>
            </g>
          );
        })}

        {showNet && <path d={netPath} fill="none" stroke="#111827" strokeOpacity=".5" strokeWidth="1.75"/>}
        {hover && <line x1={hover.x} x2={hover.x} y1={pad} y2={h-pad} stroke="#E5E7EB"/>}
      </svg>
      {hover && (
        <div className="wr-tooltip" style={{ left: Math.max(4, hover.x-64), top: 12 }}>
          <div style={{fontWeight:600, marginBottom:2}}>{fmtShort(data[hover.i]?.date || '')}</div>
          {showGained && <>Gained: <b>{data[hover.i]?.gained ?? 0}</b><br/></>}
          {showLost   && <>Lost: <b>{data[hover.i]?.lost ?? 0}</b></>}
        </div>
      )}
    </div>
  );
}

/* ===================== MINI DONUT ===================== */
function MiniDonut({ value=0, size=48, thickness=8 }:{
  value?:number; size?:number; thickness?:number
}){
  const r = (size - thickness)/2, c = 2*Math.PI*r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c * (1 - clamped/100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Coverage gauge">
      <g transform={`translate(${size/2}, ${size/2})`}>
        <circle r={r} fill="none" stroke="#F3F4F6" strokeWidth={thickness} />
        <circle r={r} fill="none" stroke="var(--wr-action)" strokeWidth={thickness}
                strokeDasharray={`${c} ${c}`} strokeDashoffset={offset}
                strokeLinecap="round" transform="rotate(-90)"/>
      </g>
    </svg>
  );
}

/* ===================== MAIN ===================== */
export function KeywordInsightSummaryLargeCards({
  scope,
  api,
  onDeepLink,
  track,
}:{ scope:any; api?:{ getOverview:(scope:any)=>Promise<any> }; onDeepLink?:(dest:any)=>void; track?:(e:string,p?:any)=>void }){
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [tw, setTw] = useState<TW>(typeof scope.tw==='string' && ['7d','14d','30d','90d'].includes(scope.tw) ? scope.tw as TW : '30d');

  /* Card 1 toggles */
  const [showCoverage, setShowCoverage] = useState(true);
  const [smooth, setSmooth] = useState(false);

  /* Card 2 toggles */
  const [interval, setInterval] = useState<'daily'|'weekly'>('daily');
  const [showNet, setShowNet] = useState(true);
  const [showGained, setShowGained] = useState(true);
  const [showLost, setShowLost] = useState(true);

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      setLoading(true); setErr("");
      try{
        const res = api?.getOverview && await api.getOverview(scope);
        const norm = { ...res };
if (!Array.isArray(norm.coverageDates)) {
  norm.coverageDates = [];
}
if (!Array.isArray(norm.gainsHistory)) {
  norm.gainsHistory = [];
}

        if (mounted) setData(norm);
      }catch{
        if (mounted) setErr("Failed to load overview");
      }finally{
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted=false; };
  }, [JSON.stringify(scope)]);

  /* Coverage metrics */
const coveragePct = useMemo(()=>{
  const v = data?.visibilityPct;
  return typeof v === 'number' ? Math.round(v) : 0;
}, [data]);


  const takeByTw = (tw:TW) => tw==='7d'?7:tw==='14d'?14:tw==='30d'?30:90;

const covSlice = useMemo(() => {
  if (!data) return { vals: [], dates: [] };
  const vals: number[] = data.coverageHistory || [];
  const dates: string[] = data.coverageDates || [];
  return { vals, dates }; // use full range from API (RangePicker)
}, [data]);


const coverageDeltaPct = useMemo(()=>{
  const ch = parseChange(data?.visibilityChange);
  return ch == null ? 0 : Math.round(ch);
}, [data]);


  const deltaClass = coverageDeltaPct>0 ? 'pos' : coverageDeltaPct<0 ? 'neg' : 'neu';
  const deltaSymbol = coverageDeltaPct>0 ? '▲' : coverageDeltaPct<0 ? '▼' : '—';

  /* Gains/Losses metrics, aligned to TW */
const gainsSlice = useMemo(() => {
  if (!data) return [];
  const base = data.gainsHistory || [];
  if (interval === "daily") return base;

  const out: any[] = [];
  for (let i = 0; i < base.length; i += 7) {
    const seg = base.slice(i, i + 7);
    out.push({
      date: seg[seg.length - 1]?.date || base[i]?.date,
      gained: sum(seg.map((s: any) => s.gained)),
      lost: sum(seg.map((s: any) => s.lost)),
    });
  }
  return out;
}, [data, interval]);

const netInScope = useMemo(() => {
  const arr = data?.gainsHistory || [];
  return sum(arr.map((x: { gained: number; lost: number }) => x.gained - x.lost));
}, [data]);


  /* Donut size = height of value + delta block */
  const valBoxRef = useRef<HTMLDivElement|null>(null);
  const [donutSize, setDonutSize] = useState(48);
  useEffect(()=>{
    const r = valBoxRef.current?.getBoundingClientRect();
    if (r && r.height) setDonutSize(Math.max(40, Math.min(72, Math.round(r.height))));
  }, [coveragePct, coverageDeltaPct, tw]);

  const deepLinkRanked = () => {
    onDeepLink?.({ type:'rank-tracker', rank:'1-100', tw, device:scope.device, loc:scope.locationISO });
    track?.('deeplink_rank_tracker', { rank:'1-100', tw });
  };

  return (
    <section className="wr-sec">
      <GlobalStyles/>

<header className="wr-sec-hd">
  <div className="wr-sec-ttl">Keyword Insights — Summary</div>
  <div className="wr-sec-filters">
    <span className="wr-leg" aria-pressed="true" style={{ cursor: "default" }}>
      <span className="dot" style={{ background: "#E5E7EB" }} />
      {scope.device.toUpperCase()} · {scope.locationISO}
    </span>
  </div>
</header>



      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
        {/* CARD 1: Ranked Coverage */}
        <div className="wr-card p-4">
          <div className="wr-card-hd">
            {/* left group: value/delta + donut */}
            <div className="wr-valbox">
              <div>
                <div className="wr-card-ttl">Ranked Coverage</div>
                <div ref={valBoxRef}>
<div className="wr-card-val">
  {loading ? '—' : (data?.visibilityDisplay ?? `${coveragePct}%`)}
</div>

<div className={`wr-delta ${deltaClass}`} title="Change vs start of selected range">
  {deltaSymbol} {loading ? '—' : (data?.visibilityChange ?? `${Math.abs(coverageDeltaPct)}%`)}
</div>

                </div>
              </div>
              {/* Mini donut, sized to value+delta block */}
              <MiniDonut value={loading?0:coveragePct} size={donutSize} thickness={Math.max(6, Math.round(donutSize/6))}/>
            </div>

            {/* top-right switches */}
            <div style={{display:'flex', gap:10}}>
              <Switch label="Coverage" checked={showCoverage} onChange={setShowCoverage} />
              <Switch label="Smoothing" checked={smooth} onChange={setSmooth} />
            </div>
          </div>

          <div className="mt-4">
            <CoverageArea
              dates={covSlice.dates}
              values={covSlice.vals}
              smooth={smooth}
              active={showCoverage}
              h={220}
            />
            <div className="wr-card-sub">Based on selected Insights date range {tw.toUpperCase()}</div>
          </div>

          {/* Bottom-right CTA */}
          <button className="wr-btn primary wr-cta-br" onClick={deepLinkRanked} title="Open Rank Tracker (Ranked ≤100)">
            Open Rank Tracker
          </button>
        </div>

        {/* CARD 2: Gainers vs Losers */}
        <div className="wr-card p-4" id="gains-losses">
          <div className="wr-card-hd">
            <div>
              <div className="wr-card-ttl">Gainers vs Losers</div>
              <div className="wr-card-val" style={{color: netInScope>=0 ? 'var(--wr-ok)' : 'var(--wr-danger)'}}>
                {loading ? '—' : `${netInScope>=0?'+':''}${netInScope}`}
              </div>
              {!loading && (
                <div className="wr-card-sub">
{(() => {
  const arr = data?.gainsHistory || [];
  const g = sum(arr.map((x: any) => x.gained));
  const l = sum(arr.map((x: any) => x.lost));
  return `${g} gained · ${l} lost in selected date range`;
})()}

                </div>
              )}
            </div>

            {/* Right-side filters */}
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
              <Segmented
                options={[{id:'daily',label:'Daily'},{id:'weekly',label:'Weekly'}]}
                value={interval}
                onChange={(id)=>setInterval(id as any)}
              />
              <Switch label="Net line" checked={showNet} onChange={setShowNet}/>
            </div>
          </div>

          <div className="mt-3">
            <GainsLossesBars
              data={gainsSlice}
              h={220}
              showGained={showGained}
              showLost={showLost}
              showNet={showNet}
            />
          </div>

          <div className="wr-legend-btm">
            <LegendPill color="var(--wr-ok)" label="Gained" active={showGained} onChange={setShowGained}/>
            <LegendPill color="var(--wr-danger)" label="Lost" active={showLost} onChange={setShowLost}/>
          </div>

          <div className="wr-card-sub" style={{textAlign:'center', marginTop:6}}>
            Click legend to toggle series • Hover bars for values
          </div>
        </div>
      </div>

      {err && <div className="p-3" style={{color:'var(--wr-danger)'}}>{err}</div>}
    </section>
  );
}

/* ===================== DEMO WRAPPER (optional) ===================== */
export default function DemoCanvas({ data }: DemoCanvasProps){


  const router = { push: (url:string)=> alert(`Navigate to:\n${url}`) };

  // derive a stable fingerprint whenever the API payload changes (date-range or series)
  const dataKey = React.useMemo(() => {
    const start = data?.metadata?.date_range?.start ?? "";
    const end   = data?.metadata?.date_range?.end ?? "";
    const covN  = data?.data?.overview_kpis?.visibility_top_20?.sparkline_data?.length ?? 0;
    const glN   = data?.data?.gains_losses_chart?.dates?.length ?? 0;
    return `${start}|${end}|cov:${covN}|gl:${glN}`;
  }, [data]);

  // include the key in scope so the card’s useEffect(dep on JSON.stringify(scope)) also sees it
  const scope = { device:'desktop', locationISO:'US', tw:'30d', version: dataKey };

  const api = {
    getOverview: async (_scope:any) => {
      if (data) return mapOverviewToLargeCards(data);
    }
  };

  return (
    <div className="py-4">
      <KeywordInsightSummaryLargeCards
        key={dataKey}  
        scope={scope}
        api={api}
        onDeepLink={(dest:any)=>{
          if(dest.type==='rank-tracker'){
            router.push(`/rank-tracker?rank=${dest.rank}&tw=${dest.tw}&device=${dest.device}&loc=${dest.loc}`);
          }
          if(dest.type==='scroll' && dest.section==='gains-losses'){
            document.querySelector('#gains-losses')?.scrollIntoView({ behavior:'smooth' });
          }
        }}
        track={(e:string,p:any)=>console.log('[telemetry]', e, p)}
      />
    </div>
  );
}


