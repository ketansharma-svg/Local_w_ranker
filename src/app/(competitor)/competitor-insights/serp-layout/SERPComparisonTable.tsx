import React, { useMemo, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Info, Download, Monitor, Smartphone, Globe, ChevronsUpDown
} from "lucide-react";
import DemoSerpSnapshotDrawerPage from "../drawers/SerpSnapshot";
/* ───────────────────────────────────────────────────────────
   Wranker tokens (light mode)
   ─────────────────────────────────────────────────────────── */
const TK = {
  brand: "var(--wr-brand, #008CCD)",
  brandHover: "#007DB3",
  value: "var(--wr-value, #0077FF)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  good: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  radius: "8px",
};

type Device = "desktop" | "mobile";
type FeatureKey =
  | "organic" | "featured_snippet" | "paa" | "sitelinks"
  | "video" | "image_pack" | "top_stories" | "shopping"
  | "ads_top" | "ads_bottom";

type DomainId = string; // "you" or hostname

type Placement = {
  present: boolean;
  url?: string;
  title?: string;
  isTarget?: boolean;
  droppedFrom?: number | null;
};

type SerpRow = {
  position: number | null;     // null/— for non-rank rows (e.g., PAA)
  element: FeatureKey;
  label?: string;
  placements: Record<DomainId, Placement>;
};

type Dataset = {
  keyword: string;
  device: Device;
  country: string;  // "US"
  featuresDetected: FeatureKey[];
  domains: DomainId[]; // ["you","comp1.com","comp2.com"]
  rows: SerpRow[];
};

/* Icons for element column */
const ELEMENT_ICON: Record<FeatureKey, string> = {
  featured_snippet: "⭐",
  paa: "❓",
  sitelinks: "🔗",
  video: "🎥",
  image_pack: "🖼️",
  top_stories: "📰",
  shopping: "🛒",
  ads_top: "🅰",
  ads_bottom: "🅰",
  organic: "•",
};

/* Demo data (replace with live) */
const MOCK: Dataset = {
  keyword: "seo audit checklist",
  device: "desktop",
  country: "US",
  featuresDetected: ["featured_snippet", "paa", "sitelinks"],
  domains: ["you", "comp1.com", "comp2.com"],
  rows: [
    {
      position: 0, element: "featured_snippet",
      placements: {
        you: { present: false },
        "comp1.com": { present: true, url: "/blog/seo-guide", title: "SEO Guide" },
        "comp2.com": { present: false },
      }
    },
    {
      position: 1, element: "organic",
      placements: {
        you: { present: true, url: "/seo-audit-checklist", title: "SEO Audit Checklist", isTarget: true },
        "comp1.com": { present: false },
        "comp2.com": { present: false },
      }
    },
    {
      position: 2, element: "organic",
      placements: {
        you: { present: false },
        "comp1.com": { present: true, url: "/seo-guide", title: "SEO Guide" },
        "comp2.com": { present: false },
      }
    },
    {
      position: 3, element: "organic",
      placements: {
        you: { present: false },
        "comp1.com": { present: false },
        "comp2.com": { present: true, url: "/seo-audit-list", title: "SEO Audit List" },
      }
    },
    {
      position: null, element: "paa", label: "PAA (4 items)",
      placements: { you: { present: false }, "comp1.com": { present: false }, "comp2.com": { present: false } }
    },
    {
      position: 5, element: "sitelinks",
      placements: {
        you: { present: true, url: "/seo-audit-checklist", title: "SEO Audit Checklist" },
        "comp1.com": { present: false },
        "comp2.com": { present: false },
      }
    },
  ],
};

function openLiveSERP(keyword: string, country: string, device: Device) {
  const q = encodeURIComponent(keyword);
  const gl = country.toLowerCase();
  const hl = gl === "us" ? "en" : gl; // simplistic; replace with mapping if needed
  const url = `https://www.google.com/search?q=${q}&gl=${gl}&hl=${hl}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function OVI_SERPComparisonTable() {
  // Local filters
  const [keyword, setKeyword] = useState(MOCK.keyword);
  const [device, setDevice] = useState<Device>(MOCK.device);
  const [country, setCountry] = useState(MOCK.country);
  const [featureFilter, setFeatureFilter] = useState<Set<FeatureKey>>(new Set());
  const [viewMode, setViewMode] = useState<"compact" | "visual">("compact");

  // Dataset would be refetched on keyword/device/country change
  const data = MOCK;

  const filteredRows = useMemo(() => {
    if (featureFilter.size === 0) return data.rows;
    return data.rows.filter(r => r.element === "organic" || featureFilter.has(r.element));
  }, [data.rows, featureFilter]);

  const domains = data.domains; // ["you", "comp1.com", ...]

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
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
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


  return (
    <section className="space-y-3 mt-4">
                              {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <DemoSerpSnapshotDrawerPage   />
                    </Drawer>
                  )}
      <Card className="border mx-4" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        {/* Header */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">SERP Comparison</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Compare SERP layout for your keyword vs competitors (device & country specific).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" className="h-8 px-3" onClick={() => console.log("Export CSV")}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </CardHeader>

        {/* Local Filter Bar (INSIDE the section) */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Keyword selector (simple input demo) */}
            <div className="relative">
              <Input className="w-[260px]" value={keyword}
                     onChange={(e) => setKeyword(e.target.value)}
                     placeholder="Select keyword…" />
            </div>

            {/* Device selector */}
            <Select value={device} onValueChange={(v: Device) => setDevice(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">
                  <span className="inline-flex items-center gap-2"><Monitor className="h-4 w-4" /> Desktop</span>
                </SelectItem>
                <SelectItem value="mobile">
                  <span className="inline-flex items-center gap-2"><Smartphone className="h-4 w-4" /> Mobile</span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Country selector */}
            <Select value={country} onValueChange={(v: string) => setCountry(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US"><span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" /> US</span></SelectItem>
                <SelectItem value="UK"><span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" /> UK</span></SelectItem>
                <SelectItem value="IN"><span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" /> IN</span></SelectItem>
              </SelectContent>
            </Select>

            {/* Feature filter (multi) */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white">
                  SERP Feature {featureFilter.size > 0 && <span className="text-muted-foreground">({featureFilter.size})</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72">
                <div className="text-sm font-medium mb-2">Show rows where feature is present</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["featured_snippet","paa","sitelinks","video","image_pack","top_stories","shopping","ads_top","ads_bottom"] as FeatureKey[]).map((f) => {
                    const active = featureFilter.has(f);
                    return (
                      <button
                        key={f}
                        onClick={() => {
                          const next = new Set(featureFilter);
                          next.has(f) ? next.delete(f) : next.add(f);
                          setFeatureFilter(next);
                        }}
                        className={`text-left text-sm rounded px-2 py-1 border ${active ? "bg-[#EDF6FF]" : "bg-white"}`}
                        style={{ borderColor: TK.border }}
                      >
                        <span className="mr-1">{ELEMENT_ICON[f]}</span>
                        {f.replace("_"," ")}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* View toggle (Phase 2 visual view placeholder) */}
            <div className="inline-flex rounded-full overflow-hidden border" style={{ borderColor: TK.border }}>
              <button
                className={`text-sm px-3 py-1.5 ${viewMode === "compact" ? "bg-[var(--wr-value,#0077FF)] text-white" : "bg-white text-[var(--wr-text,#111827)]"}`}
                onClick={() => setViewMode("compact")}
              >
                Compact
              </button>
              <button
                className={`text-sm px-3 py-1.5 ${viewMode === "visual" ? "bg-[var(--wr-value,#0077FF)] text-white" : "bg-white text-[var(--wr-text,#111827)]"}`}
                onClick={() => setViewMode("visual")}
                aria-disabled
                title="Coming soon"
              >
                Visual
              </button>
            </div>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs px-2 py-1 rounded" style={{ background: TK.chipBg, border: `1px solid ${TK.borderLight}` }}>
              Keyword: <strong>{data.keyword}</strong>
            </span>
            <span className="text-xs px-2 py-1 rounded" style={{ background: TK.chipBg, border: `1px solid ${TK.borderLight}` }}>
              Device: {device === "desktop" ? "💻 Desktop" : "📱 Mobile"}
            </span>
            <span className="text-xs px-2 py-1 rounded" style={{ background: TK.chipBg, border: `1px solid ${TK.borderLight}` }}>
              Country: {country}
            </span>
            <span className="text-xs px-2 py-1 rounded" style={{ background: TK.chipBg, border: `1px solid ${TK.borderLight}` }}>
              Features: {data.featuresDetected.map(f => ELEMENT_ICON[f]).join(" ")}
            </span>
          </div>
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="bg-white sticky top-0 z-40">
                <TableRow>
                  <TableHead className="min-w-[88px] sticky left-0 bg-white z-40 border-r" style={{ borderColor: TK.borderLight }}>
                    <button className="inline-flex items-center gap-1">
                      Position <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[180px] sticky left-[88px] bg-white z-40 border-r" style={{ borderColor: TK.borderLight }}>
                    <button className="inline-flex items-center gap-1">
                      SERP Element <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TableHead>

                  {domains.map((dom, idx) => (
                    <TableHead key={dom} className="min-w-[180px]">
                      {dom === "you" ? <span>Your Domain</span> : <span>{dom}</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRows.map((r, idx) => (
                  <TableRow key={`${r.element}-${r.position ?? idx}`} className="hover:bg-[#F8FAFC] h-12">
                    {/* Position */}
                    <TableCell className="sticky left-0 bg-white z-30 border-r" style={{ borderColor: TK.borderLight }}>
                      {r.position ?? "—"}
                    </TableCell>

                    {/* SERP Element */}
                    <TableCell className="sticky left-[88px] bg-white z-30 border-r" style={{ borderColor: TK.borderLight }}>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-base">{ELEMENT_ICON[r.element]}</span>
                        <span className="truncate">
                          {r.element === "organic" ? "Organic" :
                           r.element === "featured_snippet" ? "Featured Snippet" :
                           r.element === "paa" ? (r.label || "PAA") :
                           r.element === "sitelinks" ? "Sitelinks" :
                           r.element === "ads_top" ? "Ads (Top)" :
                           r.element === "ads_bottom" ? "Ads (Bottom)" :
                           r.element === "image_pack" ? "Image Pack" :
                           r.element === "top_stories" ? "Top Stories" :
                           r.element === "video" ? "Video" : r.element}
                        </span>
                      </span>
                    </TableCell>

                    {/* Domain placement cells */}
                    {domains.map((dom) => {
                      const p = r.placements[dom];
                      const isYou = dom === "you";
                      const baseCls = "h-12 align-middle";
                      const borderStyle = isYou ? { outline: `1px solid ${TK.value}`, outlineOffset: "-2px", borderRadius: "6px" } : undefined;

                      if (!p || !p.present) {
                        return (
                          <TableCell key={dom} className={baseCls}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-muted-foreground">—</span>
                                </TooltipTrigger>
                                <TooltipContent>Not present at this position.</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        );
                      }

                      const content = (
                        <span className="inline-flex items-center gap-2">
                          <span title="Present" style={{ color: TK.good }}>✅</span>
                          {p.url && (
                            <span className="truncate max-w-[220px] text-xs text-[var(--wr-text,#111827)] cursor-pointer" onClick={openDrawer}>
                              {p.url}
                            </span>
                          )}
                          {p.isTarget && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ border: `1px solid ${TK.value}`, color: TK.value }}
                            >
                              🎯 Target
                            </span>
                          )}
                          {typeof p.droppedFrom === "number" && (
                            <span className="text-xs" style={{ color: TK.critical }}>
                              🔻 P{p.droppedFrom}
                            </span>
                          )}
                        </span>
                      );

                      const clickable = !isYou; // Phase 1: competitors open live SERP; YOU opens local drawers (optional)
                      return (
                        <TableCell key={dom} className={baseCls}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="w-full text-left"
                                  style={isYou ? borderStyle : undefined}
                                  onClick={() => {
                                    if (clickable) openLiveSERP(keyword, country, device);
                                    else console.log("Open Page Analyzer drawer", p.url);
                                  }}
                                  title={clickable ? "View live SERP for this keyword" : "Open page details"}
                                >
                                  {content}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-[280px]">
                                  {p.title && <div className="font-medium mb-0.5">{p.title}</div>}
                                  {p.url && <div className="text-xs text-muted-foreground">{p.url}</div>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile stacked (simplified) */}
          <div className="sm:hidden p-3 space-y-3">
            {filteredRows.map((r, idx) => (
              <div key={`m-${r.element}-${r.position ?? idx}`} className="rounded border p-3" style={{ borderColor: TK.border }}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    <span className="mr-2">{ELEMENT_ICON[r.element]}</span>
                    {r.element === "organic" ? `Organic P${r.position}` :
                     r.element === "featured_snippet" ? "Featured Snippet" :
                     r.element === "paa" ? (r.label || "PAA") :
                     r.element === "sitelinks" ? "Sitelinks" : r.element}
                  </div>
                  <div className="text-xs text-muted-foreground">Pos: {r.position ?? "—"}</div>
                </div>
                <div className="mt-2 space-y-1">
                  {domains.map((dom) => {
                    const p = r.placements[dom];
                    const label = dom === "you" ? "Your Domain" : dom;
                    if (!p || !p.present) {
                      return (
                        <div key={dom} className="text-sm text-muted-foreground">
                          {label}: —
                        </div>
                      );
                    }
                    return (
                      <div key={dom} className="text-sm">
                        {label}: <span style={{ color: TK.good }}>✅</span>
                        {p.url && <span className="ml-1 text-xs">{p.url}</span>}
                        {p.isTarget && <span className="ml-1 text-[10px]" style={{ color: TK.value }}>🎯 Target</span>}
                        {typeof p.droppedFrom === "number" && <span className="ml-1 text-xs" style={{ color: TK.critical }}>🔻 P{p.droppedFrom}</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => openLiveSERP(keyword, country, device)}>View Live SERP</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
