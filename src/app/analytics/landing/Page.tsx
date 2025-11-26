"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  RefreshCw,
  Search as SearchIcon,
  ClipboardList,
  Table,
  Columns3,
  Lock,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileDown,
  Image as ImageIcon,
  FileSpreadsheet,
  FileText,
  Info,
} from "lucide-react";
import DemoDrawerHeaderPage from "./drawer/DemoDrawerHeaderPage";
import { Pagination as AntPagination } from "antd";

type ColumnKey =
  | "select"
  | "url"
  | "sessions"
  | "organicClicks"
  | "impressions"
  | "organicCtr"
  | "avgEngagementTimeSec"
  | "bounceRate"
  | "conversions"
  | "lastUpdated"
  | "actions";

type SourceTag = "GA4" | "GSC" | "CMS" | "Internal" | "All";

export type LandingPageRow = {
  id: string;
  url: string;
  title?: string;
  sessions: number; // GA4
  organicClicks: number; // GSC
  impressions: number; // GSC
  organicCtr: number; // % from GSC
  avgEngagementTimeSec: number; // GA4
  bounceRate: number; // % GA4
  conversions: number; // GA4
  lastUpdated?: string; // ISO string from CMS
};

type LandingPagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

type SortDir = "asc" | "desc" | null;

const TOKENS = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  cardBg: "#FFFFFF",
  radius: "10px",
} as const;

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  select: true,
  url: true,
  sessions: true,
  organicClicks: true,
  impressions: true,
  organicCtr: true,
  avgEngagementTimeSec: true,
  bounceRate: true,
  conversions: true,
  lastUpdated: true,
  actions: true,
};

const GA4_COLUMNS: ColumnKey[] = [
  "sessions",
  "avgEngagementTimeSec",
  "bounceRate",
  "conversions",
];

const GSC_COLUMNS: ColumnKey[] = [
  "organicClicks",
  "impressions",
  "organicCtr",
];

const HEADER_META: Record<ColumnKey, { label: string; tooltip?: string }> = {
  select: { label: "" },
  url: {
    label: "Page URL / Title",
    tooltip: "Full path (click to open Page Detail View).",
  },
  sessions: {
    label: "Sessions",
    tooltip: "GA4 sessions for this landing page (selected period).",
  },
  organicClicks: {
    label: "Organic Clicks",
    tooltip: "GSC clicks (Organic).",
  },
  impressions: {
    label: "Impressions",
    tooltip: "Total GSC impressions (Organic).",
  },
  organicCtr: {
    label: "Organic CTR",
    tooltip: "GSC CTR = Clicks � Impressions.",
  },
  avgEngagementTimeSec: {
    label: "Avg. Engagement Time",
    tooltip: "GA4 average active time on the page.",
  },
  bounceRate: {
    label: "Bounce Rate",
    tooltip: "GA4 % of sessions with no engagement.",
  },
  conversions: {
    label: "Conversions",
    tooltip: "GA4 conversion events attributed to this landing page.",
  },
  lastUpdated: {
    label: "Last Updated",
    tooltip: "From Wranker CMS / content module.",
  },
  actions: {
    label: "Actions",
    tooltip: "Open Analyzer / Create Task",
  },
};

/* -------------------------- Utilities -------------------------- */

const nf = new Intl.NumberFormat("en-US");
const pf = (n: number, dp = 1) => `${n.toFixed(dp)}%`;

function toTime(mmss: number) {
  const m = Math.floor(mmss / 60);
  const s = Math.floor(mmss % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timeAgo(iso?: string) {
  if (!iso) return "Unknown";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "Unknown";
  const now = Date.now();
  const d = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (d < 1) return "today";
  if (d === 1) return "1 day ago";
  if (d < 30) return `${d} days ago`;
  const mo = Math.floor(d / 30);
  if (mo === 1) return "1 month ago";
  return `${mo} months ago`;
}

function freshnessBadge(iso?: string) {
  if (!iso) return { label: "Unknown", color: "bg-gray-200 text-gray-700" };
  const then = new Date(iso).getTime();
  const days = (Date.now() - then) / 86400000;
  if (days <= 30) return { label: "Fresh", color: "bg-emerald-100 text-emerald-700" };
  if (days <= 90) return { label: "Aging", color: "bg-amber-100 text-amber-700" };
  return { label: "Stale", color: "bg-red-100 text-red-700" };
}

/* CSV */
function exportRowsToCSV(filename: string, cols: ColumnKey[], rows: LandingPageRow[]) {
  const headers = cols
    .filter((c) => c !== "select" && c !== "actions")
    .map((c) => HEADER_META[c].label);

  const mapCell = (r: LandingPageRow, c: ColumnKey) => {
    switch (c) {
      case "url":
        return r.url + (r.title ? ` (${r.title})` : "");
      case "sessions":
        return r.sessions;
      case "organicClicks":
        return r.organicClicks;
      case "impressions":
        return r.impressions;
      case "organicCtr":
        return r.organicCtr;
      case "avgEngagementTimeSec":
        return toTime(r.avgEngagementTimeSec);
      case "bounceRate":
        return r.bounceRate;
      case "conversions":
        return r.conversions;
      case "lastUpdated":
        return r.lastUpdated ? new Date(r.lastUpdated).toISOString() : "";
      default:
        return "";
    }
  };

  const body = rows
    .map((r) =>
      cols
        .filter((c) => c !== "select" && c !== "actions")
        .map((c) => String(mapCell(r, c)).replace(/"/g, '""'))
        .map((v) => `"${v}"`)
        .join(","),
    )
    .join("\n");

  const csv = [headers.join(","), body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/* PNG (simple canvas export) */
async function exportRowsToPNG(
  filename: string,
  cols: ColumnKey[],
  rows: LandingPageRow[],
) {
  const visibleCols = cols.filter((c) => c !== "select" && c !== "actions");
  const padX = 16;
  const rowH = 32;
  const headerH = 40;
  const footerH = 24;
  const maxRows = Math.min(rows.length, 100);
  const widths = visibleCols.map(() => 220);
  widths[0] = 320;

  const totalW = widths.reduce((a, b) => a + b, 0) + padX * 2;
  const totalH = headerH + maxRows * rowH + footerH;

  const canvas = document.createElement("canvas");
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(totalW * scale);
  canvas.height = Math.floor(totalH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, totalW, totalH);

  // header
  ctx.fillStyle = "#111827";
  ctx.font = "bold 14px Inter, ui-sans-serif, system-ui";
  let x = padX;
  visibleCols.forEach((c, i) => {
    ctx.fillText(HEADER_META[c].label, x, 24);
    x += widths[i];
  });

  // rows
  ctx.font = "13px Inter, ui-sans-serif, system-ui";
  rows.slice(0, maxRows).forEach((r, idx) => {
    const yBase = headerH + idx * rowH;
    ctx.fillStyle = idx % 2 ? "#FAFAFA" : "#FFFFFF";
    ctx.fillRect(0, yBase, totalW, rowH);

    x = padX;
    ctx.fillStyle = "#111827";
    visibleCols.forEach((c, i) => {
      const text = cellText(r, c);
      ctx.fillStyle = "#111827";
      ctx.fillText(text, x, yBase + 20);
      x += widths[i];
    });

    ctx.strokeStyle = "#E5E7EB";
    ctx.beginPath();
    ctx.moveTo(0, yBase + rowH + 0.5);
    ctx.lineTo(totalW, yBase + rowH + 0.5);
    ctx.stroke();
  });

  // footer
  ctx.fillStyle = "#6B7280";
  ctx.font = "12px Inter, ui-sans-serif, system-ui";
  ctx.fillText(
    `Exported ${Math.min(maxRows, rows.length)} of ${rows.length} rows � Wranker`,
    padX,
    totalH - 8,
  );

  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, "image/png");
}

function cellText(r: LandingPageRow, c: ColumnKey) {
  switch (c) {
    case "url":
      return r.url + (r.title ? ` ${r.title}` : "");
    case "sessions":
      return nf.format(r.sessions);
    case "organicClicks":
      return nf.format(r.organicClicks);
    case "impressions":
      return nf.format(r.impressions);
    case "organicCtr":
      return pf(r.organicCtr, 1);
    case "avgEngagementTimeSec":
      return toTime(r.avgEngagementTimeSec);
    case "bounceRate":
      return pf(r.bounceRate, 0);
    case "conversions":
      return nf.format(r.conversions);
    case "lastUpdated":
      return timeAgo(r.lastUpdated);
    default:
      return "";
  }
}

/* ----------------------- Mock Data ----------------------- */

// function mockRows(count = 48): LandingPageRow[] {
//   const urls = [
//     "/blog/seo-strategy-guide",
//     "/seo-services",
//     "/pricing",
//     "/about-us",
//     "/features/optimizer",
//     "/blog/google-ranking-factors",
//     "/tools/keyword-checker",
//     "/blog/seo-checklist-2025",
//     "/landing/ebook-seo",
//   ];
//   const titles = [
//     "SEO Strategy Guide",
//     "SEO Services",
//     "Pricing",
//     "About Us",
//     "Wranker Optimizer",
//     "Google Ranking Factors",
//     "Keyword Checker Tool",
//     "SEO Checklist 2025",
//     "SEO eBook Landing",
//   ];

//   const arr: LandingPageRow[] = [];
//   for (let i = 0; i < count; i++) {
//     const k = i % urls.length;
//     const sessions = 200 + Math.floor(Math.random() * 6000);
//     const impressions = 500 + Math.floor(Math.random() * 30000);
//     const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.09));
//     const ctr = impressions ? (clicks / impressions) * 100 : 0;
//     const bounce = Math.floor(20 + Math.random() * 75);
//     const conv = Math.floor(Math.random() * (sessions * 0.06));
//     const sec = 30 + Math.floor(Math.random() * 240);
//     const daysAgo = Math.floor(Math.random() * 160);
//     const lastUpdated = new Date(Date.now() - daysAgo * 86400000).toISOString();

//     arr.push({
//       id: `row_${i}`,
//       url: urls[k],
//       title: titles[k],
//       sessions,
//       organicClicks: clicks,
//       impressions,
//       organicCtr: ctr,
//       avgEngagementTimeSec: sec,
//       bounceRate: bounce,
//       conversions: conv,
//       lastUpdated: Math.random() < 0.1 ? undefined : lastUpdated,
//     });
//   }
//   return arr;
// }

/* ---------------------------- Small UI atoms ---------------------------- */

const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
    {children}
  </span>
);

const SourceChip = ({ src }: { src: "GA4" | "GSC" | "All" | "CMS" | "Internal" }) => {
  const map: Record<SourceTag, string> = {
    GA4: "bg-[var(--wr-pastel-blue)] text-[var(--wr-value-blue)]",
    GSC: "bg-emerald-50 text-emerald-700",
    CMS: "bg-slate-100 text-slate-700",
    Internal: "bg-gray-100 text-gray-700",
    All: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[src]}`}>
      {src}
    </span>
  );
};

function SortGlyph({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || dir === null) return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-70" />;
  return dir === "asc" ? <ChevronUp className="ml-1 h-4 w-4 opacity-70" /> : <ChevronDown className="ml-1 h-4 w-4 opacity-70" />;
}

/* -------------------------------- Main Page -------------------------------- */

export default function LandingPagesTablePage({
  rows,
  pagination,
  loading,
  onPageChange,
}: {
  rows?: LandingPageRow[];
  pagination?: LandingPagination | null;
  loading?: boolean;
  onPageChange?: (page: number, pageSize?: number) => void;
}) {
  return (
    <div
      className=" "
      style={
        {
          fontFamily:
            "Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif",
          ["--wr-brand" as any]: TOKENS.brand,
          ["--wr-value-blue" as any]: TOKENS.valueBlue,
          ["--wr-pastel-blue" as any]: TOKENS.pastelBlue,
          ["--wr-text" as any]: TOKENS.text,
          ["--wr-muted" as any]: TOKENS.muted,
          ["--wr-border" as any]: TOKENS.border,
          ["--wr-borderLight" as any]: TOKENS.borderLight,
          ["--wr-success" as any]: TOKENS.success,
          ["--wr-warning" as any]: TOKENS.warning,
          ["--wr-danger" as any]: TOKENS.danger,
          ["--wr-card-bg" as any]: TOKENS.cardBg,
          ["--wr-radius" as any]: TOKENS.radius,
        } as React.CSSProperties
      }
    >
      <LandingPagesTable rows={rows} pagination={pagination} loading={loading} onPageChange={onPageChange} />
    </div>
  );
}

/* ------------------------- Section ------------------------- */

function LandingPagesTable({
  rows: propRows,
  loading = false,
  pagination,
  onPageChange,
}: {
  rows?: LandingPageRow[];
  loading?: boolean;
  pagination?: LandingPagination | null;
  onPageChange?: (page: number, pageSize?: number) => void;
}) {
  const [rows, setRows] = useState<LandingPageRow[]>(() => propRows || []);
  useEffect(() => {
    setRows(propRows ?? []);
  }, [propRows]);

  // Filters
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<"all" | "top" | "low-ctr" | "high-bounce">("all");
  const [sourceFilter, setSourceFilter] = useState<"All" | "GA4" | "GSC">("All");

  // Columns
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(structuredClone(DEFAULT_VISIBLE));

  // Sorting
  const [sortKey, setSortKey] = useState<ColumnKey>("sessions");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection / Expand
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelected(new Set());
    setExpanded(new Set());
  }, [propRows, pagination?.currentPage, pagination?.pageSize]);

  // Drawer (Analyzer/Task)
  const [drawerRow, setDrawerRow] = useState<LandingPageRow | null>(null);

  // Export dropdown (click-outside)
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Scroll / sticky header height for bulk bar
  const scrollRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [theadH, setTheadH] = useState(40);
  useEffect(() => {
    if (!theadRef.current) return;
    const ro = new ResizeObserver(() => {
      setTheadH(theadRef.current?.getBoundingClientRect().height ?? 40);
    });
    ro.observe(theadRef.current);
    return () => ro.disconnect();
  }, []);

  // Keep columns in sync with Source filter
  useEffect(() => {
    setVisible((prev) => {
      const next = { ...prev };
      const guard = (k: ColumnKey) =>
        k === "url" || k === "actions" || k === "select" || k === "lastUpdated";
      if (sourceFilter === "GA4") {
        GSC_COLUMNS.forEach((c) => (next[c] = false));
        GA4_COLUMNS.forEach((c) => (next[c] = true));
      } else if (sourceFilter === "GSC") {
        GA4_COLUMNS.forEach((c) => (next[c] = false));
        GSC_COLUMNS.forEach((c) => (next[c] = true));
      } else {
        (Object.keys(next) as ColumnKey[]).forEach((k) => (next[k] = true));
      }
      (Object.keys(next) as ColumnKey[]).forEach((k) => {
        if (guard(k)) next[k] = true;
      });
      return next;
    });
  }, [sourceFilter]);

  /* Derived rows: search + presets + sort */
  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter(
      (r) =>
        !q ||
        r.url.toLowerCase().includes(q) ||
        (r.title ?? "").toLowerCase().includes(q) ||
        r.url.replace(/^https?:\/\//, "").toLowerCase().includes(q),
    );

    if (preset === "low-ctr") {
      out = out.filter((r) => r.impressions > 1000 && r.organicCtr < 3);
    } else if (preset === "high-bounce") {
      out = out.filter((r) => r.bounceRate > 60);
    } else if (preset === "top") {
      out = [...out]
        .sort((a, b) => b.conversions * 1000 + b.sessions - (a.conversions * 1000 + a.sessions))
        .slice(0, 30);
    }

    const val = (r: LandingPageRow, k: ColumnKey) => {
      switch (k) {
        case "url":
          return r.url;
        case "sessions":
          return r.sessions;
        case "organicClicks":
          return r.organicClicks;
        case "impressions":
          return r.impressions;
        case "organicCtr":
          return r.organicCtr;
        case "avgEngagementTimeSec":
          return r.avgEngagementTimeSec;
        case "bounceRate":
          return r.bounceRate;
        case "conversions":
          return r.conversions;
        case "lastUpdated":
          return r.lastUpdated ? new Date(r.lastUpdated).getTime() : -Infinity;
        default:
          return 0;
      }
    };
    if (sortDir) {
      out = [...out].sort((a, b) => {
        const A = val(a, sortKey);
        const B = val(b, sortKey);
        if (typeof A === "string" && typeof B === "string") {
          return sortDir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
        }
        return sortDir === "asc" ? (A as number) - (B as number) : (B as number) - (A as number);
      });
    }
    return out;
  }, [rows, query, preset, sortKey, sortDir]);

  const visibleColumns = useMemo(
    () => (Object.keys(visible) as ColumnKey[]).filter((k) => visible[k]),
    [visible],
  );

  // Pagination / window slice
  const displayRows = filteredSorted;
  const showLoadingState = loading && displayRows.length === 0;
  const showEmptyState = !loading && displayRows.length === 0;
  const currentPage = Math.max(1, pagination?.currentPage ?? 1);
  const pageSize = Math.max(1, pagination?.pageSize ?? (displayRows.length || 10));
  const totalRecords = Math.max(0, pagination?.totalRecords ?? displayRows.length);
  const requestFirstPage = (nextPageSize?: number) => {
    if (onPageChange) {
      onPageChange(1, nextPageSize ?? pageSize);
    }
  };

  // Selection helpers
  const allOnPageSelected = displayRows.length > 0 && displayRows.every((r) => selected.has(r.id));
  const someOnPageSelected = displayRows.some((r) => selected.has(r.id)) && !allOnPageSelected;

  const toggleSort = (k: ColumnKey) => {
    if (k === "select" || k === "actions") return;
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("desc");
    } else {
      setSortDir(sortDir === "desc" ? "asc" : sortDir === "asc" ? null : "desc");
    }
  };

  const toggleAllOnPage = (checked: boolean) => {
    const copy = new Set(selected);
    displayRows.forEach((r) => {
      if (checked) copy.add(r.id);
      else copy.delete(r.id);
    });
    setSelected(copy);
  };

  const toggleRow = (id: string, checked: boolean) => {
    const copy = new Set(selected);
    if (checked) copy.add(id);
    else copy.delete(id);
    setSelected(copy);
  };

  const resetFilters = () => {
    setQuery("");
    setPreset("all");
    setSourceFilter("All");
    setSortKey("sessions");
    setSortDir("desc");
    setVisible(structuredClone(DEFAULT_VISIBLE));
    if (onPageChange) {
      onPageChange(1, pageSize);
    }
  };

  // First selected index (within current window)
  const firstSelectedIdx = displayRows.findIndex((r) => selected.has(r.id));
  const colCount =
    visibleColumns.length + (visible.select ? 1 : 0); // for bulk bar colSpan

  /* ------------------------------ Render ------------------------------ */

  return (
    <section className="space-y-3 text-[var(--wr-text)]">
      <div
        className="rounded-[var(--wr-radius)] border bg-[var(--wr-card-bg)]"
        style={{ borderColor: "var(--wr-border)" }}
      >
        {/* Header Bar */}
        <div
          className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between border-b"
          style={{ borderColor: "var(--wr-borderLight)" }}
        >
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4" color={TOKENS.brand} />
            <div className="text-lg font-semibold">Top Landing Pages</div>
            <Info className="h-4 w-4 text-gray-500" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Columns manager */}
            <ColumnManager visible={visible} onChange={setVisible} />

            {/* Single Export button (dropdown) */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((s) => !s)}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                title="Export"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 z-30 mt-2 w-48 rounded-md border bg-white p-1 shadow-lg"
                  style={{ borderColor: "var(--wr-borderLight)" }}
                >
                  <button
                    onClick={() => {
                      setExportOpen(false);
                      exportRowsToCSV("landing-pages.csv", visibleColumns, filteredSorted);
                    }}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <FileDown className="h-4 w-4" /> CSV
                  </button>
                  <button
                    onClick={() => {
                      setExportOpen(false);
                      exportRowsToPNG("landing-pages.png", visibleColumns, filteredSorted);
                    }}
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <ImageIcon className="h-4 w-4" /> PNG
                  </button>
                  <button
                    disabled
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-400"
                    title="Pro feature"
                  >
                    <FileSpreadsheet className="h-4 w-4" /> XLSX <Lock className="ml-auto h-4 w-4" />
                  </button>
                  <button
                    disabled
                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-gray-400"
                    title="Pro feature"
                  >
                    <FileText className="h-4 w-4" /> PDF <Lock className="ml-auto h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Reset */}
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              title="Reset all"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Filters Row (chips + search + source toggle + pagination controls) */}
        <div
          className="flex flex-wrap items-center gap-2 p-3 border-b"
          style={{ borderColor: "var(--wr-borderLight)" }}
        >
          {/* Search */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                requestFirstPage();
              }}
              placeholder="Search by URL or title�"
              className="w-[280px] rounded-md border border-[var(--wr-border)] bg-white py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--wr-brand)]"
            />
          </div>

          {/* Preset chips */}
          {([
            ["all", "All Pages"],
            ["top", "Top Performers"],
            ["low-ctr", "Low CTR"],
            ["high-bounce", "High Bounce"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => {
                setPreset(val as any);
                requestFirstPage();
              }}
              className={`h-8 rounded-full border px-3 text-sm cursor-pointer ${preset === val ? "font-semibold" : ""}`}
              style={{
                borderColor: "var(--wr-borderLight)",
                background: preset === val ? "var(--wr-pastel-blue)" : "#fff",
                color: preset === val ? "var(--wr-value-blue)" : "inherit",
              }}
              title={`Filter: ${label}`}
            >
              {label}
            </button>
          ))}

          {/* Source segmented */}
          <div className="ml-1 hidden md:flex items-center rounded-md border border-[var(--wr-border)] overflow-hidden">
            {(["All", "GA4", "GSC"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSourceFilter(t)}
                className={`px-3 py-2 text-sm cursor-pointer ${sourceFilter === t ? "bg-[var(--wr-pastel-blue)] text-[var(--wr-value-blue)]" : "bg-white"}`}
                title={`Show ${t} columns`}
              >
                {t}
              </button>
            ))}
          </div>

        </div>

        {/* Table */}
        <div className="min-h-[200px]">
          {showLoadingState ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-[var(--wr-muted)]">
              Loading landing pages...
            </div>
          ) : showEmptyState ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-[var(--wr-muted)]">
              No landing pages found for your filters.
            </div>
          ) : (
            <div ref={scrollRef} className="relative max-h-[64vh] overflow-auto">
              <table className="min-w-full text-sm">
            <thead
              ref={theadRef}
              className="sticky top-0 z-20 bg-white shadow-[0_1px_0_0_var(--wr-border)]"
            >
              <tr className="text-left">
                {visible["select"] && (
                  <th className="sticky left-0 z-30 bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={allOnPageSelected}
                      ref={(el) => {
                        if (el) (el as any).indeterminate = someOnPageSelected;
                      }}
                      onChange={(e) => toggleAllOnPage(e.target.checked)}
                    />
                  </th>
                )}
                {visible["url"] && (
                  <Th
                    colKey="url"
                    label={HEADER_META.url.label}
                    source="All"
                    tooltip={HEADER_META.url.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    stickyLeft
                    leftPx={visible["select"] ? 44 : 0}
                    widthClass="min-w-[280px]"
                  />
                )}
                {visible["sessions"] && (
                  <Th
                    colKey="sessions"
                    label={HEADER_META.sessions.label}
                    source="GA4"
                    tooltip={HEADER_META.sessions.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["organicClicks"] && (
                  <Th
                    colKey="organicClicks"
                    label={HEADER_META.organicClicks.label}
                    source="GSC"
                    tooltip={HEADER_META.organicClicks.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["impressions"] && (
                  <Th
                    colKey="impressions"
                    label={HEADER_META.impressions.label}
                    source="GSC"
                    tooltip={HEADER_META.impressions.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["organicCtr"] && (
                  <Th
                    colKey="organicCtr"
                    label={HEADER_META.organicCtr.label}
                    source="GSC"
                    tooltip={HEADER_META.organicCtr.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["avgEngagementTimeSec"] && (
                  <Th
                    colKey="avgEngagementTimeSec"
                    label={HEADER_META.avgEngagementTimeSec.label}
                    source="GA4"
                    tooltip={HEADER_META.avgEngagementTimeSec.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["bounceRate"] && (
                  <Th
                    colKey="bounceRate"
                    label={HEADER_META.bounceRate.label}
                    source="GA4"
                    tooltip={HEADER_META.bounceRate.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["conversions"] && (
                  <Th
                    colKey="conversions"
                    label={HEADER_META.conversions.label}
                    source="GA4"
                    tooltip={HEADER_META.conversions.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["lastUpdated"] && (
                  <Th
                    colKey="lastUpdated"
                    label={HEADER_META.lastUpdated.label}
                    source="CMS"
                    tooltip={HEADER_META.lastUpdated.tooltip}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                  />
                )}
                {visible["actions"] && (
                  <th className="px-3 py-2 text-[12px] font-semibold text-[var(--wr-muted)]">
                    {HEADER_META.actions.label}
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y" style={{ borderColor: "var(--wr-border)" }}>
              {displayRows.map((r, idx) => {
                const lowCTR = r.organicCtr < 3 && r.impressions > 1000;
                const highBounce = r.bounceRate >= 60;
                const goodConv = r.conversions >= Math.max(5, Math.round(r.sessions * 0.03));
                const { label: recency, color: recencyColor } = freshnessBadge(r.lastUpdated);

                // Inject sticky Bulk Action Bar just above first selected row
                const showBulkHere = selected.size > 0 && idx === firstSelectedIdx;

                return (
                  <React.Fragment key={r.id}>
                    {showBulkHere && (
                      <tr>
                        <td colSpan={colCount} className="px-3 py-2">
                          <div
                            className="sticky z-30 flex items-center justify-between rounded-md border bg-white px-3 py-2 shadow-sm"
                            style={{ top: theadH, borderColor: "var(--wr-border)" }}
                          >
                            <div className="text-sm">
                              <span className="font-medium">{selected.size}</span> selected
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="inline-flex items-center gap-1 text-sm text-[var(--wr-brand)] hover:underline cursor-pointer"
                                onClick={() =>
                                  exportRowsToCSV(
                                    "landing-pages-selected.csv",
                                    visibleColumns,
                                    displayRows.filter((row) => selected.has(row.id)),
                                  )
                                }
                              >
                                <FileDown className="h-4 w-4" /> CSV
                              </button>
                              <button
                                className="inline-flex items-center gap-1 text-sm text-[var(--wr-brand)] hover:underline cursor-pointer"
                                onClick={() =>
                                  exportRowsToPNG(
                                    "landing-pages-selected.png",
                                    visibleColumns,
                                    displayRows.filter((row) => selected.has(row.id)),
                                  )
                                }
                              >
                                <ImageIcon className="h-4 w-4" /> PNG
                              </button>
                              <button
                                className="inline-flex items-center gap-1 text-sm text-[var(--wr-brand)] hover:underline cursor-pointer"
                                onClick={() => alert("Bulk task creation � connect to your Task module")}
                              >
                                <ClipboardList className="h-4 w-4" /> Create Task
                              </button>
                              <button
                                className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline cursor-pointer"
                                onClick={() => setSelected(new Set())}
                                title="Clear selection"
                              >
                                <X className="h-4 w-4" /> Clear
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr className="bg-white hover:bg-[#F9FAFB]">
                      {visible["select"] && (
                        <td className="sticky left-0 z-10 bg-white px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.url}`}
                            checked={selected.has(r.id)}
                            onChange={(e) => toggleRow(r.id, e.target.checked)}
                          />
                        </td>
                      )}

                      {visible["url"] && (
                        <td
                          className={`sticky ${visible["select"] ? "left-[44px]" : "left-0"} z-10 bg-white px-3 py-3 align-top`}
                        >
                          <div className="max-w-[360px]">
                            {/* <a
                              className="line-clamp-1 font-medium text-[var(--wr-brand)] hover:underline cursor-pointer"
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setExpanded((s) => {
                                  const copy = new Set(s);
                                  copy.has(r.id) ? copy.delete(r.id) : copy.add(r.id);
                                  return copy;
                                });
                              }}
                              title="Open Page Detail View"
                            >
                              {r.title ?? r.url}
                            </a>*/}
                            <a
                              className="line-clamp-1 font-medium text-[var(--wr-brand)] hover:underline cursor-pointer"
                              href="#"
                            onClick={(e) => {
    e.preventDefault();
    setDrawerRow(r); // <- set the row data for the drawer
  }}
                              title="Open Page Detail View"
                            >
                              {r.title ?? r.url}
                            </a>
                            <div className="truncate text-xs text-[var(--wr-muted)]">{r.url}</div>
                            <div className="mt-1 flex items-center gap-1">
                              {lowCTR && <Badge color="bg-amber-100 text-amber-700">Low CTR</Badge>}
                              {highBounce && <Badge color="bg-red-100 text-red-700">High Bounce</Badge>}
                              {goodConv && <Badge color="bg-emerald-100 text-emerald-700">High Conversions</Badge>}
                            </div>
                          </div>
                        </td>
                      )}

                      {visible["sessions"] && (
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center">
                            <span className="font-medium">{nf.format(r.sessions)}</span>
                            <SourceChip src="GA4" />
                          </div>
                        </td>
                      )}

                      {visible["organicClicks"] && (
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center">
                            <span>{nf.format(r.organicClicks)}</span>
                            <Badge color="bg-emerald-50 text-emerald-700">Organic</Badge>
                            <SourceChip src="GSC" />
                          </div>
                        </td>
                      )}

                      {visible["impressions"] && (
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center">
                            <span>{nf.format(r.impressions)}</span>
                            <SourceChip src="GSC" />
                          </div>
                        </td>
                      )}

                      {visible["organicCtr"] && (
                        <td className="px-3 py-3 align-top" title="GSC: Clicks � Impressions">
                          <span
                            className={`rounded px-2 py-0.5 ${
                              lowCTR ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-700"
                            }`}
                          >
                            {pf(r.organicCtr, 1)}
                          </span>
                        </td>
                      )}

                      {visible["avgEngagementTimeSec"] && (
                        <td className="px-3 py-3 align-top" title="GA4: Average active time on page">
                          {toTime(r.avgEngagementTimeSec)}
                        </td>
                      )}

                      {visible["bounceRate"] && (
                        <td
                          className={`px-3 py-3 align-top ${highBounce ? "text-[var(--wr-danger)] font-medium" : ""}`}
                          title="GA4: % sessions with no engagement"
                        >
                          {pf(r.bounceRate, 0)}
                        </td>
                      )}

                      {visible["conversions"] && (
                        <td className="px-3 py-3 align-top">
                          <span
                            className={`rounded px-2 py-0.5 ${
                              goodConv ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-700"
                            }`}
                          >
                            {nf.format(r.conversions)}
                          </span>
                        </td>
                      )}

                      {visible["lastUpdated"] && (
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--wr-muted)]">{timeAgo(r.lastUpdated)}</span>
                            <Badge color={recencyColor}>{recency}</Badge>
                          </div>
                        </td>
                      )}

                      {visible["actions"] && (
                        <td className="px-3 py-3 align-top">
                          {/* Icon-only actions (no borders) */}
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                              title="Open Analyzer"
                              onClick={() => setDrawerRow(r)}
                            >
                              <SearchIcon className="h-4 w-4" color={TOKENS.brand} />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-gray-50 cursor-pointer"
                              title="Create Task"
                              onClick={() => setDrawerRow(r)}
                            >
                              <ClipboardList className="h-4 w-4" color={TOKENS.brand} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Row Expander */}
                    {expanded.has(r.id) && (
                      <tr className="bg-[#F9FAFB]">
                        <td colSpan={colCount} className="px-3 py-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <InfoBlock title="What to check">
                              <ul className="list-disc pl-4 text-xs text-[var(--wr-muted)]">
                                <li>Snippet quality if CTR &lt; 3%</li>
                                <li>Above-the-fold content if Bounce = 60%</li>
                                <li>Form/CTA placement vs scroll</li>
                              </ul>
                            </InfoBlock>
                            <InfoBlock title="Quick metrics">
                              <div className="text-xs text-[var(--wr-muted)]">
                                Sessions: <b>{nf.format(r.sessions)}</b> � Clicks:{" "}
                                <b>{nf.format(r.organicClicks)}</b> � Impr: <b>{nf.format(r.impressions)}</b>
                              </div>
                            </InfoBlock>
                            <InfoBlock title="Last updated">
                              <div className="text-xs text-[var(--wr-muted)]">
                                {r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString() : "Unknown"}
                              </div>
                            </InfoBlock>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
            </div>
          )}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 p-3 border-t text-xs text-[var(--wr-muted)]"
          style={{ borderColor: "var(--wr-borderLight)" }}
        >
          <div>
            Showing{" "}
            <b>{totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}</b>-
            <b>{Math.min(totalRecords, currentPage * pageSize)}</b> of <b>{totalRecords}</b>
          </div>
          {pagination && (
            <AntPagination
              size="small"
              current={currentPage}
              total={totalRecords}
              pageSize={pageSize}
              showSizeChanger={false}
              onChange={(pageNumber, nextPageSize) => {
                const el = scrollRef.current;
                if (el) {
                  el.scrollTo({ top: 0 });
                }
                if (onPageChange) {
                  onPageChange(pageNumber, nextPageSize);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Drawer (Analyzer / Create Task) */}
      {drawerRow && (
        <Drawer onClose={() => setDrawerRow(null)} title="Page Analyzer">
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold">{drawerRow.title ?? drawerRow.url}</div>
              <div className="text-[var(--wr-muted)]">{drawerRow.url}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Kpi label="Sessions (GA4)" value={nf.format(drawerRow.sessions)} />
              <Kpi label="Organic Clicks (GSC)" value={nf.format(drawerRow.organicClicks)} />
              <Kpi label="Impressions (GSC)" value={nf.format(drawerRow.impressions)} />
              <Kpi label="Organic CTR" value={pf(drawerRow.organicCtr, 1)} />
              <Kpi label="Avg. Engagement Time" value={toTime(drawerRow.avgEngagementTimeSec)} />
              <Kpi label="Bounce Rate" value={pf(drawerRow.bounceRate, 0)} />
              <Kpi label="Conversions" value={nf.format(drawerRow.conversions)} />
            </div>
          </div>
        </Drawer>
      )}

      {drawerRow && (
            <Drawer title="Page Analyzer" onClose={() => setDrawerRow(null)}>
  <DemoDrawerHeaderPage
  />
      </Drawer>
)}
    </section>
  );
}

/* -------------------------------- Sub-UI -------------------------------- */

function Th(props: {
  colKey: ColumnKey;
  label: string;
  source: SourceTag;
  tooltip?: string;
  sortKey: ColumnKey;
  sortDir: SortDir;
  onSort: (k: ColumnKey) => void;
  stickyLeft?: boolean;
  leftPx?: number;
  widthClass?: string;
}) {
  const isActive = props.sortKey === props.colKey;
  return (
    <th
      className={`px-3 py-2 text-[12px] font-semibold text-[var(--wr-muted)] ${props.widthClass ?? ""} ${props.stickyLeft ? "sticky bg-white z-20" : ""}`}
      style={props.stickyLeft ? { left: `${props.leftPx ?? 0}px` } : undefined}
    >
      <button
        onClick={() => props.onSort(props.colKey)}
        className="flex items-center whitespace-nowrap cursor-pointer"
        title={props.tooltip}
      >
        <span>{props.label}</span>
        <SourceChip src={props.source} />
        <SortGlyph active={isActive} dir={props.sortDir} />
      </button>
    </th>
  );
}

function ColumnManager({
  visible,
  onChange,
}: {
  visible: Record<ColumnKey, boolean>;
  onChange: (v: Record<ColumnKey, boolean>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const togglable: ColumnKey[] = [
    "sessions",
    "organicClicks",
    "impressions",
    "organicCtr",
    "avgEngagementTimeSec",
    "bounceRate",
    "conversions",
    "lastUpdated",
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--wr-border)] bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
        title="Choose columns"
      >
        <Columns3 className="h-4 w-4" color={TOKENS.brand} />
        Columns
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-64 rounded-md border border-[var(--wr-border)] bg-white p-2 shadow-lg">
          <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--wr-muted)]">
            <Columns3 className="h-3.5 w-3.5" /> Toggle columns
          </div>
          <div className="max-h-56 space-y-1 overflow-auto pr-1">
            {togglable.map((k) => (
              <label key={k} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-pointer">
                <span className="text-sm">{HEADER_META[k].label}</span>
                <input
                  type="checkbox"
                  checked={visible[k]}
                  onChange={(e) => onChange({ ...visible, [k]: e.target.checked })}
                  className="cursor-pointer"
                />
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              className="rounded-md border border-[var(--wr-border)] bg-white px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
              onClick={() => onChange(structuredClone(DEFAULT_VISIBLE))}
            >
              Reset
            </button>
            <button
              className="rounded-md bg-[var(--wr-brand)] px-3 py-1.5 text-xs text-white hover:brightness-105 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--wr-border)] bg-white p-3">
      <div className="mb-1 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

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
          <div className="text-base font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer"
          >
            ?
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--wr-border)] bg-white p-3">
      <div className="text-xs text-[var(--wr-muted)]">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}







