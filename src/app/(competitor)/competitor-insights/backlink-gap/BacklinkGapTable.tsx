import React, { useEffect, useMemo, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronDown, ChevronUp, ChevronsUpDown, Download, Filter, Info, Search,
  SlidersHorizontal, Eye, ClipboardList, Link as LinkIcon,
} from "lucide-react";
import DemoRefDomainDrawer from "./drawers/RefDomainDrawer";

/* ---------- Tokens (aligned with your reference) ---------- */
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  textStrong: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #1090D0)",   // brand blue
  success: "var(--wr-good, #10B981)",
  warning: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
  radius: "var(--wr-radius, 10px)",
};

/* ---------- Types ---------- */
type DomainType = "All" | "Blog" | "News" | "EDU / GOV" | "Forum" | "Directory" | "Other";
type LinkType = "Text" | "Image" | "Redirect" | "Frame";
type MatchType = "All Domains" | "Unique to One Competitor" | "Common Across Multiple Competitors";
type GroupBy = "domain" | "link";

type GapDomainRow = {
  id: string;
  domain: string;
  wrScore: number;               // 0..100
  dofollowRatio: number;         // 0..100
  competitors: string[];         // e.g., ["comp1","comp2"]
  anchors: string[];             // e.g., ["seo tools","rank tips"]
  domainType: Exclude<DomainType, "All">;
  linkTypes: LinkType[];         // aggregated
  opportunity: boolean;
  opportunityLevel?: "primary" | "secondary";
  backlinksCount: number;        // for tooltip
};

type GapLinkRow = {
  id: string;
  domain: string;
  competitor: string;
  sourceUrl: string;
  anchorText: string;
  linkType: LinkType;
  isDofollow: boolean;
  wrScore: number;               // carry-through to sort if needed
};

/* ---------- Mock Data (replace with live data) ---------- */
const DOMAIN_TYPES: Exclude<DomainType, "All">[] = ["Blog", "News", "EDU / GOV", "Forum", "Directory", "Other"];
const LINK_TYPES: LinkType[] = ["Text", "Image", "Redirect", "Frame"];

function rnd<T>(arr: readonly T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeDomainRows(n = 80): GapDomainRow[] {
  const compsPool = ["comp1","comp2","comp3","comp4"];
  const anchorsPool = ["seo tools", "rank tips", "guide", "ai seo", "keyword ideas", "best tools"];
  return Array.from({ length: n }, (_, i) => {
    const wr = Math.max(5, Math.min(98, Math.round(20 + Math.random() * 80)));
    const dof = Math.round(Math.random() * 100);
    const compCount = Math.random() > 0.6 ? 1 : (Math.random() > 0.5 ? 2 : 3);
    const competitors = Array.from(new Set(Array.from({ length: compCount }, () => rnd(compsPool))));
    const linkTypes = LINK_TYPES.filter(() => Math.random() > 0.55);
    const opportunity = Math.random() > 0.55;
    const level = opportunity ? (Math.random() > 0.7 ? "secondary" : "primary") : undefined;
    return {
      id: `d-${i+1}`,
      domain: `example${i+1}.com`,
      wrScore: wr,
      dofollowRatio: dof,
      competitors,
      anchors: Array.from({ length: Math.min(2, Math.ceil(Math.random()*3)) }, () => rnd(anchorsPool)),
      domainType: rnd(DOMAIN_TYPES),
      linkTypes: linkTypes.length ? linkTypes : ["Text"],
      opportunity,
      opportunityLevel: level,
      backlinksCount: Math.floor(Math.random() * 120) + 1,
    };
  });
}

function makeLinkRows(domains: GapDomainRow[], n = 160): GapLinkRow[] {
  const out: GapLinkRow[] = [];
  for (let i = 0; i < n; i++) {
    const d = rnd(domains);
    const comp = rnd(d.competitors);
    const lt = rnd(d.linkTypes);
    out.push({
      id: `l-${i+1}`,
      domain: d.domain,
      competitor: comp,
      sourceUrl: `https://${d.domain}/post/${i+1}`,
      anchorText: rnd(d.anchors),
      linkType: lt,
      isDofollow: Math.random() > 0.25,
      wrScore: d.wrScore,
    });
  }
  return out;
}

/* ---------- Small Helpers ---------- */
const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
        style={{ background: "#EEF6FF", color: "#2563EB", border: "1px solid #C7E2FF" }}>
    {children}
  </span>
);

const Badge = ({ text, color, title }: { text: string; color: string; title?: string }) => (
  <span title={title}
        className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
        style={{ background: `${color}14`, color, border: `1px solid ${color}33` }}>
    {text}
  </span>
);

/* ---------- WR Score Donut (brand blue) ---------- */
function WRDonut({ value }: { value: number }) {
  const size = 28;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r}
                stroke={TOKENS.brand} strokeWidth={stroke} fill="none"
                strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
                transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[10px] font-semibold"
           style={{ color: "#111827" }}>
        {value}
      </div>
    </div>
  );
}

/* ---------- Component ---------- */
export default function BacklinkGapTable() {
  /* data */
  const [groupBy, setGroupBy] = useState<GroupBy>("domain");
  const [domains] = useState<GapDomainRow[]>(() => makeDomainRows());
  const [links] = useState<GapLinkRow[]>(() => makeLinkRows(domains));

  /* filters */
  const [search, setSearch] = useState("");
  const [domainType, setDomainType] = useState<DomainType>("All");
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([]);
  const [wrRange, setWrRange] = useState<[number, number]>([30, 90]); // default
  const [matchType, setMatchType] = useState<MatchType>("All Domains");
  const [dofollowOnly, setDofollowOnly] = useState(false);
  const [opportunitiesOnly, setOpportunitiesOnly] = useState(false);

  /* sorting */
  const [sortBy, setSortBy] = useState<string>("wrScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  useEffect(() => {
    setSortBy(groupBy === "domain" ? "wrScore" : "domain");
    setSortDir("desc");
  }, [groupBy]);

  const toggleSort = (key: string) => {
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else { setSortDir(d => d === "asc" ? "desc" : "asc"); }
  };

  const clearAll = () => {
    setSearch("");
    setDomainType("All");
    setLinkTypes([]);
    setWrRange([30, 90]);
    setMatchType("All Domains");
    setDofollowOnly(false);
    setOpportunitiesOnly(false);
  };

  /* filtering */
  const filteredDomains = useMemo(() => {
    return domains.filter(d => {
      if (search && !d.domain.toLowerCase().includes(search.toLowerCase())) return false;
      if (domainType !== "All" && d.domainType !== domainType) return false;
      if (linkTypes.length && !linkTypes.some(lt => d.linkTypes.includes(lt))) return false;
      if (!(d.wrScore >= wrRange[0] && d.wrScore <= wrRange[1])) return false;
      if (matchType === "Unique to One Competitor" && d.competitors.length !== 1) return false;
      if (matchType === "Common Across Multiple Competitors" && d.competitors.length < 2) return false;
      if (dofollowOnly && d.dofollowRatio <= 0) return false;
      if (opportunitiesOnly && !d.opportunity) return false;
      return true;
    });
  }, [domains, search, domainType, linkTypes, wrRange, matchType, dofollowOnly, opportunitiesOnly]);

  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      if (search && !l.domain.toLowerCase().includes(search.toLowerCase())) return false;
      // keep All Links view honoring header filters
      if (domainType !== "All") {
        const d = domains.find(x => x.domain === l.domain);
        if (!d || d.domainType !== domainType) return false;
      }
      if (linkTypes.length && !linkTypes.includes(l.linkType)) return false;
      if (!(l.wrScore >= wrRange[0] && l.wrScore <= wrRange[1])) return false;
      if (matchType === "Unique to One Competitor") {
        const compCount = domains.find(x => x.domain === l.domain)?.competitors.length ?? 0;
        if (compCount !== 1) return false;
      }
      if (matchType === "Common Across Multiple Competitors") {
        const compCount = domains.find(x => x.domain === l.domain)?.competitors.length ?? 0;
        if (compCount < 2) return false;
      }
      if (dofollowOnly && !l.isDofollow) return false;
      if (opportunitiesOnly) {
        const d = domains.find(x => x.domain === l.domain);
        if (!d?.opportunity) return false;
      }
      return true;
    });
  }, [links, domains, search, domainType, linkTypes, wrRange, matchType, dofollowOnly, opportunitiesOnly]);

  /* sorting */
  function sortArray<T extends Record<string, any>>(arr: T[]) {
    const copy = [...arr];
    copy.sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return copy;
  }

  const rows = (groupBy === "domain")
    ? sortArray(filteredDomains as any)
    : sortArray(filteredLinks as any);

  /* filter chips (summary) */
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (search) chips.push({ key: "q", label: `Domain: ${search}`, clear: () => setSearch("") });
  if (domainType !== "All") chips.push({ key: "dt", label: `Type: ${domainType}`, clear: () => setDomainType("All") });
  if (linkTypes.length) chips.push({ key: "lt", label: `Link: ${linkTypes.join(", ")}`, clear: () => setLinkTypes([]) });
  if (wrRange[0] !== 30 || wrRange[1] !== 90) chips.push({ key: "wr", label: `WR ${wrRange[0]}–${wrRange[1]}`, clear: () => setWrRange([30, 90]) });
  if (matchType !== "All Domains") chips.push({ key: "mt", label: `Match: ${matchType}`, clear: () => setMatchType("All Domains") });
  if (dofollowOnly) chips.push({ key: "df", label: "Dofollow Only", clear: () => setDofollowOnly(false) });
  if (opportunitiesOnly) chips.push({ key: "op", label: "Opportunities Only", clear: () => setOpportunitiesOnly(false) });

  /* Column helpers */
  const dofollowColor = (v: number) => (v >= 80 ? TOKENS.success : v >= 40 ? TOKENS.warning : "#9CA3AF");
// ✅ Ensure rows is typed correctly before render
const domainRows = rows as GapDomainRow[];
const linkRows = rows as GapLinkRow[];

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
          <aside className="absolute right-0 top-0 h-full w-[64vw] overflow-auto bg-white p-4 shadow-xl">
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


  /* UI */
  return (
    <section className="space-y-3 py-2 mt-4">
                              {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <DemoRefDomainDrawer   />
                    </Drawer>
                  )}
      <Card className="border w-full" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        {/* ---------- Header: Title + Filters Bar (inside header) ---------- */}
        <CardHeader className="space-y-3">
          {/* Title row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Backlink Gap → Referring Domains</CardTitle>
              {/* Group By segmented control lives in header (as requested) */}
              <div className="inline-flex items-center rounded border px-1 py-1"
                   style={{ borderColor: TOKENS.borderLight, background: "#fff" }}>
                <Button size="sm" variant={groupBy === "domain" ? "default" : "outline"}
                        onClick={() => setGroupBy("domain")} className="h-8 px-3">
                  Ref. Domain
                </Button>
                <Button size="sm" variant={groupBy === "link" ? "default" : "outline"}
                        onClick={() => setGroupBy("link")} className="h-8 px-3">
                  All Links
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Columns (simple placeholder; wire to your column control if needed) */}
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Columns
              </Button>
              {/* Export */}
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
          </div>

          {/* Filters Bar (3×2 grid) */}
          <div className="rounded-md border p-3 bg-white"
               style={{ borderColor: TOKENS.borderLight }}>
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Narrow backlink gap results by domain type, link type, WR score, competitor overlap, and more.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="ml-auto">
                <Button variant="outline" size="sm" onClick={clearAll}>Reset</Button>
              </div>
            </div>

            {/* Grid rows */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Row 1 */}
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                       placeholder="Search domain… e.g., techblog.com"
                       className="h-9" aria-label="Search Domain" />
              </div>

              <Select value={domainType} onValueChange={(v) => setDomainType(v as DomainType)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Referring Domain Type" />
                </SelectTrigger>
                <SelectContent>
                  {(["All","Blog","News","EDU / GOV","Forum","Directory","Other"] as const).map(opt =>
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Link Type multi-select (Popover with checkboxes) */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-9 px-3 rounded border text-sm inline-flex items-center justify-between gap-2 bg-white hover:bg-[#F7FAFC]">
                    <span className="text-left">Link Type {linkTypes.length ? `(${linkTypes.length})` : "(All)"}</span>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px]" align="start">
                  <div className="space-y-2">
                    {LINK_TYPES.map(lt => {
                      const on = linkTypes.includes(lt);
                      return (
                        <label key={lt} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={on} onCheckedChange={(v) => {
                            setLinkTypes(s => on ? s.filter(x => x !== lt) : [...s, lt]);
                          }} />
                          <span>{lt}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => setLinkTypes([])}>Reset</Button>
                    <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Row 2 */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-9 px-3 rounded border text-sm inline-flex items-center justify-between gap-2 bg-white hover:bg-[#F7FAFC]">
                    <span className="text-left">WR Score {`${wrRange[0]}–${wrRange[1]}`}</span>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px]" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Score range</span>
                      <span className="text-muted-foreground">{wrRange[0]} – {wrRange[1]}</span>
                    </div>
                    <Slider value={[wrRange[0], wrRange[1]]} min={0} max={100} step={1}
                            onValueChange={(v) => setWrRange(v as [number, number])} />
                    <div className="flex gap-2">
                      <Input type="number" className="w-20" min={0} max={100}
                             value={wrRange[0]} onChange={(e) => {
                               const v = Math.max(0, Math.min(Number(e.target.value)||0, wrRange[1]));
                               setWrRange([v, wrRange[1]]);
                             }} />
                      <Input type="number" className="w-20" min={0} max={100}
                             value={wrRange[1]} onChange={(e) => {
                               const v = Math.max(wrRange[0], Math.min(Number(e.target.value)||0, 100));
                               setWrRange([wrRange[0], v]);
                             }} />
                      <div className="ml-auto flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setWrRange([30, 90])}>Reset</Button>
                        <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={matchType} onValueChange={(v) => setMatchType(v as MatchType)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Match Type" />
                </SelectTrigger>
                <SelectContent>
                  {(["All Domains","Unique to One Competitor","Common Across Multiple Competitors"] as const).map(m =>
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  )}
                </SelectContent>
              </Select>

              <label className="h-9 inline-flex items-center gap-2 text-sm cursor-pointer select-none rounded border px-3 bg-white"
                     style={{ borderColor: TOKENS.borderLight }}>
                <Checkbox checked={dofollowOnly} onCheckedChange={(v) => setDofollowOnly(Boolean(v))} />
                <span>Dofollow Only</span>
              </label>
            </div>

            {/* Row C: Group By + Opportunities Only (inline under grid) */}
            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span>Group By:</span>
                <div className="inline-flex items-center rounded border px-1 py-1"
                     style={{ borderColor: TOKENS.borderLight, background: "#fff" }}>
                  <Button size="sm" variant={groupBy === "domain" ? "default" : "outline"}
                          onClick={() => setGroupBy("domain")} className="h-8 px-3">
                    Ref. Domain
                  </Button>
                  <Button size="sm" variant={groupBy === "link" ? "default" : "outline"}
                          onClick={() => setGroupBy("link")} className="h-8 px-3">
                    All Links
                  </Button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox checked={opportunitiesOnly} onCheckedChange={(v) => setOpportunitiesOnly(Boolean(v))} />
                <span>Show Only Link Opportunities</span>
              </label>
            </div>

            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {chips.map(c => (
                  <button key={c.key} onClick={c.clear}
                          className="h-7 px-2 rounded-full border text-xs inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                    <span>{c.label}</span>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-600">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        {/* ---------- Table ---------- */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-40 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                <TableRow>
                  {groupBy === "domain" ? (
                    <>
                      {/* Domain (sortable) */}
                      <TableHead style={{ minWidth: 260 }}>
                        <button className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => toggleSort("domain")}>
                          <span>Referring Domain</span>
                          {sortBy === "domain" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground"/>}
                        </button>
                      </TableHead>
                      <TableHead style={{ minWidth: 220 }}>Linked To</TableHead>
                      <TableHead style={{ minWidth: 120 }}>
                        <button className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => toggleSort("wrScore")}>
                          <span>WR Score</span>
                          {sortBy === "wrScore" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground"/>}
                        </button>
                      </TableHead>
                      <TableHead style={{ minWidth: 140 }}>
                        <button className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => toggleSort("dofollowRatio")}>
                          <span>Dofollow Ratio</span>
                          {sortBy === "dofollowRatio" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground"/>}
                        </button>
                      </TableHead>
                      <TableHead style={{ minWidth: 220 }}>Anchor Samples</TableHead>
                      <TableHead style={{ minWidth: 240 }}>
                        <button className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => toggleSort("opportunity")}>
                          <span>Opportunity</span>
                          {sortBy === "opportunity" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground"/>}
                        </button>
                      </TableHead>
                      <TableHead style={{ minWidth: 180 }}>Actions</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead style={{ minWidth: 260 }}>
                        <button className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => toggleSort("domain")}>
                          <span>Domain</span>
                          {sortBy === "domain" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground"/>}
                        </button>
                      </TableHead>
                      <TableHead style={{ minWidth: 280 }}>Source URL</TableHead>
                      <TableHead style={{ minWidth: 140 }}>Competitor</TableHead>
                      <TableHead style={{ minWidth: 200 }}>Anchor</TableHead>
                      <TableHead style={{ minWidth: 120 }}>Link Type</TableHead>
                      <TableHead style={{ minWidth: 120 }}>Dofollow</TableHead>
                      <TableHead style={{ minWidth: 120 }}>
                        <button className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={() => toggleSort("wrScore")}>
                          <span>WR</span>
                          {sortBy === "wrScore" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground"/>}
                        </button>
                      </TableHead>
                      <TableHead style={{ minWidth: 160 }}>Actions</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>



<TableBody>
  {groupBy === "domain"
    ? domainRows.map((d) => (
        <TableRow key={d.id} className="hover:bg-[#F5F7FA]">
          <TableCell>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded bg-gray-200" aria-hidden />
              <span className="font-medium underline" style={{ color: TOKENS.brand }} onClick={openDrawer}>
                {d.domain}
              </span>
            </div>
          </TableCell>

          <TableCell>
            <div className="flex flex-wrap gap-1">
              {d.competitors.slice(0, 3).map((c) => (
                <Pill key={c}>{c}</Pill>
              ))}
              {d.competitors.length > 3 && <Pill>+{d.competitors.length - 3}</Pill>}
            </div>
          </TableCell>

          <TableCell>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-2">
                    <WRDonut value={d.wrScore} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">Domain authority score (WR)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>

          <TableCell>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    text={`${d.dofollowRatio}%`}
                    color={dofollowColor(d.dofollowRatio)}
                    title="% of backlinks from this domain that are dofollow"
                  />
                </TooltipTrigger>
                <TooltipContent side="top">% of backlinks that are dofollow</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>

          <TableCell title={d.anchors.join(", ")}>
            {d.anchors.length ? (
              <div className="flex flex-wrap gap-1">
                {d.anchors.slice(0, 2).map((a) => (
                  <Badge key={a} text={`“${a}”`} color={TOKENS.brand} />
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>

          <TableCell>
            {d.opportunity ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  style={{ backgroundColor: TOKENS.brand, color: "#fff" }}
                  title="Create link on this domain via our verified network"
                >
                  <LinkIcon className="h-4 w-4 mr-1" /> Create Link
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `/backlinks/opportunities?source=competitor-gap&domain=${d.domain}`,
                      "_blank"
                    )
                  }
                  title="Open Opportunities tab with preloaded drawer"
                >
                  View All Opportunities
                </Button>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>

          <TableCell>
            <div className="inline-flex items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="h-4 w-4" /> Analyze
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Open Backlink Details Drawer</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button size="sm" variant="outline" className="gap-1">
                <ClipboardList className="h-4 w-4" /> Add to Task
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))
    : linkRows.map((l) => (
        <TableRow key={l.id} className="hover:bg-[#F5F7FA]">
          <TableCell className="font-medium">{l.domain}</TableCell>
          <TableCell>
            <a
              className="underline"
              style={{ color: TOKENS.brand }}
              href={l.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {l.sourceUrl}
            </a>
          </TableCell>
          <TableCell>
            <Pill>{l.competitor}</Pill>
          </TableCell>
          <TableCell className="max-w-[260px] truncate" title={l.anchorText}>
            {l.anchorText}
          </TableCell>
          <TableCell>{l.linkType}</TableCell>
          <TableCell>
            {l.isDofollow ? (
              <Badge text="dofollow" color={TOKENS.success} />
            ) : (
              <Badge text="nofollow" color="#9CA3AF" />
            )}
          </TableCell>
          <TableCell>
            <WRDonut value={l.wrScore} />
          </TableCell>
          <TableCell>
            <div className="inline-flex items-center gap-1.5">
              <Button size="sm" variant="outline" className="gap-1">
                <Eye className="h-4 w-4" /> Analyze
              </Button>
              <Button size="sm" variant="outline" className="gap-1">
                <ClipboardList className="h-4 w-4" /> Add to Task
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
</TableBody>

            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}