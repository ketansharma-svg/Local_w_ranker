"use client";

import * as React from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronUp, ChevronsUpDown,
  SlidersHorizontal, Download, RefreshCw, Search, Info,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "var(--wr-action, #4286F5)",
  pastelBlue: "var(--wr-pastelBrand, #D9EEF8)",
  ok: "var(--wr-success, #22C55E)",
  warn: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #EF4444)",
  radius: "var(--wr-radius, 6px)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
};

/* ───────────────────────── Types ───────────────────────── */
type PageRow = {
  id: string;
  urlPath: string;
  fullUrl: string;
  clicks: number;
  sessions: number;
  estTraffic: number;
  trackedKw: number;
  backlinks: number;
  healthScore: number; // 0..100
  primaryKw: string;
  cannibalized: boolean;
};

type ColKey =
  | "urlPath"
  | "clicks"
  | "sessions"
  | "estTraffic"
  | "trackedKw"
  | "backlinks"
  | "healthScore"
  | "primaryKw"
  | "cannibalized";

type ColDef = {
  key: ColKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sticky?: boolean;
};

/* ───────────────────────── Utilities ───────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
const shortPath = (p: string) => (p.length <= 42 ? p : p.slice(0, 24) + "…" + p.slice(-16));

function healthTone(v: number) {
  if (v >= 80) return TK.ok;
  if (v >= 50) return TK.warn;
  return TK.critical;
}

/* ───────────────────────── Mock Data ───────────────────────── */
function sample<T>(xs: T[]) { return xs[Math.floor(Math.random() * xs.length)]; }
function makeRows(n = 50): PageRow[] {
  const paths = [
    "/blog/technical-seo-guide",
    "/tools/schema-generator",
    "/product/ai-content-optimizer",
    "/tools/backlink-analyzer",
    "/blog/semrush-vs-ahrefs",
    "/solutions/seo-for-saas",
    "/learning/seo-course",
    "/guides/keyword-research",
    "/blog/core-web-vitals",
    "/features/site-audit",
  ];
  const kws = [
    "technical seo guide", "schema generator", "ai content optimizer",
    "backlink analyzer", "semrush vs ahrefs", "seo for saas",
    "seo course", "keyword research", "core web vitals", "site audit tool"
  ];
  return Array.from({ length: n }, (_, i) => {
    const base = paths[i % paths.length] + (i >= paths.length ? `-${i}` : "");
    const clicks = Math.floor(80 + Math.random() * 12000);
    const sessions = Math.floor(60 + Math.random() * 9000);
    const estTraffic = Math.floor(clicks * (1.2 + Math.random() * 0.6));
    const tracked = Math.floor(1 + Math.random() * 80);
    const backlinks = Math.floor(Math.random() * 450);
    const health = clamp(Math.round(40 + Math.random() * 60), 0, 100);
    const cann = Math.random() < 0.18; // ~18% cannibalized
    return {
      id: `p-${i + 1}`,
      urlPath: base,
      fullUrl: `https://www.example.com${base}`,
      clicks,
      sessions,
      estTraffic,
      trackedKw: tracked,
      backlinks,
      healthScore: health,
      primaryKw: sample(kws),
      cannibalized: cann,
    };
  });
}

/* ───────────────────────── Health Progress Bar ───────────────────────── */
const HealthBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="inline-flex items-center gap-2 w-[140px]">
    <div className="h-2 w-full rounded bg-[#E5E7EB] overflow-hidden">
      <div
        className="h-full rounded"
        style={{
          width: `${clamp(value, 0, 100)}%`,
          background: healthTone(value),
        }}
      />
    </div>
    <span className="text-xs" style={{ color: TK.muted }}>{value}%</span>
  </div>
);

/* ───────────────────────── Column Model ───────────────────────── */
const COLS: ColDef[] = [
  { key: "urlPath",     label: "URL",              width: 360, sortable: true, sticky: true },
  { key: "clicks",      label: "Clicks",           width: 120, sortable: true, align: "right" },
  { key: "sessions",    label: "Sessions",         width: 130, sortable: true, align: "right" },
  { key: "estTraffic",  label: "Est. Traffic",     width: 140, sortable: true, align: "right" },
  { key: "trackedKw",   label: "Tracked Keywords", width: 160, sortable: true, align: "right" },
  { key: "backlinks",   label: "Backlinks",        width: 120, sortable: true, align: "right" },
  { key: "healthScore", label: "Page Health Score",width: 180, sortable: true, align: "center" },
  { key: "primaryKw",   label: "Primary KW",       width: 220, sortable: true },
  { key: "cannibalized",label: "Cannibalization",  width: 140, sortable: true, align: "center" },
];

const columnHelp: Record<ColKey, string> = {
  urlPath:     "Landing page path (full URL on hover). Click row to open in Pages Panel.",
  clicks:      "Search clicks in the selected window (GSC).",
  sessions:    "Sessions attributed to this page (GA4).",
  estTraffic:  "Estimated monthly organic traffic (CTR model).",
  trackedKw:   "Count of tracked keywords associated with this page.",
  backlinks:   "Referring backlinks count.",
  healthScore: "Composite page health score (0–100).",
  primaryKw:   "Top primary keyword for this page.",
  cannibalized:"Indicates potential cannibalization across site URLs.",
};

/* ───────────────────────── Component ───────────────────────── */
export default function TopOrganicPages({
  panelHref = "/pages",
  onNavigate, // optional: (row) => void
}: {
  /** Dedicated panel route for row and footer CTA */
  panelHref?: string;
  /** Optional override for navigation handler */
  onNavigate?: (row: PageRow) => void;
}) {
  /* Data */
  const [rows, setRows] = React.useState<PageRow[]>(() => makeRows(80));

  /* Header context (demo only) */
  const [windowKey, setWindowKey] = React.useState<"last_7"|"last_14"|"last_28"|"last_90">("last_28");
  const [device, setDevice] = React.useState<"all"|"desktop"|"mobile">("all");
  const [country, setCountry] = React.useState<string>("ALL");

  /* Filters */
  const [query, setQuery] = React.useState("");
  const [onlyCann, setOnlyCann] = React.useState(false);
  const [onlyTracked, setOnlyTracked] = React.useState(false);
  const [minClicks, setMinClicks] = React.useState(0);
  const [minSessions, setMinSessions] = React.useState(0);
  const [minBacklinks, setMinBacklinks] = React.useState(0);
  const [healthRange, setHealthRange] = React.useState<[number, number]>([0, 100]);

  /* Sorting */
  const [sortBy, setSortBy] = React.useState<ColKey>("estTraffic");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    if (!COLS.find(c => c.key === key)?.sortable) return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };

  /* Filtering */
  const filtered = React.useMemo(() => {
    return rows.filter(r => {
      if (query) {
        const q = query.toLowerCase();
        if (!r.urlPath.toLowerCase().includes(q) && !r.primaryKw.toLowerCase().includes(q)) return false;
      }
      if (onlyCann && !r.cannibalized) return false;
      if (onlyTracked && r.trackedKw <= 0) return false;
      if (r.clicks < minClicks) return false;
      if (r.sessions < minSessions) return false;
      if (r.backlinks < minBacklinks) return false;
      if (!(r.healthScore >= healthRange[0] && r.healthScore <= healthRange[1])) return false;
      // device/country/window are placeholders in demo
      return true;
    });
  }, [rows, query, onlyCann, onlyTracked, minClicks, minSessions, minBacklinks, healthRange]);

  /* Sorting */
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const getter = (r: PageRow): any => {
      switch (sortBy) {
        case "urlPath": return r.urlPath;
        case "clicks": return r.clicks;
        case "sessions": return r.sessions;
        case "estTraffic": return r.estTraffic;
        case "trackedKw": return r.trackedKw;
        case "backlinks": return r.backlinks;
        case "healthScore": return r.healthScore;
        case "primaryKw": return r.primaryKw;
        case "cannibalized": return r.cannibalized ? 1 : 0;
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a), bv = getter(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Top 10 only */
  const top10 = React.useMemo(() => sorted.slice(0, 10), [sorted]);

  /* Sticky helper */
  const stickyStyle = (key: ColKey) =>
    key === "urlPath"
      ? { position: "sticky" as const, left: 0, zIndex: 30, background: "#fff", boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)" }
      : undefined;

  /* Export CSV (top 10 view) */
  const exportCSV = () => {
    const headers = COLS.map(c => c.label);
    const rowsCsv = top10.map(r => [
      r.fullUrl,
      r.clicks,
      r.sessions,
      r.estTraffic,
      r.trackedKw,
      r.backlinks,
      r.healthScore + "%",
      r.primaryKw,
      r.cannibalized ? "Yes" : "No",
    ].map(v => JSON.stringify(v)).join(","));
    const csv = [headers.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-organic-pages.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Navigation */
  const goToPanel = (row?: PageRow) => {
    if (onNavigate && row) { onNavigate(row); return; }
    const href = row ? `${panelHref}?url=${encodeURIComponent(row.fullUrl)}` : panelHref;
    window.location.assign(href);
  };

  /* Empty state */
  const isEmpty = top10.length === 0;

  return (
    <section className="space-y-3 px-2 py-2 mt-4">
      <Card className="" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* Header */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Top Organic Pages</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Your top 10 landing pages by organic performance.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Window */}
            <Select value={windowKey} onValueChange={(v: any) => setWindowKey(v)}>
              <SelectTrigger className="h-8 px-3 w-[150px]"><SelectValue placeholder="Window" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7">Last 7 days</SelectItem>
                <SelectItem value="last_14">Last 14 days</SelectItem>
                <SelectItem value="last_28">Last 28 days</SelectItem>
                <SelectItem value="last_90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {/* Device */}
            <Select value={device} onValueChange={(v: any) => setDevice(v)}>
              <SelectTrigger className="h-8 px-3 w-[130px]"><SelectValue placeholder="Device" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>

            {/* Country */}
            <Select value={country} onValueChange={(v: any) => setCountry(v)}>
              <SelectTrigger className="h-8 px-3 w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All countries</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
              </SelectContent>
            </Select>

            {/* Columns (kept minimal in overview) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm text-muted-foreground">Overview shows a fixed set of columns for consistency. Use the Pages Panel for full customization.</div>
              </PopoverContent>
            </Popover>

            {/* Export + Refresh */}
            <Button variant="outline" className="h-8 px-3" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" className="h-8 px-3" onClick={() => setRows(makeRows(80))}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Filters */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[280px] pl-7"
                placeholder="Search by URL or primary keyword…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Chips */}
            <button
              onClick={() => setOnlyCann(v => !v)}
              className={cx("h-8 px-3 rounded-full border text-sm", onlyCann ? "font-semibold" : "")}
              style={{ borderColor: TK.borderLight, background: onlyCann ? TK.pastelBlue : "#fff" }}
            >
              Cannibalized only
            </button>
            <button
              onClick={() => setOnlyTracked(v => !v)}
              className={cx("h-8 px-3 rounded-full border text-sm", onlyTracked ? "font-semibold" : "")}
              style={{ borderColor: TK.borderLight, background: onlyTracked ? TK.pastelBlue : "#fff" }}
            >
              Tracked only
            </button>

            {/* Sliders */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground">Min Clicks</span>
              <div className="w-[160px]">
                <Slider value={[minClicks]} min={0} max={15000} step={100} onValueChange={(v) => setMinClicks((v as number[])[0])} />
              </div>
              <span className="text-sm w-16 text-right">{nf(minClicks)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Min Sessions</span>
              <div className="w-[160px]">
                <Slider value={[minSessions]} min={0} max={15000} step={100} onValueChange={(v) => setMinSessions((v as number[])[0])} />
              </div>
              <span className="text-sm w-16 text-right">{nf(minSessions)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Min Backlinks</span>
              <div className="w-[160px]">
                <Slider value={[minBacklinks]} min={0} max={500} step={5} onValueChange={(v) => setMinBacklinks((v as number[])[0])} />
              </div>
              <span className="text-sm w-16 text-right">{nf(minBacklinks)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Health %</span>
              <div className="w-[180px]">
                <Slider value={healthRange} min={0} max={100} step={1} onValueChange={(v) => setHealthRange(v as [number, number])} />
              </div>
              <span className="text-sm w-16 text-right">{healthRange[0]}–{healthRange[1]}</span>
            </div>
          </div>
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-40">
                <TableRow>
                  {COLS.map(c => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, width: c.width, ...stickyStyle(c.key) }}
                      className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                    >
                      {c.sortable ? (
                        <span className="relative group cursor-help">
                          <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(c.key)}>
                            <span>{c.label}</span>
                            {sortBy === c.key
                              ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                              : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                            }
                          </button>
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnHelp[c.key]}
                          </span>
                        </span>
                      ) : (
                        <span className="relative group cursor-help">
                          {c.label}
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {columnHelp[c.key]}
                          </span>
                        </span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {!isEmpty && top10.map(r => (
                  <TableRow
                    key={r.id}
                    className="hover:bg-[#F8FAFC] cursor-pointer"
                    onClick={() => goToPanel(r)}
                  >
                    {/* URL (sticky) */}
                    <TableCell style={stickyStyle("urlPath") as any}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium underline" style={{ color: TK.valueBlue }}>{shortPath(r.urlPath)}</span>
                          </TooltipTrigger>
                          <TooltipContent>{r.fullUrl}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="text-right">{nf(r.clicks)}</TableCell>
                    <TableCell className="text-right">{nf(r.sessions)}</TableCell>
                    <TableCell className="text-right">{nf(r.estTraffic)}</TableCell>
                    <TableCell className="text-right">{nf(r.trackedKw)}</TableCell>
                    <TableCell className="text-right">{nf(r.backlinks)}</TableCell>

                    <TableCell className="text-center">
                      <HealthBar value={r.healthScore} />
                    </TableCell>

                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate inline-block max-w-[220px]">{r.primaryKw}</span>
                          </TooltipTrigger>
                          <TooltipContent>{r.primaryKw}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="text-center">
                      <span
                        className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold"
                        style={{
                          color: r.cannibalized ? TK.critical : TK.muted,
                          border: `1px solid ${TK.borderLight}`,
                          background: r.cannibalized ? "rgba(239,68,68,0.08)" : "#F3F4F6",
                        }}
                      >
                        {r.cannibalized ? "Yes" : "No"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {isEmpty && (
                  <TableRow>
                    <TableCell colSpan={COLS.length}>
                      <div className="p-8 text-center text-sm" style={{ color: TK.muted }}>
                        No pages match the current filters.
                        <div className="mt-2">
                          <Button variant="outline" onClick={() => {
                            setQuery(""); setOnlyCann(false); setOnlyTracked(false);
                            setMinClicks(0); setMinSessions(0); setMinBacklinks(0); setHealthRange([0,100]);
                          }}>
                            Clear filters
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Footer CTA (no pagination; dedicated panel) */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm text-muted-foreground">
            Showing top {top10.length} {top10.length === 1 ? "page" : "pages"} (sorted & filtered)
          </div>
          <Button className="h-8 px-3" style={{ background: TK.brand, color: "#fff" }} onClick={() => goToPanel()}>
            Open Pages Panel
          </Button>
        </div>
      </Card>
    </section>
  );
}


