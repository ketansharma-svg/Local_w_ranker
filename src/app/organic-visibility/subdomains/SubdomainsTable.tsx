"use client";

import * as React from "react";
import {
  Button,
} from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Info, ArrowUpRight, ArrowDownRight, Download, ChevronsUpDown, ChevronUp, ChevronDown,
  ExternalLink, Link as LinkIcon, ClipboardList, DatabaseZap, Lock, Filter, RefreshCw, Globe2
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD",               // branded icons & accents
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  pastelBlue: "#E8F5FD",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

/* ───────────────────────── Types ───────────────────────── */
type Plan = "free" | "pro";

type Row = {
  id: string;
  subdomain: string;            // blog.domain.com
  traffic: number;              // Estimated monthly organic traffic
  deltaPct?: number | "NEW";    // Traffic change %
  keywords: number;             // Total ranking keywords (Top 100)
  top10Pct: number;             // % of subdomain's keywords in Top 10
  topPage: string;              // URL with most traffic inside the subdomain
  backlinks?: number;           // Referring domains (optional)
};

type SortKey = "subdomain" | "traffic" | "deltaPct" | "keywords" | "top10Pct" | "backlinks" | "topPage";

/* ───────────────────────── Helpers ───────────────────────── */
const fmtInt = (n?: number) => (n == null ? "—" : n.toLocaleString());
const pct = (n?: number) => (n == null ? "—" : `${n.toFixed(1)}%`);
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

function visColor(p: number) {
  if (p >= 60) return TK.ok;        // green
  if (p >= 30) return TK.warn;      // amber
  return TK.danger;                 // red
}

function idFor(s: string) {
  return "sd_" + s.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 64);
}

/* Export helpers */
function exportCsv(rows: Row[]) {
  const cols = ["subdomain","traffic","deltaPct","keywords","top10Pct","topPage","backlinks"];
  const header = cols.join(",");
  const lines = rows.map(r => [
    JSON.stringify(r.subdomain),
    r.traffic,
    typeof r.deltaPct === "number" ? r.deltaPct.toFixed(2) : (r.deltaPct ?? ""),
    r.keywords,
    r.top10Pct.toFixed(1),
    JSON.stringify(r.topPage),
    r.backlinks ?? "",
  ].join(","));
  const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "subdomains.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportPNGFromContainer(node: HTMLElement | null, filename = "subdomains.png") {
  if (!node) return;
  const wrapper = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${node.clientWidth}" height="${node.clientHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,'Inter Fallback',system-ui;">
          ${node.outerHTML}
        </div>
      </foreignObject>
    </svg>`;
  const svg = new Blob([wrapper], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = node.clientWidth;
    canvas.height = node.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ───────────────────────── Demo data generator ───────────────────────── */
const SEEDS = [
  "www.domain.com","blog.domain.com","academy.domain.com","app.domain.com","partner.domain.com","help.domain.com","docs.domain.com","en.domain.com","de.domain.com","fr.domain.com","es.domain.com","beta.domain.com","tools.domain.com","cdn.domain.com","blog.domain.com/tools"
];

function rand(min:number,max:number){ return Math.floor(Math.random()*(max-min+1))+min; }
function pick<T>(arr:T[]){ return arr[rand(0, arr.length-1)]; }

function makeRows(count=48): Row[] {
  const base: Row[] = [];
  for (let i=0;i<count;i++){
    const s = pick(SEEDS) + (Math.random()>.85 ? `-${i+1}` : "");
    const kw = rand(22, 6800);
    const top10 = clamp(Math.round((Math.random()*80 + 10)*10)/10, 0, 100); // 10–90%
    const traffic = Math.max(40, Math.round(kw * (0.02 + Math.random()*0.12)));
    const delta = Math.random() > 0.13 ? Number((Math.random()*30*(Math.random()>.5?1:-1)).toFixed(1)) : "NEW";
    const bl = Math.random() > 0.2 ? rand(6, 2400) : rand(0, 18);
    base.push({
      id: idFor(s),
      subdomain: s,
      traffic,
      deltaPct: delta,
      keywords: kw,
      top10Pct: top10,
      topPage: `/${s.includes("blog") ? "blog" : "tools"}/top-page-${(i%12)+1}`,
      backlinks: bl,
    });
  }
  return base;
}

/* ───────────────────────── Small UI atoms ───────────────────────── */
const DeltaBadge: React.FC<{ delta?: number | "NEW"; locked?: boolean }> = ({ delta, locked }) => {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Lock className="h-3.5 w-3.5" /> <span>Pro</span>
      </span>
    );
  }
  if (delta === "NEW") {
    return (
      <span
        className="px-2 py-[2px] rounded-full border text-[11px]"
        style={{ borderColor: "#BFE9FF", color: TK.brand, background: "#F0FAFF" }}
      >
        NEW
      </span>
    );
  }
  if (typeof delta === "number") {
    const up = delta >= 0;
    return (
      <span className={`inline-flex items-center gap-1 text-sm ${up ? "text-emerald-600" : "text-rose-600"}`}>
        {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        {Math.abs(delta).toFixed(1)}%
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
};

const VisibilityBar: React.FC<{ value: number; locked?: boolean }> = ({ value, locked }) => {
  const v = clamp(value);
  const color = visColor(v);
  return (
    <div className="w-full">
      <div className="h-2.5 w-full rounded-full bg-gray-100 relative overflow-hidden" aria-hidden>
        <div
          className="h-full rounded-full"
          style={{ width: locked ? "0%" : `${v}%`, backgroundColor: color, transition: "width .35s ease" }}
        />
      </div>
      <div className="mt-1 text-xs font-medium">
        {locked ? <span className="inline-flex items-center gap-1 text-gray-500"><Lock className="h-3.5 w-3.5" /> Pro</span> : <span>{v.toFixed(1)}%</span>}
      </div>
    </div>
  );
};

/* ───────────────────────── Main Component ───────────────────────── */
export default function SubdomainsTable({
  plan = "pro",
  initialRows,
  onFilterBySubdomain,
  onOpenTopPage,
  onUpgrade,
}: {
  plan?: Plan;
  initialRows?: Row[];
  onFilterBySubdomain?: (subdomain: string) => void;
  onOpenTopPage?: (url: string) => void;
  onUpgrade?: () => void;
}) {
  /* state */
  const [rows, setRows] = React.useState<Row[]>(() => initialRows?.length ? initialRows : makeRows(60));
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortKey>("traffic");
  const [sortDir, setSortDir] = React.useState<"asc"|"desc">("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [onlyGainers, setOnlyGainers] = React.useState(false);
  const [visibilityMin, setVisibilityMin] = React.useState(0);
  const [visibilityMax, setVisibilityMax] = React.useState(100);

  const tableRef = React.useRef<HTMLDivElement>(null);

  /* derived */
  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      if (search && !r.subdomain.toLowerCase().includes(search.toLowerCase())) return false;
      if (onlyGainers) {
        if (typeof r.deltaPct === "number") {
          if (r.deltaPct <= 0) return false;
        } else if (r.deltaPct !== "NEW") {
          return false;
        }
      }
      if (!(r.top10Pct >= visibilityMin && r.top10Pct <= visibilityMax)) return false;
      return true;
    });
  }, [rows, search, onlyGainers, visibilityMin, visibilityMax]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const value = (r: Row) => {
      switch (sortBy) {
        case "subdomain": return r.subdomain.toLowerCase();
        case "traffic":   return r.traffic;
        case "deltaPct":  return typeof r.deltaPct === "number" ? r.deltaPct : (r.deltaPct === "NEW" ? 9999 : -9999);
        case "keywords":  return r.keywords;
        case "top10Pct":  return r.top10Pct;
        case "backlinks": return r.backlinks ?? -1;
        case "topPage":   return r.topPage.toLowerCase();
      }
    };
    arr.sort((a,b) => {
      const av = value(a) as any;
      const bv = value(b) as any;
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const windowRows = React.useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  const pageIds = windowRows.map(r => r.id);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const pageAllSelected = pageIds.length > 0 && pageIds.every(id => selected[id]);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleAll = () => {
    const on = !pageAllSelected;
    const patch: Record<string, boolean> = {};
    pageIds.forEach(id => patch[id] = on);
    setSelected(s => ({ ...s, ...patch }));
  };

  function toggleSort(k: SortKey) {
    if (sortBy !== k) { setSortBy(k); setSortDir("asc"); }
    else setSortDir(d => d === "asc" ? "desc" : "asc");
  }

  /* gating helpers */
  const isFree = plan === "free";
  const gate = (fn: () => void) => isFree ? (onUpgrade ? onUpgrade() : alert("This is a Pro feature.")) : fn();

  /* modern chip */
  const Chip: React.FC<React.PropsWithChildren<{ active?: boolean; onClick?: () => void }>> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${active ? "bg-[#F0FAFF] border-[#BFE9FF] text-[#0F5CA6]" : "bg-white text-gray-700 hover:bg-gray-50"}`}
      style={{ borderColor: TK.border }}
    >
      {children}
    </button>
  );

  return (
    <section className="space-y-3" style={FONTS}>
      <div className="rounded-md border bg-white" style={{ borderColor: TK.border }}>
        {/* ── Section Header (title + Export) ── */}
        <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" style={{ color: TK.brand }} />
            <h2 className="text-lg font-semibold">Sub-Domains</h2>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Export is placed on the section header */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 px-3 cursor-pointer">
                  <Download className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px] z-[250]">
                <DropdownMenuLabel>Export Table</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isFree}
                  className={`cursor-pointer ${isFree ? "text-gray-400" : ""}`}
                  onClick={() => gate(() => exportCsv(sorted))}
                >
                  CSV {isFree && <span className="ml-2 text-xs">(Upgrade)</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isFree}
                  className={`cursor-pointer ${isFree ? "text-gray-400" : ""}`}
                  onClick={() => gate(() => exportPNGFromContainer(tableRef.current!, "subdomains.png"))}
                >
                  PNG {isFree && <span className="ml-2 text-xs">(Upgrade)</span>}
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-gray-400">PDF (Pro Reports)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={() => setRows(makeRows(60))}>
              <RefreshCw className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Refresh
            </Button>
          </div>
        </div>

        {/* ── Filter / Controls Bar ── */}
        <div className="p-3 px-4 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                className="w-[320px] pl-3"
                placeholder="Search subdomain…"
                value={search}
                onChange={(e)=> setSearch(e.target.value)}
              />
            </div>

            <Chip active={onlyGainers} onClick={()=> setOnlyGainers(v => !v)}>
              Gaining only
            </Chip>

            <div className="ml-1 inline-flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Visibility</span>
              <Input type="number" className="h-8 w-[72px]" value={visibilityMin} min={0} max={100} onChange={(e)=> setVisibilityMin(clamp(Number(e.target.value)||0))} />
              <span>–</span>
              <Input type="number" className="h-8 w-[72px]" value={visibilityMax} min={0} max={100} onChange={(e)=> setVisibilityMax(clamp(Number(e.target.value)||0))} />
              <span className="text-muted-foreground text-xs">% in Top 10</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 px-3 w-[120px] cursor-pointer"><SelectValue placeholder="Rows / page" /></SelectTrigger>
                <SelectContent align="end" className="z-[240]">
                  {[10,25,50].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk toolbar (appears when rows are selected) */}
          {selectedCount > 0 && (
            <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
              <span className="text-sm"><strong>{selectedCount}</strong> selected</span>
              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=> alert("Create task (bulk)")}>
                <ClipboardList className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Create Task
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=> alert("Analyze selected subdomains")}>
                <DatabaseZap className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Analyze
              </Button>
              <div className="ml-auto">
                <Button size="sm" variant="ghost" className="cursor-pointer" onClick={()=> setSelected({})}>Clear</Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div ref={tableRef} className="max-h-[620px] overflow-auto">
          <Table className="text-sm">
            <TableHeader className="bg-white sticky top-0 z-40" style={{ boxShadow: "inset 0 -1px 0 var(--wr-borderLight,#EFF0F6)" }}>
              <TableRow>
                <TableHead style={{ width: 44 }} className="text-center">
                  <Checkbox checked={pageAllSelected} onCheckedChange={toggleAll} />
                </TableHead>

                <TableHead className="min-w-[280px]">
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("subdomain")}>
                    <span>Subdomain</span>
                    {sortBy === "subdomain" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>

                <TableHead style={{ width: 140 }} className="text-right">
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("traffic")}>
                    <span>Est. Traffic</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                        <TooltipContent className="text-xs">Estimated monthly organic traffic.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {sortBy === "traffic" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>

                <TableHead style={{ width: 120 }} className="text-center">
                  <span className="inline-flex items-center gap-1">
                    Δ %
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                        <TooltipContent className="text-xs">Traffic % change vs selected previous period.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </TableHead>

                <TableHead style={{ width: 150 }} className="text-right">
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("keywords")}>
                    <span>Ranking Keywords</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                        <TooltipContent className="text-xs">Total keywords in Top 100 for this subdomain.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {sortBy === "keywords" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>

                <TableHead className="min-w-[220px]">
                  <span className="inline-flex items-center gap-1">
                    Visibility Score
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                        <TooltipContent className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TK.ok }} /> <span>≥ 60% (High)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TK.warn }} /> <span>30–59% (Medium)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TK.danger }} /> <span>&lt; 30% (Low)</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </TableHead>

                <TableHead className="min-w-[280px]">Top Page</TableHead>

                <TableHead style={{ width: 140 }} className="text-right">
                  <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=> toggleSort("backlinks")}>
                    <span>Backlinks</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" /></TooltipTrigger>
                        <TooltipContent className="text-xs">Referring domains to this subdomain (optional).</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {sortBy === "backlinks" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TableHead>

                <TableHead style={{ width: 180 }} className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {windowRows.map(r => {
                const lockedDelta = isFree;
                const lockedVis  = isFree;
                const lockedBL   = isFree;

                // middle-truncate helper
                const topLabel = r.topPage.length > 56
                  ? r.topPage.replace(/\/([^\/]{16})[^\/]*\//, "/$1…/")
                  : r.topPage;

                return (
                  <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                    <TableCell className="text-center">
                      <Checkbox
                        checked={!!selected[r.id]}
                        onCheckedChange={(v)=> setSelected((s)=> ({ ...s, [r.id]: Boolean(v) }))}
                      />
                    </TableCell>

                    <TableCell>
                      <button
                        className="font-medium underline decoration-transparent hover:decoration-inherit cursor-pointer"
                        style={{ color: TK.brand }}
                        title={r.subdomain}
                        onClick={() => (onFilterBySubdomain ? onFilterBySubdomain(r.subdomain) : alert(`Filter Pages by: ${r.subdomain}`))}
                      >
                        {r.subdomain}
                      </button>
                    </TableCell>

                    <TableCell className="text-right">{fmtInt(r.traffic)}</TableCell>

                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span><DeltaBadge delta={r.deltaPct} locked={lockedDelta} /></span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {lockedDelta ? "Pro only • Visibility Δ & Traffic Δ" : (r.deltaPct === "NEW" ? "New subdomain in this period" : "Change vs previous period")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer">{fmtInt(r.keywords)}</span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Total keywords in Top 100.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-pointer">
                              <VisibilityBar value={r.top10Pct} locked={lockedVis} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {lockedVis ? "Upgrade to view visibility %" : `Top 10 keyword share for ${r.subdomain}`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="underline decoration-transparent hover:decoration-inherit text-left cursor-pointer"
                              style={{ color: TK.brand }}
                              title={r.topPage}
                              onClick={() => isFree
                                ? gate(()=>{})
                                : (onOpenTopPage ? onOpenTopPage(r.topPage) : alert(`Open Organic Page Drawer for: ${r.topPage}`))}
                            >
                              {topLabel}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {isFree ? "Pro only • Page drilldown" : "Open page drawer"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="text-right">
                      {lockedBL ? (
                        <span className="inline-flex items-center gap-1 text-gray-500 text-xs"><Lock className="h-3.5 w-3.5" /> Pro</span>
                      ) : (
                        fmtInt(r.backlinks)
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Drill down"
                                onClick={() => isFree ? gate(()=>{}) : alert(`Analyze subdomain: ${r.subdomain}`)}
                              >
                                <ExternalLink className="h-4 w-4" style={{ color: TK.brand }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Drill down</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Create Task"
                                onClick={()=> alert(`Create task for ${r.subdomain}`)}
                              >
                                <ClipboardList className="h-4 w-4" style={{ color: TK.brand }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create Task</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Open link map"
                                onClick={()=> alert(`Open link/backlink map for ${r.subdomain}`)}
                              >
                                <LinkIcon className="h-4 w-4" style={{ color: TK.brand }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Quick SERP/Link view</TooltipContent>
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

        {/* Footer pagination */}
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
              <SelectContent align="end" className="z-[240]">
                {[10,25,50].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Legend / helper row (no emoji) */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TK.ok }} /> Visibility ≥ 60%</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TK.warn }} /> 30–59%</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TK.danger }} /> &lt; 30%</span>
        <span className="ml-2 inline-flex items-center gap-1"><Filter className="h-3.5 w-3.5" style={{ color: TK.brand }} /> Use “Gaining only” or Visibility min–max to refine.</span>
      </div>
    </section>
  );
}
