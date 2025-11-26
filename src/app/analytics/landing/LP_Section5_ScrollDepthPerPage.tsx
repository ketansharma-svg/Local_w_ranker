import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from "@/components/ui/select";
import {
  ChevronDown, ChevronUp, ChevronsUpDown,
  SlidersHorizontal, Info, Eye, ClipboardList, Download, LayoutGrid, List, Lock
} from "lucide-react";
import DemoDrawerHeaderPage from "./drawer/DemoDrawerHeaderPage";
import { Pagination as AntPagination } from "antd";

/* ───────────────────────── Design Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  action: "var(--wr-action, #4286F5)",
  ok: "var(--wr-success, #2ECC71)",
  warn: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #FF6B6B)",
  radius: "var(--wr-radius, 6px)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
};

/* ───────────────────────── Types ───────────────────────── */
type Mode = "full" | "ga4only";
type Row = {
  id: string;
  pageUrl: string;
  fullUrl: string;
  sessions: number;
  // Full buckets
  p25?: number; p50?: number; p75?: number; p100?: number;
  // GA4 default (90% scroll completion proxy)
  scrolled90Pct?: number;
  avgEngagementSec: number;
  scrollScore: number;
};

type ScrollPagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

/* ───────────────────────── Utilities ───────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const pf = (n: number, fd = 0) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(n)}%`;
const mmss = (sec: number) => {
  const m = Math.floor(sec / 60), s = Math.max(0, Math.floor(sec % 60));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Equal-weight scroll score used in this section */
const scrollScore = (p25 = 0, p50 = 0, p75 = 0, p100 = 0) =>
  Math.round((p25 + p50 + p75 + p100) / 4);

/** Threshold tone for % and score */
const tone = (v: number) => (v >= 75 ? "good" : v >= 50 ? "warn" : "bad");
const toneEmoji = (v: number) => (v >= 75 ? "🟢" : v >= 50 ? "🟡" : "🟠");
const toneColor = (v: number) => (v >= 75 ? TK.ok : v >= 50 ? TK.warn : TK.critical);

/** Gradient fill bar */
const Bar: React.FC<{ value: number; label?: string; aria?: string }> = ({ value, label, aria }) => {
  const v = clamp(value);
  return (
    <div
      className="relative h-2.5 w-full rounded"
      role="progressbar"
      aria-valuenow={v}
      aria-label={aria}
      style={{ background: "#F3F4F6", border: `1px solid ${TK.borderLight}` }}
    >
      <div
        className="absolute left-0 top-0 h-full rounded"
        style={{
          width: `${v}%`,
          background:
            "linear-gradient(90deg, #FF6B6B 0%, #F59E0B 50%, #2ECC71 100%)",
        }}
      />
      {label && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-medium"
             style={{ color: "#111827" }}>
          {label}
        </div>
      )}
    </div>
  );
};

/** Score badge (colorized pill) */
const ScoreBadge: React.FC<{ score: number }> = ({ score }) => (
  <span
    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold"
    style={{ color: toneColor(score), border: `1px solid ${TK.borderLight}` }}
  >
    {pf(score)} {toneEmoji(score)}
  </span>
);


/* ───────────────────────── Columns ───────────────────────── */
type ColKey =
  | "pageUrl" | "p25" | "p50" | "p75" | "p100" | "scrolled90" | "avgTime" | "scrollScore" | "actions";

const COLS_FULL: { key: ColKey; label: string; width?: number; align?: "left"|"right"|"center"; sortable?: boolean }[] = [
  { key: "pageUrl", label: "Page URL", width: 320, sortable: true },
  { key: "p25", label: "25%", width: 140, sortable: true, align: "center" },
  { key: "p50", label: "50%", width: 140, sortable: true, align: "center" },
  { key: "p75", label: "75%", width: 140, sortable: true, align: "center" },
  { key: "p100", label: "100%", width: 140, sortable: true, align: "center" },
  { key: "avgTime", label: "Avg. Time", width: 120, sortable: true, align: "center" },
  { key: "scrollScore", label: "Scroll Score", width: 160, sortable: true, align: "center" },
  { key: "actions", label: "🔧", width: 120, align: "center" },
];

const COLS_GA4: typeof COLS_FULL = [
  { key: "pageUrl", label: "Page URL", width: 320, sortable: true },
  { key: "scrolled90", label: "Scrolled 90%", width: 160, sortable: true, align: "center" },
  { key: "avgTime", label: "Avg. Time", width: 120, sortable: true, align: "center" },
  { key: "scrollScore", label: "Scroll Score", width: 160, sortable: true, align: "center" },
  { key: "actions", label: "🔧", width: 120, align: "center" },
];

const columnHelp: Record<ColKey, string> = {
  pageUrl: "Clickable slug. Opens Page Analyzer.",
  p25: "% of sessions that reached 25% depth.",
  p50: "% of sessions that reached 50% depth.",
  p75: "% of sessions that reached 75% depth.",
  p100: "% of sessions that reached 100% depth.",
  scrolled90: "GA4 default scroll event at 90% page height.",
  avgTime: "Average engagement time on page.",
  scrollScore: "Equal-weight score of depth % (25/50/75/100).",
  actions: "Quick actions (View Analyzer, Create Task).",
};

/* ───────────────────────── Component ───────────────────────── */
export default function LP_Section5_ScrollDepthPerPage({
  dataMode = "full" as Mode,
  rows: incomingRows,
  loading = false,
  error,
  pagination,
  onPageChange,
}: {
  dataMode?: Mode;
  rows?: Row[];
  loading?: boolean;
  error?: string | null;
  pagination?: ScrollPagination;
  onPageChange?: (page: number, pageSize?: number) => void;
}) {
  const [mode, setMode] = useState<Mode>(dataMode);
  const [rows, setRows] = useState<Row[]>(() => incomingRows ?? []);
  useEffect(() => {
    setRows(incomingRows ?? []);
  }, [incomingRows, mode]);
  /* UI state */
  const COLS = mode === "full" ? COLS_FULL : COLS_GA4;
  const [query, setQuery] = useState("");
  const [onlyUnder, setOnlyUnder] = useState(false);
  const [view, setView] = useState<"table"|"cards">("table");
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as Record<ColKey, boolean>)
  );
  useEffect(() => {
    // Reset visibility when mode changes
    setVisibleCols(COLS.reduce((a, c) => ({ ...a, [c.key]: true }), {} as Record<ColKey, boolean>));
  }, [mode]);

  /* Sorting */
  const [sortBy, setSortBy] = useState<ColKey>("scrollScore");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const toggleSort = (key: ColKey) => {
    const col = COLS.find(c => c.key === key);
    if (!col?.sortable) return;
    if (sortBy !== key) { setSortBy(key); setSortDir("asc"); }
    else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };

  /* Filtering */
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (query && !r.pageUrl.toLowerCase().includes(query.toLowerCase())) return false;
      if (onlyUnder && r.scrollScore >= 60) return false;
      return true;
    });
  }, [rows, query, onlyUnder]);

  /* Sorting */
  const sorted = useMemo(() => {
    const get = (r: Row): any => {
      switch (sortBy) {
        case "pageUrl": return r.pageUrl;
        case "p25": return r.p25 ?? -1;
        case "p50": return r.p50 ?? -1;
        case "p75": return r.p75 ?? -1;
        case "p100": return r.p100 ?? -1;
        case "scrolled90": return r.scrolled90Pct ?? -1;
        case "avgTime": return r.avgEngagementSec;
        case "scrollScore": return r.scrollScore;
        default: return 0;
      }
    };
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const displayRows = sorted;
  const currentPage = Math.max(1, pagination?.currentPage ?? 1);
  const pageSize = Math.max(1, pagination?.pageSize ?? (displayRows.length || 10));
  const totalRecords = Math.max(0, pagination?.totalRecords ?? displayRows.length);
  const rangeStart = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(totalRecords, currentPage * pageSize);
  const showLoading = loading && displayRows.length === 0;
  const showEmpty = !loading && displayRows.length === 0;
  const requestFirstPage = () => {
    if (onPageChange) onPageChange(1, pageSize);
  };

  /* Export CSV */
  const exportCSV = () => {
    const cols = COLS.filter(c => visibleCols[c.key] !== false && c.key !== "actions");
    const header = cols.map(c => c.label).join(",");
    const lines = sorted.map(r => {
      return cols.map(c => {
        const key = c.key;
        switch (key) {
          case "pageUrl": return JSON.stringify(r.fullUrl);
          case "p25": return r.p25 ?? "";
          case "p50": return r.p50 ?? "";
          case "p75": return r.p75 ?? "";
          case "p100": return r.p100 ?? "";
          case "scrolled90": return r.scrolled90Pct ?? "";
          case "avgTime": return JSON.stringify(mmss(r.avgEngagementSec));
          case "scrollScore": return r.scrollScore;
          default: return "";
        }
      }).join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "scroll-depth-per-page.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* XLSX/PDF lock popover (freemium) */
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

  /* Cards view (compact option) */
  const Cards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {displayRows.map(r => (
        <div key={r.id} className="rounded border p-3 bg-white" style={{ borderColor: TK.borderLight }}>
          <div className="flex items-center justify-between">
            <div className="font-medium truncate">
              <a className="underline" style={{ color: TK.action }} onClick={() => console.log("Open Page Analyzer", r.fullUrl)}>
                {r.pageUrl}
              </a>
            </div>
            <ScoreBadge score={r.scrollScore} />
          </div>
          <div className="mt-2 space-y-2">
            {mode === "full" ? (
              <>
                <LabeledBar label="25%" v={r.p25 ?? 0} total={r.sessions} />
                <LabeledBar label="50%" v={r.p50 ?? 0} total={r.sessions} />
                <LabeledBar label="75%" v={r.p75 ?? 0} total={r.sessions} />
                <LabeledBar label="100%" v={r.p100 ?? 0} total={r.sessions} />
              </>
            ) : (
              <LabeledBar label="Scrolled 90%" v={r.scrolled90Pct ?? 0} total={r.sessions} />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avg. Time</span>
            <span className="font-medium">{mmss(r.avgEngagementSec)}</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => console.log("Open Analyzer", r.fullUrl)}>
              <Eye className="h-4 w-4 mr-1"/> View
            </Button>
            <Button size="sm" variant="outline" onClick={() => console.log("Create UX Task", r.fullUrl)}>
              <ClipboardList className="h-4 w-4 mr-1"/> Task
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  const LabeledBar: React.FC<{ label: string; v: number; total: number }> = ({ label, v, total }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="grid grid-cols-[56px,1fr,52px] items-center gap-2">
            <div className="text-xs text-muted-foreground">{label}</div>
            <Bar value={v} label={pf(v)} aria={`${label} scroll reach`} />
            <div className="text-xs text-right text-muted-foreground">{nf(Math.round((v/100) * total))}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {nf(Math.round((v/100) * total))} sessions reached {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
      <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
                                                     {drawerRow && (
                                            <Drawer title="Drawer" onClose={closeDrawer}>
                                              <DemoDrawerHeaderPage   />
                                            </Drawer>
                                          )}
        {/* Header */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Scroll Depth Per Page</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[320px]">
                  Shows how deeply users engage with page content.
                  {mode === "ga4only" && (
                    <div className="mt-1">
                      GA4 default tracks only a 90% event. Enable custom thresholds for 25/50/75/100%.
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode switch (demo) */}
            <Select value={mode} onValueChange={(v:any) => setMode(v)}>
              <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Data Mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Buckets (25/50/75/100)</SelectItem>
                <SelectItem value="ga4only">GA4‑Only (Scrolled 90%)</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex items-center">
              <Button size="sm" variant={view==="table"?"default":"outline"} className="h-8 px-3 mr-1" onClick={()=>setView("table")}>
                <List className="h-4 w-4 mr-1" /> Table
              </Button>
              <Button size="sm" variant={view==="cards"?"default":"outline"} className="h-8 px-3" onClick={()=>setView("cards")}>
                <LayoutGrid className="h-4 w-4 mr-1" /> Cards
              </Button>
            </div>

            {/* Columns control */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]">
                  <SlidersHorizontal className="h-4 w-4" /> Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                  {(mode === "full" ? COLS_FULL : COLS_GA4).map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={c.key === "pageUrl" || c.key === "actions"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [c.key]: Boolean(v) }))}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <div className="relative" ref={lockRef}>
              <Button variant="outline" className="h-8 px-3" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button variant="outline" className="h-8 px-3" onClick={() => setLockOpen(o => !o)}>
                XLSX/PDF <Lock className="h-4 w-4 ml-1" />
              </Button>
              {lockOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded border bg-white p-3 text-sm shadow"
                     style={{ borderColor: TK.border }}>
                  <div className="font-medium mb-1">Upgrade to Pro</div>
                  <p className="text-muted-foreground mb-2">Export XLSX and PDF are Pro features.</p>
                  <div className="flex gap-2">
                    <Button size="sm" style={{ background: TK.brand, color: "#fff" }}>View Plans</Button>
                    <Button size="sm" variant="outline" onClick={() => setLockOpen(false)}>Close</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Filter row */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-[280px]" placeholder="Search by page URL…"
                   value={query} onChange={(e)=>{ setQuery(e.target.value); requestFirstPage(); }} />
            <label className="flex items-center gap-2 text-sm ml-1">
              <Checkbox checked={onlyUnder} onCheckedChange={(v)=>{ setOnlyUnder(Boolean(v)); requestFirstPage(); }}/>
              <span>Show pages with Scroll Score &lt; 60%</span>
            </label>
          </div>
        </CardContent>

        {/* Content */}
        <CardContent className="p-0">
          {view === "cards" ? (
            showLoading ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Loading scroll-depth data...
              </div>
            ) : showEmpty ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No scroll-depth rows for your filters.
              </div>
            ) : (
              <div className="p-3" ref={tableScrollRef}>
                <Cards />
              </div>
            )
          ) : showLoading ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Loading scroll-depth data...
            </div>
          ) : showEmpty ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              No scroll-depth rows for your filters.
            </div>
          ) : (
            <div ref={tableScrollRef} className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
              <Table className="text-sm">
                <TableHeader className="bg-white sticky top-0 z-40">
                  <TableRow>
                    {COLS.filter(c => visibleCols[c.key] !== false).map(c => (
                      <TableHead key={c.key}
                                 style={{ minWidth: c.width, width: c.width }}
                                 className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}>
                        {c.sortable ? (
                          <span className="relative group cursor-help">
                            <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={()=>toggleSort(c.key)}>
                              <span>{c.label}</span>
                              {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
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
                  {displayRows.map(r => (
                    <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                      {/* Page URL */}
                      {visibleCols.pageUrl !== false && (
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a className="font-medium underline cursor-pointer" style={{ color: TK.action }}
                                  //  onClick={() => console.log("Open Page Analyzer:", r.fullUrl)}
                                  onClick={openDrawer}
                                   >
                                  {r.pageUrl.length <= 42 ? r.pageUrl : r.pageUrl.slice(0, 29) + "…" + r.pageUrl.slice(-10)}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>{r.fullUrl}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      {/* Full buckets or GA4 90% */}
                      {mode === "full" ? (
                        <>
                          {visibleCols.p25 !== false && (
                            <PctCell label="25%" v={r.p25 ?? 0} total={r.sessions} />
                          )}
                          {visibleCols.p50 !== false && (
                            <PctCell label="50%" v={r.p50 ?? 0} total={r.sessions} />
                          )}
                          {visibleCols.p75 !== false && (
                            <PctCell label="75%" v={r.p75 ?? 0} total={r.sessions} />
                          )}
                          {visibleCols.p100 !== false && (
                            <PctCell label="100%" v={r.p100 ?? 0} total={r.sessions} />
                          )}
                        </>
                      ) : (
                        visibleCols.scrolled90 !== false && (
                          <PctCell label="90%" v={r.scrolled90Pct ?? 0} total={r.sessions} />
                        )
                      )}

                      {/* Avg Time */}
                      {visibleCols.avgTime !== false && (
                        <TableCell className="text-center">{mmss(r.avgEngagementSec)}</TableCell>
                      )}

                      {/* Score */}
                      {visibleCols.scrollScore !== false && (
                        <TableCell className="text-center"><ScoreBadge score={r.scrollScore} /></TableCell>
                      )}

                      {/* Actions */}
                      {visibleCols.actions !== false && (
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1.5 opacity-70 hover:opacity-100 transition">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="text-[#4286F5]" aria-label="View Page"
                                          onClick={()=>console.log("Open Page", r.fullUrl)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open Page Analyzer</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" aria-label="Create UX Task"
                                          onClick={()=>console.log("Assign Task", r.fullUrl)}>
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Create UX Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="flex items-center gap-2">
              <span>
                Showing <b>{totalRecords === 0 ? 0 : rangeStart}</b>-
                <b>{rangeEnd}</b> of <b>{totalRecords}</b>
              </span>
              {loading && displayRows.length > 0 && (
                <span className="italic text-muted-foreground">Updating...</span>
              )}
            </div>
            {onPageChange && (
              <AntPagination
                size="small"
                current={currentPage}
                total={totalRecords}
                pageSize={pageSize}
                showSizeChanger={false}
                onChange={(pageNumber, nextPageSize) => {
                  if (tableScrollRef.current) {
                    tableScrollRef.current.scrollTo({ top: 0 });
                  }
                  onPageChange(pageNumber, nextPageSize);
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/** Percent cell w/ gradient bar + count tooltip */
const PctCell: React.FC<{ label: string; v: number; total: number }> = ({ label, v, total }) => (
  <TableCell className="text-center">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            <Bar value={v} label={pf(v)} aria={`${label} scroll reach`} />
            <div className="text-[11px] text-muted-foreground">
              {nf(Math.round((v/100) * total))} users
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>{nf(Math.round((v/100) * total))} sessions reached {label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </TableCell>
);





