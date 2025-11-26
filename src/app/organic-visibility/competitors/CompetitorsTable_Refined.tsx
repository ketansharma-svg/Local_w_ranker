"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  Download, Filter, Info, Search, Lock, Eye, LineChart, Plus, ListChecks,
  ChevronsUpDown, ChevronUp, ChevronDown
} from "lucide-react";
import AddToTrack from "./AddToTrack";
import { useState } from "react";
/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD", // branded icons
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

/* ───────────────────────── Types & mock ───────────────────────── */
type Plan = "free" | "pro";
type SortKey = "domain" | "shared" | "overlap" | "traffic" | "value" | "vis";
type DomainType = "yours" | "tracked" | "new";

type Row = {
  id: string;
  domain: string;
  type: DomainType;
  shared: number;          // shared keywords
  overlap: number;         // 0..100
  traffic: number;         // est. monthly
  value: number;           // traffic value $
  vis: number;             // visibility % (Top10 share)
  top3: number;
  top10: number;
  top100: number;
  keywords: string[];
  topPage: string;
};

function rand(min:number,max:number){return Math.floor(Math.random()*(max-min+1))+min;}
function sample<T>(a:T[]){return a[rand(0,a.length-1)];}
function money(n:number){return `$${n.toLocaleString()}`;}
function num(n:number){return n.toLocaleString();}
function visColor(v:number){ return v>=70 ? TK.ok : v>=40 ? TK.warn : TK.danger; }

function makeRows(count=40): Row[] {
  const domains = ["seo.com","rangetracker.ai","moz.com","semrush.com","ahrefs.com","ubersuggest.com","contentkingapp.com","seobility.net","serpstat.com","seranking.com","spyfu.com","backlinko.com","searchenginejournal.com"];
  const rows: Row[] = [];
  for (let i=0;i<count;i++){
    const d = i < domains.length ? domains[i] : `example${i+1}.com`;
    const type: DomainType = i===2 ? "yours" : Math.random()>.6 ? "tracked" : "new";
    const traffic = rand(9000, 280000);
    const value = rand(5000, 300000);
    const overlap = rand(5, 95);
    const shared = Math.round(traffic / rand(250, 600));
    const vis = rand(8, 95);
    const top10 = Math.round(shared * (vis/100));
    rows.push({
      id: `row-${i+1}`,
      domain: d,
      type,
      shared,
      overlap,
      traffic,
      value,
      vis,
      top3: Math.round(top10 * 0.35),
      top10,
      top100: shared,
      keywords: ["seo audit tool","rank tracker","serp monitoring","keyword gap"].sort(()=> Math.random() -.5).slice(0,3),
      topPage: "/tools/seo-audit"
    });
  }
  return rows;
}

/* ───────────────────────── Small UI: Drop‑down Range Chip ───────────────────────── */
type RangeChipProps = {
  label: string;
  value: [number, number];
  min: number;
  max: number;
  step: number;
  format?: (n: number) => string;
  onChange: (v: [number, number]) => void;
};

const RangeChip: React.FC<RangeChipProps> = ({ label, value, min, max, step, format, onChange }) => {
  const all = value[0] === min && value[1] === max;
  const fmt = (n: number) => (format ? format(n) : String(n));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${all ? "bg-white text-gray-700 hover:bg-gray-50" : "bg-[#F0FAFF] border-[#BFE9FF] text-[#0F5CA6]"}`}
          style={{ borderColor: all ? TK.border : "#BFE9FF" }}
        >
          {label}: {all ? "All" : `${fmt(value[0])} – ${fmt(value[1])}`}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{label}</span>
            <span>{fmt(value[0])} – {fmt(value[1])}</span>
          </div>
          {/* scale / slider exactly like current design */}
          <Slider
            value={[value[0], value[1]]}
            min={min}
            max={max}
            step={step}
            onValueChange={(v: number[]) => onChange([v[0], v[1]])}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              className="h-8"
              value={value[0]}
              min={min}
              max={value[1]}
              onChange={(e) => onChange([Math.max(min, Math.min(Number(e.target.value) || 0, value[1])), value[1]])}
            />
            <Input
              type="number"
              className="h-8"
              value={value[1]}
              min={value[0]}
              max={max}
              onChange={(e) => onChange([value[0], Math.min(max, Math.max(Number(e.target.value) || 0, value[0]))])}
            />
            <div className="ml-auto">
              <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={() => onChange([min, max])}>Reset</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ───────────────────────── Component ───────────────────────── */
export default function CompetitorsTable_Refined({
  plan="pro",
}: { plan?: Plan }) {
  // data
  const [rows] = React.useState<Row[]>(() => makeRows());

  // filters shared by map + table
  const [tab, setTab] = React.useState<"all"|"tracked"|"new">("all");
  const [search, setSearch] = React.useState("");
  const [overlap, setOverlap] = React.useState<[number,number]>([0,100]);
  const [traf, setTraf] = React.useState<[number,number]>([0,200_000]);
  const [tval, setTval] = React.useState<[number,number]>([0,300_000]);
  const [visibility, setVisibility] = React.useState<[number,number]>([0,100]);

  // sorting
  const [sortBy, setSortBy] = React.useState<SortKey>("traffic");
  const [sortDir, setSortDir] = React.useState<"asc"|"desc">("desc");
  const toggleSort = (k: SortKey) => {
    if (sortBy !== k) { setSortBy(k); setSortDir("asc"); }
    else setSortDir(d => d==="asc" ? "desc":"asc");
  };

  // selection
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const selectedIds = React.useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);
  const selectedCount = selectedIds.length;

  // filtering
  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      if (tab === "tracked" && r.type !== "tracked") return false;
      if (tab === "new" && r.type !== "new") return false;
      if (search && !r.domain.toLowerCase().includes(search.toLowerCase())) return false;
      if (r.overlap < overlap[0] || r.overlap > overlap[1]) return false;
      if (r.traffic < traf[0] || r.traffic > traf[1]) return false;
      if (r.value < tval[0] || r.value > tval[1]) return false;
      if (r.vis < visibility[0] || r.vis > visibility[1]) return false;
      return true;
    });
  }, [rows, tab, search, overlap, traf, tval, visibility]);

  // sorting
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const val = (r: Row) =>
      sortBy==="domain" ? r.domain.toLowerCase() :
      sortBy==="shared" ? r.shared :
      sortBy==="overlap" ? r.overlap :
      sortBy==="traffic" ? r.traffic :
      sortBy==="value" ? r.value : r.vis;
    arr.sort((a,b) => {
      const av = val(a) as any, bv = val(b) as any;
      if (av===bv) return 0;
      return sortDir==="asc" ? (av>bv?1:-1) : (av<bv?1:-1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* ── Pagination (like recent table) ── */
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const windowRows = React.useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  // selection helpers: apply to current page only
  const pageIds = windowRows.map(r => r.id);
  const pageAllSelected = pageIds.length>0 && pageIds.every(id => !!selected[id]);
  const somePageSelected = pageIds.some(id => !!selected[id]) && !pageAllSelected;
  const toggleAllPage = () => {
    const on = !pageAllSelected;
    const patch: Record<string, boolean> = {};
    pageIds.forEach(id => patch[id] = on);
    setSelected(s => ({ ...s, ...patch }));
  };

  // export (CSV)
  const exportCSV = () => {
    const cols = ["domain","shared","overlap","traffic","value","vis","top3","top10","top100","topPage"];
    const header = cols.join(",");
    const lines = sorted.map(r =>
      [r.domain, r.shared, r.overlap, r.traffic, r.value, r.vis, r.top3, r.top10, r.top100, r.topPage]
      .map(v => JSON.stringify(String(v))).join(",")
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "organic-competitors.csv"; a.click();
    URL.revokeObjectURL(a.href);
  };

  /* segmented chips */
  const SegChip: React.FC<React.PropsWithChildren<{active?: boolean; onClick: () => void;}>> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${active ? "bg-[#F0FAFF] border-[#BFE9FF] text-[#0F5CA6]" : "bg-white text-gray-700 hover:bg-gray-50"}`}
      style={{ borderColor: TK.border }}
    >
      {children}
    </button>
  );

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
       if (e) e.stopPropagation();
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };

  return (
    <section className="space-y-3" style={FONTS}>
                                    {drawerRow && (
                  <div
          style={{
            display: "flex",
            position: "absolute",
            zIndex: 1001, 
          }}
          // onClick={() => setDrawerRow(false)} // Close popup on background click
        >
                      <AddToTrack onClose={closeDrawer}/>
                    </div>
                  )}
      <div className="rounded-md border bg-white" style={{ borderColor: TK.border }}>
        {/* Header row */}
        <div className="p-3 px-4 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[15px] font-semibold inline-flex items-center gap-2">
              <LineChart className="h-5 w-5" style={{ color: TK.brand }} />
              Organic Competitors
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Export
              </Button>
            </div>
          </div>

          {/* Filters bar (all chips live here) */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" style={{ color: TK.brand }} />
              Filters
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Filters apply to the table.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Segment toggles */}
            <SegChip active={tab==="all"} onClick={()=> setTab("all")}>All</SegChip>
            <SegChip active={tab==="tracked"} onClick={()=> setTab("tracked")}>Tracked only</SegChip>
            <SegChip active={tab==="new"} onClick={()=> setTab("new")}>New only</SegChip>

            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[260px] pl-7" placeholder="Search domain…" value={search} onChange={(e)=> setSearch(e.target.value)} />
            </div>

            {/* Drop-down chips with sliders (as requested) */}
            <RangeChip
              label="Overlap %"
              value={overlap}
              min={0}
              max={100}
              step={1}
              onChange={setOverlap}
            />
            <RangeChip
              label="Est. Traffic"
              value={traf}
              min={0}
              max={200_000}
              step={1000}
              format={(n)=> n.toLocaleString()}
              onChange={setTraf}
            />
            <RangeChip
              label="Traffic Value"
              value={tval}
              min={0}
              max={300_000}
              step={1000}
              format={(n)=> `$${n.toLocaleString()}`}
              onChange={setTval}
            />
            <RangeChip
              label="Visibility %"
              value={visibility}
              min={0}
              max={100}
              step={1}
              onChange={setVisibility}
            />

            {/* Sort controls (kept concise) */}
            <Select value={`${sortBy}`} onValueChange={(v:any)=> setSortBy(v)}>
              <SelectTrigger className="h-8 px-3 w-[180px] cursor-pointer">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="traffic">Sort · Est. Traffic</SelectItem>
                <SelectItem value="value">Sort · Traffic Value</SelectItem>
                <SelectItem value="shared">Sort · Shared Keywords</SelectItem>
                <SelectItem value="overlap">Sort · Overlap %</SelectItem>
                <SelectItem value="vis">Sort · Visibility %</SelectItem>
                <SelectItem value="domain">Sort · Domain</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDir} onValueChange={(v:any)=> setSortDir(v)}>
              <SelectTrigger className="h-8 px-3 w-[100px] cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk bar (shows when any selected) */}
            {selectedCount > 0 && (
              <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
                <span className="text-sm"><strong>{selectedCount}</strong> selected</span>
                <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
                <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=> alert(`Compare ${selectedIds.length} domains`)}>
                  <LineChart className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Compare
                </Button>
                <Button size="sm" variant="outline" className="cursor-pointer" onClick={openDrawer}>
                  <Plus className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Add to Tracker
                </Button>
                <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=> alert(`View shared keywords for ${selectedIds.length} domains`)}>
                  <ListChecks className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Shared Keywords
                </Button>
                <div className="ml-auto">
                  <Button size="sm" variant="ghost" className="cursor-pointer" onClick={()=> setSelected({})}>Clear</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[560px] overflow-auto">
          <Table className="text-sm">
            <TableHeader className="bg-white sticky top-0 z-40" style={{ boxShadow: "inset 0 -1px 0 var(--wr-borderLight,#EFF0F6)" }}>
              <TableRow>
                <TableHead style={{ width: 40 }} className="text-center">
                  <Checkbox checked={somePageSelected ? "indeterminate" : pageAllSelected} onCheckedChange={toggleAllPage} />
                </TableHead>
                <TableHead className="min-w-[280px]">
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("domain")}>
                    <span>Domain</span>
                    {sortBy==="domain" ? (sortDir==="asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>
                <TableHead style={{ width: 140 }}>
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("shared")}>
                    <span>Shared Keywords</span>
                    {sortBy==="shared" ? (sortDir==="asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>
                <TableHead style={{ width: 130 }}>
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("overlap")}>
                    <span>Overlap %</span>
                    {sortBy==="overlap" ? (sortDir==="asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>
                <TableHead style={{ width: 140 }}>
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("traffic")}>
                    <span>Est. Traffic</span>
                    {sortBy==="traffic" ? (sortDir==="asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>
                <TableHead style={{ width: 150 }}>
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("value")}>
                    <span>Traffic Value</span>
                    {sortBy==="value" ? (sortDir==="asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>
                <TableHead style={{ width: 210 }}>
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("vis")}>
                    <span>Visibility Score</span>
                    {sortBy==="vis" ? (sortDir==="asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>
                <TableHead className="min-w-[250px]">Top Keywords</TableHead>
                <TableHead className="min-w-[200px]">Top Page</TableHead>
                <TableHead style={{ width: 200 }} className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {windowRows.map(r => {
                const tag =
                  r.type==="yours" ? <span className="ml-2 text-[10px] rounded px-1 py-[1px] border" style={{ borderColor: TK.borderLight }}>yours</span> :
                  r.type==="tracked" ? <span className="ml-2 text-[10px] rounded px-1 py-[1px] border" style={{ borderColor: TK.borderLight }}>tracked</span> : null;

                return (
                  <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                    {/* select */}
                    <TableCell className="text-center">
                      <Checkbox checked={!!selected[r.id]} onCheckedChange={(v)=> setSelected(s => ({ ...s, [r.id]: Boolean(v) }))} />
                    </TableCell>

                    {/* domain */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 rounded bg-gray-200" aria-hidden />
                        <a className="font-medium underline cursor-pointer" style={{ color: TK.brand }}>{r.domain}</a>
                        {tag}
                      </div>
                    </TableCell>

                    {/* shared */}
                    <TableCell>
                      <button className="text-[13px] underline cursor-pointer" style={{ color: TK.brand }} onClick={()=> alert(`Open Keyword Gap Drawer: ${r.domain}`)}>
                        {num(r.shared)}
                      </button>
                    </TableCell>

                    {/* overlap ring */}
                    <TableCell>
                      <div className="inline-flex items-center gap-2">
                        <div className="relative" title={`${r.overlap}%`}>
                          <svg width="26" height="26" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                            <circle
                              cx="18" cy="18" r="14" fill="none" stroke={TK.brand} strokeWidth="4" strokeLinecap="round"
                              strokeDasharray={`${(r.overlap/100)*2*Math.PI*14} ${2*Math.PI*14}`}
                              transform="rotate(-90 18 18)"
                            />
                          </svg>
                        </div>
                        <span className="text-sm">{r.overlap}%</span>
                      </div>
                    </TableCell>

                    {/* est traffic */}
                    <TableCell>{num(r.traffic)}</TableCell>

                    {/* value */}
                    <TableCell>{money(r.value)}</TableCell>

                    {/* visibility bar */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 w-[180px] cursor-pointer">
                              <div className="relative h-2 flex-1 rounded bg-gray-100 overflow-hidden">
                                <div className="absolute left-0 top-0 h-full" style={{ width: `${r.vis}%`, background: visColor(r.vis) }} />
                              </div>
                              <span className="text-sm" style={{ color: visColor(r.vis) }}>{r.vis}%</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Top 3: {num(r.top3)} • Top 10: {num(r.top10)} • Top 100: {num(r.top100)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* top keywords chips */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {r.keywords.map((k, i) => (
                          <button
                            key={k+i}
                            className="rounded-full px-2 py-[2px] text-[12px] border cursor-pointer"
                            style={{ borderColor: TK.borderLight }}
                            onClick={()=> plan==="pro" ? alert(`Open Keyword Gap Drawer: ${k}`) : undefined}
                            title={plan==="free" ? "Pro feature" : "View in Gap Drawer"}
                          >
                            {k}{plan==="free" && <Lock className="inline ml-1 h-3.5 w-3.5 text-gray-400" />}
                          </button>
                        ))}
                      </div>
                    </TableCell>

                    {/* top page */}
                    <TableCell>
                      <button
                        className="underline cursor-pointer text-left"
                        style={{ color: TK.brand }}
                        title={r.topPage}
                        onClick={() => alert(`Open Organic Page Drawer: ${r.topPage}`)}
                      >
                        {r.topPage}
                      </button>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=> alert(`Shared Keywords: ${r.domain}`)} aria-label="View Shared Keywords">
                                <ListChecks className="h-4 w-4" style={{ color: TK.brand }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Shared Keywords</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=> alert(`SERP Layout: ${r.domain}`)} aria-label="View SERP layout">
                                <Eye className="h-4 w-4" style={{ color: TK.brand }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View SERP layout</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=> alert(`Analyze / Compare: ${r.domain}`)} aria-label="Analyze">
                                <LineChart className="h-4 w-4" style={{ color: TK.brand }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Compare / Analyze</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" onClick={openDrawer} aria-label="Add to Tracker">
                                <Plus className="h-4 w-4" style={{ color: TK.brand }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add to Tracker</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm text-muted-foreground">
            Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + windowRows.length)} of {sorted.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page<=1} onClick={()=>setPage(1)}>First</Button>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
            <div className="text-sm w-20 text-center">{page} / {totalPages}</div>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page>=totalPages} onClick={()=>setPage(totalPages)}>Last</Button>
            <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 px-3 w-[120px] cursor-pointer"><SelectValue placeholder="Rows / page" /></SelectTrigger>
              <SelectContent align="end">
                {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}

