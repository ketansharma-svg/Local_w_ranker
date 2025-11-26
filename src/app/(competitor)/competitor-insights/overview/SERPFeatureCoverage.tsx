"use client"
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Download, FileSpreadsheet, Lock, Info, Eye, SlidersHorizontal,
  Share2, Sparkles, Link as LinkIcon, Image as ImageIcon,
  Video, HelpCircle, Newspaper, CheckCircle2, XCircle, ChevronsUpDown, ChevronDown, ChevronUp, ExternalLink, ListChecks
} from "lucide-react";

/* NEW: Drawer (Sheet) */
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter
} from "@/components/ui/sheet";

/* ───────────────────────── Design Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "var(--wr-action, #4286F5)",
  pastelBlue: "var(--wr-pastelBrand, #D9EEF8)",
  ok: "var(--wr-success, #2ECC71)",
  warn: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #FF6B6B)",
  radius: "var(--wr-radius, 6px)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
};

type FeatureKey = "snippets" | "siteLinks" | "images" | "videos" | "paa" | "topStories";

type Row = {
  id: string;
  domain: string;
  isYou: boolean;
  features: Record<FeatureKey, number>;
};

type FeatureMeta = {
  key: FeatureKey;
  label: string;
  width?: number;
  icon: React.FC<any>;
  phase?: "1" | "2";
  sortable?: boolean;
};

const FEATURES: FeatureMeta[] = [
  { key: "snippets",   label: "Snippets",    icon: Sparkles,    width: 160, sortable: true },
  { key: "siteLinks",  label: "Site Links",  icon: LinkIcon,    width: 160, sortable: true },
  { key: "images",     label: "Images",      icon: ImageIcon,   width: 150, sortable: true },
  { key: "videos",     label: "Videos",      icon: Video,       width: 150, sortable: true },
  { key: "paa",        label: "PAA",         icon: HelpCircle,  width: 140, sortable: true, phase: "2" },
  { key: "topStories", label: "Top Stories", icon: Newspaper,   width: 160, sortable: true, phase: "2" },
];

/* Utilities */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const present = (count: number) => count >= 2;
const cellTone = (ok: boolean) =>
  ok ? { color: TK.ok, bg: "rgba(46,204,113,0.08)", border: "rgba(46,204,113,0.35)" }
     : { color: TK.critical, bg: "rgba(255,107,107,0.08)", border: "rgba(255,107,107,0.35)" };

function makeRows(): Row[] {
  return [
    {
      id: "you",
      domain: "wranker.com",
      isYou: true,
      features: { snippets: 4, siteLinks: 12, images: 5, videos: 0, paa: 3, topStories: 0 },
    },
    {
      id: "c1",
      domain: "competitor1.com",
      isYou: false,
      features: { snippets: 8, siteLinks: 25, images: 1, videos: 3, paa: 6, topStories: 1 },
    },
    {
      id: "c2",
      domain: "competitor2.com",
      isYou: false,
      features: { snippets: 1, siteLinks: 18, images: 7, videos: 2, paa: 2, topStories: 0 },
    },
  ];
}

/* Insight (unchanged) */
function getInsight(rows: Row[]) {
  const you = rows.find(r => r.isYou);
  const comps = rows.filter(r => !r.isYou);
  if (!you || comps.length === 0) return null;

  const diffs = FEATURES.map(f => {
    const youCount = you.features[f.key];
    const compMax = Math.max(...comps.map(c => c.features[f.key]));
    const delta = youCount - compMax;
    return { key: f.key, label: f.label, delta, youCount, compMax };
  });

  const strongest = diffs.reduce((a, b) => (b.delta > a.delta ? b : a), diffs[0]);
  const weakest   = diffs.reduce((a, b) => (b.delta < a.delta ? b : a), diffs[0]);

  const suggestions: Record<FeatureKey, string> = {
    snippets:   "Add concise answers and FAQ/HowTo schema to eligible pages.",
    siteLinks:  "Strengthen internal nav, add BreadcrumbList & Sitelinks Search Box markup.",
    images:     "Use high‑quality images, descriptive alt text and ImageObject markup.",
    videos:     "Publish short videos with VideoObject schema and embed on key pages.",
    paa:        "Target question headings (H2/H3) and add FAQPage schema for Q&A blocks.",
    topStories: "Use NewsArticle markup, publish timely content and submit to Google News.",
  };

  return {
    strongest,
    weakest,
    text: `You're strongest in ${strongest.label}, and weakest in ${weakest.label}. Consider: ${suggestions[weakest.key]}`,
  };
}

/* ───────────────────────── Drawer: Types & Helpers ───────────────────────── */
type KWRow = {
  id: string;
  keyword: string;
  yourRank?: number;   // rank for "you"
  theirRank?: number;  // rank for selected domain
  device: "desktop" | "mobile";
  lastSeenISO: string;
};

type DrawerState = {
  open: boolean;
  domain?: string;
  isYou?: boolean;
  feature?: FeatureMeta;
  page: number;
  data: KWRow[];
};

const PAGE_SIZE = 10;

const dateToYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}
function seededRand(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return Math.floor(frac * (max - min + 1)) + min;
}

/** Demo generator: deterministic keyword rows for (domain, feature) */
function generateKWRows(
  youDomain: string,
  targetDomain: string,
  feature: FeatureMeta,
  device: "desktop" | "mobile",
  total: number
): KWRow[] {
  const base = hashSeed(`${targetDomain}-${feature.key}-${device}`);
  const arr: KWRow[] = [];
  const today = new Date();
  for (let i = 0; i < total; i++) {
    const kw = `${feature.label.toLowerCase()} example ${i + 1}`;
    const s = base + i * 13;
    // "their" rank tighter (better) for competitor rows; for "you" rows, it's your rank
    const theirRank = seededRand(s, 1, 18);
    const yourRank = targetDomain === youDomain ? undefined : seededRand(s + 7, 1, 18);

    const daysAgo = seededRand(s + 3, 1, 21);
    const lastSeen = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    arr.push({
      id: `${feature.key}-${i}`,
      keyword: kw,
      device,
      theirRank,
      yourRank,
      lastSeenISO: dateToYMD(lastSeen),
    });
  }
  return arr;
}

/* ───────────────────────── Component ───────────────────────── */
export default function CI_Section4_SERPFeatureCoverage() {
  const [rows, setRows] = useState<Row[]>(() => makeRows());

  // column visibility
  const [visible, setVisible] = useState<Record<string, boolean>>(
    { domain: true, ...Object.fromEntries(FEATURES.map(f => [f.key, true])) }
  );

  // sort
  type SortKey = "domain" | FeatureKey;
  const [sortBy, setSortBy] = useState<SortKey>("domain");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (key: SortKey) => {
    const col = key === "domain" ? { sortable: true } : FEATURES.find(f => f.key === key);
    if (!col?.sortable) return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };

  // filters (also used for drawer deep-links)
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [country, setCountry] = useState("US");

  // export (csv) — unchanged
  const exportCSV = () => {
    const cols: (SortKey)[] = ["domain", ...FEATURES.map(f => f.key)];
    const hdr = ["Domain", ...FEATURES.map(f => f.label)];
    const lines = rows
      .filter(r => r.domain.toLowerCase().includes(query.toLowerCase()))
      .map(r => {
        const vals = cols.map(c =>
          c === "domain" ? r.domain + (r.isYou ? " (You)" : "") : r.features[c]
        );
        return vals.map(v => JSON.stringify(v)).join(",");
      });
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "serp-feature-coverage.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // XLS/PDF lock tooltip (Pro)
  const [lockOpen, setLockOpen] = useState(false);
  const lockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!lockRef.current) return;
      if (!lockRef.current.contains(e.target as Node)) setLockOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // filtered + sorted
  const filtered = useMemo(
    () => rows.filter(r => r.domain.toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortBy === "domain") {
        av = (a.isYou ? "0-" : "1-") + a.domain;
        bv = (b.isYou ? "0-" : "1-") + b.domain;
      } else {
        av = a.features[sortBy];
        bv = b.features[sortBy];
      }
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const insight = getInsight(sorted);

  const stickyDomain: React.CSSProperties = {
    position: "sticky",
    left: 0,
    zIndex: 30,
    background: "#fff",
    boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
  };

  const HeadLabel: React.FC<{col: SortKey, children: React.ReactNode, align?: "right" | "center"}> =
    ({ col, children, align }) => (
      <TableHead
        className={align === "center" ? "text-center" : align === "right" ? "text-right" : undefined}
        style={col === "domain" ? { minWidth: 280, width: 280, ...stickyDomain } : {}}
      >
        <button
          className="inline-flex items-center gap-1 hover:text-foreground"
          onClick={() => toggleSort(col)}
        >
          <span>{children}</span>
          {sortBy === col
            ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
            : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </TableHead>
    );

  /* ───────────── Drawer State & Handlers ───────────── */
  const youRow = rows.find(r => r.isYou)!;

  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    page: 1,
    data: [],
  });

  const openDrawer = (r: Row, f: FeatureMeta) => {
    // generate demo keyword list sized to feature count (cap to 40)
    const total = Math.min(Math.max(r.features[f.key], 10), 40);
    const kwData = generateKWRows(youRow.domain, r.domain, f, device, total);
    setDrawer({
      open: true,
      domain: r.domain,
      isYou: r.isYou,
      feature: f,
      page: 1,
      data: kwData,
    });
  };

  const closeDrawer = () => setDrawer(d => ({ ...d, open: false }));

  const drawerPageData = useMemo(() => {
    const start = (drawer.page - 1) * PAGE_SIZE;
    return drawer.data.slice(start, start + PAGE_SIZE);
  }, [drawer]);

  const totalPages = Math.max(1, Math.ceil(drawer.data.length / PAGE_SIZE));

  const goSerpLayout = () => {
    if (!drawer.feature || !drawer.domain) return;
    const params = new URLSearchParams();
    params.set("feature", drawer.feature.key); // feature filter
    params.set("device", device);
    params.set("country", country);
    // Only pass competitor if the selected row was a competitor
    if (!drawer.isYou) params.set("competitor", drawer.domain);
    params.set("source", "serp-feature-coverage-drawer");
    // Mirrors deep-linking rule to SERP Layout tab
    window.location.href = `/analyzer/competitors/serp-layout?${params.toString()}`;
  };

  const createTask = () => {
    if (!drawer.feature || !drawer.domain) return;
    // fire a custom event your app can listen to (global Task Drawer)
    const detail = {
      type: "serp-feature",
      featureKey: drawer.feature.key,
      featureLabel: drawer.feature.label,
      domain: drawer.domain,
      device,
      country,
      keywords: drawerPageData.map(k => k.keyword),
      source: "serp-feature-coverage",
    };
    window.dispatchEvent(new CustomEvent("wr:create-task", { detail }));
    console.log("[Task:create] Prefilled context:", detail);
  };

  const renderCell = (r: Row, f: FeatureMeta) => {
    const count = r.features[f.key];
    const ok = present(count);
    const tone = cellTone(ok);
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium border"
            style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}
          >
            {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {ok ? "Present" : "None / 1 only"}
          </span>
          <span className="text-sm tabular-nums" style={{ color: TK.muted }}>({nf(count)})</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2"
          onClick={() => openDrawer(r, f)}
        >
          <Eye className="h-4 w-4 mr-1" /> View examples
        </Button>
      </div>
    );
  };

  return (
    <section className="space-y-3 py-2 mt-4">
      <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* ─ Header ─ */}
        <CardHeader
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">SERP Feature Coverage</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Presence & counts of SERP features by domain.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Input
                className="w-[260px]"
                placeholder="Search domain…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Device */}
            <Select value={device} onValueChange={(v) => setDevice(v as "desktop" | "mobile")}>
              <SelectTrigger className="h-8 px-3 w-[140px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>

            {/* Country */}
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-8 px-3 w-[140px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
              </SelectContent>
            </Select>

            {/* Column control */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={true} disabled /> Domain
                  </label>
                  {FEATURES.map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={visible[f.key] !== false}
                        onCheckedChange={(v) => setVisible(s => ({ ...s, [f.key]: Boolean(v) }))}
                      />
                      <span className="inline-flex items-center gap-1.5">
                        <f.icon className="h-4 w-4" />
                        {f.label}
                        {f.phase && (
                          <span className="text-[10px] ml-1 rounded-full px-1.5 py-0.5 border"
                                style={{ borderColor: TK.borderLight, background: TK.pastelBlue, color: TK.valueBlue }}>
                            Phase {f.phase}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <div className="relative" ref={lockRef}>
              <Button variant="outline" className="h-8 px-3" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
                onClick={() => setLockOpen(o => !o)}
              >
                <FileSpreadsheet className="h-4 w-4" /> XLSX/PDF <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {lockOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded border bg-white p-3 text-sm shadow"
                  style={{ borderColor: TK.border }}
                >
                  <div className="font-medium mb-1">Upgrade to Pro</div>
                  <p className="text-muted-foreground mb-2">
                    Export to XLSX and PDF is available on Pro plans.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>View Plans</Button>
                    <Button size="sm" variant="outline" onClick={() => setLockOpen(false)}>Close</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Share */}
            <Button variant="outline" className="h-8 px-3">
              <Share2 className="h-4 w-4 mr-2" /> Share Link
            </Button>

            {/* Refresh demo */}
            <Button variant="outline" className="h-8 px-3" onClick={() => setRows(makeRows())}>
              Refresh Demo
            </Button>
          </div>
        </CardHeader>

        {/* AI Insight */}
        {insight && (
          <div
            className="mx-4 mt-3 mb-2 rounded-md border p-3 flex items-start gap-3"
            style={{ borderColor: TK.borderLight, background: "#fff8e6" }}
          >
            <div className="mt-0.5">
              <Info className="h-4 w-4" style={{ color: TK.warn }} />
            </div>
            <div className="text-sm">
              <span className="font-medium">AI Insight</span>
              <div className="text-muted-foreground mt-0.5">
                {insight.text}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-40">
                <TableRow>
                  <HeadLabel col="domain">Domain</HeadLabel>
                  {FEATURES.map(f => (
                    visible[f.key] !== false && (
                      <TableHead key={f.key} style={{ minWidth: f.width, width: f.width }}>
                        <div className="flex items-center gap-1">
                          <f.icon className="h-4 w-4" />
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => toggleSort(f.key)}
                          >
                            <span>{f.label}</span>
                            {f.phase && (
                              <span className="text-[10px] ml-1 rounded-full px-1.5 py-0.5 border"
                                    style={{ borderColor: TK.borderLight, background: TK.pastelBlue, color: TK.valueBlue }}>
                                Phase {f.phase}
                              </span>
                            )}
                            {sortBy === f.key
                              ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                              : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                          </button>
                        </div>
                      </TableHead>
                    )
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {sorted.map(r => (
                  <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                    {/* Domain (sticky) */}
                    <TableCell style={stickyDomain}>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${r.isYou ? "text-[#1090D0]" : ""}`}>
                          {r.domain}{r.isYou ? " (You)" : ""}
                        </span>
                        {r.isYou && (
                          <span
                            className="px-1.5 py-0.5 text-[11px] rounded border"
                            style={{ borderColor: TK.borderLight, background: TK.pastelBlue, color: TK.valueBlue }}
                          >
                            Baseline
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Feature cells */}
                    {FEATURES.map(f => (
                      visible[f.key] !== false && (
                        <TableCell key={f.key}>
                          {renderCell(r, f)}
                        </TableCell>
                      )
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Legend & Spec */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 border-t"
             style={{ borderColor: TK.borderLight }}>
          <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-3">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" style={{ color: TK.ok }} />
              <span>present (count &gt; 1)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <XCircle className="h-4 w-4" style={{ color: TK.critical }} />
              <span>none / only 1</span>
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Built to match Section 4 spec · Device: <strong>{device}</strong> · Country: <strong>{country}</strong>
          </div>
        </div>
      </Card>

      {/* ───────────────────────── Drawer (View Examples) ───────────────────────── */}
      <Sheet open={drawer.open} onOpenChange={(o) => (o ? null : closeDrawer())}>
        <SheetContent side="right" className="w-full sm:max-w-[720px] p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b" style={{ borderColor: TK.borderLight }}>
            <SheetTitle className="flex items-center gap-2">
              {drawer.feature && (() => {
                const Icon = drawer.feature!.icon;
                return <Icon className="h-5 w-5 text-[#1090D0]" />;
              })()}
              <span>
                {drawer.feature?.label} — {drawer.domain}
                {drawer.isYou ? " (You)" : ""}
              </span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Top keywords where this feature appears for the selected domain. Paginated list (10 per page).
            </SheetDescription>
          </SheetHeader>

          {/* Actions */}
          <div className="px-5 py-3 flex flex-wrap gap-2 border-b" style={{ borderColor: TK.borderLight }}>
            <Button onClick={goSerpLayout} className="h-8">
              <ExternalLink className="h-4 w-4 mr-2" /> Open SERP Layout (pre‑filtered)
            </Button>
            <Button onClick={createTask} variant="outline" className="h-8">
              <ListChecks className="h-4 w-4 mr-2" /> Create Task (pre‑filled)
            </Button>
            <div className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
              <span>Device: <strong className="ml-1">{device}</strong></span>
              <span>Country: <strong className="ml-1">{country}</strong></span>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: TK.borderLight }}>
                <TableRow>
                  <TableHead style={{ width: 320, minWidth: 280 }}>Keyword</TableHead>
                  <TableHead className="text-right">Your Rank</TableHead>
                  <TableHead className="text-right">Their Rank</TableHead>
                  <TableHead className="text-center">Device</TableHead>
                  <TableHead className="text-right">Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drawerPageData.map((k) => (
                  <TableRow key={k.id} className="hover:bg-[#F8FAFC]">
                    <TableCell>
                      <div className="truncate" title={k.keyword}>{k.keyword}</div>
                      <div className="text-xs text-muted-foreground">
                        Feature: {drawer.feature?.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {k.yourRank ? `#${k.yourRank}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {k.theirRank ? `#${k.theirRank}` : "—"}
                    </TableCell>
                    <TableCell className="text-center capitalize">{k.device}</TableCell>
                    <TableCell className="text-right tabular-nums">{k.lastSeenISO}</TableCell>
                  </TableRow>
                ))}
                {drawerPageData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No keywords found for this feature and filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer / Pagination */}
          <SheetFooter className="px-5 py-3 border-t" style={{ borderColor: TK.borderLight }}>
            <div className="w-full flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Showing {(drawer.page - 1) * PAGE_SIZE + 1}-{Math.min(drawer.page * PAGE_SIZE, drawer.data.length)} of {drawer.data.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={drawer.page <= 1}
                  onClick={() => setDrawer(d => ({ ...d, page: Math.max(1, d.page - 1) }))}
                >
                  Prev
                </Button>
                <div className="text-xs">
                  Page <strong>{drawer.page}</strong> / {totalPages}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={drawer.page >= totalPages}
                  onClick={() => setDrawer(d => ({ ...d, page: Math.min(totalPages, d.page + 1) }))}
                >
                  Next
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
