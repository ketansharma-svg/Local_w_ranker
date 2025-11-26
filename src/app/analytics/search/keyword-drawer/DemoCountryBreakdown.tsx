"use client";

/* ===========================================================================
   Wranker – Section 5 (Drawer): Country-Level Breakdown (Query)
   Refinements applied:
   - Inter / Inter Fallback font stack on the section
   - No emoji usage (flags removed; branded icons used instead)
   - Branded (#008CCD) icons for section title, country and action types
   - Pointer cursor for all clickable elements
   - Modular chips / toggles preserved per recent designs
   =========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Search as SearchIcon,
  Info,
  MapPin as PinIcon,
  Globe2 as GlobeIcon,
  X as XIcon,
} from "lucide-react";

/* ───────────────────────── Tokens / Theme aliases ───────────────────────── */
const TK = {
  surface: "var(--wr-surface, #FFFFFF)",
  surfaceMuted: "var(--wr-surface-muted, #FAFBFF)",
  border: "var(--wr-border-subtle, #E5E7EB)",
  text: "var(--wr-text-strong, #111827)",
  subtle: "var(--wr-text-subtle, #6B7280)",
  brand: "var(--wr-accent, #008CCD)", // branded
  pos600: "var(--wr-positive-600, #10B981)", // green badge
  neg600: "var(--wr-negative-600, #EF4444)", // red badge
  warn600: "var(--wr-warning-600, #F59E0B)", // gold tag
  radius: "8px",
  font:
    'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
};

/* ───────────────────────── Types ───────────────────────── */
export type CountryRow = {
  iso: string;
  name: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  opportunity?: boolean;
};

type ColKey = "country" | "clicks" | "impr" | "ctr" | "pos" | "opp" | "actions";
type SortDir = "asc" | "desc";
type DrawerContext = { dateRangeLabel?: string; device?: string };

type TelemetryEvent =
  | "country_table_sort"
  | "country_table_filter"
  | "country_task_open"
  | "country_serp_open"
  | "country_export";

/* ───────────────────────── Utilities ───────────────────────── */
const compact = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "K"
    : String(n);

const pct2 = (r: number | null | undefined) =>
  r == null ? "—" : `${(r * 100).toFixed(2)}%`;

const isHighCTR = (ctr: number | null | undefined) => !!(ctr != null && ctr * 100 > 8);
const isLowCTR = (ctr: number | null | undefined) => !!(ctr != null && ctr * 100 < 1);

const debounce = (fn: (...a: any[]) => void, ms = 200) => {
  let t: any;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const ISO_NAME: Record<string, string> = {
  US: "United States",
  IN: "India",
  GB: "United Kingdom",
  AU: "Australia",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  SG: "Singapore",
  BR: "Brazil",
  ES: "Spain",
  IT: "Italy",
  JP: "Japan",
  MX: "Mexico",
  AE: "United Arab Emirates",
  ZA: "South Africa",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  PL: "Poland",
};

/* ───────────────────────── Demo data generator ───────────────────────── */
function rng(seed = 42) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function makeCountryRows(n = 30): CountryRow[] {
  const codes = Object.keys(ISO_NAME);
  const R = rng(1337);
  return Array.from({ length: n }, (_, i) => {
    const iso = codes[i % codes.length];
    const name = ISO_NAME[iso] ?? iso;
    const impr = Math.round(800 + R() * 90000); // 0.8K – 90K
    const ctrR = 0.02 + R() * 0.07; // 2% – 9%
    const clicks = Math.round(impr * ctrR);
    const pos = Number((3 + R() * 12).toFixed(1)); // 3 – 15
    const ctr = ctrR;
    const opportunity = ctr > 0.08 && impr < 1000;
    return { iso, name, clicks, impressions: impr, ctr, position: pos, opportunity };
  }).sort((a, b) => b.clicks - a.clicks);
}

/* ───────────────────────── Column defs ───────────────────────── */
type ColDef = {
  key: ColKey;
  label: string;
  width?: number;
  sortable?: boolean;
  sticky?: boolean;
  tip?: string;
  align?: "left" | "right";
};
const COLS: ColDef[] = [
  {
    key: "country",
    label: "Country",
    width: 260,
    sortable: true,
    sticky: true,
    tip: "Country name (hover for ISO code).",
    align: "left",
  },
  {
    key: "clicks",
    label: "Clicks",
    width: 120,
    sortable: true,
    tip: "Total clicks for the selected query in this country.",
    align: "right",
  },
  {
    key: "impr",
    label: "Impressions",
    width: 140,
    sortable: true,
    tip: "Total impressions for the selected query in this country.",
    align: "right",
  },
  {
    key: "ctr",
    label: "CTR (%)",
    width: 120,
    sortable: true,
    tip: "CTR = Clicks ÷ Impressions × 100.",
    align: "right",
  },
  {
    key: "pos",
    label: "Avg. Position",
    width: 120,
    sortable: true,
    tip: "Average rank for this query in this country. Lower is better.",
    align: "right",
  },
  {
    key: "opp",
    label: "Opportunity",
    width: 180,
    sortable: false,
    tip: "High CTR • Low Impr tag (optional).",
    align: "left",
  },
  {
    key: "actions",
    label: "Actions",
    width: 160,
    sortable: false,
    tip: "Assign Regional Task · View Locale SERP",
    align: "left",
  },
];

/* ───────────────────────── Header helper (with tooltip) ───────────────────────── */
const HeaderTip: React.FC<{ tip?: string; children: React.ReactNode }> = ({
  tip,
  children,
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children}
          {tip ? <Info className="h-3.5 w-3.5 text-[#9E9E9E]" /> : null}
        </span>
      </TooltipTrigger>
      {tip && (
        <TooltipContent side="top" className="max-w-[280px] text-xs">
          {tip}
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
);

/* ───────────────────────── Badges & Tags ───────────────────────── */
const CtrBadge: React.FC<{ ctr: number | null; baseline?: number | null }> = ({
  ctr,
  baseline,
}) => {
  if (ctr == null || !isFinite(ctr))
    return <span className="text-muted-foreground">—</span>;
  const val = ctr * 100;
  const hi = val > 8,
    lo = val < 1;
  const bg = hi ? TK.pos600 : lo ? TK.neg600 : "transparent";
  const fg = hi || lo ? "#fff" : TK.text;
  const border = hi || lo ? "transparent" : TK.border;
  const deltaPP = baseline != null ? val - baseline * 100 : null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs"
            style={{
              background: bg,
              color: fg,
              border: `1px solid ${border}`,
              cursor: "default",
            }}
          >
            {val.toFixed(2)}%
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <div>
            <b>CTR</b> vs project avg:{" "}
            {deltaPP == null ? "—" : `${deltaPP >= 0 ? "+" : ""}${deltaPP.toFixed(2)} pp`}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const OpportunityTag: React.FC = () => (
  <span
    className="inline-flex items-center gap-1 px-2 py-[2px] rounded text-[11px]"
    style={{ color: "#fff", background: TK.warn600 }}
  >
    High CTR • Low Impr
  </span>
);

/* ───────────────────────── Export Helpers ───────────────────────── */
async function exportTablePNG(container: HTMLElement, filename: string) {
  const rect = container.getBoundingClientRect();
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.ceil(rect.width);
  const h = Math.ceil(rect.height);

  const html = new XMLSerializer().serializeToString(
    container.cloneNode(true) as Node
  );
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="background:white;width:${w}px;height:${h}px;font-family:${TK.font};">
          ${html}
        </div>
      </foreignObject>
    </svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    return;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

/* ───────────────────────── Branded country label ───────────────────────── */
function CountryIconName({ name, iso }: { name: string; iso: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <GlobeIcon className="h-4 w-4" style={{ color: TK.brand }} />
      <span className="truncate max-w-[200px]">{name}</span>
    </span>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
export function CountryBreakdownTable({
  query,
  rows,
  loading,
  error,
  onRetry,
  onAssignTask,
  onOpenSerp, // optional (Phase 1.1+)
  onTelemetry,
  drawerContext,
  pageSizeOptions = [10, 25, 50, 100],
  persistKey = "wr:country",
}: {
  query: string;
  rows?: CountryRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAssignTask?: (iso: string, name: string, query: string) => void;
  onOpenSerp?: (iso: string, name: string, query: string) => void;
  onTelemetry?: (event: TelemetryEvent, payload: Record<string, any>) => void;
  drawerContext?: DrawerContext;
  pageSizeOptions?: number[];
  persistKey?: string;
}) {
  /* Data */
  const baseRows: CountryRow[] = useMemo(
    () => (rows && rows.length ? rows : makeCountryRows(40)),
    [rows]
  );

  /* Sorting (default: Clicks DESC) */
  const [sortBy, setSortBy] = useState<ColKey>("clicks");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (k: ColKey) => {
    const c = COLS.find((x) => x.key === k);
    if (!c?.sortable) return;
    if (sortBy !== k) {
      setSortBy(k);
      setSortDir("desc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    onTelemetry?.("country_table_sort", { surface: "drawer", by: k, dir: sortDir });
  };

  const headerSortIcon = (key: ColKey) =>
    sortBy === key ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    ) : (
      <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    );

  /* Filters */
  const [q, setQ] = useState("");
  const [chipHighCtr, setChipHighCtr] = useState(false);
  const [chipLowCtr, setChipLowCtr] = useState(false);
  const [chipLowImpr, setChipLowImpr] = useState(false);
  const [chipTop10, setChipTop10] = useState(false);

  // debounced telemetry for filter bar
  const emitFilters = useMemo(
    () => debounce((payload) => onTelemetry?.("country_table_filter", payload), 200),
    [onTelemetry]
  );

  useEffect(() => {
    emitFilters({
      surface: "drawer",
      q,
      chips: [
        chipHighCtr ? "high_ctr" : null,
        chipLowCtr ? "low_ctr" : null,
        chipLowImpr ? "low_impr" : null,
        chipTop10 ? "top10" : null,
      ].filter(Boolean),
    });
  }, [q, chipHighCtr, chipLowCtr, chipLowImpr, chipTop10, emitFilters]);

  /* Pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => {
    setPage(1);
  }, [q, chipHighCtr, chipLowCtr, chipLowImpr, chipTop10, sortBy, sortDir, pageSize]);

  /* Baselines for tooltips */
  const baselineCtr = useMemo(() => {
    const vals = baseRows
      .map((r) => r.ctr ?? (r.impressions ? r.clicks / r.impressions : null))
      .filter((x): x is number => x != null && isFinite(x));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [baseRows]);

  /* Filtered list (search + chips) */
  const filtered = useMemo(() => {
    let arr = baseRows.filter((r) => {
      const term = q.trim().toLowerCase();
      if (term) {
        const hay = `${r.name} ${r.iso}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    if (chipHighCtr) arr = arr.filter((r) => isHighCTR(r.ctr));
    if (chipLowCtr) arr = arr.filter((r) => isLowCTR(r.ctr));
    if (chipLowImpr) arr = arr.filter((r) => r.impressions < 1000);
    if (chipTop10) arr = [...arr].sort((a, b) => b.clicks - a.clicks).slice(0, 10);

    return arr;
  }, [baseRows, q, chipHighCtr, chipLowCtr, chipLowImpr, chipTop10]);

  /* Sorted list */
  const sorted = useMemo(() => {
    const get = (r: CountryRow, k: ColKey): any => {
      switch (k) {
        case "country":
          return r.name.toLowerCase();
        case "clicks":
          return r.clicks;
        case "impr":
          return r.impressions;
        case "ctr":
          return r.ctr ?? (r.impressions ? r.clicks / r.impressions : -Infinity);
        case "pos":
          return r.position == null ? Infinity : r.position;
        default:
          return 0;
      }
    };
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = get(a, sortBy);
      const bv = get(b, sortBy);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Window */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const pageRows = useMemo(
    () => sorted.slice(start, start + pageSize),
    [sorted, start, pageSize]
  );

  /* Sticky offset for left column */
  const stickyStyle = (c: ColDef) => {
    if (!c.sticky) return undefined;
    return {
      position: "sticky" as const,
      left: 0,
      zIndex: 30,
      background: "#fff",
      boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
    };
  };

  /* Export */
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const exportCSV = useCallback(() => {
    const cols = COLS;
    const headers = cols.map((c) => c.label);
    const mapVal = (r: CountryRow, key: ColKey) => {
      switch (key) {
        case "country":
          return `${r.name} (${r.iso})`;
        case "clicks":
          return r.clicks;
        case "impr":
          return r.impressions;
        case "ctr":
          return (r.ctr ?? (r.impressions ? r.clicks / r.impressions : 0)) * 100;
        case "pos":
          return r.position ?? "";
        case "opp":
          return r.opportunity ? "High CTR • Low Impressions" : "";
        default:
          return "";
      }
    };
    const lines = sorted.map((r) =>
      cols.map((c) => JSON.stringify(mapVal(r, c.key))).join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `country-breakdown_${query.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    onTelemetry?.("country_export", {
      surface: "drawer",
      format: "csv",
      rows: sorted.length,
    });
  }, [sorted, query, onTelemetry]);

  const exportPNG = useCallback(async () => {
    const host = tableScrollRef.current;
    if (!host) return exportCSV();
    const capture = host.cloneNode(true) as HTMLElement;
    capture.style.height = `${host.scrollHeight}px`;
    capture.scrollTop = 0;
    document.body.appendChild(capture);
    try {
      await exportTablePNG(
        capture,
        `country-breakdown_${query.replace(/\s+/g, "-")}.png`
      );
      onTelemetry?.("country_export", {
        surface: "drawer",
        format: "png",
        rows: sorted.length,
      });
    } catch {
      exportCSV();
    } finally {
      document.body.removeChild(capture);
    }
  }, [exportCSV, query, sorted.length, onTelemetry]);

  /* A11y label */
  const ariaLabel = `Country breakdown for "${query}" — ${
    drawerContext?.dateRangeLabel ?? "Current range"
  }, ${drawerContext?.device ?? "all devices"}. Sorted by ${
    COLS.find((c) => c.key === sortBy)?.label ?? sortBy
  } (${sortDir}).`;

  /* UI states */
  const showEmpty = !loading && !error && sorted.length === 0;

  return (
    <section
      aria-label={ariaLabel}
      className="space-y-3"
      style={{ fontFamily: TK.font }}
    >
      <Card
        className="border mx-4"
        style={{ borderColor: TK.border, borderRadius: TK.radius }}
      >
        {/* Header */}
        <CardHeader
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.border}` }}
        >
          <div className="flex items-center gap-2">
            <GlobeIcon className="h-5 w-5" style={{ color: TK.brand }} />
            <CardTitle className="text-lg">Country breakdown</CardTitle>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset"
              style={{
                background: "#EFF6FF",
                color: "#1D4ED8",
                borderColor: "#BFDBFE",
              }}
            >
              GSC
            </span>
          </div>

          {/* Export dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 px-3"
                style={{ cursor: "pointer" }}
              >
                <Download
                  className="h-4 w-4 mr-2"
                  style={{ color: TK.brand }}
                />{" "}
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-[#F7FAFC]"
                onClick={exportCSV}
                style={{ cursor: "pointer" }}
              >
                CSV
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-[#F7FAFC]"
                onClick={exportPNG}
                style={{ cursor: "pointer" }}
              >
                PNG (table)
              </button>
            </PopoverContent>
          </Popover>
        </CardHeader>

        {/* Filter bar */}
        <CardContent
          className="border-b pt-3 pb-3"
          style={{ borderColor: TK.border }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[280px] pl-7"
                placeholder="Country name or code…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Quick filters (modular chips) */}
            <button
              onClick={() => setChipHighCtr((v) => !v)}
              className={`h-8 px-3 rounded-full border text-sm ${
                chipHighCtr ? "font-semibold" : ""
              }`}
              style={{
                borderColor: TK.border,
                background: chipHighCtr
                  ? "color-mix(in srgb, var(--wr-positive-600, #10B981) 16%, white)"
                  : "#fff",
                cursor: "pointer",
              }}
            >
              High CTR (&gt; 8%)
            </button>
            <button
              onClick={() => setChipLowCtr((v) => !v)}
              className={`h-8 px-3 rounded-full border text-sm ${
                chipLowCtr ? "font-semibold" : ""
              }`}
              style={{
                borderColor: TK.border,
                background: chipLowCtr
                  ? "color-mix(in srgb, var(--wr-negative-600, #EF4444) 12%, white)"
                  : "#fff",
                cursor: "pointer",
              }}
            >
              Low CTR (&lt; 1%)
            </button>
            <button
              onClick={() => setChipLowImpr((v) => !v)}
              className={`h-8 px-3 rounded-full border text-sm ${
                chipLowImpr ? "font-semibold" : ""
              }`}
              style={{
                borderColor: TK.border,
                background: chipLowImpr
                  ? "color-mix(in srgb, var(--wr-warning-600, #F59E0B) 14%, white)"
                  : "#fff",
                cursor: "pointer",
              }}
            >
              Low Impressions (&lt; 1,000)
            </button>
            <button
              onClick={() => setChipTop10((v) => !v)}
              className={`h-8 px-3 rounded-full border text-sm ${
                chipTop10 ? "font-semibold" : ""
              }`}
              style={{
                borderColor: TK.border,
                background: chipTop10
                  ? "color-mix(in srgb, var(--wr-accent, #008CCD) 12%, white)"
                  : "#fff",
                cursor: "pointer",
              }}
            >
              Top 10 by Clicks
            </button>

            {/* Range pill (read-only) */}
            <span
              className="ml-2 inline-flex items-center gap-1 rounded-full border px-2.5 h-8 text-[12px]"
              style={{ borderColor: TK.border, color: TK.subtle }}
            >
              Range: {drawerContext?.dateRangeLabel ?? "—"}
            </span>

            {/* Rows per page + pager (right) */}
            <div className="ml-auto flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v: any) => setPageSize(Number(v))}
              >
                <SelectTrigger className="h-8 px-3 w-[120px]">
                  <SelectValue placeholder="Rows / page" />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                style={{ cursor: "pointer" }}
              >
                First
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ cursor: "pointer" }}
              >
                Prev
              </Button>
              <div className="text-sm w-16 text-center">
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ cursor: "pointer" }}
              >
                Next
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                style={{ cursor: "pointer" }}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 border-b" style={{ borderColor: TK.border }}>
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XIcon className="h-4 w-4" /> {error}
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={onRetry}
                  style={{ cursor: "pointer" }}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && sorted.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No data for these filters. Try a longer date range or a different segment.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <CardContent className="p-0">
            <div
              className="max-h-[560px] overflow-auto border-t"
              style={{ borderColor: TK.border }}
            >
              <div className="animate-pulse p-4 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-9 rounded bg-gray-100" />
                ))}
              </div>
            </div>
          </CardContent>
        )}

        {/* Table */}
        {!loading && sorted.length > 0 && (
          <CardContent className="p-0">
            <div
              ref={tableScrollRef}
              className="max-h-[560px] overflow-auto border-t"
              style={{ borderColor: TK.border }}
            >
              <Table className="text-sm">
                <TableHeader className="bg-white sticky top-0 z-20">
                  <TableRow className="hover:bg-white">
                    {COLS.map((c) => (
                      <TableHead
                        key={c.key}
                        style={{
                          minWidth: c.width,
                          width: c.width,
                          ...stickyStyle(c),
                        }}
                        className={
                          c.align === "right" ? "text-right" : "text-left"
                        }
                      >
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
                  {pageRows.map((r, idx) => {
                    const ctr =
                      r.ctr ?? (r.impressions ? r.clicks / r.impressions : null);
                    const opp =
                      r.opportunity ?? (isHighCTR(ctr) && r.impressions < 1000);

                    return (
                      <TableRow
                        key={`${r.iso}-${idx}`}
                        className="hover:bg-[#F8FAFC]"
                      >
                        {/* Country (sticky) */}
                        <TableCell
                          style={stickyStyle(COLS[0]) as any}
                          className="text-left"
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <CountryIconName name={r.name} iso={r.iso} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                {r.name} — {r.iso}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* Clicks */}
                        <TableCell className="text-right">
                          {compact(r.clicks)}
                        </TableCell>

                        {/* Impressions */}
                        <TableCell className="text-right">
                          {compact(r.impressions)}
                        </TableCell>

                        {/* CTR */}
                        <TableCell className="text-right">
                          <CtrBadge ctr={ctr} baseline={baselineCtr} />
                        </TableCell>

                        {/* Position */}
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  {r.position == null
                                    ? "—"
                                    : r.position.toFixed(1)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Average rank in this country.{" "}
                                <span className="opacity-80">
                                  Lower is better.
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>

                        {/* Opportunity */}
                        <TableCell className="text-left">
                          {opp ? (
                            <OpportunityTag />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Actions (branded icons, no borders) */}
                        <TableCell className="text-left">
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Assign regional task for ${r.name}`}
                                    className="hover:bg-transparent"
                                    style={{ color: TK.brand, cursor: "pointer" }}
                                    onClick={() => {
                                      onTelemetry?.("country_task_open", {
                                        surface: "drawer",
                                        country: r.iso,
                                        query,
                                      });
                                      onAssignTask
                                        ? onAssignTask(r.iso, r.name, query)
                                        : alert(
                                            `Assign Task → ${r.name} (${r.iso}) for "${query}"`
                                          );
                                    }}
                                  >
                                    <PinIcon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Assign Regional Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`View ${r.name} local SERP`}
                                    className="hover:bg-transparent"
                                    style={{ color: TK.brand, cursor: "pointer" }}
                                    onClick={() => {
                                      onTelemetry?.("country_serp_open", {
                                        surface: "drawer",
                                        country: r.iso,
                                        query,
                                      });
                                      onOpenSerp
                                        ? onOpenSerp(r.iso, r.name, query)
                                        : alert(
                                            `Open SERP snapshot → ${r.name} (${r.iso})`
                                          );
                                    }}
                                  >
                                    <GlobeIcon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Locale SERP</TooltipContent>
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

        {/* Pagination footer */}
        {!loading && sorted.length > 0 && (
          <div
            className="flex items-center justify-between p-3 border-t"
            style={{ borderColor: TK.border }}
          >
            <div className="text-sm text-muted-foreground">
              Showing {sorted.length === 0 ? 0 : start + 1}–
              {Math.min(sorted.length, start + pageRows.length)} of{" "}
              {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                style={{ cursor: "pointer" }}
              >
                First
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ cursor: "pointer" }}
              >
                Prev
              </Button>
              <div className="text-sm w-16 text-center">
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ cursor: "pointer" }}
              >
                Next
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                style={{ cursor: "pointer" }}
              >
                Last
              </Button>
              <Select
                value={String(pageSize)}
                onValueChange={(v: any) => setPageSize(Number(v))}
              >
                <SelectTrigger className="h-8 px-3 w-[120px]">
                  <SelectValue placeholder="Rows / page" />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

/* ───────────────────────── Default export (demo-ready) ───────────────────────── */
export default function DemoCountryBreakdown() {
  return (
    <CountryBreakdownTable
      query="best seo tool"
      drawerContext={{ dateRangeLabel: "Last 30 days", device: "all" }}
      onTelemetry={(ev, payload) => console.log(ev, payload)}
    />
  );
}
