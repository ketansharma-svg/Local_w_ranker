import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  ChevronsUpDown, ChevronDown, ChevronRight,
  Search, RefreshCw, SlidersHorizontal, Filter, Download, TrendingUp,
  X, Settings2, Users2, Plus, ClipboardList, Search as SearchIcon, ExternalLink, ChevronLeft, ChevronRight as ChevronRightIcon
} from "lucide-react";
import KeywordDrilldown from "../drawer/KeywordDrilldown";

/* ====== TOKENS (updated brand) ====== */
const TOKENS = {
  brand: "#008CCD",
  chartBlue: "#008CCD",
  chartFill: "#D2EFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  hover: "#FAFAFA",
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  chipBg: "#F5F7FA",
  radius: "6px",
};

/* ====== Types ====== */
type Device = "desktop" | "mobile";
type Intent = "Informational" | "Commercial" | "Transactional";
type OppType =
  | "LOW_HANGING" | "QUICK_WIN" | "NEWLY_RANKED" | "DECLINER"
  | "CANNIBALIZED" | "UNASSIGNED_LP" | "LOW_COMPETITION"
  | "COMPETITOR_WINS" | "TRENDING" | "HIGH_INTENT";

type SerpItem = { rank: number; title: string; url: string; domain: string };

interface OpportunityRow {
  id: string;
  keyword: string;
  intent: Intent;
  volume: number | null;
  rank: number | null;                   // null => >100
  device: Device;
  locationISO: string;
  trafficPotential: number | null;       // volume * CTR(rank)
  projectedTopTarget: number | null;     // volume * CTR(target)
  lift: number | null;                   // projectedTopTarget - trafficPotential
  oppScore: number;                      // 0..100
  oppTypes: OppType[];                   // primary first
  recommendedAction: string;
  source: Array<"GSC"|"SERANKING"|"COMPETITOR"|"TRACKER"|"SERP">;
  pageUrl?: string | null;
  competitors?: Array<{ domain: string; rank: number | null }>;
  serpPreview?: SerpItem[];              // Top results for expand (Top 3 free)
  isTracked: boolean;
  bucket?: "TOP_3"|"TOP_10"|"TOP_20"|"TOP_50"|"TOP_100"|"UNRANKED";
}

/* ====== CTR model & helpers ====== */
const CTR = (pos: number | null) => {
  if (pos == null || pos > 100) return 0;
  if (pos === 1) return 0.28;
  if (pos === 2) return 0.15;
  if (pos === 3) return 0.11;
  if (pos >= 4 && pos <= 5) return pos === 4 ? 0.08 : 0.07;
  if (pos >= 6 && pos <= 10) return 0.04;
  if (pos >= 11 && pos <= 20) return 0.015;
  if (pos >= 21 && pos <= 50) return 0.005;
  return 0;
};
const CTR_TARGET = (t: 1|3|5) => (t === 1 ? 0.28 : t === 3 ? 0.11 : 0.07);

const nf = (n:number) => new Intl.NumberFormat().format(n);
const compact = (n:number) =>
  new Intl.NumberFormat(undefined, { notation:"compact", maximumFractionDigits:1 }).format(n);

const rankBucket = (r:number|null): OpportunityRow["bucket"] => {
  if (r==null || r>100) return "UNRANKED";
  if (r<=3) return "TOP_3";
  if (r<=10) return "TOP_10";
  if (r<=20) return "TOP_20";
  if (r<=50) return "TOP_50";
  return "TOP_100";
};
const bucketPill = (b:OpportunityRow["bucket"]) =>
  b==="TOP_3"?"Top 3":b==="TOP_10"?"Top 10":b==="TOP_20"?"Top 20":b==="TOP_50"?"21–50":b==="TOP_100"?"51–100":"NR";

/* ====== Mock dataset (short) ====== */
const MOCK: OpportunityRow[] = [
  {
    id:"1", keyword:"keyword research", intent:"Transactional", volume:40500, rank:12, device:"desktop", locationISO:"IN",
    trafficPotential: Math.round(40500*CTR(12)), projectedTopTarget: Math.round(40500*CTR_TARGET(3)),
    lift:  Math.max(0, Math.round(40500*CTR_TARGET(3)) - Math.round(40500*CTR(12))), oppScore:78,
    oppTypes:["LOW_HANGING","HIGH_INTENT"], recommendedAction:"Create/Expand content",
    source:["TRACKER","SERP"], pageUrl:null, isTracked:true,
    serpPreview: [
      {rank:1,title:"Best SEO Tools",url:"https://ahrefs.com/seo-tools",domain:"ahrefs.com"},
      {rank:2,title:"All-in-one SEO",url:"https://semrush.com/seo/",domain:"semrush.com"},
      {rank:3,title:"Moz tools",url:"https://moz.com/",domain:"moz.com"},
    ],
    bucket: rankBucket(12),
  },
  {
    id:"2", keyword:"local seo company", intent:"Commercial", volume:22200, rank:null, device:"desktop", locationISO:"IN",
    trafficPotential: 0, projectedTopTarget: Math.round(22200*CTR_TARGET(3)),
    lift: Math.round(22200*CTR_TARGET(3)), oppScore:71, oppTypes:["NEWLY_RANKED","HIGH_INTENT"],
    recommendedAction:"Snippet & UX improvements", source:["TRACKER","SERP"], pageUrl:null, isTracked:true,
    serpPreview: [
      {rank:1,title:"Top Local SEO Company",url:"https://semrush.com/agency",domain:"semrush.com"},
      {rank:2,title:"Local SEO Experts",url:"https://clutch.co/local-seo",domain:"clutch.co"},
      {rank:3,title:"Best Local SEO Services",url:"https://ahrefs.com/local",domain:"ahrefs.com"},
    ],
    bucket: rankBucket(null),
  },
  {
    id:"3", keyword:"rank tracker", intent:"Informational", volume:12100, rank:55, device:"desktop", locationISO:"IN",
    trafficPotential: Math.round(12100*CTR(55)), projectedTopTarget: Math.round(12100*CTR_TARGET(3)),
    lift: Math.max(0, Math.round(12100*CTR_TARGET(3)) - Math.round(12100*CTR(55))), oppScore:63,
    oppTypes:["HIGH_INTENT"], recommendedAction:"Create/Expand content",
    source:["TRACKER","SERP"], pageUrl:"/keywords/rank-tracker", isTracked:true,
    serpPreview:[
      {rank:1,title:"Keyword Rank Tracker",url:"https://ahrefs.com/rank-tracker",domain:"ahrefs.com"},
      {rank:2,title:"SEMrush Rank Tracker",url:"https://semrush.com/rank-tracking",domain:"semrush.com"},
      {rank:3,title:"Moz Rank Checker",url:"https://moz.com/rank-checker",domain:"moz.com"},
    ],
    bucket: rankBucket(55),
  },
  {
    id:"4", keyword:"seo audit", intent:"Commercial", volume:33100, rank:9, device:"desktop", locationISO:"IN",
    trafficPotential: Math.round(33100*CTR(9)), projectedTopTarget: Math.round(33100*CTR_TARGET(3)),
    lift: Math.max(0, Math.round(33100*CTR_TARGET(3)) - Math.round(33100*CTR(9))), oppScore:69,
    oppTypes:["QUICK_WIN"], recommendedAction:"Snippet & UX improvements",
    source:["TRACKER","SERP"], pageUrl:"/blog/seo-audit", isTracked:true,
    serpPreview:[
      {rank:1,title:"SEO Audit Guide",url:"https://ahrefs.com/seo-audit",domain:"ahrefs.com"},
      {rank:2,title:"Site Audit",url:"https://semrush.com/site-audit",domain:"semrush.com"},
      {rank:3,title:"Technical Audit",url:"https://moz.com/learn/seo/site-audit",domain:"moz.com"},
    ],
    bucket: rankBucket(9),
  },
];

/* ====== Small UI bits ====== */
const Dot = ({color}:{color:string}) =>
  <span aria-hidden className="inline-block rounded-full" style={{width:10,height:10,background:color}} />;

const IntentTag = ({intent}:{intent:Intent}) => {
  const color = intent==="Informational" ? "#8B5CF6" : intent==="Commercial" ? "#3B82F6" : TOKENS.ok;
  return (
    <span className="inline-flex items-center gap-2">
      <Dot color={color}/><span>{intent}</span>
    </span>
  );
};

const ScoreBar = ({score}:{score:number}) => {
  const color = score>=70?TOKENS.ok:score>=40?TOKENS.warn:TOKENS.danger;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-24 rounded bg-[#E5E7EB]">
        <div className="h-2 rounded" style={{width:`${Math.min(100,Math.max(0,score))}%`, background:color}}/>
      </div>
      <span className="text-sm">{score}</span>
    </div>
  );
};

/* ====== Lightweight self-tests ====== */
function runSelfTests(){
  try{
    console.assert(CTR(1) === 0.28, "CTR(1) should be 0.28");
    console.assert(CTR(12) === 0.015, "CTR(12) should be 0.015");
    console.assert(rankBucket(null) === "UNRANKED", "rankBucket(null) → UNRANKED");
    console.assert(bucketPill("TOP_3") === "Top 3", "bucketPill(TOP_3) → 'Top 3'");
  }catch(e){
    console.warn("Self-tests failed:", e);
  }
}
runSelfTests();

/* ====== Columns ====== */
type ColumnKey =
  | "select" | "expander" | "keyword" | "volume" | "intent"
  | "rank" | "tp" | "proj" | "lift" | "score" | "action" | "source";

type ColDef = { key:ColumnKey; label:string; min?:number; sortable?:boolean; };

const COLS: ColDef[] = [
  {key:"select",label:"",min:36},
  {key:"expander",label:"",min:36},
  {key:"keyword",label:"Keyword",min:280,sortable:true},
  {key:"volume",label:"Search Volume",min:120,sortable:true},
  {key:"intent",label:"Intent",min:140,sortable:false},
  {key:"rank",label:"Current Rank",min:140,sortable:true},
  {key:"tp",label:"Traffic Potential",min:160,sortable:true},
  {key:"proj",label:"Projected @Top",min:160,sortable:true},
  {key:"lift",label:"Lift (clicks)",min:140,sortable:true},
  {key:"score",label:"Opp. Score",min:140,sortable:true},
  {key:"source",label:"Source",min:140},
  {key:"action",label:"Actions",min:180}, // non-sticky
];

/* ====== Component ====== */
export default function OpportunitiesTable() {
  const [rows,setRows] = useState<OpportunityRow[]>(MOCK);

  /* Scope & target (shared) */
  const [target,setTarget] = useState<1|3|5>(3);
  const [search,setSearch] = useState("");
  const [includeNR,setIncludeNR] = useState(true);

  /* Pagination */
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  /* Filters (chips) */
  const allTypes: OppType[] = ["LOW_HANGING","QUICK_WIN","NEWLY_RANKED","DECLINER","CANNIBALIZED","UNASSIGNED_LP","LOW_COMPETITION","COMPETITOR_WINS","TRENDING","HIGH_INTENT"];
  const [typeFilter,setTypeFilter] = useState<OppType[]>([]);
  const [intentFilter,setIntentFilter] = useState<Intent[]>([]);
  const [competitors] = useState<string[]>(["ahrefs.com","semrush.com","moz.com"]);
  const [activeCompetitors,setActiveCompetitors] = useState<string[]>([]);
  const maxVol = useMemo(()=> Math.max(...rows.map(r=>r.volume||0), 10000), [rows]);
  const [volRange,setVolRange] = useState<[number,number]>([0, maxVol]);
  const [rankRange,setRankRange] = useState<[number,number]>([1,100]);
  const [minLift,setMinLift] = useState(0);
  const [excludeTracked,setExcludeTracked] = useState(false);

  /* Selection & expand */
  const [sel,setSel] = useState<Record<string,boolean>>({});
  const selectedIds = useMemo(()=>Object.keys(sel).filter(k=>sel[k]),[sel]);
  const [exp,setExp] = useState<Record<string,boolean>>({});

  /* Visible columns as object */
  const [visible,setVisible] = useState<Record<ColumnKey,boolean>>(
    {select:true,expander:true,keyword:true,volume:true,intent:true,rank:true,tp:true,proj:true,lift:true,score:true,source:true,action:true}
  );
  const visibleCols = useMemo(()=> COLS.filter(c => visible[c.key]!==false),[visible]);

  /* Sorting */
  const [sortKey,setSortKey] = useState<ColumnKey>("lift");
  const [sortDir,setSortDir] = useState<"asc"|"desc">("desc");

  const toggleSort = (k:ColumnKey) => {
    if (!COLS.find(c=>c.key===k)?.sortable) return;
    if (sortKey!==k){ setSortKey(k); setSortDir("asc"); }
    else setSortDir(d=>d==="asc"?"desc":"asc");
  };

  // Keyword column resizing
  const SELECT_W = 36; // px
  const EXPAND_W = 36; // px
  const STICKY_LEFT = SELECT_W + EXPAND_W; // offset for sticky keyword column
  const [keywordWidth, setKeywordWidth] = useState<number>(280);
  const resizeRef = useRef<{startX:number; startW:number} | null>(null);

  const onResizeDown = (e:React.MouseEvent) => {
    resizeRef.current = { startX: e.clientX, startW: keywordWidth };
    window.addEventListener('mousemove', onResizing);
    window.addEventListener('mouseup', onResizeUp);
  };
  const onResizing = (e:MouseEvent) => {
    if(!resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const next = Math.min(700, Math.max(160, resizeRef.current.startW + dx));
    setKeywordWidth(next);
  };
  const onResizeUp = () => {
    window.removeEventListener('mousemove', onResizing);
    window.removeEventListener('mouseup', onResizeUp);
    resizeRef.current = null;
  };
  useEffect(()=>() => {
    window.removeEventListener('mousemove', onResizing);
    window.removeEventListener('mouseup', onResizeUp);
  }, []);

  useEffect(()=>{
    // recompute projected/lift if target changes
    setRows(rs => rs.map(r=>{
      const proj = r.volume!=null? Math.round(r.volume*CTR_TARGET(target)) : null;
      const tp = r.volume!=null? Math.round(r.volume*CTR(r.rank??101)) : null;
      const lift = proj!=null && tp!=null ? Math.max(0, proj - tp) : (proj ?? 0);
      return {...r, projectedTopTarget:proj, trafficPotential:tp, lift};
    }));
  },[target]);

  /* Filtered + sorted view */
  const filtered = useMemo(()=> {
    return rows.filter(r=>{
      const text = [r.keyword, r.pageUrl??"", (r.serpPreview||[]).map(s=>s.domain).join(" ")].join(" ").toLowerCase();
      if (search && !text.includes(search.toLowerCase())) return false;
      if (typeFilter.length && !r.oppTypes.some(t=>typeFilter.includes(t))) return false;
      if (intentFilter.length && !intentFilter.includes(r.intent)) return false;
      if (excludeTracked && r.isTracked) return false;
      if (!includeNR){
        const rr = r.rank ?? 101;
        if (rr>100) return false;
      }
      if (!(r.volume==null || (r.volume>=volRange[0] && r.volume<=volRange[1]))) return false;
      const rr = r.rank ?? 101;
      if (!(rr>=rankRange[0] && rr<=rankRange[1])) return false;
      if (minLift>0 && (r.lift??0) < minLift) return false;
      if (activeCompetitors.length){
        const domains = (r.serpPreview||[]).map(s=>s.domain);
        if (!activeCompetitors.some(c=>domains.includes(c))) return false;
      }
      return true;
    });
  },[rows,search,typeFilter,intentFilter,excludeTracked,includeNR,volRange,rankRange,minLift,activeCompetitors]);

  const sorted = useMemo(()=>{
    const arr = [...filtered];
    const val = (r:OpportunityRow) => {
      switch (sortKey){
        case "keyword": return r.keyword.toLowerCase();
        case "volume": return r.volume ?? -1;
        case "rank": return r.rank ?? 999;
        case "tp": return r.trafficPotential ?? -1;
        case "proj": return r.projectedTopTarget ?? -1;
        case "lift": return r.lift ?? -1;
        case "score": return r.oppScore;
        default: return 0;
      }
    };
    arr.sort((a,b)=>{
      const av:any = val(a), bv:any = val(b);
      if (av===bv) return 0;
      return sortDir==="asc" ? (av>bv?1:-1) : (av<bv?1:-1);
    });
    return arr;
  },[filtered,sortKey,sortDir]);

  /* Pagination derived */
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  useEffect(()=>{ if(page !== clampedPage) setPage(clampedPage); }, [pageCount]);
  const start = (clampedPage - 1) * pageSize;
  const end = Math.min(sorted.length, start + pageSize);
  const paged = sorted.slice(start, end);

  // select-all should apply to visible rows (current page)
  const allVisibleSelected = paged.length>0 && paged.every(r=>sel[r.id]);
  const someVisibleSelected = paged.some(r=>sel[r.id]) && !allVisibleSelected;

  /* UI helpers */
  const clearAll = () => {
    setSearch("");
    setTypeFilter([]);
    setIntentFilter([]);
    setActiveCompetitors([]);
    setVolRange([0,maxVol]);
    setRankRange([1,100]);
    setMinLift(0);
    setExcludeTracked(false);
    setIncludeNR(true);
    setPage(1);
  };

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-[72vw] overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }

  /* ====== RENDER ====== */
  return (
    <section
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      className="mt-4"
    >
                          {drawerRow &&  (
                      <Drawer title="Drawer" onClose={closeDrawer}>
                      <KeywordDrilldown/> 
                      </Drawer>
                    )}
      <Card className="border" style={{borderColor:TOKENS.border, borderRadius:TOKENS.radius}}>
        {/* Section header bar (with branded icon) */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg flex items-center gap-2" style={{ color: TOKENS.text }}>
            <TrendingUp className="h-5 w-5" style={{ color: TOKENS.brand }} />
            Opportunities
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Target switch (Top 1/3/5) */}
            <div className="inline-flex rounded border overflow-hidden" style={{borderColor:TOKENS.border}}>
              {[1,3,5].map((t)=>(
                <button
                  key={t}
                  className={`px-3 h-8 text-sm cursor-pointer ${target===t? "bg-[#D9EEF8] font-medium text-[#0C69B2]": "bg-white hover:bg-gray-50"}`}
                  onClick={()=>setTarget(t as 1|3|5)}
                  title={`Project to Top ${t}`}
                >
                  Top {t}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2" style={{ color: TOKENS.brand }} />
              <Input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} placeholder="Search keyword or URL..." className="w-[280px] pl-7 cursor-text"/>
            </div>

            {/* Columns popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
                  <SlidersHorizontal className="h-4 w-4" style={{ color: TOKENS.brand }} />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2">
                  {COLS.map(c=> (
                    <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        disabled={c.key==="select" || c.key==="expander" || c.key==="keyword"}
                        checked={visible[c.key]!==false}
                        onCheckedChange={(v)=>setVisible(s=>({...s, [c.key]:Boolean(v)}))}
                      />
                      <span>{c.label||c.key}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Export + Refresh */}
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
              <Download className="h-4 w-4" style={{ color: TOKENS.brand }} />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={()=>setRows(MOCK)}>
              <RefreshCw className="h-4 w-4" style={{ color: TOKENS.brand }} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Filter bar + bulk bar */}
        <CardContent className="border-t pt-3" style={{borderColor:TOKENS.border}}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm" style={{ color: TOKENS.muted }}>
              <Filter className="h-4 w-4" style={{ color: TOKENS.brand }} />
              Filters
            </span>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearAll}>Clear All</Button>

            {/* Types */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 border rounded-full px-3 h-8 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{borderColor:TOKENS.border}}>
                  <Settings2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Types {typeFilter.length? <span className="text-xs rounded-full bg-[#D9EEF8] px-2 py-0.5 text-[#0C69B2]">{typeFilter.length}</span> : null}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="text-sm font-medium mb-2">Opportunity Type</div>
                <ScrollArea className="max-h-[240px] pr-2">
                  <div className="space-y-1">
                    {allTypes.map(t=>(
                      <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={typeFilter.includes(t)}
                          onCheckedChange={(v)=>{ setTypeFilter(s => Boolean(v) ? [...s,t] : s.filter(x=>x!==t)); setPage(1); }}/>
                        <span>{t.replaceAll("_"," ")}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Intent */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 border rounded-full px-3 h-8 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{borderColor:TOKENS.border}}>
                  <Settings2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Intent {intentFilter.length? <span className="text-xs rounded-full bg-[#D9EEF8] px-2 py-0.5 text-[#0C69B2]">{intentFilter.length}</span> : null}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-1">
                  {(["Informational","Commercial","Transactional"] as Intent[]).map(i => (
                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={intentFilter.includes(i)}
                        onCheckedChange={(v)=>{ setIntentFilter(s=> Boolean(v)? [...s,i]: s.filter(x=>x!==i)); setPage(1); }}/>
                      <span>{i}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Volume */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 border rounded-full px-3 h-8 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{borderColor:TOKENS.border}}>
                  <Settings2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Volume
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]">
                <div className="text-sm mb-2">Search Volume</div>
                <Slider value={volRange} min={0} max={maxVol} step={100}
                  onValueChange={(v)=>{ setVolRange(v as [number,number]); setPage(1); }}/>
                <div className="mt-2 flex items-center gap-2">
                  <Input type="number" value={volRange[0]} onChange={e=>setVolRange([Math.max(0,Number(e.target.value)||0), volRange[1]])} className="w-24"/>
                  <span className="text-sm" style={{ color: TOKENS.muted }}>to</span>
                  <Input type="number" value={volRange[1]} onChange={e=>setVolRange([volRange[0], Math.max(volRange[0], Number(e.target.value)||0)])} className="w-24"/>
                </div>
              </PopoverContent>
            </Popover>

            {/* Rank */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 border rounded-full px-3 h-8 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{borderColor:TOKENS.border}}>
                  <Settings2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Rank 1–100
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]">
                <div className="text-sm mb-2">Rank Range</div>
                <Slider value={rankRange} min={1} max={100} step={1}
                  onValueChange={(v)=>{ setRankRange(v as [number,number]); setPage(1); }}/>
                <div className="mt-2 flex items-center gap-3">
                  <Checkbox checked={includeNR} onCheckedChange={(v)=>setIncludeNR(Boolean(v))}/> <span className="text-sm">Include NR</span>
                </div>
              </PopoverContent>
            </Popover>

            {/* Min Lift */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 border rounded-full px-3 h-8 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{borderColor:TOKENS.border}}>
                  <Settings2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Min Lift (Top {target})
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px]">
                <div className="text-sm mb-2">Minimum Lift (clicks / mo)</div>
                <Slider value={[minLift]} min={0} max={20000} step={50}
                  onValueChange={(v)=>{ setMinLift((v as number[])[0]); setPage(1); }}/>
                <div className="mt-2"><Input type="number" value={minLift} onChange={e=>setMinLift(Math.max(0, Number(e.target.value)||0))} className="w-28"/></div>
              </PopoverContent>
            </Popover>

            {/* Competitors */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-2 border rounded-full px-3 h-8 bg-white hover:bg-[#F7FAFC] cursor-pointer" style={{borderColor:TOKENS.border}}>
                  <Users2 className="h-4 w-4" style={{ color: TOKENS.brand }} /> Competitors
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-1">
                  {activeCompetitors.length===0 && <div className="text-xs" style={{ color: TOKENS.muted }}>(Optional) Show rows where selected domains appear in top results</div>}
                  {["ahrefs.com","semrush.com","moz.com"].map(c=>(
                    <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={activeCompetitors.includes(c)}
                        onCheckedChange={(v)=>{ setActiveCompetitors(s => Boolean(v)? [...s,c] : s.filter(x=>x!==c)); setPage(1); }}/>
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Exclude Tracked */}
            <label className="inline-flex items-center gap-2 ml-1 text-sm cursor-pointer select-none">
              <Checkbox checked={excludeTracked} onCheckedChange={(v)=>{ setExcludeTracked(Boolean(v)); setPage(1); }}/>
              <span>Exclude Tracked</span>
            </label>

            {/* RIGHT SIDE: Page size selector */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm" style={{ color: TOKENS.muted }}>Rows/page</span>
              <Select value={String(pageSize)} onValueChange={(v)=>{ setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[84px] cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk bar (inside filter area) */}
          {selectedIds.length>0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2" style={{borderColor:TOKENS.border, background:TOKENS.chipBg}}>
              <div className="text-sm"><strong>{selectedIds.length}</strong> selected</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="gap-1 cursor-pointer" style={{background:TOKENS.brand, color:"#fff"}}>
                  <Plus className="h-4 w-4" />
                  Track
                </Button>
                <Button size="sm" variant="outline" className="gap-1 cursor-pointer">
                  <ClipboardList className="h-4 w-4" style={{ color: TOKENS.brand }} />
                  Task
                </Button>
                <Button size="sm" variant="outline" className="gap-1 cursor-pointer">
                  <Download className="h-4 w-4" style={{ color: TOKENS.brand }} />
                  Export
                </Button>
                <Button size="sm" variant="outline" className="gap-1 cursor-pointer" onClick={()=>setSel({})}>
                  <X className="h-4 w-4" style={{ color: TOKENS.brand }} />
                  Deselect all
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{borderColor:TOKENS.border}}>
            <Table className="text-sm">
              <TableHeader className="sticky top-0 bg-white z-20">
                <TableRow>
                  {visible.select!==false && (
                    <TableHead style={{minWidth:36, width:36}} className="text-left">
                      <Checkbox
                        checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                        onCheckedChange={(v)=>{
                          const on = Boolean(v);
                          const patch:Record<string,boolean> = {};
                          paged.forEach(r=>{ patch[r.id]=on; });
                          setSel(s=>({ ...s, ...patch }));
                        }}
                      />
                    </TableHead>
                  )}
                  {visible.expander!==false && (
                    <TableHead style={{minWidth:36, width:36}} className="text-left" />
                  )}
                  {visible.keyword!==false && (
                    <KeywordHead
                      toggleSort={()=>toggleSort('keyword')}
                      isActive={sortKey==='keyword'}
                      dir={sortDir}
                    />
                  )}
                  {visibleCols.filter(c=> !['select','expander','keyword'].includes(c.key)).map(c=> (
                    <TableHead key={c.key} style={{minWidth:c.min}} className="text-left">
                      {COLS.find(x=>x.key===c.key)?.sortable ? (
                        <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=>toggleSort(c.key)} title={`Sort by ${c.label}`}>
                          <span>{c.label}</span>
                          {sortKey===c.key ? (sortDir==='asc' ? <ChevronDown className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      ) : (
                        <span>{c.label}</span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {paged.map(r=>(
                  <React.Fragment key={r.id}>
                    <TableRow className="hover:bg-[#FAFAFA]">
                      {visible.select!==false && (
                        <TableCell style={{minWidth:36, width:36}} className="text-left">
                          <Checkbox checked={!!sel[r.id]} onCheckedChange={(v)=>setSel(s=>({...s, [r.id]:Boolean(v)}))}/>
                        </TableCell>
                      )}
                      {visible.expander!==false && (
                        <TableCell style={{minWidth:36, width:36}} className="text-left">
                          <button onClick={()=>setExp(e=>({...e, [r.id]:!e[r.id]}))} className="rounded border p-1 hover:bg-muted cursor-pointer" style={{borderColor:TOKENS.border}} title={exp[r.id] ? "Collapse" : "Expand"}>
                            {exp[r.id]? <ChevronDown className="h-4 w-4" style={{ color: TOKENS.brand }} /> : <ChevronRight className="h-4 w-4" style={{ color: TOKENS.brand }} />}
                          </button>
                        </TableCell>
                      )}
                      {visible.keyword!==false && (
                        <TableCell
                          className="text-left"
                          style={{
                            position:'sticky',
                            left: 72,
                            zIndex: 40,
                            background:'#fff',
                            minWidth: 280,
                            width: 280,
                            boxShadow: 'inset -1px 0 0 var(--tw-border-color, #EFF0F6)'
                          }}
                        >
                          <div className="font-medium truncate cursor-pointer underline text-blue-500" title={r.keyword} onClick={openDrawer}>{r.keyword}</div>
                          {r.oppTypes?.[0] && (
                            <span className="inline-block text-[11px] mt-1 px-2 py-0.5 rounded-full" style={{background:TOKENS.chipBg, border:`1px solid ${TOKENS.border}`}}>
                              {r.oppTypes[0].replaceAll("_"," ")}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visible.volume!==false && (<TableCell className="text-left">{r.volume==null?"—":compact(r.volume)}</TableCell>)}
                      {visible.intent!==false && (<TableCell className="text-left"><IntentTag intent={r.intent}/></TableCell>)}
                      {visible.rank!==false && (
                        <TableCell className="text-left">
                          {r.rank==null || r.rank>100 ? <span style={{color:TOKENS.danger}}>Not Ranked</span> : `#${r.rank}`}
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full" style={{background:TOKENS.chipBg, border:`1px solid ${TOKENS.border}`}}>
                            {bucketPill(r.bucket!)}
                          </span>
                        </TableCell>
                      )}
                      {visible.tp!==false && (<TableCell className="text-left">{r.trafficPotential==null?"—":compact(r.trafficPotential)}</TableCell>)}
                      {visible.proj!==false && (<TableCell className="text-left">{r.projectedTopTarget==null?"—":compact(r.projectedTopTarget)}</TableCell>)}
                      {visible.lift!==false && (<TableCell className="text-left" style={{color:TOKENS.ok}}>{r.lift==null?"—":compact(r.lift)}</TableCell>)}
                      {visible.score!==false && (<TableCell className="text-left"><ScoreBar score={r.oppScore}/></TableCell>)}
                      {visible.source!==false && (<TableCell className="text-left">{r.source.join(" · ")}</TableCell>)}
                      {visible.action!==false && (
                        <TableCell className="text-left">
                          <div className="inline-flex items-center gap-1.5">
                            <Button size="icon" variant="outline" className="h-7 w-7 cursor-pointer" title="Track"><Plus className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} /></Button>
                            <Button size="icon" variant="outline" className="h-7 w-7 cursor-pointer" title="Task"><ClipboardList className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} /></Button>
                            <Button size="icon" variant="outline" className="h-7 w-7 cursor-pointer" title="SERP Preview"><SearchIcon className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} /></Button>
                            {r.pageUrl && (
                              <Button size="icon" variant="outline" className="h-7 w-7 cursor-pointer" title="Open Page"><ExternalLink className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} /></Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Expand row: SERP Snapshot (Top 3) */}
                    {exp[r.id] && (
                      <TableRow>
                        <TableCell colSpan={visibleCols.length}>
                          <div className="grid md:grid-cols-2 gap-4 p-4 rounded border" style={{borderColor:TOKENS.border, background:"#fff"}}>
                            <div className="space-y-2">
                              <div className="text-sm font-medium">SERP Snapshot (Top 3)</div>
                              <div className="space-y-2">
                                {(r.serpPreview||[]).slice(0,3).map(s=>(
                                  <div key={s.rank} className="flex items-start gap-3">
                                    <span className="mt-0.5 text-sm w-6">#{s.rank}</span>
                                    <div>
                                      <a
                                        href={s.url}
                                        onClick={(e)=>e.preventDefault()}
                                        className="font-medium hover:underline cursor-pointer"
                                        style={{color:TOKENS.chartBlue}}
                                      >
                                        {s.title}
                                      </a>
                                      <div className="text-xs" style={{ color: TOKENS.muted }}>{s.domain}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-sm font-medium">Quick actions</div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" className="gap-1 cursor-pointer" style={{background:TOKENS.brand, color:"#fff"}}>
                                  <Plus className="h-4 w-4" />
                                  Track
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 cursor-pointer">
                                  <ClipboardList className="h-4 w-4" style={{ color: TOKENS.brand }} />
                                  Task
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 cursor-pointer">
                                  <SearchIcon className="h-4 w-4" style={{ color: TOKENS.brand }} />
                                  SERP
                                </Button>
                                {r.pageUrl && <Button size="sm" variant="outline" className="gap-1 cursor-pointer">
                                  <ExternalLink className="h-4 w-4" style={{ color: TOKENS.brand }} />
                                  Open Page
                                </Button>}
                              </div>
                              <div className="text-xs" style={{ color: TOKENS.muted }}>
                                Ranks, lift and projected clicks use the shared Target position: <strong>Top {target}</strong>.
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between p-3 border-t" style={{borderColor:TOKENS.border}}>
            <div className="text-sm" style={{ color: TOKENS.muted }}>
              {sorted.length === 0 ? '0–0 of 0' : `${start+1}–${end} of ${sorted.length}`}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={clampedPage<=1}>
                <ChevronLeft className="h-4 w-4" style={{ color: TOKENS.brand }} />
                Prev
              </Button>
              <span className="text-sm">Page {clampedPage} / {pageCount}</span>
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={clampedPage>=pageCount}>
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" style={{ color: TOKENS.brand }} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/* Sticky Keyword header cell (kept separate for readability) */
function KeywordHead({ toggleSort, isActive, dir }: { toggleSort: () => void; isActive: boolean; dir: "asc" | "desc" }) {
  return (
    <TableHead
      className="text-left"
      style={{
        position: 'sticky',
        left: 72,
        zIndex: 50,
        background: '#fff',
        minWidth: 280,
        width: 280,
        boxShadow: 'inset -1px 0 0 var(--tw-border-color, #EFF0F6)'
      }}
    >
      <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={toggleSort} title="Sort by Keyword">
        <span>Keyword</span>
        {isActive ? (dir==='asc' ? <ChevronDown className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
      </button>
    </TableHead>
  );
}
