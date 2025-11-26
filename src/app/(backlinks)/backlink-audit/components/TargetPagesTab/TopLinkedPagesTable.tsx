"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronsUpDown, ChevronDown, ChevronUp, Download, Filter, FlagTriangleRight, Info,
  RefreshCw, Search as SearchIcon, Settings2, ClipboardList, Search, Link2
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Global tokens (aligned with recent designs) + Inter, Inter Fallback
────────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
    :root{
      --wr-brand:#008CCD;
      --wr-brand-hover:#067AAF;
      --wr-brand-pastel:#D9EEF8;
      --wr-text:#111827;
      --wr-muted:#6B7280;
      --wr-surface:#FFFFFF;
      --wr-subtle:#F5F7FA;
      --wr-border:#E5E7EB;
      --wr-borderLight:#EFF0F6;
      --wr-success:#28C76F;
      --wr-warning:#FF9F43;
      --wr-danger:#EA5455;
      --wr-radius:12px;
    }
    .wr-font{
      font-family: Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;
    }
  `}</style>
);

/* ---------- Tokens aligned to Backlink Audit / Global UI ---------- */
const TOKENS = {
  border: "var(--wr-border)",
  borderLight: "var(--wr-borderLight)",
  textStrong: "var(--wr-text)",
  muted: "var(--wr-muted)",
  brand: "var(--wr-brand)",                  // global primary
  success: "var(--wr-success)",
  warning: "var(--wr-warning)",
  critical: "var(--wr-danger)",
  appBg: "var(--wr-subtle)",
  pastelBrand: "var(--wr-brand-pastel)",
  radius: "var(--wr-radius)",
};

/* ---------- Types ---------- */
type ListMode = "All" | "Whitelist" | "For Review";
type AnchorRisk = "High" | "Medium" | "Low";
type LinkAttribute = "dofollow" | "nofollow" | "sponsored" | "ugc";

export type PageRow = {
  id: string;
  title: string;              // "SEO Guide"
  path: string;               // "/seo-guide"
  totalBacklinks: number;     // 324
  toxicBacklinks: number;     // 42
  anchorDiversity: number;    // 0..100
  lastLinkFound: string;      // ISO date "2025-08-03"
  linkAttributes: LinkAttribute[]; // aggregated seen on backlinks to this page
  anchorRisk: AnchorRisk;     // High/Medium/Low (over‑optimization risk)
  ga4TotalReferral?: number | null;  // total referral traffic sessions
  ga4RiskReferral?: number | null;   // risky domains sessions
  whitelisted?: boolean;
  forReview?: boolean;
};

/* ---------- Utilities / UI Parts ---------- */
const Badge = ({ children, color, gradient }: { children: React.ReactNode; color: string; gradient?: boolean }) => {
  const style = gradient
    ? { background: `linear-gradient(90deg, ${color}1A 0%, #FFFFFF 100%)`, color, border: `1px solid ${color}26` }
    : { background: `${color}14`, color, border: `1px solid ${color}26` };
  return (
    <span className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium" style={style}>
      {children}
    </span>
  );
};

const DiversityCircle = ({ value }: { value: number }) => {
  const color =
    value >= 70 ? TOKENS.success : value >= 40 ? TOKENS.warning : TOKENS.critical;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
      style={{ border: `2px solid ${color}`, color }}
      title="Anchor Diversity Score (0–100)"
    >
      {value}
    </div>
  );
};

const formatNumber = (n?: number | null) => {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString();
};

const toxColor = (pct: number) =>
  pct >= 50 ? TOKENS.critical : pct >= 30 ? TOKENS.warning : TOKENS.success;

/* ---------- Mock data (replace with live wiring) ---------- */
const ATTRS: LinkAttribute[] = ["dofollow", "nofollow", "sponsored", "ugc"];

function makePages(count = 80): PageRow[] {
  return Array.from({ length: count }, (_, i) => {
    const total = Math.floor(Math.random() * 800) + 20;
    const toxic = Math.floor(total * (Math.random() * 0.75));
    const anchorDiversity = Math.floor(Math.random() * 100);
    const title = i % 6 === 0 ? "SEO Guide" : i % 6 === 1 ? "Backlink Audit" : i % 6 === 2 ? "Technical SEO" : i % 6 === 3 ? "Keyword Research" : i % 6 === 4 ? "On‑Page SEO" : "Link Building";
    const path = `/${title.toLowerCase().replace(/[^a-z]+/g, "-")}${i % 4 === 0 ? "" : "-" + ((i % 12) + 1)}`;
    const attrs = ATTRS.filter(() => Math.random() > 0.6);
    const risk: AnchorRisk = Math.random() > 0.76 ? "High" : Math.random() > 0.5 ? "Medium" : "Low";
    return {
      id: `p-${i + 1}`,
      title,
      path,
      totalBacklinks: total,
      toxicBacklinks: Math.min(toxic, total),
      anchorDiversity,
      lastLinkFound: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
      linkAttributes: attrs.length ? attrs : ["nofollow"],
      anchorRisk: risk,
      ga4TotalReferral: Math.random() > 0.15 ? Math.floor(Math.random() * 6000) : 0,
      ga4RiskReferral: Math.random() > 0.25 ? Math.floor(Math.random() * 1200) : 0,
      whitelisted: Math.random() > 0.85,
      forReview: Math.random() > 0.85,
    };
  });
}

/* ---------- Props & Columns ---------- */
type Props = {
  rows?: PageRow[];
  ga4Connected?: boolean;
  onFilterToPage?: (row: PageRow) => void;
  onGoToBacklinks?: (row: PageRow) => void;
  onOpenAnalyzer?: (row: PageRow) => void;
  onCreateTask?: (row: PageRow) => void;
  onToggleViewChange?: (mode: ListMode) => void;
};

type ColumnKey =
  | "page"
  | "totalBacklinks"
  | "toxicBacklinks"
  | "toxPct"
  | "ga4Total"
  | "ga4Risky"
  | "anchorDiversity"
  | "lastFound"
  | "actions";

type ColumnDef = {
  key: ColumnKey;
  label: string;
  width?: number;
  sortable?: boolean;
};

const COLUMNS: ColumnDef[] = [
  { key: "page", label: "Page URL / Title", width: 360, sortable: true },
  { key: "totalBacklinks", label: "Total Backlinks", width: 160, sortable: true },
  { key: "toxicBacklinks", label: "Toxic Backlinks", width: 160, sortable: true },
  { key: "toxPct", label: "Toxicity %", width: 140, sortable: true },
  { key: "ga4Total", label: "Total Referral Traffic (GA4)", width: 240, sortable: true },
  { key: "ga4Risky", label: "Referral Traffic from Risky Domains (GA4)", width: 300, sortable: true },
  { key: "anchorDiversity", label: "Anchor Diversity Score", width: 220, sortable: true },
  { key: "lastFound", label: "Last Link Found", width: 160, sortable: true },
  { key: "actions", label: "Actions", width: 160 },
];

const SELECT_COL_WIDTH = 44; // selection checkbox column

export default function TopLinkedPagesTable({
  rows,
  ga4Connected = true, // DEMO: start connected
  onFilterToPage,
  onGoToBacklinks,
  onOpenAnalyzer,
  onCreateTask,
  onToggleViewChange,
}: Props) {
  /* Data */
  const [data, setData] = useState<PageRow[]>(() => rows ?? makePages());

  /* Filters bar state */
  const [listMode, setListMode] = useState<ListMode>("All");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [anchorRisk, setAnchorRisk] = useState<AnchorRisk | "All">("All");
  const [attrsFilter, setAttrsFilter] = useState<LinkAttribute[]>([]);
  const [toxRange, setToxRange] = useState<[number, number]>([0, 100]);      // committed
  const [toxDraft, setToxDraft] = useState<[number, number]>([0, 100]);      // in-popover
  const [traRange, setTraRange] = useState<[number, number]>([0, 6000]);
  const [traDraft, setTraDraft] = useState<[number, number]>([0, 6000]);
  const [minToxicCount, setMinToxicCount] = useState<number>(0);

  /* GA4 connect (demo) */
  const [ga4ConnectedState, setGa4ConnectedState] = useState<boolean>(ga4Connected);
  const connectGA4 = () => setGa4ConnectedState(true);
  const disconnectGA4 = () => setGa4ConnectedState(false);

  /* Column visibility control */
  const defaultVisible = useMemo<Set<ColumnKey>>(
    () => new Set(COLUMNS.map(c => c.key)), []
  );
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(defaultVisible);
  const toggleColumn = (key: ColumnKey) => {
    if (key === "page") return; // keep required
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const resetColumns = () => setVisibleCols(new Set(defaultVisible));
  const visibleColumns = useMemo(() => COLUMNS.filter(c => visibleCols.has(c.key)), [visibleCols]);

  /* Debounce search (~300ms) */
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* Sorting */
  const [sortBy, setSortBy] = useState<ColumnKey>("toxPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColumnKey) => {
    if (key === "actions") return;
    if (sortBy !== key) { setSortBy(key); setSortDir(key === "toxPct" ? "desc" : "asc"); }
    else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  /* Clear filters */
  const clearAll = () => {
    setListMode("All");
    setSearchInput("");
    setQuery("");
    setAnchorRisk("All");
    setAttrsFilter([]);
    setToxRange([0, 100]);
    setToxDraft([0, 100]);
    setTraRange([0, 6000]);
    setTraDraft([0, 6000]);
    setMinToxicCount(0);
  };

  /* Filtering */
  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (listMode === "Whitelist" && !r.whitelisted) return false;
      if (listMode === "For Review" && !r.forReview) return false;

      if (query) {
        const hay = (r.title + " " + r.path).toLowerCase();
        if (!hay.includes(query)) return false;
      }
      const toxPct = r.totalBacklinks ? (r.toxicBacklinks / r.totalBacklinks) * 100 : 0;
      if (toxPct < toxRange[0] || toxPct > toxRange[1]) return false;
      if (minToxicCount > 0 && r.toxicBacklinks < minToxicCount) return false;

      if (anchorRisk !== "All" && r.anchorRisk !== anchorRisk) return false;
      if (attrsFilter.length && !attrsFilter.some((a) => r.linkAttributes.includes(a))) return false;

      if (ga4ConnectedState) {
        const t = r.ga4TotalReferral ?? 0;
        if (t < traRange[0] || t > traRange[1]) return false;
      }
      return true;
    });
  }, [data, listMode, query, toxRange, minToxicCount, anchorRisk, attrsFilter, ga4ConnectedState, traRange]);

  /* Sorting pipeline */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const toxA = a.totalBacklinks ? a.toxicBacklinks / a.totalBacklinks : 0;
      const toxB = b.totalBacklinks ? b.toxicBacklinks / b.totalBacklinks : 0;

      const val = (r: PageRow, k: ColumnKey) => {
        switch (k) {
          case "page": return (r.title + r.path).toLowerCase();
          case "totalBacklinks": return r.totalBacklinks;
          case "toxicBacklinks": return r.toxicBacklinks;
          case "toxPct": return toxA * 100;
          case "ga4Total": return r.ga4TotalReferral ?? -1;
          case "ga4Risky": return r.ga4RiskReferral ?? -1;
          case "anchorDiversity": return r.anchorDiversity;
          case "lastFound": return new Date(r.lastLinkFound).getTime();
          default: return 0;
        }
      };

      const av = sortBy === "toxPct" ? toxA * 100 : val(a, sortBy);
      const bv = sortBy === "toxPct" ? toxB * 100 : val(b, sortBy);

      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Active filter chips */
  const hasGA4Range = ga4ConnectedState && (traRange[0] > 0 || traRange[1] < 6000);
  const hasToxRange = toxRange[0] > 0 || toxRange[1] < 100;
  const hasAttrs = attrsFilter.length > 0;
  const chips = [
    listMode !== "All" ? { k: "list", label: `List: ${listMode}`, clear: () => setListMode("All") } : null,
    anchorRisk !== "All" ? { k: "risk", label: `Anchor Risk: ${anchorRisk}`, clear: () => setAnchorRisk("All") } : null,
    hasAttrs ? { k: "attrs", label: `Attr: ${attrsFilter.join(", ")}`, clear: () => setAttrsFilter([]) } : null,
    hasToxRange ? { k: "tox", label: `Toxicity ${toxRange[0]}–${toxRange[1]}%`, clear: () => setToxRange([0, 100]) } : null,
    minToxicCount > 0 ? { k: "minTox", label: `Toxic ≥ ${minToxicCount}`, clear: () => setMinToxicCount(0) } : null,
    hasGA4Range ? { k: "tra", label: `GA4 Sessions ${traRange[0]}–${traRange[1]}`, clear: () => setTraRange([0, 6000]) } : null,
  ].filter(Boolean) as { k: string; label: string; clear: () => void }[];

  /* Export (all/selected) */
  const buildCSV = (rowsToExport: PageRow[]) => {
    const header = ["title","path","totalBacklinks","toxicBacklinks","toxicityPct","ga4Total","ga4Risky","anchorDiversity","anchorRisk","lastLinkFound","linkAttributes"];
    const lines = rowsToExport.map(r => ([
      r.title, r.path, r.totalBacklinks, r.toxicBacklinks,
      (r.totalBacklinks ? Math.round((r.toxicBacklinks / r.totalBacklinks) * 100) : 0),
      r.ga4TotalReferral ?? "", r.ga4RiskReferral ?? "",
      r.anchorDiversity, r.anchorRisk, r.lastLinkFound, r.linkAttributes.join("|")
    ].map(v => JSON.stringify(String(v))).join(",")));
    return header.join(",") + "\n" + lines.join("\n");
  };

  const exportCSV = (rowsToExport: PageRow[] = sorted) => {
    const csv = buildCSV(rowsToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-linked-pages.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Sticky first column helper (selection + page) */
  const stickyLeft = (key: ColumnKey | "select") => {
    if (key === "select") {
      return { position: "sticky" as const, left: 0, zIndex: 40, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" };
    }
    if (key === "page") {
      return { position: "sticky" as const, left: SELECT_COL_WIDTH, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" };
    }
    return {};
  };

  /* Row selection state */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const allVisibleSelected = sorted.length > 0 && sorted.every(r => selectedIds.has(r.id));
  const someSelected = sorted.some(r => selectedIds.has(r.id));
  const toggleSelectAllVisible = (checked: boolean | "indeterminate") => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked === true) sorted.forEach(r => next.add(r.id));
      else if (checked === false) sorted.forEach(r => next.delete(r.id));
      return next;
    });
  };

  return (
    <section className="space-y-3 wr-font">
      <GlobalTokens />

      <Card className="border mx-4" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2">
              <Link2 className="h-5 w-5" color="#008CCD" aria-hidden />
              <CardTitle className="text-lg">Backlink Audit → Top Linked Pages</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">Sorted by Toxicity % (High → Low)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Columns control button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="cursor-pointer">
                  <Settings2 className="h-4 w-4 mr-1" color="#008CCD" /> Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px]" align="end">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2">
                  {COLUMNS.map(c => (
                    <label key={c.key} className={`flex items-center gap-2 ${c.key === "page" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
                      <Checkbox
                        checked={visibleCols.has(c.key)}
                        onCheckedChange={() => toggleColumn(c.key)}
                        disabled={c.key === "page"}
                      />
                      <span className="text-sm">{c.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={resetColumns}>Reset</Button>
                  <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setData(makePages())}>
              <RefreshCw className="h-4 w-4 mr-1" color="#008CCD" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => exportCSV()}>
              <Download className="h-4 w-4 mr-1" color="#008CCD" /> Export
            </Button>
          </div>
        </CardHeader>

        {/* Filters Bar */}
        <CardContent className="pt-4" style={{ borderTop: `1px solid ${TOKENS.borderLight}` }}>
          <div className="rounded-lg" style={{ background: TOKENS.appBg }}>
            <div className="px-4 py-3 flex flex-wrap items-center gap-2">
              {/* Label */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" color="#008CCD" /> Filters
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Filter by toxicity %, link attributes, anchor risk, GA4 referral traffic, and list mode.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Reset */}
              <Button variant="link" size="sm" className="text-sm cursor-pointer" onClick={clearAll}>
                Reset Filters
              </Button>

              {/* Search */}
              <div className="relative">
                <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by page title or URL…"
                  className="w-[260px] pl-7"
                />
              </div>

              {/* List Toggle */}
              <div className="inline-flex items-center rounded border overflow-hidden" style={{ borderColor: TOKENS.borderLight, background: "#fff" }}>
                {(["All","Whitelist","For Review"] as const).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={listMode === m ? "default" : "outline"}
                    className="h-8 px-3 cursor-pointer"
                    onClick={() => { setListMode(m); onToggleViewChange?.(m); }}
                  >
                    {m}
                  </Button>
                ))}
              </div>

              {/* Anchor Risk */}
              <Select value={anchorRisk} onValueChange={(v) => setAnchorRisk(v as any)}>
                <SelectTrigger className="w-[170px] h-8 cursor-pointer">
                  <SelectValue placeholder="Anchor Risk" />
                </SelectTrigger>
                <SelectContent>
                  {(["All","High","Medium","Low"] as const).map(opt => (
                    <SelectItem key={opt} value={opt}>{`Anchor Risk — ${opt}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Link Attributes (multi) */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                    <Settings2 className="h-4 w-4" color="#008CCD" /> Link Attribute {attrsFilter.length ? `(${attrsFilter.length})` : "(All)"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px]" align="start">
                  <div className="grid grid-cols-2 gap-2">
                    {ATTRS.map((a) => {
                      const on = attrsFilter.includes(a);
                      return (
                        <button
                          key={a}
                          className={`h-8 px-3 rounded border text-sm text-left cursor-pointer ${on ? "bg-[var(--wr-subtle)] border-[var(--wr-border)]" : ""}`}
                          onClick={() => setAttrsFilter((s) => on ? s.filter(x => x !== a) : [...s, a])}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setAttrsFilter([])}>Reset</Button>
                    <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Toxicity Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                    <FlagTriangleRight className="h-4 w-4" color="#008CCD" /> Toxicity {toxRange[0]}–{toxRange[1]}%
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px]" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Backlink toxicity %</span>
                      <span className="text-muted-foreground">{toxDraft[0]} – {toxDraft[1]}%</span>
                    </div>
                    <Slider
                      value={[toxDraft[0], toxDraft[1]]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(v) => setToxDraft(v as [number, number])}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={toxDraft[1]}
                        value={toxDraft[0]}
                        onChange={(e) => setToxDraft([Math.max(0, Math.min(Number(e.target.value) || 0, toxDraft[1])), toxDraft[1]])}
                        className="w-24"
                      />
                      <Input
                        type="number"
                        min={toxDraft[0]}
                        max={100}
                        value={toxDraft[1]}
                        onChange={(e) => setToxDraft([toxDraft[0], Math.max(toxDraft[0], Math.min(Number(e.target.value) || 0, 100))])}
                        className="w-24"
                      />
                      <div className="ml-auto flex gap-2">
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setToxDraft([0,100]); setToxRange([0,100]); }}>Reset</Button>
                        <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={() => setToxRange(toxDraft)}>Apply</Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Traffic Range (GA4) */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer">
                    <Settings2 className="h-4 w-4" color="#008CCD" /> {ga4ConnectedState ? `GA4 Traffic ${traRange[0]}–${traRange[1]}` : "Connect GA4"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px]" align="start">
                  {ga4ConnectedState ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Total referral sessions</span>
                        <span className="text-muted-foreground">{traDraft[0]} – {traDraft[1]}</span>
                      </div>
                      <Slider
                        value={[traDraft[0], traDraft[1]]}
                        min={0}
                        max={6000}
                        step={20}
                        onValueChange={(v) => setTraDraft(v as [number, number])}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={traDraft[1]}
                          value={traDraft[0]}
                          onChange={(e) => setTraDraft([Math.max(0, Math.min(Number(e.target.value) || 0, traDraft[1])), traDraft[1]])}
                          className="w-24"
                        />
                        <Input
                          type="number"
                          min={traDraft[0]}
                          max={6000}
                          value={traDraft[1]}
                          onChange={(e) => setTraDraft([traDraft[0], Math.max(traDraft[0], Math.min(Number(e.target.value) || 0, 6000))])}
                          className="w-24"
                        />
                        <div className="ml-auto flex gap-2">
                          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setTraDraft([0,6000]); setTraRange([0,6000]); }}>Reset</Button>
                          <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={() => setTraRange(traDraft)}>Apply</Button>
                        </div>
                      </div>
                      <div className="pt-1">
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={disconnectGA4}>Disconnect GA4</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <div className="mb-2">Connect GA4 to filter by referral traffic.</div>
                      <Button size="sm" variant="outline" className="cursor-pointer" onClick={connectGA4}>Connect GA4</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Active chips */}
            {chips.length > 0 && (
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <button
                      key={c.k}
                      className="h-7 px-2 rounded-full border text-xs inline-flex items-center gap-2 bg-white hover:bg-[var(--wr-subtle)] cursor-pointer"
                      onClick={c.clear}
                    >
                      <span>{c.label}</span>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-600">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* Bulk Selection Bar — background matches Filters bar (TOKENS.appBg) */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-2 sticky top-0 z-40 border-y" style={{ background: TOKENS.appBg, borderColor: TOKENS.borderLight }}>
            <div className="flex items-center gap-3">
              <span className="text-sm"><strong>{selectedIds.size}</strong> selected</span>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => exportCSV(sorted.filter(r => selectedIds.has(r.id)))}
              >
                <Download className="h-4 w-4 mr-1" color="#008CCD" /> Export Selected
              </Button>
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearSelection}>
                Clear Selection
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">Bulk bar stays visible while table scrolls</span>
            </div>
          </div>
        )}

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              {/* Header (all left aligned) */}
              <TableHeader className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                <TableRow>
                  {/* Selection column header */}
                  <TableHead
                    className="text-left"
                    style={{ minWidth: SELECT_COL_WIDTH, width: SELECT_COL_WIDTH, ...stickyLeft("select") }}
                  >
                    <Checkbox
                      checked={allVisibleSelected ? true : (someSelected ? "indeterminate" : false)}
                      onCheckedChange={toggleSelectAllVisible}
                      aria-label="Select all"
                      className="cursor-pointer"
                    />
                  </TableHead>

                  {visibleColumns.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, ...stickyLeft(c.key) }}
                      className="text-left"
                    >
                      {c.key === "actions" || !c.sortable ? (
                        c.label
                      ) : (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                          onClick={() => toggleSort(c.key)}
                        >
                          <span>{c.label}</span>
                          {sortBy === c.key
                            ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                            : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              {/* Body (all left aligned) */}
              <TableBody>
                {sorted.map((row) => {
                  const toxPct = row.totalBacklinks ? Math.round((row.toxicBacklinks / row.totalBacklinks) * 100) : 0;
                  return (
                    <TableRow key={row.id} className="hover:bg-[var(--wr-subtle)]">
                      {/* Row selection cell */}
                      <TableCell
                        style={{ minWidth: SELECT_COL_WIDTH, width: SELECT_COL_WIDTH, ...stickyLeft("select") as any }}
                        className="align-middle text-left"
                      >
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleRow(row.id)}
                          aria-label={`Select ${row.title}`}
                          className="cursor-pointer"
                        />
                      </TableCell>

                      {visibleColumns.map((c) => {
                        if (c.key === "page") {
                          return (
                            <TableCell key={`${row.id}-page`} style={stickyLeft("page") as any} className="text-left">
                              <div className="min-w-[320px] max-w-[520px]">
                                <button
                                  className="block text-left cursor-pointer"
                                  onClick={() => {
                                    onFilterToPage?.(row);
                                    setSearchInput(row.path);
                                  }}
                                  title="Filter this tab to this page"
                                >
                                  <div className="font-medium text-foreground truncate">{row.title}</div>
                                  <div className="text-[12px] truncate" style={{ color: TOKENS.brand }}>{row.path}</div>
                                </button>
                              </div>
                            </TableCell>
                          );
                        }

                        if (c.key === "totalBacklinks") {
                          return (
                            <TableCell key={`${row.id}-total`} className="text-left">
                              <button
                                className="underline decoration-dotted hover:text-foreground text-[var(--wr-brand)] cursor-pointer"
                                onClick={() => onGoToBacklinks?.(row)}
                                title="Go to Referring Domains & Backlinks (filtered)"
                              >
                                {formatNumber(row.totalBacklinks)}
                              </button>
                            </TableCell>
                          );
                        }

                        if (c.key === "toxicBacklinks") {
                          return (
                            <TableCell key={`${row.id}-toxic`} className="text-left">
                              <button
                                className="hover:text-foreground cursor-pointer"
                                onClick={() => setMinToxicCount(row.toxicBacklinks)}
                                title="Filter pages with at least this many toxic backlinks"
                              >
                                {formatNumber(row.toxicBacklinks)}
                              </button>
                            </TableCell>
                          );
                        }

                        if (c.key === "toxPct") {
                          return (
                            <TableCell key={`${row.id}-toxPct`} className="text-left">
                              <Badge color={toxColor(toxPct)} gradient>
                                {toxPct}%
                              </Badge>
                            </TableCell>
                          );
                        }

                        if (c.key === "ga4Total") {
                          return (
                            <TableCell key={`${row.id}-ga4Total`} className="text-left">
                              {ga4ConnectedState ? (
                                row.ga4TotalReferral && row.ga4TotalReferral > 0 ? formatNumber(row.ga4TotalReferral) : "—"
                              ) : (
                                <Button size="sm" variant="outline" className="cursor-pointer" onClick={connectGA4}>Connect GA4</Button>
                              )}
                            </TableCell>
                          );
                        }

                        if (c.key === "ga4Risky") {
                          return (
                            <TableCell key={`${row.id}-ga4Risky`} className="text-left">
                              {ga4ConnectedState ? (
                                row.ga4RiskReferral && row.ga4RiskReferral > 0 ? formatNumber(row.ga4RiskReferral) : "—"
                              ) : (
                                <Button size="sm" variant="outline" className="cursor-pointer" onClick={connectGA4}>Connect GA4</Button>
                              )}
                            </TableCell>
                          );
                        }

                        if (c.key === "anchorDiversity") {
                          return (
                            <TableCell key={`${row.id}-div`} className="text-left">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex items-center gap-2 cursor-pointer">
                                      <DiversityCircle value={row.anchorDiversity} />
                                      <span className="hidden md:inline text-[12px] text-muted-foreground">Higher is better</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[260px]">
                                    <div className="text-[12px] leading-snug">
                                      Measures diversity of anchor text for this page’s backlinks (0–100). Low scores indicate potential over‑optimization.
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          );
                        }

                        if (c.key === "lastFound") {
                          return (
                            <TableCell key={`${row.id}-last`} className="text-left whitespace-nowrap">
                              {row.lastLinkFound}
                            </TableCell>
                          );
                        }

                        if (c.key === "actions") {
                          return (
                            <TableCell key={`${row.id}-actions`} className="text-left">
                              <div className="inline-flex items-center gap-1.5">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Create Task"
                                        className="text-[var(--wr-brand)] cursor-pointer"
                                        onClick={() => onCreateTask?.(row)}
                                      >
                                        <ClipboardList className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Create Task</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="Page Analyzer"
                                        className="text-[var(--wr-brand)] cursor-pointer"
                                        onClick={() => onOpenAnalyzer?.(row)}
                                      >
                                        <Search className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">View in Page Analyzer</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          );
                        }

                        return null;
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
