import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Search, Download, FileSpreadsheet, Lock,
  ChevronsUpDown, ChevronUp, ChevronDown, Info, Filter
} from "lucide-react";

/* ───────────────────────────────────────────────────────────
   Design Tokens (kept consistent with your reference)
   ─────────────────────────────────────────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #1090D0)",                 // primary brand
  youBlue: "var(--wr-you-blue, #0077ff)",            // reserved (not used in this tab)
  ok: "var(--wr-success, #16A34A)",
  warn: "var(--wr-warn, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  radius: "var(--wr-radius, 8px)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
};

/* ───────────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────────── */
type Intent = "informational" | "commercial" | "navigational" | "transactional";
type FeatureKey = "snippet" | "image" | "sitelinks" | "video" | "paa";

type KWGapRow = {
  id: string;
  keyword: string;
  intent: Intent;
  volume: number;     // monthly volume
  cpc: number;        // USD
  kd: number;         // keyword difficulty 0-100
  compRanks: Record<string, number | null>; // rank per competitor; null = not ranked in Top100
  features: Partial<Record<FeatureKey, boolean>>;
};

type SortKey =
  | "keyword" | "intent" | "volume" | "cpc" | "kd"
  | `comp:${string}`;

/* ───────────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────────── */
const fmtNum = (n: number) => new Intl.NumberFormat().format(n);
const fmtShort = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

const INTENT_META: Record<Intent, { label: string; cls: string }> = {
  informational: { label: "Inform.", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  commercial:    { label: "Comm.",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  navigational:  { label: "Nav.",    cls: "bg-gray-50 text-gray-700 border-gray-200" },
  transactional: { label: "Trans.",  cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

const FEATURE_ICONS: Record<FeatureKey, { icon: string; label: string }> = {
  snippet:   { icon: "⭐", label: "Featured Snippet" },
  image:     { icon: "🖼️", label: "Image Pack" },
  sitelinks: { icon: "🔗", label: "Sitelinks" },
  video:     { icon: "🎥", label: "Video" },
  paa:       { icon: "❓", label: "People Also Ask" },
};

function kdBand(kd: number): "low" | "med" | "high" {
  if (kd < 35) return "low";
  if (kd <= 60) return "med";
  return "high";
}
const KD_META: Record<ReturnType<typeof kdBand>, { label: string; cls: string; color: string }> = {
  low:  { label: "Low",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "#16A34A" },
  med:  { label: "Medium", cls: "bg-amber-50 text-amber-700 border-amber-200",       color: "#F59E0B" },
  high: { label: "High",   cls: "bg-rose-50 text-rose-700 border-rose-200",          color: "#EF4444" },
};

/* ───────────────────────────────────────────────────────────
   Mock data (demo-ready; replace with live dataset later)
   ─────────────────────────────────────────────────────────── */
const COMPETITORS = ["comp1.com", "comp2.com", "comp3.com"];

const MOCK: KWGapRow[] = [
  {
    id: "g1",
    keyword: "seo trends 2025",
    intent: "informational",
    volume: 3400,
    cpc: 2.4,
    kd: 28,
    compRanks: { "comp1.com": 5, "comp2.com": 7, "comp3.com": 12 },
    features: { snippet: true },
  },
  {
    id: "g2",
    keyword: "audit tool",
    intent: "commercial",
    volume: 2100,
    cpc: 3.9,
    kd: 45,
    compRanks: { "comp1.com": 12, "comp2.com": 9, "comp3.com": 18 },
    features: { image: true },
  },
  {
    id: "g3",
    keyword: "backlink app",
    intent: "transactional",
    volume: 1800,
    cpc: 1.1,
    kd: 62,
    compRanks: { "comp1.com": 4, "comp2.com": null, "comp3.com": 22 },
    features: { sitelinks: true },
  },
  {
    id: "g4",
    keyword: "technical seo checklist",
    intent: "informational",
    volume: 3100,
    cpc: 0.0,
    kd: 31,
    compRanks: { "comp1.com": 8, "comp2.com": 10, "comp3.com": 14 },
    features: { paa: true, image: true },
  },
  {
    id: "g5",
    keyword: "ai content generator",
    intent: "commercial",
    volume: 5400,
    cpc: 4.5,
    kd: 58,
    compRanks: { "comp1.com": 6, "comp2.com": 11, "comp3.com": 5 },
    features: { snippet: true, video: true },
  },
  {
    id: "g6",
    keyword: "local seo pricing",
    intent: "navigational",
    volume: 700,
    cpc: 2.0,
    kd: 22,
    compRanks: { "comp1.com": 17, "comp2.com": null, "comp3.com": 33 },
    features: {},
  },
];

/* ───────────────────────────────────────────────────────────
   Component
   ─────────────────────────────────────────────────────────── */
export default function CI_KeywordGapTable() {
  // filters
  const [query, setQuery] = useState("");
  const [intentSel, setIntentSel] = useState<Set<Intent>>(new Set());                 // multi
  const [featSel, setFeatSel] = useState<Set<FeatureKey>>(new Set());                 // multi
  const [compSel, setCompSel] = useState<Set<string>>(new Set(COMPETITORS));          // visible competitors
  const [kdBuckets, setKdBuckets] = useState<Set<"low"|"med"|"high">>(new Set());     // optional quick tags
  const [kdMin, setKdMin] = useState<number | "">("");                                // numeric range (optional)
  const [kdMax, setKdMax] = useState<number | "">("");
  const [volMin, setVolMin] = useState<number | "">("");                              // volume min/max
  const [volMax, setVolMax] = useState<number | "">("");
  const [hideZero, setHideZero] = useState<boolean>(false);

  // sorting
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // data
  const [rows] = useState<KWGapRow[]>(MOCK);
  const competitors = COMPETITORS;

  function toggleIntent(i: Intent) {
    setIntentSel((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }
  function toggleFeature(f: FeatureKey) {
    setFeatSel((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }
  function toggleCompetitor(dom: string) {
    setCompSel((prev) => {
      const next = new Set(prev);
      next.has(dom) ? next.delete(dom) : next.add(dom);
      return next;
    });
  }
  function toggleKDBucket(b: "low"|"med"|"high") {
    setKdBuckets((prev) => {
      const next = new Set(prev);
      next.has(b) ? next.delete(b) : next.add(b);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setIntentSel(new Set());
    setFeatSel(new Set());
    setCompSel(new Set(COMPETITORS));
    setKdBuckets(new Set());
    setKdMin("");
    setKdMax("");
    setVolMin("");
    setVolMax("");
    setHideZero(false);
    setSortKey("volume");
    setSortDir("desc");
  }

  // filter logic
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query && !r.keyword.toLowerCase().includes(query.toLowerCase())) return false;
      if (intentSel.size > 0 && !intentSel.has(r.intent)) return false;

      // SERP features: require all selected
      if (featSel.size > 0) {
        for (const f of featSel) {
          if (!r.features[f]) return false;
        }
      }

      // competitor filter: if any selected, require that at least one selected competitor ranks
      if (compSel.size > 0) {
        const anySelectedRanks = [...compSel].some((c) => r.compRanks[c] != null);
        if (!anySelectedRanks) return false;
      }

      // KD filter: buckets OR numeric range (both can be combined)
      if (kdBuckets.size > 0) {
        if (!kdBuckets.has(kdBand(r.kd))) return false;
      }
      if (kdMin !== "" && r.kd < Number(kdMin)) return false;
      if (kdMax !== "" && r.kd > Number(kdMax)) return false;

      // Volume filter
      if (volMin !== "" && r.volume < Number(volMin)) return false;
      if (volMax !== "" && r.volume > Number(volMax)) return false;

      // Hide zero CPC/Volume (optional QoL)
      if (hideZero && (r.cpc === 0 || r.volume === 0)) return false;

      return true;
    });
  }, [rows, query, intentSel, featSel, compSel, kdBuckets, kdMin, kdMax, volMin, volMax, hideZero]);

  // per-competitor average ranks across filtered set (for ↑/↓ vs avg display)
  const compAvgRank: Record<string, number | null> = useMemo(() => {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const r of filtered) {
      for (const c of competitors) {
        const v = r.compRanks[c];
        if (v != null) {
          sums[c] = (sums[c] ?? 0) + v;
          counts[c] = (counts[c] ?? 0) + 1;
        }
      }
    }
    const out: Record<string, number | null> = {};
    for (const c of competitors) {
      out[c] = counts[c] ? sums[c] / counts[c] : null;
    }
    return out;
  }, [filtered, competitors]);

  // sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const get = (r: KWGapRow) => {
      if (sortKey === "keyword") return r.keyword;
      if (sortKey === "intent") return r.intent;
      if (sortKey === "volume") return r.volume;
      if (sortKey === "cpc") return r.cpc;
      if (sortKey === "kd") return r.kd;
      if (sortKey.startsWith("comp:")) {
        const dom = sortKey.split(":")[1];
        return r.compRanks[dom] ?? 10_000;
      }
      return 0;
    };
    arr.sort((a, b) => {
      const av: any = get(a); const bv: any = get(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // export CSV
  const lockRef = useRef<HTMLDivElement | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!lockRef.current) return;
      if (!lockRef.current.contains(e.target as Node)) setLockOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function exportCSV() {
    const headers = [
      "Keyword","Intent",
      ...competitors.filter(c => compSel.has(c)).map(c => `${c} Rank`),
      "Volume","CPC","Difficulty","SERP Features"
    ];
    const lines = sorted.map(r => {
      const feats = Object.entries(FEATURE_ICONS)
        .filter(([k]) => r.features[k as FeatureKey])
        .map(([,v]) => v.label).join("|");
      const cols = [
        r.keyword,
        r.intent,
        ...competitors.filter(c => compSel.has(c))
          .map(c => r.compRanks[c] == null ? "—" : `#${r.compRanks[c]}`),
        String(r.volume),
        r.cpc.toFixed(2),
        String(r.kd),
        feats
      ];
      return cols.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "keyword-gap.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ui helpers
  function headerCell(label: string, key: SortKey) {
    const active = sortKey === key;
    const DirIcon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
    return (
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => {
          if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
          else setSortDir(d => d === "asc" ? "desc" : "asc");
        }}
      >
        <span>{label}</span>
        <DirIcon className={`h-4 w-4 ${active ? "" : "text-muted-foreground"}`} />
      </button>
    );
  }

  function RankCell({ rank }: { rank: number | null }) {
    if (rank == null) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground">—</span>
            </TooltipTrigger>
            <TooltipContent>Not ranked in Top 100</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <span className="tabular-nums">#{rank}</span>;
  }

  function CompAvgCell({ comp, rank }: { comp: string; rank: number | null }) {
    const avg = compAvgRank[comp];
    if (rank == null) return <RankCell rank={rank} />;

    // lower rank number is better
    let color = TK.muted;
    let arrow = "—";
    let title = `Rank #${rank}`;
    if (avg != null) {
      const better = rank < avg;
      const equal = Math.round(rank) === Math.round(avg);
      color = equal ? TK.muted : better ? TK.ok : TK.critical;
      arrow = equal ? "—" : better ? "↑" : "↓";
      title = `${better ? "Better" : equal ? "Equal" : "Worse"} than ${comp} avg (${avg.toFixed(1)})`;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <RankCell rank={rank} />
              <span style={{ color }}>{arrow}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{title}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  function KDChip({ kd }: { kd: number }) {
    const band = kdBand(kd);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border uppercase ${KD_META[band].cls}`}
            >
              {KD_META[band].label} <span className="opacity-75">({kd})</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            SE Ranking keyword difficulty score (0–100).
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const activeCompList = competitors.filter(c => compSel.has(c));

  return (
    <section className="space-y-3 py-2 mt-4">
      <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* ─ Header with title (left) & export (right) ─ */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Keyword Gap Analyzer</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Keywords your project does not rank for, but selected competitors do. Filter, prioritize, and act.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2 flex-wrap" ref={lockRef}>
            <Button variant="outline" className="h-8 px-3" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
              onClick={() => setLockOpen(o => !o)}
              aria-haspopup="dialog"
            >
              <FileSpreadsheet className="h-4 w-4" />
              XLSX / PDF
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {lockOpen && (
              <div className="absolute right-4 top-14 w-64 rounded border bg-white p-3 text-sm shadow"
                   style={{ borderColor: TK.border }}>
                <div className="font-medium mb-1">Upgrade to Pro</div>
                <p className="text-muted-foreground mb-2">XLSX & PDF exports are available on Pro plans.</p>
                <div className="flex gap-2">
                  <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>View Plans</Button>
                  <Button size="sm" variant="outline" onClick={() => setLockOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        {/* ─ Filter bar ─ */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[260px] pl-7" placeholder="Search keyword…"
                     value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            {/* Intent multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white">
                  Intent {intentSel.size > 0 && <span className="text-muted-foreground">({intentSel.size})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="text-sm font-medium mb-2">Filter by intent</div>
                <div className="space-y-2">
                  {(Object.keys(INTENT_META) as Intent[]).map((i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={intentSel.has(i)} onCheckedChange={() => toggleIntent(i)} />
                      <span className="capitalize">{i}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Difficulty filter (tags + optional numeric range) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white">
                  Difficulty { (kdBuckets.size>0 || kdMin!=="" || kdMax!=="") && <span className="text-muted-foreground">(set)</span> }
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[320px]">
                <div className="text-sm font-medium mb-2">Filter by difficulty</div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox checked={kdBuckets.has("low")} onCheckedChange={()=>toggleKDBucket("low")} />
                    <span>Low &lt; 35</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox checked={kdBuckets.has("med")} onCheckedChange={()=>toggleKDBucket("med")} />
                    <span>Medium 35–60</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox checked={kdBuckets.has("high")} onCheckedChange={()=>toggleKDBucket("high")} />
                    <span>High &gt; 60</span>
                  </label>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Or set a numeric range</div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Min" value={kdMin as any}
                         onChange={(e)=>setKdMin(e.target.value === "" ? "" : Number(e.target.value))}/>
                  <Input type="number" placeholder="Max" value={kdMax as any}
                         onChange={(e)=>setKdMax(e.target.value === "" ? "" : Number(e.target.value))}/>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">SE Ranking keyword difficulty score.</div>
              </PopoverContent>
            </Popover>

            {/* Volume range (min/max) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white">
                  Volume Range { (volMin!=="" || volMax!=="") && <span className="text-muted-foreground">(set)</span> }
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[280px]">
                <div className="text-sm font-medium mb-2">Search volume</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Min" value={volMin as any}
                         onChange={(e)=>setVolMin(e.target.value === "" ? "" : Number(e.target.value))}/>
                  <Input type="number" placeholder="Max" value={volMax as any}
                         onChange={(e)=>setVolMax(e.target.value === "" ? "" : Number(e.target.value))}/>
                </div>
              </PopoverContent>
            </Popover>

            {/* SERP feature multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white">
                  SERP Feature {featSel.size > 0 && <span className="text-muted-foreground">({featSel.size})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72">
                <div className="text-sm font-medium mb-2">Filter by SERP feature</div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FEATURE_ICONS) as FeatureKey[]).map((f) => (
                    <label key={f} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={featSel.has(f)} onCheckedChange={() => toggleFeature(f)} />
                      <span className="flex items-center gap-1">
                        <span>{FEATURE_ICONS[f].icon}</span>{FEATURE_ICONS[f].label}
                      </span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Competitors multi-select (controls both filter & visible columns) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white">
                  Competitor {compSel.size > 0 && <span className="text-muted-foreground">({compSel.size})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="text-sm font-medium mb-2">Show / filter competitors</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={compSel.size === competitors.length}
                      onCheckedChange={()=>{
                        if (compSel.size === competitors.length) setCompSel(new Set());
                        else setCompSel(new Set(competitors));
                      }}
                    />
                    <span className="font-medium">Select All</span>
                  </label>
                  {competitors.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={compSel.has(c)} onCheckedChange={()=>toggleCompetitor(c)} />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Zero filters & Clear */}
            <label className="ml-1 inline-flex items-center gap-2 text-sm">
              <Checkbox checked={hideZero} onCheckedChange={(v)=>setHideZero(Boolean(v))}/>
              <span>Hide Zero CPC / Volume</span>
            </label>

            <Button variant="ghost" className="h-8 px-3 ml-1" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>

        {/* ─ Table (desktop/tablet) ─ */}
        <CardContent className="p-0">
          <div className="hidden sm:block max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-40">
                <TableRow>
                  <TableHead className="min-w-[260px]">{headerCell("Keyword","keyword")}</TableHead>
                  <TableHead className="min-w-[120px]">{headerCell("Intent","intent")}</TableHead>
                  {activeCompList.map((c) => (
                    <TableHead key={c} className="min-w-[140px] text-right">
                      {headerCell(`${c} Rank`, `comp:${c}`)}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[110px] text-right">{headerCell("Volume","volume")}</TableHead>
                  <TableHead className="min-w-[90px] text-right">{headerCell("CPC","cpc")}</TableHead>
                  <TableHead className="min-w-[140px]">{headerCell("Difficulty","kd")}</TableHead>
                  <TableHead className="min-w-[140px]">SERP</TableHead>
                  <TableHead className="min-w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sorted.map((r, idx) => (
                  <TableRow key={r.id} className="hover:bg-[#F8FAFC] h-14 odd:bg-[#F9FAFB]">
                    {/* Keyword */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium truncate max-w-[420px] inline-block align-middle cursor-pointer"
                                  onClick={()=>console.log("Open Keyword Details", r.keyword)}>
                              {r.keyword}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{r.keyword}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Intent */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center uppercase text-[11px] font-semibold px-2 py-0.5 rounded border ${INTENT_META[r.intent].cls}`}
                      >
                        {INTENT_META[r.intent].label}
                      </span>
                    </TableCell>

                    {/* Competitor ranks */}
                    {activeCompList.map((c) => (
                      <TableCell key={c} className="text-right">
                        <CompAvgCell comp={c} rank={r.compRanks[c]} />
                      </TableCell>
                    ))}

                    {/* Volume */}
                    <TableCell className="text-right tabular-nums">{fmtShort(r.volume)}</TableCell>

                    {/* CPC */}
                    <TableCell className="text-right tabular-nums">
                      {r.cpc === 0 ? <span className="text-muted-foreground">$0.00</span> : fmtMoney(r.cpc)}
                    </TableCell>

                    {/* Difficulty */}
                    <TableCell>
                      <KDChip kd={r.kd} />
                    </TableCell>

                    {/* SERP Features */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(Object.keys(FEATURE_ICONS) as FeatureKey[])
                          .filter(k => r.features[k])
                          .map((k) => (
                            <TooltipProvider key={k}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[16px]" aria-label={FEATURE_ICONS[k].label}>
                                    {FEATURE_ICONS[k].icon}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{FEATURE_ICONS[k].label}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))
                        }
                        {!(Object.values(r.features).some(Boolean)) && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        <Button size="sm" className="h-7 px-2" style={{ background: TK.brand, color: "#fff" }}
                                onClick={()=>console.log("Optimize Content", r.keyword)}>
                          Optimize
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2"
                                onClick={()=>console.log("Track KW", r.keyword)}>
                          Track
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2"
                                onClick={()=>console.log("Task", r.keyword)}>
                          Task
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2"
                                onClick={()=>console.log("Analyze", r.keyword)}>
                          Analyze
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ─ Mobile accordion rows ─ */}
          <div className="sm:hidden divide-y" style={{ borderTopColor: TK.borderLight }}>
            {sorted.map((r) => (
              <details key={r.id} className="group">
                <summary className="flex items-center justify-between px-3 py-3 cursor-pointer">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.keyword}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <span className={`inline-flex items-center uppercase text-[10px] font-semibold px-1.5 py-0.5 rounded border ${INTENT_META[r.intent].cls}`}>
                        {INTENT_META[r.intent].label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Volume</div>
                    <div className="tabular-nums">{fmtShort(r.volume)}</div>
                  </div>
                </summary>

                <div className="px-3 pb-3 space-y-2">
                  <div className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Competitors</span>
                      <div className="tabular-nums">
                        {activeCompList.map((c) => (
                          <div className="flex items-center justify-end gap-2" key={c}>
                            <span className="text-xs text-muted-foreground">{c}:</span>
                            <CompAvgCell comp={c} rank={r.compRanks[c]} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">CPC</div>
                        <div className="tabular-nums">{r.cpc === 0 ? "$0.00" : fmtMoney(r.cpc)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Difficulty</div>
                        <div><KDChip kd={r.kd} /></div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground">SERP</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(Object.keys(FEATURE_ICONS) as FeatureKey[])
                            .filter(k => r.features[k])
                            .map(k => (
                              <TooltipProvider key={k}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[16px]">{FEATURE_ICONS[k].icon}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{FEATURE_ICONS[k].label}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))
                          }
                          {!(Object.values(r.features).some(Boolean)) && <span className="text-muted-foreground">—</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center gap-1.5">
                    <Button size="sm" className="h-7 px-2" style={{ background: TK.brand, color: "#fff" }}
                            onClick={()=>console.log("Optimize", r.keyword)}>
                      Optimize
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2"
                            onClick={()=>console.log("Track KW", r.keyword)}>
                      Track
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2"
                            onClick={()=>console.log("Task", r.keyword)}>
                      Task
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-2"
                            onClick={()=>console.log("Analyze", r.keyword)}>
                      Analyze
                    </Button>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}