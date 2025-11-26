import * as React from "react";
import {
  Info, Download, ChevronsUpDown, ChevronUp, ChevronDown,
  Search as SearchIcon, Filter as FilterIcon, ExternalLink, PlugZap,
  BarChart3, Leaf, DollarSign, Users, Mail, Share2, MousePointer, Globe, Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";
/* =========================
   Theme tokens / constants
   ========================= */
const HEX = {
  brand: "#008CCD", // branded icon color
  link:  "#0077FF", // link blue
};

const TK = {
  border: "border-gray-200",
  borderLight: "border-gray-100",
  text: "text-gray-900",
  muted: "text-gray-500",
};

/* =========================
   Types & helpers
   ========================= */
type SourceType = "Organic" | "Paid" | "Direct" | "Referral" | "Social" | "Email" | "Other";

export type SourceRow = {
  id: string;
  sourceMedium: string;     // e.g., "google / organic"
  sourceType: SourceType;   // normalized bucket
  sessions: number;         // GA4
  engagementRate: number;   // 0..1
  bounceRate: number;       // 0..1
  avgTimeSec: number;       // GA4 (seconds)
  conversions?: number;     // GA4
  // GSC (only for Organic)
  organicCtr?: number;      // 0..1
  avgPosition?: number;     // rank number
};

type SortKey =
  | "sourceMedium" | "sessions" | "bounceRate" | "engagementRate"
  | "avgTimeSec" | "conversions" | "organicCtr" | "avgPosition";

type TableProps = {
  data?: SourceRow[];
  gscConnected?: boolean;
  onOpenSearchPerformance?: (row: SourceRow, metric: "ctr" | "position") => void;
  className?: string;
};

const nf = (n: number) => new Intl.NumberFormat().format(Math.round(n));
const pf = (v: number, fd = 0) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(v * 100)}%`;
const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};
const cls = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
const byTypeColor: Record<SourceType, string> = {
  Organic: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Paid: "bg-purple-50 text-purple-700 border-purple-200",
  Direct: "bg-gray-100 text-gray-700 border-gray-200",
  Referral: "bg-amber-50 text-amber-700 border-amber-200",
  Social: "bg-sky-50 text-sky-700 border-sky-200",
  Email: "bg-blue-50 text-blue-700 border-blue-200",
  Other: "bg-slate-50 text-slate-700 border-slate-200",
};

/* =========================
   Visible, branded icons
   ========================= */

// Branded glyph used in headers, etc. (swaps the masked SVG with a visible Lucide icon)
function BrandIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <BarChart3 className={className} color={HEX.brand} aria-hidden />;
}

// Type-specific icon (used in Source/Medium column & Type chips)
function TypeIcon({ type, className = "h-4 w-4" }: { type: SourceType | "All"; className?: string }) {
  const common = { className, color: HEX.brand, "aria-hidden": true } as const;
  switch (type) {
    case "Organic":  return <Leaf {...common} />;
    case "Paid":     return <DollarSign {...common} />;
    case "Direct":   return <MousePointer {...common} />;
    case "Referral": return <Share2 {...common} />;
    case "Social":   return <Users {...common} />;
    case "Email":    return <Mail {...common} />;
    case "Other":    return <Globe {...common} />;
    default:         return <LinkIcon {...common} />; // "All" / fallback
  }
}

/* =========================
   Mock data (demo ready)
   ========================= */
const MOCK: SourceRow[] = [
  { id: "g-org", sourceMedium: "google / organic", sourceType: "Organic",
    sessions: 12430, engagementRate: 0.62, bounceRate: 0.38, avgTimeSec: 152, conversions: 280,
    organicCtr: 0.042, avgPosition: 8.3 },
  { id: "direct", sourceMedium: "direct / (none)", sourceType: "Direct",
    sessions: 8140, engagementRate: 0.43, bounceRate: 0.57, avgTimeSec: 69, conversions: 130 },
  { id: "fb-ref", sourceMedium: "facebook / referral", sourceType: "Referral",
    sessions: 3540, engagementRate: 0.26, bounceRate: 0.74, avgTimeSec: 41, conversions: 20 },
  { id: "g-cpc", sourceMedium: "google / cpc", sourceType: "Paid",
    sessions: 1830, engagementRate: 0.32, bounceRate: 0.68, avgTimeSec: 64, conversions: 110 },
  { id: "bing-org", sourceMedium: "bing / organic", sourceType: "Organic",
    sessions: 620, engagementRate: 0.51, bounceRate: 0.49, avgTimeSec: 108, conversions: 24,
    organicCtr: 0.031, avgPosition: 17.5 },
  { id: "yt-ref", sourceMedium: "youtube / referral", sourceType: "Social",
    sessions: 460, engagementRate: 0.39, bounceRate: 0.61, avgTimeSec: 72, conversions: 14 },
  { id: "email", sourceMedium: "email / campaign", sourceType: "Email",
    sessions: 230, engagementRate: 0.55, bounceRate: 0.45, avgTimeSec: 93, conversions: 18 },
  { id: "yahoo-org", sourceMedium: "yahoo / organic", sourceType: "Organic",
    sessions: 120, engagementRate: 0.47, bounceRate: 0.53, avgTimeSec: 88, conversions: 5,
    organicCtr: 0.027, avgPosition: 22.3 },
  { id: "ghost", sourceMedium: "other / (none)", sourceType: "Other",
    sessions: 0, engagementRate: 0.0, bounceRate: 1.0, avgTimeSec: 0, conversions: 0 },
];

/* ============== Export CSV (filtered+sorted) ============== */
function exportCsv(rows: SourceRow[]) {
  const header = [
    "Source / Medium", "Type", "Sessions", "Bounce Rate", "Eng. Rate", "Avg. Time (mm:ss)",
    "Conversions", "CTR (Organic)", "Avg. Position (Organic)"
  ].join(",");
  const body = rows.map(r => [
    JSON.stringify(r.sourceMedium),
    r.sourceType,
    r.sessions,
    (r.bounceRate ?? 0).toFixed(4),
    (r.engagementRate ?? 0).toFixed(4),
    mmss(r.avgTimeSec),
    r.conversions ?? "",
    r.sourceType === "Organic" ? (r.organicCtr ?? "") : "",
    r.sourceType === "Organic" ? (r.avgPosition ?? "") : "",
  ].join(","));
  const blob = new Blob([header + "\n" + body.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "traffic-source-breakdown.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* =========================
   Component
   ========================= */
export default function SourceBreakdownTable({
  data,
  gscConnected = true,
  onOpenSearchPerformance,
  className
}: TableProps) {
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] =
    React.useState<"All" | SourceType>("All");
  const [sortBy, setSortBy] = React.useState<SortKey>("sessions");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [showZero, setShowZero] = React.useState(false);

  // Filter
  const filtered:any = React.useMemo(() => {
    return data?.filter(r => {
      if (!showZero && r.sessions === 0) return false;
      if (filterType !== "All" && r.sourceType !== filterType) return false;
      if (search && !r.sourceMedium.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, filterType, search, showZero]);

  // Sort
  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const getv = (r: SourceRow) => {
      switch (sortBy) {
        case "sourceMedium": return r.sourceMedium.toLowerCase();
        case "sessions": return r.sessions;
        case "bounceRate": return r.bounceRate;
        case "engagementRate": return r.engagementRate;
        case "avgTimeSec": return r.avgTimeSec;
        case "conversions": return r.conversions ?? -1;
        case "organicCtr": return r.organicCtr ?? -1;
        case "avgPosition": return r.avgPosition ?? 9999;
      }
    };
    arr.sort((a, b) => {
      const av = getv(a) as any; const bv = getv(b) as any;
      if (av === bv) return 0;
      const res = av > bv ? 1 : -1;
      return sortDir === "asc" ? res : -res;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const win = sorted.slice(start, start + pageSize);

  function toggleSort(k: SortKey) {
    if (sortBy !== k) { setSortBy(k); setSortDir("asc"); }
    else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  }

  const SortBtn: React.FC<{ active: boolean }> = ({ active }) => (
    active ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
           : <ChevronsUpDown className="h-4 w-4 text-gray-400" />
  );

  const ColHead: React.FC<{
    label: string; sortKey?: SortKey; right?: boolean; tooltip?: string; width?: string; withBrandIcon?: boolean;
  }> = ({ label, sortKey, right, tooltip, width, withBrandIcon }) => (
    <th
      className={cls("px-3 py-2 text-sm font-semibold bg-white sticky top-0 z-30",
        TK.text, right && "text-right")}
      style={{ minWidth: width }}
      title={tooltip}
    >
      {sortKey ? (
        <button
          className="inline-flex items-center gap-1 hover:underline"
          onClick={() => toggleSort(sortKey)}
        >
          {withBrandIcon && <BrandIcon className="h-3.5 w-3.5" />}
          <span>{label}</span>
          <SortBtn active={sortBy === sortKey} />
        </button>
      ) : (
        <span className="inline-flex items-center gap-1">
          {withBrandIcon && <BrandIcon className="h-3.5 w-3.5" />}
          {label}
          {tooltip && <Info className="h-3.5 w-3.5 text-gray-400" />}
        </span>
      )}
    </th>
  );

  return (
    <section
      className={cls("rounded-md border bg-white mt-4", TK.border, className)}
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Traffic Source Breakdown"
    >
      {/* ===== Section header: Title + Export ===== */}
      <div className={cls("flex items-center justify-between px-3 py-3 border-b", TK.borderLight)}>
        <div className="flex items-center gap-2">
          <BrandIcon className="h-5 w-5" />
          <h2 className=" font-semibold text-black" >
            Traffic Source Breakdown
          </h2>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-white"
          style={{ backgroundColor: HEX.brand }}
          onClick={() => exportCsv(sorted)}
          aria-label="Export Traffic Source Breakdown (CSV)"
          title="Export CSV"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* ===== Filters row (below header) ===== */}
      <div className={cls("flex flex-wrap items-center gap-2 p-3 border-b", TK.borderLight)}>
        {/* Type chips */}
        {(["All","Organic","Paid","Referral","Direct","Social","Email","Other"] as const).map((t) => {
          const active = filterType === t;
          return (
            <button
              key={t}
              className={cls(
                "h-9 px-3 rounded-md border text-sm",
                active ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-white",
                "hover:bg-gray-50"
              )}
              onClick={() => { setFilterType(t); setPage(1); }}
            >
              <span className="inline-flex items-center gap-1">
                <TypeIcon type={t} className="h-3.5 w-3.5" />
                {t}
              </span>
            </button>
          );
        })}

        {/* Search input */}
        <div className="relative ml-1">
          <input
            className={cls("h-9 w-[280px] rounded-md border pl-9 pr-2 text-sm", TK.border)}
            placeholder="Search source / medium…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        {/* Zero toggle */}
        <label className="ml-2 inline-flex select-none items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={showZero}
            onChange={(e) => setShowZero(e.target.checked)}
          />
          Show 0‑traffic sources
        </label>

        {/* Rows/page control */}
        <div className="ml-auto inline-flex items-center gap-2 text-sm text-gray-600">
          <FilterIcon className="h-4 w-4 text-gray-400" />
          <span>Rows / page</span>
          <select
            className={cls("h-9 rounded-md border px-2", TK.border)}
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* GSC prompt if disconnected */}
      {!gscConnected && (
        <div className="px-3 py-2 text-sm bg-amber-50 border-b border-amber-200 text-amber-800 flex items-center gap-2">
          <PlugZap className="h-4 w-4" />
          <span>
            Google Search Console not connected — “Organic CTR” and “Avg. Position” are hidden.
            Connect GSC in <span className="font-medium underline" style={{ color: HEX.link }}>Integrations</span>.
          </span>
        </div>
      )}

      {/* Scroll container */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={cls("border-b", TK.borderLight)}>
            <tr>
              <ColHead label="Source / Medium"  sortKey="sourceMedium" width="260px" withBrandIcon />
              <ColHead label="Type" width="140px" withBrandIcon />
              <ColHead label="Sessions" sortKey="sessions" right />
              <ColHead label="Bounce %" sortKey="bounceRate" right tooltip="GA4: percentage of unengaged sessions" />
              <ColHead label="Eng. %" sortKey="engagementRate" right tooltip="GA4: engaged sessions / total" />
              <ColHead label="Avg. Time" sortKey="avgTimeSec" right tooltip="GA4: average engagement time (mm:ss)" />
              <ColHead label="Conversions" sortKey="conversions" right tooltip="GA4: conversion events (if configured)" />
              {gscConnected && (
                <>
                  <ColHead label="CTR (Organic)" sortKey="organicCtr" right tooltip="GSC: Clicks ÷ Impressions" />
                  <ColHead label="Avg. Position" sortKey="avgPosition" right tooltip="GSC: average ranking position" />
                </>
              )}
              <ColHead label="Actions"  tooltip="" />
            </tr>
          </thead>

          <tbody>
            {win.map((r) => {
              const isOrganic = r.sourceType === "Organic";
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50" title={r.sourceMedium}>
                  {/* Source / Medium */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <TypeIcon type={r.sourceType} />
                      <span className="font-medium">{r.sourceMedium}</span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2 flex items-center justify-center">
                    <span className={cls("px-2 py-0.5 rounded border text-xs inline-flex items-center  gap-1", byTypeColor[r.sourceType])}>
                      <TypeIcon type={r.sourceType} className="h-3 w-3" />
                      {r.sourceType}
                    </span>
                  </td>

                  {/* Sessions */}
                  <td className="px-3 py-2 text-right tabular-nums">{nf(r.sessions)}</td>

                  {/* Bounce / Engagement */}
                  <td className="px-3 py-2 text-right tabular-nums">{pf(r.bounceRate, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pf(r.engagementRate, 1)}</td>

                  {/* Avg time */}
                  <td className="px-3 py-2 text-right tabular-nums">{mmss(r.avgTimeSec)}</td>

                  {/* Conversions */}
                  <td className="px-3 py-2 text-right tabular-nums">{r.conversions == null ? "—" : nf(r.conversions)}</td>

                  {/* GSC metrics (only visible if connected) */}
                  {gscConnected && (
                    <>
                      <td className="px-3 py-2 text-right">
                        {isOrganic && r.organicCtr != null ? (
                          <button
                            className="inline-flex items-center gap-1 underline decoration-dotted"
                            style={{ color: HEX.link }}
                            title="Open Search Performance (CTR)"
                            onClick={() => onOpenSearchPerformance?.(r, "ctr")}
                          >
                            {pf(r.organicCtr, 1)} <ExternalLink className="h-3.5 w-3.5" style={{ color: HEX.link }} />
                          </button>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isOrganic && r.avgPosition != null ? (
                          <button
                            className="inline-flex items-center gap-1 underline decoration-dotted"
                            style={{ color: HEX.link }}
                            title="Open Search Performance (Avg. Position)"
                            onClick={() => onOpenSearchPerformance?.(r, "position")}
                          >
                            {r.avgPosition.toFixed(1)} <ExternalLink className="h-3.5 w-3.5" style={{ color: HEX.link }} />
                          </button>
                        ) : "—"}
                      </td>
                    </>
                  )}

                  <td className="px-3 py-2 text-right tabular-nums">
                  <div className="inline-flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 cursor-pointer"
                              onClick={() =>
                                onOpenSearchPerformance
                                  ? alert(`Open Search Performance tab filter: ${r.sourceMedium}`)
                                  : alert(
                                      `Open ${
                                        isOrganic ? "Search Performance" : "Traffic"
                                      } for: ${r.sourceMedium}`
                                    )
                              }
                            >
                              {isOrganic ? "Search Perf." : "Traffic View"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {isOrganic
                              ? "Open Search Performance (GSC) for this source."
                              : "Open Traffic & Engagement view for this source."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-[#4286F5] cursor-pointer"
                        onClick={() => alert(`Open details for: ${r.sourceMedium}`)}
                        aria-label="Open details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>

                  </td>

                </tr>
              );
            })}

            {win.length === 0 && (
              <tr>
                <td colSpan={gscConnected ? 9 : 7} className="px-3 py-8 text-center text-sm text-gray-500">
                  No rows match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className={cls("flex items-center justify-between px-3 py-2 border-t", TK.borderLight)}>
        <div className="text-sm text-gray-500">
          Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + win.length)} of {sorted.length}
        </div>

        <div className="flex items-center gap-2">
          <button
            className={cls("h-8 px-2 rounded-md border text-sm", TK.border)}
            disabled={page <= 1}
            onClick={() => setPage(1)}
          >First</button>
          <button
            className={cls("h-8 px-2 rounded-md border text-sm", TK.border)}
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >Prev</button>
          <div className="w-20 text-center text-sm">{page} / {totalPages}</div>
          <button
            className={cls("h-8 px-2 rounded-md border text-sm", TK.border)}
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >Next</button>
          <button
            className={cls("h-8 px-2 rounded-md border text-sm", TK.border)}
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
          >Last</button>

          <select
            className={cls("h-8 rounded-md border px-2 text-sm", TK.border)}
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>
    </section>
  );
}

/* =========================
   Optional demo wrapper
   ========================= */
export function Demo_SourceBreakdownTable() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-3 text-[15px] font-semibold">Tab 1 · Overview — Traffic Source Breakdown (Table)</div>
      <SourceBreakdownTable
        gscConnected={true}
        onOpenSearchPerformance={(row, metric) =>
          alert(`Deep link → Search Performance\nRow: ${row.sourceMedium}\nMetric: ${metric}`)
        }
      />
    </div>
  );
}
