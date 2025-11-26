import React, { useMemo, useRef, useState, useEffect } from "react";
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
  ChevronsUpDown, ChevronUp, ChevronDown, Info
} from "lucide-react";

/* ───────────────────────────────────────────────────────────
   Design Tokens (matches panel; "You" values use #0077ff)
   ─────────────────────────────────────────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #1090D0)",                 // primary brand
  youBlue: "var(--wr-you-blue, #0077ff)",            // graphical blue for "You"
  ok: "var(--wr-success, #16A34A)",
  critical: "var(--wr-critical, #EF4444)",
  radius: "var(--wr-radius, 8px)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
};

/* ───────────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────────── */
type Intent = "informational" | "commercial" | "navigational" | "transactional";
type FeatureKey = "snippet" | "image" | "sitelinks" | "video" | "paa";

type KWRow = {
  id: string;
  keyword: string;
  intent: Intent;
  youRank: number | null; // null = not ranked
  compRanks: Record<string, number | null>; // up to 3 domains
  volume: number;
  cpc: number; // USD
  features: Partial<Record<FeatureKey, boolean>>;
};

/* ───────────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────────── */
const fmtNum = (n: number) => new Intl.NumberFormat().format(n);
const fmtShort = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

const INTENT_META: Record<Intent, { label: string; cls: string }> = {
  informational: { label: "Inform.", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  commercial:    { label: "Comm.",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  navigational:  { label: "Nav.",    cls: "bg-gray-50 text-gray-700 border-gray-200" },
  transactional: { label: "Trans.",  cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

const FEATURE_ICONS: Record<FeatureKey, { icon: string; label: string }> = {
  snippet:   { icon: "⭐", label: "Featured Snippet" },
  image:     { icon: "📷", label: "Image Pack" },
  sitelinks: { icon: "🔗", label: "Sitelinks" },
  video:     { icon: "🎥", label: "Video" },
  paa:       { icon: "❓", label: "People Also Ask" },
};

function compBetter(you: number | null, them: number | null) {
  // lower number = better rank. If you don't rank and they do → they outrank.
  if (them == null && you == null) return null;
  if (you == null && them != null) return true;
  if (you != null && them == null) return false;
  if (you != null && them != null) return them < you;
  return null;
}

function sameRank(you: number | null, them: number | null) {
  if (you == null || them == null) return false;
  return you === them;
}

/* ───────────────────────────────────────────────────────────
   Mock data (swap with live)
   ─────────────────────────────────────────────────────────── */
const COMPETITORS = ["comp1.com", "comp2.com"]; // up to 3 supported

const MOCK: KWRow[] = [
  {
    id: "k1",
    keyword: "seo tools",
    intent: "informational",
    youRank: 9,
    compRanks: { "comp1.com": 4, "comp2.com": 7 },
    volume: 4400,
    cpc: 2.8,
    features: { snippet: true, image: true },
  },
  {
    id: "k2",
    keyword: "ai content",
    intent: "commercial",
    youRank: 12,
    compRanks: { "comp1.com": 16, "comp2.com": 8 },
    volume: 2100,
    cpc: 3.9,
    features: { image: true },
  },
  {
    id: "k3",
    keyword: "local seo",
    intent: "transactional",
    youRank: 7,
    compRanks: { "comp1.com": 6, "comp2.com": 15 },
    volume: 5600,
    cpc: 4.1,
    features: { sitelinks: true },
  },
  {
    id: "k4",
    keyword: "seo checklist template",
    intent: "informational",
    youRank: 5,
    compRanks: { "comp1.com": 8, "comp2.com": 10 },
    volume: 3100,
    cpc: 0,
    features: { paa: true, image: true },
  },
  {
    id: "k5",
    keyword: "content optimization guide",
    intent: "informational",
    youRank: null,
    compRanks: { "comp1.com": 9, "comp2.com": 11 },
    volume: 1700,
    cpc: 3.1,
    features: { snippet: true, video: true },
  },
];

/* ───────────────────────────────────────────────────────────
   Component
   ─────────────────────────────────────────────────────────── */
export default function CI_SharedKeywordsTable() {
  // filters
  const [query, setQuery] = useState("");
  const [intentSel, setIntentSel] = useState<Set<Intent>>(new Set()); // multi
  const [featSel, setFeatSel] = useState<Set<FeatureKey>>(new Set()); // multi
  const [rankGap, setRankGap] = useState<"all"|"compBetter"|"youBetter"|"same">("all");
  const [hideZero, setHideZero] = useState<boolean>(false);

  // sorting
  type SortKey = "keyword" | "intent" | "your" | "volume" | "cpc" | `comp:${string}`;
  const [sortKey, setSortKey] = useState<SortKey>("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // data
  const [rows] = useState<KWRow[]>(MOCK);
  const competitors = COMPETITORS; // could be prop/state elsewhere

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

  function clearFilters() {
    setQuery("");
    setIntentSel(new Set());
    setFeatSel(new Set());
    setRankGap("all");
    setHideZero(false);
  }

  // filter logic
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query && !r.keyword.toLowerCase().includes(query.toLowerCase())) return false;
      if (intentSel.size > 0 && !intentSel.has(r.intent)) return false;

      if (featSel.size > 0) {
        for (const f of featSel) {
          if (!r.features[f]) return false;
        }
      }

      if (hideZero && (r.cpc === 0 || r.volume === 0)) return false;

      if (rankGap !== "all") {
        const anyCompBetter = competitors.some((c) => compBetter(r.youRank, r.compRanks[c]) === true);
        const anyYouBetter  = competitors.some((c) => compBetter(r.compRanks[c], r.youRank) === true);
        const anySame       = competitors.some((c) => sameRank(r.youRank, r.compRanks[c]));

        if (rankGap === "compBetter" && !anyCompBetter) return false;
        if (rankGap === "youBetter"  && !anyYouBetter)  return false;
        if (rankGap === "same"       && !anySame)       return false;
      }

      return true;
    });
  }, [rows, query, intentSel, featSel, hideZero, rankGap, competitors]);

  // sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const get = (r: KWRow) => {
      if (sortKey === "keyword") return r.keyword;
      if (sortKey === "intent") return r.intent;
      if (sortKey === "your") return r.youRank ?? 10_000; // nulls bottom
      if (sortKey === "volume") return r.volume;
      if (sortKey === "cpc") return r.cpc;
      if (sortKey.startsWith("comp:")) {
        const dom = sortKey.split(":")[1];
        return r.compRanks[dom] ?? 10_000;
      }
      return 0;
    };
    arr.sort((a, b) => {
      const av = get(a); const bv = get(b);
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
      "Keyword","Intent","Your Rank",
      ...competitors.map(c => `${c} Rank`),
      "Volume","CPC","SERP Features"
    ];
    const lines = sorted.map(r => {
      const feats = Object.entries(FEATURE_ICONS)
        .filter(([k]) => r.features[k as FeatureKey])
        .map(([,v]) => v.label).join("|");
      const cols = [
        r.keyword,
        r.intent,
        r.youRank == null ? "—" : `#${r.youRank}`,
        ...competitors.map(c => r.compRanks[c] == null ? "—" : `#${r.compRanks[c]}`),
        String(r.volume),
        String(r.cpc),
        feats
      ];
      return cols.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "shared-keywords.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ui helpers
  function RankCell({ rank, aria }: { rank: number | null; aria: string }) {
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
    return <span aria-label={aria} className="tabular-nums">#{rank}</span>;
  }

  function CompCell({ you, them }: { you: number | null; them: number | null }) {
    const better = compBetter(you, them);
    const equal = sameRank(you, them);
    const color = better === true ? TK.ok : better === false ? TK.critical : TK.muted;
    const arrow = equal ? "—" : better ? "↑" : "↓";
    const title = equal
      ? "Same position as you"
      : better
        ? "Competitor outranks you"
        : "You outrank competitor";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <RankCell rank={them} aria={title} />
              <span style={{ color }}>{arrow}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{title}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const headerCell = (label: string, key: SortKey) => {
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
  };

  return (
    <section className="space-y-3 mt-4 py-2">
      <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* ─ Header with title (left) & export (right) ─ */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Shared Keywords</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Keywords where you and selected competitors both rank. Sort, filter, and take action.
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

            {/* Rank gap */}
            <Select value={rankGap} onValueChange={(v:any)=>setRankGap(v)}>
              <SelectTrigger className="h-8 px-3 w-[170px]">
                <SelectValue placeholder="Rank Gap" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Rank Gap: All</SelectItem>
                <SelectItem value="compBetter">Competitor outranks me</SelectItem>
                <SelectItem value="youBetter">I outrank them</SelectItem>
                <SelectItem value="same">Same rank</SelectItem>
              </SelectContent>
            </Select>

            {/* Zero CPC/Volume */}
            <label className="ml-1 inline-flex items-center gap-2 text-sm">
              <Checkbox checked={hideZero} onCheckedChange={(v)=>setHideZero(Boolean(v))}/>
              <span>Hide Zero CPC / Volume</span>
            </label>

            {/* Clear Filters */}
            <Button variant="ghost" className="h-8 px-3 ml-1" onClick={clearFilters}>Clear Filters</Button>
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
                  <TableHead className="min-w-[110px] text-right">{headerCell("Your Rank","your")}</TableHead>
                  {competitors.map((c) => (
                    <TableHead key={c} className="min-w-[130px] text-right">
                      {headerCell(`${c} Rank`, `comp:${c}`)}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[100px] text-right">{headerCell("Volume","volume")}</TableHead>
                  <TableHead className="min-w-[90px] text-right">{headerCell("CPC","cpc")}</TableHead>
                  <TableHead className="min-w-[140px]">SERP Features</TableHead>
                  <TableHead className="min-w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sorted.map((r) => (
                  <TableRow key={r.id} className="hover:bg-[#F8FAFC] h-14">
                    {/* Keyword */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium truncate max-w-[420px] inline-block align-middle">{r.keyword}</span>
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

                    {/* Your Rank (YOU color = #0077ff) */}
                    <TableCell className="text-right">
                      <span className="tabular-nums font-semibold" style={{ color: TK.youBlue }}>
                        <RankCell rank={r.youRank} aria={`Your rank for ${r.keyword}`} />
                      </span>
                    </TableCell>

                    {/* Competitor Ranks with ↑/↓ vs YOU */}
                    {competitors.map((c) => (
                      <TableCell key={c} className="text-right">
                        <CompCell you={r.youRank} them={r.compRanks[c]} />
                      </TableCell>
                    ))}

                    {/* Volume */}
                    <TableCell className="text-right tabular-nums">{fmtShort(r.volume)}</TableCell>

                    {/* CPC */}
                    <TableCell className="text-right tabular-nums">
                      {r.cpc === 0 ? <span className="text-muted-foreground">$0.00</span> : fmtMoney(r.cpc)}
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
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" className="h-7 px-2" style={{ background: TK.brand, color: "#fff" }}
                                onClick={()=>console.log("Optimize", r.keyword)}>
                          Optimize
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2"
                                onClick={()=>console.log("Track KW", r.keyword)}>
                          Track KW
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
                    <div className="text-xs text-muted-foreground">Your Rank</div>
                    <div className="tabular-nums font-semibold" style={{ color: TK.youBlue }}>
                      <RankCell rank={r.youRank} aria={`Your rank for ${r.keyword}`} />
                    </div>
                  </div>
                </summary>

                <div className="px-3 pb-3 space-y-2">
                  <div className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Competitors</span>
                      <div className="tabular-nums">
                        {competitors.map((c, i) => (
                          <div className="flex items-center justify-end gap-2" key={c}>
                            <span className="text-xs text-muted-foreground">{c}:</span>
                            <CompCell you={r.youRank} them={r.compRanks[c]} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Volume</div>
                        <div className="tabular-nums">{fmtShort(r.volume)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">CPC</div>
                        <div className="tabular-nums">{r.cpc === 0 ? "$0.00" : fmtMoney(r.cpc)}</div>
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
                      Track KW
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
