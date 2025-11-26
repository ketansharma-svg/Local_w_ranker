"use client";

/* ===========================================================================
   Wranker – Section 6 (Drawer): Device Performance Breakdown
   Refinements:
   - Inter / Inter Fallback font stack applied
   - No emoji anywhere
   - Branded (#008CCD) icons for section title, device type, action type
   - Pointer cursor on all clickable elements
   - Keeps modular chips + toggle switch patterns from recent designs
   =========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Search as SearchIcon,
  Info,
  ClipboardList,
  Globe,
  Laptop,
  Smartphone,
  Tablet as TabletIcon,
  FileDown,
  ImageDown,
  X as XIcon,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

/* ───────────────────────── Tokens / Theme ───────────────────────── */
const TK = {
  surface: "var(--wr-surface, #FFFFFF)",
  surfaceMuted: "var(--wr-surface-muted, #FAFBFF)",
  border: "var(--wr-border-subtle, #E5E7EB)",
  text: "var(--wr-text-strong, #111827)",
  subtle: "var(--wr-text-subtle, #6B7280)",
  brand: "var(--wr-accent, #008CCD)", // branded
  positive: "var(--wr-positive-600, #10B981)",
  warning: "var(--wr-warning-600, #F59E0B)",
  negative: "var(--wr-negative-600, #EF4444)",
  radius: "8px",
  font:
    'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
};

/* ───────────────────────── Types ───────────────────────── */
type DeviceKey = "mobile" | "desktop" | "tablet";
type DeviceRow = {
  device: DeviceKey;
  clicks: number;
  impressions: number;
  ctr: number | null; // ratio 0..1
  position: number | null; // rank (lower is better)
};
type Telemetry =
  | "device_table_sort"
  | "device_table_filter"
  | "device_task_open"
  | "device_export";

type DrawerContext = { dateRangeLabel?: string; device?: string; country?: string };

type Props = {
  query: string;
  rows?: DeviceRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAssignTask?: (payload: { query: string; device: DeviceKey }) => void;
  onOpenSerp?: (payload: { query: string; device: DeviceKey }) => void; // Phase 1.1+
  onTelemetry?: (ev: Telemetry, payload: Record<string, any>) => void;
  drawerContext?: DrawerContext;
  showCompareToggle?: boolean; // default true – adds "Compare vs avg" switch
};

/* ───────────────────────── Utils ───────────────────────── */
const compact = (n: number) => {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "K";
  return String(Math.round(n));
};
const pct = (v: number | null | undefined, d = 2) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const devLabel: Record<DeviceKey, string> = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };
const devIcon: Record<DeviceKey, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  mobile: Smartphone,
  desktop: Laptop,
  tablet: TabletIcon,
};

/* ───────────────────────── Mock data (demo-ready) ───────────────────────── */
function makeDemoRows(): DeviceRow[] {
  return [
    { device: "mobile", clicks: 1200, impressions: 22500, ctr: 0.0533, position: 6.1 },
    { device: "desktop", clicks: 910, impressions: 10200, ctr: 0.0892, position: 4.7 },
    { device: "tablet", clicks: 73, impressions: 830, ctr: 0.0879, position: 5.8 },
  ];
}

/* ───────────────────────── Column defs ───────────────────────── */
type ColKey = "device" | "clicks" | "impr" | "ctr" | "pos" | "insights" | "actions";
type ColDef = { key: ColKey; label: string; width?: number; sortable?: boolean; sticky?: boolean; tip?: string };
const COLS: ColDef[] = [
  { key: "device", label: "Device", width: 220, sortable: true, sticky: true, tip: "Device type from GSC (Desktop · Mobile · Tablet)." },
  { key: "clicks", label: "Clicks", width: 120, sortable: true, tip: "Organic clicks from Google Search for this query." },
  { key: "impr", label: "Impressions", width: 140, sortable: true, tip: "Times shown in Google Search for this query." },
  { key: "ctr", label: "CTR (%)", width: 120, sortable: true, tip: "CTR = Clicks ÷ Impressions." },
  { key: "pos", label: "Avg. Position", width: 140, sortable: true, tip: "Average rank (lower is better)." },
  { key: "insights", label: "Insights", width: 180, tip: "Contextual flag based on thresholds/deltas." },
  { key: "actions", label: "Actions", width: 160, tip: "Assign Task · View Device SERP (Phase 1.1+)" },
];

/* ───────────────────────── Small UI helpers ───────────────────────── */
const HeaderTip: React.FC<{ tip?: string; children: React.ReactNode }> = ({ tip, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          {tip ? <Info className="h-3.5 w-3.5 text-[#9E9E9E]" /> : null}
        </span>
      </TooltipTrigger>
      {tip && <TooltipContent side="top" className="max-w-[280px] text-xs">{tip}</TooltipContent>}
    </Tooltip>
  </TooltipProvider>
);

function CtrBadge({ ctr, baselineCtr }: { ctr: number | null; baselineCtr?: number | null }) {
  if (ctr == null || !Number.isFinite(ctr)) return <span className="text-muted-foreground">—</span>;
  const v = ctr * 100;
  const isGreen = v > 8;
  const isRed = v < 1;
  const bg = isGreen ? TK.positive : isRed ? TK.negative : "#E9EEF5";
  const fg = isGreen || isRed ? "#FFFFFF" : TK.text;
  const delta = baselineCtr != null ? v - baselineCtr * 100 : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: bg, color: fg }}>
            {v.toFixed(2)}%
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <div><b>CTR</b> = Clicks ÷ Impressions</div>
          {delta != null && <div className="text-muted-foreground mt-1">Compared to device average: {delta >= 0 ? "+" : ""}{delta.toFixed(2)} pp</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const InsightTag: React.FC<{ tone: "ok" | "warn"; children: React.ReactNode }> = ({ tone, children }) => {
  const bg = tone === "ok" ? TK.positive : TK.warning;
  const Icon = tone === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded text-xs" style={{ background: bg, color: "#fff" }}>
      <Icon size={14} style={{ color: "#fff" }} />
      {children}
    </span>
  );
};

/* ───────────────────────── Component ───────────────────────── */
export default function DeviceBreakdownTable({
  query,
  rows,
  loading,
  error,
  onRetry,
  onAssignTask,
  onOpenSerp,
  onTelemetry,
  drawerContext,
  showCompareToggle = true,
}: Props) {
  /* Data */
  const baseRows: DeviceRow[] = useMemo(() => (rows && rows.length ? rows : makeDemoRows()), [rows]);

  /* Search & quick filters (chips) */
  const [qFilter, setQFilter] = useState("");
  const [chipHighCtr, setChipHighCtr] = useState(false); // > 8%
  const [chipLowCtr, setChipLowCtr] = useState(false); // < 1%
  const [chipLowImpr, setChipLowImpr] = useState(false); // < 1,000
  const [compareOn, setCompareOn] = useState<boolean>(showCompareToggle ? false : false);

  /* Sorting (default: Clicks DESC) */
  const [sortBy, setSortBy] = useState<ColKey>("clicks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    const c = COLS.find((x) => x.key === key);
    if (!c?.sortable) return;
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
    onTelemetry?.("device_table_sort", {
      surface: "drawer",
      by: key,
      dir: sortBy !== key ? "desc" : sortDir === "asc" ? "desc" : "asc",
    });
  };
  const headerSortIcon = (key: ColKey) =>
    sortBy === key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;

  /* Baselines (for deltas & flags) */
  const baselineCtr = useMemo(() => {
    const vals = baseRows
      .map((r) => (r.ctr != null ? r.ctr : r.impressions ? r.clicks / r.impressions : null))
      .filter((x): x is number => x != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [baseRows]);

  const filtered = useMemo(() => {
    const q = qFilter.trim().toLowerCase();
    return baseRows.filter((r) => {
      const ctrVal = r.ctr != null ? r.ctr : r.impressions ? r.clicks / r.impressions : null;
      const ctrPct = ctrVal != null ? ctrVal * 100 : null;
      const name = devLabel[r.device].toLowerCase();

      if (q && !name.includes(q)) return false;
      if (chipHighCtr && !(ctrPct != null && ctrPct > 8)) return false;
      if (chipLowCtr && !(ctrPct != null && ctrPct < 1)) return false;
      if (chipLowImpr && !(r.impressions < 1000)) return false;
      return true;
    });
  }, [baseRows, qFilter, chipHighCtr, chipLowCtr, chipLowImpr]);

  const getVal = (r: DeviceRow, key: ColKey): any => {
    switch (key) {
      case "device":
        return devLabel[r.device].toLowerCase();
      case "clicks":
        return r.clicks;
      case "impr":
        return r.impressions;
      case "ctr":
        return r.ctr != null ? r.ctr : r.impressions ? r.clicks / r.impressions : -Infinity;
      case "pos":
        return r.position != null ? r.position : Infinity;
      default:
        return 0;
    }
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getVal(a, sortBy);
      const bv = getVal(b, sortBy);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Export (CSV & PNG) */
  const tableRef = useRef<HTMLDivElement | null>(null);
  const exportCSV = useCallback(() => {
    const headers = ["Device", "Clicks", "Impressions", "CTR (%)", "Avg. Position"];
    const lines = sorted.map((r) => {
      const ctrVal = r.ctr != null ? r.ctr : r.impressions ? r.clicks / r.impressions : 0;
      return [devLabel[r.device], r.clicks, r.impressions, (ctrVal * 100).toFixed(2) + "%", r.position != null ? r.position.toFixed(1) : "—"]
        .map((x) => JSON.stringify(String(x)))
        .join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `device-breakdown_${query.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    onTelemetry?.("device_export", { surface: "drawer", format: "csv", rows: sorted.length });
  }, [sorted, query, onTelemetry]);

  const exportPNG = useCallback(async () => {
    try {
      const node = tableRef.current;
      if (!node) return exportCSV();
      const rect = node.getBoundingClientRect();
      const width = Math.max(640, Math.ceil(rect.width));
      const height = Math.max(300, Math.ceil(rect.height));

      const clone = node.cloneNode(true) as HTMLElement;
      clone.style.margin = "0";
      clone.style.padding = "0";
      const serializer = new XMLSerializer();
      const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${TK.font}; background:#fff; color:#111827;">
            ${clone.outerHTML}
          </div>
        </foreignObject>
      </svg>`;
      const svgBlob = new Blob([s], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      const scale = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL("image/png");
      URL.revokeObjectURL(url);

      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `device-breakdown_${query.replace(/\s+/g, "-")}.png`;
      a.click();

      onTelemetry?.("device_export", { surface: "drawer", format: "png", rows: sorted.length });
    } catch {
      exportCSV();
    }
  }, [sorted.length, query, onTelemetry, exportCSV]);

  /* A11y label */
  const ariaLabel =
    `Device breakdown for "${query}" — sorted by ${COLS.find((c) => c.key === sortBy)?.label ?? sortBy} (${sortDir}).` +
    (drawerContext?.dateRangeLabel ? ` Date: ${drawerContext.dateRangeLabel}.` : "") +
    (drawerContext?.device ? ` Device: ${drawerContext.device}.` : "") +
    (drawerContext?.country ? ` Country: ${drawerContext.country}.` : "");

  /* UI state */
  const showEmpty = !loading && !error && sorted.length === 0;

  /* Sticky left style */
  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? {
          position: "sticky" as const,
          left: 0,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        }
      : undefined;

  /* Telemetry: filters */
  useEffect(() => {
    onTelemetry?.("device_table_filter", {
      surface: "drawer",
      q: qFilter || "",
      chips: [...(chipHighCtr ? ["high_ctr"] : []), ...(chipLowCtr ? ["low_ctr"] : []), ...(chipLowImpr ? ["low_impr"] : [])],
      compareOn,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qFilter, chipHighCtr, chipLowCtr, chipLowImpr, compareOn]);

  /* Card grid (mobile) helpers */
  const ctrAvgPct = baselineCtr != null ? baselineCtr * 100 : null;

  return (
    <section aria-label={ariaLabel} className="space-y-3" style={{ fontFamily: TK.font }}>
      <Card className="border mx-4" style={{ borderColor: TK.border, borderRadius: TK.radius, background: TK.surface }}>
        {/* Header */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: `1px solid ${TK.border}` }}>
          <div className="flex items-center gap-2">
            <Laptop className="h-5 w-5" style={{ color: TK.brand }} />
            <CardTitle className="text-lg">Device breakdown</CardTitle>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset"
              style={{ background: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" }}
            >
              GSC
            </span>
          </div>

          {/* Export dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 px-3" style={{ cursor: "pointer" }}>
                <Download className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Export
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={exportCSV} style={{ cursor: "pointer" }}>
                <FileDown className="h-4 w-4" style={{ color: TK.brand }} /> CSV
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2" onClick={exportPNG} style={{ cursor: "pointer" }}>
                <ImageDown className="h-4 w-4" style={{ color: TK.brand }} /> PNG (table)
              </Button>
            </PopoverContent>
          </Popover>
        </CardHeader>

        {/* Filter bar */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.border }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search device */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[260px] pl-7"
                placeholder="Filter by device… (Desktop, Mobile, Tablet)"
                value={qFilter}
                onChange={(e) => setQFilter(e.target.value)}
              />
            </div>

            {/* Chips (modular) */}
            <button
              onClick={() => setChipHighCtr((v) => !v)}
              className={`h-8 px-3 rounded-full border text-sm ${chipHighCtr ? "font-semibold" : ""}`}
              style={{
                borderColor: TK.border,
                background: chipHighCtr ? "color-mix(in srgb, var(--wr-positive-600,#10B981) 16%, white)" : "#fff",
                cursor: "pointer",
              }}
            >
              High CTR (&gt; 8%)
            </button>
            <button
              onClick={() => setChipLowCtr((v) => !v)}
              className={`h-8 px-3 rounded-full border text-sm ${chipLowCtr ? "font-semibold" : ""}`}
              style={{
                borderColor: TK.border,
                background: chipLowCtr ? "color-mix(in srgb, var(--wr-negative-600,#EF4444) 16%, white)" : "#fff",
                cursor: "pointer",
              }}
            >
              Low CTR (&lt; 1%)
            </button>
            <button
              onClick={() => setChipLowImpr((v) => !v)}
              className={`h-8 px-3 rounded-full border text-sm ${chipLowImpr ? "font-semibold" : ""}`}
              style={{
                borderColor: TK.border,
                background: chipLowImpr ? "color-mix(in srgb, var(--wr-warning-600,#F59E0B) 16%, white)" : "#fff",
                cursor: "pointer",
              }}
            >
              Low Impressions (&lt; 1,000)
            </button>

            {/* Compare to avg toggle */}
            {showCompareToggle && (
              <div className="ml-auto inline-flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Compare vs device avg</span>
                <Switch checked={compareOn} onCheckedChange={setCompareOn} />
              </div>
            )}
          </div>
        </CardContent>

        {/* Error / Loading / Empty */}
        {error && (
          <div className="px-4 py-3 border-b" style={{ borderColor: TK.border }}>
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XIcon className="h-4 w-4" /> {error}
              {onRetry && (
                <Button size="sm" variant="outline" className="ml-2" onClick={onRetry} style={{ cursor: "pointer" }}>
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}
        {loading && (
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.border }}>
              <div className="animate-pulse p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 rounded bg-gray-100" />
                ))}
              </div>
            </div>
          </CardContent>
        )}
        {showEmpty && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No data for these filters. Try a longer date range or a different segment.
          </div>
        )}

        {/* ===== Table (md+) ===== */}
        {!loading && !showEmpty && (
          <CardContent className="p-0 hidden md:block" ref={tableRef}>
            <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.border }}>
              <Table className="text-sm">
                <TableHeader className="bg-white sticky top-0 z-20">
                  <TableRow className="hover:bg-white">
                    {COLS.map((c) => (
                      <TableHead key={c.key} style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }} className="text-left">
                        {c.sortable ? (
                          <button
                            className="inline-flex items-center gap-1 hover:text-foreground"
                            onClick={() => toggleSort(c.key)}
                            aria-pressed={sortBy === c.key}
                            style={{ cursor: "pointer" }}
                          >
                            <HeaderTip tip={c.tip}>
                              <span>{c.label}</span>
                            </HeaderTip>
                            {headerSortIcon(c.key)}
                          </button>
                        ) : (
                          <HeaderTip tip={c.tip}>
                            <span>{c.label}</span>
                          </HeaderTip>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sorted.map((r) => {
                    const Icon = devIcon[r.device];
                    const ctrVal = r.ctr != null ? r.ctr : r.impressions ? r.clicks / r.impressions : null;
                    const belowAvgOnMobile = r.device === "mobile" && baselineCtr != null && ctrVal != null && ctrVal < baselineCtr;

                    const insight =
                      ctrVal == null ? null : ctrVal * 100 < 1 ? (
                        <InsightTag tone="warn">Low CTR</InsightTag>
                      ) : belowAvgOnMobile ? (
                        <InsightTag tone="warn">Mobile CTR below avg</InsightTag>
                      ) : (
                        <InsightTag tone="ok">Solid</InsightTag>
                      );

                    return (
                      <TableRow key={r.device} className="hover:bg-[#F8FAFC]">
                        {/* Device */}
                        <TableCell style={stickyStyle(COLS[0]) as any} className="text-left">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: TK.brand }} />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium">{devLabel[r.device]}</span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Device key: <code>{r.device}</code></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>

                        {/* Clicks */}
                        <TableCell className="text-left">{compact(r.clicks)}</TableCell>

                        {/* Impressions */}
                        <TableCell className="text-left">{compact(r.impressions)}</TableCell>

                        {/* CTR */}
                        <TableCell className="text-left">{compareOn ? <CtrBadge ctr={ctrVal} baselineCtr={baselineCtr ?? undefined} /> : <CtrBadge ctr={ctrVal} />}</TableCell>

                        {/* Avg. Position */}
                        <TableCell className="text-left">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{r.position != null ? r.position.toFixed(1) : "—"}</span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Average rank in this device. Lower is better.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* Insights */}
                        <TableCell className="text-left">{insight ?? <span className="text-muted-foreground">—</span>}</TableCell>

                        {/* Actions (branded icons) */}
                        <TableCell className="text-left">
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2"
                                    aria-label={`Assign task for ${devLabel[r.device]}`}
                                    onClick={() => {
                                      onTelemetry?.("device_task_open", { surface: "drawer", query, device: r.device });
                                      onAssignTask
                                        ? onAssignTask({ query, device: r.device })
                                        : alert(`Task: Review ${devLabel[r.device]} UX for “${query}”`);
                                    }}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <ClipboardList className="h-4 w-4 mr-1" style={{ color: TK.brand }} />
                                    Assign Task
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Assign device‑specific optimization task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Phase 1.1+ */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2"
                                    aria-label={`Open SERP snapshot for ${devLabel[r.device]}`}
                                    onClick={() =>
                                      onOpenSerp
                                        ? onOpenSerp({ query, device: r.device })
                                        : alert(`Open SERP snapshot — ${devLabel[r.device]} (${query})`)
                                    }
                                    style={{ cursor: "pointer" }}
                                  >
                                    <Globe className="h-4 w-4" style={{ color: TK.brand }} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View device‑specific SERP (Phase 1.1+)</TooltipContent>
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
          </CardContent>
        )}

        {/* ===== Card grid (sm) ===== */}
        {!loading && !showEmpty && (
          <CardContent className="md:hidden">
            <div className="grid grid-cols-1 gap-3">
              {sorted.map((r) => {
                const Icon = devIcon[r.device];
                const ctrVal = r.ctr != null ? r.ctr : r.impressions ? r.clicks / r.impressions : null;
                const belowAvgOnMobile = r.device === "mobile" && baselineCtr != null && ctrVal != null && ctrVal < baselineCtr;

                const TrendIcon =
                  ctrAvgPct != null && ctrVal != null ? (ctrVal * 100 >= ctrAvgPct ? TrendingUp : TrendingDown) : null;

                return (
                  <div key={r.device} className="rounded border p-3" style={{ borderColor: TK.border, background: TK.surface }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: TK.brand }} />
                        <div className="text-sm font-medium">{devLabel[r.device]}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{r.position != null ? `Pos: ${r.position.toFixed(1)}` : "Pos: —"}</div>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">Clicks</div>
                        <div className="font-medium">{compact(r.clicks)}</div>
                      </div>
                      <div className="flex items-end gap-1">
                        <div>
                          <div className="text-muted-foreground text-xs">CTR</div>
                          <div className="font-medium">{pct(ctrVal, 2)}</div>
                        </div>
                        {TrendIcon && <TrendIcon className="h-4 w-4" style={{ color: TK.brand }} />}
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Impr.</div>
                        <div className="font-medium">{compact(r.impressions)}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs">
                        {ctrVal != null ? (
                          r.ctr! * 100 < 1 || belowAvgOnMobile ? (
                            <InsightTag tone="warn">{r.device === "mobile" ? "Mobile CTR below avg" : "Low CTR"}</InsightTag>
                          ) : (
                            <InsightTag tone="ok">Solid</InsightTag>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => {
                            onTelemetry?.("device_task_open", { surface: "drawer", query, device: r.device });
                            onAssignTask
                              ? onAssignTask({ query, device: r.device })
                              : alert(`Task: Review ${devLabel[r.device]} UX for “${query}”`);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <ClipboardList className="h-4 w-4 mr-1" style={{ color: TK.brand }} />
                          Task
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() =>
                            onOpenSerp
                              ? onOpenSerp({ query, device: r.device })
                              : alert(`Open SERP snapshot — ${devLabel[r.device]} (${query})`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <Globe className="h-4 w-4" style={{ color: TK.brand }} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </section>
  );
}
