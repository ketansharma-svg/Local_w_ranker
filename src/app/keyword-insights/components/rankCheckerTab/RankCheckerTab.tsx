import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, ClipboardPaste, Info, RefreshCw, Columns3, List, LayoutGrid, Search,
  Download, ClipboardList, BarChart3, Trash2, Plus, ExternalLink, ChevronRight, ChevronDown
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip
} from "recharts";

/* ========================================================================== */
/* GLOBAL TOKENS (aligned with Tab 2)                                         */
/* ========================================================================== */
const GLOBAL_CSS = [
  ":root{--wr-brand:#008CCD;--wr-value-blue:#0077FF;--wr-chart-blue:#4286F5;--wr-chart-fill:#BDD6FF;--wr-success:#10B981;--wr-warning:#F59E0B;--wr-danger:#EF4444;--wr-text:#111827;--wr-muted:#6B7280;--wr-border:#EFF0F6;--wr-panel:#FFFFFF;--wr-hover:#FAFAFA;--wr-radius:6px;--wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);--wr-shadow-md:0 2px 6px rgba(17,24,39,.08)}",
  "*{box-sizing:border-box}", "body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial;color:var(--wr-text)}",
  ".wrap{padding:16px}",

  /* Base UI atoms */
  ".chip{display:inline-flex;align-items:center;gap:8px;height:24px;padding:0 10px;font-size:12px;color:var(--wr-muted);background:#F5F7FA;border:1px solid var(--wr-border);border-radius:999px}",
  ".chip:hover{background:#E5E7EB;cursor:pointer;}",
  ".iconbtn{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--wr-border);border-radius:6px;background:#fff;cursor:pointer}",
  ".seg{display:inline-flex;gap:2px;background:#F5F7FA;border:1px solid var(--wr-border);border-radius:999px;padding:2px}",
  ".seg button{height:28px;padding:0 12px;border:0;border-radius:999px;background:transparent;cursor:pointer;font-size:12px;color:var(--wr-text)}",
  ".seg button[data-active=\"true\"]{background:#D9EEF8;box-shadow:inset 0 0 0 1px var(--wr-value-blue)}",

  /* Sticky Input Panel */
  ".sticky-panel{position:sticky;top:0;z-index:8;background:var(--wr-panel);border:1px solid var(--wr-border);border-radius:var(--wr-radius);box-shadow:var(--wr-shadow-sm);padding:16px;margin-bottom:12px}",
  ".tag{display:inline-flex;align-items:center;background:#F5F7FA;border:1px solid var(--wr-border);border-radius:999px;padding:0 8px;height:24px;margin-right:6px;font-size:12px}",
  ".tag button{margin-left:6px;border:0;background:transparent;cursor:pointer}",

  /* KPI ROW (from your snippet) */
  ".kpi{background:#fff;border:1px solid #EFF0F6;border-radius:6px;box-shadow:0 1px 2px rgba(17,24,39,.06);padding:12px;height:148px}",
  ".kpi:hover{transform:translateY(-1px);box-shadow:0 2px 6px rgba(17,24,39,.08)}",
  ".grid{display:grid;gap:12px}",
  "@media(min-width:1200px){.grid4{grid-template-columns:repeat(4,1fr)}}",
  "@media(min-width:768px) and (max-width:1199px){.grid4{grid-template-columns:repeat(2,1fr)}}",
  "@media(max-width:767px){.grid4{grid-template-columns:1fr}}",
  ".muted{color:#6B7280}", ".val{font-size:24px;font-weight:700;color:#0077FF}",
  ".sectionHeader{display:flex;justify-content:space-between;align-items:center;margin:4px 0 12px}",
  ".sectionTitle{font-size:16px;font-weight:600;color:#111827}",
  ".btn{display:inline-flex;gap:8px;align-items:center;background:#FFFFFF;border:1px solid #EFF0F6;border-radius:6px;padding:6px 10px;font-size:14px;color:#111827;cursor:pointer}",
  ".btn:hover{background:#FAFAFA}",

  /* Results Table container */
  ".section{background:#fff;border:1px solid #EFF0F6;border-radius:6px;box-shadow:0 1px 2px rgba(17,24,39,.06)}",
  ".section-hd{position:sticky;top:var(--top,0px);z-index:6;height:48px;padding:0 8px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #EFF0F6;background:#fff}",
  ".title{font-weight:600}",
  ".filter-bar{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;border-bottom:1px solid #EFF0F6;background:#fff}",
  ".bulk-bar{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;border-bottom:1px solid #EFF0F6;background:#F5F7FA}",
  ".table-scroll{overflow:auto}",
  "table{width:100%;border-collapse:separate;border-spacing:0}",
  "thead th{position:sticky;top:calc(var(--top,0px) + 48px);z-index:5;background:#F5F7FA;color:#6B7280;font-weight:600;border-bottom:1px solid #EFF0F6;height:44px;padding:0 12px;text-align:left;white-space:nowrap}",
  "tbody td{height:var(--rowH,48px);padding:0 12px;border-bottom:1px solid #EFF0F6;vertical-align:middle;background:#fff}",
  "tr:hover{background:#FAFAFA}",
  ".kw-head{position:sticky;left:52px;z-index:6;background:#F5F7FA}",
  ".kw-cell{position:sticky;left:52px;z-index:3;background:#fff}",
  ".bucket{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:12px;background:#F5F7FA;border:1px solid #EFF0F6;margin-left:6px}"
].join("\n");
const GlobalStyles = () => <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />;

/* ========================================================================== */
/* TYPES, HELPERS & MOCKS                                                     */
/* ========================================================================== */
type Device = 'desktop'|'mobile';
type Plan = 'free'|'premium';
type Location = 'IN'|'US'|'AE';

export interface InputPanelState {
  keywords: string[];
  device: Device;
  locationISO: Location;
  competitors: string[];
  plan: Plan;
  limits: { manual: number; csv: number };
  isSubmitting: boolean;
  cachedAt?: string | null;
  tw: '7d'|'30d'|'90d';
}

export interface SubmitPayload {
  keywords: string[];
  device: Device;
  locationISO: Location;
  competitors?: string[];
}

export interface CheckerRow {
  id: string;
  keyword: string;
  volume?: number | null;
  device: Device;
  locationISO: Location;
  rank: number | null;
  url?: string | null;
  competitors?: Array<{ domain: string; rank: number | null }>;
  inTracker: boolean;
  lastSeen?: string | null;
}

const nf = (n:number)=>new Intl.NumberFormat().format(n);
const flagEmoji = (iso:string)=>{ const cc=iso.toUpperCase(),A=0x1f1e6; return Array.from(cc).map(c=>String.fromCodePoint(A+(c.charCodeAt(0)-65))).join(''); };
const normalizeLines=(lines:string[])=>{const out:string[]=[];const seen=new Set<string>();for(const raw of lines){let s=raw.replace(/^["']|["']$/g,'').trim().replace(/\s+/g,' ');if(!s)continue;if(s.length>120)s=s.slice(0,120);const k=s.toLowerCase();if(!seen.has(k)){seen.add(k);out.push(s);}}return out;};
const parseCSVFirstCol=(text:string)=>normalizeLines(text.split(/\r?\n/).map(r=>(r.split(",")[0]??"")));
const domainValid=(d:string)=>/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d.trim());
const rankCell=(n:number|null)=> (n==null || n>100) ? "Not Ranked" : `#${n}`;
const bucketLabel=(r:number|null)=> r==null||r>100?null : r<=3?"Top 3":r<=10?"Top 10":r<=20?"Top 20":r<=50?"Top 50":"Top 100";

/* ---- Mock checker: replace with your API ---- */
function runRankCheck(payload: SubmitPayload): Promise<CheckerRow[]>{
  const rnd=(a:number,b:number)=>a+Math.floor(Math.random()*(b-a+1));
  const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  return new Promise(res=>{
    setTimeout(()=>res(payload.keywords.map((kw,i)=>({
      id:`${i}_${slug(kw)}`,
      keyword:kw,
      volume:rnd(900,45000),
      device:payload.device, locationISO:payload.locationISO,
      rank: Math.random()<0.8 ? rnd(1,95) : null,
      url:`/pages/${slug(kw)}-${(i%7)+1}`,
      inTracker: Math.random()<0.4,
      competitors: Math.random()<0.6 ? [{domain:'ahrefs.com',rank:rnd(1,20)},{domain:'semrush.com',rank: rnd(1,20)}] : []
    }))),600);
  });
}

/* ---- Tiny per-scope KPI history ---- */
type History={counts:number[];coverage:number[];avg:(number|null)[]; newly7d:Record<string,number>};
const histKey=(d:Device,l:Location)=>`checker.hist.${d}_${l}`;
const loadHist=(d:Device,l:Location):History=>{try{return JSON.parse(localStorage.getItem(histKey(d,l))||"")||{counts:[],coverage:[],avg:[],newly7d:{}}}catch{return{counts:[],coverage:[],avg:[],newly7d:{}}}};
const saveHist=(d:Device,l:Location,h:History)=>localStorage.setItem(histKey(d,l),JSON.stringify(h));

/* ========================================================================== */
/* SECTION 1 — INPUT PANEL (sticky)                                           */
/* ========================================================================== */
function RankCheckerInputPanel(props:{
  state:InputPanelState;
  setState:React.Dispatch<React.SetStateAction<InputPanelState>>;
  onSubmit:(payload:SubmitPayload)=>Promise<void>;
  onClearResults:()=>void;
  onResetForm:()=>void;
  onHeightChange:(px:number)=>void;
}){
  const {state,setState,onSubmit,onClearResults,onResetForm,onHeightChange}=props;
  const [rawText,setRawText]=useState(state.keywords.join("\n"));
  const panelRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{ setRawText(state.keywords.join("\n")); },[state.keywords]);
  useEffect(()=>{
    if(!panelRef.current) return;
    const ro = "ResizeObserver" in window ? new ResizeObserver((e)=>onHeightChange(e[0].contentRect.height)) : null;
    ro?.observe(panelRef.current!);
    onHeightChange(panelRef.current!.offsetHeight);
    return ()=>ro?.disconnect();
  },[onHeightChange]);

  const cleanup=(commit:boolean)=>{
    const lines=normalizeLines(rawText.split(/\r?\n/));
    if(commit) setState(s=>({...s,keywords:lines}));
    return lines;
  };
  const entered=cleanup(false).length;
  const limits=state.limits;
  const overLimit=entered>limits.manual;
  const overCopy = state.plan==='free'
    ? `You’ve entered ${entered} keywords. Free limit is 5. Remove some or Upgrade.`
    : `Max ${limits.manual} keywords per batch. Try CSV for larger imports.`;
  const disableCTA = state.isSubmitting || entered<1 || overLimit;

  async function submit(){
    const list=cleanup(true);
    if(!list.length){ alert("After cleanup, no keywords remain."); return; }
    if(list.length>limits.manual){ alert(overCopy); return; }
    await onSubmit({keywords:list,device:state.device,locationISO:state.locationISO,competitors:state.competitors});
  }

  return (
    <div ref={panelRef} className="sticky-panel" role="region" aria-label="Keyword Input & Targeting">
      {/* Header row */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <div style={{fontSize:16,fontWeight:600}}>Keyword Input & Targeting</div>
          <div className="muted" style={{fontSize:13}}>Enter keywords, choose device & location, then run a check.</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button className={`chip ${state.plan==='free'?'active':''}`} onClick={()=>setState(s=>({...s,plan:'free',limits:{manual:5,csv:50}}))}>Free</button>
          <button className={`chip ${state.plan==='premium'?'active':''}`} onClick={()=>setState(s=>({...s,plan:'premium',limits:{manual:50,csv:1000}}))}>Premium</button>
          <div className="seg" role="tablist" aria-label="time window">
            {(['7d','30d','90d'] as const).map(v=>(
              <button key={v} data-active={String(state.tw===v)} onClick={()=>setState(s=>({...s,tw:v}))}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div style={{position:'relative',marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginBottom:6}}>
          <button className="chip" onClick={()=>{const lines=normalizeLines(rawText.split(/\r?\n/)); setRawText(lines.join("\n")); setState(s=>({...s,keywords:lines}));}}>Remove Duplicates</button>
          <button className="chip" onClick={()=>{const lines=rawText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean); setRawText(lines.join("\n"));}}>Trim Lines</button>
          <button className="chip" onClick={()=>{setRawText(""); setState(s=>({...s,keywords:[]}));}}>Clear</button>
        </div>
        <textarea
          aria-label="Enter keywords"
          placeholder={`Enter one keyword per line (max ${limits.manual} per batch for ${state.plan}).`}
          value={rawText} onChange={e=>setRawText(e.target.value)} onBlur={()=>cleanup(true)}
          style={{width:'100%',minHeight:140,maxHeight:280,padding:12,border:'1px solid var(--wr-border)',borderRadius:6}}
        />
        <div style={{position:'absolute',right:8,bottom:8,fontSize:12}}>
          Entered: <span style={{color:'var(--wr-value-blue)'}}>{entered}</span> / Limit: {limits.manual}
        </div>
      </div>

      {/* Controls grid */}
      <div style={{display:'grid',gap:12,gridTemplateColumns:'repeat(4,minmax(0,1fr))'}}>
        {/* Device */}
        <div>
          <div className="muted" style={{fontSize:13,marginBottom:6}}>Device</div>
          <div className="seg" role="radiogroup" aria-label="Device">
            {(['desktop','mobile'] as const).map(d=>(
              <button key={d} data-active={String(state.device===d)} onClick={()=>setState(s=>({...s,device:d}))}>{d==='desktop'?'Desktop':'Mobile'}</button>
            ))}
          </div>
          <div className="muted" style={{fontSize:12,marginTop:6}}>Affects SERP & rank source</div>
        </div>

        {/* Location */}
        <div>
          <div className="muted" style={{fontSize:13,marginBottom:6}}>Location</div>
          <select value={state.locationISO} onChange={e=>setState(s=>({...s,locationISO:e.target.value as Location}))}
            style={{width:'100%',height:32,border:'1px solid var(--wr-border)',borderRadius:6,padding:'0 8px'}}>
            {(['IN','US','AE'] as Location[]).map(c=><option key={c} value={c}>{flagEmoji(c)} {c}</option>)}
          </select>
        </div>

        {/* Competitors */}
        <div>
          <div className="muted" style={{fontSize:13,marginBottom:6}}>Competitors (max 3)</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {state.competitors.map((d,i)=>(<span key={i} className="tag">{d}<button aria-label={`Remove ${d}`} onClick={()=>setState(s=>({...s,competitors:s.competitors.filter((_,j)=>j!==i)}))}>✕</button></span>))}
            {state.competitors.length<3 && (
              <input placeholder="e.g., semrush.com"
                onKeyDown={e=>{ if(e.key==='Enter'){ const v=(e.currentTarget.value||'').trim(); if(!domainValid(v)){alert('Enter a valid domain (e.g., example.com)'); return;} setState(s=>({...s,competitors:[...s.competitors,v]})); e.currentTarget.value=''; } }}
                style={{flex:'1 1 160px',minWidth:160,height:28,border:'1px solid var(--wr-border)',borderRadius:6,padding:'0 8px'}}
              />
            )}
          </div>
        </div>

        {/* Upload / Paste */}
        <div>
          <div className="muted" style={{fontSize:13,marginBottom:6}}>Upload / Paste</div>
          <div style={{display:'flex',gap:8}}>
            <label className="chip" style={{cursor:'pointer'}}>
              <Upload size={14}/> Upload CSV
              <input type="file" accept=".csv,text/csv" style={{display:'none'}} onChange={e=>{
                const file=e.target.files?.[0]; if(!file) return;
                if(file.size>5*1024*1024){ alert("This file is too large (max 5 MB)."); return; }
                const rd=new FileReader(); rd.onload=()=>{ const vals=parseCSVFirstCol(String(rd.result||"")); if(!vals.length){alert("No keywords found in the first column."); return;} const merged=normalizeLines([...state.keywords,...vals]); const lim=state.limits.csv; setState(s=>({...s,keywords:merged.slice(0,lim)})); setRawText(merged.join("\n")); };
                rd.readAsText(file);
              }}/>
            </label>
            <button className="chip" onClick={async()=>{
              try{ const t=await navigator.clipboard.readText(); const list=normalizeLines(t.split(/\r?\n/)); const merged=normalizeLines([...state.keywords,...list]); setState(s=>({...s,keywords:merged.slice(0,s.limits.manual)})); setRawText(merged.join("\n")); }
              catch{ const t=prompt("Paste keywords (one per line):")||''; const list=normalizeLines(t.split(/\r?\n/)); const merged=normalizeLines([...state.keywords,...list]); setState(s=>({...s,keywords:merged.slice(0,s.limits.manual)})); setRawText(merged.join("\n")); }
            }}><ClipboardPaste size={14}/> Paste</button>
          </div>
          <div className="muted" style={{fontSize:12,marginTop:6}}>CSV first column only · max 5MB.</div>
        </div>

        {/* CTA Cluster */}
        <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <div style={{color:overLimit?'var(--wr-danger)':'var(--wr-muted)',fontSize:12}}>
            {overLimit? overCopy : 'Ready when you are.'}
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
            <button disabled={disableCTA} onClick={submit}
              style={{height:40,minWidth:160,background:'var(--wr-value-blue)',color:'#fff',border:'0',borderRadius:6,cursor:disableCTA?'not-allowed':'pointer'}}>
              {state.isSubmitting ? `Checking ${entered} keywords…` : '🔍 Check Rankings'}
            </button>
            <div style={{display:'flex',gap:12}}>
              <button className="chip" onClick={onClearResults}>Clear results</button>
              <button className="chip" onClick={onResetForm}>Reset form</button>
            </div>
          </div>
        </div>

        {state.cachedAt && (
          <div style={{gridColumn:'1 / -1',marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',border:'1px solid var(--wr-border)',borderRadius:6}}>
            <div className="muted" style={{fontSize:13}}>Results cached • last refreshed just now</div>
            <button className="chip" onClick={()=>alert('Refresh (mock)')}><RefreshCw size={14}/> Refresh now</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* SECTION 2 — KPI ROW (your code, welded into the tab)                        */
/* ========================================================================== */
const pct=(n:number,fd=1)=>new Intl.NumberFormat(undefined,{maximumFractionDigits:fd}).format(n)+"%";

function KpiCard({title,value,helper,chart}:{title:string;value:React.ReactNode;helper?:string;chart:React.ReactNode}){
  return(
    <div className="kpi" role="group" aria-label={title}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <div className="muted" style={{fontSize:14}}>{title}</div>
        <Info size={16} className="muted"/>
      </div>
      <div className="val" style={{marginBottom:6}}>{value}</div>
      <div style={{height:60}}>{chart}</div>
      {helper && <div className="muted" style={{fontSize:12,marginTop:6}}>{helper}</div>}
    </div>
  );
}

function RankCheckerKpiRow(props:{
  checked:number; ranked:number; avgCurrent:number|null; avgHistory:(number|null)[];
  counts10:number[]; coverage10:number[]; newly7d:{dates:string[];counts:number[]};
  onExport?: ()=>void;
}){
  const {checked,ranked,avgCurrent,avgHistory,counts10,coverage10,newly7d,onExport}=props;
  return(
    <>
      <div className="sectionHeader" role="heading" aria-level={2}>
        <div className="sectionTitle">Rank Checker — KPI Summary</div>
        <button className="btn" aria-label="Export KPI Data" onClick={onExport}>
          <Download size={16} /> Export
        </button>
      </div>
      <div className="grid grid4">
        <KpiCard title="Checked Keywords" value={nf(checked)} helper="Last 10 checks" chart={
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(counts10.length?counts10:[0,0]).map((v,i)=>({i,v}))}>
              <Area type="monotone" dataKey="v" stroke="#0077FF" fill="#D9EEF8" strokeWidth={2} dot={false}/>
              <RTooltip/>
            </AreaChart>
          </ResponsiveContainer>
        }/>
        <KpiCard title="Ranked ≤100" value={checked? <span>{nf(ranked)} / {nf(checked)} · <span className="muted">{pct(ranked/checked*100,1)}</span></span> : '—'} helper="Coverage (this batch)" chart={
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(coverage10.length?coverage10:[0,0]).map((v,i)=>({i,v}))}>
              <Area type="monotone" dataKey="v" stroke="#0077FF" fill="#D9EEF8" strokeWidth={2} dot={false}/>
              <RTooltip formatter={(v:any)=>[pct(Number(v),1),'Coverage']}/>
            </AreaChart>
          </ResponsiveContainer>
        }/>
        <KpiCard title="Avg Position" value={
          avgCurrent!=null? <span>{avgCurrent}</span> : '—'
        } helper={avgCurrent!=null?'Ranked rows only':'No ranked keywords in this batch'} chart={
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(avgHistory.length?avgHistory:[null,null]).map((v,i)=>({i,v}))}>
              <Area type="monotone" dataKey="v" stroke="#0077FF" fill="#D9EEF8" strokeWidth={2} dot={false}/>
              <RTooltip formatter={(v:any)=>[v==null?'—':v,'Avg pos']}/>
            </AreaChart>
          </ResponsiveContainer>
        }/>
        <KpiCard title="Newly Ranked vs Tracked" value={nf(newly7d.counts[newly7d.counts.length-1]||0)} helper="Not tracked but ranking" chart={
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={newly7d.dates.map((d,i)=>({d,c:newly7d.counts[i]}))}>
              <CartesianGrid stroke="#EFF0F6" vertical={false}/>
              <XAxis dataKey="d" hide/><YAxis hide/>
              <Bar dataKey="c" radius={[4,4,0,0]} fill="#0077FF"/>
              <RTooltip/>
            </BarChart>
          </ResponsiveContainer>
        }/>
      </div>
    </>
  );
}

/* ========================================================================== */
/* SECTION 3 — RESULTS TABLE (header + filters + bulk + grid)                 */
/* ========================================================================== */
function RankCheckerResultsTable({rows, topOffset=0}:{rows:CheckerRow[]; topOffset?:number}) {
  /* header controls */
                const [exp,setExp]=useState(false);
  const [menu,setMenu]=useState<null|'cols'|'density'|'rows'>(null);
  const [density,setDensity]=useState<'comfortable'|'cozy'|'compact'>('comfortable');
  const [perPage,setPerPage]=useState(25);
  const [page,setPage]=useState(1);
  const [search,setSearch]=useState('');

  /* filter chips */
  const [fRanked,setFRanked]=useState<boolean|null>(null);
  const [fTracked,setFTracked]=useState<boolean|null>(null);
  const [fComps,setFComps]=useState<boolean>(false);

  /* bulk + columns */
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [cols,setCols]=useState({ volume:true, rank:true, url:true, competitors:true, inTracker:true, add:true, serp:true, actions:true });

  /* sort */
  const [sort,setSort]=useState<{key:'rank'|'volume';dir:'asc'|'desc'}>({key:'rank',dir:'asc'});
// Custom hook for debouncing a value
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const debouncedQ = useDebouncedValue(search.toLowerCase(), 250);

  const filtered = useMemo(()=>{
    let out = rows.filter(r=>{
      if (debouncedQ && !(r.keyword.toLowerCase().includes(debouncedQ) || (r.url||'').toLowerCase().includes(debouncedQ))) return false;
      if (fRanked!==null){
        const ranked = r.rank!=null && r.rank<=100;
        if (fRanked!==ranked) return false;
      }
      if (fTracked!==null){ if (fTracked!==r.inTracker) return false; }
      if (fComps && !(r.competitors && r.competitors.length)) return false;
      return true;
    });
    out.sort((a,b)=>{
      const dir = sort.dir==='asc'?1:-1;
      if (sort.key==='rank'){
        const ar=a.rank==null?9999:a.rank, br=b.rank==null?9999:b.rank;
        if (ar!==br) return (ar>br?1:-1)*dir;
        const av=a.volume??-1, bv=b.volume??-1;
        return (av>bv?-1:1);
      } else {
        const av=a.volume??-1, bv=b.volume??-1;
        return (av>bv?1:-1)*dir;
      }
    });
    return out;
  },[rows,debouncedQ,fRanked,fTracked,fComps,sort]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/perPage));
  const pageRows=filtered.slice((page-1)*perPage,page*perPage);
  const allPageSelected = pageRows.length>0 && pageRows.every(r=>selected.has(r.id));

  const chip=(label:string,active:boolean,onClick:()=>void)=><button className={`chip ${active?'active':''}`} onClick={onClick}>{label}</button>;

  return (
    <div className="section" style={{["--top" as any]: `${topOffset}px`, ["--rowH" as any]:(density==='comfortable'?'48px':density==='cozy'?'44px':'40px')}}>
      {/* Section header (sticky) */}
      <div className="section-hd">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div className="title">Rank Check Results</div>
          <span className="chip">{filtered.length}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,position:'relative'}}>
          <button className="iconbtn" title="Columns" onClick={()=>setMenu(m=>m==='cols'?null:'cols')}><Columns3 size={16}/></button>
          <button className="iconbtn" title="Density" onClick={()=>setMenu(m=>m==='density'?null:'density')}><List size={16}/></button>
          <button className="iconbtn" title="Rows / page" onClick={()=>setMenu(m=>m==='rows'?null:'rows')}><LayoutGrid size={16}/></button>
          <button className="iconbtn" title="Export CSV" onClick={()=>exportRowsCSV(filtered)}><Download size={16}/></button>
          <div style={{position:'relative'}}>
            <input placeholder="Search keyword or URL…" aria-label="Search results"
              style={{width:280,height:32,border:'1px solid var(--wr-border)',borderRadius:6,padding:'0 28px'}}
              value={search} onChange={e=>{setSearch(e.target.value); setPage(1);}}/>
            <Search size={16} style={{position:'absolute',left:8,top:8}} color="#6B7280"/>
          </div>

          {/* Menus */}
          {menu==='cols' && (
            <div className="menu" style={{position:'absolute',top:40,right:0,background:'#fff',border:'1px solid var(--wr-border)',borderRadius:8,boxShadow:'var(--wr-shadow-sm)',padding:8,minWidth:220,zIndex:10}} onMouseLeave={()=>setMenu(null)}>
              <div className="chip" style={{margin:'6px 8px'}}>Visible columns</div>
              {Object.keys(cols).map(k=>(
                <label key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 8px',fontSize:13}}>
                  <span>{k}</span>
                  <input type="checkbox" checked={(cols as any)[k]} onChange={()=>{
                    const next = {...cols} as any; next[k]=!next[k]; setCols(next);
                  }}/>
                </label>
              ))}
            </div>
          )}
          {menu==='density' && (
            <div className="menu" style={{position:'absolute',top:40,right:0,background:'#fff',border:'1px solid var(--wr-border)',borderRadius:8,boxShadow:'var(--wr-shadow-sm)',padding:8,minWidth:220,zIndex:10}} onMouseLeave={()=>setMenu(null)}>
              {(['comfortable','cozy','compact'] as const).map(d=>(
                <button key={d} style={{display:'flex',width:'100%',justifyContent:'space-between',padding:'6px 8px',fontSize:13,background:'transparent',border:0,cursor:'pointer'}} onClick={()=>{setDensity(d); setMenu(null);}}>
                  {d} {density===d?'✓':''}
                </button>
              ))}
            </div>
          )}
          {menu==='rows' && (
            <div className="menu" style={{position:'absolute',top:40,right:0,background:'#fff',border:'1px solid var(--wr-border)',borderRadius:8,boxShadow:'var(--wr-shadow-sm)',padding:8,minWidth:220,zIndex:10}} onMouseLeave={()=>setMenu(null)}>
              {[25,50,100,200].map(n=>(
                <button key={n} style={{display:'flex',width:'100%',justifyContent:'space-between',padding:'6px 8px',fontSize:13,background:'transparent',border:0,cursor:'pointer'}} onClick={()=>{setPerPage(n); setPage(1); setMenu(null);}}>
                  {n} {perPage===n?'✓':''}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {chip('Ranked',    fRanked===true,  ()=>setFRanked(fRanked===true?null:true))}
          {chip('Not Ranked',fRanked===false, ()=>setFRanked(fRanked===false?null:false))}
          {chip('In Tracker',fTracked===true, ()=>setFTracked(fTracked===true?null:true))}
          {chip('Untracked', fTracked===false,()=>setFTracked(fTracked===false?null:false))}
          {chip('With Competitors', fComps, ()=>setFComps(v=>!v))}
        </div>
        <button className="chip" onClick={()=>{ setFRanked(null); setFTracked(null); setFComps(false); setSearch(''); }}>Clear All</button>
      </div>

      {/* Bulk bar */}
      {selected.size>0 && (
        <div className="bulk-bar">
          <div><strong>{selected.size}</strong> selected</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button className="chip" onClick={()=>alert('Assign Task')}><ClipboardList size={14}/> Task</button>
            <button className="chip" onClick={()=>exportRowsCSV(rows.filter(r=>selected.has(r.id)))}><Download size={14}/> Export</button>
            <button className="chip" onClick={()=>alert('Add to Tracking')}><Plus size={14}/> Add</button>
            <button className="chip" onClick={()=>{ if(confirm(`Remove ${selected.size} rows?`)){ /* integrate delete */ }}}><Trash2 size={14}/> Remove</button>
            <button className="chip" onClick={()=>setSelected(new Set())}>Deselect all</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{width:52,textAlign:'center'}}>
                <input type="checkbox" aria-label="Select page" checked={pageRows.length>0 && pageRows.every(r=>selected.has(r.id))}
                  onChange={(e)=>{
                    if (e.target.checked) setSelected(s=>{const n=new Set(s); pageRows.forEach(r=>n.add(r.id)); return n;});
                    else setSelected(s=>{const n=new Set(s); pageRows.forEach(r=>n.delete(r.id)); return n;});
                  }}/>
              </th>
              <th className="kw-head" style={{minWidth:260,maxWidth:420}}>Keyword</th>
              {cols.volume      && <th style={{textAlign:'right',width:110,cursor:'pointer'}} onClick={()=>setSort(s=>({key:'volume',dir:s.key==='volume'&&s.dir==='asc'?'desc':'asc'}))}>Search Volume</th>}
              {cols.rank        && <th style={{textAlign:'center',width:110,cursor:'pointer'}} onClick={()=>setSort(s=>({key:'rank',dir:s.key==='rank'&&s.dir==='asc'?'desc':'asc'}))}>Rank</th>}
              {cols.url         && <th style={{minWidth:240,maxWidth:420}}>Ranking URL</th>}
              {cols.competitors && <th style={{width:220}}>Competitors</th>}
              {cols.inTracker   && <th style={{width:140,textAlign:'center'}}>In Tracker?</th>}
              {cols.add         && <th style={{width:56,textAlign:'center'}}>Add</th>}
              {cols.serp        && <th style={{width:56,textAlign:'center'}}>SERP</th>}
              {cols.actions     && <th style={{width:164,textAlign:'center'}}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r=>{
              const isSel=selected.has(r.id);
              const bucket=bucketLabel(r.rank);
              return (
                <React.Fragment key={r.id}>
                  <tr>
                    <td style={{width:52,textAlign:'center'}}>
                      <input type="checkbox" aria-label={`Select keyword ${r.keyword}`} checked={isSel}
                        onChange={(e)=>setSelected(s=>{const n=new Set(s); e.target.checked?n.add(r.id):n.delete(r.id); return n;})}/>
                    </td>
                    <td className="kw-cell" style={{minWidth:260,maxWidth:420}}>
                      <button className="chip" onClick={()=>setExp(v=>!v)}>{exp?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button>{" "}
                      <strong>{r.keyword}</strong>
                      <div className="muted" style={{fontSize:12}}>{r.device==='desktop'?'🖥':'📱'} {r.locationISO}</div>
                    </td>
                    {cols.volume && <td style={{textAlign:'right'}} title="Source: SE Ranking • Last sync: Aug 24, 2025">{r.volume? nf(r.volume):'—'}</td>}
                    {cols.rank && (
                      <td style={{textAlign:'center'}}>
                        <span style={{color:(r.rank!=null && r.rank<=100)?'var(--wr-value-blue)':'var(--wr-danger)'}}>{rankCell(r.rank)}</span>
                        {bucket && <span className="bucket" title="Based on today’s best rank">{bucket}</span>}
                      </td>
                    )}
                    {cols.url && (
                      <td style={{minWidth:240,maxWidth:420}}>
                        {r.url ? (
                          <a href={r.url} onClick={(e)=>e.preventDefault()} style={{color:'var(--wr-value-blue)',textDecoration:'none'}} title={r.url}>
                            {r.url} <ExternalLink size={14}/>
                          </a>
                        ) : <span className="muted">—</span>}
                      </td>
                    )}
                    {cols.competitors && (
                      <td>
                        {(r.competitors||[]).length ? (r.competitors||[]).slice(0,3).map((c,i)=>(
                          <span key={i} className="chip" title={`${c.domain} → #${c.rank??'—'}`} style={{marginRight:6}}>
                            {c.domain} {c.rank?`#${c.rank}`:'—'}
                          </span>
                        )) : <span className="muted">—</span>}
                      </td>
                    )}
                    {cols.inTracker && <td style={{textAlign:'center'}}>{r.inTracker ? <span className="chip" style={{boxShadow:'inset 0 0 0 1px var(--wr-value-blue)'}}>Yes</span> : <span className="chip">No</span>}</td>}
                    {cols.add && <td style={{textAlign:'center'}}><button className="iconbtn" title="Add to Tracking" disabled={r.inTracker} onClick={()=>alert(`Add "${r.keyword}" to tracking`)}><Plus size={16}/></button></td>}
                    {cols.serp && <td style={{textAlign:'center'}}><button className="iconbtn" title={`Open SERP preview for ${r.keyword}`} onClick={()=>alert('SERP Preview')}>🔍</button></td>}
                    {cols.actions && (
                      <td style={{textAlign:'center'}}>
                        <div style={{display:'flex',justifyContent:'center',gap:8}}>
                          <button className="iconbtn" title="Assign Task" onClick={()=>alert(`Task for ${r.keyword}`)}><ClipboardList size={16}/></button>
                          <button className="iconbtn" title="Drilldown" onClick={()=>alert('Drilldown')}><BarChart3 size={16}/></button>
                          <button className="iconbtn" title="Remove row" onClick={()=>alert('Remove (demo)')}><Trash2 size={16}/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {exp && (
                    <tr>
                      <td colSpan={12} style={{padding:12,borderTop:'1px solid var(--wr-border)',background:'#fff'}}>
                        <div className="muted" style={{fontSize:13}}>Expand area — SERP Top (free 3 / premium 5), snippet, competitor highlights, quick actions.</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'8px'}}>
        <span className="muted" style={{fontSize:12}}>Page {page} of {totalPages}</span>
        <button className="chip" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
        <button className="chip" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next</button>
      </div>
    </div>
  );

  function exportRowsCSV(rs:CheckerRow[]){
    const headers=["Keyword","Volume","Device","Location","Rank","URL","In Tracker?","Competitors"];
    const lines=rs.map(r=>[
      r.keyword, r.volume??"", r.device, r.locationISO, r.rank??"", r.url??"",
      r.inTracker?"Yes":"No", (r.competitors||[]).map(c=>`${c.domain}#${c.rank??'—'}`).join("|")
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
    const csv=[headers.join(","),...lines].join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="rank_checker_results.csv"; a.click(); URL.revokeObjectURL(url);
  }
}

/* ========================================================================== */
/* TAB CONTAINER — WIRE EVERYTHING                                            */
/* ========================================================================== */
export default function RankCheckerTab(){
  const [panelH,setPanelH]=useState(0);
  const [state,setState]=useState<InputPanelState>({
    keywords:[], device:'desktop', locationISO:'IN', competitors:[], plan:'free',
    limits:{manual:5,csv:50}, isSubmitting:false, cachedAt:null, tw:'30d'
  });
  const [rows,setRows]=useState<CheckerRow[]>([]);

  async function onSubmit(payload:SubmitPayload){
    setState(s=>({...s,isSubmitting:true}));
    const r=await runRankCheck(payload);
    setRows(r);
    setState(s=>({...s,isSubmitting:false,cachedAt:new Date().toISOString()}));

    // Update KPI history
    const ranked=r.filter(x=>x.rank!=null && x.rank<=100);
    const avg=ranked.length? Number((ranked.reduce((a,b)=>a+(b.rank||0),0)/ranked.length).toFixed(1)) : null;
    const h=loadHist(payload.device,payload.locationISO);
    h.counts=[...h.counts,r.length].slice(-10);
    h.coverage=[...h.coverage,(r.length? ranked.length/r.length*100:0)].slice(-10);
    h.avg=[...h.avg, avg].slice(-10);
    const day=new Date().toISOString().slice(0,10);
    const newly=r.filter(x=>!x.inTracker && x.rank!=null && x.rank<=100).length;
    h.newly7d[day]=Math.max(newly,h.newly7d[day]||0);
    saveHist(payload.device,payload.locationISO,h);
  }

  const hist=loadHist(state.device,state.locationISO);
  const rankedOnly=rows.filter(x=>x.rank!=null && x.rank<=100);
  const avgCur=rankedOnly.length? Number((rankedOnly.reduce((a,b)=>a+(b.rank||0),0)/rankedOnly.length).toFixed(1)) : null;
  const last7=(()=>{const d:string[]=[];const c:number[]=[];for(let i=6;i>=0;i--){const dt=new Date(); dt.setDate(dt.getDate()-i); const iso=dt.toISOString().slice(0,10); d.push(iso); c.push(hist.newly7d[iso]||0);}return{dates:d,counts:c};})();

  function exportKpi(){
    const data = [
      ["Metric","Value"],
      ["Checked", rows.length],
      ["Ranked ≤100", rankedOnly.length],
      ["Coverage %", rows.length? (rankedOnly.length/rows.length*100).toFixed(1): "0.0"],
      ["Avg Position", avgCur ?? "—"]
    ];
    const csv = data.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="rank_checker_kpi.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
      <GlobalStyles/>
      <div className="">
        {/* Section 1 — Input panel */}
        <RankCheckerInputPanel
          state={state} setState={setState}
          onSubmit={onSubmit}
          onClearResults={()=>setRows([])}
          onResetForm={()=>{ setState(s=>({...s,keywords:[],competitors:[],device:'desktop',locationISO:'IN'})); }}
          onHeightChange={setPanelH}
        />

        {/* Section 2 — KPI row (only after results) */}
        {rows.length>0 && (
          <div style={{margin:'12px 0'}}>
            <RankCheckerKpiRow
              checked={rows.length} ranked={rankedOnly.length}
              avgCurrent={avgCur} avgHistory={hist.avg}
              counts10={hist.counts} coverage10={hist.coverage} newly7d={last7}
              onExport={exportKpi}
            />
          </div>
        )}

        {/* Section 3 — Results table */}
        <RankCheckerResultsTable rows={rows} topOffset={panelH}/>
      </div>
    </>
  );
}