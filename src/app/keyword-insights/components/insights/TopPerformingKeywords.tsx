import { Pagination, Spin, Alert, Popover } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";

/****************************
 * Lightweight UI Primitives *
 ****************************/
const BaseCSS = `
:root{
  --wr-brand:#008CCD; --wr-value:#0077FF; --wr-icon:#9E9E9E;
  --wr-text:#111827; --wr-muted:#6B7280; --wr-bg:#FFFFFF; --wr-bg-subtle:#F5F7FA;
  --wr-border:#EFF0F6; --wr-border-strong:#E5E7EB; --wr-radius:6px;
  --wr-critical:#E94134; --wr-warning:#F9BB04; --wr-good:#34A853; --wr-info:#4286F5;
}
*{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial;color:var(--wr-text)}
.wr-card{background:#fff;border:1px solid var(--wr-border);border-radius:var(--wr-radius);box-shadow:0 1px 2px rgba(17,24,39,.06)}
.wr-hdr{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--wr-border)}
.wr-title{font-size:16px;font-weight:600}
.wr-content{padding:12px 16px}
.btn{height:32px;padding:0 12px;border-radius:6px;border:1px solid var(--wr-border);background:#fff;cursor:pointer;display:inline-flex;gap:8px;align-items:center}
.btn:hover{background:#F7FAFC}
.btn.primary{background:var(--wr-brand);border-color:var(--wr-brand);color:#fff}
.btn.outline{background:#fff;border:1px solid var(--wr-border)}
.input{height:32px;border:1px solid var(--wr-border);border-radius:6px;padding:0 10px}
.select{height:32px;border:1px solid var(--wr-border);border-radius:6px;padding:0 10px;background:#fff}
.chk{width:16px;height:16px}
.switch{position:relative;display:inline-block;width:38px;height:20px}
.switch input{display:none}
.switch .track{position:absolute;inset:0;background:#E5E7EB;border-radius:999px;transition:.2s}
.switch .thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:.2s}
.switch input:checked + .track{background:var(--wr-value)}
.switch input:checked + .track + .thumb{left:20px}
.tableWrap{max-height:520px;overflow:auto;border-top:1px solid var(--wr-border)}
.table{width:100%;border-collapse:separate;border-spacing:0}
.th,.td{padding:10px 12px;border-bottom:1px solid var(--wr-border);vertical-align:middle}
.td{position:relative}
.row:hover{background:#F5F7FA}
.badge{display:inline-flex;align-items:center;gap:8px;padding:4px 8px;border:1px solid var(--wr-border);border-radius:999px;background:#fff}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:13px}
.tooltip{position:relative;display:inline-block}
.tooltip:hover .tip{display:block}
.tip{display:none;position:absolute;top:100%;left:0;margin-top:6px;background:#111827;color:#fff;font-size:12px;padding:4px 6px;border-radius:6px;white-space:nowrap;z-index:100}
.popover{position:relative;display:inline-block}
.pop-content{position:absolute;right:0;top:36px;width:320px;max-height:420px;overflow:auto;background:#fff;border:1px solid var(--wr-border);border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.08);padding:12px}
.scroll{max-height:360px;overflow:auto;padding-right:8px}
.small{font-size:12px;color:var(--wr-muted)}
.kbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
/* icon buttons: default gray → value blue on hover */
.iconBtn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;background:transparent;border-radius:6px;color:var(--wr-icon);cursor:pointer}
.iconBtn:hover{background:#F5F7FA;color:var(--wr-value)}
/* resizer for keyword column */
.resizer{position:absolute;top:0;right:0;width:6px;height:100%;cursor:col-resize;opacity:.2}
.resizer:hover{opacity:.6;background:var(--wr-border)}
/* table header should be non-sticky */
.thead{position:static;top:auto;background:#fff;z-index:auto;box-shadow:none}
`;

/*****************
 * Minimal Icons  *
 *****************/
const Icon = ({d, className}: {d: string; className?: string}) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);
const ChevronDown = (p:any)=> <Icon {...p} d="M6 9 L12 15 L18 9"/>;
const ChevronRight = (p:any)=> <Icon {...p} d="M9 18 L15 12 L9 6"/>;
const ChevronUp = (p:any)=> <Icon {...p} d="M6 15 L12 9 L18 15"/>;
const ChevronsUpDown = (p:any)=> <Icon {...p} d="M7 9 H17 M7 15 H17"/>;
const PlusCircle = (p:any)=> <Icon {...p} d="M12 5v14M5 12h14M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/>;
const ClipboardList = (p:any)=> <Icon {...p} d="M8 6h8M9 12h6M9 16h6M12 6v4"/>;
const LinkI = (p:any)=> <Icon {...p} d="M10 13a5 5 0 0 1 7 0l1 1a5 5 0 0 1-7 7l-1-1M14 11a5 5 0 0 1-7 0l-1-1a5 5 0 0 1 7-7l1 1"/>;
const SearchI = (p:any)=> <Icon {...p} d="M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-6-6"/>;

/****************
 * Helpers & Types
 ****************/
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-border, #EFF0F6)",
  textStrong: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  pastelBrand: "var(--wr-brand-pastel, #D9EEF8)",
  valueBlue: "var(--wr-value, #0077FF)",
  success: "var(--wr-good, #34A853)",
  warning: "var(--wr-warning, #F9BB04)",
  critical: "var(--wr-critical, #E94134)",
  appBg: "var(--wr-bg-subtle, #F5F7FA)",
  radius: "var(--wr-radius, 6px)",
};

/** @typedef {"desktop"|"mobile"} Device */
/** @typedef {"info"|"commercial"|"navigational"|"transactional"} Intent */

const fmtInt = (n:number|null)=> n==null?"—": new Intl.NumberFormat().format(n);
const fmtCompact = (n:number|null)=> n==null?"—": new Intl.NumberFormat(undefined,{notation:"compact"}).format(n);
const fmtPct1 = (p:number|null)=> p==null?"—": `${(Math.round(p*10)/10).toFixed(1)}%`;
const rankBucket = (r:number|null)=> { if (r==null) return "Not Ranked"; if (r<=3) return "Top 3"; if (r<=10) return "Top 10"; if (r<=20) return "Top 20"; if (r<=50) return "Top 50"; if (r<=100) return "Top 100"; return "Not Ranked"; };
const addDays = (d:Date,n:number)=>{const x=new Date(d); x.setDate(x.getDate()+n); return x};
const iso=(d:Date)=> `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

function makeKWRows(count=180){
  const intents=["info","commercial","navigational","transactional"]; const rows:any[]=[];
  for(let i=0;i<count;i++){
    const clicks=Math.floor(60+Math.random()*1400); const impr=Math.floor(1200+Math.random()*38000);
    const ctr=clicks/Math.max(1,impr)*100; const avg=Math.round((1+Math.random()*49)*10)/10;
    const maybe=(p=4000)=> Math.random()<.2? null : Math.round(Math.random()*p);
    rows.push({
      id:`kw-${i+1}`, keyword:`seo audit tool ${i+1}`, device: Math.random()>.2?"desktop":"mobile", locationISO:"US",
      landingUrl:`https://example.com/path/${i+1}/very-long-url-slug-that-truncates`,
      gscClicks:clicks, gscImpr:impr, ctrPct:ctr, avgPos:avg,
      ga4Sessions:maybe(1600), conversions:maybe(80), convRatePct:Math.random()<.2?null:Math.round(Math.random()*120)/10, revenue:maybe(5000),
      rank:Math.random()<.1?null:Math.floor(1+Math.random()*95), delta7d:Math.floor(-10+Math.random()*20), volume:Math.floor(100+Math.random()*9000),
      intent:intents[Math.floor(Math.random()*4)], tracked: Math.random()>.3,
      sparkClicks30d:Array.from({length:30},()=> Math.floor(5+Math.random()*50)),
    })
  }
  return rows;
}

const columnDescriptions: Record<string,string> = {
  select:"Select rows for bulk actions.", expander:"Expand for keyword details and actions.", keyword:"Tracked keyword. Click to drill deeper.", deviceLoc:"Device and Country scope of metrics.", landing:"Landing page (from GSC joins).",
  gscClicks:"GSC Clicks in selected time window.", gscImpr:"GSC Impressions in selected time window.", ctrPct:"CTR = Clicks ÷ Impressions (as %).", avgPos:"Average Position from GSC (lower is better).",
  ga4Sessions:"GA4 Sessions (≈ heuristic attribution).", conversions:"GA4 Conversions (selected events).", convRatePct:"Conversion Rate = Conversions ÷ Sessions.", revenue:"Revenue in selected currency.",
  rank:"Today’s Rank from SE Ranking. Bucket shown.", delta7d:"Rank change vs 7 days ago (↑ good / ↓ bad).", volume:"Monthly search volume (SE Ranking).", intent:"Search intent classification.", actions:"Quick actions: Track, Task, SERP, Page."
};

const Sticky = (key:string)=> key==="select"?{position:'sticky' as const,left:0,zIndex:40,background:'#fff',boxShadow:'inset -1px 0 0 rgba(0,0,0,.06)'}
  : key==="expander"?{position:'sticky' as const,left:36,zIndex:40,background:'#fff',boxShadow:'inset -1px 0 0 rgba(0,0,0,.06)'}
  : key==="keyword"?{position:'sticky' as const,left:72,zIndex:30,background:'#fff',boxShadow:'inset -1px 0 0 rgba(0,0,0,.06)'}
  : {};

/***********************
 * Interactive Sparkline * (with hover tooltip)
 ***********************/
function SparkInteractive({ values }:{ values:number[] }){
  const w=340, h=84, pad=8, len=values.length;
  const dates = useMemo(()=>{
    const start=addDays(new Date(), -(len-1));
    return Array.from({length:len},(_,i)=> iso(addDays(start,i)));
  },[len]);
  const min = Math.min(...values), max=Math.max(...values);
  const x=(i:number)=> pad + (i*(w-2*pad))/Math.max(1,(len-1));
  const y=(v:number)=> h-pad - ((v-min)/(max-min||1))*(h-2*pad);
  let path=`M ${x(0)} ${y(values[0]||0)}`; for(let i=1;i<len;i++) path+=` L ${x(i)} ${y(values[i]||0)}`;

  const ref=useRef<SVGSVGElement|null>(null);
  const [hover, setHover]=useState<{i:number; cx:number; cy:number} | null>(null);
  const onMove=(e:React.MouseEvent<SVGSVGElement>)=>{
    if(!ref.current || len===0) return;
    const r=ref.current.getBoundingClientRect();
    const relX=Math.max(pad, Math.min(w-pad, e.clientX-r.left));
    const idx=Math.round(((relX-pad)/(w-2*pad))*((len-1)||0));
    setHover({ i:idx, cx:x(idx), cy:y(values[idx]||0) });
  };
  return (
    <div style={{position:'relative'}}>
      <svg ref={ref} viewBox={`0 0 ${w} ${h}`} width={w} height={h} onMouseMove={onMove} onMouseLeave={()=>setHover(null)}>
        <defs>
          <linearGradient id="spfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TOKENS.valueBlue} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={TOKENS.valueBlue} stopOpacity="0.05"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={w} height={h} fill="#fff"/>
        <path d={`${path} L ${x(len-1)} ${h-pad} L ${x(0)} ${h-pad} Z`} fill="url(#spfill)" stroke={TOKENS.valueBlue} strokeWidth="2"/>
        {hover && (<>
          <line x1={hover.cx} x2={hover.cx} y1={pad} y2={h-pad} stroke="#E5E7EB"/>
          <circle cx={hover.cx} cy={hover.cy} r="3.5" fill={TOKENS.valueBlue} stroke="#fff" strokeWidth="2"/>
        </>)}
      </svg>
      {hover && (
        <div style={{position:'absolute', left:hover.cx, top:hover.cy, transform:'translate(-50%,-110%)', background:'#111827', color:'#fff', fontSize:12, borderRadius:6, padding:'4px 6px', whiteSpace:'nowrap'}}>
          {new Date(dates[hover.i]+"T00:00:00").toLocaleDateString(undefined,{month:'short', day:'2-digit'})}
          {" — "}<b>{values[hover.i]}</b>
        </div>
      )}
    </div>
  );
}


export default function Demo(){
  return <PerformanceKeywordsTable/>;
}

export function PerformanceKeywordsTable({
  data,
  projectId,
  startDate,
  endDate,
} : { 
  data?: any
  projectId?: number;         
  startDate?: string;      
  endDate?: string;         
 }){

const [currentPage, setCurrentPage] = useState<number>(data?.data?.current_page ?? 1);
const pageSizeServer = 50; // your API returns 50 per page (fixed)
const totalRecords = data?.data?.total_records ?? 0;
const totalPages = data?.data?.total_pages ?? Math.max(1, Math.ceil(totalRecords / pageSizeServer));

// keep current page’s rows separate from client filters/sort
const [serverRows, setServerRows] = useState<any[] | null>(data?.data?.keywords ?? null);
const [serverLoading, setServerLoading] = useState<boolean>(false);
const [serverError, setServerError] = useState<string | null>(null);

const rows = useMemo(() => {
  // prefer serverRows (current page) → fall back to generated demo if nothing
  if (serverRows && serverRows.length) return serverRows;
  if (data?.data?.keywords?.length) return serverRows ?? [];
  return makeKWRows(); // demo mode only
}, [serverRows, data]);


  // filters
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all");
  const [intent, setIntent] = useState("all");
  const [trackedOnly, setTrackedOnly] = useState(false);

  // selections
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(()=> Object.keys(selected).filter(id=> selected[id]), [selected]);

  // expand
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id:string)=> setExpanded(prev=>{ if(multiExpand) return {...prev,[id]:!prev[id]}; const next:Record<string,boolean>={}; if(!prev[id]) next[id]=true; return next;});

  // infinite/pagination
  const [infinite, setInfinite] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(data?.data?.keywords?.length);

  // sorting
  const [sortKey, setSortKey] = useState("conversions");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const toggleSort = (key:string)=>{ if(["select","expander","actions"].includes(key)) return; if(sortKey!==key){setSortKey(key); setSortDir("asc");} else {setSortDir(d=> d==="asc"?"desc":"asc");} };

  // columns
  const columns = [
    { key:"select", label:"", width:36, align:"center" },
    { key:"expander", label:"", width:36, align:"center" },
    { key:"keyword", label:"Keyword", width:0, sortable:true },
    { key:"deviceLoc", label:"Device / Location", width:140 },
    { key:"landing", label:"Landing Page", width:320, sortable:true },
    { key:"gscClicks", label:"GSC Clicks", width:110, sortable:true },
    { key:"gscImpr", label:"GSC Impr.", width:110, sortable:true },
    { key:"ctrPct", label:"CTR", width:90, sortable:true },
    { key:"avgPos", label:"Avg Pos. (GSC)", width:120, sortable:true },
    { key:"ga4Sessions", label:"GA4 Sessions ≈", width:130, sortable:true },
    { key:"conversions", label:"Conversions", width:120, sortable:true },
    { key:"convRatePct", label:"Conv Rate", width:110, sortable:true },
    { key:"revenue", label:"Revenue", width:120, sortable:true },
    { key:"rank", label:"Today’s Rank", width:130, sortable:true },
    { key:"delta7d", label:"Change 7d", width:110, sortable:true },
    { key:"volume", label:"Volume", width:110, sortable:true },
    { key:"intent", label:"Intent", width:130, sortable:true },
    { key:"actions", label:"Actions", width:220, align:"left" },
  ];
  const [visibleCols, setVisibleCols] = useState(()=>{ const v:any={}; columns.forEach(c=> v[c.key]=true); v.revenue=false; return v; });
  const visibleColumns = useMemo(()=> columns.filter(c=> visibleCols[c.key]!==false), [visibleCols]);

  // resizable Keyword column
  const [kwWidth,setKwWidth] = useState(300);
  const kwMin=200, kwMax=600;
  const [resizing,setResizing] = useState(false);
  const startXRef = useRef(0);
  const startWRef = useRef(300);

  useEffect(()=>{ if(!infinite) return; const el=document.getElementById("kw-scroll-sentinel"); if(!el) return; const obs=new IntersectionObserver((e)=>{ if(e[0].isIntersecting) setVisibleCount(v=> Math.min(sorted.length, v+50)); }); obs.observe(el); return ()=> obs.disconnect(); }, [infinite]);

  useEffect(()=>{ const onMove=(e:MouseEvent)=>{ if(!resizing) return; const dx=e.clientX-startXRef.current; let w=startWRef.current+dx; w=Math.max(kwMin, Math.min(kwMax, w)); setKwWidth(w); }; const onUp=()=> setResizing(false); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); return ()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);} }, [resizing]);

  // pipeline
  const filtered = useMemo(()=> rows.filter(r=>{
    if(query && !(r.keyword.toLowerCase().includes(query.toLowerCase()) || r.landingUrl.toLowerCase().includes(query.toLowerCase()))) return false;
    if(trackedOnly && !r.tracked) return false;
    if(bucket!=="all"){ const b=rankBucket(r.rank).replace(" ","").toLowerCase(); const want = bucket==="not"?"notranked":bucket; if(b!==want) return false; }
    if(intent!=="all" && r.intent!==intent) return false; return true;
  }), [rows,query,trackedOnly,bucket,intent]);

  const sorted = useMemo(()=>{
    const get=(r:any,k:string)=>{
      switch(k){
        case "keyword": return r.keyword; case "landing": return r.landingUrl; case "deviceLoc": return `${r.device}-${r.locationISO}`;
        case "gscClicks": return r.gscClicks ?? -Infinity; case "gscImpr": return r.gscImpr ?? -Infinity; case "ctrPct": return r.ctrPct ?? -Infinity; case "avgPos": return r.avgPos ?? Infinity;
        case "ga4Sessions": return r.ga4Sessions ?? -Infinity; case "conversions": return r.conversions ?? -Infinity; case "convRatePct": return r.convRatePct ?? -Infinity; case "revenue": return r.revenue ?? -Infinity;
        case "rank": return r.rank==null? Infinity : r.rank; case "delta7d": return r.delta7d ?? 0; case "volume": return r.volume ?? -Infinity; case "intent": return r.intent ?? ""; default: return 0;
      }
    };
    const arr=[...filtered]; arr.sort((a,b)=>{ const av=get(a,sortKey), bv=get(b,sortKey); if(av===bv) return 0; return sortDir==="asc"? (av>bv?1:-1) : (av<bv?1:-1); }); return arr;
  }, [filtered,sortKey,sortDir]);

  const windowedRows = useMemo(()=> { if(infinite) return sorted.slice(0,visibleCount); const start=(page-1)*pageSize; return sorted.slice(start, start+pageSize); }, [sorted,infinite,visibleCount,page,pageSize]);

  const visibleIds = windowedRows.map(r=> r.id);
  const allVisibleSelected = visibleIds.length>0 && visibleIds.every(id=> selected[id]);
  const someVisibleSelected = visibleIds.some(id=> selected[id]) && !allVisibleSelected;

  const exportCSV = (onlySelected=false)=>{
    const cols=["keyword","device","locationISO","landingUrl","gscClicks","gscImpr","ctrPct","avgPos","ga4Sessions","conversions","convRatePct","revenue","rank","delta7d","volume","intent"] as const;
    const dataset = onlySelected? sorted.filter(r=> !!selected[r.id]) : sorted;
    const header = cols.join(",");
    const lines = dataset.map(r => cols.map(k => JSON.stringify((r as any)[k] ?? "")).join(",")).join("\n");
    const csv = header + "\n" + lines;
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const a=document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected?"keywords-selected.csv":"keywords.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const clearAllFilters = ()=>{ setQuery(""); setBucket("all"); setIntent("all"); setTrackedOnly(false); };

async function fetchPerformancePage(page: number) {
  if (!projectId || !startDate || !endDate) return; // silently skip if not available
  try {
    setServerLoading(true);
    setServerError(null);
    const res = await fetch("https://dashboard.wranker.com/api/performance/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(typeof window !== "undefined" && (window as any).token
          ? { Authorization: `Bearer ${(window as any).token}` }
          : {}),
      },
      body: JSON.stringify({
        project_id: projectId,
        start_date: startDate,
        end_date: endDate,
        page,                     // ✅ send "page"
      }),
    });
    if (!res.ok) throw new Error(`performance HTTP ${res.status}`);
    const dto = await res.json();

    // map dto.data.keywords → internal rows (same shape as initial)
    const mapped = (dto?.data?.keywords ?? []).map((k: any, i: number) => ({
      id: `kw-${(page - 1) * pageSizeServer + (i + 1)}`,
      keyword: k.keyword,
      device: "desktop",
      locationISO: "IN",
      landingUrl: k.landingUrl || "",
      gscClicks: k.gscClicks ?? 0,
      gscImpr: k.gscImpr ?? 0,
      ctrPct: k.ctrPct ?? 0,
      avgPos: k.avgPos ?? null,
      ga4Sessions: k.ga4Sessions ?? null,
      conversions: k.conversions ?? null,
      convRatePct: k.convRatePct ?? null,
      revenue: null,
      rank: k.rank ?? null,
      delta7d: null,
      volume: null,
      intent: (k.intent || "").toLowerCase() || "navigational",
      tracked: true,
      sparkClicks30d: Array.from({ length: 30 }, () => Math.max(0, Math.round((k.gscClicks || 0) / 30))),
    }));

    setServerRows(mapped);
  } catch (e: any) {
    setServerError(e?.message || "Failed to load performance page");
  } finally {
    setServerLoading(false);
  }
}

useEffect(() => {
  if (data?.data?.keywords) {
    setServerRows(data.data.keywords.map((k:any, i:number) => ({
      id: `kw-${i+1}`,
      keyword: k.keyword,
      device: 'desktop',
      locationISO: 'IN',
      landingUrl: k.landingUrl || '',
      gscClicks: k.gscClicks ?? 0,
      gscImpr: k.gscImpr ?? 0,
      ctrPct: k.ctrPct ?? 0,
      avgPos: k.avgPos ?? null,
      ga4Sessions: k.ga4Sessions ?? null,
      conversions: k.conversions ?? null,
      convRatePct: k.convRatePct ?? null,
      revenue: null,
      rank: k.rank ?? null,
      delta7d: null,
      volume: null,
      intent: (k.intent || '').toLowerCase() || 'navigational',
      tracked: true,
      sparkClicks30d: Array.from({length:30},()=> Math.max(0, Math.round((k.gscClicks||0)/30))),
    })));
  } else {
    if (projectId && startDate && endDate) fetchPerformancePage(1);
  }
}, []);

useEffect(() => {
  if (!projectId || !startDate || !endDate) return;
  fetchPerformancePage(currentPage);
}, [currentPage, projectId, startDate, endDate]);


  return (
    <section className="mt-4">
      <style>{BaseCSS}</style>

      <div className="wr-card">
        {/* Header Bar */}
        <div className="wr-hdr">
          <div className="wr-title">Keywords Performance Spotlight</div>
          <div className="kbar">
            <span className="small">Infinite</span>
            <label className="switch"><input type="checkbox" checked={infinite} onChange={e=>{ setInfinite(e.target.checked); if(e.target.checked) setVisibleCount(50); }}/><span className="track"></span><span className="thumb"></span></label>
            <span className="small">Expand multiple rows</span>
            <label className="switch"><input type="checkbox" checked={multiExpand} onChange={e=> setMultiExpand(e.target.checked) }/><span className="track"></span><span className="thumb"></span></label>

            {/* Columns popover */}
            <Popover>
              <ColumnsControl columns={columns} visibleCols={visibleCols} setVisibleCols={setVisibleCols} />
            </Popover>

            <button className="btn outline" onClick={()=> exportCSV(selectedIds.length>0)}>Export</button>
         </div>
        </div>

        {/* Bulk bar */}
        {selectedIds.length>0 && (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,padding:'8px 16px',borderTop:`1px solid ${TOKENS.border}`,background:TOKENS.pastelBrand}}>
            <div className="small" style={{color:TOKENS.textStrong}}><b>{selectedIds.length}</b> selected</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn primary">Create Tasks</button>
              <button className="btn outline" onClick={()=> exportCSV(true)}>Export Selection</button>
              <button className="btn outline" onClick={()=> setSelected({})}>Clear</button>
            </div>
          </div>
        )}



        {/* Filters Row */}
        <div className="wr-content" style={{borderTop:`1px solid ${TOKENS.border}`}}>
          <div className="kbar">
            <span className="small">Filters</span>
            <button className="btn outline" onClick={clearAllFilters}>Clear all</button>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:8,top:8,opacity:.6}}><SearchI/></span>
              <input className="input" value={query} onChange={e=> setQuery(e.target.value)} placeholder="Search keyword or URL…" style={{paddingLeft:28,width:260}}/>
            </div>
            <select className="select" value={bucket} onChange={e=> setBucket(e.target.value)}>
              {['all','top3','top10','top20','top50','top100','not'].map(k=> (
                <option key={k} value={k}>{k==='all'?'All':k==='not'?'Not Ranked':k.toUpperCase()}</option>
              ))}
            </select>
            <select className="select" value={intent} onChange={e=> setIntent(e.target.value)}>
              {['all','info','commercial','navigational','transactional'].map(k=> (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <label style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer'}}>
              <input type="checkbox" className="chk" checked={trackedOnly} onChange={e=> setTrackedOnly(e.target.checked)} /> Tracked only
            </label>
          </div>
        </div>

        {serverLoading && (
  <div className="wr-content" style={{borderTop:`1px solid ${TOKENS.border}`}}>
    <Spin /> <span className="small" style={{marginLeft:8}}>Loading page {currentPage}…</span>
  </div>
)}
{serverError && (
  <div className="wr-content" style={{borderTop:`1px solid ${TOKENS.border}`}}>
    <Alert type="error" message={serverError} showIcon />
  </div>
)}


        {/* Table */}
        <div className="wr-content" style={{padding:0}}>
          <div className="tableWrap">
            <table className="table">
              <thead className="thead">
                <tr>
                  {visibleColumns.map(c=> (
                    <th key={c.key} className="th" style={{minWidth: c.key==='keyword'? kwWidth : c.width, position:'relative', textAlign: c.align==='center'?'center': (c.align==='right'?'right':'left'), ...Sticky(c.key)}}>
                      {['select','expander'].includes(c.key)? (c.key==='select'? (
                        <div style={{display:'flex',justifyContent:'center'}}>
                          <input type="checkbox" className="chk" checked={ someVisibleSelected? true : allVisibleSelected } onChange={(e)=>{ const on=e.target.checked; const patch:Record<string,boolean>={}; visibleIds.forEach(id=> patch[id]=!!on); setSelected(s=> ({...s, ...patch})); }} />
                        </div>) : <span />) : (
                        c.sortable? (
                          <button onClick={()=> toggleSort(c.key)} style={{display:'inline-flex',alignItems:'center',gap:6,background:'transparent',border:'none',cursor:'pointer'}}>
                            <span>{c.label}</span>
                            {sortKey===c.key? (sortDir==='asc'? <ChevronUp/> : <ChevronDown/>) : <ChevronsUpDown style={{opacity:.5}}/>}
                          </button>
                        ) : (
                          <span className="tooltip">{c.label}<span className="tip">{columnDescriptions[c.key]}</span></span>
                        )
                      )}
                      {c.key==='keyword' && (
                        <span className="resizer" onMouseDown={(e)=>{ startXRef.current=e.clientX; startWRef.current=kwWidth; setResizing(true); }} />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {windowedRows.map(row=> (
                  <React.Fragment key={row.id}>
                    <tr className="row">
                      {visibleCols.select!==false && (
                        <td className="td" style={Sticky('select')}>
                          <input type="checkbox" className="chk" checked={!!selected[row.id]} onChange={(e)=> setSelected(s=> ({...s, [row.id]: !!e.target.checked}))}/>
                        </td>
                      )}
                      {visibleCols.expander!==false && (
                        <td className="td" style={Sticky('expander')}>
                          <button onClick={()=> toggleExpand(row.id)} className="iconBtn" aria-label={expanded[row.id]?"Collapse":"Expand"}>
                            {expanded[row.id]? <ChevronDown/> : <ChevronRight/>}
                          </button>
                        </td>
                      )}
                      {visibleCols.keyword!==false && (
                        <td className="td" style={Sticky('keyword')}><span style={{fontWeight:600}}>{row.keyword}</span></td>
                      )}
                      {/* {visibleCols.deviceLoc!==false && (<td className="td small">{row.device.toUpperCase()} · {row.locationISO}</td>)} */}
                      {visibleCols.landing!==false && (
                        <td className="td"><a href={row.landingUrl} target="_blank" rel="noreferrer" style={{color:TOKENS.valueBlue,textDecoration:'underline',display:'inline-block',maxWidth:360,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{row.landingUrl}</a></td>
                      )}
                      {visibleCols.gscClicks!==false && (<td className="td">{fmtInt(row.gscClicks)}</td>)}
                      {visibleCols.gscImpr!==false && (<td className="td">{fmtCompact(row.gscImpr)}</td>)}
                      {visibleCols.ctrPct!==false && (<td className="td">{fmtPct1(row.ctrPct)}</td>)}
                      {visibleCols.avgPos!==false && (<td className="td">{row.avgPos==null?"—": (Math.round(row.avgPos*10)/10).toFixed(1)}</td>)}
                      {visibleCols.ga4Sessions!==false && (<td className="td">{fmtInt(row.ga4Sessions)}</td>)}
                      {visibleCols.conversions!==false && (<td className="td">{fmtInt(row.conversions)}</td>)}
                      {visibleCols.convRatePct!==false && (<td className="td">{fmtPct1(row.convRatePct)}</td>)}
                      {visibleCols.revenue!==false && (<td className="td">{row.revenue==null?"—": new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(row.revenue)}</td>)}
                      {visibleCols.rank!==false && (
                        <td className="td">{row.rank==null? (<span className="badge" style={{color:'#d32f2f'}}>Not Ranked</span>) : (
                          <span className="badge">#{row.rank} <span className="small">{rankBucket(row.rank)}</span></span>
                        )}</td>
                      )}
                      {visibleCols.delta7d!==false && (
                        <td className="td">{row.delta7d==null?"—": (
                          <span style={{color: row.delta7d<0? TOKENS.success : row.delta7d>0? TOKENS.critical : TOKENS.muted}}>
                            {row.delta7d===0?"↔": (row.delta7d<0?"↑":"↓")} {Math.abs(row.delta7d)}
                          </span>
                        )}</td>
                      )}
                      {visibleCols.volume!==false && (<td className="td">{fmtCompact(row.volume)}</td>)}
                      {visibleCols.intent!==false && (<td className="td"><span className="pill"><span style={{width:10,height:10,borderRadius:2,display:'inline-block',backgroundColor: row.intent==="commercial"?TOKENS.success : row.intent==="transactional"?TOKENS.critical : row.intent==="navigational"?TOKENS.warning : TOKENS.valueBlue}}/> {row.intent||"—"}</span></td>)}
                      {visibleCols.actions!==false && (
                        <td className="td">
                          <div style={{display:'inline-flex',gap:6,alignItems:'center'}}>
                            <button className="iconBtn" title="Track"><PlusCircle/></button>
                            <button className="iconBtn" title="Create Task"><ClipboardList/></button>
                            <button className="iconBtn" title="SERP"><SearchI/></button>
                            <button className="iconBtn" title="Open Page" onClick={()=> window.open(row.landingUrl,'_blank')}><LinkI/></button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {expanded[row.id] && (
                      <tr><td className="td" colSpan={visibleColumns.length}>
                        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,padding:16,border:`1px solid ${TOKENS.border}`,borderRadius:8,background:TOKENS.appBg}}>
                          <div>
                            <div className="small" style={{marginBottom:4}}>Clicks (GSC) · last 30 days</div>
                            <SparkInteractive values={row.sparkClicks30d} />
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr',rowGap:8}}>
                            <div>
                              <div className="small">Keyword</div>
                              <div style={{fontSize:14,fontWeight:600}}>{row.keyword}</div>
                            </div>
                            <div>
                              <div className="small">Signals</div>
                              <ul className="small" style={{marginLeft:16}}>
                                <li>CTR {fmtPct1(row.ctrPct)}</li>
                                <li>Avg Pos {row.avgPos==null?"—": (Math.round(row.avgPos*10)/10).toFixed(1)}</li>
                                <li>Volume {fmtCompact(row.volume)}</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {infinite && <div id="kw-scroll-sentinel" style={{height:8}}/>}
          </div>
        </div>

{/* Server-side pagination (AntD) */}
<div className="wr-content" style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:`1px solid ${TOKENS.border}`}}>
  <div className="small">
    Total keywords: <b>{fmtInt(totalRecords)}</b> · Pages: <b>{fmtInt(totalPages)}</b> · Page size: <b>{pageSizeServer}</b>
  </div>
  <Pagination
    current={currentPage}
    pageSize={pageSizeServer}
    total={totalRecords}
    showSizeChanger={false} 
    onChange={(p) => setCurrentPage(p)}
  />
</div>

      </div>
    </section>
  );
}

function ColumnsControl({columns, visibleCols, setVisibleCols}:{columns:any[], visibleCols:any, setVisibleCols:any}){
  const [open,setOpen]=useState(false);
  return (
    <div className="popover">
      <button className="btn outline" onClick={()=> setOpen(o=>!o)}><ChevronsUpDown/> Columns</button>
      {open && (
        <div className="pop-content" style={{right:0}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Show / Hide Columns</div>
          <div className="scroll">
            {columns.map(c=> (
              <label key={c.key} style={{display:'flex',alignItems:'center',gap:8,fontSize:14,marginBottom:8}}>
                <input type="checkbox" className="chk" checked={visibleCols[c.key]!==false} onChange={(e)=> setVisibleCols((s:any)=> ({...s,[c.key]: e.target.checked}))} />
                <span>{c.label||c.key}</span>
              </label>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}>
            <button className="btn outline" onClick={()=>{ const v:any={}; columns.forEach(c=> v[c.key]=true); v.revenue=false; setVisibleCols(v); }}>Reset</button>
            <button className="btn primary" onClick={()=> setOpen(false)}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}


