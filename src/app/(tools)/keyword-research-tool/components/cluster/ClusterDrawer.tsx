import * as React from "react";
import {
  X, Layers3, ClipboardList, Target, Download, BookmarkPlus, NotebookPen,
  FileBarChart, Sparkles, SquareStack, Video, Image as ImageIcon, MapPin, ShoppingCart,
  Newspaper, PanelsTopLeft, ChevronUp, ChevronDown, Plus, Minus, GripVertical, Info, ExternalLink,
  CircleHelp, Check, ArrowRight, ShieldAlert, ListChecks, Link as LinkIcon, ChevronRight
} from "lucide-react";
import { Drawer } from "antd"

/* ------- shadcn/ui ------- */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover, PopoverTrigger, PopoverContent
} from "@/components/ui/popover";
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { AddToTrackerModal } from "@/src/app/organic-visibility/competitors/AddToTrack";

/* ============ Tokens (consistent with previous tabs) ============ */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD", // branded icon color
  action: "var(--wr-action,#0077FF)",
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
  radius: "6px",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

const cn = (...c:(string|false|null|undefined)[]) => c.filter(Boolean).join(" ");
const formatInt = (n?: number) =>
  n == null ? "—" : n >= 1_000_000 ? (n/1_000_000).toFixed(1)+"M" : n>=1000 ? (n/1000).toFixed(1)+"k" : String(n);

/* ============ Types ============ */
type Mode = "domain" | "no-domain";
type Intent = "informational" | "commercial" | "transactional" | "local" | "navigational";
type Feature = "fs" | "paa" | "video" | "images" | "local" | "shopping" | "news" | "sitelinks";

type ClusterData = {
  id: string;
  title: string;
  size: number;
  volume: number;
  avgWkd: number;         // 0..100
  cps: number;            // 0..100
  intent: { primary: Intent; mix: Partial<Record<Intent, number>> };
  features: Feature[];
  nearWinPct?: number;    // 0..1
  recPageType: "Guide"|"Listicle"|"Category"|"PDP"|"Comparison"|"Review"|"Video"|"News";
  snapshotAgeDays?: number;

  // Buckets
  buckets: {
    head: BucketItem[];
    variants: BucketItem[];
    questions: BucketItem[];
    longtails: BucketItem[];
  };

  // Brief
  aior: { score: number; label: "AI draft acceptable"|"Editor review OK"|"SME required" };
  titles: string[];
  outline: OutlineItem[];
  entities: { text: string; covered: boolean }[];
  faqs: { text: string; include: boolean }[];
  schema: { Article: boolean; HowTo: boolean; FAQ: boolean; Product: boolean; LocalBusiness: boolean };

  // Internal links (Domain-Aware only)
  hub: { slug: string; title: string; confidence: number };
  spokes: string[];
  linkSuggestions: LinkSuggestion[];
  orphanOpps: { path: string; relevance: number }[];

  // SERP coverage
  coverage: Partial<Record<Feature, number>>;  // fraction 0..1 across cluster
  competitors: { domain: string; wr: number; share: number; ownsFs?: boolean; ownsPaa?: boolean }[];
  guidance: string;

  // Publishing plan
  plan: { weeks: number; items: { type: "pillar"|"spoke"; title: string }[] };
};

type BucketItem = { id: string; keyword: string; vol?: number; wkd?: number; cp?: number; wos?: number };
type OutlineItem = { id: string; level: "h2"|"h3"; text: string };
type LinkSuggestion = {
  sourcePath: string;
  relevance: number;      // 0..100
  currentLinksToTarget: number;
  dilsLift: number;       // %
  aqs?: number;           // 0..100
  anchors: { exact: string; partial: string; brand: string };
};

/* ============ Mock Data ============ */
const MOCK_CLUSTER: ClusterData = {
  id: "clu_7",
  title: "technical seo checklist",
  size: 18,
  volume: 11400,
  avgWkd: 57,
  cps: 78,
  intent: { primary: "informational", mix: { informational: .68, commercial: .22, local: .10 } },
  features: ["fs","paa","images"],
  nearWinPct: .22,
  recPageType: "Listicle",
  snapshotAgeDays: 3,

  buckets: {
    head: [{ id:"b0", keyword:"technical seo checklist", vol:2900, wkd:41, cp:22, wos:63 }],
    variants: [
      { id:"b1", keyword:"technical seo audit checklist", vol:1600, wkd:52, cp:18, wos:58 },
      { id:"b2", keyword:"best technical seo tools", vol:880, wkd:58, cp:20, wos:55 }
    ],
    questions: [
      { id:"b3", keyword:"what is a technical seo checklist", vol:320, wkd:37, cp:21, wos:44 },
      { id:"b4", keyword:"how to audit site speed", vol:260, wkd:42, cp:19, wos:41 }
    ],
    longtails: [
      { id:"b5", keyword:"technical seo checklist for small business", vol:210, wkd:27, cp:23, wos:47 }
    ],
  },

  aior: { score: 72, label: "Editor review OK" },
  titles: [
    "Technical SEO Checklist (2025): 40+ Tasks That Actually Matter",
    "The Only Technical SEO Checklist You Need (Free Template)",
    "Technical SEO Audit Checklist: A Step‑by‑Step Guide"
  ],
  outline: [
    { id:"o1", level:"h2", text:"Crawlability & Indexation" },
    { id:"o2", level:"h3", text:"Robots.txt & Meta Robots" },
    { id:"o3", level:"h3", text:"XML Sitemap hygiene" },
    { id:"o4", level:"h2", text:"Site Speed & Core Web Vitals" },
    { id:"o5", level:"h2", text:"Structured Data & SERP enhancements" },
  ],
  entities: [
    { text:"core web vitals", covered:true },
    { text:"schema markup", covered:true },
    { text:"log file analysis", covered:false },
    { text:"crawl budget", covered:false },
    { text:"xml sitemap", covered:true },
  ],
  faqs: [
    { text:"What is a technical SEO checklist?", include:true },
    { text:"How often should I run a technical audit?", include:true },
    { text:"What are good CWV benchmarks?", include:false },
  ],
  schema: { Article:true, HowTo:true, FAQ:true, Product:false, LocalBusiness:false },

  hub: { slug:"/guide/technical-seo-checklist", title:"Technical SEO Checklist", confidence: 86 },
  spokes: [
    "CWV optimization guide", "Schema markup basics", "Log file analysis tutorial", "XML sitemap best practices"
  ],
  linkSuggestions: [
    {
      sourcePath:"/blog/site-speed-tips", relevance: 82, currentLinksToTarget: 0,
      dilsLift: 18, aqs: 61,
      anchors:{ exact:"technical seo checklist", partial:"improve technical seo", brand:"WRanker checklist" }
    },
    {
      sourcePath:"/guide/schema-markup", relevance: 74, currentLinksToTarget: 1,
      dilsLift: 11, aqs: 57,
      anchors:{ exact:"technical SEO audit checklist", partial:"technical audit steps", brand:"WRanker guide" }
    },
  ],
  orphanOpps:[{ path:"/guide/log-files", relevance: 64 }],

  coverage: { fs:.62, paa:.55, video:.28, local:.12, shopping:.06, news:.18, images:.41, sitelinks:.33 },
  competitors: [
    { domain:"example.com", wr:78, share:.20, ownsFs:true },
    { domain:"brand.io", wr:73, share:.18 },
    { domain:"docs.dev", wr:66, share:.12 }
  ],
  guidance: "To win this cluster, prioritize a Listicle pillar with embedded FAQ. Add a short explainer video (30% of terms show video).",

  plan: {
    weeks: 3,
    items: [
      { type:"pillar", title:"Technical SEO Checklist (pillar)" },
      { type:"spoke", title:"Core Web Vitals: How to improve LCP/INP/CLS" },
      { type:"spoke", title:"Schema Markup: Practical implementation guide" },
      { type:"spoke", title:"Log file analysis for SEO" }
    ]
  }
};

/* ============ Visual atoms ============ */
const Chip: React.FC<{ children: React.ReactNode; active?: boolean; muted?: boolean; className?: string; onClick?: ()=>void }> = ({ children, active, muted, className, onClick }) => (
  <span
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]",
      className,
      onClick && "cursor-pointer select-none",
      active && "font-semibold"
    )}
    style={{ borderColor: TK.borderLight, background: active ? TK.pastel : muted ? "#F9FAFB" : "#FFF" }}
  >{children}</span>
);

const WKDband = (score:number) => {
  if (score <= 29) return { label:"Easy", color: TK.ok };
  if (score <= 54) return { label:"Moderate", color: TK.warn };
  if (score <= 74) return { label:"Difficult", color: "#D97706" };
  return { label:"Very", color: TK.critical };
};

const Pill: React.FC<React.PropsWithChildren<{ title?: string; muted?: boolean }>> = ({ children, title, muted }) => (
  <span title={title} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] border", muted && "opacity-70")}
    style={{ borderColor: TK.borderLight, background:"#FFF" }}>{children}</span>
);

const CPSBar: React.FC<{ score: number }> = ({ score }) => (
  <div className="inline-flex items-center gap-2">
    <div className="h-2 w-24 rounded bg-[#E5E7EB] relative overflow-hidden">
      <span className="absolute left-0 top-0 h-full" style={{ width: `${score}%`, background: TK.action }} />
    </div>
    <span className="text-sm font-semibold">{score}</span>
  </div>
);

/* Intent mix with smart popover (colored dot breakdown) */
const INTENT_COLORS: Record<Intent,string> = {
  informational:"#6B7280",
  commercial:"#3B82F6",
  transactional:"#0EA5E9",
  local:"#8B5CF6",
  navigational:"#10B981",
};

const IntentMixBar: React.FC<{ mix: Partial<Record<Intent, number>> }> = ({ mix }) => {
  const order: Intent[] = ["informational","commercial","transactional","local","navigational"];
  const total = order.reduce((s,k)=>s+(mix[k]||0),0) || 1;
  return (
    <div className="relative w-48 h-2 rounded overflow-hidden bg-[#E5E7EB]" aria-label="Intent mix">
      <div className="flex h-full">
        {order.map(k => {
          const w = ((mix[k]||0)/total)*100;
          if (w<=0) return null;
          return <span key={k} style={{ width:`${w}%`, background:INTENT_COLORS[k] }} className="h-full" />;
        })}
      </div>
    </div>
  );
};

const IntentBreakdown: React.FC<{ mix: Partial<Record<Intent, number>> }> = ({ mix }) => {
  const order: Intent[] = ["informational","commercial","transactional","local","navigational"];
  const total = order.reduce((s,k)=>s+(mix[k]||0),0) || 1;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 cursor-pointer">
          <IntentMixBar mix={mix}/>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px]" align="start">
        <div className="text-xs font-medium mb-1" style={{ color: TK.muted }}>Intent breakdown</div>
        <ul className="space-y-1 text-sm">
          {order.map(k => {
            const pct = Math.round(((mix[k]||0)/total)*100);
            if (pct<=0) return null;
            return (
              <li key={k} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ background: INTENT_COLORS[k] }} />
                  {k}
                </span>
                <span className="tabular-nums">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

/* SERP feature colors + icons */
const FEATURE_COLORS: Record<Feature, string> = {
  fs: "#F59E0B",         // Featured Snippet
  paa: "#6366F1",        // People Also Ask
  video: "#EF4444",
  images: "#22C55E",
  local: "#0EA5E9",
  shopping: "#8B5CF6",
  news: "#334155",
  sitelinks: "#14B8A6",
};

const FeatureIcon: React.FC<{ f: Feature; className?: string; colorize?: boolean }> = ({ f, className, colorize = true }) => {
  const c = cn("h-4 w-4", className);
  const style = colorize ? { color: FEATURE_COLORS[f] } : undefined;
  switch (f) {
    case "fs": return <Sparkles className={c} style={style} />;
    case "paa": return <SquareStack className={c} style={style} />;
    case "video": return <Video className={c} style={style} />;
    case "images": return <ImageIcon className={c} style={style} />;
    case "local": return <MapPin className={c} style={style} />;
    case "shopping": return <ShoppingCart className={c} style={style} />;
    case "news": return <Newspaper className={c} style={style} />;
    case "sitelinks": return <PanelsTopLeft className={c} style={style} />;
  }
};

/* ============ Telemetry ============ */
function krTrack(event:string, props:Record<string,unknown>={}) {
  const detail = { event, ts:new Date().toISOString(), props };
  window.dispatchEvent(new CustomEvent("kr-analytics", { detail }));
}

/* ============ Drawer Component (Redesigned) ============ */
export function ClusterCanvasDrawer({
  open,
  onClose,
  mode = "domain",
  data = MOCK_CLUSTER,
  onRename,
  onSendToCanvas,
  onCreateTask,
  onAddTracking,
  onExport,
  onSaveList,
  onOpenPageAudit,
}: {
  open: boolean;
  onClose: ()=>void;
  mode?: Mode;
  data?: ClusterData;
  onRename?: (name: string)=>void;
  onSendToCanvas?: (payload: any)=>void;
  onCreateTask?: (payload: any)=>void;
  onAddTracking?: (keywords: string[])=>void;
  onExport?: (format: "csv"|"xlsx"|"pdf")=>void;
  onSaveList?: (keywords: string[])=>void;
  onOpenPageAudit?: (path: string)=>void;
}) {

  /* ---------- local state ---------- */
  const [name, setName] = React.useState(data.title);
  const [edit, setEdit] = React.useState(false);
  const [nameErr, setNameErr] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<Record<string, boolean>>({});
  const [showGuard, setShowGuard] = React.useState(false);

  // clone local
  const [cluster, setCluster] = React.useState<ClusterData>(data);
  React.useEffect(()=>{ setCluster(data); setName(data.title); }, [data]);

  // esc close
  React.useEffect(()=>{
    if (!open) return;
    const onKey = (e:KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  },[open,onClose]);

  function validateName(v:string){
    if (v.trim().length < 2) return "Name must be at least 2 characters";
    if (v.trim().length > 80) return "Name must be ≤ 80 characters";
    return null;
  }
  function commitRename(){
    const err = validateName(name);
    setNameErr(err);
    if (!err) {
      onRename?.(name.trim());
      setEdit(false);
    }
  }

  const selectedKeywords = React.useMemo(()=>{
    return Object.entries(sel).filter(([,on])=>on).map(([id])=>{
      const item = findItemById(id);
      return item?.keyword ?? "";
    }).filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[sel, cluster]);

  function findItemById(id:string): BucketItem | undefined {
    return [...cluster.buckets.head, ...cluster.buckets.variants, ...cluster.buckets.questions, ...cluster.buckets.longtails]
      .find(i => i.id === id);
  }

  function moveItems(target:"head"|"variants"|"questions"|"longtails"){
    setCluster(c => {
      const pools = { ...c.buckets };
      const all = ["head","variants","questions","longtails"] as const;
      const moving: BucketItem[] = [];
      all.forEach(b => {
        const keep: BucketItem[] = [];
        pools[b].forEach(item => { if (sel[item.id]) moving.push(item); else keep.push(item); });
        pools[b] = keep;
      });
      pools[target] = [...pools[target], ...moving];
      return { ...c, buckets: pools };
    });
    setSel({});
  }

  function removeSelected(){
    setCluster(c => {
      const pools = { ...c.buckets };
      (["head","variants","questions","longtails"] as const).forEach(b => {
        pools[b] = pools[b].filter(i => !sel[i.id]);
      });
      return { ...c, buckets: pools };
    });
    setSel({});
  }

  function addOutline(level:"h2"|"h3"){
    const id = "o"+Math.random().toString(36).slice(2,8);
    setCluster(c => ({ ...c, outline:[...c.outline, { id, level, text: level==="h2"?"New section":"New sub‑section" }] }));
  }
  function moveOutline(id:string, dir:-1|1){
    setCluster(c => {
      const idx = c.outline.findIndex(o=>o.id===id);
      if (idx<0) return c;
      const next = [...c.outline];
      const dest = Math.max(0, Math.min(next.length-1, idx+dir));
      const [item] = next.splice(idx,1);
      next.splice(dest,0,item);
      return { ...c, outline: next };
    });
  }
  function deleteOutline(id:string){
    setCluster(c => ({ ...c, outline: c.outline.filter(o=>o.id!==id) }));
  }
  function toggleSchema(key: keyof ClusterData["schema"]){
    setCluster(c => ({ ...c, schema: { ...c.schema, [key]: !c.schema[key] } }));
  }
  function toggleEntity(idx:number){
    setCluster(c => {
      const arr = [...c.entities];
      arr[idx] = { ...arr[idx], covered: !arr[idx].covered };
      return { ...c, entities: arr };
    });
  }
  function toggleFaq(idx:number){
    setCluster(c => {
      const arr = [...c.faqs];
      arr[idx] = { ...arr[idx], include: !arr[idx].include };
      return { ...c, faqs: arr };
    });
  }

  function sendCanvas(){
    if (cluster.aior.label === "SME required") setShowGuard(true);
    else onSendToCanvas?.({ clusterId: cluster.id, title: name, brief: cluster });
  }

  function exportCluster(fmt:"csv"|"xlsx"|"pdf"){ onExport?.(fmt); }
  function saveListScope(scope:"selected"|"all"){
    const kws = scope==="selected" ? selectedKeywords : Object.values(cluster.buckets).flat().map(i=>i.keyword);
    onSaveList?.(kws);
  }
  function addTrackingScope(scope:"selected"|"all"){
    if (mode!=="domain") return;
    const kws = scope==="selected" ? selectedKeywords : Object.values(cluster.buckets).flat().map(i=>i.keyword);
    onAddTracking?.(kws);
  }

  const band = WKDband(cluster.avgWkd);

  const [Track, setTrack] = React.useState(false);
  const openTrack = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (e) e.stopPropagation();
    setTrack(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeTrack = () => {
    setTrack(false);
  };

  return (
    <TooltipProvider delayDuration={120}>
      {/* Backdrop + panel */}
            {Track && (
              <div
                style={{
                  display: "hidden",
                  position: "absolute",
                  zIndex: 1001,
                  padding: "20px",
                }}
                onClick={closeTrack}
              >
                <AddToTrackerModal
                  open={true}
                  onOpenChange={() => {}}
                  onClose={closeTrack}
                  plan="free"
                  limit={1}
                  currentTracked={[]}
                  newCompetitor={{} as any}
                  onReplace={() => {}}
                />
              </div>
            )}
      <div
        aria-hidden={!open}
        className={cn("fixed inset-0 z-50", open ? "block" : "hidden")}
        role="dialog"
        aria-labelledby="cluster-canvas-title"
      >
        <div className="absolute inset-0 bg-black/20" />
        <aside
          className="absolute right-0 top-0 h-full w-full max-w-[1120px] min-w-[860px] bg-white flex flex-col"
          style={{ boxShadow: TK.shadowSm, borderLeft: `1px solid ${TK.borderLight}`, ...FONTS }}
        >
          {/* Sticky Bar: ONLY title + action icons */}
          <div className="sticky top-0 z-20 bg-white border-b" style={{ borderColor: TK.borderLight }}>
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <Layers3 className="h-5 w-5" style={{ color: TK.brand }} />
                {!edit ? (
                  <>
                    <h2 id="cluster-canvas-title" className="text-base font-semibold truncate capitalize">{name}</h2>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={()=>setEdit(true)} aria-label="Rename">
                          <NotebookPen className="h-4 w-4" style={{ color: TK.brand }} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rename</TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-[360px]"
                      value={name}
                      onChange={(e)=>{ setName(e.target.value); setNameErr(null); }}
                      onKeyDown={(e)=>{ if (e.key==="Enter") commitRename(); if (e.key==="Escape") setEdit(false); }}
                      autoFocus
                    />
                    <Button size="sm" className="cursor-pointer" onClick={commitRename}>Save</Button>
                    <Button size="sm" variant="ghost" className="cursor-pointer" onClick={()=>{ setName(data.title); setEdit(false); }}>Cancel</Button>
                    {nameErr && <span className="text-xs text-[var(--wr-critical,#EF4444)]">{nameErr}</span>}
                  </div>
                )}
              </div>

              {/* Icon-only Actions (show full name on hover) */}
              <div className="shrink-0 inline-flex items-center gap-1.5">
                <Tooltip><TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={()=> onSendToCanvas?.({ clusterId: cluster.id, title: name })}>
                    <Layers3 className="h-4 w-4" style={{ color: TK.brand }} />
                  </Button>
                </TooltipTrigger><TooltipContent>Content Canvas</TooltipContent></Tooltip>

                <Tooltip><TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={()=> onOpenPageAudit?.(cluster.hub.slug)}>
                    <FileBarChart className="h-4 w-4" style={{ color: TK.brand }} />
                  </Button>
                </TooltipTrigger><TooltipContent>Page Audit</TooltipContent></Tooltip>

                <Tooltip><TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={()=> onCreateTask?.({ clusterId: cluster.id, title:name })}>
                    <ClipboardList className="h-4 w-4" style={{ color: TK.brand }} />
                  </Button>
                </TooltipTrigger><TooltipContent>Create Task</TooltipContent></Tooltip>

                {mode==="domain" && (
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={openTrack}>
                      <Target className="h-4 w-4" style={{ color: TK.brand }} />
                    </Button>
                  </TooltipTrigger><TooltipContent>Track</TooltipContent></Tooltip>
                )}

                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer">
                          <Download className="h-4 w-4" style={{ color: TK.brand }} />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Export</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-[220px]" align="end">
                    <div className="text-sm font-medium mb-2">Export cluster</div>
                    <div className="space-y-1">
                      <Button size="sm" variant="outline" className="w-full cursor-pointer" onClick={()=>exportCluster("csv")}>CSV</Button>
                      <Button size="sm" variant="outline" className="w-full cursor-pointer" onClick={()=>exportCluster("xlsx")}>XLSX</Button>
                      <Button size="sm" variant="outline" className="w-full cursor-pointer" onClick={()=>exportCluster("pdf")}>PDF</Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Tooltip><TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={()=> saveListScope("all")}>
                    <BookmarkPlus className="h-4 w-4" style={{ color: TK.brand }} />
                  </Button>
                </TooltipTrigger><TooltipContent>Save to List</TooltipContent></Tooltip>

                <Tooltip><TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 cursor-pointer" onClick={onClose} aria-label="Close">
                    <X className="h-5 w-5" />
                  </Button>
                </TooltipTrigger><TooltipContent>Close</TooltipContent></Tooltip>
              </div>
            </div>
          </div>

          {/* Scrollable BODY (breadcrumb + KPIs + quick-nav are NON-sticky) */}
          <div className="flex-1 overflow-y-auto">
            {/* Breadcrumb + header KPIs */}
            <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: TK.borderLight }}>
              {/* Breadcrumb */}
              <nav className="text-xs flex items-center gap-2 text-muted-foreground">
                <Layers3 className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                <span className="cursor-default">Clusters</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                <span className="text-[#111827] truncate capitalize">{name}</span>
              </nav>

              {/* KPI chips directly under title/actions */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Chip muted><span className="text-xs">Keywords</span><b className="ml-1">{cluster.size}</b></Chip>
                <Chip muted><span className="text-xs">Volume</span><b className="ml-1">{formatInt(cluster.volume)}</b></Chip>
                <Chip muted aria-label="Average SERP competition">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: band.color }} />
                  <b className="ml-1">{cluster.avgWkd}</b><span className="text-xs ml-1">({band.label})</span>
                </Chip>
                <Chip muted aria-label="Cluster Potential Score"><CPSBar score={cluster.cps}/></Chip>
                {mode==="domain" && cluster.nearWinPct!=null && (
                  <Chip muted aria-label="Share of terms close to Top‑3"><span className="text-xs">Near‑Win</span><b className="ml-1">{Math.round(cluster.nearWinPct*100)}%</b></Chip>
                )}
                <Chip muted aria-label="Best‑fit content format"><span className="text-xs">Rec. Page</span><b className="ml-1">{cluster.recPageType}</b></Chip>
                {cluster.snapshotAgeDays!=null && (
                  <Chip muted aria-label="Snapshot recency">Snapshot {cluster.snapshotAgeDays}d ago</Chip>
                )}
              </div>

              {/* Quick‑nav */}
              <div className="mt-2">
                <nav className="flex flex-wrap gap-1">
                  {[
                    { id:"sum", label:"Summary" },
                    { id:"buckets", label:"Keyword Buckets" },
                    { id:"brief", label:"AI Brief" },
                    { id:"links", label:"Internal Links" },
                    { id:"serp", label:"SERP Coverage" },
                    { id:"entities", label:"Entities/Questions" },
                    { id:"plan", label:"Publishing Plan" },
                  ].map(a => (
                    <a key={a.id}
                       href={`#clu-${a.id}`}
                       className="px-3 py-1 rounded-full border text-sm hover:underline cursor-pointer"
                       style={{ borderColor: TK.borderLight }}>
                      {a.label}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            {/* BODY sections */}
            <div className="px-4 py-4 space-y-4">

              {/* Summary */}
              <Section title="Summary" id="clu-sum" icon={<FileBarChart className="h-4 w-4" style={{ color: TK.brand }} />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Kpi label="CPS" value={<CPSBar score={cluster.cps}/>}/>
                  <Kpi label="Total Volume" value={<b>{formatInt(cluster.volume)}</b>}/>
                  <Kpi label="Avg WKD" value={
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: band.color }}/>
                      <b>{cluster.avgWkd}</b><span className="text-xs">({band.label})</span>
                    </span>
                  }/>
                  <Kpi label="Intent mix" value={<IntentBreakdown mix={cluster.intent.mix}/>}/>
                  {mode==="domain" && <Kpi label="Near‑Win %" value={<b>{Math.round((cluster.nearWinPct||0)*100)}%</b>}/>}
                  <Kpi label="Rec. Page Type" value={<b>{cluster.recPageType}</b>}/>
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-1">Opportunity rationale</div>
                    <ul className="list-disc ml-5 text-sm space-y-1">
                      <li>Listicles dominate Top‑3; FS present; low brand dominance.</li>
                      {mode==="domain" && <li>{Math.round((cluster.nearWinPct||0)*100)}% of terms are Near‑Wins (avg rank #7).</li>}
                      <li>Images pack frequently visible; consider illustrative shots.</li>
                    </ul>
                  </div>
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-1">Risks & flags</div>
                    <div className="flex flex-wrap gap-2">
                      <Pill muted><CircleHelp className="h-3.5 w-3.5"/><span className="text-xs">Zero‑click risk: Medium</span></Pill>
                      <Pill muted><ShoppingCart className="h-3.5 w-3.5"/><span className="text-xs">Light shopping bias</span></Pill>
                      <Pill muted><ShieldAlert className="h-3.5 w-3.5"/><span className="text-xs">Not YMYL</span></Pill>
                    </div>

                    {/* AIO‑R banner */}
                    <div className="mt-3 p-2 rounded border" style={{ borderColor: TK.borderLight, background:"#FAFCFF" }}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <b>AIO‑R</b> {cluster.aior.score} • {cluster.aior.label}
                          <Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 inline ml-1 text-[#9CA3AF] cursor-help"/></TooltipTrigger>
                            <TooltipContent className="max-w-[280px] text-xs">
                              AI Output Risk based on topic sensitivity, ambiguity and reference density.
                              Higher score → safer to draft with AI + editorial review.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Button size="sm" className="cursor-pointer" onClick={sendCanvas}>Send to Content Canvas</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Buckets */}
              <Section
                title="Keyword Buckets"
                id="clu-buckets"
                icon={<Layers3 className="h-4 w-4" style={{ color: TK.brand }} />}
                right={
                  <div className="inline-flex items-center gap-2">
                    <Input className="h-8 w-[240px]" placeholder="Search in cluster…" value={q} onChange={(e)=>setQ(e.target.value)}/>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button className="h-8 cursor-pointer" variant="outline">Move to…</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px]">
                        <div className="space-y-2">
                          {["head","variants","questions","longtails"].map(b => (
                            <Button key={b} size="sm" className="w-full cursor-pointer" variant="outline" onClick={()=>moveItems(b as any)}>
                              {b[0].toUpperCase()+b.slice(1)}
                            </Button>
                          ))}
                          <Button size="sm" variant="ghost" className="w-full cursor-pointer" onClick={removeSelected}>Remove selected</Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                }>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                  {([
                    { key:"head", label:"Head", items: cluster.buckets.head },
                    { key:"variants", label:"Variants", items: cluster.buckets.variants },
                    { key:"questions", label:"Questions", items: cluster.buckets.questions },
                    { key:"longtails", label:"Long‑tails", items: cluster.buckets.longtails },
                  ] as const).map(b => {
                    const rows = b.items.filter(i => !q || i.keyword.toLowerCase().includes(q.toLowerCase()));
                    return (
                      <div key={b.key} className="rounded border" style={{ borderColor: TK.borderLight }}>
                        <div className="px-2 py-1.5 border-b flex items-center justify-between" style={{ borderColor: TK.borderLight }}>
                          <div className="text-sm font-medium">{b.label}</div>
                          <Pill muted>{rows.length}</Pill>
                        </div>
                        <div className="max-h-[260px] overflow-auto">
                          {rows.map(i => (
                            <label key={i.id} className="flex items-center gap-2 px-2 py-1.5 border-b text-sm hover:bg-[#F8FAFC] cursor-pointer" style={{ borderColor: TK.borderLight }}>
                              <Checkbox checked={!!sel[i.id]} onCheckedChange={(v)=>setSel(s => ({ ...s, [i.id]: Boolean(v) }))}/>
                              <span title={i.keyword} className="truncate">{i.keyword}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{formatInt(i.vol)}</span>
                            </label>
                          ))}
                          {rows.length===0 && <div className="px-2 py-3 text-xs text-muted-foreground">No items.</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Floating bulk bar */}
                {selectedKeywords.length>0 && (
                  <div className="mt-3 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
                    <span className="text-sm"><b>{selectedKeywords.length}</b> selected</span>
                    <span className="inline-block w-px h-5 bg-[#E5E7EB]" />
                    {mode==="domain" && <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>addTrackingScope("selected")}><Target className="h-4 w-4 mr-1"/> Add to Tracking</Button>}
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>saveListScope("selected")}><BookmarkPlus className="h-4 w-4 mr-1"/> Save to List</Button>
                    <div className="ml-auto">
                      <Button size="sm" variant="ghost" className="cursor-pointer" onClick={()=>setSel({})}>Clear</Button>
                    </div>
                  </div>
                )}
              </Section>

              {/* AI Brief */}
              <Section
                title="AI Brief"
                id="clu-brief"
                icon={<NotebookPen className="h-4 w-4" style={{ color: TK.brand }} />}
                right={
                  <div className="inline-flex items-center gap-2">
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={sendCanvas}><Layers3 className="h-4 w-4 mr-1"/> Send to Content Canvas</Button>
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>onCreateTask?.({ type:"draft_pillar", clusterId: cluster.id })}><ClipboardList className="h-4 w-4 mr-1"/> Create Task</Button>
                  </div>
                }>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Titles */}
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-2">Working Titles</div>
                    <div className="space-y-2">
                      {cluster.titles.map((t, idx)=> (
                        <div key={idx} className="flex items-center gap-2">
                          <Input value={t} onChange={(e)=>{
                            const arr=[...cluster.titles]; arr[idx]=e.target.value; setCluster(c=>({ ...c, titles:arr }));
                          }}/>
                          <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=>{
                            const arr=cluster.titles.filter((_,i)=>i!==idx); setCluster(c=>({ ...c, titles:arr }));
                          }}><Minus className="h-4 w-4"/></Button>
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" className="cursor-pointer" onClick={()=> setCluster(c=>({ ...c, titles:[...c.titles, "New working title"] }))}><Plus className="h-4 w-4 mr-1"/> Add title</Button>
                    </div>
                  </div>

                  {/* Outline */}
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Outline H2/H3</div>
                      <div className="inline-flex items-center gap-1">
                        <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>addOutline("h2")}><Plus className="h-4 w-4 mr-1"/> H2</Button>
                        <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>addOutline("h3")}><Plus className="h-4 w-4 mr-1"/> H3</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {cluster.outline.map((o, i)=> (
                        <div key={o.id} className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 opacity-50"/>
                          <Select value={o.level} onValueChange={(v:any)=> setCluster(c=>{
                            const arr=[...c.outline]; arr[i] = { ...arr[i], level:v }; return { ...c, outline:arr };
                          })}>
                            <SelectTrigger className="h-8 w-[76px] px-2"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="h2">H2</SelectItem><SelectItem value="h3">H3</SelectItem></SelectContent>
                          </Select>
                          <Input value={o.text} onChange={(e)=> setCluster(c=>{
                            const arr=[...c.outline]; arr[i] = { ...arr[i], text:e.target.value }; return { ...c, outline:arr };
                          })}/>
                          <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=>moveOutline(o.id,-1)} title="Up"><ChevronUp className="h-4 w-4"/></Button>
                          <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=>moveOutline(o.id,1)} title="Down"><ChevronDown className="h-4 w-4"/></Button>
                          <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=>deleteOutline(o.id)} title="Remove"><X className="h-4 w-4"/></Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Entities */}
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-2">Entity Coverage</div>
                    <div className="flex flex-wrap gap-2">
                      {cluster.entities.map((e,idx)=> (
                        <button key={e.text}
                          className={cn("px-2 py-1 rounded-full border text-sm cursor-pointer", e.covered && "font-semibold")}
                          style={{ borderColor: TK.borderLight, background: e.covered ? TK.pastel : "#FFF" }}
                          onClick={()=>toggleEntity(idx)}
                        >
                          {e.text} {e.covered ? "• Covered" : "• Missing"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FAQ & Schema */}
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm font-medium mb-2">FAQs & PAA</div>
                        <div className="space-y-1">
                          {cluster.faqs.map((f,idx)=> (
                            <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox checked={f.include} onCheckedChange={()=>toggleFaq(idx)}/>
                              <span>{f.text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2">Schema suggestions</div>
                        {(["Article","HowTo","FAQ","Product","LocalBusiness"] as (keyof ClusterData["schema"])[]).map(k => (
                          <label key={k} className="flex items-center justify-between text-sm cursor-pointer">
                            <span>{k}</span>
                            <Checkbox checked={cluster.schema[k]} onCheckedChange={()=>toggleSchema(k)}/>
                          </label>
                        ))}
                        <div className="mt-2 text-xs text-muted-foreground">Toggling updates JSON outline in Content Canvas.</div>
                      </div>
                    </div>
                  </div>

                  {/* Visual cues */}
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-2">Visual cues</div>
                    <ul className="list-disc ml-5 text-sm space-y-1">
                      <li>Diagram: “How crawling → indexing → ranking flows”</li>
                      <li>Screenshot: PageSpeed Insights waterfall</li>
                      <li>Table: Minimum CWV thresholds per template</li>
                    </ul>
                  </div>

                  {/* Internal link plan preview */}
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-1">Internal link plan (preview)</div>
                    <div className="text-xs text-muted-foreground mb-2">Open the full section to export or create tasks.</div>
                    <div className="text-sm">Hub: <b className="text-[var(--wr-action,#0077FF)]">{cluster.hub.title}</b> → {cluster.spokes.length} spokes</div>
                  </div>
                </div>
              </Section>

              {/* Internal Links */}
              <Section
                title="Internal Links"
                id="clu-links"
                icon={<LinkIcon className="h-4 w-4" style={{ color: TK.brand }} />}
                right={
                  mode==="domain" ? (
                    <div className="inline-flex items-center gap-2">
                      <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>onCreateTask?.({ type:"internal_links", clusterId: cluster.id })}><ListChecks className="h-4 w-4 mr-1"/> Create Task</Button>
                      <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>onExport?.("csv")}><Download className="h-4 w-4 mr-1"/> Export plan</Button>
                    </div>
                  ) : null
                }>
                {mode === "domain" ? (
                  <>
                    <div className="rounded border p-3 mb-3" style={{ borderColor: TK.borderLight }}>
                      <div className="text-sm font-medium mb-1">Hub & Spokes recommendation</div>
                      <div className="text-sm">Hub: <a href={cluster.hub.slug} onClick={(e)=>e.preventDefault()} className="text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer">{cluster.hub.title}</a> <Pill muted>Confidence {cluster.hub.confidence}</Pill></div>
                      <div className="text-sm mt-1">Spokes: {cluster.spokes.join(" • ")}</div>
                    </div>

                    <div className="rounded border" style={{ borderColor: TK.borderLight }}>
                      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: TK.borderLight }}>
                        <div className="text-sm font-medium">Suggested sources → Hub</div>
                        <div className="text-xs text-muted-foreground">DILS = internal link lift estimate</div>
                      </div>
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source page</TableHead>
                            <TableHead className="w-[120px] text-center">Relevance</TableHead>
                            <TableHead className="w-[150px] text-center">Current links → Target</TableHead>
                            <TableHead className="w-[120px] text-center">DILS lift</TableHead>
                            <TableHead className="w-[100px] text-center">AQS</TableHead>
                            <TableHead className="w-[220px]">Anchor suggestions</TableHead>
                            <TableHead className="w-[120px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cluster.linkSuggestions.map((s,i)=> (
                            <TableRow key={i} className="hover:bg-[#F8FAFC]">
                              <TableCell><a href={s.sourcePath} onClick={(e)=>e.preventDefault()} className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer">{s.sourcePath}</a></TableCell>
                              <TableCell className="text-center">{s.relevance}</TableCell>
                              <TableCell className="text-center">{s.currentLinksToTarget}</TableCell>
                              <TableCell className="text-center">{s.dilsLift}%</TableCell>
                              <TableCell className="text-center">{s.aqs ?? "—"}</TableCell>
                              <TableCell>
                                <div className="text-xs space-y-1">
                                  <div><b>Exact:</b> {s.anchors.exact}</div>
                                  <div><b>Partial:</b> {s.anchors.partial}</div>
                                  <div><b>Brand:</b> {s.anchors.brand}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="inline-flex items-center gap-1.5">
                                  <Button size="sm" variant="outline" className="cursor-pointer"><LinkIcon className="h-4 w-4 mr-1"/> Add link</Button>
                                  <Button size="icon" variant="ghost" className="cursor-pointer" title="Open Link Analyzer"><ExternalLink className="h-4 w-4"/></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {cluster.orphanOpps.length>0 && (
                      <div className="mt-3 rounded border p-3" style={{ borderColor: TK.borderLight }}>
                        <div className="text-sm font-medium mb-1">Orphan opportunities</div>
                        <ul className="list-disc ml-5 text-sm">
                          {cluster.orphanOpps.map((o,i)=>(<li key={i}>{o.path} • Relevance {o.relevance}</li>))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <UpsellCard title="Connect a project to unlock Internal Links">
                    Unlock DILS lift estimates, anchor suggestions, and Link Analyzer workflows for this cluster.
                  </UpsellCard>
                )}
              </Section>

              {/* SERP Coverage (colored feature icons) */}
              <Section title="SERP Coverage" id="clu-serp" icon={<PanelsTopLeft className="h-4 w-4" style={{ color: TK.brand }} />}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-2">Feature heatmap (share of terms)</div>
                    <div className="space-y-2">
                      {(["fs","paa","video","images","local","shopping","news","sitelinks"] as Feature[]).map(f => {
                        const v = Math.round((cluster.coverage[f] ?? 0)*100);
                        return (
                          <div key={f} className="flex items-center gap-2">
                            <div className="w-32 text-sm flex items-center gap-1 capitalize">
                              <FeatureIcon f={f} />
                              {f}
                            </div>
                            <div className="h-2 flex-1 rounded bg-[#E5E7EB] relative overflow-hidden">
                              <span className="absolute left-0 top-0 h-full" style={{ width:`${v}%`, background: FEATURE_COLORS[f] }} />
                            </div>
                            <div className="w-10 text-xs text-right">{v}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-2">Top competitors (cluster level)</div>
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead className="w-[90px] text-center">WR</TableHead>
                          <TableHead className="w-[120px] text-center">Top‑10 share</TableHead>
                          <TableHead className="w-[120px] text-center">FS/PAA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cluster.competitors.map((d,i)=> (
                          <TableRow key={i}>
                            <TableCell>{d.domain}</TableCell>
                            <TableCell className="text-center">{d.wr}</TableCell>
                            <TableCell className="text-center">{Math.round(d.share*100)}%</TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center gap-1">
                                {d.ownsFs && <Sparkles className="h-4 w-4" style={{ color: FEATURE_COLORS.fs }} />}
                                {d.ownsPaa && <SquareStack className="h-4 w-4" style={{ color: FEATURE_COLORS.paa }} />}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="text-sm mt-2"><b>Format guidance:</b> {cluster.guidance}</div>
                  </div>
                </div>
              </Section>

              {/* Entities + Questions */}
              <Section
                title="Entities & Questions"
                id="clu-entities"
                icon={<CircleHelp className="h-4 w-4" style={{ color: TK.brand }} />}
                right={
                  <Button size="sm" className="cursor-pointer" onClick={()=> krTrack("kr.clusters.apply_entities_to_outline", { id: cluster.id })}>
                    Apply selected to Outline
                  </Button>
                }>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-2">Entity cloud</div>
                    <div className="flex flex-wrap gap-2">
                      {cluster.entities.map((e,i)=> (
                        <button key={i} className={cn("px-2 py-1 rounded-full border text-sm cursor-pointer", e.covered && "font-semibold")}
                          style={{ borderColor: TK.borderLight, background: e.covered? TK.pastel : "#FFF" }}
                          onClick={()=>toggleEntity(i)}
                        >
                          {e.text} {e.covered ? "• Covered" : "• Missing"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                    <div className="text-sm font-medium mb-2">Top PAA questions</div>
                    <div className="space-y-1">
                      {cluster.faqs.map((f,idx)=> (
                        <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={f.include} onCheckedChange={()=>toggleFaq(idx)}/>
                          <span>{f.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Publishing plan */}
              <Section
                title="Publishing Plan"
                id="clu-plan"
                icon={<ClipboardList className="h-4 w-4" style={{ color: TK.brand }} />}
                right={<div className="inline-flex items-center gap-2"><Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>onCreateTask?.({ type:"batch_publish", clusterId: cluster.id })}>Create all tasks</Button></div>}
              >
                <div className="text-sm mb-2">Recommended order (based on WOS & dependencies)</div>
                <ol className="ml-5 list-decimal text-sm space-y-1">
                  {cluster.plan.items.map((p,i)=> (
                    <li key={i}><b className="capitalize">{p.type}</b> — {p.title}</li>
                  ))}
                </ol>
                <div className="mt-2 text-sm"><b>Timeline:</b> ~{cluster.plan.weeks} weeks. <span className="text-muted-foreground">Consider seasonality if peak months are approaching.</span></div>
              </Section>
            </div>
          </div>
        </aside>
      </div>

      {/* AIO‑R guard modal */}
      <Dialog open={showGuard} onOpenChange={setShowGuard}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>SME required</DialogTitle></DialogHeader>
          <div className="text-sm">
            This topic may be sensitive (AIO‑R). Assign an SME reviewer in the task before sending to writers.
            Continue to Content Canvas anyway?
          </div>
          <DialogFooter>
            <Button variant="ghost" className="cursor-pointer" onClick={()=>setShowGuard(false)}>Cancel</Button>
            <Button className="cursor-pointer" onClick={()=>{ setShowGuard(false); onSendToCanvas?.({ clusterId: cluster.id, title: name, brief: cluster }); }}>Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

/* ============ Section shell ============ */
const Section: React.FC<React.PropsWithChildren<{ title:string; id?:string; right?:React.ReactNode; icon?: React.ReactNode }>> = ({ title, id, right, icon, children }) => (
  <section id={id} className="bg-white rounded-md border" style={{ borderColor: TK.borderLight, boxShadow: TK.shadowSm }}>
    <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: TK.borderLight }}>
      <h3 className="text-sm font-semibold inline-flex items-center gap-2">
        {icon}{title}
      </h3>
      <div className="flex items-center gap-2">{right}</div>
    </div>
    <div className="p-3">{children}</div>
  </section>
);

const Kpi: React.FC<{ label:string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
    <div className="text-xs" style={{ color: TK.muted }}>{label}</div>
    <div className="mt-1">{value}</div>
  </div>
);

const UpsellCard: React.FC<React.PropsWithChildren<{ title:string }>> = ({ title, children }) => (
  <div className="rounded border p-3 bg-[#FAFBFF]" style={{ borderColor: TK.borderLight }}>
    <div className="font-medium mb-1">{title}</div>
    <div className="text-sm text-muted-foreground">{children}</div>
    <div className="mt-2">
      <Button size="sm" className="cursor-pointer" onClick={()=>alert("Connect Project flow")}>Connect Project</Button>
      <Button size="sm" variant="outline" className="ml-2 cursor-pointer">Learn more</Button>
    </div>
  </div>
);

/* ============ Demo wrapper (Drop‑in friendly) ============ */
export default function DemoClusterCanvasDrawer() {
  const [open, setOpen] = React.useState(true);
  const [mode, setMode] = React.useState<Mode>("domain");

  return (
<>
      <ClusterCanvasDrawer
        open={open}
        onClose={()=>setOpen(false)}
        mode={mode}
        data={MOCK_CLUSTER}
        onRename={(n)=>{ console.log("rename →", n); }}
        onSendToCanvas={(p)=>{ console.log("send to content canvas", p); alert("Sent to Content Canvas"); }}
        onCreateTask={(p)=>{ console.log("create task", p); alert("Task created"); }}
        onAddTracking={(k)=>{ console.log("track", k); alert(`Added ${k.length} keywords to tracking`); }}
        onExport={(fmt)=>{ console.log("export", fmt); alert(`Export ${fmt}`); }}
        onSaveList={(k)=>{ console.log("save list", k); alert(`Saved ${k.length} keywords to a list`); }}
        onOpenPageAudit={(path)=>{ alert(`Open Page Analyzer for ${path}`); }}
      />
</>
  );
}
