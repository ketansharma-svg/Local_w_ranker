import * as React from "react";
import {
  // UI & actions
  Settings2, Save, Download, Plus, MoreHorizontal, Filter, Info, ChevronDown, ChevronUp,
  // Table row actions
  ChartNoAxesColumn, ClipboardList, Target, FileSearch, Layers3, BookmarkPlus, Eye,
  // SERP features
  Sparkles, SquareStack, Video, Image as ImageIcon, MapPin, ShoppingCart, Newspaper, PanelsTopLeft,
} from "lucide-react";

/* ---------- shadcn/ui (same set we used elsewhere) ---------- */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell
} from "@/components/ui/table";
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent
} from "@/components/ui/tooltip";
import {
  Popover, PopoverTrigger, PopoverContent
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AddToTrackerModal } from "@/src/app/organic-visibility/competitors/AddToTrack";

/* ============================================================
   ======================== Tokens =============================
   ============================================================ */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD", // updated brand color
  action: "var(--wr-action,#0077FF)",
  pastel: "var(--wr-bg-pastel,#D9EEF8)",

  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",

  radius: "6px",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const formatInt = (n?: number) =>
  n == null ? "—" : n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(1) + "k" : String(n);
const pct = (x?: number, digits = 0) => (x == null ? "—" : `${(x * 100).toFixed(digits)}%`);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* ============================================================
   ========================= Types =============================
   ============================================================ */
type Mode = "domain" | "no-domain";
type Feature = "fs" | "paa" | "video" | "images" | "local" | "shopping" | "news" | "sitelinks";
type Intent = "informational" | "commercial" | "transactional" | "local" | "navigational";
type RecFormat = "Listicle" | "Guide" | "How‑to" | "PDP" | "Category" | "Local page" | "Video";

/* ---------- No‑Domain rows ---------- */
type EasyWinRow = {
  id: string; keyword: string; volume: number; wkd: number; intent: Intent;
  cpTop3: number; wos: number; tm: number; features: Feature[]; recFormat: RecFormat;
};
type RisingRow = {
  id: string; keyword: string; volume: number; wkd: number; tm: number;
  peaks?: string; features: Feature[]; recFormat: RecFormat;
};
type FormatFitRow = {
  id: string; keyword: string; volume: number; wkd: number; intent: Intent; features: Feature[];
  recFormat: RecFormat; why: string;
};

/* ---------- Domain‑Aware rows ---------- */
type NearWinRow = {
  id: string; keyword: string; volume: number; rank: number; yourCp: number; features: Feature[];
  deltaCpToTarget?: number; // computed
  impactClicks?: number;    // computed
  impactRevenue?: number;   // computed
  recommended: string[];    // chips
  effort: number;           // 0..100
  ops?: number;             // computed
  page: string;
};
type GapRow = {
  id: string; keyword: string; volume: number; wkd: number; intent: Intent; gap: "new" | "missed" | "shared";
  topCompetitor: { domain: string; avgRank: number; ownsFs?: boolean };
  features: Feature[]; recFormat: RecFormat;
  impactClicks?: number; ops?: number;
};
type CannibalRow = {
  id: string; clusterOrKeyword: string; pagesCompeting: number;
  primaryPage: string; otherPages: string[]; lostCpPerMonth: number;
  recommended: string; effort: number; ops: number;
  // For conflict drawer
  history: number[]; // 12 pts simulated flip-flop score
};

/* ============================================================
   ================ Mock data (demo‑ready) ====================
   ============================================================ */
const EZ: EasyWinRow[] = [
  { id:"e1", keyword:"technical seo checklist", volume:2900, wkd:41, intent:"informational", cpTop3:0.18, wos:0.63, tm:0.8,  features:["fs","images"], recFormat:"Guide" },
  { id:"e2", keyword:"best technical seo tools", volume:880,  wkd:58, intent:"commercial",     cpTop3:0.22, wos:0.55, tm:1.2,  features:["paa","video"], recFormat:"Listicle" },
  { id:"e3", keyword:"site speed audit",        volume:210,  wkd:49, intent:"local",          cpTop3:0.15, wos:0.44, tm:0.1,  features:["local","images"], recFormat:"Local page" },
  { id:"e4", keyword:"schema markup guide",     volume:720,  wkd:52, intent:"informational",  cpTop3:0.17, wos:0.57, tm:0.6,  features:["fs","news"], recFormat:"Guide" },
];
const RISE: RisingRow[] = [
  { id:"r1", keyword:"core web vitals inp",  volume:5400, wkd:64, tm:1.8,  peaks:"Apr–Jun", features:["news","images"], recFormat:"Guide" },
  { id:"r2", keyword:"ai seo content policy", volume:1600, wkd:55, tm:1.6,  peaks:"Sep–Nov", features:["news"],          recFormat:"Guide" },
  { id:"r3", keyword:"how to implement faq schema", volume:1200, wkd:47, tm:1.3, peaks:"—", features:["paa","fs"], recFormat:"How‑to" },
];
const FIT: FormatFitRow[] = [
  { id:"f1", keyword:"best seo audit tools", volume:5400, wkd:68, intent:"commercial", features:["paa","video"], recFormat:"Listicle",  why:"Listicles dominate Top‑3; PAA dense; review snippets common." },
  { id:"f2", keyword:"technical seo how to", volume:2200, wkd:51, intent:"informational", features:["fs","paa"], recFormat:"How‑to",     why:"How‑to with step anchors; FS + PAA present; FAQ underused." },
  { id:"f3", keyword:"seo category page optimization", volume:800, wkd:59, intent:"commercial", features:["sitelinks"], recFormat:"Category", why:"Category pages rank; sitelinks prevalent; internal link depth matters." },
];

/* Domain‑Aware */
const NW: NearWinRow[] = [
  { id:"n1", keyword:"technical seo checklist", volume:2900, rank:8, yourCp:0.07, features:["fs","images"], recommended:["+FAQ","+HowTo","Improve Title","Internal Links"], effort:45, page:"/guide/technical-seo-checklist" },
  { id:"n2", keyword:"best seo audit tools",    volume:5400, rank:6, yourCp:0.10, features:["paa","video"],  recommended:["Internal Links","Acquire Links"], effort:58, page:"/blog/best-seo-audit-tools" },
  { id:"n3", keyword:"site speed audit",        volume:210,  rank:12, yourCp:0.03, features:["local","images"], recommended:["Local factors","+FAQ"], effort:36, page:"/services/site-speed-audit" },
];
const GAPS: GapRow[] = [
  { id:"g1", keyword:"seo audit template",   volume:3600, wkd:57, intent:"informational", gap:"new",    topCompetitor:{domain:"brand.io", avgRank:4, ownsFs:true},  features:["fs","paa"], recFormat:"Guide" },
  { id:"g2", keyword:"compare seo tools",    volume:2800, wkd:65, intent:"commercial",    gap:"missed", topCompetitor:{domain:"example.com", avgRank:3},            features:["paa","video"], recFormat:"Listicle" },
  { id:"g3", keyword:"schema validator",     volume:2200, wkd:61, intent:"informational", gap:"shared", topCompetitor:{domain:"dev.docs", avgRank:6},              features:["fs"], recFormat:"Guide" },
];
const CANN: CannibalRow[] = [
  { id:"c1", clusterOrKeyword:"technical seo checklist", pagesCompeting:3, primaryPage:"/guide/technical-seo-checklist", otherPages:["/blog/technical-seo","/resources/checklist-tech-seo.pdf"], lostCpPerMonth:210, recommended:"Consolidate → Primary", effort:68, ops:61, history:[48,55,44,58,43,57,45,59,42,60,41,61] },
  { id:"c2", clusterOrKeyword:"seo site speed", pagesCompeting:2, primaryPage:"/guide/site-speed", otherPages:["/blog/site-speed-audit"], lostCpPerMonth:90, recommended:"Retarget secondary", effort:52, ops:57, history:[60,58,61,57,62,56,63,54,62,53,61,55] },
];

/* ============================================================
   ================ CTR / Impact / Effort model ===============
   ============================================================ */
const CTR_DESKTOP = [0.28,0.15,0.10,0.07,0.05,0.04,0.032,0.027,0.022,0.018,0.015,0.013,0.011,0.010,0.009,0.008,0.007,0.006,0.005,0.004];

function dampenByFeatures(features: Feature[]): number {
  let d = 1;
  if (features.includes("fs")) d *= 0.60;
  if (features.includes("shopping")) d *= 0.75;
  if (features.includes("local")) d *= 0.80;
  if (features.includes("video")) d *= 0.92;
  if (features.includes("images")) d *= 0.92;
  if (features.includes("news")) d *= 0.94;
  return clamp01(d);
}
function ctrAdj(rank: number, features: Feature[]) {
  const base = CTR_DESKTOP[Math.min(rank, 20) - 1] || 0.003;
  return base * dampenByFeatures(features);
}
function momentumBoost(tm?: number) {
  if (tm == null) return 1;
  return clamp01(0.6 + (tm + 2) / 4); // −2..+2  → 0.6..1.6 (clamped)
}
function effortLabel(score: number) {
  if (score < 40) return { label:"Low", color: TK.ok };
  if (score < 70) return { label:"Medium", color: TK.warn };
  return { label:"High", color: TK.critical };
}

/* ============================================================
   ===================== Small UI atoms =======================
   ============================================================ */
const SectionCard: React.FC<React.PropsWithChildren<{ title: React.ReactNode; right?: React.ReactNode }>> = ({ title, right, children }) => (
  <section className="rounded-md border bg-white" style={{ borderColor: TK.border, boxShadow: TK.shadowSm }}>
    <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: TK.borderLight }}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex items-center gap-2">{right}</div>
    </div>
    <div className="p-3">{children}</div>
  </section>
);

const FeatureIcon: React.FC<{ f: Feature }> = ({ f }) => {
  const cls = "h-4 w-4";
  const st = { color: TK.brand };
  switch (f) {
    case "fs": return <Sparkles className={cls} style={st} />;
    case "paa": return <SquareStack className={cls} style={st} />;
    case "video": return <Video className={cls} style={st} />;
    case "images": return <ImageIcon className={cls} style={st} />;
    case "local": return <MapPin className={cls} style={st} />;
    case "shopping": return <ShoppingCart className={cls} style={st} />;
    case "news": return <Newspaper className={cls} style={st} />;
    case "sitelinks": return <PanelsTopLeft className={cls} style={st} />;
  }
};

const Chip: React.FC<{ children: React.ReactNode; color?: string; active?: boolean; title?: string }> = ({ children, color, active, title }) => (
  <span
    title={title}
    className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]",
      active && "font-semibold"
    )}
    style={{ borderColor: TK.borderLight, background: active ? TK.pastel : "#FFF", color: color || TK.text }}
  >
    {children}
  </span>
);

const Bar100: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn("h-2 w-20 rounded bg-[#E5E7EB] relative overflow-hidden", className)}>
    <span className="absolute left-0 top-0 h-full" style={{ width: `${Math.round(value)}%`, background: TK.action }} />
  </div>
);

const HeaderSort: React.FC<{ label: string; tip?: string; active?: boolean; dir?: "asc" | "desc"; onSort: (dir: "asc" | "desc") => void; }> = ({ label, tip, active, dir, onSort }) => (
  <div className="inline-flex items-center gap-1">
    <button
      className="inline-flex items-center gap-1 cursor-pointer select-none"
      onClick={() => onSort(!active ? "desc" : dir === "desc" ? "asc" : "desc")}
      aria-pressed={active}
    >
      <span>{label}</span>
      {active ? (dir === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />) : <ChevronDown className="h-4 w-4 opacity-40" />}
    </button>
    {tip && (
        <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-[#9AA3AF] cursor-help" /></TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-xs">{tip}</TooltipContent>
      </Tooltip>
      </TooltipProvider>
    )}
  </div>
);

/* ============================================================
   =============== Settings & Conflict drawers ================
   ============================================================ */
type SettingsState = {
  targetRank: 1 | 3 | 5;
  baselineRank: number;
  nearWinMin: number; nearWinMax: number;
  weights: { content: number; internal: number; technical: number; backlinks: number };
  revenueModel: "ga4" | "project";
  ga4Connected: boolean;
  competitors: string[]; // for Gaps
};

const DEFAULT_SETTINGS: SettingsState = {
  targetRank: 3, baselineRank: 20, nearWinMin: 4, nearWinMax: 15,
  weights: { content: 35, internal: 25, technical: 15, backlinks: 25 },
  revenueModel: "ga4", ga4Connected: true,
  competitors: ["brand.io","example.com","docs.dev","reference.org"],
};

/* ---- Settings MODAL (centered) ---- */
const SettingsDrawer: React.FC<{
  open: boolean; onOpenChange: (v:boolean)=>void; settings: SettingsState; onChange: (s: SettingsState)=>void;
}> = ({ open, onOpenChange, settings, onChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Centered modal: remove top/right drawer overrides */}
      <DialogContent className="sm:max-w-[720px]" style={{ borderColor: TK.borderLight }}>
        <DialogHeader>
          <DialogTitle>Opportunities – Settings</DialogTitle>
          <DialogDescription>Adjust target rank, effort weights, revenue model, and competitors for Gaps.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <SectionCard title={<span className="inline-flex items-center gap-2"><PanelsTopLeft className="h-4 w-4" style={{color:TK.brand}}/> Impact model</span>}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-[140px]">Target rank</span>
                <Select value={String(settings.targetRank)} onValueChange={(v:any)=>onChange({...settings, targetRank: Number(v) as any})}>
                  <SelectTrigger className="h-8 w-[120px] px-2 cursor-pointer"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="1">Top‑1</SelectItem><SelectItem value="3">Top‑3</SelectItem><SelectItem value="5">Top‑5</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-[140px]">Baseline rank*</span>
                <Input type="number" className="h-8 w-[120px]" value={settings.baselineRank} onChange={(e)=>onChange({...settings, baselineRank:Number(e.target.value||20)})}/>
              </div>
              <div className="text-xs text-muted-foreground col-span-2">*Used when a keyword doesn’t rank yet.</div>
            </div>
          </SectionCard>

          <SectionCard title={<span className="inline-flex items-center gap-2"><Target className="h-4 w-4" style={{color:TK.brand}}/> Near‑Win window</span>}>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Rank range</span>
              <Input type="number" className="h-8 w-[80px]" value={settings.nearWinMin} onChange={(e)=>onChange({...settings, nearWinMin:Number(e.target.value||4)})} />
              <span>to</span>
              <Input type="number" className="h-8 w-[80px]" value={settings.nearWinMax} onChange={(e)=>onChange({...settings, nearWinMax:Number(e.target.value||15)})} />
            </div>
          </SectionCard>

          <SectionCard title={<span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" style={{color:TK.brand}}/> Effort weights (for Effort score)</span>}>
            <div className="grid grid-cols-2 gap-5">
              {(["content","internal","technical","backlinks"] as const).map(k => (
                <div key={k}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize text-muted-foreground">{k}</span>
                    <span className="text-sm font-medium">{settings.weights[k]}</span>
                  </div>
                  <Slider value={[settings.weights[k]]} min={0} max={100} step={1} onValueChange={(v:any)=>onChange({...settings, weights:{...settings.weights, [k]: v[0]}})} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={<span className="inline-flex items-center gap-2"><Save className="h-4 w-4" style={{color:TK.brand}}/> Revenue model</span>}>
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rev" checked={settings.revenueModel==="ga4"} onChange={()=>onChange({...settings, revenueModel:"ga4"})}/>
                <span className="text-sm">Use GA4 page CVR &amp; AOV</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rev" checked={settings.revenueModel==="project"} onChange={()=>onChange({...settings, revenueModel:"project"})}/>
                <span className="text-sm">Use project defaults</span>
              </label>
              {!settings.ga4Connected && <Chip color={TK.warn}>GA4 not connected</Chip>}
            </div>
          </SectionCard>

          <SectionCard title={<span className="inline-flex items-center gap-2"><FileSearch className="h-4 w-4" style={{color:TK.brand}}/> Default competitors for Gaps</span>}>
            <div className="flex flex-wrap items-center gap-2">
              {settings.competitors.map(d => <Chip key={d}>{d}</Chip>)}
              <Input className="h-8 w-[220px]" placeholder="Add domain…" onKeyDown={(e)=>{ if(e.key==="Enter"){ const v=(e.target as HTMLInputElement).value.trim(); if(v && !settings.competitors.includes(v)) onChange({...settings, competitors:[...settings.competitors, v]}); (e.target as HTMLInputElement).value=""; }}}/>
            </div>
          </SectionCard>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={()=>onOpenChange(false)} className="cursor-pointer">Close</Button>
          <Button onClick={()=>onOpenChange(false)} className="cursor-pointer">Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---- Cannibalization Conflict Drawer (kept as right drawer) ---- */
const ConflictDrawer: React.FC<{
  open: boolean; onOpenChange: (v:boolean)=>void; row?: CannibalRow;
}> = ({ open, onOpenChange, row }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] sm:!right-0 sm:!left-auto sm:!top-0 sm:!h-screen sm:!my-0 sm:!rounded-none border-l"
        style={{ borderColor: TK.borderLight }}>
        <DialogHeader>
          <DialogTitle>Conflict: {row?.clusterOrKeyword || "—"}</DialogTitle>
          <DialogDescription>Ranking flip‑flop, competing pages, and quick fixes.</DialogDescription>
        </DialogHeader>

        {!row ? <div/> : (
          <div className="space-y-4">
            <SectionCard title={<span className="inline-flex items-center gap-2"><ChartNoAxesColumn className="h-4 w-4" style={{color:TK.brand}}/> Ranking history (30d)</span>}>
              <MiniSparkline series={row.history} />
            </SectionCard>
            <SectionCard title={<span className="inline-flex items-center gap-2"><Layers3 className="h-4 w-4" style={{color:TK.brand}}/> Pages involved</span>}>
              <div className="space-y-2 text-sm">
                <div><b>Primary:</b> <a className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer" href="#" onClick={(e)=>e.preventDefault()}>{row.primaryPage}</a></div>
                <div><b>Others ({row.otherPages.length}):</b> {row.otherPages.slice(0,3).join(", ")}{row.otherPages.length>3 ? "…" : ""}</div>
                <div className="text-muted-foreground">Lost CP% / mo: <b>{row.lostCpPerMonth}</b></div>
              </div>
            </SectionCard>
            <SectionCard title={<span className="inline-flex items-center gap-2"><Target className="h-4 w-4" style={{color:TK.brand}}/> Internal link quick view</span>}>
              <div className="text-sm text-muted-foreground">Preview only. Open Link Analyzer for full map.</div>
              <div className="mt-2 flex gap-2">
                {["/guide/technical-seo","/blog/technical-seo","/resources/checklist"].map((p,i)=>(
                  <div key={i} className="rounded border px-2 py-1" style={{borderColor:TK.borderLight}}>
                    <div className="text-[12px]">{p}</div>
                    <Bar100 value={40 + i*15} />
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={()=>alert("Consolidation plan created")} className="cursor-pointer">Consolidate plan</Button>
                <Button size="sm" onClick={()=>alert("Task created")} className="cursor-pointer">
                  <ClipboardList className="h-4 w-4 mr-1 text-[#008CCD]"/> Create task
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={()=>alert("Open Page Analyzer")} className="cursor-pointer">
                <FileSearch className="h-4 w-4 mr-1 text-[#008CCD]"/> Page Analyzer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MiniSparkline: React.FC<{ series: number[] }> = ({ series }) => {
  const width = 420, height = 80, pad = 6;
  const max = Math.max(...series), min = Math.min(...series);
  const points = series.map((v,i)=>{
    const x = pad + (i*(width-2*pad))/(series.length-1);
    const y = height - pad - ((v-min)/(max-min || 1))*(height-2*pad);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="block">
      <polyline points={points} fill="none" stroke={TK.action} strokeWidth="2" />
      <rect x="0" y={height-22} width={width} height="22" fill="transparent"/>
    </svg>
  );
};

/* ============================================================
   ======================= Main Component =====================
   ============================================================ */
type SubtabND = "easy" | "rising" | "format";
type SubtabDA = "nearwins" | "gaps" | "cannibal";

export default function OpportunitiesTabDemo() {
  const [mode, setMode] = React.useState<Mode>("domain"); // toggle for demo
  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 space-y-3" style={FONTS}>
        {/* Demo mode toggles */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mode:</span>
          <Button size="sm" variant={mode==="domain"?"default":"outline"} onClick={()=>setMode("domain")} className="cursor-pointer">Domain‑Aware</Button>
          <Button size="sm" variant={mode==="no-domain"?"default":"outline"} onClick={()=>setMode("no-domain")} className="cursor-pointer">No‑Domain</Button>
        </div>
        <OpportunitiesTab mode={mode}/>
      </div>
    </TooltipProvider>
  );
}

/* ============================================================
   ====================== Tab Implementation ==================
   ============================================================ */
export function OpportunitiesTab({ mode = "domain" }: { mode?: Mode }) {
  /* ---------- Settings + drawers ---------- */
  const [settings, setSettings] = React.useState<SettingsState>(DEFAULT_SETTINGS);
  const [openSettings, setOpenSettings] = React.useState(false);
  const [openConflict, setOpenConflict] = React.useState(false);
  const [conflictRow, setConflictRow] = React.useState<CannibalRow | undefined>(undefined);

  /* ---------- Subtabs ---------- */
  const [tabND, setTabND] = React.useState<SubtabND>("easy");
  const [tabDA, setTabDA] = React.useState<SubtabDA>("nearwins");

  /* ---------- Filtering / columns / selection ---------- */
  const [q, setQ] = React.useState("");
  const [featuresFilter, setFeaturesFilter] = React.useState<Feature[]>([]);
  const [savedView, setSavedView] = React.useState<string>("Default");

  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const selectedIds = React.useMemo(()=>Object.entries(selected).filter(([,v])=>v).map(([k])=>k),[selected]);

  // Keyboard (G/N/C quick open)
  React.useEffect(()=>{
    const onKey=(e: KeyboardEvent)=>{
      if (e.key.toLowerCase()==="g") mode==="domain"? setTabDA("gaps"): setTabND("rising");
      if (e.key.toLowerCase()==="n") mode==="domain"? setTabDA("nearwins"): setTabND("easy");
      if (e.key.toLowerCase()==="c" && mode==="domain") setTabDA("cannibal");
    };
    window.addEventListener("keydown", onKey); return ()=>window.removeEventListener("keydown", onKey);
  },[mode]);

  /* ---------- Helpers ---------- */
  const toggleChip = <T extends string>(arr:T[], val:T, set:(v:T[])=>void) => set(arr.includes(val)? arr.filter(x=>x!==val):[...arr,val]);



  const headerBar = (
    <div className="rounded-md border bg-white" style={{ borderColor: TK.border, boxShadow: TK.shadowSm }}>
      <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: TK.borderLight }}>
        {/* Left: Title with branded icon */}
        <div className="flex items-center gap-2">
          <PanelsTopLeft className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold">Opportunities</div>
        </div>

        {/* Center: Sub‑tabs (mode‑aware) */}
        <div className="inline-flex items-center gap-0.5 rounded-[6px] p-0.5" style={{ border:`1px solid ${TK.border}`, background:"#FFF" }}>
          {mode==="no-domain" ? (
            <>
              <button className={cn("h-8 px-3 rounded-[6px] cursor-pointer", tabND==="easy" ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold" : "text-[var(--wr-muted,#6B7280)]")} onClick={()=>setTabND("easy")}>Easy Wins</button>
              <button className={cn("h-8 px-3 rounded-[6px] cursor-pointer", tabND==="rising" ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold" : "text-[var(--wr-muted,#6B7280)]")} onClick={()=>setTabND("rising")}>Rising Topics</button>
              <button className={cn("h-8 px-3 rounded-[6px] cursor-pointer", tabND==="format" ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold" : "text-[var(--wr-muted,#6B7280)]")} onClick={()=>setTabND("format")}>Format Fit</button>
            </>
          ) : (
            <>
              <button className={cn("h-8 px-3 rounded-[6px] cursor-pointer", tabDA==="nearwins" ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold" : "text-[var(--wr-muted,#6B7280)]")} onClick={()=>setTabDA("nearwins")}>Near‑Wins</button>
              <button className={cn("h-8 px-3 rounded-[6px] cursor-pointer", tabDA==="gaps" ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold" : "text-[var(--wr-muted,#6B7280)]")} onClick={()=>setTabDA("gaps")}>Keyword Gaps</button>
              <button className={cn("h-8 px-3 rounded-[6px] cursor-pointer", tabDA==="cannibal" ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold" : "text-[var(--wr-muted,#6B7280)]")} onClick={()=>setTabDA("cannibal")}>Cannibalization</button>
            </>
          )}
        </div>

        {/* Right: Settings • Export • Add to Reports */}
        <div className="inline-flex items-center gap-2">
          <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={()=>setOpenSettings(true)}>
            <Settings2 className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Settings
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 px-3 cursor-pointer">
                <Download className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={()=>exportVisible("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={()=>exportVisible("xlsx")}>XLSX</DropdownMenuItem>
              <DropdownMenuItem onClick={()=>exportVisible("pdf")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={()=>alert("Added to Reports")}>
            <Save className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Add to Reports
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Input className="w-[300px] pl-8" placeholder="Search keyword…" value={q} onChange={(e)=>setQ(e.target.value)} />
          <svg className="absolute left-2 top-1/2 -translate-y-1/2" width="16" height="16"><circle cx="7" cy="7" r="6" fill="none" stroke="#9E9E9E"/><line x1="11" y1="11" x2="15" y2="15" stroke="#9E9E9E"/></svg>
        </div>
        {/* Simple features filter (both modes) */}
        {(["fs","paa","local","shopping"] as Feature[]).map(f => (
          <button
            key={f}
            className={cn("h-8 px-3 rounded-full border text-sm cursor-pointer", featuresFilter.includes(f) ? "font-semibold" : "hover:bg-[#F7FAFC]")}
            style={{ borderColor: TK.borderLight, background: featuresFilter.includes(f) ? TK.pastel : "#FFF" }}
            onClick={()=>toggleChip(featuresFilter, f, setFeaturesFilter)} aria-pressed={featuresFilter.includes(f)}
          >
            {f.toUpperCase()}
          </button>
        ))}

        {/* Saved views (lightweight presets) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8 px-3 cursor-pointer">
              <Save className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Saved views
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Apply view</DropdownMenuLabel>
            <DropdownMenuSeparator/>
            {(mode==="no-domain" ? ["Default","Easy Wins","Rising Topics"] : ["Default","Near‑Wins","Gaps"]).map(v => (
              <DropdownMenuItem key={v} onClick={()=>setSavedView(v)}>{v}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear */}
        <Button variant="ghost" className="ml-auto h-8 px-3 cursor-pointer" onClick={() => { setQ(""); setFeaturesFilter([]); }}>
          Clear
        </Button>
      </div>

      {/* Bulk bar */}
      {selectedIds.length>0 && (
        <div className="px-3 pb-2">
          <div className="w-full p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
            <span className="text-sm"><strong>{selectedIds.length}</strong> selected</span>
            <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
            <Button size="sm" variant="outline" onClick={()=>alert("Tasks created")} className="cursor-pointer"><ClipboardList className="h-4 w-4 mr-1 text-[#008CCD]"/> Create Tasks</Button>
            {mode==="domain" && <Button size="sm" variant="outline" onClick={()=>alert("Added to tracking")} className="cursor-pointer"><Target className="h-4 w-4 mr-1 text-[#008CCD]"/> Add to Tracking</Button>}
            <Button size="sm" variant="outline" onClick={()=>alert("Saved to list")} className="cursor-pointer"><BookmarkPlus className="h-4 w-4 mr-1 text-[#008CCD]"/> Save to List</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="cursor-pointer"><Download className="h-4 w-4 mr-1 text-[#008CCD]"/> Export Selected</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={()=>exportIds(selectedIds,"csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={()=>exportIds(selectedIds,"xlsx")}>XLSX</DropdownMenuItem>
                <DropdownMenuItem onClick={()=>exportIds(selectedIds,"pdf")}>PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto"><Button size="sm" variant="ghost" onClick={()=>setSelected({})} className="cursor-pointer">Clear selection</Button></div>
          </div>
        </div>
      )}
    </div>
  );

  /* ---------- Visibility helpers ---------- */
  function passCommonFilters<T extends { keyword?: string; features?: Feature[] }>(row: T): boolean {
    if (q && !String(row.keyword || "").toLowerCase().includes(q.toLowerCase())) return false;
    if (featuresFilter.length && !featuresFilter.every(f => row.features?.includes(f))) return false;
    return true;
  }

  /* ---------- Export stubs ---------- */
  function exportVisible(fmt: "csv"|"xlsx"|"pdf") { alert(`Export ${fmt} – current sub‑tab`); }
  function exportIds(ids: string[], fmt: "csv"|"xlsx"|"pdf") { alert(`Export ${fmt} – ${ids.length} rows`); }

  /* ---------- Renderers ---------- */
  const renderNoDomain = () => {
    if (tabND === "easy") return <EasyWinsTable rows={EZ.filter(passCommonFilters)} settings={settings} selected={selected} setSelected={setSelected} />;
    if (tabND === "rising") return <RisingTable rows={RISE.filter(passCommonFilters)} settings={settings} selected={selected} setSelected={setSelected} />;
    return <FormatFitTable rows={FIT.filter(passCommonFilters)} settings={settings} selected={selected} setSelected={setSelected} />;
  };

  const renderDomainAware = () => {
    if (tabDA === "nearwins") return <NearWinsTable rows={NW.filter(passCommonFilters)} settings={settings} selected={selected} setSelected={setSelected} />;
    if (tabDA === "gaps") return <GapsTable rows={GAPS.filter(passCommonFilters)} settings={settings} selected={selected} setSelected={setSelected} competitors={settings.competitors} />;
    return (
      <>
        <CannibalTable rows={CANN} selected={selected} setSelected={setSelected}
          onOpenConflict={(row)=>{ setConflictRow(row); setOpenConflict(true); }}
        />
        <ConflictDrawer open={openConflict} onOpenChange={setOpenConflict} row={conflictRow}/>
      </>
    );
  };

  return (
    <>
      {headerBar}
      <div className="space-y-3">
        {mode === "no-domain" ? renderNoDomain() : renderDomainAware()}
      </div>

      <SettingsDrawer open={openSettings} onOpenChange={setOpenSettings} settings={settings} onChange={setSettings}/>
    </>
  );
}

/* ============================================================
   ==================== Table: Easy Wins ======================
   ============================================================ */
const EasyWinsTable: React.FC<{
  rows: EasyWinRow[]; settings: SettingsState;
  selected: Record<string,boolean>; setSelected: (v:Record<string,boolean>)=>void;
}> = ({ rows, settings, selected, setSelected }) => {
  const [sort, setSort] = React.useState<{key: keyof EasyWinRow | "impact" | "ops"; dir:"asc"|"desc"}>({ key:"impact", dir:"desc" } as any);

  const enriched = React.useMemo(()=> rows.map(r => {
    const cp = ctrAdj(settings.targetRank, r.features);       // CP% at target
    const impactClicks = Math.round(r.volume * cp);           // No‑domain: Top‑target impact (not delta)
    const ops = Math.round( clamp01((impactClicks / Math.max(...rows.map(x=>x.volume * ctrAdj(settings.targetRank, x.features)))) ) * (1 - r.wkd/100) * momentumBoost(r.tm) * 100 );
    return { ...r, impactClicks, ops };
  }), [rows, settings]);

  const sorted = React.useMemo(()=> {
    const list = [...enriched];
    list.sort((a,b)=>{
      const dir = sort.dir==="asc"?1:-1;
      const get = (x:any) => sort.key==="impact"? x.impactClicks : sort.key==="ops"? x.ops : x[sort.key];
      return (get(a) > get(b) ? 1 : -1) * dir;
    });
    return list;
  }, [enriched, sort]);

  const allSel = sorted.length>0 && sorted.every(r=>selected[r.id]);

  return (
    <SectionCard
      title={<span className="inline-flex items-center gap-2"><Target className="h-4 w-4" style={{color:TK.brand}}/> Easy Wins</span>}
      right={<span className="text-xs text-muted-foreground">Default sort: Impact desc</span>}
    >
      <div className="border rounded" style={{ borderColor: TK.borderLight }}>
        <Table className="text-sm">
          <TableHeader className="sticky top-0 bg-white z-10" style={{ borderBottom:`1px solid ${TK.borderLight}` }}>
            <TableRow>
              <TableHead className="w-[46px] text-center"><Checkbox checked={allSel} onCheckedChange={(v)=>{ const n={...selected}; sorted.forEach(r=>n[r.id]=Boolean(v)); setSelected(n); }}/></TableHead>
              <TableHead className="min-w-[320px]"><HeaderSort label="Keyword" active={sort.key==="keyword"} dir={sort.dir} onSort={(d)=>setSort({key:"keyword",dir:d})} /></TableHead>
              <TableHead className="w-[110px] text-right"><HeaderSort label="Volume" active={sort.key==="volume"} dir={sort.dir} onSort={(d)=>setSort({key:"volume",dir:d})} tip="Average monthly searches (normalized)." /></TableHead>
              <TableHead className="w-[100px] text-center"><HeaderSort label="WKD" active={sort.key==="wkd"} dir={sort.dir} onSort={(d)=>setSort({key:"wkd",dir:d})} tip="Competition based on current SERP strength, features & brands." /></TableHead>
              <TableHead className="w-[110px] text-center">Intent</TableHead>
              <TableHead className="w-[110px] text-right"><HeaderSort label="CP% (Top‑target)" active={false} onSort={()=>{}} tip="Expected organic click share at target rank with feature dampening." /></TableHead>
              <TableHead className="w-[110px] text-center">TM</TableHead>
              <TableHead className="w-[160px] text-center">SERP</TableHead>
              <TableHead className="w-[130px] text-center">Rec. Format</TableHead>
              <TableHead className="w-[140px] text-right"><HeaderSort label="Impact (clicks/mo)" active={sort.key==="impact"} dir={sort.dir} onSort={(d)=>setSort({key:"impact",dir:d})} tip="Estimated monthly clicks using device CTR and SERP features." /></TableHead>
              <TableHead className="w-[120px] text-right"><HeaderSort label="Priority (OPS)" active={sort.key==="ops"} dir={sort.dir} onSort={(d)=>setSort({key:"ops",dir:d})} tip="Combined impact, difficulty, and momentum." /></TableHead>
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(r=>(
              <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                <TableCell className="text-center"><Checkbox checked={!!selected[r.id]} 
                onCheckedChange={(v) =>
  setSelected({ ...selected, [r.id]: Boolean(v) })
}

                />
                </TableCell>
                <TableCell><button className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer" onClick={()=>alert(`Open Analyzer: ${r.keyword}`)}>{r.keyword}</button></TableCell>
                <TableCell className="text-right">{formatInt(r.volume)}</TableCell>
                <TableCell className="text-center">{r.wkd}</TableCell>
                <TableCell className="text-center capitalize">{r.intent}</TableCell>
                <TableCell className="text-right">{pct(ctrAdj(settings.targetRank, r.features),0)}</TableCell>
                <TableCell className="text-center">{r.tm>0?`+${r.tm.toFixed(1)}`:r.tm.toFixed(1)}</TableCell>
                <TableCell className="text-center"><div className="inline-flex items-center gap-1">{r.features.map(f=><Chip key={f}><FeatureIcon f={f}/> {f.toUpperCase()}</Chip>)}</div></TableCell>
                <TableCell className="text-center">{r.recFormat}</TableCell>
                <TableCell className="text-right">{formatInt(r.impactClicks)}</TableCell>
                <TableCell className="text-right"><Bar100 value={r.ops}/></TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1.5">
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={()=>alert("Analyzer")} className="cursor-pointer"><ChartNoAxesColumn className="h-4 w-4 text-[#008CCD]"/></Button></TooltipTrigger><TooltipContent>Open analyzer</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={()=>alert("Add to cluster")} className="cursor-pointer"><Layers3 className="h-4 w-4 text-[#008CCD]"/></Button></TooltipTrigger><TooltipContent>Add to cluster</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={()=>alert("Save to list")} className="cursor-pointer"><BookmarkPlus className="h-4 w-4 text-[#008CCD]"/></Button></TooltipTrigger><TooltipContent>Save to list</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={()=>alert("Create content brief task")} className="cursor-pointer"><ClipboardList className="h-4 w-4 text-[#008CCD]"/></Button></TooltipTrigger><TooltipContent>Create task</TooltipContent></Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length===0 && <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No results.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
};

/* ============================================================
   ==================== Table: Rising Topics ==================
   ============================================================ */
const RisingTable: React.FC<{
  rows: RisingRow[]; settings: SettingsState;
  selected: Record<string,boolean>; setSelected: (v:Record<string,boolean>)=>void;
}> = ({ rows, settings, selected, setSelected }) => {
  const [sort, setSort] = React.useState<{key: keyof RisingRow | "impact" | "tm" | "ops"; dir:"asc"|"desc"}>({ key:"tm", dir:"desc" } as any);

  const enriched = React.useMemo(()=> rows.map(r => {
    const impactClicks = Math.round(r.volume * ctrAdj(settings.targetRank, r.features));
    const ops = Math.round( clamp01((impactClicks / Math.max(...rows.map(x=>x.volume * ctrAdj(settings.targetRank, x.features)))) ) * (1 - r.wkd/100) * momentumBoost(r.tm) * 100 );
    return { ...r, impactClicks, ops };
  }), [rows, settings]);

  const sorted = React.useMemo(()=>{
    const list = [...enriched];
    list.sort((a,b)=>{
      const dir = sort.dir==="asc"?1:-1;
      const get = (x:any) => sort.key==="impact"? x.impactClicks : sort.key==="ops"? x.ops : x[sort.key];
      return (get(a) > get(b) ? 1 : -1) * dir;
    });
    return list;
  },[enriched, sort]);

  const allSel = sorted.length>0 && sorted.every(r=>selected[r.id]);

  return (
    <SectionCard
      title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" style={{color:TK.brand}}/> Rising Topics</span>}
      right={<span className="text-xs text-muted-foreground">Default: TM desc → Priority desc</span>}
    >
      <div className="border rounded" style={{ borderColor: TK.borderLight }}>
        <Table className="text-sm">
          <TableHeader className="sticky top-0 bg-white z-10" style={{ borderBottom:`1px solid ${TK.borderLight}` }}>
            <TableRow>
              <TableHead className="w-[46px] text-center"><Checkbox checked={allSel} onCheckedChange={(v)=>{ const n={...selected}; sorted.forEach(r=>n[r.id]=Boolean(v)); setSelected(n); }}/></TableHead>
              <TableHead className="min-w-[320px]"><HeaderSort label="Keyword" active={sort.key==="keyword"} dir={sort.dir} onSort={(d)=>setSort({key:"keyword",dir:d})}/></TableHead>
              <TableHead className="w-[110px] text-right"><HeaderSort label="Volume" active={sort.key==="volume"} dir={sort.dir} onSort={(d)=>setSort({key:"volume",dir:d})} tip="Average monthly searches." /></TableHead>
              <TableHead className="w-[100px] text-center"><HeaderSort label="WKD" active={sort.key==="wkd"} dir={sort.dir} onSort={(d)=>setSort({key:"wkd",dir:d})} tip="SERP competition band." /></TableHead>
              <TableHead className="w-[110px] text-center"><HeaderSort label="TM" active={sort.key==="tm"} dir={sort.dir} onSort={(d)=>setSort({key:"tm",dir:d})} tip="Momentum over the selected period."/></TableHead>
              <TableHead className="w-[150px] text-center">Seasonality</TableHead>
              <TableHead className="w-[160px] text-center">SERP</TableHead>
              <TableHead className="w-[130px] text-center">Rec. Format</TableHead>
              <TableHead className="w-[140px] text-right"><HeaderSort label="Impact (clicks/mo)" active={sort.key==="impact"} dir={sort.dir} onSort={(d)=>setSort({key:"impact",dir:d})} tip="Estimated monthly clicks if target rank achieved." /></TableHead>
              <TableHead className="w-[120px] text-right"><HeaderSort label="Priority (OPS)" active={sort.key==="ops"} dir={sort.dir} onSort={(d)=>setSort({key:"ops",dir:d})} tip="Impact × (1−WKD) × momentum." /></TableHead>
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(r=>(
              <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                <TableCell className="text-center"><Checkbox checked={!!selected[r.id]} onCheckedChange={(v) =>setSelected({ ...selected, [r.id]: Boolean(v) })}/></TableCell>
                <TableCell><button className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer" onClick={()=>alert(`Analyzer: ${r.keyword}`)}>{r.keyword}</button></TableCell>
                <TableCell className="text-right">{formatInt(r.volume)}</TableCell>
                <TableCell className="text-center">{r.wkd}</TableCell>
                <TableCell className="text-center">{r.tm>0?`+${r.tm.toFixed(1)}`:r.tm.toFixed(1)}</TableCell>
                <TableCell className="text-center">{r.peaks || "—"}</TableCell>
                <TableCell className="text-center"><div className="inline-flex items-center gap-1">{r.features.map(f=><Chip key={f}><FeatureIcon f={f}/> {f.toUpperCase()}</Chip>)}</div></TableCell>
                <TableCell className="text-center">{r.recFormat}</TableCell>
                <TableCell className="text-right">{formatInt((r as any).impactClicks)}</TableCell>
                <TableCell className="text-right"><Bar100 value={(r as any).ops}/></TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1.5">
                    <Button size="icon" variant="ghost" onClick={()=>alert("Analyzer")} className="cursor-pointer"><ChartNoAxesColumn className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Add to cluster")} className="cursor-pointer"><Layers3 className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Save to list")} className="cursor-pointer"><BookmarkPlus className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Create task")} className="cursor-pointer"><ClipboardList className="h-4 w-4 text-[#008CCD]"/></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length===0 && <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No results.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
};

/* ============================================================
   ==================== Table: Format Fit =====================
   ============================================================ */
const FormatFitTable: React.FC<{
  rows: FormatFitRow[]; settings: SettingsState;
  selected: Record<string,boolean>; setSelected: (v:Record<string,boolean>)=>void;
}> = ({ rows, settings, selected, setSelected }) => {
  const [sort, setSort] = React.useState<{key: keyof FormatFitRow | "impact" | "ops"; dir:"asc"|"desc"}>({ key:"impact", dir:"desc" } as any);
  const enriched = React.useMemo(()=> rows.map(r => {
    const impactClicks = Math.round(r.volume * ctrAdj(settings.targetRank, r.features));
    const ops = Math.round( clamp01((impactClicks / Math.max(...rows.map(x=>x.volume * ctrAdj(settings.targetRank, x.features)))) ) * (1 - r.wkd/100) * 100 );
    return { ...r, impactClicks, ops };
  }), [rows, settings]);

  const sorted = React.useMemo(()=>{
    const list=[...enriched];
    list.sort((a,b)=>{ const dir=sort.dir==="asc"?1:-1; const ga=(sort.key==="impact"?a.impactClicks:sort.key==="ops"?a.ops:(a as any)[sort.key]); const gb=(sort.key==="impact"?b.impactClicks:sort.key==="ops"?b.ops:(b as any)[sort.key]); return (ga>gb?1:-1)*dir; });
    return list;
  },[enriched, sort]);

  const allSel = sorted.length>0 && sorted.every(r=>selected[r.id]);

  return (
    <SectionCard title={<span className="inline-flex items-center gap-2"><SquareStack className="h-4 w-4" style={{color:TK.brand}}/> Format Fit</span>}>
      <div className="border rounded" style={{ borderColor: TK.borderLight }}>
        <Table className="text-sm">
          <TableHeader className="sticky top-0 bg-white z-10" style={{ borderBottom:`1px solid ${TK.borderLight}` }}>
            <TableRow>
              <TableHead className="w-[46px] text-center"><Checkbox checked={allSel} onCheckedChange={(v)=>{ const n={...selected}; sorted.forEach(r=>n[r.id]=Boolean(v)); setSelected(n); }}/></TableHead>
              <TableHead className="min-w-[320px]"><HeaderSort label="Keyword" active={sort.key==="keyword"} dir={sort.dir} onSort={(d)=>setSort({key:"keyword",dir:d})}/></TableHead>
              <TableHead className="w-[110px] text-right"><HeaderSort label="Volume" active={sort.key==="volume"} dir={sort.dir} onSort={(d)=>setSort({key:"volume",dir:d})}/></TableHead>
              <TableHead className="w-[100px] text-center"><HeaderSort label="WKD" active={sort.key==="wkd"} dir={sort.dir} onSort={(d)=>setSort({key:"wkd",dir:d})}/></TableHead>
              <TableHead className="w-[110px] text-center">Intent</TableHead>
              <TableHead className="w-[160px] text-center">SERP</TableHead>
              <TableHead className="w-[140px] text-center">Rec. Format</TableHead>
              <TableHead className="w-[240px]">Why</TableHead>
              <TableHead className="w-[140px] text-right"><HeaderSort label="Impact (clicks/mo)" active={sort.key==="impact"} dir={sort.dir} onSort={(d)=>setSort({key:"impact",dir:d})} tip="Estimated monthly clicks at target rank." /></TableHead>
              <TableHead className="w-[120px] text-right"><HeaderSort label="Priority (OPS)" active={sort.key==="ops"} dir={sort.dir} onSort={(d)=>setSort({key:"ops",dir:d})}/></TableHead>
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(r=>(
              <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                <TableCell className="text-center"><Checkbox checked={!!selected[r.id]} onCheckedChange={(v) =>setSelected({ ...selected, [r.id]: Boolean(v) })}/></TableCell>
                <TableCell><button className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer" onClick={()=>alert("Analyzer")}>{r.keyword}</button></TableCell>
                <TableCell className="text-right">{formatInt(r.volume)}</TableCell>
                <TableCell className="text-center">{r.wkd}</TableCell>
                <TableCell className="text-center capitalize">{r.intent}</TableCell>
                <TableCell className="text-center"><div className="inline-flex items-center gap-1">{r.features.map(f=><Chip key={f}><FeatureIcon f={f}/> {f.toUpperCase()}</Chip>)}</div></TableCell>
                <TableCell className="text-center">{r.recFormat}</TableCell>
                <TableCell>{r.why}</TableCell>
                <TableCell className="text-right">{formatInt((r as any).impactClicks)}</TableCell>
                <TableCell className="text-right"><Bar100 value={(r as any).ops}/></TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1.5">
                    <Button size="icon" variant="ghost" onClick={()=>alert("Analyzer")} className="cursor-pointer"><ChartNoAxesColumn className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Add to cluster")} className="cursor-pointer"><Layers3 className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Save to list")} className="cursor-pointer"><BookmarkPlus className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Create task")} className="cursor-pointer"><ClipboardList className="h-4 w-4 text-[#008CCD]"/></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length===0 && <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No results.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
};

/* ============================================================
   ===================== Table: Near‑Wins ======================
   ============================================================ */
const NearWinsTable: React.FC<{
  rows: NearWinRow[]; settings: SettingsState;
  selected: Record<string,boolean>; setSelected: (v:Record<string,boolean>)=>void;
}> = ({ rows, settings, selected, setSelected }) => {
  const [sort, setSort] = React.useState<{key: keyof NearWinRow | "impact" | "revenue" | "ops" | "delta"; dir:"asc"|"desc"}>({ key:"impact", dir:"desc" } as any);

  const enriched = React.useMemo(()=> rows.map(r => {
    const cpTarget = ctrAdj(settings.targetRank, r.features);
    const cpCurrent = ctrAdj(r.rank, r.features);
    const deltaCp = cpTarget - cpCurrent;
    const impactClicks = Math.round(r.volume * Math.max(0, deltaCp));
    const impactRevenue = settings.ga4Connected ? Math.round(impactClicks * 0.04 * 30 * 3.0) : undefined; // demo
    const maxImp = Math.max(...rows.map(x => Math.round(x.volume * Math.max(0, ctrAdj(settings.targetRank, x.features) - ctrAdj(x.rank, x.features)))) ) || 1;
    const ops = Math.round( clamp01(impactClicks/maxImp) * (1 - Math.min(0.99, 0.25 + 0.75*(r.effort/100))) * 100 );
    return { ...r, deltaCpToTarget: deltaCp, impactClicks, impactRevenue, ops };
  }), [rows, settings]);

  const sorted = React.useMemo(()=>{
    const list = [...enriched];
    list.sort((a,b)=> {
      const dir = sort.dir==="asc"?1:-1;
      const get = (x:any) => sort.key==="impact"? x.impactClicks : sort.key==="revenue"? (x.impactRevenue ?? 0) : sort.key==="ops"? x.ops : sort.key==="delta"? x.deltaCpToTarget : x[sort.key];
      return (get(a)>get(b)?1:-1)*dir;
    });
    return list;
  }, [enriched, sort]);

  const allSel = sorted.length>0 && sorted.every(r=>selected[r.id]);

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
    <SectionCard
      title={<span className="inline-flex items-center gap-2"><Target className="h-4 w-4" style={{color:TK.brand}}/> Near‑Wins</span>}
      right={<span className="text-xs text-muted-foreground">Default sort: Impact desc</span>}
    >
             {Track && (
                 <div style={{display:"hidden",position: "absolute",zIndex: 1001,padding: "20px",}}onClick={closeTrack}>
              <AddToTrackerModal open={true} onOpenChange={() => {}} onClose={closeTrack} plan="free" limit={1} currentTracked={[]} newCompetitor={{} as any}onReplace={() => {}}/>
                                                      </div>
                                                    )}
      <div className="border rounded" style={{ borderColor: TK.borderLight }}>
        <Table className="text-sm">
          <TableHeader className="sticky top-0 bg-white z-10" style={{ borderBottom:`1px solid ${TK.borderLight}` }}>
            <TableRow>
              <TableHead className="w-[46px] text-center"><Checkbox checked={allSel} onCheckedChange={(v)=>{ const n={...selected}; sorted.forEach(r=>n[r.id]=Boolean(v)); setSelected(n); }}/></TableHead>
              <TableHead className="min-w-[320px]"><HeaderSort label="Keyword" active={sort.key==="keyword"} dir={sort.dir} onSort={(d)=>setSort({key:"keyword",dir:d})}/></TableHead>
              <TableHead className="w-[110px] text-right"><HeaderSort label="Volume" active={sort.key==="volume"} dir={sort.dir} onSort={(d)=>setSort({key:"volume",dir:d})}/></TableHead>
              <TableHead className="w-[90px] text-right"><HeaderSort label="Rank" active={sort.key==="rank"} dir={sort.dir} onSort={(d)=>setSort({key:"rank",dir:d})} tip="Current rank for your domain."/></TableHead>
              <TableHead className="w-[110px] text-right">Your CP%</TableHead>
              <TableHead className="w-[120px] text-right"><HeaderSort label="Δ to Top‑target (ΔCP%)" active={sort.key==="delta"} dir={sort.dir} onSort={(d)=>setSort({key:"delta",dir:d})} tip="Change in click potential if you reach the target rank." /></TableHead>
              <TableHead className="w-[140px] text-right"><HeaderSort label="Impact (clicks/mo)" active={sort.key==="impact"} dir={sort.dir} onSort={(d)=>setSort({key:"impact",dir:d})} tip="Estimated monthly clicks gained using device CTR and SERP features." /></TableHead>
              <TableHead className="w-[140px] text-right"><HeaderSort label="Revenue (mo)" active={sort.key==="revenue"} dir={sort.dir} onSort={(d)=>setSort({key:"revenue",dir:d})} tip="Estimated monthly revenue if GA4 data available."/></TableHead>
              <TableHead className="w-[240px]">Rec. Actions</TableHead>
              <TableHead className="w-[120px] text-center"><HeaderSort label="Effort" active={sort.key==="effort"} dir={sort.dir} onSort={(d)=>setSort({key:"effort",dir:d})} tip="Low: small edits; Medium: refresh; High: new content or complex changes."/></TableHead>
              <TableHead className="w-[120px] text-right"><HeaderSort label="Priority (OPS)" active={sort.key==="ops"} dir={sort.dir} onSort={(d)=>setSort({key:"ops",dir:d})} tip="Combined impact, difficulty, and momentum."/></TableHead>
              <TableHead className="w-[200px]">Page</TableHead>
              <TableHead className="w-[240px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(r=>{
              const effort = effortLabel(r.effort);
              return (
                <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                  <TableCell className="text-center"><Checkbox checked={!!selected[r.id]} onCheckedChange={(v) =>setSelected({ ...selected, [r.id]: Boolean(v) })}/></TableCell>
                  <TableCell><button className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer" onClick={()=>alert("Analyzer")}>{r.keyword}</button></TableCell>
                  <TableCell className="text-right">{formatInt(r.volume)}</TableCell>
                  <TableCell className="text-right">{r.rank}</TableCell>
                  <TableCell className="text-right">{pct(r.yourCp)}</TableCell>
                  <TableCell className="text-right">{pct(Math.max(0,r.deltaCpToTarget||0))}</TableCell>
                  <TableCell className="text-right">{formatInt(r.impactClicks)}</TableCell>
                  <TableCell className="text-right">{r.impactRevenue!=null?`$${formatInt(r.impactRevenue)}`:"—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">{r.recommended.map(a=><Chip key={a}>{a}</Chip>)}</div>
                  </TableCell>
                  <TableCell className="text-center"><Chip color={effort.color}>{effort.label}</Chip></TableCell>
                  <TableCell className="text-right"><Bar100 value={r.ops||0}/></TableCell>
                  <TableCell><a href="#" onClick={(e)=>e.preventDefault()} className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer">{r.page}</a></TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="icon" variant="ghost" onClick={()=>alert("Analyzer")} className="cursor-pointer"><ChartNoAxesColumn className="h-4 w-4 text-[#008CCD]"/></Button>
                      <Button size="icon" variant="ghost" onClick={()=>alert("Create task")} className="cursor-pointer"><ClipboardList className="h-4 w-4 text-[#008CCD]"/></Button>
                      <Button size="icon" variant="ghost" onClick={openTrack} className="cursor-pointer"><Target className="h-4 w-4 text-[#008CCD]"/></Button>
                      <Button size="icon" variant="ghost" onClick={()=>alert("Page Analyzer")} className="cursor-pointer"><FileSearch className="h-4 w-4 text-[#008CCD]"/></Button>
                      <Button size="icon" variant="ghost" onClick={()=>alert("Add to cluster")} className="cursor-pointer"><Layers3 className="h-4 w-4 text-[#008CCD]"/></Button>
                      <Button size="icon" variant="ghost" onClick={()=>alert("Save to list")} className="cursor-pointer"><BookmarkPlus className="h-4 w-4 text-[#008CCD]"/></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length===0 && <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No results.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
};

/* ============================================================
   ===================== Table: Keyword Gaps ===================
   ============================================================ */
const GapsTable: React.FC<{
  rows: GapRow[]; settings: SettingsState;
  selected: Record<string,boolean>; setSelected: (v:Record<string,boolean>)=>void;
  competitors: string[];
}> = ({ rows, settings, selected, setSelected, competitors }) => {
  const [sort, setSort] = React.useState<{key: keyof GapRow | "impact" | "ops"; dir:"asc"|"desc"}>({ key:"ops", dir:"desc" } as any);
  const [picked, setPicked] = React.useState<string[]>(competitors.slice(0,3));

  const filtered = React.useMemo(()=> rows.filter(r => picked.length===0 || picked.includes(r.topCompetitor.domain)), [rows, picked]);

  const enriched = React.useMemo(()=> filtered.map(r => {
    const cpTarget = ctrAdj(settings.targetRank, r.features);
    const impactClicks = Math.round(r.volume * cpTarget); // entering Top‑target scenario
    const maxImp = Math.max(...filtered.map(x=> Math.round(x.volume * ctrAdj(settings.targetRank, x.features)) )) || 1;
    const ops = Math.round(clamp01(impactClicks/maxImp) * (1 - r.wkd/100) * 100);
    return { ...r, impactClicks, ops };
  }), [filtered, settings]);

  const sorted = React.useMemo(()=> {
    const list=[...enriched];
    list.sort((a,b)=>{ const dir=sort.dir==="asc"?1:-1; const ga=(sort.key==="impact"?a.impactClicks:sort.key==="ops"?a.ops:(a as any)[sort.key]); const gb=(sort.key==="impact"?b.impactClicks:sort.key==="ops"?b.ops:(b as any)[sort.key]); return (ga>gb?1:-1)*dir; });
    return list;
  }, [enriched, sort]);

  const allSel = sorted.length>0 && sorted.every(r=>selected[r.id]);

  return (
    <SectionCard
      title={<span className="inline-flex items-center gap-2"><FileSearch className="h-4 w-4" style={{color:TK.brand}}/> Keyword Gaps</span>}
      right={
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Competitors:</span>
          <div className="inline-flex items-center gap-1">
            {competitors.slice(0,10).map(d => (
              <button
                key={d}
                className={cn("h-7 px-2 rounded-full border text-xs cursor-pointer", picked.includes(d)?"font-semibold":"")}
                style={{ borderColor: TK.borderLight, background: picked.includes(d)? TK.pastel : "#FFF" }}
                onClick={()=> picked.includes(d)? setPicked(picked.filter(x=>x!==d)) : setPicked([...picked, d])}
                aria-pressed={picked.includes(d)}
              >{d}</button>
            ))}
          </div>
        </div>
      }
    >
      <div className="border rounded" style={{ borderColor: TK.borderLight }}>
        <Table className="text-sm">
          <TableHeader className="sticky top-0 bg-white z-10" style={{ borderBottom:`1px solid ${TK.borderLight}` }}>
            <TableRow>
              <TableHead className="w-[46px] text-center"><Checkbox checked={allSel} onCheckedChange={(v)=>{ const n={...selected}; sorted.forEach(r=>n[r.id]=Boolean(v)); setSelected(n); }}/></TableHead>
              <TableHead className="min-w-[320px]"><HeaderSort label="Keyword" active={sort.key==="keyword"} dir={sort.dir} onSort={(d)=>setSort({key:"keyword",dir:d})}/></TableHead>
              <TableHead className="w-[110px] text-right"><HeaderSort label="Volume" active={sort.key==="volume"} dir={sort.dir} onSort={(d)=>setSort({key:"volume",dir:d})}/></TableHead>
              <TableHead className="w-[100px] text-center"><HeaderSort label="WKD" active={sort.key==="wkd"} dir={sort.dir} onSort={(d)=>setSort({key:"wkd",dir:d})}/></TableHead>
              <TableHead className="w-[120px] text-center"><HeaderSort label="Intent" active={sort.key==="intent"} dir={sort.dir} onSort={(d)=>setSort({key:"intent",dir:d})}/></TableHead>
              <TableHead className="w-[120px] text-center">Gap</TableHead>
              <TableHead className="w-[220px]">Top competitor</TableHead>
              <TableHead className="w-[160px] text-center">SERP</TableHead>
              <TableHead className="w-[130px] text-center">Rec. Format</TableHead>
              <TableHead className="w-[140px] text-right"><HeaderSort label="Impact (clicks/mo)" active={sort.key==="impact"} dir={sort.dir} onSort={(d)=>setSort({key:"impact",dir:d})} tip="Estimated clicks if you enter target rank." /></TableHead>
              <TableHead className="w-[120px] text-right"><HeaderSort label="Priority (OPS)" active={sort.key==="ops"} dir={sort.dir} onSort={(d)=>setSort({key:"ops",dir:d})}/></TableHead>
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(r=>(
              <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                <TableCell className="text-center"><Checkbox checked={!!selected[r.id]} onCheckedChange={(v) =>setSelected({ ...selected, [r.id]: Boolean(v) })}/></TableCell>
                <TableCell><button className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer" onClick={()=>alert("Analyzer")}>{r.keyword}</button></TableCell>
                <TableCell className="text-right">{formatInt(r.volume)}</TableCell>
                <TableCell className="text-center">{r.wkd}</TableCell>
                <TableCell className="text-center capitalize">{r.intent}</TableCell>
                <TableCell className="text-center capitalize">{r.gap}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Chip>{r.topCompetitor.domain}</Chip>
                    <Chip>Avg rank {r.topCompetitor.avgRank}</Chip>
                    {r.topCompetitor.ownsFs && <Chip><Sparkles className="h-3.5 w-3.5" style={{color:TK.brand}}/> FS owner</Chip>}
                  </div>
                </TableCell>
                <TableCell className="text-center"><div className="inline-flex items-center gap-1">{r.features.map(f=><Chip key={f}><FeatureIcon f={f}/> {f.toUpperCase()}</Chip>)}</div></TableCell>
                <TableCell className="text-center">{r.recFormat}</TableCell>
                <TableCell className="text-right">{formatInt((r as any).impactClicks)}</TableCell>
                <TableCell className="text-right"><Bar100 value={(r as any).ops}/></TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1.5">
                    <Button size="icon" variant="ghost" onClick={()=>alert("Analyzer")} className="cursor-pointer"><ChartNoAxesColumn className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Create task")} className="cursor-pointer"><ClipboardList className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Add to tracking")} className="cursor-pointer"><Target className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Add to cluster")} className="cursor-pointer"><Layers3 className="h-4 w-4 text-[#008CCD]"/></Button>
                    <Button size="icon" variant="ghost" onClick={()=>alert("Save to list")} className="cursor-pointer"><BookmarkPlus className="h-4 w-4 text-[#008CCD]"/></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length===0 && <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">Pick competitors to refine gaps.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
};

/* ============================================================
   =================== Table: Cannibalization ==================
   ============================================================ */
const CannibalTable: React.FC<{
  rows: CannibalRow[];
  selected: Record<string,boolean>; setSelected: (v:Record<string,boolean>)=>void;
  onOpenConflict: (row: CannibalRow)=>void;
}> = ({ rows, selected, setSelected, onOpenConflict }) => {
  const [sort, setSort] = React.useState<{key: keyof CannibalRow; dir:"asc"|"desc"}>({ key:"lostCpPerMonth", dir:"desc" });
  const sorted = React.useMemo(()=> {
    const list=[...rows];
    list.sort((a,b)=>{ const dir=sort.dir==="asc"?1:-1; return ((a as any)[sort.key] > (b as any)[sort.key] ? 1 : -1)*dir; });
    return list;
  }, [rows, sort]);

  const allSel = sorted.length>0 && sorted.every(r=>selected[r.id]);

  return (
    <SectionCard
      title={<span className="inline-flex items-center gap-2"><Layers3 className="h-4 w-4" style={{color:TK.brand}}/> Cannibalization</span>}
      right={<span className="text-xs text-muted-foreground">Default: Lost CP% desc</span>}
    >
      <div className="border rounded" style={{ borderColor: TK.borderLight }}>
        <Table className="text-sm">
          <TableHeader className="sticky top-0 bg-white z-10" style={{ borderBottom:`1px solid ${TK.borderLight}` }}>
            <TableRow>
              <TableHead className="w-[46px] text-center"><Checkbox checked={allSel} onCheckedChange={(v)=>{ const n={...selected}; sorted.forEach(r=>n[r.id]=Boolean(v)); setSelected(n); }}/></TableHead>
              <TableHead className="min-w-[320px]"><HeaderSort label="Keyword / Cluster" active={sort.key==="clusterOrKeyword"} dir={sort.dir} onSort={(d)=>setSort({key:"clusterOrKeyword",dir:d})}/></TableHead>
              <TableHead className="w-[140px] text-center"><HeaderSort label="Pages competing" active={sort.key==="pagesCompeting"} dir={sort.dir} onSort={(d)=>setSort({key:"pagesCompeting",dir:d})}/></TableHead>
              <TableHead className="w-[220px]">Primary page</TableHead>
              <TableHead className="w-[260px]">Other pages</TableHead>
              <TableHead className="w-[140px] text-right"><HeaderSort label="Lost CP% / mo" active={sort.key==="lostCpPerMonth"} dir={sort.dir} onSort={(d)=>setSort({key:"lostCpPerMonth",dir:d})} /></TableHead>
              <TableHead className="w-[180px]">Rec. Action</TableHead>
              <TableHead className="w-[120px] text-center"><HeaderSort label="Effort" active={sort.key==="effort"} dir={sort.dir} onSort={(d)=>setSort({key:"effort",dir:d})}/></TableHead>
              <TableHead className="w-[120px] text-right"><HeaderSort label="Priority (OPS)" active={sort.key==="ops"} dir={sort.dir} onSort={(d)=>setSort({key:"ops",dir:d})}/></TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(r=>{
              const effort = effortLabel(r.effort);
              return (
                <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                  <TableCell className="text-center"><Checkbox checked={!!selected[r.id]} onCheckedChange={(v) =>setSelected({ ...selected, [r.id]: Boolean(v) })}/></TableCell>
                  <TableCell>{r.clusterOrKeyword}</TableCell>
                  <TableCell className="text-center">{r.pagesCompeting}</TableCell>
                  <TableCell><a href="#" onClick={(e)=>e.preventDefault()} className="text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer">{r.primaryPage}</a></TableCell>
                  <TableCell className="truncate">{r.otherPages.slice(0,3).join(", ")}{r.otherPages.length>3?"…":""}</TableCell>
                  <TableCell className="text-right">{r.lostCpPerMonth}</TableCell>
                  <TableCell>{r.recommended}</TableCell>
                  <TableCell className="text-center"><Chip color={effort.color}>{effort.label}</Chip></TableCell>
                  <TableCell className="text-right"><Bar100 value={r.ops}/></TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="icon" variant="ghost" onClick={()=>onOpenConflict(r)} title="Open conflict drawer" className="cursor-pointer"><Eye className="h-4 w-4 text-[#008CCD]"/></Button>
                      <Button size="icon" variant="ghost" onClick={()=>alert("Create task")} className="cursor-pointer"><ClipboardList className="h-4 w-4 text-[#008CCD]"/></Button>
                      <Button size="icon" variant="ghost" onClick={()=>alert("Page Analyzer")} className="cursor-pointer"><FileSearch className="h-4 w-4 text-[#008CCD]"/></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length===0 && <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No conflicts detected this period.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
};
