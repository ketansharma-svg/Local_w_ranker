
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Section C — Gains & Losses Trend (Demo Canvas)
 * - Dual-area line (no smoothing)
 * - Timeframe (7/14/30/90/custom) with freemium lock
 * - Device + Location controls (two-way via onScopeChange)
 * - Legend toggles (persist to localStorage)
 * - Drill-through to Rank Tracker (gated for free)
 * - Export CSV / PNG (premium)
 * - Real dates, horizontal grid, markers on hover/focus only, keyboard access
 */

/* ===================== TOKENS (scoped) ===================== */
const LocalTokens = () => (
  <style>{`
    :root{
      --wr-text:#111827; --wr-muted:#6B7280; --wr-border:#EFF0F6; --wr-bg:#FFFFFF;
      --wr-action:#0077FF; --wr-action-pastel:#BDD6FF;
      --wr-red:#E94134; --wr-red-p:#FBC4BF;
      --wr-radius:6px; --wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);
    }

    .wr-card{background:var(--wr-bg); border:1px solid var(--wr-border); border-radius:var(--wr-radius); box-shadow:var(--wr-shadow-sm)}
    .wr-pad{padding:16px}
    .wr-hd{display:flex; align-items:center; justify-content:space-between; gap:12px}
    .wr-title{font:600 18px/1.35 Inter,system-ui; color:var(--wr-text)}
    .wr-tools{display:flex; flex-wrap:wrap; gap:10px; align-items:center}
    .wr-sub{font:500 12px/1.3 Inter; color:var(--wr-muted)}

    .wr-seg{display:inline-flex; border:1px solid var(--wr-border); background:#F5F7FA; border-radius:999px; padding:2px}
    .wr-seg-btn{min-width:46px; height:26px; padding:0 10px; border-radius:999px; border:none; cursor:pointer; background:transparent; color:var(--wr-muted); font:700 12px/1 Inter;}
    .wr-seg-btn[aria-pressed="true"]{background:var(--wr-action); color:#fff}
    .wr-seg-btn:hover{background:#E5E7EB; color:var(--wr-text)}
    .wr-seg-btn[disabled]{opacity:.5; cursor:not-allowed}

    .wr-switch{display:inline-flex; align-items:center; gap:8px; font:700 12px/1 Inter; color:var(--wr-muted); user-select:none; cursor:pointer}
    .wr-switch input{position:absolute; opacity:0; pointer-events:none}
    .wr-sw-track{width:42px; height:24px; background:#E5E7EB; border-radius:999px; position:relative; transition:background .2s}
    .wr-sw-thumb{position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.15); transition:left .18s}
    .wr-switch[data-on="true"] .wr-sw-track{background:var(--wr-action)}
    .wr-switch[data-on="true"] .wr-sw-thumb{left:21px}

    .wr-btn{display:inline-flex; align-items:center; gap:.4rem; height:28px; padding:0 .6rem; border:1px solid var(--wr-border); border-radius:8px; background:#fff; cursor:pointer; font:600 12px/1 Inter; color:var(--wr-text)}
    .wr-btn:hover{background:#E5E7EB}
    .wr-btn[disabled]{opacity:.5; cursor:not-allowed}

    .wr-pill{display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid var(--wr-border); border-radius:999px; background:#F5F7FA; color:var(--wr-text); font:700 12px/1 Inter}
    .wr-select{height:28px; border:1px solid var(--wr-border); border-radius:8px; padding:0 8px; background:#fff; font:600 12px/1 Inter; color:var(--wr-text)}

    /* Chart */
    .gl-wrap{position:relative; width:100%; height:240px; margin-top:8px}
    .gl-axis{font:600 12px/1 Inter; fill:var(--wr-muted)}
    .gl-grid line{stroke:var(--wr-border)}
    .gl-line-g{pointer-events:none}
    .gl-hit{fill:transparent; cursor:crosshair}
    .gl-marker{pointer-events:none}

    .wr-tooltip{position:absolute; background:rgba(17,24,39,.96); color:#fff; padding:6px 8px; font-size:12px; border-radius:6px; box-shadow:var(--wr-shadow-sm); pointer-events:none; white-space:nowrap}
    .wr-tooltip:after{content:""; position:absolute; left:10px; bottom:-6px; border:6px solid transparent; border-top-color:rgba(17,24,39,.96)}
    .wr-error{color:#E94134; font:600 13px/1.3 Inter}

    .wrap{padding:16px;  margin:0 auto}
    .bar{display:flex; align-items:center; justify-content:space-between; margin:12px 0}
  `}</style>
);

/* ===================== DATE HELPERS ===================== */
const pad2 = (n)=> (n<10?`0${n}`:`${n}`);
const toISO = (d)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const fmtShort = (iso)=> new Date(iso+'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'2-digit' });
const lastNDays = (n)=> { const t=new Date(); const out=[]; for(let i=n-1;i>=0;i--){const d=new Date(t); d.setDate(t.getDate()-i); out.push(toISO(d)); } return out; };
const rangeForPreset = (tw)=> { const n = tw==='7d'?7:tw==='14d'?14:tw==='30d'?30:90; const ds=lastNDays(n); return { start:ds[0], end:ds[ds.length-1], days:ds }; };

/* ===================== MOCK DATA ===================== */
async function mockFetchGL(args){
  const days = (()=>{ const s=new Date(args.start+'T00:00:00'); const e=new Date(args.end+'T00:00:00'); const out=[]; for(let d=new Date(s); d<=e; d.setDate(d.getDate()+1)) out.push(toISO(d)); return out; })();
  const pts = days.map(iso=>({
    date: iso,
    gains: Math.floor(8 + Math.random()*36),
    losses: Math.floor(6 + Math.random()*28),
  }));
  return { scope:{ device:'desktop', locationISO:'US' }, range:{ start:days[0], end:days[days.length-1] }, points: pts };
}

/* ===================== UTILITIES ===================== */
const niceTicks = (max, count=4)=> {
  if (max<=0) return [0,1,2,3,4];
  const step0 = max / Math.max(1,count);
  const pow10 = Math.pow(10, Math.floor(Math.log10(step0)));
  const err = step0 / pow10;
  const step = err >= 7.5 ? 10*pow10 : err >= 3.5 ? 5*pow10 : err >= 1.5 ? 2*pow10 : pow10;
  const ticks = [];
  for (let v=0; v<=max+1e-6; v+=step) ticks.push(v);
  if (ticks[ticks.length-1] < max) ticks.push(max);
  return ticks;
};
const sum = (xs) => xs.reduce((a,b)=>a+b,0);
const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));
const saveLocal = (k,v)=> { try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };
const loadLocal = (k,def)=> { try{ const v=localStorage.getItem(k); return v? JSON.parse(v) : def; }catch{ return def; } };
const twStr = (tw) => typeof tw==='string' ? tw : `${tw.start}..${tw.end}`;

/* ===================== PRIMITIVES ===================== */
function Segmented({ options, value, onChange, disabled }){
  return (
    <div className="wr-seg" role="tablist" aria-label="Timeframe">
      {options.map(opt=> (
        <button key={opt.id}
          disabled={disabled && opt.id!=='7d'}
          className="wr-seg-btn"
          aria-pressed={String(value===opt.id)}
          onClick={()=> onChange(opt.id)}
          role="tab"
          title={!disabled?'' : (opt.id==='7d' ? 'Available on free' : 'Premium: unlock additional time ranges')}
        >{opt.label}</button>
      ))}
    </div>
  );
}
function Switch({ label, checked, onChange }){
  return (
    <label className="wr-switch" data-on={checked}>
      <span>{label}</span>
      <span className="wr-sw-track"><span className="wr-sw-thumb"/></span>
      <input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} />
    </label>
  );
}

/* ===================== COMPONENT ===================== */
export function GainsLossesCard({
  scope,
  isPremium = true,
  loading: loadingProp,
  api,
  onDeepLink,
  onScopeChange,
  track,
}){
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(!!loadingProp);

  // timeframe local state (mirrors header; default from props)
  const initialTW = typeof scope.tw === 'string' ? scope.tw : 'custom';
  const [tw, setTW] = useState(initialTW === 'custom' ? '7d' : initialTW);
  const [customRange, setCustomRange] = useState(typeof scope.tw === 'object' ? scope.tw : null);

  // legend visibility (persist)
  const [showGains, setShowGains] = useState(()=>loadLocal('wr_gl_show_gains', true));
  const [showLosses, setShowLosses] = useState(()=>loadLocal('wr_gl_show_losses', true));
  useEffect(()=> saveLocal('wr_gl_show_gains', showGains), [showGains]);
  useEffect(()=> saveLocal('wr_gl_show_losses', showLosses), [showLosses]);

  // data
  const [dto, setDto] = useState(null);

  const effectiveRange = useMemo(()=>{
    if (tw === 'custom' && customRange) return customRange;
    const preset = rangeForPreset(tw);
    return { start:preset.start, end:preset.end };
  }, [tw, customRange]);

  // fetch on scope/range change
  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      setLoading(true); setErr("");
      try{
        const { device, locationISO } = scope;
        const { start, end } = effectiveRange;
        const res = api?.getGainsLosses
          ? await api.getGainsLosses({ device, locationISO, start, end })
          : await mockFetchGL({ start, end });
        if (mounted) setDto(res);
      }catch(e){
        if (mounted) setErr("Couldn’t load data.");
      }finally{ if (mounted) setLoading(false); }
    })();
    return ()=>{ mounted=false; };
  }, [scope.device, scope.locationISO, effectiveRange.start, effectiveRange.end]);

  /* ---------- SERIES + SCALES ---------- */
  const points = dto?.points ?? [];
  const n = points.length;
  const PAD = { top:12, right:8, bottom:28, left:44 };
  const W = 860, H = 240;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const xFromIdx = (i) => PAD.left + (n<=1 ? 0 : (i * innerW / (n-1)));
  const maxY = Math.max(1, ...points.map(p=>Math.max(p.gains, p.losses)));
  const yFromVal = (v) => PAD.top + innerH - (v/maxY)*innerH;

  const ticks = niceTicks(maxY, 4);

  /* ---------- AREA PATHS ---------- */
  const linePath = (prop)=>{
    if (n===0) return '';
    let d = `M ${xFromIdx(0)} ${yFromVal((points[0])[prop])}`;
    for(let i=1;i<n;i++) d += ` L ${xFromIdx(i)} ${yFromVal((points[i])[prop])}`;
    return d;
  };
  const areaPath = (prop)=>{
    if (n===0) return '';
    let d = `M ${xFromIdx(0)} ${yFromVal((points[0])[prop])}`;
    for(let i=1;i<n;i++) d += ` L ${xFromIdx(i)} ${yFromVal((points[i])[prop])}`;
    d += ` L ${xFromIdx(n-1)} ${PAD.top + innerH}`;
    d += ` L ${xFromIdx(0)} ${PAD.top + innerH} Z`;
    return d;
  };

  /* ---------- INTERACTION (hover / keyboard / drill) ---------- */
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const pickSeriesAt = (i, py)=> {
    const gy = yFromVal(points[i]?.gains ?? 0);
    const ly = yFromVal(points[i]?.losses ?? 0);
    const distG = showGains ? Math.abs(py - gy) : Number.POSITIVE_INFINITY;
    const distL = showLosses ? Math.abs(py - ly) : Number.POSITIVE_INFINITY;
    return distG <= distL ? 'gain' : 'loss';
  };

  const deepLink = (i, which)=>{
    const date = points[i]?.date;
    if (!date) return;
    const movement = which==='gain' ? 'gain' : 'loss';
    track?.('overview_gl_point_click', { date, series:movement, scope:scope, tw });
    if (!isPremium) {
      alert('Drill down by day — Open Rank Tracker for this date and direction with Premium.');
      return;
    }
    onDeepLink?.({ type:'rank-tracker', date, movement, device:scope.device, loc:scope.locationISO, tw: twStr(tw==='custom' && customRange ? customRange : tw) });
  };

  const handleMouseMove = (e)=>{
    if (!svgRef.current || n===0) return;
    const r = svgRef.current.getBoundingClientRect();
    const relX = clamp(e.clientX - r.left, PAD.left, W - PAD.right);
    const idx = Math.round(((relX - PAD.left)/innerW) * ((n-1)||0));
    setHoverIdx(clamp(idx,0,n-1));
  };
  const handleLeave = ()=> setHoverIdx(null);

  const handleClick = (e)=>{
    if (hoverIdx===null || n===0) return;
    const r = svgRef.current.getBoundingClientRect();
    const relY = e.clientY - r.top;
    const which = pickSeriesAt(hoverIdx, relY);
    deepLink(hoverIdx, which);
  };

  // keyboard
  const focusRef = useRef(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const onKey = (e)=>{
    if (n===0) return;
    if (e.key==='ArrowRight'){ setFocusIdx(i=> clamp(i+1, 0, n-1)); e.preventDefault(); }
    if (e.key==='ArrowLeft'){ setFocusIdx(i=> clamp(i-1, 0, n-1)); e.preventDefault(); }
    if (e.key==='Enter' || e.key===' '){
      e.preventDefault();
      const which = showGains ? 'gain' : showLosses ? 'loss' : 'gain';
      deepLink(focusIdx<0?0:focusIdx, which);
    }
  };

  useEffect(()=> {
    if (focusIdx<0 || !focusRef.current) return;
    const el = focusRef.current.querySelector(`[data-pt="${focusIdx}"]`);
    el?.focus();
  }, [focusIdx]);

  /* ---------- EXPORT ---------- */
  const exportCSV = ()=>{
    const rows = [['date','gains','losses'], ...points.map(p=>[p.date, String(p.gains), String(p.losses)])];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='gains-losses.csv'; a.click(); URL.revokeObjectURL(url);
    track?.('overview_gl_export', { fmt:'csv', scope, tw });
  };
  const exportPNG = async ()=>{
    if (!svgRef.current) return;
    const s = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([s], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = ()=>{
      const canvas = document.createElement('canvas'); canvas.width=W; canvas.height=H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H);
      ctx.drawImage(img, 0,0);
      canvas.toBlob((blob)=>{
        if(!blob) return;
        const purl = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=purl; a.download='gains-losses.png'; a.click(); URL.revokeObjectURL(purl); URL.revokeObjectURL(url);
      });
    };
    img.src = url;
    track?.('overview_gl_export', { fmt:'png', scope, tw });
  };

  /* ---------- CONTROLS ---------- */
  const changeTW = (id)=>{
    if (id==='custom'){
      if (!isPremium){ alert('Custom range is Premium.'); return; }
      const start = prompt('Custom start date (YYYY-MM-DD):', effectiveRange.start);
      if (!start) return;
      const end = prompt('Custom end date (YYYY-MM-DD):', effectiveRange.end);
      if (!end) return;
      setTW('custom'); setCustomRange({start, end});
      track?.('overview_gl_time_change', { to:'custom', start, end });
      return;
    }
    if (!isPremium && id!=='7d'){ alert('Additional time ranges are Premium.'); return; }
    setTW(id);
    track?.('overview_gl_time_change', { to:id });
  };

  const timeframeLabel =
    tw==='custom' && customRange ? `Custom ${customRange.start}..${customRange.end}` : tw;

  /* ---------- LOADING / EMPTY / ERROR ---------- */
  const isEmpty = !loading && !err && (n===0 || sum(points.map(p=>p.gains))+sum(points.map(p=>p.losses))===0);

  return (
    <div className="wr-card">
      <LocalTokens/>
      <div className="wr-pad">
        {/* Header */}
        <div className="wr-hd">
          <div className="wr-title">Gains & Losses</div>
          <div className="wr-tools">
            <Segmented
              options={[
                {id:'7d',label:'7d'},
                {id:'14d',label:'14d'},
                {id:'30d',label:'30d'},
                {id:'90d',label:'90d'},
                {id:'custom',label:'Custom…'},
              ]}
              value={tw}
              onChange={changeTW}
              disabled={!isPremium}
            />

            {/* Device segmented */}
            <div className="wr-seg" role="tablist" aria-label="Device">
              {(['desktop','mobile']).map(id=> (
                <button key={id}
                  className="wr-seg-btn"
                  aria-pressed={String(scope.device===id)}
                  onClick={()=> onScopeChange?.({ device:id, locationISO:scope.locationISO })}
                  role="tab"
                >{id==='desktop'?'Desktop':'Mobile'}</button>
              ))}
            </div>

            {/* Location dropdown */}
            <select
              className="wr-select"
              value={scope.locationISO}
              aria-label="Location"
              onChange={(e)=> onScopeChange?.({ device:scope.device, locationISO:e.target.value })}
            >
              {['US','GB','IN','DE','FR','AU','CA'].map(c=> <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Legends */}
            <Switch label="Gains"  checked={showGains}  onChange={(v)=>{ setShowGains(v); track?.('overview_gl_series_toggle', { series:'gains', on:v }); }} />
            <Switch label="Losses" checked={showLosses} onChange={(v)=>{ setShowLosses(v); track?.('overview_gl_series_toggle', { series:'losses', on:v }); }} />

            <button className="wr-btn" onClick={exportCSV} disabled={!isPremium}>Export CSV</button>
            <button className="wr-btn" onClick={exportPNG} disabled={!isPremium}>Export PNG</button>
          </div>
        </div>

        {/* Chart */}
        <div className="gl-wrap">
          {loading ? (
            <div style={{width:'100%',height:'100%',border:'1px solid var(--wr-border)',borderRadius:6,background:'linear-gradient(90deg,#f5f7fa,#eef2f7,#f5f7fa)',animation:'rdShimmer 1.2s infinite'}}/>
          ) : err ? (
            <div className="wr-error">Couldn’t load data. <button className="wr-btn" onClick={()=>window.location.reload()}>Retry</button></div>
          ) : isEmpty ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}} className="wr-sub">
              No movement in the selected range.
            </div>
          ) : (
            <>
              <svg
                ref={svgRef}
                width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={`Daily keyword gains and losses over ${timeframeLabel}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleLeave}
                onClick={handleClick}
                onKeyDown={onKey}
                tabIndex={0}
                style={{outline:'none'}}
              >
                {/* grid (horizontal only) */}
                <g className="gl-grid">
                  {ticks.map((t,i)=> (
                    <line key={i} x1={PAD.left} x2={W-PAD.right} y1={yFromVal(t)} y2={yFromVal(t)}/>
                  ))}
                </g>

                {/* y-axis labels */}
                {ticks.map((t,i)=> (
                  <text key={`y${i}`} x={PAD.left-8} y={yFromVal(t)+4} textAnchor="end" className="gl-axis">{t}</text>
                ))}
                {/* x-axis ticks (4–6) */}
                {points.map((p,i,arr)=>{
                  const step = Math.max(1, Math.floor(arr.length/6));
                  const show = i%step===0 || i===arr.length-1;
                  if(!show) return null;
                  return (
                    <g key={`x${i}`}>
                      <text x={xFromIdx(i)} y={H-8} textAnchor="middle" className="gl-axis">{fmtShort(p.date)}</text>
                    </g>
                  );
                })}

                {/* Areas + lines (respect legend toggles) */}
                {showGains && (
                  <>
                    <path d={areaPath('gains')} fill="var(--wr-action-pastel)" opacity=".55"/>
                    <path d={linePath('gains')} fill="none" stroke="var(--wr-action)" strokeWidth="2"/>
                  </>
                )}
                {showLosses && (
                  <>
                    <path d={areaPath('losses')} fill="var(--wr-red-p)" opacity=".55"/>
                    <path d={linePath('losses')} fill="none" stroke="var(--wr-red)" strokeWidth="2"/>
                  </>
                )}

                {/* Hover/focus markers */}
                {hoverIdx!==null && (
                  <g className="gl-marker">
                    <line x1={xFromIdx(hoverIdx)} x2={xFromIdx(hoverIdx)} y1={PAD.top} y2={PAD.top+innerH} stroke="#E5E7EB"/>
                    {showGains && <circle cx={xFromIdx(hoverIdx)} cy={yFromVal(points[hoverIdx].gains)} r="3" fill="var(--wr-action)" stroke="#fff" strokeWidth="2"/>}
                    {showLosses && <circle cx={xFromIdx(hoverIdx)} cy={yFromVal(points[hoverIdx].losses)} r="3" fill="var(--wr-red)" stroke="#fff" strokeWidth="2"/>}
                  </g>
                )}

                {/* Hit rects for keyboard focusability (1 per day) */}
                <g ref={focusRef}>
                  {points.map((_,i)=>(
                    <rect key={`hit${i}`} data-pt={i} className="gl-hit" x={xFromIdx(i)-innerW/Math.max(2,(n-1))*0.5} y={PAD.top} width={innerW/Math.max(2,(n-1))} height={innerH}
                          tabIndex={0}
                          aria-label={`${fmtShort(points[i].date)} — Gains ${points[i].gains}, Losses ${points[i].losses}. Press Enter to view affected keywords.`}
                          onFocus={()=>setFocusIdx(i)}
                          onMouseEnter={()=>setHoverIdx(i)}
                  />
                  ))}
                </g>
              </svg>

              {/* Tooltip */}
              {hoverIdx!==null && (
                <div className="wr-tooltip" style={{ left: clamp(xFromIdx(hoverIdx)-40, 6, W-120), top: 12 }}>
                  <div style={{fontWeight:600, marginBottom:2}}>{fmtShort(points[hoverIdx].date)}</div>
                  {showGains  && <>Gains <b>{points[hoverIdx].gains}</b></>} {showGains && showLosses && ' | '}
                  {showLosses && <>Losses <b>{points[hoverIdx].losses}</b></>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="wr-sub" style={{marginTop:8}}>Timeframe: {timeframeLabel} • Device: {scope.device.toUpperCase()} • Location: {scope.locationISO}</div>
      </div>
    </div>
  );
}

/* Skeleton keyframes (shared with other sections) */
const _shim = document.getElementById('rd-shimmer') ?? (()=>{ const s=document.createElement('style'); s.id='rd-shimmer'; s.textContent=`@keyframes rdShimmer{0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}}`; document.head.appendChild(s); return s; })();

/* ===================== DEMO CANVAS ===================== */
export default function DemoGainLosses({dtoFromOverview }){
  const [premium, setPremium] = useState(true);
  const [scope, setScope] = useState({ device:'desktop', locationISO:'US', tw:'30d' });
  const api = {
    getGainsLosses: async ({ start, end }) => {
      if (dtoFromOverview?.data?.gains_losses_chart) {
        const gl = dtoFromOverview.data.gains_losses_chart;
        const points = (gl.dates || []).map((date, i) => ({
          date,
          gains: gl.gained_keywords?.[i] ?? 0,
          losses: gl.lost_keywords?.[i] ?? 0,
        }));
        return { scope:{ device:'desktop', locationISO:'US' }, range:{ start: gl.dates?.[0], end: gl.dates?.slice(-1)[0] }, points };
      }
      return await mockFetchGL({ start, end });
    }
  };
  return (
    <div className="">

      <GainsLossesCard
        scope={scope}
        isPremium={premium}
        api={api}
        onScopeChange={(next)=> setScope(s=> ({ ...s, ...next }))}
        onDeepLink={(dest)=> alert(`Deep link → ${dest.type} @ ${dest.date} (${dest.movement}) [${dest.device}/${dest.loc}] tw=${dest.tw}`)}
      />
    </div>
  );
}


